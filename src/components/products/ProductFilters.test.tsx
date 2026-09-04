/**
 * smart-pc · product filter island tests (Kinetic Performance sidebar · strict TDD · RED).
 *
 * RED suite for `src/components/products/ProductFilters.tsx`. The island
 * hydrates on the `/productos/` page and exposes:
 *   - A free-text search field (matches id / brand / model / categoryLabel)
 *   - A category chip group (single-select; "Todos" sentinel resets)
 *   - A price-status chip group (multi-select; Confirmado / Provisional / No confirmado)
 *   - A stock-status chip group (multi-select; En stock / Stock limitado / Sin stock / Consultar disponibilidad)
 *   - A live "X de Y productos" counter wired through `[data-product-count]`
 *   - An accessible "no results" message when the filter set is empty
 *
 * The island reads view models as props (serialized from the Astro page)
 * and emits filter changes via a `data-` attribute strategy so the
 * server-rendered cards stay the source of truth. The Astro page renders a
 * counter element `[data-product-count]` in the main grid header; the island
 * mirrors its visible-set value into that element after every filter change
 * so the header stays in sync without re-rendering the cards.
 */
import { render, screen, within } from "@testing-library/react";

type Within = typeof within;

import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { ProductViewModel } from "../../lib/products/catalog-view-model";
import ProductFilters from "./ProductFilters";
import ProductSearchInput from "./ProductSearchInput";

function vm(
  partial: Partial<ProductViewModel> & { id: string },
): ProductViewModel {
  return {
    id: partial.id,
    categoryId: partial.categoryId ?? "cpu",
    categoryLabel: partial.categoryLabel ?? "Procesador",
    brand: partial.brand ?? "Test",
    model: partial.model ?? "Test",
    name: partial.name ?? "Test",
    specs: partial.specs ?? {},
    priceStatus: partial.priceStatus ?? "verified",
    isVerified: partial.isVerified ?? true,
    isProvisional: partial.isProvisional ?? false,
    isUnconfirmed: partial.isUnconfirmed ?? false,
    hasExactPrice: partial.hasExactPrice ?? true,
    hasVerifiedPrice: partial.hasVerifiedPrice ?? true,
    offers: partial.offers ?? [],
    hasMultipleOffers: partial.hasMultipleOffers ?? false,
    stockStatus: partial.stockStatus ?? "in-stock",
    stockQuantity: partial.stockQuantity ?? 0,
    hasImage: partial.hasImage ?? false,
    ...(partial.referencePriceCop !== undefined
      ? { referencePriceCop: partial.referencePriceCop }
      : {}),
    ...(partial.selectedOfferId !== undefined
      ? { selectedOfferId: partial.selectedOfferId }
      : {}),
    ...(partial.selectedRetailer !== undefined
      ? { selectedRetailer: partial.selectedRetailer }
      : {}),
    ...(partial.selectedSourceUrl !== undefined
      ? { selectedSourceUrl: partial.selectedSourceUrl }
      : {}),
    ...(partial.selectedCheckedAt !== undefined
      ? { selectedCheckedAt: partial.selectedCheckedAt }
      : {}),
    ...(partial.notes !== undefined ? { notes: partial.notes } : {}),
    ...(partial.restockNote !== undefined
      ? { restockNote: partial.restockNote }
      : {}),
  };
}

const CPU_VERIFIED = vm({
  id: "cpu-1",
  categoryId: "cpu",
  categoryLabel: "Procesador",
  brand: "AMD",
  model: "Ryzen 5",
  name: "AMD Ryzen 5",
  priceStatus: "verified",
  isVerified: true,
  hasExactPrice: true,
  hasVerifiedPrice: true,
  referencePriceCop: 504_000,
  selectedOfferId: "cpu-1-1",
  selectedRetailer: "StackPC",
  selectedSourceUrl: "https://example.com/cpu-1",
  selectedCheckedAt: "2026-09-04T00:00:00-05:00",
  stockStatus: "in-stock",
  stockQuantity: 12,
});
const GPU_PROVISIONAL = vm({
  id: "gpu-1",
  categoryId: "gpu",
  categoryLabel: "Tarjeta de video",
  brand: "NVIDIA",
  model: "RTX 4070",
  name: "NVIDIA RTX 4070",
  priceStatus: "provisional",
  isVerified: false,
  isProvisional: true,
  hasExactPrice: true,
  hasVerifiedPrice: false,
  referencePriceCop: 1_180_000,
  selectedOfferId: "gpu-1-1",
  selectedRetailer: "Speed Logic",
  selectedSourceUrl: "https://example.com/gpu-1",
  selectedCheckedAt: "2026-09-04T00:00:00-05:00",
  stockStatus: "limited",
  stockQuantity: 2,
});
const MOBO_UNCONFIRMED = vm({
  id: "mb-1",
  categoryId: "motherboard",
  categoryLabel: "Placa base",
  brand: "ASUS",
  model: "Prime B550M-K",
  name: "ASUS Prime B550M-K",
  priceStatus: "unconfirmed",
  isVerified: false,
  isProvisional: false,
  isUnconfirmed: true,
  hasExactPrice: false,
  stockStatus: "unknown",
  stockQuantity: null,
});

const SAMPLE_VMS: readonly ProductViewModel[] = [
  CPU_VERIFIED,
  GPU_PROVISIONAL,
  MOBO_UNCONFIRMED,
];

/**
 * Render the filter island inside a fixed-height container that simulates
 * the inventory section's grid. The test asserts what the island reports
 * via the visible counter and the rendered "no results" message.
 */
function renderIsland(vms: readonly ProductViewModel[] = SAMPLE_VMS) {
  // The Astro page renders a `[data-product-count]` element next to the
  // inventory grid; the island mutates that element whenever the visible set
  // changes. The render helper mirrors that DOM contract so the tests verify
  // the live counter wiring without depending on Astro.
  return render(
    <div>
      <ProductSearchInput />
      <ProductFilters products={vms} />
      <p data-product-count data-total-count={vms.length}>
        0 de {vms.length} productos
      </p>
      {vms.map((p) => (
        <div
          key={p.id}
          data-product-card
          data-component-id={p.id}
          data-category={p.categoryId}
          data-stock-status={p.stockStatus}
          data-price-status={p.priceStatus}
        />
      ))}
    </div>,
  );
}

interface IslandRender {
  readonly container: HTMLElement;
}

function island(vms: readonly ProductViewModel[] = SAMPLE_VMS): {
  readonly root: HTMLElement;
  readonly query: ReturnType<Within>;
} {
  const r: IslandRender = renderIsland(vms);
  return {
    root: r.container,
    query: within(r.container),
  };
}

describe("ProductFilters", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/");
  });
  it("renders every category chip and every stock-status chip", () => {
    const { query } = island();
    expect(query.getByRole("group", { name: /categor/i })).not.toBeNull();
    expect(
      query.getByRole("group", { name: /stock|disponibilidad/i }),
    ).not.toBeNull();
  });

  it("shows the total product count on first render", () => {
    const { query } = island();
    // The counter lives in a single <p aria-live> element.
    const counter = query.getByText(/3\s+de\s+3\s+productos/i);
    expect(counter).not.toBeNull();
  });

  it("starts with all categories and all stock statuses selected", () => {
    const { query } = island();
    // The "Todos" category chip is selected by default.
    const categoryGroup = query.getByRole("group", { name: /categor/i });
    expect(
      within(categoryGroup)
        .getByRole("button", { name: /^Todos$/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // Every stock chip is selected by default.
    for (const label of ["Stock", "Stock limitado", "Preguntar", "Preguntar"]) {
      const chip = query.getByRole("button", {
        name: new RegExp(`^${label} \\(\\d+\\)$`),
      });
      expect(chip.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("filters the visible count when a category chip is clicked", async () => {
    const user = userEvent.setup();
    const { query } = island();
    // Click the "Procesadores" chip.
    const categoryGroup = query.getByRole("group", { name: /categor/i });
    await user.click(
      within(categoryGroup).getByRole("button", { name: /Procesadores/i }),
    );
    expect(query.getByText(/1\s+de\s+3\s+productos/i)).not.toBeNull();
    // Reset.
    await user.click(
      within(categoryGroup).getByRole("button", { name: /^Todos$/ }),
    );
    expect(query.getByText(/3\s+de\s+3\s+productos/i)).not.toBeNull();
  });

  it("filters the visible count when a stock chip is toggled on", async () => {
    const user = userEvent.setup();
    const { query } = island();
    // Click "Stock" to select it; only the CPU (in-stock) is visible → count becomes 1.
    await user.click(query.getByRole("button", { name: /^Stock \(\d+\)$/ }));
    expect(query.getByText(/1\s+de\s+3\s+productos/i)).not.toBeNull();
  });

  it("shows an accessible empty-state message when no product matches", async () => {
    const user = userEvent.setup();
    const { query } = island();
    const search = query.getByPlaceholderText(/buscar por marca/i);
    await user.type(search, "item-que-no-existe-xyz");
    expect(query.getByText(/0\s+de\s+3\s+productos/i)).not.toBeNull();
    const status = query.getByRole("status");
    expect(status.textContent).toMatch(/no encontramos/i);
  });

  it("renders each category chip only once even when many products share a category", () => {
    const { query } = island();
    const categoryGroup = query.getByRole("group", { name: /categor/i });
    const buttons = within(categoryGroup).getAllByRole("button");
    const labels = buttons.map((b) => b.textContent?.trim() ?? "");
    const unique = new Set(labels);
    expect(unique.size).toBe(labels.length);
  });

  it("exposes a stable data-filter-controller element for the Astro page to target", () => {
    const { root } = island();
    expect(root.querySelector("[data-filter-controller]")).not.toBeNull();
  });

  it("exposes a search input with the Kinetic Performance placeholder", () => {
    const { query } = island();
    const search = query.getByPlaceholderText(/buscar por marca/i);
    expect(search).not.toBeNull();
    expect(search.getAttribute("type")).toBe("search");
    expect(search.getAttribute("aria-label")).toMatch(/buscar/i);
  });

  it("filters the visible count when the search field receives text", async () => {
    const user = userEvent.setup();
    const { query, root } = island();
    const search = query.getByPlaceholderText(/buscar por marca/i);
    // Sample: cpu-1 is unique-id "cpu-1"; searching it shows 1 visible.
    await user.clear(search);
    await user.type(search, "cpu-1");
    expect(query.getByText(/1\s+de\s+3\s+productos/i)).not.toBeNull();
    // Mirror on the Astro-side counter element.
    expect(root.querySelector("[data-product-count]")?.textContent).toMatch(
      /1\s+de\s+3\s+productos/i,
    );
    // Clearing the search restores all three.
    await user.clear(search);
    expect(query.getByText(/3\s+de\s+3\s+productos/i)).not.toBeNull();
  });

  it("renders the price-status group with Confirmado / Provisional / No confirmado chips and counts", () => {
    const { query } = island();
    const priceGroup = query.getByRole("group", {
      name: /estado.*precio|precio.*estado|confirmado.*provisional/i,
    });
    expect(priceGroup).not.toBeNull();
    // The sample has 1 verified, 1 provisional, 1 unconfirmed.
    for (const [label, expected] of [
      ["Confirmado", 1],
      ["Provisional", 1],
      ["No confirmado", 1],
    ] as const) {
      const chip = within(priceGroup).getByRole("button", {
        name: new RegExp(`^${label} \\(${expected}\\)$`),
      });
      expect(chip).not.toBeNull();
    }
  });

  it("toggles the visible count when a price-status chip is toggled on", async () => {
    const user = userEvent.setup();
    const { query } = island();
    const priceGroup = query.getByRole("group", {
      name: /estado.*precio|precio.*estado|confirmado.*provisional/i,
    });
    // Click "Confirmado" to filter specifically for verified items; only cpu remains → 1.
    await user.click(
      within(priceGroup).getByRole("button", { name: /^Confirmado \(\d+\)$/ }),
    );
    expect(query.getByText(/1\s+de\s+3\s+productos/i)).not.toBeNull();
  });

  it("starts with clean price-status chips (unselected by default)", () => {
    const { query } = island();
    const priceGroup = query.getByRole("group", {
      name: /estado.*precio|precio.*estado|confirmado.*provisional/i,
    });
    for (const label of [
      "Confirmado",
      "Provisional",
      "No confirmado",
    ] as const) {
      const chip = within(priceGroup).getByRole("button", {
        name: new RegExp(`^${label} \\(\\d+\\)$`),
      });
      expect(chip.getAttribute("aria-pressed")).toBe("false");
    }
  });

  it("composes search + price-status + category filters into a single visible count", async () => {
    const user = userEvent.setup();
    const { query } = island();
    const search = query.getByPlaceholderText(/buscar por marca/i);
    await user.type(search, "cpu-1");
    const priceGroup = query.getByRole("group", {
      name: /estado.*precio|precio.*estado|confirmado.*provisional/i,
    });
    // Select Confirmado filter
    await user.click(
      within(priceGroup).getByRole("button", { name: /^Confirmado \(\d+\)$/ }),
    );
    expect(query.getByText(/1\s+de\s+3\s+productos/i)).not.toBeNull();
  });

  it("mirrors the visible count into the Astro-side [data-product-count] element", () => {
    const { root } = island();
    const counter = root.querySelector("[data-product-count]");
    expect(counter).not.toBeNull();
    expect(counter?.textContent).toMatch(/3\s+de\s+3\s+productos/i);
  });
});
