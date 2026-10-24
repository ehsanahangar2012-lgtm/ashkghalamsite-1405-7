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
  const pageW = Math.max(viewW + 22, 140);
  const pageH = viewH + 40;
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
  const scaleY = geometry.yMax + 16;
  const scaleBar = '<g id="SCALE_BAR" data-scale-mm="' + formatLength(scaleLength) + '" fill="#0f172a" stroke="#0f172a" stroke-width="0.35">' +
    '<path d="M ' + format(scaleX) + ' ' + format(scaleY) + ' L ' + format(scaleX + scaleLength) + ' ' + format(scaleY) +
    ' M ' + format(scaleX) + ' ' + format(scaleY - 2) + ' L ' + format(scaleX) + ' ' + format(scaleY + 2) +
    ' M ' + format(scaleX + scaleLength) + ' ' + format(scaleY - 2) + ' L ' + format(scaleX + scaleLength) + ' ' + format(scaleY + 2) + '"/>' +
    '<text x="' + format(scaleX + scaleLength / 2) + '" y="' + format(scaleY + 6) +
    '" font-size="4" text-anchor="middle" stroke="none">' + formatLength(scaleLength) + ' mm · مقیاس ۱:۱</text></g>';

  const legendX = scaleX + scaleLength + 14;
  const legendY = scaleY;
  const legend = '<g id="LAYER_LEGEND" font-size="4" fill="#334155" stroke-width="0.6">' +
    '<path d="M ' + format(legendX) + ' ' + format(legendY) + ' L ' + format(legendX + 8) + ' ' + format(legendY) + '" stroke="#dc2626"/>' +
    '<text x="' + format(legendX + 10) + '" y="' + format(legendY + 1.5) + '" stroke="none">برش / CUT</text>' +
    '<path d="M ' + format(legendX + 35) + ' ' + format(legendY) + ' L ' + format(legendX + 43) + ' ' + format(legendY) + '" stroke="#2563eb" stroke-dasharray="2 1"/>' +
    '<text x="' + format(legendX + 45) + '" y="' + format(legendY + 1.5) + '" stroke="none">خط‌تا / CREASE</text>' +
    '<rect x="' + format(legendX + 80) + '" y="' + format(legendY - 2) + '" width="8" height="4" fill="#f59e0b" fill-opacity="0.24" stroke="#d97706" stroke-dasharray="1 0.8"/>' +
    '<text x="' + format(legendX + 90) + '" y="' + format(legendY + 1.5) + '" stroke="none">ناحیه چسب / GLUE</text>' +
    '</g>';

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + format(pageW) + 'mm" height="' + format(pageH) +
    'mm" viewBox="' + format(originX) + ' ' + format(originY) + ' ' + format(pageW) + ' ' + format(pageH) +
    '">' +
    '<g id="GLUE_ZONES" data-machine-operation="visual-only">' + glueZones + '</g>' +
    '<g id="CUT" data-machine-operation="knife">' + cuts + '</g>' +
    '<g id="CREASE" data-machine-operation="score">' + creases + '</g>' +
    labels + dimensions + scaleBar + legend + '</svg>';
};
