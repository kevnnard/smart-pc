# v1-initial-release · proposal

## Why

`smart-pc` is the public site for a custom-PC building service based in Colombia. The owner needs a single site that does three things without ambiguity:

1. **Educate** — explain what the service is (advisory, validated compatibility, professional assembly, 24-month warranty) so visitors trust us with a 4-figure-USD purchase.
2. **Convert** — capture qualified leads through a configurator and a contact form.
3. **Showcase** — present curated pre-built tiers (Essentials · Creator · Apex) as starting points.

The home page is already designed in Stitch (project `8152584686730587161`, screen `38de639a2f784523a8238c313cb54226`) and serves as the visual source of truth for the design system.

## What changes

This change ships **V1 of the smart-pc Astro 7 site**. After it lands:

- The repository is a buildable Astro project (`pnpm dev`, `pnpm build`, `pnpm test`) with Tailwind v4 wired correctly.
- The contact form on `/contacto` submits directly to **Formspree** from the browser. The site is 100% static and deployable to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.). No Astro API route, no Resend, no adapter. Formspree is configured via `PUBLIC_FORMSPREE_FORM_ID`. If that variable is unset, the submit button is hidden and a `mailto:hola@smart-pc.com?...` link is shown as fallback.
- Six routes exist as static pages:

  | Route               | Source / role                                                       |
  |---------------------|---------------------------------------------------------------------|
  | `/`                 | Home — replica of Stitch screen `38de63…`                            |
  | `/pre-armadas`      | Catalog of curated PC builds (Essentials · Creator · Apex) with filters |
  | `/pre-armadas/[slug]`| Detail page for each build (specs, gallery, CTA)                   |
  | `/configurar`       | Step-by-step custom PC builder with live compatibility rail         |
  | `/servicios`        | Static services page                                                 |
  | `/contacto`         | Contact form with browser POST to Formspree                          |

- The design system lives in `src/styles/global.css` using Tailwind v4 `@theme` tokens (Deep Navy `#0c1324`, Electric Cyan `#22d3ee`, Cobalt `#3b82f6`, Violet `#8b5cf6`, borders `#3c494c`).
- Reusable `.astro` components under `src/components/` (Navbar, Hero, Footer, CTAButton, TrustStrip, ServiceCard, PricingCard, SpecList, FAQItem, ContactForm, ConfiguratorStepper).
- One React island per interactive surface (configurator stepper, contact form, catalog filters).
- Strict TypeScript, Biome for lint/format, Vitest for unit tests, all wired in CI.

## Out of scope (V1)

Explicit non-goals, deferred to a later change:

- User auth, customer accounts, order history.
- Real e-commerce checkout, payment gateway, stock/inventory integration.
- CMS or admin panel. Catalog edits land through PRs.
- Multi-language support (only Spanish AR in V1).
- Analytics integration (GA4, Plausible, etc.) — V2.
- Blog, news, FAQ-as-content (the FAQ section in home is hardcoded for V1).
- Hosting/CDN provisioning (the V1 output is deployable, but the deploy step is not in this change).

## Stack

Confirmed during exploration of the `three-trackr` reference app at `~/Projects/three-trackr/apps/three-trackr/`:

| Concern             | Choice                                                                |
|---------------------|----------------------------------------------------------------------|
| Framework           | Astro `7.x` (current `7.2.1` in three-trackr)                        |
| Styling             | Tailwind v4 via `@tailwindcss/vite` (no PostCSS, no `tailwind.config.js`) |
| Interactivity       | React 19+ islands via `@astrojs/react` (only where state is needed)  |
| Language            | TypeScript strict (`tsconfig.json` with `"strict": true`)            |
| Lint/format         | Biome 2.x (single tool, replaces ESLint+Prettier)                    |
| Tests               | Vitest 4.x + `@testing-library/react` for component tests             |
| Package manager     | pnpm 11.x (matches the host's `packageManager` in `package.json`)    |
| Build output        | Static SSG (no adapter)                                              |
| Hosting target      | Any static host (Vercel, Netlify, Cloudflare Pages)                  |

**Reuse from three-trackr:** biome.json, tsconfig.json pattern, Vitest config pattern, the `src/{components,layouts,pages,data,assets,styles}` shape.

**Drop from three-trackr:** pnpm-workspace.yaml, Turbo, packages/*, the `apps/api` + `apps/app` + `apps/docs` split, GraphQL/Apollo, Prisma, Supabase.

## How we'll know it works (acceptance criteria)

1. `pnpm install && pnpm dev` boots the Astro dev server on `http://localhost:4321` with HMR.
2. `pnpm build` produces a static `dist/` with all six routes pre-rendered. No SSR runtime, no Node-only deps.
3. `pnpm check` runs Biome + `tsc --noEmit` with zero errors.
4. `pnpm test` runs Vitest; ≥ 80% statements in `src/lib/` and `src/data/`; zero failures.
5. The home page visual matches the Stitch screen (hero, glass navbar, stats strip, trust strip 4-col, services 2×2, pre-armadas 3-col, configurator teaser split, FAQ, contact form, footer). Verified by side-by-side review.
6. Lighthouse on `pnpm preview`: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.
7. The configurator's compatibility rail refuses an Intel CPU + AMD AM5 motherboard combination (red status, blocking) and flags an RTX 4090 with a 550 W PSU (amber status, warning) — verifiable via unit test and manual probe.
8. Contact form: client-side validation blocks empty required fields; the browser POSTs directly to Formspree and, on its HTTP 200 response, renders success UI. No server-side code is needed.

## Risks

- **Configurator compatibility logic is non-trivial.** Real-world compatibility involves dozens of rules (socket, chipset, BIOS, PSU wattage, PCIe generation, RAM type, case clearance). V1 uses a hand-curated matrix in `src/lib/compatibility.ts` covering the cataloged parts. New additions require updating the matrix until V2.
- **Tailwind v4 is a different API from v3.** No `tailwind.config.js`, no `@tailwindcss/postcss`, no `corePlugins`. The reference three-trackr is already on v4, so the precedent reduces risk, but the team MUST learn the v4 `@theme` directive and the new `bg-{token}` shorthand.
- **Pricing data is static and AR-USD volatile.** V1 encodes prices in ARS with hardcoded numbers. A real price feed is out of scope; we'll add a `data/lastUpdated` field so customers see a timestamp.
- **Stitch design system formalization remains informal.** We couldn't create a first-class `stitch_apply_design_system` due to schema issues on the Stitch MCP `upload_design_md`. The DESIGN.md I wrote is the authoritative design source; if we get Stitch auth fixed, we can sync it back.
- **Spanish (AR) copy needs native review.** Generated copy is technically correct but should be reviewed by the owner before launch to ensure tone matches the brand.

## Rollback

- The project is greenfield, so there is no production rollout to roll back.
- Individual features ship as separate PRs (`feat(home)`, `feat(pre-armadas)`, etc.). Each PR can be reverted independently.
- The `v1-initial-release` OpenSpec change is archived only when every phase of `tasks.md` is `done`. Until then, incomplete features can be cut from V1 by dropping their tasks from the change.
- If the Stitch-based visual direction turns out wrong, the design tokens in `global.css` are the single source of truth for color, font, and spacing — those can be adjusted without touching every component, because components use semantic class names (`bg-bg`, `text-primary`, `border-outline`) not raw hex.

## Reference artifacts produced by earlier work in this session

- Stitch project `projects/8152584686730587161` ("smart-pc")
- Stitch screen `projects/8152584686730587161/screens/38de639a2f784523a8238c313cb54226` ("smart-pc | Premium Custom PC Builder", 2560 × 3250)
- DESIGN.md at `/tmp/smart-pc-design.md` (carries the canonical design tokens; will be inlined into `src/styles/global.css` and summarized in `openspec/CHANGELOG.md` when we cut V1)
- Three-trackr clone at `~/Projects/three-trackr/` used as Astro+Tailwind v4 reference
