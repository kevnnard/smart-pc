/**
 * smart-pc · home page data (Phase 3).
 *
 * Three arrays consumed by `src/components/home/*` (Phase 5):
 *   - `stats`  → StatsStrip (F1.3) and hero counters
 *   - `trust`  → TrustStrip (F1.4) — four value-prop cards
 *   - `faq`    → FAQSection (F1.9) — accordion items
 *
 * Adding an entry here automatically surfaces on the home page without
 * touching component code.
 */
import type { FAQItem, StatItem, TrustItem } from "./types";

export const stats: readonly StatItem[] = [
  { value: "320+", label: "PCs ARMADAS" },
  { value: "98%", label: "COMPATIBILIDAD" },
  { value: "24M", label: "GARANTÍA" },
];

export const trust: readonly TrustItem[] = [
  {
    icon: "✓",
    title: "Compatibilidad validada",
    description:
      "Cada armado pasa por un banco de pruebas y validación de componentes antes de salir de nuestro taller.",
  },
  {
    icon: "◇",
    title: "Asesoría técnica",
    description:
      "Te ayudamos a elegir cada pieza según tu uso real: gaming, oficina, creación de contenido o mixto.",
  },
  {
    icon: "✦",
    title: "Armado profesional",
    description:
      "Cable management prolijo, pasta térmica de calidad y stress-test de 12 horas en cada equipo.",
  },
  {
    icon: "⌬",
    title: "Garantía 24 meses",
    description:
      "Cobertura escrita por 24 meses y soporte técnico por WhatsApp durante toda la vida útil del equipo.",
  },
];

export const faq: readonly FAQItem[] = [
  {
    question: "¿Cuánto tarda un armado?",
    answer:
      "Un armado estándar toma entre 3 y 5 días hábiles. Si necesitás el equipo para una fecha específica, consultanos y priorizamos tu pedido sin costo adicional.",
  },
  {
    question: "¿La garantía cubre fallas de fábrica?",
    answer:
      "Sí. La garantía de 24 meses cubre fallas de fábrica en todos los componentes. El servicio técnico es gratuito durante todo el período.",
  },
  {
    question: "¿Puedo traer mis propios componentes?",
    answer:
      "Por supuesto. Trabajamos con parts nuevas y usadas. Si ya tenés CPU, GPU, RAM o storage, los integramos al armado y solo cobramos mano de obra.",
  },
  {
    question: "¿Hacen envíos al interior?",
    answer:
      "Sí. Despachamos a todo Colombia vía transportista asegurado. El envío es gratis en Bogotá y Medellín para compras superiores a $2.000.000 ARS.",
  },
];
