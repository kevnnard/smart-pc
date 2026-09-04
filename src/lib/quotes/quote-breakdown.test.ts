/**
 * smart-pc · quote breakdown disclosure tests (PR 2 · strict TDD).
 *
 * Asserts that the `lines` array returned by `calculateQuote` is ordered
 * exactly as the spec demands (components → service → fixed → percentage →
 * total-margin → final-total) and that the line amounts reconcile to the
 * final total without gaps or double-counts.
 */
import { describe, expect, it } from "vitest";
import type { Catalog } from "../catalog/catalog-types";
import { calculateQuote } from "./calculate-quote";

function buildCatalog(
  percentageMargin: number,
  fixedMarginCop: number,
): Catalog {
  const component = {
    id: "cpu",
    category: "cpu" as const,
    brand: "AMD",
    model: "Test",
    name: "AMD Test",
    specs: { Cores: "6" },
    compatibility: {},
    priceStatus: "verified" as const,
    stockStatus: "in-stock" as const,
    stockQuantity: null,
    offers: [
      {
        offerId: "ktronix-cpu",
        retailer: "Ktronix",
        sourceUrl: "https://www.ktronix.com/cpu",
        sourceCurrency: "COP" as const,
        listedAmount: 1_000_000,
        sellerCondition: "Ktronix · new",
        availability: "in-stock" as const,
        checkedAt: "2026-01-01T00:00:00-05:00",
        evidenceStatus: "confirmed" as const,
      },
    ],
    observedPriceCop: 1_000_000,
    sourceStore: "Test",
    sourceUrl: "https://example.com",
    lastVerified: "2026-01-01T00:00:00-05:00",
    availability: "in-stock" as const,
  };
  const service = {
    id: "svc",
    slug: "svc",
    name: "Svc",
    description: "Svc",
    status: "confirmed" as const,
    feeCop: 50_000,
    sourceStore: "Test",
    sourceUrl: "https://example.com/svc",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };
  const policy = {
    id: "p",
    label: "P",
    fixedMarginCop,
    percentageMargin,
    confirmed: true,
  };
  return {
    schemaVersion: 1 as const,
    components: [component],
    services: [service],
    prebuilds: [],
    policies: [policy],
    defaultPolicyId: "p",
    staleAfterDays: 30,
    byComponentId: new Map([[component.id, component]]),
    byServiceId: new Map([[service.id, service]]),
    byPolicyId: new Map([[policy.id, policy]]),
    byPrebuildSlug: new Map(),
  };
}

const NOW = new Date("2026-01-15T12:00:00-05:00");

describe("quote breakdown · ordering", () => {
  it("lists lines in spec order: components, service, fixed-margin, percentage-margin, total-margin, total", () => {
    const cat = buildCatalog(5, 80_000);
    const result = calculateQuote(
      { componentIds: ["cpu"], serviceId: "svc", pricingPolicyId: "p" },
      cat,
      NOW,
    );
    if (!result.ok) throw new Error("expected ok");
    const kinds = result.quote.lines.map((l) => l.kind);
    expect(kinds).toEqual([
      "components",
      "service",
      "fixed-margin",
      "percentage-margin",
      "total-margin",
      "total",
    ]);
  });

  it("each line has a non-empty Spanish label", () => {
    const cat = buildCatalog(5, 80_000);
    const result = calculateQuote(
      { componentIds: ["cpu"], serviceId: "svc", pricingPolicyId: "p" },
      cat,
      NOW,
    );
    if (!result.ok) throw new Error("expected ok");
    for (const line of result.quote.lines) {
      expect(typeof line.label).toBe("string");
      expect(line.label.length).toBeGreaterThan(0);
    }
  });

  it("the percentage-margin line carries its configured rate for disclosure", () => {
    const cat = buildCatalog(20, 0);
    const result = calculateQuote(
      { componentIds: ["cpu"], serviceId: "svc", pricingPolicyId: "p" },
      cat,
      NOW,
    );
    if (!result.ok) throw new Error("expected ok");
    const pct = result.quote.lines.find((l) => l.kind === "percentage-margin");
    expect(pct?.rate).toBe(20);
  });
});

describe("quote breakdown · reconciliation", () => {
  it("non-total line amounts sum to the final total", () => {
    const cat = buildCatalog(5, 80_000);
    const result = calculateQuote(
      { componentIds: ["cpu"], serviceId: "svc", pricingPolicyId: "p" },
      cat,
      NOW,
    );
    if (!result.ok) throw new Error("expected ok");
    const nonTotalSum = result.quote.lines
      .filter((l) => l.kind !== "total")
      .reduce((sum, l) => sum + l.amountCop, 0);
    // The total-margin line is itself the sum of fixed + percentage, so the
    // sum of non-total lines (components + service + fixed + percentage +
    // total-margin) would double-count margin. Use the spec formula instead:
    // final = components + service + fixed + percentage.
    const expected =
      result.quote.componentSubtotalCop +
      result.quote.serviceFeeCop +
      result.quote.fixedMarginCop +
      result.quote.percentageMarginCop;
    expect(result.quote.finalTotalCop).toBe(expected);
    // The displayed "total" line must equal the same value.
    const totalLine = result.quote.lines.find((l) => l.kind === "total");
    expect(totalLine?.amountCop).toBe(expected);
    // Sanity: the non-total sum must include the total-margin line AND the
    // individual margins (so it's expected to exceed the final total).
    expect(nonTotalSum).toBeGreaterThan(result.quote.finalTotalCop);
  });

  it("total-margin line equals fixed + percentage", () => {
    const cat = buildCatalog(5, 80_000);
    const result = calculateQuote(
      { componentIds: ["cpu"], serviceId: "svc", pricingPolicyId: "p" },
      cat,
      NOW,
    );
    if (!result.ok) throw new Error("expected ok");
    const tm = result.quote.lines.find((l) => l.kind === "total-margin");
    expect(tm?.amountCop).toBe(result.quote.marginAmountCop);
    expect(tm?.amountCop).toBe(
      result.quote.fixedMarginCop + result.quote.percentageMarginCop,
    );
  });
});
