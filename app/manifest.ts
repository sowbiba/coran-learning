import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Le Coran — avec ton Professeur",
    short_name: "Coran",
    description:
      "Mémoriser et comprendre le Saint Coran, accompagné par un compagnon quotidien.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "fr",
    dir: "ltr",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["education", "religion"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
