// montar-pagina.mjs — injeta as 12 cenas no template e escreve a página final.
//
// O Artifact serve a página sob um CSP que bloqueia host externo, então nada
// pode ser buscado em tempo de execução: as imagens têm de estar DENTRO do
// arquivo, como data: URI. Um PNG indexado de 16 cores comprime tão bem que as
// doze cabem em menos de 1 MB, o que é por que dá para embutir em 1920×1080 e
// não numa versão reduzida.
//
// Uso: node scripts/montar-pagina.mjs <template.html> <dir-cenas> <saida.html>

import sharp from "sharp";
import { readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const [template, dirCenas, saida] = process.argv.slice(2);
if (!template || !dirCenas || !saida) {
  console.error("uso: node scripts/montar-pagina.mjs <template.html> <dir-cenas> <saida.html>");
  process.exit(1);
}

const MARCADOR = "/*__IMAGENS__*/ {}";

const arquivos = (await readdir(dirCenas)).filter((f) => /^cena-\d+.*\.png$/i.test(f)).sort();

const imagens = {};
let bytes = 0;
for (const arq of arquivos) {
  // Recomprime com esforço máximo: o arquivo em disco é otimizado para o
  // repositório, aqui cada KB conta duas vezes por causa do base64.
  const buf = await sharp(path.join(dirCenas, arq))
    .png({ palette: true, colours: 16, compressionLevel: 9, effort: 10 })
    .toBuffer();
  bytes += buf.length;
  imagens[path.basename(arq, ".png")] = `data:image/png;base64,${buf.toString("base64")}`;
}

const html = await readFile(template, "utf8");
if (!html.includes(MARCADOR)) {
  console.error(`template não contém o marcador ${MARCADOR}`);
  process.exit(1);
}

await writeFile(saida, html.replace(MARCADOR, JSON.stringify(imagens)), "utf8");

const final = (await readFile(saida)).length;
console.log(
  `${arquivos.length} cenas · png ${(bytes / 1e6).toFixed(2)} MB · ` +
    `pagina ${(final / 1e6).toFixed(2)} MB (teto 16 MB) → ${saida}`,
);
