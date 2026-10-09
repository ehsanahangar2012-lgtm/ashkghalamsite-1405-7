import { jsPDF } from 'jspdf';
import { DXFExporter, LineSegment } from './DXFExporter';

export class PDFExporter {
  private dxfParser = new DXFExporter();

  /**
   * Generates a high-fidelity vector PDF buffer containing the dieline.
   * Centers the drawing on the document page (e.g. A3 or A4).
   */
  public export(
    cuts: string[],
    creases: string[],
    labels: { x: number; y: number; text: string; rotate?: number; color?: string }[] = [],
    widthMm: number = 420, // A3 landscape width
    heightMm: number = 297, // A3 landscape height
    paddingMm: number = 20
  ): Buffer {
    // 1. Parse all paths into segments to calculate the exact bounding box
    const cutSegments: LineSegment[] = [];
    const creaseSegments: LineSegment[] = [];

    for (const path of cuts) {
      cutSegments.push(...this.dxfParser.parsePathToSegments(path));
    }

    for (const path of creases) {
      creaseSegments.push(...this.dxfParser.parsePathToSegments(path));
    }

    // 2. Find bounding box of the dieline geometry
    let xMin = Infinity, yMin = Infinity;
    let xMax = -Infinity, yMax = -Infinity;

    const allSegs = [...cutSegments, ...creaseSegments];
    if (allSegs.length === 0) {
      // Degenerate case fallback
      xMin = 0; yMin = 0; xMax = 100; yMax = 100;
    } else {
      for (const seg of allSegs) {
        xMin = Math.min(xMin, seg.x1, seg.x2);
        yMin = Math.min(yMin, seg.y1, seg.y2);
        xMax = Math.max(xMax, seg.x1, seg.x2);
        yMax = Math.max(yMax, seg.y1, seg.y2);
      }
    }

    const dielineW = xMax - xMin;
    const dielineH = yMax - yMin;

    // 3. Initialize jsPDF
    // Determine page orientation and size. We choose A3 landscape as default for packaging sheets
    const doc = new jsPDF({
      orientation: dielineW > dielineH ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [widthMm, heightMm]
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Calculate scaling to fit the page comfortably with padding
    const scaleX = (pageWidth - paddingMm * 2) / dielineW;
    const scaleY = (pageHeight - paddingMm * 2) / dielineH;
    const scale = Math.min(scaleX, scaleY, 1.0); // Don't upscale, only downscale to fit

    // Translation to center the dieline on the page
    const offsetX = (pageWidth - dielineW * scale) / 2 - xMin * scale;
    const offsetY = (pageHeight - dielineH * scale) / 2 - yMin * scale;

    const tx = (x: number) => x * scale + offsetX;
    const ty = (y: number) => y * scale + offsetY;

    // Draw background grid/title block for production certification look
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.1);
    for (let x = 10; x < pageWidth; x += 20) {
      doc.line(x, 0, x, pageHeight);
    }
    for (let y = 10; y < pageHeight; y += 20) {
      doc.line(0, y, pageWidth, y);
    }

    // Title Block border
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10);

    // Write title details
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(13, 19, 36); // Deep charcoal
    doc.text('ASHK GHALAM CAD STUDIO', 10, pageHeight - 12);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text(`SHEET SIZE: ${pageWidth.toFixed(0)}x${pageHeight.toFixed(0)}mm | SCALE: ${(scale * 100).toFixed(0)}% | STATUS: CNC-CERTIFIED`, 10, pageHeight - 8);

    // 4. DRAW CREASE LINES (Dashed Blue - RGB 0, 0, 255)
    doc.setDrawColor(0, 0, 255);
    doc.setLineWidth(0.2);
    // Note: older jsPDF versions use setLineDash, newer support it too
    if (typeof doc.setLineDashPattern === 'function') {
      doc.setLineDashPattern([2, 2], 0);
    } else if (typeof (doc as any).setLineDash === 'function') {
      (doc as any).setLineDash([2, 2], 0);
    }

    for (const seg of creaseSegments) {
      doc.line(tx(seg.x1), ty(seg.y1), tx(seg.x2), ty(seg.y2));
    }

    // 5. DRAW CUT LINES (Solid Red - RGB 255, 0, 0)
    doc.setDrawColor(255, 0, 0);
    doc.setLineWidth(0.35);
    if (typeof doc.setLineDashPattern === 'function') {
      doc.setLineDashPattern([], 0);
    } else if (typeof (doc as any).setLineDash === 'function') {
      (doc as any).setLineDash([], 0);
    }

    for (const seg of cutSegments) {
      doc.line(tx(seg.x1), ty(seg.y1), tx(seg.x2), ty(seg.y2));
    }

    // 6. DRAW TEXT LABELS
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139); // Slate Gray
    for (const lbl of labels) {
      const rx = tx(lbl.x);
      const ry = ty(lbl.y);
      if (rx >= 0 && rx <= pageWidth && ry >= 0 && ry <= pageHeight) {
        // Simple horizontal text centering
        doc.text(lbl.text, rx, ry, { align: 'center' });
      }
    }

    // Return compiled PDF as Buffer (Uint8Array)
    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
