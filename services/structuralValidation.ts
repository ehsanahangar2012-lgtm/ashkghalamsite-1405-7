// =========================================================================
// ASHK GHALAM PACKAGING CAD - STRUCTURAL VALIDATION ENGINE
// =========================================================================
// Implements McKee's physics formula to calculate Box Compression Test (BCT)
// limits and stacking safety parameters under dynamic warehouse humidity,
// elapsed storage days, and stacking layers load values.

export interface StackingSimulationResult {
  bctNewtons: number;
  bctKg: number;
  maxRecommendedWeight: number; // kg
  currentLoadKg: number; // actual weight loaded on the bottom box
  requiredResistanceKg: number; // with safety factors applied
  safetyFactor: number;
  passStatus: boolean;
  warnings: string[];
  recommendation: string; // specialized packaging expert advice (Farsi)
}

/**
 * Executes a full McKee Stacking Simulation
 */
export function simulateBoxCompressionStrength(params: {
  L: number; // mm
  W: number; // mm
  H: number; // mm
  materialThickness: number; // mm
  ectValue: number; // kN/m (Edge Crush Test value)
  individualProductWeight: number; // kg
  stackHeight: number; // layers total in column
  relativeHumidity: number; // % RH
  storageDays: number; // days in storage
}): StackingSimulationResult {
  const { L, W, H, materialThickness, ectValue, individualProductWeight, stackHeight, relativeHumidity, storageDays } = params;

  // 1. Box perimeter (Z) in millimeters
  const perimeterZ = 2 * (L + W);

  // 2. Base McKee formula: BCT = 5.87 * ECT * sqrt(thickness * perimeterZ)
  // ectValue is in kN/m, thickness is in mm, perimeterZ is in mm
  const bctNewtons = 5.87 * ectValue * Math.sqrt(materialThickness * perimeterZ);
  const bctKg = bctNewtons / 9.81;

  // 3. Environmental Humidity Degradation factor (F_humidity)
  let fHumidity = 1.0;
  if (relativeHumidity >= 90) fHumidity = 0.35; // major collapse danger
  else if (relativeHumidity >= 80) fHumidity = 0.45;
  else if (relativeHumidity >= 70) fHumidity = 0.60;
  else if (relativeHumidity >= 55) fHumidity = 0.85;
  else fHumidity = 1.0;

  // 4. Elapsed Storage Days Strength Loss factor (F_time)
  let fTime = 1.0;
  if (storageDays >= 120) fTime = 0.50; // loses 50% strength due to fatigue creep
  else if (storageDays >= 60) fTime = 0.65;
  else if (storageDays >= 30) fTime = 0.75;
  else if (storageDays >= 10) fTime = 0.88;
  else fTime = 1.0;

  // 5. Calculate cumulative safety factor:
  // Base structural factor is 3.0. In humid and long environments, it increases.
  const safetyFactorBase = 3.0;
  const safetyFactor = Math.round((safetyFactorBase / (fHumidity * fTime)) * 10) / 10;

  // 6. Current static load on the bottom box:
  const loadedBoxesCount = Math.max(0, stackHeight - 1);
  const currentLoadKg = loadedBoxesCount * individualProductWeight;

  // 7. Required minimum resistance under calculated safety factors
  const requiredResistanceKg = currentLoadKg * safetyFactor;

  // 8. Stacking status pass or fail
  const passStatus = bctKg > requiredResistanceKg;

  // 9. Warnings and specialized advisory comments
  const warnings: string[] = [];
  let recommendation = '';

  if (relativeHumidity > 75) {
    warnings.push(`⚠️ رطوبت بالای سالن انبارداری (${relativeHumidity}٪) باعث جذب آب توسط فیبر سلولزی مقوا شده و مقاومت کل قالب را ${( (1 - fHumidity) * 100 ).toFixed(0)}٪ تقلیل داده است.`);
  }

  if (storageDays > 45) {
    warnings.push(`⚠️ دوره طولانی انبارداری (${storageDays} روزه) خستگی تنش ایستایی ایجاد می‌کند و مقاومت فیزیکی جعبه را ${( (1 - fTime) * 100 ).toFixed(0)}٪ مستهلک ساخته است.`);
  }

  if (!passStatus) {
    warnings.push(`❌ بحران فروریزی ستون: مقاومت McKee دیواره (${bctKg.toFixed(0)} کیلوگرم) از لود نهایی انباشت با احتساب رژیم ایمنی (${requiredResistanceKg.toFixed(0)} کیلوگرم) کمتر است!`);
    recommendation = `پیشنهاد مهندسی چاپ اشک قلم: مقوای مورد مصرف را به گرم یا کلاس بالاتر (مثلاً ایندربرد ۳۵۰ گرم ممتاز یا مایکرو E-flute) تغییر دهید، یا ارتفاع ستون بندی چیدمان پالت را از ${stackHeight} طبقه کاهش دهید.`;
  } else {
    recommendation = `ساختار جعبه با ضریب ایمنی عالی ${safetyFactor} مطابقت دارد. ظرفیت حمل بار و مقاومت کارتن در شرایط جوی فعلی پایدار مرزی ارزیابی می‌شود.`;
  }

  return {
    bctNewtons: Math.round(bctNewtons),
    bctKg: Math.round(bctKg),
    maxRecommendedWeight: Math.round(bctKg / safetyFactor),
    currentLoadKg: Math.round(currentLoadKg),
    requiredResistanceKg: Math.round(requiredResistanceKg),
    safetyFactor,
    passStatus,
    warnings,
    recommendation
  };
}
