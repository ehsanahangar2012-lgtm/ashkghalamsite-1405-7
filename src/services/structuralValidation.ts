export interface CompressionStrengthResult {
  bctScore: number;
  bctKg: number;
  safetyFactor: number;
  requiredResistanceKg: number;
  strengthBCT: number;
  maxLoadKg: number;
  passStatus: boolean;
  maxStackingLayers: number;
  isSafe: boolean;
  recommendation: string;
}

export const simulateBoxCompressionStrength = (
  paramOrL: any,
  wArg?: number,
  hArg?: number,
  ectArg?: number,
  caliperArg?: number
): CompressionStrengthResult => {
  let l = 150;
  let w = 100;
  let h = 80;
  let ect = 5.5;
  let caliper = 3.5;
  let productWeight = 5;
  let stackHeight = 4;

  if (typeof paramOrL === 'object' && paramOrL !== null) {
    l = paramOrL.L || paramOrL.l || 150;
    w = paramOrL.W || paramOrL.w || 100;
    h = paramOrL.H || paramOrL.h || 80;
    caliper = paramOrL.materialThickness || paramOrL.caliper || 3.5;
    ect = paramOrL.ectValue || paramOrL.ect || 5.5;
    productWeight = paramOrL.individualProductWeight || 5;
    stackHeight = paramOrL.stackHeight || 4;
  } else {
    l = typeof paramOrL === 'number' ? paramOrL : 150;
    w = wArg || 100;
    h = hArg || 80;
    ect = ectArg || 5.5;
    caliper = caliperArg || 3.5;
  }

  // McKee formula for Box Compression Test (BCT)
  const perimeter = 2 * (l + w) / 10; // cm
  const caliperCm = Math.max(0.1, caliper / 10);
  const bctNewton = 5.87 * (ect * 10) * Math.sqrt(perimeter * caliperCm);
  const bctKg = Math.round(bctNewton / 9.81);

  const requiredResistanceKg = Math.round(productWeight * stackHeight * 3.5);
  const maxLayers = Math.max(1, Math.floor(bctKg / Math.max(1, productWeight * 3.5)));
  const passStatus = bctKg >= requiredResistanceKg;

  return {
    bctScore: bctKg,
    bctKg,
    safetyFactor: Number((bctKg / Math.max(1, requiredResistanceKg)).toFixed(1)),
    requiredResistanceKg,
    strengthBCT: bctKg,
    maxLoadKg: bctKg,
    passStatus,
    maxStackingLayers: maxLayers,
    isSafe: passStatus,
    recommendation: passStatus 
      ? 'تحمل بار ستونی کارتن عالی است و امکان چیدمان تا سقف پالت را داراست.'
      : 'پیشنهاد می‌شود ضخامت فلوت یا گراماژ کاغذ لاینر افزایش یابد.',
  };
};
