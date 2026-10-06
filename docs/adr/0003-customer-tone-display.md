# ADR 0003 — Customer tone: GET as source of truth, theme-token faces, persisted modes

- Status: Accepted (2026-10)
- Tickets: #4
- Contract: `ConversationSentimentSchema`; endpoint `GET /conversations/:id/sentiment`

## Context

The API emits `conversation:sentiment:update` with per-analysis probabilities
(`pos` / `neu` / `neg`), which is not what the UI shows, and there was no read
endpoint, so the initial tone of a conversation could not be loaded.

## Decision

- Add `GET /conversations/:id/sentiment` returning the aggregate
  (`avgPos`, `avgNeu`, `avgNeg`, `totalMessages`, `dominant`) defined once in the
  shared contracts; the app parses it at runtime in dev only.
- The GET response is the source of truth. The live event only triggers a
  debounced (500 ms) refetch of that query, so a burst of analyses collapses into
  one request.
- Display a face (`Smile` / `Meh` / `Frown`) colored with the theme tokens
  `--positive` / `--neutro` / `--negative`. Tone never shares an icon shape with
  connection status (Wifi / WifiOff) or message ticks (checks).
- Modes `full` / `mini` / `off` persist in `localStorage` (`chat:tone-mode`);
  `off` hides the control everywhere. The detail opens as a popover on desktop
  and a bottom sheet below 640px.

## Consequences

- One aggregate per conversation is fetched once and kept fresh by events.
- `dominant` is deterministic (highest average, ties POS > NEG > NEU), so the
  indicator does not flicker between equal averages.
- The dev-only runtime parse turns contract drift into an immediate error.
