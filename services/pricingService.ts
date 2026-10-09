
import { PricingFormulaConfig } from '../types';
import { calculateImposition } from './impositionService';

export interface PricingParams {
  category: 'business-card' | 'flyer' | 'box' | 'label' | 'booklet';
  size: string; // user input (e.g. "8.5x4.8" or "A4") or dimensions object
  customDims?: { w: number, h: number, d: number }; // For Dieline generator integration
  paperType: string; // e.g., 'glossy-300'
  quantity: number;
  sides: 'single' | 'double';
  laminate: string; // e.g. 'matte', 'glossy'
  extras: string[]; 
  deliverySpeed: 'normal' | 'rush';
}

export interface PriceResult {
  totalPrice: number;
  unitPrice: number;
  basePrice: number;
  paperCost: number;
  printCost: number;
  finishingCost: number;
  deliveryDate: string;
  details?: any; // Contains imposition info for admin
}

// Advanced Industrial Defaults
export const DEFAULT_FORMULA: PricingFormulaConfig = {
  profitMargin: 1.30, // 30% Gross Margin
  rushMultiplier: 1.40,
  taxRate: 0.09,
  
  papers: [
    {
      id: 'glossy',
      name: 'گلاسه (Art Paper)',
      weights: [
        { grammage: 135, pricePerKg: 65000 },
        { grammage: 200, pricePerKg: 62000 },
        { grammage: 300, pricePerKg: 60000 },
      ]
    },
    {
      id: 'matte',
      name: 'گلاسه مات (Matte Art)',
      weights: [
        { grammage: 300, pricePerKg: 64000 },
      ]
    },
    {
      id: 'inderboard',
      name: 'ایندربرد (Inderboard)',
      weights: [
        { grammage: 300, pricePerKg: 58000 },
        { grammage: 350, pricePerKg: 58000 },
      ]
    },
    {
      id: 'kraft',
      name: 'کرافت (Kraft)',
      weights: [
        { grammage: 120, pricePerKg: 45000 },
        { grammage: 300, pricePerKg: 42000 },
      ]
    },
    {
      id: 'linen',
      name: 'کتان (Linen)',
      weights: [
        { grammage: 300, pricePerKg: 85000 },
      ]
    }
  ],

  finishes: [
    { id: 'matte', name: 'سلفون مات', type: 'sqm', price: 4500 }, // Per Sq Meter
    { id: 'glossy', name: 'سلفون براق', type: 'sqm', price: 4000 },
    { id: 'velvet', name: 'سلفون مخملی', type: 'sqm', price: 9000 },
    { id: 'uv-spot', name: 'یووی موضعی', type: 'fixed', price: 450000 }, // Film/Plate cost
    { id: 'gold-foil', name: 'طلاکوب', type: 'fixed', price: 600000 }, // Cliché cost
    { id: 'emboss', name: 'برجسته‌سازی', type: 'fixed', price: 500000 },
    { id: 'die-cut', name: 'لبه گرد / دایکات', type: 'unit', price: 200 }, // Per beat
  ],
  
  defaultMachine: {
    name: "Speedmaster XL 75 (4.5 Sheet)",
    maxSheetSize: { w: 70, h: 50 }, // 50x70
    minSheetSize: { w: 30, h: 20 },
    gripperMargin: 1.5,
    plateCost: 650000, // Per color (Zinc)
    setupCost: 1500000, // Machine Setup
    runCostPer1000: 450000, // Printing cost per 1000 sheets
  },
  
  standardSheets: [
    { id: '100x70', name: '۱۰۰ در ۷۰', width: 100, height: 70 },
    { id: '90x60', name: '۹۰ در ۶۰', width: 90, height: 60 },
    { id: '50x70', name: '۵۰ در ۷۰', width: 70, height: 50 },
  ]
};

export const calculatePrice = (
  params: PricingParams, 
  config: PricingFormulaConfig = DEFAULT_FORMULA
): PriceResult => {
  
  // 1. Parse Input Dimensions
  let productW = 0, productH = 0;
  
  if (params.customDims) {
    // Estimating flat size from folded dimensions
    // Rough estimate for generic box: Flat Width ~= 2.2 * W + 2 * D, Flat Height ~= H + 1.5 * D
    if (params.category === 'box') {
       productW = (params.customDims.w * 2.2 + params.customDims.d * 2) / 10; 
       productH = (params.customDims.h + params.customDims.d * 1.5) / 10;
    } else {
       productW = params.customDims.w / 10;
       productH = params.customDims.h / 10;
    }
  } else {
    // Standard sizes
    switch(params.size) {
      case 'A4': productW = 21; productH = 29.7; break;
      case 'A5': productW = 14.8; productH = 21; break;
      case '8.5x4.8': productW = 8.5; productH = 4.8; break;
      case '9x6': productW = 9; productH = 6; break;
      default: productW = 20; productH = 20;
    }
  }

  // 2. Parse Paper Type & Weight
  const [paperFamily, paperWeightStr] = params.paperType.split('-'); // e.g. "glossy-300"
  let paperWeight = parseInt(paperWeightStr) || 300;
  
  if (params.paperType === 'linen') paperWeight = 300;
  if (params.paperType === 'kraft') paperWeight = 300;
  if (params.paperType.startsWith('cardboard')) paperWeight = 300; // 'cardboard-ip'

  // Standardize family to match defaults
  const normalizedFamily = 
    paperFamily === 'cardboard' ? 'inderboard' : 
    paperFamily;

  const paperGrade = config.papers.find(p => p.id === normalizedFamily) || config.papers[0];
  const paperPricePerKg = paperGrade.weights.find(w => w.grammage === paperWeight)?.pricePerKg || paperGrade.weights[0]?.pricePerKg || 60000;

  // 3. Imposition Logic (Optimize Layout)
  // We attach a temporary cost to sheets to use the existing function, but will recalculate accurately below.
  const tempSheets = config.standardSheets.map(s => ({...s, pricePerSheet: 1000}));
  
  let layout;
  try {
    layout = calculateImposition(productW, productH, params.quantity, config.defaultMachine, tempSheets);
  } catch (e) {
    // Fallback for oversized items
    layout = {
      sheetId: 'custom',
      sheetWidth: productW + 5,
      sheetHeight: productH + 5,
      ups: 1,
      totalSheetsRequired: params.quantity + 200, // Waste
      usedAreaPercentage: 0.8
    };
  }

  // 4. Calculate Detailed Costs
  const totalSheets = layout.totalSheetsRequired;
  const sheetW = layout.sheetWidth / 100; // meters
  const sheetH = layout.sheetHeight / 100; // meters
  
  // A. Paper Cost (Weight Based)
  // Weight of one sheet (kg) = Area (m2) * gsm / 1000
  const sheetWeightKg = (sheetW * sheetH) * paperWeight / 1000;
  const totalPaperWeight = totalSheets * sheetWeightKg;
  const paperCost = totalPaperWeight * paperPricePerKg;

  // B. Print Cost (Machine)
  // Zincs: CMYK = 4 colors usually. If 'single' side 4 plates, 'double' side 8 plates (or 4 with work-and-turn)
  // Let's assume standard work-and-turn for double sided allows 4 plates, but doubles run time.
  const numColors = 4; // CMYK
  const zincCost = numColors * config.defaultMachine.plateCost * (params.sides === 'double' ? 2 : 1); 
  const printRunCost = (Math.ceil(totalSheets / 1000) * config.defaultMachine.runCostPer1000) * (params.sides === 'double' ? 2 : 1);
  const totalPrintCost = config.defaultMachine.setupCost + zincCost + printRunCost;

  // C. Finishing Cost
  let finishingCost = 0;
  
  // Laminate (Area based)
  const laminateType = config.finishes.find(f => f.id === params.laminate);
  if (laminateType && laminateType.type === 'sqm') {
    // Total Area = Sheet Area * Total Sheets * Sides
    const totalArea = (sheetW * sheetH) * totalSheets * (params.sides === 'double' ? 2 : 1);
    finishingCost += totalArea * laminateType.price;
  }

  // Extras
  params.extras.forEach(extraId => {
    // Map internal IDs to config IDs
    const mapId = extraId === 'rounded-corners' ? 'die-cut' : (extraId === 'spot-uv' ? 'uv-spot' : extraId);
    const finish = config.finishes.find(f => f.id === mapId);
    
    if (finish) {
      if (finish.type === 'fixed') {
        finishingCost += finish.price; // Mold cost
        finishingCost += (totalSheets * 500); // Nominal run cost for special effect
      } else if (finish.type === 'unit') {
        finishingCost += finish.price * params.quantity;
      }
    }
  });

  // 5. Total & Margin
  const productionCost = paperCost + totalPrintCost + finishingCost;
  let finalPrice = productionCost * config.profitMargin;
  
  if (params.deliverySpeed === 'rush') finalPrice *= config.rushMultiplier;

  // Round to nearest 5000 Tomans for cleanliness
  const total = Math.ceil(finalPrice / 5000) * 5000;

  // Delivery Date
  const days = params.deliverySpeed === 'rush' ? 3 : (params.quantity > 5000 ? 10 : 7);
  const date = new Date();
  date.setDate(date.getDate() + days);
  const deliveryDateStr = new Intl.DateTimeFormat('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);

  return {
    totalPrice: total,
    unitPrice: Math.round(total / params.quantity),
    basePrice: productionCost,
    paperCost: paperCost,
    printCost: totalPrintCost,
    finishingCost: finishingCost,
    deliveryDate: deliveryDateStr,
    details: layout
  };
};
