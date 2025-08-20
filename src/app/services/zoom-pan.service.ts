import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { BehaviorSubject } from 'rxjs';
import { ZoomSelectionWorkaroundService } from './zoom-selection-workaround.service';

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
    // Apply the zoom selection workaround
    ZoomSelectionWorkaroundService.applyWorkaround(canvas);
    this.setupZoomControls();
    this.setupPanControls();
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
      
      // Apply zoom - the ZoomSelectionFixService will handle selection and coordinate updates
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
        
        // Update object coordinates after pan
        this.canvas.getObjects().forEach(obj => {
          obj.setCoords();
        });
        
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
        
        // Update object coordinates after pan
        this.canvas.getObjects().forEach(obj => {
          obj.setCoords();
        });
        
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
  
  zoomIn(): void {
    const currentZoom = this.canvas.getZoom();
    const newZoom = Math.min(currentZoom * 1.2, 5);
    
    // Store active selection
    const activeObject = this.canvas.getActiveObject();
    const selectedObjects = this.canvas.getActiveObjects();
    
    this.canvas.setZoom(newZoom);
    
    // Update object coordinates after zoom
    this.canvas.getObjects().forEach(obj => {
      obj.setCoords();
    });
    
    // Force canvas to recalculate its offset
    (this.canvas as any).calcOffset();
    
    // Force update of selection controls if there's an active selection
    if (activeObject) {
      this.canvas.discardActiveObject();
      
      // Clear the top context
      const topCtx = (this.canvas as any).contextTop;
      if (topCtx) {
        topCtx.clearRect(0, 0, this.canvas.width!, this.canvas.height!);
      }
      
      this.canvas.renderAll();
      
      requestAnimationFrame(() => {
        if (selectedObjects.length > 1) {
          const selection = new fabric.ActiveSelection(selectedObjects, {
            canvas: this.canvas
          });
          this.canvas.setActiveObject(selection);
        } else {
          this.canvas.setActiveObject(activeObject);
        }
        
        const newActive = this.canvas.getActiveObject();
        if (newActive) {
          newActive.setCoords();
        }
        
        this.canvas.renderAll();
      });
    }
    
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
    
    // Store active selection
    const activeObject = this.canvas.getActiveObject();
    const selectedObjects = this.canvas.getActiveObjects();
    
    this.canvas.setZoom(newZoom);
    
    // Update object coordinates after zoom
    this.canvas.getObjects().forEach(obj => {
      obj.setCoords();
    });
    
    // Force canvas to recalculate its offset
    (this.canvas as any).calcOffset();
    
    // Force update of selection controls if there's an active selection
    if (activeObject) {
      this.canvas.discardActiveObject();
      
      // Clear the top context
      const topCtx = (this.canvas as any).contextTop;
      if (topCtx) {
        topCtx.clearRect(0, 0, this.canvas.width!, this.canvas.height!);
      }
      
      this.canvas.renderAll();
      
      requestAnimationFrame(() => {
        if (selectedObjects.length > 1) {
          const selection = new fabric.ActiveSelection(selectedObjects, {
            canvas: this.canvas
          });
          this.canvas.setActiveObject(selection);
        } else {
          this.canvas.setActiveObject(activeObject);
        }
        
        const newActive = this.canvas.getActiveObject();
        if (newActive) {
          newActive.setCoords();
        }
        
        this.canvas.renderAll();
      });
    }
    
    this._viewportState.next({
      zoom: newZoom,
      panX: this.canvas.viewportTransform![4],
      panY: this.canvas.viewportTransform![5]
    });
    this.canvas.requestRenderAll();
  }
  
  resetZoom(): void {
    // Store active selection
    const activeObject = this.canvas.getActiveObject();
    const selectedObjects = this.canvas.getActiveObjects();
    
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    
    // Update object coordinates after zoom reset
    this.canvas.getObjects().forEach(obj => {
      obj.setCoords();
    });
    
    // Force canvas to recalculate its offset
    (this.canvas as any).calcOffset();
    
    // Force update of selection controls if there's an active selection
    if (activeObject) {
      this.canvas.discardActiveObject();
      
      // Clear the top context
      const topCtx = (this.canvas as any).contextTop;
      if (topCtx) {
        topCtx.clearRect(0, 0, this.canvas.width!, this.canvas.height!);
      }
      
      this.canvas.renderAll();
      
      requestAnimationFrame(() => {
        if (selectedObjects.length > 1) {
          const selection = new fabric.ActiveSelection(selectedObjects, {
            canvas: this.canvas
          });
          this.canvas.setActiveObject(selection);
        } else {
          this.canvas.setActiveObject(activeObject);
        }
        
        const newActive = this.canvas.getActiveObject();
        if (newActive) {
          newActive.setCoords();
        }
        
        this.canvas.renderAll();
      });
    }
    
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
}