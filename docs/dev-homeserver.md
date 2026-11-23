# Ambiente de desenvolvimento no homeserver

O projeto vive no homeserver em `~/projects/acerteamosca`. O ambiente reproduz a
produção do Railway e pode ficar acessível numa rede privada (VPN) do servidor.

Host e portas **não ficam no repositório**: vêm do ambiente na primeira execução
e ficam gravados no `.env.local` (ignorado pelo git). Os padrões são neutros:

| Variável | Padrão | Para quê |
|---|---|---|
| `AAM_DEV_HOST` | `127.0.0.1` | Interface onde app, proxy EN e WebSocket escutam (ex.: o IP da VPN do servidor) |
| `AAM_APP_PORT` | `3000` | App (`next start`) |
| `AAM_EN_PORT` | `3001` | Proxy da versão EN |
| `AAM_WS_PORT` | `3002` | WebSocket dos jogos multiplayer |
| `AAM_DB_PORT` | `5433` | Postgres (sempre só em `127.0.0.1`) |

```bash
# 1ª vez, escolhendo host e portas (depois o .env.local manda):
AAM_DEV_HOST=<ip-da-vpn> AAM_APP_PORT=<porta> AAM_EN_PORT=<porta> AAM_WS_PORT=<porta> \
  scripts/dev-homeserver.sh up
```

Para trocar depois, edite o `.env.local` (inclusive as `NEXT_PUBLIC_WS_*`) e rode
`build` e `restart`, ou apague o `.env.local` e rode `up` de novo com as variáveis.

## Como a produção sobe (e o que o dev copia)

| Produção (Railway) | Dev (homeserver) |
|---|---|
| Serviço **web**: imagem do `Dockerfile` da raiz (o painel do Railway sobrepõe o `railway.toml`). `npm ci` → `npm run build` (`prisma generate && next build`) → `next start -H 0.0.0.0 -p $PORT`. Node 20. | `npm ci` → `npm run build` com `NODE_ENV=production` → `next start -H $AAM_DEV_HOST -p $AAM_APP_PORT`. Node local (22). |
| Serviço **ws-server**: `node server/ws-unified.js` (`Procfile`), porta em `$PORT`, publicado em `wss://ws.acerteamosca.com.br`. | `node server/ws-unified.js` com `WS_HOST=$AAM_DEV_HOST PORT=$AAM_WS_PORT` (sem `WS_HOST`, escuta em todas as interfaces, como no Railway). |
| Postgres do Railway em `DATABASE_URL`. | Postgres 16 em container persistente `aam-dev-db` (volume `aam-dev-pgdata`, só em `127.0.0.1:$AAM_DB_PORT`, `restart unless-stopped`). |
| Schema: o repo **não tem `prisma/migrations`**. | `prisma migrate deploy` (nada a aplicar) + `prisma db push` + `prisma generate`. Não há `prisma/seed.js`, então não há seed. |

## Serviços, portas e sessões

| O quê | Onde | Sessão tmux |
|---|---|---|
| App (PT na raiz, EN em `/en`) | `http://$AAM_DEV_HOST:$AAM_APP_PORT` | `aam-preview`, janela `app` |
| Versão EN como no nailedthefly.com | `http://$AAM_DEV_HOST:$AAM_EN_PORT` (proxy que manda `Host: nailedthefly.com` para o app) | `aam-preview`, janela `proxy-en` |
| WebSocket dos jogos multiplayer | `ws://$AAM_DEV_HOST:$AAM_WS_PORT` (`/pong`, `/ships`, `/memory`, `/2048`, `/batalha-naval`) | `aam-ws` |
| Postgres | `127.0.0.1:$AAM_DB_PORT` (só local) | container `aam-dev-db` |

App, proxy e WebSocket rodam num laço: se o processo cair, ele volta em 5 s. Para parar de verdade, use `down`. O proxy EN fica em `~/.cache/acerteamosca-dev/proxy-en.mjs` (fora do `/tmp`, que o Debian limpa).

O script chama o tmux com ambiente limpo (`env -i`). Assim, `DATABASE_URL` e `NEXT_PUBLIC_*` não entram no ambiente global do tmux, nem quando é ele quem cria o servidor tmux (depois de um reboot). Sem isso, painéis de outros projetos herdariam o banco do acerteamosca.

Na porta do app, os links internos a partir de `/en` voltam para o PT. Isso é o certo em produção, porque cada idioma tem o seu domínio (`domains` do next-intl). Para navegar em inglês, use a porta do proxy EN. Canonical, hreflang e o seletor PT/EN apontam para os domínios de produção, de propósito.

## Comandos

```bash
cd ~/projects/acerteamosca
scripts/dev-homeserver.sh up              # 1ª vez: gera segredos, cria o banco, schema, build, sobe ws e app
scripts/dev-homeserver.sh up --no-build   # sobe com o .next que já existe
scripts/dev-homeserver.sh build           # refaz o build (depois: restart)
scripts/dev-homeserver.sh restart         # derruba ws e app e sobe de novo
scripts/dev-homeserver.sh status
scripts/dev-homeserver.sh logs app        # ou ws, proxy-en
scripts/dev-homeserver.sh down            # derruba ws e app; o banco continua
scripts/dev-homeserver.sh down --db       # também para o banco (o volume fica)
```

Depois de um reboot, o banco volta sozinho (`unless-stopped`), mas as sessões tmux não. Rode `scripts/dev-homeserver.sh up --no-build`.

Mudou código? Rode `scripts/dev-homeserver.sh build && scripts/dev-homeserver.sh restart`. Os `NEXT_PUBLIC_*` entram no bundle no build, então trocar porta ou URL do WebSocket também exige build.

Para apagar os dados do banco de dev: `scripts/dev-homeserver.sh down --db && docker rm aam-dev-db && docker volume rm aam-dev-pgdata`. O próximo `up` recria tudo com a mesma senha do `.env`.

## Segredos e variáveis

- `.env` (modo 600, ignorado pelo git): `DATABASE_URL` do banco **local**. A senha é gerada no primeiro `up` com `openssl rand -hex 24` e nunca é impressa. Para criar o container, ela passa por um arquivo temporário do `mktemp` (modo 600), apagado logo depois, mesmo se o `docker run` falhar. **Ela continua visível no `docker inspect aam-dev-db`** (Config.Env), como em qualquer container Postgres com `POSTGRES_PASSWORD`. Quem lê isso é quem está no grupo docker, que na prática já é root na máquina. É um banco só de dev, sem dado real. O script se recusa a rodar se o `DATABASE_URL` não apontar para `127.0.0.1`.
- `.env.local` (modo 600, ignorado pelo git): portas (`AAM_DEV_HOST`, `AAM_APP_PORT`, `AAM_EN_PORT`, `AAM_WS_PORT`), as URLs `NEXT_PUBLIC_WS_*` (`ws://$AAM_DEV_HOST:$AAM_WS_PORT/...`) e o `NEXT_PUBLIC_ADSENSE_ID` público (o mesmo do `ads.txt`).
- Ficam **vazias de propósito** no dev:
  - `NEXT_PUBLIC_GA_ID`, para não misturar com as métricas de produção;
  - `NEXT_PUBLIC_ADSENSE_SLOT_HOME_TOP`, `NEXT_PUBLIC_ADSENSE_SLOT_HOME_BOTTOM` e `NEXT_PUBLIC_ADSENSE_SLOT_GAME_FOOTER`, que só existem quando houver blocos criados no AdSense.
- O projeto não usa NextAuth nem outra integração com segredo de servidor. Só o `DATABASE_URL` é segredo.
- Nunca use banco ou credencial de produção aqui.

## Por que a CSP muda no dev

O navegador da prévia conecta em `ws://$AAM_DEV_HOST:$AAM_WS_PORT`, sem TLS. O `connect-src` da produção só libera `wss:`. Por isso o `next.config.js` acrescenta as origens `ws://` que estiverem nos `NEXT_PUBLIC_WS_*`. Em produção eles são `wss://`, então a CSP de lá fica idêntica. O teste `tests/dev-homeserver.test.mjs` garante isso.

## Arquivos de trabalho que não vão para o git

Vieram da cópia do WSL e ficam fora do controle de versão:

- `docs/kungfu-castle-*.md` e `docs/2026-03-30-kungfu-castle-bosses.md`;
- os planos e specs do Kung Fu Castle em `docs/superpowers/`;
- `scripts/aguardar-deploy.sh` e `scripts/conferir-producao.sh`.
