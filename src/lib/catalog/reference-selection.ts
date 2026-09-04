/**
 * smart-pc · deterministic reference-offer selection (PR 2 · Slice 2).
 *
 * For each `CatalogComponent`, picks a single offer whose value becomes the
 * component's `referencePriceCop` in the quote engine. The selection is
 * deterministic (no randomness, no "current best"), never silently uses a
 * foreign-currency offer as COP, and never invents a number for `unconfirmed`
 * components.
 *
 * Algorithm (design.md §6.1):
 *   1. If `priceStatus === "unconfirmed"` → `undefined`. No reference.
 *   2. Step A — eligible local COP: take every `evidenceStatus: "confirmed"`
 *      offer whose `sourceCurrency === "COP"`. The lowest `listedAmount` wins;
 *      ties broken deterministically by `(listedAmount, offerId)`.
 *      `convertedFromForeignCurrency` is `false`.
 *   3. Step B — documented foreign-COP fallback: only when Step A produced
 *      zero candidates, take every confirmed non-COP offer whose
 *      `normalizedCostCop` is present. The lowest `normalizedCostCop` wins;
 *      `convertedFromForeignCurrency` is `true`.
 *   4. Step C — neither step produced a candidate → `undefined`. The validator
 *      cross-checks that a `verified` component always reaches Step A or Step
 *      B, so a `verified` declaration with no reference is impossible. The
 *      failure path is reserved for `provisional` components whose offers are
 *      all category-page, 404, or undocumented foreign.
 *
 * The module is pure: no `Date.now()`, no `Math.random()`, no network. It
 * runs at load time so every quote has a stable reference without
 * re-traversing the offer list at quote time (design.md §6.2).
 */
import type { CatalogComponent, Currency, Offer } from "./catalog-types";

/**
 * The single offer chosen for a component. Carries the chosen offerId,
 * retailer, sourceUrl, checkedAt, the COP price to use in quote math, plus
 * provenance flags. `undefined` when the component is `unconfirmed` or when
 * neither Step A nor Step B produced a candidate.
 */
export interface ReferenceOffer {
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  /** Integer whole COP. The component's contribution to the subtotal. */
  readonly referencePriceCop: number;
  /** `true` when the chosen offer was a non-COP offer via documented conversion. */
  readonly convertedFromForeignCurrency: boolean;
  /** The original listedAmount currency as recorded on the offer. */
  readonly originalCurrency: Currency;
  /** The original listedAmount as recorded on the offer. */
  readonly originalListedAmount: number;
}

/**
 * Pick the lowest eligible local COP offer for a component. Filters by
 * `evidenceStatus === "confirmed"` and `sourceCurrency === "COP"`.
 * Tie-break deterministically by `(listedAmount, offerId)`.
 */
function pickLowestCopLocal(
  offers: readonly Offer[],
): { readonly offer: Offer; readonly referencePriceCop: number } | undefined {
  const candidates = offers.filter(
    (o) => o.evidenceStatus === "confirmed" && o.sourceCurrency === "COP",
  );
  if (candidates.length === 0) return undefined;
  let best = candidates[0];
  for (const c of candidates) {
    if (
      c.listedAmount < best.listedAmount ||
      (c.listedAmount === best.listedAmount && c.offerId < best.offerId)
    ) {
      best = c;
    }
  }
  if (best === undefined) return undefined;
  return { offer: best, referencePriceCop: best.listedAmount };
}

/**
 * Pick the lowest cross-checked foreign offer for a component. Filters by
 * `evidenceStatus === "confirmed"`, `sourceCurrency !== "COP"`, and a
 * present `normalizedCostCop`. Tie-break deterministically by
 * `(normalizedCostCop, offerId)`.
 */
function pickLowestForeignCop(
  offers: readonly Offer[],
): { readonly offer: Offer; readonly referencePriceCop: number } | undefined {
  const candidates = offers.filter(
    (o) =>
      o.evidenceStatus === "confirmed" &&
      o.sourceCurrency !== "COP" &&
      typeof o.normalizedCostCop === "number",
  );
  if (candidates.length === 0) return undefined;
  let best = candidates[0];
  let bestCost = best.normalizedCostCop as number;
  for (const c of candidates) {
    const cost = c.normalizedCostCop as number;
    if (cost < bestCost || (cost === bestCost && c.offerId < best.offerId)) {
      best = c;
      bestCost = cost;
    }
  }
  if (best === undefined) return undefined;
  return { offer: best, referencePriceCop: bestCost };
}

/**
 * Pick the single offer that becomes the component's COP reference. Returns
 * `undefined` when no eligible reference exists. The function is pure and
 * deterministic; same input → same output across machines.
 */
export function selectReference(
  component: CatalogComponent,
): ReferenceOffer | undefined {
  if (component.priceStatus === "unconfirmed") return undefined;
  if (!Array.isArray(component.offers)) return undefined;

  // Step A: lowest confirmed COP local offer.
  const local = pickLowestCopLocal(component.offers);
  if (local) {
    return {
      offerId: local.offer.offerId,
      retailer: local.offer.retailer,
      sourceUrl: local.offer.sourceUrl,
      checkedAt: local.offer.checkedAt,
      referencePriceCop: local.referencePriceCop,
      convertedFromForeignCurrency: false,
      originalCurrency: local.offer.sourceCurrency,
      originalListedAmount: local.offer.listedAmount,
    };
  }

  // Step B: documented foreign-COP fallback (only when Step A produced nothing).
  const foreign = pickLowestForeignCop(component.offers);
  if (foreign) {
    return {
      offerId: foreign.offer.offerId,
      retailer: foreign.offer.retailer,
      sourceUrl: foreign.offer.sourceUrl,
      checkedAt: foreign.offer.checkedAt,
      referencePriceCop: foreign.referencePriceCop,
      convertedFromForeignCurrency: true,
      originalCurrency: foreign.offer.sourceCurrency,
      originalListedAmount: foreign.offer.listedAmount,
    };
  }

  // Step C: no eligible reference.
  return undefined;
}

/**
 * Map every component to its reference. The order of the input array is
 * preserved. Returns `undefined` for any component without an eligible
 * reference. The function never fabricates a number — when there is no
 * evidence-backed reference, it is the quote engine's job to emit a
 * `price-unconfirmed` error rather than the selector's job to invent one.
 */
export function selectReferences(
  components: readonly CatalogComponent[],
): readonly (ReferenceOffer | undefined)[] {
  return components.map(selectReference);
}
