"use client";

import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{ padding: 10, marginTop: 16 }}
    >
      Logout
    </button>
  );
}
