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
  { id: 'fefco-0215', name: 'کارتن ته‌قفلی دستی', code: 'ته‌قفلی سفارشی', category: 'کارتن حمل', description: 'ساختار پارامتریک زبانه و شیار قفل کف.', status: 'custom', note: 'این موتور قفل سفارشی می‌سازد؛ تطابق دقیق با نقشه رسمی FEFCO 0215 تأیید نشده است. ابعاد قفل را با ضخامت واقعی ورق و نمونه تاخورده کنترل کنید.' },
  { id: 'fefco-0300', name: 'نمونه عمومی جعبه تلسکوپی', code: 'خانواده FEFCO 0300', category: 'جعبه تلسکوپی', description: 'دو گسترده سینی‌شکل مستقل، برای شروع طراحی و تنظیم عمق درب.', status: 'custom', note: '0300 شماره خانواده است، نه یک قالب واحد. این نمونه پارامتریک است و نقشه نهایی باید با کد دقیق و نقشه قالب‌ساز تطبیق داده شود.' },
  { id: 'fefco-0301', name: 'جعبه سینی و درب تلسکوپی', code: 'FEFCO 0301 · پایه پارامتریک', category: 'جعبه تلسکوپی', description: 'دو گسترده سینی‌شکل مستقل؛ خلاصی درب بر اساس ضخامت تخمین زده می‌شود.', status: 'custom', note: 'هندسه سینی و درب جداگانه تولید می‌شود؛ خلاصی واقعی به نوع ورق و روش خط‌تا وابسته است و باید با نمونه فیزیکی تنظیم شود.' },
  { id: 'fefco-0320', name: 'جعبه تلسکوپی دو نیم‌کارتن', code: 'FEFCO 0320 · پایه پارامتریک', category: 'جعبه تلسکوپی', description: 'دو نیم‌کارتن از خانواده 0200 با عمق مستقل درب و زیره.', status: 'custom', note: 'عمق دیواره درب مستقل است؛ ابعاد و خلاصی، الگوی پایه‌اند و باید با نوع ورق و نقشه قالب‌ساز کالیبره شوند.' },
  { id: 'fefco-0427', name: 'جعبه کیبوردی / پستی', code: 'FEFCO 0427 · پایه', category: 'جعبه پستی', description: 'مدل اولیه جعبه پستی با درب متصل.', status: 'custom', note: 'موتور فعلی یک مدل ساده‌شده است و تطابق دقیق آن با نقشه رسمی FEFCO 0427 تأیید نشده است.' },
  { id: 'fefco-0713', name: 'کارتن کف قفل‌شونده خودکار', code: 'Auto-Lock · مرجع 3D Box Studio', category: 'کارتن حمل', description: 'درب زبانه‌دار با شیار گیرنده، گردگیرهای بالایی، دو فلپ اصلی پله‌ای مکمل و فلپ‌های جانبی پهن با خط‌تاهای چسب ۴۵ درجه.', status: 'custom', note: 'هندسه با خروجی و توضیحات مولد Auto-Lock مرجع‌گیری شده است؛ شناسه FEFCO 0713 برای سازگاری پروژه‌های قبلی حفظ شده و تطابق رسمی آن با نقشه استاندارد هنوز تأیید نشده. پیش از تیغ‌سازی، اندازه‌ها، خط‌تاها و چسب‌گذاری با نمونه واقعی بازبینی شود.' },
  { id: 'fefco-pizza', name: 'جعبه پیتزا یک‌تکه', code: 'سفارشی', category: 'جعبه سفارشی', description: 'قالب اختصاصی برای شروع طراحی جعبه پیتزا.', status: 'custom', note: 'کد رسمی FEFCO برای این قالب ادعا نمی‌شود؛ قفل، تهویه و لبه‌ها نیازمند بازبینی هستند.' },
  { id: 'ecma-a2020', name: 'جعبه Reverse Tuck End', code: 'ECMA A20.20 · پایه', category: 'مقوای تاشو', description: 'مدل پارامتریک جعبه با زبانه‌های درب در دو سمت مخالف.', status: 'custom', note: 'نقطه زنی زبانه و شیار پایه تولید می‌شود، اما ابعاد ریل و اصلاحات خط‌تا با نقشه رسمی ECMA تطبیق کامل نشده است.' },
  { id: 'ecma-ste', name: 'جعبه Straight Tuck End', code: 'ECMA STE*', category: 'مقوای تاشو', description: 'الگوی پایه درب مستقیم.', status: 'custom', note: 'شناسه STE در این برنامه برچسب توصیفی است و تأیید کد رسمی ECMA نیست.' },
  { id: 'snap-lock-123', name: 'جعبه ته‌قفلی مقوایی', code: 'ته‌قفلی', category: 'مقوای تاشو', description: 'زبانه و شیار دریافت‌کننده قفل کف.', status: 'custom', note: 'قفل پارامتریک است؛ پیش از ساخت تیغ نمونه فیزیکی لازم است.' },
  { id: 'ecma-a30', name: 'جعبه آویز فروشگاهی', code: 'ECMA A30 · پایه', category: 'مقوای تاشو', description: 'مدل اولیه جعبه با زبانه آویز.', status: 'custom', note: 'موتور فعلی از هندسه tuck-end مشترک استفاده می‌کند؛ تطابق با نقشه رسمی ECMA A30 تأیید نشده است.' },
  { id: 'ecma-b10', name: 'غلاف یا اسلیو', code: 'ECMA B10.10 · پایه', category: 'اسلیو و کشویی', description: 'مدل پارامتریک غلاف چهاروجهی برای محصول یا سینی.', status: 'custom', note: 'هندسه ساده غلاف تولید می‌شود؛ اصلاح کالیپر، خطوط تا و تطابق کد رسمی باید جداگانه بررسی شوند.' },
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
  const [lidHeight, setLidHeight] = useState(50);
  const [lidClearance, setLidClearance] = useState(0.8);
  const [thickness, setThickness] = useState(1.5);
  const [slotGap, setSlotGap] = useState(2.25);
  const [autoLockAngle, setAutoLockAngle] = useState(45);
  const [autoLockTuckDepth, setAutoLockTuckDepth] = useState(25);
  const [autoLockDustDepth, setAutoLockDustDepth] = useState(43);
  const [autoLockSideDepth, setAutoLockSideDepth] = useState(40.5);
  const [dimensionConvention, setDimensionConvention] = useState<'inside' | 'outside'>('inside');
  const [materialPreset, setMaterialPreset] = useState('corrugated-e');
  const [glueTab, setGlueTab] = useState(30);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showGlueZones, setShowGlueZones] = useState(true);
  const [showDimensions, setShowDimensions] = useState(true);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [show3D, setShow3D] = useState(false);
  const [openRatio, setOpenRatio] = useState(1);
  const [saved, setSaved] = useState(false);

  const template = TEMPLATES.find(t => t.id === templateId) || TEMPLATES[0];
  const supportsLockAngle = ['snap-lock-123', 'fefco-0713'].includes(templateId);
  const supportsLidHeight = ['fefco-0300', 'fefco-0301', 'fefco-0320'].includes(templateId);
  const supportsAutoLockDimensions = templateId === 'fefco-0713';
  const validInputs = numeric(length, 10, 2000) && numeric(width, 10, 2000) && numeric(height, 10, 2000) &&
    numeric(thickness, 0.2, 10) && numeric(glueTab, 5, 200) && numeric(slotGap, 1, 10) && numeric(lidHeight, 5, 2000) &&
    (!supportsLockAngle || numeric(autoLockAngle, 25, 65)) &&
    (!supportsAutoLockDimensions || (numeric(autoLockTuckDepth, 4, 60) && numeric(autoLockDustDepth, 4, 43) && numeric(autoLockSideDepth, 6, 43))) &&
    (!supportsLidHeight || numeric(lidClearance, 0.1, 12));
  const engine = STANDARD_DIELINE_ENGINES[templateId];
  const supportsDimensionConvention = ['fefco-0200', 'fefco-0201', 'fefco-0203', 'fefco-0204', 'default-rsc', 'fefco-0713'].includes(templateId);
  const supportsSlotGap = ['fefco-0200', 'fefco-0201', 'fefco-0203', 'fefco-0204', 'default-rsc'].includes(templateId);
  const geometryState = useMemo(() => {
    if (!validInputs || typeof engine !== 'function') return { geometry: null as DielineEngineResult | null, error: 'ابعاد باید عدد معتبر باشند و در محدوده مجاز قرار گیرند.' };
    try {
      const g = engine({
        L: length, W: width, H: height, lidHeight, lidClearance, thickness, glueTab, slotGap, dimensionConvention, autoLockAngle, x0: 40,
        ...(supportsAutoLockDimensions ? { tuck: autoLockTuckDepth, dustFlap: autoLockDustDepth, bottomFlapDepth: autoLockSideDepth } : {}),
      });
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
  }, [engine, length, width, height, lidHeight, lidClearance, thickness, glueTab, slotGap, dimensionConvention, autoLockAngle, autoLockTuckDepth, autoLockDustDepth, autoLockSideDepth, supportsAutoLockDimensions, validInputs]);

  const geometry = geometryState.geometry;
  const geometryAudit = useMemo(() => {
    if (!geometry) return null;
    // Validate the actual generated SVG paths. A generous sheet envelope avoids
    // confusing geometry validity with a user's separate sheet/nesting choice.
    return runComprehensiveGeometryCheck(
      geometry.cuts, geometry.creases, length, width, height, templateId,
      20, 15, geometry.totalW, geometry.totalH,
      Math.max(100000, geometry.totalW + 1), Math.max(100000, geometry.totalH + 1), glueTab,
      { xMin: geometry.xMin, yMin: geometry.yMin, xMax: geometry.xMax, yMax: geometry.yMax }
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
    const glueZones = showGlueZones ? (geometry.glueZones || []).map(d => `<path d="${d}" fill="#f59e0b" fill-opacity="0.24" stroke="#d97706" stroke-width="0.18" stroke-dasharray="1 0.8"/>`).join('') : '';
    const cuts = geometry.cuts.map(d => `<path d="${d}" fill="none" stroke="#dc2626" stroke-width="0.25"/>`).join('');
    const creases = geometry.creases.map(d => `<path d="${d}" fill="none" stroke="#2563eb" stroke-width="0.25" stroke-dasharray="2 1"/>`).join('');
    const labels = showLabels ? geometry.labels.map(label => `<text x="${label.x}" y="${label.y}" font-size="4" text-anchor="middle" fill="#64748b">${label.text.replace(/[&<>"]/g, '')}</text>`).join('') : '';
    const dimensions = showDimensions ? `<g id="DIMENSIONS" fill="#475569" stroke="#64748b" stroke-width=".25"><path d="M ${geometry.xMin} ${geometry.yMin - 5} L ${geometry.xMax} ${geometry.yMin - 5} M ${geometry.xMin} ${geometry.yMin - 7} L ${geometry.xMin} ${geometry.yMin - 3} M ${geometry.xMax} ${geometry.yMin - 7} L ${geometry.xMax} ${geometry.yMin - 3} M ${geometry.xMax + 5} ${geometry.yMin} L ${geometry.xMax + 5} ${geometry.yMax} M ${geometry.xMax + 3} ${geometry.yMin} L ${geometry.xMax + 7} ${geometry.yMin} M ${geometry.xMax + 3} ${geometry.yMax} L ${geometry.xMax + 7} ${geometry.yMax}"/><text x="${(geometry.xMin + geometry.xMax) / 2}" y="${geometry.yMin - 7}" font-size="4" text-anchor="middle" stroke="none">گسترده: ${(geometry.xMax - geometry.xMin).toFixed(1)} mm</text><text x="${geometry.xMax + 6}" y="${(geometry.yMin + geometry.yMax) / 2}" font-size="4" text-anchor="middle" stroke="none" transform="rotate(90 ${geometry.xMax + 6} ${(geometry.yMin + geometry.yMax) / 2})">${(geometry.yMax - geometry.yMin).toFixed(1)} mm</text></g>` : '';
    const grid = showGrid ? `<defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#cbd5e1" stroke-opacity=".35" stroke-width=".15"/></pattern></defs><rect x="${geometry.xMin}" y="${geometry.yMin}" width="${viewW}" height="${viewH}" fill="url(#grid)"/>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${viewW + 22}mm" height="${viewH + 22}mm" viewBox="${geometry.xMin - 8} ${geometry.yMin - 14} ${viewW + 22} ${viewH + 22}">${grid}<g id="GLUE_ZONES" data-machine-operation="visual-only">${glueZones}</g><g id="CUT">${cuts}</g><g id="CREASE">${creases}</g>${labels}${dimensions}</svg>`;
  }, [geometry, showLabels, showGrid, showDimensions, showGlueZones]);

  const previewView = useMemo(() => {
    if (!geometry) return null;
    const rawX = geometry.xMin - 8;
    const rawY = geometry.yMin - 14;
    const rawW = Math.max(1, geometry.xMax - geometry.xMin + 22);
    const rawH = Math.max(1, geometry.yMax - geometry.yMin + 22);
    const zoom = Math.max(0.5, Math.min(4, previewZoom));
    const viewW = rawW / zoom;
    const viewH = rawH / zoom;
    return {
      x: rawX + (rawW - viewW) / 2,
      y: rawY + (rawH - viewH) / 2,
      width: viewW,
      height: viewH,
    };
  }, [geometry, previewZoom]);

  // DXF is deliberately CUT + CREASE only. Glue zones are visual-only, not knife paths.
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
        dimensionConvention: supportsDimensionConvention ? dimensionConvention : 'template-default',
        lidHeight: supportsLidHeight ? lidHeight : null,
        lidClearance: supportsLidHeight ? lidClearance : null,
        lockAngle: supportsLockAngle ? autoLockAngle : null,
        autoLockDimensions: supportsAutoLockDimensions ? { tuck: autoLockTuckDepth, topDustFlap: autoLockDustDepth, bottomSideFlap: autoLockSideDepth } : null,
        slotGap: supportsSlotGap ? slotGap : null,
        geometry: { cutPaths: geometry.cuts.length, creasePaths: geometry.creases.length, bounds: { width: geometry.xMax - geometry.xMin, height: geometry.yMax - geometry.yMin }, units: 'mm' },
      },
    };
    onSaveProject(project);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const inputClass = 'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div dir="rtl" className="min-h-screen overflow-y-auto bg-slate-50 p-3 text-slate-900 sm:p-5">
      <div className="mx-auto max-w-[1500px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-50 p-2 text-sky-700"><Box className="h-6 w-6"/></div><div><h2 className="text-lg font-black sm:text-xl">استودیوی طراحی دایلاین</h2><p className="mt-1 text-xs text-slate-600">کتابخانه پارامتریک · پیش‌نمایش ۲بعدی · خروجی برداری</p></div></div>
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-full border border-slate-300 px-3 py-1.5">{TEMPLATES.length} ساختار پارامتریک</span><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">واحد هندسه: mm</span></div>
        </header>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="order-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 xl:order-1">
            <div className="flex items-center justify-between"><h3 className="font-black">کتابخانه قالب‌ها</h3><Layers className="h-4 w-4 text-sky-700"/></div>
            <label className="relative block"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجوی نام یا کد..." className={inputClass + ' pr-9'}/></label>
            <label className="block text-xs font-bold text-slate-700">دسته‌بندی<select value={category} onChange={e => setCategory(e.target.value)} className={inputClass}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></label>

            <label className="block text-xs font-bold text-slate-700">نوع قالب / جعبه
              <select value={templateId} onChange={e => {
                const nextId = e.target.value;
                setTemplateId(nextId);
                if (nextId === 'snap-lock-123') {
                  // Load the public reference generator's reproducible benchmark
                  // when this carton is selected, so the geometry can be compared 1:1.
                  setLength(70); setWidth(70); setHeight(80);
                  setThickness(0.45); setMaterialPreset('folding-carton');
                  setGlueTab(15); setDimensionConvention('inside');
                } else if (nextId === 'fefco-0215') {
                  setMaterialPreset('corrugated-e'); setThickness(1.5);
                } else if (nextId === 'fefco-0713') {
                  setAutoLockTuckDepth(25); setAutoLockDustDepth(43); setAutoLockSideDepth(40.5);
                  setGlueTab(15); setDimensionConvention('inside');
                }
              }} className={inputClass}>
                {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.code} — {t.name}</option>)}
              </select>
            </label>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <h4 className="mb-3 text-sm font-bold">۱. ابعاد محصول (mm)</h4>
              <div className="grid grid-cols-3 gap-2">
                {([['طول', length, setLength], ['عرض', width, setWidth], ['ارتفاع', height, setHeight]] as const).map(([label, value, setter]) => <label key={label} className="text-[11px] font-bold text-slate-700">{label}<input type="number" min={10} max={2000} value={Number.isFinite(value) ? value : ''} onChange={e => setter(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>)}
              </div>
              {supportsLidHeight && <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2"><div className="grid grid-cols-2 gap-2"><label className="text-[11px] font-bold text-slate-700">عمق دیواره درب (mm)<input type="number" min={5} max={2000} value={Number.isFinite(lidHeight) ? lidHeight : ''} onChange={e => setLidHeight(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label><label className="text-[11px] font-bold text-slate-700">خلاصی کل درب (mm)<input type="number" min={0.1} max={12} step={0.1} value={Number.isFinite(lidClearance) ? lidClearance : ''} onChange={e => setLidClearance(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label></div><p className="mt-1 text-[10px] leading-5 text-slate-600">ارتفاع بدنه و عمق دیواره درب مستقل‌اند. «خلاصی کل» به اختلاف کلی ابعاد داخلی درب با ابعاد خارجی زیره در طول و عرض اشاره دارد؛ نه خلاصی هر طرف. مقدار مناسب به ورق و خط‌تا وابسته است و باید با نمونه اندازه‌گیری شود.</p></div>}
              {supportsDimensionConvention && <label className="mt-3 block text-[11px] font-bold text-slate-700">مبنای اندازه‌گذاری
                <select value={dimensionConvention} onChange={e => setDimensionConvention(e.target.value as 'inside' | 'outside')} className={inputClass}>
                  <option value="inside">ابعاد داخلی محصول — جبران کالیپر در گسترده</option>
                  <option value="outside">ابعاد خارجی محصول — ابعاد واردشده برابر ابعاد خارجی</option>
                </select>
              </label>}
              <h4 className="mb-2 mt-4 text-sm font-bold">۲. جنس و ضخامت ورق</h4>
              <label className="block text-[11px] font-bold text-slate-700">گروه مقوا
                <select value={materialPreset} onChange={e => { const value=e.target.value; setMaterialPreset(value); const presets:Record<string,number>={'folding-carton':0.45,'corrugated-e':1.5,'corrugated-b':3,'corrugated-c':4,'corrugated-eb':6.5,'custom':thickness}; if(value!=='custom'){setThickness(presets[value]);setSlotGap(Math.max(1,Math.min(6,presets[value]*1.5)));setLidClearance(Math.max(0.8,presets[value]*0.5));} }} className={inputClass}>
                  <option value="folding-carton">مقوای تاشو — حدود ۰٫۴۵ mm</option>
                  <option value="corrugated-e">کارتن فلوت E — حدود ۱٫۵ mm</option>
                  <option value="corrugated-b">کارتن فلوت B — حدود ۳ mm</option>
                  <option value="corrugated-c">کارتن فلوت C — حدود ۴ mm</option>
                  <option value="corrugated-eb">کارتن دوبل EB — حدود ۶٫۵ mm</option>
                  <option value="custom">ضخامت سفارشی</option>
                </select>
              </label>
              <div className={`mt-3 grid ${(supportsDimensionConvention || supportsLockAngle) ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                <label className="text-[11px] font-bold text-slate-700">ضخامت واقعی (mm)<input type="number" min={0.2} max={10} step={0.1} value={Number.isFinite(thickness) ? thickness : ''} onChange={e => { setThickness(e.target.value === '' ? NaN : Number(e.target.value)); setMaterialPreset('custom'); }} className={inputClass}/></label>
                <label className="text-[11px] font-bold text-slate-700">لبه چسب (mm)<input type="number" min={5} max={200} value={Number.isFinite(glueTab) ? glueTab : ''} onChange={e => setGlueTab(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>
                {supportsSlotGap && <label className="text-[11px] font-bold text-slate-700">فاصله شیار (mm)<input type="number" min={1} max={10} step={0.1} value={Number.isFinite(slotGap) ? slotGap : ''} onChange={e => setSlotGap(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>}
                {supportsLockAngle && <label className="text-[11px] font-bold text-slate-700">زاویه شانه قفل (درجه)<input type="number" min={25} max={65} step={1} value={Number.isFinite(autoLockAngle) ? autoLockAngle : ''} onChange={e => setAutoLockAngle(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>}
              </div>
              {supportsAutoLockDimensions && <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h5 className="mb-2 text-xs font-bold text-slate-800">۳. تنظیمات درب و فلپ‌های کف Auto-Lock (mm)</h5>
                <button type="button" onClick={() => { setLength(90); setWidth(90); setHeight(320); setThickness(0.45); setMaterialPreset('folding-carton'); setGlueTab(15); setSlotGap(1); setDimensionConvention('inside'); setAutoLockTuckDepth(25); setAutoLockDustDepth(43); setAutoLockSideDepth(40.5); }} className="mb-3 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-800 hover:bg-sky-50">بارگذاری نمونهٔ مرجع ۹۰×۹۰×۳۲۰ میلی‌متر</button>
                <div className="grid grid-cols-3 gap-2">
                  <label className="text-[11px] font-bold text-slate-700">عمق زبانه درب<input type="number" min={4} max={60} step={0.5} value={Number.isFinite(autoLockTuckDepth) ? autoLockTuckDepth : ''} onChange={e => setAutoLockTuckDepth(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>
                  <label className="text-[11px] font-bold text-slate-700">عمق گردگیر بالا<input type="number" min={4} max={43} step={0.5} value={Number.isFinite(autoLockDustDepth) ? autoLockDustDepth : ''} onChange={e => setAutoLockDustDepth(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>
                  <label className="text-[11px] font-bold text-slate-700">عمق فلپ جانبی کف<input type="number" min={6} max={43} step={0.5} value={Number.isFinite(autoLockSideDepth) ? autoLockSideDepth : ''} onChange={e => setAutoLockSideDepth(e.target.value === '' ? NaN : Number(e.target.value))} className={inputClass}/></label>
                </div>
                <p className="mt-2 text-[10px] leading-5 text-slate-600">پیش‌فرض‌های مرجع: ۲۵، ۴۳ و ۴۰٫۵ میلی‌متر. عمق مؤثر بعضی فلپ‌ها بر اساس عرض جعبه محدود می‌شود تا خطوط برش از هم عبور نکنند.</p>
              </div>}
              <p className="mt-2 text-[10px] leading-5 text-slate-600">{supportsAutoLockDimensions ? 'ابعاد داخل/خارج، ضخامت ورق و عمق فلپ‌ها بر گسترده اثر می‌گذارند. الگوی این بخش با مرجع عمومی Auto-Lock تطبیق داده شده؛ ساخت تیغ منوط به تطبیق با نقشه رسمی FEFCO و تست تا با ورق واقعی است.' : supportsDimensionConvention ? 'برای خانواده FEFCO 0200، ابعاد داخلی پیش‌فرض است؛ کالیپر به ابعاد پنل و بدنه افزوده می‌شود و فاصله شیار بین فلپ‌ها جداگانه تنظیم می‌شود. اصلاح دقیق خطوط تا باید با روش قالب‌ساز کالیبره شود.' : supportsLockAngle ? 'زاویه شانه در هندسه برش اعمال می‌شود؛ اما این‌ها الگوهای پارامتریک/آزمایشی‌اند، نه نقشهٔ رسمی تأییدشده. جای‌گیری قفل، خلاصی ورق و مونتاژ باید با نمونه تاخورده و مشخصات قالب‌ساز تأیید شود.' : 'برای این ساختار پارامتریک، تفسیر دقیق ابعاد داخل/خارج و جبران کامل خطوط تا هنوز تأیید نشده است.'}</p>
              {!validInputs && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-800">ابعاد: ۱۰ تا ۲۰۰۰ mm · ضخامت: ۰٫۲ تا ۱۰ mm · لبه چسب: ۵ تا ۲۰۰ mm · فاصله شیار: ۱ تا ۱۰ mm · عمق درب Auto-Lock: ۴ تا ۶۰ mm · گردگیر: ۴ تا ۴۳ mm · فلپ جانبی: ۶ تا ۴۳ mm · خلاصی درب: ۰٫۱ تا ۱۲ mm · زاویه قفل: ۲۵ تا ۶۵ درجه. تا اصلاح مقادیر، خروجی غیرفعال است.</p>}
            </div>
            <details className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <summary className="cursor-pointer px-2 py-1 text-xs font-bold text-slate-700">مرور همه قالب‌ها و توضیحات</summary>
              <div className="mt-2 grid max-h-[320px] grid-cols-1 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2 xl:grid-cols-1">
              {filteredTemplates.map(t => <button key={t.id} type="button" onClick={() => setTemplateId(t.id)} className={`rounded-xl border p-3 text-right transition ${t.id === templateId ? 'border-sky-500 bg-sky-50 ring-1 ring-sky-200' : 'border-slate-200 bg-slate-50 hover:border-slate-400'}`}>
                <div className="flex items-start justify-between gap-2"><span className="text-sm font-bold leading-6">{t.name}</span>{t.id === templateId && <Check className="mt-1 h-4 w-4 shrink-0 text-sky-700"/>}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">{t.code}</span><span className={`rounded px-1.5 py-0.5 text-[10px] ${t.status === 'baseline' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{t.status === 'baseline' ? 'مبنای پارامتریک' : 'غیرتأییدشده'}</span></div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{t.description}</p>
              </button>)}
              {filteredTemplates.length === 0 && <p className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">قالبی با این عبارت پیدا نشد.</p>}
              </div>
            </details>
            {template.note && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><AlertTriangle className="ml-1 inline h-4 w-4"/>{template.note}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button disabled={!exportReady} onClick={() => exportReady && geometry && download(`ashkghalam-${templateId}.svg`, svg, 'image/svg+xml;charset=utf-8')} className={buttonClass + ' bg-sky-600 text-white hover:bg-sky-500'}><Download className="h-4 w-4"/>خروجی SVG</button>
              <button disabled={!exportReady} onClick={exportDxf} className={buttonClass + ' bg-indigo-600 text-white hover:bg-indigo-500'}><Download className="h-4 w-4"/>خروجی DXF</button>
              <button disabled={!exportReady} onClick={() => exportReady && geometry && download(`ashkghalam-${templateId}.json`, JSON.stringify({ template, dimensions: { length, width, height, lidHeight: supportsLidHeight ? lidHeight : null, lidClearance: supportsLidHeight ? lidClearance : null, convention: supportsDimensionConvention ? dimensionConvention : 'template-default', lockAngle: supportsLockAngle ? autoLockAngle : null, autoLock: supportsAutoLockDimensions ? { tuck: autoLockTuckDepth, topDustFlap: autoLockDustDepth, bottomSideFlap: autoLockSideDepth } : null }, material: { thickness, glueTab, slotGap: supportsSlotGap ? slotGap : null }, geometry, units: 'mm' }, null, 2), 'application/json')} className={buttonClass + ' bg-slate-200 hover:bg-slate-300'}><Download className="h-4 w-4"/>پروژه JSON</button>
              <button disabled={!exportReady || !onSaveProject} onClick={saveProject} className={buttonClass + ' border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}><Save className="h-4 w-4"/>ثبت پروژه</button>
            </div>
            {saved && <p className="text-center text-xs text-emerald-700"><CheckCircle2 className="ml-1 inline h-4 w-4"/>پروژه به تابع ذخیره‌سازی تحویل شد.</p>}
          </aside>

          <main className="order-1 min-w-0 space-y-4 xl:order-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{template.code} — {template.name}</h3><span className={`rounded-full px-2 py-1 text-[10px] ${geometry ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-800'}`}>{geometry ? 'هندسه تولید شد' : 'خطای تولید'}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">قرمز پیوسته: برش · آبی خط‌چین: خط‌تا · نارنجی کم‌رنگ: محدوده چسب راهنما · L×W×H ورودی بر حسب میلی‌متر</p></div>
                <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg border border-slate-300 bg-white px-3 py-2"><Ruler className="ml-1 inline h-4 w-4 text-sky-700"/>{geometry ? `گسترده: ${(geometry.xMax - geometry.xMin).toFixed(1)} × ${(geometry.yMax - geometry.yMin).toFixed(1)} mm` : '—'}</span></div>
              </div>
              {geometryAudit && <details className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5"><summary className="cursor-pointer font-bold text-slate-800">گزارش بررسی مسیرها — {exportReady ? 'ساختار قابل‌قبول' : 'نیازمند بازبینی'}</summary><div className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${exportReady ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                <div className="flex items-center gap-2 font-bold"><CheckCircle2 className="h-4 w-4"/>{exportReady ? 'بررسی ساختاری مسیرها گذشت' : 'خروجی به بررسی بیشتر نیاز دارد'}</div>
                <p className="mt-1">طول برش تقریبی: {geometryAudit.cutLength} mm · طول خط‌تا: {geometryAudit.creaseLength} mm · امتیاز بررسی ساختاری: {geometryAudit.score}/100</p>
                <p className="mt-1">کنترل تقاطع: برش/برش {geometryAudit.topology.cutCutCrossings} · برش/خط‌تا {geometryAudit.topology.cutCreaseCrossings} · هم‌پوشانی {geometryAudit.topology.overlaps} · اتصال T نیازمند بازبینی {geometryAudit.topology.teeContacts} · خارج از محدوده {geometryAudit.topology.boundsViolations}</p>
                {geometryAudit.errors.map((message, i) => <p key={`audit-error-${i}`} className="mt-1">• {message}</p>)}
                {geometryAudit.warnings.map((message, i) => <p key={`audit-warning-${i}`} className="mt-1">• {message}</p>)}
                {geometryAudit.suggestions.map((message, i) => <p key={`audit-suggestion-${i}`} className="mt-1 text-slate-700">• {message}</p>)}
                {(geometryAudit.hasSelfIntersection || geometryAudit.topology.cutCutCrossings > 0 || geometryAudit.topology.cutCreaseCrossings > 0 || geometryAudit.topology.overlaps > 0 || geometryAudit.topology.boundsViolations > 0) && <p className="mt-1 font-bold">به‌دلیل تقاطع، هم‌پوشانی یا خروج از محدودهٔ گسترده، خروجی فایل و ثبت پروژه غیرفعال است.</p>}
              </div></details>}
              {geometryState.error && <div role="alert" className="mb-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><XCircle className="mt-0.5 h-5 w-5 shrink-0"/><div><strong>تولید دایلاین متوقف شد.</strong><p className="mt-1 text-xs leading-5">{geometryState.error}</p></div></div>}
              {geometry && previewView && <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-100 p-2 sm:p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-800">پیش‌نمایش ۲بعدی · واحد واقعی هندسه: mm</span>
                  <div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-1"><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)}/>شبکه</label>{(geometry.glueZones || []).length > 0 && <label className="flex items-center gap-1"><input type="checkbox" checked={showGlueZones} onChange={e => setShowGlueZones(e.target.checked)}/>ناحیه چسب</label>}<label className="flex items-center gap-1"><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)}/>نام پنل‌ها</label><label className="flex items-center gap-1"><input type="checkbox" checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)}/>خطوط اندازه</label><span className="mx-1 h-4 w-px bg-slate-300"/><button type="button" aria-label="کوچک‌نمایی" title="کوچک‌نمایی" onClick={() => setPreviewZoom(z => Math.max(0.5, Number((z - 0.25).toFixed(2))))} className="rounded border border-slate-300 bg-white px-2 py-1 text-base font-black hover:bg-slate-100" disabled={previewZoom <= 0.5}>−</button><span className="min-w-[3rem] text-center font-mono">{Math.round(previewZoom * 100)}%</span><button type="button" aria-label="بزرگ‌نمایی" title="بزرگ‌نمایی" onClick={() => setPreviewZoom(z => Math.min(4, Number((z + 0.25).toFixed(2))))} className="rounded border border-slate-300 bg-white px-2 py-1 text-base font-black hover:bg-slate-100" disabled={previewZoom >= 4}>+</button><button type="button" onClick={() => setPreviewZoom(1)} className="rounded border border-slate-300 bg-white px-2 py-1 hover:bg-slate-100">جا دادن کامل</button></div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="100%" preserveAspectRatio="xMidYMid meet" viewBox={`${previewView.x} ${previewView.y} ${previewView.width} ${previewView.height}`} className="block h-auto w-full max-h-[78vh]">
                  {showGrid && <defs><pattern id="dieline-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#cbd5e1" strokeWidth="0.2"/></pattern></defs>}
                  <rect x={previewView.x} y={previewView.y} width={previewView.width} height={previewView.height} fill={showGrid ? "url(#dieline-grid)" : "#ffffff"}/>
                  {showGlueZones && (geometry.glueZones || []).map((d, i) => <path key={`glue-${i}`} d={d} fill="#f59e0b" fillOpacity="0.24" stroke="#d97706" strokeWidth="0.4" strokeDasharray="2 1" vectorEffect="non-scaling-stroke"/>)}
                  {geometry.cuts.map((d, i) => <path key={`cut-${i}`} d={d} fill="none" stroke="#dc2626" strokeWidth="0.8" vectorEffect="non-scaling-stroke"/>)}
                  {geometry.creases.map((d, i) => <path key={`crease-${i}`} d={d} fill="none" stroke="#2563eb" strokeWidth="0.8" strokeDasharray="5 3" vectorEffect="non-scaling-stroke"/>)}
                  {showLabels && geometry.labels.map((label, i) => <text key={`label-${i}`} x={label.x} y={label.y} fill="#475569" fontSize="5" textAnchor="middle">{label.text}</text>)}
                  {showDimensions && <g fill="#475569" stroke="#64748b" strokeWidth="0.25">
                    <path d={`M ${geometry.xMin} ${geometry.yMin - 5} L ${geometry.xMax} ${geometry.yMin - 5} M ${geometry.xMin} ${geometry.yMin - 7} L ${geometry.xMin} ${geometry.yMin - 3} M ${geometry.xMax} ${geometry.yMin - 7} L ${geometry.xMax} ${geometry.yMin - 3} M ${geometry.xMax + 5} ${geometry.yMin} L ${geometry.xMax + 5} ${geometry.yMax} M ${geometry.xMax + 3} ${geometry.yMin} L ${geometry.xMax + 7} ${geometry.yMin} M ${geometry.xMax + 3} ${geometry.yMax} L ${geometry.xMax + 7} ${geometry.yMax}`}/>
                    <text x={(geometry.xMin + geometry.xMax) / 2} y={geometry.yMin - 6} fontSize="5" textAnchor="middle" stroke="none">{(geometry.xMax - geometry.xMin).toFixed(1)} mm</text>
                    <text x={geometry.xMax + 6} y={(geometry.yMin + geometry.yMax) / 2} fontSize="5" textAnchor="middle" stroke="none" transform={`rotate(90 ${geometry.xMax + 6} ${(geometry.yMin + geometry.yMax) / 2})`}>{(geometry.yMax - geometry.yMin).toFixed(1)} mm</text>
                  </g>}
                </svg>
              </div>}
              {geometry && <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600"><span className="rounded-lg border border-slate-200 bg-white px-3 py-2">برش: <strong>{geometry.cuts.length}</strong> مسیر</span><span className="rounded-lg border border-slate-200 bg-white px-3 py-2">خط‌تا: <strong>{geometry.creases.length}</strong> مسیر</span><span className="rounded-lg border border-slate-200 bg-white px-3 py-2">ضخامت ورق: <strong>{thickness} mm</strong></span><span className="rounded-lg border border-slate-200 bg-white px-3 py-2">گسترده: <strong>{(geometry.xMax-geometry.xMin).toFixed(1)} × {(geometry.yMax-geometry.yMin).toFixed(1)} mm</strong></span></div>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setShow3D(v => !v)} className={buttonClass + ' border border-slate-300 bg-white hover:bg-slate-100'}><Rotate3d className="h-4 w-4"/>{show3D ? 'بستن نمای حجمی' : 'نمای حجمی ابعاد'}</button>
                <a className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100" href="https://www.fefco.org/technical-information/fefco-code" target="_blank" rel="noreferrer">مرجع رسمی FEFCO ↗</a>
                <a className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100" href="https://www.packmage.com/Home/BoxLibrary" target="_blank" rel="noreferrer">کتابخانه Packmage ↗</a>
              </div>
              {show3D && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-sm font-bold"><Rotate3d className="h-4 w-4 text-sky-700"/>پیش‌نمایش حجمی با فلپ‌های لولایی</div><span className="text-xs text-slate-600">{Math.round(openRatio * 100)}٪ بازشدگی</span></div><div className="h-[360px] overflow-hidden rounded-lg"><ThreeDPreview width={length} height={height} depth={width} isOpenRatio={openRatio} autoRotate/></div><label className="mt-3 flex items-center gap-3 text-xs text-slate-700">بسته <input type="range" min={0} max={1} step={0.05} value={openRatio} onChange={e => setOpenRatio(Number(e.target.value))} className="w-full accent-sky-500"/> باز</label><p className="mt-2 text-xs leading-5 text-amber-800"><Info className="ml-1 inline h-4 w-4"/>این نسخه، مدل حجمی عمومی با چهار دیواره و فلپ‌های لولایی است؛ هنوز هندسه سه‌بعدی اختصاصی و ترتیب مونتاژ هر کد FEFCO/ECMA را از روی نقشه دوبعدی بازسازی نمی‌کند.</p></div>}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 sm:p-4">
              <h4 className="mb-1 flex items-center gap-2 font-bold text-slate-800"><Scissors className="h-4 w-4 text-rose-700"/>یادداشت تولید</h4>
              <p>نام یا شماره قالب به‌تنهایی تضمین‌کننده تطابق با نقشه رسمی نیست. در این نسخه، ضخامت ورق روی خلاصی فلپ‌ها اثر می‌گذارد، اما جبران کامل ابعاد داخل/خارج و اصلاحات هر خط تا هنوز برای همه قالب‌ها پیاده‌سازی نشده است؛ ابعاد را پیش از تولید با نقشه مرجع، جهت الیاف، تلرانس ماشین و نمونه تاخورده تطبیق دهید. این استودیو علاوه بر کنترل ابعاد و ساختار مسیرها، تقاطع و هم‌پوشانی میان مسیرهای مستقل برش، برخورد برش با خط‌تا و خروج مسیر از محدودهٔ گسترده را بررسی می‌کند؛ اتصال T در بعضی شیارهای مشترک فقط هشدار است و باید تصویری بازبینی شود. این بررسی جایگزین شبیه‌سازی کامل تاخوردن، نقشهٔ مرجع یا نمونهٔ فیزیکی نیست.</p>
              <p className="mt-1">* برچسب ستاره‌دار یا «قالب سفارشی» به معنی هندسه پایه داخلی است، نه تأیید رسمی FEFCO/ECMA.</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};
