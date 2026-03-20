export default function sitemap() {
  const baseUrl = "https://acerteamosca.com.br";

  const jogos = [
    "acerteamosca", "pong", "ships", "wordle", "memory",
    "2048", "bubbleshooter", "deepattack", "jacare",
    "tiroaoalvo", "batalha-naval",
  ];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...jogos.map((slug) => ({
      url: `${baseUrl}/jogos/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
  ];
}
