import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const presenceId = body?.presenceId as string;

  if (!presenceId) return NextResponse.json({ error: "presenceId required" }, { status: 400 });

  await prisma.presence.update({
    where: { id: presenceId },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true, at: new Date().toISOString() });

}
