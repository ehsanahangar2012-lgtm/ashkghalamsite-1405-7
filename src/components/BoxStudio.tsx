import React, { useMemo, useRef, useState } from 'react';
import { ThreeDPreview } from './ThreeDPreview';
import { Download, FileDown, Ruler, RotateCcw, Save, Settings2, ShieldCheck, Box, Layers3, Info } from 'lucide-react';

type Segment = { x1: number; y1: number; x2: number; y2: number; kind: 'cut' | 'fold' };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type BoxTemplate = 'rsc' | 'mailer' | 'tray';

function makeGeometry(L: number, W: number, H: number, glue: number, allowance: number, template: BoxTemplate) {
  const lines: Segment[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, kind: Segment['kind']) => {
    if (![x1, y1, x2, y2].every(Number.isFinite)) return;
    if (Math.hypot(x2 - x1, y2 - y1) < 0.001) return;
    lines.push({ x1, y1, x2, y2, kind });
  };

  if (template === 'tray' || template === 'mailer') {
    // Conceptual one-piece tray / mailer blank: base, folding walls and a lid extension for mailers.
    const wall = Math.max(10, H + allowance);
    const x0 = wall + 18, y0 = (template === 'mailer' ? L : wall) + wall + 28;
    const x1 = x0 + L, y1 = y0 + W;
    line(x0, y0, x1, y0, 'fold');
    line(x1, y0, x1, y1, 'fold');
    line(x1, y1, x0, y1, 'fold');
    line(x0, y1, x0, y0, 'fold');
    line(x0, y0, x0, y0 - wall, 'cut');
    line(x0, y0 - wall, x1, y0 - wall, 'cut');
    line(x1, y0 - wall, x1, y0, 'cut');
    line(x0, y1, x0, y1 + wall, 'cut');
    line(x0, y1 + wall, x1, y1 + wall, 'cut');
    line(x1, y1 + wall, x1, y1, 'cut');
    line(x0, y0, x0 - wall, y0, 'cut');
    line(x0 - wall, y0, x0 - wall, y1, 'cut');
    line(x0 - wall, y1, x0, y1, 'cut');
    line(x1, y0, x1 + wall, y0, 'cut');
    line(x1 + wall, y0, x1 + wall, y1, 'cut');
    line(x1 + wall, y1, x1, y1, 'cut');
    line(x0 - wall, y0, x0, y0 + Math.min(wall, 12), 'cut');
    line(x0 - wall, y1, x0, y1 - Math.min(wall, 12), 'cut');
    line(x1 + wall, y0, x1, y0 + Math.min(wall, 12), 'cut');
    line(x1 + wall, y1, x1, y1 - Math.min(wall, 12), 'cut');
    if (template === 'mailer') {
      // Lid panel and a small tuck lip, attached to the rear wall.
      line(x0, y0 - wall, x0, y0 - wall - L, 'cut');
      line(x0, y0 - wall - L, x1, y0 - wall - L, 'cut');
      line(x1, y0 - wall - L, x1, y0 - wall, 'cut');
      line(x0, y0 - wall - L, x0 + Math.min(wall, 18), y0 - wall - L + Math.min(wall, 18), 'cut');
      line(x1 - Math.min(wall, 18), y0 - wall - L + Math.min(wall, 18), x1, y0 - wall - L, 'cut');
    }
    return { lines, totalW: x1 + wall + 18, totalH: y1 + wall + 18 + (template === 'mailer' ? L : 0), yTop: y0, yBottom: y1, xs: [x0, x1], flap: wall };
  }

  // FEFCO 0201-style regular slotted carton (RSC), parametric concept.
  const flap = Math.max(8, W / 2 + allowance);
  const yTop = flap + 18;
  const yBottom = yTop + H;
  const xs = [glue, glue + L, glue + L + W, glue + 2 * L + W, glue + 2 * L + 2 * W];
  const totalW = xs[4];
  const totalH = yBottom + flap + 18;
  line(0, yTop + 8, 0, yBottom - 8, 'cut');
  line(0, yTop + 8, glue, yTop, 'cut');
  line(0, yBottom - 8, glue, yBottom, 'cut');
  line(glue, yTop, glue, yBottom, 'fold');
  line(xs[0], yTop, xs[4], yTop, 'fold');
  line(xs[0], yBottom, xs[4], yBottom, 'fold');
  line(xs[0], yTop, xs[0], yBottom, 'cut');
  line(xs[4], yTop, xs[4], yBottom, 'cut');
  [xs[1], xs[2], xs[3]].forEach(x => line(x, yTop, x, yBottom, 'fold'));
  for (let i = 0; i < 4; i++) {
    const x0 = xs[i], x1 = xs[i + 1], panelW = x1 - x0;
    const sideInset = (i === 0 || i === 2) ? 0 : Math.min(8, panelW * 0.18);
    line(x0, yTop, x0, yTop - flap + (sideInset ? 7 : 0), 'cut');
    if (sideInset) line(x0, yTop - flap + 7, x0 + sideInset, yTop - flap, 'cut');
    line(x0 + sideInset, yTop - flap, x1 - sideInset, yTop - flap, 'cut');
    if (sideInset) line(x1 - sideInset, yTop - flap, x1, yTop - flap + 7, 'cut');
    line(x1, yTop - flap + (sideInset ? 7 : 0), x1, yTop, 'cut');
    line(x0, yBottom, x0, yBottom + flap - (sideInset ? 7 : 0), 'cut');
    if (sideInset) line(x0, yBottom + flap - 7, x0 + sideInset, yBottom + flap, 'cut');
    line(x0 + sideInset, yBottom + flap, x1 - sideInset, yBottom + flap, 'cut');
    if (sideInset) line(x1 - sideInset, yBottom + flap, x1, yBottom + flap - 7, 'cut');
    line(x1, yBottom + flap - (sideInset ? 7 : 0), x1, yBottom, 'cut');
  }
  return { lines, totalW, totalH, yTop, yBottom, xs, flap };
}

function downloadFile(name: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export function BoxStudio() {
  const [length, setLength] = useState(240);
  const [width, setWidth] = useState(160);
  const [height, setHeight] = useState(100);
  const [glue, setGlue] = useState(28);
  const [allowance, setAllowance] = useState(0);
  const [board, setBoard] = useState('E');
  const [template, setTemplate] = useState<BoxTemplate>('rsc');
  const [showDimensions, setShowDimensions] = useState(true);
  const [saved, setSaved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const thickness = board === 'E' ? 1.5 : board === 'B' ? 3 : board === 'C' ? 4 : 0.45;
  const L = clamp(Number(length) || 1, 20, 2000);
  const W = clamp(Number(width) || 1, 20, 2000);
  const H = clamp(Number(height) || 1, 20, 2000);
  const G = clamp(Number(glue) || 1, 10, 120);
  const geom = useMemo(() => makeGeometry(L, W, H, G, Number(allowance) || 0, template), [L, W, H, G, allowance, template]);
  const viewW = geom.totalW + 50;
  const viewH = geom.totalH + 50;
  const bounds = useMemo(() => {
    const xs = geom.lines.flatMap(line => [line.x1, line.x2]);
    const ys = geom.lines.flatMap(line => [line.y1, line.y2]);
    return {
      minX: Math.min(...xs), maxX: Math.max(...xs),
      minY: Math.min(...ys), maxY: Math.max(...ys),
    };
  }, [geom]);
  const sheetWidth = Math.max(0, bounds.maxX - bounds.minX) + 2 * thickness;
  const sheetHeight = Math.max(0, bounds.maxY - bounds.minY) + 2 * thickness;
  const warnings = [
    ...(L < 40 || W < 40 || H < 20 ? ['ابعاد انتخابی کوچک است؛ امکان ساخت را بررسی کنید.'] : []),
    ...(template === 'rsc' && W / 2 + Number(allowance) < thickness * 2 ? ['عمق فلپ نسبت به ضخامت ورق کم است.'] : []),
    ...(template === 'rsc' && G < Math.max(15, thickness * 8) ? ['لبه چسب انتخابی ممکن است برای خط تولید شما باریک باشد.'] : []),
    'الگوهای Mailer و Tray در این نسخه مفهومی هستند؛ پیش از قالب‌سازی باید توسط طراح بسته‌بندی بازبینی شوند.'
  ];
  const materialArea = (sheetWidth * sheetHeight) / 1_000_000;

  const exportSvg = () => {
    if (!svgRef.current) return;
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', `${Math.ceil(viewW)}mm`);
    clone.setAttribute('height', `${Math.ceil(viewH)}mm`);
    clone.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);
    const textNodes = clone.querySelectorAll('[data-ui-only="true"]');
    textNodes.forEach(n => n.remove());
    downloadFile(`ashkghalam-${template}-dieline.svg`, new XMLSerializer().serializeToString(clone), 'image/svg+xml;charset=utf-8');
  };

  const exportDxf = () => {
    const entities = geom.lines.map(s => {
      const layer = s.kind === 'cut' ? 'CUT' : 'CREASE';
      return `0\nLINE\n8\n${layer}\n10\n${(s.x1).toFixed(3)}\n20\n${(geom.totalH - s.y1).toFixed(3)}\n30\n0\n11\n${(s.x2).toFixed(3)}\n21\n${(geom.totalH - s.y2).toFixed(3)}\n31\n0\n`;
    }).join('');
    const dxf = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nLAYER\n2\nCREASE\n70\n0\n62\n5\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
    downloadFile(`ashkghalam-${template}-dieline.dxf`, dxf, 'application/dxf');
  };

  const saveProject = () => {
    const project = {
      schema: 'ashkghalam.box-studio.v1',
      savedAt: new Date().toISOString(),
      units: 'mm',
      template: template === 'rsc' ? 'RSC / FEFCO 0201 (conceptual parametric preview)' : template === 'mailer' ? 'One-piece mailer (conceptual preview)' : 'Open tray (conceptual preview)',
      dimensions: { length: L, width: W, height: H, glueFlap: G, flapAllowance: Number(allowance) || 0 },
      geometry: { segmentCount: geom.lines.length, cutSegments: geom.lines.filter(line => line.kind === 'cut').length, foldSegments: geom.lines.filter(line => line.kind === 'fold').length },
      board: { grade: board, nominalThicknessMm: thickness },
      note: 'Validate board caliper, grain direction, slot/crease rules and manufacturer tolerances before production.'
    };
    downloadFile('ashkghalam-box-project.json', JSON.stringify(project, null, 2), 'application/json');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const field = (label: string, value: number, setValue: (v: number) => void, min: number, max: number) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label} <span className="font-normal text-slate-400">(mm)</span></span>
      <input type="number" min={min} max={max} value={value} onChange={e => setValue(clamp(Number(e.target.value), min, max))}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
    </label>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f6fa] px-3 py-5 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-l from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-white/10 px-3 py-1 text-xs font-bold text-indigo-100"><Box size={15} /> استودیو ساختار بسته‌بندی اشک قلم</div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">جعبه‌ساز مهندسی</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">طراحی پارامتریک دایلاین، کنترل ابعاد و خروجی برداری؛ تغییرات را همین‌جا زنده ببینید و فایل را برای ادامه کار ذخیره کنید.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
              <div className="text-[10px] uppercase tracking-[0.2em] text-indigo-200">LIVE GEOMETRY</div>
              <div className="mt-1 text-2xl font-black">{Math.round(geom.totalW)} × {Math.round(geom.totalH)} <span className="text-xs font-medium text-slate-300">mm</span></div>
              <div className="mt-1 text-xs text-slate-300">اندازه تقریبی گسترده</div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[['ساختار', 'RSC / FEFCO 0201'], ['واحد طراحی', 'میلی‌متر'], ['محاسبه', 'محلی و لحظه‌ای'], ['خروجی', 'SVG · DXF · JSON']].map(([k,v]) => <div key={k} className="rounded-xl border border-white/10 bg-white/5 p-3"><div className="text-[10px] text-slate-400">{k}</div><div className="mt-1 text-xs font-bold text-white">{v}</div></div>)}
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Settings2 size={18} className="text-indigo-600" /><h2 className="font-extrabold">پارامترهای جعبه</h2></div>
              <label className="mb-4 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">نوع ساختار</span><select value={template} onChange={e => setTemplate(e.target.value as BoxTemplate)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"><option value="rsc">کارتن چهارلَت (RSC / FEFCO 0201)</option><option value="mailer">جعبه پستی یک‌تکه (Mailer — مفهومی)</option><option value="tray">سینی چهارلبه (Tray — مفهومی)</option></select></label>
              <div className="grid grid-cols-2 gap-3">
                {field('طول', length, setLength, 20, 2000)}
                {field('عرض', width, setWidth, 20, 2000)}
                {field('ارتفاع', height, setHeight, 20, 2000)}
                {field('لبه چسب', glue, setGlue, 10, 120)}
              </div>
              <label className="mt-4 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">نوع ورق</span>
                <select value={board} onChange={e => setBoard(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500">
                  <option value="E">فلوت E — میکرو (حدود ۱٫۵ mm)</option><option value="B">فلوت B — حدود ۳ mm</option><option value="C">فلوت C — حدود ۴ mm</option><option value="F">مقوای تخت — حدود ۰٫۴۵ mm</option>
                </select>
              </label>
              <label className="mt-4 block"><span className="mb-1.5 flex justify-between text-xs font-bold text-slate-600"><span>تلرانس عمق لبه‌ها</span><span>{allowance} mm</span></span>
                <input type="range" min="-5" max="15" step="0.5" value={allowance} onChange={e => setAllowance(Number(e.target.value))} className="w-full accent-indigo-600" />
                <span className="mt-1 flex justify-between text-[10px] text-slate-400"><span>۵- mm</span><span>۱۵+ mm</span></span>
              </label>
              <label className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={showDimensions} onChange={e => setShowDimensions(e.target.checked)} className="accent-indigo-600" /> نمایش اندازه‌گذاری روی نقشه</label>
              <button onClick={() => {setLength(240);setWidth(160);setHeight(100);setGlue(28);setAllowance(0);setBoard('E');setTemplate('rsc');}} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><RotateCcw size={14}/> بازگشت به ابعاد نمونه</button>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Ruler size={18} className="text-indigo-600"/><h2 className="font-extrabold">برآورد ابعاد گسترده</h2></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">عرض گسترده تقریبی</span><strong>{sheetWidth.toFixed(1)} mm</strong></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">ارتفاع گسترده تقریبی</span><strong>{sheetHeight.toFixed(1)} mm</strong></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">مساحت هندسی تقریبی</span><strong>{materialArea.toFixed(3)} m²</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">ضخامت اسمی ورق</span><strong>{thickness} mm</strong></div>
              </div>
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">مساحت از محدوده هندسی خطوط محاسبه می‌شود و پرت ورق، جهت فلوت، شیارزنی و تلرانس دستگاه را شامل نمی‌شود.</p>
            </section>
          </aside>

          <main className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div><h2 className="font-extrabold">پیش‌نمایش دایلاین دوبعدی</h2><p className="mt-1 text-[11px] text-slate-500">خط قرمز: برش · خط آبی: خط تا / crease · هندسه متناسب با ساختار انتخابی</p></div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={exportSvg} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"><Download size={15}/> خروجی SVG</button>
                  <button onClick={exportDxf} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-800"><FileDown size={15}/> خروجی DXF</button>
                  <button onClick={saveProject} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Save size={15}/> ذخیره پروژه</button>
                </div>
              </div>
              <div className="relative overflow-auto bg-[#fbfcff] p-3 sm:p-6">
                <svg ref={svgRef} viewBox={`0 0 ${viewW} ${viewH}`} role="img" aria-label="نقشه گسترده جعبه با خطوط برش و تا" className="mx-auto block h-auto w-full" style={{maxHeight: '720px', minWidth: '480px'}}>
                  <defs><pattern id="studio-grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e8edf5" strokeWidth=".45"/></pattern></defs>
                  <rect width={viewW} height={viewH} fill="url(#studio-grid)"/>
                  <g transform="translate(25 25)">
                    {geom.lines.map((s, i) => <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.kind === 'cut' ? '#e44747' : '#2878cf'} strokeWidth={s.kind === 'cut' ? 1.35 : 1.05} strokeDasharray={s.kind === 'fold' ? '5 3' : undefined} vectorEffect="non-scaling-stroke"/>)}
                    {showDimensions && <g data-ui-only="true" fill="#526176" fontSize="9" fontWeight="600">
                      {template === 'rsc' ? <>
                        <text x={geom.xs[0] + L/2} y={geom.yTop + H/2} textAnchor="middle">{L} mm</text>
                        <text x={geom.xs[1] + W/2} y={geom.yTop + H/2} textAnchor="middle">{W} mm</text>
                        <text x={geom.xs[2] + L/2} y={geom.yTop + H/2} textAnchor="middle">{L} mm</text>
                        <text x={geom.xs[3] + W/2} y={geom.yTop + H/2} textAnchor="middle">{W} mm</text>
                      </> : <text x={(geom.xs[0] + geom.xs[1])/2} y={(geom.yTop + geom.yBottom)/2} textAnchor="middle">{L} × {W} mm</text>}
                      <text x={geom.totalW/2} y={geom.totalH - 4} textAnchor="middle">گسترده تقریبی: {Math.round(geom.totalW)} × {Math.round(geom.totalH)} mm</text>
                    </g>}
                  </g>
                </svg>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500"><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-[#e44747]"/> برش (CUT)</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 border-t-2 border-dashed border-[#2878cf]"/> خط تا (CREASE)</span><span className="mr-auto">ابعاد بر حسب میلی‌متر</span></div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4"><h2 className="font-extrabold">پیش‌نمایش سه‌بعدی تعاملی</h2><p className="mt-1 text-[11px] text-slate-500">مدل حجمی با چرخش خودکار برای بررسی تناسبات؛ این نما هنوز شماتیک است و شکل فلپ‌ها را بازسازی نمی‌کند.</p></div>
              <div className="bg-slate-950 p-3"><ThreeDPreview width={L} height={H} depth={W} autoRotate={true} color="#d4b98c" /></div>
              <div className="px-5 py-3 text-[11px] text-slate-500">طول: {L} mm · عرض: {W} mm · ارتفاع: {H} mm</div>
            </section>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-2 flex items-center gap-2"><Layers3 size={18} className="text-indigo-600"/><h3 className="font-extrabold">خلاصه ساختار</h3></div><p className="text-xs leading-6 text-slate-600">الگوی چهار پنل با لبه چسب، دو جفت فلپ بالا و پایین و خطوط تا مستقل. تمام هندسه با تغییر ابعاد دوباره محاسبه می‌شود؛ فایل‌های SVG و DXF به صورت محلی ساخته می‌شوند و به سرویس خارجی نیاز ندارند.</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600"/><h3 className="font-extrabold">کنترل قبل از تولید</h3></div><ul className="space-y-1.5 text-xs leading-5 text-slate-600"><li>• تطبیق ابعاد داخلی/خارجی با ضخامت ورق</li><li>• کنترل هم‌پوشانی فلپ‌ها و عرض لبه چسب</li><li>• بررسی جهت فلوت و محدودیت‌های قالب دایکات</li><li>• تست نمونه فیزیکی پیش از تیراژ</li></ul></div>
            </section>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-950"><div className="mb-2 flex items-center gap-2 font-extrabold"><Info size={17}/> کنترل هندسه و پیش از تولید</div><ul className="space-y-1">{warnings.map((warning, i) => <li key={i}>• {warning}</li>)}</ul><p className="mt-2 text-[11px] text-amber-800">قطعات هندسی: {geom.lines.length} · خطوط برش: {geom.lines.filter(line => line.kind === 'cut').length} · خطوط تا: {geom.lines.filter(line => line.kind === 'fold').length}</p></div>
            {saved && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">فایل پروژه آماده شد.</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
