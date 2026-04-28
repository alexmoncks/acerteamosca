import { setRequestLocale } from "next-intl/server";
import GameInfo from "@/components/GameInfo";
import GameClient from "./GameClient";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const isPt = locale === "pt";
  return {
    title: isPt
      ? "Wordle em Português — Jogue Grátis Online | Acerte a Mosca"
      : "Wordle in Portuguese — Play Free Online | Nailed The Fly",
    description: isPt
      ? "Jogue Wordle em português! Adivinhe a palavra de 5 letras em 6 tentativas. Jogo online grátis sem download, funciona no celular e computador."
      : "Play Wordle in Portuguese! Guess the 5-letter word in 6 tries. Free online game, no download, works on mobile and desktop.",
    keywords: isPt
      ? ["wordle português", "wordle brasileiro", "wordle online", "jogo de palavras", "adivinhar palavra"]
      : ["wordle portuguese", "wordle brazilian", "wordle online", "word game", "guess the word"],
    alternates: {
      canonical: "/jogos/wordle",
      languages: {
        "pt-BR": "https://acerteamosca.com.br/jogos/wordle",
        "en": "https://nailedthefly.com/en/jogos/wordle",
      },
    },
    openGraph: {
      title: isPt ? "Wordle em Português - Jogue Grátis" : "Wordle in Portuguese - Play Free",
      description: isPt
        ? "Adivinhe a palavra de 5 letras em 6 tentativas! Jogo online grátis."
        : "Guess the 5-letter word in 6 tries! Free online game.",
      url: isPt
        ? "https://acerteamosca.com.br/jogos/wordle"
        : "https://nailedthefly.com/en/jogos/wordle",
    },
  };
}

function buildJsonLd(locale) {
  const isPt = locale === "pt";
  return {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: "Wordle BR",
    description: isPt
      ? "Jogue Wordle em português! Adivinhe a palavra de 5 letras em 6 tentativas."
      : "Play Wordle in Portuguese! Guess the 5-letter word in 6 tries.",
    url: isPt
      ? "https://acerteamosca.com.br/jogos/wordle"
      : "https://nailedthefly.com/en/jogos/wordle",
    genre: ["Puzzle", "Word Game"],
    gamePlatform: "Web Browser",
    operatingSystem: "Any",
    applicationCategory: "Game",
    inLanguage: isPt ? "pt-BR" : "en",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: isPt ? "BRL" : "USD",
      availability: "https://schema.org/InStock",
    },
    publisher: {
      "@type": "Organization",
      name: isPt ? "Acerte a Mosca" : "Nailed The Fly",
      url: isPt ? "https://acerteamosca.com.br" : "https://nailedthefly.com",
    },
  };
}

const content = {
  pt: {
    title: "Sobre o Wordle BR",
    intro:
      "O Wordle BR é a versão brasileira do clássico jogo diário de adivinhar palavras. Sua missão é descobrir uma palavra secreta de 5 letras em até 6 tentativas. A cada palpite, o jogo mostra cores indicando quais letras estão na posição certa, quais existem na palavra mas em outro lugar, e quais não fazem parte da resposta.",
    details: [
      {
        summary: "Como jogar",
        body: [
          "Digite uma palavra de cinco letras válida em português e confirme. As letras pintam de verde quando estão na posição correta, amarelo quando existem na palavra mas em outro lugar, e cinza quando não fazem parte da resposta.",
          "Use cada feedback para refinar o próximo palpite. Você tem seis tentativas até descobrir a palavra do dia. O jogo aceita acentos e cedilha quando aplicáveis. Cada dia traz uma palavra nova — vale tentar antes do café e antes de dormir.",
        ],
      },
      {
        summary: "Controles",
        body: [
          "No computador, basta digitar com o teclado normal: letras de A a Z, Enter para confirmar e Backspace para apagar. No celular, um teclado virtual aparece automaticamente na tela com todas as letras do alfabeto.",
          "As cores nas teclas refletem palpites anteriores: letras já marcadas como cinzas ficam apagadas para evitar repetir tentativas perdidas.",
        ],
      },
      {
        summary: "Dicas e estratégias",
        body: [
          "Comece com palavras ricas em vogais como ROUBO, IDEAL ou AÚREO — assim você descarta ou confirma rapidamente as letras mais comuns. Evite repetir letras nas primeiras tentativas para maximizar a informação extraída.",
          "Quando souber duas ou três letras, pense em palavras frequentes do português: AGORA, MUNDO, PORTA, NOITE são bons candidatos. Use a segunda tentativa para testar consoantes diferentes da primeira. Lembre-se: posição importa — uma letra amarela na segunda casa NÃO está na segunda casa da resposta.",
        ],
      },
      {
        summary: "Origem do jogo",
        body: [
          "O Wordle foi criado em 2021 pelo engenheiro de software galês Josh Wardle como presente para a esposa, fã de jogos de palavras. Ele publicou a versão original em um site simples e em janeiro de 2022 já tinha milhões de jogadores diários.",
          "O New York Times comprou o jogo no mesmo mês por uma cifra na casa baixa dos sete dígitos em dólar. O sucesso virou febre mundial, com adaptações em centenas de idiomas. O Wordle BR é a versão brasileira que respeita as regras originais, mas usa um dicionário em português com palavras de uso cotidiano no Brasil — sem termos arcaicos ou regionalismos obscuros.",
        ],
      },
    ],
  },
  en: {
    title: "About Wordle BR",
    intro:
      "Wordle is the daily word-guessing puzzle that took the world by storm. Your mission: find a hidden 5-letter word in 6 tries. Each guess reveals which letters are in the right position, which exist in the word but elsewhere, and which are not part of the answer. This Brazilian Portuguese version follows the same rules with a curated Portuguese dictionary.",
    details: [
      {
        summary: "How to play",
        body: [
          "Type a valid 5-letter Portuguese word and submit. Letters turn green when correctly placed, yellow when present but in the wrong position, and gray when not in the word at all.",
          "Use each round of feedback to narrow down the answer. You have six attempts before the word reveals itself. The game accepts Portuguese accents and cedilla (ç) when needed. A new word is published every day at midnight Brazilian time.",
        ],
      },
      {
        summary: "Controls",
        body: [
          "On desktop, just type with your keyboard: letters A to Z, Enter to confirm, Backspace to delete. On mobile, an on-screen keyboard appears automatically with the full alphabet.",
          "Tile colors on the keyboard reflect previous guesses — letters already ruled out as gray fade to avoid wasting attempts on them.",
        ],
      },
      {
        summary: "Tips and strategies",
        body: [
          "Start with vowel-rich words like ROUBO, IDEAL or AÚREO to quickly filter common letters. Avoid repeating letters in early tries to maximize the information you extract from each attempt.",
          "Once you know two or three correct letters, think of high-frequency Portuguese words: AGORA, MUNDO, PORTA, NOITE are strong candidates. Use the second guess to test consonants completely different from your first. And remember position matters — a yellow tile in slot two is NOT in slot two of the answer.",
        ],
      },
      {
        summary: "Origin of the game",
        body: [
          "Wordle was created in 2021 by Welsh software engineer Josh Wardle as a gift for his partner, a word-game enthusiast. He launched it on a simple personal site, and by January 2022 it had millions of daily players.",
          "The New York Times acquired the game that same month for a low-seven-figure sum. The phenomenon spawned hundreds of language adaptations and clones worldwide. Wordle BR is the Brazilian-Portuguese take on the format, keeping the original rules but using a curated Portuguese dictionary focused on everyday vocabulary spoken in Brazil today — no archaic terms or obscure regionalisms.",
        ],
      },
    ],
  },
};

export default async function WordlePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const jsonLd = buildJsonLd(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <GameClient />
      <GameInfo content={content} locale={locale} />
    </>
  );
}
