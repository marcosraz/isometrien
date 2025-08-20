import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

/**
 * Workaround service for Fabric.js v6 zoom selection bug
 * This temporarily removes selection during zoom to avoid rendering issues
 */
@Injectable({
  providedIn: 'root'
})
export class ZoomSelectionWorkaroundService {
  
  private static selectedObjectsBeforeZoom: fabric.FabricObject[] = [];
  private static isZooming = false;
  
  /**
   * Apply workaround to canvas
   */
  public static applyWorkaround(canvas: fabric.Canvas): void {
    // Listen to mouse wheel events BEFORE Fabric.js handles them
    const canvasElement = canvas.getElement();
    const parentElement = canvasElement.parentElement;
    
    if (parentElement) {
      // Add event listener with capture to intercept before Fabric.js
      parentElement.addEventListener('wheel', (event: WheelEvent) => {
        // Skip if Alt key is pressed (reserved for grid size)
        if (event.altKey) return;
        
        // Only process if we have a selection
        const activeObject = canvas.getActiveObject();
        if (!activeObject) return;
        
        // Store selection and clear it
        if (!this.isZooming) {
          this.isZooming = true;
          this.selectedObjectsBeforeZoom = canvas.getActiveObjects();
          
          // Clear selection before zoom
          canvas.discardActiveObject();
          canvas.renderAll();
          
          // Restore selection after zoom completes
          setTimeout(() => {
            if (this.selectedObjectsBeforeZoom.length > 0) {
              if (this.selectedObjectsBeforeZoom.length > 1) {
                const selection = new fabric.ActiveSelection(this.selectedObjectsBeforeZoom, {
                  canvas: canvas
                });
                canvas.setActiveObject(selection);
              } else {
                canvas.setActiveObject(this.selectedObjectsBeforeZoom[0]);
              }
              
              // Update coordinates for all selected objects
              this.selectedObjectsBeforeZoom.forEach(obj => {
                obj.setCoords();
              });
              
              canvas.renderAll();
            }
            
            this.selectedObjectsBeforeZoom = [];
            this.isZooming = false;
          }, 100); // Wait for zoom animation to complete
        }
      }, true); // Use capture phase
    }
  }
}