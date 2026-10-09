
import React, { useState } from 'react';
import { useContent } from '../contexts/ContentContext';
import { BlogPost } from '../types';
import { Card, Badge, Button } from './UIComponents';
import { Clock, User, Calendar, ArrowLeft, ChevronRight, Share2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Blog = () => {
  const { blogPosts } = useContent();
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter(post => 
    post.title.includes(searchQuery) || 
    post.content.includes(searchQuery) ||
    post.tags.some(tag => tag.includes(searchQuery))
  );

  if (selectedPost) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in slide-in-from-right-4">
        <button 
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-primary-600 mb-6 transition-colors"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          بازگشت به وبلاگ
        </button>

        <article className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="relative h-64 md:h-96 w-full">
            <img 
              src={selectedPost.imageUrl} 
              alt={selectedPost.title} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-8 text-white">
              <div className="flex gap-2 mb-2">
                {selectedPost.tags.map(tag => (
                  <Badge key={tag} color="blue" className="bg-white/20 text-white border-none backdrop-blur-md">{tag}</Badge>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-black leading-tight mb-4">{selectedPost.title}</h1>
              <div className="flex items-center gap-6 text-sm text-gray-300">
                <span className="flex items-center gap-2"><User className="w-4 h-4"/> {selectedPost.author}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/> {selectedPost.date}</span>
                <span className="flex items-center gap-2"><Clock className="w-4 h-4"/> {selectedPost.readTime} دقیقه مطالعه</span>
              </div>
            </div>
          </div>

          <div className="p-8 md:p-12">
            <div className="prose dark:prose-invert max-w-none">
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-8 border-r-4 border-primary-500 pr-4 italic">
                    {selectedPost.excerpt}
                </p>
                <div className="whitespace-pre-line leading-loose text-justify text-gray-800 dark:text-gray-200">
                    {selectedPost.content}
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
               <div className="flex gap-2">
                  <span className="text-sm text-gray-500">اشتراک‌گذاری:</span>
                  <button className="text-gray-400 hover:text-blue-500"><Share2 className="w-5 h-5"/></button>
               </div>
               <Button onClick={() => setSelectedPost(null)} variant="outline">خواندن مقالات دیگر</Button>
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4">مجله تخصصی چاپ و بسته‌بندی</h1>
        <p className="text-gray-500 max-w-2xl mx-auto">
          آخرین اخبار، مقالات آموزشی و بررسی‌های تخصصی صنعت چاپ را در اینجا بخوانید.
        </p>
      </div>

      <div className="max-w-md mx-auto mb-10 relative">
        <input 
          type="text"
          placeholder="جستجو در مقالات..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-4 pr-12 py-3 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
        />
        <Search className="absolute right-4 top-3.5 h-5 w-5 text-gray-400" />
      </div>

      {filteredPosts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>هیچ مقاله‌ای با این عنوان یافت نشد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post, idx) => (
            <motion.div 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 dark:border-gray-700 flex flex-col h-full"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm flex items-center gap-1">
                   <Clock className="w-3 h-3" /> {post.readTime} دقیقه
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex gap-2 mb-3">
                  {post.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {post.title}
                </h3>
                
                <p className="text-sm text-gray-500 line-clamp-3 mb-6 flex-1">
                  {post.excerpt}
                </p>
                
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-400">{post.date}</span>
                  <button 
                    onClick={() => setSelectedPost(post)}
                    className="text-sm font-bold text-primary-600 flex items-center gap-1 group/btn"
                  >
                    ادامه مطلب <ArrowLeft className="w-4 h-4 transition-transform group-hover/btn:-translate-x-1" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
