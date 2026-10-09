import { STANDARD_DIELINE_ENGINES } from './dielineMath';

// =========================================================================
// CUSTOM DXF/SVG TOPOLOGICAL VECTOR SCALING ENGINE
// CHAPE ASHK GHALAM - INDEPENDENT AI CAD TRANSLATOR & GENERATOR
// =========================================================================
// This service implements a fully independent, self-learning CAD engine that:
// 1. Parses raw DXF / SVG text data.
// 2. Extracts vector lines, classifications (CUT vs CREASE), and key coordinates.
// 3. Automatically learns the structural topology (panels, heights, flaps).
// 4. Parameterizes every point relative to detected panels and horizontal creases.
// 5. Scales/reconstructs the entire dieline dynamically for any specified L, W, H!

export type LinePartType = 'cut' | 'crease' | 'flap' | 'glue' | 'bleed' | 'perforation';

export type ScalingConstraintType = 
  | 'auto' 
  | 'fixed_geometry' 
  | 'scale_L' 
  | 'scale_W' 
  | 'scale_H';

export interface CustomDielineTemplate {
  id: string;
  name: string;
  code: string;
  category: string;
  originalDims: { L: number; W: number; H: number };
  entities: CustomEntity[];
  // Learned topological anchors
  anchors: {
    creaseX: number[]; // c0, c1, c2, c3, c4
    creaseY: number[]; // yTop, yBottom
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    hasGlueTab: boolean;
    isTopologicallyValid: boolean;
    topSideOrientation?: 'top' | 'bottom';
    glueTabPosition?: 'left' | 'right' | 'top' | 'bottom';
    disableAutoFlip?: boolean;
  };
  transforms?: {
    rotationAngle?: number;
    isFlippedH?: boolean;
    isFlippedV?: boolean;
    isBaked?: boolean;
  };
}

export interface CustomEntity {
  id?: string;
  type: 'LINE' | 'ARC';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  r?: number; // for arcs
  startAngle?: number;
  endAngle?: number;
  isCrease: boolean;
  partType?: LinePartType;
  layer: string;
  color?: string;
  scalingConstraint?: ScalingConstraintType;
  description?: string;
}

/**
 * Parses a DXF ASCII string and extracts high-fidelity lines/arcs
 */
export function parseDxfToEntities(dxfText: string): CustomEntity[] {
  const rawLines = dxfText.split(/\r?\n/).map(line => line.trim());
  const entities: CustomEntity[] = [];

  let idx = 0;
  while (idx < rawLines.length) {
    const groupCode = rawLines[idx];
    const value = rawLines[idx + 1];
    if (groupCode === undefined || value === undefined) {
      break;
    }

    if (groupCode === '0') {
      const type = value.toUpperCase();
      if (type === 'LINE') {
        let layer = '0';
        let colorIndex = 7;
        let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        idx += 2;
        while (idx < rawLines.length) {
          const g = rawLines[idx];
          const v = rawLines[idx + 1];
          if (g === '0') {
            idx -= 2; // rollback so outer loop can handle next entity
            break;
          }
          if (g === '8') layer = v;
          else if (g === '62') colorIndex = Math.abs(parseInt(v, 10));
          else if (g === '10') x1 = parseFloat(v);
          else if (g === '20') y1 = parseFloat(v);
          else if (g === '11') x2 = parseFloat(v);
          else if (g === '21') y2 = parseFloat(v);
          idx += 2;
        }
        entities.push({
          type: 'LINE',
          x1, y1, x2, y2,
          isCrease: isLayerCrease(layer, colorIndex),
          layer
        });
      }
      else if (type === 'LWPOLYLINE') {
        let layer = '0';
        let colorIndex = 7;
        let isClosed = false;
        const vertices: {x: number, y: number}[] = [];
        let curX: number | null = null;
        let curY: number | null = null;

        idx += 2;
        while (idx < rawLines.length) {
          const g = rawLines[idx];
          const v = rawLines[idx + 1];
          if (g === '0') {
            idx -= 2;
            break;
          }
          if (g === '8') layer = v;
          else if (g === '62') colorIndex = Math.abs(parseInt(v, 10));
          else if (g === '70') {
            const flag = parseInt(v, 10);
            isClosed = (flag & 1) !== 0;
          }
          else if (g === '10') {
            curX = parseFloat(v);
          }
          else if (g === '20') {
            curY = parseFloat(v);
            if (curX !== null && curY !== null) {
              vertices.push({ x: curX, y: curY });
              curX = null;
              curY = null;
            }
          }
          idx += 2;
        }

        // Decompose LWPOLYLINE into lines
        for (let j = 0; j < vertices.length - 1; j++) {
          entities.push({
            type: 'LINE',
            x1: vertices[j].x,
            y1: vertices[j].y,
            x2: vertices[j + 1].x,
            y2: vertices[j + 1].y,
            isCrease: isLayerCrease(layer, colorIndex),
            layer
          });
        }
        if (isClosed && vertices.length > 2) {
          entities.push({
            type: 'LINE',
            x1: vertices[vertices.length - 1].x,
            y1: vertices[vertices.length - 1].y,
            x2: vertices[0].x,
            y2: vertices[0].y,
            isCrease: isLayerCrease(layer, colorIndex),
            layer
          });
        }
      }
      else if (type === 'POLYLINE') {
        let layer = '0';
        let colorIndex = 7;
        let isClosed = false;
        const vertices: {x: number, y: number}[] = [];

        idx += 2;
        while (idx < rawLines.length) {
          const g = rawLines[idx];
          const v = rawLines[idx + 1];
          if (g === '0') {
            const nextType = v.toUpperCase();
            if (nextType === 'SEQEND') {
              idx += 2;
              break;
            } else if (nextType === 'VERTEX') {
              let vx = 0, vy = 0;
              idx += 2;
              while (idx < rawLines.length) {
                const vg = rawLines[idx];
                const vv = rawLines[idx + 1];
                if (vg === '0') {
                  idx -= 2;
                  break;
                }
                if (vg === '10') vx = parseFloat(vv);
                else if (vg === '20') vy = parseFloat(vv);
                idx += 2;
              }
              vertices.push({ x: vx, y: vy });
            } else {
              idx -= 2;
              break;
            }
          } else {
            if (g === '8') layer = v;
            else if (g === '62') colorIndex = Math.abs(parseInt(v, 10));
            else if (g === '70') {
              const flag = parseInt(v, 10);
              isClosed = (flag & 1) !== 0;
            }
            idx += 2;
          }
        }

        // Decompose POLYLINE into lines
        for (let j = 0; j < vertices.length - 1; j++) {
          entities.push({
            type: 'LINE',
            x1: vertices[j].x,
            y1: vertices[j].y,
            x2: vertices[j + 1].x,
            y2: vertices[j + 1].y,
            isCrease: isLayerCrease(layer, colorIndex),
            layer
          });
        }
        if (isClosed && vertices.length > 2) {
          entities.push({
            type: 'LINE',
            x1: vertices[vertices.length - 1].x,
            y1: vertices[vertices.length - 1].y,
            x2: vertices[0].x,
            y2: vertices[0].y,
            isCrease: isLayerCrease(layer, colorIndex),
            layer
          });
        }
      }
      else if (type === 'ARC') {
        let layer = '0';
        let colorIndex = 7;
        let cx = 0, cy = 0, r = 0, startAngle = 0, endAngle = 0;
        idx += 2;
        while (idx < rawLines.length) {
          const g = rawLines[idx];
          const v = rawLines[idx + 1];
          if (g === '0') {
            idx -= 2;
            break;
          }
          if (g === '8') layer = v;
          else if (g === '62') colorIndex = Math.abs(parseInt(v, 10));
          else if (g === '10') cx = parseFloat(v);
          else if (g === '20') cy = parseFloat(v);
          else if (g === '40') r = parseFloat(v);
          else if (g === '50') startAngle = parseFloat(v);
          else if (g === '51') endAngle = parseFloat(v);
          idx += 2;
        }

        // Decompose ARC into small LINE segments to be robust under transformation
        let sweep = endAngle - startAngle;
        if (sweep < 0) sweep += 360;
        const numSegments = Math.max(8, Math.min(32, Math.ceil(sweep / 10)));
        for (let k = 0; k < numSegments; k++) {
          const theta1 = (startAngle + (k / numSegments) * sweep) * Math.PI / 180;
          const theta2 = (startAngle + ((k + 1) / numSegments) * sweep) * Math.PI / 180;
          const ax1 = cx + r * Math.cos(theta1);
          const ay1 = cy + r * Math.sin(theta1);
          const ax2 = cx + r * Math.cos(theta2);
          const ay2 = cy + r * Math.sin(theta2);
          entities.push({
            type: 'LINE',
            x1: ax1,
            y1: ay1,
            x2: ax2,
            y2: ay2,
            isCrease: isLayerCrease(layer, colorIndex),
            layer
          });
        }
      }
      else if (type === 'CIRCLE') {
        let layer = '0';
        let colorIndex = 7;
        let cx = 0, cy = 0, r = 0;
        idx += 2;
        while (idx < rawLines.length) {
          const g = rawLines[idx];
          const v = rawLines[idx + 1];
          if (g === '0') {
            idx -= 2;
            break;
          }
          if (g === '8') layer = v;
          else if (g === '62') colorIndex = Math.abs(parseInt(v, 10));
          else if (g === '10') cx = parseFloat(v);
          else if (g === '20') cy = parseFloat(v);
          else if (g === '40') r = parseFloat(v);
          idx += 2;
        }

        // Decompose CIRCLE into 32 LINE segments
        const numSegments = 32;
        for (let k = 0; k < numSegments; k++) {
          const theta1 = (k / numSegments) * 2 * Math.PI;
          const theta2 = ((k + 1) / numSegments) * 2 * Math.PI;
          const ax1 = cx + r * Math.cos(theta1);
          const ay1 = cy + r * Math.sin(theta1);
          const ax2 = cx + r * Math.cos(theta2);
          const ay2 = cy + r * Math.sin(theta2);
          entities.push({
            type: 'LINE',
            x1: ax1,
            y1: ay1,
            x2: ax2,
            y2: ay2,
            isCrease: isLayerCrease(layer, colorIndex),
            layer
          });
        }
      }
      else {
        idx += 2;
      }
    } else {
      idx += 2;
    }
  }

  return entities;
}

export function classifyDxfLayerAndColor(layer: string, colorIndex?: number): { isCrease: boolean; partType: LinePartType } {
  const ln = (layer || '').toLowerCase();
  
  if (ln.includes('glue') || ln.includes('chasb') || ln.includes('لب_چسب') || ln.includes('لبچسب') || ln.includes('adhesive') || colorIndex === 3 || colorIndex === 6) {
    return { isCrease: false, partType: 'glue' };
  }
  if (ln.includes('bleed') || ln.includes('art') || ln.includes('بلید')) {
    return { isCrease: false, partType: 'bleed' };
  }
  if (ln.includes('perf') || ln.includes('dotted') || ln.includes('پرفراژ')) {
    return { isCrease: true, partType: 'perforation' };
  }
  if (ln.includes('crease') || ln.includes('blue') || ln.includes('fold') || ln.includes('score') || ln.includes('ta') || ln.includes('تا') || colorIndex === 5 || colorIndex === 4) {
    return { isCrease: true, partType: 'crease' };
  }
  return { isCrease: false, partType: 'cut' };
}

export function analyzeAndClassifyDxfGeometry(entities: CustomEntity[]): {
  entities: CustomEntity[];
  counts: { cut: number; crease: number; glue: number; bleed: number; perforation: number };
  summaryMessage: string;
} {
  if (!entities || entities.length === 0) {
    return {
      entities: [],
      counts: { cut: 0, crease: 0, glue: 0, bleed: 0, perforation: 0 },
      summaryMessage: 'فایل فاقد عناصر برداری جهت تحلیل بود.'
    };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  entities.forEach(e => {
    minX = Math.min(minX, e.x1, e.x2);
    minY = Math.min(minY, e.y1, e.y2);
    maxX = Math.max(maxX, e.x1, e.x2);
    maxY = Math.max(maxY, e.y1, e.y2);
  });

  const counts: { cut: number; crease: number; glue: number; bleed: number; perforation: number } = {
    cut: 0,
    crease: 0,
    glue: 0,
    bleed: 0,
    perforation: 0
  };

  const processed = entities.map(e => {
    let classification = classifyDxfLayerAndColor(e.layer);
    
    const isGenericLayer = !e.layer || e.layer === '0' || e.layer.toLowerCase().includes('default') || e.layer.toLowerCase().includes('layer');
    
    if (isGenericLayer) {
      const isHorizontal = Math.abs(e.y1 - e.y2) < 0.5;
      const isVertical = Math.abs(e.x1 - e.x2) < 0.5;
      
      const isNearLeftEdge = Math.min(e.x1, e.x2) <= minX + 25 && Math.max(e.x1, e.x2) <= minX + 35;
      const isOuterBoundary = Math.abs(e.x1 - minX) < 1 || Math.abs(e.x2 - maxX) < 1 || Math.abs(e.y1 - minY) < 1 || Math.abs(e.y2 - maxY) < 1;

      if (isNearLeftEdge && (isHorizontal || !isVertical)) {
        classification = { isCrease: false, partType: 'glue' };
      } else if (isOuterBoundary) {
        classification = { isCrease: false, partType: 'cut' };
      } else if (isHorizontal || isVertical) {
        classification = { isCrease: true, partType: 'crease' };
      } else {
        classification = { isCrease: false, partType: 'cut' };
      }
    }

    const pt = classification.partType || (classification.isCrease ? 'crease' : 'cut');
    counts[pt] = (counts[pt] || 0) + 1;

    let stdLayer = 'CUT';
    let stdColor = '#171827';
    if (pt === 'crease') { stdLayer = 'CREASE'; stdColor = '#dc2626'; }
    else if (pt === 'glue') { stdLayer = 'GLUE'; stdColor = '#10b981'; }
    else if (pt === 'bleed') { stdLayer = 'BLEED'; stdColor = '#06b6d4'; }
    else if (pt === 'perforation') { stdLayer = 'PERFORATION'; stdColor = '#f97316'; }

    return {
      ...e,
      isCrease: classification.isCrease,
      partType: pt,
      layer: stdLayer,
      color: stdColor
    };
  });

  const summaryMessage = `تحلیل هندسی هوشمند DXF: تفکیک خودکار انجام شد (${counts.cut} بردار برش CUT، ${counts.crease} بردار تای CREASE، ${counts.glue} بردار لبچسب GLUE، ${counts.perforation} پرفراژ).`;

  return { entities: processed, counts, summaryMessage };
}

function isLayerCrease(layer: string, colorIndex?: number): boolean {
  return classifyDxfLayerAndColor(layer, colorIndex).isCrease;
}

/**
 * Learns topological anchors and panel partitions from DXF entities
 */
export function analyzeTopology(
  entities: CustomEntity[], 
  fallbackDims = { L: 100, W: 100, H: 80 },
  options?: { disableAutoFlip?: boolean }
): CustomDielineTemplate['anchors'] {
  if (entities.length === 0) {
    return {
      creaseX: [15, 115, 215, 315, 415],
      creaseY: [100, 180],
      minX: 0,
      maxX: 415,
      minY: 0,
      maxY: 280,
      hasGlueTab: true,
      isTopologicallyValid: false,
      disableAutoFlip: options?.disableAutoFlip
    };
  }

  // Work on a cloned entity list to prevent mutating original caller references
  const localEntities = entities.map(e => ({ ...e }));

  // 1. Find bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  localEntities.forEach(e => {
    if (e.type === 'LINE') {
      minX = Math.min(minX, e.x1, e.x2);
      maxX = Math.max(maxX, e.x1, e.x2);
      minY = Math.min(minY, e.y1, e.y2);
      maxY = Math.max(maxY, e.y1, e.y2);
    } else {
      minX = Math.min(minX, e.x1 - (e.r || 0));
      maxX = Math.max(maxX, e.x1 + (e.r || 0));
      minY = Math.min(minY, e.y1 - (e.r || 0));
      maxY = Math.max(maxY, e.y1 + (e.r || 0));
    }
  });

  // Shift local entities so minX = 0 and minY = 0
  localEntities.forEach(e => {
    e.x1 -= minX;
    e.y1 -= minY;
    if (e.type === 'LINE') {
      e.x2 -= minX;
      e.y2 -= minY;
    }
  });

  const width = maxX - minX;
  const height = maxY - minY;
  maxX = width;
  maxY = height;
  minX = 0;
  minY = 0;

  // 1.5 Smart Crease Inference and Orientation Auto-Correction
  let cY0_initial = height * 0.25;
  let cY1_initial = height * 0.75;
  
  const yCandidates: { y: number; len: number }[] = [];
  localEntities.forEach(e => {
    if (e.type === 'LINE') {
      const isHorizontal = Math.abs(e.y1 - e.y2) < 2.0;
      if (isHorizontal) {
        const midY = (e.y1 + e.y2) / 2;
        if (midY > height * 0.1 && midY < height * 0.9) {
          const len = Math.abs(e.x1 - e.x2);
          let found = false;
          for (const cand of yCandidates) {
            if (Math.abs(cand.y - midY) < 5.0) {
              cand.len += len;
              found = true;
              break;
            }
          }
          if (!found) {
            yCandidates.push({ y: midY, len });
          }
        }
      }
    }
  });

  yCandidates.sort((a, b) => b.len - a.len);
  if (yCandidates.length >= 2) {
    const top2 = yCandidates.slice(0, 2).map(c => c.y);
    top2.sort((a, b) => a - b);
    cY0_initial = top2[0];
    cY1_initial = top2[1];
  }

  // Check if we need to flip vertical orientation (unless disableAutoFlip is true)
  if (!options?.disableAutoFlip) {
    let topDiagLen = 0;
    let botDiagLen = 0;
    localEntities.forEach(e => {
      if (e.type === 'LINE') {
        const dx = Math.abs(e.x1 - e.x2);
        const dy = Math.abs(e.y1 - e.y2);
        if (dx > 0.5 && dy > 0.5) {
          const slope = dy / dx;
          if (slope > 0.35 && slope < 2.5) {
            const len = Math.sqrt(dx * dx + dy * dy);
            const midY = (e.y1 + e.y2) / 2;
            if (midY > cY1_initial) {
              topDiagLen += len;
            } else if (midY < cY0_initial) {
              botDiagLen += len;
            }
          }
        }
      }
    });

    if (topDiagLen > 15 && topDiagLen > botDiagLen * 1.5) {
      localEntities.forEach(e => {
        e.y1 = height - e.y1;
        if (e.type === 'LINE') {
          e.y2 = height - e.y2;
        }
      });
      
      const flipped_cY0 = height - cY1_initial;
      const flipped_cY1 = height - cY0_initial;
      cY0_initial = Math.min(flipped_cY0, flipped_cY1);
      cY1_initial = Math.max(flipped_cY0, flipped_cY1);
    }
  }

  // Now, run smart crease inference to mark entities as creases
  // This ensures that crease lines are clearly detected and flagged even if missing in DXF
  entities.forEach(e => {
    if (e.type === 'LINE') {
      const midY = (e.y1 + e.y2) / 2;
      const isHorizontal = Math.abs(e.y1 - e.y2) < 2.0;
      if (isHorizontal && (Math.abs(midY - cY0_initial) < 4.0 || Math.abs(midY - cY1_initial) < 4.0)) {
        e.isCrease = true;
      }

      // Mark vertical creases: vertical lines crossing the body height
      const isVertical = Math.abs(e.x1 - e.x2) < 2.0;
      if (isVertical) {
        const minYLine = Math.min(e.y1, e.y2);
        const maxYLine = Math.max(e.y1, e.y2);
        const startsNearBottom = Math.abs(minYLine - cY0_initial) < 10.0 || minYLine < cY0_initial + 5.0;
        const endsNearTop = Math.abs(maxYLine - cY1_initial) < 10.0 || maxYLine > cY1_initial - 5.0;
        if (startsNearBottom && endsNearTop) {
          const midX = (e.x1 + e.x2) / 2;
          if (midX > width * 0.02 && midX < width * 0.98) {
            e.isCrease = true;
          }
        }
      }
    }
  });

  // 2. Robust topological vertical line detection (groups by X)
  const hasAnyCreases = entities.some(e => e.isCrease);

  const xGroups: { x: number, length: number }[] = [];
  entities.forEach(e => {
    if (e.type === 'LINE' && Math.abs(e.x1 - e.x2) < 2.0 && (!hasAnyCreases || e.isCrease)) {
      let found = false;
      for (const group of xGroups) {
        if (Math.abs(group.x - e.x1) < 4) {
          group.length += Math.abs(e.y1 - e.y2);
          group.x = (group.x + e.x1) / 2;
          found = true;
          break;
        }
      }
      if (!found) {
        xGroups.push({ x: e.x1, length: Math.abs(e.y1 - e.y2) });
      }
    }
  });
  
  // Sort xGroups by X coordinate
  xGroups.sort((a, b) => a.x - b.x);

  // Filter for significant vertical lines (at least 15% of bounding height)
  const significantXGroups = xGroups.filter(g => g.length > height * 0.15);
  
  let creaseX: number[] = [];
  if (hasAnyCreases) {
    // Sort by length descending to find the 4 most significant vertical crease lines
    const sortedByLen = [...significantXGroups].sort((a, b) => b.length - a.length);
    const top4 = sortedByLen.slice(0, 4);
    // Sort them back by X coordinate ascending
    top4.sort((a, b) => a.x - b.x);
    if (top4.length === 4) {
      creaseX = [...top4.map(g => g.x), maxX];
    } else {
      creaseX = significantXGroups.map(g => g.x);
    }
  } else {
    creaseX = significantXGroups.map(g => g.x);
  }
  
  // If we detected the outer left edge of the glue tab as a main line
  if (creaseX.length >= 6 && creaseX[1] - creaseX[0] < 35 && creaseX[1] - creaseX[0] < (creaseX[2] - creaseX[1]) * 0.5) {
    creaseX.shift();
  }
  
  if (creaseX.length > 5) {
    creaseX = creaseX.slice(0, 5);
  }

  const detectedCreaseXLen = creaseX.length;
  // If vertical creases couldn't be detected robustly, synthesize them based on standard box structure
  if (creaseX.length < 5) {
    const L = fallbackDims.L;
    const W = fallbackDims.W;
    const g = 15; // Glue tab
    creaseX = [g, g + L, g + L + W, g + L + W + L, g + L + W + L + W];
  }

  // Robustly detect if the glue tab is on the right side instead of the left side
  const isGlueTabOnRight = (creaseX.length === 5) && ((maxX - creaseX[3]) < creaseX[0] * 0.7);

  if (!options?.disableAutoFlip && isGlueTabOnRight) {
    // Horizontally flip local entities
    localEntities.forEach(e => {
      e.x1 = maxX - e.x1;
      if (e.type === 'LINE') {
        e.x2 = maxX - e.x2;
      }
    });
    // Flip creaseX coordinates to move the glue tab to the left
    const x0 = creaseX[0];
    const x1 = creaseX[1];
    const x2 = creaseX[2];
    const x3 = creaseX[3];
    creaseX = [maxX - x3, maxX - x2, maxX - x1, maxX - x0, maxX];
  }

  // 3. Robust topological horizontal line detection (groups by Y)
  const yGroups: { y: number, length: number }[] = [];
  entities.forEach(e => {
    if (e.type === 'LINE' && Math.abs(e.y1 - e.y2) < 2.0) {
      const midY = (e.y1 + e.y2) / 2;
      // Skip lines too close to the outer top/bottom boundaries
      if (midY < height * 0.08 || midY > height * 0.92) {
        return;
      }

      const isCreaseOrLong = !hasAnyCreases || e.isCrease || Math.abs(e.x1 - e.x2) > width * 0.3;
      if (isCreaseOrLong) {
        let found = false;
        for (const group of yGroups) {
          if (Math.abs(group.y - e.y1) < 4) {
            group.length += Math.abs(e.x1 - e.x2);
            group.y = (group.y + e.y1) / 2;
            found = true;
            break;
          }
        }
        if (!found) {
          yGroups.push({ y: e.y1, length: Math.abs(e.x1 - e.x2) });
        }
      }
    }
  });
  
  yGroups.sort((a, b) => b.length - a.length);
  
  let creaseY: number[] = [];
  if (yGroups.length >= 2) {
    const top2Y = yGroups.slice(0, 2).map(g => g.y);
    top2Y.sort((a, b) => a - b);
    creaseY = top2Y;
  }

  if (creaseY.length < 2) {
    const H = fallbackDims.H;
    const midY = height / 2;
    creaseY = [midY - H / 2, midY + H / 2];
  }

  // Determine if there is a glue tab on the left
  const hasGlueTab = creaseX[0] > 5;
  
  const isTopologicallyValid = detectedCreaseXLen >= 5 && yGroups.length >= 2;

  return {
    creaseX,
    creaseY,
    minX,
    maxX,
    minY,
    maxY,
    hasGlueTab,
    isTopologicallyValid
  };
}

/**
 * Dynamically scales/re-parameters the custom DXF template to fit any target L, W, H.
 * This is the heart of the "Custom DXF Intelligent Scaling Engine"!
 */
/**
 * Dynamically scales/re-parameters the custom DXF template to fit any target L, W, H.
 * This is the heart of the "Custom DXF Intelligent Scaling Engine"!
 */
export function scaleCustomDieline(
  template: CustomDielineTemplate,
  targetL: number,
  targetW: number,
  targetH: number
): { cuts: string[]; creases: string[]; glues?: string[]; bleeds?: string[]; perforations?: string[]; totalW: number; totalH: number; xMin: number; yMin: number; xMax: number; yMax: number; labels?: any[] } {
  const { originalDims, anchors, entities } = template;

  if (!entities || entities.length === 0) {
    // Fallback if there are no parsed entities
    const engine = STANDARD_DIELINE_ENGINES['ecma-a2020'] || STANDARD_DIELINE_ENGINES['default-rsc'];
    const result = engine({ L: targetL, W: targetW, H: targetH, glueTab: 15, tuck: 15, dustFlap: 15, x0: 0 });
    return result;
  }

  let entitiesToProcess = [...entities];
  let anchorsToProcess = { ...anchors };

  if (anchors?.topSideOrientation === 'bottom') {
    // Physically flip entities vertically so that the top lid resides at the top
    let maxYVal = -Infinity;
    entities.forEach(e => {
      if (isFinite(e.y1)) maxYVal = Math.max(maxYVal, e.y1);
      if (isFinite(e.y2)) maxYVal = Math.max(maxYVal, e.y2);
    });

    if (isFinite(maxYVal)) {
      entitiesToProcess = entities.map(e => ({
        ...e,
        y1: maxYVal - e.y1,
        y2: e.type === 'LINE' ? (maxYVal - e.y2) : e.y2
      }));
      // Re-analyze topology on flipped entities to extract standard oriented anchors
      anchorsToProcess = analyzeTopology(entitiesToProcess, originalDims);
    }
  }

  // Define scale function for each point (x, y) relative to discovered topological creases
  const scalePoint = (x: number, y: number): { x: number; y: number } => {
    // Scale X Coordinate relative to vertical panel creases, preserving 1:1 geometry near crease joints
    const cX = anchorsToProcess.creaseX;
    let newX = x;

    if (cX && cX.length >= 5) {
      const w0 = cX[0]; // glue tab
      const w1 = cX[1] - cX[0]; // Panel 0 (L)
      const w2 = cX[2] - cX[1]; // Panel 1 (W)
      const w3 = cX[3] - cX[2]; // Panel 2 (L)
      const w4 = cX[4] - cX[3]; // Panel 3 (W)

      // Target panel widths
      const t_w0 = w0; // keep glue tab constant size
      const t_w1 = targetL;
      const t_w2 = targetW;
      const t_w3 = targetL;
      const t_w4 = targetW;

      const t_cX = [
        t_w0,
        t_w0 + t_w1,
        t_w0 + t_w1 + t_w2,
        t_w0 + t_w1 + t_w2 + t_w3,
        t_w0 + t_w1 + t_w2 + t_w3 + t_w4
      ];

      // Helper to scale x within a panel [xStart, xEnd] -> [tXStart, tXEnd]
      const scalePanelX = (px: number, xStart: number, xEnd: number, tXStart: number, tXEnd: number) => {
        const origWidth = xEnd - xStart;
        const targWidth = tXEnd - tXStart;
        if (origWidth <= 0) return tXStart;

        const distLeft = px - xStart;
        const distRight = xEnd - px;
        const margin = Math.min(18, origWidth * 0.35);

        if (distLeft <= margin) {
          // Preserve exact 1:1 geometry on left corner / crease joint (e.g. 45° chamfers, slots)
          return tXStart + distLeft;
        } else if (distRight <= margin) {
          // Preserve exact 1:1 geometry on right corner / crease joint
          return tXEnd - distRight;
        } else {
          // Interpolate central span
          const r = (distLeft - margin) / Math.max(1, origWidth - 2 * margin);
          return (tXStart + margin) + r * Math.max(0, targWidth - 2 * margin);
        }
      };

      if (x <= cX[0]) {
        const ratio = w0 > 0 ? x / w0 : 1;
        newX = ratio * t_w0;
      } else if (x <= cX[1]) {
        newX = scalePanelX(x, cX[0], cX[1], t_cX[0], t_cX[1]);
      } else if (x <= cX[2]) {
        newX = scalePanelX(x, cX[1], cX[2], t_cX[1], t_cX[2]);
      } else if (x <= cX[3]) {
        newX = scalePanelX(x, cX[2], cX[3], t_cX[2], t_cX[3]);
      } else if (x <= cX[4]) {
        newX = scalePanelX(x, cX[3], cX[4], t_cX[3], t_cX[4]);
      } else {
        const offset = x - cX[4];
        newX = t_cX[4] + offset;
      }
    } else {
      // Fallback: simple aspect scaling
      const origW = anchors.maxX - anchors.minX || 100;
      const targetTotalW = targetL * 2 + targetW * 2 + 15;
      newX = (x / origW) * targetTotalW;
    }

    // Scale Y Coordinate relative to top/bottom creases with UNSTRETCHED terminal lock feature mapping
    const cY = anchorsToProcess.creaseY;
    let newY = y;

    if (cY && cY.length >= 2) {
      const hBottom = cY[0]; // Y-coord of bottom crease (defines bottom flap height)
      const hMiddle = cY[1] - cY[0]; // Middle panel height (H)
      const maxYOrig = anchorsToProcess.maxY ?? 200;
      const hTop = maxYOrig - cY[1]; // Top flap height

      const t_hMiddle = targetH;
      const origWDim = originalDims.W || 40;
      const flapScaleRatio = Math.max(0.5, Math.min(3.0, targetW / origWDim));

      const t_hBottom = Math.max(25, hBottom * flapScaleRatio);
      const t_hTop = Math.max(25, hTop * flapScaleRatio);

      const t_cY = [
        t_hBottom,
        t_hBottom + t_hMiddle
      ];

      if (y < cY[0]) {
        // Bottom Flap Zone (Lock Bottom, Crash Lock, or Snap Lock 1-2-3)
        // Terminal lock tongue/hooks sit in the outer 18-22mm of the flap.
        const lockZoneHeight = Math.min(22, hBottom * 0.45);
        const distFromBottom = y; // Since minY = 0 in shifted coords

        if (distFromBottom <= lockZoneHeight) {
          // Terminal lock feature: KEEP 1:1 UNSTRETCHED HEIGHT AND ANGLES!
          newY = distFromBottom;
        } else {
          // Main flap panel: scale smoothly between lockZoneHeight and t_hBottom
          const panelOrigSpan = hBottom - lockZoneHeight;
          const panelTargSpan = t_hBottom - lockZoneHeight;
          const ratio = panelOrigSpan > 0 ? (y - lockZoneHeight) / panelOrigSpan : 0;
          newY = lockZoneHeight + ratio * Math.max(1, panelTargSpan);
        }
      } else if (y <= cY[1]) {
        // Middle Body Zone (Height H)
        const ratio = hMiddle > 0 ? (y - cY[0]) / hMiddle : 0;
        newY = t_cY[0] + ratio * t_hMiddle;
      } else {
        // Top Flap Zone (Tuck Flap & Friction Ears)
        // Terminal tuck tab and corner arcs sit in the outer 18-22mm near maxYOrig
        const tuckZoneHeight = Math.min(22, hTop * 0.45);
        const distFromTop = maxYOrig - y;
        const targetTopEdge = t_cY[1] + t_hTop;

        if (distFromTop <= tuckZoneHeight) {
          // Terminal tuck tab: KEEP 1:1 UNSTRETCHED HEIGHT AND CORNER ARCS!
          newY = targetTopEdge - distFromTop;
        } else {
          // Main lid/flap panel: scale smoothly between t_cY[1] and targetTopEdge - tuckZoneHeight
          const panelOrigSpan = hTop - tuckZoneHeight;
          const panelTargSpan = t_hTop - tuckZoneHeight;
          const ratio = panelOrigSpan > 0 ? (y - cY[1]) / panelOrigSpan : 0;
          newY = t_cY[1] + ratio * Math.max(1, panelTargSpan);
        }
      }
    } else {
      // Fallback: simple aspect scaling
      const origH = (anchorsToProcess.maxY ?? 200) - (anchorsToProcess.minY ?? 0) || 100;
      const targetTotalH = targetH + targetW * 1.5;
      newY = (y / origH) * targetTotalH;
    }

    return { x: newX, y: newY };
  };

  // Process and scale all LINE entities
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const scaledEntities = entitiesToProcess.map(e => {
    let pt1: { x: number; y: number };
    let pt2: { x: number; y: number };

    if (e.scalingConstraint === 'fixed_geometry') {
      // 🔒 Fixed 1:1 geometry: Keep exact vector shape relative to its topological midpoint anchor
      const midX = (e.x1 + e.x2) / 2;
      const midY = (e.y1 + e.y2) / 2;
      const scaledMid = scalePoint(midX, midY);
      
      const dx1 = e.x1 - midX;
      const dy1 = e.y1 - midY;
      const dx2 = e.x2 - midX;
      const dy2 = e.y2 - midY;

      pt1 = { x: scaledMid.x + dx1, y: scaledMid.y + dy1 };
      pt2 = { x: scaledMid.x + dx2, y: scaledMid.y + dy2 };
    } else if (e.scalingConstraint === 'scale_L') {
      const scaleL = targetL / Math.max(1, originalDims.L || 100);
      const rawPt1 = scalePoint(e.x1, e.y1);
      const rawPt2 = scalePoint(e.x2, e.y2);
      pt1 = { x: rawPt1.x * scaleL, y: rawPt1.y };
      pt2 = { x: rawPt2.x * scaleL, y: rawPt2.y };
    } else if (e.scalingConstraint === 'scale_W') {
      const scaleW = targetW / Math.max(1, originalDims.W || 100);
      const rawPt1 = scalePoint(e.x1, e.y1);
      const rawPt2 = scalePoint(e.x2, e.y2);
      pt1 = { x: rawPt1.x * scaleW, y: rawPt1.y };
      pt2 = { x: rawPt2.x * scaleW, y: rawPt2.y };
    } else if (e.scalingConstraint === 'scale_H') {
      const scaleH = targetH / Math.max(1, originalDims.H || 80);
      const rawPt1 = scalePoint(e.x1, e.y1);
      const rawPt2 = scalePoint(e.x2, e.y2);
      pt1 = { x: rawPt1.x, y: rawPt1.y * scaleH };
      pt2 = { x: rawPt2.x, y: rawPt2.y * scaleH };
    } else {
      // 'auto' or default topological scaling
      pt1 = scalePoint(e.x1, e.y1);
      pt2 = scalePoint(e.x2, e.y2);
    }

    minX = Math.min(minX, pt1.x, pt2.x);
    maxX = Math.max(maxX, pt1.x, pt2.x);
    minY = Math.min(minY, pt1.y, pt2.y);
    maxY = Math.max(maxY, pt1.y, pt2.y);

    return {
      ...e,
      x1: pt1.x,
      y1: pt1.y,
      x2: pt2.x,
      y2: pt2.y
    };
  });

  // Shift scaled entities so that minX = 0, minY = 0 (always aligning bottom to grid baseline)
  const finalMinX = isFinite(minX) ? minX : 0;
  const finalMinY = isFinite(minY) ? minY : 0;

  let finalEntities = scaledEntities.map(e => ({
    ...e,
    x1: e.x1 - finalMinX,
    y1: e.y1 - finalMinY,
    x2: e.x2 - finalMinX,
    y2: e.y2 - finalMinY
  }));

  // Apply saved cumulative transforms (only if not already physically baked in the template coordinates)
  const transforms = template.transforms || (template as any).metadata?.transforms;
  if (transforms && !transforms.isBaked) {
    const { rotationAngle = 0, isFlippedH = false, isFlippedV = false } = transforms;

    // 1. Flip Horizontal
    if (isFlippedH) {
      const xs = finalEntities.flatMap(e => [e.x1, e.x2]);
      const minX_f = Math.min(...xs);
      const maxX_f = Math.max(...xs);
      finalEntities = finalEntities.map(e => ({
        ...e,
        x1: maxX_f - (e.x1 - minX_f),
        x2: maxX_f - (e.x2 - minX_f)
      }));
    }

    // 2. Flip Vertical
    if (isFlippedV) {
      const ys = finalEntities.flatMap(e => [e.y1, e.y2]);
      const minY_f = Math.min(...ys);
      const maxY_f = Math.max(...ys);
      finalEntities = finalEntities.map(e => ({
        ...e,
        y1: maxY_f - (e.y1 - minY_f),
        y2: maxY_f - (e.y2 - minY_f)
      }));
    }

    // 3. Rotate (90, 180, 270)
    if (rotationAngle !== 0) {
      const angle = (rotationAngle % 360 + 360) % 360;
      if (angle === 90 || angle === 180 || angle === 270) {
        const xs = finalEntities.flatMap(e => [e.x1, e.x2]);
        const ys = finalEntities.flatMap(e => [e.y1, e.y2]);
        const minX_f = Math.min(...xs);
        const maxX_f = Math.max(...xs);
        const minY_f = Math.min(...ys);
        const maxY_f = Math.max(...ys);
        const cx = (minX_f + maxX_f) / 2;
        const cy = (minY_f + maxY_f) / 2;

        finalEntities = finalEntities.map(e => {
          let x1New = e.x1, y1New = e.y1, x2New = e.x2, y2New = e.y2;
          if (angle === 90) {
            x1New = cx - (e.y1 - cy);
            y1New = cy + (e.x1 - cx);
            x2New = cx - (e.y2 - cy);
            y2New = cy + (e.x2 - cx);
          } else if (angle === 180) {
            x1New = cx - (e.x1 - cx);
            y1New = cy - (e.y1 - cy);
            x2New = cx - (e.x2 - cx);
            y2New = cy - (e.y2 - cy);
          } else if (angle === 270) {
            x1New = cx + (e.y1 - cy);
            y1New = cy - (e.x1 - cx);
            x2New = cx + (e.y2 - cy);
            y2New = cy - (e.x2 - cx);
          }
          return {
            ...e,
            x1: Math.round(x1New * 100) / 100,
            y1: Math.round(y1New * 100) / 100,
            x2: Math.round(x2New * 100) / 100,
            y2: Math.round(y2New * 100) / 100
          };
        });
      }
    }

    // 4. Align back to minX = 0, minY = 0
    const xs = finalEntities.flatMap(e => [e.x1, e.x2]);
    const ys = finalEntities.flatMap(e => [e.y1, e.y2]);
    const minX_f = xs.length > 0 ? Math.min(...xs) : 0;
    const minY_f = ys.length > 0 ? Math.min(...ys) : 0;
    finalEntities = finalEntities.map(e => ({
      ...e,
      x1: Math.round((e.x1 - minX_f) * 100) / 100,
      y1: Math.round((e.y1 - minY_f) * 100) / 100,
      x2: Math.round((e.x2 - minX_f) * 100) / 100,
      y2: Math.round((e.y2 - minY_f) * 100) / 100
    }));
  }

  // Recalculating totals based on final transformed bounding box
  const txs = finalEntities.flatMap(e => [e.x1, e.x2]);
  const tys = finalEntities.flatMap(e => [e.y1, e.y2]);
  const totalW = txs.length > 0 ? Math.max(...txs) : (maxX - minX);
  const totalH = tys.length > 0 ? Math.max(...tys) : (maxY - minY);

  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const bleeds: string[] = [];
  const perforations: string[] = [];

  finalEntities.forEach(e => {
    // Generate high-precision SVG lines
    const p = `M ${e.x1.toFixed(2)} ${e.y1.toFixed(2)} L ${e.x2.toFixed(2)} ${e.y2.toFixed(2)}`;
    const pt = e.partType || (e.layer?.toLowerCase().includes('glue') ? 'glue' : e.isCrease ? 'crease' : 'cut');
    
    if (pt === 'glue') {
      glues.push(p);
    } else if (pt === 'bleed') {
      bleeds.push(p);
    } else if (pt === 'perforation') {
      perforations.push(p);
    } else if (pt === 'crease' || pt === 'flap' || e.isCrease) {
      creases.push(p);
    } else {
      cuts.push(p);
    }
  });

  const labels: any[] = [];
  if (anchorsToProcess.creaseX && anchorsToProcess.creaseX.length >= 5 && anchorsToProcess.creaseY && anchorsToProcess.creaseY.length >= 2) {
    const t_w0 = anchorsToProcess.creaseX[0];
    const t_w1 = targetL;
    const t_w2 = targetW;
    const t_w3 = targetL;
    const t_w4 = targetW;
    const t_cX = [
      t_w0,
      t_w0 + t_w1,
      t_w0 + t_w1 + t_w2,
      t_w0 + t_w1 + t_w2 + t_w3,
      t_w0 + t_w1 + t_w2 + t_w3 + t_w4
    ];

    const origWDim = originalDims.W || 40;
    const flapScaleRatio = targetW / origWDim;
    const t_hBottom = anchorsToProcess.creaseY[0] * flapScaleRatio;
    const t_hMiddle = targetH;
    const t_cY = [
      t_hBottom,
      t_hBottom + t_hMiddle
    ];

    // Label L (Panel 0)
    labels.push({ x: ((t_cX[0] + t_cX[1]) / 2) - finalMinX, y: (t_cY[0] + t_hMiddle / 2) - finalMinY, text: `${Math.round(targetL)}`, lineW: t_w1 });
    // Label W (Panel 1)
    labels.push({ x: ((t_cX[1] + t_cX[2]) / 2) - finalMinX, y: (t_cY[0] + t_hMiddle / 2) - finalMinY, text: `${Math.round(targetW)}`, lineW: t_w2 });
    // Label L (Panel 2)
    labels.push({ x: ((t_cX[2] + t_cX[3]) / 2) - finalMinX, y: (t_cY[0] + t_hMiddle / 2) - finalMinY, text: `${Math.round(targetL)}`, lineW: t_w3 });
    // Label W (Panel 3)
    labels.push({ x: ((t_cX[3] + t_cX[4]) / 2) - finalMinX, y: (t_cY[0] + t_hMiddle / 2) - finalMinY, text: `${Math.round(targetW)}`, lineW: t_w4 });
    
    // Label H
    labels.push({ x: t_cX[0] + 15 - finalMinX, y: ((t_cY[0] + t_cY[1]) / 2) - finalMinY, text: `${Math.round(targetH)}`, rotate: -90, lineH: t_hMiddle });
  }

  return {
    cuts,
    creases,
    glues,
    bleeds,
    perforations,
    totalW: Math.max(100, totalW),
    totalH: Math.max(100, totalH),
    xMin: 0,
    yMin: 0,
    xMax: totalW,
    yMax: totalH,
    labels
  };
}
