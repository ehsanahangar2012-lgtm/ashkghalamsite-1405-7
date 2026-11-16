export interface MaterialCompensationResult {
  manufacturingL: number;
  manufacturingW: number;
  manufacturingH: number;
  innerL: number;
  innerW: number;
  innerH: number;
  outerL: number;
  outerW: number;
  outerH: number;
  caliperMm: number;
  creaseAllowance: number;
  bendDeductionPer90Deg: number;
  slotWidthMm: number;
  creasingRulePt: number;
  creasingMatrixWidthMm: number;
  creasingMatrixDepthMm: number;
  boardClass: 'paperboard' | 'kraft' | 'corrugated';
}

interface MaterialSpec {
  caliper: number;
  kFactor: number;
  boardClass: 'paperboard' | 'kraft' | 'corrugated';
}

const MATERIAL_SPEC_MAP: Record<string, MaterialSpec> = {
  'inderboard-250': { caliper: 0.35, kFactor: 0.42, boardClass: 'paperboard' },
  'inderboard-300': { caliper: 0.42, kFactor: 0.42, boardClass: 'paperboard' },
  'inderboard-350': { caliper: 0.50, kFactor: 0.43, boardClass: 'paperboard' },
  'sbs-300': { caliper: 0.38, kFactor: 0.40, boardClass: 'paperboard' },
  'sbs-400': { caliper: 0.52, kFactor: 0.42, boardClass: 'paperboard' },
  'duplex-280': { caliper: 0.36, kFactor: 0.44, boardClass: 'paperboard' },
  'duplex-350': { caliper: 0.46, kFactor: 0.44, boardClass: 'paperboard' },
  'kraft-300': { caliper: 0.44, kFactor: 0.38, boardClass: 'kraft' },
  'corrugated-e': { caliper: 1.60, kFactor: 0.50, boardClass: 'corrugated' },
  'corrugated-b': { caliper: 3.20, kFactor: 0.52, boardClass: 'corrugated' },
  'corrugated-eb': { caliper: 4.80, kFactor: 0.55, boardClass: 'corrugated' },
};

export const calculateMaterialCompensation = (
  materialIdOrL: string | number,
  wOrRawL?: number,
  hOrRawW?: number,
  caliperOrRawH?: number,
  explicitCaliperMm?: number,
  dimensionBasis: 'manufacturing' | 'inner' = 'manufacturing'
): MaterialCompensationResult => {
  let l = 150;
  let w = 100;
  let h = 80;
  let caliper = 0.42;
  let kFactor = 0.42;
  let boardClass: 'paperboard' | 'kraft' | 'corrugated' = 'paperboard';

  if (typeof materialIdOrL === 'string') {
    l = Number(wOrRawL) || 150;
    w = Number(hOrRawW) || 100;
    h = Number(caliperOrRawH) || 80;

    const spec = MATERIAL_SPEC_MAP[materialIdOrL];
    if (spec) {
      caliper = explicitCaliperMm ?? spec.caliper;
      kFactor = spec.kFactor;
      boardClass = spec.boardClass;
    } else if (materialIdOrL.includes('eb') || materialIdOrL.includes('5')) {
      caliper = explicitCaliperMm ?? 4.8;
      kFactor = 0.55;
      boardClass = 'corrugated';
    } else if (materialIdOrL.includes('corrugated-b') || materialIdOrL.includes('flute')) {
      caliper = explicitCaliperMm ?? 3.2;
      kFactor = 0.52;
      boardClass = 'corrugated';
    } else if (materialIdOrL.includes('corrugated')) {
      caliper = explicitCaliperMm ?? 1.6;
      kFactor = 0.5;
      boardClass = 'corrugated';
    } else if (materialIdOrL.includes('kraft')) {
      caliper = explicitCaliperMm ?? 0.44;
      kFactor = 0.38;
      boardClass = 'kraft';
    } else {
      caliper = explicitCaliperMm ?? 0.42;
    }
  } else {
    l = typeof materialIdOrL === 'number' && !isNaN(materialIdOrL) ? materialIdOrL : 150;
    w = Number(wOrRawL) || 100;
    h = Number(hOrRawW) || 80;
    caliper = Number(caliperOrRawH) || 3.0;
    boardClass = caliper >= 1.2 ? 'corrugated' : 'paperboard';
    kFactor = boardClass === 'corrugated' ? 0.52 : 0.42;
  }

  caliper = Math.max(0.2, caliper);

  // Crease channel & bend deduction math based on steel-rule die engineering
  // Bend deduction per 90-deg fold = caliper * kFactor
  const bendDeductionPer90Deg = Number((caliper * kFactor).toFixed(2));
  const creaseAllowance = Number((caliper * (boardClass === 'corrugated' ? 1.55 : 1.45)).toFixed(2));

  // Standard creasing rule & matrix formula:
  // Rule thickness: 2pt (0.71mm) for board < 0.7mm, 3pt (1.07mm) for E/B flute, 4pt (1.42mm) for EB flute
  const creasingRulePt = caliper >= 4.0 ? 4 : caliper >= 1.2 ? 3 : 2;
  const ruleThicknessMm = creasingRulePt * 0.355;
  // Creasing matrix groove width = 1.5 * caliper + ruleThickness (paperboard) or 2.0 * caliper + ruleThickness (corrugated)
  const creasingMatrixWidthMm = Number(
    ((boardClass === 'corrugated' ? 1.65 : 1.5) * caliper + ruleThicknessMm).toFixed(2)
  );
  const creasingMatrixDepthMm = Number((boardClass === 'corrugated' ? caliper * 0.65 : caliper * 0.95).toFixed(2));

  // Die-cut slot width (for corrugated flap slots & tuck lock clearance)
  const slotWidthMm = boardClass === 'corrugated' ? Number(Math.max(3.5, caliper * 1.6).toFixed(2)) : 0.71;

  // If user specified inside product dimensions, score-to-score manufacturing dims expand by 1*caliper per wall pair
  const expansion = dimensionBasis === 'inner' ? caliper : 0;
  const manufacturingL = Number((l + expansion).toFixed(2));
  const manufacturingW = Number((w + expansion).toFixed(2));
  const manufacturingH = Number((h + (boardClass === 'corrugated' ? expansion * 1.5 : expansion)).toFixed(2));

  const innerL = Number(Math.max(0, manufacturingL - caliper * 2).toFixed(2));
  const innerW = Number(Math.max(0, manufacturingW - caliper * 2).toFixed(2));
  const innerH = Number(
    Math.max(0, manufacturingH - (boardClass === 'corrugated' ? caliper * 2.5 : caliper * 1.5)).toFixed(2)
  );

  const outerL = Number((manufacturingL + caliper).toFixed(2));
  const outerW = Number((manufacturingW + caliper).toFixed(2));
  const outerH = Number((manufacturingH + (boardClass === 'corrugated' ? caliper * 2 : caliper)).toFixed(2));

  return {
    manufacturingL,
    manufacturingW,
    manufacturingH,
    innerL,
    innerW,
    innerH,
    outerL,
    outerW,
    outerH,
    caliperMm: Number(caliper.toFixed(2)),
    creaseAllowance,
    bendDeductionPer90Deg,
    slotWidthMm,
    creasingRulePt,
    creasingMatrixWidthMm,
    creasingMatrixDepthMm,
    boardClass,
  };
};
