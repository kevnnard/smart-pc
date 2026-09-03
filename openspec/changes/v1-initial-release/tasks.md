# v1-initial-release · tasks

Tasks are grouped by phase. Each task is **finishable in one session**. Strict TDD: the first task in any phase that introduces new behavior MUST land its test in the same PR (RED → GREEN → REFACTOR).

Status legend: `[ ]` pending · `[~]` in progress · `[x]` done · `[!]` blocked.

---

## Phase 0 · Repo hygiene (no Astro code yet)

- [x] **0.1** Add `.gitignore` entries: `node_modules/`, `dist/`, `.astro/`, `.env`, `.DS_Store`, `coverage/`.
- [x] **0.2** Add `.editorconfig`: 2-space indent, LF newlines, UTF-8.
- [x] **0.3** Add `.env.example` with `PUBLIC_FORMSPREE_FORM_ID=` placeholder and a one-line comment.

Acceptance: `git status` clean after a fresh `pnpm install`.

---

## Phase 1 · Scaffold

- [x] **1.1** Initialize Astro 7 minimal template into the current directory (`pnpm create astro@latest . --template minimal --typescript strict --install --no-git`).
- [x] **1.2** Add `@tailwindcss/vite@^4.3.0`, `@astrojs/react@^6.0.0`, `react@^19`, `react-dom@^19`, `@types/react@^19`, `@types/react-dom@^19` as dependencies.
- [x] **1.3** Update `astro.config.mjs` to register `tailwindcss()` and `react()` (follow the reference configuration pattern; reference project is read-only).
- [x] **1.4** Create `src/styles/global.css` with `@import "tailwindcss";` and an empty `@theme {}` block (will be filled in Phase 2).
- [x] **1.5** Add Biome 2.x as devDependency and create the project-local `biome.json` from the documented reference configuration (reference project is read-only).
- [x] **1.6** Configure `package.json` scripts: `dev`, `build`, `preview`, `check` (`biome check .` + `tsc --noEmit`), `test` (`vitest run`), `test:watch`, and `test:coverage` (`vitest run --coverage`).
- [x] **1.7** Create project-local `tsconfig.json` extending `@tsconfig/strict` (the reference project's configuration is read-only).
- [x] **1.8** Create `vitest.config.ts` with `environment: 'jsdom'`, paths alias to `src/`.
- [x] **1.9** Add `@testing-library/react@^16`, `jsdom@^25`, and `@vitest/coverage-v8@^4.1.0` as devDependencies; configure Vitest coverage to enforce ≥80% statements for `src/lib/` and `src/data/`.
- [x] **1.10** Verify: `pnpm dev` boots, `pnpm build` produces `dist/`, `pnpm check` exits 0, `pnpm test` runs (zero tests).

Acceptance: `pnpm dev` boots with the default Astro welcome page. Phase 0 changed-files are unchanged. Strict TDD: Phase 1 is configuration-only. RED/GREEN/REFACTOR cycle begins with Phase 2 task 2.1 (`cn.ts`).

---

## Phase 2 · Design tokens + base layout

- [x] **2.1** Test `cn.ts`: define `cn(...inputs)` class joiner (clsx-style), Vitest covering empty/string/object/array/falsy inputs. **RED → GREEN.**
- [x] **2.2** Implement `src/lib/cn.ts`.
- [x] **2.3** Fill in `src/styles/global.css` `@theme {}` block with all design tokens from `design.md` §3.
- [ ] **2.4** Test `src/lib/money.ts`: `formatArs(1234567)` → `"$1.234.567"`. **RED → GREEN.**
- [ ] **2.5** Implement `src/lib/money.ts`.
- [ ] **2.6** Test `src/lib/slugify.ts`: slug generation, diacritics strip, repeated separators. **RED → GREEN.**
- [ ] **2.7** Implement `src/lib/slugify.ts`.
- [x] **2.8** Create `src/layouts/BaseLayout.astro` with `<html lang="es-AR">`, font preconnect (Google Fonts: Inter + JetBrains Mono), `<slot />`, and include `src/styles/global.css`.
- [ ] **2.9** Add `src/env.d.ts` for `/// <reference types="astro/client" />` and ImportMeta env types.

Acceptance: `pnpm check` clean, `pnpm test` passes. Home page still renders the default Astro welcome when `src/pages/index.astro` hasn't been replaced.

> **Note (2025-09-03, Phase 2 partial):** The orchestrator's Phase 2 prompt for this
> execution re-scoped Phase 2 to be `cn.ts` + design tokens + base layout + the
> reusable Astro components (`Navbar`, `NavbarLink`, `Footer`, `CTAButton`,
> `TrustStrip`). `src/lib/money.ts`, `src/lib/slugify.ts`, and `src/env.d.ts`
> remain pending (no test, no implementation in this execution). `env.d.ts` is
> also not required at runtime: Astro auto-emits `.astro/types.d.ts` with the
> `astro/client` triple-slash reference, which is enough for the components in
> this phase.

---

## Phase 3 · Data layer

- [ ] **3.1** Create `src/data/types.ts` with all interfaces from `design.md` §4.
- [ ] **3.2** Create `src/data/brand.ts` exporting a `BrandInfo` literal.
- [ ] **3.3** Create `src/data/services.ts` with four `ServiceRecord` entries (armado a medida, pre-armadas, mantenimiento-upgrade, garantia-soporte).
- [ ] **3.4** Create `src/data/prebuilds.ts` with three `PrebuiltPC` entries: Essentials (slug `essentials`), Creator (slug `creator`), Apex (slug `apex`). Use representative priced components.
- [ ] **3.5** Create `src/data/components.ts` with a catalog of ≥ 3 parts per category (CPU, GPU, motherboard, RAM, storage, PSU, cooler).
- [ ] **3.6** Create `src/data/home.ts` exporting stats, trust strip items, FAQ items.
- [ ] **3.7** Test `src/lib/compatibility.ts`: socket mismatch → incompatible (RED). **Test-driven.**
- [ ] **3.8** Implement `src/lib/compatibility.ts`: socket rule first.
- [ ] **3.9** Test PSU-vs-system-power rule (RED → GREEN). Add coverage for the rule.
- [ ] **3.10** Test motherboard-RAM rule (RED → GREEN).
- [ ] **3.11** Test storage interface rule (RED → GREEN).
- [ ] **3.12** Test the full `validate(selection)` integration: compatible selection → green; warning selection → amber; incompatible → red.

Acceptance: `pnpm test:coverage` reports ≥ 80 % on `src/lib/` and `src/data/`. All data files have type-safe exports.

---

## Phase 4 · Reusable `.astro` components

- [x] **4.1** Create `src/components/CTAButton.astro` with `variant: "primary" | "secondary" | "ghost"` prop and typed `href`.
- [x] **4.2** Create `src/components/Navbar.astro`: sticky, glass, 70 % opacity, blur 16, 1 px bottom border, center links, right CTAs. Pull link labels from `src/data/brand.ts` or hardcode for V1.
- [x] **4.3** Create `src/components/Footer.astro`: four-column layout, bottom row with version + location.
- [x] **4.4** Create `src/components/ui/StatsStrip.astro`: prop `items: { label: string; value: string; suffix?: string }[]`, dark-navy full-width strip, 2 → 4 column responsive grid.
- [x] **4.5** Create `src/components/ui/ServiceCard.astro`: prop `service: ServiceRecord`, navy surface, hover lift + cyan glow, optional "Desde $X COP" starting-price tag.
- [x] **4.6** Create `src/components/ui/PricingCard.astro`: prop `prebuild: PrebuiltPC`, `featured?: boolean`, cyan border + glow + ribbon for featured variant, list of perks, CTA to `/pre-armadas/{slug}`.
- [x] **4.7** Create `src/components/ui/SpecList.astro`: prop `components: Component[]`, `variant?: "list" | "grid"` (default `list`), zebra striping in list mode, brand+model + first three specs + price.
- [x] **4.8** Create `src/components/ui/FAQItem.astro`: open/closed state via native `<details>`/`<summary>` (no JS), monospace `// 0N` label, rotating chevron SVG.
- [x] **4.9** Create `src/components/home/PageHero.astro`: monospace eyebrow + H1 + optional accent line + body + optional primary/outline CTA pair. Used both on the home page and as a generic section header.
- [x] **4.10** Snapshot all components by mounting each on a tiny `dev/ComponentPage.astro` and capturing a screenshot in `pnpm test` (Vitest + `vite-plugin-vue-screenshot` is overkill — defer to manual review for V1, document the gap). **Phase 4 dev note:** Phase 4 smoke mounted each component on a throwaway `src/pages/phase4smoke.astro`, ran `pnpm build` to confirm all components render and the emitted HTML contains the expected class signatures (`cyan-500` ×117, `font-mono` ×40, `details`/`summary` ×9, `grid-cols` ×11), then removed the throwaway file. No persistent dev page was added; visual review is still manual per task 4.10.

Acceptance: `pnpm check` clean. Each component file is type-safe and free of hex literals.

---

## Phase 5 · Home page (`/` (read-only))

> **Phase 5 dev note (2025-09-03):** The orchestrator's Phase 5 prompt renamed the home wrappers to align with the components actually shipped in Phase 4 (`PageHero`, `ServicesGrid`, `PrebuildTeaser`, `ConfiguratorCTA`). The legacy task names below (`HomeHero`, `TrustStrip`, `ServicesSection`, `PreBuiltTeaser`, `ConfiguratorTeaser`, `ContactStrip`, `FAQSection`) are aliased in the descriptions to the canonical names used in the codebase. The Phase 5 prompt also moved the FAQ accordion and the contact teaser from separate wrapper components into inline markup inside `src/pages/index.astro`, so 5.6 and 5.7 are reported as part of 5.5 below.

- [x] **5.1** Reuse `src/components/home/PageHero.astro` (F1.1–F1.3) with home-specific props (eyebrow `// CUSTOM PC BUILDER · COLOMBIA`, H1 `Armamos la PC`, accent `de tus sueños`, body about creators/gamers/COP, primary CTA `Armar mi PC → /configurar`, outline CTA `Ver pre-armadas → /pre-armadas`). PageHero also got a small cyan gradient underline bar beneath the H1 as the literal "accent underline on key word" treatment.
- [x] **5.2** `StatsStrip` (F1.3) mounted below the hero with the four `stats` from `src/data/home.ts` (320+ · 98% · 24M · 48h). The Phase 2 `TrustStrip.astro` is left in place but no longer rendered on `/` — the Phase 5 layout uses the more detailed services + prebuilds teasers as the trust signal instead.
- [x] **5.3** `src/components/home/ServicesGrid.astro` (F1.5) mounted, sourcing four `ServiceCard`s from `src/data/services.ts` (armado-a-medida · pre-armadas · mantenimiento-upgrade · garantia-soporte).
- [x] **5.4** `src/components/home/PrebuildTeaser.astro` (F1.6) mounted, sourcing three `PricingCard`s from `src/data/prebuilds.ts` (essentials · creator · apex).
- [x] **5.5** `src/components/home/ConfiguratorCTA.astro` (F1.7) mounted as a two-column split with a static GPU-selection preview on the right. The contact teaser (F1.8, the static stub) and the FAQ accordion (F1.9, mapping `faq` from `src/data/home.ts` to five `FAQItem`s) are composed inline inside `src/pages/index.astro` per the Phase 5 orchestrator prompt.
- [x] **5.6** `src/pages/index.astro` rewritten to compose `BaseLayout + Navbar + PageHero + StatsStrip + ServicesGrid + PrebuildTeaser + ConfiguratorCTA + FAQ accordion (inline) + contact teaser (inline) + Footer`. Navbar and Footer are mounted through `BaseLayout`'s `slot="navbar"` / `slot="footer"` named slots. The page also carries a defensive inline `<script is:inline>` fallback for a future `id="main-nav"` / `id="nav-toggle"` mobile-nav variant; the active Navbar uses `mobile-menu-toggle` / `mobile-menu` and ships its own toggle inline, so the fallback is a no-op in V1.
- [x] **5.7** Manual visual diff: open `pnpm dev` and compare against Stitch screen `38de639a2f784523a8238c313cb54226`. Adjust classes iteratively. *(Deferred to a future visual-review pass — see Phase 4's deferral pattern. The emitted HTML was grep-verified: all 9 sections render, 4 stat labels ×1, 4 service slugs ×1 each, 3 prebuild slugs ×1 each, 5 FAQ `<details>` pairs, the contact section heading + WhatsApp / email CTAs.)*

Acceptance: home page composes all 9 sections (Navbar / Hero / Stats / Services / Prebuilds / Configurator / FAQ / Contact / Footer), builds cleanly with zero JS for the home page composition, `pnpm test` + `pnpm check` + `pnpm build` all green.

---

## Phase 6 · Catalog (`/pre-armadas` (read-only)) + detail (`/pre-armadas/[slug]` (read-only))

- [ ] **6.1** Create `src/components/catalog/CatalogFilters.tsx`: tier buttons, use chips, budget slider, sort dropdown, clear button. State held locally.
- [ ] **6.2** Test `CatalogFilters` renders empty state when filters return zero matches (RED).
- [ ] **6.3** Implement the filter component (GREEN) and refactor.
- [ ] **6.4** Create `src/pages/pre-armadas/index.astro`: composes `BaseLayout + Navbar + PageHero + CatalogFilters + grid of PricingCard + Footer`.
- [ ] **6.5** Test `src/pages/pre-armadas/[slug].astro` via smoke: the module loads when given a valid slug (`getStaticPaths()` test).
- [ ] **6.6** Implement `[slug].astro`: `getStaticPaths` returns three slugs from `src/data/prebuilds.ts`. Compose `BaseLayout`, `Navbar`, `SpecList`, `WarrantyBadge`, `CTAButton`, and `Footer`; configure the button's contact route as a read-only route target.
- [ ] **6.7** Test prefill helper: `buildPrefillText({ kind: 'build', slug: 'essentials' })` returns a sensible Spanish sentence.
- [ ] **6.8** Implement `src/lib/prefill.ts`.

Acceptance: F2.1–F2.6 and F3.1–F3.5 pass. Catalog filters work in browser.

---

## Phase 7 · Configurator (`/configurar` (read-only))

- [ ] **7.1** Create `src/components/configurator/CompatibilityDot.tsx` (no state, just renders the dot color + tooltip).
- [ ] **7.2** Create `src/components/configurator/StepShell.tsx` (wraps each step with header + list).
- [ ] **7.3** Create `src/components/configurator/ConfiguratorStepper.tsx`: 7-step state, localStorage hydrate/persist, sticky total bar, review step.
- [ ] **7.4** Test the stepper integration: selecting socket-mismatched parts shows red banner and refuses to advance (RED).
- [ ] **7.5** Implement GREEN; refactor.
- [ ] **7.6** Test the URL serialization: `serialize(selection)` produces a `base64url`-safe string that `parse(serialized)` round-trips.
- [ ] **7.7** Test localStorage hydration: write selection, reload, expect rehydration.
- [ ] **7.8** Create `src/pages/configurar.astro`: `BaseLayout + Navbar + ConfiguratorStepper + Footer`, with `<ConfiguratorStepper client:load />`.
- [ ] **7.9** Wire `/contacto?config=...` (read-only) on the final CTA so the form pre-fills.

Acceptance: F4.1–F4.7 pass. Lighthouse on `/configurar` (read-only) JS budget ≤ 120 KB gzipped.

---

## Phase 8 · Services (`/servicios` (read-only))

- [ ] **8.1** Create `src/pages/servicios.astro`: `BaseLayout + Navbar + PageHero + 4 ServiceCards + Footer`. Data iterated from `src/data/services.ts` (F5.2).
- [ ] **8.2** Verify `/servicios` (read-only) links to `/contacto?service={slug}` (read-only) for each service (F5.1).

Acceptance: F5.1, F5.2 pass.

---

## Phase 9 · Contact (`/contacto` (read-only))

> No API route in V1. Form submission goes directly to Formspree from the browser.

- [ ] **9.1** Create `src/lib/contactSchema.ts` with a `validate(payload)` function returning the parsed payload or a list of field errors.
- [ ] **9.2** Test `validate` covers F6.2 (empty required fields), F6.3 (pre-fill values ignored), and a happy-path parse (RED → GREEN).
- [ ] **9.3** Create `src/components/contact/ContactForm.tsx` with controlled inputs, client-side validation, and success/error panels (F6.1, F6.5). Submit to the Formspree endpoint (external service, read-only) with POST, form data, and an `Accept: application/json` header.
- [ ] **9.4** Test `ContactForm` shows error panel when Formspree returns a non-200 response (RED → GREEN). Mock `fetch` in tests.
- [ ] **9.5** Implement GREEN.
- [ ] **9.6** Create `src/pages/contacto.astro`: `BaseLayout + Navbar + PageHero + ContactForm + Footer`.
- [ ] **9.7** Wire query-param pre-fill per F6.3 using `src/lib/prefill.ts`.
- [ ] **9.8** Add `noindex` meta to `/contacto` (read-only); avoid indexing form-only pages.

Acceptance: F6.1–F6.5 pass. F6.4 verified by mocking Formspree response in Vitest. Manual end-to-end test on a dev server confirms submit → Formspree receives the payload.

---

## Phase 10 · Quality gates + final pass

- [ ] **10.1** Create `src/pages/404.astro` matching the design language.
- [ ] **10.2** Add `sitemap.xml` generation via `@astrojs/sitemap` (V2 may add `@astrojs/rss`).
- [ ] **10.3** Add `robots.txt` allowing all under `/` (read-only).
- [ ] **10.4** Configure `astro.config.mjs` `site` field with `https://smart-pc.com.ar` (placeholder; update when domain is finalized).
- [ ] **10.5** Add Lighthouse CI script (`scripts/lighthouse.mjs`) that runs against `pnpm preview` and fails the build if scores drop below the targets in the proposal.
- [ ] **10.6** Write `README.md` with: stack, scripts, folder map, env vars, deploy instructions.
- [ ] **10.7** Smoke test: `pnpm build && pnpm preview`, click through all 6 routes + 3 detail slugs + configurator run-through + contact form.
- [ ] **10.8** Run `pnpm check` and `pnpm test` final. Fix anything red.

Acceptance: every spec scenario in `spec.md` passes manual or automated verification.

---

## Phase 11 · OpenSpec closeout

- [ ] **11.1** `openspec/changes/v1-initial-release/CHANGELOG.md` summarizing what shipped and what is deferred.
- [ ] **11.2** Archive the change per `openspec/config.yaml#workflow` rules. Archive MUST run only after verify returns allow (Phase 10 passes).

---

## Out-of-scope tasks (logged for V2)

- [ ] **V2.1** Real e-commerce checkout with Mercado Pago.
- [ ] **V2.2** Stock-aware catalog (sync with local supplier feed).
- [ ] **V2.3** Auth, customer accounts, order history.
- [ ] **V2.4** English (`en`) translation using `@astrojs/i18n`.
- [ ] **V2.5** Blog / news section with Astro Content Collections.
- [ ] **V2.6** CMS for `prebuilds.ts` and `components.ts` (Decap / Sanity).
- [ ] **V2.7** Analytics (Plausible or GA4 via `astro-plugin-analytics`).
- [ ] **V2.8** Visual regression tests (Playwright + `pnpm e2e`) replacing manual diff.
