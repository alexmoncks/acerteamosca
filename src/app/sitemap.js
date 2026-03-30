export default function sitemap() {
  const ptBase = "https://acerteamosca.com.br";
  const enBase = "https://nailedthefly.com";

  const jogos = [
    "acerteamosca", "pong", "ships", "wordle", "memory",
    "2048", "bubbleshooter", "deepattack", "jacare",
    "tiroaoalvo", "batalha-naval", "brickbreaker", "3invader",
  ];

  return [
    {
      url: ptBase,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
      alternates: {
        languages: {
          "pt-BR": ptBase,
          en: enBase,
          "x-default": ptBase,
        },
      },
    },
    ...jogos.map((slug) => ({
      url: `${ptBase}/jogos/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: {
        languages: {
          "pt-BR": `${ptBase}/jogos/${slug}`,
          en: `${enBase}/jogos/${slug}`,
          "x-default": `${ptBase}/jogos/${slug}`,
        },
      },
    })),
  ];
}
