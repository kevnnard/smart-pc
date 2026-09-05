/**
 * smart-pc · shared data interfaces (Phase 3 → PR 2 migration).
 *
 * Every static data source under `src/data/*.ts` MUST import its payload type
 * from this file. Components consume the same interfaces so a single
 * type-correctness check (`pnpm check`) covers the whole data layer.
 *
 * Conventions (post PR 2):
 * - Prices are integer whole Colombian pesos (COP). No decimals. Display
 *   via `formatCop()` from `src/lib/money.ts`. The historical ARS/COP
 *   ambiguity has been resolved (design.md §1.1 decision D-0).
 * - The `Component` shape is deliberately flat. Category-specific compatibility
 *   fields are optional and only populated where they apply (e.g. `socket`
 *   on CPU and motherboard, `wattageDraw` on GPU, `interface_` on storage).
 *   `interface_` carries the trailing underscore to avoid clashing with the
 *   TypeScript `interface` keyword.
 * - The data layer is now a thin re-export adapter over
 *   `src/data/catalog/*.json`; see `src/data/components.ts` and the
 *   `toLegacyComponent` / `toLegacyService` / `toLegacyPrebuilt` adapters
 *   under `src/lib/catalog/adapters.ts`.
 */

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

export interface BrandSocialLink {
  /** Display name, e.g. "Instagram", "X", "YouTube", "Discord". */
  readonly platform: string;
  /** Public URL for the social profile. */
  readonly url: string;
  /**
   * Icon identifier. Consumers resolve this against an icon registry; for V1
   * the four canonical values are `instagram`, `x`, `youtube`, `discord`.
   */
  readonly icon: string;
}

export interface BrandInfo {
  /** Wordmark, e.g. "smart-pc". */
  readonly name: string;
  /** One-line tagline, e.g. "PCs a tu medida". */
  readonly tagline: string;
  /** Longer brand description used on About / Hero surfaces. */
  readonly description: string;
  /** Full `wa.me/{number}` URL (international format, no `+`). */
  readonly whatsapp: string;
  /** Public contact email address. */
  readonly email: string;
  /** Social profiles rendered in Navbar / Footer. */
  readonly social: readonly BrandSocialLink[];
  /** Human-readable location, e.g. "Bogotá, Colombia". */
  readonly location: string;
}

// ---------------------------------------------------------------------------
// Components catalog
// ---------------------------------------------------------------------------

/** Catalog category for a single PC component. */
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

/**
 * A single component in the catalog (CPU, GPU, motherboard, RAM, storage, PSU,
 * cooler, or OS). The base shape carries identification and pricing; category-
 * specific compatibility fields are populated only where they apply. The
 * `validate()` function in `src/lib/compatibility.ts` consumes a partial
 * collection of these.
 *
 * Slice 1 reconciliation: `price` is nullable because the multi-offer
 * catalog can carry components whose only offers are category-page or
 * 404-or-missing (priceStatus: "unconfirmed"). Pages and adapters MUST
 * surface the "no confirmed price" case explicitly instead of rendering a
 * fabricated `0` or a guessed figure.
 */
export interface Component {
  readonly id: string;
  readonly category: ComponentCategory;
  readonly brand: string;
  readonly model: string;
  /**
   * Integer whole Colombian pesos (COP), or `null` when the component has
   * no confirmed COP offer. Display via `formatCop()`; for null, render a
   * "precio no confirmado" caveat instead.
   */
  readonly price: number | null;
  /** Free-form key/value spec strings (e.g. `"Cores": "8"`, `"Boost": "4.5 GHz"`). */
  readonly specs: Record<string, string>;
  /** Product-level price-evidence summary (Slice 1). */
  readonly priceStatus?: "verified" | "provisional" | "unconfirmed";
  /** Roll-up stock status (Slice 1). */
  readonly stockStatus?: "in-stock" | "limited" | "out-of-stock" | "unknown";
  /** Whole units in stock, or `null` when quantity is unknown. */
  readonly stockQuantity?: number | null;
  /** Optional non-empty free text describing restock expectations. */
  readonly restockNote?: string;
  /** Real product image URL from verified vendor if available. */
  readonly imageUrl?: string;

  // Compatibility fields — populated only where they apply.
  /** CPU/motherboard socket: `AM4`, `AM5`, `LGA1700`, etc. */
  readonly socket?: string;
  /** Motherboard/RAM memory type: `DDR4`, `DDR5`. */
  readonly ramType?: string;
  /** Number of DIMM slots on a motherboard. */
  readonly ramSlots?: number;
  /** CPU TDP in watts. */
  readonly tdp?: number;
  /** PSU rated capacity in watts. */
  readonly wattage?: number;
  /** GPU peak power draw in watts. */
  readonly wattageDraw?: number;
  /** Storage interface: `nvme`, `sata`, or `m2`. */
  readonly interface_?: string;
  /** Case or motherboard form factor: `ATX`, `mATX`, `ITX`, etc. */
  readonly formFactor?: string;
}

// ---------------------------------------------------------------------------
// Prebuilt PC
// ---------------------------------------------------------------------------

/** Performance / price tier. */
export type PCTier = "essentials" | "creator" | "apex";

export interface PrebuiltPC {
  /** URL slug, e.g. `essentials`. */
  readonly slug: string;
  readonly name: string;
  readonly tier: PCTier;
  /** One-line tagline, e.g. "Home · Office · Estudio". */
  readonly tagline: string;
  /**
   * Derived final customer price in COP, computed from referenced components
   * + confirmed service + disclosed margin. Computed by the quote engine
   * (`src/lib/quotes/calculate-quote.ts`); do not hand-edit.
   *
   * Slice 2 contract: `null` when ANY referenced component has
   * `priceStatus: "unconfirmed"` or has no eligible reference offer. The
   * page must surface "Pendiente de confirmación" rather than render a
   * fabricated zero or a guessed figure.
   */
  readonly basePrice: number | null;
  /** Ordered list of parts that make up this build. */
  readonly components: readonly Component[];
  /**
   * Optional add-ons (keyboards, monitors, etc.) shown on the detail page
   * but NOT included in the build price. Each entry has an id, type,
   * priceCop, and URL pointing back to the PC Masters Bogotá listing.
   */
  readonly addOns?: readonly AddOn[];
  /** Show on home pre-armadas teaser. */
  readonly featured: boolean;
  /** Optional badge text, e.g. "Más vendido". */
  readonly badge?: string;
}

/**
 * A single optional add-on shown on the pre-armada detail page.
 * Marketed as "Addicional opcional" — explicitly excluded from the base
 * price displayed on the index card.
 */
export interface AddOn {
  /** Internal key, e.g. "monitor_22_basico". */
  readonly key: string;
  /** Human-readable type label, e.g. "monitor", "keyboard+mouse". */
  readonly type: string;
  /** Internal catalog id used for cross-linking. */
  readonly id: string;
  /** Listed price in COP, taken from the catalog offer. */
  readonly priceCop: number;
  /** PC Masters Bogotá product URL. */
  readonly url: string;
}

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

export interface ServiceRecord {
  /** URL slug, e.g. `armado-a-medida`. */
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  /**
   * Icon identifier — either an emoji (e.g. `"🛠️"`) or a registered SVG
   * identifier. Consumers decide how to render it.
   */
  readonly icon: string;
  /**
   * Starting price in integer whole COP, no decimals. For confirmed
   * services this equals the confirmed fee. For recommended services
   * this is the lower bound of the recommended range. Reference
   * services may omit it when no numeric reference exists.
   */
  readonly startingPrice?: number;
}

// ---------------------------------------------------------------------------
// Home data
// ---------------------------------------------------------------------------

export interface StatItem {
  readonly value: string;
  readonly label: string;
}

export interface TrustItem {
  /** Icon identifier — emoji or registered SVG identifier. */
  readonly icon: string;
  readonly title: string;
  readonly description: string;
}

export interface FAQItem {
  readonly question: string;
  readonly answer: string;
}

// ---------------------------------------------------------------------------
// Compatibility
// ---------------------------------------------------------------------------

export type CompatibilityLevel = "compatible" | "warning" | "incompatible";

export interface CompatibilityResult {
  readonly level: CompatibilityLevel;
  /** Human-readable messages describing each finding. */
  readonly messages: readonly string[];
}

/**
 * Partial selection of components. Fields are optional because the user
 * fills them in step-by-step through the configurator.
 */
export interface PCSelection {
  readonly cpu?: Component;
  readonly motherboard?: Component;
  readonly gpu?: Component;
  readonly ram?: readonly Component[];
  readonly storage?: readonly Component[];
  readonly psu?: Component;
  readonly cooler?: Component;
  readonly case?: Component;
}
