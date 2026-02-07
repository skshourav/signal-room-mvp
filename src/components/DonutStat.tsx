"use client";

import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function DonutStat({
  value,      // 0..1
  label,
  subtitle,
  good = true, // if false -> red theme
}: {
  value: number;
  label: string;
  subtitle?: string;
  good?: boolean;
}) {
  const v = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

  const data = [
    { name: "fill", val: v },
    { name: "rest", val: 1 - v },
  ];

  const fillColor = good ? "#22c55e" : "#ef4444"; // green / red

  return (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="val"
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              <Cell fill={fillColor} />
              <Cell fill="#ffffff" opacity={0.12} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        {subtitle && <div className="text-xs text-white/60">{subtitle}</div>}
      </div>
    </div>
  );
}
