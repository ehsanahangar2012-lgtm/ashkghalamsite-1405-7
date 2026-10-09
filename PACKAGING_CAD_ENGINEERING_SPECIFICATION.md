# Ashk Ghalam Packaging CAD & Engineering Suite
## Professional System Architecture, CAD/CAM Algorithms, and ERP Integration Specification

This handbook constitutes the official engineering, mathematics, and architectural blueprint for the **Ashk Ghalam Industrial Packaging CAD & Structural Engineering Suite**, fully integrated with the Ashk Ghalam Industrial ERP ecosystem.

---

## 1. COMPLETE SOFTWARE ARCHITECTURE
The system is built on a **Modular Full-Stack Hybrid monolithic structure** progressing toward automated microservices.

```
       ┌─────────────────────────────────────────────────────────┐
       │             Client Browser (React 19 / Vite)            │
       │   - 2D Canvas CAD Engine     - 3D WebGL PBR Folding     │
       │   - Multi-tab Studio View    - AI Copilot Interface     │
       └────────────────────────────┬────────────────────────────┘
                                    │ HTTP / REST / event-stream
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             Express / Node.js Server Router             │
       │   - Parametric Exporters     - McKee Physics Engine     │
       │   - Sheet Imposition Router - AI Copilot Server Agent   │
       └────────────────────────────┬────────────────────────────┘
                                    │ GRPC / DB Connection
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │           Ashk Ghalam ERP Database & Services           │
       │   - Material Warehouse      - Die-Cutter Machinery      │
       │   - Invoicing & Accounts    - CMS Asset Vault (WORM)     │
       └─────────────────────────────────────────────────────────┘
```

---

## 2. PROJECT FOLDER STRUCTURE
```
/
├── components/
│   ├── DielineGenerator.tsx      # Main CAD workspace, layer controller, object editor
│   ├── ThreeDPreview.tsx         # 3D folding simulator core (Three.js WebGL & shaders)
│   ├── UIComponents.tsx          # Reusable dashboard design tokens
│   ├── Dashboard.tsx             # ERP operational overview panel
│   └── Login.tsx                 # Iranian OTP security access gate
├── services/
│   ├── dielineMath.ts            # Parametric geometry engines (FEFCO/ECMA)
│   ├── geminiService.ts          # Server-Agent prompt handlers
│   └── numberUtils.ts            # Farsi/Persian numeric standardizer
├── contexts/
│   ├── AuthContext.tsx           # Session control & permission matrix
│   └── ContentContext.tsx        # Project states and local archives metadata
└── tsconfig.json                 # Type safety enforcement
```

---

## 3. DATABASE SCHEMA (RELATIONAL & NOSQL HYBRID)
To ensure extreme performance and WORM (Write Once Read Many) revision safety for dielines:

### 3.1. Firestore / MongoDB Document Store (CAD Designs Archive - `cms_dielines`)
```json
{
  "dieline_id": "dl-9041-fefco0427",
  "name": "جعبه پستی دیجی‌کالا سایز ۳",
  "revision": "v1.4",
  "fefco_ecma_code": "FEFCO 0427",
  "dimensions_internal": { "L": 220, "W": 160, "H": 65 },
  "dimensions_manufacturing": { "L": 221.6, "W": 161.6, "H": 67.2 },
  "grain_direction": "long",
  "material_id": "corrugated-e-flute",
  "status": "APPROVED_FOR_PRODUCTION",
  "approval_workflow": {
    "designer_signature": "SIG_USER_4518",
    "factory_manager_sign": "SIG_ADMIN_2210",
    "timestamp": "2026-06-04T06:26:00Z"
  },
  "cad_geometry_layers": {
    "cut_lines": ["M 80,180 L 140,180...", "M 140,180 L ..."],
    "crease_lines": ["M 140,120 L 140,180...", "..."],
    "bleed_lines": []
  },
  "erp_link": {
    "project_id": "proj-9801",
    "reserved_sheet_count": 12000
  }
}
```

---

## 4. DOMAIN MODEL (DOMAIN-DRIVEN DESIGN)

```
                       ┌──────────────────────┐
                       │   PackagingModel     │
                       │                      │
                       │ - code: string       │ 
                       │ - category: Category │
                       └───────────┬──────────┘
                                   │
                                   ▼
┌──────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  PressMachine    │◄──┤   DielineGenerator   ├──►│  PackagingMaterial   │
│                  │   │                      │   │                      │
│ - sheetW: number │   │ - dims: Dimensions   │   │ - thickness: number  │
│ - sheetH: number │   │ - foldRatio: number  │   │ - ectValue: number   │
└──────────────────┘   └───────────┬──────────┘   └──────────────────────┘
                                   │
                       ┌───────────▼──────────┐
                       │    McKeePhysics      │
                       │                      │
                       │ - safetyFactor       │
                       │ - bctResistance      │
                       └──────────────────────┘
```

---

## 5. DIELINE CALCULATION ALGORITHMS

### 5.1. ECMA A20.20 (Pharmaceutical Fold Carton)
Symmetrical calculation uses high-fidelity Bezier logic:
Let $x_0$ be the base layout start:
$$x_1 = x_0 + \text{glueTab}$$
$$x_2 = x_1 + W$$
$$x_3 = x_2 + L$$
$$x_4 = x_3 + W$$
$$x_5 = x_4 + L$$
Tapers are computed with a $15^\circ$ angle:
$$\tan(15^\circ) \approx 0.268$$
Thus, dust flaps are modeled as a trapezoid:
$$P_{\text{start}} = (x_1, y_{\text{mid}})$$
$$P_{\text{height1}} = (x_1 + 3, y_{\text{mid}} - \text{dustFlap})$$
$$P_{\text{height2}} = (x_2 - 8, y_{\text{mid}} - \text{dustFlap})$$
$$P_{\text{end}} = (x_2, y_{\text{mid}})$$

---

## 6. MATERIAL COMPENSATION ALGORITHMS
To convert internal box sizes $(L_i, W_i, H_i)$ to exact cutting and creasing toolpaths, we apply folding loss coefficients reflecting tension and compression:

```
            Folds compress inner material and stretch outer material fibers.
                       
                           Crease Scoring Tool
                                  ▼
                     ┌───┐                 ┌───┐
                     │   │                 │   │
                     │   └─── Fold Loss ───┘   │
             ========╪═════════════════════╪========
                     │◄──── Bend Radius ──►│
```

Let $c$ be the compensation allowance:
$$L = L_i + (t \cdot f_m)$$
$$W = W_i + (t \cdot f_m)$$
$$H = H_i + (t \cdot f_m)$$
Where:
* $t = \text{Material Thickness (mm)}$
* $f_m = \text{Compensation Factor}$ ($0.25$ for folding SBS board, $0.35$ for corrugated E/B flutes, up to $0.55$ for double-wall EB flutes).

---

## 7. PACKAGING PHYSICS ENGINE (MCKEE COMPRESSION STRENGTH)
The stacking capacity on the warehouse floor follows the classic **McKee Formulation**:

$$\text{BCT (Newtons)} = 5.87 \cdot \text{ECT} \cdot \sqrt{t \cdot Z}$$

Where:
* $\text{ECT}$: Edge Crush Test value of the material in kN/m.
* $t$: Board thickness in mm.
* $Z$: Box perimeter ($2 \cdot (L + W)$) in mm.

### Environmental Degradation Calculation
$$\text{Safety Factor} = \frac{3.0}{F_{\text{humidity}} \cdot F_{\text{time}}}$$
Where:
* $F_{\text{humidity}}$ drops to $0.45$ above $80\%$ Relative Humidity (RH).
* $F_{\text{time}}$ drops to $0.50$ after 120 days of load-bearing storage.

---

## 8. INDUSTRIAL NESTING ALGORITHM DESIGN
The imposition system matches dieline templates against standard press boundaries using dynamic rotation fitting:

```
    Normal Grid arrangement:             Nesting / Interlocking:
    ┌─────────┐┌─────────┐               ┌─────────┐   ┌───┐
    │  Item 1 ││  Item 2 │               │  Item 1 │  ─┼───┼─ (Wasted Area Saved)
    └─────────┘└─────────┘               └─────────┼───┼───┘
                                                   └───┘
```

1. **Orthogonal Guillotine Packing:**
   $$\text{Yield}_{\text{normal}} = \lfloor \frac{\text{SheetWidth}}{\text{DielineWidth}} \rfloor \cdot \lfloor \frac{\text{SheetHeight}}{\text{DielineHeight}} \rfloor$$
2. **Weave Nested Layout (Rotated):**
   $$\text{Yield}_{\text{rotated}} = \lfloor \frac{\text{SheetWidth}}{\text{DielineHeight}} \rfloor \cdot \lfloor \frac{\text{SheetHeight}}{\text{DielineWidth}} \rfloor$$
3. **Interlocking Nesting Optimizer (Saves 15-20% Board):**
   For shapes with recess areas (like folding flap spaces in ECMA boxes), flaps are interlaced into the adjacent box's flap recess.
   $$\text{Yield}_{\text{AI}} = \lfloor \text{Yield}_{\text{best}} \cdot 1.15 \rfloor$$

---

## 9. API ARCHITECTURE (REST & REAL-TIME INTERACTION)
All endpoints reside on the server-side, protecting CRM inputs and Gemini secrets.

* `POST /api/cad/render` - Generates vector outlines in PDF/SVG.
* `POST /api/physics/simulate` - McKee stress performance simulator.
* `POST /api/nesting/optimize` - Heidelberg sheet allocation matrix solver.
* `POST /api/cost/estimate` - Industrial pricing integration.
* `POST /api/ai/recommend` - System recommendations for FEFCO models.

---

## 10. ERP INTEGRATION PLAN
* **CRM Connection:** Customer selections automatically trigger a design draft in the vault.
* **Inventory Reservation:** Upon layout check, raw stock (e.g. 100x70 indboard sheets) is reserved in the inventory database using transactional locking.
* **MRP Scheduling:** Die-cut requirements (tooling parameters, run length, speed) are automatically transferred to Heidelberg/Komori production queue tables.

---

## 11. CMS DESIGN (CAD VAULT)
* **Version Control:** All modifications generate incremented revision levels (v1.0 -> v1.1).
* **Metadata Attachment:** Original dimensions, material IDs, and safety coefficients remain permanently linked to the CAD files.
* **Production Status Sigil:** Only templates marked `APPROVED` can lock stock or run plates.

---

## 12. UI/UX DESIGN SYSTEM SPECIFICATION
* **Color Palette:** Slate gray slate-900/950 board canvas paired with vibrant stroke layers (Red `#dc2626` for Cut, Blue `#2563eb` for Crease, Grey `#475569` for Guides).
* **Dockable HUD Panels:** Allows operators to view structural reports, McKee load factor, and material sheets side-by-side.

---

## 13. MICROSERVICES ROADMAP
* **Phase 1 (Monolith):** Single Express/Vite app handles rendering and math.
* **Phase 2 (Decoupled Engine):** Extract `dielineMath` and `McKee` solvers to a lightweight Go/Rust microservice to handle multi-threaded nested optimization requests in parallel.
* **Phase 3 (Enterprise Cluster):** CAD exporters, 3D WebGL generators, and AI components deploy separately inside Docker containers on Cloud Run/K8s.

---

## 14. VERTICAL SCALABILITY PLAN
* **Caching Layer:** Pre-computed standard FEFCO shapes are cached in Redis to prevent mathematical re-calculation.
* **CPU Imposition Workers:** Complex canvas nesting runs in isolated web workers on the server to prevent blocking the Node.js event loop.

---

## 15. FUTURE AI ROADMAP
* **Generative Structural Design:** Input custom 3D models (e.g. perfume bottles) and the AI automatically calculates the optimal custom protective paper tray geometries.
* **Computer Vision Preflight:** Scans customer artwork uploads to detect bleed-offs, misaligned notches, or overlaps on crease lines before printing.

---
*Ashk Ghalam Industrial ERP & CAD Automation — Designed for the Next Generation of Packaging & Print Machinery.*
