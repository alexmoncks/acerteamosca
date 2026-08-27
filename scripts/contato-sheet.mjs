// contato-sheet.mjs — junta as 12 cenas numa folha 4×3 para revisão.
//
// Revisar doze arquivos abrindo doze arquivos não mostra o que importa numa
// sequência: se as cenas combinam entre si. Lado a lado, uma que destoa em
// brilho ou em densidade de pixel salta.
//
// Uso: node scripts/contato-sheet.mjs <dir> <saida.png> [--cel=480]

import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const [dir, saida, ...flags] = process.argv.slice(2);
if (!dir || !saida) {
  console.error("uso: node scripts/contato-sheet.mjs <dir> <saida.png> [--cel=480]");
  process.exit(1);
}

const CEL_L = Number(flags.find((f) => f.startsWith("--cel="))?.slice(6) ?? 480);
const CEL_A = Math.round((CEL_L * 9) / 16);
const COLS = 4;
const GAP = 8;

const arquivos = (await readdir(dir)).filter((f) => /^cena-\d+.*\.png$/i.test(f)).sort();
const LINHAS = Math.ceil(arquivos.length / COLS);

const largura = COLS * CEL_L + (COLS + 1) * GAP;
const altura = LINHAS * CEL_A + (LINHAS + 1) * GAP;

const camadas = await Promise.all(
  arquivos.map(async (arq, i) => ({
    input: await sharp(path.join(dir, arq))
      .resize(CEL_L, CEL_A, { kernel: "nearest", fit: "fill" })
      .png()
      .toBuffer(),
    left: GAP + (i % COLS) * (CEL_L + GAP),
    top: GAP + Math.floor(i / COLS) * (CEL_A + GAP),
  })),
);

await sharp({
  create: { width: largura, height: altura, channels: 3, background: "#242424" },
})
  .composite(camadas)
  .png()
  .toFile(saida);

console.log(`${arquivos.length} cenas → ${saida} (${largura}x${altura})`);
console.log(arquivos.map((a, i) => `${i + 1}. ${a}`).join("\n"));
