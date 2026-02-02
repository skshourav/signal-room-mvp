"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);

  const res = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (res?.error) {
    setError("Invalid email or password");
    return;
  }

  // Get the session after sign-in
  const sessionRes = await fetch("/api/auth/session");
  const sessionJson = await sessionRes.json();

  const role = sessionJson?.user?.role;

  if (role === "ADMIN") router.push("/admin");
  else router.push("/app");
}

  return (
    <div style={{ maxWidth: 360, margin: "60px auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 600 }}>Login</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 16, display: "grid", gap: 10 }}>
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10 }}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10 }}
        />
        <button type="submit" style={{ padding: 10 }}>
          Sign in
        </button>
      </form>

      {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}

      <p style={{ marginTop: 16, fontSize: 12, opacity: 0.7 }}>
        For now, use seeded accounts. Next we’ll add role-based redirects.
      </p>
    </div>
  );
}
