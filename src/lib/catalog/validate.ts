/**
 * smart-pc · pure catalog validators (Slice 1 · multi-offer).
 *
 * Hand-written validators (decision D-2) returning a `ValidationResult<T>`
 * that aggregates every issue rather than failing on the first one. No
 * network, no `Date.now()`, no filesystem, no logging — see design.md §4.1.
 *
 * Slice 1 introduces:
 *   - `Offer` records inside `CatalogComponent.offers[]`
 *   - `priceStatus`, `stockStatus`, `stockQuantity`, `restockNote?`
 *   - Placeholder URL rejection (`host/<slug>/p`)
 *   - Conversion cross-check for non-COP offers (COP 1,000 tolerance)
 *   - Per-component offerId uniqueness
 *
 * The legacy single-observation fields (`observedPriceCop`,
 * `sourceStore`, `sourceUrl`, `lastVerified`, `availability`) are kept as
 * derived properties on `CatalogComponent` so the PR-2 adapter / quote
 * engine compile while Slice 2 brings in reference-offer selection.
 */
import {
  type Availability,
  CATALOG_SCHEMA_VERSION,
  type Catalog,
  type CatalogComponent,
  type CatalogPrebuild,
  type CatalogService,
  type CompatibilityFields,
  type ComponentCategory,
  type ConversionAssumption,
  type Currency,
  type EvidenceStatus,
  type Offer,
  type PriceStatus,
  type PricingPolicy,
  type PricingPolicyDocument,
  type RawCatalogInput,
  type StockStatus,
} from "./catalog-types";

// ---------------------------------------------------------------------------
// Issue + result types
// ---------------------------------------------------------------------------

export interface CatalogIssue {
  /** JSON document the issue came from, e.g. `components.json`. */
  readonly file: string;
  /** JSON-pointer-ish path, e.g. `components[3].offers[0].sourceUrl`. */
  readonly path: string;
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] };

const COMPONENTS_FILE = "src/data/catalog/components.json";
const SERVICES_FILE = "src/data/catalog/services.json";
const PREBUILDS_FILE = "src/data/catalog/prebuilds.json";
const POLICY_FILE = "src/data/catalog/pricing-policy.json";

const COMPONENT_CATEGORIES: readonly ComponentCategory[] = [
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
  "case",
  "cooler",
  "monitor",
  "peripheral",
  "os",
];

const AVAILABILITIES: readonly Availability[] = [
  "in-stock",
  "limited",
  "out-of-stock",
  "unknown",
];

const PRICE_STATUSES: readonly PriceStatus[] = [
  "verified",
  "provisional",
  "unconfirmed",
];

const EVIDENCE_STATUSES: readonly EvidenceStatus[] = [
  "confirmed",
  "category-page",
  "404-or-missing",
];

const PREBUILD_TIERS = ["essentials", "creator", "apex"] as const;

// Conversion cross-check tolerance in whole COP (decision D-13).
const NORMALIZED_COST_TOLERANCE_COP = 1000;

/** Placeholder URL pattern (spec D-16 / decision D-16): `host/<slug>/p`. */
const PLACEHOLDER_URL_PATTERN = /^https?:\/\/host\/[^/]+\/p\/?$/i;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Timezone-aware ISO-8601: requires an explicit offset (`+HH:MM`, `-HH:MM`)
 * or `Z`. A bare `2025-02-18` or naive `2025-02-18T10:00:00` is rejected so
 * the value is reproducible across build machines.
 */
function isTimezoneAwareIsoDate(value: string): boolean {
  if (!isString(value)) return false;
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return false;
  // Require either Z or ±HH:MM offset somewhere in the string.
  return /Z$|[+-]\d{2}:?\d{2}$/.test(value);
}

function isHttpUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (!url.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * True when the URL matches the placeholder `host/<slug>/p` pattern.
 * A real evidence URL MUST NOT match; the validator rejects it.
 */
function isPlaceholderUrl(value: string): boolean {
  return PLACEHOLDER_URL_PATTERN.test(value);
}

function deriveName(brand: string, model: string): string {
  return `${brand} ${model}`.trim();
}

/**
 * Roll-up rule (design §3.4): component-level availability is derived from
 * the offer availability values when the maintainer does not pin it.
 *   1. all-out-of-stock → out-of-stock
 *   2. any in-stock     → in-stock
 *   3. any limited      → limited
 *   4. otherwise        → unknown
 */
function rollUpAvailability(offers: readonly Offer[]): Availability {
  if (offers.length === 0) return "unknown";
  if (offers.every((o) => o.availability === "out-of-stock")) {
    return "out-of-stock";
  }
  if (offers.some((o) => o.availability === "in-stock")) {
    return "in-stock";
  }
  if (offers.some((o) => o.availability === "limited")) {
    return "limited";
  }
  return "unknown";
}

/**
 * Choose the lowest-confirmed-COP offer for the legacy `observedPriceCop`
 * derived field. Returns `null` when no confirmed COP offer exists.
 */
function pickReferencePriceCop(offers: readonly Offer[]): number | null {
  const candidates = offers.filter(
    (o) => o.evidenceStatus === "confirmed" && o.sourceCurrency === "COP",
  );
  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (const c of candidates) {
    if (c.listedAmount < best.listedAmount) best = c;
  }
  return best.listedAmount;
}

function pickReferenceProvenance(offers: readonly Offer[]): {
  sourceStore: string;
  sourceUrl: string;
  lastVerified: string;
} | null {
  // Prefer the confirmed-COP reference; fall back to the first confirmed
  // offer; fall back to the first offer of any kind.
  const confirmedCop = offers.find(
    (o) => o.evidenceStatus === "confirmed" && o.sourceCurrency === "COP",
  );
  if (confirmedCop) {
    return {
      sourceStore: confirmedCop.retailer,
      sourceUrl: confirmedCop.sourceUrl,
      lastVerified: confirmedCop.checkedAt,
    };
  }
  const confirmed = offers.find((o) => o.evidenceStatus === "confirmed");
  if (confirmed) {
    return {
      sourceStore: confirmed.retailer,
      sourceUrl: confirmed.sourceUrl,
      lastVerified: confirmed.checkedAt,
    };
  }
  if (offers.length === 0) return null;
  const first = offers[0];
  return {
    sourceStore: first.retailer,
    sourceUrl: first.sourceUrl,
    lastVerified: first.checkedAt,
  };
}

// ---------------------------------------------------------------------------
// Offer validator
// ---------------------------------------------------------------------------

function validateOffer(
  raw: unknown,
  file: string,
  path: string,
): ValidationResult<Offer> {
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      issues: [{ file, path, message: "offer must be an object" }],
    };
  }
  const issues: CatalogIssue[] = [];

  // offerId -----------------------------------------------------------------
  const offerId = raw.offerId;
  if (!isNonEmptyString(offerId)) {
    issues.push({
      file,
      path: `${path}.offerId`,
      message: "offerId must be a non-empty string",
    });
  }

  // retailer ----------------------------------------------------------------
  const retailer = raw.retailer;
  if (!isNonEmptyString(retailer)) {
    issues.push({
      file,
      path: `${path}.retailer`,
      message: "retailer must be a non-empty string",
    });
  }

  // sourceUrl ---------------------------------------------------------------
  const sourceUrl = raw.sourceUrl;
  if (!isHttpUrl(sourceUrl)) {
    issues.push({
      file,
      path: `${path}.sourceUrl`,
      message:
        "sourceUrl must be an absolute http(s) URL with a non-empty hostname",
    });
  } else if (isPlaceholderUrl(sourceUrl)) {
    issues.push({
      file,
      path: `${path}.sourceUrl`,
      message:
        "sourceUrl matches the placeholder host/<slug>/p pattern; replace with a real retailer, listing, or product page",
    });
  }

  // sourceCurrency ----------------------------------------------------------
  const sourceCurrency = raw.sourceCurrency;
  if (!isNonEmptyString(sourceCurrency)) {
    issues.push({
      file,
      path: `${path}.sourceCurrency`,
      message: "sourceCurrency must be a non-empty ISO-4217 code",
    });
  }

  // listedAmount ------------------------------------------------------------
  const listedAmount = raw.listedAmount;
  if (typeof listedAmount !== "number" || !Number.isFinite(listedAmount)) {
    issues.push({
      file,
      path: `${path}.listedAmount`,
      message: "listedAmount must be a finite number",
    });
  } else if (listedAmount < 0) {
    issues.push({
      file,
      path: `${path}.listedAmount`,
      message: "listedAmount must be non-negative",
    });
  } else if (sourceCurrency === "COP" && !Number.isInteger(listedAmount)) {
    issues.push({
      file,
      path: `${path}.listedAmount`,
      message:
        "listedAmount must be a whole integer when sourceCurrency is COP",
    });
  }

  // shippingImportTaxCop ---------------------------------------------------
  const shippingImportTaxCop = raw.shippingImportTaxCop;
  if (shippingImportTaxCop !== undefined) {
    if (
      typeof shippingImportTaxCop !== "number" ||
      !Number.isInteger(shippingImportTaxCop) ||
      shippingImportTaxCop < 0
    ) {
      issues.push({
        file,
        path: `${path}.shippingImportTaxCop`,
        message:
          "shippingImportTaxCop must be a non-negative integer when present",
      });
    }
  }

  // sellerCondition ---------------------------------------------------------
  const sellerCondition = raw.sellerCondition;
  if (!isNonEmptyString(sellerCondition)) {
    issues.push({
      file,
      path: `${path}.sellerCondition`,
      message: "sellerCondition must be a non-empty string",
    });
  }

  // availability ------------------------------------------------------------
  const availability = raw.availability;
  if (
    !isString(availability) ||
    !AVAILABILITIES.includes(availability as Availability)
  ) {
    issues.push({
      file,
      path: `${path}.availability`,
      message: `availability must be one of: ${AVAILABILITIES.join(", ")}`,
    });
  }

  // checkedAt ---------------------------------------------------------------
  const checkedAt = raw.checkedAt;
  if (!isTimezoneAwareIsoDate(checkedAt as string)) {
    issues.push({
      file,
      path: `${path}.checkedAt`,
      message:
        "checkedAt must be a timezone-aware ISO-8601 instant (offset or Z)",
    });
  }

  // evidenceStatus ----------------------------------------------------------
  const evidenceStatus = raw.evidenceStatus;
  if (
    !isString(evidenceStatus) ||
    !EVIDENCE_STATUSES.includes(evidenceStatus as EvidenceStatus)
  ) {
    issues.push({
      file,
      path: `${path}.evidenceStatus`,
      message: `evidenceStatus must be one of: ${EVIDENCE_STATUSES.join(", ")}`,
    });
  }

  // conversionAssumption + normalizedCostCop ------------------------------
  // Non-COP offers MAY carry conversionAssumption + normalizedCostCop so
  // the reference selector can compute a documented COP landing. When
  // they DO, the cross-check fires. When they do NOT, the offer is
  // recorded as evidence of search availability only; the component's
  // priceStatus consistency check handles the downgrade.
  const conversionAssumptionRaw = raw.conversionAssumption;
  const normalizedCostCop = raw.normalizedCostCop;
  let conversionAssumption: ConversionAssumption | undefined;
  if (sourceCurrency !== "COP") {
    if (isPlainObject(conversionAssumptionRaw)) {
      const ca = validateConversionAssumption(
        conversionAssumptionRaw,
        file,
        `${path}.conversionAssumption`,
      );
      issues.push(...ca.issues);
      if (ca.issues.length === 0) {
        conversionAssumption = ca.value;
      }
    }
    if (normalizedCostCop !== undefined) {
      if (
        typeof normalizedCostCop !== "number" ||
        !Number.isInteger(normalizedCostCop) ||
        normalizedCostCop < 0
      ) {
        issues.push({
          file,
          path: `${path}.normalizedCostCop`,
          message: "normalizedCostCop must be a non-negative integer",
        });
      } else if (conversionAssumption && typeof listedAmount === "number") {
        const expected = computeExpectedNormalizedCost(
          listedAmount,
          conversionAssumption.exchangeRateCopPerUnit,
          shippingImportTaxCop as number | undefined,
        );
        if (typeof expected === "number") {
          const delta = Math.abs(normalizedCostCop - expected);
          if (delta > NORMALIZED_COST_TOLERANCE_COP) {
            issues.push({
              file,
              path: `${path}.normalizedCostCop`,
              message:
                `normalizedCostCop ${normalizedCostCop} differs from the computed ` +
                `value ${expected} by ${delta} COP (> ${NORMALIZED_COST_TOLERANCE_COP} tolerance). ` +
                `Re-check the exchange rate, rateAsOf date, and shippingImportTaxCop.`,
            });
          }
        }
      }
    }
    // priceStatus consistency check: a verified component cannot have a
    // confirmed non-COP offer without a documented conversion.
    if (evidenceStatus === "confirmed" && !conversionAssumption) {
      // We need to know the component's priceStatus to enforce this. We
      // store a hint on the offer so the per-component priceStatus
      // consistency pass can downgrade `verified` to `provisional`.
      (raw as Record<string, unknown>).__needsProvisional = true;
    }
  } else {
    // COP offers MAY carry conversionAssumption and normalizedCostCop
    // (e.g. landed-cost adjustments); we accept but do not require.
    if (isPlainObject(conversionAssumptionRaw)) {
      const ca = validateConversionAssumption(
        conversionAssumptionRaw,
        file,
        `${path}.conversionAssumption`,
      );
      issues.push(...ca.issues);
      if (ca.issues.length === 0) conversionAssumption = ca.value;
    }
    if (normalizedCostCop !== undefined) {
      if (
        typeof normalizedCostCop !== "number" ||
        !Number.isInteger(normalizedCostCop) ||
        normalizedCostCop < 0
      ) {
        issues.push({
          file,
          path: `${path}.normalizedCostCop`,
          message:
            "normalizedCostCop must be a non-negative integer when present",
        });
      }
    }
  }

  // notes -------------------------------------------------------------------
  const notes = raw.notes;
  if (notes !== undefined && !isString(notes)) {
    issues.push({
      file,
      path: `${path}.notes`,
      message: "notes must be a string when present",
    });
  }

  if (
    issues.length > 0 ||
    !isString(offerId) ||
    !isString(retailer) ||
    !isString(sourceUrl) ||
    !isString(sourceCurrency) ||
    typeof listedAmount !== "number" ||
    !isString(sellerCondition) ||
    !isString(availability) ||
    !isString(checkedAt) ||
    !isString(evidenceStatus)
  ) {
    return { ok: false, issues };
  }

  const offer: Offer = {
    offerId,
    retailer,
    sourceUrl,
    sourceCurrency,
    listedAmount,
    sellerCondition,
    availability: availability as Availability,
    checkedAt,
    evidenceStatus: evidenceStatus as EvidenceStatus,
    ...(shippingImportTaxCop !== undefined
      ? { shippingImportTaxCop: shippingImportTaxCop as number }
      : {}),
    ...(conversionAssumption ? { conversionAssumption } : {}),
    ...(normalizedCostCop !== undefined && typeof normalizedCostCop === "number"
      ? { normalizedCostCop }
      : {}),
    ...(isString(notes) ? { notes } : {}),
  };
  return { ok: true, value: offer };
}

function validateConversionAssumption(
  raw: Record<string, unknown>,
  file: string,
  path: string,
): { value: ConversionAssumption; issues: CatalogIssue[] } {
  const issues: CatalogIssue[] = [];
  const targetCurrency = raw.targetCurrency;
  if (targetCurrency !== "COP") {
    issues.push({
      file,
      path: `${path}.targetCurrency`,
      message: "targetCurrency must be exactly 'COP'",
    });
  }

  const exchangeRateCopPerUnit = raw.exchangeRateCopPerUnit;
  if (
    typeof exchangeRateCopPerUnit !== "number" ||
    !Number.isFinite(exchangeRateCopPerUnit) ||
    exchangeRateCopPerUnit < 0
  ) {
    issues.push({
      file,
      path: `${path}.exchangeRateCopPerUnit`,
      message: "exchangeRateCopPerUnit must be a non-negative number",
    });
  }

  const rateSource = raw.rateSource;
  if (!isNonEmptyString(rateSource)) {
    issues.push({
      file,
      path: `${path}.rateSource`,
      message: "rateSource must be a non-empty string",
    });
  }

  const rateAsOf = raw.rateAsOf;
  if (!isTimezoneAwareIsoDate(rateAsOf as string)) {
    issues.push({
      file,
      path: `${path}.rateAsOf`,
      message:
        "rateAsOf must be a timezone-aware ISO-8601 instant (offset or Z)",
    });
  }

  const notes = raw.notes;
  if (!isNonEmptyString(notes)) {
    issues.push({
      file,
      path: `${path}.notes`,
      message: "notes must be a non-empty string",
    });
  }

  if (issues.length > 0) {
    return {
      value: {} as ConversionAssumption,
      issues,
    };
  }

  return {
    value: {
      targetCurrency: "COP",
      exchangeRateCopPerUnit: exchangeRateCopPerUnit as number,
      rateSource: rateSource as string,
      rateAsOf: rateAsOf as string,
      notes: notes as string,
    },
    issues: [],
  };
}

function computeExpectedNormalizedCost(
  listedAmount: number,
  exchangeRateCopPerUnit: number,
  shippingImportTaxCop: number | undefined,
): number | null {
  if (
    !Number.isFinite(listedAmount) ||
    !Number.isFinite(exchangeRateCopPerUnit)
  ) {
    return null;
  }
  const shipping = shippingImportTaxCop ?? 0;
  const expected = Math.round(listedAmount * exchangeRateCopPerUnit) + shipping;
  return expected;
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

export function validateCatalogComponents(
  raw: readonly unknown[],
): ValidationResult<readonly CatalogComponent[]> {
  const issues: CatalogIssue[] = [];
  const seenIds = new Set<string>();
  const components: CatalogComponent[] = [];

  raw.forEach((entry, index) => {
    const path = `components[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push({
        file: COMPONENTS_FILE,
        path,
        message: "component must be an object",
      });
      return;
    }

    const localIssues: CatalogIssue[] = [];

    // -- id ----------------------------------------------------------------
    const id = entry.id;
    if (!isNonEmptyString(id)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.id`,
        message: "id must be a non-empty string",
      });
    } else if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.id`,
        message: "id must match /^[a-z0-9][a-z0-9-]*$/",
      });
    } else if (seenIds.has(id)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.id`,
        message: `duplicate id: ${id}`,
      });
    }

    // -- category ----------------------------------------------------------
    const category = entry.category;
    if (
      !isString(category) ||
      !COMPONENT_CATEGORIES.includes(category as ComponentCategory)
    ) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.category`,
        message: `category must be one of: ${COMPONENT_CATEGORIES.join(", ")}`,
      });
    }

    // -- brand + model -----------------------------------------------------
    const brand = entry.brand;
    if (!isNonEmptyString(brand)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.brand`,
        message: "brand must be a non-empty string",
      });
    }
    const model = entry.model;
    if (!isNonEmptyString(model)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.model`,
        message: "model must be a non-empty string",
      });
    }

    // -- name (optional) ---------------------------------------------------
    const name = entry.name;
    if (name !== undefined && !isNonEmptyString(name)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.name`,
        message: "name must be a non-empty string when present",
      });
    }

    // -- specs -------------------------------------------------------------
    const specs = entry.specs;
    if (
      !isPlainObject(specs) ||
      Object.keys(specs).length === 0 ||
      Object.values(specs).some((v) => !isString(v))
    ) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.specs`,
        message: "specs must be a non-empty object with string values only",
      });
    }

    // -- compatibility -----------------------------------------------------
    const compatibility = entry.compatibility;
    const { value: compat, issues: compatIssues } = validateCompatibility(
      compatibility,
      `${path}.compatibility`,
      COMPONENTS_FILE,
    );
    if (compatIssues.length > 0) localIssues.push(...compatIssues);

    // -- priceStatus -------------------------------------------------------
    const priceStatus = entry.priceStatus;
    if (
      !isString(priceStatus) ||
      !PRICE_STATUSES.includes(priceStatus as PriceStatus)
    ) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.priceStatus`,
        message: `priceStatus must be one of: ${PRICE_STATUSES.join(", ")}`,
      });
    }

    // -- stockStatus -------------------------------------------------------
    const stockStatus = entry.stockStatus;
    if (
      !isString(stockStatus) ||
      !AVAILABILITIES.includes(stockStatus as Availability)
    ) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.stockStatus`,
        message: `stockStatus must be one of: ${AVAILABILITIES.join(", ")}`,
      });
    }

    // -- stockQuantity -----------------------------------------------------
    const stockQuantity = entry.stockQuantity;
    if (stockQuantity === null) {
      // null = unknown; allowed
    } else if (
      typeof stockQuantity !== "number" ||
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.stockQuantity`,
        message:
          "stockQuantity must be null (unknown) or a non-negative integer",
      });
    }

    // -- restockNote -------------------------------------------------------
    const restockNote = entry.restockNote;
    if (restockNote !== undefined) {
      if (!isNonEmptyString(restockNote)) {
        localIssues.push({
          file: COMPONENTS_FILE,
          path: `${path}.restockNote`,
          message: "restockNote must be a non-empty string when present",
        });
      }
    }

    // -- imageUrl ----------------------------------------------------------
    const imageUrl = entry.imageUrl;
    if (imageUrl !== undefined && !isHttpUrl(imageUrl)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.imageUrl`,
        message: "imageUrl must be an absolute http(s) URL when present",
      });
    }

    // -- notes -------------------------------------------------------------
    const notes = entry.notes;
    if (notes !== undefined && !isString(notes)) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.notes`,
        message: "notes must be a string when present",
      });
    }

    // -- offers[] ----------------------------------------------------------
    const offersRaw = entry.offers;
    if (!Array.isArray(offersRaw) || offersRaw.length === 0) {
      localIssues.push({
        file: COMPONENTS_FILE,
        path: `${path}.offers`,
        message: "offers must be a non-empty array",
      });
    } else {
      const seenOfferIds = new Set<string>();
      const validatedOffers: Offer[] = [];
      offersRaw.forEach((offerEntry, oIdx) => {
        const offerPath = `${path}.offers[${oIdx}]`;
        const result = validateOffer(offerEntry, COMPONENTS_FILE, offerPath);
        if (!result.ok) {
          localIssues.push(...result.issues);
          return;
        }
        const offer = result.value;
        if (seenOfferIds.has(offer.offerId)) {
          localIssues.push({
            file: COMPONENTS_FILE,
            path: `${offerPath}.offerId`,
            message: `duplicate offerId within component: ${offer.offerId}`,
          });
        } else {
          seenOfferIds.add(offer.offerId);
        }
        validatedOffers.push(offer);
      });

      // -- priceStatus consistency with offers --------------------------
      if (validatedOffers.length > 0 && isString(priceStatus)) {
        const confirmedCount = validatedOffers.filter(
          (o) => o.evidenceStatus === "confirmed",
        ).length;
        if (priceStatus === "verified" && confirmedCount === 0) {
          localIssues.push({
            file: COMPONENTS_FILE,
            path: `${path}.priceStatus`,
            message:
              "priceStatus 'verified' requires at least one offer with evidenceStatus 'confirmed'",
          });
        }
        if (priceStatus === "unconfirmed" && confirmedCount > 0) {
          localIssues.push({
            file: COMPONENTS_FILE,
            path: `${path}.priceStatus`,
            message:
              "priceStatus 'unconfirmed' is inconsistent with the presence of confirmed offers",
          });
        }
        // A confirmed non-COP offer without a documented
        // conversionAssumption + normalizedCostCop can never promote the
        // component to 'verified' (spec: provisional when conversion has
        // not been confirmed by the owner).
        const confirmedNonCopWithoutConversion = validatedOffers.filter(
          (o) =>
            o.evidenceStatus === "confirmed" &&
            o.sourceCurrency !== "COP" &&
            (o.conversionAssumption === undefined ||
              o.normalizedCostCop === undefined),
        );
        if (
          priceStatus === "verified" &&
          confirmedNonCopWithoutConversion.length > 0
        ) {
          localIssues.push({
            file: COMPONENTS_FILE,
            path: `${path}.priceStatus`,
            message:
              "priceStatus 'verified' is incompatible with confirmed non-COP offers that lack conversionAssumption + normalizedCostCop",
          });
        }
      }
    }

    if (localIssues.length > 0) {
      issues.push(...localIssues);
      return;
    }

    if (
      !isString(id) ||
      !isString(category) ||
      !isString(brand) ||
      !isString(model) ||
      !isPlainObject(specs) ||
      !isString(priceStatus) ||
      !isString(stockStatus) ||
      !Array.isArray(offersRaw)
    ) {
      return;
    }

    // Re-validate offers for the value emission; we know localIssues is empty.
    const validatedOffers: Offer[] = [];
    offersRaw.forEach((offerEntry) => {
      const r = validateOffer(offerEntry, COMPONENTS_FILE, "");
      if (r.ok) validatedOffers.push(r.value);
    });

    const referencePriceCop = pickReferencePriceCop(validatedOffers);
    const provenance = pickReferenceProvenance(validatedOffers);
    if (!provenance) {
      issues.push({
        file: COMPONENTS_FILE,
        path: `${path}.offers`,
        message: "component has no usable offer provenance",
      });
      return;
    }

    seenIds.add(id);
    components.push({
      id,
      category: category as ComponentCategory,
      brand,
      model,
      name: isString(name) && name !== "" ? name : deriveName(brand, model),
      specs: specs as Readonly<Record<string, string>>,
      compatibility: compat,
      priceStatus: priceStatus as PriceStatus,
      stockStatus: stockStatus as StockStatus,
      stockQuantity: stockQuantity === null ? null : (stockQuantity as number),
      restockNote: isString(restockNote) ? restockNote : undefined,
      imageUrl: isString(imageUrl) ? imageUrl : undefined,
      notes: isString(notes) ? notes : undefined,
      offers: validatedOffers,
      observedPriceCop: referencePriceCop,
      sourceStore: provenance.sourceStore,
      sourceUrl: provenance.sourceUrl,
      lastVerified: provenance.lastVerified,
      availability: rollUpAvailability(validatedOffers),
    });
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: components };
}

function validateCompatibility(
  raw: unknown,
  path: string,
  file: string,
): { value: CompatibilityFields; issues: CatalogIssue[] } {
  const issues: CatalogIssue[] = [];
  const out: Record<string, unknown> = {};
  if (raw === undefined || raw === null) {
    return { value: out, issues };
  }
  if (!isPlainObject(raw)) {
    return {
      value: {},
      issues: [
        {
          file,
          path,
          message: "compatibility must be an object",
        },
      ],
    };
  }
  for (const key of Object.keys(raw)) {
    out[key] = (raw as Record<string, unknown>)[key];
  }
  return { value: out, issues };
}

export function validateCatalogServices(
  raw: readonly unknown[],
): ValidationResult<readonly CatalogService[]> {
  const issues: CatalogIssue[] = [];
  const seenIds = new Set<string>();
  const services: CatalogService[] = [];

  raw.forEach((entry, index) => {
    const path = `services[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push({
        file: SERVICES_FILE,
        path,
        message: "service must be an object",
      });
      return;
    }
    const {
      id,
      slug,
      name,
      description,
      icon,
      tier,
      status,
      feeCop,
      recommendedMinCop,
      recommendedMaxCop,
      confirmationNote,
      referencePriceCop,
      referenceNote,
    } = entry as Record<string, unknown>;

    if (!isNonEmptyString(id)) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.id`,
        message: "id must be a non-empty string",
      });
      return;
    }
    if (seenIds.has(id)) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.id`,
        message: `duplicate id: ${id}`,
      });
      return;
    }
    seenIds.add(id);
    if (!isNonEmptyString(slug)) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.slug`,
        message: "slug must be a non-empty string",
      });
      return;
    }
    if (!isNonEmptyString(name)) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.name`,
        message: "name must be a non-empty string",
      });
      return;
    }
    if (!isNonEmptyString(description)) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.description`,
        message: "description must be a non-empty string",
      });
      return;
    }
    if (
      status !== "confirmed" &&
      status !== "recommended" &&
      status !== "reference"
    ) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.status`,
        message: "status must be one of: confirmed, recommended, reference",
      });
      return;
    }

    const baseRecord = {
      id,
      slug,
      name,
      description,
      icon: isString(icon) ? icon : undefined,
      tier: isString(tier) ? tier : undefined,
    };

    const provRes = validateServiceProvenance(entry, SERVICES_FILE, path);
    if (provRes.issues.length > 0) {
      issues.push(...provRes.issues);
      return;
    }
    const provenance = provRes.provenance!;

    if (status === "confirmed") {
      if (
        typeof feeCop !== "number" ||
        !Number.isInteger(feeCop) ||
        feeCop < 0
      ) {
        issues.push({
          file: SERVICES_FILE,
          path: `${path}.feeCop`,
          message: "confirmed services require a non-negative integer feeCop",
        });
        return;
      }
      if (
        recommendedMinCop !== undefined ||
        recommendedMaxCop !== undefined ||
        referencePriceCop !== undefined ||
        referenceNote !== undefined
      ) {
        issues.push({
          file: SERVICES_FILE,
          path,
          message:
            "confirmed services must not carry recommendedMinCop / recommendedMaxCop / referenceNote",
        });
        return;
      }
      services.push({
        ...baseRecord,
        status: "confirmed",
        feeCop,
        ...provenance,
        confirmationNote: isString(confirmationNote)
          ? confirmationNote
          : undefined,
      });
      return;
    }

    if (status === "recommended") {
      if (typeof feeCop !== "undefined") {
        issues.push({
          file: SERVICES_FILE,
          path: `${path}.feeCop`,
          message:
            "recommended services MUST NOT carry feeCop (use 'confirmed' status to set a fee)",
        });
        return;
      }
      if (
        typeof recommendedMinCop !== "number" ||
        !Number.isInteger(recommendedMinCop) ||
        recommendedMinCop < 0
      ) {
        issues.push({
          file: SERVICES_FILE,
          path: `${path}.recommendedMinCop`,
          message:
            "recommended services require a non-negative integer recommendedMinCop",
        });
        return;
      }
      if (
        typeof recommendedMaxCop !== "number" ||
        !Number.isInteger(recommendedMaxCop) ||
        recommendedMaxCop < 0
      ) {
        issues.push({
          file: SERVICES_FILE,
          path: `${path}.recommendedMaxCop`,
          message:
            "recommended services require a non-negative integer recommendedMaxCop",
        });
        return;
      }
      if (recommendedMinCop > recommendedMaxCop) {
        issues.push({
          file: SERVICES_FILE,
          path: `${path}.recommendedMinCop`,
          message: "recommendedMinCop must be <= recommendedMaxCop",
        });
        return;
      }
      if (!isNonEmptyString(confirmationNote)) {
        issues.push({
          file: SERVICES_FILE,
          path: `${path}.confirmationNote`,
          message: "recommended services require a non-empty confirmationNote",
        });
        return;
      }
      services.push({
        ...baseRecord,
        status: "recommended",
        recommendedMinCop,
        recommendedMaxCop,
        confirmationNote,
        ...provenance,
      });
      return;
    }

    // status === "reference"
    if (
      referencePriceCop !== undefined &&
      (typeof referencePriceCop !== "number" ||
        !Number.isInteger(referencePriceCop) ||
        referencePriceCop < 0)
    ) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.referencePriceCop`,
        message:
          "referencePriceCop must be a non-negative integer when present",
      });
      return;
    }
    if (!isNonEmptyString(referenceNote)) {
      issues.push({
        file: SERVICES_FILE,
        path: `${path}.referenceNote`,
        message: "reference services require a non-empty referenceNote",
      });
      return;
    }
    services.push({
      ...baseRecord,
      status: "reference",
      referenceNote,
      referencePriceCop:
        typeof referencePriceCop === "number" ? referencePriceCop : undefined,
      ...provenance,
    });
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: services };
}

interface ProvenanceResult {
  provenance?:
    | { sourceStore: string; sourceUrl: string; lastVerified: string }
    | undefined;
  issues: CatalogIssue[];
}

function validateServiceProvenance(
  raw: Record<string, unknown>,
  file: string,
  path: string,
): ProvenanceResult {
  const issues: CatalogIssue[] = [];
  const sourceStore = raw.sourceStore;
  const sourceUrl = raw.sourceUrl;
  const lastVerified = raw.lastVerified;

  if (!isNonEmptyString(sourceStore)) {
    issues.push({
      file,
      path: `${path}.sourceStore`,
      message: "sourceStore must be a non-empty string",
    });
  }
  if (!isHttpUrl(sourceUrl)) {
    issues.push({
      file,
      path: `${path}.sourceUrl`,
      message:
        "sourceUrl must be an absolute http(s) URL with a non-empty hostname",
    });
  } else if (isPlaceholderUrl(sourceUrl)) {
    issues.push({
      file,
      path: `${path}.sourceUrl`,
      message:
        "sourceUrl matches the placeholder host/<slug>/p pattern; replace with a real retailer, listing, or product page",
    });
  }
  if (!isTimezoneAwareIsoDate(lastVerified as string)) {
    issues.push({
      file,
      path: `${path}.lastVerified`,
      message:
        "lastVerified must be a timezone-aware ISO-8601 instant (offset or Z)",
    });
  }

  if (issues.length > 0) return { issues };
  return {
    provenance: {
      sourceStore: sourceStore as string,
      sourceUrl: sourceUrl as string,
      lastVerified: lastVerified as string,
    },
    issues: [],
  };
}

export function validateCatalogPrebuilds(
  raw: readonly unknown[],
): ValidationResult<readonly CatalogPrebuild[]> {
  const issues: CatalogIssue[] = [];
  const seenSlugs = new Set<string>();
  const prebuilds: CatalogPrebuild[] = [];

  raw.forEach((entry, index) => {
    const path = `prebuilds[${index}]`;
    if (!isPlainObject(entry)) {
      issues.push({
        file: PREBUILDS_FILE,
        path,
        message: "prebuild must be an object",
      });
      return;
    }
    const {
      slug,
      name,
      tier,
      tagline,
      componentIds,
      serviceId,
      pricingPolicyId,
      featured,
      badge,
    } = entry as Record<string, unknown>;

    if (!isNonEmptyString(slug)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.slug`,
        message: "slug must be a non-empty string",
      });
      return;
    }
    if (seenSlugs.has(slug)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.slug`,
        message: `duplicate slug: ${slug}`,
      });
      return;
    }
    seenSlugs.add(slug);

    if (!isNonEmptyString(name)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.name`,
        message: "name must be a non-empty string",
      });
      return;
    }
    if (
      !isString(tier) ||
      !PREBUILD_TIERS.includes(tier as (typeof PREBUILD_TIERS)[number])
    ) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.tier`,
        message: `tier must be one of: ${PREBUILD_TIERS.join(", ")}`,
      });
      return;
    }
    if (!isNonEmptyString(tagline)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.tagline`,
        message: "tagline must be a non-empty string",
      });
      return;
    }
    if (
      !Array.isArray(componentIds) ||
      componentIds.length === 0 ||
      componentIds.some((id) => !isString(id))
    ) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.componentIds`,
        message: "componentIds must be a non-empty array of string identifiers",
      });
      return;
    }
    if (!isNonEmptyString(serviceId)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.serviceId`,
        message: "serviceId must be a non-empty string",
      });
      return;
    }
    if (!isNonEmptyString(pricingPolicyId)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.pricingPolicyId`,
        message: "pricingPolicyId must be a non-empty string",
      });
      return;
    }
    if (typeof featured !== "boolean") {
      issues.push({
        file: PREBUILDS_FILE,
        path: `${path}.featured`,
        message: "featured must be a boolean",
      });
      return;
    }

    const addOnOptionsRaw = (entry as Record<string, unknown>).addOnOptions;
    const addOnOptions = isPlainObject(addOnOptionsRaw)
      ? (addOnOptionsRaw as CatalogPrebuild["addOnOptions"])
      : undefined;

    prebuilds.push({
      slug,
      name,
      tier: tier as (typeof PREBUILD_TIERS)[number],
      tagline,
      componentIds,
      serviceId,
      pricingPolicyId,
      featured,
      badge: isString(badge) ? badge : undefined,
      ...(addOnOptions ? { addOnOptions } : {}),
    });
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true, value: prebuilds };
}

export function validatePricingPolicy(
  raw: unknown,
): ValidationResult<PricingPolicyDocument> {
  const issues: CatalogIssue[] = [];
  if (!isPlainObject(raw)) {
    return {
      ok: false,
      issues: [
        {
          file: POLICY_FILE,
          path: "",
          message: "policy document must be an object",
        },
      ],
    };
  }
  const { schemaVersion, freshness, defaultPolicyId, policies } = raw as Record<
    string,
    unknown
  >;

  if (schemaVersion !== CATALOG_SCHEMA_VERSION) {
    issues.push({
      file: POLICY_FILE,
      path: "schemaVersion",
      message: `schemaVersion must be ${CATALOG_SCHEMA_VERSION}`,
    });
  }

  if (
    !isPlainObject(freshness) ||
    typeof freshness.staleAfterDays !== "number" ||
    !Number.isInteger(freshness.staleAfterDays) ||
    freshness.staleAfterDays <= 0
  ) {
    issues.push({
      file: POLICY_FILE,
      path: "freshness.staleAfterDays",
      message: "staleAfterDays must be a positive integer",
    });
  }

  if (!isNonEmptyString(defaultPolicyId)) {
    issues.push({
      file: POLICY_FILE,
      path: "defaultPolicyId",
      message: "defaultPolicyId must be a non-empty string",
    });
  }

  if (!Array.isArray(policies) || policies.length === 0) {
    issues.push({
      file: POLICY_FILE,
      path: "policies",
      message: "policies must be a non-empty array",
    });
  }

  const validatedPolicies: PricingPolicy[] = [];
  if (Array.isArray(policies)) {
    policies.forEach((entry, index) => {
      const path = `policies[${index}]`;
      if (!isPlainObject(entry)) {
        issues.push({
          file: POLICY_FILE,
          path,
          message: "policy must be an object",
        });
        return;
      }
      const { id, label, fixedMarginCop, percentageMargin, confirmed, note } =
        entry as Record<string, unknown>;

      if (!isNonEmptyString(id)) {
        issues.push({
          file: POLICY_FILE,
          path: `${path}.id`,
          message: "id must be a non-empty string",
        });
        return;
      }
      if (!isNonEmptyString(label)) {
        issues.push({
          file: POLICY_FILE,
          path: `${path}.label`,
          message: "label must be a non-empty string",
        });
        return;
      }

      const fixed =
        fixedMarginCop === undefined
          ? 0
          : typeof fixedMarginCop === "number" &&
              Number.isInteger(fixedMarginCop) &&
              fixedMarginCop >= 0
            ? fixedMarginCop
            : null;
      if (fixed === null) {
        issues.push({
          file: POLICY_FILE,
          path: `${path}.fixedMarginCop`,
          message: "fixedMarginCop must be a non-negative integer",
        });
        return;
      }

      const pct =
        percentageMargin === undefined
          ? 0
          : typeof percentageMargin === "number" &&
              Number.isFinite(percentageMargin) &&
              percentageMargin >= 0 &&
              Math.round(percentageMargin * 100) === percentageMargin * 100
            ? percentageMargin
            : null;
      if (pct === null) {
        issues.push({
          file: POLICY_FILE,
          path: `${path}.percentageMargin`,
          message:
            "percentageMargin must be a non-negative number with at most two decimals",
        });
        return;
      }

      if (typeof confirmed !== "boolean") {
        issues.push({
          file: POLICY_FILE,
          path: `${path}.confirmed`,
          message: "confirmed must be a boolean",
        });
        return;
      }

      validatedPolicies.push({
        id,
        label,
        fixedMarginCop: fixed,
        percentageMargin: pct,
        confirmed,
        note: isString(note) ? note : undefined,
      });
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      freshness: {
        staleAfterDays: (freshness as { staleAfterDays: number })
          .staleAfterDays,
      },
      defaultPolicyId: defaultPolicyId as string,
      policies: validatedPolicies,
    },
  };
}

/**
 * Top-level validator. Runs every per-document validator and the cross-
 * document checks (schemaVersion agreement, dangling references, etc.).
 */
export function validateCatalog(
  input: RawCatalogInput | Record<string, unknown>,
): ValidationResult<Catalog> {
  const issues: CatalogIssue[] = [];

  const raw = input as Record<string, unknown>;
  const { components, services, prebuilds, policy } = raw;

  const schemaVersion = raw.schemaVersion;
  if (schemaVersion !== CATALOG_SCHEMA_VERSION) {
    issues.push({
      file: COMPONENTS_FILE,
      path: ".schemaVersion",
      message: `schemaVersion must be ${CATALOG_SCHEMA_VERSION}`,
    });
  }

  if (!Array.isArray(components)) {
    issues.push({
      file: COMPONENTS_FILE,
      path: "components",
      message: "components must be an array",
    });
  }
  if (!Array.isArray(services)) {
    issues.push({
      file: SERVICES_FILE,
      path: "services",
      message: "services must be an array",
    });
  }
  if (!Array.isArray(prebuilds)) {
    issues.push({
      file: PREBUILDS_FILE,
      path: "prebuilds",
      message: "prebuilds must be an array",
    });
  }

  const compRes = Array.isArray(components)
    ? validateCatalogComponents(components as readonly unknown[])
    : undefined;
  const servRes = Array.isArray(services)
    ? validateCatalogServices(services as readonly unknown[])
    : undefined;
  const preRes = Array.isArray(prebuilds)
    ? validateCatalogPrebuilds(prebuilds as readonly unknown[])
    : undefined;
  const polRes = validatePricingPolicy(policy);

  if (compRes && !compRes.ok) issues.push(...compRes.issues);
  if (servRes && !servRes.ok) issues.push(...servRes.issues);
  if (preRes && !preRes.ok) issues.push(...preRes.issues);
  if (!polRes.ok) issues.push(...polRes.issues);

  if (
    !compRes ||
    !servRes ||
    !preRes ||
    !compRes.ok ||
    !servRes.ok ||
    !preRes.ok ||
    !polRes.ok
  ) {
    return { ok: false, issues };
  }

  // Cross-document checks.
  const componentIds = new Set(compRes.value.map((c) => c.id));
  const serviceIds = new Set(servRes.value.map((s) => s.id));
  const policyIds = new Set(polRes.value.policies.map((p) => p.id));

  preRes.value.forEach((prebuild, preIndex) => {
    for (const cid of prebuild.componentIds) {
      if (!componentIds.has(cid)) {
        issues.push({
          file: PREBUILDS_FILE,
          path: `prebuilds[${preIndex}].componentIds`,
          message: `unknown componentId: ${cid}`,
        });
      }
    }
    if (!serviceIds.has(prebuild.serviceId)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `prebuilds[${preIndex}].serviceId`,
        message: `unknown serviceId: ${prebuild.serviceId}`,
      });
    }
    if (!policyIds.has(prebuild.pricingPolicyId)) {
      issues.push({
        file: PREBUILDS_FILE,
        path: `prebuilds[${preIndex}].pricingPolicyId`,
        message: `unknown pricingPolicyId: ${prebuild.pricingPolicyId}`,
      });
    }
  });

  if (!policyIds.has(polRes.value.defaultPolicyId)) {
    issues.push({
      file: POLICY_FILE,
      path: "defaultPolicyId",
      message: `unknown defaultPolicyId: ${polRes.value.defaultPolicyId}`,
    });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // Build the immutable catalog.
  const byComponentId = new Map<string, CatalogComponent>();
  for (const c of compRes.value) byComponentId.set(c.id, c);
  const byServiceId = new Map<string, CatalogService>();
  for (const s of servRes.value) byServiceId.set(s.id, s);
  const byPolicyId = new Map<string, PricingPolicy>();
  for (const p of polRes.value.policies) byPolicyId.set(p.id, p);
  const byPrebuildSlug = new Map<string, CatalogPrebuild>();
  for (const p of preRes.value) byPrebuildSlug.set(p.slug, p);

  return {
    ok: true,
    value: {
      schemaVersion: CATALOG_SCHEMA_VERSION,
      components: Object.freeze(compRes.value) as readonly CatalogComponent[],
      services: Object.freeze(servRes.value) as readonly CatalogService[],
      prebuilds: Object.freeze(preRes.value) as readonly CatalogPrebuild[],
      policies: Object.freeze(
        polRes.value.policies,
      ) as readonly PricingPolicy[],
      defaultPolicyId: polRes.value.defaultPolicyId,
      staleAfterDays: polRes.value.freshness.staleAfterDays,
      byComponentId,
      byServiceId,
      byPolicyId,
      byPrebuildSlug,
    },
  };
}

// Re-export the Currency type for adapter consumers.
export type { Currency };
