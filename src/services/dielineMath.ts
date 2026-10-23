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
const createTuckEndEngine = (isCrashLock = false, isStraightTuck = false) => {
  return ({ L, W, H, glueTab = 15, tuck = 20, dustFlap = 15, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const G = Math.max(12, glueTab || 15);
    const T = Math.max(15, tuck || 20);
    const DF = Math.max(12, dustFlap || 15);

    const y0 = 30;
    const yTopTuck = y0;
    const yTopFlap = yTopTuck + T;
    const yBodyTop = yTopFlap + W;
    const yBodyBtm = yBodyTop + H;
    const yBtmFlap = yBodyBtm + (isCrashLock ? W * 0.75 : isStraightTuck ? T : W);
    const yBtmTuck = isCrashLock || isStraightTuck ? yBtmFlap : yBtmFlap + T;

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
    if (isStraightTuck) {
      // Straight-tuck variant: top and bottom tuck flaps are on the same main panel.
      cuts.push(`M ${xG} ${yBodyBtm} L ${xG} ${yBtmFlap} L ${xP1} ${yBtmFlap} L ${xP1} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP1} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBtmFlap} L ${xP1} ${yBtmFlap}`);
      cuts.push(`M ${xP1} ${yBodyBtm} L ${xP1} ${yBodyBtm + DF} L ${xP2} ${yBodyBtm + DF} L ${xP2} ${yBodyBtm}`);
      creases.push(`M ${xP1} ${yBodyBtm} L ${xP2} ${yBodyBtm}`);
      cuts.push(`M ${xP2} ${yBodyBtm} L ${xP3} ${yBodyBtm}`);
      cuts.push(`M ${xP3} ${yBodyBtm} L ${xP3} ${yBodyBtm + DF} L ${xP4} ${yBodyBtm + DF} L ${xP4} ${yBodyBtm}`);
      creases.push(`M ${xP3} ${yBodyBtm} L ${xP4} ${yBodyBtm}`);
    } else if (!isCrashLock) {
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


/**
 * Custom one-piece pizza / food carton. This is deliberately labelled as a
 * custom 04-series-inspired construction, not as an exact FEFCO-numbered die.
 * L/W are the base footprint; H is wall height; tuck is the front closure depth.
 */
const createPizzaBoxEngine = () => {
  return ({ L, W, H, tuck = 24, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const wall = Math.max(12, H);
    const T = Math.max(12, Math.min(tuck || 24, Math.min(L, W) * 0.35));
    const sideTab = Math.max(8, Math.min(wall * 0.45, W * 0.22));
    const xB = x0 + wall;
    const yTuck = 30;
    const yLidTop = yTuck + T;
    const yLidBottom = yLidTop + W;
    const yBackBottom = yLidBottom + wall;
    const yBaseBottom = yBackBottom + W;
    const yFrontBottom = yBaseBottom + wall;
    const xR = xB + L;
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // One continuous blank: front tuck + lid + back wall + base + front wall,
    // with side walls attached to the base. Side locking details are simplified.
    cuts.push(
      `M ${xB + 3} ${yTuck} L ${xR - 3} ${yTuck} L ${xR} ${yLidTop} L ${xR} ${yBackBottom - sideTab} L ${xR + wall} ${yBackBottom - sideTab} L ${xR + wall} ${yBackBottom} L ${xR + wall} ${yBaseBottom} L ${xR + wall} ${yBaseBottom + sideTab} L ${xR} ${yBaseBottom + sideTab} L ${xR} ${yBaseBottom} L ${xR} ${yFrontBottom} L ${xB} ${yFrontBottom} L ${xB} ${yBaseBottom} L ${xB} ${yBaseBottom + sideTab} L ${xB - wall} ${yBaseBottom + sideTab} L ${xB - wall} ${yBaseBottom} L ${xB - wall} ${yBackBottom} L ${xB - wall} ${yBackBottom - sideTab} L ${xB} ${yBackBottom - sideTab} L ${xB} ${yBackBottom} L ${xB} ${yLidTop} Z`
    );

    // Side tabs fold inward against the front/back walls to close the corners.
    creases.push(`M ${xB - wall} ${yBackBottom} L ${xB} ${yBackBottom}`);
    creases.push(`M ${xB - wall} ${yBaseBottom} L ${xB} ${yBaseBottom}`);
    creases.push(`M ${xR} ${yBackBottom} L ${xR + wall} ${yBackBottom}`);
    creases.push(`M ${xR} ${yBaseBottom} L ${xR + wall} ${yBaseBottom}`);

    // Creases: tuck/lid, lid/back, back/base, base/front and side-wall hinges.
    creases.push(`M ${xB} ${yLidTop} L ${xR} ${yLidTop}`);
    creases.push(`M ${xB} ${yLidBottom} L ${xR} ${yLidBottom}`);
    creases.push(`M ${xB} ${yBackBottom} L ${xR} ${yBackBottom}`);
    creases.push(`M ${xB} ${yBaseBottom} L ${xR} ${yBaseBottom}`);
    creases.push(`M ${xB} ${yBackBottom} L ${xB} ${yBaseBottom}`);
    creases.push(`M ${xR} ${yBackBottom} L ${xR} ${yBaseBottom}`);

    labels.push({ x: (xB + xR) / 2, y: (yBackBottom + yBaseBottom) / 2, text: `کفه ${Math.round(L)} × ${Math.round(W)}mm` });
    labels.push({ x: (xB + xR) / 2, y: (yLidTop + yLidBottom) / 2, text: 'درب' });
    labels.push({ x: (xB + xR) / 2, y: (yBaseBottom + yFrontBottom) / 2, text: `دیواره ${Math.round(wall)}mm` });

    return {
      cuts, creases, labels,
      xMin: xB - wall, yMin: yTuck, xMax: xR + wall, yMax: yFrontBottom,
      totalW: L + 2 * wall, totalH: yFrontBottom - yTuck
    };
  };
};

/**
 * Two-piece telescopic carton (separate base and lid) in a single flat layout.
 * H is the assembled total depth; it is split between base and lid. Lid clearance
 * uses the supplied board caliper as a starting point and must be calibrated.
 */
const createTelescopicEngine = () => {
  return ({ L, W, H, thickness = 1.5, glueTab = 30, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, thickness || 1.5);
    const G = Math.max(15, glueTab || 30);
    // FEFCO 0320 is a lid/base set based on two 0200-style pieces.
    // The editor's three-dimension input splits H as a default; production
    // drawings should expose lid height as an explicit fourth parameter.
    const baseH = Math.max(8, H * 0.65);
    const lidH = Math.max(8, H - baseH);
    const lidL = L + 2 * t + 0.8;
    const lidW = W + 2 * t + 0.8;
    const gap = Math.max(24, t * 10);
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    const addHalfSlottedPiece = (xStart: number, yStart: number, l: number, w: number, h: number, label: string) => {
      const xs = [xStart + G, xStart + G + l, xStart + G + l + w, xStart + G + 2 * l + w, xStart + G + 2 * l + 2 * w];
      const flap = w / 2;
      const yTop = yStart + flap;
      const yBottom = yTop + h;
      cuts.push(`M ${xStart + 4} ${yTop} L ${xStart} ${yTop + 4} L ${xStart} ${yBottom - 4} L ${xStart + 4} ${yBottom}`);
      cuts.push(`M ${xs[4]} ${yTop} L ${xs[4]} ${yBottom}`);
      cuts.push(`M ${xs[0]} ${yTop} L ${xs[4]} ${yTop}`); // open end of the 0200-style piece
      creases.push(`M ${xStart + G} ${yTop} L ${xStart + G} ${yBottom}`); // glue seam
      creases.push(`M ${xs[0]} ${yBottom} L ${xs[4]} ${yBottom}`);
      for (let i = 1; i < 4; i++) creases.push(`M ${xs[i]} ${yTop} L ${xs[i]} ${yBottom}`);

      for (let i = 0; i < 4; i++) {
        const xa = xs[i], xb = xs[i + 1];
        const inset = Math.min(6, Math.max(1, (xb - xa) * 0.05));
        const outerY = yBottom + flap;
        cuts.push(`M ${xa} ${yBottom} L ${xa} ${outerY - 3} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${outerY - 3} L ${xb} ${yBottom}`);
      }
      labels.push({ x: (xs[0] + xs[4]) / 2, y: (yTop + yBottom) / 2, text: `${label}: ${Math.round(l)} × ${Math.round(w)} × ${Math.round(h)}mm` });
      return { minX: xStart, minY: yTop - flap, maxX: xs[4], maxY: yBottom + flap };
    };

    const base = addHalfSlottedPiece(x0, 40, L, W, baseH, 'زیره');
    const lidX = base.maxX + gap;
    const lid = addHalfSlottedPiece(lidX, 40, lidL, lidW, lidH, 'درب');
    labels.push({ x: (base.minX + base.maxX) / 2, y: base.maxY + 14, text: 'قطعه ۱: زیره' });
    labels.push({ x: (lid.minX + lid.maxX) / 2, y: lid.maxY + 14, text: 'قطعه ۲: درب تلسکوپی' });
    labels.push({ x: (lid.minX + lid.maxX) / 2, y: lid.maxY + 30, text: 'ارتفاع درب پیش‌فرض است؛ برای تولید باید جداگانه تعیین شود' });

    return {
      cuts, creases, labels,
      xMin: base.minX, yMin: 40,
      xMax: lid.maxX, yMax: Math.max(base.maxY, lid.maxY) + 32,
      totalW: lid.maxX - base.minX,
      totalH: Math.max(base.maxY, lid.maxY) + 32 - 40
    };
  };
};


type SlottedStyle = '0200' | '0201' | '0203' | '0204';

/** Parametric slotted-case family with panel-specific flap depths. */
const createSlottedCaseEngine = (style: SlottedStyle) => {
  return ({ L, W, H, glueTab = 35, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const G = Math.max(15, glueTab || 35);
    const xs = [x0 + G, x0 + G + L, x0 + G + L + W, x0 + G + 2 * L + W, x0 + G + 2 * L + 2 * W];
    const topDepths = style === '0200'
      ? [0, 0, 0, 0]
      : style === '0203'
        ? [W, W / 2, W, W / 2]
        : style === '0204'
          ? [W / 2, L / 2, W / 2, L / 2]
          : [W / 2, W / 2, W / 2, W / 2];
    const bottomDepths = style === '0200' ? [W / 2, W / 2, W / 2, W / 2] : [...topDepths];
    const maxTop = Math.max(...topDepths);
    const maxBottom = Math.max(...bottomDepths);
    const yTop = 40 + maxTop;
    const yBottom = yTop + H;
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];
    const bevel = Math.min(8, Math.max(2, W * 0.04));

    // Manufacturer's joint, body perimeter and four vertical panel scores.
    cuts.push(`M ${x0 + 4} ${yTop} L ${x0} ${yTop + 4} L ${x0} ${yBottom - 4} L ${x0 + 4} ${yBottom}`);
    cuts.push(`M ${xs[4]} ${yTop} L ${xs[4]} ${yBottom}`);
    if (style !== '0200') creases.push(`M ${xs[0]} ${yTop} L ${xs[4]} ${yTop}`);
    creases.push(`M ${xs[0]} ${yBottom} L ${xs[4]} ${yBottom}`);
    creases.push(`M ${xs[0]} ${yTop} L ${xs[0]} ${yBottom}`);
    for (let i = 1; i < 4; i++) creases.push(`M ${xs[i]} ${yTop} L ${xs[i]} ${yBottom}`);

    const addFlap = (i: number, edgeY: number, depth: number, direction: -1 | 1) => {
      const xa = xs[i], xb = xs[i + 1];
      if (depth <= 0) return;
      const outerY = edgeY + direction * depth;
      const inset = Math.min(bevel, Math.max(1, (xb - xa) * 0.08));
      const shoulderY = outerY - direction * Math.min(bevel, depth * 0.35);
      cuts.push(`M ${xa} ${edgeY} L ${xa} ${shoulderY} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${shoulderY} L ${xb} ${edgeY}`);
      labels.push({ x: (xa + xb) / 2, y: (edgeY + outerY) / 2, text: `فلپ ${Math.round(depth)}mm` });
    };
    for (let i = 0; i < 4; i++) {
      addFlap(i, yTop, topDepths[i], -1);
      addFlap(i, yBottom, bottomDepths[i], 1);
    }
    if (style === '0200') cuts.push(`M ${xs[0]} ${yTop} L ${xs[4]} ${yTop}`);

    labels.push({ x: (xs[0] + xs[1]) / 2, y: (yTop + yBottom) / 2, text: `L ${Math.round(L)}mm` });
    labels.push({ x: (xs[1] + xs[2]) / 2, y: (yTop + yBottom) / 2, text: `W ${Math.round(W)}mm` });
    labels.push({ x: (xs[2] + xs[3]) / 2, y: (yTop + yBottom) / 2, text: `L ${Math.round(L)}mm` });
    labels.push({ x: (xs[3] + xs[4]) / 2, y: (yTop + yBottom) / 2, text: `W ${Math.round(W)}mm` });

    return {
      cuts, creases, labels,
      xMin: x0, yMin: yTop - maxTop, xMax: xs[4], yMax: yBottom + maxBottom,
      totalW: xs[4] - x0, totalH: H + maxTop + maxBottom
    };
  };
};

const fefco0200Engine = createSlottedCaseEngine('0200');
const fefco0201Engine = createSlottedCaseEngine('0201');
const fefco0203Engine = createSlottedCaseEngine('0203');
const fefco0204Engine = createSlottedCaseEngine('0204');


/**
 * Parametric manual snap-lock bottom.
 *
 * This is a geometry-first construction, not a claim of certified FEFCO/ECMA tooling.
 * Two opposing long-panel flaps form the locking pair: one has a tapered tongue,
 * the other a matching slot with clearance derived from board caliper. Side dust
 * flaps are shorter so they do not occupy the same locking interface.
 */
const createSnapLockBottomEngine = () => {
  return ({ L, W, H, glueTab = 22, thickness = 0.45, tuck = 20, dustFlap = 12, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const safeL = Math.max(20, L);
    const safeW = Math.max(20, W);
    const safeH = Math.max(10, H);
    const G = Math.max(12, Math.min(glueTab || 22, safeH * 0.8));
    const t = Math.max(0.2, thickness || 0.45);
    const tuckDepth = Math.max(12, Math.min(tuck || 20, safeW * 0.95));
    const dustDepth = Math.max(8, Math.min(dustFlap || 12, safeW * 0.42));
    const xs = [x0 + G, x0 + G + safeL, x0 + G + safeL + safeW, x0 + G + 2 * safeL + safeW, x0 + G + 2 * safeL + 2 * safeW];
    const topDepths = [tuckDepth, dustDepth, 0, dustDepth];
    const maxTop = Math.max(...topDepths);
    const yTop = 40 + maxTop;
    const yBottom = yTop + safeH;
    const lockDepth = Math.max(safeW * 0.48, 14);
    const tongueWidth = Math.max(10, Math.min(safeL * 0.34, safeW * 0.42));
    const tongueNeck = Math.max(7, tongueWidth * 0.72);
    const tongueProjection = Math.max(5, Math.min(safeW * 0.13, 18));
    const slotLength = tongueWidth + Math.max(1.2, t * 1.5);
    const slotWidth = Math.max(1.2, t * 2.2);
    const slotY = yBottom + lockDepth * 0.64;
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // Glue seam and body outline.
    cuts.push(`M ${x0 + 4} ${yTop} L ${x0} ${yTop + 4} L ${x0} ${yBottom - 4} L ${x0 + 4} ${yBottom}`);
    cuts.push(`M ${xs[4]} ${yTop} L ${xs[4]} ${yBottom}`);
    creases.push(`M ${x0 + G} ${yTop} L ${x0 + G} ${yBottom}`);
    for (let i = 1; i < 4; i++) creases.push(`M ${xs[i]} ${yTop} L ${xs[i]} ${yBottom}`);
    creases.push(`M ${xs[0]} ${yBottom} L ${xs[4]} ${yBottom}`);

    // Top: tuck flap on panel 1, dust flaps on the side panels.
    for (let i = 0; i < 4; i++) {
      const xa = xs[i], xb = xs[i + 1], depth = topDepths[i];
      if (depth <= 0) {
        cuts.push(`M ${xa} ${yTop} L ${xb} ${yTop}`);
        continue;
      }
      const inset = Math.min(7, Math.max(2, (xb - xa) * 0.06));
      const outerY = yTop - depth;
      cuts.push(`M ${xa} ${yTop} L ${xa} ${outerY + 3} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${outerY + 3} L ${xb} ${yTop}`);
      creases.push(`M ${xa} ${yTop} L ${xb} ${yTop}`);
    }

    // Bottom locking pair. The tongue is tapered at the shoulder and has a flat tip.
    const tongueLeft = (xs[1] + xs[0]) / 2 - tongueWidth / 2;
    const tongueRight = tongueLeft + tongueWidth;
    const neckLeft = (xs[1] + xs[0]) / 2 - tongueNeck / 2;
    const neckRight = neckLeft + tongueNeck;
    const mainInset = Math.min(7, Math.max(2, safeL * 0.045));
    const primaryOuter = yBottom + lockDepth;
    cuts.push(
      `M ${xs[0]} ${yBottom} L ${xs[0]} ${primaryOuter - 4} L ${xs[0] + mainInset} ${primaryOuter} L ${neckLeft} ${primaryOuter} L ${tongueLeft} ${primaryOuter + tongueProjection * 0.45} L ${tongueLeft + Math.max(2, t)} ${primaryOuter + tongueProjection} L ${tongueRight - Math.max(2, t)} ${primaryOuter + tongueProjection} L ${tongueRight} ${primaryOuter + tongueProjection * 0.45} L ${neckRight} ${primaryOuter} L ${xs[1] - mainInset} ${primaryOuter} L ${xs[1]} ${primaryOuter - 4} L ${xs[1]} ${yBottom}`
    );
    creases.push(`M ${xs[0]} ${yBottom} L ${xs[1]} ${yBottom}`);

    // Side dust flaps, shorter than the primary lock flap.
    for (const i of [1, 3]) {
      const xa = xs[i], xb = xs[i + 1];
      const inset = Math.min(6, Math.max(2, safeW * 0.07));
      const outerY = yBottom + dustDepth;
      cuts.push(`M ${xa} ${yBottom} L ${xa} ${outerY - 3} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${outerY - 3} L ${xb} ${yBottom}`);
      creases.push(`M ${xa} ${yBottom} L ${xb} ${yBottom}`);
    }

    // Opposing receiving flap with a closed, caliper-compensated slot.
    const receiveLeft = xs[2] + (safeL - slotLength) / 2;
    const receiveRight = receiveLeft + slotLength;
    const receivingOuter = yBottom + lockDepth * 0.9;
    cuts.push(
      `M ${xs[2]} ${yBottom} L ${xs[2]} ${receivingOuter - 3} L ${xs[2] + mainInset} ${receivingOuter} L ${receiveLeft - 3} ${receivingOuter} L ${receiveLeft} ${receivingOuter + slotWidth / 2} L ${receiveRight} ${receivingOuter + slotWidth / 2} L ${receiveRight + 3} ${receivingOuter} L ${xs[3] - mainInset} ${receivingOuter} L ${xs[3]} ${receivingOuter - 3} L ${xs[3]} ${yBottom}`
    );
    // Slot perimeter is an actual cut loop, not a decorative crease.
    cuts.push(`M ${receiveLeft} ${slotY} L ${receiveRight} ${slotY} L ${receiveRight} ${slotY + slotWidth} L ${receiveLeft} ${slotY + slotWidth} Z`);
    creases.push(`M ${xs[2]} ${yBottom} L ${xs[3]} ${yBottom}`);

    labels.push({ x: (xs[0] + xs[1]) / 2, y: (yTop + yBottom) / 2, text: `بدنه L=${Math.round(safeL)}mm` });
    labels.push({ x: (xs[1] + xs[2]) / 2, y: (yTop + yBottom) / 2, text: `پهنا W=${Math.round(safeW)}mm` });
    labels.push({ x: (xs[0] + xs[1]) / 2, y: primaryOuter + tongueProjection + 12, text: `زبانه قفل ${Math.round(tongueWidth)}mm` });
    labels.push({ x: (xs[2] + xs[3]) / 2, y: receivingOuter + 14, text: `شیار قفل؛ خلاصی ${slotWidth.toFixed(1)}mm` });
    labels.push({ x: (xs[0] + xs[4]) / 2, y: yBottom + lockDepth + tongueProjection + 30, text: 'قفل پارامتریک؛ پیش از ساخت تیغ، نمونه تاخورده و خلاصی ورق را تأیید کنید' });

    const xMin = x0;
    const yMin = yTop - maxTop;
    const yMax = Math.max(primaryOuter + tongueProjection, slotY + slotWidth, yBottom + dustDepth) + 12;
    return {
      cuts, creases, labels,
      xMin, yMin, xMax: xs[4], yMax,
      totalW: xs[4] - xMin, totalH: yMax - yMin,
    };
  };
};

const fefco0215Engine = createSnapLockBottomEngine();

const rscStandardEngine = createRscEngine(0.5, 0.5);
const openTopEngine = createRscEngine(0, 0.5);
const folEngine = createRscEngine(1.0, 1.0);
const mailerEngine = createMailerEngine();
const tuckEndEngine = createTuckEndEngine(false);
const straightTuckEngine = createTuckEndEngine(false, true);
const crashLockEngine = createTuckEndEngine(true);
const trayEngine = createTrayEngine();
const sleeveEngine = createSleeveEngine();
const pizzaBoxEngine = createPizzaBoxEngine();
const telescopicEngine = createTelescopicEngine();

// The Master Registry of Parametric Dieline CAD Engines
export const STANDARD_DIELINE_ENGINES: Record<string, (params: DielineEngineParams) => DielineEngineResult> = {
  // FEFCO 0200 Series
  'default-rsc': fefco0201Engine,
  'fefco-0201': fefco0201Engine,
  'fefco-0200': fefco0200Engine,
  'fefco-0203': fefco0203Engine,
  'fefco-0204': fefco0204Engine,
  'fefco-0215': fefco0215Engine,

  // FEFCO 0300 Series (Telescope & Tray)
  'fefco-0300': telescopicEngine,
  'fefco-0301': telescopicEngine,
  'fefco-0320': telescopicEngine,

  // FEFCO 0400 Series (Mailer & Folders)
  'fefco-0427': mailerEngine,
  'fefco-pizza': pizzaBoxEngine,
  'fefco-0409': mailerEngine,
  'fefco-0470': mailerEngine,

  // FEFCO 0700 Series (Auto lock)
  'fefco-0713': crashLockEngine,

  // ECMA Standard Cartons
  'ecma-a2020': tuckEndEngine,
  'ecma-ste': straightTuckEngine,
  'snap-lock-123': fefco0215Engine,
  'ecma-a30': tuckEndEngine,
  'ecma-b10': sleeveEngine,
  'ecma-c1020': trayEngine,
  'ecma-d50': trayEngine,
};
