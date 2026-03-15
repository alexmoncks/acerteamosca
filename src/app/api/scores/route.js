import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getJogadorCookie } from "@/lib/cookies";

// POST - salva score de uma partida
export async function POST(request) {
  try {
    const jogadorId = getJogadorCookie();
    if (!jogadorId) {
      return NextResponse.json(
        { error: "Jogador não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pontos, acertos, erros, melhorCombo, precisao, jogo, metadata } = body;

    if (typeof pontos !== "number") {
      return NextResponse.json(
        { error: "Pontos é obrigatório" },
        { status: 400 }
      );
    }

    const score = await prisma.score.create({
      data: {
        pontos,
        acertos: acertos ?? null,
        erros: erros ?? null,
        melhorCombo: melhorCombo ?? null,
        precisao: precisao ?? null,
        metadata: metadata ?? null,
        jogo: jogo || "acerteamosca",
        jogadorId,
      },
    });

    return NextResponse.json({ score });
  } catch (err) {
    console.error("POST /api/scores error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET - ranking do jogo
export async function GET(request) {
  try {
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
        metadata: s.metadata,
        data: s.criadoEm,
      })),
    });
  } catch (err) {
    console.error("GET /api/scores error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
