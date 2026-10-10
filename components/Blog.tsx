import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useContent } from '../contexts/ContentContext';
import { BlogPost, AppView } from '../types';
import { Badge, Button } from './UIComponents';
import { Clock, User, Calendar, ArrowLeft, ChevronRight, Share2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { findBySlugOrId, toSlug } from '../utils/slugUtils';
import { NotFound } from './NotFound';
import { SeoHead } from './SeoHead';

export const Blog: React.FC = () => {
  const { blogPosts } = useContent();
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);

  // If a slug param is present in URL, find the matching post
  const activePost = slug ? findBySlugOrId(blogPosts, slug) : null;

  // If slug was specified in URL but no matching post exists, render 404
  if (slug && !activePost) {
    return <NotFound />;
  }

  // Single post view (when route is /blog/:slug)
  if (activePost) {
    const postSlug = activePost.id || toSlug(activePost.title);
    const canonical = `/blog/${postSlug}`;

    const handleShare = () => {
      if (typeof window !== 'undefined') {
        navigator.clipboard?.writeText(window.location.href);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2500);
      }
    };

    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in slide-in-from-right-4 font-sans dir-rtl text-right">
        {/* Dynamic SEO metadata for specific blog post */}
        <SeoHead 
          view={AppView.BLOG}
          canonicalPath={canonical}
          customTitle={`${activePost.title} | مجله تخصصی اشک قلم`}
          customDescription={activePost.excerpt || activePost.title}
          noIndex={false}
        />

        {/* Breadcrumb / Back button */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => navigate('/blog')}
            className="flex items-center gap-2 text-gray-500 hover:text-primary-600 transition-colors text-sm font-bold cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>بازگشت به فهرست مقالات</span>
          </button>
          
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link to="/" className="hover:text-primary-600">خانه</Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-primary-600">وبلاگ</Link>
            <span>/</span>
            <span className="text-gray-700 dark:text-gray-300 font-bold truncate max-w-[200px]">{activePost.title}</span>
          </div>
        </div>

        <article className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl border border-gray-150 dark:border-gray-700">
          <div className="relative h-64 md:h-96 w-full">
            <img 
              src={activePost.imageUrl} 
              alt={activePost.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-8 text-white">
              <div className="flex flex-wrap gap-2 mb-3">
                {activePost.tags.map(tag => (
                  <Badge key={tag} color="blue" className="bg-white/20 text-white border-none backdrop-blur-md text-xs font-bold">{tag}</Badge>
                ))}
              </div>
              <h1 className="text-2xl md:text-3xl font-black leading-tight mb-4 text-white drop-shadow-sm">{activePost.title}</h1>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-gray-300">
                <span className="flex items-center gap-1.5"><User className="w-4 h-4"/> {activePost.author}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> {activePost.date}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4"/> {activePost.readTime} دقیقه مطالعه</span>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10">
            <div className="prose dark:prose-invert max-w-none">
              {activePost.excerpt && (
                <p className="text-base font-medium text-gray-600 dark:text-gray-300 mb-8 border-r-4 border-primary-500 pr-4 italic leading-relaxed">
                  {activePost.excerpt}
                </p>
              )}
              <div className="whitespace-pre-line leading-loose text-justify text-gray-800 dark:text-gray-200 text-sm sm:text-base">
                {activePost.content}
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">اشتراک‌گذاری:</span>
                <button 
                  onClick={handleShare}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="کپی لینک مقاله"
                >
                  <Share2 className="w-4 h-4"/>
                  <span>{copiedShare ? 'لینک کپی شد!' : 'کپی لینک'}</span>
                </button>
              </div>
              <Button onClick={() => navigate('/blog')} variant="outline" className="text-xs">
                خواندن مقالات دیگر
              </Button>
            </div>
          </div>
        </article>
      </div>
    );
  }

  // Blog archive list view (when route is /blog)
  const filteredPosts = blogPosts.filter(post => 
    post.title.includes(searchQuery) || 
    post.content.includes(searchQuery) ||
    post.tags.some(tag => tag.includes(searchQuery))
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 font-sans dir-rtl text-right">
      <SeoHead 
        view={AppView.BLOG}
        canonicalPath="/blog"
        customTitle="مجله تخصصی چاپ و بسته‌بندی | اشک قلم"
        customDescription="آخرین مقالات آموزشی درباره استانداردهای چاپ افست ۵ رنگ، بسته‌بندی هوشمند، ساخت دایلاین و تکنولوژی‌های جدید."
        noIndex={false}
      />

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
          مجله تخصصی چاپ و بسته‌بندی
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-xs sm:text-sm leading-relaxed">
          آخرین اخبار، مقالات آموزشی، راهنماهای فرم‌بندی و بررسی‌های تخصصی صنعت کارتن‌سازی و چاپ را در اینجا بخوانید.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-10 relative">
        <input 
          type="text"
          placeholder="جستجو در مقالات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-12 py-3 rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all text-xs sm:text-sm"
        />
        <Search className="absolute right-4 top-3.5 h-5 w-5 text-gray-400" />
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-750 text-gray-500">
          <p className="text-sm font-bold mb-2">هیچ مقاله‌ای یافت نشد.</p>
          <p className="text-xs text-gray-400">می‌توانید مقالات جدید را از پنل مدیریت هوش مصنوعی تولید و منتشر فرمایید.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, idx) => {
            const postSlug = post.id || toSlug(post.title);
            return (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-150 dark:border-gray-700 flex flex-col h-full"
              >
                <Link to={`/blog/${postSlug}`} className="relative h-48 overflow-hidden block">
                  <img 
                    src={post.imageUrl} 
                    alt={post.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1">
                     <Clock className="w-3 h-3" /> {post.readTime} دقیقه
                  </div>
                </Link>
                
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {post.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[11px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2.5 py-1 rounded-lg">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  
                  <Link to={`/blog/${postSlug}`}>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
                      {post.title}
                    </h3>
                  </Link>
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-6 flex-1 leading-relaxed">
                    {post.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                    <span className="text-xs text-gray-400">{post.date}</span>
                    <Link 
                      to={`/blog/${postSlug}`}
                      className="text-xs font-bold text-primary-600 flex items-center gap-1 group/btn hover:underline"
                    >
                      ادامه مطلب <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
