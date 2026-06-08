FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/seller/package.json apps/seller/
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @ecom/seller...

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm --filter @ecom/seller build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/seller/.next/standalone ./
COPY --from=build /repo/apps/seller/.next/static ./apps/seller/.next/static
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/seller/server.js"]
