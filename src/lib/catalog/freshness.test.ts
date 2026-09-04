/**
 * smart-pc · freshness tests (PR 1, strict TDD).
 *
 * RED phase: every test below references `src/lib/catalog/freshness.ts`
 * which does NOT exist yet, so the file fails the suite until the GREEN
 * implementation lands.
 *
 * The freshness helpers MUST be pure and inject the clock — no `Date.now()`
 * is permitted inside the production module so that build output and tests
 * are deterministic.
 */
import { describe, expect, it } from "vitest";
import {
  ageInDays,
  type FreshnessRecord,
  isStale,
  shouldDowngradeToProvisional,
  staleWarningFor,
  staleWarningsForOffers,
} from "./freshness";

const NOW = new Date("2025-03-01T12:00:00Z");

const componentRecord: FreshnessRecord = {
  recordKind: "component",
  id: "cpu-amd-ryzen-5-5600",
  lastVerified: "2025-02-01T00:00:00Z",
};

const serviceRecord: FreshnessRecord = {
  recordKind: "service",
  id: "armado-basico",
  lastVerified: "2025-02-01T00:00:00Z",
};

describe("freshness", () => {
  describe("ageInDays", () => {
    it("returns 0 when lastVerified equals now", () => {
      expect(ageInDays("2025-03-01T12:00:00Z", NOW)).toBe(0);
    });

    it("returns whole days between lastVerified and now", () => {
      expect(ageInDays("2025-02-15T12:00:00Z", NOW)).toBe(14);
    });

    it("handles lastVerified before now across timezone offsets", () => {
      const lastVerified = "2025-02-28T00:00:00-05:00"; // 05:00 UTC same day
      expect(ageInDays(lastVerified, NOW)).toBe(1);
    });

    it("returns a negative number when lastVerified is in the future", () => {
      expect(ageInDays("2025-04-01T00:00:00Z", NOW)).toBeLessThan(0);
    });

    it("returns NaN when lastVerified is unparseable", () => {
      expect(Number.isNaN(ageInDays("not a date", NOW))).toBe(true);
    });
  });

  describe("isStale", () => {
    it("is NOT stale when age is strictly below staleAfterDays", () => {
      expect(isStale("2025-02-25T00:00:00Z", 7, NOW)).toBe(false);
    });

    it("is NOT stale on the exact staleAfterDays boundary", () => {
      expect(isStale("2025-02-22T12:00:00Z", 7, NOW)).toBe(false);
    });

    it("IS stale one day past the staleAfterDays boundary", () => {
      expect(isStale("2025-02-22T11:59:59Z", 7, NOW)).toBe(false);
      expect(isStale("2025-02-15T00:00:00Z", 7, NOW)).toBe(true);
    });
  });

  describe("staleWarningFor", () => {
    it("returns undefined when the record is fresh", () => {
      expect(staleWarningFor(componentRecord, 30, NOW)).toBeUndefined();
    });

    it("returns a warning carrying id, kind, lastVerified and ageDays when stale", () => {
      const warning = staleWarningFor(componentRecord, 7, NOW);
      expect(warning).toBeDefined();
      expect(warning?.recordKind).toBe("component");
      expect(warning?.id).toBe("cpu-amd-ryzen-5-5600");
      expect(warning?.lastVerified).toBe("2025-02-01T00:00:00Z");
      expect(warning?.ageDays).toBeGreaterThan(7);
    });

    it("supports service records with the same shape", () => {
      const warning = staleWarningFor(serviceRecord, 7, NOW);
      expect(warning?.recordKind).toBe("service");
      expect(warning?.id).toBe("armado-basico");
    });

    it("retains stale records rather than failing validation (warning, not error)", () => {
      // The contract: stale is a warning. The function returns a warning
      // object — it never throws and never returns null when stale.
      const warning = staleWarningFor(componentRecord, 7, NOW);
      expect(warning).not.toBeNull();
      expect(warning).toBeDefined();
    });
  });
});

// ===========================================================================
// Slice 1 · per-offer staleness RED tests
// ===========================================================================

describe("freshness · per-offer staleness (Slice 1 RED)", () => {
  const NOW = new Date("2026-09-15T12:00:00-05:00");

  it("returns zero warnings when every offer is fresh", () => {
    const warnings = staleWarningsForOffers(
      [
        {
          offerId: "fresh-1",
          retailer: "StackPC",
          sourceUrl: "https://www.stackpc.com.co/productos/amd-ryzen-5-5600",
          checkedAt: "2026-09-10T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
      ],
      "cpu-amd-ryzen-5-5600",
      30,
      NOW,
    );
    expect(warnings).toEqual([]);
  });

  it("returns one warning per stale offer carrying offerId, retailer, sourceUrl, checkedAt and ageDays", () => {
    const warnings = staleWarningsForOffers(
      [
        {
          offerId: "stale-1",
          retailer: "StackPC",
          sourceUrl: "https://www.stackpc.com.co/productos/amd-ryzen-5-5600",
          checkedAt: "2026-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
        {
          offerId: "fresh-2",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/marcas/amd/c/amd",
          checkedAt: "2026-09-10T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
      ],
      "cpu-amd-ryzen-5-5600",
      30,
      NOW,
    );
    expect(warnings.length).toBe(1);
    expect(warnings[0]?.offerId).toBe("stale-1");
    expect(warnings[0]?.retailer).toBe("StackPC");
    expect(warnings[0]?.sourceUrl).toBe(
      "https://www.stackpc.com.co/productos/amd-ryzen-5-5600",
    );
    expect(warnings[0]?.componentId).toBe("cpu-amd-ryzen-5-5600");
    expect(warnings[0]?.ageDays).toBeGreaterThan(30);
  });

  it("returns multiple warnings when many offers are stale", () => {
    const warnings = staleWarningsForOffers(
      [
        {
          offerId: "stale-1",
          retailer: "StackPC",
          sourceUrl: "https://www.stackpc.com.co/x",
          checkedAt: "2025-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
        {
          offerId: "stale-2",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/x",
          checkedAt: "2025-06-01T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
      ],
      "cpu-amd-ryzen-5-5600",
      30,
      NOW,
    );
    expect(warnings.length).toBe(2);
  });
});

describe("freshness · verified → provisional downgrade (Slice 1 RED)", () => {
  it("returns false when at least one confirmed offer is fresh", () => {
    const downgrade = shouldDowngradeToProvisional({
      offers: [
        {
          offerId: "fresh",
          retailer: "StackPC",
          sourceUrl: "https://www.stackpc.com.co/x",
          checkedAt: "2026-09-10T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
        {
          offerId: "stale",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/x",
          checkedAt: "2025-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
      ],
      staleAfterDays: 30,
      now: new Date("2026-09-15T12:00:00-05:00"),
    });
    expect(downgrade).toBe(false);
  });

  it("returns true when every confirmed offer is stale", () => {
    const downgrade = shouldDowngradeToProvisional({
      offers: [
        {
          offerId: "stale-1",
          retailer: "StackPC",
          sourceUrl: "https://www.stackpc.com.co/x",
          checkedAt: "2025-01-01T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
        {
          offerId: "stale-2",
          retailer: "Ktronix",
          sourceUrl: "https://www.ktronix.com/x",
          checkedAt: "2025-06-01T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
      ],
      staleAfterDays: 30,
      now: new Date("2026-09-15T12:00:00-05:00"),
    });
    expect(downgrade).toBe(true);
  });

  it("ignores non-confirmed offers when deciding downgrade", () => {
    const downgrade = shouldDowngradeToProvisional({
      offers: [
        {
          offerId: "fresh-confirmed",
          retailer: "StackPC",
          sourceUrl: "https://www.stackpc.com.co/x",
          checkedAt: "2026-09-10T00:00:00-05:00",
          evidenceStatus: "confirmed",
        },
        {
          offerId: "stale-category",
          retailer: "MercadoLibre",
          sourceUrl: "https://listado.mercadolibre.com.co/x",
          checkedAt: "2025-01-01T00:00:00-05:00",
          evidenceStatus: "category-page",
        },
      ],
      staleAfterDays: 30,
      now: new Date("2026-09-15T12:00:00-05:00"),
    });
    expect(downgrade).toBe(false);
  });
});
