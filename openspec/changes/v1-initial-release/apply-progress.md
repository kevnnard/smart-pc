# v1-initial-release · apply progress

Phase 2 (Design tokens + Base layout) executed by `sdd-apply` for smart-pc. Strict TDD is enabled in `openspec/config.yaml` and was honored: RED test written before implementation for `cn.ts`, then GREEN, then a TRIANGULATE pass that fixed the `0`/`NaN` edge case, then a REFACTOR pass that switched `Object.prototype.hasOwnProperty.call` to `Object.hasOwn` to satisfy Biome.

## Completed tasks

| Task | Status | Persisted checkbox | Notes |
|------|--------|--------------------|-------|
| 2.1  | done   | `[x]` (cn.ts test, RED → GREEN) | `src/lib/cn.test.ts` covers empty/string/numeric/object/array inputs, falsy drops, array flattening, mixed combinations, and Tailwind last-wins ordering. RED confirmed: the suite failed with `Failed to resolve import "./cn.ts"` before `cn.ts` existed. |
| 2.2  | done   | `[x]` (cn.ts impl)              | `src/lib/cn.ts` mirrors clsx behavior: drops `false`/`undefined`/`null`/`""`/`0`/`NaN`, preserves finite non-zero numbers, flattens nested arrays, includes dictionary keys whose values are truthy. Type signatures (`ClassValue`, `ClassDictionary`, `ClassArray`) exported for downstream reuse. |
| 2.3  | done   | `[x]` (design tokens)           | `src/styles/global.css` `@theme {}` block filled with the orchestrator-provided scale tokens (navy-950..500, cyan-500..300, blue-500..700, violet-500, text-primary/secondary/muted, font-sans, font-mono, radius-sm/md/lg/full, spacing-unit) plus a `:root` rule for `--container-max: 1280px` and minimal html/body/::selection resets. |
| 2.4  | done   | `[x]` (BaseLayout.astro)         | `src/layouts/BaseLayout.astro` with `<!doctype html>`, `<html lang="es-AR">`, charset, viewport, canonical, favicon links, SEO `<title>`/`<meta description>`, full Open Graph + Twitter card meta, Google Fonts preconnect + Inter (400/500/600/700) + JetBrains Mono (400/500) stylesheet, `astro:transitions` `ClientRouter`, and named slots `navbar` + `footer` around a `<main>` slot. Body uses `bg-navy-950 text-text-primary antialiased min-h-dvh`. |
| 2.5  | done   | `[x]` (tasks.md 4.2 Navbar)     | `src/components/navbar/Navbar.astro` modeled on Stitch navbar `fa168e446daf43698cae0d43a0208c0d`: sticky `top-0 z-50`, glassmorphism via inline `background-color: rgba(12,19,36,0.8)` + `backdrop-blur-md`, 1px bottom border, wordmark `smart` (cyan-500) + `-pc` (white) with "PCs a tu medida" tagline, five center links (Inicio / Pre-armadas / Configurador / Servicios / Contacto) wired through `NavbarLink` with active-state via `currentPath`, "Pre-armadas" chevron, "Configurador" cobalt pill badge, right cluster with `CTAButton` "Arma el tuyo" + cart button + ES/AR locale chip, and a simple mobile hamburger that toggles `#mobile-menu` via an inline `<script>`. |
| 2.6  | done   | `[x]` (NavbarLink.astro)         | `src/components/navbar/NavbarLink.astro` with `href` / `isActive` / `class` props, cyan underline pseudo-bar that animates from `opacity-0 scale-x-0` → `opacity-100 scale-x-100` on hover, persistent underline when `isActive`, `aria-current="page"` set when active. |
| 2.7  | done   | `[x]` (tasks.md 4.3 Footer)     | `src/components/footer/Footer.astro`: navy-950 surface, brand column with wordmark + tagline + 3 social icons (Instagram/WhatsApp/X inline SVG paths) wrapped in `rel="noopener noreferrer" target="_blank"`, four navigation columns (Productos/Empresa/Ayuda/Legal) rendered from a typed array, bottom row with copyright `© {year} smart-pc` (year computed at build time) and "Hecho en Colombia 🇨🇴". |
| 2.8  | done   | `[x]` (tasks.md 4.1 CTAButton)  | `src/components/ui/CTAButton.astro` with `href` / `variant` ("primary" \| "secondary" \| "outline") / `size` ("sm" \| "md" \| "lg") / `type` / `disabled` / `class` / `ariaLabel` props. Renders `<a>` when `href` is provided, otherwise `<button type="...">`. Primary uses `bg-cyan-500 text-navy-950` + cyan glow shadow that intensifies on hover; secondary is `bg-blue-500 text-text-primary`; outline is `border border-cyan-500 text-cyan-500` with a translucent hover fill. Focus ring is `cyan-500`. |
| 2.9  | done   | `[x]` (TrustStrip.astro)         | `src/components/ui/TrustStrip.astro` with four icon+label+detail cells (Garantía 12 meses, Envío gratis, Soporte 24/7, Pago seguro). Cyan SVG icons rendered through a 40×40 navy-800 chip with a cyan-500/30 ring. Responsive 1 → 2 → 4 column grid. Note: this is the orchestrator's general-purpose TrustStrip; tasks.md 5.2 calls for a home-specific one at `src/components/home/TrustStrip.astro` — that home wrapper is still pending. |

## Files created / modified

Created:
- `src/lib/cn.test.ts`
- `src/lib/cn.ts`
- `src/layouts/BaseLayout.astro`
- `src/components/navbar/Navbar.astro`
- `src/components/navbar/NavbarLink.astro`
- `src/components/footer/Footer.astro`
- `src/components/ui/CTAButton.astro`
- `src/components/ui/TrustStrip.astro`

Modified:
- `src/styles/global.css` (filled the empty `@theme {}` block from Phase 1, added `:root` and base resets)
- `openspec/changes/v1-initial-release/tasks.md` (marked tasks 2.1, 2.2, 2.3, 2.8 from Phase 2 and 4.1, 4.2, 4.3 from Phase 4 as `[x]`; left a Phase-2-partial note)
- `openspec/changes/v1-initial-release/apply-progress.md` (this file)

Untouched (still default Astro welcome):
- `src/pages/index.astro` — Phase 5 will replace this with `BaseLayout + Navbar + HomeHero + ...` composition.

## Verification

All three Phase 2 verifications green:

```
$ pnpm test
 Test Files  1 passed (1)
      Tests  15 passed (15)

$ pnpm check
 Checked 15 files. EXIT=0
 (only an info-level deprecation note about biome.json `recommended` field, same
  as Phase 1; no errors, no warnings.)

$ pnpm build
 1 page(s) built in 550ms
 /index.html + favicons emitted to dist/
```

Note: `pnpm test:coverage` is not part of the orchestrator's verification list for this phase; the Phase 2 lib work (`cn.ts`) has no coverage threshold yet because `cn.ts` is not yet referenced anywhere in the source tree and is the only file under `src/lib/`. The 80% threshold for `src/lib/` and `src/data/` will activate meaningfully once Phase 3 (data layer) and Phase 6/7 (configurator/catalog) add their lib modules. Coverage config is already wired in `vitest.config.ts` from Phase 1.

## TDD Cycle Evidence

| Phase / Task | RED written | RED output | GREEN passed | TRIANGULATE / REFACTOR |
|--------------|-------------|------------|---------------|-------------------------|
| 2.1 cn.test.ts | yes (`src/lib/cn.test.ts`) | `Failed to resolve import "./cn.ts" from "src/lib/cn.test.ts". Does the file exist?` → `Tests  no tests / Test Files  1 failed` | yes — first impl passed 13/15 | TRIANGULATE: added 2 failing cases for `0` and `NaN` while the impl kept them; fixed `toVal()` to drop 0 and NaN. REFACTOR: switched `Object.prototype.hasOwnProperty.call` to `Object.hasOwn` per Biome `lint/correctness/useObjectHasOwn` suggestion. Final: 15/15 passing. |
| 2.4 BaseLayout | N/A (presentational) | — | — | — |
| 2.5 Navbar | N/A (presentational) | — | — | — |
| 2.6 NavbarLink | N/A (presentational) | — | — | — |
| 2.7 Footer | N/A (presentational) | — | — | — |
| 2.8 CTAButton | N/A (presentational) | — | — | — |
| 2.9 TrustStrip | N/A (presentational) | — | — | — |

Full RED output transcript (verbatim from `pnpm test` before 2.2):

```
 RUN  v4.1.11 /home/kevnnard/Projects/smart-pc

 ❯ src/lib/cn.test.ts (0 test)

⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/lib/cn.test.ts [ src/lib/cn.test.ts ]
Error: Failed to resolve import "./cn.ts" from "src/lib/cn.test.ts". Does the file exist?
  Plugin: vite:import-analysis
  ...
1  |  import { describe, expect, it } from "vitest";
2  |  import { cn } from "./cn.ts";
   |                      ^
3  |  describe("cn", () => {
4  |  	describe("empty / falsy inputs", () => {
```

Full GREEN output transcript (verbatim from `pnpm test` after the TRIANGULATE/REFACTOR pass):

```
 RUN  v4.1.11 /home/kevnnard/Projects/smart-pc


 Test Files  1 passed (1)
      Tests  15 passed (15)
```

## Deviations from design / orchestrator instructions

- **`<ViewTransitions />` → `<ClientRouter />`.** Astro 7 renamed the view-transitions component. The virtual module `astro:transitions` still exists but only exports `ClientRouter` (see `node_modules/astro/dist/transitions/vite-plugin-transitions.js`: `export { default as ClientRouter } from "astro/components/ClientRouter.astro";`). The orchestrator's spec referenced the legacy name; the actual import is `import { ClientRouter } from "astro:transitions";`. Functionally equivalent (single SPA-style client-side router with fallback swap), but the prop surface differs from the old `ViewTransitions` API. If the orchestrator downstream expected `ViewTransitions` symbols specifically, a V2 upgrade or a shim is needed.
- **`src/env.d.ts` not created.** It is not in the orchestrator's allowed edit surfaces, and it is not required: Astro auto-emits `.astro/types.d.ts` containing `/// <reference types="astro/client" />`, which `tsc` picks up via the project `include`. `tsconfig.json` already lists `.astro/types.d.ts` in `include` from Phase 1. Tasks.md task 2.9 (`src/env.d.ts`) stays `[ ]` and is listed as deferred in the Phase-2-partial note.
- **`src/lib/money.ts` and `src/lib/slugify.ts` not implemented.** Out of scope for this execution: the orchestrator's Phase 2 prompt did not include them. tasks.md tasks 2.4–2.7 stay `[ ]`. Future phases (3.6 money formatting in price tables, 4.6 PricingCard consuming a prebuild with a money-formatted price) will need them and the orchestrator can pick them up then.
- **Token names use the orchestrator's scale-based palette (`navy-950`…`navy-500`, `cyan-500`/`cyan-400`/`cyan-300`/`cyan-600`, etc.) rather than `design.md §3` Material 3 semantic names (`--color-bg`, `--color-primary`, `--color-primary-container`, …).** The orchestrator's Phase 2 prompt listed the scale tokens explicitly, so I followed them. design.md §3 also kept a `bg`/`primary`/`secondary` semantic layer; the BaseLayout and components reference the scale tokens via `bg-navy-950`, `text-cyan-500`, `bg-blue-500` etc. A future cleanup could add semantic aliases (`--color-bg: var(--color-navy-950)`, `--color-primary: var(--color-cyan-300)`, …) on top of the scale to satisfy the "no raw hex outside global.css" rule literally. Components in this phase never use raw hex, so the rule still holds in practice.
- **Glassmorphism alpha uses an inline `style="background-color: rgba(12,19,36,0.8);"` instead of a Tailwind `bg-[rgba(...)]` arbitrary value.** Rationale: `biome check` is configured to parse CSS in `.astro` files, and arbitrary `bg-[rgba(12,19,36,0.8)]` Tailwind classes sometimes trigger CSS-linter noise depending on bracket escaping; an inline `style` keeps the alpha channel explicit without escaping. The rgba literal is *not* a hex; the rule against "raw hex literals outside `global.css`" is honored. If the orchestrator prefers the arbitrary-value form, swap is mechanical.
- **`Footer.astro` link targets are forward-looking.** The `Empresa`, `Ayuda`, and `Legal` columns include anchors like `/legal/terminos`, `/servicios#about`, `/contacto#como-comprar` that don't yet have matching pages. Phase 8 (services) and Phase 10 (quality gates) will own those routes; until then the links are 404. Phase 5 should not surface these as primary CTAs, only as footer affordances.
- **`src/styles/tokens.css` and `src/components/navbar/Navbar.module.css` were not created.** Both files are in the orchestrator's allowed edit surfaces, but neither was needed for the Phase 2 prompt: tokens live in `src/styles/global.css`'s `@theme` block (the Tailwind v4 canonical location), and `Navbar.astro` uses scoped `<style>` only via utility classes plus one inline `style` for the glass background. Both files can land later if the design needs a CSS Modules layer for non-Tailwind components.
- **Phone number placeholder.** The Footer WhatsApp link uses `https://wa.me/5491100000000`; this is a placeholder until Phase 3 (`src/data/brand.ts`) supplies the real number. Phase 5 should make sure the `wa.me/` link is rendered from the data file, not hard-coded.

## Remaining tasks

From `tasks.md`, Phase 2 still pending: **2.4 money test, 2.5 money impl, 2.6 slugify test, 2.7 slugify impl, 2.9 env.d.ts.** None of these are blockers for `pnpm test`, `pnpm check`, or `pnpm build`. Phase 3 (data layer) and Phase 4 (remaining reusable components) are next gates.

From the orchestrator's Phase 2 list, all 9 items are complete.

## Workload / PR boundary

| File                          | Lines (LOC) |
|-------------------------------|-------------|
| `src/lib/cn.ts`               |  83 |
| `src/lib/cn.test.ts`          |  97 |
| `src/styles/global.css`       |  96 |
| `src/layouts/BaseLayout.astro`|  97 |
| `src/components/navbar/Navbar.astro`     | 217 |
| `src/components/navbar/NavbarLink.astro` |  45 |
| `src/components/footer/Footer.astro`     | 158 |
| `src/components/ui/CTAButton.astro`      |  84 |
| `src/components/ui/TrustStrip.astro`     |  89 |
| **Total authored**            | **966** |

The session `review_budget_lines` is **600** (from `openspec/config.yaml#workflow.review_budget_lines`). This Phase 2 slice **exceeds the budget by 366 lines**. Per the apply-phase review-workload gate:

- "If the assigned slice cannot land within budget as one cohesive work unit, implement it honestly, then report the final authored line count, why it cannot shrink further, and a `size:exception` recommendation — do not iterate trying to reach the number."

The slice cannot shrink further without removing required surface:
- `cn.ts` + `cn.test.ts` are minimal at 83/97 lines (test must cover all six categories the orchestrator listed plus extra edge cases).
- `global.css` is 96 lines because each token block carries the design-rationale comment header.
- `Navbar.astro` is 217 lines because the Stitch-spec glassmorphism + glass border + wordmark + 5 center links + 3 right-cluster controls + mobile hamburger + inline mobile-toggle script is intrinsically larger than the budget allows per file.
- `Footer.astro` is 158 lines because of the four-column structure + three social SVG paths + brand column.

**Recommendation:** `size:exception` for this slice, or split into two stacked PRs — PR-A (`cn.ts` + tokens + BaseLayout, ~373 LOC, well under 600) and PR-B (the four `.astro` components, ~593 LOC, just under 600). The orchestrator's prompt did not pre-decide; if a stacked split is preferred, Phase 2 can be re-run with `auto-chain` or `feature-branch-chain` and PR-B lands on top of PR-A.

## Structured status consumed / produced

- Consumed: implicit `applyState: ready` for Phase 2 from the orchestrator context (no native status JSON supplied for this execution; `artifactStore: openspec` is inferred from the allowed edit surfaces list and from `openspec/config.yaml`).
- Produced: this `apply-progress.md` plus updated `tasks.md` checkboxes under `openspec/changes/v1-initial-release/`.
- Action context warnings: none. The orchestrator surfaced an explicit `allowedEditRoots` set inside the prompt; every file written stays inside that set. `actionContext.mode` is treated as `workspace-implementation` because files were edited inside the smart-pc repo root.
- Memory contract: artifact store is `openspec`; persistence is on disk only. `mem_save` / `mem_update` Engram tools were not invoked because the store is filesystem-backed and the parent owns delegation.
