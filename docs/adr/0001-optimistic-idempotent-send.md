# ADR 0001 — Optimistic idempotent send; reconcile by `id` then `clientMessageId`

- Status: Accepted (2026-10)
- Tickets: #3
- Contracts: `SendConversationMessageSchema.clientMessageId`, `ConversationMessageStatusPatchSchema`

## Context

Outbound messages travel over the socket (`conversation:message:send`) while the
saved broadcast (`conversation:message:broadcast`) and delivery patches
(`conversation:message:status`) arrive asynchronously. The UI must feel instant,
survive retries and reconnects without duplicating rows, and never regress a
delivery tick.

## Decision

- Every send generates a front `clientMessageId` (UUID) and inserts an optimistic
  row (`status: 'pending'`) into the thread cache. The exact payload is kept in an
  in-memory outbox keyed by that id.
- Retry re-emits the stored payload with the same `clientMessageId`, so the API
  dedupes by `client_message_id` instead of inserting again. Retrying a text row
  loaded from history rebuilds the payload from the message, keeping its id.
- Reconciliation (`upsertMessage`) matches by server `id` first, then by
  `clientMessageId`, merging the optimistic row and the saved broadcast into one.
- `conversation:message:status` patches are authoritative for status and only
  advance forward (`pending < sent < delivered < read`, `failed` terminal).
  Explicit retry resets the row to `pending` so patches can advance it again.
- `conversation:message:attachment` patches update the row's media by server id.

## Consequences

- The optimistic row and the broadcast collapse without flicker; stale or
  out-of-order patches are ignored.
- The outbox lives with the open thread (not persisted): text retries still work
  after a reload, media retries are out of scope.
- The server stays the source of truth for delivery state; the client only
  predicts it.
