// A apresentação da história.
//
// Cinco painéis antes da fase 1, sobre a faixa de abertura. O risco aqui não é
// o desenho — é o painel apontar para arte que não existe, ou para uma chave de
// tradução que só uma das línguas tem, e a abertura inteira do jogo virar um
// retângulo vazio com um texto cru na tela.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, loadModule, repoPath } from "./helpers.mjs";

const {
  PAINEIS, LARGURA, ALTURA, FADE, VELOCIDADE_TEXTO, TRILHA_ABERTURA,
  duracaoTotal, painelEm, opacidadeEm, letrasEm, assetsDaHistoria, chavesDaHistoria,
  espelhamentoDe, OLHA_NATIVO,
} = await loadModule("src/components/games/kungfu-historia.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const BGM = source("src/components/games/kungfu-bgm.js");
const TELA = source("src/components/games/KungFuHistoria.jsx");

const IMG = repoPath(path.join("public", "images", "kungfucastle"));
const msgs = (lang) =>
  JSON.parse(fs.readFileSync(repoPath(`src/messages/${lang}.json`), "utf8"))
    .games.kungfucastle;

/** Resolve "prop:x" / "player:x" / "boss:x" para o PNG que ele exige. */
function arquivoDe(asset) {
  const [tipo, nome] = asset.split(":");
  if (tipo === "prop") return path.join(IMG, "props", `${nome}.png`);
  if (tipo === "player") return path.join(IMG, "player", `${nome}.png`);
  if (tipo === "boss") return path.join(IMG, "bosses", nome, "idle.png");
  return null;
}

// ── os painéis contra a arte ───────────────────────────────────────────────

check("every asset a panel names exists on disk", () => {
  // É o teste que justifica o módulo: um nome errado aqui não quebra build
  // nenhum, só deixa a abertura do jogo com um buraco por cinco segundos.
  const faltando = assetsDaHistoria().filter((a) => {
    const f = arquivoDe(a);
    return !f || !fs.existsSync(f);
  });
  assert.deepEqual(faltando, [], `assets citados e ausentes: ${faltando}`);
});

check("only art the game already ships is used", () => {
  // Arte própria de cutscene mostraria personagens que o jogador não vai
  // reencontrar — o oposto do que a abertura serve para fazer.
  for (const a of assetsDaHistoria()) {
    assert.match(a, /^(prop|player|boss):[a-z0-9-]+$/, `asset fora do padrão: ${a}`);
  }
});

check("every figure lands inside the frame", () => {
  for (const p of PAINEIS) {
    for (const f of [...(p.fundo ?? []), ...(p.figuras ?? [])]) {
      assert.ok(f.x >= -60 && f.x <= LARGURA + 60,
        `${p.id}: ${f.asset} em x=${f.x}, fora dos ${LARGURA}px`);
      assert.ok(f.y >= -40 && f.y <= ALTURA,
        `${p.id}: ${f.asset} em y=${f.y}, fora dos ${ALTURA}px`);
      assert.ok(f.escala > 0 && f.escala <= 4, `${p.id}: escala ${f.escala} absurda`);
    }
  }
});

check("all five bosses show up in the line-up, in floor order", () => {
  // O painel que diz "isto é o que te espera". Faltando um, o jogador conhece
  // quatro dos cinco e o quinto vira surpresa gratuita.
  const fila = PAINEIS.find((p) => p.id === "mestres");
  assert.ok(fila, "o painel dos mestres sumiu");
  const chefes = fila.figuras.map((f) => f.asset.replace("boss:", ""));
  assert.deepEqual(chefes, [
    "mestre-capangas", "guardiao-portao", "senhor-sombras", "general-oni", "senhor-castelo",
  ], "a fila não bate com a ordem dos andares");
  // Cada um vem mais para a direita que o anterior: a fila tem de LER como fila.
  const xs = fila.figuras.map((f) => f.x);
  assert.deepEqual(xs, [...xs].sort((a, b) => a - b), "a fila está fora de ordem no x");
});

check("the bosses in the line-up match the ones the game actually fights", () => {
  const doJogo = [...GAME.matchAll(/boss: "([a-z-]+)"/g)].map((m) => m[1]);
  const naFila = PAINEIS.find((p) => p.id === "mestres")
    .figuras.map((f) => f.asset.replace("boss:", ""));
  assert.deepEqual(naFila, doJogo, "a fila não é o elenco de PHASE_CONFIG");
});

// ── os textos ──────────────────────────────────────────────────────────────

check("every panel has its text in both languages", () => {
  for (const lang of ["pt", "en"]) {
    const h = msgs(lang).historia;
    assert.ok(h, `${lang}: bloco historia ausente`);
    for (const chave of chavesDaHistoria()) {
      const curta = chave.replace("historia.", "");
      assert.ok(h[curta], `${lang}: falta o texto de "${curta}"`);
      assert.ok(h[curta].length > 20, `${lang}: "${curta}" curto demais para um painel`);
    }
    assert.ok(h.skip, `${lang}: falta o aviso de pular`);
  }
});

check("no panel's text outlasts the panel", () => {
  // Texto escrito letra a letra que não termina antes do fade de saída deixa o
  // jogador lendo metade da frase. É a falha mais fácil de introduzir mexendo
  // na duração, e a mais chata de perceber.
  for (const lang of ["pt", "en"]) {
    const h = msgs(lang).historia;
    for (const p of PAINEIS) {
      const texto = h[p.chave.replace("historia.", "")];
      const precisa = FADE + texto.length * VELOCIDADE_TEXTO + FADE;
      assert.ok(p.dur >= precisa,
        `${lang}/${p.id}: precisa de ${precisa.toFixed(1)}s, tem ${p.dur}s`);
    }
  }
});

// ── o tempo ────────────────────────────────────────────────────────────────

check("the whole opening is short enough that nobody puts the pad down", () => {
  const total = duracaoTotal();
  assert.ok(total <= 32, `${total}s de abertura é longo demais`);
  assert.ok(total >= 15, `${total}s não conta história nenhuma`);
});

check("the timeline hands back the right panel at every moment", () => {
  assert.equal(painelEm(0).indice, 0);
  assert.equal(painelEm(PAINEIS[0].dur - 0.01).indice, 0, "trocou cedo demais");
  assert.equal(painelEm(PAINEIS[0].dur).indice, 1, "não trocou na hora certa");
  assert.equal(painelEm(duracaoTotal() - 0.01).indice, PAINEIS.length - 1);
  assert.equal(painelEm(duracaoTotal()), null, "depois do fim tem de acabar");
  assert.equal(painelEm(9999), null);
});

check("panels fade in and out instead of cutting", () => {
  const dur = 5;
  assert.equal(opacidadeEm(0, dur), 0, "tem de entrar do preto");
  assert.ok(opacidadeEm(FADE / 2, dur) > 0 && opacidadeEm(FADE / 2, dur) < 1);
  assert.equal(opacidadeEm(dur / 2, dur), 1, "no meio tem de estar cheio");
  assert.equal(opacidadeEm(dur, dur), 0, "tem de sair para o preto");
  assert.ok(opacidadeEm(dur - FADE / 2, dur) < 1, "não está saindo");
});

check("the text waits for the panel before it starts writing", () => {
  // Texto surgindo sobre um painel ainda transparente fica ilegível justo no
  // começo, que é quando o jogador olha.
  assert.equal(letrasEm(0, 50), 0);
  assert.equal(letrasEm(FADE, 50), 0);
  assert.ok(letrasEm(FADE + VELOCIDADE_TEXTO * 10, 50) >= 9, "não começou a escrever");
  assert.equal(letrasEm(999, 50), 50, "tem de terminar a frase");
});

// ── fiação ─────────────────────────────────────────────────────────────────

check("the opening plays over the track the author named for it", () => {
  assert.equal(TRILHA_ABERTURA, "abertura");
  assert.match(BGM, /abertura: "Kungfu Castle Opening Screen"/);
});

check("the opening is skippable, by key and by touch", () => {
  // Quem está rejogando não pode pagar de novo por uma história que já viu —
  // e no celular não existe tecla.
  assert.match(TELA, /addEventListener\("keydown", pularHistoria\)/);
  assert.match(TELA, /addEventListener\("pointerdown", pularHistoria\)/);
  assert.match(TELA, /removeEventListener\("keydown", pularHistoria\)/,
    "o listener precisa sair, senão vaza a cada remonte");
});

check("only the real start goes through the opening", () => {
  // Modo de teste e "jogar de novo" entram direto: quem está depurando a fase 4
  // ou acabou de perder não quer ver a história outra vez.
  const inicio = GAME.match(/const handleStart = \(\) => \{[\s\S]*?\n  \};/)[0];
  assert.match(inicio, /setScreen\("historia"\)/, "INICIAR tem de passar pela abertura");
  const teste = GAME.match(/const startTest = \(phase, atBoss\) => \{[\s\S]*?\n  \};/)[0];
  assert.match(teste, /setScreen\("playing"\)/, "o modo de teste tem de entrar direto");
  const restart = GAME.match(/const handleRestart = \(\) => \{[\s\S]*?\n  \};/)[0];
  assert.match(restart, /setScreen\("playing"\)/, "o restart tem de entrar direto");
});

check("the opening screen is not in the initial bundle", () => {
  // Ela traz a própria Application do PixiJS. Quem cai no menu e nunca aperta
  // INICIAR não deve pagar por isso.
  assert.match(GAME, /dynamic\(\(\) => import\("\.\/KungFuHistoria"\), \{ ssr: false \}\)/);
});

check("a figure that is looking at something is turned toward it", () => {
  // O herói entrou de costas para o portão nas duas primeiras versões deste
  // painel. A causa era declarar "espelhado" em vez de "olha para": um booleano
  // não sobrevive a mover o que ele estava encarando.
  for (const p of PAINEIS) {
    for (const f of [...(p.fundo ?? []), ...(p.figuras ?? [])]) {
      if (f.olhaPara == null) continue;
      assert.notEqual(f.olhaPara, f.x, `${p.id}/${f.asset}: olha para si mesmo`);
      const esperado = f.olhaPara > f.x ? 1 : -1;   // 1 = direita
      const virado = espelhamentoDe(f) * OLHA_NATIVO;
      assert.equal(virado, esperado,
        `${p.id}/${f.asset}: está em x=${f.x} olhando para ${f.olhaPara} e saiu virado ao contrário`);
    }
  }
});

check("the hero looks at what each panel is about", () => {
  // Não basta estar virado: tem de estar virado para o assunto do painel.
  const heroi = PAINEIS.flatMap((p) =>
    (p.figuras ?? []).filter((f) => f.asset.startsWith("player:")).map((f) => [p.id, f]));
  assert.ok(heroi.length >= 2, "o herói sumiu dos painéis");
  for (const [id, f] of heroi) {
    assert.ok(f.olhaPara != null, `${id}: o herói não declara para onde olha`);
  }
});
