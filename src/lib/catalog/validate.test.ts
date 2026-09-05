/**
 * smart-pc · catalog validation tests (PR 1, strict TDD).
 *
 * RED phase: every test references `src/lib/catalog/validate.ts` and
 * `src/lib/catalog/catalog-types.ts` which do NOT exist yet, so the file
 * fails the suite until the GREEN implementation lands.
 *
 * The validators MUST be pure: no `Date.now()`, no `fetch`, no filesystem
 * access. They accept already-parsed JSON values and return a
 * `ValidationResult<T>` that carries an aggregated issue list.
 */
import { describe, expect, it } from "vitest";
import allStockStatuses from "./__fixtures__/all-stock-statuses.json";
import badUrl from "./__fixtures__/bad-url.json";
import danglingReference from "./__fixtures__/dangling-reference.json";
import duplicateIds from "./__fixtures__/duplicate-id.json";
import duplicateOfferId from "./__fixtures__/duplicate-offer-id.json";
import floatPrice from "./__fixtures__/float-price.json";
import mismatchNormalizedCost from "./__fixtures__/mismatch-normalized-cost.json";
import missingConversionUsd from "./__fixtures__/missing-conversion-usd.json";
import naiveDate from "./__fixtures__/naive-date.json";
import placeholderUrlOffer from "./__fixtures__/placeholder-url-offer.json";
import recommendedWithFee from "./__fixtures__/recommended-with-fee.json";
import schemaMismatch from "./__fixtures__/schema-mismatch.json";
import validCatalog from "./__fixtures__/valid-catalog.json";
import validMultiOffer from "./__fixtures__/valid-multi-offer.json";
import {
  validateCatalog,
  validateCatalogComponents,
  validateCatalogPrebuilds,
  validateCatalogServices,
  validatePricingPolicy,
} from "./validate";

describe("validateCatalogComponents", () => {
  it("accepts a fully valid component list", () => {
    const result = validateCatalogComponents(validCatalog.components);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.length).toBe(validCatalog.components.length);
    }
  });

  it("accepts a component without imageUrl (optional)", () => {
    const valid = validCatalog.components[0];
    const input = {
      ...valid,
      // imageUrl is optional — drop it
    };
    delete (input as { imageUrl?: string }).imageUrl;
    const result = validateCatalogComponents([input]);
    expect(result.ok).toBe(true);
  });

  it("rejects a component with a duplicate id", () => {
    const result = validateCatalogComponents(duplicateIds.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const dup = result.issues.find((i) =>
        i.message.toLowerCase().includes("duplicate"),
      );
      expect(dup).toBeDefined();
      expect(dup?.path).toMatch(/components\[\d+\]\.id/);
    }
  });

  it("rejects a non-http sourceUrl", () => {
    const result = validateCatalogComponents(badUrl.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".sourceUrl"));
      expect(issue).toBeDefined();
    }
  });

  it("rejects a timezone-naive checkedAt in an offer", () => {
    const result = validateCatalogComponents(naiveDate.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".checkedAt"));
      expect(issue).toBeDefined();
    }
  });

  it("rejects a non-integer (float) listedAmount in a COP offer", () => {
    const result = validateCatalogComponents(floatPrice.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".listedAmount"));
      expect(issue).toBeDefined();
    }
  });

  it("rejects a negative listedAmount in an offer", () => {
    const input = [
      {
        ...validCatalog.components[0],
        offers: [
          {
            ...validCatalog.components[0].offers[0],
            listedAmount: -1,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".listedAmount"));
      expect(issue).toBeDefined();
    }
  });

  it("rejects an empty specs object", () => {
    const input = [
      {
        ...validCatalog.components[0],
        specs: {},
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".specs"));
      expect(issue).toBeDefined();
    }
  });

  it("rejects an unsupported category", () => {
    const input = [
      {
        ...validCatalog.components[0],
        category: "smartwatch",
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".category"));
      expect(issue).toBeDefined();
    }
  });

  it("rejects a malformed imageUrl", () => {
    const input = [
      {
        ...validCatalog.components[0],
        imageUrl: "ftp://example.com/img.jpg",
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find((i) => i.path.endsWith(".imageUrl"));
      expect(issue).toBeDefined();
    }
  });

  it("aggregates multiple independent issues in one pass", () => {
    const input = [
      {
        ...validCatalog.components[0],
        offers: [
          {
            ...validCatalog.components[0].offers[0],
            listedAmount: 320000.5,
            sourceUrl: "not a url",
            checkedAt: "2025-02-18",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every issue carries a non-empty file and path", () => {
    const result = validateCatalogComponents(badUrl.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const issue of result.issues) {
        expect(issue.file.length).toBeGreaterThan(0);
        expect(issue.path.length).toBeGreaterThan(0);
        expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("validateCatalogServices", () => {
  it("accepts recommended services with min <= max and no feeCop", () => {
    const recommended = validCatalog.services.find(
      (s) => s.status === "recommended",
    );
    const result = validateCatalogServices([recommended]);
    expect(result.ok).toBe(true);
  });

  it("rejects a reference service whose referencePriceCop is negative", () => {
    const reference = validCatalog.services.find(
      (s) => s.status === "reference",
    );
    const input = [
      {
        ...reference,
        referencePriceCop: -1,
      },
    ];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((i) => i.path.endsWith(".referencePriceCop")),
      ).toBe(true);
    }
  });

  it("rejects a confirmed service that also carries referenceNote", () => {
    const confirmed = validCatalog.services.find(
      (s) => s.status === "confirmed",
    );
    const input = [
      {
        ...confirmed,
        referenceNote: "should not be here",
      },
    ];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a service whose status is missing or invalid", () => {
    const input = [
      {
        ...validCatalog.services[0],
        status: "bogus-status",
      },
    ];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.endsWith(".status"))).toBe(true);
    }
  });

  it("rejects a recommended service with negative recommendedMinCop", () => {
    const recommended = validCatalog.services.find(
      (s) => s.status === "recommended",
    );
    const input = [
      {
        ...recommended,
        recommendedMinCop: -1,
      },
    ];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a recommended service missing confirmationNote", () => {
    const recommended = validCatalog.services.find(
      (s) => s.status === "recommended",
    );
    const input = [{ ...recommended, confirmationNote: "" }];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a reference service missing referenceNote", () => {
    const reference = validCatalog.services.find(
      (s) => s.status === "reference",
    );
    const input = [{ ...reference, referenceNote: "" }];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a recommended service that ALSO carries feeCop", () => {
    const result = validateCatalogServices(recommendedWithFee.services);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const issue = result.issues.find(
        (i) => i.path.endsWith(".feeCop") || i.path.endsWith(".status"),
      );
      expect(issue).toBeDefined();
    }
  });

  it("rejects a recommended service with min > max", () => {
    const input = [
      {
        ...validCatalog.services.find((s) => s.status === "recommended"),
        recommendedMinCop: 100,
        recommendedMaxCop: 50,
      },
    ];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (i) =>
            i.path.includes("recommendedMinCop") ||
            i.path.includes("recommendedMaxCop"),
        ),
      ).toBe(true);
    }
  });

  it("requires referenceNote on reference services", () => {
    const input = [
      {
        ...validCatalog.services.find((s) => s.status === "reference"),
        referenceNote: "",
      },
    ];
    const result = validateCatalogServices(input);
    expect(result.ok).toBe(false);
  });
});

describe("validateCatalogPrebuilds", () => {
  it("accepts valid prebuild references", () => {
    const result = validateCatalogPrebuilds(validCatalog.prebuilds);
    expect(result.ok).toBe(true);
  });

  it("rejects a non-object prebuild entry", () => {
    const result = validateCatalogPrebuilds(["not-an-object"]);
    expect(result.ok).toBe(false);
  });

  it("rejects a prebuild with non-boolean featured", () => {
    const input = [
      { ...validCatalog.prebuilds[0], featured: "true" as unknown },
    ];
    const result = validateCatalogPrebuilds(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a prebuild with an invalid tier", () => {
    const input = [{ ...validCatalog.prebuilds[0], tier: "ultra" as unknown }];
    const result = validateCatalogPrebuilds(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a prebuild with empty componentIds", () => {
    const input = [{ ...validCatalog.prebuilds[0], componentIds: [] }];
    const result = validateCatalogPrebuilds(input);
    expect(result.ok).toBe(false);
  });
});

describe("validatePricingPolicy", () => {
  it("accepts a policy with zero margins (defaults)", () => {
    const input = {
      schemaVersion: 1,
      freshness: { staleAfterDays: 30 },
      defaultPolicyId: "default",
      policies: [
        {
          id: "default",
          label: "Margen estándar",
          confirmed: true,
        },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.policies[0].fixedMarginCop).toBe(0);
      expect(result.value.policies[0].percentageMargin).toBe(0);
    }
  });

  it("rejects staleAfterDays <= 0", () => {
    const input = {
      ...validCatalog.policy,
      freshness: { staleAfterDays: 0 },
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects negative percentage margin", () => {
    const input = {
      ...validCatalog.policy,
      policies: [{ ...validCatalog.policy.policies[0], percentageMargin: -1 }],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects percentage margin with more than two decimals", () => {
    const input = {
      ...validCatalog.policy,
      policies: [
        { ...validCatalog.policy.policies[0], percentageMargin: 12.345 },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects negative fixedMarginCop", () => {
    const input = {
      ...validCatalog.policy,
      policies: [
        {
          ...validCatalog.policy.policies[0],
          fixedMarginCop: -100,
        },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((i) => i.path.endsWith(".fixedMarginCop")),
      ).toBe(true);
    }
  });

  it("rejects fixedMarginCop that is not an integer", () => {
    const input = {
      ...validCatalog.policy,
      policies: [
        {
          ...validCatalog.policy.policies[0],
          fixedMarginCop: 1.5,
        },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing/non-boolean confirmed flag", () => {
    const input = {
      ...validCatalog.policy,
      policies: [
        {
          ...validCatalog.policy.policies[0],
          confirmed: "yes",
        },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.endsWith(".confirmed"))).toBe(
        true,
      );
    }
  });

  it("rejects a missing policy id", () => {
    const input = {
      ...validCatalog.policy,
      policies: [
        {
          ...validCatalog.policy.policies[0],
          id: "",
        },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a policy entry that is not an object", () => {
    const input = {
      ...validCatalog.policy,
      policies: ["not-an-object"],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing/non-string label", () => {
    const input = {
      ...validCatalog.policy,
      policies: [
        {
          ...validCatalog.policy.policies[0],
          label: "",
        },
      ],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.endsWith(".label"))).toBe(true);
    }
  });

  it("rejects empty policies array", () => {
    const input = {
      ...validCatalog.policy,
      policies: [],
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a policy document that is not an object", () => {
    const result = validatePricingPolicy(null);
    expect(result.ok).toBe(false);
  });

  it("rejects missing/non-string defaultPolicyId", () => {
    const input = {
      ...validCatalog.policy,
      defaultPolicyId: "",
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === "defaultPolicyId")).toBe(
        true,
      );
    }
  });

  it("rejects non-positive staleAfterDays", () => {
    const input = {
      ...validCatalog.policy,
      freshness: { staleAfterDays: -1 },
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });

  it("rejects non-integer staleAfterDays", () => {
    const input = {
      ...validCatalog.policy,
      freshness: { staleAfterDays: 1.5 },
    };
    const result = validatePricingPolicy(input);
    expect(result.ok).toBe(false);
  });
});

describe("validateCatalog (full cross-document)", () => {
  it("accepts the canonical valid catalog", () => {
    const result = validateCatalog(validCatalog);
    expect(result.ok).toBe(true);
  });

  it("rejects a schemaVersion mismatch", () => {
    const result = validateCatalog(schemaMismatch);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const v = result.issues.find((i) => i.path.endsWith(".schemaVersion"));
      expect(v).toBeDefined();
    }
  });

  it("rejects a dangling componentId reference in a prebuild", () => {
    const result = validateCatalog(danglingReference);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const ref = result.issues.find((i) => i.path.includes("componentIds"));
      expect(ref).toBeDefined();
    }
  });

  it("rejects a dangling serviceId reference in a prebuild", () => {
    const input = {
      ...validCatalog,
      prebuilds: [
        {
          ...validCatalog.prebuilds[0],
          serviceId: "service-that-does-not-exist",
        },
      ],
    };
    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const ref = result.issues.find((i) => i.path.endsWith(".serviceId"));
      expect(ref).toBeDefined();
    }
  });

  it("rejects a dangling pricingPolicyId reference", () => {
    const input = {
      ...validCatalog,
      prebuilds: [
        {
          ...validCatalog.prebuilds[0],
          pricingPolicyId: "policy-that-does-not-exist",
        },
      ],
    };
    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a dangling defaultPolicyId", () => {
    const input = {
      ...validCatalog,
      policy: { ...validCatalog.policy, defaultPolicyId: "missing" },
    };
    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a missing/non-array components section", () => {
    const input = { ...validCatalog, components: null };
    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === "components")).toBe(true);
    }
  });

  it("rejects a missing/non-array services section", () => {
    const input = { ...validCatalog, services: null };
    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === "services")).toBe(true);
    }
  });

  it("rejects a missing/non-array prebuilds section", () => {
    const input = { ...validCatalog, prebuilds: null };
    const result = validateCatalog(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === "prebuilds")).toBe(true);
    }
  });
});

// ===========================================================================
// Slice 1 · multi-offer schema RED tests
// ===========================================================================

describe("validateCatalogComponents · multi-offer (Slice 1 RED)", () => {
  it("accepts a multi-offer component with all required offer fields", () => {
    const result = validateCatalogComponents(validMultiOffer.components);
    expect(result.ok).toBe(true);
  });

  it("rejects a component with an empty offers[] array", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.includes(".offers"))).toBe(true);
    }
  });

  it("rejects a component missing offers[] entirely", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: undefined,
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with missing retailer", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            retailer: "",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.includes("retailer"))).toBe(true);
    }
  });

  it("rejects an offer with missing sourceCurrency", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            sourceCurrency: undefined,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.includes("sourceCurrency"))).toBe(
        true,
      );
    }
  });

  it("rejects an offer with a non-numeric listedAmount", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            listedAmount: "lots",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with a negative listedAmount", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            listedAmount: -100,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with a float listedAmount when sourceCurrency is COP", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            sourceCurrency: "COP",
            listedAmount: 504000.5,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with a non-absolute http(s) sourceUrl", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            sourceUrl: "ftp://example.com/cpu",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with the placeholder host/<slug>/p pattern", () => {
    const result = validateCatalogComponents(placeholderUrlOffer.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const placeholder = result.issues.find((i) =>
        i.path.includes("sourceUrl"),
      );
      expect(placeholder).toBeDefined();
      expect(placeholder?.message.toLowerCase()).toMatch(/placeholder|host/);
    }
  });

  it("rejects an offer with empty offerId", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            offerId: "",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate offerId within the same component", () => {
    const result = validateCatalogComponents(duplicateOfferId.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((i) =>
          i.message.toLowerCase().includes("duplicate"),
        ),
      ).toBe(true);
    }
  });

  it("rejects an offer missing sellerCondition", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            sellerCondition: undefined,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer missing availability", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            availability: undefined,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer missing evidenceStatus", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            evidenceStatus: undefined,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with an unsupported evidenceStatus", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            evidenceStatus: "made-up-status",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an offer with a naive checkedAt timestamp", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            checkedAt: "2026-09-04T00:00:00",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("accepts a non-COP offer without conversionAssumption (recorded as evidence only)", () => {
    // Per orchestrator: a non-COP offer without conversion metadata is
    // recorded as evidence only; the component's priceStatus handles the
    // downgrade. The validator MUST NOT require conversionAssumption.
    const result = validateCatalogComponents(missingConversionUsd.components);
    expect(result.ok).toBe(true);
  });

  it("rejects priceStatus 'verified' when a confirmed non-COP offer lacks conversion", () => {
    const input = [
      {
        ...missingConversionUsd.components[0],
        priceStatus: "verified",
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.endsWith("priceStatus"))).toBe(
        true,
      );
    }
  });

  it("rejects a non-COP offer whose normalizedCostCop mismatches the conversion math by more than COP 1000", () => {
    const result = validateCatalogComponents(mismatchNormalizedCost.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some((i) => i.path.includes("normalizedCostCop")),
      ).toBe(true);
    }
  });

  it("rejects a negative shippingImportTaxCop", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            shippingImportTaxCop: -50,
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a component missing priceStatus", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        priceStatus: undefined,
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a component with an unsupported priceStatus", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        priceStatus: "maybe",
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a component missing stockStatus", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        stockStatus: undefined,
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a component with an unsupported stockStatus", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        stockStatus: "kind-of",
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a component missing stockQuantity entirely", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        stockQuantity: undefined,
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("accepts stockQuantity = null (unknown quantity)", () => {
    const result = validateCatalogComponents([
      {
        ...validMultiOffer.components[0],
        stockQuantity: null,
      },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects a negative stockQuantity", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        stockQuantity: -1,
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects a non-integer stockQuantity", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        stockQuantity: 1.5,
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty restockNote when present", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        restockNote: "",
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("accepts each stockStatus fixture (in-stock, limited, out-of-stock, unknown)", () => {
    const result = validateCatalogComponents(allStockStatuses.components);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error(
        `expected all-stock-statuses fixture to validate, got ${result.issues.length} issues`,
      );
    }
  });

  it("rejects priceStatus: verified when no confirmed offer exists", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        priceStatus: "verified",
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            evidenceStatus: "category-page",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
  });

  it("aggregates multiple offer issues across the component", () => {
    const input = [
      {
        ...validMultiOffer.components[0],
        offers: [
          {
            ...validMultiOffer.components[0].offers[0],
            listedAmount: -5,
            checkedAt: "no-timestamp",
            sourceUrl: "ftp://bad",
          },
        ],
      },
    ];
    const result = validateCatalogComponents(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every issue carries a non-empty file and path on offer failures", () => {
    const result = validateCatalogComponents(placeholderUrlOffer.components);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      for (const issue of result.issues) {
        expect(issue.file.length).toBeGreaterThan(0);
        expect(issue.path.length).toBeGreaterThan(0);
        expect(issue.message.length).toBeGreaterThan(0);
      }
    }
  });
});
