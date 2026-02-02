import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const sessionId = body?.sessionId as string;

  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  // Get client account (MVP: first account)
  const account = await prisma.clientAccount.findFirst({
    where: { userId: (session.user as any).id },
  });

  if (!account) return NextResponse.json({ error: "no client account" }, { status: 400 });

  // Close any previous open presence for this account in this session (safety)
  await prisma.presence.updateMany({
    where: {
      accountId: account.id,
      sessionId,
      leftAt: null,
    },
    data: { leftAt: new Date() },
  });

  const presence = await prisma.presence.create({
    data: {
      sessionId,
      accountId: account.id,
      joinedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ presenceId: presence.id });
}
