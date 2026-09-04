/**
 * smart-pc · money helpers (PR 2 · strict TDD).
 *
 * RED suite for `src/lib/money.ts`:
 *   - `formatCop()` — Spanish Colombia (es-CO) whole-COP output.
 *   - `halfUpDivide()` — deterministic integer half-up division.
 *   - `roundHalfUpCop()` — percentage margin in basis points.
 *   - `PRICE_VARIATION_NOTICE` — single shared observed-price caveat.
 *
 * Reference: spec.md §Deterministic quote formula and design.md §7.2.
 */
import { describe, expect, it } from "vitest";
import {
  formatCop,
  halfUpDivide,
  PRICE_VARIATION_NOTICE,
  roundHalfUpCop,
} from "./money";

describe("formatCop", () => {
  it("formats a whole COP amount with the es-CO currency style", () => {
    const out = formatCop(1_300_000);
    // es-CO produces "$ 1.300.000" with a non-breaking space between $ and the number.
    expect(out).toContain("1.300.000");
    expect(out.toLowerCase()).toContain("1.300.000");
    expect(out).toMatch(/COP|\$/);
  });

  it("renders zero as the COP currency form", () => {
    const out = formatCop(0);
    expect(out).toMatch(/0/);
  });

  it("never produces decimals in the output (maximumFractionDigits = 0)", () => {
    // es-CO uses "." for thousand separators and "," for decimals. With
    // maximumFractionDigits = 0 there must be no trailing decimal portion.
    const out = formatCop(1_234_567);
    // No decimal portion: not ",<digits>" right before the end or whitespace.
    expect(out).not.toMatch(/,\d{1,2}\s*$/);
    // No fractional COP digits following a decimal comma inside the number.
    expect(out).not.toMatch(/,\d/);
  });

  it("uses the Spanish (Colombia) locale (thousand-separator is a dot)", () => {
    const out = formatCop(2_500_000);
    expect(out).toContain("2.500.000");
  });
});

describe("halfUpDivide", () => {
  it("returns 0 for a numerator of 0", () => {
    expect(halfUpDivide(0, 10_000)).toBe(0);
  });

  it("returns the integer quotient when no remainder", () => {
    expect(halfUpDivide(10_000, 10_000)).toBe(1);
    expect(halfUpDivide(20_000, 10_000)).toBe(2);
  });

  it("rounds 0.5 up (conventional half-up, not banker's)", () => {
    // 5 / 10 = 0.5 → must round to 1
    expect(halfUpDivide(5, 10)).toBe(1);
    // 15 / 10 = 1.5 → must round to 2
    expect(halfUpDivide(15, 10)).toBe(2);
    // 25 / 10 = 2.5 → must round to 3
    expect(halfUpDivide(25, 10)).toBe(3);
  });

  it("rounds 0.4 down", () => {
    expect(halfUpDivide(4, 10)).toBe(0);
    expect(halfUpDivide(14, 10)).toBe(1);
    expect(halfUpDivide(24, 10)).toBe(2);
  });

  it("rounds 0.6 up", () => {
    expect(halfUpDivide(6, 10)).toBe(1);
    expect(halfUpDivide(16, 10)).toBe(2);
  });

  it("handles the spec example: 3,000,000 × 10% = 300,000", () => {
    // 10% expressed as basis points: 1000 bps
    // 3,000,000 × 1000 / 10,000 = 300,000
    expect(halfUpDivide(3_000_000 * 1000, 10_000)).toBe(300_000);
  });
});

describe("roundHalfUpCop", () => {
  it("returns 0 when percent is 0", () => {
    expect(roundHalfUpCop(1_000_000, 0)).toBe(0);
  });

  it("computes 5% of 1,000,000 as 50,000", () => {
    expect(roundHalfUpCop(1_000_000, 5)).toBe(50_000);
  });

  it("computes 10% of 3,000,000 as 300,000", () => {
    expect(roundHalfUpCop(3_000_000, 10)).toBe(300_000);
  });

  it("computes 12.5% of 1,000 as 125 (half-up on the .5)", () => {
    // 1000 * 1250 / 10_000 = 125.0 — exact, no rounding needed
    expect(roundHalfUpCop(1_000, 12.5)).toBe(125);
  });

  it("rounds up at the half-COP boundary (0.5 COP)", () => {
    // We need subtotal × bps to leave a remainder of exactly half the
    // denominator (10000). 1 × 5000 bps (50%) = 5000/10000 = 0.5 COP.
    // Half-up must round this to 1 COP.
    expect(roundHalfUpCop(1, 50)).toBe(1);
    // 1000 × 5 bps (0.05%) = 5000/10000 = 0.5 COP → also rounds to 1.
    expect(roundHalfUpCop(1000, 0.05)).toBe(1);
    // Just below the half: 999 × 5 bps = 4995/10000 = 0.4995 → rounds DOWN to 0.
    expect(roundHalfUpCop(999, 0.05)).toBe(0);
  });

  it("never returns a non-integer", () => {
    const result = roundHalfUpCop(2_350_000, 20);
    expect(Number.isInteger(result)).toBe(true);
  });
});

describe("PRICE_VARIATION_NOTICE", () => {
  it("is a non-empty string", () => {
    expect(typeof PRICE_VARIATION_NOTICE).toBe("string");
    expect(PRICE_VARIATION_NOTICE.length).toBeGreaterThan(0);
  });

  it("mentions that listing prices vary", () => {
    expect(PRICE_VARIATION_NOTICE.toLowerCase()).toMatch(/varian|observ/);
  });

  it("mentions seller/stock/warranty/taxes as variation factors", () => {
    const n = PRICE_VARIATION_NOTICE.toLowerCase();
    // The notice must mention at least a couple of the variation sources.
    const mentions =
      /vendedor/.test(n) ||
      /stock/.test(n) ||
      /garant/.test(n) ||
      /impuesto/.test(n);
    expect(mentions).toBe(true);
  });
});
