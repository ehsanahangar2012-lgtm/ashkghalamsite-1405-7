// Shared industrial CAD vector path flattener & exporters (DXF R12/2000, CFF2 Die-Plotter, PDF Bezier/Arc)

export interface Segment2D {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Flatten any SVG path string (supporting M, m, L, l, H, h, V, v, Q, C, A, Z, z)
 * into clean straight line segments in mm for DXF, CFF2, and PDF vector output.
 */
export function flattenSvgPathToSegments(pathStr: string): Segment2D[] {
  if (!pathStr || typeof pathStr !== 'string') return [];
  const tokens = pathStr.match(/[a-zA-Z]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];

  const segments: Segment2D[] = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;

  const num = () => {
    if (i < tokens.length && !isNaN(Number(tokens[i]))) {
      return Number(tokens[i++]);
    }
    return 0;
  };

  const pushSeg = (x1: number, y1: number, x2: number, y2: number) => {
    if (isFinite(x1) && isFinite(y1) && isFinite(x2) && isFinite(y2) && Math.hypot(x2 - x1, y2 - y1) > 1e-4) {
      segments.push({ x1, y1, x2, y2 });
    }
  };

  while (i < tokens.length) {
    if (isNaN(Number(tokens[i]))) {
      cmd = tokens[i++];
    }

    switch (cmd) {
      case 'M': {
        cx = num();
        cy = num();
        sx = cx;
        sy = cy;
        cmd = 'L';
        break;
      }
      case 'm': {
        cx += num();
        cy += num();
        sx = cx;
        sy = cy;
        cmd = 'l';
        break;
      }
      case 'L': {
        const nx = num();
        const ny = num();
        pushSeg(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
        break;
      }
      case 'l': {
        const nx = cx + num();
        const ny = cy + num();
        pushSeg(cx, cy, nx, ny);
        cx = nx;
        cy = ny;
        break;
      }
      case 'H': {
        const nx = num();
        pushSeg(cx, cy, nx, cy);
        cx = nx;
        break;
      }
      case 'h': {
        const nx = cx + num();
        pushSeg(cx, cy, nx, cy);
        cx = nx;
        break;
      }
      case 'V': {
        const ny = num();
        pushSeg(cx, cy, cx, ny);
        cy = ny;
        break;
      }
      case 'v': {
        const ny = cy + num();
        pushSeg(cx, cy, cx, ny);
        cy = ny;
        break;
      }
      case 'Q': {
        const qx = num();
        const qy = num();
        const nx = num();
        const ny = num();
        let px = cx;
        let py = cy;
        const steps = 14;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          const bx = u * u * cx + 2 * u * t * qx + t * t * nx;
          const by = u * u * cy + 2 * u * t * qy + t * t * ny;
          pushSeg(px, py, bx, by);
          px = bx;
          py = by;
        }
        cx = nx;
        cy = ny;
        break;
      }
      case 'C': {
        const c1x = num();
        const c1y = num();
        const c2x = num();
        const c2y = num();
        const nx = num();
        const ny = num();
        let px = cx;
        let py = cy;
        const steps = 16;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const u = 1 - t;
          const bx = u * u * u * cx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * nx;
          const by = u * u * u * cy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ny;
          pushSeg(px, py, bx, by);
          px = bx;
          py = by;
        }
        cx = nx;
        cy = ny;
        break;
      }
      case 'A': {
        let rx = Math.abs(num());
        let ry = Math.abs(num());
        const phiDeg = num();
        const largeArcFlag = num() !== 0;
        const sweepFlag = num() !== 0;
        const nx = num();
        const ny = num();

        if (rx === 0 || ry === 0 || (cx === nx && cy === ny)) {
          pushSeg(cx, cy, nx, ny);
          cx = nx;
          cy = ny;
          break;
        }

        // Endpoint-to-center parameterization per SVG 1.1 F.6.5 / F.6.6
        const phi = (phiDeg * Math.PI) / 180;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);
        const dx2 = (cx - nx) / 2;
        const dy2 = (cy - ny) / 2;
        const x1p = cosPhi * dx2 + sinPhi * dy2;
        const y1p = -sinPhi * dx2 + cosPhi * dy2;

        let rxSq = rx * rx;
        let rySq = ry * ry;
        const x1pSq = x1p * x1p;
        const y1pSq = y1p * y1p;
        const lambda = x1pSq / rxSq + y1pSq / rySq;
        if (lambda > 1) {
          const scale = Math.sqrt(lambda);
          rx *= scale;
          ry *= scale;
          rxSq = rx * rx;
          rySq = ry * ry;
        }

        const sign = largeArcFlag === sweepFlag ? -1 : 1;
        const numRad = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
        const denRad = rxSq * y1pSq + rySq * x1pSq;
        const coef = denRad === 0 ? 0 : sign * Math.sqrt(numRad / denRad);
        const cxp = coef * ((rx * y1p) / ry);
        const cyp = coef * (-(ry * x1p) / rx);

        const centerX = cosPhi * cxp - sinPhi * cyp + (cx + nx) / 2;
        const centerY = sinPhi * cxp + cosPhi * cyp + (cy + ny) / 2;

        const angleVec = (ux: number, uy: number, vx: number, vy: number) => {
          const dot = ux * vx + uy * vy;
          const len = Math.hypot(ux, uy) * Math.hypot(vx, vy);
          const ratio = len === 0 ? 1 : Math.max(-1, Math.min(1, dot / len));
          return (ux * vy - uy * vx < 0 ? -1 : 1) * Math.acos(ratio);
        };

        const theta1 = angleVec(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
        let dTheta = angleVec(
          (x1p - cxp) / rx,
          (y1p - cyp) / ry,
          (-x1p - cxp) / rx,
          (-y1p - cyp) / ry
        );

        if (!sweepFlag && dTheta > 0) dTheta -= 2 * Math.PI;
        if (sweepFlag && dTheta < 0) dTheta += 2 * Math.PI;

        const steps = Math.max(8, Math.ceil((Math.abs(dTheta) / (Math.PI * 2)) * 28));
        let px = cx;
        let py = cy;
        for (let s = 1; s <= steps; s++) {
          const ang = theta1 + (s / steps) * dTheta;
          const ex = rx * Math.cos(ang);
          const ey = ry * Math.sin(ang);
          const bx = cosPhi * ex - sinPhi * ey + centerX;
          const by = sinPhi * ex + cosPhi * ey + centerY;
          pushSeg(px, py, bx, by);
          px = bx;
          py = by;
        }
        cx = nx;
        cy = ny;
        break;
      }
      case 'Z':
      case 'z': {
        pushSeg(cx, cy, sx, sy);
        cx = sx;
        cy = sy;
        break;
      }
      default: {
        i++;
        break;
      }
    }
  }

  return segments;
}

export interface DielineExportInput {
  cuts: string[];
  creases: string[];
  glues?: string[];
  bleeds?: string[];
  perforations?: string[];
  labels?: { x: number; y: number; text: string }[];
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  totalW: number;
  totalH: number;
}

export function buildAutoCadDxfString(
  dieline: DielineExportInput,
  options: { includeDimensions?: boolean; bleedOffset?: number } = {}
): string {
  const { includeDimensions = true, bleedOffset = 4 } = options;
  const w = dieline.totalW || 200;
  const h = dieline.totalH || 200;

  // Full AutoCAD R12/2000 compatible DXF with HEADER (mm units) + LAYER table + ENTITIES
  let dxf = [
    '  0', 'SECTION',
    '  2', 'HEADER',
    '  9', '$INSUNITS',
    ' 70', '4', // 4 = Millimeters
    '  9', '$MEASUREMENT',
    ' 70', '1', // 1 = Metric
    '  9', '$EXTMIN',
    ' 10', '0.000',
    ' 20', (-h).toFixed(3),
    ' 30', '0.0',
    '  9', '$EXTMAX',
    ' 10', w.toFixed(3),
    ' 20', '0.000',
    ' 30', '0.0',
    '  0', 'ENDSEC',
    '  0', 'SECTION',
    '  2', 'TABLES',
    '  0', 'TABLE',
    '  2', 'LAYER',
    ' 70', '6',
    '  0', 'LAYER', '  2', 'CUT', ' 70', '0', ' 62', '1', '  6', 'CONTINUOUS',
    '  0', 'LAYER', '  2', 'CREASE', ' 70', '0', ' 62', '3', '  6', 'DASHED',
    '  0', 'LAYER', '  2', 'PERFORATION', ' 70', '0', ' 62', '30', '  6', 'DASHED',
    '  0', 'LAYER', '  2', 'GLUE', ' 70', '0', ' 62', '4', '  6', 'CONTINUOUS',
    '  0', 'LAYER', '  2', 'BLEED', ' 70', '0', ' 62', '6', '  6', 'DASHED',
    '  0', 'LAYER', '  2', 'DIMENSIONS', ' 70', '0', ' 62', '5', '  6', 'CONTINUOUS',
    '  0', 'ENDTAB',
    '  0', 'ENDSEC',
    '  0', 'SECTION',
    '  2', 'ENTITIES',
  ].join('\n') + '\n';

  const appendPaths = (paths: string[] | undefined, layer: string, color: number) => {
    if (!Array.isArray(paths)) return;
    paths.forEach((p) => {
      const segs = flattenSvgPathToSegments(p);
      segs.forEach((s) => {
        const x1 = s.x1 - dieline.xMin;
        const y1 = -(s.y1 - dieline.yMin);
        const x2 = s.x2 - dieline.xMin;
        const y2 = -(s.y2 - dieline.yMin);
        dxf += `  0\nLINE\n  8\n${layer}\n 62\n${color}\n 10\n${x1.toFixed(3)}\n 20\n${y1.toFixed(3)}\n 30\n0.0\n 11\n${x2.toFixed(3)}\n 21\n${y2.toFixed(3)}\n 31\n0.0\n`;
      });
    });
  };

  appendPaths(dieline.cuts, 'CUT', 1);
  appendPaths(dieline.creases, 'CREASE', 3);
  appendPaths(dieline.perforations, 'PERFORATION', 30);
  appendPaths(dieline.glues, 'GLUE', 4);

  if (dieline.bleeds && dieline.bleeds.length > 0) {
    appendPaths(dieline.bleeds, 'BLEED', 6);
  } else if (bleedOffset > 0) {
    const b = bleedOffset;
    const bx0 = -b;
    const by0 = b;
    const bx1 = w + b;
    const by1 = -(h + b);
    const rectLines = [
      [bx0, by0, bx1, by0],
      [bx1, by0, bx1, by1],
      [bx1, by1, bx0, by1],
      [bx0, by1, bx0, by0],
    ];
    rectLines.forEach(([x1, y1, x2, y2]) => {
      dxf += `  0\nLINE\n  8\nBLEED\n 62\n6\n 10\n${x1.toFixed(3)}\n 20\n${y1.toFixed(3)}\n 30\n0.0\n 11\n${x2.toFixed(3)}\n 21\n${y2.toFixed(3)}\n 31\n0.0\n`;
    });
  }

  if (includeDimensions && dieline.labels && dieline.labels.length > 0) {
    dieline.labels.forEach((lbl) => {
      if (lbl.x !== undefined && lbl.y !== undefined && lbl.text) {
        const lx = lbl.x - dieline.xMin;
        const ly = -(lbl.y - dieline.yMin);
        dxf += `  0\nTEXT\n  8\nDIMENSIONS\n 62\n5\n 10\n${lx.toFixed(3)}\n 20\n${ly.toFixed(3)}\n 30\n0.0\n 40\n4.0\n  1\n${lbl.text}\n`;
      }
    });
  }

  dxf += '  0\nENDSEC\n  0\nEOF\n';
  return dxf;
}

/**
 * Industry-standard CFF2 (Common File Format 2) for Kongsberg/Zünd plotters & laser die-makers.
 * Line Types: 1 = Cut, 2 = Crease, 3 = Perforation
 */
export function buildCff2String(dieline: DielineExportInput, jobTitle = 'ASHK_GHALAM_DIE'): string {
  const lines: string[] = [
    'BOF',
    `ORDER,${jobTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    'SCALE,1.000000,1.000000',
    `LL,0.000,0.000`,
    `UR,${dieline.totalW.toFixed(3)},${dieline.totalH.toFixed(3)}`,
    'MAIN,ALL',
  ];

  const emitLayer = (paths: string[] | undefined, penType: number, rulePt: number) => {
    if (!Array.isArray(paths)) return;
    paths.forEach((p) => {
      const segs = flattenSvgPathToSegments(p);
      segs.forEach((s) => {
        const x1 = (s.x1 - dieline.xMin).toFixed(3);
        const y1 = (dieline.yMax - s.y1).toFixed(3); // Bottom-left Cartesian origin for CFF2
        const x2 = (s.x2 - dieline.xMin).toFixed(3);
        const y2 = (dieline.yMax - s.y2).toFixed(3);
        lines.push(`L,${penType},${rulePt},0,${x1},${y1},${x2},${y2}`);
      });
    });
  };

  emitLayer(dieline.cuts, 1, 2);        // Type 1: 2pt Cut knife
  emitLayer(dieline.creases, 2, 2);     // Type 2: 2pt Creasing rule
  emitLayer(dieline.perforations, 3, 2); // Type 3: Perforation rule

  lines.push('END', 'EOF');
  return lines.join('\n') + '\n';
}
