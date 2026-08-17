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
