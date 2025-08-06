import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';
import { StateManagementService } from './state-management.service';

export interface EditablePipe {
  segments: (fabric.Line | fabric.Path)[];
  anchors: fabric.Circle[];
  mainPoints: { x: number; y: number }[]; // Hauptpunkte für Updates
}

export interface EditableLine {
  line: fabric.Line;
  anchors: fabric.Circle[];
}

@Injectable({
  providedIn: 'root',
})
export class LineDrawingService {
  public drawingMode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'spool' = 'idle';
  public lineStartPoint: { x: number; y: number } | null = null;
  public pipePoints: { x: number; y: number }[] = [];
  private previewLine: fabric.Line | null = null;
  private previewPipe: fabric.Line | null = null;
  private pipeSegments: (fabric.Line | fabric.Path)[] = [];
  private pipeAnchors: fabric.Circle[] = [];
  private editablePipes: EditablePipe[] = [];
  private editableLines: EditableLine[] = [];
  private isShiftPressed: boolean = false;
  private isCtrlPressed: boolean = false;
  private currentlyEditingPipe: EditablePipe | null = null;
  private anchorPreview: fabric.Circle | null = null;
  private highlightedAnchor: fabric.Object | null = null;
  private originalAnchorColor: string | null = null;

  private stateManagement: StateManagementService | null = null;
  
  constructor(private isometryService: IsometryService) {
    // Lausche auf Tasten
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = true;
      }
      if (e.key === 'Control') {
        this.isCtrlPressed = true;
      }
      if (e.key === 'Escape' && this.drawingMode === 'addPipe') {
        this.finishPipe();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = false;
      }
      if (e.key === 'Control') {
        this.isCtrlPressed = false;
      }
    });
  }

  public setDrawingMode(
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'spool'
  ): void {
    if (this.drawingMode === 'addPipe' && mode !== 'addPipe') {
      // Aufräumen beim Verlassen des Pipe-Modus
      this.cancelPipeDrawing(this.canvas);
    }
    if (this.drawingMode === 'addAnchors' && mode !== 'addAnchors') {
      // Aufräumen beim Verlassen des Anchor-Modus
      if (this.anchorPreview && this.canvas) {
        this.canvas.remove(this.anchorPreview);
        this.anchorPreview = null;
      }
    }
    this.drawingMode = mode;
  }

  private resetAnchorHighlight(): void {
    if (this.highlightedAnchor && this.originalAnchorColor !== null) {
      // Check if it's a weld point (group) or regular anchor
      if (this.highlightedAnchor.type === 'group' && (this.highlightedAnchor as any).isWeldPoint) {
        // For weld points, change the line colors back
        const objects = (this.highlightedAnchor as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'line') {
            obj.set('stroke', 'red');
          }
        });
      } else {
        // Regular anchor point
        this.highlightedAnchor.set('fill', this.originalAnchorColor);
      }
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
  }

  private highlightAnchor(anchor: fabric.Object): void {
    if (this.highlightedAnchor !== anchor) {
      this.resetAnchorHighlight();
      this.highlightedAnchor = anchor;
      
      // Check if it's a weld point (group) or regular anchor
      if (anchor.type === 'group' && (anchor as any).isWeldPoint) {
        // For weld points, change the line colors to green
        this.originalAnchorColor = 'red'; // Store original color
        const objects = (anchor as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.type === 'line') {
            obj.set('stroke', 'green');
          }
        });
      } else {
        // Regular anchor point
        this.originalAnchorColor = anchor.get('fill') as string;
        anchor.set('fill', 'green');
      }
      // Force canvas to re-render
      if (this.canvas) {
        this.canvas.requestRenderAll();
      }
    }
  }

  private findNearestAnchor(point: { x: number; y: number }, canvas: fabric.Canvas): { x: number; y: number; object?: fabric.Object } | null {
    let nearestAnchor: { x: number; y: number; object?: fabric.Object } | null = null;
    let minDistance = 30; // Maximum distance to snap to anchor

    canvas.getObjects().forEach((obj: any) => {
      // Check for anchor points and weld points (groups with customType)
      if ((obj.type === 'circle' && obj.customType === 'anchorPoint') || 
          (obj.type === 'group' && obj.customType === 'anchorPoint')) {
        // Since originX and originY are 'center', left and top already represent the center
        const centerX = obj.left!;
        const centerY = obj.top!;
        
        const distance = Math.sqrt(
          Math.pow(centerX - point.x, 2) + 
          Math.pow(centerY - point.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestAnchor = { 
            x: centerX, 
            y: centerY,
            object: obj
          };
        }
      }
    });

    return nearestAnchor;
  }

  private snapToAngle(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
    if (!this.isShiftPressed && !this.snapEnabled) return end;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Berechne den Winkel in Grad
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Runde auf das nächste 30° Vielfache
    const snappedAngle = Math.round(angle / 30) * 30;
    const snappedRad = snappedAngle * Math.PI / 180;
    
    return {
      x: start.x + distance * Math.cos(snappedRad),
      y: start.y + distance * Math.sin(snappedRad)
    };
  }

  public handleLineMouseDown(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);

    if (this.drawingMode === 'addAnchors') {
      let anchorPos = { x: pointer.x, y: pointer.y };
      
      // Mit Shift: Snap to Line
      if (this.isShiftPressed) {
        const snappedPos = this.findNearestLinePoint(canvas, pointer);
        if (snappedPos) {
          anchorPos = snappedPos;
        }
      }
      
      // Erstelle einen roten Ankerpunkt
      const anchor = new fabric.Circle({
        radius: 5,
        fill: 'red',
        left: anchorPos.x,
        top: anchorPos.y,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        customType: 'anchorPoint',
      });
      canvas.add(anchor);
      canvas.requestRenderAll();
      return;
    }

    if (this.drawingMode === 'addLine') {
      if (!this.lineStartPoint) {
        let startPoint = { x: pointer.x, y: pointer.y };
        
        // Check for anchor snapping when Ctrl is pressed
        if (this.isCtrlPressed) {
          const nearestAnchor = this.findNearestAnchor(pointer, canvas);
          if (nearestAnchor) {
            startPoint = nearestAnchor;
          }
        }
        
        this.lineStartPoint = startPoint;
      } else {
        if (this.previewLine) {
          canvas.remove(this.previewLine);
          this.previewLine = null;
        }
        
        let endPoint = { x: pointer.x, y: pointer.y };
        
        // Check for anchor snapping with Ctrl key
        if (this.isCtrlPressed) {
          const nearestAnchor = this.findNearestAnchor(pointer, canvas);
          if (nearestAnchor) {
            endPoint = nearestAnchor;
          }
        }
        
        // Apply angle snapping if enabled (Shift key or toggle)
        if ((this.isShiftPressed || this.snapEnabled) && !(this.isCtrlPressed && this.findNearestAnchor(pointer, canvas))) {
          endPoint = this.snapToAngle(this.lineStartPoint, endPoint);
        }
        
        const line = new fabric.Line(
          [
            this.lineStartPoint.x,
            this.lineStartPoint.y,
            endPoint.x,
            endPoint.y,
          ],
          {
            stroke: 'black',
            strokeWidth: 2,
            selectable: false,
            evented: false,
          }
        );
        // Wrap line creation in state management
        if (this.stateManagement) {
          this.stateManagement.executeOperation('Draw Line', () => {
            canvas.add(line);

            const startCircle = new fabric.Circle({
              radius: 5,
              fill: 'red',
              left: line.x1,
              top: line.y1,
              originX: 'center',
              originY: 'center',
              selectable: true,
              evented: true,
              customType: 'anchorPoint',
              visible: true,
            });

            const endCircle = new fabric.Circle({
              radius: 5,
              fill: 'red',
              left: line.x2,
              top: line.y2,
              originX: 'center',
              originY: 'center',
              selectable: true,
              evented: true,
              customType: 'anchorPoint',
              visible: true,
            });

            canvas.add(startCircle, endCircle);

            // Speichere die Linie und ihre Ankerpunkte
            const newEditableLine: EditableLine = {
              line: line,
              anchors: [startCircle, endCircle],
            };
            this.editableLines.push(newEditableLine);
          });
        } else {
          // Fallback if state management not available
          canvas.add(line);

          const startCircle = new fabric.Circle({
            radius: 5,
            fill: 'red',
            left: line.x1,
            top: line.y1,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
            customType: 'anchorPoint',
            visible: true,
          });

          const endCircle = new fabric.Circle({
            radius: 5,
            fill: 'red',
            left: line.x2,
            top: line.y2,
            originX: 'center',
            originY: 'center',
            selectable: true,
            evented: true,
            customType: 'anchorPoint',
            visible: true,
          });

          canvas.add(startCircle, endCircle);

          // Speichere die Linie und ihre Ankerpunkte
          const newEditableLine: EditableLine = {
            line: line,
            anchors: [startCircle, endCircle],
          };
          this.editableLines.push(newEditableLine);
        }

        this.lineStartPoint = null;
        this.drawingMode = 'idle';
      }
    }
  }

  public handlePipeMouseDown(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);

    if (this.drawingMode === 'addPipe') {
      let clickPoint = { x: pointer.x, y: pointer.y };
      
      // Check for anchor snapping with Ctrl key
      if (this.isCtrlPressed) {
        const nearestAnchor = this.findNearestAnchor(pointer, canvas);
        if (nearestAnchor) {
          clickPoint = nearestAnchor;
        }
      }
      
      // Apply angle snapping if enabled (Shift key or toggle)
      if ((this.isShiftPressed || this.snapEnabled) && this.pipePoints.length > 0 && !(this.isCtrlPressed && this.findNearestAnchor(pointer, canvas))) {
        const lastPoint = this.pipePoints[this.pipePoints.length - 1];
        clickPoint = this.snapToAngle(lastPoint, clickPoint);
      }
      
      // Füge den Punkt hinzu
      this.pipePoints.push(clickPoint);

      // Erstelle einen Ankerpunkt
      const anchor = new fabric.Circle({
        radius: 5,
        fill: 'red',
        left: clickPoint.x,
        top: clickPoint.y,
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center',
        customType: 'anchorPoint',
        visible: true,
      });
      this.pipeAnchors.push(anchor);
      // Ankerpunkt später hinzufügen, damit er über den Linien ist

      // Entferne die Vorschau
      if (this.previewPipe) {
        canvas.remove(this.previewPipe);
        this.previewPipe = null;
      }

      // Erstelle Segmente wenn wir mindestens 2 Punkte haben
      if (this.pipePoints.length > 1) {
        this.createPipeSegments(canvas);
      }
    }
  }

  private createPipeSegments(canvas: fabric.Canvas): void {
    // Entferne alte Segmente
    this.pipeSegments.forEach(segment => canvas.remove(segment));
    this.pipeSegments = [];

    const radius = 20; // Radius für die Bögen

    for (let i = 0; i < this.pipePoints.length - 1; i++) {
      const p1 = this.pipePoints[i];
      const p2 = this.pipePoints[i + 1];
      
      if (i === 0) {
        // Erste Linie
        const line = new fabric.Line(
          [p1.x, p1.y, p2.x, p2.y],
          {
            stroke: 'green',
            strokeWidth: 5,
            selectable: false,
            evented: false,
          }
        );
        canvas.add(line);
        this.pipeSegments.push(line);
      } else {
        // Berechne Bogen und verbindende Linien
        const p0 = this.pipePoints[i - 1];
        
        // Vektoren
        const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        
        // Normalisiere Vektoren
        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const u1 = { x: v1.x / len1, y: v1.y / len1 };
        const u2 = { x: v2.x / len2, y: v2.y / len2 };
        
        // Berechne Radius (kleiner als halbe Segmentlänge)
        const actualRadius = Math.min(radius, len1 / 2, len2 / 2);
        
        // Punkte auf den Segmenten wo der Bogen beginnt/endet
        const arcStart = {
          x: p1.x + actualRadius * u1.x,
          y: p1.y + actualRadius * u1.y
        };
        const arcEnd = {
          x: p1.x + actualRadius * u2.x,
          y: p1.y + actualRadius * u2.y
        };
        
        // Erstelle Ankerpunkte für den Bogen
        const arcStartAnchor = new fabric.Circle({
          radius: 5, // Größer für bessere Klickbarkeit
          fill: 'blue',
          stroke: 'darkblue',
          strokeWidth: 1,
          left: arcStart.x,
          top: arcStart.y,
          selectable: true,
          evented: true,
          originX: 'center',
          originY: 'center',
          customType: 'anchorPoint', // WICHTIG für Bemaßung
          visible: true,
        });
        
        const arcEndAnchor = new fabric.Circle({
          radius: 5, // Größer für bessere Klickbarkeit
          fill: 'blue',
          stroke: 'darkblue',
          strokeWidth: 1,
          left: arcEnd.x,
          top: arcEnd.y,
          selectable: true,
          evented: true,
          originX: 'center',
          originY: 'center',
          customType: 'anchorPoint', // WICHTIG für Bemaßung
          visible: true,
        });
        
        canvas.add(arcStartAnchor, arcEndAnchor);
        this.pipeAnchors.push(arcStartAnchor, arcEndAnchor);
        
        // Aktualisiere vorherige Linie
        const prevLine = this.pipeSegments[this.pipeSegments.length - 1];
        if (prevLine instanceof fabric.Line) {
          prevLine.set({
            x2: arcStart.x,
            y2: arcStart.y
          });
          prevLine.setCoords();
        }
        
        // Erstelle Bogen
        const pathString = `M ${arcStart.x} ${arcStart.y} Q ${p1.x} ${p1.y}, ${arcEnd.x} ${arcEnd.y}`;
        const arc = new fabric.Path(pathString, {
          fill: '',
          stroke: 'green',
          strokeWidth: 5,
          selectable: false,
          evented: false,
        });
        canvas.add(arc);
        this.pipeSegments.push(arc);
        
        // Erstelle neue Linie vom Bogen zum nächsten Punkt
        const line = new fabric.Line(
          [arcEnd.x, arcEnd.y, p2.x, p2.y],
          {
            stroke: 'green',
            strokeWidth: 5,
            selectable: false,
            evented: false,
          }
        );
        canvas.add(line);
        this.pipeSegments.push(line);
      }
    }
    
    // Füge alle Ankerpunkte am Ende hinzu, damit sie über den Linien sind
    this.pipeAnchors.forEach(anchor => {
      // Stelle sicher, dass Ankerpunkte sichtbar sind
      anchor.set({
        visible: true,
        selectable: true,
        evented: true
      });
      canvas.add(anchor);
      // Ankerpunkte sind automatisch oben, da sie zuletzt hinzugefügt wurden
    });
    
    canvas.requestRenderAll();
  }

  public handleLineMouseMove(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    
    if (this.drawingMode === 'addAnchors') {
      // Entferne alte Vorschau
      if (this.anchorPreview) {
        canvas.remove(this.anchorPreview);
        this.anchorPreview = null;
      }
      
      let previewPos = { x: pointer.x, y: pointer.y };
      
      // Mit Shift: Snap to Line
      if (this.isShiftPressed) {
        const snappedPos = this.findNearestLinePoint(canvas, pointer);
        if (snappedPos) {
          previewPos = snappedPos;
        }
      }
      
      // Erstelle Vorschau
      this.anchorPreview = new fabric.Circle({
        radius: 5,
        fill: 'rgba(255, 0, 0, 0.5)',
        stroke: 'red',
        strokeWidth: 1,
        left: previewPos.x,
        top: previewPos.y,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
      });
      canvas.add(this.anchorPreview);
      canvas.requestRenderAll();
      return;
    }
    
    if (this.drawingMode === 'addLine') {
      if (!this.lineStartPoint) return;
      
      // Reset previous anchor highlight
      this.resetAnchorHighlight();
      
      if (this.previewLine) {
        canvas.remove(this.previewLine);
      }
      
      let endPoint = { x: pointer.x, y: pointer.y };
      let strokeColor = 'black';
      
      // Check for anchor snapping with Ctrl key
      if (this.isCtrlPressed) {
        const nearestAnchor = this.findNearestAnchor(pointer, canvas);
        if (nearestAnchor) {
          endPoint = nearestAnchor;
          strokeColor = 'green';
          // Highlight the anchor
          this.highlightAnchor(nearestAnchor.object!);
        }
      }
      
      // Apply angle snapping if enabled (Shift key or toggle)
      if ((this.isShiftPressed || this.snapEnabled) && !(this.isCtrlPressed && this.findNearestAnchor(pointer, canvas))) {
        endPoint = this.snapToAngle(this.lineStartPoint, endPoint);
      }
      
      this.previewLine = new fabric.Line(
        [this.lineStartPoint.x, this.lineStartPoint.y, endPoint.x, endPoint.y],
        {
          stroke: strokeColor === 'green' ? 'green' : 'rgba(0,0,0,0.3)',
          strokeDashArray: [5, 5],
          strokeWidth: strokeColor === 'green' ? 3 : 2,
          selectable: false,
          evented: false,
        }
      );
      canvas.add(this.previewLine);
    }
  }

  public handlePipeMouseMove(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    if (this.drawingMode === 'addPipe') {
      if (this.pipePoints.length === 0) return;

      // Reset previous anchor highlight
      this.resetAnchorHighlight();

      if (this.previewPipe) {
        canvas.remove(this.previewPipe);
      }

      const lastPoint = this.pipePoints[this.pipePoints.length - 1];
      let endPoint = { x: pointer.x, y: pointer.y };
      let strokeColor = 'rgba(0,128,0,0.5)';
      
      // Check for anchor snapping with Ctrl key
      if (this.isCtrlPressed) {
        const nearestAnchor = this.findNearestAnchor(pointer, canvas);
        if (nearestAnchor) {
          endPoint = nearestAnchor;
          strokeColor = 'green';
          // Highlight the anchor
          this.highlightAnchor(nearestAnchor.object!);
        }
      }
      
      // Apply angle snapping if enabled (Shift key or toggle)
      if ((this.isShiftPressed || this.snapEnabled) && !(this.isCtrlPressed && this.findNearestAnchor(pointer, canvas))) {
        endPoint = this.snapToAngle(lastPoint, endPoint);
      }
      
      this.previewPipe = new fabric.Line(
        [lastPoint.x, lastPoint.y, endPoint.x, endPoint.y],
        {
          stroke: strokeColor,
          strokeDashArray: [5, 5],
          strokeWidth: strokeColor === 'green' ? 6 : 5,
          selectable: false,
          evented: false,
        }
      );
      canvas.add(this.previewPipe);
    }
  }

  public handlePipeDoubleClick(canvas: fabric.Canvas, options: fabric.TEvent<MouseEvent>): void {
    if (this.drawingMode === 'addPipe' && this.pipeSegments.length > 0) {
      // Use finishPipe which already has state management
      this.finishPipe();
    }
  }

  public handleObjectMoving(canvas: fabric.Canvas, e: any) {
    const movedObject = e.target;
    if (!movedObject) return;

    // Prüfe ob es ein Ankerpunkt einer Pipe ist
    for (const pipe of this.editablePipes) {
      const anchorIndex = pipe.anchors.findIndex(anchor => anchor === movedObject);
      
      if (anchorIndex !== -1) {
        // Ein Ankerpunkt wurde bewegt - aktualisiere die Pipe
        this.updatePipeFromAnchor(canvas, pipe, anchorIndex);
        return;
      }
      
      // Prüfe ob es ein Segment ist
      const segmentIndex = pipe.segments.findIndex(segment => segment === movedObject);
      if (segmentIndex !== -1) {
        if (this.isCtrlPressed) {
          // Mit Strg: Erlaube einzelnes Verschieben und update die Ankerpunkte
          this.updatePipeSegmentPosition(canvas, pipe, segmentIndex, e);
        } else {
          // Ohne Strg: Wähle die ganze Pipe aus
          e.e.preventDefault();
          e.e.stopPropagation();
          this.selectEntirePipe(canvas, pipe);
        }
        return;
      }
    }
  }
  
  private selectEntirePipe(canvas: fabric.Canvas, pipe: EditablePipe): void {
    // Deselektiere alles
    canvas.discardActiveObject();
    
    // Erstelle eine Auswahl mit allen Segmenten
    const selection = new fabric.ActiveSelection(pipe.segments, {
      canvas: canvas
    });
    
    canvas.setActiveObject(selection);
    canvas.requestRenderAll();
  }
  
  private updatePipeSegmentPosition(canvas: fabric.Canvas, pipe: EditablePipe, segmentIndex: number, e: any): void {
    // Implementiere die Verschiebung mit Strg-Taste
    const segment = pipe.segments[segmentIndex];
    
    // Speichere die Bewegung bei mousedown
    if (!this.segmentDragData) {
      this.segmentDragData = {
        pipe: pipe,
        segmentIndex: segmentIndex,
        startPos: { x: e.pointer.x, y: e.pointer.y }
      };
      
      // Binde mousemove und mouseup Events
      canvas.on('mouse:move', (moveEvent: any) => this.handleSegmentDrag(canvas, moveEvent));
      canvas.on('mouse:up', () => this.endSegmentDrag(canvas));
    }
  }
  
  private segmentDragData: any = null;
  
  private handleSegmentDrag(canvas: fabric.Canvas, e: any): void {
    if (!this.segmentDragData || !this.isCtrlPressed) return;
    
    const { pipe, segmentIndex, startPos } = this.segmentDragData;
    const segment = pipe.segments[segmentIndex];
    
    const dx = e.pointer.x - startPos.x;
    const dy = e.pointer.y - startPos.y;
    
    // Update Startposition
    this.segmentDragData.startPos = { x: e.pointer.x, y: e.pointer.y };
    
    if (segment instanceof fabric.Line) {
      // Verschiebe die Linie
      segment.set({
        x1: segment.x1! + dx,
        y1: segment.y1! + dy,
        x2: segment.x2! + dx,
        y2: segment.y2! + dy
      });
      segment.setCoords();
      
      // Update die Hauptpunkte entsprechend
      if (pipe.mainPoints && segmentIndex < pipe.mainPoints.length) {
        pipe.mainPoints[segmentIndex].x += dx;
        pipe.mainPoints[segmentIndex].y += dy;
        if (segmentIndex + 1 < pipe.mainPoints.length) {
          pipe.mainPoints[segmentIndex + 1].x += dx;
          pipe.mainPoints[segmentIndex + 1].y += dy;
        }
      }
      
      // Neuzeichnen
      this.redrawPipe(canvas, pipe);
    }
  }
  
  private endSegmentDrag(canvas: fabric.Canvas): void {
    if (this.segmentDragData) {
      canvas.off('mouse:move');
      canvas.off('mouse:up');
      this.segmentDragData = null;
      
      // Speichere den Zustand für Undo
      canvas.fire('object:modified');
    }
  }
  
  private updatePipeFromAnchor(canvas: fabric.Canvas, pipe: EditablePipe, anchorIndex: number): void {
    // Update die Hauptpunkte basierend auf dem bewegten Ankerpunkt
    const anchor = pipe.anchors[anchorIndex];
    
    // Finde welcher Hauptpunkt das ist (rote Ankerpunkte)
    const redAnchors = pipe.anchors.filter(a => (a as any).fill === 'red');
    const mainPointIndex = redAnchors.findIndex(a => a === anchor);
    
    if (mainPointIndex !== -1 && pipe.mainPoints) {
      // Update den Hauptpunkt
      pipe.mainPoints[mainPointIndex] = {
        x: anchor.left!,
        y: anchor.top!
      };
      
      // Neuzeichnen der Pipe
      this.redrawPipe(canvas, pipe);
    }
  }
  
  private moveEntirePipe(canvas: fabric.Canvas, pipe: EditablePipe, e: any): void {
    const movedSegment = e.target;
    
    // Berechne die tatsächliche Verschiebung
    const pointer = canvas.getPointer(e.e);
    
    // Finde einen Referenzpunkt (ersten Ankerpunkt)
    if (pipe.anchors.length === 0) return;
    
    const firstAnchor = pipe.anchors[0];
    const dx = pointer.x - firstAnchor.left!;
    const dy = pointer.y - firstAnchor.top!;
    
    // Temporär deaktiviere Events um Rekursion zu vermeiden
    pipe.segments.forEach(seg => seg.set({ evented: false }));
    pipe.anchors.forEach(anc => anc.set({ evented: false }));
    
    // Verschiebe alle Hauptpunkte
    if (pipe.mainPoints) {
      pipe.mainPoints = pipe.mainPoints.map(point => ({
        x: point.x + dx,
        y: point.y + dy
      }));
    }
    
    // Verschiebe alle Ankerpunkte
    pipe.anchors.forEach(anchor => {
      anchor.set({
        left: anchor.left! + dx,
        top: anchor.top! + dy
      });
      anchor.setCoords();
    });
    
    // Neuzeichnen der Pipe basierend auf neuen Positionen
    this.redrawPipe(canvas, pipe);
    
    // Reaktiviere Events
    setTimeout(() => {
      pipe.segments.forEach(seg => seg.set({ evented: true, selectable: true }));
      pipe.anchors.forEach(anc => anc.set({ evented: true, selectable: true }));
    }, 100);
  }
  
  private redrawPipe(canvas: fabric.Canvas, pipe: EditablePipe): void {
    if (!pipe.mainPoints) return;
    
    // Entferne alte Segmente
    pipe.segments.forEach(segment => canvas.remove(segment));
    pipe.segments = [];
    
    // Entferne blaue Ankerpunkte (behalte nur rote)
    const blueAnchors = pipe.anchors.filter(a => (a as any).fill === 'blue');
    blueAnchors.forEach(anchor => {
      canvas.remove(anchor);
      const index = pipe.anchors.indexOf(anchor);
      if (index > -1) pipe.anchors.splice(index, 1);
    });
    
    // Neuzeichnen basierend auf mainPoints
    const radius = 20;
    
    for (let i = 0; i < pipe.mainPoints.length - 1; i++) {
      const p1 = pipe.mainPoints[i];
      const p2 = pipe.mainPoints[i + 1];
      
      if (i === 0) {
        // Erste Linie
        const line = new fabric.Line(
          [p1.x, p1.y, p2.x, p2.y],
          {
            stroke: 'green',
            strokeWidth: 5,
            selectable: true,
            evented: true,
          }
        );
        canvas.add(line);
        pipe.segments.push(line);
      } else {
        // Berechne Bogen und verbindende Linien
        const p0 = pipe.mainPoints[i - 1];
        
        // Vektoren
        const v1 = { x: p0.x - p1.x, y: p0.y - p1.y };
        const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
        
        // Normalisiere Vektoren
        const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        const u1 = { x: v1.x / len1, y: v1.y / len1 };
        const u2 = { x: v2.x / len2, y: v2.y / len2 };
        
        // Berechne Radius (kleiner als halbe Segmentlänge)
        const actualRadius = Math.min(radius, len1 / 2, len2 / 2);
        
        // Punkte auf den Segmenten wo der Bogen beginnt/endet
        const arcStart = {
          x: p1.x + actualRadius * u1.x,
          y: p1.y + actualRadius * u1.y
        };
        const arcEnd = {
          x: p1.x + actualRadius * u2.x,
          y: p1.y + actualRadius * u2.y
        };
        
        // Erstelle neue blaue Ankerpunkte
        const arcStartAnchor = new fabric.Circle({
          radius: 5, // Größer für bessere Klickbarkeit
          fill: 'blue',
          stroke: 'darkblue',
          strokeWidth: 1,
          left: arcStart.x,
          top: arcStart.y,
          selectable: true,
          evented: true,
          originX: 'center',
          originY: 'center',
          customType: 'anchorPoint',
          visible: true,
        });
        
        const arcEndAnchor = new fabric.Circle({
          radius: 5, // Größer für bessere Klickbarkeit
          fill: 'blue',
          stroke: 'darkblue',
          strokeWidth: 1,
          left: arcEnd.x,
          top: arcEnd.y,
          selectable: true,
          evented: true,
          originX: 'center',
          originY: 'center',
          customType: 'anchorPoint',
          visible: true,
        });
        
        canvas.add(arcStartAnchor, arcEndAnchor);
        pipe.anchors.push(arcStartAnchor, arcEndAnchor);
        
        // Aktualisiere vorherige Linie
        const prevLine = pipe.segments[pipe.segments.length - 1];
        if (prevLine instanceof fabric.Line) {
          prevLine.set({
            x2: arcStart.x,
            y2: arcStart.y
          });
          prevLine.setCoords();
        }
        
        // Erstelle Bogen
        const pathString = `M ${arcStart.x} ${arcStart.y} Q ${p1.x} ${p1.y}, ${arcEnd.x} ${arcEnd.y}`;
        const arc = new fabric.Path(pathString, {
          fill: '',
          stroke: 'green',
          strokeWidth: 5,
          selectable: true,
          evented: true,
        });
        canvas.add(arc);
        pipe.segments.push(arc);
        
        // Erstelle neue Linie vom Bogen zum nächsten Punkt
        const line = new fabric.Line(
          [arcEnd.x, arcEnd.y, p2.x, p2.y],
          {
            stroke: 'green',
            strokeWidth: 5,
            selectable: true,
            evented: true,
          }
        );
        canvas.add(line);
        pipe.segments.push(line);
      }
    }
    
    // Stelle sicher, dass alle Ankerpunkte sichtbar bleiben
    pipe.anchors.forEach(anchor => {
      anchor.set({
        visible: true,
        selectable: true,
        evented: true
      });
    });
    
    canvas.requestRenderAll();
  }

  private cancelPipeDrawing(canvas: fabric.Canvas): void {
    // Entferne alle temporären Elemente
    if (this.previewPipe) {
      canvas.remove(this.previewPipe);
      this.previewPipe = null;
    }
    
    this.pipeSegments.forEach(segment => canvas.remove(segment));
    this.pipeAnchors.forEach(anchor => canvas.remove(anchor));
    
    this.pipeSegments = [];
    this.pipeAnchors = [];
    this.pipePoints = [];
  }

  public cancelDrawing(canvas: fabric.Canvas): void {
    if (this.previewLine) {
      canvas.remove(this.previewLine);
      this.previewLine = null;
    }
    
    if (this.anchorPreview) {
      canvas.remove(this.anchorPreview);
      this.anchorPreview = null;
    }
    
    // Reset any anchor highlighting
    this.resetAnchorHighlight();
    
    this.cancelPipeDrawing(canvas);
    
    this.drawingMode = 'idle';
    this.lineStartPoint = null;
  }

  public getEditablePipes(): EditablePipe[] {
    return this.editablePipes;
  }

  public getEditableLines(): EditableLine[] {
    return this.editableLines;
  }

  private canvas!: fabric.Canvas;
  
  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }
  
  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }
  private snapEnabled: boolean = false;
  
  public setSnapToAngle(enabled: boolean): void {
    this.snapEnabled = enabled;
  }
  
  private finishPipe(): void {
    if (this.canvas && this.pipeSegments.length > 0) {
      // Wrap pipe completion in state management
      if (this.stateManagement) {
        this.stateManagement.executeOperation('Draw Pipe', () => {
          // Wie bei Doppelklick - beende die Pipe
          const newEditablePipe: EditablePipe = {
            segments: this.pipeSegments,
            anchors: this.pipeAnchors,
            mainPoints: [...this.pipePoints],
          };
          this.editablePipes.push(newEditablePipe);

          // Setze die Segmente als verschiebbar
          this.pipeSegments.forEach(segment => {
            segment.set({
              selectable: true,
              evented: true,
            });
          });
          
          // Clean up preview if exists
          if (this.previewPipe) {
            this.canvas!.remove(this.previewPipe);
          }
        });
      } else {
        // Fallback if state management not available
        const newEditablePipe: EditablePipe = {
          segments: this.pipeSegments,
          anchors: this.pipeAnchors,
          mainPoints: [...this.pipePoints],
        };
        this.editablePipes.push(newEditablePipe);

        // Setze die Segmente als verschiebbar
        this.pipeSegments.forEach(segment => {
          segment.set({
            selectable: true,
            evented: true,
          });
        });
      }
      
      // Reset
      this.pipeSegments = [];
      this.pipeAnchors = [];
      this.pipePoints = [];
      this.drawingMode = 'idle';
      
      if (this.previewPipe) {
        this.canvas.remove(this.previewPipe);
        this.previewPipe = null;
      }
      
      this.canvas.requestRenderAll();
    }
  }
  
  private findNearestLinePoint(canvas: fabric.Canvas, pointer: { x: number; y: number }): { x: number; y: number } | null {
    let nearestPoint: { x: number; y: number } | null = null;
    let minDistance = 30; // Maximum snap distance in pixels
    
    // Durchsuche alle Canvas-Objekte
    canvas.getObjects().forEach(obj => {
      if (obj instanceof fabric.Line) {
        // Berechne den nächsten Punkt auf der Linie
        const point = this.getClosestPointOnLine(
          { x: obj.x1!, y: obj.y1! },
          { x: obj.x2!, y: obj.y2! },
          pointer
        );
        
        const distance = Math.sqrt(
          Math.pow(point.x - pointer.x, 2) + 
          Math.pow(point.y - pointer.y, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestPoint = point;
        }
      }
    });
    
    // Prüfe auch Pipes
    this.editablePipes.forEach(pipe => {
      pipe.segments.forEach(segment => {
        if (segment instanceof fabric.Line) {
          const point = this.getClosestPointOnLine(
            { x: segment.x1!, y: segment.y1! },
            { x: segment.x2!, y: segment.y2! },
            pointer
          );
          
          const distance = Math.sqrt(
            Math.pow(point.x - pointer.x, 2) + 
            Math.pow(point.y - pointer.y, 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            nearestPoint = point;
          }
        }
      });
    });
    
    return nearestPoint;
  }
  
  private getClosestPointOnLine(
    lineStart: { x: number; y: number },
    lineEnd: { x: number; y: number },
    point: { x: number; y: number }
  ): { x: number; y: number } {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    return { x: xx, y: yy };
  }
}