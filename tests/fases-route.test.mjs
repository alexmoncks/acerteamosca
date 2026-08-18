// A rota que grava o cenário escreve um arquivo do repositório a partir de um
// corpo HTTP. É a superfície mais perigosa do projeto, então o que se testa
// aqui não é o caminho feliz — é cada defesa, uma a uma.
//
// A rota importa `next/server`, que os testes não carregam. Então a validação
// de forma é exercitada na função pura que a rota usa (validatePhase), e as
// defesas estruturais são verificadas no fonte. As duas metades precisam
// existir: só o fonte deixaria a validação passar vazia, e só a função pura não
// provaria que a rota a chama.
import assert from "node:assert/strict";
import fs from "node:fs";
import { check, source, repoPath, loadModule } from "./helpers.mjs";

const { validatePhase, LAYERS, ANCHORS } =
  await loadModule("src/components/games/kungfu-scenery-lib.js");
const ROTA = source("src/app/api/dev/fases/route.js");

const faseValida = () =>
  JSON.parse(fs.readFileSync(repoPath("src/data/kungfu/fase-1.json"), "utf8"));

// ── as defesas da rota ─────────────────────────────────────────────────────

check("the route 404s outside development, and does it first", () => {
  // 404 e não 403: um 403 confirma que a rota existe para quem estiver sondando.
  assert.match(ROTA, /process\.env\.NODE_ENV === "development"/);
  assert.match(ROTA, /status:\s*404/);
  assert.ok(!/status:\s*403/.test(ROTA), "403 revelaria a existência da rota");

  // A guarda precisa ser a PRIMEIRA coisa de cada handler: validar antes de
  // checar o ambiente já teria lido o corpo de um pedido que não deveria
  // sequer ser atendido.
  for (const handler of ["GET", "POST"]) {
    const fn = ROTA.match(new RegExp(`export async function ${handler}[\\s\\S]*?\\n\\}`));
    assert.ok(fn, `handler ${handler} não encontrado`);
    const linhas = fn[0].split("\n").filter((l) => l.trim() && !l.trim().startsWith("//"));
    assert.match(linhas[1], /emDesenvolvimento\(\)/,
      `${handler}: a checagem de ambiente tem de ser a primeira instrução`);
  }
});

check("the file path is built from a validated number, never from client text", () => {
  // Sem isto, `phase: "../../../algo"` seria escrita arbitrária de arquivo.
  assert.match(ROTA, /FASES\.find\(\(n\) => n === Number\(corpo\?\.phase\)\)/,
    "a fase precisa ser casada contra a lista conhecida");
  assert.match(ROTA, /path\.join\(DIR_DADOS, `fase-\$\{fase\}\.json`\)/,
    "o caminho tem de usar o número validado");
  assert.ok(!/corpo\.phase[^)]*\)\s*\+\s*"\.json"/.test(ROTA),
    "o caminho nunca pode concatenar a string do cliente");
});

check("nothing is written before the shape is validated", () => {
  const escrita = ROTA.indexOf("writeFileSync");
  const validacao = ROTA.indexOf("validatePhase(");
  assert.ok(validacao > -1 && escrita > -1, "esperava validação e escrita");
  assert.ok(validacao < escrita, "validatePhase tem de rodar antes de gravar");
});

check("asset existence is checked against disk, not trusted from the body", () => {
  assert.match(ROTA, /validatePhase\(corpo\?\.scenery,\s*assetExiste\)/);
  assert.match(ROTA, /\/\^\[a-z0-9-\]\+\$\//,
    "o nome do asset precisa passar por uma regra estrita antes de virar caminho");
});

// ── a validação de forma ───────────────────────────────────────────────────

check("a phase straight off disk validates", () => {
  assert.deepEqual(validatePhase(faseValida(), () => true), []);
});

check("garbage is rejected without throwing", () => {
  for (const lixo of [null, undefined, 42, "fase", []]) {
    const erros = validatePhase(lixo, () => true);
    assert.ok(erros.length > 0, `${JSON.stringify(lixo)} deveria ser rejeitado`);
  }
});

check("a missing or absurd levelWidth is rejected", () => {
  for (const v of [undefined, 0, -100, "2400", NaN]) {
    const f = faseValida();
    f.levelWidth = v;
    assert.ok(validatePhase(f, () => true).some((e) => e.includes("levelWidth")),
      `levelWidth ${v} deveria ser rejeitado`);
  }
});

check("an unknown sky type is rejected", () => {
  const f = faseValida();
  f.sky = { type: "aurora" };
  assert.ok(validatePhase(f, () => true).some((e) => e.includes("sky.type")));
});

check("an element with an unknown layer or anchor is rejected", () => {
  for (const [campo, valor] of [["layer", "meio"], ["anchor", "teto"]]) {
    const f = faseValida();
    f.elements[0][campo] = valor;
    assert.ok(validatePhase(f, () => true).some((e) => e.includes(campo)),
      `${campo} "${valor}" deveria ser rejeitado`);
  }
});

check("every layer and anchor the lib exports is accepted", () => {
  // O espelho do teste acima: se alguém acrescentar uma camada e esquecer da
  // validação, o editor gravaria algo que o jogo desenha e a rota recusa.
  for (const layer of Object.keys(LAYERS)) {
    const f = faseValida();
    f.elements[0].layer = layer;
    assert.deepEqual(validatePhase(f, () => true), [], `camada ${layer} recusada`);
  }
  for (const anchor of ANCHORS) {
    const f = faseValida();
    f.elements[0].anchor = anchor;
    assert.deepEqual(validatePhase(f, () => true), [], `âncora ${anchor} recusada`);
  }
});

check("an asset that is not on disk is rejected", () => {
  const f = faseValida();
  f.elements[0].asset = "prop-que-nao-existe";
  const erros = validatePhase(f, (a) => a !== "prop-que-nao-existe");
  assert.ok(erros.some((e) => e.includes("não existe no disco")));
});

check("a bad repeat frequency is rejected", () => {
  for (const every of [0, -5, "sempre", null]) {
    const f = faseValida();
    f.elements[0].repeat = { every };
    assert.ok(validatePhase(f, () => true).some((e) => e.includes("repeat.every")),
      `repeat.every ${JSON.stringify(every)} deveria ser rejeitado`);
  }
});

check("repeat every:\"auto\" and a positive number are accepted", () => {
  for (const every of ["auto", 1, 300]) {
    const f = faseValida();
    f.elements[0].repeat = { every };
    assert.deepEqual(validatePhase(f, () => true), [], `repeat.every ${every} recusado`);
  }
});

check("errors accumulate instead of stopping at the first", () => {
  // O editor mostra a lista inteira; parar no primeiro faria o usuário salvar,
  // corrigir, salvar, corrigir.
  const f = faseValida();
  f.levelWidth = -1;
  f.tileset = "";
  f.elements[0].layer = "nenhuma";
  assert.ok(validatePhase(f, () => true).length >= 3);
});

check("the previous version is kept before overwriting", () => {
  // Estes arquivos são compostos ao vivo e ficam horas sem commit. Perdi uma
  // composição inteira da fase 5 com um `git checkout` apressado, e não havia
  // de onde recuperar. A cópia é local, ignorada pelo git, e custa um write.
  assert.match(ROTA, /copyFileSync\(arquivo, path\.join\(DIR_BACKUP/);
  const i = ROTA.indexOf("copyFileSync");
  const j = ROTA.indexOf("writeFileSync");
  assert.ok(i > -1 && j > -1 && i < j, "a cópia precisa acontecer ANTES de gravar");
});

check("a failed backup does not block the save", () => {
  // Rede de segurança não pode virar pré-requisito: disco cheio ou permissão
  // negada não devem impedir alguém de salvar o que acabou de compor.
  const bloco = ROTA.match(/try \{[\s\S]*?copyFileSync[\s\S]*?\} catch \{[\s\S]*?\}/);
  assert.ok(bloco, "o backup precisa estar dentro de try/catch");
});
