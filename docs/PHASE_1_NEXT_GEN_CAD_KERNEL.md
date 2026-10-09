# PHASE 1 — Next Generation Packaging CAD Kernel

## Executive Summary
This document outlines the Phase 1 architecture for a commercial-grade, decoupled Packaging CAD Platform. React is relegated strictly to the presentation layer. The core platform is an API-first, event-driven, mathematically rigorous system composed of 27 independent engines.

---

## 1. Geometry Kernel
**Responsibilities:** Core mathematical representation of 2D and 3D shapes, points, vectors, paths, bounding boxes, and boolean operations (union, difference, intersection).
**Public Interfaces:** `IGeometryKernel`, `calculateIntersection()`, `booleanUnion()`, `offsetPath()`
**Internal Architecture:** Boundary Representation (B-Rep) using Half-Edge data structures for topological queries. Separate precision-math core using big-decimal or exact rational arithmetic.
**Folder Structure:** `/src/core/geometry-kernel/` (subfolders: `/math`, `/topology`, `/boolean`)
**Dependencies:** None (Zero-dependency math core).
**Events:** `GeometryCreated`, `GeometryMutated`, `IntersectionDetected`
**Extensibility:** Interface-driven math precision layers (swap standard floats for arbitrary-precision numbers).
**Testing Strategy:** Fuzz testing for intersection edge cases; property-based testing for topological consistency.
**Future Expansion:** GPU-accelerated boolean operations via WebGPU or WebAssembly (Rust).

## 2. Geometry AST (Abstract Syntax Tree)
**Responsibilities:** Represent parametric shapes and CAD operations as a declarative, serializable tree structure.
**Public Interfaces:** `IASTNode`, `parseAST()`, `serializeAST()`, `traverse()`
**Internal Architecture:** Node-based tree where leaves are primitives (Lines, Arcs) and branches are operations (Chamfer, Boolean, Mirror).
**Folder Structure:** `/src/core/ast/` (subfolders: `/nodes`, `/parsers`, `/serializers`)
**Dependencies:** Geometry Kernel.
**Events:** `ASTNodeAdded`, `ASTNodeRemoved`, `ASTRebuilt`
**Extensibility:** Custom node registration allowing plugins to define new operations (e.g., custom flap types).
**Testing Strategy:** Snapshot testing of serialized trees; round-trip serialization tests.
**Future Expansion:** AI-driven AST generation and optimization.

## 3. Constraint Solver
**Responsibilities:** Solve geometric and dimensional constraints (parallel, perpendicular, distance, tangent, coincident).
**Public Interfaces:** `IConstraintSolver`, `addConstraint()`, `resolve()`, `getDegreesOfFreedom()`
**Internal Architecture:** Newton-Raphson iterative solver or a generic non-linear optimization engine. Uses a bipartite graph for variables and constraints.
**Folder Structure:** `/src/core/solver/` (subfolders: `/algorithms`, `/constraints`, `/matrix`)
**Dependencies:** Geometry Kernel, Dependency Graph.
**Events:** `ConstraintsResolved`, `OverConstrained`, `UnderConstrained`
**Extensibility:** Pluggable algorithms (e.g., swapping Newton-Raphson for specialized geometric heuristics).
**Testing Strategy:** Unit testing against known geometric configurations and over-constrained edge cases.
**Future Expansion:** Cloud-offloaded massive constraint solving for complex corrugated assemblies.

## 4. Dependency Graph
**Responsibilities:** Track dependencies between variables, AST nodes, and computed dimensions to ensure correct evaluation order.
**Public Interfaces:** `IDependencyGraph`, `addNode()`, `addDependency()`, `topologicalSort()`
**Internal Architecture:** Directed Acyclic Graph (DAG) with dirty-flag propagation.
**Folder Structure:** `/src/core/graph/`
**Dependencies:** None.
**Events:** `GraphDirtied`, `GraphEvaluated`, `CycleDetected`
**Extensibility:** Middleware for intercepting evaluation (e.g., logging or performance profiling).
**Testing Strategy:** Cyclic dependency detection tests; large-scale graph evaluation benchmarking.
**Future Expansion:** Multi-threaded graph evaluation using Web Workers.

## 5. Parametric Engine
**Responsibilities:** Bind user parameters (Length, Width, Depth, Material Thickness) to the Dependency Graph and AST to generate specific instances.
**Public Interfaces:** `IParametricEngine`, `applyParameters()`, `evaluate()`
**Internal Architecture:** Reactive evaluation context mapping variables to AST nodes.
**Folder Structure:** `/src/core/parametric/` (subfolders: `/bindings`, `/evaluators`)
**Dependencies:** Geometry AST, Dependency Graph, Constraint Solver.
**Events:** `ParametersUpdated`, `EvaluationCompleted`, `EvaluationFailed`
**Extensibility:** Support for custom parameter types (e.g., dropdowns, formulas, external API lookups).
**Testing Strategy:** Boundary testing for extreme parameter values (L=0, W=99999).
**Future Expansion:** Machine-learning-based parameter optimization.

## 6. History Engine & 7. Undo/Redo Engine
**Responsibilities:** Track state changes across the platform. Record immutable snapshots or event logs to allow non-destructive rollbacks.
**Public Interfaces:** `IHistoryEngine`, `commit()`, `undo()`, `redo()`, `squash()`
**Internal Architecture:** Command Pattern combined with Event Sourcing. State transitions are stored as inverse operations or immutable deltas.
**Folder Structure:** `/src/core/history/` (subfolders: `/commands`, `/snapshots`)
**Dependencies:** All engines modifying state.
**Events:** `StateCommitted`, `UndoPerformed`, `RedoPerformed`
**Extensibility:** Branching history (like Git) for exploring multiple design variations simultaneously.
**Testing Strategy:** Randomized commit/undo/redo sequences verifying state equivalence.
**Future Expansion:** Collaborative multiplayer history streams (CRDTs).

## 8. Feature Tree
**Responsibilities:** High-level CAD features (e.g., "Add Dust Flap", "Apply Material Thickness"). The user-facing abstraction of the AST.
**Public Interfaces:** `IFeatureTree`, `addFeature()`, `suppressFeature()`, `reorderFeature()`
**Internal Architecture:** Sequential or hierarchical list mapping high-level intents to underlying AST operations.
**Folder Structure:** `/src/core/features/` (subfolders: `/definitions`, `/tree`)
**Dependencies:** Geometry AST, History Engine.
**Events:** `FeatureAdded`, `FeatureSuppressed`, `FeatureFailed`
**Extensibility:** Plugin API for injecting third-party custom CAD features.
**Testing Strategy:** End-to-end testing mapping feature intents to final Geometry AST validation.
**Future Expansion:** Semantic feature recognition from imported flat DXFs.

## 9. Rule Engine
**Responsibilities:** Evaluate manufacturing logic (e.g., "If Width < 50, GlueTab = 12").
**Public Interfaces:** `IRuleEngine`, `evaluateRules()`, `addRule()`
**Internal Architecture:** Forward-chaining inference engine or simple expression evaluator processing conditions and actions.
**Folder Structure:** `/src/core/rules/` (subfolders: `/expressions`, `/evaluator`)
**Dependencies:** Parametric Engine.
**Events:** `RuleFired`, `RuleConflictDetected`
**Extensibility:** Support for domain-specific languages (DSL) or visually programmed rules (node graphs).
**Testing Strategy:** Truth table evaluation ensuring all rule permutations resolve correctly.
**Future Expansion:** Integration with LLMs to automatically generate logic rules from plain text specifications.

## 10. Template Engine
**Responsibilities:** Manage FEFCO, ECMA, and custom template lifecycle, bridging rules, ASTs, and metadata.
**Public Interfaces:** `ITemplateEngine`, `loadTemplate()`, `instantiateTemplate()`
**Internal Architecture:** Registry Pattern mapping string IDs to lazy-loaded template modules containing rules and AST generators.
**Folder Structure:** `/src/core/templates/` (subfolders: `/registry`, `/loaders`, `/fefco`, `/ecma`)
**Dependencies:** Geometry AST, Rule Engine, Feature Tree.
**Events:** `TemplateLoaded`, `TemplateInstantiated`
**Extensibility:** Dynamic fetching of templates from external cloud repositories.
**Testing Strategy:** Integration tests verifying every standard FEFCO template compiles without errors.
**Future Expansion:** Template hybridization (e.g., merging the top of an 0427 with the bottom of an 0201).

## 11. Material Physics Engine
**Responsibilities:** Calculate behavior of corrugated and folding carton materials (flute direction, stretch, bend allowance, thickness compensation).
**Public Interfaces:** `IMaterialEngine`, `getCompensation()`, `applyBendDeduction()`
**Internal Architecture:** Lookup tables combined with empirical non-linear compensation curves.
**Folder Structure:** `/src/core/material/` (subfolders: `/profiles`, `/compensation`, `/flutes`)
**Dependencies:** Geometry Kernel.
**Events:** `MaterialChanged`, `CompensationCalculated`
**Extensibility:** Allow users to define custom custom material stretch profiles via CSV upload.
**Testing Strategy:** Verification against real-world manufacturing data charts.
**Future Expansion:** Finite Element Analysis (FEA) for stress testing crush strength.

## 12. Manufacturing Engine & 13. Validation Engine
**Responsibilities:** Ensure the dieline can actually be manufactured. Checks machine limits, cutter clearances, kerf widths, and valid fold geometries.
**Public Interfaces:** `IManufacturingEngine`, `IValidationEngine`, `validateDieline()`, `getWarnings()`
**Internal Architecture:** Multi-pass validation pipeline running heuristics over the final generated geometry.
**Folder Structure:** `/src/core/manufacturing/` (subfolders: `/validators`, `/machine-profiles`)
**Dependencies:** Geometry Kernel, Material Physics Engine.
**Events:** `ValidationPassed`, `ValidationFailed`, `WarningsGenerated`
**Extensibility:** Custom machine profiles defining distinct validation constraints.
**Testing Strategy:** Unit tests injecting intentionally broken geometries (e.g., overlapping cuts) to ensure detection.
**Future Expansion:** Automatic correction algorithms that slightly alter parameters to force validation pass.

## 14. Collision Engine
**Responsibilities:** Detect self-intersections in the 2D flat state and 3D folded state.
**Public Interfaces:** `ICollisionEngine`, `checkFlatCollisions()`, `checkFoldedCollisions()`
**Internal Architecture:** Bounding Volume Hierarchies (BVH) or spatial hashing for fast broad-phase detection, exact intersection for narrow-phase.
**Folder Structure:** `/src/core/collision/` (subfolders: `/bvh`, `/intersection`)
**Dependencies:** Geometry Kernel, 3D Folding Engine.
**Events:** `CollisionDetected`
**Extensibility:** Interchangeable collision broad-phase algorithms.
**Testing Strategy:** High-density geometry stress tests.
**Future Expansion:** Continuous collision detection (CCD) during the fold animation timeline.

## 15. SVG Engine, 16. DXF Engine, 17. PDF Engine
**Responsibilities:** High-fidelity exporters mapping CAD geometry to industry-standard output files.
**Public Interfaces:** `IExportEngine`, `exportToSVG()`, `exportToDXF()`, `exportToPDF()`
**Internal Architecture:** Format-specific serializers. DXF uses strict line/arc generation; SVG handles styling and layers; PDF uses vector layout engines.
**Folder Structure:** `/src/exporters/` (subfolders: `/svg`, `/dxf`, `/pdf`, `/cf2`)
**Dependencies:** Geometry Kernel.
**Events:** `ExportStarted`, `ExportCompleted`, `ExportFailed`
**Extensibility:** Interface allows adding AI, CF2, CFF2, and ArtiosCAD exporters natively.
**Testing Strategy:** Binary file comparison and parse-back validation.
**Future Expansion:** Direct-to-machine streaming drivers (G-Code generation).

## 18. 3D Folding Engine
**Responsibilities:** Map 2D geometry onto a 3D scene. Calculate fold angles, kinematics, and animate the assembly.
**Public Interfaces:** `IFoldingEngine`, `generate3DMesh()`, `setFoldProgress()`
**Internal Architecture:** Kinematic chain solver. Maps cut/crease graphs into rigid bodies connected by hinge joints.
**Folder Structure:** `/src/core/3d-folding/` (subfolders: `/kinematics`, `/meshing`, `/animation`)
**Dependencies:** Geometry Kernel, Dependency Graph.
**Events:** `MeshGenerated`, `FoldProgressUpdated`
**Extensibility:** Pluggable renderers (Three.js presentation layer, BabylonJS, or server-side headless GL).
**Testing Strategy:** Matrix transformation validations preventing gimbal lock or tearing.
**Future Expansion:** Soft-body physics for realistic paper bending/warping.

## 19. Nesting Engine
**Responsibilities:** Optimize the layout of flat dielines on a master sheet (imposition) to minimize material waste.
**Public Interfaces:** `INestingEngine`, `calculateNesting()`, `getWastePercentage()`
**Internal Architecture:** 2D Irregular Bin Packing algorithm using No-Fit Polygons (NFP) and simulated annealing.
**Folder Structure:** `/src/core/nesting/` (subfolders: `/heuristics`, `/nfp`, `/packing`)
**Dependencies:** Geometry Kernel.
**Events:** `NestingStarted`, `NestingProgress`, `NestingCompleted`
**Extensibility:** Allow custom heuristics (e.g., restricting rotation to match flute direction).
**Testing Strategy:** Benchmarking against known optimal packing datasets.
**Future Expansion:** Cloud-based distributed nesting for massive run sizes.

## 20. Cost Engine
**Responsibilities:** Calculate exact pricing based on material usage, machine time, ink coverage, and nested sheet utilization.
**Public Interfaces:** `ICostEngine`, `calculateCost()`, `generateQuote()`
**Internal Architecture:** Rule-based pricing calculator aggregating data from Nesting, Geometry, and Material engines.
**Folder Structure:** `/src/core/cost/` (subfolders: `/calculators`, `/currency`, `/tariffs`)
**Dependencies:** Nesting Engine, Material Physics Engine.
**Events:** `QuoteGenerated`, `PriceUpdated`
**Extensibility:** Webhook integration to pull live material market prices.
**Testing Strategy:** Mock currency and metric evaluations.
**Future Expansion:** Predictive pricing using historical manufacturing analytics.

## 21. AI Packaging Assistant
**Responsibilities:** Act as an LLM bridge to translate natural language ("I need a box for a wine bottle") into Parametric Engine inputs.
**Public Interfaces:** `IAIEngine`, `parseNaturalLanguage()`, `suggestTemplates()`
**Internal Architecture:** NLP parser wrapping structured function-calling (e.g., Gemini function calling) mapped to the Template Engine.
**Folder Structure:** `/src/core/ai/` (subfolders: `/prompts`, `/parsers`, `/nlp`)
**Dependencies:** API Engine, Template Engine.
**Events:** `AIParsingStarted`, `AISuggestionReady`
**Extensibility:** Swappable underlying LLM models.
**Testing Strategy:** Prompt regression testing against a suite of 1000 standard user requests.
**Future Expansion:** Generative AI for fully custom dieline generation (zero-shot structural design).

## 22. Plugin Engine & 23. API Engine
**Responsibilities:** Allow third-party extensibility and headless execution of the entire kernel.
**Public Interfaces:** `IPluginManager`, `registerPlugin()`, `executeAPICommand()`
**Internal Architecture:** Middleware architecture (like Express) intercepting events. API Engine wraps the kernel in a REST/GraphQL layer.
**Folder Structure:** `/src/core/plugins/`, `/src/api/`
**Dependencies:** All core engines.
**Events:** `PluginLoaded`, `APIRequestReceived`
**Extensibility:** Full hooking system into the Dependency Graph and History Engine.
**Testing Strategy:** Mock plugin injection and isolation tests.
**Future Expansion:** Marketplace for community-built structural plugins.

## 24. Cloud Engine & 25. Versioning Engine
**Responsibilities:** Handle remote state synchronization, cloud rendering, and git-like versioning for CAD files.
**Public Interfaces:** `ICloudEngine`, `sync()`, `createBranch()`, `commitToCloud()`
**Internal Architecture:** CRDTs for real-time collaboration, Delta-encoding for efficient network serialization.
**Folder Structure:** `/src/core/cloud/`, `/src/core/versioning/`
**Dependencies:** History Engine, Undo/Redo Engine.
**Events:** `SyncStarted`, `MergeConflict`, `VersionCommitted`
**Extensibility:** Pluggable storage adapters (S3, Postgres, Firebase).
**Testing Strategy:** Network partition testing and conflict resolution testing.
**Future Expansion:** Enterprise workspace management and role-based branching.

## 26. Knowledge Base & 27. Security Layer
**Responsibilities:** Knowledge Base handles localized SEO, material specs, and documentation. Security handles robust IP protection, watermarking, and authentication.
**Public Interfaces:** `IKnowledgeBase`, `getSEOData()`, `ISecurity`, `validateLicense()`
**Internal Architecture:** Static site generation integrations (Knowledge Base) and robust cryptographic token verification (Security).
**Folder Structure:** `/src/core/knowledge/`, `/src/core/security/`
**Dependencies:** API Engine, Template Engine.
**Events:** `LicenseValidated`, `LicenseExpired`, `SecurityBreachDetected`
**Extensibility:** Integration with enterprise identity providers (SAML, OAuth).
**Testing Strategy:** Penetration testing and payload validation.
**Future Expansion:** Programmatic SEO engine generating millions of targeted landing pages dynamically.
