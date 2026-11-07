import { parseDxfToEntities, scaleCustomDieline } from '../src/services/customDielineEngine.ts';

const fail = (message: string): never => {
  throw new Error(`[DXF scale regression] ${message}`);
};

const fixture = [
  '0', 'SECTION', '2', 'ENTITIES',
  '0', 'LINE', '8', 'CUT', '10', '0', '20', '0', '11', '100', '21', '0',
  '0', 'LINE', '8', 'CREASE', '10', '0', '20', '0', '11', '0', '21', '50',
  '0', 'ENDSEC', '0', 'EOF',
].join('\n');

const entities = parseDxfToEntities(fixture);
if (entities.length !== 2) fail(`expected 2 source entities, got ${entities.length}`);

const imported = scaleCustomDieline(entities, 250, 150, 90);
if (imported.cuts.length !== 1 || imported.creases.length !== 1) {
  fail('source CUT/CREASE separation must be preserved');
}
if (imported.totalW !== 100 || imported.totalH !== 50) {
  fail(`changing target L/W/H must not silently rescale source bounds; got ${imported.totalW}×${imported.totalH}`);
}
if (!imported.labels?.some(label => label.text.includes('مقیاس و مختصات منبع حفظ'))) {
  fail('preview must disclose that imported source coordinates remain unchanged');
}
