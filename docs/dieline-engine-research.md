# Dieline engine research notes

Updated: 2026-10-23. This records technical guidance and licensing decisions; it does not claim every template is certified against a production standard.

## Sources reviewed

- **FEFCO Code** — https://www.fefco.org/technical-information/fefco-code  
  Official corrugated packaging style classification. An ID does not certify that generated geometry matches every drawing, board grade, manufacturing allowance, or converter-specific requirement.
- **ECMA Code of Folding Carton Design Styles** — https://www.ecma.org/publications/ecma-sales-toolkit.html and public 2022 code PDF: https://ecma.org/uploads/Bestanden/ECMA%20Sales%20Toolkit/ECMA%20Support%20Tools/New%202022/ECMA%20Codes%20EN%202022.pdf  
  Structural reference for folding cartons. The complete toolkit is described as member-only; copyrighted drawings should not be copied without confirming reuse rights.
- **Packmage Box Library / parametric design guidance** — https://www.packmage.com/Home/BoxLibrary and https://www.packmage.com/Cad/Document  
  Useful for comparing model categories, product dimensions versus flattened dieline bounds, and board-caliper/secondary parameters. Packmage is commercial; no Packmage code was copied.
- **GIGAJOHUB/OpenDieline** — https://github.com/GIGAJOHUB/OpenDieline  
  Reviewed repository metadata and README: millimetre-based parametric RTE, cut/fold/bleed/safe-zone semantics, and zoomable/pannable SVG viewport. No root LICENSE file was visible in the repository file listing during review. Its source is **not copied or ported** until a clear license is confirmed.
- **BrownBear127/open-dieline** — https://github.com/BrownBear127/open-dieline  
  A newer source-available reference advertises parametric RTE and telescope-box patterns, hinge-based 3D preview, separate CUT/CREASE/HALFCUT export layers, and production-validation workflows. Its published license is **PolyForm Noncommercial 1.0.0**; do not copy or port its implementation into a commercial product without a separate commercial license. Use only general engineering observations and independently written code unless reuse rights are confirmed.
- **sbarrak/packbox** — https://github.com/sbarrak/packbox  
  MIT license: https://github.com/sbarrak/packbox/blob/main/LICENSE. Source reviewed: `src/geometry/boxBuilders.ts`, `src/geometry/shapes.ts`, and `src/geometry/types.ts`. Useful techniques: per-style panel builders, explicit parent-edge/offset hinges, separate fold angles, per-wall flap-depth resolution, chamfered dust-flap polygons, and one structural model for flat/folded views. No PackBox source was copied in the canvas UI commit; this is a candidate for a separately tested model-by-model refactor.

## Source audit findings

- `STANDARD_DIELINE_ENGINES` currently exposes **21 registry keys**, not 19. Aliases/shared implementations include: `default-rsc` + `fefco-0201`; `fefco-0300` + `fefco-0301` + `fefco-0320`; `fefco-0427` + `fefco-0409` + `fefco-0470`; `snap-lock-123` reusing `fefco0215Engine`; `ecma-a30` reusing the tuck-end function; and `ecma-c1020` now has a dedicated two-blank tray-plus-sleeve baseline, and `ecma-d50` has a separate custom display-tray baseline; neither is certified as an exact ECMA design. Shared code does not prove equivalent standard geometry.
- The DXF parser converts `LINE`, `LWPOLYLINE`, `POLYLINE`, `ARC`, and `CIRCLE` into line segments. Recognized `$INSUNITS` values (inches, feet, miles, millimetres, centimetres, metres, kilometres, microinches, mils, yards) are normalized to millimetres; unitless or unrecognized unit codes preserve source coordinates rather than being guessed. Legacy `POLYLINE` closed flags are honored, and `LWPOLYLINE` bulge arcs are tessellated into short line segments. Simple top-level `INSERT` references are expanded for common line/polyline/arc/circle block contents with insertion point, rotation, uniform scale, and block base-point handling. Nested inserts, non-uniformly scaled curves inside blocks, external references, and reliable L/W/H anchor mapping are not fully supported. Standalone `SPLINE` entities with valid control points/knots are now tessellated using rational B-spline evaluation; native editable curves are not preserved. Curves are tessellated, not preserved as native arcs; line semantics are inferred from layer names.
- The imported-DXF scaling helper preserves source coordinates rather than mapping known anchors to new L/W/H values. Arbitrary imported art must not be presented as correctly rescaled when dimensions change.

## FEFCO 0200-series geometry review (2026-10-23)

- FEFCO 0201 flap-height reference reviewed: https://www.theessentialimage.com/Packaging%20Catalogue/Html5_Packaging/Corrugated_Standards_Library/FEFCO_Standards_Library/F_0200/0201/0201_Flaps_Parameters.htm . Its 0201 flap-height parameter is based on W/2 plus a fold correction; the engine now uses W-based half-depths consistently for 0201 instead of incorrectly extending the width-panel flaps by L/2.
- FEFCO 0204 is modeled separately as the width-panel-meeting variant: width-panel flaps extend by L/2 while length-panel flaps use W/2. FEFCO 0203 uses W-based full-overlap flap depth. These are parametric baselines, not manufacturer-calibrated tooling.
- The 0200-series blank-area metric now estimates body-panel area plus flap area using the selected style's flap layout. For other engine families, the area remains a box-surface proxy and must not be interpreted as a validated blank-area or waste calculation.
- The FEFCO 0200-family baseline now supports an explicit inside/outside dimension convention, adds board caliper to score-to-score panel dimensions for inside inputs, and exposes the opposing-flap slot gap as a separate parameter. For FEFCO 0201 inside dimensions, its current blank envelope follows `2(L+t) + 2(W+t) + glueTab` by `H+t + 2((W+t-slotGap)/2)`, i.e. `H + W + 2t - slotGap`. The 0204 baseline assigns the longer flap depth to the W-wide panels so they meet at the centre. These are explicit parametric assumptions, not a universal die-maker crease rule; board grade, flute profile, score-channel width, grain direction, and machine tolerances still require calibration. Dimension conventions and complete fold compensation are **not** implemented for all other template families.

## Engineering decisions

- No runtime dependency was added for the UI redesign.
- Product L/W/H remains conceptually separate from overall flat dieline bounds; glue tabs, flaps, and closures contribute to the latter.
- Keep canvas, geometry engine, and exporters independently testable.
- Reference drawings and physical folded prototypes remain acceptance evidence for production claims; generic path checks are not industrial certification.

## Intersection-audit coverage (2026-10-23)

- Same-path cut validation rejects non-adjacent crossings, contacts, and collinear overlaps; ordinary adjacent corners are excluded, and the first/last segment pair is treated as adjacent only for a genuinely closed path.
- A separate cross-path audit now compares different cut paths and cut paths against crease paths. Proper cut/cut crossings, duplicate cut segments, cut/crease crossings, and cut/crease overlap are hard errors. Shared endpoint contacts are allowed. T-junctions among separate cut paths are warnings because they can be intentional where a slit reaches the edge of a shorter neighboring flap; these warnings require a visual check.
- When exact bounds are supplied by the generator, every parsed cut and crease segment is checked against the declared `xMin/yMin/xMax/yMax` envelope, and the declared width/height must agree with those bounds within 0.1 mm. Out-of-bounds geometry or inconsistent bounds blocks export/save.
- To keep preview work bounded, same-path checks cap at 20,000 candidate pairs and cross-path checks cap at 50,000 overlapping bounding-box pairs. Reaching either cap produces a warning; no result after a truncated scan is proof of complete geometric validity.
- Regression fixtures cover separate cut-path crossing, a cut crossing through a crease, a legal crease endpoint terminating at the blank edge, and a path extending outside its stated bounds. The whole registered engine suite also feeds actual generated path bounds into the audit for three different dimension/material test sets.
- This audit still does not perform a true folded 3D collision simulation, infer exact material deformation or crease-matrix compensation, or certify a physical sample. It is a stronger defensive check, not manufacturing certification.

## Active dieline page and FEFCO 0200-family correction (2026-10-23)

- The public `/tools/dieline` route now opens the parametric studio directly. Previously, that studio was only available through a separate fullscreen overlay inside the legacy, much larger `DielineGenerator`, whose default CAD tab displayed a simplified schematic. This meant the main geometry/UI changes were not visible on the route the user actually opened.
- The 0200-family engine now uses single orthogonal outer flap edges plus one shared slit per panel boundary. It no longer creates decorative diagonal flap shoulders or duplicates both sides of shared slit segments as separate knife paths. The glue-flap top and bottom edges are explicitly present.
- Inside and outside dimension conventions are implemented in this family only. Inside dimensions add caliper to panel score-to-score widths and wall height; outside dimensions resolve to the requested external dimensions. Slot gap is a separate user parameter rather than being silently conflated with caliper. SVG viewBox margins were also increased for dimension annotations, and the preview no longer forces a fixed minimum height that could distort the aspect ratio.
- The main preview has been switched to a consistent light technical canvas with the grid off by default, to keep the cut/fold geometry readable. This visual change is secondary to the geometry correction.
- The FEFCO 0200-family templates are the current corrected slotted-case baseline group. The 0301 tray-lid and 0320 half-slotted telescope patterns now have distinct parametric construction models, but remain calibration baselines rather than certified copies of official die drawings. Other FEFCO/ECMA entries remain unverified starting shapes unless individually checked against an authoritative drawing.

## Telescope-family geometry correction (2026-10-23)

- The FEFCO Code describes 0300 as the telescope-box family; it is not a single uniquely defined cutting pattern. The UI now labels that option as a generic family example rather than presenting it as an exact 0300 standard. Official family reference: https://www.fefco.org/technical-information/fefco-code .
- FEFCO 0301 is modeled as two separate tray-style blanks: an inner base and a cover tray. The tray contour is one closed orthogonal outline with four corner tabs; score paths identify the base perimeter and tab hinges. The cover blank's nominal inside plan size is enlarged from the base by `2t + fit` in L and W, where `fit = max(0.8 mm, 0.5t)`. This is a configurable starting clearance, not a universal fit allowance. Comparative reference: https://cardboardshaper.com/fefco-codes/0301/ .
- FEFCO 0320 is now constructed from two independent FEFCO 0200-style half-slotted blanks instead of the previous approximate generic telescope shape. The cover has its own plan-size allowance and independently controlled side-wall depth. Reference description: https://www.wellpappe-wissen.de/wissen/wellpappen-verpackung/typen-und-formen/deckelschachtel-typen.html .
- `lidHeight` is an explicit engine/UI input and is preserved in JSON export and project metadata for 0300/0301/0320. Main `H` controls base/body depth; the lid wall depth is no longer silently forced to a fraction of `H` when the user supplies a different value.
- The tray blank uses inside dimensions by default; its score-to-score panel L/W and wall depths include the current basic caliper allowance. The cover-sizing fit amount, tray glue-tab width, score compensation and slot relief are still model-level heuristics. Validate against the exact variant drawing, actual flute/board caliper, crease matrix and a folded sample before production.

## Generated-geometry validation (2026-10-23)

- The dieline studio now runs `runComprehensiveGeometryCheck` on the generated SVG cut/fold paths before enabling file export or saving a project. It reports estimated cut/fold lengths and structural warnings; a detected self-intersection, non-adjacent contact, collinear overlap, or other validation error makes the audit fail and blocks export/save rather than presenting the output as ready for manufacturing.
- This is a defensive path-structure check, not a complete topology, fold simulation, dimension-convention, die-maker, or physical-sample validation. A passing status must not be described as manufacturing certification.

## Cross-path geometry corrections (2026-10-23)

- The stricter audit exposed duplicated knife paths at adjacent lock-flap seams. Snap-lock shoulder outlines now use angled entry/exit edges rather than overlapping vertical side cuts; one diagonal mark duplicated on a lock cut edge was removed from the crease layer.
- Tuck-end dust flaps now use a single tapered outline at shared seams. This removes duplicate cut segments where a deep tuck flap meets a shorter adjacent dust flap. The straight-tuck outer tongue edge is treated as cut perimeter, not as a second crease.
- The generic sleeve outline is now rectangular so its vertical panel scores terminate on the true top/bottom cut edges rather than crossing a skewed outline. The pizza-box baseline no longer places crease segments directly on outer cut edges.
- The preview shows counts for cut/cut crossings, cut/crease crossings, overlaps, T-junction warnings and out-of-bounds segments. It also displays diagnostic path IDs/coordinates when available, and blocks SVG/DXF export plus project saving on hard validation errors.
- Reference drawings were checked against the official FEFCO 12th-edition design-style library: https://www.fefco.org/technical-information/fefco-code and https://www.fefco.org/sites/default/files/documents/2022-10-17_FEFCO%20Code_BOOKLET_single_A5_HR.pdf. FEFCO's code labels define structural families; a family number alone does not guarantee the generated blank matches a converter's exact tooling.
- Process notes on fold geometry, board caliper, crease channel and glued-tab sizing were also compared with Packmage's folding-carton die-board design article: https://www.packmage.com/about/article/296-B_Folding_carton_die-board_design. These are manufacturing variables rather than universal fixed constants, so the engine keeps its fit rules labelled as starting assumptions.
- GitHub Actions regression run for commit `2680ed11363a99a19eb3fecddd5e24dc0248f858` passed the 21-engine, three-dimension geometry suite, test fixtures and both branch/main builds. UI diagnostic-detail changes followed in commit `a24c02153883b398c0ef6b25a72252126ca38881`; their final build/deploy must be verified separately before declaring that newer commit published.
