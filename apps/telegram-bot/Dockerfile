FROM node:20-alpine AS base
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
