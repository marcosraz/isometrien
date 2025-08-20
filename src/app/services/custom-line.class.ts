import * as fabric from 'fabric';

/**
 * Custom Line class with improved selection visualization
 * Shows selection along the line instead of as a bounding box
 */
export class CustomLine extends fabric.Line {
  
  constructor(points: [number, number, number, number], options?: any) {
    super(points, options);
    
    // Set default properties for better selection
    this.set({
      perPixelTargetFind: true,
      targetFindTolerance: 5,
      transparentCorners: false,
      cornerColor: 'rgba(102, 153, 255, 0.5)',
      cornerStyle: 'circle',
      cornerSize: 8,
      borderColor: 'rgba(102, 153, 255, 0.75)',
      borderDashArray: [5, 5],
      borderScaleFactor: 1,
      padding: 10,
      objectCaching: false, // Disable caching to ensure our custom rendering works
      ...options
    });
  }

  /**
   * Override _renderControls to draw our custom selection
   */
  override _renderControls(ctx: CanvasRenderingContext2D, styleOverride?: any): void {
    if (!this.hasControls || !this.canvas || this !== this.canvas.getActiveObject()) {
      return;
    }
    
    // Get the top context which is used for controls/selection
    const topCtx = this.canvas.contextTop;
    if (!topCtx) return;
    
    // Clear the entire top context before drawing to prevent trails
    topCtx.clearRect(0, 0, this.canvas.width!, this.canvas.height!);
    
    topCtx.save();
    
    // Apply transformation to world coordinates
    const center = this.getCenterPoint();
    topCtx.translate(center.x, center.y);
    topCtx.rotate(fabric.util.degreesToRadians(this.angle || 0));
    topCtx.scale(this.scaleX || 1, this.scaleY || 1);
    
    // Calculate line endpoints in local space
    const halfWidth = (this.width || 0) / 2;
    const halfHeight = (this.height || 0) / 2;
    
    let x1, y1, x2, y2;
    
    // Determine line direction based on original points
    if ((this as any).x1 < (this as any).x2) {
      // Line goes from left to right
      if ((this as any).y1 < (this as any).y2) {
        // Top-left to bottom-right
        x1 = -halfWidth;
        y1 = -halfHeight;
        x2 = halfWidth;
        y2 = halfHeight;
      } else {
        // Bottom-left to top-right
        x1 = -halfWidth;
        y1 = halfHeight;
        x2 = halfWidth;
        y2 = -halfHeight;
      }
    } else {
      // Line goes from right to left
      if ((this as any).y1 < (this as any).y2) {
        // Top-right to bottom-left
        x1 = halfWidth;
        y1 = -halfHeight;
        x2 = -halfWidth;
        y2 = halfHeight;
      } else {
        // Bottom-right to top-left
        x1 = halfWidth;
        y1 = halfHeight;
        x2 = -halfWidth;
        y2 = -halfHeight;
      }
    }
    
    // Setup line style for selection
    topCtx.strokeStyle = this.borderColor || 'rgba(102, 153, 255, 0.75)';
    topCtx.lineWidth = 2;
    topCtx.setLineDash([5, 5]);
    
    // Calculate perpendicular offset for parallel lines
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;
    const offset = this.padding || 10;
    
    const dx = Math.cos(perpAngle) * offset;
    const dy = Math.sin(perpAngle) * offset;
    
    // Draw upper parallel line
    topCtx.beginPath();
    topCtx.moveTo(x1 + dx, y1 + dy);
    topCtx.lineTo(x2 + dx, y2 + dy);
    topCtx.stroke();
    
    // Draw lower parallel line
    topCtx.beginPath();
    topCtx.moveTo(x1 - dx, y1 - dy);
    topCtx.lineTo(x2 - dx, y2 - dy);
    topCtx.stroke();
    
    // Draw connecting lines at endpoints
    topCtx.beginPath();
    topCtx.moveTo(x1 + dx, y1 + dy);
    topCtx.lineTo(x1 - dx, y1 - dy);
    topCtx.stroke();
    
    topCtx.beginPath();
    topCtx.moveTo(x2 + dx, y2 + dy);
    topCtx.lineTo(x2 - dx, y2 - dy);
    topCtx.stroke();
    
    // Draw circles at endpoints with solid line
    topCtx.setLineDash([]);
    topCtx.lineWidth = 1;
    topCtx.fillStyle = this.cornerColor || 'rgba(102, 153, 255, 0.5)';
    
    const circleSize = 6;
    
    // First endpoint
    topCtx.beginPath();
    topCtx.arc(x1, y1, circleSize, 0, 2 * Math.PI);
    topCtx.fill();
    topCtx.stroke();
    
    // Second endpoint
    topCtx.beginPath();
    topCtx.arc(x2, y2, circleSize, 0, 2 * Math.PI);
    topCtx.fill();
    topCtx.stroke();
    
    topCtx.restore();
  }

  /**
   * Override drawBorders to prevent default border drawing
   */
  override drawBorders(ctx: CanvasRenderingContext2D): any {
    // Don't draw default borders - we handle selection in _renderControls
    return this;
  }

  /**
   * Override drawControls to prevent default control drawing
   */
  override drawControls(ctx: CanvasRenderingContext2D): any {
    // Don't draw controls here - they're handled in _renderControls
    return this;
  }

  /**
   * Override the selection box rendering to be invisible
   */
  override drawSelectionBackground(ctx: CanvasRenderingContext2D): void {
    // Don't draw the default selection background
  }

  /**
   * Static method to create CustomLine from regular Line
   */
  static fromLine(line: fabric.Line): CustomLine {
    const coords = line.calcLinePoints();
    const customLine = new CustomLine(
      [coords.x1 || 0, coords.y1 || 0, coords.x2 || 0, coords.y2 || 0],
      {
        stroke: line.stroke,
        strokeWidth: line.strokeWidth,
        selectable: line.selectable,
        evented: line.evented,
        left: line.left,
        top: line.top,
        angle: line.angle,
        scaleX: line.scaleX,
        scaleY: line.scaleY,
        // Copy all custom properties
        customType: (line as any).customType,
        isDimensionPart: (line as any).isDimensionPart,
        dimensionId: (line as any).dimensionId,
        isWeldPoint: (line as any).isWeldPoint,
        data: (line as any).data,
        reusable: (line as any).reusable,
        originalFill: (line as any).originalFill,
        associatedLines: (line as any).associatedLines,
        isAnchor: (line as any).isAnchor,
        lineId: (line as any).lineId,
        anchorIndex: (line as any).anchorIndex,
        pipeId: (line as any).pipeId,
        isPipe: (line as any).isPipe
      }
    );
    return customLine;
  }
}