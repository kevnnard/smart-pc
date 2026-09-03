/**
 * smart-pc · shared data interfaces (Phase 3).
 *
 * Every static data source under `src/data/*.ts` MUST import its payload type
 * from this file. Components consume the same interfaces so a single
 * type-correctness check (`pnpm check`) covers the whole data layer.
 *
 * Conventions:
 * - Prices are integer ARS (Argentine peso). The display layer (Phase 5) is
 *   responsible for thousand-separator formatting via `formatArs()` from
 *   `src/lib/money.ts` once that helper lands (tasks.md 2.4–2.5).
 * - The `Component` shape is deliberately flat. Category-specific compatibility
 *   fields are optional and only populated where they apply (e.g. `socket`
 *   on CPU and motherboard, `wattageDraw` on GPU, `interface_` on storage).
 *   `interface_` carries the trailing underscore to avoid clashing with the
 *   TypeScript `interface` keyword.
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
  | "cooler"
  | "os";

/**
 * A single component in the catalog (CPU, GPU, motherboard, RAM, storage, PSU,
 * cooler, or OS). The base shape carries identification and pricing; category-
 * specific compatibility fields are populated only where they apply. The
 * `validate()` function in `src/lib/compatibility.ts` consumes a partial
 * collection of these.
 */
export interface Component {
  readonly id: string;
  readonly category: ComponentCategory;
  readonly brand: string;
  readonly model: string;
  /** Integer ARS, no decimals. Display via `formatArs()`. */
  readonly price: number;
  /** Free-form key/value spec strings (e.g. `"Cores": "8"`, `"Boost": "4.5 GHz"`). */
  readonly specs: Record<string, string>;

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
  /** Integer ARS, no decimals. Display via `formatArs()`. */
  readonly basePrice: number;
  /** Ordered list of parts that make up this build. */
  readonly components: readonly Component[];
  /** Show on home pre-armadas teaser. */
  readonly featured: boolean;
  /** Optional badge text, e.g. "Más vendido". */
  readonly badge?: string;
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
  /** Optional starting price in integer ARS, no decimals. */
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
