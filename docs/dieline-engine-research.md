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
- **sbarrak/packbox** — https://github.com/sbarrak/packbox  
  MIT license: https://github.com/sbarrak/packbox/blob/main/LICENSE. Source reviewed: `src/geometry/boxBuilders.ts`, `src/geometry/shapes.ts`, and `src/geometry/types.ts`. Useful techniques: per-style panel builders, explicit parent-edge/offset hinges, separate fold angles, per-wall flap-depth resolution, chamfered dust-flap polygons, and one structural model for flat/folded views. No PackBox source was copied in the canvas UI commit; this is a candidate for a separately tested model-by-model refactor.

## Source audit findings

- `STANDARD_DIELINE_ENGINES` currently exposes **21 registry keys**, not 19. Aliases/shared implementations include: `default-rsc` + `fefco-0201`; `fefco-0300` + `fefco-0301` + `fefco-0320`; `fefco-0427` + `fefco-0409` + `fefco-0470`; `snap-lock-123` reusing `fefco0215Engine`; `ecma-a30` reusing the tuck-end function; and `ecma-c1020` now has a dedicated two-blank tray-plus-sleeve baseline, and `ecma-d50` has a separate custom display-tray baseline; neither is certified as an exact ECMA design. Shared code does not prove equivalent standard geometry.
- The DXF parser converts `LINE`, `LWPOLYLINE`, `POLYLINE`, `ARC`, and `CIRCLE` into line segments. Recognized `$INSUNITS` values (inches, feet, miles, millimetres, centimetres, metres, kilometres, microinches, mils, yards) are normalized to millimetres; unitless or unrecognized unit codes preserve source coordinates rather than being guessed. Legacy `POLYLINE` closed flags are honored, and `LWPOLYLINE` bulge arcs are tessellated into short line segments. Simple top-level `INSERT` references are expanded for common line/polyline/arc/circle block contents with insertion point, rotation, uniform scale, and block base-point handling. Nested inserts, non-uniformly scaled curves inside blocks, external references, and reliable L/W/H anchor mapping are not fully supported. Standalone `SPLINE` entities with valid control points/knots are now tessellated using rational B-spline evaluation; native editable curves are not preserved. Curves are tessellated, not preserved as native arcs; line semantics are inferred from layer names.
- The imported-DXF scaling helper preserves source coordinates rather than mapping known anchors to new L/W/H values. Arbitrary imported art must not be presented as correctly rescaled when dimensions change.

## Engineering decisions

- No runtime dependency was added for the UI redesign.
- Product L/W/H remains conceptually separate from overall flat dieline bounds; glue tabs, flaps, and closures contribute to the latter.
- Keep canvas, geometry engine, and exporters independently testable.
- Reference drawings and physical folded prototypes remain acceptance evidence for production claims; generic path checks are not industrial certification.
