# PHASE 7 — LOW-LEVEL GEOMETRY KERNEL ENGINE DESIGN (CAD CORE ENGINE)

## 1. HALF-EDGE STRUCTURE (FULL IMPLEMENTATION DESIGN)
The core topology is stored in contiguous typed arrays (Memory Pools) to prevent GC allocation overhead. Entity references are integer indices.

### Memory Layout
- **Vertex Pool (`Float64Array` + `Int32Array`)**: 
  - `coords` [x, y] (Float64, length 2N)
  - `incidentEdge` (Int32, length N): Index of one HalfEdge originating here.
- **HalfEdge Pool (`Int32Array`)**: Each HalfEdge takes 6 Int32 slots (length 6N).
  - `[0] origin`: Vertex index.
  - `[1] twin`: HalfEdge index.
  - `[2] next`: HalfEdge index.
  - `[3] prev`: HalfEdge index.
  - `[4] face`: Face index.
  - `[5] edgeData`: Index to geometric curve data (Line, Arc) stored in a separate pool.
- **Face Pool (`Int32Array` + `Array`)**:
  - `outerComponent` (Int32, length N): Index of one HalfEdge on the outer boundary.
  - `innerHoles` (Array of Int32 arrays): Indices of HalfEdges bounding holes.

### Mutation Rules & Traversal
- **Mutation**: Edges can only be inserted or deleted via strict Euler Operators (e.g., `makeEdgeFace`, `splitEdge`, `killEdge`). This mathematically guarantees manifold topology.
- **Traversal Algorithm (Face Perimeter)**:
  ```text
  function traverseFace(faceIndex):
      startEdge = facePool.outerComponent[faceIndex]
      currentEdge = startEdge
      loop:
          yield currentEdge
          currentEdge = halfEdgePool.next[currentEdge]
          if currentEdge == startEdge: break
  ```

## 2. GEOMETRY EXECUTION PIPELINE (DETAILED)
Transforms loose geometric parameters into a strict DCEL graph.

1. **Input Geometry**: Receive parameter definitions (e.g., `Panel(width=100, length=50)`).
2. **Normalize**: Convert curves/arcs into normalized representations (center, radius, start/end angles).
3. **Snap**: Pass all generated vertices through a Spatial Hash Grid. If a vertex lands within $\epsilon$ ($10^{-5}$) of an existing vertex, snap to the existing vertex index.
4. **Build Graph**: 
   - Insert vertices into Vertex Pool.
   - For each segment, allocate two HalfEdges in the HalfEdge Pool. Link `origin`, `twin`, `next`, and `prev`.
5. **Compute Relations**: Execute planar face extraction. Walk the `next` pointers of unassigned half-edges to identify enclosed polygons. Assign Face indices.
6. **Validate**: Run Euler characteristic check: $V - E + F = 2$ (for a single connected component).
7. **Store**: Commit pool indices and freeze generation.

## 3. BOOLEAN ENGINE (ALGORITHM LEVEL DESIGN)
Implementation based on the **Vatti Algorithm (2D Plane Sweep)**, optimized for general polygons with holes.

### Step-by-Step Execution
1. **Preparation**: Convert all operand polygon coordinates to 64-bit integer fixed-point ($1.0 = 10^6$).
2. **Vertex Event Queue**: Sort all vertices by Y-coordinate, then X-coordinate (Sweep line moves top to bottom).
3. **Active Edge List (AEL)**: Maintain edges intersecting the current sweep line, ordered by X-intercept.
4. **Processing Events**:
   - *Left/Right Minima*: Add two new edges to AEL.
   - *Left/Right Maxima*: Remove edges from AEL.
   - *Intersection*: Swap edge order in AEL. Create a new vertex at intersection.
5. **Winding Rule Classification**: 
   - Assign inside/outside flags to edges based on Non-Zero or Even-Odd winding rules during AEL transitions.
6. **Result Reconstruction**: 
   - Link output edges based on operation type (Union: keep edges bounding $Winding > 0$; Difference: invert operand B winding).
   - Trace linked edges to form output DCEL Faces.

## 4. INTERSECTION ENGINE (NUMERICAL CORE)

### Algorithms
- **Line-Line Intersection**:
  Calculated via 2D cross products.
  $t = \frac{(p_1 - p_3) \times d_2}{d_1 \times d_2}$, $u = \frac{(p_1 - p_3) \times d_1}{d_1 \times d_2}$
  If $0 \le t \le 1$ and $0 \le u \le 1$, intersection is $p_1 + t \cdot d_1$.
- **Line-Arc Intersection**:
  Substitute parametric line equation into circle equation $(x-c_x)^2 + (y-c_y)^2 = r^2$. Solved via quadratic formula. Reject roots outside the arc's angular domain.
- **Arc-Arc Intersection**:
  Find distance $d$ between centers. If $d > r_1 + r_2$ or $d < |r_1 - r_2|$, no intersection. Otherwise, solve for the radical line intersecting the line of centers.

### Degeneracy & Epsilon Handling
- **Collinearity**: If cross product $d_1 \times d_2 < 10^{-12}$, lines are parallel/collinear. Use interval overlap to find segment intersection.
- **Floating Point Correction**: Post-intersection coordinates are instantly snapped to the $\epsilon$-grid.

## 5. TOPOLOGY UPDATE ENGINE
Executes when a specific parameter (e.g., flap width) is mutated.

1. **Detect Affected Region**: Query Dependency Graph for nodes flagged `DIRTY`. Map nodes to Face indices.
2. **Invalidate Local Topology**: Mark incident HalfEdges and Vertices of the dirty Faces as `TOMBSTONE` in the memory pools.
3. **Rebuild Minimal Subgraph**: Recalculate geometry for dirty nodes. Run the Execution Pipeline (Snap $\to$ Build) ONLY for the new geometry.
4. **Validate Consistency**: Stitch new HalfEdges to the existing stable DCEL boundary. Ensure no dangling `twin` pointers exist.

## 6. SNAP & PRECISION SYSTEM (CRITICAL)

- **Epsilon Thresholds**: $\epsilon_{snap} = 10^{-5}$ mm.
- **Grid Snapping Strategy**: 
  Instead of exact float equality, all vertices are binned into a Spatial Hash Grid (cell size $10^{-4}$). 
  ```text
  function snap(x, y):
      cell = hash(floor(x/cell_size), floor(y/cell_size))
      for v in cell:
          if dist(x,y, v.x,v.y) < epsilon: return v.id
      return allocateNewVertex(x, y)
  ```
- **Vertex Merging Rules**: If an operation moves a vertex within $\epsilon$ of an edge, the edge is split (adding a new vertex) to prevent near-miss non-manifold geometry.
- **Floating Point Stabilization**: Rotations use pre-computed sine/cosine tables for standard angles (90, 180, 270) to prevent $0.000000000000001$ drift.

## 7. MEMORY MODEL (LOW LEVEL)

- **Adjacency Storage**: Strict integer arrays. A pointer is just an index (e.g., `twin_id = halfEdgePool[edge_id * 6 + 1]`).
- **Edge Pooling**: Array lengths are allocated in chunks of $2^{16}$. When filled, a new larger array is allocated, and old data is `TypedArray.prototype.set()` (blitted) over.
- **Cache Invalidation**: Changing a vertex coordinate increments a global `topology_version`. Caches (like bounding boxes or tessellated render buffers) checking this version will lazy-rebuild.

## 8. CAD OPERATION IMPLEMENTATION

### Offset Algorithm
1. **Input Transformation**: Extract Face boundary loop.
2. **Intermediate States**:
   - For each line segment, compute normal vector $\vec{n}$.
   - Shift segment by $d \cdot \vec{n}$.
   - For each vertex joining two segments, insert a connecting Arc (center=original vertex, radius=$d$) to bridge the shifted segments.
3. **Final Graph Update**: Run Boolean Union on the generated offset segments to resolve self-intersections (swallow tails) caused by concave corners.

### Chamfer Algorithm
1. **Input**: Vertex $V$, distance $d$.
2. **Execution**:
   - Find incoming edge $E_{in}$ and outgoing edge $E_{out}$.
   - Calculate points $P_1$ on $E_{in}$ and $P_2$ on $E_{out}$ at distance $d$ from $V$.
   - Split $E_{in}$ at $P_1$, split $E_{out}$ at $P_2$.
   - Delete corner half-edges.
   - Insert new half-edge connecting $P_1$ to $P_2$.

## 9. ERROR HANDLING SYSTEM

- **Self-Intersection Recovery**: Detected during the Vatti sweep-line. The engine halts the current topological mapping, treats the self-intersecting path as two separate operands, and forces a Boolean Union on them to heal the loop.
- **Invalid Polygon Repair**: If a generated face has Area $< \epsilon$, it is treated as a sliver. Its bounding half-edges are collapsed, merging the adjacent faces.
- **Broken Topology Reconstruction**: If `HE.twin.twin != HE`, the graph is corrupted. The engine raises a `TopologyFatalError`, dumps the memory pool state to a debug buffer, and rolls back to the last snapshotted generation.

## 10. PERFORMANCE ENGINE

- **Spatial Indexing (BVH)**: Bounding Volume Hierarchy tree over all Faces and Edges. Updates incrementally. Allows $O(\log N)$ selection, intersection, and boolean operand culling.
- **Dirty-Region Tracking**: Tracks the AABB of the mutated geometry. Only BVH nodes intersecting this AABB are updated.
- **Incremental Recomputation**: Boolean ops only calculate intersections within the overlapping AABB of Operand A and Operand B.
- **Multi-thread Execution Model**: 
  - Worker 1: Dependency Graph & Parametric solving.
  - Worker 2: DCEL generation & Booleans (Heavy Math).
  - Main Thread: Reads `SharedArrayBuffer` for WebGL/SVG tessellation rendering. No math runs on the UI thread.
