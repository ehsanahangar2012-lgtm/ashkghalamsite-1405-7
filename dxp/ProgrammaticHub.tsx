import React from 'react';
import { Zap, Globe, Package, MapPin, Search, LayoutTemplate } from 'lucide-react';

export const ProgrammaticHub = () => {
  return (
    <div className="bg-[#0f131c] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px]">
       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-rose-500"></div>
       <div className="p-6 border-b border-slate-800 flex justify-between items-center">
         <div>
           <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
             <Zap className="w-5 h-5 text-orange-400" /> Programmatic SEO Engine
           </h2>
           <p className="text-xs text-slate-400">Scale hyper-targeted landing pages with semantic permutations.</p>
         </div>
       </div>
       
       <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Live Templates */}
         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
           <h3 className="text-sm font-semibold text-white mb-4 border-b border-slate-800 pb-2">Active Permutation Matrices</h3>
           
           <div className="space-y-4">
             <div className="bg-[#0a0d14] border border-slate-700/50 rounded-xl p-4">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="text-sm font-bold text-white flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-orange-400" /> Product x Location</h4>
                 <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">LIVE</span>
               </div>
               <p className="text-xs font-mono text-slate-400 mb-2">/packaging-for-{"{product}"}-in-{"{location}"}</p>
               <div className="flex gap-4 mt-3">
                 <div className="text-xs text-slate-500"><span className="text-slate-300 font-bold">14</span> Products</div>
                 <div className="text-xs text-slate-500"><span className="text-slate-300 font-bold">31</span> Provinces</div>
                 <div className="text-xs text-sky-400 font-mono font-bold">= 434 Pages</div>
               </div>
             </div>

             <div className="bg-[#0a0d14] border border-slate-700/50 rounded-xl p-4 opacity-70">
               <div className="flex justify-between items-start mb-2">
                 <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-slate-500" /> Material x Style</h4>
                 <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-bold">DRAFT</span>
               </div>
               <p className="text-xs font-mono text-slate-500 mb-2">/{"{style}"}-boxes-made-of-{"{material}"}</p>
             </div>
           </div>
         </div>

         <div className="space-y-6">
           {/* Indexing Status */}
           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-sm font-semibold text-white mb-4">Search Engine Indexing</h3>
             <div className="flex gap-4">
               <div className="flex-1 bg-[#0a0d14] border border-slate-800 rounded-xl p-4 text-center">
                 <span className="block text-2xl font-black text-emerald-400">412</span>
                 <span className="text-[10px] text-slate-500 uppercase tracking-widest">Indexed</span>
               </div>
               <div className="flex-1 bg-[#0a0d14] border border-slate-800 rounded-xl p-4 text-center">
                 <span className="block text-2xl font-black text-slate-300">22</span>
                 <span className="text-[10px] text-slate-500 uppercase tracking-widest">Pending</span>
               </div>
             </div>
           </div>

           {/* Variable DB */}
           <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
             <h3 className="text-sm font-semibold text-white mb-4">Semantic Variables DB</h3>
             <div className="flex flex-wrap gap-2">
               <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded flex items-center gap-1"><Package className="w-3 h-3 text-orange-400"/> Products DB</span>
               <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded flex items-center gap-1"><MapPin className="w-3 h-3 text-sky-400"/> Locations DB</span>
               <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded flex items-center gap-1"><Globe className="w-3 h-3 text-rose-400"/> Intents DB</span>
             </div>
           </div>

         </div>
       </div>
    </div>
  );
};
