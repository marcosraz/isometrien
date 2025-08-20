import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

@Injectable({
  providedIn: 'root'
})
export class ZoomSelectionFixService {
  
  /**
   * Install zoom fix on a canvas
   */
  public static installZoomFix(canvas: fabric.Canvas): void {
    // Override the zoomToPoint method
    const originalZoomToPoint = canvas.zoomToPoint.bind(canvas);
    
    canvas.zoomToPoint = function(point: fabric.Point, value: number) {
      // Store active selection
      const activeObject = this.getActiveObject();
      const selectedObjects = this.getActiveObjects();
      
      // Call original zoom
      originalZoomToPoint(point, value);
      
      // CRITICAL: Force canvas to recalculate its offset
      (this as any).calcOffset();
      
      // Update all object coordinates after zoom
      this.getObjects().forEach((obj: fabric.FabricObject) => {
        obj.setCoords();
      });
      
      // Handle selection differently
      if (activeObject) {
        // Clear selection
        this.discardActiveObject();
        
        // Clear the selection layer
        const contextTop = (this as any).contextTop;
        if (contextTop) {
          contextTop.clearRect(0, 0, this.width!, this.height!);
        }
        
        // Render without selection
        this.renderAll();
        
        // Re-select with longer delay to ensure zoom is fully applied
        setTimeout(() => {
          if (selectedObjects.length > 1) {
            const selection = new fabric.ActiveSelection(selectedObjects, {
              canvas: this
            });
            this.setActiveObject(selection);
          } else {
            this.setActiveObject(activeObject);
          }
          
          // Update coordinates again after selection
          const newActive = this.getActiveObject();
          if (newActive) {
            newActive.setCoords();
          }
          
          this.renderAll();
        }, 50); // Increased delay
      }
      
      return this;
    };
  }
}