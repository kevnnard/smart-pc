/**
 * smart-pc · catalog view-model helpers (Slice 3 · strict TDD · RED).
 *
 * RED suite for `src/lib/products/catalog-view-model.ts`. The Astro
 * components `ProductCard.astro` and `ProductInventory.astro` consume the
 * `ProductViewModel` shape this module produces; the React filter island
 * consumes the same shape serialized. Pinning the shape here means a UI
 * change can never silently drop a field.
 */
import { describe, expect, it } from "vitest";
import type { Catalog, CatalogComponent } from "../catalog/catalog-types";
import { selectReference } from "../catalog/reference-selection";
import {
  buildProductViewModel,
  filterByCategory,
  filterByPriceStatus,
  filterBySearch,
  filterByStock,
  groupByCategory,
  hasVisiblePrice,
  productViewModelsForCatalog,
} from "./catalog-view-model";

// ---------------------------------------------------------------------------
// Test fixture: a minimal but representative slice of the catalog.
// ---------------------------------------------------------------------------

function component(partial: {
  readonly id: string;
  readonly category: CatalogComponent["category"];
  readonly priceStatus: CatalogComponent["priceStatus"];
  readonly stockStatus: CatalogComponent["stockStatus"];
  readonly stockQuantity: CatalogComponent["stockQuantity"];
  readonly observedPriceCop: number | null;
  readonly confirmedCopOffer?: { readonly amount: number };
}): CatalogComponent {
  const offers = partial.confirmedCopOffer
    ? [
        {
          offerId: `${partial.id}-primary`,
          retailer: "Test Retailer",
          sourceUrl: `https://example.com/${partial.id}`,
          sourceCurrency: "COP" as const,
          listedAmount: partial.confirmedCopOffer.amount,
          sellerCondition: "Test · new",
          availability: partial.stockStatus,
          checkedAt: "2026-09-04T00:00:00-05:00",
          evidenceStatus: "confirmed" as const,
        },
      ]
    : [];
  return {
    id: partial.id,
    category: partial.category,
    brand: "Test",
    model: partial.id,
    name: partial.id,
    specs: {},
    compatibility: {},
    priceStatus: partial.priceStatus,
    stockStatus: partial.stockStatus,
    stockQuantity: partial.stockQuantity,
    offers,
    observedPriceCop: partial.observedPriceCop,
    sourceStore: "Test Retailer",
    sourceUrl: "https://example.com",
    lastVerified: "2026-09-04T00:00:00-05:00",
    availability: partial.stockStatus,
  };
}

const VERIFIED_CPU = component({
  id: "cpu-1",
  category: "cpu",
  priceStatus: "verified",
  stockStatus: "in-stock",
  stockQuantity: 12,
  observedPriceCop: 504_000,
  confirmedCopOffer: { amount: 504_000 },
});

const PROVISIONAL_GPU = component({
  id: "gpu-1",
  category: "gpu",
  priceStatus: "provisional",
  stockStatus: "limited",
  stockQuantity: 2,
  observedPriceCop: 1_180_000,
  confirmedCopOffer: { amount: 1_180_000 },
});

const UNCONFIRMED_MOBO = component({
  id: "mb-1",
  category: "motherboard",
  priceStatus: "unconfirmed",
  stockStatus: "unknown",
  stockQuantity: null,
  observedPriceCop: null,
});

const OUT_OF_STOCK_RAM = component({
  id: "ram-1",
  category: "ram",
  priceStatus: "verified",
  stockStatus: "out-of-stock",
  stockQuantity: 0,
  observedPriceCop: 110_000,
  confirmedCopOffer: { amount: 110_000 },
});

const UNKNOWN_RAM = component({
  id: "ram-2",
  category: "ram",
  priceStatus: "unconfirmed",
  stockStatus: "unknown",
  stockQuantity: null,
  observedPriceCop: null,
});

function fixtureCatalog(): Catalog {
  return {
    schemaVersion: 1 as const,
    components: [
      VERIFIED_CPU,
      PROVISIONAL_GPU,
      UNCONFIRMED_MOBO,
      OUT_OF_STOCK_RAM,
      UNKNOWN_RAM,
    ],
    services: [],
    prebuilds: [],
    policies: [],
    defaultPolicyId: "default",
    staleAfterDays: 30,
    byComponentId: new Map([
      [VERIFIED_CPU.id, VERIFIED_CPU],
      [PROVISIONAL_GPU.id, PROVISIONAL_GPU],
      [UNCONFIRMED_MOBO.id, UNCONFIRMED_MOBO],
      [OUT_OF_STOCK_RAM.id, OUT_OF_STOCK_RAM],
      [UNKNOWN_RAM.id, UNKNOWN_RAM],
    ]),
    byServiceId: new Map(),
    byPolicyId: new Map(),
    byPrebuildSlug: new Map(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildProductViewModel", () => {
  it("returns a fully populated view model for a verified component with a confirmed-COP offer", () => {
    const vm = buildProductViewModel(VERIFIED_CPU);
    expect(vm.id).toBe("cpu-1");
    expect(vm.categoryId).toBe("cpu");
    expect(vm.categoryLabel).toBe("Procesador");
    expect(vm.brand).toBe("Test");
    expect(vm.model).toBe("cpu-1");
    expect(vm.name).toBe("cpu-1");
    expect(vm.priceStatus).toBe("verified");
    expect(vm.hasExactPrice).toBe(true);
    expect(vm.referencePriceCop).toBe(504_000);
    expect(vm.selectedOfferId).toBe("cpu-1-primary");
    expect(vm.selectedRetailer).toBe("Test Retailer");
    expect(vm.selectedSourceUrl).toBe("https://example.com/cpu-1");
    expect(vm.selectedCheckedAt).toBe("2026-09-04T00:00:00-05:00");
    expect(vm.stockStatus).toBe("in-stock");
    expect(vm.stockQuantity).toBe(12);
    expect(vm.hasVerifiedPrice).toBe(true);
    expect(vm.isProvisional).toBe(false);
    expect(vm.isUnconfirmed).toBe(false);
    expect(vm.hasMultipleOffers).toBe(false);
    expect(vm.offers).toHaveLength(1);
    expect(vm.restockNote).toBeUndefined();
  });

  it("marks a provisional component as having an exact price via the reference selector", () => {
    const vm = buildProductViewModel(PROVISIONAL_GPU);
    expect(vm.priceStatus).toBe("provisional");
    expect(vm.hasExactPrice).toBe(true);
    expect(vm.referencePriceCop).toBe(1_180_000);
    expect(vm.isProvisional).toBe(true);
    expect(vm.hasVerifiedPrice).toBe(false);
    expect(vm.stockStatus).toBe("limited");
    expect(vm.stockQuantity).toBe(2);
  });

  it("marks an unconfirmed component with no exact price and no selected offer", () => {
    const vm = buildProductViewModel(UNCONFIRMED_MOBO);
    expect(vm.priceStatus).toBe("unconfirmed");
    expect(vm.hasExactPrice).toBe(false);
    expect(vm.referencePriceCop).toBeUndefined();
    expect(vm.selectedOfferId).toBeUndefined();
    expect(vm.selectedRetailer).toBeUndefined();
    expect(vm.selectedSourceUrl).toBeUndefined();
    expect(vm.isUnconfirmed).toBe(true);
    expect(vm.stockStatus).toBe("unknown");
    expect(vm.stockQuantity).toBeNull();
  });

  it("preserves a restock note when the component carries one", () => {
    const WITH_NOTE: CatalogComponent = {
      ...VERIFIED_CPU,
      id: "cpu-with-note",
      restockNote: "Reposición semanal según confirmación de bodega Bogotá.",
    };
    const vm = buildProductViewModel(WITH_NOTE);
    expect(vm.restockNote).toBe(
      "Reposición semanal según confirmación de bodega Bogotá.",
    );
  });

  it("exposes every offer (even category-page / 404-or-missing) for the provenance block", () => {
    const WITH_MANY: CatalogComponent = {
      ...VERIFIED_CPU,
      id: "cpu-many",
      offers: [
        ...VERIFIED_CPU.offers,
        {
          offerId: "cpu-many-meli",
          retailer: "MercadoLibre Colombia",
          sourceUrl: "https://listado.mercadolibre.com.co/ryzen-5-5600",
          sourceCurrency: "COP" as const,
          listedAmount: 650_000,
          sellerCondition: "MercadoLibre third-party · new",
          availability: "in-stock" as const,
          checkedAt: "2026-09-04T00:00:00-05:00",
          evidenceStatus: "category-page" as const,
        },
      ],
    };
    const vm = buildProductViewModel(WITH_MANY);
    expect(vm.hasMultipleOffers).toBe(true);
    expect(vm.offers).toHaveLength(2);
  });

  it("sets hasImage false because the catalog never carries image URLs", () => {
    const vm = buildProductViewModel(VERIFIED_CPU);
    expect(vm.hasImage).toBe(false);
    expect(vm.imageUrl).toBeUndefined();
  });
});

describe("productViewModelsForCatalog", () => {
  it("maps every catalog component to a view model and preserves catalog order", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(vms.map((v) => v.id)).toEqual([
      "cpu-1",
      "gpu-1",
      "mb-1",
      "ram-1",
      "ram-2",
    ]);
  });
});

describe("hasVisiblePrice", () => {
  it("is true for verified and provisional, false for unconfirmed", () => {
    expect(hasVisiblePrice("verified")).toBe(true);
    expect(hasVisiblePrice("provisional")).toBe(true);
    expect(hasVisiblePrice("unconfirmed")).toBe(false);
  });
});

describe("filterByCategory", () => {
  it("returns the input untouched when filter is the sentinel 'all'", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterByCategory(vms, "all").map((v) => v.id)).toEqual(
      vms.map((v) => v.id),
    );
  });

  it("filters by exact category id", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterByCategory(vms, "ram").map((v) => v.id)).toEqual([
      "ram-1",
      "ram-2",
    ]);
    expect(filterByCategory(vms, "cpu").map((v) => v.id)).toEqual(["cpu-1"]);
    expect(filterByCategory(vms, "motherboard").map((v) => v.id)).toEqual([
      "mb-1",
    ]);
    expect(filterByCategory(vms, "unknown-category")).toEqual([]);
  });
});

describe("filterByStock", () => {
  it("returns an empty array when the filter set is empty (no stock selected)", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterByStock(vms, [])).toEqual([]);
  });

  it("returns every input when every status is in the filter set", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    const out = filterByStock(vms, [
      "in-stock",
      "limited",
      "out-of-stock",
      "unknown",
    ]);
    expect(out).toEqual(vms);
  });

  it("filters by exact stock status set", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterByStock(vms, ["in-stock"]).map((v) => v.id)).toEqual([
      "cpu-1",
    ]);
    expect(filterByStock(vms, ["limited"]).map((v) => v.id)).toEqual(["gpu-1"]);
    expect(filterByStock(vms, ["out-of-stock"]).map((v) => v.id)).toEqual([
      "ram-1",
    ]);
    expect(filterByStock(vms, ["unknown"]).map((v) => v.id)).toEqual([
      "mb-1",
      "ram-2",
    ]);
  });
});

describe("groupByCategory", () => {
  it("groups view models by category preserving first-seen order", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    const groups = groupByCategory(vms);
    const ids = groups.map((g) => g.categoryId);
    expect(ids).toEqual(["cpu", "gpu", "motherboard", "ram"]);
    expect(groups[0]?.items.map((v) => v.id)).toEqual(["cpu-1"]);
    expect(groups[3]?.items.map((v) => v.id)).toEqual(["ram-1", "ram-2"]);
  });
});
describe("filterBySearch (Kinetic Performance sidebar search field)", () => {
  it("returns the input untouched when the query is empty or only whitespace", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterBySearch(vms, "").map((v) => v.id)).toEqual(
      vms.map((v) => v.id),
    );
    expect(filterBySearch(vms, "   ").map((v) => v.id)).toEqual(
      vms.map((v) => v.id),
    );
  });

  it("matches case-insensitively against id, brand, model, and categoryLabel", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterBySearch(vms, "cpu-1").map((v) => v.id)).toEqual(["cpu-1"]);
    expect(filterBySearch(vms, "placa").map((v) => v.id)).toEqual(["mb-1"]);
  });

  it("returns an empty array when the query matches nothing", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterBySearch(vms, "xyz-unknown-fragment")).toEqual([]);
  });

  it("trims surrounding whitespace before comparing", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterBySearch(vms, "  cpu-1  ")).toEqual(
      filterBySearch(vms, "cpu-1"),
    );
  });
});

describe("filterByPriceStatus (Confirmado / Provisional / No confirmado sidebar)", () => {
  it("returns an empty array when the selection is empty", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    expect(filterByPriceStatus(vms, [])).toEqual([]);
  });

  it("returns the full set when every price status is in the selection", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    const out = filterByPriceStatus(vms, [
      "verified",
      "provisional",
      "unconfirmed",
    ]);
    expect(out.map((v) => v.id)).toEqual(vms.map((v) => v.id));
  });

  it("filters strictly to the selected statuses", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    // cpu-1 and ram-1 are both "verified" per the fixture.
    expect(filterByPriceStatus(vms, ["verified"]).map((v) => v.id)).toEqual([
      "cpu-1",
      "ram-1",
    ]);
    expect(filterByPriceStatus(vms, ["provisional"]).map((v) => v.id)).toEqual([
      "gpu-1",
    ]);
    expect(filterByPriceStatus(vms, ["unconfirmed"]).map((v) => v.id)).toEqual([
      "mb-1",
      "ram-2",
    ]);
    expect(
      filterByPriceStatus(vms, ["verified", "provisional"]).map((v) => v.id),
    ).toEqual(["cpu-1", "gpu-1", "ram-1"]);
  });

  it("ignores invalid price-status strings and never throws", () => {
    const vms = productViewModelsForCatalog(fixtureCatalog());
    const noCrash = filterByPriceStatus(vms, [
      "unknown-future" as unknown as "verified",
    ]);
    expect(Array.isArray(noCrash)).toBe(true);
  });
});
