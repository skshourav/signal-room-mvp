"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  format,
  isSameMonth,
} from "date-fns";

type DayAgg = { date: string; pnl: number; trades: number };

export function PnLCalendar({
  monthDate,
  daily,
}: {
  monthDate: Date;
  daily: DayAgg[];
}) {
  const map = new Map(daily.map((d) => [d.date, d]));

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);

  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const rows: Date[][] = [];
  let cur = gridStart;

  while (cur <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cur);
      cur = addDays(cur, 1);
    }
    rows.push(week);
  }

  function keyUTC(d: Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // Weekly summaries
  const weekSums = rows.map((week) =>
    week.reduce((acc, d) => acc + (map.get(keyUTC(d))?.pnl ?? 0), 0)
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Monthly Calendar</h2>
        <div className="text-xs text-white/60">
          {format(monthDate, "MMMM yyyy")}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-8 gap-2 text-xs text-white/60">
        <div>Sun</div>
        <div>Mon</div>
        <div>Tue</div>
        <div>Wed</div>
        <div>Thu</div>
        <div>Fri</div>
        <div>Sat</div>
        <div className="text-right">Week</div>
      </div>

      <div className="mt-2 grid gap-2">
        {rows.map((week, wi) => (
          <div key={wi} className="grid grid-cols-8 gap-2">
            {week.map((d) => {
              const k = keyUTC(d);
              const agg = map.get(k);
              const inMonth = isSameMonth(d, monthDate);
              const pnl = agg?.pnl ?? 0;
              const trades = agg?.trades ?? 0;

              // intensity coloring based on pnl magnitude
              const abs = Math.abs(pnl);
              const intensity =
                abs <= 0 ? 0 : Math.min(0.85, 0.15 + abs / 5000); // tweak divisor later
              const bg =
                pnl > 0
                  ? `rgba(34,197,94,${intensity})` // green
                  : pnl < 0
                  ? `rgba(239,68,68,${intensity})` // red
                  : "transparent";

              return (
                <div
                  key={k}
                  className={`rounded-xl border border-white/10 p-2 ${
                    inMonth ? "" : "opacity-30"
                  }`}
                  style={{ backgroundColor: bg }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-white/70">{format(d, "dd")}</div>
                    {trades > 0 && (
                      <div className="text-[10px] text-white/50">{trades}t</div>
                    )}
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    {trades > 0 ? pnl.toFixed(0) : ""}
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border border-white/10 p-2 text-right">
              <div className="text-[10px] text-white/50">Week {wi + 1}</div>
              <div className="mt-2 text-sm font-semibold">
                {weekSums[wi].toFixed(0)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
