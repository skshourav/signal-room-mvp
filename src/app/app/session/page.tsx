"use client";

import { useEffect, useRef, useState } from "react";
import { pusherClient } from "@/lib/pusher-client";

type JoinResponse = { presenceId: string };

type RealtimeSignalPayload = {
  signalId: string;
  sessionId: string;
  symbol: string;
  side: "BUY" | "SELL";
  timeframe: string;
  signalTime: string;
  sl: number;
  tp: number;
  entryPrice: number;
  activeClients?: number;
  tradesCreated?: number;
};

export default function SessionRoomPage() {
  const sessionId = "london-session"; // MVP hard-coded

  const [presenceId, setPresenceId] = useState<string | null>(null);
  const [status, setStatus] = useState("Joining...");
  const [latestSignal, setLatestSignal] = useState<RealtimeSignalPayload | null>(null);

  const heartbeatRef = useRef<number | null>(null);

  // 1) Subscribe to realtime signals (Pusher)
  useEffect(() => {
    const channelName = `session-${sessionId}`;
    const channel = pusherClient.subscribe(channelName);

    const handler = (data: RealtimeSignalPayload) => {
      setLatestSignal(data);
    };

    channel.bind("signal-released", handler);

    return () => {
      channel.unbind("signal-released", handler);
      pusherClient.unsubscribe(channelName);
    };
  }, [sessionId]);

  // 2) Join presence on mount
  useEffect(() => {
    let cancelled = false;

    async function join() {
      setStatus("Joining session room...");

      const res = await fetch("/api/presence/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        if (!cancelled) setStatus("Failed to join.");
        return;
      }

      const data = (await res.json()) as JoinResponse;
      if (cancelled) return;

      setPresenceId(data.presenceId);
      setStatus("Active ✅ Waiting for signals...");
    }

    join();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // 3) Heartbeat + leave handling (requires presenceId)
  useEffect(() => {
    if (!presenceId) return;

    let stopped = false;

    async function ping() {
      try {
        const res = await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ presenceId }),
        });

        if (!res.ok) {
          // keep silent in MVP; you can add UI later if needed
          return;
        }
      } catch {
        // silent: network hiccup
      }
    }

    // ping now + every 30s
    ping();
    heartbeatRef.current = window.setInterval(() => {
      if (!stopped) ping();
    }, 30_000);

    // mark leave on refresh/close (best-effort)
    const onBeforeUnload = () => {
      navigator.sendBeacon(
        "/api/presence/leave",
        new Blob([JSON.stringify({ presenceId })], { type: "application/json" })
      );
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      stopped = true;

      if (heartbeatRef.current) window.clearInterval(heartbeatRef.current);
      window.removeEventListener("beforeunload", onBeforeUnload);

      // mark leave on normal navigation (best-effort)
      fetch("/api/presence/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presenceId }),
      }).catch(() => {});
    };
  }, [presenceId]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Session Room</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Session: <b>London</b> (MVP hard-coded)
      </p>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #333", borderRadius: 8 }}>
        <p>
          <b>Status:</b> {status}
        </p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Rule: staying in this room means trades will be counted for signals released while you’re active.
        </p>
      </div>

      {presenceId && (
        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          presenceId: {presenceId}
        </p>
      )}

      {latestSignal && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #0f0", borderRadius: 8 }}>
          <h3 style={{ fontWeight: 700 }}>📣 Signal Received</h3>

          <p style={{ marginTop: 8 }}>
            <b>{latestSignal.symbol}</b> — <b>{latestSignal.side}</b> ({latestSignal.timeframe})
          </p>

          <p style={{ marginTop: 6 }}>
            Entry (candle open): <b>{latestSignal.entryPrice}</b>
          </p>

          <p style={{ marginTop: 6 }}>
            SL: <b>{latestSignal.sl}</b> | TP: <b>{latestSignal.tp}</b>
          </p>

          <p style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
            Signal time: {latestSignal.signalTime}
          </p>

          <button style={{ marginTop: 10, padding: 8 }} onClick={() => setLatestSignal(null)}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
