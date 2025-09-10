import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';
import { StateManagementService } from './state-management.service';
import { LineSelectionHelper } from './line-selection-helper';
import { TestLine } from './test-line.class';
import { CustomLine } from './custom-line.class';

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
  public drawingMode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'spool' | 'testLine' | 'teeJoint' | 'slope' | 'freehand' | 'movePipe' = 'idle';
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
  private highlightedComponent: fabric.Group | null = null;
  private originalComponentStroke: string | null = null;
  private movingComponent: fabric.Group | null = null;

  // Move Mode Variablen
  private highlightedSegment: fabric.Object | null = null;
  private originalSegmentStroke: string | null = null;
  private movingSegment: fabric.Object | null = null;
  private movingPipe: EditablePipe | null = null;
  private movingSegmentIndex: number = -1;
  private moveStartPoint: { x: number; y: number } | null = null;
  // Endpunkt-Verschiebung
  private movingAnchor: fabric.Circle | null = null;
  private movingAnchorIndex: number = -1;
  private originalAnchorFill: string | null = null;
  // Associated valves and T-pieces that need to move with segments
  private associatedComponents: fabric.Group[] = [];

  private stateManagement: StateManagementService | null = null;
  private drawingService: any = null;
  
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
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'spool' | 'testLine' | 'teeJoint' | 'slope' | 'freehand' | 'movePipe'
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
        // Regular anchor point - restore original fill and stroke
        if (this.originalAnchorColor === 'transparent') {
          this.highlightedAnchor.set({
            'fill': 'transparent',
            'stroke': this.getColor('anchor')
          });
        } else {
          this.highlightedAnchor.set('fill', this.originalAnchorColor);
        }
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
        this.originalAnchorColor = 'red'; // Store original color for weld points
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
    if (!this.isShiftPressed && !this.snapEnabled && !this.snap15Enabled && !this.snap45Enabled) return end;

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Berechne den Winkel in Grad
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Bestimme den Snap-Winkel basierend auf den aktiven Modi
    let snapAngle = 30; // Standard
    if (this.isShiftPressed || this.snap15Enabled) {
      snapAngle = 15;
    } else if (this.snap45Enabled) {
      snapAngle = 45;
    } else if (this.snapEnabled) {
      snapAngle = 30;
    }
    
    // Runde auf das nächste Vielfache des snap angles
    const snappedAngle = Math.round(angle / snapAngle) * snapAngle;
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
      
      // Erstelle einen blauen Ankerpunkt (einzeln gesetzt)
      const anchor = new fabric.Circle({
        radius: 2,  // Gleiche Größe wie andere Ankerpunkte
        fill: 'blue',
        stroke: 'darkblue',
        strokeWidth: 1,
        opacity: 1,  // Voll sichtbar
        left: anchorPos.x,
        top: anchorPos.y,
        originX: 'center',
        originY: 'center',
        selectable: true,
        evented: true,
        customType: 'anchorPoint',
        isAnchor: true,  // Markiere als Ankerpunkt für Snapping
        visible: true,
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
        if ((this.isShiftPressed || this.snapEnabled || this.snap15Enabled || this.snap45Enabled) && !(this.isCtrlPressed && this.findNearestAnchor(pointer, canvas))) {
          endPoint = this.snapToAngle(this.lineStartPoint, endPoint);
        }
        
        const line = new CustomLine(
          [
            this.lineStartPoint.x,
            this.lineStartPoint.y,
            endPoint.x,
            endPoint.y,
          ],
          {
            stroke: this.getColor('line'),
            strokeWidth: 2,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: false,
            lockRotation: true,
            borderColor: 'rgba(102, 153, 255, 0.75)',
            padding: 5,
          }
        );
        
        // Configure line for better selection visualization
        LineSelectionHelper.configureLine(line);
        
        // Wrap line creation in state management
        if (this.stateManagement) {
          this.stateManagement.executeOperation('Draw Line', () => {
            canvas.add(line);

            const startCircle = new fabric.Circle({
              radius: 2,
              fill: 'transparent',
              stroke: this.getColor('anchor'),
              strokeWidth: 1,
              opacity: 0.3,  // Sehr transparent
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
              radius: 2,
              fill: 'transparent',
              stroke: this.getColor('anchor'),
              strokeWidth: 1,
              opacity: 0.3,  // Sehr transparent
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
            radius: 2,
            fill: 'transparent',
            stroke: this.getColor('anchor'),
            strokeWidth: 1,
            opacity: 0.3,  // Sehr transparent
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
            radius: 2,
            fill: 'transparent',
            stroke: this.getColor('anchor'),
            strokeWidth: 1,
            opacity: 0.3,  // Sehr transparent
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
      
      // Always check for anchor snapping first (automatic snapping)
      const nearestAnchor = this.findNearestAnchor(pointer, canvas);
      if (nearestAnchor) {
        clickPoint = nearestAnchor;
      } else if ((this.isShiftPressed || this.snapEnabled || this.snap15Enabled || this.snap45Enabled) && this.pipePoints.length > 0) {
        // Apply angle snapping only if no anchor was found
        const lastPoint = this.pipePoints[this.pipePoints.length - 1];
        clickPoint = this.snapToAngle(lastPoint, clickPoint);
      }
      
      // Füge den Punkt hinzu
      this.pipePoints.push(clickPoint);

      // Erstelle einen Ankerpunkt (nur wenn noch keiner existiert)
      const existingAnchor = canvas.getObjects().find((obj: any) => 
        obj.customType === 'anchorPoint' && 
        Math.abs(obj.left - clickPoint.x) < 1 && 
        Math.abs(obj.top - clickPoint.y) < 1
      );
      
      const anchor: fabric.Circle = existingAnchor as fabric.Circle || new fabric.Circle({
        radius: 2,  // Kleine Größe für Hauptankerpunkte
        fill: 'transparent',
        stroke: this.getColor('anchor'),
        strokeWidth: 1,
        opacity: 0.5,  // Halbtransparent
        left: clickPoint.x,
        top: clickPoint.y,
        selectable: true,
        evented: true,
        originX: 'center',
        originY: 'center',
        customType: 'anchorPoint',
        isAnchor: true,
        visible: true,
      });
      this.pipeAnchors.push(anchor as fabric.Circle);
      // Nur neue Ankerpunkte hinzufügen
      if (!existingAnchor) {
        canvas.add(anchor);
      }

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
        const line = new CustomLine(
          [p1.x, p1.y, p2.x, p2.y],
          {
            stroke: this.getColor('pipe'),
            strokeWidth: 1,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: false,
            lockRotation: true,
            borderColor: 'rgba(102, 153, 255, 0.75)',
            padding: 5,
          }
        );
        
        // Configure line for better selection visualization
        LineSelectionHelper.configureLine(line);
        
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
          radius: 2, // Kleine blaue Punkte
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
          isAnchor: true,  // Markiere als Ankerpunkt für Snapping
          visible: true,
        });
        
        const arcEndAnchor = new fabric.Circle({
          radius: 2, // Kleine blaue Punkte
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
          isAnchor: true,  // Markiere als Ankerpunkt für Snapping
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
          stroke: this.getColor('pipe'),
          strokeWidth: 1,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true,
          borderColor: 'rgba(102, 153, 255, 0.75)',
          padding: 5,
        });
        
        // Configure path for better selection visualization
        LineSelectionHelper.configurePath(arc);
        
        canvas.add(arc);
        this.pipeSegments.push(arc);
        
        // Erstelle neue Linie vom Bogen zum nächsten Punkt
        const line = new CustomLine(
          [arcEnd.x, arcEnd.y, p2.x, p2.y],
          {
            stroke: this.getColor('pipe'),
            strokeWidth: 1,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: false,
            lockRotation: true,
            borderColor: 'rgba(102, 153, 255, 0.75)',
            padding: 5,
          }
        );
        
        // Configure line for better selection visualization
        LineSelectionHelper.configureLine(line);
        
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
      
      // Nur hinzufügen wenn noch nicht im Canvas
      if (!canvas.contains(anchor)) {
        canvas.add(anchor);
      } else {
        // Wenn schon vorhanden, entferne und füge wieder hinzu (bringt nach vorne)
        canvas.remove(anchor);
        canvas.add(anchor);
      }
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
        radius: 2,  // Gleiche Größe wie andere Ankerpunkte
        fill: 'blue',
        stroke: 'darkblue',
        strokeWidth: 1,
        opacity: 0.7,  // Gut sichtbar
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
      let strokeColor = this.getColor('line');
      
      // Check for anchor snapping with Ctrl key
      if (this.isCtrlPressed) {
        const nearestAnchor = this.findNearestAnchor(pointer, canvas);
        if (nearestAnchor) {
          endPoint = nearestAnchor;
          strokeColor = this.getColor('pipe');
          // Highlight the anchor
          this.highlightAnchor(nearestAnchor.object!);
        }
      }
      
      // Apply angle snapping if enabled (Shift key or toggle)
      if ((this.isShiftPressed || this.snapEnabled || this.snap15Enabled || this.snap45Enabled) && !(this.isCtrlPressed && this.findNearestAnchor(pointer, canvas))) {
        endPoint = this.snapToAngle(this.lineStartPoint, endPoint);
      }
      
      this.previewLine = new fabric.Line(
        [this.lineStartPoint.x, this.lineStartPoint.y, endPoint.x, endPoint.y],
        {
          stroke: strokeColor,
          strokeDashArray: [5, 5],
          strokeWidth: 2,
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
      let strokeColor = this.getColor('pipe');
      
      // Always check for anchor snapping first (automatic snapping)
      const nearestAnchor = this.findNearestAnchor(pointer, canvas);
      if (nearestAnchor) {
        endPoint = nearestAnchor;
        strokeColor = this.getColor('pipe');
        // Highlight the anchor
        this.highlightAnchor(nearestAnchor.object!);
      } else if ((this.isShiftPressed || this.snapEnabled || this.snap15Enabled || this.snap45Enabled)) {
        // Apply angle snapping only if no anchor was found
        endPoint = this.snapToAngle(lastPoint, endPoint);
      }
      
      this.previewPipe = new fabric.Line(
        [lastPoint.x, lastPoint.y, endPoint.x, endPoint.y],
        {
          stroke: strokeColor,
          strokeDashArray: [5, 5],
          strokeWidth: 1,
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
    
    // Finde welcher Hauptpunkt das ist (transparente Hauptankerpunkte)
    const mainAnchors = pipe.anchors.filter(a => (a as any).fill === 'transparent');
    const mainPointIndex = mainAnchors.findIndex(a => a === anchor);
    
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
    
    // Entferne blaue Ankerpunkte (behalte nur transparente Hauptankerpunkte)
    const blueAnchors = pipe.anchors.filter(a => (a as any).fill === 'blue');
    blueAnchors.forEach(anchor => {
      canvas.remove(anchor);
      const index = pipe.anchors.indexOf(anchor);
      if (index > -1) pipe.anchors.splice(index, 1);
    });
    
    // Aktualisiere die Positionen der transparenten Hauptankerpunkte
    const transparentAnchors = pipe.anchors.filter(a => (a as any).fill === 'transparent');
    transparentAnchors.forEach((anchor, index) => {
      if (index < pipe.mainPoints.length) {
        anchor.set({
          left: pipe.mainPoints[index].x,
          top: pipe.mainPoints[index].y
        });
        anchor.setCoords();
      }
    });
    
    // Neuzeichnen basierend auf mainPoints
    const radius = 20;
    
    for (let i = 0; i < pipe.mainPoints.length - 1; i++) {
      const p1 = pipe.mainPoints[i];
      const p2 = pipe.mainPoints[i + 1];
      
      if (i === 0) {
        // Erste Linie
        const line = new CustomLine(
          [p1.x, p1.y, p2.x, p2.y],
          {
            stroke: this.getColor('pipe'),
            strokeWidth: 1,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: false,
            lockRotation: true,
            borderColor: 'rgba(102, 153, 255, 0.75)',
            padding: 5,
          }
        );
        
        // Configure line for better selection visualization
        LineSelectionHelper.configureLine(line);
        
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
          radius: 2, // Kleine blaue Punkte
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
          isAnchor: true,  // Markiere als Ankerpunkt für Snapping
          visible: true,
        });
        
        const arcEndAnchor = new fabric.Circle({
          radius: 2, // Kleine blaue Punkte
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
          isAnchor: true,  // Markiere als Ankerpunkt für Snapping
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
          stroke: this.getColor('pipe'),
          strokeWidth: 1,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true,
          borderColor: 'rgba(102, 153, 255, 0.75)',
          padding: 5,
        });
        
        // Configure path for better selection visualization
        LineSelectionHelper.configurePath(arc);
        
        canvas.add(arc);
        pipe.segments.push(arc);
        
        // Erstelle neue Linie vom Bogen zum nächsten Punkt
        const line = new CustomLine(
          [arcEnd.x, arcEnd.y, p2.x, p2.y],
          {
            stroke: this.getColor('pipe'),
            strokeWidth: 1,
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: false,
            lockRotation: true,
            borderColor: 'rgba(102, 153, 255, 0.75)',
            padding: 5,
          }
        );
        
        // Configure line for better selection visualization
        LineSelectionHelper.configureLine(line);
        
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
  
  public setDrawingService(drawingService: any): void {
    this.drawingService = drawingService;
  }
  
  private getColor(element: string): string {
    if (this.drawingService && this.drawingService.getColor) {
      return this.drawingService.getColor(element);
    }
    // Fallback colors if drawingService not available
    const fallbackColors: any = {
      'line': 'black',
      'pipe': 'green',
      'anchor': 'rgba(128, 128, 128, 0.5)'
    };
    return fallbackColors[element] || 'black';
  }
  private snapEnabled: boolean = false;
  private snap15Enabled: boolean = false;
  private snap45Enabled: boolean = false;
  
  public setSnapToAngle(enabled: boolean): void {
    this.snapEnabled = enabled;
  }
  
  public setSnapTo15Angle(enabled: boolean): void {
    this.snap15Enabled = enabled;
  }
  
  public setSnapTo45Angle(enabled: boolean): void {
    this.snap45Enabled = enabled;
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

          // Setze die Segmente als verschiebbar und konfiguriere sie richtig
          this.pipeSegments.forEach(segment => {
            segment.set({
              selectable: true,
              evented: true,
            });
            // Konfiguriere je nach Typ
            if (segment.type === 'line') {
              LineSelectionHelper.configureLine(segment as fabric.Line);
            } else if (segment.type === 'path') {
              LineSelectionHelper.configurePath(segment as fabric.Path);
            }
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

  // Test Line Methods
  public handleTestLineMouseDown(canvas: fabric.Canvas, options: any): void {
    if (this.drawingMode !== 'testLine') return;
    
    const pointer = canvas.getPointer(options.e);
    
    if (!this.lineStartPoint) {
      // First click - set start point
      this.lineStartPoint = { x: pointer.x, y: pointer.y };
    } else {
      // Second click - create the test line
      const endPoint = { x: pointer.x, y: pointer.y };
      
      // Create TestLine instead of regular Line
      const testLine = new TestLine(
        [
          this.lineStartPoint.x,
          this.lineStartPoint.y,
          endPoint.x,
          endPoint.y,
        ],
        {
          stroke: this.getColor('line'),
          strokeWidth: 2,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
        }
      );
      
      // Wrap in state management
      if (this.stateManagement) {
        this.stateManagement.executeOperation('Draw Test Line', () => {
          canvas.add(testLine);
        });
      } else {
        canvas.add(testLine);
      }
      
      // Reset for next line
      this.lineStartPoint = null;
      
      // Remove preview
      if (this.previewLine) {
        canvas.remove(this.previewLine);
        this.previewLine = null;
      }
      
      canvas.requestRenderAll();
    }
  }
  
  public handleTestLineMouseMove(canvas: fabric.Canvas, options: any): void {
    if (this.drawingMode !== 'testLine' || !this.lineStartPoint) return;
    
    const pointer = canvas.getPointer(options.e);
    
    // Remove old preview
    if (this.previewLine) {
      canvas.remove(this.previewLine);
    }
    
    // Create preview line
    this.previewLine = new fabric.Line(
      [this.lineStartPoint.x, this.lineStartPoint.y, pointer.x, pointer.y],
      {
        stroke: this.getColor('line'),
        strokeDashArray: [5, 5],
        strokeWidth: 2,
        selectable: false,
        evented: false,
      }
    );
    
    canvas.add(this.previewLine);
    canvas.requestRenderAll();
  }

  // ============= Move Mode Methods =============
  
  public handleMovePipeMouseMove(canvas: fabric.Canvas, options: any): void {
    if (!canvas) return;
    
    const pointer = canvas.getPointer(options.e);
    
    // Wenn wir gerade eine Komponente (T-Stück/Ventil) verschieben
    if (this.movingComponent && this.moveStartPoint) {
      this.updateMovingComponent(canvas, pointer);
      return;
    }
    
    // Wenn wir gerade einen Ankerpunkt verschieben
    if (this.movingAnchor && this.movingPipe && this.moveStartPoint) {
      this.updateMovingAnchor(canvas, pointer);
      return;
    }
    
    // Wenn wir gerade ein Segment verschieben, update die Position
    if (this.movingSegment && this.moveStartPoint) {
      this.updateMovingSegment(canvas, pointer);
      return;
    }
    
    // Sonst highlighte das Element unter der Maus
    this.highlightSegmentUnderMouse(canvas, pointer);
  }
  
  private highlightSegmentUnderMouse(canvas: fabric.Canvas, pointer: { x: number; y: number }): void {
    // Reset vorheriges Segment-Highlight
    if (this.highlightedSegment && this.originalSegmentStroke) {
      this.highlightedSegment.set('stroke', this.originalSegmentStroke);
      this.highlightedSegment = null;
      this.originalSegmentStroke = null;
    }
    
    // Reset vorheriges Anker-Highlight
    if (this.highlightedAnchor && this.originalAnchorColor) {
      this.highlightedAnchor.set('fill', this.originalAnchorColor);
      this.highlightedAnchor = null;
      this.originalAnchorColor = null;
    }
    
    // Reset vorheriges Komponenten-Highlight
    if (this.highlightedComponent && this.originalComponentStroke) {
      const objects = (this.highlightedComponent as fabric.Group).getObjects();
      objects.forEach(obj => {
        if ((obj as any).originalStroke) {
          obj.set('stroke', (obj as any).originalStroke);
          delete (obj as any).originalStroke;
        }
      });
      this.highlightedComponent = null;
      this.originalComponentStroke = null;
    }
    
    // Prüfe zuerst T-Stücke und Ventile (höchste Priorität für direktes Verschieben)
    let foundComponent = false;
    canvas.getObjects().forEach(obj => {
      if (!foundComponent && obj.type === 'group') {
        const customType = (obj as any).customType;
        if (customType === 'teeJoint' || customType === 'gateValveS' || customType === 'gateValveFL' || 
            customType === 'globeValveS' || customType === 'globeValveFL' ||
            customType === 'ballValveS' || customType === 'ballValveFL') {
          
          const componentX = obj.left || 0;
          const componentY = obj.top || 0;
          const distance = Math.sqrt(
            Math.pow(pointer.x - componentX, 2) + 
            Math.pow(pointer.y - componentY, 2)
          );
          
          if (distance < 15) { // 15 Pixel Toleranz für Komponenten
            // Highlighte die Komponente
            this.highlightedComponent = obj as fabric.Group;
            const objects = (obj as fabric.Group).getObjects();
            objects.forEach(innerObj => {
              if (innerObj.stroke) {
                (innerObj as any).originalStroke = innerObj.stroke;
                innerObj.set('stroke', '#00ff00'); // Grün für Highlight
              }
            });
            canvas.requestRenderAll();
            foundComponent = true;
          }
        }
      }
    });
    
    if (foundComponent) return;
    
    // Dann prüfe Ankerpunkte (zweite Priorität)
    for (const pipe of this.editablePipes) {
      // Nur transparente Ankerpunkte (Hauptankerpunkte) sind verschiebbar
      const transparentAnchors = pipe.anchors.filter(a => (a as any).fill === 'transparent');
      for (let i = 0; i < transparentAnchors.length; i++) {
        const anchor = transparentAnchors[i];
        const distance = Math.sqrt(
          Math.pow(pointer.x - anchor.left!, 2) + 
          Math.pow(pointer.y - anchor.top!, 2)
        );
        
        if (distance < 10) { // 10 Pixel Toleranz
          // Highlighte den Ankerpunkt
          this.highlightedAnchor = anchor;
          this.originalAnchorColor = anchor.get('fill') as string;
          anchor.set('fill', '#00ff00'); // Grün für Highlight
          canvas.requestRenderAll();
          return;
        }
      }
    }
    
    // Wenn kein Ankerpunkt, prüfe ALLE Linien und Pfade (nicht nur die in EditablePipes)
    const objects = canvas.getObjects();
    for (const obj of objects) {
      // Ignoriere Dimensionslinien und andere spezielle Objekte
      if ((obj as any).isDimensionPart || (obj as any).isWeldPoint) {
        continue;
      }
      
      if ((obj.type === 'line' || obj.type === 'path') && this.isPointNearLine(pointer, obj)) {
        // Prüfe erst ob es Teil einer EditablePipe ist
        let isPipeSegment = false;
        for (const pipe of this.editablePipes) {
          const segmentIndex = pipe.segments.indexOf(obj as any);
          if (segmentIndex !== -1) {
            isPipeSegment = true;
            break;
          }
        }
        
        // Wenn es kein Pipe-Segment ist, könnte es eine durch Ventil/T-Stück geteilte Linie sein
        // Diese sind trotzdem verschiebbar
        if (!isPipeSegment && obj.type === 'line') {
          // Prüfe ob es eine normale Linie ist (nicht Teil einer Gruppe oder speziellen Komponente)
          const line = obj as fabric.Line;
          // Zusätzliche Prüfung: Ist es eine sichtbare, selektierbare Linie?
          if (line.visible !== false && line.selectable !== false) {
            // Highlighte die Linie
            this.highlightedSegment = obj;
            this.originalSegmentStroke = obj.get('stroke') as string;
            obj.set('stroke', '#00ff00'); // Grün für Highlight
            canvas.requestRenderAll();
            return;
          }
        } else if (isPipeSegment) {
          // Highlighte das Pipe-Segment
          this.highlightedSegment = obj;
          this.originalSegmentStroke = obj.get('stroke') as string;
          obj.set('stroke', '#00ff00'); // Grün für Highlight
          canvas.requestRenderAll();
          return;
        }
      }
    }
    
    canvas.requestRenderAll();
  }
  
  private findHostLineForComponent(canvas: fabric.Canvas, component: fabric.Group): void {
    const componentX = component.left || 0;
    const componentY = component.top || 0;
    let closestLine: fabric.Line | null = null;
    let closestDistance = Infinity;
    let closestT = 0.5;
    
    // Suche die nächste Linie
    canvas.getObjects().forEach(obj => {
      if (obj.type === 'line' && !(obj as any).isDimensionPart) {
        const line = obj as fabric.Line;
        
        // Skip grüne Auswahllinien
        if (line.stroke === '#00ff00') {
          return;
        }
        
        // Skip sehr transparente Linien
        if (line.opacity !== undefined && line.opacity < 0.5) {
          return;
        }
        
        // Berechne die Position auf der Linie, die dem Komponenten-Mittelpunkt am nächsten ist
        const lineVector = {
          x: line.x2! - line.x1!,
          y: line.y2! - line.y1!
        };
        const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);
        
        if (lineLength > 0) {
          // Vektor vom Linienanfang zur Komponente
          const toComponent = {
            x: componentX - line.x1!,
            y: componentY - line.y1!
          };
          
          // Projiziere auf die Linie
          const t = Math.max(0, Math.min(1, 
            (toComponent.x * lineVector.x + toComponent.y * lineVector.y) / (lineLength * lineLength)
          ));
          
          // Berechne den nächsten Punkt auf der Linie
          const nearestX = line.x1! + t * lineVector.x;
          const nearestY = line.y1! + t * lineVector.y;
          
          // Distanz zur Komponente
          const distance = Math.sqrt(
            Math.pow(componentX - nearestX, 2) + 
            Math.pow(componentY - nearestY, 2)
          );
          
          // Komponente sollte sehr nah an der Linie sein (max 5 Pixel Abstand)
          if (distance < closestDistance && distance < 5) {
            closestDistance = distance;
            closestLine = line;
            closestT = t;
          }
        }
      }
    });
    
    if (closestLine) {
      (component as any).hostLine = closestLine;
      (component as any).linePosition = closestT;
      console.log(`Found host line for component, position: ${closestT}, distance: ${closestDistance}`);
    } else {
      console.log('No suitable host line found for component');
    }
  }
  
  private updateMovingComponent(canvas: fabric.Canvas, pointer: { x: number; y: number }): void {
    if (!this.movingComponent || !this.moveStartPoint) return;
    
    const hostLine = (this.movingComponent as any).hostLine;
    
    if (!hostLine || hostLine.type !== 'line') {
      // Wenn keine Host-Linie vorhanden, versuche sie zu finden
      this.findHostLineForComponent(canvas, this.movingComponent);
      return;
    }
    
    const line = hostLine as fabric.Line;
    
    // Berechne die neue Position auf der Linie basierend auf der Mausposition
    const lineVector = {
      x: line.x2! - line.x1!,
      y: line.y2! - line.y1!
    };
    const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);
    
    if (lineLength === 0) return;
    
    // Vektor vom Linienanfang zur Mausposition
    const toMouse = {
      x: pointer.x - line.x1!,
      y: pointer.y - line.y1!
    };
    
    // Projiziere auf die Linie (begrenzt auf 0-1)
    const t = Math.max(0, Math.min(1, 
      (toMouse.x * lineVector.x + toMouse.y * lineVector.y) / (lineLength * lineLength)
    ));
    
    // Berechne die neue Position auf der Linie
    const newX = line.x1! + t * lineVector.x;
    const newY = line.y1! + t * lineVector.y;
    
    // Setze die neue Position
    this.movingComponent.set({
      left: newX,
      top: newY
    });
    this.movingComponent.setCoords();
    
    // Speichere die neue Position auf der Linie
    (this.movingComponent as any).linePosition = t;
    
    // Bewege auch die Ankerpunkte der Komponente
    const anchors = (this.movingComponent as any).anchors;
    const customType = (this.movingComponent as any).customType;
    
    if (anchors && Array.isArray(anchors)) {
      // Berechne den Winkel der Linie
      const angle = Math.atan2(lineVector.y, lineVector.x) * 180 / Math.PI;
      
      anchors.forEach((anchor: fabric.Circle, index: number) => {
        if (anchor && anchor.left !== undefined && anchor.top !== undefined) {
          const distance = 15; // Standard-Abstand der Ankerpunkte
          
          if (customType === 'teeJoint') {
            // T-Stück Ankerpunkte senkrecht zur Linie
            const perpAngle = (angle + 90) * Math.PI / 180;
            const offsetX = Math.cos(perpAngle) * distance * (index === 0 ? 1 : -1);
            const offsetY = Math.sin(perpAngle) * distance * (index === 0 ? 1 : -1);
            
            anchor.set({
              left: newX + offsetX,
              top: newY + offsetY
            });
          } else {
            // Ventil-Ankerpunkte entlang der Linie
            const lineAngle = angle * Math.PI / 180;
            const offsetX = Math.cos(lineAngle) * distance * (index === 0 ? -1 : 1);
            const offsetY = Math.sin(lineAngle) * distance * (index === 0 ? -1 : 1);
            
            anchor.set({
              left: newX + offsetX,
              top: newY + offsetY
            });
          }
          anchor.setCoords();
        }
      });
    }
    
    // Für T-Stücke: Suche auch nach Ankerpunkten über componentId
    const componentId = (this.movingComponent as any).id || (this.movingComponent as any).customId;
    if (componentId) {
      canvas.getObjects().forEach(obj => {
        if (obj.type === 'circle' && (obj as any).isAnchor && 
            (obj as any).componentId === componentId) {
          const circle = obj as fabric.Circle;
          const anchorIndex = (circle as any).anchorIndex || 0;
          const distance = 15;
          
          if (customType === 'teeJoint') {
            // T-Stück Ankerpunkte senkrecht zur Linie
            const angle = Math.atan2(lineVector.y, lineVector.x);
            const perpAngle = angle + Math.PI / 2;
            const offsetX = Math.cos(perpAngle) * distance * (anchorIndex === 0 ? 1 : -1);
            const offsetY = Math.sin(perpAngle) * distance * (anchorIndex === 0 ? 1 : -1);
            
            circle.set({
              left: newX + offsetX,
              top: newY + offsetY
            });
          } else {
            // Ventil-Ankerpunkte entlang der Linie
            const angle = Math.atan2(lineVector.y, lineVector.x);
            const offsetX = Math.cos(angle) * distance * (anchorIndex === 0 ? -1 : 1);
            const offsetY = Math.sin(angle) * distance * (anchorIndex === 0 ? -1 : 1);
            
            circle.set({
              left: newX + offsetX,
              top: newY + offsetY
            });
          }
          circle.setCoords();
        }
      });
    }
    
    canvas.requestRenderAll();
  }
  
  private isPointNearLine(point: { x: number; y: number }, line: fabric.Object): boolean {
    if (line.type === 'line') {
      const l = line as fabric.Line;
      const x1 = l.x1!;
      const y1 = l.y1!;
      const x2 = l.x2!;
      const y2 = l.y2!;
      
      // Berechne Distanz vom Punkt zur Linie
      const A = point.x - x1;
      const B = point.y - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      
      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = -1;
      
      if (lenSq !== 0) {
        param = dot / lenSq;
      }
      
      let xx, yy;
      
      if (param < 0) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }
      
      const dx = point.x - xx;
      const dy = point.y - yy;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      return distance < 10; // Toleranz von 10 Pixeln
    }
    
    // Für Pfade (Bögen) vereinfachte Näherungsprüfung
    if (line.type === 'path') {
      const bounds = line.getBoundingRect();
      return point.x >= bounds.left - 10 && 
             point.x <= bounds.left + bounds.width + 10 &&
             point.y >= bounds.top - 10 && 
             point.y <= bounds.top + bounds.height + 10;
    }
    
    return false;
  }
  
  public handleMovePipeMouseDown(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    
    // Prüfe zuerst ob eine Komponente (T-Stück/Ventil) gehighlighted ist
    if (this.highlightedComponent) {
      this.movingComponent = this.highlightedComponent;
      this.moveStartPoint = { x: pointer.x, y: pointer.y };
      
      // Finde die Host-Linie für diese Komponente
      const hostLine = (this.movingComponent as any).hostLine;
      const linePosition = (this.movingComponent as any).linePosition;
      
      if (hostLine && linePosition !== undefined) {
        console.log(`Start moving component on line, position: ${linePosition}`);
      } else {
        console.log('Component has no host line stored, finding it now...');
        // Finde die nächste Linie für diese Komponente
        this.findHostLineForComponent(canvas, this.movingComponent);
      }
      
      // Deaktiviere Canvas-Selection während des Ziehens
      canvas.selection = false;
      canvas.discardActiveObject();
      return;
    }
    
    // Dann prüfe ob ein Ankerpunkt gehighlighted ist
    if (this.highlightedAnchor) {
      // Finde die Pipe und den Anker-Index
      for (const pipe of this.editablePipes) {
        const transparentAnchors = pipe.anchors.filter(a => (a as any).fill === 'transparent' || (a as any).fill === '#00ff00');
        const anchorIndex = transparentAnchors.indexOf(this.highlightedAnchor as any);
        if (anchorIndex !== -1) {
          this.movingAnchor = this.highlightedAnchor as fabric.Circle;
          this.movingPipe = pipe;
          this.movingAnchorIndex = anchorIndex;
          this.moveStartPoint = { x: pointer.x, y: pointer.y };
          
          // Deaktiviere Canvas-Selection während des Ziehens
          canvas.selection = false;
          canvas.discardActiveObject();
          
          console.log(`Start moving anchor ${anchorIndex} of pipe`);
          return;
        }
      }
    }
    
    // Sonst prüfe ob ein Segment gehighlighted ist
    if (this.highlightedSegment) {
      // Prüfe ob es Teil einer EditablePipe ist
      let foundPipe = false;
      for (const pipe of this.editablePipes) {
        const segmentIndex = pipe.segments.indexOf(this.highlightedSegment as any);
        if (segmentIndex !== -1) {
          this.movingSegment = this.highlightedSegment;
          this.movingPipe = pipe;
          this.movingSegmentIndex = segmentIndex;
          this.moveStartPoint = { x: pointer.x, y: pointer.y };
          foundPipe = true;
          
          console.log(`Start moving segment ${segmentIndex} of editable pipe`);
          break;
        }
      }
      
      // Wenn es keine EditablePipe ist, könnte es eine geteilte Linie sein
      if (!foundPipe && this.highlightedSegment.type === 'line') {
        // Erstelle eine temporäre "Pseudo-Pipe" für geteilte Linien
        // Dies ermöglicht das Verschieben von durch Ventile geteilten Linien
        this.movingSegment = this.highlightedSegment;
        this.movingPipe = null; // Keine echte Pipe
        this.movingSegmentIndex = -1;
        this.moveStartPoint = { x: pointer.x, y: pointer.y };
        
        console.log(`Start moving split line (not part of editable pipe)`);
      }
      
      if (this.movingSegment) {
        // Finde alle assoziierten Ventile und T-Stücke für dieses Segment
        this.findAssociatedComponents(canvas, this.movingSegment);
        
        // Deaktiviere Canvas-Selection während des Ziehens
        canvas.selection = false;
        canvas.discardActiveObject();
        
        console.log(`Found ${this.associatedComponents.length} associated components`);
      }
    }
  }
  
  public handleMovePipeMouseUp(canvas: fabric.Canvas, options: any): void {
    if (this.movingComponent && this.stateManagement) {
      // Speichere die Änderung mit State Management
      this.stateManagement.executeOperation('Move Component', () => {
        console.log('Component move completed');
      });
      // Reset Komponenten-Highlight
      if (this.highlightedComponent) {
        const objects = this.highlightedComponent.getObjects();
        objects.forEach(obj => {
          if ((obj as any).originalStroke) {
            obj.set('stroke', (obj as any).originalStroke);
            delete (obj as any).originalStroke;
          }
        });
      }
    } else if (this.movingAnchor && this.movingPipe && this.stateManagement) {
      // Speichere die Änderung mit State Management
      this.stateManagement.executeOperation('Move Pipe Anchor', () => {
        console.log('Pipe anchor move completed');
      });
      // Reset Anchor-Farbe
      if (this.originalAnchorFill) {
        this.movingAnchor.set('fill', this.originalAnchorFill);
        this.originalAnchorFill = null;
      }
    } else if (this.movingSegment && this.stateManagement) {
      // Speichere die Änderung mit State Management (für beide: EditablePipe und geteilte Linien)
      this.stateManagement.executeOperation('Move Segment', () => {
        console.log('Segment move completed');
      });
    }
    
    // Reset Move-Variablen
    this.movingComponent = null;
    this.movingSegment = null;
    this.movingAnchor = null;
    this.movingPipe = null;
    this.movingSegmentIndex = -1;
    this.movingAnchorIndex = -1;
    this.moveStartPoint = null;
    this.associatedComponents = [];
    
    // Reaktiviere Canvas-Selection
    canvas.selection = true;
    canvas.requestRenderAll();
  }
  
  private findAssociatedComponents(canvas: fabric.Canvas, segment: fabric.Object): void {
    this.associatedComponents = [];
    
    // Wenn wir eine Pipe verschieben, finde ALLE Komponenten auf ALLEN Segmenten dieser Pipe
    if (this.movingPipe && this.movingPipe.segments) {
      console.log('Finding all components on entire pipe with', this.movingPipe.segments.length, 'segments');
      
      // Durchsuche alle Canvas-Objekte nach Ventilen und T-Stücken
      canvas.getObjects().forEach(obj => {
        if (obj.type === 'group') {
          const customType = (obj as any).customType;
          
          // Prüfe ob es ein Ventil oder T-Stück ist
          if (customType === 'gateValveS' || customType === 'gateValveFL' || 
              customType === 'globeValveS' || customType === 'globeValveFL' ||
              customType === 'ballValveS' || customType === 'ballValveFL' ||
              customType === 'teeJoint') {
            
            const valveX = obj.left || 0;
            const valveY = obj.top || 0;
            
            // Prüfe ob die Komponente auf irgendeinem Segment der Pipe liegt
            for (let segmentIndex = 0; segmentIndex < this.movingPipe!.segments.length; segmentIndex++) {
              const pipeSegment = this.movingPipe!.segments[segmentIndex];
              if (pipeSegment.type === 'line') {
                const line = pipeSegment as fabric.Line;
                
                // Method 1: Check if this valve/tee has connected lines that include our segment
                const connectedLines = (obj as any).connectedLines;
                if (connectedLines && Array.isArray(connectedLines)) {
                  if (connectedLines.includes(pipeSegment)) {
                    // Speichere auf welchem Segment diese Komponente liegt
                    (obj as any).segmentIndex = segmentIndex;
                    (obj as any).hostLine = pipeSegment;
                    
                    // Berechne die relative Position auf der Linie (0 = Start, 1 = Ende)
                    const lineLength = Math.sqrt(
                      Math.pow(line.x2! - line.x1!, 2) + Math.pow(line.y2! - line.y1!, 2)
                    );
                    const distFromStart = Math.sqrt(
                      Math.pow(valveX - line.x1!, 2) + Math.pow(valveY - line.y1!, 2)
                    );
                    const t = lineLength > 0 ? distFromStart / lineLength : 0.5;
                    (obj as any).linePosition = Math.max(0, Math.min(1, t)); // Clamp zwischen 0 und 1
                    
                    if (!this.associatedComponents.includes(obj as fabric.Group)) {
                      this.associatedComponents.push(obj as fabric.Group);
                      console.log(`Found connected ${customType} on segment ${segmentIndex} at t=${t}`);
                    }
                    break;
                  }
                }
                
                // Method 2: Check if valve is ON the line segment
                if (this.isPointOnLineSegment(valveX, valveY, line.x1!, line.y1!, line.x2!, line.y2!, 15)) {
                  // Speichere auf welchem Segment diese Komponente liegt
                  (obj as any).segmentIndex = segmentIndex;
                  (obj as any).hostLine = pipeSegment;
                  
                  // Berechne die relative Position auf der Linie (0 = Start, 1 = Ende)
                  const lineLength = Math.sqrt(
                    Math.pow(line.x2! - line.x1!, 2) + Math.pow(line.y2! - line.y1!, 2)
                  );
                  const distFromStart = Math.sqrt(
                    Math.pow(valveX - line.x1!, 2) + Math.pow(valveY - line.y1!, 2)
                  );
                  const t = lineLength > 0 ? distFromStart / lineLength : 0.5;
                  (obj as any).linePosition = Math.max(0, Math.min(1, t)); // Clamp zwischen 0 und 1
                  
                  if (!this.associatedComponents.includes(obj as fabric.Group)) {
                    this.associatedComponents.push(obj as fabric.Group);
                    console.log(`Found ${customType} on segment ${segmentIndex} at t=${t}`);
                  }
                  break;
                }
              }
            }
          }
        }
      });
      
      console.log(`Found ${this.associatedComponents.length} total components on pipe`);
    } else if (segment.type === 'line') {
      // Fallback für einzelne Linien (nicht Teil einer EditablePipe)
      const line = segment as fabric.Line;
      
      console.log('Finding components for single line:', {
        x1: line.x1, y1: line.y1,
        x2: line.x2, y2: line.y2
      });
      
      // Durchsuche alle Canvas-Objekte nach Ventilen und T-Stücken
      canvas.getObjects().forEach(obj => {
        if (obj.type === 'group') {
          const customType = (obj as any).customType;
          
          // Prüfe ob es ein Ventil oder T-Stück ist
          if (customType === 'gateValveS' || customType === 'gateValveFL' || 
              customType === 'globeValveS' || customType === 'globeValveFL' ||
              customType === 'ballValveS' || customType === 'ballValveFL' ||
              customType === 'teeJoint') {
            
            const valveX = obj.left || 0;
            const valveY = obj.top || 0;
            
            // Check if valve is ON the line segment
            if (this.isPointOnLineSegment(valveX, valveY, line.x1!, line.y1!, line.x2!, line.y2!, 15)) {
              const segmentMidX = (line.x1! + line.x2!) / 2;
              const segmentMidY = (line.y1! + line.y2!) / 2;
              const relativeX = valveX - segmentMidX;
              const relativeY = valveY - segmentMidY;
              
              (obj as any).relativePosition = { x: relativeX, y: relativeY };
              
              this.associatedComponents.push(obj as fabric.Group);
              console.log(`Found ${customType} on line at`, valveX, valveY);
            }
          }
        }
      });
    }
  }
  
  private isPointOnLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number, tolerance: number = 5): boolean {
    // Calculate the distance from point to line segment
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return false;
    
    let param = dot / lenSq;
    
    // Check if projection is within line segment
    if (param < 0 || param > 1) return false;
    
    const xx = x1 + param * C;
    const yy = y1 + param * D;
    
    const dx = px - xx;
    const dy = py - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance < tolerance;
  }
  
  private updateMovingSegment(canvas: fabric.Canvas, pointer: { x: number; y: number }): void {
    if (!this.movingSegment || !this.moveStartPoint) return;
    
    const dx = pointer.x - this.moveStartPoint.x;
    const dy = pointer.y - this.moveStartPoint.y;
    
    // Wenn es eine EditablePipe ist, verwende die normale Logik
    if (this.movingPipe && this.movingPipe.mainPoints) {
      this.updateEditablePipeSegment(canvas, pointer);
      return;
    }
    
    // Ansonsten ist es eine geteilte Linie - verschiebe sie direkt
    if (this.movingSegment.type === 'line') {
      const line = this.movingSegment as fabric.Line;
      
      // Verschiebe die Linie direkt
      line.set({
        x1: (line.x1 || 0) + dx,
        y1: (line.y1 || 0) + dy,
        x2: (line.x2 || 0) + dx,
        y2: (line.y2 || 0) + dy
      });
      line.setCoords();
      
      // Berechne die neue Mittelpunkt-Position der Linie
      const newMidX = ((line.x1 || 0) + (line.x2 || 0)) / 2;
      const newMidY = ((line.y1 || 0) + (line.y2 || 0)) / 2;
      
      // Bewege alle assoziierten Ventile und T-Stücke basierend auf ihrer relativen Position
      this.associatedComponents.forEach(component => {
        const relativePos = (component as any).relativePosition;
        if (relativePos) {
          // Setze die neue Position basierend auf der relativen Position zum Segment-Mittelpunkt
          const newLeft = newMidX + relativePos.x;
          const newTop = newMidY + relativePos.y;
          
          component.set({
            left: newLeft,
            top: newTop
          });
          component.setCoords();
          
          // Bewege auch die Ankerpunkte des Ventils/T-Stücks
          // Die Ankerpunkte wurden als separate Canvas-Objekte hinzugefügt
          const anchors = (component as any).anchors;
          if (anchors && Array.isArray(anchors)) {
            // T-Stücke haben Ankerpunkte als direkte Referenzen
            anchors.forEach((anchor: any) => {
              if (anchor && anchor.type === 'circle') {
                // Dies ist eine direkte Referenz zum Ankerpunkt-Objekt
                anchor.set({
                  left: (anchor.left || 0) + dx,
                  top: (anchor.top || 0) + dy
                });
                anchor.setCoords();
              }
            });
          }
          
          // Für T-Stücke: Suche auch nach Ankerpunkten über componentId
          const componentId = (component as any).id || (component as any).customId;
          if (componentId) {
            canvas.getObjects().forEach(obj => {
              if (obj.type === 'circle' && (obj as any).isAnchor && 
                  (obj as any).componentId === componentId) {
                const circle = obj as fabric.Circle;
                circle.set({
                  left: (circle.left || 0) + dx,
                  top: (circle.top || 0) + dy
                });
                circle.setCoords();
              }
            });
          }
        } else {
          // Fallback: Wenn keine relative Position gespeichert wurde, verschiebe um dx/dy
          const currentLeft = component.left || 0;
          const currentTop = component.top || 0;
          component.set({
            left: currentLeft + dx,
            top: currentTop + dy
          });
          component.setCoords();
        }
      });
      
      // Update die Position für das nächste Delta
      this.moveStartPoint = { x: pointer.x, y: pointer.y };
      
      // Halte die Linie grün hervorgehoben
      line.set('stroke', '#00ff00');
      
      canvas.requestRenderAll();
    }
  }
  
  private updateEditablePipeSegment(canvas: fabric.Canvas, pointer: { x: number; y: number }): void {
    if (!this.movingSegment || !this.movingPipe || !this.moveStartPoint || !this.movingPipe.mainPoints) return;
    
    const dx = pointer.x - this.moveStartPoint.x;
    const dy = pointer.y - this.moveStartPoint.y;
    
    // Finde welches Segment verschoben wird (nur Linien, keine Bögen)
    const segmentIndex = this.movingPipe.segments.indexOf(this.movingSegment as any);
    if (segmentIndex === -1 || this.movingSegment.type !== 'line') return;
    
    const line = this.movingSegment as fabric.Line;
    
    // Debug: Zeige Segment-Struktur
    console.log('Segment types:', this.movingPipe.segments.map(s => s.type));
    console.log('Moving segment index:', segmentIndex);
    console.log('MainPoints count:', this.movingPipe.mainPoints.length);
    
    // Finde die richtigen mainPoints für dieses Liniensegment
    // Wir müssen die Linien zählen, nicht alle Segmente
    let lineCounter = 0;
    let foundStartIndex = -1;
    let foundEndIndex = -1;
    
    for (let i = 0; i <= segmentIndex; i++) {
      if (this.movingPipe.segments[i].type === 'line') {
        if (i === segmentIndex) {
          // Das ist unsere Linie!
          foundStartIndex = lineCounter;
          foundEndIndex = lineCounter + 1;
          break;
        }
        lineCounter++;
      }
    }
    
    if (foundStartIndex === -1 || foundEndIndex === -1 || 
        foundEndIndex >= this.movingPipe.mainPoints.length) {
      console.error('Could not map segment to mainPoints correctly');
      console.log('Line counter:', lineCounter, 'Start:', foundStartIndex, 'End:', foundEndIndex);
      return;
    }
    
    console.log(`Moving line segment: mainPoints[${foundStartIndex}] to mainPoints[${foundEndIndex}]`);
    
    // Bestimme die Richtung der Linie
    const lineVector = {
      x: line.x2! - line.x1!,
      y: line.y2! - line.y1!
    };
    const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);
    
    if (lineLength === 0) return;
    
    // Prüfe ob die Linie vertikal oder horizontal ist
    const isVertical = Math.abs(lineVector.x) < 5;
    const isHorizontal = Math.abs(lineVector.y) < 5;
    
    let moveX = 0, moveY = 0;
    
    if (isVertical) {
      // Vertikale Linie: nur horizontale Bewegung erlaubt
      moveX = dx;
      moveY = 0;
    } else if (isHorizontal) {
      // Horizontale Linie: nur vertikale Bewegung erlaubt
      moveX = 0;
      moveY = dy;
    } else {
      // Diagonale Linie: Bewegung senkrecht zur Linie
      const lineDir = {
        x: lineVector.x / lineLength,
        y: lineVector.y / lineLength
      };
      
      // Normale zur Linie (90 Grad gedreht)
      const normal = {
        x: -lineDir.y,
        y: lineDir.x
      };
      
      // Projiziere die Mausbewegung auf die Normale
      const projection = dx * normal.x + dy * normal.y;
      moveX = projection * normal.x;
      moveY = projection * normal.y;
    }
    
    // Verschiebe nur die beiden Endpunkte der aktuellen Linie
    this.movingPipe.mainPoints[foundStartIndex].x += moveX;
    this.movingPipe.mainPoints[foundStartIndex].y += moveY;
    this.movingPipe.mainPoints[foundEndIndex].x += moveX;
    this.movingPipe.mainPoints[foundEndIndex].y += moveY;
    
    // Neuzeichnen der gesamten Pipe
    this.redrawPipe(canvas, this.movingPipe);
    
    // Nach dem Neuzeichnen der Pipe, repositioniere alle Komponenten auf ihren jeweiligen Segmenten
    this.associatedComponents.forEach(component => {
      const segmentIndex = (component as any).segmentIndex;
      const linePosition = (component as any).linePosition;
      const customType = (component as any).customType;
      
      if (segmentIndex !== undefined && linePosition !== undefined && 
          this.movingPipe && segmentIndex < this.movingPipe.segments.length) {
        const hostSegment = this.movingPipe.segments[segmentIndex];
        
        if (hostSegment.type === 'line') {
          const line = hostSegment as fabric.Line;
          
          // Berechne die neue Position basierend auf der relativen Position auf der Linie
          const newX = line.x1! + (line.x2! - line.x1!) * linePosition;
          const newY = line.y1! + (line.y2! - line.y1!) * linePosition;
          
          // Setze die neue Position
          component.set({
            left: newX,
            top: newY
          });
          component.setCoords();
          
          // Bewege auch die Ankerpunkte des Ventils/T-Stücks
          const anchors = (component as any).anchors;
          if (anchors && Array.isArray(anchors)) {
            // Für T-Stücke und Ventile: Ankerpunkte sind relativ zur Komponente
            // Berechne den Winkel der Linie
            const angle = Math.atan2(line.y2! - line.y1!, line.x2! - line.x1!) * 180 / Math.PI;
            
            anchors.forEach((anchor: fabric.Circle, index: number) => {
              if (anchor && anchor.left !== undefined && anchor.top !== undefined) {
                // Die Ankerpunkte sollten relativ zur neuen Position bleiben
                // T-Stücke haben normalerweise 2 Ankerpunkte auf gegenüberliegenden Seiten
                const distance = 15; // Standard-Abstand der Ankerpunkte
                
                if (customType === 'teeJoint') {
                  // T-Stück Ankerpunkte senkrecht zur Linie
                  const perpAngle = (angle + 90) * Math.PI / 180;
                  const offsetX = Math.cos(perpAngle) * distance * (index === 0 ? 1 : -1);
                  const offsetY = Math.sin(perpAngle) * distance * (index === 0 ? 1 : -1);
                  
                  anchor.set({
                    left: newX + offsetX,
                    top: newY + offsetY
                  });
                } else {
                  // Ventil-Ankerpunkte entlang der Linie
                  const lineAngle = angle * Math.PI / 180;
                  const offsetX = Math.cos(lineAngle) * distance * (index === 0 ? -1 : 1);
                  const offsetY = Math.sin(lineAngle) * distance * (index === 0 ? -1 : 1);
                  
                  anchor.set({
                    left: newX + offsetX,
                    top: newY + offsetY
                  });
                }
                anchor.setCoords();
              }
            });
          }
        }
      }
    });
    
    // Update die Position für das nächste Delta
    this.moveStartPoint = { x: pointer.x, y: pointer.y };
    
    // Nach dem Neuzeichnen müssen wir das bewegte Segment wieder finden und highlighten
    if (segmentIndex < this.movingPipe.segments.length) {
      this.movingSegment = this.movingPipe.segments[segmentIndex];
      // Halte es grün hervorgehoben
      if (this.movingSegment) {
        this.movingSegment.set('stroke', '#00ff00');
      }
    }
    
    canvas.requestRenderAll();
  }
  
  // Diese Methoden werden nicht mehr benötigt, da redrawPipe alles übernimmt
  
  private updateMovingAnchor(canvas: fabric.Canvas, pointer: { x: number; y: number }): void {
    if (!this.movingAnchor || !this.movingPipe || !this.moveStartPoint || !this.movingPipe.mainPoints) return;
    
    const dx = pointer.x - this.moveStartPoint.x;
    const dy = pointer.y - this.moveStartPoint.y;
    
    // Bewege nur den gewählten mainPoint
    if (this.movingAnchorIndex >= 0 && this.movingAnchorIndex < this.movingPipe.mainPoints.length) {
      this.movingPipe.mainPoints[this.movingAnchorIndex].x += dx;
      this.movingPipe.mainPoints[this.movingAnchorIndex].y += dy;
      
      console.log(`Moving anchor ${this.movingAnchorIndex} to:`, this.movingPipe.mainPoints[this.movingAnchorIndex]);
      
      // Direkt den Ankerpunkt visuell aktualisieren (für sofortiges Feedback)
      this.movingAnchor.set({
        left: this.movingPipe.mainPoints[this.movingAnchorIndex].x,
        top: this.movingPipe.mainPoints[this.movingAnchorIndex].y
      });
      this.movingAnchor.setCoords();
      
      // Neuzeichnen der gesamten Pipe
      this.redrawPipe(canvas, this.movingPipe);
      
      // Update die Position für das nächste Delta
      this.moveStartPoint = { x: pointer.x, y: pointer.y };
      
      // Halte den Ankerpunkt grün hervorgehoben
      const transparentAnchors = this.movingPipe.anchors.filter(a => (a as any).fill === 'transparent' || (a as any).fill === '#00ff00');
      if (this.movingAnchorIndex < transparentAnchors.length) {
        this.movingAnchor = transparentAnchors[this.movingAnchorIndex] as fabric.Circle;
        this.movingAnchor.set('fill', '#00ff00');
        // Stelle sicher, dass die Position korrekt ist
        this.movingAnchor.set({
          left: this.movingPipe.mainPoints[this.movingAnchorIndex].x,
          top: this.movingPipe.mainPoints[this.movingAnchorIndex].y
        });
        this.movingAnchor.setCoords();
      }
      
      canvas.requestRenderAll();
    }
  }
}