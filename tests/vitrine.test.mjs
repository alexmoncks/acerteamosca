// A vitrine da tela inicial.
//
// O menu mostrava o emoji 🥋 — que é um judogi, japonês, num jogo wuxia. No
// lugar dele o próprio jogador, alternando os golpes. A lógica aqui é pura de
// propósito: quem desenha (KungFuVitrine.jsx) só pergunta "que quadro agora?".
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, loadModule, source, repoPath } from "./helpers.mjs";

const { SEQUENCIA, montarPlano, quadroEm } = await loadModule(
  "src/components/games/kungfu-vitrine.js",
);

// Os números reais: quadros medidos nos PNGs, cadência do ASSET_MANIFEST.
const QUADROS = { idle: 8, punch: 6, kick: 7, sweep: 7, flyKick: 6, backflip: 10, special: 4 };
const SPEEDS  = { idle: 0.16, punch: 0.33, kick: 0.32, sweep: 0.27, flyKick: 0.22, backflip: 0.36, special: 0.14 };

check("the showcase returns to idle between every move", () => {
  // Um golpe emendado no outro vira agitação sem leitura. O idle no meio é o
  // lutador respirando, e é o que deixa cada golpe distinguível do seguinte.
  const golpes = SEQUENCIA.filter((a) => a !== "idle");
  assert.deepEqual(golpes, ["punch", "kick", "sweep", "flyKick", "backflip", "special"]);
  SEQUENCIA.forEach((anim, i) => {
    if (i % 2 === 0) assert.equal(anim, "idle", `posição ${i} devia ser idle`);
  });
});

check("a move lasts as long as it does in the game", () => {
  // O `speed` do manifesto é "fração de quadro por tick", e o jogo roda a
  // 60fps: duração = quadros / speed / 60. Reproduzir essa conta aqui é o que
  // faz a vitrine respirar no mesmo ritmo da partida — mexer no speed de um
  // golpe muda os dois juntos.
  const plano = montarPlano(QUADROS, SPEEDS);
  const punch = plano.find((p) => p.anim === "punch");
  assert.equal(punch.quadros, 6);
  // 6 / 0.33 = 18,18 ticks; 18,18 / 60 = 0,303s
  assert.ok(Math.abs(punch.duracaoMs - 303) < 1,
    `punch devia durar ~303ms, deu ${punch.duracaoMs}`);
});

check("the frame walks forward inside the current animation", () => {
  const plano = montarPlano(QUADROS, SPEEDS);
  const idle = plano[0];
  assert.deepEqual(quadroEm(plano, 0), { anim: "idle", quadro: 0 });
  // Na metade da duração do idle, metade dos quadros já passou.
  const meio = quadroEm(plano, idle.duracaoMs / 2);
  assert.equal(meio.anim, "idle");
  assert.equal(meio.quadro, Math.floor(QUADROS.idle / 2));
});

check("it moves on to the next animation when one ends", () => {
  const plano = montarPlano(QUADROS, SPEEDS);
  // Um milissegundo depois do fim do idle já é o primeiro quadro do punch.
  const depois = quadroEm(plano, plano[0].duracaoMs + 1);
  assert.equal(depois.anim, "punch");
  assert.equal(depois.quadro, 0);
});

check("the cycle loops forever without the caller tracking it", () => {
  // A vitrine não tem fim: quem desenha só passa "quanto tempo desde que
  // começou" e nunca precisa saber quanto dura a volta.
  const plano = montarPlano(QUADROS, SPEEDS);
  const ciclo = plano.reduce((s, p) => s + p.duracaoMs, 0);
  for (const t of [0, 137, 4021]) {
    assert.deepEqual(quadroEm(plano, ciclo + t), quadroEm(plano, t),
      `t=${t} devia repetir depois de uma volta`);
  }
});

check("it never points at a frame the sheet does not have", () => {
  // Quadro fora da folha não estoura: desenha faixa vazia. Varrer o ciclo
  // inteiro é barato e é a única forma de pegar o arredondamento de borda.
  const plano = montarPlano(QUADROS, SPEEDS);
  const ciclo = plano.reduce((s, p) => s + p.duracaoMs, 0);
  for (let t = 0; t < ciclo; t += 1) {
    const { anim, quadro } = quadroEm(plano, t);
    assert.ok(quadro >= 0 && quadro < QUADROS[anim],
      `t=${t}: ${anim} quadro ${quadro} fora de 0..${QUADROS[anim] - 1}`);
  }
});

check("every animation in the showcase exists in the game", () => {
  // Nome errado aqui não quebra build, não aparece em log e não estoura: o
  // navegador pede um PNG que não existe, leva 404 e desenha faixa vazia. Só se
  // descobre olhando. Este teste é esse olhar — contra o manifesto E contra o
  // disco, os dois lados, como os testes da trilha já fazem.
  const ASSETS = source("src/components/games/kungfu-assets.js");
  for (const anim of new Set(SEQUENCIA)) {
    const decl = ASSETS.match(new RegExp(`\\b${anim}:\\s*\\{[^}]*src: "([^"]+)"`));
    assert.ok(decl, `${anim} não está no ASSET_MANIFEST do player`);
    assert.ok(fs.existsSync(repoPath("public" + decl[1])),
      `${anim} aponta para um arquivo que não existe: ${decl[1]}`);
  }
});

const GAME = source("src/components/games/KungFuCastle.jsx");
const VITRINE = source("src/components/games/KungFuVitrine.jsx");

check("the japanese gi is gone from the menu", () => {
  // 🥋 é um judogi/karategi — arte marcial japonesa — num jogo wuxia chinês.
  assert.ok(!GAME.includes("\u{1F94B}"), "o emoji do quimono ainda está no menu");
  assert.match(GAME, /<KungFuVitrine/, "o menu não desenha a vitrine");
});

check("the showcase takes its cadence from the manifest, not from typed numbers", () => {
  // Duplicar os `speed` aqui faria a vitrine e a partida divergirem no dia em
  // que alguém acertasse a cadência de um golpe só de um lado.
  assert.match(VITRINE, /PLAYER_ANIMS/, "a vitrine não lê o manifesto");
  assert.ok(!/speed:\s*0\.\d+/.test(VITRINE),
    "a vitrine tem `speed` digitado; devia vir do ASSET_MANIFEST");
});

check("the showcase reads the frame count from the sheet itself", () => {
  // Contagem de quadros digitada envelhece calada: quem regerar um PNG com
  // outro número de quadros deixa a animação picotada, sem erro nenhum.
  assert.match(VITRINE, /naturalWidth/,
    "a vitrine não mede os quadros pela largura do PNG");
});

check("the showcase does not touch the browser during render", () => {
  // matchMedia e Image não existem no servidor: usados fora de efeito, quebram
  // o SSR da página inteira do jogo.
  //
  // Fatiar pelo PRIMEIRO `return (` não serve — `return () => {...}`, a limpeza
  // de um efeito, casa com isso e a fatia começa no lugar errado. A primeira
  // versão deste teste se pegou nisso e acusou código que estava correto.
  const BROWSER = /window\.|document\.|new Image\(/;

  // 1. Nada antes do primeiro efeito: é onde alguém poria matchMedia sem pensar.
  const antesDoPrimeiroEfeito = VITRINE.slice(0, VITRINE.indexOf("useEffect("));
  assert.ok(!BROWSER.test(antesDoPrimeiroEfeito),
    "a vitrine toca no browser antes de qualquer efeito");

  // 2. Nada no JSX, que é o último `return (` do arquivo.
  const jsx = VITRINE.slice(VITRINE.lastIndexOf("return ("));
  assert.ok(!BROWSER.test(jsx), "a vitrine toca no browser dentro do JSX");
});

check("it holds still for whoever asked for less motion", () => {
  // Um laço infinito de animação é exatamente o que prefers-reduced-motion
  // existe para desligar.
  assert.match(VITRINE, /prefers-reduced-motion/,
    "a vitrine ignora prefers-reduced-motion");
});
