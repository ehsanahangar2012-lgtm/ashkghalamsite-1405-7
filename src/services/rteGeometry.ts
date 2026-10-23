import type { DielineEngineParams, DielineEngineResult } from './dielineMath';

/**
 * Topology-based ECMA tuck-end blank.
 * Body sequence is Glue | L | W | L | W. Reverse-tuck ends attach to opposite
 * major panels. This is a parametric baseline, not a certified vendor die.
 */
export const createRteEngine = (straightTuck = false) => {
  return ({ L, W, H, glueTab = 15, tuck = 20, dustFlap, x0 = 50 }: DielineEngineParams): DielineEngineResult => {
    const l = Math.max(20, Number.isFinite(L) ? L : 20);
    const w = Math.max(12, Number.isFinite(W) ? W : 12);
    const h = Math.max(10, Number.isFinite(H) ? H : 10);
    const g = Math.max(8, Math.min(200, Number.isFinite(glueTab) ? glueTab as number : 15));
    const tongue = Math.max(8, Math.min(Number.isFinite(tuck) ? tuck as number : 20, w * 0.75));
    const dust = Math.max(8, Math.min(Number.isFinite(dustFlap) ? dustFlap as number : w * 0.45, w * 0.48));
    const xs = [x0 + g, x0 + g + l, x0 + g + l + w, x0 + g + 2 * l + w, x0 + g + 2 * l + 2 * w];
    const mainDepth = w;
    const topDepths = [mainDepth, dust, 0, dust];
    const bottomDepths = straightTuck ? [mainDepth, dust, 0, dust] : [0, dust, mainDepth, dust];
    const maxTop = Math.max(mainDepth + tongue, dust);
    const maxBottom = Math.max(mainDepth + tongue, dust);
    const yBodyTop = 35 + maxTop;
    const yBodyBottom = yBodyTop + h;
    const cuts: string[] = [];
    const creases: string[] = [];
    const labels: { x: number; y: number; text: string }[] = [];
    const notch = Math.min(4, g * 0.25);
    const line = (x1: number, y1: number, x2: number, y2: number) => 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2;

    // Glue flap perimeter and its two attachment edges.
    cuts.push('M ' + (x0 + notch) + ' ' + yBodyTop + ' L ' + x0 + ' ' + (yBodyTop + notch) + ' L ' + x0 + ' ' + (yBodyBottom - notch) + ' L ' + (x0 + notch) + ' ' + yBodyBottom);
    cuts.push(line(x0 + notch, yBodyTop, xs[0], yBodyTop));
    cuts.push(line(x0 + notch, yBodyBottom, xs[0], yBodyBottom));
    creases.push(line(xs[0], yBodyTop, xs[0], yBodyBottom));

    const addMainTuckOuterEdge = (xa: number, xb: number, hingeY: number, direction: -1 | 1) => {
      const outerY = hingeY + direction * mainDepth;
      const center = (xa + xb) / 2;
      const baseWidth = Math.min((xb - xa) * 0.66, Math.max(14, (xb - xa) * 0.42));
      const neckWidth = baseWidth * 0.68, tipWidth = baseWidth * 0.78;
      const baseL = center - baseWidth / 2, baseR = center + baseWidth / 2;
      const neckL = center - neckWidth / 2, neckR = center + neckWidth / 2;
      const tipL = center - tipWidth / 2, tipR = center + tipWidth / 2;
      const tongueY = outerY + direction * tongue;
      const shoulderY = outerY + direction * tongue * 0.55;
      cuts.push('M ' + xa + ' ' + outerY + ' L ' + baseL + ' ' + outerY + ' L ' + neckL + ' ' + shoulderY + ' L ' + tipL + ' ' + tongueY + ' L ' + tipR + ' ' + tongueY + ' L ' + neckR + ' ' + shoulderY + ' L ' + baseR + ' ' + outerY + ' L ' + xb + ' ' + outerY);
    };

    const addEnd = (edgeY: number, depths: number[], direction: -1 | 1) => {
      for (let i = 0; i < 4; i++) {
        const xa = xs[i], xb = xs[i + 1], depth = depths[i];
        if (depth <= 0) continue;
        if ((i === 0 || i === 2) && depth === mainDepth) addMainTuckOuterEdge(xa, xb, edgeY, direction);
        else cuts.push(line(xa, edgeY + direction * depth, xb, edgeY + direction * depth));
        creases.push(line(xa, edgeY, xb, edgeY));
      }
      // One shared slit per seam. Only the centre tuck tongue projects beyond the main flap edge.
      for (let seam = 1; seam <= 4; seam++) {
        const leftDepth = depths[seam - 1] || 0;
        const rightDepth = seam < 4 ? (depths[seam] || 0) : 0;
        const slotDepth = Math.max(leftDepth, rightDepth);
        if (slotDepth > 0) cuts.push(line(xs[seam], edgeY, xs[seam], edgeY + direction * slotDepth));
      }
      if (depths[0] === 0) cuts.push(line(xs[0], edgeY, xs[1], edgeY));
      if (depths[2] === 0) cuts.push(line(xs[2], edgeY, xs[3], edgeY));
    };

    addEnd(yBodyTop, topDepths, -1);
    addEnd(yBodyBottom, bottomDepths, 1);
    cuts.push(line(xs[4], yBodyTop, xs[4], yBodyBottom));
    for (let i = 1; i < 4; i++) creases.push(line(xs[i], yBodyTop, xs[i], yBodyBottom));

    const midY = (yBodyTop + yBodyBottom) / 2;
    labels.push({ x: (xs[0] + xs[1]) / 2, y: midY, text: 'پنل اصلی ' + Math.round(l) + 'mm' });
    labels.push({ x: (xs[1] + xs[2]) / 2, y: midY, text: 'پنل جانبی ' + Math.round(w) + 'mm' });
    labels.push({ x: (xs[2] + xs[3]) / 2, y: midY, text: 'پنل اصلی ' + Math.round(l) + 'mm' });
    labels.push({ x: (xs[3] + xs[4]) / 2, y: midY, text: 'پنل جانبی ' + Math.round(w) + 'mm' });
    labels.push({ x: (x0 + xs[0]) / 2, y: midY, text: 'لبه چسب ' + Math.round(g) + 'mm' });
    labels.push({ x: (xs[0] + xs[1]) / 2, y: yBodyTop - mainDepth / 2, text: 'درب بالا' });
    labels.push({ x: (xs[2] + xs[3]) / 2, y: yBodyBottom + mainDepth / 2, text: 'درب پایین' });

    const yMin = yBodyTop - maxTop, yMax = yBodyBottom + maxBottom;
    return { cuts, creases, labels, xMin: x0, yMin, xMax: xs[4], yMax, totalW: xs[4] - x0, totalH: yMax - yMin };
  };
};
