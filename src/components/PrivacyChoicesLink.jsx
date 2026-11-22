"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { pingGdprAppliesNow, privacyChoicesAction, showGoogleRevocation, watchGdprCmp } from "@/lib/cmp";
import { CONSENT_REOPEN_EVENT } from "@/lib/consent";

// Link fixo "Privacidade e cookies" do rodapé. Onde a mensagem GDPR do
// Google se aplica (EEE, Reino Unido, Suíça) e a API dela está carregada, o
// clique reabre a mensagem de consentimento (googlefc.showRevocationMessage)
// para a pessoa mudar ou revogar a escolha, como o Google exige.
// OPÇÃO "denied global": no resto do mundo o clique reabre o aviso do site
// (Aceitar/Recusar), que é onde a escolha foi feita. Sem JavaScript, vai
// para a seção de cookies da política.
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
    if (privacyChoicesAction(window, applies) === "google" && showGoogleRevocation(window)) {
      e.preventDefault();
      return;
    }
    // fora do EEE: reabre o aviso do site (src/components/CookieConsent.jsx)
    e.preventDefault();
    window.dispatchEvent(new Event(CONSENT_REOPEN_EVENT));
  }

  return (
    <Link
      href={PRIVACY_CHOICES_HREF}
      onClick={onClick}
      style={style}
      data-privacy-choices={gdprApplies === true ? "google" : "banner"}
    >
      {label}
    </Link>
  );
}
