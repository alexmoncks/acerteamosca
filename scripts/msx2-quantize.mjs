// msx2-quantize.mjs — força a paleta MSX2 nas imagens da apresentação.
//
// O modelo de imagem *aproxima* a paleta que o prompt pede; ele não a obedece.
// Sem este passo, "16 cores MSX2" é uma intenção, não uma propriedade da
// imagem — e basta um telhado num verde vizinho para a sequência inteira
// deixar de ser MSX2. Aqui a restrição vira aritmética: cada pixel é trocado
// pela cor mais próxima da paleta, e o que sai tem exatamente 16 cores ou menos.
//
// As 16 cores são todas RGB333-legais (3 bits por canal, níveis
// 0/36/73/109/146/182/219/255), que é o espaço de 512 cores do MSX2 SCREEN 5.
//
// Uso (a partir da raiz do repo, no Node do WSL):
//   node scripts/msx2-quantize.mjs <dir-entrada> <dir-saida> [--grid=N] [--w=1920]
//
//   --grid=N  pixeliza para N pixels de largura antes de ampliar de volta,
//             fixando a densidade do pixelão (256 = densidade nativa MSX2).
//             Omitido, preserva a grade que o modelo entregou.

import sharp from "sharp";
import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";

/** A paleta. Ver docs/kungfu-castle-roteiro-apresentacao.md §1. */
export const PALETA_MSX2 = [
  [0x00, 0x00, 0x00], // 0  #000000 preto / contorno
  [0x24, 0x24, 0x24], // 1  #242424 sombra dura
  [0x24, 0x24, 0x6d], // 2  #24246D azul-noite
  [0x49, 0x49, 0xb6], // 3  #4949B6 azul
  [0x6d, 0x49, 0xb6], // 4  #6D49B6 roxo
  [0xb6, 0x49, 0xdb], // 5  #B649DB magenta
  [0xb6, 0x24, 0x24], // 6  #B62424 vermelho escuro
  [0xff, 0x49, 0x24], // 7  #FF4924 laranja-fogo
  [0xff, 0xb6, 0x49], // 8  #FFB649 âmbar
  [0xff, 0xff, 0x92], // 9  #FFFF92 amarelo claro
  [0x6d, 0xb6, 0x24], // 10 #6DB624 verde
  [0x24, 0xb6, 0x6d], // 11 #24B66D jade
  [0x49, 0xdb, 0xff], // 12 #49DBFF ciano
  [0x92, 0x6d, 0x49], // 13 #926D49 marrom
  [0xb6, 0xb6, 0xb6], // 14 #B6B6B6 cinza
  [0xff, 0xff, 0xff], // 15 #FFFFFF branco
];

/**
 * Distância entre duas cores, na aproximação "redmean".
 *
 * Euclidiana crua em RGB erra onde o olho não erra: ela acha que um cinza
 * escuro está tão longe do preto quanto um azul saturado está do roxo. O
 * redmean pesa os canais pelo vermelho médio do par e é barato — que é o que
 * importa quando isto roda uma vez por pixel de uma imagem 1920×1080.
 */
function distancia(r1, g1, b1, r2, g2, b2) {
  const rmedio = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return (
    (2 + rmedio / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmedio) / 256) * db * db
  );
}

/**
 * Troca cada pixel pela cor mais próxima da paleta, no lugar.
 *
 * Um cache indexado pelo RGB de 24 bits evita repetir a busca nas 16 cores:
 * uma imagem de céu ditherizado tem milhões de pixels e algumas centenas de
 * cores distintas, então o cache acerta quase sempre.
 *
 * @returns {{trocados: number, total: number, piorDistancia: number, usadas: Set<number>}}
 */
export function aplicarPaleta(pixels, canais, paleta = PALETA_MSX2) {
  const cache = new Map();
  const usadas = new Set();
  let trocados = 0;
  let piorDistancia = 0;
  const total = pixels.length / canais;

  for (let i = 0; i < pixels.length; i += canais) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const chave = (r << 16) | (g << 8) | b;

    let achado = cache.get(chave);
    if (achado === undefined) {
      let melhor = 0;
      let melhorD = Infinity;
      for (let k = 0; k < paleta.length; k++) {
        const [pr, pg, pb] = paleta[k];
        const d = distancia(r, g, b, pr, pg, pb);
        if (d < melhorD) {
          melhorD = d;
          melhor = k;
        }
      }
      achado = { indice: melhor, d: melhorD };
      cache.set(chave, achado);
    }

    const [nr, ng, nb] = paleta[achado.indice];
    if (nr !== r || ng !== g || nb !== b) trocados++;
    if (achado.d > piorDistancia) piorDistancia = achado.d;
    usadas.add(achado.indice);

    pixels[i] = nr;
    pixels[i + 1] = ng;
    pixels[i + 2] = nb;
  }

  return { trocados, total, piorDistancia, usadas };
}

/**
 * Processa um arquivo: redimensiona, pixeliza (opcional) e trava a paleta.
 *
 * A ordem importa. Redimensionar DEPOIS de quantizar reintroduziria cores
 * interpoladas e desfaria o trabalho; por isso a paleta é a última coisa que
 * toca os pixels. É também o que devolve a borda dura que o lanczos suaviza.
 */
export async function processar(entrada, saida, { largura = 1920, grid = 0 } = {}) {
  const altura = Math.round((largura * 9) / 16);

  let img = sharp(entrada);

  if (grid > 0) {
    // Reduz à grade pedida e volta em nearest-neighbor: o pixelão fica com
    // tamanho uniforme, que é o que a grade do MSX2 tem e o upscale de um
    // modelo generativo não tem.
    const gridAltura = Math.round((grid * 9) / 16);
    img = sharp(
      await img.resize(grid, gridAltura, { kernel: "lanczos3", fit: "fill" }).png().toBuffer(),
    ).resize(largura, altura, { kernel: "nearest", fit: "fill" });
  } else {
    img = img.resize(largura, altura, { kernel: "lanczos3", fit: "fill" });
  }

  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const relatorio = aplicarPaleta(data, info.channels);

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ palette: true, colours: 16, compressionLevel: 9 })
    .toFile(saida);

  return { ...relatorio, largura: info.width, altura: info.height };
}

async function main() {
  const [dirEntrada, dirSaida, ...flags] = process.argv.slice(2);
  if (!dirEntrada || !dirSaida) {
    console.error("uso: node scripts/msx2-quantize.mjs <dir-entrada> <dir-saida> [--grid=N] [--w=1920]");
    process.exit(1);
  }

  const grid = Number(flags.find((f) => f.startsWith("--grid="))?.slice(7) ?? 0);
  const largura = Number(flags.find((f) => f.startsWith("--w="))?.slice(4) ?? 1920);

  await mkdir(dirSaida, { recursive: true });
  const arquivos = (await readdir(dirEntrada)).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();

  console.log(`paleta: 16 cores MSX2 · saida: ${largura}px${grid ? ` · grade: ${grid}px` : ""}\n`);

  for (const arq of arquivos) {
    const destino = path.join(dirSaida, arq.replace(/\.(jpe?g|webp)$/i, ".png"));
    const r = await processar(path.join(dirEntrada, arq), destino, { largura, grid });
    const pct = ((r.trocados / r.total) * 100).toFixed(1);
    console.log(
      `${arq.padEnd(28)} ${r.largura}x${r.altura}  ` +
        `fora-da-paleta: ${pct.padStart(5)}%  ` +
        `cores usadas: ${String(r.usadas.size).padStart(2)}/16`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
