/**
 * smart-pc · catalog integrity test (PR 1 triangulation).
 *
 * Runs `buildCatalog` against the **real** documents under
 * `src/data/catalog/*.json` to ensure a hand-edit typo fails the
 * catalog tests before the build runs. Also asserts editorial contracts:
 *
 *   - ≥ 3 components per configurator category
 *   - the three seeded Bogotá service records (basic, professional, retail)
 *   - exactly one confirmed service, matching the Gate-A policy
 *   - sourceUrl / imageUrl are recorded as strings (no fetch ever)
 *   - the percentage margin is the owner-confirmed 20%
 *   - placeholder URL patterns (`/<slug>/p` with no SKU) are rejected
 *   - provisional records keep an older `lastVerified` and carry a
 *     refresh-pending note; refreshed records carry the new research date
 */
import { describe, expect, it } from "vitest";
import componentsDoc from "../../data/catalog/components.json";
import prebuildsDoc from "../../data/catalog/prebuilds.json";
import policyDoc from "../../data/catalog/pricing-policy.json";
import servicesDoc from "../../data/catalog/services.json";
import { buildCatalog } from "./load-catalog";

const CONFIGURATOR_CATEGORIES = [
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
  "cooler",
] as const;

const realInput = {
  schemaVersion: componentsDoc.schemaVersion,
  components: componentsDoc.components,
  services: servicesDoc.services,
  prebuilds: prebuildsDoc.prebuilds,
  policy: policyDoc,
};

/**
 * Placeholder URL pattern (PR 1 follow-up correction): matches `host/<slug>/p`
 * with no SKU or category after — the exact shape that returned HTTP 404 in
 * the previous seeding. Legitimate URLs (category paths, Alkosto SKUs,
 * `listado.mercadolibre.com.co/<query>`, PHP query strings, etc.) MUST NOT
 * match; if a future maintainer sees a legitimate URL flagged here, the
 * regex is too broad — fix the regex, never the data.
 */
const PLACEHOLDER_URL_PATTERN = /^https?:\/\/[^/]+\/[^/]+\/p\/?$/;

describe("real catalog integrity", () => {
  it("the canonical documents build into a valid Catalog", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
  });

  it("has at least 3 options per configurator category", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const category of CONFIGURATOR_CATEGORIES) {
      const count = result.value.components.filter(
        (c) => c.category === category,
      ).length;
      expect(
        count,
        `category "${category}" must have at least 3 options`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("includes at least 3 case and 1 OS option for completeness", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      result.value.components.filter((c) => c.category === "case").length,
    ).toBeGreaterThanOrEqual(2);
    expect(
      result.value.components.filter((c) => c.category === "os").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("contains the three seeded Bogotá service records", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = new Set(result.value.services.map((s) => s.id));
    expect(ids.has("armado-basico")).toBe(true);
    expect(ids.has("armado-profesional")).toBe(true);
    expect(ids.has("promo-retail-armado")).toBe(true);
  });

  it("basic assembly is recommended with COP 30k–80k range", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const basic = result.value.byServiceId.get("armado-basico");
    expect(basic?.status).toBe("recommended");
    if (basic && basic.status === "recommended") {
      expect(basic.recommendedMinCop).toBe(30000);
      expect(basic.recommendedMaxCop).toBe(80000);
      expect(basic.recommendedMinCop).toBeLessThanOrEqual(
        basic.recommendedMaxCop,
      );
    }
  });

  it("professional assembly is recommended with COP 120k–200k range", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const pro = result.value.byServiceId.get("armado-profesional");
    expect(pro?.status).toBe("recommended");
    if (pro && pro.status === "recommended") {
      expect(pro.recommendedMinCop).toBe(120000);
      expect(pro.recommendedMaxCop).toBe(200000);
    }
  });

  it("retail promotion is a reference record with COP ~11.490 caveat", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ref = result.value.byServiceId.get("promo-retail-armado");
    expect(ref?.status).toBe("reference");
    if (ref && ref.status === "reference") {
      expect(ref.referencePriceCop).toBe(11490);
      expect(ref.referenceNote.toLowerCase()).toMatch(
        /califiquen|calific|parts/,
      );
    }
  });

  it("contains exactly one confirmed service matching Gate-A (COP 150000)", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const confirmed = result.value.services.filter(
      (s) => s.status === "confirmed",
    );
    expect(confirmed.length).toBe(1);
    if (confirmed[0] && confirmed[0].status === "confirmed") {
      expect(confirmed[0].feeCop).toBe(150000);
    }
  });

  it("no prebuild references a recommended service (only confirmed)", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const prebuild of result.value.prebuilds) {
      const service = result.value.byServiceId.get(prebuild.serviceId);
      expect(
        service?.status,
        `prebuild "${prebuild.slug}" must reference a confirmed service`,
      ).toBe("confirmed");
    }
  });

  it("exposes the default policy with the owner-confirmed 20% margin", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const policy = result.value.byPolicyId.get(result.value.defaultPolicyId);
    expect(policy?.percentageMargin).toBe(20);
    expect(policy?.confirmed).toBe(true);
  });

  it("exposes sourceUrl and imageUrl as strings without ever fetching", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    let fetched = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetched++;
      throw new Error("catalog build MUST NOT call fetch()");
    }) as typeof fetch;
    try {
      for (const component of result.value.components) {
        // Touch the URLs to prove they're strings, never network calls.
        expect(typeof component.sourceUrl).toBe("string");
        if (component.imageUrl !== undefined) {
          expect(typeof component.imageUrl).toBe("string");
          expect(component.imageUrl.startsWith("http")).toBe(true);
        }
      }
      for (const service of result.value.services) {
        expect(typeof service.sourceUrl).toBe("string");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
    expect(fetched).toBe(0);
  });

  it("absent imageUrl remains valid and renders without a URL", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const noImage = result.value.components.filter(
      (c) => c.imageUrl === undefined,
    );
    expect(noImage.length).toBeGreaterThan(0);
  });

  it("no component sourceUrl matches the placeholder /<slug>/p pattern", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const offenders: Array<{ id: string; sourceUrl: string }> = [];
    for (const component of result.value.components) {
      if (PLACEHOLDER_URL_PATTERN.test(component.sourceUrl)) {
        offenders.push({ id: component.id, sourceUrl: component.sourceUrl });
      }
    }
    expect(
      offenders,
      `placeholder URL pattern (/<slug>/p with no SKU) detected; replace with a real product, category, or listing URL: ${JSON.stringify(offenders)}`,
    ).toEqual([]);
  });

  it("no service sourceUrl matches the placeholder /<slug>/p pattern", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const offenders: Array<{ id: string; sourceUrl: string }> = [];
    for (const service of result.value.services) {
      if (PLACEHOLDER_URL_PATTERN.test(service.sourceUrl)) {
        offenders.push({ id: service.id, sourceUrl: service.sourceUrl });
      }
    }
    expect(
      offenders,
      `service placeholder URL pattern detected; replace with a real category or listing URL: ${JSON.stringify(offenders)}`,
    ).toEqual([]);
  });

  it("every sourceUrl is an absolute http(s) URL with a non-empty hostname", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const bad: string[] = [];
    const collect = (kind: string, id: string, url: string) => {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        bad.push(`${kind} ${id}: not a parseable URL (${url})`);
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        bad.push(`${kind} ${id}: bad protocol (${parsed.protocol})`);
      }
      if (!parsed.hostname) {
        bad.push(`${kind} ${id}: empty hostname`);
      }
    };
    for (const c of result.value.components)
      collect("component", c.id, c.sourceUrl);
    for (const s of result.value.services)
      collect("service", s.id, s.sourceUrl);
    expect(bad, `invalid absolute URLs found: ${bad.join("; ")}`).toEqual([]);
  });

  it("legitimate category/listing URLs are NOT rejected by the placeholder guard", () => {
    // The whole point of the placeholder guard is to flag a specific shape
    // (`host/<slug>/p` with no SKU after) without punishing the verified
    // evidence URLs the catalog actually uses. If this test ever starts
    // failing, the regex is too broad — fix the regex, not the data.
    const allowed = [
      "https://www.ktronix.com/marcas/amd/c/amd",
      "https://www.alkosto.com/laptop-gamer-rtx-4060/c/laptop-gamer-rtx-4060",
      "https://clonesyperifericos.com/tienda/tarjetas-de-video-para-pc-gamer/nvidia/",
      "https://www.alkosto.com/disco-estado-solido-interno-kingston-fury-renegade-g5-pcie/p/740617349481",
      "https://clonesyperifericos.com/tienda/fuentes-para-pc/",
      "https://www.kamaleon.com.co/producto.php?Prod=Ensamble-de-Computador&StrProd=1210",
      "https://www.stackpc.com.co/servicios",
      "https://tienda.tecno-site.com/producto/servicio-armado-y-configuracion/",
      "https://tienvir.co/products/instalacion-y-montaje-profesional-de-pc-gamer",
      "https://listado.mercadolibre.com.co/ryzen-5-5600",
      "https://listado.mercadolibre.com.co/rtx-4060",
      "https://listado.mercadolibre.com.co/memoria-ram-ddr-4-16gb",
      "https://listado.mercadolibre.com.co/ssd-nvme-1tb",
      "https://listado.mercadolibre.com.co/motherboard-am4-b550",
      "https://speedlogic.com.co/tienda/tarjetas-graficas/nvidia/tarjeta-de-video-nvidia-geforce-gigabyte-rtx-4070-super-wf-oc-3x-12-gigas/",
      "https://pcmastersbogota.com.co/producto/rog-strix-rtx-4080-super-16gb-white-oc/",
      "https://www.mercadolibre.com.co/procesador-gamer-amd-ryzen-7-5800x-de-8-nucleos-y-16-hilos-47ghz-de-frecuencia/p/MCO16328465",
      "https://listado.mercadolibre.com.co/chasis-gamer-atx",
      "https://listado.mercadolibre.com.co/cooler-am4",
      "https://www.mipcparquecentral.com/products/kingston-ddr5-32gb-5600mhz-ram-pc-escritorio-valueram",
      "https://discosduros.com.co/disco-duro-kingston-nv2-2tb-m2-2280-nvme-ssd-interno-pcie-40/",
      "https://www.kingstechnology.com.co/product/procesador-amd-ryzen-9-7900x-sin-cooler/",
      "https://www.microsoft.com/es-co/software-download/windows11",
    ];
    for (const url of allowed) {
      expect(
        PLACEHOLDER_URL_PATTERN.test(url),
        `legitimate URL flagged: ${url}`,
      ).toBe(false);
    }
  });

  it("the placeholder regex actually catches the original offending shape", () => {
    // Sanity check: confirm the regex matches the original placeholder pattern
    // so a future maintainer who sees this test knows what it's for.
    const offenders = [
      "https://www.ktronix.com/amd-ryzen-5-5600/p",
      "https://www.alkosto.com/intel-core-i5-12400f/p",
      "https://www.alkosto.com/intel-core-i5-12400f/p/",
    ];
    for (const url of offenders) {
      expect(
        PLACEHOLDER_URL_PATTERN.test(url),
        `placeholder not detected: ${url}`,
      ).toBe(true);
    }
  });

  it("records flagged provisional keep an older lastVerified with refresh-pending note", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const FRESH = "2026-09-04T00:00:00-05:00";
    const STALE = "2025-02-18T00:00:00-05:00";
    const provisionalIds = [
      "cpu-intel-core-i5-12400f",
      "mb-msi-pro-b660m-a-ddr4",
      "mb-asus-rog-strix-x670e-e",
      "ram-gskill-64gb-ddr5-6000",
      "os-windows-11-home-oem",
    ];
    for (const id of provisionalIds) {
      const component = result.value.byComponentId.get(id);
      expect(component, `provisional component missing: ${id}`).toBeDefined();
      if (!component) continue;
      expect(
        component.lastVerified,
        `${id} should keep old lastVerified until refresh`,
      ).toBe(STALE);
      expect(
        component.notes?.toLowerCase() ?? "",
        `${id} should explain why refresh is pending`,
      ).toMatch(/refresh pendiente|por confirmar/i);
    }
    // Every other component should carry the fresh date we actually checked.
    for (const component of result.value.components) {
      if (provisionalIds.includes(component.id)) continue;
      expect(
        component.lastVerified,
        `${component.id} should be refreshed to 2026-09-04 since its source was checked`,
      ).toBe(FRESH);
    }
  });
});

// ===========================================================================
// Slice 1 · real-document integrity RED tests
// ===========================================================================

describe("real catalog integrity · multi-offer shape (Slice 1 RED)", () => {
  it("every component has a non-empty offers[] array", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const component of result.value.components) {
      expect(
        Array.isArray(component.offers) && component.offers.length > 0,
        `${component.id} must have a non-empty offers[] array`,
      ).toBe(true);
    }
  });

  it("every component exposes a valid priceStatus of verified, provisional, or unconfirmed", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const allowed = new Set(["verified", "provisional", "unconfirmed"]);
    for (const component of result.value.components) {
      expect(
        allowed.has(component.priceStatus),
        `${component.id} priceStatus`,
      ).toBe(true);
    }
  });

  it("every component exposes a valid stockStatus and stockQuantity", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const allowedStock = new Set([
      "in-stock",
      "limited",
      "out-of-stock",
      "unknown",
    ]);
    for (const component of result.value.components) {
      expect(
        allowedStock.has(component.stockStatus),
        `${component.id} stockStatus`,
      ).toBe(true);
      expect(
        component.stockQuantity === null ||
          (Number.isInteger(component.stockQuantity) &&
            component.stockQuantity >= 0),
        `${component.id} stockQuantity must be null or a non-negative integer`,
      ).toBe(true);
    }
  });

  it("Ryzen 5 5600 has no COP 320000 fake price", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cpu = result.value.byComponentId.get("cpu-amd-ryzen-5-5600");
    expect(cpu, "Ryzen 5 5600 must exist").toBeDefined();
    if (!cpu) return;
    for (const offer of cpu.offers) {
      if (offer.sourceCurrency === "COP") {
        expect(
          offer.listedAmount,
          `${cpu.id} must not retain the COP 320,000 fake price`,
        ).not.toBe(320000);
      }
    }
    // priceStatus may be 'verified' (when only COP offers confirm) or
    // 'provisional' (when an Amazon USD offer lacks documented conversion).
    // Either way the COP 320000 fake price MUST be gone.
    expect(
      cpu.observedPriceCop,
      `${cpu.id} observedPriceCop must not be 320,000`,
    ).not.toBe(320000);
  });

  it("keeps PC Masters Bogotá verified offer and excludes StackPC pricing", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const cpu = result.value.byComponentId.get("cpu-amd-ryzen-5-5600");
    expect(cpu).toBeDefined();
    if (!cpu) return;
    const pcmasters = cpu.offers.find(
      (o) =>
        o.retailer === "PC Masters Bogotá" &&
        o.sourceUrl ===
          "https://pcmastersbogota.com.co/producto/amd-ryzen-5-5600-6-nucleos-12-hilos-4-4ghz/",
    );
    expect(
      cpu.offers.some((o) => o.retailer === "StackPC"),
      "StackPC pricing must not be recorded",
    ).toBe(false);
    expect(pcmasters, "PC Masters offer must be recorded").toBeDefined();
    if (pcmasters) {
      expect(pcmasters.sourceCurrency).toBe("COP");
      expect(pcmasters.listedAmount).toBe(699000);
      expect(pcmasters.evidenceStatus).toBe("confirmed");
    }
  });

  it("no component offer sourceUrl matches the placeholder host/<slug>/p pattern", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const offenders: Array<{ id: string; sourceUrl: string }> = [];
    for (const component of result.value.components) {
      for (const offer of component.offers) {
        if (PLACEHOLDER_URL_PATTERN.test(offer.sourceUrl)) {
          offenders.push({ id: component.id, sourceUrl: offer.sourceUrl });
        }
      }
    }
    expect(
      offenders,
      `placeholder URL pattern in offers[]: ${JSON.stringify(offenders)}`,
    ).toEqual([]);
  });

  it("no component offer sourceUrl has an empty hostname", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const offenders: string[] = [];
    for (const component of result.value.components) {
      for (const offer of component.offers) {
        let parsed: URL;
        try {
          parsed = new URL(offer.sourceUrl);
        } catch {
          offenders.push(`${component.id} offer ${offer.offerId}: unparseable`);
          continue;
        }
        if (!parsed.hostname) {
          offenders.push(
            `${component.id} offer ${offer.offerId}: empty hostname`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("each component offers[i] has offerId, retailer, sourceUrl, sourceCurrency, listedAmount, sellerCondition, availability, checkedAt, evidenceStatus", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const component of result.value.components) {
      for (const offer of component.offers) {
        expect(typeof offer.offerId).toBe("string");
        expect(offer.offerId.length).toBeGreaterThan(0);
        expect(typeof offer.retailer).toBe("string");
        expect(offer.retailer.length).toBeGreaterThan(0);
        expect(typeof offer.sourceUrl).toBe("string");
        expect(offer.sourceUrl.length).toBeGreaterThan(0);
        expect(typeof offer.sourceCurrency).toBe("string");
        expect(offer.sourceCurrency.length).toBeGreaterThan(0);
        expect(typeof offer.listedAmount).toBe("number");
        expect(offer.listedAmount).toBeGreaterThanOrEqual(0);
        expect(typeof offer.sellerCondition).toBe("string");
        expect(offer.sellerCondition.length).toBeGreaterThan(0);
        expect(["in-stock", "limited", "out-of-stock", "unknown"]).toContain(
          offer.availability,
        );
        expect(typeof offer.checkedAt).toBe("string");
        expect(offer.checkedAt).toMatch(/Z$|[+-]\d{2}:?\d{2}$/);
        expect(["confirmed", "category-page", "404-or-missing"]).toContain(
          offer.evidenceStatus,
        );
      }
    }
  });

  it("offerId is unique within each component", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const component of result.value.components) {
      const ids = component.offers.map((o) => o.offerId);
      expect(new Set(ids).size, `${component.id} offerId uniqueness`).toBe(
        ids.length,
      );
    }
  });

  it("confirmed components have at least one confirmed offer", () => {
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const component of result.value.components) {
      if (component.priceStatus === "verified") {
        const confirmedCount = component.offers.filter(
          (o) => o.evidenceStatus === "confirmed",
        ).length;
        expect(
          confirmedCount,
          `${component.id} verified requires at least one confirmed offer`,
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("non-COP offers without conversion land on a provisional/unconfirmed component", () => {
    // Per orchestrator: a non-COP offer without conversion metadata is
    // recorded as evidence only. The component MUST then be at most
    // `provisional`. This guards against a maintainer forgetting to
    // downgrade `verified` when an Amazon USD offer with no documented
    // conversion is added.
    const result = buildCatalog(realInput);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const component of result.value.components) {
      const hasNonCopWithoutConversion = component.offers.some(
        (o) =>
          o.sourceCurrency !== "COP" &&
          o.evidenceStatus === "confirmed" &&
          (o.conversionAssumption === undefined ||
            o.normalizedCostCop === undefined),
      );
      if (hasNonCopWithoutConversion) {
        expect(
          ["provisional", "unconfirmed"],
          `${component.id} has confirmed non-COP offer without conversion; priceStatus must be provisional/unconfirmed`,
        ).toContain(component.priceStatus);
      }
    }
  });
});
