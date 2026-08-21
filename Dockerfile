# Kung Fu Castle / Acerte a Mosca — local test image
# Next.js 14 + Prisma (postgres). Not used by Railway, which builds from source.

FROM node:20-alpine AS base
# openssl: required by Prisma engines. libc6-compat: required by sharp.
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# ── deps ─────────────────────────────────────────────────────────────────────
FROM base AS deps
# prisma/ must exist before install: package.json has a `postinstall: prisma generate`
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ── build ────────────────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* are inlined into the client bundle at build time, so the
# multiplayer WS endpoints have to be known here, not at runtime.
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_WS_SHIPS_URL
ARG NEXT_PUBLIC_WS_MEMORY_URL
ARG NEXT_PUBLIC_WS_2048_URL
ARG NEXT_PUBLIC_WS_BATALHA_URL
ARG NEXT_PUBLIC_GA_ID
ARG NEXT_PUBLIC_ADSENSE_ID
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_WS_SHIPS_URL=$NEXT_PUBLIC_WS_SHIPS_URL \
    NEXT_PUBLIC_WS_MEMORY_URL=$NEXT_PUBLIC_WS_MEMORY_URL \
    NEXT_PUBLIC_WS_2048_URL=$NEXT_PUBLIC_WS_2048_URL \
    NEXT_PUBLIC_WS_BATALHA_URL=$NEXT_PUBLIC_WS_BATALHA_URL \
    NEXT_PUBLIC_GA_ID=$NEXT_PUBLIC_GA_ID \
    NEXT_PUBLIC_ADSENSE_ID=$NEXT_PUBLIC_ADSENSE_ID \
    NEXT_TELEMETRY_DISABLED=1

# `npm run build` is `prisma generate && next build`. The build never connects to
# the database, so a placeholder DATABASE_URL is enough to satisfy the schema.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

# ── runner ───────────────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
# `output: standalone` is not set in next.config.js (Railway builds from source and
# would be affected), so ship the built tree as-is rather than changing that config.
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
