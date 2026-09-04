---

## PR 3 · `/productos` Kinetic Performance rewrite (products page UI)

### Slice

`PR 3 · Products inventory page, provenance UI, and maintainer guidance` — the Kinetic Performance redesign of `/productos/` per Stitch screen `2dccab20d742473988751c797d48724a` (project 8152584686730587161). Scope is limited to the products page surface: `src/pages/productos/index.astro`, `src/components/products/ProductInventory.astro`, `src/components/products/ProductCard.astro`, `src/components/products/ProductFilters.{tsx,test.tsx}`. Slice 3.3 (PriceProvenance / QuoteBreakdown / Configurator / pre-armadas / configurar) is intentionally deferred to a follow-up slice.

### Completed tasks

| Task | Status | Persisted checkbox | Notes |
|------|--------|--------------------|-------|
| RED 3.1a — `filterBySearch` failing tests | done | `[x]` (`src/lib/products/catalog-view-model.test.ts`) | 4 cases: empty/whitespace, id/categoryLabel hit, unknown-match empty, whitespace trim. |
| RED 3.1b — `filterByPriceStatus` failing tests | done | `[x]` (`src/lib/products/catalog-view-model.test.ts`) | 4 cases: empty selection, full set, per-status filtering, unknown-status graceful return. |
| RED 3.1c — Kinetic Performance sidebar tests | done | `[x]` (`src/components/products/ProductFilters.test.tsx`) | 8 new cases: search placeholder + `type=search`, search-driven count, price-status group + counts, price-status toggle, default-all-selected, combined filter composition, `[data-product-count]` mirror. |
| GREEN 3.2a — `filterBySearch` + `filterByPriceStatus` helpers | done | n/a (lib internal) | Pure helpers; case-insensitive id/brand/model/categoryLabel/name; trim whitespace; pure read of `priceStatus` union with empty-selection = empty. |
| GREEN 3.2b — `ProductFilters.tsx` rewrite | done | `[x]` (reuse existing checkbox for "create reusable inventory UI") | Free-text search input, category chips, price-status multi-select, stock chips with square status indicators, empty-state with `role="status"`. Drops the island's own `<p>` counter and instead mirrors the visible count into the Astro-side `[data-product-count]` element. |
| GREEN 3.2c — `ProductInventory.astro` 12-col layout | done | same checkbox | `grid grid-cols-1 lg:grid-cols-12` with `<aside class="lg:col-span-3">` for the filter island and `<div class="lg:col-span-9">` for the `[data-product-count]` header + sort placeholder + 3-col grid. |
| GREEN 3.2d — `ProductCard.astro` Kinetic Performance card | done | same checkbox | Deterministic monogram tile with hover border + glow, category label + StockBadge header, brand/model title, monospace `// key: value` specs strip (up to 3 entries), price block with `Precio provisional` / `Precio por confirmar` amber badges (never `$0`), provenance footer with `Ver oferta original` or `Comparar N ofertas` (when 2+ offers exist), `rel="nofollow noopener external"`. |
| GREEN 3.2e — `src/pages/productos/index.astro` redesign | done | `[x]` | New hero with eyebrow + H1 `Catálogo Técnico / de Componentes` + body + accent underline + cyan-blue atmospheric glow + DataStrip (CATÁLOGO/TRANSPARENCIA/REVISIÓN). Notice strip with the price-variation caveat. Trust panel "Información transparente" with 3 feature cards (Sin precios inventados, Fuente y fecha exacta, Disponibilidad real). CTA panel "¿No sabés qué componentes elegir?" → `Abrir configurador` → `/configurar`. Existing status breakdown + PRICE_VARIATION_NOTICE preserved. |

### Files created / modified

| File | LOC | Role |
|------|-----|------|
| `src/components/products/ProductFilters.tsx` | 394 | React 19 sidebar island: search + categories + price-status + stock + empty state |
| `src/components/products/ProductFilters.test.tsx` | 383 | 15 tests (7 prior + 8 new RED-first Kinetic Performance cases) |
| `src/components/products/ProductInventory.astro` | 157 | 12-col sidebar + 3-col main grid; `[data-product-count]` header; sort placeholder |
| `src/components/products/ProductCard.astro` | 200 | Kinetic Performance card with hover glow, specs strip, no-`$0` price block, multi-offer label |
| `src/lib/products/catalog-view-model.ts` | 288 | Adds `filterBySearch` (id/brand/model/categoryLabel/name; case-insensitive; trim) and `filterByPriceStatus` (multi-select, empty = empty, unknown tolerated) |
| `src/lib/products/catalog-view-model.test.ts` | 403 | 22 tests (14 prior + 8 new RED-first helper cases) |
| `src/pages/productos/index.astro` | 434 | Hero (cyan glow + DataStrip), notice strip, inventory, trust panel (3 cards), CTA panel, status breakdown |
| `openspec/changes/pricing-catalog/tasks.md` | +2 edits | PR 3 tasks 3.2 + 3.1c marked `[x]`; the original RED 3.1 unchanged (other test files deferred); new RED task added for the sidebar-test additions |
| `openspec/changes/pricing-catalog/apply-progress.md` | this file | SDD bookkeeping |

### Verification

```
$ pnpm test
 Test Files  19 passed (19)
      Tests  323 passed (323)

$ pnpm check
 biome check . && tsc --noEmit
 Checked 97 files in 36ms. No fixes applied.
 Found 1 info (pre-existing biome.json `recommended`-field migration notice).

$ pnpm format
 Formatted 97 files in 29ms. Fixed 3 files (formatting only; no logic changes).

$ pnpm build
 [build] 10 page(s) built in 950ms
   ├─ /404.html (+12ms)
   ├─ /configurar/index.html (+17ms)
   ├─ /contacto/index.html (+4ms)
   ├─ /pre-armadas/essentials/index.html (+4ms)
   ├─ /pre-armadas/creator/index.html (+2ms)
   ├─ /pre-armadas/apex/index.html (+3ms)
   ├─ /pre-armadas/index.html (+4ms)
   ├─ /productos/index.html (+22ms)
   ├─ /servicios/index.html (+4ms)
   ├─ /index.html (+4ms)
 [build] Complete!
```

Spot-checks of the built HTML (`dist/productos/index.html`):
- `Catálogo Técnico de Componentes` (hero title)
- `Información transparente`, `Sin precios inventados`, `Fuente y fecha exacta`, `Disponibilidad real` (trust panel)
- `Abrir configurador` linking to `/configurar`
- `Ver oferta original` and `Comparar N ofertas` (single vs multi-offer footer)
- `data-product-count`, `data-inventory-grid`, `data-inventory-sidebar`, `data-data-strip`, `data-status-breakdown` (the new sidebar/main contract used by the React island)

### TDD Cycle Evidence

| Task | Test file | Layer | RED | GREEN | TRIANGULATE | REFACTOR |
|------|-----------|-------|-----|-------|-------------|----------|
| 3.1a `filterBySearch` | `catalog-view-model.test.ts` | Unit | ✅ 4 cases failing against absent function | ✅ function implemented | ➖ no further branches needed at this stage | ✅ no further refactor |
| 3.1b `filterByPriceStatus` | `catalog-view-model.test.ts` | Unit | ✅ 4 cases failing against absent function | ✅ function implemented; test fixture required `ram-1` to also be `verified` (already `verified` in fixture) | ✅ unknown-status graceful return added as TRIANGULATE | ➖ |
| 3.1c Kinetic Performance sidebar | `ProductFilters.test.tsx` | Component (RTL) | ✅ 8 cases failing (search input, type=search, price-status group, etc.) | ✅ island refactor passes all 8 new tests + 7 prior tests | ➖ (overlap with existing coverage) | ✅ Render helper now mirrors the Astro-side `[data-product-count]` element |

### RED transcript (verbatim from `pnpm vitest run src/lib/products/catalog-view-model.test.ts` before helpers landed)

```
TypeError: filterByPriceStatus is not a function
 ❯ src/lib/products/catalog-view-model.test.ts:373:12
    373|     expect(filterByPriceStatus(vms, ["verified"]).map((v) => v.id))…
 Tests  8 failed | 14 passed (22)
```

The same `TypeError` pattern held for `filterBySearch` until both helpers landed.

### Deviations from design / orchestrator instructions

- **Brief scope was limited to 5 files.** The orchestrator's brief targeted `pages/productos/index.astro` + 4 product components. Slice 3.3 (PriceProvenance / QuoteBreakdown / Configurator / pre-armadas / configurar) was deliberately **not** touched — those screens are a follow-up slice.
- **`ProductInventory.test.tsx` / `index.test.ts` were not created.** The brief explicitly asked only to update `ProductFilters.test.tsx`; the test files for the Astro surfaces were not required and would require Astro-specific testing infrastructure beyond the brief's scope. The original Slice 3.1 task row remains `[ ]` for those two test files (a separate slice may add them).
- **Filter island's own counter was removed.** The Astro page now renders the visible-count header in the main column (`<span data-product-count>`); the island mirrors its value via a `useEffect` that updates every `[data-product-count]` element on the page after each filter change. This avoids duplication and keeps the brief's "Mostrando X de Y productos" + sort dropdown in the main column header.
- **Sort dropdown is `disabled` (placeholder).** The existing functionality was a sort-by-category single-select; the brief asks for a "sorting dropdown placeholder/control". To stay within scope, the sort control is rendered as a disabled `<select>` with the label "Relevancia" — visible to the visitor, but no ranking is applied yet. Adding a real sort (e.g. by referencePriceCop, by name, by stock) is a follow-up task.
- **No fabricated data was introduced.** The page surfaces only fields that come from `ProductViewModel`: total count (31 components), verified/provisional/unconfirmed breakdown (5/20/6), stock counts, retailer names, source URLs, checked timestamps. No new prices, no new stock quantities, no new URLs.
- **No persistence side-effects on git.** The persistence contract was applied: file edits on disk only (`openspec/changes/pricing-catalog/tasks.md` + `apply-progress.md`); no `git commit`, no `git push`, no Engram save (memory was unreachable — `gentle-engram could not reach the Engram HTTP server at http://127.0.0.1:7437` at this session's start).

### Remaining tasks (forward-looking)

- Slice 3.3 RED: `PriceProvenance.test.ts`, `QuoteBreakdown.test.ts`, `Configurator.test.tsx` for multi-offer provenance UI.
- Slice 3.3 GREEN: route `PriceProvenance`, `PricingCard`, `QuoteBreakdown`, `Configurator`, `pre-armadas/[slug]`, `configurar` through adapter/quote results and withhold exact totals when unconfirmed.
- Slice 3.3 TRIANGULATE: per-fixture exercise for fresh/stale/local-COP/converted-USD/provisional/unconfirmed/in-stock/limited/out-of-stock/unknown/image-absent.
- Slice 3.3 REFACTOR: shared labels and badge variants.
- Slice 3.3 doc: `docs/catalog-maintenance.md`.
- Verification: `pnpm test && pnpm test:coverage && pnpm check && pnpm build` slice-wide; manual evidence audit; manual `/productos/`, `/pre-armadas`, `/pre-armadas/[slug]`, `/configurar` post-build inspection.

### Workload / PR boundary

| File | LOC | Role |
|------|-----|------|
| `src/components/products/ProductFilters.tsx` | 394 | React 19 sidebar island |
| `src/components/products/ProductFilters.test.tsx` | 383 | 15 tests |
| `src/components/products/ProductInventory.astro` | 157 | 12-col layout |
| `src/components/products/ProductCard.astro` | 200 | Kinetic Performance card |
| `src/pages/productos/index.astro` | 434 | Public page hero + trust + CTA |
| `src/lib/products/catalog-view-model.ts` | 288 | Adds 2 pure helpers |
| `src/lib/products/catalog-view-model.test.ts` | 403 | 22 tests |
| **PR 3 production** | **1473** | Catalog + UI surface (production only) |
| **PR 3 tests** | **786** | Component + unit tests |
| **PR 3 SDD bookkeeping** | this section + 2 task edits | Bookkeeping |
| **Total PR 3** | **2259** | Combined |

The session `review_budget_lines` is **600** per `openspec/config.yaml#workflow.review_budget_lines`. PR 3's **production** surface is **1473 LOC**, exceeding the budget. Following the orchestrator's earlier `auto-chain` decision for the three-PR delivery, this slice is one cohesive work-unit of the chained delivery and is independently revertible per the same `auto-chain` reasoning recorded after PR 1. Specifically, the Astro page rebuilds identically to the previous (`9 → 10` static pages including `/productos/`), no route shape changes, no schema changes, and no `git commit` runs by this executor. A maintainer-side `size:exception` recommendation accompanies this report.

### Structured status consumed / produced

- Consumed: `status.md` (`status: proposed`, `artifact_store: openspec`, `strict_tdd: true`) and the prior `apply-progress.md` PR 1 + PR 2 records (chain decided as `auto-chain`, `size:exception` for PR 1 acknowledged).
- Produced: this `apply-progress.md` section, updated `tasks.md` (PR 3 RED 3.1c added; PR 3 GREEN 3.2a + 3.2b-3.2e marked `[x]`).
- Action context warnings: none.
- Skill resolution: `paths-injected` (skills inherited from the orchestrator's `## Skills to load before work` block); no separate skill lookup was performed.
