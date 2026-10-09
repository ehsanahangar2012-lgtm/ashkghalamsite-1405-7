import { 
  CustomEntity, 
  CustomDielineTemplate, 
  parseDxfToEntities, 
  analyzeTopology, 
  scaleCustomDieline 
} from './customDielineEngine';

export interface KeyGeometricPoint {
  x: number;
  y: number;
  type: 'fold_intersection' | 'cut_corner' | 'glue_anchor' | 'lock_tab_vertex' | 'tuck_ear_apex';
  description: string;
}

export interface LearnedPatternFeature {
  id: string;
  name: string;
  type: 'lock_tab' | 'glue_tab' | 'tuck_flap' | 'crease_grid' | 'thumb_notch';
  entityIds: string[];
  isFixedGeometry: boolean;
}

export interface LearnedPattern extends CustomDielineTemplate {
  keyPoints: KeyGeometricPoint[];
  features: LearnedPatternFeature[];
  createdAt: string;
}

/**
 * =========================================================================
 * PATTERN LEARNING ENGINE (موتور یادگیری و تحلیل الگوی وکتور)
 * CHAPE ASHK GHALAM - AUTOMATED VECTOR TOPOLOGY & FEATURE DETECTOR
 * =========================================================================
 */
export class PatternLearningEngine {
  /**
   * Analyzes an uploaded DXF/SVG vector string, learns key points, 
   * auto-detects non-deforming lock tabs/glue chamfers, and returns a LearnedPattern.
   */
  static analyzePattern(
    vectorText: string,
    fileType: 'dxf' | 'svg' = 'dxf',
    metadata?: {
      name?: string;
      code?: string;
      category?: string;
      defaultDims?: { L: number; W: number; H: number };
    }
  ): LearnedPattern {
    const rawEntities = fileType === 'dxf' 
      ? parseDxfToEntities(vectorText) 
      : this.parseSvgToEntities(vectorText);

    const dims = metadata?.defaultDims || { L: 100, W: 100, H: 80 };
    
    // 1. Analyze global topology and crease grid
    const anchors = analyzeTopology(rawEntities, dims, { disableAutoFlip: true });

    // 2. Identify sensitive geometric features (lock tabs, tuck ears, glue chamfers)
    const ys = rawEntities.flatMap(e => [e.y1, e.y2]);
    const xs = rawEntities.flatMap(e => [e.x1, e.x2]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const height = maxY - minY;

    const keyPoints: KeyGeometricPoint[] = [];
    const features: LearnedPatternFeature[] = [];

    // Tag entities with ID if missing
    const taggedEntities = rawEntities.map((ent, idx) => {
      const id = ent.id || `ent_${idx + 1}`;
      const len = Math.sqrt(Math.pow(ent.x2 - ent.x1, 2) + Math.pow(ent.y2 - ent.y1, 2));
      const midY = (ent.y1 + ent.y2) / 2;
      const midX = (ent.x1 + ent.x2) / 2;
      const dx = Math.abs(ent.x2 - ent.x1);
      const dy = Math.abs(ent.y2 - ent.y1);
      const isDiagonal = dx > 0.5 && dy > 0.5;

      // Sensitive lock tabs sit in top/bottom outer 22% zone, or near glue tab edges
      const isNearTerminalFlapZone = midY < minY + height * 0.22 || midY > maxY - height * 0.22;
      const isNearGlueEdge = midX < minX + 35 || midX > maxX - 35;

      const isFixedFeature = 
        (isDiagonal && len < 45) || 
        (isNearTerminalFlapZone && len < 35) || 
        (isNearGlueEdge && isDiagonal);

      // Collect key points
      if (isFixedFeature) {
        keyPoints.push({
          x: midX,
          y: midY,
          type: isNearTerminalFlapZone ? 'lock_tab_vertex' : 'glue_anchor',
          description: `نقطه هندسی حساس ثابت ۱:۱ (${ent.partType || 'ویژگی قفل/زبانه'})`
        });
      }

      return {
        ...ent,
        id,
        scalingConstraint: isFixedFeature ? ('fixed_geometry' as const) : ('auto' as const)
      };
    });

    // 3. Group features
    const lockEntities = taggedEntities.filter(e => e.scalingConstraint === 'fixed_geometry').map(e => e.id!);
    if (lockEntities.length > 0) {
      features.push({
        id: 'feat_locks',
        name: 'زبانه و قفل‌های هندسی ثابت ۱:۱',
        type: 'lock_tab',
        entityIds: lockEntities,
        isFixedGeometry: true
      });
    }

    const templateId = `pattern-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      id: templateId,
      name: metadata?.name || `الگوی یادگیری شده ${new Date().toLocaleDateString('fa-IR')}`,
      code: metadata?.code || `LEARNED-${Math.floor(Math.random() * 9000 + 1000)}`,
      category: metadata?.category || 'custom_learned',
      originalDims: dims,
      entities: taggedEntities,
      anchors,
      keyPoints,
      features,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Helper to parse SVG path/lines into CustomEntities
   */
  private static parseSvgToEntities(svgText: string): CustomEntity[] {
    const entities: CustomEntity[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');

    const lines = doc.querySelectorAll('line');
    lines.forEach((l, idx) => {
      const x1 = parseFloat(l.getAttribute('x1') || '0');
      const y1 = parseFloat(l.getAttribute('y1') || '0');
      const x2 = parseFloat(l.getAttribute('x2') || '0');
      const y2 = parseFloat(l.getAttribute('y2') || '0');
      const stroke = (l.getAttribute('stroke') || '').toLowerCase();
      const isCrease = stroke.includes('blue') || stroke.includes('red') || stroke.includes('dash');

      entities.push({
        id: `svg_line_${idx}`,
        type: 'LINE',
        x1, y1, x2, y2,
        isCrease,
        partType: isCrease ? 'crease' : 'cut',
        layer: 'SVG_IMPORT'
      });
    });

    return entities;
  }

  /**
   * Saves a learned pattern into local persistence so DielineGenerator picks it up automatically
   */
  static savePattern(pattern: LearnedPattern): void {
    try {
      const existingJson = localStorage.getItem('ashk_custom_dielines');
      let templates: CustomDielineTemplate[] = existingJson ? JSON.parse(existingJson) : [];
      
      // Filter out duplicate if existing
      templates = templates.filter(t => t.id !== pattern.id);
      templates.unshift(pattern);

      localStorage.setItem('ashk_custom_dielines', JSON.stringify(templates));
    } catch (err) {
      console.error('Failed to save pattern to localStorage:', err);
    }
  }

  /**
   * Parametric scaling function that preserves non-deforming lock tabs/features for DielineGenerator.
   * Returns rendered SVG path collections and dimensions ready for CAD/Canvas/3D display.
   */
  static scalePatternParametrically(
    template: CustomDielineTemplate,
    targetDims: { L: number; W: number; H: number }
  ) {
    return scaleCustomDieline(template, targetDims.L, targetDims.W, targetDims.H);
  }
}
