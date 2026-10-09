#!/bin/bash
# SessionStart hook — instala as dependencias para que `npm test` e os scripts
# do projeto funcionem numa sessao do Claude Code na web.
#
# O container das sessoes na nuvem comeca sem node_modules, entao sem isto o
# primeiro `npm test` falha com "Cannot find module" e a sessao perde tempo
# redescobrindo o motivo.
set -euo pipefail

# Só faz sentido nas sessoes remotas; na maquina local o dev cuida do install.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-"$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"}"

# O `postinstall` do package.json roda `prisma generate`, e o schema.prisma liga
# a datasource a env("DATABASE_URL"). Nada aqui conecta num banco de verdade, mas
# a variavel precisa existir — sem ela o generate aborta e leva o npm install junto.
# O mesmo placeholder serve para `npx prisma` no resto da sessao.
if [ -z "${DATABASE_URL:-}" ]; then
  export DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
  if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
    echo "export DATABASE_URL=\"${DATABASE_URL}\"" >> "$CLAUDE_ENV_FILE"
  fi
fi

# `npm install` em vez de `npm ci`: o estado do container e cacheado depois do
# hook, e o install reaproveita o node_modules ja presente no cache em vez de
# apagar e reinstalar tudo do zero como o ci faz.
npm install

echo "session-start: dependencias prontas ($(node --version), npm $(npm --version))"
