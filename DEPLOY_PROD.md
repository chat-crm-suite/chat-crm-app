# Deploy Producción — chat-crm-app (Vite SPA + nginx)

> Tú ejecutas los comandos. Aquí solo están los archivos y el paso a paso.

## 0. Contratos compartidos (2026-10-04)

El front consume los schemas Zod de `chat-crm-api/src/contracts` **como TypeScript
puro** (alias `@chat-crm/contracts`); no se copian ni se publican en npm. Por eso:

- En local, los repos deben estar lado a lado (`chat-crm-api/` y `chat-crm-app/`),
  o el mismo worktree gemelo (`repo/.worktrees/<nombre>` en ambos).
- En Docker el compose aporta la carpeta como **contexto adicional** de build
  (`additional_contexts: contracts: ../chat-crm-api/src/contracts`): el checkout
  de la API debe existir junto al del front antes de construir.
- Excepción: si solo quieres el contenedor del front sin el repo de la API,
  exporta `CONTRACTS_DIR` apuntando a una copia de esa carpeta.

## 1. Qué se corrigió para prod

- `Dockerfile`: reescrito a 4 stages `base → dev → build → production`.
  - Antes: `CMD ["npm","start"]` pero no existe script `start` → roto.
  - Ahora: `production` es `nginx:1.27-alpine` sirviendo `dist/`, con `HEALTHCHECK`.
  - `VITE_API_URL` / `VITE_SOCKET_URL` entran como `ARG` en `build` (Vite los bakea).
- `nginx.conf` (nuevo): fallback SPA a `index.html`, gzip, cache `/assets/`, `/health` → `200 ok`.
- `docker-compose.yml` (nuevo, dev): Vite HMR en `5173`.
- `docker-compose.prod.yml` (nuevo): solo `APP_PORT:80`, `volumes: !override []`, red `crm-network`.
- `.env.example` / `.env.prod.example`: plantillas. `.env.prod` SOLO en servidor.

## 2. Flujo local → GitHub → servidor

En tu PC:

```bash
git add Dockerfile nginx.conf docker-compose.yml docker-compose.prod.yml .env.example .env.prod.example .gitignore DEPLOY_PROD.md
git commit -m "chore(app): prod nginx + compose"
git push codecta main
```

En el servidor:

```bash
ssh jypsac@100.77.254.40
cd /home/jypsac/Proyectos/CRM/chat-crm-app
cp .env.prod.example .env.prod
nano .env.prod
# Ej. Tailscale:
# VITE_API_URL=http://100.77.254.40:3000
# VITE_SOCKET_URL=http://100.77.254.40:3000/chat
# APP_PORT=8081
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up --build -d
curl -s http://localhost:8081/health
curl -s http://localhost:8081/ | head -20
```

## 3. Importante Vite

Si cambias `VITE_*` hay que hacer rebuild (quedan fijos en `dist/`):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up --build -d
```

## 4. Validación

```bash
docker ps | grep chat-crm-app-prod
docker logs chat-crm-app-prod --tail 20
```

Abre en navegador: `http://100.77.254.40:8081` y revisa Network → `VITE_API_URL` debe apuntar al API `:3000`, socket a `/chat`.
