#!/usr/bin/env bash
# Ambiente de desenvolvimento do Acerte a Mosca no homeserver, igual à produção.
#
# Produção (Railway) tem dois serviços saindo deste repositório:
#   - web: imagem do `Dockerfile` (npm ci -> `npm run build` = prisma generate +
#     next build -> `next start`), Postgres do Railway em DATABASE_URL;
#   - ws-server: `node server/ws-unified.js` (Procfile), porta em $PORT.
# Aqui é a mesma coisa, sem Docker para o app (Node local) e com o Postgres em
# container persistente:
#
#   aam-dev-db    Postgres 16, volume aam-dev-pgdata, só em 127.0.0.1, restart unless-stopped
#   aam-ws        tmux: node server/ws-unified.js em $AAM_DEV_HOST:$AAM_WS_PORT
#   aam-preview   tmux: janela "app" = next start em $AAM_DEV_HOST:$AAM_APP_PORT
#                       janela "proxy-en" = proxy em $AAM_EN_PORT que manda
#                       Host: nailedthefly.com (para navegar na versão EN)
#
# Uso:
#   scripts/dev-homeserver.sh up        # cria segredos (1ª vez), sobe banco, schema, build, ws e app
#   scripts/dev-homeserver.sh up --no-build   # sobe com o .next que já existe
#   scripts/dev-homeserver.sh build     # só refaz o build (depois reinicie com restart)
#   scripts/dev-homeserver.sh restart   # derruba ws/app e sobe de novo (sem build)
#   scripts/dev-homeserver.sh down      # derruba ws/app; o banco continua de pé
#   scripts/dev-homeserver.sh down --db # derruba ws/app e para o banco (o volume fica)
#   scripts/dev-homeserver.sh status
#   scripts/dev-homeserver.sh logs [app|ws|proxy-en]
#
# Segredos: a senha do Postgres é gerada aqui com openssl na primeira vez e vai
# para `.env` (modo 600, ignorado pelo git). Nunca é impressa. Nada de banco ou
# credencial de produção.
#
# Docs: docs/dev-homeserver.md
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

DB_CONTAINER="aam-dev-db"
DB_VOLUME="aam-dev-pgdata"
DB_IMAGE="postgres:16-alpine"
DB_NAME="acerteamosca"
DB_USER="acerteamosca"
SESSAO_APP="aam-preview"
SESSAO_WS="aam-ws"
PROXY_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/acerteamosca-dev"

# Host e portas: vêm do ambiente na 1ª execução (quando o script cria o
# .env.local) e depois ficam no .env.local, que não vai para o git. Os padrões
# são neutros (só a própria máquina); o IP da rede privada do servidor e as
# portas reais nunca ficam no repositório. Exemplo, na 1ª vez:
#   AAM_DEV_HOST=<ip-da-vpn> AAM_APP_PORT=4000 AAM_EN_PORT=4001 AAM_WS_PORT=4002 \
#     scripts/dev-homeserver.sh up
AAM_DEV_HOST_PADRAO="${AAM_DEV_HOST:-127.0.0.1}"
AAM_APP_PORT_PADRAO="${AAM_APP_PORT:-3000}"
AAM_EN_PORT_PADRAO="${AAM_EN_PORT:-3001}"
AAM_WS_PORT_PADRAO="${AAM_WS_PORT:-3002}"
AAM_DB_PORT_PADRAO="${AAM_DB_PORT:-5433}"
ADSENSE_PADRAO="ca-pub-4148140889800778"   # ID público do publisher (está no ads.txt)

# tmux com ambiente LIMPO. Este script exporta DATABASE_URL e NEXT_PUBLIC_*
# (carregar_env); se o tmux herdasse isso, o servidor tmux criado aqui (ex.:
# depois de um reboot) guardaria a senha no ambiente global e todo painel de
# qualquer outro projeto herdaria o banco e as variáveis do acerteamosca.
tmuxl() {
  env -i HOME="$HOME" USER="${USER:-$(id -un)}" PATH="$PATH" TERM="${TERM:-xterm-256color}" \
    LANG="${LANG:-C.UTF-8}" ${TMUX_TMPDIR:+TMUX_TMPDIR="$TMUX_TMPDIR"} tmux "$@"
}

log() { printf '\033[1;36m==>\033[0m %s\n' "$*"; }
erro() { printf '\033[1;31mERRO:\033[0m %s\n' "$*" >&2; exit 1; }

# ── segredos e configuração ─────────────────────────────────────────────────

garantir_env() {
  if [ ! -f .env ]; then
    command -v openssl >/dev/null || erro "openssl não encontrado"
    log "gerando .env com senha nova do Postgres (modo 600, não impressa)"
    local senha
    senha="$(openssl rand -hex 24)"
    ( umask 077
      cat > .env <<EOF
# Gerado por scripts/dev-homeserver.sh em $(date -Iseconds). NÃO versionar.
# Banco LOCAL de desenvolvimento (container ${DB_CONTAINER}). Não é produção.
DATABASE_URL="postgresql://${DB_USER}:${senha}@127.0.0.1:${AAM_DB_PORT_PADRAO}/${DB_NAME}?schema=public"
EOF
    )
    unset senha
  fi
  chmod 600 .env

  if [ ! -f .env.local ]; then
    log "gerando .env.local (portas e URLs públicas do ambiente de dev)"
    ( umask 077
      local h="$AAM_DEV_HOST_PADRAO" w="$AAM_WS_PORT_PADRAO"
      cat > .env.local <<EOF
# Gerado por scripts/dev-homeserver.sh em $(date -Iseconds). NÃO versionar.
# Ambiente de dev do homeserver (prévia na rede privada).
AAM_DEV_HOST="${h}"
AAM_APP_PORT="${AAM_APP_PORT_PADRAO}"
AAM_EN_PORT="${AAM_EN_PORT_PADRAO}"
AAM_WS_PORT="${w}"

# WebSocket dos jogos multiplayer: entram no bundle no BUILD (NEXT_PUBLIC_*).
# O navegador conecta direto em ws://${h}:${w}.
NEXT_PUBLIC_WS_URL="ws://${h}:${w}/pong"
NEXT_PUBLIC_WS_SHIPS_URL="ws://${h}:${w}/ships"
NEXT_PUBLIC_WS_MEMORY_URL="ws://${h}:${w}/memory"
NEXT_PUBLIC_WS_2048_URL="ws://${h}:${w}/2048"
NEXT_PUBLIC_WS_BATALHA_URL="ws://${h}:${w}/batalha-naval"

# AdSense: só o ID público do publisher. Sem IDs numéricos de bloco, os blocos
# manuais não renderizam (docs/adsense.md). Prévia: ADTEST="on" marca os blocos
# como anúncio de teste; PLACEHOLDERS="1" mostra caixas tracejadas no lugar dos
# blocos sem ID. Vazios por padrão.
NEXT_PUBLIC_ADSENSE_ID="${ADSENSE_PADRAO}"
NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP=""
NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM=""
NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER=""
NEXT_PUBLIC_ADSENSE_SLOT_CONTENT_BOTTOM=""
NEXT_PUBLIC_ADSENSE_ADTEST=""
NEXT_PUBLIC_ADSENSE_PLACEHOLDERS=""

# Google Analytics: desligado no dev (para não sujar as métricas de produção).
NEXT_PUBLIC_GA_ID=""
EOF
    )
  fi
  chmod 600 .env.local
}

carregar_env() {
  set -a
  # shellcheck disable=SC1091
  . ./.env
  # shellcheck disable=SC1091
  . ./.env.local
  set +a
  AAM_DEV_HOST="${AAM_DEV_HOST:-$AAM_DEV_HOST_PADRAO}"
  AAM_APP_PORT="${AAM_APP_PORT:-$AAM_APP_PORT_PADRAO}"
  AAM_EN_PORT="${AAM_EN_PORT:-$AAM_EN_PORT_PADRAO}"
  AAM_WS_PORT="${AAM_WS_PORT:-$AAM_WS_PORT_PADRAO}"
  # porta do banco sai do próprio DATABASE_URL
  AAM_DB_PORT="$(printf '%s' "$DATABASE_URL" | sed -E 's#.*@[^:/]+:([0-9]+)/.*#\1#')"
  [[ "$AAM_DB_PORT" =~ ^[0-9]+$ ]] || erro "não consegui ler a porta do banco no DATABASE_URL"
  case "$DATABASE_URL" in
    *@127.0.0.1:*|*@localhost:*) ;;
    *) erro "DATABASE_URL não aponta para 127.0.0.1 — este script só usa banco local" ;;
  esac
}

# ── banco ───────────────────────────────────────────────────────────────────

subir_banco() {
  if docker container inspect "$DB_CONTAINER" >/dev/null 2>&1; then
    if [ "$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER")" != "true" ]; then
      log "iniciando $DB_CONTAINER"
      docker start "$DB_CONTAINER" >/dev/null
    else
      log "$DB_CONTAINER já está de pé"
    fi
  else
    log "criando $DB_CONTAINER (volume $DB_VOLUME, 127.0.0.1:$AAM_DB_PORT)"
    local envfile senha
    senha="$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgresql://[^:]+:([^@]+)@.*#\1#')"
    envfile="$(umask 077; mktemp /tmp/aam-dev-db-env-XXXXXX)"
    trap 'rm -f "$envfile"' EXIT
    printf 'POSTGRES_USER=%s\nPOSTGRES_PASSWORD=%s\nPOSTGRES_DB=%s\n' "$DB_USER" "$senha" "$DB_NAME" > "$envfile"
    unset senha
    docker volume create "$DB_VOLUME" >/dev/null
    docker run -d --name "$DB_CONTAINER" \
      --restart unless-stopped \
      --env-file "$envfile" \
      -v "$DB_VOLUME":/var/lib/postgresql/data \
      -p "127.0.0.1:${AAM_DB_PORT}:5432" \
      --health-cmd "pg_isready -U $DB_USER -d $DB_NAME" \
      --health-interval 5s --health-timeout 5s --health-retries 20 \
      --label "projeto=acerteamosca" --label "ambiente=dev-homeserver" \
      "$DB_IMAGE" >/dev/null
    rm -f "$envfile"
    trap - EXIT
  fi
  log "esperando o Postgres responder"
  for _ in $(seq 1 60); do
    if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q 2>/dev/null; then
      return 0
    fi
    sleep 1
  done
  erro "o Postgres não respondeu em 60 s (docker logs $DB_CONTAINER)"
}

schema_banco() {
  # O repo não tem prisma/migrations: `migrate deploy` não aplica nada e o
  # schema vem de `db push` (o mesmo do docker-compose.yml). Se um dia houver
  # migrações, o `migrate deploy` passa a valer e o `db push` não é chamado.
  if [ -d prisma/migrations ] && ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
    log "prisma migrate deploy"
    npx --no-install prisma migrate deploy
  else
    log "prisma migrate deploy (sem migrações no repo: nada a aplicar)"
    npx --no-install prisma migrate deploy || true
    log "prisma db push (cria/atualiza o schema; recusa se houver perda de dados)"
    npx --no-install prisma db push --skip-generate
  fi
  log "prisma generate"
  npx --no-install prisma generate >/dev/null
  if [ -f prisma/seed.js ]; then
    log "seed (prisma/seed.js)"
    node prisma/seed.js
  else
    log "sem prisma/seed.js: nenhum seed a rodar"
  fi
}

# ── build ───────────────────────────────────────────────────────────────────

dependencias() {
  if [ ! -d node_modules ] || [ package-lock.json -nt node_modules/.package-lock.json ]; then
    log "npm ci"
    ( umask 022; npm ci )
  fi
}

build() {
  dependencias
  log "npm run build (prisma generate + next build, NODE_ENV=production)"
  ( umask 022; NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 npm run build )
}

# ── serviços (tmux) ─────────────────────────────────────────────────────────

porta_livre() {
  # espera até 10 s (logo depois de um kill-session a porta ainda pode estar presa)
  for _ in $(seq 1 10); do
    ss -ltn "( sport = :$2 )" 2>/dev/null | grep -q "$1:$2\|0.0.0.0:$2\|\*:$2\|\[::\]:$2" || return 0
    sleep 1
  done
  return 1
}

# Os comandos dentro do tmux recarregam o .env sozinhos e o tmux é chamado com
# ambiente limpo (tmuxl): a senha nunca entra na linha de comando nem no
# ambiente global do tmux.
CARREGA='set -a; . ./.env; . ./.env.local; set +a'

subir_ws() {
  if tmuxl has-session -t "$SESSAO_WS" 2>/dev/null; then log "$SESSAO_WS já existe"; return; fi
  porta_livre "$AAM_DEV_HOST" "$AAM_WS_PORT" || erro "porta $AAM_WS_PORT ocupada"
  log "subindo WebSocket em ws://$AAM_DEV_HOST:$AAM_WS_PORT (tmux $SESSAO_WS)"
  tmuxl new-session -d -s "$SESSAO_WS" -n ws -c "$RAIZ" \
    "bash -c '$CARREGA; while true; do NODE_ENV=production WS_HOST=\"\$AAM_DEV_HOST\" PORT=\"\$AAM_WS_PORT\" node server/ws-unified.js; echo \"[ws caiu (\$?) — reinicia em 5 s; Ctrl-C para parar]\"; sleep 5; done'"
}

PROXY_EN_JS='
import http from "node:http";
const UP = { host: process.env.AAM_DEV_HOST, port: Number(process.env.AAM_APP_PORT) };
const PORT = Number(process.env.AAM_EN_PORT);
const EN = "nailedthefly.com";
const AQUI = `http://${process.env.AAM_DEV_HOST}:${PORT}`;
http.createServer((req, res) => {
  const headers = { ...req.headers, host: EN, "x-forwarded-host": EN, "x-forwarded-proto": "https" };
  const up = http.request({ ...UP, path: req.url, method: req.method, headers }, (r) => {
    const h = { ...r.headers };
    if (h.location) h.location = h.location.replace(/^https?:\/\/nailedthefly\.com/, AQUI);
    res.writeHead(r.statusCode, h);
    r.pipe(res);
  });
  up.on("error", (e) => { res.writeHead(502); res.end("upstream: " + e.message); });
  req.pipe(up);
}).listen(PORT, process.env.AAM_DEV_HOST, () => console.log(`proxy EN em ${AQUI} -> ${UP.host}:${UP.port} (Host: ${EN})`));
'

subir_app() {
  if tmuxl has-session -t "$SESSAO_APP" 2>/dev/null; then log "$SESSAO_APP já existe"; return; fi
  [ -f .next/BUILD_ID ] || erro "não há build (.next/BUILD_ID). Rode: $0 build"
  porta_livre "$AAM_DEV_HOST" "$AAM_APP_PORT" || erro "porta $AAM_APP_PORT ocupada"
  porta_livre "$AAM_DEV_HOST" "$AAM_EN_PORT" || erro "porta $AAM_EN_PORT ocupada"
  log "subindo app em http://$AAM_DEV_HOST:$AAM_APP_PORT (tmux $SESSAO_APP, janela app)"
  tmuxl new-session -d -s "$SESSAO_APP" -n app -c "$RAIZ" \
    "bash -c '$CARREGA; while true; do NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next start -H \"\$AAM_DEV_HOST\" -p \"\$AAM_APP_PORT\"; echo \"[app caiu (\$?) — reinicia em 5 s; Ctrl-C para parar]\"; sleep 5; done'"
  local proxy
  # Fora do /tmp: o Debian limpa o /tmp e o laço de reinício perderia o arquivo.
  proxy="$PROXY_DIR/proxy-en.mjs"
  ( umask 077; mkdir -p "$PROXY_DIR"; printf '%s' "$PROXY_EN_JS" > "$proxy" )
  log "subindo proxy EN em http://$AAM_DEV_HOST:$AAM_EN_PORT (janela proxy-en)"
  tmuxl new-window -t "$SESSAO_APP" -n proxy-en -c "$RAIZ" \
    "bash -c '$CARREGA; while true; do node \"$proxy\"; echo \"[proxy caiu — reinicia em 5 s]\"; sleep 5; done'"
}

esperar_http() {
  local url="$1"
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null --max-time 5 "$url" 2>/dev/null && return 0
    sleep 1
  done
  return 1
}

derrubar() {
  for s in "$SESSAO_APP" "$SESSAO_WS"; do
    if tmuxl has-session -t "$s" 2>/dev/null; then log "derrubando tmux $s"; tmuxl kill-session -t "$s"; fi
  done
  rm -f "$PROXY_DIR/proxy-en.mjs"
  if [ "${1:-}" = "--db" ]; then
    log "parando $DB_CONTAINER (o volume $DB_VOLUME fica)"
    docker stop "$DB_CONTAINER" >/dev/null 2>&1 || true
  fi
}

status() {
  echo "banco : $(docker inspect -f '{{.State.Status}} ({{if .State.Health}}{{.State.Health.Status}}{{end}}) restart={{.HostConfig.RestartPolicy.Name}}' "$DB_CONTAINER" 2>/dev/null || echo 'não existe')"
  for s in "$SESSAO_WS" "$SESSAO_APP"; do
    echo "tmux  : $s $(tmuxl has-session -t "$s" 2>/dev/null && echo '(de pé)' || echo '(fora)')"
  done
  if [ -f .env ] && [ -f .env.local ]; then
    carregar_env
    printf 'app   : http://%s:%s  -> %s\n' "$AAM_DEV_HOST" "$AAM_APP_PORT" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://$AAM_DEV_HOST:$AAM_APP_PORT/" || true)"
    printf 'EN    : http://%s:%s  -> %s\n' "$AAM_DEV_HOST" "$AAM_EN_PORT" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://$AAM_DEV_HOST:$AAM_EN_PORT/" || true)"
    printf 'ws    : ws://%s:%s    -> %s\n' "$AAM_DEV_HOST" "$AAM_WS_PORT" "$(curl -s --max-time 5 "http://$AAM_DEV_HOST:$AAM_WS_PORT/" || echo 'sem resposta')"
  fi
}

case "${1:-}" in
  up)
    case "${2:-}" in ""|--no-build) ;; *) erro "opção desconhecida: ${2} (use --no-build)" ;; esac
    garantir_env; carregar_env
    subir_banco
    dependencias
    schema_banco
    [ "${2:-}" = "--no-build" ] && [ -f .next/BUILD_ID ] || build
    subir_ws
    subir_app
    esperar_http "http://$AAM_DEV_HOST:$AAM_APP_PORT/" || erro "o app não respondeu (scripts/dev-homeserver.sh logs app)"
    status
    ;;
  build)
    garantir_env; carregar_env; build ;;
  restart)
    garantir_env; carregar_env; derrubar; subir_banco; subir_ws; subir_app
    esperar_http "http://$AAM_DEV_HOST:$AAM_APP_PORT/" || erro "o app não respondeu"
    status ;;
  down)
    derrubar "${2:-}" ;;
  status)
    status ;;
  logs)
    case "${2:-app}" in
      ws) tmuxl capture-pane -p -S -200 -t "$SESSAO_WS:ws" ;;
      proxy-en) tmuxl capture-pane -p -S -200 -t "$SESSAO_APP:proxy-en" ;;
      *) tmuxl capture-pane -p -S -200 -t "$SESSAO_APP:app" ;;
    esac ;;
  *)
    sed -n '2,32p' "$0"; exit 1 ;;
esac
