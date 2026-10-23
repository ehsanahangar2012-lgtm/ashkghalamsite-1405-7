import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteContent, MediaItem, BlogPost } from '../types';

interface GlobalSettings {
  siteName: string;
  primaryColor: string;
  enableAutoSave: boolean;
  contactPhone: string;
  contactEmail: string;
  address: string;
  heroBadge?: string;
  heroHeadline?: string;
}

interface ContentContextType {
  siteContent: SiteContent;
  globalSettings: GlobalSettings;
  portfolioItems: MediaItem[];
  blogPosts: BlogPost[];
  catalogItems: MediaItem[];
  updateSiteContent: (updates: Partial<SiteContent>) => void;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
}

const defaultSiteContent: SiteContent = {
  heroTitle: 'اشک قلم؛ مهندسی نوین صنایع چاپ و بسته‌بندی کارتن',
  heroSubtitle: 'طراحی تخصصی قالب دایکات، تیغ‌زنی، ماکت‌سازی سه‌بعدی و محاسبات بهینه شیت',
  heroDescription: 'سامانه یکپارچه CAD/CAM طراحی کارتن و جعبه با موتور محاسبات دقیق صنعتی، کاتالوگ دیجیتال تعاملی و ابزارهای هوش مصنوعی تولید بسته‌بندی.',
  heroBackgroundUrl: '',
  footerAbout: 'مجتمع صنایع چاپ و بسته‌بندی اشک قلم، پیشرو در نوآوری ساختار کارتن، طراحی مهندسی دایکات و چاپ افست مدرن.',
  contactPhone: '۰۲۱-۵۵۰۰۰۰۰۰',
  contactEmail: 'info@ashkghalam.ir',
  contactAddress: 'تهران، شهرک صنعتی، مجتمع چاپ اشک قلم',
  workingHours: 'شنبه تا چهارشنبه ۸:۰۰ الی ۱۷:۰۰',
};

const defaultGlobalSettings: GlobalSettings = {
  siteName: 'اشک قلم - استودیو CAD و مهندسی کارتن',
  primaryColor: '#f59e0b',
  enableAutoSave: true,
  contactPhone: '۰۲۱-۵۵۰۰۰۰۰۰',
  contactEmail: 'info@ashkghalam.ir',
  address: 'تهران، مجتمع چاپ اشک قلم',
  heroBadge: 'نسخه ۳.۹.۱ - موتور اختصاصی CAD',
  heroHeadline: 'مهندسی پیشرفته جعبه و کارتن',
};

const defaultPortfolioItems: MediaItem[] = [
  {
    id: 1,
    title: 'کارتن چهار درب استاندارد FEFCO 0201',
    category: 'کارتن مادر',
    description: 'طراحی مقاومتی پنج‌لایه با مقاومت لهیدگی ECT بالا مناسب بارهای صادراتی.',
    img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80',
    date: '۱۴۰۳/۰۸/۱۰',
  },
  {
    id: 2,
    title: 'جعبه کیبوردی قفل‌دار خودبست FEFCO 0427',
    category: 'جعبه پستی و ای‌کامرس',
    description: 'طراحی قالب با بست بدون نیاز به چسب، مناسب ارسال کالاهای آنلاین و قطعات حساس.',
    img: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80',
    date: '۱۴۰۳/۰۹/۰۱',
  },
  {
    id: 3,
    title: 'استند رومیزی و جعبه نمایشگاهی کاتالوگ',
    category: 'استند و تبلیغات',
    description: 'ساختار تقویت شده با پوشش سلفون مات و یووی موضعی جهت معرفی محصول در شلف فروشگاه.',
    img: 'https://images.unsplash.com/photo-1507842229451-7f01be8610ce?auto=format&fit=crop&w=800&q=80',
    date: '۱۴۰۳/۰۹/۱۵',
  },
];

const defaultBlogPosts: BlogPost[] = [
  {
    id: 'post-1',
    title: 'راهنمای جامع استاندارد بین‌المللی کدهای FEFCO در طراحی جعبه',
    slug: 'fefco-carton-standards-guide',
    excerpt: 'چگونه بهترین کد استاندارد را برای محصول خود بر اساس وزن و ابعاد انتخاب کنیم.',
    content: 'کدهای استاندارد ففکو (FEFCO) زبان مشترک طراحان و تولیدکنندگان کارتن در سرتاسر جهان است...',
    date: '۱۴۰۳/۰۹/۱۰',
    author: 'واحد فنی و تحقیق و توسعه اشک قلم',
    readTime: '۶ دقیقه',
    tags: ['FEFCO', 'طراحی کارتن', 'دایکات'],
  },
  {
    id: 'post-2',
    title: 'محاسبه ضریب مقاومت فشاری BCT و مقایسه کرافت و تست لاینر',
    slug: 'box-compression-test-bct-calculation',
    excerpt: 'تاثیر رطوبت محیط و ضخامت فلوت (B, C, E) بر باربری جعبه در انبارداری.',
    content: 'برای اطمینان از چیدمان ستونی کارتن‌ها روی پالت، محاسبه تست BCT حیاتی است...',
    date: '۱۴۰۳/۰۹/۲۰',
    author: 'مهندسی متریال اشک قلم',
    readTime: '۸ دقیقه',
    tags: ['BCT', 'تست مقاومت', 'مهندسی بسته بندی'],
  },
];

const ContentContext = createContext<ContentContextType>({
  siteContent: defaultSiteContent,
  globalSettings: defaultGlobalSettings,
  portfolioItems: defaultPortfolioItems,
  blogPosts: defaultBlogPosts,
  catalogItems: [],
  updateSiteContent: () => {},
  updateGlobalSettings: () => {},
});

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteContent, setSiteContent] = useState<SiteContent>(defaultSiteContent);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(defaultGlobalSettings);
  const [portfolioItems] = useState<MediaItem[]>(defaultPortfolioItems);
  const [blogPosts] = useState<BlogPost[]>(defaultBlogPosts);
  const [catalogItems, setCatalogItems] = useState<MediaItem[]>([]);

  useEffect(() => {
    // Attempt to load catalogs from server endpoint if available
    fetch('/api/catalogs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCatalogItems(data);
        }
      })
      .catch(() => {});
  }, []);

  const updateSiteContent = (updates: Partial<SiteContent>) => {
    setSiteContent(prev => ({ ...prev, ...updates }));
  };

  const updateGlobalSettings = (updates: Partial<GlobalSettings>) => {
    setGlobalSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <ContentContext.Provider
      value={{
        siteContent,
        globalSettings,
        portfolioItems,
        blogPosts,
        catalogItems,
        updateSiteContent,
        updateGlobalSettings,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => useContext(ContentContext);
