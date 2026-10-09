// PHASE 11 — CAD KERNEL v1 FIRST IMPLEMENTATION

export type int32 = number;
export type float64 = number;

/**
 * 1. CORE DATA STRUCTURES
 * Simple Memory Pool implementation for V1.
 */
export class MemoryPool {
  public vX: Float64Array;
  public vY: Float64Array;
  public vIncidentEdge: Int32Array;

  public heOrigin: Int32Array;
  public heTwin: Int32Array;
  public heNext: Int32Array;
  public hePrev: Int32Array;
  public heFace: Int32Array;

  public fOuter: Int32Array;

  public headV: int32 = 0;
  public headHE: int32 = 0;
  public headF: int32 = 0;

  constructor(capacity: int32 = 10000) {
    this.vX = new Float64Array(capacity);
    this.vY = new Float64Array(capacity);
    this.vIncidentEdge = new Int32Array(capacity).fill(-1);

    this.heOrigin = new Int32Array(capacity).fill(-1);
    this.heTwin = new Int32Array(capacity).fill(-1);
    this.heNext = new Int32Array(capacity).fill(-1);
    this.hePrev = new Int32Array(capacity).fill(-1);
    this.heFace = new Int32Array(capacity).fill(-1);

    this.fOuter = new Int32Array(capacity).fill(-1);
  }
}

/**
 * 2. GEOMETRY KERNEL
 * Manages allocation and low-level mutations.
 */
export class GeometryKernel {
  public pool: MemoryPool;

  constructor(capacity: int32 = 10000) {
    this.pool = new MemoryPool(capacity);
  }

  public createVertex(x: float64, y: float64): int32 {
    const id = this.pool.headV++;
    this.pool.vX[id] = x;
    this.pool.vY[id] = y;
    this.pool.vIncidentEdge[id] = -1;
    return id;
  }

  public createHalfEdge(originId: int32): int32 {
    const id = this.pool.headHE++;
    this.pool.heOrigin[id] = originId;
    if (this.pool.vIncidentEdge[originId] === -1) {
      this.pool.vIncidentEdge[originId] = id;
    }
    return id;
  }

  public createEdge(v1: int32, v2: int32): [int32, int32] {
    const he1 = this.createHalfEdge(v1);
    const he2 = this.createHalfEdge(v2);

    this.pool.heTwin[he1] = he2;
    this.pool.heTwin[he2] = he1;

    return [he1, he2];
  }

  public splitEdge(edgeId: int32, vId: int32): [int32, int32] {
    const twinId = this.pool.heTwin[edgeId];
    const nextId = this.pool.heNext[edgeId];
    const prevTwinId = this.pool.hePrev[twinId];

    const newHe1 = this.createHalfEdge(vId);
    const newTwin1 = this.createHalfEdge(this.pool.heOrigin[twinId]);

    this.pool.heTwin[newHe1] = newTwin1;
    this.pool.heTwin[newTwin1] = newHe1;
    this.pool.heOrigin[twinId] = vId;

    // Link next/prev
    this.pool.heNext[edgeId] = newHe1;
    this.pool.hePrev[newHe1] = edgeId;
    this.pool.heNext[newHe1] = nextId;
    if (nextId !== -1) this.pool.hePrev[nextId] = newHe1;

    this.pool.hePrev[twinId] = newTwin1;
    this.pool.heNext[newTwin1] = twinId;
    this.pool.hePrev[newTwin1] = prevTwinId;
    if (prevTwinId !== -1) this.pool.heNext[prevTwinId] = newTwin1;

    return [newHe1, newTwin1];
  }

  public mergeVertices(v1: int32, v2: int32): int32 {
    // Re-point all edges originating from v2 to v1
    for (let i = 0; i < this.pool.headHE; i++) {
      if (this.pool.heOrigin[i] === v2) {
        this.pool.heOrigin[i] = v1;
      }
    }
    return v1; // v2 is abandoned (leaked in V1 for simplicity)
  }

  public createFace(outerEdgeId: int32): int32 {
    const fId = this.pool.headF++;
    this.pool.fOuter[fId] = outerEdgeId;
    
    let current = outerEdgeId;
    do {
      this.pool.heFace[current] = fId;
      current = this.pool.heNext[current];
    } while (current !== -1 && current !== outerEdgeId);
    
    return fId;
  }
}

/**
 * 3. BASIC TOPOLOGY ENGINE
 */
export class TopologyEngine {
  constructor(private kernel: GeometryKernel) {}

  public link(prevEdge: int32, nextEdge: int32) {
    this.kernel.pool.heNext[prevEdge] = nextEdge;
    this.kernel.pool.hePrev[nextEdge] = prevEdge;
  }

  public detectFaces(): void {
    const pool = this.kernel.pool;
    const visited = new Set<int32>();

    for (let i = 0; i < pool.headHE; i++) {
      if (!visited.has(i)) {
        const path = [];
        let curr = i;
        do {
          visited.add(curr);
          path.push(curr);
          curr = pool.heNext[curr];
        } while (curr !== -1 && curr !== i && !visited.has(curr));

        if (curr === i) {
          // Closed loop found
          this.kernel.createFace(i);
        }
      }
    }
  }
}

/**
 * 4. BASIC BOOLEAN ENGINE (MINIMAL)
 */
export class BooleanEngine {
  constructor(private kernel: GeometryKernel) {}

  // Basic intersection detection between segments
  public executeNaiveUnion(): void {
    const pool = this.kernel.pool;
    let foundIntersection = true;

    // Extremely naive O(N^2) intersection check for V1
    while (foundIntersection) {
      foundIntersection = false;
      
      const edgeCount = pool.headHE;
      for (let i = 0; i < edgeCount; i+=2) { // iterate over pairs
        for (let j = i + 2; j < edgeCount; j+=2) {
          const v1a = pool.heOrigin[i];
          const v1b = pool.heOrigin[pool.heTwin[i]];
          
          const v2a = pool.heOrigin[j];
          const v2b = pool.heOrigin[pool.heTwin[j]];

          const pt = this.getIntersection(
            pool.vX[v1a], pool.vY[v1a], pool.vX[v1b], pool.vY[v1b],
            pool.vX[v2a], pool.vY[v2a], pool.vX[v2b], pool.vY[v2b]
          );

          if (pt) {
            const vInt = this.kernel.createVertex(pt.x, pt.y);
            this.kernel.splitEdge(i, vInt);
            this.kernel.splitEdge(j, vInt);
            foundIntersection = true;
            break;
          }
        }
        if (foundIntersection) break;
      }
    }
  }

  private getIntersection(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom === 0) return null;
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    if (ua > 0 && ua < 1 && ub > 0 && ub < 1) {
      return { x: x1 + ua * (x2 - x1), y: y1 + ua * (y2 - y1) };
    }
    return null;
  }
}

/**
 * 5. CONSTRAINT SOLVER (MINIMAL)
 */
export class ConstraintSolver {
  private params = new Map<string, float64>();
  private constraints: Array<() => void> = [];

  public set(key: string, value: float64) {
    this.params.set(key, value);
    this.propagate();
  }

  public get(key: string): float64 {
    return this.params.get(key) || 0;
  }

  public addRule(rule: () => void) {
    this.constraints.push(rule);
  }

  public propagate() {
    // Simple V1 evaluation loop
    for (let i = 0; i < 3; i++) {
      for (const rule of this.constraints) {
        rule();
      }
    }
  }
}

/**
 * 6. EXECUTION PIPELINE
 */
export class CadExecutionPipeline {
  public kernel = new GeometryKernel();
  public topology = new TopologyEngine(this.kernel);
  public booleans = new BooleanEngine(this.kernel);
  public solver = new ConstraintSolver();

  public runTemplate(length: number, width: number): string {
    // 1. Input Parameters
    this.solver.set('length', length);
    this.solver.set('width', width);

    // 2. Constraints (L >= 10)
    this.solver.addRule(() => {
      if (this.solver.get('length') < 10) this.solver.set('length', 10);
      if (this.solver.get('width') < 10) this.solver.set('width', 10);
    });
    this.solver.propagate();

    const L = this.solver.get('length');
    const W = this.solver.get('width');

    // 3. Geometry Graph Build
    const v1 = this.kernel.createVertex(0, 0);
    const v2 = this.kernel.createVertex(L, 0);
    const v3 = this.kernel.createVertex(L, W);
    const v4 = this.kernel.createVertex(0, W);

    const [e1, t1] = this.kernel.createEdge(v1, v2);
    const [e2, t2] = this.kernel.createEdge(v2, v3);
    const [e3, t3] = this.kernel.createEdge(v3, v4);
    const [e4, t4] = this.kernel.createEdge(v4, v1);

    this.topology.link(e1, e2);
    this.topology.link(e2, e3);
    this.topology.link(e3, e4);
    this.topology.link(e4, e1);

    // 4. Booleans (noop here, but run for pipeline correctness)
    this.booleans.executeNaiveUnion();

    // 5. Topology Rebuild
    this.topology.detectFaces();

    // 6. Output SVG
    return this.renderSVG();
  }

  private renderSVG(): string {
    const pool = this.kernel.pool;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 200 200">\n';
    
    // Draw all faces
    for (let f = 0; f < pool.headF; f++) {
      let path = 'M ';
      const startEdge = pool.fOuter[f];
      let curr = startEdge;
      do {
        const vId = pool.heOrigin[curr];
        path += `${pool.vX[vId]},${pool.vY[vId]} L `;
        curr = pool.heNext[curr];
      } while (curr !== -1 && curr !== startEdge);
      path = path.slice(0, -2) + 'Z';
      svg += `  <path d="${path}" fill="none" stroke="black" stroke-width="1"/>\n`;
    }
    
    svg += '</svg>';
    return svg;
  }
}

// Example Execution
// const pipeline = new CadExecutionPipeline();
// const output = pipeline.runTemplate(100, 50);
// console.log(output);
