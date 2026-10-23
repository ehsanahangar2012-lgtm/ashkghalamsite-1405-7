export interface StandardRule {
  id?: string;
  name?: string;
  title: string;
  category: 'FEFCO' | 'ECMA' | 'CUSTOM';
  standardCode: string;
  fefcoCode?: string;
  description: string;
  thumbnail?: string;
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
};

export const validateStandardConstraints = (
  ruleId: string, 
  l: number, 
  w: number, 
  h: number
): { valid: boolean; isValid: boolean; errors: string[]; warnings: string[] } => {
  const rule = STANDARDS_METADATA[ruleId];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rule) {
    return { valid: true, isValid: true, errors: [], warnings: [] };
  }

  if (rule.minL && l < rule.minL) errors.push(`طول کمتر از حداقل مجاز (${rule.minL} mm) است.`);
  if (rule.maxL && l > rule.maxL) errors.push(`طول بیشتر از حداکثر مجاز (${rule.maxL} mm) است.`);
  if (rule.minW && w < rule.minW) errors.push(`عرض کمتر از حداقل مجاز (${rule.minW} mm) است.`);
  if (rule.maxW && w > rule.maxW) errors.push(`عرض بیشتر از حداکثر مجاز (${rule.maxW} mm) است.`);

  const valid = errors.length === 0;
  return {
    valid,
    isValid: valid,
    errors,
    warnings,
  };
};
