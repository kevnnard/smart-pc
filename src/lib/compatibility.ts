/**
 * smart-pc · compatibility rules (Phase 3, strict TDD).
 *
 * Pure function: given a partial `PCSelection`, return a `CompatibilityResult`
 * with a single overall level (`compatible` | `warning` | `incompatible`)
 * and a list of human-readable messages.
 *
 * Rule order (V1):
 *   1. CPU ↔ motherboard socket must match exactly.
 *   2. GPU power draw + ~200 W system overhead must fit inside
 *      PSU wattage × 0.85 (efficiency headroom).
 *   3. Motherboard RAM type must match the first selected RAM stick.
 *
 * Future rules (storage interface, cooler socket support) are added in
 * subsequent tasks as RED → GREEN cycles; this module is the single source
 * of truth for the configurator (Phase 7) and the build detail page (Phase 6).
 */
import type {
  CompatibilityLevel,
  CompatibilityResult,
  PCSelection,
} from "../data/types";

export function validate(selection: PCSelection): CompatibilityResult {
  const messages: string[] = [];
  let level: CompatibilityLevel = "compatible";

  // Rule 1: Socket compatibility (CPU ↔ motherboard).
  if (selection.cpu && selection.motherboard) {
    if (selection.cpu.socket !== selection.motherboard.socket) {
      level = "incompatible";
      messages.push(
        `Socket mismatch: CPU uses ${selection.cpu.socket} but motherboard requires ${selection.motherboard.socket}`,
      );
    }
  }

  return { level, messages };
}
