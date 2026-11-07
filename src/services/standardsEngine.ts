export interface StandardRule {
  id?: string;
  name?: string;
  title: string;
  category: 'FEFCO' | 'ECMA' | 'CUSTOM';
  standardCode: string;
  fefcoCode?: string;
  code?: string;
  description: string;
  thumbnail?: string;
  foldingRule?: string;
  glueRule?: string;
  toleranceRule?: string;
  aspectRatioMaxH_to_W?: number;
  defGlueTab?: number;
  defTuck?: number;
  minL?: number;
  maxL?: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
  constraints?: {
    ratioLWMin?: number;
    ratioLWMax?: number;
  };
}

export const STANDARDS_METADATA: Record<string, StandardRule> = {
  'fefco-0201': {
    title: 'کارتن چهار درب متداول (RSC)',
    category: 'FEFCO',
    standardCode: 'FEFCO 0201',
    description: 'رایج‌ترین نوع کارتن حمل‌ونقل با حداقل ضایعات شیت مقوا و استقامت بالا.',
    minL: 100,
    maxL: 1200,
    minW: 80,
    maxW: 800,
    minH: 80,
    maxH: 800,
  },
  'fefco-0200': {
    title: 'جعبه نیمه تلسکوپی روباز',
    category: 'FEFCO',
    standardCode: 'FEFCO 0200',
    description: 'کارتن فاقد درپوش، مناسب بارگیری سریع.',
    minL: 100,
    maxL: 1200,
    minW: 80,
    maxW: 800,
    minH: 50,
    maxH: 800,
  },
  'fefco-0203': {
    title: 'کارتن درب هم‌پوشان کامل (FOL)',
    category: 'FEFCO',
    standardCode: 'FEFCO 0203',
    description: 'درب‌های کاملاً روی هم قرار گیرنده برای بارهای سنگین.',
    minL: 120,
    maxL: 1200,
    minW: 80,
    maxW: 800,
    minH: 80,
    maxH: 800,
  },
  'fefco-0427': {
    title: 'جعبه کیبوردی قفل‌دار (Roll End Tuck Front)',
    category: 'FEFCO',
    standardCode: 'FEFCO 0427',
    description: 'ساختار یکپارچه بدون نیاز به چسب با استحکام دولایه در دیواره‌های جانبی.',
    minL: 80,
    maxL: 600,
    minW: 60,
    maxW: 400,
    minH: 25,
    maxH: 250,
  },
  'fefco-pizza': {
    title: 'جعبه پیتزا کلاسیک (Pizza Box - FEFCO 0426)',
    category: 'FEFCO',
    standardCode: 'FEFCO 0426',
    description: 'جعبه پیتزای کلاسیک دایکاتی با سوراخ‌های تهویه هوا.',
    minL: 160,
    maxL: 600,
    minW: 160,
    maxW: 600,
    minH: 25,
    maxH: 90,
  },
  'ecma-a2020': {
    title: 'جعبه مقوایی دارویی و بهداشتی ته قفل',
    category: 'ECMA',
    standardCode: 'ECMA A20.20',
    description: 'استاندارد اروپایی جعبه‌های ایندربرد با زبانه تاخوردن سریع برای خطوط بسته‌بندی پرسرعت.',
    minL: 40,
    maxL: 300,
    minW: 30,
    maxW: 200,
    minH: 40,
    maxH: 300,
  },
  'snap-lock-123': {
    title: 'جعبه لاک باتم ته قفلی (1-2-3 Lock-Bottom)',
    category: 'ECMA',
    standardCode: 'ECMA A2110',
    description: 'جعبه پرکاربرد بهداشتی و دارویی با ته قفلی دستی مستحکم.',
    minL: 45,
    maxL: 300,
    minW: 35,
    maxW: 200,
    minH: 50,
    maxH: 350,
  },
  'fefco-0215': {
    title: 'کارتن ته قفلی درب ساده (Snap Lock)',
    category: 'FEFCO',
    standardCode: 'FEFCO 0215',
    description: 'کف قفل شونده بدون نیاز به چسب با تحمل وزن مناسب قطعات صنعتی.',
    minL: 80,
    maxL: 500,
    minW: 60,
    maxW: 400,
    minH: 80,
    maxH: 500,
  },
  'fefco-0300': {
    title: 'جعبه تلسکوپی دو تکه درب و زیره',
    category: 'FEFCO',
    standardCode: 'FEFCO 0300',
    description: 'شامل کفه مجزا و درب جداگانه.',
    minL: 100,
    maxL: 800,
    minW: 80,
    maxW: 600,
    minH: 30,
    maxH: 300,
  },
  'fefco-0301': {
    title: 'جعبه تلسکوپی درب و زیره مجزا',
    category: 'FEFCO',
    standardCode: 'FEFCO 0301',
    description: 'مناسب میوه صادراتی و کفش.',
    minL: 100,
    maxL: 800,
    minW: 80,
    maxW: 600,
    minH: 30,
    maxH: 300,
  },
  'ecma-b10': {
    title: 'کاور غلاف کشویی آزاد (Sleeve)',
    category: 'ECMA',
    standardCode: 'ECMA B10.10',
    description: 'باندرول یا غلاف دور جعبه نگهدارنده.',
    minL: 50,
    maxL: 500,
    minW: 40,
    maxW: 400,
    minH: 20,
    maxH: 250,
  }
};

export interface MaterialPhysicalLimits {
  id?: string;
  name?: string;
  category?: string;
  thickness: number; // in mm
  weight?: number; // gsm
  minBendingRadius?: number; // mm
  minFoldableLength?: number; // mm
}

export interface AdvancedPhysicalValidationResult {
  valid: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  physicalDetails: {
    minPanelDimension: number;
    maxCreaseLoss: number;
    creaseClearanceStatus: 'optimal' | 'warning' | 'critical';
    aspectRatioStatus: 'balanced' | 'unstable' | 'distorted';
  };
}

export const validateStandardConstraints = (
  ruleId: string, 
  l: number, 
  w: number, 
  h: number,
  material?: MaterialPhysicalLimits
): AdvancedPhysicalValidationResult => {
  const rule = STANDARDS_METADATA[ruleId];
  const errors: string[] = [];
  const warnings: string[] = [];

  const caliper = material?.thickness || 0.45;
  const isCorrugated = material?.category === 'Corrugated' || caliper >= 1.2;

  // 1. Basic Dimension Validations against standard bounds
  if (rule) {
    if (rule.minL && l < rule.minL) {
      errors.push(`طول ورودی (${l}mm) کمتر از حداقل مجاز صنعتی (${rule.minL}mm) برای قالب ${rule.standardCode} است.`);
    }
    if (rule.maxL && l > rule.maxL) {
      errors.push(`طول ورودی (${l}mm) فراتر از حداکثر ظرفیت ماشین‌آلات استاندارد (${rule.maxL}mm) است.`);
    }
    if (rule.minW && w < rule.minW) {
      errors.push(`عرض ورودی (${w}mm) کمتر از حداقل مجاز صنعتی (${rule.minW}mm) برای ساخت این الگو است.`);
    }
    if (rule.maxW && w > rule.maxW) {
      errors.push(`عرض ورودی (${w}mm) از سقف ورق قابل پردازش (${rule.maxW}mm) بیشتر است.`);
    }
    if (rule.minH && h < rule.minH) {
      errors.push(`ارتفاع جعبه (${h}mm) از حداقل حد ایستایی (${rule.minH}mm) کمتر است.`);
    }
    if (rule.maxH && h > rule.maxH) {
      errors.push(`ارتفاع (${h}mm) بیش از اندازه بلند بوده و در خط برش و چسب دچار تابیدگی می‌شود.`);
    }
  }

  // 2. Physical Material Thickness Constraints (محدودیت‌های فیزیکی مقوا و کارتن)
  // قانون فیزیکی خط تا: حداقل ابعاد هر پنل جعبه نباید از ضخامت مقوا ضربدر ضریب فلوت کمتر باشد
  const minSafeFoldLength = Math.max(15, caliper * (isCorrugated ? 8 : 12));
  if (w < minSafeFoldLength) {
    errors.push(`عرض پنل (${w}mm) نسبت به ضخامت ورق (${caliper}mm) بسیار باریک است؛ خط تا شکسته شده و لبه جعبه پاره خواهد شد (حداقل مجاز فیزیکی: ${Math.round(minSafeFoldLength)}mm).`);
  }
  if (h < minSafeFoldLength * 0.8) {
    errors.push(`ارتفاع جعبه (${h}mm) از حداقل رواداری خمش ضخامت مقوا (${Math.round(minSafeFoldLength * 0.8)}mm) کمتر است.`);
  }

  // قانون نسبت ابعادی فیزیکی (Physical Aspect Ratio & Buckling Risk)
  if (h > 3.5 * Math.min(l, w)) {
    warnings.push(`نسبت ارتفاع به قاعده جعبه (${(h / Math.min(l, w)).toFixed(1)}x) بحرانی است؛ خطر کمانش و فروریختن کارتن زیر بار پالت وجود دارد.`);
  }

  if (l < w * 0.6) {
    warnings.push(`طول جعبه (${l}mm) به طور نامتعارف بسیار کمتر از عرض (${w}mm) است که موجب افت استحکام ستونی (BCT) می‌شود.`);
  }

  // برای کارتن‌های کنگره‌ای ضخیم (C-Flute / BC-Flute)، رواداری شیار تیغ و درب‌ها
  if (isCorrugated && caliper >= 3.0 && Math.min(l, w) < 90) {
    warnings.push(`برای ورق کنگره‌دار ضخیم (${caliper}mm)، ابعاد کوچک زیر ۹۰mm باعث تداخل لبه‌های داخلی در زوایای ۹۰ درجه می‌شود.`);
  }

  const valid = errors.length === 0;

  return {
    valid,
    isValid: valid,
    errors,
    warnings,
    physicalDetails: {
      minPanelDimension: Math.round(minSafeFoldLength),
      maxCreaseLoss: Number((caliper * 1.5).toFixed(2)),
      creaseClearanceStatus: errors.length > 0 ? 'critical' : warnings.length > 0 ? 'warning' : 'optimal',
      aspectRatioStatus: h > 3.0 * Math.min(l, w) ? 'unstable' : 'balanced'
    }
  };
};
