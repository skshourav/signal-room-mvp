"use client";

import { useState } from "react";

export default function AdminSettlePage() {
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setMsg("Settling open trades...");
    const res = await fetch("/api/admin/settle-open-trades", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setMsg(`Error: ${data?.error || "unknown"}`);
      return;
    }
    setMsg(`Done ✅ scanned=${data.scannedOpenTrades} closed=${data.closed} skippedNoCandles=${data.skippedNoCandles}`);
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin — Settle Open Trades</h1>
      <button onClick={run} style={{ padding: 10, marginTop: 16 }}>
        Run settle engine
      </button>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        MVP: closes OPEN trades when TP/SL is hit in candle data and updates account equity.
      </p>
    </div>
  );
}
