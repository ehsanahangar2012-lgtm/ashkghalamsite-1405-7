import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, AlertTriangle, ShieldAlert, CheckCircle2, 
  Sparkles, Sliders, ChevronDown, ChevronUp, Wrench, 
  Info, Award, Cpu, FileCheck, RefreshCw, Zap, Scale, Layers
} from 'lucide-react';
import { 
  evaluateDimensionAccuracy, 
  DimensionAccuracyInput, 
  DimensionAccuracyReport, 
  AccuracyIssueSuggestion 
} from '../services/dimensionAccuracyService';

interface DimensionAccuracyEvaluatorProps {
  input: DimensionAccuracyInput;
  onApplySuggestion?: (field: 'L' | 'W' | 'H' | 'tuck' | 'dustFlap' | 'glueTab' | 'grammage' | 'thickness', value: number) => void;
  onApplyAllFixes?: (suggestions: AccuracyIssueSuggestion[]) => void;
  className?: string;
}

export const DimensionAccuracyEvaluator: React.FC<DimensionAccuracyEvaluatorProps> = ({
  input,
  onApplySuggestion,
  onApplyAllFixes,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'issues' | 'passes' | 'metrics'>('issues');

  const report: DimensionAccuracyReport = evaluateDimensionAccuracy(input);

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'from-emerald-500 to-teal-400 text-emerald-300';
    if (score >= 80) return 'from-sky-500 to-blue-400 text-sky-300';
    if (score >= 60) return 'from-amber-500 to-yellow-400 text-amber-300';
    return 'from-rose-500 to-red-400 text-rose-300';
  };

  return (
    <div className={`rounded-2xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md shadow-2xl text-slate-100 overflow-hidden dir-rtl ${className}`}>
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-slate-800/60 transition-colors border-b border-slate-800/80"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-100">
                ماژول ارزیابی دقت ابعاد و استانداردهای دایلاین
              </h3>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${report.gradeColor}`}>
                {report.gradeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              اعتبارسنجی هندسی مقادیر ورودی بر اساس استانداردهای ECMA ،FEFCO و DIN 55437
            </p>
          </div>
        </div>

        {/* Right side Score & Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">نمره دقت:</span>
            <span className={`text-lg font-black bg-gradient-to-r ${getScoreColor(report.overallScore)} bg-clip-text text-transparent`}>
              {report.overallScore}٪
            </span>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors p-1">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-5 space-y-5"
          >
            {/* Top Score Indicator Gauge & Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="flex flex-col justify-center items-center p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 mb-1">امتیاز استاندارد</span>
                <span className={`text-2xl font-black bg-gradient-to-r ${getScoreColor(report.overallScore)} bg-clip-text text-transparent`}>
                  {report.overallScore} / ۱۰۰
                </span>
                <span className="text-[10px] text-slate-500 mt-1">حداقل قبولی: ۹۵٪</span>
              </div>

              <div className="flex flex-col justify-center p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>حجم محاسباتی جعبه:</span>
                  <span className="font-bold text-slate-200">{report.calculatedVolumeCm3} cm³</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>گرماژ پیشنهادی:</span>
                  <span className="font-bold text-indigo-300">{report.recommendedGrammageMin}-{report.recommendedGrammageMax} g/m²</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>ضخامت ضریب تا (Caliper):</span>
                  <span className="font-bold text-indigo-300">{report.recommendedCaliperMm} mm</span>
                </div>
              </div>

              <div className="flex flex-col justify-center p-3 rounded-lg bg-slate-900/80 border border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>زبانه درپوش ایده‌آل:</span>
                  <span className="font-bold text-emerald-400">{report.idealTuckFlapMm} mm</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                  <span>باله گردگیر ایده‌آل:</span>
                  <span className="font-bold text-emerald-400">{report.idealDustFlapMm} mm</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>عرض لب‌چسب ایده‌آل:</span>
                  <span className="font-bold text-emerald-400">{report.idealGlueTabMm} mm</span>
                </div>
              </div>

              <div className="flex flex-col justify-center items-center p-3 rounded-lg bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/40 text-center">
                <span className="text-xs text-indigo-300 mb-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-indigo-400" />
                  مقاومت لهیدگی (BCT)
                </span>
                <span className="text-xl font-bold text-indigo-200">
                  ~ {report.bctCompressiveStrengthKg} kgf
                </span>
                <span className="text-[10px] text-slate-400 mt-1">تخمین مقاومت فشار عمودی</span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 gap-2">
              <button
                onClick={() => setActiveTab('issues')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'issues'
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                مغایرت‌ها و اصلاحات فنی ({report.criticalErrors.length + report.technicalWarnings.length})
              </button>

              <button
                onClick={() => setActiveTab('passes')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'passes'
                    ? 'border-emerald-500 text-emerald-300 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                تأییدیه‌های هندسی ({report.compliantPasses.length})
              </button>

              <button
                onClick={() => setActiveTab('metrics')}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
                  activeTab === 'metrics'
                    ? 'border-sky-500 text-sky-300 bg-sky-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-4 h-4 text-sky-400" />
                پارامترهای صنعتی و ضریب تا
              </button>

              {report.suggestions.length > 0 && onApplyAllFixes && (
                <button
                  onClick={() => onApplyAllFixes(report.suggestions)}
                  className="mr-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/20 transition-all"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  اصلاح اتوماتیک همه موارد ({report.suggestions.length})
                </button>
              )}
            </div>

            {/* TAB CONTENT 1: ISSUES & SUGGESTIONS */}
            {activeTab === 'issues' && (
              <div className="space-y-3">
                {report.criticalErrors.length === 0 && report.technicalWarnings.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-300">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm">هیچ مغایرت هندسی یافت نشد</h4>
                      <p className="text-xs text-emerald-400/80 mt-0.5">
                        ابعاد ورودی با استانداردهای ECMA و FEFCO مطابقت ۱۰۰٪ داشته و هیچ تداخل مکانیکی در خط تولید ایجاد نخواهد کرد.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Critical Errors */}
                    {report.criticalErrors.map((err, idx) => (
                      <div key={`err-${idx}`} className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-200 flex items-start gap-3">
                        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs leading-relaxed">
                          {err}
                        </div>
                      </div>
                    ))}

                    {/* Technical Warnings */}
                    {report.technicalWarnings.map((warn, idx) => (
                      <div key={`warn-${idx}`} className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1 text-xs leading-relaxed">
                          {warn}
                        </div>
                      </div>
                    ))}

                    {/* Interactive Actionable Suggestions */}
                    {report.suggestions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <h4 className="text-xs font-bold text-indigo-300 mb-3 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-400" />
                          پیشنهادات هوشمند اصلاح اتوماتیک ابعاد:
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {report.suggestions.map((sug) => (
                            <div 
                              key={sug.id} 
                              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-colors flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-bold text-slate-200">{sug.title}</span>
                                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    {sug.standardRef}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mb-1">{sug.issue}</p>
                                <p className="text-xs text-indigo-300 font-medium">{sug.fix}</p>
                              </div>

                              {onApplySuggestion && (
                                <button
                                  onClick={() => onApplySuggestion(sug.field, sug.suggestedValue)}
                                  className="mt-3 flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/60 border border-indigo-500/40 text-indigo-200 text-xs font-medium transition-all"
                                >
                                  <Wrench className="w-3.5 h-3.5" />
                                  اعمال مقدار جدید ({sug.suggestedValue} mm)
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: COMPLIANT PASSES */}
            {activeTab === 'passes' && (
              <div className="space-y-2">
                {report.compliantPasses.map((pass, idx) => (
                  <div key={`pass-${idx}`} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-emerald-300 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{pass}</span>
                  </div>
                ))}
              </div>
            )}

            {/* TAB CONTENT 3: METRICS & CREASE ALLOWANCE */}
            {activeTab === 'metrics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <FileCheck className="w-4 h-4 text-indigo-400" />
                    محاسبات جبران ضخامت مقوا (Material Crease Allowance)
                  </h4>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">ضخامت کاغذ (Caliper T):</span>
                    <span className="font-bold text-slate-200">{input.thickness} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-800/50">
                    <span className="text-slate-400">خطای کسر خط تا (Crease Loss):</span>
                    <span className="font-bold text-indigo-300">{report.creaseLossFactorMm} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">محدوده شعاع خم استاندارد:</span>
                    <span className="font-bold text-emerald-300">{(input.thickness * 1.5).toFixed(2)} - {(input.thickness * 2.2).toFixed(2)} mm</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    استانداردهای مرجع صنعتی
                  </h4>
                  <div className="text-slate-400 leading-relaxed text-[11px]">
                    <p className="mb-1">
                      <strong className="text-slate-300">ECMA Standard:</strong> الزامات درپوش کشویی، نسبت باله‌های گردگیر و عرض لب‌چسب جعبه‌های دارویی و آرایشی.
                    </p>
                    <p className="mb-1">
                      <strong className="text-slate-300">FEFCO Standard:</strong> مشخصات هندسی کارتن‌های مایکروویو و جعبه‌های ته قفلی (Crash Lock Bottom).
                    </p>
                    <p>
                      <strong className="text-slate-300">DIN 55437:</strong> استاندارد سنجش مقاومت فشار عمودی و ضریب شکست بستر مقوا در خط تا.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
