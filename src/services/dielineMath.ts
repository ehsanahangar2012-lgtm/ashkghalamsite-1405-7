export interface DielineCalculationResult {
  sheetWidth: number;
  sheetHeight: number;
  grossArea: number; // cm^2
  netArea: number; // cm^2
  wastePercentage: number;
  cutLength: number; // cm
  creaseLength: number; // cm
  cutLengthMm: number;
  creaseLengthMm: number;
  perforationLengthMm: number;
  glueTab?: number;
  tuck?: number;
  dustFlap?: number;
  isSmallBoxActive?: boolean;
  slotWidthMm?: number;
  bendAllowanceMm?: number;
}

export interface DielineEngineParams {
  L: number;
  W: number;
  H: number;
  glueTab?: number;
  tuck?: number;
  dustFlap?: number;
  x0?: number;
  variant?: 'standard' | 'reinforced' | 'eco' | string;
  thickness?: number;
  autoLockAngle?: number;
  autoLockGlueWidth?: number;
  bleedMm?: number;
  tuckStyle?: 'reverse' | 'straight';
  includePerforations?: boolean;
}

export interface DielineLabel {
  x: number;
  y: number;
  text: string;
  lineW?: number;
  lineH?: number;
}

export interface DielineEngineeringMetrics {
  cutLengthMm: number;
  creaseLengthMm: number;
  perforationLengthMm: number;
  glueAreaSqMm: number;
  netBlankAreaSqCm: number;
  grossBlankAreaSqCm: number;
  slotWidthMm: number;
  bendDeductionMm: number;
  flapCount: number;
  panelCount: number;
  isTwoPiece: boolean;
  hasLockingSlots: boolean;
  hasVentilation: boolean;
  hasTearStrip: boolean;
}

export interface DielineEngineResult {
  cuts: string[];
  creases: string[];
  glues: string[];
  bleeds: string[];
  perforations: string[];
  labels: DielineLabel[];
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  totalW: number;
  totalH: number;
  metrics?: DielineEngineeringMetrics;
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString();
const pt = (x: number, y: number): string => `${f(x)},${f(y)}`;

const getVariantMultipliers = (variant?: string) => {
  if (variant === 'reinforced') {
    return { glueMult: 1.25, tuckMult: 1.2, dustMult: 1.15 };
  }
  if (variant === 'eco') {
    return { glueMult: 0.85, tuckMult: 0.88, dustMult: 0.82 };
  }
  return { glueMult: 1, tuckMult: 1, dustMult: 1 };
};

// =========================================================================
// SVG VECTOR PATH LENGTH & BOUNDING EVALUATOR
// =========================================================================

export function measureSvgPathLengthMm(pathStr: string): number {
  if (!pathStr || typeof pathStr !== 'string') return 0;
  const tokens = pathStr.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) return 0;

  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let total = 0;

  const num = () => {
    if (i < tokens.length && !isNaN(Number(tokens[i]))) {
      return Number(tokens[i++]);
    }
    return 0;
  };

  while (i < tokens.length) {
    if (isNaN(Number(tokens[i]))) {
      cmd = tokens[i++];
    }
    switch (cmd) {
      case 'M': {
        cx = num();
        cy = num();
        sx = cx;
        sy = cy;
        cmd = 'L';
        break;
      }
      case 'm': {
        cx += num();
        cy += num();
        sx = cx;
        sy = cy;
        cmd = 'l';
        break;
      }
      case 'L': {
        const nx = num();
        const ny = num();
        total += Math.hypot(nx - cx, ny - cy);
        cx = nx;
        cy = ny;
        break;
      }
      case 'l': {
        const dx = num();
        const dy = num();
        total += Math.hypot(dx, dy);
        cx += dx;
        cy += dy;
        break;
      }
      case 'H': {
        const nx = num();
        total += Math.abs(nx - cx);
        cx = nx;
        break;
      }
      case 'V': {
        const ny = num();
        total += Math.abs(ny - cy);
        cy = ny;
        break;
      }
      case 'Q': {
        const qx = num();
        const qy = num();
        const nx = num();
        const ny = num();
        // Subdivide quadratic Bezier into 10 segments
        let px = cx;
        let py = cy;
        for (let s = 1; s <= 10; s++) {
          const t = s / 10;
          const u = 1 - t;
          const bx = u * u * cx + 2 * u * t * qx + t * t * nx;
          const by = u * u * cy + 2 * u * t * qy + t * t * ny;
          total += Math.hypot(bx - px, by - py);
          px = bx;
          py = by;
        }
        cx = nx;
        cy = ny;
        break;
      }
      case 'C': {
        const c1x = num();
        const c1y = num();
        const c2x = num();
        const c2y = num();
        const nx = num();
        const ny = num();
        let px = cx;
        let py = cy;
        for (let s = 1; s <= 12; s++) {
          const t = s / 12;
          const u = 1 - t;
          const bx = u * u * u * cx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * nx;
          const by = u * u * u * cy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ny;
          total += Math.hypot(bx - px, by - py);
          px = bx;
          py = by;
        }
        cx = nx;
        cy = ny;
        break;
      }
      case 'A': {
        const rx = Math.abs(num());
        const ry = Math.abs(num());
        num(); // x-axis-rotation
        num(); // large-arc
        num(); // sweep
        const nx = num();
        const ny = num();
        const chord = Math.hypot(nx - cx, ny - cy);
        // Accurate elliptical arc approximation via chord/radius ratio
        const r = Math.max(rx, ry, chord / 2);
        const arcApprox = chord > 0 && r > 0 ? 2 * r * Math.asin(Math.min(1, chord / (2 * r))) : chord;
        total += isFinite(arcApprox) ? arcApprox : chord;
        cx = nx;
        cy = ny;
        break;
      }
      case 'Z':
      case 'z': {
        total += Math.hypot(sx - cx, sy - cy);
        cx = sx;
        cy = sy;
        break;
      }
      default: {
        i++;
        break;
      }
    }
  }
  return total;
}

export function measurePathListLengthMm(paths: string[]): number {
  return Math.round(paths.reduce((acc, p) => acc + measureSvgPathLengthMm(p), 0));
}

function buildBleedRectPath(xMin: number, yMin: number, xMax: number, yMax: number, bleedMm: number): string {
  const b = Math.max(2, bleedMm);
  return `M ${pt(xMin - b, yMin - b)} L ${pt(xMax + b, yMin - b)} L ${pt(xMax + b, yMax + b)} L ${pt(xMin - b, yMax + b)} Z`;
}

// Helper for curved elliptical tuck flap with friction-lock shoulder slits
function buildTuckFlapGeometry(
  xLeft: number,
  xRight: number,
  yCrease: number,
  tuckDepth: number,
  dir: -1 | 1, // -1 = top upward, +1 = bottom downward
  thickness: number
) {
  const w = xRight - xLeft;
  const r = Math.max(4, Math.min(tuckDepth * 0.65, w * 0.22, 16));
  const yTip = yCrease + dir * tuckDepth;
  const yArcStart = yTip - dir * r;
  const shoulderSlit = Math.max(2.5, Math.min(5, w * 0.08));
  const slitCutOut = Math.max(0.8, thickness * 0.8);

  // Outer perimeter with smooth quadratic corners + friction-lock shoulder relief
  const cut = [
    `M ${pt(xLeft, yCrease)}`,
    `L ${pt(xLeft + shoulderSlit, yCrease)}`,
    `L ${pt(xLeft + shoulderSlit, yCrease + dir * slitCutOut)}`,
    `L ${pt(xLeft + slitCutOut, yCrease + dir * slitCutOut)}`,
    `L ${pt(xLeft + slitCutOut, yArcStart)}`,
    `Q ${pt(xLeft + slitCutOut, yTip)} ${pt(xLeft + r, yTip)}`,
    `L ${pt(xRight - r, yTip)}`,
    `Q ${pt(xRight - slitCutOut, yTip)} ${pt(xRight - slitCutOut, yArcStart)}`,
    `L ${pt(xRight - slitCutOut, yCrease + dir * slitCutOut)}`,
    `L ${pt(xRight - shoulderSlit, yCrease + dir * slitCutOut)}`,
    `L ${pt(xRight - shoulderSlit, yCrease)}`,
    `L ${pt(xRight, yCrease)}`,
  ].join(' ');

  // Crease along middle excluding friction lock slits
  const crease = `M ${pt(xLeft + shoulderSlit, yCrease)} L ${pt(xRight - shoulderSlit, yCrease)}`;
  return { cut, crease };
}

// =========================================================================
// 1. FEFCO 0200 / 0201 / 0203 (SLOTTED RSC / OPEN TOP / FOL) ENGINE
// =========================================================================
const createRscEngine = (flapRatioTop = 0.5, flapRatioBottom = 0.5, addTearStrip = false) => {
  return ({
    L,
    W,
    H,
    glueTab = 35,
    x0 = 50,
    thickness = 3.0,
    variant = 'standard',
    bleedMm = 4,
    includePerforations = true,
  }: DielineEngineParams): DielineEngineResult => {
    const mult = getVariantMultipliers(variant);
    const t = Math.max(0.4, thickness || 3.0);
    const G = Math.max(22, Math.round((glueTab || 35) * mult.glueMult));
    const slotW = t >= 1.2 ? Math.max(3.5, Math.min(9, t * 1.6)) : 2.2;
    const halfSlot = slotW / 2;

    // Outside-to-crease bend allowance on thick corrugated boards
    const bendAdj = t >= 1.2 ? t * 0.5 : 0;
    const topFlapH = flapRatioTop > 0 ? Math.max(20, W * flapRatioTop + bendAdj) : 0;
    const btmFlapH = flapRatioBottom > 0 ? Math.max(20, W * flapRatioBottom + bendAdj) : 0;

    const y0 = 40;
    const yTopCrease = y0 + topFlapH;
    const yBtmCrease = yTopCrease + H;
    const yBottom = yBtmCrease + btmFlapH;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const perforations: string[] = [];
    const labels: DielineLabel[] = [];

    const chamfer = Math.min(12, Math.max(5, G * 0.25));

    // Glue Tab outer perimeter with 14° beveled lead-in & glue zone hatch
    cuts.push(
      `M ${pt(xG, yTopCrease)} L ${pt(x0 + 3, yTopCrease + chamfer)} L ${pt(x0, yTopCrease + chamfer + 4)} L ${pt(x0, yBtmCrease - chamfer - 4)} L ${pt(x0 + 3, yBtmCrease - chamfer)} L ${pt(xG, yBtmCrease)}`
    );
    creases.push(`M ${pt(xG, yTopCrease)} L ${pt(xG, yBtmCrease)}`);

    // Glue hatch zone
    const gPad = 3;
    glues.push(
      `M ${pt(x0 + gPad, yTopCrease + chamfer + gPad)} L ${pt(xG - gPad, yTopCrease + gPad)} L ${pt(xG - gPad, yBtmCrease - gPad)} L ${pt(x0 + gPad, yBtmCrease - chamfer - gPad)} Z`
    );

    const panels = [
      { a: xG, b: xP1, isFirst: true, isLast: false },
      { a: xP1, b: xP2, isFirst: false, isLast: false },
      { a: xP2, b: xP3, isFirst: false, isLast: false },
      { a: xP3, b: xP4, isFirst: false, isLast: true },
    ];

    // Top Slotted Flaps with real die-cut V-relief slots
    if (topFlapH > 0) {
      panels.forEach((p) => {
        const lx = p.isFirst ? p.a : p.a + halfSlot;
        const rx = p.isLast ? p.b : p.b - halfSlot;
        const notchDepth = Math.min(4, t * 0.8);
        cuts.push(
          `M ${pt(p.a, yTopCrease)} L ${pt(lx, yTopCrease - notchDepth)} L ${pt(lx + 1.5, y0)} L ${pt(rx - 1.5, y0)} L ${pt(rx, yTopCrease - notchDepth)} L ${pt(p.b, yTopCrease)}`
        );
        creases.push(`M ${pt(lx, yTopCrease)} L ${pt(rx, yTopCrease)}`);
      });
    } else {
      cuts.push(`M ${pt(xG, yTopCrease)} L ${pt(xP4, yTopCrease)}`);
    }

    // Bottom Slotted Flaps
    if (btmFlapH > 0) {
      panels.forEach((p) => {
        const lx = p.isFirst ? p.a : p.a + halfSlot;
        const rx = p.isLast ? p.b : p.b - halfSlot;
        const notchDepth = Math.min(4, t * 0.8);
        cuts.push(
          `M ${pt(p.a, yBtmCrease)} L ${pt(lx, yBtmCrease + notchDepth)} L ${pt(lx + 1.5, yBottom)} L ${pt(rx - 1.5, yBottom)} L ${pt(rx, yBtmCrease + notchDepth)} L ${pt(p.b, yBtmCrease)}`
        );
        creases.push(`M ${pt(lx, yBtmCrease)} L ${pt(rx, yBtmCrease)}`);
      });
    } else {
      cuts.push(`M ${pt(xG, yBtmCrease)} L ${pt(xP4, yBtmCrease)}`);
    }

    // Right edge cut (with minor tuck-slot tongue extension on RSC)
    cuts.push(`M ${pt(xP4, yTopCrease)} L ${pt(xP4, yBtmCrease)}`);

    // Body Vertical Creases
    creases.push(`M ${pt(xP1, yTopCrease)} L ${pt(xP1, yBtmCrease)}`);
    creases.push(`M ${pt(xP2, yTopCrease)} L ${pt(xP2, yBtmCrease)}`);
    creases.push(`M ${pt(xP3, yTopCrease)} L ${pt(xP3, yBtmCrease)}`);

    // Optional easy-open tear strip perforation
    if ((addTearStrip || includePerforations) && H > 50) {
      const yTear = yTopCrease + Math.min(22, H * 0.22);
      perforations.push(`M ${pt(xG, yTear)} L ${pt(xP4, yTear)}`);
    }

    const yMid = (yTopCrease + yBtmCrease) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: `${Math.round(L)}mm`, lineW: L });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: `${Math.round(W)}mm`, lineW: W });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: `${Math.round(L)}mm`, lineW: L });
    labels.push({ x: (xP3 + xP4) / 2, y: yMid, text: `${Math.round(W)}mm`, lineW: W });
    labels.push({ x: (x0 + xG) / 2, y: yMid, text: `چسب ${Math.round(G)}` });
    labels.push({ x: xP1 + W / 2, y: yMid + 18, text: `H:${Math.round(H)}mm`, lineH: H });

    const bleeds = [buildBleedRectPath(x0, y0, xP4, yBottom, bleedMm)];

    return {
      cuts,
      creases,
      glues,
      bleeds,
      perforations,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBottom,
      totalW: xP4 - x0,
      totalH: yBottom - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: measurePathListLengthMm(perforations),
        glueAreaSqMm: Math.round(G * (H - chamfer)),
        netBlankAreaSqCm: Math.round(((2 * (L + W) * H + (topFlapH + btmFlapH) * 2 * (L + W)) / 100)),
        grossBlankAreaSqCm: Math.round(((xP4 - x0) * (yBottom - y0)) / 100),
        slotWidthMm: Number(slotW.toFixed(2)),
        bendDeductionMm: Number((t * 0.5).toFixed(2)),
        flapCount: (topFlapH > 0 ? 4 : 0) + (btmFlapH > 0 ? 4 : 0),
        panelCount: 4,
        isTwoPiece: false,
        hasLockingSlots: false,
        hasVentilation: false,
        hasTearStrip: perforations.length > 0,
      },
    };
  };
};

// =========================================================================
// 2. FEFCO 0427 / 0470 (ROLL END TUCK FRONT MAILER PRO) ENGINE
// =========================================================================
const createMailerEngine = (isTuckTabStyle = false) => {
  return ({
    L,
    W,
    H,
    tuck = 28,
    x0 = 50,
    thickness = 1.6,
    variant = 'standard',
    bleedMm = 4,
    includePerforations = true,
  }: DielineEngineParams): DielineEngineResult => {
    const mult = getVariantMultipliers(variant);
    const t = Math.max(0.8, thickness || 1.6);
    const T = Math.max(18, Math.round((tuck || 28) * mult.tuckMult));
    const slotW = Math.max(3.0, Math.min(6.5, t * 1.9));
    const y0 = 35;

    // Mailer vertical flow: Tuck(T) -> Lid(L) -> BackWall(H) -> Base(L) -> FrontOuter(H) -> FrontInnerRoll(H - t)
    const yTuck = y0;
    const yLid = yTuck + T;
    const yBack = yLid + L;
    const yBaseTop = yBack + H;
    const yBaseBtm = yBaseTop + L;
    const yFrontOuter = yBaseBtm + H;
    const yFrontInner = yFrontOuter + Math.max(15, H - t * 1.2);

    // Side double-wall roll wings
    const wingDepth = Math.max(15, H - t * 1.2);
    const xLWing = x0;
    const xLWall = xLWing + wingDepth;
    const xBodyL = xLWall + H;
    const xBodyR = xBodyL + W;
    const xRWall = xBodyR + H;
    const xRWing = xRWall + wingDepth;

    // Lid dust flaps & cherry lock ears
    const lidFlapW = Math.min(H * 0.85, Math.max(22, W * 0.25));
    const xLidFlapL = xBodyL - lidFlapW;
    const xLidFlapR = xBodyR + lidFlapW;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const perforations: string[] = [];
    const labels: DielineLabel[] = [];

    // 1. Curved Tuck Flap + Cherry-Lock Ear Tabs
    const r = Math.min(12, T * 0.48, W * 0.14);
    const earW = Math.min(10, Math.max(5, lidFlapW * 0.35));
    const earY = yLid - Math.min(14, T * 0.55);

    cuts.push(
      `M ${pt(xBodyL, yLid)} L ${pt(xBodyL - earW, yLid - 2)} L ${pt(xBodyL - earW, earY)} L ${pt(xBodyL + 2, yLid - T * 0.45)} L ${pt(xBodyL + 2, yTuck + r)} Q ${pt(xBodyL + 2, yTuck)} ${pt(xBodyL + r + 2, yTuck)} L ${pt(xBodyR - r - 2, yTuck)} Q ${pt(xBodyR - 2, yTuck)} ${pt(xBodyR - 2, yTuck + r)} L ${pt(xBodyR - 2, yLid - T * 0.45)} L ${pt(xBodyR + earW, earY)} L ${pt(xBodyR + earW, yLid - 2)} L ${pt(xBodyR, yLid)}`
    );
    creases.push(`M ${pt(xBodyL + 3, yLid)} L ${pt(xBodyR - 3, yLid)}`);

    // 2. Lid tapered dust wings along back-to-lid section
    const taperY = Math.min(12, L * 0.15);
    cuts.push(
      `M ${pt(xBodyL, yLid)} L ${pt(xLidFlapL + 6, yLid + taperY)} L ${pt(xLidFlapL, yBack - 4)} L ${pt(xBodyL, yBack)}`
    );
    cuts.push(
      `M ${pt(xBodyR, yLid)} L ${pt(xLidFlapR - 6, yLid + taperY)} L ${pt(xLidFlapR, yBack - 4)} L ${pt(xBodyR, yBack)}`
    );
    creases.push(`M ${pt(xBodyL, yLid)} L ${pt(xBodyL, yBack)}`);
    creases.push(`M ${pt(xBodyR, yLid)} L ${pt(xBodyR, yBack)}`);
    creases.push(`M ${pt(xBodyL, yBack)} L ${pt(xBodyR, yBack)}`);

    // 3. Back wall side slits & shoulder reliefs
    cuts.push(`M ${pt(xBodyL, yBack)} L ${pt(xBodyL, yBaseTop)}`);
    cuts.push(`M ${pt(xBodyR, yBack)} L ${pt(xBodyR, yBaseTop)}`);
    creases.push(`M ${pt(xBodyL, yBaseTop)} L ${pt(xBodyR, yBaseTop)}`);

    // 4. Double-wall Left & Right Roll Wings with Locking Tabs
    const tabLen = Math.min(28, L * 0.26);
    const tabD = Math.min(8, t * 4);
    const yTab1A = yBaseTop + L * 0.18;
    const yTab1B = yTab1A + tabLen;
    const yTab2B = yBaseBtm - L * 0.18;
    const yTab2A = yTab2B - tabLen;

    // Left Roll Wing with 2 locking tabs
    cuts.push(
      `M ${pt(xBodyL, yBaseTop)} L ${pt(xLWing + 6, yBaseTop + 3)} L ${pt(xLWing, yBaseTop + 8)} L ${pt(xLWing, yTab1A)} L ${pt(xLWing - tabD, yTab1A + 2)} L ${pt(xLWing - tabD, yTab1B - 2)} L ${pt(xLWing, yTab1B)} L ${pt(xLWing, yTab2A)} L ${pt(xLWing - tabD, yTab2A + 2)} L ${pt(xLWing - tabD, yTab2B - 2)} L ${pt(xLWing, yTab2B)} L ${pt(xLWing, yBaseBtm - 8)} L ${pt(xLWing + 6, yBaseBtm - 3)} L ${pt(xBodyL, yBaseBtm)}`
    );
    // Right Roll Wing with 2 locking tabs
    cuts.push(
      `M ${pt(xBodyR, yBaseTop)} L ${pt(xRWing - 6, yBaseTop + 3)} L ${pt(xRWing, yBaseTop + 8)} L ${pt(xRWing, yTab1A)} L ${pt(xRWing + tabD, yTab1A + 2)} L ${pt(xRWing + tabD, yTab1B - 2)} L ${pt(xRWing, yTab1B)} L ${pt(xRWing, yTab2A)} L ${pt(xRWing + tabD, yTab2A + 2)} L ${pt(xRWing + tabD, yTab2B - 2)} L ${pt(xRWing, yTab2B)} L ${pt(xRWing, yBaseBtm - 8)} L ${pt(xRWing - 6, yBaseBtm - 3)} L ${pt(xBodyR, yBaseBtm)}`
    );

    // Double score channels for 180-deg roll-over walls
    creases.push(`M ${pt(xBodyL, yBaseTop)} L ${pt(xBodyL, yBaseBtm)}`);
    creases.push(`M ${pt(xLWall, yBaseTop + 2)} L ${pt(xLWall, yBaseBtm - 2)}`);
    creases.push(`M ${pt(xLWall - t * 1.3, yBaseTop + 2)} L ${pt(xLWall - t * 1.3, yBaseBtm - 2)}`);
    creases.push(`M ${pt(xBodyR, yBaseTop)} L ${pt(xBodyR, yBaseBtm)}`);
    creases.push(`M ${pt(xRWall, yBaseTop + 2)} L ${pt(xRWall, yBaseBtm - 2)}`);
    creases.push(`M ${pt(xRWall + t * 1.3, yBaseTop + 2)} L ${pt(xRWall + t * 1.3, yBaseBtm - 2)}`);

    // Die-cut Locking Slots in Base Panel (where roll-over tabs lock!)
    const drawSlotRect = (sx: number, sy: number, sw: number, sh: number) =>
      `M ${pt(sx, sy)} L ${pt(sx + sw, sy)} L ${pt(sx + sw, sy + sh)} L ${pt(sx, sy + sh)} Z`;

    cuts.push(drawSlotRect(xBodyL + 1.5, yTab1A, slotW, tabLen));
    cuts.push(drawSlotRect(xBodyL + 1.5, yTab2A, slotW, tabLen));
    cuts.push(drawSlotRect(xBodyR - 1.5 - slotW, yTab1A, slotW, tabLen));
    cuts.push(drawSlotRect(xBodyR - 1.5 - slotW, yTab2A, slotW, tabLen));

    // 5. Front Wall + Roll-Over Locking Flap with Thumb Notch
    const fChamfer = 4;
    const thumbR = Math.min(16, Math.max(8, W * 0.08));
    const xMid = (xBodyL + xBodyR) / 2;
    cuts.push(
      `M ${pt(xBodyL, yBaseBtm)} L ${pt(xBodyL + 2, yFrontOuter)} L ${pt(xBodyL + fChamfer, yFrontInner)} L ${pt(xMid - thumbR, yFrontInner)} A ${f(thumbR)},${f(thumbR)} 0 0 1 ${pt(xMid + thumbR, yFrontInner)} L ${pt(xBodyR - fChamfer, yFrontInner)} L ${pt(xBodyR - 2, yFrontOuter)} L ${pt(xBodyR, yBaseBtm)}`
    );
    creases.push(`M ${pt(xBodyL, yBaseBtm)} L ${pt(xBodyR, yBaseBtm)}`);
    creases.push(`M ${pt(xBodyL + 2, yFrontOuter)} L ${pt(xBodyR - 2, yFrontOuter)}`);

    if (isTuckTabStyle) {
      // Extra front dust wings for FEFCO 0470
      cuts.push(`M ${pt(xBodyL, yBaseBtm)} L ${pt(xLidFlapL + 5, yBaseBtm + 5)} L ${pt(xLidFlapL + 5, yFrontOuter - 4)} L ${pt(xBodyL + 2, yFrontOuter)}`);
      cuts.push(`M ${pt(xBodyR, yBaseBtm)} L ${pt(xLidFlapR - 5, yBaseBtm + 5)} L ${pt(xLidFlapR - 5, yFrontOuter - 4)} L ${pt(xBodyR - 2, yFrontOuter)}`);
    }

    // Tear-strip perforation across front tuck zone for e-commerce unboxing
    if (includePerforations) {
      const yPerf = yLid + Math.min(18, L * 0.14);
      perforations.push(`M ${pt(xBodyL + 8, yPerf)} L ${pt(xBodyR - 8, yPerf)}`);
      perforations.push(`M ${pt(xBodyL + 8, yPerf + 7)} L ${pt(xBodyR - 8, yPerf + 7)}`);
    }

    const realXMin = Math.min(xLWing - tabD, xLidFlapL);
    const realXMax = Math.max(xRWing + tabD, xLidFlapR);

    labels.push({ x: xMid, y: (yBaseTop + yBaseBtm) / 2, text: `کفه ${Math.round(W)}×${Math.round(L)}`, lineW: W });
    labels.push({ x: xMid, y: (yLid + yBack) / 2, text: `درب ${Math.round(W)}×${Math.round(L)}` });
    labels.push({ x: xMid, y: (yBaseBtm + yFrontOuter) / 2, text: `دیواره H:${Math.round(H)}`, lineH: H });
    labels.push({ x: (xLWall + xBodyL) / 2, y: (yBaseTop + yBaseBtm) / 2, text: `${Math.round(H)}` });

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(realXMin, y0, realXMax, yFrontInner, bleedMm)],
      perforations,
      labels,
      xMin: realXMin,
      yMin: y0,
      xMax: realXMax,
      yMax: yFrontInner,
      totalW: realXMax - realXMin,
      totalH: yFrontInner - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: measurePathListLengthMm(perforations),
        glueAreaSqMm: 0, // Self-locking glue-free!
        netBlankAreaSqCm: Math.round(((L * W * 2 + (H * 4) * (W + L)) / 100)),
        grossBlankAreaSqCm: Math.round(((realXMax - realXMin) * (yFrontInner - y0)) / 100),
        slotWidthMm: Number(slotW.toFixed(2)),
        bendDeductionMm: Number((t * 0.5).toFixed(2)),
        flapCount: 6,
        panelCount: 6,
        isTwoPiece: false,
        hasLockingSlots: true,
        hasVentilation: false,
        hasTearStrip: perforations.length > 0,
      },
    };
  };
};

// =========================================================================
// 3. FEFCO 0426 (CLASSIC PIZZA BOX WITH STEAM VENTS & CORNER LOCKS)
// =========================================================================
const createPizzaBoxEngine = () => {
  return ({
    L,
    W,
    H,
    x0 = 60,
    thickness = 1.6,
    bleedMm = 4,
    includePerforations = true,
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(1.2, thickness || 1.6);
    const y0 = 35;
    const tuckWingH = Math.max(22, Math.min(45, H * 0.85));

    const yLidTop = y0;
    const yBackWallTop = yLidTop + L;
    const yBaseTop = yBackWallTop + H;
    const yBaseBtm = yBaseTop + L;
    const yFrontWallBtm = yBaseBtm + H;

    const xBaseL = x0 + H + 8;
    const xBaseR = xBaseL + W;
    const xLWall = xBaseL - H;
    const xRWall = xBaseR + H;
    const xLidWingL = xBaseL - tuckWingH;
    const xLidWingR = xBaseR + tuckWingH;

    const cuts: string[] = [];
    const creases: string[] = [];
    const perforations: string[] = [];
    const labels: DielineLabel[] = [];

    // Lid top edge with chamfered front tuck flap & tapered side tuck wings
    const lidFrontLip = Math.max(22, Math.min(38, H * 0.85));
    const yLidLip = y0 - lidFrontLip;
    const bevel = 10;

    cuts.push(
      `M ${pt(xBaseL, yLidTop)} L ${pt(xBaseL + bevel, yLidLip)} L ${pt(xBaseR - bevel, yLidLip)} L ${pt(xBaseR, yLidTop)}`
    );
    creases.push(`M ${pt(xBaseL, yLidTop)} L ${pt(xBaseR, yLidTop)}`);

    // Lid side tuck wings
    cuts.push(
      `M ${pt(xBaseL, yLidTop)} L ${pt(xLidWingL + 6, yLidTop + 8)} L ${pt(xLidWingL, yBackWallTop - 12)} L ${pt(xBaseL, yBackWallTop)}`
    );
    cuts.push(
      `M ${pt(xBaseR, yLidTop)} L ${pt(xLidWingR - 6, yLidTop + 8)} L ${pt(xLidWingR, yBackWallTop - 12)} L ${pt(xBaseR, yBackWallTop)}`
    );
    creases.push(`M ${pt(xBaseL, yLidTop)} L ${pt(xBaseL, yBackWallTop)}`);
    creases.push(`M ${pt(xBaseR, yLidTop)} L ${pt(xBaseR, yBackWallTop)}`);

    // Rear wall with 2 circular steam ventilation holes + corner relief
    cuts.push(`M ${pt(xBaseL, yBackWallTop)} L ${pt(xBaseL - 6, yBackWallTop)} L ${pt(xBaseL - 6, yBaseTop)} L ${pt(xBaseL, yBaseTop)}`);
    cuts.push(`M ${pt(xBaseR, yBackWallTop)} L ${pt(xBaseR + 6, yBackWallTop)} L ${pt(xBaseR + 6, yBaseTop)} L ${pt(xBaseR, yBaseTop)}`);
    creases.push(`M ${pt(xBaseL, yBackWallTop)} L ${pt(xBaseR, yBackWallTop)}`);
    creases.push(`M ${pt(xBaseL, yBaseTop)} L ${pt(xBaseR, yBaseTop)}`);

    // Steam ventilation cutouts (2 capsule/circle vents on rear wall)
    const drawCircleCut = (cx: number, cy: number, r: number) =>
      `M ${pt(cx - r, cy)} A ${f(r)},${f(r)} 0 1 0 ${pt(cx + r, cy)} A ${f(r)},${f(r)} 0 1 0 ${pt(cx - r, cy)} Z`;
    const ventR = Math.max(5, Math.min(9, H * 0.22));
    const ventY = (yBackWallTop + yBaseTop) / 2;
    cuts.push(drawCircleCut(xBaseL + W * 0.25, ventY, ventR));
    cuts.push(drawCircleCut(xBaseL + W * 0.75, ventY, ventR));

    // Base Side walls + 45-degree corner locking flaps
    const cornerFlapW = Math.max(24, H * 0.9);
    // Left side wall + rear & front corner lock tabs
    cuts.push(
      `M ${pt(xBaseL, yBaseTop)} L ${pt(xLWall + 4, yBaseTop)} L ${pt(xLWall, yBaseTop + 6)} L ${pt(xLWall, yBaseBtm - 6)} L ${pt(xLWall + 4, yBaseBtm)} L ${pt(xBaseL, yBaseBtm)}`
    );
    // Right side wall
    cuts.push(
      `M ${pt(xBaseR, yBaseTop)} L ${pt(xRWall - 4, yBaseTop)} L ${pt(xRWall, yBaseTop + 6)} L ${pt(xRWall, yBaseBtm - 6)} L ${pt(xRWall - 4, yBaseBtm)} L ${pt(xBaseR, yBaseBtm)}`
    );
    creases.push(`M ${pt(xBaseL, yBaseTop)} L ${pt(xBaseL, yBaseBtm)}`);
    creases.push(`M ${pt(xBaseR, yBaseTop)} L ${pt(xBaseR, yBaseBtm)}`);

    // Front Wall + 45° Corner Lock Ears
    cuts.push(
      `M ${pt(xBaseL, yBaseBtm)} L ${pt(xBaseL - cornerFlapW, yBaseBtm + 5)} L ${pt(xBaseL - cornerFlapW + 6, yFrontWallBtm - 3)} L ${pt(xBaseL, yFrontWallBtm)} L ${pt(xBaseR, yFrontWallBtm)} L ${pt(xBaseR + cornerFlapW - 6, yFrontWallBtm - 3)} L ${pt(xBaseR + cornerFlapW, yBaseBtm + 5)} L ${pt(xBaseR, yBaseBtm)}`
    );
    creases.push(`M ${pt(xBaseL, yBaseBtm)} L ${pt(xBaseR, yBaseBtm)}`);
    creases.push(`M ${pt(xBaseL, yBaseBtm)} L ${pt(xBaseL, yFrontWallBtm)}`);
    creases.push(`M ${pt(xBaseR, yBaseBtm)} L ${pt(xBaseR, yFrontWallBtm)}`);

    // Perforated lid easy-tear line
    if (includePerforations) {
      perforations.push(`M ${pt(xBaseL + 10, yBackWallTop - 2)} L ${pt(xBaseR - 10, yBackWallTop - 2)}`);
    }

    const xMin = Math.min(xLWall, xBaseL - cornerFlapW, xLidWingL);
    const xMax = Math.max(xRWall, xBaseR + cornerFlapW, xLidWingR);

    labels.push({ x: (xBaseL + xBaseR) / 2, y: (yBaseTop + yBaseBtm) / 2, text: `کفه پیتزا ${Math.round(W)}×${Math.round(L)}`, lineW: W });
    labels.push({ x: (xBaseL + xBaseR) / 2, y: (yLidTop + yBackWallTop) / 2, text: `درب ${Math.round(W)}×${Math.round(L)}` });
    labels.push({ x: (xBaseL + xBaseR) / 2, y: ventY - 10, text: `سوراخ تهویه بخار (Ø${Math.round(ventR * 2)})` });

    return {
      cuts,
      creases,
      glues: [],
      bleeds: [buildBleedRectPath(xMin, yLidLip, xMax, yFrontWallBtm, bleedMm)],
      perforations,
      labels,
      xMin,
      yMin: yLidLip,
      xMax,
      yMax: yFrontWallBtm,
      totalW: xMax - xMin,
      totalH: yFrontWallBtm - yLidLip,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: measurePathListLengthMm(perforations),
        glueAreaSqMm: 0,
        netBlankAreaSqCm: Math.round(((W * L * 2 + 2 * H * (W + L)) / 100)),
        grossBlankAreaSqCm: Math.round(((xMax - xMin) * (yFrontWallBtm - yLidLip)) / 100),
        slotWidthMm: Number((t * 1.5).toFixed(2)),
        bendDeductionMm: Number((t * 0.5).toFixed(2)),
        flapCount: 6,
        panelCount: 6,
        isTwoPiece: false,
        hasLockingSlots: true,
        hasVentilation: true,
        hasTearStrip: perforations.length > 0,
      },
    };
  };
};

// =========================================================================
// 4. FEFCO 0409 (FIVE-PANEL WRAP-AROUND BOOK / FRAME FOLDER)
// =========================================================================
const createWrapFolderEngine = () => {
  return ({
    L,
    W,
    H,
    x0 = 50,
    thickness = 1.6,
    bleedMm = 4,
    includePerforations = true,
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.8, thickness || 1.6);
    const y0 = 35;
    const spineScoreGap = Math.max(3, t * 1.8);
    const overlapFlap = Math.max(25, Math.min(W * 0.5, 45));

    const y1 = y0 + overlapFlap;
    const y2 = y1 + H;
    const y3 = y2 + W;
    const y4 = y3 + H;
    const y5 = y4 + W;

    const sideBumper = Math.max(22, H + 12);
    const xL = x0;
    const xBodyL = xL + sideBumper;
    const xBodyR = xBodyL + L;
    const xR = xBodyR + sideBumper;

    const cuts: string[] = [];
    const creases: string[] = [];
    const perforations: string[] = [];
    const labels: DielineLabel[] = [];

    // Top tuck-over + Multi-score variable height book wrap
    cuts.push(
      `M ${pt(xBodyL + 4, y0)} L ${pt(xBodyR - 4, y0)} L ${pt(xBodyR, y1)} L ${pt(xBodyR, y2)} L ${pt(xR - 5, y2 + 4)} L ${pt(xR, y2 + 10)} L ${pt(xR, y3 - 10)} L ${pt(xR - 5, y3 - 4)} L ${pt(xBodyR, y3)} L ${pt(xBodyR, y5)} L ${pt(xBodyL, y5)} L ${pt(xBodyL, y3)} L ${pt(xL + 5, y3 - 4)} L ${pt(xL, y3 - 10)} L ${pt(xL, y2 + 10)} L ${pt(xL + 5, y2 + 4)} L ${pt(xBodyL, y2)} L ${pt(xBodyL, y1)} Z`
    );

    // Multi-channel crease lines for variable wrap height
    [y1, y2, y3, y4].forEach((yc) => {
      creases.push(`M ${pt(xBodyL, yc)} L ${pt(xBodyR, yc)}`);
      if (H > 20) {
        creases.push(`M ${pt(xBodyL, yc + spineScoreGap)} L ${pt(xBodyR, yc + spineScoreGap)}`);
      }
    });
    creases.push(`M ${pt(xBodyL, y2)} L ${pt(xBodyL, y3)}`);
    creases.push(`M ${pt(xBodyR, y2)} L ${pt(xBodyR, y3)}`);
    creases.push(`M ${pt(xL + sideBumper * 0.45, y2 + 4)} L ${pt(xL + sideBumper * 0.45, y3 - 4)}`);
    creases.push(`M ${pt(xR - sideBumper * 0.45, y2 + 4)} L ${pt(xR - sideBumper * 0.45, y3 - 4)}`);

    if (includePerforations) {
      perforations.push(`M ${pt(xBodyL + 6, y1 - 8)} L ${pt(xBodyR - 6, y1 - 8)}`);
    }

    labels.push({ x: (xBodyL + xBodyR) / 2, y: (y2 + y3) / 2, text: `بدنه لفاف ${Math.round(L)}×${Math.round(W)}`, lineW: L });
    labels.push({ x: (xBodyL + xBodyR) / 2, y: (y4 + y5) / 2, text: `پنل رویه ${Math.round(L)}×${Math.round(W)}` });

    return {
      cuts,
      creases,
      glues: [],
      bleeds: [buildBleedRectPath(xL, y0, xR, y5, bleedMm)],
      perforations,
      labels,
      xMin: xL,
      yMin: y0,
      xMax: xR,
      yMax: y5,
      totalW: xR - xL,
      totalH: y5 - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: measurePathListLengthMm(perforations),
        glueAreaSqMm: 0,
        netBlankAreaSqCm: Math.round(((L * W * 2 + sideBumper * 2 * W) / 100)),
        grossBlankAreaSqCm: Math.round(((xR - xL) * (y5 - y0)) / 100),
        slotWidthMm: Number(spineScoreGap.toFixed(2)),
        bendDeductionMm: Number((t * 0.5).toFixed(2)),
        flapCount: 4,
        panelCount: 5,
        isTwoPiece: false,
        hasLockingSlots: false,
        hasVentilation: false,
        hasTearStrip: perforations.length > 0,
      },
    };
  };
};

// =========================================================================
// 5. ECMA A20.20 / ECMA A30 (FOLDING CARTON TUCK END + EURO HANG SLOT)
// =========================================================================
const createTuckEndEngine = (withEuroHangSlot = false) => {
  return ({
    L,
    W,
    H,
    glueTab = 15,
    tuck = 20,
    dustFlap = 15,
    x0 = 50,
    thickness = 0.42,
    variant = 'standard',
    bleedMm = 3,
    tuckStyle = 'reverse',
  }: DielineEngineParams): DielineEngineResult => {
    const mult = getVariantMultipliers(variant);
    const t = Math.max(0.25, thickness || 0.42);
    const G = Math.max(11, Math.round((glueTab || 15) * mult.glueMult));
    const T = Math.max(14, Math.round((tuck || 20) * mult.tuckMult));
    const DF = Math.max(12, Math.round(Math.min(W * 0.65, (dustFlap || 15) * mult.dustMult)));

    const euroH = withEuroHangSlot ? Math.max(24, Math.min(34, W * 0.7)) : 0;
    const y0 = 35;
    const yTopTuck = y0 + euroH;
    const yTopFlap = yTopTuck + T;
    const yBodyTop = yTopFlap + W;
    const yBodyBtm = yBodyTop + H;
    const yBtmFlap = yBodyBtm + W;
    const yBtmTuck = yBtmFlap + T;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const perforations: string[] = [];
    const labels: DielineLabel[] = [];

    // 1. Chamfered Glue Tab + Glue Zone Hatch
    const bevel = Math.min(8, Math.max(3, G * 0.35));
    cuts.push(
      `M ${pt(xG, yBodyTop)} L ${pt(x0 + 2, yBodyTop + bevel)} L ${pt(x0, yBodyTop + bevel + 2)} L ${pt(x0, yBodyBtm - bevel - 2)} L ${pt(x0 + 2, yBodyBtm - bevel)} L ${pt(xG, yBodyBtm)}`
    );
    creases.push(`M ${pt(xG, yBodyTop)} L ${pt(xG, yBodyBtm)}`);
    glues.push(
      `M ${pt(x0 + 2.5, yBodyTop + bevel + 2)} L ${pt(xG - 2, yBodyTop + 2)} L ${pt(xG - 2, yBodyBtm - 2)} L ${pt(x0 + 2.5, yBodyBtm - bevel - 2)} Z`
    );

    // 2. Top Panel: Panel 1 (or Euro Hang Header on Panel 3)
    const topTuck = buildTuckFlapGeometry(xG, xP1, yTopFlap, T, -1, t);
    cuts.push(`M ${pt(xG, yBodyTop)} L ${pt(xG, yTopFlap)}`);
    cuts.push(topTuck.cut);
    cuts.push(`M ${pt(xP1, yTopFlap)} L ${pt(xP1, yBodyTop)}`);
    creases.push(`M ${pt(xG, yBodyTop)} L ${pt(xP1, yBodyTop)}`);
    creases.push(topTuck.crease);

    // Helper for anti-snag tapered trapezoidal Dust Flap with corner relief
    const drawDustFlap = (xa: number, xb: number, yBase: number, dir: -1 | 1) => {
      const dfW = xb - xa;
      const taperIn = Math.min(5, dfW * 0.14);
      const yEdge = yBase + dir * DF;
      const relief = Math.min(2.5, DF * 0.16);
      cuts.push(
        `M ${pt(xa, yBase)} L ${pt(xa + 1.2, yBase + dir * relief)} L ${pt(xa + taperIn, yEdge)} L ${pt(xb - taperIn * 1.4, yEdge)} L ${pt(xb - 1.2, yBase + dir * relief)} L ${pt(xb, yBase)}`
      );
      creases.push(`M ${pt(xa + 1, yBase)} L ${pt(xb - 1, yBase)}`);
    };

    // Top Dust Flaps (Panel 2 & Panel 4)
    drawDustFlap(xP1, xP2, yBodyTop, -1);
    drawDustFlap(xP3, xP4, yBodyTop, -1);

    // Panel 3 Top: Either Half-Moon Thumb Notch OR Euro-Slot Hang Tab (ecma-a30)
    if (withEuroHangSlot) {
      const xHangMid = (xP2 + xP3) / 2;
      const yHangTop = yBodyTop - euroH;
      cuts.push(
        `M ${pt(xP2, yBodyTop)} L ${pt(xP2 + 3, yHangTop + 4)} Q ${pt(xP2 + 3, yHangTop)} ${pt(xP2 + 8, yHangTop)} L ${pt(xP3 - 8, yHangTop)} Q ${pt(xP3 - 3, yHangTop)} ${pt(xP3 - 3, yHangTop + 4)} L ${pt(xP3, yBodyTop)}`
      );
      creases.push(`M ${pt(xP2, yBodyTop)} L ${pt(xP3, yBodyTop)}`);
      // Euro-slot Sombrero cutout inside hang header
      const sw = Math.min(28, L * 0.52);
      const sh = 7;
      const ySlot = yBodyTop - euroH * 0.55;
      cuts.push(
        `M ${pt(xHangMid - sw / 2, ySlot)} L ${pt(xHangMid - 5, ySlot)} A 5,5 0 0 1 ${pt(xHangMid + 5, ySlot)} L ${pt(xHangMid + sw / 2, ySlot)} A ${f(sh / 2)},${f(sh / 2)} 0 0 1 ${pt(xHangMid + sw / 2, ySlot + sh)} L ${pt(xHangMid - sw / 2, ySlot + sh)} A ${f(sh / 2)},${f(sh / 2)} 0 0 1 ${pt(xHangMid - sw / 2, ySlot)} Z`
      );
    } else {
      // Half-moon thumb notch on Panel 3 top opening edge
      const xThumb = (xP2 + xP3) / 2;
      const rThumb = Math.min(10, Math.max(5, L * 0.12));
      cuts.push(
        `M ${pt(xP2, yBodyTop)} L ${pt(xThumb - rThumb, yBodyTop)} A ${f(rThumb)},${f(rThumb)} 0 0 0 ${pt(xThumb + rThumb, yBodyTop)} L ${pt(xP3, yBodyTop)}`
      );
    }

    // 3. Bottom Flaps (Reverse Tuck: Panel 3, Straight Tuck: Panel 1)
    const btmTuckOnP1 = tuckStyle === 'straight';
    if (btmTuckOnP1) {
      const btmTuck = buildTuckFlapGeometry(xG, xP1, yBtmFlap, T, 1, t);
      cuts.push(`M ${pt(xG, yBodyBtm)} L ${pt(xG, yBtmFlap)}`);
      cuts.push(btmTuck.cut);
      cuts.push(`M ${pt(xP1, yBtmFlap)} L ${pt(xP1, yBodyBtm)}`);
      creases.push(`M ${pt(xG, yBodyBtm)} L ${pt(xP1, yBodyBtm)}`);
      creases.push(btmTuck.crease);
      cuts.push(`M ${pt(xP2, yBodyBtm)} L ${pt(xP3, yBodyBtm)}`);
    } else {
      // Reverse Tuck (standard pharmaceutical/cosmetic carton)
      const xThumbB = (xG + xP1) / 2;
      const rThumbB = Math.min(10, Math.max(5, L * 0.12));
      cuts.push(
        `M ${pt(xG, yBodyBtm)} L ${pt(xThumbB - rThumbB, yBodyBtm)} A ${f(rThumbB)},${f(rThumbB)} 0 0 0 ${pt(xThumbB + rThumbB, yBodyBtm)} L ${pt(xP1, yBodyBtm)}`
      );
      const btmTuck = buildTuckFlapGeometry(xP2, xP3, yBtmFlap, T, 1, t);
      cuts.push(`M ${pt(xP2, yBodyBtm)} L ${pt(xP2, yBtmFlap)}`);
      cuts.push(btmTuck.cut);
      cuts.push(`M ${pt(xP3, yBtmFlap)} L ${pt(xP3, yBodyBtm)}`);
      creases.push(`M ${pt(xP2, yBodyBtm)} L ${pt(xP3, yBodyBtm)}`);
      creases.push(btmTuck.crease);
    }

    drawDustFlap(xP1, xP2, yBodyBtm, 1);
    drawDustFlap(xP3, xP4, yBodyBtm, 1);

    // Right perimeter cut + body vertical creases
    cuts.push(`M ${pt(xP4, yBodyTop)} L ${pt(xP4, yBodyBtm)}`);
    creases.push(`M ${pt(xP1, yBodyTop)} L ${pt(xP1, yBodyBtm)}`);
    creases.push(`M ${pt(xP2, yBodyTop)} L ${pt(xP2, yBodyBtm)}`);
    creases.push(`M ${pt(xP3, yBodyTop)} L ${pt(xP3, yBodyBtm)}`);

    const actualYMin = withEuroHangSlot ? Math.min(yTopTuck, yBodyTop - euroH) : yTopTuck;
    const yMid = (yBodyTop + yBodyBtm) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: `${Math.round(L)}mm`, lineW: L });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: `${Math.round(W)}mm`, lineW: W });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: `H:${Math.round(H)}`, lineH: H });
    labels.push({ x: (x0 + xG) / 2, y: yMid, text: `${Math.round(G)}` });

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, actualYMin, xP4, yBtmTuck, bleedMm)],
      perforations,
      labels,
      xMin: x0,
      yMin: actualYMin,
      xMax: xP4,
      yMax: yBtmTuck,
      totalW: xP4 - x0,
      totalH: yBtmTuck - actualYMin,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: 0,
        glueAreaSqMm: Math.round(G * (H - bevel)),
        netBlankAreaSqCm: Math.round(((2 * (L + W) * H + 2 * L * (W + T) + 4 * W * DF) / 100)),
        grossBlankAreaSqCm: Math.round(((xP4 - x0) * (yBtmTuck - actualYMin)) / 100),
        slotWidthMm: Number(Math.max(0.71, t * 1.1).toFixed(2)),
        bendDeductionMm: Number((t * 0.42).toFixed(2)),
        flapCount: 6,
        panelCount: 4,
        isTwoPiece: false,
        hasLockingSlots: true,
        hasVentilation: false,
        hasTearStrip: false,
      },
    };
  };
};

// =========================================================================
// 6. ECMA A2110 / FEFCO 0711 (TRUE 1-2-3 SNAP LOCK BOTTOM)
// =========================================================================
const createSnapLock123Engine = () => {
  return ({
    L,
    W,
    H,
    glueTab = 16,
    tuck = 20,
    dustFlap = 16,
    x0 = 50,
    thickness = 0.42,
    variant = 'standard',
    bleedMm = 3,
  }: DielineEngineParams): DielineEngineResult => {
    const mult = getVariantMultipliers(variant);
    const t = Math.max(0.25, thickness || 0.42);
    const G = Math.max(12, Math.round((glueTab || 16) * mult.glueMult));
    const T = Math.max(14, Math.round((tuck || 20) * mult.tuckMult));
    const DF = Math.max(12, Math.round(Math.min(W * 0.65, (dustFlap || 16) * mult.dustMult)));

    const y0 = 35;
    const yTopTuck = y0;
    const yTopFlap = yTopTuck + T;
    const yBodyTop = yTopFlap + W;
    const yBodyBtm = yBodyTop + H;

    // 1-2-3 Snap Lock Bottom heights
    const maleLockH = Math.max(20, W * 0.62);
    const sideWingH = Math.max(18, W * 0.52);
    const femalePocketH = Math.max(20, W * 0.56);
    const yBottomMax = yBodyBtm + Math.max(maleLockH, sideWingH, femalePocketH);

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const labels: DielineLabel[] = [];

    const bevel = Math.min(8, Math.max(3, G * 0.35));
    cuts.push(
      `M ${pt(xG, yBodyTop)} L ${pt(x0 + 2, yBodyTop + bevel)} L ${pt(x0, yBodyTop + bevel + 2)} L ${pt(x0, yBodyBtm - bevel - 2)} L ${pt(x0 + 2, yBodyBtm - bevel)} L ${pt(xG, yBodyBtm)}`
    );
    creases.push(`M ${pt(xG, yBodyTop)} L ${pt(xG, yBodyBtm)}`);
    glues.push(
      `M ${pt(x0 + 2.5, yBodyTop + bevel + 2)} L ${pt(xG - 2, yBodyTop + 2)} L ${pt(xG - 2, yBodyBtm - 2)} L ${pt(x0 + 2.5, yBodyBtm - bevel - 2)} Z`
    );

    // Top Tuck End + Dust Flaps + Thumb Notch
    const topTuck = buildTuckFlapGeometry(xG, xP1, yTopFlap, T, -1, t);
    cuts.push(`M ${pt(xG, yBodyTop)} L ${pt(xG, yTopFlap)}`);
    cuts.push(topTuck.cut);
    cuts.push(`M ${pt(xP1, yTopFlap)} L ${pt(xP1, yBodyTop)}`);
    creases.push(`M ${pt(xG, yBodyTop)} L ${pt(xP1, yBodyTop)}`);
    creases.push(topTuck.crease);

    const drawTopDust = (xa: number, xb: number) => {
      const taperIn = Math.min(5, (xb - xa) * 0.14);
      cuts.push(
        `M ${pt(xa, yBodyTop)} L ${pt(xa + 1, yBodyTop - 2)} L ${pt(xa + taperIn, yBodyTop - DF)} L ${pt(xb - taperIn * 1.3, yBodyTop - DF)} L ${pt(xb - 1, yBodyTop - 2)} L ${pt(xb, yBodyTop)}`
      );
      creases.push(`M ${pt(xa + 1, yBodyTop)} L ${pt(xb - 1, yBodyTop)}`);
    };
    drawTopDust(xP1, xP2);
    drawTopDust(xP3, xP4);

    const xThumb = (xP2 + xP3) / 2;
    const rThumb = Math.min(10, Math.max(5, L * 0.12));
    cuts.push(
      `M ${pt(xP2, yBodyTop)} L ${pt(xThumb - rThumb, yBodyTop)} A ${f(rThumb)},${f(rThumb)} 0 0 0 ${pt(xThumb + rThumb, yBodyTop)} L ${pt(xP3, yBodyTop)}`
    );

    // --- AUTHENTIC 1-2-3 SNAP-LOCK BOTTOM ---
    // Panel 1: Male Locking Flap with Central Hook Tongue
    const p1Mid = (xG + xP1) / 2;
    const tongueW = Math.max(18, L * 0.42);
    const stepY = yBodyBtm + W * 0.44;
    const tipY = yBodyBtm + maleLockH;
    cuts.push(
      `M ${pt(xG, yBodyBtm)} L ${pt(xG + 2, stepY)} L ${pt(p1Mid - tongueW / 2 - 4, stepY)} L ${pt(p1Mid - tongueW / 2, tipY)} L ${pt(p1Mid + tongueW / 2, tipY)} L ${pt(p1Mid + tongueW / 2 + 4, stepY)} L ${pt(xP1 - 2, stepY)} L ${pt(xP1, yBodyBtm)}`
    );
    creases.push(`M ${pt(xG, yBodyBtm)} L ${pt(xP1, yBodyBtm)}`);

    // Panel 2 & 4: Chamfered Side Wing Flaps (45-deg locking shoulders)
    const drawSideWing = (xa: number, xb: number) => {
      const shoulder = (xb - xa) * 0.25;
      cuts.push(
        `M ${pt(xa, yBodyBtm)} L ${pt(xa + 1.5, yBodyBtm + sideWingH * 0.65)} L ${pt(xa + shoulder, yBodyBtm + sideWingH)} L ${pt(xb - shoulder, yBodyBtm + sideWingH)} L ${pt(xb - 1.5, yBodyBtm + sideWingH * 0.65)} L ${pt(xb, yBodyBtm)}`
      );
      creases.push(`M ${pt(xa + 1, yBodyBtm)} L ${pt(xb - 1, yBodyBtm)}`);
    };
    drawSideWing(xP1, xP2);
    drawSideWing(xP3, xP4);

    // Panel 3: Female Crescent Pocket Flap
    const p3Mid = (xP2 + xP3) / 2;
    const recW = tongueW * 0.92;
    const yFemTip = yBodyBtm + femalePocketH;
    const yPocketDip = yBodyBtm + W * 0.36;
    cuts.push(
      `M ${pt(xP2, yBodyBtm)} L ${pt(xP2 + 3, yFemTip)} L ${pt(p3Mid - recW / 2, yFemTip)} Q ${pt(p3Mid, yPocketDip)} ${pt(p3Mid + recW / 2, yFemTip)} L ${pt(xP3 - 3, yFemTip)} L ${pt(xP3, yBodyBtm)}`
    );
    creases.push(`M ${pt(xP2, yBodyBtm)} L ${pt(xP3, yBodyBtm)}`);

    // Vertical cuts & creases
    cuts.push(`M ${pt(xP4, yBodyTop)} L ${pt(xP4, yBodyBtm)}`);
    creases.push(`M ${pt(xP1, yBodyTop)} L ${pt(xP1, yBodyBtm)}`);
    creases.push(`M ${pt(xP2, yBodyTop)} L ${pt(xP2, yBodyBtm)}`);
    creases.push(`M ${pt(xP3, yBodyTop)} L ${pt(xP3, yBodyBtm)}`);

    const yMid = (yBodyTop + yBodyBtm) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: `${Math.round(L)}mm`, lineW: L });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: `${Math.round(W)}mm`, lineW: W });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: `H:${Math.round(H)}`, lineH: H });
    labels.push({ x: (xP2 + xP3) / 2, y: yBodyBtm + femalePocketH * 0.6, text: 'قفل ۱-۲-۳' });

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, y0, xP4, yBottomMax, bleedMm)],
      perforations: [],
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBottomMax,
      totalW: xP4 - x0,
      totalH: yBottomMax - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: 0,
        glueAreaSqMm: Math.round(G * (H - bevel)),
        netBlankAreaSqCm: Math.round(((2 * (L + W) * H + L * (W + T) + 2 * W * DF + 2 * L * femalePocketH) / 100)),
        grossBlankAreaSqCm: Math.round(((xP4 - x0) * (yBottomMax - y0)) / 100),
        slotWidthMm: Number(Math.max(0.71, t * 1.1).toFixed(2)),
        bendDeductionMm: Number((t * 0.42).toFixed(2)),
        flapCount: 7,
        panelCount: 4,
        isTwoPiece: false,
        hasLockingSlots: true,
        hasVentilation: false,
        hasTearStrip: false,
      },
    };
  };
};

// =========================================================================
// 7. FEFCO 0215 / 0713 (AUTO-LOCK CRASH BOTTOM WITH 45° GLUE FOLDS)
// =========================================================================
const createCrashLockEngine = (isSlottedTop = false) => {
  return ({
    L,
    W,
    H,
    glueTab = 18,
    tuck = 22,
    dustFlap = 16,
    x0 = 50,
    thickness = 0.5,
    variant = 'standard',
    autoLockAngle = 45,
    autoLockGlueWidth = 18,
    bleedMm = 4,
    includePerforations = false,
  }: DielineEngineParams): DielineEngineResult => {
    const mult = getVariantMultipliers(variant);
    const t = Math.max(0.35, thickness || 0.5);
    const G = Math.max(14, Math.round((glueTab || 18) * mult.glueMult));
    const T = Math.max(16, Math.round((tuck || 22) * mult.tuckMult));
    const DF = Math.max(14, Math.round(Math.min(W * 0.65, (dustFlap || 16) * mult.dustMult)));

    const y0 = 35;
    const yTopTuck = y0;
    const yTopFlap = isSlottedTop ? y0 : yTopTuck + T;
    const yBodyTop = isSlottedTop ? y0 + W * 0.5 : yTopFlap + W;
    const yBodyBtm = yBodyTop + H;

    // Crash lock bottom flap depth = W/2 + hook allowance (constrained strictly)
    const angleRad = (Math.max(35, Math.min(55, autoLockAngle || 45)) * Math.PI) / 180;
    const btmDepth = Math.max(22, W * 0.62);
    const yBtmMax = yBodyBtm + btmDepth;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const perforations: string[] = [];
    const labels: DielineLabel[] = [];

    const bevel = Math.min(8, Math.max(3, G * 0.35));
    cuts.push(
      `M ${pt(xG, yBodyTop)} L ${pt(x0 + 2, yBodyTop + bevel)} L ${pt(x0, yBodyTop + bevel + 2)} L ${pt(x0, yBodyBtm - bevel - 2)} L ${pt(x0 + 2, yBodyBtm - bevel)} L ${pt(xG, yBodyBtm)}`
    );
    creases.push(`M ${pt(xG, yBodyTop)} L ${pt(xG, yBodyBtm)}`);
    glues.push(
      `M ${pt(x0 + 2.5, yBodyTop + bevel + 2)} L ${pt(xG - 2, yBodyTop + 2)} L ${pt(xG - 2, yBodyBtm - 2)} L ${pt(x0 + 2.5, yBodyBtm - bevel - 2)} Z`
    );

    // Top configuration
    if (isSlottedTop) {
      const slotW = t >= 1.2 ? Math.max(3.5, t * 1.6) : 2.2;
      const hs = slotW / 2;
      [
        { a: xG, b: xP1, first: true, last: false },
        { a: xP1, b: xP2, first: false, last: false },
        { a: xP2, b: xP3, first: false, last: false },
        { a: xP3, b: xP4, first: false, last: true },
      ].forEach((p) => {
        const lx = p.first ? p.a : p.a + hs;
        const rx = p.last ? p.b : p.b - hs;
        cuts.push(`M ${pt(p.a, yBodyTop)} L ${pt(lx, yBodyTop - 2)} L ${pt(lx, y0)} L ${pt(rx, y0)} L ${pt(rx, yBodyTop - 2)} L ${pt(p.b, yBodyTop)}`);
        creases.push(`M ${pt(lx, yBodyTop)} L ${pt(rx, yBodyTop)}`);
      });
    } else {
      const topTuck = buildTuckFlapGeometry(xG, xP1, yTopFlap, T, -1, t);
      cuts.push(`M ${pt(xG, yBodyTop)} L ${pt(xG, yTopFlap)}`);
      cuts.push(topTuck.cut);
      cuts.push(`M ${pt(xP1, yTopFlap)} L ${pt(xP1, yBodyTop)}`);
      creases.push(`M ${pt(xG, yBodyTop)} L ${pt(xP1, yBodyTop)}`);
      creases.push(topTuck.crease);

      const drawTopDust = (xa: number, xb: number) => {
        const taperIn = Math.min(5, (xb - xa) * 0.14);
        cuts.push(
          `M ${pt(xa, yBodyTop)} L ${pt(xa + 1, yBodyTop - 2)} L ${pt(xa + taperIn, yBodyTop - DF)} L ${pt(xb - taperIn * 1.3, yBodyTop - DF)} L ${pt(xb - 1, yBodyTop - 2)} L ${pt(xb, yBodyTop)}`
        );
        creases.push(`M ${pt(xa + 1, yBodyTop)} L ${pt(xb - 1, yBodyTop)}`);
      };
      drawTopDust(xP1, xP2);
      drawTopDust(xP3, xP4);

      const xThumb = (xP2 + xP3) / 2;
      const rThumb = Math.min(10, Math.max(5, L * 0.12));
      cuts.push(
        `M ${pt(xP2, yBodyTop)} L ${pt(xThumb - rThumb, yBodyTop)} A ${f(rThumb)},${f(rThumb)} 0 0 0 ${pt(xThumb + rThumb, yBodyTop)} L ${pt(xP3, yBodyTop)}`
      );
    }

    // --- TRUE AUTO-LOCK CRASH BOTTOM ---
    const hookDepth = Math.min(8, btmDepth * 0.16);
    const glueStripW = Math.min(autoLockGlueWidth || 18, W * 0.45);
    const diagOffset1 = Math.min(L * 0.52, btmDepth / Math.tan(angleRad));

    // Panel 1 (Major Hook Flap)
    const p1HookX = xP1 - diagOffset1 * 0.45;
    cuts.push(
      `M ${pt(xG, yBodyBtm)} L ${pt(xG + 2, yBtmMax)} L ${pt(p1HookX, yBtmMax)} L ${pt(p1HookX + 4, yBtmMax - hookDepth)} L ${pt(xP1 - 6, yBtmMax - hookDepth)} L ${pt(xP1 - 2, yBodyBtm + 10)} L ${pt(xP1, yBodyBtm)}`
    );
    // Diagonal 45° auto-lock fold line + glue flap triangle zone
    creases.push(`M ${pt(xG, yBodyBtm)} L ${pt(xG + diagOffset1 * 0.78, yBodyBtm + diagOffset1 * 0.78 * Math.tan(angleRad))}`);

    // Panel 2 (Minor Diagonal Glue Flap)
    const yMinor2 = yBodyBtm + Math.min(btmDepth * 0.85, W * 0.48);
    cuts.push(
      `M ${pt(xP1, yBodyBtm)} L ${pt(xP1 + 3, yMinor2)} L ${pt(xP2 - glueStripW * 0.5, yMinor2)} L ${pt(xP2, yBodyBtm)}`
    );
    creases.push(`M ${pt(xP1, yBodyBtm)} L ${pt(xP1 + Math.min(W * 0.75, (yMinor2 - yBodyBtm) / Math.tan(angleRad)), yMinor2)}`);
    glues.push(
      `M ${pt(xP1 + 4, yBodyBtm + 3)} L ${pt(xP1 + Math.min(W * 0.65, glueStripW), yBodyBtm + 3)} L ${pt(xP1 + 4, yMinor2 - 3)} Z`
    );

    // Panel 3 (Second Major Hook Flap)
    const p3HookX = xP3 - diagOffset1 * 0.45;
    cuts.push(
      `M ${pt(xP2, yBodyBtm)} L ${pt(xP2 + 2, yBtmMax)} L ${pt(p3HookX, yBtmMax)} L ${pt(p3HookX + 4, yBtmMax - hookDepth)} L ${pt(xP3 - 6, yBtmMax - hookDepth)} L ${pt(xP3 - 2, yBodyBtm + 10)} L ${pt(xP3, yBodyBtm)}`
    );
    creases.push(`M ${pt(xP2, yBodyBtm)} L ${pt(xP2 + diagOffset1 * 0.78, yBodyBtm + diagOffset1 * 0.78 * Math.tan(angleRad))}`);

    // Panel 4 (Second Minor Diagonal Glue Flap)
    cuts.push(
      `M ${pt(xP3, yBodyBtm)} L ${pt(xP3 + 3, yMinor2)} L ${pt(xP4 - glueStripW * 0.5, yMinor2)} L ${pt(xP4, yBodyBtm)}`
    );
    creases.push(`M ${pt(xP3, yBodyBtm)} L ${pt(xP3 + Math.min(W * 0.75, (yMinor2 - yBodyBtm) / Math.tan(angleRad)), yMinor2)}`);
    glues.push(
      `M ${pt(xP3 + 4, yBodyBtm + 3)} L ${pt(xP3 + Math.min(W * 0.65, glueStripW), yBodyBtm + 3)} L ${pt(xP3 + 4, yMinor2 - 3)} Z`
    );

    creases.push(`M ${pt(xG, yBodyBtm)} L ${pt(xP4, yBodyBtm)}`);
    cuts.push(`M ${pt(xP4, yBodyTop)} L ${pt(xP4, yBodyBtm)}`);
    creases.push(`M ${pt(xP1, yBodyTop)} L ${pt(xP1, yBodyBtm)}`);
    creases.push(`M ${pt(xP2, yBodyTop)} L ${pt(xP2, yBodyBtm)}`);
    creases.push(`M ${pt(xP3, yBodyTop)} L ${pt(xP3, yBodyBtm)}`);

    if (includePerforations && H > 50) {
      perforations.push(`M ${pt(xG, yBodyTop + 14)} L ${pt(xP4, yBodyTop + 14)}`);
    }

    const yMid = (yBodyTop + yBodyBtm) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: `${Math.round(L)}mm`, lineW: L });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: `${Math.round(W)}mm`, lineW: W });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: `H:${Math.round(H)}`, lineH: H });
    labels.push({ x: (xG + xP1) / 2, y: yBodyBtm + btmDepth * 0.55, text: `زاویه تا ${Math.round(autoLockAngle || 45)}°` });

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, y0, xP4, yBtmMax, bleedMm)],
      perforations,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBtmMax,
      totalW: xP4 - x0,
      totalH: yBtmMax - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: measurePathListLengthMm(perforations),
        glueAreaSqMm: Math.round(G * (H - bevel) + glueStripW * yMinor2 * 0.6),
        netBlankAreaSqCm: Math.round(((2 * (L + W) * H + 2 * (L + W) * btmDepth) / 100)),
        grossBlankAreaSqCm: Math.round(((xP4 - x0) * (yBtmMax - y0)) / 100),
        slotWidthMm: Number(Math.max(1.0, t * 1.3).toFixed(2)),
        bendDeductionMm: Number((t * 0.44).toFixed(2)),
        flapCount: 8,
        panelCount: 4,
        isTwoPiece: false,
        hasLockingSlots: true,
        hasVentilation: false,
        hasTearStrip: perforations.length > 0,
      },
    };
  };
};

// =========================================================================
// 8. FEFCO 0300 / 0301 (TWO-PIECE TELESCOPE LID & BASE TRAYS)
// =========================================================================
const createTrayEngine = () => {
  return ({ L, W, H, x0 = 50, thickness = 1.6, bleedMm = 4 }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.5, thickness || 1.6);
    const y0 = 40;
    const tabLen = Math.max(16, Math.min(28, H * 0.7));
    const lidH = Math.max(22, Math.min(H, H * 0.72));
    const clearance = Number((t * 2.6).toFixed(1)); // Lid must clear base exterior thickness!
    const gapBetweenPieces = 26;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const labels: DielineLabel[] = [];

    const buildSingleTray = (ox: number, oy: number, bw: number, bl: number, bh: number, labelPrefix: string) => {
      const xL = ox;
      const xBaseL = xL + bh;
      const xBaseR = xBaseL + bw;
      const xR = xBaseR + bh;

      const yT = oy;
      const yBaseT = yT + bh;
      const yBaseB = yBaseT + bl;
      const yB = yBaseB + bh;

      // Top & Bottom flaps
      cuts.push(`M ${pt(xBaseL, yBaseT)} L ${pt(xBaseL + 2, yT)} L ${pt(xBaseR - 2, yT)} L ${pt(xBaseR, yBaseT)}`);
      cuts.push(`M ${pt(xBaseL, yBaseB)} L ${pt(xBaseL + 2, yB)} L ${pt(xBaseR - 2, yB)} L ${pt(xBaseR, yBaseB)}`);

      // Left wall + Top/Bottom Corner Glue Flaps
      cuts.push(
        `M ${pt(xBaseL, yBaseT)} L ${pt(xBaseL - 2, yBaseT - tabLen)} L ${pt(xL + 4, yBaseT - tabLen + 3)} L ${pt(xL, yBaseT)} L ${pt(xL, yBaseB)} L ${pt(xL + 4, yBaseB + tabLen - 3)} L ${pt(xBaseL - 2, yBaseB + tabLen)} L ${pt(xBaseL, yBaseB)}`
      );
      // Right wall + Top/Bottom Corner Glue Flaps
      cuts.push(
        `M ${pt(xBaseR, yBaseT)} L ${pt(xBaseR + 2, yBaseT - tabLen)} L ${pt(xR - 4, yBaseT - tabLen + 3)} L ${pt(xR, yBaseT)} L ${pt(xR, yBaseB)} L ${pt(xR - 4, yBaseB + tabLen - 3)} L ${pt(xBaseR + 2, yBaseB + tabLen)} L ${pt(xBaseR, yBaseB)}`
      );

      // Base creases + corner flap creases
      creases.push(`M ${pt(xBaseL, yBaseT)} L ${pt(xBaseR, yBaseT)}`);
      creases.push(`M ${pt(xBaseL, yBaseB)} L ${pt(xBaseR, yBaseB)}`);
      creases.push(`M ${pt(xL, yBaseT)} L ${pt(xBaseL, yBaseT)}`);
      creases.push(`M ${pt(xBaseR, yBaseT)} L ${pt(xR, yBaseT)}`);
      creases.push(`M ${pt(xL, yBaseB)} L ${pt(xBaseL, yBaseB)}`);
      creases.push(`M ${pt(xBaseR, yBaseB)} L ${pt(xR, yBaseB)}`);
      creases.push(`M ${pt(xBaseL, yBaseT)} L ${pt(xBaseL, yBaseB)}`);
      creases.push(`M ${pt(xBaseR, yBaseT)} L ${pt(xBaseR, yBaseB)}`);

      // Corner glue tabs highlight
      glues.push(`M ${pt(xL + 3, yBaseT - tabLen + 5)} L ${pt(xBaseL - 3, yBaseT - tabLen + 3)} L ${pt(xBaseL - 3, yBaseT - 2)} L ${pt(xL + 3, yBaseT - 2)} Z`);
      glues.push(`M ${pt(xBaseR + 3, yBaseT - tabLen + 3)} L ${pt(xR - 3, yBaseT - tabLen + 5)} L ${pt(xR - 3, yBaseT - 2)} L ${pt(xBaseR + 3, yBaseT - 2)} Z`);

      labels.push({ x: (xBaseL + xBaseR) / 2, y: (yBaseT + yBaseB) / 2, text: `${labelPrefix} ${Math.round(bw)}×${Math.round(bl)}`, lineW: bw });
      labels.push({ x: (xBaseL + xBaseR) / 2, y: yT + bh / 2, text: `دیواره ${Math.round(bh)}mm` });
      return { xMax: xR, yMax: yB };
    };

    const baseBounds = buildSingleTray(x0, y0, L, W, H, 'کفه زیره');
    const lidStartX = baseBounds.xMax + gapBetweenPieces;
    const lidBounds = buildSingleTray(lidStartX, y0 + (H - lidH), L + clearance, W + clearance, lidH, `درب (+${clearance})`);

    const xMax = lidBounds.xMax;
    const yMax = Math.max(baseBounds.yMax, lidBounds.yMax);

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, y0, xMax, yMax, bleedMm)],
      perforations: [],
      labels,
      xMin: x0,
      yMin: y0,
      xMax,
      yMax,
      totalW: xMax - x0,
      totalH: yMax - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: 0,
        glueAreaSqMm: Math.round(4 * tabLen * H),
        netBlankAreaSqCm: Math.round(((L * W * 2 + 2 * (L + W) * (H + lidH)) / 100)),
        grossBlankAreaSqCm: Math.round(((xMax - x0) * (yMax - y0)) / 100),
        slotWidthMm: Number((t * 1.4).toFixed(2)),
        bendDeductionMm: Number((t * 0.5).toFixed(2)),
        flapCount: 8,
        panelCount: 10,
        isTwoPiece: true,
        hasLockingSlots: false,
        hasVentilation: false,
        hasTearStrip: false,
      },
    };
  };
};

// =========================================================================
// 9. ECMA C10.20 (TWO-PIECE MATCHBOX / DRAWER + OUTER SLEEVE)
// =========================================================================
const createDrawerBoxEngine = () => {
  return ({ L, W, H, glueTab = 16, x0 = 50, thickness = 0.45, bleedMm = 3 }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.3, thickness || 0.45);
    const G = Math.max(12, glueTab || 16);
    const y0 = 35;

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const labels: DielineLabel[] = [];

    // Part 1 (Left): Inner Drawer Tray with Thumb Notch
    const xBaseL = x0 + H;
    const xBaseR = xBaseL + L;
    const xTrayR = xBaseR + H;
    const yTrayBaseT = y0 + H;
    const yTrayBaseB = yTrayBaseT + W;
    const yTrayBtm = yTrayBaseB + H;
    const tabW = Math.max(14, H * 0.65);

    cuts.push(`M ${pt(xBaseL, yTrayBaseT)} L ${pt(xBaseL + 2, y0)} L ${pt(xBaseR - 2, y0)} L ${pt(xBaseR, yTrayBaseT)}`);
    cuts.push(`M ${pt(xBaseL, yTrayBaseB)} L ${pt(xBaseL + 2, yTrayBtm)} L ${pt(xBaseR - 2, yTrayBtm)} L ${pt(xBaseR, yTrayBaseB)}`);
    cuts.push(`M ${pt(xBaseL, yTrayBaseT)} L ${pt(xBaseL - 2, yTrayBaseT - tabW)} L ${pt(x0 + 3, yTrayBaseT - tabW + 2)} L ${pt(x0, yTrayTrayCorner(yTrayBaseT))} L ${pt(x0, yTrayBaseB)} L ${pt(x0 + 3, yTrayBaseB + tabW - 2)} L ${pt(xBaseL - 2, yTrayBaseB + tabW)} L ${pt(xBaseL, yTrayBaseB)}`);
    cuts.push(`M ${pt(xBaseR, yTrayBaseT)} L ${pt(xBaseR + 2, yTrayBaseT - tabW)} L ${pt(xTrayR - 3, yTrayBaseT - tabW + 2)} L ${pt(xTrayR, yTrayBaseT)} L ${pt(xTrayR, yTrayBaseB)} L ${pt(xTrayR - 3, yTrayBaseB + tabW - 2)} L ${pt(xBaseR + 2, yTrayBaseB + tabW)} L ${pt(xBaseR, yTrayBaseB)}`);

    function yTrayTrayCorner(y: number) { return y; }

    creases.push(`M ${pt(xBaseL, yTrayBaseT)} L ${pt(xBaseR, yTrayBaseT)}`);
    creases.push(`M ${pt(xBaseL, yTrayBaseB)} L ${pt(xBaseR, yTrayBaseB)}`);
    creases.push(`M ${pt(x0, yTrayBaseT)} L ${pt(xBaseL, yTrayBaseT)}`);
    creases.push(`M ${pt(xBaseR, yTrayBaseT)} L ${pt(xTrayR, yTrayBaseT)}`);
    creases.push(`M ${pt(x0, yTrayBaseB)} L ${pt(xBaseL, yTrayBaseB)}`);
    creases.push(`M ${pt(xBaseR, yTrayBaseB)} L ${pt(xTrayR, yTrayBaseB)}`);
    creases.push(`M ${pt(xBaseL, yTrayBaseT)} L ${pt(xBaseL, yTrayBaseB)}`);
    creases.push(`M ${pt(xBaseR, yTrayBaseT)} L ${pt(xBaseR, yTrayBaseB)}`);

    // Part 2 (Right): Outer Sliding Sleeve with Clearance & Half-Moon Pull Notch
    const sleeveGap = 28;
    const clearance = Number((t * 2.2 + 0.8).toFixed(1));
    const sw = W + clearance;
    const sh = H + clearance;
    const sl = L + 1;
    const xSl0 = xTrayR + sleeveGap;
    const xSlG = xSl0 + G;
    const xSl1 = xSlG + sl;
    const xSl2 = xSl1 + sh;
    const xSl3 = xSl2 + sl;
    const xSl4 = xSl3 + sh;

    const ySlT = y0 + 20;
    const ySlB = ySlT + sw;
    const notchR = Math.min(12, sw * 0.16);
    const ySlMid = (ySlT + ySlB) / 2;

    cuts.push(
      `M ${pt(xSl0, ySlT + 3)} L ${pt(xSlG, ySlT)} L ${pt(xSl4, ySlT)} L ${pt(xSl4, ySlMid - notchR)} A ${f(notchR)},${f(notchR)} 0 0 0 ${pt(xSl4, ySlMid + notchR)} L ${pt(xSl4, ySlB)} L ${pt(xSlG, ySlB)} L ${pt(xSl0, ySlB - 3)} Z`
    );
    creases.push(`M ${pt(xSlG, ySlT)} L ${pt(xSlG, ySlB)}`);
    creases.push(`M ${pt(xSl1, ySlT)} L ${pt(xSl1, ySlB)}`);
    creases.push(`M ${pt(xSl2, ySlT)} L ${pt(xSl2, ySlB)}`);
    creases.push(`M ${pt(xSl3, ySlT)} L ${pt(xSl3, ySlB)}`);
    glues.push(`M ${pt(xSl0 + 2, ySlT + 4)} L ${pt(xSlG - 2, ySlT + 2)} L ${pt(xSlG - 2, ySlB - 2)} L ${pt(xSl0 + 2, ySlB - 4)} Z`);

    labels.push({ x: (xBaseL + xBaseR) / 2, y: (yTrayBaseT + yTrayBaseB) / 2, text: `کشو داخلی ${Math.round(L)}×${Math.round(W)}`, lineW: L });
    labels.push({ x: (xSlG + xSl1) / 2, y: ySlMid, text: `کاور کشویی (+${clearance})` });

    const yMax = Math.max(yTrayBtm, ySlB);
    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, y0, xSl4, yMax, bleedMm)],
      perforations: [],
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xSl4,
      yMax,
      totalW: xSl4 - x0,
      totalH: yMax - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: 0,
        glueAreaSqMm: Math.round(G * sw + 4 * tabW * H),
        netBlankAreaSqCm: Math.round(((L * W + 2 * H * (L + W) + 2 * (sl + sh) * sw) / 100)),
        grossBlankAreaSqCm: Math.round(((xSl4 - x0) * (yMax - y0)) / 100),
        slotWidthMm: Number((t * 1.2).toFixed(2)),
        bendDeductionMm: Number((t * 0.42).toFixed(2)),
        flapCount: 6,
        panelCount: 9,
        isTwoPiece: true,
        hasLockingSlots: false,
        hasVentilation: false,
        hasTearStrip: false,
      },
    };
  };
};

// =========================================================================
// 10. ECMA D50 (RETAIL COUNTERTOP PDQ DISPLAY WITH ANGLED CUTAWAY & HEADER)
// =========================================================================
const createDisplayStandEngine = () => {
  return ({ L, W, H, glueTab = 18, x0 = 50, thickness = 1.6, bleedMm = 4 }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.4, thickness || 1.6);
    const G = Math.max(15, glueTab || 18);
    const frontLipH = Math.max(25, Math.min(H * 0.42, 65));
    const headerCrownH = Math.max(45, Math.min(H * 0.65, 110));

    const y0 = 35;
    const yHeader = y0;
    const yBodyTop = yHeader + headerCrownH;
    const yFrontTop = yBodyTop + (H - frontLipH);
    const yBodyBtm = yBodyTop + H;
    const yBtmFlap = yBodyBtm + W * 0.55;

    const xG = x0 + G;
    const xP1 = xG + L; // Front display panel
    const xP2 = xP1 + W; // Right angled sidewall
    const xP3 = xP2 + L; // Back tall panel + header crown
    const xP4 = xP3 + W; // Left angled sidewall

    const cuts: string[] = [];
    const creases: string[] = [];
    const glues: string[] = [];
    const labels: DielineLabel[] = [];

    // Glue tab
    cuts.push(`M ${pt(xG, yFrontTop)} L ${pt(x0 + 3, yFrontTop + 5)} L ${pt(x0, yFrontTop + 9)} L ${pt(x0, yBodyBtm - 5)} L ${pt(xG, yBodyBtm)}`);
    creases.push(`M ${pt(xG, yFrontTop)} L ${pt(xG, yBodyBtm)}`);
    glues.push(`M ${pt(x0 + 3, yFrontTop + 7)} L ${pt(xG - 2, yFrontTop + 2)} L ${pt(xG - 2, yBodyBtm - 2)} L ${pt(x0 + 3, yBodyBtm - 4)} Z`);

    // Angled PDQ Display Cutline across Front (Low) -> Right Side (Angled up) -> Back + Header Crown -> Left Side (Angled down)
    const rCrown = Math.min(18, L * 0.14);
    cuts.push(
      `M ${pt(xG, yFrontTop)} L ${pt(xP1, yFrontTop)} L ${pt(xP2, yBodyTop)} L ${pt(xP2, yHeader + rCrown)} Q ${pt(xP2, yHeader)} ${pt(xP2 + rCrown, yHeader)} L ${pt(xP3 - rCrown, yHeader)} Q ${pt(xP3, yHeader)} ${pt(xP3, yHeader + rCrown)} L ${pt(xP3, yBodyTop)} L ${pt(xP4, yFrontTop)} L ${pt(xP4, yBodyBtm)}`
    );
    creases.push(`M ${pt(xP2, yBodyTop)} L ${pt(xP3, yBodyTop)}`);
    creases.push(`M ${pt(xP1, yFrontTop)} L ${pt(xP1, yBodyBtm)}`);
    creases.push(`M ${pt(xP2, yBodyTop)} L ${pt(xP2, yBodyBtm)}`);
    creases.push(`M ${pt(xP3, yBodyTop)} L ${pt(xP3, yBodyBtm)}`);

    // Slotted Bottom Flaps
    const slotW = 3;
    const hs = slotW / 2;
    [
      { a: xG, b: xP1, first: true, last: false },
      { a: xP1, b: xP2, first: false, last: false },
      { a: xP2, b: xP3, first: false, last: false },
      { a: xP3, b: xP4, first: false, last: true },
    ].forEach((p) => {
      const lx = p.first ? p.a : p.a + hs;
      const rx = p.last ? p.b : p.b - hs;
      cuts.push(`M ${pt(p.a, yBodyBtm)} L ${pt(lx, yBtmFlap)} L ${pt(rx, yBtmFlap)} L ${pt(p.b, yBodyBtm)}`);
      creases.push(`M ${pt(lx, yBodyBtm)} L ${pt(rx, yBodyBtm)}`);
    });

    labels.push({ x: (xP2 + xP3) / 2, y: (yHeader + yBodyTop) / 2, text: `تاج تبلیغاتی (${Math.round(headerCrownH)}mm)` });
    labels.push({ x: (xG + xP1) / 2, y: (yFrontTop + yBodyBtm) / 2, text: `دیواره جلو ${Math.round(frontLipH)}mm` });
    labels.push({ x: (xP2 + xP3) / 2, y: (yBodyTop + yBodyBtm) / 2, text: `پشت ${Math.round(L)}×${Math.round(H)}`, lineW: L, lineH: H });

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, y0, xP4, yBtmFlap, bleedMm)],
      perforations: [],
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBtmFlap,
      totalW: xP4 - x0,
      totalH: yBtmFlap - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: 0,
        glueAreaSqMm: Math.round(G * frontLipH),
        netBlankAreaSqCm: Math.round(((2 * (L + W) * (H * 0.75) + L * headerCrownH + 2 * (L + W) * W * 0.55) / 100)),
        grossBlankAreaSqCm: Math.round(((xP4 - x0) * (yBtmFlap - y0)) / 100),
        slotWidthMm: Number(Math.max(1, t * 1.4).toFixed(2)),
        bendDeductionMm: Number((t * 0.45).toFixed(2)),
        flapCount: 5,
        panelCount: 5,
        isTwoPiece: false,
        hasLockingSlots: false,
        hasVentilation: false,
        hasTearStrip: false,
      },
    };
  };
};

// =========================================================================
// 11. ECMA B10 (SLEEVE / BELLY BAND) ENGINE
// =========================================================================
const createSleeveEngine = () => {
  return ({ L, W, H, glueTab = 22, x0 = 50, thickness = 0.4, bleedMm = 3 }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.25, thickness || 0.4);
    const G = Math.max(14, glueTab || 22);
    const y0 = 40;
    const yBtm = y0 + H;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const bevel = Math.min(6, G * 0.3);
    const cuts = [
      `M ${pt(xG, y0)} L ${pt(x0 + 2, y0 + bevel)} L ${pt(x0, y0 + bevel + 2)} L ${pt(x0, yBtm - bevel - 2)} L ${pt(x0 + 2, yBtm - bevel)} L ${pt(xG, yBtm)} L ${pt(xP4, yBtm)} L ${pt(xP4, y0)} Z`,
    ];
    const creases = [
      `M ${pt(xG, y0)} L ${pt(xG, yBtm)}`,
      `M ${pt(xP1, y0)} L ${pt(xP1, yBtm)}`,
      `M ${pt(xP2, y0)} L ${pt(xP2, yBtm)}`,
      `M ${pt(xP3, y0)} L ${pt(xP3, yBtm)}`,
    ];
    const glues = [`M ${pt(x0 + 2, y0 + bevel + 2)} L ${pt(xG - 2, y0 + 2)} L ${pt(xG - 2, yBtm - 2)} L ${pt(x0 + 2, yBtm - bevel - 2)} Z`];

    const yMid = (y0 + yBtm) / 2;
    const labels: DielineLabel[] = [
      { x: (xG + xP1) / 2, y: yMid, text: `طول ${Math.round(L)}mm`, lineW: L },
      { x: (xP1 + xP2) / 2, y: yMid, text: `عرض ${Math.round(W)}mm`, lineW: W },
      { x: (xP2 + xP3) / 2, y: yMid, text: `ارتفاع ${Math.round(H)}mm`, lineH: H },
      { x: (x0 + xG) / 2, y: yMid, text: `${Math.round(G)}` },
    ];

    return {
      cuts,
      creases,
      glues,
      bleeds: [buildBleedRectPath(x0, y0, xP4, yBtm, bleedMm)],
      perforations: [],
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBtm,
      totalW: xP4 - x0,
      totalH: yBtm - y0,
      metrics: {
        cutLengthMm: measurePathListLengthMm(cuts),
        creaseLengthMm: measurePathListLengthMm(creases),
        perforationLengthMm: 0,
        glueAreaSqMm: Math.round(G * (H - bevel)),
        netBlankAreaSqCm: Math.round(((xP4 - x0) * H) / 100),
        grossBlankAreaSqCm: Math.round(((xP4 - x0) * H) / 100),
        slotWidthMm: Number(Math.max(0.71, t * 1.1).toFixed(2)),
        bendDeductionMm: Number((t * 0.42).toFixed(2)),
        flapCount: 1,
        panelCount: 4,
        isTwoPiece: false,
        hasLockingSlots: false,
        hasVentilation: false,
        hasTearStrip: false,
      },
    };
  };
};

// Instantiate engines
const rscStandardEngine = createRscEngine(0.5, 0.5, false);
const openTopEngine = createRscEngine(0, 0.5, false);
const folEngine = createRscEngine(1.0, 1.0, false);
const mailerEngine = createMailerEngine(false);
const mailer0470Engine = createMailerEngine(true);
const pizzaBoxEngine = createPizzaBoxEngine();
const wrapFolderEngine = createWrapFolderEngine();
const tuckEndEngine = createTuckEndEngine(false);
const euroHangTuckEngine = createTuckEndEngine(true);
const snapLock123Engine = createSnapLock123Engine();
const crashLockSlottedEngine = createCrashLockEngine(true);
const crashLockTuckEngine = createCrashLockEngine(false);
const trayEngine = createTrayEngine();
const drawerBoxEngine = createDrawerBoxEngine();
const displayStandEngine = createDisplayStandEngine();
const sleeveEngine = createSleeveEngine();

// Master Registry of Parametric Dieline CAD Engines
export const STANDARD_DIELINE_ENGINES: Record<string, (params: DielineEngineParams) => DielineEngineResult> = {
  // FEFCO 0200 Series
  'default-rsc': rscStandardEngine,
  'fefco-0201': rscStandardEngine,
  'fefco-0200': openTopEngine,
  'fefco-0203': folEngine,
  'fefco-0215': crashLockSlottedEngine,

  // FEFCO 0300 Series (Telescope & Tray)
  'fefco-0300': trayEngine,
  'fefco-0301': trayEngine,
  'fefco-0320': trayEngine,

  // FEFCO 0400 Series (Mailer, Pizza, Book Wrap & Folders)
  'fefco-0427': mailerEngine,
  'fefco-pizza': pizzaBoxEngine,
  'fefco-0409': wrapFolderEngine,
  'fefco-0470': mailer0470Engine,

  // FEFCO 0700 Series (Pre-glued Auto Crash-Lock)
  'fefco-0713': crashLockTuckEngine,

  // ECMA Standard Cartons
  'ecma-a2020': tuckEndEngine,
  'snap-lock-123': snapLock123Engine,
  'ecma-a30': euroHangTuckEngine,
  'ecma-b10': sleeveEngine,
  'ecma-c1020': drawerBoxEngine,
  'ecma-d50': displayStandEngine,
};

// Accurate Geometric Parameter Calculator powered by the live SVG CAD engines
export function calculateDielineParameters(
  arg1: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any
): DielineCalculationResult {
  let fefcoCode = 'fefco-0201';
  let l = 200;
  let w = 150;
  let h = 100;
  let caliper = 3;

  if (typeof arg1 === 'number') {
    l = arg1;
    w = Number(arg2) || 150;
    h = Number(arg3) || 100;
    caliper = Number(arg4) || 0.45;
    fefcoCode = String(arg5 || 'fefco-0201');
  } else {
    fefcoCode = String(arg1 || 'fefco-0201');
    l = Number(arg2) || 200;
    w = Number(arg3) || 150;
    h = Number(arg4) || 100;
    caliper = Number(arg5) || 0.45;
  }

  const isCorrugated = caliper >= 1.2 || fefcoCode.startsWith('fefco-02') || fefcoCode.startsWith('fefco-04');
  const glueTab = isCorrugated ? Math.max(25, Math.round(caliper * 10)) : Math.max(14, Math.round(caliper * 28));
  const tuck = Math.max(15, Math.min(45, Math.round(w * 0.28)));
  const dustFlap = Math.max(14, Math.min(w * 0.6, Math.round(w * 0.45)));

  const engineFn = STANDARD_DIELINE_ENGINES[fefcoCode] || STANDARD_DIELINE_ENGINES['default-rsc'];
  const geom = engineFn({
    L: l,
    W: w,
    H: h,
    glueTab,
    tuck,
    dustFlap,
    thickness: caliper,
  });

  const grossAreaSqCm = geom.metrics?.grossBlankAreaSqCm ?? Math.round((geom.totalW * geom.totalH) / 100);
  const netAreaSqCm = geom.metrics?.netBlankAreaSqCm ?? Math.round(grossAreaSqCm * 0.78);
  const wastePercentage =
    grossAreaSqCm > 0 ? Math.max(4, Math.min(45, Math.round(((grossAreaSqCm - netAreaSqCm) / grossAreaSqCm) * 100))) : 15;

  const cutLengthMm = geom.metrics?.cutLengthMm ?? measurePathListLengthMm(geom.cuts);
  const creaseLengthMm = geom.metrics?.creaseLengthMm ?? measurePathListLengthMm(geom.creases);
  const perforationLengthMm = geom.metrics?.perforationLengthMm ?? measurePathListLengthMm(geom.perforations);

  return {
    sheetWidth: Math.round(geom.totalW),
    sheetHeight: Math.round(geom.totalH),
    grossArea: grossAreaSqCm,
    netArea: netAreaSqCm,
    wastePercentage,
    cutLength: Math.round(cutLengthMm / 10),
    creaseLength: Math.round(creaseLengthMm / 10),
    cutLengthMm,
    creaseLengthMm,
    perforationLengthMm,
    glueTab,
    tuck,
    dustFlap,
    isSmallBoxActive: l < 90 || w < 65,
    slotWidthMm: geom.metrics?.slotWidthMm,
    bendAllowanceMm: geom.metrics?.bendDeductionMm,
  };
}
