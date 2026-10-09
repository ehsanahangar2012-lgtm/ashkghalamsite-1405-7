import React, { useState } from 'react';
import { 
  Activity, Database, Globe, Search, ChevronRight, Image as ImageIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { ContentOS } from './ContentOS';
import { SeoIntelligence } from './SeoIntelligence';
import { EnterpriseDam } from './EnterpriseDam';

export const NexusDXP: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [activeModule, setActiveModule] = useState('content');

  const modules = [
    { id: 'content', name: 'موتور محتوا (Content OS)', icon: Database },
    { id: 'seo', name: 'هوش سئو (SEO Intelligence)', icon: Search },
    { id: 'dam', name: 'دارایی‌های دیجیتال (Enterprise DAM)', icon: ImageIcon },
  ];

  return (
    <div className="bg-[#020408] text-slate-200 h-[85vh] flex flex-col relative" dir="rtl">
      {/* Global DXP Header */}
      <header className="h-16 bg-[#0a0d14] border-b border-slate-800/80 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button 
              onClick={onBack}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-lg transition-colors flex items-center justify-center mr-[-8px]"
              title="بازگشت به منوی ادمین"
            >
              <div className="w-5 h-5 flex items-center justify-center font-bold">←</div>
            </button>
          )}
          <div className="bg-gradient-to-br from-indigo-500 to-sky-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
             <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white leading-tight">Nexus DXP</h1>
            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-medium">Enterprise Digital Experience Platform</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-slate-900 border border-slate-800 rounded-full text-xs font-mono text-slate-400">
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> SEO Crawler API: Online</span>
             <span className="w-px h-4 bg-slate-700"></span>
             <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Content Sync: Active</span>
           </div>
           <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2">
              <Globe className="w-4 h-4" /> انتشار سراسری
           </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Deep Navigation Module */}
        <aside className="w-72 bg-[#0a0d14] border-l border-slate-800/80 flex flex-col hide-scrollbar overflow-y-auto shrink-0 relative z-10 shadow-2xl">
           <div className="p-6">
             <div className="bg-[#0f131c] border border-slate-800 rounded-xl p-3 flex items-center gap-3 text-sm text-slate-400 shadow-inner">
               <Search className="w-4 h-4 text-slate-500" />
               <input type="text" placeholder="جستجوی سریع..." className="bg-transparent border-none outline-none w-full text-slate-200 placeholder-slate-600" />
             </div>
           </div>

           <div className="px-6 pb-2 uppercase text-[10px] font-black tracking-widest text-slate-600">Core Architecture</div>
           <nav className="flex flex-col gap-1 px-4 my-2">
             {modules.map(mod => (
               <button 
                 key={mod.id}
                 onClick={() => setActiveModule(mod.id)}
                 className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all group ${activeModule === mod.id ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-inner' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'}`}
               >
                 <span className="flex items-center gap-3 font-medium">
                   <mod.icon className={`w-4 h-4 ${activeModule === mod.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                   {mod.name}
                 </span>
                 {activeModule === mod.id && <ChevronRight className="w-4 h-4 text-indigo-400/50" />}
               </button>
             ))}
           </nav>
           
           {/* System Health */}
           <div className="mt-auto p-6 border-t border-slate-800/80">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2 mb-3">
                  <Database className="w-3 h-3 text-emerald-400" /> وضعیت کلاستر
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Index Health</span>
                      <span className="text-emerald-400">99.9%</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full"><div className="h-full bg-emerald-500 w-[99.9%] rounded-full"></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Content Delivery</span>
                      <span className="text-sky-400">12ms</span>
                    </div>
                    <div className="h-1 bg-slate-800 rounded-full"><div className="h-full bg-sky-500 w-[85%] rounded-full"></div></div>
                  </div>
                </div>
              </div>
           </div>
        </aside>

        {/* Dynamic Context Canvas */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-[#020408] to-[#020408] pointer-events-none"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            {/* Dynamic Rendering of DXP Sub-modules */}
            <AnimatePresence mode="wait">
              {activeModule === 'content' && (
                <motion.div key="content" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <ContentOS />
                </motion.div>
              )}
              {activeModule === 'seo' && (
                <motion.div key="seo" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <SeoIntelligence />
                </motion.div>
              )}
              {activeModule === 'dam' && (
                <motion.div key="dam" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <EnterpriseDam />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};
