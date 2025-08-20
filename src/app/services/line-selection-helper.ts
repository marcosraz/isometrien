import * as fabric from 'fabric';

/**
 * Helper class to improve line selection visualization
 */
export class LineSelectionHelper {
  
  /**
   * Configure a line object for better selection
   */
  public static configureLine(line: fabric.Line): void {
    // Force line to be selectable with visible borders
    line.set({
      perPixelTargetFind: true,
      targetFindTolerance: 10, // Increased for easier selection
      selectable: true,
      evented: true,
      hasControls: true, // Enable controls to show selection
      hasBorders: true,
      borderColor: '#3498db', // Bright blue color
      borderDashArray: [5, 5],
      borderScaleFactor: 2,
      borderOpacityWhenMoving: 0.7,
      cornerColor: '#3498db',
      cornerSize: 10,
      cornerStyle: 'circle',
      transparentCorners: false,
      padding: 10, // Add padding around the line
      strokeUniform: true, // Keep stroke width consistent
    });
    
    // Set a custom class to identify configured lines
    (line as any).isConfiguredLine = true;
    
    // Force the line to always show selection box
    (line as any).drawControls = function(ctx: CanvasRenderingContext2D) {
      if (!this.hasControls || !this.canvas) {
        return this;
      }
      // Call the parent drawControls method
      return fabric.FabricObject.prototype.drawControls.call(this, ctx);
    };
  }
  
  /**
   * Configure a path object (curved pipes) for better selection
   */
  public static configurePath(path: fabric.Path): void {
    path.set({
      perPixelTargetFind: true,
      targetFindTolerance: 5,
      transparentCorners: false,
      cornerColor: 'rgba(102, 153, 255, 0.5)',
      cornerStyle: 'circle',
      cornerSize: 8,
      borderScaleFactor: 1,
      borderDashArray: [5, 5],
      borderOpacityWhenMoving: 0.5,
      // Ensure the path is selectable
      selectable: true,
      evented: true,
      hasControls: false,  // Paths usually don't need resize controls
      hasBorders: true,
    });
  }
}