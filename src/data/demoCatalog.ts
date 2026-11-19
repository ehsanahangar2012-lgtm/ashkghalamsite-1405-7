import { CatalogProject, CoverTemplateId } from '../types/flipbook';
import demoCeramicImg from '../assets/images/demo_ceramic_espresso_1795007088288.jpg';
import demoMinimalWatchImg from '../assets/images/demo_minimal_watch_1795007089659.jpg';
import demoDeskLampImg from '../assets/images/demo_desk_lamp_1795007089385.jpg';
import demoLeatherToteImg from '../assets/images/demo_leather_tote_1795007090173.jpg';

export interface CoverTemplatePreset {
  id: CoverTemplateId;
  name: string;
  description: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
}

export const COVER_TEMPLATES: CoverTemplatePreset[] = [
  {
    id: 'editorial-minimal',
    name: 'گالری مینیمال',
    description: 'ساده، مدرن و متمرکز بر تایپوگرافی و کادر خطی',
    primaryColor: '#fafaf9',
    accentColor: '#b45309',
    textColor: '#1c1917',
  },
  {
    id: 'luxury-foil',
    name: 'لوکس طلاکوب',
    description: 'پس‌زمینه تیره با قاب و خطوط طلایی سلطنتی',
    primaryColor: '#111827',
    accentColor: '#d4af37',
    textColor: '#f9fafb',
  },
  {
    id: 'modern-grid',
    name: 'صنعتی مدرن',
    description: 'ساختار مهندسی با نوار رنگی و تیتر جسورانه',
    primaryColor: '#0f172a',
    accentColor: '#0ea5e9',
    textColor: '#f8fafc',
  },
  {
    id: 'artisan-warm',
    name: 'بوتیک دست‌ساز',
    description: 'الهام‌گرفته از کاغذ کتان گرم و سبک کلاسیک',
    primaryColor: '#292524',
    accentColor: '#e07a5f',
    textColor: '#f5f5f4',
  },
  {
    id: 'full-image',
    name: 'تمام‌تصویر اختصاصی',
    description: 'استفاده از تصویر آپلودی به عنوان پس‌زمینه تمام‌صفحه جلد',
    primaryColor: '#18181b',
    accentColor: '#f59e0b',
    textColor: '#ffffff',
  },
];

export function createInitialDemoProject(): CatalogProject {
  return {
    id: 'demo-catalog-2026',
    name: 'کالکشن منتخب محصولات ۲۰۲۵',
    flipDirection: 'rtl',
    optimization: {
      quality: 0.82,
      maxDimension: 1200,
    },
    cover: {
      templateId: 'luxury-foil',
      primaryColor: '#111827',
      accentColor: '#d4af37',
      textColor: '#f9fafb',
      title: 'کاتالوگ جامع محصولات منتخب',
      subtitle: 'مجموعه طراحی صنعتی، اکسسوری و لوازم سبک زندگی مدرن',
      brandName: 'استودیو دیزاین آرتا',
      editionLabel: 'نسخه پاییز و زمستان',
      yearLabel: '۱۴۰۵',
      backHeadline: 'سفارش عمده و مشاوره خرید',
      backDescription:
        'تمامی محصولات این کاتالوگ با ضمانت اصالت، بسته‌بندی اختصاصی و ارسال سریع به سراسر کشور عرضه می‌شوند.',
      backContactInfo: 'تلفن: ۰۲۱-۸۸۴۴۱۲۰۰  ·  اینستاگرام: @arta.design',
      backWebsite: 'https://arta-catalog.ir',
      showPageNumbers: true,
    },
    pages: [
      {
        id: 'demo-p1',
        fileName: 'ceramic-espresso-set.jpg',
        title: 'ست قهوه‌دمی و فنجان سرامیکی دست‌ساز',
        description:
          'ساخته‌شده از خاک رس نسوز با لعاب مات مشکی و پایه سرامیکی طبیعی؛ طراحی‌شده برای دم‌آوری دقیق قهوه تخصصی با حفظ دمای ایده‌آل.',
        category: 'لوازم آشپزخانه و سرو',
        tags: ['سرامیک دست‌ساز', 'قهوه تخصصی', 'لعاب مات', 'طراحی مینیمال'],
        sku: 'ART-104',
        priceLabel: '۲,۴۵۰,۰۰۰ تومان',
        originalDataUrl: demoCeramicImg,
        optimizedDataUrl: demoCeramicImg,
        originalSizeBytes: 248000,
        optimizedSizeBytes: 248000,
        originalWidth: 900,
        originalHeight: 1200,
        width: 900,
        height: 1200,
        aiStatus: 'done',
      },
      {
        id: 'demo-p2',
        fileName: 'titanium-minimal-watch.jpg',
        title: 'ساعت مچی تیتانیوم سری کلاسیک',
        description:
          'بدنه تیتانیوم برس‌خورده فوق‌سبک همراه با صفحه خاکستری متالیک، شیشه یاقوت ضدخش و بند چرم طبیعی دست‌دوز.',
        category: 'اکسسوری و ساعت',
        tags: ['تیتانیوم', 'بند چرم طبیعی', 'ضدآب', 'کلاسیک مدرن'],
        sku: 'ART-209',
        priceLabel: '۱۴,۸۰۰,۰۰۰ تومان',
        originalDataUrl: demoMinimalWatchImg,
        optimizedDataUrl: demoMinimalWatchImg,
        originalSizeBytes: 262000,
        optimizedSizeBytes: 262000,
        originalWidth: 900,
        originalHeight: 1200,
        width: 900,
        height: 1200,
        aiStatus: 'done',
      },
      {
        id: 'demo-p3',
        fileName: 'architectural-desk-lamp.jpg',
        title: 'چراغ مطالعه معماری برنز آنودایز',
        description:
          'بازوی مفصلی دقیق با روکش برنز مات، نور LED بدون پرش با شاخص نمود رنگ بالا و کلید دیمر لمسی روی پایه.',
        category: 'روشنایی و دکوراسیون',
        tags: ['چراغ رومیزی', 'نور گرم', 'آلومینیوم آنودایز', 'دکوراسیون اداری'],
        sku: 'ART-315',
        priceLabel: '۶,۹۰۰,۰۰۰ تومان',
        originalDataUrl: demoDeskLampImg,
        optimizedDataUrl: demoDeskLampImg,
        originalSizeBytes: 231000,
        optimizedSizeBytes: 231000,
        originalWidth: 900,
        originalHeight: 1200,
        width: 900,
        height: 1200,
        aiStatus: 'done',
      },
      {
        id: 'demo-p4',
        fileName: 'cognac-leather-tote.jpg',
        title: 'کیف دستی چرم تمام‌دانه کنیاکی',
        description:
          'دوخته‌شده از چرم گاوی درجه یک با یراق‌آلات برنجی مقاوم، آستر جیر و محفظه اختصاصی لپ‌تاپ ۱۴ اینچ.',
        category: 'مد و چرم',
        tags: ['چرم طبیعی', 'کیف روزمره', 'یراق برنجی', 'دست‌دوز'],
        sku: 'ART-412',
        priceLabel: '۸,۲۰۰,۰۰۰ تومان',
        originalDataUrl: demoLeatherToteImg,
        optimizedDataUrl: demoLeatherToteImg,
        originalSizeBytes: 255000,
        optimizedSizeBytes: 255000,
        originalWidth: 900,
        originalHeight: 1200,
        width: 900,
        height: 1200,
        aiStatus: 'done',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}
