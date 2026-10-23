import React, { useMemo, useState } from 'react';
import { Download, Save, Box, Ruler, AlertTriangle, CheckCircle2, Search, Layers, Scissors, Rotate3d, Info, Filter, Check, XCircle } from 'lucide-react';
import { ThreeDPreview } from './ThreeDPreview';
import { STANDARD_DIELINE_ENGINES } from '../services/dielineMath';
import type { DielineEngineResult } from '../services/dielineMath';
import type { Project } from '../types';
import { runComprehensiveGeometryCheck } from '../services/geometryValidator';

type TemplateOption = {
  id: string; name: string; code: string; category: string;
  description: string; status: 'baseline' | 'custom'; note?: string;
};

const TEMPLATES: TemplateOption[] = [
  { id: 'fefco-0200', name: 'کارتن نیمه‌شیاردار روباز', code: 'FEFCO 0200', category: 'کارتن حمل', description: 'بدنه چهاروجهی با کف و بدون درپوش کامل.', status: 'baseline' },
  { id: 'fefco-0201', name: 'کارتن چهارلَت استاندارد', code: 'FEFCO 0201', category: 'کارتن حمل', description: 'کارتن RSC با فلپ‌های بالا و پایین.', status: 'baseline' },
  { id: 'fefco-0203', name: 'کارتن فلپ هم‌پوشان', code: 'FEFCO 0203', category: 'کارتن حمل', description: 'فلپ‌های بلند برای هم‌پوشانی بیشتر در درب و کف.', status: 'baseline' },
  { id: 'fefco-0204', name: 'کارتن فلپ‌مرکزی', code: 'FEFCO 0204', category: 'کارتن حمل', description: 'فلپ‌ها برای رسیدن به مرکز صفحه طراحی می‌شوند.', status: 'baseline' },
  { id: 'fefco-0215', name: 'کارتن ته‌قفلی دستی', code: 'FEFCO 0215', category: 'کارتن حمل', description: 'الگوی پایه با زبانه و شیار قفل کف.', status: 'baseline', note: 'ابعاد قفل و خلاصی باید با ضخامت واقعی ورق و نمونه تاخورده تأیید شود.' },
  { id: 'fefco-0300', name: 'جعبه تلسکوپی درب و زیره', code: 'FEFCO 0300', category: 'جعبه تلسکوپی', description: 'دو قطعه مجزا برای زیره و درب.', status: 'baseline' },
  { id: 'fefco-0320', name: 'جعبه دو‌تکه تلسکوپی', code: 'FEFCO 0320', category: 'جعبه تلسکوپی', description: 'زیره و درب در دو گسترده مجزا.', status: 'baseline' },
  { id: 'fefco-0427', name: 'جعبه کیبوردی / پستی', code: 'FEFCO 0427', category: 'جعبه پستی', description: 'الگوی پایه جعبه پستی با درب متصل.', status: 'baseline', note: 'هندسه فعلی یک پایه پارامتریک است؛ پیش از تولید با نقشه مرجع تطبیق دهید.' },
  { id: 'fefco-0713', name: 'کارتن با درب زبانه‌ای', code: 'FEFCO 0713', category: 'کارتن حمل', description: 'الگوی پایه برای بررسی فرم و ابعاد.', status: 'baseline', note: 'تطابق دقیق این هندسه با نقشه رسمی FEFCO 0713 تأیید نشده است.' },
  { id: 'fefco-pizza', name: 'جعبه پیتزا یک‌تکه', code: 'سفارشی', category: 'جعبه سفارشی', description: 'قالب اختصاصی برای شروع طراحی جعبه پیتزا.', status: 'custom', note: 'کد رسمی FEFCO برای این قالب ادعا نمی‌شود؛ قفل، تهویه و لبه‌ها نیازمند بازبینی هستند.' },
  { id: 'ecma-a2020', name: 'جعبه Reverse Tuck End', code: 'ECMA A20.20', category: 'مقوای تاشو', description: 'جعبه مقوایی با زبانه‌های درب در دو سمت مخالف.', status: 'baseline' },
  { id: 'ecma-ste', name: 'جعبه Straight Tuck End', code: 'ECMA STE*', category: 'مقوای تاشو', description: 'الگوی پایه درب مستقیم.', status: 'custom', note: 'شناسه STE در این برنامه برچسب توصیفی است و تأیید کد رسمی ECMA نیست.' },
  { id: 'snap-lock-123', name: 'جعبه ته‌قفلی مقوایی', code: 'ته‌قفلی', category: 'مقوای تاشو', description: 'زبانه و شیار دریافت‌کننده قفل کف.', status: 'custom', note: 'قفل پارامتریک است؛ پیش از ساخت تیغ نمونه فیزیکی لازم است.' },
  { id: 'ecma-a30', name: 'جعبه آویز فروشگاهی', code: 'ECMA A30', category: 'مقوای تاشو', description: 'الگوی پایه جعبه با زبانه آویز.', status: 'baseline', note: 'هندسه از موتور tuck-end مشترک استفاده می‌کند و تطابق رسمی تأیید نشده است.' },
  { id: 'ecma-b10', name: 'غلاف یا اسلیو', code: 'ECMA B10.10', category: 'اسلیو و کشویی', description: 'غلاف چهاروجهی برای پوشاندن محصول یا سینی.', status: 'baseline' },
  { id: 'ecma-c1020', name: 'جعبه کشویی', code: 'ECMA C10.20*', category: 'اسلیو و کشویی', description: 'ترکیب سینی داخلی و غلاف بیرونی در یک گسترده.', status: 'custom', note: 'الگوی سفارشی برنامه است؛ تأییدیه رسمی ECMA ندارد.' },
  { id: 'ecma-d50', name: 'استند نمایش محصول', code: 'ECMA D50*', category: 'نمایشگاهی', description: 'پایه استند با دیواره عقب، دیواره جانبی و لبه جلویی.', status: 'custom', note: 'الگوی سفارشی برنامه است؛ کد D50 و پایداری سازه تأیید نشده است.' },
];

const CATEGORIES = ['همه قالب‌ها', ...Array.from(new Set(TEMPLATES.map(t => t.category)))];

const pathSegments = (path: string): [number, number, number, number][] => {
  const commands = path.match(/[MLZ][^MLZ]*/g) || [];
  const segments: [number, number, number, number][] = [];
  let current: [number, number] | null = null;
  let first: [number, number] | null = null;
  for (const raw of commands) {
    const command = raw[0];
    if (command === 'Z') {
      if (current && first && (current[0] !== first[0] || current[1] !== first[1])) segments.push([current[0], current[1], first[0], first[1]]);
      current = first;
      continue;
    }
    const nums = raw.slice(1).match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)?.map(Number) || [];
    if (nums.length < 2) continue;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const point: [number, number] = [nums[i], nums[i + 1]];
      if (command === 'M' && i === 0) { current = point; first = point; }
      else if (current) { segments.push([current[0], current[1], point[0], point[1]]); current = point; }
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const numeric = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;

export const PacklyIndustrialDielineStudio: React.FC<{ onSaveProject?: (project: Project) => void }> = ({ onSaveProject }) => {
  const [templateId, setTemplateId] = useState('fefco-0201');
  const [category, setCategory] = useState('همه قالب‌ها');
  const [search, setSearch] = useState('');
  const [length, setLength] = useState(240);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(100);
  const [thickness, setThickness] = useState(1.5);
  const [materialPreset, setMaterialPreset] = useState('corrugated-e');
  const [glueTab, setGlueTab] = useState(30);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [show3D, setShow3D] = useState(false);
  const [openRatio, setOpenRatio] = useState(1);
  const [saved, setSaved] = useState(false);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const validInputs = numeric(length, 10, 2000) && numeric(width, 10, 2000) && numeric(height, 10, 2000) &&
    numeric(thickness, 0.2, 10) && numeric(glueTab, 5, 200);
  const engine = STANDARD_DIELINE_ENGINES[templateId];
  const geometryState = useMemo(() => {
    if (!validInputs || typeof engine !== 'function') return { geometry: null as DielineEngineResult | null, error: 'ابعاد باید عدد معتبر باشند و در محدوده مجاز قرار گیرند.' };
    try {
      const g = engine({ L: length, W: width, H: height, thickness, glueTab, x0: 40 });
      const allValues = [g.xMin, g.yMin, g.xMax, g.yMax, g.totalW, g.totalH];
      const pathsValid = Array.isArray(g.cuts) && g.cuts.length > 0 &&
        Array.isArray(g.creases) && g.creases.length > 0 &&
        [...g.cuts, ...g.creases].every(p => typeof p === 'string' && p.trim().length > 0 &&
          (p.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || []).map(Number).every(Number.isFinite));
      if (!allValues.every(Number.isFinite) || g.totalW <= 0 || g.totalH <= 0 || !pathsValid) {
        return { geometry: null, error: 'موتور قالب هندسه نامعتبر یا ناقص تولید کرد؛ خروجی فایل غیرفعال شد.' };
      }
      return { geometry: g, error: '' };
    } catch (error) {
      return { geometry: null, error: error instanceof Error ? error.message : 'خطای ناشناخته در موتور تولید قالب.' };
    }
  }, [engine, length, width, height, thickness, glueTab, validInputs]);

  const geometry = geometryState.geometry;
  const geometryAudit = useMemo(() => {
    if (!geometry) return null;
    // Validate the actual generated SVG paths. A generous sheet envelope avoids
    // confusing geometry validity with a user's separate sheet/nesting choice.
    return runComprehensiveGeometryCheck(
      geometry.cuts, geometry.creases, length, width, height, templateId,
      20, 15, geometry.totalW, geometry.totalH,
      Math.max(100000, geometry.totalW + 1), Math.max(100000, geometry.totalH + 1), glueTab
    );
  }, [geometry, length, width, height, templateId, glueTab]);
  const exportReady = Boolean(geometry && geometryAudit?.passed && !geometryAudit.hasSelfIntersection);
  const filteredTemplates = TEMPLATES.filter(t =>
    (category === 'همه قالب‌ها' || t.category === category) &&
    (t.name + ' ' + t.code + ' ' + t.description).toLocaleLowerCase('fa').includes(search.toLocaleLowerCase('fa'))
  );

  const svg = useMemo(() => {
    if (!geometry) return '';
    const viewW = Math.max(1, geometry.xMax - geometry.xMin);
    const viewH = Math.max(1, geometry.yMax - geometry.yMin);
    const cuts = geometry.cuts.map(d => `<path d="${d}" fill="none" stroke="#dc2626" stroke-width="0.25"/>`).join('');
    const creases = geometry.creases.map(d => `<path d="${d}" fill="none" stroke="#2563eb" stroke-width="0.25" stroke-dasharray="2 1"/>`).join('');
    const labels = showLabels ? geometry.labels.map(label => `<text x="${label.x}" y="${label.y}" font-size="4" text-anchor="middle" fill="#64748b">${label.text.replace(/[&<>"]/g, '')}</text>`).join('') : '';
    const grid = showGrid ? `<defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#cbd5e1" stroke-opacity=".35" stroke-width=".15"/></pattern></defs><rect x="${geometry.xMin}" y="${geometry.yMin}" width="${viewW}" height="${viewH}" fill="url(#grid)"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW}mm" height="${viewH}mm" viewBox="${geometry.xMin} ${geometry.yMin} ${viewW} ${viewH}">${grid}<g id="CUT">${cuts}</g><g id="CREASE">${creases}</g>${labels}</svg>`;
  }, [geometry, showLabels, showGrid]);

  const exportDxf = () => {
    if (!geometry) return;
    const entities: string[] = [];
    const add = (path: string, layer: string) => pathSegments(path).forEach(([x1, y1, x2, y2]) => {
      entities.push(`0\nLINE\n8\n${layer}\n10\n${x1.toFixed(4)}\n20\n${y1.toFixed(4)}\n30\n0\n11\n${x2.toFixed(4)}\n21\n${y2.toFixed(4)}\n31\n0\n`);
    });
    geometry.cuts.forEach(p => add(p, 'CUT'));
    geometry.creases.forEach(p => add(p, 'CREASE'));
    if (!entities.length) return;
    const dxf = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nLAYER\n2\nCREASE\n70\n0\n62\n5\n6\nDASHED\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities.join('')}0\nENDSEC\n0\nEOF\n`;
    download(`ashkghalam-${templateId}.dxf`, dxf, 'application/dxf');
  };

  const saveProject = () => {
    if (!exportReady || !geometry || !onSaveProject) return;
    const project: Project = {
      id: `dieline-${Date.now()}`, title: `${template.code} — ${length}×${width}×${height}mm`,
      type: 'dieline', status: 'saved_design', date: new Date().toISOString(),
      dielineConfig: {
        typeId: templateId, dimensions: { w: length, h: height, d: width },
        paperType: `کالیپر ${thickness}mm`, glueTab,
        geometry: { cutPaths: geometry.cuts.length, creasePaths: geometry.creases.length, bounds: { width: geometry.xMax - geometry.xMin, height: geometry.yMax - geometry.yMin } },
      },
    };
    onSaveProject(project);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const inputClass = 'mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-white outline-none focus:border-sky-500';
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div dir="rtl" className="h-full min-h-0 overflow-y-auto bg-slate-950 p-3 text-slate-100 sm:p-5">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-gradient-to-l from-slate-900 to-slate-950 p-4">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-500/10 p-2 text-sky-300"><Box className="h-6 w-6"/></div><div><h2 className="text-lg font-black sm:text-xl">استودیوی طراحی دایلاین</h2><p className="mt-1 text-xs text-slate-400">کتابخانه پارامتریک · پیش‌نمایش ۲بعدی · خروجی برداری</p></div></div>
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-slate-700 px-3 py-1.5">{TEMPLATES.length} قالب پایه</span><span className="rounded-full border border-emerald-900 bg-emerald-950/50 px-3 py-1.5 text-emerald-300">واحد هندسه: mm</span></div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
            <div className="flex items-center justify-between"><h3 className="font-black">کتابخانه قالب‌ها</h3><Layers className="h-4 w-4 text-sky-300"/></div>
            <label className="relative block"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی نام یا کد..." className={inputClass + ' pr-9'}/></label>
            <label className="block text-xs font-bold text-slate-300">دسته‌بندی<select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>
            <details className="rounded-xl border border-slate-800 bg-slate-950/50 p-2">
              <summary className="cursor-pointer px-2 py-1 text-xs font-bold text-slate-300">مرور همه قالب‌ها و توضیحات</summary>
              <div className="mt-2 grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2 xl:grid-cols-1">
              {filteredTemplates.map(t => <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} className={`rounded-xl border p-3 text-right transition ${t.id === templateId ? 'border-sky-500 bg-sky-950/50 ring-1 ring-sky-500/30' : 'border-slate-800 bg-slate-950/60 hover:border-slate-600'}`}>
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold leading-6">{t.name}</span>{t.id === templateId && <Check className="mt-1 h-4 w-4 shrink-0 text-sky-300"/>}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">{t.code}</span><span className={`rounded px-1.5 py-0.5 text-[10px] ${t.status === 'baseline' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-200'}`}>{t.status === 'baseline' ? 'موتور موجود' : 'قالب سفارشی / پایه'}</span></div>
                <p className="mt-2 text-xs leading-5 text-slate-400">{t.description}</p>
              </button>)}
              {filteredTemplates.length === 0 && <p className="rounded-lg border border-slate-800 p-4 text-sm text-slate-400">قالبی با این عبارت پیدا نشد.</p>}
              </div>
            </details>
            <label className="block text-xs font-bold text-slate-300">نوع قالب / جعبه
              <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={inputClass}>
                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
              </select>
            </label>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <h4 className="mb-3 text-sm font-bold">۱. ابعاد محصول (mm)</h4>
              <div className="grid grid-cols-3 gap-2">
                {([['طول', length, setLength], ['عرض', width, setWidth], ['ارتفاع', height, setHeight]] as const).map(([label, value, setter]) => <label key={label} className="text-[11px] font-bold text-slate-300">{label}<input type="number" min={10} max={2000} value={Number.isFinite(value) ? value : ''} onChange={e => setter(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>)}
              </div>
              <h4 className="mb-2 mt-4 text-sm font-bold">۲. جنس و ضخامت ورق</h4>
              <label className="block text-[11px] font-bold text-slate-300">گروه مقوا
                <select value={materialPreset} onChange={e => { const value=e.target.value; setMaterialPreset(value); const presets:Record<string,number>={'folding-carton':0.45,'corrugated-e':1.5,'corrugated-b':3,'corrugated-c':4,'corrugated-eb':6.5,'custom':thickness}; if(value!=='custom')setThickness(presets[value]); }} className={inputClass}>
                  <option value="folding-carton">مقوای تاشو — حدود ۰٫۴۵ mm</option>
                  <option value="corrugated-e">کارتن فلوت E — حدود ۱٫۵ mm</option>
                  <option value="corrugated-b">کارتن فلوت B — حدود ۳ mm</option>
                  <option value="corrugated-c">کارتن فلوت C — حدود ۴ mm</option>
                  <option value="corrugated-eb">کارتن دوبل EB — حدود ۶٫۵ mm</option>
                  <option value="custom">ضخامت سفارشی</option>
                </select>
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[11px] font-bold text-slate-300">ضخامت واقعی (mm)<input type="number" min={0.2} max={10} step={0.1} value={Number.isFinite(thickness) ? thickness : ''} onChange={e => { setThickness(e.target.value === '' ? NaN : Number(e.target.value)); setMaterialPreset('custom'); }} className={inputClass}/></label>
                <label className="text-[11px] font-bold text-slate-300">لبه چسب (mm)<input type="number" min={5} max={200} value={Number.isFinite(glueTab) ? glueTab : ''} onChange={e => setGlueTab(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-slate-400">این گزینه فقط ضخامت مرجع و پارامترهای موتور را تنظیم می‌کند؛ جبران کامل ضخامت، داخل/خارج و خطوط تا هنوز برای همه قالب‌ها پیاده‌سازی نشده است.</p>
              {!validInputs && <p className="mt-2 rounded-lg border border-red-900 bg-red-950/50 p-2 text-xs leading-5 text-red-200">ابعاد: ۱۰ تا ۲۰۰۰ mm · ضخامت: ۰٫۲ تا ۱۰ mm · لبه چسب: ۵ تا ۲۰۰ mm. تا اصلاح مقادیر، خروجی غیرفعال است.</p>}
            </div>
            {template.note && <p className="rounded-lg border border-amber-900/70 bg-amber-950/30 p-3 text-xs leading-6 text-amber-100"><AlertTriangle className="ml-1 inline h-4 w-4"/>{template.note}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button disabled={!exportReady} onClick={() => exportReady && geometry && download(`ashkghalam-${templateId}.svg`, svg, 'image/svg+xml;charset=utf-8')} className={buttonClass + ' bg-sky-600 hover:bg-sky-500'}><Download className="h-4 w-4"/>خروجی SVG</button>
              <button disabled={!exportReady} onClick={exportDxf} className={buttonClass + ' bg-indigo-600 hover:bg-indigo-500'}><Download className="h-4 w-4"/>خروجی DXF</button>
              <button disabled={!exportReady} onClick={() => exportReady && geometry && download(`ashkghalam-${templateId}.json`, JSON.stringify({ template, dimensions: { length, width, height }, material: { thickness, glueTab }, geometry }, null, 2), 'application/json')} className={buttonClass + ' bg-slate-700 hover:bg-slate-600'}><Download className="h-4 w-4"/>پروژه JSON</button>
              <button disabled={!exportReady || !onSaveProject} onClick={saveProject} className={buttonClass + ' border border-emerald-800 bg-emerald-950/50 text-emerald-200 hover:bg-emerald-900'}><Save className="h-4 w-4"/>ثبت پروژه</button>
            </div>
            {saved && <p className="text-center text-xs text-emerald-300"><CheckCircle2 className="ml-1 inline h-4 w-4"/>پروژه به تابع ذخیره‌سازی تحویل شد.</p>}
          </aside>

          <main className="min-w-0 space-y-4">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{template.code} — {template.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] ${geometry ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-200'}`}>{geometry ? 'هندسه تولید شد' : 'خطای تولید'}</span></div><p className="mt-1 text-xs leading-5 text-slate-400">قرمز: برش · آبی خط‌چین: خط‌تا · مقیاس مختصات: میلی‌متر</p></div>
                <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"><Ruler className="ml-1 inline h-4 w-4 text-sky-300"/>{geometry ? `${(geometry.xMax - geometry.xMin).toFixed(1)} × ${(geometry.yMax - geometry.yMin).toFixed(1)} mm` : '—'}</span></div>
              </div>
              {geometryAudit && <div className={`mb-3 rounded-xl border p-3 text-xs leading-5 ${exportReady ? 'border-emerald-900 bg-emerald-950/30 text-emerald-100' : 'border-amber-900 bg-amber-950/30 text-amber-100'}`}>
                <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4"/>{exportReady ? 'بررسی ساختاری مسیرها گذشت' : 'خروجی به بررسی بیشتر نیاز دارد'}</div>
                <p className="mt-1">طول برش تقریبی: {geometryAudit.cutLength} mm · طول خط‌تا: {geometryAudit.creaseLength} mm · امتیاز بررسی ساختاری: {geometryAudit.score}/100</p>
                {geometryAudit.errors.map((message, i) => <p key={`audit-error-${i}`} className="mt-1">• {message}</p>)}
                {geometryAudit.warnings.map((message, i) => <p key={`audit-warning-${i}`} className="mt-1">• {message}</p>)}
                {geometryAudit.hasSelfIntersection && <p className="mt-1 font-bold">به‌دلیل تقاطع مسیر برش در یک مسیر، خروجی فایل و ثبت پروژه موقتاً غیرفعال است.</p>}
              </div>}
              {geometryState.error && <div role="alert" className="mb-3 flex gap-2 rounded-xl border border-red-800 bg-red-950/40 p-3 text-sm text-red-100"><XCircle className="mt-0.5 h-5 w-5 shrink-0"/><div><strong>تولید دایلاین متوقف شد.</strong><p className="mt-1 text-xs leading-5">{geometryState.error}</p></div></div>}
              {geometry && <div className="overflow-auto rounded-xl border border-slate-800 bg-white p-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>پیش‌نمایش بازشده / ۲بعدی</span>
                  <div className="flex flex-wrap gap-3"><label className="flex items-center gap-1"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)}/>شبکه</label><label className="flex items-center gap-1"><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)}/>ابعاد و برچسب‌ها</label></div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="auto" viewBox={`${geometry.xMin - 8} ${geometry.yMin - 8} ${Math.max(1, geometry.xMax - geometry.xMin + 16)} ${Math.max(1, geometry.yMax - geometry.yMin + 16)}`} className="max-h-[680px] min-h-[360px] w-full">
                  {showGrid && <defs><pattern id="dieline-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#cbd5e1" strokeWidth="0.2"/></pattern></defs>}
                  {showGrid && <rect x={geometry.xMin - 8} y={geometry.yMin - 8} width={geometry.xMax - geometry.xMin + 16} height={geometry.yMax - geometry.yMin + 16} fill="url(#dieline-grid)"/>}
                  {geometry.cuts.map((d, i) => <path key={`cut-${i}`} d={d} fill="none" stroke="#dc2626" strokeWidth="0.8" vectorEffect="non-scaling-stroke"/>)}
                  {geometry.creases.map((d, i) => <path key={`crease-${i}`} d={d} fill="none" stroke="#2563eb" strokeWidth="0.8" strokeDasharray="5 3" vectorEffect="non-scaling-stroke"/>)}
                  {showLabels && geometry.labels.map((label, i) => <text key={`label-${i}`} x={label.x} y={label.y} fill="#475569" fontSize="5" textAnchor="middle">{label.text}</text>)}
                </svg>
              </div>}
              {geometry && <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] text-slate-500">مسیرهای برش</span><p className="mt-1 text-xl font-black">{geometry.cuts.length}</p></div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] text-slate-500">مسیرهای تا</span><p className="mt-1 text-xl font-black">{geometry.creases.length}</p></div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] text-slate-500">سطح مستطیل پوشاننده</span><p className="mt-1 text-xl font-black">{(((geometry.xMax - geometry.xMin) * (geometry.yMax - geometry.yMin)) / 1_000_000).toFixed(3)} m²</p><p className="text-[10px] text-slate-500">برآورد ورق، نه سطح خالص قالب</p></div>
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] text-slate-500">ضخامت ورق</span><p className="mt-1 text-xl font-black">{thickness} mm</p></div>
              </div>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setShow3D(v => !v)} className={buttonClass + ' border border-slate-700 bg-slate-950 hover:bg-slate-800'}><Rotate3d className="h-4 w-4"/>{show3D ? 'بستن نمای حجمی' : 'نمای حجمی ابعاد'}</button>
                <a className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800" href="https://www.fefco.org/technical-information/fefco-code" target="_blank" rel="noreferrer">مرجع رسمی FEFCO ↗</a>
                <a className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800" href="https://www.packmage.com/Home/BoxLibrary" target="_blank" rel="noreferrer">کتابخانه Packmage ↗</a>
              </div>
              {show3D && <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-bold"><Rotate3d className="h-4 w-4 text-sky-300"/>پیش‌نمایش حجمی با فلپ‌های لولایی</div><span className="text-xs text-slate-400">{Math.round(openRatio * 100)}٪ بازشدگی</span></div><div className="h-[360px] overflow-hidden rounded-lg"><ThreeDPreview width={length} height={height} depth={width} isOpenRatio={openRatio} autoRotate/></div><label className="mt-3 flex items-center gap-3 text-xs text-slate-300">بسته <input type="range" min={0} max={1} step={0.05} value={openRatio} onChange={e => setOpenRatio(Number(e.target.value))} className="w-full accent-sky-500"/> باز</label><p className="mt-2 text-xs leading-5 text-amber-200"><Info className="ml-1 inline h-4 w-4"/>این نسخه، مدل حجمی عمومی با چهار دیواره و فلپ‌های لولایی است؛ هنوز هندسه سه‌بعدی اختصاصی و ترتیب مونتاژ هر کد FEFCO/ECMA را از روی نقشه دوبعدی بازسازی نمی‌کند.</p></div>}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3 text-xs leading-6 text-slate-400 sm:p-4">
              <h4 className="mb-1 flex items-center gap-2 font-bold text-slate-200"><Scissors className="h-4 w-4 text-rose-300"/>یادداشت تولید</h4>
              <p>نام یا شماره قالب به‌تنهایی تضمین‌کننده تطابق با نقشه رسمی نیست. در این نسخه، ضخامت ورق روی خلاصی فلپ‌ها اثر می‌گذارد، اما جبران کامل ابعاد داخل/خارج و اصلاحات هر خط تا هنوز برای همه قالب‌ها پیاده‌سازی نشده است؛ ابعاد را پیش از تولید با نقشه مرجع، جهت الیاف، تلرانس ماشین و نمونه تاخورده تطبیق دهید. این استودیو علاوه بر کنترل ابعاد و مسیرهای خالی، مسیرهای SVG تولیدشده را از نظر ساختار و تقاطع‌های آشکار بررسی می‌کند؛ این بررسی جایگزین تأیید نقشه مرجع یا نمونه فیزیکی نیست.</p>
              <p className="mt-1">* برچسب ستاره‌دار یا «قالب سفارشی» به معنی هندسه پایه داخلی است، نه تأیید رسمی FEFCO/ECMA.</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};
