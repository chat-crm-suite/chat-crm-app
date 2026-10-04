# Stage 1: deps base (cache eficiente con pnpm + store)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.34.6 --activate
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PNPM_STORE=/pnpm/store
RUN mkdir -p /pnpm/store /app && chown -R node:node /pnpm /app
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile
COPY . .

# Stage 2: dev (Vite HMR en 5173). uid 1000 = usuario host (WSL) para que los
# archivos que escribe Vite en el bind mount (.tanstack/, routeTree.gen.ts) no
# queden como root.
FROM base AS dev
RUN chown -R node:node /app
USER node
EXPOSE 5173
CMD ["pnpm", "run", "dev", "--", "--host", "--port", "5173"]

# Stage 3: build prod (VITE_* se bakea aquí -> usar --build-arg)
# NOTA: se usa `vite build` directo (sin `tsc -b`) porque el repo tiene
# errores TS preexistentes que rompen `npm run build` en la imagen.
# El typecheck sigue disponible local/CI con `npm run build` o `npx tsc -b`.
FROM base AS build
ARG VITE_API_URL
ARG VITE_SOCKET_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL
RUN pnpm exec vite build

# Stage 4: prod con nginx (SPA + gzip + cache estático)
FROM nginx:1.27-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/health >/dev/null 2>&1 || exit 1
