import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";

type CandleRow = {
  time: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume?: string;
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();

  const symbol = body?.symbol as string;
  const timeframe = body?.timeframe as string;
  const rows = body?.rows as CandleRow[];

  if (!symbol || !timeframe || !Array.isArray(rows)) {
    return NextResponse.json({ error: "symbol, timeframe, rows required" }, { status: 400 });
  }

  // Convert rows to prisma createMany inputs
  const data = rows
    .map((r) => {
      const t = new Date(r.time);
      if (isNaN(t.getTime())) return null;

      const open = Number(r.open);
      const high = Number(r.high);
      const low = Number(r.low);
      const close = Number(r.close);
      const volume = r.volume !== undefined && r.volume !== "" ? Number(r.volume) : null;

      if (![open, high, low, close].every((n) => Number.isFinite(n))) return null;

      return {
        symbol,
        timeframe,
        time: t,
        open,
        high,
        low,
        close,
        volume: volume ?? undefined,
      };
    })
    .filter(Boolean) as any[];

  if (data.length === 0) {
    return NextResponse.json({ error: "no valid rows parsed" }, { status: 400 });
  }

  // Insert with upsert-like behavior:
  // Prisma doesn't support upsertMany, so for MVP we use createMany(skipDuplicatesHook)
  // Unique constraint exists on (symbol,timeframe,time)
  const result = await prisma.candle.createMany({
    data,
    skipDuplicates: true,
  });

  return NextResponse.json({
    ok: true,
    receivedRows: rows.length,
    inserted: result.count,
  });
}
