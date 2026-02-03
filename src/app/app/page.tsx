"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function ClientDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/app/dashboard");
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || "failed");
        return;
      }
      setData(json);
    }
    load();
  }, []);

  if (err) return <div style={{ padding: 24 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 24 }}>Loading dashboard...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Client Dashboard</h1>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 8, minWidth: 220 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Current Equity</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{data.account.currentEquity.toFixed(2)}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 8, minWidth: 220 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Signals Received</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{data.signalsCount}</div>
        </div>

        <div style={{ padding: 12, border: "1px solid #333", borderRadius: 8, minWidth: 220 }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>Quick Links</div>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            <Link href="/app/session">Go to Session Room →</Link>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 24, fontSize: 16, fontWeight: 700 }}>Recent Trades</h2>

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Status", "Symbol", "Side", "Entry", "SL", "TP", "Lot", "Exit", "PnL"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #333" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.trades.map((t) => (
              <tr key={t.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.status}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.symbol}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.side}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.entryPrice}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.sl}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.tp}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>{t.lotSize.toFixed(2)}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                  {t.exitPrice ?? "-"}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #222" }}>
                  {t.pnlMoney ?? "-"}
                </td>
              </tr>
            ))}
            {data.trades.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: 12, opacity: 0.7 }}>
                  No trades yet. Join a session room and wait for a signal.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 14, fontSize: 12, opacity: 0.7 }}>
        Note: This is model performance based on our broker candle feed (not your broker execution).
      </p>
    </div>
  );
}
