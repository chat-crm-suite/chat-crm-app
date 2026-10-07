# ADR 0005 — Case surface: Resolve/Reopen mapping and the client-side service window

- Status: Accepted (2026-10)
- Tickets: #11
- Code: `src/features/chats/components/conversation/**`, `src/features/chats/lib/service-window.ts`, `src/features/chats/lib/conversation-assignment.ts`, `src/features/chats/hooks/use-now.ts`

## Context

Prototype F ("Consola Pro", the `prototype/chat-v2` branch) validated a case
surface around the thread: a case
header (`#id`, status pill, Resolve/Options), a right rail (customer card, tone,
case, assignee, channel, 24h window meter), quick replies and a resolved notice.
The built chat only had the thread, the header tone control and the composer.

The API models the conversation with `status` (`open` / `pending` / `closed` /
`archived`) and `priority` (varchar, schema-validated), but exposes **no
close/reopen endpoint, no priority write and no priority in any list payload**.
The WhatsApp 24h service window is provider policy with no server field.

## Decision

- "Case" is UI copy for the Conversation (see `GLOSSARY.md`); no new entity and
  no case-number field. The short identifier shown in the header is derived from
  the conversation id.
- Resolve maps to `status = closed` and Reopen to `status = open`; `pending`
  and `archived` are untouched. Until the API exposes the transition, the
  controls ship visually present but disabled with a "Próximamente" hint — never
  a working-looking no-op. Enabling them later is wiring, not re-design.
- The priority row renders only when the conversation carries a priority; it is
  never invented while no payload emits it.
- The channel row names WhatsApp while it is the only channel integration; once
  more channels ship it must read the conversation's channel.
- The 24h service window is computed client-side from the last customer message
  (pure function plus a minute cadence for re-render); an expired window points
  to the template flow (#10). The server remains the source of truth for send
  failures (the 24h flag on outbound errors).
- Quick replies insert a draft into the composer at the caret (never submit);
  they are hidden while the case is closed, where the resolved notice takes
  their place. The notice informs without blocking replies until close/reopen
  exists.

## Consequences

- One predicate, `isConversationUnassigned`, is shared by header and rail so
  both offer Take under the same condition.
- The client-side window can drift from provider reality; the send path stays
  authoritative.
- The design comparator (the `prototype/chat-v2` branch, Variant F) must be
  updated when the shipped surface changes, so the two never diverge again.
