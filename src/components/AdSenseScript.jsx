"use client";

// A tag do AdSense, igual à que o painel entrega (async + crossorigin), com o
// nonce da CSP. É componente cliente só por causa do onError: o React move
// todo <script async src> para o topo do <head> (ele vira "recurso"), e aí a
// tag sairia ANTES do consent default (src/lib/consent.js), que tem de rodar
// primeiro. Com onError (ou onLoad) o React deixa a tag onde ela está no
// JSX. O handler não faz nada: anúncio bloqueado não é erro do site.
function ignorar() {}

export default function AdSenseScript({ client, nonce }) {
  return (
    <script
      async
      nonce={nonce}
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
      onError={ignorar}
    />
  );
}
