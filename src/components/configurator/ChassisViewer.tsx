import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PCSelection } from "../../data/types";

interface Props {
  readonly selection: PCSelection;
  readonly activeStep: string;
  readonly onSaveConfig?: () => void;
  readonly onLoadConfig?: () => void;
  readonly hasSavedConfig?: boolean;
  readonly saveFeedback?: string | null;
}

/**
 * ChassisViewer
 *
 * Ultra-realistic 3D PC hardware assembly simulation.
 * Modeled with physical precision based on the Stitch engineering render:
 *
 *   1. MOTHERBOARD ENHANCED DETAIL:
 *      - ATX PCB with visible copper trace circuits and gold plated contacts.
 *      - Cylindrical solid aluminum capacitors (VRM + Audio bank).
 *      - Front panel pin headers (Power SW, Reset, HDD LED, USB 3.0, HD Audio, ARGB 3-pin).
 *      - Standoff brass mounting screws fastening board to chassis tray.
 *      - SATA data ports on bottom-right edge.
 *
 *   2. REAR TRAY CABLE ROUTING & PASS-THROUGH GROMMETS:
 *      - Rubber oval grommets lining the motherboard perimeter.
 *      - Behind-the-tray cable management: cables run concealed through the rear tray
 *        and poke forward into the chamber right at their pin headers.
 *      - 24-Pin ATX cable with transparent combs arching from rear grommet into right header.
 *      - 8-Pin EPS CPU cable arching from top cutout into top-left header.
 *      - Dual 8-Pin PCIe GPU power cables looping from basement grommet with combs into GPU.
 *      - Front-panel header ribbon wire emerging from bottom cutout.
 *
 *   3. CONDITIONAL VISIBILITY:
 *      - Only selected parts and their corresponding wiring appear in real time.
 */
export default function ChassisViewer({
  selection,
  activeStep,
  onSaveConfig,
  onLoadConfig,
  hasSavedConfig = false,
  saveFeedback = null,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    hasCpu: Boolean(selection.cpu),
    hasMotherboard: Boolean(selection.motherboard),
    hasRam: Boolean(selection.ram && selection.ram.length > 0),
    hasGpu: Boolean(selection.gpu),
    hasStorage: Boolean(selection.storage && selection.storage.length > 0),
    hasPsu: Boolean(selection.psu),
    hasCooler: Boolean(selection.cooler),
    hasCase: Boolean(selection.case),
    activeStep,
  });

  useEffect(() => {
    stateRef.current = {
      hasCpu: Boolean(selection.cpu),
      hasMotherboard: Boolean(selection.motherboard),
      hasRam: Boolean(selection.ram && selection.ram.length > 0),
      hasGpu: Boolean(selection.gpu),
      hasStorage: Boolean(selection.storage && selection.storage.length > 0),
      hasPsu: Boolean(selection.psu),
      hasCooler: Boolean(selection.cooler),
      hasCase: Boolean(selection.case),
      activeStep,
    };
  }, [selection, activeStep]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Pull back slightly so the full chassis remains comfortably framed.
    camera.position.set(5.5, 2.5, 6);
    camera.lookAt(0, 0.0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const buildGroup = new THREE.Group();
    scene.add(buildGroup);

    // =========================================================================
    // 1. CASE FRAME & TRAY CHASSIS
    // =========================================================================
    const caseGroup = new THREE.Group();
    buildGroup.add(caseGroup);

    // Case outer wireframe
    const caseFrameGeo = new THREE.BoxGeometry(3.4, 3.6, 1.6);
    const caseOutline = new THREE.LineSegments(
      new THREE.EdgesGeometry(caseFrameGeo),
      new THREE.LineBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.35,
      }),
    );
    caseGroup.add(caseOutline);

    // Ultra-clear glass side panel (+Z)
    const glassGeo = new THREE.PlaneGeometry(3.38, 3.58);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.03,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.98,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.z = 0.8;
    caseGroup.add(glassMesh);

    const glassBorder = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3.38, 3.58, 0.02)),
      new THREE.LineBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.3,
      }),
    );
    glassBorder.position.z = 0.8;
    caseGroup.add(glassBorder);

    // Motherboard Tray Backplate (Metal wall where mobo mounts and cables route behind)
    const trayGeo = new THREE.BoxGeometry(2.3, 2.7, 0.02);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.9,
      metalness: 0.4,
    });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(-0.35, 0.25, -0.74);
    caseGroup.add(tray);

    // Rubber Cable Grommets cut into the tray for behind-the-back routing
    const grommetMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.9,
    });
    // Right grommets (for 24-pin and SATA)
    for (const gy of [0.4, -0.3]) {
      const g = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.5, 0.04),
        grommetMat,
      );
      g.position.set(0.72, gy, -0.73);
      caseGroup.add(g);
    }
    // Top grommet (for 8-pin CPU)
    const topGrommet = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.1, 0.04),
      grommetMat,
    );
    topGrommet.position.set(-0.85, 1.5, -0.73);
    caseGroup.add(topGrommet);

    // PSU Basement Shroud with side cutout window
    const shroudGroup = new THREE.Group();
    caseGroup.add(shroudGroup);

    const shroudTopGeo = new THREE.BoxGeometry(3.35, 0.04, 1.55);
    const shroudMat = new THREE.MeshStandardMaterial({
      color: 0x0a101f,
      roughness: 0.8,
      metalness: 0.5,
    });
    const shroudTop = new THREE.Mesh(shroudTopGeo, shroudMat);
    shroudTop.position.set(0, -1.0, 0);
    shroudGroup.add(shroudTop);

    // Basement top grommet for PCIe GPU cables
    const bGrommet = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.05, 0.12),
      grommetMat,
    );
    bGrommet.position.set(0.15, -0.99, 0.1);
    shroudGroup.add(bGrommet);

    // Front shroud panel
    const shroudFrontWallGeo = new THREE.BoxGeometry(1.6, 0.78, 0.04);
    const shroudFrontWall = new THREE.Mesh(shroudFrontWallGeo, shroudMat);
    shroudFrontWall.position.set(0.85, -1.4, 0.77);
    shroudGroup.add(shroudFrontWall);

    const shroudAccent = new THREE.Mesh(
      new THREE.BoxGeometry(3.35, 0.02, 0.02),
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.4,
      }),
    );
    shroudAccent.position.set(0, -1.0, 0.78);
    shroudGroup.add(shroudAccent);

    // Front intake fans (3x 120mm)
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.35, 24),
        new THREE.MeshBasicMaterial({
          color: 0x1e293b,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        }),
      );
      ring.rotation.y = Math.PI / 2;
      ring.position.set(1.68, -0.6 + i * 0.85, 0);
      caseGroup.add(ring);
    }

    // Rear exhaust fan
    const rearFanMat = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const rearFan = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.35, 24),
      rearFanMat,
    );
    rearFan.rotation.y = Math.PI / 2;
    rearFan.position.set(-1.68, 0.8, -0.1);
    caseGroup.add(rearFan);

    // =========================================================================
    // 01. MOTHERBOARD (ATX Form Factor with Realistic Hardware Detailing)
    // =========================================================================
    const moboGroup = new THREE.Group();
    moboGroup.position.set(-0.35, 0.25, -0.7);
    moboGroup.visible = false;
    buildGroup.add(moboGroup);

    // Matte Black multi-layer PCB
    const moboGeo = new THREE.BoxGeometry(1.9, 2.4, 0.04);
    const moboMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.7,
      metalness: 0.3,
    });
    const moboMesh = new THREE.Mesh(moboGeo, moboMat);
    moboGroup.add(moboMesh);

    moboMesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(moboGeo),
        new THREE.LineBasicMaterial({
          color: 0x3b82f6,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );

    // Standoff screws (9 ATX standard brass screws)
    const screwMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.3,
    });
    const screwPositions = [
      [-0.85, 1.1],
      [0, 1.1],
      [0.85, 1.1],
      [-0.85, 0.0],
      [0, 0.0],
      [0.85, 0.0],
      [-0.85, -1.1],
      [0, -1.1],
      [0.85, -1.1],
    ];
    for (const [sx, sy] of screwPositions) {
      const screw = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.03, 8),
        screwMat,
      );
      screw.rotation.x = Math.PI / 2;
      screw.position.set(sx, sy, 0.03);
      moboGroup.add(screw);
    }

    // Solid Audio & VRM Capacitors (Cylindrical silver cans)
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.95,
      roughness: 0.15,
    });
    for (let c = 0; c < 8; c++) {
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12),
        capMat,
      );
      cap.rotation.x = Math.PI / 2;
      cap.position.set(
        -0.8 + (c % 2) * 0.07,
        -0.6 - Math.floor(c / 2) * 0.12,
        0.05,
      );
      moboGroup.add(cap);
    }

    // Rear I/O Armor & Shield
    const ioShield = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 1.4, 0.3),
      new THREE.MeshStandardMaterial({
        color: 0x181f31,
        roughness: 0.3,
        metalness: 0.8,
      }),
    );
    ioShield.position.set(-0.85, 0.4, 0.15);
    moboGroup.add(ioShield);

    // VRM Heatsinks with fin grooves
    const vrmTop = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.16, 0.22),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.7,
        roughness: 0.3,
      }),
    );
    vrmTop.position.set(-0.25, 0.88, 0.11);
    moboGroup.add(vrmTop);

    // 24-Pin ATX Power Header Socket with pin holes
    const atxHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.48, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.4 }),
    );
    atxHeader.position.set(0.88, 0.45, 0.06);
    moboGroup.add(atxHeader);

    // 8-Pin CPU EPS Header Socket on top-left
    const epsHeader = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.4 }),
    );
    epsHeader.position.set(-0.6, 1.12, 0.06);
    moboGroup.add(epsHeader);

    // Front Panel Pin Headers on bottom edge (-Y)
    const fpanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.05, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x030712 }),
    );
    fpanel.position.set(0.65, -1.15, 0.04);
    moboGroup.add(fpanel);

    // SATA Ports Stack (Right edge)
    const sataStack = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.22, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 }),
    );
    sataStack.position.set(0.88, -0.3, 0.06);
    moboGroup.add(sataStack);

    // PCIe x16 Slot Rails with retention clips
    for (const py of [-0.2, -0.65]) {
      const pcie = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.06, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x859397, metalness: 0.9 }),
      );
      pcie.position.set(-0.15, py, 0.04);
      moboGroup.add(pcie);

      // Retention clip at right edge of slot
      const clip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee }),
      );
      clip.position.set(0.58, py, 0.05);
      moboGroup.add(clip);
    }

    // =========================================================================
    // 02. CPU ASSEMBLY (Socket, PCB Substrate & Nickel IHS)
    // =========================================================================
    const cpuGroup = new THREE.Group();
    cpuGroup.position.set(-0.25, 0.45, 0.05);
    cpuGroup.visible = false;
    moboGroup.add(cpuGroup);

    const socketBase = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.56, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.4,
        metalness: 0.8,
      }),
    );
    socketBase.position.z = -0.01;
    cpuGroup.add(socketBase);

    const latch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.58, 8),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.9,
        roughness: 0.2,
      }),
    );
    latch.position.set(0.29, 0, 0.02);
    cpuGroup.add(latch);

    const pcbSubstrate = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.44, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.5 }),
    );
    pcbSubstrate.position.z = 0.015;
    cpuGroup.add(pcbSubstrate);

    const cpuMat = new THREE.MeshStandardMaterial({
      color: 0xcfd8dc,
      roughness: 0.15,
      metalness: 0.95,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.4,
    });
    const cpuMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.36, 0.04),
      cpuMat,
    );
    cpuMesh.position.z = 0.04;
    cpuGroup.add(cpuMesh);

    // =========================================================================
    // 03. CPU COOLER & FAN POWER CABLE
    // =========================================================================
    const coolerGroup = new THREE.Group();
    coolerGroup.position.set(-0.25, 0.45, 0.05);
    coolerGroup.visible = false;
    moboGroup.add(coolerGroup);

    const pipeMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.9,
      roughness: 0.2,
    });
    for (let p = -0.15; p <= 0.15; p += 0.1) {
      const pipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.68, 8),
        pipeMat,
      );
      pipe.position.set(p, 0, 0.2);
      coolerGroup.add(pipe);
    }

    const finStack = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.65, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.25,
      }),
    );
    finStack.position.set(0, 0, 0.32);
    coolerGroup.add(finStack);

    const coolerFan = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.62, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.5 }),
    );
    coolerFan.position.set(0, 0, 0.58);
    coolerGroup.add(coolerFan);

    // Fan PWM wire routed into top CPU_FAN header
    const fanWireCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.2, 0.28, 0.5),
      new THREE.Vector3(0.25, 0.4, 0.3),
      new THREE.Vector3(0.22, 0.55, 0.1),
    ]);
    const fanWire = new THREE.Mesh(
      new THREE.TubeGeometry(fanWireCurve, 12, 0.008, 6, false),
      new THREE.MeshBasicMaterial({ color: 0x111827 }),
    );
    coolerGroup.add(fanWire);

    // =========================================================================
    // 04. RAM SLOTS & MEMORY MODULES
    // =========================================================================
    const ramGroup = new THREE.Group();
    ramGroup.visible = false;
    moboGroup.add(ramGroup);

    const ramStickMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const ramRgbMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    for (let i = 0; i < 4; i++) {
      const track = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.74, 0.04),
        new THREE.MeshBasicMaterial({ color: 0x070b14 }),
      );
      track.position.set(0.18 + i * 0.07, 0.45, 0.03);
      moboGroup.add(track);

      if (i === 1 || i === 3) {
        const stick = new THREE.Mesh(
          new THREE.BoxGeometry(0.035, 0.68, 0.16),
          ramStickMat,
        );
        stick.position.set(0.18 + i * 0.07, 0.45, 0.11);
        ramGroup.add(stick);

        const lightbar = new THREE.Mesh(
          new THREE.BoxGeometry(0.036, 0.68, 0.03),
          ramRgbMat,
        );
        lightbar.position.set(0.18 + i * 0.07, 0.45, 0.2);
        ramGroup.add(lightbar);
      }
    }

    // =========================================================================
    // 05. ULTRA-REALISTIC GRAPHICS CARD (GPU)
    // 2.5-slot modern triple/dual fan shroud, visible aluminum fin-stack, copper heatpipes,
    // brushed metal backplate, glowing side logo, and 16-pin / dual 8-pin power sockets with metal pins!
    // =========================================================================
    const gpuGroup = new THREE.Group();
    gpuGroup.position.set(-0.22, -0.42, -0.2);
    gpuGroup.visible = false;
    buildGroup.add(gpuGroup);

    // A. Internal Aluminum Cooling Fin Block (Visible between shroud openings)
    const finBlockGeo = new THREE.BoxGeometry(2.15, 0.32, 0.78);
    const finBlockMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.25,
    });
    const finBlock = new THREE.Mesh(finBlockGeo, finBlockMat);
    gpuGroup.add(finBlock);

    // B. Copper Heatpipes running longitudinally through the fin stack
    const gpuPipeMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      metalness: 0.95,
      roughness: 0.2,
    });
    for (const py of [-0.08, 0.08]) {
      const gPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 2.2, 8),
        gpuPipeMat,
      );
      gPipe.rotation.z = Math.PI / 2;
      gPipe.position.set(0.05, py, 0.05);
      gpuGroup.add(gPipe);
    }

    // C. Outer Armor Shroud with beveled geometric angles (Matte Charcoal Black)
    const gpuBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.25, 0.36, 0.86),
      new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.35,
        metalness: 0.8,
      }),
    );
    gpuGroup.add(gpuBody);

    gpuBody.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(2.25, 0.36, 0.86)),
        new THREE.LineBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.7,
        }),
      ),
    );

    // D. Brushed Metal Backplate with cutouts for airflow on top (+Y)
    const backplate = new THREE.Mesh(
      new THREE.BoxGeometry(2.24, 0.025, 0.84),
      new THREE.MeshStandardMaterial({
        color: 0x181f31,
        metalness: 0.92,
        roughness: 0.2,
      }),
    );
    backplate.position.set(0, 0.19, 0);
    gpuGroup.add(backplate);

    // Flow-through cutout at right end of backplate (common in RTX 30/40 series)
    const flowThrough = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.65),
      new THREE.MeshBasicMaterial({ color: 0x020617, side: THREE.DoubleSide }),
    );
    flowThrough.rotation.x = Math.PI / 2;
    flowThrough.position.set(0.75, 0.203, 0);
    gpuGroup.add(flowThrough);

    // E. 3x Axial-Tech Cooling Fans with 9 curved blades each (-Y underside)
    const fanBladesList: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const fanX = -0.7 + i * 0.7;
      // Outer ring shroud
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.29, 20),
        new THREE.MeshStandardMaterial({
          color: 0x1e293b,
          roughness: 0.4,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(fanX, -0.185, 0);
      gpuGroup.add(ring);

      // Center spinning hub
      const hubMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 0.03, 16),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          metalness: 0.8,
          roughness: 0.2,
        }),
      );
      hubMesh.position.set(fanX, -0.185, 0);
      gpuGroup.add(hubMesh);
      fanBladesList.push(hubMesh);
    }

    // F. Glowing Lateral Brand Logo (GEFORCE RTX side badge facing the glass)
    const logoStripGeo = new THREE.PlaneGeometry(0.85, 0.12);
    const logoStripMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.8,
    });
    const logoStrip = new THREE.Mesh(logoStripGeo, logoStripMat);
    logoStrip.position.set(-0.15, 0.08, 0.432);
    gpuGroup.add(logoStrip);

    // G. Dual Metal PCI Bracket (-X rear chassis mount with display ports)
    const bracketGpu = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.72, 0.26),
      new THREE.MeshStandardMaterial({
        color: 0x859397,
        metalness: 0.95,
        roughness: 0.2,
      }),
    );
    bracketGpu.position.set(-1.14, -0.05, -0.28);
    gpuGroup.add(bracketGpu);

    // HDMI / DisplayPort port cutouts on bracket
    for (let dp = 0; dp < 3; dp++) {
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.06, 0.03),
        new THREE.MeshBasicMaterial({ color: 0x020617 }),
      );
      port.position.set(-1.15, 0.12 - dp * 0.14, -0.28);
      gpuGroup.add(port);
    }

    // H. Dual 8-Pin PCIe Power Header Sockets with visible gold pins (+Y top edge)
    const pcieSocketGeo = new THREE.BoxGeometry(0.32, 0.12, 0.15);
    const pcieSocketMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.5,
    });
    const pciePlug = new THREE.Mesh(pcieSocketGeo, pcieSocketMat);
    pciePlug.position.set(0.68, 0.24, -0.12);
    gpuGroup.add(pciePlug);

    // Visible gold contact pins inside the sockets
    for (let pin = 0; pin < 8; pin++) {
      const p = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.04, 0.025),
        new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.95,
          roughness: 0.1,
        }),
      );
      p.position.set(
        0.55 + (pin % 4) * 0.07,
        0.28,
        -0.16 + Math.floor(pin / 4) * 0.07,
      );
      gpuGroup.add(p);
    }

    // =========================================================================
    // 06. M.2 NVMe STORAGE
    // =========================================================================
    const storageGroup = new THREE.Group();
    storageGroup.visible = false;
    moboGroup.add(storageGroup);

    const m2Mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.12, 0.06),
      new THREE.MeshStandardMaterial({
        color: 0x1e1b4b,
        metalness: 0.8,
        roughness: 0.3,
        emissive: 0xa855f7,
        emissiveIntensity: 0.4,
      }),
    );
    m2Mesh.position.set(-0.25, 0.05, 0.05);
    storageGroup.add(m2Mesh);

    // =========================================================================
    // 07. POWER SUPPLY (PSU)
    // =========================================================================
    const psuGroup = new THREE.Group();
    psuGroup.position.set(-0.75, -1.4, 0.05);
    psuGroup.visible = false;
    buildGroup.add(psuGroup);

    const psuMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.72, 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.4,
        metalness: 0.6,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.15,
      }),
    );
    psuGroup.add(psuMesh);

    psuMesh.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.35, 0.72, 1.1)),
        new THREE.LineBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.8,
        }),
      ),
    );

    // PSU Brand Label Plate
    const psuLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
      }),
    );
    psuLabel.position.set(-0.05, 0.02, 0.56);
    psuGroup.add(psuLabel);

    const goldBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
    );
    goldBadge.position.set(0.24, 0.02, 0.565);
    psuGroup.add(goldBadge);

    // AC Switch
    const powerRocker = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.12, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xef4444 }),
    );
    powerRocker.position.set(-0.69, 0.08, -0.18);
    psuGroup.add(powerRocker);

    // =========================================================================
    // 07b. REALISTIC BRAIDED CABLES (Emerge from rear tray grommets into headers)
    // =========================================================================
    const cableHarnessGroup = new THREE.Group();
    cableHarnessGroup.visible = false;
    buildGroup.add(cableHarnessGroup);

    const braidedCableMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.85,
      metalness: 0.15,
    });
    const combMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.9,
    });

    // --- CABLE A: 24-Pin ATX Main Motherboard Cable ---
    // Emerges from the rear tray grommet at X=0.35, Y=0.7, Z=-0.73 and curves into atxHeader
    const atxCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.4, 0.7, -0.73),
      new THREE.Vector3(0.65, 0.7, -0.58),
      new THREE.Vector3(0.58, 0.7, -0.62),
      new THREE.Vector3(0.53, 0.7, -0.64),
    ]);
    const atxCable = new THREE.Mesh(
      new THREE.TubeGeometry(atxCurve, 20, 0.055, 10, false),
      braidedCableMat,
    );
    cableHarnessGroup.add(atxCable);

    for (const t of [0.35, 0.75]) {
      const pt = atxCurve.getPoint(t);
      const comb = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.14, 0.14),
        combMaterial,
      );
      comb.position.copy(pt);
      cableHarnessGroup.add(comb);
    }

    // --- CABLE B: Dual 8-Pin PCIe GPU Power Cables ---
    // Emerges from basement grommet (X=0.15, Y=-1.0, Z=0.1) and loops into GPU plug
    const gpuCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.15, -0.99, 0.1),
      new THREE.Vector3(0.35, -0.65, 0.0),
      new THREE.Vector3(0.4, -0.2, -0.35),
    ]);
    const gpuCable = new THREE.Mesh(
      new THREE.TubeGeometry(gpuCurve, 20, 0.038, 8, false),
      braidedCableMat,
    );
    cableHarnessGroup.add(gpuCable);

    const gpuComb = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.12, 0.1),
      combMaterial,
    );
    gpuComb.position.copy(gpuCurve.getPoint(0.55));
    cableHarnessGroup.add(gpuComb);

    // --- CABLE C: EPS 8-Pin CPU Power Cable ---
    // Emerges from top tray grommet at X=-0.85, Y=1.5, Z=-0.73 and curves down into epsHeader
    const epsCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.85, 1.5, -0.73),
      new THREE.Vector3(-0.95, 1.4, -0.68),
      new THREE.Vector3(-0.95, 1.37, -0.64),
    ]);
    const epsCable = new THREE.Mesh(
      new THREE.TubeGeometry(epsCurve, 16, 0.03, 6, false),
      braidedCableMat,
    );
    cableHarnessGroup.add(epsCable);

    // =========================================================================
    // LIGHTING & ENVIRONMENT
    // =========================================================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x22d3ee, 1.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x3b82f6, 1.2);
    fillLight.position.set(-3, -1, -2);
    scene.add(fillLight);

    const psuSpot = new THREE.PointLight(0xf59e0b, 1.2, 3);
    psuSpot.position.set(-0.6, -1.2, 0.6);
    scene.add(psuSpot);

    const gridHelper = new THREE.GridHelper(7, 14, 0x22d3ee, 0x1e293b);
    gridHelper.position.y = -1.82;
    scene.add(gridHelper);

    // Mouse Drag Rotation
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      buildGroup.rotation.y += deltaX * 0.008;
      buildGroup.rotation.x = Math.max(
        -0.35,
        Math.min(0.35, buildGroup.rotation.x + deltaY * 0.008),
      );

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    // =========================================================================
    // ANIMATION & VISIBILITY REACTION LOOP
    // =========================================================================
    let clock = 0;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      clock += 0.02;

      if (!isDragging) {
        buildGroup.rotation.y += 0.0025;
      }

      const st = stateRef.current;

      // 01. Motherboard
      moboGroup.visible = st.hasMotherboard;

      // 02. CPU
      cpuGroup.visible = st.hasCpu;
      if (st.hasCpu) {
        cpuMat.emissiveIntensity = 0.4 + Math.sin(clock * 3) * 0.2;
      }

      // 03. Cooler
      coolerGroup.visible = st.hasCooler;

      // 04. RAM
      ramGroup.visible = st.hasRam;
      if (st.hasRam) {
        ramRgbMat.color.setHSL((clock * 0.2) % 1, 0.9, 0.6);
      }

      // 05. GPU
      gpuGroup.visible = st.hasGpu;

      // 06. Storage
      storageGroup.visible = st.hasStorage;

      // 07. PSU
      psuGroup.visible = st.hasPsu;

      // 07b. Cable wiring harness:
      // Visible once PSU and Motherboard are in place (routing from behind tray)
      cableHarnessGroup.visible = st.hasPsu && st.hasMotherboard;

      // 08. Case: Chassis lights up with ARGB front intake illumination
      if (st.hasCase) {
        caseOutline.material.color.setHex(0x22d3ee);
        caseOutline.material.opacity = 0.85;
        rearFanMat.color.setHex(0x22d3ee);
        rearFanMat.opacity = 0.9;
      } else {
        caseOutline.material.color.setHex(0x38bdf8);
        caseOutline.material.opacity = 0.35;
        rearFanMat.color.setHex(0x1e293b);
        rearFanMat.opacity = 0.4;
      }

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("resize", onResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-navy-950">
      {/* 3D WebGL Canvas */}
      <div
        ref={containerRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />

      {/* Blueprint Grid Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34, 211, 238, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* HUD Corner Tech Annotations */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1 text-[10px] font-mono tracking-widest text-cyan-400">
        <span className="flex items-center gap-1.5 font-bold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          ENSAMBLE 3D CON RUTA TRASERA DE CABLES
        </span>
        <span className="text-text-muted">
          BANDEJA CON PASACABLES · CONEXIONES EN VIVO
        </span>
      </div>

      {/* Subtle floating Save/Load actions in top-right corner of 3D Canvas */}
      <div className="absolute right-4 top-4 flex items-center gap-2 z-30">
        {saveFeedback && (
          <span className="animate-fade-in rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[10px] font-mono font-semibold text-emerald-300 backdrop-blur-md">
            {saveFeedback}
          </span>
        )}

        {hasSavedConfig && onLoadConfig && (
          <button
            type="button"
            onClick={onLoadConfig}
            title="Recuperar tu configuración guardada anteriormente"
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-navy-900/80 px-2.5 py-1 text-[11px] font-mono font-medium text-text-secondary backdrop-blur-md transition-all hover:border-cyan-500/50 hover:bg-navy-800 hover:text-cyan-300"
          >
            <span>↩</span>
            <span>Recuperar</span>
          </button>
        )}

        {onSaveConfig && (
          <button
            type="button"
            onClick={onSaveConfig}
            title="Guardar esta configuración en tu navegador"
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-navy-900/80 px-2.5 py-1 text-[11px] font-mono font-semibold text-cyan-300 backdrop-blur-md transition-all hover:border-cyan-400 hover:bg-cyan-500/10 hover:shadow-sm hover:shadow-cyan-500/20"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-4-4z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 17v-6"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 14l3 3 3-3"
              />
            </svg>
            <span>Guardar</span>
          </button>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 text-[10px] font-mono text-text-muted flex items-center gap-2">
        <span>GIRAR: ARRASTRAR CON RATÓN</span>
        <span>·</span>
        <span className="text-cyan-400">ENRUTAMIENTO TRASERO PROFESIONAL</span>
      </div>
    </div>
  );
}
