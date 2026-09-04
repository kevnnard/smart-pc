/**
 * smart-pc · catalog loader (PR 1).
 *
 * Static JSON imports (decision D-4) so Vite inlines every document at
 * build time. The build-time `catalog` singleton throws a
 * `CatalogValidationError` whose `issues` field carries the file + path
 * + message of every problem found (see design.md §5 and decision D-2).
 *
 * The `buildCatalog(input)` function is exported separately so tests
 * can drive it with fixtures without touching the real documents.
 */
import componentsDoc from "../../data/catalog/components.json";
import prebuildsDoc from "../../data/catalog/prebuilds.json";
import policyDoc from "../../data/catalog/pricing-policy.json";
import servicesDoc from "../../data/catalog/services.json";
import type { Catalog } from "./catalog-types";
import type { CatalogIssue } from "./validate";
import { validateCatalog } from "./validate";

export class CatalogValidationError extends Error {
  readonly issues: readonly CatalogIssue[];
  constructor(issues: readonly CatalogIssue[]) {
    const head = issues[0]
      ? `catalog validation failed: ${issues[0].file} → ${issues[0].path} (${issues[0].message})`
      : "catalog validation failed";
    super(head);
    this.name = "CatalogValidationError";
    this.issues = issues;
  }
}

/**
 * Validate an already-parsed set of catalog documents and return either
 * a `Catalog` with frozen lookup maps or a list of issues. Pure: no
 * network, no filesystem, no logging.
 */
export function buildCatalog(
  input: Parameters<typeof validateCatalog>[0],
): ReturnType<typeof validateCatalog> {
  return validateCatalog(input);
}

function load(): Catalog {
  const input = {
    schemaVersion: componentsDoc.schemaVersion as number,
    components: componentsDoc.components as readonly unknown[],
    services: servicesDoc.services as readonly unknown[],
    prebuilds: prebuildsDoc.prebuilds as readonly unknown[],
    policy: policyDoc,
  };
  const result = validateCatalog(input);
  if (!result.ok) {
    throw new CatalogValidationError(result.issues);
  }
  return result.value;
}

/**
 * Build-time singleton. Throws `CatalogValidationError` if any document
 * is invalid — Astro surfaces that as a build failure with the file +
 * path + message of every issue.
 */
export const catalog: Catalog = load();
