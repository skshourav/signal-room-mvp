"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function DailyCumulativePnLChart({ data }: { data: { date: string; cumulative: number }[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={24} />
          <YAxis tick={{ fontSize: 12 }} width={70} />
          <Tooltip />
          <Area type="monotone" dataKey="cumulative" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
