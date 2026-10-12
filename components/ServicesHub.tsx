import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Printer, Layers, Box, Sparkles, CheckCircle2, ArrowLeft, 
  HelpCircle, ShieldCheck, PenTool, Calculator, Cpu, X, 
  ChevronDown, FileText, Package, Wrench, Info, ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotFound } from './NotFound';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';

export interface ServiceDetail {
  id: string;
  slug: string;
  isMainCategory: boolean;
  parentSlug?: string;
  parentTitle?: string;
  title: string;
  h1: string;
  category: string;
  metaDescription: string;
  intro: string;
  description: string;
  applications: string[];
  specifications: string[];
  orderGuide: {
    steps: string[];
    requiredInfo: string[];
  };
  faq: {
    question: string;
    answer: string;
  }[];
  subServices?: {
    slug: string;
    title: string;
    desc: string;
  }[];
  relatedProducts: {
    slug: string;
    title: string;
    category: string;
  }[];
  relatedTools: {
    route: string;
    title: string;
    desc: string;
  }[];
  actionText: string;
  actionRoute: string;
}

export const SERVICES_DATA: ServiceDetail[] = [
  // 1. چاپ صنعتی (Main Destination 1)
  {
    id: 'printing',
    slug: 'printing',
    isMainCategory: true,
    title: 'خدمات چاپ صنعتی و چاپ افست',
    h1: 'خدمات تخصصی چاپ صنعتی و افست',
    category: 'خدمات چاپ صنعتی',
    metaDescription: 'خدمات چاپ افست صنعتی، چاپ روی انواع مقوای ایندربرد و گلاسه، فرم‌بندی اختصاصی و کنترل کیفیت رنگ در مجتمع چاپ اشک قلم.',
    intro: 'فرآیند چاپ صنعتی در اشک قلم بر پایه اجرای دقیق فرم‌های چاپی، تفکیک استانداردهای رنگی CMYK و اسپات (Spot Colors) و پوشش‌های محافظتی متناسب با نوع بسته‌بندی پیاده‌سازی می‌شود.',
    description: 'خدمات چاپ صنعتی شامل آماده‌سازی فایل‌های استاندارد لیتوگرافی، تهیه زینک‌های چاپی، چاپ روی بسته‌بندی‌های دارویی، غذایی و صنعتی و نظارت بر یکنواختی فام رنگی در تیراژهای مختلف است. استفاده از متریال‌های مقوایی با گرماژ گوناگون، زمینه را برای بسته‌بندی‌های لوکس و مقاوم مهیا می‌سازد.',
    applications: [
      'چاپ پوستر مقوایی کارتن‌های لمینتی صنعتی و کشاورزی',
      'چاپ جعبه‌های مقوایی دارویی، بهداشتی و آرایشی',
      'چاپ انواع کاتالوگ‌های فنی، بروشور و اقلام تبلیغاتی سازمانی',
      'چاپ لیبل، اسلیو و روکش‌های فانتزی بسته‌بندی'
    ],
    specifications: [
      'امکان چاپ روی مقوای ایندربرد، پشت طوسی، کرافت و کاغذ گلاسه',
      'گرماژ متریال قابل چاپ: از ۸۰ گرم کاغذ تا ۴۵۰ گرم مقوا',
      'پشتیبانی از سیستم رنگی چهاررنگ استاندارد (CMYK) و رنگ‌های ساختگی پنتون',
      'امکان اعمال ورنی براق یا مات آنلاین حین فرآیند چاپ'
    ],
    orderGuide: {
      steps: [
        'ارسال فایل طراحی استاندارد با تفکیک رنگی CMYK و خطوط تیغ مجزا',
        'بررسی فنی فایل از نظر رزولوشن تصاویر (حداقل ۳۰۰ DPI) و اضافه رنگ (Bleed)',
        'تهیه فرم و صدور تأییدیه قبل از چاپ',
        'عملیات چاپ و تحویل طبق برنامه زمان‌بندی توافق‌شده'
      ],
      requiredInfo: [
        'ابعاد گسترده طرح (طول و عرض شیت)',
        'جنس و گرماژ کاغذ یا مقوا',
        'تعداد رنگ و نوع پوشش تکمیلی (ورنی، سلفون یا بدون روکش)',
        'تیراژ درخواستی سفارش'
      ]
    },
    faq: [
      {
        question: 'تفاوت فرم عمومی با فرم اختصاصی چاپ در چیست؟',
        answer: 'در فرم اختصاصی، کل فضای زینک و دستگاه به سفارش شما اختصاص می‌یابد و تنظیم رنگ و باطله دقیقاً بر اساس نمونه رنگ تأییدشده انجام می‌شود؛ اما در فرم عمومی، چند سفارش روی یک زینک چیده شده و هزینه کاهش می‌یابد ولی امکان کنترل دقیق تک‌تک رنگ‌ها وجود ندارد.'
      },
      {
        question: 'فایل‌های چاپی باید با چه فرمتی ارسال شوند؟',
        answer: 'فرمت استاندارد پیشنهادی PDF با استاندارد چاپی (PDF/X-1a یا PDF/X-4) است. همچنین فونت‌های متن حتماً باید تبدیل به منحنی (Curve/Outline) شده و تصاویر دارای وضوح ۳۰۰ پیکسل بر اینچ باشند.'
      }
    ],
    subServices: [
      {
        slug: 'offset-printing',
        title: 'چاپ افست چندرنگ صنعتی',
        desc: 'فرآیند تفکیک رنگ دقیق با قابلیت اعمال پوشش ورنی همزمان برای تولید تیراژ متوسط و بالا.'
      },
      {
        slug: 'surface-finishing',
        title: 'پوشش‌های تکمیلی و محافظتی (UV و سلفون)',
        desc: 'سلفون‌کشی مات و براق، یووی موضعی و طلاکوب برای ارتقای دوام و جلوه بصری چاپ.'
      }
    ],
    relatedProducts: [
      {
        slug: 'pharma-cosmetics',
        title: 'جعبه‌های دارویی، آرایشی و بهداشتی',
        category: 'جعبه‌های مقوایی بهداشتی'
      }
    ],
    relatedTools: [
      {
        route: '/tools/design-studio',
        title: 'استودیو طراحی آنلاین',
        desc: 'ابزار طراحی گرافیکی و چیدمان بصری طرح روی قالب'
      }
    ],
    actionText: 'استعلام هزینه چاپ',
    actionRoute: '/inquiry?service=printing'
  },

  // 2. مهندسی بسته‌بندی (Main Destination 2)
  {
    id: 'packaging',
    slug: 'packaging',
    isMainCategory: true,
    title: 'خدمات طراحی و مهندسی بسته‌بندی',
    h1: 'خدمات طراحی و مهندسی بسته‌بندی',
    category: 'خدمات مهندسی بسته‌بندی',
    metaDescription: 'طراحی سازه، مدل‌سازی سه‌بعدی و تولید انواع بسته‌بندی مقوایی، کارتنی و صادراتی با رعایت استانداردهای محافظت و انبارداری در اشک قلم.',
    intro: 'بسته‌بندی مهندسی‌شده تلفیقی از استحکام ساختاری جهت محافظت از کالا و طراحی کاربردی برای سهولت مصرف‌کننده و تمایز در قفسه بازار است.',
    description: 'خدمات بسته‌بندی در اشک قلم از تحلیل نیازهای فیزیکی محصول (وزن، ابعاد، شیوه چیدمان در انبار و حساسیت به ضربه یا رطوبت) آغاز شده و با ترسیم دایلاین‌های اختصاصی، پیش‌نمایش ۳ بعدی مجازی و انتخاب متریال مقوا یا کارتن به مرحله تولید نهایی می‌رسد.',
    applications: [
      'بسته‌بندی‌های صادراتی خشکبار، زعفران، خرما و محصولات غذایی',
      'بسته‌بندی بهداشتی محصولات آرایشی، دارویی و شوینده‌ها',
      'بسته‌بندی صنعتی قطعات خودرو، لوازم خانگی و ابزارآلات',
      'بسته‌بندی‌های سبک و بازشونده سریع ویژه تجارت الکترونیک'
    ],
    specifications: [
      'طراحی سازه بر پایه استانداردهای جهانی دایلاین (ECMA و FEFCO)',
      'انطباق با نیازمندی‌های چیدمان پالت و استانداردهای انبارداری',
      'امکان ترکیب انواع مقواهای چندلایه با ساختارهای فلوتینگ کنگره‌ای',
      'قابلیت شبیه‌سازی ۳ بعدی قبل از ساخت قالب و شروع چاپ'
    ],
    orderGuide: {
      steps: [
        'ارسال ابعاد کالا، وزن خالص و نحوه قرارگیری درون بسته',
        'طراحی ساختار دایلاین و تست ماکت سه‌بعدی دیجیتال',
        'انتخاب متریال مناسب (کارتن، ایندربرد، کرجی)',
        'ساخت قالب و ورود به خط تولید و چاپ'
      ],
      requiredInfo: [
        'ابعاد دقیق سه وجه محصول (طول، عرض، ارتفاع)',
        'وزن محصول و حساسیت به بار فشاری در انبار',
        'تعداد مورد نیاز در کارتن مادر',
        'تیراژ و برنامه مصرف سفارش'
      ]
    },
    faq: [
      {
        question: 'چگونه می‌توان پیش از سفارش انبوه از تناسب ابعاد بسته با کالا اطمینان یافت؟',
        answer: 'اشک قلم امکان مدل‌سازی سه‌بعدی دقیق در جعبه‌ساز ۳D آنلاین را فراهم کرده و در صورت نیاز فنی، امکان ارائه نقشه دایلاین ۲ بعدی و ماکت سفید جهت تست فیزیکی محصول وجود دارد.'
      },
      {
        question: 'چه نوع بسته‌بندی برای محصولات صادراتی مناسب‌تر است؟',
        answer: 'برای صادرات، معمولاً کارتن‌های لمینتی ۵ لایه با فلوت‌های مقاوم و پوشش‌های ورنی یا سلفون مات/براق برای حفظ زیبایی و مقاومت در برابر رطوبت پیشنهاد می‌شود.'
      }
    ],
    subServices: [
      {
        slug: 'box-making',
        title: 'خدمات جعبه‌سازی و هاردباکس',
        desc: 'ساخت انواع جعبه‌های مقوایی تاشو و جعبه‌های سخت لوکس.'
      },
      {
        slug: 'carton-making',
        title: 'خدمات کارتن‌سازی و ورق کنگره‌ای',
        desc: 'تولید کارتن‌های مادر، لمینتی و کنگره‌ای با مقاومت فشاری بالا.'
      }
    ],
    relatedProducts: [
      {
        slug: 'laminated-boxes',
        title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی',
        category: 'کارتن‌های صادراتی سنگین'
      },
      {
        slug: 'ecommerce-mailer',
        title: 'کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها',
        category: 'بسته‌بندی تجارت الکترونیک'
      }
    ],
    relatedTools: [
      {
        route: '/tools/dieline',
        title: 'مولد سه‌بعدی دایلاین جعبه',
        desc: 'محاسبه آنلاین خط تیغ و مشاهده سه‌بعدی جعبه'
      }
    ],
    actionText: 'استعلام مهندسی بسته‌بندی',
    actionRoute: '/inquiry?category=box&service=packaging'
  },

  // 3. جعبه‌سازی (Main Destination 3)
  {
    id: 'box-making',
    slug: 'box-making',
    isMainCategory: true,
    title: 'خدمات جعبه‌سازی، هاردباکس و جعبه مقوایی',
    h1: 'خدمات جعبه‌سازی، هاردباکس و جعبه مقوایی',
    category: 'خدمات جعبه‌سازی صنعتی',
    metaDescription: 'طراحی و ساخت انواع جعبه‌های مقوایی بهداشتی، جعبه سخت (هاردباکس)، جعبه‌های دارویی، فست‌فودی و کادویی با قالب‌سازی دقیق در اشک قلم.',
    intro: 'جعبه‌سازی صنعتی تلفیق هنر و هندسه سازه است؛ جایی که انتخاب نوع قفل، ضخامت مقوا و دقت خطوط تا، ایستایی و کارایی نهایی محصول را شکل می‌دهد.',
    description: 'خدمات جعبه‌سازی شامل طراحی ساختار دایلاین، ساخت قالب‌های تیغ و خط تا، برش دایکات، و فرآیندهای چسب‌زنی (تک‌نقطه، سه‌نقطه قفل‌دار و لاک‌باتم) و تولید هاردباکس با مغزی مقوای فشرده و روکش‌های فانتزی است.',
    applications: [
      'جعبه‌های دارویی با امکان درج خط بریل و قفل خودکار کف',
      'جعبه‌های مواد غذایی و رستورانی با مقوای ایندربرد بهداشتی',
      'هاردباکس‌های لوکس مگنتی، کشویی و تلسکوپی برای عطر، ساعت و زعفران',
      'جعبه‌های سبک کیبوردی و قفل‌دار جهت توزیع مرسولات'
    ],
    specifications: [
      'متریال مصرفی: ایندربرد بهداشتی، مقوای پشت طوسی، پشت کرافت و مقوای فشرده کرجی',
      'تیپ‌های قفل: زبانه معکوس (Tuck-end)، قفل خودکار کف (Auto-lock / Crash lock bottom)، دو تکه درب و کف',
      'امکان تعبیه پنجره طلقی (Window Patching) و برجسته‌سازی',
      'پشتیبانی کامل از نقشه‌های CAD استاندارد'
    ],
    orderGuide: {
      steps: [
        'تعیین ابعاد دقیق کالا و مدل درب جعبه',
        'طراحی وکتور دایلاین و بررسی خطوط تا و برش',
        'انتخاب نوع مقوا و پوشش‌های سطحی',
        'دایکات، جعبه‌چسبانی و کنترل کیفیت نهایی'
      ],
      requiredInfo: [
        'ابعاد داخلی جعبه (طول × عرض × ارتفاع به میلی‌متر)',
        'گرماژ و نوع مقوای مد نظر',
        'تیپ قالب (قفل دار، کیبوردی، کشویی یا هاردباکس)',
        'تیراژ تولید'
      ]
    },
    faq: [
      {
        question: 'تفاوت جعبه مقوایی تاشو با جعبه سخت (هاردباکس) چیست؟',
        answer: 'جعبه‌های مقوایی از یک لایه مقوای تاپذیر (مانند ایندربرد ۲۵۰ تا ۳۵۰ گرم) ساخته شده و به شکل تخت تحویل می‌شوند؛ درحالی‌که هاردباکس از مغزی مقوای فشرده ضخیم (۱.۵ تا ۳ میلی‌متر) ساخته شده که تاشو نیست و با روکش کاغذی یا چرمی پوشانده می‌شود.'
      },
      {
        question: 'آیا برای جعبه‌های دارویی امکان درج خط بریل وجود دارد؟',
        answer: 'بله، سمبه و ماتریس برجسته‌سازی خط بریل طبق استانداردهای دارویی بر روی قالب دایکات قابل پیاده‌سازی است.'
      }
    ],
    subServices: [
      {
        slug: 'diecut-tooling',
        title: 'قالب‌سازی لیزری و تیغ دایکات',
        desc: 'ترسیم وکتور دایلاین و برش لیزری تخته قالب با تیغ‌های فولادی استاندارد.'
      },
      {
        slug: 'offset-printing',
        title: 'چاپ افست جعبه و پوستر',
        desc: 'چاپ باکیفیت طرح روی مقوا قبل از عملیات دایکات و جعبه‌چسبانی.'
      }
    ],
    relatedProducts: [
      {
        slug: 'rigid-hardbox',
        title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی',
        category: 'بسته‌بندی هاردباکس لوکس'
      },
      {
        slug: 'pharma-cosmetics',
        title: 'جعبه‌های دارویی، آرایشی و بهداشتی',
        category: 'جعبه‌های مقوایی بهداشتی'
      }
    ],
    relatedTools: [
      {
        route: '/tools/dieline',
        title: 'جعبه‌ساز سه‌بعدی دایلاین',
        desc: 'محاسبه و خروجی دایلاین استاندارد جعبه'
      }
    ],
    actionText: 'استعلام تولید جعبه',
    actionRoute: '/inquiry?category=box&service=box-making'
  },

  // 4. کارتن‌سازی (Main Destination 4)
  {
    id: 'carton-making',
    slug: 'carton-making',
    isMainCategory: true,
    title: 'خدمات کارتن‌سازی، تولید کارتن لمینتی و کنگره‌ای',
    h1: 'خدمات کارتن‌سازی، تولید کارتن لمینتی و کنگره‌ای',
    category: 'خدمات کارتن‌سازی و ورق کنگره‌ای',
    metaDescription: 'تولید کارتن‌های لمینتی، دایکاتی و آمریکایی ۳ لایه و ۵ لایه با فلوت‌های E، B، C و مقاومت فشاری بالا جهت مصارف صنعتی و صادراتی در اشک قلم.',
    intro: 'کارتن‌سازی ستون فقرات بسته‌بندی، انبارداری و صادرات محصولات است. انتخاب ترکیب مناسب فلوتینگ و لاینر تضمین‌کننده مقاومت کارتن در برابر بارهای دینامیکی و استاتیکی حمل‌ونقل است.',
    description: 'خدمات کارتن‌سازی در اشک قلم شامل تولید انواع کارتن‌های ساده و دایکاتی با فلوت‌های کنگره‌ای، لمینت پوستر افست گلاسه بر روی ورق کارتن، دایکات، چسب و منگنه صنعتی جهت ارائه بسته‌بندی‌های مقاوم صادراتی و تجاری است.',
    applications: [
      'کارتن‌های مادر صادراتی میوه، سبزیجات، خرما و خشکبار',
      'کارتن‌های بسته‌بندی قطعات یدکی و لوازم سنگین صنعتی',
      'کارتن‌های لمینتی با وضوح چاپ بالا ویژه محصولات مصرفی و شوینده‌ها',
      'کارتن‌های کیبوردی ارسالی پست و خریدهای اینترنتی'
    ],
    specifications: [
      'انواع لایه‌بندی: سینگل فیس، ۳ لایه (فلوت E، B، C) و ۵ لایه (ترکیب فلوت‌های BC و EB)',
      'انواع کاغذ لاینر: کاغذ کرافت سنگین، تست لاینر و فلوتینگ بهداشتی',
      'روش‌های اتصال لبه: چسب حرارتی، چسب سرد بهداشتی و منگنه فولادی',
      'تطابق سازه با استانداردهای فدراسیون بین‌المللی کارتن‌سازان (FEFCO)'
    ],
    orderGuide: {
      steps: [
        'تعیین ابعاد داخلی کارتن بر اساس ابعاد و وزن کالا',
        'مشخص کردن تعداد لایه‌ها و ترکیب فلوت کارتن',
        'انتخاب نوع چاپ (فلکسو یا لمینت افست)',
        'برش دایکات یا خط و چاک و اتصال نهایی'
      ],
      requiredInfo: [
        'ابعاد داخلی کارتن (طول × عرض × ارتفاع)',
        'وزن تقریبی محصول داخل هر کارتن',
        'تعداد کارتن چیده‌شده روی هم در انبار یا پالت',
        'تیراژ و نیاز به پوشش ضد رطوبت'
      ]
    },
    faq: [
      {
        question: 'تفاوت کارتن لمینتی با کارتن معمولی چاپ فلکسو چیست؟',
        answer: 'در کارتن معمولی، طرح به صورت مستقیم روی ورق کارتن چاپ می‌شود؛ اما در کارتن لمینتی، پوستر کاغذی ابتدا با چاپ افست با کیفیت بالا چاپ شده و سپس روی ورق کارتن چسبانده می‌شود که برای محصولات صادراتی و نمایش در قفسه فروشگاه جلوه بسیار بیشتری دارد.'
      },
      {
        question: 'کارتن ۳ لایه برای چه وزنی و ۵ لایه برای چه وزنی توصیه می‌شود؟',
        answer: 'به طور عمومی، کارتن‌های ۳ لایه برای وزن‌های سبک تا حدود ۵ الی ۸ کیلوگرم و کارتن‌های ۵ لایه برای وزن‌های سنگین‌تر (۱۰ تا ۲۵ کیلوگرم یا چیدمان چند ردیف روی پالت) استفاده می‌شوند.'
      }
    ],
    subServices: [
      {
        slug: 'laminated-carton',
        title: 'تولید کارتن‌های لمینتی و کنگره‌ای',
        desc: 'خطوط اتوماتیک لمینت فلوت‌های E ،B ،C با پوستر چاپ‌شده افست.'
      },
      {
        slug: 'diecut-tooling',
        title: 'قالب‌سازی لیزری و تیغ دایکات',
        desc: 'ساخت قالب‌های دایکات برای برش کارتن‌های کیبوردی و هندل‌دار.'
      }
    ],
    relatedProducts: [
      {
        slug: 'laminated-boxes',
        title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی',
        category: 'کارتن‌های صادراتی سنگین'
      },
      {
        slug: 'ecommerce-mailer',
        title: 'کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها',
        category: 'بسته‌بندی تجارت الکترونیک'
      }
    ],
    relatedTools: [
      {
        route: '/tools/autocad',
        title: 'استودیو اتوکد CAD',
        desc: 'مشاهده نقشه‌های وکتور و طراحی صنعتی کارتن'
      }
    ],
    actionText: 'استعلام هزینه کارتن‌سازی',
    actionRoute: '/inquiry?category=box&service=carton-making'
  },

  // 5. چاپ افست صنعتی چندرنگ (Sub-Service 1)
  {
    id: 'offset-printing',
    slug: 'offset-printing',
    isMainCategory: false,
    parentSlug: 'printing',
    parentTitle: 'خدمات چاپ صنعتی',
    title: 'چاپ افست صنعتی ۵ رنگ همزمان',
    h1: 'چاپ افست صنعتی ۵ رنگ همزمان',
    category: 'خدمات چاپ صنعتی',
    metaDescription: 'خطوط چاپ افست چندرنگ همزمان با پوشش ورنی آنلاین، مناسب برای تولید انبوه جعبه‌های مقوایی، کاتالوگ و بسته‌بندی در اشک قلم.',
    intro: 'چاپ افست استاندارد اصلی صنعت برای تولید انبوه بسته‌بندی‌های باکیفیت و تصاویر با تفکیک رنگی بالا به شمار می‌رود.',
    description: 'خطوط چاپ افست صنعتی امکان چاپ ۵ رنگ همزمان (چهاررنگ اصلی CMYK به همراه رنگ اختصاصی پنتون یا ورنی آنلاین) را فراهم کرده و برای تولید جعبه‌های مقوایی، پوستر لمینت و کاتالوگ‌های حرفه‌ای به کار می‌روند.',
    applications: [
      'چاپ جعبه‌های مقوایی بهداشتی و آرایشی',
      'چاپ پوسترهای گلاسه کارتن‌های لمینتی',
      'چاپ بروشورها و ژورنال‌های محصولات صنعتی'
    ],
    specifications: [
      'تفکیک رنگ دقیق با تطابق استانداردهای رنگی',
      'امکان اعمال ورنی محافظ همزمان حین چاپ',
      'پشتیبانی از انواع مقواهای ایندربرد، پشت طوسی و کاغذ گلاسه',
      'کنترل چگالی و غلظت رنگ در طول تیراژ'
    ],
    orderGuide: {
      steps: [
        'ارسال فایل چاپی با فرمت استاندارد',
        'تفکیک لایه‌های رنگ و ساخت زینک',
        'تنظیم اولیه ماشین چاپ و تست شیت',
        'تولید تیراژ کامل و بررسی کیفیت'
      ],
      requiredInfo: [
        'تعداد رنگ‌های کار (چهاررنگ یا رنگ ساختگی)',
        'ابعاد شیت چاپی و گرماژ متریال',
        'نوع روکش نهایی'
      ]
    },
    faq: [
      {
        question: 'چرا از رنگ پنجم یا رنگ ساختگی استفاده می‌شود؟',
        answer: 'برای ایجاد رنگ‌های ویژه سازمانی (مانند نقره‌ای، طلایی یا کدهای خاص پنتون) که با ترکیب ۴ رنگ اصلی CMYK حاصل نمی‌شوند، از رنگ ساختگی به عنوان برج پنجم استفاده می‌شود.'
      }
    ],
    relatedProducts: [
      {
        slug: 'pharma-cosmetics',
        title: 'جعبه‌های دارویی و بهداشتی',
        category: 'جعبه‌های مقوایی بهداشتی'
      }
    ],
    relatedTools: [
      {
        route: '/tools/design-studio',
        title: 'استودیو طراحی آنلاین',
        desc: 'بررسی رنگ و چیدمان طرح روی بسته‌بندی'
      }
    ],
    actionText: 'استعلام چاپ افست',
    actionRoute: '/inquiry?service=offset-printing'
  },

  // 6. تولید کارتن‌های لمینتی و کنگره‌ای (Sub-Service 2)
  {
    id: 'laminated-carton',
    slug: 'laminated-carton',
    isMainCategory: false,
    parentSlug: 'carton-making',
    parentTitle: 'خدمات کارتن‌سازی',
    title: 'تولید کارتن‌های لمینتی و کنگره‌ای',
    h1: 'تولید کارتن‌های لمینتی و کنگره‌ای',
    category: 'کارتن‌سازی و بسته‌بندی سنگین',
    metaDescription: 'تولید کارتن‌های لمینتی فلوت‌های E ،B ،C سه‌لایه و پنج‌لایه با پوستر چاپ‌شده افست و استحکام فشاری استاندارد در اشک قلم.',
    intro: 'کارتن لمینتی محصول اتصال یک پوستر مقوایی با چاپ باکیفیت افست بر روی ورق کارتن کنگره‌ای با چسب‌های بهداشتی است.',
    description: 'خط اتوماتیک لمینت فلوت‌های E ،B ،C و سه‌لایه/پنج‌لایه با پوستر چاپ‌شده افست با چسب‌های استاندارد سیلیکاتی و نشاسته اجرا شده و بیشترین استحکام کششی و مقاومت لبه‌ای را برای بسته‌بندی‌های صادراتی فراهم می‌کند.',
    applications: [
      'کارتن‌های صادراتی قطعات خودرو و ماشین‌آلات',
      'کارتن‌های سبدی و تلسکوپی میوه و مرکبات',
      'کارتن‌های محصولات شوینده و بهداشتی با بسته‌بندی چشمگیر'
    ],
    specifications: [
      'لمینت سرد و گرم ورق کارتن بدون حباب یا تابیدگی',
      'برش دقیق دایکات بر اساس نقشه قالب سازه',
      'پوشش‌های ورنی یا سلفون مات/براق روی پوستر',
      'تحمل وزن بالا برای حمل و ترابری جاده‌ای و دریایی'
    ],
    orderGuide: {
      steps: [
        'دریافت نمونه یا ابعاد کالای داخل بسته',
        'طراحی قالب و تهیه پوستر چاپی',
        'عملیات لمینت پوستر روی ورق کنگره‌ای',
        'دایکات، چسب و بسته‌بندی شیرینگ پالت'
      ],
      requiredInfo: [
        'ترکیب فلوتینگ (E, B, C یا ۵ لایه)',
        'ابعاد کارتن و وزن محصول',
        'نوع روکش پوستر لمینت'
      ]
    },
    faq: [
      {
        question: 'چسب لمینت چه تأثیری در مقاومت کارتن دارد؟',
        answer: 'استفاده از چسب مناسب نشاسته‌ای یا سیلیکاتی بدون رطوبت اضافی باعث می‌شود کارتن پس از لمینت دچار تابیدگی نشود و مقاومت فشاری لبه‌های کارتن (ECT) حفظ شود.'
      }
    ],
    relatedProducts: [
      {
        slug: 'laminated-boxes',
        title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی',
        category: 'کارتن‌های صادراتی سنگین'
      }
    ],
    relatedTools: [
      {
        route: '/tools/dieline',
        title: 'طراحی قالب در جعبه‌ساز 3D',
        desc: 'ساخت آنلاین نقشه و مشاهده سه بعدی کارتن'
      }
    ],
    actionText: 'طراحی قالب در جعبه‌ساز 3D',
    actionRoute: '/tools/dieline'
  },

  // 7. قالب‌سازی لیزری و تیغ دایکات (Sub-Service 3)
  {
    id: 'diecut-tooling',
    slug: 'diecut-tooling',
    isMainCategory: false,
    parentSlug: 'box-making',
    parentTitle: 'خدمات جعبه‌سازی',
    title: 'قالب‌سازی لیزری و تیغ دایکات',
    h1: 'قالب‌سازی لیزری و تیغ دایکات',
    category: 'قالب و تیغ‌سازی صنعتی',
    metaDescription: 'ترسیم وکتور استاندارد دایلاین، برش لیزری تخته قالب و کشیدن تیغ‌های استاندارد خط تا و پرفراژ برای دایکات در اشک قلم.',
    intro: 'دقت در برش و ساخت قالب دایکات، زیربنای تولید جعبه‌هایی با خطوط تای تمیز، بدون ترکیدگی و با قفل‌بندی سریع است.',
    description: 'ترسیم وکتور استاندارد دایلاین با رعایت فرمول‌های استاندارد کارتن و جعبه، برش لیزری پلی‌وود و کشیدن تیغ‌های استاندارد برش، خط تا و پرفراژ به همراه رابرهای جهنده محافظ در این بخش انجام می‌شود.',
    applications: [
      'ساخت قالب‌های دایکات فکی، بوبست و غلطکی روتاری',
      'تولید سنبه و ماتریس برجسته‌سازی و کلیشه طلاکوب',
      'قالب‌های اختصاصی جعبه‌های کیبوردی، دارویی و چندتکه'
    ],
    specifications: [
      'برش لیزری تخته پلی‌وود با دقت ابعادی بالا',
      'استفاده از تیغ‌های فولادی استاندارد برش و خط تا',
      'نصب رابرهای جهنده جهت تخلیه سریع پوشال',
      'سازگاری کامل با نقشه‌های DXF و فایل‌های وکتور CAD'
    ],
    orderGuide: {
      steps: [
        'ارسال نقشه وکتور دایلاین با مقیاس ۱:۱',
        'بررسی ضخامت متریال و تنظیم فاصله خطوط تا',
        'برش لیزری تخته قالب و تیغ‌کشی دستی/ماشینی',
        'تست نهایی نمونه اولیه دایکات'
      ],
      requiredInfo: [
        'ضخامت و نوع متریال مصرفی (مقوا یا کارتن و ارتفاع فلوت)',
        'نوع دستگاه دایکات (فکی، اتوماتیک یا روتاری)',
        'فایل نقشه دایلاین (DXF, AI, PDF)'
      ]
    },
    faq: [
      {
        question: 'چرا فاصله خط تا با ضخامت متریال تنظیم می‌شود؟',
        answer: 'زیرا متریال‌های مختلف (مانند مقوای ایندربرد در برابر کارتن ۵ لایه) ضخامت متفاوتی دارند و اگر فضای خمیدگی کاغذ محاسبه نشود، لبه‌های جعبه دچار ترکیدگی یا عدم تقارن در بسته شدن می‌شوند.'
      }
    ],
    relatedProducts: [
      {
        slug: 'rigid-hardbox',
        title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی',
        category: 'بسته‌بندی هاردباکس لوکس'
      }
    ],
    relatedTools: [
      {
        route: '/tools/autocad',
        title: 'استودیو اتوکد CAD',
        desc: 'مشاهده نقشه‌های وکتور و خطوط تیغ دایلاین'
      }
    ],
    actionText: 'مشاهده استودیو اتوکد CAD',
    actionRoute: '/tools/autocad'
  },

  // 8. پوشش‌های محافظتی و تکمیلی (Sub-Service 4)
  {
    id: 'surface-finishing',
    slug: 'surface-finishing',
    isMainCategory: false,
    parentSlug: 'printing',
    parentTitle: 'خدمات چاپ صنعتی',
    title: 'پوشش‌های محافظتی و تکمیلی چاپ (UV و سلفون)',
    h1: 'پوشش‌های محافظتی و تکمیلی چاپ (UV و سلفون)',
    category: 'خدمات تکمیلی چاپ',
    metaDescription: 'سلفون‌کشی مات و براق، یووی موضعی، طلاکوب گرم و بافت امباس برای محافظت و افزایش ماندگاری جعبه و بسته‌بندی در اشک قلم.',
    intro: 'پوشش‌های تکمیلی علاوه بر محافظت از مرکب چاپ در برابر سایش، رطوبت و نور، ارزش حسی و بصری بسته‌بندی را دوچندان می‌کنند.',
    description: 'اجرای سلفون‌کشی حرارتی مات، براق و مخملی (Soft Touch)، یووی موضعی سیلندری، یووی شنی، اکلیلی و برجسته به همراه طلاکوب و نقره‌کوب حرارتی روی انواع جعبه، کارتن و لیبل با استانداردهای ماندگاری صنعتی انجام می‌شود.',
    applications: [
      'سلفون‌کشی محافظتی برای جعبه‌های دارویی، آرایشی و غذایی',
      'یووی موضعی جهت برجسته نشان دادن لوگو و نام برند',
      'طلاکوب و نقره‌کوب حرارتی برای کالاهای لوکس و صادراتی',
      'ایجاد بافت امباس برجسته و فرورفته روی سطح مقوا'
    ],
    specifications: [
      'سلفون حرارتی مقاوم در برابر رطوبت، خط و خش و سایش',
      'یووی موضعی با رزولوشن شابلونی بالا و درخشندگی ویژه',
      'امکان طلاکوب حرارتی با کلیشه‌های برنجی و منیزیمی',
      'ثبات پوشش در برابر چسب لبه جعبه و خط تا'
    ],
    orderGuide: {
      steps: [
        'طراحی لایه مجزا با رنگ تک‌رنگ (مشکی ۱۰۰) برای بخش‌های UV یا طلاکوب',
        'انجام چاپ و سلفون‌کشی اولیه',
        'انطباق شابلون یا کلیشه روی نقاط تعیین‌شده',
        'تثبیت نهایی پوشش با اشعه UV یا حرارت'
      ],
      requiredInfo: [
        'نوع پوشش مد نظر (سلفون مات، براق، مخملی، یووی موضعی، طلاکوب)',
        'فایل تفکیک‌شده بخش‌های پوشش تکمیلی',
        'گرماژ مقوای زیرین'
      ]
    },
    faq: [
      {
        question: 'آیا روی سلفون براق می‌توان یووی موضعی زد؟',
        answer: 'معمولاً یووی موضعی روی سلفون مات زده می‌شود تا تضاد چشمگیر میان سطح مات زمینه و براقیت یووی موضعی ایجاد شود. روی سلفون براق به دلیل یکدستی براقیت، جلوه موضعی به چشم نمی‌آید.'
      }
    ],
    relatedProducts: [
      {
        slug: 'rigid-hardbox',
        title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی',
        category: 'بسته‌بندی هاردباکس لوکس'
      }
    ],
    relatedTools: [
      {
        route: '/catalog',
        title: 'کاتالوگ و ژورنال نمونه‌ها',
        desc: 'مشاهده بافت‌ها و پوشش‌های اجراشده'
      }
    ],
    actionText: 'مشاهده کاتالوگ نمونه‌ها',
    actionRoute: '/catalog'
  }
];

export const ServicesHub: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [showHelp, setShowHelp] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // If a slug is provided, find specific service
  const activeService = slug ? SERVICES_DATA.find(s => s.slug === slug) : null;

  // If an unknown slug is entered, render 404
  if (slug && !activeService) {
    return <NotFound />;
  }

  // Schema generation for active service (Service + FAQPage)
  const serviceSchema = activeService ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `https://ashkghalam.ir/services/${activeService.slug}#service`,
        "name": activeService.title,
        "description": activeService.metaDescription,
        "provider": {
          "@type": "Organization",
          "name": "صنایع چاپ و بسته‌بندی اشک قلم",
          "url": "https://ashkghalam.ir"
        },
        "serviceType": activeService.category
      },
      ...(activeService.faq && activeService.faq.length > 0 ? [{
        "@type": "FAQPage",
        "@id": `https://ashkghalam.ir/services/${activeService.slug}#faq`,
        "mainEntity": activeService.faq.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": f.answer
          }
        }))
      }] : [])
    ]
  } : undefined;

  return (
    <div className="py-10 max-w-7xl mx-auto px-4 md:px-8 font-sans dir-rtl text-right">
      {activeService ? (
        <SeoHead 
          view={AppView.SERVICES}
          canonicalPath={`/services/${activeService.slug}`}
          customTitle={`${activeService.title} | صنایع چاپ اشک قلم`}
          customDescription={activeService.metaDescription}
          structuredData={serviceSchema}
          noIndex={false}
        />
      ) : (
        <SeoHead 
          view={AppView.SERVICES}
          canonicalPath="/services"
          customTitle="خدمات صنعتی و مهندسی چاپ و بسته‌بندی | اشک قلم"
          customDescription="ارائه زنجیره کامل فرآیندهای تولید از مشاوره سازه کارتن و مدل‌سازی سه‌بعدی تا چاپ افست ۵ رنگ، لمینت، ساخت تیغ لیزری و پوشش‌های UV."
          noIndex={false}
        />
      )}

      {/* Semantic Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/')}>خانه</span>
        <span>/</span>
        <span 
          className={slug ? "hover:text-primary-600 cursor-pointer" : "text-gray-900 dark:text-white font-bold"} 
          onClick={() => navigate('/services')}
        >
          خدمات صنعتی اشک قلم
        </span>
        {activeService && activeService.parentSlug && (
          <>
            <span>/</span>
            <span 
              className="hover:text-primary-600 cursor-pointer" 
              onClick={() => navigate(`/services/${activeService.parentSlug}`)}
            >
              {activeService.parentTitle}
            </span>
          </>
        )}
        {activeService && (
          <>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">{activeService.title}</span>
          </>
        )}
      </nav>

      {/* Detail View of Individual Service */}
      {activeService ? (
        <article className="space-y-10">
          {/* Header Card with Single H1 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-150 dark:border-gray-700 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6 mb-6">
              <div>
                <span className="text-xs font-black text-primary-600 dark:text-primary-400 block mb-2">
                  {activeService.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white leading-tight">
                  {activeService.h1}
                </h1>
              </div>
              <button 
                onClick={() => navigate('/services')}
                className="self-start sm:self-auto text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                <span>بازگشت به همه خدمات</span>
              </button>
            </div>

            {/* Intro Paragraph */}
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium leading-relaxed mb-6 bg-primary-50/50 dark:bg-primary-950/20 p-4 rounded-2xl border border-primary-100/50 dark:border-primary-900/30">
              {activeService.intro}
            </p>

            {/* Main Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
              {activeService.description}
            </p>

            {/* Practical Industrial Applications */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-primary-600" />
                <span>کاربردهای واقعی در صنایع مختلف:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeService.applications.map((app, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{app}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Specifications */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>مشخصات فنی و استانداردهای تولید:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeService.specifications.map((spec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{spec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Guide & Required Info Checklist */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-primary-50/40 dark:from-gray-750 dark:to-gray-800 border border-indigo-100 dark:border-gray-700 mb-8">
              <h2 className="font-black text-base text-indigo-950 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>راهنمای سفارش و اطلاعات مورد نیاز جهت استعلام:</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-300 mb-2">مراحل انجام سفارش:</h3>
                  <ol className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    {activeService.orderGuide.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-black text-indigo-900 dark:text-indigo-300 mb-2">اطلاعات لازم برای اعلام هزینه:</h3>
                  <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                    {activeService.orderGuide.requiredInfo.map((inf, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-500 dark:text-indigo-400 font-black">•</span>
                        <span>{inf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => navigate(activeService.actionRoute)}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md shadow-primary-600/30 flex items-center gap-2 cursor-pointer"
              >
                <span>{activeService.actionText}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate(`/inquiry?service=${activeService.slug}`)}
                className="px-5 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
              >
                فرم آنلاین استعلام قیمت
              </button>
            </div>
          </div>

          {/* Sub-Services & Meaningful Internal Linking */}
          {activeService.subServices && activeService.subServices.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary-600" />
                <span>زیرخدمات تخصصی مرتبط:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeService.subServices.map((sub) => (
                  <div 
                    key={sub.slug}
                    onClick={() => navigate(`/services/${sub.slug}`)}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 bg-gray-50/50 dark:bg-gray-750 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-black text-sm text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {sub.title}
                      </h3>
                      <ArrowLeft className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:-translate-x-1 transition-all" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {sub.desc}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Related Packaging Products & Engineering Tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Products Card */}
            {activeService.relatedProducts && activeService.relatedProducts.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-md">
                <h2 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary-600" />
                  <span>محصولات مرتبط در کاتالوگ:</span>
                </h2>
                <div className="space-y-3">
                  {activeService.relatedProducts.map((p) => (
                    <div 
                      key={p.slug}
                      onClick={() => navigate(`/products/${p.slug}`)}
                      className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 block mb-0.5">{p.category}</span>
                        <h3 className="font-bold text-xs text-gray-900 dark:text-white">{p.title}</h3>
                      </div>
                      <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Tools Card */}
            {activeService.relatedTools && activeService.relatedTools.length > 0 && (
              <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-md">
                <h2 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-600" />
                  <span>ابزارهای مهندسی متصل:</span>
                </h2>
                <div className="space-y-3">
                  {activeService.relatedTools.map((t, idx) => (
                    <div 
                      key={idx}
                      onClick={() => navigate(t.route)}
                      className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-xs text-gray-900 dark:text-white mb-0.5">{t.title}</h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{t.desc}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Genuine FAQ Section with Accordion */}
          {activeService.faq && activeService.faq.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>پرسش‌های متداول فنی درباره {activeService.title}:</span>
              </h2>
              <div className="space-y-3">
                {activeService.faq.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full text-right p-4 flex items-center justify-between bg-gray-50/70 dark:bg-gray-750 cursor-pointer font-bold text-xs sm:text-sm text-gray-900 dark:text-white hover:text-primary-600 transition-colors"
                      >
                        <span>{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-primary-600' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="p-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700"
                          >
                            {item.answer}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </article>
      ) : (
        /* Overview Hub Page (/services) with single H1 */
        <div>
          {/* Main Hub Header with Single H1 */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-full text-xs font-black border border-primary-100 dark:border-primary-900/50 mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>پرتال مهندسی و خطوط تولید چاپ و بسته‌بندی</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white mb-4">
              خدمات صنعتی و مهندسی چاپ و بسته‌بندی اشک قلم
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              ارائه زنجیره کامل فرآیندهای تولید از مشاوره سازه کارتن و مدل‌سازی سه‌بعدی تا چاپ افست ۵ رنگ، لمینت، ساخت تیغ لیزری و پوشش‌های UV.
            </p>
          </div>

          {/* Section 1: Four Main Services */}
          <div className="mb-14">
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 border-b border-gray-150 dark:border-gray-700 pb-2">
              چهار شاخه اصلی خدمات تولید و مهندسی:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SERVICES_DATA.filter(s => s.isMainCategory).map((srv) => (
                <div 
                  key={srv.id}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-1 rounded-lg border border-primary-200/50 dark:border-primary-800/40">
                        {srv.category}
                      </span>
                      <button 
                        onClick={() => navigate(`/services/${srv.slug}`)}
                        className="text-xs font-bold text-gray-400 group-hover:text-primary-500 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <span>صفحه اختصاصی خدمت</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                      {srv.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                      {srv.intro}
                    </p>

                    <div className="space-y-2 mb-6">
                      {srv.applications.slice(0, 3).map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => navigate(srv.actionRoute)}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>{srv.actionText}</span>
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => navigate(`/services/${srv.slug}`)}
                      className="px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors cursor-pointer"
                    >
                      بررسی فنی کامل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Specialized Sub-Services */}
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 border-b border-gray-150 dark:border-gray-700 pb-2">
              زیرخدمات و فرآیندهای تکمیلی کارگاهی:
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SERVICES_DATA.filter(s => !s.isMainCategory).map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/services/${sub.slug}`)}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-500 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-black text-gray-400 block mb-1">
                      زیرمجموعه: {sub.parentTitle}
                    </span>
                    <h3 className="font-black text-sm text-gray-900 dark:text-white mb-2">
                      {sub.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed mb-4">
                      {sub.intro}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-primary-600 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span>مشاهده جزئیات</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Smart Guide Button '؟' */}
      <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-40">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-500/30 rounded-full animate-ping pointer-events-none"></div>
          <button 
            onClick={() => setShowHelp(true)}
            className="relative w-12 h-12 bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-xl rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer"
            title="راهنمای هوشمند خدمات"
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
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای خدمات صنعتی اشک قلم</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                در این پرتال، ۴ خدمت اصلی شامل چاپ صنعتی، مهندسی بسته‌بندی، جعبه‌سازی و کارتن‌سازی به همراه فرآیندهای تکمیلی ارائه شده‌اند. هر صفحه دارای اطلاعات فنی، پرسش‌های متداول و دکمه مستقیم استعلام آنلاین قیمت است.
              </p>
              <div className="bg-amber-50/50 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100/30 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1.5 mb-4">
                <span className="font-black text-amber-600 dark:text-amber-400 block text-[11px]">نکات کلیدی:</span>
                <div>• برای محاسبه هزینه هر خدمت روی دکمه استعلام آنلاین قیمت کلیک فرمایید.</div>
                <div>• جهت طراحی مدل و فایل تیغ به جعبه‌ساز ۳D یا استودیو CAD مراجعه نمایید.</div>
              </div>
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
