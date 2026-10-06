<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/chat-crm-suite/.github/main/brand/svg/chatcrm-lockup-dark.svg">
  <img alt="ChatCRM" src="https://raw.githubusercontent.com/chat-crm-suite/.github/main/brand/svg/chatcrm-lockup-light.svg" width="340">
</picture>

### ChatCRM · App web

La bandeja del equipo donde las conversaciones de WhatsApp se convierten en clientes.

[![Licencia: PolyForm Noncommercial](https://img.shields.io/badge/licencia-PolyForm%20NC%201.0-006239)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-006239?logo=react&logoColor=white)
![Vite 7](https://img.shields.io/badge/Vite-7-006239?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-006239?logo=typescript&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind%20CSS-4-006239?logo=tailwindcss&logoColor=white)

[English](README.md) · **Español**

</div>

---

## Resumen

`chat-crm-app` es la interfaz web de ChatCRM. Los agentes responden las conversaciones de WhatsApp desde una
bandeja compartida, consultan a los clientes y siguen el desempeño del equipo, mientras la
[API](https://github.com/chat-crm-suite/chat-crm-api) mantiene todo sincronizado en tiempo real. Es uno de los
tres servicios de ChatCRM: ver el [resumen de la organización](https://github.com/chat-crm-suite).

## Funcionalidades

- **Chats**: bandeja de WhatsApp compartida con actualizaciones en vivo por Socket.IO.
- **Contactos**: lista de clientes con búsqueda, filtros y validación de números de teléfono.
- **Panel**: KPIs, tendencias, ranking de agentes y gráficos de sentimiento de los clientes.
- **Usuarios**: miembros del equipo y roles.
- **Ajustes de WhatsApp**: conecta el canal de WhatsApp Business desde la app.
- **Asistente de configuración inicial**: crea el administrador, la empresa y el canal de WhatsApp.
- **Autenticación**: inicio de sesión, registro, recuperación de contraseña y códigos de un solo uso.
- Interfaz en **inglés y español**, con tema claro y oscuro.

## Stack

React 19 · Vite 7 · TypeScript · TanStack Router · TanStack Query · TanStack Table · Tailwind CSS 4 ·
shadcn/ui (Radix) · React Hook Form + Zod · Zustand · cliente de Socket.IO · Recharts · Vitest + Testing Library.

Los payloads de la API vienen de los contratos Zod compartidos de la API (`@chat-crm/contracts`), así que los
formularios y el backend validan con los mismos esquemas.

## Inicio rápido

### Docker (recomendado)

Levanta todo el stack desde la carpeta padre que contiene los tres repositorios: ver el
[inicio rápido de la API](https://github.com/chat-crm-suite/chat-crm-api/blob/main/README.es.md#inicio-rápido).
La app queda disponible en **http://localhost:5173** con recarga en caliente.

### Sin Docker

Requiere Node.js 22 y pnpm, además de la API en ejecución. Mantén `chat-crm-api` clonado junto a este
repositorio: los contratos compartidos se leen desde ahí.

```bash
pnpm install          # también genera tsconfig.contracts.json
cp .env.example .env
pnpm dev              # http://localhost:5173
```

## Configuración

| Variable | Descripción |
| --- | --- |
| `VITE_API_URL` | URL base de la API, por ejemplo `http://localhost:3000` |
| `VITE_SOCKET_URL` | URL base del servidor de sockets (sin namespace), por ejemplo `http://localhost:3000` |

Los valores `VITE_*` se fijan al compilar: si cambian, hay que volver a compilar.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo con recarga en caliente |
| `pnpm build` · `pnpm preview` | Verificación de tipos y compilación de producción · vista previa |
| `pnpm test` · `pnpm test:watch` | Vitest |
| `pnpm lint` | ESLint |
| `pnpm contracts:sync` | Regenera la ruta a los contratos compartidos |

## Estructura del proyecto

```
src/
├── routes/       Rutas por archivo (TanStack Router): auth, setup, chats, contacts, users, settings…
├── features/     Módulos por funcionalidad: chats, contacts, dashboard, users, settings, setup, auth…
├── components/   UI compartida (basada en shadcn/ui)
├── services/     Clientes de la API
├── stores/       Stores de Zustand
├── lib/          HTTP, i18n, formato y utilidades
└── locales/      en.yml · es.yml
```

## Producción

La imagen de Docker compila la app y la sirve con **nginx** (fallback de SPA, `GET /health` → `ok`).
Ver [`DEPLOY_PROD.md`](DEPLOY_PROD.md).

## Contribuir

Lee la [guía de contribución](https://github.com/chat-crm-suite/.github/blob/main/CONTRIBUTING.md#contribuir-a-chatcrm).
Reporta las vulnerabilidades en privado, como indica la
[política de seguridad](https://github.com/chat-crm-suite/.github/blob/main/SECURITY.md#política-de-seguridad).

## Licencia

Bajo la [PolyForm Noncommercial License 1.0.0](LICENSE):

- **El uso no comercial** es gratuito: usa, modifica y distribuye el código conservando los avisos de copyright ([`NOTICE`](NOTICE)).
- **El uso comercial** requiere una licencia comercial. Las organizaciones con ingresos menores a USD 100.000 al año
  la obtienen gratis; por encima, una cuota anual o un porcentaje de ingresos: ver [`COMMERCIAL.md`](COMMERCIAL.md).
- **Autoría**: `Copyright (c) 2026 Jerremi Aron Chancan Labajos`. El uso comercial exige el crédito visible
  "Built on chat-crm".

Licencias comerciales: **chancanjeremiaron@gmail.com**
