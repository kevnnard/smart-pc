import { parseAsString, useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { JSX } from "react";

function ProductSortSelectInner(): JSX.Element {
  const [sort, setSort] = useQueryState(
    "orden",
    parseAsString.withDefault("relevance"),
  );

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Ordenar:
      </span>
      <select
        value={sort}
        onChange={(e) =>
          setSort(e.target.value === "relevance" ? null : e.target.value)
        }
        aria-label="Ordenar productos"
        className="rounded-lg border border-border bg-navy-900 px-3 py-1.5 text-xs font-medium text-text-primary hover:border-cyan-500/40 focus:border-cyan-400 focus:outline-none cursor-pointer shadow-sm"
      >
        <option value="relevance">Relevancia</option>
        <option value="price-asc">Precio: Menor a Mayor</option>
        <option value="price-desc">Precio: Mayor a Menor</option>
        <option value="brand-asc">Nombre / Marca (A-Z)</option>
      </select>
    </div>
  );
}

export default function ProductSortSelect(): JSX.Element {
  return (
    <NuqsAdapter>
      <ProductSortSelectInner />
    </NuqsAdapter>
  );
}
