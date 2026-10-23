export const calculateGangingLayout = (
  items: any[],
  selectedSheetId: string,
  machine: any,
  standardSheets: any[]
) => {
  const sheet = standardSheets?.find(s => s.id === selectedSheetId) || { width: 70, height: 100 };
  const placedItems: any[] = [];
  const unplacedItems: any[] = [];

  let currentX = 2; // margins
  let currentY = (machine?.gripperMargin || 2);
  const sheetW = sheet.width || 70;
  const sheetH = sheet.height || 100;

  if (Array.isArray(items)) {
    items.forEach((item, index) => {
      const itemW = item.w || 10;
      const itemH = item.h || 15;

      if (currentX + itemW <= sheetW && currentY + itemH <= sheetH) {
        placedItems.push({
          ...item,
          x: currentX,
          y: currentY,
          rotated: false,
        });
        currentX += itemW + 0.5;
      } else if (currentY + itemH <= sheetH) {
        currentX = 2;
        currentY += itemH + 0.5;
        if (currentX + itemW <= sheetW && currentY + itemH <= sheetH) {
          placedItems.push({
            ...item,
            x: currentX,
            y: currentY,
            rotated: false,
          });
          currentX += itemW + 0.5;
        } else {
          unplacedItems.push(item);
        }
      } else {
        unplacedItems.push(item);
      }
    });
  }

  const totalSheetArea = sheetW * sheetH;
  const usedArea = placedItems.reduce((acc, it) => acc + (it.w * it.h), 0);
  const usedRatio = totalSheetArea > 0 ? Math.min(1, usedArea / totalSheetArea) : 0;

  return {
    placedItems,
    unplacedItems,
    usedAreaPercentage: usedRatio,
    wastePercentage: Math.max(0, 1 - usedRatio),
  };
};
