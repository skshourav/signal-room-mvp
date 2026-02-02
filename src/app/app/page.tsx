import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function ClientHome() {
  const session = await getServerSession(authOptions);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Client Dashboard</h1>
      <p style={{ marginTop: 8 }}>
        Logged in as: <b>{session?.user?.email}</b>
      </p>
        <div style={{ marginTop: 16 }}>
        <LogoutButton />
      </div>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Next: Session Room, Trades, Equity Curve
      </p>
    </div>
  );
}
