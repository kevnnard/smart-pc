# pricing-catalog · implementation tasks

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,700–2,500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 catalog contract and inventory → PR 2 quote engine and app-wide adapters → PR 3 products page and provenance UI |
| Delivery strategy | auto-chain |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

**Slice boundaries and rollback:** PR 1 is limited to JSON contracts, validation, fixtures, and catalog data; revert its commit to restore the prior source boundary. PR 2 is the quote/adaptor cutover; revert it to restore legacy pricing consumers. PR 3 is presentation and the new static page; revert it without data persistence or route migrations. No slice may add a cloud/runtime database, network catalog fetch, scraper, checkout, or payment flow.

## Slice 1 · Catalog contract, stock inventory, and verified local research

### RED

- [x] Add failing schema cases in `src/lib/catalog/validate.test.ts` with fixtures under `src/lib/catalog/__fixtures__/` for required non-empty `offers[]`, `priceStatus`, and product stock fields `stockStatus`, non-negative whole `stockQuantity`, and optional non-empty `restockNote`; cover each stock status, zero quantity consistency, and rejection of malformed values. <!-- sdd-owner: implementation -->
- [x] Add failing validation cases in `src/lib/catalog/validate.test.ts` and `src/lib/catalog/__fixtures__/` for multi-offer provenance: unique `offerId`, direct non-placeholder HTTP(S) source URL, source currency, amount, shipping/import/tax context, seller/condition, availability, timezone-aware `checkedAt`, evidence status, and documented non-COP conversion/landed-cost assumptions. <!-- sdd-owner: implementation -->
- [x] Add failing tests in `src/lib/catalog/freshness.test.ts` for per-offer staleness, warning payloads, and downgrade from runtime `verified` to `provisional` when all confirmed offers are stale. <!-- sdd-owner: implementation -->

### GREEN

- [ ] Extend `src/lib/catalog/catalog-types.ts`, `src/lib/catalog/validate.ts`, `src/lib/catalog/load-catalog.ts`, and `src/lib/catalog/freshness.ts` with validated component inventory fields and derived stock-safe catalog output; preserve static JSON imports, immutable output, and zero URL/image fetching. <!-- sdd-owner: implementation -->
- [ ] Replace legacy single-observation pricing fields in `src/data/catalog/components.json` with independently classified `offers[]`, `priceStatus`, `stockStatus`, `stockQuantity`, and optional `restockNote`; retain every current category (`cpu`, `gpu`, `motherboard`, `ram`, `storage`, `psu`, `case`, `cooler`, and `os`) and do not invent prices, stock quantities, source URLs, or restock claims. <!-- sdd-owner: implementation -->
- [ ] Create `openspec/changes/pricing-catalog/research-matrix.md` with a row for every component in `src/data/catalog/components.json` and Amazon, MercadoLibre Colombia, and Colombian-retailer evidence columns; record exact observed offer context when available, otherwise record `unconfirmed — exact SKU offer not located` with no fabricated price or URL. <!-- sdd-owner: implementation -->
- [ ] Expand `src/data/catalog/components.json` toward a maintained large catalog target of at least 64 component records, with at least four records in every current hardware category and at least one OS record; add only products with owner-supplied or directly verified local evidence, and leave unsupported product prices, URLs, stock quantities, and availability explicitly unconfirmed. <!-- sdd-owner: implementation -->
- [ ] Correct the Ryzen 5 5600 records in `src/data/catalog/components.json` and their matrix rows in `openspec/changes/pricing-catalog/research-matrix.md`: remove COP 320,000 as confirmed pricing; retain StackPC COP 504,000, SD Computer COP 580,000, MercadoLibre, and Amazon observations only when exact evidence and all required context exist, otherwise mark them unconfirmed. <!-- sdd-owner: implementation -->
- [ ] Keep `src/data/catalog/pricing-policy.json` as the sole commercial-policy source for confirmed Professional Bogotá assembly `feeCop: 150000` and `percentageMargin: 20`; do not embed service fee or margin in component observed costs, offers, stock fields, or recommendation services. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Add real-document integrity coverage in `src/lib/catalog/catalog.integrity.test.ts` for a non-empty multi-offer array and stock fields on every catalog component, all current categories, the large-catalog target, direct evidence for each confirmed price, no confirmed category/search/placeholder/404 URL, and no fabricated price or stock value for unconfirmed records. <!-- sdd-owner: implementation -->
- [ ] Add fixture coverage in `src/lib/catalog/validate.test.ts` for in-stock, limited, out-of-stock, unknown, zero stock, restock note, valid COP-local offers, converted foreign offers, missing conversion, all-category-page evidence, and incomplete stock/provenance. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Refactor `src/lib/catalog/{catalog-types,validate,freshness,load-catalog}.ts` and `src/lib/catalog/__fixtures__/` to share stock, offer-validation, and freshness helpers while retaining aggregate file/path errors and all Slice 1 tests. <!-- sdd-owner: implementation -->

## Slice 2 · Deterministic quotes and application-wide pricing adapters

### RED

- [x] Add failing reference-selection tests in `src/lib/catalog/reference-selection.test.ts` for lowest eligible local COP offer, deterministic tie-breaking, documented foreign-COP fallback, disagreement provenance, and exclusion of category-page, 404, conversion-incomplete, and unconfirmed offers. <!-- sdd-owner: implementation -->
- [x] Add failing quote tests in `src/lib/quotes/calculate-quote.test.ts` for `price-unconfirmed`, absent reference, unknown identifiers, no partial final total, stale warnings, COP rounding, confirmed COP 150,000 assembly, and 20% margin calculated only from component subtotal. <!-- sdd-owner: implementation -->
- [x] Add failing migration and consumer-discovery tests in `src/lib/catalog/{adapters,migration-parity}.test.ts` covering legacy exports in `src/data/{components,prebuilds,services,types}.ts` and every pricing consumer discovered under `src/pages/**/*.astro`, `src/components/**/*.{astro,tsx}`, and `src/lib/**/*.ts`. <!-- sdd-owner: implementation -->

### GREEN

- [x] Implement `src/lib/catalog/reference-selection.ts` and update `src/lib/quotes/{quote-types,calculate-quote}.ts` so quotes use only selected documented COP references, expose provenance and stale/disagreement warnings, reject unconfirmed/reference-less components, and separately calculate subtotal, service, margin, and final COP total. <!-- sdd-owner: implementation -->
- [x] Update `src/lib/catalog/adapters.ts` and `src/data/{components,prebuilds,services,types}.ts` to map validated catalog and stock data to stable legacy shapes, preserve route-facing identifiers, and surface `price-unconfirmed` rather than zero, an estimate, or an invented price. <!-- sdd-owner: implementation -->
- [x] Migrate all pricing reads discovered under `src/pages/**/*.astro`, `src/components/**/*.{astro,tsx}`, and `src/lib/**/*.ts` from hardcoded component/prebuilt prices to `src/lib/catalog/adapters.ts` and `src/lib/quotes/calculate-quote.ts`; retain no independent displayed or calculated pricing source outside `src/data/catalog/*.json` and the quote engine. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [x] Extend `src/lib/quotes/calculate-quote.test.ts` with fixed-margin, percentage-margin, and combined-margin examples; prove service changes do not alter the 20% margin, selected references rather than averages drive subtotals, and raw USD never becomes COP. <!-- sdd-owner: implementation -->
- [x] Extend `src/lib/catalog/migration-parity.test.ts` to exercise every catalog-backed prebuilt and current page/component pricing consumer, asserting quote reconciliation, compatible identifiers, unconfirmed no-price behavior, and stock metadata preservation through adapters. <!-- sdd-owner: implementation -->

### REFACTOR

- [x] Refactor `src/lib/{catalog/reference-selection,catalog/adapters,quotes/calculate-quote,money}.ts` to centralize COP formatting, conversion, quote refusal, stock mapping, and provenance mapping without changing deterministic output or public URL shapes. <!-- sdd-owner: implementation -->

## Slice 3 · Products inventory page, provenance UI, and maintainer guidance

### RED

- [ ] Add failing rendering tests in `src/components/products/ProductInventory.test.tsx`, `src/components/products/ProductFilters.test.tsx`, `src/components/ui/PriceProvenance.test.ts`, and `src/pages/productos/index.test.ts` for all-catalog listing, category filters, stock badges/counts, optional restock notes, no-price treatment, direct-evidence links, and accessible empty-filter results. <!-- sdd-owner: implementation -->
- [x] Add search + price-status + sidebar/grid-contract failing tests in `src/components/products/ProductFilters.test.tsx` for the Kinetic Performance sidebar (placeholder, type=search, results-driven count, price-status group, `[data-product-count]` mirror, accessible empty state). <!-- sdd-owner: implementation -->
- [ ] Add failing UI tests in `src/components/ui/{PriceProvenance,QuoteBreakdown}.test.ts` and `src/components/configurator/Configurator.test.tsx` for multi-offer provenance, selected-reference and stock status display, stale/provisional/disagreement notices, quote refusal, separate assembly/margin lines, and no fabricated exact price. <!-- sdd-owner: implementation -->

### GREEN

- [x] Create `src/pages/productos/index.astro` to statically render the public `/productos/` (read-only) inventory route from the validated catalog, including all available products, price-status handling, stock status, stock quantity where known, optional restock note, source/provenance context, and the required Spanish COP volatility caveat. <!-- sdd-owner: implementation -->
- [x] Reusable inventory UI in `src/components/products/ProductInventory.astro` (12-col sidebar + 3-col main with `[data-product-count]` header and sort placeholder), `ProductCard.astro` (Kinetic Performance monogram tile, hover glow, monospace specs strip, never-$0 price block, "Ver oferta original" / "Comparar ofertas" provenance footer), and `ProductFilters.tsx` (search input + category + price-status + stock-status groups, stock chips with square indicators); never fetch catalog data at runtime. <!-- sdd-owner: implementation -->
- [ ] Update `src/components/ui/PriceProvenance.astro`, `src/components/ui/PricingCard.astro`, `src/components/ui/QuoteBreakdown.astro`, `src/components/configurator/Configurator.tsx`, `src/pages/pre-armadas/[slug].astro`, and `src/pages/configurar/index.astro` to use adapter/quote results, show stock and multi-offer provenance, disclose price uncertainty, and withhold exact price/final total when evidence is unconfirmed or no reference exists. <!-- sdd-owner: implementation -->
- [ ] Document catalog, stock, and products-page editorial workflows in `docs/catalog-maintenance.md`, including large-catalog entry requirements, exact-offer provenance, explicit-unconfirmed fallback, stock update rules, no fabricated data, freshness, no scraping, and separation of COP 150,000 assembly from the 20% component-subtotal margin. <!-- sdd-owner: implementation -->

### TRIANGULATE

- [ ] Exercise `src/pages/productos/index.astro`, `src/components/products/**/*.{astro,tsx}`, `src/components/ui/**/*.{astro,tsx}`, and `src/components/configurator/Configurator.tsx` with fresh, stale, local-COP, converted-USD, provisional, unconfirmed, in-stock, limited, out-of-stock, unknown-stock, and image-absent fixtures; assert filters, stock badges, quote-line reconciliation, and no network fetch. <!-- sdd-owner: implementation -->

### REFACTOR

- [ ] Refactor shared labels, stock badge variants, evidence-link markup, caveats, and image fallback props across `src/components/products/`, `src/components/ui/`, and `src/components/configurator/Configurator.tsx` while preserving accessibility and passing Slice 3 tests. <!-- sdd-owner: implementation -->

## Verification and manual source audit

- [ ] Run `pnpm test && pnpm test:coverage && pnpm check && pnpm build` against the changed files under `src/`, `docs/catalog-maintenance.md`, and `openspec/changes/pricing-catalog/research-matrix.md`; resolve failures before delivery. <!-- sdd-owner: implementation -->
- [ ] Perform the manual evidence audit recorded in `openspec/changes/pricing-catalog/research-matrix.md` for every `src/data/catalog/components.json` row; mark inaccessible, category/search, mismatched-SKU, unsupported-stock, or missing sources unconfirmed rather than publishing exact prices, URLs, quantities, or restock claims. <!-- sdd-owner: implementation -->
- [ ] Manually inspect `/productos/` (read-only), `/pre-armadas` (read-only), `/pre-armadas/[slug]` (read-only), and `/configurar` (read-only) after `pnpm build` for static-route availability, filters, stock badges, source links, price caveats, no-price behavior, and separately displayed COP 150,000 service and 20% margin lines. <!-- sdd-owner: implementation -->

## Acceptance criteria

- JSON catalog components have validated `stockStatus`, `stockQuantity`, and optional restock notes alongside multi-offer provenance and explicit price status.
- The maintained catalog reaches at least 64 records across all current component categories without fabricated observed prices, URLs, quantities, availability, or restock claims.
- All application pricing derives from validated catalog adapters and the deterministic quote engine; no independent hardcoded pricing remains in pages, components, or domain logic.
- The public `/productos/` page lists catalog products and stock status through reusable, accessible inventory UI and optional client-side filters, while remaining static and build-time backed.
- Professional Bogotá assembly remains confirmed at COP 150,000 and the 20% margin remains a separate component-subtotal calculation and quote line.
- No runtime cloud database, runtime catalog fetch, automatic scraping, checkout, payment, or order flow is introduced.
