import { GeometricPrimitive, PathCommandType } from '../geometry/dsl';

export interface ExporterOptions {
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
}

export interface Exporter {
  export(primitives: GeometricPrimitive[], options?: ExporterOptions): string | Buffer;
}

export class SVGExporter implements Exporter {
  export(primitives: GeometricPrimitive[], options: ExporterOptions = {}): string {
    const { strokeWidth = 1, strokeColor = 'black', fillColor = 'none' } = options;
    
    let svgPaths = '';
    
    for (const primitive of primitives) {
      let d = '';
      for (const cmd of primitive.paths) {
        if (cmd.type === PathCommandType.MoveTo) {
          d += `M ${cmd.points[0].x},${cmd.points[0].y} `;
        } else if (cmd.type === PathCommandType.LineTo) {
          d += `L ${cmd.points[0].x},${cmd.points[0].y} `;
        }
        // Handle ArcTo etc.
      }
      svgPaths += `<path id="${primitive.id}" class="${primitive.type}" d="${d.trim()}" stroke="${strokeColor}" stroke-width="${strokeWidth}" fill="${fillColor}" />\n`;
    }

    // Wrap in SVG tags (would need bounding box calculation in a real implementation)
    return `<svg xmlns="http://www.w3.org/2000/svg">\n${svgPaths}</svg>`;
  }
}
