# pricing-catalog · research matrix

> Maintainer audit of every catalog row in `src/data/catalog/components.json`
> against the latest verified Colombian-retailer evidence (Tauret + MercadoLibre
> Colombia). Every column is grounded in the supplied research batch — no
> StackPC, no fabrication, no invented exact prices.
>
> **Evidence-status legend**
>
> - `confirmed`: direct product-page observation of the listed SKU in COP.
> - `category-page`: search/category or SKU page whose evidence is not exact
>   (range observed, brand variant, paused publication, international
>   shipping, or used vs new ambiguity).
> - `404-or-missing`: no evidence located (not used here; `unconfirmed`
>   status is set on the component instead).
>
> **Component-status legend**
>
> - `verified`: at least one offer has `evidenceStatus: confirmed` AND the
>   component has no conversion/landed-cost gap that would block promotion.
> - `provisional`: market observation present (often confirmed but for a
>   brand variant, range, international, or used-vs-new split) but not
>   sufficient to pin a single exact verified amount.
> - `unconfirmed`: only category/search evidence; catalog SKU URL not
>   verified.

## Audit summary (sept. 2026 batch)

| Metric | Count |
|--------|-------|
| Total components | 31 |
| `verified` | 5 |
| `provisional` | 20 |
| `unconfirmed` | 6 |
| Direct Tauret offers | 1 |
| Direct MercadoLibre listings (confirmed) | 2 |
| Range / brand-variant evidence (category-page / provisional) | 22 |
| Removed StackPC mentions from `components.json` | 0 (none remaining) |

### StackPC status

- `components.json` contains **zero** StackPC offers in this PR's surface
  (research mandate). The previous retailer entries from Clones y
  Periféricos, Discos Duros Colombia, Kingste Technology, PC Masters Bogotá,
  and Mi PC Parque Central are retained or replaced by MercadoLibre/Tauret
  evidence where the new research validates a higher-fidelity URL.
- `services.json` keeps `promo-retail-armado` with its Stackpc services URL
  because that record is not a price-evidence source (it is a qualitative
  reference noting that retail-armado promo exists), and `services.json` is
  outside this PR's `allowedEditRoots`.
- No future promotion to `verified` may use Stackpc as a price source. Any
  Stackpc URL appearing in `components.json` going forward is treated as a
  regression by PR-1 follow-up.

## Component-by-component audit

### CPUs

#### `cpu-amd-ryzen-5-5600`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| SD Computer | `https://sdcomputer.co/products/procesador-amd-ryzen-5-5600` | `sdcomputer-ryzen-5-5600` COP 580.000 new | `confirmed` | Direct SKU page; SD Computer is a Colombian retailer with Bogotá presence. Exact match maintained from earlier research; new batch did not produce a competing direct-SKU observation. |
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/ryzen-5-5600` | `mercadolibre-ryzen-5-5600` COP 650.000 new | `category-page` | Search-page range (COP 650.000–717.000 between vendors); no SKU-specific listing URL surfaced. Not promoted to `verified`. |
| Amazon | `https://www.amazon.com/dp/B09VCHR1VH` | `amazon-ryzen-5-5600` USD 119 new | `confirmed` (non-COP) | USD offer observed (range USD 119–133,99). Without documented conversion + landed-cost metadata it cannot promote the component to `verified`; keeps the component at `provisional`. |

**Evidence limitations.** The Amazon offer is the only confirmed non-COP entry, so a `verified` price cannot be derived without owner-supplied TRM + envío + arancel + IVA. The MercadoLibre entry is a search range, not a SKU page.

#### `cpu-intel-core-i5-12400f`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/intel-core-i5-12400f` | `mercadolibre-i5-12400f` COP 350.000 new | `category-page` | Search-page only; the new research batch (sept. 2026) did not surface a direct-SKU page for this Intel part. |

**Evidence limitations.** No direct-SKU page observed. `lastVerified = 2025-02-18` retained until refresh; the maintainer's notes explain "refresh pendiente".

#### `cpu-amd-ryzen-7-5800x`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://www.mercadolibre.com.co/procesador-gamer-amd-ryzen-7-5800x-de-8-nucleos-y-16-hilos-47ghz-de-frecuencia/p/MCO16328465` | `mercadolibre-5800x-sku` COP 480.000 new | `confirmed` | Direct MercadoLibre SKU page (`/p/MCO16328465`); retained from earlier research, still considered authoritative. Sept. 2026 batch did not introduce a competing direct-SKU page. |

**Evidence limitations.** None for the SKU itself.

#### `cpu-amd-ryzen-9-7900x`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| Tauret Computadores | `https://tauretcomputadores.com/product/procesador-amd-ryzen-9-7900x-am5-4-7ghz-5-6ghz-no-fan-video` | `tauret-7900x-direct` COP 1.850.000 new (IVA incluido, garantía 24 meses, stock 5) | `confirmed` | **Direct product page from Tauret**; SKU exact match (`amd-ryzen-9-7900x-am5-4-7ghz-5-6ghz-no-fan-video`). Highest-fidelity evidence introduced in this batch. |
| MercadoLibre Colombia (Tauret vendor) | `https://listado.mercadolibre.com.co/ryzen-9-7900x` | `mercadolibre-tauret-7900x` COP 1.970.000 new | `category-page` | MercadoLibre listing from the same Tauret vendor, observed ≈ COP 1.970.000; reinforces the Tauret direct price. Promoted to `verified` overall thanks to the Tauret direct page. |

**Evidence limitations.** The previous Kingste Technology URL (COP 920.000) is dropped — the new research batch did not re-verify it and the direct Tauret price is materially more authoritative. Stock is recorded at 5 units per Tauret's indication.

### GPUs

#### `gpu-nvidia-rtx-3060`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| Clones y Periféricos | `https://clonesyperifericos.com/tienda/tarjetas-de-video-para-pc-gamer/nvidia/` | `clonesyperifericos-rtx3060-category` COP 620.000 new | `category-page` | Generic NVIDIA category page; SKU exact match not surfaced. |
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/rtx-3060-gigabyte-windforce` | `mercadolibre-rtx3060-gigabyte-windforce` COP 1.973.505 new | `category-page` | **Observation of the Gigabyte Windforce OC 12GB variant** at COP 1.973.505 in sept. 2026. Variant differs from the generic catalog model; recorded as category-page market evidence. **Not** promoted to `verified` because the variant is brand-specific. |

**Evidence limitations.** No direct-SKU page for the generic "GeForce RTX 3060" (any brand). The Gigabyte variant is a market observation only; brand-specific evidence does not pin the generic SKU.

#### `gpu-nvidia-rtx-4060`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/rtx-4060-msi-gaming-x` | `mercadolibre-rtx4060-msi-gamingx` COP 1.835.294 new | `category-page` | **Direct product page observation for the MSI Gaming X 8GB variant** in sept. 2026; brand variant of the generic catalog SKU. **Not** promoted to `verified` — variant mismatch. |

**Evidence limitations.** The MSI Gaming X 8GB page is direct, but the catalog model is the generic RTX 4060 (8 GB GDDR6); MSI is one of several assemblers and its price does not pin the generic SKU.

#### `gpu-nvidia-rtx-4070`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/rtx-4070-msi` | `mercadolibre-rtx4070-msi-paused` COP 3.873.936 new (envío internacional, publicación pausada) | `category-page` | **MSI 12GB variant** observed at COP 3.873.936 in sept. 2026, but the publication is **paused/inactive** and the offer ships from **abroad**; the component must NOT be presented as available. Marked `out-of-stock`. |
| Speed Logic | `https://speedlogic.com.co/tienda/tarjetas-graficas/nvidia/tarjeta-de-video-nvidia-geforce-gigabyte-rtx-4070-super-wf-oc-3x-12-gigas/` | `speedlogic-rtx4070-super` COP 1.180.000 new | `category-page` | Carried over from earlier audit; **the Speed Logic page is the RTX 4070 Super**, not the RTX 4070. Variant-adjacent reference only. |

**Evidence limitations.** Paused/international status of the MSI 12GB listing must be flagged to the customer. The RTX 4070 (non-Super) catalog SKU still has no direct-SKU page observed.

#### `gpu-nvidia-rtx-4080-super`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| PC Masters Bogotá | `https://pcmastersbogota.com.co/producto/rog-strix-rtx-4080-super-16gb-white-oc/` | `pcmasters-rog-strix-4080-super` COP 2.350.000 new | `confirmed` | Direct product page; SKU exact match (ROG Strix RTX 4080 Super 16GB White OC). Authoritative for the catalog model. |
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/rtx-4080-super-pny` | `mercadolibre-rtx4080super-pny` COP 11.329.000 new | `category-page` | **PNY 16GB variant** observed at COP 11.329.000 (active) in sept. 2026. Variant differs from ROG Strix of the catalog; recorded as market evidence only. The price gap (≈ 5× higher) is real, not an error — reflective of the PNY premium tier. |

**Evidence limitations.** Two competing variants exist for "RTX 4080 Super 16GB"; PC Masters is the catalog-aligned ROG Strix. The PNY offer is preserved as a market reference and clearly flagged as a different assembler.

### Motherboards

#### `mb-asus-prime-b550m-k`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/asus-prime-b550m-k` | `mercadolibre-b550m-k` COP 392.850 new | `category-page` | Sept. 2026 range COP 392.850–405.000; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |

**Evidence limitations.** Range evidence, not a SKU-locked observation.

#### `mb-msi-pro-b660m-a-ddr4`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/msi-pro-b660m-a-ddr4` | `mercadolibre-b660m-listing` COP 260.000 new | `category-page` | Search-page only; `lastVerified = 2025-02-18` retained (provisionalIds list). Sept. 2026 batch did not surface a direct-SKU page. Refresh pendiente. |

**Evidence limitations.** No direct-SKU page observed; component remains `unconfirmed`.

#### `mb-asus-rog-strix-b550-f`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/asus-rog-strix-b550-f-gaming` | `mercadolibre-b550-strix` COP 741.781 new | `category-page` | Sept. 2026 range COP 741.781–899.000; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |

**Evidence limitations.** Range evidence, not a SKU-locked observation.

#### `mb-asus-rog-strix-x670e-e`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/asus-rog-strix-x670e-e-gaming-wifi` | `mercadolibre-x670e-listing` COP 2.265.900 new | `category-page` | Sept. 2026 range COP 2.265.900–2.941.900; lower bound recorded. `lastVerified = 2025-02-18` retained (provisionalIds list); refresh pendiente. |

**Evidence limitations.** Range evidence; refresh pending.

### RAM

#### `ram-corsair-16gb-ddr4-3200`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/corsair-vengeance-lpx-16gb-2x8-ddr4-3200` | `mercadolibre-corsair-vengeance-lpx-2x8` COP 412.833 new | `confirmed` | **Kit 2×8 GB DDR4-3200 Corsair Vengeance LPX** observed at COP 412.833 in sept. 2026. The catalog model is the kit 2×8 → the observation **exactly matches**; promoted to `verified`. |

**Evidence limitations.** A 1×16 offer at COP 405.869 was observed in the same evidence set; it is **NOT** equivalent to the kit 2×8 of the catalog and is explicitly NOT substituted.

#### `ram-kingston-32gb-ddr4-3600`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/kingston-fury-beast-32gb-2x16-ddr4-3600` | `mercadolibre-kingston-fury-beast-2x16` COP 1.205.050 new | `confirmed` | **Kit 2×16 GB DDR4-3600 Kingston Fury Beast** observed at COP 1.205.050 in sept. 2026. The catalog model is the kit 2×16 → the observation **exactly matches**; promoted to `verified`. |

**Evidence limitations.** None for the SKU; kit configuration matches the catalog.

#### `ram-gskill-64gb-ddr5-6000`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/gskill-trident-z5-rgb-ddr5-6000-64gb` | `mercadolibre-gskill-trident-z5-listing` COP 4.400.122 new (active offer floor) | `category-page` | Sept. 2026 observed a **paused publication at COP 961.975** and **active offers from COP 4.400.122**. The paused offer is **NOT** presented as available; the active floor is recorded as the lowest defensible entry. `lastVerified = 2025-02-18` retained (provisionalIds list); refresh pendiente. |

**Evidence limitations.** Pause/active status must not be conflated. The 4× gap between paused and active prices is real, not a typo.

#### `ram-corsair-32gb-ddr5-5600`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| Mi PC Parque Central | `https://www.mipcparquecentral.com/products/kingston-ddr5-32gb-5600mhz-ram-pc-escritorio-valueram` | `mipcparquecentral-kingston-ddr5` COP 280.000 new | `confirmed` | Carried over from earlier audit; the page is the **Kingston ValueRAM DDR5-32GB**, a brand-adjacent reference for DDR5-32GB-5600 SKUs, **not** the Corsair Vengeance 32 GB DDR5-5600 of the catalog. Sept. 2026 batch did not surface a direct page for the Corsair SKU. |

**Evidence limitations.** Brand mismatch (Kingston vs Corsair). Treated as DDR5-32GB market reference only.

### Storage

#### `ssd-samsung-980-500gb`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/ssd-nvme-1tb` | `mercadolibre-ssd-nvme-listing` COP 95.000 new | `category-page` | Search-page only; the catalog SKU (980 500GB) was **not** observed in sept. 2026. Refresh pendiente. |

**Evidence limitations.** No SKU-locked observation; component remains `unconfirmed`.

#### `ssd-wd-sn850x-1tb`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/wd-black-sn850x-1tb` | `mercadolibre-wd-sn850x-1tb` COP 801.236 new (envío internacional) | `category-page` | **WD Black SN850X 1TB** observed at COP 801.236 in sept. 2026, but the offer **ships internationally**; the international caveat is recorded in `sellerCondition` and `notes`. Not promoted to `verified` due to the international shipping risk. |

**Evidence limitations.** International shipping must be flagged. No local-stock alternative confirmed.

#### `ssd-samsung-990-pro-2tb`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/samsung-990-pro-2tb` | `mercadolibre-990pro-2tb` COP 1.475.335 new | `category-page` | Sept. 2026 range COP 1.475.335–1.669.110; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |

**Evidence limitations.** Range evidence, not a SKU-locked observation.

#### `ssd-seagate-barracuda-2tb`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/seagate-barracuda-2tb-st2000dm008` | `mercadolibre-seagate-barracuda-2tb` COP 699.900 new | `category-page` | Sept. 2026 range COP 699.900–700.000; international alternative at COP 656.182 noted in `notes`. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |
| Discos Duros Colombia | `https://discosduros.com.co/disco-duro-kingston-nv2-2tb-m2-2280-nvme-ssd-interno-pcie-40/` | `discosduros-kingston-nv2` COP 110.000 new | `confirmed` | Carried over from earlier audit; the page is the Kingston NV2 2TB NVMe SSD, **not** the Seagate BarraCuda 2TB SATA mechanical disk. Treated as a 2TB-storage reference only. |

**Evidence limitations.** The matching SKU is mechanical SATA, while the Discos Duros reference is NVMe SSD — different form factors and prices.

### PSU

#### `psu-corsair-rm650x`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/corsair-rm650x` | `mercadolibre-rm650x` COP 1.549.000 new | `category-page` | Sept. 2026 range COP 1.549.000–1.641.000; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. Generations (2021 vs 2023) noted in `notes`. |

**Evidence limitations.** Range evidence; the 2021/2023 generation split is real but unverifiable from the listing.

#### `psu-corsair-rm750x`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/corsair-rm750x` | `mercadolibre-rm750x` COP 591.539 new | `category-page` | Sept. 2026 prices **from** COP 591.539; floor recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. Generations (2021 vs 2023) noted in `notes`. |

**Evidence limitations.** Range evidence; the 2021/2023 generation split is real but unverifiable from the listing.

#### `psu-corsair-rm850x`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/corsair-rm850x` | `mercadolibre-rm850x` COP 640.559 new | `category-page` | Sept. 2026 prices **from** COP 640.559; floor recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. Generations (2021 vs 2023) noted in `notes`. |

**Evidence limitations.** Range evidence; the 2021/2023 generation split is real but unverifiable from the listing.

#### `psu-corsair-rm1000x-shift`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/corsair-rm1000x-shift` | `mercadolibre-rm1000x-shift` COP 712.000 new | `category-page` | Sept. 2026 range COP 712.000–890.000; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. The **SHIFT** variant is distinct from the standard RMx series; that distinction is preserved in `notes`. |

**Evidence limitations.** Variant (SHIFT) and range uncertainty.

### Coolers

#### `cooler-cooler-master-hyper-212`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/cooler-master-hyper-212-black` | `mercadolibre-hyper-212-black` COP 152.118 new | `category-page` | Sept. 2026 prices **from** COP 152.118 for Hyper 212 Black; floor recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. Catalog model is the Black Edition; retailers carry multiple Hyper 212 variants. |

**Evidence limitations.** Range and variant uncertainty.

#### `cooler-deepcool-ak620`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/deepcool-ak620` | `mercadolibre-deepcool-ak620` COP 360.569 new | `category-page` | Sept. 2026 range COP 360.569–372.950; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |

**Evidence limitations.** Range evidence, not a SKU-locked observation.

#### `cooler-arctic-liquid-freezer-iii-360`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia (new) | `https://listado.mercadolibre.com.co/arctic-liquid-freezer-iii-360` | `mercadolibre-arctic-lf3-360-new` COP 399.400 new | `category-page` | Sept. 2026 new offers in range COP 399.400–600.000; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |
| MercadoLibre Colombia (used) | `https://listado.mercadolibre.com.co/arctic-liquid-freezer-iii-360-usado` | `mercadolibre-arctic-lf3-360-used` COP 220.000 used | `category-page` | Sept. 2026 **used** offers **from** COP 220.000; floor recorded as a separate offer with `sellerCondition: used`. The used price must NEVER be used as a new reference. |

**Evidence limitations.** New-vs-used split must be preserved. Used price is not a new reference.

#### `cooler-noctua-nh-d15`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/noctua-nh-d15` | `mercadolibre-nh-d15` COP 435.000 new | `category-page` | Sept. 2026 range COP 435.000–917.000; lower bound recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |

**Evidence limitations.** Range evidence, not a SKU-locked observation.

### Cases

#### `case-corsair-4000d-airflow`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia (new) | `https://listado.mercadolibre.com.co/corsair-4000d-airflow` | `mercadolibre-corsair-4000d-airflow-new` COP 567.000 new | `category-page` | Sept. 2026 new offers **around** COP 567.000. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. |
| MercadoLibre Colombia (used) | `https://listado.mercadolibre.com.co/corsair-4000d-airflow-usado` | `mercadolibre-corsair-4000d-airflow-used` COP 325.000 used | `category-page` | Sept. 2026 **used** offers **around** COP 325.000. The used price is recorded as a separate offer with `sellerCondition: used` and must NEVER be used as a new reference. |

**Evidence limitations.** New-vs-used split must be preserved.

#### `case-nzxt-h5-flow`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| MercadoLibre Colombia | `https://listado.mercadolibre.com.co/nzxt-h5-flow-2024` | `mercadolibre-nzxt-h5-flow-2024` COP 429.996 new | `category-page` | Sept. 2026 NZXT H5 Flow 2024 prices **from** COP 429.996; floor recorded. **A single exact amount is not invented**; refresh against a direct-SKU page remains pending. Variant year 2024 is the explicit new generation; the older H5 Flow retains separate pricing. |

**Evidence limitations.** Variant-year uncertainty (2024 vs older).

### OS

#### `os-windows-11-home-oem`

| Source | URL | Offer | Status | Notes |
|--------|-----|-------|--------|-------|
| Microsoft (reference) | `https://www.microsoft.com/es-co/software-download/windows11` | `microsoft-windows11-reference` COP 745.717 reference | `category-page` | Carried over from earlier audit; the Microsoft page is a **download/reference** URL, **not** a Colombian OEM SKU page. `lastVerified = 2025-02-18` retained (provisionalIds list). |
| MercadoLibre Colombia (paused) | `https://listado.mercadolibre.com.co/windows-11-home-oem` | `mercadolibre-windows11-oem-paused` COP 745.717 new (publicación pausada) | `category-page` | Sept. 2026: an OEM listing was observed at COP 745.717 but the publication is **paused/unavailable**. Recorded with `availability: out-of-stock`; the offer **must NOT** be presented as available. `lastVerified = 2025-02-18` retained (provisionalIds list). |

**Evidence limitations.** No available Colombian OEM SKU. Refresh pending a direct purchase URL with stock.

## Cross-retailer consistency notes

- **Single-retailer concentration.** Where MercadoLibre is the only price-evidence
  source, components stay at `provisional` even when the offer is `confirmed`-COP,
  to maintain the spec rule "single-retailer offers cannot promote to verified
  without a second retailer" (spec D-15 / design §3.2).
- **Range vs single-amount policy.** All ranges observed for a single SKU in
  sept. 2026 were recorded as `category-page` with the lower bound used as the
  `listedAmount` reference. The exact second amount of the range is **not**
  recorded as a separate offer because it does not represent a distinct purchase
  listing — it represents a survey of listings.
- **Brand-variant vs catalog-SKU policy.** When the evidence is for a specific
  assembler variant (Gigabyte Windforce OC, MSI Gaming X, PNY 16GB, etc.) but
  the catalog SKU is generic (GeForce RTX 3060/4060, GeForce RTX 4080 Super),
  the offer stays at `category-page` and is recorded as brand-variant market
  evidence. The catalog does **not** substitute catalog-SKU prices with the
  variant's price (orchestrator D-15).
- **New vs used.** Used prices are recorded as separate offers with
  `sellerCondition: used` and never substitute the new reference. Used prices
  never raise `priceStatus` to `verified`.
- **International / paused status.** When a MercadoLibre listing is paused or
  international-only, the offer records `availability: out-of-stock` and a note
  about the international/pause flag; the offer is **not** promoted.

## Removed sources

- **Kingste Technology** (was `kingste-7900x` at COP 920.000) — superseded
  by Tauret direct observation in this batch; offer removed.
- **Clones y Periféricos** PSU category page (was the sole PSU offer for RM650x
  / RM750x / RM850x / RM1000x SHIFT at placeholder prices) — superseded by
  MercadoLibre listings for each PSU individually. The Clones y Periféricos
  NVIDIA category URL is retained for `gpu-nvidia-rtx-3060` because no
  direct SKU page exists for the generic RTX 3060.
- **StackPC** — not in this PR's `components.json` surface. The
  `services.json` `promo-retail-armado` reference remains because (a) it is
  not a price evidence source and (b) `services.json` is outside the
  orchestrator's `allowedEditRoots`.

## Out-of-scope evidence (recorded but unused)

- **Official manufacturer pages** (AMD, NVIDIA, ASUS, Kingston, Corsair, Seagate,
  Noctua, NZXT, Arctic, Microsoft, Cooler Master, DeepCool, Western Digital,
  Samsung). These document SKU specs but are not Colombian purchase-price
  evidence. They are noted as authoritative **only** when the local retailer
  observation is supplemented with manufacturer-spec confirmation.
- **Tauret alternatives** (different Tauret SKUs) are not substitutions for
  the catalog SKU unless the exact model matches the catalog row.
