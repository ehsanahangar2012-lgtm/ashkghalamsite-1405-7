import React from 'react';
import { Ruler, ShieldCheck, Box, Minimize, Cpu, RefreshCw, Layers } from 'lucide-react';

interface PropertyInspectorProps {
  selectedModel: {
    id: string;
    name: string;
    code: string;
    category: string;
    description: string;
  };
  dims: { L: number; W: number; H: number };
  material: {
    name: string;
    category: string;
    thickness: number;
    weight: number;
  };
  geometryReport: {
    score: number;
    passed: boolean;
    cutLength: number;
    creaseLength: number;
    bleedArea: number;
    glueArea: number;
    sheetSize: { width: number; height: number };
    materialUsage: number;
  };
  grainDirection: 'long' | 'short';
  unit: 'mm' | 'cm' | 'inches';
  formatUnitLabel: (u: string) => string;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
  selectedModel,
  dims,
  material,
  geometryReport,
  grainDirection,
  unit,
  formatUnitLabel,
}) => {
  return (
    <div className="space-y-3 font-sans" dir="rtl">
      {/* Title block */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 mb-1">
        <Cpu className="w-4 h-4 text-emerald-400" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wide">بازرس خصوصیات هندسی و ساختاری</span>
      </div>

      {/* Target Model details */}
      <div className="bg-[#05080f]/70 border border-slate-900 rounded-xl p-2.5 space-y-2">
        <div className="flex justify-between items-center text-[9.5px]">
          <span className="text-slate-520">الگوی فعال جاری:</span>
          <strong className="text-sky-400 font-bold max-w-[150px] truncate">{selectedModel.name}</strong>
        </div>
        <div className="flex justify-between items-center text-[9px] font-mono">
          <span className="text-slate-500">کد استاندارد:</span>
          <strong className="text-slate-300">{selectedModel.code} ({selectedModel.category})</strong>
        </div>
      </div>

      {/* Dimensional ratios and dimensions */}
      <div className="bg-[#05080f]/70 border border-slate-900 rounded-xl p-2.5 space-y-1.5 text-[9.5px]">
        <div className="flex justify-between">
          <span className="text-slate-520">ابعاد باز شده:</span>
          <strong className="text-slate-200 font-mono">
            {Math.round(geometryReport.sheetSize.width)} × {Math.round(geometryReport.sheetSize.height)} mm
          </strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-520">محیط برش تیغ (Cut):</span>
          <strong className="text-amber-500 font-mono">{Math.round(geometryReport.cutLength).toLocaleString()} mm</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-520">محیط تای خطی (Crease):</span>
          <strong className="text-emerald-400 font-mono">{Math.round(geometryReport.creaseLength).toLocaleString()} mm</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-520">جهت راه الیاف کاغذ (Grain):</span>
          <strong className="text-indigo-400">{grainDirection === 'long' ? 'راه طولی (گرین موازی)' : 'راه عرضی (گرین متقاطع)'}</strong>
        </div>
      </div>

      {/* Material profile */}
      <div className="bg-[#05080f]/70 border border-slate-900 rounded-xl p-2.5 text-[9px] space-y-1">
        <span className="text-[8px] text-slate-500 block uppercase font-bold">بستر فیزیکی و مقاومت فلوت</span>
        <div className="flex justify-between">
          <span className="text-slate-400">شاسی متریال:</span>
          <strong className="text-slate-250 truncate block max-w-[160px] text-left">{material.name}</strong>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">کالیبر ضخامت:</span>
          <strong className="text-slate-250 font-mono">{material.thickness} mm / {material.weight} gsm</strong>
        </div>
      </div>

      {/* Compliance badge */}
      <div className="flex gap-2 items-center bg-slate-950/40 border border-slate-850 p-2 rounded-xl">
        <ShieldCheck className={`w-5 h-5 shrink-0 ${geometryReport.passed ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`} />
        <div className="flex-1 min-w-0">
          <span className="text-[8px] text-slate-505 block">صلاحیت تولید کارگاهی:</span>
          <span className={`text-[9.5px] font-black block ${geometryReport.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
            {geometryReport.passed ? 'مورد تایید استانداردهای بسته‌بندی' : 'مسدود به علت ابعاد ناپایدار'}
          </span>
        </div>
      </div>
    </div>
  );
};
