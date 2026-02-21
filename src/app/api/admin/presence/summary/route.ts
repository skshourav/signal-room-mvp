import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

const PRESENCE_TIMEOUT_MS = 2 * 60 * 1000;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const cutoff = new Date(Date.now() - PRESENCE_TIMEOUT_MS);

  const presences = await prisma.presence.findMany({
    where: {
      sessionId,
      leftAt: null,
      lastSeenAt: { gte: cutoff },
    },
    include: {
      account: {
        include: {
          user: { select: { id: true, activeAccountId: true } },
        },
      },
    },
  });

  const unique = new Map<string, typeof presences[number]>();
  for (const p of presences) {
    if (!unique.has(p.accountId)) unique.set(p.accountId, p);
  }

  const list = Array.from(unique.values());

  let phase1 = 0;
  let phase2 = 0;
  let eligible = 0;

  for (const p of list) {
    const acc = p.account;
    const selected = acc.user.activeAccountId === acc.id;

    if (!selected) continue;

    if (acc.challengeStatus === "ACTIVE") {
      eligible++;
      if (acc.challengePhase === "PHASE1") phase1++;
      if (acc.challengePhase === "PHASE2") phase2++;
    }
  }

  return NextResponse.json({
    activePresences: list.length,
    eligible,
    phase1,
    phase2,
  });
}