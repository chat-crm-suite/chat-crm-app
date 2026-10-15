# Chat v2 — manual verification checklist

What the automated suites prove and what a human still has to click through in
the running app. The automated column cites the spec that covers the behavior;
"human" means the running app with a real socket, a real WhatsApp number and a
real phone.

Automated suites for this change:

```sh
CONTRACTS_DIR="D:/projects/chat-crm/.worktrees/chat-v2-api/src/contracts" pnpm test   # 129 tests, 19 files
npx tsc -b && CONTRACTS_DIR="..." npx vite build                                       # typecheck + bundle
```

API side: `pnpm run build`, `pnpm run docs:check` and the `sentiment`,
`conversations` and `message` jest suites (integration suites need the dev MySQL
`chat_crm_db_test`; run with `DB_HOST=127.0.0.1 REDIS_HOST=127.0.0.1` and the
dev `.env` values).

## Checklist

- [ ] **Send**
  - Automated: optimistic pending row + `clientMessageId` emission
    (`use-chat-thread.spec.tsx`), Enter sends / Shift+Enter breaks / empty and
    disconnected states (`composer.spec.tsx`), tick rendering
    (`thread.spec.tsx`, `message-row.spec.tsx`).
  - Human: in the running app, send a text to a real WhatsApp number; the row
    appears instantly, the field clears, and the tick advances
    `pending → sent → delivered → read`. Verify the message arrives on the phone.
- [ ] **Receive**
  - Automated: broadcast merges into the thread without duplicating the
    optimistic row (`use-chat-thread.spec.tsx`, `thread-state.spec.ts`).
  - Human: write from WhatsApp; the message appears in the open thread and the
    list preview updates without a reload. Repeat with the thread closed and
    with the app on another conversation.
- [ ] **Fail + retry**
  - Automated: a `failed` row shows inline "Reintentar" only on outbound
    messages (`message-row.spec.tsx`); retry re-emits the stored payload with the
    same `clientMessageId` and resets the row to pending
    (`use-chat-thread.spec.tsx`, `thread-state.spec.ts`); error taxonomy picks
    the template action or the detail toast (`socket-taxonomy.spec.ts`,
    `socket-provider.spec.tsx`).
  - Human: force a real provider failure (e.g. reply outside the 24-hour
    window), confirm the failed state and toast, click Reintentar, and confirm
    the retry converges to a single row with advancing ticks.
- [ ] **Chat switch without duplicates**
  - Automated: joining the newly opened room on switch
    (`use-chat-thread.spec.tsx`), live patches from another conversation are
    ignored, dedupe by `id` then `clientMessageId` (`thread-state.spec.ts`).
  - Human: switch quickly between conversations while messages arrive; no
    duplicated or cross-thread rows. Reload and confirm the history still
    matches (optimistic/outbox rows reconcile).
- [ ] **Reconnect**
  - Automated: join on open, rejoin after reconnect, join when the socket
    connects after opening offline (`use-chat-thread.spec.tsx`); composer
    disables and shows the banner while disconnected (`composer.spec.tsx`).
  - Human: cut the network, confirm the WifiOff banner and disabled composer,
    restore it, confirm the room is rejoined and that messages sent/received
    during the gap converge without duplicates.
- [ ] **Attachments**
  - Automated: `pending → ready | failed` rendering (spinner, bordered image
    card, overlay time/tick chip, honest "Archivo no disponible"), live
    attachment patches (`message-row.spec.tsx`, `use-chat-thread.spec.tsx`,
    `thread-state.spec.ts`).
  - Human: receive real inbound media (image/document) and watch it go from
    pending to ready; force one enrichment failure and confirm the failed card.
    Sending attachments is intentionally disabled until the API supports upload.
- [ ] **Mobile**
  - Automated: tone detail switches to a bottom sheet below 640px
    (`tone-control.spec.tsx`), `--chat-viewport-height` follows `visualViewport`
    and ignores pinch zoom (`use-visual-viewport-height.spec.ts`), 44px classes
    exist in the markup (not layout-verified by jsdom).
  - Human: at 375px and in landscape on a real phone, verify ≥44px touch
    targets, the tone sheet, the composer staying above the virtual keyboard,
    safe-area padding, and list ↔ thread back navigation keeping state.

## Not covered by automation

jsdom tests exercise logic and markup, not the real socket transport, WhatsApp
delivery, visual layout, virtual keyboards or safe areas. Everything marked
"human" above must be clicked through before closing the ticket.
