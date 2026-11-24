// Encaixe dos jogos na altura visível: matemática pura (src/lib/game-fit.js)
// e o CSS que a acompanha (src/app/globals.css).
//
// O executor é o do próprio projeto (tests/run.mjs, node:assert): nada de
// Vitest nem dependência nova.
import assert from "node:assert/strict";
import { check, near, source, loadModule } from "./helpers.mjs";

const gf = await loadModule("src/lib/game-fit.js");
const { escalaDeEncaixe, tamanhoEncaixado, alturaDisponivel, variavelVh, clienteParaLogico, deltaClienteParaLogico, bufferDoCanvas } = gf;

// ---------- escala ----------

check("encaixe: cabe pela largura quando a altura sobra", () => {
  // 480×640 num espaço 366×800 (celular em pé): manda a largura.
  near(escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 366, alturaDisponivel: 800 }), 0.7625, 1e-4);
});

check("encaixe: cabe pela ALTURA quando a largura sobra (o caso do monitor de 768)", () => {
  // 1366×625 de janela: 625 − 48 (Navbar) − 24 (padding) − 62 (título) = 491.
  const s = escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 1342, alturaDisponivel: 491 });
  near(s, 0.7671, 1e-4);
  assert.ok(640 * s <= 491, "a caixa escalada passa da altura disponível");
});

check("encaixe: mantém a proporção (largura e altura pela mesma escala)", () => {
  const t = tamanhoEncaixado({ largura: 400, altura: 550, larguraDisponivel: 1000, alturaDisponivel: 300 });
  near(t.largura / t.altura, 400 / 550, 1e-9);
  assert.ok(t.altura <= 300 && t.largura <= 1000);
});

check("encaixe: não amplia além da máxima (padrão 1)", () => {
  assert.equal(escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 1872, alturaDisponivel: 1000 }), 1);
  assert.equal(gf.ESCALA_MAXIMA, 1);
});

check("encaixe: máxima configurável (3Invader e Kung Fu Castle ampliam até 2×)", () => {
  near(escalaDeEncaixe({ largura: 480, altura: 720, larguraDisponivel: 1872, alturaDisponivel: 950, maxima: 2 }), 1.3194, 1e-4);
  assert.equal(escalaDeEncaixe({ largura: 480, altura: 320, larguraDisponivel: 4000, alturaDisponivel: 4000, maxima: 2 }), 2);
});

check("encaixe: para na mínima (padrão 0,25) em vez de virar um selo", () => {
  assert.equal(escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 800, alturaDisponivel: 100 }), gf.ESCALA_MINIMA);
  assert.equal(escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 800, alturaDisponivel: 100, minima: 0.4 }), 0.4);
});

check("encaixe: mínima maior que a máxima não inverte os limites", () => {
  assert.equal(escalaDeEncaixe({ largura: 100, altura: 100, larguraDisponivel: 10, alturaDisponivel: 10, minima: 3, maxima: 1 }), 1);
});

check("encaixe: arredonda para BAIXO (nunca 1px para fora do espaço)", () => {
  for (const h of [333, 491, 517.3, 599.9, 639.7]) {
    const s = escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 5000, alturaDisponivel: h });
    assert.ok(640 * s <= h, `640 × ${s} > ${h}`);
    assert.ok(h - 640 * s < 0.07, `sobra demais em ${h}`);
  }
});

check("encaixe: entrada inválida não quebra (zero, NaN, negativo)", () => {
  assert.equal(escalaDeEncaixe({ largura: 0, altura: 640, larguraDisponivel: 300, alturaDisponivel: 300 }), 1);
  assert.equal(escalaDeEncaixe({ largura: NaN, altura: 640, larguraDisponivel: 300, alturaDisponivel: 300 }), 1);
  // Espaço ainda não medido: só a dimensão válida conta; nenhuma → máxima.
  near(escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: 240, alturaDisponivel: 0 }), 0.5, 1e-9);
  assert.equal(escalaDeEncaixe({ largura: 480, altura: 640, larguraDisponivel: -1, alturaDisponivel: NaN }), 1);
});

check("encaixe: a escala não depende do devicePixelRatio (só o buffer depende)", () => {
  const base = { largura: 480, altura: 320, larguraDisponivel: 366, alturaDisponivel: 400, maxima: 2 };
  const s = escalaDeEncaixe(base);
  for (const dpr of [1, 2, 3]) {
    const b = bufferDoCanvas(480, 320, dpr);
    assert.equal(escalaDeEncaixe(base), s);
    assert.deepEqual([b.width, b.height], [480 * dpr, 320 * dpr]);
  }
});

check("buffer do canvas: dpr limitado a [1, 3] e inválido vira 1", () => {
  assert.deepEqual(bufferDoCanvas(400, 500, 4), { width: 1200, height: 1500, dpr: 3 });
  assert.deepEqual(bufferDoCanvas(400, 500, 0.5), { width: 400, height: 500, dpr: 1 });
  assert.deepEqual(bufferDoCanvas(400, 500, undefined), { width: 400, height: 500, dpr: 1 });
  assert.deepEqual(bufferDoCanvas(400, 500, 1.5), { width: 600, height: 750, dpr: 1.5 });
});

// ---------- altura disponível, com e sem dvh ----------

check("altura disponível: janela − Navbar (48) − margens seguras − reservado", () => {
  assert.equal(gf.NAVBAR_ALTURA, 48);
  assert.equal(alturaDisponivel({ alturaJanela: 768 }), 720);
  assert.equal(alturaDisponivel({ alturaJanela: 625, reservado: 86 }), 491);
  assert.equal(alturaDisponivel({ alturaJanela: 844, seguraTopo: 47, seguraBase: 34 }), 715);
  assert.equal(alturaDisponivel({ alturaJanela: 30 }), 0, "nunca negativa");
  assert.equal(alturaDisponivel({ alturaJanela: NaN }), 0);
});

check("sem dvh: --aam-vh = 1% de innerHeight; com dvh: nenhuma variável", () => {
  assert.equal(variavelVh({ suportaDvh: true, alturaJanela: 700 }), null);
  assert.equal(variavelVh({ suportaDvh: false, alturaJanela: 625 }), "6.25px");
  // iPhone sem dvh com a barra de endereço visível: innerHeight menor que 100vh.
  assert.equal(variavelVh({ suportaDvh: false, alturaJanela: 664 }), "6.64px");
  assert.equal(variavelVh({ suportaDvh: false, alturaJanela: 0 }), null);
});

check("CSS da raiz: vh → --aam-vh → dvh, nessa ordem, iguais a CSS_ALTURA_MINIMA", () => {
  const css = source("src/app/globals.css");
  const bloco = css.match(/\.game-fit-root\s*\{([\s\S]*?)\}/);
  assert.ok(bloco, ".game-fit-root não encontrado em globals.css");
  const decl = [...bloco[1].matchAll(/min-height:\s*([^;]+);/g)].map((m) => m[1].trim());
  assert.deepEqual(decl, gf.CSS_ALTURA_MINIMA);
  assert.match(decl[0], /^calc\(100vh /);
  assert.match(decl[1], /var\(--aam-vh, 1vh\) \* 100/);
  assert.match(decl[2], /^calc\(100dvh /);
  assert.match(css, /--aam-topo:\s*48px/);
});

check("CSS do slot: cresce com base 0 (não mede o próprio jogo) e centraliza a caixa", () => {
  const css = source("src/app/globals.css");
  const bloco = css.match(/\.game-fit-slot\s*\{([\s\S]*?)\}/);
  assert.ok(bloco);
  assert.match(bloco[1], /flex:\s*1 1 0;/);
  assert.match(bloco[1], /align-self:\s*stretch;/);
  assert.match(bloco[1], /min-width:\s*0;/);
});

// ---------- coordenadas ----------

check("coordenadas: centro do retângulo CSS → centro lógico, em qualquer escala", () => {
  for (const s of [0.25, 0.5, 0.7671, 1, 1.3194, 2]) {
    const rect = { left: 100, top: 60, width: 480 * s, height: 640 * s };
    const p = clienteParaLogico(rect.left + rect.width / 2, rect.top + rect.height / 2, rect, 480, 640);
    near(p.x, 240, 1e-9);
    near(p.y, 320, 1e-9);
  }
});

check("coordenadas: cantos e um ponto qualquer", () => {
  const rect = { left: 443, top: 112, width: 368.2, height: 491 };
  const a = clienteParaLogico(443, 112, rect, 480, 640);
  near(a.x, 0); near(a.y, 0);
  const b = clienteParaLogico(443 + 368.2, 112 + 491, rect, 480, 640);
  near(b.x, 480); near(b.y, 640);
  const c = clienteParaLogico(443 + 92.05, 112 + 368.25, rect, 480, 640);
  near(c.x, 120, 1e-9); near(c.y, 480, 1e-9);
});

check("coordenadas: com buffer em alta densidade, usa a largura LÓGICA (não canvas.width)", () => {
  // Pixi com resolution 2: canvas.width = 960, lógico 480.
  const rect = { left: 0, top: 0, width: 366, height: 244 };
  const p = clienteParaLogico(183, 122, rect, 480, 320);
  near(p.x, 240); near(p.y, 160);
});

check("coordenadas: arrasto (delta) na tela → delta lógico", () => {
  const rect = { left: 12, top: 60, width: 240, height: 360 };
  const d = deltaClienteParaLogico(30, -15, rect, 480, 720);
  near(d.x, 60); near(d.y, -30);
});

check("coordenadas: retângulo vazio não divide por zero", () => {
  const p = clienteParaLogico(50, 40, { left: 0, top: 0, width: 0, height: 0 }, 480, 640);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});
