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
const { LAYERS, ANCHORS, textureFor } = await loadModule("src/components/games/kungfu-scenery-lib.js");

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
  assert.match(EDITOR, /buildScenery\(game, phase, hydrate\(specRef\.current\)\)/);
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
  assert.match(EDITOR, /useState\(\(\) => dehydrate\(clone\(PHASE_SCENERY\[phase\]\)\)\)/);
  assert.match(EDITOR, /const clone = \(o\) => JSON\.parse\(JSON\.stringify\(o\)\)/);
});

check("the editor edits the on-disk shape and hydrates only to draw", () => {
  // PHASE_SCENERY já vem hidratado (cores em número). Guardando isso, o editor
  // gravava "color": 394778 no lugar de "#06061a" e o arquivo deixava de ser o
  // que a migração escreveu — o round-trip não fechava.
  assert.match(EDITOR, /dehydrate\(clone\(PHASE_SCENERY/, "o estado editado é o formato do disco");
  assert.match(EDITOR, /buildScenery\(game, phase, hydrate\(/, "hidrata só na hora de desenhar");
  const salvar = EDITOR.match(/const salvar = async[\s\S]*?\n  \};/)[0];
  assert.ok(!/hydrate\(/.test(salvar), "nada de hidratado pode ir para o disco");
});

check("clicking the palette with something selected swaps it instead of adding", () => {
  const fn = EDITOR.match(/const daPaleta = \(asset\) => \{[\s\S]*?\n  \};/);
  assert.ok(fn, "daPaleta não encontrada");
  assert.match(fn[0], /if \(i >= 0\) \{\s*\n\s*patch\(i, \{ asset \}\);/,
    "com seleção, troca só o asset — posição, camada, âncora e repetição ficam");
  assert.match(fn[0], /elements: \[/, "sem seleção, insere um novo");
  assert.match(EDITOR, /sel >= 0 \? "troca o selecionado" : "insere no centro da vista"/,
    "a paleta precisa dizer o que vai fazer");
});

// ── a textura que o editor mede tem de ser a que o jogo desenha ────────────
//
// Props com animação (tocha, braseiro, lanternas) são gravados como uma TIRA
// horizontal: scenery.props["tocha-fogo"] tem os 9 quadros lado a lado, e o
// renderizador desenha scenery.propAnims["tocha-fogo"].frames[0]. O editor
// media a tira inteira, então a alça de seleção saía 9 vezes mais larga que a
// tocha — cobrindo meia fase.

check("textureFor picks the frame the renderer draws, not the whole strip", () => {
  const tira = { width: 288, height: 48, __tira: true };
  const quadro = { width: 32, height: 48, __quadro: true };
  const scenery = {
    props: { "tocha-fogo": tira, paifang: quadro },
    propAnims: { "tocha-fogo": { frames: [quadro], speed: 0.2, loop: true } },
  };
  assert.equal(textureFor(scenery, "tocha-fogo"), quadro, "animado deve dar o quadro");
  assert.equal(textureFor(scenery, "paifang"), quadro, "estático deve dar a própria textura");
  assert.equal(textureFor({ props: {} }, "inexistente"), undefined);
});

check("both the renderer and the editor resolve textures through textureFor", () => {
  // Se cada um resolvesse por conta própria, voltariam a divergir — foi
  // exatamente assim que a alça passou a cobrir a tira inteira.
  assert.match(GAME, /textureFor\(scenery, el\.asset\)/,
    "buildScenery deve usar textureFor");
  assert.match(EDITOR, /textureFor\(/, "o editor deve usar textureFor");
  assert.ok(!/scenery\.props\[el\.asset\]/.test(EDITOR),
    "o editor não pode ler scenery.props direto: para prop animado isso é a tira");
  assert.ok(!/textures\.scenery\.props\[/.test(EDITOR),
    "nenhum acesso direto ao mapa de props no editor");
});

check("the canvas is display:block so clicks map 1:1 to the scene", () => {
  // Canvas é inline por padrão: senta numa linha de texto, e o topo dele deixa
  // de coincidir com o topo da div que ouve o mouse. O clique chegava ~14px
  // abaixo do ponto real e a base dos objetos baixos ficava inselecionável.
  assert.match(EDITOR, /canvas\.style\.display = "block"/);
});

check("clicks are ignored until the scene is built", () => {
  // buildScene carrega o elenco inteiro antes de devolver o jogo. Até lá o
  // hit-test não tem textura para medir e devolve "nada" — um clique que
  // silenciosamente não faz nada, e o usuário achando que errou a mira.
  const fn = EDITOR.match(/const onMouseDown = \(ev\) => \{[\s\S]*?\n  \};/);
  assert.ok(fn, "onMouseDown não encontrada");
  assert.match(fn[0], /if \(!pronto\) return;/);
  assert.match(EDITOR, /montando a cena/, "o estado de carregamento precisa ser visível");
  assert.match(EDITOR, /data-pronto=/, "e observável de fora, para os drivers esperarem");
});

check("no text in the editor panel is smaller than 11px", () => {
  // O editor herdou a tipografia do menu retrô: 8-10px em cinza apagado. No
  // menu passa — cinco botões olhados por dois segundos. Aqui não: este painel
  // é operado por minutos, com números a conferir e 49 nomes de asset a
  // distinguir. É ferramenta, não vitrine.
  const bloco = EDITOR.match(/const S = \{[\s\S]*?\n\};/);
  assert.ok(bloco, "objeto de estilos não encontrado");
  const tamanhos = [...bloco[0].matchAll(/fontSize:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.ok(tamanhos.length >= 10, `só ${tamanhos.length} tamanhos lidos`);
  const pequenos = tamanhos.filter((t) => t < 11);
  assert.deepEqual(pequenos, [], `tamanhos abaixo de 11px: ${pequenos}`);
});

check("muted label text keeps enough contrast to read", () => {
  // #8892b0 dava ~6:1 sobre o fundo; a 11px isso já é cansativo. #b8c4d0 dá ~9:1.
  const bloco = EDITOR.match(/const S = \{[\s\S]*?\n\};/)[0];
  assert.ok(!/#8892b0/.test(bloco), "o cinza apagado do menu não serve para um painel de trabalho");
  const luma = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const fundo = luma("#0d1117");
  for (const cor of [...bloco.matchAll(/color:\s*"(#[0-9a-f]{6})"/g)].map((m) => m[1])) {
    if (cor === "#ffd700") continue; // o dourado é destaque, não texto corrido
    const razao = (luma(cor) + 0.05) / (fundo + 0.05);
    assert.ok(razao >= 4.5, `${cor} dá contraste ${razao.toFixed(1)}:1, abaixo de 4.5:1`);
  }
});
