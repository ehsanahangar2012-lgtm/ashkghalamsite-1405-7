export type FlipDirection = 'rtl' | 'ltr';

export type PageOrientationMode = 'auto' | 'landscape' | 'portrait';

export type AiAnalysisStatus = 'idle' | 'analyzing' | 'done' | 'error';

export type CoverTemplateId =
  | 'editorial-minimal'
  | 'luxury-foil'
  | 'modern-grid'
  | 'artisan-warm'
  | 'full-image';

export interface CatalogPage {
  id: string;
  fileName: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  sku?: string;
  priceLabel?: string;
  originalDataUrl: string;
  optimizedDataUrl: string;
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  width: number;
  height: number;
  aiStatus: AiAnalysisStatus;
  aiError?: string;
}

export interface OptimizationSettings {
  quality: number; // 0.40 - 0.95
  maxDimension: number; // 800 | 1200 | 1600 | 2000
}

export interface CoverDesignConfig {
  templateId: CoverTemplateId;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  title: string;
  subtitle: string;
  brandName: string;
  editionLabel: string;
  yearLabel: string;
  logoDataUrl?: string;
  frontCustomImageUrl?: string;
  backCustomImageUrl?: string;
  backHeadline: string;
  backDescription: string;
  backContactInfo: string;
  backWebsite: string;
  showPageNumbers: boolean;
}

export interface CatalogProject {
  id: string;
  name: string;
  flipDirection: FlipDirection;
  pageOrientation?: PageOrientationMode;
  optimization: OptimizationSettings;
  cover: CoverDesignConfig;
  pages: CatalogPage[];
  updatedAt: string;
  publishedId?: string;
}

export interface SavedProjectSummary {
  id: string;
  name: string;
  pageCount: number;
  updatedAt: string;
  publishedId?: string;
}
