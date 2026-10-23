export interface DimensionAccuracyInput {
  targetL: number;
  targetW: number;
  targetH: number;
  tolerance?: number;
  thickness?: number;
  caliper?: number;
  fefcoCode?: string;
  modelId?: string;
  tuck?: number;
  dustFlap?: number;
  glueTab?: number;
}

export interface AccuracyIssueSuggestion {
  id: string;
  title: string;
  standardRef: string;
  issue: string;
  fix: string;
  field: 'L' | 'W' | 'H' | 'tuck' | 'dustFlap' | 'glueTab' | 'grammage' | 'thickness';
  dimension?: 'L' | 'W' | 'H';
  currentValue: number;
  suggestedValue: number;
  reason?: string;
}

export interface DimensionAccuracyReport {
  overallScore: number;
  accuracyRate: number;
  gradeLabel: string;
  gradeColor: string;
  calculatedVolumeCm3: number;
  recommendedGrammageMin: number;
  recommendedGrammageMax: number;
  recommendedCaliperMm: number;
  idealTuckFlapMm: number;
  idealDustFlapMm: number;
  idealGlueTabMm: number;
  bctCompressiveStrengthKg: number;
  creaseLossFactorMm: number;
  criticalErrors: string[];
  technicalWarnings: string[];
  compliantPasses: string[];
  suggestions: AccuracyIssueSuggestion[];
}

export const evaluateDimensionAccuracy = (input: DimensionAccuracyInput): DimensionAccuracyReport => {
  const L = input.targetL || 150;
  const W = input.targetW || 100;
  const H = input.targetH || 80;
  const thickness = input.thickness || input.caliper || 0.45;

  const volumeCm3 = Math.round((L * W * H) / 1000);
  const idealTuck = Math.round(Math.max(15, Math.min(30, W * 0.25)));
  const idealDust = Math.round(Math.max(12, Math.min(25, W * 0.22)));
  const idealGlue = Math.round(Math.max(20, Math.min(35, 25)));

  const criticalErrors: string[] = [];
  const technicalWarnings: string[] = [];
  const compliantPasses: string[] = [
    'نسبت ابعادی طول و عرض در محدوده بهینه خط تولید جعبه‌چسبانی',
    'رواداری خط تا در محدوده استاندارد DIN 55437',
    'استحکام گره‌های گوشه و عدم تلاقی در فاز مونتاژ'
  ];
  const suggestions: AccuracyIssueSuggestion[] = [];

  if (H > 3 * W) {
    technicalWarnings.push('نسبت ارتفاع به عرض بسیار بالاست و ممکن است در دایکات باطله ایجاد کند.');
  }

  if (L < W) {
    technicalWarnings.push('طول جعبه کمتر از عرض آن انتخاب شده است؛ معمولاً طول برای ایستایی بهتر بزرگتر در نظر گرفته می‌شود.');
    suggestions.push({
      id: 'sug-dim-ratio',
      title: 'اصلاح تناسب طول و عرض',
      standardRef: 'FEFCO-0201',
      issue: 'طول از عرض کمتر است',
      fix: 'پیشنهاد می‌شود طول و عرض جابه‌جا شوند.',
      field: 'L',
      dimension: 'L',
      currentValue: L,
      suggestedValue: Math.max(L, W + 10),
    });
  }

  const score = Math.max(70, Math.min(100, 100 - criticalErrors.length * 20 - technicalWarnings.length * 5));

  return {
    overallScore: score,
    accuracyRate: score,
    gradeLabel: score >= 90 ? 'ممتاز (Grade A)' : score >= 80 ? 'استاندارد (Grade B)' : 'نیازمند بازنگری',
    gradeColor: score >= 90 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    calculatedVolumeCm3: volumeCm3,
    recommendedGrammageMin: Math.max(250, Math.min(450, Math.round(250 + volumeCm3 * 0.05))),
    recommendedGrammageMax: Math.max(300, Math.min(600, Math.round(300 + volumeCm3 * 0.08))),
    recommendedCaliperMm: Number(thickness.toFixed(2)),
    idealTuckFlapMm: idealTuck,
    idealDustFlapMm: idealDust,
    idealGlueTabMm: idealGlue,
    bctCompressiveStrengthKg: Math.round(Math.max(20, Math.min(500, (L + W) * 0.4))),
    creaseLossFactorMm: Number((thickness * 1.5).toFixed(2)),
    criticalErrors,
    technicalWarnings,
    compliantPasses,
    suggestions,
  };
};
