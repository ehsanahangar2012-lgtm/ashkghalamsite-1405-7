# Graph Report - applet  (2026-11-20)

## Corpus Check
- 162 files · ~285,440 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .css 2, .example 1)

## Summary
- 1457 nodes · 3175 edges · 75 communities (68 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3cf0fe39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- verify-dieline-engines.ts
- lucide-react
- Admin3DCatalogDashboard.tsx
- UIComponents.tsx
- dielineMath.ts
- App.tsx
- src/App.tsx
- env
- AdminPanel.tsx
- DielineGenerator.tsx
- package.json
- B2BERPModules.tsx
- imageOptimizer.ts
- AppView
- api.php
- CatalogSpreadModal.tsx
- technicalAuditor.ts
- devDependencies
- BackButton
- Dashboard.tsx
- ContentContext.tsx
- ThreeDProductSlider.tsx
- FlipbookViewer.tsx
- PacklyIndustrialDielineStudio.tsx
- Button
- server.ts
- localCmsStorage.ts
- flipbook.ts
- compilerOptions
- pack_release_zips.cjs
- geometryValidator.ts
- articleEngine.ts
- searchNotifier.ts
- src/types.ts
- 3d-board-caliper-regression.yml
- cms-storage-regression.yml
- dxf-scale-regression.yml
- typecheck.yml
- ThreeDPreview.tsx
- customDielineEngine.ts
- bump_version.cjs
- PageFlip
- InteractiveServicesSpace.tsx
- apiClient.ts
- main.tsx
- manifest.json
- AutoCADStudio.tsx
- scripts
- services/dielineExport.ts
- DesignStudio.tsx
- imageCache.ts
- flipbook.ts
- package.json
- AdminDielineAnalyzer.tsx
- sync_graphify.cjs
- DimensionAccuracyEvaluator.tsx
- AdminTabErrorBoundary
- DielineGenerator
- vite
- dimensionOptimizerService.ts
- firebase
- install_offline_studios.cjs
- DielineTemplatesCatalog.tsx
- packagingModels.ts
- BoxStudio.tsx
- catalogAiService.ts
- assertIntersectionFailsAudit
- normalizePersianNumbers
- packagingStandards.ts
- Snap-lock bottom reference comparison
- GEMINI.md
- Third-party notices
- drizzle-orm@^0.45.2

## God Nodes (most connected - your core abstractions)
1. `react` - 78 edges
2. `lucide-react` - 59 edges
3. `Button()` - 59 edges
4. `Card()` - 48 edges
5. `AppView` - 46 edges
6. `useContent()` - 45 edges
7. `AppContent()` - 39 edges
8. `BackButton()` - 39 edges
9. `DielineGenerator()` - 37 edges
10. `AdminPanel()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Generated-geometry validation (2026-10-23)` --references--> `runComprehensiveGeometryCheck()`  [INFERRED]
  docs/dieline-engine-research.md → src/services/geometryValidator.ts
- `AppContent()` --calls--> `CatalogItemPage()`  [EXTRACTED]
  App.tsx → src/components/catalog/CatalogItemPage.tsx
- `AppContent()` --calls--> `CatalogSection()`  [EXTRACTED]
  App.tsx → src/components/catalog/CatalogSection.tsx
- `injectSeoMetaIntoHtml()` --calls--> `loadPosts()`  [EXTRACTED]
  server.ts → agent/content/articleEngine.ts
- `startServer()` --calls--> `loadPosts()`  [EXTRACTED]
  server.ts → agent/content/articleEngine.ts

## Import Cycles
- None detected.

## Communities (75 total, 7 thin omitted)

### Community 0 - "verify-dieline-engines.ts"
Cohesion: 0.02
Nodes (105): autoLockDxf, autoLockPdf, autoLockRectangular, autoLockRectBottomPaths, autoLockRectBottomStarts, autoLockRectPanelStarts, autoLockRectSideDepth, autoLockRectSideShoulder (+97 more)

### Community 1 - "lucide-react"
Cohesion: 0.15
Nodes (17): lucide-react, AdminSoftwareManager(), Inquiry(), parseDimensionsCm(), parseQty(), DEFAULT_SLIDER_CONFIG, optimizeLogoImageToDataUrl(), SliderConfig (+9 more)

### Community 2 - "Admin3DCatalogDashboard.tsx"
Cohesion: 0.15
Nodes (23): AdminCatalogManager(), Admin3DCatalogDashboard(), BuilderTab, buildSlugFromTitle(), CatalogAdminCard, CatalogSpreadModal, CoverDesignerPanel, DashboardMode (+15 more)

### Community 3 - "UIComponents.tsx"
Cohesion: 0.15
Nodes (10): StandardDoc, standards, SiteSwitcherModal(), SiteSwitcherModalProps, BackButtonProps, BadgeProps, ButtonProps, CardProps (+2 more)

### Community 4 - "dielineMath.ts"
Cohesion: 0.05
Nodes (43): buildBleedRectPath(), crashLockEngine, createDrawerBoxEngine(), createRscEngine(), createTelescopicEngine(), createTelescopicTrayEngine(), DielineCalculationResult, DielineEngineeringMetrics (+35 more)

### Community 5 - "App.tsx"
Cohesion: 0.07
Nodes (8): App(), AppContent(), ChatWidget(), ContactFloaters(), Footer(), getHelpContent(), LatestBlogSection(), SmartPortfolio()

### Community 6 - "src/App.tsx"
Cohesion: 0.09
Nodes (39): AboutUs, AdminPanel, App(), AppContent(), AutoCADStudio, Blog, BoxStudio, CatalogItemPage (+31 more)

### Community 7 - "env"
Cohesion: 0.06
Nodes (34): AGENT_AUTO_PUBLISH, AGENT_INGEST_SECRET, GEMINI_API_KEY, GROQ_API_KEY, GSC_ACCESS_TOKEN, GSC_SITE_URL, INDEXNOW_KEY, OPENROUTER_API_KEY (+26 more)

### Community 8 - "AdminPanel.tsx"
Cohesion: 0.09
Nodes (34): react, ADMIN_TAB_CATEGORIES, AdminCatalogManager, AdminContentPagesManager, AdminDielineAnalyzer, AdminPanel(), AdminSoftwareManager, AdminStudioInstaller (+26 more)

### Community 9 - "DielineGenerator.tsx"
Cohesion: 0.08
Nodes (23): dielineMathCache, MACHINE_PRESETS, MATERIAL_PRESETS, PackagingMaterial, PackagingModel, PressMachine, PRODUCT_CATEGORIES, ProductCategoryOption (+15 more)

### Community 10 - "package.json"
Cohesion: 0.09
Nodes (23): dependencies, @aws-sdk/client-s3@^3.1062.0, @aws-sdk/s3-request-presigner@^3.1062.0, cheerio@^1.2.0, cors@^2.8.6, express@^5.2.1, framer-motion@^12.23.26, lucide-react@^0.562.0 (+15 more)

### Community 11 - "B2BERPModules.tsx"
Cohesion: 0.14
Nodes (32): framer-motion, AISystemAdvisor(), AuditLogItem, B2BContext, B2BEnterpriseProvider(), BpmNode, ContractsTab(), CrmTab() (+24 more)

### Community 12 - "imageOptimizer.ts"
Cohesion: 0.17
Nodes (28): ProductPageSheetProps, buildMetadataFromFileName(), ImageUploaderPanel(), ImageUploaderPanelProps, PageThumbImage(), DIMENSION_OPTIONS, WebOptimizerPanel(), WebOptimizerPanelProps (+20 more)

### Community 13 - "AppView"
Cohesion: 0.07
Nodes (30): EmergencyNotificationBarProps, SeoHeadProps, ThreeDProductSliderProps, AppView, ABOUT, ADMIN_PANEL, AI_CONTENT_FACTORY, AUTOCAD_STUDIO (+22 more)

### Community 14 - "api.php"
Cohesion: 0.07
Nodes (18): buildCleanStudioIndexHtml(), buildStudioStatusPayload(), collectMediaAssets(), decodeDataUrlImage(), detectImageExtension(), detectImageFromBinary(), ensureUploadDir(), extractAndFinalizeStudioZip() (+10 more)

### Community 15 - "CatalogSpreadModal.tsx"
Cohesion: 0.18
Nodes (22): CatalogAdminCardProps, CatalogItemPage(), FlipbookViewer, CatalogCoverThumb, CatalogSection(), CatalogSpreadModal(), CatalogSpreadModalProps, CatalogTechnicalDossier (+14 more)

### Community 16 - "technicalAuditor.ts"
Cohesion: 0.17
Nodes (17): AGENT_CONFIG, __dirname, __filename, ROOT_DIR, buildSitemapAndRobots(), escapeXml(), SitemapUrl, runTechnicalSeoAudit() (+9 more)

### Community 17 - "devDependencies"
Cohesion: 0.10
Nodes (21): devDependencies, autoprefixer@^10.4.20, esbuild@^0.25.0, postcss@^8.4.49, tailwindcss@^4.0.0, tsx@^4.19.2, @types/express@^5.0.0, @types/node@^22.0.0 (+13 more)

### Community 18 - "BackButton"
Cohesion: 0.35
Nodes (13): react-router-dom, SmartPortfolio(), AboutUs(), Blog(), CustomPageView(), NotFound(), ProductsHub(), SeoHead() (+5 more)

### Community 19 - "Dashboard.tsx"
Cohesion: 0.13
Nodes (21): KanbanProps, DashboardProps, OrderTimeline(), SHAMSI_MONTHS, StoredInquiryRow, Login(), LoginProps, PacklyIndustrialDielineStudioProps (+13 more)

### Community 20 - "ContentContext.tsx"
Cohesion: 0.11
Nodes (21): ContentContext, ContentProvider(), DEFAULT_MANAGED_PRODUCTS, DEFAULT_MANAGED_SERVICES, defaultBlogPosts, defaultEmergencyConfig, defaultGlobalSettings, defaultPortfolioItems (+13 more)

### Community 21 - "ThreeDProductSlider.tsx"
Cohesion: 0.12
Nodes (26): BOARD_MATERIALS, createBrushedFoilMaps(), createContactShadowTexture(), createCustomColorLogoTexture(), createFoilArtworkTexture(), createHeroBoardMaps(), createStudioFloorTexture(), drawDefaultFoilFrameAndText() (+18 more)

### Community 22 - "FlipbookViewer.tsx"
Cohesion: 0.24
Nodes (14): BookCoverRenderer, BookSheet, ColophonSheet, FlipbookViewer(), InspectedLightboxImage(), ProductPageSheet, extractUploadsRelativePath(), getUploadFallbackCandidates() (+6 more)

### Community 23 - "PacklyIndustrialDielineStudio.tsx"
Cohesion: 0.14
Nodes (18): PacklyIndustrialDielineStudio(), STUDIO_MATERIALS, STUDIO_MODELS, STUDIO_SHEETS, calculateDielineParameters(), calculateGangingLayout(), GangingItemInput, GangingLayoutResult (+10 more)

### Community 24 - "Button"
Cohesion: 0.15
Nodes (33): AdminContentPagesManager(), EMPTY_PAGE, EMPTY_PRODUCT, EMPTY_SERVICE, ICON_OPTIONS, ManagerSubTab, TemplateAndDataControl(), BlogManager() (+25 more)

### Community 25 - "server.ts"
Cohesion: 0.10
Nodes (20): CATALOGS_FILE, detectImageFromBuffer(), __dirname, escapeHtmlAttr(), __filename, FLIPBOOK_UPLOADS_DIR, FLIPBOOKS_FILE, getServerGemini() (+12 more)

### Community 26 - "localCmsStorage.ts"
Cohesion: 0.19
Nodes (11): fallback, restored, saved, storageMock, values, deleteLocalCmsAsset(), LocalCmsAsset, openAssetDatabase() (+3 more)

### Community 27 - "flipbook.ts"
Cohesion: 0.26
Nodes (11): BookCoverRendererProps, COLOR_PRESETS, CoverDesignerPanel(), CoverDesignerPanelProps, CoverPreviewImg(), FlipbookViewerProps, dataUrlToBlob(), uploadImageAssetToServer() (+3 more)

### Community 28 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, jsx, lib (+10 more)

### Community 29 - "pack_release_zips.cjs"
Cohesion: 0.11
Nodes (17): AdmZip, apiPhpSrc, distDir, distDownloadsDir, downloadsDir, fs, jsonStores, legacyPublicZip (+9 more)

### Community 30 - "geometryValidator.ts"
Cohesion: 0.08
Nodes (31): 2D preview readability and export gating, Active dieline page and FEFCO 0200-family correction (2026-10-23), Auto-Lock rebuild and benchmark (2026-10-24), Cross-path geometry corrections (2026-10-23), Dieline engine research notes, Engineering decisions, FEFCO 0200-series geometry review (2026-10-23), Generated-geometry validation (2026-10-23) (+23 more)

### Community 31 - "articleEngine.ts"
Cohesion: 0.27
Nodes (12): buildDeterministicFallbackDraft(), buildManualPromptPack(), generateArticleViaWorker(), loadCatalogSummaries(), loadPosts(), RawArticleDraft, savePosts(), validateAndPackageDraft() (+4 more)

### Community 32 - "searchNotifier.ts"
Cohesion: 0.19
Nodes (14): callGeminiServerSide(), callOpenAiCompatibleFree(), extractJsonString(), generateJsonWithFreeRouter(), getGeminiClient(), LlmMessage, limiter, notifySearchEngines() (+6 more)

### Community 33 - "src/types.ts"
Cohesion: 0.09
Nodes (29): MediaAssetEditModalProps, ContentContextType, AdminConfig, BlogPost, CustomPageItem, DielineConfig, EmergencyBannerConfig, EmergencyConfig (+21 more)

### Community 34 - "3d-board-caliper-regression.yml"
Cohesion: 0.12
Nodes (16): name, runs-on, steps, jobs, board-caliper-regression, name, on, push (+8 more)

### Community 35 - "cms-storage-regression.yml"
Cohesion: 0.12
Nodes (16): name, runs-on, steps, jobs, cms-storage-regression, name, on, push (+8 more)

### Community 36 - "dxf-scale-regression.yml"
Cohesion: 0.12
Nodes (16): name, runs-on, steps, jobs, dxf-scale-regression, name, on, push (+8 more)

### Community 37 - "typecheck.yml"
Cohesion: 0.12
Nodes (16): jobs, typecheck, name, on, push, workflow_dispatch, permissions, contents (+8 more)

### Community 38 - "ThreeDPreview.tsx"
Cohesion: 0.15
Nodes (15): cases, createSpecialEffectOverlayTexture(), createSurfacePBRMaps(), PACKAGING_SURFACE_PRESETS, SurfacePBRMaps, SurfacePresetId, disposePbrMaps(), FlapDirections (+7 more)

### Community 39 - "customDielineEngine.ts"
Cohesion: 0.18
Nodes (14): entities, fixture, imported, analyzeTopology(), clusterSortedCoords(), CustomDielineTemplate, DxfEntity, dxfPairs() (+6 more)

### Community 40 - "bump_version.cjs"
Cohesion: 0.17
Nodes (8): curFa, fs, nextFa, nextVersion, path, pkg, pkgPath, rootDir

### Community 41 - "PageFlip"
Cohesion: 0.12
Nodes (4): page-flip, PageFlip, PageFlipSettings, react-pageflip

### Community 42 - "InteractiveServicesSpace.tsx"
Cohesion: 0.31
Nodes (7): buildFluteWaveGeometry(), createServiceArtifact(), detectSoftwareWebGL(), InteractiveServicesSpace(), ServiceArtifactId, ServiceItem, SERVICES

### Community 43 - "apiClient.ts"
Cohesion: 0.16
Nodes (19): AdminStudioInstaller(), STUDIO_ACCENT, StudioCapabilities, StudioItemStatus, StudioStatusResponse, DownloadReleasePage(), DownloadReleasePageProps, ReleaseData (+11 more)

### Community 44 - "main.tsx"
Cohesion: 0.17
Nodes (10): @fontsource/vazirmatn@^5.0.0, react-dom@^18.3.1, @fontsource/vazirmatn, react-dom, detectCompactOrTouchViewport(), Popover(), PopoverProps, PopoverTriggerProps (+2 more)

### Community 45 - "manifest.json"
Cohesion: 0.15
Nodes (12): background_color, categories, description, dir, display, icons, lang, name (+4 more)

### Community 46 - "AutoCADStudio.tsx"
Cohesion: 0.36
Nodes (8): AutoCADStudio(), calculateExtents(), Entity, flattenDXF(), Point, PropInput(), ToolButton(), transformEntity()

### Community 47 - "scripts"
Cohesion: 0.11
Nodes (19): scripts, build, build:worker, dev, graphify:benchmark, graphify:tree, graphify:update, graphify:watch (+11 more)

### Community 48 - "services/dielineExport.ts"
Cohesion: 0.29
Nodes (10): expectedDxfLineCount, buildDielineDxfExport(), buildDielinePdfExport(), buildDielineSvgExport(), DielineSvgExportOptions, DxfLineSegment, escapeXml(), format() (+2 more)

### Community 49 - "DesignStudio.tsx"
Cohesion: 0.22
Nodes (7): DesignStudio(), DesignStudioProps, DesignTemplate, OFFLINE_ENGINES, OfflineEngineMeta, StudioMode, generateAIPattern()

### Community 50 - "imageCache.ts"
Cohesion: 0.36
Nodes (8): createSvgPlaceholder(), getCachedBlob(), getDB(), getSafeImageUrl(), pageImageCache, prefetchAndCache(), prefetchCatalogPages(), saveBlobToCache()

### Community 51 - "flipbook.ts"
Cohesion: 0.22
Nodes (15): ColophonSheetProps, WordpressExportPanel(), WordpressExportPanelProps, COVER_TEMPLATES, CoverTemplatePreset, parseProjectFromJsonFile(), AiAnalysisStatus, CatalogProject (+7 more)

### Community 52 - "package.json"
Cohesion: 0.12
Nodes (16): dxf-parser@^1.1.2, @google/genai@^3.3.0, jspdf@^4.2.0, node-cron@^4.6.0, @react-three/drei@^10.7.7, @types/node-cron@^3.0.11, name, private (+8 more)

### Community 53 - "AdminDielineAnalyzer.tsx"
Cohesion: 0.14
Nodes (11): AdminDielineAnalyzer(), DXFEntity, FORMAT_COMPARISONS, FormatComparison, KeyPoint, PATTERN_PRESETS, StandardPattern, PatternLearningEngine (+3 more)

### Community 54 - "sync_graphify.cjs"
Cohesion: 0.33
Nodes (4): env, { execSync }, path, rootDir

### Community 55 - "DimensionAccuracyEvaluator.tsx"
Cohesion: 0.50
Nodes (6): DimensionAccuracyEvaluator(), DimensionAccuracyEvaluatorProps, AccuracyIssueSuggestion, DimensionAccuracyInput, DimensionAccuracyReport, evaluateDimensionAccuracy()

### Community 57 - "DielineGenerator"
Cohesion: 0.16
Nodes (8): BoundingBoxPreview(), BoundingBoxPreviewProps, CanvasRulers(), CanvasRulersProps, CollapsiblePanel(), DielineGenerator(), ParamOverrideInput(), PackagingStandardsService

### Community 58 - "vite"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.3, vite@^6.0.0, @vitejs/plugin-react@^4.3.4, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 59 - "dimensionOptimizerService.ts"
Cohesion: 0.38
Nodes (6): calculateNestingYield(), DimensionSuggestionOption, estimateDielineSpread(), generateSheetOptimizedDimensions(), OptimizeSheetYieldParams, SheetDimension

### Community 60 - "firebase"
Cohesion: 0.33
Nodes (5): firebase@^12.15.0, firebase, auth, db, firebaseConfig

### Community 61 - "install_offline_studios.cjs"
Cohesion: 0.16
Nodes (12): adm-zip@^0.5.17, adm-zip, AdmZip, downloadToBuffer(), force, fs, https, installStudio() (+4 more)

### Community 62 - "DielineTemplatesCatalog.tsx"
Cohesion: 0.23
Nodes (9): DielineTemplatesCatalog(), DielineTemplatesCatalogProps, AdvancedPhysicalValidationResult, MaterialPhysicalLimits, StandardRule, STANDARDS_METADATA, validateStandardConstraints(), CadDimensions (+1 more)

### Community 63 - "packagingModels.ts"
Cohesion: 0.16
Nodes (11): three@^0.185.1, three, ArticulatedPanel, buildPackagingAssembly(), createTaperedPanelGeometry(), easeInOutCubic(), PACKAGING_MODELS, PackagingAssemblyResult (+3 more)

### Community 64 - "BoxStudio.tsx"
Cohesion: 0.36
Nodes (7): BoxStudio(), BoxTemplate, clamp(), downloadFile(), Geometry, makeGeometry(), Segment

### Community 65 - "catalogAiService.ts"
Cohesion: 0.67
Nodes (3): analyzeProductImageWithGemini(), fallbackOfflineAnalyze(), ImageAnalysisResult

### Community 69 - "normalizePersianNumbers"
Cohesion: 0.43
Nodes (5): DimensionInput(), DimensionInputProps, cleanPersianNumberString(), formatNumberForInput(), normalizePersianNumbers()

### Community 70 - "packagingStandards.ts"
Cohesion: 0.33
Nodes (5): BottomLockAnalysis, PaperGrainAnalysis, StructuralDiagnosticItem, StructuralDiagnosticParams, StructuralWarning

### Community 71 - "Snap-lock bottom reference comparison"
Cohesion: 0.40
Nodes (4): Changes made in this branch, Evidence and remaining verification, Reference, Snap-lock bottom reference comparison

## Knowledge Gaps
- **33 isolated node(s):** `GUEST`, `SMB`, `ENTERPRISE`, `ADMIN`, `LITHO_OPERATOR` (+28 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 657 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `AdminPanel.tsx` to `lucide-react`, `Admin3DCatalogDashboard.tsx`, `UIComponents.tsx`, `App.tsx`, `src/App.tsx`, `DielineGenerator.tsx`, `package.json`, `B2BERPModules.tsx`, `imageOptimizer.ts`, `CatalogSpreadModal.tsx`, `BackButton`, `Dashboard.tsx`, `ContentContext.tsx`, `ThreeDProductSlider.tsx`, `FlipbookViewer.tsx`, `PacklyIndustrialDielineStudio.tsx`, `Button`, `flipbook.ts`, `ThreeDPreview.tsx`, `PageFlip`, `InteractiveServicesSpace.tsx`, `apiClient.ts`, `main.tsx`, `AutoCADStudio.tsx`, `DesignStudio.tsx`, `flipbook.ts`, `package.json`, `AdminDielineAnalyzer.tsx`, `DimensionAccuracyEvaluator.tsx`, `DielineGenerator`, `DielineTemplatesCatalog.tsx`, `BoxStudio.tsx`, `normalizePersianNumbers`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **What connects `GUEST`, `SMB`, `ENTERPRISE` to the rest of the system?**
  _33 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `verify-dieline-engines.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.01834862385321101 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `lucide-react` to `Admin3DCatalogDashboard.tsx`, `UIComponents.tsx`, `App.tsx`, `src/App.tsx`, `AdminPanel.tsx`, `DielineGenerator.tsx`, `package.json`, `B2BERPModules.tsx`, `imageOptimizer.ts`, `CatalogSpreadModal.tsx`, `BackButton`, `Dashboard.tsx`, `ThreeDProductSlider.tsx`, `FlipbookViewer.tsx`, `PacklyIndustrialDielineStudio.tsx`, `Button`, `flipbook.ts`, `ThreeDPreview.tsx`, `InteractiveServicesSpace.tsx`, `apiClient.ts`, `main.tsx`, `AutoCADStudio.tsx`, `DesignStudio.tsx`, `flipbook.ts`, `package.json`, `AdminDielineAnalyzer.tsx`, `DimensionAccuracyEvaluator.tsx`, `DielineTemplatesCatalog.tsx`, `BoxStudio.tsx`, `normalizePersianNumbers`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Should `dielineMath.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05297532656023222 - nodes in this community are weakly interconnected._
- **Why does `@google/genai` connect `package.json` to `searchNotifier.ts`, `server.ts`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._