// medir-web.mjs — quanto pesa a sequência inteira embutida numa página.
//
// A página da apresentação precisa ser autocontida (o CSP do Artifact bloqueia
// host externo), então as 12 cenas viram data: URI. Base64 infla ~33%, e o teto
// é 16 MB — vale medir antes de escolher a largura, não depois.

import sharp from "sharp";
import { readdir } from "node:fs/promises";
import path from "node:path";

const dir = process.argv[2];
const larguras = process.argv.slice(3).map(Number);

const arquivos = (await readdir(dir)).filter((f) => /^cena-\d+.*\.png$/i.test(f)).sort();

for (const largura of larguras) {
  const altura = Math.round((largura * 9) / 16);
  let bytes = 0;
  for (const arq of arquivos) {
    const buf = await sharp(path.join(dir, arq))
      .resize(largura, altura, { kernel: "nearest", fit: "fill" })
      .png({ palette: true, colours: 16, compressionLevel: 9, effort: 10 })
      .toBuffer();
    bytes += buf.length;
  }
  const base64 = Math.round((bytes * 4) / 3);
  console.log(
    `${String(largura).padStart(4)}px  png: ${(bytes / 1e6).toFixed(2)} MB  ` +
      `→ base64: ${(base64 / 1e6).toFixed(2)} MB  (teto 16 MB)`,
  );
}
