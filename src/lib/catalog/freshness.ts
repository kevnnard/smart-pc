/**
 * smart-pc · catalog freshness helpers (Slice 1 · multi-offer).
 *
 * Pure functions only. `now` is injected from the caller so build output is
 * deterministic and tests do not depend on `Date.now()`.
 *
 * Staleness is a WARNING, never a validation failure — see design.md §8.1
 * and decision D-9.
 *
 * Slice 1 extends the module with:
 *   - `staleWarningsForOffers(...)` — per-offer warnings carrying offerId,
 *     retailer, sourceUrl, checkedAt, ageDays, and componentId.
 *   - `shouldDowngradeToProvisional(...)` — true when every confirmed
 *     offer is stale (drives the runtime `verified → provisional` downgrade
 *     in the loader).
 */
import type { EvidenceStatus } from "./catalog-types";

export interface FreshnessRecord {
  readonly recordKind: "component" | "service";
  readonly id: string;
  /** Timezone-aware ISO-8601 instant. */
  readonly lastVerified: string;
}

export interface StaleWarning {
  readonly recordKind: "component" | "service";
  readonly id: string;
  readonly lastVerified: string;
  readonly ageDays: number;
}

/**
 * Minimal offer shape consumed by the per-offer freshness helpers. The
 * catalog-types `Offer` interface satisfies this shape.
 */
export interface FreshnessOffer {
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly evidenceStatus: EvidenceStatus;
}

/** Per-offer stale warning carrying the full provenance. */
export interface OfferStaleWarning {
  readonly componentId: string;
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly ageDays: number;
}

/**
 * Whole-day age of `lastVerified` relative to `now`. Returns a negative
 * number when `lastVerified` is in the future. Both inputs are coerced
 * through `Date.parse` so timezone offsets (`-05:00`, `Z`, …) all work.
 */
export function ageInDays(lastVerified: string, now: Date): number {
  const last = Date.parse(lastVerified);
  const current = now.getTime();
  if (!Number.isFinite(last)) {
    return Number.NaN;
  }
  const diffMs = current - last;
  return Math.floor(diffMs / 86_400_000);
}

/**
 * True when the record is strictly older than `staleAfterDays` whole days.
 * The boundary day is NOT considered stale (spec §1 freshness: "older
 * than the policy's maximum age"); one full day past the boundary IS.
 */
export function isStale(
  lastVerified: string,
  staleAfterDays: number,
  now: Date,
): boolean {
  const age = ageInDays(lastVerified, now);
  return Number.isFinite(age) && age > staleAfterDays;
}

/**
 * Returns a `StaleWarning` for a stale record, or `undefined` when it is
 * fresh. Used by the loader to decorate catalog and quote rendering. The
 * loader does not throw on stale records — staleness is a UI concern.
 */
export function staleWarningFor(
  record: FreshnessRecord,
  staleAfterDays: number,
  now: Date,
): StaleWarning | undefined {
  if (!isStale(record.lastVerified, staleAfterDays, now)) {
    return undefined;
  }
  const ageDays = ageInDays(record.lastVerified, now);
  return {
    recordKind: record.recordKind,
    id: record.id,
    lastVerified: record.lastVerified,
    ageDays,
  };
}

/**
 * Per-offer stale warnings. Returns one `OfferStaleWarning` per offer
 * whose `checkedAt` is older than `staleAfterDays`. Fresh offers are
 * omitted from the output. Always returns a fresh array (never `null`).
 */
export function staleWarningsForOffers(
  offers: readonly FreshnessOffer[],
  componentId: string,
  staleAfterDays: number,
  now: Date,
): readonly OfferStaleWarning[] {
  const warnings: OfferStaleWarning[] = [];
  for (const offer of offers) {
    if (!isStale(offer.checkedAt, staleAfterDays, now)) continue;
    warnings.push({
      componentId,
      offerId: offer.offerId,
      retailer: offer.retailer,
      sourceUrl: offer.sourceUrl,
      checkedAt: offer.checkedAt,
      ageDays: ageInDays(offer.checkedAt, now),
    });
  }
  return warnings;
}

/**
 * Returns true when every offer with `evidenceStatus: "confirmed"` is
 * stale. Used to drive the runtime `verified → provisional` downgrade
 * at load time (decision D-15). Category-page and 404-or-missing offers
 * are ignored — they cannot confirm a price in the first place.
 */
export function shouldDowngradeToProvisional(args: {
  readonly offers: readonly FreshnessOffer[];
  readonly staleAfterDays: number;
  readonly now: Date;
}): boolean {
  const confirmed = args.offers.filter((o) => o.evidenceStatus === "confirmed");
  if (confirmed.length === 0) return false;
  return confirmed.every((o) =>
    isStale(o.checkedAt, args.staleAfterDays, args.now),
  );
}
