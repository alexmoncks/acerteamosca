// Os 14 jogos usam o encaixe comum na altura visível (src/hooks/useGameFit.js
// + src/components/GameFit.jsx), e o anúncio do rodapé fica fora dele.
//
// Antes (fae3a89) cada jogo escalava só pela largura (useGameScale) e a raiz
// tinha minHeight: 100vh com a Navbar fixa por cima: num monitor de 768px o
// fim do jogo ficava abaixo da dobra. A medição real está em
// tests/e2e/altura.e2e.mjs.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, repoPath } from "./helpers.mjs";

const JOGOS = "src/app/[locale]/jogos";
const slugs = fs
  .readdirSync(repoPath(JOGOS))
  .filter((s) => fs.existsSync(repoPath(path.join(JOGOS, s, "page.js"))))
  .sort();

const semComentarios = (src) =>
  src.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Componente de jogo de cada página, pelo import do GameClient.jsx. */
function componenteDe(slug) {
  const gc = source(path.join(JOGOS, slug, "GameClient.jsx"));
  const m = gc.match(/import\(\s*["']@\/components\/games\/(\w+)["']\s*\)/);
  assert.ok(m, `${slug}: GameClient sem import dinâmico de src/components/games`);
  return `src/components/games/${m[1]}.jsx`;
}

check("são os 14 jogos do pedido", () => {
  assert.deepEqual(slugs, [
    "2048", "3invader", "acerteamosca", "batalha-naval", "brickbreaker", "bubbleshooter", "deepattack",
    "jacare", "kungfucastle", "memory", "pong", "ships", "tiroaoalvo", "wordle",
  ]);
});

check("todo jogo usa useGameFit + <GameFit fit={fit}> e a raiz .game-fit-root", () => {
  const faltando = [];
  for (const slug of slugs) {
    const arq = componenteDe(slug);
    const src = semComentarios(source(arq));
    if (!/import useGameFit from "@\/hooks\/useGameFit"/.test(src)) faltando.push(`${slug}: sem useGameFit`);
    if (!/import GameFit from "@\/components\/GameFit"/.test(src)) faltando.push(`${slug}: sem GameFit`);
    if (!/const fit = useGameFit\(\{/.test(src)) faltando.push(`${slug}: sem const fit = useGameFit({...})`);
    if (!/<GameFit fit=\{fit\}/.test(src) && slug !== "kungfucastle") faltando.push(`${slug}: sem <GameFit fit={fit}>`);
    if (!/className="game-fit-root"/.test(src)) faltando.push(`${slug}: raiz sem game-fit-root`);
  }
  // Kung Fu Castle: o jogo (CW × CH) e a abertura (LARGURA × ALTURA) têm cada um o seu.
  const kf = semComentarios(source("src/components/games/KungFuCastle.jsx"));
  if (!/<GameFit fit=\{fit\}>\s*<div ref=\{containerRef\}/.test(kf)) faltando.push("kungfucastle: canvas fora do GameFit");
  const hist = semComentarios(source("src/components/games/KungFuHistoria.jsx"));
  if (!/useGameFit\(\{ largura: LARGURA, altura: ALTURA/.test(hist) || !/<GameFit fit=\{fit\}>/.test(hist)) faltando.push("abertura do Kung Fu sem encaixe");
  assert.deepEqual(faltando, []);
});

check("nenhum jogo volta a escalar só pela largura nem a fixar 100vh na raiz", () => {
  assert.ok(!fs.existsSync(repoPath("src/hooks/useGameScale.js")), "useGameScale voltou");
  const ruins = [];
  for (const slug of slugs) {
    const src = semComentarios(source(componenteDe(slug)));
    if (/useGameScale/.test(src)) ruins.push(`${slug}: useGameScale`);
    if (/(minHeight|height):\s*["'](calc\()?100vh/.test(src)) ruins.push(`${slug}: 100vh na raiz`);
    if (/maxHeight\s*[:=]\s*["']calc\(100vh/.test(src)) ruins.push(`${slug}: maxHeight 100vh`);
    if (/window\.innerHeight\s*-\s*48/.test(src)) ruins.push(`${slug}: cálculo próprio de altura`);
  }
  assert.deepEqual(ruins, []);
});

check("coordenadas: nada de offsetX/offsetY nem divisão por gameScale nos jogos", () => {
  const ruins = [];
  for (const slug of slugs) {
    const src = semComentarios(source(componenteDe(slug)));
    if (/\.(offsetX|offsetY)\b/.test(src)) ruins.push(`${slug}: offsetX/offsetY`);
    if (/\/\s*gameScale\b/.test(src)) ruins.push(`${slug}: / gameScale`);
    if (/client[XY][^;\n]*\/\s*(scale|zoom)\b/i.test(src)) ruins.push(`${slug}: clientX/Y dividido por escala`);
  }
  assert.deepEqual(ruins, []);
});

check("coordenadas: quem lê o ponteiro converte pela razão do retângulo (game-fit.js)", () => {
  const usa = {
    "src/components/games/AcerteAMosca.jsx": /clienteParaLogico\(clientX, clientY, rect, CANVAS_W, CANVAS_H\)/,
    "src/components/games/BrickBreaker.jsx": /clienteParaLogico\(clientX, 0, rect, CW, CH\)/,
    "src/components/games/ThreeInvader.jsx": /deltaClienteParaLogico\(t\.clientX - ref\.lastClientX, t\.clientY - ref\.lastClientY, rect, CW, CH\)/,
  };
  for (const [arq, re] of Object.entries(usa)) assert.match(source(arq), re, arq);
  assert.match(source("src/components/games/BrickBreaker.jsx"), /deltaClienteParaLogico\(touch\.clientX - t\.startX, 0, canvas\.getBoundingClientRect\(\), CW, CH\)/);
});

check("Kung Fu Castle: canvas do PixiJS com buffer × dpr e tamanho CSS pela área (sem object-fit)", () => {
  for (const arq of ["src/components/games/KungFuCastle.jsx", "src/components/games/KungFuHistoria.jsx"]) {
    const src = semComentarios(source(arq));
    assert.match(src, /resolution: dpr/, arq);
    assert.match(src, /autoDensity: true/, arq);
    assert.match(src, /bufferDoCanvas\(/, arq);
    assert.ok(!/objectFit/.test(src), `${arq}: object-fit desalinharia o canvas da área`);
  }
  // Os controles de toque continuam fixos no rodapé da tela.
  assert.match(source("src/components/games/KungFuCastle.jsx"), /position: "fixed", left: 0, right: 0, bottom: 16/);
});

check("Tiro ao Alvo: botão de som fixo abaixo da Navbar (não atrás dela)", () => {
  const src = semComentarios(source("src/components/games/TiroAoAlvo.jsx"));
  const m = src.match(/onClick=\{toggleMute\}[\s\S]*?style=\{\{([\s\S]*?)\}\}/);
  assert.ok(m, "botão de som não encontrado");
  assert.match(m[1], /position: "fixed"/);
  assert.match(m[1], /top: "calc\(var\(--aam-topo, 48px\) \+ 8px/);
  assert.ok(!/top:\s*10\b/.test(m[1]), "top: 10 põe o botão atrás da Navbar");
});

check("Batalha Naval: altura automática e célula em unidades lógicas (sem laço com a escala)", () => {
  const src = semComentarios(source("src/components/games/BatalhaNaval.jsx"));
  assert.match(src, /useGameFit\(\{ largura: GAME_W, altura: 600, alturaAutomatica: true \}\)/);
  assert.match(src, /const maxGrid = Math\.min\(GAME_W - 40, 360\);/);
  assert.ok(!/GAME_W \* gameScale/.test(src));
});

check("useGameFit escuta resize, orientationchange, visualViewport e ResizeObserver", () => {
  const src = source("src/hooks/useGameFit.js");
  assert.match(src, /new ResizeObserver\(/);
  for (const ev of ["resize", "orientationchange"]) assert.match(src, new RegExp(`window\\.addEventListener\\("${ev}"`));
  assert.match(src, /visualViewport\?\.addEventListener\("resize"/);
  assert.match(src, /removeEventListener\("orientationchange"/);
  assert.match(src, /escalaDeEncaixe\(/);
  assert.match(src, /alturaUtilDoSlot\(/);
  assert.match(src, /scale: vv\.scale/);
});

check("useGameFit: fonts.ready não agenda depois do unmount (flag alive)", () => {
  const src = source("src/hooks/useGameFit.js");
  assert.match(src, /let alive = true/);
  assert.match(src, /document\.fonts\?\.ready\?\.then\(\(\) => \{\s*if \(alive\) agendar\(\);?\s*\}\)/);
  assert.match(src, /return \(\) => \{\s*alive = false;/);
});

check("useGameFit: desinstalarVhSemDvh remove os listeners do fallback sem dvh", () => {
  const src = source("src/hooks/useGameFit.js");
  assert.match(src, /export function desinstalarVhSemDvh/);
  assert.match(src, /removeEventListener\("resize", aplicar\)/);
  assert.match(src, /removeEventListener\("orientationchange", aplicar\)/);
  assert.match(src, /visualViewport\?\.removeEventListener\("resize", aplicar\)/);
  assert.match(src, /style\.removeProperty\("--aam-vh"\)/);
  // não é chamado no unmount do hook: o fallback é da página, não do jogo
  const unmount = src.split("return () => {")[1];
  assert.ok(unmount && !/desinstalarVhSemDvh\(/.test(unmount.split("}, [")[0]), "desinstalação no unmount do hook");
});

check("GameFit expõe a área ([data-game-area], data-game-scale) com o tamanho escalado", () => {
  const src = source("src/components/GameFit.jsx");
  assert.match(src, /data-game-area=""/);
  assert.match(src, /data-game-scale=\{escala\}/);
  assert.match(src, /width: largura \* escala, height: altura \* escala/);
  assert.match(src, /className="game-fit-slot"/);
});

check("anúncio: AdBanner fica no page.js, depois do GameInfo, fora do contêiner de encaixe", () => {
  for (const slug of slugs) {
    const page = semComentarios(source(path.join(JOGOS, slug, "page.js")));
    const iJogo = page.indexOf("<GameClient");
    const iInfo = page.indexOf("<GameInfo");
    assert.ok(iJogo >= 0 && iInfo > iJogo, `${slug}: GameInfo antes do jogo`);
    if (slug !== "kungfucastle") {
      const iAd = page.indexOf('<AdBanner placement="game_footer"');
      assert.ok(iAd > iInfo, `${slug}: AdBanner antes do GameInfo`);
    }
    // O componente do jogo (onde mora a .game-fit-root) não traz anúncio.
    const comp = source(componenteDe(slug));
    assert.ok(!/AdBanner|adsbygoogle/.test(comp), `${slug}: anúncio dentro do jogo`);
  }
  for (const arq of ["src/components/GameFit.jsx", "src/hooks/useGameFit.js", "src/lib/game-fit.js"]) {
    assert.ok(!/AdBanner|adsbygoogle|ad-slot/.test(semComentarios(source(arq))), `${arq} depende do anúncio`);
  }
});
