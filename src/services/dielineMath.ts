export interface DielineCalculationResult {
  sheetWidth: number;
  sheetHeight: number;
  grossArea: number;
  netArea: number;
  wastePercentage: number;
  cutLength: number;
  creaseLength: number;
  glueTab: number;
  tuck: number;
  dustFlap: number;
}

/**
 * Calculates metrics using the selected dieline engine's paths and bounds.
 * Dimensions and path lengths are millimetres; areas are square metres.
 * Waste is only a rough bounding-box estimate, not a nesting/yield result.
 *
 * Argument order is intentionally compatible with existing UI callers:
 * (length, width, height, boardCaliper, templateId).
 */
export const calculateDielineParameters = (
  l: number,
  w: number,
  h: number,
  caliper: number = 3,
  fefcoCode: string = 'fefco-0201',
  requestedGlueTab?: number,
  dimensionConvention: 'inside' | 'outside' = 'inside',
  requestedSlotGap?: number
): DielineCalculationResult => {
  const normalizedCode = fefcoCode.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const aliases: Record<string, string> = {
    'ecma-a20-20': 'ecma-a2020',
    'ecma-a-20-20': 'ecma-a2020',
    'ecma-reverse-tuck-end': 'ecma-a2020',
    'fefco-0201-rsc': 'fefco-0201',
  };
  const candidateId = normalizedCode.startsWith('fefco-') || normalizedCode.startsWith('ecma-') || normalizedCode === 'default-rsc' || normalizedCode === 'snap-lock-123'
    ? normalizedCode
    : `fefco-${normalizedCode.replace(/^fefco-/, '')}`;
  const engineId = aliases[candidateId] || candidateId;
  const engine = STANDARD_DIELINE_ENGINES[engineId] || STANDARD_DIELINE_ENGINES['default-rsc'];
  const safeL = Number.isFinite(l) ? Math.max(1, l) : 1;
  const safeW = Number.isFinite(w) ? Math.max(1, w) : 1;
  const safeH = Number.isFinite(h) ? Math.max(1, h) : 1;
  const safeCaliper = Number.isFinite(caliper) ? Math.max(0.2, caliper) : 3;
  const safeGlueTab = Number.isFinite(requestedGlueTab)
    ? Math.max(5, Math.min(200, requestedGlueTab as number))
    : Math.max(15, Math.min(35, safeL * 0.18));
  const safeSlotGap = Number.isFinite(requestedSlotGap)
    ? Math.max(1, Math.min(10, requestedSlotGap as number))
    : Math.max(1, Math.min(6, safeCaliper * 1.5));
  const geometry = engine({
    L: safeL,
    W: safeW,
    H: safeH,
    thickness: safeCaliper,
    glueTab: safeGlueTab,
    slotGap: safeSlotGap,
    dimensionConvention,
    x0: 0,
  });

  const pathLength = (path: string): number => {
    const commands = path.match(/[MLZ][^MLZ]*/g) || [];
    let current: [number, number] | null = null;
    let first: [number, number] | null = null;
    let length = 0;
    for (const raw of commands) {
      const command = raw[0];
      if (command === 'Z') {
        if (current && first) length += Math.hypot(current[0] - first[0], current[1] - first[1]);
        current = first;
        continue;
      }
      const values = raw.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
      for (let i = 0; i + 1 < values.length; i += 2) {
        const point: [number, number] = [values[i], values[i + 1]];
        if (command === 'M' && i === 0) {
          current = point;
          first = point;
        } else if (current) {
          length += Math.hypot(point[0] - current[0], point[1] - current[1]);
          current = point;
        }
      }
    }
    return length;
  };

  const grossArea = (geometry.totalW * geometry.totalH) / 1_000_000;
  // Estimate blank area from the actual panel/flap construction for the FEFCO 0200 slotted family.
  // Other engines use a conservative box-surface proxy until their individual panel maps are modeled.
  const isSlottedCase = ['default-rsc', 'fefco-0200', 'fefco-0201', 'fefco-0203', 'fefco-0204'].includes(engineId);
  let blankAreaMm2: number;
  if (isSlottedCase) {
    const glue = safeGlueTab;
    const panelL = dimensionConvention === 'inside' ? safeL + safeCaliper : safeL;
    const panelW = dimensionConvention === 'inside' ? safeW + safeCaliper : safeW;
    const panelH = dimensionConvention === 'inside' ? safeH + safeCaliper : safeH;
    const slotGap = safeSlotGap;
    const sidePanelArea = (2 * panelL + 2 * panelW + glue) * panelH;
    const totalPanelSpan = 2 * panelL + 2 * panelW;
    const halfFlapPerEdge = totalPanelSpan * Math.max(0, (panelW - slotGap) / 2);
    const widthPanelsMeetArea = Math.max(0, 2 * panelL * panelW - slotGap * (panelL + panelW));
    const fullFlapPerEdge = totalPanelSpan * Math.max(0, panelW - slotGap);
    const flapArea = engineId === 'fefco-0204' ? widthPanelsMeetArea : halfFlapPerEdge;
    const topFlaps = engineId === 'fefco-0200' ? 0 : engineId === 'fefco-0203' ? fullFlapPerEdge : flapArea;
    const bottomFlaps = engineId === 'fefco-0203' ? fullFlapPerEdge : flapArea;
    blankAreaMm2 = sidePanelArea + topFlaps + bottomFlaps;
  } else {
    blankAreaMm2 = 2 * safeL * safeW + 2 * safeL * safeH + 2 * safeW * safeH;
  }
  const netArea = Math.max(0, blankAreaMm2 / 1_000_000);
  const wastePercentage = grossArea > 0
    ? Math.max(0, Math.min(100, Math.round(((grossArea - Math.min(grossArea, netArea)) / grossArea) * 100)))
    : 0;

  return {
    sheetWidth: geometry.totalW,
    sheetHeight: geometry.totalH,
    grossArea: Number(grossArea.toFixed(4)),
    netArea: Number(netArea.toFixed(4)),
    wastePercentage,
    cutLength: Math.round(geometry.cuts.reduce((sum, path) => sum + pathLength(path), 0)),
    creaseLength: Math.round(geometry.creases.reduce((sum, path) => sum + pathLength(path), 0)),
    glueTab: safeGlueTab,
    tuck: Math.max(15, Math.min(30, safeL * 0.18)),
    dustFlap: Math.max(12, Math.min(50, safeW * 0.42)),
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
  slotGap?: number;
  dimensionConvention?: 'inside' | 'outside';
  lidHeight?: number;
  /** Total plan-view size difference added to the lid over the base outside size (mm). */
  lidClearance?: number;
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
// FEFCO 0201 flap height is based on half the box width (W/2), with a
// material/slot clearance. The same flap depth is used across all four panels;
// panel width changes the flap's span, not its fold depth.
export const getRscFlapDepths = (_L: number, W: number, topRatio = 0.5, bottomRatio = 0.5, clearance = 2) => {
  const depth = (ratio: number) => ratio <= 0 ? 0 : Math.max(0, W * ratio - clearance);
  return {
    top: [depth(topRatio), depth(topRatio), depth(topRatio), depth(topRatio)],
    bottom: [depth(bottomRatio), depth(bottomRatio), depth(bottomRatio), depth(bottomRatio)],
  };
};

const createRscEngine = (flapRatioTop = 0.5, flapRatioBottom = 0.5) => {
  return ({ L, W, H, glueTab = 35, thickness = 1.6, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const G = Math.max(12, glueTab || 35);
    // Caliper-aware opposing-flap relief: a starting allowance only, not a machine-calibrated rule.
    const flapClearance = Math.max(1, Math.min(6, thickness * 1.5));
    const depths = getRscFlapDepths(L, W, flapRatioTop, flapRatioBottom, flapClearance);
    const topMax = Math.max(...depths.top);
    const bottomMax = Math.max(...depths.bottom);

    // Body crease lines stay level; individual flap depths create the correct stepped outline.
    const yTop = 40 + topMax;
    const yBottom = yTop + H;
    const yMin = yTop - topMax;
    const yMax = yBottom + bottomMax;

    const xG = x0 + G;
    const xP1 = xG + L;
    const xP2 = xP1 + W;
    const xP3 = xP2 + L;
    const xP4 = xP3 + W;
    const panelXs = [xG, xP1, xP2, xP3, xP4];

    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // Glue flap and its trimmed outside corners.
    cuts.push(`M ${x0 + 4} ${yTop} L ${x0} ${yTop + 4} L ${x0} ${yBottom - 4} L ${x0 + 4} ${yBottom}`);
    cuts.push(`M ${x0 + 4} ${yTop} L ${xG} ${yTop}`);
    cuts.push(`M ${x0 + 4} ${yBottom} L ${xG} ${yBottom}`);
    creases.push(`M ${xG} ${yTop} L ${xG} ${yBottom}`);

    // Top and bottom flaps use the dimension perpendicular to the wall, not one shared depth.
    for (let i = 0; i < 4; i++) {
      const left = panelXs[i];
      const right = panelXs[i + 1];
      const topDepth = depths.top[i];
      const bottomDepth = depths.bottom[i];

      if (topDepth > 0) {
        cuts.push(`M ${left} ${yTop} L ${left} ${yTop - topDepth} L ${right} ${yTop - topDepth} L ${right} ${yTop}`);
      } else {
        cuts.push(`M ${left} ${yTop} L ${right} ${yTop}`);
      }

      if (bottomDepth > 0) {
        cuts.push(`M ${left} ${yBottom} L ${left} ${yBottom + bottomDepth} L ${right} ${yBottom + bottomDepth} L ${right} ${yBottom}`);
      } else {
        cuts.push(`M ${left} ${yBottom} L ${right} ${yBottom}`);
      }
    }

    // Outer right wall cut; the three interior panel boundaries are creases.
    cuts.push(`M ${xP4} ${yTop} L ${xP4} ${yBottom}`);
    if (topMax > 0) creases.push(`M ${xG} ${yTop} L ${xP4} ${yTop}`);
    if (bottomMax > 0) creases.push(`M ${xG} ${yBottom} L ${xP4} ${yBottom}`);
    creases.push(`M ${xP1} ${yTop} L ${xP1} ${yBottom}`);
    creases.push(`M ${xP2} ${yTop} L ${xP2} ${yBottom}`);
    creases.push(`M ${xP3} ${yTop} L ${xP3} ${yBottom}`);

    const yMid = (yTop + yBottom) / 2;
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
      yMin,
      xMax: xP4,
      yMax,
      totalW: xP4 - x0,
      totalH: yMax - yMin,
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
  return ({ L, W, H, glueTab = 15, tuck = 20, dustFlap = 15, autoLockAngle = 45, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
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

    // Production-style corner relief for dust flaps and a locking notch in each tuck tongue.
    const dustFlapPath = (left: number, right: number, hingeY: number, depth: number, direction: -1 | 1) => {
      const shoulder = Math.min(depth, (right - left) / 2);
      const outerY = hingeY + direction * depth;
      // Angled shoulders start at the hinge endpoints; this prevents a short
      // dust-flap side cut duplicating part of a neighbouring deeper flap slot.
      return `M ${left} ${hingeY} L ${left + shoulder} ${outerY} L ${right - shoulder} ${outerY} L ${right} ${hingeY}`;
    };

    // Glue tab
    cuts.push(`M ${x0 + 3} ${yBodyTop} L ${x0} ${yBodyTop + 3} L ${x0} ${yBodyBtm - 3} L ${x0 + 3} ${yBodyBtm}`);
    creases.push(`M ${xG} ${yBodyTop} L ${xG} ${yBodyBtm}`);

    // Top Tuck End Flap (on panel 1)
    cuts.push(`M ${x0 + 3} ${yBodyTop} L ${xG} ${yBodyTop}`);
    const topTuckInset = Math.min(L * 0.12, T * 0.6);
    const topSlotWidth = Math.min(L * 0.22, L - 2 * topTuckInset);
    const topSlotDepth = Math.min(T * 0.18, 6);
    const topTuckCenter = (xG + xP1) / 2;
    cuts.push(`M ${xG} ${yBodyTop} L ${xG} ${yTopFlap} L ${xG + topTuckInset} ${yTopTuck} L ${topTuckCenter - topSlotWidth / 2} ${yTopTuck} L ${topTuckCenter - topSlotWidth / 2} ${yTopTuck + topSlotDepth} L ${topTuckCenter + topSlotWidth / 2} ${yTopTuck + topSlotDepth} L ${topTuckCenter + topSlotWidth / 2} ${yTopTuck} L ${xP1 - topTuckInset} ${yTopTuck} L ${xP1} ${yTopFlap} L ${xP1} ${yBodyTop}`);
    creases.push(`M ${xG} ${yBodyTop} L ${xP1} ${yBodyTop}`);
    creases.push(`M ${xG} ${yTopFlap} L ${xP1} ${yTopFlap}`);

    // Dust flaps on Panel 2 and 4
    cuts.push(dustFlapPath(xP1, xP2, yBodyTop, DF, -1));
    creases.push(`M ${xP1} ${yBodyTop} L ${xP2} ${yBodyTop}`);

    cuts.push(`M ${xP2} ${yBodyTop} L ${xP3} ${yBodyTop}`);

    cuts.push(dustFlapPath(xP3, xP4, yBodyTop, DF, -1));
    creases.push(`M ${xP3} ${yBodyTop} L ${xP4} ${yBodyTop}`);

    // Bottom Flaps
    if (isStraightTuck) {
      // Straight-tuck variant: top and bottom tuck flaps are on the same main panel.
      cuts.push(`M ${xG} ${yBodyBtm} L ${xG} ${yBtmFlap} L ${xP1} ${yBtmFlap} L ${xP1} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP1} ${yBodyBtm}`);
      // yBtmFlap is the cut perimeter of the tuck tongue, not an additional score line.
      cuts.push(dustFlapPath(xP1, xP2, yBodyBtm, DF, 1));
      creases.push(`M ${xP1} ${yBodyBtm} L ${xP2} ${yBodyBtm}`);
      cuts.push(`M ${xP2} ${yBodyBtm} L ${xP3} ${yBodyBtm}`);
      cuts.push(dustFlapPath(xP3, xP4, yBodyBtm, DF, 1));
      creases.push(`M ${xP3} ${yBodyBtm} L ${xP4} ${yBodyBtm}`);
    } else if (!isCrashLock) {
      // Panel 3 bottom tuck flap
      cuts.push(`M ${xG} ${yBodyBtm} L ${xG} ${yBodyBtm + DF} L ${xP1} ${yBodyBtm + DF} L ${xP1} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP1} ${yBodyBtm}`);

      cuts.push(`M ${xP1} ${yBodyBtm} L ${xP2} ${yBodyBtm}`);

      const bottomTuckInset = Math.min(L * 0.12, T * 0.6);
      const bottomSlotWidth = Math.min(L * 0.22, L - 2 * bottomTuckInset);
      const bottomSlotDepth = Math.min(T * 0.18, 6);
      const bottomTuckCenter = (xP2 + xP3) / 2;
      cuts.push(`M ${xP2} ${yBodyBtm} L ${xP2} ${yBtmFlap} L ${xP2 + bottomTuckInset} ${yBtmTuck} L ${bottomTuckCenter - bottomSlotWidth / 2} ${yBtmTuck} L ${bottomTuckCenter - bottomSlotWidth / 2} ${yBtmTuck - bottomSlotDepth} L ${bottomTuckCenter + bottomSlotWidth / 2} ${yBtmTuck - bottomSlotDepth} L ${bottomTuckCenter + bottomSlotWidth / 2} ${yBtmTuck} L ${xP3 - bottomTuckInset} ${yBtmTuck} L ${xP3} ${yBtmFlap} L ${xP3} ${yBodyBtm}`);
      creases.push(`M ${xP2} ${yBodyBtm} L ${xP3} ${yBodyBtm}`);
      creases.push(`M ${xP2} ${yBtmFlap} L ${xP3} ${yBtmFlap}`);

      cuts.push(dustFlapPath(xP3, xP4, yBodyBtm, DF, 1));
      creases.push(`M ${xP3} ${yBodyBtm} L ${xP4} ${yBodyBtm}`);
    } else {
      // Experimental crash-lock-inspired bottom. The long-panel shoulders scale
      // with the selected angle and actual flap depth rather than a fixed 10 mm.
      const angleDeg = Math.max(25, Math.min(65, Number.isFinite(autoLockAngle) ? autoLockAngle as number : 45));
      const angleRad = angleDeg * Math.PI / 180;
      const flapDepth = yBtmFlap - yBodyBtm;
      const lockRun = Math.min(L * 0.9, flapDepth / Math.tan(angleRad));
      cuts.push(`M ${xG} ${yBodyBtm} L ${xG} ${yBtmFlap} L ${xP1 - lockRun} ${yBtmFlap} L ${xP1} ${yBodyBtm}`);
      cuts.push(`M ${xP1} ${yBodyBtm} L ${xP2} ${yBtmFlap} L ${xP2} ${yBodyBtm}`);
      cuts.push(`M ${xP2} ${yBodyBtm} L ${xP3 - lockRun} ${yBtmFlap} L ${xP3} ${yBodyBtm}`);
      cuts.push(`M ${xP3} ${yBodyBtm} L ${xP4} ${yBtmFlap} L ${xP4} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP4} ${yBodyBtm}`);
      creases.push(`M ${xG} ${yBodyBtm} L ${xP1 - lockRun} ${yBtmFlap}`);
      // The second lock edge is a cut edge, not a crease; a score here would double-process the knife path.
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
/**
 * One-piece glued tray blank.
 * L/W/H are inside dimensions by default; panel dimensions include a basic
 * caliper allowance. Four rectangular corner tabs fold against the adjacent
 * side walls. This is a generic tray construction, not a claim of a certified
 * ECMA/FEFCO glued-tray code.
 */
const createTrayEngine = () => {
  return ({
    L, W, H, x0 = 50, thickness = 0.45, glueTab = 25,
    dimensionConvention = 'inside', variant = '',
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 0.45);
    const l = dimensionConvention === 'outside' ? Math.max(1, L - t) : L;
    const w = dimensionConvention === 'outside' ? Math.max(1, W - t) : W;
    const h = dimensionConvention === 'outside' ? Math.max(1, H - t) : H;
    const panelL = l + t;
    const panelW = w + t;
    const wall = h + t;
    const requestedTab = Number.isFinite(glueTab) ? glueTab : wall * 0.65;
    const tab = Math.max(4, Math.min(requestedTab, wall * 0.9, panelL * 0.2, panelW * 0.45));
    const cornerRelief = Math.min(tab * 0.35, wall * 0.25, 8);
    const xL = x0 + wall;
    const xR = xL + panelL;
    const y0 = 40;
    const yT = y0 + wall;
    const yB = yT + panelW;
    const xMin = xL - wall;
    const xMax = xR + wall;
    const yMin = yT - wall;
    const yMax = yB + wall;

    // Corner glue tabs have diagonal shoulders to relieve the folded four-wall intersections.
    const cuts = [
      `M ${xMin} ${yT} L ${xL - tab} ${yT} L ${xL - tab} ${yMin + cornerRelief} L ${xL - tab + cornerRelief} ${yMin} L ${xR + tab - cornerRelief} ${yMin} L ${xR + tab} ${yMin + cornerRelief} L ${xR + tab} ${yT} L ${xMax} ${yT} L ${xMax} ${yB} L ${xR + tab} ${yB} L ${xR + tab} ${yMax - cornerRelief} L ${xR + tab - cornerRelief} ${yMax} L ${xL - tab + cornerRelief} ${yMax} L ${xL - tab} ${yMax - cornerRelief} L ${xL - tab} ${yB} L ${xMin} ${yB} Z`,
    ];
    const creases = [
      `M ${xL} ${yT} L ${xR} ${yT}`,
      `M ${xL} ${yB} L ${xR} ${yB}`,
      `M ${xL} ${yT} L ${xL} ${yB}`,
      `M ${xR} ${yT} L ${xR} ${yB}`,
      `M ${xL} ${yMin} L ${xL} ${yT}`,
      `M ${xR} ${yMin} L ${xR} ${yT}`,
      `M ${xL} ${yB} L ${xL} ${yMax}`,
      `M ${xR} ${yB} L ${xR} ${yMax}`,
    ];
    const labels = [{
      x: (xL + xR) / 2,
      y: (yT + yB) / 2,
      text: `${variant ? variant + ' · ' : ''}${Math.round(L)} × ${Math.round(W)}mm · دیواره ${Math.round(H)}mm`,
    }];
    return {
      cuts, creases, labels,
      xMin, yMin, xMax, yMax,
      totalW: xMax - xMin,
      totalH: yMax - yMin,
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
      `M ${x0} ${y0} L ${xP4} ${y0} L ${xP4} ${yBtm} L ${x0} ${yBtm} Z`
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
      `M ${xB} ${yTuck} L ${xR} ${yTuck} L ${xR} ${yBackBottom} L ${xR + wall} ${yBackBottom} L ${xR + wall} ${yBaseBottom} L ${xR} ${yBaseBottom} L ${xR} ${yFrontBottom} L ${xB} ${yFrontBottom} L ${xB} ${yBaseBottom} L ${xB - wall} ${yBaseBottom} L ${xB - wall} ${yBackBottom} L ${xB} ${yBackBottom} Z`
    );

    // The outer side-wall boundaries are cut edges; the true hinge axes are
    // the vertical lines at xB and xR within the base panel (below).

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
/**
 * FEFCO 0320-style telescope: two independent half-slotted blanks.
 * H is the main body inside height; lidHeight controls the over-sleeve wall
 * depth and defaults to half H. Lid plan dimensions allow for board caliper
 * and a small adjustable-by-calibration fit allowance.
 */
const createTelescopicEngine = () => {
  return ({
    L, W, H, lidHeight, lidClearance, thickness = 1.5, glueTab = 30,
    slotGap, x0 = 50,
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 1.5);
    const G = Math.max(5, Math.min(200, Number.isFinite(glueTab) ? glueTab : 30));
    const lidH = Math.max(5, Number.isFinite(lidHeight) ? lidHeight as number : H * 0.5);
    const fit = Math.max(0.1, Number.isFinite(lidClearance) ? lidClearance as number : Math.max(0.8, t * 0.5));
    const layoutGap = Math.max(24, t * 10);
    const base = fefco0200Engine({
      L, W, H, thickness: t, glueTab: G, slotGap,
      dimensionConvention: 'inside', x0,
    });
    const lidL = L + 2 * t + fit;
    const lidW = W + 2 * t + fit;
    const lidX = base.xMax + layoutGap;
    const lid = fefco0200Engine({
      L: lidL, W: lidW, H: lidH, thickness: t, glueTab: G, slotGap,
      dimensionConvention: 'inside', x0: lidX,
    });
    const baseCenterX = (x0 + G + x0 + G + 2 * L + 2 * W + 4 * t) / 2;
    const baseCenterY = 40 + (H + t) / 2;
    const lidCenterX = (lidX + G + lidX + G + 2 * lidL + 2 * lidW + 4 * t) / 2;
    const lidCenterY = 40 + (lidH + t) / 2;
    const xMin = Math.min(base.xMin, lid.xMin);
    const yMin = Math.min(base.yMin, lid.yMin);
    const xMax = Math.max(base.xMax, lid.xMax);
    const yMax = Math.max(base.yMax, lid.yMax);
    return {
      cuts: [...base.cuts, ...lid.cuts],
      creases: [...base.creases, ...lid.creases],
      labels: [
        ...base.labels,
        ...lid.labels,
        { x: baseCenterX, y: baseCenterY, text: `قطعه ۱: زیره · ارتفاع بدنه ${Math.round(H)}mm` },
        { x: lidCenterX, y: lidCenterY, text: `قطعه ۲: درب · عمق دیواره ${Math.round(lidH)}mm` },
      ],
      xMin, yMin, xMax, yMax,
      totalW: xMax - xMin,
      totalH: yMax - yMin,
    };
  };
};

/** FEFCO 0300/0301-family baseline: separate tray-shaped base and lid. */
const createTelescopicTrayEngine = () => {
  return ({
    L, W, H, lidHeight, lidClearance, thickness = 1.5, glueTab = 30,
    x0 = 50, dimensionConvention = 'inside',
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 1.5);
    const fit = Math.max(0.1, Number.isFinite(lidClearance) ? lidClearance as number : Math.max(0.8, t * 0.5));
    const lidH = Math.max(5, Number.isFinite(lidHeight) ? lidHeight as number : H * 0.5);
    const layoutGap = Math.max(24, t * 10);
    const base = trayEngine({
      L, W, H, thickness: t, glueTab, x0, dimensionConvention, variant: 'زیره',
    });
    // Lid must pass over the outside of the base; clearance is explicit in the
    // independent cover blank, rather than hiding in a generic size multiplier.
    const lidL = L + 2 * t + fit;
    const lidW = W + 2 * t + fit;
    const lidX = base.xMax + layoutGap;
    const lid = trayEngine({
      L: lidL, W: lidW, H: lidH, thickness: t, glueTab,
      x0: lidX, dimensionConvention: 'inside', variant: 'درب',
    });
    const xMin = Math.min(base.xMin, lid.xMin);
    const yMin = Math.min(base.yMin, lid.yMin);
    const xMax = Math.max(base.xMax, lid.xMax);
    const yMax = Math.max(base.yMax, lid.yMax);
    return {
      cuts: [...base.cuts, ...lid.cuts],
      creases: [...base.creases, ...lid.creases],
      labels: [...base.labels, ...lid.labels],
      xMin, yMin, xMax, yMax,
      totalW: xMax - xMin,
      totalH: yMax - yMin,
    };
  };
};

type SlottedStyle = '0200' | '0201' | '0203' | '0204';

/**
 * Parametric FEFCO 0200-family baseline.
 * L/W/H inputs are inside dimensions by default. Board caliper is included in
 * score-to-score panel dimensions; the slot gap is explicit and machine-adjustable.
 * This is a dimensional baseline, not a replacement for a die-maker's crease rules.
 */
const createSlottedCaseEngine = (style: SlottedStyle) => {
  return ({
    L, W, H, glueTab = 35, thickness = 1.6, slotGap,
    dimensionConvention = 'inside', x0 = 50,
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 1.6);
    const G = Math.max(5, Math.min(200, Number.isFinite(glueTab) ? glueTab : 35));
    const gap = Math.max(1, Math.min(10, Number.isFinite(slotGap) ? slotGap as number : Math.max(1, Math.min(6, t * 1.5))));
    const innerL = dimensionConvention === 'outside' ? Math.max(1, L - t) : L;
    const innerW = dimensionConvention === 'outside' ? Math.max(1, W - t) : W;
    const innerH = dimensionConvention === 'outside' ? Math.max(1, H - t) : H;
    const panelL = innerL + t;
    const panelW = innerW + t;
    const panelH = innerH + t;
    const xs = [x0 + G, x0 + G + panelL, x0 + G + panelL + panelW, x0 + G + 2 * panelL + panelW, x0 + G + 2 * panelL + 2 * panelW];

    const halfDepth = Math.max(0, (panelW - gap) / 2);
    const longPanelDepth = Math.max(0, (panelL - gap) / 2);
    const fullDepth = Math.max(0, panelW - gap);
    // 0204's flaps attached to W-wide panels reach farther so opposing flaps meet.
    const widthPanelsMeet = [halfDepth, longPanelDepth, halfDepth, longPanelDepth];
    const topDepths = style === '0200'
      ? [0, 0, 0, 0]
      : style === '0203'
        ? [fullDepth, fullDepth, fullDepth, fullDepth]
        : style === '0204'
          ? widthPanelsMeet
          : [halfDepth, halfDepth, halfDepth, halfDepth];
    // 0200 has no top flaps but retains a normal set of bottom flaps.
    const bottomDepths = style === '0200'
      ? [halfDepth, halfDepth, halfDepth, halfDepth]
      : [...topDepths];

    const maxTop = Math.max(...topDepths);
    const maxBottom = Math.max(...bottomDepths);
    const yTop = 40 + maxTop;
    const yBottom = yTop + panelH;
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // Manufacturer's joint: complete the top and bottom edges of the glue flap,
    // and keep its external edge separate from the glue score.
    cuts.push(`M ${x0 + 4} ${yTop} L ${x0} ${yTop + 4} L ${x0} ${yBottom - 4} L ${x0 + 4} ${yBottom}`);
    cuts.push(`M ${x0 + 4} ${yTop} L ${xs[0]} ${yTop}`);
    cuts.push(`M ${x0 + 4} ${yBottom} L ${xs[0]} ${yBottom}`);
    cuts.push(`M ${xs[4]} ${yTop} L ${xs[4]} ${yBottom}`);

    // Scores: glue joint, four body corners, and top/bottom flap hinges.
    creases.push(`M ${xs[0]} ${yTop} L ${xs[0]} ${yBottom}`);
    for (let i = 1; i < 4; i++) creases.push(`M ${xs[i]} ${yTop} L ${xs[i]} ${yBottom}`);
    if (style !== '0200') creases.push(`M ${xs[0]} ${yTop} L ${xs[4]} ${yTop}`);
    creases.push(`M ${xs[0]} ${yBottom} L ${xs[4]} ${yBottom}`);

    // Use one straight outer edge per flap and one shared slot cut per panel seam.
    // This avoids diagonal "decorative" flap shoulders and duplicate knife paths.
    const addFlapEdge = (depths: number[], edgeY: number, direction: -1 | 1) => {
      depths.forEach((depth, i) => {
        if (depth <= 0) return;
        const outerY = edgeY + direction * depth;
        cuts.push(`M ${xs[i]} ${outerY} L ${xs[i + 1]} ${outerY}`);
        labels.push({
          x: (xs[i] + xs[i + 1]) / 2,
          y: (edgeY + outerY) / 2,
          text: `فلپ ${Math.round(depth)}mm`,
        });
      });
      for (let i = 0; i <= 4; i++) {
        const adjacentDepth = Math.max(i > 0 ? depths[i - 1] : 0, i < 4 ? depths[i] : 0);
        if (adjacentDepth > 0) {
          cuts.push(`M ${xs[i]} ${edgeY} L ${xs[i]} ${edgeY + direction * adjacentDepth}`);
        }
      }
    };

    addFlapEdge(topDepths, yTop, -1);
    addFlapEdge(bottomDepths, yBottom, 1);
    if (style === '0200') cuts.push(`M ${xs[0]} ${yTop} L ${xs[4]} ${yTop}`);

    // Print the user-entered product dimensions, not score-to-score dimensions, in labels.
    labels.push({ x: (xs[0] + xs[1]) / 2, y: (yTop + yBottom) / 2, text: `L ${Math.round(L)}mm` });
    labels.push({ x: (xs[1] + xs[2]) / 2, y: (yTop + yBottom) / 2, text: `W ${Math.round(W)}mm` });
    labels.push({ x: (xs[2] + xs[3]) / 2, y: (yTop + yBottom) / 2, text: `L ${Math.round(L)}mm` });
    labels.push({ x: (xs[3] + xs[4]) / 2, y: (yTop + yBottom) / 2, text: `W ${Math.round(W)}mm` });

    return {
      cuts, creases, labels,
      xMin: x0, yMin: yTop - maxTop, xMax: xs[4], yMax: yBottom + maxBottom,
      totalW: xs[4] - x0, totalH: yBottom + maxBottom - (yTop - maxTop),
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
  return ({
    L, W, H, glueTab = 22, thickness = 0.45, tuck = 20, dustFlap = 12,
    x0 = 50, autoLockAngle = 45, autoLockGlueWidth,
  }: DielineEngineParams): DielineEngineResult => {
    const safeL = Math.max(20, Number.isFinite(L) ? L : 20);
    const safeW = Math.max(20, Number.isFinite(W) ? W : 20);
    const safeH = Math.max(10, Number.isFinite(H) ? H : 10);
    const G = Math.max(5, Math.min(Number.isFinite(glueTab) ? glueTab : 22, safeH * 0.8));
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 0.45);
    const tuckDepth = Math.max(12, Math.min(Number.isFinite(tuck) ? tuck : 20, safeW * 0.95));
    const dustDepth = Math.max(8, Math.min(Number.isFinite(dustFlap) ? dustFlap : 12, safeW * 0.42));
    const angleDeg = Math.max(25, Math.min(65, Number.isFinite(autoLockAngle) ? autoLockAngle as number : 45));
    const angleRad = angleDeg * Math.PI / 180;
    const xs = [x0 + G, x0 + G + safeL, x0 + G + safeL + safeW, x0 + G + 2 * safeL + safeW, x0 + G + 2 * safeL + 2 * safeW];
    const topDepths = [tuckDepth, dustDepth, 0, dustDepth];
    const maxTop = Math.max(...topDepths);
    const yTop = 40 + maxTop;
    const yBottom = yTop + safeH;
    const lockDepth = Math.max(safeW * 0.48, 14);
    const requestedTongue = Number.isFinite(autoLockGlueWidth) ? autoLockGlueWidth as number : safeL * 0.34;
    const tongueWidth = Math.max(10, Math.min(requestedTongue, safeL * 0.42, safeW * 0.42));
    const tongueNeck = Math.max(7, tongueWidth * 0.72);
    const tongueProjection = Math.max(5, Math.min(safeW * 0.13, 18));
    const slotLength = tongueWidth + Math.max(1.2, t * 1.5);
    const slotWidth = Math.max(1.2, t * 2.2);
    const primaryOuter = yBottom + lockDepth;
    const receiverEdgeMargin = Math.max(3, t * 2);
    const receivingOuter = primaryOuter + tongueProjection + receiverEdgeMargin;
    const slotY = primaryOuter + tongueProjection - slotWidth / 2;
    const cornerRise = Math.max(2, Math.min(lockDepth * 0.18, safeW * 0.12, 8));
    const cornerRun = Math.min(safeL * 0.2, cornerRise / Math.tan(angleRad));
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    cuts.push(`M ${x0 + 4} ${yTop} L ${x0} ${yTop + 4} L ${x0} ${yBottom - 4} L ${x0 + 4} ${yBottom}`);
    cuts.push(`M ${xs[4]} ${yTop} L ${xs[4]} ${yBottom}`);
    creases.push(`M ${x0 + G} ${yTop} L ${x0 + G} ${yBottom}`);
    for (let i = 1; i < 4; i++) creases.push(`M ${xs[i]} ${yTop} L ${xs[i]} ${yBottom}`);
    creases.push(`M ${xs[0]} ${yBottom} L ${xs[4]} ${yBottom}`);

    for (let i = 0; i < 4; i++) {
      const xa = xs[i], xb = xs[i + 1], depth = topDepths[i];
      if (depth <= 0) {
        cuts.push(`M ${xa} ${yTop} L ${xb} ${yTop}`);
        continue;
      }
      const inset = Math.min(7, Math.max(2, (xb - xa) * 0.06));
      const outerY = yTop - depth;
      cuts.push(`M ${xa} ${yTop} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${yTop}`);
      creases.push(`M ${xa} ${yTop} L ${xb} ${yTop}`);
    }

    const tongueCenter = (xs[0] + xs[1]) / 2;
    const tongueLeft = tongueCenter - tongueWidth / 2;
    const tongueRight = tongueLeft + tongueWidth;
    const neckLeft = tongueCenter - tongueNeck / 2;
    const neckRight = neckLeft + tongueNeck;
    const tipInset = Math.max(2, Math.min(t * 1.5, tongueWidth * 0.12));
    cuts.push(
      `M ${xs[0]} ${yBottom} L ${xs[0]} ${primaryOuter - cornerRise} L ${xs[0] + cornerRun} ${primaryOuter} L ${neckLeft} ${primaryOuter} L ${tongueLeft} ${primaryOuter + tongueProjection * 0.45} L ${tongueLeft + tipInset} ${primaryOuter + tongueProjection} L ${tongueRight - tipInset} ${primaryOuter + tongueProjection} L ${tongueRight} ${primaryOuter + tongueProjection * 0.45} L ${neckRight} ${primaryOuter} L ${xs[1] - cornerRun} ${primaryOuter} L ${xs[1]} ${primaryOuter - cornerRise} L ${xs[1]} ${yBottom}`
    );
    creases.push(`M ${xs[0]} ${yBottom} L ${xs[1]} ${yBottom}`);

    for (const i of [1, 3]) {
      const xa = xs[i], xb = xs[i + 1];
      const inset = Math.min(6, Math.max(2, safeW * 0.07));
      const outerY = yBottom + dustDepth;
      cuts.push(`M ${xa} ${yBottom} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${yBottom}`);
      creases.push(`M ${xa} ${yBottom} L ${xb} ${yBottom}`);
    }

    const receiveLeft = xs[2] + (safeL - slotLength) / 2;
    const receiveRight = receiveLeft + slotLength;
    cuts.push(
      `M ${xs[2]} ${yBottom} L ${xs[2]} ${receivingOuter - cornerRise} L ${xs[2] + cornerRun} ${receivingOuter} L ${xs[3] - cornerRun} ${receivingOuter} L ${xs[3]} ${receivingOuter - cornerRise} L ${xs[3]} ${yBottom}`
    );
    cuts.push(`M ${receiveLeft} ${slotY} L ${receiveRight} ${slotY} L ${receiveRight} ${slotY + slotWidth} L ${receiveLeft} ${slotY + slotWidth} Z`);
    creases.push(`M ${xs[2]} ${yBottom} L ${xs[3]} ${yBottom}`);

    labels.push({ x: tongueCenter, y: (yTop + yBottom) / 2, text: 'بدنه L=' + Math.round(safeL) + 'mm' });
    labels.push({ x: (xs[1] + xs[2]) / 2, y: (yTop + yBottom) / 2, text: 'پهنا W=' + Math.round(safeW) + 'mm' });
    labels.push({ x: tongueCenter, y: primaryOuter + tongueProjection + 12, text: 'زبانه قفل ' + Math.round(tongueWidth) + 'mm · زاویه ' + Math.round(angleDeg) + '°' });
    labels.push({ x: (xs[2] + xs[3]) / 2, y: receivingOuter + 14, text: 'شیار دریافت‌کننده · خلاصی ' + slotWidth.toFixed(1) + 'mm' });
    labels.push({ x: (xs[0] + xs[4]) / 2, y: receivingOuter + 30, text: 'قفل پارامتریک؛ نمونه تاخورده و خلاصی واقعی ورق باید تأیید شود' });

    const xMin = x0;
    const yMin = yTop - maxTop;
    const yMax = receivingOuter + 30;
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
const telescopicTrayEngine = createTelescopicTrayEngine();
const sleeveEngine = createSleeveEngine();
const pizzaBoxEngine = createPizzaBoxEngine();

const telescopicEngine = createTelescopicEngine();

/** Drawer carton baseline: the inner tray and surrounding sleeve are separate blanks. */
const createDrawerBoxEngine = () => {
  return (params: DielineEngineParams): DielineEngineResult => {
    const { L, W, H, x0 = 50, thickness = 0.45, glueTab = 25 } = params;
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 0.45);
    const tray = trayEngine({ ...params, x0 });
    const clearance = Math.max(0.8, t * 1.5);
    const sleeveX = tray.xMax + Math.max(24, t * 8);
    const sleeve = sleeveEngine({
      ...params, L: L + 2 * t + clearance, W: W + 2 * t + clearance,
      H: Math.max(8, H * 0.55), glueTab, x0: sleeveX,
    });
    const yMin = Math.min(tray.yMin, sleeve.yMin);
    const yMax = Math.max(tray.yMax, sleeve.yMax);
    return {
      cuts: [...tray.cuts, ...sleeve.cuts],
      creases: [...tray.creases, ...sleeve.creases],
      labels: [
        ...tray.labels, ...sleeve.labels,
        { x: (tray.xMin + tray.xMax) / 2, y: tray.yMin + 8, text: 'قطعه ۱: سینی کشویی' },
        { x: (sleeve.xMin + sleeve.xMax) / 2, y: sleeve.yMin + 8, text: 'قطعه ۲: غلاف بیرونی' },
      ],
      xMin: tray.xMin, yMin, xMax: sleeve.xMax, yMax,
      totalW: sleeve.xMax - tray.xMin, totalH: yMax - yMin,
    };
  };
};

/**
 * Custom counter display-tray blank. This is intentionally not claimed as a verified ECMA D50 die.
 */
const createDisplayStandEngine = () => {
  return ({ L, W, H, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const safeL = Math.max(20, Number.isFinite(L) ? L : 20);
    const safeW = Math.max(20, Number.isFinite(W) ? W : 20);
    const safeH = Math.max(10, Number.isFinite(H) ? H : 10);
    const sideDepth = Math.max(12, Math.min(safeH, safeW * 0.55));
    const lipHeight = Math.max(10, Math.min(safeH * 0.35, safeW * 0.3));
    const xL = x0 + sideDepth, xR = xL + safeL;
    const yB = 40 + lipHeight, yT = yB + safeW, yRear = yT + safeH;
    const xMin = xL - sideDepth, xMax = xR + sideDepth;
    const cuts = [
      `M ${xL} ${yB - lipHeight} L ${xR} ${yB - lipHeight} L ${xR} ${yB} L ${xMax} ${yB} L ${xMax} ${yT} L ${xR} ${yT} L ${xR} ${yRear} L ${xL} ${yRear} L ${xL} ${yT} L ${xMin} ${yT} L ${xMin} ${yB} L ${xL} ${yB} Z`
    ];
    const creases = [
      `M ${xL} ${yB} L ${xR} ${yB}`,
      `M ${xL} ${yT} L ${xR} ${yT}`,
      `M ${xL} ${yB} L ${xL} ${yT}`,
      `M ${xR} ${yB} L ${xR} ${yT}`,
    ];
    const labels = [
      { x: (xL + xR) / 2, y: (yB + yT) / 2, text: `پایه ${Math.round(safeL)} × ${Math.round(safeW)}mm` },
      { x: (xL + xR) / 2, y: yT + safeH / 2, text: `دیواره پشتی ${Math.round(safeH)}mm` },
      { x: (xL + xR) / 2, y: yB - lipHeight / 2, text: `لبه جلویی ${Math.round(lipHeight)}mm` },
      { x: (xL + xR) / 2, y: yRear + 12, text: 'استند سفارشی؛ کد ECMA D50 و پایداری سازه تأیید نشده' },
    ];
    return {
      cuts, creases, labels, xMin, yMin: yB - lipHeight, xMax, yMax: yRear + 18,
      totalW: xMax - xMin, totalH: yRear + 18 - (yB - lipHeight),
    };
  };
};

const drawerBoxEngine = createDrawerBoxEngine();
const displayStandEngine = createDisplayStandEngine();

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
  // 0300 is retained as a clearly labelled generic family baseline.
  'fefco-0300': telescopicTrayEngine,
  'fefco-0301': telescopicTrayEngine,
  // 0320 is built from two independent FEFCO 0200-style half-slotted blanks.
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
  'ecma-c1020': drawerBoxEngine,
  'ecma-d50': displayStandEngine,
};
