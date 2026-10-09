import { STANDARD_DIELINE_ENGINES } from './services/dielineMath.js';
const engine = STANDARD_DIELINE_ENGINES['fefco-0215'];
const res = engine({L: 100, W: 100, H: 100, glueTab: 30, x0: 0});
console.log(res.cuts);
