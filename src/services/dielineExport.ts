import type { DielineEngineResult } from './dielineMath';

export interface DielineSvgExportOptions {
  showLabels?: boolean;
  showDimensions?: boolean;
  showGlueZones?: boolean;
}

const escapeXml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const format = (value: number): string => Number(value.toFixed(4)).toString();

const formatLength = (value: number): string => {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

/**
 * Builds a millimetre-exact SVG proof with explicit manufacturing and visual-only
 * layers. Grid lines are intentionally not part of this file because they are
 * editor aids, not dieline geometry.
 *
 * The viewBox uses the same numeric scale as the mm root dimensions, so 1 SVG
 * user unit equals 1 mm. CUT and CREASE are the only machine-operation layers;
 * GLUE_ZONES is an informational overlay and must never be used as a knife path.
 */
export const buildDielineSvgExport = (
  geometry: DielineEngineResult,
  options: DielineSvgExportOptions = {},
): string => {
  const showLabels = options.showLabels ?? true;
  const showDimensions = options.showDimensions ?? true;
  const showGlueZones = options.showGlueZones ?? true;
  const viewW = Math.max(1, geometry.xMax - geometry.xMin);
  const viewH = Math.max(1, geometry.yMax - geometry.yMin);
  const pageW = Math.max(viewW + 22, 100);
  const pageH = viewH + 64;
  const originX = geometry.xMin - 8;
  const originY = geometry.yMin - 14;

  const glueZones = showGlueZones ? (geometry.glueZones || []).map(d =>
    '<path d="' + d + '" fill="#f59e0b" fill-opacity="0.24" stroke="#d97706" stroke-width="0.18" stroke-dasharray="1 0.8"/>'
  ).join('') : '';
  const cuts = geometry.cuts.map(d =>
    '<path d="' + d + '" fill="none" stroke="#dc2626" stroke-width="0.25"/>'
  ).join('');
  const creases = geometry.creases.map(d =>
    '<path d="' + d + '" fill="none" stroke="#2563eb" stroke-width="0.25" stroke-dasharray="2 1"/>'
  ).join('');
  const labels = showLabels ? geometry.labels.map(label =>
    '<text x="' + format(label.x) + '" y="' + format(label.y) + '" font-size="4" text-anchor="middle" fill="#64748b">' +
    escapeXml(label.text) + '</text>'
  ).join('') : '';

  const dimensions = showDimensions
    ? '<g id="DIMENSIONS" fill="#475569" stroke="#64748b" stroke-width="0.25">' +
      '<path d="M ' + format(geometry.xMin) + ' ' + format(geometry.yMin - 5) +
      ' L ' + format(geometry.xMax) + ' ' + format(geometry.yMin - 5) +
      ' M ' + format(geometry.xMin) + ' ' + format(geometry.yMin - 7) +
      ' L ' + format(geometry.xMin) + ' ' + format(geometry.yMin - 3) +
      ' M ' + format(geometry.xMax) + ' ' + format(geometry.yMin - 7) +
      ' L ' + format(geometry.xMax) + ' ' + format(geometry.yMin - 3) +
      ' M ' + format(geometry.xMax + 5) + ' ' + format(geometry.yMin) +
      ' L ' + format(geometry.xMax + 5) + ' ' + format(geometry.yMax) +
      ' M ' + format(geometry.xMax + 3) + ' ' + format(geometry.yMin) +
      ' L ' + format(geometry.xMax + 7) + ' ' + format(geometry.yMin) +
      ' M ' + format(geometry.xMax + 3) + ' ' + format(geometry.yMax) +
      ' L ' + format(geometry.xMax + 7) + ' ' + format(geometry.yMax) + '"/>' +
      '<text x="' + format((geometry.xMin + geometry.xMax) / 2) + '" y="' + format(geometry.yMin - 7) +
      '" font-size="4" text-anchor="middle" stroke="none">گسترده: ' + formatLength(viewW) + ' mm</text>' +
      '<text x="' + format(geometry.xMax + 6) + '" y="' + format((geometry.yMin + geometry.yMax) / 2) +
      '" font-size="4" text-anchor="middle" stroke="none" transform="rotate(90 ' +
      format(geometry.xMax + 6) + ' ' + format((geometry.yMin + geometry.yMax) / 2) + ')">' +
      formatLength(viewH) + ' mm</text></g>'
    : '';

  // A real 50 mm calibration bar when it fits; smaller blanks get a measured shorter bar.
  const scaleLength = Math.min(50, Math.max(5, viewW - 8));
  const scaleX = geometry.xMin;
  const scaleY = geometry.yMax + 14;
  const scaleBar = '<g id="SCALE_BAR" data-scale-mm="' + formatLength(scaleLength) + '" fill="#0f172a" stroke="#0f172a" stroke-width="0.35">' +
    '<path d="M ' + format(scaleX) + ' ' + format(scaleY) + ' L ' + format(scaleX + scaleLength) + ' ' + format(scaleY) +
    ' M ' + format(scaleX) + ' ' + format(scaleY - 2) + ' L ' + format(scaleX) + ' ' + format(scaleY + 2) +
    ' M ' + format(scaleX + scaleLength) + ' ' + format(scaleY - 2) + ' L ' + format(scaleX + scaleLength) + ' ' + format(scaleY + 2) + '"/>' +
    '<text x="' + format(scaleX + scaleLength / 2) + '" y="' + format(scaleY + 6) +
    '" font-size="4" text-anchor="middle" stroke="none">' + formatLength(scaleLength) + ' mm · مقیاس ۱:۱</text></g>';

  // Stack the legend under the scale bar so it also fits narrow dielines.
  const legendX = geometry.xMin;
  const legendY = scaleY + 12;
  const legend = '<g id="LAYER_LEGEND" font-size="4" fill="#334155" stroke-width="0.6">' +
    '<path d="M ' + format(legendX) + ' ' + format(legendY) + ' L ' + format(legendX + 8) + ' ' + format(legendY) + '" stroke="#dc2626"/>' +
    '<text x="' + format(legendX + 10) + '" y="' + format(legendY + 1.5) + '" stroke="none">برش / CUT</text>' +
    '<path d="M ' + format(legendX) + ' ' + format(legendY + 7) + ' L ' + format(legendX + 8) + ' ' + format(legendY + 7) + '" stroke="#2563eb" stroke-dasharray="2 1"/>' +
    '<text x="' + format(legendX + 10) + '" y="' + format(legendY + 8.5) + '" stroke="none">خط‌تا / CREASE</text>' +
    '<rect x="' + format(legendX) + '" y="' + format(legendY + 12) + '" width="8" height="4" fill="#f59e0b" fill-opacity="0.24" stroke="#d97706" stroke-dasharray="1 0.8"/>' +
    '<text x="' + format(legendX + 10) + '" y="' + format(legendY + 15) + '" stroke="none">ناحیه چسب / GLUE</text>' +
    '</g>';

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + format(pageW) + 'mm" height="' + format(pageH) +
    'mm" viewBox="' + format(originX) + ' ' + format(originY) + ' ' + format(pageW) + ' ' + format(pageH) + '">' +
    '<g id="GLUE_ZONES" data-machine-operation="visual-only">' + glueZones + '</g>' +
    '<g id="CUT" data-machine-operation="knife">' + cuts + '</g>' +
    '<g id="CREASE" data-machine-operation="score">' + creases + '</g>' +
    labels + dimensions + scaleBar + legend + '</svg>';
};

export const buildDielinePdfExport = (
  geometry: DielineEngineResult,
  options: DielineSvgExportOptions = {},
): string => {
  const showDimensions = options.showDimensions ?? true;
  const showGlueZones = options.showGlueZones ?? true;
  const mmToPt = 72 / 25.4;
  const viewW = Math.max(1, geometry.xMax - geometry.xMin);
  const viewH = Math.max(1, geometry.yMax - geometry.yMin);
  const pageWmm = Math.max(viewW + 22, 100);
  const pageHmm = viewH + 64;
  const pageW = pageWmm * mmToPt;
  const pageH = pageHmm * mmToPt;
  const originX = geometry.xMin - 8;
  const originY = geometry.yMin - 14;
  const output: string[] = [];
  const point = (x: number, y: number): [number, number] => [
    (x - originX) * mmToPt,
    pageH - (y - originY) * mmToPt,
  ];
  const pointTokens = (x: number, y: number): string => {
    const [px, py] = point(x, y);
    return format(px) + ' ' + format(py);
  };

  const pathToPdf = (path: string): string => {
    const tokens = path.match(/[MLHVZ]|[-+]?(?:\d*\.?\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
    const commands: string[] = [];
    let i = 0;
    let command = '';
    let current: [number, number] | null = null;
    let first: [number, number] | null = null;
    while (i < tokens.length) {
      if (/^[MLHVZ]$/i.test(tokens[i])) {
        command = tokens[i++].toUpperCase();
        if (command === 'Z') {
          commands.push('h');
          current = first;
          command = '';
        }
        continue;
      }
      if (!command) throw new Error('Unsupported path token in PDF export.');
      if (command === 'M' || command === 'L') {
        if (i + 1 >= tokens.length) throw new Error('Incomplete coordinate pair in PDF export.');
        const x = Number(tokens[i++]);
        const y = Number(tokens[i++]);
        if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Non-finite path coordinate in PDF export.');
        const [px, py] = point(x, y);
        if (command === 'M') {
          commands.push(format(px) + ' ' + format(py) + ' m');
          first = [x, y];
          current = [x, y];
          command = 'L';
        } else {
          commands.push(format(px) + ' ' + format(py) + ' l');
          current = [x, y];
        }
      } else if (command === 'H' || command === 'V') {
        if (!current) throw new Error('Horizontal or vertical line has no origin in PDF export.');
        const n = Number(tokens[i++]);
        if (!Number.isFinite(n)) throw new Error('Non-finite path coordinate in PDF export.');
        const x = command === 'H' ? n : current[0];
        const y = command === 'V' ? n : current[1];
        const [px, py] = point(x, y);
        commands.push(format(px) + ' ' + format(py) + ' l');
        current = [x, y];
      } else {
        throw new Error('Unsupported path command in PDF export: ' + command);
      }
    }
    return commands.join('\n');
  };

  const strokePath = (path: string, color: string, width: number, dash = '') => {
    output.push('q', color + ' RG', format(width * mmToPt) + ' w', dash || '[] 0 d',
      pathToPdf(path), 'S', 'Q');
  };
  const fillPath = (path: string) => {
    output.push('q', '1 0.68 0.12 rg', '0.85 0.43 0.04 RG',
      format(0.18 * mmToPt) + ' w', '[1 0.8] 0 d', pathToPdf(path), 'B', 'Q');
  };
  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string, width = 0.25, dash = '') => {
    output.push('q', color + ' RG', format(width * mmToPt) + ' w', dash || '[] 0 d',
      pointTokens(x1, y1) + ' m', pointTokens(x2, y2) + ' l', 'S', 'Q');
  };
  const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const drawText = (value: string, x: number, y: number, size = 8, rotation = 0) => {
    const [px, py] = point(x, y);
    const matrix = rotation === 90
      ? '0 1 -1 0 ' + format(px) + ' ' + format(py) + ' Tm'
      : '1 0 0 1 ' + format(px) + ' ' + format(py) + ' Tm';
    output.push('BT /F1 ' + format(size) + ' Tf ' + matrix + ' (' + escapePdfText(value) + ') Tj ET');
  };

  // Fill all visual-only glue overlays first so red cuts and blue scores remain crisp on top.
  if (showGlueZones) (geometry.glueZones || []).forEach(fillPath);
  geometry.cuts.forEach(path => strokePath(path, '0.86 0.08 0.12', 0.25));
  geometry.creases.forEach(path => strokePath(path, '0.08 0.24 0.82', 0.25, '[2 1] 0 d'));

  if (showDimensions) {
    drawLine(geometry.xMin, geometry.yMin - 5, geometry.xMax, geometry.yMin - 5, '0.38 0.43 0.50', 0.25);
    drawLine(geometry.xMin, geometry.yMin - 7, geometry.xMin, geometry.yMin - 3, '0.38 0.43 0.50', 0.25);
    drawLine(geometry.xMax, geometry.yMin - 7, geometry.xMax, geometry.yMin - 3, '0.38 0.43 0.50', 0.25);
    drawText('Flat width: ' + formatLength(viewW) + ' mm', (geometry.xMin + geometry.xMax) / 2 - 18, geometry.yMin - 8, 8);
    drawLine(geometry.xMax + 5, geometry.yMin, geometry.xMax + 5, geometry.yMax, '0.38 0.43 0.50', 0.25);
    drawLine(geometry.xMax + 3, geometry.yMin, geometry.xMax + 7, geometry.yMin, '0.38 0.43 0.50', 0.25);
    drawLine(geometry.xMax + 3, geometry.yMax, geometry.xMax + 7, geometry.yMax, '0.38 0.43 0.50', 0.25);
    drawText('Height: ' + formatLength(viewH) + ' mm', geometry.xMax + 8, (geometry.yMin + geometry.yMax) / 2, 8, 90);
  }

  // Calibration bar: exact 50 mm when possible, otherwise a measured shorter bar.
  const scaleLength = Math.min(50, Math.max(5, viewW - 8));
  const scaleX = geometry.xMin;
  const scaleY = geometry.yMax + 14;
  drawLine(scaleX, scaleY, scaleX + scaleLength, scaleY, '0.05 0.08 0.12', 0.35);
  drawLine(scaleX, scaleY - 2, scaleX, scaleY + 2, '0.05 0.08 0.12', 0.35);
  drawLine(scaleX + scaleLength, scaleY - 2, scaleX + scaleLength, scaleY + 2, '0.05 0.08 0.12', 0.35);
  drawText(formatLength(scaleLength) + ' mm | scale 1:1', scaleX + scaleLength / 2 - 10, scaleY + 6, 8);

  // Stack layer legend vertically below the ruler so it cannot be clipped on small cartons.
  const legendX = scaleX;
  const cutLegendY = scaleY + 12;
  const creaseLegendY = cutLegendY + 7;
  const glueLegendY = creaseLegendY + 7;
  drawLine(legendX, cutLegendY, legendX + 8, cutLegendY, '0.86 0.08 0.12', 0.5);
  drawText('CUT', legendX + 10, cutLegendY + 1.5, 8);
  drawLine(legendX, creaseLegendY, legendX + 8, creaseLegendY, '0.08 0.24 0.82', 0.5, '[2 1] 0 d');
  drawText('CREASE', legendX + 10, creaseLegendY + 1.5, 8);
  fillPath('M ' + legendX + ' ' + (glueLegendY - 2) +
    ' L ' + (legendX + 8) + ' ' + (glueLegendY - 2) +
    ' L ' + (legendX + 8) + ' ' + (glueLegendY + 2) +
    ' L ' + legendX + ' ' + (glueLegendY + 2) + ' Z');
  drawText('GLUE (visual only)', legendX + 10, glueLegendY + 1.5, 8);

  const stream = output.join('\n') + '\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + format(pageW) + ' ' + format(pageH) +
      '] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    '<< /Length ' + stream.length + ' >>\nstream\n' + stream + 'endstream',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
  });
  const xrefOffset = pdf.length;
  pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  offsets.slice(1).forEach(offset => {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
  return pdf;
};


export type DxfLineSegment = [x1: number, y1: number, x2: number, y2: number];

/** Convert an absolute SVG-like M/L/H/V/Z path to straight DXF line segments. */
export const pathToLineSegments = (path: string): DxfLineSegment[] => {
  const tokens = path.match(/[MLHVZ]|[-+]?(?:\d*\.?\d+|\d+\.?)(?:e[-+]?\d+)?/gi) || [];
  const segments: DxfLineSegment[] = [];
  let i = 0;
  let command = '';
  let current: [number, number] | null = null;
  let first: [number, number] | null = null;

  const readNumber = (): number | null => {
    if (i >= tokens.length || /^[MLHVZ]$/i.test(tokens[i])) return null;
    const value = Number(tokens[i++]);
    return Number.isFinite(value) ? value : null;
  };

  while (i < tokens.length) {
    if (/^[MLHVZ]$/i.test(tokens[i])) {
      command = tokens[i++].toUpperCase();
      if (command === 'Z') {
        if (current && first &&
          (Math.abs(current[0] - first[0]) > 1e-8 || Math.abs(current[1] - first[1]) > 1e-8)) {
          segments.push([current[0], current[1], first[0], first[1]]);
        }
        current = first;
        command = '';
        continue;
      }
    }

    if (!command) throw new Error('Unsupported or malformed path command in DXF export.');
    if (command === 'M' || command === 'L') {
      const x = readNumber();
      const y = readNumber();
      if (x === null || y === null) throw new Error('Incomplete coordinate pair in DXF export.');
      if (command === 'M') {
        current = [x, y];
        first = [x, y];
        command = 'L';
      } else {
        if (!current) throw new Error('Line has no starting point in DXF export.');
        if (Math.abs(current[0] - x) > 1e-8 || Math.abs(current[1] - y) > 1e-8) {
          segments.push([current[0], current[1], x, y]);
        }
        current = [x, y];
      }
      continue;
    }

    if (command === 'H' || command === 'V') {
      const value = readNumber();
      if (value === null || !current) throw new Error('Invalid horizontal or vertical path segment in DXF export.');
      const x = command === 'H' ? value : current[0];
      const y = command === 'V' ? value : current[1];
      if (Math.abs(current[0] - x) > 1e-8 || Math.abs(current[1] - y) > 1e-8) {
        segments.push([current[0], current[1], x, y]);
      }
      current = [x, y];
      continue;
    }

    throw new Error('Unsupported path command in DXF export: ' + command);
  }
  return segments;
};

/**
 * Writes mm-unit DXF with CUT and CREASE layers only. Visual glue zones,
 * dimensions, labels and editor grid are excluded from machine-operation data.
 */
export const buildDielineDxfExport = (geometry: DielineEngineResult): string => {
  const entities: string[] = [];
  const add = (path: string, layer: 'CUT' | 'CREASE') => {
    for (const [x1, y1, x2, y2] of pathToLineSegments(path)) {
      entities.push(
        '0\nLINE\n8\n' + layer +
        '\n10\n' + x1.toFixed(4) +
        '\n20\n' + y1.toFixed(4) +
        '\n30\n0\n11\n' + x2.toFixed(4) +
        '\n21\n' + y2.toFixed(4) +
        '\n31\n0\n'
      );
    }
  };

  geometry.cuts.forEach(path => add(path, 'CUT'));
  geometry.creases.forEach(path => add(path, 'CREASE'));
  if (!entities.length) throw new Error('Cannot export an empty dieline to DXF.');

  return '0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n' +
    '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n' +
    '0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n' +
    '0\nLAYER\n2\nCREASE\n70\n0\n62\n5\n6\nDASHED\n' +
    '0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n' +
    entities.join('') + '0\nENDSEC\n0\nEOF\n';
};
