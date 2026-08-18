// Grava o cenário de uma fase do Kung Fu Castle. SÓ em desenvolvimento.
//
// Esta rota escreve um arquivo no repositório a partir de um corpo HTTP, então
// é a superfície mais perigosa do projeto. Três defesas, nesta ordem:
//
//  1. Fora de desenvolvimento responde 404, não 403. Um 403 confirmaria que a
//     rota existe; o 404 não conta nada a quem estiver sondando.
//  2. O caminho do arquivo é montado a partir de um NÚMERO validado contra a
//     lista de fases conhecidas — nunca de string vinda do cliente. Sem isso,
//     `phase: "../../../etc/passwd"` seria escrita arbitrária de arquivo.
//  3. A forma do cenário é validada antes de gravar, incluindo se cada asset
//     existe no disco. Um JSON malformado aqui quebra o jogo inteiro no próximo
//     carregamento, e o erro aparece longe da causa.
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { validatePhase } from "@/components/games/kungfu-scenery-lib";

const FASES = [1, 2, 3, 4, 5];
const DIR_DADOS = path.join(process.cwd(), "src", "data", "kungfu");
const DIR_PROPS = path.join(process.cwd(), "public", "images", "kungfucastle", "props");
const DIR_BACKUP = path.join(process.cwd(), "src", "data", "kungfu", ".backup");

const naoEncontrado = () => new NextResponse("Not Found", { status: 404 });

const emDesenvolvimento = () => process.env.NODE_ENV === "development";

/** O asset existe como PNG em public/images/kungfucastle/props? */
function assetExiste(nome) {
  if (typeof nome !== "string" || !/^[a-z0-9-]+$/.test(nome)) return false;
  return fs.existsSync(path.join(DIR_PROPS, `${nome}.png`));
}

export async function GET(request) {
  if (!emDesenvolvimento()) return naoEncontrado();

  // Lista os assets disponíveis, para o editor montar a paleta sem precisar de
  // uma segunda lista mantida à mão que envelheceria a cada prop novo.
  const { searchParams } = new URL(request.url);
  if (searchParams.get("assets") === "1") {
    const assets = fs
      .readdirSync(DIR_PROPS)
      .filter((f) => f.endsWith(".png"))
      .map((f) => f.replace(/\.png$/, ""))
      .sort();
    return NextResponse.json({ assets });
  }
  return NextResponse.json({ fases: FASES });
}

export async function POST(request) {
  if (!emDesenvolvimento()) return naoEncontrado();

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo não é JSON" }, { status: 400 });
  }

  // O número vem do cliente mas nunca chega ao caminho: só é usado depois de
  // bater com uma das fases conhecidas.
  const fase = FASES.find((n) => n === Number(corpo?.phase));
  if (!fase) {
    return NextResponse.json(
      { erro: `fase inválida: ${corpo?.phase}` },
      { status: 400 },
    );
  }

  const erros = validatePhase(corpo?.scenery, assetExiste);
  if (erros.length) return NextResponse.json({ erros }, { status: 400 });

  const arquivo = path.join(DIR_DADOS, `fase-${fase}.json`);

  // Guarda a versão anterior antes de sobrescrever.
  //
  // Estes arquivos são compostos ao vivo no editor e ficam horas sem commit. Um
  // save errado, um driver de teste desgovernado ou um `git checkout` apressado
  // apagam trabalho que não existe em lugar nenhum — aconteceu, e não havia de
  // onde recuperar. A cópia é local e ignorada pelo git; custa um write e
  // devolve o último estado bom.
  try {
    fs.mkdirSync(DIR_BACKUP, { recursive: true });
    if (fs.existsSync(arquivo)) {
      fs.copyFileSync(arquivo, path.join(DIR_BACKUP, `fase-${fase}.json`));
    }
  } catch {
    // Backup é rede de segurança, não pré-requisito: se falhar, grava assim
    // mesmo em vez de bloquear o trabalho.
  }

  // Indentação de 2 e newline final: o diff no git precisa ficar legível, já
  // que este arquivo é editado tanto pelo editor quanto à mão.
  fs.writeFileSync(arquivo, JSON.stringify(corpo.scenery, null, 2) + "\n");

  return NextResponse.json({
    ok: true,
    fase,
    elementos: corpo.scenery.elements.length,
  });
}
