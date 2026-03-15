import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { setJogadorCookie, getJogadorCookie } from "@/lib/cookies";

function sanitize(str) {
  return str.replace(/<[^>]*>/g, "").trim();
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
function isValidPhone(phone) {
  return /^\(\d{2}\) \d{5}-\d{4}$/.test(phone);
}

// GET - verifica se jogador já está logado via cookie
export async function GET() {
  try {
    const jogadorId = getJogadorCookie();
    if (!jogadorId) {
      return NextResponse.json({ jogador: null });
    }

    const jogador = await prisma.jogador.findUnique({
      where: { id: jogadorId },
      select: { id: true, nome: true, email: true, jogoOrigem: true },
    });

    if (!jogador) {
      return NextResponse.json({ jogador: null });
    }

    return NextResponse.json({ jogador });
  } catch (err) {
    console.error("GET /api/jogadores error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - registra novo jogador ou retorna existente
export async function POST(request) {
  try {
    const body = await request.json();

    const nome = sanitize(body.nome || "");
    const email = (body.email || "").trim().toLowerCase();
    const whatsapp = body.whatsapp ? sanitize(body.whatsapp) : "";
    const jogo = body.jogo || "acerteamosca";

    // Validate nome
    if (!nome || nome.length < 3) {
      return NextResponse.json(
        { error: "Nome deve ter pelo menos 3 caracteres" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Validate phone format if provided
    if (whatsapp && !isValidPhone(whatsapp)) {
      return NextResponse.json(
        { error: "WhatsApp deve estar no formato (XX) XXXXX-XXXX" },
        { status: 400 }
      );
    }

    // Use transaction to prevent race conditions on name uniqueness
    const jogador = await prisma.$transaction(async (tx) => {
      // Check if another user (different email) already has this name (case-insensitive)
      const existing = await tx.jogador.findFirst({
        where: {
          nome: { equals: nome, mode: "insensitive" },
          NOT: { email },
        },
      });

      if (existing) {
        throw new Error("NOME_DUPLICADO");
      }

      // Find by email and update or create
      let player = await tx.jogador.findUnique({
        where: { email },
      });

      if (player) {
        player = await tx.jogador.update({
          where: { email },
          data: { nome, whatsapp: whatsapp || player.whatsapp },
        });
      } else {
        player = await tx.jogador.create({
          data: {
            nome,
            email,
            whatsapp: whatsapp || null,
            jogoOrigem: jogo,
          },
        });
      }

      return player;
    });

    // Seta cookie para não pedir registro novamente
    setJogadorCookie(jogador.id);

    return NextResponse.json({
      jogador: {
        id: jogador.id,
        nome: jogador.nome,
        email: jogador.email,
        jogoOrigem: jogador.jogoOrigem,
      },
    });
  } catch (err) {
    if (err.message === "NOME_DUPLICADO") {
      return NextResponse.json(
        { error: "Este nome já está em uso. Escolha outro." },
        { status: 400 }
      );
    }
    console.error("POST /api/jogadores error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
