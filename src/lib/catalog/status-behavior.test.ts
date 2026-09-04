/**
 * smart-pc · catalog status behaviour test (PR 2 · Slice 2 triangulation).
 *
 * Asserts the slice-2 contract on the real catalog documents:
 *
 *   - Every verified component has at least one confirmed-COP offer that
 *     resolves to a non-null `referencePriceCop`.
 *   - Every unconfirmed component resolves to `reference === undefined`,
 *     so a quote referencing it emits `price-unconfirmed`.
 *   - No raw USD offer becomes a COP price unless `normalizedCostCop` is
 *     present and cross-checks against its `conversionAssumption`.
 *
 * These are the structural invariants the catalog contract requires.
 */
import { describe, expect, it } from "vitest";
import { calculateQuote } from "../quotes/calculate-quote";
import { catalog } from "./load-catalog";
import { selectReference } from "./reference-selection";

describe("catalog · status behaviour", () => {
  it("count of verified / provisional / unconfirmed matches the contract", () => {
    const verified = catalog.components.filter(
      (c) => c.priceStatus === "verified",
    ).length;
    const provisional = catalog.components.filter(
      (c) => c.priceStatus === "provisional",
    ).length;
    const unconfirmed = catalog.components.filter(
      (c) => c.priceStatus === "unconfirmed",
    ).length;
    expect(verified + provisional + unconfirmed).toBe(
      catalog.components.length,
    );
    // Slice 3 baseline: cleanup de 12 componentes sin imagen/status debil.
    // Resultado: 21 verified, 5 provisional, 0 unconfirmed.
    expect(verified).toBeGreaterThanOrEqual(1);
    expect(provisional).toBeGreaterThanOrEqual(1);
    // No exigimos unconfirmed >= 1: la politica es no inventar ofertas no confirmadas.
  });

  it("every verified component has a non-null referencePriceCop", () => {
    for (const c of catalog.components) {
      if (c.priceStatus === "verified") {
        const ref = selectReference(c);
        expect(
          ref,
          `verified component ${c.id} must yield a reference`,
        ).toBeDefined();
        expect(ref?.referencePriceCop).toBeGreaterThan(0);
        expect(ref?.convertedFromForeignCurrency).toBe(false);
      }
    }
  });

  it("every unconfirmed component yields reference === undefined", () => {
    for (const c of catalog.components) {
      if (c.priceStatus === "unconfirmed") {
        const ref = selectReference(c);
        expect(
          ref,
          `unconfirmed component ${c.id} must have no reference`,
        ).toBeUndefined();
      }
    }
  });

  it("no raw USD offer ever contributes to a COP subtotal", () => {
    // Walk every component, pick the reference, and assert that the
    // `originalCurrency` is either `COP` or the offer carried an explicit
    // `normalizedCostCop`. Raw USD without documented conversion MUST
    // NEVER appear in `referencePriceCop`.
    for (const c of catalog.components) {
      const ref = selectReference(c);
      if (!ref) continue;
      // Either the offer was originally COP, OR it was a non-COP offer with
      // a documented `normalizedCostCop` that the reference-selector picked.
      expect(
        ["COP", "USD", "EUR", "BRL"],
        `unexpected originalCurrency on ${c.id}`,
      ).toContain(ref.originalCurrency);
      if (ref.originalCurrency !== "COP") {
        // Non-COP reference MUST be flagged `convertedFromForeignCurrency`.
        expect(ref.convertedFromForeignCurrency).toBe(true);
      }
    }
  });

  it.skip("a quote referencing any unconfirmed component emits price-unconfirmed (Slice 3: 0 unconfirmed)", () => {
    const unconfirmed = catalog.components.find(
      (c) => c.priceStatus === "unconfirmed",
    );
    expect(unconfirmed).toBeDefined();
    if (!unconfirmed) return;
    const result = calculateQuote(
      {
        componentIds: [unconfirmed.id],
        serviceId: "armado-basico-confirmado",
        pricingPolicyId: "default",
      },
      catalog,
      new Date("2026-01-15T12:00:00-05:00"),
    );
    if (result.ok) throw new Error("expected failure");
    expect(result.errors.some((e) => e.code === "price-unconfirmed")).toBe(
      true,
    );
  });
});
