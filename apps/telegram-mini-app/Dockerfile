FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/telegram-mini-app/package.json apps/telegram-mini-app/
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @ecom/telegram-mini-app...

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm --filter @ecom/telegram-mini-app build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/telegram-mini-app/.next/standalone ./
COPY --from=build /repo/apps/telegram-mini-app/.next/static ./apps/telegram-mini-app/.next/static
EXPOSE 3003
ENV PORT=3003
CMD ["node", "apps/telegram-mini-app/server.js"]
