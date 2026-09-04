/**
 * smart-pc · configurator catalog adapter (PR 2 · Slice 2).
 *
 * The Configurator React island receives only the legacy `Component[]` shape
 * (no `offers[]` array). For the quote engine to run
 * `selectReference` against real data, the configurator synthesizes the
 * minimum offer record for each selected component:
 *
 *   - For confirmed / provisional components with `price !== null`, we
 *     attach a single confirmed-COP offer with the observed price so the
 *     quote engine's `selectReference` returns a COP reference.
 *   - For unconfirmed components (`price === null`), we attach no
 *     confirmed-COP offer so `selectReference` returns `undefined` and
 *     the quote engine emits `price-unconfirmed` rather than fabricating a
 *     subtotal.
 *
 * This is the only place in the codebase that synthesizes catalog data
 * outside the JSON catalog and the validators. The contract is:
 *
 *   1. The function MUST never invent a price for `price === null`.
 *   2. The function MUST attach exactly one offer per `price !== null`
 *      component so `selectReference` always finds a candidate.
 *   3. The synthetic catalog exposes the same lookup maps as the real
 *      catalog (`byComponentId`, `byServiceId`, `byPolicyId`) so the
 *      quote engine's interface is unchanged.
 */
import type { Component } from "../../data/types";
import type {
  Catalog,
  CatalogService,
  PricingPolicy,
} from "../catalog/catalog-types";

/**
 * Build the in-memory `Catalog`-shaped object the configurator's quote
 * engine resolves the selected component ids against. The synthesized
 * catalog exposes `byComponentId` keyed by the legacy `Component.id`,
 * which is the same identifier the quote engine receives.
 */
export function buildConfiguratorCatalog(
  selected: readonly Component[],
  service: CatalogService,
  pricingPolicy: PricingPolicy,
): Catalog {
  const syntheticComponents = selected.map((c) => {
    const offers =
      c.price !== null
        ? [
            {
              offerId: `legacy-${c.id}`,
              retailer: c.brand,
              sourceUrl: "https://example.com/configurator-legacy",
              sourceCurrency: "COP" as const,
              listedAmount: c.price,
              sellerCondition: `${c.brand} · new`,
              availability: "unknown" as const,
              checkedAt: "2026-01-01T00:00:00-05:00",
              evidenceStatus: "confirmed" as const,
            },
          ]
        : [];
    return {
      id: c.id,
      category: c.category,
      brand: c.brand,
      model: c.model,
      name: `${c.brand} ${c.model}`,
      specs: c.specs,
      compatibility: {},
      // Forward the legacy priceStatus when the visitor selected it; fall
      // back to `verified` for confirmed-COP components and `unconfirmed`
      // for components with `price === null`. The quote engine's
      // `selectReference` walks `offers[]`; the priceStatus is purely
      // metadata so the configurator can surface the "precio provisional"
      // badge next to the line item.
      priceStatus:
        c.priceStatus ??
        (c.price !== null ? ("verified" as const) : ("unconfirmed" as const)),
      stockStatus: c.stockStatus ?? ("unknown" as const),
      stockQuantity: c.stockQuantity ?? null,
      offers,
      observedPriceCop: c.price,
      sourceStore: c.brand,
      sourceUrl: "https://example.com/configurator-legacy",
      lastVerified: "2026-01-01T00:00:00-05:00",
      availability: "unknown" as const,
    };
  });
  return {
    schemaVersion: 1 as const,
    components: syntheticComponents,
    services: [service],
    prebuilds: [],
    policies: [pricingPolicy],
    defaultPolicyId: pricingPolicy.id,
    staleAfterDays: 30,
    byComponentId: new Map(syntheticComponents.map((c) => [c.id, c])),
    byServiceId: new Map<string, CatalogService>([[service.id, service]]),
    byPolicyId: new Map<string, PricingPolicy>([
      [pricingPolicy.id, pricingPolicy],
    ]),
    byPrebuildSlug: new Map<string, never>(),
  };
}
