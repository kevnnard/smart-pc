# v1-initial-release · spec

This document defines the V1 contract for `smart-pc`. Each feature is a section with **Given/When/Then** scenarios. Keywords follow RFC 2119 (MUST, SHALL, SHOULD, MAY).

---

## F1 · Home (`/`)

### F1.1 — Glass navbar present on every page

**Given** the visitor lands on any page of the site
**When** the page paints
**Then** a sticky `<Navbar />` SHALL appear at the top, 70 % opacity on `bg-bg`, with `backdrop-filter: blur(16px)`, a 1 px bottom border in `outline-variant`, height ≈ 64 px, and centered links plus a primary CTA "Cotizar".

### F1.2 — Hero renders headline + dual CTA

**Given** the visitor lands on `/`
**When** the hero section paints
**Then** the page SHALL show a monospace label `// CUSTOM PC BUILDER · COLOMBIA`, an H1 in `display-lg` Inter 700 with the line *"Armá la PC que necesitás."* and the second line *"Sin humo, sin incompatibilidades."* in primary cyan, a subhead ≤ 640 px wide, a primary CTA `Armar mi PC` and a secondary outlined CTA `Ver pre-armadas`.

### F1.3 — Stats strip is visible below the CTAs

**Given** the hero has rendered
**When** the visitor scrolls past the CTAs
**Then** three monospace stats SHALL appear in a horizontal strip separated by 1 px vertical dividers: `320+ PCs ARMADAS`, `98% COMPATIBILIDAD`, `24M GARANTÍA`.

### F1.4 — Trust strip shows four value props

**Given** the stats strip has rendered
**When** the visitor scrolls
**Then** a four-column strip SHALL appear with monospace counters `01 / 02 / 03 / 04` and H3 + body lines for: *Compatibilidad validada*, *Asesoría técnica*, *Armado profesional*, *Garantía 24 meses*.

### F1.5 — Services section lists four offerings

**Given** the trust strip has rendered
**When** the visitor scrolls
**Then** a section labeled `// SERVICIOS` SHALL render a 2 × 2 grid (single column < 768 px) of service cards: *Armado a medida*, *Pre-armadas*, *Mantenimiento y upgrade*, *Garantía y soporte*. Each card SHALL have a heading and a one-line CTA labeled "Ver más" that links to `/servicios`.

### F1.6 — Pre-armadas teaser shows three tiers

**Given** the services section has rendered
**When** the visitor scrolls
**Then** a section labeled `// PRE-ARMADAS` SHALL render three cards (Essentials · Creator · Apex), each with a tier name in primary cyan, a tagline, five monospace spec chips (CPU · GPU · RAM · Storage · PSU), a price in `price-display` cyan, and an outlined button `Ver build` linking to `/pre-armadas/[slug]`.

### F1.7 — Configurator teaser links to `/configurar`

**Given** the pre-armadas teaser has rendered
**When** the visitor scrolls
**Then** a split section labeled `// CONFIGURADOR` SHALL present the headline *Armá paso a paso.*, body text describing live compatibility, a primary CTA `Abrir configurador` linking to `/configurar`, and a styled preview of step 02 with three GPU options and compatible/atención status dots.

### F1.8 — Contact strip renders a real form

**Given** the configurator teaser has rendered
**When** the visitor scrolls
**Then** a full-width strip labelled implicitly via headline *"Pedí tu cotización sin compromiso."* SHALL render a contact form (`Nombre`, `Email`, `Qué necesitás`, `Presupuesto estimado`) and a primary `Enviar` button.

### F1.9 — FAQ section is present

**Given** any section above has rendered
**When** the visitor scrolls to the FAQ region
**Then** at minimum four accordion items (`// 01` … `// 04`) SHALL render with closed-state monospace labels: *¿Cuánto tarda un armado?*, *¿La garantía cubre fallas de fábrica?*, *¿Puedo traer mis propios componentes?*, *¿Hacen envíos al interior?*.

### F1.10 — Footer renders four columns + meta

**Given** any section above has rendered
**When** the visitor scrolls to the bottom
**Then** a four-column footer SHALL render (smart-pc + tagline; Producto; Servicios; Legal) with a bottom row reading `© 2026 smart-pc · Bogotá, Colombia` and a monospace `v0.1.0 — built with care`.

### F1.11 — Home copies tone from Stitch

**Given** the home page HTML is rendered
**When** the owner compares it to Stitch screen `38de639a2f784523a8238c313cb54226`
**Then** the page SHALL match the Stitch layout 1:1 for section ordering, headline copy, and CTA text. Visual fidelity is reviewed manually (no pixel-diff required).

---

## F2 · Catalog (`/pre-armadas`)

### F2.1 — List all curated builds

**Given** the catalog data in `src/data/prebuilds.ts` lists three builds (Essentials, Creator, Apex)
**When** the visitor lands on `/pre-armadas`
**Then** three cards SHALL render in a responsive grid (3 cols ≥ 1024 px, 2 cols 768–1023 px, 1 col < 768 px) with the same card shape as F1.6.

### F2.2 — Filter by tier

**Given** the catalog is rendering
**When** the visitor clicks the tier filter `Essentials` (or Creator / Apex / All)
**Then** the list SHALL reduce to only builds matching the selected tier. Clicking the active filter SHALL return to all builds.

### F2.3 — Filter by use

**Given** the catalog is rendering
**When** the visitor clicks a use chip (`Home`, `Office`, `Creator`, `Gaming`, `4K`)
**Then** the list SHALL reduce to builds tagged with that use. Multiple use chips MAY be combined (AND).

### F2.4 — Filter by budget range

**Given** the catalog is rendering
**When** the visitor moves a budget slider with min and max handles
**Then** the list SHALL reduce to builds whose price in ARS is within `[min, max]`.

### F2.5 — Empty state

**Given** filters have produced zero matches
**When** the list area renders
**Then** an empty state SHALL appear: headline `Sin resultados para esos filtros`, a secondary CTA `Limpiar filtros`.

### F2.6 — Sort toggle

**Given** the catalog is rendering
**When** the visitor changes the sort dropdown
**Then** the list SHALL reorder by *price ascending*, *price descending*, or *performance tier*. The default sort SHALL be *performance tier*.

---

## F3 · Build detail (`/pre-armadas/[slug]`)

### F3.1 — Static dynamic route

**Given** a slug is requested via `getStaticPaths` in `src/pages/pre-armadas/[slug].astro`
**When** the visitor navigates to `/pre-armadas/{slug}`
**Then** the page SHALL render only if `{slug}` exists in `src/data/prebuilds.ts`. Otherwise a 404 SHALL be returned (Astro default).

### F3.2 — Specs table renders

**Given** the requested slug exists
**When** the detail page renders
**Then** a `SpecList` component SHALL render a zebra-striped table with all components (CPU, GPU, motherboard, RAM, storage, PSU, cooling, case) and their full names, brands, and quantities.

### F3.3 — Gallery slot renders placeholder

**Given** the detail page is rendering
**When** the gallery section paints
**Then** a single `[RENDER]` placeholder SHALL appear with the alt text `Render of {tier-name} build`. V1 ships no real image bytes; the placeholder is part of the deliverable.

### F3.4 — Warranty badge visible

**Given** the detail page is rendering
**When** any section is visible
**Then** a monospace badge `Garantía 24m` SHALL be visible in the sidebar.

### F3.5 — CTA leads to contact

**Given** the detail page is rendering
**When** the visitor reads the spec list
**Then** a primary CTA `Cotizar esta build` SHALL link to `/contacto?build={slug}` with the slug preserved as a query param.

---

## F4 · Configurator (`/configurar`)

### F4.1 — Stepper has seven steps

**Given** the visitor lands on `/configurar`
**When** the stepper renders
**Then** seven step indicators SHALL appear in order: `01 CPU`, `02 GPU`, `03 Motherboard`, `04 RAM`, `05 Storage`, `06 PSU`, `07 Cooling`. The current step SHALL be highlighted in primary cyan.

### F4.2 — Each step shows at least three options

**Given** a step is active
**When** the option list renders
**Then** at least three cataloged options SHALL appear as selectable rows. Each row SHALL show the part name, brand, key spec (e.g. `RTX 4070 · 12 GB`), price in ARS, and a compatibility dot.

### F4.3 — Compatibility dot reflects current selection

**Given** the visitor selected a CPU in step 01
**When** they advance to step 02 and view options
**Then** every option in step 02 SHALL display a dot whose color comes from the compatibility matrix against the selected CPU: green/cyan for "compatible", amber for "warning", red for "incompatible". Incompatible options MAY remain selectable but SHALL be visually de-emphasized (40 % opacity, `cursor: not-allowed`).

### F4.4 — Selecting an incompatible part fails compatibility check

**Given** the visitor selected an Intel CPU and an AMD AM5 motherboard
**When** they try to advance from step 03 to step 04
**Then** the configurator SHALL refuse to advance and SHALL display a red banner: *"Esta motherboard no es compatible con el CPU seleccionado (socket distinto)."*

### F4.5 — Sticky total updates on every selection

**Given** any step is active
**When** the visitor selects an option
**Then** the sticky bottom bar SHALL update its total in `price-display` cyan and the running item count SHALL become visible.

### F4.6 — End of stepper shows the review step

**Given** the visitor has selected one option for each of steps 01–07
**When** they complete step 07
**Then** a review state SHALL render a table of all selected parts with quantity-aware totals. A primary CTA `Enviar cotización` SHALL link to `/contacto?config={base64}` with the configuration payload serialized.

### F4.7 — Configurator state survives a page reload

**Given** the visitor selected N parts in steps 01–K
**When** they reload the page
**Then** the selections SHALL persist (via `localStorage` under the key `smart-pc:configurator:v1`). A toast SHALL confirm restoration on first paint.

---

## F5 · Services (`/servicios`)

### F5.1 — Page lists four service blocks

**Given** the visitor navigates to `/servicios`
**When** the page renders
**Then** four sections SHALL appear in order: *Armado a medida*, *Pre-armadas*, *Mantenimiento y upgrade*, *Garantía y soporte*. Each section SHALL have an H2, a body paragraph (3–5 lines), and a CTA button to `/contacto?service={slug}`.

### F5.2 — Service blocks are derived from data

**Given** `src/data/services.ts` exports an array of four service records
**When** the page renders
**Then** the four sections SHALL be rendered from that data, not hardcoded JSX/Astro markup. Adding a fifth service MUST require only adding a record to the array.

---

## F6 · Contact (`/contacto`)

### F6.1 — Form has five fields

**Given** the visitor lands on `/contacto`
**When** the form renders
**Then** five form controls SHALL be present: `nombre` (text, required, 2–80 chars), `email` (email, required, RFC 5322), `que_necesita` (textarea, required, 10–2000 chars), `presupuesto` (select with options `Menos de USD 500`, `USD 500–1000`, `USD 1000–2000`, `USD 2000+`, `No sé todavía`), `submit` (primary CTA).

### F6.2 — Client-side validation blocks empty required fields

**Given** the visitor clicks `Enviar` with any required field empty
**When** validation runs
**Then** the form SHALL NOT submit, and the first invalid field SHALL receive focus with an inline error in `text-error` (red).

### F6.3 — Pre-fill from query params

**Given** the visitor arrived via `/contacto?build=essentials` or `/contacto?config=...` or `/contacto?service=armado-a-medida`
**When** the form renders
**Then** the `que_necesita` field SHALL be pre-populated with a short sentence that includes the build name, the configuration summary, or the service name, respectively.

### F6.4 — Submission posts to a form service endpoint

**Given** the visitor passes validation
**When** they click `Enviar`
**Then** the form SHALL POST to the form service endpoint (Formspree: `https://formspree.io/f/{PUBLIC_FORMSPREE_FORM_ID}`) directly from the browser, with `Accept: application/json` header. The form service SHALL return HTTP 200 on valid submission.

### F6.5 — Success and error states

**Given** the POST returns 200
**When** the response arrives
**Then** the form SHALL be replaced with a success panel: headline *"Recibimos tu mensaje"*, body *"Te respondemos en menos de 24 h hábiles."*, monospace `ref: {uuid}`.

**Given** the POST returns non-200
**When** the error arrives
**Then** the form SHALL display an error panel above the controls: *"No pudimos enviar tu mensaje. Probá de nuevo o escribinos directo a hola@smart-pc.com."* with the same submit button still present.

---

## Cross-cutting requirements

- **Accessibility (WCAG 2.2 AA)**:
  - All interactive elements SHALL have focus rings (1 px outline cyan, 2 px offset).
  - Color contrast SHALL be ≥ 4.5:1 for body text and ≥ 3:1 for large text against `bg-bg`.
  - Forms SHALL have associated `<label>` for every input.
- **Performance**:
  - Per page, the cumulative JS payload SHOULD be ≤ 50 KB gzipped. The configurator island MAY exceed this up to 120 KB.
  - All images SHALL be `loading="lazy"` except above-the-fold hero.
- **i18n**: All user-visible copy SHALL be in Spanish (Colombia), without regional slang.
- **Type safety**: `tsc --noEmit` SHALL exit 0 at every PR.
- **Lint/format**: `pnpm check` SHALL exit 0 at every PR.
