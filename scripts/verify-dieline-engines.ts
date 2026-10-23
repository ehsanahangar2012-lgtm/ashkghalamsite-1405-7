import { calculateDielineParameters, STANDARD_DIELINE_ENGINES } from '../src/services/dielineMath.ts';

const requiredEngines = [
  'default-rsc',
  'fefco-0200', 'fefco-0201', 'fefco-0203', 'fefco-0204', 'fefco-0215',
  'fefco-0300', 'fefco-0301', 'fefco-0320', 'fefco-0427', 'fefco-pizza',
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
    if (!Array.isArray(result.cuts) || result.cuts.length === 0) fail(`${id}: no cut paths`);
    if (!Array.isArray(result.creases) || result.creases.length === 0) fail(`${id}: no crease paths`);
    if (![result.xMin, result.yMin, result.xMax, result.yMax, result.totalW, result.totalH].every(Number.isFinite)) {
      fail(`${id}: non-finite geometry bounds for ${JSON.stringify(dims)}`);
    }
    if (result.totalW <= 0 || result.totalH <= 0 || result.xMax <= result.xMin || result.yMax <= result.yMin) {
      fail(`${id}: invalid geometry bounds for ${JSON.stringify(dims)}`);
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

const telescope = STANDARD_DIELINE_ENGINES['fefco-0320']({
  L: 240, W: 160, H: 100, thickness: 1.6, glueTab: 30, x0: 40,
});
if (!telescope.labels.some(label => label.text.includes('قطعه ۱')) ||
    !telescope.labels.some(label => label.text.includes('قطعه ۲'))) {
  fail('FEFCO 0320 must generate separate base and lid pieces');
}

const pizza = STANDARD_DIELINE_ENGINES['fefco-pizza']({
  L: 300, W: 300, H: 45, thickness: 1.6, glueTab: 30, x0: 40,
});
if (!pizza.cuts.length || !pizza.creases.some(path => path.includes('L'))) {
  fail('custom pizza carton must include both cut and crease geometry');
}


const lockBottom = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 120, W: 90, H: 100, thickness: 0.45, glueTab: 22, x0: 40,
});
if (!lockBottom.cuts.some(path => path.includes('Z'))) {
  fail('snap-lock bottom must contain a closed receiving-slot cut path');
}
if (!lockBottom.labels.some(label => label.text.includes('زبانه قفل')) ||
    !lockBottom.labels.some(label => label.text.includes('شیار قفل'))) {
  fail('snap-lock bottom must expose both tongue and receiving-slot geometry');
}
const thickBoardLock = STANDARD_DIELINE_ENGINES['snap-lock-123']({
  L: 120, W: 90, H: 100, thickness: 2.5, glueTab: 22, x0: 40,
});
if (JSON.stringify(lockBottom.cuts) === JSON.stringify(thickBoardLock.cuts)) {
  fail('snap-lock geometry must respond to board caliper');
}

console.log(`Dieline geometry checks passed: ${requiredEngines.length} engines × ${dimensions.length} dimension sets.`);


// Metrics must use the selected engine geometry and consistent square-metre units.
const rscMetrics = calculateDielineParameters('FEFCO 0201', 240, 160, 100, 1.6);
const sleeveMetrics = calculateDielineParameters('ecma-b10', 240, 160, 100, 1.6);
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
const ecmaDisplayMetrics = calculateDielineParameters('ECMA A20.20', 240, 160, 100, 1.6);
const ecmaEngineMetrics = calculateDielineParameters('ecma-a2020', 240, 160, 100, 1.6);
if (ecmaDisplayMetrics.sheetWidth !== ecmaEngineMetrics.sheetWidth ||
    ecmaDisplayMetrics.sheetHeight !== ecmaEngineMetrics.sheetHeight) {
  fail('human-readable ECMA A20.20 code must resolve to its specific engine');
}
const thinMetrics = calculateDielineParameters('snap-lock-123', 120, 90, 100, 0.45);
const thickMetrics = calculateDielineParameters('snap-lock-123', 120, 90, 100, 2.5);
if (thinMetrics.cutLength === thickMetrics.cutLength && thinMetrics.sheetHeight === thickMetrics.sheetHeight) {
  fail('caliper must be passed through to geometry-derived manufacturing metrics');
}
