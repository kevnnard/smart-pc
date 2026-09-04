/**
 * smart-pc · home page data (Phase 3).
 *
 * Arrays consumed by `src/components/home/*` (Phase 5):
 *   - `stats`        → StatsStrip (F1.3) and hero counters
 *   - `trust`        → TrustStrip (F1.4) — four value-prop cards
 *   - `faq`          → FAQSection (F1.9) — accordion items
 *   - `homeServices` → ServicesGrid (F1.5) — four commercial offerings
 *
 * Adding an entry here automatically surfaces on the home page without
 * touching component code.
 */
import type { FAQItem, ServiceRecord, StatItem, TrustItem } from "./types";

/**
 * The four-cell StatsStrip expects a `suffix` field on each stat so the number
 * and the unit (e.g. `320` + `+`, `98` + `%`) render in separate spans and the
 * value can scale up responsively without the unit wrapping mid-line.
 *
 * This is a structural superset of `StatItem` (suffix is optional), so the
 * export remains assignable to `readonly StatItem[]` for downstream consumers
 * that only need the basic shape.
 */
export type StatItemWithSuffix = StatItem & { readonly suffix?: string };

export const stats: readonly StatItemWithSuffix[] = [
  { value: "320", label: "PCs ARMADAS", suffix: "+" },
  { value: "98", label: "COMPATIBILIDAD", suffix: "%" },
  { value: "24", label: "GARANTÍA", suffix: "M" },
  { value: "48", label: "RESPUESTA", suffix: "h" },
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

/**
 * Five FAQ items matching the topics Phase 5 (F1.9) requires: delivery time,
 * warranty, custom builds, payment methods, support. Adding a sixth item here
 * surfaces automatically on the home page (the FAQ section iterates `faq`).
 */
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
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos transferencia bancaria, PSE, Nequi, Daviplata, tarjetas crédito/débito y Mercado Pago. Hasta 12 cuotas sin interés con bancos aliados en compras superiores a $2.000.000 COP.",
  },
  {
    question: "¿Cómo es el soporte post-venta?",
    answer:
      "Atención por WhatsApp de lunes a sábado, 9 a 19 h. Soporte remoto incluido de por vida y visitas al taller en Bogotá y Medellín sin costo durante la garantía.",
  },
];

/**
 * Home-only service view model. Mirrors `ServiceRecord` and adds an optional
 * `priceLabel` for offerings whose public price is not a single integer COP
 * value (e.g. configurations priced per build or support included with the
 * diagnostic). The `ServiceCard` falls back to `priceLabel` before rendering
 * `Desde {formatCop(startingPrice)}` so the home grid never surfaces misleading
 * `Desde $0` placeholders.
 *
 * Note this is intentionally distinct from `src/data/catalog/services.json`,
 * which remains the source of truth for quote calculation and retains the
 * research-market recommended/reference records and the confirmed fee.
 */
export type HomeServiceRecord = ServiceRecord & {
  /**
   * Optional override for the displayed price. When set, it is rendered
   * verbatim (no `Desde` prefix, no COP formatting) and supersedes
   * `startingPrice` for display purposes. Examples:
   *   - "Precio según configuración"
   *   - "Incluido / según diagnóstico"
   */
  readonly priceLabel?: string;
};

/**
 * Four commercial offerings for the home services grid (F1.5). Pricing
 * surface:
 *   - `armado-a-medida`: COP 150.000 starting — matches the confirmed
 *     `armado-basico-confirmado` fee in the quote engine.
 *   - `pre-armadas`: per-build pricing — no public starting price.
 *   - `mantenimiento-y-upgrades`: COP 80.000 starting.
 *   - `garantia-y-soporte`: included with every build / per diagnosis — no
 *     public starting price.
 *
 * Order is intentional: the grid renders top-left → bottom-right in this order.
 */
export const homeServices: readonly HomeServiceRecord[] = [
  {
    slug: "armado-a-medida",
    title: "Armado a medida",
    description:
      "Ensamble profesional con gestión de cable, pruebas de stress y soporte inicial.",
    icon: "🛠️",
    startingPrice: 150_000,
  },
  {
    slug: "pre-armadas",
    title: "Pre-armadas",
    description:
      "Configuraciones listas para usar, optimizadas para cada presupuesto.",
    icon: "📦",
    priceLabel: "Precio según configuración",
  },
  {
    slug: "mantenimiento-y-upgrades",
    title: "Mantenimiento y upgrades",
    description:
      "Limpieza, cambio de pasta térmica y upgrades de componentes para extender la vida útil del equipo.",
    icon: "🔧",
    startingPrice: 80_000,
  },
  {
    slug: "garantia-y-soporte",
    title: "Garantía y soporte",
    description:
      "Cobertura escrita y soporte técnico de por vida por WhatsApp y en taller.",
    icon: "🛡️",
    priceLabel: "Incluido / según diagnóstico",
  },
];
