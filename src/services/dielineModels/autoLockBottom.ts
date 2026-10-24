/**
 * Parametric Auto-Lock / crash-lock bottom model.
 *
 * Geometry reference: https://www.3dboxstudio.com/box-templates/auto-lock-bottom-box
 * Structural implementation patterns were studied in the MIT-licensed
 * pradeepsiddappa/diecutstudio model. This is an independent implementation;
 * no source file was copied verbatim. See docs/dieline-engine-research.md.
 *
 * Units are millimetres. CUT geometry and CREASE geometry are always separate.
 * The major bottom flaps retain their full panel width and have complementary
 * half-width steps. Side flaps stay broad; the glue triangles are annotations,
 * never knife paths. This is intentionally a parametric baseline, not a claim
 * of machine-calibrated FEFCO certification.
 */
import type { DielineEngineParams, DielineEngineResult } from '../dielineMath';

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(value, max));

const segment = (x1: number, y1: number, x2: number, y2: number): string =>
  'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2;

const closedTriangle = (aX: number, aY: number, bX: number, bY: number, cX: number, cY: number): string =>
  'M ' + aX + ' ' + aY + ' L ' + bX + ' ' + bY + ' L ' + cX + ' ' + cY + ' Z';

export const createAutoLockBottomEngine = () => {
  return ({
    L, W, H, glueTab = 15, tuck = 25, dustFlap = 43,
    bottomFlapDepth, thickness = 0.45,
    dimensionConvention = 'inside', autoLockAngle = 45, x0 = 50,
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 0.45);
    const safeL = Math.max(20, Number.isFinite(L) ? L : 20);
    const safeW = Math.max(20, Number.isFinite(W) ? W : 20);
    const safeH = Math.max(10, Number.isFinite(H) ? H : 10);
    const inside = dimensionConvention !== 'outside';

    // For inside dimensions, score-to-score panels gain one caliper. The wall
    // height gains three calipers for the layered crash-lock floor.
    const panelL = safeL + (inside ? t : 0);
    const panelW = safeW + (inside ? t : 0);
    const panelH = safeH + (inside ? 3 * t : 0);
    const G = clamp(Number.isFinite(glueTab) ? glueTab as number : 15, 6, Math.min(safeH * 0.8, 200));
    const tuckDepth = clamp(Number.isFinite(tuck) ? tuck as number : 25, 4, Math.min(panelW * 0.8, 60));
    const topDustDepth = clamp(Number.isFinite(dustFlap) ? dustFlap as number : 43, 4, panelW * 0.48);
    const requestedSideDepth = Number.isFinite(bottomFlapDepth) ? bottomFlapDepth as number : safeW * 0.45;
    const sideDepth = clamp(requestedSideDepth, 6, panelW * 0.48);

    // The reference design's large L-panel flaps overlap at the centre. Keep
    // the outer width of each flap; only the free edge has the locking step.
    const mainDepth = Math.max(12, Math.min(panelW * 0.75 - 3 * t, panelL * 0.9));
    const stepDepth = Math.max(4, Math.min(mainDepth * 0.2, panelW * 0.12, 12));
    const angleDeg = clamp(Number.isFinite(autoLockAngle) ? autoLockAngle as number : 45, 25, 65);
    const angleRad = angleDeg * Math.PI / 180;
    // Horizontal run makes the diagonal shoulder match the selected angle.
    // The run is capped so it cannot consume a large part of a narrow flap.
    const mainRun = Math.max(4, Math.min(panelL * 0.28, stepDepth / Math.tan(angleRad)));

    // Four body panels, left to right: W / L / W / L, after the seam.
    const xG = x0 + G;
    const xP1 = xG + panelW;
    const xP2 = xP1 + panelL;
    const xP3 = xP2 + panelW;
    const xP4 = xP3 + panelL;

    const y0 = 30;
    const yBodyTop = y0 + panelW + tuckDepth;
    const yBodyBottom = yBodyTop + panelH;
    const lidFoldY = yBodyTop - panelW;
    const tuckOuterY = lidFoldY - tuckDepth;
    const bottomMainY = yBodyBottom + mainDepth;
    const bottomSideY = yBodyBottom + sideDepth;

    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];

    // Seam perimeter and outside edge. The seam is tapered at both ends.
    cuts.push('M ' + (x0 + 3) + ' ' + yBodyTop +
      ' L ' + x0 + ' ' + (yBodyTop + 3) +
      ' L ' + x0 + ' ' + (yBodyBottom - 3) +
      ' L ' + (x0 + 3) + ' ' + yBodyBottom);
    cuts.push(segment(x0 + 3, yBodyTop, xG, yBodyTop));
    cuts.push(segment(x0 + 3, yBodyBottom, xG, yBodyBottom));
    cuts.push(segment(xP4, yBodyTop, xP4, yBodyBottom));

    // Main body panel creases.
    [xG, xP1, xP2, xP3].forEach(x => creases.push(segment(x, yBodyTop, x, yBodyBottom)));

    // Hinged lid on the front L panel, with a tapered tuck tongue.
    const tuckCenter = (xP1 + xP2) / 2;
    const tuckInset = Math.min(panelL * 0.12, tuckDepth * 0.3);
    cuts.push('M ' + xP1 + ' ' + yBodyTop +
      ' L ' + xP1 + ' ' + lidFoldY +
      ' L ' + (xP1 + tuckInset) + ' ' + tuckOuterY +
      ' L ' + (xP2 - tuckInset) + ' ' + tuckOuterY +
      ' L ' + xP2 + ' ' + lidFoldY +
      ' L ' + xP2 + ' ' + yBodyTop);
    creases.push(segment(xP1, yBodyTop, xP2, yBodyTop));
    creases.push(segment(xP1, lidFoldY, xP2, lidFoldY));

    // Dust flaps on both W panels have small, controlled shoulders.
    const dustFlapPath = (left: number, right: number, hingeY: number, depth: number): string => {
      const inset = Math.min(8, depth * 0.28, panelW * 0.12);
      const outerY = hingeY - depth;
      return 'M ' + left + ' ' + hingeY +
        ' L ' + (left + inset) + ' ' + outerY +
        ' L ' + (right - inset) + ' ' + outerY +
        ' L ' + right + ' ' + hingeY;
    };
    [[xG, xP1], [xP2, xP3]].forEach(([left, right]) => {
      cuts.push(dustFlapPath(left, right, yBodyTop, topDustDepth));
      creases.push(segment(left, yBodyTop, right, yBodyTop));
    });

    // Thumb notch on the rear L panel; the receiving slit is cut on the wall,
    // not incorrectly placed on the tuck tongue.
    const backCenter = (xP3 + xP4) / 2;
    const thumbWidth = Math.min(panelL * 0.28, 18);
    const thumbDepth = Math.min(4, panelW * 0.06);
    const thumbLeft = backCenter - thumbWidth / 2;
    const thumbRight = backCenter + thumbWidth / 2;
    const thumbArc = Array.from({ length: 5 }, (_, index) => {
      const angle = Math.PI * (index + 1) / 6;
      return ' L ' + (backCenter - Math.cos(angle) * thumbWidth / 2) +
        ' ' + (yBodyTop + Math.sin(angle) * thumbDepth);
    }).join('');
    cuts.push('M ' + xP3 + ' ' + yBodyTop +
      ' L ' + thumbLeft + ' ' + yBodyTop + thumbArc +
      ' L ' + thumbRight + ' ' + yBodyTop +
      ' L ' + xP4 + ' ' + yBodyTop);
    const tuckSlitY = yBodyTop + Math.max(3, Math.min(5, panelW * 0.06));
    const tuckSlitWidth = Math.max(4, Math.min(panelL * 0.26, 22));
    cuts.push(segment(backCenter - tuckSlitWidth / 2, tuckSlitY, backCenter + tuckSlitWidth / 2, tuckSlitY));

    // All four bottom panels share one fold axis. Internal cut paths are
    // divided at the points where each panel's side edges meet, so adjacent
    // panel cuts touch at endpoints but never duplicate the same segment.
    creases.push(segment(xG, yBodyBottom, xP4, yBodyBottom));
    const sideShoulder = Math.max(0.8, Math.min(8, panelW * 0.08, sideDepth * 0.2));
    const sideBoundaryY = bottomSideY - sideShoulder;

    const sideFlapPath = (left: number, right: number, hingeY: number, depth: number): string =>
      'M ' + left + ' ' + hingeY +
      ' L ' + left + ' ' + (hingeY + depth - sideShoulder) +
      ' L ' + (left + sideShoulder) + ' ' + (hingeY + depth) +
      ' L ' + (right - sideShoulder) + ' ' + (hingeY + depth) +
      ' L ' + right + ' ' + (hingeY + depth - sideShoulder) +
      ' L ' + right + ' ' + hingeY;

    // Broad minor-flap profiles, not triangular wedges. Their side edges reach
    // sideBoundaryY; the neighbouring major-flap profiles continue from there.
    cuts.push(sideFlapPath(xG, xP1, yBodyBottom, sideDepth));
    cuts.push(sideFlapPath(xP2, xP3, yBodyBottom, sideDepth));

    // Four small, closed triangles mark adhesive areas. These are overlays only
    // and are excluded from SVG/DXF knife geometry by the export service.
    const glueZones: string[] = [
      'M ' + (x0 + 4) + ' ' + (yBodyTop + 5) +
      ' L ' + (xG - 1) + ' ' + (yBodyTop + 5) +
      ' L ' + (xG - 1) + ' ' + (yBodyBottom - 5) +
      ' L ' + (x0 + 4) + ' ' + (yBodyBottom - 5) + ' Z',
    ];
    const glueScoreDepth = Math.max(0.8, Math.min(sideDepth * 0.18, panelW * 0.08, 8));
    const glueScoreRun = Math.max(0.8, Math.min(panelW * 0.2, glueScoreDepth / Math.tan(angleRad)));
    for (const [left, right] of [[xG, xP1], [xP2, xP3]]) {
      glueZones.push(
        closedTriangle(left + sideShoulder, bottomSideY,
          left + sideShoulder + glueScoreRun, bottomSideY - glueScoreDepth,
          left + sideShoulder + glueScoreRun, bottomSideY),
        closedTriangle(right - sideShoulder, bottomSideY,
          right - sideShoulder - glueScoreRun, bottomSideY - glueScoreDepth,
          right - sideShoulder - glueScoreRun, bottomSideY),
      );
      creases.push(segment(left + sideShoulder, bottomSideY,
        left + sideShoulder + glueScoreRun, bottomSideY - glueScoreDepth));
      creases.push(segment(right - sideShoulder, bottomSideY,
        right - sideShoulder - glueScoreRun, bottomSideY - glueScoreDepth));
    }

    // The two L-panel flaps keep their full panel width. Their outer edges use
    // complementary steps at the half-width line, preventing the old tapered,
    // triangle-like profile. The side-flap cut already owns the short vertical
    // edge from the body crease to sideBoundaryY, so these paths begin there.
    const mainFlapPath = (left: number, right: number, deepOnLeft: boolean): string => {
      const center = (left + right) / 2;
      const stepY = bottomMainY - stepDepth;
      return deepOnLeft
        ? 'M ' + left + ' ' + sideBoundaryY +
          ' L ' + left + ' ' + bottomMainY +
          ' L ' + (center - mainRun) + ' ' + bottomMainY +
          ' L ' + center + ' ' + stepY +
          ' L ' + right + ' ' + stepY +
          ' L ' + right + ' ' + sideBoundaryY
        : 'M ' + left + ' ' + sideBoundaryY +
          ' L ' + left + ' ' + stepY +
          ' L ' + center + ' ' + stepY +
          ' L ' + (center + mainRun) + ' ' + bottomMainY +
          ' L ' + right + ' ' + bottomMainY +
          ' L ' + right + ' ' + sideBoundaryY;
    };
    cuts.push(mainFlapPath(xP1, xP2, true));
    cuts.push(mainFlapPath(xP3, xP4, false));

    const yMid = (yBodyTop + yBodyBottom) / 2;
    labels.push({ x: (xG + xP1) / 2, y: yMid, text: 'پنل جانبی W=' + Math.round(safeW) + 'mm' });
    labels.push({ x: (xP1 + xP2) / 2, y: yMid, text: 'پنل جلو L=' + Math.round(safeL) + 'mm' });
    labels.push({ x: (xP2 + xP3) / 2, y: yMid, text: 'پنل جانبی W=' + Math.round(safeW) + 'mm' });
    labels.push({ x: (xP3 + xP4) / 2, y: yMid, text: 'پنل پشت L=' + Math.round(safeL) + 'mm' });
    labels.push({ x: tuckCenter, y: (tuckOuterY + lidFoldY) / 2, text: 'درب و زبانه ' + Math.round(tuckDepth) + 'mm' });
    labels.push({ x: (xG + xP1) / 2, y: yBodyTop - topDustDepth / 2, text: 'گردگیر ' + Math.round(topDustDepth) + 'mm' });
    labels.push({ x: tuckCenter, y: yBodyBottom + mainDepth * 0.48, text: 'فلپ اصلی کف با پله قفل ' + Math.round(mainDepth) + 'mm' });
    labels.push({ x: (xG + xP1) / 2, y: yBodyBottom + sideDepth * 0.55, text: 'فلپ جانبی پهن و ناحیه چسب' });

    const yMax = Math.max(bottomMainY, bottomSideY);
    return {
      cuts,
      creases,
      glueZones,
      labels,
      xMin: x0,
      yMin: y0,
      xMax: xP4,
      yMax,
      totalW: xP4 - x0,
      totalH: yMax - y0,
    };
  };
};
