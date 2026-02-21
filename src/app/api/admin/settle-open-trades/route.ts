import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

function computeRMultiple(params: {
  side: "BUY" | "SELL";
  entry: number;
  sl: number;
  tp: number;

  exit: number;
}) {
  const { side, entry, sl, tp, exit } = params;

  // Risk distance must be positive
  const risk = side === "BUY" ? (entry - sl) : (sl - entry);
  if (risk <= 0) return null;

  const reward = side === "BUY" ? (exit - entry) : (entry - exit);
  return reward / risk;
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const openTrades = await prisma.trade.findMany({
    where: { status: "OPEN" },
    include: {
      signal: true,
      account: true,
    },
    orderBy: { createdAt: "asc" },
    take: 200, // MVP safety
  });

  let closed = 0;
  let skippedNoCandles = 0;

  for (const trade of openTrades) {
    const symbol = trade.signal.symbol;
    const timeframe = trade.signal.timeframe; // "5m"
    const entryTime = trade.entryTime;

    // Fetch candles from entryTime forward
    const candles = await prisma.candle.findMany({
      where: {
        symbol,
        timeframe,
        time: { gte: entryTime },
      },
      orderBy: { time: "asc" },
      take: 5000, // enough for MVP
    });

    if (candles.length === 0) {
      skippedNoCandles += 1;
      continue;
    }

    const side = trade.signal.side; // BUY/SELL
    let exitPrice: number | null = null;
    let exitTime: Date | null = null;

    // Deterministic policy: if SL and TP touched in same candle -> SL first (conservative)
    for (const c of candles) {
      const hitSL =
        side === "BUY" ? c.low <= trade.sl : c.high >= trade.sl;

      const hitTP =
        side === "BUY" ? c.high >= trade.tp : c.low <= trade.tp;

      if (hitSL && hitTP) {
        exitPrice = trade.sl;
        exitTime = c.time;
        break;
      }

      if (hitSL) {
        exitPrice = trade.sl;
        exitTime = c.time;
        break;
      }

      if (hitTP) {
        exitPrice = trade.tp;
        exitTime = c.time;
        break;
      }
    }

    // Not closed yet (price hasn't hit SL/TP in our candle DB)
    if (!exitPrice || !exitTime) continue;

    const r = computeRMultiple({
      side,
      entry: trade.entryPrice,
      sl: trade.sl,
      tp: trade.tp,
      exit: exitPrice,
    });

    if (r === null) continue;

    const riskAmount = trade.riskAmount ?? 0;
    const pnlMoney = r * riskAmount;

    // Transaction: close trade + update equity + enforce challenge phase/status
    await prisma.$transaction(async (tx) => {
      // 1) Close trade
      await tx.trade.update({
        where: { id: trade.id },
        data: {
          status: "CLOSED",
          exitPrice,
          exitTime,
          pnlR: r,
          pnlMoney,
        },
      });

      // 2) Increment equity
      await tx.clientAccount.update({
        where: { id: trade.accountId },
        data: {
          currentEquity: { increment: pnlMoney },
        },
      });

      // 3) Read latest account state (inside same tx)
      const acc = await tx.clientAccount.findUnique({
        where: { id: trade.accountId },
        select: {
          id: true,
          startingBalance: true,
          currentEquity: true,
          challengeStatus: true,
          challengePhase: true,
          phase1TargetPct: true,
          phase2TargetPct: true,
          maxLossPct: true,
          phase2StartEquity: true,
          phase2StartedAt: true,
          pausedAt: true,
          passedAt: true,
        },
      });

      if (!acc) return;

      // Profit/loss % are based on original starting balance (as agreed)
      const profitPct = ((acc.currentEquity - acc.startingBalance) / acc.startingBalance) * 100;
      const lossPct = ((acc.startingBalance - acc.currentEquity) / acc.startingBalance) * 100;

      const now = new Date();

      // A) Max loss rule (PAUSE). Applies always.
      if (acc.challengeStatus === "ACTIVE" && lossPct >= acc.maxLossPct) {
        await tx.clientAccount.update({
          where: { id: acc.id },
          data: {
            challengeStatus: "PAUSED",
            pausedAt: now,
          },
        });
        return; // once paused, do not transition phases
      }

      // B) Phase 1 -> Phase 2 (auto)
      if (
        acc.challengeStatus === "ACTIVE" &&
        acc.challengePhase === "PHASE1" &&
        profitPct >= acc.phase1TargetPct
      ) {
        await tx.clientAccount.update({
          where: { id: acc.id },
          data: {
            challengePhase: "PHASE2",
            phase2StartedAt: now,
            // snapshot equity at phase-2 start for UI progress display
            phase2StartEquity: acc.phase2StartEquity ?? acc.currentEquity,
          },
        });
        // continue; (phase 2 pass check can happen later on next settlement)
      }

      // C) Phase 2 -> PASSED (auto)
      if (
        acc.challengeStatus === "ACTIVE" &&
        acc.challengePhase === "PHASE2" &&
        profitPct >= acc.phase2TargetPct
      ) {
        await tx.clientAccount.update({
          where: { id: acc.id },
          data: {
            challengeStatus: "PASSED",
            passedAt: now,
          },
        });
      }
    });

    closed += 1;
  }

  return NextResponse.json({
    ok: true,
    scannedOpenTrades: openTrades.length,
    closed,
    skippedNoCandles,
  });
}
