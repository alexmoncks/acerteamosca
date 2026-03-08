import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getJogadorCookie } from "@/lib/cookies";

// POST - salva score de uma partida
export async function POST(request) {
  const jogadorId = getJogadorCookie();
  if (!jogadorId) {
    return NextResponse.json(
      { error: "Jogador não autenticado" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { pontos, acertos, erros, melhorCombo, precisao, jogo } = body;

  const score = await prisma.score.create({
    data: {
      pontos,
      acertos,
      erros,
      melhorCombo,
      precisao,
      jogo: jogo || "acerteamosca",
      jogadorId,
    },
  });

  return NextResponse.json({ score });
}

// GET - ranking do jogo
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const jogo = searchParams.get("jogo") || "acerteamosca";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  const ranking = await prisma.score.findMany({
    where: { jogo },
    orderBy: { pontos: "desc" },
    take: limit,
    include: {
      jogador: { select: { nome: true } },
    },
  });

  return NextResponse.json({
    ranking: ranking.map((s) => ({
      nome: s.jogador.nome,
      pontos: s.pontos,
      acertos: s.acertos,
      precisao: s.precisao,
      melhorCombo: s.melhorCombo,
      data: s.criadoEm,
    })),
  });
}
