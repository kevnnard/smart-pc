/**
 * smart-pc · reference-selection tests (PR 2 · Slice 2 RED).
 *
 * RED-first suite for `src/lib/catalog/reference-selection.ts`. Asserts the
 * deterministic Step A → Step B → `unconfirmed` algorithm that picks the
 * single offer per component whose `listedAmount` (or documented
 * `normalizedCostCop`) becomes the component's `referencePriceCop` in the
 * quote engine.
 *
 * Hard constraints:
 *   - `unconfirmed` components MUST yield `reference: undefined` (no fake
 *     number, no estimated number).
 *   - Category-page and 404-or-missing offers MUST never be selected.
 *   - Foreign-currency offers MUST never become a COP price unless a
 *     documented `conversionAssumption` + `normalizedCostCop` is present.
 *   - Ties MUST be broken deterministically by `offerId`.
 */
import { describe, expect, it } from "vitest";
import type {
  CatalogComponent,
  ConversionAssumption,
  Offer,
} from "./catalog-types";
import { selectReference } from "./reference-selection";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function offer(
  partial: Partial<Offer> & {
    offerId: string;
    sourceCurrency: string;
    listedAmount: number;
    evidenceStatus: Offer["evidenceStatus"];
  },
): Offer {
  return {
    offerId: partial.offerId,
    retailer: partial.retailer ?? "Test Retailer",
    sourceUrl: partial.sourceUrl ?? `https://example.com/${partial.offerId}`,
    sourceCurrency: partial.sourceCurrency,
    listedAmount: partial.listedAmount,
    sellerCondition: partial.sellerCondition ?? "Test Retailer · new",
    availability: partial.availability ?? "in-stock",
    checkedAt: partial.checkedAt ?? "2026-09-04T00:00:00-05:00",
    evidenceStatus: partial.evidenceStatus,
    notes: partial.notes,
    shippingImportTaxCop: partial.shippingImportTaxCop,
    conversionAssumption: partial.conversionAssumption,
    normalizedCostCop: partial.normalizedCostCop,
  };
}

const DOCUMENTED_CONVERSION: ConversionAssumption = {
  targetCurrency: "COP",
  exchangeRateCopPerUnit: 4000,
  rateSource: "trm",
  rateAsOf: "2026-09-03T00:00:00-05:00",
  notes: "TRM + envío + arancel aprox.",
};

function component(
  id: string,
  priceStatus: CatalogComponent["priceStatus"],
  offers: readonly Offer[],
  overrides: Partial<CatalogComponent> = {},
): CatalogComponent {
  return {
    id,
    category: "cpu",
    brand: "AMD",
    model: "Ryzen Test",
    name: "AMD Ryzen Test",
    specs: { Cores: "6" },
    compatibility: {},
    priceStatus,
    stockStatus: "in-stock",
    stockQuantity: null,
    offers,
    observedPriceCop: null,
    sourceStore: "Test",
    sourceUrl: "https://example.com/cpu",
    lastVerified: "2026-09-04T00:00:00-05:00",
    availability: "in-stock",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Step A — lowest eligible local COP offer
// ---------------------------------------------------------------------------

describe("selectReference · Step A (eligible local COP)", () => {
  it("picks the lowest confirmed COP listedAmount", () => {
    const c = component("cpu-a", "verified", [
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
      offer({
        offerId: "alkosto",
        sourceCurrency: "COP",
        listedAmount: 950_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    const ref = selectReference(c);
    expect(ref).toBeDefined();
    expect(ref?.offerId).toBe("ktronix");
    expect(ref?.referencePriceCop).toBe(920_000);
    expect(ref?.convertedFromForeignCurrency).toBe(false);
  });

  it("excludes category-page offers even when their COP amount is lower", () => {
    const c = component("cpu-b", "verified", [
      offer({
        offerId: "meli-listing",
        sourceCurrency: "COP",
        listedAmount: 600_000,
        evidenceStatus: "category-page",
      }),
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    const ref = selectReference(c);
    expect(ref?.offerId).toBe("ktronix");
    expect(ref?.referencePriceCop).toBe(920_000);
  });

  it("excludes 404-or-missing offers", () => {
    const c = component("cpu-c", "verified", [
      offer({
        offerId: "missing-1",
        sourceCurrency: "COP",
        listedAmount: 700_000,
        evidenceStatus: "404-or-missing",
      }),
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    const ref = selectReference(c);
    expect(ref?.offerId).toBe("ktronix");
  });

  it("deterministic tie-break by offerId when two confirmed COP offers match", () => {
    const c = component("cpu-d", "verified", [
      offer({
        offerId: "offer-b",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
      offer({
        offerId: "offer-a",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    const ref = selectReference(c);
    expect(ref?.offerId).toBe("offer-a");
  });

  it("two runs with the same input return deep-equal references", () => {
    const c = component("cpu-e", "verified", [
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    expect(selectReference(c)).toEqual(selectReference(c));
  });
});

// ---------------------------------------------------------------------------
// Step B — documented foreign-COP fallback
// ---------------------------------------------------------------------------

describe("selectReference · Step B (documented foreign-COP fallback)", () => {
  it("runs Step B only when Step A produced zero candidates", () => {
    const c = component("cpu-f", "provisional", [
      offer({
        offerId: "amazon-us",
        sourceCurrency: "USD",
        listedAmount: 119,
        evidenceStatus: "confirmed",
        conversionAssumption: DOCUMENTED_CONVERSION,
        normalizedCostCop: 501_000, // 119 × 4000 + 25_000 shipped
        shippingImportTaxCop: 25_000,
      }),
      offer({
        offerId: "meli-listing",
        sourceCurrency: "COP",
        listedAmount: 700_000,
        evidenceStatus: "category-page",
      }),
    ]);
    const ref = selectReference(c);
    expect(ref?.offerId).toBe("amazon-us");
    expect(ref?.convertedFromForeignCurrency).toBe(true);
    expect(ref?.referencePriceCop).toBe(501_000);
    expect(ref?.originalCurrency).toBe("USD");
    expect(ref?.originalListedAmount).toBe(119);
  });

  it("never picks a foreign offer when a confirmed COP offer exists", () => {
    const c = component("cpu-g", "provisional", [
      offer({
        offerId: "amazon-us",
        sourceCurrency: "USD",
        listedAmount: 119,
        evidenceStatus: "confirmed",
        conversionAssumption: DOCUMENTED_CONVERSION,
        normalizedCostCop: 501_000,
      }),
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    const ref = selectReference(c);
    // Step A wins because ktronix is a confirmed COP offer.
    expect(ref?.offerId).toBe("ktronix");
    expect(ref?.convertedFromForeignCurrency).toBe(false);
  });

  it("does NOT promote a foreign offer without documented conversion", () => {
    const c = component("cpu-h", "provisional", [
      offer({
        offerId: "amazon-us-no-conv",
        sourceCurrency: "USD",
        listedAmount: 119,
        evidenceStatus: "confirmed",
        // conversionAssumption and normalizedCostCop missing.
      }),
    ]);
    const ref = selectReference(c);
    expect(ref).toBeUndefined();
  });

  it("picks the lowest cross-checked foreign offer when multiple candidates", () => {
    const c = component("cpu-i", "provisional", [
      offer({
        offerId: "amazon-us-cheaper",
        sourceCurrency: "USD",
        listedAmount: 99,
        evidenceStatus: "confirmed",
        conversionAssumption: DOCUMENTED_CONVERSION,
        normalizedCostCop: 421_000,
      }),
      offer({
        offerId: "amazon-us-pricier",
        sourceCurrency: "USD",
        listedAmount: 119,
        evidenceStatus: "confirmed",
        conversionAssumption: DOCUMENTED_CONVERSION,
        normalizedCostCop: 501_000,
      }),
    ]);
    const ref = selectReference(c);
    expect(ref?.offerId).toBe("amazon-us-cheaper");
    expect(ref?.referencePriceCop).toBe(421_000);
  });
});

// ---------------------------------------------------------------------------
// Step C — unconfirmed fallback
// ---------------------------------------------------------------------------

describe("selectReference · unconfirmed", () => {
  it("returns undefined when priceStatus is unconfirmed regardless of offers", () => {
    const c = component("cpu-j", "unconfirmed", [
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
      }),
    ]);
    expect(selectReference(c)).toBeUndefined();
  });

  it("returns undefined when no confirmed offer exists at all", () => {
    const c = component("cpu-k", "provisional", [
      offer({
        offerId: "meli-listing",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "category-page",
      }),
      offer({
        offerId: "missing",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "404-or-missing",
      }),
    ]);
    expect(selectReference(c)).toBeUndefined();
  });

  it("returns undefined when only foreign offers without conversion exist", () => {
    const c = component("cpu-l", "provisional", [
      offer({
        offerId: "amazon-us-no-conv",
        sourceCurrency: "USD",
        listedAmount: 119,
        evidenceStatus: "confirmed",
      }),
    ]);
    expect(selectReference(c)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

describe("selectReference · provenance", () => {
  it("exposes retailer, sourceUrl, checkedAt from the chosen offer", () => {
    const c = component("cpu-m", "verified", [
      offer({
        offerId: "ktronix",
        retailer: "Ktronix",
        sourceUrl: "https://www.ktronix.com/p/cpu",
        sourceCurrency: "COP",
        listedAmount: 920_000,
        evidenceStatus: "confirmed",
        checkedAt: "2026-09-04T00:00:00-05:00",
      }),
    ]);
    const ref = selectReference(c);
    expect(ref?.retailer).toBe("Ktronix");
    expect(ref?.sourceUrl).toBe("https://www.ktronix.com/p/cpu");
    expect(ref?.checkedAt).toBe("2026-09-04T00:00:00-05:00");
  });
});
