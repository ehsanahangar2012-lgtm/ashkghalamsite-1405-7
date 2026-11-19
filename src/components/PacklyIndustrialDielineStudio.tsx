import React, { useMemo, useState } from 'react';
import {
  Box,
  Download,
  Layers,
  Maximize2,
  Minimize2,
  Ruler,
  Save,
  Scissors,
  ShieldCheck,
  Sparkles,
  Grid,
  ArrowLeftRight,
} from 'lucide-react';
import {
  STANDARD_DIELINE_ENGINES,
  DielineEngineResult,
  calculateDielineParameters,
} from '../services/dielineMath';
import { calculateMaterialCompensation } from '../services/materialCompensationEngine';
import { calculateGangingLayout } from '../services/impositionService';
import { buildAutoCadDxfString, buildCff2String } from '../utils/dielineExport';
import { Project } from '../types';
import { DimensionInput } from './DimensionInput';

interface PacklyIndustrialDielineStudioProps {
  onSaveProject?: (p: Partial<Project>) => void;
  initialModelId?: string;
  initialDims?: { L: number; W: number; H: number };
}

const STUDIO_MODELS = [
  { id: 'ecma-a2020', code: 'ECMA A20.20', name: 'جعبه دارویی/آرایشی زبانه‌دار', dims: { L: 65, W: 45, H: 115 }, mat: 'inderboard-300' },
  { id: 'snap-lock-123', code: 'ECMA A2110', name: 'جعبه لاک‌باتم ۱-۲-۳', dims: { L: 80, W: 55, H: 120 }, mat: 'inderboard-350' },
  { id: 'fefco-0215', code: 'FEFCO 0215', name: 'کارتن ته‌قفلی اتوماتیک (Crash Lock)', dims: { L: 150, W: 100, H: 140 }, mat: 'corrugated-e' },
  { id: 'fefco-0427', code: 'FEFCO 0427', name: 'جعبه پستی کیبوردی قفل‌دار', dims: { L: 220, W: 160, H: 60 }, mat: 'corrugated-e' },
  { id: 'fefco-pizza', code: 'FEFCO 0426', name: 'جعبه پیتزا با منافذ تهویه بخار', dims: { L: 300, W: 300, H: 42 }, mat: 'corrugated-e' },
  { id: 'fefco-0201', code: 'FEFCO 0201', name: 'کارتن مادر استاندارد (RSC)', dims: { L: 300, W: 220, H: 180 }, mat: 'corrugated-b' },
  { id: 'fefco-0300', code: 'FEFCO 0300', name: 'جعبه تلسکوپی دو تکه درب و زیره', dims: { L: 210, W: 150, H: 65 }, mat: 'sbs-400' },
  { id: 'ecma-c1020', code: 'ECMA C10.20', name: 'جعبه کشویی ریلی دو تکه', dims: { L: 135, W: 95, H: 45 }, mat: 'sbs-300' },
  { id: 'ecma-a30', code: 'ECMA A30', name: 'جعبه آویز سوپرمارکتی (Euro-Slot)', dims: { L: 65, W: 40, H: 135 }, mat: 'inderboard-300' },
  { id: 'ecma-d50', code: 'ECMA D50', name: 'استند دیسپلی رومیزی (PDQ)', dims: { L: 180, W: 150, H: 160 }, mat: 'corrugated-e' },
];

const STUDIO_MATERIALS = [
  { id: 'inderboard-300', name: 'ایندربرد ۳۰۰ گرم (۰.۴۲mm)', caliper: 0.42 },
  { id: 'inderboard-350', name: 'ایندربرد ۳۵۰ گرم (۰.۵۰mm)', caliper: 0.50 },
  { id: 'sbs-300', name: 'سولفات سفید ۳۰۰ گرم (۰.۳۸mm)', caliper: 0.38 },
  { id: 'sbs-400', name: 'سولفات سفید ۴۰۰ گرم (۰.۵۲mm)', caliper: 0.52 },
  { id: 'kraft-300', name: 'کرافت ۳۰۰ گرم (۰.۴۴mm)', caliper: 0.44 },
  { id: 'corrugated-e', name: 'کارتن E-Flute (۱.۶۰mm)', caliper: 1.60 },
  { id: 'corrugated-b', name: 'کارتن B-Flute (۳.۲۰mm)', caliper: 3.20 },
  { id: 'corrugated-eb', name: 'کارتن ۵ لایه EB (۴.۸۰mm)', caliper: 4.80 },
];

const STUDIO_SHEETS = [
  { id: '100x70', name: '۱۰۰ × ۷۰ سانتی‌متر', width: 1000, height: 700 },
  { id: '102x72', name: '۱۰۲ × ۷۲ سانتی‌متر', width: 1020, height: 720 },
  { id: '90x60', name: '۹۰ × ۶۰ سانتی‌متر', width: 900, height: 600 },
  { id: '70x50', name: '۷۰ × ۵۰ سانتی‌متر', width: 700, height: 500 },
];

export const PacklyIndustrialDielineStudio: React.FC<PacklyIndustrialDielineStudioProps> = ({
  onSaveProject,
  initialModelId,
  initialDims,
}) => {
  const defaultM = STUDIO_MODELS.find((m) => m.id === initialModelId) || STUDIO_MODELS[0];
  const [modelId, setModelId] = useState(defaultM.id);
  const [dims, setDims] = useState(initialDims || defaultM.dims);
  const [materialId, setMaterialId] = useState(defaultM.mat);
  const [dimensionBasis, setDimensionBasis] = useState<'manufacturing' | 'inner'>('inner');
  const [variant, setVariant] = useState<'standard' | 'reinforced' | 'eco'>('standard');
  const [tuckStyle, setTuckStyle] = useState<'reverse' | 'straight'>('reverse');
  const [includePerf, setIncludePerf] = useState(true);
  const [bleedMm, setBleedMm] = useState(4);
  const [sheetId, setSheetId] = useState('100x70');
  const [viewMode, setViewMode] = useState<'blueprint' | 'imposition'>('blueprint');
  const [zoom, setZoom] = useState(1);

  const [visibleLayers, setVisibleLayers] = useState({
    cuts: true,
    creases: true,
    perforations: true,
    glues: true,
    bleeds: true,
    labels: true,
  });

  const activeModel = useMemo(
    () => STUDIO_MODELS.find((m) => m.id === modelId) || STUDIO_MODELS[0],
    [modelId]
  );
  const activeMat = useMemo(
    () => STUDIO_MATERIALS.find((m) => m.id === materialId) || STUDIO_MATERIALS[0],
    [materialId]
  );

  const compensation = useMemo(
    () =>
      calculateMaterialCompensation(
        activeMat.id,
        dims.L,
        dims.W,
        dims.H,
        activeMat.caliper,
        dimensionBasis
      ),
    [activeMat, dims, dimensionBasis]
  );

  const dieline: DielineEngineResult = useMemo(() => {
    const engine = STANDARD_DIELINE_ENGINES[modelId] || STANDARD_DIELINE_ENGINES['default-rsc'];
    const calc = calculateDielineParameters(
      compensation.manufacturingL,
      compensation.manufacturingW,
      compensation.manufacturingH,
      compensation.caliperMm,
      modelId
    );
    return engine({
      L: compensation.manufacturingL,
      W: compensation.manufacturingW,
      H: compensation.manufacturingH,
      glueTab: calc.glueTab,
      tuck: calc.tuck,
      dustFlap: calc.dustFlap,
      thickness: compensation.caliperMm,
      variant,
      tuckStyle,
      bleedMm,
      includePerforations: includePerf,
    });
  }, [modelId, compensation, variant, tuckStyle, bleedMm, includePerf]);

  const nesting = useMemo(() => {
    return calculateGangingLayout(
      [
        {
          id: modelId,
          name: activeModel.code,
          w: dieline.totalW,
          h: dieline.totalH,
          netArea: (dieline.metrics?.netBlankAreaSqCm || 100) * 100,
          allowInterlock: true,
        },
      ],
      sheetId,
      { gripperMargin: 12, trimMargin: 5, bladeKerf: 4 },
      STUDIO_SHEETS
    );
  }, [modelId, activeModel, dieline, sheetId]);

  const handleModelSwitch = (id: string) => {
    const found = STUDIO_MODELS.find((m) => m.id === id);
    setModelId(id);
    if (found) {
      setDims(found.dims);
      setMaterialId(found.mat);
    }
  };

  const downloadTextFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportDxf = () => {
    const dxf = buildAutoCadDxfString(dieline, {
      includeDimensions: visibleLayers.labels,
      bleedOffset: bleedMm,
    });
    downloadTextFile(
      dxf,
      `AshkGhalam_PRO_${activeModel.code.replace(/\s+/g, '_')}_${dims.L}x${dims.W}x${dims.H}.dxf`,
      'application/dxf'
    );
  };

  const handleExportCff2 = () => {
    const cf2 = buildCff2String(dieline, `${activeModel.code}_${dims.L}x${dims.W}x${dims.H}`);
    downloadTextFile(
      cf2,
      `AshkGhalam_PRO_${activeModel.code.replace(/\s+/g, '_')}_${dims.L}x${dims.W}x${dims.H}.cf2`,
      'text/plain;charset=utf-8'
    );
  };

  const handleExportSvg = () => {
    const pad = bleedMm + 18;
    const vx = dieline.xMin - pad;
    const vy = dieline.yMin - pad;
    const vw = dieline.totalW + pad * 2;
    const vh = dieline.totalH + pad * 2;
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${vw.toFixed(2)}mm" height="${vh.toFixed(2)}mm" viewBox="${vx.toFixed(2)} ${vy.toFixed(2)} ${vw.toFixed(2)} ${vh.toFixed(2)}">
  <g id="BLEED" stroke="#06b6d4" stroke-width="0.35" stroke-dasharray="4,2" fill="none">
    ${(dieline.bleeds || []).map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <g id="GLUE" stroke="#10b981" stroke-width="0.3" fill="rgba(16,185,129,0.18)">
    ${(dieline.glues || []).map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <g id="PERFORATION" stroke="#f97316" stroke-width="0.4" stroke-dasharray="2,1.5" fill="none">
    ${(dieline.perforations || []).map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <g id="CREASE" stroke="#16a34a" stroke-width="0.38" stroke-dasharray="3.5,2" fill="none">
    ${dieline.creases.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
  <g id="CUT" stroke="#dc2626" stroke-width="0.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    ${dieline.cuts.map((d) => `<path d="${d}"/>`).join('\n    ')}
  </g>
</svg>`;
    downloadTextFile(
      svg,
      `AshkGhalam_PRO_${activeModel.code.replace(/\s+/g, '_')}_${dims.L}x${dims.W}x${dims.H}.svg`,
      'image/svg+xml;charset=utf-8'
    );
  };

  const handleSave = () => {
    if (!onSaveProject) return;
    onSaveProject({
      title: `قالب صنعتی ${activeModel.code} (${dims.L}×${dims.W}×${dims.H})`,
      type: 'dieline',
      status: 'saved_design',
      dielineConfig: {
        typeId: modelId,
        dimensions: { w: dims.L, h: dims.H, d: dims.W },
        paperType: activeMat.name,
        variant,
        tuckStyle,
      },
    });
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#060910] text-slate-100 overflow-hidden font-sans" dir="rtl">
      {/* Right Engineering Sidebar */}
      <aside className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-l border-slate-800 bg-[#0b1018] overflow-y-auto p-4 space-y-4 shrink-0 max-h-[45vh] lg:max-h-full">
        {/* Pattern Selector */}
        <div>
          <label className="text-[11px] font-black text-slate-300 flex items-center gap-1.5 mb-2">
            <Box className="w-3.5 h-3.5 text-amber-400" />
            <span>ساختار مهندسی FEFCO / ECMA</span>
          </label>
          <select
            value={modelId}
            onChange={(e) => handleModelSwitch(e.target.value)}
            className="w-full bg-[#060910] border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-sky-500"
          >
            {STUDIO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.code} — {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dimensions + Basis Switch */}
        <div className="bg-[#070b12] border border-slate-800 rounded-2xl p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-sky-300 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5" />
              ابعاد (میلی‌متر)
            </span>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setDimensionBasis('inner')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  dimensionBasis === 'inner' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                داخل خالص
              </button>
              <button
                type="button"
                onClick={() => setDimensionBasis('manufacturing')}
                className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                  dimensionBasis === 'manufacturing' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                خط‌تا (CAD)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['L', 'W', 'H'] as const).map((axis) => (
              <div key={axis}>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  {axis === 'L' ? 'طول (L)' : axis === 'W' ? 'عرض (W)' : 'ارتفاع (H)'}
                </label>
                <DimensionInput
                  label=""
                  value={dims[axis]}
                  unit="mm"
                  minMm={20}
                  maxMm={1200}
                  onChange={(valInMm) =>
                    setDims((prev) => ({
                      ...prev,
                      [axis]: valInMm,
                    }))
                  }
                  convertMmToUnit={(v) => Math.round(v)}
                  convertUnitToMm={(v) => v}
                  className="w-full"
                  inputClassName="w-full bg-[#04060b] border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center text-white focus:border-sky-500 outline-none selection:bg-sky-500/40 selection:text-white"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-500 block">داخل مفید:</span>
              <span className="text-emerald-400 font-bold">
                {compensation.innerL}×{compensation.innerW}×{compensation.innerH}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">بیرونی نهایی:</span>
              <span className="text-amber-300 font-bold">
                {compensation.outerL}×{compensation.outerW}×{compensation.outerH}
              </span>
            </div>
          </div>
        </div>

        {/* Board, Variant, Tuck & Perforation Options */}
        <div className="bg-[#070b12] border border-slate-800 rounded-2xl p-3 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">متریال و گرماژ / فلوت:</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="w-full bg-[#04060b] border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white outline-none"
            >
              {STUDIO_MATERIALS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'standard', label: 'استاندارد' },
                { id: 'reinforced', label: 'تقویت‌شده' },
                { id: 'eco', label: 'اقتصادی Eco' },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariant(v.id)}
                className={`py-1.5 rounded-lg text-[10px] font-bold border cursor-pointer transition-colors ${
                  variant === v.id
                    ? 'bg-indigo-600 border-indigo-400 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {(modelId === 'ecma-a2020' || modelId === 'ecma-a30') && (
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[10px] text-slate-400 font-bold">جهت زبانه درب بالا/پایین:</span>
              <div className="flex gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => setTuckStyle('reverse')}
                  className={`px-2 py-1 rounded border cursor-pointer ${
                    tuckStyle === 'reverse'
                      ? 'bg-sky-600 border-sky-400 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  متقابل (RTE)
                </button>
                <button
                  type="button"
                  onClick={() => setTuckStyle('straight')}
                  className={`px-2 py-1 rounded border cursor-pointer ${
                    tuckStyle === 'straight'
                      ? 'bg-sky-600 border-sky-400 text-white font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  هم‌جهت (STE)
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] pt-1">
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer font-bold">
              <input
                type="checkbox"
                checked={includePerf}
                onChange={(e) => setIncludePerf(e.target.checked)}
                className="accent-amber-500"
              />
              <span>خط پرفراژ بازشوی سریع</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">بلید (mm):</span>
              <input
                type="number"
                min={0}
                max={15}
                value={bleedMm}
                onChange={(e) => setBleedMm(Math.max(0, Number(e.target.value) || 0))}
                className="w-12 bg-[#04060b] border border-slate-700 rounded px-1.5 py-0.5 text-center font-mono text-white"
              />
            </div>
          </div>
        </div>

        {/* Die-Shop Rule & Matrix Engineering Specs */}
        <div className="bg-[#070b12] border border-slate-800 rounded-2xl p-3 space-y-2 text-[10.5px]">
          <div className="font-black text-amber-400 flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5" />
            <span>مشخصات فنی قالب و خط‌تا (Die-Shop)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono">
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[9px]">تیغ خط‌تا و ماتریکس</span>
              <span className="text-sky-300 font-bold">
                {compensation.creasingRulePt}pt · {compensation.creasingMatrixWidthMm}×{compensation.creasingMatrixDepthMm}mm
              </span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[9px]">افت تاخوردگی / شکاف</span>
              <span className="text-emerald-400 font-bold">
                {compensation.bendDeductionPer90Deg}mm / {compensation.slotWidthMm}mm
              </span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[9px]">متراژ خط برش (CUT)</span>
              <span className="text-rose-400 font-bold">
                {((dieline.metrics?.cutLengthMm || 0) / 1000).toFixed(2)} m
              </span>
            </div>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800/80">
              <span className="text-slate-500 block text-[9px]">متراژ خط تا (CREASE)</span>
              <span className="text-emerald-300 font-bold">
                {((dieline.metrics?.creaseLengthMm || 0) / 1000).toFixed(2)} m
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main CAD Viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Engineering Toolbar */}
        <div className="px-3 sm:px-4 py-2.5 border-b border-slate-800 bg-[#090d15] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode('blueprint')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                viewMode === 'blueprint'
                  ? 'bg-sky-600 border-sky-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>نقشه چندلایه CAD</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('imposition')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border ${
                viewMode === 'imposition'
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>چیدمان تودرتو شیت ({nesting.yieldCount} تایی)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleExportCff2}
              className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] flex items-center gap-1 cursor-pointer"
              title="فرمت استاندارد دستگاه‌های برش قالب و پلاتر Kongsberg/Zund"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CFF2 (.cf2)</span>
            </button>
            <button
              type="button"
              onClick={handleExportDxf}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>DXF</span>
            </button>
            <button
              type="button"
              onClick={handleExportSvg}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>SVG</span>
            </button>
            {onSaveProject && (
              <button
                type="button"
                onClick={handleSave}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-sky-400" />
                <span>ذخیره</span>
              </button>
            )}
          </div>
        </div>

        {/* Layer Toggles Strip (Blueprint Mode) */}
        {viewMode === 'blueprint' ? (
          <div className="px-4 py-2 border-b border-slate-800/80 bg-[#070a10] flex flex-wrap items-center justify-between gap-2 text-[10px]">
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'cuts', label: 'برش (CUT)', color: 'bg-rose-500' },
                  { id: 'creases', label: 'خط تا (CREASE)', color: 'bg-emerald-500' },
                  { id: 'perforations', label: 'پرفراژ (PERF)', color: 'bg-orange-500' },
                  { id: 'glues', label: 'چسب (GLUE)', color: 'bg-teal-400' },
                  { id: 'bleeds', label: 'بلید (BLEED)', color: 'bg-cyan-400' },
                  { id: 'labels', label: 'اندازه‌گذاری', color: 'bg-amber-400' },
                ] as const
              ).map((ly) => {
                const active = visibleLayers[ly.id];
                return (
                  <button
                    key={ly.id}
                    type="button"
                    onClick={() =>
                      setVisibleLayers((prev) => ({ ...prev, [ly.id]: !prev[ly.id] }))
                    }
                    className={`px-2 py-1 rounded-lg border font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      active
                        ? 'bg-slate-900 border-slate-700 text-slate-100'
                        : 'bg-transparent border-slate-800/50 text-slate-500 opacity-60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${ly.color}`} />
                    <span>{ly.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 font-mono">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.15).toFixed(2))))}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <span className="text-slate-300 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-2 border-b border-slate-800/80 bg-[#070a10] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">سایز شیت چاپ:</span>
              <select
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
              >
                {STUDIO_SHEETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
              <span className="text-slate-400">
                عادی: <strong className="text-slate-200">{nesting.comparison.normalCount}</strong>
              </span>
              <span className="text-slate-400">
                چرخیده ۹۰°: <strong className="text-sky-300">{nesting.comparison.rotatedCount}</strong>
              </span>
              <span className="text-emerald-400 font-bold">
                تودرتو ۱۸۰°: {nesting.comparison.interlockedCount} قالب (بازده{' '}
                {Math.round(nesting.usedAreaPercentage * 100)}%)
              </span>
            </div>
          </div>
        )}

        {/* SVG CAD Canvas Area */}
        <div className="flex-1 bg-[#05070c] relative overflow-auto flex items-center justify-center p-4">
          {viewMode === 'blueprint' ? (
            <svg
              viewBox={`${dieline.xMin - 45} ${dieline.yMin - 45} ${dieline.totalW + 90} ${dieline.totalH + 90}`}
              className="w-full h-full max-h-[75vh] transition-transform duration-150"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              {/* Bleed */}
              {visibleLayers.bleeds &&
                (dieline.bleeds || []).map((d, idx) => (
                  <path
                    key={`bl-${idx}`}
                    d={d}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="0.6"
                    strokeDasharray="4,2.5"
                    opacity="0.8"
                  />
                ))}

              {/* Glue Zones */}
              {visibleLayers.glues &&
                (dieline.glues || []).map((d, idx) => (
                  <path
                    key={`gl-${idx}`}
                    d={d}
                    fill="rgba(16,185,129,0.22)"
                    stroke="#10b981"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                ))}

              {/* Perforations */}
              {visibleLayers.perforations &&
                (dieline.perforations || []).map((d, idx) => (
                  <path
                    key={`pf-${idx}`}
                    d={d}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="0.8"
                    strokeDasharray="2.5,1.8"
                  />
                ))}

              {/* Creases */}
              {visibleLayers.creases &&
                dieline.creases.map((d, idx) => (
                  <path
                    key={`cr-${idx}`}
                    d={d}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="0.7"
                    strokeDasharray="4,2"
                  />
                ))}

              {/* Cuts */}
              {visibleLayers.cuts &&
                dieline.cuts.map((d, idx) => (
                  <path
                    key={`ct-${idx}`}
                    d={d}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}

              {/* Labels & Overall Blank Dimension Callout */}
              {visibleLayers.labels && (
                <g>
                  <text
                    x={(dieline.xMin + dieline.xMax) / 2}
                    y={dieline.yMin - 18}
                    fill="#38bdf8"
                    fontSize="10"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    عرض گسترده شیت (Blank): {Math.round(dieline.totalW)} × {Math.round(dieline.totalH)} mm
                  </text>
                  {dieline.labels.map((lbl, idx) => (
                    <text
                      key={`lb-${idx}`}
                      x={lbl.x}
                      y={lbl.y}
                      fill="#e2e8f0"
                      fontSize="8.5"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {lbl.text}
                    </text>
                  ))}
                </g>
              )}
            </svg>
          ) : (
            <svg
              viewBox={`0 0 ${nesting.sheetWidth} ${nesting.sheetHeight}`}
              className="w-full h-full max-h-[75vh] bg-slate-100 rounded-xl shadow-2xl border border-slate-700"
            >
              {/* Gripper zone */}
              <rect
                x={0}
                y={0}
                width={nesting.sheetWidth}
                height={nesting.gripperMargin}
                fill="rgba(245,158,11,0.22)"
              />
              <text
                x={nesting.sheetWidth / 2}
                y={nesting.gripperMargin - 3}
                fill="#b45309"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
              >
                حاشیه پنجه ماشین چاپ ({nesting.gripperMargin} mm Gripper)
              </text>

              {nesting.placedItems.map((item, idx) => {
                const cx = item.x + item.w / 2;
                const cy = item.y + item.h / 2;
                return (
                  <g key={item.id || idx}>
                    <rect
                      x={item.x}
                      y={item.y}
                      width={item.w}
                      height={item.h}
                      fill={item.angle === 180 || item.angle === 270 ? 'rgba(16,185,129,0.16)' : 'rgba(14,165,233,0.14)'}
                      stroke={item.angle === 180 || item.angle === 270 ? '#059669' : '#0284c7'}
                      strokeWidth="1.5"
                      rx="3"
                    />
                    <text
                      x={cx}
                      y={cy}
                      fill="#0f172a"
                      fontSize="14"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      #{idx + 1} ({item.angle}°)
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Bottom Engineering Status Footer */}
        <div className="px-4 py-2 border-t border-slate-800 bg-[#090d15] flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              موتور پارامتریک FEFCO/ECMA v4
            </span>
            <span className="font-mono">
              سگمنت‌ها: {dieline.cuts.length} برش / {dieline.creases.length} تا
              {(dieline.perforations?.length || 0) > 0 && ` / ${dieline.perforations.length} پرفراژ`}
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono">
            <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
            <span>
              مساحت شیت گسترده: {dieline.metrics?.grossBlankAreaSqCm || 0} cm² · مساحت خالص:{' '}
              {dieline.metrics?.netBlankAreaSqCm || 0} cm²
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
