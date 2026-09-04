import { parseAsString, useQueryState } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/react";
import { type JSX } from "react";

const SEARCH_PLACEHOLDER = "Buscar por marca, modelo o categoría…";
const SEARCH_ARIA_LABEL = "Buscar por marca, modelo o categoría";

function ProductSearchInputInner(): JSX.Element {
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  return (
    <div className="relative w-full">
      <label htmlFor="top-product-search" className="sr-only">
        {SEARCH_ARIA_LABEL}
      </label>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted transition-colors group-focus-within:text-cyan-400"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        id="top-product-search"
        type="search"
        inputMode="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={SEARCH_PLACEHOLDER}
        aria-label={SEARCH_ARIA_LABEL}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value || null)}
        className="w-full h-10 rounded-xl border border-border/80 bg-navy-900/90 py-2 pl-10 pr-4 text-xs font-medium text-text-primary placeholder:text-text-muted focus:border-cyan-400 focus:bg-navy-950 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all shadow-sm"
        data-product-search
      />
    </div>
  );
}

export default function ProductSearchInput(): JSX.Element {
  return (
    <NuqsAdapter>
      <ProductSearchInputInner />
    </NuqsAdapter>
  );
}
