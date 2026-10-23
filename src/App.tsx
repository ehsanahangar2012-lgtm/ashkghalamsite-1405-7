
import React, { useState, useEffect, useRef } from 'react';
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
import { Dashboard } from './components/Dashboard';
import { Inquiry } from './components/Inquiry';
import { CatalogSection } from './components/catalog/CatalogSection';
import { CatalogItemPage } from './components/catalog/CatalogItemPage';
import { Button, Card, Badge } from './components/UIComponents';
import { generateSupportResponse, analyzeDesignStyle } from './services/geminiService';
import { DesignStudio } from './components/DesignStudio';
import { DielineGenerator } from './components/DielineGenerator';
import { ThreeDProductSlider } from './components/ThreeDProductSlider';
import { ContentProvider, useContent } from './contexts/ContentContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { SeoHead } from './components/SeoHead';
import { Blog } from './components/Blog';
import { NexusDXP } from './dxp/NexusDXP';
import { ServicesHub } from './components/ServicesHub';
import { ProductsHub } from './components/ProductsHub';
import { NotFound } from './components/NotFound';
import { getPathForView, getViewForPath } from './utils/navigationRoutes';

import { AutoCADStudio } from './components/AutoCADStudio';
import { EmergencyNotificationBar } from './components/EmergencyNotificationBar';
import { SiteSwitcherModal } from './components/SiteSwitcherModal';
import { AboutUs } from './components/AboutUs';
import { Library } from './components/Library';
import { SoftwareMarketplace } from './components/SoftwareMarketplace';

import { 
  Menu, X, Home, Grid, Users, Moon, Sun, MessageSquare, 
  Phone, Mail, ArrowLeft, Send, CheckCircle, Image as ImageIcon, Sparkles, X as CloseIcon, Box, Package, Lock, LogOut, LogIn, User as UserIcon, BookOpen, Clock, ChevronRight, Rocket, Palette, TrendingUp, Layers, Search, Zap, Folder, PenTool, Globe, Download,
  Cpu, ShieldCheck, Terminal, Laptop, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Smart Portfolio Component ---
const SmartPortfolio = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
  const { portfolioItems } = useContent();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [aiAnalysis, setAiAnalysis] = useState<{tags: string[], suggestion: string} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [themes, setThemes] = useState<Record<string | number, string>>({});
  
  // Filtering & Sorting State
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');

  // Match item if slug is provided in URL
  const activeItem = slug ? findBySlugOrId(portfolioItems, slug) : null;

  // Run AI analysis on the activeItem whenever activeItem changes
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

  // If a slug was passed but no item found, show NotFound
  if (slug && !activeItem) {
    return <NotFound />;
  }

  // If viewing a single portfolio item via URL (/portfolio/:slug)
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

        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/portfolio')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors text-sm font-bold cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>بازگشت به فهرست نمونه‌کارها</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link to="/" className="hover:text-primary-600">خانه</Link>
            <span>/</span>
            <Link to="/portfolio" className="hover:text-primary-600">نمونه‌کارها</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-bold truncate max-w-[200px]">{activeItem.title}</span>
          </div>
        </div>

        {/* Dedicated Detail View Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl border border-gray-150 dark:border-gray-700 flex flex-col md:flex-row">
          <div className="md:w-1/2 h-72 md:h-auto min-h-[360px] bg-gray-100 dark:bg-gray-900">
            <img 
              src={activeItem.img} 
              alt={activeItem.title} 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="md:w-1/2 p-6 md:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200/50 dark:border-amber-900/50">
                  {activeItem.category || 'صنایع چاپ و بسته‌بندی'}
                </span>
                {activeItem.date && (
                  <span className="text-xs text-gray-400">{activeItem.date}</span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white mb-4">
                {activeItem.title}
              </h1>

              {activeItem.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  {activeItem.description}
                </p>
              )}

              {/* AI Analysis Section */}
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
              <Button 
                variant="outline" 
                className="text-xs" 
                onClick={() => navigate('/portfolio')}
              >
                سایر نمونه‌کارها
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Portfolio archive list view (when route is /portfolio)
  const categories = ['All', ...Array.from(new Set(portfolioItems.map(item => item.category).filter(Boolean)))];

  const filteredAndSortedItems = portfolioItems
    .filter(item => filterCategory === 'All' || item.category === filterCategory)
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.date || '').localeCompare(a.date || '');
      } else if (sortBy === 'oldest') {
        return (a.date || '').localeCompare(b.date || '');
      } else if (sortBy === 'alphabetical') {
        return (a.title || '').localeCompare(b.title || '');
      }
      return 0;
    });

  const toggleTheme = (id: number | string, color: string) => {
    setThemes(prev => ({...prev, [id]: color}));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as any } },
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      {!isEmbedded && (
        <SeoHead 
          view={AppView.PORTFOLIO}
          canonicalPath="/portfolio"
          customTitle="گالری هوشمند نمونه‌کارها | اشک قلم"
          customDescription="آرشیو پروژه‌های چاپ، کارتن‌سازی لمینتی، جعبه‌های دارویی، بهداشتی و بسته‌بندی صادراتی به همراه تحلیل هوشمند سبک طراحی."
          noIndex={false}
        />
      )}

      <motion.div 
        className="text-center mb-12"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4" variants={itemVariants}>
          گالری هوشمند نمونه‌کارها
        </motion.h1>
        <motion.p className="text-gray-500 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed" variants={itemVariants}>
          روی هر پروژه کلیک کنید تا مشخصات دقیق، متریال ساختار و تحلیل هوش مصنوعی سبک آن را مشاهده فرمایید.
        </motion.p>
      </motion.div>

      {/* Filters & Sorting */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-150 dark:border-gray-700">
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat || 'All')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat === 'All' ? 'همه' : cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">مرتب‌سازی:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 border-none cursor-pointer"
          >
            <option value="newest">جدیدترین</option>
            <option value="oldest">قدیمی‌ترین</option>
            <option value="alphabetical">الفبا (A-Z)</option>
          </select>
        </div>
      </div>

      {filteredAndSortedItems.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-750">
          <Sparkles className="w-10 h-10 text-gray-400 mx-auto mb-3 opacity-60" />
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
            هیچ نمونه‌کاری ثبت نشده است. می‌توانید نمونه‌کارهای جدید را از پنل مدیریت اضافه نمایید.
          </p>
        </div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {filteredAndSortedItems.map((item) => {
            const itemSlug = item.id ? String(item.id) : toSlug(item.title);
            return (
              <motion.div 
                key={item.id} 
                variants={itemVariants}
                className="group relative overflow-hidden rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-150 dark:border-gray-700 bg-white dark:bg-gray-800"
                style={{ backgroundColor: themes[item.id] || undefined }}
              >
                <Link to={`/portfolio/${itemSlug}`} className="block relative h-64 overflow-hidden">
                  <img 
                    src={item.img} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <span className="text-secondary-400 text-xs font-black mb-1">{item.category}</span>
                    <h3 className="text-white text-lg font-black mb-2">{item.title}</h3>
                    <div className="flex items-center justify-between text-white/80 text-xs">
                      <span className="flex items-center gap-1.5 text-primary-300 font-bold">
                        <span>مشاهده جزییات</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                      <button 
                        onClick={(e) => { 
                          e.preventDefault(); 
                          e.stopPropagation(); 
                          toggleTheme(item.id, '#1e3a8a'); 
                        }}
                        className="px-2.5 py-1 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg text-[10px] text-white transition-colors"
                      >
                        تم رنگی
                      </button>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

// --- Latest Blog Posts Component ---
const LatestBlogSection = ({ onViewAll }: { onViewAll: () => void }) => {
  const { blogPosts } = useContent();
  const latestPosts = blogPosts.slice(0, 3);

  return (
    <div className="bg-white dark:bg-gray-800 py-16 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">مجله خبری و آموزشی</h2>
            <p className="text-gray-500 text-sm">آخرین مقالات تخصصی صنعت چاپ و بسته‌بندی</p>
          </div>
          <button 
            onClick={onViewAll} 
            className="flex items-center gap-1 text-primary-600 hover:text-primary-700 font-bold text-sm"
          >
            مشاهده آرشیو <ChevronRight className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {latestPosts.map((post) => {
            const postSlug = post.id || toSlug(post.title);
            return (
              <Link 
                key={post.id} 
                to={`/blog/${postSlug}`}
                className="group bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden border border-gray-150 dark:border-gray-750 hover:shadow-xl transition-all duration-300 block text-right dir-rtl"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1 shadow-sm">
                     <Clock className="w-3 h-3" /> {post.readTime}m
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-0.5 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="flex justify-between items-center border-t border-gray-150 dark:border-gray-800 pt-3">
                     <span className="text-xs text-gray-400">{post.date}</span>
                     <span className="text-xs font-bold text-primary-600 flex items-center gap-1">
                       مطالعه مقاله <ArrowLeft className="w-3 h-3" />
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
  const [messages, setMessages] = useState<{role: 'user'|'model', text: string}[]>([
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
    <div className="fixed bottom-24 left-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col h-[500px]"
          >
            <div className="p-4 bg-primary-600 text-white flex justify-between items-center">
              <span className="font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                پشتیبانی هوشمند
              </span>
              <button onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></button>
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
              {loading && <div className="text-xs text-gray-400 text-center animate-pulse">در حال نوشتن...</div>}
            </div>

            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="پیام خود را بنویسید..."
                className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary-500"
              />
              <button onClick={handleSend} disabled={loading} className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 disabled:opacity-50">
                <Send className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Contact Floaters Component ---
const ContactFloaters = () => {
  const { siteContent } = useContent();
  const phoneClean = siteContent.contactPhone.replace(/[^0-9]/g, '');

  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9990] flex items-center justify-center gap-1.5 sm:gap-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-gray-200/50 dark:border-gray-700/50 shadow-[0_8px_30px_rgb(0,0,0,0.15)] animate-in slide-in-from-bottom-8 duration-500">
      <button 
        onClick={() => window.dispatchEvent(new CustomEvent('toggle-chat'))}
        title="پشتیبانی آنلاین"
        className="h-10 w-10 sm:h-12 sm:w-12 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
      >
        <MessageSquare className="h-4 w-4 sm:h-6 sm:w-6 transition-transform group-hover:scale-110" />
      </button>

      <div className="w-px h-5 sm:h-6 bg-gray-300 dark:bg-gray-600 mx-0.5 sm:mx-1"></div>

       <a 
        href={`tel:${phoneClean}`}
        title="تماس تلفنی"
        className="h-10 w-10 sm:h-12 sm:w-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
      >
        <Phone className="h-4 w-4 sm:h-6 sm:w-6 transition-transform group-hover:rotate-12" />
      </a>

      <a 
        href={`https://wa.me/${phoneClean}`}
        target="_blank"
        rel="noopener noreferrer"
        title="واتساپ"
        className="h-10 w-10 sm:h-12 sm:w-12 bg-[#25D366] hover:bg-[#128c7e] text-white rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 group"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 sm:h-7 sm:w-7 fill-current transition-transform group-hover:scale-110" xmlns="http://www.w3.org/2000/svg">
           <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
    </div>
  );
}

const StudioNavFloaters = () => {
  const { siteContent } = useContent();
  const phoneClean = siteContent.contactPhone.replace(/[^0-9]/g, '');

  return (
    <>
      {/* Contact floating row - Bottom Right (Swapped from Left) */}
      <div className="fixed bottom-6 right-1/2 translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-[9999] flex items-center gap-3 bg-black/80 backdrop-blur-xl px-4 py-3 rounded-full border border-white/10 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-500">
        <a 
          href={`tel:${phoneClean}`}
          title="تماس"
          className="w-10 h-10 bg-blue-600/90 hover:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 group"
        >
          <Phone className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        </a>

        <a 
          href={`https://wa.me/${phoneClean}`}
          target="_blank"
          rel="noopener noreferrer"
          title="واتساپ"
          className="w-10 h-10 bg-[#25D366]/90 hover:bg-[#128c7e] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 group"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" xmlns="http://www.w3.org/2000/svg">
             <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      </div>
    </>
  );
};

// --- Footer Component ---
const Footer = ({ setView }: { setView: (v: AppView) => void }) => {
  const { siteContent, globalSettings } = useContent();
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            {globalSettings.logoUrl && <img src={globalSettings.logoUrl} className="h-8 w-auto" alt="Logo" />}
            <h3 className="text-white text-xl font-bold">{globalSettings.siteName}</h3>
          </div>
          <p className="text-sm opacity-80 leading-relaxed max-w-md">
            {siteContent.footerAbout}
          </p>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">دسترسی سریع</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services" className="hover:text-white transition-colors">خدمات صنعتی و مهندسی چاپ</Link></li>
            <li><Link to="/products" className="hover:text-white transition-colors">محصولات و رده‌های بسته‌بندی</Link></li>
            <li><Link to="/catalog" className="hover:text-white transition-colors">ژورنال و کاتالوگ ۳D</Link></li>
            <li><Link to="/portfolio" className="hover:text-white transition-colors">گالری نمونه‌کارها</Link></li>
            <li><Link to="/software" className="hover:text-white transition-colors">نرم‌افزارهای صنعتی و IT اشک قلم</Link></li>
            <li><Link to="/tools/dieline" className="hover:text-white transition-colors">جعبه‌ساز و دایلاین ۳D</Link></li>
            <li><Link to="/tools/design-studio" className="hover:text-white transition-colors">استودیو آنلاین گرافیک</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">درباره ما</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">مجله تخصصی چاپ (وبلاگ)</Link></li>
            <li><Link to="/inquiry" className="hover:text-white transition-colors">استعلام آنلاین قیمت</Link></li>
            <li>
              <button 
                type="button"
                className="text-gray-500 hover:text-red-400 cursor-pointer transition-colors mt-2 text-xs flex items-center gap-1"
                onClick={() => setView(AppView.ADMIN_PANEL)}
              >
                <Lock className="h-3 w-3" />
                ورود مدیران
              </button>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-bold mb-4">ارتباط با ما</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {siteContent.contactPhone}</div>
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {siteContent.contactEmail}</div>
          </div>
        </div>
      </div>
    </footer>
  );
};

const getHelpContent = (view: AppView) => {
  switch (view) {
    case AppView.HOME:
      return {
        title: "راهنمای صفحه اصلی",
        desc: "به پورتال جامع اشک قلم خوش آمدید! در این بخش می‌توانید کارهای اخیر ما را مشاهده کرده، بین پورتال‌های مختلف جابجا شوید و به آخرین ابزارهای طراحی دسترسی داشته باشید.",
        tips: [
          "از اسلایدر بالای صفحه برای دیدن محصولات سه‌بعدی و چرخاندن آن‌ها استفاده کنید.",
          "با زدن دکمه «تغییر پورتال» می‌توانید سایت‌های زیرمجموعه مانند صنایع کارتن‌سازی و... را تغییر دهید."
        ]
      };
    case AppView.DIELINE_GENERATOR:
      return {
        title: "راهنمای جعبه‌ساز ۳D",
        desc: "ابزار پیشرفته طراحی دایلاین و تیغ قالب. در این بخش می‌توانید ابعاد مورد نیاز خود را به میلی‌متر وارد کرده و نقشه استاندارد جعبه را دریافت کنید.",
        tips: [
          "طول، عرض و ارتفاع جعبه را به دقت و به میلی‌متر وارد کنید.",
          "پیش‌نمایش سه‌بعدی به شما کمک می‌کند تا نحوه سرهم شدن جعبه را قبل از تولید ارزیابی کنید.",
          "خروجی DXF یا PDF برای کارگاه لیزر و لیتوگرافی مناسب است."
        ]
      };
    case AppView.SOFTWARE_STORE:
      return {
        title: "راهنمای فروشگاه نرم‌افزار",
        desc: "مرکز دانلود و مدیریت لایسنس نرم‌افزارهای تخصصی اشک قلم. در این بخش می‌توانید برنامه‌های حسابداری، سیستم حواله و اپلیکیشن‌های اندروید ما را دریافت کنید.",
        tips: [
          "برای دانلود هر برنامه کافیست روی کارت مربوطه کلیک کنید.",
          "نسخه‌های آزمایشی به صورت آفلاین و بدون نیاز به اینترنت قابل اجرا هستند.",
          "جهت فعال‌سازی لایسنس دائمی می‌توانید با واحد IT اشک قلم تماس بگیرید."
        ]
      };
    case AppView.DESIGN_STUDIO:
      return {
        title: "راهنمای استودیو آنلاین",
        desc: "محیط طراحی گرافیکی آنلاین و کاملاً برداری (Vector) جهت چیدمان طرح روی دایلاین جعبه و ویرایش فایل‌های لایه‌باز.",
        tips: [
          "می‌توانید عکس‌ها و لوگوهای خود را مستقیماً به محیط کار بکشید (Drag & Drop).",
          "ابزارهای متنی به شما امکان نوشتن با فونت‌های زیبای فارسی را می‌دهند.",
          "پس از اتمام طراحی، خروجی باکیفیت جهت چاپ دانلود کنید."
        ]
      };
    case AppView.AUTOCAD_STUDIO:
      return {
        title: "راهنمای اتوکد حرفه‌ای",
        desc: "شبیه‌ساز و ویرایشگر فایل‌های اتوکد چاپی به صورت آفلاین. ابزاری فوق‌العاده برای نقشه‌کشی و ترسیم خطوط تیغ بدون نیاز به نصب نرم‌افزارهای سنگین.",
        tips: [
          "خطوط و اشکال هندسی استاندارد را با ابزار ترسیم بکشید.",
          "فایل‌های خود را ذخیره کنید تا در پروژه‌های بعدی از آن‌ها استفاده کنید."
        ]
      };
    case AppView.CATALOG:
      return {
        title: "راهنمای کاتالوگ و ژورنال",
        desc: "آرشیو بزرگ محصولات، طرح‌ها و بسته‌بندی‌های اختصاصی تولید شده توسط اشک قلم. منبع الهام‌بخش پروژه‌های جدید.",
        tips: [
          "محصولات را بر اساس دسته‌بندی فیلتر کنید تا سریع‌تر به نتیجه برسید.",
          "تصاویر باکیفیت بالا جهت نمایش جزییات چاپ بارگذاری شده‌اند."
        ]
      };
    case AppView.INQUIRY:
      return {
        title: "راهنمای استعلام سریع",
        desc: "فرمول محاسباتی پیشرفته برای برآورد آنی قیمت کارتن، جعبه و خدمات چاپ سلفون و یووی.",
        tips: [
          "تعداد تیراژ و نوع مقوا را مشخص کنید تا قیمت تقریبی محاسبه شود.",
          "نتایج را می‌توانید ذخیره کنید یا به صورت پیش‌فاکتور دانلود نمایید."
        ]
      };
    case AppView.SERVICES:
      return {
        title: "راهنمای خدمات صنعتی اشک قلم",
        desc: "مشاهده مشخصات خطوط تولید چاپ افست ۵ رنگ، کارتن لمینتی، تیغ‌سازی لیزری و خدمات تکمیلی چاپ.",
        tips: [
          "برای برآورد آنلاین هزینه‌ها از دکمه استعلام قیمت استفاده نمایید.",
          "جهت آزمایش قالب‌ها به جعبه‌ساز ۳D مراجعه فرمایید."
        ]
      };
    case AppView.PRODUCTS:
      return {
        title: "راهنمای محصولات و رده‌های بسته‌بندی",
        desc: "آشنایی با انواع کارتن‌های لمینتی، جعبه‌های دارویی، هاردباکس و کارتن‌های پستی.",
        tips: [
          "برای دیدن تصاویر واقعی محصولات به کاتالوگ ۳D مراجعه کنید.",
          "برای تغییر ابعاد جعبه‌ها به ابزار دایلاین بروید."
        ]
      };
    case AppView.PORTFOLIO:
      return {
        title: "راهنمای گالری نمونه‌کارها",
        desc: "آرشیو پروژه‌های چاپ و بسته‌بندی به همراه تحلیل هوشمند سبک طراحی.",
        tips: [
          "روی هر نمونه‌کار کلیک کنید تا تحلیل هوش مصنوعی آن را مشاهده کنید.",
          "از فیلترهای بالای صفحه برای دسته‌بندی موضوعی استفاده نمایید."
        ]
      };
    case AppView.BLOG:
      return {
        title: "راهنمای مجله تخصصی چاپ",
        desc: "مقالات تخصصی در حوزه صنعت چاپ، لیتوگرافی، بسته‌بندی و استانداردهای جهانی.",
        tips: [
          "مطالب آموزشی را بر اساس دسته‌بندی مطالعه فرمایید.",
          "نکات فنی برای کارفرمایان و طراحان در مقالات درج شده است."
        ]
      };
    case AppView.ABOUT:
      return {
        title: "راهنمای درباره ما",
        desc: "معرفی صنایع چاپ و بسته‌بندی اشک قلم و بادیکاران توس، تجهیزات، ناوگان افست و راه‌های ارتباطی.",
        tips: [
          "اطلاعات تماس مستقیم و آدرس کارخانه در این صفحه قرار دارد."
        ]
      };
    case AppView.LIBRARY:
      return {
        title: "راهنمای کتابخانه دیجیتال",
        desc: "مرکز دانلود رایگان استانداردهای مهندسی کارتن، قالب‌های CAD، کتاب‌های تخصصی و پروفایل‌های رنگی.",
        tips: [
          "فایل‌ها کاملاً آفلاین و با فرمت وکتور یا PDF قابل دریافت هستند."
        ]
      };
    case AppView.DASHBOARD:
      return {
        title: "راهنمای داشبورد کاربری",
        desc: "کنترل پنل پیگیری سفارشات، استعلام‌های ثبت‌شده و پروژه‌های اختصاصی شما.",
        tips: [
          "وضعیت سفارشات خود را به صورت لحظه‌ای بررسی کنید."
        ]
      };
    case AppView.ADMIN_PANEL:
      return {
        title: "راهنمای پنل مدیریت",
        desc: "مرکز کنترل کل پرتال، مدیریت کاتالوگ‌ها، فایل‌های رسانه، فرمول قیمت‌گذاری و بکاپ سیستم.",
        tips: [
          "تغییرات ذخیره‌شده فوراً در سایت اعمال می‌شوند."
        ]
      };
    case AppView.NOT_FOUND:
      return {
        title: "راهنمای صفحه ۴۰۴",
        desc: "آدرس مورد نظر شما در سامانه یافت نشد. از دکمه‌های ناوبری جهت بازگشت به سامانه استفاده کنید.",
        tips: [
          "دکمه صفحه اصلی شما را به صفحه نخست هدایت خواهد کرد."
        ]
      };
    default:
      return {
        title: "راهنمای هوشمند اشک قلم",
        desc: "تمامی بخش‌های این برنامه برای استفاده آسان، سریع و کاملاً آفلاین طراحی شده‌اند تا در کارهای روزمره به شما کمک کنند.",
        tips: [
          "هر بخش دارای ابزارهای تخصصی خودش است که در این راهنما توضیح داده می‌شود.",
          "در صورت وجود هرگونه سوال، دکمه پشتیبانی همواره در دسترس شماست."
        ]
      };
  }
};

// --- App Shell ---
const AppContent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { globalSettings, catalogItems } = useContent();

  const location = useLocation();
  const navigate = useNavigate();
  const currentView = getViewForPath(location.pathname);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginTargetRole, setLoginTargetRole] = useState<UserRole | undefined>(undefined);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showBadikaranNotification, setShowBadikaranNotification] = useState(false);
  const [showItNotification, setShowItNotification] = useState(false);
  const [isItNotifMinimized, setIsItNotifMinimized] = useState(false);
  const [showItNotifHelp, setShowItNotifHelp] = useState(false);
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

  // Helper to get dynamic portal display title
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

  // Auto show site switcher if never selected before
  useEffect(() => {
    if (typeof window !== 'undefined' && globalSettings.siteSwitcherEnabled !== false) {
      const hasChosen = localStorage.getItem('hasChosenPortal');
      const hidden = localStorage.getItem('hide_site_switcher');
      if (!hasChosen && !hidden) {
        // Delay slightly for onboarding feel
        const timer = setTimeout(() => setIsSiteSwitcherOpen(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [globalSettings.siteSwitcherEnabled]);

  const selectPortal = (portal: SitePortalId, targetView?: string) => {
    setActivePortal(portal);
    localStorage.setItem('activePortal', portal);
    localStorage.setItem('hasChosenPortal', 'true');
    setIsSiteSwitcherOpen(false);

    if (targetView && typeof targetView === 'string') {
      const matchedView = Object.values(AppView).find(v => v === targetView);
      if (matchedView) {
        navigate(getPathForView(matchedView));
      }
    }
  };
  
  // App Data
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

  // Listener for custom event from Inquiry component
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

  // Handle direct navigation to protected paths
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

  // Welcome Notification Logic
  useEffect(() => {
    if (globalSettings.welcomeModalEnabled === false) return;
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      // Delay slightly for effect
      const timer = setTimeout(() => setShowWelcome(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [globalSettings.welcomeModalEnabled]);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('hasSeenWelcome', 'true');
  };

  // Badikaran notification trigger: respect globalSettings and prevent multiple triggers
  const hasTriggeredNotif = useRef(false);
  useEffect(() => {
    if (globalSettings.badikaranNotifEnabled === false) {
      return;
    }
    if (hasTriggeredNotif.current) return;
    hasTriggeredNotif.current = true;

    const delaySec = globalSettings.badikaranNotifDelay !== undefined ? globalSettings.badikaranNotifDelay : 5;
    const durationSec = globalSettings.badikaranNotifDuration !== undefined ? globalSettings.badikaranNotifDuration : 10;

    const showTimer = setTimeout(() => {
      setShowBadikaranNotification(true);
      
      const hideTimer = setTimeout(() => {
        setShowBadikaranNotification(false);
      }, durationSec * 1000);
      
      return () => clearTimeout(hideTimer);
    }, delaySec * 1000);

    return () => clearTimeout(showTimer);
  }, [globalSettings.badikaranNotifEnabled, globalSettings.badikaranNotifDelay, globalSettings.badikaranNotifDuration]);

  // Initial Ashk IT Division Notification trigger
  const hasTriggeredItNotif = useRef(false);
  useEffect(() => {
    if (hasTriggeredItNotif.current) return;
    hasTriggeredItNotif.current = true;
    const itTimer = setTimeout(() => {
      setShowItNotification(true);
    }, 2500);
    return () => clearTimeout(itTimer);
  }, []);

  const toggleView = (view: AppView) => {
    // Check protections
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

    const targetPath = getPathForView(view);
    navigate(targetPath);
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

  const NavItem = ({ view, icon: Icon, label, isHeader = false }: { view: AppView, icon: any, label: string, isHeader?: boolean }) => {
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

  // Render Login Screen Overlay
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

  // Render Admin Panel Securely
  if (currentView === AppView.ADMIN_PANEL && isAuthenticated && user?.role === UserRole.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 font-sans">
        <SeoHead view={AppView.ADMIN_PANEL} canonicalPath="/admin" noIndex={true} />
        <AdminPanel isDarkMode={isDarkMode} onBackToHome={() => navigate('/')} />
      </div>
    );
  }

  // Main Public Layout
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300 font-sans">
      
      {!isImmersiveView && (
        <EmergencyNotificationBar currentView={currentView} onNavigate={toggleView} />
      )}

      {/* Sleek Top Navigation Bar */}
      {!isImmersiveView && (
        <div className="sticky top-0 z-40 w-full pointer-events-none flex justify-center">
          <header className="w-full bg-white/90 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800/80 shadow-md shadow-black/5 dark:shadow-black/20 pointer-events-auto h-14 sm:h-16 flex items-center justify-between px-3 sm:px-8 transition-all">
            
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button className="md:hidden p-1.5 text-gray-600 dark:text-gray-300 pointer-events-auto shrink-0" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                <Menu className="h-5 w-5" />
              </button>
              
              <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0" onClick={() => toggleView(AppView.HOME)}>
                {globalSettings.logoUrl ? (
                  <img src={globalSettings.logoUrl} alt={globalSettings.siteName || "Logo"} className="h-7 sm:h-8 max-w-[100px] sm:max-w-[120px] object-contain w-auto rounded shrink-0" />
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
                        className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/25 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-black transition-colors"
                        title="پنل مدیریت"
                      >
                        ادمین
                      </button>
                    ) : (
                      <button 
                        onClick={() => toggleView(AppView.DASHBOARD)}
                        className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 hover:bg-indigo-500/25 px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-black transition-colors"
                        title="داشبورد کاربر"
                      >
                        پنل
                      </button>
                    )}
                    {user?.avatar && <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200 hidden sm:block" />}
                    <button onClick={() => { logout(); navigate('/'); }} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1 sm:p-2 rounded-full" title="خروج">
                       <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                 </div>
               ) : (
                 <div className="flex items-center gap-1 sm:gap-2 border-r border-gray-300 dark:border-gray-700 pr-1.5 sm:pr-3 mr-0.5 sm:mr-1">
                    <button 
                      onClick={openLoginModal}
                      className="text-xs sm:text-sm font-black text-gray-700 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all flex items-center justify-center bg-gray-100 dark:bg-gray-850 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50 gap-1"
                      title="ورود / ثبت‌نام"
                    >
                      <LogIn className="h-4 w-4 text-primary-500" />
                      <span className="hidden sm:inline text-xs">ورود</span>
                    </button>
                 </div>
               )}

               <button 
                 onClick={() => toggleView(AppView.INQUIRY)}
                 className="bg-gradient-to-r from-secondary-500 to-secondary-600 hover:shadow-lg hover:shadow-secondary-500/40 text-white border-none h-9 w-9 sm:h-auto sm:w-auto p-2 sm:px-3 sm:py-1.5 rounded-xl flex items-center justify-center gap-1 font-bold transition-all text-xs"
                 title="استعلام سریع قیمت"
               >
                 <HelpCircle className="h-4 w-4 shrink-0" />
                 <span className="hidden sm:inline">استعلام سریع</span>
               </button>
            </div>
          </header>
        </div>
      )}

      {/* Mobile Quick Action Bar (Visible only on Mobile) */}
      {!isImmersiveView && (
        <div className="md:hidden flex items-center justify-start gap-1.5 px-3 py-1.5 bg-white/95 dark:bg-slate-900/95 border-b border-gray-200/80 dark:border-slate-800/80 sticky top-14 sm:top-16 z-30 shadow-sm backdrop-blur-md overflow-x-auto no-scrollbar">
           <button 
             onClick={() => toggleView(AppView.CATALOG)}
             className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 transition-all border ${
               currentView === AppView.CATALOG 
                 ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20' 
                 : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
             }`}
           >
              <ImageIcon className="h-3 w-3" />
              <span>ژورنال و کاتالوگ</span>
           </button>
           <button 
             onClick={() => toggleView(AppView.DIELINE_GENERATOR)}
             className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 transition-all border ${
               (currentView as any) === AppView.DIELINE_GENERATOR 
                 ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                 : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
             }`}
           >
              <Box className="h-3 w-3" />
              <span>طراحی قالب</span>
           </button>
           <button 
             onClick={() => toggleView(AppView.SOFTWARE_STORE)}
             className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 transition-all border ${
               currentView === AppView.SOFTWARE_STORE 
                 ? 'bg-indigo-600 text-white border-indigo-500 shadow-md' 
                 : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30'
             }`}
           >
              <Laptop className="h-3 w-3" />
              <span>فروشگاه نرم‌افزار</span>
           </button>
           <button 
             onClick={() => toggleView(AppView.DESIGN_STUDIO)}
             className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black shrink-0 transition-all border ${
               (currentView as any) === AppView.DESIGN_STUDIO 
                 ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
                 : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30'
             }`}
           >
              <Palette className="h-3 w-3" />
              <span>استودیو آنلاین</span>
           </button>
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
              initial={{ x: '100%' }} // RTL: Start from right off-screen (positive x)
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 250, mass: 0.8 }}
              className="md:hidden fixed inset-y-0 right-0 z-50 w-80 bg-white dark:bg-slate-950/98 shadow-2xl p-5 flex flex-col gap-4 overflow-y-auto"
            >
               <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {globalSettings.logoUrl ? (
                      <img src={globalSettings.logoUrl} alt={globalSettings.siteName || "Logo"} className="h-8 w-auto max-w-[120px] object-contain rounded shrink-0" />
                    ) : (
                      <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-base shrink-0">
                        {globalSettings.siteName ? globalSettings.siteName.charAt(0) : 'A'}
                      </div>
                    )}
                    <div className="flex flex-col text-right">
                      <span className="font-extrabold text-sm text-gray-950 dark:text-white leading-tight">
                        {globalSettings.siteName || "اشک قلم"}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">پورتال خدمات و طراحی صنعتی</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)} 
                    className="text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 border border-gray-100 dark:border-slate-800/80 transform hover:rotate-90"
                    title="بستن منو"
                  >
                    <X className="h-4 w-4" />
                  </button>
               </div>

               {/* Active Portal Info Card */}
               <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-2">
                   <div className="p-2 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-xl">
                     <Globe className="h-4 w-4" />
                   </div>
                   <div className="flex flex-col text-right">
                     <span className="text-[9px] text-gray-400 dark:text-gray-500">پورتال فعال فعلی</span>
                     <span className="text-xs font-black text-gray-900 dark:text-white">{getPortalDisplayName(activePortal)}</span>
                   </div>
                 </div>
                 <button 
                   onClick={() => { setIsSiteSwitcherOpen(true); setIsMobileMenuOpen(false); }}
                   className="text-[10px] font-bold bg-primary-600 hover:bg-primary-700 text-white px-2.5 py-1.5 rounded-lg transition-colors"
                 >
                   تغییر پورتال
                 </button>
               </div>

               <nav className="flex flex-col gap-4">
                  {/* Section 1: Design & CAD Tools */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 text-right">
                      ابزارهای هوشمند طراحی و CAD
                    </div>
                    <NavItem view={AppView.HOME} icon={Home} label="صفحه نخست پرتال" />
                    <NavItem view={AppView.DIELINE_GENERATOR} icon={Box} label="جعبه‌ساز ۳D و دایلاین" />
                    <NavItem view={AppView.DESIGN_STUDIO} icon={Palette} label="استودیو آنلاین گرافیک" />
                    <NavItem view={AppView.AUTOCAD_STUDIO} icon={PenTool} label="اتوکد حرفه‌ای CAD" />
                  </div>

                  {/* Section 2: Catalog & Store */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 text-right">
                      محصولات، خدمات و کتابخانه
                    </div>
                    <NavItem view={AppView.SERVICES} icon={Layers} label="خدمات صنعتی و مهندسی" />
                    <NavItem view={AppView.PRODUCTS} icon={Package} label="محصولات و رده‌های بسته‌بندی" />
                    <NavItem view={AppView.CATALOG} icon={ImageIcon} label="ژورنال و کاتالوگ‌های اختصاصی" />
                    <NavItem view={AppView.SOFTWARE_STORE} icon={Laptop} label="فروشگاه نرم‌افزار تخصصی" />
                    <NavItem view={AppView.LIBRARY} icon={Download} label="کتابخانه دیجیتال قالب‌ها" />
                  </div>

                  {/* Section 3: Inquiries & Information */}
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 text-right">
                      ارتباطات و اطلاعات عمومی
                    </div>
                    <NavItem view={AppView.INQUIRY} icon={Grid} label="استعلام سریع قیمت" />
                    <NavItem view={AppView.BLOG} icon={BookOpen} label="وبلاگ و مقالات آموزشی" />
                    <NavItem view={AppView.ABOUT} icon={Users} label="درباره ما و نمایندگی‌ها" />
                  </div>
                  
                  {isAuthenticated && user?.role !== UserRole.ADMIN && (
                    <div className="flex flex-col gap-1.5">
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 text-right">
                        کنترل پنل کاربری
                      </div>
                      <NavItem view={AppView.DASHBOARD} icon={Users} label="داشبورد کاربری" />
                    </div>
                  )}
               </nav>

               <div className="mt-auto flex flex-col gap-3 border-t border-gray-150 dark:border-slate-800/80 pt-4">
                {isAuthenticated ? (
                  <button onClick={() => { logout(); navigate('/'); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 px-3 py-2.5 text-red-500 w-full hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-bold text-xs transition-colors">
                    <LogOut className="h-4 w-4" /> خروج از حساب
                  </button>
                ) : (
                  <button onClick={() => { openLoginModal(); setIsMobileMenuOpen(false); }} className="flex items-center justify-center gap-2 px-3 py-2.5 text-white font-bold w-full bg-primary-600 hover:bg-primary-500 rounded-xl shadow-md transition-colors text-xs">
                    <LogIn className="h-4 w-4" /> ورود / ثبت‌نام در پرتال
                  </button>
                )}

                {/* Promotional Card at the bottom with Help Button '؟' Integration */}
                <div className="bg-gradient-to-br from-indigo-50/50 to-primary-50/50 dark:from-slate-900 dark:to-slate-950 p-3 rounded-2xl border border-indigo-100/30 dark:border-slate-800/80 text-center shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-16 h-16 bg-indigo-500/5 rounded-br-full"></div>
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-1.5 text-primary-500">
                       <Sparkles className="w-4 h-4" />
                    </div>
                    <h4 className="font-extrabold text-indigo-900 dark:text-indigo-200 text-xs mb-0.5">اشک قلم</h4>
                    <p className="text-[10px] text-indigo-600/80 dark:text-indigo-300/80 font-medium leading-relaxed mb-2">
                      هنر در خدمت صنعت، طراحی تا چاپ
                    </p>
                    <button 
                      onClick={() => { setShowHelpModal(true); setIsMobileMenuOpen(false); }}
                      className="w-full py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-black rounded-lg transition-all flex items-center justify-center gap-1 border border-indigo-500/25 cursor-pointer"
                    >
                      <span>؟</span>
                      <span>راهنمای جامع هوشمند</span>
                    </button>
                  </div>
                </div>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Welcome Notification Modal with Dedicated IT Section */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-gray-100 dark:border-gray-800 text-right dir-rtl font-sans"
            >
               {/* Decorative Background */}
               <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-bl-[120px] -z-0 pointer-events-none"></div>
               <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
               
               <div className="relative z-10 text-center">
                  <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 via-primary-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-xl shadow-indigo-500/30">
                     <Cpu className="w-8 h-8 animate-pulse text-indigo-100" />
                  </div>
                  
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[11px] font-black px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800/50 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>واحد فناوری اطلاعات اشک قلم (IT & CAD Development)</span>
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">
                     {globalSettings.welcomeTitle || 'پرتال جامع مهندسی چاپ و بسته‌بندی اشک قلم'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                     {globalSettings.welcomeSubtitle || 'مجهز به موتورهای محاسباتی کاملاً آفلاین و ابزارهای صنعتی CAD، استودیو سه‌بعدی و مرکز نرم‌افزارهای تخصصی کارتن و جعبه.'}
                  </p>
                  
                  {/* Dedicated 3-Column Core Features with IT Division */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 text-right">
                     <div 
                       onClick={() => { handleCloseWelcome(); toggleView(AppView.SOFTWARE_STORE); }}
                       className="bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/50 cursor-pointer transition-all group"
                     >
                        <div className="flex items-center justify-between mb-2">
                          <Cpu className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md">آفلاین</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-gray-900 dark:text-white">نرم‌افزارهای صنعتی</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">کاتالوگ و لایسنس ابزارهای CAD</p>
                     </div>

                     <div 
                       onClick={() => { handleCloseWelcome(); toggleView(AppView.DIELINE_GENERATOR); }}
                       className="bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/70 dark:hover:bg-blue-900/40 p-3.5 rounded-2xl border border-blue-200/60 dark:border-blue-800/50 cursor-pointer transition-all group"
                     >
                        <div className="flex items-center justify-between mb-2">
                          <Box className="w-5 h-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black bg-blue-500 text-white px-1.5 py-0.5 rounded-md">CAD</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-gray-900 dark:text-white">{globalSettings.welcomeBoxTitle || 'جعبه‌ساز 3D'}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">{globalSettings.welcomeBoxDesc || 'طراحی تیغ و خروجی لیزر'}</p>
                     </div>

                     <div 
                       onClick={() => { handleCloseWelcome(); toggleView(AppView.DESIGN_STUDIO); }}
                       className="bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/50 cursor-pointer transition-all group"
                     >
                        <div className="flex items-center justify-between mb-2">
                          <Palette className="w-5 h-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                          <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-md">گرافیک</span>
                        </div>
                        <h4 className="font-extrabold text-xs text-gray-900 dark:text-white">{globalSettings.welcomeStudioTitle || 'استودیو آنلاین'}</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 leading-tight">{globalSettings.welcomeStudioDesc || 'طراحی لایه باز وکتور'}</p>
                     </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button 
                      onClick={() => { handleCloseWelcome(); toggleView(AppView.SOFTWARE_STORE); }}
                      className="w-full sm:w-1/2 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                    >
                      <Cpu className="w-4 h-4" />
                      <span>مرکز نرم‌افزارهای IT اشک قلم</span>
                    </button>

                    <Button onClick={handleCloseWelcome} className="w-full sm:w-1/2 h-11 text-xs sm:text-sm shadow-xl shadow-primary-500/20">
                      {globalSettings.welcomeCtaText || 'ورود به پرتال اصلی'}
                    </Button>
                  </div>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Main Content */}
      <main className={`flex-1 w-full ${(isImmersiveView || currentView === AppView.HOME || currentView === AppView.CATALOG) ? 'max-w-none px-0' 
          : 'max-w-7xl mx-auto px-4 md:px-8'
      }`}>
        <Routes>
          <Route path="/" element={
            <>
              <SeoHead view={AppView.HOME} canonicalPath="/" />
              <ThreeDProductSlider onNavigate={toggleView} />
              
              <div id="catalog-section" className="w-full">
                 <CatalogSection />
              </div>

              <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12">
                <SmartPortfolio isEmbedded={true} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
                  <Card className="text-center hover:-translate-y-1 transition-transform duration-300" iconName="Grid" iconColor="blue" title="کاتالوگ هوشمند">
                    <p className="text-gray-500 text-sm">انتخاب محصول با کمک هوش مصنوعی و مشاهده سه بعدی</p>
                  </Card>
                  <Card className="text-center hover:-translate-y-1 transition-transform duration-300" iconName="Phone" iconColor="green" title="پشتیبانی ۲۴ ساعته">
                    <p className="text-gray-500 text-sm">پاسخگویی سریع از طریق چت، واتس‌اپ و تماس تلفنی</p>
                  </Card>
                  <Card className="text-center hover:-translate-y-1 transition-transform duration-300" iconName="CheckCircle" iconColor="purple" title="تضمین کیفیت">
                    <p className="text-gray-500 text-sm">کنترل کیفیت چند مرحله‌ای و گارانتی چاپ</p>
                  </Card>
                </div>
                
                <LatestBlogSection onViewAll={() => toggleView(AppView.BLOG)} />
              </div>
            </>
          } />
          <Route path="/inquiry" element={<><SeoHead view={AppView.INQUIRY} canonicalPath="/inquiry" /><Inquiry /></>} />
          <Route path="/catalog" element={<><SeoHead view={AppView.CATALOG} canonicalPath="/catalog" /><CatalogSection /></>} />
          <Route path="/catalog/:slug" element={<CatalogItemPage />} />
          <Route path="/portfolio" element={<SmartPortfolio />} />
          <Route path="/portfolio/:slug" element={<SmartPortfolio />} />
          <Route path="/services" element={<ServicesHub />} />
          <Route path="/services/:slug" element={<ServicesHub />} />
          <Route path="/products" element={<ProductsHub />} />
          <Route path="/products/:slug" element={<ProductsHub />} />
          <Route path="/tools/dieline" element={<><SeoHead view={AppView.DIELINE_GENERATOR} canonicalPath="/tools/dieline" /><DielineGenerator onSaveProject={handleSaveProject} /></>} />
          <Route path="/dieline" element={<Navigate to="/tools/dieline" replace />} />
          <Route path="/tools/design-studio" element={<><SeoHead view={AppView.DESIGN_STUDIO} canonicalPath="/tools/design-studio" /><DesignStudio isDarkMode={isDarkMode} /></>} />
          <Route path="/design-studio" element={<Navigate to="/tools/design-studio" replace />} />
          <Route path="/tools/autocad" element={<><SeoHead view={AppView.AUTOCAD_STUDIO} canonicalPath="/tools/autocad" /><AutoCADStudio onExit={() => navigate('/')} /></>} />
          <Route path="/autocad" element={<Navigate to="/tools/autocad" replace />} />
          <Route path="/software" element={
            <>
              <SeoHead view={AppView.SOFTWARE_STORE} canonicalPath="/software" />
              <SoftwareMarketplace 
                onBackToHome={() => navigate('/')} 
                onNavigateToDieline={() => navigate('/tools/dieline')} 
              />
            </>
          } />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<Blog />} />
          <Route path="/about" element={<><SeoHead view={AppView.ABOUT} canonicalPath="/about" /><AboutUs /></>} />
          <Route path="/library" element={<><SeoHead view={AppView.LIBRARY} canonicalPath="/library" /><Library /></>} />
          <Route path="/dashboard" element={
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
          } />
          <Route path="/admin" element={
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
          } />
          <Route path="/admin-panel" element={<Navigate to="/admin" replace />} />
          <Route path="/b2b" element={<Navigate to="/services" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isImmersiveView && (
        <>
          <Footer setView={toggleView} />
          <ContactFloaters />
          <ChatWidget />
        </>
      )}
      {/* Ashk Software Division Notification Floating Window (Upgraded) */}
      <AnimatePresence>
        {showItNotification && (
          isItNotifMinimized ? (
            /* Minimized Floating Widget */
            <motion.div
              key="minimized-it-toast"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              onClick={() => setIsItNotifMinimized(false)}
              className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/40 text-white rounded-2xl px-3.5 py-2.5 shadow-2xl flex items-center gap-2.5 cursor-pointer backdrop-blur-xl hover:scale-105 transition-all group font-sans dir-rtl"
              title="باز کردن ویترین نرم‌افزارها"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center relative">
                <Laptop className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-indigo-300 block">فروشگاه نرم‌افزار</span>
                <span className="text-[9px] text-slate-400 block">حسابداری • حواله • اندروید</span>
              </div>
            </motion.div>
          ) : (
            /* Full Floating Window */
            <motion.div
              key="full-it-toast"
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 text-white rounded-3xl p-5 shadow-2xl flex flex-col gap-3 font-sans dir-rtl text-right backdrop-blur-xl shadow-indigo-950/60"
              id="ashk-it-toast"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner relative">
                    <Laptop className="w-6 h-6 text-indigo-300" />
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-black border border-indigo-400/20">مرکز نرم‌افزار اشک قلم</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold">نسخه‌های آفلاین</span>
                    </div>
                    <h4 className="font-extrabold text-sm text-white mt-1">
                      سامانه جامع نرم‌افزارها
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Smart Help Button */}
                  <button
                    onClick={() => setShowItNotifHelp(!showItNotifHelp)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                    title="راهنمای بخش نرم‌افزار"
                  >
                    ?
                  </button>

                  {/* Minimize Button */}
                  <button
                    onClick={() => setIsItNotifMinimized(true)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs transition-colors cursor-pointer"
                    title="کوچک‌سازی پنجره"
                  >
                    _
                  </button>

                  {/* Close Button */}
                  <button
                    onClick={() => setShowItNotification(false)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                    title="بستن پنجره"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Smart Help Overlay if active */}
              {showItNotifHelp && (
                <div className="p-2.5 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 text-[11px] text-indigo-200 leading-relaxed space-y-1 animate-in fade-in">
                  <span className="font-bold block text-white">💡 راهنمای فروشگاه نرم‌افزار:</span>
                  <p>در این بخش می‌توانید نرم‌افزارهای حسابداری و مالیاتی، سامانه‌های هوشمند حواله و ارزی، و اپلیکیشن‌های اندروید را به همراه کاتالوگ تصویری، لایسنس و لینک دانلود آفلاین دریافت کنید.</p>
                </div>
              )}

              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                عرضه مستقیم نرم‌افزارهای تخصصی حسابداری، سامانه‌های مدیریت حواله و ارزی، و اپلیکیشن‌های کاربردی اندروید با لایسنس رسمی و امنیت تضمین‌شده آفلاین.
              </p>

              {/* Quick Categories Tag Row */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    setShowItNotification(false);
                    toggleView(AppView.SOFTWARE_STORE);
                  }}
                  className="p-1.5 rounded-xl bg-slate-950/70 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/50 text-center transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-indigo-300 font-bold block">🧮 حسابداری</span>
                  <span className="text-[8.5px] text-slate-400 block mt-0.5">مالیات و انبار</span>
                </button>

                <button
                  onClick={() => {
                    setShowItNotification(false);
                    toggleView(AppView.SOFTWARE_STORE);
                  }}
                  className="p-1.5 rounded-xl bg-slate-950/70 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/50 text-center transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-amber-300 font-bold block">💰 حواله و ارزی</span>
                  <span className="text-[8.5px] text-slate-400 block mt-0.5">دفاتر صرافی</span>
                </button>

                <button
                  onClick={() => {
                    setShowItNotification(false);
                    toggleView(AppView.SOFTWARE_STORE);
                  }}
                  className="p-1.5 rounded-xl bg-slate-950/70 hover:bg-indigo-900/40 border border-slate-800 hover:border-indigo-500/50 text-center transition-all cursor-pointer"
                >
                  <span className="text-[10px] text-emerald-300 font-bold block">📱 اندروید</span>
                  <span className="text-[8.5px] text-slate-400 block mt-0.5">همراه و میدانی</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => {
                    setShowItNotification(false);
                    toggleView(AppView.SOFTWARE_STORE);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-primary-600 hover:from-indigo-500 hover:to-primary-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Laptop className="w-4 h-4" />
                  <span>ورود به فروشگاه نرم‌افزار</span>
                </button>
                
                <button
                  onClick={() => {
                    setShowItNotification(false);
                    toggleView(AppView.DIELINE_GENERATOR);
                  }}
                  className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
                  title="جعبه‌ساز 3D"
                >
                  <Box className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBadikaranNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-6 z-50 max-w-sm w-full bg-gradient-to-tr from-emerald-950 via-slate-900 to-emerald-900 border border-emerald-500/30 text-white rounded-2xl p-4 shadow-2xl flex flex-col gap-3 font-sans dir-rtl text-right"
            id="badikaran-news-toast"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center justify-center animate-pulse">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-100">
                    {globalSettings.badikaranNotifTitle || 'خبر جدید پورتال بادیکاران'}
                  </h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">جهت بازدید از مجتمع چاپ بادیکاران توس کلیک کنید</p>
                </div>
              </div>
              <button
                onClick={() => setShowBadikaranNotification(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {globalSettings.badikaranNotifText || 'مرکز صنعتی چاپ افست ۵ رنگ، کارتن‌سازی لمینتی و پوشش‌های UV بادیکاران توس با خدمات تمام‌اتوماتیک آماده ثبت سفارشات شماست.'}
            </p>
            <button
              onClick={() => {
                setShowBadikaranNotification(false);
                if (globalSettings.badikaranPortalUrl?.trim()) {
                  window.location.href = globalSettings.badikaranPortalUrl.trim();
                } else {
                  setActivePortal('badikaran');
                  localStorage.setItem('activePortal', 'badikaran');
                  localStorage.setItem('hasChosenPortal', 'true');
                }
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5"
            >
              <span>ورود به مجتمع چاپ بادیکاران</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <SiteSwitcherModal 
        isOpen={isSiteSwitcherOpen} 
        onClose={() => setIsSiteSwitcherOpen(false)} 
        activePortal={activePortal} 
        onSelectPortal={selectPortal} 
      />

      {/* Floating Smart Guide Button '؟' */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping pointer-events-none"></div>
          <button 
            onClick={() => setShowHelpModal(true)}
            className="relative w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500 text-slate-950 dark:text-slate-950 font-black text-xl rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 dark:shadow-amber-400/20 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer"
            title="راهنمای هوشمند این بخش"
          >
            ؟
          </button>
        </div>
      </div>

      {/* Smart Guide Modal */}
      <AnimatePresence>
        {showHelpModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-slate-100 dark:border-slate-800 text-right dir-rtl"
            >
               <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div className="flex items-center gap-2">
                     <div className="w-8 h-8 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center font-black text-lg">؟</div>
                     <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                        {getHelpContent(currentView).title}
                     </h3>
                  </div>
                  <button 
                     onClick={() => setShowHelpModal(false)}
                     className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                     <X className="h-4 w-4" />
                  </button>
               </div>

               <div className="space-y-4 text-right">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                     {getHelpContent(currentView).desc}
                  </p>

                  <div className="bg-amber-50/50 dark:bg-slate-850 p-4 rounded-2xl border border-amber-100/30 dark:border-slate-800">
                     <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block mb-2 font-black">نکات کلیدی و کاربردی:</span>
                     <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-400 list-disc list-inside pr-1">
                        {getHelpContent(currentView).tips.map((tip, idx) => (
                           <li key={idx} className="leading-relaxed list-none relative pr-4">
                              <span className="absolute right-0 top-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                              {tip}
                           </li>
                        ))}
                     </ul>
                  </div>
               </div>

               <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button 
                     onClick={() => setShowHelpModal(false)}
                     className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-bold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                     متوجه شدم
                  </button>
               </div>
            </motion.div>
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
          <AppContent />
        </ContentProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
