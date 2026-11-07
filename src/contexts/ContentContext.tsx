import React, { createContext, useContext, useState, useEffect } from 'react';
import { SiteContent, MediaItem, BlogPost, GlobalSettings as SharedGlobalSettings } from '../types';
import { readLocalCmsState, writeLocalCmsState, readLocalCmsAssets, writeLocalCmsAsset, deleteLocalCmsAsset } from '../services/localCmsStorage';

interface ContentAsset { id: string; name: string; data: string; type: string; size: number; }

interface GlobalSettings extends Partial<SharedGlobalSettings> {
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
  updateSiteContent: (arg1: Partial<SiteContent> | string, arg2?: any) => void;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
  assets: ContentAsset[];
  uploadAsset: (file: File, onProgress?: (percent: number) => void) => Promise<ContentAsset | null>;
  deleteAsset: (id: string) => Promise<void>;
  pricingFormula: any;
  updatePricingFormula: (updates: Record<string, any>) => void;
  seoConfigs: any[];
  updateSeoConfig: (view: string, updates: Record<string, any>) => void;
  emergencyConfig: Record<string, any>;
  updateEmergencyConfig: (updates: Record<string, any>) => void;
  saveSettingsToHost: () => Promise<boolean>;
  addBlogPost: (post: BlogPost) => void;
  removeBlogPost: (id: string) => void;
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
    readTime: 6,
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
    readTime: 8,
    tags: ['BCT', 'تست مقاومت', 'مهندسی بسته بندی'],
  },
];

const defaultPricingFormula = {
  standardSheets: [
    { id: '70x100', name: '۷۰×۱۰۰', width: 70, height: 100 },
    { id: '50x70', name: '۵۰×۷۰', width: 50, height: 70 },
    { id: '35x50', name: '۳۵×۵۰', width: 35, height: 50 },
  ],
  defaultMachine: { id: 'offset-70x100', name: 'افست ۷۰×۱۰۰', gripperMargin: 2 },
};

const ContentContext = createContext<ContentContextType>({
  siteContent: defaultSiteContent,
  globalSettings: defaultGlobalSettings,
  portfolioItems: defaultPortfolioItems,
  blogPosts: defaultBlogPosts,
  catalogItems: [],
  updateSiteContent: () => {},
  updateGlobalSettings: () => {},
  assets: [],
  uploadAsset: async () => null,
  deleteAsset: async () => {},
  pricingFormula: defaultPricingFormula,
  updatePricingFormula: () => {},
  seoConfigs: [],
  updateSeoConfig: () => {},
  emergencyConfig: { enabled: false, message: '' },
  updateEmergencyConfig: () => {},
  saveSettingsToHost: async () => false,
  addBlogPost: () => {},
  removeBlogPost: () => {},
});

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteContent, setSiteContent] = useState<SiteContent>(() => readLocalCmsState('ashk_site_content', defaultSiteContent));
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => readLocalCmsState('ashk_global_settings', defaultGlobalSettings));
  const [portfolioItems] = useState<MediaItem[]>(defaultPortfolioItems);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => readLocalCmsState('ashk_blog_posts', defaultBlogPosts));
  const [catalogItems, setCatalogItems] = useState<MediaItem[]>(() => readLocalCmsState('ashk_catalog_items', []));
  const [assets, setAssets] = useState<ContentAsset[]>([]);
  const [pricingFormula, setPricingFormula] = useState<any>(() => readLocalCmsState('ashk_pricing_formula', defaultPricingFormula));
  const [seoConfigs, setSeoConfigs] = useState<any[]>(() => readLocalCmsState('ashk_seo_configs', []));
  const [emergencyConfig, setEmergencyConfig] = useState<Record<string, any>>(() => readLocalCmsState('ashk_emergency_config', { enabled: false, message: '' }));

  useEffect(() => {
    let active = true;
    readLocalCmsAssets()
      .then(storedAssets => { if (active) setAssets(storedAssets); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => { writeLocalCmsState('ashk_site_content', siteContent); }, [siteContent]);
  useEffect(() => { writeLocalCmsState('ashk_global_settings', globalSettings); }, [globalSettings]);
  useEffect(() => { writeLocalCmsState('ashk_blog_posts', blogPosts); }, [blogPosts]);
  useEffect(() => { writeLocalCmsState('ashk_catalog_items', catalogItems); }, [catalogItems]);
  useEffect(() => { writeLocalCmsState('ashk_pricing_formula', pricingFormula); }, [pricingFormula]);
  useEffect(() => { writeLocalCmsState('ashk_seo_configs', seoConfigs); }, [seoConfigs]);
  useEffect(() => { writeLocalCmsState('ashk_emergency_config', emergencyConfig); }, [emergencyConfig]);

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

  const updateSiteContent = (arg1: Partial<SiteContent> | string, arg2?: any) => {
    const updates = typeof arg1 === 'string' ? { [arg1]: arg2 } : arg1;
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
        assets,
        pricingFormula,
        seoConfigs,
        emergencyConfig,
        updateSiteContent,
        updateGlobalSettings,
        updatePricingFormula: (updates: Record<string, any>) => setPricingFormula(prev => ({ ...prev, ...updates })),
        updateSeoConfig: (view: string, updates: Record<string, any>) => setSeoConfigs(prev => {
          const current = prev.find(item => item.view === view);
          return current
            ? prev.map(item => item.view === view ? { ...item, ...updates } : item)
            : [...prev, { view, ...updates }];
        }),
        updateEmergencyConfig: (updates: Record<string, any>) => setEmergencyConfig(prev => ({ ...prev, ...updates })),
        uploadAsset: (file: File, onProgress?: (percent: number) => void) => new Promise<ContentAsset | null>(resolve => {
          const reader = new FileReader();
          reader.onprogress = event => {
            if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
          };
          reader.onload = async () => {
            const asset: ContentAsset = {
              id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: file.name,
              data: String(reader.result || ''),
              type: file.type,
              size: file.size,
            };
            setAssets(prev => [asset, ...prev]);
            try { await writeLocalCmsAsset(asset); } catch { /* Keep this session usable when IndexedDB is unavailable. */ }
            onProgress?.(100);
            resolve(asset);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        }),
        deleteAsset: async (id: string) => {
          setAssets(prev => prev.filter(asset => asset.id !== id));
          try { await deleteLocalCmsAsset(id); } catch { /* Ignore unavailable local storage. */ }
        },
        addBlogPost: (post: BlogPost) => setBlogPosts(prev => [post, ...prev]),
        removeBlogPost: (id: string) => setBlogPosts(prev => prev.filter(post => post.id !== id)),
        saveSettingsToHost: async () => [
          writeLocalCmsState('ashk_site_content', siteContent),
          writeLocalCmsState('ashk_global_settings', globalSettings),
          writeLocalCmsState('ashk_blog_posts', blogPosts),
          writeLocalCmsState('ashk_catalog_items', catalogItems),
          writeLocalCmsState('ashk_pricing_formula', pricingFormula),
          writeLocalCmsState('ashk_seo_configs', seoConfigs),
          writeLocalCmsState('ashk_emergency_config', emergencyConfig),
        ].every(Boolean),
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => useContext(ContentContext);
