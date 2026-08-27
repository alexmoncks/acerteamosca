#!/usr/bin/env bash
# Confere que o dev server está servindo a página do jogo e as 12 cenas.
#
# O que este script pega e o teste unitário não pega: o PNG existir no disco não
# quer dizer que o Next o serve — basta estar fora de public/ ou com o caminho
# trocado por uma barra.
set -euo pipefail

PORTA="${1:-3001}"
BASE="http://localhost:$PORTA"

printf '=== páginas ===\n'
for rota in /pt /pt/jogos/kungfucastle /en/jogos/kungfucastle; do
  printf '  %-32s %s\n' "$rota" "$(curl -sL -o /dev/null -w '%{http_code}' "$BASE$rota")"
done

printf '=== as 12 cenas da abertura ===\n'
faltou=0
for f in cena-01-titulo cena-02-templo cena-03-trono cena-04-rapto \
         cena-05-paifang cena-06-heroi cena-07-andar1 cena-08-andar2 \
         cena-09-andar3 cena-10-andar4 cena-11-andar5 cena-12-fim; do
  linha=$(curl -s -o /dev/null -w '%{http_code} %{size_download}' \
    "$BASE/images/kungfucastle/historia/$f.png")
  codigo=${linha%% *}
  printf '  %-22s %s bytes\n' "$f" "$linha"
  [ "$codigo" = "200" ] || faltou=1
done

printf '=== trilha da abertura ===\n'
curl -s -o /dev/null -w '  bgm: %{http_code} %{size_download} bytes\n' \
  "$BASE/audio/kungfucastle/bgm/abertura.mp3" || true

[ "$faltou" = "0" ] && printf '\nOK — as 12 cenas são servidas.\n' || {
  printf '\nFALHOU — alguma cena não é servida.\n'; exit 1; }
