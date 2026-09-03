/**
 * smart-pc · component catalog (Phase 3).
 *
 * Curated catalog of PC parts the configurator offers. Each entry carries the
 * category-specific compatibility fields consumed by `validate()` in
 * `src/lib/compatibility.ts`:
 *
 *   - `cpu`        → `socket`, `tdp`
 *   - `gpu`        → `wattageDraw`
 *   - `motherboard`→ `socket`, `ramType`, `ramSlots`, `formFactor`
 *   - `ram`        → `ramType`
 *   - `storage`    → `interface_` (`nvme` / `sata` / `m2`)
 *   - `psu`        → `wattage`
 *   - `cooler`     → `socket` (supported sockets), `tdp` (max TDP rating)
 *
 * Minimum 3 parts per category per tasks.md 3.5. Adding a fifth part MUST
 * fill the relevant compatibility fields, otherwise `validate()` may emit a
 * false-positive warning.
 *
 * Prices are integer ARS (no decimals). Display via `formatArs()` from
 * `src/lib/money.ts` once that helper lands.
 */
import type { Component } from "./types";

// ---------------------------------------------------------------------------
// CPU — 4 entries
// ---------------------------------------------------------------------------

export const cpus: readonly Component[] = [
  {
    id: "cpu-amd-ryzen-5-5600",
    category: "cpu",
    brand: "AMD",
    model: "Ryzen 5 5600",
    price: 320_000,
    specs: {
      Cores: "6",
      Threads: "12",
      "Boost Clock": "4.4 GHz",
      "Base Clock": "3.5 GHz",
      TDP: "65W",
    },
    socket: "AM4",
    tdp: 65,
  },
  {
    id: "cpu-intel-i5-12400f",
    category: "cpu",
    brand: "Intel",
    model: "Core i5-12400F",
    price: 350_000,
    specs: {
      Cores: "6",
      Threads: "12",
      "Boost Clock": "4.4 GHz",
      "Base Clock": "2.5 GHz",
      TDP: "65W",
    },
    socket: "LGA1700",
    tdp: 65,
  },
  {
    id: "cpu-amd-ryzen-7-5800x",
    category: "cpu",
    brand: "AMD",
    model: "Ryzen 7 5800X",
    price: 480_000,
    specs: {
      Cores: "8",
      Threads: "16",
      "Boost Clock": "4.7 GHz",
      "Base Clock": "3.8 GHz",
      TDP: "105W",
    },
    socket: "AM4",
    tdp: 105,
  },
  {
    id: "cpu-amd-ryzen-9-7900x",
    category: "cpu",
    brand: "AMD",
    model: "Ryzen 9 7900X",
    price: 920_000,
    specs: {
      Cores: "12",
      Threads: "24",
      "Boost Clock": "5.6 GHz",
      "Base Clock": "4.7 GHz",
      TDP: "170W",
    },
    socket: "AM5",
    tdp: 170,
  },
];

// ---------------------------------------------------------------------------
// GPU — 4 entries
// ---------------------------------------------------------------------------

export const gpus: readonly Component[] = [
  {
    id: "gpu-nvidia-rtx-3060",
    category: "gpu",
    brand: "NVIDIA",
    model: "GeForce RTX 3060",
    price: 620_000,
    specs: {
      VRAM: "12 GB GDDR6",
      "Boost Clock": "1.78 GHz",
      "Power Draw": "170W",
    },
    wattageDraw: 170,
  },
  {
    id: "gpu-nvidia-rtx-4060",
    category: "gpu",
    brand: "NVIDIA",
    model: "GeForce RTX 4060",
    price: 720_000,
    specs: {
      VRAM: "8 GB GDDR6",
      "Boost Clock": "2.46 GHz",
      "Power Draw": "115W",
    },
    wattageDraw: 115,
  },
  {
    id: "gpu-nvidia-rtx-4070",
    category: "gpu",
    brand: "NVIDIA",
    model: "GeForce RTX 4070",
    price: 1_180_000,
    specs: {
      VRAM: "12 GB GDDR6X",
      "Boost Clock": "2.48 GHz",
      "Power Draw": "200W",
    },
    wattageDraw: 200,
  },
  {
    id: "gpu-nvidia-rtx-4080-super",
    category: "gpu",
    brand: "NVIDIA",
    model: "GeForce RTX 4080 Super",
    price: 2_350_000,
    specs: {
      VRAM: "16 GB GDDR6X",
      "Boost Clock": "2.55 GHz",
      "Power Draw": "320W",
    },
    wattageDraw: 320,
  },
];

// ---------------------------------------------------------------------------
// Motherboard — 4 entries (one per CPU socket tier)
// ---------------------------------------------------------------------------

export const motherboards: readonly Component[] = [
  {
    id: "mb-asus-prime-b550m-k",
    category: "motherboard",
    brand: "ASUS",
    model: "Prime B550M-K",
    price: 240_000,
    specs: {
      Chipset: "B550",
      "Memory Slots": "2",
      "Max Memory": "64 GB",
      "M.2 Slots": "1",
    },
    socket: "AM4",
    ramType: "DDR4",
    ramSlots: 2,
    formFactor: "mATX",
  },
  {
    id: "mb-msi-pro-b660m-a-ddr4",
    category: "motherboard",
    brand: "MSI",
    model: "PRO B660M-A DDR4",
    price: 260_000,
    specs: {
      Chipset: "B660",
      "Memory Slots": "4",
      "Max Memory": "128 GB",
      "M.2 Slots": "2",
    },
    socket: "LGA1700",
    ramType: "DDR4",
    ramSlots: 4,
    formFactor: "mATX",
  },
  {
    id: "mb-asus-rog-strix-b550-f",
    category: "motherboard",
    brand: "ASUS",
    model: "ROG Strix B550-F Gaming",
    price: 380_000,
    specs: {
      Chipset: "B550",
      "Memory Slots": "4",
      "Max Memory": "128 GB",
      "M.2 Slots": "2",
    },
    socket: "AM4",
    ramType: "DDR4",
    ramSlots: 4,
    formFactor: "ATX",
  },
  {
    id: "mb-asus-rog-strix-x670e-e",
    category: "motherboard",
    brand: "ASUS",
    model: "ROG Strix X670E-E Gaming WiFi",
    price: 720_000,
    specs: {
      Chipset: "X670E",
      "Memory Slots": "4",
      "Max Memory": "192 GB",
      "M.2 Slots": "4",
    },
    socket: "AM5",
    ramType: "DDR5",
    ramSlots: 4,
    formFactor: "ATX",
  },
];

// ---------------------------------------------------------------------------
// RAM — 4 entries
// ---------------------------------------------------------------------------

export const rams: readonly Component[] = [
  {
    id: "ram-corsair-16gb-ddr4-3200",
    category: "ram",
    brand: "Corsair",
    model: "Vengeance LPX 16 GB (2 × 8) DDR4-3200",
    price: 110_000,
    specs: {
      Capacity: "16 GB",
      Speed: "DDR4-3200",
      CAS: "16",
      Kit: "2 × 8 GB",
    },
    ramType: "DDR4",
  },
  {
    id: "ram-kingston-32gb-ddr4-3600",
    category: "ram",
    brand: "Kingston",
    model: "Fury Beast 32 GB (2 × 16) DDR4-3600",
    price: 195_000,
    specs: {
      Capacity: "32 GB",
      Speed: "DDR4-3600",
      CAS: "18",
      Kit: "2 × 16 GB",
    },
    ramType: "DDR4",
  },
  {
    id: "ram-gskill-64gb-ddr5-6000",
    category: "ram",
    brand: "G.Skill",
    model: "Trident Z5 RGB 64 GB (2 × 32) DDR5-6000",
    price: 480_000,
    specs: {
      Capacity: "64 GB",
      Speed: "DDR5-6000",
      CAS: "30",
      Kit: "2 × 32 GB",
    },
    ramType: "DDR5",
  },
  {
    id: "ram-corsair-32gb-ddr5-5600",
    category: "ram",
    brand: "Corsair",
    model: "Vengeance 32 GB (2 × 16) DDR5-5600",
    price: 280_000,
    specs: {
      Capacity: "32 GB",
      Speed: "DDR5-5600",
      CAS: "36",
      Kit: "2 × 16 GB",
    },
    ramType: "DDR5",
  },
];

// ---------------------------------------------------------------------------
// Storage — 4 entries
// ---------------------------------------------------------------------------

export const storages: readonly Component[] = [
  {
    id: "ssd-samsung-980-500gb",
    category: "storage",
    brand: "Samsung",
    model: "980 500 GB NVMe",
    price: 95_000,
    specs: {
      Capacity: "500 GB",
      Interface: "PCIe 3.0 ×4 NVMe",
      "Sequential Read": "3500 MB/s",
    },
    interface_: "nvme",
  },
  {
    id: "ssd-wd-sn850x-1tb",
    category: "storage",
    brand: "Western Digital",
    model: "Black SN850X 1 TB NVMe",
    price: 220_000,
    specs: {
      Capacity: "1 TB",
      Interface: "PCIe 4.0 ×4 NVMe",
      "Sequential Read": "7300 MB/s",
    },
    interface_: "nvme",
  },
  {
    id: "ssd-samsung-990-pro-2tb",
    category: "storage",
    brand: "Samsung",
    model: "990 PRO 2 TB NVMe",
    price: 460_000,
    specs: {
      Capacity: "2 TB",
      Interface: "PCIe 4.0 ×4 NVMe",
      "Sequential Read": "7450 MB/s",
    },
    interface_: "nvme",
  },
  {
    id: "hdd-seagate-barracuda-2tb",
    category: "storage",
    brand: "Seagate",
    model: "BarraCuda 2 TB SATA",
    price: 110_000,
    specs: {
      Capacity: "2 TB",
      Interface: "SATA III",
      Speed: "7200 RPM",
    },
    interface_: "sata",
  },
];

// ---------------------------------------------------------------------------
// PSU — 4 entries
// ---------------------------------------------------------------------------

export const psus: readonly Component[] = [
  {
    id: "psu-corsair-rm650x",
    category: "psu",
    brand: "Corsair",
    model: "RM650x (2021) 650W 80+ Gold",
    price: 195_000,
    specs: {
      Wattage: "650 W",
      Efficiency: "80+ Gold",
      Modularity: "Fully modular",
    },
    wattage: 650,
  },
  {
    id: "psu-corsair-rm750x",
    category: "psu",
    brand: "Corsair",
    model: "RM750x (2021) 750W 80+ Gold",
    price: 240_000,
    specs: {
      Wattage: "750 W",
      Efficiency: "80+ Gold",
      Modularity: "Fully modular",
    },
    wattage: 750,
  },
  {
    id: "psu-corsair-rm850x",
    category: "psu",
    brand: "Corsair",
    model: "RM850x (2021) 850W 80+ Gold",
    price: 295_000,
    specs: {
      Wattage: "850 W",
      Efficiency: "80+ Gold",
      Modularity: "Fully modular",
    },
    wattage: 850,
  },
  {
    id: "psu-corsair-rm1000x-shift",
    category: "psu",
    brand: "Corsair",
    model: "RM1000x SHIFT 1000W 80+ Gold",
    price: 380_000,
    specs: {
      Wattage: "1000 W",
      Efficiency: "80+ Gold",
      Modularity: "Fully modular",
    },
    wattage: 1000,
  },
];

// ---------------------------------------------------------------------------
// Cooler — 4 entries
// ---------------------------------------------------------------------------

export const coolers: readonly Component[] = [
  {
    id: "cooler-cooler-master-hyper-212",
    category: "cooler",
    brand: "Cooler Master",
    model: "Hyper 212 Black Edition",
    price: 75_000,
    specs: {
      Type: "Air tower",
      "Max TDP": "220W",
      "Supported Sockets": "AM4, AM5, LGA1700",
    },
    socket: "AM4,LGA1700",
    tdp: 220,
  },
  {
    id: "cooler-deepcool-ak620",
    category: "cooler",
    brand: "DeepCool",
    model: "AK620",
    price: 145_000,
    specs: {
      Type: "Air dual-tower",
      "Max TDP": "260W",
      "Supported Sockets": "AM4, AM5, LGA1700",
    },
    socket: "AM5,LGA1700",
    tdp: 260,
  },
  {
    id: "cooler-arctic-liquid-freezer-iii-360",
    category: "cooler",
    brand: "Arctic",
    model: "Liquid Freezer III 360",
    price: 240_000,
    specs: {
      Type: "AIO 360 mm",
      "Max TDP": "350W",
      "Supported Sockets": "AM4, AM5, LGA1700",
    },
    socket: "AM5,LGA1700",
    tdp: 350,
  },
  {
    id: "cooler-noctua-nh-d15",
    category: "cooler",
    brand: "Noctua",
    model: "NH-D15",
    price: 195_000,
    specs: {
      Type: "Air dual-tower",
      "Max TDP": "250W",
      "Supported Sockets": "AM4, AM5, LGA1700",
    },
    socket: "AM4,AM5,LGA1700",
    tdp: 250,
  },
];

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

/**
 * Every catalog entry, flat. The configurator (Phase 7) consumes this as its
 * option source.
 */
export const components: readonly Component[] = [
  ...cpus,
  ...gpus,
  ...motherboards,
  ...rams,
  ...storages,
  ...psus,
  ...coolers,
];
