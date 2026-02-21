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
  TrendingDown,
  DollarSign,
  Target,
  Zap,
} from "lucide-react";

import { EquityCurveChart } from "@/components/EquityCurveChart";
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
  challenge?: {
    status: "ACTIVE" | "PAUSED" | "PASSED";
    phase: "PHASE1" | "PHASE2";
    phase1TargetPct: number;
    phase2TargetPct: number;
    maxLossPct: number;

    overallProfitPct: number;
    phase2ProfitPct: number | null;
    phase1Passed: boolean;

    currentTargetPct: number;
    targetProgressPct: number;
    drawdownUsedPct: number;
  };
};

type AccountsResponse = {
  activeAccountId: string | null;
  accounts: Array<{
    id: string;
    name: string;
    startingBalance: number;
    currentEquity: number;
    challengeStatus: "ACTIVE" | "PAUSED" | "PASSED";
    challengePhase: "PHASE1" | "PHASE2";
    phase1TargetPct: number;
    phase2TargetPct: number;
    maxLossPct: number;
  }>;
};

function StatCard({
  title,
  value,
  sub,
  icon,
  toneClass,
  right,
  trend,
  glowColor,
}: {
  title: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  toneClass: string;
  right?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  glowColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl p-5",
        "border border-white/10 ring-1 ring-white/5",
        "backdrop-blur-xl transition-all duration-300 cursor-pointer",
        isHovered
          ? "shadow-[0_0_0_1px_rgba(59,130,246,0.30),0_20px_50px_rgba(0,0,0,0.50)] -translate-y-1 scale-[1.02]"
          : "shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)]",
        toneClass,
      ].join(" ")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated gradient overlay */}
      <div
        className={`absolute inset-0 opacity-0 transition-opacity duration-500 ${isHovered ? "opacity-10" : ""
          }`}
        style={{
          background: `radial-gradient(circle at 50% 0%, ${glowColor || "rgba(59,130,246,0.4)"}, transparent 70%)`,
        }}
      />

      {/* Trend indicator corner accent */}
      {trend && (
        <div
          className={`absolute top-0 right-0 w-16 h-16 ${trend === "up"
            ? "bg-gradient-to-bl from-emerald-500/20"
            : trend === "down"
              ? "bg-gradient-to-bl from-red-500/20"
              : "bg-gradient-to-bl from-amber-500/20"
            } rounded-bl-full transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
            }`}
        />
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-white/70 uppercase tracking-wider">
              {title}
            </div>
            {trend === "up" && (
              <TrendingUp className="h-3 w-3 text-emerald-400 animate-pulse" />
            )}
            {trend === "down" && (
              <TrendingDown className="h-3 w-3 text-red-400 animate-pulse" />
            )}
          </div>
          <div
            className={`mt-2.5 text-3xl font-bold leading-tight break-words transition-all duration-300 ${isHovered ? "scale-105" : ""
              }`}
          >
            {value}
          </div>
          {sub && (
            <div className="mt-1.5 text-xs text-white/50 leading-relaxed">
              {sub}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {icon ? (
            <div
              className={`rounded-xl bg-white/10 p-2.5 transition-all duration-300 ${isHovered
                ? "bg-white/20 scale-110 rotate-3"
                : "bg-white/10"
                }`}
            >
              {icon}
            </div>
          ) : null}
          {right ? <div className="w-[110px] shrink-0">{right}</div> : null}
        </div>
      </div>

      {/* Shimmer effect on hover */}
      <div
        className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full transition-transform duration-1000 ${isHovered ? "translate-x-full" : ""
          }`}
      />
    </div>
  );
}

function fmtPct(x: number) {
  return (x * 100).toFixed(2) + "%";
}

/* ===== helpers ===== */
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

function pfToGauge(pf: any) {
  const v = n(pf, 0);
  return Math.max(0, Math.min(1, v / (v + 1)));
}

// Performance insight banner component
function PerformanceInsight({ metrics }: { metrics: any }) {
  const insight = useMemo(() => {
    const wr = n(metrics.winRate, 0);
    const pf = n(metrics.profitFactor, 0);
    const avgR = n(metrics.avgR, 0);

    if (wr >= 0.6 && pf >= 2) {
      return {
        type: "excellent",
        icon: <Zap className="h-5 w-5" />,
        message: "🎯 Exceptional Performance",
        detail: "High win rate with strong profit factor",
        color: "from-emerald-500/20 to-cyan-500/20",
        border: "border-emerald-500/30",
      };
    } else if (wr >= 0.5 && pf >= 1.5) {
      return {
        type: "good",
        icon: <Target className="h-5 w-5" />,
        message: "✨ Strong Performance",
        detail: "Consistent results with positive edge",
        color: "from-blue-500/20 to-purple-500/20",
        border: "border-blue-500/30",
      };
    } else if (pf >= 1) {
      return {
        type: "positive",
        icon: <TrendingUp className="h-5 w-5" />,
        message: "📈 Profitable Trading",
        detail: "Maintain discipline and risk management",
        color: "from-cyan-500/20 to-blue-500/20",
        border: "border-cyan-500/30",
      };
    } else {
      return {
        type: "review",
        icon: <Activity className="h-5 w-5" />,
        message: "🔍 Strategy Review Recommended",
        detail: "Focus on risk-reward optimization",
        color: "from-amber-500/20 to-orange-500/20",
        border: "border-amber-500/30",
      };
    }
  }, [metrics]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 border ${insight.border} bg-gradient-to-r ${insight.color} backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.3)]`}
    >
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-white/10 p-3">{insight.icon}</div>
        <div className="flex-1">
          <div className="text-base font-semibold">{insight.message}</div>
          <div className="mt-0.5 text-xs text-white/70">{insight.detail}</div>
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [perf, setPerf] = useState<PerformanceData | null>(null);
  const [accounts, setAccounts] = useState<AccountsResponse | null>(null);
  const [switching, setSwitching] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [calendarMonth] = useState<Date>(() => new Date());

  useEffect(() => {
    async function load() {
      const [r0, r1, r2] = await Promise.all([
        fetch("/api/app/accounts"),
        fetch("/api/app/dashboard"),
        fetch("/api/app/performance"),
      ]);

      const j0 = await r0.json();
      const j1 = await r1.json();
      const j2 = await r2.json();

      if (!r0.ok) return setErr(j0?.error || "accounts failed");
      if (!r1.ok) return setErr(j1?.error || "dashboard failed");
      if (!r2.ok) return setErr(j2?.error || "performance failed");

      setAccounts(j0);
      setDash(j1);
      setPerf(j2);
    }
    load();
  }, []);

  async function selectAccount(accountId: string) {
    setSwitching(true);
    try {
      const r = await fetch("/api/app/accounts/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "select failed");

      // Reload everything so metrics/trades match new account
      const [r0, r1, r2] = await Promise.all([
        fetch("/api/app/accounts"),
        fetch("/api/app/dashboard"),
        fetch("/api/app/performance"),
      ]);
      const j0 = await r0.json();
      const j1 = await r1.json();
      const j2 = await r2.json();

      if (!r0.ok) throw new Error(j0?.error || "accounts reload failed");
      if (!r1.ok) throw new Error(j1?.error || "dashboard reload failed");
      if (!r2.ok) throw new Error(j2?.error || "performance reload failed");

      setAccounts(j0);
      setDash(j1);
      setPerf(j2);
    } catch (e: any) {
      setErr(e?.message || "account switch failed");
    } finally {
      setSwitching(false);
    }
  }

  const sparkEquity = useMemo(() => perf?.curve ?? [], [perf]);
  const sparkDaily = useMemo(() => perf?.daily ?? [], [perf]);

  if (err)
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 backdrop-blur-xl">
          <div className="text-red-400 font-semibold">Error: {err}</div>
        </div>
      </div>
    );

  if (!dash || !perf)
    return (
      <div className="min-h-screen bg-[#050814] text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
          <div className="text-lg">Loading dashboard...</div>
        </div>
      </div>
    );

  const m = perf.metrics;
  const ch = perf.challenge;

  const netPnL = m.netPnL;
  const totalReturnPct = m.totalReturnPct;
  const equity = m.currentEquity;
  const cagr = m.cagr;
  const maxDD = m.maxDrawdown;

  const pnlPositive = n(netPnL, 0) >= 0;
  const returnPositive = n(totalReturnPct, 0) >= 0;
  const cagrPositive = n(cagr, 0) >= 0;

  const profitFactorLabel =
    m.profitFactor === Infinity ? "∞" : fixed(m.profitFactor, 2);

  const openTrades = dash.trades.filter((t) => t.status === "OPEN").length;

  return (
    <div className="min-h-screen bg-[#050814] text-white [background-image:radial-gradient(ellipse_at_top,rgba(30,64,175,0.22)_0%,rgba(5,8,20,1)_50%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.15)_0%,rgba(5,8,20,1)_50%)]">
      <div className="mx-auto max-w-7xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Client Dashboard
            </h1>
            <p className="mt-1.5 text-sm text-white/60">
              Model performance based on our candle feed (not your broker
              execution).
            </p>
          </div>

          <div className="flex items-center gap-4">
            {accounts && accounts.accounts.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-xs text-white/60 hidden sm:block">Account</div>
                <select
                  className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white/90 backdrop-blur-xl outline-none hover:bg-white/10 transition"
                  value={accounts.activeAccountId ?? ""}
                  disabled={switching}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (id && id !== accounts.activeAccountId) selectAccount(id);
                  }}
                >
                  {accounts.accounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#050814]">
                      {a.name} • ${a.startingBalance.toLocaleString()} • {a.challengePhase} • {a.challengeStatus}
                    </option>
                  ))}
                </select>
                {switching && (
                  <div className="text-xs text-white/60">Switching…</div>
                )}
              </div>
            )}

            {ch?.status === "PAUSED" ? (
              <div className="rounded-xl px-5 py-2.5 text-sm font-medium border border-red-400/30 bg-red-500/10 text-red-200 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                Account Paused (Max Loss Hit)
              </div>
            ) : ch?.status === "PASSED" ? (
              <div className="rounded-xl px-5 py-2.5 text-sm font-medium border border-purple-400/30 bg-purple-500/10 text-purple-200 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                Challenge Passed
              </div>
            ) : (
              <Link
                href="/app/session"
                className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-5 py-2.5 text-sm font-medium hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-400/30 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 hover:scale-105"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Session Room
                  <span className="transform transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            )}
          </div>
        </div>

        {/* Performance Insight Banner */}
        <div className="mt-6">
          <PerformanceInsight metrics={m} />
        </div>

        {/* Challenge Status Panel */}
        {ch && (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Phase summary card */}
            <div className="relative overflow-hidden rounded-2xl p-5 border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-slate-500/5 to-blue-500/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-white/70 uppercase tracking-wider">
                  Prop Challenge
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full border ${ch.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/30"
                    : ch.status === "PAUSED"
                      ? "bg-red-500/10 text-red-200 border-red-400/30"
                      : "bg-purple-500/10 text-purple-200 border-purple-400/30"
                    }`}
                >
                  {ch.status}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                {/* Left: Phase 1 passed badge */}
                <div className="flex flex-col gap-1">
                  <div className="text-sm font-semibold text-white/90">
                    Phase 1 Target: {ch.phase1TargetPct}%
                  </div>
                  <div
                    className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs border ${ch.phase1Passed
                      ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
                      : "bg-white/5 text-white/60 border-white/10"
                      }`}
                  >
                    {ch.phase1Passed ? "✅ Phase 1 Passed" : "⏳ Phase 1 In Progress"}
                  </div>
                </div>

                {/* Right: Phase 2 progress */}
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    Phase 2 Target: {ch.phase2TargetPct}%
                  </div>
                  <div className="mt-1 text-xs text-white/70">
                    {ch.phase === "PHASE2" ? (
                      <>
                        Phase 2 Profit:{" "}
                        <span className="text-cyan-200 font-medium">
                          {ch.phase2ProfitPct !== null ? ch.phase2ProfitPct.toFixed(2) : "0.00"}%
                        </span>
                      </>
                    ) : (
                      <span className="text-white/50">Starts after Phase 1</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Overall profit line */}
              <div className="mt-4 text-xs text-white/70">
                Overall Profit:{" "}
                <span className="text-white font-medium">
                  {ch.overallProfitPct.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Target progress bar */}
            <div className="rounded-2xl p-5 border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-blue-500/5 to-purple-500/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)]">
              <div className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Target Progress
              </div>
              <div className="mt-3 text-2xl font-bold">
                {Math.round(ch.targetProgressPct)}%
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400/70 to-purple-400/70"
                  style={{ width: `${Math.max(0, Math.min(100, ch.targetProgressPct))}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-white/60">
                Current Target: {ch.currentTargetPct}% ({ch.phase})
              </div>
            </div>

            {/* Drawdown usage bar */}
            <div className="rounded-2xl p-5 border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-orange-500/5 to-red-500/5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)]">
              <div className="text-xs font-medium text-white/70 uppercase tracking-wider">
                Max Loss Usage
              </div>
              <div className="mt-3 text-2xl font-bold">
                {Math.round(ch.drawdownUsedPct)}%
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-400/70 to-red-400/70"
                  style={{ width: `${Math.max(0, Math.min(100, ch.drawdownUsedPct))}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-white/60">
                Max Loss: {ch.maxLossPct}%
              </div>
            </div>
          </div>
        )}

        {/* Row 1: Key Metrics with gradient backgrounds */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Net PnL"
            value={`${pnlPositive ? "+" : ""}${fixed(netPnL, 2)}`}
            sub={`Closed trades: ${m.tradesClosed}`}
            toneClass="bg-gradient-to-br from-emerald-500/10 to-cyan-500/5"
            icon={
              pnlPositive ? (
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-400" />
              )
            }
            trend={pnlPositive ? "up" : "down"}
            glowColor={
              pnlPositive
                ? "rgba(16, 185, 129, 0.4)"
                : "rgba(239, 68, 68, 0.4)"
            }
          />
          <StatCard
            title="Total Return"
            value={pct(totalReturnPct, 2)}
            sub={`From ${fixed(dash.account.startingBalance, 2)}`}
            toneClass="bg-gradient-to-br from-blue-500/10 to-purple-500/5"
            icon={<Percent className="h-5 w-5 text-blue-400" />}
            trend={returnPositive ? "up" : "down"}
            glowColor="rgba(59, 130, 246, 0.4)"
          />
          <StatCard
            title="Equity"
            value={fixed(equity, 2)}
            sub={`Start: ${fixed(dash.account.startingBalance, 2)}`}
            icon={<Wallet className="h-5 w-5 text-purple-400" />}
            toneClass="bg-gradient-to-br from-purple-500/10 to-pink-500/5"
            trend="neutral"
            glowColor="rgba(168, 85, 247, 0.4)"
          />
          <StatCard
            title="CAGR"
            value={pct(cagr, 2)}
            sub="Annualized return"
            icon={<Activity className="h-5 w-5 text-cyan-400" />}
            toneClass="bg-gradient-to-br from-cyan-500/10 to-blue-500/5"
            trend={cagrPositive ? "up" : "down"}
            glowColor="rgba(6, 182, 212, 0.4)"
          />
          <StatCard
            title="Max Drawdown"
            value={pct(maxDD, 2)}
            sub="From equity peaks"
            icon={<ArrowDownRight className="h-5 w-5 text-orange-400" />}
            toneClass="bg-gradient-to-br from-orange-500/10 to-red-500/5"
            trend="down"
            glowColor="rgba(251, 146, 60, 0.4)"
          />
        </div>

        {/* Row 2: Performance Metrics with enhanced donut charts */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Signals Received"
            value={String(m.signalsReceived)}
            sub={`Open: ${openTrades} | Closed: ${m.tradesClosed}`}
            icon={<Bell className="h-5 w-5 text-amber-400" />}
            toneClass="bg-gradient-to-br from-amber-500/10 to-yellow-500/5"
            glowColor="rgba(251, 191, 36, 0.4)"
          />
          <StatCard
            title="Win Rate"
            value={pct(m.winRate, 1)}
            sub="Closed trades only"
            toneClass="bg-gradient-to-br from-emerald-500/10 to-green-500/5"
            right={
              <DonutStat
                value={n(m.winRate, 0)}
                label="Win Rate"
                subtitle="closed only"
              />
            }
            glowColor="rgba(16, 185, 129, 0.4)"
          />
          <StatCard
            title="Profit Factor"
            value={profitFactorLabel}
            sub="Gross profit / loss"
            toneClass="bg-gradient-to-br from-blue-500/10 to-indigo-500/5"
            right={
              <DonutStat
                value={pfToGauge(m.profitFactor)}
                label="Profit Factor"
                subtitle="higher is better"
              />
            }
            glowColor="rgba(59, 130, 246, 0.4)"
          />
          <StatCard
            title="Avg R"
            value={fixed(m.avgR, 2)}
            sub="Average R-multiple"
            icon={<DollarSign className="h-5 w-5 text-green-400" />}
            toneClass="bg-gradient-to-br from-green-500/10 to-emerald-500/5"
            glowColor="rgba(34, 197, 94, 0.4)"
          />
        </div>

        {/* Row 3: Charts with enhanced styling */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="group rounded-2xl border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.20),0_20px_50px_rgba(0,0,0,0.50)] transition-all duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                Equity Curve
              </h2>
              <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                CLOSED trades
              </span>
            </div>
            <div className="mt-4">
              <EquityCurveChart data={perf.curve} />
            </div>
          </div>

          <div className="group rounded-2xl border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 p-5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.20),0_20px_50px_rgba(0,0,0,0.50)] transition-all duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Cumulative PnL
              </h2>
              <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                By day
              </span>
            </div>
            <div className="mt-4">
              <DailyCumulativePnLChart
                data={perf.daily.map((d) => ({
                  date: d.date,
                  cumulative: d.cumulative,
                }))}
              />
            </div>
          </div>

          <div className="group rounded-2xl border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-emerald-500/5 to-green-500/5 p-5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)] hover:shadow-[0_0_0_1px_rgba(59,130,246,0.20),0_20px_50px_rgba(0,0,0,0.50)] transition-all duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                Daily Net PnL
              </h2>
              <span className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-full">
                By day
              </span>
            </div>
            <div className="mt-4">
              <DailyPnLBarChart
                data={perf.daily.map((d) => ({ date: d.date, pnl: d.pnl }))}
              />
            </div>
          </div>
        </div>

        {/* Row 4: Calendar */}
        <div className="mt-6">
          <PnLCalendar
            monthDate={calendarMonth}
            daily={perf.daily.map((d) => ({
              date: d.date,
              pnl: d.pnl,
              trades: d.trades,
            }))}
          />
        </div>

        {/* Row 5: Trade History with enhanced styling */}
        <div className="mt-6 rounded-2xl border border-white/10 ring-1 ring-white/5 bg-gradient-to-br from-slate-500/5 to-blue-500/5 p-5 backdrop-blur-xl shadow-[0_0_0_1px_rgba(59,130,246,0.10),0_14px_40px_rgba(0,0,0,0.40)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" />
              Trade History
            </h2>
            <span className="text-xs text-white/60 bg-white/5 px-3 py-1 rounded-full">
              Latest 50
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-white/70">
                <tr className="border-b border-white/10">
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Symbol</th>
                  <th className="p-3 text-left font-medium">Side</th>
                  <th className="p-3 text-left font-medium">Entry</th>
                  <th className="p-3 text-left font-medium">Exit</th>
                  <th className="p-3 text-left font-medium">PnL</th>
                  <th className="p-3 text-left font-medium">R</th>
                  <th className="p-3 text-left font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {dash.trades.map((t) => {
                  const isProfitable =
                    t.pnlMoney !== null && t.pnlMoney > 0;
                  const isLoss = t.pnlMoney !== null && t.pnlMoney < 0;

                  return (
                    <tr
                      key={t.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors duration-200"
                    >
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${t.status === "OPEN"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-white/10 text-white/70 border border-white/10"
                            }`}
                        >
                          {t.status === "OPEN" && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                          )}
                          {t.status}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{t.symbol}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.side === "BUY"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-red-500/20 text-red-300"
                            }`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="p-3 text-white/80">{t.entryPrice}</td>
                      <td className="p-3 text-white/80">
                        {t.exitPrice ?? "-"}
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-medium ${isProfitable
                            ? "text-emerald-400"
                            : isLoss
                              ? "text-red-400"
                              : "text-white/60"
                            }`}
                        >
                          {t.pnlMoney !== null
                            ? `${isProfitable ? "+" : ""}${fixed(t.pnlMoney, 2)}`
                            : "-"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`font-medium ${isProfitable
                            ? "text-emerald-400"
                            : isLoss
                              ? "text-red-400"
                              : "text-white/60"
                            }`}
                        >
                          {t.pnlR !== null ? fixed(t.pnlR, 2) : "-"}
                        </span>
                      </td>
                      <td className="p-3 text-white/70 text-xs">
                        {new Date(t.entryTime).toLocaleString(undefined, {
                          month: "short",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
                {dash.trades.length === 0 && (
                  <tr>
                    <td
                      className="p-6 text-center text-white/60"
                      colSpan={8}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="h-8 w-8 text-white/30" />
                        <div>No trades yet.</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-white/60 bg-white/5 rounded-xl p-3 border border-white/5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Tip: Open trades show "-" for Exit/PnL until settled.
          </div>
        </div>
      </div>
    </div>
  );
}
