import { setRequestLocale } from "next-intl/server";
import { pageAlternates } from "@/lib/seo";
import HomeClient from "./HomeClient";

// A home é um componente cliente; o metadata (canonical e hreflang próprios)
// precisa de um page.js de servidor em volta dele.
export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    alternates: pageAlternates(locale, "/"),
  };
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <HomeClient />;
}
