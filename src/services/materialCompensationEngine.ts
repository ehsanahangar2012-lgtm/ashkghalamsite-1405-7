export const calculateMaterialCompensation = (
  materialIdOrL: any,
  wOrRawL?: number,
  hOrRawW?: number,
  caliperOrRawH?: number
) => {
  let l = 150;
  let w = 100;
  let h = 80;
  let caliper = 3;

  if (typeof materialIdOrL === 'string') {
    // Called as: calculateMaterialCompensation(material.id, safeRawL, safeRawW, safeRawH)
    l = wOrRawL || 150;
    w = hOrRawW || 100;
    h = caliperOrRawH || 80;
    caliper = materialIdOrL.includes('corrugated') || materialIdOrL.includes('flute') ? 3.5 : 0.45;
  } else {
    l = typeof materialIdOrL === 'number' ? materialIdOrL : 150;
    w = wOrRawL || 100;
    h = hOrRawW || 80;
    caliper = caliperOrRawH || 3;
  }

  return {
    manufacturingL: l,
    manufacturingW: w,
    manufacturingH: h,
    innerL: Math.max(0, l - 2 * caliper),
    innerW: Math.max(0, w - 2 * caliper),
    innerH: Math.max(0, h - 2 * caliper),
    outerL: l,
    outerW: w,
    outerH: h,
    creaseAllowance: Number((caliper * 1.5).toFixed(2)),
  };
};
