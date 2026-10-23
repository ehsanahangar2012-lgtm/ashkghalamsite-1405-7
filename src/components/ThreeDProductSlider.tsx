import React, { useState } from 'react';
import { Card, Button } from './UIComponents';
import { ChevronRight, ChevronLeft, Box, Sparkles, Layers } from 'lucide-react';

interface SliderItem {
  id: string;
  title: string;
  fefco: string;
  description: string;
  dimensions: string;
  tags: string[];
}

const defaultItems: SliderItem[] = [
  {
    id: 'fefco-0201',
    title: 'کارتن چهار درب استاندارد (RSC)',
    fefco: 'FEFCO 0201',
    description: 'رایج‌ترین نوع کارتن حمل‌ونقل با قابلیت تولید سریع، حداقل ضایعات شیت و استقامت بالا.',
    dimensions: 'قابل تنظیم در استودیو CAD',
    tags: ['پرفروش‌ترین', 'اقتصادی', 'صادراتی']
  },
  {
    id: 'fefco-0427',
    title: 'جعبه کیبوردی خودبست (Roll End Tuck Front)',
    fefco: 'FEFCO 0427',
    description: 'ساختار یکپارچه بدون نیاز به چسب با استحکام دولایه در دیواره‌های جانبی.',
    dimensions: 'بهینه برای بسته‌های پستی',
    tags: ['ای‌کامرس', 'لوکس', 'دایکات روتاری']
  },
  {
    id: 'fefco-0301',
    title: 'جعبه تلسکوپی درب و زیره مجزا',
    fefco: 'FEFCO 0301',
    description: 'مناسب بسته‌بندی کفش، میوه صادراتی و هدایای تبلیغاتی با دسترسی آسان.',
    dimensions: 'شیت‌بندی دوتکه',
    tags: ['میوه صادراتی', 'شیک', 'تحمل بار زیاد']
  }
];

export const ThreeDProductSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = () => {
    setCurrentIndex((prev) => (prev === 0 ? defaultItems.length - 1 : prev - 1));
  };

  const next = () => {
    setCurrentIndex((prev) => (prev === defaultItems.length - 1 ? 0 : prev + 1));
  };

  const item = defaultItems[currentIndex];

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-mono text-amber-400 font-bold">{item.fefco}</span>
            <h3 className="text-lg font-black text-slate-100">{item.title}</h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-400 mb-4 leading-relaxed">{item.description}</p>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
        <div className="flex flex-wrap gap-1.5">
          {item.tags.map(tag => (
            <span key={tag} className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold border border-slate-700">
              {tag}
            </span>
          ))}
        </div>
        <span className="text-xs font-medium text-amber-400/90 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          {item.dimensions}
        </span>
      </div>
    </Card>
  );
};
