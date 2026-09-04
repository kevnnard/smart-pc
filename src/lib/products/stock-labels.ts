/**
 * smart-pc · stock-status Spanish labels (Slice 3).
 *
 * Pure data + pure lookup. Used by `StockBadge.astro`, `ProductCard.astro`,
 * and the catalog filter island. Never fetched; the labels are baked in at
 * build time and surface as plain Spanish text on every catalog surface.
 *
 * Spec: design.md §9.1 — accessible Spanish labels per stock status.
 */
import type { StockStatus } from "../catalog/catalog-types";

/**
 * Spanish (Colombia) label for a stock-status bucket. The label is the
 * single source of truth for every surface (badge, filter chip, aria-label).
 */
export function stockStatusLabel(status: StockStatus): string {
  switch (status) {
    case "in-stock":
      return "Stock";
    case "limited":
      return "Stock limitado";
    case "out-of-stock":
      return "Sin stock";
    case "unknown":
      return "Preguntar";
    default: {
      // Exhaustiveness check; the validator rejects unknown statuses.
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/**
 * Order in which stock statuses are listed in the filter UI and the
 * "Todos los productos" sidebar. Matches the natural reader expectation:
 * available first, then limited, then out, then unknown.
 */
export const STOCK_STATUS_ORDER: readonly StockStatus[] = [
  "in-stock",
  "limited",
  "out-of-stock",
  "unknown",
] as const;

/**
 * Tailwind utility classes (no inline `style`) for each stock-status badge.
 * Colors are intentionally conservative: green for available, amber for
 * limited, red for out, slate for unknown. The same class list is reused
 * by `StockBadge.astro`, `ProductCard.astro`, and the filter chips.
 */
export interface StockBadgeStyle {
  readonly container: string;
  readonly dot: string;
}

export function stockBadgeStyle(status: StockStatus): StockBadgeStyle {
  switch (status) {
    case "in-stock":
      return {
        container: "border-green-500/40 bg-green-500/10 text-green-400",
        dot: "bg-green-400",
      };
    case "limited":
      return {
        container: "border-amber-500/40 bg-amber-500/10 text-amber-400",
        dot: "bg-amber-400",
      };
    case "out-of-stock":
      return {
        container: "border-border bg-navy-800 text-text-muted",
        dot: "bg-text-muted",
      };
    case "unknown":
      return {
        container: "border-border bg-navy-800 text-text-muted",
        dot: "bg-text-muted",
      };
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

/**
 * Spanish (Colombia) category label for the public `/productos/` page.
 * The legacy data layer uses English identifiers (`cpu`, `gpu`, …) so the
 * view layer maps them to Spanish display labels.
 */
export interface CategoryLabel {
  readonly id: string;
  readonly label: string;
  readonly plural: string;
}

export const CATEGORY_LABELS: Readonly<Record<string, CategoryLabel>> = {
  cpu: { id: "cpu", label: "Procesador", plural: "Procesadores" },
  gpu: { id: "gpu", label: "Tarjeta de video", plural: "Tarjetas de video" },
  motherboard: {
    id: "motherboard",
    label: "Placa base",
    plural: "Placas base",
  },
  ram: { id: "ram", label: "Memoria RAM", plural: "Memorias RAM" },
  storage: { id: "storage", label: "Almacenamiento", plural: "Almacenamiento" },
  psu: { id: "psu", label: "Fuente", plural: "Fuentes" },
  case: { id: "case", label: "Gabinete", plural: "Gabinetes" },
  cooler: { id: "cooler", label: "Cooler", plural: "Coolers" },
  os: { id: "os", label: "Sistema operativo", plural: "Sistemas operativos" },
};

export function categoryLabel(categoryId: string): string {
  return CATEGORY_LABELS[categoryId]?.label ?? categoryId;
}

export function categoryPluralLabel(categoryId: string): string {
  return CATEGORY_LABELS[categoryId]?.plural ?? categoryId;
}
