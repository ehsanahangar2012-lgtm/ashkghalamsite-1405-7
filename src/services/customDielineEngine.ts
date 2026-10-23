export interface CustomDielineTemplate {
  id: string;
  name: string;
  entities: any[];
  anchors?: any;
  width?: number;
  height?: number;
}

export const parseDxfToEntities = (dxfContent: string): any[] => {
  return [];
};

export const scaleCustomDieline = (templateOrEntities: any, l: number, w: number, h: number): any => {
  const cuts: string[] = [];
  const creases: string[] = [];

  const entities = Array.isArray(templateOrEntities) 
    ? templateOrEntities 
    : (templateOrEntities?.entities || []);

  entities.forEach((ent: any) => {
    if (ent.type === 'LINE' && ent.start && ent.end) {
      const pathStr = `M ${ent.start.x} ${ent.start.y} L ${ent.end.x} ${ent.end.y}`;
      if (ent.layer === 'CREASE') {
        creases.push(pathStr);
      } else {
        cuts.push(pathStr);
      }
    }
  });

  const totalW = Math.max(100, (l + w) * 2 + 40);
  const totalH = Math.max(100, h + w);

  return {
    cuts,
    creases,
    totalW,
    totalH,
  };
};

export const analyzeTopology = (entities: any[], dims?: { L: number; W: number; H: number }) => {
  return {
    outerBoundaryCount: 1,
    creaseX: dims?.L || 100,
    creaseY: dims?.W || 100,
    creaseLinesCount: Array.isArray(entities) ? entities.filter(e => e.layer === 'CREASE').length : 0,
    cutLinesCount: Array.isArray(entities) ? entities.filter(e => e.layer === 'CUT').length : 0,
  };
};
