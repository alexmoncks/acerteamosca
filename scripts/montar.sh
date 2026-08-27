#!/usr/bin/env bash
# Gera a página autocontida da apresentação (as 12 cenas embutidas como data:
# URI) a partir de um template HTML com o marcador `/*__IMAGENS__*/ {}`.
#
# Uso: bash scripts/montar.sh <template.html> <saida.html> [dir-cenas]
#
# O padrão de dir-cenas é `apresentacao/` — os mestres 1920x1080 —, e não
# `historia/`, porque a página é peça de divulgação e não tem a moldura de
# 480x270 do jogo para respeitar.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"

TEMPLATE="${1:?uso: bash scripts/montar.sh <template.html> <saida.html> [dir-cenas]}"
SAIDA="${2:?falta o arquivo de saída}"
CENAS="${3:-public/images/kungfucastle/apresentacao}"

node scripts/montar-pagina.mjs "$TEMPLATE" "$CENAS" "$SAIDA"
