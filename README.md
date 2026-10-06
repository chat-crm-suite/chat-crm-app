<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/chat-crm-suite/.github/main/brand/svg/chatcrm-lockup-dark.svg">
  <img alt="ChatCRM" src="https://raw.githubusercontent.com/chat-crm-suite/.github/main/brand/svg/chatcrm-lockup-light.svg" width="340">
</picture>

### ChatCRM Web App

The team inbox where WhatsApp conversations turn into customers.

[![License: PolyForm Noncommercial](https://img.shields.io/badge/license-PolyForm%20NC%201.0-006239)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-006239?logo=react&logoColor=white)
![Vite 7](https://img.shields.io/badge/Vite-7-006239?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-006239?logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-006239?logo=tailwindcss&logoColor=white)

**English** · [Español](README.es.md)

</div>

---

## Overview

`chat-crm-app` is the web interface of ChatCRM. Agents answer WhatsApp conversations from a shared inbox,
look up customers and follow the team's performance, while the
[API](https://github.com/chat-crm-suite/chat-crm-api) keeps everything in sync in real time. It is one of the
three ChatCRM services — see the [organization overview](https://github.com/chat-crm-suite).

## Features

- **Chats** — shared WhatsApp inbox with live updates over Socket.IO.
- **Contacts** — customer list with search, filters and phone-number validation.
- **Dashboard** — KPIs, trends, agent ranking and customer sentiment charts.
- **Users** — team members and roles.
- **WhatsApp settings** — connect the WhatsApp Business channel from the app.
- **First-run setup wizard** — creates the admin, the company and the WhatsApp channel.
- **Authentication** — sign in, sign up, password recovery and one-time codes.
- **English and Spanish** interface, light and dark themes.

## Tech stack

React 19 · Vite 7 · TypeScript · TanStack Router · TanStack Query · TanStack Table · Tailwind CSS 4 ·
shadcn/ui (Radix) · React Hook Form + Zod · Zustand · Socket.IO client · Recharts · Vitest + Testing Library.

API payloads come from the API's shared Zod contracts (`@chat-crm/contracts`), so the forms and the backend
validate with the same schemas.

## Quick start

### Docker (recommended)

Run the whole stack from the parent folder that holds the three repositories — see the
[API quick start](https://github.com/chat-crm-suite/chat-crm-api#quick-start). The app is then served at
**http://localhost:5173** with hot reload.

### Without Docker

Requires Node.js 22 and pnpm, plus a running API. Keep `chat-crm-api` checked out next to this repository:
the shared contracts are read from it.

```bash
pnpm install          # also generates tsconfig.contracts.json
cp .env.example .env
pnpm dev              # http://localhost:5173
```

## Configuration

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | API base URL, e.g. `http://localhost:3000` |
| `VITE_SOCKET_URL` | Socket server base URL (no namespace), e.g. `http://localhost:3000` |

`VITE_*` values are baked in at build time: changing them requires a rebuild.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server with hot reload |
| `pnpm build` · `pnpm preview` | Type-check and production build · preview it |
| `pnpm test` · `pnpm test:watch` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm contracts:sync` | Regenerate the path to the shared contracts |

## Project structure

```
src/
├── routes/       File-based routes (TanStack Router): auth, setup, chats, contacts, users, settings…
├── features/     Feature modules: chats, contacts, dashboard, users, settings, setup, auth…
├── components/   Shared UI (shadcn/ui based)
├── services/     API clients
├── stores/       Zustand stores
├── lib/          HTTP, i18n, formatting and helpers
└── locales/      en.yml · es.yml
```

## Development

### Agent skills

`.agents/` and `.claude/` are installed, gitignored directories (never committed).
`skills-lock.json` is the source of truth, like `package.json` for npm dependencies.

```sh
pnpm skills:install                     # install every skill in the lock
pnpm skills:install -- --skill tdd      # install one skill
pnpm skills:check                       # verify installed skills without network
```

To add or update a skill, use the [skills.sh](https://www.skills.sh/) CLI (it updates the lockfile), then commit
only the lock:

```sh
pnpm dlx skills@latest add <owner/repo> --skill <name> -a opencode -a claude-code --copy -y
```

## Production

The Docker image builds the app and serves it with **nginx** (SPA fallback, `GET /health` → `ok`).
See [`DEPLOY_PROD.md`](DEPLOY_PROD.md).

## Contributing

Read the [contributing guide](https://github.com/chat-crm-suite/.github/blob/main/CONTRIBUTING.md). Report
vulnerabilities privately as described in the [security policy](https://github.com/chat-crm-suite/.github/blob/main/SECURITY.md).

## License

Licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE):

- **Noncommercial use** is free: use, modify and distribute the code while keeping the copyright notices ([`NOTICE`](NOTICE)).
- **Commercial use** requires a commercial license. Organizations below USD 100,000/year in revenue get it for free;
  above that, an annual fee or revenue share — see [`COMMERCIAL.md`](COMMERCIAL.md).
- **Authorship**: `Copyright (c) 2026 Jerremi Aron Chancan Labajos`. Commercial use requires the visible credit
  "Built on chat-crm".

Commercial licensing: **chancanjeremiaron@gmail.com**
