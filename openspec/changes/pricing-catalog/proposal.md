# pricing-catalog · proposal

## Intent

Create a local, Git-editable product catalog for Colombian PC components and assembly services, so the static Astro site can produce traceable, transparent quotes based only on verified product-level offer evidence. Each quote will separately disclose observed component cost, selected service fee, the confirmed COP 150,000 assembly fee where selected, the confirmed 20% business margin calculated from the component subtotal, and final customer price rather than embedding margin in a component price.

## Why now

PC part prices in Colombia vary materially by seller, stock, warranty, shipping, taxes, and date. The current hardcoded catalog cannot preserve a reliable source, verification date, or a clear explanation of how a customer-facing quote was formed. A maintained local catalog gives the owner a simple editorial workflow while retaining static-site deployment.

## Scope

- Replace pricing-source hardcoded catalog records with local JSON files tracked in Git and loaded at Astro build time.
- Use JSON rather than SQLite: the application is pure static SSG with no server runtime, concurrent writes, query workload, or local database deployment need. JSON is human-reviewable in pull requests and fits the small, curated catalog; SQLite would add unnecessary binary-file and build/runtime handling complexity.
- Require every component to retain multiple offer observations where available, using exact product or listing URLs from Amazon, MercadoLibre, or Colombian retailers; never use a search-result or category page as exact-SKU evidence.
- Require each offer observation to record its source URL, source currency, listed amount, shipping/import/tax notes, seller and condition, availability, and ISO-8601 checked timestamp. Record a normalized COP reference only when its conversion and landed-cost assumptions are explicit.
- Require each component to have an explicit `verified` or `unconfirmed` evidence status. A component with only a category/listing result, incomplete evidence, or no evidence is `unconfirmed` and must not publish an exact price; missing evidence must never be replaced with an estimate.
- Support optional `imageUrl` metadata. Images remain externally hosted and are not asserted to be owned, available, or permanent.
- Seed and curate initial records from supplied Colombian source evidence, retaining exact offer links and complete observed-price context. The prior unsupported COP 320,000 Ryzen 5 5600 observation must not be retained as a confirmed price; owner-reported Amazon offers around COP 510,000–550,000 remain observations until recorded with exact listing evidence and applicable landed-cost assumptions.
- Calculate `finalCustomerPriceCop` only from confirmed component observed-cost references, selected assembly/service fee, a confirmed 20% margin on the component subtotal, and the resulting final customer price.
- Keep component observed cost distinct from business margin in persisted data, calculation outputs, and customer-facing quote line items.
- Define the confirmed Professional Bogotá assembly service at COP 150,000 fixed, including assembly, cable management, testing, and initial support.
- Retain Basic assembly (COP 30,000–80,000) and retailer promotional assembly evidence (free or approximately COP 11,490 with qualifying parts purchase) as observations rather than default commercial policy.
- Validate JSON catalog and pricing-rule data during the build/test workflow, then migrate existing TypeScript consumers to validated typed loaders without adding a runtime API or database.
- Display that research values are observations, not guarantees, with the marketplace caveat that seller, stock, warranty, shipping, taxes, and date can change the actual price. Explicitly explain that exact Amazon, MercadoLibre, and Colombian-retail prices can differ because Amazon offers may be USD and imported while local offers can carry different shipping, tax, and warranty conditions.

## Affected areas

- `src/data/`: catalog source-of-truth files and existing typed catalog exports.
- Build-time catalog loader and validation boundary.
- Pure quote calculation domain logic for prebuilt and configured PCs.
- Catalog, configurator, and quote display surfaces that present price provenance, quote breakdown, and price-volatility messaging.
- Tests and maintainer documentation for safe catalog updates.

The existing Stitch screen remains the visual design source; this change adapts its relevant catalog/configurator quote surfaces and does not introduce a new visual system.

## Out of scope

- Cloud database, SQLite, CMS, remote admin, authentication, or server-side catalog editing.
- Live supplier integration, scraping, automatic refresh jobs, price polling, or price guarantees.
- Checkout, payment, order fulfillment, tax calculation, or shipping calculation.
- Hosting, downloading, or validating external image assets.
- Changing public routes, slug patterns, or the site’s static-output model.

## Acceptance criteria

1. Catalog and service records are stored in locally tracked JSON and consumed only at build time; no SQLite, runtime database, external catalog API, or cloud persistence is introduced.
2. Every confirmed component price is supported by one or more exact product/listing offer URLs, with multiple offer observations retained where available; search-result and category pages are never accepted as exact-SKU evidence.
3. Each offer observation validates source currency, listed amount, shipping/import/tax notes, seller, condition, availability, exact source URL, and timezone-aware ISO-8601 checked timestamp. A normalized COP reference is present only when documented conversion and landed-cost assumptions make it reproducible.
4. Each component explicitly validates as `verified` or `unconfirmed`. An unconfirmed component has no published exact price and cannot contribute an exact price to a quote; missing evidence produces no confirmed price and never a fabricated estimate or URL.
5. A maintainer can update offer evidence, verified/unconfirmed status, explicit COP-normalization assumptions, optional image URL, service fee, or margin configuration by editing catalog/pricing JSON without modifying quote-calculation code.
6. Quote calculation deterministically exposes confirmed component observed-cost subtotal, selected service fee, the 20% component-subtotal margin amount in COP, and final customer price in COP.
7. Margin is never silently embedded in a component’s observed cost, and quote rendering presents component cost, service, margin, and final total as separate line items.
8. The Professional Bogotá assembly service is a confirmed fixed COP 150,000 fee that includes assembly, cable management, testing, and initial support; Basic and retailer promotional values remain observations rather than default commercial policy.
9. Catalog and quote UI explain that research values are observed prices rather than guarantees; the caveat covers seller, stock, warranty, shipping, taxes, and date, and explains the differing USD/import, shipping, tax, and warranty conditions for Amazon, MercadoLibre, and Colombian retail offers.
10. Invalid JSON records, fabricated or non-product-level evidence URLs, unsupported exact prices, or invalid pricing policies fail validation before deployment, while valid inputs produce deterministic build-time results.
11. Existing catalog consumers are migrated to the validated JSON-backed model with no route or static deployment regression.

## Risks and mitigations

- **Unsupported or fabricated price evidence:** require exact product/listing URLs and complete offer metadata for verified prices; mark incomplete, category-only, or missing evidence `unconfirmed`, publish no exact price for it, and reject fabricated URLs or amounts in validation.
- **Stale or inconsistent sources:** retain checked timestamps, preserve observation labeling, and make price updates an owner-maintained editorial task.
- **Incorrect commercial policy:** preserve the confirmed COP 150,000 Professional Bogotá service and 20% component-subtotal margin as explicit configuration; do not promote other observed service values to default policy.
- **Marketplace ambiguity and landed-cost mismatch:** disclose seller, stock, warranty, shipping, taxes, currency, import, and date context. Normalize Amazon or other foreign-currency offers to COP only with explicit conversion and landed-cost assumptions; do not imply equivalence with MercadoLibre or Colombian-retail offers.
- **External image failure or rights uncertainty:** make images optional and external; UI must tolerate a missing or unavailable image URL.
- **Malformed hand-edited JSON:** enforce narrow schema validation in build/test paths before deployment.
- **Migration drift:** retain behavior-focused tests and compare migrated records and derived totals while replacing hardcoded sources.

## Rollback

The change can be reverted as a single deployment rollback to the prior static build. During migration, keep the previous typed public shapes at the loader boundary so reverting JSON-backed inputs does not require a route, hosting, or database migration. No persistent data migration is required.

## Delivery strategy

Deliver the change as three chained slices:

1. **PR 1 — catalog contract and loader:** versioned JSON documents, validation, fixtures, and build-time loading.
2. **PR 2 — quote domain and adapters:** deterministic COP quote calculation, the confirmed 20% component-subtotal margin, Professional Bogotá service configuration, and legacy-data adapters.
3. **PR 3 — UI, integration, and documentation:** provenance and quote-breakdown presentation, configurator and catalog integration, maintainer guidance, and release verification.

Each slice remains independently revertible within the existing static-site rollback model.

## Confirmed commercial decisions

- Professional Bogotá assembly is COP 150,000 fixed and includes assembly, cable management, testing, and initial support.
- Margin is 20% of the confirmed component observed-cost subtotal, disclosed separately in every quote breakdown, and never embedded in component observed prices.
- A component is `verified` only when it has exact product/listing evidence and complete offer context; category/search evidence and missing evidence are `unconfirmed` and cannot yield a published exact price.
- Research values remain observations that can vary by seller, stock, warranty, shipping, taxes, currency, import conditions, and date. Amazon, MercadoLibre, and Colombian retail offers are not assumed equivalent.

## Next phase

Refine the existing specification and design artifacts around the confirmed service fee, fixed margin policy, JSON schema, validation behavior, and quote-display scenarios; implementation is not part of this proposal phase.
