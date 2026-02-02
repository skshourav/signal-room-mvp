"use client";

import { useState } from "react";

export default function AdminSignalsPage() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [sl, setSl] = useState("1.0900");
  const [tp, setTp] = useState("1.1000");
  const [signalTime, setSignalTime] = useState(() => new Date().toISOString());
  const [msg, setMsg] = useState<string | null>(null);

  async function release() {
    setMsg("Releasing...");
    const res = await fetch("/api/admin/release-signal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "london-session",
        symbol,
        side,
        timeframe: "5m",
        signalTime,
        sl: Number(sl),
        tp: Number(tp),
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data?.error || "unknown"}`);
      return;
    }

    setMsg(`Released ✅ activeClients=${data.activeClients} tradesCreated=${data.tradesCreated}`);
  }

  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin — Release Signal</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label>
          Symbol
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Side
          <select value={side} onChange={(e) => setSide(e.target.value as any)} style={{ width: "100%", padding: 8 }}>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
        </label>

        <label>
          SL
          <input value={sl} onChange={(e) => setSl(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          TP
          <input value={tp} onChange={(e) => setTp(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Signal Time (ISO)
          <input value={signalTime} onChange={(e) => setSignalTime(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <button onClick={release} style={{ padding: 10 }}>
          Release Signal Now
        </button>

        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </div>

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        MVP: creates Signal + SignalDeliveries + Trades for active clients in session room.
      </p>
    </div>
  );
}
