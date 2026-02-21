import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { pusherServer } from "@/lib/pusher-server";

const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const { sessionId, symbol, side, timeframe, signalTime, sl, tp } = body as {
    sessionId: string;
    symbol: string;
    side: "BUY" | "SELL";
    timeframe: string;
    signalTime: string;
    sl: number;
    tp: number;
  };

  if (!sessionId || !symbol || !side || !timeframe || !signalTime || sl === undefined || tp === undefined) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const st = new Date(signalTime);
  if (isNaN(st.getTime())) {
    return NextResponse.json({ error: "signalTime must be ISO date string" }, { status: 400 });
  }

  // 1) Find candle for entry price BEFORE creating signal (better failure behavior)
  const candle = await prisma.candle.findUnique({
    where: {
      symbol_timeframe_time: {
        symbol,
        timeframe,
        time: st,
      },
    },
  });

  if (!candle) {
    return NextResponse.json(
      { error: "No candle found for this symbol/timeframe/signalTime. Upload CSV candles first." },
      { status: 400 }
    );
  }

  const entryPrice = candle.open;

  // 2) Create Signal
  const signal = await prisma.signal.create({
    data: {
      sessionId,
      symbol,
      side,
      timeframe,
      signalTime: st,
      sl,
      tp,
      createdBy: (session.user as any).id,
    },
  });

  // 3) Find active presences
  const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_MS);

  const activePresences = await prisma.presence.findMany({
    where: {
      sessionId,
      leftAt: null,
      lastSeenAt: { gte: cutoff },
    },
    include: {
      account: {
        include: {
          riskProfile: true,
          user: { select: { id: true } },
        },
      },
    },
    orderBy: { lastSeenAt: "desc" }, // newest first helps pick freshest presence when deduping
  });

  // 4) Deduplicate by accountId (CRITICAL)
  const uniqueByAccount = new Map<string, typeof activePresences[number]>();
  for (const p of activePresences) {
    if (!uniqueByAccount.has(p.accountId)) uniqueByAccount.set(p.accountId, p);
  }
  const uniquePresences = Array.from(uniqueByAccount.values());

  // Build userId -> activeAccountId map
  const userIds = Array.from(
    new Set(uniquePresences.map((p) => p.account.user.id))
  );

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, activeAccountId: true },
  });

  const activeByUser = new Map(users.map((u) => [u.id, u.activeAccountId]));

  // Keep only presences that match the user's selected account AND account is ACTIVE
  const eligiblePresences = uniquePresences.filter((p) => {
    const activeAccountId = activeByUser.get(p.account.user.id);
    if (!activeAccountId) return false; // no selection -> do not take signals
    if (p.accountId !== activeAccountId) return false; // not selected
    return p.account.challengeStatus === "ACTIVE";
  });
  // 5) Create deliveries + trades (idempotent per account)
  let tradesCreated = 0;
  let phase1Count = 0;
  let phase2Count = 0;

  for (const p of eligiblePresences) {
    const acc = p.account;

    if (p.account.challengePhase === "PHASE1") phase1Count += 1;
    if (p.account.challengePhase === "PHASE2") phase2Count += 1;

    const equity = acc.currentEquity;

    // Always 1% of starting balance (your core rule)
    const riskAmount = acc.startingBalance * 0.01;
    const stopDistance = Math.abs(entryPrice - sl);
    const lotSize = stopDistance > 0 ? riskAmount / (stopDistance * 10000) : 0.01;

    await prisma.signalDelivery.upsert({
      where: { signalId_accountId: { signalId: signal.id, accountId: acc.id } },
      update: { deliveredAt: new Date() },
      create: { signalId: signal.id, accountId: acc.id },
    });

    // OPTION A (recommended after Fix 2): Upsert Trade so duplicates are impossible.
    // Requires @@unique([signalId, accountId]) on Trade.
    // If you haven't added Fix 2 yet, comment this upsert and use OPTION B below.
    await prisma.trade.upsert({
      where: { signalId_accountId: { signalId: signal.id, accountId: acc.id } },
      update: {
        // If trade already exists, we can refresh sizing/entry (optional)
        entryTime: st,
        entryPrice,
        sl,
        tp,
        lotSize,
        equityAtEntry: equity,
        riskAmount,
      },
      create: {
        accountId: acc.id,
        signalId: signal.id,
        entryTime: st,
        entryPrice,
        sl,
        tp,
        lotSize,
        equityAtEntry: equity,
        riskAmount,
      },
    });

    // OPTION B (use temporarily if Fix 2 not added yet):
    // await prisma.trade.create({
    //   data: {
    //     accountId: acc.id,
    //     signalId: signal.id,
    //     entryTime: st,
    //     entryPrice,
    //     sl,
    //     tp,
    //     lotSize,
    //     equityAtEntry: equity,
    //     riskAmount,
    //   },
    // });

    tradesCreated += 1;
  }

  // 6) Trigger realtime event
  try {
    await pusherServer.trigger(`session-${sessionId}`, "signal-released", {
      signalId: signal.id,
      sessionId,
      symbol,
      side,
      timeframe,
      signalTime: st.toISOString(),
      sl,
      tp,
      entryPrice,
      phase1Count,
      phase2Count,
      eligibleClients: eligiblePresences.length,
      activeClients: uniquePresences.length,
      tradesCreated,
    });
  } catch (e) {
    console.error("❌ Pusher trigger failed:", e);
  }

  return NextResponse.json({
    ok: true,
    signalId: signal.id,
    phase1Count,
    phase2Count,
    eligibleClients: eligiblePresences.length,
    activeClients: uniquePresences.length,
    tradesCreated,
  });
}
