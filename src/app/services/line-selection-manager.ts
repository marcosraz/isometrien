import * as fabric from 'fabric';

/**
 * Manages custom selection visualization for lines
 * Creates separate visual elements that follow selected lines
 */
export class LineSelectionManager {
  private canvas: fabric.Canvas;
  private selectionElements: fabric.FabricObject[] = [];
  private selectedLine: fabric.Line | null = null;
  
  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas;
    this.setupEventListeners();
  }
  
  private setupEventListeners(): void {
    // Listen for selection events
    this.canvas.on('selection:created', (e) => this.handleSelection(e));
    this.canvas.on('selection:updated', (e) => this.handleSelection(e));
    this.canvas.on('selection:cleared', () => this.clearSelection());
    
    // Update selection position on canvas changes
    this.canvas.on('after:render', () => this.updateSelectionPosition());
  }
  
  private handleSelection(e: any): void {
    const selected = e.selected?.[0] || e.target;
    
    // Only handle line objects
    if (selected && selected.type === 'line') {
      this.createSelectionVisualization(selected);
    } else {
      this.clearSelection();
    }
  }
  
  private createSelectionVisualization(line: fabric.Line): void {
    // Clear previous selection
    this.clearSelection();
    
    this.selectedLine = line;
    
    // Hide the default selection for the line
    line.set({
      hasControls: false,
      hasBorders: false,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
      borderColor: 'transparent',
      cornerColor: 'transparent',
      transparentCorners: true,
      borderOpacityWhenMoving: 0,
      borderScaleFactor: 0
    });
    
    // Get line coordinates using the line's own properties
    const lineCoords = line.calcLinePoints();
    const matrix = line.calcTransformMatrix();
    
    // Transform the line endpoints to world coordinates
    const point1 = fabric.util.transformPoint(
      new fabric.Point(lineCoords.x1 || 0, lineCoords.y1 || 0),
      matrix
    );
    const point2 = fabric.util.transformPoint(
      new fabric.Point(lineCoords.x2 || 0, lineCoords.y2 || 0),
      matrix
    );
    
    const x1 = point1.x;
    const y1 = point1.y;
    const x2 = point2.x;
    const y2 = point2.y;
    
    // Calculate perpendicular offset for parallel lines
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;
    const offset = 10;
    
    const dx = Math.cos(perpAngle) * offset;
    const dy = Math.sin(perpAngle) * offset;
    
    // Create parallel lines directly on canvas coordinates
    const upperLine = new fabric.Line(
      [x1 + dx, y1 + dy, x2 + dx, y2 + dy],
      {
        stroke: 'rgba(102, 153, 255, 0.75)',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        objectCaching: false
      }
    );
    
    const lowerLine = new fabric.Line(
      [x1 - dx, y1 - dy, x2 - dx, y2 - dy],
      {
        stroke: 'rgba(102, 153, 255, 0.75)',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        objectCaching: false
      }
    );
    
    // Create connecting lines at endpoints
    const connector1 = new fabric.Line(
      [x1 + dx, y1 + dy, x1 - dx, y1 - dy],
      {
        stroke: 'rgba(102, 153, 255, 0.75)',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        objectCaching: false
      }
    );
    
    const connector2 = new fabric.Line(
      [x2 + dx, y2 + dy, x2 - dx, y2 - dy],
      {
        stroke: 'rgba(102, 153, 255, 0.75)',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
        objectCaching: false
      }
    );
    
    // Create circles at endpoints - position at center
    const circle1 = new fabric.Circle({
      left: x1,
      top: y1,
      radius: 6,
      fill: 'rgba(102, 153, 255, 0.5)',
      stroke: 'rgba(102, 153, 255, 0.75)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
      originX: 'center',
      originY: 'center'
    });
    
    const circle2 = new fabric.Circle({
      left: x2,
      top: y2,
      radius: 6,
      fill: 'rgba(102, 153, 255, 0.5)',
      stroke: 'rgba(102, 153, 255, 0.75)',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
      objectCaching: false,
      originX: 'center',
      originY: 'center'
    });
    
    // Store all selection elements
    this.selectionElements = [upperLine, lowerLine, connector1, connector2, circle1, circle2];
    
    // Add elements individually to canvas
    this.selectionElements.forEach(elem => {
      this.canvas.add(elem);
    });
    
    // Bring selection elements to front
    this.selectionElements.forEach(elem => {
      this.canvas.bringObjectToFront(elem);
    });
    
    this.canvas.renderAll();
  }
  
  private updateSelectionPosition(): void {
    if (this.selectionElements.length === 0 || !this.selectedLine) return;
    
    // Recalculate position for line movement
    const lineCoords = this.selectedLine.calcLinePoints();
    const matrix = this.selectedLine.calcTransformMatrix();
    
    // Transform the line endpoints to world coordinates
    const point1 = fabric.util.transformPoint(
      new fabric.Point(lineCoords.x1 || 0, lineCoords.y1 || 0),
      matrix
    );
    const point2 = fabric.util.transformPoint(
      new fabric.Point(lineCoords.x2 || 0, lineCoords.y2 || 0),
      matrix
    );
    
    const x1 = point1.x;
    const y1 = point1.y;
    const x2 = point2.x;
    const y2 = point2.y;
    
    // Calculate perpendicular offset for parallel lines
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const perpAngle = angle + Math.PI / 2;
    const offset = 10;
    
    const dx = Math.cos(perpAngle) * offset;
    const dy = Math.sin(perpAngle) * offset;
    
    // Update positions of selection elements
    const [upperLine, lowerLine, connector1, connector2, circle1, circle2] = this.selectionElements;
    
    // Update upper line
    (upperLine as fabric.Line).set({
      x1: x1 + dx,
      y1: y1 + dy,
      x2: x2 + dx,
      y2: y2 + dy
    });
    
    // Update lower line
    (lowerLine as fabric.Line).set({
      x1: x1 - dx,
      y1: y1 - dy,
      x2: x2 - dx,
      y2: y2 - dy
    });
    
    // Update connector 1
    (connector1 as fabric.Line).set({
      x1: x1 + dx,
      y1: y1 + dy,
      x2: x1 - dx,
      y2: y1 - dy
    });
    
    // Update connector 2
    (connector2 as fabric.Line).set({
      x1: x2 + dx,
      y1: y2 + dy,
      x2: x2 - dx,
      y2: y2 - dy
    });
    
    // Update circles
    (circle1 as fabric.Circle).set({
      left: x1,
      top: y1
    });
    
    (circle2 as fabric.Circle).set({
      left: x2,
      top: y2
    });
    
    // Update coordinates for all elements
    this.selectionElements.forEach(elem => {
      elem.setCoords();
    });
  }
  
  private clearSelection(): void {
    // Remove all selection elements from canvas
    this.selectionElements.forEach(elem => {
      this.canvas.remove(elem);
    });
    this.selectionElements = [];
    
    if (this.selectedLine) {
      // Restore default properties
      this.selectedLine.set({
        hasControls: false,
        hasBorders: false
      });
      this.selectedLine = null;
    }
    
    this.canvas.renderAll();
  }
  
  public destroy(): void {
    this.clearSelection();
    this.canvas.off('selection:created');
    this.canvas.off('selection:updated');
    this.canvas.off('selection:cleared');
    this.canvas.off('after:render');
  }
}