import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { BehaviorSubject } from 'rxjs';
import { CustomLine } from './custom-line.class';
import { LineSelectionManager } from './line-selection-manager';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZoomPanService {
  private canvas!: fabric.Canvas;
  private isDragging = false;
  private lastPosX = 0;
  private lastPosY = 0;
  private spaceKeyPressed = false;
  private lineSelectionManager?: LineSelectionManager;
  
  private _viewportState = new BehaviorSubject<ViewportState>({
    zoom: 1,
    panX: 0,
    panY: 0
  });
  
  private _panState = new BehaviorSubject<boolean>(false);
  
  public viewportState = this._viewportState.asObservable();
  public panState = this._panState.asObservable();
  
  initializeCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.setupZoomControls();
    this.setupPanControls();
    // Use the new LineSelectionManager instead of complex overrides
    this.lineSelectionManager = new LineSelectionManager(canvas);
    this.installSimpleZoomFix();
  }
  
  private setupZoomControls(): void {
    this.canvas.on('mouse:wheel', (opt) => {
      const event = opt.e as WheelEvent;
      
      // Skip zoom if Alt key is pressed (reserved for grid size)
      if (event.altKey) {
        return;
      }
      
      const delta = event.deltaY;
      let zoom = this.canvas.getZoom();
      
      zoom *= 0.999 ** delta;
      zoom = Math.max(0.1, Math.min(5, zoom)); // Limit zoom range
      
      // Apply zoom 
      const point = new fabric.Point(event.offsetX, event.offsetY);
      this.canvas.zoomToPoint(point, zoom);
      
      this._viewportState.next({
        zoom,
        panX: this.canvas.viewportTransform![4],
        panY: this.canvas.viewportTransform![5]
      });
      
      event.preventDefault();
      event.stopPropagation();
    });
  }
  
  private setupPanControls(): void {
    // Setup space key detection
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Space' && !this.spaceKeyPressed) {
        this.spaceKeyPressed = true;
        this.canvas.setCursor('grab');
        event.preventDefault();
      }
    });
    
    document.addEventListener('keyup', (event) => {
      if (event.code === 'Space') {
        this.spaceKeyPressed = false;
        if (!this.isDragging) {
          this.canvas.setCursor('default');
        }
      }
    });
    
    // Global mouse event handlers for better middle mouse detection
    document.addEventListener('mousedown', (event) => {
      // Check if the mouse is over the canvas
      const canvasElement = this.canvas.getElement();
      const rect = canvasElement.getBoundingClientRect();
      const isOverCanvas = event.clientX >= rect.left && event.clientX <= rect.right &&
                          event.clientY >= rect.top && event.clientY <= rect.bottom;
      
      if (isOverCanvas && event.button === 1) { // Middle mouse button
        console.log('Middle mouse detected!'); // Debug log
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
        this._panState.next(true);
        this.canvas.selection = false;
        this.lastPosX = event.clientX;
        this.lastPosY = event.clientY;
        this.canvas.setCursor('grabbing');
      }
    });
    
    document.addEventListener('mousemove', (event) => {
      if (this.isDragging && event.buttons === 4) { // Middle mouse button is pressed (bit 2)
        const vpt = this.canvas.viewportTransform!;
        vpt[4] += event.clientX - this.lastPosX;
        vpt[5] += event.clientY - this.lastPosY;
        
        // Sync selection after pan
        this.syncSelectionWithObjects();
        this.canvas.requestRenderAll();
        this.lastPosX = event.clientX;
        this.lastPosY = event.clientY;
        
        this._viewportState.next({
          zoom: this.canvas.getZoom(),
          panX: vpt[4],
          panY: vpt[5]
        });
      }
    });
    
    document.addEventListener('mouseup', (event) => {
      if (event.button === 1 && this.isDragging) { // Middle mouse button
        console.log('Middle mouse released!'); // Debug log
        this.isDragging = false;
        this._panState.next(false);
        this.canvas.selection = true;
        this.canvas.setCursor(this.spaceKeyPressed ? 'grab' : 'default');
      }
    });
    
    // Prevent context menu on right click
    this.canvas.getElement().addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
    
    this.canvas.on('mouse:down', (opt) => {
      const event = opt.e as MouseEvent;
      console.log('Canvas mouse down, button:', event.button); // Debug log
      // Pan with: right mouse button (2) or left mouse + space key
      if (event.button === 2 || (event.button === 0 && this.spaceKeyPressed)) {
        this.isDragging = true;
        this._panState.next(true);
        this.canvas.selection = false;
        this.lastPosX = event.clientX;
        this.lastPosY = event.clientY;
        this.canvas.setCursor('grabbing');
      }
    });
    
    // Fabric.js mouse move handler for Space+Drag and Right-click+Drag
    this.canvas.on('mouse:move', (opt) => {
      if (this.isDragging) {
        const event = opt.e as MouseEvent;
        // Skip if this is middle mouse button drag (handled by global listener)
        if (event.button === 1) return;
        
        const vpt = this.canvas.viewportTransform!;
        vpt[4] += event.clientX - this.lastPosX;
        vpt[5] += event.clientY - this.lastPosY;
        
        // Sync selection after pan
        this.syncSelectionWithObjects();
        this.canvas.requestRenderAll();
        this.lastPosX = event.clientX;
        this.lastPosY = event.clientY;
        
        this._viewportState.next({
          zoom: this.canvas.getZoom(),
          panX: vpt[4],
          panY: vpt[5]
        });
      }
    });
    
    this.canvas.on('mouse:up', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this._panState.next(false);
        this.canvas.selection = true;
        this.canvas.setCursor(this.spaceKeyPressed ? 'grab' : 'default');
        
        // Update object coordinates after pan ends
        this.canvas.getObjects().forEach(obj => {
          obj.setCoords();
        });
        this.canvas.requestRenderAll();
      }
    });
  }
  
  /**
   * Simple zoom fix for Fabric.js v6
   * Ensures viewport transforms are applied correctly
   */
  private installSimpleZoomFix(): void {
    const canvas = this.canvas as any;
    
    // Store original methods
    const originalZoomToPoint = canvas.zoomToPoint.bind(canvas);
    const originalSetZoom = canvas.setZoom.bind(canvas);
    const originalSetViewportTransform = canvas.setViewportTransform.bind(canvas);
    const originalRenderAll = canvas.renderAll.bind(canvas);
    
    // Override renderAll to fix selection rendering with zoom
    canvas.renderAll = function() {
      const result = originalRenderAll.call(this);
      
      // Fix selection layer transform
      if (this.contextTop) {
        const ctx = this.contextTop as CanvasRenderingContext2D;
        const vpt = this.viewportTransform;
        
        // Clear and re-apply transform
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.restore();
        
        // Apply viewport transform and redraw selection
        if (vpt) {
          ctx.setTransform(vpt[0], vpt[1], vpt[2], vpt[3], vpt[4], vpt[5]);
        }
        
        const activeObject = this.getActiveObject();
        if (activeObject && activeObject.drawControls) {
          activeObject.drawControls(ctx);
        }
      }
      
      return result;
    };
    
    // Update coordinates on zoom
    canvas.zoomToPoint = function(point: fabric.Point, value: number) {
      const result = originalZoomToPoint.call(this, point, value);
      this.forEachObject((obj: fabric.FabricObject) => obj.setCoords());
      const activeObject = this.getActiveObject();
      if (activeObject) activeObject.setCoords();
      this.requestRenderAll();
      return result;
    };
    
    canvas.setZoom = function(value: number) {
      const result = originalSetZoom.call(this, value);
      this.forEachObject((obj: fabric.FabricObject) => obj.setCoords());
      const activeObject = this.getActiveObject();
      if (activeObject) activeObject.setCoords();
      this.requestRenderAll();
      return result;
    };
    
    canvas.setViewportTransform = function(vpt: fabric.TMat2D) {
      const result = originalSetViewportTransform.call(this, vpt);
      this.forEachObject((obj: fabric.FabricObject) => obj.setCoords());
      const activeObject = this.getActiveObject();
      if (activeObject) activeObject.setCoords();
      this.requestRenderAll();
      return result;
    };
    
    console.log('Simple zoom fix installed');
  }
  
  public syncSelectionWithObjects(): void {
    // Force canvas to recalculate its offset for proper mouse coordinates
    (this.canvas as any).calcOffset();
    
    // Update all object coordinates
    this.canvas.getObjects().forEach(obj => obj.setCoords());
    
    // Get active selection and update it
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      activeObject.setCoords();
      
      // For groups and active selections, update all child objects
      if (activeObject.type === 'activeSelection') {
        (activeObject as fabric.ActiveSelection).forEachObject((obj: any) => {
          obj.setCoords();
        });
      }
    }
    
    // Force immediate re-render
    this.canvas.requestRenderAll();
  }
  
  zoomIn(): void {
    const currentZoom = this.canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.2, 5);
    
    this.canvas.setZoom(newZoom);
    
    this._viewportState.next({
      zoom: newZoom,
      panX: this.canvas.viewportTransform![4],
      panY: this.canvas.viewportTransform![5]
    });
    this.canvas.requestRenderAll();
  }
  
  zoomOut(): void {
    const currentZoom = this.canvas.getZoom();
    const newZoom = Math.max(currentZoom / 1.2, 0.1);
    
    this.canvas.setZoom(newZoom);
    
    this._viewportState.next({
      zoom: newZoom,
      panX: this.canvas.viewportTransform![4],
      panY: this.canvas.viewportTransform![5]
    });
    this.canvas.requestRenderAll();
  }
  
  resetZoom(): void {
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    this._viewportState.next({
      zoom: 1,
      panX: 0,
      panY: 0
    });
    this.canvas.requestRenderAll();
  }
  
  zoomToFit(): void {
    const objects = this.canvas.getObjects();
    if (objects.length === 0) return;
    
    const group = new fabric.Group(objects, { left: 0, top: 0 });
    const boundingRect = group.getBoundingRect();
    
    const canvasWidth = this.canvas.getWidth();
    const canvasHeight = this.canvas.getHeight();
    
    const scaleX = (canvasWidth - 40) / boundingRect.width;
    const scaleY = (canvasHeight - 40) / boundingRect.height;
    const scale = Math.min(scaleX, scaleY, 2); // Max zoom 2x
    
    const centerX = boundingRect.left + boundingRect.width / 2;
    const centerY = boundingRect.top + boundingRect.height / 2;
    
    const canvasCenterX = canvasWidth / 2;
    const canvasCenterY = canvasHeight / 2;
    
    const panX = canvasCenterX - centerX * scale;
    const panY = canvasCenterY - centerY * scale;
    
    this.canvas.setViewportTransform([scale, 0, 0, scale, panX, panY]);
    
    this._viewportState.next({ zoom: scale, panX, panY });
    this.canvas.requestRenderAll();
  }
  
  /**
   * Improve line selection visualization
   * Make lines easier to select and show selection more elegantly
   */
  private improveLineSelection(): void {
    // Listen for objects being added to canvas
    this.canvas.on('object:added', (e) => {
      const obj = e.target;
      if (obj && obj.type === 'line') {
        // Improve line selection properties
        obj.set({
          perPixelTargetFind: true,
          targetFindTolerance: 10,  // Make lines easier to select
          padding: 5,  // Add padding around line for easier selection
          hasBorders: false,  // Remove the rectangular border
          borderColor: 'transparent',  // Make border transparent
          cornerSize: 10,  // Control point size
          cornerStyle: 'circle',  // Use circles instead of squares
          transparentCorners: false,
          cornerColor: '#4CAF50',  // Green corner color
          cornerStrokeColor: '#2E7D32',  // Darker green border
          selectionBackgroundColor: 'transparent',  // No background fill
          hasControls: true,  // Keep controls for resizing
          lockRotation: false,  // Allow rotation
        });
        
        // Store original stroke width for selection effect
        (obj as any).originalStrokeWidth = obj.strokeWidth;
      }
    });
    
    // Enhance selection visual feedback
    this.canvas.on('selection:created', (e) => {
      if (e.selected) {
        e.selected.forEach(obj => {
          if (obj.type === 'line') {
            // Make line slightly thicker when selected
            const originalWidth = (obj as any).originalStrokeWidth || obj.strokeWidth;
            obj.set({
              strokeWidth: originalWidth! + 2,
              shadow: new fabric.Shadow({
                color: 'rgba(76, 175, 80, 0.3)',
                blur: 10,
                offsetX: 0,
                offsetY: 0
              })
            });
            this.canvas.requestRenderAll();
          }
        });
      }
    });
    
    this.canvas.on('selection:updated', (e) => {
      // Reset deselected objects
      if (e.deselected) {
        e.deselected.forEach(obj => {
          if (obj.type === 'line') {
            const originalWidth = (obj as any).originalStrokeWidth || 2;
            obj.set({
              strokeWidth: originalWidth,
              shadow: null
            });
          }
        });
      }
      
      // Enhance newly selected objects
      if (e.selected) {
        e.selected.forEach(obj => {
          if (obj.type === 'line') {
            const originalWidth = (obj as any).originalStrokeWidth || obj.strokeWidth;
            obj.set({
              strokeWidth: originalWidth! + 2,
              shadow: new fabric.Shadow({
                color: 'rgba(76, 175, 80, 0.3)',
                blur: 10,
                offsetX: 0,
                offsetY: 0
              })
            });
          }
        });
      }
      this.canvas.requestRenderAll();
    });
    
    this.canvas.on('selection:cleared', (e) => {
      // Reset all lines to original state
      this.canvas.getObjects('line').forEach(obj => {
        const originalWidth = (obj as any).originalStrokeWidth || 2;
        obj.set({
          strokeWidth: originalWidth,
          shadow: null
        });
      });
      this.canvas.requestRenderAll();
    });
  }
  
  private convertExistingLinesToCustomLine(): void {
    // Convert all existing fabric.Line objects to CustomLine for better selection
    const objects = this.canvas.getObjects();
    const linesToReplace: { oldLine: fabric.Line, newLine: CustomLine }[] = [];
    
    objects.forEach(obj => {
      // Check if it's a regular fabric.Line (not already CustomLine)
      if (obj.type === 'line' && !(obj instanceof CustomLine)) {
        const line = obj as fabric.Line;
        
        // Skip dimension lines and other special lines
        if ((line as any).isDimensionPart) {
          return;
        }
        
        // Create a CustomLine from the existing line
        const customLine = CustomLine.fromLine(line);
        linesToReplace.push({ oldLine: line, newLine: customLine });
      }
    });
    
    // Replace lines on canvas
    linesToReplace.forEach(({ oldLine, newLine }) => {
      const index = this.canvas.getObjects().indexOf(oldLine);
      if (index !== -1) {
        this.canvas.remove(oldLine);
        this.canvas.insertAt(index, newLine);
      }
    });
    
    if (linesToReplace.length > 0) {
      console.log(`Converted ${linesToReplace.length} lines to CustomLine for better selection`);
      this.canvas.requestRenderAll();
    }
  }
}