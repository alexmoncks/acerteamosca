import { cookies } from "next/headers";

const COOKIE_NAME = "acerteamosca_jogador";
const MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function setJogadorCookie(jogadorId) {
  cookies().set(COOKIE_NAME, jogadorId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
    domain: undefined, // let browser default to current domain
  });
}

export function getJogadorCookie() {
  return cookies().get(COOKIE_NAME)?.value ?? null;
}

export function clearJogadorCookie() {
  cookies().delete(COOKIE_NAME);
}
