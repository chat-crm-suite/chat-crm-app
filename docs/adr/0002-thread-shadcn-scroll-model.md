# ADR 0002 — Thread on the shadcn message primitives with a WhatsApp-like scroll model

- Status: Accepted (2026-10)
- Tickets: #2
- Code: `src/components/ui/message*.tsx`, `src/features/chats/components/conversation/thread.tsx`

## Context

Design F renders the conversation as a team-style thread (avatar + sender line),
not bubbles. It needs date separators, grouping, loading and empty states, and a
scroll model that does not fight the user while they read history.

## Decision

- Build the thread on the installed shadcn `message-scroller` primitives
  (`MessageScrollerProvider` / `Scroll` / `Viewport` / `Content` / `Item` /
  `Button`) plus `Marker` for date separators; no custom scroll math.
- `autoScroll` follows the live edge only while the user is already at the
  bottom; otherwise new messages do not move the viewport and the built-in
  "ir al final" button (44px on phones) appears.
- Consecutive messages from the same sender share one scroller item; rows are
  sorted chronologically and grouped by day.
- Loading shows skeleton rows; an empty conversation shows the guiding empty
  state; the date marker carries the day label.

## Consequences

- Reading history is never interrupted; jumping to unread messages is a
  deliberate click.
- Layout and a11y behavior come from the shared primitives, so future fixes
  apply to every message surface.
