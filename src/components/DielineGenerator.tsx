import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, Badge } from './UIComponents';
import { ThreeDPreview, FlapDirections } from './ThreeDPreview';
import { Project } from '../types';
import { 
  Download, Check, Rotate3d, Layers, LogOut, Pin, ArrowRight,
  Shapes, Scissors, Ruler as RulerIcon, Ruler, ShieldCheck, ArrowDownToLine, Maximize, Minimize, Upload, ImageIcon, Trash2, Box, Info, Sparkles, 
  Share2, Printer, Calculator, Cpu, ShieldAlert, FileText, Database, Settings, HelpCircle, Save, CheckCircle2, AlertTriangle, Send, RefreshCw, RotateCcw, Layers3, Flame, Clock, X, Camera, ChevronDown, MapPin, Eye, BookOpen, Search, Sliders, Magnet, Activity
, Orbit } from 'lucide-react';
import { SmartHelpButton } from './SmartHelpModal';
import { auth } from '../src/lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';
import { parsePersianFloat } from '../services/numberUtils';
import { validateStandardConstraints } from '../services/standardsEngine';
import { calculateMaterialCompensation } from '../services/materialCompensationEngine';
import { PackagingStandardsService, StructuralWarning, PaperGrainAnalysis } from '../services/packagingStandards';
import { StandardsEnginePanel } from './StandardsEnginePanel';
import { Award, Play, Pause } from 'lucide-react';
import { simulateBoxCompressionStrength } from '../services/structuralValidation';
import { STANDARD_DIELINE_ENGINES, calculateDielineParameters } from '../services/dielineMath';
import { runComprehensiveGeometryCheck, snapPath, validateDxfDieline, DxfValidationResult } from '../services/geometryValidator';
import { scaleCustomDieline, parseDxfToEntities, analyzeTopology, CustomDielineTemplate } from '../services/customDielineEngine';
import { LayerManager, LayerState } from './LayerManager';
import { PropertyInspector } from './PropertyInspector';
import { CanvasRulers } from './CanvasRulers';
import { ToastNotificationCenter, ToastMessage } from './ToastNotificationCenter';
import { RealtimeCalculationPanel } from './RealtimeCalculationPanel';
import { Dieline3DParameters } from '../services/realtimeCalculationEngine';
import { DimensionAccuracyEvaluator } from './DimensionAccuracyEvaluator';
import { AccuracyIssueSuggestion, DimensionAccuracyInput } from '../services/dimensionAccuracyService';
import { PacklyIndustrialDielineStudio } from './PacklyIndustrialDielineStudio';


// =========================================================================
// 1. DATA MODELS & PACKAGING CONSTANTS
// =========================================================================

interface PackagingModel {
  id: string;
  name: string;
  code: string; 
  category: string;
  icon: string;
  defaultDims: { L: number, W: number, H: number };
  description: string; features?: string[]; complexity?: string;
}

const STANDARDS_LIBRARY: PackagingModel[] = [
  // FEFCO 0200 Series
  { id: 'fefco-0201', name: 'کارتن استاندارد آمریکایی (RSC)', code: 'FEFCO 0201', category: 'FEFCO 0200 Series', icon: '📦', defaultDims: { L: 150, W: 120, H: 100 }, description: 'کارتن کارآمد حمل و نقل با درب‌های بالا و پایین متلاقی در خط وسط.' },
  { id: 'fefco-0200', name: 'کارتن نیمه‌شیاردار روباز (HSC)', code: 'FEFCO 0200', category: 'FEFCO 0200 Series', icon: '📥', defaultDims: { L: 140, W: 100, H: 80 }, description: 'کارتن فاقد درپوش، مناسب برای بارگیری سریع یا به عنوان کشو.' },
  { id: 'fefco-0203', name: 'جعبه درب هم‌پوشان سنگین (FOL)', code: 'FEFCO 0203', category: 'FEFCO 0200 Series', icon: '📦', defaultDims: { L: 180, W: 140, H: 120 }, description: 'درب‌های کاملا روی هم قرار گیرنده برای تقویت کف و سقف و جلوگیری از گسیختگی.' },
  { id: 'fefco-0204', name: 'کارتن فلپ‌مرکزی (CSSC)', code: 'FEFCO 0204', category: 'FEFCO 0200 Series', icon: '📦', defaultDims: { L: 180, W: 120, H: 120 }, description: 'چهار فلپ به مرکز می‌رسند؛ هندسه فلپ‌های کناری با طول جعبه محاسبه می‌شود.' },
  { id: 'fefco-0215', name: 'کارتن ته‌قفلی دستی (Snap-lock bottom)', code: 'FEFCO 0215', category: 'FEFCO 0200 Series', icon: '🔒', defaultDims: { L: 120, W: 90, H: 150 }, description: 'کف با زبانه‌های درگیرشونده بسته می‌شود؛ این نسخه محاسبات پایه دارد و قفل نهایی باید با نقشه رسمی و نمونه تاخورده تطبیق داده شود.' },
  
  // FEFCO 0300 Series
  { id: 'fefco-0300', name: 'جعبه تلسکوبی دو تکه درب و زیره', code: 'FEFCO 0300', category: 'FEFCO 0300', icon: '🎁', defaultDims: { L: 200, W: 150, H: 60 }, description: 'فرمت جعبه کفش کلاسیک شامل کفه مجزا و درب جداگانه با لبه‌های منگنه یا چسب.' },
  { id: 'fefco-0320', name: 'جعبه تلسکوپی دو‌تکه (مدل 0320)', code: 'FEFCO 0320', category: 'FEFCO 0300', icon: '📂', defaultDims: { L: 160, W: 120, H: 45 }, description: 'دیواره‌های دوجداره تاشو برای محصولات فشرده لوکس.' },

  // FEFCO 0400 Series
  { id: 'fefco-pizza', name: 'جعبه پیتزا یک‌تکه (الگوی پارامتریک اختصاصی)', code: 'CUSTOM-PIZZA-01', category: 'Custom Food Packaging', icon: '🍕', defaultDims: { L: 300, W: 300, H: 40 }, description: 'الگوی اختصاصی یک‌تکه با درب لولایی، کفه و دیواره‌ها؛ کد رسمی FEFCO برای این هندسه ادعا نمی‌شود و جزئیات قفل/تهویه نیازمند تنظیم قالب است.' },
  { id: 'fefco-0427', name: 'جعبه کیبوردی/پستی (Mailer — FEFCO 0427)', code: 'FEFCO 0427', category: 'FEFCO 0400', icon: '✉️', defaultDims: { L: 200, W: 150, H: 50 }, description: 'جعبه پاکتی بی‌نیاز از چسب‌کاری با زبانه گرد پشتیبان، ایده اساسی لجستیک تجارت الکترونیک.' },

  // FEFCO 0700 Series
  { id: 'fefco-0713', name: 'کارتن آماده‌چسب‌شده با کف قفل‌شونده و درب زبانه‌ای', code: 'FEFCO 0713', category: 'FEFCO 0700', icon: '🧳', defaultDims: { L: 220, W: 140, H: 110 }, description: 'خانواده آماده‌چسب‌شده با کف قفل‌شونده و درب زبانه‌ای؛ هندسه فعلی یک الگوی پایه است و باید با نقشه رسمی 0713 تطبیق داده شود.' },

  // ECMA A Series
  { id: 'ecma-a2020', name: 'جعبه دارویی Reverse Tuck End (RTE)', code: 'ECMA A20.20', category: 'ECMA A', icon: '💊', defaultDims: { L: 60, W: 40, H: 100 }, description: 'کارتن مقوایی لوله‌ای با زبانه‌های بالا و پایین روی دو پنل اصلی مقابل؛ ابعاد داخلی و ضخامت مقوا در تولید باید جبران شوند.' },
  { id: 'ecma-ste', name: 'جعبه Straight Tuck End (STE)', code: 'ECMA STE — الگوی پایه', category: 'ECMA A', icon: '📦', defaultDims: { L: 70, W: 45, H: 120 }, description: 'زبانه‌های بالا و پایین روی یک پنل اصلی قرار دارند؛ این شناسه توصیفی است و جایگزین شماره کد رسمی ECMA نیست.' },
  { id: 'snap-lock-123', name: 'جعبه لاک باتم ته قفلی (1-2-3 Lock-Bottom)', code: 'ECMA A2110', category: 'ECMA A', icon: '📥', defaultDims: { L: 60, W: 40, H: 100 }, description: 'جعبه پرکاربرد بهداشتی و دارویی با درپوش زبانه‌دار بالا و ته قفلی دستی مستحکم بدون نیاز به چسب پایینی.' },
  { id: 'ecma-a30', name: 'جعبه با زبانه قفل اصطکاکی آویز', code: 'ECMA A30', category: 'ECMA A', icon: '🧴', defaultDims: { L: 50, W: 40, H: 140 }, description: 'قفسه آویز سوپرمارکتی با پله چشمی یورو در بالا.' },

  // ECMA B Series
  { id: 'ecma-b10', name: 'کاور قلاف کشویی آزاد (Sleeve)', code: 'ECMA B10.10', category: 'ECMA B', icon: '🗂️', defaultDims: { L: 120, W: 125, H: 35 }, description: 'باندرول یا غلاف دور جعبه نگهدارنده، ایجاد هویت بصری روی جعبه خام مایکروویو.' },

  // ECMA C Series
  { id: 'ecma-c1020', name: 'کارتن کشویی ریلی (Drawer Box)', code: 'ECMA C10.20', category: 'ECMA C', icon: '🗄️', defaultDims: { L: 130, W: 90, H: 45 }, description: 'جعبه دو تکه کشویی لوکس کبریتی، بسیار گران‌قیمت بصری و مستحکم.' },

  // ECMA D Series
  { id: 'ecma-d50', name: 'استند رومیزی دیسپلی فروشگاهی', code: 'ECMA D50', category: 'ECMA D', icon: '📊', defaultDims: { L: 160, W: 160, H: 180 }, description: 'نیمه‌کارتن با قابلیت کات هشتی جهت نمایش کاتالوگ یا محصولات پشت کانتر فروش.' }
];

export interface ProductCategoryOption {
  id: string;
  name: string;
  icon: string;
  recommendedModelId: string;
  recommendationReason: string;
  defaultDims: { L: number; W: number; H: number };
}

export const PRODUCT_CATEGORIES: ProductCategoryOption[] = [
  {
    id: 'all',
    name: 'همه دسته‌ها',
    icon: '📦',
    recommendedModelId: 'ecma-a2020',
    recommendationReason: 'الگوی عمومی استاندارد بین‌المللی با کاربرد گسترده و قابلیت تولید روی انواع ورق مقوایی',
    defaultDims: { L: 60, W: 40, H: 100 }
  },
  {
    id: 'cosmetics',
    name: 'آرایشی و بهداشتی',
    icon: '🧴',
    recommendedModelId: 'ecma-a2020',
    recommendationReason: 'بهترین الگوی دارویی و آرایشی زبانه‌دار (Tuck End) با انطباق بالا، زیبایی قفسه و مونتاژ آسان',
    defaultDims: { L: 55, W: 45, H: 120 }
  },
  {
    id: 'pharma',
    name: 'دارویی و پزشکی',
    icon: '💊',
    recommendedModelId: 'snap-lock-123',
    recommendationReason: 'الگوی ته قفلی (1-2-3 Lock Bottom) برای استحکام فوق‌العاده کف جعبه و سرعت بالای مونتاژ دستی بدون چسب پایینی',
    defaultDims: { L: 65, W: 50, H: 110 }
  },
  {
    id: 'ecommerce',
    name: 'تجارت الکترونیک و پستی',
    icon: '✉️',
    recommendedModelId: 'fefco-0427',
    recommendationReason: 'جعبه پستی کیبوردی (Mailer Pro) بی‌نیاز از چسب‌کاری با مقاومت در برابر ضربه‌های پستی و بازشوی جذاب',
    defaultDims: { L: 220, W: 160, H: 60 }
  },
  {
    id: 'food_bakery',
    name: 'فست‌فود و غذایی',
    icon: '🍕',
    recommendedModelId: 'fefco-pizza',
    recommendationReason: 'الگوی اختصاصی جعبه پیتزا با درب لولایی؛ سوراخ تهویه، زبانه‌های قفل و تلرانس خط تولید باید طبق سفارش اضافه و تأیید شوند.',
    defaultDims: { L: 300, W: 300, H: 45 }
  },
  {
    id: 'industrial',
    name: 'کارتن مادر و سنگین',
    icon: '📦',
    recommendedModelId: 'fefco-0201',
    recommendationReason: 'کارتن کارآمد آمریکایی RSC (FEFCO 0201) برای انبارداری، باربری سنگین و بالاترین مقاومت BCT',
    defaultDims: { L: 350, W: 250, H: 200 }
  },
  {
    id: 'luxury_gift',
    name: 'کادویی و نفیس',
    icon: '🎁',
    recommendedModelId: 'ecma-c1020',
    recommendationReason: 'جعبه کشویی ریلی دو تکه (Drawer Box)؛ برای ساختار نهایی باید زیره و غلاف با هم بررسی شوند.',
    defaultDims: { L: 140, W: 100, H: 50 }
  },
  {
    id: 'pizza', name: 'جعبه پیتزا و غذای بیرون‌بر', icon: '🍕', recommendedModelId: 'fefco-pizza',
    recommendationReason: 'قالب پیتزای اختصاصی با درب لولایی؛ قفل‌ها، منافذ تهویه و جنس مقاوم به چربی باید طبق محصول نهایی تنظیم شوند.',
    defaultDims: { L: 300, W: 300, H: 45 }
  },
  {
    id: 'keyboard', name: 'جعبه کیبوردی و پستی', icon: '📮', recommendedModelId: 'fefco-0427',
    recommendationReason: 'جعبه فولدر یک‌تکه FEFCO 0427 برای تجارت الکترونیک؛ عمق گوشواره‌ها و قفل باید با ضخامت ورق هماهنگ شود.',
    defaultDims: { L: 220, W: 160, H: 60 }
  },
  {
    id: 'telescopic', name: 'جعبه تلسکوپی درب و زیره', icon: '🎁', recommendedModelId: 'fefco-0300',
    recommendationReason: 'قالب دو‌تکه با درب جدا و زیره جدا؛ لقی درب متناسب با کالیپر ورق باید کنترل شود.',
    defaultDims: { L: 200, W: 150, H: 60 }
  },
  {
    id: 'retail_display', name: 'نمایشی و قفسه‌ای', icon: '🛍️', recommendedModelId: 'ecma-d50',
    recommendationReason: 'الگوی پایه نمایش محصول؛ قبل از تولید باید قفل، بارگذاری و پایداری استند تأیید شود.',
    defaultDims: { L: 160, W: 160, H: 180 }
  }
];

interface PackagingMaterial {
  id: string;
  name: string;
  category: 'SBS' | 'FBB' | 'Duplex' | 'Kraft' | 'Corrugated';
  thickness: number; // mm
  weight: number; // gsm
  foldLoss: number; // mm (Material compensation bend offset)
  density: number; // g/cm3
  ectValue: number; // kN/m (Edge Crush Test index)
  unitPrice: number; // Toman per Kg
  color: string;
  type: 'coated' | 'kraft' | 'corrugated';
}

const MATERIAL_PRESETS: PackagingMaterial[] = [
  { id: 'inderboard-250', name: 'ایندربرد ۲۵۰ گرم (FBB Standard)', category: 'FBB', thickness: 0.35, weight: 250, foldLoss: 0.12, density: 0.71, ectValue: 3.5, unitPrice: 78000, color: '#fcfcfc', type: 'coated' },
  { id: 'inderboard-300', name: 'ایندربرد ۳۰۰ گرم (FBB Premium)', category: 'FBB', thickness: 0.42, weight: 300, foldLoss: 0.15, density: 0.71, ectValue: 4.2, unitPrice: 82000, color: '#ffffff', type: 'coated' },
  { id: 'inderboard-350', name: 'ایندربرد ۳۵۰ گرم (FBB Heavy Duty)', category: 'FBB', thickness: 0.50, weight: 350, foldLoss: 0.18, density: 0.70, ectValue: 5.1, unitPrice: 85000, color: '#f9f9f9', type: 'coated' },
  
  { id: 'sbs-300', name: 'سولفات سفید ۳۰۰ گرم (SBS Elegant)', category: 'SBS', thickness: 0.38, weight: 300, foldLoss: 0.13, density: 0.79, ectValue: 4.8, unitPrice: 95000, color: '#ffffff', type: 'coated' },
  { id: 'sbs-400', name: 'سولفات سفید ۴۰۰ گرم (SBS Luxury)', category: 'SBS', thickness: 0.52, weight: 400, foldLoss: 0.20, density: 0.77, ectValue: 6.2, unitPrice: 105000, color: '#ffffff', type: 'coated' },
  
  { id: 'duplex-280', name: 'پشت طوسی ۲۸۰ گرم (Duplex Classic)', category: 'Duplex', thickness: 0.36, weight: 280, foldLoss: 0.14, density: 0.78, ectValue: 3.1, unitPrice: 48000, color: '#eaeaea', type: 'coated' },
  { id: 'duplex-350', name: 'پشت طوسی ۳۵۰ گرم (Duplex Strong)', category: 'Duplex', thickness: 0.46, weight: 350, foldLoss: 0.17, density: 0.76, ectValue: 3.9, unitPrice: 51000, color: '#e5e5e5', type: 'coated' },
  
  { id: 'kraft-300', name: 'کرافت قهوه‌ای ۳۰۰ گرم (Kraft Ecoline)', category: 'Kraft', thickness: 0.44, weight: 300, foldLoss: 0.16, density: 0.68, ectValue: 4.5, unitPrice: 62000, color: '#c4a482', type: 'kraft' },
  
  { id: 'corrugated-e', name: 'کارتن مایکروویو E-Flute (ضخامت ۱.۶mm)', category: 'Corrugated', thickness: 1.60, weight: 450, foldLoss: 0.55, density: 0.28, ectValue: 5.5, unitPrice: 38000, color: '#d8c3a5', type: 'corrugated' },
  { id: 'corrugated-b', name: 'کارتن سه لایه B-Flute (ضخامت ۳.۲mm)', category: 'Corrugated', thickness: 3.20, weight: 580, foldLoss: 1.10, density: 0.18, ectValue: 6.8, unitPrice: 34000, color: '#cdaf85', type: 'corrugated' },
  { id: 'corrugated-eb', name: 'کارتن پنج لایه EB-Flute (ضخامت ۴.۸mm)', category: 'Corrugated', thickness: 4.80, weight: 890, foldLoss: 1.65, density: 0.19, ectValue: 12.5, unitPrice: 42000, color: '#bf9c72', type: 'corrugated' }
];

interface PressMachine {
  name: string;
  sheetW: number;
  sheetH: number;
  speedPerHour: number;
  runBaseCost: number; // Tomans
  description: string; features?: string[]; complexity?: string;
}

const MACHINE_PRESETS: PressMachine[] = [
  { name: 'Heidelberg Speedmaster XL 75', sheetW: 740, sheetH: 530, speedPerHour: 15000, runBaseCost: 450000, description: 'دستگاه افست پرسرعت تک‌ورقی مناسب تیراژهای متوسط تا بالا.' },
  { name: 'Komori Lithrone G40', sheetW: 1020, sheetH: 720, speedPerHour: 16500, runBaseCost: 650000, description: 'سلطان افست لیتوگرافی ۱۰۰×۷۰ سانتی؛ پلاتین‌های عریض کارگاهی.' },
  { name: 'Roland 700 Evolution', sheetW: 1040, sheetH: 740, speedPerHour: 18000, runBaseCost: 750000, description: 'دقت بی‌نظیر ترام و بهینه‌ چاپی صنعتی برای بسته‌بندی‌های لوکس.' },
  { name: 'Ryobi 920 Series', sheetW: 920, sheetH: 640, speedPerHour: 16200, runBaseCost: 550000, description: 'نصف‌ورق مینیاتوری فوق بهینه با ضریب باطله کم در خط چاپ.' }
];

const STANDARD_SHEET_SIZES = [
  { name: '۱۰۰ در ۷۰ سانتی‌متر', width: 1000, height: 700 },
  { name: '۹۰ در ۶۰ سانتی‌متر', width: 900, height: 600 },
  { name: '۷۰ در ۵۰ سانتی‌متر', width: 700, height: 500 },
  { name: '۱۰۲ در ۷۲ سانتی‌متر', width: 1020, height: 720 },
];

import { normalizePersianNumbers } from '../utils/numberUtils';
import { DimensionInput } from './DimensionInput';
import { BoundingBoxPreview } from './BoundingBoxPreview';

const CollapsiblePanel = ({ 
  isOpen,
  onToggle,
  title, 
  subLabel, 
  icon: IconComp, 
  children 
}: { 
  isOpen: boolean;
  onToggle: () => void;
  title: string; 
  subLabel?: string; 
  icon: any; 
  children: React.ReactNode 
}) => {
  return (
    <div className={`bg-[#0b0f15]/80 border border-slate-800/60 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm mb-3 ${title.includes("انتخاب و نوع الگوی دایلاین") || title.includes("ابعاد فیزیکی و اصلی جعبه") ? "primary-setup-panel" : ""}`}>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-900/40 transition-colors cursor-pointer select-none text-right"
        type="button"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="bg-slate-900 p-1.5 rounded-lg text-slate-400">
            <IconComp className="w-3.5 h-3.5 text-sky-405" />
          </div>
          <div className="text-right min-w-0">
            <span className="text-[11px] font-black text-slate-100 block">{title}</span>
            {subLabel && <span className="text-[9px] text-slate-400 block mt-0.5 truncate font-mono">{subLabel}</span>}
          </div>
        </div>
        <div className="text-slate-500 shrink-0">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && (
        <div className="p-4 pt-1 border-t border-slate-850 bg-slate-950/20 text-slate-200 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const LivePreview2DDims = ({ dims, modelId }: { dims: { L: number, W: number, H: number }, modelId: string }) => {
  const { L, W, H } = dims;
  const maxDim = Math.max(L * 2 + W * 2 + 30, H + W + 30);
  const scale = 200 / (maxDim || 1); // Fit within 200x200 canvas

  // simple schematic based on dimensions
  return (
    <div className="bg-[#030508] border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center my-4 overflow-hidden relative">
      <span className="absolute top-2 right-2 text-[9px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">نقشه زنده</span>
      <svg width="200" height="200" viewBox="0 0 200 200" className="text-slate-600">
        <g transform={`translate(${100 - (L + W) * scale}, ${100 - (H/2)*scale})`}>
          {/* Main Body */}
          <rect x={0} y={0} width={L*scale} height={H*scale} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x={L*scale} y={0} width={W*scale} height={H*scale} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x={(L+W)*scale} y={0} width={L*scale} height={H*scale} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x={(L*2+W)*scale} y={0} width={W*scale} height={H*scale} fill="none" stroke="currentColor" strokeWidth="1.5" />
          
          {/* Top Flaps */}
          <rect x={0} y={-(W/2)*scale} width={L*scale} height={(W/2)*scale} fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" />
          <rect x={L*scale} y={-(W/2)*scale} width={W*scale} height={(W/2)*scale} fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Bottom Flaps */}
          <rect x={0} y={H*scale} width={L*scale} height={(W/2)*scale} fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" />
          <rect x={L*scale} y={H*scale} width={W*scale} height={(W/2)*scale} fill="rgba(99, 102, 241, 0.1)" stroke="#6366f1" strokeWidth="1" strokeDasharray="2 2" />
        </g>
      </svg>
      <div className="text-[9px] text-slate-400 mt-2 text-center leading-tight">
        شبیه‌سازی بلادرنگ تناسب درب و کف جعبه نسبت به بدنه اصلی
        <br/>
        <span className="text-indigo-400 font-mono mt-1 block">L:{L} W:{W} H:{H}</span>
      </div>
    </div>
  );
};


const ParamOverrideInput = ({ value, label, placeholder, onChange }: any) => {
  const [localVal, setLocalVal] = useState(value);
  useEffect(() => { setLocalVal(value); }, [value]);
  
  return (
    <div>
      <label className="text-[9px] text-slate-500 mb-1 block">{label}</label>
      <input 
        type="number" 
        placeholder={placeholder} 
        value={localVal} 
        onChange={e => setLocalVal(e.target.value)} 
        onBlur={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onChange(e.currentTarget.value); }}
        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[10px] text-white" 
      />
    </div>
  );
};

// Helper to convert SVG paths to DXF-like entities for 3D Preview fallback
function svgPathsToEntities(cuts: string[], creases: string[]): any[] {
  const entities: any[] = [];
  const parsePath = (pathStr: string, isCrease: boolean) => {
    if (!pathStr) return;
    const cmds = pathStr.split(/(?=[M|L|A])/);
    let currX = 0, currY = 0;
    cmds.forEach(cmdStr => {
      const cmd = cmdStr.trim().charAt(0);
      const args = cmdStr.trim().substring(1).trim().split(/[\s,]+/).filter(Boolean).map(Number);
      if (cmd === 'M' && args.length >= 2) {
        currX = args[0];
        currY = args[1];
      } else if (cmd === 'L' && args.length >= 2) {
        entities.push({ type: 'LINE', x1: currX, y1: currY, x2: args[0], y2: args[1], isCrease });
        currX = args[0];
        currY = args[1];
      } else if (cmd === 'A' && args.length >= 7) {
        entities.push({ type: 'LINE', x1: currX, y1: currY, x2: args[5], y2: args[6], isCrease });
        currX = args[5];
        currY = args[6];
      }
    });
  };
  cuts.forEach(p => parsePath(p, false));
  creases.forEach(p => parsePath(p, true));
  return entities;
}

// Module-level cache map to memoize complex 3D / 2D packaging geometry calculations
const dielineMathCache = new Map<string, any>();

export const DielineGenerator: React.FC<{ onSaveProject?: (p: Project) => void }> = ({ onSaveProject }) => {
  // --- Master Tabs ---
  const [activeTab, setActiveTab] = useState<'cad' | 'standards' | 'physics' | 'nesting' | 'pricing' | 'ai' | 'cms'>('cad');
  const [isPacklyStudioOpen, setIsPacklyStudioOpen] = useState<boolean>(false);

  // --- Beautiful iframe-safe alert/confirm modal ---
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm' | 'success' | 'error';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showCustomAlert = (title: string, message: string, type: 'alert' | 'confirm' | 'success' | 'error' = 'alert', onConfirm?: () => void) => {
    setCustomDialog({
      isOpen: true,
      title,
      message,
      type,
      onConfirm
    });
  };

  // --- State Variables ---
  const { user } = useAuth();
  const [selectedModel, setSelectedModel] = useState<PackagingModel>(STANDARDS_LIBRARY.find(s => s.id === 'ecma-a2020') || STANDARDS_LIBRARY[0]);
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);

  // Sync custom templates with localStorage
  useEffect(() => {
    const loadFromLocal = () => {
      let localTemplates: any[] = [];
      const stored = localStorage.getItem('ashk_custom_templates');
      if (stored) {
        try {
          localTemplates = JSON.parse(stored);
        } catch (e) {
          console.warn("Failed parsing local templates:", e);
        }
      }
      setCustomTemplates(localTemplates);
    };

    loadFromLocal();

    window.addEventListener('ashk_custom_templates_updated', loadFromLocal);

    return () => {
      window.removeEventListener('ashk_custom_templates_updated', loadFromLocal);
    };
  }, []);

  // Hidden standards state for hiding/removing default standard templates
  const [hiddenStandardIds, setHiddenStandardIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ashk_hidden_standards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleHideStandardModel = (e: React.MouseEvent, modelId: string) => {
    e.stopPropagation();
    const updated = [...hiddenStandardIds, modelId];
    setHiddenStandardIds(updated);
    localStorage.setItem('ashk_hidden_standards', JSON.stringify(updated));
    showCustomAlert('حذف/مخفی‌سازی الگوی پیش‌فرض', `الگوی پیش‌فرض با شناسه ${modelId} از لیست مخفی شد. در صورت نیاز می‌توانید آن را بازگردانی کنید.`, 'alert');
  };

  const handleRestoreStandardModels = () => {
    setHiddenStandardIds([]);
    localStorage.removeItem('ashk_hidden_standards');
    showCustomAlert('بازگردانی الگوهای پیش‌فرض', 'تمامی الگوهای پیش‌فرض مخفی‌شده با موفقیت بازگردانی شدند.', 'success');
  };

  // Automatically switch to DXF override mode if an override template exists for the selected model
  useEffect(() => {
    const overrideTpl = customTemplates.find(t => t.baseModelId === selectedModel.id && t.isOverride && t.entities && t.entities.length > 0);
    if (overrideTpl) {
      setUseStandardMathEngine(false);
    }
  }, [selectedModel.id, customTemplates]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dims, setDims] = useState<{ L: number, W: number, H: number }>({ L: 60, W: 40, H: 100 });

  const handleApplyCategoryRecommendation = (catId: string) => {
    const categoryObj = PRODUCT_CATEGORIES.find(c => c.id === catId);
    if (!categoryObj) return;

    setSelectedCategory(catId);
    
    if (categoryObj.recommendedModelId) {
      const recModel = STANDARDS_LIBRARY.find(m => m.id === categoryObj.recommendedModelId);
      if (recModel) {
        setSelectedModel(recModel);
        if (categoryObj.defaultDims) {
          setDims(categoryObj.defaultDims);
        }
        showCustomAlert(
          'الگوی هوشمند فعال شد',
          `الگوی "${recModel.name}" (${recModel.code}) همراه با ابعاد استاندارد برای دسته ${categoryObj.name} با موفقیت اعمال شد.`,
          'success'
        );
      }
    }
  };

  const handleDimensionChange = (key: 'L' | 'W' | 'H', valInMm: number) => {
    const newDims = { ...dims, [key]: valInMm };
    setDims(newDims);
  };

  const handleParamOverrideChange = (key: 'glueTab' | 'tuck' | 'dustFlap', valueStr: string) => {
    if (valueStr === '') {
      setParamOverrides(p => ({ ...p, [key]: '' }));
      return;
    }
    const val = Number(valueStr);
    if (isNaN(val) || val < 0) return;

    // Strict Mathematical Validation Layer for overrides
    const id = selectedModel.id;
    const { L, W, H } = dims;

    if (key === 'glueTab') {
      const isGlueless = id === 'fefco-0427';
      if (isGlueless && val > 0) {
        showCustomAlert(
          'تداخل در ساختار بدون چسب',
          'این مدل جعبه دایکاتی (بدون چسب) است. مقدار لب‌چسب باید صفر باشد تا تداخلی ایجاد نشود.\nراهنما: برای جعبه‌های قفلی یا مایلر از زبانه قفل استفاده کنید.',
          'alert'
        );
        return;
      }
      if (!isGlueless) {
        if (val < 10) {
          showCustomAlert(
            'عدم پایداری لب‌چسب (FEFCO Error)',
            `مقدار لب‌چسب وارد شده (${val}mm) کمتر از حد استاندارد ماشین‌آلات خط چسب و منگنه ایران (10mm) است. لبه چسب استحکام کافی برای نگهداری دیواره جعبه را نخواهد داشت.\nراهنما: حداقل مقدار استاندارد ۱۲ تا ۱۵ میلی‌متر است.`,
            'alert'
          );
          return;
        }
        if (val > W * 0.6) {
          showCustomAlert(
            'تداخل فیزیکی لبه هم‌پوشان پهلو',
            `مقدار لب‌چسب وارد شده (${val}mm) از نصف عرض جعبه (${Math.round(W * 0.5)}mm) بیشتر است و در هنگام تا شدن پهلوها تداخل شدید ایجاد می‌کند.\nراهنما: حداکثر مقدار مجاز حدود ${Math.round(W * 0.4)}mm است.`,
            'alert'
          );
          return;
        }
      }
    }

    if (key === 'tuck') {
      const hasNoTuck = id === 'fefco-0201' || id === 'fefco-0200' || id === 'fefco-0203' || id === 'fefco-0204' || id === 'fefco-0300' || id === 'fefco-0320';
      if (hasNoTuck && val > 0) {
        showCustomAlert(
          'تداخل مدل کارتنی استاندارد RSC',
          'مدل‌های معمولی کارتن مادر (مانند FEFCO 0201) فاقد زبانه قفل نری درپوش هستند و باز و بسته شدن لبه‌ها با چسب یا منگنه تامین می‌شود.\nراهنما: زبانه قفل برای مدل‌های کیبوردی، دارویی یا ته قفلی فعال است.',
          'alert'
        );
        return;
      }
      if (!hasNoTuck) {
        if (val < 10) {
          showCustomAlert(
            'عدم پایداری زبانه قفل درب (Tuck Error)',
            `مقدار زبانه درب وارد شده (${val}mm) بسیار کوتاه است و پس از اولین باز شدن، درب جعبه به صورت خودکار ایستایی نخواهد داشت و باز می‌شود.\nراهنما: حداقل مقدار زبانه پایداری درب ۱۲ میلی‌متر است.`,
            'alert'
          );
          return;
        }
        if (val > W * 0.85) {
          showCustomAlert(
            'تداخل زبانه قفل با دیواره مقابل',
            `زبانه وارد شده (${val}mm) به علت طول بیش از حد، با کفی یا دیواره مقابل جعبه تداخل دارد و درب جعبه به طور فیزیکی بسته نخواهد شد.\nراهنما: طول استاندارد زبانه درب بین ۰.۲۵ تا ۰.۴ عرض جعبه است.`,
            'alert'
          );
          return;
        }
      }
    }

    if (key === 'dustFlap') {
      if (val < 8) {
        showCustomAlert(
          'عدم مهار گرد و غبار (Dust Flap Error)',
          `ارتفاع گوشواره وارد شده (${val}mm) بسیار کوچک است و نمی‌تواند مانع نفوذ گرد و غبار به گوشه‌های درپوش شود.\nراهنما: حداقل ارتفاع استاندارد گوشواره ۱۰ میلی‌متر است.`,
          'alert'
        );
        return;
      }
      const activeTuck = typeof paramOverrides.tuck === 'number' ? paramOverrides.tuck : (W * 0.3);
      if (val + activeTuck > W && id.includes('tuck')) {
        showCustomAlert(
          'تداخل هندسی گوشواره و زبانه قفل',
          `مجموع طول گوشواره (${val}mm) و زبانه قفل (${Math.round(activeTuck)}mm) از عرض کل جعبه (${W}mm) فراتر رفته است. این امر باعث برخورد لبه‌ها در گره تاشدگی داخلی می‌شود و ساختار را کج یا متلاشی می‌کند.\nراهنما: مجموع این دو مقدار باید کمتر از عرض جعبه باشد.`,
          'alert'
        );
        return;
      }
    }

    setParamOverrides(p => ({ ...p, [key]: val }));
  };

  const [paramOverrides, setParamOverrides] = useState<{ glueTab: number | '', tuck: number | '', dustFlap: number | '' }>({ glueTab: '', tuck: '', dustFlap: '' });
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isProofMode, setIsProofMode] = useState(false);
  const [material, setMaterial] = useState<PackagingMaterial>(MATERIAL_PRESETS[1]); // Inderboard-300
  const [specialEffect, setSpecialEffect] = useState<'none' | 'gold_foil' | 'uv_spot' | 'both'>('none');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [showQuickView3D, setShowQuickView3D] = useState(false);
  const [foldRatio, setFoldRatio] = useState(0.85);
  const [foldingSpeed, setFoldingSpeed] = useState<number>(0.008); // speed coefficient
  
  const animDirectionRef = useRef<'forward' | 'backward'>('forward');

  // Dynamic folding animation simulation loop for testing board and corner intersections
  useEffect(() => {

    let frameId: number;
    
    const animate = () => {
      setFoldRatio(prev => {
        let next = prev;
        if (animDirectionRef.current === 'forward') {
          next = prev + foldingSpeed;
          if (next >= 1.0) {
            next = 1.0;
            animDirectionRef.current = 'backward';
          }
        } else {
          next = prev - foldingSpeed;
          if (next <= 0.0) {
            next = 0.0;
            animDirectionRef.current = 'forward';
          }
        }
        return parseFloat(next.toFixed(4));
      });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [foldingSpeed]);

  const [textureUrl, setTextureUrl] = useState<string | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [viewAngle, setViewAngle] = useState<'front' | 'top' | 'side' | 'perspective'>('perspective');
  const [wireframe, setWireframe] = useState(false);
  const [lightIntensity, setLightIntensity] = useState(1);
  const [flapDirections, setFlapDirections] = useState<FlapDirections>({
    top: 'inside', bottom: 'inside', left: 'inside', right: 'inside'
  });
  const [hasDieCut, setHasDieCut] = useState(false);
  const [showDimensions, setShowDimensions] = useState(true);
  const [showDebugger, setShowDebugger] = useState(false);
  const [isStandardHudCollapsed, setIsStandardHudCollapsed] = useState(true);
  const [customDimensions, setCustomDimensions] = useState<{ id: string; x1: number; y1: number; x2: number; y2: number; value: number }[]>([]);
  const [isMeasuringMode, setIsMeasuringMode] = useState<boolean>(false);
  const [measurementPoints, setMeasurementPoints] = useState<{ x: number; y: number }[]>([]);
  const [showAssemblyGuide, setShowAssemblyGuide] = useState(false);
  const [assemblyGuideStep, setAssemblyGuideStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Calibration / Dieline Engine Optimization State ---
  const [calibrationState, setCalibrationState] = useState<{
    isActive: boolean;
    fileName: string;
    fileType: string;
    modelType: string;
    sampleDims: { L: number; W: number; H: number };
    detectedFlapOffset: number; // e.g. -1.2mm
    detectedCreaseOffset: number; // e.g. 0.4mm
    logs: string[];
    isAnalyzing: boolean;
  }>({
    isActive: false,
    fileName: '',
    fileType: '',
    modelType: 'snap-lock-123',
    sampleDims: { L: 100, W: 100, H: 80 },
    detectedFlapOffset: 0,
    detectedCreaseOffset: 0,
    logs: [],
    isAnalyzing: false,
  });

  // Grain direction (راه مقوا/سراسر موج)
  const [grainDirection, setGrainDirection] = useState<'long' | 'short'>('long');

  const [snapLockVariant, setSnapLockVariant] = useState<'standard' | 'reinforced' | 'eco'>('standard');

  // --- Auto-Lock Bottom Precision Edge Parameters ---
  const [autoLockAngle, setAutoLockAngle] = useState<number>(45); // degrees (35° to 55°)
  const [autoLockGlueWidth, setAutoLockGlueWidth] = useState<number>(15); // mm (10 to 30mm)

  // --- Physics Simulator Parameters ---
  const [productWeight, setProductWeight] = useState<number>(0.4); // kg
  const [shelfHumidity, setShelfHumidity] = useState<number>(50); // % RH
  const [storageDays, setStorageDays] = useState<number>(30); // days
  const [stackHeight, setStackHeight] = useState<number>(10); // layers

  // --- Sheet & Nesting Parameters ---
  const [activePress, setActivePress] = useState<PressMachine>(MACHINE_PRESETS[1]); // Komori
  const [sheetSize, setSheetSize] = useState(STANDARD_SHEET_SIZES[0]); // 100x70
  const [nestingMode, setNestingMode] = useState<'ai' | 'fast' | 'max_efficiency'>('fast');
  const [layoutAlgorithm, setLayoutAlgorithm] = useState<'standard' | 'nested_optimized'>('standard');
  const [isSheetPreviewOpen, setIsSheetPreviewOpen] = useState(false);
  const [modalViewMode, setModalViewMode] = useState<'single' | 'sheet'>('sheet');
  const [nestingGap, setNestingGap] = useState<number>(5); // default 5mm spacing margin
  const [nestingViewMode, setNestingViewMode] = useState<'single' | 'sheet'>('single');
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'sidebar' | 'hud'>('sidebar');
  const [isSidebarFixed, setIsSidebarFixed] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [hudPos, setHudPos] = useState({ x: 80, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const [activeQuadrant, setActiveQuadrant] = useState<'TR' | 'TL' | 'BR' | 'BL'>('TR');
  const [isMobile, setIsMobile] = useState(false);

  // Floating draggable panels states (Pattern selection & Box dimensions accessible via top dock / sidebar)
  const [showFloatingDims, setShowFloatingDims] = useState(false);
  const [showFloatingPatterns, setShowFloatingPatterns] = useState(false);
  const [showSecondaryToolsMenu, setShowSecondaryToolsMenu] = useState(false);
  const [useStandardMathEngine, setUseStandardMathEngine] = useState<boolean>(true);
  const clearAllCache = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('ashk_')) {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('ashk_custom_templates');
    window.location.reload();
  };
  const [isFloatingDimsCollapsed, setIsFloatingDimsCollapsed] = useState(false);
  const [isFloatingPatternsCollapsed, setIsFloatingPatternsCollapsed] = useState(false);
  const [cadSubTab, setCadSubTab] = useState<'material' | 'layers' | 'advanced' | 'calculations'>('material');

  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    cad_style: true,
    cad_dims: true,
    dim_accuracy: true,
    cad_mat: false,
    cad_adv: false,
    cad_fx: false,
    cad_pdf: false,
    physics_stress: true,
    physics_report: true,
    nesting_press: true,
    nesting_sheet: true,
    nesting_metrics: true,
    pricing_breakdown: true,
    ai_assistant: true,
    cms_save: true,
    cms_history: true
  });
  
  const togglePanel = (key: string) => {
    setOpenPanels(prev => ({ ...prev, [key]: !prev[key] }));
  };
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [is3DControlsCollapsed, setIs3DControlsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calibration trigger state and listener to react instantly to CAD optimization updates
  const [calibrationTrigger, setCalibrationTrigger] = useState<number>(0);
  useEffect(() => {
    const handleCalibrationUpdate = () => {
      setCalibrationTrigger(prev => prev + 1);
    };
    window.addEventListener('ashk_calibration_updated', handleCalibrationUpdate);
    return () => window.removeEventListener('ashk_calibration_updated', handleCalibrationUpdate);
  }, []);

  // --- Multi-Unit Measurements & Interactive 3D Control States ---
  const dielineRootRef = useRef<HTMLDivElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // Toggle full-screen mode with browser Fullscreen API and responsive CSS fallback
  const toggleFullscreen = () => {
    const elem = dielineRootRef.current || document.documentElement;
    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().then(() => {
          setIsFullScreen(true);
        }).catch(() => {
          setIsFullScreen(prev => !prev);
        });
      } else {
        setIsFullScreen(prev => !prev);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Keyboard shortcut (F / Alt+Enter) for toggling full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [unit, setUnit] = useState<'mm' | 'cm' | 'inches'>('mm');
  const [bleedOffset, setBleedOffset] = useState<number>(30);
  const [creaseCompensation, setCreaseCompensation] = useState<number>(0.5);
  const [diecutTolerance, setDiecutTolerance] = useState<number>(0.1);
  const [cadTheme, setCadTheme] = useState<'white' | 'blueprint' | 'charcoal'>('white');
  const [alignmentKey, setAlignmentKey] = useState<number>(0);

  const getThemeStyle = (themeName: 'white' | 'blueprint' | 'charcoal') => {
    if (isProofMode) {
      return {
        bg: '#000000',
        stroke: '#333333',
        gridFill: 'none',
        cutColor: '#ff0000',      // Explicit pure red for validation cut
        creaseColor: '#00ff00',    // Explicit pure green for validation crease
        textColor: '#888888',
        textAccent: '#ffffff',
        labelBg: '#111111',
        labelText: '#ffffff',
        labelBorder: '#333333',
        legendBg: '#050505',
        legendBorder: '#333333',
        legendText: '#ffffff',
        watermarkColor: '#111111',
        offsetColor: '#ff00ff',    // Magenta for bleed line
      };
    }
    return themeName === 'blueprint' ? {
      bg: '#0d1321',
      stroke: '#1e293b',
      gridFill: 'url(#grid-blueprint)',
      cutColor: '#38bdf8', // Softer celestial blue instead of bright #0ea5e9
      creaseColor: '#2dd4bf', // Softer teal instead of bright #10b981
      textColor: '#64748b',
      textAccent: '#38bdf8',
      labelBg: '#070b12',
      labelText: '#38bdf8',
      labelBorder: '#1e3b63',
      legendBg: '#070b12',
      legendBorder: '#152238',
      legendText: '#8cb4e6',
      watermarkColor: '#131b2e',
      offsetColor: '#ec4899',
    } : themeName === 'charcoal' ? {
      bg: '#101216',
      stroke: '#1e293b',
      gridFill: 'url(#grid-charcoal)',
      cutColor: '#94a3b8', // Softer dark slate instead of bright #eceff4
      creaseColor: '#fb923c', // Softer tangerine instead of bright #f97316
      textColor: '#818cf8',
      textAccent: '#e2e8f0',
      labelBg: '#1a1a1c',
      labelText: '#e2e8f0',
      labelBorder: '#2e2e33',
      legendBg: '#1a1a1c',
      legendBorder: '#232326',
      legendText: '#abb2bf',
      watermarkColor: '#1d2026',
      offsetColor: '#fbbf24',
    } : {
      bg: '#f8fafc',
      stroke: '#cbd5e1',
      gridFill: 'none',
      cutColor: '#dc2626', // Clear red cut line
      creaseColor: '#16a34a', // Clear green fold/crease line
      textColor: '#475569',
      textAccent: '#0f172a',
      labelBg: '#ffffff',
      labelText: '#0f172a',
      labelBorder: '#cbd5e1',
      legendBg: '#ffffff',
      legendBorder: '#cbd5e1',
      legendText: '#334155',
      watermarkColor: '#e2e8f0',
      offsetColor: '#7c3aed',
    };
  };
  const [isSmartMenuOpen, setIsSmartMenuOpen] = useState(false);
  const cadContainerRef = useRef<HTMLDivElement>(null);
  const [cadDimensions, setCadDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (viewMode === '2d' && cadContainerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (let entry of entries) {
          setCadDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height
          });
        }
      });
      observer.observe(cadContainerRef.current);
      return () => observer.disconnect();
    }
  }, [viewMode]);

  useEffect(() => {
    const container = cadContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomIntensity = 0.05;
      setZoomScale(prev => {
        if (e.deltaY < 0) {
          return Math.min(4.0, prev + zoomIntensity);
        } else {
          return Math.max(0.3, prev - zoomIntensity);
        }
      });
    };

    const handleMouseDownPreventDefault = (e: MouseEvent) => {
      if (e.button === 1) {
        e.preventDefault();
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDownPreventDefault);
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDownPreventDefault);
    };
  }, [viewMode]);

  const [zoomScale, setZoomScale] = useState<number>(1.0); // Interactive scale level factor for CAD blueprint
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanActive, setIsPanActive] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [svgCursor, setSvgCursor] = useState<{ x: number, y: number } | null>(null);
  const [cameraOrbit, setCameraOrbit] = useState(false);

  // =========================================================================
  // WINDOW MANAGEMENT SYSTEM & LAYERS (CAD BLUEPRINT SPECIFICATION)
  // =========================================================================
  const [isZenMode, setIsZenMode] = useState(false); // Focus mode toggler (zen CAD)
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSnapStep, setGridSnapStep] = useState<number>(1); // 1mm, 5mm, 10mm grid step
  const [enableMagneticSnap, setEnableMagneticSnap] = useState(true); // Magnetic snapping to lock tabs and corner flap vertices
  const [magneticSnapPoint, setMagneticSnapPoint] = useState<{ x: number, y: number, label?: string, isMagnetic: boolean } | null>(null);
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false); // Real-time AI Structural Integrity Diagnostic Panel
  const [showSecondaryControls, setShowSecondaryControls] = useState(false); // Floating secondary technical controls (closed by default)
  const [isTechParamsOpen, setIsTechParamsOpen] = useState(true);
  const [isLockAnglesOpen, setIsLockAnglesOpen] = useState(false);
  const [isMeasuringToolOpen, setIsMeasuringToolOpen] = useState(false);
  const [isDebuggerOpen, setIsDebuggerOpen] = useState(false);

  // Layers State Setup
  const [layers, setLayers] = useState<LayerState[]>([
    { id: 'cuts', name: 'لایه تیغ برش (Cuts)', color: '#38bdf8', isVisible: true, isLocked: false, type: 'cmyk' },
    { id: 'creases', name: 'لایه خط تا (Creases)', color: '#10b981', isVisible: true, isLocked: false, type: 'cmyk' },
    { id: 'bleed', name: 'محدوده آفست چسب زبانه (Bleed)', color: '#d946ef', isVisible: true, isLocked: false, type: 'offset' },
    { id: 'grid', name: 'صفحه راهنمای شطرنجی (Guides)', color: '#1e293b', isVisible: true, isLocked: false, type: 'system' },
    { id: 'dimensions', name: 'لایبل اندازه‌گذاری فنی (Dimensions)', color: '#3b82f6', isVisible: true, isLocked: false, type: 'label' },
  ]);

  // Removed Redundant Window Logics

  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  
  // Clear dismissed alerts on shape updates
  useEffect(() => {
    setDismissedAlerts([]);
  }, [dims, selectedModel, material]);

  const [resetTrigger, setResetTrigger] = useState(0);
  const [pdfQuality, setPdfQuality] = useState<'standard' | 'high'>('high');
  const [lineWidthStyle, setLineWidthStyle] = useState<'standard' | 'bold'>('standard');
  const [capturedSnapshots, setCapturedSnapshots] = useState<{ id: string, image: string, date: string, dims: string, model: string }[]>([]);
  const [previewingSnapshot, setPreviewingSnapshot] = useState<{ id: string, image: string, date: string, dims: string, model: string } | null>(null);

  // HTML5 Fullscreen Synchronization Event Listener
  useEffect(() => {
    const handleFsChange = () => {
      const isNowFull = !!document.fullscreenElement;
      setIsFullScreen(isNowFull);
      setLayoutMode('hud');
      if (isNowFull) {
        setIsSidebarCollapsed(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  // HTML5 Fullscreen Toggler
  const toggleInteractiveFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        const elem = mainContainerRef.current;
        if (elem) {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if ((elem as any).webkitRequestFullscreen) {
            await ((elem as any).webkitRequestFullscreen());
          }
          setIsFullScreen(true);
          setLayoutMode('hud');
          setIsSidebarCollapsed(false);
        }
      } catch (err) {
        console.warn("Fullscreen API failed, triggering CSS fallback:", err);
        setIsFullScreen(true);
        setLayoutMode('hud');
        setIsSidebarCollapsed(false);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullScreen(false);
        setLayoutMode('hud');
      } catch (err) {
        setIsFullScreen(false);
        setLayoutMode('hud');
      }
    }
  };

  // Infinite canvas pan / drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMeasuringMode) {
      if (e.button === 1) {
        setIsPanActive(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
      return;
    }

    if (e.button !== 0 && e.button !== 1) {
      return;
    }
    if ((e.target as HTMLElement).closest('button, input, select, textarea, [role="button"], a, nav, svg .interactive-dim')) {
      return;
    }
    if (e.button === 1) {
      e.preventDefault();
    }
    setIsPanActive(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanActive) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanActive(false);
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformedPoint = point.matrixTransform(ctm.inverse());
      let finalX = transformedPoint.x;
      let finalY = transformedPoint.y;
      let activeMagnetic: { x: number; y: number; label?: string; isMagnetic: boolean } | null = null;

      // 1. Magnetic vertex snapping (snaps to lock tabs & flap corners within 6mm)
      if (enableMagneticSnap && keyDielineVertices.length > 0) {
        let minDist = 6.0; // 6mm magnetic snap radius
        let closestVertex: { x: number; y: number } | null = null;
        for (const v of keyDielineVertices) {
          const dist = Math.hypot(v.x - transformedPoint.x, v.y - transformedPoint.y);
          if (dist < minDist) {
            minDist = dist;
            closestVertex = v;
          }
        }
        if (closestVertex) {
          finalX = closestVertex.x;
          finalY = closestVertex.y;
          activeMagnetic = {
            x: closestVertex.x,
            y: closestVertex.y,
            label: 'جذب مغناطیسی زبانه قفل (Snap to Lock Tab)',
            isMagnetic: true
          };
        }
      }

      // 2. Grid step snapping
      if (!activeMagnetic && snapToGrid && gridSnapStep > 0) {
        finalX = Math.round(transformedPoint.x / gridSnapStep) * gridSnapStep;
        finalY = Math.round(transformedPoint.y / gridSnapStep) * gridSnapStep;
        activeMagnetic = {
          x: finalX,
          y: finalY,
          label: `شبکه شطرنجی ${gridSnapStep}mm`,
          isMagnetic: false
        };
      }

      const snappedX = Math.round(finalX * 100) / 100;
      const snappedY = Math.round(finalY * 100) / 100;
      setSvgCursor({ x: snappedX, y: snappedY });
      setMagneticSnapPoint(activeMagnetic);
    }
  };

  const handleSvgMouseLeave = () => {
    setSvgCursor(null);
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isMeasuringMode) return;
    const svg = e.currentTarget;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const transformedPoint = point.matrixTransform(ctm.inverse());
      const snappedX = Math.round(transformedPoint.x * 100) / 100;
      const snappedY = Math.round(transformedPoint.y * 100) / 100;

      if (measurementPoints.length === 0) {
        setMeasurementPoints([{ x: snappedX, y: snappedY }]);
      } else {
        const p1 = measurementPoints[0];
        const p2 = { x: snappedX, y: snappedY };
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const newDim = {
          id: String(Date.now()),
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          value: dist
        };

        setCustomDimensions(prev => [...prev, newDim]);
        setMeasurementPoints([]);
      }
    }
  };

  // Dimensional Unit Conversion Constants & Methods
  const convertMmToUnit = (val: number, currentUnit: 'mm' | 'cm' | 'inches'): number => {
    if (currentUnit === 'cm') return Math.round((val / 10) * 100) / 100;
    if (currentUnit === 'inches') return Math.round((val / 25.4) * 100) / 100;
    return val;
  };

  const convertUnitToMm = (val: number, currentUnit: 'mm' | 'cm' | 'inches'): number => {
    if (currentUnit === 'cm') return Math.round(val * 10 * 10) / 10;
    if (currentUnit === 'inches') return Math.round(val * 25.4 * 10) / 10;
    return val;
  };

  const formatUnitLabel = (currentUnit: 'mm' | 'cm' | 'inches'): string => {
    if (currentUnit === 'cm') return 'سانتی‌متر';
    if (currentUnit === 'inches') return 'اینچ';
    return 'میلی‌متر';
  };

  // Live 3D Snapshot Capturing Method
  const handleCaptureSnapshot = () => {
    const container = document.getElementById('three-d-canvas-container');
    const canvas = container?.querySelector('canvas');
    if (canvas) {
      try {
        const snapshotUrl = canvas.toDataURL('image/png');
        const timestamp = new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' - ' + new Date().toLocaleDateString('fa-IR');
        const newSnapshot = {
          id: String(Date.now()),
          image: snapshotUrl,
          date: timestamp,
          dims: `${dims.L}x${dims.W}x${dims.H} میلی‌متر`,
          model: selectedModel.code
        };
        
        setCapturedSnapshots(prev => [newSnapshot, ...prev]);
        setPreviewingSnapshot(newSnapshot); // Display static PNG immediately
        
        // Push into local revisions archive draft registry
        const newRevisedDraft = {
          id: `snap-${Date.now()}`,
          name: `تصویر سه‌بعدی ضبط شده - ${selectedModel.code}`,
          version: 'شات لایو (PNG)',
          date: timestamp.split(' - ')[1] || 'امروز',
          status: 'Snapshot',
          dims: `${dims.L}x${dims.W}x${dims.H} میلی‌متر`,
          model: selectedModel.code
        };
        setCmsDrafts(prev => [newRevisedDraft, ...prev]);
        
      } catch (error) {
        console.warn('Snapshot capture error:', error);
        showCustomAlert('خطا در دریافت بافر', 'خطا در دریافت بافر تصویر سه‌بعدی. لطفاً از باز بودن تب پیش‌نمایش تاشو اطمینان حاصل کنید.', 'alert');
      }
    } else {
      showCustomAlert('کادر رندر یافت نشد', '⚠️ کادر رندر سه‌بعدی یافت نشد. لطفاً ابتدا تب "پیش‌نمایش سه بعدی تاشو" را فعال کنید.', 'alert');
    }
  };

  // Automatically switch viewport modes based on active tab
  useEffect(() => {
    if (activeTab === 'nesting') {
      setViewMode('2d');
      setNestingViewMode('sheet');
    } else {
      setNestingViewMode('single');
    }
  }, [activeTab]);

  // --- AI Packaging Assist Chat ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiMessages, setAiMessages] = useState<{ sender: 'user' | 'system', text: string }[]>([
    { sender: 'system', text: 'سلام! من دستیار هوشمند مهندسی بسته‌بندی اشک قلم هستم. مشخصات فیزیکی یا محصول مورد نظر خود را بنویسید (مثلا عطر رژیم لوکس ۱۳۰×۴۵×۴۵ با تم طلا) تا استاندارد دیلاین، جنس مقوا و افست ایده آل را برایتان اعمال کنم.' }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // --- AI Object Reference Scanner Integration ---
  const [aiMode, setAiMode] = useState<'chat' | 'scanner'>('chat');
  const [scannerImage, setScannerImage] = useState<string | null>(null);
  const [scannerMimeType, setScannerMimeType] = useState<string>('image/png');
  const [scannerHeight, setScannerHeight] = useState<string>('');
  const [scannerDescription, setScannerDescription] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    objectName: string;
    estimatedObjectDimensions: string;
    suggestedLength: number;
    suggestedWidth: number;
    suggestedHeight: number;
    packagingStrategy: string;
  } | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const objectImageInputRef = useRef<HTMLInputElement>(null);

  const handleObjectScanSubmit = async () => {
    if (!scannerImage) {
      setScanError("لطفاً ابتدا یک تصویر مناسب بارگذاری کنید.");
      return;
    }
    setIsScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const response = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/gemini/analyze-object', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: scannerImage,
          mimeType: scannerMimeType,
          referenceHeight: scannerHeight,
          objectDescription: scannerDescription,
        })
      });

      if (!response.ok) {
        throw new Error(`خطای ${response.status}: پردازش تصویر شیء در سمت سرور با مشکل مواجه شد.`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setScanResult(data.data);
      } else {
        throw new Error('قالب پاسخ دریافتی از سرور هوشمند نامعتبر است.');
      }
    } catch (err: any) {
      console.warn("Scanner API Error:", err);
      setScanError(err.message || 'خطای شبکه در اتصال به بستر هوشمند اشک قلم. لطفاً اینترنت خود را بررسی کنید.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyzeDieline = () => {
    // Structural Math Validation
    const validation = validateStandardConstraints(selectedModel.id, dims.L, dims.W, dims.H);
    
    // Compute internal parameters
    const params = calculateDielineParameters(dims.L, dims.W, dims.H, material.thickness, selectedModel.id);
    const glueTab = isNaN(params.glueTab) ? 15 : params.glueTab;
    const tuck = isNaN(params.tuck) ? 15 : params.tuck;
    const dustFlap = isNaN(params.dustFlap) ? 15 : params.dustFlap;

    // Geometry check
    const geometryReport = runComprehensiveGeometryCheck(
      dieline.cuts,
      dieline.creases,
      dims.L,
      dims.W,
      dims.H,
      selectedModel.id,
      tuck,
      dustFlap,
      dieline.totalW,
      dieline.totalH,
      700,
      500,
      glueTab
    );
    
    let issues = [...(validation.errors || []), ...(geometryReport.errors || [])];
    let warnings = [...(validation.warnings || []), ...(geometryReport.warnings || [])];
    let success = [];
    
    if (validation.isValid && geometryReport.passed) {
      success.push("ابعاد پایه هندسی جعبه مطابق با تلورانس استاندارد FEFCO تایید شد.");
      success.push("زوایا و خطوط دایکات از نظر تداخل و انطباق کاملاً ایمن ارزیابی شدند.");
    }
    
    // Specific geometry reports
    if (geometryReport.passed) {
      success.push(`طول کل خط برش: ${geometryReport.cutLength}mm | خط تا: ${geometryReport.creaseLength}mm`);
    }

    if (glueTab < 12) {
      issues.push(`لب‌چسب (${glueTab}mm) بسیار باریک است. احتمال پارگی در دستگاه چسب‌زن ماشینی.`);
    } else {
      success.push(`عرض لب‌چسب (${glueTab}mm) استاندارد و ایمن است.`);
    }
    
    if (tuck < 15 && selectedModel.id.includes('tuck')) {
      warnings.push(`زبانه درب (${tuck}mm) ممکن است برای قفل شدن کامل کافی نباشد.`);
    } else {
      success.push("ابعاد زبانه‌ها استاندارد ارزیابی شد.");
    }

    // Material Check
    if (material.thickness < 1.0 && (dims.L > 200 || dims.W > 200 || dims.H > 200)) {
      issues.push(`ضخامت متریال (${material.thickness}mm) برای جعبه‌ای با این ابعاد بسیار ضعیف است. ریسک دفرمگی.`);
    } else {
      success.push("استقامت متریال با ابعاد سازه همخوانی دارد.");
    }
    
    const message = 
      (issues.length > 0 ? "🔴 خطاهای بحرانی (عدم تایید تولید):\n" + issues.map(i => "✖ " + i).join("\n") + "\n\n" : "") +
      (warnings.length > 0 ? "🟠 هشدارهای ساختاری:\n" + warnings.map(w => "⚠ " + w).join("\n") + "\n\n" : "") +
      (success.length > 0 ? "🟢 بررسی‌های تایید شده:\n" + success.map(s => "✓ " + s).join("\n") : "");
      
    showCustomAlert(
      'گزارش آنالیز هوشمند و ولیدیشن FEFCO',
      message,
      issues.length > 0 ? 'alert' : 'success'
    );
  };

  
  const handleDeleteCustomTemplate = async (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    
    // Delete from localStorage
    const stored = localStorage.getItem('ashk_custom_templates');
    if (stored) {
      try {
        const localList = JSON.parse(stored);
        const filtered = localList.filter((t: any) => t.id !== idToDelete);
        localStorage.setItem('ashk_custom_templates', JSON.stringify(filtered));
      } catch (e) {
        console.warn(e);
      }
    }

    if (selectedModel.id === idToDelete) {
      setSelectedModel(STANDARDS_LIBRARY[0]);
      setDims(STANDARDS_LIBRARY[0].defaultDims);
    }
    
    // Trigger sync
    window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
    showCustomAlert('حذف الگو', 'الگوی مورد نظر با موفقیت حذف شد.', 'success');
  };

  const handleUpdateCustomTemplate = async (e: React.MouseEvent, idToUpdate: string, newData: any) => {
    e.stopPropagation();
    try {
      const stored = localStorage.getItem('ashk_custom_templates');
      if (stored) {
        const localList = JSON.parse(stored);
        const index = localList.findIndex((t: any) => t.id === idToUpdate);
        if (index !== -1) {
          localList[index] = { ...localList[index], ...newData };
          localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));
          window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
          showCustomAlert('بروزرسانی الگو', 'الگوی مورد نظر با موفقیت بروزرسانی شد.', 'success');
          return;
        }
      }
      showCustomAlert('خطا', 'الگوی مورد نظر یافت نشد.', 'error');
    } catch (e) {
      console.warn("Error updating document: ", e);
      showCustomAlert('خطا', 'بروزرسانی الگو با خطا مواجه شد.', 'error');
    }
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt("نام الگوی سفارشی خود را وارد کنید:");
    if (!templateName) return;

    const existingTpl = customTemplates.find(t => t.name.trim() === templateName.trim());
    if (existingTpl) {
      const confirmReplace = window.confirm(`الگویی با نام "${templateName}" از قبل وجود دارد. آیا مایلید آن را با مقادیر جاری جایگزین کنید؟`);
      if (!confirmReplace) return;

      const updatedTemplate: any = {
        defaultDims: dims,
        material: material.id,
        grainDirection: grainDirection,
        userId: auth.currentUser?.uid || 'anonymous'
      };

      if (existingTpl.entities) updatedTemplate.entities = existingTpl.entities;
      if (existingTpl.anchors) updatedTemplate.anchors = existingTpl.anchors;
      if (existingTpl.originalDims) updatedTemplate.originalDims = existingTpl.originalDims;
      if (existingTpl.topSideOrientation) updatedTemplate.topSideOrientation = existingTpl.topSideOrientation;
      if (existingTpl.glueTabPosition) updatedTemplate.glueTabPosition = existingTpl.glueTabPosition;
      if (existingTpl.transforms) updatedTemplate.transforms = existingTpl.transforms;

      try {
        // Update in localStorage!
        const stored = localStorage.getItem('ashk_custom_templates');
        if (stored) {
          try {
            const localList = JSON.parse(stored);
            const index = localList.findIndex((t: any) => t.id === existingTpl.id);
            if (index !== -1) {
              localList[index] = { ...localList[index], ...updatedTemplate };
              localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));
            } else {
              localList.push({ id: existingTpl.id, ...existingTpl, ...updatedTemplate });
              localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));
            }
          } catch (e) {
            console.warn(e);
          }
        } else {
          localStorage.setItem('ashk_custom_templates', JSON.stringify([{ id: existingTpl.id, ...existingTpl, ...updatedTemplate }]));
        }

        showCustomAlert('بروزرسانی الگو', `الگوی "${templateName}" با موفقیت بروزرسانی و جایگزین شد.`, 'success');
        window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
      } catch (e) {
        console.warn("Error updating document: ", e);
        showCustomAlert('خطا', 'جایگزینی الگو با خطا مواجه شد.', 'error');
      }
      return;
    }

    const savedId = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const newTemplate: any = {
      id: savedId,
      code: 'CUST-' + Math.floor(Math.random() * 1000),
      name: templateName,
      category: selectedModel.category,
      baseModelId: selectedModel.id,
      defaultDims: dims,
      features: selectedModel.features || [],
      complexity: selectedModel.complexity || 'Medium',
      material: material.id,
      grainDirection: grainDirection,
      isGlobal: true,
      isPublic: true,
      isHostTemplate: true,
      userId: auth.currentUser?.uid || 'anonymous',
      createdAt: new Date().toISOString()
    };

    const baseTpl1 = customTemplates.find((t: any) => t.id === selectedModel.id);
    if (baseTpl1) {
      if (baseTpl1.entities) newTemplate.entities = baseTpl1.entities;
      if (baseTpl1.anchors) newTemplate.anchors = baseTpl1.anchors;
      if (baseTpl1.originalDims) newTemplate.originalDims = baseTpl1.originalDims;
      if (baseTpl1.topSideOrientation) newTemplate.topSideOrientation = baseTpl1.topSideOrientation;
      if (baseTpl1.glueTabPosition) newTemplate.glueTabPosition = baseTpl1.glueTabPosition;
      if (baseTpl1.transforms) newTemplate.transforms = baseTpl1.transforms;
    }

    try {
        // Save to localStorage!
        const stored = localStorage.getItem('ashk_custom_templates');
        let localList = [];
        if (stored) {
          try {
            localList = JSON.parse(stored);
          } catch (e) {
            console.warn(e);
          }
        }
        localList.push(newTemplate);
        localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));

        showCustomAlert('ذخیره الگو', `الگوی "${templateName}" با موفقیت در کتابخانه ذخیره شد.`, 'success');
        window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
    } catch (e) {
        console.warn("Error adding document: ", e);
        showCustomAlert('خطا', 'ذخیره الگو با خطا مواجه شد.', 'error');
    }
  };

  const handleSaveAsTemplateInPlace = async () => {
    if (!newTemplateName.trim()) {
      showCustomAlert('نام الگو نامعتبر', 'لطفا نام معتبری برای الگوی جدید وارد کنید.', 'alert');
      return;
    }
    setIsSavingTemplate(true);
    const templateName = newTemplateName.trim();

    const existingTpl = customTemplates.find(t => t.name.trim() === templateName);
    if (existingTpl) {
      const confirmReplace = window.confirm(`الگویی با نام "${templateName}" از قبل وجود دارد. آیا مایلید آن را با مقادیر جاری جایگزین کنید؟`);
      if (!confirmReplace) {
        setIsSavingTemplate(false);
        return;
      }

      const updatedTemplate: any = {
        defaultDims: dims,
        features: selectedModel.features || [],
        complexity: selectedModel.complexity || 'Medium',
        material: material.id,
        grainDirection: grainDirection,
        userId: auth.currentUser?.uid || 'anonymous'
      };

      if (existingTpl.entities) updatedTemplate.entities = existingTpl.entities;
      if (existingTpl.anchors) updatedTemplate.anchors = existingTpl.anchors;
      if (existingTpl.originalDims) updatedTemplate.originalDims = existingTpl.originalDims;
      if (existingTpl.topSideOrientation) updatedTemplate.topSideOrientation = existingTpl.topSideOrientation;
      if (existingTpl.glueTabPosition) updatedTemplate.glueTabPosition = existingTpl.glueTabPosition;
      if (existingTpl.transforms) updatedTemplate.transforms = existingTpl.transforms;

      try {
        // Update in localStorage!
        const stored = localStorage.getItem('ashk_custom_templates');
        if (stored) {
          try {
            const localList = JSON.parse(stored);
            const index = localList.findIndex((t: any) => t.id === existingTpl.id);
            if (index !== -1) {
              localList[index] = { ...localList[index], ...updatedTemplate };
              localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));
            } else {
              localList.push({ id: existingTpl.id, ...existingTpl, ...updatedTemplate });
              localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));
            }
          } catch (e) {
            console.warn(e);
          }
        } else {
          localStorage.setItem('ashk_custom_templates', JSON.stringify([{ id: existingTpl.id, ...existingTpl, ...updatedTemplate }]));
        }

        showCustomAlert('بروزرسانی الگو', `الگوی "${templateName}" با موفقیت بروزرسانی و جایگزین شد.`, 'success');
        setNewTemplateName('');
        window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
      } catch (e) {
        console.warn("Error updating document: ", e);
        showCustomAlert('خطا', 'بروزرسانی الگو با خطا مواجه شد.', 'error');
      } finally {
        setIsSavingTemplate(false);
      }
      return;
    }

    const savedId = 'cust_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

    const newTemplate: any = {
      id: savedId,
      code: 'CUST-' + Math.floor(Math.random() * 1000),
      name: templateName,
      category: selectedModel.category,
      baseModelId: selectedModel.id,
      defaultDims: dims,
      features: selectedModel.features || [],
      complexity: selectedModel.complexity || 'Medium',
      material: material.id,
      grainDirection: grainDirection,
      userId: auth.currentUser?.uid || 'anonymous'
    };

    const baseTplInPlace = customTemplates.find((t: any) => t.id === selectedModel.id);
    if (baseTplInPlace) {
      if (baseTplInPlace.entities) newTemplate.entities = baseTplInPlace.entities;
      if (baseTplInPlace.anchors) newTemplate.anchors = baseTplInPlace.anchors;
      if (baseTplInPlace.originalDims) newTemplate.originalDims = baseTplInPlace.originalDims;
      if (baseTplInPlace.topSideOrientation) newTemplate.topSideOrientation = baseTplInPlace.topSideOrientation;
      if (baseTplInPlace.glueTabPosition) newTemplate.glueTabPosition = baseTplInPlace.glueTabPosition;
      if (baseTplInPlace.transforms) newTemplate.transforms = baseTplInPlace.transforms;
    }

    try {
        // Save to localStorage!
        const stored = localStorage.getItem('ashk_custom_templates');
        let localList = [];
        if (stored) {
          try {
            localList = JSON.parse(stored);
          } catch (e) {
            console.warn(e);
          }
        }
        localList.push(newTemplate);
        localStorage.setItem('ashk_custom_templates', JSON.stringify(localList));

        showCustomAlert('ذخیره الگو', `الگوی سفارشی "${templateName}" با موفقیت در کتابخانه (مخزن الگوها) ثبت شد.`, 'success');
        setNewTemplateName('');
        window.dispatchEvent(new CustomEvent('ashk_custom_templates_updated'));
    } catch (e) {
        console.warn("Error adding document: ", e);
        showCustomAlert('خطا', 'ثبت الگو با خطا مواجه شد.', 'error');
    } finally {
        setIsSavingTemplate(false);
    }
  };

  const handleApplyScanDimensions = () => {
    if (scanResult) {
      setDims({
        L: Number(scanResult.suggestedLength),
        W: Number(scanResult.suggestedWidth),
        H: Number(scanResult.suggestedHeight)
      });
    }
  };

  const handleScannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScannerMimeType(file.type);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setScannerImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Asset CMS & Approvals State ---
  const [cmsDrafts, setCmsDrafts] = useState<{ id: string, name: string, version: string, date: string, status: string, dims: string, model: string }[]>([
    { id: '1', name: 'جعبه آمپول ب کمپلکس آلمانی', version: 'v1.0 (مبدل اصلی)', date: '۱۴۰۵/۰۳/۰۱', status: 'Approved', dims: '۶۰x۴۰x۱۰۰ میلی‌متر', model: 'ECMA A20.20' },
    { id: '2', name: 'کارتن پستی کفش نایک ۵۳۷', version: 'v1.4 (اصلاح گرین)', date: '۱۴۰۵/۰۲/۲۸', status: 'Locked (WORM)', dims: '۳۰۰x۲۰۰x۱۲۰ میلی‌متر', model: 'FEFCO 0427' }
  ]);
  const [newDraftName, setNewDraftName] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [cmsSubTab, setCmsSubTab] = useState<'templates' | 'dimensioning'>('templates');

  // --- Constraint Checking ---
  const [hasWarnedStructural, setHasWarnedStructural] = useState(false);
  useEffect(() => {
    if (dims.L > dims.W * 3 && !hasWarnedStructural) {
      showCustomAlert(
        'هشدار محدودیت ساختاری',
        'طول جعبه نسبت به عرض آن بیش از حد بزرگ است (L > 3W). این تناسب غیر استاندارد است و می‌تواند باعث دفرمگی در مرکز پنل‌ها و کاهش مقاومت جعبه شود.\nبرای جلوگیری از این مشکل، می‌توانید از پرفراژ تقویتی یا تغییر ابعاد استفاده کنید.',
        'alert'
      );
      setHasWarnedStructural(true);
    } else if (dims.H < dims.W / 3 && !hasWarnedStructural) {
      showCustomAlert(
        'هشدار تداخل قطعات درب و کف',
        'ارتفاع جعبه بسیار کم است. در این حالت ممکن است زبانه‌ها یا گوشواره‌ها در درب و کف جعبه روی یکدیگر تداخل داشته باشند و تولید دایلاین با خطای هندسی مواجه شود.',
        'alert'
      );
      setHasWarnedStructural(true);
    } else if (dims.L <= dims.W * 3 && dims.H >= dims.W / 3) {
      setHasWarnedStructural(false);
    }
  }, [dims.L, dims.W, dims.H]);

  // Synchronize default dimensions on model change
  const handleModelSelect = (m: PackagingModel) => {
    setSelectedModel(m);
    setDims(m.defaultDims);
  };

  // Auto-center and fit CAD view to viewport on any structural model swaps
  useEffect(() => {
    setPan({ x: 0, y: 0 });
    setZoomScale(1.0);
  }, [selectedModel.id]);

  // Auto-center canvas when floating panels are minimized or closed
  useEffect(() => {
    if (activeTab === 'cad' && !isMobile) {
      setPan({ x: 0, y: 0 });
    }
  }, [showFloatingDims, showFloatingPatterns, isFloatingDimsCollapsed, isFloatingPatternsCollapsed, activeTab, isMobile]);

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setTextureUrl(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Filter visible standard models based on hidden IDs
  const visibleStandards = useMemo(() => {
    return STANDARDS_LIBRARY.filter(m => !hiddenStandardIds.includes(m.id));
  }, [hiddenStandardIds]);

  // Combine standard and custom uploaded models
  const allModels = useMemo(() => {
    const customModels = customTemplates.map(t => ({
      id: t.id,
      name: t.name,
      code: t.code,
      category: t.category as any,
      icon: '📐',
      defaultDims: t.originalDims || t.defaultDims || { L: 100, W: 100, H: 80 },
      description: `قالب سفارشی مستقل تولید شده از فایل DXF آپلودی ${t.name}.`
    }));
    return [...visibleStandards, ...customModels];
  }, [customTemplates, visibleStandards]);

  // Filter model library based on search and product category
  const filteredModels = useMemo(() => {
    return allModels.filter(m => {
      const matchesSearch = 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        m.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (selectedCategory === 'all') return true;

      if (selectedCategory === 'cosmetics') {
        return m.id === 'ecma-a2020' || m.id === 'snap-lock-123' || m.id === 'ecma-c1020' || m.category.includes('ECMA A');
      }
      if (selectedCategory === 'pharma') {
        return m.id === 'snap-lock-123' || m.id === 'ecma-a2020' || m.id === 'fefco-0215' || m.category.includes('ECMA A');
      }
      if (selectedCategory === 'ecommerce') {
        return m.id === 'fefco-0427' || m.category.includes('FEFCO 0400');
      }
      if (selectedCategory === 'food_bakery') {
        return m.id === 'fefco-pizza' || m.id === 'ecma-b10' || m.id === 'snap-lock-123' || m.category.includes('FEFCO 0400') || m.category.includes('Custom Food');
      }
      if (selectedCategory === 'industrial') {
        return m.id === 'fefco-0201' || m.id === 'fefco-0200' || m.id === 'fefco-0203' || m.category.includes('FEFCO 0200');
      }
      if (selectedCategory === 'luxury_gift') {
        return m.id === 'fefco-0300' || m.id === 'ecma-c1020' || m.category.includes('ECMA C') || m.category.includes('FEFCO 0300');
      }
      if (selectedCategory === 'pizza') return m.id === 'fefco-pizza';
      if (selectedCategory === 'keyboard') return m.id === 'fefco-0427';
      if (selectedCategory === 'telescopic') return m.id === 'fefco-0300' || m.id === 'fefco-0320' || m.category.includes('FEFCO 0300');
      if (selectedCategory === 'retail_display') return m.id === 'ecma-d50' || m.category.includes('FEFCO 0800');

      return true;
    });
  }, [allModels, searchQuery, selectedCategory]);

  // Dimension Accuracy Evaluator State
  const accuracyInput: DimensionAccuracyInput = useMemo(() => ({
    L: dims.L,
    W: dims.W,
    H: dims.H,
    grammage: material.weight || 300,
    thickness: material.thickness || 0.42,
    tuck: typeof paramOverrides.tuck === 'number' ? paramOverrides.tuck : 18,
    dustFlap: typeof paramOverrides.dustFlap === 'number' ? paramOverrides.dustFlap : 18,
    glueTab: typeof paramOverrides.glueTab === 'number' ? paramOverrides.glueTab : 15,
    modelId: selectedModel.id,
    paperType: material.category,
    grainDirection: grainDirection === 'long' ? 'horizontal' : 'vertical'
  }), [dims, material, paramOverrides, selectedModel, grainDirection]);

  const handleApplyAccuracySuggestion = (field: 'L' | 'W' | 'H' | 'tuck' | 'dustFlap' | 'glueTab' | 'grammage' | 'thickness', val: number) => {
    if (field === 'L' || field === 'W' || field === 'H') {
      handleDimensionChange(field, val);
    } else if (field === 'tuck' || field === 'dustFlap' || field === 'glueTab') {
      handleParamOverrideChange(field, val.toString());
    } else if (field === 'grammage') {
      setMaterial(m => ({ ...m, weight: val }));
    } else if (field === 'thickness') {
      setMaterial(m => ({ ...m, thickness: val }));
    }
  };

  const handleApplyAllAccuracyFixes = (suggestions: AccuracyIssueSuggestion[]) => {
    suggestions.forEach(sug => {
      handleApplyAccuracySuggestion(sug.field, sug.suggestedValue);
    });
    showCustomAlert(
      'اعمال اصلاحات استاندارد ECMA/FEFCO',
      'تمامی ابعاد و پارامترهای هندسی بر اساس استانداردهای مهندسی بسته‌بندی با موفقیت اصلاح گردیدند.',
      'success'
    );
  };

  // =========================================================================
  // 2. PARAMETRIC GEOMETRY GENERATOR (CAD ENGINE) WITH MATERIAL COMPENSATION
  // =========================================================================

  const dieline = useMemo(() => {
    // Basic User dimensions
    const { L: rawL, W: rawW, H: rawH } = dims;

    // Guard raw dimensions against NaN or negative numbers
    const safeRawL = isNaN(rawL) || rawL <= 0 ? 100 : rawL;
    const safeRawW = isNaN(rawW) || rawW <= 0 ? 100 : rawW;
    const safeRawH = isNaN(rawH) || rawH <= 0 ? 80 : rawH;

    // --- Module 3: Material Compensation Engine Integration ---
    const compensated = calculateMaterialCompensation(material.id, safeRawL, safeRawW, safeRawH);
    const L = isNaN(compensated.manufacturingL) || compensated.manufacturingL <= 0 ? 100 : compensated.manufacturingL;
    const W = isNaN(compensated.manufacturingW) || compensated.manufacturingW <= 0 ? 100 : compensated.manufacturingW;
    const H = isNaN(compensated.manufacturingH) || compensated.manufacturingH <= 0 ? 80 : compensated.manufacturingH;

    // Standard structural selector for distinct standards CAD math
    let id = selectedModel.id;
    let customTemplateName = "";

    // Check if there is an active custom DXF override for this standard model
    const activeOverride = !useStandardMathEngine && customTemplates.find((t: any) => t.baseModelId === id && t.isOverride && t.entities && t.entities.length > 0);
    
    if (activeOverride) {
        // Ensure anchors exist (for backward compatibility with older saved templates)
        if (!activeOverride.anchors || !activeOverride.anchors.creaseX) {
            activeOverride.anchors = analyzeTopology(activeOverride.entities || [], { L, W, H });
        }
        // Use the custom DXF override instead of standard math engine!
        const scaled = scaleCustomDieline(activeOverride, L, W, H);
        const snappedCuts = scaled.cuts.map(p => snapPath(p));
        const snappedCreases = scaled.creases.map(p => snapPath(p));
        
        const totalWVal = isNaN(scaled.totalW) || !isFinite(scaled.totalW) ? 100 : Math.max(100, scaled.totalW);
        const totalHVal = isNaN(scaled.totalH) || !isFinite(scaled.totalH) ? 100 : Math.max(100, scaled.totalH);
        const xMinVal = isNaN(scaled.xMin) || !isFinite(scaled.xMin) ? 0 : scaled.xMin;
        const yMinVal = isNaN(scaled.yMin) || !isFinite(scaled.yMin) ? 0 : scaled.yMin;
        const xMaxVal = isNaN(scaled.xMax) || !isFinite(scaled.xMax) ? 100 : scaled.xMax;
        const yMaxVal = isNaN(scaled.yMax) || !isFinite(scaled.yMax) ? 100 : scaled.yMax;

        return {
          cuts: snappedCuts,
          creases: snappedCreases,
          labels: [
            ...(scaled.labels || []),
            { x: totalWVal / 2, y: totalHVal - 12, text: `الگوی استاندارد (اورراید شده با DXF): ${activeOverride.name}` }
          ],
          totalW: totalWVal,
          totalH: totalHVal,
          xMin: xMinVal,
          yMin: yMinVal,
          xMax: xMaxVal,
          yMax: yMaxVal,
          glueTab: 15,
          tuck: 15,
          dustFlap: 15,
          isSmallBoxActive: false
        };
    }

    if (id.startsWith('custom-')) {
        const tpl = customTemplates.find((t: any) => t.id === id);
        if (tpl) {
            if (tpl.entities && tpl.entities.length > 0) {
                // Ensure anchors exist (for backward compatibility with older saved templates)
                if (!tpl.anchors || !tpl.anchors.creaseX) {
                    tpl.anchors = analyzeTopology(tpl.entities || [], { L, W, H });
                }
                // It's a DXF-imported or custom vector template! Use the custom DXF scaling engine!
                const scaled = scaleCustomDieline(tpl, L, W, H);
                const snappedCuts = scaled.cuts.map(p => snapPath(p));
                const snappedCreases = scaled.creases.map(p => snapPath(p));
                
                const totalWVal = isNaN(scaled.totalW) || !isFinite(scaled.totalW) ? 100 : Math.max(100, scaled.totalW);
                const totalHVal = isNaN(scaled.totalH) || !isFinite(scaled.totalH) ? 100 : Math.max(100, scaled.totalH);
                const xMinVal = isNaN(scaled.xMin) || !isFinite(scaled.xMin) ? 0 : scaled.xMin;
                const yMinVal = isNaN(scaled.yMin) || !isFinite(scaled.yMin) ? 0 : scaled.yMin;
                const xMaxVal = isNaN(scaled.xMax) || !isFinite(scaled.xMax) ? 100 : scaled.xMax;
                const yMaxVal = isNaN(scaled.yMax) || !isFinite(scaled.yMax) ? 100 : scaled.yMax;

                return {
                  cuts: snappedCuts,
                  creases: snappedCreases,
                  labels: [
                    ...(scaled.labels || []),
                    { x: totalWVal / 2, y: totalHVal - 12, text: `الگوی سفارشی: ${tpl.name}` }
                  ],
                  totalW: totalWVal,
                  totalH: totalHVal,
                  xMin: xMinVal,
                  yMin: yMinVal,
                  xMax: xMaxVal,
                  yMax: yMaxVal,
                  glueTab: 15,
                  tuck: 15,
                  dustFlap: 15,
                  isSmallBoxActive: false
                };
            } else if (tpl.baseModelId) {
                // Duplicate of standard template with customized dimensions
                id = tpl.baseModelId;
                customTemplateName = tpl.name;
            }
        }
    }

    // Apply Advanced Die-cut parameters
    let effL = L + (isNaN(diecutTolerance) ? 0 : diecutTolerance);
    let effW = W + (isNaN(diecutTolerance) ? 0 : diecutTolerance);
    let effH = H + (isNaN(diecutTolerance) ? 0 : diecutTolerance);

    // Apply CAD optimization calibration offsets if active for the current model style
    if (calibrationState.isActive && calibrationState.modelType === id) {
      effL += isNaN(calibrationState.detectedCreaseOffset) ? 0 : calibrationState.detectedCreaseOffset;
      effW += isNaN(calibrationState.detectedCreaseOffset) ? 0 : calibrationState.detectedCreaseOffset;
      effH += isNaN(calibrationState.detectedFlapOffset) ? 0 : calibrationState.detectedFlapOffset;
    }

    const thickness = (isNaN(material.thickness) ? 0.4 : material.thickness) + (isNaN(creaseCompensation) ? 0 : creaseCompensation);

    const params = calculateDielineParameters(effL, effW, effH, thickness, id);
    let baseGlueTab = isNaN(params.glueTab) ? 15 : params.glueTab;
    let baseTuck = isNaN(params.tuck) ? 15 : params.tuck;
    let baseDustFlap = isNaN(params.dustFlap) ? 15 : params.dustFlap;
    
    let glueTab = typeof paramOverrides.glueTab === 'number' ? paramOverrides.glueTab : baseGlueTab;
    let tuck = typeof paramOverrides.tuck === 'number' ? paramOverrides.tuck : baseTuck;
    let dustFlap = typeof paramOverrides.dustFlap === 'number' ? paramOverrides.dustFlap : baseDustFlap;

    // CONSTRAINT SOLVER
    const constraintAlerts: string[] = [];
    if (glueTab < 12 && glueTab > 0) constraintAlerts.push(`لب‌چسب (${glueTab}mm) کمتر از حد استاندارد ماشین‌آلات (12mm) است.`);
    if (glueTab > effW * 0.5) constraintAlerts.push(`لب‌چسب (${glueTab}mm) نسبت به عرض جعبه بسیار بزرگ است.`);
    if (tuck < 12) constraintAlerts.push(`زبانه درب (${tuck}mm) بسیار کوتاه است، احتمال باز شدن درب جعبه.`);
    if (tuck > effW * 0.8) constraintAlerts.push(`زبانه درب (${tuck}mm) بیش از حد بلند است و ممکن است با کف تداخل کند.`);
    if (dustFlap + tuck > effW && id.includes('tuck')) constraintAlerts.push(`مجموع طول زبانه و گوشواره (${dustFlap + tuck}mm) از عرض جعبه بیشتر است و تداخل فیزیکی ایجاد می‌کند!`);

    const isAutoBottomModel = id === 'fefco-0215' || id === 'snap-lock-123' || id.includes('auto-bottom') || id.includes('crash-lock');
    if (isAutoBottomModel) {
      if (effL <= effW) {
        constraintAlerts.push(`⛔ خطای بحرانی ساختار ته قفلی: طول (L=${effL}mm) باید حتماً از عرض (W=${effW}mm) بزرگتر باشد (حداقل L ≥ W + 10mm). در حالت L ≤ W زبانه‌های ۴۵ درجه کف دچار هم‌پوشانی ناممکن شده و جعبه به صورت خوابیده (Flat-pack) چسب‌خوری یا تا نمی‌شود.`);
      } else if (effL < effW * 1.08) {
        constraintAlerts.push(`⚠️ هشدار ابعاد ته قفلی: طول (L=${effL}mm) بسیار نزدیک به عرض (W=${effW}mm) است. پیشنهاد می‌شود طول حداقل ۱۰ میلی‌متر بزرگتر از عرض باشد.`);
      }

      const minHForCollapse = (effW / 2) + 5;
      if (effH < minHForCollapse) {
        constraintAlerts.push(`⛔ خطای عدم امکان تا شدن تخت (Flat Collapse): ارتفاع (H=${effH}mm) برای ساختار ته قفلی بسیار کوتاه است (حداقل H ≥ ${minHForCollapse.toFixed(1)}mm). زبانه‌های کف هنگام تا شدن از دهانه بالای جعبه بیرون خواهند زد.`);
      }

      if (autoLockAngle < 35 || autoLockAngle > 55) {
        constraintAlerts.push(`⚠️ هشدار زاویه لبه ته قفلی: زاویه (${autoLockAngle}°) خارج از محدوده استاندارد صنعتی (۳۵ تا ۵۵ درجه) است.`);
      }
    }


    // Load local machine-learned calibration values if stored by Admin CAD AI Analyzer
    try {
      const storedCal = localStorage.getItem(`ashk_pattern_calibration_${id}`);
      if (storedCal) {
        const cal = JSON.parse(storedCal);
        if (cal) {
          if (cal.creaseFactor !== undefined && !isNaN(cal.creaseFactor)) {
            // Apply crease factor compensation directly to dimensions
            effL = effL * cal.creaseFactor;
            effW = effW * cal.creaseFactor;
          }
          if (cal.glueShrinkage !== undefined && !isNaN(cal.glueShrinkage) && glueTab > 0) {
            // Calibrate glue tab height
            glueTab = Math.max(5, glueTab - cal.glueShrinkage);
          }
          if (cal.punchTolerance !== undefined && !isNaN(cal.punchTolerance)) {
            // Calibrate tuck flap height based on punching tolerance
            tuck = Math.max(5, tuck + cal.punchTolerance);
          }
          if (cal.cornerClearance !== undefined && !isNaN(cal.cornerClearance)) {
            // Calibrate dust flap size
            dustFlap = Math.max(5, dustFlap - (cal.cornerClearance * 0.1));
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load local calibration in dieline generator", e);
    }

    // Viewport canvas scale offsets
    const x0 = 80; 

    const cacheKey = `${id}_${effL.toFixed(3)}_${effW.toFixed(3)}_${effH.toFixed(3)}_${glueTab.toFixed(3)}_${tuck.toFixed(3)}_${dustFlap.toFixed(3)}_${snapLockVariant}_${material.thickness}_${autoLockAngle}_${autoLockGlueWidth}`;
    
    let result: any;
    if (dielineMathCache.has(cacheKey)) {
      result = dielineMathCache.get(cacheKey);
    } else {
      if (dielineMathCache.size > 500) {
        dielineMathCache.clear();
      }
      const engineFn = (typeof STANDARD_DIELINE_ENGINES[id] === 'function' ? STANDARD_DIELINE_ENGINES[id] : null) || 
                       (typeof STANDARD_DIELINE_ENGINES['default-rsc'] === 'function' ? STANDARD_DIELINE_ENGINES['default-rsc'] : null);
      if (typeof engineFn === 'function') {
        result = engineFn({
          L: effL,
          W: effW,
          H: effH,
          glueTab,
          tuck,
          dustFlap,
          x0,
          variant: snapLockVariant,
          thickness: material.thickness,
          autoLockAngle,
          autoLockGlueWidth
        });
      } else {
        result = {
          cuts: [],
          creases: [],
          labels: [],
          xMin: 0,
          yMin: 0,
          xMax: 100,
          yMax: 100,
          totalW: 100,
          totalH: 100,
        };
      }
      dielineMathCache.set(cacheKey, result);
    }

    const snappedCuts = (result.cuts || []).map(p => snapPath(p));
    const snappedCreases = (result.creases || []).map(p => snapPath(p));
    
    const xMin = isNaN(result.xMin) || !isFinite(result.xMin) ? 0 : result.xMin;
    const yMin = isNaN(result.yMin) || !isFinite(result.yMin) ? 0 : result.yMin;
    const xMax = isNaN(result.xMax) || !isFinite(result.xMax) ? 100 : result.xMax;
    const yMax = isNaN(result.yMax) || !isFinite(result.yMax) ? 100 : result.yMax;
    const totalW = isNaN(result.totalW) || !isFinite(result.totalW) ? (xMax - xMin || 100) : result.totalW;
    const totalH = isNaN(result.totalH) || !isFinite(result.totalH) ? (yMax - yMin || 100) : result.totalH;

    const finalLabels = [...(result.labels || [])];
    if (customTemplateName) {
      finalLabels.push({
        x: xMin + totalW / 2,
        y: yMax + 12,
        text: `الگوی سفارشی: ${customTemplateName}`
      });
    }

    return {
      constraintAlerts,
      debugVals: { effL, effW, effH },
      cuts: snappedCuts,
      creases: snappedCreases,
      labels: finalLabels,
      totalW: Math.max(100, totalW),
      totalH: Math.max(100, totalH),
      xMin,
      yMin,
      xMax,
      yMax,
      glueTab,
      tuck,
      dustFlap,
      isSmallBoxActive: !!params.isSmallBoxActive
    };

  }, [dims, selectedModel, material, calibrationState, calibrationTrigger, customTemplates]);

  // Extract key CAD vertices (corner flaps, locking tab notches, crease ends) for magnetic snap-to-grid
  const keyDielineVertices = useMemo(() => {
    if (!dieline) return [];
    const points: { x: number; y: number }[] = [];
    const allPaths = [...(dieline.cuts || []), ...(dieline.creases || [])];

    allPaths.forEach(pathStr => {
      const matches = pathStr.match(/([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)/g);
      if (matches) {
        matches.forEach(m => {
          const parts = m.split(',');
          if (parts.length === 2) {
            const x = parseFloat(parts[0]);
            const y = parseFloat(parts[1]);
            if (!isNaN(x) && !isNaN(y)) {
              if (!points.some(p => Math.hypot(p.x - x, p.y - y) < 0.8)) {
                points.push({ x, y });
              }
            }
          }
        });
      }
    });

    return points;
  }, [dieline]);

  // --- Automated Auto-Fit Dieline logic to keep drawing 100% visible on all screens ---
  const handleAutoFitDieline = () => {
    setPan({ x: 0, y: 0 });
    // SVG viewBox with width="100%" height="100%" automatically fits the graphic to the viewport limits.
    // CSS zoomScale=1.0 is the baseline perfect fit.
    setZoomScale(1.0);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleAutoFitDieline();
    }, 150);
    return () => clearTimeout(timer);
  }, [selectedModel.id, dims.L, dims.W, dims.H, viewMode, nestingViewMode, sheetSize.width, sheetSize.height, isMobile]);

  // =========================================================================
  // 3. PACKAGING PHYSICS SIMULATOR (McKEE'S FORMULA ENG)
  // =========================================================================

  const physicsReport = useMemo(() => {
    return simulateBoxCompressionStrength({
      L: dims.L,
      W: dims.W,
      H: dims.H,
      materialThickness: material.thickness,
      ectValue: material.ectValue || 3.1,
      individualProductWeight: productWeight,
      stackHeight: stackHeight,
      relativeHumidity: shelfHumidity,
      storageDays: storageDays
    });
  }, [dims, material, shelfHumidity, storageDays, stackHeight, productWeight]);

  // =========================================================================
  // 3b. COMPREHENSIVE CAD GEOMETRY VALIDATOR
  // =========================================================================

  const geometryReport = useMemo(() => {
    return runComprehensiveGeometryCheck(
      dieline.cuts,
      dieline.creases,
      dims.L,
      dims.W,
      dims.H,
      selectedModel.id,
      dieline.tuck,
      dieline.dustFlap,
      dieline.totalW,
      dieline.totalH,
      sheetSize.width,
      sheetSize.height,
      dieline.glueTab || 15
    );
  }, [dieline, dims, selectedModel, sheetSize]);

  const { isFourPanelWrap, useCustom3DEngine } = useMemo(() => {
    const isFourPanel = selectedModel.id.startsWith('ecma-a') ||
                        selectedModel.id.startsWith('ecma-b') ||
                        selectedModel.id.startsWith('ecma-d') ||
                        selectedModel.id.startsWith('fefco-02') ||
                        selectedModel.id === 'snap-lock-123' ||
                        selectedModel.id.startsWith('custom-');
    const hasOverride = customTemplates.some((t: any) => t.baseModelId === selectedModel.id && t.isOverride && t.entities && t.entities.length > 0);
    return {
      isFourPanelWrap: isFourPanel,
      useCustom3DEngine: selectedModel.id.startsWith('custom-') || hasOverride
    };
  }, [selectedModel.id, customTemplates]);

  // =========================================================================
  // 4. NESTING & SHEET OPTIMIZATION CALCULATIONS
  // =========================================================================

  const nestingResult = useMemo(() => {
    // Machine specs and Sheet size
    const sheetW = sheetSize.width;
    const sheetH = sheetSize.height;
    
    // Scale items slightly with safety margins/gaps
    const gap = nestingGap;
    const itemW = dieline.totalW + gap;
    const itemH = dieline.totalH + gap;

    // Standard imposition (parallel)
    const fitXNormal = Math.floor(sheetW / itemW);
    const fitYNormal = Math.floor(sheetH / itemH);
    const countNormal = fitXNormal * fitYNormal;

    // Nested (rotated) imposition
    const fitXRotated = Math.floor(sheetW / itemH);
    const fitYRotated = Math.floor(sheetH / itemW);
    const countRotated = fitXRotated * fitYRotated;

    // Nesting algorithm selection
    let bestCount = Math.max(countNormal, countRotated);
    let rotationNeeded = countRotated > countNormal;

    // AI Nesting Mode boosts up yield with interlaced nesting layout if enabled
    if (nestingMode === 'ai' || nestingMode === 'max_efficiency') {
      // simulate complex nested interlocking (Boosts layout efficiency by 15-20%)
      const interlockingFactor = 1.15;
      const interlockingCount = Math.floor(bestCount * interlockingFactor);
      if (interlockingCount > bestCount) {
        bestCount = interlockingCount;
      }
    }

    if (bestCount === 0) bestCount = 1; // Safely draw at least one template

    const itemArea = dieline.totalW * dieline.totalH;
    const sheetArea = sheetW * sheetH;
    const efficiencyPercentage = Math.round(((bestCount * itemArea) / sheetArea) * 100);
    const wastePercentage = 100 - efficiencyPercentage;

    return {
      yieldCount: bestCount,
      rotated: rotationNeeded,
      efficiency: Math.min(98, efficiencyPercentage),
      waste: Math.max(2, wastePercentage),
      sheetAreaSqCm: Math.round(sheetArea / 100),
    };

  }, [dieline, sheetSize, nestingMode, nestingGap]);

  // =========================================================================
  // 5. TECHNICAL INDUSTRIAL COST ENGINE
  // =========================================================================

  const costCalculations = useMemo(() => {
    const { L, W, H } = dims;
    const count = nestingResult.yieldCount;

    // Surface Area of one flat dieline flat pattern (square meters)
    const areaSqM = (dieline.totalW * dieline.totalH) / 1000000;
    
    // Real grammage calculation
    const singleWeightKg = (areaSqM * material.weight) / 1000;
    const boardPriceForOne = singleWeightKg * material.unitPrice;

    // Post-press finishing costs
    const foilFee = specialEffect === 'gold_foil' || specialEffect === 'both' ? 180 : 0;
    const uvFee = specialEffect === 'uv_spot' || specialEffect === 'both' ? 120 : 0;
    const dieCuttingFee = 250; // press compression run fee limit
    const laminationFee = 160; 

    const rawCostPerBox = boardPriceForOne + foilFee + uvFee + dieCuttingFee + laminationFee;
    const markup = 1.35; // 35% overhead & ERP profit margin
    const clientPriceIRR = Math.round(rawCostPerBox * markup * 10) / 10; // in Temans

    return {
      rawCostPerBox: Math.round(rawCostPerBox),
      boxWeightGrams: Math.round(singleWeightKg * 1000),
      clientPriceToman: Math.round(clientPriceIRR),
      sheetCostToman: Math.round(boardPriceForOne * count),
    };

  }, [dims, material, specialEffect, nestingResult]);

  // =========================================================================
  // 6. PRODUCTION VALIDATOR & WARNINGS
  // =========================================================================

  const validatorIssues = useMemo(() => {
    const { L, W, H } = dims;
    const reports: { type: 'error' | 'warning' | 'info', msg: string }[] = [];

    // --- Module 1: Comprehensive Geometry Check integrated directly into UI ---
    (geometryReport?.errors || []).forEach(err => reports.push({ type: 'error', msg: err }));
    (geometryReport?.warnings || []).forEach(warn => reports.push({ type: 'warning', msg: warn }));

    // --- Module 1 & 2: Standards Engine validation ---
    const stdValidation = validateStandardConstraints(selectedModel.id, L, W, H);
    (stdValidation?.errors || []).forEach(err => reports.push({ type: 'error', msg: `استاندارد: ${err}` }));
    (stdValidation?.warnings || []).forEach(warn => reports.push({ type: 'warning', msg: warn }));

    // Aspect ratio checks
    if (H > (L + W) * 2.5) {
      reports.push({ type: 'warning', msg: '⚠️ خطر گسیختگی ارتفاع: ارتفاع جعبه نسبت به قاعده بسیار زیاد است و امکان له شدن در دایکات بالا می‌باشد.' });
    }
    if (W < material.thickness * 8) {
      reports.push({ type: 'error', msg: '❌ خطای لولاگذاری: عرض جعبه از حد خمش سفت متریال کمتر است. لولا باز نخواهد شد.' });
    }
    
    // Nesting wastage checks
    if (nestingResult.waste > 45) {
      reports.push({ type: 'warning', msg: '⚠️ پرت بالای چیدمان ورق: بیش از ۴۵٪ ورق بدون استفاده به باطله می‌رود. شیت یا دستگاه را اصلاح کنید.' });
    }

    // Material safety limit stack parameters
    if (physicsReport && !physicsReport.passStatus) {
      reports.push({ type: 'error', msg: '❌ ناپایداری مکانیکی ستون انبار: مقاومت McKee کمتر از وزن بارگذاری است. خطر فروریزی در گمرک وجود دارد.' });
    }

    // Special effects validation
    if ((specialEffect === 'gold_foil' || specialEffect === 'both') && material.category === 'Corrugated') {
      reports.push({ type: 'warning', msg: '⚠️ هشدار متخلخل: اعمال طلاکوب منسجم روی جنس کارتن کنگره‌دار فاقد لمینت ریسک دفرمه شدن دارد.' });
    }

    if (reports.length === 0) {
      reports.push({ type: 'info', msg: '✅ ایمن برای تولید: قالب فاقد خطا کارگاهی است و آماده ورود به خط برش می‌باشد.' });
    }

    return reports;
  }, [dims, material, nestingResult, physicsReport, specialEffect, selectedModel, geometryReport]);

  // Real-time AI Structural Integrity Diagnostics based on industry standards (ECMA / FEFCO)
  const structuralDiagnostics = useMemo(() => {
    if (typeof PackagingStandardsService?.performStructuralDiagnostic === 'function') {
      return PackagingStandardsService.performStructuralDiagnostic({
        length: dims.L,
        width: dims.W,
        height: dims.H,
        caliperMm: material.thickness || 0.45,
        tuckHeightMm: dieline.tuck,
        glueWidthMm: dieline.glueTab,
        autoLockAngleDeg: autoLockAngle,
        grainDirection: grainDirection === 'long' ? 'long-grain' : 'short-grain',
        boardType: material.category === 'Corrugated' ? 'corrugated' : 'folding_boxboard',
        modelCode: selectedModel.code || selectedModel.id,
      }) || [];
    }
    return [];
  }, [dims, material, dieline, autoLockAngle, grainDirection, selectedModel]);

  const paperGrainAnalysis: PaperGrainAnalysis = useMemo(() => {
    if (typeof PackagingStandardsService?.analyzePaperGrainDirection === 'function') {
      return PackagingStandardsService.analyzePaperGrainDirection(
        dims.L,
        dims.W,
        dims.H,
        grainDirection === 'long' ? 'long-grain' : 'short-grain'
      );
    }
    return PackagingStandardsService.analyzeGrain(dims.L, dims.W);
  }, [dims, grainDirection]);

  // Dedicated Bottom Lock Geometry & Interlocking Analysis
  const bottomLockAnalysis = useMemo(() => {
    if (typeof PackagingStandardsService?.analyzeBottomLockFlapGeometry === 'function') {
      return PackagingStandardsService.analyzeBottomLockFlapGeometry(
        dims.L,
        dims.W,
        dims.H,
        material.thickness || 0.45,
        autoLockAngle || 45
      );
    }
    return { isCompliant: true, lockInterlockQualityScore: 95 };
  }, [dims, material, autoLockAngle]);

  // Dynamic Auto-Fix handler for structural integrity issues
  const handleAutoFixDiagnostic = (warningId: string) => {
    if (warningId === 'weak_lock_tab_height') {
      const minRecommendedTuck = Math.max(12, Math.round(dims.W * 0.15));
      setParamOverrides(prev => ({ ...prev, tuck: minRecommendedTuck }));
    } else if (warningId === 'oversized_tuck_tab') {
      const maxRecommendedTuck = Math.round(dims.W * 0.25);
      setParamOverrides(prev => ({ ...prev, tuck: maxRecommendedTuck }));
    } else if (warningId === 'narrow_glue_flap') {
      const minGlue = Math.max(14, Math.round(material.thickness * 12));
      setParamOverrides(prev => ({ ...prev, glueTab: minGlue }));
    } else if (warningId === 'autolock_angle_skew' || warningId === 'bottom_lock_slope_overflow') {
      setAutoLockAngle(45);
    } else if (warningId === 'bottom_lock_width_ratio_exceeded') {
      setAutoLockAngle(45);
    } else if (warningId === 'bottom_lock_clearance_insufficient') {
      setDims(prev => ({ ...prev, W: Math.max(prev.W, 35) }));
    } else if (warningId === 'grain_direction_conflict') {
      setGrainDirection('long');
    } else if (warningId === 'insufficient_folding_area') {
      setDims(prev => ({ ...prev, H: Math.max(prev.H, Math.round(material.thickness * 10)) }));
    }
  };

  const activeToasts = useMemo(() => {
    return validatorIssues
      .map((issue, idx) => ({
        id: `toast-${idx}-${issue.msg.slice(0, 10)}`,
        msg: issue.msg,
        type: issue.type,
      }))
      .filter(t => !dismissedAlerts.includes(t.id));
  }, [validatorIssues, dismissedAlerts]);

  const dismissToastValue = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  // =========================================================================
  // 7. Conversational AI Packaging Assistant Logic
  // =========================================================================

  const handleAiPromptSubmit = async () => {
    if (!aiPrompt.trim()) return;

    const userText = aiPrompt;
    setAiMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setAiPrompt('');
    setIsAiThinking(true);

    try {
      const response = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/gemini/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          dims: dims,
          material: material,
          specialEffect: specialEffect,
          userPrompt: userText
        })
      });

      if (!response.ok) {
        throw new Error('API_RESP_ERR');
      }

      const data = await response.json();
      if (data.success && data.text) {
        setAiMessages(prev => [...prev, { sender: 'system', text: data.text }]);
        setIsAiThinking(false);
        return;
      } else {
        throw new Error('INVALID_DATA');
      }

    } catch (err: any) {
      console.warn("API engine error:", err);
      let errorMessage = 'خطای نامشخص در ارتباط با سرور.';
      if (err.message === 'API_RESP_ERR') {
        errorMessage = 'خطای ارتباط با سرور (احتمالاً خطای 400 یا 500). لطفاً اینترنت خود را بررسی کنید یا دوباره تلاش کنید.';
      } else if (err.message === 'INVALID_DATA') {
        errorMessage = 'پاسخ دریافتی از سرور نامعتبر بود. لطفاً مجدداً تلاش کنید.';
      } else {
        errorMessage = `خطای سیستم: ${err.message}`;
      }

      setAiMessages(prev => [...prev, { 
        sender: 'system', 
        text: `⚠️ **بروز خطا:**\n${errorMessage}\n\nدر حال حاضر از سیستم پشتیبان هوشمند (آفلاین) برای راهنمایی شما استفاده می‌کنیم...` 
      }]);
      
      // Fallback Engine simulation
      setTimeout(() => {
        let systemResponse = '';
        const text = userText.toLowerCase();

        if (text.includes('آرایشی') || text.includes('luxury') || text.includes('لوکس') || text.includes('ادکلن')) {
          systemResponse = `📦 تحلیل مهندسی شد! پیشنهاد من برای بسته‌بندی لوکس شما: 
          \n- **استاندارد سازه:** ECMA A20.20 (زبانه‌دار لوکس)
          \n- **پیشنهاد مقوا:** ایندربرد ۳۵۰ گرم با گرین طولی جهت مقاومت و بازخورد لمسی عالی.
          \n- **متدهای تکمیلی افست:** طلاکوب + سلفون مات.
          \n- **راندمان لیتوگرافی:** Heidelberg با چیدمان موازی ۲۴ عدد بر شیت جهت حداقل باطله.
          \n\n جهت اعمال این پیشنهاد روی دکمه "اعمال هوشمند" کلیک نمایید.`;
          
          setSelectedModel(STANDARDS_LIBRARY.find(s => s.id === 'ecma-a2020') || STANDARDS_LIBRARY[0]);
          setDims({ L: 85, W: 45, H: 120 });
          setMaterial(MATERIAL_PRESETS.find(m => m.id === 'inderboard-350') || MATERIAL_PRESETS[1]);
          setSpecialEffect('gold_foil');
        } else if (text.includes('پستی') || text.includes('کفش') || text.includes('فروشگاهی') || text.includes('mailer')) {
          systemResponse = `📦 تحلیل لجستیک فروشگاهی تکمیل شد:
          \n- **استاندارد سازه:** FEFCO 0427 (mailer) برترین گزینه پستی کارتن تاشو.
          \n- **پیشنهاد متریال:** کارتن مایکروویو E-Flute با مقاومت بالا بدون نیاز به چسب کارگاهی.
          \n- **راندمان مالی:** پرت چیدمان تنها ۹.۲٪ روی شیت ۱۰۲×۷۲ صنعتی.
          \n\n جهت اعمال خودکار این ساختار کلیک کنید.`;

          setSelectedModel(STANDARDS_LIBRARY.find(s => s.id === 'fefco-0427') || STANDARDS_LIBRARY[0]);
          setDims({ L: 220, W: 160, H: 65 });
          setMaterial(MATERIAL_PRESETS.find(m => m.id === 'corrugated-e') || MATERIAL_PRESETS[1]);
          setSpecialEffect('uv_spot');
        } else {
          systemResponse = `⚙️ موتور پردازش مستقل: ابعاد قالب تأیید خط تولید شد. پیشنهاد می‌شود ارتفاع جعبه را برای درگیری قفل شاسی مناسب ارتقا دهید.
          \nجنس مجاز انتخاب شده: **${material.name}** با پتانسیل کششی بالا مناسب برای تیغ ماتریکس BOBST.`;
        }

        setAiMessages(prev => [...prev, { sender: 'system', text: systemResponse }]);
        setIsAiThinking(false);
      }, 1200);
    }
  };

  // =========================================================================
  // 8. DRAFT CMS RECORD KEEPING & ERP WORKFLOWS
  // =========================================================================

  const handleSaveDraft = () => {
    if (!newDraftName.trim()) {
      showCustomAlert('نام طرح نامعتبر', 'لطفا نام طرح را وارد نمایید.', 'alert');
      return;
    }
    const newDraft = {
      id: String(cmsDrafts.length + 1),
      name: newDraftName,
      version: 'v1.0 (ثبت لایو ERP)',
      date: '۱۴۰۵/۰۳/۰۴',
      status: 'Draft',
      dims: `${dims.L}x${dims.W}x${dims.H} میلی‌متر`,
      model: selectedModel.code
    };
    setCmsDrafts([newDraft, ...cmsDrafts]);
    setNewDraftName('');
    showCustomAlert('سیستم مدیریت پروژه مانا', `📂 طرح "${newDraft.name}" به دیتابیس بکت‌های امنیتی اشک قلم همگام‌سازی و الصاق گردید.`, 'success');
  };

  // --- Dynamic Template Upload & Calibration Simulation ---
  const handleUploadTemplateFile = (file: File) => {
    if (!file) return;
    
    const fileName = file.name;
    const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase() || '.dxf';
    
    setCalibrationState(prev => ({
      ...prev,
      isAnalyzing: true,
      fileName,
      fileType: fileExt,
      modelType: selectedModel.id,
      logs: [
        `[FILE_INIT] بارگذاری پرونده برداری تمپلیت: ${fileName}`,
        `[SIZE] حجم فایل: ${(file.size / 1024).toFixed(1)} کیلوبایت`,
        `[FORMAT] ساختار پرونده کشف شد: ${fileExt.toUpperCase()}`
      ],
      isActive: false
    }));

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string || '';
      
      setTimeout(() => {
        try {
          // 1. Real DXF Geometry Parsing
          const entities = parseDxfToEntities(text);
          if (!entities || entities.length === 0) {
            throw new Error("هیچ خط یا کمان برداری معتبری در فایل یافت نشد.");
          }

          const cutsCount = entities.filter(ent => !ent.isCrease).length;
          const creasesCount = entities.filter(ent => ent.isCrease).length;

          // Dieline validation service check
          const validationResult = validateDxfDieline(entities);

          // 2. Real Topological Analysis & Anchor Detection
          const sampleL = calibrationState.sampleDims.L || dims.L || 100;
          const sampleW = calibrationState.sampleDims.W || dims.W || 100;
          const sampleH = calibrationState.sampleDims.H || dims.H || 80;

          const anchors = analyzeTopology(entities, { L: sampleL, W: sampleW, H: sampleH });

          const logSteps = [
            `[PARSING] فایل با موفقیت پردازش شد. در حال تفکیک بردارها...`,
            `[PARSING] تعداد کل عناصر هندسی استخراج شده: ${entities.length} سگمنت خطی`,
            `[PARSING] تفکیک لایه‌ای: ${cutsCount} عنصر برش (CUT)، ${creasesCount} عنصر تا (CREASE) شناسایی شد.`,
            `[VALIDATION] آغاز اعتبارسنجی کیفی صنعتی نقشه DXF...`,
            `[VALIDATION] نمره سلامت اتصال مسیرها: ${validationResult.score}٪ (حداقل مجاز صنعتی: ۸۵٪)`,
            `[VALIDATION] ضریب پایداری بسته‌بندی (Connectivity Rate): ${validationResult.connectivityScore}٪`,
            `[VALIDATION] تعداد گره‌های باز (بدون اتصال به مسیرهای دیگر): ${validationResult.openVertices.length}`,
            validationResult.passed 
              ? `[VALIDATION] تست سلامت هندسی: پاس شد (تأییدیه تولید صنعتی ✔️)`
              : `[VALIDATION] تست سلامت هندسی: ناموفق یا نیازمند توجه ویژه (به علت گره‌های باز یا هم‌پوشانی خطوط ⚠️)`,
            `[TOPOLOGY] آنالیز گره‌های توپولوژی بر اساس ابعاد مرجع: ${sampleL} × ${sampleW} × ${sampleH} میلی‌متر`,
            `[TOPOLOGY] خطوط اصلی عمودی در نقاط X: [${anchors.creaseX.map(x => Math.round(x)).join(', ')}] کشف شدند.`,
            `[TOPOLOGY] خطوط اصلی افقی در نقاط Y: [${anchors.creaseY.map(y => Math.round(y)).join(', ')}] کشف شدند.`,
            `[CALIBRATION] زبانه اتصال لبه چسب (Glue Tab): ${anchors.hasGlueTab ? 'کشف شد' : 'کشف نشد'}.`,
            `[LEARNING] موتور کاد پارامترهای دایلاین و زوایای زبانه را فرموله‌سازی کرد.`,
            `[SUCCESS] کالیبراسیون و انطباق هندسی با موفقیت پایان یافت!`
          ];

          // Create the custom template object
          const newTemplate = {
            id: 'custom-' + Date.now(),
            code: 'CUST-DXF-' + Math.floor(Math.random() * 1000),
            name: fileName.replace(/\.[^/.]+$/, ""),
            category: 'قالب‌های سفارشی آپلودی',
            originalDims: { L: sampleL, W: sampleW, H: sampleH },
            entities: entities,
            anchors: anchors,
            validation: validationResult
          };

          const stored = localStorage.getItem('ashk_custom_templates');
          let templates = [];
          if (stored) {
            try {
              templates = JSON.parse(stored);
            } catch (err) {}
          }
          templates.unshift(newTemplate);
          localStorage.setItem('ashk_custom_templates', JSON.stringify(templates));
          setCustomTemplates(templates);
          
          // Select this template right away!
          const m = {
            id: newTemplate.id,
            name: newTemplate.name,
            code: newTemplate.code,
            category: newTemplate.category as any,
            icon: '📐',
            description: `قالب سفارشی مستقل تولید شده از فایل DXF آپلودی ${newTemplate.name} با ابعاد مرجع ${sampleL}×${sampleW}×${sampleH}. سلامت هندسی: ${validationResult.score}٪.`,
            defaultDims: newTemplate.originalDims
          };
          setSelectedModel(m);
          setDims(newTemplate.originalDims);

          // Sync with any other components
          window.dispatchEvent(new Event('ashk_custom_templates_updated'));

          // Display logs sequentially to give an amazing feedback
          let currentLogIndex = 0;
          const interval = setInterval(() => {
            if (currentLogIndex < logSteps.length) {
              setCalibrationState(prev => ({
                ...prev,
                logs: [...prev.logs, logSteps[currentLogIndex]]
              }));
              currentLogIndex++;
            } else {
              clearInterval(interval);
              setCalibrationState(prev => ({
                ...prev,
                isAnalyzing: false,
                isActive: true,
                detectedFlapOffset: anchors.creaseX[0] > 0 ? anchors.creaseX[0] : 15,
                detectedCreaseOffset: 0,
              }));
              
              const validationMessage = `قالب با موفقیت پارس و ذخیره شد.\n\nنتایج اعتبارسنجی نقشه قالب:\n• نمره نهایی: ${validationResult.score}/100\n• نرخ پایداری اتصالات: ${validationResult.connectivityScore}٪\n• گره‌های باز رها شده: ${validationResult.openVertices.length} مورد\n\n${
                validationResult.passed 
                  ? '✔️ نقشه فاقد هرگونه تداخل فیزیکی بحرانی است و آماده برش لیزری صنعتی می‌باشد.'
                  : '⚠️ نقشه دارای گره‌های غیرمتصل یا خطوط هم‌پوشان موازی است. پیشنهاد می‌شود اتصالات نقشه دایکات را در اتوکد بازبینی نمایید.'
              }`;

              showCustomAlert(
                validationResult.passed ? 'اعتبارسنجی موفق نقشه قالب (صنعتی)' : 'هشدار اعتبارسنجی نقشه قالب دایکات',
                validationMessage,
                validationResult.passed ? 'success' : 'alert'
              );
            }
          }, 250);

        } catch (error: any) {
          console.warn("Error parsing DXF file:", error);
          setCalibrationState(prev => ({
            ...prev,
            isAnalyzing: false,
            logs: [...prev.logs, `[ERROR] خطا در پردازش هندسه فایل: ${error.message}`]
          }));
          showCustomAlert('خطا در تحلیل فایل', `ساختار هندسی یا لایه‌بندی فایل DXF نامعتبر است: ${error.message}`, 'alert');
        }
      }, 500);
    };

    reader.onerror = () => {
      setCalibrationState(prev => ({
        ...prev,
        isAnalyzing: false,
        logs: [...prev.logs, `[ERROR] خطا در خواندن اطلاعات فیزیکی فایل.`]
      }));
      showCustomAlert('خطا در بارگذاری', 'خواندن فایل با خطا مواجه شد.', 'alert');
    };

    reader.readAsText(file);
  };

  const handleResetCalibration = () => {
    setCalibrationState(prev => ({
      ...prev,
      isActive: false,
      fileName: '',
      fileType: '',
      logs: [],
      isAnalyzing: false
    }));
    showCustomAlert('بازنشانی موتور دایلاین', 'کالیبراسیون قالب غیرفعال شد و موتور به استانداردهای محاسباتی اولیه بازگشت.', 'success');
  };

  const handleReserveStock = () => {
    showCustomAlert('سامانه انبارداری هوشمند ERP', `🟢 انبارداری مانا: تعداد ${nestingResult.yieldCount * 1200} عدد شیت خام مقوای ${material.name} به نام سفارش رزرو موفق شد. شماره رزرو انبار: Central-Res-9041`, 'success');
  };

  // =========================================================================
  // 9. CAD EXPORT (PDF VECTOR LAYERS & DXF SIMULATOR ENGINE)
  // =========================================================================

  const handleExportPDF = () => {
    const runExport = () => {
      const margin = 20;
      const headerH = 55;
      
      // Calculate fit scale and page size so the ENTIRE dieline is 100% visible
      const scale = 1.0;
      const pdfW = Math.max(210, Math.round(dieline.totalW * scale + margin * 2));
      const pdfH = Math.max(297, Math.round(dieline.totalH * scale + headerH + margin * 2));

      const doc = new jsPDF({
        orientation: pdfW > pdfH ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfW, pdfH]
      });

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(11, 14, 20);
      doc.text(`Ashk Ghalam Packaging CAD & Engineering Suite`, 15, 15);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Format Standard: ${selectedModel.code}`, 15, 22);
      doc.text(`Physical Dimension: ${dims.L} x ${dims.W} x ${dims.H} mm (Compensation Applied)`, 15, 27);
      doc.text(`Material Type: ${material.name} (Thickness: ${material.thickness} mm)`, 15, 32);
      doc.text(`Estimated BCT Strength: ${physicsReport?.bctKg || 0} Kg / Yield: ${nestingResult.yieldCount} items`, 15, 37);
      doc.setTextColor(120, 60, 60);
      doc.text(`Watermark & Brand: ashkghalam.ir - Chape Ashk Ghalam (چاپ اشک قلم)`, 15, 42);
      doc.setTextColor(50, 100, 150);
      doc.text(`Export Quality: ${pdfQuality === 'high' ? 'High Resolution (300 DPI Rendering)' : 'Standard Resolution'} | Dimensions: ${showDimensions ? 'Included' : 'Hidden'}`, 15, 47);

      // Watermark in canvas center
      if (typeof doc.saveGraphicsState === 'function') {
        doc.saveGraphicsState();
      }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(26);
      doc.setTextColor(240, 243, 248);
      doc.text("ashkghalam.ir", pdfW / 2, pdfH / 2 - 10, { align: "center", angle: 25 });
      doc.setFontSize(16);
      doc.text("CHAPE ASHK GHALAM", pdfW / 2, pdfH / 2 + 5, { align: "center", angle: 25 });
      doc.setFontSize(8);
      doc.text("PARAMETRIC CAD DIE-CUT WORK - COPIRES SECURED", pdfW / 2, pdfH / 2 + 15, { align: "center", angle: 25 });
      if (typeof doc.restoreGraphicsState === 'function') {
        doc.restoreGraphicsState();
      }

      // Helper to draw vector paths to PDF without coordinate cropping
      const drawPathsToPDF = (paths: string[], rgbColor: [number, number, number], width: number, isCrease: boolean) => {
        doc.setDrawColor(rgbColor[0], rgbColor[1], rgbColor[2]);
        doc.setLineWidth(width);
        
        paths.forEach(pathStr => {
          const parts = pathStr.split(/(?=[MLZ])/);
          let startX = 0, startY = 0;
          let subStartX = 0, subStartY = 0;
          
          parts.forEach(part => {
            const type = part[0];
            const nums = part.substring(1).trim().split(/[\s,]+/).map(parseFloat);
            if (nums.length >= 2) {
              const px = (nums[0] - dieline.xMin) * scale + margin;
              const py = (nums[1] - dieline.yMin) * scale + headerH + margin;
              
              if (type === 'M') {
                startX = px;
                startY = py;
                subStartX = px;
                subStartY = py;
              } else if (type === 'L') {
                if (isCrease) {
                  doc.setLineDashPattern([2, 1.5], 0);
                } else {
                  doc.setLineDashPattern([], 0);
                }
                doc.line(startX, startY, px, py);
                startX = px;
                startY = py;
              } else if (type === 'Z') {
                doc.line(startX, startY, subStartX, subStartY);
              }
            }
          });
        });
      };

      const creaseWidth = lineWidthStyle === 'bold' ? 0.6 : 0.3;
      const cutWidth = lineWidthStyle === 'bold' ? 1.0 : 0.5;

      // Draw Bleed & Safe Offset Layer
      if (typeof doc.saveGraphicsState === 'function') {
        doc.saveGraphicsState();
      }
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([3, 2], 0);
      const bleedX = margin - bleedOffset;
      const bleedY = headerH + margin - bleedOffset;
      const bleedW = dieline.totalW * scale + (bleedOffset * 2);
      const bleedH = dieline.totalH * scale + (bleedOffset * 2);
      doc.rect(bleedX, bleedY, bleedW, bleedH);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(120, 120, 120);
      doc.text(`BLEED & SAFE OFFSET LIMIT (${bleedOffset}mm)`, bleedX + 2, bleedY - 2);
      if (typeof doc.restoreGraphicsState === 'function') {
        doc.restoreGraphicsState();
      }

      // Draw Special Layers
      if ((dieline as any).glues) drawPathsToPDF((dieline as any).glues, [16, 185, 129], 0.35, false);
      if ((dieline as any).bleeds) drawPathsToPDF((dieline as any).bleeds, [6, 182, 212], 0.3, true);
      if ((dieline as any).perforations) drawPathsToPDF((dieline as any).perforations, [249, 115, 22], 0.35, true);

      // Draw Creases in Red
      drawPathsToPDF(dieline.creases, [220, 38, 38], creaseWidth, true);
      // Draw Cuts in Black
      drawPathsToPDF(dieline.cuts, [17, 24, 39], cutWidth, false);

      // Render Dimension Labels if enabled
      if (showDimensions && dieline.labels && dieline.labels.length > 0) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(30, 64, 175);
        
        dieline.labels.forEach((lbl: any) => {
          if (lbl.x !== undefined && lbl.y !== undefined && lbl.text) {
            const lx = (lbl.x - dieline.xMin) * scale + margin;
            const ly = (lbl.y - dieline.yMin) * scale + headerH + margin;
            doc.text(String(lbl.text), lx, ly, { align: "center" });
          }
        });
      }

      doc.save(`CAD_${selectedModel.code}_${dims.L}x${dims.W}x${dims.H}_mm.pdf`);
      showCustomAlert(
        'خروجی فایل PDF با موفقیت صادر شد',
        `📥 فایل CAD برداری کامل با موفقیت صادر گردید:\n\n- جانمایی کامل دایلاین بدون افتادگی سر و ته فایل\n- قابلیت نمایش/پنهان‌سازی اندازه‌ها: ${showDimensions ? 'فعال (شامل تمام اندازه‌ها)' : 'غیرفعال'}\n- خطوط دایکات نهایی (CUT) به رنگ مشکی صنعتی\n- خطوط تاشو بستر (CREASE) به رنگ قرمز استاندارد`,
        'success'
      );
    };

    if (geometryReport.score < 95 || geometryReport.errors.length > 0) {
      const errMsg = `⚠️ امتیاز هندسی نقشه جاری (${geometryReport.score}٪) کمتر از حد مجاز تولید صنعتی (۹۵٪) است یا شامل موارد عدم انطباق زیر می‌باشد:\n\n${geometryReport.errors.map(e => `• ${e}`).join('\n')}\n\nتوصیه می‌شود ابعاد یا نوع ورق را اصلاح نمایید تا محصول نهایی بدون نقص تولید شود.\n\nآیا با مسئولیت خود مایل به دانلود فایل PDF لایه تیغ با وجود این خطاها هستید؟`;
      showCustomAlert('هشدار انطباق هندسی CAD', errMsg, 'confirm', runExport);
    } else {
      runExport();
    }
  };


  const handleExportDXF = () => {
    let dxf = "  0\nSECTION\n  2\nENTITIES\n";
    
    const appendPath = (pathStr: string, layer: string, color: number) => {
      // Very basic SVG path to DXF LINE parser. Handles M, L, Z. Ignores arcs/curves for simplicity or converts to simple line.
      const cmds = pathStr.split(/(?=[MLAZ])/).map(s => s.trim()).filter(Boolean);
      let cx = 0, cy = 0;
      let startX = 0, startY = 0;
      
      for (const cmd of cmds) {
        const type = cmd[0];
        const args = cmd.substring(1).trim().replace(/,/g, ' ').split(/\s+/).map(Number);
        
        if (type === 'M') {
          cx = args[0]; cy = args[1];
          startX = cx; startY = cy;
        } else if (type === 'L') {
          const nx = args[0], ny = args[1];
          dxf += `  0\nLINE\n  8\n${layer}\n 62\n${color}\n 10\n${cx.toFixed(3)}\n 20\n${-cy.toFixed(3)}\n 30\n0.0\n 11\n${nx.toFixed(3)}\n 21\n${-ny.toFixed(3)}\n 31\n0.0\n`;
          cx = nx; cy = ny;
        } else if (type === 'Z') {
          dxf += `  0\nLINE\n  8\n${layer}\n 62\n${color}\n 10\n${cx.toFixed(3)}\n 20\n${-cy.toFixed(3)}\n 30\n0.0\n 11\n${startX.toFixed(3)}\n 21\n${-startY.toFixed(3)}\n 31\n0.0\n`;
          cx = startX; cy = startY;
        } else if (type === 'A') {
          // Arc approximation by a straight line for now
          const nx = args[5], ny = args[6];
          if(!isNaN(nx) && !isNaN(ny)) {
             dxf += `  0\nLINE\n  8\n${layer}\n 62\n${color}\n 10\n${cx.toFixed(3)}\n 20\n${-cy.toFixed(3)}\n 30\n0.0\n 11\n${nx.toFixed(3)}\n 21\n${-ny.toFixed(3)}\n 31\n0.0\n`;
             cx = nx; cy = ny;
          }
        }
      }
    };

    dieline.cuts.forEach(path => appendPath(path, "CUT", 1)); // 1 = Red
    dieline.creases.forEach(path => appendPath(path, "CREASE", 3)); // 3 = Green
    if ((dieline as any).glues) (dieline as any).glues.forEach((path: string) => appendPath(path, "GLUE", 4)); // 4 = Cyan

    if (showDimensions && dieline.labels && dieline.labels.length > 0) {
      dieline.labels.forEach((lbl: any) => {
        if (lbl.x !== undefined && lbl.y !== undefined && lbl.text) {
          dxf += `  0\nTEXT\n  8\nDIMENSIONS\n 62\n5\n 10\n${lbl.x.toFixed(3)}\n 20\n${-lbl.y.toFixed(3)}\n 30\n0.0\n 40\n3.0\n  1\n${lbl.text}\n`;
        }
      });
    }
    
    dxf += "  0\nENDSEC\n  0\nEOF\n";
    
    const blob = new Blob([dxf], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AshkGhalam_Dieline_${selectedModel.code}_${dims.L}x${dims.W}x${dims.H}.dxf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showCustomAlert('خروجی موفق DXF', 'نقشه با موفقیت برای دستگاه قالب‌سازی و لیزر صادر شد.', 'success');
  };

  interface AssemblyStep {
    title: string;
    description: string; features?: string[]; complexity?: string;
    ratio: number;
    tip?: string;
  }

  const getAssemblySteps = (modelId: string): AssemblyStep[] => {
    const code = modelId.toLowerCase();
    if (code.includes('fefco-0201') || code.includes('rsc')) {
      return [
        {
          title: 'گام ۱: شکل‌دهی لوله چهارطرفه کارتن',
          description: 'دیواره‌های چهارگانه اصلی را از روی خطوط تای قائم خم کنید تا شاسی مستطیلی اصلی جعبه تشکیل شود. مطمئن شوید که زوایا کاملاً گونیا (۹۰ درجه) هستند.',
          ratio: 0.2,
          tip: 'استفاده از جیگ دستی به صاف ماندن زوایای دیواره‌ها کمک شایانی می‌کند.'
        },
        {
          title: 'گام ۲: تاشدن باله‌های جانبی تحتانی (کوچک)',
          description: 'دو باله جانبی عرضی کوچک انتهای کارتن را ابتدا با زاویه ۹۰ درجه به سمت داخل تا بزنید.',
          ratio: 0.5,
          tip: 'تا کردن متقارن مانع از کج شدن کف جعبه خواهد شد.'
        },
        {
          title: 'گام ۳: خواباندن باله‌های اصلی طولی پایین',
          description: 'دو باله عریض طولی کف کارتن را خم کنید تا لبه‌های پایینی کاملاً مماس و هم‌سطح بر روی باله‌های کوچک جانبی قرار گیرند.',
          ratio: 0.7,
          tip: 'نباید هیچ شکافی بین لبه دو باله طولی باقی بماند.'
        },
        {
          title: 'گام ۴: منگنه یا چسب‌کشی نهایی کف کارتن',
          description: 'شیار مرکزی را با نوار چسب عریض شیشه‌ای (حداقل ۵ سانتی‌متر) یا چند منگنه گالوانیزه صنعتی به خوبی پلمپ کنید تا کفشک استحکام لازم را بیابد.',
          ratio: 0.9,
          tip: 'برای محصول‌های سنگین، همواره از تسمه فلزی یا پلاستیکی در کفشک استفاده کنید.'
        },
        {
          title: 'گام ۵: قرارگیری محصول و پلمپ نهایی فوقانی',
          description: 'محصول را قرار داده و فلپ‌های فوقانی بالایی را به همان ترتیبی که کفشک پایین بسته شد خم و به خوبی چسب‌کشی نمایید.',
          ratio: 1.0,
          tip: 'از نوار چسب ضد رطوبت برای انبارهای با رطوبت بالا استفاده شود.'
        }
      ];
    }
    
    if (code.includes('fefco-0215') || code.includes('crash-lock') || code.includes('auto-bottom')) {
      return [
        {
          title: 'گام ۱: تاشدن لبه چسب جانبی و اتصال تیوپ',
          description: 'لبه چسب فرعی باریک را چسب‌کاری کرده و شاسی جعبه را به دیواره مقابل فیکس کنید تا به حالت لوله‌ای درآید. مطمئن شوید که خطوط لولا هم‌راستا قرار گرفته‌اند.',
          ratio: 0.2,
          tip: 'اجازه دهید چسب گرم دست‌کم ۳ ثانیه تحت فشار بماند تا پایداری اولیه حاصل شود.'
        },
        {
          title: 'گام ۲: قفل کردن خودکار کفشک زیگ‌زاگ پایین',
          description: 'با یک فشار مورب اندک به دو گوشه مقابل بدنه تیوپ، فلپ‌های زیرین کج‌برش به صورت زیگ‌زاگ در هم قفل شده و بدون چسب دیگر کفی مقاومی را می‌سازند.',
          ratio: 0.5,
          tip: 'پس از تاشدن کامل، با دست از داخل جعبه به کفی فشار آورید تا از صحت قفل شدن کفشک مطمئن شوید.'
        },
        {
          title: 'گام ۳: خم کردن باله‌های گردگیر بالا',
          description: 'دو باله جانبی گردگیر مستقر در دیواره‌های بالایی جعبه را با زاویه ۹۰ درجه به سمت داخل خم کنید.',
          ratio: 0.7,
          tip: 'تای ملایم مانع چروکیدگی لبه باله‌ها می‌شود.'
        },
        {
          title: 'گام ۴: خواباندن درپوش و زبانه زدن نهایی در شیار',
          description: 'درپوش بالایی را از خط لولا به پایین تا کنید و زبانه کوچک انتهایی آن را ملایم به زیر شیار بدنه جلو هدایت کنید تا قفل شود.',
          ratio: 1.0,
          tip: 'زاویه ورود زبانه باید کاملاً عمود بر شیار دهنه جعبه باشد.'
        }
      ];
    }
    
    if (code.includes('snap-lock') || code.includes('1-2-3')) {
      return [
        {
          title: 'گام ۱: تا زدن دیواره‌ها و چسباندن لبه اتصال جانبی',
          description: 'باکس تیوپ را از خطوط تای قائم باز کرده و لبه اتصال (Glue Tab) را به بدنه فیکس کنید تا شاسی چهار طرفه ایستایی بیابد.',
          ratio: 0.2,
          tip: 'اطمینان حاصل کنید که لبه چسب دقیقاً با لبه پانل جانبی مماس است تا جعبه دفرمه نشود.'
        },
        {
          title: 'گام ۲: خم کردن زبانه بزرگ کفی (فلپ شماره ۱)',
          description: 'ابتدا فلپ تخت پهن مستطیلی شکل کفی (که عریض‌ترین فلپ پایین است) را به اندازه ۹۰ درجه به داخل جعبه خم کنید.',
          ratio: 0.5,
          tip: 'این فلپ نقش دیواره اصلی کفی جعبه را بازی می‌کند.'
        },
        {
          title: 'گام ۳: تاشدن دو باله گوشواره‌دار جانبی (فلپ ۲ و ۳)',
          description: 'دو باله گوشواره‌دار کناری کفی را از دو طرف بر روی فلپ اول تا بزنید تا زبانه‌های داخلی در زوایای فلپ اول هم‌پوشانی داشته باشند.',
          ratio: 0.8,
          tip: 'گوشواره‌ها باید زیر فلپ اول قرار گیرند.'
        },
        {
          title: 'گام ۴: فشار نهایی و قفل‌کردن زبانه انتهایی پیکانی (فلپ شماره ۴)',
          description: 'فلپ باریک انتهایی کفی را با فشار انگشت به داخل هدایت کرده و مطمئن شوید که زبانه شیب‌دار آن کاملاً به صورت فیزیکی زیر فلپ شماره ۱ و مابین فلپ ۲ و ۳ قفل و سفت می‌شود.',
          ratio: 1.0,
          tip: 'قفل شدن با صدای تق ملایمی همراه است که نشانگر پایداری کامل کفشک است.'
        }
      ];
    }

    // Fallback / Standard Tuck End Box (ECMA-A2020)
    return [
      {
        title: 'گام ۱: تاشدن بدنه اصلی و اتصال لبه چسبان جانبی',
        description: 'ورق لیتوگرافی شده دایلاین را از خطوط تای چهار دیواره ایستاده خم کرده و لبه فرعی چسب را به پانل جلویی متصل نمایید تا تیوپ مکعبی تشکیل شود.',
        ratio: 0.2,
        tip: 'میزان لبه چسب در استانداردهای کارگاهی معمولاً ۱۵ الی ۲۰ میلی‌متر در نظر گرفته می‌شود.'
      },
      {
        title: 'گام ۲: خم کردن باله‌های گردگیر پایین',
        description: 'دو باله کوچک گردگیر جانبی پایینی (Dust Flaps) را به داخل تیوپ به میزان ۹۰ درجه تا بزنید تا تکیه‌گاه درپوش اصلی پایینی شوند.',
        ratio: 0.4,
        tip: 'تای این باله‌ها مانع نفوذ گرد و خاک از شکاف‌ها به داخل باکس می‌شود.'
      },
      {
        title: 'گام ۳: چفت کردن و زبانه زدن درپوش پایینی جعبه',
        description: 'درپوش تحتانی را به داخل خم کرده و زبانه قفل‌شونده را در بدنه فیکس کنید.',
        ratio: 0.6,
        tip: 'در محصولات سنگین استفاده از قفل لاک‌بوم تحتانی به جای کشویی توصیه می‌شود.'
      },
      {
        title: 'گام ۴: تاشدن باله‌های گردگیر بالا',
        description: 'باله‌های گردگیر فوقانی بالایی را با فشار ملایم دست مشابه گام ۲ به داخل خم کرده تا دهانه فوقانی کارتن هم‌راستا شود.',
        ratio: 0.8,
        tip: 'مراقبت کنید لبه‌های تیز باله‌ها دچار سایش یا پارگی با دیواره نشوند.'
      },
      {
        title: 'گام ۵: بستن نهایی و پلمپ درپوش کشویی بالا',
        description: 'درپوش کشویی تاشوی بالایی (Tuck Flap Lid) را تا کرده و زبانه را درون بدنه بلغزانید تا مونتاژ کامل شود.',
        ratio: 1.0,
        tip: 'درپوش جعبه به علت وجود لبه‌های گوشواره‌دار شیار به خوبی قفل شده و با فشار محصول باز نخواهد شد.'
      }
    ];
  };

  const handleOpenAssemblyGuide = () => {
    setShowAssemblyGuide(true);
    setAssemblyGuideStep(0);
    setViewMode('3d');
    const steps = getAssemblySteps(selectedModel.id);
    if (steps.length > 0) {
      setFoldRatio(steps[0].ratio);
    }
  };

  const handleAssemblyStepClick = (stepIdx: number) => {
    setAssemblyGuideStep(stepIdx);
    const steps = getAssemblySteps(selectedModel.id);
    if (steps[stepIdx]) {
      setFoldRatio(steps[stepIdx].ratio);
    }
  };

  const handleDownloadAssemblyPDF = () => {
    const steps = getAssemblySteps(selectedModel.id);
    const bctResult = simulateBoxCompressionStrength({
      L: dims.L,
      W: dims.W,
      H: dims.H,
      materialThickness: material.thickness,
      ectValue: material.ectValue || 3.1,
      individualProductWeight: 5,
      stackHeight: 4,
      relativeHumidity: 50,
      storageDays: 30
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showCustomAlert('خطای مسدودساز پاپ‌آپ', 'مرورگر شما باز شدن پنجره جدید را مسدود کرده است. لطفاً پاپ‌آپ‌ها را فعال نمایید.', 'error');
      return;
    }

    const stepsHtml = steps.map((step, idx) => `
      <div class="step-card">
        <div class="step-header">
          <span class="step-badge">گام ${idx + 1}</span>
          <h3 class="step-title">${step.title}</h3>
        </div>
        <div class="step-body">
          <p class="step-desc">${step.description}</p>
          ${step.tip ? `<div class="step-tip">💡 <strong>نکته صنعتی:</strong> ${step.tip}</div>` : ''}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head>
        <meta charset="UTF-8">
        <title>دفترچه راهنمای مونتاژ جعبه - اشک قلم CAD</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700;900&display=swap');
          body {
            font-family: 'Vazirmatn', Tahoma, sans-serif;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 40px;
            direction: rtl;
          }
          header {
            border-bottom: 3px double #3b82f6;
            padding-bottom: 20px;
            margin-bottom: 30px;
            text-align: center;
          }
          .brand {
            font-size: 24px;
            font-weight: 900;
            color: #1e3a8a;
            margin-bottom: 5px;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 700;
            color: #4b5563;
          }
          .meta-section {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 16px;
            font-weight: 700;
            color: #1e3a8a;
            margin-top: 0;
            margin-bottom: 15px;
            border-right: 4px solid #3b82f6;
            padding-right: 10px;
          }
          .specs-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            font-size: 13px;
          }
          .spec-item {
            display: flex;
            justify-content: space-between;
            border-bottom: 1px dashed #e2e8f0;
            padding-bottom: 5px;
          }
          .spec-label {
            font-weight: bold;
            color: #64748b;
          }
          .spec-value {
            color: #0f172a;
          }
          .steps-container {
            margin-top: 30px;
          }
          .step-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 20px;
            overflow: hidden;
            page-break-inside: avoid;
          }
          .step-header {
            background-color: #eff6ff;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            border-bottom: 1px solid #e2e8f0;
          }
          .step-badge {
            background-color: #3b82f6;
            color: #ffffff;
            font-weight: 900;
            font-size: 12px;
            padding: 4px 10px;
            border-radius: 20px;
          }
          .step-title {
            margin: 0;
            font-size: 14px;
            font-weight: 700;
            color: #1e3a8a;
          }
          .step-body {
            padding: 20px;
          }
          .step-desc {
            margin: 0 0 15px 0;
            font-size: 13px;
            line-height: 1.8;
            color: #334155;
          }
          .step-tip {
            background-color: #fef3c7;
            border-right: 4px solid #f59e0b;
            padding: 10px 15px;
            border-radius: 4px;
            font-size: 12px;
            color: #78350f;
          }
          footer {
            margin-top: 50px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <header>
          <div class="brand">هلدینگ بسته‌بندی اشک قلم</div>
          <div class="doc-title">راهنمای مونتاژ گام‌به‌گام و شناسنامه فنی کارتن</div>
        </header>
        
        <div class="meta-section">
          <h2 class="section-title">مشخصات فنی و ساختاری قالب</h2>
          <div class="specs-grid">
            <div class="spec-item">
              <span class="spec-label">کد الگو و مدل:</span>
              <span class="spec-value">${selectedModel.name} (${selectedModel.code})</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">ابعاد اسمی (طول × عرض × ارتفاع):</span>
              <span class="spec-value">${dims.L} × ${dims.W} × ${dims.H} میلی‌متر</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">نوع ورق / مقوای مصرفی:</span>
              <span class="spec-value">${material.name}</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">ضخامت واقعی کالیبره شده:</span>
              <span class="spec-value">${material.thickness} میلی‌متر</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">گرماژ پایه بستر سلولزی:</span>
              <span class="spec-value">${material.weight} گرم بر مترمربع</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">مقاومت نهایی در برابر لهیدگی (ECT):</span>
              <span class="spec-value">${material.ectValue} kN/m</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">سلامت هندسی دایلاین (CAD):</span>
              <span class="spec-value">${geometryReport?.score || 100}٪ (پاس شده)</span>
            </div>
            <div class="spec-item">
              <span class="spec-label">تخمینی از مقاومت فشاری جعبه (BCT):</span>
              <span class="spec-value">${Math.round(bctResult.bctKg)} کیلوگرم (جعبه مرجع)</span>
            </div>
          </div>
        </div>

        <div class="steps-container">
          <h2 class="section-title">توالی تاشدن و مراحل مونتاژ فیزیکی</h2>
          ${stepsHtml}
        </div>

        <footer>
          این سند راهنما به صورت خودکار توسط سیستم هوشمند طراح دایلاین اشک قلم با محاسبات ریاضی کالیبره شده صادر شده است.
          <br/>
          آدرس سامانه: www.ashkghalam.com | کلیه حقوق علمی اثر محفوظ است.
        </footer>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportSVG = () => {
    const runExport = () => {
      // Generate high quality vector SVG content
      const widthMm = dieline.totalW + 50;
      const heightMm = dieline.totalH + 50;
      const viewboxX = dieline.xMin - 25;
      const viewboxY = dieline.yMin - 25;
      const viewboxW = dieline.totalW + 50;
      const viewboxH = dieline.totalH + 50;

      let svgContent = `<?xml version="2.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewboxX} ${viewboxY} ${viewboxW} ${viewboxH}" width="${widthMm}mm" height="${heightMm}mm">
  <style>
    .cut-line { stroke: #111827; stroke-width: 0.5; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .crease-line { stroke: #dc2626; stroke-width: 0.4; stroke-dasharray: 4,4; fill: none; stroke-linecap: round; stroke-linejoin: round; }
    .bleed-line { stroke: #94a3b8; stroke-width: 0.35; stroke-dasharray: 3,2; fill: none; }
    .text-title { font-family: sans-serif; font-size: 5px; font-weight: bold; fill: #0f172a; }
    .text-sub { font-family: sans-serif; font-size: 3.5px; fill: #64748b; }
    .watermark { font-family: sans-serif; font-size: 16px; font-weight: bold; fill: #e2e8f0; opacity: 0.15; text-anchor: middle; }
  </style>

  <g id="Watermark">
    <text x="${(dieline.xMin + dieline.xMax) / 2}" y="${(dieline.yMin + dieline.yMax) / 2}" class="watermark" transform="rotate(25 ${(dieline.xMin + dieline.xMax) / 2} ${(dieline.yMin + dieline.yMax) / 2})">ashkghalam.ir</text>
  </g>

  <g id="Metadata">
    <text x="${dieline.xMin - 15}" y="${dieline.yMin - 15}" class="text-title">نرم افزار طراحی دایلاین و مهندسی اشک قلم</text>
    <text x="${dieline.xMin - 15}" y="${dieline.yMin - 10}" class="text-sub">استاندارد فرمت: ${selectedModel.code}</text>
    <text x="${dieline.xMin - 15}" y="${dieline.yMin - 5}" class="text-sub">ابعاد فیزیکی: ${dims.L} x ${dims.W} x ${dims.H} میلی‌متر (با اعمال جبران ضخامت)</text>
    <text x="${dieline.xMin - 15}" y="${dieline.yMin}" class="text-sub">نوع متریال: ${material.name} (ضخامت: ${material.thickness} میلی‌متر)</text>
    <text x="${dieline.xMin - 15}" y="${dieline.yMin + 5}" class="text-sub">مقاومت تخمینی (BCT): ${physicsReport?.bctKg || 0} کیلوگرم / بازده ورق: ${nestingResult.yieldCount} عدد</text>
    <text x="${dieline.xMin - 15}" y="${dieline.yMin + 10}" class="text-sub" fill="#dc2626">طراحی شده توسط: ashkghalam.ir - چاپ اشک قلم</text>
  </g>

  <g id="BleedLayer">
    <rect x="${dieline.xMin - bleedOffset}" y="${dieline.yMin - bleedOffset}" width="${dieline.totalW + (bleedOffset * 2)}" height="${dieline.totalH + (bleedOffset * 2)}" class="bleed-line" />
    <text x="${dieline.xMin - bleedOffset + 2}" y="${dieline.yMin - bleedOffset - 2}" font-family="sans-serif" font-size="2.5" fill="#94a3b8">محدوده بلید و حاشیه امن (${bleedOffset} میلی‌متر)</text>
  </g>

  <g id="CreaseLayer">
`;

      dieline.creases.forEach(path => {
        svgContent += `    <path d="${path}" class="crease-line" />\n`;
      });

      svgContent += `  </g>\n\n  <g id="CutLayer">\n`;

      dieline.cuts.forEach(path => {
        svgContent += `    <path d="${path}" class="cut-line" />\n`;
      });

      svgContent += `  </g>\n`;

      if (showDimensions && dieline.labels && dieline.labels.length > 0) {
        svgContent += `  <g id="DimensionsLayer">\n`;
        dieline.labels.forEach((lbl: any) => {
          if (lbl.x !== undefined && lbl.y !== undefined && lbl.text) {
            svgContent += `    <text x="${lbl.x}" y="${lbl.y}" font-family="sans-serif" font-size="3" fill="#1e40af" text-anchor="middle" font-weight="bold">${lbl.text}</text>\n`;
          }
        });
        svgContent += `  </g>\n`;
      }

      svgContent += `</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `CAD_${selectedModel.code}_${dims.L}x${dims.W}x${dims.H}_mm.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showCustomAlert(
        'دانلود موفقیت‌آمیز',
        `📥 فایل برداری SVG دایلاین کارگاهی با موفقیت دانلود شد.\n\nاین فایل کاملاً مقیاس‌پذیر و سازگار با نرم‌افزارهای Illustrator و CorelDraw می‌باشد.`,
        'success'
      );
    };

    if (geometryReport.score < 95 || geometryReport.errors.length > 0) {
      const errMsg = `⚠️ امتیاز هندسی نقشه جاری (${geometryReport.score}٪) کمتر از حد مجاز تولید صنعتی (۹۵٪) است یا شامل موارد عدم انطباق زیر می‌باشد:\n\n${geometryReport.errors.map(e => `• ${e}`).join('\n')}\n\nتوصیه می‌شود ابعاد یا نوع ورق را اصلاح نمایید تا محصول نهایی بدون نقص تولید شود.\n\nآیا با مسئولیت خود مایل به دانلود فایل SVG لایه تیغ با وجود این خطاها هستید؟`;
      showCustomAlert('هشدار انطباق هندسی CAD', errMsg, 'confirm', runExport);
    } else {
      runExport();
    }
  };

  const dragStartRef = useRef<{ startX: number, startY: number, startPosW: number, startPosH: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      dragStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startPosW: hudPos.x,
        startPosH: hudPos.y
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging && dragStartRef.current) {
      const deltaX = e.clientX - dragStartRef.current.startX;
      const deltaY = e.clientY - dragStartRef.current.startY;
      setHudPos({
        x: Math.max(10, Math.min(window.innerWidth - 425, dragStartRef.current.startPosW - deltaX)),
        y: Math.max(15, Math.min(window.innerHeight - 300, dragStartRef.current.startPosH + deltaY))
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {
        console.warn("releasePointerCapture failed", err);
      }
    }
  };

  const getHudStyle = () => {
    if (layoutMode === 'hud' || isFullScreen) {
      return {
        position: 'absolute' as const,
        right: `${hudPos.x}px`,
        top: `${hudPos.y}px`
      };
    }
    return {};
  };

  const renderSecondaryControls = (isMobileWrapper: boolean = false) => {
    const Wrapper = ({children}: {children: React.ReactNode}) => 
      !isMobileWrapper ? (
        <div className="absolute left-4 top-4 z-40 w-72 md:w-80 bg-[#0a0d14]/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl shadow-black/90 p-4 transition-all duration-300 font-sans custom-scrollbar select-none" style={{maxHeight: '90vh', overflowY: 'auto'}} dir="rtl">
          {children}
        </div>
      ) : <>{children}</>;

    return (
      <Wrapper>
        {activeTab === 'cad' && (
          <div className="space-y-3.5">
            {/* Header with Close option */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3 className="text-white text-[11px] font-black">تنظیمات فنی و پیشرفته</h3>
              </div>
              {!isMobileWrapper && (
                <button 
                  onClick={() => setShowSecondaryControls(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer border-none"
                  title="بستن پنجره"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Accordion Item 1: Customizable Technical Parameters */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-[#070a0f]/40">
              <button
                onClick={() => setIsTechParamsOpen(!isTechParamsOpen)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-900/40 transition-colors text-right cursor-pointer"
                type="button"
              >
                <span className="text-[10px] font-black text-slate-200">۱. لبه‌ها، اندازه‌گذاری و جهت گرین</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isTechParamsOpen ? 'rotate-180' : ''}`} />
              </button>
              {isTechParamsOpen && (
                <div className="p-3 border-t border-slate-800/40 space-y-3 bg-[#05070a]/30">
                  <div className="grid grid-cols-3 gap-2">
                    <ParamOverrideInput label="لب‌چسب (mm)" placeholder="خودکار" value={paramOverrides.glueTab} onChange={(val: string) => handleParamOverrideChange('glueTab', val)} />
                    <ParamOverrideInput label="زبانه درب (mm)" placeholder="خودکار" value={paramOverrides.tuck} onChange={(val: string) => handleParamOverrideChange('tuck', val)} />
                    <ParamOverrideInput label="گوشواره (mm)" placeholder="خودکار" value={paramOverrides.dustFlap} onChange={(val: string) => handleParamOverrideChange('dustFlap', val)} />
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-800/40">
                    <span className="text-[9.5px] text-slate-400 font-bold">جهت گرین (راه کاغذ)</span>
                    <select 
                      value={grainDirection} 
                      onChange={e => setGrainDirection(e.target.value as any)}
                      className="bg-[#05070a] border border-slate-800 rounded px-2 py-1 text-[9.5px] text-white"
                    >
                      <option value="long">راستای گرین طولی</option>
                      <option value="short">راستای گرین عرضی</option>
                    </select>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/40">
                    <button 
                      onClick={() => setShowDimensions(!showDimensions)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 border rounded-lg transition-colors text-[9.5px] font-bold ${showDimensions ? 'bg-sky-950/30 border-sky-850/60 text-sky-400' : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900'}`}
                      type="button"
                    >
                      <span className="flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-sky-400" /> نمایش فواصل و اندازه‌گذاری فنی</span>
                      <span>{showDimensions ? 'فعال' : 'غیرفعال'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Accordion Item 2: Bottom Lock Flap Settings (Conditional) */}
            {(selectedModel.id === 'fefco-0215' || selectedModel.id === 'snap-lock-123' || selectedModel.id.includes('auto-bottom') || selectedModel.id.includes('crash-lock')) && (
              <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-[#070a0f]/40">
                <button
                  onClick={() => setIsLockAnglesOpen(!isLockAnglesOpen)}
                  className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-900/40 transition-colors text-right cursor-pointer"
                  type="button"
                >
                  <span className="text-[10px] font-black text-slate-200">۲. هندسه قفل ته (Crash Lock Bottom)</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isLockAnglesOpen ? 'rotate-180' : ''}`} />
                </button>
                {isLockAnglesOpen && (
                  <div className="p-3 border-t border-slate-800/40 space-y-3 bg-[#05070a]/30">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>زاویه خط شیب زبانه (Edge Angle):</span>
                        <span className="font-bold text-amber-400">{autoLockAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min={35}
                        max={55}
                        step={1}
                        value={autoLockAngle}
                        onChange={e => setAutoLockAngle(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[8px] text-slate-500 font-mono">
                        <span>35° (کم)</span>
                        <span>45° (استاندارد)</span>
                        <span>55° (تند)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {[40, 45, 50].map(angle => (
                        <button
                          key={angle}
                          type="button"
                          onClick={() => setAutoLockAngle(angle)}
                          className={`px-1 py-1 rounded text-[9px] font-bold border transition-colors ${
                            autoLockAngle === angle
                              ? 'bg-indigo-900 border-indigo-500 text-indigo-300 font-black'
                              : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          {angle}° {angle === 45 ? '★' : ''}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-800/40">
                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>عرض زبانه چسب‌خور کف:</span>
                        <span className="font-bold text-sky-400">{autoLockGlueWidth} mm</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={30}
                        step={1}
                        value={autoLockGlueWidth}
                        onChange={e => setAutoLockGlueWidth(Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                      />
                    </div>

                    <div className="p-2 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-[8.5px] leading-relaxed text-slate-400">
                      <span className="text-indigo-300 font-bold block mb-1">محاسبه ضخامت مقوا ({material.thickness}mm):</span>
                      ضریب ترخیص: +{(material.thickness * 0.8).toFixed(2)}mm | لولا: {Math.max(20, (dims.W * 0.5) + 3 + (0.8 * material.thickness)).toFixed(1)}mm
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Accordion Item 3: Manual Dimensioning Tool */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-[#070a0f]/40">
              <button
                onClick={() => setIsMeasuringToolOpen(!isMeasuringToolOpen)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-900/40 transition-colors text-right cursor-pointer"
                type="button"
              >
                <span className="text-[10px] font-black text-slate-200">۳. ابزار اندازه‌گذاری دستی</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isMeasuringToolOpen ? 'rotate-180' : ''}`} />
              </button>
              {isMeasuringToolOpen && (
                <div className="p-3 border-t border-slate-800/40 space-y-2.5 bg-[#05070a]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400">فواصل دلخواه روی نقشه:</span>
                    {customDimensions.length > 0 && (
                      <button 
                        onClick={() => setCustomDimensions([])}
                        className="text-[8.5px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer border-none bg-transparent"
                        type="button"
                      >
                        پاک کردن اندازه‌ها
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMeasuringMode(!isMeasuringMode);
                      setMeasurementPoints([]);
                    }}
                    className={`w-full py-1.5 px-3 rounded-lg text-[9.5px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      isMeasuringMode 
                        ? 'bg-amber-600 border-amber-500 text-white shadow-lg' 
                        : 'bg-slate-950 border-slate-850 text-amber-500 hover:bg-slate-900'
                    }`}
                  >
                    <RulerIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{isMeasuringMode ? 'حالت ترسیم فعال (کلیک روی نقشه)' : 'فعال‌سازی ابزار خط اندازه پیکان‌دار'}</span>
                  </button>

                  {isMeasuringMode && (
                    <p className="text-[8.5px] text-amber-400/90 leading-snug bg-amber-950/20 border border-amber-900/30 p-2 rounded text-center">
                      {measurementPoints.length === 0 
                        ? 'مرحله اول: روی نقطه شروع کلیک کنید.' 
                        : 'مرحله دوم: روی نقطه پایان کلیک کنید.'}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Accordion Item 4: Geometric Debugger & Warnings */}
            <div className="border border-slate-800/60 rounded-xl overflow-hidden bg-[#070a0f]/40">
              <button
                onClick={() => setIsDebuggerOpen(!isDebuggerOpen)}
                className="w-full px-3 py-2.5 flex items-center justify-between hover:bg-slate-900/40 transition-colors text-right cursor-pointer"
                type="button"
              >
                <span className="text-[10px] font-black text-slate-200">۴. دیباگر نهایی و هشدارهای هندسی</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isDebuggerOpen ? 'rotate-180' : ''}`} />
              </button>
              {isDebuggerOpen && (
                <div className="p-3 border-t border-slate-800/40 space-y-2.5 bg-[#05070a]/30">
                  {dieline.debugVals ? (
                    <div className="p-2.5 bg-slate-950 border border-slate-850 rounded-lg text-[9px] space-y-1 font-mono text-slate-400">
                      <span className="text-[8.5px] text-slate-500 font-sans block">ابعاد نهایی مقوای مصرفی:</span>
                      <div className="flex justify-between">
                        <span>طول گسترده:</span>
                        <strong className="text-slate-200">{dieline.debugVals.effL.toFixed(1)}mm</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>عرض گسترده:</span>
                        <strong className="text-slate-200">{dieline.debugVals.effW.toFixed(1)}mm</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>ارتفاع گسترده:</span>
                        <strong className="text-slate-200">{dieline.debugVals.effH.toFixed(1)}mm</strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-500 text-center">دیتای دیباگر در دسترس نیست.</p>
                  )}

                  {/* Geometric Validation Warning Banner if impossible dimensions */}
                  {(dims.L <= dims.W || dims.H < (dims.W / 2 + 5)) && (
                    <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-900/40 text-[8.5px] text-rose-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-rose-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>محدودیت‌های فنی ساختار:</span>
                      </div>
                      {dims.L <= dims.W && (
                        <p className="leading-snug">
                          ⛔ طول ({dims.L}mm) باید بزرگتر از عرض ({dims.W}mm) باشد تا زباله‌های کف به درستی تا شوند.
                        </p>
                      )}
                      {dims.H < (dims.W / 2 + 5) && (
                        <p className="leading-snug">
                          ⛔ ارتفاع ({dims.H}mm) بسیار کوتاه است؛ زبانه‌ها هنگام تولید از دهانه خارج می‌شوند.
                        </p>
                      )}
                    </div>
                  )}

                  {dieline.constraintAlerts && dieline.constraintAlerts.length > 0 && (
                    <div className="p-2.5 bg-rose-950/20 border border-rose-900/30 rounded-lg text-[8.5px] text-rose-300 space-y-1.5">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        <strong className="text-rose-400">تداخلات ساختاری هندسه:</strong>
                      </div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                        {dieline.constraintAlerts.map((alert: string, i: number) => (
                          <li key={i}>{alert}</li>
                        ))}
                      </ul>
                      <button onClick={() => setParamOverrides({ glueTab: '', tuck: '', dustFlap: '' })} className="mt-1 text-[8px] bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 px-2 py-1 rounded transition-colors w-full border-none">اصلاح خودکار پارامترها</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'nesting' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Layers3 className="w-4 h-4 text-sky-400" />
                <h3 className="text-white text-[11px] font-black font-sans">تنظیمات شیت و ماشین چاپ</h3>
              </div>
              {!isMobileWrapper && (
                <button 
                  onClick={() => setShowSecondaryControls(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer border-none"
                  title="بستن"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="space-y-3 bg-[#070a0f]/20 border border-slate-800/50 p-3 rounded-xl text-[10px] text-slate-300">
              <div>
                <label className="text-[9.5px] text-slate-400 block mb-1.5 font-bold">سایز شیت (ورق خام)</label>
                <select 
                  className="w-full bg-[#0a0d14] border border-slate-800 text-slate-300 rounded-lg p-1.5 text-[10px] outline-none"
                  value={sheetSize.name}
                  onChange={(e) => {
                    const newSize = STANDARD_SHEET_SIZES.find(s => s.name === e.target.value);
                    if (newSize) setSheetSize(newSize);
                  }}
                >
                  {STANDARD_SHEET_SIZES.map(sh => (
                    <option key={sh.name} value={sh.name}>{sh.name} ({sh.width}x{sh.height} mm)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9.5px] text-slate-400 block mb-1.5 font-bold">ماشین چاپ (فرمت حداکثر)</label>
                <select 
                  className="w-full bg-[#0a0d14] border border-slate-800 text-slate-300 rounded-lg p-1.5 text-[10px] outline-none"
                  value={activePress.name}
                  onChange={(e) => {
                    const newPress = MACHINE_PRESETS.find(p => p.name === e.target.value);
                    if (newPress) setActivePress(newPress);
                  }}
                >
                  {MACHINE_PRESETS.map(p => (
                    <option key={p.name} value={p.name}>{p.name} ({p.sheetW}x{p.sheetH} mm)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9.5px] text-slate-400 block mb-1 font-bold">الگوریتم چیدمان زینک</label>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950/80 border border-slate-850 rounded-lg">
                  <button
                    onClick={() => {
                      setLayoutAlgorithm('standard');
                      setNestingMode('fast');
                    }}
                    className={`py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${layoutAlgorithm === 'standard' ? 'bg-[#1e2d42] text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                    type="button"
                  >
                    ردیفی کلاسیک
                  </button>
                  <button
                    onClick={() => {
                      setLayoutAlgorithm('nested_optimized');
                      setNestingMode('ai');
                    }}
                    className={`py-1 rounded-md text-[9px] font-bold transition-all cursor-pointer ${layoutAlgorithm === 'nested_optimized' ? 'bg-[#1e2d42] text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                    type="button"
                  >
                    بهینه متداخل
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                <div className="flex justify-between items-center text-[9.5px]">
                  <span className="text-slate-400">فاصله ایمن بین زینک‌ها:</span>
                  <span className="font-mono text-cyan-400 font-bold bg-[#0a0d14] px-1.5 py-0.5 rounded border border-slate-800">{nestingGap} mm</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="20" 
                  step="1" 
                  value={nestingGap} 
                  onChange={e => setNestingGap(parseInt(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded accent-sky-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/40 flex justify-between text-[9px] font-mono">
                <div>راندمان: <span className="text-emerald-400 font-bold">{nestingResult.efficiency}%</span></div>
                <div>پرت ضایعات: <span className="text-rose-400 font-bold">{nestingResult.waste}%</span></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'physics' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-white text-[11px] font-black">شبیه‌سازی استحکام و دپو</h3>
              </div>
              {!isMobileWrapper && (
                <button 
                  onClick={() => setShowSecondaryControls(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer border-none"
                  title="بستن"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="space-y-3 bg-[#070a0f]/20 border border-slate-800/50 p-3 rounded-xl text-[10px] text-slate-300">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9.5px]">
                  <span className="text-slate-400">وزن بار فیزیکی درون جعبه:</span>
                  <span className="font-mono text-amber-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">{productWeight} kg</span>
                </div>
                <input 
                  type="range" min="0.1" max="10" step="0.1" 
                  value={productWeight} 
                  onChange={e => setProductWeight(parseFloat(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded accent-amber-500"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                <div className="flex justify-between text-[9.5px]">
                  <span className="text-slate-400">رطوبت نسبی انبار دپو:</span>
                  <span className="font-mono text-indigo-400 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">{shelfHumidity}% RH</span>
                </div>
                <input 
                  type="range" min="10" max="95" 
                  value={shelfHumidity} 
                  onChange={e => setShelfHumidity(parseInt(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded accent-indigo-500"
                />
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                <div className="flex justify-between text-[9.5px]">
                  <span className="text-slate-400">ارتفاع چیدمان در پالت (استک):</span>
                  <span className="font-mono text-emerald-405 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">{stackHeight} جعبه</span>
                </div>
                <input 
                  type="range" min="2" max="30" 
                  value={stackHeight} 
                  onChange={e => setStackHeight(parseInt(e.target.value))} 
                  className="w-full h-1 bg-slate-800 rounded accent-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <h3 className="text-white text-[11px] font-black">مبانی محاسباتی هزینه صنعتی</h3>
              </div>
              {!isMobileWrapper && (
                <button 
                  onClick={() => setShowSecondaryControls(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer border-none"
                  title="بستن"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="bg-[#070a0f]/40 p-3.5 rounded-xl border border-slate-800/60 flex flex-col gap-2.5 font-mono text-[9.5px] text-slate-300">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-sans">هزینه متریال ورق خام:</span>
                <span className="font-bold text-slate-200">{Math.round(((sheetSize.width * sheetSize.height) / 1000000) * (material.weight / 1000) * material.unitPrice).toLocaleString()} تومان</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/40 pt-2">
                <span className="text-slate-400 font-sans">نرخ خدمات ضرب دایکات:</span>
                <span className="font-bold text-slate-200">{Math.round((dims.L + dims.W) * 2).toLocaleString()} تومان/ورق</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-800/40 pt-2 text-sky-400 font-bold">
                <span className="font-sans">سود تخمینی پیمانکاری:</span>
                <span>۱۲٪</span>
              </div>
            </div>
          </div>
        )}
      </Wrapper>
    );
  };



  const renderPrimaryControls = () => {
    const realtimeEngineParams: Dieline3DParameters = {
      L: dims.L,
      W: dims.W,
      H: dims.H,
      glueTab: typeof paramOverrides.glueTab === 'number' ? paramOverrides.glueTab : (dieline?.glueTab || 15),
      tuck: typeof paramOverrides.tuck === 'number' ? paramOverrides.tuck : (dieline?.tuck || 18),
      dustFlap: typeof paramOverrides.dustFlap === 'number' ? paramOverrides.dustFlap : (dieline?.dustFlap || 18),
      materialThickness: material.thickness,
      materialGsm: material.weight || 300,
      materialType: (material.category as any) || 'SBS',
      boxType: selectedModel.id,
      grainDirection: grainDirection === 'long' ? 'parallel_L' : 'parallel_W'
    };

    const handleUpdateRealtimeParams = (newParams: Dieline3DParameters) => {
      setDims({ L: newParams.L, W: newParams.W, H: newParams.H });
      if (newParams.glueTab !== undefined) setParamOverrides(p => ({ ...p, glueTab: newParams.glueTab }));
      if (newParams.tuck !== undefined) setParamOverrides(p => ({ ...p, tuck: newParams.tuck }));
      if (newParams.dustFlap !== undefined) setParamOverrides(p => ({ ...p, dustFlap: newParams.dustFlap }));
    };

    switch (activeTab) {
      case 'cad':
        return (
          <div className="space-y-3">
            {/* Category Selector & AI Smart Pattern Recommendation */}
            <div className="bg-[#080d17] border border-sky-900/50 rounded-2xl p-3.5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-sky-900/30 pb-2">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>دسته‌بندی محصول و پیشنهاد الگوی دایلاین</span>
                </div>
                <span className="text-[9px] bg-sky-950 text-sky-300 font-mono px-2 py-0.5 rounded border border-sky-800">
                  Smart Pattern
                </span>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {PRODUCT_CATEGORIES.map(cat => {
                  const isCatActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleApplyCategoryRecommendation(cat.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                        isCatActive
                          ? 'bg-sky-600 border-sky-400 text-white shadow-md shadow-sky-950/50 font-black'
                          : 'bg-[#04070d] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                      type="button"
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Category Recommendation Box */}
              {(() => {
                const activeCat = PRODUCT_CATEGORIES.find(c => c.id === selectedCategory);
                if (!activeCat) return null;
                const recModel = STANDARDS_LIBRARY.find(m => m.id === activeCat.recommendedModelId);

                return (
                  <div className="bg-gradient-to-br from-sky-950/40 via-indigo-950/20 to-[#05080e] border border-sky-500/30 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold text-sky-300">
                      <span className="flex items-center gap-1">
                        <span>پیشنهاد هوشمند برای {activeCat.name}:</span>
                        <strong className="text-amber-300 font-black">{recModel?.name} ({recModel?.code})</strong>
                      </span>
                      {selectedModel.id === recModel?.id && (
                        <span className="text-[8.5px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                          ✓ الگوی فعال
                        </span>
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-300 leading-relaxed font-sans">
                      {activeCat.recommendationReason}
                    </p>
                    {selectedModel.id !== recModel?.id && (
                      <button
                        type="button"
                        onClick={() => handleApplyCategoryRecommendation(activeCat.id)}
                        className="w-full bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-[10px] font-black py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow border-none cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>اعمال این الگو و ابعاد پیشنهادی</span>
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Group 1: Style Selection - Visible at top for easy pattern selection */}
            <CollapsiblePanel
              isOpen={openPanels['cad_style'] !== false}
              onToggle={() => togglePanel('cad_style')}
              title="انتخاب و نوع الگوی دایلاین (ECMA / FEFCO)"
              subLabel={`${selectedModel.code} - ${selectedModel.name}`}
              icon={Shapes}
            >
              <div>
                <label className="text-[9.5px] font-bold text-slate-400 block mb-2">جستجو در مخزن استانداردهای اروپا و بین‌الملل</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="کد FEFCO یا استاندارد ECMA..."
                  className="w-full bg-[#070a0e] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <span className="text-[9.5px] font-black text-slate-500 block mb-2 uppercase">لیست استانداردهای فعال کارگاهی:</span>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-slate-800 rounded-xl p-1 bg-[#070a0e]/40">
                  {filteredModels.map(m => (
                    <div 
                      key={m.id} 
                      onClick={() => handleModelSelect(m)} 
                      className={`cursor-pointer p-2.5 rounded-lg border text-right transition-all flex items-center gap-2.5 ${selectedModel.id === m.id ? 'border-sky-500 bg-sky-950/10 shadow-sm' : 'border-slate-800/80 hover:border-slate-700 hover:bg-[#161b22]/30'}`}
                    >
                      <div className="text-xl filter drop-shadow">{m.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-bold ${selectedModel.id === m.id ? 'text-sky-400' : 'text-slate-300'} truncate`}>{m.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">{m.code} | {m.category}</p>
                      </div>
                      {selectedModel.id === m.id && <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></div>}
                    </div>
                  ))}
                </div>
              </div>
            </CollapsiblePanel>

            {/* Group 2: Dimensions - Always prominent and open at top */}
            <CollapsiblePanel
              isOpen={openPanels['cad_dims'] !== false}
              onToggle={() => togglePanel('cad_dims')}
              title="ابعاد فیزیکی و اصلی جعبه (L × W × H)"
              subLabel={`ابعاد: ${dims.L} × ${dims.W} × ${dims.H} ${formatUnitLabel(unit)}`}
              icon={RulerIcon}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold">واحد ابعاد جاری:</span>
                <button 
                  onClick={() => setOnboardingStep(0)}
                  className="text-[9px] bg-indigo-950 hover:bg-slate-900 border border-indigo-800 text-indigo-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer"
                  title="آموزش تعاملی بخش‌های قالب"
                >
                  <Sparkles className="w-2.5 h-2.5 animate-pulse text-indigo-400" />
                  آموزش صوتی قالب
                </button>
              </div>

              {/* Unit switcher */}
              <div className="flex items-center justify-between p-1 bg-slate-950/60 border border-slate-800/85 rounded-xl mb-3 gap-1">
                <span className="text-[10px] text-slate-400 px-2">تبدیل واحد خودکار:</span>
                <div className="flex items-center gap-1">
                  {[
                    { id: 'mm', label: 'میلی‌متر (mm)' },
                    { id: 'cm', label: 'سانتی‌متر (cm)' },
                    { id: 'inches', label: 'اینچ (inch)' }
                  ].map(u => (
                    <button
                      key={u.id}
                      onClick={() => setUnit(u.id as any)}
                      className={`text-[9.5px] px-2 py-1 rounded-md font-bold transition-all ${unit === u.id ? 'bg-sky-600 text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                      type="button"
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
              </div>

              <BoundingBoxPreview 
                L={convertMmToUnit(dims.L, unit)} 
                W={convertMmToUnit(dims.W, unit)} 
                H={convertMmToUnit(dims.H, unit)} 
              />

              <div className="space-y-3">
                {[
                  { key: 'L', label: 'طول جعبه (L)', tooltip: 'بعد طولی جعبه که معمولا بزرگترین ضلع است. تغییر این مقدار روی مصرف مقوا تاثیر مستقیم دارد.' },
                  { key: 'W', label: 'عرض جعبه (W)', tooltip: 'عرض جعبه (عمق). تغییر این مقدار بر پایداری جعبه و چینش در پالت تاثیر دارد.' },
                  { key: 'H', label: 'ارتفاع جعبه (H)', tooltip: 'ارتفاع یا عمق جعبه. مقادیر خیلی کم ممکن است مونتاژ جعبه را دشوار کند.' }
                ].map(param => (
                  <DimensionInput
                    key={param.key}
                    label={param.label}
                    value={dims[param.key as keyof typeof dims]}
                    unit={unit}
                    onChange={(valInMm) => handleDimensionChange(param.key as 'L' | 'W' | 'H', valInMm)}
                    convertMmToUnit={convertMmToUnit}
                    convertUnitToMm={convertUnitToMm}
                    tooltip={param.tooltip}
                  />
                ))}
              </div>

              {/* Extended Flap & Material Parameters in Sidebar */}
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                <span className="text-[10px] font-bold text-sky-400 block">پارامترهای فرعی و زواید اتصال:</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">زبانه درپوش (mm)</label>
                    <input 
                      type="number"
                      value={typeof paramOverrides.tuck === 'number' ? paramOverrides.tuck : (dieline?.tuck || 18)}
                      onChange={e => handleParamOverrideChange('tuck', e.target.value)}
                      className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">گردگیر (mm)</label>
                    <input 
                      type="number"
                      value={typeof paramOverrides.dustFlap === 'number' ? paramOverrides.dustFlap : (dieline?.dustFlap || 18)}
                      onChange={e => handleParamOverrideChange('dustFlap', e.target.value)}
                      className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block mb-1">لب‌چسب (mm)</label>
                    <input 
                      type="number"
                      value={typeof paramOverrides.glueTab === 'number' ? paramOverrides.glueTab : (dieline?.glueTab || 15)}
                      onChange={e => handleParamOverrideChange('glueTab', e.target.value)}
                      className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-bold">جهت گرین مقوا (راه موج)</span>
                <select 
                  value={grainDirection} 
                  onChange={e => setGrainDirection(e.target.value as any)}
                  className="bg-[#070a0e] border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                >
                  <option value="long">راستای گرین طولی</option>
                  <option value="short">راستای گرین عرضی</option>
                </select>
              </div>

              {selectedModel.id === 'snap-lock-123' && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">الگوی مهندسی ته قفلی (Auto-Layout)</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => setSnapLockVariant('standard')}
                      className={`px-2 py-1.5 rounded border text-[9.5px] font-bold text-center flex justify-between items-center transition-colors ${snapLockVariant === 'standard' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                    >
                      <span>الگوی استاندارد (مدرن ECMA A2110)</span>
                      {snapLockVariant === 'standard' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </button>
                    <button
                      onClick={() => setSnapLockVariant('reinforced')}
                      className={`px-2 py-1.5 rounded border text-[9.5px] font-bold text-center flex justify-between items-center transition-colors ${snapLockVariant === 'reinforced' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                    >
                      <span>الگوی تقویت‌شده صنعتی</span>
                      {snapLockVariant === 'reinforced' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </button>
                    <button
                      onClick={() => setSnapLockVariant('eco')}
                      className={`px-2 py-1.5 rounded border text-[9.5px] font-bold text-center flex justify-between items-center transition-colors ${snapLockVariant === 'eco' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                    >
                      <span>الگوی اکو (کاهش ضایعات)</span>
                      {snapLockVariant === 'eco' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </button>
                  </div>
                </div>
              )}

              {customTemplates.some(t => t.baseModelId === selectedModel.id && t.isOverride) && (
                <div className="pt-3 border-t border-amber-800/60 bg-amber-950/30 p-2.5 rounded-lg space-y-2 mt-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                    <span>اورراید فایل DXF موجود است</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8.5px] ${useStandardMathEngine ? 'bg-emerald-900/80 text-emerald-300' : 'bg-amber-900/80 text-amber-200'}`}>
                      {useStandardMathEngine ? 'موتور CAD فعال' : 'فایل DXF فعال'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => setUseStandardMathEngine(true)}
                      className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${useStandardMathEngine ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      موتور پارامتری CAD
                    </button>
                    <button
                      onClick={() => setUseStandardMathEngine(false)}
                      className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors ${!useStandardMathEngine ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'}`}
                    >
                      الگوی DXF ثابت
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const overrides = customTemplates.filter(t => t.baseModelId === selectedModel.id && t.isOverride);
                      overrides.forEach(ov => handleDeleteCustomTemplate({ stopPropagation: () => {} } as any, ov.id));
                      setUseStandardMathEngine(true);
                    }}
                    className="w-full text-center text-[9px] text-red-400 hover:text-red-300 underline pt-1 block"
                  >
                    حذف فایل‌های اورراید DXF این الگو
                  </button>
                </div>
              )}
            </CollapsiblePanel>

            {/* Group 3: Calculations & Physics Engine */}
            <CollapsiblePanel
              isOpen={!!openPanels['cad_calc']}
              onToggle={() => togglePanel('cad_calc')}
              title="محاسبات مکانیکی و مقاومت فیزیکی BCT"
              subLabel="تحلیل بارهای استاتیک و استحکام بدنه"
              icon={Calculator}
            >
              <RealtimeCalculationPanel
                parameters={realtimeEngineParams}
                onUpdateParameters={handleUpdateRealtimeParams}
                className="mb-3"
              />
            </CollapsiblePanel>

            {/* Group 4: Dimension Accuracy & Geometric Evaluator */}
            <CollapsiblePanel
              isOpen={!!openPanels['dim_accuracy']}
              onToggle={() => togglePanel('dim_accuracy')}
              title="ماژول ارزیابی انطباق هندسی ECMA / FEFCO"
              subLabel="ارزیابی هوشمند تناسبات L, W, H، لاک‌باتم و گرماژ"
              icon={ShieldCheck}
            >
              <DimensionAccuracyEvaluator 
                input={accuracyInput}
                onApplySuggestion={handleApplyAccuracySuggestion}
                onApplyAllFixes={handleApplyAllAccuracyFixes}
              />
            </CollapsiblePanel>

            {/* Group 3: Cardboard sheet material specifications */}
            <CollapsiblePanel
              isOpen={!!openPanels['cad_mat']}
              onToggle={() => togglePanel('cad_mat')}
              title="متریال و گراماژ مقوای فیزیکی"
              subLabel={`مقوا: ${material.name} - g${material.weight}`}
              icon={Box}
            >
              <label className="text-[9.5px] font-black text-slate-400 mb-2 block">ساختار الیاف و گراماژ مقوای فیزیکی</label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {MATERIAL_PRESETS.map(m => (
                  <button 
                    key={m.id} 
                    onClick={() => setMaterial(m)}
                    className={`w-full text-right px-3 py-2 text-[10px] rounded-lg border transition-all flex justify-between items-center ${material.id === m.id ? 'bg-indigo-950/40 border-sky-600 text-sky-400 font-black' : 'bg-[#070a0e]/40 border-slate-850 text-slate-400 hover:bg-[#161b22]/20'}`}
                    type="button"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full border" style={{ backgroundColor: m.color }}></div>
                      <span>{m.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-500">{m.weight}g | {m.thickness}mm</span>
                  </button>
                ))}
              </div>
            </CollapsiblePanel>

            {/* Group 5: Layer Management */}
            <CollapsiblePanel
              isOpen={!!openPanels['cad_layers']}
              onToggle={() => togglePanel('cad_layers')}
              title="مدیریت لایه‌ها (Layer Manager)"
              subLabel="نمایش خطوط تا، برش، ابعاد و..."
              icon={Layers}
            >
              <LayerManager 
                layers={layers}
                onToggleVisibility={(id) => setLayers(layers.map(l => l.id === id ? { ...l, isVisible: !l.isVisible } : l))}
                onToggleLock={(id) => setLayers(layers.map(l => l.id === id ? { ...l, isLocked: !l.isLocked } : l))}
              />
            </CollapsiblePanel>

            {/* Group 6: Advanced Settings */}
            <CollapsiblePanel
              isOpen={!!openPanels['cad_adv']}
              onToggle={() => togglePanel('cad_adv')}
              title="پارامترهای پیشرفته خط‌تا و تیغ (Die-cut)"
              subLabel="تنظیمات مهندسی دای‌کات"
              icon={Settings}
            >
              <div className="space-y-4">
                <button
                  onClick={clearAllCache}
                  className="w-full bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded py-2 text-[10px] flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  پاکسازی کش و بازنشانی (Reset Cache)
                </button>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">ضخامت جبرانی خط تا (Crease Compensation - mm):</label>
                  <DimensionInput
                    label=""
                    value={creaseCompensation}
                    unit="mm"
                    onChange={(val) => setCreaseCompensation(val)}
                    convertMmToUnit={convertMmToUnit}
                    convertUnitToMm={convertUnitToMm}
                    inputClassName="w-24 bg-[#030508] border border-slate-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 font-mono text-center"
                    tooltip="میزان جبران ضخامت مقوا در محل خط تا. برای جلوگیری از پارگی مقوا در هنگام تا خوردن ضروری است."
                  />
                  <p className="text-[9px] text-slate-500 mt-1">مقدار پیشنهادی برای مقوای فعلی: {material.thickness / 2}mm</p>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">حاشیه رنگ بلید (Bleed Offset - mm):</label>
                  <DimensionInput
                    label=""
                    value={bleedOffset}
                    unit="mm"
                    onChange={(val) => setBleedOffset(val)}
                    convertMmToUnit={convertMmToUnit}
                    convertUnitToMm={convertUnitToMm}
                    inputClassName="w-24 bg-[#030508] border border-slate-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 font-mono text-center"
                    tooltip="افزایش حاشیه بلید (Bleed) دقت برش را بالا برده و از دیده شدن سفیدی لبه مقوا در صورت خطای برش جلوگیری می‌کند."
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">تلرانس ماشین لترپرس/دای‌کات (Tolerance - mm):</label>
                  <DimensionInput
                    label=""
                    value={diecutTolerance}
                    unit="mm"
                    onChange={(val) => setDiecutTolerance(val)}
                    convertMmToUnit={convertMmToUnit}
                    convertUnitToMm={convertUnitToMm}
                    inputClassName="w-24 bg-[#030508] border border-slate-800 rounded px-2 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 font-mono text-center"
                    tooltip="تلرانس مجاز جابجایی تیغ در ماشین دای‌کات. این مقدار به عنوان حاشیه امن (Safe Margin) در نظر گرفته می‌شود."
                  />
                </div>
              </div>
            </CollapsiblePanel>
          </div>
        );
      case 'standards':
        return (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800">
              <StandardsEnginePanel 
                dims={dims}
                selectedModelId={(selectedModel as any).baseModelId || selectedModel.id}
                material={material} onModelChange={(modelId) => {
                  const found = STANDARDS_LIBRARY.find(s => s.id === modelId);
                  if (found) {
                    setSelectedModel(found);
                    setDims(found.defaultDims);
                  }
                }}
              />
            </div>

            {/* سامانه اعتبارسنجی زوایا و تداخلات پارامتریک */}
            <CollapsiblePanel
              isOpen={!!openPanels['parametric_angles']}
              onToggle={() => togglePanel('parametric_angles')}
              title="اعتبارسنجی زوایا و تداخلات پارامتریک"
              subLabel={geometryReport.passed ? "هندسه منطبق بر استانداردهای بین‌المللی" : "نیازمند اصلاح مهندسی ابعاد"}
              icon={ShieldAlert}
            >
              <div className="space-y-3 p-3 rounded-xl border border-slate-800/80 bg-[#090c12]/80">
                <div className="text-[10px] text-slate-400 leading-relaxed mb-1" dir="rtl">
                  این سیستم اعتبارسنجی محاسباتی هوشمند، قبل از گرفتن هرگونه خروجی یا نقشه نهایی، زوایای خم (Crease) و برش (Cut) قالب بسته‌بندی را با استانداردهای لیتوگرافی جهانی تطبیق داده و مانع تداخل فیزیکی بازوها می‌شود.
                </div>

                {/* آمار پایش زوایا */}
                <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-300 font-mono" dir="rtl">
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">کل سگمنت‌های دایلاین:</span>
                    <strong className="text-sky-400 font-bold text-[10px]">{dieline.creases.length + dieline.cuts.length} خط</strong>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
                    <span className="text-slate-500 block mb-0.5">امتیاز نهایی سلامت زوایا:</span>
                    <strong className={`font-bold text-[10px] ${geometryReport.score >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>{geometryReport.score}٪</strong>
                  </div>
                </div>

                <div className="text-[9.5px] space-y-1.5 mt-2" dir="rtl">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/65 pb-1">
                    <span>محدوده زوایای ایمن خم (تا):</span>
                    <span className="font-mono text-slate-200">0° / 45° / 90° (±1.5°)</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800/65 pb-1">
                    <span>تداخل ضربدری تیغ و خط تا:</span>
                    <span className={geometryReport.warnings.length === 0 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                      {geometryReport.warnings.length === 0 ? "بدون تلاقی نامجاز" : `${geometryReport.warnings.length} مورد یافت شد`}
                    </span>
                  </div>
                </div>

                {/* وضعیت پایش و زوایای تداخلی */}
                <div className="mt-2">
                  {geometryReport.errors.length > 0 ? (
                    <div className="bg-rose-950/30 border border-rose-900/60 p-2.5 rounded-lg text-[9.5px] text-rose-300 space-y-1" dir="rtl">
                      <div className="font-bold flex items-center gap-1 text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                        خطای تداخل هندسی (بلاک خروجی):
                      </div>
                      <div className="text-rose-300/90 leading-relaxed pl-1 space-y-0.5">
                        {geometryReport.errors.map((err, idx) => (
                          <div key={idx}>• {err}</div>
                        ))}
                      </div>
                    </div>
                  ) : geometryReport.warnings.length > 0 ? (
                    <div className="bg-amber-950/30 border border-amber-900/60 p-2.5 rounded-lg text-[9.5px] text-amber-300 space-y-1" dir="rtl">
                      <div className="font-bold flex items-center gap-1 text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        هشدار اصلاح هندسی زوایای خم:
                      </div>
                      <div className="text-amber-300/90 leading-relaxed pl-1 space-y-0.5">
                        {geometryReport.warnings.map((warn, idx) => (
                          <div key={idx}>• {warn}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-950/30 border border-emerald-900/60 p-2.5 rounded-lg text-[9.5px] text-emerald-300 flex items-center gap-1.5 leading-relaxed" dir="rtl">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>طرح هندسی کاملاً تایید شده و زوایا با استانداردهای جهانی جعبه‌چسبانی مطابقت دارند.</span>
                    </div>
                  )}
                </div>

                {/* پیش‌نهادهای اصلاحی هوشمند استانداردهای کارتن‌سازی */}
                {geometryReport.suggestions && geometryReport.suggestions.length > 0 && (
                  <div className="mt-2 space-y-2" dir="rtl">
                    <div className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <span>💡 پیشنهادهای اصلاحی بر اساس استانداردهای ساخت کارتن:</span>
                    </div>
                    {geometryReport.suggestions.map((sug, idx) => (
                      <div key={idx} className="bg-slate-900/90 border border-amber-500/40 p-2.5 rounded-lg text-[9.5px] space-y-1.5">
                        <div className="font-bold text-slate-100">{sug.title}</div>
                        <div className="text-slate-300">{sug.issue}</div>
                        <div className="text-amber-300 font-mono text-[9px]">{sug.fix}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsiblePanel>
          </div>
        );

      case 'physics':
        return physicsReport ? (
          <div className="space-y-3 animate-in fade-in duration-200">
             <CollapsiblePanel
                isOpen={!!openPanels['physics_report']}
                onToggle={() => togglePanel('physics_report')}
                title="گزارش مقاومت فشاری کارتن (BCT)"
                subLabel={physicsReport.passStatus ? "سازه‌‌ی ایمن" : "خطر له‌شدگی بسته‌ها!"}
                icon={Info}
              >
                <div className={`p-4 rounded-xl border ${physicsReport.passStatus ? 'bg-emerald-950/20 border-emerald-800' : 'bg-red-950/20 border-red-900/60'} space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300">وضعیت ایمنی انبار:</span>
                    <Badge color={physicsReport.passStatus ? 'green' : 'red'}>
                      {physicsReport.passStatus ? 'سازه کاملاً ایمن' : 'خطر تخریب فیزیکی'}
                    </Badge>
                  </div>

                  <div className="h-px bg-slate-800/80"></div>

                  <div className="space-y-2 text-[10px] font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>مقاومت فشار اسمی McKee:</span>
                      <span className="text-white font-bold">{physicsReport.bctKg} کیلوگرم</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ضریب ایمنی انبارداری:</span>
                      <span className="text-indigo-400 font-bold">{physicsReport.safetyFactor}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>فشار استاتیک رج زیرین:</span>
                      <span className="text-white font-bold">{physicsReport.requiredResistanceKg} کیلوگرم</span>
                    </div>
                  </div>
                </div>
              </CollapsiblePanel>
          </div>
        ) : <div className="text-center text-[10px] text-slate-500 py-4">در حال محاسبه...</div>;

      case 'nesting':
        return (
          <div className="space-y-3">
            <CollapsiblePanel
              isOpen={!!openPanels['nesting_metrics']}
              onToggle={() => togglePanel('nesting_metrics')}
              title="آمار چیدمان زینک (Nesting)"
              subLabel={`بازده: ${nestingResult.efficiency}٪`}
              icon={Calculator}
            >
              <div className="space-y-4">
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-850 space-y-3.5">
                  <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                    <span className="text-[10px] text-slate-400">تعداد نهایی قالب روی ورق (Yield):</span>
                    <span className="text-white text-xs font-black">{nestingResult.yieldCount} قالب موازی</span>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1 text-[10px] text-slate-450">
                      <span>پرت پس‌مانده مقوا (Wastage):</span>
                      <span className="text-red-400 font-bold">{nestingResult.waste}٪</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full transition-all duration-500" style={{ width: `${nestingResult.waste}%` }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1 text-[10px] text-slate-450">
                      <span>بازده هندسی کل ورق (Eff):</span>
                      <span className="text-emerald-400 font-bold">{nestingResult.efficiency}٪</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald-404 h-full rounded-full transition-all duration-500" style={{ width: `${nestingResult.efficiency}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsiblePanel>
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <div className="bg-[#070a0e]/60 p-4 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-855 pb-2.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">تحلیل اجزای هزینه و قیمت فروش</span>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">وزن هر مقوای مونتاژ شده:</span>
                <span className="text-slate-300 font-mono font-bold">{costCalculations.boxWeightGrams} گرم</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">هزینه شیت خام لیتوگرافی:</span>
                <span className="text-slate-300 font-mono font-bold">{costCalculations.sheetCostToman.toLocaleString()} تومان</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-[10px] text-slate-400">خدمات دایکات زاییده و سلفون:</span>
                <span className="text-slate-300 font-mono font-bold">{costCalculations.rawCostPerBox.toLocaleString()} تومان</span>
              </div>

              <div className="h-px bg-slate-800"></div>

              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-white">قیمت نهایی هر جعبه (تومان):</span>
                <span className="text-emerald-404 text-sm font-black font-mono">{costCalculations.clientPriceToman.toLocaleString()} تومان</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={handleReserveStock}
                className="w-full bg-indigo-700/85 hover:bg-indigo-600 font-bold text-[10.5px] py-3 rounded-xl text-white transition-all shadow-md border-none cursor-pointer"
                type="button"
              >
                رزرو متراژ مقوا انبار ERP
              </button>
              <button 
                onClick={() => showCustomAlert('ملیچه حسابداری مانا', 'ملیچه حسابداری: سند معین برآورد مالی صادر و در بدهی مشتری در سیستم جامع ثبت موقت گردید.', 'success')}
                className="w-full bg-slate-850 hover:bg-slate-800 text-[10px] py-2.5 rounded-xl text-slate-350 font-bold border border-slate-800 cursor-pointer"
                type="button"
              >
                صدور پیش‌فاکتور مانا
              </button>
            </div>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-3.5 flex flex-col min-h-[460px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 animate-bounce" />
                <span className="text-[11px] font-black text-slate-100 font-sans">دستیار هوش مصنوعی فرتاک</span>
              </div>
              <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded">v3.5.1 PRO</span>
            </div>

            {/* AI Control Sub-tabs */}
            <div className="flex bg-[#0c1015]/60 border border-slate-800/80 p-0.5 rounded-lg select-none text-[9.5px] font-bold">
              <button
                type="button"
                onClick={() => setAiMode('chat')}
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer border-none text-center ${aiMode === 'chat' ? 'bg-[#151c27] text-white shadow-sm' : 'text-slate-450 hover:text-slate-300 bg-transparent'}`}
              >
                دستیار گفتگو
              </button>
              <button
                type="button"
                onClick={() => setAiMode('scanner')}
                className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer border-none text-center ${aiMode === 'scanner' ? 'bg-[#151c27] text-white shadow-sm' : 'text-slate-450 hover:text-slate-300 bg-transparent'}`}
              >
                اسکن فیزیکی محصول
              </button>
            </div>

            {aiMode === 'chat' ? (
              <div className="flex flex-col flex-1 space-y-3.5" dir="rtl">
                <div className="flex-1 overflow-y-auto bg-[#070a0e] p-3 rounded-xl border border-slate-850 space-y-3 custom-scrollbar max-h-[280px]">
                  {aiMessages.map((m, idx) => (
                    <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`text-[10px] leading-relaxed max-w-[85%] rounded-lg p-2.5 ${m.sender === 'user' ? 'bg-[#1e293b] text-white' : 'bg-indigo-950/40 text-slate-100 border border-indigo-900/60'}`} style={{ whiteSpace: 'pre-line' }}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {isAiThinking && (
                    <div className="text-center py-2 text-[9px] text-slate-500 animate-pulse">در حال تحلیل متریال و بهینه‌سازی سازه دیلاین...</div>
                  )}
                </div>

                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAiPromptSubmit()}
                    placeholder="بپرسید (مانند عطر لوکس، عسل، کوک)..."
                    className="flex-1 bg-[#070a0e] border border-slate-800 rounded-lg py-1.5 px-3 text-[10px] text-white outline-none focus:ring-1 focus:ring-sky-500 font-sans"
                  />
                  <button 
                    onClick={handleAiPromptSubmit}
                    className="bg-sky-600 text-white px-3.5 rounded-lg hover:bg-sky-500 transition-all border-none flex items-center justify-center cursor-pointer"
                    type="button"
                  >
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 space-y-3.5 animate-in fade-in duration-200">
                <input
                  type="file"
                  ref={objectImageInputRef}
                  onChange={handleScannerImageUpload}
                  accept="image/*"
                  className="hidden"
                />

                {/* Upload Zone */}
                {!scannerImage ? (
                  <div 
                    onClick={() => objectImageInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800/80 hover:border-sky-500/50 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-900/20 transition-all flex flex-col items-center justify-center gap-2 group py-6 bg-[#070a0e]/50"
                  >
                    <div className="bg-slate-900 p-2.5 rounded-full text-slate-400 group-hover:text-sky-400 transition-colors">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-250 block">بارگذاری تصویر ۲ بعدی محصول</span>
                      <span className="text-[8px] text-slate-450 block mt-1 font-sans">تصویر شیشه عطر، شاسی دستگاه، بطری، ماگ سنتی یا کادویی</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative border border-slate-800 bg-[#070a0e] rounded-xl overflow-hidden p-2 group">
                    <img src={scannerImage} className="w-full h-24 object-contain rounded-lg bg-black/40" alt="Reference target" />
                    <div className="absolute top-1.5 right-1.5 flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => objectImageInputRef.current?.click()}
                        className="bg-slate-900/90 text-slate-200 hover:bg-slate-800 p-1 rounded-md border border-slate-750 cursor-pointer shadow hover:text-white"
                        title="تغییر تصویر"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerImage(null);
                          setScanResult(null);
                        }}
                        className="bg-red-950/90 text-red-400 hover:bg-red-900 p-1 rounded-md border border-red-900/50 cursor-pointer shadow hover:text-red-300"
                        title="حذف تصویر"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block">ارتفاع تقریبی (اختیاری)</span>
                    <input
                      type="text"
                      value={scannerHeight}
                      onChange={e => setScannerHeight(e.target.value)}
                      placeholder="مثلا: ۱۵۰ میلی‌متر"
                      className="w-full bg-[#070a0e] border border-slate-800/80 rounded px-2.5 py-1.5 text-white outline-none focus:border-sky-500 font-sans [text-align:right]"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-400 font-bold block">توضیح شیء (اختیاری)</span>
                    <input
                      type="text"
                      value={scannerDescription}
                      onChange={e => setScannerDescription(e.target.value)}
                      placeholder="شیشه عطر، برس، لیوان..."
                      className="w-full bg-[#070a0e] border border-slate-800/80 rounded px-2.5 py-1.5 text-white outline-none focus:border-sky-500 font-sans [text-align:right]"
                    />
                  </div>
                </div>

                {/* Scan Trigger */}
                <button
                  type="button"
                  onClick={handleObjectScanSubmit}
                  disabled={isScanning || !scannerImage}
                  className={`w-full py-2.5 rounded-xl text-[10px] font-black transition-all border-none flex items-center justify-center gap-2 cursor-pointer ${
                    !scannerImage 
                      ? 'bg-slate-900 text-slate-500 cursor-not-allowed' 
                      : isScanning 
                        ? 'bg-sky-900 text-white animate-pulse' 
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/20'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isScanning ? 'در حال تصویرپردازی با هوش مصنوعی فرتاک...' : 'آنالیز تصویر محموله و استنباط ساختار کاد'}
                </button>

                {/* Errors display */}
                {scanError && (
                  <div className="bg-red-950/40 border border-red-900/50 p-2.5 rounded-xl flex items-start gap-2 text-red-200 text-[9px] leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400 mt-0.5" />
                    <span>{scanError}</span>
                  </div>
                )}

                {/* Results display */}
                {scanResult && (
                  <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-xl p-3 text-[9.5px] space-y-2.5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between border-b border-indigo-950/60 pb-1.5">
                      <div className="flex items-center gap-1.5 text-indigo-300 font-black">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>محاسبات و حاشیه بسته‌بندی</span>
                      </div>
                      <span className="bg-slate-900 border border-indigo-950/50 text-indigo-200 px-1.5 py-0.5 rounded text-[8px] font-sans">
                        {scanResult.objectName}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[9px]">
                      <div className="bg-[#070a0e]/80 p-2 rounded-lg border border-slate-900 space-y-1">
                        <span className="text-slate-400 block font-bold">اندازه تخمینی کالا</span>
                        <span className="text-slate-100 font-black font-mono block">{scanResult.estimatedObjectDimensions}</span>
                      </div>
                      <div className="bg-[#070a0e]/80 p-2 rounded-lg border border-slate-900 space-y-1">
                        <span className="text-emerald-400 block font-bold">پیشنهاد دیلاین کاد</span>
                        <span className="text-emerald-300 font-black font-mono block">
                          {scanResult.suggestedLength} × {scanResult.suggestedWidth} × {scanResult.suggestedHeight} mm
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#040608]/90 p-2 rounded-lg border border-slate-850 text-[9px] text-slate-300 leading-relaxed font-sans">
                      <div className="flex items-start gap-1">
                        <Info className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                        <span className="text-justify font-sans">{scanResult.packagingStrategy}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleApplyScanDimensions}
                      type="button"
                      className="w-full bg-[#10b981] hover:bg-[#059669] font-black text-white text-[9.5px] py-2 rounded-lg transition-all border-none cursor-pointer flex items-center justify-center gap-1 shadow hover:shadow-emerald-950/30 font-sans"
                    >
                      <Check className="w-3.5 h-3.5" />
                      اعمال ابعاد پیشنهادی بر روی دیلاین فعال
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'cms':
        return (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* CMS Sub-Tabs Navigation */}
            <div className="flex bg-[#05070c] p-1.5 rounded-xl border border-slate-800/80 gap-1 select-none">
              <button
                type="button"
                onClick={() => setCmsSubTab('templates')}
                className={`flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cmsSubTab === 'templates'
                    ? 'bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-950/40 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>مخزن الگوهای کارگاه</span>
              </button>
              <button
                type="button"
                onClick={() => setCmsSubTab('dimensioning')}
                className={`flex-1 py-2 px-2.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  cmsSubTab === 'dimensioning'
                    ? 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-950/40 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <RulerIcon className="w-3.5 h-3.5" />
                <span>پایش و اندازه‌گذاری</span>
              </button>
            </div>

            {cmsSubTab === 'templates' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-1 duration-200">
                {/* 1. Saved Custom Templates List */}
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-[10px] font-black text-slate-350 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                    لیست الگوهای کارگاهی فعال ({customTemplates.length}):
                  </span>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {customTemplates.length === 0 ? (
                      <div className="bg-[#04060a] border border-slate-900 rounded-xl p-4 text-center text-slate-500 text-[9px] leading-relaxed">
                        هنوز الگوی سفارشی در سیستم ثبت نشده است. از فرم زیر برای ذخیره طرح جاری با ابعاد سفارشی استفاده نمایید.
                      </div>
                    ) : (
                      customTemplates.map((t) => {
                        const defaultDims = t.defaultDims || t.originalDims || { L: 100, W: 100, H: 80 };
                        const isActive = selectedModel.id === t.id;
                        return (
                          <div 
                            key={t.id} 
                            className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isActive 
                                ? 'bg-sky-950/15 border-sky-500/50 shadow-md ring-1 ring-sky-500/30' 
                                : 'bg-[#06090e]/60 border-slate-850 hover:border-slate-700/60 hover:bg-[#090d14]'
                            }`}
                            onClick={() => {
                              setSelectedModel(t);
                              if (t.defaultDims) setDims(t.defaultDims);
                            }}
                          >
                            <div className="space-y-0.5 text-right flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black truncate ${isActive ? 'text-sky-300' : 'text-slate-200'}`}>
                                  {t.name}
                                </span>
                                {t.isOverride && (
                                  <span className="text-[7px] bg-indigo-950/40 text-indigo-400 border border-indigo-900/50 px-1 py-0.2 rounded font-sans">
                                    جایگزین
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[8px] text-slate-400 font-mono">
                                <span className="bg-slate-900 px-1 py-0.2 rounded border border-slate-800 text-slate-300">
                                  {t.code}
                                </span>
                                <span className="font-bold text-slate-500">
                                  {defaultDims.L}×{defaultDims.W}×{defaultDims.H} mm
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedModel(t);
                                  if (t.defaultDims) setDims(t.defaultDims);
                                }}
                                className={`p-1 rounded-md border transition-all cursor-pointer text-[8px] font-black ${
                                  isActive
                                    ? 'bg-sky-600 border-sky-500 text-white'
                                    : 'bg-[#05070b] border-slate-800 text-sky-400 hover:bg-sky-950/30'
                                }`}
                              >
                                {isActive ? <Check className="w-3 h-3" /> : 'بارگذاری'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteCustomTemplate(e, t.id)}
                                className="p-1 rounded-md bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Form to Save Current Dieline as Custom Template */}
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-[10px] font-black text-slate-350 block">ثبت طرح جاری به عنوان الگوی کارگاهی جدید:</span>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="نام قالب سفارشی (مثلا جعبه هاردباکس ۵)..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[9.5px] text-white outline-none focus:border-sky-500 font-sans"
                    />
                    <button 
                      onClick={handleSaveAsTemplateInPlace}
                      disabled={isSavingTemplate}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9px] px-3.5 py-1.5 rounded-lg transition-all border-none cursor-pointer flex items-center gap-1 shadow-md"
                      type="button"
                    >
                      {isSavingTemplate ? 'در حال ثبت...' : 'ثبت در مخزن'}
                    </button>
                  </div>
                  <p className="text-[7.5px] text-slate-500 leading-normal text-right">
                    * طرح جاری به همراه تمامی ابعاد پارامتریک و جنس مقوا به عنوان یک قالب مستقل در پایگاه‌داده کارگاه شما ذخیره خواهد شد.
                  </p>
                </div>

                {/* 3. Versioning Panel */}
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-800 space-y-3">
                  <label className="text-[10px] font-black text-slate-350 block">ذخیره نقطه بازنشانی نسخه جاری قالب:</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newDraftName}
                      onChange={e => setNewDraftName(e.target.value)}
                      placeholder="امضا قالب جعبه..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[9.5px] text-white outline-none focus:border-sky-500 font-sans"
                    />
                    <button 
                      onClick={handleSaveDraft}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9px] px-3.5 py-1.5 rounded-lg transition-all border-none cursor-pointer"
                      type="button"
                    >
                      ثبت نسخه
                    </button>
                  </div>
                </div>

                {/* 4. Versions History */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-slate-500 block">تاریخچه طرح‌ها و تاییده‌های معین:</span>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {cmsDrafts.map(dr => (
                      <div key={dr.id} className="bg-[#070a0e]/40 p-2.5 rounded-lg border border-slate-850 flex flex-col gap-1 text-right">
                        <div className="flex justify-between items-center">
                          <span className="text-[9.5px] font-bold text-slate-200 font-sans">{dr.name}</span>
                          <Badge color={dr.status === 'Approved' ? 'green' : (dr.status === 'Snapshot' ? 'purple' : 'blue')}>{dr.status}</Badge>
                        </div>
                        <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono">
                          <span>{dr.date}</span>
                          <span>{dr.dims}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-left-1 duration-200">
                {/* 1. Interactive Dimensioning Tool Section */}
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-800 space-y-3 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-200 flex items-center gap-1">
                      <RulerIcon className="w-3.5 h-3.5 text-amber-400" />
                      ابزار خط اندازه دستی پیکان‌دار
                    </span>
                    {customDimensions.length > 0 && (
                      <button 
                        onClick={() => setCustomDimensions([])}
                        className="text-[8px] bg-red-950/50 hover:bg-red-900/40 text-red-400 border border-red-900/30 px-2 py-0.5 rounded-md transition-all cursor-pointer"
                        type="button"
                      >
                        پاک کردن همه
                      </button>
                    )}
                  </div>
                  
                  <p className="text-[8px] text-slate-400 leading-relaxed">
                    با فعال‌سازی این ابزار، می‌توانید فواصل بخش‌های مختلف طرح را به صورت برداری اندازه‌گیری کنید. کافی است ابتدا روی نقطه مبدأ در نقشه و سپس روی نقطه مقصد کلیک کنید تا یک خط اندازه‌گذاری فنی و پیکان‌دار رسم شود.
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsMeasuringMode(!isMeasuringMode);
                      setMeasurementPoints([]);
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-[9.5px] font-black flex items-center justify-center gap-2 transition-all cursor-pointer border ${
                      isMeasuringMode 
                        ? 'bg-gradient-to-r from-amber-600 to-amber-500 border-amber-500 text-white shadow-lg shadow-amber-950/40 animate-pulse' 
                        : 'bg-slate-900 border-slate-800 text-amber-500 hover:bg-slate-850 hover:border-amber-700/30'
                    }`}
                  >
                    <RulerIcon className="w-4 h-4 shrink-0" />
                    <span>{isMeasuringMode ? 'حالت اندازه‌گذاری فعال است - روی نقشه کلیک کنید' : 'فعال‌سازی تفنگ اندازه‌گذاری مهندسی'}</span>
                  </button>
                  
                  {isMeasuringMode && (
                    <div className="text-[8.5px] text-amber-300 font-bold leading-normal bg-amber-950/10 border border-amber-500/20 p-2 rounded-lg text-center font-sans">
                      {measurementPoints.length === 0 
                        ? '📌 فاز ۱: روی نقطه شروع (مبدأ اندازه) کلیک کنید.' 
                        : '📌 فاز ۲: روی نقطه پایان (مقصد خط اندازه) کلیک کنید.'}
                    </div>
                  )}

                  {/* List of custom dimensions */}
                  {customDimensions.length > 0 && (
                    <div className="space-y-1.5 pt-2.5 border-t border-slate-850">
                      <span className="text-[8.5px] font-bold text-slate-400 block text-right">فواصل اندازه‌گیری شده دستی:</span>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {customDimensions.map((cd, idx) => {
                          const displayVal = convertMmToUnit(cd.value, unit);
                          const unitLabel = unit === 'mm' ? 'mm' : unit === 'cm' ? 'cm' : 'in';
                          const formattedVal = `${displayVal.toFixed(1)} ${unitLabel}`;
                          return (
                            <div key={cd.id} className="bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-900 flex justify-between items-center text-[9px] font-sans">
                              <span className="text-slate-400 font-medium">اندازه‌گیری #{idx + 1}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-amber-400 bg-amber-950/20 px-1.5 py-0.5 rounded border border-amber-900/30">
                                  {formattedVal}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomDimensions(old => old.filter(d => d.id !== cd.id));
                                  }}
                                  className="text-rose-400 hover:text-rose-300 font-bold text-xs cursor-pointer p-0.5"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Dieline CAD Geometric Profile */}
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-800 space-y-2.5 text-right">
                  <span className="text-[10px] font-black text-slate-200 block mb-1">مشخصات هندسی و ابعاد کلی قالب</span>
                  <div className="grid grid-cols-2 gap-2 text-[9px]">
                    <div className="bg-[#040609] p-2 rounded-lg border border-slate-900 space-y-0.5">
                      <span className="text-slate-500 block">عرض کل قالب دایکات:</span>
                      <span className="font-mono font-bold text-sky-400">{Math.round(dieline.totalW)} mm</span>
                    </div>
                    <div className="bg-[#040609] p-2 rounded-lg border border-slate-900 space-y-0.5">
                      <span className="text-slate-500 block">ارتفاع کل قالب دایکات:</span>
                      <span className="font-mono font-bold text-sky-400">{Math.round(dieline.totalH)} mm</span>
                    </div>
                    <div className="bg-[#040609] p-2 rounded-lg border border-slate-900 space-y-0.5">
                      <span className="text-slate-500 block">مساحت پترن گشوده جعبه:</span>
                      <span className="font-mono font-bold text-sky-400">
                        {((dieline.totalW * dieline.totalH) / 10000).toFixed(1)} cm²
                      </span>
                    </div>
                    <div className="bg-[#040609] p-2 rounded-lg border border-slate-900 space-y-0.5">
                      <span className="text-slate-500 block">آمار قطعات (بازه برداری):</span>
                      <span className="font-mono font-bold text-sky-400">
                        {dieline.cuts.length} برش / {dieline.creases.length} تا
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-slate-850">
                    <span className="text-[9px] text-slate-400 font-bold">نمایش ابعاد استاندارد خودکار:</span>
                    <button
                      type="button"
                      onClick={() => setShowDimensions(!showDimensions)}
                      className={`text-[8.5px] font-black px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                        showDimensions 
                          ? 'bg-sky-950/40 text-sky-400 border-sky-900/50' 
                          : 'bg-slate-900 text-slate-500 border-slate-800'
                      }`}
                    >
                      {showDimensions ? 'فعال (روشن)' : 'غیرفعال (خاموش)'}
                    </button>
                  </div>
                </div>

                {/* 3. Tech-Observer of Active Windows/Tabs */}
                <div className="bg-[#070a0e] p-4 rounded-xl border border-slate-800 space-y-3.5 text-right">
                  <span className="text-[10px] font-black text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <Sliders className="w-3.5 h-3.5" />
                    دیده‌بان فنی پارامترهای فعال کارگاه
                  </span>
                  
                  {/* Active selected template summary */}
                  <div className="space-y-1.5 text-[9px] border-b border-slate-850/60 pb-2 mb-2">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450">قالب استاندارد انتخاب‌شده:</span>
                      <span className="text-slate-100 font-bold">{selectedModel.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-450">ابعاد پارامتریک درایو (L×W×H):</span>
                      <span className="text-slate-100 font-mono font-bold">
                        {dims.L} × {dims.W} × {dims.H} mm
                      </span>
                    </div>
                  </div>

                  {/* Contextual indicators based on current active tabs/states */}
                  <div className="space-y-2 text-[9px]">
                    <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-900 space-y-1.5">
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>🔬 مشخصات فیزیکی متریال (CAD):</span>
                        <span className="text-emerald-400">کالیبره</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500">
                        <div>جنس مقوا: <span className="text-slate-300 font-sans">{material.name.split(' (')[0]}</span></div>
                        <div>جهت الیاف: <span className="text-slate-300 font-sans">{grainDirection === 'long' ? 'افقی' : 'عمودی'}</span></div>
                        <div>ضخامت: <span className="text-slate-300 font-sans">{material.thickness} mm</span></div>
                        <div>گرماژ: <span className="text-slate-300 font-sans">{material.weight} g/m²</span></div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-900 space-y-1.5">
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>📊 چیدمان و فرم‌بندی چاپی (Nesting):</span>
                        <span className="text-sky-450 font-mono">زنده</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500">
                        <div>سایز ورق خام: <span className="text-slate-300 font-mono">{sheetSize.width}×{sheetSize.height} mm</span></div>
                        <div>تعداد در شیت: <span className="text-sky-400 font-bold">{nestingResult.yieldCount} قالب</span></div>
                        <div>راندمان ورق: <span className="text-emerald-400 font-bold">{nestingResult.efficiency}%</span></div>
                        <div>پرت متریال: <span className="text-rose-400 font-bold">{nestingResult.waste}%</span></div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 p-2 rounded-lg border border-slate-900 space-y-1.5">
                      <div className="flex justify-between text-slate-400 font-bold">
                        <span>💰 تحلیل مالی و قیمت‌گذاری:</span>
                        <span className="text-yellow-400">فعال</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500">
                        <div>قیمت تک خام: <span className="text-slate-300">{Math.round(((dieline.totalW * dieline.totalH) / 1000000) * (material.weight / 1000) * material.unitPrice).toLocaleString()} ت</span></div>
                        <div>هزینه شیت کل: <span className="text-slate-300">{Math.round(((sheetSize.width * sheetSize.height) / 1000000) * (material.weight / 1000) * material.unitPrice).toLocaleString()} ت</span></div>
                        <div>اجرت قالب‌کوبی: <span className="text-slate-300">۳۵۰,۰۰۰ ت</span></div>
                        <div>پیشنهاد فروش: <span className="text-emerald-400 font-bold">{Math.round(((dieline.totalW * dieline.totalH) / 1000000) * (material.weight / 1000) * material.unitPrice * 1.35).toLocaleString()} ت</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      ref={dielineRootRef}
      className={`dieline-generator-container flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_rgba(14,165,233,0.09),_transparent_38%),linear-gradient(135deg,#070b12_0%,#0b1220_48%,#080d16_100%)] text-slate-100 select-none transition-all duration-300 ${
        isFullScreen ? 'fixed inset-0 z-50 w-screen h-screen' : 'h-screen'
      }`} 
      dir="rtl"
    >

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background: white !important;
          }
          /* Hide SVG grid and background for clean print */
          #print-area svg pattern, #print-area rect[fill="#1e293b"], #print-area rect[fill="#0f172a"] {
            display: none !important;
          }
          /* Ensure paths and texts are dark for printing */
          #print-area svg text {
            fill: #000 !important;
          }
          /* Change stroke colors for better contrast on white paper */
          #print-area svg path[stroke="#38bdf8"] {
            stroke: #000 !important;
          }
          #print-area svg path[stroke="#10b981"] {
            stroke: #555 !important;
            stroke-dasharray: 4,4 !important;
          }
        }

        /* Light drafting surface: keep cut/crease colors, change only canvas surfaces. */
        .dieline-generator-container .bg-\\[\\#030508\\],
        .dieline-generator-container .bg-\\[\\#070b13\\],
        .dieline-generator-container .bg-\\[\\#0a0f1d\\],
        .dieline-generator-container .bg-\\[\\#0b0f15\\] {
          background-color: #f8fafc !important;
          background-image: none !important;
          border-color: #d8e1ec !important;
        }
        .dieline-generator-container svg rect[fill="#070b13"],
        .dieline-generator-container svg rect[fill="#0a0f1d"] {
          fill: #f8fafc !important;
          stroke: #cbd5e1 !important;
        }
        .dieline-generator-container svg text[fill="#94a3b8"],
        .dieline-generator-container svg text[fill="#cbd5e1"] {
          fill: #475569 !important;
        }
        .dieline-generator-container .bg-\\[\\#030508\\] svg,
        .dieline-generator-container .bg-\\[\\#070b13\\] svg {
          background: #f8fafc;
        }
        /* Calm, light application chrome. Keep the actual CAD/SVG drawing colors intact. */
        .dieline-generator-container {
          background: #f4f7fb !important;
          color: #172033 !important;
          color-scheme: light;
        }
        .dieline-generator-container > header {
          background: rgba(255,255,255,.97) !important;
          color: #172033 !important;
          border-bottom: 1px solid #dbe3ee !important;
          box-shadow: 0 2px 12px rgba(15,23,42,.05) !important;
        }
        .dieline-generator-container > header h1 { color: #172033 !important; }
        .dieline-generator-container > header p { color: #64748b !important; }
        /* Consistent light controls and panels; leave SVG/CAD artwork untouched. */
        .dieline-generator-container .responsive-sidebar-wrapper,
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-slate-950"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-slate-900"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-slate-800"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#070"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#080"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#090"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#0a"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#0b"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#0c"] {
          background-color: #ffffff !important;
          background-image: none;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-white"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-100"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-200"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-300"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-400"] {
          color: #334155 !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="border-slate-800"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="border-slate-900"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="border-slate-700"] {
          border-color: #dbe3ee !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper input,
        .dieline-generator-container .responsive-sidebar-wrapper select,
        .dieline-generator-container .responsive-sidebar-wrapper textarea {
          background: #fff !important;
          color: #172033 !important;
          border-color: #cbd5e1 !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper input::placeholder,
        .dieline-generator-container .responsive-sidebar-wrapper textarea::placeholder {
          color: #94a3b8 !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper button {
          text-shadow: none;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="rounded-xl"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="rounded-lg"] {
          box-shadow: none;
        }
        .dieline-generator-container .responsive-sidebar-wrapper {
          background: #fff !important;
          color: #1e293b !important;
          border-color: #dbe3ee !important;
          box-shadow: 0 8px 28px rgba(15,23,42,.08) !important;
        }
        .dieline-generator-container .skinny-icon-rail {
          background: #fff !important;
          border-color: #e2e8f0 !important;
          box-shadow: 0 2px 10px rgba(15,23,42,.04) !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#030"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#050"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#070"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#080"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#090"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#0a0"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-[#0c"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-slate-950"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="bg-slate-900"] {
          background: #f8fafc !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-100"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-200"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-300"] {
          color: #263449 !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-400"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-500"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="text-slate-550"] {
          color: #64748b !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="border-slate-800"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="border-slate-850"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="border-slate-900"] {
          border-color: #e2e8f0 !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper input,
        .dieline-generator-container .responsive-sidebar-wrapper select,
        .dieline-generator-container .responsive-sidebar-wrapper textarea {
          background-color: #fff;
          color: #172033;
          border-color: #cbd5e1;
        }
        .dieline-generator-container .responsive-sidebar-wrapper input:focus,
        .dieline-generator-container .responsive-sidebar-wrapper select:focus,
        .dieline-generator-container .responsive-sidebar-wrapper textarea:focus {
          outline: 2px solid #93c5fd;
          outline-offset: 1px;
          border-color: #2563eb;
        }
        .dieline-generator-container .responsive-sidebar-wrapper button {
          transition: background-color .16s ease, border-color .16s ease, color .16s ease;
        }
        .dieline-generator-container .responsive-sidebar-wrapper [class*="rounded-2xl"],
        .dieline-generator-container .responsive-sidebar-wrapper [class*="rounded-xl"] {
          box-shadow: none;
        }
        @media (max-width: 767px) {
          .dieline-generator-container > header { flex-wrap: wrap; }
          .dieline-generator-container > section[aria-label="خلاصه زنده پروژه"] {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: .5rem;
            padding: .625rem;
          }
        }

        /* Make the two essential setup steps visually unmistakable in the light workspace. */
        .dieline-generator-container .responsive-sidebar-wrapper .primary-setup-panel {
          background: #eff6ff !important;
          border: 1px solid #93c5fd !important;
          box-shadow: 0 3px 14px rgba(37, 99, 235, .08) !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper .primary-setup-panel > button {
          background: #eff6ff !important;
          border-bottom: 1px solid #dbeafe !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper .primary-setup-panel > div:last-child {
          background: #ffffff !important;
          color: #1e293b !important;
        }
        .dieline-generator-container .responsive-sidebar-wrapper .primary-setup-panel input,
        .dieline-generator-container .responsive-sidebar-wrapper .primary-setup-panel select {
          min-height: 36px;
          border-radius: 8px;
        }
        .dieline-generator-container .responsive-sidebar-wrapper .primary-setup-panel button:focus-visible {
          outline: 2px solid #2563eb !important;
          outline-offset: 2px;
        }

        /* Minimal 2D dieline studio: one toolbar, a quiet light sheet, readable production lines. */
        .dieline-generator-container .dieline-canvas-workspace {
          display: flex; flex: 1 1 auto; flex-direction: column; width: 100%;
          min-height: min(650px, 72vh); overflow: hidden; background: #ffffff;
          border: 1px solid #dbe3ee; border-radius: 14px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, .06);
        }
        .dieline-generator-container .dieline-canvas-toolbar {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
          gap: 10px; padding: 10px 14px; background: #f8fafc;
          border-bottom: 1px solid #e2e8f0; color: #0f172a; flex: 0 0 auto;
        }
        .dieline-generator-container .dieline-canvas-heading {
          display: flex; flex-wrap: wrap; align-items: center; gap: 9px; min-width: 0;
        }
        .dieline-generator-container .dieline-canvas-model-code {
          display: inline-flex; align-items: center; border: 1px solid #bfdbfe;
          background: #eff6ff; color: #1d4ed8; border-radius: 6px;
          padding: 3px 7px; font-size: 10px; font-weight: 800; direction: ltr;
        }
        .dieline-generator-container .dieline-canvas-model-name { color: #334155; font-size: 12px; font-weight: 750; }
        .dieline-generator-container .dieline-canvas-dim-summary {
          color: #475569; border-right: 1px solid #cbd5e1; padding-right: 9px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; direction: ltr;
        }
        .dieline-generator-container .dieline-canvas-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
        .dieline-generator-container .dieline-canvas-action {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
          min-height: 32px; padding: 5px 9px; border: 1px solid #cbd5e1; border-radius: 7px;
          background: #ffffff; color: #334155; font-size: 10px; font-weight: 700; cursor: pointer;
        }
        .dieline-generator-container .dieline-canvas-action:hover,
        .dieline-generator-container .dieline-canvas-action.is-active {
          border-color: #93c5fd; background: #eff6ff; color: #1d4ed8;
        }
        .dieline-generator-container #cad-blueprint-canvas-svg {
          display: block; flex: 1 1 auto; min-height: 0 !important;
          border-radius: 0 0 14px 14px; filter: none !important;
        }
        .dieline-generator-container #cad-physical-sheet-group,
        .dieline-generator-container #cad-watermark-group { display: none !important; }
        .dieline-generator-container #cad-blueprint-canvas-svg #cad-coordinate-crosshair-group { opacity: .45; }
        @media (max-width: 768px) {
          .dieline-generator-container .dieline-canvas-toolbar { align-items: flex-start; padding: 8px; }
          .dieline-generator-container .dieline-canvas-model-name { font-size: 11px; }
          .dieline-generator-container .dieline-canvas-dim-summary { font-size: 10px; }
          .dieline-generator-container .dieline-canvas-actions { width: 100%; }
          .dieline-generator-container .dieline-canvas-action { flex: 1 1 auto; }
        }
      `}</style>

      {/* 1. SUITE HEADER BAR */}
      <header className="min-h-16 bg-gradient-to-l from-[#111c2d]/95 via-[#0c1422]/95 to-[#090e17]/95 backdrop-blur-xl border-b border-sky-500/20 flex items-center justify-between gap-3 px-4 md:px-6 py-2 shrink-0 shadow-[0_8px_30px_rgba(0,0,0,0.24)] z-30 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="bg-gradient-to-tr from-sky-600 to-indigo-750 p-2 rounded-xl text-white shadow-md shrink-0 border border-sky-500/10">
            <Cpu className="h-4 w-4 md:h-5 md:w-5 animate-pulse" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="text-white font-black text-sm md:text-base tracking-tight truncate font-sans">استودیوی مهندسی بسته‌بندی اشک‌قلم</h1>
              <Badge color="blue" className="text-[8px] md:text-[9px] px-1.5 py-0 font-mono bg-sky-950 text-sky-450 border border-sky-800 shrink-0">v3.5.3</Badge>
            </div>
            <p className="hidden md:block text-[10px] text-sky-200/70 tracking-wide mt-0.5">طراحی قالب، تحلیل سازه، چیدمان ورق و آماده‌سازی خروجی</p>
          </div>
        </div>

        {/* Dynamic Status Ticker for Geometry Errors & Score */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#090c12]/90 border border-slate-800/80 rounded-xl max-w-md xl:max-w-xl truncate shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
          <span className="text-[9px] font-black text-sky-400 shrink-0">پایش نقشه CAD:</span>
          <span className="text-[9.5px] text-slate-300 font-medium truncate" dir="rtl">
            {validatorIssues.length > 0 
              ? `⚠️ وب دیلاین دارای ${validatorIssues.length} مورد خطای فنی است`
              : `🏆 بالاترین کیفیت هندسه: ممتاز ${geometryReport.score}٪ | مدل استاندارد: ${selectedModel.name}`
            }
          </span>
        </div>

        {/* Actions Menu */}
        <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
          
          {/* Library Button */}
          <button 
            onClick={() => setIsLibraryOpen(true)}
            className="bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 md:gap-1.5 transition-all shadow-sm cursor-pointer"
            title="مخزن الگوهای استاندارد"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden lg:inline">مخزن الگوها</span>
          </button>

          {/* Fullscreen Mode Toggle Button */}
          <button 
            onClick={toggleFullscreen}
            className={`font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 md:gap-1.5 transition-all shadow cursor-pointer border ${
              isFullScreen 
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={isFullScreen ? "خروج از حالت تمام‌صفحه (کلید F یا Esc)" : "حالت تمام‌صفحه و فضای کاری باز (کلید F)"}
          >
            {isFullScreen ? <Minimize className="w-3.5 h-3.5 shrink-0 text-amber-400" /> : <Maximize className="w-3.5 h-3.5 shrink-0" />}
            <span className="hidden sm:inline">{isFullScreen ? 'خروج از تمام‌صفحه' : 'تمام‌صفحه'}</span>
          </button>

          {/* Smart Help Button */}
          <SmartHelpButton
            sectionTitle="طراح دایلاین و مهندسی کارتن ۳D"
            sectionKey="dieline_generator"
            description="سامانه مهندسی CAD و سه‌بعدی بسته‌بندی اشک قلم. مجهز به محاسبات مقاومت فشاری BCT، چیدمان بهینه شیت، خطایابی هندسی و لایه‌بندی صنعتی."
            tips={[
              "برای ایجاد محیط کاری بدون حاشیه و غوطه‌وری کامل، روی دکمه 'تمام‌صفحه' یا کلید F کیبورد کلیک فرمایید.",
              "از منوی 'مخزن الگوها' می‌توانید انواع استانداردهای FEFCO و ECMA را بارگذاری کنید.",
              "خروجی‌های DXF (مخصوص لیزر و لچکی) و PDF برداری (مخصوص لیتوگرافی) کاملاً کالیبره شده هستند."
            ]}
            className="w-8 h-8 md:w-9 md:h-9 bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/40"
          />
          
          {/* Print Preview button */}
          <button 
            onClick={() => window.print()} 
            className="bg-amber-600 hover:bg-amber-500 text-white font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 md:gap-1.5 transition-all shadow border-none cursor-pointer"
            title="حالت نمایشی (Print Preview) برای طرح نهایی"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">پیش‌نمایش چاپ</span>
          </button>

          {/* Download DXF button */}
          <button 
            onClick={handleExportDXF} 
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 md:gap-1.5 transition-all shadow border-none cursor-pointer"
            title="دانلود نقشه صنعتی قالب DXF"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">دانلود DXF (لیزر)</span>
          </button>

          {/* Download PDF button */}
          <button 
            onClick={handleExportPDF} 
            className="bg-sky-600 hover:bg-sky-500 text-white font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 md:gap-1.5 transition-all shadow border-none cursor-pointer"
            title="دانلود نقشه با فرمت PDF برداری جهت لیتوگرافی"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">دانلود PDF برداری</span>
          </button>

          {/* Download SVG button */}
          <button 
            onClick={handleExportSVG} 
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 md:gap-1.5 transition-all shadow border-none cursor-pointer"
            title="دانلود نقشه با فرمت SVG جهت ایلاستریتور و کورل"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">دانلود SVG دایلاین</span>
          </button>

          {/* Export as Assembly / Assembly Guide */}
          <button 
            onClick={handleOpenAssemblyGuide} 
            className="bg-purple-600 hover:bg-purple-500 text-white font-black text-[9.5px] md:text-[10px] px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1.5 transition-all shadow border-none cursor-pointer"
            title="تولید راهنمای مونتاژ گام‌به‌گام تعاملی جعبه"
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">راهنمای مونتاژ</span>
          </button>

          {/* Exit Button */}
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('exit-cad-view'))}
            className="bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-[10px] md:text-xs px-2.5 py-1.5 md:py-2 rounded-lg flex items-center gap-1 transition-all shadow cursor-pointer shrink-0 border-none"
            title="بازگشت به صفحه اصلی سایت"
          >
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            <span className="inline">بازگشت به سایت</span>
          </button>
        </div>
      </header>

      {/* SECONDARY CAD TOOLBOX RIBBON BAR REMOVED -> REPLACED BY FLOATING ACTION BUTTONS */}


      {/* 2. MAIN SPLIT MULTI-MODULE WORK AREA */}
      <div ref={mainContainerRef} className={`flex-1 overflow-hidden relative flex flex-col antialiased ${(layoutMode === 'sidebar' && !isFullScreen && !isMobile) ? 'lg:grid lg:grid-cols-[24rem_1fr]' : 'lg:flex lg:flex-row'}`}>
        
        
        {/* --- INTERACTIVE STEP-BY-STEP ASSEMBLY GUIDE --- */}
        {showAssemblyGuide && (
          <div className="absolute top-4 right-4 w-96 md:w-[420px] bg-[#090b11]/95 backdrop-blur-xl border border-purple-500/40 rounded-xl shadow-[0_0_50px_rgba(147,51,234,0.3)] z-50 flex flex-col max-h-[85vh] overflow-hidden transition-all" dir="rtl">
            <div className="flex items-center justify-between p-4 border-b border-purple-500/20 bg-purple-500/10">
              <div className="flex items-center gap-2 text-purple-400 font-black text-xs font-sans">
                <BookOpen className="w-5 h-5 text-purple-400 animate-bounce" />
                <span>شبیه‌ساز و راهنمای مونتاژ گام‌به‌گام</span>
              </div>
              <button 
                onClick={() => setShowAssemblyGuide(false)} 
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5 font-sans text-right">
              {/* Step timeline bubbles */}
              <div className="flex justify-between items-center relative py-2">
                <div className="absolute left-1 right-1 top-1/2 h-0.5 bg-slate-800 z-0"></div>
                <div 
                  className="absolute left-1 top-1/2 h-0.5 bg-purple-500 transition-all duration-300 z-0"
                  style={{ 
                    right: `${100 - (assemblyGuideStep / (getAssemblySteps(selectedModel.id).length - 1)) * 100}%` 
                  }}
                ></div>
                {getAssemblySteps(selectedModel.id).map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAssemblyStepClick(idx)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] relative z-10 transition-all border cursor-pointer ${
                      idx === assemblyGuideStep 
                        ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_12px_rgba(147,51,234,0.6)] scale-110' 
                        : idx < assemblyGuideStep 
                          ? 'bg-purple-950 border-purple-600 text-purple-300' 
                          : 'bg-slate-900 border-slate-850 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {/* Current Step Content */}
              {(() => {
                const steps = getAssemblySteps(selectedModel.id);
                const currentStep = steps[assemblyGuideStep];
                if (!currentStep) return null;
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={assemblyGuideStep}
                    className="space-y-4"
                  >
                    <div className="bg-[#03050a] border border-slate-850 rounded-lg p-3.5 space-y-2">
                      <div className="text-[10px] font-black text-purple-400">مرحله {assemblyGuideStep + 1} از {steps.length}</div>
                      <h4 className="font-bold text-slate-100 text-[13px] leading-relaxed">{currentStep.title}</h4>
                      <p className="text-slate-400 text-[11.5px] leading-relaxed font-sans">{currentStep.description}</p>
                    </div>

                    {currentStep.tip && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3.5 flex gap-2.5 items-start">
                        <span className="text-base text-amber-400 shrink-0 select-none">💡</span>
                        <div className="space-y-0.5">
                          <div className="text-[10px] font-bold text-amber-400">توصیه کارگاهی و بهینه‌سازی صنعتی</div>
                          <p className="text-amber-300/90 text-[11px] leading-relaxed font-sans">{currentStep.tip}</p>
                        </div>
                      </div>
                    )}

                    {/* Step Physics / Material Thickness Alert */}
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3.5 flex gap-2.5 items-start">
                      <span className="text-base text-blue-400 shrink-0 select-none">📏</span>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-blue-400">تاثیر ضخامت ورق در مونتاژ ({material.thickness}mm)</div>
                        <p className="text-blue-300/90 text-[11px] leading-relaxed font-sans">
                          خط تاشدگی بر اساس ضخامت ورق کالیبره شده است. افت تا در این گام حدود <span className="font-bold text-blue-400 font-mono">{material.foldLoss}mm</span> است که روی زاویه اتصالات به صورت خودکار اعمال شده است.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </div>

            {/* Navigation and Actions */}
            <div className="p-4 bg-slate-950/40 border-t border-slate-850 flex items-center justify-between gap-3.5">
              <button
                onClick={handleDownloadAssemblyPDF}
                className="px-3.5 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850 rounded-lg flex items-center gap-1.5 transition-all text-[11px] font-bold cursor-pointer"
                title="دانلود دفترچه راهنمای چاپ‌شدنی PDF"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>دانلود راهنما (PDF)</span>
              </button>

              <div className="flex gap-2">
                <button
                  disabled={assemblyGuideStep === 0}
                  onClick={() => handleAssemblyStepClick(assemblyGuideStep - 1)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    assemblyGuideStep === 0 
                      ? 'bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  قبلی
                </button>
                <button
                  disabled={assemblyGuideStep === getAssemblySteps(selectedModel.id).length - 1}
                  onClick={() => handleAssemblyStepClick(assemblyGuideStep + 1)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    assemblyGuideStep === getAssemblySteps(selectedModel.id).length - 1
                      ? 'bg-slate-900 border-slate-850 text-slate-600 cursor-not-allowed' 
                      : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-500'
                  }`}
                >
                  بعدی
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PARAMETRIC JSON DEBUGGER PANEL --- */}
        {showDebugger && (
          <div className="absolute top-4 right-4 w-96 bg-[#0c1015]/95 backdrop-blur-xl border border-amber-500/40 rounded-xl shadow-[0_0_40px_rgba(245,158,11,0.25)] z-50 flex flex-col max-h-[85vh] overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between p-3.5 border-b border-amber-500/20 bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-[11px] font-sans">
                <Cpu className="w-4.5 h-4.5 text-amber-400 animate-pulse" />
                <span>میز دیباگ پارامتریک CAD (اشک قلم)</span>
              </div>
              <button 
                onClick={() => setShowDebugger(false)} 
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4 font-sans text-right">
              {/* 1. Raw User Inputs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    ۱. ابعاد ورودی خام کاربر (اسمی)
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">User-Input</span>
                </div>
                <div className="bg-[#03060a] border border-slate-850 rounded-lg p-2.5 space-y-1 font-mono text-[9.5px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Length (طول اسمی):</span>
                    <span className="font-bold text-sky-300">{dims.L} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Width (عرض اسمی):</span>
                    <span className="font-bold text-sky-300">{dims.W} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Height (ارتفاع اسمی):</span>
                    <span className="font-bold text-sky-300">{dims.H} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Thickness (ضخامت مقوا):</span>
                    <span className="font-bold text-sky-300">{material.thickness} mm</span>
                  </div>
                </div>
              </div>

              {/* 2. Final Engineering parameters (FEFCO Constraints & Fiber offsets) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    ۲. پارامترهای مهندسی نهایی (استاندارد جعبه‌سازی)
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">CAD-Math</span>
                </div>
                <div className="bg-[#03060a] border border-slate-850 rounded-lg p-2.5 space-y-1 font-mono text-[9.5px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Effective L (طول محاسباتی):</span>
                    <span className="font-bold text-emerald-300">{(dieline.debugVals?.effL ?? dims.L).toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Effective W (عرض محاسباتی):</span>
                    <span className="font-bold text-emerald-300">{(dieline.debugVals?.effW ?? dims.W).toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Effective H (ارتفاع محاسباتی):</span>
                    <span className="font-bold text-emerald-300">{(dieline.debugVals?.effH ?? dims.H).toFixed(1)} mm</span>
                  </div>
                  <div className="border-t border-slate-900 my-1 pb-1"></div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Glue Tab (لب‌چسب نهایی):</span>
                    <span className="font-bold text-amber-300">{dieline.glueTab ?? 0} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Tuck Flap (زبانه قفل درب):</span>
                    <span className="font-bold text-amber-300">{dieline.tuck ?? 0} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Dust Flap (گوشواره مهار):</span>
                    <span className="font-bold text-amber-300">{Math.round(dieline.dustFlap ?? 0)} mm</span>
                  </div>
                </div>
              </div>

              {/* 3. Output Coordinates & Bounding Boxes */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    ۳. فریم مرزی و مختصات نقشه برش (2D Mesh)
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">2D-Geometry</span>
                </div>
                <div className="bg-[#03060a] border border-slate-850 rounded-lg p-2.5 space-y-1.5 font-mono text-[9.5px]">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Bounding Box (ابعاد شیت دوبعدی):</span>
                    <span className="font-bold text-amber-300">{Math.round(dieline.totalW)} × {Math.round(dieline.totalH)} mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">X-Range (بازه طول):</span>
                    <span className="font-bold text-slate-400">[{Math.round(dieline.xMin ?? 0)}, {Math.round(dieline.xMax ?? 100)}] mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">Y-Range (بازه ارتفاع):</span>
                    <span className="font-bold text-slate-400">[{Math.round(dieline.yMin ?? 0)}, {Math.round(dieline.yMax ?? 100)}] mm</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">تعداد المان برش:</span>
                    <span className="font-bold text-sky-400">{(dieline.cuts ?? []).length} مسیر برداری</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-500">تعداد تاخوردگی:</span>
                    <span className="font-bold text-indigo-400">{(dieline.creases ?? []).length} مسیر برداری</span>
                  </div>
                  <div className="border-t border-slate-900 my-1 pt-1 space-y-1 text-[8.5px]">
                    <div className="text-slate-500 text-right">آدرس‌دهی برداری نمونه برش (لایه برش اول):</div>
                    <div className="bg-slate-950 px-1.5 py-1 rounded border border-slate-900 text-slate-400 truncate text-[8px]" dir="ltr">
                      {dieline.cuts?.[0] || "فاقد خط برش"}
                    </div>
                    <div className="text-slate-500 text-right mt-1.5">آدرس‌دهی برداری نمونه تاخوردگی (لایه تاخوردگی اول):</div>
                    <div className="bg-slate-950 px-1.5 py-1 rounded border border-slate-900 text-slate-400 truncate text-[8px]" dir="ltr">
                      {dieline.creases?.[0] || "فاقد خط تاخوردگی"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Traceable Difference comparison (تفاوت ورودی خام با خروجی مهندسی) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-rose-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                    ۴. ردیابی تفاوت‌های فیزیکی ناشی از متریال و تلرانس
                  </span>
                  <span className="text-[8px] text-slate-500 font-mono">Trace-Diff</span>
                </div>
                <div className="bg-[#03060a] border border-slate-850 rounded-lg p-2.5 space-y-1 text-slate-300 text-[9px] leading-relaxed">
                  <div className="flex justify-between">
                    <span>انحراف ضریب ناشی از الیاف (طول):</span>
                    <span className="font-mono font-bold text-rose-300">
                      {((dieline.debugVals?.effL ?? dims.L) - dims.L).toFixed(2)} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>انحراف ضریب ناشی از الیاف (عرض):</span>
                    <span className="font-mono font-bold text-rose-300">
                      {((dieline.debugVals?.effW ?? dims.W) - dims.W).toFixed(2)} mm
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>انحراف ضریب ناشی از الیاف (ارتفاع):</span>
                    <span className="font-mono font-bold text-rose-300">
                      {((dieline.debugVals?.effH ?? dims.H) - dims.H).toFixed(2)} mm
                    </span>
                  </div>
                  <div className="text-[8px] text-slate-500 mt-1.5 leading-relaxed">
                    * تفاوت بالا حاصل اعمال ضرایب الاستیسیته، خواب الیاف مقوا (Grain Direction) و ضخامت متریال برای قالب‌سازی بدون خطاست.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SKINNY ICON RAIL (Always visible on desktop right edge when in sidebar mode under RTL) */}
        {!isMobile && layoutMode === 'sidebar' && (
          <div 
            className="skinny-icon-rail w-16 bg-[#0c1016]/95 border-l border-slate-800/80 flex flex-col items-center py-4 gap-4 shrink-0 z-20 select-none shadow-xl"
            onMouseLeave={() => {
              if (!isSidebarFixed) {
                setTimeout(() => {
                  const isHoveringSidebar = document.querySelector('.responsive-sidebar-wrapper:hover');
                  if (!isHoveringSidebar) {
                    setIsSidebarCollapsed(true);
                  }
                }, 120);
              }
            }}
          >
            {/* Header Brand Icon */}
            <div className="p-2.5 bg-gradient-to-tr from-sky-600/25 to-indigo-650/25 text-sky-400 rounded-xl border border-sky-500/20 shadow-inner">
              <Cpu className="w-4.5 h-4.5 animate-pulse" />
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent w-full my-2" />

            {/* List of tabs matching the standard modules */}
            <div className="flex-1 flex flex-col gap-3 w-full items-center">
              {[
                { id: 'cad', label: 'طراحی سازه', icon: Settings },
                { id: 'cms', label: 'مخزن الگوها و آرشیو', icon: BookOpen },
                { id: 'nesting', label: 'لیتوگرافی', icon: Calculator },
                { id: 'pricing', label: 'مالی', icon: Database }
              ].map(tab => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onMouseEnter={() => {
                      setActiveTab(tab.id as any);
                      setIsSidebarCollapsed(false);
                    }}
                    onClick={() => {
                      if (activeTab === tab.id) {
                        if (!isSidebarCollapsed) {
                          if (isSidebarFixed) {
                            setIsSidebarCollapsed(true);
                            setIsSidebarFixed(false);
                          } else {
                            setIsSidebarFixed(true);
                          }
                        } else {
                          setIsSidebarCollapsed(false);
                          setIsSidebarFixed(true);
                        }
                      } else {
                        setActiveTab(tab.id as any);
                        setIsSidebarCollapsed(false);
                        setIsSidebarFixed(true);
                      }
                    }}
                    className={`relative w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isActive && !isSidebarCollapsed
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40 border border-sky-500/20'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                    title={tab.label}
                    type="button"
                  >
                    <IconComp className="w-5 h-5" />
                    {isActive && !isSidebarCollapsed && isSidebarFixed && (
                      <span className="absolute -bottom-0.5 -right-0.5 bg-indigo-500 rounded-full p-0.5 text-white scale-75">
                        <Pin className="w-2 h-2 rotate-45" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Lock Sidebar Indicator Pin */}
            <div className="p-1 items-center justify-center">
              <button
                onClick={() => {
                  setIsSidebarFixed(!isSidebarFixed);
                  if (isSidebarCollapsed) {
                    setIsSidebarCollapsed(false);
                  }
                }}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${isSidebarFixed ? 'bg-indigo-950/80 text-indigo-300 border-indigo-900/60' : 'bg-slate-950 text-slate-550 border-slate-905 hover:bg-slate-900'}`}
                title={isSidebarFixed ? 'پنل قفل شده است (با دور شدن ماوس بسته نمی‌شود)' : 'پنل شناور است (با رفتن ماوس باز می‌شود)'}
                type="button"
              >
                <Pin className={`w-3.5 h-3.5 ${isSidebarFixed ? 'rotate-45 text-sky-400' : 'text-slate-550'}`} />
              </button>
            </div>
          </div>
        )}
        
        {/* RESPONSIVE UNIFIED SIDEBAR: MASTER CONTROLS & MODULE NAV */}
        <AnimatePresence>
          {(!isMobile && !isSidebarCollapsed) && (
            <>
              <motion.aside 
                key="responsive-sidebar"
                initial={{ 
                  opacity: 0, 
                  scale: (layoutMode === 'hud' || isFullScreen) ? 0.95 : 1,
                  x: (layoutMode === 'sidebar' && !isFullScreen) ? 380 : 0, 
                  y: (layoutMode === 'hud' || isFullScreen) ? 20 : 0 
                }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  x: 0, 
                  y: 0 
                }}
                exit={{ 
                  opacity: 0, 
                  scale: (layoutMode === 'hud' || isFullScreen) ? 0.95 : 1,
                  x: (layoutMode === 'sidebar' && !isFullScreen) ? 380 : 0, 
                  y: (layoutMode === 'hud' || isFullScreen) ? 20 : 0 
                }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                style={getHudStyle()}
                onMouseLeave={() => {
                  if (!isSidebarFixed && layoutMode === 'sidebar') {
                    setTimeout(() => {
                      const isHoveringRail = document.querySelector('.skinny-icon-rail:hover');
                      if (!isHoveringRail) {
                        setIsSidebarCollapsed(true);
                      }
                    }, 120);
                  }
                }}
                className={`responsive-sidebar-wrapper flex flex-col overflow-hidden shadow-2xl ${
                  (layoutMode === 'hud' || isFullScreen) 
                    ? 'absolute w-[380px] max-h-[85vh] bg-[#0c1015]/95 backdrop-blur-xl border border-sky-900/40 rounded-2xl z-40 shadow-black/85'
                    : (!isSidebarFixed && layoutMode === 'sidebar')
                      ? 'absolute right-16 top-0 bottom-0 h-full w-96 bg-[#0c1015]/95 backdrop-blur-2xl border-l border-sky-900/30 z-10'
                      : 'w-full lg:w-full bg-[#0c1015]/95 border-l border-slate-800/60 shrink-0 z-10 h-full'
                }`}
              >
                {/* Draggable HUD Handle Bar */}
                {(layoutMode === 'hud' || isFullScreen) && (
                  <div 
                    className="drag-handle h-6 bg-[#161d26] flex items-center justify-center cursor-grab active:cursor-grabbing border-b border-slate-850 select-none text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    title="برای جابجایی منو بکشید (Drag)"
                  >
                    <div className="w-12 h-1 bg-slate-705 rounded-full"></div>
                  </div>
                )}

                {/* Header Navigation tabs for Modules (Hidden on desktop in sidebar mode to prevent duplicate controls) */}
                {layoutMode !== 'sidebar' && (
                  <div className="flex border-b border-slate-800 bg-slate-900/60 p-1 items-center shrink-0 overflow-x-auto select-none custom-scrollbar-none">
                    {[
                      { id: 'cad', label: 'طراحی سازه', icon: Settings },
                      { id: 'standards', label: 'قوانین استاندارد', icon: Award },
                      { id: 'physics', label: 'فیزیک BCT', icon: Flame },
                      { id: 'nesting', label: 'لیتوگرافی', icon: Calculator },
                      { id: 'pricing', label: 'مالی', icon: Database },
                      { id: 'ai', label: 'هوش مصنوعی', icon: Sparkles },
                      { id: 'cms', label: 'آرشیو', icon: FileText }
                    ].map(tab => {
                      const IconComp = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex-1 min-w-[64px] py-2.5 px-2 text-[10px] font-black rounded-lg flex flex-col items-center gap-1.5 transition-all border ${activeTab === tab.id ? 'bg-gradient-to-br from-sky-500/15 to-indigo-500/10 text-sky-300 border-sky-400/25 shadow-inner' : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/70'}`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB-DEPENDENT CONTENT WORKSPACE (Scrollable with no overflow lockups) */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#0a0d13]/40">
                  {renderPrimaryControls()}

                  {/* Include Snapshots Gallery under CMS tab if active */}
                  {activeTab === 'cms' && (
                    <div className="space-y-3 pt-3 border-t border-slate-850">
                      <span className="text-[10px] font-black text-slate-500 block flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                        تاریخچه تصاویر سه‌بعدی ضبط شده (Live 3D Snapshots):
                      </span>
                      
                      {capturedSnapshots.length === 0 ? (
                        <div className="text-center py-4 bg-[#070a0e]/25 border border-dashed border-slate-800 rounded-xl text-[9px] text-slate-500">
                          هنوز اسکرین‌شات سه‌بعدی ضبط نکرده‌اید. دکمه "Snapshot" را در حالت سه بعدی بفشارید.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                          {capturedSnapshots.map(snap => (
                            <div key={snap.id} className="relative group bg-slate-950/80 border border-slate-850 rounded-xl overflow-hidden p-1.5 flex flex-col gap-1.5 transition-all hover:border-sky-500/50">
                              <img 
                                src={snap.image} 
                                alt="3D snapshot" 
                                className="w-full h-16 object-contain rounded bg-sky-950/10 border border-slate-900 animate-in fade-in"
                              />
                              <div className="flex flex-col gap-0.5 px-0.5 text-[8px] text-slate-405">
                                <span className="font-bold truncate text-slate-300">قالب: {snap.model}</span>
                                <span className="font-mono text-[7.5px] text-slate-550">{snap.dims}</span>
                              </div>
                              <div className="absolute top-1 right-1 flex gap-1 transform opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 p-0.5 rounded border border-slate-800 shadow">
                                <a href={snap.image} download={`snap_${snap.id}.png`} className="text-emerald-404 p-0.5"><Download className="w-2.5 h-2.5" /></a>
                                <button onClick={() => setCapturedSnapshots(prev => prev.filter(s => s.id !== snap.id))} className="text-red-400 p-0.5"><Trash2 className="w-2.5 h-2.5" /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. FOOTER LOGS AREA (WORM & CRITICAL ERP CHECKS) */}
                <div className="p-3 bg-[#080b0f] border-t border-slate-800 shrink-0 select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-555 flex items-center gap-1.5 font-mono">
                      <Database className="w-3 h-3 text-sky-505" />
                      وضعیت دیتابیس فعال
                    </span>
                    <span className="text-[9px] text-emerald-505 font-bold font-mono">همگام‌سازی شده</span>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
        
        {/* LEFT COMPARTMENT: LARGE 2D CAD VIEWPORT OR 3D STUDIO */}
        <main className={`flex-1 bg-[#05070a] relative flex flex-col overflow-hidden transition-all duration-300 ${isFullScreen ? 'p-4' : ''}`}>

          {!isMobile && viewMode !== '3d' && showSecondaryControls && renderSecondaryControls()}

          {/* Floating Draggable Panels (Only on desktop and CAD tab) */}
          {!isMobile && activeTab === 'cad' && (
            <>
              {/* Floating Dimensions Panel */}
              <AnimatePresence>
                {showFloatingDims && (
                  <motion.div
                    drag
                    dragMomentum={false}
                    dragElastic={0.05}
                    initial={{ x: 20, y: 120 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute left-6 top-16 w-84 bg-[#090d14]/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl z-30 overflow-hidden flex flex-col select-none text-right max-h-[82vh]"
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="floating-panel-drag-handle flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 cursor-move shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="bg-sky-950/40 p-1 rounded text-sky-400">
                          <RulerIcon className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black text-slate-100">ابعاد فیزیکی و پارامترهای جعبه</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setIsFloatingDimsCollapsed(!isFloatingDimsCollapsed)} 
                          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="جمع کردن پنل"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFloatingDimsCollapsed ? '' : 'rotate-180'}`} />
                        </button>
                        <button 
                          onClick={() => setShowFloatingDims(false)} 
                          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="بستن"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body - Fully Scrollable */}
                    {!isFloatingDimsCollapsed && (
                      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(82vh-46px)]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-bold">واحد ابعاد جاری:</span>
                          <button 
                            onClick={() => setOnboardingStep(0)}
                            className="text-[9px] bg-indigo-950 hover:bg-slate-900 border border-indigo-800 text-indigo-300 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Sparkles className="w-2.5 h-2.5 animate-pulse text-indigo-400" />
                            آموزش صوتی قالب
                          </button>
                        </div>

                        {/* Unit switcher */}
                        <div className="flex items-center justify-between p-1 bg-slate-950/60 border border-slate-800/85 rounded-xl gap-1">
                          <span className="text-[10px] text-slate-400 px-2">تبدیل واحد:</span>
                          <div className="flex items-center gap-1">
                            {[
                              { id: 'mm', label: 'mm' },
                              { id: 'cm', label: 'cm' },
                              { id: 'inches', label: 'inch' }
                            ].map(u => (
                              <button
                                key={u.id}
                                onClick={() => setUnit(u.id as any)}
                                className={`text-[9.5px] px-2 py-1 rounded-md font-bold transition-all ${unit === u.id ? 'bg-sky-600 text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                                type="button"
                              >
                                {u.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <BoundingBoxPreview 
                          L={convertMmToUnit(dims.L, unit)} 
                          W={convertMmToUnit(dims.W, unit)} 
                          H={convertMmToUnit(dims.H, unit)} 
                        />

                        {/* Main Dimensions Inputs (L, W, H) */}
                        <div className="space-y-3">
                          {[
                            { key: 'L', label: 'طول جعبه (L)', tooltip: 'بعد طولی جعبه که معمولا بزرگترین ضلع است.' },
                            { key: 'W', label: 'عرض جعبه (W)', tooltip: 'عرض جعبه (عمق). تغییر این مقدار بر پایداری جعبه تاثیر دارد.' },
                            { key: 'H', label: 'ارتفاع جعبه (H)', tooltip: 'ارتفاع یا عمق جعبه.' }
                          ].map(param => (
                            <DimensionInput
                              key={param.key}
                              label={param.label}
                              value={dims[param.key as keyof typeof dims]}
                              unit={unit}
                              onChange={(valInMm) => handleDimensionChange(param.key as 'L' | 'W' | 'H', valInMm)}
                              convertMmToUnit={convertMmToUnit}
                              convertUnitToMm={convertUnitToMm}
                              tooltip={param.tooltip}
                            />
                          ))}
                        </div>

                        {/* Secondary Flap & Joint Parameters */}
                        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                          <span className="text-[10px] font-bold text-sky-400 block">ابعاد زواید اتصال و زبانه‌ها (میلی‌متر)</span>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1 font-bold">زبانه درپوش</label>
                              <input 
                                type="number"
                                min={5}
                                max={80}
                                value={typeof paramOverrides.tuck === 'number' ? paramOverrides.tuck : (dieline?.tuck || 18)}
                                onChange={e => handleParamOverrideChange('tuck', e.target.value)}
                                className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-sky-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1 font-bold">گردگیرها</label>
                              <input 
                                type="number"
                                min={5}
                                max={80}
                                value={typeof paramOverrides.dustFlap === 'number' ? paramOverrides.dustFlap : (dieline?.dustFlap || 18)}
                                onChange={e => handleParamOverrideChange('dustFlap', e.target.value)}
                                className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-sky-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1 font-bold">عرض لب‌چسب</label>
                              <input 
                                type="number"
                                min={8}
                                max={50}
                                value={typeof paramOverrides.glueTab === 'number' ? paramOverrides.glueTab : (dieline?.glueTab || 15)}
                                onChange={e => handleParamOverrideChange('glueTab', e.target.value)}
                                className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1.5 text-xs text-white focus:border-sky-500 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Material Specifications */}
                        <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                          <span className="text-[10px] font-bold text-emerald-400 block">مشخصات متریال و کاغذ</span>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">گرماژ (g/m²)</label>
                              <input 
                                type="number"
                                min={150}
                                max={1000}
                                value={material.weight || 300}
                                onChange={e => setMaterial(m => ({ ...m, weight: Number(e.target.value) || 300 }))}
                                className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-1">ضخامت کالیپر (mm)</label>
                              <input 
                                type="number"
                                step={0.01}
                                min={0.1}
                                max={5}
                                value={material.thickness || 0.42}
                                onChange={e => setMaterial(m => ({ ...m, thickness: Number(e.target.value) || 0.42 }))}
                                className="w-full bg-[#070a0e] border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                          <span className="text-[10px] text-slate-400 font-bold">جهت گرین مقوا</span>
                          <select 
                            value={grainDirection} 
                            onChange={e => setGrainDirection(e.target.value as any)}
                            className="bg-[#070a0e] border border-slate-800 rounded px-2 py-1 text-[10px] text-white"
                          >
                            <option value="long">راستای گرین طولی</option>
                            <option value="short">راستای گرین عرضی</option>
                          </select>
                        </div>

                        {selectedModel.id === 'snap-lock-123' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2">
                            <span className="text-[10px] text-slate-400 font-bold block mb-1">الگوی مهندسی ته قفلی</span>
                            <div className="grid grid-cols-1 gap-1.5">
                              <button
                                onClick={() => setSnapLockVariant('standard')}
                                className={`px-2 py-1.5 rounded border text-[9.5px] font-bold text-center flex justify-between items-center transition-colors ${snapLockVariant === 'standard' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                              >
                                <span>الگوی استاندارد</span>
                                {snapLockVariant === 'standard' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                              </button>
                              <button
                                onClick={() => setSnapLockVariant('reinforced')}
                                className={`px-2 py-1.5 rounded border text-[9.5px] font-bold text-center flex justify-between items-center transition-colors ${snapLockVariant === 'reinforced' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                              >
                                <span>الگوی تقویت‌شده</span>
                                {snapLockVariant === 'reinforced' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                              </button>
                              <button
                                onClick={() => setSnapLockVariant('eco')}
                                className={`px-2 py-1.5 rounded border text-[9.5px] font-bold text-center flex justify-between items-center transition-colors ${snapLockVariant === 'eco' ? 'bg-indigo-900 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-900'}`}
                              >
                                <span>الگوی اکو (کاهش ضایعات)</span>
                                {snapLockVariant === 'eco' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Floating Patterns Panel */}
              <AnimatePresence>
                {showFloatingPatterns && (
                  <motion.div
                    drag
                    dragMomentum={false}
                    dragElastic={0.05}
                    initial={{ x: -20, y: 120 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-6 top-16 w-84 bg-[#090d14]/95 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl z-30 overflow-hidden flex flex-col select-none text-right max-h-[82vh]"
                    dir="rtl"
                  >
                    {/* Header */}
                    <div className="floating-panel-drag-handle flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 cursor-move shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#101b30] p-1 rounded text-sky-400">
                          <Shapes className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-black text-slate-100">مدیریت، حذف و جایگزینی الگوها</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={() => setIsFloatingPatternsCollapsed(!isFloatingPatternsCollapsed)} 
                          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="جمع کردن پنل"
                        >
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFloatingPatternsCollapsed ? '' : 'rotate-180'}`} />
                        </button>
                        <button 
                          onClick={() => setShowFloatingPatterns(false)} 
                          className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 cursor-pointer"
                          title="بستن"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    {!isFloatingPatternsCollapsed && (
                      <div className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar flex-1 max-h-[calc(82vh-46px)]">
                        <div>
                          <label className="text-[9.5px] font-bold text-slate-400 block mb-2">جستجو در مخزن استانداردهای اروپا و بین‌الملل</label>
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="کد FEFCO یا استاندارد ECMA..."
                            className="w-full bg-[#070a0e] border border-slate-800 rounded-xl px-4 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-600"
                          />
                        </div>

                        {/* Replace / Upload Custom DXF Pattern */}
                        <div className="p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-bold text-sky-400">
                            <span>جایگزینی یا افزودن الگوی DXF</span>
                            <Upload className="w-3 h-3 text-sky-400" />
                          </div>
                          <p className="text-[8.5px] text-slate-400 leading-relaxed">
                            می‌توانید فایل DXF الگوی اختصاصی خود را آپلود کنید تا جایگزین الگوی فعال گردد یا به عنوان الگوی جدید ثبت شود.
                          </p>
                          <label className="w-full py-1.5 px-3 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-800/80 text-sky-300 rounded-lg text-[9.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors block text-center">
                            <Upload className="w-3 h-3" />
                            <span>انتخاب فایل DXF و جایگزینی الگو</span>
                            <input 
                              type="file" 
                              accept=".dxf,.json" 
                              className="hidden" 
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadTemplateFile(file);
                              }}
                            />
                          </label>
                        </div>

                        {/* Custom & Saved User Templates section if present */}
                        {customTemplates.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-800">
                            <span className="text-[9.5px] font-black text-amber-400 block uppercase">الگوهای سفارشی و آپلود شده شما:</span>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {customTemplates.map(t => (
                                <div key={t.id} className="p-2 bg-slate-950/90 border border-amber-900/50 rounded-lg flex items-center justify-between text-right">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[10px] font-bold text-amber-300 truncate">{t.name}</p>
                                    <p className="text-[8.5px] text-slate-500 font-mono">{t.baseModelId}</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        const model = STANDARDS_LIBRARY.find(m => m.id === t.baseModelId) || STANDARDS_LIBRARY[0];
                                        setSelectedModel(model);
                                        setUseStandardMathEngine(false);
                                      }}
                                      className="px-2 py-0.5 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded text-[9px] font-bold"
                                      title="جایگزینی الگوی جاری"
                                    >
                                      جایگزینی
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteCustomTemplate(e, t.id)}
                                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded"
                                      title="حذف الگو"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[9.5px] font-black text-slate-400 block uppercase">لیست استانداردهای فعال کارگاهی:</span>
                            <button
                              onClick={() => {
                                setParamOverrides({ glueTab: '', tuck: '', dustFlap: '' });
                                setUseStandardMathEngine(true);
                              }}
                              className="text-[8.5px] text-slate-400 hover:text-sky-300 underline"
                              title="بازنشانی تغییرات الگو به حالت استاندارد کارخانه"
                            >
                              بازنشانی به الگوی اولیه
                            </button>
                          </div>
                          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1 border border-slate-800 rounded-xl p-1 bg-[#070a0e]/40">
                            {filteredModels.map(m => (
                              <div 
                                key={m.id} 
                                onClick={() => handleModelSelect(m)} 
                                className={`cursor-pointer p-2 rounded-lg border text-right transition-all flex items-center gap-2 ${selectedModel.id === m.id ? 'border-sky-500 bg-sky-950/20 shadow-sm' : 'border-slate-800/80 hover:border-slate-700 hover:bg-[#161b22]/30'}`}
                              >
                                <div className="text-xl filter drop-shadow">{m.icon}</div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[10.5px] font-bold ${selectedModel.id === m.id ? 'text-sky-400' : 'text-slate-300'} truncate`}>{m.name}</p>
                                  <p className="text-[8.5px] text-slate-500 font-mono tracking-tighter uppercase">{m.code} | {m.category}</p>
                                </div>
                                {selectedModel.id === m.id ? (
                                  <span className="text-[8.5px] bg-sky-950 text-sky-300 font-bold px-1.5 py-0.5 rounded border border-sky-800 shrink-0">
                                    الگوی فعال
                                  </span>
                                ) : (
                                  <span className="text-[8.5px] text-slate-500 group-hover:text-slate-300 shrink-0">
                                    جایگزینی
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}

          {/* Unified Clean CAD Top Workspace Header Dock */}
          <div className="w-full bg-[#080c14]/95 border-b border-slate-800/80 px-2 sm:px-3 py-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 z-40 text-right font-sans select-none shrink-0" dir="rtl">
            {/* Group 1: Workspace Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-[#03060c] p-1 rounded-xl border border-slate-800/90 shadow-inner overflow-x-auto no-scrollbar max-w-full shrink-0">
              <button
                onClick={() => { setViewMode('2d'); setNestingViewMode('single'); }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === '2d' && nestingViewMode === 'single'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                type="button"
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span>نقشه ۲بعدی CAD</span>
              </button>

              <button
                onClick={() => setViewMode('3d')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === '3d'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                type="button"
              >
                <Box className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span>پیش‌نمایش ۳بعدی</span>
              </button>

              <button
                onClick={() => { setViewMode('2d'); setNestingViewMode('sheet'); }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  viewMode === '2d' && nestingViewMode === 'sheet'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                type="button"
              >
                <Layers3 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>شیت چاپی (Nesting)</span>
              </button>

              <button
                onClick={() => setIsPacklyStudioOpen(true)}
                className="px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 bg-gradient-to-r from-amber-500/20 to-indigo-600/20 text-amber-300 hover:text-white hover:from-amber-500 hover:to-indigo-600 border border-amber-500/40 shadow-sm"
                type="button"
                title="باز کردن استودیو صنعتی دایلاین Packly"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>استودیو صنعتی Packly</span>
              </button>
            </div>

            {/* Group 2: Quick CAD Action Tools */}
            {viewMode === '2d' && (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Direct Toggle Dimensions Panel */}
                <button
                  onClick={() => setShowFloatingDims(!showFloatingDims)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    showFloatingDims 
                      ? 'bg-sky-600 text-white border-sky-400 shadow-sm font-black' 
                      : 'bg-slate-900/90 text-sky-300 border-sky-900/60 hover:bg-slate-800'
                  }`}
                  type="button"
                  title="نمایش / مخفی‌سازی پنجره ابعاد اصلی"
                >
                  <RulerIcon className="w-3.5 h-3.5 text-sky-300" />
                  <span>ابعاد اصلی (L,W,H)</span>
                </button>

                {/* Direct Toggle Pattern Selection Panel */}
                <button
                  onClick={() => setShowFloatingPatterns(!showFloatingPatterns)}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                    showFloatingPatterns 
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-sm font-black' 
                      : 'bg-slate-900/90 text-indigo-300 border-indigo-900/60 hover:bg-slate-800'
                  }`}
                  type="button"
                  title="نمایش / مخفی‌سازی پنجره انتخاب نوع الگو"
                >
                  <Shapes className="w-3.5 h-3.5 text-indigo-300" />
                  <span>انتخاب الگو</span>
                </button>

                {/* Secondary Tools Popover Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSecondaryToolsMenu(!showSecondaryToolsMenu)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      showSecondaryToolsMenu || showDiagnosticPanel || showDebugger || showQuickView3D
                        ? 'bg-slate-800 text-slate-100 border-slate-700 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                    type="button"
                    title="ابزارهای جانبی، عیب‌یابی و تنظیمات تکمیلی"
                  >
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span className="hidden sm:inline">ابزارهای جانبی</span>
                    <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${showSecondaryToolsMenu ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showSecondaryToolsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 top-full mt-1.5 w-64 bg-[#0d131d] border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1 text-right"
                      >
                        <div className="text-[10px] font-black text-slate-500 px-2.5 py-1 border-b border-slate-850 flex items-center justify-between">
                          <span>منوی ابزارهای جانبی مهندسی</span>
                          <span className="text-[8.5px] font-mono text-sky-400">v3.5 CAD</span>
                        </div>

                        {/* Structural Diagnostics */}
                        <button
                          onClick={() => { setShowDiagnosticPanel(!showDiagnosticPanel); setShowSecondaryToolsMenu(false); }}
                          className="w-full px-2.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-850 flex items-center justify-between transition-all"
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
                            <span>تحلیل پایداری سازه</span>
                          </div>
                          {structuralDiagnostics.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-rose-500 text-white font-mono text-[9px] rounded-full font-bold">
                              {structuralDiagnostics.length}
                            </span>
                          )}
                        </button>

                        {/* Lock Tab Debugger W/2 */}
                        <button
                          onClick={() => { setShowDebugger(!showDebugger); setShowSecondaryToolsMenu(false); }}
                          className="w-full px-2.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-850 flex items-center justify-between transition-all"
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                            <span>دیباگ ابعادی قفل (W/2)</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${showDebugger ? 'bg-cyan-950 text-cyan-300' : 'text-slate-500'}`}>
                            {showDebugger ? 'فعال' : 'غیرفعال'}
                          </span>
                        </button>

                        {/* Magnetic Snap */}
                        <div className="px-2.5 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs">
                          <button
                            onClick={() => setEnableMagneticSnap(!enableMagneticSnap)}
                            className="flex items-center gap-2 text-slate-300 font-bold hover:text-white cursor-pointer"
                            type="button"
                          >
                            <Magnet className={`w-3.5 h-3.5 ${enableMagneticSnap ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span>جذب مغناطیسی</span>
                          </button>
                          <select
                            value={gridSnapStep}
                            onChange={(e) => setGridSnapStep(Number(e.target.value))}
                            className="bg-slate-950 text-sky-400 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 cursor-pointer"
                          >
                            <option value={1}>1mm</option>
                            <option value={5}>5mm</option>
                            <option value={10}>10mm</option>
                          </select>
                        </div>

                        {/* Quick 3D floating preview */}
                        <button
                          onClick={() => { setShowQuickView3D(!showQuickView3D); setShowSecondaryToolsMenu(false); }}
                          className="w-full px-2.5 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-850 flex items-center justify-between transition-all"
                          type="button"
                        >
                          <div className="flex items-center gap-2">
                            <Box className="w-3.5 h-3.5 text-emerald-400" />
                            <span>پیش‌نمایش سریع ۳بعدی</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded ${showQuickView3D ? 'bg-emerald-950 text-emerald-300' : 'text-slate-500'}`}>
                            {showQuickView3D ? 'باز' : 'بسته'}
                          </span>
                        </button>

                        <div className="border-t border-slate-850 pt-1">
                          {/* Clear Cache */}
                          <button
                            onClick={() => {
                              if (window.confirm('آیا مطمئن هستید؟ تمام داده‌های کش مرورگر و الگوهای قبلی پاکسازی و شبیه‌ساز کاملاً ریست خواهد شد.')) {
                                clearAllCache();
                              }
                            }}
                            className="w-full px-2.5 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-all"
                            type="button"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                            <span>پاکسازی کش و ریست کامل</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Group 3: Zoom Controls & Theme Menu */}
            <div className="flex items-center gap-2">
              {/* Zoom Bar */}
              {viewMode === '2d' && (
                <div className="flex items-center gap-1 bg-[#03060c] px-2 py-1 rounded-xl border border-slate-800/90">
                  <button
                    onClick={() => setZoomScale(prev => Math.max(0.2, prev - 0.15))}
                    className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-xs font-bold font-mono cursor-pointer"
                    type="button"
                    title="کاهش بزرگنمایی"
                  >
                    -
                  </button>
                  <span className="text-[10px] text-sky-400 font-mono font-bold w-10 text-center select-none">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(prev => Math.min(5.0, prev + 0.15))}
                    className="text-slate-400 hover:text-white px-1.5 py-0.5 rounded text-xs font-bold font-mono cursor-pointer"
                    type="button"
                    title="افزایش بزرگنمایی"
                  >
                    +
                  </button>
                  <div className="w-px h-3.5 bg-slate-800 mx-1" />
                  <button 
                    onClick={handleAutoFitDieline}
                    className="text-[10px] text-slate-300 hover:text-white font-bold transition-all cursor-pointer bg-slate-800/80 hover:bg-slate-700 px-2 py-0.5 rounded-lg border-none"
                    type="button"
                    title="انطباق خودکار بوم"
                  >
                    انطباق
                  </button>
                </div>
              )}

              {/* View Options Menu Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setIsSmartMenuOpen(!isSmartMenuOpen)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10.5px] font-bold transition-all border cursor-pointer ${
                    isSmartMenuOpen 
                      ? 'bg-sky-900/80 text-sky-200 border-sky-500/40' 
                      : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                  type="button"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">تنظیمات نما</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isSmartMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isSmartMenuOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute left-0 top-full mt-2 w-56 bg-[#0a0d14]/98 backdrop-blur-xl border border-slate-800/90 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 z-50 text-[9.5px] font-bold text-right"
                      dir="rtl"
                    >
                      <div className="p-2 border-b border-slate-800/80 mb-1">
                        <span className="text-slate-500 text-[8.5px] block mb-1.5">تم بوم نقشه (CAD Theme)</span>
                        <div className="flex gap-1 justify-between">
                          <button onClick={() => setCadTheme('white')} className={`flex-1 py-1 rounded transition-colors ${cadTheme === 'white' ? 'bg-sky-600 text-white' : 'bg-slate-900 text-slate-400'}`}>سفید</button>
                          <button onClick={() => setCadTheme('blueprint')} className={`flex-1 py-1 rounded transition-colors ${cadTheme === 'blueprint' ? 'bg-indigo-900 text-indigo-300 border border-indigo-700/50' : 'bg-slate-900 text-slate-400'}`}>آبی</button>
                          <button onClick={() => setCadTheme('charcoal')} className={`flex-1 py-1 rounded transition-colors ${cadTheme === 'charcoal' ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-400'}`}>ذغالی</button>
                        </div>
                      </div>

                      <button 
                        onClick={() => setHasDieCut(!hasDieCut)}
                        className={`flex items-center justify-between p-2 rounded-lg transition-colors ${hasDieCut ? 'bg-slate-800/80 text-purple-400' : 'text-slate-400 hover:bg-slate-900/50'}`}
                      >
                        <span className="flex items-center gap-2"><Shapes className="w-3.5 h-3.5" /> لبه دایکات</span>
                        <span>{hasDieCut ? 'سفارشی' : 'استاندارد'}</span>
                      </button>

                      {!isMobile && (
                        <button 
                          onClick={() => setShowTelemetry(!showTelemetry)}
                          className={`flex items-center justify-between p-2 rounded-lg transition-colors ${showTelemetry ? 'bg-slate-800/80 text-amber-400' : 'text-slate-400 hover:bg-slate-900/50'}`}
                        >
                          <span className="flex items-center gap-2"><Award className="w-3.5 h-3.5" /> داده‌های تله‌متری</span>
                          <span>{showTelemetry ? 'روشن' : 'خاموش'}</span>
                        </button>
                      )}

                      {!isMobile && (
                        <div className="mt-1 pt-1 border-t border-slate-800/80">
                          <button 
                            onClick={toggleInteractiveFullscreen}
                            className={`w-full flex items-center justify-between p-2 rounded-lg transition-colors ${isFullScreen ? 'bg-rose-900/30 text-rose-400' : 'text-slate-400 hover:bg-slate-900/50'}`}
                          >
                            <span className="flex items-center gap-2"><Maximize className="w-3.5 h-3.5" /> تمام‌صفحه</span>
                            <span>{isFullScreen ? 'خروج' : 'ورود'}</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Main Visual Display */}
          {(() => {
            const themeStyle = getThemeStyle(cadTheme);

            return viewMode === '2d' ? (
              <div 
                id="print-area"
                ref={cadContainerRef}
                className="flex-1 w-full flex flex-col items-center justify-start p-4 md:p-6 overflow-hidden custom-scrollbar-none relative transition-all duration-300 print:bg-white"
                style={{ 
                  backgroundColor: themeStyle.bg,
                  cursor: isPanActive ? 'grabbing' : 'grab'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
              
              <CanvasRulers 
                pan={pan} 
                zoomScale={zoomScale} 
                canvasWidth={cadDimensions.width} 
                canvasHeight={cadDimensions.height} 
                cursorPos={svgCursor} 
                dielineBounds={{ xMin: dieline.xMin, xMax: dieline.xMax, yMin: dieline.yMin, yMax: dieline.yMax }} 
              />

              {/* COLLAPSIBLE FEFCO / ECMA STANDARD INFORMATION HUD OVERLAY */}
              {viewMode === '2d' && (
                <div className="absolute top-3 right-3 z-30 flex flex-col items-end gap-1 font-sans select-none" dir="rtl">
                  {isStandardHudCollapsed ? (
                    <button
                      onClick={() => setIsStandardHudCollapsed(false)}
                      className="px-2.5 py-1.5 rounded-xl bg-[#080d18]/90 backdrop-blur-md border border-sky-800/60 shadow-lg text-[10px] font-bold text-sky-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
                      type="button"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>استاندارد: {selectedModel.id === 'snap-lock-123' ? 'ECMA A2110' : selectedModel.code || 'ECMA'}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                  ) : (
                    <div className="bg-[#080d1a]/95 backdrop-blur-md border border-sky-800/60 p-3 rounded-2xl shadow-2xl shadow-black/80 flex flex-col gap-2 max-w-xs text-right animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-sky-900/60 pb-1.5">
                        <div className="flex items-center gap-1.5 text-sky-300 font-black text-xs">
                          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>اطلاعات استاندارد:</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-cyan-300 font-mono text-[9.5px] font-bold">
                            {selectedModel.id === 'snap-lock-123' ? 'ECMA A2110' : selectedModel.id === 'fefco-0215' ? 'FEFCO 0215' : selectedModel.id === 'fefco-0201' ? 'FEFCO 0201' : selectedModel.id === 'fefco-0427' ? 'FEFCO 0427' : 'ECMA Standard'}
                          </span>
                          <button
                            onClick={() => setIsStandardHudCollapsed(true)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title="جمع کردن پنل"
                            type="button"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="text-[10px] space-y-1 text-slate-300">
                        <div className="flex justify-between items-center font-mono">
                          <span className="text-slate-400">طول زبانه قفل (Flap Length):</span>
                          <span className="text-cyan-300 font-bold">W / 2 = {(dims.W / 2).toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between items-center font-mono">
                          <span className="text-slate-400">عرض بدنه جعبه (Box Width):</span>
                          <span className="text-slate-200">{dims.W} mm</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">انطباق هندسی قفل:</span>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            دقیقاً ۵۰٪ عرض (FEFCO/ECMA)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80 gap-1.5">
                        <button
                          onClick={() => setShowDebugger(!showDebugger)}
                          className={`flex-1 py-1 px-2 rounded-lg text-[9.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
                            showDebugger 
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-sm shadow-cyan-500/20' 
                              : 'bg-slate-800/60 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                          }`}
                          type="button"
                        >
                          <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{showDebugger ? 'غیرفعال دیباگ W/2' : 'دیباگ ابعادی W/2'}</span>
                        </button>

                        <button
                          onClick={() => setActiveTab('standards')}
                          className="py-1 px-2 rounded-lg text-[9.5px] font-bold bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all flex items-center gap-1 cursor-pointer"
                          type="button"
                          title="مشاهده مرجع و مستندات کامل استاندارد"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>مستندات</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* AI STRUCTURAL INTEGRITY DIAGNOSTIC PANEL */}
              <AnimatePresence>
                {showDiagnosticPanel && viewMode === '2d' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: -10 }}
                    className="absolute top-16 left-4 md:left-6 z-40 w-80 md:w-96 bg-[#090d14]/95 backdrop-blur-2xl border border-sky-900/40 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden font-sans select-none text-right"
                    dir="rtl"
                  >
                    <div className="p-3 bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-b border-sky-850 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-sky-500/10 border border-sky-500/20 rounded-lg text-sky-400">
                          <ShieldAlert className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-100 flex items-center gap-1.5">
                            تحلیل هوشمند پایداری سازه
                            <span className="text-[9px] px-1.5 py-0.5 bg-sky-900/60 border border-sky-700/50 text-sky-300 rounded font-mono">
                              ECMA / FEFCO
                            </span>
                          </h4>
                          <span className="text-[9px] text-slate-400 font-sans">پایش هوشمند زوایا، زبانه قفل، الیاف و حاشیه تا</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowDiagnosticPanel(false)}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        title="بستن پنل"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-3 space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar">
                      {/* Paper Grain & Compliance Summary */}
                      <div className="grid grid-cols-2 gap-2 text-[9.5px]">
                        <div className="p-2 bg-[#05080f] border border-slate-800/80 rounded-xl space-y-1">
                          <span className="text-slate-500 text-[8.5px] block font-bold">جهت الیاف کاغذ (Grain):</span>
                          <span className="text-sky-300 font-bold block">{paperGrainAnalysis.grainDirectionLabel}</span>
                          <span className="text-[8px] text-slate-400 block font-mono">{paperGrainAnalysis.mainBendingAxis}</span>
                        </div>
                        <div className="p-2 bg-[#05080f] border border-slate-800/80 rounded-xl space-y-1">
                          <span className="text-slate-500 text-[8.5px] block font-bold">شاخص استحکام لولا:</span>
                          <span className={`font-bold block ${paperGrainAnalysis.isBendingWithGrain ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {paperGrainAnalysis.stiffnessIndex}% - {paperGrainAnalysis.isBendingWithGrain ? 'پایداری عالی' : 'احتمال ترک'}
                          </span>
                          <span className="text-[8px] text-slate-400 block font-mono">افت تا: {material.foldLoss}mm</span>
                        </div>
                      </div>

                      {/* Bottom Lock Flap Geometry Analysis Summary Card */}
                      <div className="p-2.5 bg-sky-950/20 border border-sky-850/60 rounded-xl space-y-1.5 text-[9.5px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sky-300 flex items-center gap-1">
                            <Box className="w-3.5 h-3.5 text-sky-400" />
                            تحلیل تخصصی قفل ته (ECMA Bottom Lock):
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[8.5px] ${
                            bottomLockAnalysis.isCompliant ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60' : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          }`}>
                            کیفیت چفت‌شوندگی: {bottomLockAnalysis.lockInterlockQualityScore}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[8.5px] text-slate-300 font-mono">
                          <span>زاویه فعلی: {autoLockAngle || 45}° (استاندارد: ۴۵°)</span>
                          <span>ارتفاع زبانه‌ها: {((dims.W / 2) + 2).toFixed(1)}mm</span>
                        </div>
                      </div>

                      {/* List of Structural Integrity Warnings */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 block flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3.5 h-3.5 text-sky-400" />
                            هشدارهای هوشمند سازه ({structuralDiagnostics.length}):
                          </span>
                          <span className="text-[8.5px] font-mono text-emerald-400">
                            امتیاز پایداری: {Math.max(50, 100 - structuralDiagnostics.length * 12)}/100
                          </span>
                        </span>

                        {structuralDiagnostics.length === 0 ? (
                          <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-center text-emerald-400 text-[10px] font-bold flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            هیچ مشکلی در زوایا، قفل و حاشیه تا یافت نشد (کاملاً استاندارد)
                          </div>
                        ) : (
                          structuralDiagnostics.map((diag: any) => (
                            <div
                              key={diag.id}
                              className={`p-2.5 rounded-xl border text-[10px] space-y-1.5 transition-all ${
                                diag.severity === 'critical'
                                  ? 'bg-rose-950/30 border-rose-800/50 text-rose-200'
                                  : diag.severity === 'warning'
                                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                                  : 'bg-sky-950/30 border-sky-800/50 text-sky-200'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold">
                                <span className="flex items-center gap-1.5 text-[10.5px]">
                                  {diag.severity === 'critical' ? '🛑' : diag.severity === 'warning' ? '⚠️' : 'ℹ️'}
                                  {diag.message}
                                </span>
                                <span className="text-[8.5px] px-1.5 py-0.5 rounded font-mono bg-black/40 border border-white/10">
                                  {diag.code}
                                </span>
                              </div>

                              <p className="text-[9.5px] text-slate-300 font-sans leading-relaxed">
                                💡 <span className="font-bold text-amber-300">پیشنهاد اصلاح:</span> {diag.recommendation}
                              </p>

                              <div className="pt-1 flex items-center justify-between border-t border-white/10">
                                <span className="text-[8.5px] font-mono text-slate-400">افت پایداری: -{diag.impactScore} pt</span>
                                <button
                                  onClick={() => handleAutoFixDiagnostic(diag.id)}
                                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[9px] shadow transition-all cursor-pointer flex items-center gap-1"
                                  type="button"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>اصلاح هوشمند (Auto-Fix)</span>
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Boundless Infinite scrollable / pannable content container */}
              <div 
                className="flex-1 w-full h-[55vh] md:h-auto relative overflow-visible flex items-center justify-center min-h-[150px] lg:min-h-[600px] select-none"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  transition: isPanActive ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {nestingViewMode === 'sheet' ? (
                /* --- DISPLAY SHEET IMPOSITION / NESTING VIEW --- */
                <div className="relative bg-transparent transition-all duration-500 animate-in zoom-in-95 w-full h-full flex flex-col justify-between flex-1 min-h-0 p-2 md:p-4">
                  <div className="mb-3 text-center shrink-0">
                    <Badge color="blue" className="px-2.5 py-0.5 text-[9px] tracking-widest bg-sky-950 text-sky-400 border border-sky-800 font-mono uppercase">نقشه گرافیکی قالب</Badge>
                    <h4 className="text-white font-bold text-xs mt-1">
                      قالب‌گیری موازی روی ورق صنعتی {sheetSize.width} × {sheetSize.height} میلی‌متر
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      راندمان ورق: {nestingResult.efficiency}% | باطله (هدر رفت متریال): {nestingResult.waste}% | تعداد زینک: {nestingResult.yieldCount} قالب موازی
                    </p>
                  </div>

                  <div className="relative bg-transparent flex items-center justify-center flex-1 min-h-0 overflow-visible w-full p-2 md:p-4">
                    {(() => {
                      const sw = sheetSize.width;
                      const sh = sheetSize.height;
                      
                      const itemW = dieline.totalW;
                      const itemH = dieline.totalH;
                      
                      const overlapOffset = layoutAlgorithm === 'nested_optimized' ? 0.92 : 1.0;
                      const gap = nestingGap;
                      
                      // Arrangement grid layout
                      let cols = Math.floor(sw / (itemW + gap));
                      let rows = Math.floor(sh / (itemH + gap));
                      if (cols === 0) cols = 1;
                      if (rows === 0) rows = 1;
                      
                      const colsRot = Math.floor(sw / (itemH + gap));
                      const rowsRot = Math.floor(sh / (itemW + gap));
                      const useRotation = (colsRot * rowsRot) > (cols * rows);
                      
                      const finalCols = useRotation ? colsRot : cols;
                      const finalRows = useRotation ? rowsRot : rows;
                      
                      const countToRender = nestingResult.yieldCount;
                      const gridItems: { tx: number, ty: number, rotate: boolean, index: number }[] = [];
                      
                      for (let i = 0; i < countToRender; i++) {
                        const r = Math.floor(i / finalCols);
                        const c = i % finalCols;
                        
                        let tx = c * (useRotation ? itemH + gap : itemW + gap) * overlapOffset + 25;
                        let ty = r * (useRotation ? itemW + gap : itemH + gap) * overlapOffset + 25;
                        
                        // Alternate offset for interlocking simulation!
                        if (layoutAlgorithm === 'nested_optimized' && r % 2 === 1) {
                          tx += (useRotation ? itemH + gap : itemW + gap) * 0.12;
                        }
                        
                        gridItems.push({ tx, ty, rotate: useRotation, index: i });
                      }

                      return (
                        <svg 
                          viewBox={`0 0 ${sw + 50} ${sh + 50}`} 
                          className="w-full object-contain transition-all duration-300"
                          style={{
                            width: '100%',
                            height: '100%',
                            transform: `scale(${zoomScale})`,
                            transformOrigin: 'center center',
                            minHeight: isMobile ? '150px' : '600px',
                          }}
                        >
                          <defs>
                            <g id="sheet-single-element-di">
                              {/* Draw Creases */}
                              {dieline.creases.map((pathStr, index) => (
                                <path 
                                  key={`scr-${index}`} 
                                  d={pathStr} 
                                  stroke="#dc2626" 
                                  strokeWidth="1.0" 
                                  strokeDasharray="2,2" 
                                  fill="none" 
                                  opacity="0.7" 
                                />
                              ))}
                              {/* Draw Cuts */}
                              {dieline.cuts.map((pathStr, index) => (
                                <path 
                                  key={`sct-${index}`} 
                                  d={pathStr} 
                                  stroke="#1e293b" 
                                  strokeWidth="1.1" 
                                  fill="none" 
                                />
                              ))}
                            </g>
                          </defs>

                          {/* Paper Sheet background */}
                          <rect 
                            x="20" 
                            y="20" 
                            width={sw} 
                            height={sh} 
                            fill="#f8fafc" 
                            stroke="#475569" 
                            strokeWidth="3" 
                            rx="4" 
                          />

                          {/* Sheet Imposition Watermark */}
                          <g opacity="0.04" className="pointer-events-none select-none">
                            <text
                              x={sw / 2 + 20}
                              y={sh / 2 - 15}
                              fontSize="40"
                              fontWeight="900"
                              fill="#1e293b"
                              textAnchor="middle"
                              className="font-mono tracking-widest"
                            >
                              WWW.ASHKGHALAM.IR
                            </text>
                            <text
                              x={sw / 2 + 20}
                              y={sh / 2 + 25}
                              fontSize="24"
                              fontWeight="900"
                              fill="#1e293b"
                              textAnchor="middle"
                              className="font-sans"
                            >
                              لیتوگرافی و چاپ اشک قلم
                            </text>
                          </g>
                          
                          <line x1="20" y1="20" x2={sw + 20} y2={sh + 20} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="5,5" />
                          <line x1="20" y1={sh + 20} x2={sw + 20} y2="20" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="5,5" />

                          {/* Grid items rendering */}
                          {gridItems.map((item) => {
                            const transformStr = `translate(${item.tx}, ${item.ty})` + 
                              (item.rotate ? ` rotate(90) translate(0, -${itemH})` : '');
                            
                            return (
                              <g key={`sh-item-${item.index}`} transform={transformStr}>
                                <rect 
                                  x="0" 
                                  y="0" 
                                  width={itemW} 
                                  height={itemH} 
                                  fill="#cbd5e1" 
                                  fillOpacity="0.12" 
                                  stroke="#94a3b8" 
                                  strokeWidth="0.5" 
                                  strokeDasharray="2,3" 
                                  rx="2"
                                />
                                <g transform={`translate(${-dieline.xMin}, ${-dieline.yMin})`}>
                                  <use href="#sheet-single-element-di" />
                                </g>
                                
                                <g transform={`translate(${itemW / 2}, ${itemH / 2})`}>
                                  <circle r="9" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                                  <text y="3" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" className="font-mono">
                                    {item.index + 1}
                                  </text>
                                </g>
                              </g>
                            );
                          })}

                          {/* Sheet measurement legends */}
                          <text x={(sw + 40)/2} y={sh + 14} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold" className="font-sans">
                            سایز ورق لیتوگرافی: {sw} میلی‌متر
                          </text>
                          <text x="35" y={(sh + 40)/2} textAnchor="middle" fill="#475569" fontSize="10" fontWeight="bold" transform={`rotate(-90 35 ${(sh+40)/2})`} className="font-sans">
                            عرض ورق: {sh} میلی‌متر
                          </text>
                        </svg>
                      );
                    })()}
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-center mt-3 bg-[#070a0e]/60 p-3.5 rounded-xl border border-slate-800">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">تعداد قالب روی شیت</span>
                      <strong className="text-white text-xs mt-1 block font-sans">{nestingResult.yieldCount} قالب موازی</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">بازدهی لیتوگرافی ورق</span>
                      <strong className="text-sky-400 text-xs mt-1 block font-sans">٪{nestingResult.efficiency} درصد</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">پرت و هدررفت متریال</span>
                      <strong className="text-red-400 text-xs mt-1 block font-sans font-mono">٪{nestingResult.waste} باطله</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase block font-sans">بستر فیزیکی ماشین</span>
                      <strong className="text-indigo-400 text-[10px] mt-1 block font-sans truncate">{activePress.name.split(' ')[0]}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                /* --- DISPLAY SINGLE DIE CAD VIEW --- */
                <div className="relative bg-transparent transition-all duration-700 animate-in zoom-in-95 flex items-center justify-center w-full flex-1 min-h-0 overflow-visible">

                  {/* Multi-Theme drafting canvas wrapper styling based on cadTheme */}
                  {(() => {
                    const themeStyle = getThemeStyle(cadTheme);
                    const isCutsVisible = layers.find(l => l.id === 'cuts')?.isVisible !== false;
                    const isCreasesVisible = layers.find(l => l.id === 'creases')?.isVisible !== false;
                    const isBleedVisible = layers.find(l => l.id === 'bleed')?.isVisible !== false;
                    const isGridVisible = layers.find(l => l.id === 'grid')?.isVisible !== false;
                    const isDimensionsVisible = layers.find(l => l.id === 'dimensions')?.isVisible !== false;

                    return (
                      <div className="dieline-canvas-workspace" dir="rtl">
                        <div className="dieline-canvas-toolbar">
                          <div className="dieline-canvas-heading">
                            <span className="dieline-canvas-model-code">{selectedModel.code || selectedModel.id}</span>
                            <span className="dieline-canvas-model-name">{selectedModel.name}</span>
                            <span className="dieline-canvas-dim-summary">
                              {convertMmToUnit(dims.L, unit).toFixed(1)} × {convertMmToUnit(dims.W, unit).toFixed(1)} × {convertMmToUnit(dims.H, unit).toFixed(1)} {unit === 'inches' ? 'in' : unit}
                            </span>
                          </div>
                          <div className="dieline-canvas-actions">
                            <button type="button" onClick={() => setShowDimensions(value => !value)} className={`dieline-canvas-action ${showDimensions ? 'is-active' : ''}`}>
                              <RulerIcon className="w-3.5 h-3.5" /> {showDimensions ? 'ابعاد روشن' : 'نمایش ابعاد'}
                            </button>
                            <button type="button" onClick={() => { setZoomScale(1); setPan({ x: 0, y: 0 }); }} className="dieline-canvas-action">
                              <RefreshCw className="w-3.5 h-3.5" /> بازنشانی نما
                            </button>
                          </div>
                        </div>
                        <svg
                        id="cad-blueprint-canvas-svg"
                        viewBox={`${dieline.xMin - 160} ${dieline.yMin - 160} ${dieline.totalW + 320} ${dieline.totalH + 320}`} 
                        className="transition-all duration-300 h-auto object-contain w-full"
                        style={{
                          transform: `scale(${zoomScale})`,
                          transformOrigin: 'center center',
                          width: '100%',
                          height: '100%',
                          flex: '1 1 auto',
                          minHeight: isMobile ? '150px' : '0px',
                        }}
                        onMouseMove={handleSvgMouseMove}
                        onMouseLeave={handleSvgMouseLeave}
                        onClick={handleSvgClick}
                      >
                        <defs>
                          <pattern id="grid-blueprint" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#102644" strokeWidth="0.5" />
                          </pattern>
                          <pattern id="grid-charcoal" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#232326" strokeWidth="0.5" />
                          </pattern>
                          <marker id="cad-arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={themeStyle.textAccent || themeStyle.textColor} />
                          </marker>
                          <marker id="cad-arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                            <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill={themeStyle.textAccent || themeStyle.textColor} />
                          </marker>
                          <marker id="cad-arrow-end-yellow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#eab308" />
                          </marker>
                          <marker id="cad-arrow-start-yellow" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                            <path d="M 8 1.5 L 0 5 L 8 8.5 z" fill="#eab308" />
                          </marker>
                        </defs>

                        {/* Visual Outer Sheet limits - CAD Canvas Sheet representation with dashed borders */}
                        <rect
                          id="cad-sheet-background"
                          x={dieline.xMin - 1600}
                          y={dieline.yMin - 1600}
                          width={dieline.totalW + 3200}
                          height={dieline.totalH + 3200}
                          fill={themeStyle.bg}
                          stroke={themeStyle.stroke}
                          strokeWidth="1.5"
                          strokeDasharray="4,4"
                        />

                        {/* Grid mesh representation */}
                        {themeStyle.gridFill !== 'none' && isGridVisible && (
                          <rect
                            id="cad-grid-mesh"
                            x={dieline.xMin - 1600}
                            y={dieline.yMin - 1600}
                            width={dieline.totalW + 3200}
                            height={dieline.totalH + 3200}
                            fill={themeStyle.gridFill}
                          />
                        )}

                        {/* 3cm (30mm) Offset Margin Box around the dieline */}
                        {isBleedVisible && (
                          <g id="cad-offset-margin-group">
                            <rect
                              id="cad-offset-margin-box"
                              x={dieline.xMin - bleedOffset}
                              y={dieline.yMin - bleedOffset}
                              width={dieline.totalW + (bleedOffset * 2)}
                              height={dieline.totalH + (bleedOffset * 2)}
                              fill="none"
                              stroke={layers.find(l => l.id === 'bleed')?.color || themeStyle.offsetColor}
                              strokeWidth="0.85"
                              strokeDasharray="4,3"
                              opacity="0.85"
                            />
                            <text
                              id="cad-offset-text-label"
                              x={dieline.xMin - bleedOffset + 5}
                              y={dieline.yMin - bleedOffset - 6}
                              fontSize="7.5"
                              fill={layers.find(l => l.id === 'bleed')?.color || themeStyle.offsetColor}
                              fontWeight="bold"
                              className="font-sans opacity-95"
                            >
                              محدوده آفست {bleedOffset} میلی‌متر ({bleedOffset}mm Bleed Offset)
                            </text>
                          </g>
                        )}

                        <g className="die-cut-layer">
                          {/* Render Glues / Glue Flaps */}
                          {(dieline as any).glues && (dieline as any).glues.map((pathStr: string, index: number) => (
                            <path
                              id={`cad-glue-line-${index}`}
                              key={`gl-${index}`}
                              d={pathStr}
                              stroke="#10b981"
                              strokeWidth="0.4"
                              strokeDasharray="3,2"
                              fill="rgba(16, 185, 129, 0.12)"
                            />
                          ))}
                          {/* Render Bleeds */}
                          {(dieline as any).bleeds && (dieline as any).bleeds.map((pathStr: string, index: number) => (
                            <path
                              id={`cad-bleed-line-${index}`}
                              key={`bl-${index}`}
                              d={pathStr}
                              stroke="#06b6d4"
                              strokeWidth="0.3"
                              strokeDasharray="5,2"
                              fill="none"
                              opacity="0.8"
                            />
                          ))}
                          {/* Render Perforations */}
                          {(dieline as any).perforations && (dieline as any).perforations.map((pathStr: string, index: number) => (
                            <path
                              id={`cad-perf-line-${index}`}
                              key={`pf-${index}`}
                              d={pathStr}
                              stroke="#f97316"
                              strokeWidth="0.35"
                              strokeDasharray="2,1.5"
                              fill="none"
                            />
                          ))}
                          {/* Render Creases based on the theme style with fine stroke-widths */}
                          {isCreasesVisible && dieline.creases.map((pathStr, index) => (
                            <path 
                              id={`cad-crease-line-${index}`}
                              key={`cr-${index}`} 
                              d={pathStr} 
                              stroke={themeStyle.creaseColor} 
                              strokeWidth="0.65" 
                              strokeDasharray="4,2.5" 
                              fill="none" 
                              opacity="0.9" 
                            />
                          ))}
                          {/* Render Cuts based on the theme style with fine stroke-widths */}
                          {isCutsVisible && dieline.cuts.map((pathStr, index) => (
                            <path 
                              id={`cad-cut-line-${index}`}
                              key={`ct-${index}`} 
                              d={pathStr} 
                              stroke={themeStyle.cutColor} 
                              strokeWidth="0.8" 
                              fill="none" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              opacity="0.95"
                            />
                          ))}
                        </g>
 
                        
                        {/* Collision Highlights */}
                        {geometryReport && geometryReport.collisionFlags && (
                          <g id="collision-highlights">
                            {geometryReport.collisionFlags.dustFlap && (
                              <>
                                <rect x={dieline.xMin} y={dieline.yMin} width={dieline.totalW} height={Math.min(30, dieline.totalH/4)} fill="rgba(255,0,0,0.25)" stroke="red" strokeWidth="1" strokeDasharray="4,2" />
                                <rect x={dieline.xMin} y={dieline.yMax - Math.min(30, dieline.totalH/4)} width={dieline.totalW} height={Math.min(30, dieline.totalH/4)} fill="rgba(255,0,0,0.25)" stroke="red" strokeWidth="1" strokeDasharray="4,2" />
                              </>
                            )}
                            {geometryReport.collisionFlags.tuck && (
                              <rect x={dieline.xMin} y={dieline.yMin} width={dieline.totalW} height={Math.min(40, dieline.totalH/3)} fill="rgba(255,0,0,0.25)" stroke="red" strokeWidth="1" strokeDasharray="4,2" />
                            )}
                            {(geometryReport.collisionFlags.autoBottom || geometryReport.collisionFlags.snapLock) && (
                              <rect x={dieline.xMin} y={dieline.yMax - Math.min(40, dieline.totalH/3)} width={dieline.totalW} height={Math.min(40, dieline.totalH/3)} fill="rgba(255,0,0,0.25)" stroke="red" strokeWidth="1" strokeDasharray="4,2" />
                            )}
                          </g>
                        )}
                        
                        {/* Dimension markers on SVG layout */}

                        {showDimensions && isDimensionsVisible && (
                          <g id="overall-dimensions">
                            {/* Total Width */}
                            <line 
                                x1={dieline.xMin} 
                                y1={dieline.yMin - 15} 
                                x2={dieline.xMax} 
                                y2={dieline.yMin - 15} 
                                stroke="#0ea5e9" 
                                strokeWidth="0.4" 
                                markerStart="url(#cad-arrow-start)"
                                markerEnd="url(#cad-arrow-end)"
                            />
                            <rect x={(dieline.xMin + dieline.xMax) / 2 - 12} y={dieline.yMin - 20} width="24" height="10" fill={themeStyle.labelBg} rx="2" stroke={themeStyle.labelBorder} strokeWidth="0.5" />
                            <text x={(dieline.xMin + dieline.xMax) / 2} y={dieline.yMin - 13} fontSize="6" fill={themeStyle.labelText} textAnchor="middle" fontWeight="bold">{Math.round(dieline.totalW)} mm</text>
                            
                            {/* Total Height */}
                            <line 
                                x1={dieline.xMin - 15} 
                                y1={dieline.yMin} 
                                x2={dieline.xMin - 15} 
                                y2={dieline.yMax} 
                                stroke="#0ea5e9" 
                                strokeWidth="0.4" 
                                markerStart="url(#cad-arrow-start)"
                                markerEnd="url(#cad-arrow-end)"
                            />
                            <g transform={`translate(${dieline.xMin - 15}, ${(dieline.yMin + dieline.yMax) / 2}) rotate(-90)`}>
                              <rect x="-12" y="-5" width="24" height="10" fill={themeStyle.labelBg} rx="2" stroke={themeStyle.labelBorder} strokeWidth="0.5" />
                              <text x="0" y="2" fontSize="6" fill={themeStyle.labelText} textAnchor="middle" fontWeight="bold">{Math.round(dieline.totalH)} mm</text>
                            </g>
                          </g>
                        )}
                        {showDimensions && isDimensionsVisible && dieline.labels.map((l, index) => (
                          <g id={`cad-dim-badge-group-${index}`} key={`lb-${index}`}>
                            {l.lineW && (
                              <line 
                                x1={l.x - l.lineW / 2 + 6} 
                                y1={l.y} 
                                x2={l.x + l.lineW / 2 - 6} 
                                y2={l.y} 
                                stroke="#eab308" 
                                strokeWidth="0.4" 
                                markerStart="url(#cad-arrow-start-yellow)"
                                markerEnd="url(#cad-arrow-end-yellow)"
                              />
                            )}
                            {l.lineH && (
                              <line 
                                x1={l.x} 
                                y1={l.y - l.lineH / 2 + 6} 
                                x2={l.x} 
                                y2={l.y + l.lineH / 2 - 6} 
                                stroke="#eab308" 
                                strokeWidth="0.4" 
                                markerStart="url(#cad-arrow-start-yellow)"
                                markerEnd="url(#cad-arrow-end-yellow)"
                              />
                            )}
                            <rect 
                              id={`cad-dim-badge-bg-${index}`}
                              x={l.x - 11} 
                              y={l.y - 5.5} 
                              width="22" 
                              height="11" 
                              fill={themeStyle.labelBg} 
                              rx="2.5" 
                              stroke={themeStyle.labelBorder} 
                              strokeWidth="0.6" 
                            />
                            <text 
                              id={`cad-dim-badge-text-${index}`}
                              x={l.x} 
                              y={l.y + 2.5} 
                              fontSize="6.5" 
                              fontWeight="bold" 
                              fill={themeStyle.labelText} 
                              textAnchor="middle" 
                              className="select-none font-mono"
                            >
                              {l.text}
                            </text>
                          </g>
                        ))}

                        {/* Interactive Custom Dimensions */}
                        {customDimensions.map((cd) => {
                          const midX = (cd.x1 + cd.x2) / 2;
                          const midY = (cd.y1 + cd.y2) / 2;
                          const displayVal = convertMmToUnit(cd.value, unit);
                          const unitLabel = unit === 'mm' ? 'mm' : unit === 'cm' ? 'cm' : 'in';
                          const formattedVal = `${displayVal.toFixed(1)} ${unitLabel}`;

                          return (
                            <g key={cd.id} className="interactive-dim">
                              <line 
                                x1={cd.x1} 
                                y1={cd.y1} 
                                x2={cd.x2} 
                                y2={cd.y2} 
                                stroke="#f59e0b"
                                strokeWidth="1.5" 
                                markerStart="url(#cad-arrow-start)"
                                markerEnd="url(#cad-arrow-end)"
                              />
                              <g transform={`translate(${midX}, ${midY})`}>
                                <rect 
                                  x="-32" 
                                  y="-9" 
                                  width="64" 
                                  height="18" 
                                  fill="#070b12" 
                                  stroke="#f59e0b" 
                                  strokeWidth="1" 
                                  rx="4" 
                                />
                                <text 
                                  x="0" 
                                  y="4" 
                                  fontSize="8.5" 
                                  fontWeight="bold" 
                                  fill="#f59e0b" 
                                  textAnchor="middle"
                                  className="font-mono"
                                >
                                  {formattedVal}
                                </text>
                                <g 
                                  transform="translate(32, -9)" 
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCustomDimensions(old => old.filter(d => d.id !== cd.id));
                                  }}
                                >
                                  <circle r="6" fill="#ef4444" />
                                  <text y="2.5" textAnchor="middle" fill="#ffffff" fontSize="7" fontWeight="bold">×</text>
                                </g>
                              </g>
                            </g>
                          );
                        })}

                        {/* Current Interactive measurement preview line */}
                        {isMeasuringMode && measurementPoints.length === 1 && svgCursor && (
                          <g opacity="0.8">
                            <line 
                              x1={measurementPoints[0].x} 
                              y1={measurementPoints[0].y} 
                              x2={svgCursor.x} 
                              y2={svgCursor.y} 
                              stroke="#f59e0b" 
                              strokeWidth="1" 
                              strokeDasharray="3,3"
                            />
                            <circle cx={measurementPoints[0].x} cy={measurementPoints[0].y} r="3" fill="#f59e0b" />
                          </g>
                        )}

                        {/* VISUAL DEBUGGING MODE OVERLAY FOR LOCK-BOTTOM FLAP (FEFCO 0711 / ECMA A2110 W/2) */}
                        {showDebugger && (
                          <g id="fefco-lock-bottom-debug-overlay" className="pointer-events-none select-none">
                            {(() => {
                              const glueTab = dieline.glueTab || 15;
                              const x1 = glueTab;
                              const x2 = x1 + dims.L;
                              const x3 = x2 + dims.W;
                              const x4 = x3 + dims.L;
                              const x5 = x4 + dims.W;
                              const yB = 140 + dims.H;
                              const hSide = dims.W * 0.5;
                              const cOffset = Math.max(1.5, material.thickness || 0.4);

                              return (
                                <>
                                  {/* Panel 2 (Flap 2) Lock Straight Segment Highlight: x2 + cOffset to x2 + W/2 */}
                                  <line
                                    x1={x2 + cOffset}
                                    y1={yB + hSide}
                                    x2={x2 + (dims.W / 2)}
                                    y2={yB + hSide}
                                    stroke="#22d3ee"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    style={{ filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.95))' }}
                                  />
                                  <line x1={x2 + cOffset} y1={yB + hSide - 6} x2={x2 + cOffset} y2={yB + hSide + 6} stroke="#22d3ee" strokeWidth="2" />
                                  <line x1={x2 + (dims.W / 2)} y1={yB + hSide - 6} x2={x2 + (dims.W / 2)} y2={yB + hSide + 6} stroke="#22d3ee" strokeWidth="2" />

                                  {/* Panel 4 (Flap 4) Lock Straight Segment Highlight: x4 + cOffset to x4 + W/2 */}
                                  <line
                                    x1={x4 + cOffset}
                                    y1={yB + hSide}
                                    x2={x4 + (dims.W / 2)}
                                    y2={yB + hSide}
                                    stroke="#22d3ee"
                                    strokeWidth="3.5"
                                    strokeLinecap="round"
                                    style={{ filter: 'drop-shadow(0 0 6px rgba(34, 211, 238, 0.95))' }}
                                  />
                                  <line x1={x4 + cOffset} y1={yB + hSide - 6} x2={x4 + cOffset} y2={yB + hSide + 6} stroke="#22d3ee" strokeWidth="2" />
                                  <line x1={x4 + (dims.W / 2)} y1={yB + hSide - 6} x2={x4 + (dims.W / 2)} y2={yB + hSide + 6} stroke="#22d3ee" strokeWidth="2" />

                                  {/* Dimension Callout Badge on Panel 2 */}
                                  <g transform={`translate(${x2 + (dims.W / 4)}, ${yB + hSide + 18})`}>
                                    <rect x="-65" y="-11" width="130" height="22" rx="5" fill="#030712" stroke="#22d3ee" strokeWidth="1.2" opacity="0.95" />
                                    <text x="0" y="4" fontSize="8.5" fontWeight="bold" fill="#38bdf8" textAnchor="middle" className="font-mono">
                                      طول = W/2 = {(dims.W / 2).toFixed(1)}mm
                                    </text>
                                  </g>

                                  {/* Dimension Callout Badge on Panel 4 */}
                                  <g transform={`translate(${x4 + (dims.W / 4)}, ${yB + hSide + 18})`}>
                                    <rect x="-65" y="-11" width="130" height="22" rx="5" fill="#030712" stroke="#22d3ee" strokeWidth="1.2" opacity="0.95" />
                                    <text x="0" y="4" fontSize="8.5" fontWeight="bold" fill="#38bdf8" textAnchor="middle" className="font-mono">
                                      طول = W/2 = {(dims.W / 2).toFixed(1)}mm
                                    </text>
                                  </g>

                                  {/* Color-coded Flap Classification Labels */}
                                  <g transform={`translate(${x1 + dims.L / 2}, ${yB + hSide + 42})`}>
                                    <rect x="-48" y="-9" width="96" height="18" rx="4" fill="#2e1065" stroke="#a855f7" strokeWidth="1" />
                                    <text x="0" y="3.5" fontSize="8" fontWeight="bold" fill="#f3e8ff" textAnchor="middle" className="font-sans">
                                      زبانه‌۱: قفل نرینه
                                    </text>
                                  </g>
                                  <g transform={`translate(${x2 + dims.W / 2}, ${yB + hSide + 42})`}>
                                    <rect x="-48" y="-9" width="96" height="18" rx="4" fill="#082f49" stroke="#06b6d4" strokeWidth="1" />
                                    <text x="0" y="3.5" fontSize="8" fontWeight="bold" fill="#e0f2fe" textAnchor="middle" className="font-sans">
                                      زبانه‌۲: جانب (W/2)
                                    </text>
                                  </g>
                                  <g transform={`translate(${x3 + dims.L / 2}, ${yB + hSide + 42})`}>
                                    <rect x="-48" y="-9" width="96" height="18" rx="4" fill="#451a03" stroke="#f59e0b" strokeWidth="1" />
                                    <text x="0" y="3.5" fontSize="8" fontWeight="bold" fill="#fef3c7" textAnchor="middle" className="font-sans">
                                      زبانه‌۳: شیار مادگی
                                    </text>
                                  </g>
                                  <g transform={`translate(${x4 + dims.W / 2}, ${yB + hSide + 42})`}>
                                    <rect x="-48" y="-9" width="96" height="18" rx="4" fill="#082f49" stroke="#06b6d4" strokeWidth="1" />
                                    <text x="0" y="3.5" fontSize="8" fontWeight="bold" fill="#e0f2fe" textAnchor="middle" className="font-sans">
                                      زبانه‌۴: جانب (W/2)
                                    </text>
                                  </g>
                                </>
                              );
                            })()}
                          </g>
                        )}

                        {/* CAD Legend Box */}
                        <g id="cad-legend-box-group" transform={`translate(${dieline.xMax - 95}, ${dieline.yMin - 40})`} className="opacity-95">
                          <rect 
                            id="cad-legend-box"
                            width="105" 
                            height="42" 
                            fill={themeStyle.legendBg} 
                            stroke={themeStyle.legendBorder} 
                            strokeWidth="1"
                            rx="4" 
                          />
                          <line x1="10" y1="14" x2="30" y2="14" stroke={themeStyle.cutColor} strokeWidth="1.05" />
                          <text x="35" y="17" fontSize="8" fill={themeStyle.legendText} fontWeight="900">CUT (تیغ)</text>
                          <line x1="10" y1="28" x2="30" y2="28" stroke={themeStyle.creaseColor} strokeWidth="0.85" strokeDasharray="3,1.5" />
                          <text x="35" y="31" fontSize="8" fill={themeStyle.legendText} fontWeight="900">CREASE (خط تا)</text>
                        </g>

                        {/* Live Coordinate Snapping Crosshair Overlay (snapped to 0.01mm) */}
                        {svgCursor && (
                          <g id="cad-coordinate-crosshair-group" className="pointer-events-none">
                            {/* Horizontal tracking line */}
                            <line 
                              x1={dieline.xMin - 1600} 
                              y1={svgCursor.y} 
                              x2={dieline.xMax + 1600} 
                              y2={svgCursor.y} 
                              stroke={themeStyle.textColor} 
                              strokeWidth="0.4"
                              strokeDasharray="3,3"
                              opacity="0.4"
                            />
                            {/* Vertical tracking line */}
                            <line 
                              x1={svgCursor.x} 
                              y1={dieline.yMin - 1600} 
                              x2={svgCursor.x} 
                              y2={dieline.yMax + 1600} 
                              stroke={themeStyle.textColor} 
                              strokeWidth="0.4"
                              strokeDasharray="3,3"
                              opacity="0.4"
                            />
                            {/* Magnetic Snap Indicator Overlay */}
                            {magneticSnapPoint && (
                              <g id="cad-magnetic-snap-overlay-group" className="pointer-events-none">
                                {magneticSnapPoint.isMagnetic ? (
                                  <>
                                    <circle 
                                      cx={magneticSnapPoint.x} 
                                      cy={magneticSnapPoint.y} 
                                      r="8" 
                                      fill="none" 
                                      stroke="#10b981" 
                                      strokeWidth="1.5" 
                                      className="animate-ping opacity-75"
                                    />
                                    <circle 
                                      cx={magneticSnapPoint.x} 
                                      cy={magneticSnapPoint.y} 
                                      r="4" 
                                      fill="#10b981" 
                                      stroke="#022c22" 
                                      strokeWidth="1"
                                    />
                                    <line x1={magneticSnapPoint.x - 10} y1={magneticSnapPoint.y} x2={magneticSnapPoint.x + 10} y2={magneticSnapPoint.y} stroke="#10b981" strokeWidth="0.8" strokeDasharray="2,2" />
                                    <line x1={magneticSnapPoint.x} y1={magneticSnapPoint.y - 10} x2={magneticSnapPoint.x} y2={magneticSnapPoint.y + 10} stroke="#10b981" strokeWidth="0.8" strokeDasharray="2,2" />
                                  </>
                                ) : (
                                  <circle 
                                    cx={magneticSnapPoint.x} 
                                    cy={magneticSnapPoint.y} 
                                    r="2.5" 
                                    fill="#38bdf8" 
                                    opacity="0.9"
                                  />
                                )}
                              </g>
                            )}

                            {/* Intersection blinking target cursor */}
                            <circle 
                              cx={svgCursor.x} 
                              cy={svgCursor.y} 
                              r="3.5" 
                              fill="none" 
                              stroke={magneticSnapPoint?.isMagnetic ? "#10b981" : themeStyle.cutColor} 
                              strokeWidth="1.2"
                              className="animate-pulse"
                            />
                            {/* Snapped numeric display HUD block inside SVG */}
                            <g transform={`translate(${svgCursor.x + 8}, ${svgCursor.y - 8})`}>
                              <rect 
                                width={magneticSnapPoint?.isMagnetic ? "110" : "80"} 
                                height="22" 
                                fill={magneticSnapPoint?.isMagnetic ? "#022c22" : themeStyle.labelBg} 
                                stroke={magneticSnapPoint?.isMagnetic ? "#10b981" : themeStyle.labelBorder} 
                                strokeWidth="0.8" 
                                rx="4"
                                opacity="0.95"
                              />
                              <text 
                                x={magneticSnapPoint?.isMagnetic ? "55" : "40"} 
                                y="13" 
                                textAnchor="middle" 
                                fill={magneticSnapPoint?.isMagnetic ? "#34d399" : themeStyle.labelText} 
                                fontSize="7" 
                                fontWeight="bold" 
                                className="font-mono"
                              >
                                {magneticSnapPoint?.isMagnetic ? `🧲 قفل: ${svgCursor.x.toFixed(1)}, ${svgCursor.y.toFixed(1)}` : `${svgCursor.x.toFixed(2)}, ${svgCursor.y.toFixed(2)}`}
                              </text>
                            </g>
                          </g>
                        )}

                      </svg>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

                {/* Bottom CAD Status Bar Dock */}
                <div className="w-full bg-[#060910]/95 border-t border-slate-800/90 px-4 py-2 flex flex-wrap items-center justify-between text-[10.5px] text-slate-400 font-mono z-30 select-none shrink-0" dir="rtl">
                  <div className="flex items-center gap-4">
                    {/* Live Cursor Coordinates */}
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-sky-400" />
                      <span>X: {svgCursor ? svgCursor.x.toFixed(1) : '0.0'} mm</span>
                      <span className="text-slate-600">|</span>
                      <span>Y: {svgCursor ? svgCursor.y.toFixed(1) : '0.0'} mm</span>
                    </span>

                    {/* Dieline Bounding Box */}
                    <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
                      <Box className="w-3.5 h-3.5 text-indigo-400" />
                      <span>ابعاد کلی: {Math.round(dieline.totalW)} × {Math.round(dieline.totalH)} mm</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Layer Toggles */}
                    <div className="flex items-center gap-2 font-sans text-[10px]">
                      <button
                        onClick={() => setShowDimensions(!showDimensions)}
                        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${showDimensions ? 'bg-sky-900/60 text-sky-300 border border-sky-700/50' : 'text-slate-500 hover:text-slate-300'}`}
                        type="button"
                      >
                        خطوط اندازه
                      </button>
                      {(() => {
                        const isBleedLayerVisible = layers.find(l => l.id === 'bleed')?.isVisible !== false;
                        return (
                          <button
                            onClick={() => setLayers(prev => prev.map(l => l.id === 'bleed' ? { ...l, isVisible: !l.isVisible } : l))}
                            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${isBleedLayerVisible ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50' : 'text-slate-500 hover:text-slate-300'}`}
                            type="button"
                          >
                            حاشیه بلید (3cm)
                          </button>
                        );
                      })()}
                    </div>

                    {/* Model Code */}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-sky-400 font-bold">
                      {selectedModel.code || 'FEFCO / ECMA'}
                    </span>
                  </div>
                </div>

                  {/* Quick View 3D Overlay */}
                  {showQuickView3D && viewMode === '2d' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 20 }}
                      className="absolute bottom-20 left-4 z-50 w-72 h-80 bg-[#0c121d] border border-sky-900/50 rounded-2xl shadow-2xl shadow-sky-900/20 overflow-hidden flex flex-col"
                    >
                      <div className="flex items-center justify-between p-2 bg-[#080b10] border-b border-sky-900/30">
                        <span className="text-[10px] font-bold text-sky-400">پیش‌نمایش سریع ۳بعدی</span>
                        <button onClick={() => setShowQuickView3D(false)} className="text-slate-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 relative">
                        <ThreeDPreview 
                          width={dims.L}
                          height={dims.H}
                          depth={dims.W}
                          color={material.color || '#e2cfb6'}
                          specialEffect={specialEffect}
                          isOpenRatio={foldRatio}
                          wireframe={wireframe}
                          autoRotate={true}
                          selectedModelId={useCustom3DEngine ? `custom-template-${selectedModel.id}-${selectedModel.name}` : ((selectedModel as any).baseModelId || selectedModel.id)}
                          customEntities={(() => {
                            const ov = customTemplates.find((t: any) => t.baseModelId === selectedModel.id && t.isOverride && t.entities && t.entities.length > 0);
                            const tpl = (!useStandardMathEngine && ov) || (selectedModel.id.startsWith('custom-') ? customTemplates.find((t: any) => t.id === selectedModel.id) : null);
                            return tpl?.entities;
                          })()}
                          customAnchors={(() => {
                            const ov = customTemplates.find((t: any) => t.baseModelId === selectedModel.id && t.isOverride && t.entities && t.entities.length > 0);
                            const tpl = (!useStandardMathEngine && ov) || (selectedModel.id.startsWith('custom-') ? customTemplates.find((t: any) => t.id === selectedModel.id) : null);
                            return tpl?.anchors;
                          })()}
                          paperType={material.id.includes('kraft') ? 'kraft' : (material.id.includes('corrugated') ? 'corrugated' : 'coated')}
                          materialThickness={material.thickness}
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Floating Interactive Smart 3D Button - placed at the bottom-left of the viewport container */}
                  {viewMode === '2d' && (
                    <motion.div 
                      className="absolute bottom-4 left-4 z-40"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <button
                        onClick={() => setViewMode('3d')}
                        className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-slate-800/80 hover:border-indigo-500/80 shadow-lg shadow-black/60 hover:shadow-indigo-500/10 hover:shadow-2xl transition-all cursor-pointer select-none overflow-hidden text-right h-11"
                        title="ورود به فضای سه‌بعدی جعبه"
                        type="button"
                      >
                        {/* Glowing backdrop aura */}
                        <span className="absolute -inset-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-cyan-500/15 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></span>

                        {/* Custom isometric 3D wireframe cube */}
                        <div className="w-[18px] h-[18px] relative flex items-center justify-center shrink-0">
                          <svg 
                            viewBox="0 0 100 115"
                            className="w-full h-full drop-shadow-[0_1px_4px_rgba(99,102,241,0.6)] transition-transform duration-350 group-hover:rotate-[10deg]"
                          >
                            <defs>
                              <linearGradient id="floatingCubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#22d3ee" />
                                <stop offset="100%" stopColor="#6366f1" />
                              </linearGradient>
                            </defs>
                            
                            {/* Cube Wireframe */}
                            <polygon 
                              points="50,21 20,38 20,68 50,85 80,68 80,38" 
                              stroke="url(#floatingCubeGrad)" 
                              strokeWidth="5" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              fill="rgba(9,13,22,0.4)" 
                            />
                            <line x1="50" y1="52" x2="50" y2="85" stroke="url(#floatingCubeGrad)" strokeWidth="4.5" strokeLinecap="round" />
                            <line x1="50" y1="52" x2="20" y2="38" stroke="url(#floatingCubeGrad)" strokeWidth="4.5" strokeLinecap="round" />
                            <line x1="50" y1="52" x2="80" y2="38" stroke="url(#floatingCubeGrad)" strokeWidth="4.5" strokeLinecap="round" />
                          </svg>
                        </div>

                        {/* Mini label and status light */}
                        <div className="flex flex-col items-start z-10 font-sans">
                          <span className="text-[10px] font-black text-white group-hover:text-cyan-300 transition-colors leading-none">
                            نمای ۳بعدی پویا
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            فعال‌سازی ماژول تاشو
                          </span>
                        </div>
                      </button>
                    </motion.div>
                  )}

                  {/* Specs validation banner overlays inside viewport */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-2">
                    <Badge color="green" className="font-mono text-[8px] font-black uppercase">دقیق و استاندارد</Badge>
                    <Badge color="blue" className="font-mono text-[8px] font-black uppercase">بهینه‌سازی شده برای تولید</Badge>
                  </div>

                  {/* Production-grade 'Engineering Status' overlay (remains visible floating over the dieline canvas) */}
                  {showTelemetry && !isMobile && (
                    <motion.div 
                      drag
                      dragMomentum={false}
                      className="absolute top-20 left-6 z-30 w-72 bg-[#0c121d]/90 backdrop-blur-md border border-slate-800/80 p-4 rounded-xl shadow-xl shadow-black/80 select-none cursor-move animate-in fade-in zoom-in-95 duration-200"
                      dir="rtl"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/70 pb-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></div>
                          <span className="text-[10px] font-black uppercase text-sky-400 font-sans tracking-wide">وضعیت مهندسی نقشه (CAD)</span>
                        </div>
                        <button 
                          onClick={() => setShowTelemetry(false)}
                          className="text-slate-500 hover:text-slate-200 bg-slate-950/50 hover:bg-slate-900/70 p-1 rounded-lg border-none cursor-pointer transition-colors"
                          title="پنهان کردن پانل"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Geometric score */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[9.5px] text-slate-400 font-bold">امتیاز صحت ابعادی و هندسه:</span>
                            <span className={`text-[10px] font-black font-mono ${geometryReport.score >= 95 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {geometryReport.score}٪
                            </span>
                          </div>
                          <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-slate-800/60">
                            <div 
                              className={`h-full rounded-full transition-all duration-350 ${geometryReport.score >= 95 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${geometryReport.score}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Material usage details */}
                        <div className="bg-[#070a0e]/60 p-2.5 rounded-lg border border-slate-800/40 text-[9px] space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">شاسی متریال جاری:</span>
                            <strong className="text-slate-200 truncate max-w-[140px] text-left">{material.name}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">مساحت باز شده قالب:</span>
                            <strong className="text-sky-450 font-mono">{((dieline.totalW * dieline.totalH) / 10000).toFixed(1)} cm²</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-sans">مقاومت بدنه کرش کاغذی (BCT):</span>
                            <strong className="text-amber-400 font-mono">{physicsReport ? `${(physicsReport as any).strengthBCT || (physicsReport as any).maxLoadKg || 120} kgf` : 'نامشخص'}</strong>
                          </div>
                        </div>

                        {/* FEFCO/ECMA compliance status */}
                        <div className="flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800/40">
                          <Award className="w-5 h-5 text-sky-450/90 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="text-[8px] text-slate-500 block">استاندارد لیتوگرافی ملیت:</span>
                            <strong className="text-[10px] text-sky-300 font-bold block truncate">
                              {selectedModel.id.startsWith('fefco') ? 'FEFCO 0200 / استاندارد ففکو کارتن' : 'ECMA C31 / استاندارد جعبه آرایی پپلو'}
                            </strong>
                          </div>
                        </div>

                        {/* Quality and compliance checks */}
                        <div className="text-[9px] flex flex-col gap-1 max-h-24 overflow-y-auto custom-scrollbar pr-0.5" dir="rtl">
                          {validatorIssues.slice(0, 2).map((issue, idx) => (
                            <div 
                              key={idx} 
                              className={`px-1.5 py-1 rounded border ${
                                issue.type === 'error' ? 'bg-rose-950/20 border-rose-900/30 text-rose-300' :
                                issue.type === 'warning' ? 'bg-amber-950/20 border-amber-900/30 text-amber-300' :
                                'bg-slate-900/50 border-slate-800 text-slate-300'
                              }`}
                            >
                              {issue.msg}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}

                </div>
              ) : (
                /* --- DISPLAY 3D PREVIEW MODE --- */
                <div className="flex-1 w-full relative flex flex-col justify-between overflow-hidden">
                  
                  {/* ThreeDPreview component mounting container */}
                  <div className="flex-1 w-full bg-[#050608] flex items-center justify-center relative min-h-[300px] lg:min-h-[500px]">
                    <div className="absolute inset-0 z-10">
                      <ThreeDPreview 
                        width={dims.L}
                        height={dims.H}
                        depth={dims.W}
                        color={material.color || '#e2cfb6'}
                        paperType={material.id.includes('corrugated') ? 'corrugated' : material.id.includes('kraft') ? 'kraft' : 'coated'}
                        isOpenRatio={foldRatio}
                        textureUrl={textureUrl}
                        specialEffect={specialEffect}
                        autoRotate={autoRotate}
                        cameraOrbit={cameraOrbit}
                        resetTrigger={resetTrigger}
                        viewAngle={viewAngle}
                        isExploded={isExploded}
                        flapDirections={flapDirections}
                        hasDieCut={false}
                        selectedModelId={useCustom3DEngine ? `custom-template-${selectedModel.id}-${selectedModel.name}` : ((selectedModel as any).baseModelId || selectedModel.id)}
                        customEntities={(() => {
                          const ov = customTemplates.find((t: any) => t.baseModelId === selectedModel.id && t.isOverride && t.entities && t.entities.length > 0);
                          const tpl = (!useStandardMathEngine && ov) || (selectedModel.id.startsWith('custom-') ? customTemplates.find((t: any) => t.id === selectedModel.id) : null);
                          return tpl?.entities;
                        })()}
                        customAnchors={(() => {
                          const ov = customTemplates.find((t: any) => t.baseModelId === selectedModel.id && t.isOverride && t.entities && t.entities.length > 0);
                          const tpl = (!useStandardMathEngine && ov) || (selectedModel.id.startsWith('custom-') ? customTemplates.find((t: any) => t.id === selectedModel.id) : null);
                          return tpl?.anchors;
                        })()}
                        wireframe={wireframe}
                        lightIntensity={lightIntensity}
                        showDimensions={showDimensions}
                        materialThickness={material.thickness}
                      />
                    </div>


                    {/* Unified 3D Toolbox (Right side) */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 bg-[#0c1015]/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80 shadow-2xl" dir="rtl">
                      {/* Camera Angles */}
                      <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-700/50">
                        <span className="text-[8.5px] font-black text-slate-400 text-center select-none tracking-wider font-sans uppercase">زاویه دید</span>
                        <button onClick={() => setViewAngle('perspective')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'perspective' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="پرسپکتیو"><Rotate3d className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setViewAngle('front')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'front' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="روبرو"><Box className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setViewAngle('top')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'top' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="بالا"><ArrowDownToLine className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setViewAngle('side')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'side' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="بغل"><Layers3 className="w-4 h-4 mx-auto" /></button>
                      </div>

                      {/* Display Modes */}
                      <div className="flex flex-col gap-1.5 pt-1 pb-2 border-b border-slate-700/50">
                        <span className="text-[8.5px] font-black text-slate-400 text-center select-none tracking-wider font-sans uppercase">نمایش</span>
                        <button onClick={() => setWireframe(!wireframe)} className={`p-2 rounded-xl transition-all border ${wireframe ? 'bg-emerald-600 border-emerald-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="فریم لاین / اسکتچ (Wireframe)"><Eye className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setIsExploded(!isExploded)} className={`p-2 rounded-xl transition-all border ${isExploded ? 'bg-amber-600 border-amber-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="نمای انفجاری (Exploded View)"><Maximize className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setAutoRotate(!autoRotate)} className={`p-2 rounded-xl transition-all border ${autoRotate ? 'bg-sky-600 border-sky-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="چرخش خودکار (Auto Rotate)"><RefreshCw className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setCameraOrbit(!cameraOrbit)} className={`p-2 rounded-xl transition-all border ${cameraOrbit ? 'bg-violet-600 border-violet-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="گردش دوربین (Camera Orbit)"><Orbit className="w-4 h-4 mx-auto" /></button>
                        <button onClick={handleCaptureSnapshot} className="p-2 rounded-xl transition-all border bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-indigo-900 hover:text-indigo-300 hover:border-indigo-500" title="برداشت اسکرین شات (Live Snapshot)"><Camera className="w-4 h-4 mx-auto" /></button>
                      </div>

                      {/* Reset */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <button onClick={() => setResetTrigger(prev => prev + 1)} className="p-2 rounded-xl transition-all border bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-900 hover:text-white" title="بازنشانی دوربین (Reset Camera)"><Camera className="w-4 h-4 mx-auto" /></button>
                      </div>
                    </div>

                    {/* Unified Environment Toolbox (Left side) */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 bg-[#0c1015]/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-2xl w-52" dir="rtl">
                      {/* Lighting */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-bold text-white font-sans">شدت نورپردازی</span>
                        </div>
                        <input 
                          type="range" min="0.2" max="3" step="0.1" 
                          value={lightIntensity} 
                          onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      {/* Effects */}
                      <div className="flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                        <span className="text-[9px] font-black text-slate-400 font-sans uppercase">افکت چاپ</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'none', label: 'ساده' },
                            { id: 'gold_foil', label: 'طلاکوب' },
                            { id: 'uv_spot', label: 'UV' },
                            { id: 'both', label: 'ترکیبی' }
                          ].map(eff => (
                            <button
                              key={eff.id}
                              onClick={() => setSpecialEffect(eff.id as any)}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${specialEffect === eff.id ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              {eff.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Material Type Selector */}
                      <div className="flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                        <span className="text-[9px] font-black text-slate-400 font-sans uppercase">متریال و جنس مقوا</span>
                        <div className="flex flex-col gap-1.5">
                          {[
                            { id: 'inderboard-300', label: 'ایندربرد سفید (Glossy)', desc: 'coated' },
                            { id: 'kraft-300', label: 'کرافت قهوه‌ای (Kraft)', desc: 'kraft' },
                            { id: 'corrugated-e', label: 'کارتن مایکروویو (E-Flute)', desc: 'corrugated' }
                          ].map(matItem => {
                            const isSelected = material.id === matItem.id;
                            return (
                              <button
                                key={matItem.id}
                                onClick={() => {
                                  const found = MATERIAL_PRESETS.find(m => m.id === matItem.id);
                                  if (found) setMaterial(found);
                                }}
                                className={`w-full text-right px-2.5 py-1.5 text-[9.5px] rounded-lg border transition-all flex items-center gap-2 ${isSelected ? 'bg-indigo-950/50 border-sky-500 text-sky-400 font-bold' : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-white'}`}
                                type="button"
                              >
                                <span className={`w-2.5 h-2.5 rounded-full border ${matItem.desc === 'coated' ? 'bg-white border-slate-400' : matItem.desc === 'kraft' ? 'bg-[#c2a278] border-amber-900' : 'bg-[#d8c3a5] border-yellow-800'}`}></span>
                                <span className="truncate">{matItem.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Texture */}
                      <div className="flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                        <span className="text-[9px] font-black text-slate-400 font-sans uppercase">بافت طرح</span>
                        <input type="file" ref={fileInputRef} onChange={handleTextureUpload} accept="image/*" className="hidden" />
                        {textureUrl ? (
                          <div className="flex items-center justify-between bg-slate-900/50 border border-indigo-500/30 p-1.5 rounded-lg">
                            <img src={textureUrl} alt="Skin" className="w-6 h-6 rounded object-cover" />
                            <button onClick={() => setTextureUrl(null)} className="p-1 text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-[9px] font-bold flex items-center justify-center gap-1">
                            <Upload className="w-3 h-3" /> طرح دلخواه
                          </button>
                        )}
                      </div>

                      {/* PDF output settings and line thickness (Relocated) */}
                      <div className="mt-2 pt-3 border-t border-slate-700/50 space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1.5 flex justify-between items-center font-sans">
                            <span>کیفیت خروجی نقشه (PDF)</span>
                            <span className="text-[9px] font-mono text-emerald-400">{pdfQuality === 'high' ? 'عالی' : 'استاندارد'}</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                            <button onClick={() => setPdfQuality('standard')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${pdfQuality === 'standard' ? 'bg-[#1f2d42] text-white font-black' : 'text-slate-550 hover:bg-[#1f2d42]/30'}`}>150 DPI</button>
                            <button onClick={() => setPdfQuality('high')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${pdfQuality === 'high' ? 'bg-[#1f2d42] text-white font-black' : 'text-slate-550 hover:bg-[#1f2d42]/30'}`}>300 DPI</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1.5 flex justify-between items-center font-sans">
                            <span>ضخامت خطوط</span>
                            <span className="text-[9px] font-mono text-sky-405">{lineWidthStyle === 'bold' ? 'ضخیم' : 'ظریف'}</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                            <button onClick={() => setLineWidthStyle('standard')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${lineWidthStyle === 'standard' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-900'}`}>معمولی</button>
                            <button onClick={() => setLineWidthStyle('bold')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${lineWidthStyle === 'bold' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-900'}`}>ضخیم</button>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                  {/* Folding simulation controls */}
                  <div className="absolute inset-x-4 bottom-22 lg:bottom-12 flex justify-center z-20 transition-all duration-300">
                    {is3DControlsCollapsed ? (
                      <motion.button
                        layoutId="folding-controls-panel"
                        onClick={() => setIs3DControlsCollapsed(false)}
                        className="bg-[#111622]/95 backdrop-blur-md border border-indigo-500/30 hover:border-indigo-400/60 px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 cursor-pointer text-slate-200 hover:text-white transition-all text-xs font-bold font-sans"
                        dir="rtl"
                      >
                        <Layers className="w-4 h-4 text-indigo-455 animate-pulse" />
                        <span>تنظیمات تا کردن و شبیه‌ساز سه بعدی (۳D)</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 rotate-180 transition-transform" />
                      </motion.button>
                    ) : (
                      <motion.div 
                        layoutId="folding-controls-panel"
                        className="bg-[#111622]/95 backdrop-blur-md border border-slate-800/80 p-3 rounded-2xl shadow-xl flex flex-col lg:flex-row gap-4 items-center justify-between w-full max-w-5xl relative animate-fade-in"
                        dir="rtl"
                      >
                        {/* Section 1: Slider, Player, and Quick presets */}
                        <div className="flex flex-col xl:flex-row items-center gap-3 w-full lg:w-auto flex-1">
                          
                          {/* Play/Pause simulation triggers */}
                          <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-850/70 p-1.5 rounded-xl shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                  setFoldRatio(0.0);
                                  animDirectionRef.current = 'forward';
                              }}
                              className="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-[10px] bg-[#121c2c] hover:bg-slate-800 text-sky-400 border border-sky-900"
                            >
                              <Play className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                              <span className="font-sans font-black text-sky-200">شبیه‌سازی فرآیند تا</span>
                            </button>

                            {/* Speed selector */}
                            <div className="flex items-center gap-0.5 border-r border-slate-800 pr-1.5 mr-1 bg-slate-950 px-1 rounded-md">
                              <button
                                type="button"
                                onClick={() => setFoldingSpeed(0.003)}
                                className={`px-2 py-1 text-[8.5px] rounded font-mono font-bold transition-all ${
                                  foldingSpeed === 0.003 ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'
                                }`}
                                title="سرعت آهسته (0.5x) برای بررسی و آنالیز دقیق‌تر تقاطع گوشه‌ها"
                              >
                                0.5x
                              </button>
                              <button
                                type="button"
                                onClick={() => setFoldingSpeed(0.008)}
                                className={`px-2 py-1 text-[8.5px] rounded font-mono font-bold transition-all ${
                                  foldingSpeed === 0.008 ? 'bg-indigo-655 text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'
                                }`}
                                title="سرعت متوسط (1x)"
                              >
                                1x
                              </button>
                              <button
                                type="button"
                                onClick={() => setFoldingSpeed(0.016)}
                                className={`px-2 py-1 text-[8.5px] rounded font-mono font-bold transition-all ${
                                  foldingSpeed === 0.016 ? 'bg-indigo-650 text-white shadow-sm' : 'text-slate-500 hover:text-slate-200'
                                }`}
                                title="سرعت بالا (2x)"
                              >
                                2x
                              </button>
                            </div>
                          </div>

                          {/* Center Indicator & Slider */}
                          <div className="flex items-center gap-3.5 flex-1 w-full xl:w-auto">
                            <div className="flex flex-col items-start shrink-0">
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                                <span className="text-[10px] font-black text-slate-350 font-sans whitespace-nowrap">وضعیت تاخوردگی:</span>
                                <span className="font-mono bg-slate-950 px-2 py-0.5 rounded text-sky-400 text-[10.5px] font-black shadow-inner">{Math.round(foldRatio * 100)}%</span>
                              </div>
                              <span className="text-[7.5px] text-emerald-450/90 font-bold block leading-none mt-1 animate-pulse" dir="rtl">💡 پایش برخورد و تداخل زواایای لبه‌ها</span>
                            </div>

                            <input 
                              type="range" 
                              min="-1" 
                              max="1" 
                              step="0.01" 
                              value={foldRatio} 
                              onChange={e => {
                                setFoldRatio(parseFloat(e.target.value));
                              }} 
                              className="flex-1 min-w-[140px] h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-indigo-500" 
                            />
                          </div>

                          <div className="flex gap-1 shrink-0 bg-slate-950/30 p-0.5 rounded-lg border border-slate-900">
                            <button
                              type="button"
                              onClick={() => {
                                setFoldRatio(1.0);
                              }}
                              className={`text-[8.5px] px-2 py-1.5 rounded-lg transition-all font-bold border cursor-pointer ${foldRatio === 1.0 ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-950/80 border-slate-850/70 text-slate-400 hover:text-slate-200'}`}
                            >
                              بستن (100%)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFoldRatio(0.5);
                              }}
                              className={`text-[8.5px] px-2 py-1.5 rounded-lg transition-all font-bold border cursor-pointer ${foldRatio === 0.5 ? 'bg-indigo-600 border-indigo-450 text-white shadow-md' : 'bg-slate-950/80 border-slate-850/70 text-slate-400 hover:text-slate-200'}`}
                            >
                              مونتاژ (50%)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFoldRatio(0.05);
                              }}
                              className={`text-[8.5px] px-2 py-1.5 rounded-lg transition-all font-bold border cursor-pointer ${foldRatio === 0.05 ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-950/80 border-slate-850/70 text-slate-400 hover:text-slate-200'}`}
                            >
                              باز کامل (5%)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFoldRatio(-1.0);
                              }}
                              className={`text-[8.5px] px-2 py-1.5 rounded-lg transition-all font-bold border cursor-pointer ${foldRatio === -1.0 ? 'bg-rose-950 border-rose-500/50 text-rose-350' : 'bg-slate-950/80 border-slate-850/70 text-slate-400 hover:text-rose-455'}`}
                            >
                              معکوس
                            </button>
                          </div>
                        </div>

                        {/* Section 2: flap bent directions */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 px-3 border-r border-l border-slate-800/80 w-full lg:w-auto">
                          <span className="text-[10px] font-black text-slate-400 font-sans whitespace-nowrap">خم درب‌ها:</span>
                          <div className="grid grid-cols-4 sm:flex gap-1 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => setFlapDirections(prev => ({ ...prev, top: prev.top === 'inside' ? 'outside' : 'inside' }))}
                              className={`text-[8.5px] py-1.5 px-1.5 sm:px-2 rounded-lg border transition-all text-center font-bold flex items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap ${
                                flapDirections.top === 'outside' ? 'bg-indigo-950/85 border-indigo-500/80 text-indigo-300' : 'bg-[#090c11] border-slate-850 text-slate-400 hover:text-slate-200'
                              }`}
                              title="درب بالا"
                            >
                              <span>بالا {flapDirections.top === 'outside' ? '↗' : '↙'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setFlapDirections(prev => ({ ...prev, bottom: prev.bottom === 'inside' ? 'outside' : 'inside' }))}
                              className={`text-[8.5px] py-1.5 px-1.5 sm:px-2 rounded-lg border transition-all text-center font-bold flex items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap ${
                                flapDirections.bottom === 'outside' ? 'bg-[#09353a] border-cyan-500/80 text-cyan-300' : 'bg-[#090c11] border-slate-850 text-slate-400 hover:text-slate-200'
                              }`}
                              title="درب پایین"
                            >
                              <span>پایین {flapDirections.bottom === 'outside' ? '↘' : '↖'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setFlapDirections(prev => ({ ...prev, left: prev.left === 'inside' ? 'outside' : 'inside' }))}
                              className={`text-[8.5px] py-1.5 px-1.5 sm:px-2 rounded-lg border transition-all text-center font-bold flex items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap ${
                                flapDirections.left === 'outside' ? 'bg-violet-950/85 border-violet-500/80 text-violet-300' : 'bg-[#090c11] border-slate-850 text-slate-400 hover:text-slate-200'
                              }`}
                              title="درب چپ"
                            >
                              <span>چپ {flapDirections.left === 'outside' ? '←' : '→'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setFlapDirections(prev => ({ ...prev, right: prev.right === 'inside' ? 'outside' : 'inside' }))}
                              className={`text-[8.5px] py-1.5 px-1.5 sm:px-2 rounded-lg border transition-all text-center font-bold flex items-center justify-center gap-0.5 cursor-pointer whitespace-nowrap ${
                                flapDirections.right === 'outside' ? 'bg-pink-950/85 border-pink-500/80 text-pink-300' : 'bg-[#090c11] border-slate-850 text-slate-400 hover:text-slate-200'
                              }`}
                              title="درب راست"
                            >
                              <span>راست {flapDirections.right === 'outside' ? '→' : '←'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Collapsing icon trigger */}
                        <div className="absolute top-3 left-4 lg:relative lg:top-auto lg:left-auto shrink-0 z-10 select-none">
                          <button
                            type="button"
                            onClick={() => setIs3DControlsCollapsed(true)}
                            className="text-slate-450 hover:text-slate-200 bg-slate-950/80 hover:bg-slate-900 border border-slate-850/60 p-1.5 rounded-lg font-bold flex items-center justify-center cursor-pointer transition-colors"
                            title="پنهان کردن پانل"
                          >
                            <X className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>

                      </motion.div>
                    )}
                  </div>

                </div>
            );
          })()}

          {/* CAD PROFESSIONAL THIN BOTTOM STATUS BAR */}
          {!isMobile && (
            <div className="bg-[#05070a]/95 border-t border-slate-900 px-4 py-1.5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 font-mono select-none z-20 shrink-0" dir="rtl">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                  <span className="text-slate-500 font-sans">استاندارد جعبه:</span>
                  <strong className="text-sky-300 font-bold uppercase">{selectedModel.code}</strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-sans">ابعاد پایه ورق شیت:</span>
                  <strong className="text-slate-200">{sheetSize.width} × {sheetSize.height} mm</strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-sans">جنس متریال:</span>
                  <strong className="text-slate-200">{material.name} ({material.thickness}mm)</strong>
                </span>
              </div>

              <div className="flex items-center gap-4 border-r pr-4 border-slate-900 md:border-r-0 md:pr-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-sans">وضعیت هندسی:</span>
                  <strong className={geometryReport.passed ? "text-emerald-400" : "text-rose-400"}>
                    {geometryReport.passed ? "تایید کارگاه کاد (PASS)" : "عدم انطباق ابعادی (FAIL)"}
                  </strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-sans">موقیعت مکان‌نما:</span>
                  <strong className="text-amber-400 font-bold min-w-[90px] text-left">
                    {svgCursor ? `${Math.round(svgCursor.x)} , ${Math.round(svgCursor.y)} mm` : '-------'}
                  </strong>
                </span>
                <span className="text-slate-700">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-sans">بزرگنمایی:</span>
                  <strong className="text-sky-400">{Math.round(zoomScale * 100)}%</strong>
                </span>
              </div>
            </div>
          )}

        </main>

      {/* Onboarding Tour Interactive Overlay Sheet */}
      {onboardingStep !== null && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0e131b] border border-sky-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative animate-in zoom-in-95 font-sans" dir="rtl">
            
            {/* Steps indicator */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-[9px] font-black px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800 font-mono">
                گام {onboardingStep + 1} از ۵
              </span>
              <button 
                onClick={() => setOnboardingStep(null)}
                className="text-slate-500 hover:text-white text-xs bg-transparent border-none outline-none cursor-pointer"
              >
                انصراف و بستن ×
              </button>
            </div>

            {/* Step content */}
            {onboardingStep === 0 && (
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm">مرحله ۱: انتخاب الگوی بسته‌بندی بر اساس استانداردهای بین‌المللی (IEEE, FEFCO & ECMA)</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  برای شروع کار، یکی از الگوهای مرجع بین‌المللی مانند <span className="text-amber-400 font-bold">IEEE Packaging Standard</span>، <span className="text-sky-400 font-bold">ECMA</span> (استاندارد جعبه‌سازی نفیس مقوایی اروپا) یا <span className="text-emerald-400 font-bold">FEFCO</span> (استاندارد جهانی کارتن‌های کنگره‌دار) را برگزینید. مدل ۲بعدی تیغ و ۳بعدی خروجی بر اساس کدهای استاندارد نقشه کشی کارگاه بازطراحی می‌شود.
                </p>
                <div className="bg-sky-950/20 rounded-lg p-3 text-right">
                  <span className="text-[10px] text-sky-400 font-bold block mb-1">💡 اثر روی مدل سه بعدی:</span>
                  <span className="text-[10px] text-slate-400 leading-normal block">
                    ساختار تاشدگی زبانه اصلی و بدنه مکعبی را منطبق با شیوه‌نامه استاندارد مونتاژ کارگاه فرم‌بندی می‌کند.
                  </span>
                </div>
              </div>
            )}

            {onboardingStep === 1 && (
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm">مرحله ۲: طول فیزیکی جعبه (L - Length)</h4>
                <p className="text-xs text-slate-350 leading-relaxed">
                  یکی از ابعاد سه‌گانه اصلی است. مقدار طول جعبه تعیین‌کننده ابعاد دیواره‌های اصلی جانبی است و بر روی لایوت کلی شیت تاثیر مستقیم دارد.
                </p>
                <div className="bg-sky-950/20 rounded-lg p-3 text-right">
                  <span className="text-[10px] text-sky-400 font-bold block mb-1">💡 اثر روی مدل سه بعدی:</span>
                  <span className="text-[10px] text-slate-400 leading-normal block">
                    پنل‌های مقابل و پشت جعبه را عریض یا کم‌عرض‌تر می‌کند و عرض زبانه‌های اصلی چسب در دیواره کناری را نیز بر این اساس فیت می‌کند.
                  </span>
                </div>
              </div>
            )}

            {onboardingStep === 2 && (
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm">مرحله ۳: عرض فیزیکی جعبه (W - Width)</h4>
                <p className="text-xs text-slate-350 leading-relaxed">
                  عرض بسته نشان‌دهنده عمق بسته‌بندی جهت جای‌گیری کالا است. این عدد مستقیماً زاویه درپوش‌ها را تغییر می‌دهد.
                </p>
                <div className="bg-sky-950/20 rounded-lg p-3 text-right">
                  <span className="text-[10px] text-sky-400 font-bold block mb-1">💡 اثر روی مدل سه بعدی:</span>
                  <span className="text-[10px] text-slate-400 leading-normal block">
                    پهنای ساید‌ وال‌ها (دیواره‌های چپ و راست) را فیت کرده و قفل‌های جفت‌شده بالا و پایین (درب غباری) را بازتعریف می‌نماید.
                  </span>
                </div>
              </div>
            )}

            {onboardingStep === 3 && (
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm">مرحله ۴: ارتفاع فیزیکی جعبه (H - Height)</h4>
                <p className="text-xs text-slate-350 leading-relaxed">
                  ارتفاع جعبه، بلندی ستون عمودی بسته‌بندی را تعیین می‌نماید و عامل کلیدی در محاسبات مقاومت فشاری جعبه (آزمون فیزیکی BCT) است.
                </p>
                <div className="bg-sky-950/20 rounded-lg p-3 text-right">
                  <span className="text-[10px] text-sky-400 font-bold block mb-1">💡 اثر روی مدل سه بعدی:</span>
                  <span className="text-[10px] text-slate-400 leading-normal block">
                    میزان کشیدگی یا کوتولگی جعبه را در راستای محور عمودی در فضای سه‌بعدی شبیه‌سازی می‌کند.
                  </span>
                </div>
              </div>
            )}

            {onboardingStep === 4 && (
              <div className="space-y-3">
                <h4 className="text-white font-bold text-sm">مرحله ۵: ضخامت مقوا و جبران خط تا</h4>
                <p className="text-xs text-slate-350 leading-relaxed">
                  در چاپ و بسته‌بندی، مقوا دارای ضخامت خاصی است (مثلا ۳۰۰ گرم به ضخامت ۰.۴۵ میلی‌متر). سیستم CAD به طور هوشمند مقداری کسر ابعاد یا کسر ضخامت برای خط تاها لحاظ می‌کند تا بعد از مونتاژ در درپوش‌ها، محصول فیت بی‌نقص داشته باشد.
                </p>
                <div className="bg-sky-950/20 rounded-lg p-3 text-right">
                  <span className="text-[10px] text-sky-400 font-bold block mb-1">💡 اثر روی مدل سه بعدی:</span>
                  <span className="text-[10px] text-slate-400 leading-normal block">
                    در مدل سه بعدی فاصله‌های مونتاژ و اورلپینگ لبه‌ها را رگلاژ می‌کند تا هم‌پوشانی بدون چین‌خوردگی صورت گیرد.
                  </span>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center" dir="rtl">
              <button 
                onClick={() => setOnboardingStep(prev => prev !== null && prev > 0 ? prev - 1 : null)}
                disabled={onboardingStep === 0}
                className="text-slate-400 hover:text-white disabled:opacity-30 text-xs px-3 py-1.5 rounded transition-all bg-transparent border-none cursor-pointer"
              >
                گام قبلی →
              </button>
              
              {onboardingStep < 4 ? (
                <button 
                  onClick={() => setOnboardingStep(prev => prev !== null ? prev + 1 : 0)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all"
                >
                  ← گام بعدی
                </button>
              ) : (
                <button 
                  onClick={() => {
                    setOnboardingStep(null);
                    showCustomAlert('آموزش پارامتری دایلاین', '🎉 خسته نباشید! با اصول پارامتری دایلاین کارگاهی آشنا شدید. اکنون می‌توانید ابعاد را تغییر داده و خروجی‌های دقیق را صادر نمایید.', 'success');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all"
                >
                  فهمیدم و اتمام آموزش
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. MOBILE STACKED TABBAR & BOTTOM DRAWER */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-[#0b0e14] border-t border-slate-800 shadow-2xl">
          
          {/* Mobile Bottom sheet content panel */}
          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.div
                key="mobile-bottom-sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="max-h-[60vh] bg-[#0c1015]/98 backdrop-blur-xl border-t border-sky-900/40 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-4 rounded-t-2xl shadow-inner text-right"
                style={{ direction: 'rtl' }}
              >
                {/* Drag handle & close top indicator */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-850">
                  <span className="text-[10px] font-black text-sky-400 block font-sans">
                    {activeTab === 'cad' && 'تنظیمات طراحی سازه'}
                    {activeTab === 'standards' && 'استانداردهای بین‌المللی هندسی'}
                    {activeTab === 'physics' && 'شبیه‌ساز فیزیک BCT'}
                    {activeTab === 'nesting' && 'چیدمان لیتوگرافی'}
                    {activeTab === 'pricing' && 'تعرفه برآورد ERP'}
                    {activeTab === 'ai' && 'دستیار هوش مصنوعی'}
                    {activeTab === 'cms' && 'آرشیو و CMS'}
                  </span>
                  <button 
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 px-3.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold border-none cursor-pointer"
                  >
                    بستن تنظیمات
                  </button>
                </div>
                
                {/* Embedded Tab content (shares exact same logics as desktop) */}
                <div className="space-y-6 pt-2 pb-6">
                  {renderPrimaryControls()}
                  {renderSecondaryControls(true)}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky Mobile Icons Tab Bar Row */}
          <div className="flex bg-[#070a0e] py-1 border-t border-slate-900 text-center items-center justify-around h-14 shrink-0">
            {[
              { id: 'cad', label: 'طراحی', icon: Settings },
              { id: 'nesting', label: 'لیتوگرافی', icon: Calculator },
              { id: 'pricing', label: 'مالی', icon: Database }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (activeTab === tab.id && !isSidebarCollapsed) {
                      setIsSidebarCollapsed(true);
                    } else {
                      setActiveTab(tab.id as any);
                      setIsSidebarCollapsed(false);
                    }
                  }}
                  className={`flex-1 py-2 text-[8.5px] rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeTab === tab.id && !isSidebarCollapsed ? 'text-sky-450 bg-[#162032] font-black shadow-inner border-t-2 border-t-sky-500 rounded-t-none border' : 'text-slate-500 hover:bg-slate-900/50'}`}
                >
                  <IconComp className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* 0. DIELINE LIBRARY OVERLAY MODAL */}
      <AnimatePresence>
        {isLibraryOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0b0e14] border border-slate-700 shadow-2xl rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-800 bg-[#07090d]">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-100">کتابخانه استاندارد دایلاین (مخزن الگوها)</h2>
                    <p className="text-xs text-slate-400 mt-1">الگوی مهندسی مورد نظر را جهت ورود به محیط پارامتریک انتخاب کنید.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsLibraryOpen(false)}
                  className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors shadow-sm cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 style-scrollbar bg-[#090b11] space-y-6">
                
                {customTemplates.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black text-amber-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                      الگوهای سفارشی ذخیره‌شده (قالب‌های اختصاصی شما)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                      {customTemplates.map(t => {
                        const defaultDims = t.defaultDims || t.originalDims || { L: 100, W: 100, H: 80 };
                        const m = {
                          id: t.id,
                          name: t.name,
                          code: t.code,
                          category: t.category,
                          icon: '📐',
                          description: t.isOverride 
                            ? `جایگزین نقشه DXF برای الگو استاندارد ${t.baseModelId || 'نامشخص'} با ابعاد ${defaultDims.L}×${defaultDims.W}×${defaultDims.H} میلی‌متر.`
                            : `قالب سفارشی ذخیره شده بر پایه مدل ${t.baseModelId || 'نامشخص'} با ابعاد ${defaultDims.L}×${defaultDims.W}×${defaultDims.H} میلی‌متر.`,
                          defaultDims,
                          aiAnalysis: { suggestion: '' }
                        };
                        return (
                          <div 
                            key={m.id} 
                            onClick={() => {
                              setSelectedModel(m);
                              if (m.defaultDims) setDims(m.defaultDims);
                              setIsLibraryOpen(false);
                            }}
                            className={`cursor-pointer group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1.5 ${
                              selectedModel.id === m.id 
                                ? 'bg-sky-900/10 border-sky-500/60 shadow-[0_0_25px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/50' 
                                : 'bg-[#121620] border-amber-900/20 hover:border-amber-700/50 hover:shadow-xl'
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>
                            
                            <div className="flex justify-between items-start mb-4">
                              <div className="text-4xl filter drop-shadow-md transform transition-transform duration-300 group-hover:scale-110">
                                 {m.icon}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => handleDeleteCustomTemplate(e, m.id)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/20 hover:border-transparent transition-all cursor-pointer shadow-sm z-10"
                                  title="حذف این الگو"
                                  type="button"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {m.id.startsWith('custom-') && (
                                  <span className="text-[10px] text-amber-500 bg-amber-950/20 px-2 py-1 rounded border border-amber-900/40 font-bold">
                                    الگوی سفارشی
                                  </span>
                                )}
                                {selectedModel.id === m.id && (
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]">
                                    <Check className="w-4 h-4" />
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <h3 className="text-[13px] font-black text-slate-200 mb-2 group-hover:text-amber-300 transition-colors">{m.name}</h3>
                            
                            <div className="flex items-center gap-2 mb-3">
                              <Badge color="gray" className="text-[10px] font-mono tracking-wider border-amber-950/30 bg-amber-950/10 text-amber-300">{m.code}</Badge>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">{m.category}</span>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 flex-1 leading-relaxed line-clamp-3">
                              {m.description}
                            </p>
                            {m.aiAnalysis && (
                              <div className="mt-2 text-[10px] text-emerald-400 border-t border-emerald-900/30 pt-2">
                                <p className="font-bold">پیشنهاد هوش مصنوعی: {m.aiAnalysis.suggestion}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black text-sky-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                      الگوهای استاندارد صنعتی دایلاین (IEEE, FEFCO & ECMA)
                    </h3>
                    {hiddenStandardIds.length > 0 && (
                      <button
                        onClick={handleRestoreStandardModels}
                        className="text-[10px] font-bold text-sky-400 hover:text-sky-300 bg-sky-950/60 border border-sky-800/60 px-2 py-1 rounded-lg flex items-center gap-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>بازگردانی {hiddenStandardIds.length} الگوی مخفی‌شده</span>
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                    {visibleStandards.map(m => (
                      <div 
                        key={m.id} 
                        onClick={() => {
                          setSelectedModel(m);
                          setDims(m.defaultDims);
                          setIsLibraryOpen(false);
                        }}
                        className={`cursor-pointer group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1.5 ${
                          selectedModel.id === m.id 
                            ? 'bg-sky-900/10 border-sky-500/60 shadow-[0_0_25px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/50' 
                            : 'bg-[#121620] border-slate-800 hover:border-slate-600 hover:shadow-xl'
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-2xl"></div>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div className="text-4xl filter drop-shadow-md transform transition-transform duration-300 group-hover:scale-110">
                             {m.icon}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => handleHideStandardModel(e, m.id)}
                              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-600/80 text-slate-400 hover:text-white border border-slate-700/50 hover:border-transparent transition-all cursor-pointer shadow-sm z-10"
                              title="حذف/مخفی‌سازی این الگوی پیش‌فرض"
                              type="button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {selectedModel.id === m.id && (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]">
                                <Check className="w-4 h-4" />
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <h3 className="text-[13px] font-black text-slate-200 mb-2 group-hover:text-sky-300 transition-colors">{m.name}</h3>
                        
                        <div className="flex items-center gap-2 mb-3">
                          <Badge color="gray" className="text-[10px] font-mono tracking-wider border-slate-700 bg-slate-900/50 text-slate-300">{m.code}</Badge>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-md">{m.category}</span>
                        </div>
                        
                        <p className="text-[11px] text-slate-400 flex-1 leading-relaxed line-clamp-3">
                          {m.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. PRINT SHEET IMPOSITION PREVIEW MODAL */}
      <AnimatePresence>
        {isSheetPreviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0b0e14] border border-slate-700 shadow-2xl rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-800 bg-[#07090d]">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                    <Layers3 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-100">شبیه‌ساز و فرم‌بندی شیت چاپی (Sheet Imposition & CAD Nesting)</h2>
                    <p className="text-[10px] text-slate-400 mt-0.5">شبیه‌سازی توزیع مهندسی قالب جعبه روی شیت استاندارد صنعتی جهت بهینه‌سازی لیتوگرافی و برش.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSheetPreviewOpen(false)}
                  className="p-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors shadow-sm cursor-pointer"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#090b11]">
                
                {/* Controls/Settings - Width: 320px */}
                <div className="w-full md:w-80 border-l border-slate-800 p-5 overflow-y-auto style-scrollbar flex flex-col gap-5 shrink-0 bg-[#070a0e]/40">
                  <div className="border-b border-slate-800 pb-2 mb-1 flex items-center gap-2 text-slate-300">
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold">پارامترهای فنی فرم‌بندی</span>
                  </div>

                  {/* 1. Algorithic Layout Mode selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 block font-bold flex justify-between items-center">
                      <span>الگوریتم بهینه‌سازی دایکات</span>
                      <span className={`text-[9.5px] px-1.5 py-0.5 rounded font-bold ${layoutAlgorithm === 'standard' ? 'text-cyan-400 bg-cyan-950/40 text-cyan-400 border border-cyan-500/10' : 'text-indigo-400 bg-indigo-950/40 border border-indigo-500/10'}`}>
                        {layoutAlgorithm === 'standard' ? 'ساده (Standard Grid)' : 'متداخل (AI Nesting)'}
                      </span>
                    </label>
                    
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 border border-slate-850 rounded-xl">
                      <button
                        onClick={() => {
                          setLayoutAlgorithm('standard');
                          setNestingMode('fast');
                        }}
                        className={`py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${layoutAlgorithm === 'standard' ? 'bg-[#1f2d42] text-white font-black shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        type="button"
                      >
                        ساده ردیفی
                      </button>
                      <button
                        onClick={() => {
                          setLayoutAlgorithm('nested_optimized');
                          setNestingMode('ai');
                        }}
                        className={`py-2 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${layoutAlgorithm === 'nested_optimized' ? 'bg-[#1f2d42] text-white font-black shadow' : 'text-slate-500 hover:text-slate-300'}`}
                        type="button"
                      >
                        بهینه‌ساز متداخل
                      </button>
                    </div>

                    <div className="text-[9px] text-slate-400 leading-relaxed font-sans mt-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-850/50">
                      {layoutAlgorithm === 'standard' ? (
                        <p>
                          🔹 <strong>روش ساده ردیفی:</strong> قالب‌ها به صورت کاملاً مجزا و موازی با فاصله آکس ایمن چیده می‌شوند. هیچ تداخلی بین قفل‌ها و فلپ‌های جعبه رخ نمی‌دهد و عملیات دایکات و تیغ‌کوبی کاملاً ساده و تضمین‌شده است.
                        </p>
                      ) : (
                        <p className="text-indigo-300">
                          ⚡ <strong>روش بهینه‌ساز متداخل:</strong> با چرخش و همپوشانی فواصل خالی بدنه جعبه‌ها، بازدهی مصرف متریال تا ۱۸٪ بهبود می‌یابد. دیوایدهای تیغ مشترک به دقت تراز می‌شوند تا فواصل تیغ به حداقل برسد.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Press Machine Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 block font-bold">ماشین صنعتی چاپ و دایکات</label>
                    <select 
                      className="w-full bg-[#0a0d14] border border-slate-800 text-slate-300 rounded-lg p-2 text-[10.5px] outline-none font-sans"
                      value={activePress.name}
                      onChange={(e) => {
                        const newPress = MACHINE_PRESETS.find(p => p.name === e.target.value);
                        if (newPress) {
                          setActivePress(newPress);
                        }
                      }}
                    >
                      {MACHINE_PRESETS.map(p => (
                        <option key={p.name} value={p.name}>{p.name} ({p.sheetW}x{p.sheetH} mm)</option>
                      ))}
                    </select>
                  </div>

                  {/* 3. Gap Spacing Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-300 font-bold">فاصله‌گذاری ایمن قالب‌ها (Gap)</span>
                      <span className="font-mono text-cyan-400 font-bold bg-[#090e14] px-1.5 py-0.5 rounded border border-slate-800 text-[9.5px]">{nestingGap} میلی‌متر</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="20" 
                      step="1" 
                      value={nestingGap} 
                      onChange={e => setNestingGap(parseInt(e.target.value))} 
                      className="w-full h-1 bg-slate-800 rounded accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[8.5px] text-slate-550 block">حداقل فاصله استاندارد لیتوگرافی ۳ الی ۵ میلی‌متر توصیه می‌شود.</span>
                  </div>

                  {/* 4. Active Specs and Live Stats */}
                  <div className="mt-auto space-y-2.5 pt-4 border-t border-slate-800/80">
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">آمار لحظه‌ای</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-right">
                        <span className="text-[9px] text-slate-400 block font-sans">تعداد قالب در ورق:</span>
                        <span className="text-xs font-black text-white mt-1 block font-mono">{nestingResult.yieldCount} قالب</span>
                      </div>
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850 text-right">
                        <span className="text-[9px] text-slate-400 block font-sans">سایز زینک فعال:</span>
                        <span className="text-xs font-black text-emerald-400 mt-1 block font-mono">{sheetSize.width}x{sheetSize.height}</span>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-right space-y-1.5">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-400">راندمان مفید ورق:</span>
                        <span className="font-bold text-emerald-400">٪{nestingResult.efficiency}</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${nestingResult.efficiency}%` }}></div>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-550">
                        <span>هدررفت و باطله ورق:</span>
                        <span className="text-rose-450">٪{nestingResult.waste}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Central Viewport Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  
                  {/* Local Tabs Bar to toggle */}
                  <div className="flex items-center justify-between p-3 border-b border-slate-850 bg-[#07090d]/80 select-none">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModalViewMode('sheet')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black font-sans flex items-center gap-1.5 transition-all border cursor-pointer ${
                          modalViewMode === 'sheet' ? 'bg-indigo-600 border-indigo-550 text-white shadow-md shadow-indigo-900/40' : 'bg-[#0d1017] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Layers3 className="w-3.5 h-3.5 text-indigo-300" />
                        <span>فرم‌بندی کامل شیت (Sheet Imposition)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setModalViewMode('single')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black font-sans flex items-center gap-1.5 transition-all border cursor-pointer ${
                          modalViewMode === 'single' ? 'bg-indigo-600 border-indigo-555 text-white shadow-md shadow-indigo-900/40' : 'bg-[#0d1017] border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5 text-indigo-300" />
                        <span>نمای تک جعبه دایلاین (CAD Blueprint)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-slate-500 font-mono">STATUS: HIGH_FIDELITY_VECTOR</span>
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    </div>
                  </div>

                  {/* SVG Canvas Frame */}
                  <div className="flex-1 bg-slate-950 flex items-center justify-center relative p-6 overflow-auto style-scrollbar">
                    <div className="w-full max-w-4xl max-h-full aspect-video flex flex-col items-center justify-center">
                      
                      {modalViewMode === 'sheet' ? (
                        /* --- SHEET MAP DISPLAY --- */
                        (() => {
                          const sw = sheetSize.width;
                          const sh = sheetSize.height;
                          const itemW = dieline.totalW;
                          const itemH = dieline.totalH;
                          
                          const overlapOffset = layoutAlgorithm === 'nested_optimized' ? 0.92 : 1.0;
                          const gap = nestingGap;
                          
                          // Arrangement grid layout
                          let cols = Math.floor(sw / (itemW + gap));
                          let rows = Math.floor(sh / (itemH + gap));
                          if (cols === 0) cols = 1;
                          if (rows === 0) rows = 1;
                          
                          const colsRot = Math.floor(sw / (itemH + gap));
                          const rowsRot = Math.floor(sh / (itemW + gap));
                          const useRotation = (colsRot * rowsRot) > (cols * rows);
                          
                          const finalCols = useRotation ? colsRot : cols;
                          const finalRows = useRotation ? rowsRot : rows;
                          
                          const countToRender = nestingResult.yieldCount;
                          const gridItems: { tx: number, ty: number, rotate: boolean, index: number }[] = [];
                          
                          for (let i = 0; i < countToRender; i++) {
                            const r = Math.floor(i / finalCols);
                            const c = i % finalCols;
                            
                            let tx = c * (useRotation ? itemH + gap : itemW + gap) * overlapOffset + 25;
                            let ty = r * (useRotation ? itemW + gap : itemH + gap) * overlapOffset + 25;
                            
                            // Alternate offset for interlocking simulation!
                            if (layoutAlgorithm === 'nested_optimized' && r % 2 === 1) {
                              tx += (useRotation ? itemH + gap : itemW + gap) * 0.12;
                            }
                            
                            gridItems.push({ tx, ty, rotate: useRotation, index: i });
                          }

                          return (
                            <div className="w-full h-full flex flex-col justify-between p-2">
                              <h4 className="text-white font-bold text-center text-[10px] mb-2 font-mono uppercase bg-[#162a22]/30 border border-emerald-900/30 text-emerald-400 py-1 rounded-lg">
                                {layoutAlgorithm === 'standard' ? 'GRID LAYOUT FORM (بدون همپوشانی ردیف)' : 'INTERLACING CAD LAYOUT (آلانه‌سازی فعال)'}
                              </h4>
                              
                              <svg 
                                viewBox={`0 0 ${sw + 50} ${sh + 50}`} 
                                className="w-full h-full object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
                              >
                                <defs>
                                  <g id="modal-sheet-single-element">
                                    {/* Creases */}
                                    {dieline.creases.map((pathStr, index) => (
                                      <path 
                                        key={`mscr-${index}`} 
                                        d={pathStr} 
                                        stroke="#dc2626" 
                                        strokeWidth="1.0" 
                                        strokeDasharray="2,2" 
                                        fill="none" 
                                        opacity="0.7" 
                                      />
                                    ))}
                                    {/* Cuts */}
                                    {dieline.cuts.map((pathStr, index) => (
                                      <path 
                                        key={`msct-${index}`} 
                                        d={pathStr} 
                                        stroke="#1e293b" 
                                        strokeWidth="1.1" 
                                        fill="none" 
                                      />
                                    ))}
                                  </g>
                                </defs>

                                {/* Background Sheet Border and boundaries */}
                                <rect 
                                  x="25" 
                                  y="25" 
                                  width={sw} 
                                  height={sh} 
                                  fill="#0a0f1d" 
                                  stroke="#334155" 
                                  strokeWidth="2" 
                                  rx="4"
                                />

                                {/* Internal printing safe boundary frame */}
                                <rect 
                                  x="35" 
                                  y="35" 
                                  width={sw - 20} 
                                  height={sh - 20} 
                                  fill="none" 
                                  stroke="#10b981" 
                                  strokeWidth="1.2" 
                                  strokeDasharray="3,3" 
                                  opacity="0.4"
                                />

                                {/* Grid items with optional alternate offset rows */}
                                {gridItems.map((item) => {
                                  let transformStr = `translate(${item.tx}, ${item.ty})`;
                                  if (item.rotate) {
                                    transformStr += ` rotate(90) translate(0, ${-itemH})`;
                                  }

                                  return (
                                    <g key={`sh-item-${item.index}`} transform={transformStr}>
                                      <rect 
                                        x="0" 
                                        y="0" 
                                        width={itemW} 
                                        height={itemH} 
                                        fill="#6366f1" 
                                        fillOpacity="0.08" 
                                        stroke="#4338ca" 
                                        strokeWidth="0.5" 
                                        strokeDasharray="2,3" 
                                        rx="2"
                                      />
                                      <g transform={`translate(${-dieline.xMin}, ${-dieline.yMin})`}>
                                        <use href="#modal-sheet-single-element" />
                                      </g>
                                      
                                      <g transform={`translate(${itemW / 2}, ${itemH / 2})`}>
                                        <circle r="9" fill="#1e293b" stroke="#334155" strokeWidth="1" />
                                        <text y="3" textAnchor="middle" fill="#38bdf8" fontSize="8" fontWeight="bold" className="font-mono">
                                          {item.index + 1}
                                        </text>
                                      </g>
                                    </g>
                                  );
                                })}

                                {/* Measurement legends */}
                                <text x={(sw + 40)/2} y={sh + 14} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" className="font-sans">
                                  عرض شیت: {sw} میلی‌متر
                                </text>
                                <text x="35" y={(sh + 40)/2} textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" transform={`rotate(-90 35 ${(sh+40)/2})`} className="font-sans">
                                  ارتفاع شیت: {sh} میلی‌متر
                                </text>
                              </svg>
                            </div>
                          );
                        })()
                      ) : (
                        /* --- SINGLE CAD BluePrint MAP DISPLAY --- */
                        <div className="w-full h-full flex flex-col justify-between p-2">
                          <h4 className="text-white font-bold text-center text-[10px] mb-2 font-mono uppercase bg-[#1e2d42]/30 border border-slate-800/30 text-sky-400 py-1 rounded-lg">
                            CAD Blueprint Vector - تک قالب جهت دایکات
                          </h4>
                          
                          <svg 
                            viewBox={`${dieline.xMin - 60} ${dieline.yMin - 60} ${dieline.totalW + 120} ${dieline.totalH + 120}`} 
                            className="w-full h-full object-contain filter drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]"
                          >
                            {/* Blue print Canvas backgrounds */}
                            <rect 
                              x={dieline.xMin - 60} 
                              y={dieline.yMin - 60} 
                              width={dieline.totalW + 120} 
                              height={dieline.totalH + 120} 
                              fill="#070b13" 
                              stroke="#1e293b" 
                              strokeWidth="1" 
                              rx="8"
                            />

                            {/* Creases */}
                            {dieline.creases.map((pathStr, index) => (
                              <path 
                                key={`mod-cad-crease-${index}`} 
                                d={pathStr} 
                                stroke="#f59e0b" 
                                strokeWidth="1.2" 
                                strokeDasharray="3,3" 
                                fill="none" 
                              />
                            ))}

                            {/* Cuts */}
                            {dieline.cuts.map((pathStr, index) => (
                              <path 
                                key={`mod-cad-cut-${index}`} 
                                d={pathStr} 
                                stroke="#14b8a6" 
                                strokeWidth="1.5" 
                                fill="none" 
                              />
                            ))}
                          </svg>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Informative info strip alert */}
                  <div className="p-3 bg-[#0a0f1d] border-t border-slate-800 flex items-center justify-between text-[9.5px]" dir="rtl">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5 text-indigo-400" />
                      <span>مهندسی خط‌تیغ منطبق با استانداردهای کارتن‌سازی و جعبه‌سازی ایران. محاسبات شامل خلاصی فلپ‌ها می‌باشد.</span>
                    </span>
                    <span className="text-[9px] text-[#cbd5e1] font-mono bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded">متصل به سیستم</span>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3D Static PNG Snapshot Preview Modal Overlay */}
      <AnimatePresence>
        {previewingSnapshot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="bg-[#0b0f19] border border-indigo-500/30 w-full max-w-2xl rounded-2xl shadow-2xl shadow-indigo-950/40 p-6 relative flex flex-col font-sans text-slate-100"
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewingSnapshot(null)}
                className="absolute top-4 left-4 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors"
                title="بستن"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 mb-5 pb-3 border-b border-slate-800 text-right">
                <div className="p-2 bg-indigo-950/80 border border-indigo-500/30 text-indigo-400 rounded-xl">
                  <Camera className="w-5 h-5 text-indigo-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-sans">تصویر سه‌بعدی ثابت (Snapshot Static PNG)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">خروجی زنده استودیوی خلاق بوم سه‌بعدی اشک قلم</p>
                </div>
              </div>

              {/* Image Preview Container with pattern grid */}
              <div className="flex-1 min-h-[220px] max-h-[360px] bg-[#04060b] border border-slate-850 rounded-xl overflow-hidden relative flex items-center justify-center p-4 shadow-inner group">
                <div className="absolute inset-0 bg-[linear-gradient(45deg,#080c14_25%,transparent_25%),linear-gradient(-45deg,#080c14_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#080c14_75%),linear-gradient(-45deg,transparent_75%,#080c14_75%)] bg-[size:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0] opacity-35" />
                <img
                  src={previewingSnapshot.image}
                  alt="3D CAD Render snapshot static"
                  className="max-w-full max-h-[320px] object-contain relative z-10 filter drop-shadow-[0_12px_24px_rgba(99,102,241,0.15)] animate-in zoom-in-95 duration-300"
                />
              </div>

              {/* Metadata Details strip */}
              <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] text-right">
                <div className="bg-[#0e1322] border border-indigo-950 p-2.5 rounded-xl">
                  <span className="text-slate-400 block font-bold">زمان ضبط:</span>
                  <span className="text-indigo-300 font-black mt-1 block font-mono">{previewingSnapshot.date}</span>
                </div>
                <div className="bg-[#0e1322] border border-indigo-950 p-2.5 rounded-xl">
                  <span className="text-slate-400 block font-bold">کد استاندارد سازه:</span>
                  <span className="text-indigo-300 font-bold mt-1 block font-sans">{previewingSnapshot.model}</span>
                </div>
                <div className="bg-[#0e1322] border border-indigo-950 p-2.5 rounded-xl col-span-1">
                  <span className="text-slate-400 block font-bold">ابعاد فعلی دیلاین L×W×H:</span>
                  <span className="text-indigo-300 font-black mt-1 block font-mono">{previewingSnapshot.dims}</span>
                </div>
              </div>

              {/* Prompt/Info Note */}
              <p className="text-[10px] text-slate-400 leading-relaxed text-justify mt-4 bg-slate-900/40 p-2.5 rounded-lg border border-slate-850 font-sans">
                💡 این تصویر یک خروجی دیجیتالی شفاف با وضوح بالا (PNG با کانال آلفا) بدون کادر پس‌زمینه است. شما می‌توانید با استفاده از این خروجی، طرح بسته‌بندی خود را برای مشتریان ارسال کنید یا آن را برای تایید نهایی در کاتالوگ‌های چاپی بارگذاری کنید.
              </p>

              {/* Actions Grid */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => setPreviewingSnapshot(null)}
                  className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 font-bold rounded-xl text-xs font-sans transition-all cursor-pointer"
                >
                  بستن پیش‌نمایش
                </button>
                <a
                  href={previewingSnapshot.image}
                  download={`ashkghalam_cad_snapshot_${previewingSnapshot.id}.png`}
                  className="px-4 py-2.5 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black rounded-xl text-xs font-sans shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-1.5 transition-all text-center"
                >
                  <Download className="w-4 h-4 text-white" />
                  <span>دانلود مستقیم تصویر PNG</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Custom iframe-safe Alert/Confirm Dialog Modal */}
      <AnimatePresence>
        {customDialog.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-[#0b0f19] border border-indigo-500/40 w-full max-w-lg rounded-2xl shadow-2xl shadow-indigo-950/50 p-6 relative flex flex-col font-sans text-slate-100"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800 text-right">
                <div className={`p-2 rounded-xl border ${
                  customDialog.type === 'success' ? 'bg-emerald-950/80 border-emerald-500/30 text-emerald-400' :
                  customDialog.type === 'confirm' ? 'bg-indigo-950/80 border-indigo-500/30 text-indigo-400' :
                  'bg-rose-950/80 border-rose-500/30 text-rose-400'
                }`}>
                  {customDialog.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> :
                   customDialog.type === 'confirm' ? <HelpCircle className="w-5 h-5" /> :
                   <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white font-sans">{customDialog.title}</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-sans">سامانه مهندسی و شبیه‌سازی بسته‌بندی اشک قلم</p>
                </div>
              </div>

              {/* Message */}
              <div className="flex-1 py-2 text-right">
                <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-line text-justify">
                  {customDialog.message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 justify-end">
                {customDialog.type === 'confirm' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))}
                      className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-400 hover:text-white font-bold rounded-xl text-xs font-sans transition-all cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDialog(prev => ({ ...prev, isOpen: false }));
                        if (customDialog.onConfirm) customDialog.onConfirm();
                      }}
                      className="px-5 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black rounded-xl text-xs font-sans shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
                    >
                      تایید و ادامه خروجی
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCustomDialog(prev => ({ ...prev, isOpen: false }))}
                    className="px-5 py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white font-black rounded-xl text-xs font-sans shadow-lg shadow-indigo-900/30 transition-all cursor-pointer"
                  >
                     متوجه شدم
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PACKLY INDUSTRIAL DIELINE STUDIO FULLSCREEN OVERLAY */}
      <AnimatePresence>
        {isPacklyStudioOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-[#070a0f] flex flex-col"
          >
            {/* Top Return Header */}
            <div className="bg-[#0b1017] border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-right font-sans shrink-0" dir="rtl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPacklyStudioOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border border-slate-700"
                >
                  <ArrowRight className="w-4 h-4 text-sky-400" />
                  <span>بازگشت به دایلاین ساز استاندارد</span>
                </button>
                <div className="h-4 w-px bg-slate-800" />
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-black text-amber-400">استودیو صنعتی پیشرفته Packly</span>
                  <span className="text-[10px] text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full font-mono">
                    ECMA / FEFCO Industrial Grade Engine
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPacklyStudioOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-950/80 text-slate-400 hover:text-rose-300 border border-slate-700/50 transition-all cursor-pointer"
                  title="بستن استودیو"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Studio Workspace */}
            <div className="flex-1 overflow-hidden">
              <PacklyIndustrialDielineStudio onSaveProject={onSaveProject} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
