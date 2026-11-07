export interface Dieline3DParameters {
  L: number;
  W: number;
  H: number;
  thickness?: number;
  foldAngle?: number;
  glueTab?: number;
  tuck?: number;
  dustFlap?: number;
  materialThickness?: number;
  materialGsm?: number;
  materialType?: string;
  boxType?: string;
  grainDirection?: 'parallel_L' | 'parallel_W';
}
