"use client";

import { useState, useEffect, useCallback } from "react";

const LS_KEY = "acerteamosca_jogador_id";

export default function useJogador(jogoOrigem = "acerteamosca") {
  const [user, setUser] = useState(null);
  const [checkedCookie, setCheckedCookie] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    // Try localStorage fallback ID
    let savedId = null;
    try { savedId = localStorage.getItem(LS_KEY); } catch {}

    const url = savedId
      ? `/api/jogadores?id=${encodeURIComponent(savedId)}`
      : "/api/jogadores";

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.jogador) {
          setUser(data.jogador);
          // Ensure localStorage is in sync
          try { localStorage.setItem(LS_KEY, data.jogador.id); } catch {}
        }
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
      if (data.error) {
        return { error: data.error };
      }
      if (data.jogador) {
        setUser(data.jogador);
        // Save to localStorage as backup
        try { localStorage.setItem(LS_KEY, data.jogador.id); } catch {}
        return data.jogador;
      }
    } catch (err) {
      console.error("Erro ao registrar:", err);
      return { error: "Erro de conexão. Tente novamente." };
    } finally {
      setRegistering(false);
    }
    return null;
  }, [jogoOrigem]);

  return { user, checkedCookie, registering, register };
}
