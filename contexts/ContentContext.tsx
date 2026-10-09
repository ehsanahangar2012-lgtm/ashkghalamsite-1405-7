
import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppView, SeoConfig, SiteContent, MediaItem, PricingFormulaConfig, GlobalSettings, UploadedAsset, BlogPost, EmergencyBannerConfig, PortalItemConfig } from '../types';
import { DEFAULT_FORMULA } from '../services/pricingService';
import { suggestTrendingTopic, generateBlogContent, analyzeCatalogImage } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { doc, getDoc, getDocFromCache, setDoc } from 'firebase/firestore';
import { fetchWithMockFallback } from '../services/mockDataService';
import { catalogService } from '../src/services/catalogService';
import { createSvgPlaceholder } from '../utils/imageCache';
import { getApiBase } from '../utils/apiBase';


interface ContentContextType {
  // Configs
  globalSettings: GlobalSettings;
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => void;
  saveSettingsToHost: () => Promise<boolean>;
  persistConfigToFirestore: (customData?: {
    globalSettings?: GlobalSettings;
    siteContent?: SiteContent;
    pricingFormula?: PricingFormulaConfig;
    seoConfigs?: SeoConfig[];
    emergencyConfig?: EmergencyBannerConfig;
  }) => Promise<boolean>;
  pricingFormula: PricingFormulaConfig;
  updatePricingFormula: (config: Partial<PricingFormulaConfig>) => void;
  
  // Emergency Banner
  emergencyConfig: EmergencyBannerConfig;
  updateEmergencyConfig: (config: Partial<EmergencyBannerConfig>) => void;
  
  // Content
  siteContent: SiteContent;
  updateSiteContent: (key: keyof SiteContent, value: string) => void;
  
  // SEO
  seoConfigs: SeoConfig[];
  updateSeoConfig: (view: AppView, newConfig: Partial<SeoConfig>) => void;
  getSeoForView: (view: AppView) => SeoConfig;
  
  // Media
  catalogItems: MediaItem[];
  portfolioItems: MediaItem[];
  addMediaItem: (collection: 'catalog' | 'portfolio', item: MediaItem) => void;
  updateMediaItem: (collection: 'catalog' | 'portfolio', item: MediaItem) => void;
  removeMediaItem: (collection: 'catalog' | 'portfolio', id: number) => void;
  
  // New Firestore methods
  deleteCatalog: (id: string | number) => Promise<void>;
  updateCatalog: (id: string | number, data: Partial<MediaItem>) => Promise<void>;
  analyzeCatalog: (id: string | number, imageUrl: string) => Promise<void>;

  // Blog
  blogPosts: BlogPost[];
  addBlogPost: (post: BlogPost) => void;
  removeBlogPost: (id: string) => void;

  // Asset Library (File Manager)
  assets: UploadedAsset[];
  uploadAsset: (file: File, onProgress?: (percent: number) => void) => Promise<UploadedAsset | null>;
  deleteAsset: (id: string) => void;

  // Raw State
  isRawState: boolean;
  toggleRawState: (val?: boolean) => void;
}

const defaultContent: SiteContent = {
  heroTitle: "اشک قلم؛ مهندسی بسته‌بندی",
  heroSubtitle: "تلفیق هنر چاپ و تکنولوژی",
  heroDescription: "پلتفرم جامع چاپ و بسته‌بندی صنعتی. مجهز به مولد قالب‌های برش (Dieline) و سیستم محاسبه قیمت دقیق.",
  heroBackgroundUrl: createSvgPlaceholder("صنایع چاپ و بسته‌بندی اشک قلم"),
  footerAbout: "پیشرو در صنعت چاپ و بسته‌بندی با بیش از دو دهه تجربه. ما با تلفیق هنر و تکنولوژی، هویت برند شما را می‌سازیم.",
  contactPhone: "۰۲۱-۸۸۸۸۰۰۰۰",
  contactEmail: "info@ashkghalam.com",
  contactAddress: "تهران، خیابان فتح، مجتمع صنعتی افست و کارتن‌سازی اشک قلم",
  workingHours: "شنبه تا چهارشنبه ۸:۰۰ الی ۱۷:۰۰ | پنجشنبه ۸:۰۰ الی ۱۳:۰۰"
};

export const DEFAULT_PORTALS: PortalItemConfig[] = [
  {
    id: 'ashk',
    title: 'صنایع چاپ و بسته‌بندی اشک قلم',
    englishTitle: 'Ashk Ghalam Packaging & CAD',
    tagline: 'مرکز مهندسی ساختار کارتن، طراحی سه‌بعدی و استودیو دایلاین',
    badge: 'پرتال تخصصی ۳D & CAD',
    description: 'مرکز تخصصی طراحی ساختاری جعبه و کارتن، مجهز به موتورهای محاسباتی دایلاین FEFCO و ECMA، استودیوی آنلاین گرافیک و کاتالوگ تعاملی.',
    iconName: 'Box',
    colorTheme: 'sky',
    services: [
      'طراحی تعاملی جعبه و تیغ‌سازی دایکات ۳D',
      'استودیوی آنلاین ویرایش و بارگذاری گرافیک',
      'محاسبه لحظه‌ای فرمول ابعاد و بهینه‌سازی شیت',
      'خروجی مهندسی وکتور DXF، کاتالوگ و سه‌بعدی'
    ],
    metrics: [
      { label: 'استانداردها', value: 'FEFCO / ECMA' },
      { label: 'دقت شبیه‌سازی', value: '۰.۱ میلی‌متر' },
      { label: 'موتور محاسباتی', value: '۱۰۰٪ آفلاین' }
    ],
    buttonText: 'ورود به استودیو اشک قلم',
    internalView: 'HOME',
    enabled: true,
    order: 1
  },
  {
    id: 'badikaran',
    title: 'مجتمع چاپ و بسته‌بندی بادیکاران توس',
    englishTitle: 'Badikaran Toos Industrial Printing',
    tagline: 'مجتمع چاپ صنعتی افست ۵ رنگ، کارتن لمینتی و خدمات دایکات سنگین',
    badge: 'تولید صنعتی و انبوه',
    description: 'مرکز مجهز چاپ افست ۵ رنگ همزمان Heidelberg، خطوط تمام اتوماتیک کارتن‌سازی لمینتی، پوشش‌های UV موضعی، ورنی و سلفون‌کشی حرارتی.',
    iconName: 'Printer',
    colorTheme: 'emerald',
    services: [
      'ماشین‌آلات افست Heidelberg ۵ رنگ همزمان',
      'خط لمینت اتوماتیک و دایکات سنگین Bobst',
      'پوشش‌های ورنی، سلفون مات/براق و UV موضعی',
      'تولید انبوه جعبه‌های بهداشتی، غذایی و صنعتی'
    ],
    metrics: [
      { label: 'تکنولوژی چاپ', value: 'افست ۵ رنگ' },
      { label: 'ظرفیت روزانه', value: '۵۰،۰۰۰ جعبه' },
      { label: 'کنترل کیفیت', value: 'استاندارد ملی' }
    ],
    buttonText: 'ورود به مجتمع بادیکاران توس',
    internalView: 'ABOUT',
    enabled: true,
    order: 2
  },
  {
    id: 'software',
    title: 'مرکز نرم‌افزار و IT اشک قلم',
    englishTitle: 'Ashk Software & IT Solutions',
    tagline: 'سامانه‌های جامع مالیاتی، مدیریت حواله ارزی و اپلیکیشن‌های اندروید',
    badge: 'نرم‌افزارهای تخصصی',
    description: 'توسعه و ارائه نرم‌افزارهای تخصصی حسابداری و انبارداری، سامانه‌های مدیریت دفاتر حواله و صرافی، و اپ‌های کاربردی با لایسنس دائمی و پشتیبانی تضمینی.',
    iconName: 'Laptop',
    colorTheme: 'indigo',
    services: [
      'سامانه جامع حسابداری بازرگانی و کارخانجات',
      'نرم‌افزار هوشمند مدیریت حواله‌جات و دفاتر ارزی',
      'اپلیکیشن‌های اختصاصی اندروید با عملکرد کاملاً آفلاین',
      'صدور فوری لایسنس فعال‌سازی دائمی و کاتالوگ نرم‌افزار'
    ],
    metrics: [
      { label: 'بانک اطلاعاتی', value: 'رمزنگاری محلی' },
      { label: 'نوع لایسنس', value: 'دائمی آفلاین' },
      { label: 'پلتفرم‌ها', value: 'ویندوز و اندروید' }
    ],
    buttonText: 'ورود به فروشگاه نرم‌افزار',
    internalView: 'SOFTWARE_STORE',
    enabled: true,
    order: 3
  },
  {
    id: 'b2b',
    title: 'پرتال همکاران B2B و ناظران چاپ',
    englishTitle: 'B2B Partner & Production Hub',
    tagline: 'شبکه اختصاصی همکاران لیتوگرافی، چاپخانه‌ها و کانون‌های تبلیغاتی',
    badge: 'همکاری سازمانی B2B',
    description: 'درگاه اختصاصی همکاران و آژانس‌های تبلیغاتی جهت استعلام تیراژ بالا، ثبت فرم عمومی و اختصاصی، تخفیفات سازمانی و رهگیری زنده تولید.',
    iconName: 'Building2',
    colorTheme: 'amber',
    services: [
      'سفارش‌گذاری مستقیم شیت‌های عمومی و اختصاصی',
      'تعرفه تخفیف پلکانی ویژه دفاتر طراحی و همکاران',
      'رهگیری زنده فرم‌بندی، چاپ و بسته‌بندی نهایی',
      'مشاوره اختصاصی ناظران فنی چاپ و انتخاب متریال'
    ],
    metrics: [
      { label: 'تخفیف همکاری', value: 'تا ۳۵ درصد' },
      { label: 'اولویت سفارش', value: 'خط تولید VIP' },
      { label: 'پشتیبانی فنی', value: 'مستقیم ناظر چاپ' }
    ],
    buttonText: 'ورود به پرتال همکاران B2B',
    internalView: 'B2B_SUITE',
    enabled: true,
    order: 4
  }
];

const defaultGlobalSettings: GlobalSettings = {
  siteName: "اشک قلم",
  logoUrl: "", // Empty means use default text
  faviconUrl: "",
  primaryColor: "#0ea5e9",
  fontFamily: "Vazirmatn",
  ashkPortalUrl: "",
  badikaranPortalUrl: "",
  
  // Badikaran Notification Toast
  badikaranNotifEnabled: true,
  badikaranNotifTitle: "خبر جدید پورتال بادیکاران",
  badikaranNotifText: "مرکز صنعتی چاپ افست ۵ رنگ، کارتن‌سازی لمینتی و پوشش‌های UV بادیکاران توس با خدمات تمام‌اتوماتیک آماده ثبت سفارشات شماست.",
  badikaranNotifDelay: 5,
  badikaranNotifDuration: 10,

  // Welcome Modal Popup
  welcomeModalEnabled: true,
  welcomeTitle: "به اشک قلم خوش آمدید!",
  welcomeSubtitle: "سامانه هوشمند طراحی و بسته‌بندی. با ابزارهای آنلاین ما، می‌توانید جعبه خود را طراحی کنید، مدل سه‌بعدی آن را ببینید و سفارش دهید.",
  welcomeBoxTitle: "جعبه‌ساز 3D",
  welcomeBoxDesc: "ساخت قالب و تیغ",
  welcomeStudioTitle: "استودیو آنلاین",
  welcomeStudioDesc: "طراحی لایه باز",
  welcomeCtaText: "شروع طراحی و سفارش",

  // Site Switcher Portal Modal & Dynamic Portals Hub
  siteSwitcherTitle: "انتخاب پرتال / برند درگاه",
  siteSwitcherSubtitle: "لطفاً درگاه تخصصی یا واحد صنعتی مورد نظر خود را جهت ورود انتخاب کنید",
  siteSwitcherEnabled: true,
  portalsList: DEFAULT_PORTALS,
  ashkPortalTitle: "صنایع چاپ و بسته‌بندی اشک قلم",
  ashkPortalDesc: "مرکز تخصصی طراحی ساختاری بسته‌بندی، مولد دایلاین ۳D، استودیوی آنلاین گرافیک و کاتالوگ دیجیتال.",
  badikaranPortalTitle: "مجتمع چاپ و بسته‌بندی بادیکاران توس",
  badikaranPortalDesc: "مرکز صنعتی چاپ افست ۵ رنگ، کارتن‌سازی لمینتی و پوشش‌های UV بادیکاران توس با خدمات تمام‌اتوماتیک.",

  // Contact & Inquiry strings
  contactAddress: "تهران، خیابان فتح، مجتمع صنعتی افست و کارتن‌سازی اشک قلم",
  workingHours: "شنبه تا چهارشنبه ۸:۰۰ الی ۱۷:۰۰ | پنجشنبه ۸:۰۰ الی ۱۳:۰۰",
  whatsappNumber: "+989120000000",
  inquirySuccessTitle: "استعلام شما با موفقیت ثبت شد",
  inquirySuccessMessage: "پیش‌فاکتور الگوریتمی صادر گردید. کارشناسان ما به زودی با شما تماس خواهند گرفت."
};

const defaultEmergencyBanner: EmergencyBannerConfig = {
  enabled: true,
  message: "🚨 اطلاع‌رسانی مهم: جشنواره ثبت سفارشات چاپ افست و کارتن‌های لمینتی با تخفیف ویژه آغاز شد. برای اطلاعات بیشتر کلیک کنید.",
  targetView: "ALL" as any,
  linkText: "ثبت استعلام",
  linkUrl: "",
  urgency: "critical",
  dismissible: true
};

const defaultSeo: SeoConfig[] = [
  { view: AppView.HOME, title: "اشک قلم | مرکز تخصصی چاپ، جعبه‌سازی و بسته‌بندی هوشمند", description: "بزرگترین پلتفرم آنلاین چاپ، تولید کارتن و طراحی بسته‌بندی در ایران.", keywords: ["چاپ اشک قلم", "بادیکاران توس", "بسته‌بندی", "طراحی جعبه"] },
  { view: AppView.INQUIRY, title: "استعلام قیمت آنلاین چاپ و جعبه‌سازی | اشک قلم", description: "محاسبه آنلاین قیمت تمام شده چاپ جعبه، کارتن لمینتی، کاتالوگ و اوراق اداری.", keywords: ["قیمت چاپ", "استعلام آنلاین", "محاسبه قیمت جعبه"] },
  { view: AppView.DESIGN_STUDIO, title: "استودیو آنلاین طراحی لایه باز | اشک قلم", description: "ویرایش آنلاین فایل‌های فتوشاپ و ایلاستریتور برای چاپ بسته‌بندی.", keywords: ["فتوشاپ آنلاین", "طراحی کاتالوگ", "ویرایش لایه باز"] },
  { view: AppView.BLOG, title: "مجله تخصصی چاپ و بسته‌بندی | اشک قلم", description: "مقالات آموزشی درباره استانداردهای چاپ، متریال‌ها و تکنولوژی‌های جدید.", keywords: ["مقاله چاپ", "آموزش لیتوگرافی", "اخبار صنعت چاپ"] },
  { view: AppView.ABOUT, title: "درباره ما | گروه صنعتی اشک قلم و بادیکاران توس", description: "معرفی صنایع چاپ و بسته‌بندی اشک قلم و مجتمع چاپ بادیکاران توس، تجهیزات، ناوگان افست و افتخارات.", keywords: ["درباره اشک قلم", "بادیکاران توس", "مجتمع چاپ", "ماشین‌آلات افست"] },
  { view: AppView.LIBRARY, title: "کتابخانه و مرکز دانلودها | اشک قلم", description: "دانلود رایگان کتاب‌های تخصصی مهندسی بسته‌بندی، کاتالوگ‌ها، قالب‌های CAD و پروفایل‌های رنگی ICC.", keywords: ["دانلود کتاب چاپ", "کاتالوگ بسته‌بندی", "فایل CAD دایلاین", "پروفایل ICC"] },
  { view: AppView.DIELINE_GENERATOR, title: "مولد سه‌بعدی قالب جعبه و دایلاین | اشک قلم", description: "طراحی آنلاین قالب تیغ جعبه‌های دارویی، آرایشی و صنعتی با خروجی 3D و CAD.", keywords: ["دایلاین 3D", "طراحی قالب جعبه", "تیغ‌سازی آنلاین"] },
  { view: AppView.CATALOG, title: "کاتالوگ ورق‌زن هوشمند نمونه‌کارها | اشک قلم", description: "مشاهده سه‌بعدی و ورق زدن کاتالوگ نمونه‌کارهای چاپ و بسته‌بندی لوکس.", keywords: ["کاتالوگ 3D", "نمونه کار چاپ", "کاتالوگ دیجیتال"] }
];

const defaultCatalog: MediaItem[] = [];

const defaultPortfolio: MediaItem[] = [];

const defaultBlogPosts: BlogPost[] = [];

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load from local storage or use defaults
  const [isRawState, setIsRawState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ashk_is_raw_state') === 'true';
    } catch (_) {
      return false;
    }
  });

  const toggleRawState = (val?: boolean) => {
    const nextVal = val !== undefined ? val : !isRawState;
    setIsRawState(nextVal);
    try {
      localStorage.setItem('ashk_is_raw_state', String(nextVal));
    } catch (_) {}
  };

  const [siteContent, setSiteContent] = useState<SiteContent>(() => {
    const saved = localStorage.getItem('siteContent');
    return saved ? JSON.parse(saved) : defaultContent;
  });

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
    try {
      const saved = localStorage.getItem('globalSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.portalsList || !Array.isArray(parsed.portalsList) || parsed.portalsList.length === 0) {
          parsed.portalsList = DEFAULT_PORTALS;
        }
        return { ...defaultGlobalSettings, ...parsed };
      }
    } catch (e) {
      console.warn('Error reading globalSettings:', e);
    }
    return defaultGlobalSettings;
  });

  const [pricingFormula, setPricingFormula] = useState<PricingFormulaConfig>(() => {
    const saved = localStorage.getItem('pricingFormula');
    return saved ? JSON.parse(saved) : DEFAULT_FORMULA;
  });

  // Load configuration and identity data automatically on app launch from Backend API and local cache
  useEffect(() => {
    const initializeConfig = async () => {
      let loaded = false;
      
      // 1. Try Local Host Backend API First (Ultra fast, same origin, 0 internet dependency)
      try {
        const basePath = getApiBase();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${basePath}/api/settings/global`, {
          signal: controller.signal
        }).catch(() => null);
        clearTimeout(timeoutId);

        if (res && res.ok) {
          const data = await res.json().catch(() => null);
          if (data && typeof data === 'object' && Object.keys(data).length > 0) {
            const extractedSettings = data.globalSettings || (data.siteName || data.logoUrl ? data : null);
            if (extractedSettings) {
              const merged = { ...defaultGlobalSettings, ...extractedSettings };
              setGlobalSettings(merged);
              try { localStorage.setItem('globalSettings', JSON.stringify(merged)); } catch (_) {}
            }
            if (data.siteContent) {
              const mergedContent = { ...defaultContent, ...data.siteContent };
              setSiteContent(mergedContent);
              try { localStorage.setItem('siteContent', JSON.stringify(mergedContent)); } catch (_) {}
            }
            if (data.pricingFormula) {
              setPricingFormula(data.pricingFormula);
              try { localStorage.setItem('pricingFormula', JSON.stringify(data.pricingFormula)); } catch (_) {}
            }
            if (data.seoConfigs) {
              setSeoConfigs(data.seoConfigs);
              try { localStorage.setItem('seoConfigs', JSON.stringify(data.seoConfigs)); } catch (_) {}
            }
            if (data.emergencyConfig) {
              setEmergencyConfig(data.emergencyConfig);
              try { localStorage.setItem('emergencyConfig', JSON.stringify(data.emergencyConfig)); } catch (_) {}
            }
            loaded = true;
          }
        }
      } catch (_) {
        // Fallback silently to local cache
      }

      // 1b. Fallback to PHP host script get_settings.php
      if (!loaded) {
        try {
          const phpRes = await fetch('./get_settings.php').catch(() => null);
          if (phpRes && phpRes.ok) {
            const phpData = await phpRes.json().catch(() => null);
            if (phpData && typeof phpData === 'object' && Object.keys(phpData).length > 0) {
              const extracted = phpData.globalSettings || (phpData.siteName || phpData.logoUrl ? phpData : null);
              if (extracted) {
                const merged = { ...defaultGlobalSettings, ...extracted };
                setGlobalSettings(merged);
                try { localStorage.setItem('globalSettings', JSON.stringify(merged)); } catch (_) {}
              }
              if (phpData.siteContent) {
                const mergedContent = { ...defaultContent, ...phpData.siteContent };
                setSiteContent(mergedContent);
                try { localStorage.setItem('siteContent', JSON.stringify(mergedContent)); } catch (_) {}
              }
              loaded = true;
            }
          }
        } catch (_) {}
      }

      // 2. If not loaded from backend API and device is online, attempt Firestore sync silently
      if (!loaded && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const docRef = doc(db, 'settings', 'global_config');
          let docSnap: any = await getDocFromCache(docRef).catch(() => null);
          if (!docSnap || !docSnap.exists || !docSnap.exists()) {
            const getDocPromise = getDoc(docRef);
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
            docSnap = await Promise.race([getDocPromise, timeoutPromise]).catch(() => null);
          }
          
          if (docSnap && docSnap.exists && docSnap.exists()) {
            const data = docSnap.data();
            if (data.globalSettings) {
              const merged = { ...defaultGlobalSettings, ...data.globalSettings };
              setGlobalSettings(merged);
              try { localStorage.setItem('globalSettings', JSON.stringify(merged)); } catch (_) {}
            }
            if (data.siteContent) {
              const mergedContent = { ...defaultContent, ...data.siteContent };
              setSiteContent(mergedContent);
              try { localStorage.setItem('siteContent', JSON.stringify(mergedContent)); } catch (_) {}
            }
            if (data.pricingFormula) {
              setPricingFormula(data.pricingFormula);
              try { localStorage.setItem('pricingFormula', JSON.stringify(data.pricingFormula)); } catch (_) {}
            }
            if (data.seoConfigs) {
              setSeoConfigs(data.seoConfigs);
              try { localStorage.setItem('seoConfigs', JSON.stringify(data.seoConfigs)); } catch (_) {}
            }
            if (data.emergencyConfig) {
              setEmergencyConfig(data.emergencyConfig);
              try { localStorage.setItem('emergencyConfig', JSON.stringify(data.emergencyConfig)); } catch (_) {}
            }
          }
        } catch (_) {
          // Graceful offline fallback
        }
      }
    };
    initializeConfig();
  }, []);

  const [seoConfigs, setSeoConfigs] = useState<SeoConfig[]>(() => {
    const saved = localStorage.getItem('seoConfigs');
    return saved ? JSON.parse(saved) : defaultSeo;
  });

  const [dbCustomCatalogs, setDbCustomCatalogs] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('ashk_custom_catalogs_v2');
    return saved ? JSON.parse(saved) : [];
  });

  const [dbAiCovers, setDbAiCovers] = useState<{ [key: string]: any }>(() => {
    const saved = localStorage.getItem('ashk_ai_covers_v2');
    return saved ? JSON.parse(saved) : {};
  });

  const [catalogItems, setCatalogItems] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('catalogItems');
    return saved ? JSON.parse(saved) : defaultCatalog;
  });

  const [emergencyConfig, setEmergencyConfig] = useState<EmergencyBannerConfig>(() => {
    const saved = localStorage.getItem('emergencyConfig');
    return saved ? JSON.parse(saved) : defaultEmergencyBanner;
  });

  const updateEmergencyConfig = (config: Partial<EmergencyBannerConfig>) => {
    setEmergencyConfig(prev => {
      const next = { ...prev, ...config };
      try { localStorage.setItem('emergencyConfig', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  // Centered Hybrid Sync for Catalogs (IndexedDB + Host Server + PHP script)
  useEffect(() => {
    let isMounted = true;

    const loadHybridCatalogs = async () => {
      try {
        const fetched = await catalogService.fetchCatalogs({ isPublishedOnly: false });
        if (isMounted && fetched.length > 0) {
          const mediaItems = fetched.map(c => ({
            id: c.id as any,
            title: c.title,
            desc: c.description,
            category: c.category,
            img: c.coverImage,
            coverImg: c.coverImage,
            pageCount: c.pageCount,
            pages: c.pages.map(p => p.imageUrl)
          }));
          setDbCustomCatalogs(mediaItems as any);
        }
      } catch (err) {
        console.warn("Catalog fetch notice:", err);
      }
    };

    loadHybridCatalogs();

    return () => {
      isMounted = false;
    };
  }, []);

  // Compute and merge public catalogs
  useEffect(() => {
    const catalogMap = new Map<string, any>();
    
    // Add default catalogs first
    defaultCatalog.forEach((book) => {
      if (book && book.id) catalogMap.set(String(book.id), book);
    });
    
    // Merge database/host catalogs
    dbCustomCatalogs.forEach((book) => {
      if (book && book.id) catalogMap.set(String(book.id), book);
    });

    // Apply AI Covers dynamically
    const combined = Array.from(catalogMap.values()).map((book: any) => {
      const hasAi = dbAiCovers[String(book.id)];
      return {
        ...book,
        coverImg: hasAi?.coverImg || book.coverImg || book.img,
        backCoverImg: hasAi?.backCoverImg || book.backCoverImg || null
      };
    });

    setCatalogItems(isRawState ? [] : combined);
  }, [dbCustomCatalogs, dbAiCovers, isRawState]);

  const [portfolioItems, setPortfolioItems] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('portfolioItems');
    return saved ? JSON.parse(saved) : defaultPortfolio;
  });

  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    const saved = localStorage.getItem('blogPosts');
    return saved ? JSON.parse(saved) : defaultBlogPosts;
  });

  // Assets (File System Simulation)
  const [assets, setAssets] = useState<UploadedAsset[]>(() => {
    try {
      const saved = localStorage.getItem('uploadedAssets');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.filter((a: any) => !a.data.startsWith('blob:'));
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  // Persistence Effects with safe QuotaExceededError handling
  useEffect(() => { try { localStorage.setItem('siteContent', JSON.stringify(siteContent)); } catch (e) {} }, [siteContent]);
  useEffect(() => { try { localStorage.setItem('globalSettings', JSON.stringify(globalSettings)); } catch (e) {} }, [globalSettings]);
  useEffect(() => { try { localStorage.setItem('pricingFormula', JSON.stringify(pricingFormula)); } catch (e) {} }, [pricingFormula]);
  useEffect(() => { try { localStorage.setItem('seoConfigs', JSON.stringify(seoConfigs)); } catch (e) {} }, [seoConfigs]);
  useEffect(() => { try { localStorage.setItem('catalogItems', JSON.stringify(catalogItems)); } catch (e) {} }, [catalogItems]);
  useEffect(() => { try { localStorage.setItem('emergencyConfig', JSON.stringify(emergencyConfig)); } catch (e) {} }, [emergencyConfig]);
  useEffect(() => { try { localStorage.setItem('portfolioItems', JSON.stringify(portfolioItems)); } catch (e) {} }, [portfolioItems]);
  useEffect(() => { try { localStorage.setItem('blogPosts', JSON.stringify(blogPosts)); } catch (e) {} }, [blogPosts]);
  useEffect(() => { try { localStorage.setItem('uploadedAssets', JSON.stringify(assets)); } catch (e) {} }, [assets]);

  // --- AUTOMATED BLOG GENERATION LOGIC ---
  useEffect(() => {
    const checkAndGenerateBlog = async () => {
        const lastGenStr = localStorage.getItem('lastAutoBlogGen');
        const now = Date.now();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        
        // If never generated OR last generated > 1 week ago
        if (!lastGenStr || (now - parseInt(lastGenStr)) > ONE_WEEK) {
            console.log("Triggering Automated Weekly Blog Generation...");
            try {
                // 1. Get Trend
                const topic = await suggestTrendingTopic();
                console.log("Auto-Blog Topic:", topic);
                
                // 2. Generate Content
                const content = await generateBlogContent(topic);
                
                // 3. Create Post Object
                const newPost: BlogPost = {
                    id: `auto-${now}`,
                    title: content.title,
                    excerpt: content.excerpt,
                    content: content.content,
                    author: 'هوش مصنوعی اشک قلم',
                    date: new Date().toLocaleDateString('fa-IR'),
                    readTime: Math.ceil(content.content.length / 1000), // Approx read time
                    tags: content.tags,
                    imageUrl: createSvgPlaceholder(content.title)
                };

                // 4. Save to State & Update Timestamp
                setBlogPosts(prev => [newPost, ...prev]);
                localStorage.setItem('lastAutoBlogGen', now.toString());
                
                console.log("Weekly blog post published successfully.");
            } catch (error) {
                console.error("Auto-Blog generation failed:", error);
            }
        }
    };

    // Delay slightly to not block initial render
    const timer = setTimeout(() => {
        checkAndGenerateBlog();
    }, 3000);

    return () => clearTimeout(timer);
  }, []); // Empty dependency array = runs once on app load

  const updateSiteContent = (key: keyof SiteContent, value: string) => {
    setSiteContent(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem('siteContent', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const updateGlobalSettings = (settings: Partial<GlobalSettings>) => {
    setGlobalSettings(prev => {
      const next = { ...prev, ...settings };
      try { localStorage.setItem('globalSettings', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  };

  const persistConfigToFirestore = async (customData?: {
    globalSettings?: GlobalSettings;
    siteContent?: SiteContent;
    pricingFormula?: PricingFormulaConfig;
    seoConfigs?: SeoConfig[];
    emergencyConfig?: EmergencyBannerConfig;
  }) => {
    const payload = {
      globalSettings: customData?.globalSettings || globalSettings,
      siteContent: customData?.siteContent || siteContent,
      pricingFormula: customData?.pricingFormula || pricingFormula,
      seoConfigs: customData?.seoConfigs || seoConfigs,
      emergencyConfig: customData?.emergencyConfig || emergencyConfig,
      updatedAt: new Date().toISOString()
    };

    try {
      const docRef = doc(db, 'settings', 'global_config');
      const setDocPromise = setDoc(docRef, payload, { merge: true }).catch(() => null);
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 1200));
      await Promise.race([setDocPromise, timeoutPromise]);
    } catch (error) {
      // Firestore offline or timeout, falling back silently
    }

    try {
      const basePath = getApiBase();
      await fetch(`${basePath}/api/settings/global`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.error('Error saving settings to host API:', e);
    }

    try {
      localStorage.setItem('globalSettings', JSON.stringify(payload.globalSettings));
      localStorage.setItem('siteContent', JSON.stringify(payload.siteContent));
      localStorage.setItem('pricingFormula', JSON.stringify(payload.pricingFormula));
      localStorage.setItem('seoConfigs', JSON.stringify(payload.seoConfigs));
      localStorage.setItem('emergencyConfig', JSON.stringify(payload.emergencyConfig));
    } catch (e) {}

    return true;
  };

  const saveSettingsToHost = async () => {
    return await persistConfigToFirestore();
  };

  const updatePricingFormula = (config: Partial<PricingFormulaConfig>) => {
    setPricingFormula(prev => ({ ...prev, ...config }));
  };

  const updateSeoConfig = (view: AppView, newConfig: Partial<SeoConfig>) => {
    setSeoConfigs(prev => {
      const existingIndex = prev.findIndex(c => c.view === view);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...newConfig };
        return updated;
      }
      return [...prev, { view, title: '', description: '', keywords: [], ...newConfig }];
    });
  };

  const getSeoForView = (view: AppView) => {
    return seoConfigs.find(c => c.view === view) || { 
      view, 
      title: "اشک قلم", 
      description: "", 
      keywords: [] 
    };
  };

  const addMediaItem = (collection: 'catalog' | 'portfolio', item: MediaItem) => {
    if (collection === 'catalog') setCatalogItems(prev => [...prev, item]);
    else setPortfolioItems(prev => [...prev, item]);
  };

  const updateMediaItem = (collection: 'catalog' | 'portfolio', updatedItem: MediaItem) => {
    if (collection === 'catalog') {
      setCatalogItems(prev => {
        const exists = prev.some(item => String(item.id) === String(updatedItem.id));
        const updated = exists 
          ? prev.map(item => String(item.id) === String(updatedItem.id) ? updatedItem : item)
          : [updatedItem, ...prev];
        try { localStorage.setItem('catalogItems', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
    } else {
      setPortfolioItems(prev => {
        const exists = prev.some(item => String(item.id) === String(updatedItem.id));
        const updated = exists 
          ? prev.map(item => String(item.id) === String(updatedItem.id) ? updatedItem : item)
          : [updatedItem, ...prev];
        try { localStorage.setItem('portfolioItems', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });
    }
  };

  const removeMediaItem = (collection: 'catalog' | 'portfolio', id: number | string) => {
    const strId = String(id);
    if (collection === 'catalog') {
      setCatalogItems(prev => {
        const filtered = prev.filter(i => String(i.id) !== strId);
        try { localStorage.setItem('catalogItems', JSON.stringify(filtered)); } catch (e) {}
        return filtered;
      });
    } else {
      setPortfolioItems(prev => {
        const filtered = prev.filter(i => String(i.id) !== strId);
        try { localStorage.setItem('portfolioItems', JSON.stringify(filtered)); } catch (e) {}
        return filtered;
      });
    }
  };

  const deleteCatalog = async (id: string | number) => {
    const strId = String(id);
    try {
      await catalogService.deleteCatalog(strId);

      // 1. Remove from catalogItems in ContentContext immediately (optimistic UI)
      setCatalogItems(prev => {
        const filtered = prev.filter(item => String(item.id) !== strId);
        try { localStorage.setItem('catalogItems', JSON.stringify(filtered)); } catch (e) {}
        return filtered;
      });

      // 2. Remove from localStorage ashk_custom_catalogs_v2
      const cachedCustoms = localStorage.getItem('ashk_custom_catalogs_v2');
      if (cachedCustoms) {
        try {
          const customList = JSON.parse(cachedCustoms);
          const filtered = customList.filter((item: any) => item && String(item.id) !== strId);
          localStorage.setItem('ashk_custom_catalogs_v2', JSON.stringify(filtered));
        } catch (_) {}
      }

      // 3. Remove from localStorage ashk_ai_covers_v2
      const cachedCovers = localStorage.getItem('ashk_ai_covers_v2');
      if (cachedCovers) {
        try {
          const coversMap = JSON.parse(cachedCovers);
          delete coversMap[strId];
          localStorage.setItem('ashk_ai_covers_v2', JSON.stringify(coversMap));
        } catch (_) {}
      }

      // 4. Delete from Host Server REST API asynchronously
      fetch(`/api/catalogs/${strId}`, { method: 'DELETE' }).catch(err => {
        console.warn(`Host server catalog delete warning for ${strId}:`, err);
      });

      console.log(`Catalog ${strId} deleted successfully from local storage`);
    } catch (error) {
      console.error(`Failed to delete catalog ${id}:`, error);
      throw error;
    }
  };

  const updateCatalog = async (id: string | number, data: Partial<MediaItem>) => {
    const strId = String(id);
    try {
      // 1. Update local state immediately (optimistic UI)
      setCatalogItems(prev => {
        const updated = prev.map(item => String(item.id) === strId ? { ...item, ...data } : item);
        try { localStorage.setItem('catalogItems', JSON.stringify(updated)); } catch (e) {}
        return updated;
      });

      // 2. Update localStorage ashk_custom_catalogs_v2
      const cachedCustoms = localStorage.getItem('ashk_custom_catalogs_v2');
      if (cachedCustoms) {
        try {
          const customList = JSON.parse(cachedCustoms);
          const updated = customList.map((item: any) => String(item.id) === strId ? { ...item, ...data } : item);
          localStorage.setItem('ashk_custom_catalogs_v2', JSON.stringify(updated));
        } catch (_) {}
      }

      // 3. Update Host Server REST API asynchronously so offline/unreachable network doesn't block the UI
      fetch('/api/catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: strId, ...data })
      }).catch(hostErr => {
        console.warn(`Host server catalog update background warning for ${strId}:`, hostErr);
      });

      console.log(`Catalog ${strId} updated successfully in local state`);
    } catch (error) {
      console.error(`Failed to update catalog ${id}:`, error);
      throw error;
    }
  };

  const analyzeCatalog = async (id: string | number, imageUrl: string) => {
    try {
      const analysis = await analyzeCatalogImage(imageUrl);
      setCatalogItems(prev => prev.map(item => item.id === id ? { ...item, aiAnalysis: analysis } : item));
      console.log(`Catalog ${id} analyzed successfully and updated in state`);
    } catch (error) {
      console.error(`Failed to analyze catalog ${id}:`, error);
    }
  };

  const addBlogPost = (post: BlogPost) => {
    setBlogPosts(prev => [post, ...prev]);
  };

  const removeBlogPost = (id: string) => {
    setBlogPosts(prev => prev.filter(p => p.id !== id));
  };

  // Asset Logic (File Upload) - Pure local server, PHP upload, and Base64 fallback
  const uploadAsset = async (file: File, onProgress?: (percent: number) => void): Promise<UploadedAsset | null> => {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const basePath = getApiBase();
      const endpointPath = `${basePath}/api/upload`.replace(/\/\//g, '/');
      
      xhr.open('POST', endpointPath, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };

      const fallbackToBase64 = () => {
        console.warn('Upload failed on server/php endpoint, converting to permanent Base64 Data URL...');
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          const newAsset: UploadedAsset = {
            id: `asset-b64-${Date.now()}`,
            name: file.name,
            type: file.type || 'image/png',
            size: file.size,
            uploadDate: new Date().toLocaleDateString('fa-IR'),
            data: base64Data
          };
          setAssets(prev => [newAsset, ...prev]);
          try {
            const stored = JSON.parse(localStorage.getItem('ashk_uploaded_assets') || '[]');
            localStorage.setItem('ashk_uploaded_assets', JSON.stringify([newAsset, ...stored]));
          } catch (_) {}
          resolve(newAsset);
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      };
      
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const newAsset: UploadedAsset = {
              id: `asset-${Date.now()}`,
              name: file.name,
              type: file.type || 'image/png',
              size: file.size,
              uploadDate: new Date().toLocaleDateString('fa-IR'),
              data: data.url
            };
            
            setAssets(prev => [newAsset, ...prev]);
            try {
              const stored = JSON.parse(localStorage.getItem('ashk_uploaded_assets') || '[]');
              localStorage.setItem('ashk_uploaded_assets', JSON.stringify([newAsset, ...stored]));
            } catch (_) {}
            resolve(newAsset);
          } catch (e) {
            console.error('Error parsing response:', e);
            fallbackToBase64();
          }
        } else {
          // Fallback to PHP upload.php directly
          console.warn("Node /api/upload returned non-success. Trying PHP fallback ./upload.php...");
          const phpXhr = new XMLHttpRequest();
          phpXhr.open('POST', './upload.php', true);
          phpXhr.upload.onprogress = xhr.upload.onprogress;
          
          phpXhr.onload = async () => {
            if (phpXhr.status >= 200 && phpXhr.status < 300) {
              try {
                const data = JSON.parse(phpXhr.responseText);
                const newAsset: UploadedAsset = {
                  id: `asset-${Date.now()}`,
                  name: file.name,
                  type: file.type || 'image/png',
                  size: file.size,
                  uploadDate: new Date().toLocaleDateString('fa-IR'),
                  data: data.url
                };
                setAssets(prev => [newAsset, ...prev]);
                try {
                  const stored = JSON.parse(localStorage.getItem('ashk_uploaded_assets') || '[]');
                  localStorage.setItem('ashk_uploaded_assets', JSON.stringify([newAsset, ...stored]));
                } catch (_) {}
                resolve(newAsset);
              } catch (e) {
                fallbackToBase64();
              }
            } else {
              fallbackToBase64();
            }
          };
          phpXhr.onerror = fallbackToBase64;
          const phpFormData = new FormData();
          phpFormData.append('image', file);
          phpXhr.send(phpFormData);
        }
      };
      
      xhr.onerror = () => {
        console.warn("Network error on /api/upload. Trying PHP fallback ./upload.php...");
        const phpXhr = new XMLHttpRequest();
        phpXhr.open('POST', './upload.php', true);
        phpXhr.upload.onprogress = xhr.upload.onprogress;
        
        phpXhr.onload = async () => {
          if (phpXhr.status >= 200 && phpXhr.status < 300) {
            try {
              const data = JSON.parse(phpXhr.responseText);
              const newAsset: UploadedAsset = {
                id: `asset-${Date.now()}`,
                name: file.name,
                type: file.type || 'image/png',
                size: file.size,
                uploadDate: new Date().toLocaleDateString('fa-IR'),
                data: data.url
              };
              setAssets(prev => [newAsset, ...prev]);
              try {
                const stored = JSON.parse(localStorage.getItem('ashk_uploaded_assets') || '[]');
                localStorage.setItem('ashk_uploaded_assets', JSON.stringify([newAsset, ...stored]));
              } catch (_) {}
              resolve(newAsset);
            } catch (e) {
              fallbackToBase64();
            }
          } else {
            fallbackToBase64();
          }
        };
        phpXhr.onerror = fallbackToBase64;
        const phpFormData = new FormData();
        phpFormData.append('image', file);
        phpXhr.send(phpFormData);
      };
      
      const formData = new FormData();
      formData.append('image', file);
      xhr.send(formData);
    });
  };

  const deleteAsset = async (id: string) => {
    const assetToDelete = assets.find(a => a.id === id);
    if (!assetToDelete) return;

    try {
      // Extract filename from URL (e.g., /uploads/filename.jpg or uploads/filename.jpg)
      const filename = assetToDelete.data.split('/').pop();
      if (filename && (assetToDelete.data.includes('uploads/')) && !assetToDelete.data.startsWith('data:')) {
        fetch(getApiBase() + `/api/files/${filename}`, { method: 'DELETE' }).catch(() => null);
        fetch(`./delete_file.php?file=${filename}`, { method: 'DELETE' }).catch(() => null);
      }
      setAssets(prev => {
        const updated = prev.filter(a => a.id !== id);
        try { localStorage.setItem('ashk_uploaded_assets', JSON.stringify(updated)); } catch (_) {}
        return updated;
      });
    } catch (error) {
      console.warn('Error deleting file:', error);
    }
  };

  // Load existing files on mount
  useEffect(() => {
    const loadFiles = async () => {
      try {
        let files: any[] = [];
        
        // 1. Try Node API first
        const nodeUrl = getApiBase() + '/api/files';
        try {
          const res = await fetch(nodeUrl);
          if (res.ok) {
            files = await res.json();
          }
        } catch (_) {}

        // 2. If no files, try PHP get_files.php
        if (!Array.isArray(files) || files.length === 0) {
          try {
            const phpRes = await fetch('./get_files.php');
            if (phpRes.ok) {
              files = await phpRes.json();
            }
          } catch (_) {}
        }

        if (Array.isArray(files) && files.length > 0) {
          const loadedAssets: UploadedAsset[] = files.map((f: any, index: number) => {
            const safeName = f.filename ? String(f.filename) : `file-${index}`;
            const fileUrl = f.url || (f.filename ? `uploads/${f.filename}` : '');
            return {
              id: f.id ? `server-asset-${f.id}` : `server-asset-${safeName}`,
              name: f.filename || `File ${index + 1}`,
              type: 'image/jpeg',
              size: f.size || 0,
              uploadDate: new Date().toLocaleDateString('fa-IR'),
              data: fileUrl
            };
          });
          
          setAssets(prev => {
            const normalizeUrl = (u: string) => u ? u.replace(/^\.\//, '/') : '';
            const serverUrls = new Set(loadedAssets.map(a => normalizeUrl(a.data)));
            
            // Keep all local assets, normalizing paths
            const validLocalAssets = prev.filter(a => !a.data.startsWith('blob:'));
            const existingNormUrls = new Set(validLocalAssets.map(a => normalizeUrl(a.data)));
            
            // Add server assets that aren't already in local state
            const newAssets = loadedAssets.filter(a => !existingNormUrls.has(normalizeUrl(a.data)));
            const combined = [...newAssets, ...validLocalAssets];
            
            const seen = new Set<string>();
            const result = combined.filter(item => {
              const normKey = normalizeUrl(item.data) || item.id;
              if (seen.has(normKey)) return false;
              seen.add(normKey);
              return true;
            });

            try {
              localStorage.setItem('ashk_uploaded_assets', JSON.stringify(result));
            } catch (_) {}

            return result;
          });
        }
      } catch (error) {
        console.warn('Error loading files from server:', error);
      }
    };
    loadFiles();
  }, []);

  return (
    <ContentContext.Provider value={{
      globalSettings, updateGlobalSettings, saveSettingsToHost, persistConfigToFirestore,
      pricingFormula, updatePricingFormula,
      siteContent, updateSiteContent,
      seoConfigs, updateSeoConfig, getSeoForView,
      catalogItems, portfolioItems, addMediaItem, updateMediaItem, removeMediaItem,
      deleteCatalog, updateCatalog, analyzeCatalog,
      blogPosts, addBlogPost, removeBlogPost,
      assets, uploadAsset, deleteAsset,
      isRawState, toggleRawState,
      emergencyConfig, updateEmergencyConfig
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error("useContent must be used within a ContentProvider");
  return context;
};
