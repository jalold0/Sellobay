FROM node:20-alpine AS base
# openssl — Prisma query engine'i uchun SHART (Alpine'da musl+OpenSSL 3.x engine'i
# tanlanadi). Bo'lmasa Prisma versiyani aniqlay olmaydi, jim ravishda noto'g'ri
# binarga qaytadi va birinchi so'rovda "cannot find libssl" bilan yiqiladi.
# base qatlamida turadi, chunki `deps`/`build` (prisma generate) ham, `runtime` ham
# shundan meros oladi.
RUN apk add --no-cache openssl
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @ecom/telegram-bot...
RUN pnpm --filter @ecom/telegram-bot build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/telegram-bot/dist ./dist
COPY --from=build /repo/apps/telegram-bot/package.json ./
COPY --from=build /repo/node_modules ./node_modules
CMD ["node", "dist/main.js"]
