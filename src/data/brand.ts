/**
 * smart-pc · brand constants.
 *
 * Single source of truth for wordmark, tagline, contact channels, and social
 * profiles. Components consume these via a typed import — no hardcoded copy
 * lives in `Navbar.astro`, `Footer.astro`, or any future hero/about surface.
 *
 * Placeholders:
 * - `whatsapp` is a non-functional `wa.me/573001234567` placeholder. The
 *   production number lands when the storefront is provisioned.
 * - Social URLs are `#` placeholders. Replace when the real handles exist.
 */
import type { BrandInfo } from "./types";

export const brand: BrandInfo = {
  name: "smart-pc",
  tagline: "PCs a tu medida",
  description:
    "Armamos la PC de tus sueños con componentes de primera línea y soporte experto. Desde Colombia para el mundo.",
  whatsapp: "https://wa.me/573001234567",
  email: "hola@smart-pc.com",
  location: "Bogotá, Colombia",
  social: [
    { platform: "Instagram", url: "#", icon: "instagram" },
    { platform: "X", url: "#", icon: "x" },
    { platform: "YouTube", url: "#", icon: "youtube" },
    { platform: "Discord", url: "#", icon: "discord" },
  ],
};
