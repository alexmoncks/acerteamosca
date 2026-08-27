#!/usr/bin/env bash
# Baixa as 12 cenas geradas no Highsfield para o repositório.
#
# Versão CHINESA — conforme docs/superpowers/specs/kungfu-castle-biblia-visual-chinesa.md,
# que substitui as referências japonesas dos specs anteriores. A primeira leva
# de cenas foi gerada em cima dos specs antigos (torii, samurai, oni, gi de
# caratê) e está errada; estas são as que valem.
#
# Os brutos ficam em bruto/ e NÃO são a entrega: a entrega é o que sai do
# msx2-quantize.mjs, com a paleta travada.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESTINO="$RAIZ/public/images/kungfucastle/apresentacao/bruto"
CDN="https://d8j0ntlcm91z4.cloudfront.net/user_3Ego48gFDeFmQSzGfirFb96sU4V"

mkdir -p "$DESTINO"

baixar() {
  if curl -sfL -o "$DESTINO/$1" "$CDN/$2"; then
    printf '  ok     %s\n' "$1"
  else
    printf '  FALHA  %s\n' "$1"
  fi
}

baixar cena-01-titulo.png  hf_20260827_191649_2eb562da-dda2-4e0e-a682-2806f3e466e8.png
baixar cena-02-templo.png  hf_20260827_191649_b4e8ff23-3156-49d9-920c-c1d5879261ad.png
baixar cena-03-trono.png   hf_20260827_191801_82007973-e33b-49fc-98b3-5b066a333871.png
baixar cena-04-rapto.png   hf_20260827_191649_b38eaea2-012f-4b1e-bb98-23bac7df46b1.png
baixar cena-05-paifang.png hf_20260827_191649_30216906-5102-490c-863d-a9c45363a9ef.png
baixar cena-06-heroi.png   hf_20260827_191649_836bae81-4799-431c-9be5-f28daeddc220.png
baixar cena-07-andar1.png  hf_20260827_191801_91527af4-f048-4ade-a404-6e81db0eae6c.png
baixar cena-08-andar2.png  hf_20260827_191801_0e825f87-52dd-4ca1-8056-2a7c1025d202.png
baixar cena-09-andar3.png  hf_20260827_191801_37448562-a3cd-4801-87f0-ee1bf9810785.png
baixar cena-10-andar4.png  hf_20260827_191801_2b217a4b-e866-4f3d-b37f-6d67eb38eec1.png
baixar cena-11-andar5.png  hf_20260827_191801_bde9d55c-be26-4fe8-9fa6-e615cfeb3a05.png
baixar cena-12-fim.png     hf_20260827_191801_37c9400a-3594-4c25-8c57-b3ad547f07a7.png

# Nomes da leva japonesa que sumiram no renome (castelo → templo, portao →
# paifang). Sem isto eles ficariam para trás e entrariam na sequência final.
rm -f "$DESTINO/cena-02-castelo.png" "$DESTINO/cena-05-portao.png"

printf -- '--- baixadas: %s em %s\n' "$(ls -1 "$DESTINO" | wc -l)" "$DESTINO"
