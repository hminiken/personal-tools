# 1. Base stage for common environment
FROM node:22-alpine AS base
# Add libc6-compat once here, it's needed for Next.js in Alpine
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

# ✨ FIX: Replaced corepack with an explicit install of pnpm v9
# This prevents the v11 "minimumReleaseAge" supply-chain errors
RUN npm install -g pnpm@9

# 2. Dependencies stage
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
# Use pnpm fetch to cache dependencies before installing
RUN pnpm install --frozen-lockfile

# 3. Builder stage
FROM base AS builder
WORKDIR /app
# COPY only what's needed for the build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# /app/data is a runtime bind mount (see docker-compose.yml), so it doesn't
# exist yet at build time. Create it so the sqlite client can open a
# throwaway build-time db instead of failing to find the directory.
RUN mkdir -p /app/data
# Skip unnecessary installs by using the existing global pnpm
RUN pnpm run build

# 4. Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Standalone mode only needs the output from the builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]