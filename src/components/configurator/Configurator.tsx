/**
 * smart-pc · Configurator island (Phase 7 → PR 2 migrated to COP).
 *
 * The first React island on the site — a 7-step wizard that lets visitors pick
 * every PC part (CPU, motherboard, RAM, GPU, storage, PSU) and surface real-time
 * compatibility against `validate()` from `src/lib/compatibility.ts`.
 *
 * Architectural notes (post PR 2):
 *
 *   - The page (`src/pages/configurar/index.astro`) hydrates this island with
 *     `client:load` so the wizard is interactive immediately on arrival.
 *   - All prices flow from `Component.price` (integer whole COP per
 *     `src/data/types.ts`) and are formatted with `formatCop()` from
 *     `src/lib/money.ts`. No `/ 100` cent conversion is applied anywhere in
 *     the island.
 *   - The summary step renders a `QuoteBreakdown` driven by `calculateQuote`.
 *     If the visitor-selected service is a `recommended` (not `confirmed`)
 *     record, the summary suppresses the final total and surfaces the
 *     "pendiente de confirmación" notice instead — same rule as the
 *     build-time path (see design.md §7.3).
 *   - `validate(selection)` is the single source of truth for compatibility.
 *     The island never recomputes socket / PSU / RAM rules locally; the
 *     `getPsuBadge()` helper is a presentation-only shortcut that surfaces
 *     the "Potencia justa" hint inline on PSU cards BEFORE the visitor
 *     reaches the summary step. The final word on compatibility lives in
 *     `validate()`.
 *   - The WhatsApp CTA URL is `whatsappUrl + ?text=<encoded summary>` so the
 *     storefront can route the request through the standard `wa.me` endpoint.
 *
 * Styling: every visual cue is a Tailwind v4 utility class — no raw hex outside
 * `src/styles/global.css`. The island keeps no internal stylesheet to stay under
 * the 120 KB gzipped JS budget from `design.md` §7.
 */

import type { JSX } from "react";
import { useMemo, useState } from "react";
import type { Component, PCSelection } from "../../data/types";
import type {
  CatalogService,
  PricingPolicy,
} from "../../lib/catalog/catalog-types";
import { validate } from "../../lib/compatibility";
import { buildConfiguratorCatalog } from "../../lib/configurator/configurator-catalog";
import { formatCop, PRICE_VARIATION_NOTICE } from "../../lib/money";
import { calculateQuote } from "../../lib/quotes/calculate-quote";

interface Props {
  /** Full catalog; the island filters by category at render time. */
  readonly components: readonly Component[];
  /** Pre-built `https://wa.me/{number}` URL the storefront already trusts. */
  readonly whatsappUrl: string;
  /** Service the visitor is selecting. Must be `confirmed` for a final total. */
  readonly service: CatalogService;
  /** Pricing policy whose margin is disclosed in the breakdown. */
  readonly pricingPolicy: PricingPolicy;
}

type Step =
  | "cpu"
  | "motherboard"
  | "ram"
  | "gpu"
  | "storage"
  | "psu"
  | "summary";

const STEPS: readonly Step[] = [
  "cpu",
  "motherboard",
  "ram",
  "gpu",
  "storage",
  "psu",
  "summary",
];

const STEP_LABELS: Record<Step, string> = {
  cpu: "CPU",
  motherboard: "Placa",
  ram: "RAM",
  gpu: "GPU",
  storage: "Almacenamiento",
  psu: "Fuente",
  summary: "Resumen",
};

/** Compact two-spec summary for the option card grid. */
function getSpecSummary(comp: Component): string {
  const entries = Object.entries(comp.specs).slice(0, 2);
  return entries.map(([k, v]) => `${k}: ${v}`).join(" · ");
}

interface Badge {
  readonly label: string;
  readonly color: string;
}

/**
 * PSU badge helper. Surfaces the "Potencia justa" hint when the currently
 * selected GPU's power draw plus a 200 W system overhead would land within 15 %
 * of the PSU's rated capacity. This is a presentation hint only; the final
 * compatibility verdict still comes from `validate()`.
 */
function getPsuBadge(
  psu: Component,
  gpu: Component | undefined,
): Badge | undefined {
  if (!psu.wattage || !gpu) return undefined;
  const required = (gpu.wattageDraw ?? 0) + 200;
  if (required > psu.wattage * 0.85) {
    return { label: "⚠️ Potencia justa", color: "text-amber-400" };
  }
  return undefined;
}

export default function Configurator({
  components,
  whatsappUrl,
  service,
  pricingPolicy,
}: Props): JSX.Element {
  const [step, setStep] = useState<Step>("cpu");
  const [cpu, setCpu] = useState<Component | undefined>(undefined);
  const [motherboard, setMotherboard] = useState<Component | undefined>(
    undefined,
  );
  const [ram, setRam] = useState<readonly Component[]>([]);
  const [gpu, setGpu] = useState<Component | undefined>(undefined);
  const [storage, setStorage] = useState<readonly Component[]>([]);
  const [psu, setPsu] = useState<Component | undefined>(undefined);

  const selection = useMemo<PCSelection>(
    () => ({ cpu, motherboard, ram, gpu, storage, psu }),
    [cpu, motherboard, ram, gpu, storage, psu],
  );

  const compatibility = useMemo(() => validate(selection), [selection]);

  // The configurator's quote uses the visitor's current selection, the
  // configured service and pricing policy. Per spec, only a `confirmed`
  // service produces a final total — recommended/reference services return
  // `service-not-confirmed` and the breakdown is rendered without the final
  // total. Slice 2: when ANY selected component is `priceStatus:
  // "unconfirmed"` (i.e. legacy `price === null`), the quote engine emits
  // `price-unconfirmed` and the breakdown renders without the final total.
  const selectedComponents = useMemo<readonly Component[]>(() => {
    const list: Component[] = [];
    if (cpu) list.push(cpu);
    if (motherboard) list.push(motherboard);
    if (gpu) list.push(gpu);
    if (psu) list.push(psu);
    for (const r of ram) list.push(r);
    for (const s of storage) list.push(s);
    return list;
  }, [cpu, motherboard, gpu, psu, ram, storage]);

  // The component subtotal (without margin) is the sum of selected
  // prices, used for the live card subtotal display and as the basis
  // for the WhatsApp message. Slice 2: a component with `price === null`
  // (unconfirmed) contributes 0 to this displayed subtotal — the
  // breakdown still surfaces the `price-unconfirmed` quote error so
  // the visitor never sees a half-true final total.
  const componentSubtotalCop = useMemo(() => {
    return selectedComponents.reduce((sum, c) => sum + (c.price ?? 0), 0);
  }, [selectedComponents]);

  // The configurator's quote uses the visitor's current selection, the
  // configured service and pricing policy. Per spec, only a `confirmed`
  // service produces a final total — recommended/reference services return
  // `service-not-confirmed` and the breakdown is rendered without the final
  // total. Slice 2: when ANY selected component is `priceStatus:
  // "unconfirmed"` (i.e. legacy `price === null`), the quote engine emits
  // `price-unconfirmed` and the breakdown renders without the final total.
  const componentIds = useMemo(
    () => selectedComponents.map((c) => c.id),
    [selectedComponents],
  );

  const quoteResult = useMemo(
    () =>
      calculateQuote(
        {
          componentIds,
          serviceId: service.id,
          pricingPolicyId: pricingPolicy.id,
        },
        // Slice 2: pass the actual selected components (not a placeholder).
        // The configurator synthesizes the minimum offer record for each
        // selected component so the quote engine's `selectReference` runs
        // against real `offers[]`. Unconfirmed components carry no offers,
        // so the engine emits `price-unconfirmed` rather than fabricating a
        // zero.
        buildConfiguratorCatalog(selectedComponents, service, pricingPolicy),
        new Date(),
      ),
    [componentIds, selectedComponents, service, pricingPolicy],
  );

  const filteredMotherboards = useMemo(
    () =>
      components.filter(
        (c) =>
          c.category === "motherboard" && (!cpu || c.socket === cpu.socket),
      ),
    [components, cpu],
  );

  const filteredRam = useMemo(
    () =>
      components.filter(
        (c) =>
          c.category === "ram" &&
          (!motherboard || c.ramType === motherboard.ramType),
      ),
    [components, motherboard],
  );

  const cpus = useMemo(
    () => components.filter((c) => c.category === "cpu"),
    [components],
  );
  const gpus = useMemo(
    () => components.filter((c) => c.category === "gpu"),
    [components],
  );
  const storages = useMemo(
    () => components.filter((c) => c.category === "storage"),
    [components],
  );
  const psus = useMemo(
    () => components.filter((c) => c.category === "psu"),
    [components],
  );

  function toggleRam(comp: Component): void {
    setRam((prev) =>
      prev.find((r) => r.id === comp.id)
        ? prev.filter((r) => r.id !== comp.id)
        : [...prev, comp],
    );
  }

  function toggleStorage(comp: Component): void {
    setStorage((prev) =>
      prev.find((s) => s.id === comp.id)
        ? prev.filter((s) => s.id !== comp.id)
        : [...prev, comp],
    );
  }

  function nextStep(): void {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      const next = STEPS[idx + 1];
      if (next) setStep(next);
    }
  }

  function prevStep(): void {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      const prev = STEPS[idx - 1];
      if (prev) setStep(prev);
    }
  }

  const whatsappMessage = useMemo(() => {
    const lines: string[] = ["¡Hola! Quiero cotizar esta PC:"];
    if (cpu) lines.push(`CPU: ${cpu.brand} ${cpu.model}`);
    if (motherboard)
      lines.push(`Placa: ${motherboard.brand} ${motherboard.model}`);
    if (gpu) lines.push(`GPU: ${gpu.brand} ${gpu.model}`);
    if (ram.length > 0)
      lines.push(`RAM: ${ram.map((r) => `${r.brand} ${r.model}`).join(", ")}`);
    if (storage.length > 0)
      lines.push(
        `Almacenamiento: ${storage.map((s) => `${s.brand} ${s.model}`).join(", ")}`,
      );
    if (psu) lines.push(`Fuente: ${psu.brand} ${psu.model}`);
    lines.push(`Subtotal componentes: ${formatCop(componentSubtotalCop)} COP`);
    return encodeURIComponent(lines.join("\n"));
  }, [cpu, motherboard, ram, gpu, storage, psu, componentSubtotalCop]);

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Step indicator */}
      <div className="border-b border-border bg-navy-900 py-6">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center">
                <button
                  type="button"
                  onClick={() => setStep(s)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold transition-colors ${
                    i < stepIndex
                      ? "bg-cyan-500 text-navy-950"
                      : i === stepIndex
                        ? "border-2 border-cyan-500 text-cyan-500"
                        : "border border-border text-text-muted"
                  }`}
                  aria-current={i === stepIndex ? "step" : undefined}
                >
                  {i < stepIndex ? "✓" : i + 1}
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 w-4 md:mx-2 md:w-8 ${
                      i < stepIndex ? "bg-cyan-500" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-center font-mono text-xs uppercase tracking-widest text-cyan-500 md:text-sm">
            {/* paso */}
            {stepIndex + 1}/{STEPS.length}: {STEP_LABELS[step]}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={stepIndex === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-cyan-500 hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← Anterior
          </button>
          {step !== "summary" && (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-lg bg-cyan-500 px-6 py-2 text-sm font-bold text-navy-950 transition-colors hover:bg-cyan-400"
            >
              Siguiente →
            </button>
          )}
        </div>

        {/* Component grid */}
        {step !== "summary" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {step === "cpu" &&
              cpus.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  comp={comp}
                  selected={cpu?.id === comp.id}
                  onSelect={() =>
                    setCpu(cpu?.id === comp.id ? undefined : comp)
                  }
                />
              ))}
            {step === "motherboard" &&
              filteredMotherboards.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  comp={comp}
                  selected={motherboard?.id === comp.id}
                  onSelect={() =>
                    setMotherboard(
                      motherboard?.id === comp.id ? undefined : comp,
                    )
                  }
                />
              ))}
            {step === "ram" &&
              filteredRam.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  comp={comp}
                  selected={ram.some((r) => r.id === comp.id)}
                  onSelect={() => toggleRam(comp)}
                />
              ))}
            {step === "gpu" &&
              gpus.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  comp={comp}
                  selected={gpu?.id === comp.id}
                  onSelect={() =>
                    setGpu(gpu?.id === comp.id ? undefined : comp)
                  }
                />
              ))}
            {step === "storage" &&
              storages.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  comp={comp}
                  selected={storage.some((s) => s.id === comp.id)}
                  onSelect={() => toggleStorage(comp)}
                />
              ))}
            {step === "psu" &&
              psus.map((comp) => (
                <ComponentCard
                  key={comp.id}
                  comp={comp}
                  selected={psu?.id === comp.id}
                  onSelect={() =>
                    setPsu(psu?.id === comp.id ? undefined : comp)
                  }
                  badge={getPsuBadge(comp, gpu)}
                />
              ))}
          </div>
        )}

        {/* Summary */}
        {step === "summary" && (
          <div className="space-y-6">
            {/* Compatibility */}
            <div
              className={`rounded-2xl border p-6 ${
                compatibility.level === "incompatible"
                  ? "border-red-500/50 bg-red-500/10"
                  : compatibility.level === "warning"
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-green-500/50 bg-green-500/10"
              }`}
            >
              <div
                className={`text-lg font-bold ${
                  compatibility.level === "incompatible"
                    ? "text-red-400"
                    : compatibility.level === "warning"
                      ? "text-amber-400"
                      : "text-green-400"
                }`}
              >
                {compatibility.level === "incompatible"
                  ? "❌ Hay problemas de compatibilidad"
                  : compatibility.level === "warning"
                    ? "⚠️ Tené en cuenta estas advertencias"
                    : "✅ Tu PC es compatible"}
              </div>
              {compatibility.messages.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {compatibility.messages.map((msg) => (
                    <li key={msg} className="text-sm text-text-secondary">
                      {msg}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Parts list */}
            <div className="space-y-3">
              {[
                cpu && { label: "CPU", comp: cpu },
                motherboard && { label: "Placa", comp: motherboard },
                ...ram.map((r) => ({ label: "RAM", comp: r })),
                ...storage.map((s) => ({ label: "Almacenamiento", comp: s })),
                gpu && { label: "GPU", comp: gpu },
                psu && { label: "Fuente", comp: psu },
              ]
                .filter((entry): entry is { label: string; comp: Component } =>
                  Boolean(entry),
                )
                .map(({ label, comp }) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between rounded-xl bg-navy-900 px-5 py-3"
                  >
                    <div>
                      <div className="font-mono text-xs text-text-muted">
                        {label}
                      </div>
                      <div className="font-medium text-text-primary">
                        {comp.brand} {comp.model}
                      </div>
                    </div>
                    <div className="font-semibold text-cyan-500">
                      {comp.price === null
                        ? "Precio no confirmado"
                        : formatCop(comp.price)}
                    </div>
                  </div>
                ))}
            </div>

            {/* Quote breakdown */}
            {quoteResult.ok ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-navy-900">
                <div className="border-b border-border px-5 py-3">
                  <h3 className="text-base font-semibold text-text-primary">
                    Desglose (COP)
                  </h3>
                </div>
                <table className="w-full text-left text-sm">
                  <tbody>
                    {quoteResult.quote.lines
                      .filter((line) => line.kind !== "total")
                      .map((line) => (
                        <tr
                          key={line.kind}
                          className="border-b border-border last:border-b-0"
                        >
                          <td className="px-5 py-2 text-text-secondary">
                            {line.label}
                            {line.kind === "percentage-margin" &&
                              line.rate !== undefined && (
                                <span className="ml-2 text-xs text-text-muted">
                                  ({line.rate}%)
                                </span>
                              )}
                          </td>
                          <td className="px-5 py-2 text-right font-mono text-cyan-500">
                            {formatCop(line.amountCop)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-border bg-navy-800 px-5 py-4">
                  <span className="text-base font-semibold text-text-primary">
                    Total (COP)
                  </span>
                  <span className="font-mono text-2xl font-bold text-cyan-500">
                    {formatCop(quoteResult.quote.finalTotalCop)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5">
                <div className="font-semibold text-amber-400">
                  Total pendiente de confirmación
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  El servicio seleccionado requiere confirmación del propietario
                  antes de generar un total final. Te contactaremos por WhatsApp
                  para confirmar el valor del armado.
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  Subtotal componentes: {formatCop(componentSubtotalCop)} COP
                </p>
              </div>
            )}

            <p className="text-xs text-text-muted">{PRICE_VARIATION_NOTICE}</p>

            {/* WhatsApp CTA */}
            {cpu && (
              <a
                href={`${whatsappUrl}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-8 py-4 text-lg font-bold text-white transition-colors hover:bg-[#1fb855]"
              >
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Solicitar cotización por WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface ComponentCardProps {
  readonly comp: Component;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly badge?: Badge;
}

function ComponentCard({
  comp,
  selected,
  onSelect,
  badge,
}: ComponentCardProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative rounded-2xl border p-5 text-left transition-all hover:-translate-y-0.5 ${
        selected
          ? "border-cyan-500 bg-navy-800 shadow-lg shadow-cyan-500/20"
          : "border-border bg-navy-900 hover:border-cyan-500/40"
      }`}
    >
      {selected && !badge && (
        <div className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500">
          <svg
            className="h-4 w-4 text-navy-950"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
      {badge && (
        <div
          className={`absolute right-3 top-3 font-mono text-xs ${badge.color}`}
        >
          {badge.label}
        </div>
      )}
      <div className="font-mono text-xs text-text-muted">{comp.brand}</div>
      <div className="mt-1 font-semibold text-text-primary">{comp.model}</div>
      <div className="mt-2 text-xs text-text-muted">{getSpecSummary(comp)}</div>
      <div className="mt-3 font-bold text-cyan-500">
        {comp.price === null ? "Precio no confirmado" : formatCop(comp.price)}
      </div>
    </button>
  );
}

// buildConfiguratorCatalog is implemented in
// src/lib/configurator/configurator-catalog.ts so it is unit-testable
// without React. This island is the only consumer.
