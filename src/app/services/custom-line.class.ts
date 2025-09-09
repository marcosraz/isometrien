import * as fabric from 'fabric';

/**
 * Custom Line class with improved selection visualization
 * Shows selection along the line instead of as a bounding box
 */
export class CustomLine extends fabric.Line {
  
  constructor(points: [number, number, number, number], options?: any) {
    super(points, options);
    
    // Force disable all standard controls
    this.controls = {};
    
    // Set default properties for better selection
    this.set({
      customType: 'CustomLine', // Identify this as a CustomLine
      perPixelTargetFind: true,
      targetFindTolerance: 5,
      transparentCorners: true, // Make corners transparent
      cornerColor: 'transparent', // Hide corner color
      cornerStyle: 'circle',
      cornerSize: 0, // Hide corner size
      borderColor: 'transparent', // Hide border color
      borderDashArray: null,
      borderScaleFactor: 0,
      padding: 10,
      objectCaching: false, // Disable caching to ensure our custom rendering works
      hasControls: false, // Disable standard controls completely
      hasBorders: false, // Disable selection border
      lockRotation: true, // Disable rotation
      lockScalingX: true, // Disable horizontal scaling
      lockScalingY: true, // Disable vertical scaling
      lockMovementX: false, // Allow horizontal movement
      lockMovementY: false, // Allow vertical movement
      selectionBackgroundColor: 'transparent', // Hide selection background
      borderOpacityWhenMoving: 0, // Hide border when moving
      ...options
    });
    
    // Force remove all standard controls after options are applied
    this.controls = {};
    this.setControlsVisibility({
      ml: false,
      mt: false,
      mr: false,
      mb: false,
      tl: false,
      tr: false,
      br: false,
      bl: false,
      mtr: false
    });
  }

  /**
   * Override _renderControls to draw our custom selection
   */
  override _renderControls(ctx: CanvasRenderingContext2D, styleOverride?: any): void {
    // Check if this line is selected
    if (!this.canvas) {
      return;
    }
    
    const activeObject = this.canvas.getActiveObject();
    if (activeObject !== this) {
      return;
    }
    
    // Use the passed context
    if (!ctx) {
      console.log('CustomLine _renderControls: No context provided');
      return;
    }
    
    console.log('CustomLine _renderControls called with context:', ctx);
    
    // Save the current context state
    ctx.save();
    
    // Apply transformation to world coordinates
    const center = this.getCenterPoint();
    ctx.translate(center.x, center.y);
    ctx.rotate(fabric.util.degreesToRadians(this.angle || 0));
    ctx.scale(this.scaleX || 1, this.scaleY || 1);
    
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
    ctx.strokeStyle = this.borderColor || 'rgba(102, 153, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Calculate perpendicular offset for parallel lines
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;
    const offset = this.padding || 10;
    
    const dx = Math.cos(perpAngle) * offset;
    const dy = Math.sin(perpAngle) * offset;
    
    // Draw upper parallel line
    ctx.beginPath();
    ctx.moveTo(x1 + dx, y1 + dy);
    ctx.lineTo(x2 + dx, y2 + dy);
    ctx.stroke();
    
    // Draw lower parallel line
    ctx.beginPath();
    ctx.moveTo(x1 - dx, y1 - dy);
    ctx.lineTo(x2 - dx, y2 - dy);
    ctx.stroke();
    
    // Draw connecting lines at endpoints
    ctx.beginPath();
    ctx.moveTo(x1 + dx, y1 + dy);
    ctx.lineTo(x1 - dx, y1 - dy);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x2 + dx, y2 + dy);
    ctx.lineTo(x2 - dx, y2 - dy);
    ctx.stroke();
    
    // Draw circles at endpoints with solid line
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    ctx.fillStyle = this.cornerColor || 'rgba(102, 153, 255, 0.5)';
    
    const circleSize = 6;
    
    // First endpoint
    ctx.beginPath();
    ctx.arc(x1, y1, circleSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    // Second endpoint
    ctx.beginPath();
    ctx.arc(x2, y2, circleSize, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * Override drawBorders to prevent default border drawing
   */
  override drawBorders(ctx: CanvasRenderingContext2D): any {
    // Don't draw default borders - we handle selection in _renderControls
    console.log('CustomLine drawBorders called but skipping');
    return this;
  }

  /**
   * Override drawControls to prevent default control drawing
   */
  override drawControls(ctx: CanvasRenderingContext2D): any {
    // Don't draw any controls for CustomLine
    console.log('CustomLine drawControls called but skipping');
    return this;
  }
  
  /**
   * Override setCoords to prevent control coordinate calculation
   */
  override setCoords(): void {
    super.setCoords();
    // Clear controls after coordinate calculation
    this.controls = {};
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
        hasControls: false,
        hasBorders: false,
        lockRotation: true,
        // Ensure CustomLine type is set
        customType: 'CustomLine',
        // Copy all other custom properties
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