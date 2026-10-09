// PHASE 12 — CAD KERNEL VALIDATION & ENGINE STABILIZATION

export type int32 = number;
export type float64 = number;

const EPSILON = 1e-6;

function fuzzyEq(a: float64, b: float64): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * 1. PRECISION & FLOATING POINT STABILITY
 * Epsilon snapping applied to vertices upon creation.
 */
export class PrecisionEngine {
  public static snap(value: float64): float64 {
    return Math.round(value / EPSILON) * EPSILON;
  }
}

/**
 * 2. CORE DATA STRUCTURES
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

  constructor(capacity: int32 = 20000) {
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
 * 3. GEOMETRY KERNEL WITH VALIDATION
 */
export class GeometryKernel {
  public pool: MemoryPool;

  constructor(capacity: int32 = 20000) {
    this.pool = new MemoryPool(capacity);
  }

  public createVertex(x: float64, y: float64): int32 {
    const sx = PrecisionEngine.snap(x);
    const sy = PrecisionEngine.snap(y);

    // Merge duplicate vertices to prevent degenerate geometry
    for (let i = 0; i < this.pool.headV; i++) {
      if (fuzzyEq(this.pool.vX[i], sx) && fuzzyEq(this.pool.vY[i], sy)) {
        return i;
      }
    }

    const id = this.pool.headV++;
    this.pool.vX[id] = sx;
    this.pool.vY[id] = sy;
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
    if (v1 === v2) throw new Error("Degenerate edge: v1 and v2 are identical.");

    const he1 = this.createHalfEdge(v1);
    const he2 = this.createHalfEdge(v2);

    this.pool.heTwin[he1] = he2;
    this.pool.heTwin[he2] = he1;

    return [he1, he2];
  }

  public splitEdge(edgeId: int32, vId: int32): [int32, int32] {
    const twinId = this.pool.heTwin[edgeId];
    if (twinId === -1) throw new Error("Cannot split broken half-edge (no twin).");
    
    const nextId = this.pool.heNext[edgeId];
    const prevTwinId = this.pool.hePrev[twinId];

    const newHe1 = this.createHalfEdge(vId);
    const newTwin1 = this.createHalfEdge(this.pool.heOrigin[twinId]);

    this.pool.heTwin[newHe1] = newTwin1;
    this.pool.heTwin[newTwin1] = newHe1;
    this.pool.heOrigin[twinId] = vId;

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

  public createFace(outerEdgeId: int32): int32 {
    const fId = this.pool.headF++;
    this.pool.fOuter[fId] = outerEdgeId;
    
    let current = outerEdgeId;
    let safeGuard = 0;
    do {
      this.pool.heFace[current] = fId;
      current = this.pool.heNext[current];
      if (safeGuard++ > 10000) throw new Error("Infinite loop detected in face construction.");
    } while (current !== -1 && current !== outerEdgeId);
    
    return fId;
  }
}

/**
 * 4. TOPOLOGY INTEGRITY ENGINE
 */
export class TopologyEngine {
  constructor(private kernel: GeometryKernel) {}

  public link(prevEdge: int32, nextEdge: int32) {
    this.kernel.pool.heNext[prevEdge] = nextEdge;
    this.kernel.pool.hePrev[nextEdge] = prevEdge;
  }

  public validateTopology(): boolean {
    const pool = this.kernel.pool;
    let valid = true;

    for (let i = 0; i < pool.headHE; i++) {
      const twin = pool.heTwin[i];
      if (twin === -1) {
        console.error(`Edge ${i} has no twin.`);
        valid = false;
      } else if (pool.heTwin[twin] !== i) {
        console.error(`Twin of twin of ${i} does not match.`);
        valid = false;
      }

      const next = pool.heNext[i];
      if (next !== -1 && pool.hePrev[next] !== i) {
        console.error(`Next/Prev mismatch between ${i} and ${next}.`);
        valid = false;
      }
    }
    return valid;
  }

  public detectFaces(): void {
    const pool = this.kernel.pool;
    const visited = new Set<int32>();

    for (let i = 0; i < pool.headHE; i++) {
      if (!visited.has(i) && pool.heNext[i] !== -1) {
        let curr = i;
        let isClosedLoop = false;
        let safeGuard = 0;
        const currentLoop = new Set<int32>();

        do {
          visited.add(curr);
          currentLoop.add(curr);
          curr = pool.heNext[curr];
          if (safeGuard++ > 10000) break;
        } while (curr !== -1 && !currentLoop.has(curr));

        if (curr === i) {
          isClosedLoop = true;
          this.kernel.createFace(i);
        }
      }
    }
  }
}

/**
 * 5. BOOLEAN ENGINE FIX & HARDENING
 */
export class BooleanEngine {
  constructor(private kernel: GeometryKernel) {}

  public resolveSelfIntersections(): void {
    const pool = this.kernel.pool;
    let foundIntersection = true;
    let iterations = 0;

    // Hardened intersection loop with limits to prevent divergence
    while (foundIntersection && iterations++ < 50) {
      foundIntersection = false;
      const edgeCount = pool.headHE;
      
      for (let i = 0; i < edgeCount; i += 2) {
        for (let j = i + 2; j < edgeCount; j += 2) {
          const v1a = pool.heOrigin[i];
          const v1b = pool.heOrigin[pool.heTwin[i]];
          const v2a = pool.heOrigin[j];
          const v2b = pool.heOrigin[pool.heTwin[j]];

          // Skip adjacent edges
          if (v1a === v2a || v1a === v2b || v1b === v2a || v1b === v2b) continue;

          const pt = this.getIntersection(
            pool.vX[v1a], pool.vY[v1a], pool.vX[v1b], pool.vY[v1b],
            pool.vX[v2a], pool.vY[v2a], pool.vX[v2b], pool.vY[v2b]
          );

          if (pt) {
            const vInt = this.kernel.createVertex(pt.x, pt.y);
            // Only split if the vertex is actually new (not snapped to endpoints)
            if (vInt !== v1a && vInt !== v1b && vInt !== v2a && vInt !== v2b) {
              this.kernel.splitEdge(i, vInt);
              this.kernel.splitEdge(j, vInt);
              foundIntersection = true;
              break;
            }
          }
        }
        if (foundIntersection) break;
      }
    }
  }

  private getIntersection(x1: float64, y1: float64, x2: float64, y2: float64, x3: float64, y3: float64, x4: float64, y4: float64) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < EPSILON) return null; // Collinear or parallel
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    
    // Strict interior intersection bounds
    if (ua > EPSILON && ua < 1 - EPSILON && ub > EPSILON && ub < 1 - EPSILON) {
      return { 
        x: PrecisionEngine.snap(x1 + ua * (x2 - x1)), 
        y: PrecisionEngine.snap(y1 + ua * (y2 - y1)) 
      };
    }
    return null;
  }
}

/**
 * 6. DEPENDENCY SYSTEM STABILIZATION
 */
export class ConstraintSolver {
  private params = new Map<string, float64>();
  private constraints: Array<() => void> = [];

  public set(key: string, value: float64) {
    this.params.set(key, value);
  }

  public get(key: string): float64 {
    return this.params.get(key) || 0;
  }

  public addRule(rule: () => void) {
    this.constraints.push(rule);
  }

  public propagate() {
    let stable = false;
    let iterations = 0;
    const MAX_ITER = 100;

    // Gauss-Seidel style relaxation loop with absolute cutoff
    while (!stable && iterations++ < MAX_ITER) {
      stable = true;
      const snapshot = new Map(this.params);

      for (const rule of this.constraints) {
        rule();
      }

      for (const [key, val] of this.params.entries()) {
        const snapVal = snapshot.get(key);
        if (snapVal === undefined || !fuzzyEq(val, snapVal)) {
          stable = false;
        }
      }
    }

    if (iterations === MAX_ITER) {
      throw new Error("Solver Divergence: Cyclic or conflicting constraints detected.");
    }
  }
}

/**
 * 7. SVG OUTPUT VALIDATION
 */
export class CadExecutionPipeline {
  public kernel = new GeometryKernel();
  public topology = new TopologyEngine(this.kernel);
  public booleans = new BooleanEngine(this.kernel);
  public solver = new ConstraintSolver();

  public runTemplate(length: number, width: number): string {
    this.solver.set('length', length);
    this.solver.set('width', width);

    // Structural constraint: Box cannot collapse on itself
    this.solver.addRule(() => {
      if (this.solver.get('length') < 10) this.solver.set('length', 10);
      if (this.solver.get('width') < 10) this.solver.set('width', 10);
    });
    this.solver.propagate();

    const L = this.solver.get('length');
    const W = this.solver.get('width');

    const v1 = this.kernel.createVertex(0, 0);
    const v2 = this.kernel.createVertex(L, 0);
    const v3 = this.kernel.createVertex(L, W);
    const v4 = this.kernel.createVertex(0, W);

    const [e1] = this.kernel.createEdge(v1, v2);
    const [e2] = this.kernel.createEdge(v2, v3);
    const [e3] = this.kernel.createEdge(v3, v4);
    const [e4] = this.kernel.createEdge(v4, v1);

    this.topology.link(e1, e2);
    this.topology.link(e2, e3);
    this.topology.link(e3, e4);
    this.topology.link(e4, e1);

    this.booleans.resolveSelfIntersections();

    if (!this.topology.validateTopology()) {
      throw new Error("Topology corruption detected before face extraction.");
    }

    this.topology.detectFaces();

    return this.renderSVG();
  }

  private renderSVG(): string {
    const pool = this.kernel.pool;
    let svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 200 200">\n';
    
    for (let f = 0; f < pool.headF; f++) {
      let path = 'M ';
      const startEdge = pool.fOuter[f];
      if (startEdge === -1) continue;

      let curr = startEdge;
      let validPath = true;
      let safeGuard = 0;
      do {
        const vId = pool.heOrigin[curr];
        if (vId === -1) { validPath = false; break; }
        
        // Exact coordinate output rounding to prevent large mantissa SVG bloat
        const px = Number(pool.vX[vId].toFixed(3));
        const py = Number(pool.vY[vId].toFixed(3));
        path += `${px},${py} L `;
        
        curr = pool.heNext[curr];
        if (safeGuard++ > 10000) { validPath = false; break; }
      } while (curr !== -1 && curr !== startEdge);
      
      if (validPath) {
        path = path.slice(0, -2) + 'Z';
        // Alternating fill for winding order debugging
        svg += `  <path d="${path}" fill="rgba(0, 150, 255, 0.2)" stroke="black" stroke-width="1" stroke-linejoin="round"/>\n`;
      }
    }
    
    svg += '</svg>';
    return svg;
  }
}
