declare module 'page-flip' {
  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    disableFlipByClick?: boolean;
    startPage?: number;
  }

  export class PageFlip {
    constructor(htmlElement: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    updateFromHtml(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    flipNext(corner?: 'top' | 'bottom'): void;
    flipPrev(corner?: 'top' | 'bottom'): void;
    turnToPage(pageNum: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    on(event: string, callback: (e: { data: any }) => void): this;
    off(event: string): void;
    destroy(): void;
  }
}

declare module 'react-pageflip' {
  import * as React from 'react';
  const HTMLFlipBook: React.ComponentType<any>;
  export default HTMLFlipBook;
}
