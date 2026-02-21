"use client";

import { useEffect, useMemo, useState } from "react";

type ReleaseResponseOk = {
  ok: true;
  signalId: string;
  phase1Count: number;
  phase2Count: number;
  eligibleClients: number;
  activeClients: number;
  tradesCreated: number;
};

type ReleaseResponseErr = {
  error: string;
};

type PresenceSummary = {
  activePresences: number;
  eligible: number;
  phase1: number;
  phase2: number;
};

export default function AdminSignalsPage() {
  const sessionId = "london-session";

  const [symbol, setSymbol] = useState("EURUSD");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [sl, setSl] = useState("1.0900");
  const [tp, setTp] = useState("1.1000");
  const [signalTime, setSignalTime] = useState(() => new Date().toISOString());

  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<ReleaseResponseOk | null>(null);

  // Live room panel state
  const [live, setLive] = useState<PresenceSummary | null>(null);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  const phaseTotal = useMemo(() => {
    if (!last) return 0;
    return (last.phase1Count ?? 0) + (last.phase2Count ?? 0);
  }, [last]);

  const livePhaseTotal = useMemo(() => {
    if (!live) return 0;
    return (live.phase1 ?? 0) + (live.phase2 ?? 0);
  }, [live]);

  async function fetchLive() {
    setLiveLoading(true);
    setLiveErr(null);

    try {
      const res = await fetch(`/api/admin/presence/summary?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "GET",
      });

      const data = (await res.json()) as Partial<PresenceSummary> & Partial<ReleaseResponseErr>;
      if (!res.ok) {
        setLiveErr(data?.error || "failed to load live room status");
        return;
      }

      setLive(data as PresenceSummary);
    } catch (e: any) {
      setLiveErr(e?.message || "live room request failed");
    } finally {
      setLiveLoading(false);
    }
  }

  // Poll live room status
  useEffect(() => {
    fetchLive();
    const t = window.setInterval(fetchLive, 8000); // every 8s
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function release() {
    setLoading(true);
    setMsg("Releasing...");
    setLast(null);

    try {
      const res = await fetch("/api/admin/release-signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          symbol,
          side,
          timeframe: "5m",
          signalTime,
          sl: Number(sl),
          tp: Number(tp),
        }),
      });

      const data = (await res.json()) as Partial<ReleaseResponseOk> & Partial<ReleaseResponseErr>;

      if (!res.ok) {
        setMsg(`Error: ${data?.error || "unknown"}`);
        return;
      }

      const okData = data as ReleaseResponseOk;
      setLast(okData);

      setMsg(
        `Released ✅ activeClients=${okData.activeClients} eligibleClients=${okData.eligibleClients} tradesCreated=${okData.tradesCreated}`
      );

      // refresh live panel after release (nice UX)
      fetchLive();
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "request failed"}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050814] text-white [background-image:radial-gradient(ellipse_at_top,rgba(30,64,175,0.20)_0%,rgba(5,8,20,1)_55%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.12)_0%,rgba(5,8,20,1)_55%)]">
      <div className="mx-auto max-w-3xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Admin — Release Signal
            </h1>
            <p className="mt-1.5 text-sm text-white/60">
              Releases a signal and auto-creates trades for eligible clients (present + selected account + ACTIVE).
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            Session: <span className="text-white/90 font-medium">{sessionId}</span>
          </div>
        </div>

        {/* ✅ Live Room Panel */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ring-1 ring-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Live Room Status</div>
              <div className="mt-1 text-sm text-white/60">
                Active = heartbeat &lt; 2 minutes • Eligible = selected account + ACTIVE only
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLive}
                disabled={liveLoading}
                className="rounded-xl border border-white/10 bg-[#070b1c] px-3 py-2 text-xs text-white/80 hover:bg-white/10 transition disabled:opacity-60"
              >
                {liveLoading ? "Refresh" : "Refresh"}
              </button>
              <span className="text-xs text-white/50">
                Auto: 8s
              </span>
            </div>
          </div>

          {liveErr && (
            <div className="mt-4 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {liveErr}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-[#070b1c] p-3">
              <div className="text-xs text-white/60">Active Presences</div>
              <div className="mt-1 text-2xl font-bold">{live?.activePresences ?? "—"}</div>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#070b1c] p-3">
              <div className="text-xs text-white/60">Eligible</div>
              <div className="mt-1 text-2xl font-bold">{live?.eligible ?? "—"}</div>
            </div>

            <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-200/80">Eligible PHASE 1</div>
              <div className="mt-1 text-2xl font-bold text-emerald-100">{live?.phase1 ?? "—"}</div>
            </div>

            <div className="rounded-xl border border-purple-400/20 bg-purple-500/10 p-3">
              <div className="text-xs text-purple-200/80">Eligible PHASE 2</div>
              <div className="mt-1 text-2xl font-bold text-purple-100">{live?.phase2 ?? "—"}</div>
            </div>
          </div>

          <div className="mt-3 text-xs text-white/60">
            Phase1 + Phase2 = {live ? livePhaseTotal : "—"} • (should match Eligible)
          </div>
        </div>

        {/* Form */}
        <div className="mt-6 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ring-1 ring-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-white/80">
              <div className="mb-1 text-xs text-white/60">Symbol</div>
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#070b1c] px-3 py-2 text-sm outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/30"
              />
            </label>

            <label className="text-sm text-white/80">
              <div className="mb-1 text-xs text-white/60">Side</div>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as any)}
                className="w-full rounded-xl border border-white/10 bg-[#070b1c] px-3 py-2 text-sm outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/30"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm text-white/80">
              <div className="mb-1 text-xs text-white/60">SL</div>
              <input
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#070b1c] px-3 py-2 text-sm outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/30"
              />
            </label>

            <label className="text-sm text-white/80">
              <div className="mb-1 text-xs text-white/60">TP</div>
              <input
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#070b1c] px-3 py-2 text-sm outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/30"
              />
            </label>
          </div>

          <label className="text-sm text-white/80">
            <div className="mb-1 text-xs text-white/60">Signal Time (ISO)</div>
            <input
              value={signalTime}
              onChange={(e) => setSignalTime(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#070b1c] px-3 py-2 text-sm outline-none focus:border-blue-400/40 focus:ring-1 focus:ring-blue-400/30"
            />
          </label>

          <button
            onClick={release}
            disabled={loading}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-500/25 to-purple-500/25 px-5 py-3 text-sm font-semibold hover:from-blue-500/35 hover:to-purple-500/35 border border-blue-400/30 ring-1 ring-white/5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? "Releasing..." : "Release Signal Now"}
              <span className="transform transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </button>

          {msg && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              {msg}
            </div>
          )}
        </div>

        {/* Delivery Summary */}
        {last && (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ring-1 ring-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.35)] lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Delivery Summary</div>
                <div className="text-xs text-white/60">
                  Signal ID: <span className="text-white/90 font-mono">{last.signalId.slice(0, 8)}…</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-[#070b1c] p-3">
                  <div className="text-xs text-white/60">Active Presences</div>
                  <div className="mt-1 text-2xl font-bold">{last.activeClients}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#070b1c] p-3">
                  <div className="text-xs text-white/60">Eligible Accounts</div>
                  <div className="mt-1 text-2xl font-bold">{last.eligibleClients}</div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#070b1c] p-3">
                  <div className="text-xs text-white/60">Trades Created</div>
                  <div className="mt-1 text-2xl font-bold">{last.tradesCreated}</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-[#070b1c] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Phase Breakdown</div>
                  <div className="text-xs text-white/60">Phase1 + Phase2 = {phaseTotal}</div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                    <div>
                      <div className="text-xs text-emerald-200/80">PHASE 1</div>
                      <div className="mt-0.5 text-xl font-bold text-emerald-100">{last.phase1Count}</div>
                    </div>
                    <div className="text-xs text-emerald-200/70">
                      {last.eligibleClients > 0 ? Math.round((last.phase1Count / last.eligibleClients) * 100) : 0}%
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-purple-400/20 bg-purple-500/10 px-4 py-3">
                    <div>
                      <div className="text-xs text-purple-200/80">PHASE 2</div>
                      <div className="mt-0.5 text-xl font-bold text-purple-100">{last.phase2Count}</div>
                    </div>
                    <div className="text-xs text-purple-200/70">
                      {last.eligibleClients > 0 ? Math.round((last.phase2Count / last.eligibleClients) * 100) : 0}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/60">
                  Eligible accounts exclude <span className="text-white/80">PAUSED</span>/<span className="text-white/80">PASSED</span> and only include each user’s{" "}
                  <span className="text-white/80">selected active account</span>.
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl ring-1 ring-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.35)]">
              <div className="text-xs font-medium text-white/70 uppercase tracking-wider">Notes</div>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                <li>• Entry = candle open at signalTime.</li>
                <li>• If TP & SL in same candle → SL first.</li>
                <li>• Trades use 1% risk of starting balance.</li>
                <li>• Presence valid if heartbeat within 2 minutes.</li>
              </ul>
            </div>
          </div>
        )}

        <p className="mt-6 text-xs text-white/50">
          MVP: creates Signal + SignalDeliveries + Trades for eligible clients in session room.
        </p>
      </div>
    </div>
  );
}