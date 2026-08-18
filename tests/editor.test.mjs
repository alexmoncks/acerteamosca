// O editor de fases.
//
// O comportamento (clicar, arrastar, salvar) é provado no navegador com
// facing/editor.mjs, porque exige PixiJS e DOM. O que se guarda aqui são as
// propriedades estruturais que fazem esse comportamento continuar honesto — e
// que um refactor apagaria sem quebrar nada visível na hora.
import assert from "node:assert/strict";
import { check, source, loadModule } from "./helpers.mjs";

const EDITOR = source("src/components/games/KungFuFaseEditor.jsx");
const GAME = source("src/components/games/KungFuCastle.jsx");
const { LAYERS, ANCHORS } = await loadModule("src/components/games/kungfu-scenery-lib.js");

check("test mode opens on the phase selector, not the sprite test", () => {
  assert.match(GAME, /const \[screen, setScreen\] = useState\("menu"\)/);
  assert.ok(!/useState\(isTstMode \? "spritetest"/.test(GAME),
    "?tst=t não pode mais cair direto no Sprite Test");
});

check("the selector offers an EDITOR entry per phase", () => {
  const bloco = GAME.match(/MODO TESTE[\s\S]{0,2000}/)[0];
  assert.match(bloco, /setScreen\("editor"\)/);
  assert.match(bloco, /Object\.keys\(PHASE_CONFIG\)/,
    "as fases do editor têm de sair de PHASE_CONFIG, não de uma lista à mão");
});

check("the editor renders through the game's own buildScenery", () => {
  // A regra que define este editor. Se ele desenhar por conta própria, mente —
  // e um editor que mente sobre a posição é pior que nenhum.
  assert.match(EDITOR, /import \{[\s\S]*?buildScenery[\s\S]*?\} from "\.\/KungFuCastle"/);
  assert.match(EDITOR, /buildScenery\(game, phase, specRef\.current\)/);
  assert.match(EDITOR, /clearScenery\(game\)/);
});

check("buildScenery accepts an in-memory spec, so the editor draws what is being edited", () => {
  assert.match(GAME, /export function buildScenery\(game, phase, specOverride\)/);
  assert.match(GAME, /const spec = specOverride \?\? PHASE_SCENERY\[phase\]/);
});

check("the editor positions with the same functions the renderer uses", () => {
  // Se a seleção usasse matemática própria, ela e o desenho divergiriam com o
  // tempo e a alça passaria a apontar para o lugar errado.
  for (const fn of ["anchorPoint", "resolveY", "positionsFor"]) {
    assert.match(EDITOR, new RegExp(`\\b${fn}\\b`), `o editor deve usar ${fn} da lib`);
  }
  assert.ok(!/GROUND_Y \+ 18 -/.test(EDITOR),
    "nenhuma fórmula de âncora reimplementada no editor");
});

check("the interaction layer never reaches what gets saved", () => {
  // A grade, a régua e a alça de seleção vivem num contêiner à parte. Se
  // entrassem nas camadas de cenário, seriam gravadas como elementos.
  const salvar = EDITOR.match(/const salvar = async[\s\S]*?\n  \};/);
  assert.ok(salvar, "função salvar não encontrada");
  assert.match(salvar[0], /JSON\.stringify\(\{ phase, scenery: spec \}\)/,
    "só o spec é enviado — nada do overlay");
  assert.match(EDITOR, /overlay\.removeChildren\(\)/,
    "o overlay é limpo a cada redesenho, senão as alças se acumulam");
});

check("the palette comes from disk, not a hand-kept list", () => {
  assert.match(EDITOR, /fetch\("\/api\/dev\/fases\?assets=1"\)/);
  assert.ok(!/const PROPS = \[/.test(EDITOR),
    "uma lista à mão envelheceria a cada prop novo");
});

check("every layer and anchor is offered in the panel", () => {
  // O painel oferece o que o jogo entende — nem menos (opção inalcançável) nem
  // mais (o usuário grava algo que a rota recusa).
  assert.match(EDITOR, /Object\.keys\(LAYERS\)\.map/,
    "as camadas devem ser derivadas de LAYERS, não escritas à mão");
  for (const a of ANCHORS) {
    assert.match(EDITOR, new RegExp(`value="${a}"`), `âncora ${a} não aparece no painel`);
  }
  assert.ok(Object.keys(LAYERS).length === 4, "esperava 4 camadas");
});

check("repeat is a property of the element, with its own frequency", () => {
  assert.match(EDITOR, /repeat: \{ every: 300 \}/, "marcar repete precisa dar uma frequência inicial");
  assert.match(EDITOR, /every: el\.repeat\.every === "auto" \? 300 : "auto"/,
    "o botão auto alterna entre emenda sem costura e frequência explícita");
  assert.match(EDITOR, /repeat: undefined/, "desmarcar precisa remover a propriedade, não zerá-la");
});

check("dragging a repeating element does not write a meaningless x", () => {
  // Um elemento que repete começa em x e se espalha pelo nível; arrastar na
  // horizontal deslocaria a série inteira e confunde mais do que ajuda.
  assert.match(EDITOR, /\.\.\.\(el\.repeat \? \{\} : \{ x: Math\.round/);
});

check("the editor never mutates PHASE_SCENERY", () => {
  // Ele parte de uma cópia. Sem isso, editar e voltar sem salvar deixaria o
  // jogo rodando com o cenário alterado em memória.
  assert.match(EDITOR, /useState\(\(\) => clone\(PHASE_SCENERY\[phase\]\)\)/);
  assert.match(EDITOR, /const clone = \(o\) => JSON\.parse\(JSON\.stringify\(o\)\)/);
});
