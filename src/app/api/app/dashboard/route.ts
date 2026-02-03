import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "CLIENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const userId = (session.user as any).id;

  // MVP: first account
  const account = await prisma.clientAccount.findFirst({
    where: { userId },
  });

  if (!account) return NextResponse.json({ error: "no account" }, { status: 400 });

  const signalsCount = await prisma.signalDelivery.count({
    where: { accountId: account.id },
  });

  const trades = await prisma.trade.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      signal: true,
    },
  });

  return NextResponse.json({
    account: {
      id: account.id,
      name: account.name,
      startingBalance: account.startingBalance,
      currentEquity: account.currentEquity,
    },
    signalsCount,
    trades: trades.map((t) => ({
      id: t.id,
      status: t.status,
      symbol: t.signal.symbol,
      side: t.signal.side,
      timeframe: t.signal.timeframe,
      signalTime: t.signal.signalTime,
      entryTime: t.entryTime,
      entryPrice: t.entryPrice,
      sl: t.sl,
      tp: t.tp,
      lotSize: t.lotSize,
      exitTime: t.exitTime,
      exitPrice: t.exitPrice,
      pnlMoney: t.pnlMoney,
      pnlR: t.pnlR,
    })),
  });
}
