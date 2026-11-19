import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  SiteContent,
  MediaItem,
  BlogPost,
  UploadedAsset,
  SeoConfig,
  EmergencyConfig,
  PricingFormula,
  CustomPageItem,
  ManagedProductItem,
  ManagedServiceItem,
} from '../types';
import { createPackageSvgDataUrl } from '../utils/packagePreviewSvg';

interface GlobalSettings {
  siteName: string;
  primaryColor: string;
  enableAutoSave: boolean;
  contactPhone: string;
  contactEmail: string;
  address: string;
  heroBadge?: string;
  heroHeadline?: string;
  [key: string]: any;
}

export const DEFAULT_MANAGED_PRODUCTS: ManagedProductItem[] = [
  {
    id: 'prod-fefco-0201',
    slug: 'fefco-0201-standard-box',
    code: 'FEFCO 0201',
    title: 'کارتن مادر چهار درب استاندارد (FEFCO 0201)',
    category: 'کارتن‌های صنعتی',
    inquiryBoxType: 'کارتن چهار درب (FEFCO 0201)',
    inquiryFlute: 'فلوت B (سه لایه استاندارد)',
    defaultDims: '40x30x25',
    specs: ['فلوت B / C / پنج لایه BC', 'تحمل ستونی BCT بالا', 'چاپ فلکسو یا لمینت افست'],
    tone: '#b45309',
    description: 'کارتن‌های حمل بار عمومی با ورق‌های ۳ لایه و ۵ لایه، مناسب انبارداری، صادرات، صنایع غذایی و لوازم خانگی.',
    isPublished: true,
  },
  {
    id: 'prod-fefco-0427',
    slug: 'fefco-0427-mailer-box',
    code: 'FEFCO 0427',
    title: 'جعبه کیبوردی خودبست پستی (FEFCO 0427)',
    category: 'جعبه‌های ای‌کامرس',
    inquiryBoxType: 'جعبه کیبوردی قفل‌دار (FEFCO 0427)',
    inquiryFlute: 'فلوت E (ظریف و لمینتی)',
    defaultDims: '25x18x8',
    specs: ['فلوت E ظریف یا ایندربرد', 'دیواره جانبی دوبل بدون چسب', 'ایده‌آل فروشگاه‌های آنلاین'],
    tone: '#1d4ed8',
    description: 'طراحی مقاوم دولایه با زبانه قفل شونده بدون نیاز به چسب، مناسب پوشاک، لوازم الکترونیکی، هدایا و آرایشی.',
    isPublished: true,
  },
  {
    id: 'prod-diecut-tray',
    slug: 'diecut-tray-boxes',
    code: 'DIE-TRAY',
    title: 'سینی کارتن و استند میوه صادراتی (Tray)',
    category: 'صادرات و تره‌بار',
    inquiryBoxType: 'کارتن چهار درب (FEFCO 0201)',
    inquiryFlute: 'فلوت BC (پنج لایه سنگین صادراتی)',
    defaultDims: '50x35x14',
    specs: ['مقاوم در برابر رطوبت سردخانه', 'قفل گوشه چیدمان کانتینری', 'دریچه تهویه لیزری'],
    tone: '#047857',
    description: 'مقاومت بالا در سردخانه با کاغذهای لاینر مقاوم به رطوبت و قابلیت چیدمان ستونی روی پالت‌های کانتینری.',
    isPublished: true,
  },
  {
    id: 'prod-hardbox',
    slug: 'magnetic-luxury-hardbox',
    code: 'HARDBOX',
    title: 'هاردباکس مگنتی و جعبه لوکس صادراتی',
    category: 'بسته‌بندی لوکس و زعفران',
    inquiryBoxType: 'هاردباکس مگنتی و لوکس',
    inquiryFlute: 'مقوای ایندربرد / گلاسه',
    defaultDims: '22x16x9',
    specs: ['مقوای سخت ۲ تا ۳ میلی‌متر', 'روکش مخملی یا گلاسه + طلاکوب', 'درب مگنتی + فوم برش‌خورده'],
    tone: '#7c3aed',
    description: 'جعبه سخت لوکس برای زعفران، عطر، جواهرات و پکیج‌های هدیه مدیریتی با جزئیات چاپ ویژه.',
    isPublished: true,
  },
];

export const DEFAULT_MANAGED_SERVICES: ManagedServiceItem[] = [
  {
    id: 'svc-diecut',
    slug: 'die-cutting-engineering',
    title: 'مهندسی قالب دایکات و ساخت تیغ لیزری',
    badge: 'Precision CAD',
    specs: ['تلورانس خط تا ±۰.۱۵ میلی‌متر', 'پشتیبانی کامل Bobst و فکی', 'خروجی DXF و AutoCAD'],
    description: 'طراحی تخصصی قالب‌های تخت و روتاری با خطوط تا (Crease) و برش (Cut) مهندسی‌شده برای جعبه‌های صادراتی، دارویی و صنعتی.',
    toolPath: '/tools/dieline',
    toolLabel: 'ورود به مهندسی دایلاین ۳D',
    iconName: 'Scissors',
    isPublished: true,
  },
  {
    id: 'svc-offset',
    slug: 'offset-printing',
    title: 'چاپ افست کارتن و لمینت تا ابعاد شیت بزرگ',
    badge: 'Offset 5-Color',
    specs: ['شیت تا ۱۰۰×۷۰ و فوق بزرگ', 'سلفون مات/براق، UV موضعی و طلاکوب', 'چیدمان بهینه فرم زینک'],
    description: 'چاپ ۵ رنگ همزمان با دقت رنگ CMYK و پنتون، پوشش ورنی پایه آب، سلفون مات و براق، و خدمات تکمیلی طلاکوب و برجسته‌سازی.',
    toolPath: '/tools/design-studio',
    toolLabel: 'ورود به استودیو طراحی و چاپ',
    iconName: 'Printer',
    isPublished: true,
  },
  {
    id: 'svc-corrugated',
    slug: 'corrugated-packaging',
    title: 'تولید ورق و کارتن ۳ لایه و ۵ لایه صنعتی',
    badge: 'E / B / C / BC Flute',
    specs: ['محاسبه آنلاین مقاومت فشاری BCT', 'تست رطوبت سردخانه و کانتینر', 'ورق کرافت، تست لاینر و سفید'],
    description: 'تولید انواع کارتن مادر، سینی میوه صادراتی و جعبه‌های ای‌کامرس با کنترل مهندسی ضریب ایمنی چیدمان پالت و حمل دریایی.',
    toolPath: '/tools/dieline',
    toolLabel: 'محاسبه مقاومت BCT و قالب',
    iconName: 'Box',
    isPublished: true,
  },
  {
    id: 'svc-3dcad',
    slug: 'structural-3d-cad',
    title: 'مدل‌سازی سه‌بعدی تعاملی و ماکت قبل از تیراژ',
    badge: 'Interactive PBR 3D',
    specs: ['پیش‌نمایش تاشدن در زوایای ۳۶۰°', 'تست فیزیکی تناسب ابعاد', 'نمونه‌سازی سریع برش پلاتر'],
    description: 'بررسی دقیق فیتینگ محصول داخل جعبه و رندر سه‌بعدی متریال کرافت و ایندربرد در مرورگر پیش از ساخت قالب و شروع تیراژ.',
    toolPath: '/tools/autocad',
    toolLabel: 'ورود به کارگاه CAD',
    iconName: 'Cpu',
    isPublished: true,
  },
];

interface ContentContextType {
  siteContent: SiteContent;
  globalSettings: GlobalSettings;
  portfolioItems: MediaItem[];
  blogPosts: BlogPost[];
  catalogItems: MediaItem[];
  pricingFormula: PricingFormula;
  seoConfigs: SeoConfig[];
  assets: UploadedAsset[];
  emergencyConfig: EmergencyConfig;
  customPages: CustomPageItem[];
  managedProducts: ManagedProductItem[];
  managedServices: ManagedServiceItem[];
  updateSiteContent: (arg1: any, arg2?: any) => void;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
  updatePricingFormula: (updates: Partial<PricingFormula>) => void;
  updateSeoConfig: (key: any, val?: any) => void;
  updateEmergencyConfig: (cfg: EmergencyConfig) => void;
  addBlogPost: (post: BlogPost) => void;
  removeBlogPost: (id: string) => void;
  updateBlogPostStatus: (id: string, status: 'draft' | 'published' | 'rejected') => Promise<void>;
  refreshPosts: () => Promise<void>;
  uploadAsset: (asset: any, onProgress?: (percent: number) => void) => Promise<UploadedAsset | null>;
  deleteAsset: (id: string) => Promise<boolean>;
  saveSettingsToHost: () => Promise<boolean>;
  upsertCustomPage: (page: CustomPageItem) => Promise<void>;
  deleteCustomPage: (id: string) => Promise<void>;
  upsertManagedProduct: (prod: ManagedProductItem) => Promise<void>;
  deleteManagedProduct: (id: string) => Promise<void>;
  upsertManagedService: (svc: ManagedServiceItem) => Promise<void>;
  deleteManagedService: (id: string) => Promise<void>;
  [key: string]: any;
}

const defaultSiteContent: SiteContent = {
  heroTitle: 'اشک قلم؛ مهندسی نوین صنایع چاپ و بسته‌بندی کارتن',
  heroSubtitle: 'طراحی تخصصی قالب دایکات، تیغ‌زنی، ماکت‌سازی سه‌بعدی و محاسبات بهینه شیت',
  heroDescription: 'سامانه یکپارچه CAD/CAM طراحی کارتن و جعبه با موتور محاسبات دقیق صنعتی، کاتالوگ دیجیتال تعاملی و ابزارهای کاملاً آفلاین تولید بسته‌بندی.',
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
  heroBadge: 'نسخه ۳.۱۴.۰ - موتور اختصاصی CAD',
  heroHeadline: 'مهندسی پیشرفته جعبه و کارتن',
  badikaranPortalTitle: 'مجتمع چاپ و بسته‌بندی بادیکاران توس',
  badikaranPortalUrl: 'https://badikaran.ir',
  badikaranNotifEnabled: true,
};

const defaultPricingFormula: PricingFormula = {
  defaultMachine: {
    name: 'Heidelberg Speedmaster CD 102',
    maxSheetSize: { w: 102, h: 72 },
    minSheetSize: { w: 34, h: 48 },
    gripperMargin: 1.2,
    plateCost: 650000,
    setupCost: 1200000,
    runCostPer1000: 480000,
  },
  standardSheets: [
    { id: 'sh-70x100', name: 'شیت کامل ۷۰×۱۰۰ سانتی‌متر', width: 100, height: 70 },
    { id: 'sh-50x70', name: 'نصف شیت ۵۰×۷۰ سانتی‌متر', width: 70, height: 50 },
    { id: 'sh-60x90', name: 'شیت صنعتی ۶۰×۹۰ سانتی‌متر', width: 90, height: 60 },
  ],
  papers: [
    {
      id: 'inderboard',
      name: 'ایندربرد بهداشتی (SBS)',
      weights: [
        { grammage: 250, pricePerKg: 98000 },
        { grammage: 300, pricePerKg: 105000 },
        { grammage: 350, pricePerKg: 112000 },
      ],
    },
    {
      id: 'kraft',
      name: 'کرافت قهوه‌ای وارداتی',
      weights: [
        { grammage: 250, pricePerKg: 89000 },
        { grammage: 300, pricePerKg: 94000 },
        { grammage: 350, pricePerKg: 102000 },
      ],
    },
    {
      id: 'duplex',
      name: 'پشت طوسی (Duplex)',
      weights: [
        { grammage: 280, pricePerKg: 72000 },
        { grammage: 350, pricePerKg: 79000 },
      ],
    },
  ],
  finishes: [
    { id: 'matte-lam', name: 'سلفون مات حرارتی', type: 'unit', price: 6500 },
    { id: 'gloss-lam', name: 'سلفون براق', type: 'unit', price: 5800 },
    { id: 'spot-uv', name: 'یووی موضعی برجسته', type: 'unit', price: 9200 },
    { id: 'gold-foil', name: 'طلاکوب داغ (Hot Foil)', type: 'unit', price: 14500 },
  ],
  profitMargin: 1.25,
  rushMultiplier: 1.2,
  taxRate: 0.1,
};

const defaultPortfolioItems: MediaItem[] = [
  {
    id: 1,
    title: 'کارتن چهار درب استاندارد FEFCO 0201',
    category: 'کارتن مادر',
    description: 'طراحی مقاومتی پنج‌لایه با مقاومت لهیدگی ECT بالا مناسب بارهای صادراتی.',
    img: createPackageSvgDataUrl('کارتن مادر صادراتی FEFCO 0201', 'مقطع پنج‌لایه مقاوم B/C Flute', 'fefco0201', '#f59e0b'),
    date: '۱۴۰۳/۰۸/۱۰',
  },
  {
    id: 2,
    title: 'جعبه کیبوردی قفل‌دار خودبست FEFCO 0427',
    category: 'جعبه پستی و ای‌کامرس',
    description: 'طراحی قالب با بست بدون نیاز به چسب، مناسب ارسال کالاهای آنلاین و قطعات حساس.',
    img: createPackageSvgDataUrl('جعبه کیبوردی قفل‌دار FEFCO 0427', 'قفل خودبست بدون چسب E-Flute', 'fefco0427', '#38bdf8'),
    date: '۱۴۰۳/۰۹/۰۱',
  },
  {
    id: 3,
    title: 'هاردباکس لوکس مغناطیسی با طلاکوب',
    category: 'بسته‌بندی لوکس',
    description: 'ساختار مغناطیسی با مغزی ۲ میلی‌متری و روکش مخملی یا سلفون مات و طلاکوب داغ.',
    img: createPackageSvgDataUrl('هاردباکس مغناطیسی صادراتی', 'ساختار سخت ۲mm با روکش طلاکوب', 'hardbox', '#eab308'),
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
    imageUrl: createPackageSvgDataUrl('راهنمای استانداردهای FEFCO', 'استاندارد بین‌المللی مهندسی کارتن', 'fefco0201', '#38bdf8'),
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
    imageUrl: createPackageSvgDataUrl('تحلیل مقاومت فشاری BCT', 'مهندسی فلوت B و C و E در انبارداری', 'hardbox', '#f59e0b'),
    date: '۱۴۰۳/۰۹/۲۰',
    author: 'مهندسی متریال اشک قلم',
    readTime: 8,
    tags: ['BCT', 'تست مقاومت', 'مهندسی بسته بندی'],
  },
];

const defaultEmergencyConfig: EmergencyConfig = {
  enabled: false,
  message: '',
  backgroundColor: '#dc2626',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const ContentContext = createContext<ContentContextType>({
  siteContent: defaultSiteContent,
  globalSettings: defaultGlobalSettings,
  portfolioItems: defaultPortfolioItems,
  blogPosts: defaultBlogPosts,
  catalogItems: [],
  pricingFormula: defaultPricingFormula,
  seoConfigs: [],
  assets: [],
  emergencyConfig: defaultEmergencyConfig,
  customPages: [],
  managedProducts: DEFAULT_MANAGED_PRODUCTS,
  managedServices: DEFAULT_MANAGED_SERVICES,
  updateSiteContent: () => {},
  updateGlobalSettings: () => {},
  updatePricingFormula: () => {},
  updateSeoConfig: () => {},
  updateEmergencyConfig: () => {},
  addBlogPost: () => {},
  removeBlogPost: () => {},
  updateBlogPostStatus: async () => {},
  refreshPosts: async () => {},
  uploadAsset: async () => null,
  deleteAsset: async () => false,
  saveSettingsToHost: async () => false,
  upsertCustomPage: async () => {},
  deleteCustomPage: async () => {},
  upsertManagedProduct: async () => {},
  deleteManagedProduct: async () => {},
  upsertManagedService: async () => {},
  deleteManagedService: async () => {},
});

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [siteContent, setSiteContent] = useState<SiteContent>(() => readStorage('siteContent', defaultSiteContent));
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => readStorage('globalSettings', defaultGlobalSettings));
  const [portfolioItems] = useState<MediaItem[]>(() => readStorage('portfolioItems', defaultPortfolioItems));
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => readStorage('blogPosts', defaultBlogPosts));
  const [catalogItems, setCatalogItems] = useState<MediaItem[]>([]);
  const [pricingFormula, setPricingFormula] = useState<PricingFormula>(() => readStorage('pricingFormula', defaultPricingFormula));
  const [seoConfigs, setSeoConfigs] = useState<SeoConfig[]>(() => readStorage('seoConfigs', []));
  const [assets, setAssets] = useState<UploadedAsset[]>(() => readStorage('uploadedAssets', []));
  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyConfig>(() => readStorage('emergencyConfig', defaultEmergencyConfig));
  const [customPages, setCustomPages] = useState<CustomPageItem[]>(() => readStorage('customPages', []));
  const [managedProducts, setManagedProducts] = useState<ManagedProductItem[]>(() =>
    readStorage('managedProducts', DEFAULT_MANAGED_PRODUCTS)
  );
  const [managedServices, setManagedServices] = useState<ManagedServiceItem[]>(() =>
    readStorage('managedServices', DEFAULT_MANAGED_SERVICES)
  );

  const refreshPosts = async () => {
    try {
      const res = await fetch('/api/posts?admin=true');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setBlogPosts((prev) => {
          const serverIds = new Set(data.map((p: BlogPost) => p.id));
          const merged = [...data, ...prev.filter((p) => !serverIds.has(p.id))];
          localStorage.setItem('blogPosts', JSON.stringify(merged));
          return merged;
        });
      }
    } catch {}
  };

  useEffect(() => {
    refreshPosts();

    fetch('/api/catalogs')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalogItems(data);
        }
      })
      .catch(() => {});

    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          if (data.siteContent) setSiteContent((prev) => ({ ...prev, ...data.siteContent }));
          if (data.globalSettings) setGlobalSettings((prev) => ({ ...prev, ...data.globalSettings }));
          if (data.pricingFormula) setPricingFormula((prev) => ({ ...prev, ...data.pricingFormula }));
          if (data.emergencyConfig) setEmergencyConfig((prev) => ({ ...prev, ...data.emergencyConfig }));
          if (Array.isArray(data.customPages)) {
            setCustomPages(data.customPages);
            try {
              localStorage.setItem('customPages', JSON.stringify(data.customPages));
            } catch {}
          }
          if (Array.isArray(data.managedProducts) && data.managedProducts.length > 0) {
            setManagedProducts(data.managedProducts);
            try {
              localStorage.setItem('managedProducts', JSON.stringify(data.managedProducts));
            } catch {}
          }
          if (Array.isArray(data.managedServices) && data.managedServices.length > 0) {
            setManagedServices(data.managedServices);
            try {
              localStorage.setItem('managedServices', JSON.stringify(data.managedServices));
            } catch {}
          }
          if (data.sliderConfig) {
            try {
              const existingRaw = localStorage.getItem('ashk_slider_config');
              if (!existingRaw) {
                localStorage.setItem('ashk_slider_config', JSON.stringify(data.sliderConfig));
                window.dispatchEvent(new Event('ashk-slider-config-updated'));
              }
            } catch {}
          }
        }
      })
      .catch(() => {});
  }, []);

  const persistPartialSettings = async (patch: Record<string, unknown>) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch {}
  };

  const upsertCustomPage = async (page: CustomPageItem) => {
    const exists = customPages.some((p) => p.id === page.id);
    const nextList = exists ? customPages.map((p) => (p.id === page.id ? page : p)) : [page, ...customPages];
    setCustomPages(nextList);
    try {
      localStorage.setItem('customPages', JSON.stringify(nextList));
    } catch {}
    await persistPartialSettings({ customPages: nextList });
  };

  const deleteCustomPage = async (id: string) => {
    const nextList = customPages.filter((p) => p.id !== id);
    setCustomPages(nextList);
    try {
      localStorage.setItem('customPages', JSON.stringify(nextList));
    } catch {}
    await persistPartialSettings({ customPages: nextList });
  };

  const upsertManagedProduct = async (prod: ManagedProductItem) => {
    const exists = managedProducts.some((p) => p.id === prod.id);
    const nextList = exists ? managedProducts.map((p) => (p.id === prod.id ? prod : p)) : [prod, ...managedProducts];
    setManagedProducts(nextList);
    try {
      localStorage.setItem('managedProducts', JSON.stringify(nextList));
    } catch {}
    await persistPartialSettings({ managedProducts: nextList });
  };

  const deleteManagedProduct = async (id: string) => {
    const nextList = managedProducts.filter((p) => p.id !== id);
    setManagedProducts(nextList);
    try {
      localStorage.setItem('managedProducts', JSON.stringify(nextList));
    } catch {}
    await persistPartialSettings({ managedProducts: nextList });
  };

  const upsertManagedService = async (svc: ManagedServiceItem) => {
    const exists = managedServices.some((s) => s.id === svc.id);
    const nextList = exists ? managedServices.map((s) => (s.id === svc.id ? svc : s)) : [svc, ...managedServices];
    setManagedServices(nextList);
    try {
      localStorage.setItem('managedServices', JSON.stringify(nextList));
    } catch {}
    await persistPartialSettings({ managedServices: nextList });
  };

  const deleteManagedService = async (id: string) => {
    const nextList = managedServices.filter((s) => s.id !== id);
    setManagedServices(nextList);
    try {
      localStorage.setItem('managedServices', JSON.stringify(nextList));
    } catch {}
    await persistPartialSettings({ managedServices: nextList });
  };

  const updateSiteContent = (arg1: any, arg2?: any) => {
    setSiteContent((prev) => {
      const next = typeof arg1 === 'string' ? { ...prev, [arg1]: arg2 } : { ...prev, ...(arg1 || {}) };
      localStorage.setItem('siteContent', JSON.stringify(next));
      return next;
    });
  };

  const updateGlobalSettings = (updates: Partial<GlobalSettings>) => {
    setGlobalSettings((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('globalSettings', JSON.stringify(next));
      return next;
    });
  };

  const updatePricingFormula = (updates: Partial<PricingFormula>) => {
    setPricingFormula((prev) => {
      const next = { ...prev, ...updates };
      localStorage.setItem('pricingFormula', JSON.stringify(next));
      return next;
    });
  };

  const updateSeoConfig = (key: any, val?: any) => {
    setSeoConfigs((prev) => {
      const next = Array.isArray(key) ? key : val ? [...prev.filter((s) => s.view !== key && s.canonicalUrl !== key), val] : prev;
      localStorage.setItem('seoConfigs', JSON.stringify(next));
      return next;
    });
  };

  const updateEmergencyConfig = (cfg: EmergencyConfig) => {
    setEmergencyConfig(cfg);
    localStorage.setItem('emergencyConfig', JSON.stringify(cfg));
  };

  const addBlogPost = (post: BlogPost) => {
    const withStatus: BlogPost = { ...post, status: post.status || 'published' };
    setBlogPosts((prev) => {
      const next = [withStatus, ...prev.filter((p) => p.id !== withStatus.id)];
      localStorage.setItem('blogPosts', JSON.stringify(next));
      return next;
    });
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(withStatus),
    }).catch(() => {});
  };

  const removeBlogPost = (id: string) => {
    setBlogPosts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      localStorage.setItem('blogPosts', JSON.stringify(next));
      return next;
    });
    fetch(`/api/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  };

  const updateBlogPostStatus = async (id: string, status: 'draft' | 'published' | 'rejected') => {
    setBlogPosts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, status } : p));
      localStorage.setItem('blogPosts', JSON.stringify(next));
      return next;
    });
    try {
      await fetch(`/api/posts/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch {}
  };

  const uploadAsset = async (fileOrAsset: any, onProgress?: (percent: number) => void): Promise<UploadedAsset | null> => {
    if (fileOrAsset instanceof File) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onprogress = (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        reader.onload = () => {
          const item: UploadedAsset = {
            id: `asset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: fileOrAsset.name,
            type: fileOrAsset.type,
            size: fileOrAsset.size,
            data: String(reader.result || ''),
            uploadDate: new Date().toLocaleDateString('fa-IR'),
          };
          setAssets((prev) => {
            const next = [item, ...prev];
            try {
              localStorage.setItem('uploadedAssets', JSON.stringify(next));
            } catch {}
            return next;
          });
          if (onProgress) onProgress(100);
          resolve(item);
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(fileOrAsset);
      });
    }
    return null;
  };

  const deleteAsset = async (id: string): Promise<boolean> => {
    setAssets((prev) => {
      const next = prev.filter((a) => a.id !== id);
      try {
        localStorage.setItem('uploadedAssets', JSON.stringify(next));
      } catch {}
      return next;
    });
    return true;
  };

  const saveSettingsToHost = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteContent,
          globalSettings,
          pricingFormula,
          emergencyConfig,
          customPages,
          managedProducts,
          managedServices,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  return (
    <ContentContext.Provider
      value={{
        siteContent,
        globalSettings,
        portfolioItems,
        blogPosts,
        catalogItems,
        pricingFormula,
        seoConfigs,
        assets,
        emergencyConfig,
        customPages,
        managedProducts,
        managedServices,
        updateSiteContent,
        updateGlobalSettings,
        updatePricingFormula,
        updateSeoConfig,
        updateEmergencyConfig,
        addBlogPost,
        removeBlogPost,
        updateBlogPostStatus,
        refreshPosts,
        uploadAsset,
        deleteAsset,
        saveSettingsToHost,
        upsertCustomPage,
        deleteCustomPage,
        upsertManagedProduct,
        deleteManagedProduct,
        upsertManagedService,
        deleteManagedService,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => useContext(ContentContext);
