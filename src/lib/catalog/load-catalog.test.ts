/**
 * smart-pc · catalog loader tests (PR 1, strict TDD).
 *
 * The loader validates already-parsed documents through `validateCatalog`
 * and returns either a `Catalog` or a `CatalogValidationError` whose
 * `issues` field exposes the file + path + message of every problem.
 */
import { describe, expect, it } from "vitest";
import danglingReference from "./__fixtures__/dangling-reference.json";
import duplicateIds from "./__fixtures__/duplicate-id.json";
import schemaMismatch from "./__fixtures__/schema-mismatch.json";
import validCatalog from "./__fixtures__/valid-catalog.json";
import { buildCatalog, CatalogValidationError } from "./load-catalog";

describe("buildCatalog", () => {
  it("builds a Catalog from the valid fixture and exposes lookup maps", () => {
    const result = buildCatalog(validCatalog);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.components.length).toBe(
        validCatalog.components.length,
      );
      const cpu = result.value.byComponentId.get("cpu-amd-ryzen-5-5600");
      expect(cpu?.category).toBe("cpu");
      expect(cpu?.observedPriceCop).toBe(320000);
      expect(result.value.byServiceId.has("armado-basico-confirmado")).toBe(
        true,
      );
      expect(result.value.byPolicyId.has("default")).toBe(true);
      expect(result.value.byPrebuildSlug.has("essentials")).toBe(true);
    }
  });

  it("fails with duplicate component ids", () => {
    const result = buildCatalog({
      ...validCatalog,
      components: duplicateIds.components,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dup = result.issues.find((i) =>
        i.message.toLowerCase().includes("duplicate"),
      );
      expect(dup).toBeDefined();
    }
  });

  it("fails on schemaVersion mismatch", () => {
    const result = buildCatalog(schemaMismatch);
    expect(result.ok).toBe(false);
  });

  it("fails on a dangling componentId reference", () => {
    const result = buildCatalog(danglingReference);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const ref = result.issues.find((i) => i.path.includes("componentIds"));
      expect(ref).toBeDefined();
    }
  });

  it("returns a Catalog whose arrays and maps are readonly", () => {
    const result = buildCatalog(validCatalog);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.value.components)).toBe(true);
      // Mutation attempts must throw in strict mode and silently fail in
      // sloppy mode — either way, the array remains unchanged.
      const before = result.value.components.length;
      try {
        (result.value.components as unknown[]).push({} as never);
      } catch {
        // Strict mode throws.
      }
      expect(result.value.components.length).toBe(before);
    }
  });

  it("aggregates multiple independent errors in one pass", () => {
    const result = buildCatalog({
      schemaVersion: 2, // mismatch
      components: duplicateIds.components,
      services: [],
      prebuilds: [],
      policy: validCatalog.policy,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("CatalogValidationError carries the issue list and a meaningful message", () => {
    const result = buildCatalog(danglingReference);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const err = new CatalogValidationError(result.issues);
      expect(err.issues).toBe(result.issues);
      expect(err.message).toMatch(/catalog validation failed/i);
      // First issue is surfaced in the error message.
      expect(err.message).toContain(result.issues[0].file);
    }
  });
});

describe("catalog singleton (build-time entry point)", () => {
  it("exposes the canonical catalog at module import time", async () => {
    // The singleton is created on first import of the loader module.
    const mod = await import("./load-catalog");
    expect(mod.catalog.schemaVersion).toBe(1);
    expect(mod.catalog.components.length).toBeGreaterThan(0);
    expect(mod.catalog.services.length).toBeGreaterThan(0);
    expect(mod.catalog.prebuilds.length).toBeGreaterThan(0);
  });
});
