# ADR 0004 — Design F surface and mobile parity

- Status: Accepted (2026-10)
- Tickets: #2, #5
- Code: `src/features/chats/components/**`, `src/features/chats/hooks/use-visual-viewport-height.ts`

## Context

The v1 chat was bubble-based and desktop-only in practice. Design F was validated
as the target surface (team-style rows, shape-distinct indicators), and phones
(375px + landscape) are a first-class viewport.

## Decision

- Team-style rows: avatar + sender line `Name · HH:mm ✓✓`; text is plain (no
  bubbles); media renders as bordered cards, with a time/tick overlay chip on
  captionless images. Status ticks are `pending → sent → delivered → read`, and
  `failed` shows an inline "Reintentar".
- Indicators never share a shape: connection is `Wifi` / `WifiOff` (composer
  banner when disconnected); customer tone is a face.
- Mobile parity: touch targets ≥44px; safe-area insets on header and composer;
  the tone detail is a bottom sheet below 640px (`max-width: 639px`) and a
  popover above; the conversation height follows `visualViewport` through
  `--chat-viewport-height` (dvh fallback) so the composer stays above the
  virtual keyboard; list ↔ thread navigation is an overlay that keeps state.
- Composer: `Enter` sends, `Shift+Enter` breaks the line, and the field is
  disabled with a banner while the socket is disconnected. Attachment buttons
  stay disabled until the API supports uploads.

## Consequences

- One composition adapts across breakpoints instead of a separate mobile tree.
- Keyboard-following behavior requires the VisualViewport API; without it the
  dvh fallback still works.
