// kungfu-scenery.js — declarative scenery description, one entry per phase.
// No PixiJS, no game state: values in, values out.

/**
 * @typedef {{ type: "starfield", color: number, stars: number }
 *          |{ type: "gradient", from: number, to: number }} SkySpec
 * @typedef {{ asset: string, parallax: number, tile?: boolean, every?: number,
 *             x?: number, scale?: number, alpha?: number,
 *             y?: "horizon" | "ground-overlap" | number }} Band
 * @typedef {{ asset: string, x: number, y: number, layer: "bg"|"game"|"fg" }} Prop
 */

export const PHASE_SCENERY = {
  1: {
    levelWidth: 2400,
    sky: { type: "starfield", color: 0x06061a, stars: 200 },
    bg: [
      { asset: "parallax-montanhas", tile: true, scale: 2.2, alpha: 0.6, y: "horizon", parallax: 0.15 },
    ],
    mid: [
      { asset: "parallax-arvores", tile: true, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase1-jardim",
    props: [
      { asset: "paifang",       x: 60,   y: 10, layer: "game" },
      { asset: "ameixeira",     x: 200,  y: 5,  layer: "bg" },
      { asset: "lanterna-papel",    x: 350,  y: 4,  layer: "fg" },
      { asset: "rocha-taihu",     x: 500,  y: 1,  layer: "game" },
      { asset: "ameixeira",     x: 700,  y: 5,  layer: "bg" },
      { asset: "shishi",              x: 850,  y: 2,  layer: "game" },
      { asset: "cerca-bambu",          x: 1000, y: 4,  layer: "fg" },
      { asset: "lanterna-papel",    x: 1150, y: 4,  layer: "fg" },
      { asset: "ameixeira",     x: 1350, y: 8,  layer: "fg" },
      { asset: "rocha-taihu",     x: 1500, y: 1,  layer: "game" },
      { asset: "shishi",              x: 1650, y: 4,  layer: "fg" },
      { asset: "lanterna-papel",    x: 1800, y: 2,  layer: "game" },
      { asset: "ameixeira",     x: 1950, y: 5,  layer: "bg" },
      { asset: "cerca-bambu",          x: 2100, y: 6,  layer: "fg" },
      { asset: "portao-arco-pedra",    x: 2300, y: 4,  layer: "game" },
      { asset: "escada-pedra-externa", x: 2370, y: 10, layer: "game" },
    ],
  },

  2: {
    levelWidth: 2600,
    // Twilight: warm orange at the horizon darkening to deep violet overhead.
    sky: { type: "gradient", from: 0x2a1b3d, to: 0xd97706 },
    bg: [
      { asset: "fase2-parallax-castelo", every: 520, alpha: 0.75, y: 180, parallax: 0.15 },
    ],
    mid: [
      { asset: "fase2-parallax-muralha", tile: true, y: "ground-overlap", parallax: 0.5 },
      { asset: "ponte-madeira", x: 900, scale: 2, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase2-portao-chao",
    props: [
      { asset: "portao-madeira",         x: 60,   y: 0, layer: "game" },
      { asset: "tocha-fogo",             x: 180,  y: 2, layer: "fg" },
      { asset: "estandarte",             x: 240,  y: 6, layer: "fg" },
      { asset: "shishi",                x: 340,  y: 2, layer: "game" },
      { asset: "braseiro-fogo",          x: 420,  y: 1, layer: "game" },
      { asset: "pilar-ornamentado",      x: 520,  y: 0, layer: "game" },
      { asset: "tocha-fogo",             x: 620,  y: 2, layer: "fg" },
      { asset: "estandarte",             x: 780,  y: 6, layer: "fg" },
      { asset: "tocha-fogo",             x: 1180, y: 2, layer: "fg" },
      { asset: "braseiro-fogo",          x: 1360, y: 1, layer: "game" },
      { asset: "estandarte",             x: 1500, y: 6, layer: "fg" },
      { asset: "pilar-ornamentado",      x: 1600, y: 0, layer: "game" },
      { asset: "tocha-fogo",             x: 1740, y: 2, layer: "fg" },
      { asset: "braseiro-fogo",          x: 2000, y: 1, layer: "game" },
      { asset: "estandarte",             x: 2100, y: 6, layer: "fg" },
      { asset: "shishi",                x: 2260, y: 2, layer: "game" },
      { asset: "tocha-fogo",             x: 2280, y: 2, layer: "fg" },
      { asset: "portao-madeira-aberto",  x: 2500, y: 0, layer: "game" },
    ],
  },

  // Fase 3 — Salão Principal (大殿). Primeiro interior: o campo `sky` não pinta
  // firmamento nenhum, é o mesmo Graphics servindo de parede ao fundo. Daí o
  // gradiente escuro e fechado, sem horizonte claro.
  3: {
    levelWidth: 2500,
    sky: { type: "gradient", from: 0x0f0b16, to: 0x2c1f2c },
    bg: [
      // Treliça de madeira repetida ao fundo: a parede do salão. `every` maior
      // que a largura do painel deixa respiro entre eles, como vãos de janela.
      { asset: "trelica-madeira", every: 300, alpha: 0.5, y: 150, parallax: 0.15 },
    ],
    mid: [
      // Colunata: pilares mais próximos, passando mais rápido que a parede.
      { asset: "pilar-ornamentado", every: 470, alpha: 0.85, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase3-salao",
    props: [
      { asset: "portal-lua",          x: 80,   y: 0,  layer: "game" },
      { asset: "vaso-porcelana",      x: 260,  y: 1,  layer: "game" },
      { asset: "trelica-madeira",     x: 380,  y: 6,  layer: "bg"   },
      { asset: "armadura-lamelar",    x: 520,  y: 2,  layer: "game" },
      { asset: "janela-lua",          x: 700,  y: 10, layer: "bg"   },
      { asset: "biombo-dourado",      x: 860,  y: 3,  layer: "game" },
      { asset: "jian-suporte",        x: 1040, y: 8,  layer: "fg"   },
      { asset: "vaso-porcelana",      x: 1180, y: 1,  layer: "game" },
      { asset: "cortina-rasgada",     x: 1300, y: 12, layer: "fg"   },
      { asset: "trelica-madeira",     x: 1440, y: 6,  layer: "bg"   },
      { asset: "armadura-lamelar",    x: 1600, y: 2,  layer: "game" },
      { asset: "janela-lua",          x: 1760, y: 10, layer: "bg"   },
      { asset: "biombo-dourado",      x: 1920, y: 3,  layer: "game" },
      { asset: "jian-suporte",        x: 2080, y: 8,  layer: "fg"   },
      { asset: "vaso-porcelana",      x: 2200, y: 1,  layer: "game" },
      // Fecho da fase: a escada que sobe para os aposentos nobres da fase 4.
      { asset: "escada-ornada-tapete", x: 2380, y: 0, layer: "game" },
    ],
  },

  // Fase 4 — Torre (塔樓). Andares nobres do pagode: madeira escura polida,
  // luz quente de lanterna. O gradiente vai de carmesim a dourado — não é
  // pôr-do-sol, é o próprio interior iluminado a fogo.
  4: {
    levelWidth: 2500,
    sky: { type: "gradient", from: 0x2a0d12, to: 0x7a4410 },
    bg: [
      { asset: "trelica-madeira", every: 340, alpha: 0.4, y: 140, parallax: 0.15 },
    ],
    mid: [
      { asset: "pilar-ornamentado", every: 430, alpha: 0.9, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase4-madeira",
    props: [
      { asset: "porta-pedra-espiral",  x: 60,   y: 0,  layer: "game" },
      { asset: "lanterna-seda",        x: 210,  y: 4,  layer: "fg"   },
      { asset: "biombo-dourado",       x: 340,  y: 3,  layer: "game" },
      { asset: "vaso-porcelana",       x: 500,  y: 1,  layer: "game" },
      { asset: "pergaminho-kakejiku",  x: 640,  y: 12, layer: "bg"   },
      { asset: "lanterna-seda",        x: 800,  y: 4,  layer: "fg"   },
      { asset: "janela-lua",           x: 940,  y: 10, layer: "bg"   },
      { asset: "armadura-lamelar",     x: 1100, y: 2,  layer: "game" },
      { asset: "biombo-dourado",       x: 1260, y: 3,  layer: "game" },
      { asset: "lanterna-seda",        x: 1420, y: 4,  layer: "fg"   },
      { asset: "vaso-porcelana",       x: 1560, y: 1,  layer: "game" },
      { asset: "pergaminho-kakejiku",  x: 1700, y: 12, layer: "bg"   },
      { asset: "jian-suporte",         x: 1860, y: 8,  layer: "fg"   },
      { asset: "lanterna-seda",        x: 2000, y: 4,  layer: "fg"   },
      { asset: "janela-lua",           x: 2140, y: 10, layer: "bg"   },
      { asset: "cortina-rasgada",      x: 2260, y: 12, layer: "fg"   },
      // Escada estreita em espiral com tochas na parede: sobe para o pavilhão.
      { asset: "escada-espiral-tochas", x: 2400, y: 0, layer: "game" },
    ],
  },

  // Fase 5 — Pavilhão do Topo (頂閣). Sala do trono, a céu aberto no alto da
  // torre: aqui o starfield volta a ser céu de verdade, e é o mais escuro do
  // jogo. Piso de pedra cerimonial roxa.
  5: {
    levelWidth: 2200,
    sky: { type: "starfield", color: 0x04030c, stars: 260 },
    bg: [
      { asset: "pilar-ornamentado", every: 380, alpha: 0.45, y: 120, parallax: 0.15 },
    ],
    mid: [
      { asset: "cortina-rasgada", every: 520, alpha: 0.6, y: "ground-overlap", parallax: 0.5 },
    ],
    tileset: "fase5-cerimonial",
    props: [
      { asset: "braseiro-fogo",       x: 120,  y: 1,  layer: "game" },
      { asset: "pilar-ornamentado",   x: 260,  y: 0,  layer: "game" },
      { asset: "janela-lua",          x: 420,  y: 10, layer: "bg"   },
      { asset: "cortina-rasgada",     x: 560,  y: 12, layer: "fg"   },
      { asset: "braseiro-fogo",       x: 700,  y: 1,  layer: "game" },
      { asset: "pilar-ornamentado",   x: 860,  y: 0,  layer: "game" },
      { asset: "tocha-fogo",          x: 1000, y: 2,  layer: "fg"   },
      { asset: "janela-lua",          x: 1140, y: 10, layer: "bg"   },
      { asset: "braseiro-fogo",       x: 1300, y: 1,  layer: "game" },
      { asset: "cortina-rasgada",     x: 1440, y: 12, layer: "fg"   },
      { asset: "pilar-ornamentado",   x: 1580, y: 0,  layer: "game" },
      { asset: "tocha-fogo",          x: 1720, y: 2,  layer: "fg"   },
      // O fim do jogo: trono ao fundo, princesa amarrada ao lado dele.
      { asset: "trono-sombrio",       x: 1980, y: 0,  layer: "bg"   },
      { asset: "princesa-amarrada",   x: 2090, y: 2,  layer: "game" },
      { asset: "braseiro-fogo",       x: 1900, y: 1,  layer: "game" },
    ],
  },
};

/** Public path for a tileset name. */
const tilesetPath = (name) => `/images/kungfucastle/tiles/${name}.png`;

/** Public path for a prop or parallax asset name. */
const propPath = (name) => `/images/kungfucastle/props/${name}.png`;

/**
 * Every public asset path any phase's scenery needs, de-duplicated.
 * kungfu-assets.js feeds this straight into Assets.load().
 * @returns {string[]}
 */
export function sceneryAssetPaths() {
  const set = new Set();
  for (const phase of Object.values(PHASE_SCENERY)) {
    set.add(tilesetPath(phase.tileset));
    for (const band of [...phase.bg, ...phase.mid]) set.add(propPath(band.asset));
    for (const prop of phase.props) set.add(propPath(prop.asset));
  }
  return [...set];
}

/** Names of every tileset used across phases. */
export function sceneryTilesetNames() {
  return [...new Set(Object.values(PHASE_SCENERY).map((p) => p.tileset))];
}
