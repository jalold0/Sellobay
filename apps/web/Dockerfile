FROM node:20-alpine AS base
# openssl — Prisma query engine'i uchun SHART (Alpine'da musl+OpenSSL 3.x engine'i
# tanlanadi). Bo'lmasa Prisma versiyani aniqlay olmaydi, jim ravishda noto'g'ri
# binarga qaytadi va birinchi so'rovda "cannot find libssl" bilan yiqiladi.
# base qatlamida turadi, chunki `deps`/`build` (prisma generate) ham, `runtime` ham
# shundan meros oladi.
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @ecom/web...

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm --filter @ecom/web build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
