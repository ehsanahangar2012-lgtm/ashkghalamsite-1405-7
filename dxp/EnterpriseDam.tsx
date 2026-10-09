import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MediaManager } from '../components/AdminTools';

export const EnterpriseDam = () => {
  return (
    <div className="bg-[#0f131c] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 to-indigo-500"></div>
       <div className="p-6 border-b border-slate-800 flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
             <ImageIcon className="w-5 h-5 text-sky-400" /> Enterprise DAM (Live Asset Core)
           </h2>
           <p className="text-xs text-slate-400">سیستم مدیریت دارایی‌های دیجیتال و مخزن مدیا با اتصال مستقیم.</p>
         </div>
       </div>

       <div className="p-6">
         <MediaManager />
       </div>
    </div>
  );
};
