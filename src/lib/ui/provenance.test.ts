/**
 * smart-pc · provenance and quote-breakdown view-model helpers (Slice 3 · strict TDD · RED).
 *
 * RED suite for `src/lib/ui/provenance.ts`. The Astro components consume
 * these helpers; pinning the helpers' behaviour means the components can be
 * built once and never silently change semantics.
 */
import { describe, expect, it } from "vitest";
import type { Offer } from "../catalog/catalog-types";
import type { StaleWarning } from "../catalog/freshness";
import type { ReferenceProvenance } from "../quotes/quote-types";
import {
  buildProvenanceRows,
  buildProvenanceSummary,
  buildQuoteBreakdownRows,
  staleWarningSummary,
} from "./provenance";

const NOW = new Date("2026-09-04T00:00:00-05:00");
const STALE_AFTER_DAYS = 30;

function offer(partial: Partial<Offer> & { offerId: string }): Offer {
  return {
    offerId: partial.offerId,
    retailer: partial.retailer ?? "Test Retailer",
    sourceUrl: partial.sourceUrl ?? `https://example.com/${partial.offerId}`,
    sourceCurrency: partial.sourceCurrency ?? "COP",
    listedAmount: partial.listedAmount ?? 100_000,
    sellerCondition: partial.sellerCondition ?? "Test · new",
    availability: partial.availability ?? "in-stock",
    checkedAt: partial.checkedAt ?? "2026-09-04T00:00:00-05:00",
    evidenceStatus: partial.evidenceStatus ?? "confirmed",
    ...(partial.notes !== undefined ? { notes: partial.notes } : {}),
  };
}

const OFFER_STACKPC = offer({
  offerId: "stackpc-5600",
  retailer: "StackPC",
  listedAmount: 504_000,
  checkedAt: "2026-09-04T00:00:00-05:00",
  sourceUrl: "https://www.stackpc.com.co/productos/amd-ryzen-5-5600",
});

const OFFER_MELI = offer({
  offerId: "meli-listing",
  retailer: "MercadoLibre Colombia",
  sourceCurrency: "COP",
  listedAmount: 650_000,
  checkedAt: "2026-09-04T00:00:00-05:00",
  evidenceStatus: "category-page",
  sourceUrl: "https://listado.mercadolibre.com.co/procesador-ryzen-5-5600",
  notes: "Listado de búsqueda; SKU exacto no localizado.",
});

const OFFER_AMAZON_USD = offer({
  offerId: "amazon-5600-usd",
  retailer: "Amazon",
  sourceCurrency: "USD",
  listedAmount: 119,
  checkedAt: "2026-09-04T00:00:00-05:00",
  sourceUrl: "https://www.amazon.com/dp/B09VCHR1VH",
});

const OFFER_STALE = offer({
  offerId: "old-5600",
  retailer: "Old Retailer",
  listedAmount: 480_000,
  checkedAt: "2025-01-01T00:00:00-05:00",
  sourceUrl: "https://example.com/old",
});

// ---------------------------------------------------------------------------
// buildProvenanceRows
// ---------------------------------------------------------------------------

describe("buildProvenanceRows", () => {
  it("marks the selected reference offer with isSelectedReference true", () => {
    const rows = buildProvenanceRows({
      selectedOfferId: "stackpc-5600",
      offers: [OFFER_STACKPC, OFFER_MELI, OFFER_AMAZON_USD],
      now: NOW,
      staleAfterDays: STALE_AFTER_DAYS,
    });
    expect(
      rows.find((r) => r.offerId === "stackpc-5600")?.isSelectedReference,
    ).toBe(true);
    expect(
      rows.find((r) => r.offerId === "meli-listing")?.isSelectedReference,
    ).toBe(false);
    expect(
      rows.find((r) => r.offerId === "amazon-5600-usd")?.isSelectedReference,
    ).toBe(false);
  });

  it("returns an empty array when no offers exist (unconfirmed component)", () => {
    expect(
      buildProvenanceRows({
        selectedOfferId: undefined,
        offers: [],
        now: NOW,
        staleAfterDays: STALE_AFTER_DAYS,
      }),
    ).toEqual([]);
  });

  it("orders by (currency, listedAmount, offerId) deterministically", () => {
    const rows = buildProvenanceRows({
      selectedOfferId: undefined,
      offers: [OFFER_MELI, OFFER_STACKPC, OFFER_AMAZON_USD],
      now: NOW,
      staleAfterDays: STALE_AFTER_DAYS,
    });
    expect(rows.map((r) => r.offerId)).toEqual([
      "stackpc-5600", // COP 504000 (< 650000)
      "meli-listing", // COP 650000 (last COP)
      "amazon-5600-usd", // USD last (COP < USD alphabetically)
    ]);
  });

  it("flags offers older than staleAfterDays as stale and reports ageDays", () => {
    const rows = buildProvenanceRows({
      selectedOfferId: undefined,
      offers: [OFFER_STACKPC, OFFER_STALE],
      now: NOW,
      staleAfterDays: STALE_AFTER_DAYS,
    });
    const staleRow = rows.find((r) => r.offerId === "old-5600");
    const freshRow = rows.find((r) => r.offerId === "stackpc-5600");
    expect(staleRow?.isStale).toBe(true);
    expect(staleRow?.ageDays).toBeGreaterThan(STALE_AFTER_DAYS);
    expect(freshRow?.isStale).toBe(false);
    expect(freshRow?.ageDays).toBe(0);
  });

  it("preserves per-offer notes so the UI can surface them", () => {
    const rows = buildProvenanceRows({
      selectedOfferId: undefined,
      offers: [OFFER_MELI],
      now: NOW,
      staleAfterDays: STALE_AFTER_DAYS,
    });
    expect(rows[0]?.notes).toBe(
      "Listado de búsqueda; SKU exacto no localizado.",
    );
  });
});

// ---------------------------------------------------------------------------
// buildProvenanceSummary
// ---------------------------------------------------------------------------

describe("buildProvenanceSummary", () => {
  it("returns undefined when no reference is provided", () => {
    expect(buildProvenanceSummary(undefined)).toBeUndefined();
  });

  it("flags COP references as the COP currency hint", () => {
    const ref: ReferenceProvenance = {
      componentId: "cpu-1",
      offerId: "stackpc-5600",
      retailer: "StackPC",
      sourceUrl: "https://www.stackpc.com.co/productos/amd-ryzen-5-5600",
      checkedAt: "2026-09-04T00:00:00-05:00",
      referencePriceCop: 504_000,
      convertedFromForeignCurrency: false,
    };
    const summary = buildProvenanceSummary(ref);
    expect(summary?.currencyHint).toBe("COP");
    expect(summary?.retailer).toBe("StackPC");
    expect(summary?.referencePriceCop).toBe(504_000);
  });

  it("flags USD references as the USD currency hint", () => {
    const ref: ReferenceProvenance = {
      componentId: "cpu-1",
      offerId: "amazon-5600",
      retailer: "Amazon",
      sourceUrl: "https://www.amazon.com/dp/EXAMPLE",
      checkedAt: "2026-09-04T00:00:00-05:00",
      referencePriceCop: 471_900,
      convertedFromForeignCurrency: true,
    };
    expect(buildProvenanceSummary(ref)?.currencyHint).toBe("USD");
  });
});

// ---------------------------------------------------------------------------
// buildQuoteBreakdownRows
// ---------------------------------------------------------------------------

describe("buildQuoteBreakdownRows", () => {
  it("preserves the engine's disclosure order and emits a stable id per row", () => {
    const rows = buildQuoteBreakdownRows([
      {
        kind: "components",
        label: "Subtotal de componentes",
        amountCop: 2_000_000,
      },
      { kind: "service", label: "Servicio de armado", amountCop: 150_000 },
      { kind: "fixed-margin", label: "Margen fijo", amountCop: 0 },
      {
        kind: "percentage-margin",
        label: "Margen porcentual",
        amountCop: 400_000,
        rate: 20,
      },
      { kind: "total-margin", label: "Margen total", amountCop: 400_000 },
      { kind: "total", label: "Total (COP)", amountCop: 2_550_000 },
    ]);
    expect(rows.map((r) => r.kind)).toEqual([
      "components",
      "service",
      "fixed-margin",
      "percentage-margin",
      "total-margin",
      "total",
    ]);
    expect(rows.map((r) => r.id)).toEqual([
      "line-components",
      "line-service",
      "line-fixed-margin",
      "line-percentage-margin",
      "line-total-margin",
      "line-total",
    ]);
    expect(rows.find((r) => r.kind === "total")?.isTotal).toBe(true);
  });

  it("formats every amountCop via formatCop so the UI never has to call it again", () => {
    const rows = buildQuoteBreakdownRows([
      { kind: "components", label: "Subtotal", amountCop: 2_000_000 },
    ]);
    expect(rows[0]?.amountLabel).toMatch(/2\.000\.000/);
  });

  it("forwards the rate field on the percentage-margin row", () => {
    const rows = buildQuoteBreakdownRows([
      {
        kind: "percentage-margin",
        label: "Margen porcentual",
        amountCop: 100_000,
        rate: 20,
      },
    ]);
    expect(rows[0]?.rate).toBe(20);
  });

  it("flags the total and total-margin rows as isHighlighted", () => {
    const rows = buildQuoteBreakdownRows([
      { kind: "components", label: "x", amountCop: 0 },
      { kind: "total-margin", label: "x", amountCop: 0 },
      { kind: "total", label: "x", amountCop: 0 },
    ]);
    expect(rows.find((r) => r.kind === "components")?.isHighlighted).toBe(
      false,
    );
    expect(rows.find((r) => r.kind === "total-margin")?.isHighlighted).toBe(
      true,
    );
    expect(rows.find((r) => r.kind === "total")?.isHighlighted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// staleWarningSummary
// ---------------------------------------------------------------------------

describe("staleWarningSummary", () => {
  it("flattens StaleWarning records to id+ageDays pairs without filtering", () => {
    const warnings: readonly StaleWarning[] = [
      {
        recordKind: "component",
        id: "cpu-1",
        lastVerified: "2025-01-01T00:00:00-05:00",
        ageDays: 240,
      },
      {
        recordKind: "service",
        id: "svc",
        lastVerified: "2025-01-01T00:00:00-05:00",
        ageDays: 240,
      },
    ];
    const summary = staleWarningSummary(warnings);
    expect(summary).toEqual([
      { id: "cpu-1", ageDays: 240 },
      { id: "svc", ageDays: 240 },
    ]);
  });

  it("returns an empty array when no warnings are present", () => {
    expect(staleWarningSummary([])).toEqual([]);
  });
});
