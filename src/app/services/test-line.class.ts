import * as fabric from 'fabric';

/**
 * Custom Line class with improved selection visualization
 * Shows selection along the line instead of as a bounding box
 */
export class TestLine extends fabric.Line {
  private lastDebugTime = 0;
  
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
   * Override render to add selection visualization
   */
  override render(ctx: CanvasRenderingContext2D): void {
    // First render the line itself
    super.render(ctx);
    
    // DON'T render selection here - it's in the wrong coordinate space!
    // Selection should be rendered in drawBorders/drawControls which are called
    // in the correct coordinate space for selection visualization
  }
  
  /**
   * Override _render to understand where the line actually renders
   */
  override _render(ctx: CanvasRenderingContext2D): void {
    // If selected, intercept and see what coordinates are used
    if (this.canvas && this === this.canvas.getActiveObject()) {
      // Spy on the context to see what coordinates are used
      const originalMoveTo = ctx.moveTo.bind(ctx);
      const originalLineTo = ctx.lineTo.bind(ctx);
      
      let lineStart: {x: number, y: number} | null = null;
      let lineEnd: {x: number, y: number} | null = null;
      
      ctx.moveTo = function(x: number, y: number) {
        lineStart = {x, y};
        // console.log('Line moveTo:', x, y);
        originalMoveTo(x, y);
      };
      
      ctx.lineTo = function(x: number, y: number) {
        lineEnd = {x, y};
        // console.log('Line lineTo:', x, y);
        originalLineTo(x, y);
      };
      
      // Call parent to render the line
      super._render(ctx);
      
      // Restore original methods
      ctx.moveTo = originalMoveTo;
      ctx.lineTo = originalLineTo;
      
      // Store the actual coordinates for use in selection
      if (lineStart && lineEnd) {
        (this as any)._actualLineStart = lineStart;
        (this as any)._actualLineEnd = lineEnd;
      }
    } else {
      super._render(ctx);
    }
  }

  /**
   * Render custom selection visualization
   */
  private _renderSelection(ctx: CanvasRenderingContext2D): void {
    // Debug logging - limit to once per second
    const now = Date.now();
    if (now - this.lastDebugTime > 1000) {
      this.lastDebugTime = now;
      
      console.log('=== TestLine Selection Debug ===');
      console.log('Original x1,y1,x2,y2:', {
        x1: (this as any).x1,
        y1: (this as any).y1,
        x2: (this as any).x2,
        y2: (this as any).y2
      });
      console.log('Object transform:', {
        left: this.left,
        top: this.top,
        width: this.width,
        height: this.height,
        angle: this.angle,
        originX: this.originX,
        originY: this.originY
      });
      
      const linePoints = this.calcLinePoints();
      console.log('calcLinePoints (local coords):', linePoints);
      
      // Check the actual line coordinates
      if ((this as any)._actualLineStart && (this as any)._actualLineEnd) {
        console.log('Actual line coords captured:', {
          start: (this as any)._actualLineStart,
          end: (this as any)._actualLineEnd
        });
      }
    }
    
    // USE THE ACTUAL CAPTURED COORDINATES DIRECTLY
    // They are already in the correct coordinate system for the current context
    
    let localX1, localY1, localX2, localY2;
    
    if ((this as any)._actualLineStart && (this as any)._actualLineEnd) {
      // Use the captured coordinates directly - they're already correct!
      localX1 = (this as any)._actualLineStart.x;
      localY1 = (this as any)._actualLineStart.y;
      localX2 = (this as any)._actualLineEnd.x;
      localY2 = (this as any)._actualLineEnd.y;
      
      console.log('Using captured coordinates directly:', { localX1, localY1, localX2, localY2 });
    } else {
      // Fallback - in local space, line goes horizontally from -width/2 to width/2
      const halfWidth = (this.width || 0) / 2;
      console.log('No actual coordinates captured, using horizontal line fallback');
      localX1 = -halfWidth;
      localY1 = 0;
      localX2 = halfWidth;
      localY2 = 0;
    }
    
    // Setup line style for selection
    ctx.strokeStyle = this.borderColor || 'rgba(102, 153, 255, 0.75)';
    ctx.lineWidth = 2 / (this.scaleX || 1); // Adjust line width for object scale
    ctx.setLineDash([5 / (this.scaleX || 1), 5 / (this.scaleX || 1)]);
    
    // Calculate perpendicular offset for parallel lines
    const angle = Math.atan2(localY2 - localY1, localX2 - localX1);
    const perpAngle = angle + Math.PI / 2;
    const offset = (this.padding || 10) / (this.scaleX || 1);
    
    const dx = Math.cos(perpAngle) * offset;
    const dy = Math.sin(perpAngle) * offset;
    
    // Draw upper parallel line
    ctx.beginPath();
    ctx.moveTo(localX1 + dx, localY1 + dy);
    ctx.lineTo(localX2 + dx, localY2 + dy);
    ctx.stroke();
    
    // Draw lower parallel line
    ctx.beginPath();
    ctx.moveTo(localX1 - dx, localY1 - dy);
    ctx.lineTo(localX2 - dx, localY2 - dy);
    ctx.stroke();
    
    // Draw connecting lines at endpoints
    ctx.beginPath();
    ctx.moveTo(localX1 + dx, localY1 + dy);
    ctx.lineTo(localX1 - dx, localY1 - dy);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(localX2 + dx, localY2 + dy);
    ctx.lineTo(localX2 - dx, localY2 - dy);
    ctx.stroke();
    
    // Draw circles at endpoints with solid line
    ctx.setLineDash([]);
    ctx.lineWidth = 1 / (this.scaleX || 1);
    ctx.fillStyle = this.cornerColor || 'rgba(102, 153, 255, 0.5)';
    
    const circleSize = 6 / (this.scaleX || 1);
    
    // First endpoint
    ctx.beginPath();
    ctx.arc(localX1, localY1, circleSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Second endpoint
    ctx.beginPath();
    ctx.arc(localX2, localY2, circleSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  /**
   * Override drawBorders to prevent default border drawing
   */
  override drawBorders(ctx: CanvasRenderingContext2D): any {
    // Don't draw default borders - we handle selection in _renderControls
    return this;
  }

  /**
   * Override drawControls to show only endpoint controls
   */
  override drawControls(ctx: CanvasRenderingContext2D): any {
    // Don't draw controls here - they're handled in drawBorders
    return this;
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
    
    // console.log('Drawing selection in _renderControls at:', { x1, y1, x2, y2 });
    
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
   * Override the selection box rendering to be invisible
   */
  override drawSelectionBackground(ctx: CanvasRenderingContext2D): void {
    // Don't draw the default selection background
  }

  /**
   * Static method to create TestLine from regular Line
   */
  static fromLine(line: fabric.Line): TestLine {
    const coords = line.calcLinePoints();
    const testLine = new TestLine(
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
      }
    );
    return testLine;
  }
}