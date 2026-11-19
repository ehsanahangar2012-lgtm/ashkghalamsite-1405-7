import React, { useState, useEffect, useMemo } from 'react';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Button, Card, BackButton } from './UIComponents';
import { SmartHelpButton } from './SmartHelpModal';
import { Send, CheckCircle2, AlertCircle, Calculator, Layers, Sparkles, X } from 'lucide-react';
import { useContent } from '../contexts/ContentContext';
import { consumeInquiryPrefill } from '../utils/inquiryPrefill';

function parseDimensionsCm(dimStr: string): { l: number; w: number; h: number } {
  const normalized = dimStr
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[×*xX]/g, 'x');
  const nums = normalized
    .split(/[^0-9.]+/)
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n) && n > 0);
  return {
    l: nums[0] || 30,
    w: nums[1] || 20,
    h: nums[2] || 15,
  };
}

function parseQty(qtyStr: string): number {
  const normalized = qtyStr.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
  const n = parseInt(normalized.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) || n < 1 ? 1000 : n;
}

export const Inquiry: React.FC = () => {
  const { pricingFormula } = useContent();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prefillBanner, setPrefillBanner] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    boxType: 'کارتن چهار درب (FEFCO 0201)',
    fluteType: 'فلوت B (سه لایه استاندارد)',
    dimensions: '30x20x15',
    quantity: '1000',
    notes: '',
  });

  useEffect(() => {
    const prefill = consumeInquiryPrefill();
    if (prefill) {
      setFormData((prev) => ({
        ...prev,
        boxType: prefill.boxType || prev.boxType,
        fluteType: prefill.fluteType || prev.fluteType,
        dimensions: prefill.dimensions || prev.dimensions,
        quantity: prefill.quantity || prev.quantity,
        notes: prefill.notes || prev.notes,
      }));
      setPrefillBanner(prefill.sourceLabel || 'ساختار انتخاب‌شده از نمایشگر سه‌بعدی');
    }
  }, []);

  // Live sheet & pricing estimation from Admin pricingFormula
  const liveEstimate = useMemo(() => {
    const { l, w, h } = parseDimensionsCm(formData.dimensions);
    const qty = parseQty(formData.quantity);

    // Unfolded dieline blank dimensions in cm (with glue flap & dust flap allowances)
    const isHardbox = formData.boxType.includes('هاردباکس') || formData.boxType.includes('تلسکوپی');
    const blankW = isHardbox ? l + 2 * h + 4 : 2 * (l + w) + 3.5;
    const blankH = isHardbox ? w + 2 * h + 4 : w + h + 2.5;

    // Fit calculation on standard 100x70 cm offset sheet (with 1.5 cm gripper)
    const sheetW = 98.5;
    const sheetH = 68.5;
    const fitNormal = Math.floor(sheetW / Math.max(1, blankW)) * Math.floor(sheetH / Math.max(1, blankH));
    const fitRotated = Math.floor(sheetW / Math.max(1, blankH)) * Math.floor(sheetH / Math.max(1, blankW));
    const perSheet = Math.max(1, Math.max(fitNormal, fitRotated));
    const sheetsNeeded = Math.ceil((qty / perSheet) * 1.06); // +6% makeready waste

    const paperPrice = pricingFormula?.papers?.[0]?.weights?.[0]?.pricePerKg || 62000;
    const setupCost = pricingFormula?.defaultMachine?.setupCost || 450000;
    const profitMargin = pricingFormula?.profitMargin || 0.25;

    let boardFactor = 1.0;
    if (formData.fluteType.includes('BC')) boardFactor = 1.65;
    else if (formData.fluteType.includes('ایندربرد')) boardFactor = 1.35;
    else if (formData.fluteType.includes('C')) boardFactor = 1.2;

    if (isHardbox) boardFactor *= 1.85;

    const sheetAreaM2 = 0.7; // 70x100cm = 0.7m2
    const gsmWeightKg = formData.fluteType.includes('BC') ? 0.68 : 0.42;
    const rawBoardCost = sheetsNeeded * sheetAreaM2 * gsmWeightKg * paperPrice * boardFactor;
    const subtotal = rawBoardCost + setupCost + (qty * 850);
    const totalRial = Math.round(subtotal * (1 + profitMargin));
    const unitToman = Math.round(totalRial / Math.max(1, qty) / 10);

    return {
      blankW: Math.round(blankW * 10) / 10,
      blankH: Math.round(blankH * 10) / 10,
      perSheet,
      sheetsNeeded,
      totalRial,
      totalToman: Math.round(totalRial / 10),
      unitToman,
    };
  }, [formData.dimensions, formData.quantity, formData.boxType, formData.fluteType, pricingFormula]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      ...formData,
      estimatedTotalToman: liveEstimate.totalToman,
      shamsiDate: new Date().toLocaleDateString('fa-IR'),
    };

    const persistUserInquiry = (id: string) => {
      try {
        const list = JSON.parse(localStorage.getItem('ashk_user_inquiries') || '[]');
        list.unshift({
          id,
          ...payload,
          status: 'در صف بررسی فنی',
          createdAt: new Date().toISOString(),
        });
        localStorage.setItem('ashk_user_inquiries', JSON.stringify(list.slice(0, 30)));
      } catch {
        // ignore storage errors
      }
    };

    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const assignedId = data.id || `INQ-${Date.now()}`;
        persistUserInquiry(assignedId);
        setTrackingId(assignedId);
        setSubmitted(true);
      } else {
        throw new Error('خطا در ثبت سمت سرور');
      }
    } catch {
      const fallbackId = `INQ-OFF-${Date.now()}`;
      try {
        const saved = JSON.parse(localStorage.getItem('ashk_offline_inquiries') || '[]');
        saved.unshift({ id: fallbackId, ...payload, createdAt: new Date().toISOString() });
        localStorage.setItem('ashk_offline_inquiries', JSON.stringify(saved));
      } catch {
        // ignore storage errors
      }
      persistUserInquiry(fallbackId);
      setTrackingId(fallbackId);
      setSubmitted(true);
      setErrorMsg('حالت آفلاین فعال بود؛ استعلام شما با شماره پیگیری محلی ذخیره شد.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500';
  const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2';

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      <SeoHead
        view={AppView.INQUIRY}
        customTitle="استعلام قیمت و سفارش کارتن | اشک قلم"
        customDescription="محاسبه آنلاین قیمت کارتن، مقوا و دایکات بر اساس ابعاد، تیراژ و متریال در اشک قلم."
      />

      <div className="flex items-center justify-between mb-4">
        <BackButton label="بازگشت" fallbackPath="/" variant="auto" />
      </div>

      <div className="flex flex-col items-center text-center mb-8 relative">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-amber-600 dark:text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            ثبت واقعی استعلام تولید و قیمت‌گذاری
          </span>
          <SmartHelpButton
            sectionTitle="راهنمای ثبت استعلام قیمت"
            description="درخواست‌های این فرم مستقیماً در دیتابیس پنل مدیریت اشک قلم ثبت می‌شوند و برآورد لحظه‌ای شیت و قیمت هم‌زمان محاسبه می‌گردد."
            tips={[
              'ابعاد را بر حسب سانتی‌متر به صورت طول×عرض×ارتفاع وارد کنید (مثال: 30x20x15).',
              'برای کارتن‌های سنگین بالای ۵ کیلوگرم، ساختار چهار درب ۵ لایه (فلوت BC) مناسب‌تر است.',
              'کد پیگیری نمایش‌داده‌شده پس از ثبت را برای پیگیری در داشبورد یا واحد فروش نگه دارید.',
            ]}
          />
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
          ثبت استعلام قیمت تولید کارتن و جعبه
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg mx-auto">
          مشخصات فنی و تیراژ مورد نظر خود را وارد کنید تا چیدمان شیت و پیش‌برآورد مهندسی به‌صورت آنی محاسبه و در سیستم ثبت شود.
        </p>
      </div>

      {prefillBanner && !submitted && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              مشخصات فنی از <strong>{prefillBanner}</strong> به‌صورت خودکار در فرم بارگذاری شد.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setPrefillBanner(null)}
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white p-1 cursor-pointer"
            aria-label="بستن اعلان"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {submitted ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">استعلام شما با موفقیت ثبت شد</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto mb-4 leading-relaxed">
            شماره پیگیری سیستم: <span className="font-mono text-amber-600 dark:text-amber-400 font-bold" dir="ltr">{trackingId}</span>
            <br />
            تاریخ ثبت: <span className="text-slate-900 dark:text-slate-200 font-bold">{new Date().toLocaleDateString('fa-IR')}</span>
          </p>
          {errorMsg && (
            <div className="max-w-md mx-auto mb-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => {
              setSubmitted(false);
              setErrorMsg(null);
            }}
          >
            ثبت استعلام جدید
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <Card className="lg:col-span-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>نام و نام خانوادگی *</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="نام و نام خانوادگی"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>شماره همراه تماس *</label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912..."
                    dir="ltr"
                    className={`${inputClass} text-left font-mono`}
                  />
                </div>

                <div>
                  <label className={labelClass}>نام شرکت یا برند</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="نام کسب‌وکار یا کارخانه"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>نوع ساختار جعبه / کارتن</label>
                  <select
                    value={formData.boxType}
                    onChange={(e) => setFormData({ ...formData, boxType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="کارتن چهار درب (FEFCO 0201)">کارتن چهار درب (FEFCO 0201)</option>
                    <option value="جعبه کیبوردی قفل‌دار (FEFCO 0427)">جعبه کیبوردی قفل‌دار (FEFCO 0427)</option>
                    <option value="جعبه تلسکوپی درب و زیره (FEFCO 0301)">جعبه تلسکوپی درب و زیره (FEFCO 0301)</option>
                    <option value="هاردباکس مگنتی و لوکس">هاردباکس مگنتی و لوکس</option>
                    <option value="کارتن لمینتی با چاپ افست">کارتن لمینتی با چاپ افست</option>
                    <option value="جعبه پنجره‌دار و استند تبلیغاتی">جعبه پنجره‌دار و استند تبلیغاتی</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>نوع فلوت / متریال ورق</label>
                  <select
                    value={formData.fluteType}
                    onChange={(e) => setFormData({ ...formData, fluteType: e.target.value })}
                    className={inputClass}
                  >
                    <option value="فلوت E (ظریف و لمینتی)">فلوت E (ظریف و لمینتی)</option>
                    <option value="فلوت B (سه لایه استاندارد)">فلوت B (سه لایه استاندارد)</option>
                    <option value="فلوت C (سه لایه مقاوم)">فلوت C (سه لایه مقاوم)</option>
                    <option value="فلوت BC (پنج لایه سنگین صادراتی)">فلوت BC (پنج لایه سنگین صادراتی)</option>
                    <option value="مقوای ایندربرد / گلاسه">مقوای ایندربرد / گلاسه</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>ابعاد حدودی (طول × عرض × ارتفاع cm)</label>
                  <input
                    type="text"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    placeholder="30x20x15"
                    dir="ltr"
                    className={`${inputClass} text-left font-mono`}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>تیراژ سفارش (تعداد)</label>
                  <input
                    type="text"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="1000"
                    dir="ltr"
                    className={`${inputClass} text-left font-mono`}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>توضیحات تکمیلی یا نیاز به چاپ / لمینت</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="نوع محصول داخل جعبه، وزن تقریبی محصول، نیاز به سلفون یا یووی..."
                  className={inputClass}
                />
              </div>

              <Button type="submit" disabled={submitting} variant="primary" className="w-full py-3">
                <Send className="w-4 h-4 ml-2" />
                {submitting ? 'در حال ثبت در سرور...' : 'ثبت نهایی درخواست استعلام در اشک قلم'}
              </Button>
            </form>
          </Card>

          {/* Instant Live Cost & Sheet Imposition Card */}
          <Card className="lg:col-span-4 space-y-4 border-amber-500/30 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">برآورد مهندسی و شیت‌بندی آنی</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">محاسبه خودکار بر اساس نرخ روز ورق</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">ابعاد گسترده گستره (Blank):</span>
                <span className="font-mono font-bold text-slate-900 dark:text-slate-100" dir="ltr">
                  {liveEstimate.blankW} × {liveEstimate.blankH} cm
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">چیدمان در هر شیت ۷۰×۱۰۰:</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">{liveEstimate.perSheet.toLocaleString('fa-IR')} عدد</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">تعداد شیت مورد نیاز (+۶٪ پرت):</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">{liveEstimate.sheetsNeeded.toLocaleString('fa-IR')} برگ</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-200/70 dark:border-slate-800">
                <span className="text-slate-600 dark:text-slate-400">برآورد قیمت هر عدد:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {liveEstimate.unitToman.toLocaleString('fa-IR')} تومان
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-center">
              <span className="block text-[11px] text-slate-600 dark:text-slate-300 mb-1">برآورد کل تیراژ انتخابی:</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {liveEstimate.totalToman.toLocaleString('fa-IR')} تومان
              </span>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              <Layers className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>
                این عدد یک پیش‌برآورد اولیه بدون هزینه زینک اختصاصی و طلاکوب است؛ قیمت قطعی پس از بررسی فایل دایکات اعلام می‌شود.
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
