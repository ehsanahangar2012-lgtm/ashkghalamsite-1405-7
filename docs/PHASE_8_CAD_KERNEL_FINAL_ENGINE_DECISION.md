# PHASE 8 — CAD KERNEL FINAL ENGINE DECISION (ARCHITECTURAL LOCK)

## 1. FINAL GEOMETRY REPRESENTATION (LOCKED)
**Decision**: **Doubly-Connected Edge List (DCEL) / Half-Edge Structure**.

### Data Structure & Memory Layout
The system uses a strictly mutable internal execution state utilizing typed array memory pools, encapsulated within an immutable boundary for the rest of the application.

- **Vertex Pool (`Int32Array`)**: 
  - `x`, `y` (Stored as scaled 64-bit integers split across two Int32s or using `BigInt64Array`).
  - `incidentEdge` (Int32 pointer).
- **Half-Edge Pool (`Int32Array`)**:
  - `[origin, twin, next, prev, face, curveDataIndex]`.
- **Face Pool (`Int32Array` + `Array`)**:
  - `outerComponent` (Int32 pointer).
  - `innerComponents` (Array of Int32 pointers for holes).

### Mutation Strategy
- **Internal**: Mutable. The Boolean engine directly mutates array indices during graph construction to avoid allocation overhead.
- **External**: Immutable. Once a topological operation finishes, the memory pool is frozen. A new generation copies the pool (or utilizes persistent data structures) for subsequent operations.

## 2. FINAL BOOLEAN ENGINE SELECTION (LOCKED)
**Decision**: **Martinez-Rueda-Feito (Extended Vatti) 2D Plane Sweep Algorithm**.

### Execution Pipeline
1. **Subdivision**: Compute all intersections between Operand A and Operand B. Split edges at intersection points to ensure no two edges intersect except at endpoints.
2. **Event Queue Sort**: Sweep-line moves from bottom to top, left to right. Vertices are processed as events.
3. **Edge Classification (Winding Rule)**: During the sweep, edges are classified strictly by their transition states. 
   - Rule: An edge is kept for `UNION` if it transitions from $A_{out} \to A_{in}$ while inside $B$, or vice-versa.
4. **Reconstruction**: The output is a set of directed non-intersecting segments. The engine links `next` and `prev` pointers by matching endpoints.

## 3. FINAL TOPOLOGY MODEL (LOCKED)
- **Face Construction**: After boolean classification, unlinked edges are traversed counter-clockwise (CCW). A closed loop defines a Face.
- **Hole Handling**: Clockwise (CW) loops are classified as holes. A spatial point-in-polygon test determines which CCW Face contains the CW hole, linking it to the Face's `innerComponents`.
- **Edge Classification**: Edges carry bitmask flags: `0x01` (CUT), `0x02` (CREASE), `0x04` (PERFORATION). These are preserved through boolean operations.
- **Loop Validation**: Eulerian path validation ensures every vertex in a loop has exactly one incoming and one outgoing half-edge belonging to that loop.

## 4. FINAL PRECISION MODEL (LOCKED)
**Decision**: **Hybrid Fixed-Point Integer Engine**.

- **Parametric Math**: `Float64` for evaluating angles, sines, and formulas.
- **Topology & Booleans**: `Int64` (Scaled Fixed-Point). 
  - Scale factor: $10^6$ ($1 \text{ unit} = 0.000001 \text{ mm}$).
- **Snapping Rules**: Before any boolean operation, all Float64 coordinates are multiplied by $10^6$ and rounded to the nearest integer. No two vertices can exist closer than $10^{-6}$ mm.
- **Error Accumulation**: Prevented absolutely. Because all vertices are snapped to an integer grid, intersection tests yield exact, deterministic integer results (or exact rational fractions during intermediate steps).

## 5. FINAL EXECUTION PIPELINE (LOCKED)
The deterministic, linear execution flow of the kernel:

1. **Input Geometry**: Receive parameter definitions.
2. **Normalize**: Convert curves to dense polylines based on chord-error tolerance, resolve all formulas to `Float64`.
3. **Snap**: Scale by $10^6$, round to `Int64`, map to Spatial Hash Grid.
4. **Build Graph**: Allocate Vertices and Half-Edges in memory pools.
5. **Boolean Ops**: Run Martinez-Rueda sweep-line on the integer geometry.
6. **Topology Reconstruction**: Extract faces and holes from the boolean output graph.
7. **Validation**: Check Area $> 0$ and Eulerian consistency.
8. **Cache**: Write output coordinates to a read-only `SharedArrayBuffer`.
9. **Output**: Trigger event for renderers (SVG/DXF/3D) to read the buffer.

## 6. ERROR RECOVERY FINAL STRATEGY (LOCKED)
- **Failure Detection**: 
  - If boolean reconstruction fails to close a loop.
  - If a face area resolves to $0$.
- **Automatic Repair System**:
  - The engine applies a micro-perturbation (shift vertices by prime integer offsets like $+3, -7$ at the $10^{-6}$ scale) and retries the Boolean operation.
- **Rollback System (Safe-State)**:
  - If perturbation fails (max retries = 3), the kernel throws a `GeometryPanic`.
  - The active Memory Pool is discarded. The engine instantly restores the pointer to the previous frame's Memory Pool. The UI is notified of a "Constraint Violation / Invalid Geometry".

## 7. PERFORMANCE MODEL FINAL DECISION (LOCKED)
- **Spatial Indexing**: **Dynamic AABB Tree (BVH)**. Used for fast point-in-polygon tests and culling boolean operands.
- **Incremental Recomputation**: At the node level, boolean operations are only applied to the bounding box of the geometric difference. If a flap changes, only the union of that flap and its parent panel is recomputed.
- **Memory Optimization**: Static typed array capacities (e.g., $2^{20}$ edges). Garbage Collection is entirely eliminated from the critical execution path.
- **Parallel Execution**: Main thread (UI) $\to$ Worker A (Parametric Evaluator & Graph Builder) $\to$ Worker B (Integer Boolean Engine). Data is passed via `SharedArrayBuffer`.

## 8. SYSTEM GUARANTEES (LOCKED)
The CAD Kernel mathematically guarantees the following:
1. **No Invalid Geometry Output**: The system will never output a non-manifold shape, open loop, or self-intersecting polygon. It will rollback rather than output corruption.
2. **Deterministic Results**: Given the same parametric inputs, the exact same integer binary output is generated across any device, browser, or architecture.
3. **Reproducibility**: Undo/Redo states perfectly recreate the geometry byte-for-byte.
4. **Absolute Stability**: Floating-point drift is mathematically impossible within the topological boolean engine due to the strict 64-bit integer grid lock.
