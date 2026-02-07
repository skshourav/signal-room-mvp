"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function fmtDate(iso: string) {
  if (iso === "start") return "Start";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // short format: Feb 2 17:35
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function EquityCurveChart({
  data,
}: {
  data: { t: string; equity: number }[];
}) {
  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis
            dataKey="t"
            tickFormatter={fmtDate}
            minTickGap={24}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fontSize: 12 }}
            width={70}
          />
          <Tooltip
            labelFormatter={(v) => fmtDate(String(v))}
            formatter={(value: any) => [Number(value).toFixed(2), "Equity"]}
          />
          <Line type="monotone" dataKey="equity" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
