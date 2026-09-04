/**
 * smart-pc · quote calculation tests (PR 2 · strict TDD).
 *
 * RED suite for `src/lib/quotes/calculate-quote.ts`. Builds a tiny in-memory
 * `Catalog` fixture so tests exercise the real catalog contract without
 * importing the production catalog documents (those change too often to
 * freeze for this file).
 */
import { beforeEach, describe, expect, it } from "vitest";
import type { Catalog, CatalogService } from "../catalog/catalog-types";
import { calculateQuote, type QuoteRequest } from "./calculate-quote";

// ---------------------------------------------------------------------------
// Test fixture: a minimal catalog with one component, one confirmed service,
// one recommended service, one reference service, and one default policy.
// ---------------------------------------------------------------------------

const NOW = new Date("2026-01-15T12:00:00-05:00");

function buildFixture(): Catalog {
  const component = {
    id: "cpu-fixture",
    category: "cpu" as const,
    brand: "AMD",
    model: "Test CPU",
    name: "AMD Test CPU",
    specs: { Cores: "6" },
    compatibility: {},
    priceStatus: "verified" as const,
    stockStatus: "in-stock" as const,
    stockQuantity: null,
    offers: [
      {
        offerId: "ktronix-cpu-fixture",
        retailer: "Ktronix",
        sourceUrl: "https://www.ktronix.com/cpu-fixture",
        sourceCurrency: "COP" as const,
        listedAmount: 1_000_000,
        sellerCondition: "Ktronix · new",
        availability: "in-stock" as const,
        checkedAt: "2026-01-01T00:00:00-05:00",
        evidenceStatus: "confirmed" as const,
      },
    ],
    observedPriceCop: 1_000_000,
    sourceStore: "Fixture",
    sourceUrl: "https://example.com/cpu",
    lastVerified: "2026-01-01T00:00:00-05:00",
    availability: "in-stock" as const,
  };

  const confirmedService = {
    id: "svc-confirmed",
    slug: "svc-confirmed",
    name: "Confirmed service",
    description: "Confirmed",
    status: "confirmed" as const,
    feeCop: 50_000,
    sourceStore: "Fixture",
    sourceUrl: "https://example.com/svc",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };

  const recommendedService = {
    id: "svc-recommended",
    slug: "svc-recommended",
    name: "Recommended service",
    description: "Recommended (range)",
    status: "recommended" as const,
    recommendedMinCop: 30_000,
    recommendedMaxCop: 80_000,
    confirmationNote: "Range pending owner confirmation.",
    sourceStore: "Fixture",
    sourceUrl: "https://example.com/svc-rec",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };

  const referenceService = {
    id: "svc-reference",
    slug: "svc-reference",
    name: "Reference service",
    description: "Reference only",
    status: "reference" as const,
    referencePriceCop: 11_490,
    referenceNote: "Free or ~COP 11.490 with qualifying parts.",
    sourceStore: "Fixture",
    sourceUrl: "https://example.com/svc-ref",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };

  const policy = {
    id: "default",
    label: "Default",
    fixedMarginCop: 80_000,
    percentageMargin: 5,
    confirmed: true,
  };

  return {
    schemaVersion: 1 as const,
    components: [component],
    services: [confirmedService, recommendedService, referenceService],
    prebuilds: [],
    policies: [policy],
    defaultPolicyId: "default",
    staleAfterDays: 30,
    byComponentId: new Map<string, typeof component>([
      [component.id, component],
    ]),
    byServiceId: new Map<string, CatalogService>([
      [confirmedService.id, confirmedService],
      [recommendedService.id, recommendedService],
      [referenceService.id, referenceService],
    ]),
    byPolicyId: new Map([[policy.id, policy]]),
    byPrebuildSlug: new Map(),
  };
}

let CATALOG: Catalog;
beforeEach(() => {
  CATALOG = buildFixture();
});

// ---------------------------------------------------------------------------
// Basic plumbing
// ---------------------------------------------------------------------------

describe("calculateQuote · plumbing", () => {
  it("returns ok=true with a Quote when input is valid", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(true);
  });

  it("is deterministic — same inputs + same now → deep-equal output", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const a = calculateQuote(req, CATALOG, NOW);
    const b = calculateQuote(req, CATALOG, NOW);
    expect(a).toEqual(b);
  });
});

// ---------------------------------------------------------------------------
// Component subtotal
// ---------------------------------------------------------------------------

describe("calculateQuote · component subtotal", () => {
  it("sums observedPriceCop unchanged for the requested component ids", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.componentSubtotalCop).toBe(1_000_000);
  });

  it("returns empty-selection error when no component ids are passed", () => {
    const req: QuoteRequest = {
      componentIds: [],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "empty-selection")).toBe(true);
  });

  it("returns unknown-component error per missing id", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture", "cpu-missing", "another-missing"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const codes = result.errors.map((e) => e.code);
    expect(codes.filter((c) => c === "unknown-component").length).toBe(2);
    expect(result.errors.find((e) => e.id === "cpu-missing")).toBeDefined();
  });

  it("does NOT change the catalog observedPriceCop after quoting (read-only)", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    calculateQuote(req, CATALOG, NOW);
    expect(CATALOG.byComponentId.get("cpu-fixture")?.observedPriceCop).toBe(
      1_000_000,
    );
  });
});

// ---------------------------------------------------------------------------
// Service fee + recommended/reference refusal
// ---------------------------------------------------------------------------

describe("calculateQuote · service fee", () => {
  it("uses the confirmed service feeCop verbatim", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.serviceFeeCop).toBe(50_000);
  });

  it("returns unknown-service error for an unknown id", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-missing",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "unknown-service")).toBe(true);
  });

  it("refuses a final quote when the service is recommended", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-recommended",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "service-not-confirmed")).toBe(
      true,
    );
  });

  it("refuses a final quote when the service is reference-only", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-reference",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "service-not-confirmed")).toBe(
      true,
    );
  });

  it("accumulates errors (does not stop at the first one)", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-missing"],
      serviceId: "svc-recommended",
      pricingPolicyId: "policy-missing",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const codes = new Set(result.errors.map((e) => e.code));
    expect(codes.has("unknown-component")).toBe(true);
    expect(codes.has("service-not-confirmed")).toBe(true);
    expect(codes.has("unknown-policy")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Margin policy
// ---------------------------------------------------------------------------

describe("calculateQuote · pricing policy", () => {
  it("applies a fixed margin unchanged", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.fixedMarginCop).toBe(80_000);
  });

  it("applies percentage margin as 5% of the component subtotal", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    if (!result.ok) throw new Error("expected ok");
    // 1,000,000 × 5% = 50,000
    expect(result.quote.percentageMarginCop).toBe(50_000);
    expect(result.quote.percentageMarginRate).toBe(5);
  });

  it("percentage margin excludes the service fee", () => {
    // Mutate the catalog to bump the service fee from 50,000 to 999,000.
    const altCatalog: Catalog = {
      ...CATALOG,
      services: [
        {
          ...CATALOG.services[0],
          feeCop: 999_000,
        } as Catalog["services"][number],
        ...CATALOG.services.slice(1),
      ],
    };
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, altCatalog, NOW);
    if (!result.ok) throw new Error("expected ok");
    // Percentage must still be 5% of 1,000,000 = 50,000, NOT 5% of (subtotal+fee)
    expect(result.quote.percentageMarginCop).toBe(50_000);
  });

  it("changing feeCop never changes percentageMarginCop", () => {
    // Triangulation: the spec mandates "Percentage margin MUST be based on
    // the component subtotal and MUST NOT include the service fee." Verify
    // by computing the same configuration with two different fee values.
    const baseReq: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };

    const lowFeeService = {
      ...CATALOG.services[0],
      feeCop: 1_000,
    } as Catalog["services"][number];
    const highFeeService = {
      ...CATALOG.services[0],
      feeCop: 999_999,
    } as Catalog["services"][number];

    const lowFeeCatalog: Catalog = {
      ...CATALOG,
      services: [lowFeeService, ...CATALOG.services.slice(1)],
      byServiceId: new Map<string, CatalogService>([
        [lowFeeService.id, lowFeeService],
        ...CATALOG.services.slice(1).map((s) => [s.id, s] as const),
      ]),
    };
    const highFeeCatalog: Catalog = {
      ...CATALOG,
      services: [highFeeService, ...CATALOG.services.slice(1)],
      byServiceId: new Map<string, CatalogService>([
        [highFeeService.id, highFeeService],
        ...CATALOG.services.slice(1).map((s) => [s.id, s] as const),
      ]),
    };

    const lowResult = calculateQuote(baseReq, lowFeeCatalog, NOW);
    const highResult = calculateQuote(baseReq, highFeeCatalog, NOW);
    if (!lowResult.ok || !highResult.ok) throw new Error("expected ok");
    expect(lowResult.quote.percentageMarginCop).toBe(
      highResult.quote.percentageMarginCop,
    );
    // But the final totals must differ.
    expect(lowResult.quote.finalTotalCop).not.toBe(
      highResult.quote.finalTotalCop,
    );
  });

  it("returns unknown-policy error for an unknown id", () => {
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "policy-missing",
    };
    const result = calculateQuote(req, CATALOG, NOW);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "unknown-policy")).toBe(true);
  });

  it("default-to-zero margin policy: both margins 0", () => {
    const zeroMarginPolicy = {
      id: "zero",
      label: "Zero",
      fixedMarginCop: 0,
      percentageMargin: 0,
      confirmed: true,
    };
    const altCatalog: Catalog = {
      ...CATALOG,
      policies: [zeroMarginPolicy],
      byPolicyId: new Map([[zeroMarginPolicy.id, zeroMarginPolicy]]),
    };
    const req: QuoteRequest = {
      componentIds: ["cpu-fixture"],
      serviceId: "svc-confirmed",
      pricingPolicyId: "zero",
    };
    const result = calculateQuote(req, altCatalog, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.fixedMarginCop).toBe(0);
    expect(result.quote.percentageMarginCop).toBe(0);
    expect(result.quote.marginAmountCop).toBe(0);
    expect(result.quote.finalTotalCop).toBe(
      result.quote.componentSubtotalCop + result.quote.serviceFeeCop,
    );
  });
});

// ---------------------------------------------------------------------------
// Spec worked examples
// ---------------------------------------------------------------------------

describe("calculateQuote · spec worked examples", () => {
  // Spec: components 2,000,000 + service 60,000 + fixed 150,000 = total 2,210,000
  it("fixed-margin example: 2,000,000 + 60,000 + fixed 150,000 = 2,210,000", () => {
    const component = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,

      offers: [
        {
          offerId: "ktronix-cpu-fixture",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/cpu-fixture",
          sourceCurrency: "COP" as const,
          listedAmount: 2_000_000,
          sellerCondition: "Ktronix · new",
          availability: "in-stock" as const,
          checkedAt: "2026-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed" as const,
        },
      ],
      observedPriceCop: 2_000_000,
    };
    const service = {
      ...CATALOG.services[0],
      feeCop: 60_000,
    } as Catalog["services"][number];
    const policy = {
      id: "fixed-only",
      label: "Fixed only",
      fixedMarginCop: 150_000,
      percentageMargin: 0,
      confirmed: true,
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [component],
      services: [service],
      policies: [policy],
      byComponentId: new Map([[component.id, component]]),
      byServiceId: new Map([[service.id, service]]),
      byPolicyId: new Map([[policy.id, policy]]),
    };
    const req: QuoteRequest = {
      componentIds: [component.id],
      serviceId: service.id,
      pricingPolicyId: policy.id,
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.componentSubtotalCop).toBe(2_000_000);
    expect(result.quote.serviceFeeCop).toBe(60_000);
    expect(result.quote.fixedMarginCop).toBe(150_000);
    expect(result.quote.percentageMarginCop).toBe(0);
    expect(result.quote.marginAmountCop).toBe(150_000);
    expect(result.quote.finalTotalCop).toBe(2_210_000);
  });

  // Spec: 3,000,000 + 150,000 + 10% = 3,450,000 with percentage margin 300,000
  it("percentage-margin example: 3,000,000 + 150,000 + 10% = 3,450,000", () => {
    const component = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,

      offers: [
        {
          offerId: "ktronix-cpu-fixture",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/cpu-fixture",
          sourceCurrency: "COP" as const,
          listedAmount: 3_000_000,
          sellerCondition: "Ktronix · new",
          availability: "in-stock" as const,
          checkedAt: "2026-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed" as const,
        },
      ],
      observedPriceCop: 3_000_000,
    };
    const service = {
      ...CATALOG.services[0],
      feeCop: 150_000,
    } as Catalog["services"][number];
    const policy = {
      id: "pct-only",
      label: "Pct only",
      fixedMarginCop: 0,
      percentageMargin: 10,
      confirmed: true,
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [component],
      services: [service],
      policies: [policy],
      byComponentId: new Map([[component.id, component]]),
      byServiceId: new Map([[service.id, service]]),
      byPolicyId: new Map([[policy.id, policy]]),
    };
    const req: QuoteRequest = {
      componentIds: [component.id],
      serviceId: service.id,
      pricingPolicyId: policy.id,
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.componentSubtotalCop).toBe(3_000_000);
    expect(result.quote.serviceFeeCop).toBe(150_000);
    expect(result.quote.percentageMarginCop).toBe(300_000);
    expect(result.quote.marginAmountCop).toBe(300_000);
    expect(result.quote.finalTotalCop).toBe(3_450_000);
  });

  // Spec: 1,000,000 + 50,000 + fixed 80,000 + 5% = 1,180,000 with margin 130,000
  it("combined example: 1,000,000 + 50,000 + fixed 80,000 + 5% = 1,180,000", () => {
    const component = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,
      offers: [
        {
          offerId: "ktronix-cpu-fixture",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/cpu-fixture",
          sourceCurrency: "COP" as const,
          listedAmount: 1_000_000,
          sellerCondition: "Ktronix · new",
          availability: "in-stock" as const,
          checkedAt: "2026-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed" as const,
        },
      ],
      observedPriceCop: 1_000_000,
    };
    const service = {
      ...CATALOG.services[0],
      feeCop: 50_000,
    } as Catalog["services"][number];
    const policy = {
      id: "both",
      label: "Both",
      fixedMarginCop: 80_000,
      percentageMargin: 5,
      confirmed: true,
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [component],
      services: [service],
      policies: [policy],
      byComponentId: new Map([[component.id, component]]),
      byServiceId: new Map([[service.id, service]]),
      byPolicyId: new Map([[policy.id, policy]]),
    };
    const req: QuoteRequest = {
      componentIds: [component.id],
      serviceId: service.id,
      pricingPolicyId: policy.id,
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.componentSubtotalCop).toBe(1_000_000);
    expect(result.quote.serviceFeeCop).toBe(50_000);
    expect(result.quote.fixedMarginCop).toBe(80_000);
    expect(result.quote.percentageMarginCop).toBe(50_000);
    expect(result.quote.marginAmountCop).toBe(130_000);
    expect(result.quote.finalTotalCop).toBe(1_180_000);
  });

  // Spec quote owned: 20% on a 1_000_000 subtotal must be exactly 200_000
  it("owner-confirmed 20% on 1,000,000 = 200,000", () => {
    const component = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,
      offers: [
        {
          offerId: "ktronix-cpu-fixture",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/cpu-fixture",
          sourceCurrency: "COP" as const,
          listedAmount: 1_000_000,
          sellerCondition: "Ktronix · new",
          availability: "in-stock" as const,
          checkedAt: "2026-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed" as const,
        },
      ],
      observedPriceCop: 1_000_000,
    };
    const policy = {
      id: "twenty",
      label: "Twenty",
      fixedMarginCop: 0,
      percentageMargin: 20,
      confirmed: true,
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [component],
      policies: [policy],
      byComponentId: new Map([[component.id, component]]),
      byPolicyId: new Map([[policy.id, policy]]),
    };
    const req: QuoteRequest = {
      componentIds: [component.id],
      serviceId: "svc-confirmed",
      pricingPolicyId: "twenty",
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.percentageMarginCop).toBe(200_000);
  });

  // Triangulation: a 0.5-COP fractional result must round upward (half-up).
  // subtotal × bps / 10000 = 0.5 → rounds to 1.
  it("a fractional 0.5-COP percentage result rounds upward", () => {
    const component = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,
      offers: [
        {
          offerId: "ktronix-cpu-fixture",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/cpu-fixture",
          sourceCurrency: "COP" as const,
          listedAmount: 1_000_000,
          sellerCondition: "Ktronix · new",
          availability: "in-stock" as const,
          checkedAt: "2026-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed" as const,
        },
      ],
      observedPriceCop: 1_000_000,
    };
    // 0.0005% on 1_000_000 = 5 COP. Half-up at 0.5 is irrelevant here;
    // we need a subtotal × bps that hits exactly 0.5 COP. Use 0.5% on 100:
    // 100 × 50 bps / 10000 = 0.5 COP → rounds up to 1 COP.
    const tinyComponent = {
      ...component,

      offers: [
        {
          ...component.offers[0]!,
          offerId: "ktronix-tiny",
          listedAmount: 100,
        },
      ],
      observedPriceCop: 100,
    };
    const policy = {
      id: "half-pct",
      label: "Half %",
      fixedMarginCop: 0,
      percentageMargin: 0.5,
      confirmed: true,
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [tinyComponent],
      policies: [policy],
      byComponentId: new Map([[tinyComponent.id, tinyComponent]]),
      byPolicyId: new Map([[policy.id, policy]]),
    };
    const req: QuoteRequest = {
      componentIds: [tinyComponent.id],
      serviceId: "svc-confirmed",
      pricingPolicyId: "half-pct",
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.percentageMarginCop).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Stale warnings
// ---------------------------------------------------------------------------

describe("calculateQuote · stale warnings", () => {
  it("returns staleWarnings for components older than staleAfterDays", () => {
    const oldComponent = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,
      // Two years old; staleAfterDays = 30 → stale.
      lastVerified: "2024-01-01T00:00:00-05:00",
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [oldComponent],
      byComponentId: new Map([[oldComponent.id, oldComponent]]),
    };
    const req: QuoteRequest = {
      componentIds: [oldComponent.id],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.staleWarnings.length).toBeGreaterThan(0);
    expect(result.quote.staleWarnings[0]?.id).toBe(oldComponent.id);
    expect(result.quote.staleWarnings[0]?.recordKind).toBe("component");
  });

  it("does not warn when lastVerified is within staleAfterDays", () => {
    const freshComponent = {
      ...CATALOG.byComponentId.get("cpu-fixture")!,
      lastVerified: "2026-01-10T00:00:00-05:00",
    };
    const cat: Catalog = {
      ...CATALOG,
      components: [freshComponent],
      byComponentId: new Map([[freshComponent.id, freshComponent]]),
    };
    const req: QuoteRequest = {
      componentIds: [freshComponent.id],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
    };
    const result = calculateQuote(req, cat, NOW);
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.staleWarnings.length).toBe(0);
  });
});
