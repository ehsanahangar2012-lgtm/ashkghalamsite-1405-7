export type HotspotType = 
  | 'product' 
  | 'quote' 
  | 'whatsapp' 
  | 'video' 
  | 'audio' 
  | 'view360' 
  | 'link' 
  | 'call';

export interface CatalogHotspot {
  id: string;
  pageIndex: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  type: HotspotType;
  title: string;
  subtitle?: string;
  description?: string;
  price?: string;
  productCode?: string;
  targetUrl?: string;
  phoneNumber?: string;
  videoUrl?: string;
  audioUrl?: string;
  images360?: string[];
  color?: string;
}

export interface CatalogPage {
  pageNumber: number;
  imageUrl: string;
  webpUrl?: string;
  thumbnailUrl?: string;
  extractedText?: string;
  width?: number;
  height?: number;
  hotspots?: CatalogHotspot[];
}

export interface CatalogItem {
  id: string;
  uuid: string;
  title: string;
  slug: string;
  description: string;
  category: string;
  coverImage: string;
  backCoverImage?: string;
  pdfUrl?: string;
  thumbnailUrl: string;
  pageCount: number;
  fileSize?: string;
  language: string;
  publisher: string;
  createdAt: string;
  updatedAt: string;
  isPublished: boolean;
  featured: boolean;
  sortOrder: number;
  views: number;
  downloads: number;
  seoKeywords?: string[];
  seoDescription?: string;
  paperFinish?: 'glossy' | 'matte' | 'silk' | 'embossed' | 'gold_foil';
  pages: CatalogPage[];
  hotspots?: CatalogHotspot[];
}

export interface PDFProcessingProgress {
  status: 'idle' | 'reading' | 'rendering' | 'compressing' | 'complete' | 'error';
  currentPage: number;
  totalPages: number;
  percentage: number;
  message?: string;
}

export interface CatalogFilterOptions {
  category?: string;
  searchQuery?: string;
  isPublishedOnly?: boolean;
  featuredOnly?: boolean;
  sortBy?: 'newest' | 'popular' | 'title' | 'order';
}
