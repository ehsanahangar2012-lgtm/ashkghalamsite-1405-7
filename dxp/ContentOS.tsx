import React from 'react';
import { Database } from 'lucide-react';
import { BlogManager, ContentManager } from '../components/AdminTools';

export const ContentOS = () => {
  return (
    <div className="bg-[#0f131c] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500"></div>
       <div className="p-6 border-b border-slate-800 flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
             <Database className="w-5 h-5 text-indigo-400" /> Content OS (Live Production Core)
           </h2>
           <p className="text-xs text-slate-400">سیستم واقعی مدیریت محتوا و جریان تولید مقاله.</p>
         </div>
       </div>

       <div className="p-6 space-y-12">
          <section>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">وبلاگ و بازاریابی محتوایی</h3>
            <BlogManager />
          </section>
          
          <section>
            <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">مدیریت محتوای پورتال</h3>
            <ContentManager />
          </section>
       </div>
    </div>
  );
};
