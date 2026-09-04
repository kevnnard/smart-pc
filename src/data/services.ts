/**
 * smart-pc · service catalog (Phase 3 → PR 2 migrated).
 *
 * Source of truth moved to `src/data/catalog/services.json` (validated at
 * build time). This module re-exports the four legacy services through
 * the adapter:
 *
 *   - `armado-basico`            (recommended, COP 30k–80k range)
 *   - `armado-profesional`       (recommended, COP 120k–200k range)
 *   - `promo-retail-armado`      (reference, ~COP 11.490 with caveat)
 *   - `armado-basico-confirmado` (confirmed, COP 150k fixed — Gate-A)
 *
 * The legacy `ServiceRecord` shape keeps `startingPrice` for display. For
 * `confirmed` records this equals the confirmed fee; for `recommended`
 * records it is the lower bound of the recommended range; for `reference`
 * records it is the reference price (when present). A recommendation is
 * structurally NEVER surfaced as a confirmed price — the discriminated
 * union in `catalog-types.ts` makes that impossible (decision D-1).
 */
import { toLegacyService } from "../lib/catalog/adapters";
import { catalog } from "../lib/catalog/load-catalog";

export const services = Object.freeze(catalog.services.map(toLegacyService));
