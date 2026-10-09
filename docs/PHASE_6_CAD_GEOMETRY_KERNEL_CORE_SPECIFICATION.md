# PHASE 6 — CAD GEOMETRY KERNEL CORE SPECIFICATION (ENGINE LEVEL DESIGN)

## 1. CORE GEOMETRY MEMORY MODEL (CRITICAL)

### Geometry Entity Memory Layout
To ensure cache locality, prevent garbage collection pauses, and maintain high performance during parametric updates, geometry is modeled using a hybrid Structure of Arrays (SoA) and Object Pool approach.

**Entity Definition (Logical Abstraction):**
- `entityId`: 32-bit unsigned integer (index into the memory pool).
- `type`: Enum (POINT=0, LINE=1, ARC=2, SPLINE=3, FACE=4).
- `rawParameters`: TypedArray slice containing base definition (e.g., center, radius, angles).
- `computedCache`: `Float64Array` containing tessellated points for rendering/booleans.
- `topologyLinks`: Pointers (entityIds) to half-edges or incident topological nodes.
- `versionHash`: 64-bit integer representing the state of parametric inputs.
- `precisionState`: Enum (FLOAT64=0, FIXED_INT=1).

**Memory Strategy:**
- **Immutable State during Evaluation**: Evaluation cycles read from the current generation buffers and write to the next generation buffers.
- **Memory Pooling**: Arrays (`Float64Array`, `Int32Array`) are pre-allocated (e.g., capacity for 100,000 vertices). No `new Object()` calls are allowed inside the calculation loops.
- **Object Lifecycle**: Entities are allocated from a free-list. When a structural feature is deleted, its `entityId` is pushed back to the free-list for $O(1)$ recycling.

## 2. HALF-EDGE / TOPOLOGY STRUCTURE (MANDATORY)

Boundary Representation (B-Rep) relies on a strict **Doubly-Connected Edge List (DCEL)** or Half-Edge Data Structure. This defines exactly how geometric boundaries enclose faces (panels).

**Data Structures (Using Typed Arrays):**
- **Vertex (V)**:
  - `coordinate`: [x, y]
  - `incidentEdge`: ID of one half-edge originating from this vertex.
- **Half-Edge (HE)**:
  - `origin`: Vertex ID.
  - `twin`: ID of the opposing half-edge (same segment, opposite direction).
  - `face`: ID of the face this half-edge bounds.
  - `next`: ID of the next half-edge in the face loop.
  - `prev`: ID of the previous half-edge.
  - `curve`: ID of the underlying geometry (Line, Arc).
- **Face (F)**:
  - `outerComponent`: ID of a half-edge on the outer boundary.
  - `innerComponents`: Array of IDs of half-edges on holes/cutouts.

**Queries Supported in O(1) or O(E):**
- Adjacency queries: "Which faces share this crease?" (`HE.twin.face`).
- Boundary traversal: Walk the perimeter of a flap by following `HE.next`.
- Region segmentation: Identify separate physical pieces after a cut operation.

## 3. GEOMETRY COMPUTATION ENGINE

Operates strictly on the mathematical abstractions before converting to fixed-point for booleans.

**Exact Algorithms:**
- **Line-Line Intersection**: Solved via 2D cross products (Cramer's rule). Uses robust predicates (e.g., Jonathan Shewchuk's robust orientation tests) to handle collinear/parallel cases accurately.
- **Line-Arc / Arc-Arc Intersection**: Reduces to finding the roots of a quadratic equation. Rejects imaginary roots.
- **Curve Evaluation**: Bézier curves are evaluated using adaptive recursive subdivision (De Casteljau's algorithm) combined with flatness tolerance ($\epsilon$) to generate a dense polyline for boolean operations.
- **Offset Computation**: Generates parallel curves. For sharp corners, inserts circular arcs (Miter/Round joins) to ensure exact geometric offsets without self-intersection artifacts.

**Numerical Stability Rules:**
- Angles are normalized to $[-\pi, \pi]$.
- Near-zero values $< 10^{-12}$ are flushed to exactly $0.0$ during algebraic evaluations to prevent NaN cascading.

## 4. BOOLEAN ENGINE (CRITICAL CORE)

The core mechanism for joining panels, applying cutouts, and merging geometry.

**Execution Phases (Vatti / Martinez-Rueda Algorithm):**
1. **Conversion**: Convert all `Float64` coordinates to scaled 64-bit integers (Fixed-Point). $1.0 = 10^6$ units.
2. **Sweep Line Phase**: Detect all intersections. Break intersecting segments at the exact intersection point.
3. **Graph Construction**: Build the topological graph of non-intersecting edges.
4. **Classification**: 
   - Classify edges as `INSIDE`, `OUTSIDE`, or `SHARED` relative to the operand polygons.
5. **Extraction**:
   - **Union ($A \cup B$)**: Extract edges where $A_{OUT}$ and $B_{OUT}$.
   - **Intersection ($A \cap B$)**: Extract edges where $A_{IN}$ and $B_{IN}$.
   - **Difference ($A \setminus B$)**: Extract edges where $A_{OUT}$ and $B_{IN}$ (inverted).

**Robustness Handling:**
- Degenerate cases (overlapping collinear edges, vertices landing exactly on edges) are handled intrinsically by the exact-integer coordinates and robust orientation predicates.

## 5. TOPOLOGY REBUILD ENGINE

When parameter values change, geometry shifts, requiring topology updates.

**Rebuild Strategy:**
- **Incremental Rebuild**: If a topological change is structurally isolated (e.g., changing the width of a single dust flap), only the specific Half-Edges bounding that flap are updated. The rest of the DCEL remains intact.
- **Full Rebuild Fallback**: If a parameter change drastically alters intersections (e.g., a window cutout now overlaps the outer boundary), the engine discards the current DCEL and triggers a full boolean regeneration of the layout.
- **Invalid Geometry Repair**: If a non-manifold edge is detected (e.g., a "bowtie" polygon), the engine performs a "union with itself" boolean operation to auto-heal the shape into distinct manifold regions.

## 6. GEOMETRY VALIDATION ENGINE

Executes a post-computation verification pass.

**Checks & Corrections:**
- **Self-Intersection**: Checked via Bentley-Ottmann sweep-line on the final boundary. (Correction: Auto-heal via self-union).
- **Overlapping Edges**: Detect duplicate Half-Edges. (Correction: Merge colinear segments).
- **Invalid Faces / Zero-Area**: Discard any face where the absolute computed area $< \epsilon$.
- **Broken Loops**: Ensure every `HE.next.origin == HE.origin` in a loop. (Correction: Halt execution, flag topology corruption, revert to previous state).

## 7. PRECISION & NUMERICAL STABILITY MODEL

- **Precision Model**: Fixed-point hybrid. Parametric dimensions evaluated in `Float64`. Boolean intersections and topological decisions made in `Int64` scaled space ($10^{-6}$ mm resolution).
- **Epsilon ($\epsilon$)**: $10^{-5}$ mm.
- **Snapping Strategy**: Before inserting a new vertex into the DCEL, search a spatial hash map for existing vertices within $\epsilon$. If found, snap to the existing vertex to ensure airtight topology.
- **Cumulative Error Correction**: Transformation matrices (translation/rotation) are applied to the *original* local coordinates of a feature, never iteratively applied frame-over-frame.

## 8. CAD OPERATIONS CORE SET

Operations manipulating the fundamental topology.

- **Translate ($T$)**: 
  - *Rule*: $p' = p + \Delta$.
  - *Execution*: Vector addition on all vertices in a Region.
- **Rotate ($R$)**:
  - *Rule*: $p' = M_{rot} \times p$.
  - *Execution*: Matrix multiplication around a defined pivot vertex.
- **Scale ($S$)**: 
  - *Rule*: $p' = M_{scale} \times p$.
- **Mirror**: 
  - *Rule*: Reflection across a vector line.
  - *Edge Case*: Reverses the winding order of the polygon. The engine must invert all Half-Edge `next`/`prev` pointers to restore CCW winding.
- **Offset**: 
  - *Execution*: Compute normal vectors for all segments. Translate segments by $d$ along normals. Compute new intersections for extended segments.
- **Fillet / Chamfer**:
  - *Rule*: Replace a vertex joining two segments with an arc (Fillet) or line segment (Chamfer).
  - *Execution*: Calculate tangent points on adjacent edges. Split edges at tangent points. Insert the new Arc/Line node into the DCEL.

## 9. RENDERING ABSTRACTION LAYER

The Geometry Kernel computes abstract mathematically perfect curves. It exposes an exact read-only buffer to renderers.

**Derived Outputs:**
- **SVG**: Tessellates Arcs and Curves into quadratic/cubic SVG commands. Maps topology metadata (e.g., `edge.type = CREASE`) to SVG stroke properties.
- **DXF**: Exports pure geometrical arcs and lines directly from the AST. Organizes layers based on topological face data.
- **3D Mesh**: Extracts the planar polygon boundaries, runs Earcut triangulation, and maps crease edges to hinge matrices for kinematics.

*Constraint*: Renderers hold no state and can never invoke mutations on the Geometry Kernel.

## 10. PERFORMANCE MODEL

- **Spatial Indexing**: Implements a **Bounding Volume Hierarchy (BVH)** using AABB (Axis-Aligned Bounding Boxes) for all geometric entities. Allows $O(\log n)$ querying for intersections and point-in-polygon tests.
- **Incremental Recomputation**: Subgraphs that have not been modified by parameter changes return cached bounding boxes and coordinate buffers.
- **Multithreading Strategy**: The entire Geometry Kernel executes within a Web Worker. Computation-heavy tasks (like nesting thousands of complex polygons) utilize WebAssembly (WASM) compiled from C++ or Rust for near-native performance.

## 11. FAILURE RECOVERY SYSTEM

Protects against numerical collapse.

- **Geometry Corruption Recovery**: If a boolean operation yields a mathematically impossible state (e.g., an arc with negative radius), the operation is trapped.
- **Invalid Boolean Resolution**: If exact-integer clipping fails due to extreme degenerate vertex clustering, a micro-perturbation ($\pm 10^{-7}$) is applied to the input vertices, and the boolean is retried.
- **Rollback System**: Upon unrecoverable topology failure, the kernel drops the current mutated memory buffers, signals a `KernelPanic` event, and swaps the active pointer back to the previous generation's valid state buffer.
