import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react";
import { type JSX, useEffect, useMemo } from "react";
import type { PriceStatus, StockStatus } from "../../lib/catalog/catalog-types";
import {
  ALL_CATEGORIES_FILTER,
  filterByBrand,
  filterByCategory,
  filterByCondition,
  filterByPriceStatus,
  filterBySearch,
  filterByStock,
  type ProductViewModel,
} from "../../lib/products/catalog-view-model";
import {
  categoryPluralLabel,
  STOCK_STATUS_ORDER,
  stockStatusLabel,
} from "../../lib/products/stock-labels";

interface Props {
  /** Serialized catalog view models (one per catalog component). */
  readonly products: readonly ProductViewModel[];
}

const PRICE_STATUSES: readonly PriceStatus[] = [
  "verified",
  "provisional",
  "unconfirmed",
];
const PRICE_STATUS_LABEL: Readonly<Record<PriceStatus, string>> = {
  verified: "Confirmado",
  provisional: "Provisional",
  unconfirmed: "No confirmado",
};

export type SortOption = "relevance" | "price-asc" | "price-desc" | "brand-asc";

function uniqueCategories(
  products: readonly ProductViewModel[],
): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of products) {
    if (seen.has(p.categoryId)) continue;
    seen.add(p.categoryId);
    out.push(p.categoryId);
  }
  return out;
}

function uniqueBrands(
  products: readonly ProductViewModel[],
): readonly string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of products) {
    const b = (p.brand || "").trim();
    if (!b || seen.has(b.toLowerCase())) continue;
    seen.add(b.toLowerCase());
    out.push(b);
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function ProductFiltersInner({ products }: Props): JSX.Element {
  const categories = useMemo(() => uniqueCategories(products), [products]);
  const allBrands = useMemo(() => uniqueBrands(products), [products]);

  // ALL filters bound to URL via nuqs:
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));
  const [category, setCategory] = useQueryState(
    "categoria",
    parseAsString.withDefault(ALL_CATEGORIES_FILTER),
  );
  const [brandsParam, setBrandsParam] = useQueryState(
    "marcas",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [condition, setCondition] = useQueryState(
    "condicion",
    parseAsString.withDefault("all"),
  );
  const [sort, setSort] = useQueryState(
    "orden",
    parseAsString.withDefault("relevance"),
  );

  // Price status and Stock status: default is EMPTY (meaning no restriction / all allowed)
  const [priceParam, setPriceParam] = useQueryState(
    "precio_estado",
    parseAsArrayOf(parseAsString).withDefault([]),
  );
  const [stockParam, setStockParam] = useQueryState(
    "disponibilidad",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const selectedBrands = useMemo(() => new Set(brandsParam), [brandsParam]);

  // Combined live multi-filter pipeline:
  // If priceParam is empty -> no filter (all shown). If has items -> filter by those items.
  // If stockParam is empty -> no filter (all shown). If has items -> filter by those items.
  const visibleProducts = useMemo(() => {
    let list = filterBySearch(products, search);
    list = filterByCategory(list, category);
    if (selectedBrands.size > 0) {
      list = filterByBrand(list, [...selectedBrands]);
    }
    list = filterByCondition(list, condition as "all" | "new" | "used");

    if (priceParam.length > 0) {
      list = filterByPriceStatus(list, priceParam as PriceStatus[]);
    }
    if (stockParam.length > 0) {
      list = filterByStock(list, stockParam as StockStatus[]);
    }

    // Sorting
    const sorted = [...list];
    if (sort === "price-asc") {
      sorted.sort(
        (a, b) =>
          (a.referencePriceCop ?? 999999999) -
          (b.referencePriceCop ?? 999999999),
      );
    } else if (sort === "price-desc") {
      sorted.sort(
        (a, b) => (b.referencePriceCop ?? -1) - (a.referencePriceCop ?? -1),
      );
    } else if (sort === "brand-asc") {
      sorted.sort((a, b) =>
        `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`),
      );
    }
    return sorted;
  }, [
    products,
    search,
    category,
    selectedBrands,
    condition,
    priceParam,
    stockParam,
    sort,
  ]);

  const totalCount = products.length;
  const visibleCount = visibleProducts.length;
  const isEmpty = visibleCount === 0;

  // Sync cards in DOM with CSS display + flex/grid order
  useEffect(() => {
    if (typeof document === "undefined") return;
    const visibleIds = new Set(visibleProducts.map((p) => p.id));
    const cards = document.querySelectorAll<HTMLElement>("[data-product-card]");

    cards.forEach((card) => {
      const id = card.getAttribute("data-component-id");
      if (id && visibleIds.has(id)) {
        card.removeAttribute("data-hidden");
        const orderIdx = visibleProducts.findIndex((p) => p.id === id);
        if (orderIdx !== -1) {
          card.style.order = String(orderIdx);
        }
      } else {
        card.setAttribute("data-hidden", "true");
      }
    });
  }, [visibleProducts]);

  // Sync count on page
  useEffect(() => {
    if (typeof document === "undefined") return;
    const counters = document.querySelectorAll<HTMLElement>(
      "[data-product-count]",
    );
    counters.forEach((el) => {
      const previousLabel = (() => {
        const text = el.textContent ?? "";
        const m = text.match(/^(.*?)(\d+)\s+de\s+(\d+)\s+productos/);
        return m?.[1] ?? "";
      })();
      el.textContent = `${previousLabel}${visibleCount} de ${totalCount} productos`;
    });
  }, [visibleCount, totalCount]);

  // Show / hide empty state
  useEffect(() => {
    if (typeof document === "undefined") return;
    const grid = document.querySelector<HTMLElement>("[data-inventory-grid]");
    const empty = document.querySelector<HTMLElement>("[data-empty-state]");
    if (!grid || !empty) return;
    if (isEmpty) {
      grid.style.display = "none";
      empty.style.display = "flex";
      const btn = empty.querySelector<HTMLButtonElement>(
        "[data-clear-filters]",
      );
      if (btn) {
        btn.onclick = () => {
          const url = new URL(window.location.href);
          url.search = "";
          window.history.pushState({}, "", url.toString());
          window.dispatchEvent(new PopStateEvent("popstate"));
        };
      }
    } else {
      grid.style.display = "";
      empty.style.display = "none";
    }
  }, [isEmpty]);

  const stockCounts = useMemo(() => {
    const counts: Record<StockStatus, number> = {
      "in-stock": 0,
      limited: 0,
      "out-of-stock": 0,
      unknown: 0,
    };
    let pool = filterBySearch(products, search);
    pool = filterByCategory(pool, category);
    if (selectedBrands.size > 0) {
      pool = filterByBrand(pool, [...selectedBrands]);
    }
    pool = filterByCondition(pool, condition as "all" | "new" | "used");
    if (priceParam.length > 0) {
      pool = filterByPriceStatus(pool, priceParam as PriceStatus[]);
    }
    for (const p of pool) counts[p.stockStatus] += 1;
    return counts;
  }, [products, search, category, selectedBrands, condition, priceParam]);

  const priceCounts = useMemo(() => {
    const counts: Record<PriceStatus, number> = {
      verified: 0,
      provisional: 0,
      unconfirmed: 0,
    };
    let pool = filterBySearch(products, search);
    pool = filterByCategory(pool, category);
    if (selectedBrands.size > 0) {
      pool = filterByBrand(pool, [...selectedBrands]);
    }
    pool = filterByCondition(pool, condition as "all" | "new" | "used");
    if (stockParam.length > 0) {
      pool = filterByStock(pool, stockParam as StockStatus[]);
    }
    for (const p of pool) counts[p.priceStatus] += 1;
    return counts;
  }, [products, search, category, selectedBrands, condition, stockParam]);

  function toggleStock(status: StockStatus): void {
    const current = new Set(stockParam);
    if (current.has(status)) current.delete(status);
    else current.add(status);
    const arr = [...current];
    setStockParam(arr.length > 0 ? arr : null);
  }

  function togglePrice(status: PriceStatus): void {
    const current = new Set(priceParam);
    if (current.has(status)) current.delete(status);
    else current.add(status);
    const arr = [...current];
    setPriceParam(arr.length > 0 ? arr : null);
  }

  function toggleBrand(brand: string): void {
    const next = new Set(selectedBrands);
    if (next.has(brand)) next.delete(brand);
    else next.add(brand);
    const arr = [...next];
    setBrandsParam(arr.length > 0 ? arr : null);
  }

  function resetAllFilters(): void {
    setSearch(null);
    setCategory(null);
    setBrandsParam(null);
    setCondition(null);
    setSort(null);
    setPriceParam(null);
    setStockParam(null);
  }

  const isFiltered =
    search !== "" ||
    category !== ALL_CATEGORIES_FILTER ||
    selectedBrands.size > 0 ||
    condition !== "all" ||
    sort !== "relevance" ||
    priceParam.length > 0 ||
    stockParam.length > 0;

  return (
    <div className="flex flex-col gap-6" data-filter-controller>
      {/* Header bar of filters */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-400">
            Filtros
          </span>
          <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[11px] font-mono text-text-muted border border-border">
            {visibleCount}
          </span>
        </div>
        {isFiltered && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Categoría */}
      <div className="space-y-2.5">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Categoría
        </h4>
        <div
          role="group"
          aria-label="Categoría"
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === ALL_CATEGORIES_FILTER}
            className={[
              "rounded-lg px-3 py-1 text-xs font-medium transition-all duration-150 border cursor-pointer",
              category === ALL_CATEGORIES_FILTER
                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold shadow-sm shadow-cyan-500/10"
                : "bg-navy-900/90 border-border text-text-secondary hover:border-cyan-500/40 hover:text-text-primary hover:bg-navy-800",
            ].join(" ")}
          >
            Todos
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() =>
                setCategory(c === ALL_CATEGORIES_FILTER ? null : c)
              }
              aria-pressed={category === c}
              className={[
                "rounded-lg px-3 py-1 text-xs font-medium transition-all duration-150 border cursor-pointer",
                category === c
                  ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold shadow-sm shadow-cyan-500/10"
                  : "bg-navy-900/90 border-border text-text-secondary hover:border-cyan-500/40 hover:text-text-primary hover:bg-navy-800",
              ].join(" ")}
            >
              {categoryPluralLabel(c)}
            </button>
          ))}
        </div>
      </div>

      {/* Condición (Nuevo / Usado) */}
      <div className="space-y-2.5">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Condición
        </h4>
        <div
          role="group"
          aria-label="Condición del componente"
          className="grid grid-cols-3 gap-1.5"
        >
          <button
            type="button"
            onClick={() => setCondition(null)}
            aria-pressed={condition === "all"}
            className={[
              "rounded-lg py-1.5 px-2 text-center text-xs font-medium transition-all border cursor-pointer",
              condition === "all"
                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold"
                : "bg-navy-900 border-border text-text-secondary hover:border-border/80 hover:text-text-primary",
            ].join(" ")}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setCondition("new")}
            aria-pressed={condition === "new"}
            className={[
              "rounded-lg py-1.5 px-2 text-center text-xs font-medium transition-all border cursor-pointer",
              condition === "new"
                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold"
                : "bg-navy-900 border-border text-text-secondary hover:border-border/80 hover:text-text-primary",
            ].join(" ")}
          >
            Nuevo
          </button>
          <button
            type="button"
            onClick={() => setCondition("used")}
            aria-pressed={condition === "used"}
            className={[
              "rounded-lg py-1.5 px-2 text-center text-xs font-medium transition-all border cursor-pointer",
              condition === "used"
                ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-bold"
                : "bg-navy-900 border-border text-text-secondary hover:border-border/80 hover:text-text-primary",
            ].join(" ")}
          >
            Usado
          </button>
        </div>
      </div>

      {/* Marcas */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Marcas
          </h4>
          {selectedBrands.size > 0 && (
            <button
              type="button"
              onClick={() => setBrandsParam(null)}
              className="text-[10px] text-text-muted hover:text-cyan-400 cursor-pointer"
            >
              Borrar ({selectedBrands.size})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-navy-800">
          <button
            type="button"
            onClick={() => setBrandsParam(null)}
            aria-pressed={selectedBrands.size === 0}
            className={[
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all border cursor-pointer",
              selectedBrands.size === 0
                ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold shadow-sm shadow-cyan-500/15"
                : "bg-navy-900/90 border-border/80 text-text-secondary hover:border-cyan-500/40 hover:text-text-primary",
            ].join(" ")}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                selectedBrands.size === 0 ? "bg-cyan-400" : "bg-text-muted/60"
              }`}
              aria-hidden="true"
            />
            <span>Todas</span>
          </button>
          {allBrands.map((b) => {
            const active = selectedBrands.has(b);
            return (
              <button
                key={b}
                type="button"
                onClick={() => toggleBrand(b)}
                aria-pressed={active}
                aria-label={b}
                className={[
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition-all border cursor-pointer",
                  active
                    ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold shadow-sm shadow-cyan-500/15"
                    : "bg-navy-900/90 border-border/80 text-text-secondary hover:border-cyan-500/40 hover:text-text-primary",
                ].join(" ")}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-cyan-400" : "bg-text-muted/60"
                  }`}
                  aria-hidden="true"
                />
                <span>{b}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Estado del Precio */}
      <div className="space-y-2.5">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Estado del Precio
        </h4>
        <div
          role="group"
          aria-label="Estado del precio"
          className="flex flex-col gap-1.5"
        >
          {PRICE_STATUSES.map((status) => {
            const label = PRICE_STATUS_LABEL[status];
            const count = priceCounts[status];
            const active = priceParam.includes(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() => togglePrice(status)}
                aria-pressed={active}
                aria-label={`${label} (${count})`}
                className={[
                  "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-all border cursor-pointer text-left",
                  active
                    ? "bg-cyan-500/10 border-cyan-500/40 text-text-primary"
                    : "bg-navy-900/50 border-border/50 text-text-muted hover:border-border hover:text-text-secondary",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-sm ${
                      status === "verified"
                        ? "bg-cyan-400"
                        : status === "provisional"
                          ? "bg-amber-400"
                          : "bg-text-muted"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </div>
                <span className="font-mono text-[10px] text-text-muted bg-navy-950 px-1.5 py-0.5 rounded border border-border/40">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock / Disponibilidad */}
      <div className="space-y-2.5">
        <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
          Disponibilidad
        </h4>
        <div
          role="group"
          aria-label="Stock / disponibilidad"
          className="flex flex-col gap-1.5"
        >
          {STOCK_STATUS_ORDER.map((status) => {
            const label = stockStatusLabel(status);
            const count = stockCounts[status];
            const active = stockParam.includes(status);
            const dotClass =
              status === "in-stock"
                ? "bg-green-400"
                : status === "limited"
                  ? "bg-amber-400"
                  : "bg-text-muted";
            return (
              <button
                key={status}
                type="button"
                onClick={() => toggleStock(status)}
                aria-pressed={active}
                aria-label={`${label} (${count})`}
                className={[
                  "flex items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-all border cursor-pointer text-left",
                  active
                    ? "bg-cyan-500/10 border-cyan-500/40 text-text-primary"
                    : "bg-navy-900/50 border-border/50 text-text-muted hover:border-border hover:text-text-secondary",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-sm ${dotClass}`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </div>
                <span className="font-mono text-[10px] text-text-muted bg-navy-950 px-1.5 py-0.5 rounded border border-border/40">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accessible empty state */}
      {isEmpty && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-400 leading-relaxed"
        >
          No encontramos componentes con esos criterios. Probá ampliando las
          marcas o limpiando los filtros.
        </div>
      )}
    </div>
  );
}

export default function ProductFilters(props: Props): JSX.Element {
  return (
    <NuqsAdapter>
      <ProductFiltersInner {...props} />
    </NuqsAdapter>
  );
}
