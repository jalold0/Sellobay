FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/admin/package.json apps/admin/
COPY packages ./packages
RUN pnpm install --frozen-lockfile --filter @ecom/admin...

FROM deps AS build
WORKDIR /repo
COPY . .
RUN pnpm --filter @ecom/admin build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/admin/.next/standalone ./
COPY --from=build /repo/apps/admin/.next/static ./apps/admin/.next/static
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/admin/server.js"]
