"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterModal({ onRegister, loading, jogoNome, accentColor = "#00f0ff" }) {
  const t = useTranslations("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [serverError, setServerError] = useState("");
  const [touched, setTouched] = useState({});

  const nameError = touched.name && name.trim().length < 3 ? t("nameError") : "";
  const emailError = touched.email && !isValidEmail(email) ? t("emailError") : "";

  const valid = name.trim().length >= 3 && isValidEmail(email) && consent && !loading;

  async function handleSubmit() {
    if (!valid) return;
    setServerError("");
    const result = await onRegister({ name: name.trim(), email: email.trim(), phone });
    if (result && result.error) {
      setServerError(result.error);
    }
  }

  const fields = [
    { label: t("nameLabel"), value: name, set: setName, type: "text", ph: t("namePlaceholder"), key: "name", error: nameError },
    { label: t("emailLabel"), value: email, set: setEmail, type: "email", ph: t("emailPlaceholder"), key: "email", error: emailError },
    { label: t("whatsappLabel"), value: phone, set: (v) => setPhone(maskPhone(v)), type: "tel", ph: t("whatsappPlaceholder"), key: "phone", error: "" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, backdropFilter: "blur(8px)" }}>
      <div style={{ background: "#0a0a1a", border: `2px solid ${accentColor}`, borderRadius: 12, padding: 28, width: 340, boxShadow: `0 0 40px ${accentColor}22` }}>
        <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14, color: accentColor, textAlign: "center", marginBottom: 6, textShadow: `0 0 10px ${accentColor}` }}>
          {jogoNome || "ACERTE A MOSCA"}
        </h2>
        <p style={{ color: "#8892b0", fontSize: 12, textAlign: "center", marginBottom: 20, fontFamily: "'Fira Code', monospace" }}>
          {t("subtitle")}
        </p>

        {fields.map(f => (
          <div key={f.label} style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: "#39ff14", fontSize: 9, fontFamily: "'Press Start 2P', monospace", marginBottom: 5, letterSpacing: 1 }}>{f.label}</label>
            <input type={f.type} value={f.value}
              onChange={e => f.set(e.target.value)}
              onBlur={() => setTouched(prev => ({ ...prev, [f.key]: true }))}
              placeholder={f.ph}
              style={{ width: "100%", padding: "10px 12px", background: "#111127", border: `1px solid ${f.error ? "#ff4444" : "#2a2a4a"}`, borderRadius: 6, color: "#e0e0ff", fontSize: 14, fontFamily: "'Fira Code', monospace", outline: "none", boxSizing: "border-box" }}
              onFocus={e => e.target.style.borderColor = f.error ? "#ff4444" : accentColor}
            />
            {f.error && (
              <p style={{ color: "#ff4444", fontSize: 10, fontFamily: "'Fira Code', monospace", margin: "4px 0 0 0" }}>{f.error}</p>
            )}
          </div>
        ))}

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 14, marginBottom: 18, cursor: "pointer" }}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 3, accentColor }} />
          <span style={{ color: "#8892b0", fontSize: 10, fontFamily: "'Fira Code', monospace", lineHeight: 1.5 }}>
            {t("consent")}
          </span>
        </label>

        {serverError && (
          <p style={{ color: "#ff4444", fontSize: 10, fontFamily: "'Fira Code', monospace", textAlign: "center", marginBottom: 10 }}>{serverError}</p>
        )}

        <button onClick={handleSubmit} disabled={!valid}
          style={{ width: "100%", padding: "12px 0", background: valid ? `linear-gradient(135deg, ${accentColor}, #39ff14)` : "#2a2a4a", border: "none", borderRadius: 8, color: valid ? "#000" : "#555", fontFamily: "'Press Start 2P', monospace", fontSize: 11, cursor: valid ? "pointer" : "not-allowed", fontWeight: 900, letterSpacing: 1 }}>
          {loading ? t("registering") : t("play")}
        </button>
      </div>
    </div>
  );
}
