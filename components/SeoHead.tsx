import React, { useEffect } from 'react';
import { AppView } from '../types';
import { useContent } from '../contexts/ContentContext';

export interface SeoHeadProps {
  view?: AppView;
  canonicalPath?: string;
  customTitle?: string;
  customDescription?: string;
  noIndex?: boolean;
}

/**
 * Advanced Search Engine & AI Model Discovery Engine (SEO + GEO + AI-LLM Indexing)
 * Harmonized with real URL routes, dynamic canonical URLs and noindex directives.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({ 
  view = AppView.HOME, 
  canonicalPath, 
  customTitle, 
  customDescription, 
  noIndex = false 
}) => {
  const { getSeoForView } = useContent();
  const config = getSeoForView(view);

  useEffect(() => {
    // 1. Dynamic Document Title
    const baseTitle = customTitle || config.title || 'اشک قلم | چاپ، جعبه‌سازی، کارتن‌سازی و بسته‌بندی';
    document.title = baseTitle;

    // Helper to inject/update meta tags
    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Default Iranian industrial packaging keywords
    const defaultKeywords = [
      'چاپ و بسته‌بندی اشک قلم',
      'مجتمع چاپ بادیکاران توس',
      'طراحی دایلاین 3D',
      'جعبه‌سازی هوشمند',
      'استعلام آنلاین قیمت چاپ',
      'چاپ افست ۵ رنگ',
      'خدمات UV برجسته',
      'تولید کارتن لمینتی',
      'طراحی آنلاین جعبه',
      'ساخت تیغ و قالب‌سازی',
      'دانلود کتابخانه صنعتی چاپ'
    ];

    const finalKeywords = Array.from(new Set([...(config.keywords || []), ...defaultKeywords])).join(', ');
    const defaultDesc = customDescription || config.description || 'اشک قلم؛ معرفی خدمات چاپ و بسته‌بندی، جعبه‌سازی و کارتن‌سازی. محصولات، کاتالوگ‌ها و نمونه‌کارها را مشاهده کنید و برای سفارش و استعلام قیمت اقدام کنید.';

    // 2. Search Engine Core Meta Tags
    setMetaTag('name', 'description', defaultDesc);
    setMetaTag('name', 'keywords', finalKeywords);

    // Dynamic Robots directive: Protected/Draft pages must be noindex
    const shouldNoIndex = noIndex || 
      view === AppView.ADMIN_PANEL || 
      view === AppView.DASHBOARD || 
      view === AppView.NOT_FOUND ||
      view === AppView.SERVICES ||
      view === AppView.PRODUCTS;

    if (shouldNoIndex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
      setMetaTag('name', 'googlebot', 'noindex, nofollow');
      setMetaTag('name', 'bingbot', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
      setMetaTag('name', 'googlebot', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
      setMetaTag('name', 'bingbot', 'index, follow');
    }

    setMetaTag('name', 'author', 'صنایع چاپ و بسته‌بندی اشک قلم');
    setMetaTag('name', 'publisher', 'Ashk Ghalam');
    setMetaTag('name', 'application-name', 'Ashk Ghalam');
    setMetaTag('name', 'theme-color', '#0ea5e9');

    // 3. AI Model & LLM Discovery Directives
    setMetaTag('name', 'ai-site-category', 'Industrial Packaging, CAD Dieline Generator, Commercial Printing');
    setMetaTag('name', 'ai-summary', 'اشک قلم و بادیکاران توس، سامانه رسمی سفارش آنلاین چاپ، طراحی قالب‌های سه‌بعدی بسته‌بندی و محاسبه قیمت تمام‌شده کالا است.');
    setMetaTag('name', 'ai-services', '3D Dieline Box Generator, Offset Printing, UV Coating, Laminating, Packaging CAD, Auto-Quoting');

    // 4. Resolve Canonical URL accurately per route
    const origin = 'https://ashkghalam.ir';
    let currentPath = canonicalPath;
    if (!currentPath && typeof window !== 'undefined') {
      currentPath = window.location.pathname;
    }
    const cleanPath = !currentPath || currentPath === '/' ? '' : (currentPath.startsWith('/') ? currentPath : `/${currentPath}`);
    const resolvedCanonicalUrl = config.canonicalUrl || `${origin}${cleanPath || '/'}`;

    // 5. OpenGraph Tags
    setMetaTag('property', 'og:title', config.ogTitle || baseTitle);
    setMetaTag('property', 'og:description', config.ogDescription || defaultDesc);
    setMetaTag('property', 'og:type', config.schemaType === 'Article' ? 'article' : 'website');
    setMetaTag('property', 'og:url', resolvedCanonicalUrl);
    setMetaTag('property', 'og:site_name', 'صنایع چاپ و بسته‌بندی اشک قلم');
    setMetaTag('property', 'og:locale', 'fa_IR');
    if (config.ogImage) setMetaTag('property', 'og:image', config.ogImage);

    // 6. Twitter Cards
    setMetaTag('name', 'twitter:card', config.twitterCard || 'summary_large_image');
    setMetaTag('name', 'twitter:title', config.ogTitle || baseTitle);
    setMetaTag('name', 'twitter:description', config.ogDescription || defaultDesc);
    if (config.ogImage) setMetaTag('name', 'twitter:image', config.ogImage);

    // 7. Canonical Tag Injection
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', resolvedCanonicalUrl);

    // 8. Structured Data (JSON-LD Schemas) - Single instance management
    let schemaScript = document.querySelector('script[id="json-ld-schema"]');
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.setAttribute('id', 'json-ld-schema');
      schemaScript.setAttribute('type', 'application/ld+json');
      document.head.appendChild(schemaScript);
    }

    const orgSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://ashkghalam.ir/#organization",
          "name": "صنایع چاپ و بسته‌بندی اشک قلم",
          "alternateName": ["Ashk Ghalam Packaging"],
          "url": "https://ashkghalam.ir",
          "description": "مرکز تخصصی چاپ، بسته‌بندی، کارتن‌سازی و جعبه‌سازی",
          "knowsAbout": [
            "چاپ و بسته‌بندی",
            "جعبه‌سازی",
            "کارتن‌سازی",
            "طراحی قالب و دایلاین"
          ]
        },
        {
          "@type": "LocalBusiness",
          "@id": "https://ashkghalam.ir/#localbusiness",
          "name": "صنایع چاپ و بسته‌بندی اشک قلم",
          "url": "https://ashkghalam.ir",
          "priceRange": "$$",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "IR"
          }
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://ashkghalam.ir/#dieline-app",
          "name": "مولد سه‌بعدی قالب جعبه و دایلاین اشک قلم",
          "operatingSystem": "Web, All Platforms",
          "applicationCategory": "DesignApplication"
        }
      ]
    };

    schemaScript.innerHTML = JSON.stringify(config.structuredData || orgSchema);

  }, [config, view, canonicalPath, customTitle, customDescription, noIndex]);

  return null;
};
