import React, { useEffect } from 'react';
import { AppView } from '../types';
import { useContent } from '../contexts/ContentContext';

/**
 * Advanced Search Engine & AI Model Discovery Engine (SEO + GEO + AI-LLM Indexing)
 * Optimizes site visibility for Google, Bing, Yahoo, Yandex, and AI Search Crawlers
 * (ChatGPT, Google Gemini, Anthropic Claude, Perplexity, DeepSeek).
 */
export const SeoHead: React.FC<{ view: AppView }> = ({ view }) => {
  const { getSeoForView } = useContent();
  const config = getSeoForView(view);

  useEffect(() => {
    // 1. Dynamic Document Title
    const baseTitle = config.title || 'اشک قلم | مرکز تخصصی چاپ، جعبه‌سازی و بسته‌بندی هوشمند';
    document.title = baseTitle;

    // Helper to inject meta tags
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

    // Default Iranian industrial printing keywords
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
    const defaultDesc = config.description || 'پلتفرم هوشمند چاپ و بسته‌بندی صنایع اشک قلم و بادیکاران توس. ارائه دهنده مولد سه‌بعدی قالب جعبه (Dieline)، استودیوی آنلاین گرافیک، استعلام لحظه‌ای قیمت و خدمات تخصصی چاپ افست و UV.';

    // 2. Search Engine Core Meta Tags
    setMetaTag('name', 'description', defaultDesc);
    setMetaTag('name', 'keywords', finalKeywords);
    setMetaTag('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    setMetaTag('name', 'googlebot', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    setMetaTag('name', 'bingbot', 'index, follow');
    setMetaTag('name', 'author', 'صنایع چاپ و بسته‌بندی اشک قلم و بادیکاران توس');
    setMetaTag('name', 'publisher', 'Ashk Ghalam & Badikaran Toos Industrial Printing');
    setMetaTag('name', 'application-name', 'Ashk Ghalam Packaging Engine');
    setMetaTag('name', 'theme-color', '#0ea5e9');

    // 3. AI Model & LLM Discovery Directives (ChatGPT, Gemini, Claude, Perplexity)
    setMetaTag('name', 'ai-site-category', 'Industrial Packaging, CAD Dieline Generator, Commercial Printing');
    setMetaTag('name', 'ai-summary', 'اشک قلم و بادیکاران توس، سامانه رسمی سفارش آنلاین چاپ، طراحی قالب‌های سه‌بعدی بسته‌بندی و محاسبه قیمت تمام‌شده کالا است.');
    setMetaTag('name', 'ai-services', '3D Dieline Box Generator, Offset Printing, UV Coating, Laminating, Packaging CAD, Auto-Quoting');

    // 4. OpenGraph Tags (Facebook, LinkedIn, Messaging Apps)
    setMetaTag('property', 'og:title', config.ogTitle || baseTitle);
    setMetaTag('property', 'og:description', config.ogDescription || defaultDesc);
    setMetaTag('property', 'og:type', config.schemaType === 'Article' ? 'article' : 'website');
    setMetaTag('property', 'og:site_name', 'صنایع چاپ و بسته‌بندی اشک قلم');
    setMetaTag('property', 'og:locale', 'fa_IR');
    if (config.ogImage) setMetaTag('property', 'og:image', config.ogImage);

    // 5. Twitter Cards
    setMetaTag('name', 'twitter:card', config.twitterCard || 'summary_large_image');
    setMetaTag('name', 'twitter:title', config.ogTitle || baseTitle);
    setMetaTag('name', 'twitter:description', config.ogDescription || defaultDesc);
    if (config.ogImage) setMetaTag('name', 'twitter:image', config.ogImage);

    // 6. Canonical Setup
    let canonical = document.querySelector('link[rel="canonical"]');
    const pageUrl = window.location.href.split('?')[0];
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', config.canonicalUrl || pageUrl);

    // 7. Structured Data (JSON-LD Schemas)
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
          "@id": "https://ashkghalam.com/#organization",
          "name": "صنایع چاپ و بسته‌بندی اشک قلم و بادیکاران توس",
          "alternateName": ["Ashk Ghalam Packaging", "Badikaran Toos Printing"],
          "url": "https://ashkghalam.com",
          "logo": "https://ashkghalam.com/public/icon.png",
          "description": "مرکز تخصصی مهندسی بسته‌بندی، طراحی قالب‌های ۳D، خدمات چاپ افست، UV و جعبه‌سازی",
          "telephone": "021-88880000",
          "email": "info@ashkghalam.com",
          "sameAs": [
            "https://instagram.com/ashkghalam",
            "https://linkedin.com/company/ashkghalam"
          ],
          "knowsAbout": [
            "Packaging CAD Engineering",
            "3D Box Dieline Generator",
            "Offset Printing Technology",
            "UV Coating & Box Manufacturing"
          ]
        },
        {
          "@type": "LocalBusiness",
          "@id": "https://ashkghalam.com/#localbusiness",
          "name": "مجتمع صنعتی چاپ اشک قلم و بادیکاران توس",
          "image": "https://ashkghalam.com/public/icon.png",
          "telephone": "021-88880000",
          "priceRange": "$$",
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "تهران",
            "addressCountry": "IR"
          },
          "openingHoursSpecification": {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
            "opens": "08:00",
            "closes": "18:00"
          }
        },
        {
          "@type": "SoftwareApplication",
          "@id": "https://ashkghalam.com/#dieline-app",
          "name": "مولد سه‌بعدی قالب جعبه و دایلاین اشک قلم",
          "operatingSystem": "Web, All Platforms",
          "applicationCategory": "DesignApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "IRR"
          }
        }
      ]
    };

    schemaScript.innerHTML = JSON.stringify(config.structuredData || orgSchema);

  }, [config, view]);

  return null;
};
