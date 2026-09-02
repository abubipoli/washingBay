import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "First Class Washing Bay — Management System",
    short_name: "First Class",
    description: "Record washes, split revenue transparently, and pay your washing boys.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#493ee5",
    icons: [
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
