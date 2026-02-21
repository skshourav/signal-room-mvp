import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

function calcMaxDrawdown(equity: number[]) {
  let peak = -Infinity;
  let maxDD = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return maxDD;
}

function dateKeyUTC(d: Date) {
  // YYYY-MM-DD in UTC to avoid timezone shifting
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ✅ added exactly as requested
const safe = (x: number) => (Number.isFinite(x) ? x : 0);
const safePF = (x: number) => (x === Infinity ? Infinity : Number.isFinite(x) ? x : 0);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "CLIENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeAccountId: true },
  });

  const accountId = user?.activeAccountId;

  const accountSelect = {
    id: true,
    userId: true,
    name: true,
    startingBalance: true,
    currentEquity: true,

    challengeStatus: true,
    challengePhase: true,
    phase1TargetPct: true,
    phase2TargetPct: true,
    maxLossPct: true,
    phase2StartedAt: true,
    phase2StartEquity: true,
  } as const;

  // If no active account selected yet, fall back to first account (safe MVP behavior)
  const account = accountId
    ? await prisma.clientAccount.findUnique({ where: { id: accountId }, select: accountSelect })
    : await prisma.clientAccount.findFirst({ where: { userId }, select: accountSelect });

  if (!account) return NextResponse.json({ error: "no account" }, { status: 400 });

  const starting = account.startingBalance;
  const equity = account.currentEquity;

  const overallProfitPct = ((equity - starting) / starting) * 100;
  const overallLossPct = ((starting - equity) / starting) * 100;

  // Phase 2 display-only profit since phase 2 started
  const phase2ProfitPct =
    account.challengePhase === "PHASE2" && account.phase2StartEquity != null
      ? ((equity - account.phase2StartEquity) / starting) * 100
      : null;

  // Phase 1 passed badge (green vibe)
  const phase1Passed = overallProfitPct >= account.phase1TargetPct;

  // Current target depends on phase (for UI progress bars)
  const currentTargetPct =
    account.challengePhase === "PHASE1"
      ? account.phase1TargetPct
      : account.phase2TargetPct;

  const targetProgressPct =
    currentTargetPct > 0 ? Math.max(0, Math.min(100, (overallProfitPct / currentTargetPct) * 100)) : 0;

  const drawdownUsedPct =
    account.maxLossPct > 0 ? Math.max(0, Math.min(100, (overallLossPct / account.maxLossPct) * 100)) : 0;

  const closedTrades = await prisma.trade.findMany({
    where: { accountId: account.id, status: "CLOSED" },
    orderBy: { exitTime: "asc" },
    include: { signal: true },
    take: 5000,
  });

  // Equity curve (CLOSED trades only)
  let eq = account.startingBalance;
  const curve: { t: string; equity: number }[] = [{ t: "start", equity: eq }];

  // Daily aggregates
  const byDay = new Map<string, { pnl: number; trades: number }>();

  let grossProfit = 0;
  let grossLossAbs = 0;
  let wins = 0;
  const rs: number[] = [];
  const pnls: number[] = [];

  const firstDate = closedTrades[0]?.exitTime ?? null;
  const lastDate = closedTrades[closedTrades.length - 1]?.exitTime ?? null;

  for (const tr of closedTrades) {
    const pnl = tr.pnlMoney ?? 0;
    const r = tr.pnlR ?? 0;

    pnls.push(pnl);
    rs.push(r);

    if (pnl > 0) {
      wins += 1;
      grossProfit += pnl;
    } else if (pnl < 0) {
      grossLossAbs += Math.abs(pnl);
    }

    eq += pnl;
    curve.push({ t: (tr.exitTime ?? tr.entryTime).toISOString(), equity: eq });

    const d = tr.exitTime ?? tr.entryTime;
    const key = dateKeyUTC(d);
    const prev = byDay.get(key) ?? { pnl: 0, trades: 0 };
    byDay.set(key, { pnl: prev.pnl + pnl, trades: prev.trades + 1 });
  }

  // Build ordered daily series + cumulative PnL (for charts + calendar)
  const dayKeys = Array.from(byDay.keys()).sort(); // YYYY-MM-DD sorts naturally
  let cum = 0;
  const daily = dayKeys.map((k) => {
    const v = byDay.get(k)!;
    cum += v.pnl;
    return { date: k, pnl: v.pnl, cumulative: cum, trades: v.trades };
  });

  const totalPnL = pnls.reduce((a, b) => a + b, 0);
  const avgR = rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : 0;
  const winRate = closedTrades.length ? wins / closedTrades.length : 0;
  const profitFactor = grossLossAbs > 0 ? grossProfit / grossLossAbs : (grossProfit > 0 ? Infinity : 0);

  const start = account.startingBalance;
  const end = curve.length ? curve[curve.length - 1].equity : start;

  const growthMoney = end - start;
  const totalReturnPct = start > 0 ? growthMoney / start : 0; // fraction

  const maxDD = calcMaxDrawdown(curve.map((p) => p.equity));

  // CAGR: if we have dates, compute annualized rate. Otherwise 0.
  let cagr = 0;
  if (firstDate && lastDate && start > 0 && end > 0 && lastDate > firstDate) {
    const years = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years > 0) cagr = Math.pow(end / start, 1 / years) - 1;
  }

  return NextResponse.json({
    account: {
      startingBalance: account.startingBalance,
      currentEquity: account.currentEquity,
    },
    curve,
    daily, // for daily pnl charts + calendar
    metrics: {
      netPnL: safe(totalPnL),
      totalReturnPct: safe(totalReturnPct),
      currentEquity: safe(account.currentEquity),
      cagr: safe(cagr),
      maxDrawdown: safe(maxDD),
      signalsReceived: await prisma.signalDelivery.count({ where: { accountId: account.id } }),
      winRate: safe(winRate),
      profitFactor: safePF(profitFactor),
      avgR: safe(avgR),
      tradesClosed: closedTrades.length,
    },
    challenge: {
      status: account.challengeStatus,
      phase: account.challengePhase,
      phase1TargetPct: account.phase1TargetPct,
      phase2TargetPct: account.phase2TargetPct,
      maxLossPct: account.maxLossPct,

      overallProfitPct,
      phase2ProfitPct, // null if not in phase2 yet
      phase1Passed,

      currentTargetPct,
      targetProgressPct,
      drawdownUsedPct,
    },
  });
}
