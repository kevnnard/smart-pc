/**
 * smart-pc · adapters tests (PR 2 · strict TDD).
 *
 * RED suite for `src/lib/catalog/adapters.ts`. Validates that the three
 * adapter functions map validated catalog records onto the legacy
 * `Component` / `ServiceRecord` / `PrebuiltPC` shapes used by every
 * existing page and component.
 */
import { describe, expect, it } from "vitest";
import {
  toLegacyComponent,
  toLegacyPrebuilt,
  toLegacyService,
} from "./adapters";
import type {
  Catalog,
  CatalogComponent,
  CatalogPrebuild,
  CatalogService,
  PricingPolicy,
} from "./catalog-types";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fixtureComponent(
  overrides: Partial<CatalogComponent> = {},
): CatalogComponent {
  const observedPriceCop =
    overrides.observedPriceCop !== undefined &&
    overrides.observedPriceCop !== null
      ? overrides.observedPriceCop
      : 800_000;
  const id = overrides.id ?? "cpu-x";
  const defaultOffer = {
    offerId: `ktronix-${id}`,
    retailer: "Ktronix",
    sourceUrl: `https://www.ktronix.com/${id}`,
    sourceCurrency: "COP" as const,
    listedAmount: observedPriceCop,
    sellerCondition: "Ktronix · new",
    availability: "in-stock" as const,
    checkedAt: "2026-01-01T00:00:00-05:00",
    evidenceStatus: "confirmed" as const,
  };
  const { offers: _, observedPriceCop: __, ...rest } = overrides;
  return {
    id,
    category: "cpu",
    brand: "AMD",
    model: "Ryzen X",
    name: "AMD Ryzen X",
    specs: { Cores: "6" },
    compatibility: { socket: "AM4", tdp: 65 },
    priceStatus: "verified",
    stockStatus: "in-stock",
    stockQuantity: null,
    ...rest,
    offers: overrides.offers ?? [defaultOffer],
    observedPriceCop,
    sourceStore: "Test",
    sourceUrl: `https://example.com/${id}`,
    lastVerified: "2026-01-01T00:00:00-05:00",
    availability: "in-stock",
    notes: "fixture",
  };
}

function fixtureConfirmedService(): CatalogService {
  return {
    id: "svc-confirmed",
    slug: "svc-confirmed",
    name: "Svc confirmed",
    description: "d",
    status: "confirmed",
    feeCop: 150_000,
    sourceStore: "Test",
    sourceUrl: "https://example.com/svc",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };
}

function fixtureRecommendedService(): CatalogService {
  return {
    id: "svc-recommended",
    slug: "svc-recommended",
    name: "Svc recommended",
    description: "d",
    icon: "🛠️",
    tier: "basic",
    status: "recommended",
    recommendedMinCop: 30_000,
    recommendedMaxCop: 80_000,
    confirmationNote: "Pending owner confirmation.",
    sourceStore: "Test",
    sourceUrl: "https://example.com/svc-rec",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };
}

function fixtureReferenceService() {
  return {
    id: "svc-ref",
    slug: "svc-ref",
    name: "Svc reference",
    description: "d",
    status: "reference" as const,
    referencePriceCop: 11_490,
    referenceNote: "~COP 11.490 with qualifying parts.",
    sourceStore: "Test",
    sourceUrl: "https://example.com/svc-ref",
    lastVerified: "2026-01-01T00:00:00-05:00",
  };
}

function fixturePolicy(overrides: Partial<PricingPolicy> = {}): PricingPolicy {
  return {
    id: "default",
    label: "Default",
    fixedMarginCop: 0,
    percentageMargin: 20,
    confirmed: true,
    ...overrides,
  };
}

function fixtureCatalog(
  components: CatalogComponent[],
  services: CatalogService[],
  prebuilds: CatalogPrebuild[],
  policies: PricingPolicy[],
): Catalog {
  return {
    schemaVersion: 1,
    components,
    services,
    prebuilds,
    policies,
    defaultPolicyId: policies[0]?.id ?? "",
    staleAfterDays: 30,
    byComponentId: new Map(components.map((c) => [c.id, c])),
    byServiceId: new Map(services.map((s) => [s.id, s])),
    byPolicyId: new Map(policies.map((p) => [p.id, p])),
    byPrebuildSlug: new Map(prebuilds.map((p) => [p.slug, p])),
  };
}

// ---------------------------------------------------------------------------
// toLegacyComponent
// ---------------------------------------------------------------------------

describe("toLegacyComponent", () => {
  it("preserves observedPriceCop as the legacy price field", () => {
    const c = fixtureComponent({ observedPriceCop: 920_000 });
    const legacy = toLegacyComponent(c);
    expect(legacy.price).toBe(920_000);
  });

  it("flattens compatibility fields onto the legacy Component shape", () => {
    const c = fixtureComponent({
      compatibility: {
        socket: "AM4",
        tdp: 65,
        ramType: "DDR4",
        ramSlots: 2,
        formFactor: "mATX",
        wattageDraw: 170,
        wattage: 650,
        interface_: "nvme",
      },
    });
    const legacy = toLegacyComponent(c);
    expect(legacy.socket).toBe("AM4");
    expect(legacy.tdp).toBe(65);
    expect(legacy.ramType).toBe("DDR4");
    expect(legacy.ramSlots).toBe(2);
    expect(legacy.formFactor).toBe("mATX");
    expect(legacy.wattageDraw).toBe(170);
    expect(legacy.wattage).toBe(650);
    expect(legacy.interface_).toBe("nvme");
  });

  it("keeps the same id, category, brand, model, and specs", () => {
    const c = fixtureComponent({
      id: "cpu-y",
      category: "gpu",
      brand: "NVIDIA",
      model: "RTX 4060",
      specs: { VRAM: "8 GB" },
    });
    const legacy = toLegacyComponent(c);
    expect(legacy.id).toBe("cpu-y");
    expect(legacy.category).toBe("gpu");
    expect(legacy.brand).toBe("NVIDIA");
    expect(legacy.model).toBe("RTX 4060");
    expect(legacy.specs.VRAM).toBe("8 GB");
  });

  it("does NOT add margin into the legacy price", () => {
    // If a maintainer changes the policy to 100%, the legacy price must still
    // equal the observed price. Margin is the quote engine's job.
    const c = fixtureComponent({ observedPriceCop: 1_000_000 });
    const legacy = toLegacyComponent(c);
    expect(legacy.price).toBe(1_000_000);
  });
});

// ---------------------------------------------------------------------------
// toLegacyService
// ---------------------------------------------------------------------------

describe("toLegacyService", () => {
  it("uses feeCop as startingPrice for a confirmed service", () => {
    const s = fixtureConfirmedService();
    const legacy = toLegacyService(s);
    expect(legacy.startingPrice).toBe(150_000);
  });

  it("uses recommendedMinCop as startingPrice for a recommended service", () => {
    const s = fixtureRecommendedService();
    const legacy = toLegacyService(s);
    expect(legacy.startingPrice).toBe(30_000);
  });

  it("preserves slug, title, description, and icon", () => {
    const s = fixtureRecommendedService();
    const legacy = toLegacyService(s);
    expect(legacy.slug).toBe(s.slug);
    expect(legacy.title).toBe(s.name);
    expect(legacy.description).toBe(s.description);
    expect(legacy.icon).toBe("🛠️");
  });

  it("omits startingPrice when a reference service has no price", () => {
    const base = fixtureReferenceService();
    const s = {
      id: base.id,
      slug: base.slug,
      name: base.name,
      description: base.description,
      status: "reference" as const,
      referenceNote: base.referenceNote,
      sourceStore: base.sourceStore,
      sourceUrl: base.sourceUrl,
      lastVerified: base.lastVerified,
    } satisfies CatalogService;
    const legacy = toLegacyService(s);
    expect(legacy.startingPrice).toBeUndefined();
  });

  it("does NOT silently turn a recommended range into a confirmed price", () => {
    const s = fixtureRecommendedService();
    const legacy = toLegacyService(s);
    // startingPrice is the lower bound of the recommended range — NOT a feeCop.
    // The recommended flag must surface via the description confirmationNote
    // OR remain structurally separate. Here we only assert that the value
    // comes from `recommendedMinCop`, not from any `feeCop` (none exists).
    expect(legacy.startingPrice).toBe(30_000);
    expect(legacy.startingPrice).not.toBe(80_000);
  });
});

// ---------------------------------------------------------------------------
// toLegacyPrebuilt
// ---------------------------------------------------------------------------

describe("toLegacyPrebuilt", () => {
  it("derives basePrice from calculateQuote(...).finalTotalCop", () => {
    const cpu = fixtureComponent({
      id: "cpu-a",
      observedPriceCop: 1_000_000,
      category: "cpu",
    });
    const gpu = fixtureComponent({
      id: "gpu-a",
      observedPriceCop: 500_000,
      category: "gpu",
      compatibility: { wattageDraw: 170 },
    });
    const mb = fixtureComponent({
      id: "mb-a",
      observedPriceCop: 200_000,
      category: "motherboard",
      compatibility: { ramType: "DDR4", ramSlots: 2, formFactor: "mATX" },
    });
    const ram = fixtureComponent({
      id: "ram-a",
      observedPriceCop: 100_000,
      category: "ram",
      compatibility: { ramType: "DDR4" },
    });
    const storage = fixtureComponent({
      id: "ssd-a",
      observedPriceCop: 100_000,
      category: "storage",
      compatibility: { interface_: "nvme" },
    });
    const psu = fixtureComponent({
      id: "psu-a",
      observedPriceCop: 200_000,
      category: "psu",
      compatibility: { wattage: 650 },
    });
    const cooler = fixtureComponent({
      id: "cooler-a",
      observedPriceCop: 80_000,
      category: "cooler",
      compatibility: { tdp: 220 },
    });
    const service = fixtureConfirmedService();
    const policy = fixturePolicy();
    const prebuild: CatalogPrebuild = {
      slug: "test",
      name: "Test",
      tier: "essentials",
      tagline: "Test",
      componentIds: [
        cpu.id,
        gpu.id,
        mb.id,
        ram.id,
        storage.id,
        psu.id,
        cooler.id,
      ],
      serviceId: service.id,
      pricingPolicyId: policy.id,
      featured: false,
    };
    const cat = fixtureCatalog(
      [cpu, gpu, mb, ram, storage, psu, cooler],
      [service],
      [prebuild],
      [policy],
    );
    const legacy = toLegacyPrebuilt(
      prebuild,
      cat,
      new Date("2026-01-15T12:00:00-05:00"),
    );
    // component subtotal = 1_000_000 + 500_000 + 200_000 + 100_000 + 100_000 + 200_000 + 80_000 = 2_180_000
    // 20% of 2_180_000 = 436_000
    // + service fee 150_000
    // final = 2_180_000 + 150_000 + 436_000 = 2_766_000
    expect(legacy.basePrice).toBe(2_180_000 + 150_000 + 436_000);
  });

  it("preserves slug, name, tier, tagline, featured, badge", () => {
    const prebuild: CatalogPrebuild = {
      slug: "essentials",
      name: "Essentials",
      tier: "essentials",
      tagline: "Home · Office",
      componentIds: [],
      serviceId: "svc-confirmed",
      pricingPolicyId: "default",
      featured: true,
      badge: "Más vendido",
    };
    const cat = fixtureCatalog([], [], [prebuild], [fixturePolicy()]);
    const legacy = toLegacyPrebuilt(
      prebuild,
      cat,
      new Date("2026-01-15T12:00:00-05:00"),
    );
    expect(legacy.slug).toBe("essentials");
    expect(legacy.name).toBe("Essentials");
    expect(legacy.tier).toBe("essentials");
    expect(legacy.tagline).toBe("Home · Office");
    expect(legacy.featured).toBe(true);
    expect(legacy.badge).toBe("Más vendido");
  });

  it("inlines legacy Component objects from the referenced catalog ids", () => {
    const cpu = fixtureComponent({
      id: "cpu-x",
      observedPriceCop: 300_000,
      category: "cpu",
    });
    const service = fixtureConfirmedService();
    const prebuild: CatalogPrebuild = {
      slug: "x",
      name: "X",
      tier: "essentials",
      tagline: "X",
      componentIds: ["cpu-x"],
      serviceId: service.id,
      pricingPolicyId: "default",
      featured: false,
    };
    const cat = fixtureCatalog([cpu], [service], [prebuild], [fixturePolicy()]);
    const legacy = toLegacyPrebuilt(
      prebuild,
      cat,
      new Date("2026-01-15T12:00:00-05:00"),
    );
    expect(legacy.components.length).toBe(1);
    expect(legacy.components[0]?.id).toBe("cpu-x");
    expect(legacy.components[0]?.price).toBe(300_000);
  });
});
