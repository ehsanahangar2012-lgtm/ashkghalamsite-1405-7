// =========================================================================
// ASHK GHALAM PACKAGING CAD - MATERIAL COMPENSATION ENGINE
// =========================================================================
// Computes exact bending allowances, fold loss, compression offset offsets,
// and safety clearances to translate "Internal Retail Dimensions" safely
// into "Engineering Toolpath Drafting/Cutting Dimensions".

export interface CompensationResult {
  manufacturingL: number;
  manufacturingW: number;
  manufacturingH: number;
  bendRadius: number; // mm
  foldLossValue: number; // mm
  fluteTakeUpAllowance: number; // mm
  glueFlapAdjustment: number; // mm
  assemblyEaseTolerance: number; // mm
}

export interface MaterialProperties {
  id: string;
  name: string;
  thickness: number; // mm
  baseFoldLoss: number; // coefficient
  innerElasticModulus: number; // GPa
  fluteHeight?: number; // mm for corrugated
}

const MATERIAL_DATABASE: Record<string, MaterialProperties> = {
  // FBB Inderboards
  'inderboard-250': { id: 'inderboard-250', name: 'ایندربرد ۲۵۰ گرم', thickness: 0.35, baseFoldLoss: 0.22, innerElasticModulus: 3.2 },
  'inderboard-300': { id: 'inderboard-300', name: 'ایندربرد ۳۰۰ گرم', thickness: 0.42, baseFoldLoss: 0.25, innerElasticModulus: 3.5 },
  'inderboard-350': { id: 'inderboard-350', name: 'ایندربرد ۳۵۰ گرم', thickness: 0.50, baseFoldLoss: 0.28, innerElasticModulus: 3.8 },
  
  // SBS Premium Single-ply
  'sbs-300': { id: 'sbs-300', name: 'سولفات سفید ۳۰۰ گرم', thickness: 0.38, baseFoldLoss: 0.23, innerElasticModulus: 4.1 },
  'sbs-400': { id: 'sbs-400', name: 'سولفات سفید ۴۰۰ گرم', thickness: 0.52, baseFoldLoss: 0.27, innerElasticModulus: 4.4 },
  
  // Duplex board gray back
  'duplex-280': { id: 'duplex-280', name: 'پشت طوسی ۲۸۰ گرم', thickness: 0.36, baseFoldLoss: 0.24, innerElasticModulus: 2.8 },
  'duplex-350': { id: 'duplex-350', name: 'پشت طوسی ۳۵۰ گرم', thickness: 0.46, baseFoldLoss: 0.26, innerElasticModulus: 2.9 },
  
  // Kraft
  'kraft-300': { id: 'kraft-300', name: 'کرافت قهوه‌ای ۳۰۰ گرم', thickness: 0.44, baseFoldLoss: 0.26, innerElasticModulus: 3.4 },
  
  // Corrugated board
  'corrugated-e': { id: 'corrugated-e', name: 'کارتن مایکروویو E-Flute', thickness: 1.60, baseFoldLoss: 0.35, innerElasticModulus: 1.5, fluteHeight: 1.2 },
  'corrugated-b': { id: 'corrugated-b', name: 'کارتن سه لایه B-Flute', thickness: 3.20, baseFoldLoss: 0.42, innerElasticModulus: 1.1, fluteHeight: 2.5 },
  'corrugated-eb': { id: 'corrugated-eb', name: 'کارتن پنج لایه EB-Flute', thickness: 4.80, baseFoldLoss: 0.55, innerElasticModulus: 0.9, fluteHeight: 4.1 }
};

/**
 * Calculates industrial-grade tooling path dimension offsets to compensate for 90-deg paperboard folds.
 * Standard formula for bend fold loss in box folding:
 *   Manufacturing_Dim = Internal_Dim + (Thickness * baseFoldLoss) + AssemblyTolerance
 */
export function calculateMaterialCompensation(
  materialId: string,
  internalL: number,
  internalW: number,
  internalH: number
): CompensationResult {
  const mat = MATERIAL_DATABASE[materialId] || { id: 'default', name: 'پیش‌فرض', thickness: 0.4, baseFoldLoss: 0.25, innerElasticModulus: 3.0 };
  
  const thickness = mat.thickness;
  const kFactor = mat.baseFoldLoss; // also known as neutral axis offset ratio
  
  // Fold loss representing core compression:
  const foldLossValue = thickness * kFactor;
  
  // Bend radius approximation under score cutter tooling:
  const bendRadius = thickness * 1.15;
  
  // Flute take-up allowance for corrugated cardboard flaps
  const fluteTakeUpAllowance = mat.fluteHeight ? mat.fluteHeight * 0.4 : 0;
  
  // Assembly ease tolerances to allow flaps to tuck in without fiber crinkling
  const assemblyEaseTolerance = thickness * 0.2 + (mat.fluteHeight ? 0.6 : 0.1);
  
  // Scale glue flap up with board stiffness
  const glueFlapAdjustment = thickness * 0.8;

  // Final manufacturing layout dimensions rounded to 1/10th of a millimeter
  const manufacturingL = Math.round((internalL + foldLossValue + assemblyEaseTolerance) * 10) / 10;
  const manufacturingW = Math.round((internalW + foldLossValue + assemblyEaseTolerance) * 10) / 10;
  const manufacturingH = Math.round((internalH + (foldLossValue * 1.5) + assemblyEaseTolerance) * 10) / 10;

  return {
    manufacturingL,
    manufacturingW,
    manufacturingH,
    bendRadius: Math.round(bendRadius * 100) / 100,
    foldLossValue: Math.round(foldLossValue * 100) / 100,
    fluteTakeUpAllowance: Math.round(fluteTakeUpAllowance * 100) / 100,
    glueFlapAdjustment: Math.round(glueFlapAdjustment * 100) / 100,
    assemblyEaseTolerance: Math.round(assemblyEaseTolerance * 100) / 100
  };
}
