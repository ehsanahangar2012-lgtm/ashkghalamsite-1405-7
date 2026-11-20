export const resolveScaledBoardThickness = (
  materialThicknessMm: number,
  dimensionScale = 0.8,
): number => {
  const safeThickness = Number.isFinite(materialThicknessMm) && materialThicknessMm > 0
    ? materialThicknessMm
    : 0.45;
  const safeScale = Number.isFinite(dimensionScale) && dimensionScale > 0
    ? dimensionScale
    : 0.8;
  return Math.max(0.08, safeThickness * safeScale);
};
