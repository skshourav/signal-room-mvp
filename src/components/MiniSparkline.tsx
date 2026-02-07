"use client";

import { ResponsiveContainer, LineChart, Line } from "recharts";

export function MiniSparkline({ dataKey, data }: { dataKey: string; data: any[] }) {
  return (
    <div className="h-10 w-28">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey={dataKey} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
