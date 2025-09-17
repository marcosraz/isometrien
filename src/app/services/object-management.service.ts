import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { StateManagementService } from './state-management.service';

@Injectable({
  providedIn: 'root',
})
export class ObjectManagementService {
  private stateManagement: StateManagementService | null = null;
  private spoolMode: boolean = false;
  private spoolCounter: number = 1;
  private revisionCloudMode: boolean = false;
  private revisionCloudPoints: fabric.Point[] = [];
  private tempRevisionCloud: fabric.Path | null = null;
  private tempLine: fabric.Line | null = null;
  private tempCircles: fabric.Circle[] = [];
  private waveDensityFactor: number = 1.0; // Renamed for clarity
  private baseWaveHeight: number = 25; // Increased base wave height for better visibility
  private wheelHandler: ((e: WheelEvent) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private keyupHandler: ((e: KeyboardEvent) => void) | null = null;
  private isCtrlPressed: boolean = false;
  private isAltPressed: boolean = false;
  private isXPressed: boolean = false;
  private canvas: fabric.Canvas | null = null;
  private MIN_POINTS = 3;
  private MAX_POINTS = 7;
  private MIN_DENSITY = 0.3;
  private MAX_DENSITY = 3.0;
  private densityText: fabric.Text | null = null; // Visual feedback for density
  
  constructor() {}
  
  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }

  public startSpoolMode(): void {
    this.spoolMode = true;
  }

  public stopSpoolMode(): void {
    this.spoolMode = false;
  }

  public isSpoolMode(): boolean {
    return this.spoolMode;
  }

  public addSpoolText(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    const text = new fabric.IText(`Spool ${this.spoolCounter}`, {
      left: pointer.x,
      top: pointer.y,
      fontSize: 20,
      fill: 'black',
    });
    
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Add Spool Text', () => {
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        canvas.requestRenderAll();
      });
    } else {
      canvas.add(text);
      canvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();
      canvas.requestRenderAll();
    }
    
    this.spoolCounter++;
  }

  public addText(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    const text = new fabric.IText('Your Text Here', {
      left: pointer.x,
      top: pointer.y,
      fontSize: 20,
      fill: 'black',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
  }

  public groupSelectedObjects(canvas: fabric.Canvas): void {
    const activeObj = canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== 'activeSelection') return;

    const activeSelection = activeObj as fabric.ActiveSelection;
    const group = new fabric.Group(activeSelection.getObjects());

    canvas.discardActiveObject();
    canvas.add(group);
    canvas.requestRenderAll();
  }

  public ungroupObjects(canvas: fabric.Canvas): void {
    const activeObj = canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') return;

    const group = activeObj as fabric.Group;
    const items = group.getObjects();
    canvas.discardActiveObject();
    items.forEach((item: fabric.Object) => {
      canvas.add(item);
    });
    canvas.remove(group);
    canvas.requestRenderAll();
  }

  public deleteSelectedObjects(canvas: fabric.Canvas): void {
    const activeObject = canvas.getActiveObject();
    
    // Check if text is being edited within the active object (group or direct text)
    let isTextEditing = false;
    if (activeObject) {
      if ((activeObject as fabric.IText)?.isEditing) {
        isTextEditing = true;
      } else if (activeObject.type === 'group') {
        // Check if any text object within the group is being edited
        const group = activeObject as fabric.Group;
        group.forEachObject((obj: fabric.Object) => {
          if (obj.type === 'i-text' && (obj as fabric.IText).isEditing) {
            isTextEditing = true;
          }
        });
      }
    }
    
    // Don't delete if text is being edited
    if (isTextEditing) {
      return;
    }
    
    if (activeObject) {
      // Prüfe ob es Teil einer Dimension ist
      if ((activeObject as any).isDimensionPart && (activeObject as any).dimensionId) {
        const dimensionId = (activeObject as any).dimensionId;
        
        // Finde alle Objekte mit dieser Dimension ID
        const objectsToRemove = canvas.getObjects().filter(obj => 
          (obj as any).dimensionId === dimensionId
        );
        
        // Entferne alle gefundenen Objekte
        objectsToRemove.forEach(obj => canvas.remove(obj));
      } else if (activeObject.type === 'activeSelection') {
        (activeObject as fabric.ActiveSelection).forEachObject((obj) => {
          // Prüfe ob ein Objekt in der Auswahl Teil einer Dimension ist
          if ((obj as any).isDimensionPart && (obj as any).dimensionId) {
            const dimensionId = (obj as any).dimensionId;
            const dimObjects = canvas.getObjects().filter(o => 
              (o as any).dimensionId === dimensionId
            );
            dimObjects.forEach(o => canvas.remove(o));
          } else {
            canvas.remove(obj);
          }
        });
      } else {
        canvas.remove(activeObject);
      }
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }

  public isEditingText(canvas: fabric.Canvas): boolean {
    if (!canvas) {
      return false;
    }

    const activeObject = canvas.getActiveObject();

    if (!activeObject) {
      return false;
    }

    // Check if direct text object is editing
    if (activeObject instanceof fabric.IText && activeObject.isEditing) {
      return true;
    }

    // Check if text is being edited within a group
    if (activeObject.type === 'group') {
      const group = activeObject as fabric.Group;
      let isEditing = false;
      group.forEachObject((obj: fabric.Object) => {
        if (obj.type === 'i-text' && (obj as fabric.IText).isEditing) {
          isEditing = true;
        }
      });
      return isEditing;
    }

    return false;
  }

  public isRevisionCloudMode(): boolean {
    return this.revisionCloudMode;
  }

  public startRevisionCloud(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.revisionCloudMode = true;
    this.revisionCloudPoints = [];
    this.canvas.selection = false;
    this.addEventListeners();
  }

  public stopRevisionCloud(): void {
    this.revisionCloudMode = false;
    this.revisionCloudPoints = [];
    this.removeTempObjects();
    this.removeDensityFeedback();
    if (this.canvas) {
      this.canvas.selection = true;
    }
    this.removeEventListeners();
    // Reset density factor to default
    this.waveDensityFactor = 1.0;
    // Reset double-click detection
    this.lastClickTime = 0;
    this.lastClickPoint = null;
  }

  private lastClickTime: number = 0;
  private lastClickPoint: fabric.Point | null = null;
  private DOUBLE_CLICK_THRESHOLD = 300; // milliseconds

  public handleRevisionCloudClick(options: any): void {
    if (!this.revisionCloudMode || !this.canvas) return;

    const pointer = this.canvas.getPointer(options.e);
    const point = new fabric.Point(pointer.x, pointer.y);

    // Check for double-click
    const currentTime = Date.now();
    if (this.lastClickPoint &&
        currentTime - this.lastClickTime < this.DOUBLE_CLICK_THRESHOLD) {
      // Calculate distance between clicks
      const dx = point.x - this.lastClickPoint.x;
      const dy = point.y - this.lastClickPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If clicks are close together, it's a double-click
      if (distance < 10 && this.revisionCloudPoints.length >= this.MIN_POINTS) {
        this.finishRevisionCloud();
        return;
      }
    }

    this.lastClickTime = currentTime;
    this.lastClickPoint = point;

    this.revisionCloudPoints.push(point);

    // Add visual indicator for clicked point
    const circle = new fabric.Circle({
      left: point.x - 3,
      top: point.y - 3,
      radius: 3,
      fill: 'red',
      stroke: 'darkred',
      strokeWidth: 1,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    this.tempCircles.push(circle);
    this.canvas.add(circle);

    // Update preview if we have enough points
    if (this.revisionCloudPoints.length >= this.MIN_POINTS) {
      this.updateRevisionCloudPreview();
    }

    // Auto-complete if we reach max points
    if (this.revisionCloudPoints.length >= this.MAX_POINTS) {
      this.finishRevisionCloud();
    }
  }

  public handleRevisionCloudMouseMove(options: any): void {
    if (!this.revisionCloudMode || !this.canvas || this.revisionCloudPoints.length === 0) return;

    const pointer = this.canvas.getPointer(options.e);

    // Remove previous temp line
    if (this.tempLine) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
    }

    // Draw line from last point to current mouse position
    const lastPoint = this.revisionCloudPoints[this.revisionCloudPoints.length - 1];
    this.tempLine = new fabric.Line(
      [lastPoint.x, lastPoint.y, pointer.x, pointer.y],
      {
        stroke: 'rgba(255, 0, 0, 0.5)',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
      }
    );
    this.canvas.add(this.tempLine);

    // Update preview - show even with 2 points
    if (this.revisionCloudPoints.length === 2) {
      // With exactly 2 points, add mouse position as third point for preview
      const tempPoints = [...this.revisionCloudPoints, new fabric.Point(pointer.x, pointer.y)];
      this.updateRevisionCloudPreview(tempPoints);
    } else if (this.revisionCloudPoints.length >= this.MIN_POINTS - 1) {
      // With 2+ points, always include mouse position
      const tempPoints = [...this.revisionCloudPoints, new fabric.Point(pointer.x, pointer.y)];
      this.updateRevisionCloudPreview(tempPoints);
    }
  }

  public handleRevisionCloudKeyDown(e: KeyboardEvent): void {
    if (!this.revisionCloudMode) return;

    // X + Arrow keys for density adjustment
    if (this.isXPressed) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Increase density (more arcs)
        this.waveDensityFactor = Math.min(this.MAX_DENSITY, this.waveDensityFactor + 0.1);
        console.log('Density increased via X+ArrowUp:', this.waveDensityFactor);
        this.showDensityFeedback();
        this.updatePreviewIfNeeded();
        return;
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Decrease density (fewer arcs)
        this.waveDensityFactor = Math.max(this.MIN_DENSITY, this.waveDensityFactor - 0.1);
        console.log('Density decreased via X+ArrowDown:', this.waveDensityFactor);
        this.showDensityFeedback();
        this.updatePreviewIfNeeded();
        return;
      }
    }

    // Complete cloud with Enter or Space
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this.revisionCloudPoints.length >= this.MIN_POINTS) {
        this.finishRevisionCloud();
      }
    }

    // Cancel with Escape
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancelRevisionCloud();
    }
  }

  private updatePreviewIfNeeded(): void {
    // Update preview with new density immediately
    if (this.revisionCloudPoints.length >= this.MIN_POINTS) {
      // 3+ points: update with actual points
      this.updateRevisionCloudPreview();
    } else if (this.revisionCloudPoints.length === 2) {
      // Exactly 2 points: add a temporary third point to show preview
      const tempPoints = [...this.revisionCloudPoints];
      const midX = (tempPoints[0].x + tempPoints[1].x) / 2;
      const midY = (tempPoints[0].y + tempPoints[1].y) / 2;
      // Create third point perpendicular to the line between first two points
      const dx = tempPoints[1].x - tempPoints[0].x;
      const dy = tempPoints[1].y - tempPoints[0].y;
      const perpX = -dy * 0.5;
      const perpY = dx * 0.5;
      tempPoints.push(new fabric.Point(midX + perpX, midY + perpY));
      this.updateRevisionCloudPreview(tempPoints);
    } else if (this.revisionCloudPoints.length === 1) {
      // Only 1 point: create a small triangle for preview
      const tempPoints = [...this.revisionCloudPoints];
      tempPoints.push(new fabric.Point(tempPoints[0].x + 100, tempPoints[0].y));
      tempPoints.push(new fabric.Point(tempPoints[0].x + 50, tempPoints[0].y + 100));
      this.updateRevisionCloudPreview(tempPoints);
    }
  }

  private updateRevisionCloudPreview(tempPoints?: fabric.Point[]): void {
    if (!this.canvas) return;

    const pointsToUse = tempPoints || this.revisionCloudPoints;

    // Remove previous preview
    if (this.tempRevisionCloud) {
      this.canvas.remove(this.tempRevisionCloud);
      this.tempRevisionCloud = null;
    }

    if (pointsToUse.length >= this.MIN_POINTS) {
      const pathData = this.generateRevisionCloudPath(pointsToUse);
      this.tempRevisionCloud = new fabric.Path(pathData, {
        stroke: 'rgba(255, 0, 0, 0.6)',
        strokeWidth: 2,
        fill: 'transparent',
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      this.canvas.add(this.tempRevisionCloud);
    }
  }

  private generateRevisionCloudPath(points: fabric.Point[]): string {
    if (points.length < this.MIN_POINTS) return '';

    let path = '';
    // Base parameters that will be randomized
    const baseRadius = this.baseWaveHeight * this.waveDensityFactor;
    const minArcWidth = 20 / this.waveDensityFactor;
    const maxArcWidth = 40 / this.waveDensityFactor;
    const gapFactor = 0.15; // 15% gap between arcs

    // Start with a random seed for consistent randomness during preview
    let randomSeed = 0.5;
    const pseudoRandom = () => {
      randomSeed = (randomSeed * 9.7 + 0.31) % 1;
      return randomSeed;
    };

    // Calculate if polygon is clockwise or counter-clockwise to determine outward direction
    const isClockwise = this.isPolygonClockwise(points);
    const baseDirection = isClockwise ? -1 : 1; // This determines the base outward direction

    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];
      const nextPoint = points[(i + 1) % points.length];

      if (i === 0) {
        path += `M ${currentPoint.x} ${currentPoint.y}`;
      }

      // Calculate distance between points
      const dx = nextPoint.x - currentPoint.x;
      const dy = nextPoint.y - currentPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 5) continue; // Skip very short segments

      // Create variable-sized arcs along the edge
      let currentDistance = 0;

      // Always use consistent outward direction based on polygon winding
      const outwardDirection = baseDirection;

      while (currentDistance < distance) {
        // Randomize arc width for each arc
        const arcWidth = minArcWidth + (maxArcWidth - minArcWidth) * pseudoRandom();

        // Add random gap before arc (except for first arc)
        if (currentDistance > 0) {
          const gapSize = arcWidth * gapFactor * pseudoRandom();
          currentDistance += gapSize;
          if (currentDistance >= distance) break;
        }

        const nextDistance = Math.min(currentDistance + arcWidth, distance);

        // Calculate arc start and end points
        const t1 = currentDistance / distance;
        const t2 = nextDistance / distance;

        const x1 = currentPoint.x + dx * t1;
        const y1 = currentPoint.y + dy * t1;
        const x2 = currentPoint.x + dx * t2;
        const y2 = currentPoint.y + dy * t2;

        // Calculate arc midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        // Calculate actual arc length
        const arcLength = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

        // Randomize arc radius with more variation
        const radiusVariation = 0.5 + 0.8 * pseudoRandom();
        const arcRadius = (arcLength * 0.5) * radiusVariation * this.waveDensityFactor;

        // Calculate perpendicular for arc bulge - always pointing outward
        const perpX = -(y2 - y1) / arcLength;
        const perpY = (x2 - x1) / arcLength;

        // Apply arc with consistent outward direction
        const controlX = midX + perpX * arcRadius * outwardDirection;
        const controlY = midY + perpY * arcRadius * outwardDirection;

        // Use quadratic Bezier curve for circular arcs
        if (currentDistance === 0 && i === 0) {
          // First arc of first segment
          path += ` Q ${controlX} ${controlY} ${x2} ${y2}`;
        } else if (currentDistance === 0) {
          // First arc of other segments - use line to connect
          path += ` L ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
        } else {
          // Continue with arc
          path += ` Q ${controlX} ${controlY} ${x2} ${y2}`;
        }

        currentDistance = nextDistance;
      }
    }

    path += ' Z'; // Close the path
    return path;
  }

  private finishRevisionCloud(): void {
    if (!this.stateManagement || !this.canvas || this.revisionCloudPoints.length < this.MIN_POINTS) {
      this.cancelRevisionCloud();
      return;
    }

    const pathData = this.generateRevisionCloudPath(this.revisionCloudPoints);
    const cloud = new fabric.Path(pathData, {
      stroke: 'red',
      strokeWidth: 2,
      fill: 'transparent',
      selectable: true,
      evented: true,
      customType: 'revisionCloud',
    });

    this.stateManagement.executeOperation('Add Revision Cloud', () => {
      this.canvas!.add(cloud);
      this.canvas!.setActiveObject(cloud);
      this.canvas!.requestRenderAll();
    });

    this.stopRevisionCloud();
  }

  private cancelRevisionCloud(): void {
    this.removeTempObjects();
    this.stopRevisionCloud();
  }

  private removeTempObjects(): void {
    if (!this.canvas) return;

    // Remove temp line
    if (this.tempLine) {
      this.canvas.remove(this.tempLine);
      this.tempLine = null;
    }

    // Remove temp cloud preview
    if (this.tempRevisionCloud) {
      this.canvas.remove(this.tempRevisionCloud);
      this.tempRevisionCloud = null;
    }

    // Remove temp circles
    this.tempCircles.forEach(circle => {
      this.canvas!.remove(circle);
    });
    this.tempCircles = [];
  }

  private addEventListeners(): void {
    console.log('Adding revision cloud event listeners');

    // Wheel event for arc density adjustment
    this.wheelHandler = (e: WheelEvent) => {
      console.log('Wheel event triggered, Ctrl:', this.isCtrlPressed, 'Alt:', this.isAltPressed, 'X:', this.isXPressed, 'RevisionCloudMode:', this.revisionCloudMode);
      if ((this.isCtrlPressed || this.isAltPressed || this.isXPressed) && this.revisionCloudMode) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Adjusting density, deltaY:', e.deltaY);

        // Adjust density factor with finer control
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        this.waveDensityFactor = Math.max(
          this.MIN_DENSITY,
          Math.min(this.MAX_DENSITY, this.waveDensityFactor + delta)
        );
        console.log('New density factor:', this.waveDensityFactor);

        // Show density feedback text
        this.showDensityFeedback();

        // Update preview with new density immediately
        if (this.revisionCloudPoints.length >= this.MIN_POINTS - 1) {
          this.updateRevisionCloudPreview();
        } else if (this.revisionCloudPoints.length > 0) {
          // Show preview even with fewer points during adjustment
          const tempPoints = [...this.revisionCloudPoints];
          if (tempPoints.length === 1) {
            // Add temporary points for preview
            tempPoints.push(new fabric.Point(tempPoints[0].x + 100, tempPoints[0].y));
            tempPoints.push(new fabric.Point(tempPoints[0].x + 50, tempPoints[0].y + 100));
          } else if (tempPoints.length === 2) {
            // Add one more temporary point
            tempPoints.push(new fabric.Point(tempPoints[0].x, tempPoints[0].y + 100));
          }
          this.updateRevisionCloudPreview(tempPoints);
        }
      }
    };

    // Keyboard events
    this.keydownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        this.isCtrlPressed = true;
        console.log('Ctrl pressed in revision cloud handler');
      }
      if (e.key === 'Alt') {
        this.isAltPressed = true;
        console.log('Alt pressed in revision cloud handler');
      }
      if (e.key === 'x' || e.key === 'X') {
        this.isXPressed = true;
        console.log('X pressed in revision cloud handler - ready for density adjustment');
      }
      if (this.revisionCloudMode) {
        this.handleRevisionCloudKeyDown(e);
      }
    };

    this.keyupHandler = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        this.isCtrlPressed = false;
        console.log('Ctrl released in revision cloud handler');
      }
      if (e.key === 'Alt') {
        this.isAltPressed = false;
        console.log('Alt released in revision cloud handler');
      }
      if (e.key === 'x' || e.key === 'X') {
        this.isXPressed = false;
        console.log('X released in revision cloud handler');
      }
    };

    // Register wheel event on both document and canvas element for better compatibility
    document.addEventListener('wheel', this.wheelHandler, { passive: false });

    // Also register on the canvas wrapper element if available
    if (this.canvas) {
      const canvasElement = this.canvas.getElement();
      if (canvasElement) {
        canvasElement.addEventListener('wheel', this.wheelHandler, { passive: false });
        console.log('Wheel event listener added to canvas element');
      }

      // Also try the parent wrapper
      const wrapper = canvasElement?.parentElement;
      if (wrapper) {
        wrapper.addEventListener('wheel', this.wheelHandler, { passive: false });
        console.log('Wheel event listener added to canvas wrapper');
      }
    }

    document.addEventListener('keydown', this.keydownHandler);
    document.addEventListener('keyup', this.keyupHandler);
    console.log('Event listeners registered successfully');
  }

  private removeEventListeners(): void {
    if (this.wheelHandler) {
      document.removeEventListener('wheel', this.wheelHandler);

      // Also remove from canvas elements
      if (this.canvas) {
        const canvasElement = this.canvas.getElement();
        if (canvasElement) {
          canvasElement.removeEventListener('wheel', this.wheelHandler);
        }
        const wrapper = canvasElement?.parentElement;
        if (wrapper) {
          wrapper.removeEventListener('wheel', this.wheelHandler);
        }
      }

      this.wheelHandler = null;
    }
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
    if (this.keyupHandler) {
      document.removeEventListener('keyup', this.keyupHandler);
      this.keyupHandler = null;
    }
    this.isCtrlPressed = false;
    this.isAltPressed = false;
    this.isXPressed = false;
  }

  private showDensityFeedback(): void {
    if (!this.canvas) return;

    // Remove previous density text if exists
    this.removeDensityFeedback();

    // Create new density feedback text
    const densityPercent = Math.round(((this.waveDensityFactor - this.MIN_DENSITY) / (this.MAX_DENSITY - this.MIN_DENSITY)) * 100);
    this.densityText = new fabric.Text(`Dichte: ${densityPercent}%`, {
      left: 10,
      top: 10,
      fontSize: 16,
      fill: 'red',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: 5,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });

    this.canvas.add(this.densityText);
    this.canvas.bringObjectToFront(this.densityText);

    // Auto-hide after 2 seconds
    setTimeout(() => {
      this.removeDensityFeedback();
    }, 2000);
  }

  private removeDensityFeedback(): void {
    if (this.densityText && this.canvas) {
      this.canvas.remove(this.densityText);
      this.densityText = null;
    }
  }

  private isPolygonClockwise(points: fabric.Point[]): boolean {
    // Calculate the signed area of the polygon using the shoelace formula
    // A positive area means counter-clockwise, negative means clockwise
    let area = 0;

    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += (points[j].x - points[i].x) * (points[j].y + points[i].y);
    }

    // If area is negative, the polygon is clockwise
    // We return true for clockwise because that's what the method name indicates
    return area < 0;
  }

}