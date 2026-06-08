FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @ecom/api...

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm --filter @ecom/database generate
RUN pnpm --filter @ecom/api build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 4000
CMD ["node", "dist/main.js"]
