export interface DielineCalculationResult {
  sheetWidth: number;
  sheetHeight: number;
  grossArea: number;
  netArea: number;
  wastePercentage: number;
  cutLength: number;
  creaseLength: number;
}

export const calculateDielineParameters = (
  fefcoCode: string,
  l: number,
  w: number,
  h: number,
  caliper: number = 3
): DielineCalculationResult => {
  const totalLength = 2 * (l + w) + 40;
  const totalHeight = h + w;
  const grossArea = (totalLength * totalHeight) / 10000;
  const netArea = (2 * l * w + 2 * l * h + 2 * w * h) / 100;
  const waste = Math.max(5, Math.min(35, Math.round(((grossArea - netArea) / grossArea) * 100)));

  return {
    sheetWidth: totalLength,
    sheetHeight: totalHeight,
    grossArea: Math.round(grossArea),
    netArea: Math.round(netArea),
    wastePercentage: waste,
    cutLength: Math.round((2 * totalLength + 2 * totalHeight + 4 * w) / 10),
    creaseLength: Math.round((totalLength + 4 * h) / 10),
  };
};

export interface DielineEngineParams {
  L: number;
  W: number;
  H: number;
  glueTab?: number;
  tuck?: number;
  dustFlap?: number;
  x0?: number;
  variant?: string;
  thickness?: number;
  autoLockAngle?: number;
  autoLockGlueWidth?: number;
}

export interface DielineEngineResult {
  cuts: string[];
  creases: string[];
  labels: { x: number; y: number; text: string }[];
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  totalW: number;
  totalH: number;
}

// 1. FEFCO 0201 (RSC) and Standard Slotted Containers Engine
const createRscEngine = (flapRatioTop = 0.5, flapRatioBottom = 0.5) => {
  return ({ L, W, H, glueTab = 35, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const G = Math.max(25, glueTab || 35);
    const topFlapH = W * flapRatioTop;
    const btmFlapH = W * flapRatioBottom;

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
    const labels: { x: number; y: number; text: string }[] = [];

    // Glue Tab Perimeter
    cuts.push(`M ${x0 + 4} ${yTopCrease} L ${x0} ${yTopCrease + 4} L ${x0} ${yBtmCrease - 4} L ${x0 + 4} ${yBtmCrease}`);
    creases.push(`M ${xG} ${yTopCrease} L ${xG} ${yBtmCrease}`);

    // Top Flaps (if flapRatioTop > 0)
    if (topFlapH > 0) {
      cuts.push(`M ${x0 + 4} ${yTopCrease} L ${xG} ${yTopCrease}`);
      // Panel 1 flap
      cuts.push(`M ${xG} ${yTopCrease} L ${xG} ${y0} L ${xP1} ${y0} L ${xP1} ${yTopCrease}`);
      // Panel 2 flap
      cuts.push(`M ${xP1} ${yTopCrease} L ${xP1} ${y0} L ${xP2} ${y0} L ${xP2} ${yTopCrease}`);
      // Panel 3 flap
      cuts.push(`M ${xP2} ${yTopCrease} L ${xP2} ${y0} L ${xP3} ${y0} L ${xP3} ${yTopCrease}`);
      // Panel 4 flap
      cuts.push(`M ${xP3} ${yTopCrease} L ${xP3} ${y0} L ${xP4} ${y0} L ${xP4} ${yTopCrease}`);
      // Top horizontal crease
      creases.push(`M ${xG} ${yTopCrease} L ${xP4} ${yTopCrease}`);
    } else {
      cuts.push(`M ${x0 + 4} ${yTopCrease} L ${xP4} ${yTopCrease}`);
    }

    // Bottom Flaps (if flapRatioBottom > 0)
    if (btmFlapH > 0) {
      cuts.push(`M ${x0 + 4} ${yBtmCrease} L ${xG} ${yBtmCrease}`);
      // Panel 1 flap
      cuts.push(`M ${xG} ${yBtmCrease} L ${xG} ${yBottom} L ${xP1} ${yBottom} L ${xP1} ${yBtmCrease}`);
      // Panel 2 flap
      cuts.push(`M ${xP1} ${yBtmCrease} L ${xP1} ${yBottom} L ${xP2} ${yBottom} L ${xP2} ${yBtmCrease}`);
      // Panel 3 flap
      cuts.push(`M ${xP2} ${yBtmCrease} L ${xP2} ${yBottom} L ${xP3} ${yBottom} L ${xP3} ${yBtmCrease}`);
      // Panel 4 flap
      cuts.push(`M ${xP3} ${yBtmCrease} L ${xP3} ${yBottom} L ${xP4} ${yBottom} L ${xP4} ${yBtmCrease}`);
      // Bottom horizontal crease
      creases.push(`M ${xG} ${yBtmCrease} L ${xP4} ${yBtmCrease}`);
    } else {
      cuts.push(`M ${x0 + 4} ${yBtmCrease} L ${xP4} ${yBtmCrease}`);
    }

    // Outer Right Wall Cut
    cuts.push(`M ${xP4} ${yTopCrease} L ${xP4} ${yBtmCrease}`);

    // Vertical Fold Creases between Body Panels
    creases.push(`M ${xP1} ${yTopCrease} L ${xP1} ${yBtmCrease}`);
    creases.push(`M ${xP2} ${yTopCrease} L ${xP2} ${yBtmCrease}`);
    creases.push(`M ${xP3} ${yTopCrease} L ${xP3} ${yBtmCrease}`);

    // Standard Dimension Labels
    const yMid = (yTopCrease + yBtmCrease) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: `طول ${Math.round(L)}mm` });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: `عرض ${Math.round(W)}mm` });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: `طول ${Math.round(L)}mm` });
    labels.push({ x: (xP3 + xP4) / 2, y: yMid, text: `عرض ${Math.round(W)}mm` });
    labels.push({ x: (x0 + xG) / 2, y: yMid, text: `لبه چسب ${Math.round(G)}mm` });

    return {
      cuts,
      creases,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBottom,
      totalW: xP4 - x0,
      totalH: yBottom - y0,
    };
  };
};

// 2. FEFCO 0427 (Mailer / Roll End Tuck Front) Engine
const createMailerEngine = () => {
  return ({ L, W, H, tuck = 30, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const T = Math.max(20, tuck || 30);
    const y0 = 30;

    // Mailer Box Components:
    // Front Tuck (T) -> Top Lid (L) -> Back Wall (H) -> Bottom (L) -> Front Wall (H) -> Roll-over flap (H - 2)
    const yTuck = y0;
    const yLid = yTuck + T;
    const yBack = yLid + L;
    const yBottom = yBack + H;
    const yFront = yBottom + L;
    const yFrontFlap = yFront + H;

    // Width-wise: Roll-over side walls
    // Left Wing (H) -> Left Wall (H) -> Body (W) -> Right Wall (H) -> Right Wing (H)
    const xLWing = x0;
    const xLWall = xLWing + H;
    const xBodyL = xLWall + H;
    const xBodyR = xBodyL + W;
    const xRWall = xBodyR + H;
    const xRWing = xRWall + H;

    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // Outer Perimeter Cuts
    // Top Tuck & Lid
    cuts.push(`M ${xBodyL} ${yLid} L ${xBodyL + 8} ${yTuck} L ${xBodyR - 8} ${yTuck} L ${xBodyR} ${yLid}`);
    
    // Side Walls & Dust Flaps
    cuts.push(`M ${xBodyL} ${yLid} L ${xBodyL} ${yBack}`);
    cuts.push(`M ${xBodyR} ${yLid} L ${xBodyR} ${yBack}`);
    
    // Left roll-over side wall
    cuts.push(`M ${xBodyL} ${yBack} L ${xLWing} ${yBack} L ${xLWing} ${yBottom} L ${xBodyL} ${yBottom}`);
    // Right roll-over side wall
    cuts.push(`M ${xBodyR} ${yBack} L ${xRWing} ${yBack} L ${xRWing} ${yBottom} L ${xBodyR} ${yBottom}`);

    // Front Wall & Roll-over flap
    cuts.push(`M ${xBodyL} ${yBottom} L ${xBodyL} ${yFrontFlap} L ${xBodyR} ${yFrontFlap} L ${xBodyR} ${yBottom}`);

    // Crease Lines
    creases.push(`M ${xBodyL} ${yLid} L ${xBodyR} ${yLid}`); // Tuck fold
    creases.push(`M ${xBodyL} ${yBack} L ${xBodyR} ${yBack}`); // Back fold
    creases.push(`M ${xBodyL} ${yBottom} L ${xBodyR} ${yBottom}`); // Bottom back fold
    creases.push(`M ${xBodyL} ${yFront} L ${xBodyR} ${yFront}`); // Front wall fold
    creases.push(`M ${xBodyL} ${yBack} L ${xBodyL} ${yBottom}`); // Left side fold
    creases.push(`M ${xLWall} ${yBack} L ${xLWall} ${yBottom}`); // Left wall double fold
    creases.push(`M ${xBodyR} ${yBack} L ${xBodyR} ${yBottom}`); // Right side fold
    creases.push(`M ${xRWall} ${yBack} L ${xRWall} ${yBottom}`); // Right wall double fold

    // Dimension labels
    labels.push({ x: (xBodyL + xBodyR) / 2, y: (yBack + yBottom) / 2, text: `کفه جعبه: ${Math.round(W)} × ${Math.round(L)}mm` });
    labels.push({ x: (xBodyL + xBodyR) / 2, y: (yTuck + yBack) / 2, text: `درب بالایی: ${Math.round(W)} × ${Math.round(L)}mm` });
    labels.push({ x: (xBodyL + xBodyR) / 2, y: (yBottom + yFront) / 2, text: `دیواره جلو: ${Math.round(H)}mm` });

    return {
      cuts,
      creases,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xRWing,
      yMax: yFrontFlap,
      totalW: xRWing - x0,
      totalH: yFrontFlap - y0,
    };
  };
};

// 3. ECMA A20.20 (Tuck End Folding Carton) Engine
const createTuckEndEngine = (isCrashLock = false) => {
  return ({ L, W, H, glueTab = 15, tuck = 20, dustFlap = 15, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const G = Math.max(12, glueTab || 15);
    const T = Math.max(15, tuck || 20);
    const DF = Math.max(12, dustFlap || 15);

    const y0 = 30;
    const yTopTuck = y0;
    const yTopFlap = yTopTuck + T;
    const yBodyTop = yTopFlap + W;
    const yBodyBtm = yBodyTop + H;
    const yBtmFlap = yBodyBtm + (isCrashLock ? W * 0.75 : W);
    const yBtmTuck = isCrashLock ? yBtmFlap : yBtmFlap + T;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // Glue tab
    cuts.push(`M ${x0 + 3} ${yBodyTop} L ${x0} ${yBodyTop + 3} L ${x0} ${yBodyBtm - 3} L ${x0 + 3} ${yBodyBtm}`);
    creases.push(`M ${xG} ${yBodyTop} L ${xG} ${yBodyBtm}`);

    // Top Tuck End Flap (on panel 1)
    cuts.push(`M ${x0 + 3} ${yBodyTop} L ${xG} ${yBodyTop}`);
    cuts.push(`M ${xG} ${yBodyTop} L ${xG} ${yTopFlap} L ${xG + 4} ${yTopTuck} L ${xP1 - 4} ${yTopTuck} L ${xP1} ${yTopFlap} L ${xP1} ${yBodyTop}`);
    creases.push(`M ${xG} ${yBodyTop} L ${xP1} ${yBodyTop}`);
    creases.push(`M ${xG} ${yTopFlap} L ${xP1} ${yTopFlap}`);

    // Dust flaps on Panel 2 and 4
    cuts.push(`M ${xP1} ${yBodyTop} L ${xP1} ${yBodyTop - DF} L ${xP2} ${yBodyTop - DF} L ${xP2} ${yBodyTop}`);
    creases.push(`M ${xP1} ${yBodyTop} L ${xP2} ${yBodyTop}`);

    cuts.push(`M ${xP2} ${yBodyTop} L ${xP3} ${yBodyTop}`);

    cuts.push(`M ${xP3} ${yBodyTop} L ${xP3} ${yBodyTop - DF} L ${xP4} ${yBodyTop - DF} L ${xP4} ${yBodyTop}`);
    creases.push(`M ${xP3} ${yBodyTop} L ${xP4} ${yBodyTop}`);

    // Bottom Flaps
    if (!isCrashLock) {
      // Panel 3 bottom tuck flap
      cuts.push(`M ${xG} ${yBodyBtm} L ${xG} ${yBodyBtm + DF} L ${xP1} ${yBodyBtm + DF} L ${xP1} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP1} ${yBodyBtm}`);

      cuts.push(`M ${xP1} ${yBodyBtm} L ${xP2} ${yBodyBtm}`);

      cuts.push(`M ${xP2} ${yBodyBtm} L ${xP2} ${yBtmFlap} L ${xP2 + 4} ${yBtmTuck} L ${xP3 - 4} ${yBtmTuck} L ${xP3} ${yBtmFlap} L ${xP3} ${yBodyBtm}`);
      creases.push(`M ${xP2} ${yBodyBtm} L ${xP3} ${yBodyBtm}`);
      creases.push(`M ${xP2} ${yBtmFlap} L ${xP3} ${yBtmFlap}`);

      cuts.push(`M ${xP3} ${yBodyBtm} L ${xP3} ${yBodyBtm + DF} L ${xP4} ${yBodyBtm + DF} L ${xP4} ${yBodyBtm}`);
      creases.push(`M ${xP3} ${yBodyBtm} L ${xP4} ${yBodyBtm}`);
    } else {
      // Crash lock bottom (45-degree angle flaps)
      cuts.push(`M ${xG} ${yBodyBtm} L ${xG} ${yBtmFlap} L ${xP1 - 10} ${yBtmFlap} L ${xP1} ${yBodyBtm}`);
      cuts.push(`M ${xP1} ${yBodyBtm} L ${xP2} ${yBtmFlap} L ${xP2} ${yBodyBtm}`);
      cuts.push(`M ${xP2} ${yBodyBtm} L ${xP3 - 10} ${yBtmFlap} L ${xP3} ${yBodyBtm}`);
      cuts.push(`M ${xP3} ${yBodyBtm} L ${xP4} ${yBtmFlap} L ${xP4} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP4} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP1 - 10} ${yBtmFlap}`);
      creases.push(`M ${xP2} ${yBodyBtm} L ${xP3 - 10} ${yBtmFlap}`);
    }

    // Outer Right Wall Cut
    cuts.push(`M ${xP4} ${yBodyTop} L ${xP4} ${yBodyBtm}`);

    // Vertical panel creases
    creases.push(`M ${xP1} ${yBodyTop} L ${xP1} ${yBodyBtm}`);
    creases.push(`M ${xP2} ${yBodyTop} L ${xP2} ${yBodyBtm}`);
    creases.push(`M ${xP3} ${yBodyTop} L ${xP3} ${yBodyBtm}`);

    // Dimension labels
    const yMid = (yBodyTop + yBodyBtm) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: `طول ${Math.round(L)}mm` });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: `عرض ${Math.round(W)}mm` });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: `ارتفاع ${Math.round(H)}mm` });

    return {
      cuts,
      creases,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBtmTuck,
      totalW: xP4 - x0,
      totalH: yBtmTuck - y0,
    };
  };
};

// 4. FEFCO 0300 (Telescope / Tray) Engine
const createTrayEngine = () => {
  return ({ L, W, H, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const y0 = 40;
    const xLeft = x0;
    const xFlapL = xLeft + H;
    const xBaseL = xFlapL + H;
    const xBaseR = xBaseL + L;
    const xFlapR = xBaseR + H;
    const xRight = xFlapR + H;

    const yTop = y0;
    const yFlapT = yTop + H;
    const yBaseT = yFlapT + H;
    const yBaseB = yBaseT + W;
    const yFlapB = yBaseB + H;
    const yBtm = yFlapB + H;

    const cuts: string[] = [
      `M ${xBaseL} ${yTop} L ${xBaseR} ${yTop} L ${xBaseR} ${yBaseT} L ${xRight} ${yBaseT} L ${xRight} ${yBaseB} L ${xBaseR} ${yBaseB} L ${xBaseR} ${yBtm} L ${xBaseL} ${yBtm} L ${xBaseL} ${yBaseB} L ${xLeft} ${yBaseB} L ${xLeft} ${yBaseT} L ${xBaseL} ${yBaseT} Z`
    ];

    const creases: string[] = [
      `M ${xBaseL} ${yBaseT} L ${xBaseR} ${yBaseT}`,
      `M ${xBaseL} ${yBaseB} L ${xBaseR} ${yBaseB}`,
      `M ${xBaseL} ${yBaseT} L ${xBaseL} ${yBaseB}`,
      `M ${xBaseR} ${yBaseT} L ${xBaseR} ${yBaseB}`,
    ];

    const labels = [
      { x: (xBaseL + xBaseR) / 2, y: (yBaseT + yBaseB) / 2, text: `کفه تلسکوپی: ${Math.round(L)} × ${Math.round(W)}mm` },
      { x: (xBaseL + xBaseR) / 2, y: (yTop + yBaseT) / 2, text: `دیواره: ${Math.round(H)}mm` },
    ];

    return {
      cuts,
      creases,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xRight,
      yMax: yBtm,
      totalW: xRight - x0,
      totalH: yBtm - y0,
    };
  };
};

// 5. ECMA B10 (Sleeve / Band) Engine
const createSleeveEngine = () => {
  return ({ L, W, H, glueTab = 25, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const G = Math.max(15, glueTab || 25);
    const y0 = 40;
    const yBtm = y0 + H;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;

    const cuts: string[] = [
      `M ${x0} ${y0 + 3} L ${xP4} ${y0} L ${xP4} ${yBtm} L ${x0} ${yBtm - 3} Z`
    ];

    const creases: string[] = [
      `M ${xG} ${y0} L ${xG} ${yBtm}`,
      `M ${xP1} ${y0} L ${xP1} ${yBtm}`,
      `M ${xP2} ${y0} L ${xP2} ${yBtm}`,
      `M ${xP3} ${y0} L ${xP3} ${yBtm}`,
    ];

    const labels = [
      { x: (xG + xP1) / 2, y: (y0 + yBtm) / 2, text: `طول ${Math.round(L)}mm` },
      { x: (xP1 + xP2) / 2, y: (y0 + yBtm) / 2, text: `عرض ${Math.round(W)}mm` },
    ];

    return {
      cuts,
      creases,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax: yBtm,
      totalW: xP4 - x0,
      totalH: yBtm - y0,
    };
  };
};

const rscStandardEngine = createRscEngine(0.5, 0.5);
const openTopEngine = createRscEngine(0, 0.5);
const folEngine = createRscEngine(1.0, 1.0);
const mailerEngine = createMailerEngine();
const tuckEndEngine = createTuckEndEngine(false);
const crashLockEngine = createTuckEndEngine(true);
const trayEngine = createTrayEngine();
const sleeveEngine = createSleeveEngine();

// The Master Registry of Parametric Dieline CAD Engines
export const STANDARD_DIELINE_ENGINES: Record<string, (params: DielineEngineParams) => DielineEngineResult> = {
  // FEFCO 0200 Series
  'default-rsc': rscStandardEngine,
  'fefco-0201': rscStandardEngine,
  'fefco-0200': openTopEngine,
  'fefco-0203': folEngine,
  'fefco-0215': crashLockEngine,

  // FEFCO 0300 Series (Telescope & Tray)
  'fefco-0300': trayEngine,
  'fefco-0301': trayEngine,
  'fefco-0320': trayEngine,

  // FEFCO 0400 Series (Mailer & Folders)
  'fefco-0427': mailerEngine,
  'fefco-pizza': mailerEngine,
  'fefco-0409': mailerEngine,
  'fefco-0470': mailerEngine,

  // FEFCO 0700 Series (Auto lock)
  'fefco-0713': crashLockEngine,

  // ECMA Standard Cartons
  'ecma-a2020': tuckEndEngine,
  'snap-lock-123': crashLockEngine,
  'ecma-a30': tuckEndEngine,
  'ecma-b10': sleeveEngine,
  'ecma-c1020': trayEngine,
  'ecma-d50': trayEngine,
};
