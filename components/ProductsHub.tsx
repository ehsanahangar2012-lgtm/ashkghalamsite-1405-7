import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Box, Package, Sparkles, CheckCircle2, ArrowLeft, 
  HelpCircle, ShieldCheck, Image as ImageIcon, X, 
  ChevronDown, FileText, Layers, Wrench, ExternalLink, BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotFound } from './NotFound';
import { SeoHead } from './SeoHead';
import { AppView } from '../types';

export interface ProductDetail {
  id: string;
  slug: string;
  title: string;
  h1: string;
  category: string;
  metaDescription: string;
  intro: string;
  description: string;
  structureAndMaterials: string[];
  specifications: string[];
  customizationOptions: string[];
  applications: string[];
  orderGuide: {
    steps: string[];
    requiredInfo: string[];
  };
  faq: {
    question: string;
    answer: string;
  }[];
  relatedServices: {
    slug: string;
    title: string;
  }[];
  relatedProducts: {
    slug: string;
    title: string;
    category: string;
  }[];
  relatedCatalogCategory?: string;
  actionText: string;
  actionRoute: string;
}

export const PRODUCTS_CATEGORIES: ProductDetail[] = [
  // 1. کارتن‌های لمینتی صنایع غذایی و کشاورزی
  {
    id: 'laminated-boxes',
    slug: 'laminated-boxes',
    title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی',
    h1: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی',
    category: 'کارتن‌های صادراتی سنگین',
    metaDescription: 'تولید کارتن‌های لمینتی صادراتی ۳ لایه و ۵ لایه با چاپ باکیفیت افست، فلوت‌های مستحکم B ،C و E و مقاومت فشاری بالا در اشک قلم.',
    intro: 'کارتن‌های لمینتی تلفیقی از مقاومت مکانیکی ورق‌های کنگره‌ای و وضوح گرافیکی چاپ افست ۵ رنگ هستند که برای بسته‌بندی‌های صادراتی و محافظت کالا در حمل‌ونقل جاده‌ای و دریایی طراحی می‌شوند.',
    description: 'در این رده از محصولات، پوستر مقوایی گلاسه یا ایندربرد با رزولوشن بالا چاپ و با چسب‌های بهداشتی نشاسته‌ای بر روی زیره کارتن ۳ لایه یا ۵ لایه لمینت می‌شود. این فرآیند امکان ارائه بسته‌بندی با دوام فیزیکی و جذابیت بصری در قفسه‌های فروشگاهی را فراهم می‌آورد.',
    structureAndMaterials: [
      'پوستر رویه: کاغذ گلاسه ۱۸۰ تا ۲۵۰ گرم یا مقوای ایندربرد با چاپ افست',
      'فلوتینگ زیره: ورق ۳ لایه (فلوت‌های B ،C یا E) و ۵ لایه (ترکیب فلوت‌های BC و EB)',
      'کاغذ کنگره و لاینر: کرافت سنگین، تست‌لاینر و فلوتینگ با استحکام فشاری استاندارد',
      'پوشش‌های سطحی محافظ: ورنی آنلاین، سلفون حرارتی مات، براق و ضد رطوبت'
    ],
    specifications: [
      'امکان تولید کارتن با استاندارد کدهای FEFCO (از جمله ۰۲۰۱، ۰۴۲۷ و تلسکوپی)',
      'تحمل بار فشاری چیدمان پالت بر اساس ضخامت ورق و ابعاد جعبه',
      'برش دقیق قالب دایکات با خطوط تای منظم بدون ترکیدگی لبه‌ها',
      'اتصال لبه‌ها با چسب گرم، چسب سرد بهداشتی یا منگنه فولادی'
    ],
    customizationOptions: [
      'طراحی دایلاین اختصاصی متناسب با ابعاد هندسی محصول',
      'تعبیه دستگیره حمل پلاستیکی یا سوراخ‌های تهویه هوا برای محصولات کشاورزی',
      'امکان چاپ نام تجاری درون درب‌های کارتن',
      'پوشش سلفون براق یا مات جهت افزایش مقاومت در برابر رطوبت سردخانه‌ای'
    ],
    applications: [
      'صادرات میوه، خرما، مرکبات، سبزیجات و صیفی‌جات تازه',
      'بسته‌بندی قطعات یدکی خودرو، ماشین‌آلات و ابزارآلات صنعتی',
      'بسته‌بندی لوازم خانگی، لوازم صوتی تصویری و تجهیزات الکترونیکی',
      'کارتن‌های مادر توزیع مواد شوینده و قوطی‌های کنسرو'
    ],
    orderGuide: {
      steps: [
        'اعلام ابعاد داخلی مورد نیاز (طول × عرض × ارتفاع به میلی‌متر)',
        'تعیین وزن تقریبی محصول و تعداد ردیف چیدمان کارتن‌ها روی هم',
        'طراحی سازه و ماکت سه‌بعدی دایلاین در سامانه آنلاین',
        'چاپ پوستر افست، لمینت، دایکات و تحویل پالت‌شده'
      ],
      requiredInfo: [
        'ابعاد درونی کارتن',
        'وزن ناخالص کالا درون هر بسته',
        'نیاز به شرایط خاص انبارش (مانند رطوبت سردخانه یا کانتینر یخچالی)',
        'تیراژ سفارش'
      ]
    },
    faq: [
      {
        question: 'چرا برای محصولات کشاورزی صادراتی کارتن لمینتی ترجیح داده می‌شود؟',
        answer: 'زیرا کارتن لمینتی علاوه بر حفظ استحکام ورق ۵ لایه در محیط‌های سردخانه‌ای و مرطوب، امکان چاپ تصاویر باکیفیت و رنگ‌های درخشان را دارد که در بازارهای بین‌المللی موجب جلب نظر مشتریان می‌شود.'
      },
      {
        question: 'آیا کارتن‌های لمینتی به صورت چسبیده یا باز تحویل می‌شوند؟',
        answer: 'به طور معمول کارتن‌ها به صورت تا شده و چسب‌خورده (تخت) بسته‌بندی و تحویل می‌شوند تا فضای کمی در حمل‌ونقل و انبار خریدار اشغال کنند و هنگام مصرف به آسانی باز و سرهم شوند.'
      }
    ],
    relatedServices: [
      { slug: 'carton-making', title: 'خدمات کارتن‌سازی و ورق کنگره‌ای' },
      { slug: 'laminated-carton', title: 'تولید کارتن‌های لمینتی و کنگره‌ای' },
      { slug: 'printing', title: 'خدمات چاپ صنعتی و افست' }
    ],
    relatedProducts: [
      { slug: 'ecommerce-mailer', title: 'کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها', category: 'بسته‌بندی تجارت الکترونیک' },
      { slug: 'rigid-hardbox', title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی', category: 'بسته‌بندی هاردباکس لوکس' }
    ],
    relatedCatalogCategory: 'کارتن‌سازی و لمینت',
    actionText: 'استعلام قیمت کارتن لمینتی',
    actionRoute: '/inquiry?product=laminated-boxes'
  },

  // 2. جعبه‌های دارویی، آرایشی و بهداشتی
  {
    id: 'pharma-cosmetics',
    slug: 'pharma-cosmetics',
    title: 'جعبه‌های دارویی، آرایشی و بهداشتی',
    h1: 'جعبه‌های مقوایی دارویی، آرایشی و بهداشتی',
    category: 'جعبه‌های مقوایی بهداشتی',
    metaDescription: 'تولید انواع جعبه‌های مقوایی بهداشتی، ایندربرد و پشت سفید مناسب برای داروها، لوازم آرایشی و محصولات مراقبت فردی با چاپ دقیق در اشک قلم.',
    intro: 'بسته‌بندی‌های دارویی و آرایشی نیازمند بالاترین دقت ابعادی برای مونتاژ در خطوط پرکن اتوماتیک، رعایت الزامات سلامت متریال و ظرافت بصری در طراحی هستند.',
    description: 'جعبه‌های بهداشتی اشک قلم از مقواهای ایندربرد بهداشتی استاندارد با دانسیته بالا تولید می‌شوند. این جعبه‌ها با امکان اجرای خطوط تا تمیز، تعبیه خط بریل، پنجره طلق‌دار و انواع پوشش‌های یووی و طلاکوب، ایمنی محصول و اعتبار برند را تضمین می‌کنند.',
    structureAndMaterials: [
      'مقوای مصرفی: ایندربرد بهداشتی (FBB) با گرماژ ۲۵۰، ۳۰۰ و ۳۵۰ گرم',
      'مقوای پشت کرافت و مقوای پشت طوسی با مغزی باکیفیت',
      'امکان استفاده از مرکب‌های استاندارد چاپ در صورت درخواست مشتری',
      'پوشش‌های تکمیلی: سلفون حرارتی مات/براق، یووی موضعی سیلندری و طلاکوب گرم'
    ],
    specifications: [
      'امکان درج خط بریل برجسته طبق استانداردهای بسته‌بندی داروخانه‌ای',
      'قفل‌های زبانه معکوس (Tuck-in)، قفل خودکار کف (Auto-lock / Crash lock bottom)',
      'سازگاری ابعادی و زاویه خطوط تا با دستگاه‌های اتوماتیک کارتونینگ (Cartoning Machines)',
      'امکان تعبیه پنجره طلقی (Window Patching) جهت رویت محتویات داخلی'
    ],
    customizationOptions: [
      'برجسته‌سازی لوگو و نشان تجاری (Embossing / Debossing)',
      'اجرای یووی شنی، اکلیلی یا موضعی بر روی نقاط حساس گرافیکی',
      'طراحی اینسرت و مقسم داخلی مقوایی برای نگهداری شیشه شربت، آمپول یا سرم پوستی',
      'چاپ درون جعبه جهت درج راهنمای مصرف یا اطلاعات تکمیلی محصول'
    ],
    applications: [
      'جعبه قرص، کپسول، شربت، پماد و مکمل‌های غذایی دارویی',
      'بسته‌بندی کرم‌های پوستی، لوسیون، سرم، رنگ مو و عطر',
      'بسته‌بندی پدهای بهداشتی، گاز استریل، صابون و محصولات شوینده',
      'جعبه‌های قطره چشمی و ملزومات پزشکی مصرفی'
    ],
    orderGuide: {
      steps: [
        'ارسال ابعاد شیشه، پوکه یا تیوب محصول به همراه نقشه گسترده',
        'بررسی نحوه پر کردن جعبه (دستی یا دستگاه اتوماتیک کارتونر)',
        'نمونه‌گیری اولیه و تست ماکت سفید پیش از چاپ نهایی',
        'چاپ افست، تیغ‌زنی، جعبه‌چسبانی اتوماتیک و بسته‌بندی شیرینگ'
      ],
      requiredInfo: [
        'ابعاد سه‌وجهی جعبه (طول، عرض، ارتفاع)',
        'گرماژ مقوای ایندربرد مد نظر',
        'نیاز به خط بریل یا پنجره طلقی',
        'تیراژ و برنامه زمانی سفارش'
      ]
    },
    faq: [
      {
        question: 'چرا برای محصولات دارویی مقوای ایندربرد توصیه می‌شود؟',
        answer: 'مقوای ایندربرد (Ivory Board / FBB) دارای مغزی سلولزی سفید و لایه‌های چندگانه است که علاوه بر سفتی و استحکام عالی، سطحی بسیار صاف و بهداشتی دارد و بر خلاف مقواهای بازیافتی، بوی نامطبوع ایجاد نمی‌کند.'
      },
      {
        question: 'آیا قالب جعبه برای خطوط بسته‌بندی اتوماتیک سازگار است؟',
        answer: 'بله، زوایای خط تا، اندازه زبانه‌های قفل‌کننده و ضخامت تیغ‌ها در صورت اعلام نیاز مشتری دقیقاً متناسب با مشخصات فید دستگاه‌های اتوماتیک بسته‌بندی تنظیم می‌گردد.'
      }
    ],
    relatedServices: [
      { slug: 'box-making', title: 'خدمات جعبه‌سازی و هاردباکس' },
      { slug: 'printing', title: 'خدمات چاپ صنعتی و چاپ افست' },
      { slug: 'surface-finishing', title: 'پوشش‌های محافظتی و تکمیلی چاپ' }
    ],
    relatedProducts: [
      { slug: 'rigid-hardbox', title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی', category: 'بسته‌بندی هاردباکس لوکس' },
      { slug: 'laminated-boxes', title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی', category: 'کارتن‌های صادراتی سنگین' }
    ],
    relatedCatalogCategory: 'جعبه هاردباکس',
    actionText: 'استعلام جعبه دارویی و بهداشتی',
    actionRoute: '/inquiry?product=pharma-cosmetics'
  },

  // 3. جعبه‌های سخت (هاردباکس) لوکس و کادویی
  {
    id: 'rigid-hardbox',
    slug: 'rigid-hardbox',
    title: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی',
    h1: 'جعبه‌های سخت (هاردباکس) لوکس و کادویی',
    category: 'بسته‌بندی هاردباکس لوکس',
    metaDescription: 'طراحی و ساخت انواع هاردباکس و جعبه‌های صلب مگنتی، کشویی، تلسکوپی و چندضلعی با مغزی مقوای فشرده و روکش‌های فانتزی در اشک قلم.',
    intro: 'هاردباکس بالاترین سطح بسته‌بندی لوکس و یادگاری است؛ جعبه‌ای مستحکم و باوقار که ارزش ادراک‌شده محصول درون خود را به شکلی چشمگیر ارتقا می‌دهد.',
    description: 'جعبه‌های سخت (Rigid Boxes) از مقوای ضخیم و صلب فشرده (کرجی یا ام‌دی‌اف سبک) با ضخامت ۱.۵ تا ۳ میلی‌متر ساخته می‌شوند. این مغزی پس از برش و شیارزنی دقیق، با انواع کاغذهای فانتزی بافت‌دار، روکش‌های گلاسه طلاکوب، چرم مصنوعی یا متالایز پوشانده شده و با فوم‌های محافظ داخلی تکمیل می‌گردد.',
    structureAndMaterials: [
      'مغزی اصلی: مقوای فشرده سخت (Greyboard) با ضخامت ۱.۵ تا ۳ میلی‌متر',
      'روکش رویه: کاغذهای بافت‌دار فانتزی، گلاسه سلفون‌دار، کاغذ کرافت یا پارچه جیر',
      'اتصالات سازه: هاردباکس مگنتی (آهنربایی)، کشویی (کبریتی)، دو تکه (درب و کف) و کتابی',
      'مقسم داخلی: فوم فشرده EVA برش‌خورده با لیزر، ابر با روکش ساتن یا اینسرت مقوایی'
    ],
    specifications: [
      'شیارزنی با زاویه ۹۰ یا ۱۲۰ درجه (V-Groove) برای لبه‌های کاملاً تیز و بدون لقی',
      'تعبیه مگنت‌های نئودیمیوم قوی مخفی درون لایه‌های جعبه',
      'پوشش‌های طلایی و نقره‌ای با طلاکوب گرم و کلیشه‌های فلزی دقیق',
      'ایستایی و دوام فیزیکی بسیار طولانی به عنوان جعبه نگهداری دائمی'
    ],
    customizationOptions: [
      'امکان ساخت جعبه با ابعاد و فرم‌های اختصاصی چندضلعی یا دوطبقه',
      'تعبیه ربان ابریشمی بازکننده و مگنت‌های مخفی',
      'امکان چاپ طرح‌های متالایز، یووی برجسته و طلاکوب هفت‌رنگ روی روکش',
      'برش دقیق قالب فوم داخلی با لیزر مطابق هندسه دقیق محصول'
    ],
    applications: [
      'بسته‌بندی زعفران، هل، خشکبار صادراتی و هدایای دیپلماتیک',
      'بسته‌بندی ادکلن، عطر، زیورآلات، طلا و ساعت‌های مچی',
      'جعبه‌های نفیس کتاب، قرآن، سررسید و ست‌های اداری مدیریتی',
      'بسته‌بندی تلفن همراه، ساعت‌های هوشمند و کالاهای دیجیتال لوکس'
    ],
    orderGuide: {
      steps: [
        'ارسال مشخصات کالا و تعیین نوع ساختار (مگنتی، کشویی یا درب و کف)',
        'طراحی دقیق نقشه شیارزنی مغزی و قالب روکش',
        'ساخت نمونه اولیه هاردباکس جهت تأیید ابعاد و ایستایی',
        'تولید انبوه، روکش‌کشی، مونتاژ دستی/نیمه‌اتوماتیک و بازرسی کیفی'
      ],
      requiredInfo: [
        'ابعاد داخلی مفید مورد نیاز (طول × عرض × ارتفاع)',
        'نوع مدل مد نظر (مگنتی، کشویی، درب و کف جداگانه)',
        'نیاز به فوم برش‌خورده داخل جعبه',
        'تیراژ درخواستی'
      ]
    },
    faq: [
      {
        question: 'حداقل تیراژ اقتصادی برای تولید هاردباکس چه تعداد است؟',
        answer: 'به دلیل ساخت کلیشه طلاکوب، قالب‌های شیارزنی و مراحل ساخت اختصاصی، تیراژهای بالای ۵۰۰ الی ۱۰۰۰ عدد اقتصادی‌ترین هزینه تمام‌شده را به همراه دارند؛ هرچند امکان تولید تیراژهای محدودتر نیز با بررسی کارگاهی وجود دارد.'
      },
      {
        question: 'تفاوت هاردباکس مگنتی با درب و کف معمولی چیست؟',
        answer: 'هاردباکس مگنتی ساختاری یکپارچه با درب کتابی دارد که با آهنرباهای پنهان در لبه بسته می‌شود و حس مدرن‌تری دارد؛ در حالی که هاردباکس دو تکه دارای کف و درب مجزا است و برای ست‌های هدیه و شیرینی‌جات کلاسیک استفاده می‌شود.'
      }
    ],
    relatedServices: [
      { slug: 'box-making', title: 'خدمات جعبه‌سازی و هاردباکس' },
      { slug: 'surface-finishing', title: 'پوشش‌های تکمیلی و طلاکوب' },
      { slug: 'diecut-tooling', title: 'قالب‌سازی لیزری دایکات' }
    ],
    relatedProducts: [
      { slug: 'pharma-cosmetics', title: 'جعبه‌های دارویی، آرایشی و بهداشتی', category: 'جعبه‌های مقوایی بهداشتی' },
      { slug: 'laminated-boxes', title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی', category: 'کارتن‌های صادراتی سنگین' }
    ],
    relatedCatalogCategory: 'جعبه هاردباکس',
    actionText: 'استعلام تولید هاردباکس',
    actionRoute: '/inquiry?product=rigid-hardbox'
  },

  // 4. کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها
  {
    id: 'ecommerce-mailer',
    slug: 'ecommerce-mailer',
    title: 'کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها',
    h1: 'کارتن‌های پستی و کیبوردی آنلاین‌شاپ‌ها',
    category: 'بسته‌بندی تجارت الکترونیک',
    metaDescription: 'تولید انواع کارتن‌های کیبوردی، پستی و جعبه‌های ارسالی بازشونده سریع با قابلیت چاپ اختصاصی برند ویژه آنلاین‌شاپ‌ها و فروشگاه‌های اینترنتی در اشک قلم.',
    intro: 'تجربه بسته‌بندی ارسالی (Unboxing) اولین نقطه تماس فیزیکی مشتری با برند آنلاین شماست. کارتن‌های کیبوردی علاوه بر محافظت مطمئن از مرسوله، هویت برند شما را برجسته می‌سازند.',
    description: 'کارتن‌های پستی کیبوردی اشک قلم با استفاده از ساختار استاندارد FEFCO 0427 تولید می‌شوند. این کارتن‌ها با ساختار قفل‌شونده زبانه دوبل در کناره‌ها، بدون نیاز به منگنه و با کمترین نیاز به چسب بسته می‌شوند و سرعت بسته‌بندی سفارش‌ها را در انبارهای تجارت الکترونیک افزایش می‌دهند.',
    structureAndMaterials: [
      'ورق مصرفی: ۳ لایه ای‌فلوت (E-Flute) با ضخامت حدود ۱.۵ میلی‌متر برای ظرافت و وزن کم',
      'ورق ۳ لایه بی‌فلوت (B-Flute) یا سی‌فلوت (C-Flute) برای مرسولات سنگین‌تر',
      'کاغذ رویه و زیره: کرافت طبیعی قهوه‌ای، تست‌لاینر بازیافتی مقاوم یا لاینر سفید',
      'نوع چاپ: چاپ فلکسوگرافی مستقیم یا لمینت افست اختصاصی با پوشش سلفون'
    ],
    specifications: [
      'ساختار استاندارد FEFCO 0427 (کیبوردی بدون نیاز به چسب‌کاری پیچیده)',
      'امکان تولید در ابعاد مطابق با سایزبندی‌های متداول مرسولات پستی',
      'خطوط تای منظم جهت سهولت و سرعت فوق‌العاده در مونتاژ دستی در انبار',
      'لبه‌های جانبی دوبل شده برای افزایش مقاومت فشاری از طرفین'
    ],
    customizationOptions: [
      'امکان چاپ لوگو و متن خوش‌آمدگویی در داخل درب جعبه (چاپ دو رو)',
      'تعبیه نوار چسب دوطرفه آماده جهت پلمپ سریع و نوار زیپ‌دار بازشونده آسان (Easy Open)',
      'امکان تولید با ورق کرافت قهوه‌ای نوستالژیک یا ورق سفید مدرن',
      'ساخت هولدر و مقسم متناسب با کالای ارسالی (عینک، عطر، تیشرت یا لوازم جانبی)'
    ],
    applications: [
      'ارسال سفارش‌های فروشگاه‌های آنلاین پوشاک، شال، روسری و کفش',
      'بسته‌بندی لوازم آرایشی، مراقبت پوستی و محصولات بهداشتی آنلاین',
      'بسته‌بندی اکسسوری، زیورآلات، ساعت و ماگ‌های سرامیکی',
      'بسته‌بندی لوازم جانبی دیجیتال، هدفون و قطعات الکترونیکی'
    ],
    orderGuide: {
      steps: [
        'تعیین سایز مناسب کالا با احتساب محافظ حباب‌دار احتمالی',
        'انتخاب جنس ورق (سفید یا کرافت) و نوع فلوتینگ (E یا B)',
        'طراحی گرافیک رویه و داخل جعبه و تایید نمونه دایلاین',
        'دایکات قالب، بسته‌بندی تسمه‌کشی شده و ارسال به انبار مشتری'
      ],
      requiredInfo: [
        'ابعاد داخلی مورد نیاز (طول، عرض، ارتفاع به سانتی‌متر)',
        'رنگ کاغذ رویه (کرافت قهوه‌ای یا سفید)',
        'تعداد رنگ چاپ (تک‌رنگ، دو رنگ یا لمینت تمام‌رنگی)',
        'تیراژ سفارش'
      ]
    },
    faq: [
      {
        question: 'چرا کارتن کیبوردی برای فروشگاه‌های اینترنتی مناسب‌تر از کارتن‌های معمولی است؟',
        answer: 'کارتن کیبوردی با قفل‌های زبانه جانبی بدون نیاز به چسب باز و بسته می‌شود، تجربه آنباکسینگ لوکس و خوشایندی برای خریدار رقم می‌زند و مونتاژ آن در بخش انبار و ارسال بسیار سریع‌تر از کارتن‌های چهار درب است.'
      },
      {
        question: 'آیا برای آنلاین‌شاپ‌های تازه‌کار امکان چاپ لوگوی اختصاصی وجود دارد؟',
        answer: 'بله، با ساخت یک کلیشه ژلاتینی ساده، امکان چاپ لوگو و اطلاعات تماس پیج یا وب‌سایت شما با چاپ تک‌رنگ یا دورنگ فلکسو با حداقل هزینه وجود دارد.'
      }
    ],
    relatedServices: [
      { slug: 'carton-making', title: 'خدمات کارتن‌سازی و ورق کنگره‌ای' },
      { slug: 'packaging', title: 'خدمات طراحی و مهندسی بسته‌بندی' },
      { slug: 'printing', title: 'خدمات چاپ صنعتی و چاپ افست' }
    ],
    relatedProducts: [
      { slug: 'laminated-boxes', title: 'کارتن‌های لمینتی صنایع غذایی و کشاورزی', category: 'کارتن‌های صادراتی سنگین' },
      { slug: 'pharma-cosmetics', title: 'جعبه‌های دارویی، آرایشی و بهداشتی', category: 'جعبه‌های مقوایی بهداشتی' }
    ],
    relatedCatalogCategory: 'کارتن‌سازی و لمینت',
    actionText: 'استعلام کارتن کیبوردی پستی',
    actionRoute: '/inquiry?product=ecommerce-mailer'
  }
];

export const ProductsHub: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [showHelp, setShowHelp] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const activeProduct = slug ? PRODUCTS_CATEGORIES.find(p => p.slug === slug) : null;

  // If an unknown slug is entered, render 404 instead of falling back to the whole list
  if (slug && !activeProduct) {
    return <NotFound />;
  }

  // Generate verified Schema.org Product + FAQPage
  const productSchema = activeProduct ? {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `https://ashkghalam.ir/products/${activeProduct.slug}#product`,
        "name": activeProduct.title,
        "description": activeProduct.metaDescription,
        "category": activeProduct.category,
        "brand": {
          "@type": "Brand",
          "name": "صنایع چاپ و بسته‌بندی اشک قلم"
        }
      },
      ...(activeProduct.faq && activeProduct.faq.length > 0 ? [{
        "@type": "FAQPage",
        "@id": `https://ashkghalam.ir/products/${activeProduct.slug}#faq`,
        "mainEntity": activeProduct.faq.map(f => ({
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
      {activeProduct ? (
        <SeoHead 
          view={AppView.PRODUCTS}
          canonicalPath={`/products/${activeProduct.slug}`}
          customTitle={`${activeProduct.title} | محصولات بسته‌بندی اشک قلم`}
          customDescription={activeProduct.metaDescription}
          structuredData={productSchema}
          noIndex={false}
        />
      ) : (
        <SeoHead 
          view={AppView.PRODUCTS}
          canonicalPath="/products"
          customTitle="محصولات و رده‌های بسته‌بندی صنعتی | اشک قلم"
          customDescription="انواع کارتن‌های لمینتی صادراتی، جعبه‌های دارویی بهداشتی، هاردباکس‌های لوکس و بسته‌بندی‌های پستی و آنلاین‌شاپ‌ها."
          noIndex={false}
        />
      )}

      {/* Semantic Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6">
        <span className="hover:text-primary-600 cursor-pointer" onClick={() => navigate('/')}>خانه</span>
        <span>/</span>
        <span 
          className={slug ? "hover:text-primary-600 cursor-pointer" : "text-gray-900 dark:text-white font-bold"} 
          onClick={() => navigate('/products')}
        >
          محصولات و رده‌های بسته‌بندی
        </span>
        {activeProduct && (
          <>
            <span>/</span>
            <span className="text-gray-900 dark:text-white font-bold">{activeProduct.title}</span>
          </>
        )}
      </nav>

      {/* Detail or List */}
      {activeProduct ? (
        <article className="space-y-10">
          {/* Main Product Header Card with Dedicated Single H1 */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-150 dark:border-gray-700 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-6 mb-6">
              <div>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400 block mb-2">
                  {activeProduct.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-950 dark:text-white leading-tight">
                  {activeProduct.h1}
                </h1>
              </div>
              <button 
                onClick={() => navigate('/products')}
                className="self-start sm:self-auto text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4 rotate-180" />
                <span>بازگشت به همه محصولات</span>
              </button>
            </div>

            {/* Intro Paragraph */}
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-200 font-medium leading-relaxed mb-6 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-200/50 dark:border-amber-900/30">
              {activeProduct.intro}
            </p>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
              {activeProduct.description}
            </p>

            {/* Structure and Material Options */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <span>ساختار و گزینه‌های متریال:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.structureAndMaterials.map((mat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{mat}</span>
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
                {activeProduct.specifications.map((spec, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{spec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Customization Options */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <span>قابلیت‌های سفارشی‌سازی اختصاصی:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.customizationOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{opt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Industrial Applications */}
            <div className="mb-8">
              <h2 className="font-black text-base text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-500" />
                <span>کاربردها و صنایع مرتبط:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeProduct.applications.map((app, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-750 border border-gray-100 dark:border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5"></div>
                    <span className="text-xs text-gray-700 dark:text-gray-200 font-medium leading-relaxed">{app}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Guide & Required Info Checklist */}
            <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-gray-750 dark:to-gray-800 border border-amber-200/60 dark:border-gray-700 mb-8">
              <h2 className="font-black text-base text-amber-950 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>راهنمای سفارش و اطلاعات مورد نیاز استعلام:</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-300 mb-2">مراحل انجام سفارش:</h3>
                  <ol className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    {activeProduct.orderGuide.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">{i + 1}</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="text-xs font-black text-amber-900 dark:text-amber-300 mb-2">اطلاعات لازم برای استعلام دقیق:</h3>
                  <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                    {activeProduct.orderGuide.requiredInfo.map((inf, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-black">•</span>
                        <span>{inf}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons & Internal Links */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => navigate(activeProduct.actionRoute)}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <span>{activeProduct.actionText}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/catalog')}
                className="px-5 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-amber-500" />
                <span>مشاهده در ژورنال و کاتالوگ ۳D</span>
              </button>
            </div>
          </div>

          {/* Related Services & Products Internal Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Services Link */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary-600" />
                <span>خدمات صنعتی مرتبط:</span>
              </h2>
              <div className="space-y-3">
                {activeProduct.relatedServices.map((srv) => (
                  <div 
                    key={srv.slug}
                    onClick={() => navigate(`/services/${srv.slug}`)}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <h3 className="font-bold text-xs text-gray-900 dark:text-white">{srv.title}</h3>
                    <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                ))}
              </div>
            </section>

            {/* Other Products Link */}
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                <span>سایر رده‌های محصولات:</span>
              </h2>
              <div className="space-y-3">
                {activeProduct.relatedProducts.map((p) => (
                  <div 
                    key={p.slug}
                    onClick={() => navigate(`/products/${p.slug}`)}
                    className="p-3.5 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 block mb-0.5">{p.category}</span>
                      <h3 className="font-bold text-xs text-gray-900 dark:text-white">{p.title}</h3>
                    </div>
                    <ArrowLeft className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Genuine FAQ Section */}
          {activeProduct.faq && activeProduct.faq.length > 0 && (
            <section className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-150 dark:border-gray-700 shadow-md">
              <h2 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-500" />
                <span>پرسش‌های متداول فنی درباره {activeProduct.title}:</span>
              </h2>
              <div className="space-y-3">
                {activeProduct.faq.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div 
                      key={idx} 
                      className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full text-right p-4 flex items-center justify-between bg-gray-50/70 dark:bg-gray-750 cursor-pointer font-bold text-xs sm:text-sm text-gray-900 dark:text-white hover:text-amber-600 transition-colors"
                      >
                        <span>{item.question}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180 text-amber-600' : ''}`} />
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
        /* Overview Hub Page (/products) with single H1 */
        <div>
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-full text-xs font-black border border-amber-200/60 dark:border-amber-900/50 mb-3">
              <Package className="w-4 h-4" />
              <span>سبد محصولات کارتن، جعبه و هاردباکس اشک قلم</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-950 dark:text-white mb-4">
              محصولات و تولیدات صنعتی اشک قلم
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              انواع ساختارهای استاندارد کارتن لمینتی، جعبه‌های مقوایی دارویی، هاردباکس لوکس و کارتن‌های کیبوردی صادراتی با بالاترین کیفیت مهندسی.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRODUCTS_CATEGORIES.map((prod) => (
              <div 
                key={prod.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-700/80 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200/50 dark:border-amber-800/40">
                      {prod.category}
                    </span>
                    <button 
                      onClick={() => navigate(`/products/${prod.slug}`)}
                      className="text-xs font-bold text-gray-400 group-hover:text-amber-500 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>مشاهده جزییات</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">
                    {prod.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                    {prod.intro}
                  </p>

                  <div className="space-y-2 mb-6">
                    {prod.structureAndMaterials.slice(0, 3).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => navigate(prod.actionRoute)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{prod.actionText}</span>
                    <ArrowLeft className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={() => navigate(`/products/${prod.slug}`)}
                    className="px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-amber-600 transition-colors cursor-pointer"
                  >
                    مشخصات کامل ساختار
                  </button>
                </div>
              </div>
            ))}
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
            title="راهنمای هوشمند محصولات"
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
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">راهنمای سبد محصولات اشک قلم</h3>
                </div>
                <button onClick={() => setShowHelp(false)} className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                در این بخش ۴ رده اصلی محصولات کارتن و جعبه معرفی شده‌اند. برای هر محصول می‌توانید مشخصات فنی، ساختار متریال، پرسش‌های متداول را بررسی کرده و مستقیماً استعلام قیمت فرمایید.
              </p>
              <div className="bg-amber-50/50 dark:bg-slate-850 p-3.5 rounded-2xl border border-amber-100/30 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-400 space-y-1.5 mb-4">
                <span className="font-black text-amber-600 dark:text-amber-400 block text-[11px]">نکات کلیدی:</span>
                <div>• برای محاسبه هزینه هر محصول روی دکمه استعلام اختصاصی کلیک کنید.</div>
                <div>• جهت آزمایش ابعاد در فضای سه‌بعدی به بخش دایلاین ۳D مراجعه فرمایید.</div>
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
