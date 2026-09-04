# Pricing Catalog Specification

## Purpose

Define a Git-editable, JSON-backed catalog for Colombian PC components and assembly services so the static site can build traceable prebuilt and custom quotes from observed offers, explicit service fees, and separately disclosed business margin. Each component retains multiple offer observations with full provenance, an explicit per-component `priceStatus`, and normalized COP references only when their currency and landed-cost assumptions are reproducible. Research values are observations, not guarantees, and require manual confirmation by the owner before purchase.

## Requirements

### Requirement: Versioned JSON catalog source

The pricing catalog MUST be stored as local JSON documents tracked in Git. The catalog MUST expose a stable `schemaVersion` and MUST distinguish component, service, prebuilt-configuration, and pricing-policy data. The catalog MAY be split into multiple JSON documents, but all documents MUST be validated as one catalog.

#### Scenario: Catalog documents are assembled for a build

- GIVEN the repository contains all catalog and pricing-policy JSON documents
- WHEN the static site build reads the catalog
- THEN every catalog record MUST come from the local JSON documents
- AND the build MUST be able to associate component, service, prebuild, and pricing-policy records through stable identifiers

### Requirement: Component record contract

Each component record MUST contain:

- a non-empty, unique `id`;
- a non-empty `name`;
- one supported `category`, including CPU, GPU, motherboard, RAM, storage, PSU, case, and cooler;
- a non-empty `specs` object containing category-specific technical specifications;
- a `priceStatus` of `verified`, `provisional`, or `unconfirmed`;
- a non-empty `offers` array (see "Offer record contract");
- an optional `imageUrl` containing an absolute HTTP or HTTPS external URL.

A component MUST expose an exact customer price only when `priceStatus` is `verified` or `provisional`. A component with `priceStatus: "unconfirmed"` MUST NOT publish an exact customer price and MUST NOT contribute an exact price to any quote.

#### Scenario: A verified component is loaded

- GIVEN a component has every required field, at least one offer with confirmed evidence, and `priceStatus: "verified"`
- WHEN the catalog validator evaluates the record
- THEN validation MUST succeed
- AND the component MUST be available for quoting with its observed cost unchanged

#### Scenario: An unconfirmed component is loaded

- GIVEN a component has `priceStatus: "unconfirmed"` because no exact-SKU offer evidence exists
- WHEN the catalog is validated or displayed
- THEN validation MUST succeed
- AND the component MUST NOT contribute an exact price to any quote
- AND any quote attempt that references the component MUST fail with a `price-unconfirmed` error

#### Scenario: A component has no image

- GIVEN a component omits `imageUrl`
- WHEN the catalog is validated and displayed
- THEN validation MUST succeed
- AND the component MUST remain usable without an image

#### Scenario: An invalid component field is supplied

- GIVEN a component is missing a required identifier, specification, `priceStatus`, or `offers` array
- OR has an unsupported `priceStatus` or category
- WHEN the catalog is validated
- THEN validation MUST fail before a deployment is produced

### Requirement: Offer record contract

Each component MUST expose one or more offer observations. Each offer MUST contain:

- a non-empty `offerId` that is unique within its component;
- a non-empty `retailer` (Amazon, MercadoLibre, Ktronix, Alkosto, Clones y Periféricos, etc.);
- a non-empty absolute HTTP or HTTPS `sourceUrl` whose hostname MUST NOT match the placeholder pattern `host/<slug>/p` and MUST NOT be empty;
- a non-empty ISO-4217 `sourceCurrency` (e.g. `USD`, `COP`);
- a non-negative numeric `listedAmount` expressed in `sourceCurrency`;
- an optional `shippingImportTaxCop` whose COP landed-cost assumption is documented when present;
- a non-empty `sellerCondition` describing the seller name and condition (new, used, refurbished, open-box);
- a non-empty `availability` of `in-stock`, `limited`, `out-of-stock`, or `unknown`;
- a valid timezone-aware ISO-8601 `checkedAt` date-time;
- an `evidenceStatus` of `confirmed`, `category-page`, or `404-or-missing`.

An offer with `evidenceStatus` other than `confirmed` MUST NOT be accepted as exact-SKU proof. A missing, fake, placeholder, or 404 source URL MUST cause `evidenceStatus` to be `404-or-missing` and MUST invalidate the offer for confirmed pricing.

#### Scenario: A component records multiple offers

- GIVEN a component such as a Ryzen 5 5600 with offers from MercadoLibre Colombia, Ktronix, and an Amazon USD listing
- WHEN the catalog is loaded
- THEN the component MUST retain all three offers with their distinct `offerId`, `retailer`, `sourceUrl`, `sourceCurrency`, `listedAmount`, `sellerCondition`, `availability`, and `checkedAt`
- AND each offer's `evidenceStatus` MUST be evaluated independently

#### Scenario: Source offers disagree on price

- GIVEN a component has two or more confirmed offers with different `listedAmount` values in the same currency
- WHEN a quote references the component
- THEN the quote MUST NOT silently average, round, or pick an undeclared observation
- AND the lowest confirmed COP observed cost for the component MUST be the cost used for the component subtotal
- AND the discrepancy MUST be disclosed in the quote provenance display

### Requirement: Price status lifecycle

`priceStatus` MUST be one of `verified`, `provisional`, or `unconfirmed`. A component MUST be `verified` only when it has at least one offer with `evidenceStatus: "confirmed"` whose `sourceUrl` is an exact product or listing page (not a category or search page) and whose `sourceCurrency` is `COP` or has an explicit `normalizedCostCop` conversion assumption. A component MUST be `provisional` when it has confirmed offers but at least one of the following holds: any foreign-currency offer lacks a documented COP conversion, the conversion or landed-cost assumptions have not been confirmed by the owner, or all confirmed offers come from a single retailer. A component MUST be `unconfirmed` when it has no confirmed offer, only category-page evidence, or incomplete provenance.

#### Scenario: Status moves from unconfirmed to verified

- GIVEN a component is `unconfirmed` because only a category page was recorded
- WHEN a maintainer adds an exact product-page offer with complete provenance
- THEN the component MUST become eligible for `priceStatus: "verified"`
- AND the catalog MUST require an explicit status change in the same edit

#### Scenario: Status moves from verified to provisional

- GIVEN a component is `verified` with confirmed offers
- WHEN a maintainer adds an Amazon USD offer without a documented COP conversion assumption
- THEN the component MUST become `provisional` until the owner confirms the conversion
- AND the change MUST be disclosed in the catalog metadata

### Requirement: Normalized COP conversion

A component MAY carry a `normalizedCostCop` field. The field MUST be present only when its currency conversion rate, conversion date, and any landed-cost assumptions (shipping, import duties, taxes) are explicit and reproducible. An Amazon or other foreign-currency offer MUST NOT be silently treated as a COP price. When `normalizedCostCop` is absent, the component's COP reference MUST be derived from the lowest confirmed COP `listedAmount` adjusted for any documented `shippingImportTaxCop`.

#### Scenario: An Amazon USD offer is recorded with explicit conversion

- GIVEN an offer has `sourceCurrency: "USD"`, `listedAmount: 110`, `checkedAt: "2025-03-01T00:00:00-05:00"`, and a documented TRM reference of COP 4,000 per USD plus a documented COP 25,000 import cost
- WHEN the catalog is validated
- THEN `normalizedCostCop` MUST be accepted as COP 465,000 (110 × 4,000 + 25,000)
- AND the conversion assumption MUST be retained as part of the offer record
- AND the component MAY be `verified` only when this explicit conversion is present

#### Scenario: An Amazon USD offer is recorded without explicit conversion

- GIVEN an offer has `sourceCurrency: "USD"` and `listedAmount: 110` but no documented conversion rate, conversion date, or landed-cost assumption
- WHEN the catalog is validated
- THEN the offer MUST NOT contribute a COP `normalizedCostCop`
- AND the component MUST be `provisional` or `unconfirmed`
- AND the catalog MUST NOT silently substitute a guessed COP value

### Requirement: Category and listing page evidence

Category, listing, and search-result pages MUST be accepted as evidence of search availability only. They MUST NOT be accepted as exact-SKU proof for any offer with `evidenceStatus: "confirmed"`. Any offer whose `sourceUrl` resolves to a category or listing page MUST be assigned `evidenceStatus: "category-page"` and MUST be excluded from confirmed pricing.

#### Scenario: A category URL is recorded

- GIVEN an offer's `sourceUrl` is a category or listing page
- WHEN the catalog is validated
- THEN the offer MUST have `evidenceStatus: "category-page"`
- AND the offer MUST NOT contribute to a verified `priceStatus`
- AND the offer MAY be displayed as evidence of search availability only

### Requirement: Source URL integrity

A `sourceUrl` that is missing, fake, placeholder, or known to return HTTP 404 MUST cause the related offer to have `evidenceStatus: "404-or-missing"` and MUST invalidate that offer for confirmed pricing. The placeholder pattern `host/<slug>/p` and any URL whose hostname is empty MUST be rejected by the validator. The validator MUST NOT fetch URLs at build time; integrity is asserted via static pattern rules plus a maintainer-supplied evidence list.

#### Scenario: A placeholder URL is supplied

- GIVEN an offer has `sourceUrl: "https://host/cpu-amd-ryzen-5-5600/p"`
- WHEN the catalog is validated
- THEN validation MUST fail for that offer
- AND the offer MUST NOT be retained as confirmed evidence

#### Scenario: A 404 URL is supplied

- GIVEN a maintainer records an offer whose `sourceUrl` returned HTTP 404 during research
- WHEN the catalog is validated
- THEN the offer MUST have `evidenceStatus: "404-or-missing"`
- AND the offer MUST NOT contribute to `priceStatus: "verified"`
- AND the component MUST fall back to `provisional` or `unconfirmed`

### Requirement: Per-offer freshness and stale warnings

A positive whole-number `staleAfterDays` policy MUST be configurable for observed offers and services. At build time, an offer whose `checkedAt` is older than that policy's maximum age MUST be marked stale. The component's quote MUST continue to be produced from any remaining fresh confirmed offers, but each stale offer MUST carry a per-offer stale warning identifying the `offerId`, `checkedAt`, and age in days. Service records MUST use the same `checkedAt` rule.

#### Scenario: An offer is stale

- GIVEN an offer's `checkedAt` is older than the configured `staleAfterDays`
- WHEN a catalog or quote is generated
- THEN the offer MUST carry a stale warning with its `offerId`, `checkedAt`, and `ageDays`
- AND the component MUST remain quotable from any remaining fresh confirmed offers

#### Scenario: All confirmed offers are stale

- GIVEN a component's only confirmed offers are all stale
- WHEN a quote is generated
- THEN the component MUST remain quotable but MUST be downgraded from `verified` to `provisional` for the build
- AND the quote MUST disclose the stale warnings per offer

#### Scenario: A source or `checkedAt` is missing

- GIVEN an offer lacks `sourceUrl`, `sourceCurrency`, `listedAmount`, `sellerCondition`, `availability`, or `checkedAt`
- WHEN the catalog is validated
- THEN validation MUST fail for that offer
- AND no quote using that offer MUST be generated

### Requirement: Service record contract

Each priced assembly or service record MUST have a stable identifier, a non-empty name or tier, an integer `feeCop` greater than or equal to zero for confirmed services, a non-empty source store, a non-empty source URL, and a valid timezone-aware ISO-8601 `checkedAt` date-time. The confirmed Professional Bogotá assembly service MUST be recorded at COP 150,000 fixed and MUST include assembly, cable management, testing, and initial support. Service recommendations and confirmed prices MUST remain distinguishable. Service recommendations and retailer promotional evidence MUST NOT be represented as guaranteed commercial policy.

#### Scenario: The confirmed Professional Bogotá assembly is recorded

- GIVEN the catalog contains a service record with `feeCop: 150000` and a description covering assembly, cable management, testing, and initial support
- WHEN a quote selects that service
- THEN the quote MUST add COP 150,000 as a separate `serviceFeeCop` line
- AND the line MUST be presented as the confirmed Professional Bogotá assembly
- AND the fee MUST NOT be combined with or hidden inside any component price

#### Scenario: A service price is used in a quote

- GIVEN a confirmed service record has a `feeCop` and complete provenance
- WHEN it is selected for a quote
- THEN the quote MUST use that integer amount in COP
- AND it MUST NOT alter the observed cost of any component

### Requirement: Catalog integrity validation

The catalog MUST reject records that are not valid JSON or that violate the catalog schema. The validator MUST enforce unique component identifiers and per-component `offerId` uniqueness, supported categories and `priceStatus` values, required-field presence, correct numeric and string types, non-negative monetary values, absolute source URLs, no placeholder hostname pattern, and parseable ISO-8601 `checkedAt` dates. A validation failure MUST identify the JSON file and invalid field so a maintainer can correct it.

#### Scenario: A maintainer hand-edits malformed JSON

- GIVEN a catalog document contains invalid JSON or a record with an invalid field
- WHEN tests, checks, or the production build validate the catalog
- THEN the operation MUST fail before deployment
- AND the reported error MUST identify the file and field that need correction

#### Scenario: An identifier is duplicated

- GIVEN two offers of the same component use the same `offerId`
- OR two components use the same `id`
- WHEN the catalog is validated
- THEN validation MUST fail because the identifier is not unique

### Requirement: Build-time-only loading

All catalog and pricing JSON MUST be read and validated during the Astro build or build test workflow. The generated static site MUST NOT depend on a cloud database, local database, runtime catalog API, runtime data fetch, mutable server state, or web scraper. `sourceUrl` and `imageUrl` MUST be retained as evidence only and MUST NOT be fetched by the catalog loader or quote calculator.

#### Scenario: The static site is generated

- GIVEN valid local catalog and pricing JSON
- WHEN the Astro build runs
- THEN the build MUST produce the required catalog and quote output using only repository data available at build time

#### Scenario: The generated site runs without catalog network access

- GIVEN a completed static build
- WHEN its pages execute in a browser or static host
- THEN catalog-backed quote data MUST remain available
- AND no remote catalog request, web fetch, or scraper MUST be required

### Requirement: External image handling

If `imageUrl` is present, it MUST be treated only as an optional external reference. The build MUST NOT download, validate availability, or assert ownership or permanence of the referenced image. A missing or unavailable image MUST NOT invalidate catalog or quote data.

#### Scenario: An external image cannot be reached

- GIVEN a component contains an `imageUrl` whose remote asset is unavailable
- WHEN the static site is built or displayed
- THEN the catalog MUST remain valid
- AND the unavailable image MUST be tolerated without a runtime data dependency

### Requirement: Prebuilt and custom configuration inputs

A prebuilt configuration MUST reference component identifiers rather than duplicate component prices. A custom configuration MUST reference the component identifiers selected by the visitor or maintainer. Both configuration types MUST support selecting a confirmed service and a pricing policy containing zero, one, or both of a fixed margin and percentage margin. Unknown component, service, or pricing-policy identifiers MUST be rejected. A component with `priceStatus: "unconfirmed"` MUST NOT be referenced by any quote.

#### Scenario: A prebuilt configuration is quoted

- GIVEN a prebuilt references only verified or provisional components, a confirmed service, and a pricing policy
- WHEN its quote is calculated
- THEN its component subtotal and final total MUST be derived from those referenced records
- AND no manually entered final total MAY override the calculation

#### Scenario: A custom configuration is quoted

- GIVEN a visitor selects verified or provisional components, a confirmed service, and a pricing policy
- WHEN the custom quote is calculated
- THEN the result MUST use the same calculation rules as a prebuilt quote
- AND changing a selected component MUST change only the values derived from that selection and the configured pricing policy

#### Scenario: A referenced record does not exist

- GIVEN a custom or prebuilt configuration contains an unknown component, service, or policy identifier
- WHEN the quote is requested
- THEN quote calculation MUST fail with a validation error for that identifier

#### Scenario: An unconfirmed component is referenced

- GIVEN a configuration references a component with `priceStatus: "unconfirmed"`
- WHEN the quote is requested
- THEN the quote MUST fail with a `price-unconfirmed` error
- AND no exact customer price MUST be produced

### Requirement: Deterministic quote formula

For every valid prebuilt or custom configuration:

1. `componentSubtotalCop` MUST equal the sum of the referenced components' lowest confirmed COP observed cost (or `normalizedCostCop` when documented), excluding any unconfirmed components.
2. `serviceFeeCop` MUST equal the selected confirmed service fee; the confirmed Professional Bogotá assembly MUST be COP 150,000 when selected.
3. `fixedMarginCop` MUST equal the configured fixed margin and MUST default to zero when fixed margin is not configured.
4. `percentageMarginCop` MUST equal the component subtotal multiplied by the confirmed business margin of 20% when percentage margin is configured, rounded to the nearest whole COP using conventional half-up rounding, and MUST default to zero when percentage margin is not configured.
5. `marginAmountCop` MUST equal `fixedMarginCop` plus `percentageMarginCop`.
6. `finalTotalCop` MUST equal `componentSubtotalCop` plus `serviceFeeCop` plus `marginAmountCop`.

Percentage margin MUST be based on the component subtotal and MUST NOT include the service fee. Taxes, shipping, checkout, and payment charges are not part of this calculation.

#### Scenario: A confirmed assembly with 20% margin is calculated

- GIVEN components total COP 800,000, the confirmed Professional Bogotá assembly is COP 150,000, and percentage margin is 20%
- WHEN the quote is calculated
- THEN component subtotal MUST be COP 800,000
- AND service fee MUST be COP 150,000
- AND percentage margin MUST be COP 160,000
- AND margin amount MUST be COP 160,000
- AND final total MUST be COP 1,110,000

#### Scenario: A fixed-margin custom configuration is calculated

- GIVEN components total COP 2,000,000, the confirmed service fee is COP 60,000, and fixed margin is COP 150,000
- WHEN the quote is calculated
- THEN component subtotal MUST be COP 2,000,000
- AND service fee MUST be COP 60,000
- AND fixed margin MUST be COP 150,000
- AND final total MUST be COP 2,210,000

#### Scenario: A percentage-margin prebuilt is calculated

- GIVEN components total COP 3,000,000, the confirmed service fee is COP 150,000, and percentage margin is 10%
- WHEN the quote is calculated
- THEN percentage margin MUST be COP 300,000
- AND final total MUST be COP 3,450,000

#### Scenario: Fixed and percentage margin are combined

- GIVEN components total COP 1,000,000, service fee is COP 50,000, fixed margin is COP 80,000, and percentage margin is 5%
- WHEN the quote is calculated
- THEN component subtotal MUST be COP 1,000,000
- AND service fee MUST be COP 50,000
- AND fixed margin MUST be COP 80,000
- AND percentage margin MUST be COP 50,000
- AND margin amount MUST be COP 130,000
- AND final total MUST be COP 1,180,000

### Requirement: Explicit quote breakdown

Every generated quote MUST expose `componentSubtotalCop`, `serviceFeeCop`, `fixedMarginCop`, `percentageMarginCop`, `marginAmountCop`, and `finalTotalCop`. The customer-facing breakdown MUST present the component subtotal, the confirmed COP 150,000 Professional Bogotá assembly fee when selected, fixed margin when applicable, percentage margin when applicable, total margin, and final total as distinct items. It MUST be clear that component prices and the assembly fee are inputs while the 20% margin is a separate business amount.

#### Scenario: A customer reviews a quote

- GIVEN a valid prebuilt or custom quote
- WHEN the quote breakdown is displayed
- THEN each calculated COP value MUST appear under its specific label
- AND the displayed sum of its line items MUST equal the displayed final total
- AND the COP 150,000 assembly fee and the 20% margin MUST appear as separate line items

#### Scenario: No percentage margin is configured

- GIVEN a pricing policy contains only a fixed margin
- WHEN the quote is displayed
- THEN percentage margin MUST be shown as zero or not applicable
- AND the final total MUST still reconcile with the disclosed fixed margin and service fee

### Requirement: Observed prices remain separate from margin

Component `normalizedCostCop` and offer `listedAmount` values MUST be stored, validated, calculated, and displayed without business margin. A quote MAY mark a catalog price up only by adding a separately calculated margin result; it MUST NOT rewrite the underlying observed component cost.

#### Scenario: A margin is added

- GIVEN a component has a confirmed observed cost of COP 800,000
- WHEN a quote applies the 20% margin
- THEN the catalog record MUST remain COP 800,000
- AND the 20% margin MUST appear only in the quote's margin fields and line items

### Requirement: Initial Bogotá service recommendations

The initial service pricing data MUST represent the following Bogotá research as recommendations pending owner confirmation:

- Basic assembly: recommended range of COP 30,000 through COP 80,000.
- Professional assembly including cable management and testing: a confirmed COP 150,000 fixed fee that MUST be exposed in quotes as a separate line item, plus an observed range of COP 120,000 through COP 200,000 retained as recommendation evidence.
- Retailer promotion: free assembly or an observed approximately COP 11,490 fee with qualifying-parts conditions, retained only as reference evidence and not as a default service price.

These recommendation values MUST NOT be represented as guaranteed market rates or final business policy beyond the COP 150,000 confirmed Professional Bogotá assembly. A final quote MUST use the confirmed COP 150,000 Professional Bogotá assembly amount selected or approved by the owner.

#### Scenario: Initial recommendations are shown

- GIVEN the seeded catalog contains the Bogotá service evidence
- WHEN service pricing is displayed
- THEN the stated basic and professional recommendation ranges MUST be labeled as owner-confirmation recommendations
- AND the retailer promotion MUST retain its free-or-approximately-COP-11,490 and qualifying-parts caveat
- AND none of the recommendation values MUST be presented as a guaranteed rate

#### Scenario: A recommendation is used without confirmation

- GIVEN a service record remains marked as requiring owner confirmation
- WHEN a final customer quote is requested
- THEN the quote MUST NOT silently choose a fee from that recommendation
- AND the system MUST require a confirmed service amount before producing a final total

### Requirement: Colombian COP presentation and price caveat

Catalog and quote UI MUST use Colombian COP terminology, including labels equivalent to `Precio observado (COP)`, `Subtotal de componentes`, `Servicio de armado`, `Armado profesional Bogotá confirmado`, `Margen fijo`, `Margen porcentual`, and `Total (COP)`. Any observed price shown to a visitor or used in a quote MUST carry a notice that listing prices vary by seller, stock, warranty, shipping, taxes, currency, import conditions, and the date of observation, that research values are observations rather than guarantees, and that all observed values require manual confirmation by the owner before purchase. The caveat MUST explain that exact Amazon, MercadoLibre, and Colombian-retail prices can differ because Amazon offers may be USD and imported while local offers can carry different shipping, tax, and warranty conditions.

#### Scenario: An observed price is visible

- GIVEN a catalog page or quote displays a component or service price
- WHEN the visitor views the price
- THEN the value MUST be identified as observed COP pricing
- AND the variation notice MUST be available in the same catalog or quote context
- AND the notice MUST state that the value is an observation requiring manual confirmation before purchase

### Requirement: Configuration-only editorial updates

A maintainer MUST be able to change component offers, `priceStatus`, `normalizedCostCop` assumptions, verified/provisional/unconfirmed transitions, source store or URL, verification date, optional image URL, service price or recommendation, and margin configuration by editing JSON without changing quote-formula code. Price-editing workflows MUST NOT infer a margin from an observed price or treat a recommended amount as confirmed commercial policy beyond the COP 150,000 Professional Bogotá assembly.

#### Scenario: A maintainer updates pricing data

- GIVEN a component offer, status, or margin policy is stored in JSON
- WHEN the maintainer changes the corresponding JSON values
- THEN the next validated build MUST calculate quotes from the changed values
- AND no production quote calculation code change MUST be required

## Non-Goals

This change does NOT include scraping, supplier crawling, live price polling, automatic refresh jobs, or price guarantees.

This change does NOT include checkout, payment processing, order fulfillment, tax calculation, shipping calculation, or live currency conversion at runtime.

This change does NOT include a cloud database, SQLite, CMS, remote catalog administration, authentication, cloud synchronization, or a runtime API.

This change does NOT include hosting, downloading, availability-checking, or rights-validation of external image assets.

This change does NOT include automatic confirmation of research observations; all observed prices require manual confirmation by the owner before being treated as commercial commitments.
