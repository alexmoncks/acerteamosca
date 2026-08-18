"use client";

// Editor de fases do Kung Fu Castle. Só existe no modo teste (?tst=t).
//
// A REGRA QUE DEFINE ESTE EDITOR: ele renderiza chamando o próprio
// `buildScenery` do jogo, sobre a mesma cena que `buildScene` monta. Não é uma
// reimplementação nem uma aproximação em DOM — o que você arrasta é literalmente
// o que o jogo desenha, com as mesmas camadas, as mesmas âncoras e a mesma
// matemática de y. Um editor que desenha por conta própria mente, e um editor
// que mente é pior que nenhum.
//
// Consequência: a única coisa desenhada por fora é a camada de interação
// (seleção, grade, régua), num contêiner separado que nunca entra no que salva.
import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Container, Graphics, Sprite } from "pixi.js";
import {
  buildScene,
  buildScenery,
  clearScenery,
  CW,
  CH,
  GROUND_Y,
} from "./KungFuCastle";
import { PHASE_SCENERY } from "./kungfu-scenery";
import {
  LAYERS,
  ANCHORS,
  anchorPoint,
  resolveY,
  positionsFor,
  textureFor,
  hydrate,
  dehydrate,
} from "./kungfu-scenery-lib";

const ZOOM = 2;
const clone = (o) => JSON.parse(JSON.stringify(o));

/**
 * Caixa de um elemento na primeira repetição, em coordenadas de mundo.
 *
 * Usa as mesmas funções que o renderizador — se um dia divergirem, a seleção
 * passa a apontar para o lugar errado e fica óbvio na hora.
 */
function boundsOf(el, tex, levelWidth) {
  // `tex` vem de textureFor: para um prop animado, o mapa de props traz a tira
  // inteira e a caixa sairia nove vezes mais larga que a tocha.
  const escala = el.scale || 1;
  const w = tex.width * escala;
  const h = tex.height * escala;
  const ponto = anchorPoint(el.anchor);
  const y = resolveY(el.anchor, el.y, h, GROUND_Y);
  const x = positionsFor(el, w, levelWidth)[0];
  return { x: x - ponto.x * w, y: y - ponto.y * h, w, h };
}

export default function KungFuFaseEditor({ phase, onBack }) {
  const hostRef = useRef(null);
  const appRef = useRef(null);
  const gameRef = useRef(null);
  const overlayRef = useRef(null);
  const dragRef = useRef(null);

  const [spec, setSpec] = useState(() => dehydrate(clone(PHASE_SCENERY[phase])));
  const [sel, setSel] = useState(-1);
  const [cameraX, setCameraX] = useState(0);
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState("");
  const [pronto, setPronto] = useState(false);

  // Refs espelhando o estado: os handlers do PixiJS são registrados uma vez e
  // não enxergariam o estado novo a cada render.
  const specRef = useRef(spec);
  const camRef = useRef(cameraX);
  const selRef = useRef(sel);
  specRef.current = spec;
  camRef.current = cameraX;
  selRef.current = sel;

  useEffect(() => {
    fetch("/api/dev/fases?assets=1")
      .then((r) => (r.ok ? r.json() : { assets: [] }))
      .then((d) => setAssets(d.assets || []))
      .catch(() => setAssets([]));
  }, []);

  // ── monta a cena do jogo ────────────────────────────────────────────────
  useEffect(() => {
    let morto = false;
    const app = new Application();

    (async () => {
      await app.init({
        width: CW,
        height: CH,
        backgroundColor: 0x050510,
        antialias: false,
        resolution: 1,
        preference: "webgl",
      });
      if (morto) return app.destroy();

      hostRef.current?.appendChild(app.canvas);
      app.canvas.style.imageRendering = "pixelated";
      // display:block é obrigatório, não estética. Canvas é inline por padrão,
      // então senta numa linha de texto e o topo dele não coincide com o topo
      // da div que recebe os cliques — todo clique chegava ~14px abaixo do
      // ponto real, e selecionar a base de um objeto baixo não funcionava.
      app.canvas.style.display = "block";
      app.canvas.style.width = `${CW * ZOOM}px`;
      app.canvas.style.height = `${CH * ZOOM}px`;
      app.canvas.style.cursor = "crosshair";
      appRef.current = app;

      const game = await buildScene(app);
      if (morto) return app.destroy(true, { children: true });
      gameRef.current = game;

      // O jogo em si não roda: sem jogador, sem HUD, sem inimigos. Só o cenário.
      game.playerAnim.sprite.visible = false;
      game.hudLayer.visible = false;

      const overlay = new Container();
      app.stage.addChild(overlay);
      overlayRef.current = overlay;

      // Props animados (tochas, braseiros) continuam piscando: parte do que se
      // está compondo é o ritmo do fogo.
      app.ticker.add((t) => {
        for (const a of game.propAnims) a.update(t.deltaTime);
      });

      setPronto(true);
    })();

    return () => {
      morto = true;
      const app = appRef.current;
      if (app) {
        try {
          app.destroy(true, { children: true });
        } catch {
          /* já destruída */
        }
      }
      appRef.current = null;
      gameRef.current = null;
    };
  }, []);

  // ── redesenha a cada mudança ────────────────────────────────────────────
  const redesenhar = useCallback(() => {
    const game = gameRef.current;
    const overlay = overlayRef.current;
    if (!game || !overlay) return;

    clearScenery(game);
    // O spec editado é o formato do disco (cores em hex). O jogo quer número,
    // então a hidratação acontece só aqui, no desenho — se o editor guardasse o
    // hidratado, salvaria "color": 394778 no lugar de "#06061a" e o round-trip
    // não fecharia.
    buildScenery(game, phase, hydrate(specRef.current));

    const cam = camRef.current;
    game.bgLayer.x = -cam * LAYERS.bg;
    game.midLayer.x = -cam * LAYERS.mid;
    game.gameLayer.x = -cam * LAYERS.game;
    game.fgLayer.x = -cam * LAYERS.fg;

    // Camada de interação. Nunca entra no que é salvo.
    overlay.removeChildren().forEach((c) => c.destroy());
    const g = new Graphics();

    // Linha do chão: a referência de quase toda âncora.
    g.moveTo(0, GROUND_Y).lineTo(CW, GROUND_Y);
    g.stroke({ color: 0x22c55e, width: 1, alpha: 0.35 });

    // Régua a cada 100px de mundo, para saber onde se está nos 2500.
    for (let x = Math.floor(cam / 100) * 100; x < cam + CW; x += 100) {
      const sx = x - cam;
      g.moveTo(sx, 0).lineTo(sx, 8);
      g.stroke({ color: 0x8892b0, width: 1, alpha: 0.5 });
    }

    const i = selRef.current;
    const el = specRef.current.elements[i];
    if (el) {
      const tex = textureFor(game.textures.scenery, el.asset);
      if (tex) {
        const b = boundsOf(el, tex, specRef.current.levelWidth);
        const sx = b.x - cam * LAYERS[el.layer];
        g.rect(sx - 1, b.y - 1, b.w + 2, b.h + 2);
        g.stroke({ color: 0xffd700, width: 1 });
      }
    }
    overlay.addChild(g);
  }, [phase]);

  useEffect(() => {
    if (pronto) redesenhar();
  }, [pronto, spec, cameraX, sel, redesenhar]);

  // ── seleção e arrasto ───────────────────────────────────────────────────
  const paraMundo = (ev, layer) => {
    const r = ev.currentTarget.getBoundingClientRect();
    const sx = (ev.clientX - r.left) / ZOOM;
    const sy = (ev.clientY - r.top) / ZOOM;
    return { x: sx + camRef.current * LAYERS[layer], y: sy, sx, sy };
  };

  const acharEm = (sx, sy) => {
    const game = gameRef.current;
    if (!game) return -1;
    const els = specRef.current.elements;
    // De trás para frente: o que está por cima ganha o clique.
    for (let i = els.length - 1; i >= 0; i--) {
      const el = els[i];
      const tex = textureFor(game.textures.scenery, el.asset);
      if (!tex) continue;
      const b = boundsOf(el, tex, specRef.current.levelWidth);
      const x = b.x - camRef.current * LAYERS[el.layer];
      if (sx >= x && sx <= x + b.w && sy >= b.y && sy <= b.y + b.h) return i;
    }
    return -1;
  };

  const onMouseDown = (ev) => {
    // Sem cena montada não há o que acertar: buildScene carrega o elenco
    // inteiro antes de devolver o jogo, e até lá um clique não faz nada. Sem
    // esta guarda, ele silenciosamente não fazia — e a barra de status dizia
    // "montando a cena" enquanto o usuário achava que tinha errado a mira.
    if (!pronto) return;
    const r = ev.currentTarget.getBoundingClientRect();
    const sx = (ev.clientX - r.left) / ZOOM;
    const sy = (ev.clientY - r.top) / ZOOM;
    const i = acharEm(sx, sy);
    setSel(i);
    if (i >= 0) {
      const el = specRef.current.elements[i];
      dragRef.current = { i, sx, sy, x0: el.x ?? 0, y0: el.y };
    }
  };

  const onMouseMove = (ev) => {
    const d = dragRef.current;
    if (!d) return;
    const r = ev.currentTarget.getBoundingClientRect();
    const sx = (ev.clientX - r.left) / ZOOM;
    const sy = (ev.clientY - r.top) / ZOOM;
    // A âncora decide o que o y significa, então o arrasto vertical grava no
    // campo certo sem o usuário precisar saber disso. E o x de um elemento que
    // repete é o INÍCIO da série: arrastar desliza a fileira inteira, que é o
    // que se vê acontecer e o que permite intercalar duas faixas de fundo em
    // vez de as duas começarem coladas em zero.
    patch(d.i, {
      x: Math.round(d.x0 + (sx - d.sx)),
      y: Math.round(d.y0 + (sy - d.sy)),
    });
  };

  const onMouseUp = () => {
    dragRef.current = null;
  };

  // ── edição ──────────────────────────────────────────────────────────────
  const patch = (i, campos) =>
    setSpec((s) => {
      const els = s.elements.slice();
      els[i] = { ...els[i], ...campos };
      for (const [k, v] of Object.entries(campos)) if (v === undefined) delete els[i][k];
      return { ...s, elements: els };
    });

  /**
   * Clique na paleta: com um elemento selecionado, TROCA o asset dele; sem
   * seleção, insere um novo no centro da vista. Trocar é o caso mais comum ao
   * compor — experimentar qual objeto fica melhor naquele ponto sem perder
   * posição, camada, âncora e repetição já ajustadas.
   */
  const daPaleta = (asset) => {
    const i = selRef.current;
    if (i >= 0) {
      patch(i, { asset });
      return;
    }
    setSpec((s) => ({
      ...s,
      elements: [
        ...s.elements,
        { asset, layer: "game", anchor: "chao", x: Math.round(camRef.current + CW / 2), y: 0 },
      ],
    }));
    setSel(specRef.current.elements.length);
  };

  const remover = useCallback(() => {
    const i = selRef.current;
    if (i < 0) return;
    setSpec((s) => ({ ...s, elements: s.elements.filter((_, k) => k !== i) }));
    setSel(-1);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement?.tagName === "INPUT") return;
        e.preventDefault();
        remover();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [remover]);

  const salvar = async () => {
    setStatus("gravando...");
    try {
      const r = await fetch("/api/dev/fases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase, scenery: spec }),
      });
      const d = await r.json();
      setStatus(r.ok ? `fase ${phase} gravada (${d.elementos} elementos)` : (d.erros || [d.erro]).join(" · "));
    } catch (e) {
      setStatus(`falhou: ${e.message}`);
    }
  };

  const el = spec.elements[sel];
  const maxCam = Math.max(0, spec.levelWidth - CW);

  return (
    <div style={S.wrap}>
      <div style={S.topo}>
        <button onClick={onBack} style={S.btn}>&#9664; VOLTAR</button>
        <span style={S.titulo}>EDITOR &mdash; FASE {phase}</span>
        <span style={S.info}>{spec.elements.length} elementos &middot; {spec.levelWidth}px</span>
        <button onClick={salvar} style={{ ...S.btn, color: "#22c55e", borderColor: "#22c55e" }}>
          SALVAR
        </button>
        <span style={S.status}>{status}</span>
      </div>

      {!pronto && <p style={S.carregando}>montando a cena&hellip;</p>}

      <div
        ref={hostRef}
        data-pronto={pronto ? "1" : "0"}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ width: CW * ZOOM, height: CH * ZOOM, lineHeight: 0 }}
      />

      <input
        type="range"
        min={0}
        max={maxCam}
        value={Math.min(cameraX, maxCam)}
        onChange={(e) => setCameraX(Number(e.target.value))}
        style={{ width: CW * ZOOM, marginTop: 6 }}
        aria-label="posição na fase"
      />

      <div style={S.colunas}>
        <div style={S.painel}>
          <p style={S.rotulo}>
            PALETA &mdash; {sel >= 0 ? "troca o selecionado" : "insere no centro da vista"}
          </p>
          <div style={S.paleta}>
            {assets.map((a) => (
              <button key={a} onClick={() => daPaleta(a)} style={S.chip} title={a}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div style={S.painel}>
          <p style={S.rotulo}>SELECIONADO</p>
          {!el && <p style={S.vazio}>clique num elemento da cena</p>}
          {el && (
            <div style={{ display: "grid", gap: 6 }}>
              <p style={S.asset}>{el.asset}</p>

              <label style={S.campo}>
                camada
                <select value={el.layer} onChange={(e) => patch(sel, { layer: e.target.value })} style={S.input}>
                  {Object.keys(LAYERS).map((l) => (
                    <option key={l} value={l}>{l} &mdash; parallax {LAYERS[l]}</option>
                  ))}
                </select>
              </label>

              <label style={S.campo}>
                âncora
                <select value={el.anchor} onChange={(e) => patch(sel, { anchor: e.target.value })} style={S.input}>
                  <option value="chao">chão &mdash; pé no chão, y afunda</option>
                  <option value="topo">topo &mdash; pixel do topo da tela</option>
                  <option value="horizonte">horizonte &mdash; sobre a linha do chão</option>
                </select>
              </label>

              <label style={S.campo}>
                altura (y)
                <input type="number" value={el.y} onChange={(e) => patch(sel, { y: Number(e.target.value) })} style={S.input} />
              </label>

              <label style={S.campo}>
                <span>
                  <input
                    type="checkbox"
                    checked={!!el.repeat}
                    onChange={(e) =>
                      patch(sel, e.target.checked
                        ? { repeat: { every: 300 }, x: el.x ?? Math.round(cameraX + CW / 2) }
                        : { repeat: undefined, x: el.x ?? Math.round(cameraX + CW / 2) })
                    }
                  />{" "}
                  repete
                </span>
              </label>

              <label style={S.campo}>
                {el.repeat ? "início (x)" : "posição (x)"}
                <input type="number" value={el.x ?? 0}
                  onChange={(e) => patch(sel, { x: Number(e.target.value) })} style={S.input} />
              </label>

              {el.repeat && (
                <label style={S.campo}>
                  a cada
                  <span style={{ display: "flex", gap: 4 }}>
                    <input
                      type="number"
                      value={el.repeat.every === "auto" ? "" : el.repeat.every}
                      disabled={el.repeat.every === "auto"}
                      onChange={(e) => patch(sel, { repeat: { every: Number(e.target.value) || 1 } })}
                      style={{ ...S.input, flex: 1 }}
                    />
                    <button
                      onClick={() =>
                        patch(sel, { repeat: { every: el.repeat.every === "auto" ? 300 : "auto" } })
                      }
                      style={{ ...S.btn, padding: "2px 6px" }}
                      title="emenda sem costura, usando a largura do próprio sprite"
                    >
                      {el.repeat.every === "auto" ? "auto ✓" : "auto"}
                    </button>
                  </span>
                </label>
              )}

              <label style={S.campo}>
                escala
                <input type="number" step="0.1" value={el.scale ?? 1}
                  onChange={(e) => patch(sel, { scale: Number(e.target.value) || undefined })} style={S.input} />
              </label>

              <label style={S.campo}>
                alfa
                <input type="number" step="0.05" min="0" max="1" value={el.alpha ?? 1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    patch(sel, { alpha: v >= 1 ? undefined : v });
                  }} style={S.input} />
              </label>

              <button onClick={remover} style={{ ...S.btn, color: "#dc2626", borderColor: "#dc2626" }}>
                REMOVER (Delete)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Tipografia de painel de trabalho, não a do jogo.
//
// A primeira versão herdou os 8-10px e o cinza apagado do menu retrô do Kung Fu
// Castle. No menu isso funciona: são cinco botões olhados por dois segundos.
// Aqui não — este painel é lido e operado por minutos seguidos, com números que
// precisam ser conferidos e nomes de asset que precisam ser distinguidos entre
// 49 parecidos. Nada abaixo de 11px, e o cinza dos rótulos subiu de #8892b0
// para #b8c4d0 (contraste ~9:1 sobre o fundo, contra ~6:1 antes).
const S = {
  wrap: { fontFamily: "'Fira Code', monospace", color: "#e6edf3", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  topo: { display: "flex", gap: 12, alignItems: "center", width: CW * ZOOM, marginBottom: 8, flexWrap: "wrap" },
  titulo: { fontSize: 13, letterSpacing: 2, color: "#ffd700" },
  info: { fontSize: 11, color: "#b8c4d0", marginLeft: "auto" },
  status: { fontSize: 11, color: "#b8c4d0", flexBasis: "100%", minHeight: 15 },
  btn: { fontFamily: "inherit", fontSize: 11, color: "#c9d1d9", background: "transparent", border: "1px solid #484f58", borderRadius: 4, padding: "5px 12px", cursor: "pointer" },
  colunas: { display: "flex", gap: 14, width: CW * ZOOM, marginTop: 10, alignItems: "flex-start" },
  painel: { flex: 1, border: "1px solid #30363d", borderRadius: 6, padding: 10, minWidth: 0 },
  rotulo: { fontSize: 11, letterSpacing: 2, color: "#b8c4d0", marginBottom: 8 },
  paleta: { display: "flex", flexWrap: "wrap", gap: 5, maxHeight: 220, overflowY: "auto" },
  chip: { fontFamily: "inherit", fontSize: 11, color: "#dbe3ea", background: "#161b22", border: "1px solid #444c56", borderRadius: 4, padding: "4px 7px", cursor: "pointer" },
  campo: { display: "grid", gap: 3, fontSize: 11, color: "#b8c4d0" },
  input: { fontFamily: "inherit", fontSize: 13, color: "#f0f6fc", background: "#0d1117", border: "1px solid #444c56", borderRadius: 4, padding: "5px 7px", width: "100%" },
  asset: { fontSize: 14, color: "#ffd700", marginBottom: 2 },
  vazio: { fontSize: 11, color: "#8b949e" },
  carregando: { fontSize: 12, color: "#ffd700", padding: "4px 0" },
};
