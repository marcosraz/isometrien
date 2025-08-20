import * as fabric from 'fabric';

/**
 * Helper class to improve line selection visualization
 */
export class LineSelectionHelper {
  
  /**
   * Configure a line object for better selection
   */
  public static configureLine(line: fabric.Line): void {
    // Enable pixel-perfect selection
    line.set({
      perPixelTargetFind: true,
      targetFindTolerance: 5,
      transparentCorners: false,
      cornerColor: 'rgba(102, 153, 255, 0.5)',
      cornerStyle: 'circle',
      cornerSize: 8,
      borderScaleFactor: 1,
      borderDashArray: [5, 5],
      borderOpacityWhenMoving: 0.5,
      // Ensure the line is selectable
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
    });
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