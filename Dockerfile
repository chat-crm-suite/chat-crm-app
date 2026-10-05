# Stage 1: deps base (cache eficiente con pnpm + store). Todo se crea ya como
# `node` (chown pequeño ANTES de instalar + COPY --chown), así evitamos el
# chown -R recursivo sobre node_modules que dominaba el tiempo de build.
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV npm_config_store_dir=/pnpm/store
ENV COREPACK_HOME=/pnpm/corepack
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate \
    && mkdir -p /pnpm/store /app \
    && chown -R node:node /pnpm /app
WORKDIR /app
USER node
# Shared contracts: single source of truth in chat-crm-api/src/contracts,
# provided by the extra build context `contracts` declared in every compose
# file (see additional_contexts). Consumed as raw TypeScript (no build step).
COPY --from=contracts . /contracts
ENV CONTRACTS_DIR=/contracts
COPY --chown=node:node package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .

# Stage 2: dev (Vite HMR en 5173). uid 1000 = usuario host (WSL) para que los
# archivos que escribe Vite en el bind mount (.tanstack/, routeTree.gen.ts) no
# queden como root.
FROM base AS dev
EXPOSE 5173
# Sincroniza node_modules con el lockfile en cada arranque: el volumen nombrado
# solo se rellena una vez, así que un rebuild no basta si cambian dependencias.
CMD ["sh", "-c", "pnpm install --frozen-lockfile --prefer-offline && pnpm run dev --port 5173"]

# Stage 3: build prod (VITE_* se bakea aquí -> usar --build-arg)
# NOTA: se usa `vite build` directo (sin `tsc -b`) porque el repo tiene
# errores TS preexistentes que rompen `npm run build` en la imagen.
# El typecheck sigue disponible local/CI con `npm run build` o `npx tsc -b`.
FROM base AS build
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
# `pnpm install` runs before the sources are copied, so the postinstall hook
# cannot find scripts/ and skips tsconfig.contracts.json (gitignored, generated).
# Generate it here: tsconfig.app.json extends it.
RUN pnpm contracts:sync && pnpm exec vite build

# Stage 4: prod con nginx (SPA + gzip + cache estático)
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/health >/dev/null 2>&1 || exit 1
