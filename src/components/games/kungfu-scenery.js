// kungfu-scenery.js — carrega os JSON de cenário e expõe a mesma interface
// pública de sempre. A lógica vive em kungfu-scenery-lib.js; aqui só entram os
// dados, porque este arquivo importa JSON com alias e só o webpack o carrega.
//
// O cenário saiu do código para src/data/kungfu/fase-N.json em 2026-08-17, para
// o editor do modo teste poder gravá-lo.
import fase1 from "@/data/kungfu/fase-1.json";
import fase2 from "@/data/kungfu/fase-2.json";
import fase3 from "@/data/kungfu/fase-3.json";
import fase4 from "@/data/kungfu/fase-4.json";
import fase5 from "@/data/kungfu/fase-5.json";
import {
  hydrate,
  sceneryAssetPathsFor,
  sceneryTilesetNamesFor,
} from "./kungfu-scenery-lib";

/**
 * @typedef {{ type: "starfield", color: number, stars: number }
 *          |{ type: "gradient", from: number, to: number }} SkySpec
 * @typedef {{ asset: string, layer: "bg"|"mid"|"game"|"fg",
 *             anchor: "chao"|"topo"|"horizonte", y: number,
 *             x?: number, repeat?: { every: number | "auto" },
 *             scale?: number, alpha?: number }} Element
 */

/** Cenário de cada fase, com as cores já em número. */
export const PHASE_SCENERY = {
  1: hydrate(fase1),
  2: hydrate(fase2),
  3: hydrate(fase3),
  4: hydrate(fase4),
  5: hydrate(fase5),
};

/** Todo caminho público que algum cenário precisa, sem repetição. */
export function sceneryAssetPaths() {
  return sceneryAssetPathsFor(Object.values(PHASE_SCENERY));
}

/** Nomes de tileset usados pelas fases. */
export function sceneryTilesetNames() {
  return sceneryTilesetNamesFor(Object.values(PHASE_SCENERY));
}
