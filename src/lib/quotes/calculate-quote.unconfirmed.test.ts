/**
 * smart-pc · quote calculation · price-unconfirmed + reference-driven tests
 * (PR 2 · Slice 2 RED).
 *
 * Extends `calculate-quote.test.ts` with the multi-offer contract:
 *
 *   - `price-unconfirmed` error code is emitted whenever ANY referenced
 *     component is `priceStatus: "unconfirmed"` or has no eligible reference.
 *   - The quote engine MUST refuse the final total (return `ok: false`) when
 *     a `price-unconfirmed` error is present, so callers cannot accidentally
 *     render a fabricated zero.
 *   - The quote engine MUST use the reference-selected `referencePriceCop`,
 *     never `observedPriceCop ?? 0` (which silently fabricates 0).
 *   - Foreign-currency offers contribute their documented `normalizedCostCop`
 *     to the subtotal — never `listedAmount` directly.
 *   - When only the unconfirmed component is referenced, no partial final
 *     total is computed.
 */
import { describe, expect, it } from "vitest";
import type {
  Catalog,
  CatalogComponent,
  CatalogService,
  Offer,
} from "../catalog/catalog-types";
import { calculateQuote, type QuoteRequest } from "./calculate-quote";

const NOW = new Date("2026-01-15T12:00:00-05:00");

function offer(partial: {
  offerId: string;
  sourceCurrency: string;
  listedAmount: number;
  evidenceStatus: Offer["evidenceStatus"];
  retailer?: string;
  normalizedCostCop?: number;
  conversionAssumption?: {
    targetCurrency: "COP";
    exchangeRateCopPerUnit: number;
    rateSource: string;
    rateAsOf: string;
    notes: string;
  };
}): Offer {
  return {
    offerId: partial.offerId,
    retailer: partial.retailer ?? "Test",
    sourceUrl: `https://example.com/${partial.offerId}`,
    sourceCurrency: partial.sourceCurrency,
    listedAmount: partial.listedAmount,
    sellerCondition: "Test · new",
    availability: "in-stock",
    checkedAt: "2026-09-04T00:00:00-05:00",
    evidenceStatus: partial.evidenceStatus,
    normalizedCostCop: partial.normalizedCostCop,
    conversionAssumption: partial.conversionAssumption,
  };
}

function fixtureComponent(
  overrides: Partial<CatalogComponent> = {},
): CatalogComponent {
  return {
    id: "cpu-fixture",
    category: "cpu",
    brand: "AMD",
    model: "Test CPU",
    name: "AMD Test CPU",
    specs: { Cores: "6" },
    compatibility: {},
    priceStatus: "verified",
    stockStatus: "in-stock",
    stockQuantity: null,
    offers: [
      offer({
        offerId: "ktronix",
        sourceCurrency: "COP",
        listedAmount: 1_000_000,
        evidenceStatus: "confirmed",
      }),
    ],
    observedPriceCop: 1_000_000,
    sourceStore: "Fixture",
    sourceUrl: "https://example.com/cpu",
    lastVerified: "2026-01-01T00:00:00-05:00",
    availability: "in-stock",
    ...overrides,
  };
}

function confirmedService(): CatalogService {
  return {
    id: "svc-confirmed",
    slug: "svc-confirmed",
    name: "Confirmed",
    description: "Confirmed",
    status: "confirmed",
    feeCop: 150_000,
    sourceStore: "Fixture",
    sourceUrl: "https://example.com/svc",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };
}

const POLICY = {
  id: "default",
  label: "Default",
  fixedMarginCop: 0,
  percentageMargin: 20,
  confirmed: true,
};

function fixtureCatalog(components: CatalogComponent[]): Catalog {
  return {
    schemaVersion: 1 as const,
    components,
    services: [confirmedService()],
    prebuilds: [],
    policies: [POLICY],
    defaultPolicyId: "default",
    staleAfterDays: 30,
    byComponentId: new Map(components.map((c) => [c.id, c])),
    byServiceId: new Map([[confirmedService().id, confirmedService()]]),
    byPolicyId: new Map([[POLICY.id, POLICY]]),
    byPrebuildSlug: new Map(),
  };
}

const REQ: QuoteRequest = {
  componentIds: ["cpu-fixture"],
  serviceId: "svc-confirmed",
  pricingPolicyId: "default",
};

// ---------------------------------------------------------------------------
// price-unconfirmed: the engine MUST refuse the quote, never fabricate 0
// ---------------------------------------------------------------------------

describe("calculateQuote · price-unconfirmed", () => {
  it("refuses the quote when a referenced component is priceStatus: 'unconfirmed'", () => {
    const cat = fixtureCatalog([
      fixtureComponent({ priceStatus: "unconfirmed", observedPriceCop: null }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "price-unconfirmed")).toBe(
      true,
    );
  });

  it("never computes a partial final total when ANY referenced component is unconfirmed", () => {
    const cat = fixtureCatalog([
      fixtureComponent({ priceStatus: "unconfirmed", observedPriceCop: null }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    if (result.ok) throw new Error("expected failure");
    // No final total exists for the failed quote.
    expect("finalTotalCop" in result).toBe(false);
    // Only the price-unconfirmed error is reported (other refs are clean).
    const unconfirmedErrors = result.errors.filter(
      (e) => e.code === "price-unconfirmed",
    );
    expect(unconfirmedErrors.length).toBe(1);
  });

  it("accumulates a price-unconfirmed error per unconfirmed component", () => {
    const cat = fixtureCatalog([
      fixtureComponent({
        id: "cpu-unconfirmed",
        priceStatus: "unconfirmed",
        observedPriceCop: null,
      }),
      fixtureComponent({
        id: "gpu-unconfirmed",
        category: "gpu",
        priceStatus: "unconfirmed",
        observedPriceCop: null,
      }),
    ]);
    const result = calculateQuote(
      {
        componentIds: ["cpu-unconfirmed", "gpu-unconfirmed"],
        serviceId: "svc-confirmed",
        pricingPolicyId: "default",
      },
      cat,
      NOW,
    );
    if (result.ok) throw new Error("expected failure");
    const codes = result.errors.filter((e) => e.code === "price-unconfirmed");
    expect(codes.length).toBe(2);
  });

  it("does NOT fabricate a 0 contribution for an unconfirmed component", () => {
    // Even when an unconfirmed component has `observedPriceCop: null` AND a
    // confirmed COP offer, the quote MUST refuse. The unconfirmed status is
    // a maintainer-authored declaration that no exact-SKU evidence exists.
    const cat = fixtureCatalog([
      fixtureComponent({
        id: "cpu-mixed",
        priceStatus: "unconfirmed",
        observedPriceCop: 1_000_000,
      }),
    ]);
    const result = calculateQuote(
      {
        componentIds: ["cpu-mixed"],
        serviceId: "svc-confirmed",
        pricingPolicyId: "default",
      },
      cat,
      NOW,
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((e) => e.code === "price-unconfirmed")).toBe(
      true,
    );
  });

  it("does NOT use observedPriceCop ?? 0 silently for an unconfirmed component", () => {
    // Regression: the legacy `c.observedPriceCop ?? 0` pattern silently
    // fabricated a 0 in the subtotal. After Slice 2, an unconfirmed
    // component MUST be rejected outright so no fabrication leaks into a
    // final quote.
    const cat = fixtureCatalog([
      fixtureComponent({ priceStatus: "unconfirmed", observedPriceCop: null }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    if (result.ok) {
      throw new Error("expected failure");
    }
    // No partial subtotal survives the failure.
    expect(result.ok).toBe(false);
  });

  it("refuses the quote when a verified component has no eligible reference", () => {
    // A verified component whose only offers are category-page or 404 has no
    // reference. The validator would normally reject this combination, but the
    // quote engine MUST also refuse when the runtime data disagrees with the
    // declared status.
    const cat = fixtureCatalog([
      fixtureComponent({
        priceStatus: "verified",
        observedPriceCop: null,
        offers: [
          offer({
            offerId: "meli-listing",
            sourceCurrency: "COP",
            listedAmount: 1_000_000,
            evidenceStatus: "category-page",
          }),
        ],
      }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((e) => e.code === "price-unconfirmed")).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// Reference-driven subtotal: the engine uses selectReference, not raw offers
// ---------------------------------------------------------------------------

describe("calculateQuote · reference-driven subtotal", () => {
  it("uses the lowest confirmed COP offer as the component subtotal", () => {
    const cat = fixtureCatalog([
      fixtureComponent({
        offers: [
          offer({
            offerId: "ktronix",
            sourceCurrency: "COP",
            listedAmount: 1_000_000,
            evidenceStatus: "confirmed",
          }),
          offer({
            offerId: "alkosto",
            sourceCurrency: "COP",
            listedAmount: 1_050_000,
            evidenceStatus: "confirmed",
          }),
        ],
        observedPriceCop: 1_000_000,
      }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.componentSubtotalCop).toBe(1_000_000);
  });

  it("uses normalizedCostCop (not listedAmount) for a foreign-currency offer", () => {
    const cat = fixtureCatalog([
      fixtureComponent({
        priceStatus: "provisional",
        offers: [
          offer({
            offerId: "amazon-us",
            sourceCurrency: "USD",
            listedAmount: 119,
            evidenceStatus: "confirmed",
            normalizedCostCop: 501_000,
            conversionAssumption: {
              targetCurrency: "COP",
              exchangeRateCopPerUnit: 4000,
              rateSource: "trm",
              rateAsOf: "2026-09-03T00:00:00-05:00",
              notes: "TRM + envío.",
            },
          }),
        ],
        observedPriceCop: 501_000,
      }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    // Subtotal must use the documented normalizedCostCop (501_000), NOT the
    // raw USD listedAmount (119).
    expect(result.quote.componentSubtotalCop).toBe(501_000);
  });

  it("exposes reference provenance for the chosen offer", () => {
    const cat = fixtureCatalog([
      fixtureComponent({
        offers: [
          offer({
            offerId: "ktronix",
            sourceCurrency: "COP",
            listedAmount: 1_000_000,
            evidenceStatus: "confirmed",
            retailer: "Ktronix",
          }),
        ],
        observedPriceCop: 1_000_000,
      }),
    ]);
    const result = calculateQuote(REQ, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    const provenance = result.quote.referenceProvenance;
    expect(provenance.length).toBe(1);
    expect(provenance[0]?.componentId).toBe("cpu-fixture");
    expect(provenance[0]?.offerId).toBe("ktronix");
    expect(provenance[0]?.retailer).toBe("Ktronix");
    expect(provenance[0]?.referencePriceCop).toBe(1_000_000);
    expect(provenance[0]?.convertedFromForeignCurrency).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

describe("calculateQuote · determinism under multi-offer input", () => {
  it("two offers at the same listedAmount resolve to the same offerId every run", () => {
    const cat = fixtureCatalog([
      fixtureComponent({
        offers: [
          offer({
            offerId: "offer-b",
            sourceCurrency: "COP",
            listedAmount: 1_000_000,
            evidenceStatus: "confirmed",
          }),
          offer({
            offerId: "offer-a",
            sourceCurrency: "COP",
            listedAmount: 1_000_000,
            evidenceStatus: "confirmed",
          }),
        ],
        observedPriceCop: 1_000_000,
      }),
    ]);
    const a = calculateQuote(REQ, cat, NOW);
    const b = calculateQuote(REQ, cat, NOW);
    if (!a.ok || !b.ok) throw new Error("expected ok");
    expect(a.quote.referenceProvenance[0]?.offerId).toBe(
      b.quote.referenceProvenance[0]?.offerId,
    );
  });
});
