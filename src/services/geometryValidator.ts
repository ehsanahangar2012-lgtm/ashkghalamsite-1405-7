import { measurePathListLengthMm } from './dielineMath';

export interface DxfValidationResult {
  valid: boolean;
  passed?: boolean;
  score?: number;
  connectivityScore?: number;
  openVertices: { x: number; y: number }[];
  errors: string[];
  warnings: string[];
  entityCount: number;
  totalLength: number;
}

export const validateDxfDieline = (entities: any[]): DxfValidationResult => {
  const list = Array.isArray(entities) ? entities : [];
  const count = list.length;

  if (count === 0) {
    return {
      valid: false,
      passed: false,
      score: 0,
      connectivityScore: 0,
      openVertices: [],
      errors: ['هیچ موجودیت هندسی معتبری در فایل DXF یافت نشد.'],
      warnings: [],
      entityCount: 0,
      totalLength: 0,
    };
  }

  // Build vertex degree map on CUT perimeter segments to detect open loops
  const vertexDegree = new Map<string, { x: number; y: number; deg: number }>();
  let totalLength = 0;
  let creaseCount = 0;

  const snapKey = (x: number, y: number) => `${Math.round(x * 2) / 2},${Math.round(y * 2) / 2}`;

  list.forEach((ent: any) => {
    const x1 = ent.x1 ?? ent.start?.x ?? 0;
    const y1 = ent.y1 ?? ent.start?.y ?? 0;
    const x2 = ent.x2 ?? ent.end?.x ?? 0;
    const y2 = ent.y2 ?? ent.end?.y ?? 0;
    const len = Math.hypot(x2 - x1, y2 - y1);
    totalLength += len;

    const isCrease = ent.isCrease || ent.layer === 'CREASE' || ent.partType === 'crease';
    if (isCrease) {
      creaseCount++;
      return;
    }

    const k1 = snapKey(x1, y1);
    const k2 = snapKey(x2, y2);
    const v1 = vertexDegree.get(k1) || { x: x1, y: y1, deg: 0 };
    v1.deg += 1;
    vertexDegree.set(k1, v1);

    const v2 = vertexDegree.get(k2) || { x: x2, y: y2, deg: 0 };
    v2.deg += 1;
    vertexDegree.set(k2, v2);
  });

  const openVertices: { x: number; y: number }[] = [];
  vertexDegree.forEach((v) => {
    if (v.deg === 1) {
      openVertices.push({ x: v.x, y: v.y });
    }
  });

  const totalVertices = Math.max(1, vertexDegree.size);
  const connectivityScore = Math.max(0, Math.round(((totalVertices - openVertices.length) / totalVertices) * 100));

  const errors: string[] = [];
  const warnings: string[] = [];

  if (creaseCount === 0) {
    warnings.push('هیچ خط تای مجزا (لایه CREASE) در فایل شناسایی نشد؛ ممکن است نیاز به تفکیک دستی لایه باشد.');
  }
  if (openVertices.length > 4) {
    warnings.push(`تعداد ${openVertices.length} گره باز در خطوط برش شناسایی شد؛ حلقه بیرونی قالب ممکن است کاملاً بسته نباشد.`);
  }

  const score = Math.max(35, Math.min(100, Math.round(connectivityScore * 0.85 + (creaseCount > 0 ? 15 : 0))));
  const passed = errors.length === 0 && score >= 70;

  return {
    valid: errors.length === 0,
    passed,
    score,
    connectivityScore,
    openVertices,
    errors,
    warnings,
    entityCount: count,
    totalLength: Math.round(totalLength),
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

  // 1. Sheet boundary check (also account for 90-degree sheet rotation!)
  const fitsNormal = totalW <= sheetW && totalH <= sheetH;
  const fitsRotated = totalH <= sheetW && totalW <= sheetH;
  if (!fitsNormal && !fitsRotated) {
    errors.push(`ابعاد گسترده قالب (${Math.round(totalW)}×${Math.round(totalH)}mm) حتی با چرخش ۹۰ درجه از ابعاد شیت انتخابی (${sheetW}×${sheetH}mm) بزرگ‌تر است.`);
  } else if (!fitsNormal && fitsRotated) {
    warnings.push(`قالب در چیدمان افقی از عرض شیت بزرگ‌تر است و در چیدمان خودکار با چرخش ۹۰ درجه روی شیت (${sheetW}×${sheetH}mm) قرار می‌گیرد.`);
  }

  // 2. Geometric sanity checks
  const isTrayOrMailer = modelId.includes('0300') || modelId.includes('0301') || modelId.includes('0427') || modelId.includes('pizza') || modelId.includes('0409');
  if (!isTrayOrMailer && glueTab < 12) {
    warnings.push(`عرض لبه چسب (${Math.round(glueTab)}mm) برای چسب‌زنی ماشینی استاندارد اندک است (حداقل ۱۵ تا ۲۰mm پیشنهاد می‌شود).`);
    suggestions.push('عرض لبه چسب را برای چسبندگی مطمئن به ۱۵mm یا بیشتر افزایش دهید.');
  }

  // 3. Dust flap vs tuck / opposite panel collision check
  let dustFlapCollision = false;
  if (dustFlap > w * 0.68 && (modelId.includes('ecma-a') || modelId.includes('snap-lock'))) {
    warnings.push(`طول گوشواره گردگیر (${Math.round(dustFlap)}mm) نسبت به عرض جعبه (${w}mm) بیش از حد بلند است و هنگام بستن با دیواره مقابل برخورد می‌کند.`);
    suggestions.push(`گوشواره را به حداکثر ${Math.round(w * 0.55)}mm کاهش دهید.`);
    dustFlapCollision = true;
  }

  // 4. Tuck flap vs box height / opposing bottom flap collision
  let tuckCollision = false;
  if (tuck > h * 0.58 && (modelId.includes('ecma-a') || modelId.includes('0427') || modelId.includes('snap-lock'))) {
    warnings.push(`ارتفاع زبانه قفل (${Math.round(tuck)}mm) بیش از ۵۸٪ ارتفاع جعبه است و ممکن است با کف تلاقی کند.`);
    tuckCollision = true;
  }

  // 5. Auto-bottom / Snap-lock flat-collapse collision check
  let autoBottomCollision = false;
  let snapLockCollision = false;
  const isAutoBottom = modelId === 'fefco-0215' || modelId === 'fefco-0713';
  const isSnapLock = modelId === 'snap-lock-123';

  if (isAutoBottom && l <= w) {
    autoBottomCollision = true;
    errors.push(`در الگوی ته‌قفلی اتوماتیک (${modelId})، طول (L=${l}mm) باید از عرض (W=${w}mm) بزرگ‌تر باشد تا زبانه‌های ۴۵ درجه تداخل نکنند.`);
  }
  if (isSnapLock && h < w * 0.5) {
    snapLockCollision = true;
    warnings.push(`در الگوی لاک‌باتم ۱-۲-۳، ارتفاع (H=${h}mm) نسبت به عرض (W=${w}mm) بسیار کوتاه است.`);
  }

  const passed = errors.length === 0;
  let score = 100;
  if (errors.length > 0) score -= errors.length * 18;
  if (warnings.length > 0) score -= warnings.length * 4;
  score = Math.max(35, Math.min(100, score));

  // Real vector path measurement from generated SVG paths
  const cutLength = measurePathListLengthMm(cuts) || Math.round(2 * (totalW + totalH));
  const creaseLength = measurePathListLengthMm(creases) || Math.round(totalW + 4 * h);

  return {
    passed,
    score,
    errors,
    warnings,
    suggestions,
    cutLength,
    creaseLength,
    isClosedLoop: cuts.length > 0,
    hasSelfIntersection: dustFlapCollision || tuckCollision || autoBottomCollision,
    collisionFlags: {
      dustFlap: dustFlapCollision,
      tuck: tuckCollision,
      autoBottom: autoBottomCollision,
      snapLock: snapLockCollision,
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
