export interface GangingItemInput {
  id?: string;
  itemId?: string;
  name?: string;
  w?: number;
  h?: number;
  width?: number;
  height?: number;
  count?: number;
  imgUrl?: string;
  allowRotate?: boolean;
  netArea?: number;
  allowInterlock?: boolean;
}

export interface GangingPlacement {
  id: string;
  itemId: string;
  name: string;
  w: number;
  h: number;
  width: number;
  height: number;
  imgUrl?: string;
  x: number;
  y: number;
  rotated: boolean;
  angle: 0 | 90 | 180 | 270;
  row: number;
  col: number;
}

export interface GangingLayoutResult {
  sheetId: string;
  sheetWidth: number;
  sheetHeight: number;
  gripperMargin: number;
  trimMargin: number;
  gapMm: number;
  placedItems: GangingPlacement[];
  unplacedItems: GangingItemInput[];
  cols: number;
  rows: number;
  orientation: 'normal' | 'rotated_90';
  interlocked: boolean;
  yieldCount: number;
  usedAreaPercentage: number;
  wastePercentage: number;
  comparison: {
    normalCount: number;
    rotatedCount: number;
    interlockedCount: number;
  };
}

export const calculateGangingLayout = (
  items: GangingItemInput[],
  selectedSheetId: string,
  machine: { gripperMargin?: number; trimMargin?: number; bladeKerf?: number } | any,
  standardSheets: { id?: string; name?: string; width: number; height: number }[]
): GangingLayoutResult => {
  const sheet =
    standardSheets?.find((s) => s.id === selectedSheetId || s.name === selectedSheetId) || {
      id: selectedSheetId || '100x70',
      width: 1000,
      height: 700,
    };

  const sheetW = Math.max(10, Number(sheet.width) || 1000);
  const sheetH = Math.max(10, Number(sheet.height) || 700);
  const isCmScale = sheetW <= 150 && sheetH <= 150;

  const gripperMargin = Math.max(0.5, Number(machine?.gripperMargin) ?? (isCmScale ? 2 : 10));
  const trimMargin = Math.max(0.2, Number(machine?.trimMargin) ?? (isCmScale ? 0.5 : 5));
  const gapMm = Math.max(0.2, Number(machine?.bladeKerf) ?? (isCmScale ? 0.4 : 4));

  const usableW = Math.max(5, sheetW - trimMargin * 2);
  const usableH = Math.max(5, sheetH - gripperMargin - trimMargin);

  // Single-dieline sheet yield mode (used by DielineGenerator & Packly Studio)
  if (!Array.isArray(items) || (items.length === 1 && !items[0].count)) {
    const primary: GangingItemInput = items?.[0] || { w: 180, h: 120, name: 'Box' };
    const itemW = Math.max(2, Number(primary.w ?? primary.width) || 180);
    const itemH = Math.max(2, Number(primary.h ?? primary.height) || 120);

    const colsNormal = Math.floor((usableW + gapMm) / (itemW + gapMm));
    const rowsNormal = Math.floor((usableH + gapMm) / (itemH + gapMm));
    const normalCount = Math.max(0, colsNormal * rowsNormal);

    const colsRot = Math.floor((usableW + gapMm) / (itemH + gapMm));
    const rowsRot = Math.floor((usableH + gapMm) / (itemW + gapMm));
    const rotatedCount = Math.max(0, colsRot * rowsRot);

    // 180-degree head-to-toe interlocking pitch optimization
    const pitchNormalInterlock = itemH * 0.88 + gapMm;
    const rowsInterlockN = itemH <= usableH ? 1 + Math.floor((usableH - itemH) / pitchNormalInterlock) : 0;
    const interlockCountN = Math.max(0, colsNormal * rowsInterlockN);

    const pitchRotInterlock = itemW * 0.88 + gapMm;
    const rowsInterlockR = itemW <= usableH ? 1 + Math.floor((usableH - itemW) / pitchRotInterlock) : 0;
    const interlockCountR = Math.max(0, colsRot * rowsInterlockR);

    const useInterlock =
      primary.allowInterlock !== false &&
      Math.max(interlockCountN, interlockCountR) > Math.max(normalCount, rotatedCount);

    let bestCols = colsNormal;
    let bestRows = rowsNormal;
    let isRot = false;
    let rowPitch = itemH + gapMm;
    let colPitch = itemW + gapMm;

    if (useInterlock) {
      if (interlockCountR > interlockCountN) {
        isRot = true;
        bestCols = colsRot;
        bestRows = rowsInterlockR;
        colPitch = itemH + gapMm;
        rowPitch = pitchRotInterlock;
      } else {
        bestCols = colsNormal;
        bestRows = rowsInterlockN;
        colPitch = itemW + gapMm;
        rowPitch = pitchNormalInterlock;
      }
    } else if (rotatedCount > normalCount) {
      isRot = true;
      bestCols = colsRot;
      bestRows = rowsRot;
      colPitch = itemH + gapMm;
      rowPitch = itemW + gapMm;
    }

    const placedItems: GangingPlacement[] = [];
    const baseId = primary.id || primary.itemId || 'die';
    for (let r = 0; r < bestRows; r++) {
      for (let c = 0; c < bestCols; c++) {
        const flipped180 = useInterlock && r % 2 === 1;
        const angle: 0 | 90 | 180 | 270 = isRot ? (flipped180 ? 270 : 90) : flipped180 ? 180 : 0;
        const pw = isRot ? itemH : itemW;
        const ph = isRot ? itemW : itemH;
        placedItems.push({
          id: `${baseId}-${r}-${c}`,
          itemId: baseId,
          name: primary.name || 'Dieline',
          w: pw,
          h: ph,
          width: pw,
          height: ph,
          imgUrl: primary.imgUrl,
          x: Number((trimMargin + c * colPitch).toFixed(2)),
          y: Number((gripperMargin + r * rowPitch).toFixed(2)),
          rotated: isRot,
          angle,
          row: r,
          col: c,
        });
      }
    }

    const yieldCount = placedItems.length;
    const totalSheetArea = sheetW * sheetH;
    const effectiveUnitArea = primary.netArea || itemW * itemH;
    const usedRatio = totalSheetArea > 0 ? Math.min(0.98, (yieldCount * effectiveUnitArea) / totalSheetArea) : 0;

    return {
      sheetId: selectedSheetId,
      sheetWidth: sheetW,
      sheetHeight: sheetH,
      gripperMargin,
      trimMargin,
      gapMm,
      placedItems,
      unplacedItems: yieldCount === 0 ? [primary] : [],
      cols: bestCols,
      rows: bestRows,
      orientation: isRot ? 'rotated_90' : 'normal',
      interlocked: useInterlock,
      yieldCount,
      usedAreaPercentage: usedRatio,
      wastePercentage: Math.max(0.02, 1 - usedRatio),
      comparison: {
        normalCount,
        rotatedCount,
        interlockedCount: Math.max(interlockCountN, interlockCountR),
      },
    };
  }

  // Multi-SKU ganging layout (supports item.count & allowRotate from AdminTools)
  const expanded: GangingItemInput[] = [];
  items.forEach((it) => {
    const qty = Math.max(1, Math.min(200, Number(it.count) || 1));
    for (let k = 0; k < qty; k++) {
      expanded.push(it);
    }
  });

  const sorted = [...expanded].sort((a, b) => {
    const ma = Math.max(a.w ?? a.width ?? 10, a.h ?? a.height ?? 10);
    const mb = Math.max(b.w ?? b.width ?? 10, b.h ?? b.height ?? 10);
    return mb - ma;
  });

  const placedItems: GangingPlacement[] = [];
  const unplacedItems: GangingItemInput[] = [];

  let cursorX = trimMargin;
  let cursorY = gripperMargin;
  let shelfHeight = 0;
  let rowIdx = 0;
  let colIdx = 0;

  sorted.forEach((item, idx) => {
    const w0 = Math.max(1, Number(item.w ?? item.width) || 10);
    const h0 = Math.max(1, Number(item.h ?? item.height) || 15);
    const canRotate = item.allowRotate !== false;

    const fitsNormal = cursorX + w0 <= sheetW - trimMargin && cursorY + h0 <= sheetH - trimMargin;
    const fitsRotated = canRotate && cursorX + h0 <= sheetW - trimMargin && cursorY + w0 <= sheetH - trimMargin;

    let chosenRot = false;
    let pw = w0;
    let ph = h0;

    if (fitsNormal && fitsRotated) {
      if (w0 < h0) {
        chosenRot = true;
        pw = h0;
        ph = w0;
      }
    } else if (!fitsNormal && fitsRotated) {
      chosenRot = true;
      pw = h0;
      ph = w0;
    } else if (!fitsNormal && !fitsRotated) {
      cursorX = trimMargin;
      cursorY += shelfHeight + gapMm;
      shelfHeight = 0;
      rowIdx++;
      colIdx = 0;
      if (canRotate && h0 < w0 && cursorX + h0 <= sheetW - trimMargin && cursorY + w0 <= sheetH - trimMargin) {
        chosenRot = true;
        pw = h0;
        ph = w0;
      }
    }

    if (cursorX + pw <= sheetW - trimMargin && cursorY + ph <= sheetH - trimMargin) {
      const baseId = item.id || item.itemId || `sku-${idx}`;
      placedItems.push({
        id: `${baseId}-${idx}`,
        itemId: baseId,
        name: item.name || 'Item',
        w: pw,
        h: ph,
        width: pw,
        height: ph,
        imgUrl: item.imgUrl,
        x: Number(cursorX.toFixed(2)),
        y: Number(cursorY.toFixed(2)),
        rotated: chosenRot,
        angle: chosenRot ? 90 : 0,
        row: rowIdx,
        col: colIdx++,
      });
      cursorX += pw + gapMm;
      shelfHeight = Math.max(shelfHeight, ph);
    } else {
      unplacedItems.push(item);
    }
  });

  const totalSheetArea = sheetW * sheetH;
  const usedArea = placedItems.reduce((acc, it) => acc + it.w * it.h, 0);
  const usedRatio = totalSheetArea > 0 ? Math.min(0.98, usedArea / totalSheetArea) : 0;

  return {
    sheetId: selectedSheetId,
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    gripperMargin,
    trimMargin,
    gapMm,
    placedItems,
    unplacedItems,
    cols: colIdx,
    rows: rowIdx + 1,
    orientation: 'normal',
    interlocked: false,
    yieldCount: placedItems.length,
    usedAreaPercentage: usedRatio,
    wastePercentage: Math.max(0.02, 1 - usedRatio),
    comparison: {
      normalCount: placedItems.length,
      rotatedCount: placedItems.length,
      interlockedCount: placedItems.length,
    },
  };
};
