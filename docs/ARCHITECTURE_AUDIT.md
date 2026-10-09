# Architectural Audit Package

This document contains a complete technical architecture audit of the Enterprise DXP, ERP, CAD, and Headless CMS platform for Ashk-Ghalam.

## 1. Complete Project Tree
```
/
├── App.tsx                     # Main React application entry & routing
├── index.html                  # HTML template
├── index.tsx                   # React DOM render entry
├── index.css                   # Global Tailwind CSS entry
├── server.ts                   # Express & Vite Monolithic Server
├── package.json                # Dependencies and build scripts
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── drizzle.config.ts           # Drizzle ORM configuration
├── metadata.json               # Project capability metadata
├── fake-fetch.ts               # Offline/mock utility overlay
├── types.ts                    # Global TypeScript interfaces & enums
├── backups/                    # Server-side backup payloads and media restore points
├── uploads/                    # Server-side storage for dynamic DAM media
├── db/                         # Database Configurations
│   └── schema.ts               # Drizzle PostgreSQL schema
├── contexts/                   # React Context Providers
│   ├── AuthContext.tsx         # Authentication & RBAC State
│   └── ContentContext.tsx      # Global Content, Settings & CMS State
├── hooks/                      # Custom React Hooks
│   ├── useNetworkCheck.ts      # Offline/online connection monitor
│   └── usePersianNumberInput.ts# Utilities for RTL local number parsing
├── services/                   # Core Business Logic & External Handlers
│   ├── authService.ts          # Authentication business logic
│   ├── dielineMath.ts          # CAD geometry & die-cut computation algorithms
│   ├── geminiService.ts        # Google Gemini AI Integration Engine
│   ├── geometryValidator.ts    # Bounding box & fold logic validator
│   ├── impositionService.ts    # Lithography sheet imposition calculator
│   ├── materialCompensationEngine.ts # Cardboard thickness compensation
│   ├── numberUtils.ts          # Persian/English numeric conversions
│   ├── pricingService.ts       # Live B2B pricing & costing algorithms
│   ├── standardsEngine.ts      # FEFCO / ECMA packaging standards logic
│   └── structuralValidation.ts # 3D collision & physical constraint validation
├── components/                 # UI View Components and Widgets
│   ├── AdminPanel.tsx          # Master Control Dashboard Router
│   ├── AdminTools.tsx          # Admin control sub-panels
│   ├── B2BERPModules.tsx       # B2B ERP Sub-modules
│   ├── B2BSuite.tsx            # Treasury & Ledger App
│   ├── BackupManager.tsx       # Backup & Continuity UI
│   ├── Blog.tsx                # Blog rendering
│   ├── CanvasRulers.tsx        # CAD 2D Ruler implementation
│   ├── Dashboard.tsx           # User workspace dashboard
│   ├── DesignStudio.tsx        # 2D WebGL/Canvas Design Tool
│   ├── DielineGenerator.tsx    # CAD Dieline parameters & generation
│   ├── DockableWindow.tsx      # CAD floating layout engine
│   ├── FileAnalyzer.tsx        # Pre-flight document check UI
│   ├── Flipbook.tsx            # 3D interactive portfolio
│   ├── FloatingCadWindows.tsx  # Multi-window CAD layout manager
│   ├── Inquiry.tsx             # Quote & Order Intake flow
│   ├── LayerManager.tsx        # 2D Design Layer timeline
│   ├── Login.tsx               # Authentication Screen
│   ├── MiniMap.tsx             # 2D CAD Navigation Minimap
│   ├── NumericFormatInput.tsx  # Financial currency input
│   ├── PropertyInspector.tsx   # CAD context-sensitive properties
│   ├── SEODashboard.tsx        # Marketing analytics dashboard
│   ├── SeoHead.tsx             # Dynamic Document Head injection
│   ├── StandardsEnginePanel.tsx# ECMA/FEFCO selection UI
│   ├── TeamManagementPanel.tsx # RBAC User administration UI
│   ├── ThreeDPreview.tsx       # Three.js 3D Fold Visualization
│   ├── ToastNotificationCenter.tsx # Global notification UI
│   └── UIComponents.tsx        # Core atomic design system (Buttons, Cards, Badges)
├── cms/                        # Legacy CMS & Admin
│   ├── AIContentFactory.tsx    # AI Batch Generation UI
│   ├── CMSDashboard.tsx        # Legacy Content Dashboard
│   ├── EnterpriseDAM.tsx       # Legacy Asset Manager UI
│   ├── ProgrammaticSEO.tsx     # Legacy Programmatic SEO Rule Builder
│   └── ai-assistant.ts         # Editor AI plugin logic
├── dxp/                        # Enterprise Digital Experience Platform (V2)
│   ├── ContentOS.tsx           # Omnichannel Headless Delivery UI
│   ├── EnterpriseDam.tsx       # V2 Orchestrated DAM view
│   ├── NexusDXP.tsx            # Unified DXP Navigation core
│   ├── ProgrammaticHub.tsx     # V2 Semantic mapping view
│   └── SeoIntelligence.tsx     # V2 Technical audit interface
└── Documentation/              # Core Specifications
    ├── PACKAGING_CAD_ENGINEERING_SPECIFICATION.md
    ├── PHASE_22_ENTERPRISE_ERP_BLUEPRINT.md
    ├── PHASE_23_ENTERPRISE_ERP_CORE.md
    ├── PHASE_24_ADVANCED_MONOLITH_ARCHITECTURE.md
    └── PHASE_25_ENTERPRISE_DR_SPECIFICATION.md
```

## 2. Route Tree
Navigated dynamically via `App.tsx` global state (`currentView`).

- **Public Routes:**
  - `HOME`: Landing page & Hero section
  - `INQUIRY`: Lead generation & pricing quotes
  - `CATALOG`: Static product catalog
  - `PORTFOLIO`: Interactive Smart Portfolio with visual analysis
  - `SERVICES`: Company offerings
  - `BLOG`: Content publishing viewing
  - `LOGIN`: Single Sign-On Gateway

- **Authenticated / Customer Routes:**
  - `DASHBOARD`: Customer orders, balances, & profiles
  - `DIELINE_GENERATOR`: CAD Parameterized Dieline App
  - `DESIGN_STUDIO`: Web 2D graphic design overlay
  - `SUPPORT`: Ticketing system

- **Admin / Enterprise Routes (RBAC Enforced):**
  - `ADMIN_PANEL`: Root layout for ERP/Admin tools
    - `dashboard`: KPI overview
    - `orders`: Kanban board
    - `b2b_suite`: Account & Khazaneh (ERP)
    - `team_accounts`: Access management
    - `formula`: Costing matrices
    - `simulator`: Lithographic Optimization
    - `backup`: Continuity Control
    - `settings`: Global configurations
  - `ENTERPRISE_DXP`: Next-Gen Marketing Control (Nexus DXP)
    - `overview`: Marketing KPIs
    - `content`: Content OS (Headless CMS)
    - `dam`: Enterprise DAM
    - `seo`: SEO Intelligence Hub
    - `programmatic`: Programmatic Keyword Engine

## 3. Component Tree

```
<App>
  ├─ <SeoHead>
  ├─ Navigation Bar (Desktop & Mobile)
  ├─ [Main View Routing]
  │  ├─ <Home> (Hero, Catalog)
  │  ├─ <Inquiry>
  │  ├─ <SmartPortfolio>
  │  ├─ <Flipbook>
  │  ├─ <DielineGenerator>
  │  ├─ <DesignStudio>
  │  │   └─ <CanvasRulers>, <LayerManager>, <PropertyInspector>, <FloatingCadWindows>
  │  ├─ <Dashboard>  (User Portal)
  │  ├─ <B2BSuite>   (ERP Module)
  │  ├─ <AdminPanel>
  │  │   └─ <TeamManagementPanel>, <BackupManager>, <GlobalSettingsPanel>, <NexusDXP>
  │  └─ <NexusDXP> 
  │      └─ <ContentOS>, <EnterpriseDam>, <SeoIntelligence>, <ProgrammaticHub>
  └─ Footer
```

## 4. Context Tree

The application utilizes React Context for globally accessible, non-prop-drilled state management.

1. **`AuthProvider`** (`contexts/AuthContext.tsx`)
   - Manages current user session (`user`).
   - Handles login, logout, registration flows.
   - Computes permission levels via `hasPermission(permissionString)`.
   - Protects role-based UI rendering.

2. **`ContentProvider`** (`contexts/ContentContext.tsx`)
   - Manages global UI references (blog posts, product lists, pricing settings).
   - Abstracts local component API calls via global dispatch handles.
   - Manages `globalSettings` (site branding, colors, configuration).
   - Coordinates file uploads.

## 5. Hook Tree

- `useAuth()`: Consumes `AuthContext` to expose `user`, `login()`, `logout()`, `hasPermission()`.
- `useContent()`: Consumes `ContentContext` for data stores and dispatch actions.
- `useNetworkCheck()`: A passive browser diagnostic checking `navigator.onLine` and pinging `/api/health` to expose network state to the UI.
- `usePersianNumberInput()`: Specialized Hook intercepting keyboard inputs to sanitize and format Persian numerical input seamlessly.

## 6. Service Tree

Stored in `/services`, decoupled from React component lifecycle:

- **AI/LLM**: `geminiService.ts` handles multimodal AI workflows (chat support, style parsing).
- **Core CAD Engines**:
  - `dielineMath.ts`: Geometry path execution (SVG plotting calculations).
  - `geometryValidator.ts`: Collision logic and planar validation.
  - `materialCompensationEngine.ts`: Algorithm for outer-dimension compensation relative to flute thickness.
  - `structuralValidation.ts`: Validates weight load and dimensional stability.
  - `standardsEngine.ts`: Standard repository (FEFCO, ECMA patterns).
- **Manufacturing / Print Prep**:
  - `impositionService.ts`: "Zinc" & "Sheet" layout packing optimization algorithms.
- **Financial Orchestration**:
  - `pricingService.ts`: Real-time material and cost-center estimation engine.
- **Utilities**:
  - `authService.ts`: Network adapter for authentication APIs.
  - `numberUtils.ts`: Sanitization rules for string-to-RTL math safely.

## 7. API Endpoints

Defined in `/server.ts` monolith backend using Express router:

- **Health Checks**
  - `GET /api/health` -> Ping response.

- **DAM / File Storage**
  - `POST /api/upload` -> Mutler diskStorage upload logic.
  - `GET /api/files` -> Reads local `uploads/` directory mapped to public path.
  - `DELETE /api/files/:filename` -> Physical deletion.

- **Business Continuity & Backups**
  - `POST /api/backup/save` -> Saves DB payload + Base64 packs `uploads/` dir.
  - `POST /api/backup/export` -> Compiles a downloadable unified system package.
  - `POST /api/backup/import` -> Hydrates DB and unpacks Base64 binaries back to `uploads/`.
  - `GET /api/backup/list` -> Catalogs `./backups/`.
  - `GET /api/backup/download/:filename` -> Downloads a pre-compiled JSON blob.
  - `DELETE /api/backup/:filename` -> Purges snapshot.

- **System Patches (Update Engine)**
  - `POST /api/update/upload` -> Analyzes ZIP update bundles.
  - `POST /api/update/apply` -> Automates physical file overwrites while creating rollback snapshots.
  - `POST /api/update/rollback` -> Emergency rollback from `pre_update_restore` points.

- **Headless CMS APIs (Stubs)**
  - `GET /api/cms/content-types`
  - `GET /api/cms/entries/:contentType`
  - `POST /api/cms/entries/:contentType`
  - `POST /api/cms/ai/seo`
  - `POST /api/cms/ai/factory`

## 8. Database Schema

Managed via Drizzle ORM (`db/schema.ts`) for PostgreSQL compatibility. Extracted Tables:

1. **`users`**: IAM User accounts, roles, access statuses.
2. **`media`**: Enterprise DAM source-of-truth. Links canonical URLs, optimized versions, SEO tagging, OCR contents, ownership.
3. **`content_types`**: Metaprogramming definition for headless structure inputs.
4. **`categories`** & **`tags`**: Relational taxonomy maps.
5. **`content_entries`**: Polyglot entity table for all dynamic CMS objects.
6. **`content_revisions`**: Audit logging & content rollback state mapping.
7. **Junction Entities**: `content_categories`, `content_tags`.

## 9. Dependency Graph

Core System Libraries (from `package.json`):

- **Backend Runtime**: `node`, `express`, `cors`, `multer`.
- **Database**: `pg` (PostgreSQL Driver), `drizzle-orm` (Typescript ORM).
- **Core Frontend**: `react`, `react-dom`, `framer-motion` (Declarative UI Animation).
- **Styling**: `tailwindcss`, `@tailwindcss/vite`, `lucide-react` (Icons).
- **CAD & 3D Engineering**: `three` (WebGL WebGL renderer), `jspdf` (Export).
- **Machine Learning / AI**: `@google/genai` (Gemini model API interface).
- **Data Visualization**: `recharts`.
- **Archive Management**: `adm-zip` (ZIP system patching manipulation).
- **Build Ecosystem**: `vite`, `esbuild`, `tsx`.

## 10. State Management Flow

- **Local UI State**: `useState` / `useReducer` for micro-interactions (e.g. modal open).
- **Domain State**: `useContext` abstractions (`AuthContext`, `ContentContext`) handle memory cache for configuration and authentication.
- **Persistent State**: LocalStorage is used for stateless authentication restoration; Backend (PostgreSQL mapping + FileSystem) holds source of truth.
- **Inter-Window State**: Dockable CAD Windows communicate via parent-level references inside `DesignStudio`.

## 11. Authentication Flow

1. User executes `login(username, password)`.
2. Flow routed to `AuthContext` which hits `authService.ts`.
3. Validation checks segment roles (e.g., `ADMIN`, `SMB`, `ACCOUNTANT`).
4. Current role propagates downwards; `App.tsx` triggers conditional rendering blocking unauthenticated paths.
5. Internal tabs inside Dashboards leverage `hasPermission()` RBAC functions directly.

## 12. CMS Architecture

- **Evolution**: Refactored from legacy `cms/` monolith into `dxp/ContentOS.tsx` architecture.
- **Pattern**: Employs a Headless model. Instead of hard-locking UI to forms, `schema.ts` allows runtime definitions of `content_types`. Next, polyglot blocks fall into `content_entries`.
- **Workflow**: Native integrations with `BlogManager` and `ContentManager` tools, equipped with approval workflows (status toggles) and API Delivery overlays (GraphQL / Rest proxy endpoints representation).

## 13. SEO Architecture

- **Rendering Layer**: Native CSR injected dynamic Meta via `SeoHead.tsx` updating `document.title`, description, canonicals, schema.org JSON-LD structured data.
- **Intelligence Layer**: Managed within `dxp/SeoIntelligence.tsx`. Aggregates Technical SEO scores, LCP data, orphaned page data.
- **Programmatic Engine**: `dxp/ProgrammaticHub.tsx` generates thousands of programmatic landing pages based on dynamic permutations of materials and industries (e.g., "Corrugated Boxes for Tehran Pharma").

## 14. ERP Module Map

Managed by `components/B2BSuite.tsx` & `components/AdminPanel.tsx`:
- **Accounting LEDGER**: Tracks credits, invoices, dual-entry accounting views for Partner balances.
- **Order KANBAN**: Realized as `activeTab === 'orders'`. Visual drag-and-drop representing offset-printing lifecycles (LITHOGRAPHY -> PRINT -> EMBOSS -> DIE_CUT -> FOLD -> SHIPPING).
- **Quoting ENGINE**: `formula` engine tab handles deep variables like spot-color coverage percentages against current zinc/plate costs.

## 15. CAD Module Map

Architected for browser-first WebGL and 2D canvas manipulations:
- **`DielineGenerator`**: Parametric input capture (L x W x H + Material thickness).
- **`DesignStudio`**: Core orchestrator acting as the 2D surface.
- **`FloatingCadWindows` & `DockableWindow`**: Implements desktop-class UI allowing draggable tool palettes.
- **`CanvasRulers`**: Millimeter-accurate X/Y guidance.
- **`LayerManager`**: SVG and Graphic placement indexing (Z-Index mapping).
- **`ThreeDPreview`**: `Three.js` scene mapping flat SVGs onto folded UV boxes using WebGL.

## 16. Packaging Design Module Map

- **`StandardsEnginePanel`**: Database of European manufacturing standards (FEFCO for corrugated, ECMA for carton board). User selects an index (e.g., FEFCO 0201), the system mathematically deduces fold locations.
- **`geometryValidator`**: Prevents impossible shapes (e.g., overlaps blocking glue flaps).
- **`materialCompensationEngine`**: Compensates dimensions; folding 4mm E-flute costs inner spatial volume.

## 17. File Storage Architecture

- Handled by monolithic local container disk mapping in `/uploads/`.
- Mediated by Express `multer` middleware.
- Enterprise DAM UI parses this folder bridging it to Postgres `media` ORM for metadata augmentation (Alt tags, WebP optimized flags).
- **Security**: Endpoint verification asserts strict `path.resolve` path containment blocking parent traversal exploits (Directory Traversal protections in `server.ts`).

## 18. Backup Architecture

- A highly advanced self-contained Continuity Engine defined in `backups/`.
- Capable of packaging database payloads AND encoding the entirely of physical `/uploads/` into Base64 JSON bundles for safe transport.
- The platform also includes a System OTA (Over The Air) Patch mechanism utilizing `.zip` extraction natively via `adm-zip`, with automatic Pre-Update Restore Generation on execution.

## 19. AI Integration Architecture

- **Provider**: Google Gemini (`@google/genai`).
- **Surface 1: Customer Facing**: AI Chat Support (`generateSupportResponse`) acting as a sales assistant inside the platform, contextually mapping catalog capabilities.
- **Surface 2: Feature Generation**: Programmatic generation of Semantic Entities inside the SEO Hub.
- **Surface 3: Visual Analytics**: `analyzeDesignStyle` analyzes uploaded user design motifs returning mood-board attributes inside the Smart Portfolio.

## 20. Deployment Architecture

- **Pattern**: Advanced Vite Monolith running on Node.js (Express + Embedded React SPA).
- **Build Pipeline**: 
  - `vite build` translates React into `/dist/` static files.
  - `esbuild` statically compiles and bundles `server.ts` into a CommonJS `./dist/server.cjs` skipping runtime ESM dependency fragmentation.
- **Execution**: The server hosts the API, the Multer local storage pathings, the continuity backup jobs, AND serves the Vite single-page application all on port `3000`.
- **Target OS**: Ready for immutable Docker container execution on platforms like Google Cloud Run. Scale out requires shifting `/uploads` to Block Storage (e.g. S3/GCS) and `sqlite` to Managed PostgreSQL, which the architecture fully supports.
