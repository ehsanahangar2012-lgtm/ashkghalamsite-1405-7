/**
 * Dedicated parametric manual Snap-Lock / 1-2-3 bottom model.
 *
 * Extracted from the legacy shared geometry file without changing its public
 * parameter contract. It remains distinct from the factory-pre-glued Auto-Lock
 * engine. The manual bottom uses a central tongue/receiver and side catch clips;
 * the crash-lock uses reverse-fold glue tabs and complementary stepped flaps.
 */
import type { DielineEngineParams, DielineEngineResult } from '../dielineMath';

/**
 * Parametric manual snap-lock bottom.
 *
 * This is a geometry-first construction, not a claim of certified FEFCO/ECMA tooling.
 * Two opposing long-panel flaps form the locking pair: one has a tapered tongue,
 * the other a matching slot with clearance derived from board caliper. Side dust
 * flaps are shorter so they do not occupy the same locking interface.
 */
export const createSnapLockBottomEngine = () => {
  return ({
    L, W, H, glueTab = 15, thickness = 0.5, tuck, dustFlap,
    bottomFlapDepth, lockTongueDepth,
    x0 = 50, autoLockAngle = 45, autoLockGlueWidth, dimensionConvention = 'inside',
  }: DielineEngineParams): DielineEngineResult => {
    const t = Math.max(0.2, Number.isFinite(thickness) ? thickness : 0.5);
    const safeL = Math.max(20, Number.isFinite(L) ? L : 20);
    const safeW = Math.max(20, Number.isFinite(W) ? W : 20);
    const safeH = Math.max(10, Number.isFinite(H) ? H : 10);
    const inside = dimensionConvention !== 'outside';
    // Reference benchmark: 70 × 70 × 80 mm, t=0.45 mm, glue=15 mm,
    // tuck=25 mm and dust=33 mm produces a 296.8 × 226 mm flat blank.
    // Apply caliper to each crease-to-crease panel span; closure extensions are
    // modeled separately so the tongue is not mistaken for the whole top flap.
    const panelL = safeL + (inside ? t : 0);
    const panelW = safeW + (inside ? t : 0);
    const panelH = safeH;
    const G = Math.max(6, Math.min(Number.isFinite(glueTab) ? glueTab : 15, panelH * 0.8));
    // Default closure dimensions scale from the known 70 × 70 × 80 mm reference.
    // Explicit caller values still override these ratios; the preview must not pin
    // every carton size to the reference's fixed 25/33/17.5 mm flap dimensions.
    const referencePanelWidth = 70 + 0.45;
    const requestedTuckDepth = Number.isFinite(tuck) ? tuck as number : panelW * (25 / referencePanelWidth);
    const tuckDepth = Math.max(4, Math.min(requestedTuckDepth, panelW * 0.8));
    const requestedDustDepth = Number.isFinite(dustFlap) ? dustFlap as number : panelW * (33 / referencePanelWidth);
    const topDustDepth = Math.max(4, Math.min(requestedDustDepth, panelW * 0.48));
    const requestedBottomSideDepth = Number.isFinite(bottomFlapDepth)
      ? bottomFlapDepth as number
      : Number.isFinite(dustFlap) ? dustFlap as number : panelW * (33 / referencePanelWidth);
    const bottomSideDepth = Math.max(6, Math.min(panelW * 0.48, requestedBottomSideDepth));
    const angleDeg = Math.max(25, Math.min(65, Number.isFinite(autoLockAngle) ? autoLockAngle as number : 45));
    const angleRad = angleDeg * Math.PI / 180;
    // Match the reference dieline topology: side, front, side, back, then glue flap.
    // The front/back panels span L; the two side panels span W. A square carton
    // hides this order bug, so regression tests also use a rectangular footprint.
    const xs = [x0 + G, x0 + G + panelW, x0 + G + panelW + panelL,
      x0 + G + 2 * panelW + panelL, x0 + G + 2 * panelW + 2 * panelL];
    const topTuckDepth = panelW + tuckDepth;
    const topDepths = [topDustDepth, topTuckDepth, topDustDepth, 0];
    const topMax = Math.max(...topDepths);
    const yBodyTop = 40 + topMax;
    const yBodyBottom = yBodyTop + panelH;

    // A 1-2-3 base has two short side flaps, a deeper receiver flap with a
    // half-moon edge notch, and an opposing flap with an integral lock tongue.
    const lockDepth = Math.max(14, panelW * 2 / 3);
    // Tongue width and tongue projection are different manufacturing dimensions.
    const requestedTongueWidth = Number.isFinite(autoLockGlueWidth) ? autoLockGlueWidth as number : panelL * 0.34;
    const tongueWidth = Math.max(8, Math.min(requestedTongueWidth, panelL * 0.42, panelW * 0.42));
    const tongueNeck = tongueWidth * 0.72;
    const tongueProjection = Math.max(4, Math.min(
      Number.isFinite(lockTongueDepth) ? lockTongueDepth as number : panelW * (17.5 / referencePanelWidth),
      panelW * 0.35
    ));
    const tongueBaseY = yBodyBottom + bottomSideDepth;
    const tongueTipY = tongueBaseY + tongueProjection;
    const receiverY = yBodyBottom + lockDepth;
    // The receiver notch must actually accept the locking tongue. The previous
    // fixed 20%-of-panel width was narrower than the ~34%-wide tongue on the
    // 70 mm reference carton, so the nominal lock could not physically engage.
    const notchClearance = Math.max(2, t * 2);
    const notchWidth = Math.max(10, Math.min(panelL * 0.58, tongueWidth + notchClearance));
    const notchDepth = Math.max(4, Math.min(t * 5, panelW * 0.1, 7));
    const angleRise = Math.max(2, Math.min(bottomSideDepth * 0.18, panelW * 0.12, 8));
    const angleRun = Math.min(panelL * 0.2, angleRise / Math.tan(angleRad));
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];
    const line = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} L ${x2} ${y2}`;

    // Manufacturer's joint and outside right edge.
    cuts.push(`M ${x0 + 4} ${yBodyTop} L ${x0} ${yBodyTop + 4} L ${x0} ${yBodyBottom - 4} L ${x0 + 4} ${yBodyBottom}`);
    cuts.push(line(x0 + 4, yBodyTop, xs[0], yBodyTop));
    cuts.push(line(x0 + 4, yBodyBottom, xs[0], yBodyBottom));
    cuts.push(line(xs[4], yBodyTop, xs[4], yBodyBottom));
    creases.push(line(xs[0], yBodyTop, xs[0], yBodyBottom));
    for (let i = 1; i < 4; i++) creases.push(line(xs[i], yBodyTop, xs[i], yBodyBottom));

    // Top closure: front tuck, two tapered dust flaps, and an exposed rear edge.
    const tuckCenter = (xs[1] + xs[2]) / 2;
    const tuckInset = Math.min(panelL * 0.12, tuckDepth * 0.3);
    const backThumbWidth = Math.min(panelL * 0.28, 18);
    const backThumbDepth = Math.min(4, panelW * 0.06);
    const lidOuterY = yBodyTop - panelW;
    const tuckOuterY = yBodyTop - topTuckDepth;
    cuts.push(
      `M ${xs[1]} ${yBodyTop} L ${xs[1]} ${lidOuterY} L ${xs[1] + tuckInset} ${tuckOuterY} L ${xs[2] - tuckInset} ${tuckOuterY} L ${xs[2]} ${lidOuterY} L ${xs[2]} ${yBodyTop}`
    );
    // A separate slit cut locks the tuck tongue; the back panel receives its
    // own open thumb notch at the exposed top edge, matching the reference layout.
    const tuckSlitY = tuckOuterY + tuckDepth * 0.42;
    const tuckSlitWidth = Math.min(panelL * 0.26, 22);
    cuts.push(line(tuckCenter - tuckSlitWidth / 2, tuckSlitY, tuckCenter + tuckSlitWidth / 2, tuckSlitY));
    const backCenter = (xs[3] + xs[4]) / 2;
    const backThumbLeft = backCenter - backThumbWidth / 2;
    const backThumbRight = backCenter + backThumbWidth / 2;
    const backThumbArc = Array.from({ length: 5 }, (_, index) => {
      const angle = Math.PI * (index + 1) / 6;
      return [backCenter - Math.cos(angle) * backThumbWidth / 2,
        yBodyTop + Math.sin(angle) * backThumbDepth] as const;
    }).map(([x, y]) => `L ${x} ${y}`).join(' ');
    cuts.push(
      `M ${xs[3]} ${yBodyTop} L ${backThumbLeft} ${yBodyTop} ${backThumbArc} L ${backThumbRight} ${yBodyTop} L ${xs[4]} ${yBodyTop}`
    );
    // The tuck hinge belongs to the front L panel, not to the first W side panel.
    creases.push(line(xs[1], yBodyTop, xs[2], yBodyTop));
    for (const i of [0, 2]) {
      const xa = xs[i], xb = xs[i + 1], outerY = yBodyTop - topDustDepth;
      const inset = Math.min(8, topDustDepth * 0.28, panelW * 0.12);
      cuts.push(`M ${xa} ${yBodyTop} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${yBodyTop}`);
      creases.push(line(xa, yBodyTop, xb, yBodyTop));
    }
    // The preceding contour already contains both edge segments and the open
    // thumb notch. A straight line here would cut across the notch and duplicate
    // portions of the perimeter, leaving the rear/top edge geometrically wrong.

    // Bottom tongue flap. The tongue is part of the flap contour, not a
    // decorative rectangle or a separate overlapping knife path.
    const tongueCenter = (xs[1] + xs[2]) / 2;
    const tongueLeft = tongueCenter - tongueWidth / 2;
    const tongueRight = tongueCenter + tongueWidth / 2;
    const neckLeft = tongueCenter - tongueNeck / 2;
    const neckRight = tongueCenter + tongueNeck / 2;
    const tipInset = Math.max(1.5, Math.min(t * 1.5, tongueWidth * 0.1));
    cuts.push(
      `M ${xs[1]} ${yBodyBottom} L ${xs[1] + angleRun} ${tongueBaseY} L ${neckLeft} ${tongueBaseY} L ${tongueLeft} ${tongueBaseY + tongueProjection * 0.42} L ${tongueLeft + tipInset} ${tongueTipY} L ${tongueRight - tipInset} ${tongueTipY} L ${tongueRight} ${tongueBaseY + tongueProjection * 0.42} L ${neckRight} ${tongueBaseY} L ${xs[2] - angleRun} ${tongueBaseY} L ${xs[2]} ${yBodyBottom}`
    );
    creases.push(line(xs[1], yBodyBottom, xs[2], yBodyBottom));

    // The two W side-panel flaps fold in first.
    for (const i of [0, 2]) {
      const xa = xs[i], xb = xs[i + 1], outerY = yBodyBottom + bottomSideDepth;
      const inset = Math.min(7, bottomSideDepth * 0.22, panelW * 0.1);
      cuts.push(`M ${xa} ${yBodyBottom} L ${xa + inset} ${outerY} L ${xb - inset} ${outerY} L ${xb} ${yBodyBottom}`);
      creases.push(line(xa, yBodyBottom, xb, yBodyBottom));
    }

    // Receiver flap: a two-thirds-depth flap with a half-moon notch in its
    // outer edge. The notch is open to the edge; it is not a closed slot.
    const receiverLeft = xs[3], receiverRight = xs[4];
    const receiverCenter = (receiverLeft + receiverRight) / 2;
    const notchL = receiverCenter - notchWidth / 2, notchR = receiverCenter + notchWidth / 2;
    const receiverInset = Math.min(angleRun, panelL * 0.15);
    // Approximate the reference's half-moon receiver as short straight segments;
    // keeping the arc polygonal preserves compatibility with the SVG/DXF validators.
    const notchArc = Array.from({ length: 5 }, (_, index) => {
      const angle = Math.PI * (index + 1) / 6;
      return [receiverCenter - Math.cos(angle) * notchWidth / 2,
        receiverY - Math.sin(angle) * notchDepth] as const;
    }).map(([x, y]) => `L ${x} ${y}`).join(' ');
    cuts.push(
      `M ${receiverLeft} ${yBodyBottom} L ${receiverLeft + receiverInset} ${receiverY} L ${notchL} ${receiverY} ${notchArc} L ${notchR} ${receiverY} L ${receiverRight - receiverInset} ${receiverY} L ${receiverRight} ${yBodyBottom}`
    );
    creases.push(line(receiverLeft, yBodyBottom, receiverRight, yBodyBottom));

    labels.push({ x: (xs[1] + xs[2]) / 2, y: (yBodyTop + yBodyBottom) / 2, text: `بدنه L=${Math.round(safeL)}mm` });
    labels.push({ x: (xs[0] + xs[1]) / 2, y: (yBodyTop + yBodyBottom) / 2, text: `پهنا W=${Math.round(safeW)}mm` });
    labels.push({ x: tuckCenter, y: yBodyTop - topTuckDepth / 2, text: `زبانه درب ${Math.round(tuckDepth)}mm` });
    labels.push({ x: (xs[0] + xs[1]) / 2, y: yBodyTop - topDustDepth / 2, text: `گردگیر بالایی ${Math.round(topDustDepth)}mm` });
    labels.push({ x: tongueCenter, y: (yBodyBottom + tongueTipY) / 2, text: `زبانه قفل ${Math.round(tongueWidth)}mm · بیرون‌زدگی ${Math.round(tongueProjection)}mm` });
    labels.push({ x: (xs[0] + xs[1]) / 2, y: yBodyBottom + bottomSideDepth / 2, text: `فلپ کناری کف ${Math.round(bottomSideDepth)}mm` });
    labels.push({ x: receiverCenter, y: receiverY - notchDepth - 4, text: `دریچه نیم‌ماه قفل · عرض ${Math.round(notchWidth)} × عمق ${Math.round(notchDepth)}mm` });

    const xMin = x0;
    const yMin = yBodyTop - topMax;
    const yMax = Math.max(tongueTipY, receiverY);
    return {
      cuts, creases, labels, xMin, yMin, xMax: xs[4], yMax,
      totalW: xs[4] - xMin, totalH: yMax - yMin,
    };
  };
};
