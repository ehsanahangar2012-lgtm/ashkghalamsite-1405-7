
import { MachineConfig, SheetStandard, ImpositionLayout, ImpositionItemInput, PlacedItem } from '../types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Advanced Guillotine Bin Packing Algorithm
 */
class GuillotinePacker {
  width: number;
  height: number;
  freeRectangles: Rect[];
  placedItems: PlacedItem[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.placedItems = [];
    this.freeRectangles = [{ x: 0, y: 0, w: width, h: height }];
  }

  placeItem(item: { id: string, name: string, w: number, h: number, imgUrl?: string }): boolean {
    let bestScore = Number.MAX_VALUE;
    let bestRectIndex = -1;
    let bestRotated = false;

    for (let i = 0; i < this.freeRectangles.length; i++) {
      const freeRect = this.freeRectangles[i];

      // Normal
      if (item.w <= freeRect.w && item.h <= freeRect.h) {
        const score = this.score(freeRect.w, freeRect.h, item.w, item.h);
        if (score < bestScore) {
          bestScore = score;
          bestRectIndex = i;
          bestRotated = false;
        }
      }

      // Rotated
      if (item.h <= freeRect.w && item.w <= freeRect.h) {
        const score = this.score(freeRect.w, freeRect.h, item.h, item.w);
        if (score < bestScore) {
          bestScore = score;
          bestRectIndex = i;
          bestRotated = true;
        }
      }
    }

    if (bestRectIndex !== -1) {
      const freeRect = this.freeRectangles[bestRectIndex];
      const placedW = bestRotated ? item.h : item.w;
      const placedH = bestRotated ? item.w : item.h;

      this.placedItems.push({
        itemId: item.id,
        name: item.name,
        x: freeRect.x,
        y: freeRect.y,
        width: placedW,
        height: placedH,
        rotated: bestRotated,
        rowId: 0,
        imgUrl: item.imgUrl
      });

      this.splitFreeRect(bestRectIndex, freeRect, placedW, placedH);
      return true;
    }

    return false;
  }

  private score(rectW: number, rectH: number, itemW: number, itemH: number): number {
    const leftoverW = Math.abs(rectW - itemW);
    const leftoverH = Math.abs(rectH - itemH);
    return Math.min(leftoverW, leftoverH);
  }

  private splitFreeRect(index: number, freeRect: Rect, usedW: number, usedH: number) {
    this.freeRectangles.splice(index, 1);
    const w = freeRect.w - usedW;
    const h = freeRect.h - usedH;

    if (w < h) {
      if (h > 0) this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + usedH, w: freeRect.w, h: h });
      if (w > 0) this.freeRectangles.push({ x: freeRect.x + usedW, y: freeRect.y, w: w, h: usedH });
    } else {
      if (w > 0) this.freeRectangles.push({ x: freeRect.x + usedW, y: freeRect.y, w: w, h: freeRect.h });
      if (h > 0) this.freeRectangles.push({ x: freeRect.x, y: freeRect.y + usedH, w: usedW, h: h });
    }
    this.pruneTinyRects();
  }

  private pruneTinyRects() {
    this.freeRectangles = this.freeRectangles.filter(r => r.w >= 1 && r.h >= 1);
  }
}

export const calculateGangingLayout = (
  items: ImpositionItemInput[],
  selectedSheetId: string,
  machine: MachineConfig,
  allSheets: (SheetStandard & { pricePerSheet?: number })[]
): ImpositionLayout => {
  
  const sheet = allSheets.find(s => s.id === selectedSheetId);
  if (!sheet) throw new Error("Sheet not found");

  const gutter = 0.5;
  const gripper = machine.gripperMargin;
  
  const usableW = sheet.width;
  const usableH = sheet.height - gripper;
  
  let itemsToPack: { id: string, name: string, w: number, h: number, area: number, originalId: string, imgUrl?: string }[] = [];
  
  items.forEach(item => {
    for (let i = 0; i < item.quantity; i++) {
      itemsToPack.push({ 
        id: `${item.id}-${i}`, 
        originalId: item.id,
        name: item.name, 
        w: item.width + gutter, 
        h: item.height + gutter,
        area: (item.width + gutter) * (item.height + gutter),
        imgUrl: item.imgUrl
      });
    }
  });

  itemsToPack.sort((a, b) => b.area - a.area);

  const packer = new GuillotinePacker(usableW, usableH);
  const unplacedItems: ImpositionItemInput[] = [];

  for (const item of itemsToPack) {
    const success = packer.placeItem(item);
    if (!success) {
      unplacedItems.push({
        id: item.originalId,
        name: item.name,
        width: item.w - gutter,
        height: item.h - gutter,
        quantity: 1,
        imgUrl: item.imgUrl
      });
    }
  }

  const finalPlacedItems = packer.placedItems.map(p => ({
    ...p,
    y: p.y + gripper,
    itemId: p.itemId.split('-')[0]
  }));

  const usedArea = finalPlacedItems.reduce((acc, item) => acc + (item.width * item.height), 0);
  const totalArea = sheet.width * sheet.height;
  const usedAreaPercentage = usedArea / totalArea;
  
  const zincCost = machine.plateCost * 4;
  const paperCost = sheet.pricePerSheet || 0; 
  const printCost = machine.setupCost + (machine.runCostPer1000 / 1000); 

  return {
    sheetId: sheet.id,
    sheetWidth: sheet.width,
    sheetHeight: sheet.height,
    placedItems: finalPlacedItems,
    unplacedItems,
    wastePercentage: 1 - usedAreaPercentage,
    usedAreaPercentage,
    zincCost,
    paperCost,
    printCost,
    totalSheetsRequired: 1
  };
};

export const calculateImposition = (
  productW: number,
  productH: number,
  quantity: number,
  machine: MachineConfig,
  availableSheets: (SheetStandard & { pricePerSheet?: number })[]
): any => {
    // Legacy wrapper
    let bestResult = null;
    let minCost = Infinity;

    for (const sheet of availableSheets) {
       const areaItem = productW * productH;
       const areaSheet = sheet.width * (sheet.height - machine.gripperMargin);
       const approxMaxUps = Math.floor(areaSheet / areaItem);
       const testItems: ImpositionItemInput[] = [{ 
           id: '1', name: 'Prod', width: productW, height: productH, quantity: approxMaxUps + 5 
       }];

       try {
           const layout = calculateGangingLayout(testItems, sheet.id, machine, availableSheets);
           const ups = layout.placedItems.length;
           if (ups === 0) continue;

           const sheetsNeeded = Math.ceil(quantity / ups) + 200; 
           const pricePerSheet = sheet.pricePerSheet || 0;
           const cost = (sheetsNeeded * pricePerSheet) + (machine.plateCost * 4) + (sheetsNeeded * machine.runCostPer1000 / 1000);

           if (cost < minCost) {
              minCost = cost;
              bestResult = {
                 sheetId: sheet.id,
                 ups: ups,
                 paperCost: sheetsNeeded * pricePerSheet,
                 zincCost: machine.plateCost * 4,
                 printCost: machine.setupCost + (sheetsNeeded * machine.runCostPer1000 / 1000),
                 totalSheetsRequired: sheetsNeeded,
                 wastePercentage: layout.wastePercentage,
                 rows: 0, cols: 0, rotated: false, itemW: productW, itemH: productH
              };
           }
       } catch (e) { continue; }
    }
    if (!bestResult) throw new Error("Product too big");
    return bestResult;
};
