"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Percent,
  Wallet,
  Activity,
  ArrowDownRight,
  Bell,
  Target,
  Gauge,
} from "lucide-react";

import { EquityCurveChart } from "@/components/EquityCurveChart";
import { MiniSparkline } from "@/components/MiniSparkline";
import { DailyCumulativePnLChart } from "@/components/DailyCumulativePnLChart";
import { DailyPnLBarChart } from "@/components/DailyPnLBarChart";
import { PnLCalendar } from "@/components/PnLCalendar";
import { DonutStat } from "@/components/DonutStat";

type DashboardData = {
  account: {
    id: string;
    name: string;
    startingBalance: number;
    currentEquity: number;
  };
  signalsCount: number;
  trades: Array<{
    id: string;
    status: "OPEN" | "CLOSED";
    symbol: string;
    side: "BUY" | "SELL";
    timeframe: string;
    signalTime: string;
    entryTime: string;
    entryPrice: number;
    sl: number;
    tp: number;
    lotSize: number;
    exitTime: string | null;
    exitPrice: number | null;
    pnlMoney: number | null;
    pnlR: number | null;
  }>;
};

type PerformanceData = {
  account: { startingBalance: number; currentEquity: number };
  curve: { t: string; equity: number }[];
  daily: { date: string; pnl: number; cumulative: number; trades: number }[];
  metrics: {
    netPnL: number;
    totalReturnPct: number;
    currentEquity: number;
    cagr: number;
    maxDrawdown: number;

    signalsReceived: number;
    winRate: number;
    profitFactor: number;
    avgR: number;
    tradesClosed: number;
  };
};

function StatCard({
  title,
  value,
  sub,
  icon,
  toneClass,
  right,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode; // optional
  toneClass: string;
  right?: React.ReactNode; // optional (sparkline OR donut)
}) {
  return (
    <div className={`rounded-2xl border border-white/10 p-4 shadow-sm ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-white/70">{title}</div>
          <div className="mt-2 text-2xl font-semibold leading-tight break-words">{value}</div>
          {sub && <div className="mt-1 text-xs text-white/60">{sub}</div>}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {icon ? <div className="rounded-xl bg-white/10 p-2">{icon}</div> : null}
          {right ? <div className="w-[120px] max-w-[40vw]">{right}</div> : null}
        </div>
      </div>
    </div>
  );
}

function fmtPct(x: number) {
  return (x * 100).toFixed(2) + "%";
}

/* ===== added helpers ===== */
function n(x: any, fallback = 0) {
  return typeof x === "number" && Number.isFinite(x) ? x : fallback;
}

function fixed(x: any, digits = 2, fallback = "0.00") {
  const v = n(x, NaN);
  return Number.isFinite(v) ? v.toFixed(digits) : fallback;
}

function pct(x: any, digits = 2) {
  const v = n(x, 0);
  return (v * 100).toFixed(digits) + "%";
}
/* ======================== */

function pfToGauge(pf: any) {
  const v = n(pf, 0);
  // simple soft normalization
  return Math.max(0, Math.min(1, v / (v + 1)));
}

export default function ClientDashboard() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [calendarMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    async function load() {
      const [r1, r2] = await Promise.all([
        fetch("/api/app/dashboard"),
        fetch("/api/app/performance"),
      ]);

      const j1 = await r1.json();
      const j2 = await r2.json();

      if (!r1.ok) return setErr(j1?.error || "dashboard failed");
      if (!r2.ok) return setErr(j2?.error || "performance failed");

      setDash(j1);
      setPerf(j2);
    }
    load();
  }, []);

  const sparkEquity = useMemo(() => perf?.curve ?? [], [perf]);
  const sparkDaily = useMemo(() => perf?.daily ?? [], [perf]);

  if (err) return <div className="p-6">Error: {err}</div>;
  if (!dash || !perf) return <div className="p-6">Loading dashboard...</div>;

  const m = perf.metrics;

  const netPnL = m.netPnL;
  const totalReturnPct = m.totalReturnPct;
  const equity = m.currentEquity;
  const cagr = m.cagr;
  const maxDD = m.maxDrawdown;

  const pnlPositive = n(netPnL, 0) >= 0;

  const profitFactorLabel =
    m.profitFactor === Infinity ? "∞" : fixed(m.profitFactor, 2);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Client Dashboard</h1>
            <p className="mt-1 text-sm text-white/60">
              Model performance based on our candle feed (not your broker execution).
            </p>
          </div>

          <Link
            href="/app/session"
            className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15"
          >
            Session Room →
          </Link>
        </div>

        {/* Row 1 */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Net PnL"
            value={`${pnlPositive ? "+" : ""}${fixed(netPnL, 2)}`}
            sub={`Closed trades: ${m.tradesClosed}`}
            toneClass="bg-white/5"
            icon={<TrendingUp className="h-5 w-5" />}
            right={<MiniSparkline dataKey="cumulative" data={sparkDaily} />}
          />
          <StatCard
            title="Total Return"
            value={pct(totalReturnPct, 2)}
            sub={`From ${fixed(dash.account.startingBalance, 2)}`}
            toneClass="bg-white/5"
            icon={<Percent className="h-5 w-5" />}
            right={<MiniSparkline dataKey="equity" data={sparkEquity} />}
          />
          <StatCard
            title="Equity"
            value={fixed(equity, 2)}
            sub={`Start: ${fixed(dash.account.startingBalance, 2)}`}
            icon={<Wallet className="h-5 w-5" />}
            toneClass="bg-gradient-to-br from-sky-500/20 to-indigo-500/10"
            right={<MiniSparkline dataKey="equity" data={sparkEquity} />}
          />
          <StatCard
            title="CAGR"
            value={pct(cagr, 2)}
            sub="Annualized (based on closed trades span)"
            icon={<Activity className="h-5 w-5" />}
            toneClass="bg-gradient-to-br from-amber-500/20 to-orange-500/10"
            right={<MiniSparkline dataKey="equity" data={sparkEquity} />}
          />
          <StatCard
            title="Max Drawdown"
            value={pct(maxDD, 2)}
            sub="From equity curve peaks"
            icon={<ArrowDownRight className="h-5 w-5" />}
            toneClass="bg-white/5"
            right={<MiniSparkline dataKey="equity" data={sparkEquity} />}
          />
        </div>

        {/* Row 2 */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Signals Received"
            value={String(m.signalsReceived)}
            sub={`Open trades: ${dash.trades.filter((t) => t.status === "OPEN").length}`}
            icon={<Bell className="h-5 w-5" />}
            toneClass="bg-white/5"
            right={<MiniSparkline dataKey="pnl" data={sparkDaily} />}
          />
          <StatCard
            title="Win Rate"
            value={pct(m.winRate, 1)}
            sub="Closed trades only"
            icon={<Target className="h-5 w-5" />}
            toneClass="bg-white/5"
            right={<DonutStat value={n(m.winRate, 0)} label="Win Rate" subtitle="closed only" />}
          />
          <StatCard
            title="Profit Factor"
            value={profitFactorLabel}
            sub="Gross profit / gross loss"
            icon={<Gauge className="h-5 w-5" />}
            toneClass="bg-white/5"
            right={
              <DonutStat
                value={pfToGauge(m.profitFactor)}
                label="Profit Factor"
                subtitle="higher is better"
              />
            }
          />
          <StatCard
            title="Avg R"
            value={fixed(m.avgR, 2)}
            sub="Average R-multiple"
            icon={<Activity className="h-5 w-5" />}
            toneClass="bg-white/5"
            right={<MiniSparkline dataKey="pnl" data={sparkDaily} />}
          />
        </div>

        {/* Row 3 */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Equity Curve</h2>
              <span className="text-xs text-white/60">CLOSED trades</span>
            </div>
            <div className="mt-3">
              <EquityCurveChart data={perf.curve} />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Daily Net Cumulative PnL</h2>
              <span className="text-xs text-white/60">By day</span>
            </div>
            <div className="mt-3">
              <DailyCumulativePnLChart
                data={perf.daily.map((d) => ({ date: d.date, cumulative: d.cumulative }))}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Daily Net PnL</h2>
              <span className="text-xs text-white/60">By day</span>
            </div>
            <div className="mt-3">
              <DailyPnLBarChart
                data={perf.daily.map((d) => ({ date: d.date, pnl: d.pnl }))}
              />
            </div>
          </div>
        </div>

        {/* Row 4 */}
        <div className="mt-6">
          <PnLCalendar
            monthDate={calendarMonth}
            daily={perf.daily.map((d) => ({ date: d.date, pnl: d.pnl, trades: d.trades }))}
          />
        </div>

        {/* Row 5 */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Trade History</h2>
            <span className="text-xs text-white/60">Latest 50</span>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Symbol</th>
                  <th className="p-2 text-left">Side</th>
                  <th className="p-2 text-left">Entry</th>
                  <th className="p-2 text-left">Exit</th>
                  <th className="p-2 text-left">PnL</th>
                  <th className="p-2 text-left">R</th>
                  <th className="p-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody>
                {dash.trades.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="p-2">{t.status}</td>
                    <td className="p-2">{t.symbol}</td>
                    <td className="p-2">{t.side}</td>
                    <td className="p-2">{t.entryPrice}</td>
                    <td className="p-2">{t.exitPrice ?? "-"}</td>
                    <td className="p-2">{fixed(t.pnlMoney, 2, "-")}</td>
                    <td className="p-2">{fixed(t.pnlR, 2, "-")}</td>
                    <td className="p-2 text-white/70">
                      {new Date(t.entryTime).toLocaleString(undefined, {
                        month: "short",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
                {dash.trades.length === 0 && (
                  <tr>
                    <td className="p-3 text-white/60" colSpan={8}>
                      No trades yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-white/60">
            Tip: Open trades show “-” for Exit/PnL until settled.
          </p>
        </div>
      </div>
    </div>
  );
}
