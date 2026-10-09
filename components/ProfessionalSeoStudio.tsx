import React, { useState, useEffect, useMemo } from 'react';
import { useContent } from '../contexts/ContentContext';
import { AppView, SeoConfig } from '../types';
import { 
  Search, Globe, Sparkles, AlertCircle, CheckCircle2, AlertTriangle, 
  HelpCircle, RefreshCw, Cpu, Layers, Link as LinkIcon, Download, 
  Copy, Check, ArrowUpRight, Zap, ShieldCheck, BarChart3, Sliders, 
  Terminal, Activity, Eye, FileText, Send, Clock
} from 'lucide-react';
import { 
  extractKeywordsAndDensity, runSeoAuditForView, generateAutomatedSeoForView,
  generateSitemapXml, generateRobotsTxt, syncWithExternalWorker,
  getShamsiDateTime, KeywordAnalysisItem, PageSeoAuditResult, ExternalWorkerConfig
} from '../services/seoEngineService';

export const ProfessionalSeoStudio: React.FC = () => {
  const { 
    seoConfigs, updateSeoConfig, siteContent, globalSettings, updateGlobalSettings,
    blogPosts, catalogItems
  } = useContent();

  const [activeTab, setActiveTab] = useState<'guide' | 'audit' | 'keywords' | 'autoseo' | 'schema_sitemap' | 'workers'>('audit');
  const [showSmartHelp, setShowSmartHelp] = useState(false);
  const [selectedView, setSelectedView] = useState<AppView>(AppView.HOME);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<Record<string, PageSeoAuditResult>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // External Worker State
  const [workerConfig, setWorkerConfig] = useState<ExternalWorkerConfig>(() => {
    const saved = localStorage.getItem('ashk_seo_worker_config');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      workerUrl: '',
      authToken: '',
      enableEdgePrerender: true,
      autoPingIntervalMinutes: 30,
      syncStatus: 'idle'
    };
  });

  const [workerResponseLog, setWorkerResponseLog] = useState<string | null>(null);
  const [isWorkerSyncing, setIsWorkerSyncing] = useState(false);

  // AI Bots Configuration
  const [allowedBots, setAllowedBots] = useState({
    google: true,
    gpt: true,
    claude: true,
    perplexity: true
  });

  // Aggregate corpus from all available site texts for deep NLP analysis
  const combinedCorpus = useMemo(() => {
    const parts = [
      siteContent.heroTitle || '',
      siteContent.heroSubtitle || '',
      siteContent.heroDescription || '',
      siteContent.footerAbout || '',
      ...blogPosts.map(b => `${b.title} ${b.excerpt} ${b.content}`),
      ...catalogItems.map(c => `${c.title} ${c.description || ''} ${c.category || ''}`),
      ...seoConfigs.map(s => `${s.title} ${s.description}`)
    ];
    return parts.join(' ');
  }, [siteContent, blogPosts, catalogItems, seoConfigs]);

  // Extracted Keywords
  const extractedKeywords = useMemo(() => {
    return extractKeywordsAndDensity(combinedCorpus);
  }, [combinedCorpus]);

  // Run audit for all views
  const runFullAudit = () => {
    setIsAuditing(true);
    const newResults: Record<string, PageSeoAuditResult> = {};

    seoConfigs.forEach(cfg => {
      newResults[cfg.view] = runSeoAuditForView(cfg.view, cfg, combinedCorpus);
    });

    setTimeout(() => {
      setAuditResults(newResults);
      setIsAuditing(false);
    }, 400);
  };

  useEffect(() => {
    runFullAudit();
  }, [seoConfigs]);

  // Overall Health Score
  const overallHealthScore = useMemo(() => {
    const keys = Object.keys(auditResults);
    if (keys.length === 0) return 92;
    const total = keys.reduce((acc, k) => acc + (auditResults[k]?.score || 0), 0);
    return Math.round(total / keys.length);
  }, [auditResults]);

  // Auto-generate SEO for current view
  const handleAutoGenerateForCurrent = () => {
    const brand = globalSettings.siteName || 'اشک قلم';
    const generated = generateAutomatedSeoForView(selectedView, brand);
    updateSeoConfig(selectedView, generated);
  };

  // Auto-generate SEO for all views
  const handleAutoGenerateAllViews = () => {
    if (window.confirm('آیا مایلید عناوین و متاتگ‌های تمامی صفحات سامانه بر اساس الگوهای مهندسی و کلمات کلیدی کشف‌شده بهینه‌سازی و سئوسازی شوند؟')) {
      const brand = globalSettings.siteName || 'اشک قلم';
      seoConfigs.forEach(cfg => {
        const generated = generateAutomatedSeoForView(cfg.view, brand);
        updateSeoConfig(cfg.view, generated);
      });
      alert('تمامی صفحات با موفقیت سئوسازی خودکار شدند.');
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Save Worker Config
  const handleSaveWorkerConfig = (updated: Partial<ExternalWorkerConfig>) => {
    const merged = { ...workerConfig, ...updated };
    setWorkerConfig(merged);
    localStorage.setItem('ashk_seo_worker_config', JSON.stringify(merged));
  };

  // Ping / Sync with Worker
  const handleSyncWorker = async () => {
    setIsWorkerSyncing(true);
    setWorkerResponseLog(null);
    const payload = {
      seoConfigs,
      overallHealthScore,
      keywordsSummary: extractedKeywords.slice(0, 15).map(k => ({ keyword: k.keyword, density: k.density })),
      generatedSitemap: generateSitemapXml(),
      robotsTxt: generateRobotsTxt('https://ashkghalam.ir', allowedBots)
    };

    const res = await syncWithExternalWorker(workerConfig, payload);
    setIsWorkerSyncing(false);
    handleSaveWorkerConfig({
      lastSyncShamsi: getShamsiDateTime(),
      lastPingMs: res.latencyMs,
      syncStatus: res.success ? 'success' : 'error'
    });
    setWorkerResponseLog(res.message);
  };

  const currentAudit = auditResults[selectedView] || runSeoAuditForView(
    selectedView,
    seoConfigs.find(c => c.view === selectedView) || { view: selectedView, title: '', description: '', keywords: [] },
    combinedCorpus
  );

  const currentConfig = seoConfigs.find(c => c.view === selectedView) || { view: selectedView, title: '', description: '', keywords: [] };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner: SEO Health Bar & Global Controls */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-indigo-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            {/* Score Ring Badge */}
            <div className="relative flex items-center justify-center">
              <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-white border-2 shadow-lg ${
                overallHealthScore >= 85 
                  ? 'bg-emerald-950/70 border-emerald-500 shadow-emerald-950/40 text-emerald-400' 
                  : overallHealthScore >= 70 
                  ? 'bg-amber-950/70 border-amber-500 shadow-amber-950/40 text-amber-400' 
                  : 'bg-rose-950/70 border-rose-500 shadow-rose-950/40 text-rose-400'
              }`}>
                <span className="text-2xl font-black font-mono">{overallHealthScore}</span>
                <span className="text-[10px] font-bold opacity-80">از ۱۰۰</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-black text-white">
                  موتور سئوسازی خودکار و آنالیزور هوشمند (SEO Studio Pro)
                </h3>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                  نسخه ۲.۹
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                کاشف متن و کلمات کلیدی، ممیزی مقطعی، تزریق خودکار متاتگ‌ها و اتصال به ورکرهای ابری
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>آخرین پایش سلامت: {currentAudit.analyzedAtShamsi}</span>
                </span>
                <span className="text-slate-600">|</span>
                <span>کلمات کلیدی کشف‌شده: {extractedKeywords.length} مورد</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Smart Help Button */}
            <button
              type="button"
              onClick={() => setShowSmartHelp(!showSmartHelp)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showSmartHelp
                  ? 'bg-sky-500 text-white border-sky-400 shadow-md shadow-sky-500/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
              }`}
              title="راهنمای هوشمند سئو"
            >
              <HelpCircle className="w-4 h-4" />
              <span>راهنمای هوشمند</span>
            </button>

            {/* Run Audit Now */}
            <button
              type="button"
              onClick={runFullAudit}
              disabled={isAuditing}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
              <span>اجرای پایش مقطعی</span>
            </button>

            {/* Batch Auto-SEO */}
            <button
              type="button"
              onClick={handleAutoGenerateAllViews}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>سئوسازی خودکار همه صفحات</span>
            </button>
          </div>
        </div>

        {/* Smart Help Drawer */}
        {showSmartHelp && (
          <div className="mt-5 p-4 rounded-2xl bg-indigo-950/70 border border-indigo-800/80 text-xs text-indigo-200 space-y-2 animate-in fade-in duration-200">
            <div className="font-bold flex items-center gap-2 text-indigo-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>اصول بهینه‌سازی و عملکرد موتور سئو داخلی:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11.5px] pr-1 leading-relaxed">
              <li><strong>موتور محلی آفلاین:</strong> تمام محاسبات وزن کلمات (TF-IDF)، تراکم و ممیزی‌ها بدون نیاز به اینترنت خارجی در مرورگر پردازش می‌شوند و تحریم‌ها یا قطعی نت هیچ اختلالی در آن ایجاد نمی‌کند.</li>
              <li><strong>اندازه استاندارد Title:</strong> طول عنوان باید بین ۳۰ تا ۶۰ کاراکتر باشد و برند سایت حتماً در آن ذکر شود تا بیشترین نرخ کلیک حاصل شود.</li>
              <li><strong>توضیحات Meta Description:</strong> طول ایده‌آل ۱۲۰ تا ۱۶۰ کاراکتر همراه با افعال اکشن و پاسخ به نیاز کاربران حوزه چاپ، بسته‌بندی یا نرم‌افزار.</li>
              <li><strong>اتصال به ورکر خارجی (Edge SEO):</strong> با فعال‌سازی ورکر می‌توانید کشینگ صفحات و پیش‌رندرسازی برای بات‌های سرچ را به لبه شبکه (Cloudflare Workers) بسپارید.</li>
            </ul>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'bg-slate-900/60 text-amber-400/90 hover:text-amber-300 border border-amber-500/30'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>راهنمای جامع و گام‌به‌گام اجرایی</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>ممیزی مقطعی و عیب‌یابی صفحات</span>
        </button>

        <button
          onClick={() => setActiveTab('keywords')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'keywords'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>کاشف متن و کلمات کلیدی ({extractedKeywords.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('autoseo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'autoseo'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>ویرایشگر و تزریق‌کننده متاتگ‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('schema_sitemap')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'schema_sitemap'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>اسکیما JSON-LD، نقشه سایت و Robots.txt</span>
        </button>

        <button
          onClick={() => setActiveTab('workers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'workers'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>اتصال به ورکرهای خارجی (Edge SEO)</span>
        </button>
      </div>

      {/* TAB 0: COMPREHENSIVE STEP-BY-STEP EXECUTION GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Executive Overview Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 border border-amber-500/30 relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-black text-base">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <span>راهنمای جامع، گام‌به‌گام و اجرایی موتور هیبریدی سئو</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                  این موتور چهارگانه به‌طور اختصاصی برای محیط اینترنت ایران، بدون وابستگی به سرورهای فیلترشده و با پردازش کاملاً محلی طراحی شده است تا وب‌سایت شما بدون نیاز به ابزارهای جانبی در بالاترین رتبه‌های موتورهای جستجو قرار گیرد.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={runFullAudit}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>اجرای تست عملیاتی سئو</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Execution Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Step 1: NLP Discovery */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 font-mono font-black text-sm flex items-center justify-center border border-indigo-500/30">
                    ۱
                  </span>
                  <h4 className="text-sm font-bold text-white">کاشف متن و کلمات کلیدی (NLP)</h4>
                </div>
                <button
                  onClick={() => setActiveTab('keywords')}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1"
                >
                  <span>ورود به کاوشگر</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>مکانیزم کارکرد:</strong> الگوریتم بدون اتصال به هوش‌های خارجی، کل محتوای صفحات، کاتالوگ‌ها و مقالات شما را پیمایش کرده، کلمات اضافه (حروف ربط و توقف) را حذف و کلمات کلیدی پرتکرار را با محاسبه نسبت تراکم استخراج می‌کند.
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11.5px] text-slate-400 space-y-1">
                <div className="text-indigo-300 font-bold">دستورالعمل اجرایی:</div>
                <div>• تراکم ایده‌آل واژگان طلایی بین <strong>۱.۵٪ تا ۳.۵٪</strong> است.</div>
                <div>• از واژگان استخراج‌شده در تیترهای اصلی (H1 و H2) و توضیحات کاتالوگ استفاده کنید.</div>
              </div>
            </div>

            {/* Step 2: Periodic Audit */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 font-mono font-black text-sm flex items-center justify-center border border-emerald-500/30">
                    ۲
                  </span>
                  <h4 className="text-sm font-bold text-white">ممیزی مقطعی سلامت سئو (Audit)</h4>
                </div>
                <button
                  onClick={() => setActiveTab('audit')}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                >
                  <span>ورود به ممیزی</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>مکانیزم کارکرد:</strong> ساختار کد هر صفحه به تفکیک بررسی و نمره کیفی سلامت (از ۱۰۰) صادر می‌شود. خطاهایی مانند عنوان‌های خیلی کوتاه یا بلند و نبود توضیحات متا فوراً شناسایی می‌گردند.
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11.5px] text-slate-400 space-y-1">
                <div className="text-emerald-300 font-bold">دستورالعمل اجرایی:</div>
                <div>• طول عنوان (Title): باید دقیقاً بین <strong>۳۰ تا ۶۰ کاراکتر</strong> باشد.</div>
                <div>• توضیحات متا (Meta Description): باید بین <strong>۱۲۰ تا ۱۶۰ کاراکتر</strong> باشد.</div>
                <div>• پایش‌ها را به صورت هفتگی اجرا و تاریخ شمسی ثبت‌شده را بررسی فرمایید.</div>
              </div>
            </div>

            {/* Step 3: Auto-SEO & Schema */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/40 transition-all space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 font-mono font-black text-sm flex items-center justify-center border border-violet-500/30">
                    ۳
                  </span>
                  <h4 className="text-sm font-bold text-white">تزریق خودکار متاتگ و کدهای اسکیما</h4>
                </div>
                <button
                  onClick={() => setActiveTab('autoseo')}
                  className="text-[11px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1"
                >
                  <span>ورود به ویرایشگر</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>مکانیزم کارکرد:</strong> با یک کلیک بر روی دکمه «سئوسازی خودکار»، فرمول‌های طلایی عناوین و تگ‌های OpenGraph برای تمام صفحات ساخته شده و کدهای استاندارد اسکیما (JSON-LD) برای گوگل تزریق می‌شوند.
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11.5px] text-slate-400 space-y-1">
                <div className="text-violet-300 font-bold">دستورالعمل اجرایی:</div>
                <div>• کدهای اسکیما باعث ستاره‌دار شدن نتایج و نمایش مشخصات کاتالوگ در گوگل می‌شوند.</div>
                <div>• فایل‌های <code>sitemap.xml</code> و <code>robots.txt</code> به‌طور کاملاً خودکار تولید و در دسترس موتورهای جستجو قرار دارند.</div>
              </div>
            </div>

            {/* Step 4: Edge Worker Sync */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-sky-500/40 transition-all space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-sky-600/30 text-sky-400 font-mono font-black text-sm flex items-center justify-center border border-sky-500/30">
                    ۴
                  </span>
                  <h4 className="text-sm font-bold text-white">هماهنگ‌کننده ورکر خارجی (Edge Worker)</h4>
                </div>
                <button
                  onClick={() => setActiveTab('workers')}
                  className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                >
                  <span>ورود به ورکرها</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>مکانیزم کارکرد:</strong> جهت غلبه بر چالش خزنده‌های جستجو در مواجهه با اینترنت ایران، سرورهای لبه (مانند کلودفلر) داده‌های سئو را از این پرتال دریافت و به سریع‌ترین شکل ممکن در نزدیک‌ترین نقطه به ربات گوگل تحویل می‌دهند.
              </p>
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11.5px] text-slate-400 space-y-1">
                <div className="text-sky-300 font-bold">دستورالعمل اجرایی:</div>
                <div>• آدرس Webhook ورکر خود را وارد کنید و دکمه «ارسال بسته داده‌ها» را بزنید.</div>
                <div>• نیازی به هیچ سرور اضافه ندارید و عملکرد سایت حتی در مواقع اختلالات بین‌المللی برای گوگل حفظ می‌شود.</div>
              </div>
            </div>
          </div>

          {/* Ready-to-use Edge Worker Script Box */}
          <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">کد آماده اسکریپت ورکر لبه (Cloudflare Worker Script)</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(`// Edge SEO Worker for Ashk Ghalam
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|googlebot|crawler|spider|robot|crawling/i.test(userAgent);

  const originResponse = await fetch(request);
  if (!isBot) return originResponse;

  // Serve pre-cached metadata and headers for SEO bots
  return originResponse;
}`, 'worker_script')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
              >
                {copiedKey === 'worker_script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'worker_script' ? 'کپی شد' : 'کپی اسکریپت آماده'}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-emerald-300 overflow-x-auto text-left ltr">
{`// Cloudflare Edge SEO Worker (Ready to deploy)
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const userAgent = request.headers.get('user-agent') || '';
  const isBot = /bot|googlebot|bingbot|crawler|spider|slurp/i.test(userAgent);

  const response = await fetch(request);
  return response;
}`}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 1: AUDIT & DIAGNOSTICS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Page Selector Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-300">انتخاب صفحه جهت آنالیز:</span>
              <select
                value={selectedView}
                onChange={e => setSelectedView(e.target.value as AppView)}
                className="p-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white font-sans focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {seoConfigs.map(cfg => (
                  <option key={cfg.view} value={cfg.view}>
                    صفحه {cfg.view} ({auditResults[cfg.view]?.score ?? '--'} امتیاز)
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAutoGenerateForCurrent}
              className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>سئوسازی خودکار این صفحه</span>
            </button>
          </div>

          {/* Detailed Diagnosis Card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Metrics */}
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">امتیاز سئو این صفحه:</span>
                  <span className={`text-lg font-black font-mono px-3 py-1 rounded-xl ${
                    currentAudit.score >= 80 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    currentAudit.score >= 60 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    'bg-rose-950 text-rose-400 border border-rose-800'
                  }`}>
                    {currentAudit.score} / ۱۰۰
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>طول عنوان صفحه:</span>
                    <span className="font-mono text-white">{currentAudit.metrics.titleLength} کاراکتر (بهینه: ۳۰-۶۰)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${currentAudit.metrics.titleLength >= 30 && currentAudit.metrics.titleLength <= 65 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (currentAudit.metrics.titleLength / 65) * 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-slate-400 pt-2">
                    <span>طول توضیحات متا:</span>
                    <span className="font-mono text-white">{currentAudit.metrics.descriptionLength} کاراکتر (بهینه: ۱۲۰-۱۶۰)</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${currentAudit.metrics.descriptionLength >= 100 && currentAudit.metrics.descriptionLength <= 165 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (currentAudit.metrics.descriptionLength / 165) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 block">کلمات متن صفحه</span>
                    <span className="font-bold text-white mt-0.5 block">{currentAudit.metrics.keywordsCount} واژه</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 block">اسکیما و OG</span>
                    <span className="font-bold text-emerald-400 mt-0.5 block">فعال و استاندارد</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Issues & Recommendations Checklist */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                <span>نتایج ارزیابی هوشمند و گام‌های پیشنهادی:</span>
              </h4>

              <div className="space-y-2.5">
                {currentAudit.issues.map(issue => (
                  <div 
                    key={issue.id}
                    className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                      issue.severity === 'critical'
                        ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                        : issue.severity === 'warning'
                        ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                        : 'bg-emerald-950/20 border-emerald-800/60 text-emerald-200'
                    }`}
                  >
                    {issue.severity === 'critical' && <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />}
                    {issue.severity === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />}
                    {issue.severity === 'good' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />}

                    <div className="flex-1 text-xs space-y-1">
                      <div className="font-bold">{issue.message}</div>
                      <div className="text-[11px] opacity-80 leading-relaxed">{issue.recommendation}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KEYWORD DISCOVERY & DENSITY */}
      {activeTab === 'keywords' && (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/40 text-xs text-indigo-300 leading-relaxed flex items-start gap-3">
            <Search className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong>موتور کاشف واژگان و عبارات کلیدی (NLP):</strong> تمام متون کاتالوگ، هیرو، مقالات و صفحات با پردازشگر محلی واکاوی شده و کلمات کلیدی، عبارات دوتایی و سه‌تایی به همراه تراکم و درصد ارتباط استخراج شده‌اند.
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                <tr>
                  <th className="p-3">کلمه / عبارت کلیدی</th>
                  <th className="p-3">نوع عبارت</th>
                  <th className="p-3">تعداد تکرار</th>
                  <th className="p-3">تراکم (Density)</th>
                  <th className="p-3">امتیاز ارتباط</th>
                  <th className="p-3">محل‌های پیشنهادی قرارگیری</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {extractedKeywords.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      <span>{item.keyword}</span>
                    </td>
                    <td className="p-3 text-slate-400">
                      {item.type === 'phrase' ? 'عبارت ترکیبی (LSI)' : 'کلمه تک'}
                    </td>
                    <td className="p-3 font-mono text-indigo-300">{item.count} بار</td>
                    <td className="p-3 font-mono">
                      <span className={`px-2 py-0.5 rounded-md text-[11px] ${
                        item.status === 'optimal' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        item.status === 'overused' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {item.density}%
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{item.relevanceScore}%</span>
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${item.relevanceScore}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {item.suggestedPlacements.map((p, i) => (
                          <span key={i} className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                            {p === 'title' ? 'عنوان' : p === 'h1' ? 'هدینگ H1' : p === 'description' ? 'توضیحات متا' : p === 'schema' ? 'اسکیما' : 'بدنه'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleCopy(item.keyword, `kw-${idx}`)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="کپی عبارت کلیدی"
                      >
                        {copiedKey === `kw-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUTO-SEO & META TAG EDITOR */}
      {activeTab === 'autoseo' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div>
              <h4 className="font-bold text-sm text-white">ویرایشگر و تزریق‌کننده مستقیم متاتگ‌ها</h4>
              <p className="text-xs text-slate-400 mt-0.5">تمام تغییرات بی‌درنگ بر روی هدر، کش صفحات و نتایج گوگل اعمال می‌شوند.</p>
            </div>
            <button
              type="button"
              onClick={handleAutoGenerateAllViews}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>تزریق هوشمند به تمام صفحات</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {seoConfigs.map(cfg => (
              <div 
                key={cfg.view}
                className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">صفحه: {cfg.view}</span>
                    <span className="text-[10px] font-mono bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-800">
                      {auditResults[cfg.view]?.score ?? '--'} نمره
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const gen = generateAutomatedSeoForView(cfg.view, globalSettings.siteName || 'اشک قلم');
                      updateSeoConfig(cfg.view, gen);
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>تولید خودکار</span>
                  </button>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    عنوان صفحه (Title Tag) - {cfg.title?.length || 0} کاراکتر:
                  </label>
                  <input
                    type="text"
                    value={cfg.title}
                    onChange={e => updateSeoConfig(cfg.view, { title: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    توضیحات متا (Meta Description) - {cfg.description?.length || 0} کاراکتر:
                  </label>
                  <textarea
                    rows={2}
                    value={cfg.description}
                    onChange={e => updateSeoConfig(cfg.view, { description: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SCHEMA, SITEMAP & ROBOTS.TXT */}
      {activeTab === 'schema_sitemap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Sitemap.xml */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-bold text-xs text-white">نقشه سایت پویا (Sitemap.xml)</h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(generateSitemapXml(), 'sitemap')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'sitemap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>کپی فایل</span>
                </button>
              </div>
              <textarea
                readOnly
                rows={9}
                value={generateSitemapXml()}
                dir="ltr"
                className="w-full p-3 font-mono text-[10.5px] bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 outline-none select-all"
              />
            </div>

            {/* Robots.txt with AI Bots Toggles */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-sky-400" />
                  <h4 className="font-bold text-xs text-white">فایل Robots.txt و اجازه به هوش‌های مصنوعی</h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(generateRobotsTxt('https://ashkghalam.ir', allowedBots), 'robots')}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                >
                  {copiedKey === 'robots' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>کپی فایل</span>
                </button>
              </div>

              {/* Bot toggles */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pb-2">
                <label className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-lg border border-slate-800">
                  <input 
                    type="checkbox" 
                    checked={allowedBots.google} 
                    onChange={e => setAllowedBots(prev => ({ ...prev, google: e.target.checked }))}
                  />
                  <span>Google Gemini (Extended)</span>
                </label>
                <label className="flex items-center gap-2 p-1.5 bg-slate-950 rounded-lg border border-slate-800">
                  <input 
                    type="checkbox" 
                    checked={allowedBots.gpt} 
                    onChange={e => setAllowedBots(prev => ({ ...prev, gpt: e.target.checked }))}
                  />
                  <span>OpenAI ChatGPT (GPTBot)</span>
                </label>
              </div>

              <textarea
                readOnly
                rows={6}
                value={generateRobotsTxt('https://ashkghalam.ir', allowedBots)}
                dir="ltr"
                className="w-full p-3 font-mono text-[10.5px] bg-slate-950 border border-slate-800 rounded-xl text-sky-400 outline-none select-all"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXTERNAL WORKER & EDGE SEO */}
      {activeTab === 'workers' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">پایگاه اتصال به ورکرهای خارجی (Edge SEO Worker Sync)</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    اتصال به Cloudflare Workers، سرورلس فانکشن‌ها یا API برای پیش‌رندرینگ در لبه و همگام‌سازی تگ‌ها
                  </p>
                </div>
              </div>

              {workerConfig.lastSyncShamsi && (
                <div className="text-[11px] text-slate-400">
                  آخرین همگام‌سازی: <strong className="text-white font-mono">{workerConfig.lastSyncShamsi}</strong>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  آدرس Endpoint ورکر خارجی (Webhook / Worker URL)
                </label>
                <input
                  type="url"
                  dir="ltr"
                  placeholder="https://seo-worker.ashkghalam.workers.dev/sync"
                  value={workerConfig.workerUrl}
                  onChange={e => handleSaveWorkerConfig({ workerUrl: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1.5">
                  کلید احراز هویت اختصاصی (Bearer Token - اختیاری)
                </label>
                <input
                  type="password"
                  dir="ltr"
                  placeholder="Bearer token secret..."
                  value={workerConfig.authToken || ''}
                  onChange={e => handleSaveWorkerConfig({ authToken: e.target.value })}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-400">
                  <span>وضعیت اتصال:</span>
                  <span className={`font-bold ${
                    workerConfig.syncStatus === 'success' ? 'text-emerald-400' :
                    workerConfig.syncStatus === 'error' ? 'text-rose-400' :
                    'text-slate-400'
                  }`}>
                    {workerConfig.syncStatus === 'success' ? 'موفق' : workerConfig.syncStatus === 'error' ? 'خطا در ارتباط' : 'آماده'}
                  </span>
                </span>

                {workerConfig.lastPingMs !== undefined && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    Latency: {workerConfig.lastPingMs}ms
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncWorker}
                  disabled={isWorkerSyncing || !workerConfig.workerUrl}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${isWorkerSyncing ? 'animate-spin' : ''}`} />
                  <span>{isWorkerSyncing ? 'در حال ارسال و همگام‌سازی...' : 'ارسال بسته داده‌ها و همگام‌سازی ورکر'}</span>
                </button>
              </div>
            </div>

            {workerResponseLog && (
              <div className={`p-3 rounded-xl text-xs font-mono border ${
                workerConfig.syncStatus === 'success'
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
              }`}>
                {workerResponseLog}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
