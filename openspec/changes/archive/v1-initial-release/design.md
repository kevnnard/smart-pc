# v1-initial-release · design

This document describes the technical architecture for V1 of `smart-pc`. It explicitly **deviates from the three-trackr monorepo** because `smart-pc` is a single Astro app, not a Turbo monorepo. Every deviation cites the reason.

---

## 1 · Stack

Frozen for V1. Any change to these versions is a new proposal.

| Concern             | Version           | Source                                                  |
|---------------------|-------------------|---------------------------------------------------------|
| Astro               | `^7.2.0`          | `apps/three-trackr/package.json` (`astro@7.2.1`)        |
| `@tailwindcss/vite` | `^4.3.0`          | `apps/three-trackr/package.json` (`@tailwindcss/vite@4.3.3`) |
| `@astrojs/react`    | `^6.0.0`          | `apps/three-trackr/package.json`                        |
| React               | `^19.0.0`         | Latest stable                                           |
| TypeScript          | `^5.6.0`          | strict mode                                             |
| Biome               | `^2.0.0`          | replaces ESLint+Prettier                                |
| Vitest              | `^4.1.0`          | same version as three-trackr                            |
| `@testing-library/react` | `^16.0.0`   | for island component tests                              |
| pnpm                | `^11.0.0`         | declared in `package.json#packageManager`               |
| `sharp` (optional)  | `^0.33.0`         | Astro image pipeline default                            |

**Not used** (and why):
- `tailwind.config.js` — Tailwind v4 uses `@theme` blocks in CSS, no JS config.
- `@astrojs/tailwind` — deprecated in favor of `@tailwindcss/vite`.
- `@astrojs/node`, `@astrojs/vercel` — V1 ships static; no SSR/adapter needed.
- Any DB / ORM / GraphQL — V1 has no persistent data.

---

## 2 · Folder layout

Pattern matches `apps/three-trackr/src/` but flat (single package, no `apps/` or `packages/` split).

```
smart-pc/
├── astro.config.mjs             # Tailwind v4 plugin + React integration
├── biome.json                  # lint + format (single tool)
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json               # strict, jsx preserve, paths to src
├── vitest.config.ts
├── openspec/                   # SDD artifacts (this folder)
│   ├── config.yaml
│   └── changes/
│       └── v1-initial-release/
│           ├── proposal.md
│           ├── spec.md
│           ├── design.md
│           └── tasks.md
├── public/                     # static assets (favicons, og:image)
│   ├── favicon.svg
│   └── og/
└── src/
    ├── assets/                 # imported assets that go through Vite
    │   └── renders/            # PC render placeholders + future real images
    │       ├── essentials.svg
    │       ├── creator.svg
    │       └── apex.svg
    ├── components/             # Astro components and React islands
    │   ├── Navbar.astro
    │   ├── Footer.astro
    │   ├── CTAButton.astro
    │   ├── TrustStrip.astro
    │   ├── ServiceCard.astro
    │   ├── SpecList.astro
    │   ├── FAQItem.astro
    │   ├── PricingCard.astro
    │   ├── StatsStrip.astro
    │   ├── PageHero.astro
    │   └── home/               # section-level home components
    │       ├── HomeHero.astro
    │       ├── ServicesSection.astro
    │       ├── PreBuiltTeaser.astro
    │       ├── ConfiguratorTeaser.astro
    │       ├── FAQSection.astro
    │       └── ContactStrip.astro
    ├── # React islands (only when stateful)
    │   ├── configurator/
    │   │   ├── ConfiguratorStepper.tsx
    │   │   ├── StepShell.tsx
    │   │   └── CompatibilityDot.tsx
    │   ├── catalog/
    │   │   └── CatalogFilters.tsx
    │   └── contact/
    │       └── ContactForm.tsx
    ├── data/                   # typed static data sources
    │   ├── types.ts            # all interfaces (PC, Component, Service)
    │   ├── prebuilds.ts        # 3 curated builds
    │   ├── components.ts       # CPU/GPU/Mobo/RAM/Storage/PSU/Cooler
    │   ├── (no compatibility data module; rules are in src/lib/compatibility.ts)
    │   ├── services.ts         # 4 service records
    │   ├── home.ts             # home page copy: stats, trust, FAQ
    │   └── brand.ts            # wordmark, social handles, contact info
    ├── lib/                    # pure functions, framework-agnostic
    │   ├── cn.ts               # class name join helper
    │   ├── money.ts            # ARS formatting
    │   ├── compatibility.ts    # validate(selection): CompatibilityResult
    │   ├── slugify.ts
    │   └── prefill.ts          # build prefill text for /contacto?build=...
    ├── pages/                  # file = URL
    │   ├── index.astro          # /
    │   ├── pre-armadas/
    │   │   ├── index.astro      # /pre-armadas
    │   │   └── [slug].astro     # /pre-armadas/{slug}
    │   ├── configurar.astro     # /configurar
    │   ├── servicios.astro      # /servicios
    │   ├── contacto.astro       # /contacto
    │   ├── 404.astro
    │   └── [no API directory in V1]
    │       └── [no server-side contact handler]
    ├── layouts/
    │   └── BaseLayout.astro    # html, head, font preconnect, global styles
    ├── styles/
    │   └── global.css          # @import "tailwindcss"; @theme { ... }
    └── env.d.ts                # Astro type augmentations
```

---

## 3 · Design tokens

Source of truth: `src/styles/global.css`. Every component MUST use semantic Tailwind classes (`bg-bg`, `text-primary`, `border-outline`); raw hex outside `global.css` is forbidden.

### Colors

```css
@import "tailwindcss";

@theme {
  --color-bg:                  #0c1324;   /* Deep Navy — global */
  --color-bg-dim:              #0c1324;
  --color-bg-bright:           #33394c;
  --color-surface-lowest:      #070d1f;
  --color-surface-low:         #151b2d;
  --color-surface:             #191f31;
  --color-surface-high:        #23293c;
  --color-surface-highest:     #2e3447;

  --color-on-surface:          #dce1fb;
  --color-on-surface-variant:  #bbc9cd;

  --color-primary:             #8aebff;  /* light on dark */
  --color-on-primary:          #00363e;
  --color-primary-container:   #22d3ee;  /* SOLID cyan — CTAs, prices */
  --color-on-primary-container:#005763;

  --color-secondary:           #adc6ff;
  --color-secondary-container: #3b82f6;  /* Cobalt — nav, secondary */

  --color-tertiary:            #8b5cf6;  /* Violet — glow only */
  --color-tertiary-container:  #cbb5ff;

  --color-error:               #ffb4ab;
  --color-on-error:            #690005;

  --color-outline:             #859397;
  --color-outline-variant:     #3c494c;

  /* Shape */
  --radius-xs: 0.125rem;
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-full: 9999px;

  /* Typography */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SFMono-Regular", monospace;

  /* Spacing scale: 4px base, eight-point grid mirrored in Tailwind */
  --spacing: 0.25rem;

  /* Layout */
  --container-max: 1280px;
}
```

### Why `color-primary: #8aebff` and `color-primary-container: #22d3ee`

The distinction follows Material 3 conventions: `primary` is the on-dark readable tone (light cyan), `primary-container` is the solid fill (electric cyan). Components use `bg-primary-container text-on-primary-container` for primary buttons, and `text-primary` for highlights inside text.

### Typography classes

Defined inline in components, not in `@theme`, so they map 1:1 to Astro/HTML:

- `text-display-lg`  → Inter 700 56/64, -0.025em
- `text-headline-lg` → Inter 700 48/52, -0.04em
- `text-headline-md` → Inter 600 24/32
- `text-body-lg`     → Inter 400 18/28
- `text-body-md`     → Inter 400 16/24
- `text-body-sm`     → Inter 400 14/20
- `text-mono         → JetBrains Mono 12/16, all-caps, +0.1em tracking
- `text-price        → Inter 700 24/28

Component-level: a tiny `<style>` block per `.astro` or a `@layer components` block in `global.css` for repeated cases.

---

## 4 · Data model (`src/data/types.ts`)

All interfaces are exported and used by both `src/data/*.ts` data files and components. Total interface surface for V1:

```ts
// Tier enum
export type PC_TIER = "essentials" | "creator" | "apex";
export type USE_TAG = "home" | "office" | "creator" | "gaming" | "4k";

// A single component in the catalog (CPU, GPU, etc.)
export type COMPONENT_CATEGORY =
  | "cpu"
  | "gpu"
  | "motherboard"
  | "ram"
  | "storage"
  | "psu"
  | "cooler";

export interface PricedComponent {
  readonly id: string;                 // "cpu-7800x3d"
  readonly category: COMPONENT_CATEGORY;
  readonly brand: string;              // "AMD"
  readonly name: string;               // "Ryzen 7 7800X3D"
  readonly spec: string;               // "8C/16T · 4.2 GHz · 96W"
  readonly priceArs: number;           // integer ARS, no decimals
  readonly socket?: "AM5" | "LGA1700" | "AM4"; // only for cpu/mobo
  readonly wattage?: number;           // CPU TDP / GPU power / PSU capacity
      readonly capacityGb?: number;        // RAM module capacity
      readonly ramSlots?: number;          // motherboard DIMM slots
      readonly maxRamPerSlotGb?: number;   // motherboard DIMM capacity limit
      readonly storageInterface?: "nvme" | "sata";
      readonly supportedStorageInterfaces?: readonly ("nvme" | "sata")[];
  readonly tags?: readonly USE_TAG[];  // optional use classification
}

export interface PrebuiltPC {
  readonly slug: string;               // "essentials"
  readonly tier: PC_TIER;
  readonly tagline: string;            // "Home · Office · Estudio"
  readonly priceArs: number;
  readonly components: readonly PricedComponent[]; // 7 entries
  readonly renders: readonly string[]; // asset paths
}

// Service record
export interface ServiceRecord {
  readonly slug: string;               // "armado-a-medida"
  readonly title: string;
  readonly body: string;               // 3–5 lines
  readonly ctaLabel: string;
}

// Contact channel + brand
export interface BrandInfo {
  readonly wordmark: string;
  readonly tagline: string;
  readonly whatsapp: string;
  readonly instagram: string;
  readonly email: string;
  readonly location: string;
}

// FAQ
export interface FAQItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

// Compatibility
export type CompatibilityStatus = "compatible" | "warning" | "incompatible";
export interface CompatibilityIssue {
  readonly status: CompatibilityStatus;
  readonly message: string;            // rendered in red/amber banner
}
export interface CompatibilityResult {
  readonly status: CompatibilityStatus;
  readonly issues: readonly CompatibilityIssue[];
  readonly totalArs: number;
}
```

Strict typing and `readonly` ensures we do not mutate data at runtime.

---

## 5 · Configurator compatibility

### Rule matrix (`src/lib/compatibility.ts`)

Pure function, no React, no Astro. Tested with ≥ 80 % coverage:

```ts
export function validate(
  selection: Partial<Record<COMPONENT_CATEGORY, PricedComponent>>
): CompatibilityResult;
```

### Rule set (V1)

1. **CPU ↔ Motherboard socket** → must match exactly. Mismatch → `incompatible`.
2. **CPU TDP + GPU power ≤ PSU capacity × 0.85** (efficiency headroom) → `warning` if not satisfied.
3. **RAM count and total capacity ≤ motherboard slots × max-per-slot** → `warning` if not satisfied.
4. **Storage interface (NVMe vs SATA) supported by motherboard** → `incompatible` if not.

These rules cover the catalogued parts in V1. New parts added to `src/data/components.ts` MUST be paired with applicable rules.

### State persistence

`localStorage["smart-pc:configurator:v1"]` holds a JSON-serialized `Partial<Record<COMPONENT_CATEGORY, string>>` (component ids, not full objects). On boot, the stepper hydrates from localStorage and shows a toast *"Recuperamos tu configuración."* A `Reset` button clears it.

### Stepper as a React island

`ConfiguratorStepper.tsx` is the only `client:load` component on `/configurar`. State is React state + the `validate()` function called on every transition.

Total expected JS budget for the island (gzipped): ≤ 90 KB (React 19 + Zustand or `useReducer` only — no other deps).

---

## 6 · Contact form endpoint

The contact form on `/contacto` uses a **form service** (Formspree). The form submits a POST to the form service's API endpoint directly from the browser — no server-side code needed.

### Why form service over API route

Astro API routes (`src/pages/api/contact.ts`) require a server adapter (hybrid/SSR output). The proposal explicitly targets **100% static output** deployable to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.). A form service keeps the deployment fully static.

### Strategy

Selected: **Formspree** (generous free tier, easy setup, no backend).

```ts
// src/components/contact/ContactForm.tsx
// No API route. Submit directly to Formspree:
const response = await fetch(`https://formspree.io/f/${import.meta.env.PUBLIC_FORMSPREE_FORM_ID}`, {
  method: "POST",
  body: new FormData(event.currentTarget),
  headers: { Accept: "application/json" },
});
```

### Environment variables

- `PUBLIC_FORMSPREE_FORM_ID` — read from `import.meta.env` (PUBLIC_ prefix, injected by Vite)
- `RESEND_API_KEY` — removed from V1 (no longer needed; V1 does not send transactional email)

In local dev, `.env` is loaded (gitignored). `.env.example` documents the variables.

### Fallback

If `PUBLIC_FORMSPREE_FORM_ID` is unset, the submit button is hidden and a `mailto:hola@smart-pc.com?...` link is shown instead. This is the pure-static fallback for local development without a configured form service.

---

## 7 · Per-island contract

| Surface                          | Mechanism                                   | Hydration   |
|----------------------------------|---------------------------------------------|-------------|
| `/pre-armadas` filters            | `CatalogFilters.tsx` (React island)         | `client:visible` |
| `/configurar` stepper             | `ConfiguratorStepper.tsx` (React island)    | `client:load`    |
| `/contacto` form                 | `ContactForm.tsx` (React island)            | `client:idle`    |
| Everything else                  | `.astro` static components                  | none        |

This keeps the home page (and most pages) at zero JS shipped.

---

## 8 · Testing strategy

- **Unit tests** (`src/lib/**/*.test.ts`): `cn.ts`, `money.ts`, `compatibility.ts`, `slugify.ts`, `prefill.ts`. Vitest, no DOM.
- **Component tests** (`src/components/**/*.test.tsx`): React islands via `@testing-library/react`.
- **Smoke tests**: a single `routes.test.ts` that imports each `*.astro` page module and asserts that the module exports a default component (no SSR rendering — Astro is not ergonomic to test without an adapter, and V1 has no adapter).
- **Coverage threshold**: 80 % statements in `src/lib/` and `src/data/`.

---

## 9 · OpenSpec customizations

Three-trackr uses `schema: spec-driven` with strict TDD and a `review_budget_lines: 800`. For smart-pc V1 the work is smaller so the budget is `600`. The apply/verify cycle is identical.

---

## 10 · Decisions log

D1. **Drop monorepo, keep Astro pattern.** Three-trackr is a Turbo monorepo with API + app + docs; smart-pc is a single Astro app. We copy `apps/three-trackr/src/` shape verbatim, drop `pnpm-workspace.yaml` and `turbo.json`.

D2. **Static SSG, no SSR.** V1 data is read-only and AR-USD price volatility is tolerated. The contact form POSTs directly from the browser to Formspree; V1 has no server endpoint.

D3. **Tailwind v4 with `@theme`, not v3.** Direct match with three-trackr.

D4. **No CMS, no admin.** Catalog edits land through PRs. V2 may add Content Collections.

D5. **React only where stateful.** Home, services, build detail: zero JS. Catalog, configurator, contact: one React island each. Keeps Lighthouse perf ≥ 90.

D6. **Compatibility as a hand-curated matrix.** Real compatibility requires live part databases. V1 hand-curated. V2 may swap in PCPartPicker's data.

D7. **`localStorage` for configurator persistence.** No auth, no server state. Clear-and-restart pattern is acceptable for V1.

D8. **Spanish (Colombia) only.** Adds a tiny `es-AR` marker for future i18n but does not introduce dictionaries in V1.

D9. **Form service (Formspree) instead of API route.** V1 targets 100% static output with no server adapter. Contact form POSTs directly to Formspree's endpoint. No `src/pages/api/contact.ts`, no Resend SDK, no server-side code. This keeps the deployment fully static while still capturing form submissions. Resend is removed from V1 scope.
