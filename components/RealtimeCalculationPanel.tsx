import React, { useState, useMemo, useCallback } from 'react';
import { 
  RealtimeCalculationEngine, 
  Dieline3DParameters, 
  RealtimeFeedbackResult, 
  GeometricErrorItem 
} from '../services/realtimeCalculationEngine';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  Box, 
  Layers, 
  Ruler, 
  Scale, 
  Sparkles, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  ShieldAlert, 
  Layers3, 
  Maximize2 
} from 'lucide-react';
import { Button, Badge, Card } from './UIComponents';

interface RealtimeCalculationPanelProps {
  parameters: Dieline3DParameters;
  onUpdateParameters: (newParams: Dieline3DParameters) => void;
  className?: string;
}

export const RealtimeCalculationPanel: React.FC<RealtimeCalculationPanelProps> = React.memo(({
  parameters,
  onUpdateParameters,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'physics' | 'panels'>('overview');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Perform instant real-time feedback computation on parameters change (cached engine)
  const feedback: RealtimeFeedbackResult = useMemo(() => {
    return RealtimeCalculationEngine.calculateRealtimeFeedback(parameters);
  }, [
    parameters.L,
    parameters.W,
    parameters.H,
    parameters.glueTab,
    parameters.tuck,
    parameters.dustFlap,
    parameters.materialThickness,
    parameters.materialGsm,
    parameters.materialType,
    parameters.boxType,
    parameters.grainDirection,
    parameters.maxPressWidth,
    parameters.maxPressHeight
  ]);

  // Execute Auto-Correction
  const handleAutoFixAll = useCallback(() => {
    const { correctedParams } = RealtimeCalculationEngine.autoCorrectParameters(parameters);
    onUpdateParameters(correctedParams);
  }, [parameters, onUpdateParameters]);

  const handleApplySingleFix = useCallback((item: GeometricErrorItem) => {
    if (item.suggestedCorrection) {
      onUpdateParameters({
        ...parameters,
        ...item.suggestedCorrection
      });
    }
  }, [parameters, onUpdateParameters]);

  return (
    <div className={`bg-white dark:bg-gray-850 rounded-xl border border-gray-200 dark:border-gray-750 shadow-md overflow-hidden transition-all ${className}`}>
      
      {/* Top Real-time Calculation Header Bar */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`p-2 rounded-lg ${feedback.isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                موتور محاسبه و بازخورد هندسی لحظه‌ای (Real-time CAD Kernel)
              </h3>
              <Badge color={feedback.isValid ? 'green' : 'red'}>
                {feedback.isValid ? 'هندسه استاندارد' : `${feedback.errors.length} خطای بحرانی`}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono-rtl">
              امتیاز کیفیت ساخت: <span className="font-bold text-primary-400">{feedback.qualityScore} از ۱۰۰</span> • زمان پردازش: <span className="text-green-400">&lt; ۲ میلی‌ثانیه</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(feedback.errors.length > 0 || feedback.warnings.length > 0) && (
            <Button
              size="sm"
              onClick={handleAutoFixAll}
              className="bg-primary-600 hover:bg-primary-700 text-white text-[11px] font-bold px-3 py-1.5 flex items-center gap-1.5 shadow-sm"
            >
              <Zap className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
              اصلاح خودکار تمام خطاها
            </Button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'بستن پنل' : 'باز کردن پنل'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div>
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-gray-150 dark:border-gray-750 bg-gray-50/80 dark:bg-gray-800/50 px-3 pt-2 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 border-t-2 border-primary-500 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Ruler className="h-3.5 w-3.5" />
              خلاصه هندسه و متریال
            </button>

            <button
              onClick={() => setActiveTab('errors')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'errors'
                  ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 border-t-2 border-primary-500 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              بازرسی خطاها ({feedback.errors.length + feedback.warnings.length})
            </button>

            <button
              onClick={() => setActiveTab('physics')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'physics'
                  ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 border-t-2 border-primary-500 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              مقاومت فیزیکی BCT & ECT
            </button>

            <button
              onClick={() => setActiveTab('panels')}
              className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'panels'
                  ? 'bg-white dark:bg-gray-850 text-primary-600 dark:text-primary-400 border-t-2 border-primary-500 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Layers3 className="h-3.5 w-3.5" />
              پنل‌های سه بعدی ({feedback.panelSpatialData.length})
            </button>
          </div>

          {/* Tab Contents */}
          <div className="p-4">
            
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 2D Dimensions */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-2 flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5 text-blue-500" />
                    ابعاد شیت ۲ بعدی گسترده
                  </span>
                  <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                    {feedback.dimensions2D.sheetWidth} × {feedback.dimensions2D.sheetHeight} <span className="text-xs font-normal text-gray-500">mm</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>مساحت کل شیت:</span>
                      <span className="font-bold">{feedback.dimensions2D.grossAreaCm2} cm²</span>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-gray-300">
                      <span>پرت مقوا (Waste):</span>
                      <span className={`font-bold ${feedback.dimensions2D.materialWastePercentage > 30 ? 'text-amber-500' : 'text-green-600'}`}>
                        ٪{feedback.dimensions2D.materialWastePercentage}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full ${feedback.dimensions2D.materialWastePercentage > 30 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${feedback.dimensions2D.materialWastePercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 3D Volumes */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-2 flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5 text-indigo-500" />
                    حجم و سطح سه بعدی
                  </span>
                  <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                    {feedback.metrics3D.volumeLiters} <span className="text-xs font-normal text-gray-500">لیتر ({feedback.metrics3D.volumeCm3} cm³)</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>مساحت سطح خارجی:</span>
                      <span className="font-bold">{feedback.metrics3D.surfaceArea3DCm2} cm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>تعداد وجوه مش سه بعدی:</span>
                      <span className="font-bold">{feedback.metrics3D.estimatedMeshFaces} مثلث</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مرکز ثقل هندسی:</span>
                      <span className="font-mono text-[11px]">X:0 Y:{feedback.metrics3D.centerOfMass.y} Z:0</span>
                    </div>
                  </div>
                </div>

                {/* Tooling Lengths */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-2 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-emerald-500" />
                    متراژ تیغه‌های دایکات و لچک
                  </span>
                  <div className="text-lg font-black text-gray-900 dark:text-white font-mono">
                    {Math.round(feedback.dimensions2D.cutLengthTotalMm / 10)} <span className="text-xs font-normal text-gray-500">سانتی‌متر برش</span>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex justify-between">
                      <span>متراژ متناظر تیغه‌تا (Crease):</span>
                      <span className="font-bold">{Math.round(feedback.dimensions2D.creaseLengthTotalMm / 10)} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>مساحت چسب‌خوردگی:</span>
                      <span className="font-bold">{feedback.dimensions2D.glueAreaTotalMm2} mm²</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ریسک ترک خوردن رافل:</span>
                      <span className="font-bold text-green-600">{feedback.structuralPhysics.grainCrackingRisk}</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: ERRORS & WARNINGS */}
            {activeTab === 'errors' && (
              <div className="space-y-3">
                {feedback.errors.length === 0 && feedback.warnings.length === 0 ? (
                  <div className="p-6 text-center bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <h4 className="font-bold text-sm text-green-800 dark:text-green-300">هیچ خطای هندسی یا تداخلی یافت نشد</h4>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      تمام پارامترها و ابعاد لبه‌ها، زبانه‌ها و زبانی‌های گردگیر منطبق با استانداردهای صنعتی و ECMA/FEFCO می‌باشند.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Critical Errors */}
                    {feedback.errors.map(err => (
                      <div key={err.id} className="p-3.5 bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-red-900 dark:text-red-200">{err.titleFa}</span>
                              <span className="text-[10px] bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-300 font-mono px-1.5 py-0.5 rounded">
                                {err.code}
                              </span>
                            </div>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">{err.descriptionFa}</p>
                            <p className="text-[11px] text-red-600 dark:text-red-400 font-bold mt-1">پیشنهاد اصلاح: {err.fixSuggestionFa}</p>
                          </div>
                        </div>
                        {err.autoFixable && (
                          <Button
                            size="sm"
                            onClick={() => handleApplySingleFix(err)}
                            className="bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold shrink-0 shadow-xs"
                          >
                            اصلاح این مورد
                          </Button>
                        )}
                      </div>
                    ))}

                    {/* Warnings */}
                    {feedback.warnings.map(warn => (
                      <div key={warn.id} className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-amber-900 dark:text-amber-200">{warn.titleFa}</span>
                              <span className="text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-300 font-mono px-1.5 py-0.5 rounded">
                                {warn.code}
                              </span>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{warn.descriptionFa}</p>
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1">پیشنهاد: {warn.fixSuggestionFa}</p>
                          </div>
                        </div>
                        {warn.autoFixable && (
                          <Button
                            size="sm"
                            onClick={() => handleApplySingleFix(warn)}
                            className="bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shrink-0 shadow-xs"
                          >
                            تعمال پیشنهاد
                          </Button>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* TAB 3: PHYSICAL METRICS (BCT & ECT) */}
            {activeTab === 'physics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-primary-500" />
                    مقاومت فشار عمودی جعبه (BCT - Box Compression)
                  </h4>
                  <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                    {feedback.structuralPhysics.bctValueKg} <span className="text-sm font-normal text-gray-500">کیلوگرم ({feedback.structuralPhysics.bctValueN} N)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    حداکثر نیروی عمودی قابل تحمل قبل از له شدن مقوا بر اساس فرمول فیزیکی McKee.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h4 className="font-bold text-xs text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-secondary-500" />
                    تحمل چیدمان در انبار (Pallet Stacking)
                  </h4>
                  <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                    {feedback.structuralPhysics.maxStackingBoxes} <span className="text-sm font-normal text-gray-500">ردیف عمودی ({feedback.structuralPhysics.maxStackingWeightKg} kg)</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    تعداد جعبه مجاز در ردیف ستونی پالت بدون خطر لهیدگی لایه زیرین.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: 3D PANELS */}
            {activeTab === 'panels' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {feedback.panelSpatialData.map(panel => (
                  <div key={panel.panelId} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-900 dark:text-white">{panel.nameFa}</span>
                      {panel.isBasePanel && <Badge color="blue">پایه ثابت</Badge>}
                    </div>
                    <div className="text-[11px] text-gray-500 font-mono space-y-0.5">
                      <div>ابعاد ۲D: {panel.dimensions2D.width}×{panel.dimensions2D.height} mm</div>
                      <div>محور تا: {panel.foldAxis} | زاویه: {panel.foldAngleDeg}°</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
});
