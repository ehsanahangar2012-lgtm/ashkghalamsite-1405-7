# ASHK GHALAM SMART PRINTING & PACKAGING INDUSTRIAL ERP
## PHASE 24: MODULAR MONOLITH UPGRADE AND ENTERPRISE ARCHITECTURAL BLUEPRINT

This master blueprint defines the complete architectural design, data consistency models, event system, and scaling vectors required to refactor and cement the **Ashk Ghalam Smart Printing & Packaging ERP (v3.0)** as a highly scalable, offline-capable, financial-grade industrial platform.

---

## 1. COMPREHENSIVE PROJECT TREE (MODULAR TARGET)

The target codebase utilizes a strictly bounded, clean modular layout representing the transition from a coupled SPA to a Modular Monolith structural baseline:

```
/ (Workspace Root)
├── package.json                         # Node dependency and execution manifest
├── tsconfig.json                        # Strict type configurations
├── server.ts                            # Full-stack CJS Express Entry
├── metadata.json                        # App settings and permission profiles
├── types.ts                             # Global domain definitions
├── vite.config.ts                       # Packager configuration
│
├── /domain                              # CORE BUSINESS LOGIC (Zero Frame & GUI Coupling)
│   ├── /accounting                      # Ledger, COA, Double-Entry math
│   │   ├── AccountEntity.ts
│   │   ├── JournalEntry.ts
│   │   └── TaxInvoiceCalculation.ts
│   ├── /manufacturing                   # Print press engineering formulas
│   │   ├── GangingSheetPacker.ts
│   │   ├── MachineSpeedTracker.ts
│   │   └── WasteToleranceCalculator.ts
│   ├── /inventory                       # Material stock level invariants
│   │   ├── MaterialLotStock.ts
│   │   └── InventoryReservation.ts
│   └── /crm                             # Lead-to-Order transition workflows
│       └── PartnerRiskProfile.ts
│
├── /application                         # WORKFLOW & INTER-MODULE COMMUNICATIONS
│   ├── /eventbus                        # In-Process Decoupled Event Pipeline
│   │   ├── EventBus.ts
│   │   ├── EventDispatcher.ts
│   │   └── DeadLetterQueue.ts
│   └── /usecases                        # Coordinated single-actor logic processes
│       ├── BookJournalVoucherUseCase.ts
│       ├── GenerateGangingLayoutUseCase.ts
│       └── AdjustInventoryStockUseCase.ts
│
├── /infrastructure                      # DIRECT SYSTEM ADAPTERS (External systems)
│   ├── /db                              # PostgreSQL and Offline IndexedDB mappings
│   │   ├── PostgresDatabase.ts
│   │   ├── IndexDbAdapter.ts
│   │   └── SyncEngine.ts
│   ├── /cms                             # Page Builder schemas & Media Library
│   │   ├── ContentSchemaManager.ts
│   │   └── MinioS3Storage.ts
│   ├── /seo                             # Canonical mapping engines & Sitemap generator
│   │   ├── JsonLdGenerators.ts
│   │   └── PreflightSitemapCompiler.ts
│   └── /security                        # JWT keys & Row-Level security controllers
│       ├── JwtManager.ts
│       └── DeviceTokenBinder.ts
│
└── /presentation                        # REACT INTERACTIVE VIEW CONTROLLERS
    ├── /components                      # Specialized isolated controls & grids
    │   ├── /design                      # Design studio & dieline components
    │   ├── /mes                         # Factory scheduler grids & machine monitors
    │   └── /finance                     # Secure ERP general ledger modules
    ├── /contexts                        # High-level state hydration contexts
    │   ├── AuthContext.tsx              # Session security context
    │   └── ContentContext.tsx           # CMS & pricing configurator context
    └── App.tsx                          # Single, unified high-performance entrance frame
```

---

## 2. SYSTEM DEPENDENCIES & VERSION DECOMPOSITION

The production platform incorporates standardized enterprise libraries mapped explicitly to target nodes:

```json
{
  "dependencies": {
    "@google/genai": "^1.34.0",          // AI-driven industrial analytics core
    "express": "^5.2.1",                 // Monolith server runner
    "tsx": "^4.21.0",                    // Native development execution engine
    "three": "^0.182.0",                 // 3D canvas dieline engineering and loading
    "recharts": "^3.6.0",                // BI manufacturing charts and financial grids
    "framer-motion": "^12.23.26",        // Transition systems & UI mechanics
    "lucide-react": "^0.562.0",          // Vector iconography
    "jspdf": "^4.2.0"                    // Document export and output printing records
  }
}
```

---

## 3. ARCHITECTURE DIAGRAMS & PATTERNS

### 3.1 Stacked Layer Clean Architecture Topology

All communications pass from outer Presentation/Infrastructure circles inwards to the core Domain, guaranteeing immunity from framework lock-in or client changes:

```
+─────────────────────────────────────────────────────────────────────────────+
|                          PRESENTATION LAYER (UI)                           |
|  - React Desktop-First Viewports        - Three.js Interactive 3D Canvas    |
|  - FA/EN Multilingual CMS Dashboards    - Dynamic Head Tag Injections (SEO) |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Real-time interactions & Web Hook API
                                       ▼ 
+─────────────────────────────────────────────────────────────────────────────+
|                         APPLICATION LAYER (USE CASES)                       |
|  - Command/Query separation (CQRS)     - Domain Event Dispatcher (Local Bus) |
|  - Synchronization Queue Resolver      - Document Approval state machine     |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Invokes transactional contracts
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                         CORE DOMAIN LAYER (ENTITIES)                        |
|  - Financial Double-Entry Invariants   - Standard Ganging Bin-Packing math  |
|  - Machine Run Rates & Speeds         - SAYAD Registry State validation    |
+──────────────────────────────────────┬──────────────────────────────────────+
                                       │ Instantiates interfaces
                                       ▼
+─────────────────────────────────────────────────────────────────────────────+
|                    INFRASTRUCTURE LAYER (ADAPTERS & DATABASES)              |
|  - PostgreSQL with Row-Level Security  - Redis Caching Cluster (RAM)        |
|  - MinIO S3 Object Storage Gateway    - Local sync IndexedDB Storage       |
+─────────────────────────────────────────────────────────────────────────────+
```

### 3.2 State Management Diagram (Transactional Flow)

A strict, uni-directional update loop prevents memory leaks and ensures transactional safety:

```
[ UI component ] ==(Dispatches Command)==► [ CQRS Command Bus ] ===► [ DB Client (Acid Commit) ]
       ▲                                                                       │
       │                                                                       ▼
[ Hydrated Page ] ◄==(Renders Updated Props)◄== [ Redux/Context Cache ] ◄== [ Event Published ]
```

### 3.3 Routing Tree & Access Matrix

Security boundaries are strictly mapped to application views through RBAC token authentication:

```
[ Root Navigation View Controller ]
        │
        ├──► [ PUBLIC VIEWS: HOME, SERVICES, BLOG, PORTFOLIO ]
        │
        └──► [ PROTECTED ENTERPRISE VIEWS ] [ Guard: Auth Token Valid ]
                 │
                 ├──► [ INQUIRY / DESIGN_STUDIO ]  - Requires: USER_ROLE <= SMB (Self service)
                 ├──► [ B2B_SUITE (Finance / MES) ]- Requires: USER_ROLE.ACCOUNTANT or ADMIN
                 └──► [ ADMIN_PANEL ]             - Requires: USER_ROLE.ADMIN
```

---

## 4. DETAILED DATA CONSISTENCY MODEL

To eliminate risk of double-spend or split-brain conditions, the platform implements localized consistency layers per business domain:

```
            +────────────────────────────────────────────────────+
            │         DATA CONSISTENCY ALLOCATION TARGET         │
            +────────────────────────────────────────────────────+
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
[ ACCOUNTING & TREASURY ]     [ MATERIALS INVENTORY ]     [ MANUFACTURING RUN LOGS ]
  - Strong Consistency (ACID)   - Soft-Reserved State       - Eventual Consistency
  - Strict Ledger Locking       - Snapshot reconcile        - Append-only telemetry
```

| Subsystem Domain | Consistency Model | Core Invariants Enforced | Concurrency Lock Mechanism |
| :--- | :--- | :--- | :--- |
| **Accounting** | **Strong Consistency (ACID)** | Balance check: Debit == Credit throughout every transaction. | Row-level `SELECT ... FOR UPDATE` ledger boundaries. |
| **Treasury** | **Strong Consistency** | Double-payment validation; Cheque cannot be cleared twice. | Strict primary key checks against SAYAD tracking numbers. |
| **Inventory** | **Hybrid / Snapshot** | Raw stock reserves cannot exceed actual physically present tonnage. | Optimistic concurrency versioning (`WHERE version = :val`). |
| **MES / Production** | **Eventual Consistency**| Recorded yield count and run speed logs synchronized. | Local queue accumulation synced using sequence ID clocks. |

---

## 5. REPOSITORY INTERFACE SPECIFICATIONS (No more Fake Fetch)

To safely sever structural reliance on `fake-fetch.ts` without introducing code breaks, we define the official Domain Repository Contracts:

### 5.1 Financial Voucher Storage Repository Interface
```typescript
export interface IVoucherRepository {
  /**
   * Commits a transactional journal double-entry to historical ledger storage.
   * Ensures atomic ACID consistency across debited and credited accounts.
   */
  saveVoucher(voucher: JournalVoucher): Promise<boolean>;
  
  /**
   * Compiles and tallies the total debits and credits of a specific account.
   */
  getAccountBalance(accountCode: string): Promise<number>;
  
  /**
   * Accesses list of unapproved vouchers pending accountant verification.
   */
  getPendingVouchers(): Promise<JournalVoucher[]>;
}
```

### 5.2 Production Work Order Repository Interface
```typescript
export interface IWorkOrderRepository {
  /**
   * Dispatches calculated imposition coordinates to active industrial queue trackers.
   */
  queueOrder(order: WorkOrder): Promise<void>;
  
  /**
   * Modifies current operating speeds or active state parameters of a physical press machine.
   */
  updateMachineState(machineCode: string, status: string, speedImpPerHour: number): Promise<void>;
}
```

---

## 6. ASYNC ENTERPRISE EVENT SYSTEM DETAIL

Decoupled inter-module communication is driven through a message broker specification containing auto-retry loops, error routing, and idempotency guarantees:

```
                          [ Event Generated ]
                                   │
                                   ▼
                       [ Idempotency Key Validator ]
                                   │
                    ┌──────────────┴──────────────┐
                    ▼ (Duplicate detected?)       ▼ (New event)
               [ Drop Message ]            [ Event Bus Dispatcher ]
                                                  │
                                       ┌──────────┴──────────┐
                                       ▼ (Success)           ▼ (Exception thrown)
                                  [ Acknowledge ]     [ Retry Queue ] (3 Attempt Limit)
                                                             │
                                                             ▼ (Exhausted?)
                                                      [ Dead Letter Queue ]
```

### 6.1 Relational Schema for Database Event Store
```sql
CREATE TABLE "event_store" (
  "event_id" UUID PRIMARY KEY,
  "event_name" VARCHAR(255) NOT NULL,
  "stream_id" VARCHAR(255) NOT NULL,
  "aggregate_type" VARCHAR(100) NOT NULL,
  "event_version" INT NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "metadata" JSONB,
  "idempotency_key" VARCHAR(255) UNIQUE NOT NULL,
  "occurred_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "dead_letter_queue" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "failed_event_id" UUID NOT NULL REFERENCES "event_store"("event_id"),
  "subscriber_name" VARCHAR(255) NOT NULL,
  "last_exception" TEXT NOT NULL,
  "retry_count" INT NOT NULL DEFAULT 0,
  "escalated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 6.2 Event Bus Implementation (TypeScript Specification)
```typescript
import { UUID } from "crypto";

export interface DomainEvent {
  eventId: string;
  eventName: string;
  occurredOn: Date;
  idempotencyKey: string;
  payload: Record<string, any>;
}

export interface EventSubscriber {
  handle(event: DomainEvent): Promise<void>;
  subscribedTo(): string[];
}

export class RobustEnterpriseBus {
  private static instance: RobustEnterpriseBus;
  private subscribers: Map<string, ArrayList<EventSubscriber>> = new Map();
  private maxRetries = 3;

  public static getInstance(): RobustEnterpriseBus {
    if (!this.instance) {
      this.instance = new RobustEnterpriseBus();
    }
    return this.instance;
  }

  public register(sub: EventSubscriber): void {
    for (const name of sub.subscribedTo()) {
      if (!this.subscribers.has(name)) {
        this.subscribers.set(name, []);
      }
      this.subscribers.get(name)!.push(sub);
    }
  }

  public async publish(event: DomainEvent): Promise<void> {
    const list = this.subscribers.get(event.eventName);
    if (!list) return;

    for (const sub of list) {
      let attempts = 0;
      let success = false;
      while (attempts < this.maxRetries && !success) {
        try {
          await sub.handle(event);
          success = true;
        } catch (error) {
          attempts++;
          console.error(`[Event Exception] ${event.eventName} failed on subscriber ${sub.constructor.name}, attempt: ${attempts}`, error);
          if (attempts >= this.maxRetries) {
            await this.escalateToDLQ(event, sub.constructor.name, error);
          } else {
            // Wait with exponential backoff before retry (e.g. 50ms, 100ms, 200ms)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 50));
          }
        }
      }
    }
  }

  private async escalateToDLQ(event: DomainEvent, subscriber: string, error: any): Promise<void> {
    console.error(`🚨 CRITICAL: Event ${event.eventId} escalated to DEAD LETTER QUEUE (DLQ) for sub ${subscriber}. Error details: ${error.message}`);
    // Infrastructure API hook to save to physical dead_letter_queue table
  }
}
```

---

## 7. OFFLINE INDEXEDDB SYNCHRONIZATION DESIGN

To ensure operations do not halt in printing complexes when National Information Network (NIN) connections fluctuate:

```
[ OFFLINE STAGING INDEXEDDB ]
  ├── Transacts vouchers and stock adjustment logs using isolated local indexes.
  └── Stores outbound state requests sequentially with high-precision timestamp vectors.
               │
               ▼ (NIN Internet Connection Restored?)
[ LOCAL MERGE MATRIX SYSTEM ]
  ├── Check local timestamp version vs. central master database.
  ├── CASE: No server side update occurred for targeted key -> Apply fast-forward write.
  └── CASE: Central master has more recent record -> Divert conflict to Manual Review Queue.
```

### Conflict Resolution Merge Matrix Rules

| Target Domain Module | Sync Merge Strategy | Conflict Outcome Path |
| :--- | :--- | :--- |
| **Financial Ledger (Vouchers)** | Append Only / No Override | Unique increment sequencing ensures duplicate voucher numbers are rejected. Online central validator re-indexes numbers on ledger ingest. |
| **Sayad Cheques** | Central Authority Dominant | Always override local status to match absolute Central Bank portal state readback. |
| **Material/Inventory Stock**| Delta Balance Aggregation | Apply delta difference ($+$ or $-$ adjustments) rather than absolute local overwrite of current weight metrics. |
| **MES Operator Speed Telemetry**| Fast Forward Time Series | Append telemetry records directly into linear timeseries logs under singular Machine codes. |

---

## 8. INTEGRATED CMS & SEO ARCHITECTURE

Our unified content and metadata pipeline is structured to achieve ultra-fast page speeds and search rankings without sacrificing dynamic industrial administration capabilities:

```
[ Incoming Crawler / Client Request ] ──► [ Nginx Server Cache ]
                                                 │
                                                 ├──► [ File in edge cache (HTML/Webp)? ]
                                                 │        │
                                                 │        ▼
                                                 │      Serve instantly
                                                 │
                                                 └──► [ Edge Cache Miss/Query Render ]
                                                          │
                                                          ▼
                                                    [ server.ts rendering ]
                                                          │
                                                          ├──► Compile head with SeoConfig meta tags
                                                          └──► Generate JSON-LD Schema structures
```

### 8.1 Rich JSON-LD Micro-Data Specifications (fa-IR Localization)
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://ashkghalam.ir/#organization",
      "name": "صنایع چاپ و بسته‌بندی اشک قلم",
      "url": "https://ashkghalam.ir",
      "logo": "https://ashkghalam.ir/logo.png",
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+98-21-55555555",
        "contactType": "sales",
        "areaServed": "IR"
      }
    },
    {
      "@type": "Product",
      "@id": "https://ashkghalam.ir/services/ زعفران-box/#product",
      "name": "جعبه‌های صادراتی زعفران اعلال اشک قلم",
      "description": "تولید مکانیزه هاردباکس و بسته بندی زعفران با نظرات مهندسین کارگاه اشک قلم",
      "image": "https://ashkghalam.ir/uploads/saffron_box.jpg",
      "brand": {
        "@type": "Brand",
        "name": "چاپ اشک قلم"
      },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "IRR",
        "lowPrice": "500000",
        "highPrice": "5000000",
        "offerCount": "12"
      }
    }
  ]
}
</script>
```

### 8.2 CMS Object Metadata Schema Layout
```typescript
export interface CmsContentBlock {
  key: string;              // Unique lookup path (e.g., 'home.hero_banner')
  lang: 'fa' | 'en';        // Content localization code
  title: string;            // Visual block title
  body: string;             // Rich HTML body context
  mediaUrl?: string;        // S3-compatible asset file reference (dielines or layouts)
  version: number;          // Historical save index of editing
  modifiedBy: string;       // User account ID of editor
}
```

---

## 9. HARDENED ENTERPRISE DATA SECURITY COMPACT

Comprehensive design guidelines mapping Row Level Security (RLS) policies, session token validation, and operational data security protocols:

```
[ API Gateway Routing Engine ]
  ├── 1. Read input parameters & token headers.
  ├── 2. Validate JWT signature against primary onsite secrets keys.
  ├── 3. Determine Actor context (e.g. Actor is Partner, ID = PTR-99).
  └── 4. Postgres DB layer applies secure partition checks:
         `WHERE company_id = current_setting('app.current_tenant_id')`
         Result: Partner cannot view unrelated factory accounts or logs.
```

1.  **Row Level Security (RLS) PostgreSQL Rules:**
    ```sql
    -- Enforce absolute tenant isolation for partner accounts
    ALTER TABLE "journal_vouchers" ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "PartnerSpecificLedgerIsolation" ON "journal_vouchers"
      AS RESTRICTIVE USING (
        (current_setting('app.current_user_role') = 'ADMIN') OR
        (created_by = current_setting('app.current_user_id')::UUID)
      );
    ```
2.  **Session Token Safety Strategy:** JSON Web Tokens incorporate client-device fingerprints in the signature body. Validation fails instantly if access tokens migrate between IP boundaries.
3.  **Physical Secure File Verification Procedures:** Dieline DXF vector uploads pass through severe pre-flight validation verifying XML structures to prevent arbitrary script injections (XSS vectors). Files are processed via strict isolation routines.

---

## 10. BACKUP, DISASTER RECOVERY & PERFORMANCE PROFILE

### 10.1 Point-in-Time Recovery (PITR) & Data Redundancy Target
*   **Database Archiving (WAL):** PostgreSQL Write-Ahead Logs are archived and transmitted incrementally every 15 minutes to on-premise secondary cold-standby configurations.
*   **Asset Redundancy Map:** S3 vaults replicate content daily to isolated local physical backup disks.

### 10.2 Ultra-Performance Caching Specification
*   **High-Volume Pricing Caches:** Dynamic pricing formulas and raw paper market price lists are cached inside localized Redis databases with brief expiration boundaries (e.g., 5 minutes) to alleviate processing wear on critical layout engines.
*   **Heavy Geometry Calculations:** Bin-packing calculations for multi-item sheet imposition operate inside dedicated background **Web Workers** in the browser, preventing viewport freezes.

---

## 11. STRATEGIC REFACTORING & TARGET ACTION MATRIX

To achieve clean integration, our system is migrating from legacy file setups to physical DDD folders:

```
==========================================================================================
REFACTOR PHASE         | TARGET MODULE                  | PRIMARY TASK ACTION DETAIL
==========================================================================================
1. Base Split          | Setup /domain & /application  | Extract mathematical calculators out of UI.
2. Ledger Enforcement  | Extract /features/accounting   | Integrate IVoucherRepository to backend.
3. Eventbus Hookup     | Instantiate RobustEnterpriseBus| Channel state changes via events.
4. Production Schedule | Track Cd102 & Bobst metrics    | Bind live telemetries to MES workspace.
5. NIN Offline Sync    | Local Merge Matrix Engine     | Connect IndexedDB buffer synchronization.
==========================================================================================
```

The unified clean boundaries designated above serve as our absolute roadmap to production readiness, fully prepared to withstand enterprise workloads in demanding environments.
