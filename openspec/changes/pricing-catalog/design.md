# pricing-catalog · design

## 0 · What changed in this revision

This revision **replaces** the single-observation component shape that the prior
design landed (one `observedPriceCop`, one `sourceStore`, one `sourceUrl`, one
`lastVerified` per component) with a **multi-offer** model: every component
carries an `offers[]` array of independently evidenced observations, plus a
product-level `priceStatus` (`verified | provisional | unconfirmed`) and a
deterministic reference-offer selection rule. The change was driven by three
real-world problems the prior shape could not express:

1. A single Ryzen 5 5600 has both a MercadoLibre Colombia COP observation and
   an Amazon USD observation. Both are legitimate evidence; neither is more
   "the" price than the other.
2. An Amazon USD `listedAmount` is not comparable to a MercadoLibre COP
   `listedAmount` until shipping, import duties, taxes, and a TRM-style
   conversion rate are documented. Silently treating USD as COP, or hiding
   the conversion inside a single `observedPriceCop`, is exactly the
   ambiguity the spec calls out.
3. A Ktronix category page, an Alkosto search page, and an exact product
   page for the same SKU must be **distinguishable** in the data layer so
   one can never be promoted to "the" verified price by mistake.

Everything else carried from the prior design (`src/data/catalog/*.json` as
the only source of truth, COP-only currency, `pricing-policy.json` for the
20 % margin and the confirmed Professional Bogotá COP 150 000 assembly fee,
static SSG, no network calls in `src/lib/catalog/**`, the `verified |
recommended | reference` discriminated service union, freshness, migration
adapter boundary, and rollback strategy) is preserved and is referenced by
this revision rather than re-derived.

A short mapping table for reviewers:

| Prior design | New design |
| --- | --- |
| `CatalogComponent.observedPriceCop` | `CatalogComponent.referencePriceCop` (derived) + `offers[].listedAmount` (raw) |
| `CatalogComponent.sourceStore` / `sourceUrl` / `lastVerified` | `CatalogComponent.offers[]`; each offer carries its own `retailer` / `sourceUrl` / `checkedAt` |
| `CatalogComponent.availability` (component-level) | Both `CatalogComponent.availability` (default roll-up) and `offers[].availability` (per-offer) |
| No product-level status | `CatalogComponent.priceStatus: "verified" | "provisional" | "unconfirmed"` |
| No conversion metadata | `offers[].normalizedCostCop?` + `offers[].conversionAssumption?` only for non-COP offers |
| Implicit "single observation = the price" | Explicit reference-offer selection policy in §6 |

The folder layout, type names, validator strategy, loader strategy, adapter
strategy, freshness module, and quote engine **structure** are unchanged; the
component shape and the reference-offer selection rule are the only
substantive new contracts. Existing implementation PRs that already landed
`catalog-types.ts`, `validate.ts`, `load-catalog.ts`, `adapters.ts`,
`calculate-quote.ts`, and the JSON documents are migrated to this revision
under §7 (Migration).

---

## 1 · Goal and constraints

Replace the hardcoded pricing data in `src/data/*.ts` with Git-editable JSON
catalog documents that are loaded and validated **only at Astro build time**,
and add a pure, deterministic quote engine that exposes component cost,
service fee, and business margin as separate disclosed amounts. Each
component may carry multiple offer observations (Amazon USD, MercadoLibre
COP, Ktronix COP, Alkosto COP, Clones y Periféricos, etc.); a single
product-level `priceStatus` and a deterministic reference-offer selection
rule decide which observation becomes the customer-facing COP reference.

Hard constraints carried from `proposal.md` / `spec.md`:

| Constraint | Design consequence |
| --- | --- |
| Pure SSG, no server runtime | JSON is `import`ed as a module at build time; no `fetch`, no `fs` at runtime |
| No SQLite / cloud DB / CMS / API | Source of truth is `src/data/catalog/*.json` in Git only |
| `sourceUrl` / `imageUrl` are evidence, never fetched | Loader, validator, and quote engine only read the strings; no network code anywhere in `src/lib/catalog/**` or `src/lib/quotes/**` |
| Margin never embedded in a component price | `referencePriceCop` is stored and rendered untouched; margin lives only in quote output |
| Bogotá tiers are recommendations | Service records carry an explicit `status`; only `confirmed` services can produce a final total |
| Images are optional and external | `imageUrl?` (component and offer level) as string only; no download, no `astro:assets` remote optimization |
| Amazon USD ≠ COP | A non-COP offer requires `normalizedCostCop` + a documented `conversionAssumption` (rate, date, shipping/import/tax) before contributing a COP reference; otherwise the component is at best `provisional` |
| COP is the sole customer-facing currency | Only `COP` values flow into quote math, breakdown UI, and the price-variation notice; USD, EUR, etc. are recorded only as raw evidence |
| Verified ≥ provisional ≥ unconfirmed | `priceStatus` is a three-state union with explicit promotion rules (§4.3) |

### 1.1 · Currency ambiguity (must be removed)

The repository is currently self-contradictory: `src/data/types.ts`,
`src/data/components.ts`, and `src/data/prebuilds.ts` document prices as
**ARS (Argentine peso)** and reference a `formatArs()` helper, while
`src/data/brand.ts` locates the business in Bogotá, the Configurator
renders `` `${formatArs(total)} COP` ``, and the actual magnitudes (COP
320 000 for a Ryzen 5 5600) are plainly Colombian. `src/lib/money.ts` is the
shared formatter.

**Decision (D-0):** COP is the only currency in this project. This change:

1. keeps `src/lib/money.ts` exporting `formatCop()` (`Intl.NumberFormat("es-CO")`)
   and `roundHalfUpCop()`;
2. deletes the private `formatArs()` in `src/components/configurator/Configurator.tsx`
   in favour of the shared helper;
3. rewrites every `ARS` / `ARS/COP` comment in `src/data/types.ts`,
   `components.ts`, `prebuilds.ts`, `SpecList.astro`, `PricingCard.astro`,
   `ServiceCard.astro`, `pre-armadas/[slug].astro`;
4. names money-bearing fields to be currency-explicit at the catalog boundary
   (`listedAmount` is raw `sourceCurrency`, `normalizedCostCop` is the
   documented COP landing, `feeCop`, `finalTotalCop`).

No ARS reference survives this change. Task 5.x in `tasks.md` includes a
manual grep gate.

---

## 2 · Folder layout

```
src/
├── data/
│   ├── catalog/                       ← NEW · source of truth (hand-edited JSON)
│   │   ├── components.json            ← MODIFIED · multi-offer shape (§3.1)
│   │   ├── services.json              ← unchanged shape (recommended | reference | confirmed)
│   │   ├── prebuilds.json             ← unchanged shape (identifiers only)
│   │   └── pricing-policy.json        ← unchanged shape
│   ├── types.ts                       ← MODIFIED · legacy UI types, COP comments
│   ├── components.ts                  ← MODIFIED · thin adapter re-export
│   ├── prebuilds.ts                   ← MODIFIED · thin adapter re-export
│   ├── services.ts                    ← MODIFIED · thin adapter re-export
│   ├── brand.ts / home.ts             ← untouched
├── lib/
│   ├── money.ts                       ← formatCop, roundHalfUpCop, halfUpDivide, PRICE_VARIATION_NOTICE
│   ├── catalog/
│   │   ├── catalog-types.ts           ← MODIFIED · offer types, priceStatus union
│   │   ├── validate.ts                ← MODIFIED · per-offer validators, priceStatus rules
│   │   ├── freshness.ts               ← MODIFIED · per-offer freshness, status downgrade rule
│   │   ├── load-catalog.ts            ← unchanged · JSON singleton + CatalogValidationError
│   │   ├── reference-selection.ts     ← NEW · deterministic reference-offer selection (§6)
│   │   ├── adapters.ts                ← MODIFIED · flattens referencePriceCop + cheapest offer provenance
│   │   └── __fixtures__/              ← NEW · valid + invalid JSON fixtures for tests
│   ├── quotes/
│   │   ├── quote-types.ts             ← unchanged shape, but ReferenceOffer fields exposed
│   │   └── calculate-quote.ts         ← MODIFIED · uses referencePriceCop + warns on stale offers
│   ├── compatibility.ts               ← untouched
│   └── cn.ts                          ← untouched
└── components/
    ├── ui/
    │   ├── ExternalImage.astro        ← unchanged · optional external image + fallback
    │   ├── PriceProvenance.astro      ← MODIFIED · renders up to N offers, "lowest COP" badge, stale
    │   └── QuoteBreakdown.astro       ← unchanged · line-item table
    └── configurator/Configurator.tsx  ← MODIFIED · uses shared money + quote engine + referenceOffer
```

Domain logic stays under `src/lib/**`, which is the only path in
`vitest.config.ts` `include`, so all new logic is coverage-enforced at the
existing 80 % statement threshold.

---

## 3 · JSON document format

Every document is an envelope with `schemaVersion` so a future migration
can branch on it (spec: *Versioned JSON catalog source*). `schemaVersion`
starts at `1` and MUST match across all four documents; a mismatch is a
validation error.

### 3.1 · `components.json` — the multi-offer shape

```jsonc
{
  "schemaVersion": 1,
  "components": [
    {
      "id": "cpu-amd-ryzen-5-5600",
      "category": "cpu",
      "brand": "AMD",
      "model": "Ryzen 5 5600",
      "name": "AMD Ryzen 5 5600",
      "specs": { "Cores": "6", "Threads": "12", "TDP": "65W" },
      "compatibility": { "socket": "AM4", "tdp": 65 },
      "priceStatus": "provisional",
      "imageUrl": "https://cdn.example.com/ryzen5600.jpg",
      "availability": "in-stock",
      "notes": "Precio referencial; SKU exacto pendiente de confirmar contra Ktronix/Alkosto.",
      "offers": [
        {
          "offerId": "meli-co-5600-listing",
          "retailer": "MercadoLibre Colombia",
          "sourceUrl": "https://listado.mercadolibre.com.co/ryzen-5-5600",
          "sourceCurrency": "COP",
          "listedAmount": 320000,
          "shippingImportTaxCop": 0,
          "sellerCondition": "third-party · new",
          "availability": "in-stock",
          "checkedAt": "2026-09-04T00:00:00-05:00",
          "evidenceStatus": "category-page",
          "notes": "Listado de búsqueda, no SKU exacto; no debe contar como precio verificado."
        },
        {
          "offerId": "amazon-us-5600-mla",
          "retailer": "Amazon",
          "sourceUrl": "https://www.amazon.com/-/es/dp/B0BNQ26T9S",
          "sourceCurrency": "USD",
          "listedAmount": 109,
          "shippingImportTaxCop": 25000,
          "sellerCondition": "Amazon · new",
          "availability": "in-stock",
          "checkedAt": "2026-09-04T00:00:00-05:00",
          "evidenceStatus": "confirmed",
          "conversionAssumption": {
            "targetCurrency": "COP",
            "exchangeRateCopPerUnit": 4100,
            "rateSource": "trm",
            "rateAsOf": "2026-09-03T00:00:00-05:00",
            "notes": "TRM Banrep 2026-09-03 + envío internacional + arancel aprox."
          },
          "normalizedCostCop": 471900,
          "notes": "Precio publicado en USD; requiere asunción de envío e impuesto de importación antes de normalizar a COP."
        }
      ]
    }
  ]
}
```

Component-level fields:

- `id` — non-empty, `^[a-z0-9][a-z0-9-]*$`, unique across the document.
- `category` — one of `cpu | gpu | motherboard | ram | storage | psu | case | cooler | os`.
- `brand`, `model` — non-empty strings. `name` is optional; when omitted the
  loader derives `` `${brand} ${model}` ``.
- `specs` — non-empty `Record<string, string>`.
- `compatibility` — optional object holding the machine-readable fields
  consumed by `src/lib/compatibility.ts`: `socket`, `ramType`, `ramSlots`,
  `tdp`, `wattage`, `wattageDraw`, `interface_`, `formFactor`.
- `priceStatus` — exactly one of `"verified" | "provisional" | "unconfirmed"`
  (§3.3).
- `imageUrl` — optional; absolute http/https URL when present; never fetched.
- `availability` — optional enum
  `in-stock | limited | out-of-stock | unknown`, default `unknown`. This is
  the **roll-up** derived from the offers (§3.4); maintainers may set it
  explicitly, in which case the validator requires the roll-up rule to
  agree.
- `notes` — optional free-text shown next to the provenance block.
- `offers` — non-empty array; one or more offer records (§3.2).

**Why `offers` MUST be non-empty:** the prior shape allowed a component
with no provenance at all. The new shape refuses that case — every
component MUST come with at least one observation so the validator can
classify it as `verified`, `provisional`, or `unconfirmed`. An empty
`offers[]` is a validation error.

### 3.2 · Offer record contract

Each element of `offers[]` MUST contain:

- `offerId` — non-empty string, unique within the component (validated
  per-component in §5).
- `retailer` — non-empty string (Amazon, MercadoLibre, Ktronix, Alkosto,
  Clones y Periféricos, Kingste Technology, Speed Logic, PC Masters Bogotá,
  Mi PC Parque Central, Discos Duros Colombia, Microsoft, …).
- `sourceUrl` — non-empty absolute `http:`/`https:` URL parsed with
  `new URL()`. **Two static pattern rules MUST pass:**
  - the hostname MUST NOT be empty;
  - the hostname MUST NOT match the placeholder pattern `host/<slug>/p`
    (case-insensitive), e.g. `https://host/cpu-amd-ryzen-5-5600/p` is
    rejected by the validator without ever making a network call.
  The validator does NOT fetch the URL. A maintainer who has actually
  visited the URL during research and seen it 404 is expected to set
  `evidenceStatus: "404-or-missing"`, which is what makes the offer fail
  the `confirmed` promotion check (§3.3).
- `sourceCurrency` — non-empty ISO-4217 code (`USD`, `COP`, `EUR`, …).
- `listedAmount` — non-negative number expressed in `sourceCurrency`. COP
  offers MUST be an integer (`Number.isInteger`); foreign-currency offers
  MAY carry a non-integer (e.g. `109.99`) but the validator normalises to
  two decimal places and rejects more.
- `shippingImportTaxCop` — optional non-negative integer COP amount
  representing the **landed-cost delta** to add on top of the converted
  `listedAmount` (or to add to a COP `listedAmount` when the offer's
  shipping/import/tax is documented). When absent, the reference-selector
  assumes zero only if `sourceCurrency === "COP"` AND the offer's notes
  say so explicitly; otherwise the offer is treated as **incomplete landed
  cost** and cannot become the reference.
- `conversionAssumption` — REQUIRED whenever `sourceCurrency !== "COP"`,
  optional when `sourceCurrency === "COP"`. Fields, all non-empty strings:
  - `targetCurrency` — MUST be `"COP"` (the project's only customer
    currency).
  - `exchangeRateCopPerUnit` — non-negative number; for USD/EUR/JPY, the
    number of COP per one unit of `sourceCurrency` (TRM-style). For COP,
    MUST be `1`.
  - `rateSource` — free string the maintainer uses to identify the source
    (`trm`, `banrep`, `xe.com`, `oanda`, `manual`, …).
  - `rateAsOf` — timezone-aware ISO-8601 instant; the validator parses
    it with the same rule as `checkedAt`. A bare `2026-09-03` is rejected.
  - `notes` — free string explaining any landed-cost assumption made
    (envío internacional, arancel, IVA, retención, etc.). Required so a
    future reviewer can reproduce the COP figure.
- `normalizedCostCop` — REQUIRED whenever `sourceCurrency !== "COP"`,
  optional when `sourceCurrency === "COP"`. Integer ≥ 0. The validator
  cross-checks `normalizedCostCop` against the maintainer-supplied
  `conversionAssumption` using the formula in §6.3 and refuses the offer
  when the cross-check fails. The reference-selector will not consider an
  offer with `sourceCurrency !== "COP"` and no `normalizedCostCop`.
- `sellerCondition` — non-empty string describing seller name + condition
  (new, used, refurbished, open-box); for example `"Ktronix · new"`,
  `"Amazon · refurbished"`, `"MercadoLibre third-party · new"`.
- `availability` — required, one of `in-stock | limited | out-of-stock | unknown`.
- `checkedAt` — required, timezone-aware ISO-8601 instant (`Z` or `±HH:MM`).
  Naive timestamps fail validation so the value is reproducible across
  build machines.
- `evidenceStatus` — required, one of `"confirmed" | "category-page" | "404-or-missing"`.
  - `"confirmed"` — the maintainer attests this is an exact product or
    listing page for the SKU (not a category or search result).
  - `"category-page"` — the URL is a category, listing, or search result
    page; preserved as evidence of search availability only, never
    contributes to `priceStatus: "verified"`.
  - `"404-or-missing"` — the URL is missing, fake, placeholder, or known
    to return HTTP 404; cannot contribute to any `verified` price.
- `imageUrl` — optional, same rules as the component-level `imageUrl`.
- `notes` — optional free text shown next to the offer in the multi-offer
  provenance block.

### 3.3 · `priceStatus` lifecycle

`priceStatus` is exactly one of `"verified" | "provisional" | "unconfirmed"`.
It is the **product-level** summary of what the offers say, and it is the
only field that gates whether a component contributes a customer price.

| `priceStatus` | Promotion rule | Quote contribution |
| --- | --- | --- |
| `verified` | The component has at least one offer with `evidenceStatus: "confirmed"` whose `sourceUrl` is an exact product or listing page (not a category/search page) AND whose `sourceCurrency === "COP"`, OR whose `sourceCurrency !== "COP"` and whose `normalizedCostCop` cross-checks against a documented `conversionAssumption`. Verified foreign-currency offers without a `conversionAssumption` are still possible but the component remains `provisional` until the owner confirms the conversion. | `referencePriceCop` from §6 used as-is in the component subtotal |
| `provisional` | The component has at least one `confirmed` offer but (a) any foreign-currency offer lacks a documented `conversionAssumption`, (b) the conversion or landed-cost assumptions have not been confirmed by the owner, or (c) all `confirmed` offers come from a single retailer. | Component subtotal still uses `referencePriceCop` from §6, but the quote UI must render the "precio provisional · confirmar antes de comprar" notice and every offer used must carry its stale/conversion warning |
| `unconfirmed` | The component has no `confirmed` offer, every offer is `category-page` or `404-or-missing`, or provenance is incomplete. | The component MUST NOT contribute an exact customer price. The quote engine returns `price-unconfirmed` (§7.1). No fabricated COP figure is allowed. |

A `verified` component MUST NOT have an offer with `evidenceStatus` other
than `confirmed` in the chosen reference path; non-`confirmed` offers are
allowed to remain on the record as evidence of search availability or
known-404 fallbacks, but the reference-selector ignores them.

The `priceStatus` field is **maintainer-authored**. The validator does
not auto-derive it from offers (auto-deriving would create a silent
promotion path the spec forbids); instead, the validator cross-checks
that `priceStatus` is consistent with the offers it accompanies, per
the table above. A `verified` declaration that contradicts the offers
(e.g. no `confirmed` offer exists) is a validation error so a
maintainer never thinks the catalog is in a different state than it is.

### 3.4 · Component-level availability roll-up

`CatalogComponent.availability` is optional and defaults to `unknown`. When
the maintainer leaves it unspecified, the loader derives it from the
component's `offers[]` using the rule:

1. If every offer is `out-of-stock`, the roll-up is `out-of-stock`.
2. Else if any offer is `in-stock`, the roll-up is `in-stock`.
3. Else if any offer is `limited`, the roll-up is `limited`.
4. Else the roll-up is `unknown`.

When the maintainer sets `availability` explicitly, the validator requires
the roll-up rule to agree. This prevents "manual override" availability
from contradicting the offers.

### 3.5 · `services.json`

Unchanged from the prior design (`recommended | reference | confirmed`
discriminated union). `armado-basico`, `armado-profesional`, and
`promo-retail-armado` are seeded with their respective ranges and
`status` values. The confirmed Professional Bogotá assembly fee of COP
150 000 is **not** a seed of this file; it lives in
`pricing-policy.json` per §3.7 and is exposed to quotes via
`calculateQuote(..., confirmedServiceId)` (see D-7 below). Decision D-1
(three-state service union) and the gate documented in §11 are unchanged.

### 3.6 · `prebuilds.json`

Unchanged from the prior design (identifiers only — no hand-entered
prices). Each prebuild still references `serviceId` + `pricingPolicyId`.
A prebuild may reference a `provisional` component — the reference-selector
still computes a `referencePriceCop` for that component, and the quote
breakdown surfaces the provisional warning next to the component subtotal.

### 3.7 · `pricing-policy.json` — assembly fee and margin as policy data

The confirmed Professional Bogotá assembly fee of COP 150 000 and the
20 % component-subtotal margin are stored as policy data, **separate from
component offers**, per the spec's "Observed prices remain separate from
margin" requirement and the spec's "service fee is a separate line
item" requirement.

```jsonc
{
  "schemaVersion": 1,
  "freshness": { "staleAfterDays": 30 },
  "defaultPolicyId": "default",
  "policies": [
    {
      "id": "default",
      "label": "Margen estándar smart-pc",
      "fixedMarginCop": 0,
      "percentageMargin": 20,
      "confirmed": true,
      "note": "20% sobre subtotal de componentes. Nunca se embebe en el precio observado.",
      "confirmedService": {
        "id": "armado-profesional-bogota",
        "slug": "armado-profesional-bogota",
        "name": "Armado profesional Bogotá",
        "description": "Ensamblaje, gestión de cableado, pruebas e instalación inicial del sistema. Servicio confirmado por el propietario.",
        "tier": "professional",
        "feeCop": 150000,
        "sourceStore": "smart-pc · política comercial confirmada",
        "sourceUrl": "https://smart-pc.example/politica/armado-profesional-bogota",
        "lastVerified": "2026-09-04T00:00:00-05:00",
        "confirmationNote": "Tarifa confirmada por el propietario; vigente desde 2026-09-04."
      }
    }
  ]
}
```

- `freshness.staleAfterDays` — integer `> 0`.
- `fixedMarginCop` — optional integer ≥ 0, defaults to `0`.
- `percentageMargin` — optional number ≥ 0 in percent units (`20` = 20 %),
  at most two decimals. Defaults to `0`. Both may be present, one, or
  neither (spec: "zero, one, or both").
- `confirmedService` — when present, the policy exposes the **only**
  confirmed service fee available to quotes at this margin policy. It is
  not a duplicate of `services.json` evidence; it is the **commercial
  policy record** that the owner has signed off on, and the quote engine
  accepts it without consulting `services.json`. The validator
  guarantees that the offer block (Amazon, MercadoLibre, etc.) evidence
  never accidentally becomes the source of the assembly fee.

This is the structural reason the spec's "150 000 fee + 20 % margin as
separate policy data" is preserved: the fee lives on the policy object
the quote engine already reads for margin, not in the multi-offer
components list, and never inside any offer's `listedAmount` or
`normalizedCostCop`. A maintainer editing the fee edits JSON, not code.

---

## 4 · TypeScript contracts

`src/lib/catalog/catalog-types.ts`:

```ts
export const CATALOG_SCHEMA_VERSION = 1 as const;

export type ComponentCategory =
  | "cpu" | "gpu" | "motherboard" | "ram"
  | "storage" | "psu" | "case" | "cooler" | "os";

export type Availability =
  | "in-stock" | "limited" | "out-of-stock" | "unknown";

export type PriceStatus = "verified" | "provisional" | "unconfirmed";

export type EvidenceStatus = "confirmed" | "category-page" | "404-or-missing";

export type Currency = "COP" | "USD" | "EUR" | string; // ISO-4217, validated

export interface ConversionAssumption {
  readonly targetCurrency: "COP";
  /** COP per one unit of sourceCurrency. Integer for COP; float with at most 2 decimals otherwise. */
  readonly exchangeRateCopPerUnit: number;
  readonly rateSource: string;
  readonly rateAsOf: string; // timezone-aware ISO-8601
  readonly notes: string;
}

export interface Offer {
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;          // absolute http(s); never fetched
  readonly sourceCurrency: Currency;
  readonly listedAmount: number;       // in sourceCurrency
  readonly shippingImportTaxCop?: number;
  readonly conversionAssumption?: ConversionAssumption; // required if sourceCurrency !== "COP"
  readonly normalizedCostCop?: number;                  // required if sourceCurrency !== "COP"
  readonly sellerCondition: string;
  readonly availability: Availability;
  readonly checkedAt: string;          // timezone-aware ISO-8601
  readonly evidenceStatus: EvidenceStatus;
  readonly imageUrl?: string;         // external, optional
  readonly notes?: string;
}

export interface CatalogComponent {
  readonly id: string;
  readonly category: ComponentCategory;
  readonly brand: string;
  readonly model: string;
  readonly name: string;               // derived when JSON omits it
  readonly specs: Readonly<Record<string, string>>;
  readonly compatibility: CompatibilityFields;
  readonly priceStatus: PriceStatus;
  readonly imageUrl?: string;
  readonly availability: Availability;  // explicit OR derived from offers
  readonly notes?: string;
  readonly offers: readonly Offer[];
  /**
   * Deterministic COP reference chosen by `reference-selection.ts`.
   * `undefined` exactly when priceStatus === "unconfirmed".
   * Carries the chosen offerId, retailer, sourceUrl, checkedAt so the UI
   * can show "lowest verified COP" provenance next to the number.
   */
  readonly reference?: {
    readonly offerId: string;
    readonly retailer: string;
    readonly sourceUrl: string;
    readonly checkedAt: string;
    readonly referencePriceCop: number;
    /** true when chosen via USD → COP documented conversion; false for direct COP offers. */
    readonly convertedFromForeignCurrency: boolean;
  };
}

export type CatalogService = Provenance &
  { readonly id: string; readonly slug: string; readonly name: string;
    readonly description: string; readonly icon?: string; readonly tier?: string } &
  ( | { readonly status: "confirmed"; readonly feeCop: number }
    | { readonly status: "recommended"; readonly recommendedMinCop: number;
        readonly recommendedMaxCop: number; readonly confirmationNote: string }
    | { readonly status: "reference"; readonly referencePriceCop?: number;
        readonly referenceNote: string } );

export interface CatalogPrebuild {
  readonly slug: string;
  readonly name: string;
  readonly tier: "essentials" | "creator" | "apex";
  readonly tagline: string;
  readonly componentIds: readonly string[];
  readonly serviceId: string;          // resolves to a CatalogService, used for non-fee metadata
  readonly pricingPolicyId: string;    // resolves to a PricingPolicy; fee comes from policy.confirmedService
  readonly featured: boolean;
  readonly badge?: string;
}

export interface ConfirmedPolicyService extends Provenance {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly tier?: string;
  readonly feeCop: number;
  readonly confirmationNote?: string;
}

export interface PricingPolicy {
  readonly id: string;
  readonly label: string;
  readonly fixedMarginCop: number;
  readonly percentageMargin: number;
  readonly confirmed: boolean;
  readonly note?: string;
  readonly confirmedService?: ConfirmedPolicyService;
}

export interface Catalog {
  readonly schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  readonly components: readonly CatalogComponent[];
  readonly services: readonly CatalogService[];
  readonly prebuilds: readonly CatalogPrebuild[];
  readonly policies: readonly PricingPolicy[];
  readonly defaultPolicyId: string;
  readonly staleAfterDays: number;
  readonly byComponentId: ReadonlyMap<string, CatalogComponent>;
  readonly byServiceId: ReadonlyMap<string, CatalogService>;
  readonly byPolicyId: ReadonlyMap<string, PricingPolicy>;
  readonly byPrebuildSlug: ReadonlyMap<string, CatalogPrebuild>;
}

export interface RawCatalogInput {
  readonly schemaVersion: number;
  readonly components: readonly unknown[];
  readonly services: readonly unknown[];
  readonly prebuilds: readonly unknown[];
  readonly policy: unknown;
}
```

### 4.1 · Validation result contract (unchanged)

```ts
export interface CatalogIssue {
  readonly file: string;
  readonly path: string;       // e.g. "components[3].offers[0].sourceUrl"
  readonly message: string;
}

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] };
```

`validate.ts` is pure and total — it never throws, never logs, never
touches the network or the filesystem, and it aggregates every issue
across every layer so a maintainer fixes one round of errors per build.
**No network code is permitted** anywhere in `src/lib/catalog/**` or
`src/lib/quotes/**`; `sourceUrl` and `imageUrl` are read as opaque
strings. `validate` enforces:

- per-component rules (§3.1);
- per-offer rules (§3.2);
- the `priceStatus` ↔ offers consistency rules (§3.3);
- the availability roll-up rule (§3.4);
- the source-URL placeholder/empty-hostname pattern rejection
  (§3.2); the regex is `^https?://host(/.*)?/p$` (matches `host/<slug>/p`
  placeholders) plus a separate empty-hostname check via `new URL()`;
- the cross-document checks unchanged from the prior design;
- per-component `offerId` uniqueness;
- per-document `id`/`slug` uniqueness.

### 4.2 · Hand-written validators (decision D-2)

The project has zero validation dependencies today, ships pure SSG
output, and the schema is small and stable. A hand-written validator
keeps the dependency graph unchanged, guarantees the exact `file` +
`path` error text the spec requires, and is itself directly
unit-testable. If the schema later grows branching variants beyond the
service union, revisiting Zod is a cheap follow-up because
`ValidationResult` is the only boundary contract.

---

## 5 · Loading strategy (largely unchanged)

`src/lib/catalog/load-catalog.ts`:

```ts
import componentsDoc from "@/data/catalog/components.json";
import servicesDoc from "@/data/catalog/services.json";
import prebuildsDoc from "@/data/catalog/prebuilds.json";
import policyDoc from "@/data/catalog/pricing-policy.json";

export class CatalogValidationError extends Error {
  readonly issues: readonly CatalogIssue[];
  constructor(issues: readonly CatalogIssue[]) {
    const head = issues[0]
      ? `catalog validation failed: ${issues[0].file} → ${issues[0].path} (${issues[0].message})`
      : "catalog validation failed";
    super(head);
    this.name = "CatalogValidationError";
    this.issues = issues;
  }
}

/** Pure: validates already-parsed documents. Used directly by tests with fixtures. */
export function buildCatalog(input: RawCatalogInput): ValidationResult<Catalog>;

/** Build-time singleton. Throws CatalogValidationError listing file + path + message. */
export const catalog: Catalog;
```

- **Static `import` of JSON, not `fs.readFile`** (decision D-4).
  Vite/Astro inlines the JSON at build time, so the emitted static site
  contains only the already-derived values — no runtime read, no
  bundled reader.
- `buildCatalog()` is exported separately from the `catalog` singleton
  so tests can drive it with fixtures without importing the real
  documents, and so the singleton's throw-on-invalid behaviour is the
  only impure part of the module.
- The loader performs three extra steps after the per-record
  validations pass:
  1. Per-component `offerId` uniqueness.
  2. Deterministic reference-offer selection (§6) for every component.
  3. Stale-status downgrade (§8.1): if every `confirmed` offer of a
     `verified` component is stale, the loader downgrades
     `priceStatus` to `provisional` for the build only, so a stale
     verified catalog does not silently produce a final quote labelled
     "verified". The maintainer's JSON keeps its declared status; the
     runtime `CatalogComponent.priceStatus` reflects the downgrade.
- The loader returns frozen arrays and maps (`Object.freeze`,
  `ReadonlyMap`) so no UI surface can mutate catalog state.

---

## 6 · Deterministic reference-offer selection

`src/lib/catalog/reference-selection.ts` (new) selects, for each
component, the single offer whose `listedAmount` (+ `shippingImportTaxCop`
adjustment) becomes the component's `referencePriceCop` in the quote
engine. The selection rule is **deterministic** (no randomness, no
"current best offer"), and **never silently uses a foreign-currency
offer** as a COP price.

### 6.1 · Selection algorithm

Inputs: the component's `offers[]` and its `priceStatus`.

1. If `priceStatus === "unconfirmed"` → `reference` is `undefined`. The
   quote engine emits `price-unconfirmed`.
2. Filter the offers by `evidenceStatus === "confirmed"`. The
   `category-page` and `404-or-missing` offers are evidence of search
   availability only; they MUST NOT contribute to `referencePriceCop`
   (spec: *Category and listing page evidence*).
3. **Step A — verified COP local offers:** take every confirmed offer
   whose `sourceCurrency === "COP"`. If any exist, the lowest
   `listedAmount` (with `shippingImportTaxCop` defaulted to `0` only
   when the offer's `notes` say "sin envío" or "incluye envío") is
   chosen. The chosen `offerId`, `retailer`, `sourceUrl`, and
   `checkedAt` are returned alongside `referencePriceCop`. The flag
   `convertedFromForeignCurrency` is `false`.
4. **Step B — explicit landed-cost conversion:** only if Step A
   produced zero candidates, take the confirmed non-COP offers whose
   `normalizedCostCop` cross-checks against their
   `conversionAssumption` (§6.3) and whose `notes` carry an explicit
   landed-cost phrase (`"incluye envío + arancel"`, `"landed cost"`,
   `"precio en COP con envío e impuestos"`, …). The lowest
   `normalizedCostCop` wins. `convertedFromForeignCurrency` is `true`.
5. **Step C — `unconfirmed` fallback:** if both steps produced nothing,
   `reference` is `undefined` regardless of the declared `priceStatus`.
   The validator already rejects this case for `priceStatus === "verified"`,
   so a `verified` component always reaches either Step A or Step B; the
   failure mode is reserved for `provisional` components whose offers
   are all category-page or 404, in which case the quote UI surfaces
   the "precio provisional sin evidencia confirmada" notice instead of
   a number.

The selector MUST run at load time so every quote has a stable reference
without re-traversing the offer list at quote time.

### 6.2 · Determinism guarantee

For a fixed `offers[]` and fixed `priceStatus`, the selector returns
the same `reference` regardless of platform, Node version, or build
order. The selector:

- sorts offers inside each step by `(referencePriceCop, offerId)`
  lexicographically when ties exist, so two offers at the same COP
  resolve to the same `offerId` on every machine;
- never calls `Date.now()` (freshness is a separate concern handled
  by §8.1 and the catalog freshness module).

### 6.3 · Conversion cross-check

For an offer with `sourceCurrency !== "COP"`, the validator computes
the expected COP figure using the maintainer-supplied
`conversionAssumption`:

```
expected = round( listedAmount * exchangeRateCopPerUnit ) + shippingImportTaxCop
expected = expected - (expected % 1)          // integer truncation
```

and rejects the offer (with a clear `path:
components[i].offers[j].normalizedCostCop` issue) when the supplied
`normalizedCostCop` differs from `expected` by more than COP 1 000 to
absorb rounding noise without hiding a real mistake. The intent is to
catch a maintainer who writes `normalizedCostCop: 471900` while the
TRM + shipping math says COP 451 900; this is the kind of bug the spec
calls "incorrect commercial policy" and the validator is the place to
catch it.

### 6.4 · ReferenceOffer contract (for the quote engine)

```ts
export interface ReferenceOffer {
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly referencePriceCop: number;
  readonly convertedFromForeignCurrency: boolean;
  readonly originalCurrency: Currency;
  readonly originalListedAmount: number;
}
```

The quote engine reads `component.reference.referencePriceCop` (not
`offer.listedAmount`) so a USD-listed Amazon offer cannot accidentally
become a COP subtotal just because `listedAmount: 109` happened to be
the smallest number on the component.

---

## 7 · Migration of existing consumers

### 7.1 · Adapter boundary

`src/lib/catalog/adapters.ts` already maps validated catalog records
onto the existing `src/data/types.ts` shapes. With the multi-offer
shape, the adapters are updated to:

- `toLegacyComponent(c)` — assigns `price = c.reference?.referencePriceCop ?? 0`
  when `c.priceStatus !== "unconfirmed"`, and **throws** when
  `c.priceStatus === "unconfirmed"` (the legacy `Component` shape has
  no way to express "no published price"; the adapter surfaces the
  `price-unconfirmed` error so the configurator renders the gap). The
  `availability` field is the component-level roll-up; `notes` is
  joined with the chosen reference's `notes` for the configurator
  tooltip.
- `toLegacyService(s)` — unchanged.
- `toLegacyPrebuilt(p, cat)` — `basePrice = quote.finalTotalCop`. The
  `serviceFeeCop` comes from `policy.confirmedService.feeCop` (which
  is the confirmed Professional Bogotá COP 150 000 by default), not
  from `services.json`, per §3.7.

`src/data/components.ts`, `src/data/prebuilds.ts`, and
`src/data/services.ts` collapse to the same thin adapter re-exports
the prior design landed. Every currently exported symbol
(`components`, `cpus`, `gpus`, `motherboards`, `rams`, `storages`,
`psus`, `coolers`, `prebuilds`, `services`) keeps its name, type, and
readonly-ness. **Zero page or component file has to change** to keep
building.

The legacy `Component` interface keeps its flat compatibility fields;
the adapter spreads `c.compatibility` onto the result so
`src/lib/compatibility.ts` needs no change at all.

### 7.2 · `basePrice` semantics

`PrebuiltPC.basePrice` continues to be derived:
`toLegacyPrebuilt` calls `calculateQuote` for the prebuild and assigns
`quote.finalTotalCop`. The JSDoc notes that the field is computed and
"do not hand-edit". The parity test (§9 row 9) continues to assert
`tier ordering` and `finalTotalCop >= componentSubtotalCop`, not equality
with the prior round numbers.

### 7.3 · Phasing

1. JSON documents land with the new `offers[]` shape alongside any
   prior single-record shape (the validator refuses the prior shape
   outright, so the prior JSON must be replaced before this commit
   merges). Nothing imports the new shape yet.
2. Loader + validators + reference-selector + quote engine update land
   with tests; still nothing imported by pages.
3. `src/data/{components,prebuilds,services}.ts` are swapped to the
   updated adapter re-exports in a single commit — this is the only
   moment the running site changes behaviour.
4. New multi-offer provenance / breakdown UI is added on top.

### 7.4 · Migration of the 31 existing products

The current `src/data/catalog/components.json` carries 31 product
records. Each is migrated as follows:

- The existing single observation becomes a **single-element `offers[]`**.
  Its `offerId` is the existing component id + a `-primary` suffix
  (e.g. `cpu-amd-ryzen-5-5600-primary`). A second observation, where one
  exists (e.g. an Amazon USD offer for the same SKU), is appended as
  `…-secondary`.
- The component's `priceStatus` is computed by the migration script
  using the offer's `evidenceStatus` and URL shape, with this default
  policy (a maintainer can override per record):

  | Existing URL pattern | Inferred `evidenceStatus` | Inferred `priceStatus` |
  | --- | --- | --- |
  | Placeholder `host/<slug>/p` (none survived the prior correction pass, but the validator re-checks) | `404-or-missing` | `unconfirmed` |
  | Search/listado URL (`/listado.mercadolibre.com.co/`, `/cpu-…`, `?q=…`) | `category-page` | `provisional` (search evidence) |
  | Category page (`/gpu/nvidia/`, `/procesadores/`) | `category-page` | `provisional` (search evidence) |
  | Exact MercadoLibre `/p/MCO…` SKU page with `listedAmount` in COP and provenance already at `2026-09-04T00:00:00-05:00` | `confirmed` | `verified` |
  | Exact retailer SKU page (Ktronix, Alkosto, Kingste, Speed Logic, PC Masters, Mi PC, Discos Duros, Microsoft) with `listedAmount` in COP and provenance at `2026-09-04T00:00:00-05:00` | `confirmed` | `verified` |
  | Exact Amazon `/dp/…` URL with `listedAmount` in USD, `shippingImportTaxCop`, `conversionAssumption`, and `normalizedCostCop` documented | `confirmed` | `verified` |
  | Exact Amazon `/dp/…` URL with `listedAmount` in USD and no documented conversion | `confirmed` | `provisional` (Step B is skipped) |
  | URL last verified at `2025-02-18T00:00:00-05:00` and not refreshed in this pass | per the row above | `provisional` (stale evidence) |

- `shippingImportTaxCop` is recorded as `0` for the COP local offers
  whose notes already say "sin envío" or "incluye envío"; for foreign
  offers it is the documented landed-cost delta (e.g. COP 25 000 for
  Amazon USA → Bogotá with shipping + simple declaration).
- `conversionAssumption` is recorded for every non-COP offer. Where
  the maintainer has not yet documented a rate, the offer migrates
  with `conversionAssumption: undefined` and the component is
  `provisional` per the table; the maintainer's editorial job is to
  fill it in later. **No `listedAmount` is invented.**

Expected outcome after migration of the 31 records (recorded as an
**expected** count pending the run-up — the maintainer confirms in PR 2):

| Category | Total | `verified` | `provisional` | `unconfirmed` |
| --- | --- | --- | --- | --- |
| CPU | 6 | ≥ 2 | ≥ 3 | ≥ 1 |
| GPU | 4 | ≥ 1 | ≥ 2 | ≥ 1 |
| Motherboard | 4 | ≥ 1 | ≥ 3 | ≥ 0 |
| RAM | 3 | ≥ 1 | ≥ 2 | ≥ 0 |
| Storage | 5 | ≥ 2 | ≥ 2 | ≥ 1 |
| PSU | 4 | ≥ 1 | ≥ 3 | ≥ 0 |
| Case | 3 | ≥ 1 | ≥ 2 | ≥ 0 |
| Cooler | 2 | ≥ 1 | ≥ 1 | ≥ 0 |
| **Total** | **31** | **≥ 10** | **≥ 18** | **≥ 3** |

The numbers are lower bounds, not targets — the maintainer can promote
records to `verified` by hand after this change by adding a second
`evidenceStatus: "confirmed"` `offerId` with a documented conversion or
by replacing a search URL with an exact SKU URL. The integrity test
asserts the **structure** of the migration (≥ 1 `verified`, ≥ 1
`provisional`, ≥ 1 `unconfirmed` per category with at least three
records; every component has a non-empty `offers[]`) and the **shape**
of every record, but does not assert the exact counts above — those
are documented as a planning summary only.

The migration script is a one-shot Node script under
`scripts/migrate-multi-offer.mjs`; it is run by the maintainer before
PR 2 opens and is not invoked at build time.

### 7.5 · Rollback

Step 3 of §7.3 is a single, self-contained commit. Reverting it
restores the hardcoded constants; the JSON documents and
`src/lib/catalog/**` can stay in the tree harmlessly because nothing
else imports them. There is no persistent data, no schema migration,
and no route change, so a deploy rollback to the previous static
build is always sufficient.

---

## 8 · Quote engine

`src/lib/quotes/quote-types.ts`:

```ts
export interface QuoteRequest {
  readonly componentIds: readonly string[];
  readonly pricingPolicyId: string;     // serviceId dropped from the request — fee comes from policy.confirmedService
}

export interface QuoteLine {
  readonly kind: "components" | "service" | "fixed-margin" | "percentage-margin" | "total";
  readonly label: string;       // es-CO label
  readonly amountCop: number;
  readonly rate?: number;       // for percentage-margin lines
}

export interface OfferStaleWarning {
  readonly componentId: string;
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly ageDays: number;
}

export interface ReferenceProvenance {
  readonly componentId: string;
  readonly offerId: string;
  readonly retailer: string;
  readonly sourceUrl: string;
  readonly checkedAt: string;
  readonly referencePriceCop: number;
  readonly convertedFromForeignCurrency: boolean;
}

export interface Quote {
  readonly componentSubtotalCop: number;
  readonly serviceFeeCop: number;
  readonly fixedMarginCop: number;
  readonly percentageMarginCop: number;
  readonly marginAmountCop: number;
  readonly finalTotalCop: number;
  readonly percentageMarginRate: number;
  readonly lines: readonly QuoteLine[];
  readonly staleWarnings: readonly OfferStaleWarning[];
  readonly referenceProvenance: readonly ReferenceProvenance[];  // one per referenced component
}

export type QuoteErrorCode =
  | "unknown-component" | "unknown-policy"
  | "service-not-confirmed" | "empty-selection"
  | "price-unconfirmed" | "policy-has-no-confirmed-service";

export interface QuoteError {
  readonly code: QuoteErrorCode;
  readonly id: string;
  readonly message: string;
}

export type QuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly errors: readonly QuoteError[] };
```

`src/lib/quotes/calculate-quote.ts`:

```ts
export function calculateQuote(
  request: QuoteRequest,
  catalog: Catalog,
  now: Date,                       // injected — never Date.now() inside
): QuoteResult;
```

### 8.1 · Algorithm

1. Resolve each `componentId` → `unknown-component` error per missing
   id. Empty selection → `empty-selection`. **A component with
   `priceStatus === "unconfirmed"` MUST NOT contribute**; the function
   emits `price-unconfirmed` for that id and accumulates the error.
2. Resolve `pricingPolicyId` → `unknown-policy`. When the policy has
   no `confirmedService`, emit `policy-has-no-confirmed-service`; the
   `serviceFeeCop` is taken from `policy.confirmedService.feeCop`,
   never from `services.json`.
3. `componentSubtotalCop = Σ component.reference.referencePriceCop`
   over the `verified`/`provisional` components. Foreign-currency
   offers contribute their documented `normalizedCostCop` only after
   Step B of §6 — the engine never reads `offer.listedAmount`
   directly, only `component.reference.referencePriceCop`.
4. `serviceFeeCop = policy.confirmedService.feeCop`.
5. `fixedMarginCop = policy.fixedMarginCop` (already normalised to `0`
   when unconfigured).
6. `percentageMarginCop = halfUpDivide(componentSubtotalCop * bps,
   10_000)` where `bps = Math.round(policy.percentageMargin * 100)`.
7. `marginAmountCop = fixedMarginCop + percentageMarginCop`.
8. `finalTotalCop = componentSubtotalCop + serviceFeeCop + marginAmountCop`.
9. Build `lines` in disclosure order and collect `staleWarnings` from
   `freshness.ts`. Build `referenceProvenance[]` (one per referenced
   component) so the breakdown UI can render "Amazon USD · $109 →
   COP 471 900" beside the line item.

All errors are accumulated and returned together; the function never
throws and never partially computes on failure.

### 8.2 · Stale-status downgrade

`freshness.ts` evaluates per-offer staleness against
`catalog.staleAfterDays`. When **every** `confirmed` offer of a
`verified` component is stale, the loader downgrades the component to
`provisional` for the build (decision D-9). The quote engine continues
to use `reference.referencePriceCop` but the rendered
`priceStatusBadge` flips to "precio provisional · verificar antes de
comprar", and the per-offer `OfferStaleWarning` carries the
`checkedAt`, `ageDays`, and `retailer`. Components that started as
`provisional` continue to render the provisional badge; the downgrade
only ever moves **toward** provisional, never back toward verified.

### 8.3 · Half-up COP rounding (D-3)

Unchanged from the prior design. Percentage margin is converted to
integer basis points and rounded half-up via `halfUpDivide`.

### 8.4 · Configurator integration

`Configurator.tsx` continues to call `calculateQuote` with the
selected component ids and the default policy. It now renders a
multi-offer provenance block per component (cheapest first) and a
"precio provisional" badge for any provisional reference. When the
selected policy has no `confirmedService`, the configurator renders
the "pendiente de confirmación" notice and **withholds the final total**
rather than inventing one — the same rule as the build-time path.

---

## 9 · Freshness, provenance, and image policy

### 9.1 · Freshness

`src/lib/catalog/freshness.ts`:

```ts
export function ageInDays(checkedAt: string, now: Date): number;
export function isStale(checkedAt: string, staleAfterDays: number, now: Date): boolean;
export function staleWarningsForComponent(
  component: CatalogComponent,
  staleAfterDays: number,
  now: Date,
): readonly OfferStaleWarning[];
```

`now` is always injected. Tests pin it to a fixed instant; Astro
pages pass `new Date()` at build time.

Staleness is a **per-offer warning**, not a validation failure. A
stale offer still renders, labelled with `offerId`, `checkedAt`,
`ageDays`, and `retailer`. A `verified` component with every confirmed
offer stale is **downgraded** to `provisional` for the build (§8.2).

### 9.2 · `PriceProvenance.astro` — multi-offer renderer

Renders, for any displayed reference price:

- `Precio observado (COP)` + the `referencePriceCop` from the
  reference-selector;
- a **multi-offer table** whose first row is the chosen reference
  (with a "menor COP verificado" badge when the offer is the lowest
  among the confirmed COP offers), and subsequent rows are the
  remaining offers (Amazon USD, MercadoLibre COP, Ktronix COP, etc.)
  with each row's `retailer`, `sourceCurrency`, `listedAmount`,
  `evidenceStatus`, `checkedAt`, and stale badge if applicable;
- the `sourceUrl` of the chosen reference as
  `rel="nofollow noopener external"` link;
- a "precio provisional" badge for any provisional component, and
  a "precio no confirmado" badge (with no exact number) for any
  unconfirmed component;
- the fixed caveat string `PRICE_VARIATION_NOTICE`, which lives in
  one exported constant in `src/lib/money.ts` so catalog pages,
  prebuild pages, the configurator, and the quote breakdown all show
  identical wording.

The caveat copy explicitly explains the marketplace ambiguity called
out in the spec:

> Los precios observados varían según vendedor, stock, garantía,
> envío, impuestos, moneda y fecha. Los precios de Amazon suelen
> estar en USD y requieren asunción de envío, arancel e IVA antes de
> normalizar a COP; los precios de MercadoLibre Colombia y de los
> retailers locales están en COP pero pueden variar en envío, IVA y
> garantía. Este valor es una observación, no un precio garantizado.
> Verificar antes de comprar.

### 9.3 · `ExternalImage.astro`

Unchanged from the prior design (decision D-8). Plain `<img>` with
`loading="lazy"`, `decoding="async"`, `referrerpolicy="no-referrer"`.
Never `astro:assets` `<Image>`, because remote-image optimization
would fetch the URL at build time. No `imageUrl` → render the
deterministic fallback immediately (category glyph + brand/model
text on a neutral tile). `imageUrl` present but unreachable at view
time → the same fallback is swapped in by a tiny inline `onerror`
handler that toggles a CSS class. This is presentation-only; catalog
data and quote math are unaffected.

---

## 10 · Test plan (strict TDD)

`vitest.config.ts` needs no change: `include: ["src/**/*.{test,spec}.{ts,tsx}"]`
already matches, and `coverage.include: ["src/lib/**"]` already covers
every new module at the 80 % statement threshold.

Fixtures live in `src/lib/catalog/__fixtures__/`. The new test surface
adds:

- `valid-multi-offer.json` — a Ryzen 5 5600 with one MercadoLibre COP
  and one Amazon USD offer, both `evidenceStatus: "confirmed"`, with
  a documented `conversionAssumption` and `normalizedCostCop` that
  cross-checks; `priceStatus: "verified"`.
- `unconfirmed-multi-offer.json` — a component whose only offers are
  `category-page`; `priceStatus: "unconfirmed"`; reference is
  `undefined`; the quote engine emits `price-unconfirmed`.
- `provisional-multi-offer.json` — a component with one Amazon USD
  `confirmed` offer whose `conversionAssumption` is missing;
  `priceStatus: "provisional"`; reference picks Step A (zero COP local
  offers) so the reference is `undefined` (Step B is skipped); the
  quote breakdown renders the "precio provisional" notice.
- `placeholder-url.json` — an offer whose `sourceUrl` matches
  `^https?://host(/.*)?/p$`; validator fails with the exact
  `components[0].offers[0].sourceUrl` path.
- `empty-hostname.json` — an offer whose `sourceUrl` is
  `https:///path`; validator fails.
- `mismatch-normalized-cost.json` — an Amazon USD offer whose
  `normalizedCostCop` differs from the conversion math by more than
  COP 1 000; validator fails.
- `cross-confirmed-cop.json` — two COP confirmed offers on the same
  component; reference picks the lower `listedAmount`; a third offer
  with `evidenceStatus: "category-page"` is rendered as evidence only
  and is never picked.
- `stale-verified-downgrade.json` — a `verified` component whose only
  confirmed offer is stale; `freshness.ts` flags every offer stale;
  `loadCatalog` downgrades the runtime `priceStatus` to `provisional`
  while leaving the maintainer-authored `priceStatus` recorded.

RED-first ordering — each row's test file lands and fails before its
implementation exists:

| # | Test file | Defines |
| --- | --- | --- |
| 1 | `src/lib/money.test.ts` | `halfUpDivide` boundaries, `roundHalfUpCop`, integer-only output, `formatCop` es-CO output, `PRICE_VARIATION_NOTICE` non-empty and includes the Amazon-USD marketplace sentence |
| 2 | `src/lib/catalog/validate.test.ts` | Every component rule (§3.1) plus every offer rule (§3.2) including: missing `sourceUrl`/`retailer`/`sourceCurrency`/`listedAmount`/`sellerCondition`/`availability`/`checkedAt`/`evidenceStatus`; non-absolute and non-http URL; placeholder pattern `^https?://host(/.*)?/p$`; empty hostname; naive vs. timezone-aware ISO-8601; non-integer/negative `listedAmount` (COP) and `normalizedCostCop`; `sourceCurrency !== "COP"` without `conversionAssumption` or `normalizedCostCop`; `normalizedCostCop` cross-check delta > COP 1 000; `priceStatus` ↔ offers consistency (no `confirmed` offer but `priceStatus: "verified"` fails; `verified` with all foreign-currency offers without conversion fails); availability roll-up rule; optional `imageUrl` absent → valid; `imageUrl` malformed → invalid; service union rules (unchanged); policy rules (unchanged plus `policy.hasConfirmedService` enforcement); `staleAfterDays <= 0` → invalid. Asserts every issue carries a `file` and a `path` |
| 3 | `src/lib/catalog/load-catalog.test.ts` | `buildCatalog` on `valid-multi-offer.json` → ok with populated lookup maps; duplicate component ids / slugs / per-component `offerId` → fail; `schemaVersion` mismatch → fail; dangling `componentIds` / `serviceId` / `pricingPolicyId` / `defaultPolicyId` → fail; multiple independent errors reported in one pass; returned collections are frozen |
| 4 | `src/lib/catalog/reference-selection.test.ts` | Step A picks lowest confirmed COP `listedAmount`; Step B picks lowest cross-checked foreign offer when no COP local offer exists; `unconfirmed` yields `reference: undefined`; ties broken deterministically by `offerId`; Step B never runs when Step A produced a candidate; `category-page` and `404-or-missing` offers are never picked; conversion cross-check rejects mismatched `normalizedCostCop` |
| 5 | `src/lib/catalog/freshness.test.ts` | `ageInDays` across timezone offsets; exactly-`staleAfterDays` boundary is **not** stale, one day past **is**; warnings carry `offerId`, `retailer`, `checkedAt`, `ageDays`; `stale-verified-downgrade.json` causes the loader to downgrade `priceStatus` to `provisional` at build time; stale records still load |
| 6 | `src/lib/quotes/calculate-quote.test.ts` | The three worked spec scenarios verbatim (2 000 000 + 60 000 + fixed 150 000 = 2 210 000; 3 000 000 + 150 000 + 10 % = 3 450 000 with margin 300 000; 1 000 000 + 50 000 + 80 000 fixed + 5 % = 1 180 000 with margin 130 000). Plus: neither margin configured → both margin fields 0 and total = subtotal + fee; percentage margin excludes the service fee (changing `feeCop` must not change `percentageMarginCop`); `policy.confirmedService.feeCop` flows through unchanged; **the foreign-currency Amazon offer contributes its documented `normalizedCostCop`, not `listedAmount`, to the subtotal**; an `unconfirmed` component yields `price-unconfirmed`; a policy with no `confirmedService` yields `policy-has-no-confirmed-service`; `referenceProvenance[]` length equals referenced component count; multiple errors accumulate; determinism (same input + same `now` → deep-equal output) |
| 7 | `src/lib/quotes/quote-breakdown.test.ts` | `lines` contain each disclosed kind exactly once, are ordered components → service → fixed → percentage → total, the non-total line amounts sum to `finalTotalCop`, and the percentage line exposes its `rate` |
| 8 | `src/lib/catalog/adapters.test.ts` | `toLegacyComponent` preserves `referencePriceCop` into `price` verbatim when `priceStatus !== "unconfirmed"` and throws when it is; flattens `compatibility` so `validate()` from `src/lib/compatibility.ts` returns the same result as the legacy fixture; `toLegacyService` never surfaces a `recommended` range as a bare confirmed price; `toLegacyPrebuilt` derives `basePrice` from `calculateQuote(...).finalTotalCop` and uses `policy.confirmedService.feeCop` for the line item |
| 9 | `src/lib/catalog/catalog.integrity.test.ts` | Runs `buildCatalog` against the **real** `src/data/catalog/*.json`; asserts ok, unique component and offer ids, ≥ 1 verified, ≥ 1 provisional, ≥ 1 unconfirmed per category with ≥ 3 records (so the migration table in §7.4 is observable in CI), at least one component whose reference comes from a documented foreign-currency conversion, and that no `recommended` service is referenced as a prebuild `serviceId`. This is the gate that makes a hand-edit typo fail `pnpm test` before deploy |
| 10 | `src/lib/catalog/migration-parity.test.ts` | Component subtotals of each prebuild match the sum of the corresponding references' `referencePriceCop`; tier ordering `essentials < creator < apex` holds; `finalTotalCop >= componentSubtotalCop`; the legacy export surface (`components`, `cpus`, …, `prebuilds`, `services`) is still present and readonly |
| 11 | `src/components/configurator/Configurator.test.tsx` | Selecting parts renders the reconciled quote breakdown and the COP formatting; the multi-offer provenance block lists every offer of every selected component with the cheapest-COP badge; an `unconfirmed` component suppresses the final total and shows the owner-confirmation message; a policy with no `confirmedService` suppresses the final total; the variation caveat is present wherever a price is |

Existing `src/lib/compatibility.test.ts` and `src/lib/cn.test.ts` must
stay green untouched — they are the regression signal that the adapter
preserved the legacy shape.

---

## 11 · Decision log

| ID | Decision | Rationale | Rejected alternative |
| --- | --- | --- | --- |
| D-0 | COP is the sole customer currency; purge all ARS wording, add `src/lib/money.ts` | Repo says ARS but the business, the magnitudes, and the UI string all say COP; ambiguity is a live pricing hazard | Leaving comments as-is |
| D-1 | Service `status` is a three-state union where `recommended` cannot hold `feeCop` | Makes "never silently price a recommendation" structurally impossible to violate | A boolean `confirmed` flag next to an always-present `feeCop` |
| D-2 | Hand-written validators returning `ValidationResult`, no Zod | Zero new dependencies, exact `file` + `path` error text required by the spec, validators are themselves unit-testable | Adding Zod |
| D-3 | Percentage margin via integer basis points + `halfUpDivide` | Deterministic across machines; avoids float drift on COP magnitudes in the millions | `Math.round(subtotal * pct / 100)` |
| D-4 | Static `import` of JSON, not `fs.readFile` | Vite inlines at build time, guaranteeing no runtime read and no bundled filesystem code | Node `fs` in a loader |
| D-5 | Adapters preserve every legacy export name and type | Zero churn in consumer files; migration and rollback are each one commit | Rewriting all pages to the new catalog types at once |
| D-6 | Prebuild JSON stores identifiers only; `basePrice` is derived | Spec forbids a hand-entered total overriding the calculation | Keeping `basePrice` in JSON |
| D-7 | `now` is injected into all freshness/quote functions | Keeps the domain pure and the tests deterministic | Calling `Date.now()` internally |
| D-8 | Plain `<img>` with fallback, never `astro:assets` remote optimization | Remote optimization would fetch the URL at build time, which the spec forbids | `<Image src={remote} />` |
| D-9 | Staleness warns, missing provenance fails | Matches the spec split: stale data is still real evidence; unsourced data is not | Failing the build on stale records |
| D-10 | Components carry `offers[]`; each offer has its own retailer, currency, URL, and `evidenceStatus` | A single observation cannot represent Amazon USD + MercadoLibre COP + Ktronix COP for the same SKU; the spec requires multi-offer retention | Continuing the single-observation model |
| D-11 | `priceStatus` is a three-state product-level summary (`verified | provisional | unconfirmed`) with explicit promotion rules and a validator-enforced consistency check against `offers[]` | Auto-deriving `priceStatus` from offers (silently promotes a category-page-only record to `verified`); relying on a maintainer-only convention |
| D-12 | Reference-offer selection is deterministic Step A → Step B → `unconfirmed` | The spec forbids silent USD-as-COP and requires "verified COP local offer preferred; explicit landed-cost conversion; never silently use USD". A pure function of `offers[]` makes the rule testable | Picking the "newest" offer or the "lowest listedAmount" across currencies (silently uses USD) |
| D-13 | Conversion cross-check delta ≤ COP 1 000 in the validator | Catches a maintainer who wrote the wrong `normalizedCostCop` while absorbing rounding noise from TRM and shipping math | Refusing any non-zero delta (too strict) or accepting any delta (defeats the check) |
| D-14 | Confirmed Professional Bogotá COP 150 000 assembly fee and 20 % margin live on `pricing-policy.json.confirmedService` + `percentageMargin`, not on `services.json` or any component | Spec mandates "kept as separate policy data" and "never embedded in component observed cost"; the policy document is the single source the quote engine reads for fee + margin | Reusing the seeded `armado-basico` `recommended` record or hard-coding the fee in `calculate-quote.ts` |
| D-15 | Stale-status downgrade moves `verified` → `provisional` at build time only | Matches the spec split: stale data is still evidence but it cannot underwrite a "verified" badge that is no longer true; the maintainer's JSON keeps its declared status for transparency | Failing the build on stale records (rejects the spec split) or rendering stale `verified` badges (contradicts the spec) |
| D-16 | Validator rejects placeholder `host/<slug>/p` URLs and empty-hostname URLs without network calls | The spec requires "reject fake placeholders and 404 evidence; no network calls during runtime or build validation"; static regex + `new URL()` is the only way to satisfy both | A HEAD-request linter (would be a network call) |

---

## 12 · Open items for owner confirmation

1. The migration table in §7.4 records the **expected** count of
   `verified` / `provisional` / `unconfirmed` components per category
   after the multi-offer migration. The maintainer runs the migration
   script in PR 2 and confirms the actual counts; the integrity test in
   §10 row 9 asserts the **structure** (≥ 1 of each per populated
   category) but not the exact counts.
2. The `default` pricing policy's `percentageMargin` (`20`) and
   `fixedMarginCop` (`0`) are the confirmed commercial policy in this
   design. They MUST be confirmed before the derived prebuild totals
   are treated as commercial policy; the prior design's open item about
   the placeholder values is resolved by this revision.
3. The `confirmedService` block in `pricing-policy.json` (the
   Professional Bogotá COP 150 000 fee with its own
   `sourceUrl`/`lastVerified`/`confirmationNote`) is the **only**
   confirmed fee the quote engine accepts. The owner confirms the
   `sourceUrl` and `lastVerified` for the policy-level record before
   PR 2 merges; `services.json` continues to carry the
   `recommended`/`reference` Bogotá evidence without becoming a
   quotable fee.
4. Amazon USD offers require a documented TRM-style
   `conversionAssumption` (rate, date, source) and a
   `shippingImportTaxCop` delta before they contribute a COP
   reference. The maintainer fills these in per Amazon offer at the
   editorial workflow; until then the Amazon offer stays on the record
   as evidence but does not promote its component to `verified`.