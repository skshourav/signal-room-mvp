import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "CLIENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeAccountId: true },
  });

  const accounts = await prisma.clientAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      startingBalance: true,
      currentEquity: true,
      challengeStatus: true,
      challengePhase: true,
      phase1TargetPct: true,
      phase2TargetPct: true,
      maxLossPct: true,
    },
  });

  return NextResponse.json({
    activeAccountId: user?.activeAccountId ?? null,
    accounts,
  });
}