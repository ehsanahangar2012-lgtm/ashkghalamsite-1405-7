import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Box, Search, HelpCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 font-sans dir-rtl">
      <SeoHead 
        view={AppView.NOT_FOUND} 
        customTitle="صفحه مورد نظر یافت نشد (۴۰۴) | صنایع چاپ اشک قلم" 
        customDescription="متأسفانه صفحه درخواستی شما در سامانه اشک قلم یافت نشد. برای بازگشت به صفحه اصلی یا دسترسی به ابزارهای چاپ و جعبه‌سازی از دکمه‌های زیر استفاده کنید."
        noIndex={true} 
      />
      <div className="w-20 h-20 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-4xl mb-6 shadow-inner">
        ۴۰۴
      </div>

      <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mb-3">
        صفحه مورد نظر یافت نشد
      </h1>

      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-8 leading-relaxed">
        آدرسی که وارد کرده‌اید یا وجود ندارد یا تغییر یافته است. از طریق لینک‌های زیر می‌توانید به بخش‌های اصلی سامانه اشک قلم بازگردید.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 max-w-md w-full">
        <button
          onClick={() => navigate('/')}
          className="flex-1 min-w-[140px] py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-600/20 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Home className="w-4 h-4" />
          <span>صفحه اصلی</span>
        </button>

        <button
          onClick={() => navigate('/catalog')}
          className="flex-1 min-w-[140px] py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>کاتالوگ ۳D</span>
        </button>

        <button
          onClick={() => navigate('/tools/dieline')}
          className="flex-1 min-w-[140px] py-2.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Box className="w-4 h-4" />
          <span>جعبه‌ساز ۳D</span>
        </button>

        <button
          onClick={() => navigate('/inquiry')}
          className="flex-1 min-w-[140px] py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>استعلام قیمت</span>
        </button>
      </div>

      {/* Floating Smart Guide Button '؟' */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping pointer-events-none"></div>
          <button 
            onClick={() => setShowHelp(true)}
            className="relative w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-xl rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="راهنمای ناوبری ۴۰۴"
          >
            ؟
          </button>
        </div>
      </div>

      {/* Smart Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
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
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای یافتن صفحات</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                مسیر درخواستی در سامانه تعریف نشده است. می‌توانید با کلیک روی هر یک از دکمه‌های بالا مستقیماً به صفحه اصلی، کاتالوگ یا جعبه‌ساز سه‌بعدی هدایت شوید.
              </p>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                متوجه شدم
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
