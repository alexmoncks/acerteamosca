import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { setJogadorCookie, getJogadorCookie } from "@/lib/cookies";

// GET - verifica se jogador já está logado via cookie
export async function GET() {
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
}

// POST - registra novo jogador ou retorna existente
export async function POST(request) {
  const body = await request.json();
  const { nome, email, whatsapp, jogo } = body;

  if (!nome || !email) {
    return NextResponse.json(
      { error: "Nome e email são obrigatórios" },
      { status: 400 }
    );
  }

  // Verifica se já existe jogador com esse email
  let jogador = await prisma.jogador.findUnique({
    where: { email },
  });

  if (jogador) {
    // Atualiza nome/whatsapp se mudou
    jogador = await prisma.jogador.update({
      where: { email },
      data: { nome, whatsapp: whatsapp || jogador.whatsapp },
    });
  } else {
    // Cria novo jogador
    jogador = await prisma.jogador.create({
      data: {
        nome,
        email,
        whatsapp: whatsapp || null,
        jogoOrigem: jogo || "acerteamosca",
      },
    });
  }

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
}
