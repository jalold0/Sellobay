# Sellobay NestJS servislari: bitta Dockerfile, to'rtta rasm (ADR 0012).
#
#   docker build -f apps/backend/Dockerfile --build-arg APP=gateway -t sellobay-gateway .
#
# `APP` = gateway | auth | catalog | orders. Kontekst — REPO ILDIZI (pnpm workspace kerak).

ARG NODE_VERSION=24

# --- 1. Bog'liqliklar va build ---------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /repo

# Butun workspace manifestlari (lockfile hamma importer'ni kutadi), keyin faqat backend o'rnatiladi.
COPY . .
RUN pnpm install --frozen-lockfile --filter @ecom/backend...
RUN pnpm --filter @ecom/backend build
# Production bog'liqliklari alohida papkaga (devDependencies — nest cli, jest, typescript — rasmga kirmaydi).
RUN pnpm --filter @ecom/backend deploy --prod /out \
 && cp -r apps/backend/dist /out/dist

# --- 2. Ishga tushirish ----------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ARG APP
ENV NODE_ENV=production \
    APP=${APP}
WORKDIR /app
COPY --from=build --chown=node:node /out ./
# Root bo'lmagan foydalanuvchi: konteyner buzilsa ham xost fayllariga ta'sir qilmasin.
USER node
# Tayyorlik compose'dagi healthcheck orqali (slim rasmda curl yo'q).
CMD ["sh", "-c", "exec node dist/${APP}/main.js"]
