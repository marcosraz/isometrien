import * as fabric from 'fabric';

/**
 * Custom selection handler that completely replaces Fabric.js selection rendering
 * for CustomLine objects to fix the double-rendering issue
 */
export class CustomSelectionHandler {
  private canvas: fabric.Canvas;
  private selectionCanvas: HTMLCanvasElement;
  private selectionCtx: CanvasRenderingContext2D;
  
  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    
    // Create an overlay canvas for selection rendering
    this.selectionCanvas = document.createElement('canvas');
    this.selectionCanvas.width = canvas.getWidth();
    this.selectionCanvas.height = canvas.getHeight();
    this.selectionCanvas.style.position = 'absolute';
    this.selectionCanvas.style.pointerEvents = 'none';
    this.selectionCanvas.style.left = '0';
    this.selectionCanvas.style.top = '0';
    
    // Insert the selection canvas after the main canvas
    const canvasContainer = (canvas as any).wrapperEl || canvas.getElement().parentElement;
    if (canvasContainer) {
      canvasContainer.appendChild(this.selectionCanvas);
    }
    
    this.selectionCtx = this.selectionCanvas.getContext('2d')!;
    
    // Listen for selection changes
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Listen for selection events
    this.canvas.on('selection:created', () => this.renderSelection());
    this.canvas.on('selection:updated', () => this.renderSelection());
    this.canvas.on('selection:cleared', () => this.clearSelection());
    
    // Listen for canvas transformations
    this.canvas.on('after:render', () => this.renderSelection());
  }
  
  private clearSelection(): void {
    this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);
  }
  
  private renderSelection(): void {
    // Clear previous selection
    this.clearSelection();
    
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) return;
    
    // Only handle CustomLine objects
    if ((activeObject as any).customType !== 'CustomLine') return;
    
    const ctx = this.selectionCtx;
    const vpt = this.canvas.viewportTransform;
    
    if (!vpt) return;
    
    ctx.save();
    
    // Apply viewport transform
    ctx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
    
    // Get line properties
    const line = activeObject as any;
    const center = line.getCenterPoint();
    
    ctx.translate(center.x, center.y);
    ctx.rotate(fabric.util.degreesToRadians(line.angle || 0));
    ctx.scale(line.scaleX || 1, line.scaleY || 1);
    
    // Calculate line endpoints in local space
    const halfWidth = (line.width || 0) / 2;
    const halfHeight = (line.height || 0) / 2;
    
    let x1, y1, x2, y2;
    
    // Determine line direction based on original points
    if (line.x1 < line.x2) {
      if (line.y1 < line.y2) {
        x1 = -halfWidth;
        y1 = -halfHeight;
        x2 = halfWidth;
        y2 = halfHeight;
      } else {
        x1 = -halfWidth;
        y1 = halfHeight;
        x2 = halfWidth;
        y2 = -halfHeight;
      }
    } else {
      if (line.y1 < line.y2) {
        x1 = halfWidth;
        y1 = -halfHeight;
        x2 = -halfWidth;
        y2 = halfHeight;
      } else {
        x1 = halfWidth;
        y1 = halfHeight;
        x2 = -halfWidth;
        y2 = -halfHeight;
      }
    }
    
    // Setup line style for selection
    ctx.strokeStyle = 'rgba(102, 153, 255, 0.75)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    // Calculate perpendicular offset for parallel lines
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;
    const offset = 10;
    
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
    ctx.fillStyle = 'rgba(102, 153, 255, 0.5)';
    
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
  
  public updateCanvasSize(width: number, height: number): void {
    this.selectionCanvas.width = width;
    this.selectionCanvas.height = height;
    this.renderSelection();
  }
  
  public destroy(): void {
    this.canvas.off('selection:created');
    this.canvas.off('selection:updated');
    this.canvas.off('selection:cleared');
    this.canvas.off('after:render');
    
    if (this.selectionCanvas.parentElement) {
      this.selectionCanvas.parentElement.removeChild(this.selectionCanvas);
    }
  }
}