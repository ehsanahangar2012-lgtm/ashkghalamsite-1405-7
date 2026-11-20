# Snap-lock bottom reference comparison

Date: 2026-10-23  
Working branch: `upgrade/review-and-improvements`

## Reference

Reference generator: https://www.3dboxstudio.com/box-templates/snap-lock-bottom-box

The public page exposes a reproducible default case:
- Inside size: 70 × 70 × 80 mm
- Board: 20 pt preset (the page's numeric board-caliper value is not exposed in the text snapshot)
- Glue flap: 15 mm
- Tuck extension: 25 mm
- Top dust flaps: 33 mm
- Bottom side flaps: 33 mm
- Lock tongue projection: 17.5 mm
- Displayed flat envelope: 296.8 × 226 mm

The same page describes the required topology: four body panels and a tapered glue flap; a top flap whose main depth is the opening width plus the tuck extension; two tapered bottom side flaps; a two-thirds-depth receiver flap with an open half-moon notch; and an opposing flap with an integral locking tongue. Cut and crease geometry must remain separate.

## Changes made in this branch

- Rebuilt the `snap-lock-123` / `fefco-0215` baseline around the four-flap 1-2-3 topology.
- The top flap now uses the opening width plus the user-specified tuck extension. Previously, the engine treated the tuck extension as the entire top-flap depth.
- Replaced the isolated rectangular receiver slot with an edge-open half-moon notch.
- Separated the tuck locking slit from the back-panel thumb notch.
- Separated tongue width from tongue projection and bottom side-flap depth into independent parameters.
- Added a regression benchmark for the reference page's 70 × 70 × 80 mm case and expected 296.8 × 226 mm envelope, plus checks for the open notch, internal tuck slit, material-thickness response, and independent flap controls.

## Evidence and remaining verification

The reference page's rendered/default values and structural description were inspected. A downloadable reference SVG/DXF was **not** obtained through the available page reader, so this is currently a comparison against the published envelope and described construction—not a pixel/path-by-path comparison against the site's actual vector file.

The geometry regression script and Pages preview must be run and visually inspected before this engine is considered accepted. A matching envelope alone does not prove that the locking tabs fold, clear the board caliper, or close reliably. Do not use this baseline as production-certified until an exported reference vector or a physical folded sample is checked.
