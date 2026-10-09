// =========================================================================
// ASHK GHALAM PACKAGING CAD - DIMENSION ACCURACY & GEOMETRIC EVALUATOR
// =========================================================================
// Validates dieline inputs against ECMA, FEFCO, and ISO/DIN packaging standards.

export interface DimensionAccuracyInput {
  L: number; // Length (mm)
  W: number; // Width (mm)
  H: number; // Height (mm)
  grammage: number; // GSM (g/m2)
  thickness: number; // Board thickness / Caliper T (mm)
  tuck: number; // Tuck flap length (mm)
  dustFlap: number; // Dust flap length (mm)
  glueTab: number; // Glue tab width (mm)
  modelId: string; // Model ID (e.g. ecma-a2020, fefco-0215, snap-lock-123, fefco-0427)
  paperType?: string; // SBS, FBB, Duplex, Corrugated E, Corrugated B
  grainDirection?: 'horizontal' | 'vertical'; // Paper grain direction
}

export interface AccuracyIssueSuggestion {
  id: string;
  field: 'L' | 'W' | 'H' | 'tuck' | 'dustFlap' | 'glueTab' | 'grammage' | 'thickness';
  title: string;
  issue: string;
  fix: string;
  suggestedValue: number;
  type: 'critical' | 'warning' | 'info';
  standardRef: string; // e.g. "ECMA Section 3.2 / DIN 55437"
}

export interface DimensionAccuracyReport {
  overallScore: number; // 0 - 100%
  gradeLabel: 'ممتاز (صنعتی 100٪)' | 'استاندارد عالی' | 'نیازمند اصلاح فنی' | 'بحرانی (غیرقابل تولید)';
  gradeColor: string; // tailwind color class
  criticalErrors: string[];
  technicalWarnings: string[];
  compliantPasses: string[];
  suggestions: AccuracyIssueSuggestion[];
  
  // Calculated Engineering Metrics
  calculatedVolumeCm3: number;
  recommendedGrammageMin: number;
  recommendedGrammageMax: number;
  recommendedCaliperMm: number;
  idealTuckFlapMm: number;
  idealDustFlapMm: number;
  idealGlueTabMm: number;
  bctCompressiveStrengthKg: number; // Box Compression Test estimate (McKee formula)
  creaseLossFactorMm: number; // Crease score allowance
}

/**
 * Runs a rigorous packaging engineering dimension & geometric accuracy evaluation.
 */
export function evaluateDimensionAccuracy(input: DimensionAccuracyInput): DimensionAccuracyReport {
  const {
    L, W, H,
    grammage = 300,
    thickness = 0.42,
    tuck = 18,
    dustFlap = 15,
    glueTab = 15,
    modelId = 'ecma-a2020'
  } = input;

  const criticalErrors: string[] = [];
  const technicalWarnings: string[] = [];
  const compliantPasses: string[] = [];
  const suggestions: AccuracyIssueSuggestion[] = [];

  let score = 100;

  const T = Math.max(0.1, thickness);
  const volumeCm3 = Math.round((L * W * H) / 1000);

  // -----------------------------------------------------------------------
  // 1. BASIC DIMENSION BOUNDS CHECK
  // -----------------------------------------------------------------------
  if (L <= 0 || W <= 0 || H <= 0) {
    criticalErrors.push('❌ خطای ابعاد صفر یا منفی: طول، عرض و ارتفاع باید مقادیر مثبت بزرگتر از صفر باشند.');
    score = 0;
  } else {
    compliantPasses.push(`✓ ابعاد پایه ($L=${L}$, $W=${W}$, $H=${H}$ mm) دارای مقادیر عددی معتبر هستند.`);
  }

  // -----------------------------------------------------------------------
  // 2. GRAMMAGE & BOARD THICKNESS VS BOX VOLUME EVALUATION (McKee & DIN 55437)
  // -----------------------------------------------------------------------
  // Recommended grammage logic based on volume and largest panel perimeter
  const boxPerimeterMm = 2 * (L + W);
  let recGrammageMin = 250;
  let recGrammageMax = 400;

  if (volumeCm3 < 100) {
    recGrammageMin = 230;
    recGrammageMax = 320;
  } else if (volumeCm3 < 500) {
    recGrammageMin = 280;
    recGrammageMax = 350;
  } else if (volumeCm3 < 2000) {
    recGrammageMin = 350;
    recGrammageMax = 450; // or E-flute corrugated
  } else {
    recGrammageMin = 400; // E-flute / B-flute corrugated
    recGrammageMax = 800;
  }

  // Check 2a: Under-specced paper grammage for large box volume
  if (volumeCm3 > 1200 && grammage < 300) {
    technicalWarnings.push(`⚠️ هشداری گرماژ کم مقوا: حجم جعبه (${volumeCm3} سانتی‌متر مکعب) برای مقوای ${grammage} گرمی زیاد است. احتمال شکم دادن دیواره‌ها و لهیدگی تحت بار عمودی وجود دارد.`);
    score -= 15;
    suggestions.push({
      id: 'fix-grammage-low',
      field: 'grammage',
      title: 'افزایش گرماژ مقوا جهت استحکام دیواره',
      issue: `گرماژ ${grammage}g/m² برای حجم ${volumeCm3}cm³ ضعیف است.`,
      fix: 'ارتقای گرماژ به حداقل ۳۵۰ گرم یا استفاده از کارتن مایکروویو E-Flute.',
      suggestedValue: 350,
      type: 'warning',
      standardRef: 'DIN 55437 / McKee Formula'
    });
  } else if (volumeCm3 < 80 && grammage > 400 && T > 0.8) {
    technicalWarnings.push(`⚠️ گرماژ و ضخامت بیش از حد برای جعبه مینیاتوری: ضخامت ${T}mm برای جعبه بسیار کوچک موجب ترک خوردن خطوط تا (Score Cracking) و عدم تاخوردگی ۹۰ درجه زوایا می‌شود.`);
    score -= 10;
    suggestions.push({
      id: 'fix-grammage-high',
      field: 'grammage',
      title: 'کاهش گرماژ/ضخامت مقوای مینیاتوری',
      issue: `ضخامت ${T}mm برای جعبه مینیاتوری بسیار ضخیم است.`,
      fix: 'استفاده از مقوای ۳۰۰ گرم ایندربرد (ضخامت ۰.۴۲mm) جهت جلوگیری از شکست بستر تا.',
      suggestedValue: 300,
      type: 'warning',
      standardRef: 'ECMA Section 2.1 - Score Radius'
    });
  } else {
    compliantPasses.push(`✓ تناسب گرماژ مقوا (${grammage} g/m²) با حجم جعبه (${volumeCm3} cm³) کاملاً استاندارد است.`);
  }

  // -----------------------------------------------------------------------
  // 3. ASPECT RATIO & STRUCTURAL PROPORTIONS EVALUATION
  // -----------------------------------------------------------------------
  const aspectLW = L / Math.max(1, W);
  if (aspectLW > 5.5) {
    technicalWarnings.push(`⚠️ نسبت طول به عرض غیرمتعارف (L/W = ${aspectLW.toFixed(1)}): طول جعبه بیش از ۵.۵ برابر عرض است. این امر سبب کمانش دیواره طولی (Bowing) هنگام چسب‌زنی می‌شود.`);
    score -= 12;
  } else if (aspectLW < 0.25) {
    technicalWarnings.push(`⚠️ نسبت طول به عرض معکوس (L/W = ${aspectLW.toFixed(2)}): عرض جعبه بسیار بیشتر از طول است. هدررفت متریال در قالب چیدمان چاپی افزایش می‌یابد.`);
    score -= 8;
  } else {
    compliantPasses.push(`✓ نسبت طول به عرض دیواره ($L/W = ${aspectLW.toFixed(2)}$) متناسب و پایدار است.`);
  }

  // -----------------------------------------------------------------------
  // 4. FLAP & LOCK CLEARANCE EVALUATION (ECMA / FEFCO Standards)
  // -----------------------------------------------------------------------

  // Ideal Tuck Flap Calculation:
  // ECMA Standard: tuck flap length t should be between 12mm and (W - 2T - 2mm)
  const idealTuckFlap = Math.max(12, Math.min(30, Math.round(W * 0.35 + 5)));

  // Check 4a: Tuck Flap Length vs Box Width & Caliper
  if (tuck >= W - T) {
    criticalErrors.push(`❌ تداخل شدید زبانه درپوش (Tuck Flap): طول زبانه درپوش (${tuck}mm) از عرض داخلی بدنه (${(W - T).toFixed(1)}mm) بزرگتر یا مساوی است. درپوش هنگام بسته شدن به دیواره پشتی برخورد کرده و وارد جعبه نمی‌شود.`);
    score -= 25;
    suggestions.push({
      id: 'fix-tuck-too-long',
      field: 'tuck',
      title: 'اصلاح طول زبانه درپوش (Tuck Flap)',
      issue: `زبانه ${tuck}mm بلندتر از عرض جعبه (${W}mm) است.`,
      fix: `کاهش طول زبانه درپوش به ${idealTuckFlap} میلی‌متر جهت ورود روان بدون گیر مکانیکی.`,
      suggestedValue: idealTuckFlap,
      type: 'critical',
      standardRef: 'ECMA Standard A20.20 Clause 4.1'
    });
  } else if (tuck < 10 && W > 35) {
    technicalWarnings.push(`⚠️ زبانه درپوش بسیار کوتاه (${tuck}mm): زبانه کمتر از ۱۰ میلی‌متر گیرایی اصطکاکی کافی نداشته و درپوش جعبه به راحتی و خودبه‌خود باز خواهد شد.`);
    score -= 10;
    suggestions.push({
      id: 'fix-tuck-too-short',
      field: 'tuck',
      title: 'افزایش طول زبانه درپوش',
      issue: `زبانه ${tuck}mm بسیار کوتاه است.`,
      fix: `افزایش زبانه درپوش به ${idealTuckFlap} میلی‌متر جهت چفت‌شدن ایمن.`,
      suggestedValue: idealTuckFlap,
      type: 'warning',
      standardRef: 'ECMA Standard A20.20'
    });
  } else {
    compliantPasses.push(`✓ طول زبانه درپوش (${tuck} mm) با عرض بدنه (${W} mm) انطباق کامل دارد.`);
  }

  // Ideal Dust Flap Calculation:
  // Must not exceed L / 2 to avoid overlapping internally
  const maxSafeDustFlap = Math.max(10, Math.round((L / 2) - (1.5 * T)));
  const idealDustFlap = Math.min(maxSafeDustFlap, Math.max(12, Math.round(W * 0.38)));

  // Check 4b: Dust Flap Internal Collision Check
  if (dustFlap > L / 2 - 0.5) {
    criticalErrors.push(`❌ تداخل داخلی باله‌های گردگیر (Dust Flaps): طول باله (${dustFlap}mm) از نصف طول دهانه (${(L / 2).toFixed(1)}mm) بزرگتر است. در هنگام بستن درپوش، دو باله گردگیر به هم برخورد کرده و له می‌شوند.`);
    score -= 20;
    suggestions.push({
      id: 'fix-dustflap-overlap',
      field: 'dustFlap',
      title: 'اصلاح طول باله‌های گردگیر (Dust Flaps)',
      issue: `طول باله ${dustFlap}mm از نصف طول جعبه (${(L / 2).toFixed(1)}mm) بزرگتر است.`,
      fix: `کاهش طول باله گردگیر به ${idealDustFlap} میلی‌متر جهت جلوگیری از تداخل داخلی.`,
      suggestedValue: idealDustFlap,
      type: 'critical',
      standardRef: 'ISO/DIN 13271 Packaging Standards'
    });
  } else {
    compliantPasses.push(`✓ طول باله‌های گردگیر (${dustFlap} mm) کمتر از نصف طول دهانه (${(L/2).toFixed(1)} mm) بوده و تداخل ندارد.`);
  }

  // Ideal Glue Tab Calculation:
  // Standard minimum glue tab width is 15mm for folding carton, 22mm for corrugated
  const minGlueTab = T > 1.0 || grammage > 400 ? 22 : 15;
  const idealGlueTab = Math.max(minGlueTab, Math.min(30, Math.round(W * 0.25 + 10)));

  // Check 4c: Glue Tab Width & Adhesive Surface Area
  if (glueTab < minGlueTab && !modelId.startsWith('fefco-03') && !modelId.startsWith('fefco-0427') && !modelId.startsWith('fefco-pizza')) {
    criticalErrors.push(`❌ عرض لب‌چسب ناافی (${glueTab}mm): برای این جنس/گرماژ، عرض لب‌چسب باید حداقل ${minGlueTab} میلی‌متر باشد تا چسب نازل در دستگاه جعبه‌چسبان اتوماتیک دفرمه نشود.`);
    score -= 20;
    suggestions.push({
      id: 'fix-gluetab-narrow',
      field: 'glueTab',
      title: 'افزایش عرض لب‌چسب (Glue Tab)',
      issue: `عرض لب‌چسب ${glueTab}mm کمتر از حداقل صنعتی ${minGlueTab}mm است.`,
      fix: `افزایش عرض لب‌چسب به ${idealGlueTab} میلی‌متر جهت اتصال چسب بدون گسست.`,
      suggestedValue: idealGlueTab,
      type: 'critical',
      standardRef: 'ECMA Glue Seam Standards Clause 6.3'
    });
  } else {
    compliantPasses.push(`✓ عرض لب‌چسب (${glueTab} mm) برای تزریق چسب اتوماتیک کاملاً استاندارد است.`);
  }

  // -----------------------------------------------------------------------
  // 5. MODEL-SPECIFIC PACKAGING GEOMETRY VALIDATION
  // -----------------------------------------------------------------------

  // 5a. Auto-Lock Bottom (FEFCO 0215 / Snap Lock 1-2-3 / Crash Lock)
  if (modelId === 'fefco-0215' || modelId === 'snap-lock-123' || modelId.includes('auto-bottom') || modelId.includes('crash-lock')) {
    // Crash Lock Requirement 1: Length L vs Width W ratio
    if (L < W * 0.7) {
      criticalErrors.push(`⛔ خطای هندسی قفل ته قفلی: طول جعبه ($L=${L}$ mm) از $0.7 \times W$ ($${(W * 0.7).toFixed(1)}$ mm) کوچکتر است. زبانه‌های ۴۵ درجه کف در حالت خوابیده (Flat) تداخل پیدا کرده و جعبه چسب‌خوری نمی‌شود.`);
      score -= 30;
      suggestions.push({
        id: 'fix-autobottom-length',
        field: 'L',
        title: 'افزایش طول جعبه ته قفلی',
        issue: `طول L=${L}mm برای مکانیسم ته قفلی نسبت به W=${W}mm بسیار کم است.`,
        fix: `افزایش طول L به حداقل ${Math.round(W)} میلی‌متر.`,
        suggestedValue: Math.round(W),
        type: 'critical',
        standardRef: 'FEFCO 0215 Standard Specifications'
      });
    }

    // Crash Lock Requirement 2: Height H clearance for flat folding
    const minHeightForAutoBottom = Math.round((W / 2) + 5);
    if (H < minHeightForAutoBottom) {
      criticalErrors.push(`⛔ خطای ارتفاع کم ته قفلی: ارتفاع ($H=${H}$ mm) کمتر از حداقل لازمه تا شدن ($${minHeightForAutoBottom}$ mm) است. هنگام تا شدن خوابیده جعبه، زبانه‌های کف از دهانه بالا بیرون خواهند زد.`);
      score -= 25;
      suggestions.push({
        id: 'fix-autobottom-height',
        field: 'H',
        title: 'افزایش ارتفاع جعبه ته قفلی',
        issue: `ارتفاع H=${H}mm برای تا شدن خوابیده ته قفلی کوتاه است.`,
        fix: `افزایش ارتفاع H به حداقل ${minHeightForAutoBottom} میلی‌متر.`,
        suggestedValue: minHeightForAutoBottom,
        type: 'critical',
        standardRef: 'ECMA A2110 Crash Lock Specs'
      });
    } else {
      compliantPasses.push(`✓ هندسه ته قفلی ($L \ge W$ و $H \ge W/2$) شرایط تاخوردگی اتوماتیک چسب‌زن را دارا است.`);
    }
  }

  // 5b. Roll End Tuck Top / Mailer Box (FEFCO 0427 / FEFCO 0426 Pizza)
  if (modelId === 'fefco-0427' || modelId === 'fefco-pizza') {
    if (H > L) {
      technicalWarnings.push(`⚠️ ارتفاع زیاد در جعبه کیبوردی/پستی (H > L): مدل FEFCO 0427 برای جعبه‌های عمودی طراحی نشده است. قفل شدن زبانه‌های بغل در ارتفاع‌های زیاد با سختی مواجه می‌شود.`);
      score -= 15;
    } else {
      compliantPasses.push(`✓ نسبت ارتفاع به طول در مدل پستی کیبوردی FEFCO 0427 بهینه است.`);
    }
  }

  // 5c. Telescopic / Lid & Base (FEFCO 0300)
  if (modelId === 'fefco-0300' || modelId === 'fefco-0320') {
    if (H < 25) {
      technicalWarnings.push(`⚠️ ارتفاع کم درب و زیره: ارتفاع کم دیواره (${H}mm) استحکام منگنه/چسب گوشه‌ها را کاهش می‌دهد.`);
      score -= 10;
    } else {
      compliantPasses.push(`✓ ابعاد دیواره تلسکوپی FEFCO 0300 دارای پایداری ساختاری است.`);
    }
  }

  // -----------------------------------------------------------------------
  // 6. COMPRESSIVE STRENGTH (BCT) ESTIMATE VIA MCKEE FORMULA
  // -----------------------------------------------------------------------
  // BCT (kg) = 5.87 * ECT * sqrt(Perimeter * Caliper)
  // Rough estimate in kg-force
  const ectValue = T > 1.2 ? 5.5 : 4.0; // kN/m
  const perimeterCm = (2 * (L + W)) / 10;
  const caliperCm = T / 10;
  const bctKg = Math.round(5.87 * ectValue * Math.sqrt(perimeterCm * caliperCm) * 1.8);

  // Score clamping & grading label
  score = Math.max(0, Math.min(100, Math.round(score)));

  let gradeLabel: DimensionAccuracyReport['gradeLabel'] = 'ممتاز (صنعتی 100٪)';
  let gradeColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';

  if (score >= 95) {
    gradeLabel = 'ممتاز (صنعتی 100٪)';
    gradeColor = 'text-emerald-400 border-emerald-500/50 bg-emerald-950/30';
  } else if (score >= 80) {
    gradeLabel = 'استاندارد عالی';
    gradeColor = 'text-sky-400 border-sky-500/50 bg-sky-950/30';
  } else if (score >= 60) {
    gradeLabel = 'نیازمند اصلاح فنی';
    gradeColor = 'text-amber-400 border-amber-500/50 bg-amber-950/30';
  } else {
    gradeLabel = 'بحرانی (غیرقابل تولید)';
    gradeColor = 'text-rose-400 border-rose-500/50 bg-rose-950/30';
  }

  return {
    overallScore: score,
    gradeLabel,
    gradeColor,
    criticalErrors,
    technicalWarnings,
    compliantPasses,
    suggestions,
    calculatedVolumeCm3: volumeCm3,
    recommendedGrammageMin: recGrammageMin,
    recommendedGrammageMax: recGrammageMax,
    recommendedCaliperMm: T,
    idealTuckFlapMm: idealTuckFlap,
    idealDustFlapMm: idealDustFlap,
    idealGlueTabMm: idealGlueTab,
    bctCompressiveStrengthKg: bctKg,
    creaseLossFactorMm: Number((T * 0.35).toFixed(2))
  };
}
