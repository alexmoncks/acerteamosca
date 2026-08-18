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

  const [spec, setSpec] = useState(() => clone(PHASE_SCENERY[phase]));
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
    buildScenery(game, phase, specRef.current);

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
      const tex = game.textures.scenery.props[el.asset];
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
      const tex = game.textures.scenery.props[el.asset];
      if (!tex) continue;
      const b = boundsOf(el, tex, specRef.current.levelWidth);
      const x = b.x - camRef.current * LAYERS[el.layer];
      if (sx >= x && sx <= x + b.w && sy >= b.y && sy <= b.y + b.h) return i;
    }
    return -1;
  };

  const onMouseDown = (ev) => {
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
    const el = specRef.current.elements[d.i];
    // A âncora decide o que o y significa, então o arrasto vertical grava no
    // campo certo sem o usuário precisar saber disso.
    const dy = sy - d.sy;
    patch(d.i, {
      ...(el.repeat ? {} : { x: Math.round(d.x0 + (sx - d.sx)) }),
      y: Math.round(d.y0 + dy),
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

  const adicionar = (asset) => {
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

      <div
        ref={hostRef}
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
          <p style={S.rotulo}>PALETA</p>
          <div style={S.paleta}>
            {assets.map((a) => (
              <button key={a} onClick={() => adicionar(a)} style={S.chip} title={a}>
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
                        ? { repeat: { every: 300 }, x: 0 }
                        : { repeat: undefined, x: Math.round(cameraX + CW / 2) })
                    }
                  />{" "}
                  repete
                </span>
              </label>

              {el.repeat ? (
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
              ) : (
                <label style={S.campo}>
                  posição (x)
                  <input type="number" value={el.x ?? 0} onChange={(e) => patch(sel, { x: Number(e.target.value) })} style={S.input} />
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

const S = {
  wrap: { fontFamily: "'Fira Code', monospace", color: "#c9d1d9", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  topo: { display: "flex", gap: 10, alignItems: "center", width: CW * ZOOM, marginBottom: 6, flexWrap: "wrap" },
  titulo: { fontSize: 11, letterSpacing: 2, color: "#ffd700" },
  info: { fontSize: 9, color: "#8892b0", marginLeft: "auto" },
  status: { fontSize: 9, color: "#8892b0", flexBasis: "100%" },
  btn: { fontFamily: "inherit", fontSize: 9, color: "#8892b0", background: "transparent", border: "1px solid #333", borderRadius: 4, padding: "4px 10px", cursor: "pointer" },
  colunas: { display: "flex", gap: 12, width: CW * ZOOM, marginTop: 8, alignItems: "flex-start" },
  painel: { flex: 1, border: "1px solid #222", borderRadius: 6, padding: 8, minWidth: 0 },
  rotulo: { fontSize: 9, letterSpacing: 2, color: "#8892b0", marginBottom: 6 },
  paleta: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 180, overflowY: "auto" },
  chip: { fontFamily: "inherit", fontSize: 8, color: "#c9d1d9", background: "#161b22", border: "1px solid #30363d", borderRadius: 3, padding: "3px 5px", cursor: "pointer" },
  campo: { display: "grid", gap: 2, fontSize: 9, color: "#8892b0" },
  input: { fontFamily: "inherit", fontSize: 10, color: "#c9d1d9", background: "#0d1117", border: "1px solid #30363d", borderRadius: 3, padding: "3px 5px", width: "100%" },
  asset: { fontSize: 11, color: "#ffd700" },
  vazio: { fontSize: 9, color: "#4a5568" },
};
