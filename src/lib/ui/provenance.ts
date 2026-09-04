/**
 * smart-pc · pure view-model helpers for the provenance and quote-breakdown
 * UI components (Slice 3).
 *
 * The Astro components `PriceProvenance.astro` and `QuoteBreakdown.astro`
 * are presentation-only. All the business logic (which offer is "the
 * reference", what disagreement messages to surface, how to label a quote
 * line, etc.) lives here so it can be unit-tested without an Astro
 * rendering pipeline.
 *
 * No network. No `Date.now()`. No fabricated data. The helpers read only
 * the data they receive and return plain serializable objects ready for
 * the Astro template.
 */
import type { Offer } from "../catalog/catalog-types";
import type { StaleWarning } from "../catalog/freshness";
import { formatCop } from "../money";
import type { ReferenceProvenance } from "../quotes/quote-types";

// ---------------------------------------------------------------------------
// PriceProvenance
// ---------------------------------------------------------------------------

/**
 * One row in the multi-offer provenance block rendered next to a reference
 * price. Carries enough information for `PriceProvenance.astro` to emit the
 * retailer, currency, listed amount, evidence status, checked date, source
 * URL, and any staleness warning without re-walking the catalog.
 */
export interface ProvenanceRow {
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly sourceCurrency: string;
  readonly listedAmount: number;
  readonly sellerCondition: string;
  readonly availability: string;
  readonly checkedAt: string;
  readonly evidenceStatus: string;
  readonly notes?: string;
  readonly isSelectedReference: boolean;
  readonly ageDays?: number;
  readonly isStale: boolean;
}

/**
 * Build the ordered list of `ProvenanceRow` records for a single component.
 * The first row is always the selected reference (the chosen offer from the
 * quote engine); subsequent rows are the remaining offers sorted by the
 * deterministic (currency, listedAmount, offerId) order the catalog contract
 * promises so the page renders identically across machines.
 *
 * `now` is injected so the staleness math is deterministic.
 */
export function buildProvenanceRows(args: {
  readonly selectedOfferId: string | undefined;
  readonly selectedReferencePriceCop?: number;
  readonly offers: readonly Offer[];
  readonly now: Date;
  readonly staleAfterDays: number;
}): readonly ProvenanceRow[] {
  const { selectedOfferId, offers, now, staleAfterDays } = args;
  const sortedOffers = [...offers].sort((a, b) => {
    if (a.sourceCurrency !== b.sourceCurrency) {
      return a.sourceCurrency.localeCompare(b.sourceCurrency);
    }
    if (a.listedAmount !== b.listedAmount) {
      return a.listedAmount - b.listedAmount;
    }
    return a.offerId.localeCompare(b.offerId);
  });
  const selectedId = selectedOfferId ?? "(none)";
  return sortedOffers.map((offer) => {
    const checkedMs = Date.parse(offer.checkedAt);
    const ageDays = Number.isFinite(checkedMs)
      ? Math.floor((now.getTime() - checkedMs) / 86_400_000)
      : Number.NaN;
    const isStale = Number.isFinite(ageDays) && ageDays > staleAfterDays;
    return {
      offerId: offer.offerId,
      retailer: offer.retailer,
      sourceUrl: offer.sourceUrl,
      sourceCurrency: offer.sourceCurrency,
      listedAmount: offer.listedAmount,
      sellerCondition: offer.sellerCondition,
      availability: offer.availability,
      checkedAt: offer.checkedAt,
      evidenceStatus: offer.evidenceStatus,
      ...(offer.notes !== undefined ? { notes: offer.notes } : {}),
      isSelectedReference: offer.offerId === selectedId,
      ageDays: Number.isFinite(ageDays) ? ageDays : undefined,
      isStale,
    };
  });
}

/**
 * Provenance summary exposed to `PriceProvenance.astro` for the "selected
 * reference" header above the multi-offer table. Drives the
 * "menor COP verificado" badge.
 */
export interface ProvenanceSummary {
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly referencePriceCop?: number;
  readonly currencyHint: "COP" | "USD" | "OTHER";
}

/**
 * Build the provenance summary for a single `ReferenceProvenance`. `USD`
 * references carry the explicit `convertedFromForeignCurrency` flag so the
 * UI can render the "USD convertido" badge.
 */
export function buildProvenanceSummary(
  ref: ReferenceProvenance | undefined,
): ProvenanceSummary | undefined {
  if (!ref) return undefined;
  return {
    retailer: ref.retailer,
    sourceUrl: ref.sourceUrl,
    checkedAt: ref.checkedAt,
    ...(ref.referencePriceCop !== undefined
      ? { referencePriceCop: ref.referencePriceCop }
      : {}),
    currencyHint: ref.convertedFromForeignCurrency ? "USD" : "COP",
  };
}

// ---------------------------------------------------------------------------
// QuoteBreakdown
// ---------------------------------------------------------------------------

/**
 * Disclosure row for the customer-facing quote breakdown. Extends the
 * `QuoteLine` shape with a stable id so `QuoteBreakdown.astro` can render
 * `key={row.id}` and so tests can assert the exact rendering order.
 */
export interface QuoteBreakdownRow {
  readonly id: string;
  readonly label: string;
  readonly amountCop: number;
  readonly amountLabel: string;
  readonly kind: string;
  readonly rate?: number;
  readonly isTotal: boolean;
  readonly isHighlighted: boolean;
}

/**
 * Convert the engine's `Quote.lines` into `QuoteBreakdownRow[]` ready for
 * the template. The order is exactly the engine's order so the breakdown
 * is reproducible across machines.
 */
export function buildQuoteBreakdownRows(
  lines: ReadonlyArray<{
    readonly kind: string;
    readonly label: string;
    readonly amountCop: number;
    readonly rate?: number;
  }>,
): readonly QuoteBreakdownRow[] {
  return lines.map((line) => {
    const isTotal = line.kind === "total";
    return {
      id: `line-${line.kind}`,
      label: line.label,
      amountCop: line.amountCop,
      amountLabel: formatCop(line.amountCop),
      kind: line.kind,
      ...(line.rate !== undefined ? { rate: line.rate } : {}),
      isTotal,
      isHighlighted: line.kind === "total" || line.kind === "total-margin",
    };
  });
}

/**
 * Map per-component `StaleWarning` records from the quote engine to a flat
 * list of `(offerId, ageDays)` pairs the breakdown UI can render next to
 * the related line. The helper never filters — the UI decides which warnings
 * are relevant (e.g. warnings on unconfirmed components are not displayed).
 */
export function staleWarningSummary(
  warnings: readonly StaleWarning[],
): readonly { readonly id: string; readonly ageDays: number }[] {
  return warnings.map((w) => ({ id: w.id, ageDays: w.ageDays }));
}
