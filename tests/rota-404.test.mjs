// O 404.
//
// Todo navegador pede /favicon.ico em toda visita. Esse pedido respondia 500,
// não 404, e o mesmo valia para qualquer caminho de raiz com ponto no nome
// (/site.webmanifest, /naoexiste.txt). Um 500 por visita não aparece em teste
// de jogo nenhum, e para um buscador 500 significa "tente de novo depois" —
// bem diferente de 404.
//
// A causa: o matcher do middleware exclui caminhos com ponto, de propósito,
// para não reescrever arquivo estático. O que tem ponto, é de raiz e NÃO é
// arquivo escapa do next-intl e casa com o segmento [locale]. Aí
// generateMetadata importava `../../messages/favicon.ico.json` e estourava.
import assert from "node:assert/strict";
import { check, source } from "./helpers.mjs";

// Sem comentários: o comentário do próprio layout explica o defeito e cita o
// import: procurar a palavra acharia a explicação, não o código.
const semComentarios = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const LAYOUT = semComentarios(source("src/app/[locale]/layout.js"));
const MIDDLEWARE = semComentarios(source("src/middleware.js"));

/** O corpo de generateMetadata, até a chave que o fecha. */
function corpoDoGenerateMetadata() {
  const inicio = LAYOUT.indexOf("export async function generateMetadata");
  assert.notEqual(inicio, -1, "generateMetadata sumiu do layout");
  const fim = LAYOUT.indexOf("\n}", inicio);
  assert.notEqual(fim, -1, "não achei o fim de generateMetadata");
  return LAYOUT.slice(inicio, fim);
}

check("generateMetadata refuses an unknown locale", () => {
  // A guarda do componente LocaleLayout não cobre isto: o Next roda
  // generateMetadata ANTES do componente.
  const corpo = corpoDoGenerateMetadata();
  assert.match(corpo, /routing\.locales\.includes\(locale\)/,
    "generateMetadata aceita qualquer locale");
  assert.match(corpo, /notFound\(\)/,
    "generateMetadata não chama notFound() para locale inválido");
});

check("the guard runs before the messages import, not after", () => {
  // A ORDEM é o defeito inteiro. Guarda depois do import não conserta nada:
  // o import é quem estoura.
  const corpo = corpoDoGenerateMetadata();
  const guarda = corpo.indexOf("routing.locales.includes(locale)");
  const importa = corpo.indexOf("messages/${locale}.json");
  // Sem estas duas linhas o teste passa vazio: guarda ausente é indexOf === -1,
  // e -1 < qualquer coisa. A primeira versão daqui passou no código quebrado.
  assert.notEqual(guarda, -1, "a guarda sumiu de generateMetadata");
  assert.notEqual(importa, -1, "o import das mensagens sumiu");
  assert.ok(guarda < importa,
    `a guarda (${guarda}) tem de vir antes do import (${importa})`);
});

check("the middleware still lets dotted root paths through", () => {
  // Se o matcher deixar de excluir caminhos com ponto, o next-intl passa a
  // reescrever pedido de arquivo estático — e a guarda acima vira o único
  // motivo pelo qual ela existe. Este teste documenta o acoplamento: quem
  // mexer no matcher tem de ler o outro teste antes.
  assert.match(MIDDLEWARE, /\.\*\\\\?\.\.\*/,
    "o matcher deixou de excluir caminhos com ponto");
});
