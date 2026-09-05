/**
 * smart-pc · legacy adapter (PR 2).
 *
 * Maps validated catalog records onto the existing `Component`,
 * `ServiceRecord`, and `PrebuiltPC` shapes used by every page and component
 * in `src/components/**` and `src/pages/**`. Goal: zero churn outside the
 * `src/data/**` adapter files.
 *
 * Decision D-5: adapters preserve every legacy export name and type so the
 * migration is one commit that can be reverted cleanly.
 *
 * Money model:
 *   - catalog: integer whole COP, never includes margin.
 *   - legacy:  integer whole COP, never includes margin.
 *   - quote:   component subtotal + confirmed service fee + separately
 *              disclosed margin (fixed + percentage).
 */

import type {
  Component,
  ComponentCategory,
  PrebuiltPC,
  ServiceRecord,
} from "../../data/types";
import { calculateQuote } from "../quotes/calculate-quote";
import type {
  Catalog,
  CatalogComponent,
  CatalogPrebuild,
  CatalogService,
  PricingPolicy,
} from "./catalog-types";

/**
 * Map a validated `CatalogComponent` onto the legacy flat `Component`
 * shape. The category-specific compatibility fields are spread onto the
 * result so `src/lib/compatibility.ts` keeps working unchanged.
 *
 * Slice 1 reconciliation:
 *   - `price` is null when the component has no confirmed COP offer
 *     (priceStatus === "unconfirmed"). The page must surface a "precio
 *     no confirmado" caveat instead of a fabricated zero.
 *   - `stockStatus` and `stockQuantity` are forwarded for UI surfaces.
 *   - `priceStatus` is forwarded so the configurator and prebuilt detail
 *     pages can render the "verified | provisional | unconfirmed" badge.
 *   - `restockNote` is forwarded for limited / out-of-stock UI.
 *
 * Margin is NEVER folded into `price`; the catalog observation price is
 * preserved verbatim (when present).
 */
export function toLegacyComponent(c: CatalogComponent): Component {
  const compat = c.compatibility ?? {};
  const legacy: Component = {
    id: c.id,
    category: c.category as ComponentCategory,
    brand: c.brand,
    model: c.model,
    price: c.observedPriceCop,
    specs: { ...c.specs },
    // Spread compatibility fields onto the legacy flat shape.
    socket: compat.socket,
    ramType: compat.ramType,
    ramSlots: compat.ramSlots,
    tdp: compat.tdp,
    wattage: compat.wattage,
    wattageDraw: compat.wattageDraw,
    interface_: compat.interface_,
    formFactor: compat.formFactor,
    priceStatus: c.priceStatus,
    stockStatus: c.stockStatus,
    stockQuantity: c.stockQuantity,
    restockNote: c.restockNote,
    imageUrl: c.imageUrl,
  };
  return legacy;
}

/**
 * Map a validated `CatalogService` onto the legacy `ServiceRecord`.
 *
 * `startingPrice` is set from the confirmed fee for `confirmed` records,
 * from the lower bound of the recommended range for `recommended` records
 * (the high bound is intentionally NOT exposed as a confirmed price —
 * recommended services cannot produce a final quote), and from the
 * reference price (when present) for `reference` records.
 *
 * Reference records without a `referencePriceCop` carry no
 * `startingPrice` (matching the legacy behavior where
 * `garantia-soporte` omits the price).
 */
export function toLegacyService(s: CatalogService): ServiceRecord {
  const base: ServiceRecord = {
    slug: s.slug,
    title: s.name,
    description: s.description,
    icon: s.icon ?? "🛠️",
  };
  let startingPrice: number | undefined;
  if (s.status === "confirmed") {
    startingPrice = s.feeCop;
  } else if (s.status === "recommended") {
    startingPrice = s.recommendedMinCop;
  } else {
    // status === "reference"
    startingPrice = s.referencePriceCop;
  }
  return startingPrice !== undefined ? { ...base, startingPrice } : base;
}

/**
 * Map a validated `CatalogPrebuild` onto the legacy `PrebuiltPC`.
 *
 * `basePrice` is the derived `finalTotalCop` from the quote engine —
 * the spec forbids a hand-entered total from overriding the calculation.
 *
 * Slice 2 contract: when the quote engine refuses the total
 * (`price-unconfirmed`, `unknown-component`, etc.), `basePrice` is `null`
 * rather than a fabricated zero. The page must surface
 * "Pendiente de confirmación" instead of rendering a guessed figure. The
 * integrity test asserts every prebuild references a confirmed service, so
 * `service-not-confirmed` / `unknown-policy` should not fire on real data.
 */
export function toLegacyPrebuilt(
  prebuild: CatalogPrebuild,
  catalog: Catalog,
  now: Date,
): PrebuiltPC {
  const result = calculateQuote(
    {
      componentIds: prebuild.componentIds,
      serviceId: prebuild.serviceId,
      pricingPolicyId: prebuild.pricingPolicyId,
    },
    catalog,
    now,
  );

  const basePrice = result.ok ? result.quote.finalTotalCop : null;

  // Resolve the parts (legacy shape) from the catalog.
  const components: Component[] = [];
  for (const id of prebuild.componentIds) {
    const c = catalog.byComponentId.get(id);
    if (c) components.push(toLegacyComponent(c));
  }

  // Map addOnOptions to the legacy AddOn shape
  const addOns = prebuild.addOnOptions
    ? Object.entries(prebuild.addOnOptions).map(([key, v]) => ({
        key,
        type: v.type,
        id: v.id,
        priceCop: v.price_cop,
        url: v.url,
      }))
    : undefined;

  const result_prebuilt: PrebuiltPC = {
    slug: prebuild.slug,
    name: prebuild.name,
    tier: prebuild.tier,
    tagline: prebuild.tagline,
    basePrice,
    featured: prebuild.featured,
    components,
    ...(addOns ? { addOns } : {}),
  };
  if (prebuild.badge !== undefined) {
    return { ...result_prebuilt, badge: prebuild.badge };
  }
  return result_prebuilt;
}
