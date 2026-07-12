import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Outpost — Backpackers Backoffice",
    short_name: "Outpost",
    description:
      "Sistema unificado de gestão do grupo Backpackers. Adventures · Synergy · Labs.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0E2A44",
    theme_color: "#0E2A44",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/logo.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["business", "productivity"],
    lang: "pt-PT",
  };
}
