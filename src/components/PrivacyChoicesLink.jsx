"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { pingGdprAppliesNow, privacyChoicesAction, showGoogleRevocation, watchGdprCmp } from "@/lib/cmp";

// Link fixo "Privacidade e cookies" do rodapé (lote 2). Onde a mensagem GDPR
// do Google se aplica (EEE, Reino Unido, Suíça) e a API dela está carregada,
// o clique reabre a mensagem de consentimento (googlefc.showRevocationMessage)
// para a pessoa mudar ou revogar a escolha, como o Google exige. Em qualquer
// outro caso o link é o que parece: vai para a seção de cookies da política.
// Sem JavaScript, também vai para a política.
export const PRIVACY_CHOICES_HREF = "/politica-de-privacidade#cookies";

export default function PrivacyChoicesLink({ label, style }) {
  const [gdprApplies, setGdprApplies] = useState(null);

  useEffect(() => {
    let vivo = true;
    watchGdprCmp(window).then((applies) => {
      if (vivo) setGdprApplies(applies);
    });
    return () => {
      vivo = false;
    };
  }, []);

  function onClick(e) {
    // pergunta de novo na hora: a CMP pode ter ficado pronta depois que o
    // watchGdprCmp desistiu (rede lenta no EEE)
    const applies = gdprApplies === true ? true : pingGdprAppliesNow(window);
    if (privacyChoicesAction(window, applies) !== "google") return;
    if (showGoogleRevocation(window)) e.preventDefault();
  }

  return (
    <Link
      href={PRIVACY_CHOICES_HREF}
      onClick={onClick}
      style={style}
      data-privacy-choices={gdprApplies === true ? "google" : "policy"}
    >
      {label}
    </Link>
  );
}
