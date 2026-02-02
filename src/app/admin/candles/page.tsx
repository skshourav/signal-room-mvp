"use client";

import { useState } from "react";
import Papa from "papaparse";

export default function AdminCandlesPage() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("5m");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleFile(file: File) {
    setMsg("Parsing CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];

          setMsg(`Parsed ${rows.length} rows. Uploading...`);

          const res = await fetch("/api/admin/candles/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol, timeframe, rows }),
          });

          const data = await res.json();
          if (!res.ok) {
            setMsg(`Error: ${data?.error || "upload failed"}`);
            return;
          }

          setMsg(`Upload OK ✅ received=${data.receivedRows} inserted=${data.inserted}`);
        } catch (e: any) {
          setMsg(`Error: ${e?.message || "unknown"}`);
        }
      },
      error: (err) => {
        setMsg(`CSV parse error: ${err.message}`);
      },
    });
  }

  return (
    <div style={{ padding: 24, maxWidth: 600 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Admin — Candle CSV Upload</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
        <label>
          Symbol
          <input value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <label>
          Timeframe
          <input value={timeframe} onChange={(e) => setTimeframe(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </label>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
      </div>

      <div style={{ marginTop: 16, fontSize: 12, opacity: 0.75 }}>
        <p><b>CSV columns required:</b> time, open, high, low, close (volume optional)</p>
        <p><b>time</b> should be ISO (recommended): 2026-02-02T17:30:00.000Z</p>
      </div>
    </div>
  );
}
