import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const trades = await prisma.trade.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, signalId: true, accountId: true, createdAt: true },
  });

  const seen = new Set<string>();
  const toDelete: string[] = [];

  for (const t of trades) {
    const key = `${t.signalId}:${t.accountId}`;
    if (seen.has(key)) toDelete.push(t.id);
    else seen.add(key);
  }

  const result = await prisma.trade.deleteMany({
    where: { id: { in: toDelete } },
  });

  return NextResponse.json({ ok: true, duplicatesDeleted: result.count });
}
