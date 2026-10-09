import React, { useState } from 'react';
import { Plus, Trash2, Save, X, Tag, ShoppingBag, MessageSquare, Video, Phone, ExternalLink, HelpCircle } from 'lucide-react';
import { CatalogPage, CatalogHotspot, HotspotType } from '../../types/catalog';

interface CatalogHotspotEditorProps {
  page: CatalogPage;
  pageIndex: number;
  onSaveHotspots: (pageIndex: number, hotspots: CatalogHotspot[]) => void;
  onClose: () => void;
}

export const CatalogHotspotEditor: React.FC<CatalogHotspotEditorProps> = ({
  page,
  pageIndex,
  onSaveHotspots,
  onClose
}) => {
  const [hotspots, setHotspots] = useState<CatalogHotspot[]>(page.hotspots || []);
  const [selectedHotspot, setSelectedHotspot] = useState<CatalogHotspot | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const newHotspot: CatalogHotspot = {
      id: `hs_${Date.now()}`,
      pageIndex,
      x,
      y,
      type: 'product',
      title: 'عنوان محصول هوشمند',
      subtitle: 'مشخصات اولیه',
      price: 'استعلام قیمت',
      description: 'توضیحات تکمیلی محصول یا ساختار جعبه'
    };

    setHotspots(prev => [...prev, newHotspot]);
    setSelectedHotspot(newHotspot);
  };

  const handleUpdateHotspot = (updated: CatalogHotspot) => {
    setHotspots(prev => prev.map(hs => hs.id === updated.id ? updated : hs));
    setSelectedHotspot(updated);
  };

  const handleDeleteHotspot = (id: string) => {
    setHotspots(prev => prev.filter(hs => hs.id !== id));
    if (selectedHotspot?.id === id) setSelectedHotspot(null);
  };

  const handleSave = () => {
    onSaveHotspots(pageIndex, hotspots);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 font-sans text-slate-100">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col md:flex-row max-h-[90vh] overflow-hidden">
        
        {/* Left Interactive Page Canvas */}
        <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center relative overflow-auto border-b md:border-b-0 md:border-l border-slate-800">
          <div className="text-xs text-amber-400 mb-2 font-bold flex items-center gap-1.5">
            <span>برای افزودن هات اسپات تعاملی رو نقطه دلخواه برگه کلیک کنید</span>
          </div>

          <div
            onClick={handleImageClick}
            className="relative cursor-crosshair max-w-full max-h-[70vh] border-2 border-slate-700/60 rounded-xl overflow-hidden shadow-2xl group"
          >
            <img
              src={page.imageUrl}
              alt={`Page ${page.pageNumber}`}
              className="max-h-[70vh] object-contain select-none"
            />

            {/* Hotspot Markers */}
            {hotspots.map((hs) => (
              <div
                key={hs.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedHotspot(hs);
                }}
                style={{ top: `${hs.y}%`, left: `${hs.x}%` }}
                className={`absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-200 border-2 border-white ${
                  selectedHotspot?.id === hs.id
                    ? 'bg-amber-400 text-slate-950 scale-125 ring-4 ring-amber-500/50'
                    : 'bg-amber-500 text-white hover:scale-110'
                }`}
              >
                <span className="text-xs font-bold font-sans">✚</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Inspector & Form Panel */}
        <div className="w-full md:w-96 p-6 bg-slate-900 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">ویرایشگر هات اسپات تعاملی</h3>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedHotspot ? (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">نوع نقطه تعاملی</label>
                  <select
                    value={selectedHotspot.type}
                    onChange={(e) => handleUpdateHotspot({ ...selectedHotspot, type: e.target.value as HotspotType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                  >
                    <option value="product">محصول (کالا / کد / قیمت)</option>
                    <option value="quote">استعلام قیمت آنلاین (واتساپ / تلفن)</option>
                    <option value="video">ویدیو معرفی (آپارات / یوتیوب)</option>
                    <option value="audio">توضیح صوتی (صدا)</option>
                    <option value="view360">نمای ۳۶۰ درجه</option>
                    <option value="link">لینک وب‌سایت</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">عنوان اصلی</label>
                  <input
                    type="text"
                    value={selectedHotspot.title}
                    onChange={(e) => handleUpdateHotspot({ ...selectedHotspot, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">زیرعنوان / کد محصول</label>
                  <input
                    type="text"
                    value={selectedHotspot.subtitle || ''}
                    onChange={(e) => handleUpdateHotspot({ ...selectedHotspot, subtitle: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">قیمت / شرایط سفارش</label>
                  <input
                    type="text"
                    value={selectedHotspot.price || ''}
                    onChange={(e) => handleUpdateHotspot({ ...selectedHotspot, price: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">توضیحات تکمیلی</label>
                  <textarea
                    rows={3}
                    value={selectedHotspot.description || ''}
                    onChange={(e) => handleUpdateHotspot({ ...selectedHotspot, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={() => handleDeleteHotspot(selectedHotspot.id)}
                  className="flex items-center gap-2 text-rose-400 hover:text-rose-300 font-bold py-2"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف این هات اسپات
                </button>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                <p>روی تصویر برگه کلیک کنید تا هات اسپات جدید ایجاد شود، یا روی هات اسپات موجود کلیک کنید تا مشخصات آن را تغییر دهید.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              <Save className="w-4 h-4" />
              ذخیره نقاط تعاملی برگه
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
