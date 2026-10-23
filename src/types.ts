
// User Roles and Segments
export enum UserRole {
  GUEST = 'GUEST',
  SMB = 'SMB',
  ENTERPRISE = 'ENTERPRISE',
  ADMIN = 'ADMIN',
  LITHO_OPERATOR = 'LITHO_OPERATOR',
  ACCOUNTANT = 'ACCOUNTANT',
  PARTNER = 'PARTNER'
}

// Navigation Views
export enum AppView {
  HOME = 'HOME',
  INQUIRY = 'INQUIRY',
  CATALOG = 'CATALOG',
  PORTFOLIO = 'PORTFOLIO',
  DASHBOARD = 'DASHBOARD',
  ADMIN_PANEL = 'ADMIN_PANEL',
  ENTERPRISE_CMS = 'ENTERPRISE_CMS',
  SEO_ENGINE = 'SEO_ENGINE',
  AI_CONTENT_FACTORY = 'AI_CONTENT_FACTORY',
  PROGRAMMATIC_SEO = 'PROGRAMMATIC_SEO',
  ENTERPRISE_DAM = 'ENTERPRISE_DAM',
  ENTERPRISE_DXP = 'ENTERPRISE_DXP',
  SUPPORT = 'SUPPORT',
  SERVICES = 'SERVICES',
  PRODUCTS = 'PRODUCTS',
  DIELINE_GENERATOR = 'DIELINE_GENERATOR',
  DESIGN_STUDIO = 'DESIGN_STUDIO',
  ENGINEERING_CAD = 'ENGINEERING_CAD',
  AUTOCAD_STUDIO = 'AUTOCAD_STUDIO',
  BLOG = 'BLOG',
  B2B_SUITE = 'B2B_SUITE',
  ABOUT = 'ABOUT',
  LIBRARY = 'LIBRARY',
  SOFTWARE_STORE = 'SOFTWARE_STORE',
  NOT_FOUND = 'NOT_FOUND'
}

export type SitePortalId = 'ashk' | 'badikaran' | 'software' | 'b2b' | string;

export interface PortalItemConfig {
  id: string; // 'ashk' | 'badikaran' | 'software' | 'b2b' | custom
  title: string;
  englishTitle?: string;
  tagline?: string;
  badge?: string;
  description: string;
  iconName: string; // 'Box' | 'Printer' | 'Laptop' | 'Building2' | 'Cpu' | 'Layers' | 'Sparkles' | 'Globe' | 'ShieldCheck'
  colorTheme: string; // 'sky' | 'emerald' | 'indigo' | 'amber' | 'rose' | 'purple' | 'cyan'
  services: string[];
  metrics?: { label: string; value: string }[];
  targetUrl?: string; // External URL
  internalView?: string; // AppView key
  buttonText?: string;
  enabled: boolean;
  order?: number;
}

export interface EmergencyBannerConfig {
  enabled: boolean;
  message: string;
  targetView: 'ALL' | AppView;
  linkText?: string;
  linkUrl?: string;
  urgency?: 'critical' | 'warning' | 'info';
  dismissible?: boolean;
}

export interface Order {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: 'pending' | 'processing' | 'printing' | 'shipped' | 'delivered';
}

// Data Models
export interface User {
  id: string;
  name: string;
  username?: string; // For login
  role: UserRole;
  tokens: number;
  walletBalance?: number;
  orderHistory?: Order[];
  avatar?: string;
  companyName?: string;
  phone?: string;
  email?: string;
  joinDate?: string;
}

export interface Project {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'processing' | 'printing' | 'shipped' | 'delivered' | 'saved_design';
  date: string;
  dielineConfig?: any;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string; // Markdown or HTML
  author: string;
  date: string;
  imageUrl?: string;
  tags: string[];
  readTime: number; // minutes
}

export interface DielineConfig {
  typeId: string;
  dimensions: { w: number; h: number; d: number; [key: string]: number };
  paperType?: string;
  finish?: string;
  specialEffects?: string[];
  textureUrl?: string | null;
}

// --- CMS & SEO Types ---

export interface SeoConfig {
  view: AppView;
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  schemaType?: 'Organization' | 'LocalBusiness' | 'FAQPage' | 'Article' | 'Product' | 'BreadcrumbList' | 'WebSite';
  structuredData?: any; // JSON-LD payload
  optimizationScore?: number;
  recommendations?: string[];
  isProgrammatic?: boolean;
}

export interface GlobalSettings {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  fontFamily: string;
  ashkPortalUrl?: string;
  badikaranPortalUrl?: string;
  
  // Badikaran Notification Toast
  badikaranNotifEnabled?: boolean;
  badikaranNotifTitle?: string;
  badikaranNotifText?: string;
  badikaranNotifDelay?: number;
  badikaranNotifDuration?: number;

  // Welcome Modal Popup
  welcomeModalEnabled?: boolean;
  welcomeTitle?: string;
  welcomeSubtitle?: string;
  welcomeBoxTitle?: string;
  welcomeBoxDesc?: string;
  welcomeStudioTitle?: string;
  welcomeStudioDesc?: string;
  welcomeCtaText?: string;

  // Site Switcher Modal & Dynamic Portals Hub
  siteSwitcherTitle?: string;
  siteSwitcherSubtitle?: string;
  siteSwitcherEnabled?: boolean;
  portalsList?: PortalItemConfig[];
  ashkPortalTitle?: string;
  ashkPortalDesc?: string;
  ashkServices?: string[];
  badikaranPortalTitle?: string;
  badikaranPortalDesc?: string;
  badikaranServices?: string[];

  // Additional Editable UI Strings
  contactAddress?: string;
  workingHours?: string;
  whatsappNumber?: string;
  inquirySuccessTitle?: string;
  inquirySuccessMessage?: string;
}

export interface SiteContent {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroBackgroundUrl: string; // Dynamic Background
  footerAbout: string;
  contactPhone: string;
  contactEmail: string;
  contactAddress?: string;
  workingHours?: string;
}

export interface MediaItem {
  id: number | string;
  title: string;
  img: string;
  category?: string; // For portfolio
  description?: string;
  date?: string; // Added for sorting
  pages?: string[]; // Book pages for the advanced Catalog Flipping Book Engine
  texts?: string[]; // Page texts for searching keywords
  coverImg?: string;
  backCoverImg?: string;
  aiAnalysis?: { technicalSpecs: string, designSummary: string };
  pageMetadata?: {
    productName?: string;
    dimensions?: string;
    material?: string;
    description?: string;
    isDivider?: boolean;
    dividerTitle?: string;
  }[];
}

export interface UploadedAsset {
  id: string;
  name: string;
  type: string; // 'image/png', etc.
  data: string; // Base64 string
  uploadDate: string;
  size: number; // in bytes
}

// --- Advanced Pricing & Engineering Types ---

export interface SheetStandard {
  id: string;
  name: string;
  width: number; // cm
  height: number; // cm
  // pricePerSheet moved to detailed PaperConfig
}

export interface PaperGrade {
  id: string; // e.g., 'glossy'
  name: string; // e.g., 'گلاسه'
  weights: {
    grammage: number; // e.g., 300 (gsm)
    pricePerKg: number; // Toman
  }[];
}

export interface FinishCost {
  id: string;
  name: string;
  type: 'sqm' | 'fixed' | 'unit'; // square meter, one-time mold, or per item
  price: number;
}

export interface MachineConfig {
  name: string;
  maxSheetSize: { w: number, h: number };
  minSheetSize: { w: number, h: number };
  gripperMargin: number; // cm (لبه پنجه)
  plateCost: number; // Cost per Zinc (color)
  setupCost: number; // Make-ready cost (Bastan)
  runCostPer1000: number; // Cost per 1000 impressions
}

export interface PricingFormulaConfig {
  profitMargin: number;
  rushMultiplier: number;
  taxRate: number;
  
  // New Detailed Logic
  papers: PaperGrade[];
  finishes: FinishCost[];
  
  // Engineering Defaults
  defaultMachine: MachineConfig;
  standardSheets: SheetStandard[]; // Available raw sheet sizes (100x70, 60x90, etc.)
}

// New Types for Ganging / Mixed Layout
export interface ImpositionItemInput {
  id: string;
  name: string;
  width: number;
  height: number;
  quantity: number;
  color?: string;
  imgUrl?: string; // NEW: For uploaded files
  warnings?: string[]; // Pre-flight warnings
}

export interface PlacedItem {
  itemId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  rowId: number; // For identifying cut lines
  imgUrl?: string; // NEW: Passed through
}

export interface ImpositionLayout {
  sheetId: string;
  sheetWidth: number;
  sheetHeight: number;
  placedItems: PlacedItem[];
  unplacedItems: ImpositionItemInput[]; // Items that didn't fit
  wastePercentage: number;
  usedAreaPercentage: number;
  zincCost: number;
  printCost: number;
  paperCost: number;
  totalSheetsRequired: number; // Usually 1 for specific zinc layout, but multiplied by run length
}

export interface LibraryBookItem {
  id: string;
  title: string;
  category: 'books' | 'catalogs' | 'cad' | 'software';
  categoryLabel: string;
  fileSize: string;
  format: string;
  description: string;
  coverImage?: string;
  downloadUrl?: string;
  downloadsCount: number;
  dateAdded: string;
  iconName?: string;
  author?: string;
  pagesCount?: number;
  catalogPages?: string[];
}

export interface AdminConfig {
  boxType: 'fefco0427' | 'giftBox' | 'slidingSleeve' | 'windowBox' | 'pharmaCarton';
  length: number;
  width: number;
  height: number;
  cardboardColor: string;
  artworkColor: string;
  speed: number;
  cameraPath: 'cinematic' | 'orbit' | 'topDown' | 'isometric';
  glowActive: boolean;
  particlesCount: number;
  ctaServicesText: string;
  ctaPortfolioText: string;
  ctaInquiryText: string;
  slideDurationMult: number;
  autoCycleBoxes: boolean;
  promoTitle1: string;
  promoDesc1: string;
  promoTitle2: string;
  promoDesc2: string;
  promoTitle3: string;
  promoDesc3: string;
  brandTitle: string;
  brandSlogan: string;
  brandDescription: string;
  activeBoxTypes: Array<'fefco0427' | 'windowBox' | 'pharmaCarton' | 'giftBox' | 'slidingSleeve'>;
  cameraHeightOffset: number;
  cameraDistanceOffset: number;
  cameraAngleOffset: number;
}

