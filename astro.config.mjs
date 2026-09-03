// @ts-check
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// Public site URL. Used for canonical URLs, OG tags, and the sitemap. The
// placeholder domain (`smart-pc.com`) is the production target — update here
// when the final domain is confirmed.
export default defineConfig({
  site: "https://smart-pc.com",
  vite: {
    plugins: [tailwindcss()],
    envPrefix: "PUBLIC_",
  },
  integrations: [react(), sitemap()],
});
