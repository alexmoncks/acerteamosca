import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageAlternates } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import HomeClient from "./HomeClient";

// A home é um componente cliente; o metadata (canonical e hreflang próprios)
// precisa de um page.js de servidor em volta dele. Os JSON-LD também ficam
// aqui, no servidor, para levar o nonce da CSP do pedido (lote 2).
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    alternates: pageAlternates(locale, "/"),
  };
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "home" });
  const tm = await getTranslations({ locale, namespace: "metadata" });
  const faqItems = t.raw("faq.items");
  const siteUrl = locale === "en" ? "https://nailedthefly.com" : "https://acerteamosca.com.br";
  const inLanguage = locale === "pt" ? "pt-BR" : "en";

  const webPageLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": tm("title"),
    "description": tm("description"),
    "url": siteUrl,
    "inLanguage": inLanguage,
    "isPartOf": { "@id": `${siteUrl}/#website` },
    "about": { "@id": "https://acerteamosca.com.br/#organization" },
    "primaryImageOfPage": `${siteUrl}/opengraph-image`,
  };

  const faqPageLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "inLanguage": inLanguage,
    "mainEntity": faqItems.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a },
    })),
  };

  return (
    <>
      <JsonLd data={webPageLd} />
      <JsonLd data={faqPageLd} />
      <HomeClient />
    </>
  );
}
