/**
 * smart-pc · catalog TypeScript contracts (Slice 1 · multi-offer).
 *
 * Every JSON document under `src/data/catalog/` carries `schemaVersion`
 * (currently `1`) and is validated against these types at build time.
 *
 * Multi-offer shape (Slice 1):
 *   - Every component carries an `offers[]` array of independently evidenced
 *     observations. Each offer records its own retailer, source URL,
 *     currency, listed amount, shipping/import/tax context, seller /
 *     condition, availability, timezone-aware checked timestamp, and
 *     evidence status (confirmed | category-page | 404-or-missing).
 *   - The product-level `priceStatus` is the maintainer-authored summary of
 *     what the offers say (`verified | provisional | unconfirmed`). A
 *     `verified` component MUST have at least one offer with
 *     `evidenceStatus: "confirmed"`.
 *   - Every component carries a `stockStatus` and a `stockQuantity`
 *     (`null` when unknown). Never invent quantities.
 *
 * Legacy fields `observedPriceCop`, `sourceStore`, `sourceUrl`,
 * `lastVerified`, and `availability` are kept as derived/computed
 * properties on `CatalogComponent` so the PR-2 adapter and quote engine
 * keep compiling while Slice 2 brings in reference-offer selection.
 * The JSON source documents MUST NOT carry these legacy fields anymore.
 *
 * The service shape is a three-state discriminated union (decision D-1):
 * `recommended` records CANNOT carry `feeCop`, so the type system makes
 * it structurally impossible for a recommendation to be silently priced.
 */
export const CATALOG_SCHEMA_VERSION = 1 as const;

export type ComponentCategory =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "ram"
  | "storage"
  | "psu"
  | "case"
  | "cooler"
  | "monitor"
  | "peripheral"
  | "os";

/** Availability bucket for both components and offers. */
export type Availability = "in-stock" | "limited" | "out-of-stock" | "unknown";

/** Stock status on the product (rolls up from offers when not explicit). */
export type StockStatus = Availability;

/** Product-level price evidence classification. */
export type PriceStatus = "verified" | "provisional" | "unconfirmed";

/** Per-offer evidence classification. */
export type EvidenceStatus = "confirmed" | "category-page" | "404-or-missing";

/** ISO-4217 currency code as opaque string. Validated as non-empty. */
export type Currency = string;

export interface CompatibilityFields {
  readonly socket?: string;
  readonly ramType?: string;
  readonly ramSlots?: number;
  readonly tdp?: number;
  readonly wattage?: number;
  readonly wattageDraw?: number;
  readonly interface_?: string;
  readonly formFactor?: string;
}

/**
 * Conversion assumption for a non-COP offer. REQUIRED whenever
 * `Offer.sourceCurrency !== "COP"`. The validator cross-checks
 * `normalizedCostCop` against the math in this block within a COP 1,000
 * tolerance to catch a maintainer who wrote the wrong COP number.
 */
export interface ConversionAssumption {
  readonly targetCurrency: "COP";
  /**
   * COP per one unit of sourceCurrency. Integer for COP; float with at most
   * 2 decimals otherwise. Validator coerces to a non-negative number.
   */
  readonly exchangeRateCopPerUnit: number;
  /** Free string identifying the rate source (TRM, Banrep, manual, …). */
  readonly rateSource: string;
  /** Timezone-aware ISO-8601 instant. Naive timestamps are rejected. */
  readonly rateAsOf: string;
  /** Free string explaining any landed-cost assumption made. */
  readonly notes: string;
}

/**
 * A single offer observation for a component. Each component has at least
 * one offer. The validator enforces:
 *   - offerId non-empty, unique within the component
 *   - retailer non-empty
 *   - sourceUrl is an absolute http(s) URL with non-empty hostname and
 *     is NOT the placeholder `host/<slug>/p` pattern
 *   - sourceCurrency non-empty (typically "COP" or "USD")
 *   - listedAmount non-negative number (integer when sourceCurrency is COP)
 *   - shippingImportTaxCop, when present, is a non-negative integer
 *   - sellerCondition non-empty
 *   - availability is one of the four Availability buckets
 *   - checkedAt is a timezone-aware ISO-8601 instant
 *   - evidenceStatus is one of the three EvidenceStatus values
 *   - when sourceCurrency !== "COP": conversionAssumption and
 *     normalizedCostCop are REQUIRED and the cross-check passes
 */
export interface Offer {
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly sourceCurrency: Currency;
  readonly listedAmount: number;
  readonly shippingImportTaxCop?: number;
  readonly conversionAssumption?: ConversionAssumption;
  readonly normalizedCostCop?: number;
  readonly sellerCondition: string;
  readonly availability: Availability;
  readonly checkedAt: string;
  readonly evidenceStatus: EvidenceStatus;
  readonly notes?: string;
}

/**
 * Provenance kept on services and as derived/computed properties on
 * components. The component-level derived fields below are populated by
 * the validator for adapter / quote-engine compatibility.
 */
export interface Provenance {
  readonly sourceStore: string;
  /** Absolute http(s) URL. Recorded evidence only — never fetched. */
  readonly sourceUrl: string;
  /** Timezone-aware ISO-8601 instant. */
  readonly lastVerified: string;
}

export interface CatalogComponent {
  readonly id: string;
  readonly category: ComponentCategory;
  readonly brand: string;
  readonly model: string;
  /** Derived when JSON omits `name` as `${brand} ${model}`. */
  readonly name: string;
  readonly specs: Readonly<Record<string, string>>;
  readonly compatibility: CompatibilityFields;
  /**
   * Maintainer-authored evidence classification. The validator cross-checks
   * that this is consistent with the offers it accompanies:
   *   - "verified"    → at least one offer with evidenceStatus: "confirmed"
   *   - "provisional" → at least one confirmed offer but the conversion,
   *                     landed-cost, or single-retailer rules are not met
   *   - "unconfirmed" → no confirmed offer exists
   */
  readonly priceStatus: PriceStatus;
  readonly stockStatus: StockStatus;
  /**
   * Whole units in stock. `null` means unknown quantity. The validator
   * never infers a quantity from availability; if the maintainer has not
   * recorded an exact figure, the field stays `null`.
   */
  readonly stockQuantity: number | null;
  /** Optional non-empty free text describing restock expectations. */
  readonly restockNote?: string;
  readonly imageUrl?: string;
  readonly notes?: string;
  /** Non-empty array; one or more offer records. */
  readonly offers: readonly Offer[];

  // -- Derived/computed properties for PR-2 adapter/quote-engine compat ----
  /**
   * Lowest verified COP observed cost across all offers, used by the
   * legacy `toLegacyComponent` adapter. Recomputed at validation time.
   * `null` when no confirmed COP offer exists.
   */
  readonly observedPriceCop: number | null;
  /** Retailer name from the chosen reference offer. */
  readonly sourceStore: string;
  /** Source URL from the chosen reference offer. */
  readonly sourceUrl: string;
  /** Most-recent confirmed offer checkedAt timestamp. */
  readonly lastVerified: string;
  /** Rolled-up availability from the offers. */
  readonly availability: Availability;
}

export type CatalogService = Provenance &
  (
    | {
        readonly status: "confirmed";
        readonly feeCop: number;
        readonly id: string;
        readonly slug: string;
        readonly name: string;
        readonly description: string;
        readonly icon?: string;
        readonly tier?: string;
        readonly confirmationNote?: string;
      }
    | {
        readonly status: "recommended";
        readonly recommendedMinCop: number;
        readonly recommendedMaxCop: number;
        readonly confirmationNote: string;
        readonly id: string;
        readonly slug: string;
        readonly name: string;
        readonly description: string;
        readonly icon?: string;
        readonly tier?: string;
      }
    | {
        readonly status: "reference";
        readonly referenceNote: string;
        readonly referencePriceCop?: number;
        readonly id: string;
        readonly slug: string;
        readonly name: string;
        readonly description: string;
        readonly icon?: string;
        readonly tier?: string;
      }
  );

export interface CatalogPrebuild {
  readonly slug: string;
  readonly name: string;
  readonly tier: "essentials" | "creator" | "apex";
  readonly tagline: string;
  readonly componentIds: readonly string[];
  readonly serviceId: string;
  readonly pricingPolicyId: string;
  readonly featured: boolean;
  readonly badge?: string;
  readonly addOnOptions?: Readonly<
    Record<
      string,
      {
        readonly type: string;
        readonly id: string;
        readonly price_cop: number;
        readonly url: string;
      }
    >
  >;
}

export interface PricingPolicy {
  readonly id: string;
  readonly label: string;
  /** Integer >= 0. Default 0 when unconfigured. */
  readonly fixedMarginCop: number;
  /** Percent units, >= 0, at most two decimals. Default 0. */
  readonly percentageMargin: number;
  readonly confirmed: boolean;
  readonly note?: string;
}

export interface PricingPolicyDocument {
  readonly schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  readonly freshness: { readonly staleAfterDays: number };
  readonly defaultPolicyId: string;
  readonly policies: readonly PricingPolicy[];
}

export interface Catalog {
  readonly schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  readonly components: readonly CatalogComponent[];
  readonly services: readonly CatalogService[];
  readonly prebuilds: readonly CatalogPrebuild[];
  readonly policies: readonly PricingPolicy[];
  readonly defaultPolicyId: string;
  readonly staleAfterDays: number;
  readonly byComponentId: ReadonlyMap<string, CatalogComponent>;
  readonly byServiceId: ReadonlyMap<string, CatalogService>;
  readonly byPolicyId: ReadonlyMap<string, PricingPolicy>;
  readonly byPrebuildSlug: ReadonlyMap<string, CatalogPrebuild>;
}

/**
 * Input shape accepted by the validators and the loader. The four documents
 * are kept structurally separate (so a maintainer can edit just one file)
 * but validated as a single catalog.
 */
export interface RawCatalogInput {
  readonly schemaVersion: number;
  readonly components: readonly unknown[];
  readonly services: readonly unknown[];
  readonly prebuilds: readonly unknown[];
  readonly policy: unknown;
}
