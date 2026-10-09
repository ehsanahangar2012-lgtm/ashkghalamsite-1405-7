export type Point = { x: number; y: number };

export enum PathCommandType {
  MoveTo,
  LineTo,
  ArcTo,
}

export interface PathCommand {
  type: PathCommandType;
  points: Point[];
  radius?: number;
  sweep?: boolean;
}

export interface GeometricPrimitive {
  id: string;
  type: string;
  paths: PathCommand[];
  metadata?: Record<string, any>;
}

// DSL Builder
export class GeometryBuilder {
  private primitives: GeometricPrimitive[] = [];

  Panel(id: string, width: number, height: number, origin: Point = { x: 0, y: 0 }): GeometricPrimitive {
    const p: GeometricPrimitive = {
      id,
      type: 'Panel',
      paths: [
        { type: PathCommandType.MoveTo, points: [origin] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + width, y: origin.y }] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + width, y: origin.y + height }] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x, y: origin.y + height }] },
        { type: PathCommandType.LineTo, points: [origin] },
      ]
    };
    this.primitives.push(p);
    return p;
  }

  GlueTab(id: string, width: number, height: number, origin: Point, angle: number = 15): GeometricPrimitive {
    // Basic implementation to show the DSL approach
    const inset = Math.tan(angle * Math.PI / 180) * width;
    const p: GeometricPrimitive = {
      id,
      type: 'GlueTab',
      paths: [
        { type: PathCommandType.MoveTo, points: [origin] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + inset, y: origin.y - width }] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + height - inset, y: origin.y - width }] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + height, y: origin.y }] },
      ]
    };
    this.primitives.push(p);
    return p;
  }

  DustFlap(id: string, width: number, length: number, origin: Point): GeometricPrimitive {
     const p: GeometricPrimitive = {
      id,
      type: 'DustFlap',
      paths: [
        { type: PathCommandType.MoveTo, points: [origin] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x, y: origin.y - length }] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + width, y: origin.y - length }] },
        { type: PathCommandType.LineTo, points: [{ x: origin.x + width, y: origin.y }] },
      ]
    };
    this.primitives.push(p);
    return p;
  }
  
  // Other primitives... LockTab, Chamfer, Fold, Score, Arc, Notch

  build(): GeometricPrimitive[] {
    return this.primitives;
  }
}
