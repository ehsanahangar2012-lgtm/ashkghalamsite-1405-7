import React, { useMemo, useRef, useState } from 'react';
import { Download, FileDown, Ruler, RotateCcw, Save, Settings2, ShieldCheck, Box, Layers3, Info } from 'lucide-react';

type Segment = { x1: number; y1: number; x2: number; y2: number; kind: 'cut' | 'fold' };

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function makeGeometry(L: number, W: number, H: number, glue: number, allowance: number) {
  const flap = Math.max(8, W / 2 + allowance);
  const yTop = flap + 18;
  const yBottom = yTop + H;
  const xs = [glue, glue + L, glue + L + W, glue + 2 * L + W, glue + 2 * L + 2 * W];
  const totalW = xs[4];
  const totalH = yBottom + flap + 18;
  const lines: Segment[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number, kind: Segment['kind']) => {
    lines.push({ x1, y1, x2, y2, kind });
  };

  // Glue flap: tapered outer edge, joined to the first body panel.
  line(0, yTop + 8, 0, yBottom - 8, 'cut');
  line(0, yTop + 8, glue, yTop, 'cut');
  line(0, yBottom - 8, glue, yBottom, 'cut');
  line(glue, yTop, glue, yBottom, 'fold');

  // Main body perimeter and structural crease lines.
  line(xs[0], yTop, xs[4], yTop, 'fold');
  line(xs[0], yBottom, xs[4], yBottom, 'fold');
  line(xs[0], yTop, xs[0], yBottom, 'cut');
  line(xs[4], yTop, xs[4], yBottom, 'cut');
  [xs[1], xs[2], xs[3]].forEach(x => line(x, yTop, x, yBottom, 'fold'));

  // Four dust/major flaps, with eased corners for practical die cutting.
  for (let i = 0; i < 4; i++) {
    const x0 = xs[i], x1 = xs[i + 1], panelW = x1 - x0;
    const depth = flap;
    const inset = Math.min(10, panelW * 0.12, depth * 0.25);
    const isMajor = i === 0 || i === 2;
    const sideInset = isMajor ? 0 : Math.min(8, panelW * 0.18);
    // top flap outer cut contour
    line(x0, yTop, x0, yTop - depth + (sideInset ? 7 : 0), 'cut');
    if (sideInset) line(x0, yTop - depth + 7, x0 + sideInset, yTop - depth, 'cut');
    line(x0 + sideInset, yTop - depth, x1 - sideInset, yTop - depth, 'cut');
    if (sideInset) line(x1 - sideInset, yTop - depth, x1, yTop - depth + 7, 'cut');
    line(x1, yTop - depth + (sideInset ? 7 : 0), x1, yTop, 'cut');

    // bottom flap outer cut contour
    line(x0, yBottom, x0, yBottom + depth - (sideInset ? 7 : 0), 'cut');
    if (sideInset) line(x0, yBottom + depth - 7, x0 + sideInset, yBottom + depth, 'cut');
    line(x0 + sideInset, yBottom + depth, x1 - sideInset, yBottom + depth, 'cut');
    if (sideInset) line(x1 - sideInset, yBottom + depth, x1, yBottom + depth - 7, 'cut');
    line(x1, yBottom + depth - (sideInset ? 7 : 0), x1, yBottom, 'cut');

    // Minor short relief lines on major flap shoulders improve fold clearance.
    if (isMajor && inset > 0) {
      line(x0, yTop - depth + inset, x0 + inset, yTop - depth, 'cut');
      line(x1 - inset, yTop - depth, x1, yTop - depth + inset, 'cut');
      line(x0, yBottom + depth - inset, x0 + inset, yBottom + depth, 'cut');
      line(x1 - inset, yBottom + depth, x1, yBottom + depth - inset, 'cut');
    }
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
  const [showDimensions, setShowDimensions] = useState(true);
  const [saved, setSaved] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const thickness = board === 'E' ? 1.5 : board === 'B' ? 3 : board === 'C' ? 4 : 0.45;
  const L = clamp(Number(length) || 1, 20, 2000);
  const W = clamp(Number(width) || 1, 20, 2000);
  const H = clamp(Number(height) || 1, 20, 2000);
  const G = clamp(Number(glue) || 1, 10, 120);
  const geom = useMemo(() => makeGeometry(L, W, H, G, Number(allowance) || 0), [L, W, H, G, allowance]);
  const viewW = geom.totalW + 50;
  const viewH = geom.totalH + 50;
  const scaleFactor = Math.min(1, 1000 / Math.max(viewW, viewH));
  const sheetWidth = 2 * L + 2 * W + G + 2 * thickness;
  const sheetHeight = H + 2 * (W / 2 + Number(allowance)) + 36 + 2 * thickness;
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
    downloadFile('ashkghalam-rsc-dieline.svg', new XMLSerializer().serializeToString(clone), 'image/svg+xml;charset=utf-8');
  };

  const exportDxf = () => {
    const entities = geom.lines.map(s => {
      const layer = s.kind === 'cut' ? 'CUT' : 'CREASE';
      return `0\nLINE\n8\n${layer}\n10\n${(s.x1).toFixed(3)}\n20\n${(geom.totalH - s.y1).toFixed(3)}\n30\n0\n11\n${(s.x2).toFixed(3)}\n21\n${(geom.totalH - s.y2).toFixed(3)}\n31\n0\n`;
    }).join('');
    const dxf = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n2\n0\nLAYER\n2\nCUT\n70\n0\n62\n1\n6\nCONTINUOUS\n0\nLAYER\n2\nCREASE\n70\n0\n62\n5\n6\nCONTINUOUS\n0\nENDTAB\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${entities}0\nENDSEC\n0\nEOF\n`;
    downloadFile('ashkghalam-rsc-dieline.dxf', dxf, 'application/dxf');
  };

  const saveProject = () => {
    const project = {
      schema: 'ashkghalam.box-studio.v1',
      savedAt: new Date().toISOString(),
      units: 'mm',
      template: 'RSC / FEFCO 0201 (parametric preview)',
      dimensions: { length: L, width: W, height: H, glueFlap: G, flapAllowance: Number(allowance) || 0 },
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
              <button onClick={() => {setLength(240);setWidth(160);setHeight(100);setGlue(28);setAllowance(0);setBoard('E');}} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50"><RotateCcw size={14}/> بازگشت به ابعاد نمونه</button>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2"><Ruler size={18} className="text-indigo-600"/><h2 className="font-extrabold">برآورد گسترده</h2></div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">عرض گسترده تقریبی</span><strong>{sheetWidth.toFixed(1)} mm</strong></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">ارتفاع گسترده تقریبی</span><strong>{sheetHeight.toFixed(1)} mm</strong></div>
                <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">مساحت یک گسترده</span><strong>{materialArea.toFixed(3)} m²</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">ضخامت اسمی ورق</span><strong>{thickness} mm</strong></div>
              </div>
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-800">این اعداد برآورد هندسی اولیه‌اند؛ جبران ضخامت، جهت فلوت، شیارزنی و تلرانس دستگاه باید با مشخصات خط تولید تنظیم شود.</p>
            </section>
          </aside>

          <main className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div><h2 className="font-extrabold">پیش‌نمایش دایلاین دوبعدی</h2><p className="mt-1 text-[11px] text-slate-500">خط قرمز: برش · خط آبی: خط تا / crease</p></div>
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
                      <text x={geom.xs[0] + L/2} y={geom.yTop + H/2} textAnchor="middle">{L} mm</text>
                      <text x={geom.xs[1] + W/2} y={geom.yTop + H/2} textAnchor="middle">{W} mm</text>
                      <text x={geom.xs[2] + L/2} y={geom.yTop + H/2} textAnchor="middle">{L} mm</text>
                      <text x={geom.xs[3] + W/2} y={geom.yTop + H/2} textAnchor="middle">{W} mm</text>
                      <text x={geom.totalW/2} y={geom.yBottom + geom.flap + 13} textAnchor="middle">گسترده تقریبی: {Math.round(geom.totalW)} × {Math.round(geom.totalH)} mm</text>
                    </g>}
                  </g>
                </svg>
              </div>
              <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500"><span className="flex items-center gap-2"><i className="h-0.5 w-5 bg-[#e44747]"/> برش (CUT)</span><span className="flex items-center gap-2"><i className="h-0.5 w-5 border-t-2 border-dashed border-[#2878cf]"/> خط تا (CREASE)</span><span className="mr-auto">ابعاد بر حسب میلی‌متر</span></div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-2 flex items-center gap-2"><Layers3 size={18} className="text-indigo-600"/><h3 className="font-extrabold">خلاصه ساختار</h3></div><p className="text-xs leading-6 text-slate-600">الگوی چهار پنل با لبه چسب، دو جفت فلپ بالا و پایین و خطوط تا مستقل. تمام هندسه با تغییر ابعاد دوباره محاسبه می‌شود؛ فایل‌های SVG و DXF به صورت محلی ساخته می‌شوند و به سرویس خارجی نیاز ندارند.</p></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-2 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600"/><h3 className="font-extrabold">کنترل قبل از تولید</h3></div><ul className="space-y-1.5 text-xs leading-5 text-slate-600"><li>• تطبیق ابعاد داخلی/خارجی با ضخامت ورق</li><li>• کنترل هم‌پوشانی فلپ‌ها و عرض لبه چسب</li><li>• بررسی جهت فلوت و محدودیت‌های قالب دایکات</li><li>• تست نمونه فیزیکی پیش از تیراژ</li></ul></div>
            </section>
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><Info size={17} className="mt-0.5 shrink-0"/><p>این نسخه، هسته پارامتریک اولیه است و جایگزین تأیید قالب‌ساز یا استاندارد مهندسی نهایی نیست. برای تولید واقعی باید هندسه فلپ‌ها، اسلات‌ها، جهت فلوت و جبران ضخامت برای هر نوع کارتن جداگانه اعتبارسنجی شود.</p></div>
            {saved && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">فایل پروژه آماده شد.</div>}
          </main>
        </div>
      </div>
    </div>
  );
}
