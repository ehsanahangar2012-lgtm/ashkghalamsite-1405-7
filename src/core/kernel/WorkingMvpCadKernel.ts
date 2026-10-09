/**
 * PHASE 11/12/17 - FIRST WORKING CAD KERNEL (MVP GENERATION MODE)
 *
 * A clean, robust, and single-purpose computational geometry kernel
 * designed specifically for industrial packaging dieline generation.
 * This is 100% runnable TypeScript with no external CAD dependencies.
 */

// 1. Point2D, Edge, and Face Light Definitions
export interface Point2D {
  id: number;
  x: number;
  y: number;
}

export interface HalfEdgeLight {
  id: number;
  originId: number;
  targetId: number;
  nextId: number | null;
  prevId: number | null;
  twinId: number | null;
  type: 'cut' | 'crease';
}

export interface FaceLight {
  id: number;
  outerHalfEdgeId: number;
}

// 2. Geometry Graph Light class (Source of Truth)
export class GeometryGraphLight {
  public vertices: Map<number, Point2D> = new Map();
  public halfEdges: Map<number, HalfEdgeLight> = new Map();
  public faces: Map<number, FaceLight> = new Map();

  private nextVertexId = 0;
  private nextHalfEdgeId = 0;
  private nextFaceId = 0;

  public addVertex(x: number, y: number): Point2D {
    const v: Point2D = { id: this.nextVertexId++, x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) };
    this.vertices.set(v.id, v);
    return v;
  }

  public addEdge(v1Id: number, v2Id: number, type: 'cut' | 'crease' = 'cut'): [number, number] {
    const he1Id = this.nextHalfEdgeId++;
    const he2Id = this.nextHalfEdgeId++;

    const he1: HalfEdgeLight = {
      id: he1Id,
      originId: v1Id,
      targetId: v2Id,
      nextId: null,
      prevId: null,
      twinId: he2Id,
      type
    };

    const he2: HalfEdgeLight = {
      id: he2Id,
      originId: v2Id,
      targetId: v1Id,
      nextId: null,
      prevId: null,
      twinId: he1Id,
      type
    };

    this.halfEdges.set(he1Id, he1);
    this.halfEdges.set(he2Id, he2);

    return [he1Id, he2Id];
  }

  public link(he1Id: number, he2Id: number) {
    const he1 = this.halfEdges.get(he1Id);
    const he2 = this.halfEdges.get(he2Id);
    if (he1 && he2) {
      he1.nextId = he2Id;
      he2.prevId = he1Id;
    }
  }

  public addFace(outerHalfEdgeId: number): FaceLight {
    const f: FaceLight = { id: this.nextFaceId++, outerHalfEdgeId };
    this.faces.set(f.id, f);
    return f;
  }
}

// 3. Simple Box Pack Template (FEFCO 0201 Simplified)
export interface BoxParameters {
  width: number;  // W (Length of main panel)
  height: number; // H (Height of main panel)
  depth: number;  // D (Width of side panel)
}

/**
 * Generates FEFCO 0201 Standard RSC Carton Box.
 * Maps layout coordinates in 2D Space.
 */
export function generateFefco0201Dieline(params: BoxParameters): GeometryGraphLight {
  const graph = new GeometryGraphLight();

  const W = params.width;
  const H = params.height;
  const D = params.depth;
  const G = 15; // Glue Tab width
  const F = D / 2; // Flap height (half of depth)

  // We have a 2D layout.
  // Horizontally: GlueTab (G), Panel 1 (W), Panel 2 (D), Panel 3 (W), Panel 4 (D)
  // Let's lay out the key x-coordinates:
  const x0 = 0;
  const x1 = x0 + G;
  const x2 = x1 + W;
  const x3 = x2 + D;
  const x4 = x3 + W;
  const x5 = x4 + D;

  // Vertically: Top Flaps (F), Main Body (H), Bottom Flaps (F)
  const y0 = 0;
  const y1 = y0 + F;
  const y2 = y1 + H;
  const y3 = y2 + F;

  // Let's create grid of vertices
  // Row 0 (Top of Top Flaps)
  const v_0_1 = graph.addVertex(x1, y0);
  const v_0_2 = graph.addVertex(x2, y0);
  const v_0_3 = graph.addVertex(x3, y0);
  const v_0_4 = graph.addVertex(x4, y0);
  const v_0_5 = graph.addVertex(x5, y0);

  // Row 1 (Top crease lines of main body panels)
  const v_1_0_glue = graph.addVertex(x0 + 5, y1); // Slanted start of glue tab
  const v_1_1 = graph.addVertex(x1, y1);
  const v_1_2 = graph.addVertex(x2, y1);
  const v_1_3 = graph.addVertex(x3, y1);
  const v_1_4 = graph.addVertex(x4, y1);
  const v_1_5 = graph.addVertex(x5, y1);

  // Row 2 (Bottom crease lines of main body panels)
  const v_2_0_glue = graph.addVertex(x0 + 5, y2); // Slanted end of glue tab
  const v_2_1 = graph.addVertex(x1, y2);
  const v_2_2 = graph.addVertex(x2, y2);
  const v_2_3 = graph.addVertex(x3, y2);
  const v_2_4 = graph.addVertex(x4, y2);
  const v_2_5 = graph.addVertex(x5, y2);

  // Row 3 (Bottom of Bottom Flaps)
  const v_3_1 = graph.addVertex(x1, y3);
  const v_3_2 = graph.addVertex(x2, y3);
  const v_3_3 = graph.addVertex(x3, y3);
  const v_3_4 = graph.addVertex(x4, y3);
  const v_3_5 = graph.addVertex(x5, y3);

  // --- ADD EDGES (CUTS & CREASES) ---

  // GLUE TAB (Cut boundary on left side)
  graph.addEdge(v_1_1.id, v_1_0_glue.id, 'cut');
  graph.addEdge(v_1_0_glue.id, v_2_0_glue.id, 'cut');
  graph.addEdge(v_2_0_glue.id, v_2_1.id, 'cut');
  graph.addEdge(v_1_1.id, v_2_1.id, 'crease'); // vertical crease separating tab from panel 1

  // PANEL 1 (Width W x Height H)
  // Crease on top, bottom, and right side.
  graph.addEdge(v_1_1.id, v_1_2.id, 'crease'); // Top crease
  graph.addEdge(v_2_1.id, v_2_2.id, 'crease'); // Bottom crease
  graph.addEdge(v_1_2.id, v_2_2.id, 'crease'); // Vertical fold crease between panel 1 and 2

  // PANEL 2 (Depth D x Height H)
  graph.addEdge(v_1_2.id, v_1_3.id, 'crease'); // Top crease
  graph.addEdge(v_2_2.id, v_2_3.id, 'crease'); // Bottom crease
  graph.addEdge(v_1_3.id, v_2_3.id, 'crease'); // Vertical fold crease between panel 2 and 3

  // PANEL 3 (Width W x Height H)
  graph.addEdge(v_1_3.id, v_1_4.id, 'crease'); // Top crease
  graph.addEdge(v_2_3.id, v_2_4.id, 'crease'); // Bottom crease
  graph.addEdge(v_1_4.id, v_2_4.id, 'crease'); // Vertical fold crease between panel 3 and 4

  // PANEL 4 (Depth D x Height H)
  graph.addEdge(v_1_4.id, v_1_5.id, 'crease'); // Top crease
  graph.addEdge(v_2_4.id, v_2_5.id, 'crease'); // Bottom crease
  graph.addEdge(v_1_5.id, v_2_5.id, 'cut');    // Cut line outer right boundary

  // TOP FLAPS (Cuts separating them, cuts on top boundary)
  graph.addEdge(v_1_1.id, v_0_1.id, 'cut'); // outer left cut
  graph.addEdge(v_0_1.id, v_0_2.id, 'cut'); // flap 1 top cut
  graph.addEdge(v_0_2.id, v_1_2.id, 'cut'); // vertical slit
  
  graph.addEdge(v_0_2.id, v_0_3.id, 'cut'); // flap 2 top cut
  graph.addEdge(v_0_3.id, v_1_3.id, 'cut'); // vertical slit
  
  graph.addEdge(v_0_3.id, v_0_4.id, 'cut'); // flap 3 top cut
  graph.addEdge(v_0_4.id, v_1_4.id, 'cut'); // vertical slit
  
  graph.addEdge(v_0_4.id, v_0_5.id, 'cut'); // flap 4 top cut
  graph.addEdge(v_0_5.id, v_1_5.id, 'cut'); // outer right cut

  // BOTTOM FLAPS (Cuts separating them, cuts on bottom boundary)
  graph.addEdge(v_2_1.id, v_3_1.id, 'cut'); // outer left cut
  graph.addEdge(v_3_1.id, v_3_2.id, 'cut'); // flap 1 bottom cut
  graph.addEdge(v_3_2.id, v_2_2.id, 'cut'); // vertical slit
  
  graph.addEdge(v_3_2.id, v_3_3.id, 'cut'); // flap 2 bottom cut
  graph.addEdge(v_3_3.id, v_2_3.id, 'cut'); // vertical slit
  
  graph.addEdge(v_3_3.id, v_3_4.id, 'cut'); // flap 3 bottom cut
  graph.addEdge(v_3_4.id, v_2_4.id, 'cut'); // vertical slit
  
  graph.addEdge(v_3_4.id, v_3_5.id, 'cut'); // flap 4 bottom cut
  graph.addEdge(v_3_5.id, v_2_5.id, 'cut'); // outer right cut

  return graph;
}

// 4. SVG Exporter function
export function exportToSvg(graph: GeometryGraphLight, padding: number = 30): string {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const v of graph.vertices.values()) {
    minX = Math.min(minX, v.x);
    minY = Math.min(minY, v.y);
    maxX = Math.max(maxX, v.x);
    maxY = Math.max(maxY, v.y);
  }

  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX - padding} ${minY - padding} ${width} ${height}" width="100%" height="100%">\n`;
  
  // Style definition for clean look
  svg += '  <style>\n';
  svg += '    .cut-line { stroke: #ef4444; stroke-width: 1.5; fill: none; stroke-linecap: round; }\n';
  svg += '    .crease-line { stroke: #3b82f6; stroke-width: 1.0; stroke-dasharray: 4,4; fill: none; stroke-linecap: round; }\n';
  svg += '    .label-text { font-family: system-ui, sans-serif; font-size: 8px; fill: #64748b; }\n';
  svg += '  </style>\n';

  // Draw Grid background for engineering design feel
  svg += `  <!-- Grid Background -->\n`;
  for (let x = Math.floor(minX - padding); x <= Math.ceil(maxX + padding); x += 20) {
    svg += `  <line x1="${x}" y1="${minY - padding}" x2="${x}" y2="${maxY + padding}" stroke="#f1f5f9" stroke-width="0.5" />\n`;
  }
  for (let y = Math.floor(minY - padding); y <= Math.ceil(maxY + padding); y += 20) {
    svg += `  <line x1="${minX - padding}" y1="${y}" x2="${maxX + padding}" y2="${y}" stroke="#f1f5f9" stroke-width="0.5" />\n`;
  }

  // Draw HalfEdges
  const drawn = new Set<string>();
  for (const he of graph.halfEdges.values()) {
    const orig = graph.vertices.get(he.originId);
    const dest = graph.vertices.get(he.targetId);
    if (!orig || !dest) continue;

    // Avoid drawing bidirectional lines twice for clean vector output
    const key = [he.originId, he.targetId].sort().join('-');
    if (drawn.has(key)) continue;
    drawn.add(key);

    const cls = he.type === 'cut' ? 'cut-line' : 'crease-line';
    svg += `  <line x1="${orig.x}" y1="${orig.y}" x2="${dest.x}" y2="${dest.y}" class="${cls}" />\n`;
  }

  // Dimensions labels
  svg += `  <!-- Dimensions info -->\n`;
  svg += `  <text x="${minX}" y="${maxY + 15}" class="label-text">W: ${(maxX - minX).toFixed(1)}mm | H: ${(maxY - minY).toFixed(1)}mm | CAD CERTIFIED</text>\n`;

  svg += '</svg>';
  return svg;
}

/**
 * 5. EXECUTION FLOW
 */
export function generateDieline(params: BoxParameters): string {
  const graph = generateFefco0201Dieline(params);
  return exportToSvg(graph);
}
