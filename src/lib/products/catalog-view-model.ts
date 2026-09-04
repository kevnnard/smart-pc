/**
 * smart-pc · catalog view-model helpers (Slice 3).
 *
 * Pure helpers that turn a `Catalog` (or a single `CatalogComponent`) into
 * the shape consumed by `ProductCard.astro`, `ProductInventory.astro`, and
 * the React filter island. The view-model is the single contract between
 * the catalog domain and the presentation layer; UI files MUST NOT read
 * `CatalogComponent` fields directly so the rendering surface stays
 * stable while the catalog contract evolves.
 *
 * No network. No `Date.now()`. No fabricated prices or stock values. When
 * the catalog has no exact-SKU evidence for a component, the view model
 * exposes `hasExactPrice: false` and `referencePriceCop: undefined` so
 * the UI can render "Precio por confirmar" instead of a guessed figure.
 *
 * Reference: design.md §9 (freshness / provenance / image policy) and
 * the catalog inventory surface from the Slice 3 brief.
 */
import type {
  Catalog,
  CatalogComponent,
  Offer,
  PriceStatus,
  StockStatus,
} from "../catalog/catalog-types";

import { selectReference } from "../catalog/reference-selection";
import { categoryLabel } from "./stock-labels";

/**
 * Serializable view model for a single product on the `/productos/` page.
 * Consumed by `ProductCard.astro` and by the React filter island (after
 * JSON serialization). Every field is JSON-safe; no functions, no DOM
 * refs, no `Date` instances.
 */
export interface ProductViewModel {
  /** Catalog component id; also used as the `data-component-id` attribute. */
  readonly id: string;
  /** Catalog category id (`cpu`, `gpu`, …); the filter island uses this. */
  readonly categoryId: string;
  /** Spanish (Colombia) category label for display. */
  readonly categoryLabel: string;
  readonly brand: string;
  readonly model: string;
  /** Derived name when JSON omits it. */
  readonly name: string;
  readonly specs: Readonly<Record<string, string>>;
  readonly notes?: string;
  /** Product-level price classification. */
  readonly priceStatus: PriceStatus;
  /** Convenience booleans for the UI (one per status). */
  readonly isVerified: boolean;
  readonly isProvisional: boolean;
  readonly isUnconfirmed: boolean;
  /**
   * True only when the component has a confirmed-COP or documented
   * foreign-COP reference offer. UI surfaces use this to decide whether
   * to render a COP number or the "Precio por confirmar" placeholder.
   */
  readonly hasExactPrice: boolean;
  /** True only for `priceStatus === "verified"`. */
  readonly hasVerifiedPrice: boolean;
  /** Whole-COP reference price from the deterministic selector; undefined for unconfirmed. */
  readonly referencePriceCop?: number;
  /** Selected offer id from the reference selector; undefined for unconfirmed. */
  readonly selectedOfferId?: string;
  readonly selectedRetailer?: string;
  readonly selectedSourceUrl?: string;
  readonly selectedCheckedAt?: string;
  /**
   * True when the chosen offer was a non-COP offer normalized via
   * documented conversion. UI surfaces this as a "USD convertido" badge.
   */
  readonly convertedFromForeignCurrency?: boolean;
  /** Every offer, including non-confirmed ones, for the multi-offer provenance block. */
  readonly offers: readonly Offer[];
  /** True when there are 2+ offers so the UI can show a "Ver más" disclosure. */
  readonly hasMultipleOffers: boolean;
  readonly stockStatus: StockStatus;
  /** `null` when the quantity is unknown (validator-permitted). */
  readonly stockQuantity: number | null;
  readonly restockNote?: string;
  /** Catalog never carries image URLs; the helper always returns `false`. */
  readonly hasImage: boolean;
  readonly imageUrl?: string;
}

/**
 * True when the price status allows rendering an exact customer price.
 * Verified and provisional both qualify; unconfirmed never does.
 */
export function hasVisiblePrice(priceStatus: PriceStatus): boolean {
  return priceStatus === "verified" || priceStatus === "provisional";
}

/**
 * Build a `ProductViewModel` from a validated catalog component.
 *
 * The view-model never invents a price. When `selectReference(component)`
 * returns `undefined` (the unconfirmed branch), every selected-* field is
 * omitted so a UI consumer cannot accidentally render `formatCop(undefined)`.
 */
export function buildProductViewModel(c: CatalogComponent): ProductViewModel {
  const reference = selectReference(c);
  const visible = hasVisiblePrice(c.priceStatus);
  // Per the spec: a component is "exact" only when the reference selector
  // produces a candidate. A `provisional` component with no confirmed-COP /
  // documented-foreign-COP offer falls through to `unconfirmed` behaviour.
  const exact = visible && reference !== undefined;

  const offersForVm = c.offers;

  return {
    id: c.id,
    categoryId: c.category,
    categoryLabel: categoryLabel(c.category),
    brand: c.brand,
    model: c.model,
    name: c.name,
    specs: c.specs,
    notes: c.notes,
    priceStatus: c.priceStatus,
    isVerified: c.priceStatus === "verified",
    isProvisional: c.priceStatus === "provisional",
    isUnconfirmed: c.priceStatus === "unconfirmed",
    hasExactPrice: exact,
    hasVerifiedPrice: c.priceStatus === "verified",
    ...(reference
      ? {
          referencePriceCop: reference.referencePriceCop,
          selectedOfferId: reference.offerId,
          selectedRetailer: reference.retailer,
          selectedSourceUrl: reference.sourceUrl,
          selectedCheckedAt: reference.checkedAt,
          convertedFromForeignCurrency: reference.convertedFromForeignCurrency,
        }
      : {}),
    offers: offersForVm,
    hasMultipleOffers: offersForVm.length > 1,
    stockStatus: c.stockStatus,
    stockQuantity: c.stockQuantity,
    ...(c.restockNote !== undefined ? { restockNote: c.restockNote } : {}),
    hasImage: c.imageUrl !== undefined && c.imageUrl !== "",
    ...(c.imageUrl !== undefined && c.imageUrl !== ""
      ? { imageUrl: c.imageUrl }
      : {}),
  };
}

/**
 * Map every component in the catalog to a view model, preserving catalog order.
 * The order is the same order the catalog JSON defines, which is also the
 * order the inventory page renders cards in (the filter island reorders only
 * after the user picks a sort criterion).
 */
export function productViewModelsForCatalog(
  catalog: Catalog,
): readonly ProductViewModel[] {
  return catalog.components.map(buildProductViewModel);
}

/**
 * Free-text search across id, brand, model, and Spanish category label.
 *
 * Behaviour contract (see `ProductFilters` tests in `src/components/products/
 * ProductFilters.test.tsx`):
 *   - Empty / whitespace-only query returns the input untouched.
 *   - Surrounding whitespace is trimmed before matching.
 *   - Comparison is case-insensitive across every searchable field.
 *   - Substring match: a query of "ryzen" matches "AMD Ryzen 5 5600".
 *   - A query that matches no product returns an empty array.
 *
 * Pure. No network. No `Date.now()`. The sidebar renderer owns all UI;
 * this function never produces React/JSX, only a `readonly` array.
 */
export function filterBySearch(
  items: readonly ProductViewModel[],
  query: string,
): readonly ProductViewModel[] {
  const trimmed = query.trim();
  if (trimmed === "") return items;
  const needle = trimmed.toLowerCase();
  return items.filter((item) => {
    if (item.id.toLowerCase().includes(needle)) return true;
    if (item.brand.toLowerCase().includes(needle)) return true;
    if (item.model.toLowerCase().includes(needle)) return true;
    if (item.categoryLabel.toLowerCase().includes(needle)) return true;
    if (item.name.toLowerCase().includes(needle)) return true;
    return false;
  });
}

/**
 * Filter view models by product-level `priceStatus` selection. The sidebar
 * exposes three buttons (Confirmado / Provisional / No confirmado), each
 * acting as a toggle so the resulting set can grow or shrink as the visitor
 * adds or removes statuses.
 *
 * Empty selection = "show no products" (matches the stock-filter convention
 * used by `filterByStock`: an empty set means the visitor intentionally
 * deselected every option).
 *
 * Unknown / typo statuses are silently ignored: a string that is not a real
 * `PriceStatus` does not match any product. The function never throws.
 */
export function filterByPriceStatus(
  items: readonly ProductViewModel[],
  priceStatuses: readonly PriceStatus[],
): readonly ProductViewModel[] {
  const allowed: ReadonlySet<PriceStatus> = new Set([
    "verified",
    "provisional",
    "unconfirmed",
  ]);
  const set = new Set<PriceStatus>(
    priceStatuses.filter((s): s is PriceStatus => allowed.has(s)),
  );
  if (set.size === 0) return [];
  return items.filter((item) => set.has(item.priceStatus));
}

/**
 * Sentinel filter id meaning "no category filter — show every category".
 * The filter island uses it as the default state of the category chip group.
 */
export const ALL_CATEGORIES_FILTER = "all";

/**
 * Filter view models by a single category id. The sentinel
 * `ALL_CATEGORIES_FILTER` returns the input untouched (preserving order).
 * Unknown category ids return an empty array (nothing matches).
 */
export function filterByCategory(
  items: readonly ProductViewModel[],
  categoryId: string,
): readonly ProductViewModel[] {
  if (categoryId === ALL_CATEGORIES_FILTER) return items;
  return items.filter((item) => item.categoryId === categoryId);
}

/**
 * Filter view models by a set of stock statuses. An empty filter set means
 * "no stock matches — show nothing" (the user has explicitly deselected every
 * available chip). A filter set that contains every status returns the input
 * unchanged ("all stock matches").
 */
export function filterByStock(
  items: readonly ProductViewModel[],
  stockStatuses: readonly StockStatus[],
): readonly ProductViewModel[] {
  const set = new Set<StockStatus>(stockStatuses);
  if (set.size === 0) return [];
  if (set.size >= 4) return items;
  return items.filter((item) => set.has(item.stockStatus));
}

/**
 * Group view models by category, preserving first-seen order. The result is
 * a flat list of `{ categoryId, categoryLabel, items }` records ready to be
 * rendered as section headings plus grids.
 */
export interface CategoryGroup {
  readonly categoryId: string;
  readonly categoryLabel: string;
  readonly items: readonly ProductViewModel[];
}

export function groupByCategory(
  items: readonly ProductViewModel[],
): readonly CategoryGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, ProductViewModel[]>();
  for (const item of items) {
    if (!buckets.has(item.categoryId)) {
      buckets.set(item.categoryId, []);
      order.push(item.categoryId);
    }
    buckets.get(item.categoryId)?.push(item);
  }
  return order.map((categoryId) => {
    const groupItems = buckets.get(categoryId) ?? [];
    return {
      categoryId,
      categoryLabel: categoryLabel(categoryId),
      items: groupItems,
    };
  });
}

/**
 * Filter view models by brand name (case-insensitive substring or exact match).
 * An empty array means 'all brands match'.
 */
export function filterByBrand(
  items: readonly ProductViewModel[],
  brands: readonly string[],
): readonly ProductViewModel[] {
  if (brands.length === 0) return items;
  const brandSet = new Set(brands.map((b) => b.toLowerCase().trim()));
  return items.filter((item) => brandSet.has(item.brand.toLowerCase().trim()));
}

/**
 * Filter view models by item condition ('new' | 'used').
 * Items with offers matching the condition are kept.
 */
export function filterByCondition(
  items: readonly ProductViewModel[],
  condition: "all" | "new" | "used",
): readonly ProductViewModel[] {
  if (condition === "all") return items;
  return items.filter((item) => {
    return item.offers.some((o) => {
      const c = (o.sellerCondition || "").toLowerCase();
      if (condition === "used")
        return c.includes("used") || c.includes("usado");
      return !c.includes("used") && !c.includes("usado");
    });
  });
}
