import { calculateDielineParameters, getRscFlapDepths, STANDARD_DIELINE_ENGINES } from '../src/services/dielineMath.ts';
import { parseDxfToEntities, scaleCustomDieline } from '../src/services/customDielineEngine.ts';
import { validateDxfDieline, runComprehensiveGeometryCheck } from '../src/services/geometryValidator.ts';

const requiredEngines = [
  'default-rsc',
  'fefco-0200', 'fefco-0201', 'fefco-0203', 'fefco-0204', 'fefco-0215',
  'fefco-0300', 'fefco-0301', 'fefco-0320', 'fefco-0427', 'fefco-0409', 'fefco-0470', 'fefco-pizza',
  'fefco-0713', 'ecma-a2020', 'ecma-ste', 'snap-lock-123', 'ecma-a30',
  'ecma-b10', 'ecma-c1020', 'ecma-d50',
];

const dimensions = [
  { L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, x0: 40 },
  { L: 60, W: 40, H: 30, thickness: 0.45, glueTab: 15, x0: 40 },
  { L: 800, W: 500, H: 400, thickness: 4.8, glueTab: 60, x0: 40 },
];

const fail = (message: string): never => {
  throw new Error(`[dieline regression] ${message}`);
};

for (const id of requiredEngines) {
  const engine = STANDARD_DIELINE_ENGINES[id];
  if (typeof engine !== 'function') fail(`missing engine: ${id}`);

  for (const dims of dimensions) {
    const result = engine(dims);
    if (id === 'fefco-0713') {
      const x0 = dims.x0 ?? 50;
      const glue = Math.max(12, dims.glueTab || 15);
      const bodyBottomY = 30 + Math.max(15, 20) + dims.W + dims.H;
      const panelXs = [
        x0 + glue,
        x0 + glue + dims.L,
        x0 + glue + dims.L + dims.W,
        x0 + glue + 2 * dims.L + dims.W,
      ];
      const mainDepth = Math.max(12, Math.min(dims.W * 0.75, dims.L * 0.9));
      const sideDepth = Math.max(12, Math.min(dims.L * 0.35, dims.W * 0.9));
      const expectedOuterYs = [
        bodyBottomY + mainDepth,
        bodyBottomY + sideDepth,
        bodyBottomY + mainDepth,
        bodyBottomY + sideDepth,
      ];
      const bottomContours = panelXs.map((x) =>
        result.cuts.find(path => path.startsWith(`M ${x} ${bodyBottomY} L `))
      );
      if (bottomContours.some(path => !path)) {
        fail(`fefco-0713: expected four bottom-flap contours at the body crease for ${JSON.stringify(dims)}`);
      }
      bottomContours.forEach((path, index) => {
        const contour = path as string;
        const numbers = contour.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
        const vertices = (contour.match(/\bL\b/g) || []).length + 1;
        if (vertices < 4) {
          fail(`fefco-0713: bottom flap ${index + 1} is triangular; at least four contour vertices are required: ${contour}`);
        }
        if (numbers.length < 8 || numbers[3] !== expectedOuterYs[index] || numbers[5] !== expectedOuterYs[index]) {
          fail(`fefco-0713: bottom flap ${index + 1} must use its axis-specific depth; expected outer Y=${expectedOuterYs[index]}, got ${contour}`);
        }
        if ((index === 0 || index === 2) &&
            (numbers.length < 16 || numbers[7] >= expectedOuterYs[index] || numbers[9] !== numbers[7])) {
          fail(`fefco-0713: long-wall bottom flap ${index + 1} must have the stepped central edge relief from the reference outline: ${contour}`);
        }
      });
    }
    if (!Array.isArray(result.cuts) || result.cuts.length === 0) fail(`${id}: no cut paths`);
    if (!Array.isArray(result.creases) || result.creases.length === 0) fail(`${id}: no crease paths`);
    if (![result.xMin, result.yMin, result.xMax, result.yMax, result.totalW, result.totalH].every(Number.isFinite)) {
      fail(`${id}: non-finite geometry bounds for ${JSON.stringify(dims)}`);
    }
    if (result.totalW <= 0 || result.totalH <= 0 || result.xMax <= result.xMin || result.yMax <= result.yMin) {
      fail(`${id}: invalid geometry bounds for ${JSON.stringify(dims)}`);
    }

    const geometryReport = runComprehensiveGeometryCheck(
      result.cuts, result.creases, dims.L, dims.W, dims.H, id,
      dims.L * 0.18, dims.W * 0.42, result.totalW, result.totalH, 100000, 100000, dims.glueTab,
      { xMin: result.xMin, yMin: result.yMin, xMax: result.xMax, yMax: result.yMax }
    );
    if (geometryReport.errors.length > 0) {
      fail(`${id}: geometry validator errors for ${JSON.stringify(dims)}: ${geometryReport.errors.join('; ')}`);
    }
    if (!Number.isFinite(geometryReport.cutLength) || !Number.isFinite(geometryReport.creaseLength)) {
      fail(`${id}: geometry validator returned non-finite cut/crease lengths`);
    }

    for (const [kind, paths] of [['cut', result.cuts], ['crease', result.creases]] as const) {
      for (const path of paths) {
        const values = path.match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi)?.map(Number) || [];
        if (values.length < 4 || values.some(value => !Number.isFinite(value))) {
          fail(`${id}: invalid ${kind} path: ${path}`);
        }
      }
    }
  }
}


// Cross-path topology regressions: each case deliberately isolates one failure mode.
const crossCutReport = runComprehensiveGeometryCheck(
  ['M 0 0 L 10 10', 'M 0 10 L 10 0'], ['M 0 0 L 0 10'],
  10, 10, 10, 'fixture-cross-cut', 2, 2, 20, 20, 100, 100, 5,
  { xMin: 0, yMin: 0, xMax: 20, yMax: 20 },
);
if (crossCutReport.topology.cutCutCrossings < 1 || crossCutReport.passed) {
  fail('cross-path audit must reject proper crossings between separate cut paths');
}
const cutCreaseCrossReport = runComprehensiveGeometryCheck(
  ['M 0 0 L 10 0'], ['M 5 -5 L 5 5'],
  10, 10, 10, 'fixture-cut-crease-cross', 2, 2, 10, 10, 100, 100, 5,
  { xMin: 0, yMin: -5, xMax: 10, yMax: 5 },
);
if (cutCreaseCrossReport.topology.cutCreaseCrossings < 1 || cutCreaseCrossReport.passed) {
  fail('cross-path audit must reject a crease continuing through the interior of a cut segment');
}
const validScoreTermination = runComprehensiveGeometryCheck(
  ['M 0 0 L 10 0'], ['M 5 0 L 5 5'],
  10, 10, 10, 'fixture-valid-score-termination', 2, 2, 10, 5, 100, 100, 5,
  { xMin: 0, yMin: 0, xMax: 10, yMax: 5 },
);
if (!validScoreTermination.passed) {
  fail('a crease terminating at the edge of the blank must not be treated as a through-crossing');
}
const outOfBoundsReport = runComprehensiveGeometryCheck(
  ['M -1 0 L 10 0'], ['M 0 0 L 0 5'],
  10, 10, 10, 'fixture-out-of-bounds', 2, 2, 11, 5, 100, 100, 5,
  { xMin: 0, yMin: 0, xMax: 10, yMax: 5 },
);
if (outOfBoundsReport.topology.boundsViolations < 1 || outOfBoundsReport.passed) {
  fail('bounds audit must reject path segments beyond the reported dieline envelope');
}

// Regression: FEFCO 0201 flap height is W/2 (with clearance) on all four panels.
const rscDepths = getRscFlapDepths(240, 160, 0.5, 0.5, 2);
if (rscDepths.top.some(depth => depth !== 78) || rscDepths.bottom.some(depth => depth !== 78)) {
  fail(`FEFCO 0201 flaps must share the W/2 depth after clearance, got ${JSON.stringify(rscDepths)}`);
}
const rscGeometry = STANDARD_DIELINE_ENGINES['fefco-0201']({ L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, x0: 40 });
const widthPanelsMeetGeometry = STANDARD_DIELINE_ENGINES['fefco-0204']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, x0: 40,
});
if (!(widthPanelsMeetGeometry.totalH > rscGeometry.totalH)) {
  fail('FEFCO 0204 width-panel flaps should extend farther than the standard 0201 flap depth when L > W');
}

if (Math.abs(rscGeometry.totalH - (100 + 160 + 2 * 1.6 - 2.4)) > 1e-8) {
  fail(`FEFCO 0201 inside-size blank height must include board caliper and the opposing-flap slot gap, got ${rscGeometry.totalH}`);
}

// Regression: reverse-tuck panel topology, closure tongues, hinge scores, and tapered dust flaps.
const rteGeometry = STANDARD_DIELINE_ENGINES['ecma-a2020']({
  L: 240, W: 160, H: 100, thickness: 0.45, glueTab: 30, tuck: 20, dustFlap: 15, x0: 40,
});
const complexTuckContours = rteGeometry.cuts.filter(path => path.split(' L ').length >= 11);
const taperedFlapContours = rteGeometry.cuts.filter(path => path.split(' L ').length === 4);
if (Math.abs(rteGeometry.totalW - (30 + 2 * (240 + 0.45) + 2 * (160 + 0.45))) > 1e-8 ||
    Math.abs(rteGeometry.totalH - ((100 + 0.45) + 2 * ((160 + 0.45) + 20))) > 1e-8) {
  fail('ECMA reverse-tuck-end must use the correct four-panel body width and opposing closure depths');
}
if (complexTuckContours.length < 2 || taperedFlapContours.length < 4 || rteGeometry.creases.length < 10) {
  fail('ECMA reverse-tuck-end must include two notched tuck tongues, tongue hinge scores, and tapered dust-flap cuts');
}
const telescope = STANDARD_DIELINE_ENGINES['fefco-0320']({
  L: 240, W: 160, H: 100, lidHeight: 35, thickness: 1.6, glueTab: 30, slotGap: 2.4, x0: 40,
});
if (!telescope.labels.some(label => label.text.includes('قطعه ۱: زیره')) ||
    !telescope.labels.some(label => label.text.includes('قطعه ۲: درب'))) {
  fail('FEFCO 0320 must generate two separately identified half-slotted blanks');
}
const deeper0320Lid = STANDARD_DIELINE_ENGINES['fefco-0320']({
  L: 240, W: 160, H: 100, lidHeight: 65, thickness: 1.6, glueTab: 30, slotGap: 2.4, x0: 40,
});
if (JSON.stringify(telescope.cuts) === JSON.stringify(deeper0320Lid.cuts)) {
  fail('FEFCO 0320 lid wall depth must change the second blank geometry');
}
const clearance0320Lid = STANDARD_DIELINE_ENGINES['fefco-0320']({
  L: 240, W: 160, H: 100, lidHeight: 35, lidClearance: 3.2, thickness: 1.6, glueTab: 30, slotGap: 2.4, x0: 40,
});
if (JSON.stringify(telescope.cuts) === JSON.stringify(clearance0320Lid.cuts)) {
  fail('FEFCO 0320 lid plan geometry must respond to explicit clearance');
}
if (telescope.cuts.filter(path => /\bZ\s*$/.test(path)).length !== 0) {
  fail('FEFCO 0320 half-slotted blank paths should use their own separate segment contours, not a fictitious closed tray contour');
}

const trayLid = STANDARD_DIELINE_ENGINES['fefco-0301']({
  L: 240, W: 160, H: 100, lidHeight: 35, thickness: 1.6, glueTab: 30, x0: 40,
});
if (!trayLid.labels.some(label => label.text.includes('زیره')) ||
    !trayLid.labels.some(label => label.text.includes('درب')) ||
    trayLid.cuts.filter(path => /\bZ\s*$/.test(path)).length !== 2) {
  fail('FEFCO 0301 baseline must draw and identify two separate tray-shaped blanks');
}
if (Math.abs(trayLid.totalW - 787.6) > 0.11 || Math.abs(trayLid.totalH - 364.8) > 0.11) {
  fail(`FEFCO 0301 blank bounds must include both tray blanks and the layout gap, got ${trayLid.totalW} × ${trayLid.totalH}`);
}
const trayOutlineValues = (trayLid.cuts[0].match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
let trayHasDiagonalRelief = false;
for (let i = 2; i + 1 < trayOutlineValues.length; i += 2) {
  if (Math.abs(trayOutlineValues[i] - trayOutlineValues[i - 2]) > 0.01 &&
      Math.abs(trayOutlineValues[i + 1] - trayOutlineValues[i - 1]) > 0.01) trayHasDiagonalRelief = true;
}
if (!trayHasDiagonalRelief) fail('FEFCO 0301 tray baseline must bevel corner glue tabs to reduce square-corner interference');
const taller0301Lid = STANDARD_DIELINE_ENGINES['fefco-0301']({
  L: 240, W: 160, H: 100, lidHeight: 65, thickness: 1.6, glueTab: 30, x0: 40,
});
if (JSON.stringify(trayLid.cuts) === JSON.stringify(taller0301Lid.cuts)) {
  fail('FEFCO 0301 lid wall depth must update the lid blank geometry');
}
const clearance0301Lid = STANDARD_DIELINE_ENGINES['fefco-0301']({
  L: 240, W: 160, H: 100, lidHeight: 35, lidClearance: 3.2, thickness: 1.6, glueTab: 30, x0: 40,
});
if (JSON.stringify(trayLid.cuts) === JSON.stringify(clearance0301Lid.cuts)) {
  fail('FEFCO 0301 lid plan geometry must respond to explicit clearance');
}
const thick0301 = STANDARD_DIELINE_ENGINES['fefco-0301']({
  L: 240, W: 160, H: 100, lidHeight: 35, thickness: 4.8, glueTab: 30, x0: 40,
});
if (JSON.stringify(trayLid.cuts) === JSON.stringify(thick0301.cuts)) {
  fail('FEFCO 0301 inside-size panel geometry must respond to board caliper'); 
}

const drawer = STANDARD_DIELINE_ENGINES['ecma-c1020']({
  L: 180, W: 120, H: 50, thickness: 0.45, glueTab: 25, x0: 40,
});
if (!drawer.labels.some(label => label.text.includes('سینی کشویی')) ||
    !drawer.labels.some(label => label.text.includes('غلاف بیرونی'))) {
  fail('drawer box baseline must generate separately identified tray and sleeve pieces');
}
const displayStand = STANDARD_DIELINE_ENGINES['ecma-d50']({
  L: 160, W: 120, H: 90, thickness: 0.45, glueTab: 25, x0: 40,
});
if (!displayStand.labels.some(label => label.text.includes('استند سفارشی')) ||
    JSON.stringify(displayStand.cuts) === JSON.stringify(telescope.cuts)) {
  fail('custom display stand must have its own geometry and clearly disclaim ECMA verification');
}

const pizza = STANDARD_DIELINE_ENGINES['fefco-pizza']({
  L: 300, W: 300, H: 45, thickness: 1.6, glueTab: 30, x0: 40,
});
if (!pizza.cuts.length || !pizza.creases.some(path => path.includes('L'))) {
  fail('custom pizza carton must include both cut and crease geometry');
}


const crashLock30 = STANDARD_DIELINE_ENGINES['fefco-0713']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, autoLockAngle: 30, x0: 40,
});
const crashLock60 = STANDARD_DIELINE_ENGINES['fefco-0713']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, autoLockAngle: 60, x0: 40,
});
if (JSON.stringify(crashLock30.cuts) === JSON.stringify(crashLock60.cuts)) {
  fail('FEFCO 0713 baseline lock shoulders must respond to selected angle instead of a fixed 10 mm shoulder');
}

const lockBottom = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  // Use engine defaults here: the reference dimensions must emerge from ratios,
  // not from the UI passing hard-coded 25/33/17.5 mm values.
  L: 70, W: 70, H: 80, thickness: 0.45, glueTab: 15, x0: 40,
});
if (lockBottom.cuts.some(path => /\bZ\s*$/.test(path))) {
  fail('snap-lock receiver must use an edge-open half-moon notch, not an isolated rectangular slot');
}
if (!lockBottom.cuts.some(path => path.includes('M') && path.split(' L ').length >= 9) ||
    !lockBottom.labels.some(label => label.text.includes('زبانه قفل')) ||
    !lockBottom.labels.some(label => label.text.includes('نیم‌ماه'))) {
  fail('snap-lock blank must contain the integral tongue and edge-open half-moon receiver notch');
}
const tongueLabel = lockBottom.labels.find(label => label.text.includes('زبانه قفل'))?.text ?? '';
const receiverLabel = lockBottom.labels.find(label => label.text.includes('نیم‌ماه'))?.text ?? '';
const tongueWidth = Number(tongueLabel.match(/قفل\s+(\d+)/)?.[1]);
const receiverWidth = Number(receiverLabel.match(/عرض\s+(\d+)/)?.[1]);
if (!Number.isFinite(tongueWidth) || !Number.isFinite(receiverWidth) || receiverWidth <= tongueWidth) {
  fail(`snap-lock receiver opening must be wider than the locking tongue; tongue=${tongueWidth}, opening=${receiverWidth}`);
}
const referenceWidth = 15 + 4 * (70 + 0.45);
if (Math.abs(lockBottom.totalW - referenceWidth) > 1e-8) {
  fail(`snap-lock inside-size panel width must match the reference convention: expected ${referenceWidth}, got ${lockBottom.totalW}`);
}
if (Math.abs(lockBottom.totalH - 226) > 0.1) {
  fail(`snap-lock blank envelope must match the reference generator's 70×70×80 mm benchmark (296.8×226 mm), got ${lockBottom.totalW}×${lockBottom.totalH} mm`);
}
// Reference-layout regression: square boxes can hide a W/L panel-order bug.
const rectangularLock = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 90, W: 60, H: 80, thickness: 0.45, glueTab: 15, x0: 40,
});
const rectPanelL = 90 + 0.45;
const rectPanelW = 60 + 0.45;
const rectXs = [55, 55 + rectPanelW, 55 + rectPanelW + rectPanelL,
  55 + 2 * rectPanelW + rectPanelL, 55 + 2 * rectPanelW + 2 * rectPanelL];
const rectTopTuck = rectangularLock.cuts.find(path =>
  path.startsWith(`M ${rectXs[1]} ${rectangularLock.yMin + rectPanelW} L ${rectXs[1]} `)
);
if (!rectTopTuck || rectTopTuck.includes(`M ${rectXs[0]} `)) {
  fail('snap-lock front tuck flap must be attached to the first L-sized front panel after a W-sized side panel');
}
const rectTopDust = rectangularLock.cuts.filter(path =>
  path.startsWith(`M ${rectXs[0]} `) || path.startsWith(`M ${rectXs[2]} `)
);
if (rectTopDust.length < 2) {
  fail('snap-lock top dust flaps must be attached to the two W-sized side panels');
}
const rectThumbNotch = rectangularLock.cuts.find(path => path.startsWith(`M ${rectXs[3]} `));
if (!rectThumbNotch || !rectThumbNotch.includes(`L ${rectXs[4]} `)) {
  fail('snap-lock thumb notch must be on the L-sized rear panel, not a W-sized side panel');
}
const rectTongue = rectangularLock.cuts.find(path => path.startsWith(`M ${rectXs[1]} ` ) && path.includes('بیرون‌زدگی') === false);
const rectReceiver = rectangularLock.cuts.find(path => path.startsWith(`M ${rectXs[3]} ` ) && path.includes(`L ${rectXs[4]} `));
if (!rectTongue || !rectReceiver) {
  fail('snap-lock bottom tongue and receiver must be attached to the two L-sized front/back panels');
}
if (Math.abs(rectangularLock.totalW - (15 + 2 * rectPanelL + 2 * rectPanelW)) > 1e-8) {
  fail(`snap-lock rectangular body panels must follow W/L/W/L order and preserve total width; got ${rectangularLock.totalW}`);
}
if (Math.abs(rectangularLock.labels.find(label => label.text.startsWith('بدنه L='))!.x -
    (rectXs[1] + rectXs[2]) / 2) > 1e-8 ||
    Math.abs(rectangularLock.labels.find(label => label.text.startsWith('پهنا W='))!.x -
    (rectXs[0] + rectXs[1]) / 2) > 1e-8) {
  fail('snap-lock L/W labels must be placed on matching long/short body panels');
}

const dimensionFromLabel = (result: typeof lockBottom, labelPart: string, pattern: RegExp): number => {
  const text = result.labels.find(label => label.text.includes(labelPart))?.text ?? '';
  const match = text.match(pattern);
  return match ? Number(match[1]) : Number.NaN;
};
const scaledLockBottom = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 140, W: 140, H: 160, thickness: 0.45, glueTab: 20, x0: 40,
});
const scaledPanelW = 140 + 0.45;
const scaledChecks = [
  ['top dust flap', dimensionFromLabel(scaledLockBottom, 'گردگیر بالایی', /گردگیر بالایی\s+(\d+)mm/), Math.round(scaledPanelW * 33 / (70 + 0.45))],
  ['bottom side flap', dimensionFromLabel(scaledLockBottom, 'فلپ کناری کف', /فلپ کناری کف\s+(\d+)mm/), Math.round(scaledPanelW * 33 / (70 + 0.45))],
  ['top tuck extension', dimensionFromLabel(scaledLockBottom, 'زبانه درب', /زبانه درب\s+(\d+)mm/), Math.round(scaledPanelW * 25 / (70 + 0.45))],
  ['lock tongue projection', dimensionFromLabel(scaledLockBottom, 'زبانه قفل', /بیرون‌زدگی\s+(\d+)mm/), Math.round(scaledPanelW * 17.5 / (70 + 0.45))],
] as const;
for (const [part, actual, expected] of scaledChecks) {
  if (actual !== expected) fail(`snap-lock ${part} must scale with carton width; expected ${expected} mm, got ${actual} mm`);
}
if (STANDARD_DIELINE_ENGINES['snap-lock-123'] !== STANDARD_DIELINE_ENGINES['fefco-0215']) {
  fail('snap-lock-123 and the custom fefco-0215 alias must resolve to the same parametric engine');
}
const expectedTuckSlitY = lockBottom.yMin + 25 * 0.42;
if (!lockBottom.cuts.some(path => {
  const values = (path.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  return values.length === 4 && Math.abs(values[1] - expectedTuckSlitY) < 1e-8 &&
    Math.abs(values[3] - expectedTuckSlitY) < 1e-8;
})) {
  fail('snap-lock top must contain a separate locking slit inside the extended tuck flap');
}
const lowAngleLock = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 120, W: 90, H: 100, thickness: 0.45, glueTab: 22, autoLockAngle: 30, x0: 40,
});
const highAngleLock = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 120, W: 90, H: 100, thickness: 0.45, glueTab: 22, autoLockAngle: 60, x0: 40,
});
if (JSON.stringify(lowAngleLock.cuts) === JSON.stringify(highAngleLock.cuts)) {
  fail('snap-lock shoulder angles must change the generated cutting geometry');
}
const thickBoardLock = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 120, W: 90, H: 100, thickness: 2.5, glueTab: 22, x0: 40,
});
if (JSON.stringify(lockBottom.cuts) === JSON.stringify(thickBoardLock.cuts)) {
  fail('snap-lock geometry must respond to board caliper');
}
const longerLockTongue = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 70, W: 70, H: 80, thickness: 0.45, glueTab: 15, tuck: 25, dustFlap: 33, lockTongueDepth: 24, x0: 40,
});
if (JSON.stringify(lockBottom.cuts) === JSON.stringify(longerLockTongue.cuts)) {
  fail('snap-lock tongue projection must be independently adjustable');
}
const deeperSideFlaps = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 70, W: 70, H: 80, thickness: 0.45, glueTab: 15, tuck: 25, dustFlap: 33, bottomFlapDepth: 25, x0: 40,
});
if (JSON.stringify(lockBottom.cuts) === JSON.stringify(deeperSideFlaps.cuts)) {
  fail('snap-lock bottom side-flap depth must be independently adjustable');
}




// Metrics must use the selected engine geometry and consistent square-metre units.
const rscMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'FEFCO 0201');
const sleeveMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'ecma-b10');
const openTopMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'fefco-0200');
const fullFlapMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'fefco-0203');
if (!(openTopMetrics.netArea < rscMetrics.netArea && rscMetrics.netArea < fullFlapMetrics.netArea &&
      rscMetrics.netArea < calculateDielineParameters(240, 160, 100, 1.6, 'fefco-0204').netArea)) {
  fail('slotted-case blank-area estimate must reflect open-top, regular, width-panel-meeting and full-overlap constructions');
}
if (!(rscMetrics.netArea < rscMetrics.grossArea && rscMetrics.wastePercentage >= 0 && rscMetrics.wastePercentage <= 100)) {
  fail('estimated blank area must remain below the bounding sheet area and yield a bounded waste estimate');
}

if (!(rscMetrics.sheetWidth > 0 && rscMetrics.sheetHeight > 0)) {
  fail('calculated sheet dimensions must be positive');
}
if (!(rscMetrics.grossArea > 0 && rscMetrics.grossArea < 10 && rscMetrics.netArea > 0 && rscMetrics.netArea < 1)) {
  fail('areas must be reported in square metres, not mixed mm/cm units');
}
if (!(rscMetrics.cutLength > 0 && rscMetrics.creaseLength > 0)) {
  fail('cut and crease lengths must be calculated from actual paths');
}
if (rscMetrics.sheetWidth === sleeveMetrics.sheetWidth && rscMetrics.sheetHeight === sleeveMetrics.sheetHeight) {
  fail('metrics must use the requested dieline engine instead of one generic formula');
}
const ecmaDisplayMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'ECMA A20.20');
const ecmaEngineMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'ecma-a2020');
if (ecmaDisplayMetrics.sheetWidth !== ecmaEngineMetrics.sheetWidth ||
    ecmaDisplayMetrics.sheetHeight !== ecmaEngineMetrics.sheetHeight) {
  fail('human-readable ECMA A20.20 code must resolve to its specific engine');
}
const automaticGlueMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'fefco-0201');
if (automaticGlueMetrics.glueTab !== 35) fail('automatic glue-tab sizing must preserve the established 18%-of-length rule capped at 35mm');
const narrowGlueMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'fefco-0201', 15);
const wideGlueMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'fefco-0201', 60);
if (narrowGlueMetrics.glueTab !== 15 || wideGlueMetrics.glueTab !== 60 ||
    !(wideGlueMetrics.sheetWidth > narrowGlueMetrics.sheetWidth) ||
    !(wideGlueMetrics.netArea > narrowGlueMetrics.netArea)) {
  fail('selected glue-tab width must affect both generated sheet bounds and estimated blank area');
}
const thinMetrics = calculateDielineParameters(120, 90, 100, 0.45, 'snap-lock-123');
const thickMetrics = calculateDielineParameters(120, 90, 100, 2.5, 'snap-lock-123');
if (thinMetrics.cutLength === thickMetrics.cutLength && thinMetrics.sheetHeight === thickMetrics.sheetHeight) {
  fail('caliper must be passed through to geometry-derived manufacturing metrics');
}


const sampleDxf = [
  '0','SECTION','2','ENTITIES',
  '0','LINE','8','CUT','10','0','20','0','11','100','21','0',
  '0','LINE','8','CREASE','10','100','20','0','11','100','21','50',
  '0','LWPOLYLINE','8','CUT','90','4','70','1',
  '10','0','20','0','10','100','20','0','10','100','20','50','10','0','20','50',
  '0','ENDSEC','0','EOF'
].join('\n');
const parsedDxf = parseDxfToEntities(sampleDxf);
if (parsedDxf.length !== 6) fail(`DXF parser should extract six line segments, got ${parsedDxf.length}`);
if (!parsedDxf.some(entity => entity.isCrease)) fail('DXF parser must preserve crease layer classification');

// Recognized DXF $INSUNITS values are normalized to millimetres; unitless
// drawings keep their source coordinates rather than being guessed.
const inchDxf = [
  '0','SECTION','2','HEADER','9','$INSUNITS','70','1','0','ENDSEC',
  '0','SECTION','2','ENTITIES',
  '0','LINE','8','CUT','10','0','20','0','11','10','21','5',
  '0','ENDSEC','0','EOF'
].join('\n');
const inchEntities = parseDxfToEntities(inchDxf);
if (inchEntities.length !== 1 ||
    inchEntities[0].end?.x !== 254 ||
    inchEntities[0].end?.y !== 127) {
  fail(`DXF inch units should normalize to millimetres (10 x 5 in -> 254 x 127 mm), got ${JSON.stringify(inchEntities[0])}`);
}

// LWPOLYLINE group 42 is the bulge for the segment starting at that vertex.
// A unit bulge between (0,0) and (100,0) is a semicircle and must be tessellated.
const bulgedPolylineDxf = [
  '0','SECTION','2','ENTITIES',
  '0','LWPOLYLINE','8','CUT','90','2','70','0',
  '10','0','20','0','42','1',
  '10','100','20','0',
  '0','ENDSEC','0','EOF'
].join('\n');
const bulgedEntities = parseDxfToEntities(bulgedPolylineDxf);
if (bulgedEntities.length < 10 ||
    !bulgedEntities.every(entity => [entity.start?.x,entity.start?.y,entity.end?.x,entity.end?.y].every(Number.isFinite))) {
  fail(`DXF bulge should produce finite tessellated arc segments, got ${bulgedEntities.length}`);
}
if (Math.abs((bulgedEntities[0].start?.x ?? NaN) - 0) > 1e-9 ||
    Math.abs((bulgedEntities[bulgedEntities.length - 1].end?.x ?? NaN) - 100) > 1e-9) {
  fail('DXF bulge tessellation must preserve the source segment endpoints');
}

// A block INSERT applies its insertion point, uniform scale, and rotation to
// local block geometry. This fixture should map a 10-unit horizontal edge to
// a 20-unit vertical edge at (100,200).
const insertedBlockDxf = [
  '0','SECTION','2','BLOCKS',
  '0','BLOCK','8','0','2','TEST_BLOCK','70','0','10','0','20','0',
  '0','LINE','8','0','10','0','20','0','11','10','21','0',
  '0','ENDBLK','8','0',
  '0','ENDSEC',
  '0','SECTION','2','ENTITIES',
  '0','INSERT','8','CUT','2','TEST_BLOCK','10','100','20','200','41','2','42','2','50','90',
  '0','ENDSEC','0','EOF'
].join('\n');
const insertedBlockEntities = parseDxfToEntities(insertedBlockDxf);
if (insertedBlockEntities.length !== 1) {
  fail(`DXF INSERT should expand one block edge, got ${insertedBlockEntities.length}`);
}
const inserted = insertedBlockEntities[0];
if (Math.abs((inserted.start?.x ?? NaN) - 100) > 1e-8 ||
    Math.abs((inserted.start?.y ?? NaN) - 200) > 1e-8 ||
    Math.abs((inserted.end?.x ?? NaN) - 100) > 1e-8 ||
    Math.abs((inserted.end?.y ?? NaN) - 220) > 1e-8) {
  fail(`DXF INSERT transform incorrect: ${JSON.stringify(inserted)}`);
}

// A quadratic rational B-spline with clamped knots should be tessellated into
// finite line segments and preserve its curve bounds.
const splineDxf = [
  '0','SECTION','2','ENTITIES',
  '0','SPLINE','8','CUT','70','0','71','2','72','6','73','3','74','0',
  '40','0','40','0','40','0','40','1','40','1','40','1',
  '10','0','20','0','10','50','20','100','10','100','20','0',
  '0','ENDSEC','0','EOF'
].join('\n');
const splineEntities = parseDxfToEntities(splineDxf);
if (splineEntities.length < 16 ||
    !splineEntities.every(entity => [entity.start?.x,entity.start?.y,entity.end?.x,entity.end?.y].every(Number.isFinite))) {
  fail(`DXF SPLINE should yield finite tessellated segments, got ${splineEntities.length}`);
}
const splineMaxY = Math.max(...splineEntities.flatMap(entity => [entity.start?.y ?? -Infinity, entity.end?.y ?? -Infinity]));
if (splineMaxY < 45 || splineMaxY > 55) {
  fail(`DXF quadratic SPLINE bounds incorrect; expected peak near 50, got ${splineMaxY}`);
}

// Legacy POLYLINE closure is encoded in header group 70; it must produce
// the missing final edge exactly once, even if the last vertex repeats the first.
const closedLegacyPolyline = [
  '0','SECTION','2','ENTITIES',
  '0','POLYLINE','8','CUT','66','1','70','1',
  '0','VERTEX','8','CUT','10','0','20','0',
  '0','VERTEX','8','CUT','10','100','20','0',
  '0','VERTEX','8','CUT','10','100','20','50',
  '0','SEQEND',
  '0','ENDSEC','0','EOF'
].join('\n');
const closedLegacyEntities = parseDxfToEntities(closedLegacyPolyline);
if (closedLegacyEntities.length !== 3) {
  fail(`closed legacy DXF POLYLINE should yield three edges, got ${closedLegacyEntities.length}`);
}
const explicitlyClosedLegacyPolyline = [
  '0','SECTION','2','ENTITIES',
  '0','POLYLINE','8','CUT','66','1','70','1',
  '0','VERTEX','8','CUT','10','0','20','0',
  '0','VERTEX','8','CUT','10','100','20','0',
  '0','VERTEX','8','CUT','10','100','20','50',
  '0','VERTEX','8','CUT','10','0','20','0',
  '0','SEQEND',
  '0','ENDSEC','0','EOF'
].join('\n');
const explicitClosedEntities = parseDxfToEntities(explicitlyClosedLegacyPolyline);
if (explicitClosedEntities.length !== 3) {
  fail(`legacy DXF POLYLINE with repeated first vertex must not duplicate closure, got ${explicitClosedEntities.length}`);
}
const parsedValidation = validateDxfDieline(parsedDxf);
if (!parsedValidation.valid || parsedValidation.totalLength <= 0 || parsedValidation.totalLength === 1250) {
  fail('DXF validation must calculate real lengths from parsed coordinates');
}
const scaledImported = scaleCustomDieline(parsedDxf, 100, 50, 50);
if (scaledImported.cuts.length !== 5 || scaledImported.creases.length !== 1 || scaledImported.totalW !== 100 || scaledImported.totalH !== 50) {
  fail('imported DXF must produce cut/crease paths and real source bounds');
}
const badGeometry = runComprehensiveGeometryCheck(
  ['M 0 0 L 100 100 L 0 100 L 100 0 Z'],
  ['M 0 50 L 100 50'],
  100, 100, 50, 'test', 20, 10, 100, 100, 1000, 1000, 20
);
if (!badGeometry.hasSelfIntersection) fail('geometry validator must detect non-adjacent cut path crossings');
const emptyValidation = validateDxfDieline([]);
if (emptyValidation.valid || emptyValidation.errors.length === 0) fail('empty DXF geometry must fail validation');

// The self-intersection audit must detect open-path first/last crossings,
// non-adjacent endpoint-on-segment contacts, and collinear overlap, without
// flagging ordinary adjacent corners on a closed carton perimeter.
const geometryAudit = (path: string) => runComprehensiveGeometryCheck(
  [path], ['M 0 15 L 30 15'], 30, 20, 10, 'geometry-regression',
  10, 5, 30, 30, 100, 100, 15
);
const validRectangleAudit = geometryAudit('M 0 0 L 30 0 L 30 30 L 0 30 Z');
if (validRectangleAudit.hasSelfIntersection || !validRectangleAudit.passed) {
  fail('valid closed rectangle must pass without flagging its adjacent corners');
}
const assertIntersectionFailsAudit = (report: ReturnType<typeof geometryAudit>, scenario: string) => {
  if (!report.hasSelfIntersection || report.passed || report.errors.length === 0) {
    fail(`${scenario}: detected path intersection must make the structural audit fail`);
  }
};
const openFirstLastCrossingAudit = geometryAudit('M 0 0 L 20 20 L 0 20 L 20 0');
assertIntersectionFailsAudit(openFirstLastCrossingAudit, 'open path first/last segment crossing');
const endpointTouchAudit = geometryAudit('M 0 0 L 20 0 L 20 20 L 10 0 L 0 20');
assertIntersectionFailsAudit(endpointTouchAudit, 'non-adjacent endpoint-on-segment contact');
const collinearOverlapAudit = geometryAudit('M 0 0 L 20 0 L 20 20 L 5 0 L 15 0');
assertIntersectionFailsAudit(collinearOverlapAudit, 'non-adjacent collinear overlap');


// All registered IDs, including compatibility aliases, must remain callable.
// The registry currently has 21 keys; some intentionally share an implementation.
for (const id of Object.keys(STANDARD_DIELINE_ENGINES)) {
  const engine = STANDARD_DIELINE_ENGINES[id];
  if (typeof engine !== 'function') fail(`registered ID has no engine: ${id}`);
  for (const dims of dimensions) {
    const result = engine(dims);
    if (![result.xMin, result.yMin, result.xMax, result.yMax, result.totalW, result.totalH].every(Number.isFinite)) {
      fail(`${id}: non-finite bounds from registry sweep`);
    }
    if (result.totalW <= 0 || result.totalH <= 0) fail(`${id}: non-positive bounds from registry sweep`);
  }
}
// Every production-preview engine output must pass the same structural audit used to gate SVG/DXF export.
for (const id of requiredEngines) {
  const engine = STANDARD_DIELINE_ENGINES[id];
  for (const dims of dimensions) {
    const result = engine(dims);
    const audit = runComprehensiveGeometryCheck(
      result.cuts, result.creases, dims.L, dims.W, dims.H, id,
      20, 15, result.totalW, result.totalH,
      result.totalW + 1, result.totalH + 1, dims.glueTab
    );
    if (!audit.passed || audit.hasSelfIntersection) {
      fail(`${id}: engine output fails the export structural audit for ${JSON.stringify(dims)}: ${[...audit.errors, ...audit.warnings.filter(w => /تقاطع|تماس|هم‌پوشانی/.test(w))].join('; ')}`);
    }
  }
}

// FEFCO 0201 bounds must follow its four-panel strip and opposing half-depth flaps.
const rscThin = STANDARD_DIELINE_ENGINES['fefco-0201']({ L: 240, W: 160, H: 100, thickness: 0.45, glueTab: 35, x0: 0 });
const rscThick = STANDARD_DIELINE_ENGINES['fefco-0201']({ L: 240, W: 160, H: 100, thickness: 4.8, glueTab: 35, x0: 0 });
const expectedRscWidth = 35 + 2 * 240 + 2 * 160 + 4 * 0.45;
const expectedRscHeightThin = 100 + 160 + 2 * 0.45 - Math.max(1, Math.min(6, 0.45 * 1.5));
if (Math.abs(rscThin.totalW - expectedRscWidth) > 1e-8) {
  fail(`FEFCO 0201 strip width incorrect: expected ${expectedRscWidth}, got ${rscThin.totalW}`);
}
if (Math.abs(rscThin.totalH - expectedRscHeightThin) > 1e-8) {
  fail(`FEFCO 0201 half-flap bounds incorrect: expected ${expectedRscHeightThin}, got ${rscThin.totalH}`);
}
if (!(rscThick.totalH > rscThin.totalH)) {
  fail('FEFCO 0201 blank height should increase with board caliper when input dimensions are inside dimensions');
}

const rscOutside = STANDARD_DIELINE_ENGINES['fefco-0201']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, slotGap: 2.4,
  dimensionConvention: 'outside', x0: 40,
});
const rscInside = STANDARD_DIELINE_ENGINES['fefco-0201']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, slotGap: 2.4,
  dimensionConvention: 'inside', x0: 40,
});
if (Math.abs((rscInside.totalW - rscOutside.totalW) - 4 * 1.6) > 1e-8 ||
    Math.abs((rscInside.totalH - rscOutside.totalH) - 2 * 1.6) > 1e-8) {
  fail('FEFCO 0201 inside/outside conventions must produce predictable caliper compensation');
}
const rscLargeGap = STANDARD_DIELINE_ENGINES['fefco-0201']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, slotGap: 6, x0: 40,
});
if (Math.abs((rscInside.totalH - rscLargeGap.totalH) - (6 - 2.4)) > 1e-8) {
  fail('FEFCO 0201 slot-gap adjustment must change the overall blank height predictably');
}

// On the slotted case baseline, glue-tab corner relief is the only diagonal cut;
// flap edges and shared slots must be orthogonal and each exact cut segment unique.
const extractSimpleSegments = (path: string) => {
  const points = [...path.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g)]
    .map(match => [Number(match[1]), Number(match[2])] as const);
  return points.slice(1).map((point, i) => [points[i][0], points[i][1], point[0], point[1]] as const);
};
const nonGlueSegments = rscGeometry.cuts.slice(4).flatMap(extractSimpleSegments);
if (nonGlueSegments.some(([x1, y1, x2, y2]) => Math.abs(x2 - x1) > 1e-8 && Math.abs(y2 - y1) > 1e-8)) {
  fail('FEFCO 0201 flap outlines must not use decorative diagonal shoulders');
}
const normalizedCutSegment = (segment: readonly number[]) => {
  const a = [segment[0], segment[1]], b = [segment[2], segment[3]];
  const points = [a, b].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  return points.flat().map(n => n.toFixed(5)).join(',');
};
const segmentCounts = new Map<string, number>();
for (const path of rscGeometry.cuts) {
  for (const segment of extractSimpleSegments(path)) {
    const key = normalizedCutSegment(segment);
    segmentCounts.set(key, (segmentCounts.get(key) ?? 0) + 1);
  }
}
if ([...segmentCounts.values()].some(count => count > 1)) {
  fail('FEFCO 0201 output must not emit duplicate coincident cut segments');
}

// Board caliper must influence opposing-flap clearance for slotted-case templates.
// This is a parameter-sensitivity regression, not a claim that the allowance is machine-certified.
for (const id of ['fefco-0200', 'fefco-0201', 'fefco-0203', 'fefco-0204', 'default-rsc']) {
  const engine = STANDARD_DIELINE_ENGINES[id];
  const thin = engine({ L: 240, W: 160, H: 100, thickness: 0.45, x0: 0 });
  const thick = engine({ L: 240, W: 160, H: 100, thickness: 4.8, x0: 0 });
  if (Math.abs(thin.totalH - thick.totalH) < 1) {
    fail(`${id}: board caliper change must affect flap-clearance geometry`);
  }
}

for (const [l, w, h, caliper] of [
  [Number.NaN, 0, -10, Number.NaN],
  [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1, Number.POSITIVE_INFINITY],
  [-1, -1, -1, -1],
] as const) {
  const metrics = calculateDielineParameters(l, w, h, caliper, 'fefco-0201');
  if (![metrics.sheetWidth, metrics.sheetHeight, metrics.grossArea, metrics.netArea, metrics.cutLength, metrics.creaseLength].every(Number.isFinite)) {
    fail(`invalid input normalization leaked non-finite metrics for ${JSON.stringify([l,w,h,caliper])}`);
  }
  if (metrics.sheetWidth <= 0 || metrics.sheetHeight <= 0 || metrics.grossArea < 0) {
    fail('invalid input normalization produced impossible manufacturing metrics');
  }
}
const curvedDxf = [
  '0','SECTION','2','ENTITIES',
  '0','ARC','8','CREASE','10','0','20','0','40','10','50','0','51','90',
  '0','CIRCLE','8','CUT','10','20','20','20','40','5',
  '0','ENDSEC','0','EOF'
].join('\n');
const curvedEntities = parseDxfToEntities(curvedDxf);
if (curvedEntities.length < 12) fail(`ARC/CIRCLE should be tessellated into line segments, got ${curvedEntities.length}`);
if (!curvedEntities.some(e => e.isCrease) || curvedEntities.some(e => !e.start || !e.end ||
    ![e.start.x,e.start.y,e.end.x,e.end.y].every(Number.isFinite))) {
  fail('ARC/CIRCLE conversion must preserve layer classification and finite coordinates');
}

console.log(`Dieline geometry checks passed: ${Object.keys(STANDARD_DIELINE_ENGINES).length} registered engine IDs × ${dimensions.length} dimension sets, plus invalid-input and DXF curve checks.`);
