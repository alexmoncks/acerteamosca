"use client";

import { useState, useEffect, useCallback } from "react";

export default function useJogador(jogoOrigem = "acerteamosca") {
  const [user, setUser] = useState(null);
  const [checkedCookie, setCheckedCookie] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    fetch("/api/jogadores")
      .then(res => res.json())
      .then(data => {
        if (data.jogador) setUser(data.jogador);
        setCheckedCookie(true);
      })
      .catch(() => setCheckedCookie(true));
  }, []);

  const register = useCallback(async (userData) => {
    setRegistering(true);
    try {
      const res = await fetch("/api/jogadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: userData.name,
          email: userData.email,
          whatsapp: userData.phone,
          jogo: jogoOrigem,
        }),
      });
      const data = await res.json();
      if (data.jogador) {
        setUser(data.jogador);
        return data.jogador;
      }
    } catch (err) {
      console.error("Erro ao registrar:", err);
    } finally {
      setRegistering(false);
    }
    return null;
  }, [jogoOrigem]);

  return { user, checkedCookie, registering, register };
}
