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
- Board-caliper handling currently applies a bounded flap/slot clearance heuristic. The engine does **not** yet implement selectable inside/outside/score-to-score dimension conventions or full fold-compensation equations across all styles. The user interface must disclose this limitation, and physical sample/reference-drawing checks remain required.

## Engineering decisions

- No runtime dependency was added for the UI redesign.
- Product L/W/H remains conceptually separate from overall flat dieline bounds; glue tabs, flaps, and closures contribute to the latter.
- Keep canvas, geometry engine, and exporters independently testable.
- Reference drawings and physical folded prototypes remain acceptance evidence for production claims; generic path checks are not industrial certification.

## Intersection-audit coverage (2026-10-23)

- The generated SVG path checker flags proper crossings, non-adjacent endpoint contacts, and collinear overlaps within each cut path. Normal adjacent corners are excluded, and the first/last segment pair is excluded only when the path is actually closed. Regression coverage includes an ordinary closed rectangle, an open path whose first and last segments cross, endpoint-on-segment contact, and collinear overlap.
- To avoid quadratic checks causing preview stalls, pairwise intersection scanning is capped at 20,000 segment pairs per audit. If the cap is reached, a warning is shown that the intersection review was truncated; absence of a detected crossing after truncation is not proof that the whole path is clear.
- The audit remains a structural screen. It does not infer polygon topology across separate SVG paths, identify all manufacturing collisions between independent cut and crease layers, or replace reference drawings and folded samples.

## Generated-geometry validation (2026-10-23)

- The dieline studio now runs `runComprehensiveGeometryCheck` on the generated SVG cut/fold paths before enabling file export or saving a project. It reports estimated cut/fold lengths and structural warnings; a detected self-intersection or validator error disables export/save rather than presenting the output as ready for manufacturing.
- This is a defensive path-structure check, not a complete topology, fold simulation, dimension-convention, die-maker, or physical-sample validation. A passing status must not be described as manufacturing certification.
