import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
  Link
} from 'react-router-dom';
import { findBySlugOrId, toSlug } from './utils/slugUtils';
import { AppView, User, UserRole, Project, SitePortalId } from './types';
import { Inquiry } from './components/Inquiry';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CatalogItemPage } from './components/catalog/CatalogItemPage';
import { Button, Card, Badge, BackButton } from './components/UIComponents';
import { generateSupportResponse, analyzeDesignStyle } from './services/geminiService';
import { ThreeDProductSlider } from './components/ThreeDProductSlider';
import { InteractiveServicesSpace } from './components/InteractiveServicesSpace';
import { ContentProvider, useContent } from './contexts/ContentContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CatalogProvider } from './contexts/CatalogContext';
import { Login } from './components/Login';
import { SeoHead } from './components/SeoHead';
import { ServicesHub } from './components/ServicesHub';
import { ProductsHub } from './components/ProductsHub';
import { NotFound } from './components/NotFound';
import { getPathForView, getViewForPath } from './utils/navigationRoutes';

import { EmergencyNotificationBar } from './components/EmergencyNotificationBar';
import { SiteSwitcherModal } from './components/SiteSwitcherModal';
import { EmbedViewerPage } from './components/studio/EmbedViewerPage';

const Dashboard = lazy(() => import('./components/Dashboard').then(m => ({ default: m.Dashboard })));
const DesignStudio = lazy(() => import('./components/DesignStudio').then(m => ({ default: m.DesignStudio })));
const DielineGenerator = lazy(() => import('./components/DielineGenerator').then(m => ({ default: m.DielineGenerator })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then(m => ({ default: m.AdminPanel })));
const Blog = lazy(() => import('./components/Blog').then(m => ({ default: m.Blog })));
const AutoCADStudio = lazy(() => import('./components/AutoCADStudio').then(m => ({ default: m.AutoCADStudio })));
const AboutUs = lazy(() => import('./components/AboutUs').then(m => ({ default: m.AboutUs })));
const Library = lazy(() => import('./components/Library').then(m => ({ default: m.Library })));
const SoftwareMarketplace = lazy(() => import('./components/SoftwareMarketplace').then(m => ({ default: m.SoftwareMarketplace })));
const CustomPageView = lazy(() => import('./components/CustomPageView').then(m => ({ default: m.CustomPageView })));
const DownloadReleasePage = lazy(() => import('./components/DownloadReleasePage').then(m => ({ default: m.DownloadReleasePage })));

import {
  Menu, X, Home, Grid, Users, Moon, Sun, MessageSquare,
  Phone, Mail, Lock, ArrowLeft, Send, Image as ImageIcon, Sparkles, Box, Package, LogOut, LogIn, BookOpen, Clock, ChevronRight, Palette, Layers, PenTool, Globe, Download,
  Cpu, ShieldCheck, Laptop, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Smart Portfolio Component ---
const SmartPortfolio = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
  const { portfolioItems } = useContent();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [aiAnalysis, setAiAnalysis] = useState<{ tags: string[]; suggestion: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');

  const activeItem = slug ? findBySlugOrId(portfolioItems, slug) : null;

  useEffect(() => {
    if (activeItem) {
      let isSubscribed = true;
      setIsAnalyzing(true);
      setAiAnalysis(null);

      analyzeDesignStyle(activeItem.title)
        .then((res) => {
          if (isSubscribed) {
            setAiAnalysis(res);
            setIsAnalyzing(false);
          }
        })
        .catch(() => {
          if (isSubscribed) {
            setIsAnalyzing(false);
          }
        });

      return () => {
        isSubscribed = false;
      };
    }
  }, [activeItem?.id, activeItem?.title]);

  if (slug && !activeItem) {
    return <NotFound />;
  }

  if (activeItem) {
    const itemSlug = activeItem.id ? String(activeItem.id) : toSlug(activeItem.title);
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
        <SeoHead
          view={AppView.PORTFOLIO}
          canonicalPath={`/portfolio/${itemSlug}`}
          customTitle={`${activeItem.title} | نمونه‌کار صنایع چاپ اشک قلم`}
          customDescription={activeItem.description || `بررسی و مشخصات نمونه‌کار ${activeItem.title} در صنایع چاپ و بسته‌بندی اشک قلم.`}
          noIndex={false}
        />

        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <BackButton label="بازگشت به نمونه‌کارها" to="/portfolio" variant="auto" />

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link to="/" className="hover:text-primary-600">خانه</Link>
            <span>/</span>
            <Link to="/portfolio" className="hover:text-primary-600">نمونه‌کارها</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-bold truncate max-w-[200px]">{activeItem.title}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl border border-gray-150 dark:border-gray-700 flex flex-col md:flex-row">
          <div className="md:w-1/2 h-72 md:h-auto min-h-[360px] bg-gray-100 dark:bg-gray-900">
            <img src={activeItem.img} alt={activeItem.title} className="w-full h-full object-cover" />
          </div>

          <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/50">
                  {activeItem.category || 'صنایع چاپ و بسته‌بندی'}
                </span>
                {activeItem.date && <span className="text-xs text-gray-400">{activeItem.date}</span>}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-4">
                {activeItem.title}
              </h1>

              {activeItem.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  {activeItem.description}
                </p>
              )}

              <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 mb-6">
                <div className="flex items-center gap-2 mb-3 text-purple-700 dark:text-purple-300 font-bold text-xs">
                  <Sparkles className="h-4 w-4" />
                  <span>تحلیل هوش مصنوعی سبک و متریال:</span>
                </div>

                {isAnalyzing ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-3 bg-purple-200/50 dark:bg-purple-800/40 rounded w-3/4"></div>
                    <div className="h-3 bg-purple-200/50 dark:bg-purple-800/40 rounded w-1/2"></div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                      {aiAnalysis?.suggestion || 'ساختار مقاوم و طراحی استاندارد متناسب با خطوط چاپ افست و بسته‌بندی صادراتی.'}
                    </p>
                    {aiAnalysis?.tags && aiAnalysis.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {aiAnalysis.tags.map(tag => (
                          <span key={tag} className="px-2.5 py-0.5 bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 rounded-lg text-[10px] font-bold border border-purple-200/60 dark:border-purple-800/60">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <Button
                className="flex-1 min-w-[150px] bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs"
                onClick={() => navigate('/inquiry')}
              >
                ثبت استعلام قیمت این مدل
              </Button>
              <Button variant="outline" className="text-xs" onClick={() => navigate('/portfolio')}>
                سایر نمونه‌کارها
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const categories = ['All', ...Array.from(new Set(portfolioItems.map(item => item.category).filter(Boolean)))];

  const filteredAndSortedItems = portfolioItems
    .filter(item => filterCategory === 'All' || item.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'newest') return (b.date || '').localeCompare(a.date || '');
      if (sortBy === 'oldest') return (a.date || '').localeCompare(b.date || '');
      if (sortBy === 'alphabetical') return (a.title || '').localeCompare(b.title || '');
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-10 font-sans dir-rtl text-right">
      {!isEmbedded && (
        <SeoHead
          view={AppView.PORTFOLIO}
          canonicalPath="/portfolio"
          customTitle="گالری هوشمند نمونه‌کارها | اشک قلم"
          customDescription="آرشیو پروژه‌های چاپ، کارتن‌سازی لمینتی، جعبه‌های دارویی، بهداشتی و بسته‌بندی صادراتی به همراه تحلیل هوشمند سبک طراحی."
          noIndex={false}
        />
      )}

      <div className="text-center md:text-right flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-3">
        <div>
          {!isEmbedded && (
            <div className="mb-3 flex justify-center md:justify-start">
              <BackButton label="بازگشت" fallbackPath="/" variant="auto" />
            </div>
          )}
          <h1 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-2">
            گالری نمونه‌کارها
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl text-xs sm:text-sm leading-relaxed">
            پروژه‌های منتخب چاپ افست و بسته‌بندی صادراتی همراه با جزئیات فنی و تحلیل سبک.
          </p>
        </div>
        {isEmbedded && (
          <Link
            to="/portfolio"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center justify-center gap-1 shrink-0"
          >
            <span>آرشیو کامل نمونه‌کارها</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 md:mb-8 gap-3 bg-white dark:bg-gray-800/80 p-3 md:p-4 rounded-2xl shadow-sm border border-gray-150 dark:border-gray-700/80">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat || 'All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                filterCategory === cat
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700/80 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat === 'All' ? 'همه' : cat}
            </button>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">مرتب‌سازی:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500 border-none cursor-pointer"
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="alphabetical">الفبا (A-Z)</option>
          </select>
        </div>
      </div>

      {filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-750">
          <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
            هنوز نمونه‌کاری ثبت نشده است.
          </p>
        </div>
      ) : (
        <div
          className={
            isEmbedded
              ? 'flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 no-scrollbar'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6'
          }
        >
          {(isEmbedded ? filteredAndSortedItems.slice(0, 6) : filteredAndSortedItems).map((item) => {
            const itemSlug = item.id ? String(item.id) : toSlug(item.title);
            return (
              <div
                key={item.id}
                className={`group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800 ${
                  isEmbedded ? 'w-[78vw] sm:w-[56vw] md:w-auto shrink-0 snap-start' : ''
                }`}
              >
                <Link to={`/portfolio/${itemSlug}`} className="block relative h-52 sm:h-60 overflow-hidden">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent flex flex-col justify-end p-4 sm:p-5">
                    <span className="text-secondary-400 text-[11px] font-black mb-0.5">{item.category}</span>
                    <h3 className="text-white text-base sm:text-lg font-black mb-1.5 line-clamp-1">{item.title}</h3>
                    <div className="flex items-center justify-between text-white/80 text-xs">
                      <span className="flex items-center gap-1.5 text-primary-300 font-bold">
                        <span>مشاهده جزییات</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// --- Latest Blog Posts Component ---
const LatestBlogSection = ({ onViewAll }: { onViewAll: () => void }) => {
  const { blogPosts } = useContent();
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800/50 py-10 md:py-16 transition-colors duration-300 border-t border-gray-100 dark:border-gray-800/80">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex justify-between items-end mb-6 md:mb-10 gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-1">مجله خبری و آموزشی</h2>
            <p className="text-gray-500 text-xs md:text-sm">آخرین مقالات تخصصی صنعت چاپ و بسته‌بندی</p>
          </div>
          <button
            onClick={onViewAll}
            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-bold text-xs md:text-sm whitespace-nowrap shrink-0 cursor-pointer"
          >
            آرشیو <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div className="flex md:grid md:grid-cols-3 gap-4 md:gap-8 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 no-scrollbar">
          {latestPosts.map((post) => {
            const postSlug = post.id || toSlug(post.title);
            return (
              <Link
                key={post.id}
                to={`/blog/${postSlug}`}
                className="group w-[78vw] sm:w-[55vw] md:w-auto shrink-0 snap-start bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-150 dark:border-gray-800 hover:shadow-xl transition-all duration-300 block text-right dir-rtl"
              >
                <div className="relative h-40 md:h-48 overflow-hidden">
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-2 py-0.5 rounded-lg text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3" /> {post.readTime}m
                  </div>
                </div>
                <div className="p-4 md:p-5">
                  <h3 className="font-bold text-sm sm:text-base md:text-lg text-gray-900 dark:text-white mb-1.5 line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex justify-between items-center border-t border-gray-150 dark:border-gray-800 pt-2.5">
                    <span className="text-[11px] text-gray-400">{post.date}</span>
                    <span className="text-[11px] font-bold text-primary-600 flex items-center gap-1">
                      مطالعه <ArrowLeft className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Chat Widget ---
const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'سلام! من دستیار هوشمند اشک قلم هستم. چطور می‌توانم کمکتان کنم؟' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggle-chat', handleToggle);
    return () => window.removeEventListener('toggle-chat', handleToggle);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const response = await generateSupportResponse(userMsg);
    setMessages(prev => [...prev, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-[4.5rem] left-3 right-3 sm:right-auto sm:left-5 md:bottom-20 z-50 flex flex-col items-end pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="pointer-events-auto w-full sm:w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[65vh] max-h-[480px]"
          >
            <div className="p-4 bg-primary-600 text-white flex justify-between items-center">
              <span className="font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                پشتیبانی هوشمند
              </span>
              <button onClick={() => setIsOpen(false)} className="cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900" ref={scrollRef}>
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] rounded-xl p-3 text-sm ${
                    m.role === 'user'
                      ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/40 dark:text-primary-100 rounded-tr-none'
                      : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && <div className="text-xs text-gray-400 text-center">در حال نوشتن...</div>}
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="پیام خود را بنویسید..."
                className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-900 dark:text-white"
              />
              <button onClick={handleSend} disabled={loading} className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 disabled:opacity-50 cursor-pointer">
                <Send className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Contact Floaters ---
const ContactFloaters = () => {
  const { siteContent } = useContent();
  const [expanded, setExpanded] = useState(false);
  const normalizeDigits = (val: string) =>
    val
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  const rawDigits = normalizeDigits(siteContent.contactPhone || '').replace(/[^0-9]/g, '');
  const phoneClean = rawDigits || '09153108763';
  const waNumber = phoneClean.startsWith('0') ? `98${phoneClean.slice(1)}` : phoneClean;

  return (
    <div className="fixed bottom-[4.15rem] left-2.5 md:bottom-5 md:left-5 z-40 flex items-center gap-2">
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, x: -12, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12, scale: 0.92 }}
            className="flex items-center gap-2 bg-white/98 dark:bg-slate-900/98 px-2.5 py-2 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('toggle-chat'));
                setExpanded(false);
              }}
              title="چت پشتیبانی آنلاین"
              className="h-10 w-10 md:h-11 md:w-11 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
            </button>

            <a
              href={`tel:${phoneClean}`}
              title="تماس تلفنی"
              className="h-10 w-10 md:h-11 md:w-11 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow flex items-center justify-center transition-transform hover:scale-105"
            >
              <Phone className="h-4 w-4" />
            </a>

            <a
              href={`https://wa.me/${waNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              title="واتساپ"
              className="h-10 w-10 md:h-11 md:w-11 bg-[#25D366] hover:bg-[#128c7e] text-white rounded-full shadow flex items-center justify-center transition-transform hover:scale-105"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-label={expanded ? 'بستن ابزار ارتباطی' : 'ارتباط و پشتیبانی سریع'}
        title="ارتباط مستقیم با اشک قلم"
        className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-amber-400 border border-amber-500/40 shadow-2xl flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
      >
        {expanded ? <X className="h-4 w-4 md:h-5 md:w-5" /> : <Phone className="h-4 w-4 md:h-5 md:w-5" />}
      </button>
    </div>
  );
};

// --- Footer Component ---
const Footer = ({ setView }: { setView: (v: AppView) => void }) => {
  const { siteContent, globalSettings, customPages } = useContent();
  const footerCustomPages = (customPages || []).filter(p => p.isPublished && p.showInFooter);
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 md:py-12 mt-6 md:mt-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            {globalSettings.logoUrl && <img src={globalSettings.logoUrl} className="h-7 md:h-8 w-auto" alt="Logo" />}
            <h3 className="text-white text-lg md:text-xl font-bold">{globalSettings.siteName}</h3>
          </div>
          <p className="text-xs sm:text-sm opacity-80 leading-relaxed max-w-md">
            {siteContent.footerAbout}
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 text-sm md:text-base">دسترسی سریع</h4>
          <ul className="grid grid-cols-2 md:grid-cols-1 gap-x-4 gap-y-2 text-xs sm:text-sm">
            <li><Link to="/services" className="hover:text-white transition-colors">خدمات صنعتی</Link></li>
            <li><Link to="/products" className="hover:text-white transition-colors">محصولات بسته‌بندی</Link></li>
            <li><Link to="/catalog" className="hover:text-white transition-colors">کاتالوگ ۳D</Link></li>
            <li><Link to="/portfolio" className="hover:text-white transition-colors">نمونه‌کارها</Link></li>
            <li><Link to="/software" className="hover:text-white transition-colors">فروشگاه نرم‌افزار</Link></li>
            <li><Link to="/tools/dieline" className="hover:text-white transition-colors">جعبه‌ساز ۳D</Link></li>
            <li><Link to="/tools/design-studio" className="hover:text-white transition-colors">استودیو گرافیک</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">درباره ما</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">مجله چاپ</Link></li>
            <li><Link to="/inquiry" className="hover:text-white transition-colors">استعلام قیمت</Link></li>
            {footerCustomPages.map(cp => (
              <li key={cp.id}>
                <Link to={`/pages/${cp.slug}`} className="text-amber-300 hover:text-white transition-colors">
                  {cp.title}
                </Link>
              </li>
            ))}
            <li className="col-span-2 md:col-span-1">
              <button
                type="button"
                className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors mt-1 text-xs flex items-center gap-1"
                onClick={() => setView(AppView.ADMIN_PANEL)}
              >
                <Lock className="h-3 w-3" />
                ورود مدیران
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-3 text-sm md:text-base">ارتباط با ما</h4>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4 shrink-0" /> {siteContent.contactPhone}</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /> {siteContent.contactEmail}</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const getHelpContent = (view: AppView) => {
  switch (view) {
    case AppView.CATALOG:
      return {
        title: 'راهنمای کاتالوگ و ژورنال سه‌بعدی',
        desc: 'آرشیو محصولات، طرح‌ها و کاتالوگ‌های تعاملی سه‌بعدی با قابلیت ورق‌زدن واقعی و خروجی استاندارد.',
        tips: ['روی «ورق‌زدن سریع» کلیک کنید تا کاتالوگ را به صورت سه‌بعدی ورق بزنید.']
      };
    case AppView.ADMIN_PANEL:
      return {
        title: 'راهنمای پنل مدیریت',
        desc: 'مرکز کنترل کل پرتال، تولید و انتشار کاتالوگ‌های سه‌بعدی فلیپ‌بوک، صفحات، سئو و بکاپ سیستم.',
        tips: ['از بخش «کاتالوگ‌ها و بروشورها» می‌توانید کاتالوگ سه‌بعدی جدید بسازید و در سایت یا وردپرس منتشر کنید.']
      };
    default:
      return {
        title: 'راهنمای پرتال اشک قلم',
        desc: 'سامانه جامع مهندسی کارتن، بسته‌بندی، طراحی قالب دایلاین و کاتالوگ سه‌بعدی محصولات.',
        tips: ['از منوی بالا به بخش‌های کاتالوگ، جعبه‌ساز ۳D و خدمات صنعتی دسترسی دارید.']
      };
  }
};

// --- App Shell ---
const AppContent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { globalSettings } = useContent();

  const location = useLocation();
  const navigate = useNavigate();

  // Standalone WordPress Embed View renders cleanly with zero site chrome
  if (location.pathname.startsWith('/embed/')) {
    return (
      <Routes>
        <Route path="/embed/:id" element={<EmbedViewerPage />} />
      </Routes>
    );
  }

  const currentView = getViewForPath(location.pathname);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginTargetRole, setLoginTargetRole] = useState<UserRole | undefined>(undefined);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) return savedTheme === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isImmersiveView =
    location.pathname.startsWith('/tools/design-studio') ||
    location.pathname.startsWith('/design-studio') ||
    location.pathname.startsWith('/tools/dieline') ||
    location.pathname.startsWith('/dieline') ||
    location.pathname.startsWith('/tools/autocad') ||
    location.pathname.startsWith('/autocad');

  const [activePortal, setActivePortal] = useState<SitePortalId>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('activePortal');
      if (saved) return saved;
    }
    return 'ashk';
  });

  const [isSiteSwitcherOpen, setIsSiteSwitcherOpen] = useState(false);

  const getPortalDisplayName = (portalId: SitePortalId) => {
    if (globalSettings.portalsList && globalSettings.portalsList.length > 0) {
      const found = globalSettings.portalsList.find(p => p.id === portalId);
      if (found) return found.title;
    }
    if (portalId === 'ashk') return globalSettings.ashkPortalTitle || 'اشک قلم';
    if (portalId === 'badikaran') return globalSettings.badikaranPortalTitle || 'بادیکاران توس';
    if (portalId === 'software') return 'مرکز نرم‌افزار';
    if (portalId === 'b2b') return 'پرتال همکاران B2B';
    return portalId;
  };

  const selectPortal = (portal: SitePortalId, targetView?: string) => {
    setActivePortal(portal);
    localStorage.setItem('activePortal', portal);
    localStorage.setItem('hasChosenPortal', 'true');
    setIsSiteSwitcherOpen(false);

    if (targetView && typeof targetView === 'string') {
      const matchedView = Object.values(AppView).find(v => v === targetView);
      if (matchedView) navigate(getPathForView(matchedView));
    }
  };

  const [projects, setProjects] = useState<Project[]>([
    { id: '1', title: 'جعبه محصول زعفران', type: 'بسته‌بندی', status: 'printing', date: '1403/02/10' },
    { id: '2', title: 'کاتالوگ صنعتی', type: 'چاپ افست', status: 'delivered', date: '1403/01/25' },
    { id: '3', title: 'کارت ویزیت لمینت', type: 'اداری', status: 'pending', date: '1403/02/12' },
  ]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleOpenLogin = () => openLoginModal();
    const handleExitCad = () => navigate('/');
    window.addEventListener('open-login', handleOpenLogin);
    window.addEventListener('exit-cad-view', handleExitCad);
    return () => {
      window.removeEventListener('open-login', handleOpenLogin);
      window.removeEventListener('exit-cad-view', handleExitCad);
    };
  }, [navigate]);

  useEffect(() => {
    if (location.pathname === '/admin' || location.pathname === '/admin-panel') {
      if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
        setLoginTargetRole(UserRole.ADMIN);
        setIsLoginOpen(true);
      }
    } else if (location.pathname === '/dashboard') {
      if (!isAuthenticated) {
        setLoginTargetRole(undefined);
        setIsLoginOpen(true);
      }
    }
  }, [location.pathname, isAuthenticated, user?.role]);

  const toggleView = (view: AppView) => {
    if (view === AppView.ADMIN_PANEL) {
      if (!isAuthenticated || user?.role !== UserRole.ADMIN) {
        setLoginTargetRole(UserRole.ADMIN);
        setIsLoginOpen(true);
        return;
      }
    }
    if (view === AppView.DASHBOARD) {
      if (!isAuthenticated) {
        openLoginModal();
        return;
      }
    }

    navigate(getPathForView(view));
    setIsMobileMenuOpen(false);
  };

  const openLoginModal = () => {
    setLoginTargetRole(undefined);
    setIsLoginOpen(true);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setIsLoginOpen(false);
    if (loggedInUser.role === UserRole.ADMIN) {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleLoginCancel = () => {
    setIsLoginOpen(false);
    if (location.pathname === '/admin' || location.pathname === '/admin-panel' || location.pathname === '/dashboard') {
      navigate('/');
    }
  };

  const handleSaveProject = (project: Project) => {
    setProjects(prev => [project, ...prev]);
  };

  const NavItem = ({ view, icon: Icon, label, isHeader = false }: { view: AppView; icon: any; label: string; isHeader?: boolean }) => {
    const active = currentView === view;
    const path = getPathForView(view);

    const handleClick = (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      toggleView(view);
      setIsMobileMenuOpen(false);
    };

    if (isHeader) {
      return (
        <Link
          to={path}
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-xl transition-all duration-200 whitespace-nowrap shrink-0 text-xs xl:text-sm font-bold cursor-pointer ${
            active
              ? 'bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 border border-primary-200/80 dark:border-primary-800/60 shadow-sm'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary-600 dark:hover:text-primary-400 border border-transparent'
          }`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary-500' : 'text-gray-400 dark:text-gray-400'}`} />
          <span className="whitespace-nowrap">{label}</span>
        </Link>
      );
    }

    return (
      <Link
        to={path}
        onClick={handleClick}
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 w-full text-right ${
          active
            ? 'bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20 text-primary-600 dark:text-primary-400 font-extrabold border border-primary-200 dark:border-primary-800/50'
            : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-750 hover:bg-gray-100 dark:hover:bg-gray-750'
        }`}
      >
        <Icon className={`h-5 w-5 shrink-0 ${active ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'}`} />
        <span className="text-sm font-bold whitespace-nowrap">{label}</span>
      </Link>
    );
  };

  if (isLoginOpen) {
    return (
      <Login
        onBack={handleLoginCancel}
        onLoginSuccess={handleLoginSuccess}
        targetRole={loginTargetRole}
        onNavigateView={(view) => {
          setIsLoginOpen(false);
          navigate(getPathForView(view));
        }}
      />
    );
  }

  if (currentView === AppView.ADMIN_PANEL && isAuthenticated && user?.role === UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 font-sans">
        <SeoHead view={AppView.ADMIN_PANEL} canonicalPath="/admin" noIndex={true} />
        <Suspense fallback={<div className="p-12 text-center text-sm text-slate-400">در حال بارگذاری پنل مدیریت...</div>}>
          <AdminPanel isDarkMode={isDarkMode} onBackToHome={() => navigate('/')} />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
      {!isImmersiveView && (
        <EmergencyNotificationBar currentView={currentView} onNavigate={toggleView} />
      )}

      {!isImmersiveView && (
        <div className="sticky top-0 z-40 w-full pointer-events-none flex justify-center">
          <header className="w-full bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/80 shadow-md shadow-black/5 dark:shadow-black/20 pointer-events-auto h-14 sm:h-16 flex items-center justify-between px-3 sm:px-8 transition-all">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 pointer-events-auto shrink-0" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <Menu className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0" onClick={() => toggleView(AppView.HOME)}>
                {globalSettings.logoUrl ? (
                  <img src={globalSettings.logoUrl} alt={globalSettings.siteName || 'Logo'} className="h-7 sm:h-8 max-w-[100px] sm:max-w-[120px] object-contain w-auto rounded shrink-0" />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-base sm:text-lg shrink-0">
                    {globalSettings.siteName ? globalSettings.siteName.charAt(0) : 'A'}
                  </div>
                )}
                <span className="text-xs sm:text-base md:text-lg font-black text-gray-900 dark:text-white truncate">
                  {getPortalDisplayName(activePortal)}
                </span>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
              <NavItem view={AppView.HOME} icon={Home} label="خانه" isHeader />
              <NavItem view={AppView.SERVICES} icon={Layers} label="خدمات" isHeader />
              <NavItem view={AppView.PRODUCTS} icon={Package} label="محصولات" isHeader />
              <NavItem view={AppView.CATALOG} icon={ImageIcon} label="کاتالوگ" isHeader />
              <NavItem view={AppView.DIELINE_GENERATOR} icon={Box} label="جعبه‌ساز ۳D" isHeader />
              <NavItem view={AppView.SOFTWARE_STORE} icon={Laptop} label="نرم‌افزارها" isHeader />
              <NavItem view={AppView.DESIGN_STUDIO} icon={Palette} label="استودیو آنلاین" isHeader />
              <NavItem view={AppView.LIBRARY} icon={Download} label="کتابخانه" isHeader />
              <NavItem view={AppView.ABOUT} icon={Users} label="درباره ما" isHeader />
            </nav>

            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsSiteSwitcherOpen(true)}
                className="flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all font-bold text-[10px] sm:text-[11px]"
                title="تغییر پورتال وب‌سایت"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden xs:inline truncate max-w-[80px] sm:max-w-none">{getPortalDisplayName(activePortal)}</span>
              </button>

              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                title="تم روز/شب"
              >
                {isDarkMode ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>

              {isAuthenticated ? (
                <div className="flex items-center gap-1 sm:gap-2 border-r border-gray-300 dark:border-gray-700 pr-1.5 sm:pr-3 mr-0.5 sm:mr-1">
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 hidden md:inline-block">{user?.name}</span>
                  {user?.role === UserRole.ADMIN ? (
                    <button
                      onClick={() => toggleView(AppView.ADMIN_PANEL)}
                      className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/25 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer"
                      title="پنل مدیریت"
                    >
                      ادمین
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleView(AppView.DASHBOARD)}
                      className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/25 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-black transition-colors cursor-pointer"
                      title="داشبورد کاربر"
                    >
                      پنل
                    </button>
                  )}
                  <button onClick={() => { logout(); navigate('/'); }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 sm:p-2 rounded-full cursor-pointer" title="خروج">
                    <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2 border-r border-gray-300 dark:border-gray-700 pr-1.5 sm:pr-3 mr-0.5 sm:mr-1">
                  <button
                    onClick={openLoginModal}
                    className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all flex items-center justify-center bg-gray-100 dark:bg-gray-850 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 gap-1 cursor-pointer"
                    title="ورود / ثبت‌نام"
                  >
                    <LogIn className="h-4 w-4 text-primary-500" />
                    <span className="hidden sm:inline text-xs">ورود</span>
                  </button>
                </div>
              )}

              <button
                onClick={() => toggleView(AppView.INQUIRY)}
                className="bg-gradient-to-r from-secondary-500 to-secondary-600 hover:shadow-lg hover:shadow-secondary-500/40 text-white border-none h-9 w-9 sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-1.5 rounded-xl flex items-center justify-center gap-1 font-bold transition-all text-xs cursor-pointer"
                title="استعلام سریع قیمت"
              >
                <HelpCircle className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">استعلام سریع</span>
              </button>
            </div>
          </header>
        </div>
      )}

      {/* Drawer Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 250, mass: 0.8 }}
              className="md:hidden fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-950/98 shadow-2xl p-5 flex flex-col gap-4 overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800/80">
                <span className="font-extrabold text-sm text-gray-950 dark:text-white">
                  {globalSettings.siteName || 'اشک قلم'}
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-slate-400 hover:text-red-500 p-1.5 rounded-xl"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex flex-col gap-2">
                <NavItem view={AppView.HOME} icon={Home} label="صفحه نخست" />
                <NavItem view={AppView.CATALOG} icon={ImageIcon} label="کاتالوگ سه‌بعدی" />
                <NavItem view={AppView.SERVICES} icon={Layers} label="خدمات صنعتی" />
                <NavItem view={AppView.PRODUCTS} icon={Package} label="محصولات" />
                <NavItem view={AppView.DIELINE_GENERATOR} icon={Box} label="جعبه‌ساز ۳D" />
                <NavItem view={AppView.DESIGN_STUDIO} icon={Palette} label="استودیو آنلاین" />
                <NavItem view={AppView.AUTOCAD_STUDIO} icon={PenTool} label="اتوکد CAD" />
                <NavItem view={AppView.SOFTWARE_STORE} icon={Laptop} label="فروشگاه نرم‌افزار" />
                <NavItem view={AppView.LIBRARY} icon={Download} label="کتابخانه" />
                <NavItem view={AppView.INQUIRY} icon={Grid} label="استعلام سریع قیمت" />
                <NavItem view={AppView.BLOG} icon={BookOpen} label="مجله چاپ" />
                <NavItem view={AppView.ABOUT} icon={Users} label="درباره ما" />
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={`flex-1 w-full ${
          isImmersiveView || currentView === AppView.HOME || currentView === AppView.CATALOG
            ? 'max-w-none px-0'
            : 'max-w-7xl mx-auto px-4 md:px-8'
        }`}
      >
        <Suspense fallback={<div className="py-20 text-center text-xs text-slate-500">در حال بارگذاری...</div>}>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <SeoHead view={AppView.HOME} canonicalPath="/" />
                  <ThreeDProductSlider onNavigate={toggleView} />

                  <div id="catalog-section" className="w-full">
                    <CatalogSection />
                  </div>

                  <InteractiveServicesSpace />

                  <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
                    <SmartPortfolio isEmbedded={true} />
                    <LatestBlogSection onViewAll={() => toggleView(AppView.BLOG)} />
                  </div>
                </>
              }
            />
            <Route path="/inquiry" element={<><SeoHead view={AppView.INQUIRY} canonicalPath="/inquiry" /><Inquiry /></>} />
            <Route path="/catalog" element={<><SeoHead view={AppView.CATALOG} canonicalPath="/catalog" /><CatalogSection /></>} />
            <Route path="/catalog/:slug" element={<CatalogItemPage />} />
            <Route path="/portfolio" element={<SmartPortfolio />} />
            <Route path="/portfolio/:slug" element={<SmartPortfolio />} />
            <Route path="/services" element={<ServicesHub />} />
            <Route path="/services/:slug" element={<ServicesHub />} />
            <Route path="/products" element={<ProductsHub />} />
            <Route path="/products/:slug" element={<ProductsHub />} />
            <Route path="/pages/:slug" element={<CustomPageView />} />
            <Route path="/pages" element={<CustomPageView />} />
            <Route path="/tools/dieline" element={<><SeoHead view={AppView.DIELINE_GENERATOR} canonicalPath="/tools/dieline" /><DielineGenerator onSaveProject={handleSaveProject} /></>} />
            <Route path="/dieline" element={<Navigate to="/tools/dieline" replace />} />
            <Route path="/tools/design-studio" element={<><SeoHead view={AppView.DESIGN_STUDIO} canonicalPath="/tools/design-studio" /><DesignStudio isDarkMode={isDarkMode} /></>} />
            <Route path="/design-studio" element={<Navigate to="/tools/design-studio" replace />} />
            <Route path="/tools/autocad" element={<><SeoHead view={AppView.AUTOCAD_STUDIO} canonicalPath="/tools/autocad" /><AutoCADStudio onExit={() => navigate('/')} /></>} />
            <Route path="/autocad" element={<Navigate to="/tools/autocad" replace />} />
            <Route
              path="/software"
              element={
                <>
                  <SeoHead view={AppView.SOFTWARE_STORE} canonicalPath="/software" />
                  <SoftwareMarketplace
                    onBackToHome={() => navigate('/')}
                    onNavigateToDieline={() => navigate('/tools/dieline')}
                  />
                </>
              }
            />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<Blog />} />
            <Route path="/about" element={<><SeoHead view={AppView.ABOUT} canonicalPath="/about" /><AboutUs /></>} />
            <Route path="/library" element={<><SeoHead view={AppView.LIBRARY} canonicalPath="/library" /><Library /></>} />
            <Route
              path="/dashboard"
              element={
                isAuthenticated ? (
                  <>
                    <SeoHead view={AppView.DASHBOARD} canonicalPath="/dashboard" noIndex={true} />
                    <Dashboard user={user!} activeRole={user!.role} projects={projects} />
                  </>
                ) : (
                  <div className="py-24 text-center">
                    <SeoHead view={AppView.DASHBOARD} canonicalPath="/dashboard" noIndex={true} />
                    <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700 shadow-xl">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">داشبورد کاربری</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">جهت مشاهده سفارشات، پروژه‌ها و کارتابل خود وارد سیستم شوید.</p>
                      <button onClick={openLoginModal} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer">
                        ورود به حساب کاربری
                      </button>
                    </div>
                  </div>
                )
              }
            />
            <Route
              path="/admin"
              element={
                isAuthenticated && user?.role === UserRole.ADMIN ? (
                  <AdminPanel isDarkMode={isDarkMode} onBackToHome={() => navigate('/')} />
                ) : (
                  <div className="py-24 text-center">
                    <SeoHead view={AppView.ADMIN_PANEL} canonicalPath="/admin" noIndex={true} />
                    <div className="max-w-md mx-auto p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-700 shadow-xl">
                      <h3 className="text-lg font-black text-red-600 dark:text-red-400 mb-2">ورود مدیران</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">این بخش دارای دسترسی امنیتی اختصاصی مدیران ارشد سیستم است.</p>
                      <button onClick={() => { setLoginTargetRole(UserRole.ADMIN); setIsLoginOpen(true); }} className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer">
                        ورود با دسترسی ادمین
                      </button>
                    </div>
                  </div>
                )
              }
            />
            <Route path="/admin-panel" element={<Navigate to="/admin" replace />} />
            <Route path="/b2b" element={<Navigate to="/services" replace />} />
            <Route path="/download" element={<DownloadReleasePage />} />
            <Route path="/downloads" element={<Navigate to="/download" replace />} />
            <Route path="/release" element={<Navigate to="/download" replace />} />
            <Route path="/cpanel" element={<Navigate to="/download" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {!isImmersiveView && (
        <>
          <Footer setView={toggleView} />
          <ContactFloaters />
          <ChatWidget />
        </>
      )}

      <SiteSwitcherModal
        isOpen={isSiteSwitcherOpen}
        onClose={() => setIsSiteSwitcherOpen(false)}
        activePortal={activePortal}
        onSelectPortal={selectPortal}
      />

      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40">
        <button
          onClick={() => setShowHelpModal(true)}
          className="w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-xl rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all cursor-pointer"
          title="راهنمای هوشمند این بخش"
        >
          ؟
        </button>
      </div>

      <AnimatePresence>
        {showHelpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 text-right dir-rtl">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                  {getHelpContent(currentView).title}
                </h3>
                <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-red-500 p-1 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                {getHelpContent(currentView).desc}
              </p>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                متوجه شدم
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ContentProvider>
          <CatalogProvider>
            <AppContent />
          </CatalogProvider>
        </ContentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
