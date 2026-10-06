# GLOSSARY — Chat v2 domain vocabulary

Canonical terms for the chat domain in this repo. Code, comments, tests and docs
use these words; the "avoid" column marks the synonyms that were settled out. UI
copy is Spanish, but the vocabulary itself is English and applies to code.

The single source of truth for the shapes is `@chat-crm/contracts`
(`chat-crm-api/src/contracts`); this file names the concepts.

| Term             | Definition                                                                                                                                                                       | Avoid / notes                                                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Conversation** | One message thread between a company and one customer; reopening continues the same conversation (one per customer and company).                                                  | _chat_ in code (kept in UI copy and legacy routes), _room_.                                                                                                                |
| **Customer**     | The external person who writes to the company (WhatsApp today, other channels later); the counterpart of a conversation.                                                          | _client_ (legacy `clients` / `contacts`), _contact_, _user_.                                                                                                               |
| **Member**       | An operator's membership in a company (user × company + role + status); the unit of authorization and the sender type of outbound agent messages.                                | _agent_ (a member role and a UI label, not the entity), _operator_, _user_ (the account identity).                                                                         |
| **Message**      | One inbound or outbound item in a conversation. Status lifecycle: `pending → sent → delivered → read`, with terminal `failed`.                                                    | _text_, _bubble_ (rendering, not the entity), _tick_ (the icon that shows a status).                                                                                       |
| **Attachment**   | The file/media payload of a message. Status lifecycle: `pending → ready \| failed`; inbound media is visible while it enriches, and `failed` keeps the row with "Archivo no disponible". | _file_ (UI copy), _media_ (the message type family, not the attachment entity).                                                                                            |
| **room**         | Socket-only term: the room a socket joins (`conversation:join { room }`) to receive that conversation's broadcasts.                                                               | _room_ in REST payloads or domain code; the domain identifier is always `conversationId`. _channel_ means a WhatsApp/channel integration.                                  |
| **isMine**       | Per-viewer predicate: the message was authored by our side (`sender.type === 'member'`). The thread refines it with `sender.id === currentMemberId` to label "Tú" vs another agent. | _isOwner_ (conversation assignment), _fromMe_; do not name it _outbound_ (`outbound` is the direction, not the viewer's perspective).                                      |

## Known drift: workspace `CONTEXT.md`

`CONTEXT.md` at the workspace root (`D:\projects\chat-crm\CONTEXT.md`, dated
2026-10-01) still uses the pre-v2 vocabulary: `User` (operator), `Clients`
(rename of `contacts`), `Chat`, and the sender types `agent` / `client` /
`system`. That vocabulary predates the v2 contracts. Where they disagree, the
shared schemas in `@chat-crm/contracts` and this glossary are canonical:

- `Chat` → **Conversation** (the `conversation:*` socket events are the v2 names).
- `Clients` / `contacts` → **Customer**.
- Sender `agent` → `sender.type === 'member'`; sender `client` → `sender.type === 'customer'`.
- `User` remains the account identity; the company-scoped operator is a **Member**.
