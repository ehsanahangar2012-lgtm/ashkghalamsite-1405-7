const fs = require('fs');

let content = fs.readFileSync('components/CatalogUploadStudio.tsx', 'utf8');

// Insert State Variables
const stateVars = `
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
`;
content = content.replace('const [pdfMeta, setPdfMeta] = useState<{ name: string; size: string; pagesCount: number } | null>(null);', 'const [pdfMeta, setPdfMeta] = useState<{ name: string; size: string; pagesCount: number } | null>(null);' + stateVars);

// Insert Handler Functions
const handlerFuncs = `
  const handleAnalyzeCatalog = async () => {
    if (pages.length === 0) {
      setErrorMessage('ابتدا حداقل یک صفحه بارگذاری کنید.');
      return;
    }
    setIsAnalyzing(true);
    setErrorMessage('');
    
    try {
      const imagesToAnalyze = pages.slice(0, 3).map(p => p.url);
      const res = await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/api/analyze-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: imagesToAnalyze })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'خطا در برقراری ارتباط با سرویس هوش مصنوعی');
      }
      
      const data = await res.json();
      setAiAnalysisResult(data.data);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'خطا در آنالیز تصاویر');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiAnalysis = () => {
    if (aiAnalysisResult) {
      if (aiAnalysisResult.title) setTitle(aiAnalysisResult.title);
      if (aiAnalysisResult.description) setDescription(aiAnalysisResult.description);
      if (aiAnalysisResult.category) setCategory(aiAnalysisResult.category);
    }
  };
`;
content = content.replace('// Process Batch Images with WebP Engine & Auto-Chapter Translation', handlerFuncs + '\n  // Process Batch Images with WebP Engine & Auto-Chapter Translation');

// Insert JSX Component
const jsxBlock = `
          {/* AI Analysis Panel */}
          {pages.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/30 rounded-xl p-5 relative overflow-hidden mt-6 shadow-lg shadow-indigo-500/10">
              <div className="absolute top-0 left-0 p-3 opacity-20 pointer-events-none transform -scale-x-100">
                <Sparkles className="w-32 h-32 text-indigo-400" />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row gap-5 items-start">
                <div className="flex-1 space-y-3">
                  <h3 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-400" />
                    آنالیز هوشمند محتوای کاتالوگ (Google Gemini)
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                    با استفاده از هوش مصنوعی، کاتالوگ بارگذاری شده به طور کامل بررسی شده و اطلاعاتی مانند نام دقیق کاتالوگ، دسته‌بندی و چکیده محتوا به صورت اتوماتیک استخراج می‌گردد.
                  </p>
                  
                  {aiAnalysisResult && (
                    <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-4 mt-4 space-y-3">
                      <div><span className="text-slate-400 text-xs">عنوان پیشنهادی:</span> <span className="text-white text-sm font-bold mr-2">{aiAnalysisResult.title}</span></div>
                      <div><span className="text-slate-400 text-xs">توضیحات:</span> <span className="text-slate-200 text-xs leading-relaxed block mt-1">{aiAnalysisResult.description}</span></div>
                      {aiAnalysisResult.highlights && aiAnalysisResult.highlights.length > 0 && (
                        <div className="pt-2 border-t border-slate-700/50">
                          <span className="text-slate-400 text-xs block mb-2">ویژگی‌های برجسته:</span>
                          <ul className="list-disc list-inside text-indigo-200 text-xs space-y-1.5">
                            {aiAnalysisResult.highlights.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-[180px] w-full md:w-auto">
                  <button
                    onClick={handleAnalyzeCatalog}
                    disabled={isAnalyzing}
                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                  >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isAnalyzing ? 'در حال پردازش...' : 'آنالیز تصاویر'}
                  </button>
                  {aiAnalysisResult && (
                    <button
                      onClick={applyAiAnalysis}
                      className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 text-xs font-bold rounded-xl transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      اعمال به فرم ثبت
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
`;
content = content.replace('{/* Metadata Inputs */}', jsxBlock + '\n          {/* Metadata Inputs */}');

fs.writeFileSync('components/CatalogUploadStudio.tsx', content, 'utf8');
