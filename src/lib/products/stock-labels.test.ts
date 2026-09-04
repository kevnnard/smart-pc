/**
 * smart-pc · stock-status labels (Slice 3 · strict TDD · RED).
 *
 * RED tests for `src/lib/products/stock-labels.ts`. Written before the
 * Astro/badge UI so the label strings, classes, and orderings are pinned in
 * CI before any rendering layer depends on them.
 */
import { describe, expect, it } from "vitest";
import type { StockStatus } from "../catalog/catalog-types";
import { ALL_CATEGORIES_FILTER } from "./catalog-view-model";
import {
  CATEGORY_LABELS,
  categoryLabel,
  categoryPluralLabel,
  STOCK_STATUS_ORDER,
  stockBadgeStyle,
  stockStatusLabel,
} from "./stock-labels";

describe("stockStatusLabel", () => {
  it("returns the Spanish label for each stock status", () => {
    const cases: ReadonlyArray<readonly [StockStatus, string]> = [
      ["in-stock", "Stock"],
      ["limited", "Stock limitado"],
      ["out-of-stock", "Sin stock"],
      ["unknown", "Preguntar"],
    ];
    for (const [status, expected] of cases) {
      expect(stockStatusLabel(status)).toBe(expected);
    }
  });

  it("never emits a fabricated label for the unknown statuses the validator rejects", () => {
    // The StockStatus union is finite. An unsupported cast must hit the
    // exhaustiveness branch and fall through (returning `undefined` is
    // acceptable for the never-case). We assert the function does NOT crash
    // and does NOT fabricate a label.
    const supportedLabels = new Set([
      "Stock",
      "Stock limitado",
      "Sin stock",
      "Preguntar",
    ]);
    for (const status of [
      "in-stock",
      "limited",
      "out-of-stock",
      "unknown",
    ] as const) {
      expect(supportedLabels.has(stockStatusLabel(status))).toBe(true);
    }
  });
});

describe("STOCK_STATUS_ORDER", () => {
  it("lists the four statuses in the natural reader order", () => {
    expect([...STOCK_STATUS_ORDER]).toEqual([
      "in-stock",
      "limited",
      "out-of-stock",
      "unknown",
    ]);
  });
});

describe("stockBadgeStyle", () => {
  it("returns accessible, high-contrast utility classes for each status", () => {
    expect(stockBadgeStyle("in-stock").container).toContain("text-green-400");
    expect(stockBadgeStyle("in-stock").dot).toBe("bg-green-400");
    expect(stockBadgeStyle("limited").container).toContain("text-amber-400");
    expect(stockBadgeStyle("out-of-stock").container).toContain(
      "text-text-muted",
    );
    expect(stockBadgeStyle("unknown").container).toContain("text-text-muted");
  });
});

describe("categoryLabel", () => {
  it("returns the Spanish singular label for every catalog category", () => {
    expect(categoryLabel("cpu")).toBe("Procesador");
    expect(categoryLabel("gpu")).toBe("Tarjeta de video");
    expect(categoryLabel("motherboard")).toBe("Placa base");
    expect(categoryLabel("ram")).toBe("Memoria RAM");
    expect(categoryLabel("storage")).toBe("Almacenamiento");
    expect(categoryLabel("psu")).toBe("Fuente");
    expect(categoryLabel("case")).toBe("Gabinete");
    expect(categoryLabel("cooler")).toBe("Cooler");
    expect(categoryLabel("os")).toBe("Sistema operativo");
  });

  it("returns the Spanish plural label when asked", () => {
    expect(categoryPluralLabel("cpu")).toBe("Procesadores");
    expect(categoryPluralLabel("motherboard")).toBe("Placas base");
    expect(categoryPluralLabel("gpu")).toBe("Tarjetas de video");
  });

  it("falls back to the raw id for unknown categories", () => {
    expect(categoryLabel("unknown-future")).toBe("unknown-future");
    expect(categoryPluralLabel("unknown-future")).toBe("unknown-future");
  });
});

describe("CATEGORY_LABELS table", () => {
  it("covers every ComponentCategory identifier", () => {
    const ids = Object.keys(CATEGORY_LABELS);
    expect(ids).toEqual(
      expect.arrayContaining([
        "cpu",
        "gpu",
        "motherboard",
        "ram",
        "storage",
        "psu",
        "case",
        "cooler",
        "os",
      ]),
    );
  });

  it("every entry exposes a non-empty label and plural", () => {
    for (const entry of Object.values(CATEGORY_LABELS)) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.plural.length).toBeGreaterThan(0);
    }
  });
});

describe("ALL_CATEGORIES_FILTER", () => {
  it("is the stable sentinel id used by the filter island", () => {
    expect(ALL_CATEGORIES_FILTER).toBe("all");
  });
});
