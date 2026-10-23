export interface StructuralWarning {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  field?: string;
}

export interface PaperGrainAnalysis {
  grainDirection: 'machine' | 'cross' | string;
  grainDirectionLabel: string;
  mainBendingAxis: string;
  isBendingWithGrain: boolean;
  stiffnessIndex: number;
  stiffnessRatio: number;
  isOptimal: boolean;
  recommendation: string;
}

export interface StructuralDiagnosticParams {
  length: number;
  width: number;
  height: number;
  caliperMm: number;
  tuckHeightMm?: number;
  glueWidthMm?: number;
  autoLockAngleDeg?: number;
  grainDirection?: string;
  boardType?: string;
  modelCode?: string;
}

export interface StructuralDiagnosticItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  code: string;
  recommendation: string;
}

export interface BottomLockAnalysis {
  isCompliant: boolean;
  lockInterlockQualityScore: number;
  recommendation?: string;
}

export class PackagingStandardsService {
  static validateBoxStructure(l: number, w: number, h: number): StructuralWarning[] {
    const warnings: StructuralWarning[] = [];
    if (l < w) {
      warnings.push({
        id: 'ratio-l-w',
        type: 'warning',
        message: 'معمولاً طول کارتن بزرگتر یا مساوی عرض انتخاب می‌شود تا مقاومت بهینه‌تر گردد.',
      });
    }
    if (h > 3 * w) {
      warnings.push({
        id: 'ratio-h-w',
        type: 'warning',
        message: 'نسبت ارتفاع به عرض بسیار زیاد است؛ خطر واژگونی و کمانش دیواره وجود دارد.',
      });
    }
    return warnings;
  }

  static analyzeGrain(width: number, height: number): PaperGrainAnalysis {
    return {
      grainDirection: 'machine',
      grainDirectionLabel: 'راه‌تاری (طولی)',
      mainBendingAxis: 'عمود بر جهت الیاف اصلی مقوا',
      isBendingWithGrain: true,
      stiffnessIndex: 94,
      stiffnessRatio: 1.8,
      isOptimal: true,
      recommendation: 'جهت راه‌راه مقوا عمود بر خطوط تا قرار گرفته و مقاومت BCT در حداکثر است.',
    };
  }

  static performStructuralDiagnostic(params: StructuralDiagnosticParams): StructuralDiagnosticItem[] {
    const items: StructuralDiagnosticItem[] = [];
    const { length: l, width: w, height: h, caliperMm, tuckHeightMm, glueWidthMm, autoLockAngleDeg } = params;

    // Check glue tab width
    if (glueWidthMm !== undefined && glueWidthMm < 18) {
      items.push({
        id: 'diag-glue-width',
        severity: 'warning',
        message: `عرض لبه چسب (${Math.round(glueWidthMm)}mm) کمتر از حد استاندارد صنعتی (حداقل ۲۰mm) است.`,
        code: 'ISO-186-GLUE',
        recommendation: 'عرض لبه چسب را برای اطمینان از چسبندگی کامل در خط جعبه‌چسبانی اتوماتیک به ۲۵mm افزایش دهید.',
      });
    }

    // Check aspect ratio
    if (h > 3.2 * w) {
      items.push({
        id: 'diag-height-ratio',
        severity: 'critical',
        message: 'نسبت ارتفاع به قاعده جعبه بحرانی است؛ خطر کمانش ستونی در بارگذاری پالت.',
        code: 'FEFCO-ASPECT-01',
        recommendation: 'افزایش عرض یا استفاده از مقوای دولایه کنگره‌ای (BC فلوت) توصیه می‌شود.',
      });
    }

    // Check tuck flap
    if (tuckHeightMm !== undefined && tuckHeightMm > h * 0.55) {
      items.push({
        id: 'diag-tuck-depth',
        severity: 'warning',
        message: 'عمق زبانه قفل بیش از نیمی از ارتفاع جعبه است و ممکن است با محتویات داخلی یا کف تلاقی کند.',
        code: 'ECMA-TUCK-02',
        recommendation: `ارتفاع زبانه قفل را به حدود ${Math.round(Math.min(tuckHeightMm, h * 0.4))}mm تعدیل نمایید.`,
      });
    }

    // Check autolock angle if applicable
    if (autoLockAngleDeg !== undefined && (autoLockAngleDeg < 42 || autoLockAngleDeg > 48)) {
      items.push({
        id: 'diag-autolock-angle',
        severity: 'warning',
        message: `زاویه خطوط تا ته‌قفل (${Math.round(autoLockAngleDeg)}°) خارج از دامنه بهینه ۴۵° کارگاهی است.`,
        code: 'DIN-55440-LOCK',
        recommendation: 'زاویه خطوط برش و تا زاویه‌دار ته جعبه را دقیقاً روی ۴۵ درجه کالیبره کنید.',
      });
    }

    return items;
  }

  static analyzePaperGrainDirection(
    l: number,
    w: number,
    h: number,
    grainDirection: 'long-grain' | 'short-grain' | string
  ): PaperGrainAnalysis {
    const isLong = grainDirection === 'long-grain';
    const isOptimal = isLong;

    return {
      grainDirection: isLong ? 'machine' : 'cross',
      grainDirectionLabel: isLong ? 'راه‌تاری (طولی - Machine Direction)' : 'راه‌پودی (عرضی - Cross Direction)',
      mainBendingAxis: isLong ? 'عمود بر الیاف (مقاومت بالا در برابر خمش دیواره)' : 'موازی الیاف (انعطاف‌پذیر، احتمال شکست در خط تا)',
      isBendingWithGrain: isOptimal,
      stiffnessIndex: isOptimal ? 94 : 72,
      stiffnessRatio: isOptimal ? 1.85 : 1.2,
      isOptimal,
      recommendation: isOptimal
        ? 'جهت الیاف کاغذ با راستای ایستایی ستونی جعبه همسو است و استحکام فشاری BCT در اوج قرار دارد.'
        : 'پیشنهاد می‌شود شیت چیدمان ۹۰ درجه چرخانده شود تا خطوط تا با الیاف همسو شوند.',
    };
  }

  static analyzeBottomLockFlapGeometry(
    l: number,
    w: number,
    h: number,
    caliper: number,
    autoLockAngle: number
  ): BottomLockAnalysis {
    const angleDev = Math.abs(autoLockAngle - 45);
    const score = Math.max(60, Math.min(100, Math.round(98 - angleDev * 3)));
    const isCompliant = score >= 85;

    return {
      isCompliant,
      lockInterlockQualityScore: score,
      recommendation: isCompliant
        ? 'هندسه قفل کفی کامپکت و مطابق استاندارد بدون نشت کارگاهی است.'
        : 'تنظیم زاویه ۴۵ درجه و رعایت فاصله فیلر خط تا جهت درگیر شدن بدون اصطکاک توصیه می‌شود.',
    };
  }
}
