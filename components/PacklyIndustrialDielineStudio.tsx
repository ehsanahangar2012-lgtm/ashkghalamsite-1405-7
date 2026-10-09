import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Box, Layers, Rotate3d, Download, Play, Pause, RotateCcw, 
  Sparkles, Check, ChevronRight, Sliders, ShieldCheck, 
  HelpCircle, Printer, Eye, Maximize, ZoomIn, ZoomOut, RefreshCw, 
  FileText, Scissors, Ruler, Layers3, Activity, Info, CheckCircle2,
  ChevronDown, Database, Cpu, Compass, HardDrive, ArrowRight, X
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ThreeDPreview } from './ThreeDPreview';
import { STANDARD_DIELINE_ENGINES, calculateDielineParameters, DielineDims, DielineResult, FlapAndLockEngine } from '../services/dielineMath';

// ==========================================
// 1. ECMA & FEFCO PACKAGING CATALOG
// ==========================================

export interface IndustrialBoxModel {
  id: string;
  name: string;
  code: string;
  category: 'ECMA' | 'FEFCO';
  series: string;
  icon: string;
  defaultDims: { L: number; W: number; H: number };
  description: string;
  industry: string;
  difficulty: 'ساده' | 'متوسط' | 'پیشرفته';
  features: string[];
}

export const INDUSTRIAL_CATALOG: IndustrialBoxModel[] = [
  // ECMA Standard Series
  {
    id: 'ecma-a2020',
    name: 'جعبه درب دارویی دو طرف قفل (Straight Tuck End - STE)',
    code: 'ECMA A20.20.01.01',
    category: 'ECMA',
    series: 'Series A (Folding Cartons)',
    icon: '💊',
    defaultDims: { L: 80, W: 50, H: 140 },
    description: 'استاندارد مرجع صنایع دارویی و بهداشتی. زبانه‌های درب بالا و پایین از یک جهت باز و بسته می‌شوند با گوشواره‌های اصطکاکی ضدبازشدگی.',
    industry: 'داروسازی، آرایشی، دارویی، مکمل‌ها',
    difficulty: 'ساده',
    features: ['قفل اصطکاکی (Friction Lock)', 'لب‌چسب جانبی استاندارد', 'گوشواره‌های پخ‌دار ۱۵ درجه']
  },
  {
    id: 'ecma-a2021',
    name: 'جعبه درب مخالف دارویی (Reverse Tuck End - RTE)',
    code: 'ECMA A20.20.02.01',
    category: 'ECMA',
    series: 'Series A (Folding Cartons)',
    icon: '📦',
    defaultDims: { L: 90, W: 60, H: 150 },
    description: 'زبانه درب بالا از پشت و درب پایین از جلو بسته می‌شود. بالاترین راندمان چیدمان در شیت چاپی (Nesting) و کاهش ضایعات مقوا.',
    industry: 'عطر و ادکلن، لوازم آرایشی، بسته‌بندی عینک، قطعات الکترونیک',
    difficulty: 'ساده',
    features: ['راندمان لیتوگرافی حداکثری', 'تقارن برش خطوط', 'سرعت بالای مونتاژ دستی و اتوماتیک']
  },
  {
    id: 'ecma-snap-lock',
    name: 'جعبه کفی قفلی بدون چسب (1-2-3 Snap Lock / Himes Bottom)',
    code: 'ECMA A20.20.03.01',
    category: 'ECMA',
    series: 'Series A (Lock Bottoms)',
    icon: '📥',
    defaultDims: { L: 100, W: 70, H: 160 },
    description: 'کف جعبه از ۴ لت تداخل‌کننده تشکیل شده که بدون نیاز به چسب در یکدیگر قفل می‌شوند. ایده‌آل برای بارهای با وزن نیمه‌سنگین.',
    industry: 'اسباب‌بازی، مواد شوینده، شمع، بطری شیشه‌ای',
    difficulty: 'متوسط',
    features: ['تحمل وزن بالا در کف', 'عدم نیاز به خط چسب کفی', 'مونتاژ دستی سریع ۳ مرحله‌ای']
  },
  {
    id: 'fefco-0215',
    name: 'جعبه ته‌چسب اتوماتیک (Crash Lock / Auto Bottom)',
    code: 'ECMA A20.20.04.01 / FEFCO 0215',
    category: 'ECMA',
    series: 'Series A (Auto-Lock)',
    icon: '⚡',
    defaultDims: { L: 110, W: 80, H: 180 },
    description: 'با فشار دادن دو لبه جانبی، کف جعبه به‌طور خودکار در کسری از ثانیه باز و چفت می‌شود. استاندارد خطوط تولید پرسرعت صنعتی.',
    industry: 'لوازم یدکی، کارخانجات داروسازی پرتیراژ، مواد غذایی',
    difficulty: 'پیشرفته',
    features: ['باز شدن آنی در ۰.۵ ثانیه', 'مناسب دستگاه‌های جعبه‌پرکن خودکار', 'استحکام ضربه‌ای فوق‌العاده']
  },

  // FEFCO Corrugated Standards
  {
    id: 'fefco-0427',
    name: 'کارتن پستی کیبوردی دیواره دوبل (Mailer Box - FEFCO 0427)',
    code: 'FEFCO 0427',
    category: 'FEFCO',
    series: 'FEFCO 0400 (Folder Boxes)',
    icon: '📬',
    defaultDims: { L: 220, W: 160, H: 65 },
    description: 'محبوب‌ترین جعبه ارسال پستی و ایکامرس جهان با دیواره‌های دوبل جانبی، قفل‌های زبانه‌ای و درب یکپارچه کیبوردی.',
    industry: 'فروشگاه‌های اینترنتی، پوشاک، اشتراکی، هدیه، لوازم دیجیتال',
    difficulty: 'متوسط',
    features: ['مقاومت فشاری بالا در ارسال پستی', 'دیواره‌های دوبل جانبی بدون چسب', 'تجربه آنباکسینگ لوکس']
  },
  {
    id: 'fefco-0201',
    name: 'کارتن ۴ درب استاندارد صنعتی (Regular Slotted Container - RSC)',
    code: 'FEFCO 0201',
    category: 'FEFCO',
    series: 'FEFCO 0200 (Slotted Boxes)',
    icon: '🏭',
    defaultDims: { L: 350, W: 250, H: 200 },
    description: 'پرمصرف‌ترین کارتن ترابری جهان. درب‌های بالا و پایین در خط مرکزی به هم می‌رسند و با چسب پهن آب‌بندی می‌شوند.',
    industry: 'کارتن مادر، کارخانجات، صادرات، مواد غذایی، انبارداری',
    difficulty: 'ساده',
    features: ['کمترین دورریز ورق خام', 'حداکثر مقاومت BCT روی پالت', 'تولید با دستگاه فلکسو-فولدر-گلوئر']
  },
  {
    id: 'fefco-pizza',
    name: 'جعبه پیتزا و مواد غذایی (Pizza Box - FEFCO 0426)',
    code: 'FEFCO 0426',
    category: 'FEFCO',
    series: 'FEFCO 0400 (Folder Boxes)',
    icon: '🍕',
    defaultDims: { L: 300, W: 300, H: 45 },
    description: 'جعبه زاویه‌دار تهویه‌دار مخصوص فست‌فود و اقلام تخت. مجهز به منافذ خروج بخار و قفل‌های فشاری جانبی.',
    industry: 'فست‌فود، رستوران، قطعات تخت، بردهای الکترونیکی',
    difficulty: 'ساده',
    features: ['منافذ تهویه بخار داغ', 'مونتاژ فوری با ورق E-Flute', 'سطح یکپارچه بزرگ برای چاپ طرح']
  },
  {
    id: 'fefco-0203',
    name: 'کارتن درب تمام هم‌پوشان (Full Overlap - FOL)',
    code: 'FEFCO 0203',
    category: 'FEFCO',
    series: 'FEFCO 0200 (Slotted Boxes)',
    icon: '🛡️',
    defaultDims: { L: 280, W: 180, H: 180 },
    description: 'درب‌های کارتن به‌طور ۱۰۰٪ روی هم سوار می‌شوند و کفی دو لایه با مقاومت استثنایی در برابر نفوذ و ضربه ایجاد می‌کنند.',
    industry: 'کالاهای سنگین، چینی و بلور، مایعات، صنایع فلزی',
    difficulty: 'ساده',
    features: ['کف دوجداره فوق مستحکم', 'مقاومت بسیار بالا در برابر پارگی کف', 'تحمل بار انباشته روی پالت']
  }
];

// ==========================================
// 2. MATERIAL & CALIPER COMPENSATION MODELS
// ==========================================

export interface BoardMaterial {
  id: string;
  name: string;
  category: 'SBS' | 'FBB' | 'Kraft' | 'E-Flute' | 'B-Flute' | 'C-Flute' | 'BC-DoubleWall';
  thickness: number; // in mm
  weight: number; // in gsm
  description: string;
  colorHex: string;
  creaseAllowance: number; // in mm (0.5 * thickness for 90deg, 1.0 * thickness for 180deg)
  slotWidth: number; // in mm (width of cut slots)
  flutePitch?: number;
}

export const INDUSTRIAL_MATERIALS: BoardMaterial[] = [
  {
    id: 'sbs-300',
    name: 'مقوای ایندربرد / بهداشتی (FBB 300g)',
    category: 'FBB',
    thickness: 0.42,
    weight: 300,
    description: 'مغز سفید بهداشتی با گلاسه مرغوب دو رو. استاندارد جعبه‌های دارویی، آرایشی و غذایی ظریف.',
    colorHex: '#fafafa',
    creaseAllowance: 0.25,
    slotWidth: 0.8
  },
  {
    id: 'sbs-350',
    name: 'مقوای ایندربرد سنگین (FBB 350g)',
    category: 'FBB',
    thickness: 0.52,
    weight: 350,
    description: 'استحکام بالا، مقاومت عالی در برابر خط تا و شکستگی لبه‌ها. مناسب لوازم آرایشی و عطر.',
    colorHex: '#f5f5f5',
    creaseAllowance: 0.35,
    slotWidth: 1.0
  },
  {
    id: 'kraft-300',
    name: 'مقوای کرافت قهوه‌ای ارگانیک (Kraft 300g)',
    category: 'Kraft',
    thickness: 0.45,
    weight: 300,
    description: 'کاغذ کرافت بازیافتی با بافت فیبر سلولزی طبیعی و سازگار با محیط‌زیست.',
    colorHex: '#c2a278',
    creaseAllowance: 0.30,
    slotWidth: 0.9
  },
  {
    id: 'eflute-micro',
    name: 'کارتن سینگل فلوت ریز (E-Flute 1.5mm)',
    category: 'E-Flute',
    thickness: 1.50,
    weight: 420,
    description: 'کارتن فلوت فشرده با چاپ‌پذیری بالا. استاندارد اول جعبه‌های پستی و فست‌فود.',
    colorHex: '#c8b195',
    creaseAllowance: 0.90,
    slotWidth: 2.2,
    flutePitch: 3.5
  },
  {
    id: 'bflute-shipping',
    name: 'کارتن ۳ لایه فلوت متوسط (B-Flute 3.0mm)',
    category: 'B-Flute',
    thickness: 3.00,
    weight: 540,
    description: 'کارتن ۳ لایه ضربه‌گیر برای حمل کالا، لوازم خانگی و کارتن‌های تجاری متوسط.',
    colorHex: '#bda07c',
    creaseAllowance: 1.80,
    slotWidth: 4.0,
    flutePitch: 6.5
  },
  {
    id: 'cflute-heavy',
    name: 'کارتن ۳ لایه فلوت درشت (C-Flute 4.0mm)',
    category: 'C-Flute',
    thickness: 4.00,
    weight: 600,
    description: 'کارتن مادر صنعتی با جذب ضربه بالا و مقاومت فشرده‌سازی عمودی عالی.',
    colorHex: '#b4946d',
    creaseAllowance: 2.40,
    slotWidth: 5.2,
    flutePitch: 8.0
  },
  {
    id: 'bc-doublewall',
    name: 'کارتن ۵ لایه صادراتی دوجداره (BC-Flute 6.8mm)',
    category: 'BC-DoubleWall',
    thickness: 6.80,
    weight: 850,
    description: 'کارتن ۵ لایه سنگین برای صادرات صنعتی، قطعات خودرو و محموله‌های سنگین وزن.',
    colorHex: '#a38158',
    creaseAllowance: 4.20,
    slotWidth: 8.5,
    flutePitch: 14.5
  }
];

// ==========================================
// 3. PACKLY INDUSTRIAL DIELINE STUDIO COMPONENT
// ==========================================

export interface PacklyStudioProps {
  initialModelId?: string;
  onSaveDieline?: (data: { model: IndustrialBoxModel; dims: { L: number; W: number; H: number }; material: BoardMaterial; dxf: string }) => void;
  onSaveProject?: (project: any) => void;
  onClose?: () => void;
}

export const PacklyIndustrialDielineStudio: React.FC<PacklyStudioProps> = ({
  initialModelId = 'ecma-a2020',
  onSaveDieline,
  onSaveProject,
  onClose
}) => {
  // 1. Model & Geometry State
  const [selectedModel, setSelectedModel] = useState<IndustrialBoxModel>(() => {
    return INDUSTRIAL_CATALOG.find(m => m.id === initialModelId) || INDUSTRIAL_CATALOG[0];
  });

  const [dims, setDims] = useState<{ L: number; W: number; H: number }>(() => {
    const found = INDUSTRIAL_CATALOG.find(m => m.id === initialModelId) || INDUSTRIAL_CATALOG[0];
    return { ...found.defaultDims };
  });

  const [selectedMaterial, setSelectedMaterial] = useState<BoardMaterial>(INDUSTRIAL_MATERIALS[0]);
  const [grainDirection, setGrainDirection] = useState<'long' | 'short'>('long');

  // 2. View Mode & 2D/3D Split
  const [activeWorkspaceMode, setActiveWorkspaceMode] = useState<'split' | '2d_only' | '3d_only'>('split');
  const [viewTab, setViewTab] = useState<'catalog' | 'dimensions' | 'material' | 'layers' | 'export'>('dimensions');

  // 3. Layer Visibility Toggles (2D Drafting)
  const [visibleLayers, setVisibleLayers] = useState({
    cut: true,
    crease: true,
    perf: true,
    glue: true,
    dimensions: true,
    bleed: true,
    grain: true
  });

  // 4. 3D Kinematic Folding Simulator State
  const [foldRatio, setFoldRatio] = useState<number>(1.0); // 0.0 (Unfolded) to 1.0 (Fully Closed)
  const [isPlayingFolding, setIsPlayingFolding] = useState<boolean>(false);
  const [foldingSpeed, setFoldingSpeed] = useState<number>(1.0);
  const [viewAngle, setViewAngle] = useState<'perspective' | 'front' | 'top' | 'side'>('perspective');
  const [showWireframe, setShowWireframe] = useState<boolean>(false);

  // 5. 2D Canvas Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // 6. UI Drawers & Smart Help
  const [showSmartHelp, setShowSmartHelp] = useState<boolean>(false);
  const [showExportSuccessToast, setShowExportSuccessToast] = useState<string | null>(null);

  // Synchronize dims when model changes if user chooses standard
  const handleSelectModel = (model: IndustrialBoxModel) => {
    setSelectedModel(model);
    setDims({ ...model.defaultDims });
  };

  // ==========================================
  // MATHEMATICAL DIELINE CALCULATION WITH CALIPER COMPENSATION
  // ==========================================
  const dielineResult = useMemo<DielineResult>(() => {
    const engine = STANDARD_DIELINE_ENGINES[selectedModel.id] || STANDARD_DIELINE_ENGINES['ecma-a2020'];
    
    // Apply Caliper Compensation formulas:
    // Effective internal dimensions + fiber bend allowance
    const t = selectedMaterial.thickness;
    const effL = dims.L + (grainDirection === 'long' ? 0.3 * t : 0.5 * t);
    const effW = dims.W + (grainDirection === 'long' ? 0.5 * t : 0.3 * t);
    const effH = dims.H + 0.4 * t;
    
    // Calculate standard parameters with thickness safety margins
    const params = calculateDielineParameters(effL, effW, effH, t, selectedModel.id);
    
    const calculated = engine({
      L: effL,
      W: effW,
      H: effH,
      glueTab: params.glueTab + Math.max(0, t * 1.5),
      tuck: params.tuck + Math.max(0, t * 1.2),
      dustFlap: params.dustFlap,
      thickness: t,
      x0: 0
    });

    return calculated;
  }, [selectedModel, dims, selectedMaterial, grainDirection]);

  // Animation Loop for Kinematic Folding
  useEffect(() => {
    let animFrame: number;
    if (isPlayingFolding) {
      let stepDir = 1;
      const step = () => {
        setFoldRatio(prev => {
          let next = prev + 0.008 * foldingSpeed * stepDir;
          if (next >= 1.0) {
            next = 1.0;
            stepDir = -1;
          } else if (next <= 0.0) {
            next = 0.0;
            stepDir = 1;
          }
          return next;
        });
        animFrame = requestAnimationFrame(step);
      };
      animFrame = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animFrame);
  }, [isPlayingFolding, foldingSpeed]);

  // 2D Pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) { // Left or middle click
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoomLevel(prev => Math.min(4.0, Math.max(0.3, prev * zoomFactor)));
  };

  const reset2DView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // ==========================================
  // OFFLINE MULTI-LAYER AUTOCAD DXF EXPORTER
  // ==========================================
  const handleExportDXF = () => {
    let dxf = '';
    // Header & Tables
    dxf += '0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n';
    dxf += '0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n5\n';
    
    // Layers Definition: CUT (Red), CREASE (Blue), PERF (Green), BLEED (Cyan), DIMS (Magenta)
    dxf += '0\nLAYER\n2\n0_CUT\n70\n0\n62\n1\n6\nCONTINUOUS\n0\n';
    dxf += '0\nLAYER\n2\n0_CREASE\n70\n0\n62\n5\n6\nDASHED\n0\n';
    dxf += '0\nLAYER\n2\n0_PERF\n70\n0\n62\n3\n6\nDOT2\n0\n';
    dxf += '0\nLAYER\n2\n0_BLEED\n70\n0\n62\n4\n6\nCONTINUOUS\n0\n';
    dxf += '0\nLAYER\n2\n0_DIMENSIONS\n70\n0\n62\n6\n6\nCONTINUOUS\n0\n';
    dxf += 'ENDTAB\n0\nENDSEC\n';

    // Entities Section
    dxf += '0\nSECTION\n2\nENTITIES\n';

    // Parse SVG Path to DXF Lines (Helper parser for M and L commands)
    const writeSvgPathToDxf = (svgPath: string, layerName: string) => {
      if (!svgPath) return;
      const tokens = svgPath.trim().split(/\s+/);
      let currentX = 0;
      let currentY = 0;
      let startX = 0;
      let startY = 0;
      let mode: 'M' | 'L' | 'A' | 'Z' | null = null;

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token === 'M' || token === 'L' || token === 'A' || token === 'Z') {
          mode = token;
          continue;
        }

        if (mode === 'M') {
          const coords = token.split(',');
          if (coords.length >= 2) {
            currentX = parseFloat(coords[0]);
            currentY = parseFloat(coords[1]);
            startX = currentX;
            startY = currentY;
          }
        } else if (mode === 'L') {
          const coords = token.split(',');
          if (coords.length >= 2) {
            const nextX = parseFloat(coords[0]);
            const nextY = parseFloat(coords[1]);
            if (!isNaN(currentX) && !isNaN(currentY) && !isNaN(nextX) && !isNaN(nextY)) {
              // Write DXF LINE entity
              dxf += `0\nLINE\n8\n${layerName}\n`;
              dxf += `10\n${currentX.toFixed(3)}\n20\n${(-currentY).toFixed(3)}\n30\n0.0\n`;
              dxf += `11\n${nextX.toFixed(3)}\n21\n${(-nextY).toFixed(3)}\n31\n0.0\n`;
            }
            currentX = nextX;
            currentY = nextY;
          }
        } else if (mode === 'Z') {
          if (!isNaN(currentX) && !isNaN(startX)) {
            dxf += `0\nLINE\n8\n${layerName}\n`;
            dxf += `10\n${currentX.toFixed(3)}\n20\n${(-currentY).toFixed(3)}\n30\n0.0\n`;
            dxf += `11\n${startX.toFixed(3)}\n21\n${(-startY).toFixed(3)}\n31\n0.0\n`;
          }
        }
      }
    };

    // Add Cuts
    (dielineResult.cuts || []).forEach(cutPath => writeSvgPathToDxf(cutPath, '0_CUT'));
    // Add Creases
    (dielineResult.creases || []).forEach(creasePath => writeSvgPathToDxf(creasePath, '0_CREASE'));
    // Add Bleeds
    (dielineResult.bleeds || []).forEach(bleedPath => writeSvgPathToDxf(bleedPath, '0_BLEED'));

    dxf += '0\nENDSEC\n0\nEOF\n';

    // Trigger Offline Download
    const blob = new Blob([dxf], { type: 'application/dxf;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ashk_dieline_${selectedModel.id}_${dims.L}x${dims.W}x${dims.H}mm.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportSuccessToast('فایل DXF استاندارد چندلایه (تیغ و تا) برای دستگاه لترپرس و لیزر با موفقیت تولید و دانلود شد.');
  };

  // ==========================================
  // OFFLINE TECHNICAL PDF SPEC SHEET EXPORTER
  // ==========================================
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: dielineResult.totalW > dielineResult.totalH ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Header Banner
    doc.setFillColor(15, 23, 42); // Slate-900
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('ASHK GHALAM CAD STUDIO - INDUSTRIAL DIELINE SHEET', 12, 11);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Model: ${selectedModel.code} - ${selectedModel.name}`, 12, 18);

    const shamsiDate = new Intl.DateTimeFormat('fa-IR').format(new Date());
    doc.text(`Date: ${shamsiDate}`, pageWidth - 45, 11);
    doc.text(`Scale: 1:1 Vector Ready`, pageWidth - 45, 18);

    // 2. Technical Parameter Box
    doc.setFillColor(248, 250, 252);
    doc.rect(10, 28, pageWidth - 20, 26, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(10, 28, pageWidth - 20, 26, 'S');

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);
    doc.text(`Internal Dims (L x W x H): ${dims.L} x ${dims.W} x ${dims.H} mm`, 14, 35);
    doc.text(`Material Type: ${selectedMaterial.name} (${selectedMaterial.weight} gsm)`, 14, 42);
    doc.text(`Caliper Thickness: ${selectedMaterial.thickness} mm (Allowance: ${selectedMaterial.creaseAllowance} mm)`, 14, 49);

    doc.text(`Flat Sheet Size: ${Math.round(dielineResult.totalW)} x ${Math.round(dielineResult.totalH)} mm`, pageWidth / 2 + 5, 35);
    doc.text(`Grain Direction: ${grainDirection === 'long' ? 'Parallel to Length (Long)' : 'Parallel to Width (Short)'}`, pageWidth / 2 + 5, 42);
    doc.text(`Die-cut Layers: Red = CUT (تیغ برش) | Blue = CREASE (خط تا) | Cyan = BLEED`, pageWidth / 2 + 5, 49);

    // 3. Render 2D Vector Dieline in Center
    const margin = 20;
    const maxDrawWidth = pageWidth - margin * 2;
    const maxDrawHeight = pageHeight - 65 - margin;
    const scale = Math.min(maxDrawWidth / (dielineResult.totalW || 100), maxDrawHeight / (dielineResult.totalH || 100));

    const drawOffsetX = margin + (maxDrawWidth - dielineResult.totalW * scale) / 2;
    const drawOffsetY = 60 + (maxDrawHeight - dielineResult.totalH * scale) / 2;

    // Background bounding area
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.rect(drawOffsetX, drawOffsetY, dielineResult.totalW * scale, dielineResult.totalH * scale, 'S');

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('اشک قلم - سیستم مکانیزه طراحی و لیتوگرافی قالب دایکات | تمامی حقوق فنی محفوظ است.', pageWidth / 2, pageHeight - 6, { align: 'center' });

    doc.save(`ashk_technical_sheet_${selectedModel.id}_${dims.L}x${dims.W}x${dims.H}mm.pdf`);
    setShowExportSuccessToast('نقشه فنی مهندسی با جدول مشخصات صنعتی و مقیاس دقیق به صورت PDF ذخیره شد.');
  };

  return (
    <div className="flex flex-col h-full min-h-[750px] w-full bg-[#05080f] text-slate-100 font-sans select-none overflow-hidden rounded-2xl border border-slate-800 shadow-2xl relative" dir="rtl">
      
      {/* 1. TOP INDUSTRIAL TOOLBAR */}
      <div className="h-14 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/90 px-4 flex items-center justify-between z-30 shrink-0">
        
        {/* Left/Right Logo & Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Box className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-tight">استودیو دایلاین صنعتی اشک قلم</h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/40">
                Packly Grade CAD
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 font-medium">
              {selectedModel.code} • {selectedModel.name}
            </p>
          </div>
        </div>

        {/* Center Workspace View Splitter */}
        <div className="hidden md:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveWorkspaceMode('split')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeWorkspaceMode === 'split' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers3 className="w-3.5 h-3.5" />
            <span>نمای همزمان (۲D + ۳D)</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode('2d_only')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeWorkspaceMode === '2d_only' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>نقشه مهندسی دوبعدی</span>
          </button>
          <button
            onClick={() => setActiveWorkspaceMode('3d_only')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeWorkspaceMode === '3d_only' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rotate3d className="w-3.5 h-3.5" />
            <span>شبیه‌ساز کینماتیک ۳D</span>
          </button>
        </div>

        {/* Action Controls & Smart Help Button */}
        <div className="flex items-center gap-2">
          {/* Smart Help Button */}
          <button
            onClick={() => setShowSmartHelp(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="راهنمای هوشمند دایلاین و محاسبات قالب"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">راهنمای هوشمند</span>
          </button>

          {/* Export Quick Button */}
          <button
            onClick={handleExportDXF}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>خروجی DXF لیزر</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors cursor-pointer"
              title="خروج از استودیو"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN WORKSPACE CONTAINER (Sidebar + Canvases) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">

        {/* LEFT / RIGHT PARAMETRIC CONTROL SIDEBAR */}
        <div className="w-full md:w-84 bg-[#080d17] border-l border-slate-800/80 flex flex-col shrink-0 z-20 overflow-y-auto custom-scrollbar">
          
          {/* Control Navigation Tabs */}
          <div className="grid grid-cols-4 p-1.5 bg-slate-950/80 border-b border-slate-800/80 gap-1 text-[11px] font-bold">
            <button
              onClick={() => setViewTab('dimensions')}
              className={`py-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                viewTab === 'dimensions' 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-extrabold' 
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>ابعاد و قالب</span>
            </button>

            <button
              onClick={() => setViewTab('catalog')}
              className={`py-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                viewTab === 'catalog' 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-extrabold' 
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>مدل‌ها</span>
            </button>

            <button
              onClick={() => setViewTab('material')}
              className={`py-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                viewTab === 'material' 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-extrabold' 
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>جبران ضخامت</span>
            </button>

            <button
              onClick={() => setViewTab('export')}
              className={`py-2 rounded-lg transition-all flex flex-col items-center gap-1 cursor-pointer ${
                viewTab === 'export' 
                  ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 font-extrabold' 
                  : 'text-slate-400 hover:bg-slate-900'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>خروجی CAD</span>
            </button>
          </div>

          {/* TAB 1: DIMENSIONS & SHAPE EDITING */}
          {viewTab === 'dimensions' && (
            <div className="p-4 space-y-4">
              
              {/* Selected Model Card */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{selectedModel.icon}</span>
                    <span>{selectedModel.name}</span>
                  </span>
                  <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/30">
                    {selectedModel.code}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-normal">
                  {selectedModel.description}
                </p>
              </div>

              {/* Parametric Dimension Inputs (L, W, H) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-4 h-4 text-indigo-400" />
                    <span>ابعاد داخلی مفید کارتن (میلی‌متر)</span>
                  </span>
                  <span className="text-[9.5px] text-amber-400 font-mono">Real-time CAD</span>
                </div>

                {/* Length (L) */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">طول مفید (L - Length):</span>
                    <span className="font-mono font-bold text-amber-300">{dims.L} mm</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="600"
                    value={dims.L}
                    onChange={e => setDims(d => ({ ...d, L: Number(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[50, 80, 120, 200, 300].map(v => (
                      <button
                        key={v}
                        onClick={() => setDims(d => ({ ...d, L: v }))}
                        className={`text-[9.5px] px-2 py-0.5 rounded border transition-colors ${dims.L === v ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Width (W) */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">عرض مفید (W - Width):</span>
                    <span className="font-mono font-bold text-indigo-300">{dims.W} mm</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="450"
                    value={dims.W}
                    onChange={e => setDims(d => ({ ...d, W: Number(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[40, 60, 90, 150, 220].map(v => (
                      <button
                        key={v}
                        onClick={() => setDims(d => ({ ...d, W: v }))}
                        className={`text-[9.5px] px-2 py-0.5 rounded border transition-colors ${dims.W === v ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Height (H) */}
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-bold">ارتفاع مفید (H - Height):</span>
                    <span className="font-mono font-bold text-emerald-300">{dims.H} mm</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    value={dims.H}
                    onChange={e => setDims(d => ({ ...d, H: Number(e.target.value) }))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                  <div className="flex gap-1.5 pt-1">
                    {[50, 100, 140, 200, 320].map(v => (
                      <button
                        key={v}
                        onClick={() => setDims(d => ({ ...d, H: v }))}
                        className={`text-[9.5px] px-2 py-0.5 rounded border transition-colors ${dims.H === v ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-900 text-slate-400 border-slate-800'}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Total Sheet & Production Footprint Metrics */}
              <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                <span className="font-bold text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span>ابعاد گسترده ورق و مشخصات قالب:</span>
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                    <span className="text-slate-400 block text-[10px]">عرض شیت باز:</span>
                    <span className="font-bold text-amber-300">{Math.round(dielineResult.totalW)} mm</span>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-850">
                    <span className="text-slate-400 block text-[10px]">طول شیت باز:</span>
                    <span className="font-bold text-amber-300">{Math.round(dielineResult.totalH)} mm</span>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-900">
                  <span>لب‌چسب (Glue Tab):</span>
                  <span className="font-mono text-white">{dielineResult.glueTab || 15} mm</span>
                </div>
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>زبانه قفل درب (Tuck):</span>
                  <span className="font-mono text-white">{dielineResult.tuck || 18} mm</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STANDARDS CATALOG SELECTOR */}
          {viewTab === 'catalog' && (
            <div className="p-4 space-y-3">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800">
                <span>استانداردهای بین‌المللی ECMA و FEFCO</span>
                <span className="text-[10px] text-indigo-400 font-mono">{INDUSTRIAL_CATALOG.length} الگو</span>
              </div>

              <div className="space-y-2">
                {INDUSTRIAL_CATALOG.map(model => {
                  const isSelected = selectedModel.id === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => handleSelectModel(model)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-indigo-950/70 to-slate-900 border-indigo-500 shadow-md shadow-indigo-950/40' 
                          : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{model.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{model.name}</span>
                            </div>
                            <span className="text-[9.5px] font-mono text-indigo-400">{model.code}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                      </div>

                      <p className="text-[10.5px] text-slate-400 mt-2 leading-relaxed">
                        {model.description}
                      </p>

                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {model.features.map((feat, idx) => (
                          <span key={idx} className="text-[9px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: MATERIAL CALIPER & COMPOSITION */}
          {viewTab === 'material' && (
            <div className="p-4 space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800">
                <span>موتور کسر ضخامت مقوا (Caliper Creep)</span>
                <span className="text-[9.5px] text-amber-400 font-mono">Zero Collision</span>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                در تا کردن مقوا و کارتن، ضخامت ورق باعث جابجایی خطوط تا نسبت به لبه‌ها می‌شود. این موتور به‌صورت خودکار فواصل لت‌ها را محاسبه و جبران می‌کند.
              </p>

              {/* Material Selector List */}
              <div className="space-y-2">
                {INDUSTRIAL_MATERIALS.map(mat => {
                  const isSelected = selectedMaterial.id === mat.id;
                  return (
                    <div
                      key={mat.id}
                      onClick={() => setSelectedMaterial(mat)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500 shadow-md shadow-amber-950/30' 
                          : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3.5 h-3.5 rounded-full border border-white/20" 
                            style={{ backgroundColor: mat.colorHex }}
                          />
                          <span className="text-xs font-bold text-white">{mat.name}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-300">{mat.thickness} mm</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 mt-2">
                        <div>گرماژ: <strong className="text-slate-200 font-mono">{mat.weight} gsm</strong></div>
                        <div>جبران تا: <strong className="text-emerald-400 font-mono">+{mat.creaseAllowance} mm</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Grain Direction Selector */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 block">جهت خواب الیاف مقوا (Grain Direction):</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setGrainDirection('long')}
                    className={`p-2 rounded-lg border font-bold transition-all ${
                      grainDirection === 'long' 
                        ? 'bg-indigo-600 text-white border-indigo-500' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    طولی (موازی طول L)
                  </button>
                  <button
                    onClick={() => setGrainDirection('short')}
                    className={`p-2 rounded-lg border font-bold transition-all ${
                      grainDirection === 'short' 
                        ? 'bg-indigo-600 text-white border-indigo-500' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    عرضی (موازی عرض W)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EXPORT INDUSTRIAL PACKAGES */}
          {viewTab === 'export' && (
            <div className="p-4 space-y-4">
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between pb-1 border-b border-slate-800">
                <span>خروجی‌های آماده تولید و ساخت قالب</span>
                <span className="text-[9.5px] text-emerald-400 font-mono">100% Vector</span>
              </div>

              <div className="space-y-3">
                {/* 1. DXF Button */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Scissors className="w-4 h-4 text-emerald-400" />
                      <span>فایل DXF چندلایه اتوکد</span>
                    </span>
                    <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                      Laser CNC
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    مستقیماً قابل بارگذاری در دستگاه‌های لیزر برش تخته قالب (Laser Die Board Cutter) با لایه‌های تفکیک شده تیغ (قرمز) و تا (آبی).
                  </p>
                  <button
                    onClick={handleExportDXF}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود فایل DXF (.dxf)</span>
                  </button>
                </div>

                {/* 2. PDF Technical Sheet */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <Printer className="w-4 h-4 text-indigo-400" />
                      <span>شیت فنی و تاییدیه کارفرما (PDF)</span>
                    </span>
                    <span className="text-[9px] bg-indigo-950 text-indigo-300 px-1.5 py-0.5 rounded font-mono">
                      A4 Spec
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    سند رسمی مقیاس ۱:۱ شامل جدول ابعاد داخلی، متریال، ضخامت، جهت الیاف، بارکد استاندارد و جای امضای تاییدیه فنی.
                  </p>
                  <button
                    onClick={handleExportPDF}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>دانلود شیت فنی مهندسی (PDF)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CENTER / RIGHT DISPLAY WORKSPACE (2D & 3D Split) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative bg-[#04070d]">
          
          {/* 1. 2D DRAFTING CANVAS (Visible if mode is split or 2d_only) */}
          {(activeWorkspaceMode === 'split' || activeWorkspaceMode === '2d_only') && (
            <div 
              className={`relative flex-1 flex flex-col border-b md:border-b-0 md:border-l border-slate-800/80 overflow-hidden ${
                activeWorkspaceMode === '2d_only' ? 'w-full' : 'md:w-1/2'
              }`}
            >
              {/* 2D Header Controls */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-[11px] font-bold text-slate-300 px-2 flex items-center gap-1">
                  <Ruler className="w-3.5 h-3.5 text-indigo-400" />
                  <span>نقشه مهندسی ۲D</span>
                </span>
                <div className="h-3.5 w-px bg-slate-800 my-auto" />
                <button
                  onClick={() => setZoomLevel(z => Math.min(4.0, z * 1.2))}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="بزرگنمایی (+)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.3, z * 0.8))}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="کوچکنمایی (-)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={reset2DView}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors cursor-pointer"
                  title="بازنشانی موقعیت (Reset View)"
                >
                  <Maximize className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2D Legend Color Bar */}
              <div className="absolute bottom-3 right-3 z-10 flex flex-wrap items-center gap-2.5 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 bg-rose-500 rounded-full inline-block" />
                  <span className="text-slate-300 font-bold">خط برش (Cut)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-b-2 border-dashed border-sky-400 inline-block" />
                  <span className="text-slate-300 font-bold">خط تا (Crease)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-b-2 border-dotted border-emerald-400 inline-block" />
                  <span className="text-slate-300 font-bold">پرفراژ (Perf)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-2 bg-amber-500/20 border border-amber-500/40 rounded inline-block" />
                  <span className="text-slate-300 font-bold">محدوده چسب</span>
                </div>
              </div>

              {/* Interactive Vector SVG Canvas with Pan/Zoom */}
              <div 
                className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden relative"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleCanvasWheel}
              >
                {/* Precision Background CAD Grid */}
                <div className="absolute inset-0 opacity-15 pointer-events-none" 
                  style={{
                    backgroundImage: 'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                  }} 
                />

                <div 
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                    transition: isPanning ? 'none' : 'transform 0.15s ease-out'
                  }}
                  className="flex items-center justify-center p-8"
                >
                  <svg
                    width={dielineResult.totalW || 400}
                    height={dielineResult.totalH || 350}
                    viewBox={`${dielineResult.xMin ?? 0} ${dielineResult.yMin ?? 0} ${dielineResult.totalW || 400} ${dielineResult.totalH || 350}`}
                    className="drop-shadow-2xl overflow-visible"
                    style={{ maxWidth: '90vw', maxHeight: '80vh' }}
                  >
                    {/* 1. Glue Areas */}
                    {(dielineResult.glues || []).map((gluePath, idx) => (
                      <path
                        key={`glue-${idx}`}
                        d={gluePath}
                        fill="rgba(245, 158, 11, 0.25)"
                        stroke="#f59e0b"
                        strokeWidth="0.8"
                        strokeDasharray="2,2"
                      />
                    ))}

                    {/* 2. Crease Lines (Dashed Blue) */}
                    {(dielineResult.creases || []).map((creasePath, idx) => (
                      <path
                        key={`crease-${idx}`}
                        d={creasePath}
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        strokeDasharray="4,3"
                        strokeLinecap="round"
                      />
                    ))}

                    {/* 3. Perforation Lines (Dotted Green) */}
                    {(dielineResult.perforations || []).map((perfPath, idx) => (
                      <path
                        key={`perf-${idx}`}
                        d={perfPath}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="1.2"
                        strokeDasharray="2,2"
                        strokeLinecap="round"
                      />
                    ))}

                    {/* 4. Cut Lines (Solid Red) */}
                    {(dielineResult.cuts || []).map((cutPath, idx) => (
                      <path
                        key={`cut-${idx}`}
                        d={cutPath}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* 2. 3D KINEMATIC FOLDING SIMULATOR (Visible if mode is split or 3d_only) */}
          {(activeWorkspaceMode === 'split' || activeWorkspaceMode === '3d_only') && (
            <div 
              className={`relative flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#060a14] to-[#03050a] ${
                activeWorkspaceMode === '3d_only' ? 'w-full' : 'md:w-1/2'
              }`}
            >
              {/* 3D View Angle & Orbit Toolbar */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 text-xs">
                <span className="text-[11px] font-bold text-slate-300 px-2 flex items-center gap-1">
                  <Rotate3d className="w-3.5 h-3.5 text-amber-400" />
                  <span>کینماتیک تاشدن ۳D</span>
                </span>
                <div className="h-3.5 w-px bg-slate-800 my-auto" />
                <button
                  onClick={() => setViewAngle('perspective')}
                  className={`px-2 py-1 rounded text-[10.5px] font-bold transition-all ${viewAngle === 'perspective' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  ۳D پرسپکتیو
                </button>
                <button
                  onClick={() => setViewAngle('front')}
                  className={`px-2 py-1 rounded text-[10.5px] font-bold transition-all ${viewAngle === 'front' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  روبرو
                </button>
                <button
                  onClick={() => setViewAngle('top')}
                  className={`px-2 py-1 rounded text-[10.5px] font-bold transition-all ${viewAngle === 'top' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                >
                  بالا
                </button>
                <button
                  onClick={() => setShowWireframe(!showWireframe)}
                  className={`p-1.5 rounded-lg transition-colors ${showWireframe ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="نمایش اسکلت خطوط (Wireframe)"
                >
                  <Compass className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 3D Scene Viewport */}
              <div className="flex-1 w-full h-full">
                <ThreeDPreview
                  width={dims.L}
                  height={dims.H}
                  depth={dims.W}
                  color={selectedMaterial.colorHex}
                  isOpenRatio={1.0 - foldRatio}
                  autoRotate={false}
                  wireframe={showWireframe}
                  viewAngle={viewAngle}
                  paperType={selectedMaterial.category === 'Kraft' ? 'kraft' : (selectedMaterial.category.includes('Flute') ? 'corrugated' : 'coated')}
                  materialThickness={selectedMaterial.thickness}
                  selectedModelId={selectedModel.id}
                />
              </div>

              {/* STEP-BY-STEP FOLDING TIMELINE SLIDER CONTROLS (PACKLY STYLE) */}
              <div className="p-4 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 space-y-3 z-10">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlayingFolding(!isPlayingFolding)}
                      className="w-7 h-7 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                      title={isPlayingFolding ? 'توقف انیمیشن' : 'پخش انیمیشن باز/بسته شدن'}
                    >
                      {isPlayingFolding ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => { setIsPlayingFolding(false); setFoldRatio(0.0); }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10.5px] font-bold border border-slate-800"
                    >
                      گسترده (۰٪)
                    </button>

                    <button
                      onClick={() => { setIsPlayingFolding(false); setFoldRatio(1.0); }}
                      className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10.5px] font-bold border border-slate-800"
                    >
                      بسته کامل (۱۰۰٪)
                    </button>
                  </div>

                  {/* Folding Phase Indicator Text */}
                  <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <span>مرحله تاشدن:</span>
                    <span className="font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {Math.round(foldRatio * 100)}%
                    </span>
                    <span className="text-slate-400 font-normal">
                      {foldRatio <= 0.05 && 'ورق خام باز شده'}
                      {foldRatio > 0.05 && foldRatio <= 0.40 && 'تا خوردن بدنه و لب‌چسب'}
                      {foldRatio > 0.40 && foldRatio <= 0.75 && 'بستن کفی و زبانه‌های مهار'}
                      {foldRatio > 0.75 && 'قفل کامل درب و گوشواره‌ها'}
                    </span>
                  </div>
                </div>

                {/* Precision Interactive Step Slider */}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={foldRatio}
                  onChange={e => {
                    setIsPlayingFolding(false);
                    setFoldRatio(parseFloat(e.target.value));
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />

                {/* 4 Discrete Step Markers */}
                <div className="grid grid-cols-4 gap-1 text-[9.5px] text-slate-400 text-center font-bold">
                  <button 
                    onClick={() => { setIsPlayingFolding(false); setFoldRatio(0.0); }}
                    className={`py-1 rounded transition-colors ${foldRatio === 0 ? 'text-amber-400 bg-amber-500/10' : 'hover:text-slate-200'}`}
                  >
                    ۱. ورق گسترده
                  </button>
                  <button 
                    onClick={() => { setIsPlayingFolding(false); setFoldRatio(0.35); }}
                    className={`py-1 rounded transition-colors ${foldRatio > 0.2 && foldRatio < 0.5 ? 'text-amber-400 bg-amber-500/10' : 'hover:text-slate-200'}`}
                  >
                    ۲. بدنه و لب‌چسب
                  </button>
                  <button 
                    onClick={() => { setIsPlayingFolding(false); setFoldRatio(0.70); }}
                    className={`py-1 rounded transition-colors ${foldRatio >= 0.5 && foldRatio < 0.9 ? 'text-amber-400 bg-amber-500/10' : 'hover:text-slate-200'}`}
                  >
                    ۳. کف و گردگیرها
                  </button>
                  <button 
                    onClick={() => { setIsPlayingFolding(false); setFoldRatio(1.0); }}
                    className={`py-1 rounded transition-colors ${foldRatio >= 0.9 ? 'text-amber-400 bg-amber-500/10' : 'hover:text-slate-200'}`}
                  >
                    ۴. قفل نهایی درب
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. SMART HELP MODAL (راهنمای هوشمند دایلاین) */}
      <AnimatePresence>
        {showSmartHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setShowSmartHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-slate-900 border border-amber-500/30 rounded-3xl max-w-2xl w-full p-6 text-right space-y-4 shadow-2xl shadow-amber-950/40"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm">
                  <Sparkles className="w-5 h-5" />
                  <span>راهنمای جامع هوشمند استودیو دایلاین صنعتی اشک قلم</span>
                </div>
                <button
                  onClick={() => setShowSmartHelp(false)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-amber-300">۱. استاندارد کدهای ECMA و FEFCO چیست؟</h4>
                  <p>
                    کدهای <strong>ECMA</strong> مرجع جهانی کارتن‌های مقوایی و جعبه‌های دارویی (Folding Cartons) هستند و کدهای <strong>FEFCO</strong> استانداردهای بین‌المللی کارتن‌های کنگره‌ای (Corrugated Boxes) می‌باشند که ساختار هندسی و خطوط تا و برش را استانداردسازی می‌کنند.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-indigo-300">۲. کسر ضخامت مقوا (Caliper Creep) چگونه کار می‌کند؟</h4>
                  <p>
                    هنگامی که ورق مقوا با ضخامت <code>t</code> تا می‌خورد، طول لت‌های داخلی باید به اندازه <code>0.5 × t</code> برای تا ۹۰ درجه و <code>1.0 × t</code> برای تا ۱۸۰ درجه کاهش یابد تا از تداخل لبه‌ها و بادکردگی جعبه جلوگیری شود. سیستم این محاسبات را به‌صورت خودکار در خروجی DXF اعمال می‌کند.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <h4 className="font-bold text-emerald-300">۳. لایه‌های استاندارد فایل DXF برای دستگاه لیزر</h4>
                  <p>
                    فایل DXF تولیدشده دارای لایه‌های استاندارد جهانی است:
                    <br />
                    • لایه <code>0_CUT</code> (قرمز): تیغ برش بیرونی
                    <br />
                    • لایه <code>0_CREASE</code> (آبی): خطوط تا و خط‌تا
                    <br />
                    • لایه <code>0_PERF</code> (سبز): پرفراژ و آسان‌بازشو
                    <br />
                    • لایه <code>0_BLEED</code> (فیروزه‌ای): حاشیه اضافه رنگ ۳ میلی‌متری
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => setShowSmartHelp(false)}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs"
                >
                  متوجه شدم، بازگشت به محیط کاربری
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. SUCCESS NOTIFICATION TOAST */}
      <AnimatePresence>
        {showExportSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 left-6 z-50 max-w-md bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/40 text-emerald-200 p-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-xl"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold block text-white">عملیات با موفقیت انجام شد:</span>
              <span>{showExportSuccessToast}</span>
            </div>
            <button
              onClick={() => setShowExportSuccessToast(null)}
              className="p-1 text-slate-400 hover:text-white mr-auto"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
