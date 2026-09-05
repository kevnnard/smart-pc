import { type JSX, useEffect, useMemo, useRef, useState } from "react";
import type { Component, PCSelection } from "../../data/types";
import type {
  CatalogService,
  PricingPolicy,
} from "../../lib/catalog/catalog-types";
import { validate } from "../../lib/compatibility";
import { buildConfiguratorCatalog } from "../../lib/configurator/configurator-catalog";
import { formatCop, PRICE_VARIATION_NOTICE } from "../../lib/money";
import { calculateQuote } from "../../lib/quotes/calculate-quote";
import ChassisViewer from "./ChassisViewer";

interface Props {
  readonly components: readonly Component[];
  readonly whatsappUrl: string;
  readonly service: CatalogService;
  readonly pricingPolicy: PricingPolicy;
}

type Step =
  | "motherboard"
  | "cpu"
  | "cooler"
  | "ram"
  | "gpu"
  | "storage"
  | "psu"
  | "case"
  | "summary";

const STEPS: readonly Step[] = [
  "motherboard",
  "cpu",
  "cooler",
  "ram",
  "gpu",
  "storage",
  "psu",
  "case",
  "summary",
];

const STEP_LABELS: Record<Step, { num: string; label: string }> = {
  motherboard: { num: "01", label: "Placa Base" },
  cpu: { num: "02", label: "Procesador (CPU)" },
  cooler: { num: "03", label: "Refrigeración" },
  ram: { num: "04", label: "Memoria RAM" },
  gpu: { num: "05", label: "Tarjeta Gráfica" },
  storage: { num: "06", label: "Almacenamiento" },
  psu: { num: "07", label: "Fuente de Poder" },
  case: { num: "08", label: "Chasis" },
  summary: { num: "09", label: "Resumen" },
};

const BRAND_COLORS: Record<string, string> = {
  AMD: "bg-rose-500/15 text-rose-300 ring-rose-400/40",
  NVIDIA: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/40",
  Intel: "bg-sky-500/15 text-sky-300 ring-sky-400/40",
  ASUS: "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-400/40",
  MSI: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/40",
  Gigabyte: "bg-violet-500/15 text-violet-300 ring-violet-400/40",
  Corsair: "bg-amber-500/15 text-amber-300 ring-amber-400/40",
  Kingston: "bg-red-500/15 text-red-300 ring-red-400/40",
  "Lian Li": "bg-stone-500/15 text-stone-300 ring-stone-400/40",
  Arctic: "bg-cyan-500/15 text-cyan-300 ring-cyan-400/40",
  "Cooler Master": "bg-purple-500/15 text-purple-300 ring-purple-400/40",
  WD: "bg-blue-500/15 text-blue-300 ring-blue-400/40",
  "Western Digital": "bg-blue-500/15 text-blue-300 ring-blue-400/40",
  Crucial: "bg-teal-500/15 text-teal-300 ring-teal-400/40",
  Patriot: "bg-orange-500/15 text-orange-300 ring-orange-400/40",
  Samsung: "bg-blue-600/15 text-blue-300 ring-blue-500/40",
};

function getBrandBadgeClass(brand: string): string {
  return (
    BRAND_COLORS[brand] || "bg-slate-500/15 text-slate-300 ring-slate-400/40"
  );
}

export default function Configurator({
  components,
  whatsappUrl,
  service,
  pricingPolicy,
}: Props): JSX.Element {
  const [step, setStep] = useState<Step>("motherboard");
  const [cpu, setCpu] = useState<Component | undefined>(undefined);
  const [motherboard, setMotherboard] = useState<Component | undefined>(
    undefined,
  );
  const [ram, setRam] = useState<readonly Component[]>([]);
  const [gpu, setGpu] = useState<Component | undefined>(undefined);
  const [storage, setStorage] = useState<readonly Component[]>([]);
  const [psu, setPsu] = useState<Component | undefined>(undefined);
  const [cooler, setCooler] = useState<Component | undefined>(undefined);
  const [chassis, setChassis] = useState<Component | undefined>(undefined);

  // Quick brand filter per category step
  const [activeBrandFilter, setActiveBrandFilter] = useState<string>("all");

  // LocalStorage saved configuration feedback
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [hasSavedConfig, setHasSavedConfig] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("smart_pc_config"));
  });

  function handleSaveConfig(): void {
    if (typeof window === "undefined") return;
    const payload = {
      cpuId: cpu?.id,
      motherboardId: motherboard?.id,
      ramIds: ram.map((r) => r.id),
      gpuId: gpu?.id,
      storageIds: storage.map((s) => s.id),
      psuId: psu?.id,
      coolerId: cooler?.id,
      chassisId: chassis?.id,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem("smart_pc_config", JSON.stringify(payload));
    setHasSavedConfig(true);
    setSaveFeedback("¡Guardado!");
    setTimeout(() => setSaveFeedback(null), 2500);
  }

  function handleLoadConfig(): void {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("smart_pc_config");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const byId = new Map(components.map((c) => [c.id, c]));

      if (data.cpuId) setCpu(byId.get(data.cpuId));
      if (data.motherboardId) setMotherboard(byId.get(data.motherboardId));
      if (Array.isArray(data.ramIds)) {
        setRam(
          data.ramIds
            .map((id: string) => byId.get(id))
            .filter(Boolean) as Component[],
        );
      }
      if (data.gpuId) setGpu(byId.get(data.gpuId));
      if (Array.isArray(data.storageIds)) {
        setStorage(
          data.storageIds
            .map((id: string) => byId.get(id))
            .filter(Boolean) as Component[],
        );
      }
      if (data.psuId) setPsu(byId.get(data.psuId));
      if (data.coolerId) setCooler(byId.get(data.coolerId));
      if (data.chassisId) setChassis(byId.get(data.chassisId));

      setSaveFeedback("¡Recuperado!");
      setTimeout(() => setSaveFeedback(null), 2500);
    } catch {
      // ignore JSON parse error
    }
  }

  const selection = useMemo<PCSelection>(
    () => ({
      cpu,
      motherboard,
      ram,
      gpu,
      storage,
      psu,
      cooler,
      case: chassis,
    }),
    [cpu, motherboard, ram, gpu, storage, psu, cooler, chassis],
  );

  const compatibility = useMemo(() => validate(selection), [selection]);

  const selectedComponents = useMemo<readonly Component[]>(() => {
    const list: Component[] = [];
    if (cpu) list.push(cpu);
    if (motherboard) list.push(motherboard);
    if (gpu) list.push(gpu);
    if (psu) list.push(psu);
    if (cooler) list.push(cooler);
    if (chassis) list.push(chassis);
    for (const r of ram) list.push(r);
    for (const s of storage) list.push(s);
    return list;
  }, [cpu, motherboard, gpu, psu, cooler, chassis, ram, storage]);

  // Live total sum of component observed prices
  const componentSubtotalCop = useMemo(() => {
    return selectedComponents.reduce((sum, c) => sum + (c.price ?? 0), 0);
  }, [selectedComponents]);

  // Estimated power draw calculation (Watts)
  const estimatedPower = useMemo(() => {
    let draw = 50; // Base board + fan overhead
    if (cpu?.tdp) draw += cpu.tdp;
    else if (cpu) draw += 105; // Fallback estimate
    if (gpu?.wattageDraw) draw += gpu.wattageDraw;
    else if (gpu) draw += 200; // Fallback GPU draw
    draw += ram.length * 5;
    draw += storage.length * 10;
    const psuCapacity = psu?.wattage ?? 0;
    // PCs distribute their main load through the PSU's standard 12 V DC rail.
    const estimated12VCurrentA = draw / 12;
    return { draw, psuCapacity, estimated12VCurrentA };
  }, [cpu, gpu, ram, storage, psu]);

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
        buildConfiguratorCatalog(selectedComponents, service, pricingPolicy),
        new Date(),
      ),
    [componentIds, selectedComponents, service, pricingPolicy],
  );

  // Dynamic progressive filtering per hardware rules:
  const motherboards = useMemo(
    () => components.filter((c) => c.category === "motherboard"),
    [components],
  );

  const filteredCpus = useMemo(
    () =>
      components.filter(
        (c) =>
          c.category === "cpu" &&
          (!motherboard ||
            !motherboard.socket ||
            c.socket === motherboard.socket),
      ),
    [components, motherboard],
  );

  const filteredRam = useMemo(
    () =>
      components.filter(
        (c) =>
          c.category === "ram" &&
          (!motherboard ||
            !motherboard.ramType ||
            c.ramType === motherboard.ramType),
      ),
    [components, motherboard],
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

  const coolers = useMemo(
    () => components.filter((c) => c.category === "cooler"),
    [components],
  );

  const cases = useMemo(
    () => components.filter((c) => c.category === "case"),
    [components],
  );

  // Get current pool based on step
  const currentPool = useMemo(() => {
    let pool: Component[] = [];
    if (step === "cpu") pool = filteredCpus;
    else if (step === "motherboard") pool = motherboards;
    else if (step === "ram") pool = filteredRam;
    else if (step === "gpu") pool = gpus;
    else if (step === "storage") pool = storages;
    else if (step === "psu") pool = psus;
    else if (step === "cooler") pool = coolers;
    else if (step === "case") pool = cases;

    if (activeBrandFilter !== "all") {
      return pool.filter(
        (c) => c.brand.toLowerCase() === activeBrandFilter.toLowerCase(),
      );
    }
    return pool;
  }, [
    step,
    filteredCpus,
    motherboards,
    filteredRam,
    gpus,
    storages,
    psus,
    coolers,
    cases,
    activeBrandFilter,
  ]);

  // Unique brands in the current step pool
  const stepBrands = useMemo(() => {
    let raw: Component[] = [];
    if (step === "cpu") raw = filteredCpus;
    else if (step === "motherboard") raw = motherboards;
    else if (step === "ram") raw = filteredRam;
    else if (step === "gpu") raw = gpus;
    else if (step === "storage") raw = storages;
    else if (step === "psu") raw = psus;
    else if (step === "cooler") raw = coolers;
    else if (step === "case") raw = cases;

    const bSet = new Set<string>();
    for (const c of raw) {
      if (c.brand) bSet.add(c.brand);
    }
    return Array.from(bSet).sort();
  }, [
    step,
    filteredCpus,
    motherboards,
    filteredRam,
    gpus,
    storages,
    psus,
    coolers,
    cases,
  ]);

  function resetAll(): void {
    setCpu(undefined);
    setMotherboard(undefined);
    setRam([]);
    setGpu(undefined);
    setStorage([]);
    setPsu(undefined);
    setCooler(undefined);
    setChassis(undefined);
    setStep("motherboard");
    setActiveBrandFilter("all");
  }

  function toggleRam(comp: Component): void {
    setRam((prev) =>
      prev.some((r) => r.id === comp.id)
        ? prev.filter((r) => r.id !== comp.id)
        : [...prev, comp],
    );
  }

  function toggleStorage(comp: Component): void {
    setStorage((prev) =>
      prev.some((s) => s.id === comp.id)
        ? prev.filter((s) => s.id !== comp.id)
        : [...prev, comp],
    );
  }

  function nextStep(): void {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1]);
      setActiveBrandFilter("all");
    }
  }

  function prevStep(): void {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
      setActiveBrandFilter("all");
    }
  }

  const stepIndex = STEPS.indexOf(step);
  const stepRailRef = useRef<HTMLDivElement>(null);
  const stepButtonRefs = useRef<Map<Step, HTMLButtonElement>>(new Map());
  const brandRailRef = useRef<HTMLDivElement>(null);

  // Scroll the rail itself so the active badge leads the sequence. This scales
  // to future steps without a fixed-width track or badge overlap.
  useEffect(() => {
    const rail = stepRailRef.current;
    const activeBadge = stepButtonRefs.current.get(step);
    if (!rail || !activeBadge) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    // Measure relative to the scrolling rail, not the page. This pins every
    // active badge in the same leading position while prior badges slide left.
    const activeLeft =
      activeBadge.getBoundingClientRect().left -
      rail.getBoundingClientRect().left +
      rail.scrollLeft;

    rail.scrollTo({
      left: Math.max(0, activeLeft - 24),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [step]);

  function scrollBrandRail(direction: "back" | "forward"): void {
    brandRailRef.current?.scrollBy({
      left: direction === "forward" ? 240 : -240,
      behavior: "smooth",
    });
  }

  const whatsappMessage = useMemo(() => {
    const lines: string[] = [
      "¡Hola! Armé esta PC personalizada en el configurador de smart-pc:",
    ];
    if (cpu) lines.push(`• Procesador: ${cpu.brand} ${cpu.model}`);
    if (motherboard)
      lines.push(`• Placa Madre: ${motherboard.brand} ${motherboard.model}`);
    if (ram.length > 0)
      lines.push(
        `• RAM: ${ram.map((r) => `${r.brand} ${r.model}`).join(" + ")}`,
      );
    if (gpu) lines.push(`• Tarjeta Gráfica: ${gpu.brand} ${gpu.model}`);
    if (storage.length > 0)
      lines.push(
        `• Almacenamiento: ${storage.map((s) => `${s.brand} ${s.model}`).join(" + ")}`,
      );
    if (psu) lines.push(`• Fuente de Poder: ${psu.brand} ${psu.model}`);
    if (cooler) lines.push(`• Refrigeración: ${cooler.brand} ${cooler.model}`);
    if (chassis) lines.push(`• Chasis: ${chassis.brand} ${chassis.model}`);
    lines.push(
      `\nSubtotal componentes: ${formatCop(componentSubtotalCop)} COP`,
    );
    if (quoteResult.ok) {
      lines.push(
        `Total con ensamble y garantía: ${formatCop(quoteResult.quote.finalTotalCop)} COP`,
      );
    }
    return encodeURIComponent(lines.join("\n"));
  }, [
    cpu,
    motherboard,
    ram,
    gpu,
    storage,
    psu,
    cooler,
    chassis,
    componentSubtotalCop,
    quoteResult,
  ]);

  return (
    <div className="flex flex-col h-screen w-full bg-navy-950 overflow-hidden pt-16">
      {/* 1. STICKY TOP HUD BAR */}
      <header className="shrink-0 border-b border-border/80 bg-navy-900/90 backdrop-blur-md px-4 py-3 md:px-8 z-20">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Stepper horizontal pills */}
          <div
            ref={stepRailRef}
            className="step-rail flex items-center overflow-x-auto scrollbar-none gap-1.5 py-1 min-w-0"
            role="tablist"
            aria-label="Pasos del configurador"
          >
            {STEPS.map((s, idx) => {
              const info = STEP_LABELS[s];
              const isPast = idx < stepIndex;
              const isCurrent = idx === stepIndex;

              return (
                <button
                  key={s}
                  type="button"
                  ref={(element) => {
                    if (element) stepButtonRefs.current.set(s, element);
                    else stepButtonRefs.current.delete(s);
                  }}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => {
                    setStep(s);
                    setActiveBrandFilter("all");
                  }}
                  className={`step-badge inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-mono transition-all duration-300 ${
                    isCurrent
                      ? "bg-cyan-500 text-navy-950 font-bold shadow-md shadow-cyan-500/20"
                      : isPast
                        ? "bg-navy-800 text-cyan-400 border border-cyan-500/30 hover:bg-navy-700"
                        : "bg-navy-950/60 text-text-muted border border-border/40 hover:text-text-secondary"
                  }`}
                >
                  <span className="opacity-60">{info.num}</span>
                  <span>{info.label}</span>
                  {isPast && <span className="text-[10px]">✓</span>}
                </button>
              );
            })}
            {/* Keeps the final badge able to occupy the same pinned focus point. */}
            <span aria-hidden="true" className="w-[50vw] shrink-0" />
          </div>

          {/* Right Metrics & Global Budget */}
          <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
            {/* Wattage Gauge */}
            <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-navy-950/80 px-2.5 py-1 font-mono text-xs">
              <span className="text-cyan-400">⚡</span>
              <span className="text-text-secondary text-[11px]">
                {estimatedPower.draw}W
                {estimatedPower.psuCapacity > 0 && (
                  <span className="text-text-muted">
                    {" "}
                    / {estimatedPower.psuCapacity}W
                  </span>
                )}
              </span>
            </div>

            {/* 12 V rail estimate: useful for checking the main DC load. */}
            <div
              title="Estimación del consumo sobre el riel principal de 12 V de la fuente"
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-navy-950/80 px-2.5 py-1 font-mono text-xs"
            >
              <span className="text-amber-300">⎓</span>
              <span className="text-text-secondary text-[11px]">
                12V · {estimatedPower.estimated12VCurrentA.toFixed(1)}A
              </span>
            </div>

            {/* Compatibility pill */}
            <div
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-mono text-xs ${
                compatibility.level === "incompatible"
                  ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                  : compatibility.level === "warning"
                    ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              <span>
                {compatibility.level === "incompatible"
                  ? "❌ Incompatible"
                  : compatibility.level === "warning"
                    ? "⚠️ Alerta"
                    : "✓ Compatible"}
              </span>
            </div>

            {/* Live Subtotal */}
            <div className="text-right">
              <p className="font-mono text-base font-bold text-cyan-300 md:text-lg">
                {formatCop(componentSubtotalCop)}
              </p>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="text-xs font-medium text-text-muted hover:text-rose-400 underline underline-offset-2 transition-colors"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </header>

      {/* 2. SPLIT WORKSPACE: Selection Pane (Left) + 3D Canvas (Right) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* LEFT SELECTION PANE (60% Desktop, scrollable) */}
        <div className="flex flex-col w-full lg:w-7/12 border-r border-border/80 bg-navy-950 overflow-hidden">
          {/* Action Bar: Title, Brands filter & Step Navigation */}
          <div className="p-4 border-b border-border/60 bg-navy-900/50 flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 font-bold">
                  PASO {STEP_LABELS[step].num} DE 09
                </span>
                <h1 className="text-lg font-bold text-text-primary md:text-xl">
                  {step === "cpu" && "Seleccioná tu Procesador (CPU)"}
                  {step === "motherboard" && "Seleccioná tu Placa Madre"}
                  {step === "ram" && "Seleccioná tu Memoria RAM"}
                  {step === "gpu" && "Seleccioná tu Tarjeta de Video (GPU)"}
                  {step === "storage" &&
                    "Seleccioná tu Almacenamiento (SSD/HDD)"}
                  {step === "psu" && "Seleccioná tu Fuente de Poder"}
                  {step === "cooler" && "Seleccioná la Refrigeración"}
                  {step === "case" && "Seleccioná tu Chasis / Gabinete"}
                  {step === "summary" && "Revisión Final y Cotización"}
                </h1>
              </div>

              {/* Prev / Next Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={stepIndex === 0}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-secondary hover:border-cyan-500 hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>
                {step !== "summary" && (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-navy-950 hover:bg-cyan-400 transition-colors shadow-sm shadow-cyan-500/20"
                  >
                    Siguiente →
                  </button>
                )}
              </div>
            </div>

            {/* Quick Brand Filter Chips */}
            {step !== "summary" && stepBrands.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1">
                {stepBrands.length > 4 && (
                  <button
                    type="button"
                    onClick={() => scrollBrandRail("back")}
                    aria-label="Ver marcas anteriores"
                    className="shrink-0 rounded-md border border-border/60 bg-navy-900 px-2 py-1 text-xs text-text-muted transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                  >
                    ←
                  </button>
                )}
                <div
                  ref={brandRailRef}
                  className="flex min-w-0 items-center gap-1.5 overflow-x-auto py-0.5 scrollbar-none"
                >
                  <button
                    type="button"
                    onClick={() => setActiveBrandFilter("all")}
                    className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                      activeBrandFilter === "all"
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
                        : "bg-navy-900 border border-border/60 text-text-muted hover:text-text-primary"
                    }`}
                  >
                    Todas las marcas
                  </button>
                  {stepBrands.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setActiveBrandFilter(b)}
                      className={`shrink-0 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                        activeBrandFilter.toLowerCase() === b.toLowerCase()
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold"
                          : "bg-navy-900 border border-border/60 text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                {stepBrands.length > 4 && (
                  <button
                    type="button"
                    onClick={() => scrollBrandRail("forward")}
                    aria-label="Ver más marcas"
                    className="shrink-0 rounded-md border border-border/60 bg-navy-900 px-2 py-1 text-xs text-text-muted transition-colors hover:border-cyan-500/50 hover:text-cyan-300"
                  >
                    →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Cards Grid or Summary Step */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3">
            {/* Wrapper re-mounts on step change to retrigger the
                `.config-step-content` enter animation. Keeping the outer
                scroll container stable preserves the user's scroll position. */}
            <div key={step} className="config-step-content">
              {step !== "summary" ? (
                currentPool.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-border/50 bg-navy-900/40">
                    <p className="text-sm text-text-muted">
                      No se encontraron componentes compatibles con los filtros
                      activos.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentPool.map((comp) => {
                      let isSelected = false;
                      if (step === "cpu") isSelected = cpu?.id === comp.id;
                      else if (step === "motherboard")
                        isSelected = motherboard?.id === comp.id;
                      else if (step === "ram")
                        isSelected = ram.some((r) => r.id === comp.id);
                      else if (step === "gpu") isSelected = gpu?.id === comp.id;
                      else if (step === "storage")
                        isSelected = storage.some((s) => s.id === comp.id);
                      else if (step === "psu") isSelected = psu?.id === comp.id;
                      else if (step === "cooler")
                        isSelected = cooler?.id === comp.id;
                      else if (step === "case")
                        isSelected = chassis?.id === comp.id;

                      const hasImage = Boolean(comp.imageUrl);

                      return (
                        <article
                          key={comp.id}
                          className={`group relative rounded-xl border p-3.5 flex flex-col justify-between transition-all ${
                            isSelected
                              ? "border-cyan-400 bg-navy-900/95 shadow-lg shadow-cyan-500/15"
                              : "border-border/70 bg-navy-900/50 hover:border-cyan-500/40 hover:bg-navy-900"
                          }`}
                        >
                          <div>
                            {/* Top row: Thumbnail left, Brand badge + Model right */}
                            <div className="flex items-start gap-3">
                              {/* Component Thumbnail (square, clean white background) */}
                              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-white p-1 flex items-center justify-center">
                                {hasImage ? (
                                  <img
                                    src={comp.imageUrl}
                                    alt={comp.model}
                                    className="max-h-full max-w-full object-contain"
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                      const fallback =
                                        e.currentTarget.parentElement?.querySelector(
                                          ".monogram-fallback",
                                        );
                                      if (fallback)
                                        (
                                          fallback as HTMLElement
                                        ).style.display = "flex";
                                    }}
                                  />
                                ) : null}
                                <div
                                  className={`monogram-fallback h-full w-full items-center justify-center font-mono text-xs font-bold text-navy-950 ${
                                    hasImage ? "hidden" : "flex"
                                  }`}
                                  style={{ backgroundColor: "#f1f5f9" }}
                                >
                                  {comp.brand
                                    ? comp.brand.slice(0, 2).toUpperCase()
                                    : "PC"}
                                </div>
                              </div>

                              {/* Header details */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5 mb-1">
                                  <span
                                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ring-1 ${getBrandBadgeClass(
                                      comp.brand,
                                    )}`}
                                  >
                                    {comp.brand}
                                  </span>
                                  {comp.stockStatus === "in-stock" && (
                                    <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-400 shrink-0">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                      Stock
                                    </span>
                                  )}
                                </div>

                                <h3
                                  className="font-bold text-xs text-text-primary group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug"
                                  title={comp.model}
                                >
                                  {comp.model}
                                </h3>
                              </div>
                            </div>

                            {/* Technical Specs Key-Values */}
                            <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] font-mono border-t border-border/40 pt-2 text-text-muted">
                              {Object.entries(comp.specs)
                                .slice(0, 4)
                                .map(([k, v]) => (
                                  <div key={k} className="truncate">
                                    <span className="text-text-secondary">
                                      {k}:
                                    </span>{" "}
                                    {v}
                                  </div>
                                ))}
                            </dl>
                          </div>
                          {/* Bottom Row: Price + Select Button */}
                          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-cyan-400">
                              {comp.price === null
                                ? "Por cotizar"
                                : formatCop(comp.price)}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                if (step === "cpu")
                                  setCpu(isSelected ? undefined : comp);
                                else if (step === "motherboard")
                                  setMotherboard(isSelected ? undefined : comp);
                                else if (step === "ram") toggleRam(comp);
                                else if (step === "gpu")
                                  setGpu(isSelected ? undefined : comp);
                                else if (step === "storage")
                                  toggleStorage(comp);
                                else if (step === "psu")
                                  setPsu(isSelected ? undefined : comp);
                                else if (step === "cooler")
                                  setCooler(isSelected ? undefined : comp);
                                else if (step === "case")
                                  setChassis(isSelected ? undefined : comp);
                              }}
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                isSelected
                                  ? "bg-cyan-500 text-navy-950 shadow-md shadow-cyan-500/20"
                                  : "border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
                              }`}
                            >
                              {isSelected ? "✓ Elegido" : "Seleccionar"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : (
                /* SUMMARY STEP */
                <div className="space-y-6">
                  <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs leading-relaxed text-text-secondary">
                    <p className="font-semibold text-text-primary text-sm mb-1">
                      Tu configuración está lista para revisión de taller
                    </p>
                    <p>
                      Revisamos la compatibilidad y calculamos el ensamble
                      profesional, pruebas térmicas de 12 horas y garantía
                      escrita de 24 meses.
                    </p>
                  </div>

                  {/* Selected parts table */}
                  <div className="rounded-xl border border-border bg-navy-900/70 overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-navy-800 text-text-muted font-mono uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Componente</th>
                          <th className="px-4 py-2.5">Modelo</th>
                          <th className="px-4 py-2.5 text-right">Precio</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {selectedComponents.map((c) => (
                          <tr key={c.id} className="hover:bg-navy-800/40">
                            <td className="px-4 py-2 font-mono text-cyan-400 uppercase text-[10px]">
                              {c.category}
                            </td>
                            <td className="px-4 py-2 font-medium text-text-primary truncate max-w-xs">
                              {c.brand} {c.model}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-text-secondary">
                              {c.price === null
                                ? "Por cotizar"
                                : formatCop(c.price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Quote breakdown */}
                  {quoteResult.ok ? (
                    <div className="rounded-xl border border-border bg-navy-900 p-4 space-y-2">
                      <h3 className="font-bold text-sm text-text-primary mb-3">
                        Desglose de Cotización
                      </h3>
                      <div className="flex justify-between text-xs text-text-secondary">
                        <span>Subtotal de componentes seleccionados</span>
                        <span className="font-mono text-text-primary font-bold">
                          {formatCop(componentSubtotalCop)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-text-secondary">
                        <span>
                          Servicio de ensamble, calibración y garantía (12h
                          test)
                        </span>
                        <span className="font-mono text-cyan-400">
                          {formatCop(
                            quoteResult.quote.lines.find(
                              (l) => l.kind === "service",
                            )?.amountCop ?? 150000,
                          )}
                        </span>
                      </div>
                      <div className="border-t border-border pt-3 mt-3 flex justify-between items-baseline">
                        <span className="font-bold text-sm text-text-primary">
                          Total Estimado
                        </span>
                        <span className="font-mono text-xl font-extrabold text-cyan-400">
                          {formatCop(quoteResult.quote.finalTotalCop)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
                      Total pendiente de confirmación. Al contactarnos por
                      WhatsApp calculamos el total con ensamble en tiempo real.
                    </div>
                  )}

                  <p className="text-[11px] text-text-muted">
                    {PRICE_VARIATION_NOTICE}
                  </p>

                  {/* WhatsApp Action */}
                  <a
                    href={`${whatsappUrl}?text=${whatsappMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-950 transition-all hover:brightness-110"
                  >
                    <span>Enviar configuración por WhatsApp</span>
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 3D CHASSIS VIEWER (40% Desktop, fixed/canvas) */}
        <aside className="hidden lg:flex lg:w-5/12 flex-col bg-navy-950 relative overflow-hidden">
          <div className="flex-1 relative w-full h-full">
            <ChassisViewer
              selection={selection}
              activeStep={step}
              onSaveConfig={handleSaveConfig}
              onLoadConfig={hasSavedConfig ? handleLoadConfig : undefined}
              hasSavedConfig={hasSavedConfig}
              saveFeedback={saveFeedback}
            />
          </div>

          {/* Floating live summary badge drawer at bottom of 3D Canvas */}
          <div className="border-t border-border/70 bg-navy-900/90 backdrop-blur-md p-4 space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
                Componentes instalados
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {selectedComponents.length} seleccionados
              </span>
            </div>

            {/* Quick mini parts strip */}
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto scrollbar-thin">
              {selectedComponents.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded bg-navy-950 px-2 py-0.5 text-[10px] font-mono text-text-secondary border border-border"
                >
                  <span className="text-cyan-400 uppercase">{c.category}:</span>
                  <span className="truncate max-w-[100px]">{c.model}</span>
                </span>
              ))}
            </div>

            <div className="pt-2 border-t border-border/60 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono uppercase text-text-muted">
                  Subtotal en vivo
                </p>
                <p className="font-mono text-base font-bold text-cyan-300">
                  {formatCop(componentSubtotalCop)}
                </p>
              </div>

              {step !== "summary" && (
                <button
                  type="button"
                  onClick={() => setStep("summary")}
                  className="rounded-lg bg-cyan-500/15 border border-cyan-500/40 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25 transition-colors"
                >
                  Ver Resumen
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
