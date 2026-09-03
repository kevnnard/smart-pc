# smart-pc

Landing + service site for a custom PC building business in Colombia. Catalog of curated
pre-built PCs, a 7-step PC configurator with live compatibility checking, services
catalog, and a Formspree-backed contact form. Fully static output, deployable to any
static host.

**Live domain placeholder:** `https://smart-pc.com` — set in `astro.config.mjs`
(`site` field). Update when the final domain is finalized.

---

## Stack

| Layer        | Tool                                |
|--------------|-------------------------------------|
| Framework    | [Astro 7](https://astro.build) (static output) |
| UI runtime   | React 19 islands (`@astrojs/react`) |
| Styling      | [Tailwind CSS v4](https://tailwindcss.com) via `@tailwindcss/vite` |
| Type checking | TypeScript strict                   |
| Lint / fmt   | [Biome 2](https://biomejs.dev)      |
| Tests        | [Vitest 4](https://vitest.dev) + `@testing-library/react` + jsdom |
| Package mgr  | pnpm 11                             |
| Runtime      | Node ≥ 22.12                        |
| Form backend | [Formspree](https://formspree.io) (browser POST, no API route) |
| SEO          | `@astrojs/sitemap` + `public/robots.txt` |

---

## Scripts

| Command                | Description                                                 |
|------------------------|-------------------------------------------------------------|
| `pnpm dev`             | Dev server at http://localhost:4321 with HMR                |
| `pnpm build`           | Static build to `dist/` (9 pages + sitemap-index.xml)       |
| `pnpm preview`         | Preview the built site (serves `dist/` locally)             |
| `pnpm check`           | `biome check .` + `tsc --noEmit` (lint + type-check)        |
| `pnpm test`            | Vitest unit tests (one-shot)                                |
| `pnpm test:watch`      | Vitest watch mode                                           |
| `pnpm test:coverage`   | Vitest with v8 coverage                                     |
| `pnpm format`          | Biome auto-format                                           |

---

## Folder structure

```
.
├── astro.config.mjs            # Astro config: Tailwind, React, sitemap, site URL
├── biome.json                  # Biome lint/format config (replaces ESLint + Prettier)
├── package.json                # pnpm scripts + deps
├── tsconfig.json               # Strict TS config (extends @tsconfig/strict)
├── vitest.config.ts            # Vitest config (jsdom env, src/ alias, ≥80% on lib/data)
├── public/
│   ├── favicon.svg             # Site favicon (SVG)
│   ├── favicon.ico             # Legacy favicon
│   ├── logo.jpg                # Brand logo
│   └── robots.txt              # SEO: Allow / + Sitemap pointer
├── src/
│   ├── components/
│   │   ├── configurator/       # Configurator.tsx — React island, 7-step wizard
│   │   ├── contact/            # ContactForm.tsx — React island, Formspree POST
│   │   ├── footer/             # Footer.astro — 4-column footer + social icons
│   │   ├── home/               # PageHero, ServicesGrid, PrebuildTeaser, ConfiguratorCTA
│   │   ├── navbar/             # Navbar.astro + NavbarLink.astro (glass sticky)
│   │   └── ui/                 # Reusable: CTAButton, FAQItem, PricingCard,
│   │                           # ServiceCard, SpecList, StatsStrip, TrustStrip
│   ├── data/                   # Static data: brand, components, home, prebuilds,
│   │                           # services, types
│   ├── layouts/                # BaseLayout.astro — html shell, fonts, OG meta,
│   │                           # named slots for navbar/footer
│   ├── lib/                    # cn.ts, compatibility.ts (+ their .test.ts files)
│   ├── pages/                  # Astro file-based routes:
│   │   ├── 404.astro           # Catch-all 404 page
│   │   ├── index.astro         # / — home
│   │   ├── configurar/         # /configurar — React island host
│   │   ├── contacto/           # /contacto — form
│   │   ├── pre-armadas/        # /pre-armadas catalog + [slug] detail pages
│   │   └── servicios/          # /servicios — services catalog
│   └── styles/
│       └── global.css          # Design tokens (@theme {}) + base resets
└── openspec/                   # Spec-driven change artifacts
    └── changes/v1-initial-release/
        ├── spec.md             # Feature spec (F1–F6)
        ├── design.md           # Design + tokens + data shapes
        ├── tasks.md            # Per-phase task checklist
        └── apply-progress.md   # Phase-by-phase implementation log
```

---

## Routes emitted by `pnpm build`

| Route                          | Page                            | Build output                              |
|--------------------------------|--------------------------------|-------------------------------------------|
| `/`                            | Home                           | `dist/index.html`                          |
| `/pre-armadas`                 | Catalog                        | `dist/pre-armadas/index.html`              |
| `/pre-armadas/essentials`      | Prebuilt detail                | `dist/pre-armadas/essentials/index.html`   |
| `/pre-armadas/creator`         | Prebuilt detail                | `dist/pre-armadas/creator/index.html`      |
| `/pre-armadas/apex`            | Prebuilt detail                | `dist/pre-armadas/apex/index.html`         |
| `/configurar`                  | Configurator (React island)    | `dist/configurar/index.html`               |
| `/servicios`                   | Services catalog               | `dist/servicios/index.html`                |
| `/contacto`                    | Contact form                   | `dist/contacto/index.html`                 |
| `/404`                         | Catch-all (status 404 on host) | `dist/404.html`                            |
| `/sitemap-index.xml`           | Sitemap index                  | `dist/sitemap-index.xml`                   |
| `/sitemap-0.xml`               | URL set                        | `dist/sitemap-0.xml`                       |
| `/robots.txt`                  | Crawler rules                  | `dist/robots.txt`                          |

Total: **9 pages** + sitemap + robots.txt.

---

## Environment variables

Copy `.env.example` to `.env` and fill in. All variables are **public** (exposed to the
client bundle; the `vite.envPrefix: "PUBLIC_"` config makes any `PUBLIC_*` var
importable from `import.meta.env`).

| Variable                    | Required | Description                                                    |
|-----------------------------|----------|----------------------------------------------------------------|
| `PUBLIC_FORMSPREE_FORM_ID`  | yes (prod) | Formspree form ID. Empty value falls back to `mailto:` link.  |

`.env.example` ships with `PUBLIC_FORMSPREE_FORM_ID=` placeholder and a one-line
comment explaining the fallback.

---

## Design tokens

Single source of truth: `src/styles/global.css` `@theme {}` block. Tailwind v4 reads
the `@theme` block and exposes every `--color-*`, `--font-*`, `--radius-*`, and
`--spacing-*` as a utility-class namespace. **Components must consume tokens via
utility classes — raw hex literals are forbidden outside `global.css`.**

### Colors

| Token              | Value      | Use                                |
|--------------------|------------|------------------------------------|
| `navy-950`         | `#0c1324`  | Page background                    |
| `navy-900`         | `#141b2c`  | Surface (cards, panels)            |
| `navy-800`         | `#181f31`  | Elevated surface                   |
| `navy-700`         | `#232a3c`  | Hover surface                      |
| `navy-600`         | `#2e3447`  | Pressed surface                    |
| `border`           | `#3c494c`  | Default 1px border                 |
| `cyan-500`         | `#22d3ee`  | Primary accent                     |
| `cyan-400`         | `#2fd9f4`  | Primary hover                      |
| `cyan-300`         | `#a2eeff`  | Primary muted / accent text        |
| `cyan-600`         | `#006877`  | Primary pressed                    |
| `blue-500`         | `#3b82f6`  | Secondary accent ("Cobalto" pill)  |
| `blue-400`         | `#8aebff`  | Secondary accent text              |
| `blue-600`         | `#002e6a`  | Secondary pressed                  |
| `blue-700`         | `#0566d9`  | Secondary hover                    |
| `violet-500`       | `#8b5cf6`  | Tertiary glow                      |
| `text-primary`     | `#dce2fa`  | Body text                          |
| `text-secondary`   | `#bbc9cd`  | Muted text                         |
| `text-muted`       | `#859397`  | Disabled / placeholder text        |

### Typography

| Token        | Value                          |
|--------------|--------------------------------|
| `font-sans`  | `"Inter", system-ui, sans-serif` |
| `font-mono`  | `"JetBrains Mono", monospace`    |

Weights loaded from Google Fonts: Inter 400/500/600/700, JetBrains Mono 400/500.

### Spacing & radius

| Token           | Value     |
|-----------------|-----------|
| `spacing-unit`  | `4px` (Tailwind default scale) |
| `radius-sm`     | `4px`     |
| `radius-md`     | `8px`     |
| `radius-lg`     | `12px`    |
| `radius-full`   | `9999px`  |
| `container-max` | `1280px` (CSS custom property in `:root`) |

### Layout container

`max-w-[1280px]` is the canonical content width — applied to every page's
content wrapper.

---

## Deployment

Fully static output. Build with `pnpm build`, then deploy `dist/` to any static
host. Recommended hosts (all support serving `dist/404.html` with status 404):

- **Netlify** — auto-detected (Astro adapter not needed for static output).
- **Vercel** — auto-detected.
- **Cloudflare Pages** — set build command to `pnpm build`, output dir to `dist`.
- **GitHub Pages** — push `dist/` to `gh-pages` branch (use `actions-gh-pages` or
  similar).

### Pre-deploy checklist

1. `pnpm install` — installs deps.
2. `pnpm check` — Biome lint + tsc must pass with no errors.
3. `pnpm test` — all unit tests must pass.
4. `pnpm build` — must emit 9 pages + sitemap-index.xml + robots.txt.
5. Set `PUBLIC_FORMSPREE_FORM_ID` in the host's environment.
6. Update `site` in `astro.config.mjs` when the final domain is confirmed.

### Manual smoke test (per Phase 10 task 10.7)

After `pnpm build && pnpm preview`:

1. Click through all 6 top-level routes (`/`, `/pre-armadas`, `/configurar`,
   `/servicios`, `/contacto`, plus the 404).
2. Open all 3 `/pre-armadas/{essentials,creator,apex}` detail slugs.
3. Run the configurator end-to-end (one option per step + WhatsApp CTA).
4. Submit the contact form against Formspree (requires a valid form ID).
5. Hit a non-existent path → confirm the host serves `/404.html` with status 404
   and the page renders the dual-CTA copy.

---

## License

Private — all rights reserved.