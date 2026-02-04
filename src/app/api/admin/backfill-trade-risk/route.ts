import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const trades = await prisma.trade.findMany({
    where: {
      OR: [{ equityAtEntry: null }, { riskAmount: null }],
    },
    include: {
      account: { include: { riskProfile: true } },
      signal: true,
    },
    take: 500,
  });

  let updated = 0;

  for (const t of trades) {
    const equity = t.account.currentEquity;
    const riskPercent = t.account.riskProfile?.riskPercent ?? 1.0;
    const riskAmount = (equity * riskPercent) / 100.0;

    await prisma.trade.update({
      where: { id: t.id },
      data: {
        equityAtEntry: equity,
        riskAmount,
      },
    });

    updated += 1;
  }

  return NextResponse.json({ ok: true, scanned: trades.length, updated });
}
