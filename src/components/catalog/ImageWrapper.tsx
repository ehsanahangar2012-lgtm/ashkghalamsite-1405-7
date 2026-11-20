import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { resolveCatalogCoverImage, getUploadFallbackUrl } from '../../utils/catalogAssets';

interface ImageWrapperProps {
  src?: string;
  alt: string;
  className?: string;
  catalogId?: string | number;
  fallbackTitle?: string;
  fallbackIcon?: React.ReactNode;
}

export const ImageWrapper: React.FC<ImageWrapperProps> = ({
  src,
  alt,
  className = '',
  catalogId,
  fallbackTitle,
  fallbackIcon,
}) => {
  const strCatalogId = catalogId !== undefined ? String(catalogId) : undefined;
  const [resolvedSrc, setResolvedSrc] = useState<string | undefined>(() => resolveCatalogCoverImage(src, strCatalogId));
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(resolvedSrc));
  const [hasError, setHasError] = useState<boolean>(false);
  const [retried, setRetried] = useState<boolean>(false);

  useEffect(() => {
    const res = resolveCatalogCoverImage(src, strCatalogId);
    setResolvedSrc(res);
    setIsLoading(Boolean(res));
    setHasError(false);
    setRetried(false);
  }, [src, strCatalogId]);

  const handleImageError = () => {
    if (!retried && resolvedSrc) {
      const fallbackUrl = getUploadFallbackUrl(resolvedSrc);
      if (fallbackUrl) {
        setRetried(true);
        setResolvedSrc(fallbackUrl);
        setIsLoading(true);
        return;
      }
    }
    setIsLoading(false);
    setHasError(true);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
      {/* Elegant Loader while loading */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              بارگذاری تصویر...
            </span>
          </div>
        </div>
      )}

      {/* Main Image with Lazy Loading */}
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${className}`}
        />
      ) : (
        /* Default Placeholder Fallback */
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 text-slate-500 dark:text-slate-400">
          {fallbackIcon || <BookOpen className="w-10 h-10 mb-2 text-amber-500 opacity-75" />}
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 line-clamp-2">
            {fallbackTitle || alt || 'تصویر کاتالوگ'}
          </span>
        </div>
      )}
    </div>
  );
};
