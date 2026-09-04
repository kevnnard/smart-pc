/**
 * smart-pc · configurator catalog helper tests (PR 2 · Slice 2).
 *
 * RED-first suite for `src/lib/configurator/configurator-catalog.ts`.
 * Asserts the synthesis rules that turn the configurator's legacy
 * `Component[]` selection into a `Catalog`-shaped object whose
 * `selectReference` runs against real data:
 *
 *   - `price !== null` components get a single confirmed-COP offer.
 *   - `price === null` components get NO offers (so `selectReference`
 *     returns `undefined` and the quote engine emits `price-unconfirmed`).
 *   - The synthetic catalog exposes the same lookup maps as the real one.
 */
import { describe, expect, it } from "vitest";
import type { Component } from "../../data/types";
import type { CatalogService, PricingPolicy } from "../catalog/catalog-types";
import { calculateQuote } from "../quotes/calculate-quote";
import { buildConfiguratorCatalog } from "./configurator-catalog";

function confirmedService(): CatalogService {
  return {
    id: "svc-confirmed",
    slug: "svc-confirmed",
    name: "Confirmed",
    description: "Confirmed",
    status: "confirmed",
    feeCop: 150_000,
    sourceStore: "Test",
    sourceUrl: "https://example.com/svc",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };
}

const POLICY: PricingPolicy = {
  id: "default",
  label: "Default",
  fixedMarginCop: 0,
  percentageMargin: 20,
  confirmed: true,
};

function component(
  partial: Partial<Component> & {
    id: string;
    category: Component["category"];
    brand: string;
    model: string;
    price: number | null;
  },
): Component {
  return {
    id: partial.id,
    category: partial.category,
    brand: partial.brand,
    model: partial.model,
    price: partial.price,
    specs: partial.specs ?? {},
    socket: partial.socket,
    ramType: partial.ramType,
    ramSlots: partial.ramSlots,
    tdp: partial.tdp,
    wattage: partial.wattage,
    wattageDraw: partial.wattageDraw,
    interface_: partial.interface_,
    formFactor: partial.formFactor,
    priceStatus: partial.priceStatus,
    stockStatus: partial.stockStatus,
    stockQuantity: partial.stockQuantity,
    restockNote: partial.restockNote,
  };
}

// ---------------------------------------------------------------------------
// buildConfiguratorCatalog · synthesis rules
// ---------------------------------------------------------------------------

describe("buildConfiguratorCatalog · synthesis", () => {
  it("attaches a single confirmed-COP offer for each component with price !== null", () => {
    const cpu = component({
      id: "cpu-a",
      category: "cpu",
      brand: "AMD",
      model: "Ryzen 5",
      price: 800_000,
    });
    const cat = buildConfiguratorCatalog([cpu], confirmedService(), POLICY);
    const synth = cat.byComponentId.get("cpu-a");
    expect(synth).toBeDefined();
    expect(synth?.offers).toHaveLength(1);
    expect(synth?.offers[0]?.evidenceStatus).toBe("confirmed");
    expect(synth?.offers[0]?.sourceCurrency).toBe("COP");
    expect(synth?.offers[0]?.listedAmount).toBe(800_000);
  });

  it("attaches NO offers for components with price === null (unconfirmed)", () => {
    const cpu = component({
      id: "cpu-b",
      category: "cpu",
      brand: "AMD",
      model: "Ryzen 5 (no SKU)",
      price: null,
    });
    const cat = buildConfiguratorCatalog([cpu], confirmedService(), POLICY);
    const synth = cat.byComponentId.get("cpu-b");
    expect(synth).toBeDefined();
    expect(synth?.offers).toEqual([]);
    expect(synth?.priceStatus).toBe("unconfirmed");
  });

  it("preserves priceStatus from the legacy Component when provided", () => {
    const cpu = component({
      id: "cpu-c",
      category: "cpu",
      brand: "AMD",
      model: "Ryzen 5",
      price: 800_000,
      priceStatus: "provisional",
    });
    const cat = buildConfiguratorCatalog([cpu], confirmedService(), POLICY);
    expect(cat.byComponentId.get("cpu-c")?.priceStatus).toBe("provisional");
  });

  it("exposes byServiceId and byPolicyId so the quote engine resolves them", () => {
    const cpu = component({
      id: "cpu-d",
      category: "cpu",
      brand: "AMD",
      model: "Ryzen 5",
      price: 800_000,
    });
    const cat = buildConfiguratorCatalog([cpu], confirmedService(), POLICY);
    expect(cat.byServiceId.get("svc-confirmed")).toBeDefined();
    expect(cat.byPolicyId.get("default")).toBeDefined();
    expect(cat.defaultPolicyId).toBe("default");
  });
});

// ---------------------------------------------------------------------------
// Integration with calculateQuote
// ---------------------------------------------------------------------------

describe("buildConfiguratorCatalog · quote integration", () => {
  it("a fully-priced selection produces a final total via the synthetic catalog", () => {
    const cpu = component({
      id: "cpu-e",
      category: "cpu",
      brand: "AMD",
      model: "Ryzen 5",
      price: 1_000_000,
    });
    const cat = buildConfiguratorCatalog([cpu], confirmedService(), POLICY);
    const result = calculateQuote(
      {
        componentIds: ["cpu-e"],
        serviceId: "svc-confirmed",
        pricingPolicyId: "default",
      },
      cat,
      new Date("2026-01-15T12:00:00-05:00"),
    );
    if (!result.ok) throw new Error("expected ok");
    expect(result.quote.componentSubtotalCop).toBe(1_000_000);
    expect(result.quote.serviceFeeCop).toBe(150_000);
    expect(result.quote.percentageMarginCop).toBe(200_000);
    // 1_000_000 + 150_000 + 200_000 = 1_350_000
    expect(result.quote.finalTotalCop).toBe(1_350_000);
  });

  it("a selection with one unconfirmed component emits price-unconfirmed", () => {
    const cpu = component({
      id: "cpu-f",
      category: "cpu",
      brand: "AMD",
      model: "Ryzen 5 (confirmed)",
      price: 1_000_000,
    });
    const unconfirmedGpu = component({
      id: "gpu-f",
      category: "gpu",
      brand: "NVIDIA",
      model: "RTX 4060 (unconfirmed)",
      price: null,
    });
    const cat = buildConfiguratorCatalog(
      [cpu, unconfirmedGpu],
      confirmedService(),
      POLICY,
    );
    const result = calculateQuote(
      {
        componentIds: ["cpu-f", "gpu-f"],
        serviceId: "svc-confirmed",
        pricingPolicyId: "default",
      },
      cat,
      new Date("2026-01-15T12:00:00-05:00"),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((e) => e.code === "price-unconfirmed")).toBe(
      true,
    );
  });
});
