export interface CustomDielineTemplate {
  id: string;
  name: string;
  entities: any[];
  anchors?: any;
  width?: number;
  height?: number;
}

type Point = { x: number; y: number };
type DxfEntity = { type: string; layer: string; start?: Point; end?: Point; points?: Point[]; isCrease: boolean };

const layerIsCrease = (layer: string) => /crease|fold|score|bend|falz|تا|خط.?تا/i.test(layer || '');

const dxfPairs = (source: string): Array<{ code: number; value: string }> => {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const pairs: Array<{ code: number; value: string }> = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i].trim());
    if (Number.isFinite(code)) pairs.push({ code, value: lines[i + 1].trim() });
  }
  return pairs;
};

const groupByCode = (pairs: Array<{ code: number; value: string }>, code: number) =>
  pairs.filter(pair => pair.code === code).map(pair => Number(pair.value)).filter(Number.isFinite);

/** Parse common 2D DXF entities and normalize recognized $INSUNITS coordinates to millimetres. Unitless/unknown files preserve source coordinates. */
export const parseDxfToEntities = (dxfContent: string): DxfEntity[] => {
  if (typeof dxfContent !== 'string' || !dxfContent.trim()) return [];
  const pairs = dxfPairs(dxfContent);
  // DXF $INSUNITS (header group 9 followed by group 70) is optional.
  // Normalize common engineering units to mm so downstream geometry agrees
  // with the app's dimension fields. Unitless/unknown files are not guessed.
  let unitCode: number | null = null;
  for (let i = 0; i < pairs.length; i++) {
    if (pairs[i].code === 9 && pairs[i].value.toUpperCase() === '$INSUNITS') {
      for (let j = i + 1; j < pairs.length && pairs[j].code !== 9 && pairs[j].code !== 0; j++) {
        if (pairs[j].code === 70) {
          const value = Number(pairs[j].value);
          if (Number.isInteger(value)) unitCode = value;
          break;
        }
      }
      break;
    }
  }
  const unitScaleToMm: Record<number, number> = {
    1: 25.4,       // inches
    2: 304.8,      // feet
    3: 1609344,    // miles
    4: 1,          // millimetres
    5: 10,         // centimetres
    6: 1000,       // metres
    7: 1000000,    // kilometres
    8: 0.0000254,  // microinches
    9: 0.0254,     // mils
    10: 914.4,     // yards
  };
  const coordinateScale = unitCode === null ? 1 : (unitScaleToMm[unitCode] ?? 1);
  let inEntities = false;
  const sections: Array<{ type: string; pairs: Array<{ code: number; value: string }> }> = [];
  let current: { type: string; pairs: Array<{ code: number; value: string }> } | null = null;

  for (let i = 0; i < pairs.length; i++) {
    const p = pairs[i];
    if (p.code === 0 && p.value === 'SECTION') {
      const next = pairs[i + 1];
      inEntities = next?.code === 2 && next.value.toUpperCase() === 'ENTITIES';
      continue;
    }
    if (p.code === 0 && p.value === 'ENDSEC') {
      if (current) sections.push(current);
      current = null;
      inEntities = false;
      continue;
    }
    if (!inEntities) continue;
    if (p.code === 0) {
      if (current) sections.push(current);
      current = { type: p.value.toUpperCase(), pairs: [] };
    } else if (current) {
      current.pairs.push(p);
    }
  }
  if (current) sections.push(current);

  const result: DxfEntity[] = [];
  const addLine = (a: Point, b: Point, layer: string) => {
    if (![a.x, a.y, b.x, b.y].every(Number.isFinite) || (Math.abs(a.x-b.x) < 1e-9 && Math.abs(a.y-b.y) < 1e-9)) return;
    const scaledStart = { x: a.x * coordinateScale, y: a.y * coordinateScale };
    const scaledEnd = { x: b.x * coordinateScale, y: b.y * coordinateScale };
    result.push({ type: 'LINE', start: scaledStart, end: scaledEnd, layer, isCrease: layerIsCrease(layer) });
  };

  let polylineLayer = '0';
  let polylinePoints: Point[] | null = null;
  let polylineClosed = false;
  const flushPolyline = () => {
    if (polylinePoints && polylinePoints.length > 1) {
      for (let i = 0; i < polylinePoints.length - 1; i++) {
        addLine(polylinePoints[i], polylinePoints[i + 1], polylineLayer);
      }
      // DXF POLYLINE closure is stored on the POLYLINE header (group 70),
      // not on the SEQEND. Honor it without duplicating an existing closing edge.
      if (polylineClosed) {
        const first = polylinePoints[0];
        const last = polylinePoints[polylinePoints.length - 1];
        if (Math.hypot(last.x - first.x, last.y - first.y) > 1e-9) {
          addLine(last, first, polylineLayer);
        }
      }
    }
    polylinePoints = null;
    polylineClosed = false;
  };

  for (const entity of sections) {
    const p = entity.pairs;
    const layer = p.find(v => v.code === 8)?.value || '0';
    if (entity.type === 'POLYLINE') {
      flushPolyline();
      polylineLayer = layer;
      polylineClosed = (((groupByCode(p, 70)[0] || 0) & 1) === 1);
      polylinePoints = [];
      continue;
    }
    if (entity.type === 'VERTEX' && polylinePoints) {
      const xs = groupByCode(p, 10), ys = groupByCode(p, 20);
      if (xs.length && ys.length) polylinePoints.push({ x: xs[0], y: ys[0] });
      continue;
    }
    if (entity.type === 'SEQEND') { flushPolyline(); continue; }
    if (entity.type === 'LINE') {
      const x1=groupByCode(p,10)[0], y1=groupByCode(p,20)[0];
      const x2=groupByCode(p,11)[0], y2=groupByCode(p,21)[0];
      if ([x1,y1,x2,y2].every(Number.isFinite)) addLine({x:x1,y:y1},{x:x2,y:y2},layer);
      continue;
    }
    if (entity.type === 'LWPOLYLINE') {
      // Keep group 42 bulge values attached to their vertex. DXF bulge is
      // tan(includedAngle / 4); non-zero bulges describe circular arc segments.
      const vertices: Array<{ point: Point; bulge: number }> = [];
      let x: number | null = null;
      let y: number | null = null;
      let bulge = 0;
      const flushVertex = () => {
        if (x !== null && y !== null && Number.isFinite(x) && Number.isFinite(y)) {
          vertices.push({ point: { x, y }, bulge });
        }
        x = null;
        y = null;
        bulge = 0;
      };
      for (const pair of p) {
        if (pair.code === 10) {
          flushVertex();
          x = Number(pair.value);
        } else if (pair.code === 20 && x !== null) {
          y = Number(pair.value);
        } else if (pair.code === 42 && x !== null) {
          const parsedBulge = Number(pair.value);
          bulge = Number.isFinite(parsedBulge) ? parsedBulge : 0;
        }
      }
      flushVertex();
      const closed = (((groupByCode(p, 70)[0] || 0) & 1) === 1);
      const segmentCount = closed ? vertices.length : Math.max(0, vertices.length - 1);
      for (let i = 0; i < segmentCount; i++) {
        const current = vertices[i];
        const next = vertices[(i + 1) % vertices.length];
        const a = current.point, b = next.point;
        if (Math.abs(current.bulge) < 1e-10) {
          addLine(a, b, layer);
          continue;
        }
        const dx = b.x - a.x, dy = b.y - a.y;
        const chord = Math.hypot(dx, dy);
        if (chord < 1e-9) continue;
        const theta = 4 * Math.atan(current.bulge);
        const radius = chord * (1 + current.bulge * current.bulge) / (4 * Math.abs(current.bulge));
        const offset = chord * (1 - current.bulge * current.bulge) / (4 * current.bulge);
        const center = {
          x: (a.x + b.x) / 2 - (dy / chord) * offset,
          y: (a.y + b.y) / 2 + (dx / chord) * offset,
        };
        const startAngle = Math.atan2(a.y - center.y, a.x - center.x);
        const steps = Math.max(2, Math.ceil(Math.abs(theta) / (Math.PI / 18)));
        let previous = a;
        for (let step = 1; step <= steps; step++) {
          const angle = startAngle + theta * step / steps;
          const point = step === steps ? b : {
            x: center.x + radius * Math.cos(angle),
            y: center.y + radius * Math.sin(angle),
          };
          addLine(previous, point, layer);
          previous = point;
        }
      }
      continue;
    }
    if (entity.type === 'ARC' || entity.type === 'CIRCLE') {
      const cx=groupByCode(p,10)[0], cy=groupByCode(p,20)[0], radius=groupByCode(p,40)[0];
      if (![cx,cy,radius].every(Number.isFinite) || radius <= 0) continue;
      const start=entity.type === 'CIRCLE' ? 0 : (groupByCode(p,50)[0] || 0);
      const end=entity.type === 'CIRCLE' ? 360 : (groupByCode(p,51)[0] || 0);
      let sweep=(end-start+360)%360;
      if (entity.type === 'CIRCLE') sweep=360;
      const segments=Math.max(8,Math.ceil(sweep/10));
      let previous: Point | null = null;
      for(let i=0;i<=segments;i++){
        const angle=(start+sweep*i/segments)*Math.PI/180;
        const point={x:cx+radius*Math.cos(angle),y:cy+radius*Math.sin(angle)};
        if(previous) addLine(previous,point,layer);
        previous=point;
      }
    }
  }
  flushPolyline();
  return result;
};

/**
 * Converts parsed DXF line entities to SVG paths. This intentionally preserves source
 * coordinates rather than guessing how arbitrary imported artwork maps to L/W/H.
 * The provided dimensions are used only as a safe fallback for empty/invalid bounds.
 */
export const scaleCustomDieline = (templateOrEntities: any, _l: number, _w: number, _h: number) => {
  const entities: DxfEntity[] = Array.isArray(templateOrEntities)
    ? templateOrEntities
    : (Array.isArray(templateOrEntities?.entities) ? templateOrEntities.entities : []);
  const cuts: string[] = [];
  const creases: string[] = [];
  const xs: number[] = [], ys: number[] = [];
  entities.forEach((ent: any) => {
    if (ent?.type !== 'LINE' || !ent.start || !ent.end) return;
    const { start, end } = ent;
    if (![start.x,start.y,end.x,end.y].every((v: unknown) => typeof v === 'number' && Number.isFinite(v))) return;
    xs.push(start.x,end.x); ys.push(start.y,end.y);
    const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    if (ent.isCrease === true || layerIsCrease(ent.layer)) creases.push(path);
    else cuts.push(path);
  });
  const minX=xs.length?Math.min(...xs):0, maxX=xs.length?Math.max(...xs):Math.max(100,Number(_l)||100);
  const minY=ys.length?Math.min(...ys):0, maxY=ys.length?Math.max(...ys):Math.max(100,Number(_h)||100);
  return { cuts, creases, totalW: Math.max(1,maxX-minX), totalH: Math.max(1,maxY-minY), xMin:minX, yMin:minY, xMax:maxX, yMax:maxY };
};

export const analyzeTopology = (entities: any[], dims?: { L: number; W: number; H: number }) => {
  const lines = Array.isArray(entities) ? entities.filter(e => e?.type === 'LINE' && e.start && e.end) : [];
  const points = lines.flatMap(e => [e.start,e.end]).filter((p:any) => Number.isFinite(p.x) && Number.isFinite(p.y));
  return {
    outerBoundaryCount: 0,
    creaseX: dims?.L || 100,
    creaseY: dims?.W || 100,
    creaseLinesCount: lines.filter((e:any) => e.isCrease === true || layerIsCrease(e.layer)).length,
    cutLinesCount: lines.filter((e:any) => e.isCrease !== true && !layerIsCrease(e.layer)).length,
    bounds: points.length ? {
      minX: Math.min(...points.map((p:any)=>p.x)), maxX: Math.max(...points.map((p:any)=>p.x)),
      minY: Math.min(...points.map((p:any)=>p.y)), maxY: Math.max(...points.map((p:any)=>p.y))
    } : null
  };
};
