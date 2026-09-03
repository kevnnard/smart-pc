# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-09-03

### Added
- **Home page (/)** — Full landing page composed of: PageHero with brand tagline, StatsStrip (4 metrics), ServicesGrid (4 services), PrebuildTeaser (3 pricing cards), ConfiguratorCTA split section, FAQ accordion (5 items), contact teaser with WhatsApp + email CTAs
- **Pre-armadas catalog (/pre-armadas)** — Grid of 3 prebuilt PC cards (Essentials, Creator, Apex) with pricing, badges, and CTA links
- **Pre-armada detail (/pre-armadas/[slug])** — Individual build pages for each tier with full component spec sheet (SpecList), pricing in COP, and WhatsApp/cotizador CTAs
- **Configurator (/configurar)** — 7-step React island wizard for custom PC assembly: CPU → Motherboard → RAM → GPU → Storage → PSU → Summary. Real-time compatibility validation (socket, RAM type, PSU wattage), live price total, WhatsApp share CTA
- **Services (/servicios)** — Service page with 4 services (armado a medida, pre-armadas, mantenimiento/upgrade, garantía/soporte), 3-step process explanation
- **Contact (/contacto)** — Contact form with Formspree integration (mailto fallback when PUBLIC_FORMSPREE_FORM_ID is unset), WhatsApp CTA, contact info panel
- **404 page** — Branded 404 with navigation back to home and configurator
- **Sitemap** — Auto-generated via @astrojs/sitemap (8 indexed routes)
- **robots.txt** — Allowing all crawlers, pointing to sitemap

### Components
- `CTAButton.astro` — Primary/secondary/outline variants
- `FAQItem.astro` — Pure `<details>` accordion (zero JS)
- `Navbar.astro` — Glassmorphism sticky navbar with mobile hamburger
- `Footer.astro` — 4-column footer with social links, WhatsApp CTA
- `PricingCard.astro` — Prebuilt tier card with featured variant + ribbon
- `ServiceCard.astro` — Service tile with icon and optional starting price
- `SpecList.astro` — Zebra-striped component spec rows (list/grid variants)
- `StatsStrip.astro` — Full-width dark-navy stats strip
- `PageHero.astro` — Generic page hero with eyebrow, H1, accent, CTA pair
- `Configurator.tsx` — React island (7-step wizard, compatibility validation)
- `ContactForm.tsx` — React island (Formspree + mailto fallback)

### Data layer
- `types.ts` — All interfaces (BrandInfo, ServiceRecord, PrebuiltPC, Component, PCSelection, etc.)
- `brand.ts` — Brand metadata (name, tagline, WhatsApp, email, location)
- `services.ts` — 4 service records
- `prebuilds.ts` — 3 prebuilt PCs (Essentials, Creator, Apex)
- `components.ts` — Component catalog (CPU, GPU, motherboard, RAM, storage, PSU, cooler)
- `home.ts` — Stats, FAQ items, trust strip data

### Compatibility rules (TDD-verified)
- Socket mismatch detection (CPU ↔ motherboard)
- PSU wattage headroom validation (GPU TDP + 200W system baseline vs PSU × 0.85)
- RAM type compatibility (motherboard ramType ↔ RAM ramType)
- `validate()` integration function returns compatible/warning/incompatible + messages

### Design system
- Tailwind CSS v4 with @theme {} design tokens
- Electric Cyan primary: #22d3ee
- Deep Navy backgrounds: #0c1333 / #0c1324
- Surface: #141b30
- Text: #dce2fa / rgba(220,226,250,0.6) / rgba(220,226,250,0.4)
- Typography: Inter (UI) + JetBrains Mono (monospace accents)
- Fully static output — zero JS on marketing pages

### Technical
- Astro 7 + React islands + Tailwind CSS v4 + TypeScript strict
- Biome for linting and formatting
- Vitest for tests (16 tests, 100% coverage on src/lib/)
- pnpm 11
- Formspree for contact form (mailto fallback)
- @astrojs/sitemap for SEO

## [0.0.0] — 2026-09-03

### Added
- Project scaffold (Astro 7 + Tailwind v4 + React + Biome + Vitest)