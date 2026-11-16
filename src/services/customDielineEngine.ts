export interface DxfVectorEntity {
  type: 'LINE';
  start: { x: number; y: number };
  end: { x: number; y: number };
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  layer: 'CUT' | 'CREASE' | 'PERFORATION' | 'GLUE' | 'BLEED';
  partType: 'cut' | 'crease' | 'perforation' | 'glue' | 'bleed';
  isCrease: boolean;
  aciColor?: number;
  rawLayer?: string;
}

export interface CustomDielineTemplate {
  id: string;
  name: string;
  entities: DxfVectorEntity[];
  anchors?: any;
  originalDims?: { L: number; W: number; H: number };
  width?: number;
  height?: number;
}

function classifyDxfLayer(rawLayer: string, aciColor: number): {
  layer: DxfVectorEntity['layer'];
  partType: DxfVectorEntity['partType'];
  isCrease: boolean;
} {
  const l = (rawLayer || '').toLowerCase();
  if (l.includes('crease') || l.includes('fold') || l.includes('score') || l.includes('ta') || l.includes('blue') || aciColor === 3 || aciColor === 5) {
    return { layer: 'CREASE', partType: 'crease', isCrease: true };
  }
  if (l.includes('perf') || l.includes('tear') || aciColor === 30 || aciColor === 2) {
    return { layer: 'PERFORATION', partType: 'perforation', isCrease: true };
  }
  if (l.includes('glue') || l.includes('flap') || l.includes('chasb') || aciColor === 4) {
    return { layer: 'GLUE', partType: 'glue', isCrease: false };
  }
  if (l.includes('bleed') || l.includes('margin') || aciColor === 6) {
    return { layer: 'BLEED', partType: 'bleed', isCrease: false };
  }
  return { layer: 'CUT', partType: 'cut', isCrease: false };
}

function makeSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rawLayer: string,
  aciColor: number
): DxfVectorEntity | null {
  if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) return null;
  if (Math.hypot(x2 - x1, y2 - y1) < 0.05) return null;
  const cls = classifyDxfLayer(rawLayer, aciColor);
  return {
    type: 'LINE',
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    x1,
    y1,
    x2,
    y2,
    layer: cls.layer,
    partType: cls.partType,
    isCrease: cls.isCrease,
    aciColor,
    rawLayer,
  };
}

/**
 * Full ASCII DXF Parser supporting LINE, LWPOLYLINE, POLYLINE/VERTEX, ARC, and CIRCLE.
 * Converts DXF CAD Y-up coordinates to SVG Y-down coordinates and normalizes near (0,0).
 */
export const parseDxfToEntities = (dxfContent: string): DxfVectorEntity[] => {
  if (!dxfContent || typeof dxfContent !== 'string') return [];

  const rawLines = dxfContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const pairs: { code: number; value: string }[] = [];
  for (let i = 0; i + 1 < rawLines.length; i += 2) {
    const code = parseInt(rawLines[i].trim(), 10);
    const value = rawLines[i + 1].trim();
    if (!isNaN(code)) {
      pairs.push({ code, value });
    }
  }

  // Locate ENTITIES section (if absent, parse whole file cleanly)
  let startIdx = 0;
  for (let i = 0; i < pairs.length - 1; i++) {
    if (pairs[i].code === 2 && pairs[i].value.toUpperCase() === 'ENTITIES') {
      startIdx = i + 1;
      break;
    }
  }

  const entities: DxfVectorEntity[] = [];
  let i = startIdx;

  while (i < pairs.length) {
    const p = pairs[i];
    if (p.code === 0 && p.value.toUpperCase() === 'ENDSEC') break;

    if (p.code === 0) {
      const entityType = p.value.toUpperCase();
      i++;

      let layer = 'CUT';
      let aciColor = 1;
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;
      let cx = 0, cy = 0, radius = 0, startDeg = 0, endDeg = 360;
      let polyClosed = false;
      const polyPts: { x: number; y: number }[] = [];
      let curX: number | null = null;

      if (entityType === 'POLYLINE') {
        while (i < pairs.length) {
          const cp = pairs[i];
          if (cp.code === 0) {
            const sub = cp.value.toUpperCase();
            if (sub === 'SEQEND') {
              i++;
              break;
            }
            if (sub === 'VERTEX') {
              i++;
              let vx = 0, vy = 0;
              while (i < pairs.length && pairs[i].code !== 0) {
                if (pairs[i].code === 10) vx = parseFloat(pairs[i].value) || 0;
                if (pairs[i].code === 20) vy = parseFloat(pairs[i].value) || 0;
                i++;
              }
              polyPts.push({ x: vx, y: -vy });
              continue;
            }
            break;
          }
          if (cp.code === 8) layer = cp.value;
          if (cp.code === 62) aciColor = parseInt(cp.value, 10) || 1;
          if (cp.code === 70) polyClosed = (parseInt(cp.value, 10) & 1) === 1;
          i++;
        }
      } else {
        while (i < pairs.length && pairs[i].code !== 0) {
          const { code, value } = pairs[i];
          const num = parseFloat(value);
          if (code === 8) layer = value;
          else if (code === 62) aciColor = parseInt(value, 10) || 1;
          else if (code === 10) {
            if (entityType === 'LWPOLYLINE') {
              curX = isNaN(num) ? 0 : num;
            } else {
              x1 = isNaN(num) ? 0 : num;
              cx = x1;
            }
          } else if (code === 20) {
            const ny = isNaN(num) ? 0 : -num;
            if (entityType === 'LWPOLYLINE' && curX !== null) {
              polyPts.push({ x: curX, y: ny });
              curX = null;
            } else {
              y1 = ny;
              cy = ny;
            }
          } else if (code === 11) x2 = isNaN(num) ? 0 : num;
          else if (code === 21) y2 = isNaN(num) ? 0 : -num;
          else if (code === 40) radius = isNaN(num) ? 0 : Math.abs(num);
          else if (code === 50) startDeg = isNaN(num) ? 0 : num;
          else if (code === 51) endDeg = isNaN(num) ? 360 : num;
          else if (code === 70 && entityType === 'LWPOLYLINE') {
            polyClosed = (parseInt(value, 10) & 1) === 1;
          }
          i++;
        }
      }

      if (entityType === 'LINE') {
        const seg = makeSegment(x1, y1, x2, y2, layer, aciColor);
        if (seg) entities.push(seg);
      } else if ((entityType === 'LWPOLYLINE' || entityType === 'POLYLINE') && polyPts.length >= 2) {
        for (let k = 0; k < polyPts.length - 1; k++) {
          const seg = makeSegment(polyPts[k].x, polyPts[k].y, polyPts[k + 1].x, polyPts[k + 1].y, layer, aciColor);
          if (seg) entities.push(seg);
        }
        if (polyClosed && polyPts.length > 2) {
          const seg = makeSegment(
            polyPts[polyPts.length - 1].x,
            polyPts[polyPts.length - 1].y,
            polyPts[0].x,
            polyPts[0].y,
            layer,
            aciColor
          );
          if (seg) entities.push(seg);
        }
      } else if (entityType === 'CIRCLE' && radius > 0) {
        const steps = 24;
        for (let s = 0; s < steps; s++) {
          const a1 = (s / steps) * Math.PI * 2;
          const a2 = ((s + 1) / steps) * Math.PI * 2;
          const seg = makeSegment(
            cx + radius * Math.cos(a1),
            cy - radius * Math.sin(a1),
            cx + radius * Math.cos(a2),
            cy - radius * Math.sin(a2),
            layer,
            aciColor
          );
          if (seg) entities.push(seg);
        }
      } else if (entityType === 'ARC' && radius > 0) {
        let sweep = endDeg - startDeg;
        if (sweep <= 0) sweep += 360;
        const steps = Math.max(6, Math.round((sweep / 360) * 24));
        for (let s = 0; s < steps; s++) {
          const a1 = ((startDeg + (s / steps) * sweep) * Math.PI) / 180;
          const a2 = ((startDeg + ((s + 1) / steps) * sweep) * Math.PI) / 180;
          const seg = makeSegment(
            cx + radius * Math.cos(a1),
            cy - radius * Math.sin(a1),
            cx + radius * Math.cos(a2),
            cy - radius * Math.sin(a2),
            layer,
            aciColor
          );
          if (seg) entities.push(seg);
        }
      }
    } else {
      i++;
    }
  }

  if (entities.length === 0) return [];

  // Normalize coordinate frame to start at (40, 40)
  let minX = Infinity;
  let minY = Infinity;
  entities.forEach((e) => {
    minX = Math.min(minX, e.x1, e.x2);
    minY = Math.min(minY, e.y1, e.y2);
  });

  if (isFinite(minX) && isFinite(minY)) {
    const offX = 40 - minX;
    const offY = 40 - minY;
    entities.forEach((e) => {
      e.x1 = Number((e.x1 + offX).toFixed(3));
      e.y1 = Number((e.y1 + offY).toFixed(3));
      e.x2 = Number((e.x2 + offX).toFixed(3));
      e.y2 = Number((e.y2 + offY).toFixed(3));
      e.start = { x: e.x1, y: e.y1 };
      e.end = { x: e.x2, y: e.y2 };
    });
  }

  return entities;
};

function clusterSortedCoords(coords: number[], tolerance = 2.5): number[] {
  if (coords.length === 0) return [];
  const sorted = [...coords].sort((a, b) => a - b);
  const clusters: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - clusters[clusters.length - 1] > tolerance) {
      clusters.push(sorted[i]);
    }
  }
  return clusters.map((v) => Math.round(v * 100) / 100);
}

export const analyzeTopology = (entities: any[], dims?: { L: number; W: number; H: number }, _options?: any) => {
  const l = dims?.L || 150;
  const w = dims?.W || 100;
  const valid = Array.isArray(entities) ? entities : [];

  if (valid.length === 0) {
    return {
      outerBoundaryCount: 1,
      creaseX: [0, Math.round(l * 0.25), Math.round(l * 0.5), Math.round(l * 0.75), l],
      creaseY: [0, Math.round(w * 0.33), Math.round(w * 0.66), w],
      creaseLinesCount: 0,
      cutLinesCount: 0,
      hasGlueTab: true,
      bounds: { xMin: 0, yMin: 0, xMax: l, yMax: w, width: l, height: w },
    };
  }

  let xMin = Infinity, yMin = Infinity, xMax = -Infinity, yMax = -Infinity;
  const vertCreaseXs: number[] = [];
  const horizCreaseYs: number[] = [];
  let creaseLinesCount = 0;
  let cutLinesCount = 0;
  let hasGlueTab = false;

  valid.forEach((e: any) => {
    const x1 = e.x1 ?? e.start?.x ?? 0;
    const y1 = e.y1 ?? e.start?.y ?? 0;
    const x2 = e.x2 ?? e.end?.x ?? 0;
    const y2 = e.y2 ?? e.end?.y ?? 0;
    xMin = Math.min(xMin, x1, x2);
    yMin = Math.min(yMin, y1, y2);
    xMax = Math.max(xMax, x1, x2);
    yMax = Math.max(yMax, y1, y2);

    const isCrease = e.isCrease || e.layer === 'CREASE' || e.partType === 'crease';
    if (isCrease) {
      creaseLinesCount++;
      if (Math.abs(x1 - x2) < 1.5 && Math.abs(y2 - y1) > 5) vertCreaseXs.push((x1 + x2) / 2);
      if (Math.abs(y1 - y2) < 1.5 && Math.abs(x2 - x1) > 5) horizCreaseYs.push((y1 + y2) / 2);
    } else {
      cutLinesCount++;
    }
    if (e.layer === 'GLUE' || e.partType === 'glue') {
      hasGlueTab = true;
    }
  });

  const creaseX = clusterSortedCoords(vertCreaseXs);
  const creaseY = clusterSortedCoords(horizCreaseYs);

  return {
    outerBoundaryCount: 1,
    creaseX: creaseX.length > 0 ? creaseX : [xMin, (xMin + xMax) / 2, xMax],
    creaseY: creaseY.length > 0 ? creaseY : [yMin, (yMin + yMax) / 2, yMax],
    creaseLinesCount,
    cutLinesCount,
    hasGlueTab: hasGlueTab || creaseX.length >= 4,
    bounds: {
      xMin: isFinite(xMin) ? xMin : 0,
      yMin: isFinite(yMin) ? yMin : 0,
      xMax: isFinite(xMax) ? xMax : l,
      yMax: isFinite(yMax) ? yMax : w,
      width: isFinite(xMax - xMin) ? xMax - xMin : l,
      height: isFinite(yMax - yMin) ? yMax - yMin : w,
    },
  };
};

export const scaleCustomDieline = (templateOrEntities: any, l: number, w: number, h: number) => {
  const cuts: string[] = [];
  const creases: string[] = [];
  const glues: string[] = [];
  const bleeds: string[] = [];
  const perforations: string[] = [];

  const isArray = Array.isArray(templateOrEntities);
  const entities: any[] = isArray ? templateOrEntities : templateOrEntities?.entities || [];
  const origDims = !isArray ? templateOrEntities?.originalDims : undefined;

  // Compute source bounding box
  let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
  entities.forEach((ent: any) => {
    const x1 = ent.x1 ?? ent.start?.x;
    const y1 = ent.y1 ?? ent.start?.y;
    const x2 = ent.x2 ?? ent.end?.x;
    const y2 = ent.y2 ?? ent.end?.y;
    if (isFinite(x1) && isFinite(y1) && isFinite(x2) && isFinite(y2)) {
      sMinX = Math.min(sMinX, x1, x2);
      sMinY = Math.min(sMinY, y1, y2);
      sMaxX = Math.max(sMaxX, x1, x2);
      sMaxY = Math.max(sMaxY, y1, y2);
    }
  });

  const srcW = isFinite(sMaxX - sMinX) && sMaxX > sMinX ? sMaxX - sMinX : 200;
  const srcH = isFinite(sMaxY - sMinY) && sMaxY > sMinY ? sMaxY - sMinY : 150;

  let sx = 1;
  let sy = 1;
  if (origDims && origDims.L > 0 && origDims.W > 0 && origDims.H > 0) {
    sx = (2 * (l + w) + 25) / (2 * (origDims.L + origDims.W) + 25);
    sy = (h + w + 25) / (origDims.H + origDims.W + 25);
  }

  let outMinX = Infinity, outMinY = Infinity, outMaxX = -Infinity, outMaxY = -Infinity;
  const fmt = (v: number) => (Math.round(v * 100) / 100).toString();

  entities.forEach((ent: any) => {
    const rawX1 = ent.x1 ?? ent.start?.x;
    const rawY1 = ent.y1 ?? ent.start?.y;
    const rawX2 = ent.x2 ?? ent.end?.x;
    const rawY2 = ent.y2 ?? ent.end?.y;

    if (isFinite(rawX1) && isFinite(rawY1) && isFinite(rawX2) && isFinite(rawY2)) {
      const nx1 = 50 + (rawX1 - sMinX) * sx;
      const ny1 = 40 + (rawY1 - sMinY) * sy;
      const nx2 = 50 + (rawX2 - sMinX) * sx;
      const ny2 = 40 + (rawY2 - sMinY) * sy;

      outMinX = Math.min(outMinX, nx1, nx2);
      outMinY = Math.min(outMinY, ny1, ny2);
      outMaxX = Math.max(outMaxX, nx1, nx2);
      outMaxY = Math.max(outMaxY, ny1, ny2);

      const pathStr = `M ${fmt(nx1)},${fmt(ny1)} L ${fmt(nx2)},${fmt(ny2)}`;
      const layer = (ent.layer || '').toUpperCase();
      if (layer === 'CREASE' || ent.isCrease || ent.partType === 'crease') {
        creases.push(pathStr);
      } else if (layer === 'PERFORATION' || ent.partType === 'perforation') {
        perforations.push(pathStr);
      } else if (layer === 'GLUE' || ent.partType === 'glue') {
        glues.push(pathStr);
      } else if (layer === 'BLEED' || ent.partType === 'bleed') {
        bleeds.push(pathStr);
      } else {
        cuts.push(pathStr);
      }
    }
  });

  const xMin = isFinite(outMinX) ? outMinX : 50;
  const yMin = isFinite(outMinY) ? outMinY : 40;
  const xMax = isFinite(outMaxX) ? outMaxX : xMin + srcW * sx;
  const yMax = isFinite(outMaxY) ? outMaxY : yMin + srcH * sy;
  const totalW = Math.max(100, xMax - xMin);
  const totalH = Math.max(100, yMax - yMin);

  return {
    cuts,
    creases,
    glues,
    bleeds,
    perforations,
    labels: [
      {
        x: (xMin + xMax) / 2,
        y: (yMin + yMax) / 2,
        text: `قالب سفارشی (${Math.round(totalW)} × ${Math.round(totalH)} mm)`,
      },
    ],
    xMin,
    yMin,
    xMax,
    yMax,
    totalW,
    totalH,
  };
};
