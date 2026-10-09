# PHASE 10 — CAD KERNEL v1 IMPLEMENTATION BLUEPRINT (STRICT CODE MAPPING)

## 1. CORE DATA STRUCTURES (EXACT CODE SHAPE)

```typescript
// Type Aliases for clarity (maps directly to TypedArray indices and primitive types)
type int32 = number;
type float64 = number;
type bigint64 = bigint;

export class MemoryPool {
  // VERTEX POOL
  public vX: BigInt64Array;            // [vId] -> x coordinate (scaled 10^6)
  public vY: BigInt64Array;            // [vId] -> y coordinate (scaled 10^6)
  public vIncidentEdge: Int32Array;    // [vId] -> heId

  // HALF-EDGE POOL
  public heOrigin: Int32Array;         // [heId] -> vId
  public heTwin: Int32Array;           // [heId] -> heId
  public heNext: Int32Array;           // [heId] -> heId
  public hePrev: Int32Array;           // [heId] -> heId
  public heFace: Int32Array;           // [heId] -> fId
  public heFlags: Int32Array;          // [heId] -> bitmask (CUT=1, CREASE=2)

  // FACE POOL
  public fOuter: Int32Array;           // [fId] -> heId
  public fHoleCount: Int32Array;       // [fId] -> number of holes
  public fHoles: Int32Array[];         // [fId] -> array of heIds

  // STATE
  public headV: int32 = 0;
  public headHE: int32 = 0;
  public headF: int32 = 0;
  public freeV: int32[] = [];
  public freeHE: int32[] = [];
  public freeF: int32[] = [];
  
  constructor(capacity: int32) {
    // Array buffer allocation logic here
  }
}

export interface GeometryGraph {
  nodes: Map<string, int32>;           // FeatureID -> FaceID or EdgeID
  bounds: Float64Array;                // [minX, minY, maxX, maxY]
  memory: MemoryPool;                  // Current active memory context
}

export interface ConstraintGraph {
  variables: Float64Array;             // Flat array of param values
  equations: ((vars: Float64Array) => float64)[]; // Residual evaluation fns
  dependencies: Int32Array[];          // [eqId] -> array of variable indices
}
```

## 2. CORE ENGINE CLASSES

```typescript
export class GeometryKernel {
  private pool: MemoryPool;
  private snapGrid: SpatialHashGrid;
  
  constructor(initialCapacity: int32) { ... }
  public allocateVertex(x: bigint64, y: bigint64): int32 { ... }
  public allocateHalfEdge(): int32 { ... }
  public allocateFace(): int32 { ... }
  public freeVertex(vId: int32): void { ... }
  public cloneState(): MemoryPool { ... }
  public restoreState(state: MemoryPool): void { ... }
}

export class TopologyEngine {
  constructor(private kernel: GeometryKernel) { ... }
  public linkEdges(prevId: int32, nextId: int32): void { ... }
  public makeFace(outerEdgeId: int32, holeEdgeIds: int32[]): int32 { ... }
  public getFaceArea(fId: int32): float64 { ... }
  public isManifold(): boolean { ... }
}

export class BooleanEngine {
  constructor(private kernel: GeometryKernel, private topo: TopologyEngine) { ... }
  public execute(opType: 'UNION' | 'DIFF' | 'INT', operandA: int32[], operandB: int32[]): int32[] { ... }
  private sweepLine(edges: int32[]): void { ... }
  private classifyEdges(): void { ... }
}

export class ConstraintSolver {
  constructor(private maxIterations: int32 = 256, private epsilon: float64 = 1e-5) { ... }
  public buildGraph(features: FeatureNode[]): ConstraintGraph { ... }
  public solve(graph: ConstraintGraph): void { ... } // Throws SolverDivergenceError
}

export class DependencyGraph {
  private adjList: Map<string, string[]>;
  private dirtyFlags: Set<string>;
  
  public markDirty(nodeId: string): void { ... }
  public topologicalSort(): string[] { ... } // Throws CyclicDependencyError
}

export class PrecisionEngine {
  public static SCALE: float64 = 1e6;
  public static toFixed(val: float64): bigint64 { ... }
  public static toFloat(val: bigint64): float64 { ... }
}
```

## 3. FUNCTIONAL API (REAL IMPLEMENTATION CONTRACT)

```typescript
// Contract Signatures
/** 
 * @mutates MemoryPool (vX, vY, vIncidentEdge)
 * @returns Allocated vertex ID 
 */
function createVertex(x: float64, y: float64): int32;

/**
 * @mutates MemoryPool (heOrigin, heTwin). Allocates TWO HalfEdges.
 * @returns Array of [heId1, heId2]
 */
function createEdge(v1Id: int32, v2Id: int32): [int32, int32];

/**
 * @mutates MemoryPool (heOrigin, heTwin, heNext, hePrev). Kills original edge.
 * @returns Array of the two new split HalfEdges [heIdA, heIdB]
 */
function splitEdge(edgeId: int32, pointVId: int32): [int32, int32];

/**
 * @mutates MemoryPool (heOrigin). Repoints all edges from v2 to v1. Kills v2.
 * @returns The surviving vertex ID (v1Id).
 */
function mergeVertices(v1Id: int32, v2Id: int32): int32;

/**
 * @mutates MemoryPool (vX, vY). Overwrites vertex coordinates.
 */
function applyTransform(targetIds: int32[], matrix: Float64Array): void;
```

## 4. BOOLEAN ENGINE IMPLEMENTATION MODEL (VATTI ALGORITHM)

**Algorithm:** Extended Vatti (Plane Sweep)
**Data Structures:**
- `EventQueue`: Min-Heap priority queue ordered by `y` (descending), then `x` (ascending).
- `ActiveEdgeList (AEL)`: Binary Search Tree of currently intersecting edges, sorted by x-intercept at current `y`.

**Implementation Flow:**
1. **Initialize**: Convert operand edge end-points to `EventQueue` nodes.
2. **Sweep**: `while(EventQueue.isNotEmpty())`
   - Pop vertex `V`.
   - Update `AEL` (Add edges starting at `V`, remove edges ending at `V`).
   - Check horizontal neighbor edges in `AEL` for intersections using Cross-Product.
   - If intersection found below current sweep line, push intersection vertex to `EventQueue` and call `splitEdge()`.
3. **Classify**: Assign Winding Number (WN) to each interval in AEL. Mark edges `KEEP` or `DISCARD` based on boolean operation truth table.
4. **Reconstruct**: Extract `KEEP` edges. Match ending `vId` of one edge to starting `vId` of another to re-link `next` pointers.

## 5. TOPOLOGY ENGINE IMPLEMENTATION

**Algorithms:**
- **CCW/CW Classification**: Calculate signed polygon area. $\text{Area} = 0.5 \times \sum (x_i y_{i+1} - x_{i+1} y_i)$. If Area $> 0$, CCW (Face boundary). If Area $< 0$, CW (Hole boundary).
- **Hole Assignment**: For each CW loop, cast a Ray $+x$ from its leftmost vertex. Count intersections with all CCW loops. Assign hole to the CCW loop with an odd intersection count immediately enclosing it.
- **Repair Strategy**: If an edge has no valid `twin`, allocate a dummy bounding twin on the exterior face.

## 6. CONSTRAINT SOLVER IMPLEMENTATION

**Solver Loop (Gauss-Seidel):**
```typescript
public solve(graph: ConstraintGraph): void {
  let iter = 0;
  let maxResidual = Infinity;
  
  while (iter < this.maxIterations && maxResidual > this.epsilon) {
    maxResidual = 0;
    for (let i = 0; i < graph.equations.length; i++) {
      const residual = graph.equations[i](graph.variables);
      if (Math.abs(residual) > maxResidual) maxResidual = Math.abs(residual);
      
      // Calculate numerical derivative (Jacobian approximation)
      const J = this.approximateJacobian(graph.equations[i], graph.variables, graph.dependencies[i]);
      
      // Apply delta
      this.applyCorrection(graph.variables, graph.dependencies[i], residual, J);
    }
    iter++;
  }
  
  if (iter === this.maxIterations) throw new SolverDivergenceError();
}
```

## 7. EXECUTION PIPELINE (CODE ORDER)

```typescript
// Strict Runtime Sequence executed per frame/update
1. const rawParams = Input.capture();
2. ValidationEngine.validateBounds(rawParams);
3. const template = TemplateEngine.load(rawParams.type);
4. const featureTree = template.buildGraph(rawParams);
5. DependencyGraph.sort(featureTree);
6. ConstraintSolver.solve(featureTree.constraints);
7. const rawEdges = featureTree.evaluateGeometry();
8. const outEdges = BooleanEngine.execute('UNION', rawEdges);
9. const finalDcel = TopologyEngine.reconstruct(outEdges);
10. CacheManager.commit(finalDcel);
11. RenderPipeline.triggerSync(finalDcel);
```

## 8. MODULE FILE STRUCTURE (REAL FOLDER MAP)

```text
/src
  /core
    /memory
      MemoryPool.ts            // TypedArray wrappers & free-lists
    /math
      PrecisionEngine.ts       // Float64 <-> BigInt64 scaling
      Matrix3.ts               // Affine transforms
  /topology
    GeometryKernel.ts          // Allocation APIs
    TopologyEngine.ts          // Face/Loop linking & Eulerian checks
  /booleans
    BooleanEngine.ts           // Sweep-line orchestrator
    EventQueue.ts              // Min-Heap
    ActiveEdgeList.ts          // BST
  /solver
    ConstraintSolver.ts        // Gauss-Seidel loop
    ConstraintGraph.ts         // Bipartite mapping
  /graph
    DependencyGraph.ts         // Kahn's Sort & Dirty flags
    FeatureNode.ts             // AST Node Base Class
  /templates
    TemplateEngine.ts          // Registry and bootstrapper
    /fefco
      F0427.ts                 // Concrete Parametric Modules
```

## 9. ERROR HANDLING MODEL

```typescript
try {
  // Capture snapshot before hazardous math
  const snapshot = kernel.cloneState(); 
  
  executeCADPipeline(inputs);
  
} catch (error) {
  if (error instanceof SolverDivergenceError) {
    // Over-constrained or conflicting rules
    kernel.restoreState(snapshot);
    UI.dispatch('ERROR_CONSTRAINTS', error.details);
  } else if (error instanceof BooleanCorruptionError) {
    // Non-manifold float drift (rare)
    kernel.restoreState(snapshot);
    UI.dispatch('ERROR_TOPOLOGY', 'Geometry collapsed during union.');
  } else {
    throw error; // Unhandled fatal error
  }
}
```

## 10. IMPLEMENTATION RULES
1. **NO CLASSES FOR RAW DATA**: Do not instantiate `new Vertex()` or `new Edge()`. Access data purely via `MemoryPool.vX[id]`.
2. **DETERMINISTIC TYPING**: Use `Int32Array` for all indices. Use `BigInt64Array` for all un-scaled geometric math.
3. **ISOLATION**: The renderer (React/ThreeJS/SVG) may ONLY read from the `MemoryPool`. It is strictly forbidden from importing `GeometryKernel` write-methods.
4. **ERROR PROPAGATION**: State mutation must be deferred until AFTER `ConstraintSolver` converges successfully to ensure atomic transactions.
