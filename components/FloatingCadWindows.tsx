import React, { useState } from 'react';
import { 
  Shapes, Ruler as RulerIcon, Box, Settings, Layers3, Calculator, 
  Info, ShieldAlert, Sparkles, FileText, Send, Camera,
  ChevronDown, ChevronUp, HelpCircle
} from 'lucide-react';
import { DockableWindow } from './DockableWindow';
import { Badge } from './UIComponents';
import { DimensionInput } from './DimensionInput';
import { BoundingBoxPreview } from './BoundingBoxPreview';

// --- Types ---
interface PackagingModel {
  id: string;
  name: string;
  code: string; 
  category: string;
  icon: string;
  defaultDims: { L: number, W: number, H: number };
  description: string;
}

interface MaterialPreset {
  id: string;
  name: string;
  weight: number;
  thickness: number;
  color: string;
  type: string;
}

// =========================================================================
// 1. STANDARDS LIBRARY WINDOW
// =========================================================================
interface StandardsLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredModels: PackagingModel[];
  selectedModel: PackagingModel;
  handleModelSelect: (model: PackagingModel) => void;
}

export const StandardsLibraryWindow: React.FC<StandardsLibraryProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  searchQuery, setSearchQuery, filteredModels, selectedModel, handleModelSelect
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [showHelp, setShowHelp] = useState(false);

  const categories = [
    { id: 'all', label: 'همه الگوها' },
    { id: 'دارویی', label: 'دارویی و بهداشتی' },
    { id: 'پستی', label: 'کارتن پستی' },
    { id: 'فست‌فود', label: 'فست‌فود و غذا' },
    { id: 'کیبوردی', label: 'کیبوردی لپ‌تاپی' },
    { id: 'هاردباکس', label: 'هاردباکس و لوکس' },
  ];

  const displayedModels = filteredModels.filter(m => {
    if (activeCategoryFilter === 'all') return true;
    return m.category?.includes(activeCategoryFilter) || m.name?.includes(activeCategoryFilter);
  });

  return (
    <DockableWindow
      id="standards_library"
      title="مخزن استانداردهای اروپا و بین‌الملل (Standards)"
      icon={Shapes}
      isOpen={isOpen}
      onClose={onClose}
      initialX={30}
      initialY={80}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-3.5 overflow-y-auto h-full text-right flex flex-col font-sans" dir="rtl">
        {/* Top Search & Help Bar */}
        <div className="shrink-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-bold text-slate-400 font-sans">جستجو در لایبرری استانداردهای دایکات:</label>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="w-5 h-5 rounded-full bg-slate-800 hover:bg-slate-700 text-sky-400 flex items-center justify-center text-[10px] font-bold transition-colors cursor-pointer"
              title="راهنمای استانداردها"
            >
              ?
            </button>
          </div>

          {showHelp && (
            <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-[10.5px] text-sky-200 leading-relaxed">
              💡 <strong>راهنما:</strong> تمام الگوها مطابق کدهای مرجع استاندارد جهانی FEFCO و اتحادیه ECMA پیاده‌سازی شده و پارامترهای دایکات و شیارزنی را به‌صورت میلی‌متری محاسبه می‌کنند.
            </div>
          )}

          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="کد FEFCO یا استاندارد ECMA یا نام الگو..."
            className="w-full bg-[#070a0e] border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-slate-600 font-sans"
          />

          {/* Quick Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setActiveCategoryFilter(c.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategoryFilter === c.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Models List */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 border border-slate-800/85 rounded-xl p-1 bg-[#070a0e]/40 custom-scrollbar">
          <div className="flex items-center justify-between px-1.5 py-1 mb-1 border-b border-slate-900">
            <span className="text-[9.5px] font-black text-slate-500 uppercase">استانداردهای قالب فعال:</span>
            <span className="text-[9px] font-mono text-sky-400 bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-800/40">
              {displayedModels.length} الگو
            </span>
          </div>

          <div className="space-y-1.5">
            {displayedModels.map(m => (
              <div 
                key={m.id} 
                onClick={() => handleModelSelect(m)} 
                className={`cursor-pointer p-2.5 rounded-xl border text-right transition-all flex items-center gap-2.5 ${
                  selectedModel.id === m.id 
                    ? 'border-sky-500 bg-sky-950/30 shadow-md shadow-sky-950/20' 
                    : 'border-slate-800/80 hover:border-slate-700 hover:bg-[#161b22]/40'
                }`}
              >
                <div className="text-xl filter drop-shadow bg-slate-900/90 w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-slate-800">
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className={`text-[11px] font-bold ${selectedModel.id === m.id ? 'text-sky-400' : 'text-slate-200'} truncate font-sans`}>
                      {m.name}
                    </p>
                    {m.defaultDims && (
                      <span className="text-[8.5px] font-mono text-slate-400 bg-slate-900 px-1 rounded border border-slate-800 shrink-0" dir="ltr">
                        {m.defaultDims.L}×{m.defaultDims.W}×{m.defaultDims.H}
                      </span>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase mt-0.5">
                    {m.code} • {m.category}
                  </p>
                </div>
                {selectedModel.id === m.id && (
                  <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Model Details Box */}
        {selectedModel && (
          <div className="shrink-0 bg-[#050911] p-3 rounded-xl border border-slate-800/70 text-[10.5px] text-slate-400 leading-relaxed font-sans shadow-inner">
            <div className="flex items-center justify-between mb-1.5 border-b border-slate-800/60 pb-1">
              <strong className="text-sky-400 font-bold text-[11px]">
                استاندارد مرجع: {selectedModel.code} ({selectedModel.name})
              </strong>
              <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                فرمولاسیون کالیبره
              </span>
            </div>
            <p className="text-[10px] text-slate-300 leading-normal">{selectedModel.description}</p>
          </div>
        )}
      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 2. BOX DIMENSIONS WINDOW
// =========================================================================
interface BoxDimensionsProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  unit: 'mm' | 'cm' | 'inches';
  setUnit: (u: 'mm' | 'cm' | 'inches') => void;
  dims: { L: number; W: number; H: number };
  setDims: (d: { L: number; W: number; H: number }) => void;
  grainDirection: 'long' | 'short';
  setGrainDirection: (g: 'long' | 'short') => void;
  convertMmToUnit: (val: number, currentUnit: 'mm' | 'cm' | 'inches') => number;
  convertUnitToMm: (val: number, currentUnit: 'mm' | 'cm' | 'inches') => number;
  bleedOffset: number;
  setBleedOffset: (b: number) => void;
}

export const BoxDimensionsWindow: React.FC<BoxDimensionsProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  unit, setUnit, dims, setDims, grainDirection, setGrainDirection,
  convertMmToUnit, convertUnitToMm,
  bleedOffset, setBleedOffset
}) => {
  // Accordion toggle state
  const [toggleSections, setToggleSections] = useState({
    geometric: true,
    grain: true,
  });

  // Help tooltip states
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const toggleSection = (sec: 'geometric' | 'grain') => {
    setToggleSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const getEngineeringHelp = (param: string) => {
    switch (param) {
      case 'L':
        return 'طول (L): دهانه اصلی کارتن (موازی خط تاخوردگی) است که بیشترین تأثیر را روی صلبیت طولی دارد (DIN 55468).';
      case 'W':
        return 'عرض (W): اندازه عرض کارتن که به عنوان مبنای پایداری و موازنه لبه ورق مایکروویو در خط لیتوگرافی ارزیابی می‌شود (استاندارد ECMA).';
      case 'H':
        return 'ارتفاع (H): بعد باربر فشاری عمودی؛ جهت ایستایی بهینه‌ترین مقاومت خمشی (خزش BCT) را فراهم می‌آورد (استاندارد FEFCO).';
      case 'grain':
        return 'جهت گرین: مسیر الیاف کاغذ فیزیکی یا خط تا افقی؛ تنظیم اصولی گرین مانع ترکیدگی لبه‌ها در گام دایکات نهایی می‌شود (ISO 3037).';
      default:
        return '';
    }
  };

  return (
    <DockableWindow
      id="box_dimensions"
      title="ابعاد فیزیکی ورودی جعبه"
      icon={RulerIcon}
      isOpen={isOpen}
      onClose={onClose}
      initialX={380}
      initialY={80}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-3.5 space-y-3 overflow-y-auto h-full text-right custom-scrollbar" dir="rtl">
        
        {/* Accordion 1: ابعاد هندسی بدنه */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070a0e]/40">
          <button
            type="button"
            onClick={() => toggleSection('geometric')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#090d16] hover:bg-[#111724] transition-colors border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <RulerIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-[11px] font-black text-slate-200 font-sans-bold">ابعاد هندسی بدنه (Dimensions)</span>
            </div>
            {toggleSections.geometric ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {toggleSections.geometric && (
            <div className="p-3 space-y-3.5">
              {/* Unit selection */}
              <div className="flex items-center justify-between p-1 bg-[#04060b] border border-slate-850 rounded-lg mb-1 gap-1">
                <span className="text-[9px] text-slate-450 px-1 font-sans">واحد ابعاد:</span>
                <div className="flex items-center gap-1">
                  {(['mm', 'cm', 'inches'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`text-[8.5px] px-1.5 py-0.5 rounded-md font-bold transition-all ${unit === u ? 'bg-indigo-600 text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                      type="button"
                    >
                      {u === 'mm' ? 'mm' : u === 'cm' ? 'cm' : 'inch'}
                    </button>
                  ))}
                </div>
              </div>

              <BoundingBoxPreview 
                L={convertMmToUnit(dims.L, unit)} 
                W={convertMmToUnit(dims.W, unit)} 
                H={convertMmToUnit(dims.H, unit)} 
              />

              {[
                { key: 'L', label: 'طول جعبه (L)' },
                { key: 'W', label: 'عرض جعبه (W)' },
                { key: 'H', label: 'ارتفاع جعبه (H)' }
              ].map(param => (
                <div key={param.key} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10.5px] text-slate-300 font-sans">{param.label}</span>
                      <button
                        type="button"
                        onClick={() => setActiveHelp(activeHelp === param.key ? null : param.key)}
                        className={`p-0.5 rounded-full transition-all hover:bg-slate-800 ${activeHelp === param.key ? 'text-indigo-400' : 'text-slate-500'}`}
                        title="راهنمای مهندسی"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <DimensionInput
                      label=""
                      value={dims[param.key as keyof typeof dims]}
                      unit={unit}
                      onChange={(valInMm) => setDims({ ...dims, [param.key]: valInMm })}
                      convertMmToUnit={convertMmToUnit}
                      convertUnitToMm={convertUnitToMm}
                      className="hidden-label flex items-center"
                      inputClassName="w-24 bg-[#030508] border border-slate-850 rounded-lg py-1 px-2 text-center text-xs font-mono text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {activeHelp === param.key && (
                    <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/60 text-[9.5px] text-slate-400 leading-relaxed font-sans text-right animate-in fade-in duration-200">
                      <span className="text-indigo-400 font-bold block mb-0.5">📘 استاندارد مرتبط:</span>
                      {getEngineeringHelp(param.key)}
                    </div>
                  )}
                </div>
              ))}

              {/* Bleed Offset Range Input/Slider */}
              <div className="h-px bg-slate-850/60 my-2"></div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] font-bold text-slate-300 font-sans">محدوده آفست لبه چسب / برش فیزیکی (Bleed):</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={bleedOffset}
                      onChange={e => {
                        const englishVal = e.target.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
                        const parsed = Number(englishVal);
                        if (!isNaN(parsed) && englishVal !== '') setBleedOffset(Math.max(0, Math.min(100, parsed)));
                      }}
                      className="w-14 bg-[#030508] border border-slate-850 rounded-lg py-1 px-1.5 text-center text-xs font-mono text-white outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-[10px] text-slate-500">mm</span>
                  </div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="80" 
                  value={bleedOffset} 
                  onChange={e => setBleedOffset(Number(e.target.value))} 
                  className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-indigo-500" 
                />
              </div>

            </div>
          )}
        </div>

        {/* Accordion 2: شبیه‌سازی الیاف و راه موج */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070a0e]/40">
          <button
            type="button"
            onClick={() => toggleSection('grain')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#090d16] hover:bg-[#111724] transition-colors border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Layers3 className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-black text-slate-200 font-sans-bold">راستای گرین الیاف (Grain Flow)</span>
            </div>
            {toggleSections.grain ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {toggleSections.grain && (
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-300 font-sans">جهت گرین مقوای مصرفی:</span>
                    <button
                      type="button"
                      onClick={() => setActiveHelp(activeHelp === 'grain' ? null : 'grain')}
                      className={`p-0.5 rounded-full transition-all hover:bg-slate-800 ${activeHelp === 'grain' ? 'text-sky-400' : 'text-slate-500'}`}
                      title="راهنمای مهندسی"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <select 
                    value={grainDirection} 
                    onChange={e => setGrainDirection(e.target.value as any)}
                    className="bg-[#030508] border border-slate-850 rounded py-1 px-1.5 text-[9.5px] text-white font-sans focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="long">راستای گرین طولی (Long)</option>
                    <option value="short">راستای گرین عرضی (Short)</option>
                  </select>
                </div>

                {activeHelp === 'grain' && (
                  <div className="p-2.5 rounded-lg bg-sky-950/20 border border-sky-900/60 text-[9.5px] text-slate-400 leading-relaxed font-sans text-right animate-in fade-in duration-200">
                    <span className="text-sky-450 font-bold block mb-0.5">📘 استاندارد مرتبط:</span>
                    {getEngineeringHelp('grain')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 3. MATERIALS DATABASE WINDOW
// =========================================================================
interface MaterialsDbProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  material: MaterialPreset;
  setMaterial: (m: MaterialPreset) => void;
  MATERIAL_PRESETS: MaterialPreset[];
}

export const MaterialsDbWindow: React.FC<MaterialsDbProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  material, setMaterial, MATERIAL_PRESETS
}) => {
  return (
    <DockableWindow
      id="materials_db"
      title="بانک اطلاعات متریال صنعتی (Materials)"
      icon={Box}
      isOpen={isOpen}
      onClose={onClose}
      initialX={30}
      initialY={430}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-3 overflow-y-auto h-full text-right" dir="rtl">
        <label className="text-[10px] font-black text-slate-400 mb-2 block font-sans">ساختار الیاف و گراماژ مقوای فیزیکی دایکات:</label>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
          {MATERIAL_PRESETS.map(m => (
            <button 
              key={m.id} 
              onClick={() => setMaterial(m)}
              className={`w-full text-right px-3 py-2.5 text-[10.5px] rounded-lg border transition-all flex justify-between items-center ${material.id === m.id ? 'bg-indigo-950/40 border-sky-600 text-sky-400 font-bold' : 'bg-[#070a0e]/40 border-slate-800 text-slate-400 hover:bg-[#161b22]/30'}`}
              type="button"
            >
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full border border-slate-900" style={{ backgroundColor: m.color }}></div>
                <span className="font-sans font-bold">{m.name}</span>
              </div>
              <span className="text-[9.5px] font-mono text-slate-500 font-bold">{m.weight}g | {m.thickness}mm</span>
            </button>
          ))}
        </div>

        <div className="bg-[#060a12] border border-slate-800/60 p-3 rounded-xl mt-3 text-[10px] text-slate-400 leading-relaxed font-sans">
          <span className="text-emerald-450 font-bold block mb-1">💡 جبران ضخامت مقوا:</span>
          همگام با تغییر متریال، ضرایب کسر تا و پهنای ماتریس سنبه به طور خودکار طبق شیوه‌نامه‌های فیزیکی صنعت چاپ همسان‌سازی می‌شوند.
        </div>
      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 4. PROPERTIES & FX INSIGHTS WINDOW
// =========================================================================
interface PropertyInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  specialEffect: string;
  setSpecialEffect: (fx: string) => void;
  pdfQuality: string;
  setPdfQuality: (quality: string) => void;
  lineWidthStyle: string;
  setLineWidthStyle: (style: string) => void;
  viewMode: string;
  foldRatio: number;
  setFoldRatio: (ratio: number) => void;
}

export const PropertyInspectorWindow: React.FC<PropertyInspectorProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  specialEffect, setSpecialEffect, pdfQuality, setPdfQuality,
  lineWidthStyle, setLineWidthStyle, viewMode, foldRatio, setFoldRatio
}) => {
  // Accordion toggle state
  const [toggleSections, setToggleSections] = useState({
    industrial: true,
    drafting: true,
  });

  // Help tooltip states
  const [activeHelp, setActiveHelp] = useState<string | null>(null);

  const toggleSection = (sec: 'industrial' | 'drafting') => {
    setToggleSections(prev => ({ ...prev, [sec]: !prev[sec] }));
  };

  const getEngineeringHelp = (param: string) => {
    switch (param) {
      case 'fx':
        return 'جلوه‌ صنعتی (Industrial FX): انطباق یووی موضعی یا کلیشه فويل به حاشیه ۱.۵ میلی‌متری تخلیه چسب نیاز دارد تا روکش به درستی متصل شود.';
      case 'dpi':
        return 'کیفیت لایه‌برداری (DPI): رندر برداری بر اساس استاندارد خروجی چاپی PDF/X-1a جهت حفظ نهایت وضوح و ممانعت از رنجه شدن حاشیه ریز فونت‌ها.';
      case 'lineWidth':
        return 'ضخامت نقشه دایکات: پهنای خط تیغ برش بیرونی تمایز جدی با خطوط پلی‌استر ماتریس نیم‌تیغ‌زنی دارد تا خطا در قرائت نقشه توسط لیزر صفر شود.';
      case 'fold':
        return 'شبیه‌سازی سه لایه (ISO 2493): شبیه‌ساز رفتار الاستیک خمش وجوه در برابر گشتاور استاتیکی خمش؛ تسهیل فرآیند بسته‌بندی مکانیزه سرعت بالا.';
      default:
        return '';
    }
  };

  return (
    <DockableWindow
      id="property_inspector"
      title="ویژگی‌ها و افکت‌های اختصاصی"
      icon={Settings}
      isOpen={isOpen}
      onClose={onClose}
      initialX={window.innerWidth - 380}
      initialY={80}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-3.5 space-y-3 overflow-y-auto h-full text-right custom-scrollbar" dir="rtl">
        
        {/* Accordion 1: افکت‌های چاپی و صنعتی */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070a0e]/40">
          <button
            type="button"
            onClick={() => toggleSection('industrial')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#090d16] hover:bg-[#111724] transition-colors border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-black text-slate-200 font-sans-bold">جلوه‌های صنعتی فرآیند (FX Options)</span>
            </div>
            {toggleSections.industrial ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {toggleSections.industrial && (
            <div className="p-3 space-y-3.5">
              
              {/* FX Special Effects */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-350 font-bold font-sans">افکت‌های چاپی و صنعتی:</span>
                    <button
                      type="button"
                      onClick={() => setActiveHelp(activeHelp === 'fx' ? null : 'fx')}
                      className={`p-0.5 rounded-full transition-all hover:bg-slate-800 ${activeHelp === 'fx' ? 'text-amber-450' : 'text-slate-500'}`}
                      title="راهنمای مهندسی"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'none', label: 'خام بدون افکت' },
                    { id: 'gold_foil', label: 'طلاکوب متالایز' },
                    { id: 'uv_spot', label: 'UV موضعی برجسته' },
                    { id: 'both', label: 'طلاکوب + UV دوبل' }
                  ].map(eff => (
                    <button
                      key={eff.id}
                      onClick={() => setSpecialEffect(eff.id)}
                      className={`py-1.5 rounded-lg text-[9.5px] font-bold border transition-all font-sans ${specialEffect === eff.id ? 'bg-amber-600 border-amber-400 text-white shadow-md font-black' : 'bg-[#030508]/60 border-slate-850 text-slate-400 hover:text-slate-250'}`}
                      type="button"
                    >
                      {eff.label}
                    </button>
                  ))}
                </div>

                {activeHelp === 'fx' && (
                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-900/60 text-[9.5px] text-slate-400 leading-relaxed font-sans text-right animate-in fade-in duration-200">
                    <span className="text-amber-450 font-bold block mb-0.5">📘 استاندارد مرتبط:</span>
                    {getEngineeringHelp('fx')}
                  </div>
                )}
              </div>

              <div className="h-px bg-slate-850"></div>

              {/* PDF Quality */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-350 font-bold font-sans">کیفیت لایه‌ برداری خروجی</span>
                    <button
                      type="button"
                      onClick={() => setActiveHelp(activeHelp === 'dpi' ? null : 'dpi')}
                      className={`p-0.5 rounded-full transition-all hover:bg-slate-800 ${activeHelp === 'dpi' ? 'text-indigo-400' : 'text-slate-500'}`}
                      title="راهنمای مهندسی"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[8.5px] font-mono text-emerald-400 font-bold">{pdfQuality === 'high' ? '300 DPI' : '150 DPI'}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#030508] border border-slate-850 rounded-lg">
                  <button
                    onClick={() => setPdfQuality('standard')}
                    className={`py-1 rounded-md text-[8.5px] font-bold transition-all font-sans ${pdfQuality === 'standard' ? 'bg-[#1e293b] text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                    type="button"
                  >
                    استارتدرد (150 DPI)
                  </button>
                  <button
                    onClick={() => setPdfQuality('high')}
                    className={`py-1 rounded-md text-[8.5px] font-bold transition-all font-sans ${pdfQuality === 'high' ? 'bg-[#1e293b] text-white font-black' : 'text-slate-500 hover:text-slate-350'}`}
                    type="button"
                  >
                    عالی (300 DPI)
                  </button>
                </div>

                {activeHelp === 'dpi' && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/60 text-[9.5px] text-slate-400 leading-relaxed font-sans text-right animate-in fade-in duration-200">
                    <span className="text-indigo-450 font-bold block mb-0.5">📘 استاندارد مرتبط:</span>
                    {getEngineeringHelp('dpi')}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Accordion 2: ابزارهای رسم و کنترل فیزیکی */}
        <div className="border border-slate-800 rounded-xl overflow-hidden bg-[#070a0e]/40">
          <button
            type="button"
            onClick={() => toggleSection('drafting')}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-[#090d16] hover:bg-[#111724] transition-colors border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <RulerIcon className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-black text-slate-200 font-sans-bold">ضوابط نقشه و ترسیم (Drafting)</span>
            </div>
            {toggleSections.drafting ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {toggleSections.drafting && (
            <div className="p-3 space-y-3.5">
              
              {/* Line thickness */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-350 font-bold font-sans">ضخامت قلم ترسیم لایه‌ها</span>
                    <button
                      type="button"
                      onClick={() => setActiveHelp(activeHelp === 'lineWidth' ? null : 'lineWidth')}
                      className={`p-0.5 rounded-full transition-all hover:bg-slate-800 ${activeHelp === 'lineWidth' ? 'text-sky-400' : 'text-slate-500'}`}
                      title="راهنمای مهندسی"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[8.5px] font-mono text-sky-400 font-bold">{lineWidthStyle === 'bold' ? 'ضخیم' : 'ظریف'}</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-[#030508] border border-slate-850 rounded-lg">
                  <button
                    onClick={() => setLineWidthStyle('standard')}
                    className={`py-1 rounded-md text-[8.5px] font-bold transition-all font-sans ${lineWidthStyle === 'standard' ? 'bg-sky-600 text-white' : 'text-slate-550 hover:text-slate-450'}`}
                    type="button"
                  >
                    معمولی (0.3mm)
                  </button>
                  <button
                    onClick={() => setLineWidthStyle('bold')}
                    className={`py-1 rounded-md text-[8.5px] font-bold transition-all font-sans ${lineWidthStyle === 'bold' ? 'bg-sky-600 text-white' : 'text-slate-550 hover:text-slate-450'}`}
                    type="button"
                  >
                    ضخیم (0.6mm)
                  </button>
                </div>

                {activeHelp === 'lineWidth' && (
                  <div className="p-2.5 rounded-lg bg-sky-950/20 border border-sky-900/60 text-[9.5px] text-slate-400 leading-relaxed font-sans text-right animate-in fade-in duration-200">
                    <span className="text-sky-450 font-bold block mb-0.5">📘 استاندارد مرتبط:</span>
                    {getEngineeringHelp('lineWidth')}
                  </div>
                )}
              </div>

              {/* Fold angle slider */}
              {viewMode === '3d' && (
                <>
                  <div className="h-px bg-slate-850"></div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-350 font-bold font-sans">زاویه تا خوردن وجوه سه بعدی</span>
                        <button
                          type="button"
                          onClick={() => setActiveHelp(activeHelp === 'fold' ? null : 'fold')}
                          className={`p-0.5 rounded-full transition-all hover:bg-slate-800 ${activeHelp === 'fold' ? 'text-sky-400' : 'text-slate-500'}`}
                          title="راهنمای مهندسی"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-[8.5px] font-mono text-indigo-400 font-bold">{Math.round(foldRatio * 100)}%</span>
                    </div>

                    <input 
                      type="range" 
                      min="-1" 
                      max="1" 
                      step="0.01" 
                      value={foldRatio} 
                      onChange={e => setFoldRatio(parseFloat(e.target.value))} 
                      className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-sky-500" 
                    />

                    {activeHelp === 'fold' && (
                      <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/60 text-[9.5px] text-slate-400 leading-relaxed font-sans text-right animate-in fade-in duration-200">
                        <span className="text-indigo-450 font-bold block mb-0.5">📘 استاندارد مرتبط:</span>
                        {getEngineeringHelp('fold')}
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>
          )}
        </div>

      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 5. LAYERS PANEL WINDOW
// =========================================================================
interface LayerItem {
  id: string;
  name: string;
  color: string;
  isVisible: boolean;
  isLocked: boolean;
  type: string;
}

interface LayersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  layers: LayerItem[];
  setLayers: React.Dispatch<React.SetStateAction<LayerItem[]>>;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  bleedOffset: number;
  setBleedOffset: (b: number) => void;
}

export const LayersPanelWindow: React.FC<LayersPanelProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  layers, setLayers, snapToGrid, setSnapToGrid,
  bleedOffset, setBleedOffset
}) => {
  return (
    <DockableWindow
      id="layers_panel"
      title="مدیریت لایه‌ها و شابلون‌ها (Layers)"
      icon={Layers3}
      isOpen={isOpen}
      onClose={onClose}
      initialX={window.innerWidth - 380}
      initialY={430}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-3 overflow-y-auto h-full text-right animate-in fade-in" dir="rtl font-sans">
        <span className="text-[10.5px] text-slate-400 block mb-2 font-bold font-sans">کنترل وضعیت قفل و دید لایه‌ها:</span>
        <div className="space-y-1.5">
          {layers.map(layer => (
            <div key={layer.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[#070a0e]/60 border border-slate-800 text-[10px] font-sans">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }}></div>
                <span className="font-bold text-slate-200">{layer.name}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, isVisible: !l.isVisible } : l));
                  }}
                  className={`px-2 py-0.5 rounded text-[8.5px] font-black transition-all ${layer.isVisible ? 'bg-sky-950 text-sky-400 border border-sky-850' : 'bg-slate-950 text-slate-600 border border-slate-900'}`}
                >
                  {layer.isVisible ? 'پیدا' : 'پنهان'}
                </button>
                <button
                  onClick={() => {
                    setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, isLocked: !l.isLocked } : l));
                  }}
                  className={`px-2 py-0.5 rounded text-[8.5px] font-black transition-all ${layer.isLocked ? 'bg-amber-950 text-amber-500 border border-amber-900' : 'bg-slate-950 text-slate-600 border border-slate-900'}`}
                >
                  {layer.isLocked ? 'قفل صلب' : 'آزاد'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-2.5 bg-[#090b12] rounded-xl border border-slate-800/60 mt-2 flex items-center justify-between font-sans">
          <span className="text-[9.5px] text-slate-500">جذب باینری به خطوط شبکه کاد:</span>
          <input 
            type="checkbox"
            checked={snapToGrid}
            onChange={e => setSnapToGrid(e.target.checked)}
            className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
          />
        </div>

        {/* Dynamic Bleed Offset slider inside Layers panel */}
        <div className="p-3 bg-[#090b12]/80 rounded-xl border border-slate-800/60 space-y-2 font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[9.5px] text-slate-350 font-bold">میزان محدوده آفست چسب زبانه (Bleed):</span>
            <span className="text-[10px] text-sky-400 font-mono font-bold font-sans">{bleedOffset}mm</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="80" 
            value={bleedOffset} 
            onChange={e => setBleedOffset(Number(e.target.value))} 
            className="w-full h-1 bg-slate-850 rounded appearance-none cursor-pointer accent-indigo-500 border-none" 
          />
        </div>
      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 6. FINANCIAL COST WINDOW
// =========================================================================
interface CostCalculations {
  boxWeightGrams: number;
  sheetCostToman: number;
  rawCostPerBox: number;
  clientPriceToman: number;
}

interface FinancialCostProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  costCalculations: CostCalculations;
  sheetSize: { name: string };
  activePress: { name: string };
  handleReserveStock: () => void;
}

export const FinancialCostWindow: React.FC<FinancialCostProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  costCalculations, sheetSize, activePress, handleReserveStock
}) => {
  return (
    <DockableWindow
      id="financial_cost"
      title="برآورد هزینه‌های مالی و صنعتی (Costs)"
      icon={Calculator}
      isOpen={isOpen}
      onClose={onClose}
      initialX={250}
      initialY={150}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-4 overflow-y-auto h-full text-right" dir="rtl">
        <div className="bg-[#070a0e]/60 p-4 rounded-xl border border-slate-800 space-y-3.5 font-sans">
          <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-850">
            <span className="text-[10px] text-slate-400">وزن هر مقوای مونتاژ شده:</span>
            <span className="text-slate-300 font-mono font-bold">{costCalculations.boxWeightGrams} گرم</span>
          </div>

          <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-850">
            <span className="text-[10px] text-slate-400">هزینه شیت خام لیتوگرافی:</span>
            <span className="text-slate-300 font-mono font-bold">{costCalculations.sheetCostToman.toLocaleString()} تومان</span>
          </div>

          <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-850">
            <span className="text-[10px] text-slate-400">خدمات دایکات زاییده و سلفون:</span>
            <span className="text-slate-300 font-mono font-bold">{costCalculations.rawCostPerBox.toLocaleString()} تومان</span>
          </div>

          <div className="flex justify-between items-center text-xs pb-1 border-b border-slate-855">
            <span className="text-[10px] text-slate-404">سایز زنی شیت مونتاژ شده:</span>
            <span className="text-slate-200 font-mono font-bold text-[10.5px]">{sheetSize.name}</span>
          </div>

          <div className="h-px bg-slate-800"></div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-[11px] font-black text-slate-100">قیمت نهایی هر جعبه (تومان):</span>
            <span className="text-emerald-400 text-sm font-black font-mono">{costCalculations.clientPriceToman.toLocaleString()} تومان</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1 font-sans">
          <button 
            type="button"
            onClick={handleReserveStock}
            className="w-full bg-indigo-700 hover:bg-indigo-600 font-bold text-[10.5px] py-2.5 rounded-xl text-white transition-all shadow border-none cursor-pointer"
          >
            رزرو متراژ مقوا انبار ERP
          </button>
          <button 
            type="button"
            onClick={() => alert('بلیحه حسابداری: سند معین برآورد مالی صادر و در بدهی مشتری در سیستم جامع ثبت موقت گردید.')}
            className="w-full bg-slate-800 hover:bg-slate-750 text-[10px] py-2 rounded-xl text-slate-400 border border-slate-800 cursor-pointer"
          >
            صدور پیش‌فاکتور مانا
          </button>
        </div>
      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 7. PHYSICS & TECHNICAL COMPRESSION WINDOW
// =========================================================================
interface PhysicsReport {
  isSafe: boolean;
  bctKg: number;
  safetyFactor: number;
  requiredResistance: number;
  strengthBCT?: number;
}

interface GeometryReport {
  score: number;
  passed: boolean;
  cutLength: number;
  creaseLength: number;
  glueArea: number;
  bleedArea: number;
  materialUsage: number;
}

interface PhysicsReportsProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  productWeight: number;
  setProductWeight: (w: number) => void;
  shelfHumidity: number;
  setShelfHumidity: (h: number) => void;
  stackHeight: number;
  setStackHeight: (s: number) => void;
  physicsReport: PhysicsReport;
  geometryReport: GeometryReport;
}

export const PhysicsReportsWindow: React.FC<PhysicsReportsProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  productWeight, setProductWeight, shelfHumidity, setShelfHumidity, stackHeight, setStackHeight,
  physicsReport, geometryReport
}) => {
  return (
    <DockableWindow
      id="physics_reports"
      title="پایش مکانیک و مقاومت کارتن (McKee BCT)"
      icon={Info}
      isOpen={isOpen}
      onClose={onClose}
      initialX={250}
      initialY={220}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-4 overflow-y-auto h-full text-right" dir="rtl">
        <div className="space-y-3.5 font-sans">
          <div>
            <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-bold">
              <span>وزن هر محصول داخل جعبه (Product Weight):</span>
              <span className="text-white font-bold">{productWeight} کیلوگرم</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="10" 
              step="0.1" 
              value={productWeight} 
              onChange={e => setProductWeight(parseFloat(e.target.value))} 
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-bold">
              <span>رطوبت انبارداری (Shelving Humidity RH%):</span>
              <span className="text-white font-bold">{shelfHumidity}٪ درصد</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="95" 
              value={shelfHumidity} 
              onChange={e => setShelfHumidity(parseInt(e.target.value))} 
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-505"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-bold">
              <span>ارتفاع چیدمان ستونی دایکات:</span>
              <span className="text-white font-bold">{stackHeight} طبقه روی هم</span>
            </div>
            <input 
              type="range" 
              min="2" 
              max="30" 
              value={stackHeight} 
              onChange={e => setStackHeight(parseInt(e.target.value))} 
              className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-500"
            />
          </div>
        </div>

        {physicsReport && (
          <div className={`p-4 rounded-xl border ${physicsReport.isSafe ? 'bg-emerald-950/25 border-emerald-800 text-emerald-300' : 'bg-red-955/20 border-red-900/60 text-rose-350'} space-y-2`}>
            <div className="flex items-center justify-between font-bold text-[10.5px]">
              <span>حد پایداری سازه در هم‌پوشانی:</span>
              <Badge color={physicsReport.isSafe ? 'green' : 'red'}>
                {physicsReport.isSafe ? 'کاملاً ایمن' : 'خطر له‌شدگی'}
              </Badge>
            </div>

            <div className="h-px bg-slate-800"></div>

            <div className="space-y-1.5 text-[10px] font-mono leading-normal">
              <div className="flex justify-between">
                <span>مقاومت فشار اسمی McKee BCT:</span>
                <span className="text-slate-100 font-bold">{physicsReport.bctKg} کیلوگرم-نیرو</span>
              </div>
              <div className="flex justify-between">
                <span>ضریب فروسایی کل انبارداری:</span>
                <span className="text-indigo-400 font-bold">{physicsReport.safetyFactor}x</span>
              </div>
              <div className="flex justify-between">
                <span>فشار استاتیک رج زیرین:</span>
                <span className="text-slate-100 font-bold">{physicsReport.requiredResistance} کیلوگرم</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800 mt-2 font-mono text-[9.5px] leading-relaxed">
          <strong className="text-sky-455 font-sans block mb-1">اندازه‌های خط کشی دایکات:</strong>
          <div className="grid grid-cols-2 gap-2 text-slate-400">
            <div>کل تیغ برش (Cut): <strong className="text-slate-205">{Math.round(geometryReport.cutLength)} mm</strong></div>
            <div>خط تاخوردگی (Crease): <strong className="text-slate-205">{Math.round(geometryReport.creaseLength)} mm</strong></div>
            <div>لبه نری چسب: <strong className="text-slate-205">{Math.round(geometryReport.glueArea)} mm²</strong></div>
            <div>بازده ورق: <strong className="text-emerald-450">%{geometryReport.materialUsage}</strong></div>
          </div>
        </div>
      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 8. GEOMETRY WARNINGS WINDOW
// =========================================================================
interface ValidatorIssue {
  type: string;
  msg: string;
}

interface GeometryWarningsProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  geometryReport: GeometryReport;
  validatorIssues: ValidatorIssue[];
}

export const GeometryWarningsWindow: React.FC<GeometryWarningsProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  geometryReport, validatorIssues
}) => {
  return (
    <DockableWindow
      id="geometry_warnings"
      title="سیستم هشدارهای فنی دایکات (Warnings)"
      icon={ShieldAlert}
      isOpen={isOpen}
      onClose={onClose}
      initialX={(window.innerWidth - 380) / 2}
      initialY={window.innerHeight - 380}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-4 overflow-y-auto h-full text-right" dir="rtl">
        <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 font-sans font-bold font-sans">نمره استاندارد پلات قالب:</span>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-extrabold font-mono ${geometryReport.score >= 95 ? 'text-emerald-450' : 'text-rose-450'}`}>{geometryReport.score}%</span>
            <Badge color={geometryReport.passed ? 'green' : 'red'}>{geometryReport.passed ? 'تایید تولید' : 'مسدود شده'}</Badge>
          </div>
        </div>

        <div className="space-y-1.5 flex-1 min-h-0">
          <span className="text-[10px] font-black text-slate-500 uppercase block font-sans">گزارش نقایص هندسی و ساختاری:</span>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
            {validatorIssues.map((v, idx) => (
              <div key={idx} className={`p-2.5 rounded-lg border flex gap-2 text-[10.5px] font-sans ${v.type === 'error' ? 'bg-red-950/20 border-red-900/40 text-red-400' : 'bg-amber-950/15 border-amber-900/40 text-amber-500'}`}>
                <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${v.type === 'error' ? 'bg-red-500 animate-pulse' : 'bg-amber-450'}`} />
                <div>
                  <div className="font-extrabold">{v.type === 'error' ? 'خطای فنی ساختاری' : 'تذکر انطباق دایکات'}</div>
                  <div className="text-[9.5px] text-slate-400 leading-normal mt-1">{v.msg}</div>
                </div>
              </div>
            ))}
            {validatorIssues.length === 0 && (
              <div className="text-center py-6 text-[10.5px] text-emerald-400 bg-emerald-950/10 border border-emerald-900/30 rounded-xl leading-normal font-sans">
                🏆 رسم هندسی دایلاین اتمی و کاملاً فنی است و برای خروجی لیتوگرافی و قالب‌سازی ممتاز ارزیابی می‌شود.
              </div>
            )}
          </div>
        </div>
      </div>
    </DockableWindow>
  );
};

// =========================================================================
// 9. AI ADVISOR WINDOW
// =========================================================================
interface MessageItem {
  sender: 'user' | 'ai';
  text: string;
}

interface AiAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  aiMessages: MessageItem[];
  isAiThinking: boolean;
  aiPrompt: string;
  setAiPrompt: (p: string) => void;
  handleAiPromptSubmit: () => void;
}

export const AiAdvisorWindow: React.FC<AiAdvisorProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  aiMessages, isAiThinking, aiPrompt, setAiPrompt, handleAiPromptSubmit
}) => {
  return (
    <DockableWindow
      id="ai_advisor"
      title="دستیار هوش مصنوعی فرتاک (AI Assistant)"
      icon={Sparkles}
      isOpen={isOpen}
      onClose={onClose}
      initialX={(window.innerWidth - 380) / 2}
      initialY={150}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-3 flex flex-col h-full text-right" dir="rtl font-sans">
        <div className="flex-1 overflow-y-auto bg-[#070a0e] p-3 rounded-xl border border-slate-800 space-y-3 max-h-[200px] custom-scrollbar">
          {aiMessages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div className={`text-[10px] leading-relaxed max-w-[85%] rounded-lg p-2.5 ${m.sender === 'user' ? 'bg-[#1e293b] text-white' : 'bg-indigo-950/40 text-slate-100 border border-indigo-900/60'}`} style={{ whiteSpace: 'pre-line' }}>
                {m.text}
              </div>
            </div>
          ))}
          {isAiThinking && (
            <div className="text-center py-2 text-[9.5px] text-slate-500 animate-pulse">در حال تحلیل متریال و بهینه‌سازی سازه دیلاین...</div>
          )}
        </div>

        <div className="flex gap-1.5 pt-1 mt-auto">
          <input
            type="text"
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiPromptSubmit()}
            placeholder="مهندسی هوشمند (عطر لوکس، عسل، کوک)..."
            className="flex-1 bg-[#070a0e] border border-slate-800 rounded-lg py-1.5 px-3 text-[10.5px] text-white outline-none focus:ring-1 focus:ring-sky-505 font-sans"
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
    </DockableWindow>
  );
};

// =========================================================================
// 10. PROJECT EXPLORER & SESSIONS WINDOW
// =========================================================================
interface DraftItem {
  id: string;
  name: string;
  status: string;
  time: string;
  dims: { L: number; W: number; H: number };
  unit: string;
}

interface SnapshotItem {
  id: string;
  image: string;
  date: string;
  dims: string;
  model: string;
}

interface ProjectExplorerProps {
  isOpen: boolean;
  onClose: () => void;
  zIndex: number;
  onFocus: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  newDraftName: string;
  setNewDraftName: (n: string) => void;
  handleSaveDraft: () => void;
  cmsDrafts: DraftItem[];
  capturedSnapshots: SnapshotItem[];
}

export const ProjectExplorerWindow: React.FC<ProjectExplorerProps> = ({
  isOpen, onClose, zIndex, onFocus, containerRef,
  newDraftName, setNewDraftName, handleSaveDraft, cmsDrafts, capturedSnapshots
}) => {
  return (
    <DockableWindow
      id="session_settings"
      title="مدیریت پروژه‌ها و مستندات (Project Settings)"
      icon={FileText}
      isOpen={isOpen}
      onClose={onClose}
      initialX={200}
      initialY={100}
      zIndex={zIndex}
      onFocus={onFocus}
      containerRef={containerRef}
    >
      <div className="p-4 space-y-4 overflow-y-auto h-full text-right font-sans flex flex-col" dir="rtl">
        <div className="bg-[#070a0e]/80 p-3 rounded-xl border border-slate-800 space-y-3 shrink-0">
          <label className="text-[10px] font-bold text-slate-400 block pb-1 border-b border-slate-850">ذخیره نسخه جاری قالب کاد:</label>
          <div className="flex gap-2">
            <input 
              type="text"
              value={newDraftName}
              onChange={e => setNewDraftName(e.target.value)}
              placeholder="امضا قالب جعبه..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-[10.5px] text-white outline-none focus:border-indigo-505 font-sans"
            />
            <button 
              type="button"
              onClick={handleSaveDraft}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[9px] px-3.5 py-1.5 rounded-lg transition-all border-none cursor-pointer"
            >
              ثبت نسخه
            </button>
          </div>
        </div>

        <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
          <span className="text-[10px] font-black text-slate-500 block">تاریخچه اصالت طرح‌ها و تاییده‌ها:</span>
          <div className="space-y-1.5">
            {cmsDrafts.map(dr => (
              <div key={dr.id} className="bg-[#070a0e]/40 p-2.5 rounded-lg border border-slate-800/80 flex flex-col gap-1 text-[10px]">
                <div className="flex justify-between items-center font-bold text-slate-200">
                  <span>{dr.name}</span>
                  <Badge color={dr.status === 'Approved' ? 'green' : (dr.status === 'Snapshot' ? 'purple' : 'blue')}>{dr.status}</Badge>
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-505 font-mono">
                  <span>{dr.time}</span>
                  <span>{dr.dims.L}×{dr.dims.W}×{dr.dims.H} {dr.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {capturedSnapshots.length > 0 && (
          <div className="space-y-2 border-t border-slate-800 pt-3 shrink-0">
            <span className="text-[10.5px] font-black text-slate-500 block">شات‌های سه‌بعدی بسته‌بندی جاری:</span>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
              {capturedSnapshots.map(snap => (
                <div key={snap.id} className="relative group bg-[#04060b] border border-slate-850 p-1.5 rounded-lg flex flex-col gap-1 overflow-hidden">
                  <img src={snap.image} alt="3D Snap" className="w-full h-14 object-cover rounded" />
                  <span className="text-[8px] text-slate-500 truncate font-mono text-center">{snap.date}</span>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = snap.image;
                      link.download = `3d-snapshot-${snap.id}.png`;
                      link.click();
                    }}
                    className="absolute inset-0 bg-indigo-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[9px] text-white font-black rounded transition-all cursor-pointer"
                  >
                    دانلود تصویر 📥
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DockableWindow>
  );
};
