# Deploy — Railway + Cloudflare

Guia para configurar o serviço WebSocket (salas de jogos multiplayer) no Railway
com domínio custom `ws.acerteamosca.com.br` via Cloudflare.

---

## 1. Railway — Serviço WS

### 1.1 Criar o serviço

1. No dashboard do Railway, abra seu projeto (onde já roda o Next.js)
2. Clique **"+ New"** → **"Service"** → **"GitHub Repo"**
3. Selecione o mesmo repositório `acerteamosca`
4. Renomeie o serviço para **`ws-server`** (clique no nome para editar)

### 1.2 Configurar o start command

No serviço `ws-server`:

1. Vá em **Settings** → **Deploy** → **Start Command**
2. Defina:
   ```
   node server/ws-unified.js
   ```

> O `railway.toml` na raiz do repo já define isso, mas se o Railway usar o
> mesmo toml para ambos os serviços, configure manualmente no painel.

### 1.3 Gerar domínio público

1. No serviço `ws-server`, vá em **Settings** → **Networking**
2. Clique **"Generate Domain"**
3. O Railway vai gerar uma URL tipo:
   ```
   ws-server-production-abc123.up.railway.app
   ```
4. **Anote essa URL** — ela será usada no CNAME do Cloudflare

### 1.4 Adicionar domínio custom

Ainda em **Settings** → **Networking** → **Custom Domain**:

1. Clique **"+ Custom Domain"**
2. Digite: `ws.acerteamosca.com.br`
3. O Railway vai exibir o **CNAME target** (geralmente é a mesma URL `.up.railway.app`)
4. **Anote o CNAME target** para configurar no Cloudflare

---

## 2. Cloudflare — DNS

### 2.1 Adicionar registro CNAME

1. Abra o dashboard do Cloudflare → selecione o domínio `acerteamosca.com.br`
2. Vá em **DNS** → **Records** → **Add Record**
3. Configure:

   | Campo   | Valor                                             |
   |---------|---------------------------------------------------|
   | Type    | `CNAME`                                           |
   | Name    | `ws`                                              |
   | Target  | `ws-server-production-abc123.up.railway.app`      |
   | Proxy   | **DNS only (nuvem cinza)** ⚠️                     |
   | TTL     | Auto                                              |

> **IMPORTANTE:** O proxy (nuvem laranja) do Cloudflare suporta WebSocket,
> mas pode adicionar latência e causar timeouts em conexões longas.
> Para jogos multiplayer em tempo real, recomenda-se **DNS only (nuvem cinza)**
> para que o tráfego vá direto ao Railway.
>
> Se quiser usar o proxy Cloudflare (proteção DDoS, analytics), veja a seção 2.2.

### 2.2 (Opcional) Usar com Cloudflare Proxy (nuvem laranja)

Se preferir manter o proxy do Cloudflare ativo para proteção:

1. Mantenha a nuvem **laranja** no registro CNAME
2. Vá em **SSL/TLS** → garanta que o modo está em **Full (strict)**
3. Vá em **Network** → ative **WebSockets** (já vem ativo por padrão nos planos Free+)
4. Vá em **Rules** → **Page Rules** ou **Configuration Rules**:
   - Crie uma regra para `ws.acerteamosca.com.br/*`
   - Desative **Rocket Loader**, **Minify**, **Auto Minify** (não se aplicam a WS,
     mas evita interferência)

> **Nota:** No plano Free do Cloudflare, conexões WebSocket têm timeout de
> ~100 segundos de inatividade. Se seus jogos enviarem heartbeats regulares
> (a cada ~30s), não haverá problema.

### 2.3 Verificar SSL

1. No Cloudflare → **SSL/TLS** → modo **Full** ou **Full (strict)**
2. O Railway já fornece certificado SSL automático para domínios custom
3. Após apontar o CNAME, aguarde alguns minutos para o certificado ser emitido

---

## 3. Railway — Variáveis no Next.js

No serviço **Next.js** (não no ws-server), adicione estas variáveis de ambiente:

```
NEXT_PUBLIC_WS_URL=wss://ws.acerteamosca.com.br/pong
NEXT_PUBLIC_WS_SHIPS_URL=wss://ws.acerteamosca.com.br/ships
NEXT_PUBLIC_WS_MEMORY_URL=wss://ws.acerteamosca.com.br/memory
NEXT_PUBLIC_WS_2048_URL=wss://ws.acerteamosca.com.br/2048
```

> ⚠️ Variáveis `NEXT_PUBLIC_*` são embutidas no build do Next.js.
> Após adicioná-las, faça um **Redeploy** do serviço Next.js.

---

## 4. Verificar

### 4.1 Healthcheck do WS server

```bash
curl https://ws.acerteamosca.com.br/
# Deve retornar: "Acerte a Mosca unified WS server"
```

### 4.2 Testar conexão WebSocket

```bash
# Instalar wscat se necessário: npm i -g wscat
wscat -c wss://ws.acerteamosca.com.br/pong
# Deve conectar sem erro. Envie: {"t":"create"}
# Deve receber: {"t":"created","id":"XXXXXX"}
```

### 4.3 Testar no navegador

1. Abra o site em produção
2. Entre em qualquer jogo multiplayer (Pong, Ships, Memory, 2048)
3. Clique em "Online" → "Criar Sala"
4. Deve gerar um código de sala sem erros no console

---

## Resumo da Arquitetura

```
Navegador
   │
   ├── HTTPS ──→ acerteamosca.com.br ──→ Railway (Next.js)
   │
   └── WSS ───→ ws.acerteamosca.com.br ──→ Railway (ws-unified.js)
                    │
                    ├── /pong    → Pong rooms
                    ├── /ships   → Ships rooms
                    ├── /memory  → Memory rooms
                    └── /2048    → 2048 rooms
```
