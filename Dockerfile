# Kung Fu Castle / Acerte a Mosca — a imagem de PRODUCAO.
# Next.js 14 + Prisma (postgres).
#
# Este cabecalho ja disse "Not used by Railway, which builds from source". Era
# MENTIRA, e a mentira custou oito dias: sessoes inteiras descartaram este
# arquivo por causa dela e foram consertar o Nixpacks, que o Railway nem usa. O
# log de build de 21/08 mostra `load build definition from Dockerfile` e os
# estagios daqui (deps -> builder -> runner). O painel do servico web sobrepoe
# o `railway.toml`. Se voce mexer aqui, esta mexendo em producao.

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
# Os binarios do projeto no PATH.
#
# O CMD abaixo so vale quando o servico NAO tem Start Command proprio: um
# comando definido no painel do Railway sobrepoe o CMD da imagem. E um comando
# escrito da forma mais obvia -- `next start` -- morre na hora:
#
#     $ docker run img sh -c "next start"
#     sh: next: not found          (exit 127)
#
# O container morre no primeiro segundo, o deploy e marcado como falho e a
# plataforma mantem o build ANTERIOR no ar. Do lado de fora nao se ve erro
# nenhum: o site responde 200, com o codigo velho.
#
# Com o PATH abaixo, `next start`, `prisma` e qualquer outro binario do projeto
# resolvem independente de quem escreveu o comando e de como escreveu.
ENV PATH=/app/node_modules/.bin:$PATH

# A porta vem do ambiente. Plataforma de deploy (Railway, Fly, Cloud Run)
# injeta $PORT e faz o healthcheck NELA — um `-p 3000` fixo faz o build passar,
# o container subir, e o deploy ser marcado como falho mesmo assim, porque
# ninguém atende na porta que a plataforma perguntou.
#
# `${PORT:-3000}` mantém o 3000 para uso local, onde ninguém injeta nada. Exige
# shell form: a exec form não expande variável.
#
# `next` e nao `npx next`: o npx BAIXA o pacote da rede quando nao acha local,
# entao uma copia quebrada viraria um download silencioso em vez de um erro.
EXPOSE 3000
CMD ["sh", "-c", "next start -H 0.0.0.0 -p ${PORT:-3000}"]
