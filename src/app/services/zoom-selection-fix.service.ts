import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

@Injectable({
  providedIn: 'root'
})
export class ZoomSelectionFixService {
  
  private static debugMode = false;
  
  /**
   * Enable/disable debug logging
   */
  public static setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`Zoom Selection Fix Debug Mode: ${enabled ? 'ON' : 'OFF'}`);
  }
  
  /**
   * Install zoom fix on a canvas
   */
  public static installZoomFix(canvas: fabric.Canvas): void {
    console.log('Installing Zoom Selection Fix v4 (fixed)...');
    
    // Make debug controls available globally
    (window as any).zoomDebug = {
      enable: () => this.setDebugMode(true),
      disable: () => this.setDebugMode(false),
      getSelection: () => canvas.getActiveObject(),
      updateCoords: () => {
        canvas.getObjects().forEach(obj => obj.setCoords());
        const active = canvas.getActiveObject();
        if (active) {
          active.setCoords();
          canvas.requestRenderAll();
        }
        console.log('Manually updated all coordinates');
      },
      getZoom: () => canvas.getZoom(),
      setZoom: (zoom: number) => canvas.setZoom(zoom),
      clearSelection: () => {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      }
    };
    
    console.log('Debug controls available via window.zoomDebug');
    
    // Store original methods - IMPORTANT: bind them to canvas!
    const originalZoomToPoint = canvas.zoomToPoint.bind(canvas);
    const originalSetZoom = canvas.setZoom.bind(canvas);
    const originalSetViewportTransform = canvas.setViewportTransform.bind(canvas);
    
    // Helper function to update everything after zoom
    const updateAfterZoom = () => {
      // Force canvas to recalculate its offset
      (canvas as any).calcOffset();
      
      // Update all object coordinates
      canvas.getObjects().forEach((obj: fabric.FabricObject) => {
        obj.setCoords();
      });
      
      // Update active object if exists
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.setCoords();
        
        // For groups and active selections
        if (activeObject.type === 'activeSelection' || activeObject.type === 'group') {
          const group = activeObject as fabric.ActiveSelection | fabric.Group;
          group.getObjects().forEach(obj => {
            obj.setCoords();
          });
        }
        
        if (this.debugMode) {
          const bounds = activeObject.getBoundingRect();
          console.log('Zoom applied, selection updated:', {
            zoom: canvas.getZoom(),
            bounds: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height }
          });
        }
      }
      
      // Request render
      canvas.requestRenderAll();
    };
    
    // Override zoomToPoint - CRITICAL: must preserve canvas context
    canvas.zoomToPoint = function(this: fabric.Canvas, point: fabric.Point, value: number) {
      if (ZoomSelectionFixService.debugMode) {
        console.log('zoomToPoint called:', { point: { x: point.x, y: point.y }, zoom: value });
      }
      
      // Call original with preserved context
      const result = originalZoomToPoint.call(this, point, value);
      
      // Update after zoom
      updateAfterZoom();
      
      return result;
    };
    
    // Override setZoom
    canvas.setZoom = function(this: fabric.Canvas, value: number) {
      if (ZoomSelectionFixService.debugMode) {
        console.log('setZoom called:', { zoom: value });
      }
      
      // Call original with preserved context
      const result = originalSetZoom.call(this, value);
      
      // Update after zoom
      updateAfterZoom();
      
      return result;
    };
    
    // Override setViewportTransform for zoomToFit (F key)
    canvas.setViewportTransform = function(this: fabric.Canvas, vpt: fabric.TMat2D) {
      if (ZoomSelectionFixService.debugMode) {
        console.log('setViewportTransform called:', { 
          zoom: vpt[0], 
          panX: vpt[4], 
          panY: vpt[5] 
        });
      }
      
      // Call original with preserved context
      const result = originalSetViewportTransform.call(this, vpt);
      
      // Update after transform
      updateAfterZoom();
      
      return result;
    };
    
    console.log('Zoom Selection Fix v4 installed successfully!');
    console.log('Override methods attached with proper context binding');
  }
}