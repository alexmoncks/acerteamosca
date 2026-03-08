"use client";

import { useState } from "react";

export default function RegisterModal({ onRegister, loading, jogoNome, accentColor = "#00f0ff" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const valid = name && email && consent && !loading;

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0a0a1a", border: `2px solid ${accentColor}`, borderRadius: 12, padding: 28, width: 340, boxShadow: `0 0 40px ${accentColor}22` }}>
        <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: accentColor, textAlign: "center", marginBottom: 6, textShadow: `0 0 10px ${accentColor}` }}>
          {jogoNome || "ACERTE A MOSCA"}
        </h2>
        <p style={{ color: "#8892b0", fontSize: 12, textAlign: "center", marginBottom: 20, fontFamily: "'Fira Code', monospace" }}>
          Cadastre-se para jogar e concorrer!
        </p>

        {[
          { label: "NOME", value: name, set: setName, type: "text", ph: "Seu nome completo" },
          { label: "EMAIL", value: email, set: setEmail, type: "email", ph: "seu@email.com" },
          { label: "WHATSAPP", value: phone, set: setPhone, type: "tel", ph: "(00) 00000-0000" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: "#39ff14", fontSize: 9, fontFamily: "'Press Start 2P', monospace", marginBottom: 5, letterSpacing: 1 }}>{f.label}</label>
            <input type={f.type} value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
              style={{ width: "100%", padding: "10px 12px", background: "#111127", border: "1px solid #2a2a4a", borderRadius: 6, color: "#e0e0ff", fontSize: 14, fontFamily: "'Fira Code', monospace", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = accentColor} onBlur={e => e.target.style.borderColor = "#2a2a4a"} />
          </div>
        ))}

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor }} />
          <span style={{ color: "#8892b0", fontSize: 10, fontFamily: "'Fira Code', monospace", lineHeight: 1.5 }}>
            Concordo com a coleta dos meus dados para participacao na promocao conforme a LGPD.
          </span>
        </label>

        <button onClick={() => valid && onRegister({ name, email, phone })} disabled={!valid}
          style={{ width: "100%", padding: "12px 0", background: valid ? `linear-gradient(135deg, ${accentColor}, #39ff14)` : "#2a2a4a", border: "none", borderRadius: 8, color: valid ? "#000" : "#555", fontFamily: "'Press Start 2P', monospace", fontSize: 11, cursor: valid ? "pointer" : "not-allowed", fontWeight: 900, letterSpacing: 1 }}>
          {loading ? "REGISTRANDO..." : "JOGAR!"}
        </button>
      </div>
    </div>
  );
}
