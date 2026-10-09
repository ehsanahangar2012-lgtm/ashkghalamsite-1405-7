import re

with open('components/DielineGenerator.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "Floating CAD Camera Presets Selector" in line:
        start_idx = i
    if "Folding simulation controls" in line:
        end_idx = i

if start_idx != -1 and end_idx != -1:
    new_ui = '''
                    {/* Unified 3D Toolbox (Right side) */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 bg-[#0c1015]/90 backdrop-blur-md p-2 rounded-2xl border border-slate-700/80 shadow-2xl" dir="rtl">
                      {/* Camera Angles */}
                      <div className="flex flex-col gap-1.5 pb-2 border-b border-slate-700/50">
                        <span className="text-[8.5px] font-black text-slate-400 text-center select-none tracking-wider font-sans uppercase">زاویه دید</span>
                        <button onClick={() => setViewAngle('perspective')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'perspective' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="پرسپکتیو"><Rotate3d className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setViewAngle('front')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'front' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="روبرو"><Box className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setViewAngle('top')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'top' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="بالا"><ArrowDownToLine className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setViewAngle('side')} className={`p-2 rounded-xl transition-all border ${viewAngle === 'side' ? 'bg-indigo-600 border-indigo-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="بغل"><Layers3 className="w-4 h-4 mx-auto" /></button>
                      </div>

                      {/* Display Modes */}
                      <div className="flex flex-col gap-1.5 pt-1 pb-2 border-b border-slate-700/50">
                        <span className="text-[8.5px] font-black text-slate-400 text-center select-none tracking-wider font-sans uppercase">نمایش</span>
                        <button onClick={() => setWireframe(!wireframe)} className={`p-2 rounded-xl transition-all border ${wireframe ? 'bg-emerald-600 border-emerald-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="فریم لاین / اسکتچ (Wireframe)"><Eye className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setIsExploded(!isExploded)} className={`p-2 rounded-xl transition-all border ${isExploded ? 'bg-amber-600 border-amber-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="نمای انفجاری (Exploded View)"><Maximize className="w-4 h-4 mx-auto" /></button>
                        <button onClick={() => setAutoRotate(!autoRotate)} className={`p-2 rounded-xl transition-all border ${autoRotate ? 'bg-sky-600 border-sky-400 text-white shadow-md' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`} title="چرخش خودکار (Auto Rotate)"><RefreshCw className="w-4 h-4 mx-auto" /></button>
                      </div>

                      {/* Reset */}
                      <div className="flex flex-col gap-1.5 pt-1">
                        <button onClick={() => setResetTrigger(prev => prev + 1)} className="p-2 rounded-xl transition-all border bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-900 hover:text-white" title="بازنشانی دوربین (Reset Camera)"><Camera className="w-4 h-4 mx-auto" /></button>
                      </div>
                    </div>

                    {/* Unified Environment Toolbox (Left side) */}
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-3 bg-[#0c1015]/90 backdrop-blur-md p-3 rounded-2xl border border-slate-700/80 shadow-2xl w-52" dir="rtl">
                      {/* Lighting */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5">
                          <Flame className="w-4 h-4 text-amber-400" />
                          <span className="text-[10px] font-bold text-white font-sans">شدت نورپردازی</span>
                        </div>
                        <input 
                          type="range" min="0.2" max="3" step="0.1" 
                          value={lightIntensity} 
                          onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-amber-500"
                        />
                      </div>

                      {/* Effects */}
                      <div className="flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                        <span className="text-[9px] font-black text-slate-400 font-sans uppercase">افکت چاپ</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { id: 'none', label: 'ساده' },
                            { id: 'gold_foil', label: 'طلاکوب' },
                            { id: 'uv_spot', label: 'UV' },
                            { id: 'both', label: 'ترکیبی' }
                          ].map(eff => (
                            <button
                              key={eff.id}
                              onClick={() => setSpecialEffect(eff.id as any)}
                              className={`py-1.5 rounded-lg text-[9px] font-bold border transition-all cursor-pointer ${specialEffect === eff.id ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'}`}
                            >
                              {eff.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Texture */}
                      <div className="flex flex-col gap-2 border-t border-slate-700/50 pt-2">
                        <span className="text-[9px] font-black text-slate-400 font-sans uppercase">بافت طرح</span>
                        <input type="file" ref={fileInputRef} onChange={handleTextureUpload} accept="image/*" className="hidden" />
                        {textureUrl ? (
                          <div className="flex items-center justify-between bg-slate-900/50 border border-indigo-500/30 p-1.5 rounded-lg">
                            <img src={textureUrl} alt="Skin" className="w-6 h-6 rounded object-cover" />
                            <button onClick={() => setTextureUrl(null)} className="p-1 text-rose-400 hover:text-rose-300"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => fileInputRef.current?.click()} className="w-full py-1.5 rounded-lg border border-dashed border-slate-600 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-[9px] font-bold flex items-center justify-center gap-1">
                            <Upload className="w-3 h-3" /> طرح دلخواه
                          </button>
                        )}
                      </div>

                      {/* PDF output settings and line thickness (Relocated) */}
                      <div className="mt-2 pt-3 border-t border-slate-700/50 space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1.5 flex justify-between items-center font-sans">
                            <span>کیفیت خروجی نقشه (PDF)</span>
                            <span className="text-[9px] font-mono text-emerald-400">{pdfQuality === 'high' ? 'عالی' : 'استاندارد'}</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                            <button onClick={() => setPdfQuality('standard')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${pdfQuality === 'standard' ? 'bg-[#1f2d42] text-white font-black' : 'text-slate-550 hover:bg-[#1f2d42]/30'}`}>150 DPI</button>
                            <button onClick={() => setPdfQuality('high')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${pdfQuality === 'high' ? 'bg-[#1f2d42] text-white font-black' : 'text-slate-550 hover:bg-[#1f2d42]/30'}`}>300 DPI</button>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1.5 flex justify-between items-center font-sans">
                            <span>ضخامت خطوط</span>
                            <span className="text-[9px] font-mono text-sky-405">{lineWidthStyle === 'bold' ? 'ضخیم' : 'ظریف'}</span>
                          </label>
                          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
                            <button onClick={() => setLineWidthStyle('standard')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${lineWidthStyle === 'standard' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-900'}`}>معمولی</button>
                            <button onClick={() => setLineWidthStyle('bold')} className={`py-1 rounded-lg text-[9px] font-bold transition-all cursor-pointer ${lineWidthStyle === 'bold' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:bg-slate-900'}`}>ضخیم</button>
                          </div>
                        </div>
                      </div>
                    </div>

'''
    
    new_lines = lines[:start_idx] + [new_ui] + lines[end_idx:]
    with open('components/DielineGenerator.tsx', 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print("Patched successfully")
else:
    print(f"Could not find indices: {start_idx}, {end_idx}")
