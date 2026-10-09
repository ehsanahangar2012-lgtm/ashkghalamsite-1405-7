/**
 * packagingStandards.ts
 * Packaging Industry Standards Engine (ECMA & FEFCO Specifications)
 * Encapsulates rules for die-line folds, bleed margins, paper grain direction,
 * lock tab ratios, and material caliper compensations.
 */

export interface PackagingStandardRules {
  minBleedMm: number;
  recommendedBleedMm: number;
  maxTuckRatio: number; // Ratio of tuck flap to box length/width
  minTuckRatio: number;
  dustFlapBevelAngleDeg: number;
  grainDirectionSensitivity: 'long' | 'short' | 'flexible';
  minGlueFlapWidthMm: number;
  maxDustFlapGapMm: number;
}

export interface PaperGrainAnalysis {
  recommendedGrainDirection: 'long-grain' | 'short-grain';
  isGrainCompliant: boolean;
  explanation: string;
  stiffnessIndex: number; // 0 to 100
  grainDirectionLabel: string;
  mainBendingAxis: string;
  isBendingWithGrain: boolean;
}

export interface BleedValidationResult {
  isValid: boolean;
  currentBleedMm: number;
  recommendedBleedMm: number;
  warning?: string;
}

export interface StructuralWarning {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'lock_tab' | 'folding_area' | 'grain_direction' | 'bleed_margin' | 'caliper_offset' | 'hinge_clearance';
  title: string;
  message: string;
  recommendation: string;
  impactScore: number; // 0 (mild) to 100 (critical fail)
}

export class PackagingStandardsService {
  /**
   * Industry standard rules according to ECMA (Folding Carton) and FEFCO (Corrugated Board)
   */
  public static getStandardsForModel(modelId: string, boardType: 'folding_boxboard' | 'corrugated' | 'rigid'): PackagingStandardRules {
    const isCorrugated = boardType === 'corrugated';

    if (modelId.startsWith('FEFCO') || isCorrugated) {
      return {
        minBleedMm: 3.0,
        recommendedBleedMm: 5.0,
        minTuckRatio: 0.15,
        maxTuckRatio: 0.35,
        dustFlapBevelAngleDeg: 15,
        grainDirectionSensitivity: 'short', // Flutes typically run parallel to main height score
        minGlueFlapWidthMm: 25.0,
        maxDustFlapGapMm: 3.0,
      };
    }

    // ECMA / Folding Carton default
    return {
      minBleedMm: 2.0,
      recommendedBleedMm: 3.0,
      minTuckRatio: 0.12,
      maxTuckRatio: 0.30,
      dustFlapBevelAngleDeg: 15,
      grainDirectionSensitivity: 'long',
      minGlueFlapWidthMm: 12.0,
      maxDustFlapGapMm: 1.5,
    };
  }

  /**
   * Evaluates paper grain direction relative to primary fold axes
   */
  public static analyzePaperGrain(
    length: number,
    width: number,
    height: number,
    selectedGrain: 'long-grain' | 'short-grain',
    boardType: string
  ): PaperGrainAnalysis {
    // Folds along box height require grain to run parallel to height crease lines for maximum stiffness against buckling
    const heightDominance = height / Math.max(length, width);
    const recommendedGrain: 'long-grain' | 'short-grain' = heightDominance > 0.8 ? 'long-grain' : 'short-grain';

    const isGrainCompliant = selectedGrain === recommendedGrain;
    const stiffnessIndex = isGrainCompliant ? 95 : 62;

    let explanation = `جهت الیاف مقوا (${selectedGrain === 'long-grain' ? 'طولی' : 'عرضی'}) انتخاب شده است. `;
    if (!isGrainCompliant) {
      explanation += `توصیه استاندارد ECMA: برای خطوط تا در ارتفاع ${height}mm، جهت الیاف باید ${recommendedGrain === 'long-grain' ? 'طولی' : 'عرضی'} باشد تا از شکستن لب‌به‌لب و شکم دادن جعبه جلوگیری شود.`;
    } else {
      explanation += `جهت الیاف کاملاً با محور اصلی خطوط تای ارتفاع هم‌راستاست و حداکثر مقاومت فشاری جعبه (BCT) حاصل می‌گردد.`;
    }

    const grainDirectionLabel = selectedGrain === 'long-grain' ? 'راسته / الیاف طولی (Long Grain)' : 'راه راسته / الیاف عرضی (Short Grain)';
    const mainBendingAxis = `محور اصلی خم: ${height}mm (ارتفاع)`;
    const isBendingWithGrain = isGrainCompliant;

    return {
      recommendedGrainDirection: recommendedGrain,
      isGrainCompliant,
      explanation,
      stiffnessIndex,
      grainDirectionLabel,
      mainBendingAxis,
      isBendingWithGrain,
    };
  }

  public static analyzePaperGrainDirection(
    length: number,
    width: number,
    height: number,
    selectedGrain: 'long-grain' | 'short-grain',
    boardType: string = 'folding_boxboard'
  ): PaperGrainAnalysis {
    return this.analyzePaperGrain(length, width, height, selectedGrain, boardType);
  }

  /**
   * Validates bleed margins against printing and die-cutting tolerances
   */
  public static validateBleedMargin(bleedMm: number, boardType: string): BleedValidationResult {
    const rules = this.getStandardsForModel('ECMA', boardType as any);
    if (bleedMm < rules.minBleedMm) {
      return {
        isValid: false,
        currentBleedMm: bleedMm,
        recommendedBleedMm: rules.recommendedBleedMm,
        warning: `حاشیه اطمینان برش (Bleed) کمتر از حد استاندارد ${rules.minBleedMm}mm است. احتمال ظهور سفیدک در لبه‌های جعبه وجود دارد.`
      };
    }
    return {
      isValid: true,
      currentBleedMm: bleedMm,
      recommendedBleedMm: rules.recommendedBleedMm,
    };
  }

  /**
   * Performs deep AI-assisted structural analysis on die-line dimensions and material caliper
   */
  public static performStructuralDiagnostic(params: {
    length: number;
    width: number;
    height: number;
    caliperMm: number;
    tuckHeightMm?: number;
    glueWidthMm?: number;
    autoLockAngleDeg?: number;
    grainDirection: 'long-grain' | 'short-grain';
    boardType: string;
    modelCode?: string;
  }): StructuralWarning[] {
    const warnings: StructuralWarning[] = [];
    const { length, width, height, caliperMm, grainDirection, boardType, modelCode = 'ECMA-A2020' } = params;

    const rules = this.getStandardsForModel(modelCode, boardType as any);

    // 1. Weak Lock Tab Diagnosis
    const tuckH = params.tuckHeightMm ?? Math.min(22, Math.max(12, width * 0.22));
    if (tuckH < 12.0) {
      warnings.push({
        id: 'weak_lock_tab_height',
        type: 'error',
        category: 'lock_tab',
        title: 'زبانه زبونه قفل بسیار کوتاه است (Weak Lock Tab)',
        message: `ارتفاع زبانه قفل اصطکاکی (${tuckH.toFixed(1)}mm) کمتر از حد آستانه چفت‌شوندگی است.`,
        recommendation: `ارتفاع زبانه زبونه را به حداقل ۱۵ میلی‌متر افزایش دهید تا گیرایی اصطکاکی استاندارد ECMA تأمین شود.`,
        impactScore: 85,
      });
    } else if (tuckH > width * 0.45) {
      warnings.push({
        id: 'oversized_tuck_tab',
        type: 'warning',
        category: 'lock_tab',
        title: 'احتمال گیر کردن زبانه هنگام بستن (Tuck Tab Interference)',
        message: `ارتفاع زبانه نسبت به عرض دهانه جعبه بزرگ است و هنگام جازدن به دیواره عقب گیر می‌کند.`,
        recommendation: `ارتفاع زبانه را بین ۱۵٪ تا ۳۰٪ عرض جعبه (حدود ${(width * 0.22).toFixed(1)}mm) تنظیم کنید.`,
        impactScore: 45,
      });
    }

    // 2. Insufficient Folding Area / Caliper Clearance
    const minHingeClearance = caliperMm * 1.5;
    if (height < caliperMm * 10) {
      warnings.push({
        id: 'insufficient_folding_area',
        type: 'error',
        category: 'folding_area',
        title: 'مساحت خط‌تا و ارتفاع ناکافی (Insufficient Folding Area)',
        message: `ارتفاع جعبه (${height}mm) نسبت به ضخامت مقوا (${caliperMm}mm) بسیار کم است و خط‌های تا هم‌پوشانی فشاری پیدا می‌کنند.`,
        recommendation: `ارتفاع را حداقل به ${(caliperMm * 12).toFixed(1)}mm برسانید یا ضخامت گرماژ مقوا را کاهش دهید.`,
        impactScore: 90,
      });
    }

    // 3. Glue Flap Clearance
    const glueW = params.glueWidthMm ?? 15;
    if (glueW < rules.minGlueFlapWidthMm) {
      warnings.push({
        id: 'narrow_glue_flap',
        type: 'warning',
        category: 'caliper_offset',
        title: 'عرض زبانه چسب ناافی (Narrow Glue Flap)',
        message: `عرض زبانه چسب (${glueW}mm) کمتر از حد توصیه استاندارد (${rules.minGlueFlapWidthMm}mm) برای چسب‌زنی اتوماتیک است.`,
        recommendation: `عرض لبه چسب‌خور را به حداقل ${rules.minGlueFlapWidthMm}mm برسانید تا دستگاه جعبه‌چسبان نازل نازک را بپوشاند.`,
        impactScore: 60,
      });
    }

    // 4. Crash-Lock Bottom Angle & Interlocking Geometry Verification (FEFCO 0215 / ECMA A7000)
    const lockFlapAnalysis = this.analyzeBottomLockFlapGeometry(length, width, height, caliperMm, params.autoLockAngleDeg || 45);
    if (!lockFlapAnalysis.isCompliant) {
      lockFlapAnalysis.warnings.forEach(w => warnings.push(w));
    }

    // 5. Paper Grain Analysis
    const grainResult = this.analyzePaperGrain(length, width, height, grainDirection, boardType);
    if (!grainResult.isGrainCompliant) {
      warnings.push({
        id: 'grain_direction_conflict',
        type: 'info',
        category: 'grain_direction',
        title: 'عدم انطباق راسته الیاف کاغذ (Paper Grain Discrepancy)',
        message: grainResult.explanation,
        recommendation: `جهت راه کاغذ در شیت چیدمان را روی حالت ${grainResult.recommendedGrainDirection === 'long-grain' ? 'طولی (Long Grain)' : 'عرضی (Short Grain)'} قرار دهید.`,
        impactScore: 30,
      });
    }

    return warnings;
  }

  /**
   * Intelligently analyzes bottom lock flap angles, interlocking geometry, hook notches, and clearance ratios.
   */
  public static analyzeBottomLockFlapGeometry(
    length: number,
    width: number,
    height: number,
    caliperMm: number,
    autoLockAngleDeg: number = 45
  ): {
    isCompliant: boolean;
    recommendedAngleDeg: number;
    warnings: StructuralWarning[];
    lockInterlockQualityScore: number; // 0 to 100
  } {
    const warnings: StructuralWarning[] = [];
    const flapHeight = (width / 2) + 2.0;
    const radAngle = (autoLockAngleDeg * Math.PI) / 180;
    const tanAngle = Math.tan(radAngle);
    const slopedOffset = flapHeight / (tanAngle || 1);

    // 1. Angle Bounds Check
    if (autoLockAngleDeg < 38 || autoLockAngleDeg > 52) {
      warnings.push({
        id: 'autolock_angle_skew',
        type: 'warning',
        category: 'hinge_clearance',
        title: 'زاویه نامناسب قفل ته‌چسب (Crash Lock Angle Mismatch)',
        message: `زاویه مورب ته قفلی (${autoLockAngleDeg}°) از محدوده استاندارد ۴۲ تا ۴۸ درجه خارج است.`,
        recommendation: `زاویه قطری فلپ‌های ته قفلی را روی ۴۵ درجه تنظیم کنید تا هنگام باز شدن مسطح به راحتی چفت شود.`,
        impactScore: 50,
      });
    }

    // 2. Sloped Offset vs Panel Length ratio check
    if (slopedOffset >= length * 0.85) {
      warnings.push({
        id: 'bottom_lock_slope_overflow',
        type: 'error',
        category: 'lock_tab',
        title: 'تداخل شیب زبانه با طول دیواره (Bottom Lock Slope Overflow)',
        message: `طول شیب قطری زبانه ته (${slopedOffset.toFixed(1)}mm) بیش از حد به طول دیواره (${length}mm) نزدیک است و مانع قفل شدن صحیح می‌شود.`,
        recommendation: `طول جعبه (L) را افزایش دهید یا زاویه قفل را به ۴۸ درجه متمایل کنید.`,
        impactScore: 85,
      });
    }

    // 3. Width vs Length Ratio Check for Interlocking Flaps
    if (width > length * 1.3) {
      warnings.push({
        id: 'bottom_lock_width_ratio_exceeded',
        type: 'warning',
        category: 'lock_tab',
        title: 'نسبت نامناسب عرض به طول ته قفلی (Width/Length Ratio Hazard)',
        message: `عرض جعبه (${width}mm) از طول آن (${length}mm) بزرگتر است؛ در قفل‌های ته زبانه مجاور ممکن است هنگام جازدن گیر کنند.`,
        recommendation: `از مدل قفل تقویت‌شده (Reinforced Lock) استفاده کرده و شیار قلاب پله‌ای ۵ میلی‌متری اعمال نمایید.`,
        impactScore: 65,
      });
    }

    // 4. Caliper Gap Clearance
    const minClearance = 3.0 + (1.2 * caliperMm);
    if (flapHeight < minClearance * 2) {
      warnings.push({
        id: 'bottom_lock_clearance_insufficient',
        type: 'error',
        category: 'caliper_offset',
        title: 'فاصله آزاد تنش خط‌تا ناکافی (Insufficient Crease Clearance)',
        message: `ارتفاع زبانه ته (${flapHeight.toFixed(1)}mm) برای ضخامت مقوا (${caliperMm}mm) بسیار کوچک است و لبه‌ها له می‌شوند.`,
        recommendation: `عرض جعبه یا ارتفاع زبانه ته را افزایش دهید.`,
        impactScore: 75,
      });
    }

    const isCompliant = warnings.length === 0;
    const lockInterlockQualityScore = Math.max(20, 100 - warnings.reduce((acc, w) => acc + w.impactScore * 0.3, 0));

    return {
      isCompliant,
      recommendedAngleDeg: 45,
      warnings,
      lockInterlockQualityScore: Math.round(lockInterlockQualityScore),
    };
  }
}
