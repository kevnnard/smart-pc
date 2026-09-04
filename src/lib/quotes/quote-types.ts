/**
 * smart-pc · quote domain types (PR 2).
 *
 * Pure data contracts for the deterministic quote engine. No runtime code
 * here — just shapes the calculator returns. See spec.md "Deterministic
 * quote formula" and "Explicit quote breakdown" + design.md §7.
 */
import type { StaleWarning } from "../catalog/freshness";

/** Input to `calculateQuote`. */
export interface QuoteRequest {
  /** Component ids in selection order; order is irrelevant to the math. */
  readonly componentIds: readonly string[];
  /** Service id; must resolve to a `confirmed` record for a final total. */
  readonly serviceId: string;
  /** Pricing-policy id; defaults to `catalog.defaultPolicyId` are NOT applied. */
  readonly pricingPolicyId: string;
}

/** The kinds of line items the breakdown always carries, in this order. */
export type QuoteLineKind =
  | "components"
  | "service"
  | "fixed-margin"
  | "percentage-margin"
  | "total-margin"
  | "total";

/** A single disclosed row in the customer-facing breakdown. */
export interface QuoteLine {
  readonly kind: QuoteLineKind;
  /** Spanish (Colombia) label, e.g. "Subtotal de componentes". */
  readonly label: string;
  /** Integer whole COP. */
  readonly amountCop: number;
  /** Optional rate disclosure (only on the percentage-margin line). */
  readonly rate?: number;
}

/** Deterministic quote result. */
export interface Quote {
  readonly componentSubtotalCop: number;
  readonly serviceFeeCop: number;
  readonly fixedMarginCop: number;
  readonly percentageMarginCop: number;
  readonly marginAmountCop: number;
  readonly finalTotalCop: number;
  /** Configured percentage margin in percent units (0 when unconfigured). */
  readonly percentageMarginRate: number;
  /** Spec-mandated disclosure order. */
  readonly lines: readonly QuoteLine[];
  /** Re-emitted freshness warnings from the selected parts and service. */
  readonly staleWarnings: readonly StaleWarning[];
  /**
   * One `ReferenceProvenance` per referenced component (in input order).
   * Drives the multi-offer provenance block beside the breakdown UI and
   * lets the configurator surface "menor COP verificado" / "USD convertido"
   * badges. Length equals the number of successfully resolved components
   * in the quote (never includes components that emitted `price-unconfirmed`).
   */
  readonly referenceProvenance: readonly ReferenceProvenance[];
}

/**
 * Provenance for the single offer that drove each component's contribution
 * to the subtotal. Exposed so the breakdown UI can render "Amazon USD · $109
 * → COP 471 900" beside the line item, plus stale / disagreement notices.
 */
export interface ReferenceProvenance {
  readonly componentId: string;
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly referencePriceCop: number;
  readonly convertedFromForeignCurrency: boolean;
}

/** Failure codes for `QuoteError`. */
export type QuoteErrorCode =
  | "empty-selection"
  | "unknown-component"
  | "unknown-service"
  | "service-not-confirmed"
  | "unknown-policy"
  | "price-unconfirmed";

/** A single quote-validation error. Multiple may be returned together. */
export interface QuoteError {
  readonly code: QuoteErrorCode;
  /** The offending id (component / service / policy); empty for empty-selection. */
  readonly id: string;
  /** Human-readable message; suitable for surfacing in dev / debugging. */
  readonly message: string;
}

export type QuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly errors: readonly QuoteError[] };
