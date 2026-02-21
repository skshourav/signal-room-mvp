import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const accounts = await prisma.clientAccount.findMany({
    select: {
      challengePhase: true,
      challengeStatus: true,
    },
  });

  let phase1 = 0;
  let phase2 = 0;

  let active = 0;
  let paused = 0;
  let passed = 0;

  for (const a of accounts) {
    if (a.challengePhase === "PHASE1") phase1++;
    if (a.challengePhase === "PHASE2") phase2++;

    if (a.challengeStatus === "ACTIVE") active++;
    if (a.challengeStatus === "PAUSED") paused++;
    if (a.challengeStatus === "PASSED") passed++;
  }

  return NextResponse.json({
    totalAccounts: accounts.length,
    phase1,
    phase2,
    status: {
      active,
      paused,
      passed,
    },
  });
}