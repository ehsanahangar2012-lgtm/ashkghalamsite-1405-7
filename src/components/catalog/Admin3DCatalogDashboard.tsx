import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
  lazy,
  Suspense,
} from 'react';
import {
  BookOpen,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Edit3,
  Layers,
  Share2,
  Globe,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  FolderPlus,
  ChevronDown,
  ChevronUp,
  Save,
  Sliders,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { CatalogItem } from '../../services/catalogService';
import { useCatalog } from '../../contexts/CatalogContext';
import { resolveCatalogCoverImage, getUploadFallbackCandidates } from '../../utils/catalogAssets';
import {
  CatalogPage,
  CatalogProject,
  CoverDesignConfig,
  FlipDirection,
  OptimizationSettings,
  PageOrientationMode,
  SavedProjectSummary,
} from '../../types/flipbook';
import { createInitialDemoProject } from '../../data/demoCatalog';
import {
  saveActiveProjectToLocal,
  listSavedProjects,
  saveNamedProjectToLocal,
  loadSavedProjectById,
  deleteSavedProjectById,
  publishProjectToServer,
} from '../../services/projectStorageService';
import { generateIframeEmbedCode } from '../../utils/wordpressExport';

// Lazy-load heavy builder, optimizer, export, and 3D viewer chunks on demand
const FlipbookViewer = lazy(() =>
  import('../studio/FlipbookViewer').then((m) => ({ default: m.FlipbookViewer }))
);
const ImageUploaderPanel = lazy(() =>
  import('../studio/ImageUploaderPanel').then((m) => ({ default: m.ImageUploaderPanel }))
);
const CoverDesignerPanel = lazy(() =>
  import('../studio/CoverDesignerPanel').then((m) => ({ default: m.CoverDesignerPanel }))
);
const WebOptimizerPanel = lazy(() =>
  import('../studio/WebOptimizerPanel').then((m) => ({ default: m.WebOptimizerPanel }))
);
const WordpressExportPanel = lazy(() =>
  import('../studio/WordpressExportPanel').then((m) => ({ default: m.WordpressExportPanel }))
);
const CatalogSpreadModal = lazy(() =>
  import('./CatalogSpreadModal').then((m) => ({ default: m.CatalogSpreadModal }))
);

type DashboardMode = 'list' | 'builder';
type BuilderTab = 'pages' | 'cover' | 'export';
type VisibilityFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

function buildSlugFromTitle(title: string, fallbackId: string): string {
  const cleaned = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
  return cleaned || fallbackId;
}

const LazySectionLoader: React.FC<{ label?: string }> = ({ label = 'در حال بارگذاری...' }) => (
  <div className="p-8 rounded-xl border border-stone-200 bg-white/70 flex items-center justify-center gap-2.5 text-xs text-stone-500">
    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
    <span>{label}</span>
  </div>
);

interface CatalogAdminCardProps {
  catalog: CatalogItem;
  categories: string[];
  isEditingThis: boolean;
  isToggling: boolean;
  isConfirmingDel: boolean;
  onToggleStatus: (item: CatalogItem) => void;
  onCategoryChange: (item: CatalogItem, nextCategory: string) => void;
  onEdit: (item: CatalogItem) => void;
  onPreview: (item: CatalogItem) => void;
  onOpenEmbed: (item: CatalogItem) => void;
  onRequestDelete: (id: string | number | null) => void;
  onConfirmDelete: (item: CatalogItem) => void;
}

const CatalogAdminCard = React.memo<CatalogAdminCardProps>(
  ({
    catalog: c,
    categories,
    isEditingThis,
    isToggling,
    isConfirmingDel,
    onToggleStatus,
    onCategoryChange,
    onEdit,
    onPreview,
    onOpenEmbed,
    onRequestDelete,
    onConfirmDelete,
  }) => {
    const coverBase = useMemo(
      () => resolveCatalogCoverImage(c.coverImage, c.id),
      [c.coverImage, c.id]
    );
    const coverCandidates = useMemo(
      () => getUploadFallbackCandidates(coverBase),
      [coverBase]
    );
    const [coverIdx, setCoverIdx] = useState(0);
    const [coverFailed, setCoverFailed] = useState(false);

    useEffect(() => {
      setCoverIdx(0);
      setCoverFailed(false);
    }, [coverBase]);

    const coverSrc = coverCandidates[coverIdx];
    const isPub = c.isPublished !== false;

    const categoryOptions = useMemo(
      () => Array.from(new Set([...categories, c.category].filter(Boolean))),
      [categories, c.category]
    );

    return (
      <div
        className={`border rounded-2xl overflow-hidden flex flex-col sm:flex-row transition-colors ${
          isPub
            ? 'bg-slate-950/75 border-slate-800'
            : 'bg-slate-950/40 border-slate-800/60 opacity-85'
        }`}
      >
        {/* Cover Thumbnail */}
        <div className="sm:w-40 aspect-[4/3] sm:aspect-auto bg-slate-900 border-b sm:border-b-0 sm:border-l border-slate-800 shrink-0 overflow-hidden flex items-center justify-center relative">
          {coverSrc && !coverFailed ? (
            <img
              src={coverSrc}
              alt={c.title}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={() => {
                if (coverIdx + 1 < coverCandidates.length) {
                  setCoverIdx((prev) => prev + 1);
                } else {
                  setCoverFailed(true);
                }
              }}
              className={`w-full h-full object-cover ${!isPub ? 'grayscale-[60%]' : ''}`}
            />
          ) : (
            <BookOpen className="w-9 h-9 text-slate-600" />
          )}
        </div>

        {/* Content & Controls */}
        <div className="flex-1 p-4 flex flex-col justify-between gap-3 min-w-0">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              {/* Instant Optimistic Toggle Switch */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  dir="ltr"
                  role="switch"
                  aria-checked={isPub}
                  aria-label={isPub ? `غیرفعال کردن موقت ${c.title}` : `فعال کردن ${c.title}`}
                  disabled={isToggling}
                  onClick={() => onToggleStatus(c)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                    isPub ? 'bg-emerald-500' : 'bg-slate-700'
                  } ${isToggling ? 'opacity-70' : ''}`}
                  title={isPub ? 'فعال در سایت (کلیک برای مخفی‌سازی موقت)' : 'غیرفعال موقت (کلیک برای نمایش در سایت)'}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isPub ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span
                  className={`text-[11px] font-extrabold ${
                    isPub ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {isPub ? 'فعال در سایت' : 'غیرفعال (مخفی)'}
                </span>
              </div>

              {/* Quick Category Select */}
              <select
                value={c.category || ''}
                onChange={(e) => onCategoryChange(c, e.target.value)}
                aria-label="تغییر دسته‌بندی کاتالوگ"
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] text-amber-300 font-semibold focus:outline-none focus:border-amber-500 max-w-[165px]"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <h3 className="text-sm font-extrabold text-slate-100 truncate mt-1">
              {c.title}
            </h3>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 tabular-nums">
              <span>{c.flipbookId ? 'فلیپ‌بوک سه‌بعدی' : 'کاتالوگ فنی'}</span>
              {c.pageCount ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{c.pageCount.toLocaleString('fa-IR')} صفحه</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Clean Action Buttons */}
          {isConfirmingDel ? (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-rose-500/30 text-xs">
              <span className="text-rose-300 font-bold">آیا از حذف مطمئنید؟</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onConfirmDelete(c)}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  بله، حذف شود
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => onEdit(c)}
                disabled={isEditingThis}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                {isEditingThis ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Edit3 className="w-3.5 h-3.5" />
                )}
                <span>ویرایش</span>
              </button>

              <button
                type="button"
                onClick={() => onPreview(c)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-sky-400" />
                <span>پیش‌نمایش</span>
              </button>

              {c.flipbookId && (
                <button
                  type="button"
                  onClick={() => onOpenEmbed(c)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span>کد وردپرس</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onRequestDelete(c.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer mr-auto"
                title="حذف کاتالوگ"
                aria-label="حذف کاتالوگ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
);

CatalogAdminCard.displayName = 'CatalogAdminCard';

export const Admin3DCatalogDashboard: React.FC = () => {
  const {
    catalogs,
    categories,
    loading: contextLoading,
    hasLoadedAdmin,
    error: contextError,
    ensureLoaded,
    refreshCatalogs,
    toggleCatalogStatus,
    saveCatalogItem,
    deleteCatalogItem,
    saveCategories,
    getFlipbookProject,
    cacheFlipbookProject,
  } = useCatalog();

  const [mode, setMode] = useState<DashboardMode>('list');

  // Clean List Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Inline Category Manager Drawer
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Confirm delete in-place (no window.confirm)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | number | null>(null);
  const [togglingId, setTogglingId] = useState<string | number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Builder State
  const [project, setProject] = useState<CatalogProject>(() => createInitialDemoProject());
  const [linkedCatalogId, setLinkedCatalogId] = useState<string | number | undefined>(undefined);
  const [linkedCatalogSlug, setLinkedCatalogSlug] = useState<string | undefined>(undefined);
  const [siteCategory, setSiteCategory] = useState<string>('کاتالوگ دیجیتال محصول');
  const [isSitePublished, setIsSitePublished] = useState<boolean>(true);
  const [builderTab, setBuilderTab] = useState<BuilderTab>('pages');
  const [showWebpSettings, setShowWebpSettings] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [expandPreview, setExpandPreview] = useState(false);
  const [showInlineNewCat, setShowInlineNewCat] = useState(false);
  const [inlineNewCatName, setInlineNewCatName] = useState('');
  const [mobilePane, setMobilePane] = useState<'editor' | 'preview'>('editor');
  const [savedProjects, setSavedProjects] = useState<SavedProjectSummary[]>(() => listSavedProjects());

  // Deferred project for 3D Flipbook preview so typing/reordering never lags
  const deferredProject = useDeferredValue(project);

  // Action feedback states
  const [savingCatalog, setSavingCatalog] = useState(false);
  const [loadingEditId, setLoadingEditId] = useState<string | number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // In-place preview & WordPress embed modals
  const [previewCatalogItem, setPreviewCatalogItem] = useState<CatalogItem | null>(null);
  const [embedModalItem, setEmbedModalItem] = useState<CatalogItem | null>(null);

  // Lifecycle refs to eliminate timer/async memory leaks on unmount
  const mountedRef = useRef(true);
  const noticeTimerRef = useRef<number | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  // Load once from persistent CatalogContext (no duplicate fetch when returning to admin!)
  useEffect(() => {
    void ensureLoaded(true);
  }, [ensureLoaded]);

  // Debounced auto-save draft while in builder mode
  useEffect(() => {
    if (mode !== 'builder') return;
    const timer = window.setTimeout(() => {
      saveActiveProjectToLocal(project);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [project, mode]);

  const showNotice = useCallback((type: 'ok' | 'err', text: string) => {
    if (!mountedRef.current) return;
    setBannerMsg({ type, text });
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) {
        setBannerMsg((prev) => (prev?.text === text ? null : prev));
      }
    }, 4500);
  }, []);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshCatalogs(true);
      showNotice('ok', 'فهرست کاتالوگ‌ها بروزرسانی شد.');
    } finally {
      if (mountedRef.current) setRefreshing(false);
    }
  }, [refreshCatalogs, showNotice]);

  // Category helpers
  const handleAddCategory = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      const trimmed = newCategoryName.trim();
      if (!trimmed) return;
      if (categories.includes(trimmed)) {
        setNewCategoryName('');
        return;
      }
      setSavingCategory(true);
      try {
        await saveCategories([...categories, trimmed]);
        if (!mountedRef.current) return;
        setNewCategoryName('');
        showNotice('ok', `دسته‌بندی «${trimmed}» اضافه شد.`);
      } catch (err: any) {
        if (mountedRef.current) {
          showNotice('err', err instanceof Error ? err.message : 'خطا در افزودن دسته‌بندی');
        }
      } finally {
        if (mountedRef.current) setSavingCategory(false);
      }
    },
    [newCategoryName, categories, saveCategories, showNotice]
  );

  const handleRemoveCategory = useCallback(
    async (catName: string) => {
      setSavingCategory(true);
      try {
        await saveCategories(categories.filter((c) => c !== catName));
        if (!mountedRef.current) return;
        if (categoryFilter === catName) setCategoryFilter('ALL');
      } catch (err: any) {
        if (mountedRef.current) {
          showNotice('err', err instanceof Error ? err.message : 'خطا در حذف دسته‌بندی');
        }
      } finally {
        if (mountedRef.current) setSavingCategory(false);
      }
    },
    [categories, saveCategories, categoryFilter, showNotice]
  );

  // Start a fresh catalog in Builder
  const handleCreateNew = useCallback(() => {
    const fresh = createInitialDemoProject();
    fresh.id = `cat-${Date.now()}`;
    fresh.publishedId = undefined;
    fresh.name = 'کاتالوگ جدید محصولات';
    fresh.cover = {
      ...fresh.cover,
      title: 'کاتالوگ جدید محصولات',
      subtitle: 'معرفی محصولات و مشخصات فنی',
    };
    setProject(fresh);
    setLinkedCatalogId(undefined);
    setLinkedCatalogSlug(undefined);
    setSiteCategory(categories[0] || 'کاتالوگ دیجیتال محصول');
    setIsSitePublished(true);
    setBuilderTab('pages');
    setMobilePane('editor');
    setMode('builder');
  }, [categories]);

  // Edit existing catalog (uses bounded LRU cache in CatalogContext)
  const handleEditCatalog = useCallback(
    async (item: CatalogItem) => {
      setLoadingEditId(item.id);
      try {
        if (item.flipbookId) {
          const remote = await getFlipbookProject(item.flipbookId);
          if (!mountedRef.current) return;
          setProject(remote);
        } else {
          const base = createInitialDemoProject();
          const resolvedCover = resolveCatalogCoverImage(item.coverImage, item.id);
          setProject({
            ...base,
            id: `cat-${item.id}`,
            name: item.title,
            publishedId: undefined,
            cover: {
              ...base.cover,
              title: item.title,
              subtitle: item.description ? item.description.slice(0, 90) : base.cover.subtitle,
              frontCustomImageUrl: resolvedCover,
            },
            pages: resolvedCover
              ? [
                  {
                    id: `page-seed-${Date.now()}`,
                    fileName: 'cover-preview.jpg',
                    originalDataUrl: resolvedCover,
                    optimizedDataUrl: resolvedCover,
                    originalSizeBytes: 120000,
                    optimizedSizeBytes: 120000,
                    originalWidth: 1200,
                    originalHeight: 900,
                    width: 1200,
                    height: 900,
                    title: item.title,
                    description: item.description || 'معرفی و مشخصات محصول در کاتالوگ سایت',
                    category: item.category || 'کاتالوگ محصول',
                    tags: ['کاتالوگ', item.category].filter(Boolean),
                    aiStatus: 'idle',
                  },
                ]
              : [],
          });
        }
        if (!mountedRef.current) return;
        setLinkedCatalogId(item.id);
        setLinkedCatalogSlug(item.slug);
        setSiteCategory(item.category || categories[0] || 'کاتالوگ دیجیتال محصول');
        setIsSitePublished(item.isPublished !== false);
        setBuilderTab('pages');
        setMobilePane('editor');
        setMode('builder');
      } catch {
        if (mountedRef.current) {
          showNotice('err', 'بارگذاری اطلاعات این کاتالوگ از سرور ناموفق بود.');
        }
      } finally {
        if (mountedRef.current) setLoadingEditId(null);
      }
    },
    [getFlipbookProject, categories, showNotice]
  );

  // Instant 0ms optimistic Active / Inactive toggle
  const handleQuickToggleStatus = useCallback(
    async (item: CatalogItem) => {
      setTogglingId(item.id);
      const nextPublished = item.isPublished === false;
      try {
        const updated = await toggleCatalogStatus(item.id, {
          isPublished: nextPublished,
        });
        if (!mountedRef.current) return;
        showNotice(
          'ok',
          updated.isPublished
            ? `کاتالوگ «${updated.title}» به‌صورت آنی در سایت فعال شد.`
            : `کاتالوگ «${updated.title}» موقتاً غیرفعال شد و در سایت مخفی گردید.`
        );
      } catch (err: any) {
        if (mountedRef.current) {
          showNotice('err', err instanceof Error ? err.message : 'خطا در تغییر وضعیت نمایش');
        }
      } finally {
        if (mountedRef.current) setTogglingId(null);
      }
    },
    [toggleCatalogStatus, showNotice]
  );

  // Quick category reassignment directly on the card
  const handleQuickCategoryChange = useCallback(
    async (item: CatalogItem, nextCat: string) => {
      try {
        const updated = await toggleCatalogStatus(item.id, { category: nextCat });
        if (mountedRef.current) {
          showNotice('ok', `دسته‌بندی «${updated.title}» به «${nextCat}» تغییر یافت.`);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          showNotice('err', err instanceof Error ? err.message : 'خطا در تغییر دسته‌بندی');
        }
      }
    },
    [toggleCatalogStatus, showNotice]
  );

  const handleDeleteCatalog = useCallback(
    async (item: CatalogItem) => {
      try {
        await deleteCatalogItem(item.id, item.flipbookId);
        if (!mountedRef.current) return;
        setConfirmDeleteId(null);
        showNotice('ok', `کاتالوگ «${item.title}» با موفقیت حذف شد.`);
      } catch (err: any) {
        if (mountedRef.current) {
          showNotice('err', err instanceof Error ? err.message : 'خطا در حذف کاتالوگ');
        }
      }
    },
    [deleteCatalogItem, showNotice]
  );

  // Sync saved flipbook to site catalogs context & server
  const syncPublishedFlipbookToSiteCatalog = useCallback(
    async (publishedFlipbookId: string, currentProject: CatalogProject, publishFlag: boolean) => {
      const firstPageImg =
        currentProject.pages[0]?.optimizedDataUrl || currentProject.pages[0]?.originalDataUrl || undefined;
      const coverThumb = currentProject.cover.frontCustomImageUrl || firstPageImg;
      const title = (currentProject.cover.title || currentProject.name || 'کاتالوگ دیجیتال').trim();
      const catalogId = linkedCatalogId || `cat-fb-${publishedFlipbookId}`;
      const slug = linkedCatalogSlug || buildSlugFromTitle(title, `catalog-${publishedFlipbookId}`);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const embedUrl = `${origin}/embed/${encodeURIComponent(publishedFlipbookId)}`;
      const description =
        currentProject.cover.subtitle ||
        currentProject.pages
          .slice(0, 3)
          .map((p) => p.title)
          .filter(Boolean)
          .join(' · ') ||
        'کاتالوگ تعاملی محصول';

      const updatedProject: CatalogProject = {
        ...currentProject,
        publishedId: publishedFlipbookId,
      };
      cacheFlipbookProject(publishedFlipbookId, updatedProject);

      const savedCatalog = await saveCatalogItem({
        id: catalogId,
        slug,
        title,
        category: siteCategory || categories[0] || 'کاتالوگ دیجیتال محصول',
        description,
        coverImage: coverThumb,
        pageCount: currentProject.pages.length,
        flipbookId: publishedFlipbookId,
        coverTemplate: currentProject.cover.templateId,
        wordpressShortcode: `[digital_catalog url="${embedUrl}" height="680px"]`,
        isPublished: publishFlag,
        specs: {
          standardCode: '3D Interactive Flipbook · WebP',
          boardOptions: `${currentProject.pages.length.toLocaleString('fa-IR')} صفحه محصول بهینه‌شده`,
          finishOptions:
            currentProject.flipDirection === 'rtl' ? 'ورق‌زدن استاندارد فارسی (RTL)' : 'ورق‌زدن لاتین (LTR)',
          applications: currentProject.cover.brandName || 'کاتالوگ آنلاین سایت و وردپرس',
        },
      });

      if (siteCategory && !categories.includes(siteCategory)) {
        await saveCategories([...categories, siteCategory]).catch(() => categories);
      }

      if (mountedRef.current) {
        setLinkedCatalogId(savedCatalog.id);
        setLinkedCatalogSlug(savedCatalog.slug);
        setProject((prev) => ({ ...prev, publishedId: publishedFlipbookId }));
      }
      return savedCatalog;
    },
    [
      linkedCatalogId,
      linkedCatalogSlug,
      siteCategory,
      categories,
      cacheFlipbookProject,
      saveCatalogItem,
      saveCategories,
    ]
  );

  // Primary Save Action
  const handleSaveCatalogToSite = useCallback(async () => {
    if (savingCatalog) return;
    setSavingCatalog(true);
    try {
      const res = await publishProjectToServer(project);
      if (mountedRef.current) {
        setProject(res.project);
      }
      await syncPublishedFlipbookToSiteCatalog(res.id, res.project, isSitePublished);
      if (!mountedRef.current) return;
      showNotice(
        'ok',
        isSitePublished
          ? `کاتالوگ «${res.project.cover.title || res.project.name}» با موفقیت بهینه‌سازی، ذخیره و در سایت منتشر شد.`
          : `کاتالوگ «${res.project.cover.title || res.project.name}» ذخیره شد (در وضعیت غیرفعال موقت — مخفی از سایت).`
      );
    } catch (err: any) {
      if (mountedRef.current) {
        showNotice('err', err instanceof Error ? err.message : 'ذخیره کاتالوگ با خطا مواجه شد.');
      }
    } finally {
      if (mountedRef.current) setSavingCatalog(false);
    }
  }, [savingCatalog, project, syncPublishedFlipbookToSiteCatalog, isSitePublished, showNotice]);

  // Builder mutation handlers
  const handleAddPages = useCallback((newPages: CatalogPage[]) => {
    setProject((prev) => ({
      ...prev,
      pages: [...prev.pages, ...newPages],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleUpdatePage = useCallback((id: string, patch: Partial<CatalogPage>) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleRemovePage = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      pages: prev.pages.filter((p) => p.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleReorderPages = useCallback((fromIdx: number, toIdx: number) => {
    setProject((prev) => {
      if (toIdx < 0 || toIdx >= prev.pages.length || fromIdx === toIdx) return prev;
      const next = [...prev.pages];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return { ...prev, pages: next, updatedAt: new Date().toISOString() };
    });
  }, []);

  const handleChangeCover = useCallback((patch: Partial<CoverDesignConfig>) => {
    setProject((prev) => ({
      ...prev,
      name: patch.title !== undefined ? patch.title : prev.name,
      cover: { ...prev.cover, ...patch },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleChangeOptimization = useCallback((optimization: OptimizationSettings) => {
    setProject((prev) => ({
      ...prev,
      optimization,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleReplaceAllOptimizedPages = useCallback((pages: CatalogPage[]) => {
    setProject((prev) => ({
      ...prev,
      pages,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleFlipDirectionChange = useCallback((flipDirection: FlipDirection) => {
    setProject((prev) => ({
      ...prev,
      flipDirection,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleOrientationChange = useCallback((pageOrientation: PageOrientationMode) => {
    setProject((prev) => ({
      ...prev,
      pageOrientation,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const handleSaveInlineNewCategory = useCallback(async () => {
    const trimmed = inlineNewCatName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setSiteCategory(trimmed);
      setInlineNewCatName('');
      setShowInlineNewCat(false);
      return;
    }
    setSavingCategory(true);
    try {
      await saveCategories([...categories, trimmed]);
      if (!mountedRef.current) return;
      setSiteCategory(trimmed);
      setInlineNewCatName('');
      setShowInlineNewCat(false);
      showNotice('ok', `دسته‌بندی جدید «${trimmed}» ثبت و انتخاب شد.`);
    } catch (err: unknown) {
      if (mountedRef.current) {
        showNotice('err', err instanceof Error ? err.message : 'خطا در ثبت دسته‌بندی');
      }
    } finally {
      if (mountedRef.current) setSavingCategory(false);
    }
  }, [inlineNewCatName, categories, saveCategories, showNotice]);

  const handleSaveToBrowser = useCallback(() => {
    const res = saveNamedProjectToLocal(project);
    setSavedProjects(listSavedProjects());
    return res;
  }, [project]);

  const handleLoadSaved = useCallback((id: string) => {
    const loaded = loadSavedProjectById(id);
    if (loaded) {
      setProject(loaded);
      setBuilderTab('pages');
    }
  }, []);

  const handleDeleteSaved = useCallback((id: string) => {
    deleteSavedProjectById(id);
    setSavedProjects(listSavedProjects());
  }, []);

  const handleCopyEmbed = useCallback(async (flipbookId: string, title: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/embed/${encodeURIComponent(flipbookId)}`;
    const code = generateIframeEmbedCode(url, { height: '680px', title });
    try {
      await navigator.clipboard.writeText(code);
      if (!mountedRef.current) return;
      setCopiedId(flipbookId);
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) setCopiedId(null);
      }, 2000);
    } catch {
      // ignore clipboard errors
    }
  }, []);

  // Filtered catalogs + counts
  const counts = useMemo(() => {
    const active = catalogs.filter((c) => c.isPublished !== false).length;
    return {
      all: catalogs.length,
      active,
      inactive: catalogs.length - active,
    };
  }, [catalogs]);

  const filteredCatalogs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return catalogs.filter((c) => {
      const isPub = c.isPublished !== false;
      if (visibilityFilter === 'ACTIVE' && !isPub) return false;
      if (visibilityFilter === 'INACTIVE' && isPub) return false;
      if (categoryFilter !== 'ALL' && (c.category || '') !== categoryFilter) return false;
      if (q) {
        const hay = `${c.title} ${c.category || ''} ${c.description || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalogs, visibilityFilter, categoryFilter, searchQuery]);

  const builderCategoryOptions = useMemo(
    () => Array.from(new Set([...categories, siteCategory].filter(Boolean))),
    [categories, siteCategory]
  );

  // =========================================================================
  // BUILDER MODE
  // =========================================================================
  if (mode === 'builder') {
    const builderTabs: { id: BuilderTab; label: string; icon: React.ReactNode }[] = [
      { id: 'pages', label: '۱. تصاویر و متن صفحات', icon: <Layers className="w-4 h-4" /> },
      { id: 'cover', label: '۲. ظاهر جلد و جهت ورق‌زدن', icon: <BookOpen className="w-4 h-4" /> },
      { id: 'export', label: '۳. کد وردپرس و فایل پروژه', icon: <Share2 className="w-4 h-4" /> },
    ];

    return (
      <div className="space-y-4" dir="rtl">
        {bannerMsg && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
              bannerMsg.type === 'ok'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {bannerMsg.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{bannerMsg.text}</span>
            </div>
            <button type="button" onClick={() => setBannerMsg(null)} className="text-slate-300 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="bg-stone-100 text-stone-900 rounded-2xl border border-slate-700/70 shadow-xl overflow-hidden flex flex-col">
          {/* Essential Metadata Bar */}
          <div className="bg-white border-b border-stone-200 p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              <button
                type="button"
                onClick={() => setMode('list')}
                className="px-3 py-2 rounded-lg border border-stone-200 hover:border-stone-400 bg-stone-50 text-stone-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>بازگشت به لیست کاتالوگ‌ها</span>
              </button>

              <input
                type="text"
                value={project.cover.title}
                onChange={(e) => handleChangeCover({ title: e.target.value })}
                placeholder="نام / عنوان کاتالوگ..."
                className="flex-1 min-w-[200px] bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm font-bold text-stone-900 focus:outline-none focus:border-amber-500"
              />

              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={siteCategory}
                  onChange={(e) => setSiteCategory(e.target.value)}
                  aria-label="دسته‌بندی کاتالوگ"
                  className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:border-amber-500"
                >
                  {builderCategoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      دسته: {cat}
                    </option>
                  ))}
                </select>

                {showInlineNewCat ? (
                  <div className="flex items-center gap-1 bg-stone-50 border border-amber-400 rounded-lg p-1">
                    <input
                      type="text"
                      value={inlineNewCatName}
                      onChange={(e) => setInlineNewCatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSaveInlineNewCategory();
                        } else if (e.key === 'Escape') {
                          setShowInlineNewCat(false);
                          setInlineNewCatName('');
                        }
                      }}
                      placeholder="نام دسته جدید..."
                      autoFocus
                      className="w-36 bg-white border border-stone-200 rounded px-2 py-1 text-xs text-stone-900 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      disabled={savingCategory || !inlineNewCatName.trim()}
                      onClick={() => void handleSaveInlineNewCategory()}
                      className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-[11px] font-bold cursor-pointer"
                    >
                      ثبت
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowInlineNewCat(false);
                        setInlineNewCatName('');
                      }}
                      className="p-1 text-stone-500 hover:text-stone-900 cursor-pointer"
                      aria-label="انصراف"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowInlineNewCat(true)}
                    title="ثبت دسته‌بندی جدید برای سایت"
                    className="px-2.5 py-2 rounded-lg border border-stone-200 hover:border-amber-500 bg-stone-50 hover:bg-amber-50 text-stone-700 text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-amber-600" />
                    <span>+ دسته جدید</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsSitePublished((v) => !v)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  isSitePublished
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                    : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
                }`}
                title="تعیین اینکه این کاتالوگ الان در سایت نمایش داده شود یا موقتاً مخفی بماند"
              >
                {isSitePublished ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>نمایش در سایت: فعال</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                    <span>غیرفعال موقت (مخفی)</span>
                  </>
                )}
              </button>

              {showLivePreview && (
                <button
                  type="button"
                  onClick={() => setExpandPreview((v) => !v)}
                  className={`hidden lg:flex px-3 py-2 rounded-lg border text-xs font-bold items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                    expandPreview
                      ? 'bg-stone-900 border-stone-900 text-white'
                      : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                  }`}
                  title="گسترش پیش‌نمایش سه‌بعدی در کل عرض صفحه"
                >
                  {expandPreview ? (
                    <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  <span>{expandPreview ? 'بازگشت به ویرایشگر' : 'فضای بزرگ پیش‌نمایش'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowLivePreview((p) => !p);
                  if (showLivePreview) setExpandPreview(false);
                }}
                className="hidden lg:flex px-3 py-2 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>{showLivePreview ? 'مخفی‌کردن پیش‌نمایش' : 'نمایش پیش‌نمایش ۳D'}</span>
              </button>

              <button
                type="button"
                onClick={handleSaveCatalogToSite}
                disabled={savingCatalog}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
              >
                {savingCatalog ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>ذخیره و ثبت کاتالوگ</span>
              </button>
            </div>
          </div>

          {/* 3-Step Tab Bar */}
          <div className="bg-stone-50 border-b border-stone-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2">
              {builderTabs.map((tab) => {
                const active = builderTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setBuilderTab(tab.id);
                      if (expandPreview) setExpandPreview(false);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-stone-900 text-white shadow-sm'
                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-stone-500 tabular-nums whitespace-nowrap hidden sm:inline">
              {project.pages.length.toLocaleString('fa-IR')} صفحه آماده
            </span>
          </div>

          {/* Mobile Mode Switcher */}
          <div className="lg:hidden bg-white border-b border-stone-200 px-3 py-2">
            <div className="grid grid-cols-2 gap-1 p-1 bg-stone-100 rounded-lg">
              <button
                type="button"
                onClick={() => setMobilePane('editor')}
                className={`py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobilePane === 'editor' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>ویرایشگر کاتالوگ</span>
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('preview')}
                className={`py-1.5 rounded-md text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  mobilePane === 'preview' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-amber-600" />
                <span>پیش‌نمایش سه‌بعدی</span>
              </button>
            </div>
          </div>

          {/* Main Workspace */}
          <div className="flex flex-col lg:flex-row min-h-[640px] lg:h-[calc(100vh-200px)] lg:max-h-[860px]">
            {!expandPreview && (
              <aside
                className={`${
                  showLivePreview ? 'w-full lg:w-[410px] xl:w-[445px]' : 'w-full max-w-4xl mx-auto'
                } bg-stone-50 border-l border-stone-200 flex-col min-h-0 shrink-0 ${
                  mobilePane === 'editor' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
                  <Suspense fallback={<LazySectionLoader label="در حال بارگذاری ابزارهای ویرایش..." />}>
                    {builderTab === 'pages' && (
                      <>
                        <ImageUploaderPanel
                          pages={project.pages}
                          optimization={project.optimization}
                          onAddPages={handleAddPages}
                          onUpdatePage={handleUpdatePage}
                          onRemovePage={handleRemovePage}
                          onReorderPages={handleReorderPages}
                        />

                        <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setShowWebpSettings((s) => !s)}
                            className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-stone-800 hover:bg-stone-50 cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <Sliders className="w-4 h-4 text-amber-600" />
                              <span>تنظیمات فشرده‌سازی خودکار WebP (کاهش حجم وب)</span>
                            </span>
                            {showWebpSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          {showWebpSettings && (
                            <div className="p-4 border-t border-stone-100">
                              <WebOptimizerPanel
                                optimization={project.optimization}
                                pages={project.pages}
                                onChangeOptimization={handleChangeOptimization}
                                onReplaceAllOptimizedPages={handleReplaceAllOptimizedPages}
                              />
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {builderTab === 'cover' && (
                      <CoverDesignerPanel
                        cover={project.cover}
                        optimization={project.optimization}
                        pageOrientation={project.pageOrientation || 'auto'}
                        flipDirection={project.flipDirection}
                        onChangeCover={handleChangeCover}
                        onChangeOrientation={handleOrientationChange}
                        onChangeFlipDirection={handleFlipDirectionChange}
                      />
                    )}

                    {builderTab === 'export' && (
                      <WordpressExportPanel
                        project={project}
                        savedProjects={savedProjects}
                        onRenameProject={(name) => setProject((p) => ({ ...p, name }))}
                        onSaveProjectToBrowser={handleSaveToBrowser}
                        onLoadProjectFromBrowser={handleLoadSaved}
                        onDeleteProjectFromBrowser={handleDeleteSaved}
                        onImportProject={(imported) => {
                          setProject(imported);
                          setBuilderTab('pages');
                        }}
                        onProjectPublished={(publishedId, updatedProject) =>
                          setProject((p) => (updatedProject ? { ...updatedProject, publishedId } : { ...p, publishedId }))
                        }
                        onPublishToSite={async (publishedId, updatedProject) => {
                          await syncPublishedFlipbookToSiteCatalog(
                            publishedId,
                            updatedProject || project,
                            isSitePublished
                          );
                        }}
                      />
                    )}
                  </Suspense>
                </div>
              </aside>
            )}

            {showLivePreview && (
              <section
                aria-label="پیش‌نمایش زنده کاتالوگ سه‌بعدی"
                className={`flex-1 p-2.5 sm:p-4 min-h-[560px] lg:min-h-0 flex-col bg-stone-200/80 ${
                  mobilePane === 'preview' ? 'flex' : 'hidden lg:flex'
                }`}
              >
                <Suspense
                  fallback={
                    <div className="flex-1 rounded-2xl bg-[#12141a] text-stone-300 flex flex-col items-center justify-center gap-3 text-xs">
                      <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
                      <span>در حال آماده‌سازی نمایشگر سه‌بعدی...</span>
                    </div>
                  }
                >
                  <FlipbookViewer
                    project={deferredProject}
                    onFlipDirectionChange={handleFlipDirectionChange}
                    onOrientationChange={handleOrientationChange}
                  />
                </Suspense>
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // LIST MODE (Instant Context-Cached Catalog Publishing & Visibility Control)
  // =========================================================================
  const isInitialLoading = !hasLoadedAdmin && contextLoading;

  return (
    <div className="space-y-5" dir="rtl">
      {/* Top Bar */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-100">
            مدیریت و انتشار کاتالوگ‌های سایت
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            با سوییچ فعال/غیرفعال روی هر کاتالوگ، نمایش آن را در سایت به‌صورت آنی کنترل کنید (وضعیت کاتالوگ‌ها در حافظه پایدار ذخیره می‌ماند).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-3 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
            title="بروزرسانی فهرست از سرور"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>بروزرسانی</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCatManager((s) => !s)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <FolderPlus className="w-4 h-4 text-sky-400" />
            <span>مدیریت دسته‌بندی‌ها</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>ساخت کاتالوگ جدید</span>
          </button>
        </div>
      </div>

      {/* Status Notice */}
      {bannerMsg && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-3 ${
            bannerMsg.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{bannerMsg.text}</span>
          </div>
          <button type="button" onClick={() => setBannerMsg(null)} className="text-slate-300 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Inline Category Manager Drawer */}
      {showCatManager && (
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-slate-100">دسته‌بندی‌های کاتالوگ سایت</h3>
            <button
              type="button"
              onClick={() => setShowCatManager(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              بستن
            </button>
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="نام دسته‌بندی جدید (مثلاً: جعبه‌های صادراتی زعفران)..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={savingCategory || !newCategoryName.trim()}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 text-xs font-extrabold cursor-pointer whitespace-nowrap"
            >
              افزودن دسته
            </button>
          </form>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <div
                key={cat}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
              >
                <span>{cat}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(cat)}
                  className="text-slate-400 hover:text-rose-400 cursor-pointer"
                  title="حذف این دسته‌بندی"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visibility & Category Filter Strip */}
      <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL' as const, label: `همه (${counts.all.toLocaleString('fa-IR')})` },
            { id: 'ACTIVE' as const, label: `فعال در سایت (${counts.active.toLocaleString('fa-IR')})` },
            { id: 'INACTIVE' as const, label: `غیرفعال موقت (${counts.inactive.toLocaleString('fa-IR')})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setVisibilityFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                visibilityFilter === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="فیلتر دسته‌بندی"
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">همه دسته‌بندی‌ها</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <div className="relative flex-1 sm:w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی کاتالوگ..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pr-3 pl-9 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          </div>
        </div>
      </div>

      {/* Catalogs List */}
      {isInitialLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-40 rounded-2xl bg-slate-900/70 border border-slate-800" />
          ))}
        </div>
      ) : contextError && catalogs.length === 0 ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-4">
          <span>{contextError}</span>
          <button
            type="button"
            onClick={handleManualRefresh}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 font-bold cursor-pointer"
          >
            تلاش مجدد
          </button>
        </div>
      ) : filteredCatalogs.length === 0 ? (
        <div className="text-center py-12 px-6 bg-slate-950/40 border border-slate-800 rounded-2xl">
          <BookOpen className="w-10 h-10 text-amber-400/70 mx-auto mb-3" />
          <h3 className="text-sm font-extrabold text-slate-100 mb-1">
            کاتالوگی با این فیلتر یافت نشد
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            فیلتر وضعیت یا دسته‌بندی را تغییر دهید یا یک کاتالوگ جدید بسازید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filteredCatalogs.map((c) => (
            <CatalogAdminCard
              key={c.id}
              catalog={c}
              categories={categories}
              isEditingThis={loadingEditId === c.id}
              isToggling={togglingId === c.id}
              isConfirmingDel={confirmDeleteId === c.id}
              onToggleStatus={handleQuickToggleStatus}
              onCategoryChange={handleQuickCategoryChange}
              onEdit={handleEditCatalog}
              onPreview={setPreviewCatalogItem}
              onOpenEmbed={setEmbedModalItem}
              onRequestDelete={setConfirmDeleteId}
              onConfirmDelete={handleDeleteCatalog}
            />
          ))}
        </div>
      )}

      {/* Lazy-loaded In-Place Preview Modal */}
      {previewCatalogItem && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center text-white text-xs gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
              <span>در حال باز کردن پیش‌نمایش کاتالوگ...</span>
            </div>
          }
        >
          <CatalogSpreadModal
            catalog={previewCatalogItem}
            onClose={() => setPreviewCatalogItem(null)}
            onRequestInquiry={() => setPreviewCatalogItem(null)}
            onOpenDielineStudio={() => setPreviewCatalogItem(null)}
          />
        </Suspense>
      )}

      {/* Compact WordPress Embed Modal */}
      {embedModalItem?.flipbookId && (
        <div
          className="fixed inset-0 z-[130] bg-black/80 p-4 flex items-center justify-center"
          onClick={() => setEmbedModalItem(null)}
        >
          <div
            className="w-full max-w-xl bg-white text-stone-900 rounded-2xl p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <h3 className="text-sm font-extrabold">کد جاسازی وردپرس — {embedModalItem.title}</h3>
              <button
                type="button"
                onClick={() => setEmbedModalItem(null)}
                className="p-1 text-stone-500 hover:text-stone-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              کد زیر را کپی کرده و در برگه وردپرس داخل بلوک <strong>«HTML سفارشی»</strong> یا ویجت HTML المنتور قرار دهید:
            </p>

            <pre dir="ltr" className="p-3 rounded-xl bg-stone-900 text-stone-100 text-[11px] font-mono overflow-x-auto">
              {generateIframeEmbedCode(
                `${typeof window !== 'undefined' ? window.location.origin : ''}/embed/${encodeURIComponent(embedModalItem.flipbookId)}`,
                { height: '680px', title: embedModalItem.title }
              )}
            </pre>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleCopyEmbed(embedModalItem.flipbookId!, embedModalItem.title)}
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copiedId === embedModalItem.flipbookId ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedId === embedModalItem.flipbookId ? 'کپی شد' : 'کپی کد iFrame'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
