import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "CLIENT") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const userId = (session.user as any).id as string;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const accountId = body?.accountId as string | undefined;
  if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

  // Validate ownership
  const account = await prisma.clientAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });

  if (!account) {
    return NextResponse.json({ error: "account not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { activeAccountId: accountId },
  });

  return NextResponse.json({ ok: true, activeAccountId: accountId });
}