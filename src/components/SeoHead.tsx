import React, { useEffect } from 'react';
import { AppView } from '../types';

interface SeoHeadProps {
  view?: AppView;
  canonicalPath?: string;
  customTitle?: string;
  customDescription?: string;
  noIndex?: boolean;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  view,
  canonicalPath,
  customTitle,
  customDescription,
  noIndex = false,
}) => {
  useEffect(() => {
    const defaultTitle = 'اشک قلم (Ashk Ghalam) - CAD Studio v3.9.1';
    const defaultDesc = 'سامانه جامع مهندسی کارتن، بسته‌بندی، محصولات و کاتالوگ هوشمند اشک قلم v3.9.1';

    document.title = customTitle || defaultTitle;

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', customDescription || defaultDesc);

    let metaRobots = document.querySelector('meta[name="robots"]');
    if (!metaRobots) {
      metaRobots = document.createElement('meta');
      metaRobots.setAttribute('name', 'robots');
      document.head.appendChild(metaRobots);
    }
    metaRobots.setAttribute('content', noIndex ? 'noindex, nofollow' : 'index, follow');

    if (canonicalPath) {
      let linkCanonical = document.querySelector('link[rel="canonical"]');
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', `https://ashkghalam.ir${canonicalPath}`);
    }
  }, [view, canonicalPath, customTitle, customDescription, noIndex]);

  return null;
};
