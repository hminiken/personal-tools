# ----------------------------
# 1. Base image
# ----------------------------
FROM node:22-alpine AS base

RUN apk add --no-cache libc6-compat

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable


# ----------------------------
# 2. Install dependencies
# ----------------------------
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# 🚀 FAST + STABLE (NO fetch)
RUN pnpm install --frozen-lockfile


# ----------------------------
# 3. Build stage
# ----------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build


# ----------------------------
# 4. Production runtime
# ----------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]