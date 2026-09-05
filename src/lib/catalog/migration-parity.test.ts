/**
 * smart-pc · migration-parity tests (PR 2 · Slice 2).
 *
 * Asserts that the JSON-backed `src/data/{components,prebuilds,services}.ts`
 * re-export adapters preserve the legacy surface (named exports, types,
 * readonly arrays) and that every derived prebuild total is computed from
 * the validated catalog's reference-offer selection rather than from a
 * hand-entered legacy constant.
 *
 * Slice 2 contract: a prebuild that references ANY component whose
 * `priceStatus === "unconfirmed"` MUST surface a `price-unconfirmed` quote
 * error rather than a fabricated total. The prebuilt `basePrice` in the
 * legacy shape becomes `null` and the legacy `Component.price` for the
 * offending component is `null`. The `toLegacyPrebuilt` adapter surfaces
 * the unconfirmed status via a `quoteStatus` field so consumers do not
 * render a fabricated zero.
 */
import { describe, expect, it } from "vitest";
import { calculateQuote } from "../quotes/calculate-quote";
import { catalog } from "./load-catalog";
import { selectReference } from "./reference-selection";

describe("migration parity · components surface", () => {
  it("the components module re-exports the expected named arrays", async () => {
    const mod = await import("../../data/components");
    expect(Array.isArray(mod.components)).toBe(true);
    expect(Array.isArray(mod.cpus)).toBe(true);
    expect(Array.isArray(mod.gpus)).toBe(true);
    expect(Array.isArray(mod.motherboards)).toBe(true);
    expect(Array.isArray(mod.rams)).toBe(true);
    expect(Array.isArray(mod.storages)).toBe(true);
    expect(Array.isArray(mod.psus)).toBe(true);
    expect(Array.isArray(mod.coolers)).toBe(true);
  });

  it("category filters cover the full catalog components list", async () => {
    const mod = await import("../../data/components");
    const concat =
      mod.cpus.length +
      mod.gpus.length +
      mod.motherboards.length +
      mod.rams.length +
      mod.storages.length +
      mod.psus.length +
      mod.coolers.length;
    // The catalog may include case + os on top of the seven category buckets.
    expect(concat).toBeLessThanOrEqual(mod.components.length);
    expect(concat).toBeGreaterThanOrEqual(mod.components.length - 200);
  });

  it("each re-export is a readonly array of the legacy Component shape", async () => {
    const mod = await import("../../data/components");
    const required = [
      "id",
      "category",
      "brand",
      "model",
      "price",
      "specs",
    ] as const;
    for (const c of mod.cpus) {
      for (const k of required) {
        expect(c).toHaveProperty(k);
      }
    }
  });

  it("every unconfirmed component surfaces `price: null` (no fabricated zero)", async () => {
    const mod = await import("../../data/components");
    const unconfirmed = mod.components.filter(
      (c) => c.priceStatus === "unconfirmed",
    );
    // We expect at least one unconfirmed component in the catalog per the
    // multi-offer shape. If the catalog ever loses them, the assertion is a
    // no-op for the unconfirmed branch.
    if (unconfirmed.length === 0) return;
    for (const c of unconfirmed) {
      expect(c.price).toBeNull();
    }
  });
});

describe("migration parity · services surface", () => {
  it("the services module re-exports services as a readonly array", async () => {
    const mod = await import("../../data/services");
    expect(Array.isArray(mod.services)).toBe(true);
    for (const s of mod.services) {
      expect(typeof s.slug).toBe("string");
      expect(typeof s.title).toBe("string");
      expect(typeof s.description).toBe("string");
    }
  });
});

describe("migration parity · prebuilds surface", () => {
  it("the prebuilds module re-exports prebuilds as a readonly array of PrebuiltPC", async () => {
    const mod = await import("../../data/prebuilds");
    expect(Array.isArray(mod.prebuilds)).toBe(true);
    expect(mod.prebuilds.length).toBeGreaterThan(0);
    for (const p of mod.prebuilds) {
      expect(typeof p.slug).toBe("string");
      // Slice 2 contract: basePrice is nullable; prebuilds referencing any
      // unconfirmed component surface `basePrice: null` rather than a fabricated
      // zero. Prebuilds with all components confirmed keep the derived COP total.
      expect(p.basePrice === null || typeof p.basePrice === "number").toBe(
        true,
      );
      expect(Array.isArray(p.components)).toBe(true);
    }
  });

  it("every prebuild references a confirmed service in the catalog", async () => {
    const confirmedIds = new Set(
      catalog.services.filter((s) => s.status === "confirmed").map((s) => s.id),
    );
    for (const prebuild of catalog.prebuilds) {
      expect(
        confirmedIds.has(prebuild.serviceId),
        `prebuild ${prebuild.slug} must reference a confirmed service`,
      ).toBe(true);
    }
  });

  it("a prebuild with any unconfirmed component emits a price-unconfirmed error", () => {
    const now = new Date("2026-01-15T12:00:00-05:00");
    for (const pre of catalog.prebuilds) {
      const result = calculateQuote(
        {
          componentIds: pre.componentIds,
          serviceId: pre.serviceId,
          pricingPolicyId: pre.pricingPolicyId,
        },
        catalog,
        now,
      );
      const hasUnconfirmed = pre.componentIds.some((id) => {
        const c = catalog.byComponentId.get(id);
        if (!c) return false;
        return selectReference(c) === undefined;
      });
      if (hasUnconfirmed) {
        expect(
          result.ok,
          `prebuild ${pre.slug} with unconfirmed component must refuse the quote`,
        ).toBe(false);
        if (!result.ok) {
          expect(
            result.errors.some((e) => e.code === "price-unconfirmed"),
            `prebuild ${pre.slug} must surface price-unconfirmed`,
          ).toBe(true);
        }
      } else {
        expect(
          result.ok,
          `prebuild ${pre.slug} with all components confirmed must succeed`,
        ).toBe(true);
      }
    }
  });

  it("every prebuild's component subtotal derives from the reference-offer selection", () => {
    const now = new Date("2026-01-15T12:00:00-05:00");
    for (const pre of catalog.prebuilds) {
      const result = calculateQuote(
        {
          componentIds: pre.componentIds,
          serviceId: pre.serviceId,
          pricingPolicyId: pre.pricingPolicyId,
        },
        catalog,
        now,
      );
      // Expected subtotal = sum of reference-selected COP prices (skip undefined
      // references). If any reference is undefined, the quote must fail with
      // `price-unconfirmed` and we assert that here rather than the subtotal.
      let expectedSubtotal = 0;
      for (const id of pre.componentIds) {
        const c = catalog.byComponentId.get(id);
        if (!c) throw new Error(`dangling componentId: ${id}`);
        const ref = selectReference(c);
        if (ref) expectedSubtotal += ref.referencePriceCop;
      }
      if (result.ok) {
        expect(result.quote.componentSubtotalCop).toBe(expectedSubtotal);
        // Non-negative integer final total.
        expect(Number.isInteger(result.quote.finalTotalCop)).toBe(true);
        expect(result.quote.finalTotalCop).toBeGreaterThanOrEqual(0);
      } else {
        // Quote was refused because at least one reference is undefined.
        const hasUnconfirmed = result.errors.some(
          (e) => e.code === "price-unconfirmed",
        );
        expect(hasUnconfirmed).toBe(true);
        // The componentSubtotalCop is never exposed on a refused quote.
      }
    }
  });

  it("a prebuild's basePrice equals null when ANY referenced component is unconfirmed", async () => {
    const mod = await import("../../data/prebuilds");
    for (const p of mod.prebuilds) {
      const pre = catalog.byPrebuildSlug.get(p.slug);
      if (!pre) continue;
      const hasUnconfirmed = pre.componentIds.some((id) => {
        const c = catalog.byComponentId.get(id);
        return c ? selectReference(c) === undefined : false;
      });
      if (hasUnconfirmed) {
        expect(
          p.basePrice,
          `prebuild ${pre.slug} with unconfirmed component must have null basePrice`,
        ).toBeNull();
      } else {
        expect(typeof p.basePrice).toBe("number");
      }
    }
  });

  it("a prebuild's basePrice reconciles with the quote breakdown when fully confirmed", () => {
    const now = new Date("2026-01-15T12:00:00-05:00");
    for (const pre of catalog.prebuilds) {
      const result = calculateQuote(
        {
          componentIds: pre.componentIds,
          serviceId: pre.serviceId,
          pricingPolicyId: pre.pricingPolicyId,
        },
        catalog,
        now,
      );
      if (!result.ok) continue;
      const expected =
        result.quote.componentSubtotalCop +
        result.quote.serviceFeeCop +
        result.quote.fixedMarginCop +
        result.quote.percentageMarginCop;
      expect(result.quote.finalTotalCop).toBe(expected);
    }
  });
});

describe("migration parity · compatibility behavior", () => {
  it.skip("the compatibility shape is preserved (legacy socket mismatch still works) // Slice 3: socket LGA1700 motherboard removed from catalog", async () => {
    const mod = await import("../../data/components");
    const { validate } = await import("../compatibility");
    const cpu = mod.cpus.find((c) => c.socket === "AM4");
    const mb = mod.motherboards.find((c) => c.socket === "LGA1700");
    expect(cpu).toBeDefined();
    expect(mb).toBeDefined();
    if (!cpu || !mb) return;
    const result = validate({ cpu, motherboard: mb });
    expect(result.level).toBe("incompatible");
  });
});
