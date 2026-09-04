/**
 * smart-pc · component catalog (Phase 3 → PR 2 migrated).
 *
 * The catalog is now sourced from `src/data/catalog/components.json`
 * (hand-edited JSON, validated at build time). This module is a thin
 * adapter: it loads the validated catalog, maps each `CatalogComponent`
 * to the legacy flat `Component` shape via `toLegacyComponent`, and
 * re-exports the seven named arrays (`components`, `cpus`, `gpus`,
 * `motherboards`, `rams`, `storages`, `psus`, `coolers`) that every
 * existing page and component imports.
 *
 * Compatibility:
 *   - `validate()` in `src/lib/compatibility.ts` reads the same flat
 *     fields (socket, ramType, ramSlots, tdp, wattage, wattageDraw,
 *     interface_, formFactor) so no consumer file has to change.
 *
 * Prices:
 *   - Whole Colombian pesos (COP), no decimals. Display via
 *     `formatCop()` from `src/lib/money.ts`.
 *
 * Rollback:
 *   - The pre-migration constants from the original Phase 3 file are
 *     kept in git history. Reverting this file restores the hardcoded
 *     catalog; nothing else depends on the catalog JSON.
 */
import { toLegacyComponent } from "../lib/catalog/adapters";
import { catalog } from "../lib/catalog/load-catalog";
import type { Component } from "./types";

// Freeze the legacy arrays so accidental mutation cannot leak into UI.
const all: readonly Component[] = Object.freeze(
  catalog.components.map(toLegacyComponent),
);

function filterByCategory(
  category: Component["category"],
): readonly Component[] {
  return Object.freeze(all.filter((c) => c.category === category));
}

export const components: readonly Component[] = all;

export const cpus: readonly Component[] = filterByCategory("cpu");
export const gpus: readonly Component[] = filterByCategory("gpu");
export const motherboards: readonly Component[] =
  filterByCategory("motherboard");
export const rams: readonly Component[] = filterByCategory("ram");
export const storages: readonly Component[] = filterByCategory("storage");
export const psus: readonly Component[] = filterByCategory("psu");
export const coolers: readonly Component[] = filterByCategory("cooler");
