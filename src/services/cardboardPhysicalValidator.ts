export interface PhysicalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  calculatedOuterDims: { L: number; W: number; H: number };
  calculatedInnerDims: { L: number; W: number; H: number };
  materialThicknessMm: number;
  minSheetRequirementMm: { width: number; height: number };
  bctEstimateKg: number;
  creaseLossRatio: number;
}

export interface BoxValidationInput {
  modelId: string;
  modelName?: string;
  L: number;
  W: number;
  H: number;
  material: {
    id: string;
    name: string;
    category: string;
    thickness: number; // in mm
    weight?: number; // gsm
    ectValue?: number;
    foldLoss?: number;
  };
  tuck?: number;
  dustFlap?: number;
  glueTab?: number;
  sheetSize?: { width: number; height: number };
}

/**
 * اعتبارسنجی جامع فیزیکی و مکانیکی ابعاد جعبه قبل از تولید و رندر سه‌بعدی
 * بر اساس ویژگی‌های واقعی مقوا، فلوتینگ و استانداردهای FEFCO و ECMA
 */
export const validateBoxPhysicalLimits = (input: BoxValidationInput): PhysicalValidationResult => {
  const { L, W, H, material, modelId, tuck = 25, glueTab = 30, sheetSize } = input;
  const errors: string[] = [];
  const warnings: string[] = [];

  const t = Math.max(0.1, material.thickness || 0.45);
  const isCorrugated = material.category === 'Corrugated' || t >= 1.2;

  // ۱. اعتبارسنجی مقادیر عددی پایه
  if (!L || isNaN(L) || L <= 0) errors.push('طول جعبه (L) باید مقداری عددی و بزرگتر از صفر باشد.');
  if (!W || isNaN(W) || W <= 0) errors.push('عرض جعبه (W) باید مقداری عددی و بزرگتر از صفر باشد.');
  if (!H || isNaN(H) || H <= 0) errors.push('ارتفاع جعبه (H) باید مقداری عددی و بزرگتر از صفر باشد.');

  // ۲. محدودیت حداقل ابعاد با توجه به ضخامت مقوا (خط تا و شعاع خمش)
  // برای ایجاد خط تا، حداقل بعد پنل باید حداقل ۳ تا ۵ برابر ضخامت ورق باشد
  const minPanelLimit = Math.max(20, Math.round(t * 8));
  if (L < minPanelLimit) {
    errors.push(`طول جعبه (${L} mm) از حداقل مجاز فیزیکی برای ضخامت مقوا (${minPanelLimit} mm) کمتر است؛ تیغ خط تا در این ابعاد بافت مقوا را متلاشی می‌کند.`);
  }
  if (W < minPanelLimit) {
    errors.push(`عرض جعبه (${W} mm) از حداقل مجاز فیزیکی برای ضخامت مقوا (${minPanelLimit} mm) کمتر است؛ امکان تشکیل لولای تاشو وجود ندارد.`);
  }
  if (H < Math.max(15, Math.round(t * 6))) {
    errors.push(`ارتفاع جعبه (${H} mm) بسیار اندک است؛ دایکاتور قادر به خط تا زدن دیواره‌های کوتاه‌تر از ${Math.max(15, Math.round(t * 6))} mm نیست.`);
  }

  // ۳. بررسی نسبت‌های هندسی و فیزیکی پایه‌ای (Aspect Ratios)
  if (H > 3.5 * Math.min(L, W)) {
    warnings.push(`نسبت ارتفاع به قاعده جعبه (${(H / Math.min(L, W)).toFixed(1)} برابر) بیش از حد بالاست؛ خطر واژگونی روی کانوایر، کمانش تحت بار و ناتوانی در چیدمان پالت.`);
  }
  if (L < W) {
    warnings.push('طول جعبه کمتر از عرض آن انتخاب شده است؛ در استاندارد کارتن‌سازی برای هدایت بهینه جریان الیاف و ایستایی، معمولاً L ≥ W در نظر گرفته می‌شود.');
  }

  // ۴. بررسی متناظر با ضخامت مقوا و فلوت (Corrugated vs Paperboard)
  if (isCorrugated) {
    // در کارتن‌های کروگیت، زبانه‌های قفل ریز نمی‌توانند ساخته شوند
    if (tuck < t * 8 && (modelId.includes('427') || modelId.includes('tuck') || modelId.includes('ecma'))) {
      errors.push(`زبانه قفل (${tuck} mm) برای مقوای کنگره‌دار به ضخامت ${t} mm بسیار کوتاه است و در مادگی چفت نمی‌شود (حداقل ${Math.round(t * 10)} mm الزامی است).`);
    }
    if (glueTab < 25) {
      warnings.push(`لبه چسب (${glueTab} mm) برای چسب سرد کارتن‌های ضخیم اندک است؛ حداقل ۳۰ تا ۳۵ میلی‌متر برای دستگاه لبه‌چسبان اتوماتیک پیشنهاد می‌شود.`);
    }
  } else {
    // مقوای نازک ایندربرد و جعبه‌های دارویی
    if (L > 600 || W > 450) {
      warnings.push('ابعاد جعبه برای مقوای تک‌لا بدون لمینت بسیار بزرگ است؛ احتمال شکم‌دادن دیواره‌ها و دفُرمه شدن در اثر وزن محصول وجود دارد.');
    }
  }

  // ۵. تداخل زبانه قفل و عمق جعبه (Tuck Flap vs Depth)
  if (tuck > H * 0.65) {
    warnings.push(`ارتفاع زبانه قفل (${tuck} mm) بیش از ۶۵٪ عمق جعبه است و هنگام بسته شدن با کف جعبه یا محتویات داخلی اصطکاک ایجاد می‌کند.`);
  }

  // ۶. محاسبه ابعاد شیت مورد نیاز و مقایسه با ابعاد شیت ورق کاربر (در صورت وجود)
  // تقریب عرض و طول قالب باز شده
  const requiredSheetW = Math.round(2 * (L + W) + Math.max(30, glueTab) + 20);
  const requiredSheetH = Math.round(H + 2 * (W * 0.5) + 30);

  if (sheetSize && sheetSize.width > 0 && sheetSize.height > 0) {
    if (requiredSheetW > sheetSize.width || requiredSheetH > sheetSize.height) {
      errors.push(`ابعاد گسترده قالب (${requiredSheetW} × ${requiredSheetH} mm) بزرگتر از ابعاد شیت مقوای انتخابی (${sheetSize.width} × ${sheetSize.height} mm) است و در شیت جا نمی‌شود.`);
    }
  }

  // ۷. تخمین مقاومت فشاری BCT تقریبی بر اساس فرمول مک‌کی
  const perimeter = 2 * (L + W) / 10;
  const ect = material.ectValue || (isCorrugated ? 5.2 : 3.2);
  const caliperCm = Math.max(0.04, t / 10);
  const bctScore = Math.round((5.87 * (ect * 10) * Math.sqrt(perimeter * caliperCm)) / 9.81);

  // ۸. محاسبه ابعاد داخلی مفید با کسر ضخامت مقوا
  const innerL = Math.max(0, Math.round(L - 2 * t));
  const innerW = Math.max(0, Math.round(W - 2 * t));
  const innerH = Math.max(0, Math.round(H - (isCorrugated ? 2 * t : t)));

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    calculatedOuterDims: { L, W, H },
    calculatedInnerDims: { L: innerL, W: innerW, H: innerH },
    materialThicknessMm: t,
    minSheetRequirementMm: { width: requiredSheetW, height: requiredSheetH },
    bctEstimateKg: bctScore,
    creaseLossRatio: Number((t * 1.5).toFixed(2)),
  };
};
