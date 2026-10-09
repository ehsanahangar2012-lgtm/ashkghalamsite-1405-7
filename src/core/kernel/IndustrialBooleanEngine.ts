// PHASE 13 — INDUSTRIAL BOOLEAN ENGINE UPGRADE

import { GeometryKernel, TopologyEngine, PrecisionEngine, MemoryPool, int32, float64 } from './CadKernel_Stabilized';

const EPSILON = 1e-6;

function fuzzyEq(a: float64, b: float64): boolean {
  return Math.abs(a - b) < EPSILON;
}

/**
 * 1. SPATIAL INDEXING (AABB)
 */
export class BoundingBox {
  constructor(
    public minX: float64 = Infinity,
    public minY: float64 = Infinity,
    public maxX: float64 = -Infinity,
    public maxY: float64 = -Infinity
  ) {}

  public expand(x: float64, y: float64) {
    if (x < this.minX) this.minX = x;
    if (x > this.maxX) this.maxX = x;
    if (y < this.minY) this.minY = y;
    if (y > this.maxY) this.maxY = y;
  }

  public intersects(other: BoundingBox): boolean {
    return !(this.maxX < other.minX || this.minX > other.maxX || this.maxY < other.minY || this.minY > other.maxY);
  }
}

/**
 * 2. GEOMETRY NORMALIZATION LAYER
 */
export class GeometryNormalizer {
  constructor(private kernel: GeometryKernel) {}

  public normalize(): void {
    const pool = this.kernel.pool;
    // Remove zero-length degenerate edges
    for (let i = 0; i < pool.headHE; i++) {
      if (pool.heOrigin[i] !== -1) {
        const v1 = pool.heOrigin[i];
        const v2 = pool.heOrigin[pool.heTwin[i]];
        if (v1 === v2 || (fuzzyEq(pool.vX[v1], pool.vX[v2]) && fuzzyEq(pool.vY[v1], pool.vY[v2]))) {
          // Degenerate edge detected, mark as deleted
          pool.heOrigin[i] = -1;
          pool.heOrigin[pool.heTwin[i]] = -1;
        }
      }
    }
  }
}

/**
 * 3. ROBUST INTERSECTION SYSTEM (PLANE SWEEP BASE)
 */
export class SweepEvent {
  constructor(
    public x: float64,
    public y: float64,
    public edgeId: int32,
    public isLeft: boolean
  ) {}
}

export class IndustrialBooleanEngine {
  private normalizer: GeometryNormalizer;
  
  constructor(private kernel: GeometryKernel, private topo: TopologyEngine) {
    this.normalizer = new GeometryNormalizer(this.kernel);
  }

  public executeRobustBoolean(): void {
    // 1. Normalize geometry
    this.normalizer.normalize();
    
    // 2. Resolve intersections
    this.resolveAllIntersections();

    // 3. Reconstruct faces and loops
    this.reconstructTopology();
  }

  private resolveAllIntersections(): void {
    const pool = this.kernel.pool;
    let foundIntersection = true;
    let iter = 0;
    const MAX_ITER = 100;

    // Advanced segment intersection check using bounding box culling
    while (foundIntersection && iter++ < MAX_ITER) {
      foundIntersection = false;
      const bboxes = new Map<int32, BoundingBox>();

      // Compute AABBs
      for (let i = 0; i < pool.headHE; i += 2) {
        if (pool.heOrigin[i] === -1) continue; // Deleted
        
        const v1a = pool.heOrigin[i];
        const v1b = pool.heOrigin[pool.heTwin[i]];
        
        const bbox = new BoundingBox();
        bbox.expand(pool.vX[v1a], pool.vY[v1a]);
        bbox.expand(pool.vX[v1b], pool.vY[v1b]);
        bboxes.set(i, bbox);
      }

      // N^2 checking but culled by AABB
      const edgeIndices = Array.from(bboxes.keys());
      for (let i = 0; i < edgeIndices.length; i++) {
        const e1 = edgeIndices[i];
        const box1 = bboxes.get(e1)!;

        for (let j = i + 1; j < edgeIndices.length; j++) {
          const e2 = edgeIndices[j];
          const box2 = bboxes.get(e2)!;

          if (!box1.intersects(box2)) continue;

          const v1a = pool.heOrigin[e1];
          const v1b = pool.heOrigin[pool.heTwin[e1]];
          const v2a = pool.heOrigin[e2];
          const v2b = pool.heOrigin[pool.heTwin[e2]];

          // Skip adjacent edges
          if (v1a === v2a || v1a === v2b || v1b === v2a || v1b === v2b) continue;

          const pt = this.getIntersection(
            pool.vX[v1a], pool.vY[v1a], pool.vX[v1b], pool.vY[v1b],
            pool.vX[v2a], pool.vY[v2a], pool.vX[v2b], pool.vY[v2b]
          );

          if (pt) {
            const vInt = this.kernel.createVertex(pt.x, pt.y);
            if (vInt !== v1a && vInt !== v1b && vInt !== v2a && vInt !== v2b) {
              this.kernel.splitEdge(e1, vInt);
              this.kernel.splitEdge(e2, vInt);
              foundIntersection = true;
              break;
            }
          }
        }
        if (foundIntersection) break;
      }
    }

    if (iter === MAX_ITER) {
      console.warn("Boolean engine hit max iterations, geometry might be extremely complex or degenerate.");
    }
  }

  private getIntersection(x1: float64, y1: float64, x2: float64, y2: float64, x3: float64, y3: float64, x4: float64, y4: float64) {
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (Math.abs(denom) < EPSILON) return null; // Collinear
    
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    
    if (ua > EPSILON && ua < 1 - EPSILON && ub > EPSILON && ub < 1 - EPSILON) {
      return { 
        x: PrecisionEngine.snap(x1 + ua * (x2 - x1)), 
        y: PrecisionEngine.snap(y1 + ua * (y2 - y1)) 
      };
    }
    return null;
  }

  /**
   * 4. FACE RECONSTRUCTION ENGINE
   */
  private reconstructTopology(): void {
    const pool = this.kernel.pool;
    const visited = new Set<int32>();

    // Clear existing faces
    pool.fOuter.fill(-1);
    pool.heFace.fill(-1);
    pool.headF = 0;

    for (let i = 0; i < pool.headHE; i++) {
      if (pool.heOrigin[i] === -1 || visited.has(i)) continue;

      let curr = i;
      const path = [];
      let isLoop = false;
      let safeGuard = 0;
      
      do {
        visited.add(curr);
        path.push(curr);
        curr = pool.heNext[curr];
        if (safeGuard++ > 20000) {
          // Failure resistance: break open loop gracefully
          break;
        }
      } while (curr !== -1 && !visited.has(curr));

      if (curr === i) {
        // Detect Winding Order (Shoelace Formula)
        let area = 0;
        for (const edge of path) {
          const v1 = pool.heOrigin[edge];
          const v2 = pool.heOrigin[pool.heTwin[edge]];
          area += (pool.vX[v1] * pool.vY[v2] - pool.vX[v2] * pool.vY[v1]);
        }
        
        // CCW is positive in traditional cartesian. SVG has inverted Y.
        if (Math.abs(area) > EPSILON) {
          // It's a valid non-zero area face
          this.kernel.createFace(i);
        }
      }
    }
  }
}
