import { globalRegistry } from './TemplateRegistry';
import { DielineTemplate } from '../metadata/types';
import { STANDARD_DIELINE_ENGINES, calculateDielineParameters } from '../../services/dielineMath';

const standardParameters = [
  { id: 'L', name: 'طول (Length)', type: 'number' as const, defaultValue: 120, min: 40, max: 800, description: 'طول بیرونی جعبه به میلی‌متر' },
  { id: 'W', name: 'عرض (Width)', type: 'number' as const, defaultValue: 80, min: 30, max: 600, description: 'عرض بیرونی جعبه به میلی‌متر' },
  { id: 'H', name: 'ارتفاع (Height)', type: 'number' as const, defaultValue: 60, min: 15, max: 500, description: 'ارتفاع بیرونی جعبه به میلی‌متر' },
  { id: 'thickness', name: 'ضخامت ورق (Thickness)', type: 'number' as const, defaultValue: 1.5, min: 0.2, max: 7.0, description: 'ضخامت متریال ورق مقوا یا کارتن به میلی‌متر' }
];

export const defaultTemplates: DielineTemplate[] = [
  {
    id: 'fefco-0201',
    slug: 'fefco-0201-standard-rsc',
    name: 'کارتن ساده آمریکایی FEFCO 0201 (RSC)',
    category: 'FEFCO',
    subcategory: 'Slotted Boxes',
    fefco: '0201',
    engine: 'default-rsc',
    thumbnail: '/thumbnails/fefco-0201.png',
    preview: '/previews/fefco-0201.svg',
    difficulty: 'Easy',
    industry: ['صنایع عمومی', 'لوازم خانگی', 'پست و لجستیک'],
    materials: ['کارتن سه لایه افلوت', 'کارتن پنج لایه', 'کارتن سینگل‌فیس'],
    applications: ['بسته‌بندی اسباب‌کشی', 'حمل و نقل فروشگاهی', 'جعبه کارتن مادر'],
    outputs: ['SVG', 'DXF', 'PDF', 'JSON'],
    parameters: standardParameters,
    seo: {
      title: 'دانلود شابلون دایکات کارتن ساده آمریکایی FEFCO 0201',
      description: 'کارتن دایکاتی ساده RSC استاندارد جهانی با کدهای FEFCO سری ۲۰۰ مناسب برای بسته‌بندی پستی و اسباب‌کشی.',
      keywords: ['FEFCO 0201', 'کارتن آمریکایی', 'شابلون دایکات', 'RSC dieline'],
      faq: [
        { question: 'حداقل ضخامت برای کارتن ساده چیست؟', answer: 'برای کارتن مادر ترجیحا از ۳ میلی‌متر (C-Flute) یا بیشتر استفاده می‌شود.' }
      ]
    }
  },
  {
    id: 'fefco-0427',
    slug: 'fefco-0427-mailer-pro',
    name: 'جعبه کیبوردی ممتاز پستی FEFCO 0427',
    category: 'FEFCO',
    subcategory: 'Folder Boxes',
    fefco: '0427',
    engine: 'fefco-0427',
    thumbnail: '/thumbnails/fefco-0427.png',
    preview: '/previews/fefco-0427.svg',
    difficulty: 'Medium',
    industry: ['فروشگاه‌های اینترنتی', 'آرایشی و بهداشتی', 'پوشاک و اکسسوری'],
    materials: ['کرافت سینگل افلوت', 'ای‌فلوت ممتاز', 'مقوای ایندربرد سنگین'],
    applications: ['بسته‌بندی پستی شیک', 'جعبه هدیه اختصاصی', 'جعبه ارسال کالا'],
    outputs: ['SVG', 'DXF', 'PDF', 'JSON'],
    parameters: standardParameters,
    seo: {
      title: 'شابلون دایکات جعبه کیبوردی پستی FEFCO 0427',
      description: 'قالب آماده جعبه کیبوردی پستی ته‌بسته دو دیواره ممتاز بر اساس استانداردهای بین‌المللی FEFCO.',
      keywords: ['جعبه کیبوردی', 'FEFCO 0427', 'قالب آماده کارتن', 'جعبه پستی'],
      faq: [
        { question: 'چرا دیواره‌ها دوبل طراحی می‌شوند؟', answer: 'برای افزایش مقاومت فشاری و ضربه‌گیری حین حمل مرسوله‌های پستی.' }
      ]
    }
  },
  {
    id: 'ecma-a2020',
    slug: 'ecma-a2020-pharmaceutical-box',
    name: 'جعبه دارویی ته‌قفلی زبانه دار ECMA A20.20',
    category: 'ECMA',
    subcategory: 'Tuck-End Boxes',
    fefco: 'A20.20',
    engine: 'ecma-a2020',
    thumbnail: '/thumbnails/ecma-a2020.png',
    preview: '/previews/ecma-a2020.svg',
    difficulty: 'Medium',
    industry: ['داروسازی و پزشکی', 'آرایشی و بهداشتی', 'صنایع غذایی نفیس'],
    materials: ['مقوای ایندربرد ۲۸۰ تا ۳۵۰ گرم', 'مقوای گلاسه گرم بالا', 'مقوای پشت طوسی'],
    applications: ['جعبه دارو و قرص', 'بسته‌بندی کرم و لوسیون', 'جعبه شربت ارایشی'],
    outputs: ['SVG', 'DXF', 'PDF', 'JSON'],
    parameters: standardParameters,
    seo: {
      title: 'نقشه اتوکد جعبه دارویی ته‌قفلی ECMA A20.20',
      description: 'قالب دایکات استانداردهای دارویی ECMA A20.20 با زبانه قفل شونده ایمن و باله‌های غبارگیر.',
      keywords: ['جعبه دارویی', 'ECMA A2020', 'شابلون جعبه ته‌قفلی', 'جعبه ایندربرد'],
      faq: [
        { question: 'گرین لاین (Green line) مقوا در این سازه چگونه است؟', answer: 'جهت تاخوردگی آسان، بهتر است گرین لاین عمود بر خط تا اصلی ارتفاع جعبه باشد.' }
      ]
    }
  },
  {
    id: 'fefco-0215',
    slug: 'fefco-0215-crash-lock-bottom',
    name: 'جعبه ته‌قفلی لاک‌باتم اتوماتیک FEFCO 0215',
    category: 'FEFCO',
    subcategory: 'Slotted Boxes',
    fefco: '0215',
    engine: 'fefco-0215',
    thumbnail: '/thumbnails/fefco-0215.png',
    preview: '/previews/fefco-0215.svg',
    difficulty: 'Hard',
    industry: ['شوینده و بهداشتی', 'مواد غذایی', 'صنایع الکترونیک'],
    materials: ['مقوای پشت طوسی فشرده', 'ایندربرد بهداشتی', 'کرافت سنگین'],
    applications: ['کارتن پودر شوینده', 'جعبه لوازم خانگی کوچک', 'بسته‌بندی سوغات و چای'],
    outputs: ['SVG', 'DXF', 'PDF', 'JSON'],
    parameters: standardParameters,
    seo: {
      title: 'دیلاین جعبه ته‌قفلی لاک‌باتم اتوماتیک FEFCO 0215',
      description: 'نقشه قالب دایکات جعبه لاک باتم خودکار چسب خورده سرعت بالا با زوایای ۴۵ درجه تاشو.',
      keywords: ['لاک باتم', 'FEFCO 0215', 'جعبه چسبی ته‌قفلی', 'قالب دایکات'],
      faq: [
        { question: 'آیا این کارتن نیاز به منگنه یا چسب نواری در کف دارد؟', answer: 'خیر، مکانیزم ته‌قفلی لاک‌باتم به طور خودکار حین باز شدن جعبه قفل و مستحکم می‌شود.' }
      ]
    }
  },
  {
    id: 'fefco-pizza',
    slug: 'fefco-0426-pizza-box',
    name: 'جعبه پیتزا دایکاتی کلاسیک FEFCO 0426',
    category: 'FEFCO',
    subcategory: 'Folder Boxes',
    fefco: '0426',
    engine: 'fefco-pizza',
    thumbnail: '/thumbnails/fefco-pizza.png',
    preview: '/previews/fefco-pizza.svg',
    difficulty: 'Easy',
    industry: ['صنایع غذایی و فست‌فود', 'رستوران‌ها'],
    materials: ['ای‌فلوت فشرده بهداشتی', 'سینگل کرافت افلوت'],
    applications: ['جعبه پیتزا کلاسیک تک‌نفره و دونفره', 'جعبه غذاهای بیرون‌بر'],
    outputs: ['SVG', 'DXF', 'PDF', 'JSON'],
    parameters: standardParameters,
    seo: {
      title: 'دانلود نقشه قالب جعبه پیتزا FEFCO 0426',
      description: 'دیلاین آماده جعبه پیتزا دایکاتی با سوپاپ‌های تخلیه هوا و تهویه حرارت برای حفظ تردی پیتزا.',
      keywords: ['جعبه پیتزا', 'FEFCO 0426', 'سوپاپ هوا جعبه', 'کارتن پیتزا بیرون‌بر'],
      faq: [
        { question: 'علت تعبیه منافذ هوا چیست؟', answer: 'خروج بخار غذا جهت ممانعت از نرم و خمیر شدن پیتزا حین پیک.' }
      ]
    }
  },
  {
    id: 'ecma-a30',
    slug: 'ecma-a30-hanger-slot-box',
    name: 'جعبه آویزدار فروشگاهی یورو اسلات ECMA A30',
    category: 'ECMA',
    subcategory: 'Tuck-End Boxes',
    fefco: 'A30',
    engine: 'ecma-a30',
    thumbnail: '/thumbnails/ecma-a30.png',
    preview: '/previews/ecma-a30.svg',
    difficulty: 'Medium',
    industry: ['صنایع دیجیتال و لوازم جانبی', 'تجهیزات پزشکی کوچک', 'لوازم دفتری'],
    materials: ['مقوای ایندربرد ۲۸۰ گرم', 'گلاسه سنگین لمینت شده'],
    applications: ['جعبه کابل و کله شارژر', 'بسته‌بندی لوازم دفتری', 'جعبه باتری و ابزار'],
    outputs: ['SVG', 'DXF', 'PDF', 'JSON'],
    parameters: standardParameters,
    seo: {
      title: 'دانلود قالب نقشه اتوکد جعبه آویزدار آویزان یورو اسلات ECMA A30',
      description: 'نقشه دیلاین صنعتی جعبه آویز فروشگاهی رگال با سوراخ پانچ یورو استاندارد.',
      keywords: ['جعبه آویزدار', 'یورو اسلات', 'ECMA A30', 'رگال فروشگاهی'],
      faq: [
        { question: 'ابعاد سوراخ پانچ یورو چقدر است؟', answer: 'طول ۳۰ میلی‌متر با دو دایره انتهایی قطر ۹ میلی‌متر طبق استاندارد رگال‌های فروشگاهی.' }
      ]
    }
  }
];

// Register them at system startup
export function initializeTemplateRegistry() {
  for (const temp of defaultTemplates) {
    const engine = STANDARD_DIELINE_ENGINES[temp.id] || STANDARD_DIELINE_ENGINES[temp.engine];
    if (engine) {
      globalRegistry.registerTemplate(temp, (params) => {
        // Calculate dynamic parameters automatically matching rule constraints
        const dims = calculateDielineParameters(
          params.L || 120,
          params.W || 80,
          params.H || 60,
          params.thickness || 1.5,
          temp.id
        );
        return engine({
          L: params.L || 120,
          W: params.W || 80,
          H: params.H || 60,
          glueTab: dims.glueTab,
          tuck: dims.tuck,
          dustFlap: dims.dustFlap,
          x0: params.x0 || 20,
          variant: params.variant
        });
      });
    }
  }
}
