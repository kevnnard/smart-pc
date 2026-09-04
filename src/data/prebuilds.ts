/**
 * smart-pc · prebuilt PCs (Phase 3 → PR 2 migrated).
 *
 * Three tiers (essentials / creator / apex) are now sourced from
 * `src/data/catalog/prebuilds.json`. Each prebuild stores component
 * identifiers only — there is no copied `basePrice` in the JSON. The
 * derived `basePrice` is computed by the quote engine
 * (`calculateQuote`) from the referenced components, the configured
 * service (must be `confirmed`), and the pricing policy.
 *
 * Per the spec ("Observed prices remain separate from margin"), the
 * prebuilt price equals `componentSubtotalCop + serviceFeeCop +
 * marginAmountCop` and `basePrice` is the same value
 * (`finalTotalCop`).
 *
 * The legacy export name (`prebuilds`) and shape (`PrebuiltPC`) are
 * preserved so no consumer file has to change.
 */
import { toLegacyPrebuilt } from "../lib/catalog/adapters";
import { catalog } from "../lib/catalog/load-catalog";

// `now` is injected at module load time so the derived `basePrice`
// matches the build timestamp. The integrator runs at Astro build time,
// so the timestamp is deterministic per build.
const BUILD_TIME = new Date();

export const prebuilds = Object.freeze(
  catalog.prebuilds.map((p) => toLegacyPrebuilt(p, catalog, BUILD_TIME)),
);
