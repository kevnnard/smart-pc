/**
 * smart-pc · curated prebuilt PCs (Phase 3).
 *
 * Three tiers modeled on F1.6 / F2.1 / F3:
 *   - `essentials` — entry-level 1080p gaming + home/office
 *   - `creator`    — 1440p creator + streaming
 *   - `apex`       — 4K gaming + heavy workloads
 *
 * Components are inlined as plain `Component` objects (not catalog refs) so
 * prebuild snapshots stay stable even when the catalog evolves. Total build
 * price equals `sum(components[].price)` and is roughly mirrored by
 * `basePrice`; the latter is the marketing number displayed on the card, the
 * former is the live total on the configurator review step (Phase 7).
 *
 * Prices are integer ARS (no decimals). Display via `formatArs()`.
 */
import type { Component, PrebuiltPC } from "./types";

// ---------------------------------------------------------------------------
// Helpers — small inlined component literals (kept stable across catalog edits)
// ---------------------------------------------------------------------------

const essentialsCpu: Component = {
  id: "prebuild-essentials-cpu",
  category: "cpu",
  brand: "AMD",
  model: "Ryzen 5 5600",
  price: 320_000,
  specs: { Cores: "6", Threads: "12", "Boost Clock": "4.4 GHz" },
  socket: "AM4",
  tdp: 65,
};

const essentialsGpu: Component = {
  id: "prebuild-essentials-gpu",
  category: "gpu",
  brand: "NVIDIA",
  model: "GeForce RTX 3060",
  price: 620_000,
  specs: { VRAM: "12 GB GDDR6", "Power Draw": "170W" },
  wattageDraw: 170,
};

const essentialsMotherboard: Component = {
  id: "prebuild-essentials-mb",
  category: "motherboard",
  brand: "ASUS",
  model: "Prime B550M-K",
  price: 240_000,
  specs: { Chipset: "B550", "Memory Slots": "2" },
  socket: "AM4",
  ramType: "DDR4",
  ramSlots: 2,
  formFactor: "mATX",
};

const essentialsRam: Component = {
  id: "prebuild-essentials-ram",
  category: "ram",
  brand: "Corsair",
  model: "Vengeance LPX 16 GB (2 × 8) DDR4-3200",
  price: 110_000,
  specs: { Capacity: "16 GB", Speed: "DDR4-3200" },
  ramType: "DDR4",
};

const essentialsStorage: Component = {
  id: "prebuild-essentials-storage",
  category: "storage",
  brand: "Samsung",
  model: "980 500 GB NVMe",
  price: 95_000,
  specs: { Capacity: "500 GB", Interface: "PCIe 3.0 ×4 NVMe" },
  interface_: "nvme",
};

const essentialsPsu: Component = {
  id: "prebuild-essentials-psu",
  category: "psu",
  brand: "Corsair",
  model: "RM650x (2021) 650W 80+ Gold",
  price: 195_000,
  specs: { Wattage: "650 W", Efficiency: "80+ Gold" },
  wattage: 650,
};

const essentialsCooler: Component = {
  id: "prebuild-essentials-cooler",
  category: "cooler",
  brand: "Cooler Master",
  model: "Hyper 212 Black Edition",
  price: 75_000,
  specs: { Type: "Air tower", "Max TDP": "220W" },
  socket: "AM4,LGA1700",
  tdp: 220,
};

// ---------------------------------------------------------------------------
// Creator tier
// ---------------------------------------------------------------------------

const creatorCpu: Component = {
  id: "prebuild-creator-cpu",
  category: "cpu",
  brand: "AMD",
  model: "Ryzen 7 5800X",
  price: 480_000,
  specs: { Cores: "8", Threads: "16", "Boost Clock": "4.7 GHz" },
  socket: "AM4",
  tdp: 105,
};

const creatorGpu: Component = {
  id: "prebuild-creator-gpu",
  category: "gpu",
  brand: "NVIDIA",
  model: "GeForce RTX 4070",
  price: 1_180_000,
  specs: { VRAM: "12 GB GDDR6X", "Power Draw": "200W" },
  wattageDraw: 200,
};

const creatorMotherboard: Component = {
  id: "prebuild-creator-mb",
  category: "motherboard",
  brand: "ASUS",
  model: "ROG Strix B550-F Gaming",
  price: 380_000,
  specs: { Chipset: "B550", "Memory Slots": "4" },
  socket: "AM4",
  ramType: "DDR4",
  ramSlots: 4,
  formFactor: "ATX",
};

const creatorRam: Component = {
  id: "prebuild-creator-ram",
  category: "ram",
  brand: "Kingston",
  model: "Fury Beast 32 GB (2 × 16) DDR4-3600",
  price: 195_000,
  specs: { Capacity: "32 GB", Speed: "DDR4-3600" },
  ramType: "DDR4",
};

const creatorStorage: Component = {
  id: "prebuild-creator-storage",
  category: "storage",
  brand: "Western Digital",
  model: "Black SN850X 1 TB NVMe",
  price: 220_000,
  specs: { Capacity: "1 TB", Interface: "PCIe 4.0 ×4 NVMe" },
  interface_: "nvme",
};

const creatorPsu: Component = {
  id: "prebuild-creator-psu",
  category: "psu",
  brand: "Corsair",
  model: "RM750x (2021) 750W 80+ Gold",
  price: 240_000,
  specs: { Wattage: "750 W", Efficiency: "80+ Gold" },
  wattage: 750,
};

const creatorCooler: Component = {
  id: "prebuild-creator-cooler",
  category: "cooler",
  brand: "DeepCool",
  model: "AK620",
  price: 145_000,
  specs: { Type: "Air dual-tower", "Max TDP": "260W" },
  socket: "AM5,LGA1700",
  tdp: 260,
};

// ---------------------------------------------------------------------------
// Apex tier
// ---------------------------------------------------------------------------

const apexCpu: Component = {
  id: "prebuild-apex-cpu",
  category: "cpu",
  brand: "AMD",
  model: "Ryzen 9 7900X",
  price: 920_000,
  specs: { Cores: "12", Threads: "24", "Boost Clock": "5.6 GHz" },
  socket: "AM5",
  tdp: 170,
};

const apexGpu: Component = {
  id: "prebuild-apex-gpu",
  category: "gpu",
  brand: "NVIDIA",
  model: "GeForce RTX 4080 Super",
  price: 2_350_000,
  specs: { VRAM: "16 GB GDDR6X", "Power Draw": "320W" },
  wattageDraw: 320,
};

const apexMotherboard: Component = {
  id: "prebuild-apex-mb",
  category: "motherboard",
  brand: "ASUS",
  model: "ROG Strix X670E-E Gaming WiFi",
  price: 720_000,
  specs: { Chipset: "X670E", "Memory Slots": "4" },
  socket: "AM5",
  ramType: "DDR5",
  ramSlots: 4,
  formFactor: "ATX",
};

const apexRam: Component = {
  id: "prebuild-apex-ram",
  category: "ram",
  brand: "G.Skill",
  model: "Trident Z5 RGB 64 GB (2 × 32) DDR5-6000",
  price: 480_000,
  specs: { Capacity: "64 GB", Speed: "DDR5-6000" },
  ramType: "DDR5",
};

const apexStorage: Component = {
  id: "prebuild-apex-storage",
  category: "storage",
  brand: "Samsung",
  model: "990 PRO 2 TB NVMe",
  price: 460_000,
  specs: { Capacity: "2 TB", Interface: "PCIe 4.0 ×4 NVMe" },
  interface_: "nvme",
};

const apexPsu: Component = {
  id: "prebuild-apex-psu",
  category: "psu",
  brand: "Corsair",
  model: "RM1000x SHIFT 1000W 80+ Gold",
  price: 380_000,
  specs: { Wattage: "1000 W", Efficiency: "80+ Gold" },
  wattage: 1000,
};

const apexCooler: Component = {
  id: "prebuild-apex-cooler",
  category: "cooler",
  brand: "Arctic",
  model: "Liquid Freezer III 360",
  price: 240_000,
  specs: { Type: "AIO 360 mm", "Max TDP": "350W" },
  socket: "AM5,LGA1700",
  tdp: 350,
};

// ---------------------------------------------------------------------------
// Aggregated prebuilt records
// ---------------------------------------------------------------------------

export const prebuilds: readonly PrebuiltPC[] = [
  {
    slug: "essentials",
    name: "Essentials",
    tier: "essentials",
    tagline: "Home · Office · Estudio",
    basePrice: 1_300_000,
    featured: true,
    badge: "Más vendido",
    components: [
      essentialsCpu,
      essentialsGpu,
      essentialsMotherboard,
      essentialsRam,
      essentialsStorage,
      essentialsPsu,
      essentialsCooler,
    ],
  },
  {
    slug: "creator",
    name: "Creator",
    tier: "creator",
    tagline: "Creator · Streaming · 1440p",
    basePrice: 2_500_000,
    featured: true,
    components: [
      creatorCpu,
      creatorGpu,
      creatorMotherboard,
      creatorRam,
      creatorStorage,
      creatorPsu,
      creatorCooler,
    ],
  },
  {
    slug: "apex",
    name: "Apex",
    tier: "apex",
    tagline: "4K Gaming · Workstation",
    basePrice: 5_000_000,
    featured: true,
    badge: "Top tier",
    components: [
      apexCpu,
      apexGpu,
      apexMotherboard,
      apexRam,
      apexStorage,
      apexPsu,
      apexCooler,
    ],
  },
];
