import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

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

  if (!sessionId || !symbol || !side || !timeframe || !signalTime || !sl || !tp) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const st = new Date(signalTime);
  if (isNaN(st.getTime())) return NextResponse.json({ error: "signalTime must be ISO date string" }, { status: 400 });

  // 1) Create Signal
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

  // 2) Find active clients (presence not left + lastSeen recent)
  const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_MS);

  const activePresences = await prisma.presence.findMany({
    where: {
      sessionId,
      leftAt: null,
      lastSeenAt: { gte: cutoff },
    },
    include: { account: { include: { riskProfile: true } } },
  });

  // 3) For each active client: create delivery + trade
  // For MVP: entryPrice = 0 if candle not found yet (we’ll fix with CSV next)
  // But better: try to find candle open (requires candle data loaded).
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

  let tradesCreated = 0;

  for (const p of activePresences) {
    const acc = p.account;

    const riskPercent = acc.riskProfile?.riskPercent ?? 1.0;
    const equity = acc.currentEquity;

    // SUPER simple sizing for MVP (placeholder):
    // lotSize = riskAmount / (abs(entry-sl) * 10000)
    // We'll refine later per instrument.
    const riskAmount = (equity * riskPercent) / 100.0;
    const stopDistance = Math.abs(entryPrice - sl);
    const lotSize = stopDistance > 0 ? riskAmount / (stopDistance * 10000) : 0.01;

    await prisma.signalDelivery.upsert({
      where: { signalId_accountId: { signalId: signal.id, accountId: acc.id } },
      update: { deliveredAt: new Date() },
      create: { signalId: signal.id, accountId: acc.id },
    });

    await prisma.trade.create({
      data: {
        accountId: acc.id,
        signalId: signal.id,
        entryTime: st,
        entryPrice,
        sl,
        tp,
        lotSize,
      },
    });

    tradesCreated += 1;
  }

  return NextResponse.json({
    ok: true,
    signalId: signal.id,
    activeClients: activePresences.length,
    tradesCreated,
  });
}
