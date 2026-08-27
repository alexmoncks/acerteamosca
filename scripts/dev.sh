#!/usr/bin/env bash
# Sobe o dev server e o deixa rodando depois que o shell que o chamou morre.
#
# `nohup ... &` não basta quando quem chama é `wsl.exe bash -lc`: a sessão do
# WSL leva o filho junto ao terminar. `setsid` tira o processo do grupo e da
# sessão do chamador, que é o que o faz sobreviver.
#
# A porta 3000 costuma estar ocupada por um contêiner do projeto, então o padrão
# aqui é 3001. Passe outra como primeiro argumento se precisar.
#
# Segundo argumento `limpar` apaga o .next antes de subir. Precisa disso sempre
# que um `next build` tiver rodado neste repositório: build de produção e dev
# escrevem no MESMO .next com manifestos de chunk incompatíveis, e o dev sobe
# em cima dos restos. O sintoma no navegador não diz nada disso — é um
# "TypeError: Cannot read properties of undefined (reading 'call')" dentro de
# webpack.js, que é o webpack pedindo um módulo que o manifesto promete e o
# build atual não tem.
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${1:-3001}"
LIMPAR="${2:-}"
LOG="/tmp/nextdev-$PORTA.log"

cd "$RAIZ"
export PATH="$HOME/.nvm/versions/node/v22.20.0/bin:$PATH"

if [ "$LIMPAR" = "limpar" ]; then
  # Derruba o que estiver servindo esta porta antes de puxar o .next debaixo
  # dele: dev server vivo sobre .next apagado responde 500 em tudo.
  pkill -f "next dev -p $PORTA" 2>/dev/null || true
  sleep 1
  rm -rf .next
  echo ".next apagado"
elif curl -sf -o /dev/null "http://localhost:$PORTA/pt"; then
  echo "já tem servidor respondendo em http://localhost:$PORTA"
  exit 0
fi

setsid nohup npx next dev -p "$PORTA" > "$LOG" 2>&1 < /dev/null &
disown || true

# Espera ficar de pé em vez de dormir um tempo fixo e torcer.
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null "http://localhost:$PORTA/pt"; then
    echo "de pé em http://localhost:$PORTA  (log: $LOG)"
    exit 0
  fi
  sleep 1
done

echo "não subiu em 40s — últimas linhas de $LOG:"
tail -20 "$LOG"
exit 1
