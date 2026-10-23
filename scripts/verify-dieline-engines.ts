import { calculateDielineParameters, getRscFlapDepths, STANDARD_DIELINE_ENGINES } from '../src/services/dielineMath.ts';
import { parseDxfToEntities, scaleCustomDieline } from '../src/services/customDielineEngine.ts';
import { validateDxfDieline, runComprehensiveGeometryCheck } from '../src/services/geometryValidator.ts';

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

    const geometryReport = runComprehensiveGeometryCheck(
      result.cuts, result.creases, dims.L, dims.W, dims.H, id,
      dims.L * 0.18, dims.W * 0.42, result.totalW, result.totalH, 100000, 100000, dims.glueTab
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

// Regression: FEFCO 0201 must use different flap depths for L- and W-wide panels.
const rscDepths = getRscFlapDepths(240, 160, 0.5, 0.5);
if (rscDepths.top[0] !== 78 || rscDepths.top[1] !== 118 || rscDepths.top[2] !== 78 || rscDepths.top[3] !== 118) {
  fail(`RSC panel flap depths must follow the perpendicular box dimension, got ${JSON.stringify(rscDepths.top)}`);
}
const rscGeometry = STANDARD_DIELINE_ENGINES['fefco-0201']({ L: 240, W: 160, H: 100, glueTab: 30, x0: 40 });
if (!rscGeometry.cuts.some(path => path.includes('M 310 158 L 310 40 L 470 40 L 470 158')) ||
    !rscGeometry.cuts.some(path => path.includes('M 70 158 L 70 80 L 310 80 L 310 158'))) {
  fail('FEFCO 0201 must render visibly different side-flap and main-flap depths');
}

// Regression: the default ECMA reverse-tuck-end pattern has tapered dust flaps and a real tuck notch.
const rteGeometry = STANDARD_DIELINE_ENGINES['ecma-a2020']({
  L: 240, W: 160, H: 100, thickness: 0.45, glueTab: 30, tuck: 20, dustFlap: 15, x0: 40,
});
if (!rteGeometry.cuts.some(path => path.includes('L 163.6 30 L 163.6 33.6')) ||
    !rteGeometry.cuts.some(path => path.includes('L 325 195 L 455 195'))) {
  fail('ECMA reverse-tuck-end must include a locking notch and angled dust-flap corners');
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




// Metrics must use the selected engine geometry and consistent square-metre units.
const rscMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'FEFCO 0201');
const sleeveMetrics = calculateDielineParameters(240, 160, 100, 1.6, 'ecma-b10');
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

console.log(`Dieline geometry checks passed: ${requiredEngines.length} engines × ${dimensions.length} dimension sets.`);
