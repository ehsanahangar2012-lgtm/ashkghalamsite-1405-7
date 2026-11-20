import React, { useEffect, useState } from 'react';
import { AppView } from '../types';
import { apiRequestJson } from '../utils/apiClient';

interface SeoHeadProps {
  view?: AppView;
  canonicalPath?: string;
  customTitle?: string;
  customDescription?: string;
  noIndex?: boolean;
}

interface PublicSeoMetaEntry {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  focusKeyword?: string;
}

let cachedMetaMap: Record<string, PublicSeoMetaEntry> | null = null;
let pendingMetaPromise: Promise<Record<string, PublicSeoMetaEntry>> | null = null;

function loadGeminiPublicMeta(): Promise<Record<string, PublicSeoMetaEntry>> {
  if (cachedMetaMap) return Promise.resolve(cachedMetaMap);
  if (!pendingMetaPromise) {
    pendingMetaPromise = apiRequestJson<{ ok?: boolean; metaByPath?: Record<string, PublicSeoMetaEntry> }>(
      'seo/gemini-optimizer/public-meta',
      { method: 'GET' },
      6000
    )
      .then(({ res, data }) => {
        if (res.ok && data?.metaByPath && typeof data.metaByPath === 'object') {
          cachedMetaMap = data.metaByPath;
          return cachedMetaMap;
        }
        return {};
      })
      .catch(() => ({}))
      .finally(() => {
        pendingMetaPromise = null;
      });
  }
  return pendingMetaPromise;
}

export function invalidateGeminiPublicMetaCache() {
  cachedMetaMap = null;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  view,
  canonicalPath,
  customTitle,
  customDescription,
  noIndex = false,
}) => {
  const [metaMap, setMetaMap] = useState<Record<string, PublicSeoMetaEntry> | null>(cachedMetaMap);

  useEffect(() => {
    let active = true;
    if (!metaMap) {
      loadGeminiPublicMeta().then((map) => {
        if (active && Object.keys(map).length > 0) {
          setMetaMap(map);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [metaMap]);

  useEffect(() => {
    const activePath =
      canonicalPath ||
      (typeof window !== 'undefined' ? window.location.pathname || '/' : '/');
    const override = metaMap?.[activePath];

    const defaultTitle = 'صنایع چاپ و بسته‌بندی اشک قلم | جعبه‌ساز آنلاین سه‌بعدی';
    const defaultDesc =
      'سامانه جامع مهندسی کارتن، بسته‌بندی، چاپ افست ۵ رنگ، کاتالوگ سه‌بعدی و طراحی آنلاین دایلاین اشک قلم.';

    const finalTitle = override?.metaTitle || customTitle || defaultTitle;
    const finalDesc = override?.metaDescription || customDescription || defaultDesc;

    document.title = finalTitle;

    const upsertMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    upsertMeta('name', 'description', finalDesc);
    upsertMeta('property', 'og:title', finalTitle);
    upsertMeta('property', 'og:description', finalDesc);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    if (override?.keywords && override.keywords.length > 0) {
      upsertMeta('name', 'keywords', override.keywords.join(', '));
    }

    if (canonicalPath) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', `https://ashkghalam.ir${canonicalPath}`);
    }
  }, [view, canonicalPath, customTitle, customDescription, noIndex, metaMap]);

  return null;
};
