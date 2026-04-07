"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Application, Sprite, Texture, Rectangle, Assets, Graphics, Text, TextStyle } from "pixi.js";

// ── Complete sprite inventory from filesystem ─────────────────────────────

const SPRITE_CATALOG = {
  player: {
    label: "Player (Karateca)",
    frameH: 48,
    anims: {
      idle: "idle.png", walk: "walk.png", run: "run.png", turn: "turn.png",
      punch: "punch.png", kick: "kick.png", "flying-kick": "flying-kick.png",
      sweep: "sweep.png", jump: "jump.png", crouch: "crouch.png",
      hit: "hit.png", special: "special.png",
    },
    basePath: "/images/kungfucastle/player",
  },
  "capanga-branco": {
    label: "Capanga Branco",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", punch: "punch.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/capanga-branco",
  },
  "capanga-cinza": {
    label: "Capanga Cinza",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", punch: "punch.png", kick: "kick.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/capanga-cinza",
  },
  "capanga-rapido": {
    label: "Capanga Rapido",
    frameH: 48,
    anims: { idle: "idle.png", run: "run.png", punch: "punch.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/capanga-rapido",
  },
  "guarda-bastao": {
    label: "Guarda Bastao",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", punch: "punch.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/guarda-bastao",
  },
  atirador: {
    label: "Atirador",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", throw: "throw.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/atirador",
  },
  ninja: {
    label: "Ninja",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", punch: "punch.png", kick: "kick.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/ninja",
  },
  "ninja-espada": {
    label: "Ninja Espada",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", slash: "slash.png", kick: "kick.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/ninja-espada",
  },
  samurai: {
    label: "Samurai",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", punch: "punch.png", kick: "kick.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/samurai",
  },
  kunoichi: {
    label: "Kunoichi",
    frameH: 48,
    anims: { idle: "idle.png", run: "run.png", "flying-kick": "flying-kick.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/kunoichi",
  },
  "lancador-bomba": {
    label: "Lancador Bomba",
    frameH: 48,
    anims: { idle: "idle.png", walk: "walk.png", throw: "throw.png", hit: "hit.png" },
    basePath: "/images/kungfucastle/enemies/lancador-bomba",
  },
  "mestre-capangas": {
    label: "Boss: Mestre Capangas",
    frameH: 68,
    anims: {
      idle: "idle.png", walk: "walk.png", punch: "punch.png", charge: "charge.png",
      stomp: "stomp.png", grab: "grab.png", "war-cry": "war-cry.png",
      stunned: "stunned.png", windup: "windup.png", hit: "hit.png", death: "death.png",
    },
    basePath: "/images/kungfucastle/bosses/mestre-capangas",
  },
  "guardiao-portao": {
    label: "Boss: Guardiao Portao",
    frameH: 68,
    anims: {
      idle: "idle.png", walk: "walk.png", charge: "charge.png",
      "horizontal-swing": "horizontal-swing.png", "overhead-smash": "overhead-smash.png",
      earthquake: "earthquake.png", "shield-block": "shield-block.png",
      kick: "kick.png", taunt: "taunt.png", stuck: "stuck.png",
      hit: "hit.png", death: "death.png",
    },
    basePath: "/images/kungfucastle/bosses/guardiao-portao",
  },
  "senhor-sombras": {
    label: "Boss: Senhor Sombras",
    frameH: 68,
    anims: {
      idle: "idle.png", walk: "walk.png", clone: "clone.png",
      "dash-kick": "dash-kick.png", "ninja-combo": "ninja-combo.png",
      "shadow-strike": "shadow-strike.png", "shadow-sweep": "shadow-sweep.png",
      shuriken: "shuriken.png", "smoke-bomb": "smoke-bomb.png",
      vanish: "vanish.png", hit: "hit.png", death: "death.png",
    },
    basePath: "/images/kungfucastle/bosses/senhor-sombras",
  },
  "general-oni": {
    label: "Boss: General Oni",
    frameH: 68,
    anims: {
      idle: "idle.png", walk: "walk.png", "counter-slash": "counter-slash.png",
      "cross-block": "cross-block.png", "crushing-leap": "crushing-leap.png",
      "demon-fury": "demon-fury.png", "dual-slash": "dual-slash.png",
      kick: "kick.png", "oni-roar": "oni-roar.png",
      "spin-blades": "spin-blades.png", summon: "summon.png",
      "thrust-lunge": "thrust-lunge.png", hit: "hit.png", death: "death.png",
    },
    basePath: "/images/kungfucastle/bosses/general-oni",
  },
  "senhor-castelo": {
    label: "Boss: Senhor Castelo",
    frameH: 92,
    anims: {
      idle: "idle.png", walk: "walk.png", "crescent-kick": "crescent-kick.png",
      devastation: "devastation.png", "draw-sword": "draw-sword.png",
      "flying-kick": "flying-kick.png", "imperial-combo": "imperial-combo.png",
      "ki-barrier": "ki-barrier.png", "ki-blast": "ki-blast.png",
      "steel-palm": "steel-palm.png", "summon-ninjas": "summon-ninjas.png",
      "supreme-strike": "supreme-strike.png", "sword-slash": "sword-slash.png",
      "teleport-in": "teleport-in.png", "teleport-out": "teleport-out.png",
      hit: "hit.png", death: "death.png",
    },
    basePath: "/images/kungfucastle/bosses/senhor-castelo",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────

function cutSheet(texture, fh) {
  const count = Math.round(texture.width / fh);
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push(new Texture({ source: texture.source, frame: new Rectangle(i * fh, 0, fh, fh) }));
  }
  return frames;
}

// ── Styles ────────────────────────────────────────────────────────────────

const S = {
  wrapper: {
    height: "100vh", overflow: "auto", background: "#111",
    display: "flex", flexDirection: "column", alignItems: "center",
    fontFamily: "'Fira Code', monospace", padding: 12, paddingTop: 60, color: "#ccd6f6",
  },
  title: {
    fontFamily: "'Press Start 2P', monospace", fontSize: 14,
    color: "#dc2626", marginBottom: 16, textAlign: "center",
  },
  controls: {
    display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center",
    marginBottom: 12, maxWidth: 800, width: "100%",
  },
  select: {
    background: "#1a1a2e", color: "#ccd6f6", border: "1px solid #333",
    borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "'Fira Code', monospace",
    cursor: "pointer", minWidth: 150,
  },
  canvas: {
    background: "#ffffff", borderRadius: 8, border: "2px solid #444",
    imageRendering: "pixelated",
  },
  info: {
    display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center",
    fontSize: 11, color: "#8892b0", marginTop: 10,
  },
  slider: {
    accentColor: "#dc2626", width: 120, cursor: "pointer",
  },
  label: { fontSize: 10, color: "#4a5568", marginBottom: 2 },
  back: {
    fontFamily: "'Press Start 2P', monospace", fontSize: 10,
    color: "#ccd6f6", background: "transparent", border: "1px solid #333",
    borderRadius: 6, padding: "8px 18px", cursor: "pointer", marginTop: 16,
  },
  strip: {
    marginTop: 12, background: "#ffffff", borderRadius: 6,
    border: "1px solid #444", padding: 8, display: "flex",
    gap: 2, overflowX: "auto", maxWidth: "90vw",
  },
  frameImg: {
    imageRendering: "pixelated", border: "1px solid #ddd",
  },
  frameLabel: { fontSize: 8, color: "#888", textAlign: "center" },
};

// ── Component ─────────────────────────────────────────────────────────────

export default function KungFuSpriteTest({ onBack }) {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const spriteRef = useRef(null);
  const animRef = useRef({ frames: [], index: 0, timer: 0, speed: 0.12 });

  const charKeys = Object.keys(SPRITE_CATALOG);
  const [charKey, setCharKey] = useState(charKeys[0]);
  const [animKey, setAnimKey] = useState("");
  const [speed, setSpeed] = useState(8);
  const [zoom, setZoom] = useState(4);
  const [frameInfo, setFrameInfo] = useState({ count: 0, size: 0, current: 0 });
  const [playing, setPlaying] = useState(true);
  const [stripFrames, setStripFrames] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  const char = SPRITE_CATALOG[charKey];
  const animKeys = Object.keys(char.anims);

  // Init Pixi
  useEffect(() => {
    const app = new Application();
    let destroyed = false;

    (async () => {
      await app.init({
        width: 200, height: 200,
        backgroundColor: 0xffffff,
        antialias: false,
        resolution: 1,
      });
      if (destroyed) { app.destroy(); return; }

      canvasRef.current?.appendChild(app.canvas);
      Object.assign(app.canvas.style, S.canvas);
      appRef.current = app;

      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(0.5, 0.5);
      app.stage.addChild(sprite);
      spriteRef.current = sprite;

      // Grid overlay (drawn behind sprite)
      const grid = new Graphics();
      grid.alpha = 0.08;
      app.stage.addChildAt(grid, 0);

      // Frame counter text
      const txt = new Text({ text: "", style: new TextStyle({ fontSize: 9, fill: 0x999999, fontFamily: "monospace" }) });
      txt.anchor.set(0.5, 0);
      app.stage.addChild(txt);

      app.ticker.add((ticker) => {
        const a = animRef.current;
        if (!a.frames.length || !spriteRef.current) return;

        const s = spriteRef.current;
        const z = s._zoom || 4;
        const fh = s._frameH || 48;
        const canvasSize = fh * z + 40;

        app.renderer.resize(canvasSize, canvasSize);
        s.x = canvasSize / 2;
        s.y = canvasSize / 2;
        s.scale.set(z);
        txt.x = canvasSize / 2;
        txt.y = canvasSize - 14;

        // Grid
        grid.clear();
        const ox = canvasSize / 2 - (fh * z) / 2;
        const oy = canvasSize / 2 - (fh * z) / 2;
        for (let i = 0; i <= fh; i++) {
          grid.moveTo(ox + i * z, oy).lineTo(ox + i * z, oy + fh * z).stroke({ color: 0x000000, width: 1 });
          grid.moveTo(ox, oy + i * z).lineTo(ox + fh * z, oy + i * z).stroke({ color: 0x000000, width: 1 });
        }

        if (a.playing) {
          a.timer += a.speed * ticker.deltaTime;
          if (a.timer >= 1) {
            a.timer -= 1;
            a.index = (a.index + 1) % a.frames.length;
            s.texture = a.frames[a.index];
          }
        }

        txt.text = `frame ${a.index + 1}/${a.frames.length}`;
        setFrameInfo({ count: a.frames.length, size: fh, current: a.index + 1 });
      });
    })();

    return () => {
      destroyed = true;
      appRef.current?.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  // Load animation when char/anim changes
  const loadAnim = useCallback(async (ck, ak) => {
    const c = SPRITE_CATALOG[ck];
    if (!c || !c.anims[ak]) return;

    const src = `${c.basePath}/${c.anims[ak]}`;
    Assets.setPreferences({ preferWorkers: false });

    try {
      // Force reload: unload cached asset first
      if (Assets.cache.has(src)) {
        Assets.unload(src);
      }
      const tex = await Assets.load(src);
      const frames = cutSheet(tex, c.frameH);

      animRef.current = { frames, index: 0, timer: 0, speed: speed / 60, playing };
      if (spriteRef.current) {
        spriteRef.current.texture = frames[0];
        spriteRef.current._zoom = zoom;
        spriteRef.current._frameH = c.frameH;
      }

      // Build strip preview URLs
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = tex.width;
      canvas.height = tex.height;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      await new Promise((r) => { img.onload = r; img.onerror = r; });
      ctx.drawImage(img, 0, 0);

      const strips = [];
      for (let i = 0; i < frames.length; i++) {
        const fc = document.createElement("canvas");
        fc.width = c.frameH;
        fc.height = c.frameH;
        const fctx = fc.getContext("2d");
        fctx.drawImage(canvas, i * c.frameH, 0, c.frameH, c.frameH, 0, 0, c.frameH, c.frameH);
        strips.push(fc.toDataURL());
      }
      setStripFrames(strips);
    } catch (e) {
      console.warn("[SpriteTest] Failed to load:", src, e);
      animRef.current = { frames: [], index: 0, timer: 0, speed: 0.12, playing: true };
      setStripFrames([]);
    }
  }, [speed, zoom, playing]);

  // Set default anim when char changes
  useEffect(() => {
    const firstAnim = Object.keys(SPRITE_CATALOG[charKey].anims)[0];
    setAnimKey(firstAnim);
  }, [charKey]);

  // Load when animKey changes or reload requested
  useEffect(() => {
    if (animKey) loadAnim(charKey, animKey);
  }, [charKey, animKey, loadAnim, reloadKey]);

  // Update speed/zoom/playing on the fly
  useEffect(() => {
    animRef.current.speed = speed / 60;
  }, [speed]);

  useEffect(() => {
    if (spriteRef.current) spriteRef.current._zoom = zoom;
  }, [zoom]);

  useEffect(() => {
    animRef.current.playing = playing;
  }, [playing]);

  // Step frame manually
  const stepFrame = (dir) => {
    const a = animRef.current;
    if (!a.frames.length) return;
    a.index = (a.index + dir + a.frames.length) % a.frames.length;
    if (spriteRef.current) spriteRef.current.texture = a.frames[a.index];
  };

  return (
    <div style={S.wrapper}>
      <h2 style={S.title}>SPRITE TEST</h2>

      {/* Selectors */}
      <div style={S.controls}>
        <div>
          <div style={S.label}>Character</div>
          <select style={S.select} value={charKey} onChange={(e) => setCharKey(e.target.value)}>
            {charKeys.map((k) => (
              <option key={k} value={k}>{SPRITE_CATALOG[k].label}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={S.label}>Animation</div>
          <select style={S.select} value={animKey} onChange={(e) => setAnimKey(e.target.value)}>
            {animKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>
        <div>
          <div style={S.label}>Speed: {speed} fps</div>
          <input type="range" min={1} max={30} value={speed} onChange={(e) => setSpeed(+e.target.value)} style={S.slider} />
        </div>
        <div>
          <div style={S.label}>Zoom: {zoom}x</div>
          <input type="range" min={1} max={10} value={zoom} onChange={(e) => setZoom(+e.target.value)} style={S.slider} />
        </div>
      </div>

      {/* Playback controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button onClick={() => stepFrame(-1)} style={{ ...S.back, marginTop: 0, padding: "4px 12px" }}>&lt;</button>
        <button onClick={() => setPlaying(!playing)} style={{ ...S.back, marginTop: 0, padding: "4px 16px", color: playing ? "#22c55e" : "#dc2626" }}>
          {playing ? "||" : "\u25B6"}
        </button>
        <button onClick={() => stepFrame(1)} style={{ ...S.back, marginTop: 0, padding: "4px 12px" }}>&gt;</button>
        <button onClick={() => setReloadKey((k) => k + 1)} style={{ ...S.back, marginTop: 0, padding: "4px 14px" }} title="Reload sprite">
          &#x21bb;
        </button>
      </div>

      {/* Canvas */}
      <div ref={canvasRef} />

      {/* Info */}
      <div style={S.info}>
        <span>Frames: {frameInfo.count}</span>
        <span>Size: {frameInfo.size}x{frameInfo.size}px</span>
        <span>Current: {frameInfo.current}/{frameInfo.count}</span>
      </div>

      {/* Frame strip */}
      {stripFrames.length > 0 && (
        <div style={S.strip}>
          {stripFrames.map((src, i) => (
            <div key={i} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => {
              animRef.current.index = i;
              if (spriteRef.current && animRef.current.frames[i]) {
                spriteRef.current.texture = animRef.current.frames[i];
              }
              setPlaying(false);
            }}>
              <img src={src} width={char.frameH * 2} height={char.frameH * 2} style={S.frameImg} alt={`frame ${i}`} />
              <div style={S.frameLabel}>{i + 1}</div>
            </div>
          ))}
        </div>
      )}

      <button onClick={onBack} style={S.back}>VOLTAR</button>
    </div>
  );
}
