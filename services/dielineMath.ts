export interface DielineDims {
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

export interface DielineResult {
  cuts: string[];
  creases: string[];
  glues?: string[];
  bleeds?: string[];
  perforations?: string[];
  labels: any[];
  totalW: number;
  totalH: number;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  glueTab?: number;
  tuck?: number;
  dustFlap?: number;
}

export type DielineEngine = (dims: DielineDims) => DielineResult;

/**
 * Specialized Flap and Lock Engineering Engine for packaging CAD geometry calculations:
 * - Friction tuck lock flaps with radius arcs
 * - Thumb notches (نیم‌هلال)
 * - Ventilation holes (سوراخ‌های تهویه)
 * - Beveled 15°/45° dust flaps
 * - Double roll-over wall locks and slots
 */
export class FlapAndLockEngine {
  /**
   * Generates SVG path string for a Thumb Notch Arc (نیم‌هلال انگشتی).
   * Ensures the arc cuts INWARD into the panel (concave notch), never bulging outwards into blank space.
   */
  static createThumbNotch(cx: number, cy: number, radius: number = 14, direction: 'top' | 'bottom' | 'left' | 'right' = 'top'): string {
    const r = Math.max(6, Math.min(25, radius));
    switch (direction) {
      case 'top':
        // Cut into panel below cy (towards positive Y)
        return `M ${(cx - r).toFixed(2)},${cy.toFixed(2)} A ${r} ${r} 0 0 1 ${(cx + r).toFixed(2)},${cy.toFixed(2)}`;
      case 'bottom':
        // Cut into panel above cy (towards negative Y)
        return `M ${(cx - r).toFixed(2)},${cy.toFixed(2)} A ${r} ${r} 0 0 0 ${(cx + r).toFixed(2)},${cy.toFixed(2)}`;
      case 'left':
        // Cut into panel to the right of cx (towards positive X)
        return `M ${cx.toFixed(2)},${(cy - r).toFixed(2)} A ${r} ${r} 0 0 1 ${cx.toFixed(2)},${(cy + r).toFixed(2)}`;
      case 'right':
        // Cut into panel to the left of cx (towards negative X)
        return `M ${cx.toFixed(2)},${(cy - r).toFixed(2)} A ${r} ${r} 0 0 0 ${cx.toFixed(2)},${(cy + r).toFixed(2)}`;
    }
  }

  /**
   * Generates SVG path string for circular ventilation/air holes
   */
  static createCircleHole(cx: number, cy: number, radius: number = 5): string {
    return `M ${(cx - radius).toFixed(2)},${cy.toFixed(2)} A ${radius} ${radius} 0 1 0 ${(cx + radius).toFixed(2)},${cy.toFixed(2)} A ${radius} ${radius} 0 1 0 ${(cx - radius).toFixed(2)},${cy.toFixed(2)}`;
  }

  /**
   * Generates SVG path string for a Friction Tuck Flap with smooth ECMA standard corner arcs (زبانه قفل استاندارد دایکاتی).
   * Standard geometry:
   * - Side tapers inward by 1.5mm - 2.5mm (earOffset / lock ear).
   * - Top corners round smoothly INWARD with radius earRadius (default 5-6mm) to a flat straight top edge.
   * - NEVER extends or bulges outwards past xLeft or xRight!
   */
  /**
   * Generates SVG path string for a Friction Tuck Flap with smooth ECMA standard corner arcs and outward friction ear locks (گوشواره قفل اصطکاکی).
   * ECMA A2020 Standard geometry:
   * - Side friction ear locks extend OUTWARD by 1.2mm - 1.8mm at base (xLeft - earLock, xRight + earLock) to snap behind box slit shoulders.
   * - Tapers inward smoothly towards the top with earRadius arcs.
   */
  static createFrictionTuckPath(
    xLeft: number,
    yBase: number,
    width: number,
    tuckHeight: number,
    earRadius: number = 6,
    isPointingUp: boolean = true,
    earLockWidth: number = 1.5
  ): string {
    const xRight = xLeft + width;
    const dyDir = isPointingUp ? -1 : 1;
    const tH = Math.abs(tuckHeight);
    const yTop = yBase + dyDir * tH;
    
    // Standard corner arc radius (bounded by tuck height and width)
    const R = Math.max(3, Math.min(earRadius, tH * 0.35, width * 0.12));
    // Taper inward by 2mm to 3.5mm for smooth insertion into carton
    const taper = Math.min(4, Math.max(2, width * 0.025));
    
    // Friction ear lock notch (گوشواره قفل اصطکاکی): extends 1.5mm OUTWARD beyond panel width L at 3mm height
    const notchDist = Math.min(3.5, tH * 0.2);
    const notchY = yBase + dyDir * notchDist;

    const xLeftTop = xLeft + taper;
    const xRightTop = xRight - taper;

    // Corner arc endpoints
    const xArcLeft = xLeftTop + R;
    const xArcRight = xRightTop - R;
    const yArcStart = yTop - dyDir * R;

    return [
      `M ${xLeft.toFixed(2)},${yBase.toFixed(2)}`,
      `L ${(xLeft - earLockWidth).toFixed(2)},${notchY.toFixed(2)}`,
      `L ${xLeftTop.toFixed(2)},${yArcStart.toFixed(2)}`,
      `A ${R} ${R} 0 0 ${isPointingUp ? 1 : 0} ${xArcLeft.toFixed(2)},${yTop.toFixed(2)}`,
      `L ${xArcRight.toFixed(2)},${yTop.toFixed(2)}`,
      `A ${R} ${R} 0 0 ${isPointingUp ? 1 : 0} ${xRightTop.toFixed(2)},${yArcStart.toFixed(2)}`,
      `L ${(xRight + earLockWidth).toFixed(2)},${notchY.toFixed(2)}`,
      `L ${xRight.toFixed(2)},${yBase.toFixed(2)}`
    ].join(' ');
  }

  /**
   * Generates SVG path string for 15°/45° Beveled Dust Flaps with hinge clearance notches
   */
  static createBeveledDustFlap(
    xLeft: number,
    yBase: number,
    width: number,
    flapHeight: number,
    bevelAngleDeg: number = 15,
    isPointingUp: boolean = true,
    hingeNotch: number = 2.0
  ): string {
    const bevelOffset = Math.min(width * 0.35, flapHeight * Math.tan((bevelAngleDeg * Math.PI) / 180));
    const dy = isPointingUp ? -flapHeight : flapHeight;
    const yTop = yBase + dy;
    
    const xLeftHinge = xLeft + hingeNotch;
    const xRightHinge = xLeft + width - hingeNotch;
    
    const x1 = xLeftHinge + bevelOffset;
    const x2 = xRightHinge - bevelOffset;

    return [
      `M ${xLeft.toFixed(2)},${yBase.toFixed(2)}`,
      `L ${xLeftHinge.toFixed(2)},${(yBase + (isPointingUp ? -1.5 : 1.5)).toFixed(2)}`,
      `L ${x1.toFixed(2)},${yTop.toFixed(2)}`,
      `L ${x2.toFixed(2)},${yTop.toFixed(2)}`,
      `L ${xRightHinge.toFixed(2)},${(yBase + (isPointingUp ? -1.5 : 1.5)).toFixed(2)}`,
      `L ${(xLeft + width).toFixed(2)},${yBase.toFixed(2)}`
    ].join(' ');
  }

  /**
   * ECMA A7000 Interlocking Hook Flap for Auto-Bottom Crash-Lock Boxes
   */
  static createInterlockingHookFlap(
    xLeft: number,
    yBase: number,
    width: number,
    flapHeight: number,
    diagAngleDeg: number = 45,
    isLeftSide: boolean = true
  ): string {
    const rad = (diagAngleDeg * Math.PI) / 180;
    const hookOffsetX = flapHeight / Math.tan(rad);
    const yTop = yBase + flapHeight;
    
    if (isLeftSide) {
      const xHook = xLeft + hookOffsetX;
      const xEnd = xLeft + width;
      return `M ${xLeft.toFixed(2)},${yBase.toFixed(2)} L ${xLeft.toFixed(2)},${yTop.toFixed(2)} L ${xHook.toFixed(2)},${yTop.toFixed(2)} L ${xEnd.toFixed(2)},${yBase.toFixed(2)}`;
    } else {
      const xStart = xLeft;
      const xHook = xLeft + width - hookOffsetX;
      const xRight = xLeft + width;
      return `M ${xStart.toFixed(2)},${yBase.toFixed(2)} L ${xHook.toFixed(2)},${yTop.toFixed(2)} L ${xRight.toFixed(2)},${yTop.toFixed(2)} L ${xRight.toFixed(2)},${yBase.toFixed(2)}`;
    }
  }
}

export const STANDARD_DIELINE_ENGINES: Record<string, DielineEngine> = {
  'default-rsc': ({ L, W, H, glueTab = 30, x0 = 0 }) => generateRSC(L, W, H, glueTab, x0),
  'fefco-0201': ({ L, W, H, glueTab = 30, x0 = 0 }) => generateRSC(L, W, H, glueTab, x0),
  'fefco-0200': ({ L, W, H, glueTab = 30, x0 = 0 }) => generateRSC(L, W, H, glueTab, x0, true),
  'fefco-0203': ({ L, W, H, glueTab = 30, x0 = 0 }) => generateRSC(L, W, H, glueTab, x0, false, true),
  'fefco-0427': generate0427,
  'fefco-pizza': generatePizzaBox,
  'fefco-0215': generate0215,
  'ecma-a2020': generateECMA_A2020,
  'ecma-a2021': generateECMA_A2021,
  'ecma-a30': generateECMA_A2021,
  'ecma-b10': generate0215,
  'ecma-c1020': generateECMA_C1020,
  'snap-lock-123': generateSnapLock123,
  'fefco-0300': generate0300,
  'fefco-0320': generateFEFCO_0320,
  'fefco-0409': generateFEFCO_0409,
  'fefco-0470': generateFEFCO_0409,
  'fefco-0713': generateFEFCO_0713,
};

export const calculateDielineParameters = (L: number, W: number, H: number, thickness: number = 1.5, modelId: string = '') => {
  let isSmallBoxActive = false;
  if (L < 50 || W < 50 || H < 50) isSmallBoxActive = true;
  
  // Caliper & Crease Compensation based on board thickness (تعدیل ضخامت مقوا و خط‌تا)
  const caliperOffset = Math.max(0.3, thickness * 0.5);
  
  let glueTab = 30;
  let tuck = 18;
  let dustFlap = 15;
  
  if (modelId === 'fefco-0427' || modelId === 'fefco-pizza') { 
    tuck = Math.min(45, Math.max(18, H * 0.82 + caliperOffset)); 
    dustFlap = Math.min(W * 0.45, Math.max(15, W * 0.38 - caliperOffset));
    glueTab = 0; 
  } else if (modelId === 'fefco-0215' || modelId.includes('auto-bottom') || modelId === 'fefco-0713') {
    // 45-degree angle precision for crash lock bottom
    tuck = Math.min(32, Math.max(14, W * 0.32));
    dustFlap = Math.min(W * 0.48, Math.max(20, W * 0.38));
    glueTab = Math.min(35, Math.max(18, H * 0.16 + caliperOffset));
  } else {
    tuck = Math.min(32, Math.max(12, W * 0.30));
    dustFlap = Math.min(W * 0.45, Math.max(W * 0.25, W * 0.35));
    glueTab = Math.min(35, Math.max(16, H * 0.15 + caliperOffset));
  }
  return { L, W, H, glueTab, tuck, dustFlap, x0: 0, isSmallBoxActive, caliperOffset };
};


// =========================================================================
// 1. FEFCO 0201 (RSC) / 0200 / 0203 - Corrugated Standard Containers
// =========================================================================
function generateRSC(L: number, W: number, H: number, glueTab: number, x0: number, isHalfSlotted = false, isFullOverlap = false): DielineResult {
  const flapH = isFullOverlap ? W : W / 2;
  const x1 = x0 + glueTab;
  const x2 = x1 + L;
  const x3 = x2 + W;
  const x4 = x3 + L;
  const x5 = x4 + W;

  const yMid = 120;
  const yTop = yMid - flapH;
  const yBot = yMid + H;
  const yMax = isHalfSlotted ? yBot : yBot + flapH;

  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];

  // Main horizontal creases
  if (!isHalfSlotted) creases.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  creases.push(`M ${x1},${yBot} L ${x5},${yBot}`);
  
  // Vertical creases separating panels
  creases.push(`M ${x1},${yMid} L ${x1},${yBot}`);
  creases.push(`M ${x2},${yMid} L ${x2},${yBot}`);
  creases.push(`M ${x3},${yMid} L ${x3},${yBot}`);
  creases.push(`M ${x4},${yMid} L ${x4},${yBot}`);

  // Tapered Glue Joint
  const gtTap = 5;
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap} L ${x1},${yBot} Z`);
  cuts.push(`M ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap}`);

  // Top Flaps cuts
  if (!isHalfSlotted) {
    cuts.push(`M ${x1},${yMid} L ${x1},${yTop} L ${x2},${yTop} L ${x2},${yMid}`);
    cuts.push(`M ${x2},${yMid} L ${x2},${yTop} L ${x3},${yTop} L ${x3},${yMid}`);
    cuts.push(`M ${x3},${yMid} L ${x3},${yTop} L ${x4},${yTop} L ${x4},${yMid}`);
    cuts.push(`M ${x4},${yMid} L ${x4},${yTop} L ${x5},${yTop} L ${x5},${yMid}`);
  } else {
    cuts.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  }

  // Bottom Flaps cuts
  cuts.push(`M ${x1},${yBot} L ${x1},${yMax} L ${x2},${yMax} L ${x2},${yBot}`);
  cuts.push(`M ${x2},${yBot} L ${x2},${yMax} L ${x3},${yMax} L ${x3},${yBot}`);
  cuts.push(`M ${x3},${yBot} L ${x3},${yMax} L ${x4},${yMax} L ${x4},${yBot}`);
  cuts.push(`M ${x4},${yBot} L ${x4},${yMax} L ${x5},${yMax} L ${x5},${yBot}`);

  // Right boundary cut
  cuts.push(`M ${x5},${yMid} L ${x5},${yBot}`);

  // Labels
  labels.push({ x: (x0+x1)/2, y: yMid + H/2, text: `${Math.round(glueTab)}`, lineW: glueTab });
  labels.push({ x: (x1+x2)/2, y: yMid + H/2, text: `L: ${Math.round(L)}`, lineW: L });
  labels.push({ x: (x2+x3)/2, y: yMid + H/2, text: `W: ${Math.round(W)}`, lineW: W });
  labels.push({ x: (x3+x4)/2, y: yMid + H/2, text: `L: ${Math.round(L)}`, lineW: L });
  labels.push({ x: (x4+x5)/2, y: yMid + H/2, text: `W: ${Math.round(W)}`, lineW: W });

  return { cuts, creases, glues, labels, totalW: x5 - x0, totalH: yMax - yTop, xMin: x0, yMin: yTop, xMax: x5, yMax, glueTab, tuck: 0, dustFlap: flapH };
}

// =========================================================================
// 2. ECMA A20.20 - Standard Tuck End Carton (Folding Carton)
// =========================================================================
function generateECMA_A2020({ L, W, H, glueTab = 15, tuck = 18, dustFlap = 15, x0 = 0 }: DielineDims): DielineResult {
  const x1 = x0 + glueTab;
  const x2 = x1 + W;
  const x3 = x2 + L;
  const x4 = x3 + W;
  const x5 = x4 + L;
  
  const yMid = 120;
  const yBot = yMid + H;
  
  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];
  
  // Horizontal Panel Creases
  creases.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  creases.push(`M ${x1},${yBot} L ${x5},${yBot}`);
  
  // Vertical Tube Creases
  creases.push(`M ${x1},${yMid} L ${x1},${yBot}`);
  creases.push(`M ${x2},${yMid} L ${x2},${yBot}`);
  creases.push(`M ${x3},${yMid} L ${x3},${yBot}`);
  creases.push(`M ${x4},${yMid} L ${x4},${yBot}`);

  // Top/Bottom Lid Crease (Panels 2 & 4: Length L)
  creases.push(`M ${x2},${yMid - W} L ${x3},${yMid - W}`);
  creases.push(`M ${x4},${yBot + W} L ${x5},${yBot + W}`);

  // Tapered Glue Tab
  const gtTap = 5;
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap} L ${x1},${yBot} Z`);
  cuts.push(`M ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap}`);

  // Top Lid + Friction Lock Tuck Flap (Panel 2)
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x2, yMid - W, L, tuck, 5, true));
  cuts.push(`M ${x2},${yMid} L ${x2},${yMid - W}`);
  cuts.push(`M ${x3},${yMid} L ${x3},${yMid - W}`);

  // Bottom Lid + Friction Lock Tuck Flap (Reverse Tuck - Panel 4)
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x4, yBot + W, L, tuck, 5, false));
  cuts.push(`M ${x4},${yBot} L ${x4},${yBot + W}`);
  cuts.push(`M ${x5},${yBot} L ${x5},${yBot + W}`);

  // Dust Flaps with 15° Bevels
  const dH = Math.min(W * 0.45, dustFlap);
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x1, yMid, W, dH, 15, true));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x3, yMid, W, dH, 15, true));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x1, yBot, W, dH, 15, false));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x3, yBot, W, dH, 15, false));

  // Thumb Notch Arc (نیم‌هلال) on top rear lid fold
  cuts.push(FlapAndLockEngine.createThumbNotch((x2 + x3) / 2, yMid - W, 12, 'bottom'));

  // Straight cuts between dust flaps and lid panel top/bottom
  cuts.push(`M ${x4},${yMid} L ${x5},${yMid}`);
  cuts.push(`M ${x2},${yBot} L ${x3},${yBot}`);

  // Right Outer Boundary
  cuts.push(`M ${x5},${yMid} L ${x5},${yBot}`);

  // Labels
  labels.push({ x: (x1+x2)/2, y: yMid + H/2, text: `W: ${Math.round(W)}`, lineW: W });
  labels.push({ x: (x2+x3)/2, y: yMid + H/2, text: `L: ${Math.round(L)}`, lineW: L });
  labels.push({ x: (x3+x4)/2, y: yMid + H/2, text: `W: ${Math.round(W)}`, lineW: W });
  labels.push({ x: (x4+x5)/2, y: yMid + H/2, text: `L: ${Math.round(L)}`, lineW: L });

  const yMin = yMid - W - tuck - 10;
  const yMax = yBot + W + tuck + 10;

  return { cuts, creases, glues, labels, totalW: x5 - x0, totalH: yMax - yMin, xMin: x0, yMin, xMax: x5, yMax, glueTab, tuck, dustFlap };
}

// =========================================================================
// 3. FEFCO 0427 - Mailer Box Pro (Post Box)
// =========================================================================
function generate0427({ L, W, H, glueTab = 0, tuck = 20, dustFlap = 18, x0 = 0 }: DielineDims): DielineResult {
  const xMid = 280;
  const x2 = xMid - L / 2;
  const x3 = xMid + L / 2;
  
  const yMid = 180;
  const y1 = yMid - W; 
  const y2 = y1 - H;   
  const yTuck = y2 - Math.max(18, H * 0.75); 
  
  const y3 = yMid + H; 
  const y4 = y3 + W;   
  const y5 = y4 + H;   
  const y6 = y5 + Math.max(16, H * 0.85); 

  const xMin = x2 - H * 2.2 - 20;
  const yMin = yTuck - 20;
  const xMax = x3 + H * 2.2 + 20;
  const yMax = y6 + 20;

  const creases: string[] = [];
  const cuts: string[] = [];
  const labels: any[] = [];

  // Main Lid & Base Horizontal Creases
  creases.push(`M ${x2},${y1} L ${x3},${y1}`);
  creases.push(`M ${x2},${yMid} L ${x3},${yMid}`);
  creases.push(`M ${x2},${y3} L ${x3},${y3}`);
  creases.push(`M ${x2},${y4} L ${x3},${y4}`);
  creases.push(`M ${x2},${y5} L ${x3},${y5}`);

  // Vertical Creases
  creases.push(`M ${x2},${y1} L ${x2},${y3}`);
  creases.push(`M ${x3},${y1} L ${x3},${y3}`);

  // Outer Top Tuck Lid with friction ears
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x2, y2, L, y2 - yTuck, 6, true));

  // Double Roll-Over Sidewalls (Left & Right of Base Tray)
  const tapW = H * 0.88;
  cuts.push(`M ${x2},${y1} L ${x2 - tapW},${y1} L ${x2 - tapW},${yMid} L ${x2},${yMid}`);
  cuts.push(`M ${x3},${y1} L ${x3 + tapW},${y1} L ${x3 + tapW},${yMid} L ${x3},${yMid}`);

  // Dust Flaps on Rear Panel with 45° chamfers
  cuts.push(`M ${x2},${y3} L ${x2 - tapW},${y3} L ${x2 - tapW},${y4} L ${x2},${y4}`);
  cuts.push(`M ${x3},${y3} L ${x3 + tapW},${y3} L ${x3 + tapW},${y4} L ${x3},${y4}`);

  // Front Tuck Wall & Locking Tabs
  cuts.push(`M ${x2},${y5} L ${x2},${y6} L ${x3},${y6} L ${x3},${y5}`);

  // Thumb Notch Arc (نیم‌هلال) on top front lid edge
  cuts.push(FlapAndLockEngine.createThumbNotch((x2 + x3) / 2, yTuck, 14, 'bottom'));

  // Base Floor Locking Slots for roll-over front wall tabs
  const slotW = 12;
  cuts.push(`M ${x2 + L * 0.15},${y4} L ${x2 + L * 0.15 + slotW},${y4}`);
  cuts.push(`M ${x3 - L * 0.15 - slotW},${y4} L ${x3 - L * 0.15},${y4}`);

  // Labels
  labels.push({ x: (x2+x3)/2, y: yMid + H/2, text: `L: ${Math.round(L)}`, lineW: L });
  labels.push({ x: (x2+x3)/2, y: y1 - W/2, text: `W: ${Math.round(W)}`, lineH: W });
  labels.push({ x: x2 + 10, y: yMid + H/2, text: `H: ${Math.round(H)}`, rotate: -90, lineH: H });

  return { cuts, creases, labels, totalW: xMax - xMin, totalH: yMax - yMin, xMin, yMin, xMax, yMax, glueTab: 0, tuck, dustFlap };
}

// =========================================================================
// 4. FEFCO 0426 - PIZZA BOX (True Die-Cut Pizza Container with Ventilation)
// =========================================================================
function generatePizzaBox({ L, W, H, x0 = 0 }: DielineDims): DielineResult {
  const h = Math.max(25, H);
  const x2 = x0 + h * 2 + 35;
  const x3 = x2 + L;
  
  const yMid = 220; // Base panel top fold line
  const y1 = yMid - h; // Rear wall top fold line
  const y2 = y1 - W; // Top lid top fold line
  const yTuck = y2 - Math.max(18, h * 0.65); // Top lid tuck flap edge
  
  const y3 = yMid + W; // Base panel bottom fold line
  const y4 = y3 + h; // Front wall roll-over fold line
  const y5 = y4 + h - 2; // Front wall inner flap edge

  const cuts: string[] = [];
  const creases: string[] = [];
  const labels: any[] = [];

  // Main Horizontal Creases
  creases.push(`M ${x2},${y1} L ${x3},${y1}`);
  creases.push(`M ${x2},${yMid} L ${x3},${yMid}`);
  creases.push(`M ${x2},${y3} L ${x3},${y3}`);
  creases.push(`M ${x2},${y4} L ${x3},${y4}`);
  creases.push(`M ${x2},${y2} L ${x3},${y2}`);

  // Main Vertical Creases (Base & Rear Wall)
  creases.push(`M ${x2},${yMid} L ${x2},${y3}`);
  creases.push(`M ${x3},${yMid} L ${x3},${y3}`);

  // Outer Side Wall Roll-Over Creases (Left & Right)
  creases.push(`M ${x2 - h},${yMid} L ${x2 - h},${y3}`);
  creases.push(`M ${x3 + h},${yMid} L ${x3 + h},${y3}`);

  // Lid Side Flap Creases
  creases.push(`M ${x2},${y2} L ${x2},${y1}`);
  creases.push(`M ${x3},${y2} L ${x3},${y1}`);

  // --- CUT PATHS ---

  // Top Lid Front Tuck Flap with smooth friction lock ears
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x2, y2, L, y2 - yTuck, 8, true));

  // Lid Side Flaps (Left & Right Wings) with 45° rounded lead ears
  cuts.push(`M ${x2},${y2} L ${x2 - h + 2},${y2 + 10} L ${x2 - h + 2},${y1 - 2} L ${x2},${y1}`);
  cuts.push(`M ${x3},${y2} L ${x3 + h - 2},${y2 + 10} L ${x3 + h - 2},${y1 - 2} L ${x3},${y1}`);

  // Rear Wall Corner Flaps (Fold 90° inside base side walls)
  cuts.push(`M ${x2},${y1} L ${x2 - h + 3},${y1 + 4} L ${x2 - h + 3},${yMid - 4} L ${x2},${yMid}`);
  cuts.push(`M ${x3},${y1} L ${x3 + h - 3},${y1 + 4} L ${x3 + h - 3},${yMid - 4} L ${x3},${yMid}`);

  // Left Base Double Roll-Over Side Wall Outer & Inner Flap with Locking Tabs
  cuts.push(
    `M ${x2 - h},${yMid} ` +
    `L ${x2 - h * 1.92},${yMid + 4} ` +
    `L ${x2 - h * 1.92},${yMid + W * 0.28} ` +
    `L ${x2 - h * 2.1},${yMid + W * 0.28} L ${x2 - h * 2.1},${yMid + W * 0.28 + 14} L ${x2 - h * 1.92},${yMid + W * 0.28 + 14} ` +
    `L ${x2 - h * 1.92},${yMid + W * 0.68} ` +
    `L ${x2 - h * 2.1},${yMid + W * 0.68} L ${x2 - h * 2.1},${yMid + W * 0.68 + 14} L ${x2 - h * 1.92},${yMid + W * 0.68 + 14} ` +
    `L ${x2 - h * 1.92},${y3 - 4} ` +
    `L ${x2 - h},${y3}`
  );

  // Right Base Double Roll-Over Side Wall Outer & Inner Flap with Locking Tabs
  cuts.push(
    `M ${x3 + h},${yMid} ` +
    `L ${x3 + h * 1.92},${yMid + 4} ` +
    `L ${x3 + h * 1.92},${yMid + W * 0.28} ` +
    `L ${x3 + h * 2.1},${yMid + W * 0.28} L ${x3 + h * 2.1},${yMid + W * 0.28 + 14} L ${x3 + h * 1.92},${yMid + W * 0.28 + 14} ` +
    `L ${x3 + h * 1.92},${yMid + W * 0.68} ` +
    `L ${x3 + h * 2.1},${yMid + W * 0.68} L ${x3 + h * 2.1},${yMid + W * 0.68 + 14} L ${x3 + h * 1.92},${yMid + W * 0.68 + 14} ` +
    `L ${x3 + h * 1.92},${y3 - 4} ` +
    `L ${x3 + h},${y3}`
  );

  // Front Wall Corner Flaps (Left & Right)
  cuts.push(`M ${x2},${y3} L ${x2 - h + 3},${y3 + 3} L ${x2 - h + 3},${y4 - 3} L ${x2},${y4}`);
  cuts.push(`M ${x3},${y3} L ${x3 + h - 3},${y3 + 3} L ${x3 + h - 3},${y4 - 3} L ${x3},${y4}`);

  // Front Wall Inner Roll-Over Flap
  cuts.push(`M ${x2},${y4} L ${x2 + 3},${y5} L ${x3 - 3},${y5} L ${x3},${y4}`);

  // Base Floor Locking Slots for Side Wall Tabs
  cuts.push(`M ${x2 + 1},${yMid + W * 0.28} L ${x2 + 1},${yMid + W * 0.28 + 14}`);
  cuts.push(`M ${x2 + 1},${yMid + W * 0.68} L ${x2 + 1},${yMid + W * 0.68 + 14}`);
  cuts.push(`M ${x3 - 1},${yMid + W * 0.28} L ${x3 - 1},${yMid + W * 0.28 + 14}`);
  cuts.push(`M ${x3 - 1},${yMid + W * 0.68} L ${x3 - 1},${yMid + W * 0.68 + 14}`);

  // Ventilation Air Holes (سوراخ‌های تهویه هوا) on Rear Wall
  cuts.push(FlapAndLockEngine.createCircleHole(x2 + L * 0.25, yMid - h / 2, 6));
  cuts.push(FlapAndLockEngine.createCircleHole(x2 + L * 0.75, yMid - h / 2, 6));

  // Thumb Notch Arc (نیم‌هلال) on Front Wall Roll-Over Crease
  cuts.push(FlapAndLockEngine.createThumbNotch((x2 + x3) / 2, y4, 15, 'bottom'));

  // Labels
  labels.push({ x: (x2 + x3) / 2, y: yMid + W / 2, text: `پایه پیتزا: ${Math.round(L)} × ${Math.round(W)} mm` });
  labels.push({ x: (x2 + x3) / 2, y: yMid - h / 2, text: `ارتفاع: ${Math.round(H)} mm` });

  const xMin = x2 - h * 2.2 - 15;
  const yMin = yTuck - 15;
  const xMax = x3 + h * 2.2 + 15;
  const yMax = y5 + 15;

  return { cuts, creases, labels, totalW: xMax - xMin, totalH: yMax - yMin, xMin, yMin, xMax, yMax, glueTab: 0, tuck: Math.round(h * 0.65), dustFlap: h };
}

// =========================================================================
// 5. FEFCO 0215 - Crash Lock Auto-Bottom Box (ECMA A7000 Standard)
// =========================================================================
function generate0215({
  L, W, H,
  glueTab = 15,
  tuck = 18,
  dustFlap = 15,
  x0 = 0,
  thickness = 0.4,
  autoLockAngle = 45,
  autoLockGlueWidth = 15
}: DielineDims): DielineResult {
  const x1 = x0 + glueTab;
  const x2 = x1 + L;
  const x3 = x2 + W;
  const x4 = x3 + L;
  const x5 = x4 + W;

  const yMid = 140;
  const yB = yMid + H;

  // Dynamic Caliper (thickness T) compensation factors
  const T = Math.max(0.1, thickness);
  const clampedAngle = Math.min(55, Math.max(35, autoLockAngle));
  const angleRad = (clampedAngle * Math.PI) / 180;
  const tanAngle = Math.tan(angleRad); // e.g., tan(45°) = 1.0

  // Standard ECMA / FEFCO 0215 Glued Auto-Bottom Base Flap Height
  // hFlap is derived directly from Width W to reach center of bottom (W / 2) + offset
  const hB = Math.max(20, (W * 0.5) + 3 + (0.8 * T));
  const hFlap1 = hB;
  const hFlap2 = hB;
  const dDiag = hB;
  const actualDiagY = hB;

  const creases: string[] = [];
  const cuts: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];

  // Horizontal tube creases
  creases.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  creases.push(`M ${x1},${yB} L ${x5},${yB}`);

  // Vertical tube creases
  [x1, x2, x3, x4].forEach(x => creases.push(`M ${x},${yMid} L ${x},${yB}`));

  // Top Lid crease (Panel 1: L)
  creases.push(`M ${x1},${yMid - W} L ${x2},${yMid - W}`);

  // Configurable angle diagonal creases on auto-bottom interlocking flaps (Panels 1 & 3)
  creases.push(`M ${x1},${yB} L ${(x1 + dDiag).toFixed(2)},${(yB + actualDiagY).toFixed(2)}`);
  creases.push(`M ${x3},${yB} L ${(x3 + dDiag).toFixed(2)},${(yB + actualDiagY).toFixed(2)}`);

  // Glue zone on Panel 1 & 3 bottom flaps for auto-assembly
  const gw = Math.min(autoLockGlueWidth, Math.max(8, hB - (2.5 * T)));
  glues.push(`M ${x1},${yB} L ${(x1 + dDiag).toFixed(2)},${(yB + actualDiagY).toFixed(2)} L ${(x1 + dDiag + gw).toFixed(2)},${(yB + actualDiagY).toFixed(2)} L ${(x1 + gw).toFixed(2)},${yB} Z`);
  glues.push(`M ${x3},${yB} L ${(x3 + dDiag).toFixed(2)},${(yB + actualDiagY).toFixed(2)} L ${(x3 + dDiag + gw).toFixed(2)},${(yB + actualDiagY).toFixed(2)} L ${(x3 + gw).toFixed(2)},${yB} Z`);

  // Tapered Glue Tab
  const gtTap = 5;
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + gtTap} L ${x0},${yB - gtTap} L ${x1},${yB} Z`);
  cuts.push(`M ${x0},${yMid + gtTap} L ${x0},${yB - gtTap}`);

  // Top Lid + Friction Lock Tuck Flap
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x1, yMid - W, L, tuck, 5, true));
  cuts.push(`M ${x1},${yMid} L ${x1},${yMid - W}`);
  cuts.push(`M ${x2},${yMid} L ${x2},${yMid - W}`);

  // Thumb Notch Arc
  cuts.push(FlapAndLockEngine.createThumbNotch((x1 + x2) / 2, yMid - W, 12, 'bottom'));

  // Top Dust Flaps with 15° bevels
  const dH = Math.min(W * 0.45, dustFlap);
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x2, yMid, W, dH, 15, true));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x4, yMid, W, dH, 15, true));

  // --- Bottom Interlocking Crash-Lock Flaps (ECMA A7000 Thickness & Angle Geometry) ---
  const cOffset = Math.max(3.0, 3.0 + (1.2 * T)); // Dynamic clearance corner offset
  const slopedOffset = Math.min(L * 0.45, hFlap1 / tanAngle);

  // Panel 1 (Length L): Glue Flap A with true ECMA 45° sloped edge
  const p1TopRightX = Math.min(x2 - cOffset - 5, Math.max(x1 + dDiag + cOffset, x2 - slopedOffset));
  cuts.push(
    `M ${x1},${yB} ` +
    `L ${x1},${(yB + hFlap1).toFixed(2)} ` +
    `L ${(p1TopRightX).toFixed(2)},${(yB + hFlap1).toFixed(2)} ` +
    `L ${(x2 - cOffset).toFixed(2)},${yB} ` +
    `L ${x2},${yB}`
  );

  // Panel 2 (Width W): Interlocking Hook Flap B with 45° lead-in and clearance hook notch
  const hookDepth = Math.min(hFlap2 * 0.5, 12);
  const p2LeftAngleX = Math.min(x3 - cOffset - 20, x2 + (hFlap2 / tanAngle));
  const p2HookX = Math.min(x3 - cOffset - 10, Math.max(p2LeftAngleX + 8, x2 + W - cOffset - 15));
  cuts.push(
    `M ${x2},${yB} ` +
    `L ${(p2LeftAngleX).toFixed(2)},${(yB + hFlap2).toFixed(2)} ` +
    `L ${(p2HookX).toFixed(2)},${(yB + hFlap2).toFixed(2)} ` +
    `L ${(p2HookX).toFixed(2)},${(yB + hFlap2 - hookDepth).toFixed(2)} ` +
    `L ${(x3 - cOffset).toFixed(2)},${(yB + hFlap2 - hookDepth).toFixed(2)} ` +
    `L ${x3},${yB}`
  );

  // Panel 3 (Length L): Glue Flap C (symmetrical and identical to Panel 1)
  const p3TopRightX = Math.min(x4 - cOffset - 5, Math.max(x3 + dDiag + cOffset, x4 - slopedOffset));
  cuts.push(
    `M ${x3},${yB} ` +
    `L ${x3},${(yB + hFlap1).toFixed(2)} ` +
    `L ${(p3TopRightX).toFixed(2)},${(yB + hFlap1).toFixed(2)} ` +
    `L ${(x4 - cOffset).toFixed(2)},${yB} ` +
    `L ${x4},${yB}`
  );

  // Panel 4 (Width W): Interlocking Hook Flap D (symmetrical and identical to Panel 2)
  const p4LeftAngleX = Math.min(x5 - cOffset - 20, x4 + (hFlap2 / tanAngle));
  const p4HookX = Math.min(x5 - cOffset - 10, Math.max(p4LeftAngleX + 8, x4 + W - cOffset - 15));
  cuts.push(
    `M ${x4},${yB} ` +
    `L ${(p4LeftAngleX).toFixed(2)},${(yB + hFlap2).toFixed(2)} ` +
    `L ${(p4HookX).toFixed(2)},${(yB + hFlap2).toFixed(2)} ` +
    `L ${(p4HookX).toFixed(2)},${(yB + hFlap2 - hookDepth).toFixed(2)} ` +
    `L ${(x5 - cOffset).toFixed(2)},${(yB + hFlap2 - hookDepth).toFixed(2)} ` +
    `L ${x5},${yB}`
  );

  // Right Outer Edge
  cuts.push(`M ${x5},${yMid} L ${x5},${yB}`);

  // Labels
  labels.push({ x: (x1 + x2) / 2, y: yMid + H / 2, text: `L: ${Math.round(L)}`, lineW: L });
  labels.push({ x: (x2 + x3) / 2, y: yMid + H / 2, text: `W: ${Math.round(W)}`, lineW: W });

  const yMin = yMid - W - tuck - 10;
  const yMax = yB + hB + 15;

  return { cuts, creases, glues, labels, totalW: x5 - x0, totalH: yMax - yMin, xMin: x0, yMin, xMax: x5, yMax, glueTab, tuck, dustFlap };
}

// =========================================================================
// 6. SNAP LOCK 1-2-3 (ECMA A2110 / FEFCO 0711 Standard)
// =========================================================================
function generateSnapLock123({
  L, W, H,
  glueTab = 15,
  tuck = 18,
  dustFlap = 15,
  x0 = 0,
  thickness = 0.4,
  autoLockAngle = 45,
  autoLockGlueWidth = 15,
  variant = 'standard'
}: DielineDims): DielineResult {
  const x1 = x0 + glueTab;
  const x2 = x1 + L;
  const x3 = x2 + W;
  const x4 = x3 + L;
  const x5 = x4 + W;

  const yMid = 140;
  const yB = yMid + H;

  const T = Math.max(0.1, thickness);
  const clampedAngle = Math.min(55, Math.max(35, autoLockAngle));
  const angleRad = (clampedAngle * Math.PI) / 180;
  const tanAngle = Math.tan(angleRad);

  // ECMA A2110 / FEFCO 0711 Standard Calculations:
  // Base flap height for all 4 bottom flaps is exactly W / 2
  let hBase = (W * 0.5) + (0.5 * T);
  let lockExtension = 12 + (1.2 * T);
  let hSide = (W * 0.5); // Strict FEFCO 0711 rule: side flap depth = W / 2
  let straightLen = W * 0.5; // Strict FEFCO/ECMA rule: straight side edge up to curve = EXACTLY W / 2

  if (variant === 'reinforced') {
    hBase = (W * 0.5) + (0.8 * T);
    lockExtension = 15 + (1.5 * T);
    hSide = hBase;
    straightLen = W * 0.5;
  } else if (variant === 'eco') {
    hBase = (W * 0.48) + (0.5 * T);
    lockExtension = 10 + T;
    hSide = hBase;
    straightLen = W * 0.5;
  }

  const hTongue = hBase + lockExtension;

  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];

  // Tube Creases
  creases.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  creases.push(`M ${x1},${yB} L ${x5},${yB}`);
  [x1, x2, x3, x4].forEach(x => creases.push(`M ${x},${yMid} L ${x},${yB}`));

  // Top Lid Crease
  creases.push(`M ${x2},${yMid - W} L ${x3},${yMid - W}`);

  // Tapered Glue Tab
  const gtTap = 5;
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + gtTap} L ${x0},${yB - gtTap} L ${x1},${yB} Z`);
  cuts.push(`M ${x0},${yMid + gtTap} L ${x0},${yB - gtTap}`);

  // Top Lid Tuck Flap
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x2, yMid - W, L, tuck, 5, true));
  cuts.push(`M ${x2},${yMid} L ${x2},${yMid - W}`);
  cuts.push(`M ${x3},${yMid} L ${x3},${yMid - W}`);

  // Thumb Notch Arc
  cuts.push(FlapAndLockEngine.createThumbNotch((x2 + x3) / 2, yMid - W, 12, 'bottom'));

  // Dust Flaps
  const dH = Math.min(W * 0.45, dustFlap);
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x1, yMid, W, dH, 15, true));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x3, yMid, W, dH, 15, true));

  // --- Bottom 1-2-3 Snap Lock Flaps (ECMA A2110 / FEFCO 0711 Standard Geometry) ---

  // Panel 1 (Length L): Main Male Locking Tongue Flap (Flap 1)
  const tongueWidth = Math.min(L * 0.50, Math.max(22, L - 24 - (4 * T)));
  const tSideSpan = (L - tongueWidth) / 2;
  const xTongueLeft = x1 + tSideSpan;
  const xTongueRight = x2 - tSideSpan;
  const hookNotchDepth = 3.5;

  cuts.push(
    `M ${x1},${yB} ` +
    `L ${(x1 + 3).toFixed(2)},${(yB + hBase).toFixed(2)} ` +
    `L ${(xTongueLeft - hookNotchDepth).toFixed(2)},${(yB + hBase).toFixed(2)} ` +
    `L ${(xTongueLeft - hookNotchDepth).toFixed(2)},${(yB + hBase + 3).toFixed(2)} ` +
    `L ${xTongueLeft.toFixed(2)},${(yB + hTongue).toFixed(2)} ` +
    `L ${xTongueRight.toFixed(2)},${(yB + hTongue).toFixed(2)} ` +
    `L ${(xTongueRight + hookNotchDepth).toFixed(2)},${(yB + hBase + 3).toFixed(2)} ` +
    `L ${(xTongueRight + hookNotchDepth).toFixed(2)},${(yB + hBase).toFixed(2)} ` +
    `L ${(x2 - 3).toFixed(2)},${(yB + hBase).toFixed(2)} ` +
    `L ${x2},${yB}`
  );

  // Panel 2 (Width W): Side Interlocking Flap 1 (Flap 2)
  // ECMA/FEFCO Rule: Straight edge of depth hSide extends for length straightLen = W / 2 from corner x2.
  // At x2 + straightLen (EXACTLY half the width of the box!), 45° angle/curve begins, angling up to clearance step hStep.
  const cOffset = Math.max(1.5, T); // corner clearance setback
  const hStep = Math.min(8, hSide * 0.35); // clearance step height near x3
  const xCurveStart2 = x2 + straightLen; // EXACTLY W/2 from x2!
  const slopeDX = (hSide - hStep) / tanAngle;
  const xSlopeEnd2 = Math.min(x3 - cOffset - 2, xCurveStart2 + slopeDX);

  cuts.push(
    `M ${x2},${yB} ` +
    `L ${(x2 + cOffset).toFixed(2)},${(yB + hSide).toFixed(2)} ` +
    `L ${(xCurveStart2).toFixed(2)},${(yB + hSide).toFixed(2)} ` +
    `L ${(xSlopeEnd2).toFixed(2)},${(yB + hStep).toFixed(2)} ` +
    `L ${(x3 - cOffset).toFixed(2)},${(yB + hStep).toFixed(2)} ` +
    `L ${x3},${yB}`
  );

  // Panel 3 (Length L): Female Slot Receiver Flap (Flap 3)
  const slotWidth = tongueWidth + (2 * T) + 3.0;
  const sSideSpan = (L - slotWidth) / 2;
  const xSlotLeft = x3 + sSideSpan;
  const xSlotRight = x4 - sSideSpan;

  cuts.push(
    `M ${x3},${yB} ` +
    `L ${(x3 + 2.5).toFixed(2)},${(yB + hBase).toFixed(2)} ` +
    `L ${(x4 - 2.5).toFixed(2)},${(yB + hBase).toFixed(2)} ` +
    `L ${x4},${yB}`
  );
  // Central locking slot cut line on Panel 3
  cuts.push(`M ${xSlotLeft.toFixed(2)},${(yB + hBase - 2).toFixed(2)} L ${xSlotRight.toFixed(2)},${(yB + hBase - 2).toFixed(2)}`);

  // Optional stress-relief holes/slits at slot ends
  cuts.push(`M ${xSlotLeft.toFixed(2)},${(yB + hBase - 4).toFixed(2)} L ${xSlotLeft.toFixed(2)},${(yB + hBase + 1).toFixed(2)}`);
  cuts.push(`M ${xSlotRight.toFixed(2)},${(yB + hBase - 4).toFixed(2)} L ${xSlotRight.toFixed(2)},${(yB + hBase + 1).toFixed(2)}`);

  // Panel 4 (Width W): Side Interlocking Flap 2 (Flap 4 - Symmetrical to Panel 2)
  const xCurveStart4 = x4 + straightLen; // EXACTLY W/2 from x4!
  const xSlopeEnd4 = Math.min(x5 - cOffset - 2, xCurveStart4 + slopeDX);

  cuts.push(
    `M ${x4},${yB} ` +
    `L ${(x4 + cOffset).toFixed(2)},${(yB + hSide).toFixed(2)} ` +
    `L ${(xCurveStart4).toFixed(2)},${(yB + hSide).toFixed(2)} ` +
    `L ${(xSlopeEnd4).toFixed(2)},${(yB + hStep).toFixed(2)} ` +
    `L ${(x5 - cOffset).toFixed(2)},${(yB + hStep).toFixed(2)} ` +
    `L ${x5},${yB}`
  );

  // Right Outer Edge
  cuts.push(`M ${x5},${yMid} L ${x5},${yB}`);

  labels.push({ x: (x1 + x2) / 2, y: yMid + H / 2, text: `L: ${Math.round(L)}`, lineW: L });
  labels.push({ x: (x2 + x3) / 2, y: yMid + H / 2, text: `W: ${Math.round(W)}`, lineW: W });

  // Clear CAD labels for bottom 1-2-3 snap lock flaps
  labels.push({ x: (x1 + x2) / 2, y: yB + hTongue * 0.6, text: `زبانه نری قفل (W/2 + ${Math.round(lockExtension)}mm)` });
  labels.push({ x: (x2 + x3) / 2, y: yB + hSide * 0.5, text: `زبانه ۴۵° (W/2 = ${(W / 2).toFixed(1)}mm)` });
  labels.push({ x: (x3 + x4) / 2, y: yB + hBase * 0.5, text: `شکاف مادگی قفل (${Math.round(slotWidth)}mm)` });
  labels.push({ x: (x4 + x5) / 2, y: yB + hSide * 0.5, text: `زبانه ۴۵° (W/2 = ${(W / 2).toFixed(1)}mm)` });

  const yMin = yMid - W - tuck - 10;
  const yMax = yB + hTongue + 15;

  return { cuts, creases, glues, labels, totalW: x5 - x0, totalH: yMax - yMin, xMin: x0, yMin, xMax: x5, yMax, glueTab, tuck, dustFlap };
}

// =========================================================================
// 7. FEFCO 0300 - Telescopic Two-Piece Box (Tray)
// =========================================================================
function generate0300({ L, W, H, x0 = 0 }: DielineDims): DielineResult {
  const x1 = x0 + H;
  const x2 = x1 + L;
  const x3 = x2 + H;

  const y1 = 40 + H;
  const y2 = y1 + W;
  const y3 = y2 + H;

  const cuts: string[] = [];
  const creases: string[] = [];
  const labels: any[] = [];

  // Base tray rectangle creases
  creases.push(`M ${x1},${y1} L ${x2},${y1}`);
  creases.push(`M ${x1},${y2} L ${x2},${y2}`);
  creases.push(`M ${x1},${y1} L ${x1},${y2}`);
  creases.push(`M ${x2},${y1} L ${x2},${y2}`);

  // Outer cuts with glue flaps
  cuts.push(`M ${x0},${y1} L ${x1},${y1} L ${x1},${y1 - H} L ${x2},${y1 - H} L ${x2},${y1} L ${x3},${y1} L ${x3},${y2} L ${x2},${y2} L ${x2},${y3} L ${x1},${y3} L ${x1},${y2} L ${x0},${y2} Z`);

  // Thumb Notch Arc (نیم‌هلال) on tray side wall
  cuts.push(FlapAndLockEngine.createThumbNotch(x1 - H / 2, (y1 + y2) / 2, 12, 'right'));

  labels.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, text: `سینی تلسکوپی: ${Math.round(L)} × ${Math.round(W)} mm` });

  return { cuts, creases, labels, totalW: x3 - x0, totalH: y3 - (y1 - H), xMin: x0, yMin: y1 - H, xMax: x3, yMax: y3, glueTab: 0, tuck: 0, dustFlap: H };
}

// =========================================================================
// 8. ECMA A20.21 - Straight Tuck End Carton (STE)
// =========================================================================
function generateECMA_A2021({ L, W, H, glueTab = 15, tuck = 18, dustFlap = 15, x0 = 0 }: DielineDims): DielineResult {
  const x1 = x0 + glueTab;
  const x2 = x1 + W;
  const x3 = x2 + L;
  const x4 = x3 + W;
  const x5 = x4 + L;
  
  const yMid = 120;
  const yBot = yMid + H;
  
  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];
  
  creases.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  creases.push(`M ${x1},${yBot} L ${x5},${yBot}`);
  creases.push(`M ${x1},${yMid} L ${x1},${yBot}`);
  creases.push(`M ${x2},${yMid} L ${x2},${yBot}`);
  creases.push(`M ${x3},${yMid} L ${x3},${yBot}`);
  creases.push(`M ${x4},${yMid} L ${x4},${yBot}`);

  // In STE, BOTH top and bottom lids fold from Panel 2 (Length L)
  creases.push(`M ${x2},${yMid - W} L ${x3},${yMid - W}`);
  creases.push(`M ${x2},${yBot + W} L ${x3},${yBot + W}`);

  // Glue Tab
  const gtTap = 5;
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap} L ${x1},${yBot} Z`);
  cuts.push(`M ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap}`);

  // Top Lid + Friction Lock Tuck Flap (Panel 2)
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x2, yMid - W, L, tuck, 5, true));
  cuts.push(`M ${x2},${yMid} L ${x2},${yMid - W}`);
  cuts.push(`M ${x3},${yMid} L ${x3},${yMid - W}`);

  // Bottom Lid + Friction Lock Tuck Flap (Straight Tuck - Panel 2)
  cuts.push(FlapAndLockEngine.createFrictionTuckPath(x2, yBot + W, L, tuck, 5, false));
  cuts.push(`M ${x2},${yBot} L ${x2},${yBot + W}`);
  cuts.push(`M ${x3},${yBot} L ${x3},${yBot + W}`);

  // Dust Flaps
  const dH = Math.min(W * 0.45, dustFlap);
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x1, yMid, W, dH, 15, true));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x3, yMid, W, dH, 15, true));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x1, yBot, W, dH, 15, false));
  cuts.push(FlapAndLockEngine.createBeveledDustFlap(x3, yBot, W, dH, 15, false));

  cuts.push(`M ${x4},${yMid} L ${x5},${yMid}`);
  cuts.push(`M ${x4},${yBot} L ${x5},${yBot}`);
  cuts.push(`M ${x5},${yMid} L ${x5},${yBot}`);

  labels.push({ x: (x1+x2)/2, y: yMid + H/2, text: `W: ${Math.round(W)}`, lineW: W });
  labels.push({ x: (x2+x3)/2, y: yMid + H/2, text: `L: ${Math.round(L)}`, lineW: L });

  const yMin = yMid - W - tuck - 10;
  const yMax = yBot + W + tuck + 10;

  return { cuts, creases, glues, labels, totalW: x5 - x0, totalH: yMax - yMin, xMin: x0, yMin, xMax: x5, yMax, glueTab, tuck, dustFlap };
}

// =========================================================================
// 9. ECMA C1020 - Pillow Box (Curved Crease Oval Box)
// =========================================================================
function generateECMA_C1020({ L, W, H, glueTab = 12, x0 = 0 }: DielineDims): DielineResult {
  const x1 = x0 + glueTab;
  const x2 = x1 + L;
  const x3 = x2 + L;

  const yMid = 140;
  const yBot = yMid + W;

  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];

  // Main vertical score line between two curved halves
  creases.push(`M ${x2},${yMid} L ${x2},${yBot}`);
  creases.push(`M ${x1},${yMid} L ${x1},${yBot}`);

  // Curved score lines at top & bottom ends (elliptical arcs)
  const arcDepth = Math.min(W * 0.35, Math.max(12, H * 0.4));

  // Top Elliptical Curved Creases
  creases.push(`M ${x1},${yMid} A ${L / 2} ${arcDepth} 0 0 1 ${x2},${yMid}`);
  creases.push(`M ${x2},${yMid} A ${L / 2} ${arcDepth} 0 0 1 ${x3},${yMid}`);

  // Bottom Elliptical Curved Creases
  creases.push(`M ${x1},${yBot} A ${L / 2} ${arcDepth} 0 0 0 ${x2},${yBot}`);
  creases.push(`M ${x2},${yBot} A ${L / 2} ${arcDepth} 0 0 0 ${x3},${yBot}`);

  // Outer Cut Flaps (Curved End Flaps)
  cuts.push(`M ${x1},${yMid} A ${L / 2} ${arcDepth * 1.3} 0 0 0 ${x2},${yMid}`);
  cuts.push(`M ${x2},${yMid} A ${L / 2} ${arcDepth * 1.3} 0 0 0 ${x3},${yMid}`);
  cuts.push(`M ${x1},${yBot} A ${L / 2} ${arcDepth * 1.3} 0 0 1 ${x2},${yBot}`);
  cuts.push(`M ${x2},${yBot} A ${L / 2} ${arcDepth * 1.3} 0 0 1 ${x3},${yBot}`);

  // Glue Tab
  const gtTap = 6;
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap} L ${x1},${yBot} Z`);
  cuts.push(`M ${x0},${yMid + gtTap} L ${x0},${yBot - gtTap}`);

  // Right Outer Edge
  cuts.push(`M ${x3},${yMid} L ${x3},${yBot}`);

  // Thumb notches on top/bottom outer flap ends for easy finger access
  cuts.push(FlapAndLockEngine.createThumbNotch((x1 + x2) / 2, yMid - arcDepth * 0.6, 10, 'top'));
  cuts.push(FlapAndLockEngine.createThumbNotch((x1 + x2) / 2, yBot + arcDepth * 0.6, 10, 'bottom'));

  labels.push({ x: (x1 + x2) / 2, y: yMid + W / 2, text: `جعبه بالشتی (Pillow Box): ${Math.round(L)} × ${Math.round(W)} mm` });

  const yMin = yMid - arcDepth * 1.5 - 10;
  const yMax = yBot + arcDepth * 1.5 + 10;

  return { cuts, creases, glues, labels, totalW: x3 - x0, totalH: yMax - yMin, xMin: x0, yMin, xMax: x3, yMax, glueTab, tuck: 0, dustFlap: Math.round(arcDepth) };
}

// =========================================================================
// 10. FEFCO 0320 - Full Telescope Design Box (Lid & Tray Set)
// =========================================================================
function generateFEFCO_0320({ L, W, H, x0 = 0 }: DielineDims): DielineResult {
  const x1 = x0 + H;
  const x2 = x1 + L;
  const x3 = x2 + H;

  const y1 = 40 + H;
  const y2 = y1 + W;
  const y3 = y2 + H;

  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];

  // Base tray score lines
  creases.push(`M ${x1},${y1} L ${x2},${y1}`);
  creases.push(`M ${x1},${y2} L ${x2},${y2}`);
  creases.push(`M ${x1},${y1} L ${x1},${y2}`);
  creases.push(`M ${x2},${y1} L ${x2},${y2}`);

  // Glue Flaps at 4 corners
  const gW = Math.min(25, H * 0.6);
  glues.push(`M ${x1},${y1} L ${x1 - gW},${y1 - 3} L ${x1 - gW},${y1 - H + 3} L ${x1},${y1 - H} Z`);
  glues.push(`M ${x2},${y1} L ${x2 + gW},${y1 - 3} L ${x2 + gW},${y1 - H + 3} L ${x2},${y1 - H} Z`);

  cuts.push(`M ${x0},${y1} L ${x1},${y1}`);
  cuts.push(`M ${x2},${y1} L ${x3},${y1}`);
  cuts.push(`M ${x0},${y2} L ${x1},${y2}`);
  cuts.push(`M ${x2},${y2} L ${x3},${y2}`);

  cuts.push(`M ${x1},${y1 - H} L ${x2},${y1 - H}`);
  cuts.push(`M ${x1},${y3} L ${x2},${y3}`);
  cuts.push(`M ${x0},${y1} L ${x0},${y2}`);
  cuts.push(`M ${x3},${y1} L ${x3},${y2}`);

  labels.push({ x: (x1 + x2) / 2, y: (y1 + y2) / 2, text: `جعبه تلسکوپی کامل (FEFCO 0320): ${Math.round(L)} × ${Math.round(W)} mm` });

  return { cuts, creases, glues, labels, totalW: x3 - x0, totalH: y3 - (y1 - H), xMin: x0, yMin: y1 - H, xMax: x3, yMax: y3, glueTab: 0, tuck: 0, dustFlap: H };
}

// =========================================================================
// 11. FEFCO 0409 - Five Panel Folder (FPF)
// =========================================================================
function generateFEFCO_0409({ L, W, H, glueTab = 25, x0 = 0 }: DielineDims): DielineResult {
  const x1 = x0 + glueTab;
  const x2 = x1 + W;
  const x3 = x2 + L;
  const x4 = x3 + W;
  const x5 = x4 + L;

  const yMid = 140;
  const yBot = yMid + H;

  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const labels: any[] = [];

  creases.push(`M ${x1},${yMid} L ${x5},${yMid}`);
  creases.push(`M ${x1},${yBot} L ${x5},${yBot}`);
  creases.push(`M ${x1},${yMid} L ${x1},${yBot}`);
  creases.push(`M ${x2},${yMid} L ${x2},${yBot}`);
  creases.push(`M ${x3},${yMid} L ${x3},${yBot}`);
  creases.push(`M ${x4},${yMid} L ${x4},${yBot}`);

  // End Overlapping Closure Flaps
  const endFlap = W * 0.8;
  cuts.push(`M ${x1},${yMid} L ${x1},${yMid - endFlap} L ${x2},${yMid - endFlap} L ${x2},${yMid}`);
  cuts.push(`M ${x3},${yMid} L ${x3},${yMid - endFlap} L ${x4},${yMid - endFlap} L ${x4},${yMid}`);
  cuts.push(`M ${x1},${yBot} L ${x1},${yBot + endFlap} L ${x2},${yBot + endFlap} L ${x2},${yBot}`);
  cuts.push(`M ${x3},${yBot} L ${x3},${yBot + endFlap} L ${x4},${yBot + endFlap} L ${x4},${yBot}`);

  // Glue Tab
  glues.push(`M ${x1},${yMid} L ${x0},${yMid + 5} L ${x0},${yBot - 5} L ${x1},${yBot} Z`);
  cuts.push(`M ${x0},${yMid + 5} L ${x0},${yBot - 5}`);

  cuts.push(`M ${x5},${yMid} L ${x5},${yBot}`);

  labels.push({ x: (x2 + x3) / 2, y: yMid + H / 2, text: `پوشه پنج‌پنلی (FEFCO 0409): ${Math.round(L)} × ${Math.round(W)} mm` });

  const yMin = yMid - endFlap - 10;
  const yMax = yBot + endFlap + 10;

  return { cuts, creases, glues, labels, totalW: x5 - x0, totalH: yMax - yMin, xMin: x0, yMin, xMax: x5, yMax, glueTab, tuck: 0, dustFlap: Math.round(endFlap) };
}

// =========================================================================
// 12. FEFCO 0713 - Display Box with Auto-Bottom Crash Lock & Header Display
// =========================================================================
function generateFEFCO_0713({ L, W, H, glueTab = 20, x0 = 0 }: DielineDims): DielineResult {
  const result = generate0215({ L, W, H, glueTab, x0 });
  const headerHeight = Math.min(120, Math.max(50, H * 0.6));
  
  // Add Header Display Panel on Rear Panel
  const x2 = x0 + glueTab + L;
  const x3 = x2 + W;

  result.cuts.push(`M ${x2},${140} L ${x2},${140 - headerHeight} L ${x3},${140 - headerHeight} L ${x3},${140}`);
  result.labels.push({ x: (x2 + x3) / 2, y: 140 - headerHeight / 2, text: `تابلو استند تبلیغاتی (Header Display)` });

  result.yMin = Math.min(result.yMin, 140 - headerHeight - 15);
  result.totalH = result.yMax - result.yMin;

  return result;
}
