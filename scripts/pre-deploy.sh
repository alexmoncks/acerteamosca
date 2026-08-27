#!/usr/bin/env bash
# O que tem de passar antes de um push para master virar deploy.
#
# `git push` para master dispara build na plataforma. Descobrir ali que o build
# quebra custa um deploy falho — e, pior, a plataforma mantém o build ANTERIOR
# no ar servindo código velho, o que parece "no ar" sem estar.
#
# Nota de armadilha: NÃO use `pkill -f "next dev"` para derrubar o servidor.
# O padrão casa com a linha de comando do próprio shell que o executa, e o
# script se mata antes de imprimir qualquer coisa.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"

echo "=== derrubando o dev server ==="
# `next dev` roda como `next-server`; casar por isso não pega este script.
pkill -f "next-server" 2>/dev/null && echo "  derrubado" || echo "  nenhum rodando"
sleep 1

# Build de produção e dev escrevem manifestos de chunk incompatíveis no mesmo
# .next. Começar limpo é o que evita levar restos de um para o outro.
rm -rf .next
echo "  .next apagado"

echo
echo "=== testes ==="
node tests/run.mjs 2>&1 | tail -3

echo
echo "=== build de produção (o mesmo script que o Dockerfile roda) ==="
npm run build 2>&1 | tail -5

echo
echo "=== o jogo continua fora do menu, do sitemap e do índice? ==="
printf '  home:    %s ocorrência(s) de kungfucastle\n' \
  "$(grep -c kungfucastle 'src/app/[locale]/page.js' || true)"
printf '  sitemap: %s ocorrência(s)\n' "$(grep -c kungfucastle src/app/sitemap.js || true)"
grep -q 'robots: { index: false, follow: false }' \
  'src/app/[locale]/jogos/kungfucastle/page.js' \
  && echo "  robots:  noindex, nofollow  OK" \
  || { echo "  robots:  FALTANDO"; exit 1; }

echo
echo "=== o que entraria no commit (brutos têm de estar fora) ==="
git add -A --dry-run 2>/dev/null | grep -c "apresentacao/bruto" | \
  xargs -I{} sh -c '[ "{}" = "0" ] && echo "  brutos: fora  OK" || { echo "  brutos: {} arquivos ENTRARIAM"; exit 1; }'
