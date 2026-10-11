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
 * Single-owner metadata per route with strict duplicate prevention and 404 isolation.
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
    // Determine noindex status: 404 or protected views must strictly never be indexed
    const shouldNoIndex = noIndex || 
      view === AppView.ADMIN_PANEL || 
      view === AppView.ENTERPRISE_CMS ||
      view === AppView.SEO_ENGINE ||
      view === AppView.AI_CONTENT_FACTORY ||
      view === AppView.PROGRAMMATIC_SEO ||
      view === AppView.ENTERPRISE_DAM ||
      view === AppView.ENTERPRISE_DXP ||
      view === AppView.DASHBOARD || 
      view === AppView.NOT_FOUND;

    // 1. Resolve Document Title with strict priority
    const baseTitle = customTitle || config.title || 'اشک قلم | چاپ، جعبه‌سازی، کارتن‌سازی و بسته‌بندی';
    document.title = baseTitle;

    // Helper to inject/update meta tags without duplicates
    const setMetaTag = (attr: 'name' | 'property', key: string, content: string) => {
      if (!content) return;
      const elements = Array.from(document.querySelectorAll(`meta[${attr}="${key}"]`));
      if (elements.length > 1) {
        elements.slice(1).forEach(el => el.remove());
      }
      let el = elements[0] as HTMLMetaElement | undefined;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Helper to set/remove canonical link
    const setCanonical = (url?: string) => {
      const canonicals = Array.from(document.querySelectorAll('link[rel="canonical"]'));
      if (!url) {
        // Remove canonical on 404 / noindex to prevent soft-404 or false indexing
        canonicals.forEach(el => el.remove());
        return;
      }
      if (canonicals.length > 1) {
        canonicals.slice(1).forEach(el => el.remove());
      }
      let el = canonicals[0] as HTMLLinkElement | undefined;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', 'canonical');
        document.head.appendChild(el);
      }
      el.setAttribute('href', url);
    };

    // Helper to set/remove JSON-LD structured data
    const setJsonLd = (schemaData?: object | null) => {
      const scripts = Array.from(document.querySelectorAll('script[id="json-ld-schema"]'));
      if (!schemaData) {
        scripts.forEach(s => s.remove());
        return;
      }
      if (scripts.length > 1) {
        scripts.slice(1).forEach(s => s.remove());
      }
      let el = scripts[0] as HTMLScriptElement | undefined;
      if (!el) {
        el = document.createElement('script');
        el.setAttribute('id', 'json-ld-schema');
        el.setAttribute('type', 'application/ld+json');
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(schemaData);
    };

    // Description resolution with custom priority
    const defaultDesc = customDescription || config.description || 'اشک قلم؛ معرفی خدمات چاپ و بسته‌بندی، جعبه‌سازی و کارتن‌سازی. محصولات، کاتالوگ‌ها و نمونه‌کارها را مشاهده کنید و برای سفارش و استعلام قیمت اقدام کنید.';

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

    // 2. Core Search Engine Meta Tags
    setMetaTag('name', 'description', defaultDesc);
    setMetaTag('name', 'keywords', finalKeywords);

    // Robots directives
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

    // 4. Resolve Canonical URL: Explicit route canonical takes absolute priority over global view config
    const origin = 'https://ashkghalam.ir';
    let resolvedCanonicalUrl: string | undefined;

    if (shouldNoIndex) {
      // Error/404 or protected admin routes MUST NOT have canonical link pointing to existing valid content
      resolvedCanonicalUrl = undefined;
    } else if (canonicalPath) {
      const cleanPath = canonicalPath === '/' ? '' : (canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`);
      resolvedCanonicalUrl = `${origin}${cleanPath || '/'}`;
    } else if (config.canonicalUrl) {
      resolvedCanonicalUrl = config.canonicalUrl;
    } else if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const cleanPath = path === '/' ? '' : (path.startsWith('/') ? path : `/${path}`);
      resolvedCanonicalUrl = `${origin}${cleanPath || '/'}`;
    } else {
      resolvedCanonicalUrl = `${origin}/`;
    }

    setCanonical(resolvedCanonicalUrl);

    // 5. OpenGraph Tags: Custom title/description take strict priority
    const finalOgTitle = customTitle || config.ogTitle || baseTitle;
    const finalOgDesc = customDescription || config.ogDescription || defaultDesc;

    setMetaTag('property', 'og:title', finalOgTitle);
    setMetaTag('property', 'og:description', finalOgDesc);
    setMetaTag('property', 'og:type', config.schemaType === 'Article' ? 'article' : 'website');
    if (resolvedCanonicalUrl) {
      setMetaTag('property', 'og:url', resolvedCanonicalUrl);
    }
    setMetaTag('property', 'og:site_name', 'صنایع چاپ و بسته‌بندی اشک قلم');
    setMetaTag('property', 'og:locale', 'fa_IR');
    if (config.ogImage) setMetaTag('property', 'og:image', config.ogImage);

    // 6. Twitter Cards: Custom title/description take strict priority
    setMetaTag('name', 'twitter:card', config.twitterCard || 'summary_large_image');
    setMetaTag('name', 'twitter:title', finalOgTitle);
    setMetaTag('name', 'twitter:description', finalOgDesc);
    if (config.ogImage) setMetaTag('name', 'twitter:image', config.ogImage);

    // 7. Structured Data (JSON-LD Schemas) - Strict valid data, no schemas on 404
    if (shouldNoIndex) {
      setJsonLd(null);
    } else {
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
      setJsonLd(config.structuredData || orgSchema);
    }

  }, [config, view, canonicalPath, customTitle, customDescription, noIndex]);

  return null;
};
