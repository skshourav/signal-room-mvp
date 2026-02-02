"use client";

import { useEffect, useRef, useState } from "react";

type JoinResponse = { presenceId: string };

export default function SessionRoomPage() {
  const [presenceId, setPresenceId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Joining...");
  const heartbeatRef = useRef<number | null>(null);

  // MVP: choose one sessionId hard-coded (we’ll make it selectable next)
  const sessionId = "london-session";

  useEffect(() => {
    let isMounted = true;

    async function join() {
      setStatus("Joining session room...");
      const res = await fetch("/api/presence/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        setStatus("Failed to join.");
        return;
      }

      const data = (await res.json()) as JoinResponse;
      if (!isMounted) return;

      setPresenceId(data.presenceId);
      setStatus("Active ✅ Waiting for signals...");
    }

    join();

    return () => {
      isMounted = false;
    };
  }, []);

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
        const text = await res.text();
        console.error("Heartbeat failed:", res.status, text);
        return;
      }

      const data = await res.json();
      console.log("Heartbeat ok:", data);
    } catch (err) {
      console.error("Heartbeat error:", err);
    }
  }

  // ✅ ping immediately once, then every 10s for easy testing
  ping();
  heartbeatRef.current = window.setInterval(() => {
    if (!stopped) ping();
  }, 30_000);

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
        <p><b>Status:</b> {status}</p>
        <p style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Rule: staying in this room means trades will be counted for signals released while you’re active.
        </p>
      </div>

      {presenceId && (
        <p style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          presenceId: {presenceId}
        </p>
      )}
    </div>
  );
}
