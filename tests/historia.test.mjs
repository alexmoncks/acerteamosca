// A apresentação da história.
//
// Doze cenas antes da fase 1, sobre a faixa de abertura. O risco aqui não é o
// desenho — é a cena apontar para um PNG que não existe, ou para uma chave de
// tradução que só uma das línguas tem, e a abertura inteira do jogo virar um
// retângulo vazio com um texto cru na tela.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { check, source, loadModule, repoPath } from "./helpers.mjs";

const {
  CENAS, LARGURA, ALTURA, BASE_CENAS, FADE, FLASH, VELOCIDADE_TEXTO, TRILHA_ABERTURA,
  duracaoTotal, cenaEm, opacidadeEm, opacidadeDaCena, flashEm, letrasEm,
  arquivosDaHistoria, chavesDaHistoria, faixasDaHistoria, chefesDaHistoria,
} = await loadModule("src/components/games/kungfu-historia.js");
const GAME = source("src/components/games/KungFuCastle.jsx");
const BGM = source("src/components/games/kungfu-bgm.js");
const TELA = source("src/components/games/KungFuHistoria.jsx");

const msgs = (lang) =>
  JSON.parse(fs.readFileSync(repoPath(`src/messages/${lang}.json`), "utf8"))
    .games.kungfucastle;

/** "/images/kungfucastle/historia/x.png" → caminho no disco. */
const noDisco = (url) => repoPath(path.join("public", url.replace(/^\//, "")));

// ── as cenas contra a arte ─────────────────────────────────────────────────

check("every scene's image exists on disk", () => {
  // É o teste que justifica o módulo: um nome errado aqui não quebra build
  // nenhum, só deixa a abertura do jogo com um buraco por cinco segundos.
  const faltando = arquivosDaHistoria().filter((u) => !fs.existsSync(noDisco(u)));
  assert.deepEqual(faltando, [], `cenas citadas e ausentes: ${faltando}`);
});

check("the scenes are the ones the presentation produced, at game resolution", () => {
  // 960×540 é o dobro da moldura de 480×270: escala 1/2 exata, para a grade de
  // pixel cair em múltiplo inteiro. Uma cena fora dessa medida entra reduzida
  // por interpolação e o dithering do MSX2 vira sujeira.
  for (const url of arquivosDaHistoria()) {
    const buf = fs.readFileSync(noDisco(url));
    // Cabeçalho IHDR do PNG: largura e altura em big-endian nos bytes 16..23.
    const largura = buf.readUInt32BE(16);
    const altura = buf.readUInt32BE(20);
    assert.equal(largura, LARGURA * 2, `${url}: ${largura}px de largura`);
    assert.equal(altura, ALTURA * 2, `${url}: ${altura}px de altura`);
  }
});

check("the frame is 16:9, which is what the scenes were composed in", () => {
  // Espremer as cenas no 3:2 do jogo cortaria as lanternas dos cantos, que é
  // onde metade delas ancora a composição.
  assert.equal(LARGURA / ALTURA, 16 / 9);
});

check("every scene image path lives under the opening's own folder", () => {
  // A abertura NÃO come da pasta do jogo: os sprites de player/ e bosses/ são
  // da era japonesa que a bíblia visual substituiu. Misturar as duas fontes é
  // o defeito que este teste existe para pegar.
  for (const url of arquivosDaHistoria()) {
    assert.ok(url.startsWith(`${BASE_CENAS}/`), `cena fora de ${BASE_CENAS}: ${url}`);
    assert.match(url, /\/cena-\d\d-[a-z0-9]+\.png$/, `nome fora do padrão: ${url}`);
  }
});

// ── o elenco ───────────────────────────────────────────────────────────────

check("all five bosses get a scene, in floor order", () => {
  // Um chefe por andar. Faltando um, o jogador conhece quatro dos cinco e o
  // quinto vira surpresa gratuita.
  assert.deepEqual(chefesDaHistoria(), [
    "mestre-capangas", "guardiao-portao", "senhor-sombras", "general-oni", "senhor-castelo",
  ], "a apresentação não bate com a ordem dos andares");
});

check("the bosses introduced are the ones the game actually fights", () => {
  const doJogo = [...GAME.matchAll(/boss: "([a-z-]+)"/g)].map((m) => m[1]);
  assert.deepEqual(chefesDaHistoria(), doJogo, "o elenco não é o de PHASE_CONFIG");
});

check("each boss scene carries its floor band", () => {
  for (const cena of CENAS.filter((c) => c.boss)) {
    assert.ok(cena.faixa, `${cena.id}: chefe sem tarja de andar`);
  }
});

// ── os textos ──────────────────────────────────────────────────────────────

check("every caption and band has its text in both languages", () => {
  for (const lang of ["pt", "en"]) {
    const h = msgs(lang).historia;
    assert.ok(h, `${lang}: bloco historia ausente`);
    for (const chave of chavesDaHistoria()) {
      const curta = chave.replace("historia.", "");
      assert.ok(h[curta], `${lang}: falta o texto de "${curta}"`);
      assert.ok(h[curta].length > 20, `${lang}: "${curta}" curto demais para uma cena`);
    }
    for (const chave of faixasDaHistoria()) {
      const curta = chave.replace("historia.", "");
      assert.ok(h[curta], `${lang}: falta a tarja "${curta}"`);
    }
    assert.ok(h.skip, `${lang}: falta o aviso de pular`);
  }
});

check("no scene's text outlasts the scene", () => {
  // Texto escrito letra a letra que não termina antes do fade de saída deixa o
  // jogador lendo metade da frase. É a falha mais fácil de introduzir mexendo
  // na duração, e a mais chata de perceber.
  for (const lang of ["pt", "en"]) {
    const h = msgs(lang).historia;
    for (const cena of CENAS.filter((c) => c.chave)) {
      const texto = h[cena.chave.replace("historia.", "")];
      const precisa = FADE + texto.length * VELOCIDADE_TEXTO + FADE;
      assert.ok(cena.dur >= precisa,
        `${lang}/${cena.id}: precisa de ${precisa.toFixed(1)}s, tem ${cena.dur}s`);
    }
  }
});

check("the translation block has no leftovers from the five-panel version", () => {
  // `mestres` era a legenda do painel que enfileirava os cinco chefes. Ele não
  // existe mais; a chave sobrando vira texto que ninguém traduz e ninguém lê.
  for (const lang of ["pt", "en"]) {
    assert.equal(msgs(lang).historia.mestres, undefined,
      `${lang}: "mestres" ficou para trás`);
  }
});

// ── o tempo ────────────────────────────────────────────────────────────────

check("the opening runs the minute it was written to run", () => {
  // Um minuto é MUITO para uma abertura de jogo de navegador, e a versão
  // anterior tinha 26,5s justamente por isso. Foi uma decisão do autor: a
  // apresentação de 60s é a peça, e ela entra inteira no jogo. O que torna
  // isso aceitável é o teste logo abaixo — pular tem de funcionar do primeiro
  // quadro, por tecla e por toque.
  const total = duracaoTotal();
  assert.equal(total, 60, `${total}s: a apresentação é de 60s exatos`);
  assert.ok(CENAS.every((c) => c.dur === 5), "toda cena dura os mesmos 5s");
  assert.equal(CENAS.length, 12);
});

check("the timeline hands back the right scene at every moment", () => {
  assert.equal(cenaEm(0).indice, 0);
  assert.equal(cenaEm(CENAS[0].dur - 0.01).indice, 0, "trocou cedo demais");
  assert.equal(cenaEm(CENAS[0].dur).indice, 1, "não trocou na hora certa");
  assert.equal(cenaEm(duracaoTotal() - 0.01).indice, CENAS.length - 1);
  assert.equal(cenaEm(duracaoTotal()), null, "depois do fim tem de acabar");
  assert.equal(cenaEm(9999), null);
});

check("scenes fade in and out instead of cutting", () => {
  const dur = 5;
  assert.equal(opacidadeEm(0, dur), 0, "tem de entrar do preto");
  assert.ok(opacidadeEm(FADE / 2, dur) > 0 && opacidadeEm(FADE / 2, dur) < 1);
  assert.equal(opacidadeEm(dur / 2, dur), 1, "no meio tem de estar cheio");
  assert.equal(opacidadeEm(dur, dur), 0, "tem de sair para o preto");
  assert.ok(opacidadeEm(dur - FADE / 2, dur) < 1, "não está saindo");
});

check("exactly one scene cuts hard, and it is the climax", () => {
  // Fade em tudo faz a sequência inteira ter o mesmo peso. A quebra de ritmo é
  // o que marca o clímax como clímax — e uma segunda quebra a apagaria.
  const cortes = CENAS.filter((c) => c.corte === "flash");
  assert.equal(cortes.length, 1, "o corte seco tem de ser único");
  assert.equal(cortes[0].boss, "senhor-castelo", "o corte tem de cair no chefe final");
});

check("the hard cut starts full and flashes white, instead of fading in", () => {
  // Estouro branco por cima de uma imagem ainda transparente vira um clarão
  // cinza: a cena precisa já estar cheia quando o flash acontece.
  const corte = CENAS.find((c) => c.corte === "flash");
  assert.equal(opacidadeDaCena(corte, 0), 1, "o corte tem de entrar cheio");
  assert.equal(flashEm(corte, 0), 1, "o flash tem de começar branco");
  assert.equal(flashEm(corte, FLASH), 0, "o flash tem de acabar");
  // E ainda tem de sair com fade, senão a cena seguinte não tem de onde entrar.
  assert.ok(opacidadeDaCena(corte, corte.dur - FADE / 2) < 1, "não está saindo");
  assert.equal(opacidadeDaCena(corte, corte.dur), 0);

  const normal = CENAS.find((c) => !c.corte);
  assert.equal(opacidadeDaCena(normal, 0), 0, "cena normal tem de entrar do preto");
  assert.equal(flashEm(normal, 0), 0, "só o corte pisca");
});

check("the text waits for the scene before it starts writing", () => {
  // Texto surgindo sobre uma cena ainda transparente fica ilegível justo no
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
  // e no celular não existe tecla. Com um minuto de abertura isso deixou de ser
  // cortesia e virou requisito.
  assert.match(TELA, /addEventListener\("keydown", pularHistoria\)/);
  assert.match(TELA, /addEventListener\("pointerdown", pularHistoria\)/);
  assert.match(TELA, /removeEventListener\("keydown", pularHistoria\)/,
    "o listener precisa sair, senão vaza a cada remonte");
});

check("the texts handed to the opening are built from the scene table", () => {
  // Montar a lista à mão no componente do jogo é o que deixaria uma cena nova
  // sem legenda — e sem erro nenhum, só uma tarja preta vazia por cinco
  // segundos.
  assert.match(GAME, /chavesDaHistoria\(\)/);
  assert.match(GAME, /faixasDaHistoria\(\)/);
  assert.ok(!/castelo: t\("historia\.castelo"\)/.test(GAME),
    "voltou a listar as chaves à mão");
});

check("the opening's texts are memoized", () => {
  // `textos` é dependência do efeito que constrói a Application do PixiJS: um
  // objeto novo a cada render derrubaria a tela inteira, recarregando as doze
  // imagens e voltando a história para o segundo zero.
  assert.match(GAME, /const historiaTextos = useMemo\(/);
  assert.match(GAME, /<KungFuHistoria textos=\{historiaTextos\}/);
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

check("the game stays out of the index while it is only for testers", () => {
  // Fora do menu e fora do sitemap já era verdade; faltava o robots. A página
  // tem SEO completo e um link de fora bastaria para indexá-la.
  const pagina = source("src/app/[locale]/jogos/kungfucastle/page.js");
  assert.match(pagina, /robots: \{ index: false, follow: false \}/);
  const home = source("src/app/[locale]/page.js");
  assert.ok(!/kungfucastle/.test(home), "o jogo voltou ao menu da home");
  const sitemap = source("src/app/sitemap.js");
  assert.ok(!/kungfucastle/.test(sitemap), "o jogo entrou no sitemap");
});

check("touch controls reach every action the keyboard has", () => {
  // Vieram de um ramo paralelo e foram portados: o risco é portar metade. Um
  // celular sem botão de pulo não passa da primeira fase.
  const overlay = GAME.match(/\{isTouch && \([\s\S]*?\n          \)\}/)?.[0];
  assert.ok(overlay, "overlay de toque não encontrado");
  for (const code of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyZ", "KeyX"]) {
    assert.ok(overlay.includes(`"${code}"`), `sem botão para ${code}`);
  }
  // O contêiner não pode comer o toque destinado ao canvas.
  assert.match(overlay, /pointerEvents: "none"/);
  assert.match(overlay, /pointerEvents: "auto"/);
});

check("a slipping finger releases the key", () => {
  // Dedo que escorrega para fora do botão sem soltar deixaria o personagem
  // andando para sempre — o pior bug possível num controle de toque.
  const botao = GAME.match(/function TouchButton\([\s\S]*?\n\}/)[0];
  for (const ev of ["onPointerUp", "onPointerCancel", "onPointerLeave"]) {
    assert.match(botao, new RegExp(`${ev}=\\{release\\}`), `${ev} não solta a tecla`);
  }
});

check("the touch overlay never renders on the server", () => {
  // matchMedia não existe no servidor: ler fora do efeito quebraria o SSR.
  assert.match(GAME, /useState\(false\);\n\s*useEffect\(\(\) => \{ setIsTouch\(window\.matchMedia/);
});
