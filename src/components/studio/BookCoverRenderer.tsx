import React, { useState, useEffect, useMemo } from 'react';
import { CoverDesignConfig } from '../../types/flipbook';
import { getUploadFallbackCandidates } from '../../utils/catalogAssets';

interface BookCoverRendererProps {
  side: 'front' | 'back';
  cover: CoverDesignConfig;
  pageCount: number;
}

export const BookCoverRenderer = React.forwardRef<HTMLDivElement, BookCoverRendererProps>(
  ({ side, cover, pageCount }, ref) => {
    const customImage = side === 'front' ? cover.frontCustomImageUrl : cover.backCustomImageUrl;
    const bgCandidates = useMemo(() => getUploadFallbackCandidates(customImage), [customImage]);
    const [bgIdx, setBgIdx] = useState(0);
    const [bgFailed, setBgFailed] = useState(false);

    const logoCandidates = useMemo(
      () => getUploadFallbackCandidates(cover.logoDataUrl),
      [cover.logoDataUrl]
    );
    const [logoIdx, setLogoIdx] = useState(0);
    const [logoFailed, setLogoFailed] = useState(false);

    useEffect(() => {
      setBgIdx(0);
      setBgFailed(false);
    }, [customImage]);

    useEffect(() => {
      setLogoIdx(0);
      setLogoFailed(false);
    }, [cover.logoDataUrl]);

    const bgSrc = bgCandidates[bgIdx];
    const logoSrc = logoCandidates[logoIdx];

    const hasBackdropImage = Boolean(bgSrc) && !bgFailed;
    const isFullImage = hasBackdropImage || cover.templateId === 'full-image';

    const baseBgStyle: React.CSSProperties = hasBackdropImage
      ? {
          backgroundColor: cover.primaryColor,
          color: '#ffffff',
        }
      : {
          backgroundColor: cover.primaryColor,
          color: cover.textColor,
        };

    const isEditorial = cover.templateId === 'editorial-minimal' && !hasBackdropImage;
    const isLuxury = cover.templateId === 'luxury-foil' && !hasBackdropImage;
    const isModern = cover.templateId === 'modern-grid' && !hasBackdropImage;
    const isArtisan = cover.templateId === 'artisan-warm' && !hasBackdropImage;

    const handleBgError = () => {
      if (bgIdx + 1 < bgCandidates.length) {
        setBgIdx((prev) => prev + 1);
      } else {
        setBgFailed(true);
      }
    };

    const handleLogoError = () => {
      if (logoIdx + 1 < logoCandidates.length) {
        setLogoIdx((prev) => prev + 1);
      } else {
        setLogoFailed(true);
      }
    };

    const backdropLayer = hasBackdropImage && bgSrc ? (
      <>
        <img
          src={bgSrc}
          alt=""
          referrerPolicy="no-referrer"
          onError={handleBgError}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,0.84) 0%, rgba(0,0,0,0.38) 52%, rgba(0,0,0,0.22) 100%)',
          }}
        />
      </>
    ) : null;

    if (side === 'back') {
      return (
        <div
          ref={ref}
          data-density="hard"
          dir="rtl"
          className="flip-page-sheet relative w-full h-full overflow-hidden flex flex-col justify-between p-6 md:p-8 text-center"
          style={baseBgStyle}
        >
          {backdropLayer}
          {/* Decorative template borders */}
          {isLuxury && (
            <div
              className="absolute inset-4 pointer-events-none border"
              style={{ borderColor: cover.accentColor, opacity: 0.45 }}
            />
          )}
          {isEditorial && (
            <div
              className="absolute inset-4 pointer-events-none border"
              style={{ borderColor: cover.textColor, opacity: 0.14 }}
            />
          )}

          <div className="relative z-10 flex items-center justify-between text-[11px] opacity-75">
            <span>{cover.brandName || 'کاتالوگ دیجیتال'}</span>
            <span className="tabular-nums">{pageCount.toLocaleString('fa-IR')} محصول</span>
          </div>

          <div className="relative z-10 my-auto max-w-[260px] mx-auto space-y-4">
            {logoSrc && !logoFailed && (
              <img
                src={logoSrc}
                alt={cover.brandName || 'لوگو'}
                referrerPolicy="no-referrer"
                onError={handleLogoError}
                className="max-h-12 max-w-[140px] mx-auto object-contain"
              />
            )}
            <div
              className="w-10 h-0.5 mx-auto"
              style={{ backgroundColor: cover.accentColor }}
            />
            <h2 className="text-base md:text-lg font-extrabold leading-snug">
              {cover.backHeadline || 'اطلاعات تماس و سفارش'}
            </h2>
            <p className="text-xs leading-relaxed opacity-85">
              {cover.backDescription}
            </p>
          </div>

          <div className="relative z-10 space-y-1.5 text-[11px] opacity-85 border-t pt-4" style={{ borderColor: 'rgba(128,128,128,0.25)' }}>
            {cover.backContactInfo && <div>{cover.backContactInfo}</div>}
            {cover.backWebsite && (
              <div className="font-mono text-[10px]" style={{ color: isFullImage ? '#fbbf24' : cover.accentColor }}>
                {cover.backWebsite}
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        ref={ref}
        data-density="hard"
        dir="rtl"
        className="flip-page-sheet relative w-full h-full overflow-hidden flex flex-col justify-between p-6 md:p-8"
        style={baseBgStyle}
      >
        {backdropLayer}
        {/* Template-specific architectural framing */}
        {isLuxury && (
          <>
            <div
              className="absolute inset-3.5 pointer-events-none border"
              style={{ borderColor: cover.accentColor, opacity: 0.5 }}
            />
            <div
              className="absolute inset-5 pointer-events-none border"
              style={{ borderColor: cover.accentColor, opacity: 0.22 }}
            />
          </>
        )}

        {isModern && (
          <>
            <div
              className="absolute top-0 right-0 bottom-0 w-3 pointer-events-none"
              style={{ backgroundColor: cover.accentColor }}
            />
            <div
              className="absolute inset-x-8 top-14 h-px pointer-events-none"
              style={{ backgroundColor: cover.textColor, opacity: 0.14 }}
            />
            <div
              className="absolute inset-x-8 bottom-14 h-px pointer-events-none"
              style={{ backgroundColor: cover.textColor, opacity: 0.14 }}
            />
          </>
        )}

        {isEditorial && (
          <div
            className="absolute inset-4 pointer-events-none border"
            style={{ borderColor: cover.textColor, opacity: 0.15 }}
          />
        )}

        {isArtisan && (
          <div
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.14), transparent 50%), radial-gradient(circle at 80% 80%, rgba(0,0,0,0.3), transparent 55%)',
            }}
          />
        )}

        {/* Top Bar of Cover */}
        <div className="relative z-10 flex items-center justify-between text-[11px] font-semibold opacity-85">
          <span className="truncate">{cover.brandName || 'کاتالوگ محصولات'}</span>
          {cover.yearLabel && (
            <span className="tabular-nums font-bold" style={{ color: isFullImage ? '#fbbf24' : cover.accentColor }}>
              {cover.yearLabel}
            </span>
          )}
        </div>

        {/* Centerpiece Typography & Logo */}
        <div
          className={`relative z-10 my-auto flex flex-col gap-4 ${
            isModern ? 'text-right pr-3' : 'text-center items-center'
          }`}
        >
          {logoSrc && !logoFailed && (
            <img
              src={logoSrc}
              alt={cover.brandName || 'لوگو برند'}
              referrerPolicy="no-referrer"
              onError={handleLogoError}
              className="max-h-14 max-w-[150px] object-contain"
            />
          )}

          {!isModern && (
            <div
              className="w-12 h-0.5"
              style={{ backgroundColor: cover.accentColor }}
            />
          )}

          <h1 className="text-xl sm:text-2xl md:text-[26px] font-black leading-snug [text-wrap:balance]">
            {cover.title || 'کاتالوگ دیجیتال محصول'}
          </h1>

          {cover.subtitle && (
            <p className="text-xs sm:text-sm leading-relaxed opacity-85 max-w-[260px]">
              {cover.subtitle}
            </p>
          )}
        </div>

        {/* Bottom Metadata Footer */}
        <div className="relative z-10 flex items-center justify-between text-[11px] pt-3 border-t" style={{ borderColor: 'rgba(128,128,128,0.22)' }}>
          <span style={{ color: isFullImage ? '#fbbf24' : cover.accentColor }} className="font-bold">
            {cover.editionLabel || 'نسخه رسمی'}
          </span>
          <span className="opacity-75 tabular-nums">
            {pageCount.toLocaleString('fa-IR')} صفحه محصول
          </span>
        </div>
      </div>
    );
  }
);

BookCoverRenderer.displayName = 'BookCoverRenderer';
