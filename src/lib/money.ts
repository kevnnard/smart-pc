/**
 * smart-pc · COP money helpers (PR 2).
 *
 * All monetary values in the project are integer whole Colombian pesos
 * (COP). No decimals, no centavos, no other currency — see design.md
 * §1.1 (decision D-0) and spec.md "Colombian COP presentation and
 * price caveat".
 *
 * Exports:
 *   - `formatCop(value)` — Intl.NumberFormat("es-CO", COP) string.
 *   - `halfUpDivide(num, den)` — deterministic integer half-up division.
 *   - `roundHalfUpCop(subtotalCop, percent)` — percentage margin in basis
 *      points using `halfUpDivide`, so 1,000,000 × 20 % = 200,000 exactly.
 *   - `PRICE_VARIATION_NOTICE` — the single shared Spanish caveat for every
 *      observed price displayed in the catalog and quote breakdowns.
 *
 * `Date.now()` is never called from this module; callers always inject
 * `now` for freshness (see `src/lib/catalog/freshness.ts`).
 */

/**
 * Single shared observed-price variation notice (Spanish, Colombia).
 * Every page and component rendering an observed price must surface this
 * statement so visitors know the figure is a single-seller observation,
 * not a guaranteed price. The wording matches design.md §8.2.
 */
export const PRICE_VARIATION_NOTICE =
  "Los precios de lista varían según el vendedor, el stock, la garantía, el envío, los impuestos y la fecha de observación. Este valor es una observación, no un precio garantizado.";

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/**
 * Format an integer whole-COP amount using `Intl.NumberFormat("es-CO", COP)`.
 * Output looks like `$ 1.300.000` (with a non-breaking space between `$` and
 * the number). `maximumFractionDigits` is 0 so no decimal portion ever
 * appears — the data layer only ever stores whole pesos.
 */
export function formatCop(value: number): string {
  return COP_FORMATTER.format(value);
}

/**
 * Deterministic integer half-up division. `Math.floor((n + d/2) / d)` is
 * the textbook half-up for the non-negative integer domain, with no
 * float drift and no banker's rounding. Negative values are not
 * expected — validators reject negative monetary inputs at the catalog
 * boundary — but the function still tolerates them by delegating to
 * `Math.floor`.
 */
export function halfUpDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return Number.NaN;
  }
  if (denominator === 0) {
    return Number.NaN;
  }
  // Conventional half-up for the non-negative domain.
  if (numerator >= 0) {
    return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
  }
  // Negative path: round half away from zero.
  return -Math.floor((-numerator + Math.floor(denominator / 2)) / denominator);
}

/**
 * Round `subtotalCop × percent` to the nearest whole COP using half-up.
 * Internally converts percent to integer basis points (`12.5` → `1250`),
 * then `halfUpDivide(subtotalCop * bps, 10_000)`. Basis points keep the
 * calculation integer-only and exactly reproducible across machines.
 */
export function roundHalfUpCop(subtotalCop: number, percent: number): number {
  if (!Number.isFinite(subtotalCop) || !Number.isFinite(percent)) {
    return Number.NaN;
  }
  const bps = Math.round(percent * 100);
  return halfUpDivide(subtotalCop * bps, 10_000);
}
