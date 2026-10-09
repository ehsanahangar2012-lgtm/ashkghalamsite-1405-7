// =========================================================================
// ASHK GHALAM PACKAGING CAD - REAL-TIME DIELINE & 3D CALCULATION ENGINE
// =========================================================================
// High-performance real-time processing engine for dieline parameters,
// 3D box models, geometric error feedback, collision detection, and physical metrics.

import { snap } from './geometryValidator';
import { STANDARD_DIELINE_ENGINES, calculateDielineParameters as getDielineDefaultParams, DielineDims, DielineResult } from './dielineMath';
import { simulateBoxCompressionStrength } from './structuralValidation';
import { calculateMaterialCompensation } from './materialCompensationEngine';

export interface Dieline3DParameters {
  L: number; // Length (mm)
  W: number; // Width (mm)
  H: number; // Height (mm)
  glueTab: number; // Glue tab width (mm)
  tuck: number; // Tuck flap height (mm)
  dustFlap: number; // Dust flap width (mm)
  materialThickness: number; // Material thickness (mm)
  materialGsm: number; // Grammage (gsm)
  materialType: 'SBS' | 'FBB' | 'Duplex' | 'Kraft' | 'Corrugated_E' | 'Corrugated_B' | 'Corrugated_C';
  boxType: string; // Model code (e.g., 'ecma-a2020', 'fefco-0201', 'fefco-0427', 'snap-lock-123', 'ecma-c1020')
  grainDirection?: 'parallel_L' | 'parallel_W' | 'parallel_H';
  maxPressWidth?: number; // Sheet max width (mm)
  maxPressHeight?: number; // Sheet max height (mm)
}

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export interface GeometricErrorItem {
  id: string;
  code: string;
  severity: ErrorSeverity;
  titleFa: string;
  descriptionFa: string;
  affectedParameters: (keyof Dieline3DParameters)[];
  fixSuggestionFa: string;
  autoFixable: boolean;
  suggestedCorrection?: Partial<Dieline3DParameters>;
}

export interface Panel3DSpatialInfo {
  panelId: string;
  nameFa: string;
  dimensions2D: { width: number; height: number };
  pivot3D: { x: number; y: number; z: number };
  normalVector: { x: number; y: number; z: number };
  foldAngleDeg: number; // Current fold angle at current animation step
  maxFoldAngleDeg: number; // Fully folded angle (usually 90° or 180°)
  foldAxis: 'X' | 'Y' | 'Z';
  parentPanelId?: string;
  isBasePanel?: boolean;
}

export interface RealtimeFeedbackResult {
  isValid: boolean;
  qualityScore: number; // 0 to 100
  timestamp: number;
  
  dimensions2D: {
    sheetWidth: number; // mm
    sheetHeight: number; // mm
    grossAreaCm2: number; // cm²
    netAreaCm2: number; // cm²
    materialWastePercentage: number; // %
    cutLengthTotalMm: number; // mm
    creaseLengthTotalMm: number; // mm
    glueAreaTotalMm2: number; // mm²
  };

  metrics3D: {
    volumeCm3: number;
    volumeLiters: number;
    boundingBox3D: { length: number; width: number; height: number }; // mm
    surfaceArea3DCm2: number;
    centerOfMass: { x: number; y: number; z: number }; // mm relative to base center
    estimatedMeshVertices: number;
    estimatedMeshFaces: number;
    foldPanelsCount: number;
  };

  structuralPhysics: {
    bctValueKg: number; // Box Compression Test (kg)
    bctValueN: number; // Box Compression Test (Newton)
    ectValue: number; // Edge Crush Test (kN/m)
    maxStackingBoxes: number;
    maxStackingWeightKg: number;
    grainCrackingRisk: 'پایین (ایمن)' | 'متوسط (هشدار)' | 'بالا (بحرانی)';
    foldStressIndex: number; // 0% to 100%
  };

  errors: GeometricErrorItem[];
  warnings: GeometricErrorItem[];
  infoNotes: GeometricErrorItem[];

  panelSpatialData: Panel3DSpatialInfo[];
}

export class RealtimeCalculationEngine {
  private static calculationCache = new Map<string, RealtimeFeedbackResult>();
  private static MAX_CACHE_SIZE = 100;

  /**
   * Main entry point: Performs full real-time calculation and geometric error analysis.
   */
  static calculateRealtimeFeedback(params: Dieline3DParameters): RealtimeFeedbackResult {
    // Check Cache
    const cacheKey = `${params.L}_${params.W}_${params.H}_${params.glueTab}_${params.tuck}_${params.dustFlap}_${params.materialThickness}_${params.materialGsm}_${params.materialType}_${params.boxType}_${params.grainDirection || ''}_${params.maxPressWidth || 700}_${params.maxPressHeight || 1000}`;

    if (RealtimeCalculationEngine.calculationCache.has(cacheKey)) {
      return RealtimeCalculationEngine.calculationCache.get(cacheKey)!;
    }

    // 1. Sanitize input numbers
    const L = Math.max(10, snap(params.L || 100));
    const W = Math.max(10, snap(params.W || 80));
    const H = Math.max(10, snap(params.H || 120));
    const glueTab = Math.max(5, snap(params.glueTab || 15));
    const tuck = Math.max(5, snap(params.tuck || 18));
    const dustFlap = Math.max(5, snap(params.dustFlap || 18));
    const thickness = Math.max(0.1, snap(params.materialThickness || 0.35));
    const maxPressW = params.maxPressWidth || 700;
    const maxPressH = params.maxPressHeight || 1000;

    // 2. Compute 2D Sheet Layout & Vector Paths using Dieline Engines
    const dims: DielineDims = {
      L, W, H,
      glueTab,
      tuck,
      dustFlap,
      thickness
    };

    const engineKey = params.boxType || 'ecma-a2020';
    const engineFn = STANDARD_DIELINE_ENGINES[engineKey] || STANDARD_DIELINE_ENGINES['ecma-a2020'];
    const dieline2D: DielineResult = engineFn(dims);

    const sheetW = snap(dieline2D.totalW || (L * 2 + W * 2 + glueTab + 20));
    const sheetH = snap(dieline2D.totalH || (H + tuck * 2 + dustFlap * 2 + 20));

    const grossAreaCm2 = snap((sheetW * sheetH) / 100);
    
    // Net box surface area approximation
    const netAreaMm2 = 2 * (L * W + L * H + W * H) + (glueTab * H) + (2 * L * tuck) + (4 * W * dustFlap);
    const netAreaCm2 = snap(netAreaMm2 / 100);
    
    const materialWastePercentage = Math.min(95, Math.max(5, snap(((grossAreaCm2 - netAreaCm2) / Math.max(1, grossAreaCm2)) * 100)));

    // Calculate cut and crease lengths
    let cutLengthTotalMm = 0;
    if (dieline2D.cuts) {
      dieline2D.cuts.forEach(path => {
        cutLengthTotalMm += RealtimeCalculationEngine.estimatePathLength(path);
      });
    }

    let creaseLengthTotalMm = 0;
    if (dieline2D.creases) {
      dieline2D.creases.forEach(path => {
        creaseLengthTotalMm += RealtimeCalculationEngine.estimatePathLength(path);
      });
    }

    const glueAreaTotalMm2 = snap(glueTab * H * 0.85);

    // 3. Compute 3D Geometric & Physical Parameters
    const volumeCm3 = snap((L * W * H) / 1000);
    const volumeLiters = snap(volumeCm3 / 1000);
    const surfaceArea3DCm2 = snap((2 * (L * W + L * H + W * H)) / 100);
    
    // 3D Center of Mass (relative to bottom panel center)
    const centerOfMass = {
      x: 0,
      y: H / 2 + thickness,
      z: 0
    };

    // Panels count and mesh estimate
    const foldPanelsCount = RealtimeCalculationEngine.getPanelCountForType(params.boxType);
    const estimatedMeshVertices = foldPanelsCount * 8; // 8 vertices per box panel slab
    const estimatedMeshFaces = foldPanelsCount * 12; // 12 triangles per box panel slab

    // 4. Physical & Compression Analysis (BCT & ECT)
    const ectValue = RealtimeCalculationEngine.getECTValueForMaterial(params.materialType, params.materialGsm, thickness);
    const bctSim = simulateBoxCompressionStrength({
      L, W, H,
      materialThickness: thickness,
      ectValue,
      individualProductWeight: 0.5,
      stackHeight: 8,
      relativeHumidity: 60,
      storageDays: 30
    });

    const bctValueKg = Math.round(bctSim.bctKg);
    const bctValueN = Math.round(bctSim.bctNewtons);
    const maxStackingBoxes = Math.max(1, Math.floor(bctSim.maxRecommendedWeight / 0.5));
    const maxStackingWeightKg = Math.round(bctSim.maxRecommendedWeight);

    // Grain direction cracking risk check
    const grainDir = params.grainDirection || 'parallel_H';
    let grainCrackingRisk: 'پایین (ایمن)' | 'متوسط (هشدار)' | 'بالا (بحرانی)' = 'پایین (ایمن)';
    if (grainDir === 'parallel_L' && (params.boxType.includes('ecma') || params.boxType.includes('0201'))) {
      grainCrackingRisk = 'بالا (بحرانی)';
    } else if (grainDir === 'parallel_W') {
      grainCrackingRisk = 'متوسط (هشدار)';
    }

    // Fold stress index (0 to 100%)
    const compensation = calculateMaterialCompensation('inderboard-300', L, W, H);
    const foldStressIndex = Math.min(100, Math.max(10, Math.round((thickness / (W * 0.1)) * 100 + compensation.bendRadius * 20)));

    // 5. Real-Time Geometric Error & Collision Validation
    const errorList: GeometricErrorItem[] = [];
    const warningList: GeometricErrorItem[] = [];
    const infoList: GeometricErrorItem[] = [];

    // Check 1: Glue tab width check
    if (glueTab < 10) {
      errorList.push({
        id: 'err-glue-small',
        code: 'ERR_GLUE_TAB_TOO_SMALL',
        severity: 'critical',
        titleFa: 'عرض لبه چسب بسیار کوچک است',
        descriptionFa: `عرض لبه چسب فعلی (${glueTab} میلی‌متر) کمتر از حداقل استاندارد صنعتی (۱۰ میلی‌متر) است و باعث باز شدن لبه چسب پس از بسته‌بندی خواهد شد.`,
        affectedParameters: ['glueTab'],
        fixSuggestionFa: 'عرض لبه چسب را به ۱۵ الی ۲۰ میلی‌متر افزایش دهید.',
        autoFixable: true,
        suggestedCorrection: { glueTab: 15 }
      });
    } else if (glueTab > H * 0.8 && H > 30) {
      warningList.push({
        id: 'warn-glue-large',
        code: 'WARN_GLUE_TAB_TOO_LARGE',
        severity: 'warning',
        titleFa: 'عرض غیراقتصادی لبه چسب',
        descriptionFa: `عرض لبه چسب (${glueTab}mm) نسبت به ارتفاع جعبه (${H}mm) بیش از حد بزرگ است و مصرف مقوا را افزایش می‌دهد.`,
        affectedParameters: ['glueTab'],
        fixSuggestionFa: 'عرض لبه چسب را روی ۱۵ میلی‌متر تنظیم کنید.',
        autoFixable: true,
        suggestedCorrection: { glueTab: 15 }
      });
    }

    // Check 2: Tuck flap overhang collision
    if (tuck > W) {
      errorList.push({
        id: 'err-tuck-overhang',
        code: 'ERR_TUCK_OVERHANG_COLLISION',
        severity: 'critical',
        titleFa: 'تداخل و برخورد زبانه درب با کفی جعبه',
        descriptionFa: `ارتفاع زبانه درب (${tuck}mm) از عرض داخلی جعبه (${W}mm) بیشتر است. هنگام بستن، زبانه به دیواره روبرو برخورد کرده و درب کاملاً بسته نمی‌شود.`,
        affectedParameters: ['tuck', 'W'],
        fixSuggestionFa: `ارتفاع زبانه درب را حداکثر به ${Math.max(10, Math.floor(W * 0.7))} میلی‌متر کاهش دهید.`,
        autoFixable: true,
        suggestedCorrection: { tuck: Math.max(12, Math.floor(W * 0.65)) }
      });
    } else if (tuck < 12) {
      warningList.push({
        id: 'warn-tuck-short',
        code: 'WARN_TUCK_TOO_SHORT',
        severity: 'warning',
        titleFa: 'کوتاه بودن زبانه قفل درب',
        descriptionFa: `ارتفاع زبانه درب (${tuck}mm) کمتر از ۱۲ میلی‌متر است و ممکن است درب جعبه به راحتی باز شود.`,
        affectedParameters: ['tuck'],
        fixSuggestionFa: 'ارتفاع زبانه درب را به ۱۸ میلی‌متر افزایش دهید.',
        autoFixable: true,
        suggestedCorrection: { tuck: 18 }
      });
    }

    // Check 3: Dust flap collision check
    if (dustFlap * 2 > L && (params.boxType.includes('ecma') || params.boxType.includes('0201'))) {
      errorList.push({
        id: 'err-dust-overlap',
        code: 'ERR_DUST_FLAP_COLLISION',
        severity: 'critical',
        titleFa: 'تداخل و برخورد زبانی‌های گردگیر (Dust Flaps)',
        descriptionFa: `مجموع عرض زبانی‌های گردگیر چپ و راست (${dustFlap * 2}mm) از طول جعبه (${L}mm) بیشتر است و دو زبانه روی هم اورلپ می‌کنند.`,
        affectedParameters: ['dustFlap', 'L'],
        fixSuggestionFa: `عرض زبانه گردگیر را به حداکثر ${Math.floor(L * 0.45)} میلی‌متر کاهش دهید.`,
        autoFixable: true,
        suggestedCorrection: { dustFlap: Math.floor(L * 0.42) }
      });
    }

    // Check 4: Sheet Overflow check
    if (sheetW > maxPressW || sheetH > maxPressH) {
      errorList.push({
        id: 'err-sheet-overflow',
        code: 'ERR_SHEET_EXCEEDS_PRESS_LIMIT',
        severity: 'critical',
        titleFa: 'ابعاد گسترده جعبه بزرگتر از فرم ماشین چاپ/دایکات است',
        descriptionFa: `ابعاد شیت گسترده (${sheetW}×${sheetH} mm) از حداکثر ابعاد مجاز ماشین دایکات (${maxPressW}×${maxPressH} mm) فراتر رفته است.`,
        affectedParameters: ['L', 'W', 'H'],
        fixSuggestionFa: 'ابعاد L، W یا H را کاهش دهید یا از فرم چندتکه‌ای استفاده کنید.',
        autoFixable: false
      });
    }

    // Check 5: Aspect ratio & structural stability check
    const maxRatio = Math.max(L / W, L / H, H / W);
    if (maxRatio > 7) {
      warningList.push({
        id: 'warn-extreme-ratio',
        code: 'WARN_EXTREME_ASPECT_RATIO',
        severity: 'warning',
        titleFa: 'نسبت ابعادی غیرمتوازن (Extreme Aspect Ratio)',
        descriptionFa: `نسبت یکی از ابعاد جعبه بیش از ۷ برابر ابعاد دیگر است. این موضوع باعث ناصافی خطوط تا و پیچیدگی مقوا در زیر پرش ماشین چاپ می‌شود.`,
        affectedParameters: ['L', 'W', 'H'],
        fixSuggestionFa: 'ابعاد جعبه را به نسبت متوازن‌تر تغییر دهید.',
        autoFixable: false
      });
    }

    // Check 6: Material thickness vs fold clearance
    if (thickness > 0.6 && (params.materialType === 'SBS' || params.materialType === 'FBB') && Math.min(L, W, H) < 30) {
      warningList.push({
        id: 'warn-thick-board-small-box',
        code: 'WARN_THICK_BOARD_SMALL_VOLUME',
        severity: 'warning',
        titleFa: 'ضخامت بالای مقوا برای ابعاد کوچک',
        descriptionFa: `ضخامت مقوا (${thickness}mm) برای جعبه‌ای با ابعاد کوچک (${L}×${W}×${H}mm) بسیار زیاد است و باعث ترک خوردن خطوط تا می‌گردد.`,
        affectedParameters: ['materialThickness', 'L', 'W', 'H'],
        fixSuggestionFa: 'از مقوای با گرماژ کمتر (مثلاً ایندربرد ۲۵۰ گرم) استفاده نمایید.',
        autoFixable: true,
        suggestedCorrection: { materialThickness: 0.35, materialGsm: 250 }
      });
    }

    // Info notes for best practice
    if (materialWastePercentage < 20) {
      infoList.push({
        id: 'info-high-efficiency',
        code: 'INFO_HIGH_MATERIAL_EFFICIENCY',
        severity: 'info',
        titleFa: 'بازدهی متریال بسیار عالی',
        descriptionFa: `میزان پرت مقوا در این چیدمان کمتر از ۲۰٪ است که بازدهی اقتصادی بالایی را فراهم می‌سازد.`,
        affectedParameters: [],
        fixSuggestionFa: '',
        autoFixable: false
      });
    }

    // 6. Quality Score Calculation (100 minus penalty points)
    let score = 100;
    score -= errorList.length * 25;
    score -= warningList.length * 10;
    if (grainCrackingRisk === 'بالا (بحرانی)') score -= 15;
    if (grainCrackingRisk === 'متوسط (هشدار)') score -= 5;
    score = Math.max(0, Math.min(100, score));

    const isValid = errorList.length === 0;

    // 7. Spatial Panel Coordinates for 3D View Engine
    const panelSpatialData = RealtimeCalculationEngine.calculate3DFoldTransforms(params, 100);

    const calcResult: RealtimeFeedbackResult = {
      isValid,
      qualityScore: score,
      timestamp: Date.now(),
      dimensions2D: {
        sheetWidth: sheetW,
        sheetHeight: sheetH,
        grossAreaCm2,
        netAreaCm2,
        materialWastePercentage,
        cutLengthTotalMm,
        creaseLengthTotalMm,
        glueAreaTotalMm2
      },
      metrics3D: {
        volumeCm3,
        volumeLiters,
        boundingBox3D: { length: L, width: W, height: H },
        surfaceArea3DCm2,
        centerOfMass,
        estimatedMeshVertices,
        estimatedMeshFaces,
        foldPanelsCount
      },
      structuralPhysics: {
        bctValueKg,
        bctValueN,
        ectValue,
        maxStackingBoxes,
        maxStackingWeightKg,
        grainCrackingRisk,
        foldStressIndex
      },
      errors: errorList,
      warnings: warningList,
      infoNotes: infoList,
      panelSpatialData
    };

    if (RealtimeCalculationEngine.calculationCache.size >= RealtimeCalculationEngine.MAX_CACHE_SIZE) {
      const firstKey = RealtimeCalculationEngine.calculationCache.keys().next().value;
      if (firstKey) RealtimeCalculationEngine.calculationCache.delete(firstKey);
    }
    RealtimeCalculationEngine.calculationCache.set(cacheKey, calcResult);

    return calcResult;
  }

  /**
   * Automatically corrects parameters that fail critical geometry rules.
   */
  static autoCorrectParameters(params: Dieline3DParameters): {
    correctedParams: Dieline3DParameters;
    correctionsApplied: string[];
  } {
    const feedback = RealtimeCalculationEngine.calculateRealtimeFeedback(params);
    const correctedParams: Dieline3DParameters = { ...params };
    const correctionsApplied: string[] = [];

    feedback.errors.forEach(err => {
      if (err.autoFixable && err.suggestedCorrection) {
        Object.assign(correctedParams, err.suggestedCorrection);
        correctionsApplied.push(`${err.titleFa}: ${err.fixSuggestionFa}`);
      }
    });

    feedback.warnings.forEach(warn => {
      if (warn.autoFixable && warn.suggestedCorrection) {
        Object.assign(correctedParams, warn.suggestedCorrection);
        correctionsApplied.push(`${warn.titleFa}: ${warn.fixSuggestionFa}`);
      }
    });

    return {
      correctedParams,
      correctionsApplied
    };
  }

  /**
   * Generates 3D panel spatial folding matrices and transformations for any fold percentage (0 to 100%).
   */
  static calculate3DFoldTransforms(params: Dieline3DParameters, foldPercentage: number): Panel3DSpatialInfo[] {
    const L = params.L;
    const W = params.W;
    const H = params.H;
    const tuck = params.tuck;
    const dustFlap = params.dustFlap;
    const glueTab = params.glueTab;

    const t = Math.min(1, Math.max(0, foldPercentage / 100));

    // Base Front Panel (0° reference panel)
    const frontPanel: Panel3DSpatialInfo = {
      panelId: 'panel-front',
      nameFa: 'دیواره اصلی جلو (Front)',
      dimensions2D: { width: L, height: H },
      pivot3D: { x: 0, y: 0, z: 0 },
      normalVector: { x: 0, y: 0, z: 1 },
      foldAngleDeg: 0,
      maxFoldAngleDeg: 0,
      foldAxis: 'Y',
      isBasePanel: true
    };

    // Right Side Panel (folds 90° inward along Y axis)
    const rightPanel: Panel3DSpatialInfo = {
      panelId: 'panel-right',
      nameFa: 'دیواره جانبی راست (Right)',
      dimensions2D: { width: W, height: H },
      pivot3D: { x: L / 2, y: 0, z: 0 },
      normalVector: { x: Math.sin(t * (Math.PI / 2)), y: 0, z: Math.cos(t * (Math.PI / 2)) },
      foldAngleDeg: t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'Y',
      parentPanelId: 'panel-front'
    };

    // Rear Panel (folds 180° total relative to front)
    const rearPanel: Panel3DSpatialInfo = {
      panelId: 'panel-rear',
      nameFa: 'دیواره پشتی (Back)',
      dimensions2D: { width: L, height: H },
      pivot3D: { x: L / 2 + W * Math.cos(t * (Math.PI / 2)), y: 0, z: W * Math.sin(t * (Math.PI / 2)) },
      normalVector: { x: Math.sin(t * Math.PI), y: 0, z: Math.cos(t * Math.PI) },
      foldAngleDeg: t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'Y',
      parentPanelId: 'panel-right'
    };

    // Left Side Panel
    const leftPanel: Panel3DSpatialInfo = {
      panelId: 'panel-left',
      nameFa: 'دیواره جانبی چپ (Left)',
      dimensions2D: { width: W, height: H },
      pivot3D: { x: -L / 2, y: 0, z: 0 },
      normalVector: { x: -Math.sin(t * (Math.PI / 2)), y: 0, z: Math.cos(t * (Math.PI / 2)) },
      foldAngleDeg: -t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'Y',
      parentPanelId: 'panel-front'
    };

    // Glue Tab Flap
    const gluePanel: Panel3DSpatialInfo = {
      panelId: 'panel-glue',
      nameFa: 'زبانه چسب‌خوردگی (Glue Tab)',
      dimensions2D: { width: glueTab, height: H },
      pivot3D: { x: -L / 2 - W, y: 0, z: 0 },
      normalVector: { x: 0, y: 0, z: 1 },
      foldAngleDeg: t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'Y',
      parentPanelId: 'panel-left'
    };

    // Top Cover Lid Flap
    const topLid: Panel3DSpatialInfo = {
      panelId: 'panel-top-lid',
      nameFa: 'درب فوقانی (Top Lid)',
      dimensions2D: { width: L, height: W },
      pivot3D: { x: 0, y: H / 2, z: 0 },
      normalVector: { x: 0, y: Math.sin(t * (Math.PI / 2)), z: Math.cos(t * (Math.PI / 2)) },
      foldAngleDeg: t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'X',
      parentPanelId: 'panel-front'
    };

    // Tuck Flap
    const tuckFlap: Panel3DSpatialInfo = {
      panelId: 'panel-tuck',
      nameFa: 'زبانه قفل قفل‌شونده درب (Tuck Flap)',
      dimensions2D: { width: L, height: tuck },
      pivot3D: { x: 0, y: H / 2 + W, z: 0 },
      normalVector: { x: 0, y: 0, z: 1 },
      foldAngleDeg: t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'X',
      parentPanelId: 'panel-top-lid'
    };

    // Dust Flap Left
    const dustLeft: Panel3DSpatialInfo = {
      panelId: 'panel-dust-left',
      nameFa: 'زبانه گردگیر چپ (Dust Flap Left)',
      dimensions2D: { width: dustFlap, height: W },
      pivot3D: { x: -L / 2, y: H / 2, z: 0 },
      normalVector: { x: 0, y: 0, z: 1 },
      foldAngleDeg: t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'Z',
      parentPanelId: 'panel-left'
    };

    // Dust Flap Right
    const dustRight: Panel3DSpatialInfo = {
      panelId: 'panel-dust-right',
      nameFa: 'زبانه گردگیر راست (Dust Flap Right)',
      dimensions2D: { width: dustFlap, height: W },
      pivot3D: { x: L / 2, y: H / 2, z: 0 },
      normalVector: { x: 0, y: 0, z: 1 },
      foldAngleDeg: -t * 90,
      maxFoldAngleDeg: 90,
      foldAxis: 'Z',
      parentPanelId: 'panel-right'
    };

    return [
      frontPanel,
      rightPanel,
      rearPanel,
      leftPanel,
      gluePanel,
      topLid,
      tuckFlap,
      dustLeft,
      dustRight
    ];
  }

  // Private Helper: Estimate total length of SVG path
  private static estimatePathLength(pathStr: string): number {
    let totalLen = 0;
    const commands = pathStr.split(/(?=[MLMLZQAQ])/i);
    let curr = { x: 0, y: 0 };

    commands.forEach(cmd => {
      const trimmed = cmd.trim();
      if (!trimmed) return;
      const type = trimmed[0].toUpperCase();
      const coords = trimmed.substring(1).trim().replace(/,/g, ' ').split(/\s+/).map(Number).filter(n => !isNaN(n));

      if (type === 'M' && coords.length >= 2) {
        curr = { x: coords[0], y: coords[1] };
      } else if (type === 'L' && coords.length >= 2) {
        const next = { x: coords[0], y: coords[1] };
        totalLen += Math.hypot(next.x - curr.x, next.y - curr.y);
        curr = next;
      } else if (type === 'A' && coords.length >= 7) {
        const next = { x: coords[5], y: coords[6] };
        totalLen += Math.hypot(next.x - curr.x, next.y - curr.y) * 1.2; // approx arc len
        curr = next;
      }
    });

    return snap(totalLen);
  }

  // Private Helper: Get standard ECT value based on material type and grammage
  private static getECTValueForMaterial(type: string, gsm: number, thickness: number): number {
    switch (type) {
      case 'SBS':
        return 4.2 + (gsm / 100) * 0.8;
      case 'FBB':
        return 3.5 + (gsm / 100) * 0.7;
      case 'Duplex':
        return 3.0 + (gsm / 100) * 0.5;
      case 'Kraft':
        return 4.8 + (gsm / 100) * 0.9;
      case 'Corrugated_E':
        return 5.5 + thickness * 2.5;
      case 'Corrugated_B':
        return 7.2 + thickness * 2.8;
      case 'Corrugated_C':
        return 8.5 + thickness * 3.0;
      default:
        return 4.0;
    }
  }

  // Private Helper: Number of panels in model
  private static getPanelCountForType(boxType: string): number {
    if (!boxType) return 9;
    if (boxType.includes('0201') || boxType.includes('rsc')) return 12;
    if (boxType.includes('0427') || boxType.includes('mailer')) return 14;
    if (boxType.includes('snap-lock') || boxType.includes('123')) return 11;
    if (boxType.includes('c1020') || boxType.includes('drawer')) return 10;
    return 9; // Default Tuck End ECMA
  }
}
