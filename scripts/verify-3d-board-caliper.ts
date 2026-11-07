import { resolveScaledBoardThickness } from '../src/services/dieline3dGeometry.ts';

const fail = (message: string): never => {
  throw new Error(`[3D board-caliper regression] ${message}`);
};

const cases: Array<[number, number]> = [
  [0.45, 0.36],
  [1.5, 1.2],
  [3, 2.4],
  [6.5, 5.2],
];
for (const [physical, expected] of cases) {
  const actual = resolveScaledBoardThickness(physical);
  if (Math.abs(actual - expected) > 1e-9) {
    fail(`physical thickness ${physical} mm should map to ${expected} scene units, got ${actual}`);
  }
}

if (Math.abs(resolveScaledBoardThickness(0) - 0.36) > 1e-9) {
  fail('invalid material thickness must use the 0.45 mm safe default');
}
if (Math.abs(resolveScaledBoardThickness(1.5, Number.NaN) - 1.2) > 1e-9) {
  fail('invalid geometry scale must use the 0.8 safe default');
}
