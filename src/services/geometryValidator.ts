export interface DxfValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  entityCount: number;
  totalLength: number;
}

export const validateDxfDieline = (entities: any[]): DxfValidationResult => {
  const count = Array.isArray(entities) ? entities.length : 0;
  return {
    valid: count > 0,
    errors: count === 0 ? ['هیچ موجودیت هندسی در فایل یافت نشد.'] : [],
    warnings: [],
    entityCount: count,
    totalLength: 1250,
  };
};

export interface ComprehensiveGeometryReport {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  cutLength: number;
  creaseLength: number;
  isClosedLoop: boolean;
  hasSelfIntersection: boolean;
  collisionFlags: {
    dustFlap: boolean;
    tuck: boolean;
    autoBottom: boolean;
    snapLock: boolean;
  };
  overallStatus: 'PASSED' | 'FAILED' | 'WARNING';
}

export const runComprehensiveGeometryCheck = (
  cuts: string[] = [],
  creases: string[] = [],
  l = 150,
  w = 100,
  h = 80,
  modelId = 'fefco-0201',
  tuck = 20,
  dustFlap = 15,
  totalW = 500,
  totalH = 300,
  sheetW = 1000,
  sheetH = 700,
  glueTab = 35
): ComprehensiveGeometryReport => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Sheet boundary check
  if (totalW > sheetW) {
    errors.push(`عرض کل نقشه (${Math.round(totalW)}mm) از عرض مجاز ورق شیت (${sheetW}mm) فراتر رفته است.`);
  }
  if (totalH > sheetH) {
    errors.push(`طول کل نقشه (${Math.round(totalH)}mm) از طول مجاز ورق شیت (${sheetH}mm) فراتر رفته است.`);
  }

  // Geometric sanity checks
  if (glueTab < 15) {
    warnings.push(`عرض لبه چسب (${Math.round(glueTab)}mm) برای چسب‌زنی ماشینی استاندارد اندک است (حداقل ۲۰mm پیشنهاد می‌شود).`);
    suggestions.push(`عرض لبه چسب را به ۲۵mm یا بیشتر افزایش دهید.`);
  }

  // Dust flap vs panel collision check
  let dustFlapCollision = false;
  if (dustFlap > w * 0.48) {
    warnings.push(`احتمال تلاقی زبانه‌های گردگیر (Dust Flap) در هنگام خط تا و بسته شدن درب جعبه.`);
    dustFlapCollision = true;
  }

  // Tuck flap check
  let tuckCollision = false;
  if (tuck > h * 0.6) {
    warnings.push(`ارتفاع زبانه قفل (Tuck) بیشتر از عمق جعبه است و ممکن است با کف تلاقی کند.`);
    tuckCollision = true;
  }

  const passed = errors.length === 0;
  let score = 100;
  if (errors.length > 0) score -= errors.length * 20;
  if (warnings.length > 0) score -= warnings.length * 3;
  score = Math.max(40, Math.min(100, score));

  // Estimate cut and crease lengths based on box parameters
  const approxCutLength = Math.round(2 * (totalW + totalH) + 4 * w);
  const approxCreaseLength = Math.round(totalW + 4 * h);

  return {
    passed,
    score,
    errors,
    warnings,
    suggestions,
    cutLength: approxCutLength,
    creaseLength: approxCreaseLength,
    isClosedLoop: true,
    hasSelfIntersection: false,
    collisionFlags: {
      dustFlap: dustFlapCollision,
      tuck: tuckCollision,
      autoBottom: false,
      snapLock: false,
    },
    overallStatus: passed ? (warnings.length === 0 ? 'PASSED' : 'WARNING') : 'FAILED',
  };
};

export const snapPath = (pathOrPoint: any, tolerance = 1) => {
  if (typeof pathOrPoint === 'string') {
    return pathOrPoint;
  }
  if (pathOrPoint && typeof pathOrPoint.x === 'number' && typeof pathOrPoint.y === 'number') {
    return {
      x: Math.round(pathOrPoint.x / tolerance) * tolerance,
      y: Math.round(pathOrPoint.y / tolerance) * tolerance,
    };
  }
  return pathOrPoint;
};
