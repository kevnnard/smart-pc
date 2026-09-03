/**
 * smart-pc · service catalog.
 *
 * Four service offerings matching the Stitch `Home` and `Services` screens
 * (F1.5 + F5.1). Each record is rendered by the home `ServicesSection` and
 * the `/servicios` page; adding a fifth service here propagates to both
 * surfaces without touching component code (F5.2).
 *
 * `startingPrice` is the "Desde" tag in the card grid and is omitted when the
 * service is not a paid product (e.g. warranty is bundled with every build).
 */
import type { ServiceRecord } from "./types";

export const services: readonly ServiceRecord[] = [
  {
    slug: "armado-a-medida",
    title: "Armado a medida",
    description:
      "Diseñamos tu PC paso a paso con validación de compatibilidad en vivo y armado profesional en banco de pruebas.",
    icon: "🛠️",
    startingPrice: 1_500_000,
  },
  {
    slug: "pre-armadas",
    title: "Pre-armadas",
    description:
      "Tres tiers curados (Essentials · Creator · Apex) listos para usar, con garantía y soporte 24 meses.",
    icon: "🖥️",
    startingPrice: 1_300_000,
  },
  {
    slug: "mantenimiento-upgrade",
    title: "Mantenimiento y upgrades",
    description:
      "Limpieza, pasta térmica, ampliación de RAM, swap de GPU y migración de datos sin perder tu setup.",
    icon: "🔧",
    startingPrice: 250_000,
  },
  {
    slug: "garantia-soporte",
    title: "Garantía y soporte",
    description:
      "24 meses de garantía escrita y soporte técnico por WhatsApp sin costo adicional durante toda la vida útil.",
    icon: "🛡️",
  },
];
