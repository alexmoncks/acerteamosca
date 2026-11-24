"use client";

// Área de um jogo encaixada na altura visível (src/hooks/useGameFit.js,
// matemática em src/lib/game-fit.js).
//
// Cabeçalho do site: das três opções do pedido — (a) dimensionar o jogo para
// 100dvh menos a Navbar e o título, sem scroll; (b) rolar sozinho até o jogo;
// (c) Navbar compacta nas páginas de jogo — ficou a (a), a menos intrusiva:
// nada se mexe sozinho (a rolagem automática brigaria com quem já começou a
// rolar e com o "voltar" do navegador), a Navbar continua igual e acessível em
// todas as páginas, e o jogo inteiro aparece já na primeira pintura.
//
// Como funciona: a raiz do jogo (.game-fit-root) tem min-height = altura
// visível − Navbar (100dvh, com fallback para vh). Este componente é o item
// flex que cresce até ocupar o que sobra depois do título e dos controles; o
// hook mede esse espaço e devolve a escala. Dentro dele, a área
// [data-game-area] tem o tamanho CSS da caixa já escalada, e o filho (a caixa
// lógica do jogo, com transform: scale) continua com as mesmas dimensões e
// coordenadas de sempre.
//
// O anúncio (AdBanner game_footer) fica no page.js, depois do GameInfo, fora
// desta raiz: a altura disponível para o jogo não depende dele.

export default function GameFit({ fit, children, style }) {
  const { slotRef, areaRef, escala, largura, altura, minima } = fit;
  return (
    <div
      ref={slotRef}
      className="game-fit-slot"
      // Piso do slot: abaixo da escala mínima a página ganha rolagem em vez de
      // o jogo encolher mais.
      style={{ minHeight: Math.ceil(altura * minima) }}
    >
      <div
        ref={areaRef}
        data-game-area=""
        data-game-scale={escala}
        style={{ width: largura * escala, height: altura * escala, flex: "none", ...style }}
      >
        {children}
      </div>
    </div>
  );
}
