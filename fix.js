const fs = require('fs');
let code = fs.readFileSync('components/DielineGenerator.tsx', 'utf8');

const replacement = `                            <button
                              type="button"
                              onClick={() => {
                                  setFoldRatio(0.0);
                                  animDirectionRef.current = 'forward';
                              }}
                              className="px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer text-[10px] bg-[#121c2c] hover:bg-slate-800 text-sky-450 border border-sky-950"
                            >
                                <>
                                  <Play className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                                  <span className="font-sans font-black text-sky-200">شبیه‌سازی فرآیند تا</span>
                                </>
                            </button>`;

code = code.replace(/<button[\s\S]*?onClick=\{\(\) => \{[\s\S]*?setFoldRatio\(0\.0\);[\s\S]*?animDirectionRef\.current = 'forward';[\s\S]*?\}[\s\S]*?\}\}[\s\S]*?className=\{`px-3 py-1\.5 rounded-lg font-bold transition-all flex items-center gap-1\.5 cursor-pointer text-\[10px\] \$\{[\s\S]*?\? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950\/30' [\s\S]*?: 'bg-\[#121c2c\] hover:bg-slate-800 text-sky-450 border border-sky-950'[\s\S]*?\}`\}[\s\S]*?>[\s\S]*?<>[\s\S]*?<Pause className="w-3\.5 h-3\.5 text-white shrink-0 animate-pulse" \/>[\s\S]*?<span>توقف فرآیند<\/span>[\s\S]*?<\/>[\s\S]*?\) : \([\s\S]*?<>[\s\S]*?<Play className="w-3\.5 h-3\.5 text-sky-300 shrink-0" \/>[\s\S]*?<span className="font-sans font-black text-sky-200">شبیه‌سازی فرآیند تا<\/span>[\s\S]*?<\/>[\s\S]*?\)[\s\S]*?<\/button>/, replacement);

fs.writeFileSync('components/DielineGenerator.tsx', code);
