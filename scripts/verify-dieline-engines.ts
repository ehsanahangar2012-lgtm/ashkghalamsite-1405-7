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
if (!rscGeometry.cuts.some(path => path.includes('L 316.4 40 L 463.6 40')) ||
    !rscGeometry.cuts.some(path => path.includes('L 76.4 80 L 303.6 80'))) {
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
  fail(\`closed legacy DXF POLYLINE should yield three edges, got \${closedLegacyEntities.length}\`);
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
  fail(\`legacy DXF POLYLINE with repeated first vertex must not duplicate closure, got \${explicitClosedEntities.length}\`);
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
