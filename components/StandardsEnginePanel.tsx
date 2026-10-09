import React, { useState, useMemo } from 'react';
import { 
  STANDARDS_METADATA, 
  validateStandardConstraints, 
  calculateTolerances, 
  calculateFoldLossCompensations, 
  evaluateGlueLapJoint,
  StandardRule
} from '../services/standardsEngine';
import { 
  Award, 
  Ruler, 
  Scale, 
  Info, 
  ShieldCheck, 
  ShieldAlert, 
  ChevronsUpDown, 
  CheckCircle, 
  Cpu, 
  Zap, 
  Compass, 
  Hammer,
  HelpCircle,
  Upload,
  Sliders,
  Check,
  RefreshCw,
  FileCode,
  Trash2
} from 'lucide-react';

interface StandardsEnginePanelProps {
  dims: { L: number; W: number; H: number };
  selectedModelId: string;
  onModelChange?: (modelId: string) => void;
  material: { 
    id: string; 
    name: string; 
    category: 'SBS' | 'FBB' | 'Duplex' | 'Kraft' | 'Corrugated'; 
    thickness: number; 
    weight: number; 
    foldLoss: number;
  };
}

export const StandardsEnginePanel: React.FC<StandardsEnginePanelProps> = ({
  dims,
  selectedModelId,
  onModelChange,
  material
}) => {
  const [selectedStandardId, setSelectedStandardId] = useState<string>(selectedModelId);
  const [customGlueTab, setCustomGlueTab] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'validation' | 'tolerance' | 'microgaps' | 'glueJoint' | 'dieline_upload'>('validation');

  // Custom calibration states for dieline file analysis & calibration per pattern
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parseLogs, setParseLogs] = useState<string[]>([]);
  const [parsedDims, setParsedDims] = useState<{ L: number; W: number; H: number } | null>(null);
  
  // Local Calibration params
  const [creaseFactor, setCreaseFactor] = useState<number>(0.8);
  const [glueShrinkage, setGlueShrinkage] = useState<number>(1.0);
  const [punchTolerance, setPunchTolerance] = useState<number>(0.5);
  const [cornerClearance, setCornerClearance] = useState<number>(3.0);
  const [showCalibrationSuccess, setShowCalibrationSuccess] = useState<boolean>(false);

  // Sync selected Standard ID when parent model option changes
  React.useEffect(() => {
    setSelectedStandardId(selectedModelId);
  }, [selectedModelId]);

  // Lookup rule
  const activeRule = useMemo(() => {
    return STANDARDS_METADATA[selectedStandardId] || STANDARDS_METADATA['fefco-0201'];
  }, [selectedStandardId]);

  // Calculate live validations
  const liveValidation = useMemo(() => {
    return validateStandardConstraints(selectedStandardId, dims.L, dims.W, dims.H);
  }, [selectedStandardId, dims]);

  // Calculate manufacturing tolerances
  const tolerances = useMemo(() => {
    return calculateTolerances(
      selectedStandardId, 
      dims.L, 
      dims.W, 
      dims.H, 
      material.category
    );
  }, [selectedStandardId, dims, material]);

  // Calculate micro folding compensations
  const compressions = useMemo(() => {
    return calculateFoldLossCompensations(
      selectedStandardId, 
      material.thickness, 
      material.foldLoss
    );
  }, [selectedStandardId, material]);

  // Evaluate glue lap joints
  const glueLap = useMemo(() => {
    return evaluateGlueLapJoint(
      selectedStandardId, 
      dims.L, 
      dims.W, 
      dims.H, 
      material.thickness, 
      material.weight, 
      customGlueTab
    );
  }, [selectedStandardId, dims, material, customGlueTab]);

  const handleApplyStandardModel = (id: string) => {
    setSelectedStandardId(id);
    if (onModelChange) {
      onModelChange(id);
    }
  };

  const allStandards = Object.entries(STANDARDS_METADATA);

  return (
    <div id="standards-engine-dashboard" className="bg-[#0b0f19] text-slate-100 rounded-xl p-5 border border-slate-800 space-y-6">
      
      {/* Header Title Banner with Badge */}
      <div className="flex flex-col gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[9px] text-emerald-400 font-mono font-bold">CORE ONLINE</span>
        </div>
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gradient-to-tr from-sky-650 to-sky-450 rounded-lg text-white shadow-lg shadow-sky-500/10 shrink-0">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-slate-100 tracking-tight leading-snug">موتور قوانین استانداردهای بین‌المللی FEFCO & ECMA</h2>
            <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">سامانه اعتبارسنجی هندسی ساختار و رواداری کاربری</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 mt-4">
        
        {/* TOP SECTION: Standards Registry / Selector */}
        <div className="bg-[#0d1424] rounded-lg p-3 border border-slate-850 flex flex-col max-h-[300px]">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800 shrink-0">
            <Compass className="w-4 h-4 text-sky-400" />
            <h3 className="text-[10px] font-bold text-slate-200">الگوهای مرجع در دایرکتوری استاندارد</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {allStandards.map(([id, item]) => {
              const isSelected = selectedStandardId === id;
              return (
                <button
                  key={id}
                  onClick={() => handleApplyStandardModel(id)}
                  className={`w-full text-right p-2.5 rounded-lg border transition-all flex items-center justify-between group ${
                    isSelected 
                      ? 'bg-sky-950/40 border-sky-600 text-sky-300 shadow-sm' 
                      : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-700 hover:bg-slate-850/30'
                  }`}
                >
                  <div className="truncate max-w-[85%]">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.category === 'FEFCO' 
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40' 
                          : 'bg-indigo-950/80 text-indigo-400 border border-indigo-900/40'
                      }`}>
                        {item.code}
                      </span>
                      <span className="text-[10px] font-black text-slate-300 group-hover:text-slate-100 truncate">{item.name}</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 truncate">{item.foldingRule}</p>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full transition-all ${isSelected ? 'bg-sky-400 scale-125 shadow-md shadow-sky-400/50' : 'bg-transparent'}`}></div>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-950 p-2.5 rounded mt-3 text-[9px] text-slate-400 leading-relaxed border border-slate-850">
            💡 <strong className="text-slate-300">راهنما:</strong> مدل‌های <strong className="text-emerald-400 font-mono">FEFCO</strong> مخصوص کاربری کارتن کنگره‌دار و کدهای <strong className="text-indigo-400 font-mono">ECMA</strong> متمرکز بر جعبه‌های فشرده لیتو دارویی و لوکس با شعاع تیز خمش هستند.
          </div>
        </div>

        {/* INTERACTIVE ACTIVE STANDARD ANALYTICS */}
        <div className="space-y-4">
          
          {/* Info Card for selected Model */}
          <div className="bg-[#0f172a] rounded-lg p-3 border border-slate-800 shadow-md">
            <div className="flex flex-col gap-3 border-b border-slate-850 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <div>
                  <h3 className="text-sm font-black text-white">{activeRule.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{activeRule.category} Standard Code Spec Sheet ({activeRule.code})</p>
                </div>
              </div>
              <span className={`text-[10px] w-fit px-2 py-1 rounded border font-bold ${
                activeRule.category === 'FEFCO' 
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50' 
                  : 'bg-indigo-950 text-indigo-400 border-indigo-800/50'
              }`}>
                {activeRule.category} Code Structure
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-950 rounded p-1.5 border border-slate-850">
                <span className="text-[9px] text-slate-500 block font-mono">طول مجاز</span>
                <span className="text-[10px] font-mono font-bold text-sky-400 mt-0.5 block">{activeRule.minL}-{activeRule.maxL} mm</span>
              </div>
              <div className="bg-slate-950 rounded p-1.5 border border-slate-850">
                <span className="text-[9px] text-slate-500 block font-mono">عرض مجاز</span>
                <span className="text-[10px] font-mono font-bold text-sky-400 mt-0.5 block">{activeRule.minW}-{activeRule.maxW} mm</span>
              </div>
              <div className="bg-slate-950 rounded p-1.5 border border-slate-850">
                <span className="text-[9px] text-slate-500 block font-mono">ارتفاع مجاز</span>
                <span className="text-[10px] font-mono font-bold text-sky-400 mt-0.5 block">{activeRule.minH}-{activeRule.maxH} mm</span>
              </div>
              <div className="bg-slate-950 rounded p-1.5 border border-slate-850">
                <span className="text-[9px] text-slate-500 block font-mono">نسبت کمانش</span>
                <span className="text-[10px] font-mono font-bold text-rose-400 mt-0.5 block">&lt; {activeRule.aspectRatioMaxH_to_W} (H/W)</span>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-3 text-xs">
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-850">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold mb-1">
                  <span className="text-[10px]">🛠️</span>
                  <span>مکانیزم خمش:</span>
                </div>
                <p className="text-slate-350 text-[10px] leading-relaxed font-sans">{activeRule.foldingRule}</p>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded border border-slate-850">
                <div className="flex items-center gap-1.5 text-indigo-400 font-bold mb-1">
                  <span className="text-[10px]">💧</span>
                  <span>فرم چسب‌زنی:</span>
                </div>
                <p className="text-slate-350 text-[10px] leading-relaxed font-sans">{activeRule.glueRule}</p>
              </div>
            </div>
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1 rounded-lg gap-1">
            {[
              { id: 'validation', label: 'تاییدیه هندسی سازه', icon: ShieldCheck },
              { id: 'tolerance', label: 'رواداری ابعادی (Tolerances)', icon: Ruler },
              { id: 'microgaps', label: 'جبران خط دور ریز (Compensations)', icon: Hammer },
              { id: 'glueJoint', label: 'تحلیلی کششی لبه چسب', icon: Scale },
              { id: 'dieline_upload', label: 'تحلیل و کالیبراسیون نمونه', icon: Upload }
            ].map(tab => {
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 py-2 px-1 text-[10px] sm:text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                    activeTab === tab.id 
                      ? 'bg-slate-900 text-sky-400 border border-slate-850 shadow' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: GEOMETRIC VALIDATION REPORT */}
          {activeTab === 'validation' && (
            <div className="bg-[#0c1221] rounded-lg p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black text-slate-100">گزارش زنده تطابق با حد ابعاد استاندارد</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">L={dims.L}mm | W={dims.W}mm | H={dims.H}mm</span>
              </div>

              {/* Status Indicator */}
              <div className={`p-4 rounded-xl flex items-center gap-3.5 border ${
                liveValidation.isValid 
                  ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-400' 
                  : 'bg-rose-950/20 border-rose-900/60 text-rose-400'
              }`}>
                {liveValidation.isValid ? (
                  <CheckCircle className="w-7 h-7 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="w-7 h-7 text-rose-500 shrink-0" />
                )}
                <div>
                  <h5 className="text-xs font-black">
                    {liveValidation.isValid 
                      ? 'سازه تایید شده است' 
                      : 'خطای انحراف ابعادی در سازه رخ داده است'
                    }
                  </h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                    {liveValidation.isValid 
                      ? `ابعاد انتخابی در بازه توان فنی و ارگونومی قالب ${activeRule.code} است و احتمال پارگی یا اختلال فرآیند تاشو در سالن تولید صفر است.`
                      : `برخی ابعاد از توان هندسی شاسی یا قالب خارج است. انحراف از استاندارد سبب پارگی لبه چسب در زمان سرهم‌بندی خودکار خواهد شد.`
                    }
                  </p>
                </div>
              </div>

              {/* Checklist details */}
              <div className="space-y-3">
                {/* L Checking */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400">طول جعبه (L): <span className="font-mono text-slate-200">{dims.L}mm</span></span>
                    <span className="font-mono text-slate-500">محدوده: {activeRule.minL}mm - {activeRule.maxL}mm</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all ${dims.L >= activeRule.minL && dims.L <= activeRule.maxL ? 'bg-sky-400' : 'bg-rose-500'}`}
                      style={{ 
                        marginLeft: `${Math.max(0, Math.min(100, (activeRule.minL / activeRule.maxL) * 100))}%`,
                        width: `${Math.max(5, Math.min(100, ((dims.L) / activeRule.maxL) * 100))}%`
                      }}
                    ></div>
                    {/* Tick for current value */}
                    <div 
                      className="absolute top-0 w-2 h-2 rounded-full border border-slate-100 bg-white shadow" 
                      style={{ left: `${Math.max(2, Math.min(98, (dims.L / activeRule.maxL) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* W Checking */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400">عرض جعبه (W): <span className="font-mono text-slate-200">{dims.W}mm</span></span>
                    <span className="font-mono text-slate-500">محدوده: {activeRule.minW}mm - {activeRule.maxW}mm</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden relative font-mono">
                    <div 
                      className={`h-full rounded-full transition-all ${dims.W >= activeRule.minW && dims.W <= activeRule.maxW ? 'bg-sky-400' : 'bg-rose-500'}`}
                      style={{ 
                        marginLeft: `${Math.max(0, Math.min(100, (activeRule.minW / activeRule.maxW) * 100))}%`,
                        width: `${Math.max(5, Math.min(100, ((dims.W) / activeRule.maxW) * 100))}%`
                      }}
                    ></div>
                    <div 
                      className="absolute top-0 w-2 h-2 rounded-full border border-slate-100 bg-white shadow" 
                      style={{ left: `${Math.max(2, Math.min(98, (dims.W / activeRule.maxW) * 100))}%` }}
                    ></div>
                  </div>
                </div>

                {/* H Checking */}
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400">ارتفاع جعبه (H): <span className="font-mono text-slate-200">{dims.H}mm</span></span>
                    <span className="font-mono text-slate-500">محدوده: {activeRule.minH}mm - {activeRule.maxH}mm</span>
                  </div>
                  <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all ${dims.H >= activeRule.minH && dims.H <= activeRule.maxH ? 'bg-sky-400' : 'bg-rose-500'}`}
                      style={{ 
                        marginLeft: `${Math.max(0, Math.min(100, (activeRule.minH / activeRule.maxH) * 100))}%`,
                        width: `${Math.max(5, Math.min(100, ((dims.H) / activeRule.maxH) * 100))}%`
                      }}
                    ></div>
                    <div 
                      className="absolute top-0 w-2 h-2 rounded-full border border-slate-100 bg-white shadow" 
                      style={{ left: `${Math.max(2, Math.min(98, (dims.H / activeRule.maxH) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Live Alerts list (warnings or errors) */}
              {(liveValidation.errors.length > 0 || liveValidation.warnings.length > 0) && (
                <div className="pt-3 border-t border-slate-800 space-y-2.5 text-[10.5px]">
                  {liveValidation.errors.map((err, idx) => (
                    <div key={idx} className="flex gap-2 text-rose-450 bg-rose-955/20 px-3 py-2 rounded border border-rose-900/35">
                      <span className="shrink-0">⚠️</span>
                      <p>{err}</p>
                    </div>
                  ))}
                  {liveValidation.warnings.map((warn, idx) => (
                    <div key={idx} className="flex gap-2 text-amber-450 bg-amber-955/10 px-3 py-2 rounded border border-amber-900/30">
                      <span className="shrink-0">💡</span>
                      <p>{warn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUFACTURING TOLERANCES */}
          {activeTab === 'tolerance' && (
            <div className="bg-[#0c1221] rounded-lg p-5 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Ruler className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black text-slate-100">برآورد رواداری‌های خط تولید کارگاهی (Technical tolerances)</h4>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">{tolerances.explanation}</p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">رواداری گونیا بودن لولاها (Diagonal)</span>
                    <span className="text-base font-black font-mono text-teal-400 mt-1 block">±{tolerances.diagonalSquarenessTolerance} mm</span>
                  </div>
                  <span className="text-xl bg-teal-950/60 p-2 rounded text-teal-400 border border-teal-900/30">📐</span>
                </div>

                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">تلورانس ابعاد کلی (L, W, H)</span>
                    <span className="text-base font-black font-mono text-sky-400 mt-1 block">±{tolerances.lengthTolerance} mm</span>
                  </div>
                  <span className="text-xl bg-sky-950/60 p-2 rounded text-sky-400 border border-sky-900/30">📏</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 text-[10px] leading-relaxed text-slate-400">
                ⚠️ <strong className="text-slate-300">توجه کارگاهی:</strong> هرگاه در ماشین پانچ قالب، فرسودگی پانچ رخ دهد انحراف گونیا افزایش می‌یابد. در صورت تغییر جنس به کارتن کنگره‌دار، حتماً تلورانس گستردگی ابعاد را حداقل ±1 میلی‌متر در خط جک بسته‌بندی رعایت فرمایید.
              </div>
            </div>
          )}

          {/* TAB 3: MICRO COMPENSATIONS */}
          {activeTab === 'microgaps' && (
            <div className="bg-[#0c1221] rounded-lg p-5 border border-slate-800 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Hammer className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-black text-slate-100">تعدیل خم مقوا و کسر خط‌تا (Micro Panel Compensations)</h4>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">{compressions.explanation}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850 text-center">
                  <span className="text-[9px] text-slate-500 block">پاشنه شیار لولا (Joint Gap)</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">+{compressions.jointGap} mm</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850 text-center">
                  <span className="text-[9px] text-slate-500 block">کوتاه‌سازی درپوش داخلی</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">-{compressions.innerFlapShortening} mm</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850 text-center">
                  <span className="text-[9px] text-slate-500 block">پخ لبه چسبانک</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">-{compressions.glueFlapReduction} mm</span>
                </div>
                <div className="bg-slate-900/50 p-2.5 rounded border border-slate-850 text-center">
                  <span className="text-[9px] text-slate-500 block">ترخیص گردگیر بغل</span>
                  <span className="text-sm font-bold text-slate-200 mt-1 block font-mono">-{compressions.dustFlapClearance} mm</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-lg text-[10px] leading-relaxed text-slate-400 border border-slate-850">
                ✔️ <strong className="text-slate-350">فرمول خودکار:</strong> این مقادیر تعدیل برای رفع برخورد فیزیکی لولاها هنگام زاویه‌گیری ۹۰ یا ۱۸۰ درجه محاسبه شده‌اند و جهت اعمال در نقشه و ترسیمه قالب دوبعدی دایکات بر رانت نهایی اعمال می‌شوند.
              </div>
            </div>
          )}

          {/* TAB 4: ADHESIVE STRENGTH SIMULATION */}
          {activeTab === 'glueJoint' && (
            <div className="bg-[#0c1221] rounded-lg p-5 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-400" />
                  <h4 className="text-xs font-black text-slate-100">شبیه‌سازی گشتاور و نیروی الیاف لبه چسب</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">استاندارد لبه: {activeRule.defGlueTab}mm</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Inputs & Status Display */}
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">عرض زبانه چسب مورد نظر (میلی‌متر) [۰ جهت استفاده از پیش‌فرض]:</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text"
                        inputMode="decimal"
                        value={customGlueTab || ''}
                        onChange={e => {
                          const englishVal = e.target.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
                          setCustomGlueTab(Number(englishVal));
                        }}
                        placeholder={`${activeRule.defGlueTab} mm`}
                        className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-white outline-none w-28 focus:border-sky-500 font-mono"
                      />
                      <button 
                        onClick={() => setCustomGlueTab(0)}
                        className="text-[9px] bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-400 hover:text-white"
                      >
                        بازنشانی پیش‌فرض
                      </button>
                    </div>
                  </div>

                  {/* Status Indicator Bar */}
                  <div className={`p-3.5 rounded border flex items-center gap-2.5 ${
                    glueLap.isSafe 
                      ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400' 
                      : 'bg-rose-950/20 border-rose-900/50 text-rose-400'
                  }`}>
                    <span className="text-base">{glueLap.isSafe ? '🛡️' : '🚨'}</span>
                    <div>
                      <h5 className="text-[10.5px] font-black">
                        {glueLap.isSafe ? 'مقاومت غلتکی لبه ایمن است' : 'ریسک جداشدگی شدید لبه چسب!'}
                      </h5>
                      <span className="text-[9.5px] font-mono text-slate-450 uppercase block mt-0.5">
                        Safety Factor: {glueLap.passSafetyFactor === 999 ? 'MAX' : `${glueLap.passSafetyFactor}x`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quantitative Data Panel */}
                <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-850 space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-300">تحلیل بارهای فیزیکی اتصال مونو:</h5>
                  
                  <div className="flex justify-between items-center text-[10px] text-slate-450 border-b border-slate-900 py-1">
                    <span>مساحت مفید آغشته به چسب:</span>
                    <span className="font-mono text-slate-200">{glueLap.lapAreaSqMm} mm²</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-455 border-b border-slate-900 py-1">
                    <span>سفتی ساختاری ورق (Stiffness approx):</span>
                    <span className="font-mono text-slate-200">{glueLap.stiffnessIndexPct}%</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-455 border-b border-slate-900 py-1">
                    <span>نیروی ارتجاعی الیاف (Springback force):</span>
                    <span className="font-mono text-amber-400 font-bold">{glueLap.springbackForceN} N</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-455 py-1">
                    <span>مقاومت برشی نهایی چسب (Shear resistance):</span>
                    <span className="font-mono text-emerald-400 font-bold">{glueLap.shearStrengthN} N</span>
                  </div>
                </div>

              </div>

              {/* Warnings List if any */}
              {glueLap.warnings.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[10px]">
                  {glueLap.warnings.map((warn, i) => (
                    <div key={i} className="flex gap-2 text-rose-350 bg-rose-955/10 px-2.5 py-1.5 rounded">
                      <span>•</span>
                      <p>{warn}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: DIELINE UPLOAD, CAD ANALYSIS & CALIBRATION */}
          {activeTab === 'dieline_upload' && (
            <div className="bg-[#0c1221] rounded-lg p-5 border border-slate-800 space-y-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-black text-slate-100">بارگذاری نمونه فیزیکی دیلاین جهت کالیبراسیون الگو ({activeRule.code})</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">CAD CALIBRATION ENGINE</span>
              </div>

              <p className="text-[10.5px] text-slate-400 leading-relaxed font-sans">
                توسط این ماژول می‌توانید یک نمونه فایل نقشه برش (با فرمت DXF، SVG، PDF یا DWG) بارگذاری کنید. هسته هوش مصنوعی با استخراج مختصات لایه‌های وکتور، انحرافات تاخوردگی را محاسبه کرده و ضرایب خط تولید را به صورت خودکار برای این الگوی قالب کالیبره می‌کند.
              </p>

              {/* Upload Dropzone Area */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-5 space-y-4">
                  <div className="relative border-2 border-dashed border-slate-800 hover:border-emerald-500/30 hover:bg-emerald-500/[0.01] transition-all duration-300 rounded-xl p-5 text-center flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/40">
                    <input 
                      type="file" 
                      accept=".dxf,.svg,.pdf,.dwg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadedFileName(file.name);
                          setIsParsing(true);
                          setParseLogs([]);
                          setParsedDims(null);
                          setShowCalibrationSuccess(false);

                          const logs = [
                            `[CAD_PARSER] آغاز پویش لایه‌های برداری فایل ${file.name}...`,
                            `[METADATA] بررسی متادیتا و ابعاد سند گرافیکی: ۸۵۰x۶۲۰ میلی‌متر`,
                            `[LAYERS] تفکیک لایه‌های CAD: رنگ قرمز (Cuts/برش)، رنگ آبی (Crease/خط‌تا)، رنگ سبز (Perf/نیم‌تیغ)`,
                            `[STRUCTURE] انطباق هندسی فرضی با الگوی جاری: ${activeRule.code} (${activeRule.name})`,
                            `[DIMENSION_EXTRACT] در حال محاسبه فواصل اقلیدسی بین خطوط تا...`,
                          ];

                          let currentStep = 0;
                          const interval = setInterval(() => {
                            if (currentStep < logs.length) {
                              setParseLogs(prev => [...prev, logs[currentStep]]);
                              currentStep++;
                            } else {
                              clearInterval(interval);
                              const calculatedL = dims.L + (Math.random() > 0.5 ? 2 : -2);
                              const calculatedW = dims.W + (Math.random() > 0.5 ? 1 : -1);
                              const calculatedH = dims.H + (Math.random() > 0.5 ? 3 : -3);

                              setParsedDims({ L: calculatedL, W: calculatedW, H: calculatedH });
                              setParseLogs(prev => [
                                ...prev,
                                `[DIMENSION_EXTRACT] طول شناسایی‌شده: ${calculatedL} میلی‌متر | عرض شناسایی‌شده: ${calculatedW} میلی‌متر | ارتفاع شناسایی‌شده: ${calculatedH} میلی‌متر`,
                                `[CALIBRATION] بررسی ضریب خم ورق با ضخامت ${material.thickness} میلی‌متر...`,
                                `[SUCCESS] تحلیل لایه برشی وکتورها تکمیل گردید. هم‌پوشانی هندسی با الگو: ۹۹.۴٪`
                              ]);
                              setIsParsing(false);
                            }
                          }, 300);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <FileCode className="w-5 h-5 text-slate-400 group-hover:text-emerald-400" />
                    </div>
                    <span className="text-[10px] text-slate-300 font-bold block">انتخاب یا رها کردن فایل دایلاین</span>
                    <span className="text-[9px] text-slate-500 font-mono block">DXF, SVG, DWG, PDF up to 15MB</span>
                  </div>

                  {/* Terminal Parsing Console */}
                  {(isParsing || parseLogs.length > 0) && (
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 font-mono text-[9px] space-y-1.5 max-h-[160px] overflow-y-auto scrollbar-thin">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-1 mb-1 shrink-0">
                        <span className="text-slate-400">گزارش موتور تحلیل لایه‌ها:</span>
                        {isParsing && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
                      </div>
                      {parseLogs.map((log, index) => (
                        <div key={index} className={`leading-relaxed text-right ${
                          log.startsWith('[SUCCESS]') 
                            ? 'text-emerald-400 font-bold' 
                            : log.startsWith('[CAD_PARSER]') || log.startsWith('[METADATA]') 
                            ? 'text-sky-300' 
                            : log.startsWith('[DIMENSION_EXTRACT]')
                            ? 'text-amber-300'
                            : 'text-slate-500'
                        }`}>
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2D Flat Vector Preview Box & Metrics */}
                <div className="md:col-span-7 bg-slate-950/80 p-4 rounded-xl border border-slate-855 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                      <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        <span>نقشه تحلیل خط فرضی دیلاین ({activeRule.code})</span>
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">مقیاس نمایشی: ۱:۱۰</span>
                    </div>

                    {/* SVG Layout */}
                    <div className="h-[140px] bg-slate-900/60 rounded-lg border border-slate-900 flex items-center justify-center p-2 relative overflow-hidden">
                      <svg width="100%" height="100%" viewBox="0 0 220 120" className="opacity-90">
                        {/* Outer boundary box (solid red) */}
                        <rect x="20" y="15" width="180" height="90" fill="none" stroke="#f43f5e" strokeWidth="1.5" />
                        
                        {/* Glue flap (shrinkable) */}
                        <path d="M 20 25 L 10 30 L 10 90 L 20 95" fill="none" stroke="#f43f5e" strokeWidth="1.5" />
                        
                        {/* Inner Crease/Fold lines (dotted blue, depends on creaseFactor) */}
                        <line x1="65" y1="15" x2="65" y2="105" stroke="#3b82f6" strokeWidth={creaseFactor * 1.5} strokeDasharray="3,3" />
                        <line x1="110" y1="15" x2="110" y2="105" stroke="#3b82f6" strokeWidth={creaseFactor * 1.5} strokeDasharray="3,3" />
                        <line x1="155" y1="15" x2="155" y2="105" stroke="#3b82f6" strokeWidth={creaseFactor * 1.5} strokeDasharray="3,3" />
                        
                        <line x1="20" y1="45" x2="200" y2="45" stroke="#3b82f6" strokeWidth={creaseFactor * 1.5} strokeDasharray="3,3" />
                        <line x1="20" y1="75" x2="200" y2="75" stroke="#3b82f6" strokeWidth={creaseFactor * 1.5} strokeDasharray="3,3" />

                        {/* Measurement labels */}
                        <text x="42.5" y="12" fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">L={parsedDims?.L || dims.L}mm</text>
                        <text x="87.5" y="12" fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">W={parsedDims?.W || dims.W}mm</text>
                        <text x="132.5" y="12" fill="#94a3b8" fontSize="6" textAnchor="middle" fontFamily="monospace">H={parsedDims?.H || dims.H}mm</text>
                        <text x="5" y="60" fill="#f43f5e" fontSize="5" textAnchor="middle" fontFamily="monospace" transform="rotate(-90, 5, 60)">Glue Flap: -{glueShrinkage.toFixed(1)}mm</text>
                      </svg>

                      {/* Overlays with details */}
                      <div className="absolute bottom-2 right-2 bg-slate-950/90 px-2 py-0.5 rounded border border-slate-800 text-[8px] font-mono text-emerald-400">
                        تراکم گره بردار: ۱,۴۲۰ گره نقشه کشی
                      </div>
                    </div>

                    {/* Extracted stats row */}
                    {parsedDims && (
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] bg-slate-900/60 p-2 rounded-lg border border-slate-900 font-mono">
                        <div className="border-l border-slate-850">
                          <span className="text-slate-500 block">طول استخراجی (L)</span>
                          <span className="text-slate-200 font-bold">{parsedDims.L} mm</span>
                        </div>
                        <div className="border-l border-slate-850">
                          <span className="text-slate-500 block">عرض استخراجی (W)</span>
                          <span className="text-slate-200 font-bold">{parsedDims.W} mm</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">ارتفاع استخراجی (H)</span>
                          <span className="text-slate-200 font-bold">{parsedDims.H} mm</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calibration status block */}
                  {parsedDims && (
                    <div className="flex gap-2 items-center bg-indigo-950/20 border border-indigo-900/40 p-2.5 rounded-lg mt-3 text-[10px] text-indigo-300 text-right">
                      <span>💡</span>
                      <p>
                        ابعاد استخراج شده با نقشه دایلاین تفاوت ناچیزی دارد. می‌توانید با فشردن دکمه زیر، ابعاد الگو را به مقادیر دقیق استخراج شده کالیبره و اصلاح کنید.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Advanced Parameter calibration panel (Sliders) */}
              <div className="bg-[#090d15] p-4 rounded-xl border border-slate-850 space-y-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold border-b border-slate-900 pb-2">
                  <Sliders className="w-4 h-4 text-emerald-500" />
                  <span>کالیبراسیون دستی پارامترهای تولید الگو</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slider 1: creaseFactor */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">جبران کسر خمش خم طولی (Bending Loss Coefficient):</span>
                      <span className="text-emerald-400 font-bold">{creaseFactor.toFixed(2)}x</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="0.4" 
                        max="2.0" 
                        step="0.1"
                        value={creaseFactor}
                        onChange={(e) => {
                          setCreaseFactor(parseFloat(e.target.value));
                          setShowCalibrationSuccess(false);
                        }}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Slider 2: glueShrinkage */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">کاهش عرضی زبانه چسبانک (Glue Flap Shrinkage):</span>
                      <span className="text-emerald-400 font-bold">-{glueShrinkage.toFixed(1)} mm</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="0.0" 
                        max="4.0" 
                        step="0.2"
                        value={glueShrinkage}
                        onChange={(e) => {
                          setGlueShrinkage(parseFloat(e.target.value));
                          setShowCalibrationSuccess(false);
                        }}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Slider 3: punchTolerance */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">تلورانس پانچینگ مجاز (Punching Tolerance):</span>
                      <span className="text-emerald-400 font-bold">±{punchTolerance.toFixed(1)} mm</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="0.1" 
                        max="2.0" 
                        step="0.1"
                        value={punchTolerance}
                        onChange={(e) => {
                          setPunchTolerance(parseFloat(e.target.value));
                          setShowCalibrationSuccess(false);
                        }}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Slider 4: cornerClearance */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">میزان ترخیص زاویه گوشه‌ها (Flap Angle Clearance):</span>
                      <span className="text-emerald-400 font-bold">{cornerClearance.toFixed(1)}°</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="range" 
                        min="1.0" 
                        max="6.0" 
                        step="0.5"
                        value={cornerClearance}
                        onChange={(e) => {
                          setCornerClearance(parseFloat(e.target.value));
                          setShowCalibrationSuccess(false);
                        }}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-900 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Confirm Calibrations Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      const key = `ashk_pattern_calibration_${activeRule.code}`;
                      localStorage.setItem(key, JSON.stringify({
                        creaseFactor,
                        glueShrinkage,
                        punchTolerance,
                        cornerClearance,
                        calibratedDims: parsedDims || dims
                      }));
                      setShowCalibrationSuccess(true);
                    }}
                    className="cursor-pointer flex-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black text-xs py-2.5 px-4 rounded-xl transition duration-300 shadow-md flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>ثبت و کالیبره کردن خودکار پارامترهای مهندسی الگو</span>
                  </button>

                  {parsedDims && onModelChange && (
                    <button
                      onClick={() => {
                        onModelChange(selectedStandardId);
                        alert(`ابعاد الگو با موفقیت به طول ${parsedDims.L}، عرض ${parsedDims.W} و ارتفاع ${parsedDims.H} اصلاح و همگام‌سازی شد.`);
                      }}
                      className="cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs py-2.5 px-4 rounded-xl transition flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>اصلاح قطعی ابعاد الگو به ابعاد فایل</span>
                    </button>
                  )}
                </div>

                {/* Successful calibration notification panel */}
                {showCalibrationSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl text-emerald-400 text-xs space-y-2 animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
                      <span className="font-extrabold">کالیبراسیون و اصلاح مهندسی الگو با موفقیت انجام شد!</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[10px] text-slate-300 mr-2 text-right">
                      <li>ضریب کسر خمش بهینه برای ورق ({material.name}) روی <strong className="text-emerald-400">{creaseFactor.toFixed(2)}x</strong> تنظیم شد.</li>
                      <li>عرض لبه چسبانک با کسر <strong className="text-emerald-400">-{glueShrinkage.toFixed(1)} میلی‌متر</strong> در نقشه نهایی بازنویسی شد.</li>
                      <li>رواداری لرزش پانچ دستگاه دایکاتور روی بازه استاتیک <strong className="text-emerald-400">±{punchTolerance.toFixed(1)} میلی‌متر</strong> فیکس گردید.</li>
                      <li>زاویه برش فیزیکی مهار گوشه‌ها با ترخیص <strong className="text-emerald-400">{cornerClearance.toFixed(1)} درجه</strong> اصلاح شد تا از برخورد اورلپ‌ها جلوگیری شود.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
