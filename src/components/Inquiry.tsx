import React, { useState } from 'react';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';
import { Button, Card } from './UIComponents';
import { Calculator, Send, CheckCircle2, Package, Layers, Sparkles } from 'lucide-react';

export const Inquiry: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    company: '',
    boxType: 'کارتن چهار درب (FEFCO 0201)',
    fluteType: 'فلوت B',
    dimensions: '30x20x15',
    quantity: '1000',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 font-sans">
      <SeoHead
        view={AppView.INQUIRY}
        customTitle="استعلام قیمت و سفارش کارتن | اشک قلم"
        customDescription="محاسبه آنلاین قیمت کارتن، مقوا و دایکات بر اساس ابعاد، تیراژ و متریال در اشک قلم."
      />

      <div className="text-center mb-8">
        <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
          استعلام آنلاین و سریع
        </span>
        <h1 className="text-3xl font-black text-slate-100 mt-3 mb-2">ثبت استعلام قیمت تولید کارتن و جعبه</h1>
        <p className="text-slate-400 text-sm max-w-lg mx-auto">
          مشخصات فنی و تیراژ مورد نظر خود را وارد کنید تا کارشناسان اشک قلم پیش‌فاکتور رسمی را ارسال کنند.
        </p>
      </div>

      {submitted ? (
        <Card className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">استعلام شما با موفقیت ثبت شد</h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
            شماره پیگیری: <span className="font-mono text-amber-400 font-bold">AG-{Math.floor(100000 + Math.random() * 900000)}</span>
            <br />
            کارشناسان واحد برآورد قیمت اشک قلم ظرف ۲ ساعت آینده با شماره شما تماس خواهند گرفت.
          </p>
          <Button variant="primary" onClick={() => setSubmitted(false)}>
            ثبت استعلام جدید
          </Button>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نام و نام خانوادگی *</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: مهندس احمدی"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">شماره همراه تماس *</label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="۰۹۱۲..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نام شرکت یا برند</label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="مثال: صنایع غذایی نوین"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">نوع ساختار جعبه / کارتن</label>
                <select
                  value={formData.boxType}
                  onChange={(e) => setFormData({ ...formData, boxType: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option>کارتن چهار درب (FEFCO 0201)</option>
                  <option>جعبه کیبوردی قفل‌دار (FEFCO 0427)</option>
                  <option>جعبه تلسکوپی درب و زیره (FEFCO 0301)</option>
                  <option>کارتن لمینتی با چاپ افست</option>
                  <option>استند تبلیغاتی رومیزی</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">ابعاد حدودی (طول × عرض × ارتفاع cm)</label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                  placeholder="مثال: 30x20x15"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">تیراژ سفارش</label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="مثال: ۱۰۰۰ عدد"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">توضیحات تکمیلی یا نیاز به چاپ / لمینت</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="نوع محصول داخل جعبه، وزن تقریبی محصول، نیاز به سلفون یا یووی..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full py-3">
              <Send className="w-4 h-4 ml-2" />
              ارسال درخواست استعلام به اشک قلم
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
};
