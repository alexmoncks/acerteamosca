// O deploy.
//
// Estes testes existem por causa de oito dias de site parado. O build passava,
// o container subia, e o deploy era marcado como falho — porque o app escutava
// numa porta fixa e a plataforma perguntava por outra. Nenhum erro de
// compilação em lugar nenhum, e nada no código do jogo para investigar.
//
// Falha de entrega não aparece em teste de jogo. Aparece aqui.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath } from "./helpers.mjs";

const DOCKERFILE = source("Dockerfile");
const TOML = source("railway.toml");

check("the container listens on the port the platform asks for", () => {
  // Railway, Fly e Cloud Run injetam $PORT e fazem o healthcheck NELA. Porta
  // fixa no CMD = deploy que falha sem erro nenhum no log de build.
  const cmd = DOCKERFILE.match(/^CMD .*/m)?.[0];
  assert.ok(cmd, "Dockerfile sem CMD");
  assert.match(cmd, /\$\{?PORT/, "o CMD ignora $PORT");
  assert.ok(!/-p\s+\d+/.test(cmd), `o CMD fixa uma porta: ${cmd}`);
  // Variável só expande em shell form; a exec form passaria "${PORT}" literal.
  assert.match(cmd, /^CMD \["sh", "-c"/, "expandir variável exige shell form");
});

check("the local default survives when nothing injects PORT", () => {
  // Sem plataforma nenhuma (docker run na máquina de alguém) tem de subir na
  // 3000, senão o Dockerfile deixa de servir ao que foi escrito: teste local.
  assert.match(DOCKERFILE, /\$\{PORT:-3000\}/);
});

check("the builder is pinned, so a stray Dockerfile cannot hijack the ws-server", () => {
  // ATENÇÃO ao que este teste protege: NÃO é o build do site. O log de 21/08
  // provou que o serviço web é DOCKERFILE, fixado no painel, que sobrepõe o
  // railway.toml. Esta linha protege os OUTROS serviços do mesmo repositório —
  // o ws-server dos jogos multiplayer. Sem ela, o Dockerfile da raiz ganharia
  // do Nixpacks para eles também.
  assert.match(TOML, /builder\s*=\s*"NIXPACKS"/);
});

check("the project binaries are on PATH in the runner", () => {
  // O CMD da imagem só vale quando o serviço não tem Start Command próprio, e
  // um comando de painel escrito da forma óbvia (`next start`) morre com
  // `sh: next: not found`, exit 127 — medido. O container morre no primeiro
  // segundo, o deploy é marcado como falho e a plataforma mantém o build
  // ANTERIOR no ar, servindo 200 com código velho. Com node_modules/.bin no
  // PATH, qualquer grafia do comando resolve.
  const runner = DOCKERFILE.slice(DOCKERFILE.indexOf("AS runner"));
  assert.match(runner, /ENV PATH=\/app\/node_modules\/\.bin:\$PATH/,
    "o runner não põe os binários do projeto no PATH");
});

check("the start command does not fall back to the network", () => {
  // `npx` BAIXA o pacote quando não acha local. Numa imagem com node_modules
  // quebrado isso vira um download silencioso — e uma versão do Next diferente
  // da que compilou o .next — em vez de um erro que se vê no log.
  const cmd = DOCKERFILE.match(/^CMD .*/m)?.[0];
  assert.ok(!/npx/.test(cmd), `o CMD usa npx e pode baixar da rede: ${cmd}`);
});

check("railway.toml declares no start command", () => {
  // O ws-server dos jogos multiplayer sai do MESMO repositório, com start
  // próprio. Um startCommand aqui valeria para os dois serviços e derrubaria o
  // WebSocket.
  // A CHAVE, não a palavra: o comentário do próprio arquivo explica por que ela
  // não está lá, e a primeira versão deste teste se pegou nessa explicação.
  const chaves = TOML.split("\n").filter((l) => !l.trim().startsWith("#"));
  assert.ok(!chaves.some((l) => /^\s*startCommand\s*=/.test(l)),
    "startCommand na raiz derruba o ws-server");
});

check("the build never needs a real database", () => {
  // `npm run build` roda `prisma generate`, que só lê o schema. Se algum passo
  // passar a exigir conexão, o build quebra na plataforma e passa na máquina de
  // quem tem .env — a pior combinação para descobrir.
  const pkg = JSON.parse(fs.readFileSync(repoPath("package.json"), "utf8"));
  assert.match(pkg.scripts.build, /prisma generate/);
  assert.match(DOCKERFILE, /DATABASE_URL="postgresql:\/\/placeholder/);
});
