import { CatalogProject, CoverTemplateId } from '../types/flipbook';

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
    id: `cat-${Date.now()}`,
    name: 'کاتالوگ جدید محصولات',
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
      title: 'کاتالوگ جامع محصولات',
      subtitle: 'مجموعه طراحی صنعتی، بسته‌بندی و خدمات چاپ تخصصی',
      brandName: 'صنایع چاپ و بسته‌بندی اشک قلم',
      editionLabel: 'نسخه اختصاصی',
      yearLabel: '۱۴۰۵',
      backHeadline: 'سفارش عمده و مشاوره خرید',
      backDescription:
        'تمامی محصولات این کاتالوگ با ضمانت کیفیت، بسته‌بندی اختصاصی و ارسال سریع به سراسر کشور عرضه می‌شوند.',
      backContactInfo: 'تلفن: 09153108763',
      backWebsite: 'https://ashkghalam.ir',
      showPageNumbers: true,
    },
    pages: [],
    updatedAt: new Date().toISOString(),
  };
}
