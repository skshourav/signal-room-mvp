# Signal Room MVP — Context Anchor (Do Not Drift)

## Product definition
A session-based signal delivery webapp where client performance is tracked as a model portfolio.

## Core rules (MVP)
1. Admin creates sessions (London/NY) and signals.
2. Client joins a session room.
3. If a signal is released while the client is present (heartbeat active), the system:
   - delivers the signal in real-time
   - auto-creates a virtual trade for that client ("join = take")
4. All entries/exits/results are computed from OUR selected broker candle data (CSV for MVP).
5. Client dashboard shows model equity curve, trades, and metrics.
6. No client broker connection. No real fills.

## Key assumptions
- Entry is the open price of the signal candle.
- Trade closes when TP or SL is hit first using candle scan.
- If TP & SL are both touched in the same candle, we use a consistent rule (default: SL first / conservative).
- Presence is valid only if heartbeat updated within X minutes (default 2 minutes).

## MVP Screens
Client:
- /app (dashboard)
- /app/session (session room)
- /app/trades (table)
- /app/signals (history)

Admin:
- /admin
- /admin/sessions
- /admin/signals
- /admin/clients

## Out of scope (later)
- Real broker integrations
- Subscriptions/billing
- Strategy marketplace
- Multi-broker candle feeds
- Complex permissions
