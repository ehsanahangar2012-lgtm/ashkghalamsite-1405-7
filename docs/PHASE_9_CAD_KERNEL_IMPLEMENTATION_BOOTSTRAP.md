# PHASE 9 — CAD KERNEL IMPLEMENTATION BOOTSTRAP (CODE-READY DESIGN)

## 1. CORE GEOMETRY DATA STRUCTURES (CODE-READY)

To satisfy the fixed-point integer precision and zero-allocation memory constraints, the core structures are implemented using a Structure of Arrays (SoA) pattern backed by `Int32Array` and `BigInt64Array`.

### Memory Layout (TypeScript/C++ Compatible)
```typescript
class GeometryMemoryPool {
  // Vertices: [x, y, incidentEdgeId]
  verticesX: BigInt64Array; 
  verticesY: BigInt64Array;
  vertexIncidentEdge: Int32Array; 

  // HalfEdges: [origin, twin, next, prev, face, flags]
  edgeOrigin: Int32Array;
  edgeTwin: Int32Array;
  edgeNext: Int32Array;
  edgePrev: Int32Array;
  edgeFace: Int32Array;
  edgeFlags: Int32Array;

  // Faces: [outerComponent, holeCount, ...holeComponents]
  faceOuter: Int32Array;
  faceHoles: Int32Array[]; // Ragged array or flattened pointer array
}
```

### Mutability & Lifecycle Rules
- **Mutability**: Arrays are strictly mutated *only* by the `GeometryKernelAPI` and `BooleanEngine`. 
- **Lifecycle**: Memory is pre-allocated. Objects are never instantiated via `new`. Entities are created by advancing a `head` pointer. Deletions add indices to a `freeList` array for $O(1)$ recycling.

## 2. CORE GEOMETRY KERNEL API

Low-level topological operators (Euler Operators) that maintain DCEL validity.

- **`createVertex(x: bigint, y: bigint): int32`**
  - *Input*: Scaled 64-bit integer coordinates.
  - *Output*: `vertexId`.
  - *Side Effects*: Writes to `verticesX`, `verticesY`. If `freeList` has capacity, pops index; otherwise increments `head`.
  - *Invariants*: `vertexIncidentEdge` initialized to `-1`.

- **`createHalfEdge(originId: int32): int32`**
  - *Input*: Target `vertexId`.
  - *Output*: `halfEdgeId`.
  - *Side Effects*: Sets `edgeOrigin[id] = originId`.
  - *Invariants*: Requires a subsequent `linkEdges()` to satisfy manifold topology.

- **`createFace(outerBoundaryEdgeId: int32, holesEdgeIds: int32[]): int32`**
  - *Input*: ID of one edge on the outer loop, array of IDs for inner loops.
  - *Output*: `faceId`.
  - *Side Effects*: Traverses all edges in the loops and sets `edgeFace[e] = faceId`.

- **`splitEdge(edgeId: int32, vertexId: int32): [int32, int32]`**
  - *Input*: Edge to split, Vertex to insert.
  - *Output*: Array of two new `halfEdgeId`s.
  - *Side Effects*: Kills original edge. Allocates two new edges. Updates `next`/`prev` of adjacent edges.
  - *Invariants*: Preserves face associations and topological orientation.

- **`mergeVertices(v1Id: int32, v2Id: int32): int32`**
  - *Input*: Two vertices within $\epsilon$ distance.
  - *Output*: The surviving `vertexId`.
  - *Side Effects*: Re-points all `edgeOrigin` references from `v2Id` to `v1Id`. Frees `v2Id`.

- **`updateTopology(): boolean`**
  - *Input*: None.
  - *Output*: `true` if manifold, `false` if corrupted.
  - *Side Effects*: Executes Eulerian characteristic validation ($V - E + F = 2$ per connected component).

## 3. BOOLEAN ENGINE IMPLEMENTATION FLOW

**Execution Step-by-Step:**
1. **Build Edge Intersection Graph**:
   - Execute Bentley-Ottmann sweep-line on all HalfEdges.
   - Upon detecting intersection, invoke `splitEdge()` on both intersecting edges at the exact computed intersection vertex.
2. **Classify Segments**:
   - Traverse the DCEL. Fire a ray from the midpoint of each edge.
   - Count intersections with Operand A and Operand B boundaries (Even-Odd rule).
   - Tag `edgeFlags` with `INSIDE_A`, `OUTSIDE_A`, `INSIDE_B`, `OUTSIDE_B`.
3. **Build Intermediate Faces**:
   - Filter edges based on Boolean operation (e.g., for Union, drop edges tagged `INSIDE_A` or `INSIDE_B`).
4. **Reconstruct Output Faces**:
   - For all surviving edges, match endpoints.
   - Write new `next`/`prev` pointers to form closed loops.
   - Call `createFace()` on closed CCW loops.
5. **Validate Topology**:
   - Call `updateTopology()`. Throw `BooleanCorruptionError` if failed.

## 4. CONSTRAINT SOLVER IMPLEMENTATION FLOW

**Execution Step-by-Step:**
1. **Constraint Collection**: 
   - Walk Feature Tree. Extract all constraint definitions (e.g., `Width = 100`, `Length = Width * 2`, `GlueTab >= 15`).
2. **Graph Building**: 
   - Create Bipartite Graph of Variables (V) and Equations (E).
3. **Dependency Ordering**: 
   - Run Tarjan’s Strongly Connected Components algorithm.
   - DAG components are scheduled for direct forward-evaluation.
   - Cyclic components are grouped into "Islands".
4. **Solving Loop (Gauss-Seidel)**:
   - For each Island: Initialize variables.
   - Iterate: Calculate Jacobians, apply $\Delta v$, project to satisfy bounds (e.g., clamp `GlueTab` to $15$).
5. **Convergence Check**:
   - If $\max(\text{residuals}) < 10^{-5}$, Break.
   - If `iterations > 256`, Throw `SolverDivergenceException`.

## 5. EXECUTION PIPELINE (CODE ORDER)

```typescript
function executeCADPipeline(inputs: CADParameters): CADResult {
  // 1. Input Parameters
  const params = ParamRegistry.parse(inputs);
  
  // 2. Template instantiation
  const template = TemplateFactory.instantiate(params.templateId);
  
  // 3. Geometry graph build
  const featureTree = template.buildFeatureTree(params);
  
  // 4. Constraint solving
  ConstraintSolver.solve(featureTree.getConstraints());
  
  // 5. Boolean operations
  const rawGeometry = featureTree.evaluateGeometry();
  const booleanResult = BooleanEngine.execute(rawGeometry);
  
  // 6. Topology rebuild
  const dcel = TopologyEngine.reconstruct(booleanResult);
  
  // 7. Validation
  ValidationEngine.assertManifold(dcel);
  
  // 8. Cache update
  MemoryManager.commitToCache(dcel);
  
  // 9. Render output
  return RenderAdapter.extractBuffers(dcel);
}
```

## 6. MODULE STRUCTURE (FINAL)

- **`geometry-core`**: 
  - *Responsibilities*: Math primitives, typed array memory pool management.
  - *Inputs/Outputs*: Raw numbers $\leftrightarrow$ Array indices.
  - *Dependencies*: None.
- **`topology-engine`**:
  - *Responsibilities*: DCEL management, Euler operators, face traversal.
  - *Inputs/Outputs*: Edge creation commands $\leftrightarrow$ Validated DCEL graph.
  - *Dependencies*: `geometry-core`.
- **`boolean-engine`**:
  - *Responsibilities*: Plane sweep, edge splitting, winding classification.
  - *Inputs/Outputs*: Unstructured edges $\leftrightarrow$ Boolean filtered edges.
  - *Dependencies*: `geometry-core`, `topology-engine`.
- **`constraint-solver`**:
  - *Responsibilities*: Gauss-Seidel iteration, linear algebra matrices.
  - *Inputs/Outputs*: Variable definitions $\leftrightarrow$ Solved variable values.
  - *Dependencies*: None (pure math).
- **`dependency-graph`**:
  - *Responsibilities*: Dirty flagging, topological sorting.
  - *Inputs/Outputs*: Parameter changes $\leftrightarrow$ Execution order queue.
  - *Dependencies*: None.
- **`template-engine`**:
  - *Responsibilities*: Mapping FEFCO standards to feature nodes.
  - *Inputs/Outputs*: Template ID $\leftrightarrow$ Feature Tree.
  - *Dependencies*: `constraint-solver`, `dependency-graph`.
- **`precision-engine`**:
  - *Responsibilities*: Float64 $\leftrightarrow$ Fixed-Point conversion, Spatial Hashing.
  - *Inputs/Outputs*: Floats $\leftrightarrow$ Scaled BigInts.
  - *Dependencies*: None.
- **`validation-engine`**:
  - *Responsibilities*: Eulerian checks, Area checks, Self-intersection checks.
  - *Inputs/Outputs*: DCEL $\leftrightarrow$ Boolean (Valid/Invalid).
  - *Dependencies*: `topology-engine`.

## 7. PERFORMANCE & MEMORY MODEL

- **Object Pooling Strategy**: Initialized at worker boot ($10^6$ capacity). Re-allocated (doubled) only when `head > capacity`. 
- **Incremental Recomputation**: Feature nodes track a `versionHash`. If `hash(inputs)` matches cache, skip generation and return cached array slice.
- **Caching Layers**: 
  - L1: Evaluated parametric numbers.
  - L2: Pre-boolean local geometry (e.g., individual unmerged flaps).
  - L3: Final tessellated WebGL/SVG buffers.
- **Graph Pruning Strategy**: Branches of the feature tree marked `suppressed = true` are skipped during traversal and unlinked from the dependency graph.

## 8. IMPLEMENTATION RULES

1. **NO CIRCULAR DEPENDENCIES**: Modules must strictly follow a downward dependency graph.
2. **NO GLOBAL MUTABLE STATE**: All state must be encapsulated within a specific `CADContext` or `MemoryPool` instance to allow multi-threading and concurrent evaluations.
3. **DETERMINISTIC OUTPUTS REQUIRED**: `Math.random()` and date/time seeds are strictly forbidden. All hash functions must be deterministic (e.g., Murmur3).
4. **FULL REPRODUCIBILITY REQUIRED**: Passing the exact same JSON parameter payload MUST yield byte-for-byte identical output buffers, on every run, on every machine.
