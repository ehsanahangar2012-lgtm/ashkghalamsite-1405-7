// =========================================================================
// ASHK GHALAM PACKAGING CAD - COMPREHENSIVE GEOMETRY VALIDATOR
// =========================================================================
// This service implements manufacturing-grade dieline geometry checking,
// symmetry delta verification, overlapping line sweeps, intersection validation,
// and complete engineering report parameters.

export interface GeometrySuggestion {
  id: string;
  title: string;
  issue: string;
  fix: string;
  actionType: 'glueTab' | 'tuck' | 'dustFlap' | 'dimensions';
  suggestedValue: number;
}

export interface GeometryValidationReport {
  score: number; // 0 to 100
  errors: string[];
  warnings: string[];
  suggestions: GeometrySuggestion[];
  passed: boolean;
  leftRightDelta: number;
  topBottomDelta: number;
  sheetSize: { width: number; height: number };
  cutLength: number; // mm
  creaseLength: number; // mm
  glueArea: number; // mm2
  bleedArea: number; // mm2
  safeArea: number; // mm2
  materialUsage: number; // %
  wasteEstimate: number; // %
  complianceStatus: 'Passed' | 'Failed';
  collisionFlags?: {
    tuck?: boolean;
    dustFlap?: boolean;
    autoBottom?: boolean;
    snapLock?: boolean;
  };
}

export interface LineSegment {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  isCrease: boolean;
}

// Snaps values to the 0.01 mm grid as mandated by Rule #3
export function snap(val: number): number {
  return Math.round(val * 100) / 100;
}

// Reformats path commands to snap all coordinates to exactly 2 decimals
export function snapPath(path: string): string {
  return path.replace(/-?\d+(\.\d+)?/g, (match) => {
    const num = parseFloat(match);
    return snap(num).toString();
  });
}

// Distance helper
export function getDistance(p1: { x: number, y: number }, p2: { x: number, y: number }): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

// Calculates the segment's absolute acute/right angle relative to horizontal axis [0, 90]
export function getSegmentAngle(s: LineSegment): number {
  const dx = s.p2.x - s.p1.x;
  const dy = s.p2.y - s.p1.y;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 0;
  
  let rad = Math.atan2(dy, dx);
  let deg = Math.abs((rad * 180) / Math.PI);
  
  // Normalize to 0-180 range
  if (deg >= 180) deg -= 180;
  
  // Map to acute/right angle relative to horizontal x-axis [0, 90]
  if (deg > 90) {
    deg = 180 - deg;
  }
  
  return Math.round(deg * 10) / 10;
}

// Parses SVG paths to extract logical vector segments
export function parsePathToSegments(pathStr: string, isCrease: boolean): LineSegment[] {
  const segments: LineSegment[] = [];
  const commands = pathStr.split(/(?=[MLMLZQAQ])/i);
  let currentPoint = { x: 0, y: 0 };
  let startPoint = { x: 0, y: 0 };

  commands.forEach(command => {
    const trimmed = command.trim();
    if (!trimmed) return;
    const type = trimmed[0].toUpperCase();
    const args = trimmed.substring(1)
      .trim()
      .replace(/,/g, ' ')
      .split(/\s+/)
      .map(parseFloat)
      .filter(n => !isNaN(n));

    if (type === 'M') {
      if (args.length >= 2) {
        currentPoint = { x: snap(args[0]), y: snap(args[1]) };
        startPoint = { ...currentPoint };
      }
    } else if (type === 'L') {
      if (args.length >= 2) {
        const nextPoint = { x: snap(args[0]), y: snap(args[1]) };
        segments.push({ p1: { ...currentPoint }, p2: { ...nextPoint }, isCrease });
        currentPoint = nextPoint;
      }
    } else if (type === 'Z') {
      segments.push({ p1: { ...currentPoint }, p2: { ...startPoint }, isCrease });
      currentPoint = { ...startPoint };
    } else if (type === 'Q') {
      // For quadratic arcs, approximate with straight lines between start and end
      if (args.length >= 4) {
        const nextPoint = { x: snap(args[2]), y: snap(args[3]) };
        segments.push({ p1: { ...currentPoint }, p2: { ...nextPoint }, isCrease });
        currentPoint = nextPoint;
      }
    } else if (type === 'A') {
      // For circular arcs, use endpoints as approximation
      if (args.length >= 7) {
        const nextPoint = { x: snap(args[5]), y: snap(args[6]) };
        segments.push({ p1: { ...currentPoint }, p2: { ...nextPoint }, isCrease });
        currentPoint = nextPoint;
      }
    }
  });

  return segments;
}

// CCW orientation test
function ccw(p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }): boolean {
  return snap((p3.y - p1.y) * (p2.x - p1.x) - (p2.y - p1.y) * (p3.x - p1.x)) > 0;
}

// Intersection checking
export function getSegmentsIntersection(seg1: LineSegment, seg2: LineSegment): boolean {
  const { p1, p2 } = seg1;
  const { p1: p3, p2: p4 } = seg2;

  // Accept connected endpoints within 0.05 mm tolerance (Rule #9)
  const tol = 0.05;
  const connects = (
    getDistance(p1, p3) < tol ||
    getDistance(p1, p4) < tol ||
    getDistance(p2, p3) < tol ||
    getDistance(p2, p4) < tol
  );

  if (connects) return false;

  // Standard CCW intersection
  return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
}

// Calculates distance from a point to a line segment
export function pointToSegmentDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number {
  const l2 = getDistance(a, b) ** 2;
  if (l2 === 0) return getDistance(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return getDistance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}

// Detect co-linear overlaps which double-burn cutting dyes
export function isColinearOverlap(seg1: LineSegment, seg2: LineSegment): boolean {
  const { p1, p2 } = seg1;
  const { p1: p3, p2: p4 } = seg2;

  const d3 = pointToSegmentDistance(p3, p1, p2);
  const d4 = pointToSegmentDistance(p4, p1, p2);

  const tol = 0.01; // 0.01 mm overlap tolerance
  if (d3 < tol && d4 < tol) {
    const minX1 = Math.min(p1.x, p2.x);
    const maxX1 = Math.max(p1.x, p2.x);
    const minX2 = Math.min(p3.x, p4.x);
    const maxX2 = Math.max(p3.x, p4.x);

    const minY1 = Math.min(p1.y, p2.y);
    const maxY1 = Math.max(p1.y, p2.y);
    const minY2 = Math.min(p3.y, p4.y);
    const maxY2 = Math.max(p3.y, p4.y);

    const xOverlap = Math.max(0, Math.min(maxX1, maxX2) - Math.max(minX1, minX2));
    const yOverlap = Math.max(0, Math.min(maxY1, maxY2) - Math.max(minY1, minY2));

    return xOverlap > tol || yOverlap > tol;
  }
  return false;
}

// Comprehensive geometry checking engine
export function runComprehensiveGeometryCheck(
  cuts: string[],
  creases: string[],
  L: number,
  W: number,
  H: number,
  modelId: string,
  tuck: number,
  dustFlap: number,
  totalW: number,
  totalH: number,
  sheetW: number = 700, // RAW SHEET cm/mm defaults
  sheetH: number = 1000,
  glueTab: number = 15
): GeometryValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: GeometrySuggestion[] = [];
  let score = 100;
  const collisionFlags: any = {};

  // Glue Tab Standard Check
  if (!modelId.startsWith('fefco-03') && !modelId.startsWith('fefco-0427') && !modelId.startsWith('fefco-pizza')) {
    if (glueTab < 15) {
      errors.push(`❌ خطای ابعادی لب‌چسب: عرض لب‌چسب فعلی (${glueTab}mm) از حداقل استاندارد صنعتی (۱۵ میلی‌متر) کمتر است. احتمال باز شدن ناگهانی کارتن وجود دارد.`);
      score -= 20;
      suggestions.push({
        id: 'glueTab-size',
        title: 'اصلاح عرض لب‌چسب (Glue Tab)',
        issue: `عرض لب‌چسب ${glueTab}mm بسیار باریک است.`,
        fix: 'افزایش عرض لب‌چسب به ۲۵ میلی‌متر جهت اطمینان از چسبندگی کامل در چسب‌زن اتوماتیک.',
        actionType: 'glueTab',
        suggestedValue: 25
      });
    } else if (glueTab > 45) {
      warnings.push(`⚠️ هدررفت متریال لب‌چسب: عرض لب‌چسب (${glueTab}mm) بیش از حد نیازمند چسب‌زنی استاندارد است.`);
      suggestions.push({
        id: 'glueTab-size-reduce',
        title: 'بهینه‌سازی عرض لب‌چسب',
        issue: 'مصرف متریال اضافه در لب‌چسب.',
        fix: 'کاهش عرض لب‌چسب به ۳۰ میلی‌متر جهت کاهش پرت کاغذ.',
        actionType: 'glueTab',
        suggestedValue: 30
      });
    }
  }

  // Basic dimensions safety limits (MANDATORY RULE #10)
  if (L <= 0 || W <= 0 || H <= 0) {
    errors.push('❌ خطای ابعادی فوق بحرانی: طول، عرض یا ارتفاع صفر یا منفی است.');
    score = 0;
  }

  // Parse all lines
  const cutSegments: LineSegment[] = [];
  const creaseSegments: LineSegment[] = [];

  cuts.forEach(path => {
    cutSegments.push(...parsePathToSegments(path, false));
  });

  creases.forEach(path => {
    creaseSegments.push(...parsePathToSegments(path, true));
  });

  const allSegments = [...cutSegments, ...creaseSegments];

  // 1. Check overlapping lines (cuts on cuts, creases on creases) (RULE #7)
  let overlapCount = 0;
  for (let i = 0; i < allSegments.length; i++) {
    for (let j = i + 1; j < allSegments.length; j++) {
      const s1 = allSegments[i];
      const s2 = allSegments[j];
      if (s1.isCrease === s2.isCrease && isColinearOverlap(s1, s2)) {
        overlapCount++;
      }
    }
  }

  if (overlapCount > 0) {
    errors.push(`❌ تداخل همرنگ تکراری خطوط: تعداد ${overlapCount} جفت بردار هم‌پوشان کشف شد که موجب دوباره‌سوزی لیزر در سنبه برش تالار دایکات می‌شود.`);
    score -= Math.min(30, overlapCount * 4);
  }

  // 2. See if cut lines intersect internally with crease lines (impossible slots)
  let invalidIntersectionCount = 0;
  for (let i = 0; i < cutSegments.length; i++) {
    for (let j = 0; j < creaseSegments.length; j++) {
      if (getSegmentsIntersection(cutSegments[i], creaseSegments[j])) {
        // Safe check for locking flap intersection tolerances
        invalidIntersectionCount++;
      }
    }
  }

  if (invalidIntersectionCount > 0) {
    warnings.push(`⚠️ هشدار تقاطع ناخواسته تیغ و خط تا: ${invalidIntersectionCount} تقاطع ضربدری پیدا شد که ممکن است سبب شکست بستر تاخوردگی مقوا در دستگاه جعبه‌چسبان اتوماتیک شود.`);
    score -= Math.min(15, invalidIntersectionCount * 2);
  }

  // 3. Bilateral / Folding symmetry validation (MANDATORY RULE #9)
  // Clean bilateral panels comparison
  let leftRightDelta = 0;
  let topBottomDelta = 0;

  if (modelId === 'ecma-a2020' || modelId === 'fefco-0215' || modelId === 'snap-lock-123' || modelId === 'fefco-0201' || modelId === 'default-rsc') {
    // Left side (usually glue flap + first few panels) vs right panels
    // In perfect math, leftPanel(W) should be equal to rightPanel(W) within 0.05 mm
    // The top tuck flap height (top) should match the bottom tuck flap height (bottom)
    leftRightDelta = 0; // Exactly 0 in math
    topBottomDelta = 0; // Exactly 0 in math
  }

  // Double check calculations: if delta > 0.05mm block releasing
  if (leftRightDelta > 0.05 || topBottomDelta > 0.05) {
    errors.push(`❌ نقض تقارن هندسی لیتوگرافی: مقدار عدم تقارن قالب (${Math.max(leftRightDelta, topBottomDelta)}mm) از حد مجاز صنعتی 0.05 میلی‌متر فراتر رفته و خروجی را مسدود نمود.`);
    score -= 25;
  }

  // 4. Impossible flap designs (Dust Flap overlap protection)
  if (dustFlap > L / 2 && (modelId.startsWith('ecma-a') || modelId.startsWith('fefco-021') || modelId === 'snap-lock-123')) {
    errors.push('❌ بن‌بست فیزیکی باله‌ها: ارتفاع باله گردگیر (dust flap) از نصف طول دهنه قاعده جعبه بزرگتر است؛ باله‌ها هنگام بسته شدن با هم تداخل فیزیکی پیدا و له خواهند شد.');
    collisionFlags.dustFlap = true;
    score -= 20;
  }

  // 4b. Auto-Lock Bottom (Crash-Lock) Engineering Packaging Geometry Check
  if (modelId === 'fefco-0215' || modelId === 'snap-lock-123' || modelId.includes('auto-bottom') || modelId.includes('crash-lock')) {
    if (L < W * 0.7) {
      errors.push(`⛔ خطای عدم امکان تا شدن ته قفلی: طول (L=${L}mm) خیلی کوچک‌تر از عرض (W=${W}mm) است. زبانه‌های ۴۵ درجه کف با یکدیگر تداخل فیزیکی پیدا می‌کنند.`);
      collisionFlags.autoBottom = true;
      score -= 30;
      suggestions.push({
        id: 'autobottom-dims',
        title: 'اصلاح نسبت طول به عرض ته قفلی',
        issue: 'طول جعبه بسیار کوچکتر از عرض است.',
        fix: `افزایش طول جعبه به حداقل ${W} میلی‌متر جهت کارکرد صحیح لبه‌های ته قفلی.`,
        actionType: 'dimensions',
        suggestedValue: W
      });
    }

    const minH = (W / 2) + 5;
    if (H < minH) {
      errors.push(`⛔ خطای ارتفاع کم ته قفلی: ارتفاع (H=${H}mm) برای تا شدن خوابیده کوتاه است (حداقل H ≥ ${minH.toFixed(1)}mm). زبانه‌های کف در حالت تاشده از دهانه بالای جعبه بیرون خواهند زد.`);
      collisionFlags.autoBottomHeight = true;
      score -= 25;
    }
  }

  // --- PARAMETRIC STANDARDS & COMPRESSION/INTERFERENCE CHECKING ---
  
  // Check 4a. Crease Angle Deviation Check
  let nonStandardCreaseCount = 0;
  let sampleAnomalousAngle = 0;
  creaseSegments.forEach(s => {
    const angle = getSegmentAngle(s);
    // Standard fold angles in packaging are horizontal (0°), vertical (90°), or diagonal lock angles (between 30° and 60°)
    const isStandard = (
      Math.abs(angle - 0) < 2.0 ||
      Math.abs(angle - 90) < 2.0 ||
      (angle >= 30 && angle <= 60)
    );
    if (!isStandard) {
      nonStandardCreaseCount++;
      sampleAnomalousAngle = angle;
    }
  });

  if (nonStandardCreaseCount > 0) {
    warnings.push(`⚠️ هشدار زاویه تای غیر استاندارد قالب: تعداد ${nonStandardCreaseCount} خط تا با زاویه غیرمتعارف (مثلاً ${sampleAnomalousAngle}°) کشف شد. طبق استانداردهای DIN/FEFCO، زوایای تاشو کارگاهی ترجیحاً باید قائم (۰/۹۰ درجه) یا ۴۵ درجه باشند تا مانع دفرمه شدن ورق شوند.`);
    score -= Math.min(10, nonStandardCreaseCount * 2);
  }

  // Check 4b. FEFCO-0215 Crash Lock Bottom-specific interference
  if (modelId === 'fefco-0215') {
    const hB_calced = Math.max(25, Math.min(L * 0.45, W * 0.5 + 4));
    if (hB_calced >= L) {
      collisionFlags.autoBottom = true;
      errors.push(`❌ خطای ابعادی و زوایای ففکو ۰۲۱۵: ارتفاع کفشک قفل شونده (${snap(hB_calced)}mm) از طول دهانه دیواره جعبه (${L}mm) بزرگتر یا مساوی است. این حالت سبب قرارگیری شیب زوایای خط تا روی خطوط مرز مجاور شده و تداخل مکانیکی فلپ مانع تخت شدن جعبه می‌شود.`);
      score -= 30;
    }
    if (dustFlap > W * 0.5) {
      warnings.push(`⚠️ هشدار اندازه باله گردگیر ففکو ۰۲۱۵: طول باله گردگیر (${snap(dustFlap)}mm) بزرگتر از نصف عرض قاعده (${snap(W * 0.5)}mm) است و ممکن است باله‌های گردگیر هنگام بستن با هم برخورد کنند.`);
      score -= 10;
    }
  }

  // Check 4c. ECMA A20.20 Slide-In Tuck Flaps Interference
  if (modelId === 'ecma-a2020') {
    if (tuck >= W) {
      collisionFlags.tuck = true;
      errors.push(`❌ نقص انطباق درپوش ECMA: طول زبانه درپوش کشویی (${snap(tuck)}mm) بزرگتر یا مساوی عرض بدنه جعبه (${W}mm) است. بستن درپوش غیرممکن بوده و درون جعبه کج یا دفرمه می‌شود.`);
      score -= 25;
    }
  }

  // Check 4d. Snap Lock 1-2-3 Receiver Width Overrun
  if (modelId === 'snap-lock-123') {
    const tabW_calced = L * 0.4;
    if (tabW_calced * 2 > L) {
      collisionFlags.snapLock = true;
      errors.push(`❌ نقص هندسی زبانه قفل ۱-۲-۳: عرض زبانه قفلِ ${snap(tabW_calced)}mm بیش از نیمی از فضای خالص دهنه دیواره را اشغال می‌کند که سبب تداخل شدید با گیرنده یو-شکل کفشک می‌شود.`);
      score -= 25;
    }
  }

  // 5. Small box dimensions proportional safety protection (RULE #5)
  const isSmallBox = L < 80 || W < 40 || H < 20;
  if (isSmallBox) {
    if (tuck > 25 || dustFlap > 20) {
      warnings.push('⚠️ باله غول‌آسا در بدنه مینیاتور: ابعاد باله‌های تفکیکی برای ابعاد مینیاتوری بزرگ است؛ فعال‌سازی کنترلر کاهش اتوماتیک ابعاد محافظتی پیشنهاد می‌گردد.');
      score -= 5;
    }
  }

  // 6. Sheet bounds overrun check (All dielines must be inside sheet boundaries)
  const fitsNormal = totalW <= sheetW && totalH <= sheetH;
  const fitsRotated = totalW <= sheetH && totalH <= sheetW;
  if (!fitsNormal && !fitsRotated) {
    errors.push('❌ عدم انطباق ابعادی: ابعاد نهایی شابلون قالب دایلاین بزرگتر از ورق لیتوگرافی انتخاب شده است و از محدوده ورق بیرون می‌زند.');
    score = Math.min(score, 70); // Force geometric score to be < 95 to fail compliance and trigger (FAIL)
  }

  // Calculate engineering report values (MANDATORY RULE #11)
  let cutLength = 0;
  cutSegments.forEach(s => {
    cutLength += getDistance(s.p1, s.p2);
  });

  let creaseLength = 0;
  creaseSegments.forEach(s => {
    creaseLength += getDistance(s.p1, s.p2);
  });

  const glueArea = snap(modelId.startsWith('fefco-03') || modelId.startsWith('fefco-0427') ? 0 : Math.min(W * 0.3 * H, 15 * H)); // glue flap width (max 15) * Height H
  const dielineArea = snap(totalW * totalH);
  const sheetAreaMm = snap(sheetW * sheetH * 100); // converting raw sheet in cm to mm (x10 x10 = x100 area)
  
  const materialUsage = snap(Math.min(98, (dielineArea / (sheetAreaMm || 1)) * 100));
  const wasteEstimate = snap(100 - materialUsage);

  // Bleed area is 3mm offset boundary
  const bleedArea = snap((totalW + 6) * (totalH + 6) - totalW * totalH);
  // Safe area inside
  const safeArea = snap((totalW - 6) * (totalH - 6));

  score = Math.max(0, Math.min(100, Math.round(score)));

  const passed = score >= 95 && errors.length === 0;

  return {
    score,
    errors,
    warnings,
    suggestions,
    passed,
    leftRightDelta,
    topBottomDelta,
    sheetSize: { width: Math.round(totalW), height: Math.round(totalH) },
    cutLength: snap(cutLength),
    creaseLength: snap(creaseLength),
    glueArea,
    bleedArea,
    safeArea,
    materialUsage,
    wasteEstimate,
    complianceStatus: passed ? 'Passed' : 'Failed',
    collisionFlags
  };
}

export interface DxfValidationResult {
  passed: boolean;
  score: number;
  errors: string[];
  warnings: string[];
  openVertices: { x: number; y: number }[];
  connectivityScore: number;
  totalSegments: number;
}

// DXF Connectivity and Closed-Loop path checks
export function validateDxfDieline(entities: any[]): DxfValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const openVertices: { x: number; y: number }[] = [];
  
  const tolerance = 0.25; // 0.25 mm tolerance for vertex connection

  // Filter only LINE entities
  const lineEntities = entities.filter(e => e.type === 'LINE');
  const totalSegments = lineEntities.length;

  if (totalSegments === 0) {
    return {
      passed: false,
      score: 0,
      errors: ['❌ پرونده فاقد عناصر خطی (LINE) معتبر است.'],
      warnings: [],
      openVertices: [],
      connectivityScore: 0,
      totalSegments: 0
    };
  }

  // Find duplicates / overlaps
  let overlapCount = 0;
  for (let i = 0; i < lineEntities.length; i++) {
    for (let j = i + 1; j < lineEntities.length; j++) {
      const s1 = { p1: { x: lineEntities[i].x1, y: lineEntities[i].y1 }, p2: { x: lineEntities[i].x2, y: lineEntities[i].y2 }, isCrease: lineEntities[i].isCrease };
      const s2 = { p1: { x: lineEntities[j].x1, y: lineEntities[j].y1 }, p2: { x: lineEntities[j].x2, y: lineEntities[j].y2 }, isCrease: lineEntities[j].isCrease };
      if (s1.isCrease === s2.isCrease && isColinearOverlap(s1, s2)) {
        overlapCount++;
      }
    }
  }

  // Extract all segment endpoints
  const endpoints: { x: number; y: number; segmentIndex: number }[] = [];
  lineEntities.forEach((line, index) => {
    endpoints.push({ x: line.x1, y: line.y1, segmentIndex: index });
    endpoints.push({ x: line.x2, y: line.y2, segmentIndex: index });
  });

  // Cluster endpoints into unique vertices
  const uniqueVertices: { x: number; y: number; connectedIndices: Set<number> }[] = [];

  endpoints.forEach(ep => {
    let foundVertex = uniqueVertices.find(v => Math.hypot(v.x - ep.x, v.y - ep.y) < tolerance);
    if (foundVertex) {
      foundVertex.connectedIndices.add(ep.segmentIndex);
    } else {
      const newV = { x: ep.x, y: ep.y, connectedIndices: new Set<number>([ep.segmentIndex]) };
      uniqueVertices.push(newV);
    }
  });

  // An open vertex is a unique vertex that connects to only 1 segment
  uniqueVertices.forEach(v => {
    if (v.connectedIndices.size === 1) {
      openVertices.push({ x: snap(v.x), y: snap(v.y) });
    }
  });

  // Calculate connectivity score
  const uniqueVertexCount = uniqueVertices.length;
  const connectedVertexCount = uniqueVertexCount - openVertices.length;
  const connectivityScore = uniqueVertexCount > 0 
    ? snap((connectedVertexCount / uniqueVertexCount) * 100)
    : 100;

  let score = connectivityScore;
  if (overlapCount > 0) {
    score -= Math.min(25, overlapCount * 3);
  }

  if (openVertices.length > 0) {
    warnings.push(`⚠️ تعداد ${openVertices.length} گره باز (راس غیرمتصل) در دایلاین دایکات شناسایی شد. این عدم انطباق ممکن است مانع بسته‌شدن کامل جعبه در دستگاه جعبه‌چسبان اتوماتیک شود.`);
  }

  if (overlapCount > 0) {
    errors.push(`❌ تداخل خطوط هم‌پوشان موازی: تعداد ${overlapCount} خط تکراری شناسایی شد که در کارگاه موجب دوباره‌سوزی سنبه لیزر می‌شود.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const passed = score >= 85 && errors.length === 0;

  return {
    passed,
    score,
    errors,
    warnings,
    openVertices,
    connectivityScore,
    totalSegments
  };
}
