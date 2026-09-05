/**
 * smart-pc · deterministic quote engine (PR 2 · Slice 2).
 *
 * Pure function: given a `QuoteRequest`, a validated `Catalog`, and an
 * injected `now`, returns either a `Quote` (with disclosure lines) or
 * a list of `QuoteError` records. Never throws. Never calls `Date.now()`.
 *
 * Mirrors spec.md "Deterministic quote formula" + "Explicit quote
 * breakdown" + design.md §7.1 verbatim, with the Slice 2 reference-offer
 * selection rule from design.md §6.
 *
 * Algorithm (Slice 2 multi-offer contract):
 *   1. Resolve every `componentId`. Empty list → `empty-selection`.
 *      Missing id → `unknown-component`.
 *   2. Resolve `serviceId`. Missing → `unknown-service`. Status ≠
 *      "confirmed" → `service-not-confirmed` (recommended/reference
 *      services can never produce a final quote).
 *   3. Resolve `pricingPolicyId`. Missing → `unknown-policy`.
 *   4. For each resolved component, run `selectReference`. A reference
 *      `undefined` (because priceStatus === "unconfirmed" or because no
 *      confirmed-COP / documented-foreign-COP offer exists) → accumulate a
 *      `price-unconfirmed` error. The component is excluded from the
 *      subtotal so no fabricated zero leaks in.
 *   5. If ANY `price-unconfirmed` error is present, refuse the final total
 *      (return `{ ok: false, errors }`). No partial math survives.
 *   6. Otherwise: `componentSubtotalCop = Σ reference.referencePriceCop`.
 *   7. `serviceFeeCop = service.feeCop` (confirmed only).
 *   8. `fixedMarginCop = policy.fixedMarginCop` (normalized to 0).
 *   9. `percentageMarginCop = roundHalfUpCop(subtotal, policy.percentageMargin)`.
 *  10. `marginAmountCop = fixedMarginCop + percentageMarginCop`.
 *  11. `finalTotalCop = componentSubtotalCop + serviceFeeCop + marginAmountCop`.
 *  12. Build `lines` in disclosure order, collect `staleWarnings`, and emit
 *      `referenceProvenance[]` so the breakdown UI can render the chosen
 *      offer beside each component subtotal line.
 *
 * Errors are accumulated and returned together; the function never
 * partially computes on failure.
 */

import type {
  Catalog,
  CatalogComponent,
  CatalogService,
  PricingPolicy,
} from "../catalog/catalog-types";
import { type StaleWarning, staleWarningFor } from "../catalog/freshness";
import {
  type ReferenceOffer,
  selectReference,
} from "../catalog/reference-selection";
import { roundHalfUpCop } from "../money";
import {
  type Quote,
  type QuoteError,
  type QuoteLine,
  type QuoteRequest,
  type QuoteResult,
  type ReferenceProvenance,
} from "./quote-types";

// ---------------------------------------------------------------------------
// Spanish (Colombia) labels
// ---------------------------------------------------------------------------

const LABELS = {
  components: "Subtotal de componentes",
  service: "Servicio de armado",
  fixedMargin: "Margen fijo",
  percentageMargin: "Gestión y logística de armado",
  totalMargin: "Margen total",
  total: "Total (COP)",
} as const;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface ResolvedSelection {
  readonly components: readonly CatalogComponent[];
  readonly references: readonly (ReferenceOffer | undefined)[];
  readonly service: CatalogService;
  readonly policy: PricingPolicy;
}

function resolveSelection(
  request: QuoteRequest,
  catalog: Catalog,
):
  | {
      readonly ok: true;
      readonly selection: ResolvedSelection;
    }
  | { readonly ok: false; readonly errors: readonly QuoteError[] } {
  const errors: QuoteError[] = [];

  if (request.componentIds.length === 0) {
    errors.push({
      code: "empty-selection",
      id: "",
      message: "Selecciona al menos un componente antes de cotizar.",
    });
  }

  const components: CatalogComponent[] = [];
  const references: (ReferenceOffer | undefined)[] = [];
  const seen = new Set<string>();
  for (const id of request.componentIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const c = catalog.byComponentId.get(id);
    if (!c) {
      errors.push({
        code: "unknown-component",
        id,
        message: `Componente desconocido: ${id}`,
      });
      continue;
    }
    components.push(c);
    const ref = selectReference(c);
    references.push(ref);
    if (ref === undefined) {
      // Spec requirement: "No unconfirmed component may render a fabricated/
      // zero exact price. ... prevent a final quote when any required
      // component lacks an eligible reference price." We accumulate one
      // price-unconfirmed error per offending component so the caller can
      // surface the gap explicitly.
      errors.push({
        code: "price-unconfirmed",
        id,
        message: `Componente sin precio confirmado: ${id}`,
      });
    }
  }

  const service = catalog.byServiceId.get(request.serviceId);
  if (!service) {
    errors.push({
      code: "unknown-service",
      id: request.serviceId,
      message: `Servicio desconocido: ${request.serviceId}`,
    });
  } else if (service.status !== "confirmed") {
    // Recommended/reference services cannot produce a final quote. The
    // structural enforcement of the spec's "recommendation without
    // confirmation must not produce a final total" requirement.
    errors.push({
      code: "service-not-confirmed",
      id: service.id,
      message: `El servicio "${service.name}" requiere confirmación del propietario antes de generar un total final.`,
    });
  }

  const policy = catalog.byPolicyId.get(request.pricingPolicyId);
  if (!policy) {
    errors.push({
      code: "unknown-policy",
      id: request.pricingPolicyId,
      message: `Política de precios desconocida: ${request.pricingPolicyId}`,
    });
  }

  if (errors.length > 0 || !service || !policy) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    selection: { components, references, service, policy },
  };
}

function buildLines(
  componentSubtotalCop: number,
  serviceFeeCop: number,
  fixedMarginCop: number,
  percentageMarginCop: number,
  marginAmountCop: number,
  finalTotalCop: number,
  percentageMarginRate: number,
): readonly QuoteLine[] {
  return [
    {
      kind: "components",
      label: LABELS.components,
      amountCop: componentSubtotalCop,
    },
    {
      kind: "service",
      label: LABELS.service,
      amountCop: serviceFeeCop,
    },
    {
      kind: "fixed-margin",
      label: LABELS.fixedMargin,
      amountCop: fixedMarginCop,
    },
    {
      kind: "percentage-margin",
      label: LABELS.percentageMargin,
      amountCop: percentageMarginCop,
      rate: percentageMarginRate,
    },
    {
      kind: "total-margin",
      label: LABELS.totalMargin,
      amountCop: marginAmountCop,
    },
    {
      kind: "total",
      label: LABELS.total,
      amountCop: finalTotalCop,
    },
  ];
}

function collectStaleWarnings(
  components: readonly CatalogComponent[],
  service: CatalogService,
  staleAfterDays: number,
  now: Date,
): readonly StaleWarning[] {
  const out: StaleWarning[] = [];
  for (const c of components) {
    const w = staleWarningFor(
      { recordKind: "component", id: c.id, lastVerified: c.lastVerified },
      staleAfterDays,
      now,
    );
    if (w) out.push(w);
  }
  const sw = staleWarningFor(
    {
      recordKind: "service",
      id: service.id,
      lastVerified: service.lastVerified,
    },
    staleAfterDays,
    now,
  );
  if (sw) out.push(sw);
  return out;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function calculateQuote(
  request: QuoteRequest,
  catalog: Catalog,
  now: Date,
): QuoteResult {
  const resolved = resolveSelection(request, catalog);
  if (!resolved.ok) {
    return { ok: false, errors: resolved.errors };
  }
  const { components, references, service, policy } = resolved.selection;

  // Step 5 (Slice 2): the subtotal is the sum of the reference-selected
  // `referencePriceCop` values. An unconfirmed component never contributes
  // because `resolveSelection` would have emitted a `price-unconfirmed`
  // error and refused the quote before reaching here. The pair-based
  // iteration keeps `components[i]` aligned with `references[i]` so a
  // future change cannot desync the two arrays.
  let componentSubtotalCop = 0;
  const referenceProvenance: ReferenceProvenance[] = [];
  for (let i = 0; i < components.length; i++) {
    const ref = references[i];
    if (ref === undefined) continue; // unreachable given the guard above
    componentSubtotalCop += ref.referencePriceCop;
    referenceProvenance.push({
      componentId: components[i]?.id ?? "",
      offerId: ref.offerId,
      retailer: ref.retailer,
      sourceUrl: ref.sourceUrl,
      checkedAt: ref.checkedAt,
      referencePriceCop: ref.referencePriceCop,
      convertedFromForeignCurrency: ref.convertedFromForeignCurrency,
    });
  }

  // Step 6: confirmed service fee (service is confirmed here — guaranteed by
  // resolveSelection).
  const serviceFeeCop = service.status === "confirmed" ? service.feeCop : 0;

  // Step 7: fixed margin (already normalized to 0 in validation).
  const fixedMarginCop = policy.fixedMarginCop;

  // Step 8: percentage margin, half-up in basis points. The policy's
  // percentageMargin is in percent units (e.g. 20 = 20%).
  const percentageMarginCop = roundHalfUpCop(
    componentSubtotalCop,
    policy.percentageMargin,
  );

  // Step 9 + 10.
  const marginAmountCop = fixedMarginCop + percentageMarginCop;
  const finalTotalCop = componentSubtotalCop + serviceFeeCop + marginAmountCop;

  const lines = buildLines(
    componentSubtotalCop,
    serviceFeeCop,
    fixedMarginCop,
    percentageMarginCop,
    marginAmountCop,
    finalTotalCop,
    policy.percentageMargin,
  );

  const staleWarnings = collectStaleWarnings(
    components,
    service,
    catalog.staleAfterDays,
    now,
  );

  const quote: Quote = {
    componentSubtotalCop,
    serviceFeeCop,
    fixedMarginCop,
    percentageMarginCop,
    marginAmountCop,
    finalTotalCop,
    percentageMarginRate: policy.percentageMargin,
    lines,
    staleWarnings,
    referenceProvenance,
  };

  return { ok: true, quote };
}

// Re-export the domain types for consumers that import from "./calculate-quote".
export type {
  Quote,
  QuoteError,
  QuoteErrorCode,
  QuoteLine,
  QuoteLineKind,
  QuoteRequest,
  QuoteResult,
} from "./quote-types";
