// =========================================================================
// ASHK GHALAM PACKAGING CAD - GLOBAL STANDARDS ENGINE (FEFCO & ECMA CODEBASE)
// =========================================================================
// This service implements geometry rules, folding clearances, glue allowance,
// joint strength factors, and manufacturing tolerance calculations for FEFCO & ECMA.

export interface StandardRule {
  code: string;
  name: string;
  category: 'FEFCO' | 'ECMA';
  minL: number; // mm
  maxL: number; // mm
  minW: number; // mm
  maxW: number; // mm
  minH: number; // mm
  maxH: number; // mm
  defGlueTab: number; // default glue flap size (mm)
  defTuck: number; // default lock tuck flap size (mm)
  aspectRatioMaxH_to_W: number; // limit to avoid slender buckling
  foldingRule: string; // Farsi guidelines
  glueRule: string; // Farsi guidelines
  toleranceRule: string; // dynamic tolerance guidelines
}

export const STANDARDS_METADATA: Record<string, StandardRule> = {
  // FEFCO 0201: Standard Box
  'fefco-0201': {
    code: 'FEFCO 0201',
    name: 'کارتن بهینه حمل و نقل (RSC)',
    category: 'FEFCO',
    minL: 100, maxL: 1200,
    minW: 80, maxW: 1000,
    minH: 60, maxH: 800,
    defGlueTab: 35,
    defTuck: 0,
    aspectRatioMaxH_to_W: 3.5,
    foldingRule: 'خم دیواره طولی و عرضی با زاویه ۹۰ درجه همسان. لبه‌های درپوش بالا و پایین در مرکز خط تقارن کارتن مماس می‌شوند.',
    glueRule: 'لبه چسب ۳۵ تا ۴۰ میلی‌متر با چسب گرم غلیظ یا منگنه مس‌وار جفت به فواصل ۴۵ میلی‌متر.',
    toleranceRule: 'رواداری ابعادی براساس ISO 2768-m معادل ±1.5 میلی‌متر برای کارتن مایکروفلو.'
  },
  // FEFCO 0200: Open Top Slotted
  'fefco-0200': {
    code: 'FEFCO 0200',
    name: 'جعبه نیمه تلسکوپی روباز مایکرو',
    category: 'FEFCO',
    minL: 100, maxL: 1200,
    minW: 80, maxW: 1000,
    minH: 50, maxH: 800,
    defGlueTab: 30,
    defTuck: 0,
    aspectRatioMaxH_to_W: 3.0,
    foldingRule: 'فاقد باله‌های فوقانی چسبی یا زیپ. صرفاً دیواره‌های پایینی تا زاویه ۹۰ درجه خم خورده و لبه کناری چسب می‌خورد.',
    glueRule: 'چسب خطی پهلو با لبه هم‌پوشان کانی در غلتک سرد یا استند گرم ذوب.',
    toleranceRule: 'رواداری ±1.5 میلی‌متر با تلورانس خمش شعاعی مقوای چند لایه.'
  },
  // FEFCO 0203: FOL (Full Overlap Slotted Container)
  'fefco-0203': {
    code: 'FEFCO 0203',
    name: 'جعبه درب هم‌پوشان سنگین (FOL)',
    category: 'FEFCO',
    minL: 120, maxL: 1200,
    minW: 100, maxW: 1000,
    minH: 80, maxH: 800,
    defGlueTab: 35,
    defTuck: 0,
    aspectRatioMaxH_to_W: 3.2,
    foldingRule: 'باله‌های بالا و پایین عرض کامل جعبه را می‌پوشانند و روی هم قرار می‌گیرند تا مقاومت در برابر بار سوراخ‌کننده مضاعف شود.',
    glueRule: 'چسب مایع صنعتی سنگین بر روی لبه نری و مادگی همراه با کوبش سرد.',
    toleranceRule: 'رواداری ابعادی حداکثر ±2.0 میلی‌متر به علت ضخامت بالای ورق B-Flute و C-Flute.'
  },
  // FEFCO 0215: Crash Lock Base
  'fefco-0215': {
    code: 'FEFCO 0215',
    name: 'جعبه لاکباتم ته قفل خودکار',
    category: 'FEFCO',
    minL: 60, maxL: 400,
    minW: 50, maxW: 300,
    minH: 80, maxH: 500,
    defGlueTab: 15,
    defTuck: 15,
    aspectRatioMaxH_to_W: 4.0,
    foldingRule: 'زبانه زیرین ۴۵ درجه تا می‌خورد. فرآیند سرهم‌بندی خودکار بدون چسب دستی با مهار لبه‌های چنگکی صورت می‌گیرد.',
    glueRule: 'یک زبانه خطی پهلویی چسب گرم و دو زبانه چنگک پایینی به شکل نقطه‌ای (Spot Gluing).',
    toleranceRule: 'رواداری ±1.0 میلی‌متر. هرگونه انحراف زاویه‌ای چنگک‌ها مانع از باز شدن خودکار کارتن در جک اتوماتیک سالن بسته‌بندی خواهد شد.'
  },
  // ECMA A2110: Snap Lock 1-2-3 Base
  'snap-lock-123': {
    code: 'ECMA A2110',
    name: 'جعبه لاک باک ته قفلی (1-2-3)',
    category: 'ECMA',
    minL: 45, maxL: 350,
    minW: 35, maxW: 250,
    minH: 60, maxH: 450,
    defGlueTab: 14,
    defTuck: 15,
    aspectRatioMaxH_to_W: 3.8,
    foldingRule: 'باله‌های پایینی به صورت شماره‌گذاری شده و بدون نیاز به چسب به داخل هم قفل شده و ته جعبه محکم مهار می‌شود.',
    glueRule: 'فقط لبه پهلو جعبه چسب زده می‌شود. کف جعبه کاملاً مکانیکی و دستی سرهم‌بندی شده و فاقد چسب است.',
    toleranceRule: 'رواداری ±1.0 میلی‌متر به جهت تداخل سه‌گانه قفل‌های زیره کارتن زبانه مهار فواصل.'
  },
  // FEFCO 0300: Telescopic Box (Lid & Tray)
  'fefco-0300': {
    code: 'FEFCO 0300',
    name: 'جعبه تلسکوبی دو تکه درب و زیره',
    category: 'FEFCO',
    minL: 120, maxL: 1000,
    minW: 100, maxW: 800,
    minH: 30, maxH: 400,
    defGlueTab: 20,
    defTuck: 0,
    aspectRatioMaxH_to_W: 1.5,
    foldingRule: 'شامل دو بخش مجزای کفه و درب تلسکوپی. خط تاخوردگی هر چهار لبه دیواره‌ها متمایل به ایجاد لایه بیرونی و لایه داخلی است.',
    glueRule: 'چسب چهار گوشه دیواره به صورت زبانه اورلپ سرد در زوایای بیرونی.',
    toleranceRule: 'لبه درپوش باید دقیقا ۲ برابر ضخامت مقوا + ۱ میلی‌متر پهن‌تر از زیره طراحی شود تا افتادگی تلسکوپی حاصل شود.'
  },
  // FEFCO 0320: Inside folding tray
  'fefco-0320': {
    code: 'FEFCO 0320',
    name: 'کارتن کیبوردی با قفل مجاور ته‌بسته',
    category: 'FEFCO',
    minL: 100, maxL: 800,
    minW: 80, maxW: 600,
    minH: 25, maxH: 300,
    defGlueTab: 0,
    defTuck: 15,
    aspectRatioMaxH_to_W: 2.0,
    foldingRule: 'دیواره‌ها دوجداره و تاشونده به درون جعبه ته‌بسته هستند. مهار نهایی با فیکس زبانه کلاغی در کف انجام می‌شود.',
    glueRule: 'بدون نیاز به خط چسب صنعتی؛ چفت‌شدگی بر اساس الاستیسیته طبیعی مقوا.',
    toleranceRule: 'شکاف جانبی پله لولا باید ±0.3 میلی‌متر کالیبره باشد تا لبه به بیرون شلیک نشود.'
  },
  // FEFCO 0427: Mailer Pro
  'fefco-0427': {
    code: 'FEFCO 0427',
    name: 'جعبه کیبوردی پستی مایلر پرفکت',
    category: 'FEFCO',
    minL: 120, maxL: 600,
    minW: 100, maxW: 500,
    minH: 30, maxH: 250,
    defGlueTab: 0,
    defTuck: 20,
    aspectRatioMaxH_to_W: 2.0,
    foldingRule: 'دیواره‌های بغل دوجداره بازشو تلسکوپی بوده که با زبانه گرد قفلی جانبی در سوراخ بدنه قفل می‌شوند.',
    glueRule: 'سازه کاملاً بدون چسب (Glue-less Q-Fold) طراحی شده و چفت شدگی آن با قفل‌های فیزیکی جانبی تامین می‌شود.',
    toleranceRule: 'شکاف جانبی پاشنه قفل دقیقاً ضخامت مقوا + 0.5 میلی‌متر بازخورد دارد تا کیپ شدن مستحکم حاصل شود.'
  },
  // FEFCO 0409: Interlocking Wraparound Sleeve
  'fefco-0409': {
    code: 'FEFCO 0409',
    name: 'جعبه لفافه‌پیچ کلوش کارگاهی',
    category: 'FEFCO',
    minL: 100, maxL: 1000,
    minW: 80, maxW: 600,
    minH: 20, maxH: 200,
    defGlueTab: 25,
    defTuck: 0,
    aspectRatioMaxH_to_W: 1.8,
    foldingRule: 'جعبه دور تا دور محصول کتابی چرخیده و لبه پایانی زبانه چسب در امتداد دیواره پهلویی می‌نشیند.',
    glueRule: 'یک نوار چسب داغ سراسری با دیسپنسر دستی یا اتوماتیک کارتنینگ.',
    toleranceRule: 'رواداری مجاز ±1.0 میلی‌متر برای حفظ سفتی بسته‌ روی اقلام دندونه‌ای داخلی.'
  },
  // FEFCO 0470: Fold-over slotted tray
  'fefco-0470': {
    code: 'FEFCO 0470',
    name: 'جعبه زبانه سرخود دایکاتی ملقمه',
    category: 'FEFCO',
    minL: 100, maxL: 800,
    minW: 80, maxW: 600,
    minH: 30, maxH: 300,
    defGlueTab: 0,
    defTuck: 15,
    aspectRatioMaxH_to_W: 2.2,
    foldingRule: 'بازشو از درب تاقدیس فوقانی همراه با شیار دابل دیواره بغل. لبه‌های هلالی در شکاف شیار کناری فرو می‌روند.',
    glueRule: 'بدون چسب زنی صنعتی (سازه دایکاتی خام تاشونده).',
    toleranceRule: 'تحمل باد خوردگی درزهای قفل کسر از ضخامت گراماژ مقوا برابر ±0.4 میلی‌متر.'
  },
  // FEFCO 0713: Custom rapid lock
  'fefco-0713': {
    code: 'FEFCO 0713',
    name: 'کارتن آماده نیمه اتومات پله‌ای',
    category: 'FEFCO',
    minL: 100, maxL: 600,
    minW: 85, maxW: 500,
    minH: 60, maxH: 400,
    defGlueTab: 25,
    defTuck: 0,
    aspectRatioMaxH_to_W: 3.0,
    foldingRule: 'کف کارتن با سه لبه پلکانی شیب‌دار به محض فشار زاویه‌ای عمودی لولا باز شده و آماده بارگذاری فوری در خط می‌شود.',
    glueRule: 'چسب کاری سه نقطه‌ای در کف کارگاه و چسب پهلو مونو با استفاده از دستگاه اتوماتیک کلاغ‌گیر.',
    toleranceRule: 'خطای ناهماهنگی تاشو کف نباید از ±0.8 میلی‌متر تجاوز کند تا فاز بازشدن اتواماتیک قفل نکند.'
  },
  // ECMA A20.20: pharmaceutical tuck end
  'ecma-a2020': {
    code: 'ECMA A20.20',
    name: 'جعبه دارویی چسب بغل بازشو مقابل',
    category: 'ECMA',
    minL: 20, maxL: 300,
    minW: 15, maxW: 250,
    minH: 40, maxH: 400,
    defGlueTab: 14,
    defTuck: 15,
    aspectRatioMaxH_to_W: 5.0,
    foldingRule: 'زبانه درب اصلی بالا و پایین در جهت معکوس همدیگر (Symmetric Zigzag Co-folding) هم‌پوشانی زیپ دارند.',
    glueRule: 'لبه بغل چسب خطی سراسری با عرض ۱۴ میلی‌متر با غلتک سرد کلدگلو (Water-Based Cold Glue).',
    toleranceRule: 'بسیار حساس ابعادی ±0.3 میلی‌متر جهت ایستایی عالی در خشاب دستگاه پرکنی دارویی اتوماتیک (Cartoning Machine).'
  },
  // ECMA A30: Euro-hanger tuck end
  'ecma-a30': {
    code: 'ECMA A30',
    name: 'جعبه زبانه قفل اصطکاکی آویز',
    category: 'ECMA',
    minL: 30, maxL: 350,
    minW: 20, maxW: 250,
    minH: 40, maxH: 400,
    defGlueTab: 14,
    defTuck: 15,
    aspectRatioMaxH_to_W: 4.5,
    foldingRule: 'شامل زبانه آویز فوقانی با سوراخ پانچ یورو (Euro-slot) جهت رگال مغازه‌ها و زبانه قفل شفت تافتن ته کار.',
    glueRule: 'چب لبه هم‌پوشان طولی بدنه و شیار دکمه پایین.',
    toleranceRule: 'آویز رگال باید تحمل گشتاور پیچش ثقلی محصول را با انحراف ایستایی زیر ۲ درجه داشته باشد.'
  },
  // ECMA B10
  'ecma-b10': {
    code: 'ECMA B10.10',
    name: 'غلاف دورپیچ یا کاور ریلی کشو',
    category: 'ECMA',
    minL: 50, maxL: 500,
    minW: 40, maxW: 400,
    minH: 15, maxH: 150,
    defGlueTab: 15,
    defTuck: 0,
    aspectRatioMaxH_to_W: 1.5,
    foldingRule: 'خم استوانه‌ای چهار پله موازی به دور جعبه زیرین. کشش فشرده اصطکاکی مانع سر خوردن بی‌مورد جعبه می‌گردد.',
    glueRule: 'لبه هم‌پوشان تخت چسب مایع کلدگلو ترجیحاً نفوذ قوی.',
    toleranceRule: 'فضای تسامح ریلی دقیقاً ۰.۴ میلی‌متر بزرگتر از جعبه درونی محاسبه شده تا لغزش کشویی روان باشد.'
  },
  // ECMA C1020
  'ecma-c1020': {
    code: 'ECMA C10.20',
    name: 'جعبه ریلی کشویی دو تکه',
    category: 'ECMA',
    minL: 60, maxL: 400,
    minW: 50, maxW: 300,
    minH: 20, maxH: 150,
    defGlueTab: 15,
    defTuck: 12,
    aspectRatioMaxH_to_W: 2.2,
    foldingRule: 'کفه به شیوه دیواره دوبل تا شده و داخل غلاف یکپارچه بیرونی سر می‌خورد.',
    glueRule: 'چسب سرد غوطه بر لایه چسبانک کفی جعبه همراه قفل زبانه.',
    toleranceRule: 'تلورانس ±0.5 میلی‌متر جهت جلوگیری از گیر کردن کشو بر اثر انبساط الیاف سلولزی در رطوبت انبار.'
  },
  // ECMA D50
  'ecma-d50': {
    code: 'ECMA D50',
    name: 'استند دیسپلی کات هفتی فروشگاهی',
    category: 'ECMA',
    minL: 100, maxL: 500,
    minW: 80, maxW: 400,
    minH: 100, maxH: 600,
    defGlueTab: 20,
    defTuck: 0,
    aspectRatioMaxH_to_W: 3.0,
    foldingRule: 'صفحه پشتی کاملا مستحکم ایستاده. پرفراژ میانی به فروشنده اجازه می‌دهد درپوش را جدا کرده و به عنوان مخزن محصول استفاده کند.',
    glueRule: 'چسب خط پهلو به انضمام پایه‌های مقوایی نگهدارنده قفل‌شونده.',
    toleranceRule: 'رواداری ±1.5 میلی‌متر با پرفراژ آسان جداشونده دندانه ریز صنعتی.'
  }
};

/**
 * Validates selected parametric dimensions against engineering standards constraints.
 */
export function validateStandardConstraints(
  modelId: string, 
  L: number, 
  W: number, 
  H: number
): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const rule = STANDARDS_METADATA[modelId] || STANDARDS_METADATA['fefco-0201'];
  const warnings: string[] = [];
  const errors: string[] = [];

  // 1. Basic Dimension Limit Validation
  if (L < rule.minL) errors.push(`طول کمتر از حد مجاز استاندارد صنعتی است (حداقل ${rule.minL}mm برای ${rule.code})`);
  if (L > rule.maxL) errors.push(`طول فراتر از آستانه توان فنی ماشین‌آلات ایران است (حداکثر ${rule.maxL}mm برای ${rule.code})`);

  if (W < rule.minW) errors.push(`عرض کمتر از حداقل شعاع خمش تیغ است (حداقل ${rule.minW}mm برای ${rule.code})`);
  if (W > rule.maxW) errors.push(`عرض فراتر از استاندارد ورق خام است (حداکثر ${rule.maxW}mm برای ${rule.code})`);

  if (H < rule.minH) errors.push(`ارتفاع کمتر از توان فنی پاشنه بازکن است (حداقل ${rule.minH}mm برای ${rule.code})`);
  if (H > rule.maxH) errors.push(`ارتفاع بیشتر از دهنه شاسی تغذیه است (حداکثر ${rule.maxH}mm برای ${rule.code})`);

  // 2. Buckling ratio check (aspect ratio limits)
  if (W > 0 && (H / W) > rule.aspectRatioMaxH_to_W) {
    warnings.push(`⚠️ هشدار اسلندرنس عمیق: نسبت ارتفاع به عرض جعبه (${(H/W).toFixed(1)}) از آستانه پایدار ${rule.aspectRatioMaxH_to_W} عبور کرده؛ ریسک کمانش دیواره جعبه تحت وزن وجود دارد.`);
  }

  // 3. ECMA tuck clearances & overlap checks
  if (modelId.startsWith('ecma') && L > 0 && W > 0 && L < W * 1.1) {
    warnings.push(`⚠️ احتمال تداخل لبه خمش: طول جعبه نباید بسیار نزدیک به عرض باشد تا درپوشهای زبانه قفل شاسی دچار چروکیدگی نشوند.`);
  }

  // 4. Overlap/clearance caution for small boxes
  if (W > 0 && H > 0 && H < 30 && modelId.startsWith('fefco-02')) {
    warnings.push(`⚠️ هشدار ارتفاع کم: در کدهای سری FEFCO 0200، ارتفاع زیر ۳۰ میلی‌متر لبه هم‌پوشان چسب را فاقد سطح مقاومت کششی کافی می‌سازد.`);
  }

  // 5. FEFCO 0215 & Auto-Lock Bottom Engineering Packaging Constraints
  if (modelId === 'fefco-0215' || modelId === 'snap-lock-123' || modelId.includes('auto-bottom') || modelId.includes('crash-lock')) {
    // Rule A: Length L MUST be strictly greater than Width W for auto-bottom collapse
    if (L > 0 && W > 0 && L <= W) {
      errors.push(`⛔ خطای بحرانی ساختار ته قفلی: طول (L=${L}mm) باید حتماً از عرض (W=${W}mm) بزرگتر باشد (حداقل L ≥ W + 10mm). در حالت L ≤ W زبانه‌های ۴۵ درجه کف دچار هم‌پوشانی ناممکن شده و جعبه به صورت خوابیده (Flat-pack) چسب‌خوری یا تا نمی‌شود.`);
    } else if (L > 0 && W > 0 && L < W * 1.08) {
      warnings.push(`⚠️ هشدار ابعاد ته قفلی: طول (L=${L}mm) بسیار نزدیک به عرض (W=${W}mm) است. پیشنهاد می‌شود طول حداقل ۱۰ میلی‌متر بزرگتر از عرض باشد تا لبه‌های قفل زبانه زیرین روان کار کنند.`);
    }

    // Rule B: Height H must be at least W/2 + 5mm to prevent flaps sticking out past top edge when collapsed flat
    const minHForCollapse = (W / 2) + 5;
    if (H > 0 && W > 0 && H < minHForCollapse) {
      errors.push(`⛔ خطای عدم امکان تا شدن تخت (Flat Collapse): ارتفاع جعبه (H=${H}mm) برای ساختار ته قفلی بسیار کوتاه است (حداقل H ≥ ${minHForCollapse.toFixed(1)}mm). هنگام چسب‌زنی و تا شدن کارگاهی، زبانه‌های کف از بالای جعبه بیرون می‌زنند.`);
    }
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Calculates dynamic manufacturing tolerances in mm (based on DIN 55429 for Corrugated, and ISO 2768 for Cartonboard).
 */
export function calculateTolerances(
  modelId: string,
  L: number,
  W: number,
  H: number,
  materialCategory: 'SBS' | 'FBB' | 'Duplex' | 'Kraft' | 'Corrugated'
): {
  lengthTolerance: number;
  widthTolerance: number;
  heightTolerance: number;
  diagonalSquarenessTolerance: number;
  explanation: string;
} {
  const rule = STANDARDS_METADATA[modelId] || STANDARDS_METADATA['fefco-0201'];
  const maxDim = Math.max(L, W, H);
  
  let baseTol = 0.5; // mm
  let explanation = '';

  if (materialCategory === 'Corrugated') {
    // Corrugated boards have higher tolerances due to thick flute structures
    if (maxDim < 150) {
      baseTol = 1.0;
    } else if (maxDim < 400) {
      baseTol = 1.5;
    } else {
      baseTol = 2.0;
    }
    explanation = `استاندارد مرجع DIN 55429 مخصوص کارتن چندلایه کنگره‌دار. رواداری ابعادی به علت نوسان انقباض رطوبتی فلوت و پهنای چاک خط دایکات بزرگتر از مقوای فشاری لحاظ می‌شود.`;
  } else {
    // Solid Cartonboard (SBS, FBB, Duplex, Kraft)
    if (maxDim < 120) {
      baseTol = 0.3;
    } else if (maxDim < 315) {
      baseTol = 0.4;
    } else {
      baseTol = 0.6;
    }
    explanation = `استاندارد مرجع ISO 2768-1 تلورانس متوسط (m) مخصوص جعبه‌های مقوایی تخت تاشو دارویی و آرایشی. فرآیند تیغ‌زنی دقیق‌تر از خط دایکات کارتن سنگین است.`;
  }

  // Double tolerance for diagonal squareness (گونیا بودن جعبه)
  const diagonalSquarenessTolerance = Math.round(baseTol * 1.6 * 10) / 10;

  return {
    lengthTolerance: baseTol,
    widthTolerance: baseTol,
    heightTolerance: baseTol,
    diagonalSquarenessTolerance,
    explanation
  };
}

/**
 * Calculates essential material/geometry-specific micro compensations (folding gaps) to prevent buckling.
 */
export interface PanelCompensations {
  jointGap: number; // mm
  innerFlapShortening: number; // mm
  glueFlapReduction: number; // mm
  dustFlapClearance: number; // mm
  explanation: string;
}

export function calculateFoldLossCompensations(
  modelId: string,
  thickness: number, // mm
  foldLoss: number // mm
): PanelCompensations {
  // Generates necessary shortening on flaps so they don't block each other
  const jointGap = Math.round(Math.max(1.0, thickness * 1.2) * 10) / 10;
  const innerFlapShortening = Math.round(Math.max(1.5, foldLoss * 2.0) * 10) / 10;
  const glueFlapReduction = Math.round(Math.max(0.8, thickness * 0.9) * 10) / 10;
  const dustFlapClearance = Math.round(Math.max(1.2, thickness * 1.1) * 10) / 10;

  let explanation = `محاسبه جبران کسر تاخوردگی (Material Compensation) برپایه قانون خمش خنثی فیبر الیاف سلولزی با ضخامت مقوا برابر ${thickness} میلی‌متر.`;

  return {
    jointGap,
    innerFlapShortening,
    glueFlapReduction,
    dustFlapClearance,
    explanation
  };
}

/**
 * Evaluates the mechanical integrity & tension limit of the glue lap joint flap (Manufacturer's Joint).
 */
export interface GlueLapReport {
  lapWidthMm: number;
  lapAreaSqMm: number;
  stiffnessIndexPct: number;
  shearStrengthN: number;
  springbackForceN: number;
  passSafetyFactor: number;
  isSafe: boolean;
  warnings: string[];
}

export function evaluateGlueLapJoint(
  modelId: string,
  L: number,
  W: number,
  H: number,
  thickness: number, // mm
  weightGsm: number, // gsm
  glueTabWidth: number // mm (entered width, or default if 0)
): GlueLapReport {
  const rule = STANDARDS_METADATA[modelId] || STANDARDS_METADATA['fefco-0201'];
  const actualLapWidth = glueTabWidth > 0 ? glueTabWidth : rule.defGlueTab;
  
  // Glue flap area (assuming length on the fold height H)
  const actualHeight = H > 0 ? H : 100;
  const lapAreaSqMm = actualLapWidth * actualHeight;

  // Stiffer boards (high gsm and thickness) exert high springback force when folded 90 degrees
  // Force unit is in Newtons (estimations)
  const springbackForceN = Math.round((thickness * thickness * (weightGsm / 100) * 0.05) * 10) / 10;

  // Cold glues have shear strength approx 1.8 N/mm2, we use a conservative 1.2 N/mm2 for industrial packaging
  const shearStrengthN = Math.round(lapAreaSqMm * 1.2);

  // Safety factor
  const passSafetyFactor = springbackForceN > 0 ? Math.round((shearStrengthN / springbackForceN) * 10) / 10 : 999;
  const isSafe = actualLapWidth > 0 ? (passSafetyFactor > 5.0 && actualLapWidth >= (rule.defGlueTab * 0.75)) : true;

  const warnings: string[] = [];
  if (actualLapWidth > 0) {
    if (actualLapWidth < (rule.defGlueTab * 0.8)) {
      warnings.push(`⚠️ لبه چسب اعمال شده (${actualLapWidth}mm) نسبت به مقادیر توصیه شده استاندارد ${rule.code} (${rule.defGlueTab}mm) بسیار کم‌عرض است. احتمال گسیختگی شیار چسبانک در مقابل فشار الیاف مقوا بالا ارزیابی می‌شود.`);
    }
    if (passSafetyFactor < 8.0 && springbackForceN > 0.5) {
      warnings.push(`⚠️ احتمال جداشدگی خودبه‌خود چسب: نیروی بازگشت ارتجاعی فیبر مقوا (${springbackForceN}N) بالاست. ضریب مهار ایمنی چسب چفت‌کننده لبه هم‌پوشان گسیخته مرزی است.`);
    }
  }

  // Calculate stiffness approximation index (0-100%)
  const stiffnessIndexPct = Math.min(100, Math.round((weightGsm * thickness * 0.3)));

  return {
    lapWidthMm: actualLapWidth,
    lapAreaSqMm,
    stiffnessIndexPct,
    shearStrengthN,
    springbackForceN,
    passSafetyFactor,
    isSafe,
    warnings
  };
}
