import React from 'react';
import { Search } from 'lucide-react';
import { SeoStudio } from '../components/AdminTools';

export const SeoIntelligence = () => {
  return (
    <div className="bg-[#0f131c] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"></div>
       <div className="p-6 border-b border-slate-800 flex justify-between items-center mb-6">
         <div>
           <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
             <Search className="w-5 h-5 text-emerald-400" /> SEO Intelligence (Live Production Core)
           </h2>
           <p className="text-xs text-slate-400">پنل تخصصی سئو و بهینه‌سازی موتورهای جستجو</p>
         </div>
       </div>

       <div className="px-6 pb-6">
         <SeoStudio />
       </div>
    </div>
  );
};
