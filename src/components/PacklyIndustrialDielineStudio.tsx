import React, { useMemo, useState } from 'react';
import { Download, Save, Box, Ruler, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ThreeDPreview } from './ThreeDPreview';
import { STANDARD_DIELINE_ENGINES } from '../services/dielineMath';
import type { DielineEngineResult } from '../services/dielineMath';
import type { Project } from '../types';

type TemplateOption = { id: string; name: string; code: string; note?: string };

const TEMPLATES: TemplateOption[] = [
  { id: 'fefco-0200', name: 'کارتن نیمه‌شیاردار روباز', code: 'FEFCO 0200' },
  { id: 'fefco-0201', name: 'کارتن چهارلَت استاندارد', code: 'FEFCO 0201' },
  { id: 'fefco-0203', name: 'کارتن فلپ هم‌پوشان', code: 'FEFCO 0203' },
  { id: 'fefco-0204', name: 'کارتن فلپ‌مرکزی', code: 'FEFCO 0204' },
  { id: 'fefco-0215', name: 'کارتن ته‌قفلی دستی', code: 'FEFCO 0215', note: 'قفل کف باید با نمونه فیزیکی تأیید شود.' },
  { id: 'fefco-0300', name: 'جعبه تلسکوپی درب و زیره', code: 'FEFCO 0300' },
  { id: 'fefco-0320', name: 'جعبه دو‌تکه تلسکوپی', code: 'FEFCO 0320' },
  { id: 'fefco-0427', name: 'جعبه کیبوردی/پستی', code: 'FEFCO 0427' },
  { id: 'fefco-pizza', name: 'جعبه پیتزا یک‌تکه', code: 'قالب اختصاصی', note: 'کد استاندارد رسمی برای این نسخه ادعا نمی‌شود؛ قفل و تهویه نیازمند بازبینی است.' },
  { id: 'ecma-a2020', name: 'جعبه دارویی Reverse Tuck End', code: 'ECMA A20.20' },
  { id: 'ecma-ste', name: 'جعبه Straight Tuck End', code: 'ECMA STE — الگوی پایه', note: 'شناسه توصیفی است، نه کد رسمی ECMA.' },
  { id: 'snap-lock-123', name: 'جعبه ته‌قفلی مقوایی', code: 'ECMA / ته‌قفلی', note: 'هندسه قفل باید طبق نمونه و ابزار خط تولید تأیید شود.' },
  { id: 'ecma-a30', name: 'جعبه آویز فروشگاهی', code: 'ECMA A30' },
  { id: 'ecma-b10', name: 'غلاف یا اسلیو', code: 'ECMA B10.10' },
  { id: 'ecma-c1020', name: 'جعبه کشویی', code: 'ECMA C10.20' },
  { id: 'ecma-d50', name: 'استند نمایش محصول', code: 'ECMA D50' },
];

const pathSegments = (path: string): [number, number, number, number][] => {
  const commands = path.match(/[MLZ][^MLZ]*/g) || [];
  const segments: [number, number, number, number][] = [];
  let current: [number, number] | null = null;
  let first: [number, number] | null = null;
  for (const raw of commands) {
    const command = raw[0];
    if (command === 'Z') {
      if (current && first && (current[0] !== first[0] || current[1] !== first[1])) {
        segments.push([current[0], current[1], first[0], first[1]]);
      }
      current = first;
      continue;
    }
    const nums = raw.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) || [];
    if (nums.length < 2) continue;
    const point: [number, number] = [nums[0], nums[1]];
    if (command === 'M') {
      current = point;
      first = point;
    } else if (command === 'L' && current) {
      segments.push([current[0], current[1], point[0], point[1]]);
      current = point;
    }
  }
  return segments;
};

const download = (name: string, contents: string, type: string) => {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

export const PacklyIndustrialDielineStudio: React.FC<{ onSaveProject?: (project: Project) => void }> = ({ onSaveProject }) => {
  const [templateId, setTemplateId] = useState('fefco-0201');
  const [length, setLength] = useState(240);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(100);
  const [thickness, setThickness] = useState(1.6);
  const [glueTab, setGlueTab] = useState(30);
  const [saved, setSaved] = useState(false);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[1];
  const geometry: DielineEngineResult = useMemo(() => {
    const engine = STANDARD_DIELINE_ENGINES[templateId] || STANDARD_DIELINE_ENGINES['default-rsc'];
    return engine({
      L: Math.max(20, Math.min(2000, length)),
      W: Math.max(20, Math.min(2000, width)),
      H: Math.max(10, Math.min(2000, height)),
      thickness,
      glueTab,
      x0: 40,
    });
  }, [templateId, length, width, height, thickness, glueTab]);

  const svg = useMemo(() => {
    const minX = geometry.xMin;
    const minY = geometry.yMin;
    const viewW = Math.max(1, geometry.totalW);
    const viewH = Math.max(1, geometry.totalH);
    const cuts = geometry.cuts.map(d => `<path d="${d}" fill="none" stroke="#dc2626" stroke-width="0.25"/>`).join('');
    const creases = geometry.creases.map(d => `<path d="${d}" fill="none" stroke="#2563eb" stroke-width="0.25" stroke-dasharray="2 1"/>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}mm" height="${viewH}mm" viewBox="${minX} ${minY} ${viewW} ${viewH}"><g id="CUT">${cuts}</g><g id="CREASE">${creases}</g></svg>`;
  }, [geometry]);

  const exportDxf = () => {
    const entities: string[] = [];
    const add = (path: string, layer: string) => {
      for (const [x1, y1, x2, y2] of pathSegments(path)) {
        entities.push(`0\nLINE\n8\n${layer}\n10\n${x1.toFixed(3)}\n20\n${y1.toFixed(3)}\n30\n0\n11\n${x2.toFixed(3)}\n21\n${y2.toFixed(3)}\n31\n0\n`);
      }
    };
    geometry.cuts.forEach(p => add(p, 'CUT'));
    geometry.creases.forEach(p => add(p, 'CREASE'));
    const dxf = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nLAYER\n2\nCREASE\n70\n0\n62\n5\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities.join('')}0\nENDSEC\n0\nEOF\n`;
    download(`ashkghalam-${templateId}.dxf`, dxf, 'application/dxf');
  };

  const saveProject = () => {
    const project: Project = {
      id: `dieline-${Date.now()}`,
      title: `${template.code} — ${length}×${width}×${height}mm`,
      type: 'dieline',
      status: 'saved_design',
      date: new Date().toISOString(),
      dielineConfig: {
        typeId: templateId,
        dimensions: { w: length, h: height, d: width },
        paperType: `کالیپر ${thickness}mm`,
        glueTab,
        geometry: { cutPaths: geometry.cuts.length, creasePaths: geometry.creases.length, bounds: { width: geometry.totalW, height: geometry.totalH } },
      },
    };
    onSaveProject?.(project);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div dir="rtl" className="h-full min-h-0 overflow-y-auto bg-slate-950 p-3 text-slate-100 sm:p-5">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)_300px]">
        <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2"><Box className="h-5 w-5 text-amber-400" /><h2 className="font-black">کتابخانه قالب‌های بسته‌بندی</h2></div>
          <label className="block text-xs font-bold text-slate-300">نوع جعبه
            <select value={templateId} onChange={e => setTemplateId(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm">
              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[['طول', length, setLength], ['عرض', width, setWidth], ['ارتفاع', height, setHeight]].map(([label, value, setter]) => (
              <label key={String(label)} className="text-[11px] font-bold text-slate-300">{String(label)}
                <input type="number" min={10} max={2000} value={Number(value)} onChange={e => (setter as (n:number)=>void)(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] font-bold text-slate-300">ضخامت ورق (mm)
              <input type="number" min={0.2} max={10} step={0.1} value={thickness} onChange={e => setThickness(Math.max(0.2, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
            </label>
            <label className="text-[11px] font-bold text-slate-300">لبه چسب (mm)
              <input type="number" min={10} max={120} value={glueTab} onChange={e => setGlueTab(Math.max(10, Number(e.target.value)))} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm text-white" />
            </label>
          </div>
          {template.note && <p className="rounded-lg border border-amber-900/70 bg-amber-950/30 p-2 text-xs leading-6 text-amber-200"><AlertTriangle className="ml-1 inline h-3.5 w-3.5" />{template.note}</p>}
          <div className="space-y-2">
            <button onClick={() => download(`ashkghalam-${templateId}.svg`, svg, 'image/svg+xml;charset=utf-8')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-bold hover:bg-sky-500"><Download className="h-4 w-4" />خروجی SVG با مقیاس میلی‌متر</button>
            <button onClick={exportDxf} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-bold hover:bg-indigo-500"><Download className="h-4 w-4" />خروجی DXF با لایه‌ها</button>
            <button onClick={() => download(`ashkghalam-${templateId}.json`, JSON.stringify({ template, dimensions: { length, width, height }, thickness, glueTab, geometry: { cuts: geometry.cuts, creases: geometry.creases } }, null, 2), 'application/json')} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-3 py-2.5 text-sm font-bold hover:bg-slate-600"><Download className="h-4 w-4" />ذخیره JSON پروژه</button>
            <button onClick={saveProject} className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-emerald-950/50 px-3 py-2.5 text-sm font-bold text-emerald-200 hover:bg-emerald-900"><Save className="h-4 w-4" />ثبت در پروژه‌ها</button>
            {saved && <p className="text-center text-xs text-emerald-300"><CheckCircle2 className="ml-1 inline h-4 w-4" />درخواست ذخیره ارسال شد</p>}
          </div>
        </aside>

        <section className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h3 className="font-black">{template.code} — {template.name}</h3><p className="mt-1 text-xs text-slate-400">قرمز: برش · آبی خط‌چین: خط‌تا · واحد هندسه: میلی‌متر</p></div>
            <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs"><Ruler className="h-4 w-4 text-sky-400" />{Math.round(geometry.totalW)} × {Math.round(geometry.totalH)} mm</div>
          </div>
          <div className="overflow-auto rounded-xl border border-slate-800 bg-[#080b11] p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox={`${geometry.xMin} ${geometry.yMin} ${Math.max(1, geometry.totalW)} ${Math.max(1, geometry.totalH)}`} className="min-h-[360px] w-full">
              {geometry.cuts.map((d, i) => <path key={`c-${i}`} d={d} fill="none" stroke="#ef4444" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />)}
              {geometry.creases.map((d, i) => <path key={`f-${i}`} d={d} fill="none" stroke="#3b82f6" strokeWidth={0.6} strokeDasharray="5 3" vectorEffect="non-scaling-stroke" />)}
            </svg>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2"><span className="text-[10px] text-slate-500">خطوط برش</span><p className="text-lg font-black">{geometry.cuts.length}</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2"><span className="text-[10px] text-slate-500">خطوط تا</span><p className="text-lg font-black">{geometry.creases.length}</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2"><span className="text-[10px] text-slate-500">مساحت گسترده تقریبی</span><p className="text-lg font-black">{((geometry.totalW * geometry.totalH) / 1_000_000).toFixed(3)} m²</p></div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-2"><span className="text-[10px] text-slate-500">کالیپر انتخابی</span><p className="text-lg font-black">{thickness} mm</p></div>
          </div>
          <p className="mt-3 text-xs leading-6 text-amber-200/90">این محیط موتورهای هندسی پارامتریک موجود در پروژه را فعال می‌کند. خروجی‌های دارای هشدار یا قالب اختصاصی را قبل از ساخت تیغ با نقشه استاندارد، جبران ضخامت، تلرانس و نمونه تاخورده تطبیق دهید.</p>
        </section>

        <aside className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
          <h3 className="font-black">پیش‌نمایش حجمی</h3>
          <p className="text-xs leading-5 text-slate-400">نمای ابعادی سه‌بعدی برای بررسی تناسب طول، عرض و ارتفاع است؛ شبیه‌سازی حرکت تک‌تک فلپ‌ها هنوز در این پنل پیاده‌سازی نشده است.</p>
          <div className="h-[300px] overflow-hidden rounded-xl"><ThreeDPreview width={length} height={height} depth={width} autoRotate={true} /></div>
          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs">
            <div className="flex justify-between gap-2"><span className="text-slate-400">طول</span><strong>{length} mm</strong></div>
            <div className="flex justify-between gap-2"><span className="text-slate-400">عرض</span><strong>{width} mm</strong></div>
            <div className="flex justify-between gap-2"><span className="text-slate-400">ارتفاع</span><strong>{height} mm</strong></div>
          </div>
        </aside>
      </div>
    </div>
  );
};
