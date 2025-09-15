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
  public drawingMode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'spool' | 'testLine' | 'teeJoint' | 'slope' | 'freehand' | 'movePipe' | 'moveComponent' = 'idle';
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
  private highlightedComponent: any | null = null;
  private originalComponentStroke: string | null = null;
  private movingComponent: any | null = null;

  // Move Mode Variablen
  private highlightedSegment: fabric.Object | null = null;
  private originalSegmentStroke: string | null = null;
  private movingSegment: fabric.Object | null = null;
  private movingPipe: EditablePipe | null = null;
  private movingSegmentIndex: number = -1;
  private moveStartPoint: { x: number; y: number } | null = null;
  // Store original line coordinates for proper movement
  // Removed originalLineCoords - now using originalLeft/originalTop for line movement
  private originalLeft: number | null = null;
  private originalTop: number | null = null;
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
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' | 'addAnchors' | 'spool' | 'testLine' | 'teeJoint' | 'slope' | 'freehand' | 'movePipe' | 'moveComponent'
  ): void {
    console.log(`🔧 LineDrawingService.setDrawingMode called with: ${mode}, current: ${this.drawingMode}`);
    console.log('🔧 Canvas available in setDrawingMode:', !!this.canvas);
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
    
    // Setup moveComponent mode
    if (mode === 'moveComponent' && this.canvas) {
      console.log('🎯 Entering moveComponent mode - making T-pieces selectable');
      // Make T-pieces selectable and add hover effects
      this.canvas.getObjects().forEach(obj => {
        if ((obj as any).customType === 'teeJoint') {
          console.log('Found T-piece, making it selectable:', obj);
          obj.set({
            selectable: true,
            evented: true,
            hoverCursor: 'move'
          });
          
          // Get the T-piece lines for hover effects
          const tpiece = obj as any;
          if (tpiece.teeLines) {
            // Add hover effects to each T-piece line so hovering over visible lines triggers the effect
            tpiece.teeLines.forEach((line: any, index: number) => {
              if (line) {
                // Clear any existing hover handlers to prevent duplicates
                line.off('mouseover');
                line.off('mouseout');
                
                // Add hover effect to individual lines
                line.on('mouseover', () => {
                  if (this.drawingMode === 'moveComponent') {
                    console.log(`🟢 T-piece line ${index} hover - highlighting all lines in green`);
                    tpiece.teeLines.forEach((tLine: any) => {
                      if (tLine) {
                        (tLine as any).originalStroke = (tLine as any).originalStroke || tLine.stroke;
                        tLine.set('stroke', '#4CAF50'); // Green hover highlight
                      }
                    });
                    this.canvas!.requestRenderAll();
                  }
                });
                
                // Remove hover effect when mouse leaves the line
                line.on('mouseout', () => {
                  if (this.drawingMode === 'moveComponent') {
                    console.log(`🟢 T-piece line ${index} mouseout - removing green highlight`);
                    tpiece.teeLines.forEach((tLine: any) => {
                      if (tLine && (tLine as any).originalStroke) {
                        tLine.set('stroke', (tLine as any).originalStroke);
                        delete (tLine as any).originalStroke;
                      }
                    });
                    this.canvas!.requestRenderAll();
                  }
                });
              }
            });
          }
        }
      });
      this.hoverEffectsSetup = true;
      this.canvas.renderAll();
    }
    
    // Cleanup moveComponent mode
    if (this.drawingMode === 'moveComponent' && mode !== 'moveComponent' && this.canvas) {
      console.log('🎯 Leaving moveComponent mode - resetting T-pieces');
      // Reset T-pieces to non-selectable and remove event listeners
      this.canvas.getObjects().forEach(obj => {
        if ((obj as any).customType === 'teeJoint') {
          // Remove hover effects and event listeners from lines
          if ((obj as any).teeLines) {
            (obj as any).teeLines.forEach((line: any) => {
              if (line) {
                // Remove event listeners from individual lines
                line.off('mouseover');
                line.off('mouseout');
                
                // Reset stroke color if modified
                if ((line as any).originalStroke) {
                  line.set('stroke', (line as any).originalStroke);
                  delete (line as any).originalStroke;
                }
              }
            });
          }
          
          // Remove event listeners from selection rectangle (not needed anymore since we use line events)
          obj.off('mouseover');
          obj.off('mouseout');
          
          obj.set({
            selectable: false,
            evented: false
          });
        }
      });
      this.canvas.renderAll();
      
      // Reset hover effects setup flag
      this.hoverEffectsSetup = false;
    }
    
    this.drawingMode = mode;
  }

  private ensureHoverEffectsSetup(canvas: fabric.Canvas): void {
    if (this.hoverEffectsSetup) {
      console.log('🔧 Hover effects already set up, skipping');
      return;
    }

    console.log('🔧 Setting up hover effects as fallback');
    
    // Make T-pieces selectable and add hover effects
    canvas.getObjects().forEach(obj => {
      if ((obj as any).customType === 'teeJoint') {
        console.log('🔧 Found T-piece, setting up hover effects:', obj);
        obj.set({
          selectable: true,
          evented: true,
          hoverCursor: 'move'
        });
        
        // Get the T-piece lines for hover effects
        const tpiece = obj as any;
        if (tpiece.teeLines) {
          // Add hover effects to each T-piece line so hovering over visible lines triggers the effect
          tpiece.teeLines.forEach((line: any, index: number) => {
            if (line) {
              // Clear any existing hover handlers to prevent duplicates
              line.off('mouseover');
              line.off('mouseout');
              
              // Add hover effect to individual lines
              line.on('mouseover', () => {
                if (this.drawingMode === 'moveComponent') {
                  console.log(`🟢 T-piece line ${index} hover - highlighting all lines in green`);
                  tpiece.teeLines.forEach((tLine: any) => {
                    if (tLine) {
                      (tLine as any).originalStroke = (tLine as any).originalStroke || tLine.stroke;
                      tLine.set('stroke', '#4CAF50'); // Green hover highlight
                    }
                  });
                  canvas.requestRenderAll();
                }
              });
              
              // Remove hover effect when mouse leaves the line
              line.on('mouseout', () => {
                if (this.drawingMode === 'moveComponent') {
                  console.log(`🟢 T-piece line ${index} mouseout - removing green highlight`);
                  tpiece.teeLines.forEach((tLine: any) => {
                    if (tLine && (tLine as any).originalStroke) {
                      tLine.set('stroke', (tLine as any).originalStroke);
                      delete (tLine as any).originalStroke;
                    }
                  });
                  canvas.requestRenderAll();
                }
              });
            }
          });
        }
      }
    });
    
    this.hoverEffectsSetup = true;
    canvas.renderAll();
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
    
    console.log('🔥🔥🔥 VERSION 2024-11-19 19:15 - NEUE VERSION LÄUFT! 🔥🔥🔥');
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
      // Prüfe ob es ein T-Stück mit neuer Struktur ist
      if ((this.highlightedComponent as any).customType === 'teeJoint') {
        const teeLines = (this.highlightedComponent as any).teeLines;
        if (teeLines && Array.isArray(teeLines)) {
          teeLines.forEach((line: any) => {
            if ((line as any).originalStroke) {
              line.set('stroke', (line as any).originalStroke);
              delete (line as any).originalStroke;
            }
          });
        }
      } else if (this.highlightedComponent.type === 'group') {
        // Normale Ventile als Groups
        const objects = (this.highlightedComponent as fabric.Group).getObjects();
        objects.forEach((obj: any) => {
          if (obj.originalStroke) {
            obj.set('stroke', obj.originalStroke);
            delete obj.originalStroke;
          }
        });
      }
      this.highlightedComponent = null;
      this.originalComponentStroke = null;
    }
    
    // Prüfe zuerst T-Stücke und Ventile (höchste Priorität für direktes Verschieben)
    let foundComponent = false;
    canvas.getObjects().forEach(obj => {
      if (!foundComponent) {
        const customType = (obj as any).customType;
        
        // Prüfe für neue T-Stück-Struktur (Rectangle mit customType)
        if (obj.type === 'rect' && customType === 'teeJoint') {
          const componentX = obj.left || 0;
          const componentY = obj.top || 0;
          const distance = Math.sqrt(
            Math.pow(pointer.x - componentX, 2) + 
            Math.pow(pointer.y - componentY, 2)
          );
          
          if (distance < 30) { // Größere Toleranz für T-Stück-Rechteck
            // Highlighte die T-Stück-Linien
            this.highlightedComponent = obj as any;
            
            // Clear stored host line so it gets recalculated when movement starts
            delete (obj as any).hostLine;
            delete (obj as any).linePosition;
            delete (obj as any).hostLineSearched;
            
            const teeLines = (obj as any).teeLines;
            if (teeLines && Array.isArray(teeLines)) {
              teeLines.forEach((line: any) => {
                if (line && line.stroke) {
                  (line as any).originalStroke = line.stroke;
                  line.set('stroke', '#00ff00'); // Grün für Highlight
                }
              });
            }
            // Setze den Cursor auf move für T-Stücke
            canvas.defaultCursor = 'move';
            canvas.requestRenderAll();
            foundComponent = true;
          }
        }
        // Prüfe für normale Ventile (bleiben als Groups)
        else if (obj.type === 'group') {
          if (customType === 'gateValveS' || customType === 'gateValveFL' || 
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
              // Setze den Cursor auf move für Ventile
              canvas.defaultCursor = 'move';
              canvas.requestRenderAll();
              foundComponent = true;
            }
          }
        }
      }
    });
    
    if (foundComponent) return;
    
    // Reset cursor wenn keine Komponente gefunden
    canvas.defaultCursor = 'default';
    
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
      
      // Ignoriere T-Stück-Linien (sie haben eine teeId)
      if ((obj as any).teeId || (obj as any).teePart) {
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
          
          // Debug-Log für die Linie
          console.log('Checking line for highlighting:', {
            stroke: line.stroke,
            selectable: line.selectable,
            visible: line.visible,
            customType: (line as any).customType,
            x1: line.x1,
            y1: line.y1,
            x2: line.x2,
            y2: line.y2
          });
          
          // Eine Linie ist verschiebbar, wenn sie sichtbar ist
          // und NICHT explizit als nicht-selektierbar markiert ist
          if (line.visible !== false) {
            console.log('Line is visible and will be highlighted');
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
  
  private findHostLineForComponent(canvas: fabric.Canvas, component: any): void {
    const componentX = component.left || 0;
    const componentY = component.top || 0;
    let closestLine: fabric.Line | null = null;
    let closestDistance = Infinity;
    let closestT = 0.5;
    
    console.log('🔎 findHostLineForComponent: Searching for host line for component at', {
      x: componentX,
      y: componentY,
      type: component.type,
      customType: (component as any).customType
    });
    
    let linesChecked = 0;
    let linesSkipped = {
      teeLines: 0,
      greenLines: 0,
      transparentLines: 0,
      dimensionLines: 0,
      total: 0
    };
    
    // Suche die nächste Linie
    const allObjects = canvas.getObjects();
    console.log(`📊 Total canvas objects: ${allObjects.length}`);
    
    allObjects.forEach(obj => {
      if (obj.type === 'line') {
        const line = obj as fabric.Line;
        linesChecked++;
        
        // Skip dimension lines
        if ((obj as any).isDimensionPart) {
          linesSkipped.dimensionLines++;
          return;
        }
        
        // Skip T-Stück-Linien (sie haben eine teeId)
        if ((line as any).teeId || (line as any).teePart) {
          linesSkipped.teeLines++;
          return;
        }
        
        // Skip grüne Auswahllinien
        if (line.stroke === '#00ff00') {
          linesSkipped.greenLines++;
          return;
        }
        
        // Skip sehr transparente Linien
        if (line.opacity !== undefined && line.opacity < 0.5) {
          linesSkipped.transparentLines++;
          return;
        }
        
        // Berechne die absoluten Koordinaten der Linie
        let absX1: number, absY1: number, absX2: number, absY2: number;
        
        if ((line as any).customType === 'CustomLine') {
          // CustomLine hat relative Koordinaten
          const centerX = line.left || 0;
          const centerY = line.top || 0;
          const relCoords = line.calcLinePoints ? line.calcLinePoints() : {
            x1: line.x1 || 0,
            y1: line.y1 || 0,
            x2: line.x2 || 0,
            y2: line.y2 || 0
          };
          absX1 = centerX + relCoords.x1;
          absY1 = centerY + relCoords.y1;
          absX2 = centerX + relCoords.x2;
          absY2 = centerY + relCoords.y2;
        } else {
          // Standard Line hat absolute Koordinaten
          absX1 = line.x1 || 0;
          absY1 = line.y1 || 0;
          absX2 = line.x2 || 0;
          absY2 = line.y2 || 0;
        }
        
        // Berechne die Position auf der Linie, die dem Komponenten-Mittelpunkt am nächsten ist
        const lineVector = {
          x: absX2 - absX1,
          y: absY2 - absY1
        };
        const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);
        
        if (lineLength > 0) {
          // Vektor vom Linienanfang zur Komponente
          const toComponent = {
            x: componentX - absX1,
            y: componentY - absY1
          };
          
          // Projiziere auf die Linie (ohne Clamping für Distanzberechnung)
          const tUnclamped = (toComponent.x * lineVector.x + toComponent.y * lineVector.y) / (lineLength * lineLength);
          
          // Clamp für die finale Position
          const t = Math.max(0, Math.min(1, tUnclamped));
          
          // Berechne den nächsten Punkt auf der Linie
          const nearestX = absX1 + t * lineVector.x;
          const nearestY = absY1 + t * lineVector.y;
          
          // Distanz zur Komponente
          const distance = Math.sqrt(
            Math.pow(componentX - nearestX, 2) + 
            Math.pow(componentY - nearestY, 2)
          );
          
          // Track the closest line even if it's far away for debugging
          if (distance < closestDistance) {
            closestDistance = distance;
            closestLine = line;
            closestT = t;
          }
        }
      }
    });
    
    linesSkipped.total = linesSkipped.teeLines + linesSkipped.greenLines + 
                         linesSkipped.transparentLines + linesSkipped.dimensionLines;
    
    console.log(`📈 Lines analyzed: ${linesChecked} checked, ${linesSkipped.total} skipped`, {
      skipped: linesSkipped,
      closestDistance: closestDistance ? closestDistance.toFixed(1) : 'none',
      foundLine: closestLine ? 'yes' : 'no'
    });
    
    // Only use the line if it's within 50 pixels (generous threshold for T-pieces)
    if (closestLine && closestDistance < 50) {
      console.log(`✅ Found host line at distance ${closestDistance.toFixed(1)}px, t=${closestT.toFixed(3)}`);
      (component as any).hostLine = closestLine;
      const lineInfo = closestLine as fabric.Line;
      
      // If T-piece is beyond line end, physically move it AND clamp the t value
      const actualT = closestT;
      let needsRepositioning = false;
      let newX = componentX;
      let newY = componentY;
      
      if (closestT >= 0.999) {
        console.log(`⚠️ T-piece is at/beyond line end (t=${actualT.toFixed(3)}), repositioning to t=0.95`);
        closestT = 0.95; // Give some room to move
        needsRepositioning = true;
      } else if (closestT <= 0.001) {
        console.log(`⚠️ T-piece is at/beyond line start (t=${actualT.toFixed(3)}), repositioning to t=0.05`);
        closestT = 0.05; // Give some room to move
        needsRepositioning = true;
      }
      
      // Calculate the correct position if we need to reposition
      if (needsRepositioning) {
        // Berechne die absoluten Koordinaten für die neue Position
        let absLineX1: number, absLineY1: number, absLineX2: number, absLineY2: number;
        
        if ((lineInfo as any).customType === 'CustomLine') {
          const centerX = lineInfo.left || 0;
          const centerY = lineInfo.top || 0;
          const relCoords = lineInfo.calcLinePoints ? lineInfo.calcLinePoints() : {
            x1: lineInfo.x1 || 0,
            y1: lineInfo.y1 || 0,
            x2: lineInfo.x2 || 0,
            y2: lineInfo.y2 || 0
          };
          absLineX1 = centerX + relCoords.x1;
          absLineY1 = centerY + relCoords.y1;
          absLineX2 = centerX + relCoords.x2;
          absLineY2 = centerY + relCoords.y2;
        } else {
          absLineX1 = lineInfo.x1 || 0;
          absLineY1 = lineInfo.y1 || 0;
          absLineX2 = lineInfo.x2 || 0;
          absLineY2 = lineInfo.y2 || 0;
        }
        
        const lineVector = {
          x: absLineX2 - absLineX1,
          y: absLineY2 - absLineY1
        };
        newX = absLineX1 + closestT * lineVector.x;
        newY = absLineY1 + closestT * lineVector.y;
        
        // Move the T-piece to the correct position
        const deltaX = newX - componentX;
        const deltaY = newY - componentY;
        
        // Clear any cached movement data since we're repositioning
        delete (component as any).initialMouseT;
        delete (component as any).tOffset;
        
        // Move the selection rectangle
        component.set({
          left: newX,
          top: newY
        });
        component.setCoords();
        
        // Move the T-piece lines if they exist
        const teeLines = (component as any).teeLines;
        if (teeLines && Array.isArray(teeLines)) {
          teeLines.forEach((line: any) => {
            if (line && line.type === 'line') {
              line.set({
                x1: (line.x1 || 0) + deltaX,
                y1: (line.y1 || 0) + deltaY,
                x2: (line.x2 || 0) + deltaX,
                y2: (line.y2 || 0) + deltaY
              });
              line.setCoords();
            }
          });
        }
        
        // Move the anchors
        const anchors = (component as any).anchors;
        if (anchors && Array.isArray(anchors)) {
          anchors.forEach((anchor: any) => {
            if (anchor) {
              anchor.set({
                left: (anchor.left || 0) + deltaX,
                top: (anchor.top || 0) + deltaY
              });
              anchor.setCoords();
            }
          });
        }
        
        console.log(`Moved T-piece from (${componentX.toFixed(0)}, ${componentY.toFixed(0)}) to (${newX.toFixed(0)}, ${newY.toFixed(0)})`);
        
        // Request canvas update
        if (canvas) {
          canvas.requestRenderAll();
        }
      }
      
      (component as any).linePosition = closestT;
      console.log(`✅ Found host line for T-piece at t=${closestT.toFixed(3)}, distance=${closestDistance.toFixed(1)}px`);
      // Verwende die berechneten absoluten Koordinaten für das Logging
      if ((lineInfo as any).customType === 'CustomLine') {
        const centerX = lineInfo.left || 0;
        const centerY = lineInfo.top || 0;
        const relCoords = lineInfo.calcLinePoints ? lineInfo.calcLinePoints() : {
          x1: lineInfo.x1 || 0,
          y1: lineInfo.y1 || 0,
          x2: lineInfo.x2 || 0,
          y2: lineInfo.y2 || 0
        };
        const absX1 = centerX + relCoords.x1;
        const absY1 = centerY + relCoords.y1;
        const absX2 = centerX + relCoords.x2;
        const absY2 = centerY + relCoords.y2;
        console.log(`Host line (CustomLine): (${absX1.toFixed(0)}, ${absY1.toFixed(0)}) to (${absX2.toFixed(0)}, ${absY2.toFixed(0)})`);
      } else {
        console.log(`Host line: (${lineInfo.x1?.toFixed(0)}, ${lineInfo.y1?.toFixed(0)}) to (${lineInfo.x2?.toFixed(0)}, ${lineInfo.y2?.toFixed(0)})`);
      }
      console.log(`T-piece center: (${newX.toFixed(0)}, ${newY.toFixed(0)})`);
    } else {
      console.log('⚠️ No suitable host line found for T-piece!');
      console.log(`T-piece position: (${componentX.toFixed(0)}, ${componentY.toFixed(0)})`);
      console.log(`Lines checked: ${linesChecked}, skipped: ${linesSkipped.total}`);
      console.log(`Skipped: ${linesSkipped.teeLines} T-lines, ${linesSkipped.greenLines} green, ${linesSkipped.transparentLines} transparent, ${linesSkipped.dimensionLines} dimension`);
      if (closestLine) {
        const lineInfo = closestLine as fabric.Line;
        console.log(`Closest line was ${closestDistance.toFixed(1)}px away (too far, max 50px)`);
        console.log(`Closest line: (${lineInfo.x1?.toFixed(0)}, ${lineInfo.y1?.toFixed(0)}) to (${lineInfo.x2?.toFixed(0)}, ${lineInfo.y2?.toFixed(0)})`);
      } else {
        console.log('No valid lines found at all!');
      }
    }
  }
  
  /**
   * Neue, vereinfachte Funktion für T-Stück und Ventil Bewegung
   * Bewegt Komponenten entlang ihrer Host-Linie
   */
  private moveComponentAlongLine(canvas: fabric.Canvas, component: any, mouseX: number, mouseY: number): void {
    console.log('🎯 moveComponentAlongLine called with:', {
      mouseX, 
      mouseY,
      componentType: component.type,
      customType: component.customType,
      currentPos: { left: component.left, top: component.top }
    });
    
    // Finde die Host-Linie
    let hostLine = component.hostLine;
    
    // Wenn keine Host-Linie gespeichert ist, finde sie
    if (!hostLine) {
      console.log('🔍 Searching for host line...');
      this.findHostLineForComponent(canvas, component);
      hostLine = component.hostLine;
      if (!hostLine) {
        console.log('❌ Keine Host-Linie gefunden! Fallback zu einfacher Bewegung');
        // Fallback: Einfache Bewegung ohne Linie
        const dx = mouseX - (this.moveStartPoint?.x || mouseX);
        const dy = mouseY - (this.moveStartPoint?.y || mouseY);
        component.set({
          left: (component.left || 0) + dx,
          top: (component.top || 0) + dy
        });
        component.setCoords();
        if (this.moveStartPoint) {
          this.moveStartPoint = { x: mouseX, y: mouseY };
        }
        canvas.requestRenderAll();
        return;
      }
    }
    
    console.log('✅ Host line found:', {
      type: hostLine.type,
      customType: (hostLine as any).customType,
      x1: hostLine.x1,
      y1: hostLine.y1,
      x2: hostLine.x2,
      y2: hostLine.y2,
      left: hostLine.left,
      top: hostLine.top
    });
    
    // Berechne absolute Koordinaten der Linie
    let lineStart: { x: number, y: number };
    let lineEnd: { x: number, y: number };
    
    if ((hostLine as any).customType === 'CustomLine') {
      // CustomLine hat relative Koordinaten
      const centerX = hostLine.left || 0;
      const centerY = hostLine.top || 0;
      const coords = hostLine.calcLinePoints ? hostLine.calcLinePoints() : {
        x1: hostLine.x1 || 0,
        y1: hostLine.y1 || 0,
        x2: hostLine.x2 || 0,
        y2: hostLine.y2 || 0
      };
      
      lineStart = { x: centerX + coords.x1, y: centerY + coords.y1 };
      lineEnd = { x: centerX + coords.x2, y: centerY + coords.y2 };
      
      console.log('📍 CustomLine erkannt - Absolute Koordinaten:', lineStart, lineEnd);
    } else {
      // Standard Line
      lineStart = { x: hostLine.x1 || 0, y: hostLine.y1 || 0 };
      lineEnd = { x: hostLine.x2 || 0, y: hostLine.y2 || 0 };
    }
    
    // Berechne Linien-Vektor
    const lineVector = {
      x: lineEnd.x - lineStart.x,
      y: lineEnd.y - lineStart.y
    };
    const lineLength = Math.sqrt(lineVector.x * lineVector.x + lineVector.y * lineVector.y);
    
    if (lineLength === 0) {
      console.log('❌ Linie hat Länge 0');
      return;
    }
    
    // Projiziere Mausposition auf die Linie
    const mouseVector = {
      x: mouseX - lineStart.x,
      y: mouseY - lineStart.y
    };
    
    // Berechne t (Position auf der Linie von 0 bis 1)
    let t = (mouseVector.x * lineVector.x + mouseVector.y * lineVector.y) / (lineLength * lineLength);
    
    // Begrenze t auf [0, 1]
    t = Math.max(0, Math.min(1, t));
    
    // Berechne neue Position
    const newX = lineStart.x + t * lineVector.x;
    const newY = lineStart.y + t * lineVector.y;
    
    console.log(`🎯 Bewege Komponente zu: (${newX.toFixed(1)}, ${newY.toFixed(1)}) bei t=${t.toFixed(3)}`);
    
    // Berechne Delta für alle zugehörigen Teile
    const oldX = component.left || 0;
    const oldY = component.top || 0;
    const deltaX = newX - oldX;
    const deltaY = newY - oldY;
    
    // Bewege die Hauptkomponente
    component.set({
      left: newX,
      top: newY
    });
    component.setCoords();
    
    // Bewege T-Stück-Linien wenn vorhanden
    if (component.teeLines && Array.isArray(component.teeLines)) {
      component.teeLines.forEach((line: any) => {
        if (line && line.type === 'line') {
          // Für T-Stück Linien: Verschiebe sie mit dem Delta
          if ((line as any).customType === 'CustomLine') {
            // CustomLine: Verschiebe das Zentrum
            line.set({
              left: (line.left || 0) + deltaX,
              top: (line.top || 0) + deltaY
            });
          } else {
            // Standard Line: Verschiebe die Endpunkte
            line.set({
              x1: (line.x1 || 0) + deltaX,
              y1: (line.y1 || 0) + deltaY,
              x2: (line.x2 || 0) + deltaX,
              y2: (line.y2 || 0) + deltaY
            });
          }
          line.setCoords();
        }
      });
    }
    
    // Bewege Ankerpunkte wenn vorhanden
    if (component.anchors && Array.isArray(component.anchors)) {
      component.anchors.forEach((anchor: any) => {
        if (anchor) {
          anchor.set({
            left: (anchor.left || 0) + deltaX,
            top: (anchor.top || 0) + deltaY
          });
          anchor.setCoords();
        }
      });
    }
    
    // Speichere Position auf der Linie
    component.linePosition = t;
    
    // Canvas neu rendern
    canvas.requestRenderAll();
  }

  private updateMovingComponent(canvas: fabric.Canvas, pointer: { x: number; y: number }): void {
    if (!this.movingComponent || !this.moveStartPoint) return;
    
    // Debug: Log component details
    console.log('🔍 updateMovingComponent called for:', {
      type: this.movingComponent.type,
      customType: (this.movingComponent as any).customType,
      isValve: (this.movingComponent as any).isValve,
      left: this.movingComponent.left,
      top: this.movingComponent.top
    });
    
    // Check if this is a T-piece or valve (use new function)
    const customType = (this.movingComponent as any).customType;
    
    // IMMER die neue Funktion für Ventile und T-Stücke verwenden
    // Ventile können verschiedene Strukturen haben
    const isValve = customType === 'valve' || 
                    (this.movingComponent as any).isValve === true ||
                    (this.movingComponent.type === 'group' && (this.movingComponent as any).valveType) ||
                    (this.movingComponent.type === 'rect' && (this.movingComponent as any).isValve);
    
    const isTeeJoint = customType === 'teeJoint' || 
                       (this.movingComponent as any).isTeeJoint === true;
    
    if (isTeeJoint || isValve) {
      // Use the new function for T-pieces and valves
      console.log('✅ Using moveComponentAlongLine for:', customType || 'valve/tee');
      this.moveComponentAlongLine(canvas, this.movingComponent, pointer.x, pointer.y);
      return;
    }
    
    // For pipes and other components, use simple movement
    console.log('📦 Using simple movement for:', customType || this.movingComponent.type);
    const dx = pointer.x - this.moveStartPoint.x;
    const dy = pointer.y - this.moveStartPoint.y;
    
    this.movingComponent.set({
      left: (this.movingComponent.left || 0) + dx,
      top: (this.movingComponent.top || 0) + dy
    });
    this.movingComponent.setCoords();
    
    this.moveStartPoint = { x: pointer.x, y: pointer.y };
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
      const customType = (this.highlightedComponent as any).customType;
      console.log(`Starting to move component: ${customType}`);
      
      this.movingComponent = this.highlightedComponent;
      this.moveStartPoint = { x: pointer.x, y: pointer.y };
      
      // Finde die Host-Linie für diese Komponente  
      const hostLine = (this.movingComponent as any).hostLine;
      const linePosition = (this.movingComponent as any).linePosition;
      
      if (hostLine && linePosition !== undefined) {
        console.log(`Start moving component on line, position: ${linePosition}`);
        // Store the initial t position for offset calculation
        (this.movingComponent as any).initialT = linePosition;
      } else {
        console.log('Component has no host line stored, finding it now...');
        // Finde die nächste Linie für diese Komponente
        this.findHostLineForComponent(canvas, this.movingComponent);
        // After finding, store the initial t position
        if ((this.movingComponent as any).linePosition !== undefined) {
          (this.movingComponent as any).initialT = (this.movingComponent as any).linePosition;
        }
      }
      
      // Deaktiviere Canvas-Selection während des Ziehens
      canvas.selection = false;
      canvas.discardActiveObject();
      
      // Setze den Cursor auf move
      canvas.defaultCursor = 'move';
      canvas.hoverCursor = 'move';
      
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
        
        // Speichere die ursprünglichen Koordinaten der Linie
        const line = this.highlightedSegment as fabric.Line;
        
        // Debug: Prüfe verschiedene Koordinaten-Properties
        console.log('=== MouseDown Debug ===');
        console.log('Pointer position:', pointer);
        console.log('Line type:', line.type, 'CustomType:', (line as any).customType);
        
        // Speichere die originale Position des Line-Centers (left/top)
        // Dies ist entscheidend für CustomLine, da wir die Position verschieben, nicht die Koordinaten
        this.originalLeft = line.left || 0;
        this.originalTop = line.top || 0;
        
        console.log('Storing original center position:', {
          left: this.originalLeft,
          top: this.originalTop
        });
        
        // Verwende calcLinePoints für korrekte Koordinaten (für Debug)
        const linePoints = line.calcLinePoints ? line.calcLinePoints() : {
          x1: line.x1 || 0,
          y1: line.y1 || 0,
          x2: line.x2 || 0,
          y2: line.y2 || 0
        };
        
        console.log('Line properties:', {
          x1: line.x1,
          y1: line.y1,
          x2: line.x2,
          y2: line.y2,
          left: line.left,
          top: line.top,
          width: line.width,
          height: line.height,
          angle: line.angle,
          originX: line.originX,
          originY: line.originY,
          calcLinePoints: linePoints
        });
        
        // Die originale Position des Line-Centers ist bereits oben gespeichert (originalLeft/originalTop)
        console.log(`Start moving split line (not part of editable pipe)`);
        console.log(`Line ready for movement - center at (${this.originalLeft}, ${this.originalTop})`);
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
      // Clean up movement tracking data
      delete (this.movingComponent as any).initialMouseT;
      delete (this.movingComponent as any).tOffset;
      delete (this.movingComponent as any).initialT;
      delete (this.movingComponent as any).hostLineSearched;
      
      // Speichere die Änderung mit State Management
      this.stateManagement.executeOperation('Move Component', () => {
        console.log('Component move completed');
      });
      // Reset Komponenten-Highlight
      if (this.highlightedComponent) {
        // Prüfe ob es ein T-Stück mit neuer Struktur ist
        if ((this.highlightedComponent as any).customType === 'teeJoint') {
          const teeLines = (this.highlightedComponent as any).teeLines;
          if (teeLines && Array.isArray(teeLines)) {
            teeLines.forEach((line: any) => {
              if ((line as any).originalStroke) {
                line.set('stroke', (line as any).originalStroke);
                delete (line as any).originalStroke;
              }
            });
          }
        } else if (this.highlightedComponent.type === 'group') {
          // Normale Ventile als Groups
          const objects = this.highlightedComponent.getObjects();
          objects.forEach((obj: any) => {
            if (obj.originalStroke) {
              obj.set('stroke', obj.originalStroke);
              delete obj.originalStroke;
            }
          });
        }
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
    // originalLineCoords removed - using originalLeft/originalTop instead
    this.originalLeft = null; // Reset original left position
    this.originalTop = null; // Reset original top position
    this.associatedComponents = [];
    
    // Reaktiviere Canvas-Selection
    canvas.selection = true;
    // Reset cursor
    canvas.defaultCursor = 'default';
    canvas.hoverCursor = 'pointer';
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
      
      // Debug logging
      console.log('Moving line - dx:', dx, 'dy:', dy);
      console.log('Original left/top:', this.originalLeft, this.originalTop);
      
      // Verwende die ursprüngliche Position und addiere das Delta
      if (this.originalLeft !== null && this.originalTop !== null) {
        const newLeft = this.originalLeft + dx;
        const newTop = this.originalTop + dy;
        
        console.log(`Moving line from (${this.originalLeft}, ${this.originalTop}) to (${newLeft}, ${newTop})`);
        
        // Für CustomLine müssen wir einen speziellen Ansatz verwenden
        if ((line as any).customType === 'CustomLine') {
          // CustomLine speichert relative Koordinaten, also müssen wir diese beibehalten
          // und nur die Center-Position verschieben
          
          // Option 1: Versuche direkt die Position zu setzen
          line.set({
            left: newLeft,
            top: newTop
          });
          
          // Wichtig: Bei CustomLine müssen wir sicherstellen, dass die Änderung übernommen wird
          line.setCoords();
          line.dirty = true;  // Markiere als geändert
          
          // Falls das nicht funktioniert, versuche die Koordinaten komplett neu zu berechnen
          if (line.left !== newLeft || line.top !== newTop) {
            console.log('Direct position update failed, trying coordinate recalculation...');
            
            // Hole die aktuellen relativen Koordinaten
            const relCoords = line.calcLinePoints();
            
            // Berechne die absoluten Koordinaten basierend auf der NEUEN Position
            const absX1 = newLeft + (relCoords.x1 || 0);
            const absY1 = newTop + (relCoords.y1 || 0);
            const absX2 = newLeft + (relCoords.x2 || 0);
            const absY2 = newTop + (relCoords.y2 || 0);
            
            // Setze die absoluten Koordinaten direkt
            // Das sollte Fabric.js zwingen, die Position neu zu berechnen
            line.set({
              x1: absX1,
              y1: absY1,
              x2: absX2,
              y2: absY2
            });
            
            line.setCoords();
          }
        } else {
          // Standard Line
          line.set({
            left: newLeft,
            top: newTop
          });
          line.setCoords();
        }
        
        console.log('Line position after update:', {
          left: line.left,
          top: line.top,
          x1: line.x1,
          y1: line.y1,
          x2: line.x2,
          y2: line.y2
        });
      }
      
      // Force canvas to re-render
      if (canvas) {
        canvas.requestRenderAll();
      }
      
      // ALTERNATIVE 2: Falls das nicht funktioniert, versuche die Linie zu löschen und neu zu erstellen
      // (Auskommentiert für späteren Test)
      /*
      canvas.remove(line);
      const newLine = new fabric.Line(
        [newX1, newY1, newX2, newY2],
        {
          stroke: line.stroke,
          strokeWidth: line.strokeWidth,
          selectable: line.selectable,
          evented: line.evented,
          ...line.toObject() // Kopiere alle anderen Properties
        }
      );
      canvas.add(newLine);
      this.movingSegment = newLine;
      */
      
      console.log('Line coords after update:', {
        x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2
      });
      console.log('Line left/top after:', line.left, line.top);
      
      // Verwende die neue Linien-Center-Position
      const newLineLeft = line.left || 0;
      const newLineTop = line.top || 0;
      
      // Bewege alle assoziierten Ventile und T-Stücke basierend auf ihrer relativen Position
      this.associatedComponents.forEach(component => {
        const relativePos = (component as any).relativePosition;
        if (relativePos) {
          // Setze die neue Position basierend auf der relativen Position zum Segment-Mittelpunkt
          const newLeft = newLineLeft + relativePos.x;
          const newTop = newLineTop + relativePos.y;
          
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

  // ========================================================================================
  // NEUE FUNKTIONEN FÜR MOVECOMPONENT MODUS (Verschieben-B)
  // Komplett neuer Ansatz für T-Stück und Ventil Bewegung
  // ========================================================================================

  private selectedComponent: any = null;
  private componentHostLine: fabric.Line | null = null;
  private componentOriginalPos: { x: number, y: number } | null = null;
  private componentMouseOffset: { x: number, y: number } | null = null;
  private hoverEffectsSetup: boolean = false;

  public handleMoveComponentMouseDown(canvas: fabric.Canvas, options: any): void {
    if (this.drawingMode !== 'moveComponent') return;
    
    console.log('🔥🔥 MoveComponent Version 9.0 - Akzeptiere schwarze UND grüne Rohrleitungen! 🔥🔥');
    
    // Ensure hover effects are set up (fallback in case setDrawingMode wasn't called properly)
    this.ensureHoverEffectsSetup(canvas);
    
    // Reset any hover highlights FIRST before processing the click
    if (this.highlightedComponent) {
      this.resetComponentHighlight(canvas, this.highlightedComponent);
      this.highlightedComponent = null;
    }
    
    const pointer = canvas.getPointer(options.e);
    let target = options.target;
    
    // If no direct target, try to find objects at pointer position
    if (!target) {
      console.log('🔍 No direct target, searching for T-piece at pointer:', pointer);
      const objects = canvas.getObjects();
      
      for (const obj of objects) {
        if ((obj as any).customType === 'teeJoint') {
          // Check if pointer is within the T-piece bounding box (more reliable than containsPoint)
          const bounds = obj.getBoundingRect();
          const tolerance = 20; // Add some tolerance for easier clicking
          
          if (pointer.x >= bounds.left - tolerance && 
              pointer.x <= bounds.left + bounds.width + tolerance &&
              pointer.y >= bounds.top - tolerance && 
              pointer.y <= bounds.top + bounds.height + tolerance) {
            console.log('🎯 Found T-piece within bounds!', bounds);
            target = obj;
            break;
          }
        }
      }
      
      // If still no target, try canvas.findTarget with a more direct approach
      if (!target) {
        try {
          target = canvas.findTarget(options.e);
          console.log('🔍 Canvas.findTarget result:', target, 'customType:', (target as any)?.customType);
        } catch (e) {
          console.log('🔍 Canvas.findTarget failed:', e);
        }
      }
    }
    
    console.log('🎯 MoveComponent MouseDown:', { 
      target, 
      pointer, 
      customType: (target as any)?.customType,
      selectable: target?.selectable,
      evented: target?.evented 
    });
    
    // Prüfe ob wir ein T-Stück oder Ventil angeklickt haben
    if (target) {
      const isValve = target.type === 'group' && ((target as any).isValve || (target as any).valveType);
      const isTeeJoint = (target as any).customType === 'teeJoint';
      
      console.log('Component check:', { 
        isValve, 
        isTeeJoint, 
        type: target.type, 
        customType: (target as any).customType 
      });
      
      if (isValve || isTeeJoint) {
        console.log('✅ Component selected:', isValve ? 'Valve' : 'T-Joint');
        this.selectedComponent = target;
        this.componentOriginalPos = { x: target.left || 0, y: target.top || 0 };
        
        // Store mouse offset from component center to prevent jumping
        // CRITICAL: This prevents the T-piece from jumping when first clicked
        this.componentMouseOffset = {
          x: pointer.x - (target.left || 0),
          y: pointer.y - (target.top || 0)
        };
        
        console.log('📍 Initial setup:', {
          componentPos: this.componentOriginalPos,
          mouseOffset: this.componentMouseOffset,
          pointer,
          calculatedOffset: `pointer(${pointer.x.toFixed(0)}, ${pointer.y.toFixed(0)}) - component(${(target.left || 0).toFixed(0)}, ${(target.top || 0).toFixed(0)}) = offset(${this.componentMouseOffset.x.toFixed(0)}, ${this.componentMouseOffset.y.toFixed(0)})`
        });
        
        // Finde die Host-Linie (Rohrleitung) für die Bewegung
        this.findNearestLineForComponent(canvas, target);
        
        // Deaktiviere Canvas Selection
        canvas.selection = false;
        canvas.discardActiveObject();
        
        // Highlight component NACH dem Finden der Host-Linie
        if (isValve && target.type === 'group') {
          const groupTarget = target as fabric.Group;
          groupTarget.getObjects().forEach((obj: any) => {
            if (obj.type === 'line' || obj.type === 'path') {
              (obj as any).originalStroke = obj.stroke;
              obj.set('stroke', '#00ff00');
            }
          });
        } else if (isTeeJoint && (target as any).teeLines) {
          (target as any).teeLines.forEach((line: any) => {
            if (line) {
              (line as any).originalStroke = line.stroke;
              line.set('stroke', '#ff6600'); // Orange highlight für T-Stück - NICHT grün!
            }
          });
        }
        
        canvas.requestRenderAll();
      }
    }
  }

  public handleMoveComponentMouseMove(canvas: fabric.Canvas, options: any): void {
    if (this.drawingMode !== 'moveComponent') return;

    const pointer = canvas.getPointer(options.e);

    // If we're dragging a component along a pipeline
    if (this.selectedComponent && this.componentHostLine) {
      // For T-pieces, use the combined virtual line from both connected segments
      let effectiveHostLine = this.componentHostLine;

      if ((this.selectedComponent as any).customType === 'teeJoint' &&
          (this.selectedComponent as any).connectedLines?.length >= 2) {
        // Create a virtual line that spans both connected segments
        const line1 = (this.selectedComponent as any).connectedLines[0];
        const line2 = (this.selectedComponent as any).connectedLines[1];

        if (line1 && line2) {
          // Virtual line from line1 start to line2 end
          effectiveHostLine = new fabric.Line(
            [line1.x1 || 0, line1.y1 || 0, line2.x2 || 0, line2.y2 || 0],
            { stroke: 'transparent' }
          );
          console.log('📏 Using virtual line for T-piece movement:', {
            start: { x: (line1.x1 || 0).toFixed(0), y: (line1.y1 || 0).toFixed(0) },
            end: { x: (line2.x2 || 0).toFixed(0), y: (line2.y2 || 0).toFixed(0) }
          });
        }
      }

      // Berechne gewünschte Position mit Mouse Offset
      const desiredPos = {
        x: pointer.x - (this.componentMouseOffset?.x || 0),
        y: pointer.y - (this.componentMouseOffset?.y || 0)
      };

      // Projiziere auf die Host-Linie (pass component for T-piece anchor constraints)
      const newPos = this.projectPointOnLine(desiredPos, effectiveHostLine, this.selectedComponent);
      
      console.log('🎯 Bewege T-Stück entlang Rohrleitung:', {
        pointer: { x: pointer.x.toFixed(0), y: pointer.y.toFixed(0) },
        mouseOffset: this.componentMouseOffset,
        desiredPos: { x: desiredPos.x.toFixed(0), y: desiredPos.y.toFixed(0) },
        newPos: { x: newPos.x.toFixed(0), y: newPos.y.toFixed(0) },
        hostLineStroke: this.componentHostLine.stroke,
        componentCurrentPos: { x: (this.selectedComponent.left || 0).toFixed(0), y: (this.selectedComponent.top || 0).toFixed(0) }
      });
      
      // CRITICAL DEBUG: Check if newPos is different from current position
      const currentPos = { x: this.selectedComponent.left || 0, y: this.selectedComponent.top || 0 };
      const positionChanged = Math.abs(newPos.x - currentPos.x) > 0.1 || Math.abs(newPos.y - currentPos.y) > 0.1;
      
      if (!positionChanged) {
        console.log('🚨 PROBLEM: newPos equals currentPos - T-piece won\'t move!', {
          currentPos,
          newPos,
          difference: { x: (newPos.x - currentPos.x).toFixed(3), y: (newPos.y - currentPos.y).toFixed(3) }
        });
      }
      
      
      // Bewege die komplette Komponente inkl. aller Teile
      this.moveComponentParts(canvas, this.selectedComponent, newPos);
      
      canvas.requestRenderAll();
    } 
    // If we're just hovering (not dragging)
    else if (!this.selectedComponent) {
      // Check if we're hovering over a moveable component
      let target = canvas.findTarget(options.e);
      
      // If no direct target found, manually search for T-pieces (same logic as MouseDown)
      if (!target) {
        const pointer = canvas.getPointer(options.e);
        const objects = canvas.getObjects();
        
        for (const obj of objects) {
          if ((obj as any).customType === 'teeJoint') {
            // Check if pointer is within the T-piece bounding box
            const bounds = obj.getBoundingRect();
            const tolerance = 20; // Add some tolerance for easier hovering
            
            if (pointer.x >= bounds.left - tolerance && 
                pointer.x <= bounds.left + bounds.width + tolerance &&
                pointer.y >= bounds.top - tolerance && 
                pointer.y <= bounds.top + bounds.height + tolerance) {
              target = obj;
              break;
            }
          }
        }
      }
      
      if (target) {
        const isTeeJoint = (target as any).customType === 'teeJoint';
        const isValve = target.type === 'group' && ((target as any).isValve || (target as any).valveType);
        
        if (isTeeJoint || isValve) {
          // Show hover cursor
          canvas.hoverCursor = 'move';
          
          // Highlight on hover (if not already highlighted)
          if (this.highlightedComponent !== target) {
            // Reset previous highlight
            if (this.highlightedComponent) {
              this.resetComponentHighlight(canvas, this.highlightedComponent);
            }
            
            // Apply new highlight
            this.highlightedComponent = target;
            if (isTeeJoint && (target as any).teeLines) {
              console.log('🎨 HIGHLIGHTING T-piece lines:', (target as any).teeLines.length);
              (target as any).teeLines.forEach((line: any, index: number) => {
                if (line) {
                  const currentStroke = line.stroke;
                  (line as any).originalStroke = (line as any).originalStroke || currentStroke;
                  console.log(`  Line ${index}: ${currentStroke} → #4CAF50 (original: ${(line as any).originalStroke})`);
                  line.set('stroke', '#4CAF50'); // Grüne hover highlight für T-Stück wie andere Rohrleitungen
                }
              });
            } else if (isValve && target.type === 'group') {
              const groupTarget = target as fabric.Group;
              groupTarget.getObjects().forEach((obj: any) => {
                if (obj.type === 'line' || obj.type === 'path') {
                  (obj as any).originalStroke = (obj as any).originalStroke || obj.stroke;
                  obj.set('stroke', '#4CAF50');
                }
              });
            }
            canvas.requestRenderAll();
          }
        } else {
          canvas.hoverCursor = 'default';
          if (this.highlightedComponent) {
            this.resetComponentHighlight(canvas, this.highlightedComponent);
            this.highlightedComponent = null;
            canvas.requestRenderAll();
          }
        }
      } else {
        canvas.hoverCursor = 'default';
        if (this.highlightedComponent) {
          this.resetComponentHighlight(canvas, this.highlightedComponent);
          this.highlightedComponent = null;
          canvas.requestRenderAll();
        }
      }
    }
  }

  public handleMoveComponentMouseUp(canvas: fabric.Canvas, options: any): void {
    if (this.drawingMode !== 'moveComponent' || !this.selectedComponent) return;
    
    console.log('🏁 MoveComponent MouseUp');
    
    // Restore original colors
    const isValve = this.selectedComponent.type === 'group' || (this.selectedComponent as any).isValve;
    const isTeeJoint = (this.selectedComponent as any).customType === 'teeJoint';
    
    if (isValve && this.selectedComponent.type === 'group') {
      const groupComponent = this.selectedComponent as fabric.Group;
      groupComponent.getObjects().forEach((obj: any) => {
        if ((obj as any).originalStroke) {
          obj.set('stroke', (obj as any).originalStroke);
          delete (obj as any).originalStroke;
        }
      });
    } else if (isTeeJoint && (this.selectedComponent as any).teeLines) {
      (this.selectedComponent as any).teeLines.forEach((line: any) => {
        if (line && (line as any).originalStroke) {
          line.set('stroke', (line as any).originalStroke);
          delete (line as any).originalStroke;
        }
      });
    }
    
    // Save state if we have state management
    if (this.stateManagement) {
      this.stateManagement.executeOperation('Move Component', () => {
        console.log('Component movement saved');
      });
    }
    
    // Reset
    this.selectedComponent = null;
    this.componentHostLine = null;
    this.componentOriginalPos = null;
    this.componentMouseOffset = null;
    
    // Re-enable canvas selection
    canvas.selection = true;
    canvas.requestRenderAll();
  }

  private findNearestLineForComponent(canvas: fabric.Canvas, component: any): void {
    const compX = component.left || 0;
    const compY = component.top || 0;
    let nearestLine: fabric.Line | null = null;
    let nearestDistance = Infinity;

    console.log('🔍 Finding nearest line for component at:', { compX, compY });
    console.log('Component details:', {
      type: component.type,
      customType: (component as any).customType,
      teeId: (component as any).teeId,
      teeLines: (component as any).teeLines?.length || 0,
      connectedLines: (component as any).connectedLines?.length || 0
    });

    // Special handling for T-pieces with connected lines
    if ((component as any).customType === 'teeJoint') {
      // First try to use stored connected lines
      let connectedLines = (component as any).connectedLines;

      // If connectedLines are missing or invalid, try to find them
      if (!connectedLines || connectedLines.length < 2 ||
          !connectedLines[0] || !connectedLines[1]) {
        console.log('⚠️ ConnectedLines missing or invalid, searching for pipeline segments...');

        // Find lines that are close to the T-piece position
        const teeX = component.left || 0;
        const teeY = component.top || 0;
        const nearbyLines: fabric.Line[] = [];

        canvas.getObjects().forEach(obj => {
          if ((obj.type === 'line' || (obj as any).customType === 'CustomLine') &&
              !(obj as any).isDimensionPart &&
              !(obj as any).teeId) { // Exclude T-piece's own lines

            const line = obj as fabric.Line;
            // Check distance from T-piece to line
            const dist = this.distanceToLine(
              { x: teeX, y: teeY },
              { x: line.x1 || 0, y: line.y1 || 0 },
              { x: line.x2 || 0, y: line.y2 || 0 }
            );

            if (dist < 10) { // Very close to T-piece
              nearbyLines.push(line);
            }
          }
        });

        // Store found lines as connected lines
        if (nearbyLines.length >= 2) {
          connectedLines = nearbyLines.slice(0, 2);
          (component as any).connectedLines = connectedLines;
          console.log('✅ Found and restored connectedLines:', connectedLines.length);
        }
      }

      if (connectedLines && connectedLines.length >= 2) {
        console.log('🔗 T-piece has connectedLines:', connectedLines.length);

        // Use the first connected line as primary host
        const line1 = connectedLines[0];
        const line2 = connectedLines[1];

        if (line1 && line2) {
          // Store both lines for virtual line creation in mouse move
          this.componentHostLine = line1; // Use first line as base
          console.log('✅ Using connected lines for T-piece movement');
          return;
        }
      }
    }

    // Debug: Zeige ALLE Objekte auf dem Canvas
    const allObjects = canvas.getObjects();
    console.log(`📊 Canvas hat ${allObjects.length} Objekte insgesamt`);

    const allLines = allObjects.filter(obj =>
      obj.type === 'line' || (obj as any).customType === 'CustomLine'
    );
    console.log(`📏 Davon sind ${allLines.length} Linien:`);
    allLines.forEach((line, index) => {
      console.log(`  Linie ${index + 1}:`, {
        type: (line as any).customType || line.type,
        stroke: line.stroke,
        strokeWidth: line.strokeWidth,
        opacity: line.opacity,
        teeId: (line as any).teeId,
        coords: {
          x1: (line as any).x1,
          y1: (line as any).y1,
          x2: (line as any).x2,
          y2: (line as any).y2,
          left: line.left,
          top: line.top
        }
      });
    });

    // Get the T-piece's own lines to exclude them
    const componentTeeId = (component as any).teeId;
    const componentTeeLines = (component as any).teeLines || [];
    
    canvas.getObjects().forEach(obj => {
      // Check for both regular lines and CustomLines
      if ((obj.type === 'line' || (obj as any).customType === 'CustomLine') && obj !== component) {
        const line = obj as fabric.Line;
        
        // Skip the T-piece's own lines (the visual lines of the T-piece itself)
        if (componentTeeId && (line as any).teeId === componentTeeId) {
          console.log('  Skipping T-piece own line with matching teeId:', componentTeeId);
          return;
        }
        
        // Also skip if line is in the component's teeLines array
        if (componentTeeLines.includes(line)) {
          console.log('  Skipping line that is in component.teeLines array');
          return;
        }
        
        // Skip special lines (but not the host pipeline!)
        if ((line as any).isDimensionPart || 
            (line.opacity !== undefined && line.opacity < 0.5)) {
          return;
        }
        
        // Akzeptiere sowohl schwarze als auch grüne Rohrleitungen
        // Skip nur sehr transparente Linien
        if (line.opacity !== undefined && line.opacity < 0.1) {
          console.log('  Skipping very transparent line');
          return;
        }
        
        // Bevorzuge schwarze Linien, aber akzeptiere auch grüne
        const isPreferredLine = line.stroke === 'black' || line.stroke === '#000000';
        const isAcceptableLine = line.stroke === '#4CAF50' || isPreferredLine;
        
        if (!isAcceptableLine) {
          console.log('  Skipping line with unacceptable stroke:', line.stroke);
          return;
        }
        
        // Get line coordinates
        let x1: number, y1: number, x2: number, y2: number;
        
        if ((line as any).customType === 'CustomLine') {
          // CustomLine with relative coordinates
          const centerX = line.left || 0;
          const centerY = line.top || 0;
          const coords = (line as any).calcLinePoints ? (line as any).calcLinePoints() : {
            x1: (line as any).x1 || 0,
            y1: (line as any).y1 || 0,
            x2: (line as any).x2 || 0,
            y2: (line as any).y2 || 0
          };
          x1 = centerX + coords.x1;
          y1 = centerY + coords.y1;
          x2 = centerX + coords.x2;
          y2 = centerY + coords.y2;
        } else {
          // Standard line
          x1 = line.x1 || 0;
          y1 = line.y1 || 0;
          x2 = line.x2 || 0;
          y2 = line.y2 || 0;
        }
        
        // Calculate distance to line
        const dist = this.distanceToLine(
          { x: compX, y: compY },
          { x: x1, y: y1 },
          { x: x2, y: y2 }
        );
        
        // Only log lines that are reasonably close
        if (dist < 100) {
          console.log('📏 Line candidate:', {
            type: (line as any).customType || line.type,
            stroke: line.stroke,
            distance: dist.toFixed(2),
            coords: { x1: x1.toFixed(0), y1: y1.toFixed(0), x2: x2.toFixed(0), y2: y2.toFixed(0) },
            teeId: (line as any).teeId,
            isPipe: (line as any).isPipe,
            originalStroke: (line as any).originalStroke
          });
        }
        
        // Consider lines within 50 pixels
        if (dist < nearestDistance && dist < 50) {
          // Präferiere schwarze Linien, aber akzeptiere auch grüne
          const isBlackLine = line.stroke === 'black' || line.stroke === '#000000';
          const isGreenLine = line.stroke === '#4CAF50';
          
          // Wenn wir noch keine Linie haben oder diese besser ist
          if (nearestLine === null || isBlackLine || (isGreenLine && nearestLine.stroke !== 'black')) {
            nearestDistance = dist;
            nearestLine = line;
          }
        }
      }
    });
    
    if (nearestLine) {
      this.componentHostLine = nearestLine;
      const lineObj = nearestLine as fabric.Line;
      console.log('✅ Found host line:', {
        type: (lineObj as any).customType || lineObj.type,
        distance: nearestDistance.toFixed(2),
        stroke: lineObj.stroke,
        isPipe: (lineObj as any).isPipe,
        coords: (() => {
          if ((lineObj as any).customType === 'CustomLine') {
            const centerX = lineObj.left || 0;
            const centerY = lineObj.top || 0;
            const coords = (lineObj as any).calcLinePoints ? (lineObj as any).calcLinePoints() : {
              x1: (lineObj as any).x1 || 0,
              y1: (lineObj as any).y1 || 0,
              x2: (lineObj as any).x2 || 0,
              y2: (lineObj as any).y2 || 0
            };
            return {
              x1: (centerX + coords.x1).toFixed(0),
              y1: (centerY + coords.y1).toFixed(0),
              x2: (centerX + coords.x2).toFixed(0),
              y2: (centerY + coords.y2).toFixed(0)
            };
          } else {
            return {
              x1: (lineObj.x1 || 0).toFixed(0),
              y1: (lineObj.y1 || 0).toFixed(0),
              x2: (lineObj.x2 || 0).toFixed(0),
              y2: (lineObj.y2 || 0).toFixed(0)
            };
          }
        })()
      });
    } else {
      console.log('❌ No suitable host line found');
      this.componentHostLine = null;
    }
  }

  private findAllAnchorsOnLine(canvas: fabric.Canvas, hostLine: fabric.Line, excludeComponentId?: string): { x: number, y: number }[] {
    if (!canvas || !hostLine) return [];

    // Get absolute line coordinates
    let x1: number, y1: number, x2: number, y2: number;

    if ((hostLine as any).customType === 'CustomLine') {
      // CustomLine with relative coordinates
      const centerX = hostLine.left || 0;
      const centerY = hostLine.top || 0;
      const coords = (hostLine as any).calcLinePoints ? (hostLine as any).calcLinePoints() : {
        x1: hostLine.x1 || 0,
        y1: hostLine.y1 || 0,
        x2: hostLine.x2 || 0,
        y2: hostLine.y2 || 0
      };
      x1 = centerX + coords.x1;
      y1 = centerY + coords.y1;
      x2 = centerX + coords.x2;
      y2 = centerY + coords.y2;
    } else {
      // Standard line
      x1 = hostLine.x1 || 0;
      y1 = hostLine.y1 || 0;
      x2 = hostLine.x2 || 0;
      y2 = hostLine.y2 || 0;
    }

    // Find all anchor points
    const allObjects = canvas.getObjects();
    const anchors = allObjects.filter(obj => {
      // Exclude anchors that belong to the component being moved
      if (excludeComponentId &&
          ((obj as any).componentId === excludeComponentId ||
           (obj as any).teeId === excludeComponentId)) {
        return false;
      }

      return (obj as any).isAnchor === true ||
             (obj as any).customType === 'anchorPoint' ||
             (obj.type === 'circle' && (obj as fabric.Circle).radius && (obj as fabric.Circle).radius < 10);
    }) as fabric.Circle[];

    // Filter anchors that are on or near the line
    const maxDistance = 30; // Maximum distance from line to consider
    const anchorsOnLine: { x: number, y: number }[] = [];

    anchors.forEach(anchor => {
      const anchorX = anchor.left || 0;
      const anchorY = anchor.top || 0;

      // Calculate distance from anchor to line
      const dist = this.distanceToLine(
        { x: anchorX, y: anchorY },
        { x: x1, y: y1 },
        { x: x2, y: y2 }
      );

      if (dist < maxDistance) {
        // Also check if anchor is within the line segment bounds (with some tolerance)
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq > 0) {
          const t = ((anchorX - x1) * dx + (anchorY - y1) * dy) / lengthSq;

          // Accept anchors that are along the line direction (even slightly beyond)
          if (t >= -0.1 && t <= 1.1) {
            anchorsOnLine.push({ x: anchorX, y: anchorY });
            console.log(`  Found anchor on line at (${anchorX.toFixed(0)}, ${anchorY.toFixed(0)}), t=${t.toFixed(3)}`);
          }
        }
      }
    });

    console.log(`🔍 Found ${anchorsOnLine.length} anchors on the line`);
    return anchorsOnLine;
  }

  private findHostLineAnchors(canvas: fabric.Canvas, hostLine: fabric.Line): { start: { x: number, y: number }, end: { x: number, y: number } } | null {
    if (!canvas || !hostLine) return null;

    // Get absolute line coordinates
    let x1: number, y1: number, x2: number, y2: number;
    
    if ((hostLine as any).customType === 'CustomLine') {
      // CustomLine with relative coordinates
      const centerX = hostLine.left || 0;
      const centerY = hostLine.top || 0;
      const coords = (hostLine as any).calcLinePoints ? (hostLine as any).calcLinePoints() : {
        x1: hostLine.x1 || 0,
        y1: hostLine.y1 || 0,
        x2: hostLine.x2 || 0,
        y2: hostLine.y2 || 0
      };
      x1 = centerX + coords.x1;
      y1 = centerY + coords.y1;
      x2 = centerX + coords.x2;
      y2 = centerY + coords.y2;
    } else {
      // Standard line
      x1 = hostLine.x1 || 0;
      y1 = hostLine.y1 || 0;
      x2 = hostLine.x2 || 0;
      y2 = hostLine.y2 || 0;
    }

    // Find anchor points that are at the start and end of this line
    const tolerance = 30; // Increased tolerance to account for anchor placement variations
    const allObjects = canvas.getObjects();
    
    // Try multiple ways to find anchors
    const anchors = allObjects.filter(obj => {
      return (obj as any).isAnchor === true ||
             (obj as any).customType === 'anchorPoint' ||
             (obj.type === 'circle' && (obj as fabric.Circle).radius && (obj as fabric.Circle).radius < 10); // Small circles are likely anchors
    }) as fabric.Circle[];
    
    console.log('🔍 Searching for anchors:', {
      totalObjects: allObjects.length,
      totalAnchors: anchors.length,
      lineCoords: { x1: x1.toFixed(0), y1: y1.toFixed(0), x2: x2.toFixed(0), y2: y2.toFixed(0) },
      tolerance
    });
    
    let startAnchor = null;
    let endAnchor = null;

    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i];
      const anchorX = anchor.left || 0;
      const anchorY = anchor.top || 0;
      
      const distanceToStart = Math.sqrt((anchorX - x1) ** 2 + (anchorY - y1) ** 2);
      const distanceToEnd = Math.sqrt((anchorX - x2) ** 2 + (anchorY - y2) ** 2);
      
      console.log(`  Anchor ${i}:`, {
        position: { x: anchorX.toFixed(0), y: anchorY.toFixed(0) },
        distanceToStart: distanceToStart.toFixed(1),
        distanceToEnd: distanceToEnd.toFixed(1),
        properties: { isAnchor: (anchor as any).isAnchor, type: anchor.type }
      });
      
      // Check if anchor is at line start
      if (distanceToStart < tolerance) {
        startAnchor = { x: anchorX, y: anchorY };
        console.log(`    ✅ Found START anchor at (${anchorX.toFixed(0)}, ${anchorY.toFixed(0)})`);
      }
      // Check if anchor is at line end
      else if (distanceToEnd < tolerance) {
        endAnchor = { x: anchorX, y: anchorY };
        console.log(`    ✅ Found END anchor at (${anchorX.toFixed(0)}, ${anchorY.toFixed(0)})`);
      }
    }

    if (startAnchor && endAnchor) {
      console.log('🔗 Found host line anchors:', {
        start: { x: startAnchor.x.toFixed(0), y: startAnchor.y.toFixed(0) },
        end: { x: endAnchor.x.toFixed(0), y: endAnchor.y.toFixed(0) }
      });
      return { start: startAnchor, end: endAnchor };
    }

    console.log('❌ Could not find both anchors for host line');
    return null;
  }

  private projectPointOnLine(point: { x: number, y: number }, line: fabric.Line, component?: any): { x: number, y: number } {
    console.log('📐 projectPointOnLine called with:', {
      inputPoint: { x: point.x.toFixed(0), y: point.y.toFixed(0) },
      lineType: (line as any).customType || 'standard',
      lineStroke: line.stroke,
      hasComponent: !!component,
      componentType: component ? (component as any).customType : null
    });

    // Find anchor constraints for T-piece movement
    const anchors = this.canvas ? this.findHostLineAnchors(this.canvas, line) : null;

    // Get absolute line coordinates
    let x1: number, y1: number, x2: number, y2: number;
    
    if ((line as any).customType === 'CustomLine') {
      // CustomLine with relative coordinates
      const centerX = line.left || 0;
      const centerY = line.top || 0;
      const coords = (line as any).calcLinePoints ? (line as any).calcLinePoints() : {
        x1: line.x1 || 0,
        y1: line.y1 || 0,
        x2: line.x2 || 0,
        y2: line.y2 || 0
      };
      x1 = centerX + coords.x1;
      y1 = centerY + coords.y1;
      x2 = centerX + coords.x2;
      y2 = centerY + coords.y2;
      
      console.log('📐 CustomLine coordinates:', {
        center: { x: centerX.toFixed(0), y: centerY.toFixed(0) },
        relativeCoords: coords,
        absoluteCoords: { x1: x1.toFixed(0), y1: y1.toFixed(0), x2: x2.toFixed(0), y2: y2.toFixed(0) }
      });
    } else {
      // Standard line
      x1 = line.x1 || 0;
      y1 = line.y1 || 0;
      x2 = line.x2 || 0;
      y2 = line.y2 || 0;
      
      console.log('📐 Standard line coordinates:', { x1: x1.toFixed(0), y1: y1.toFixed(0), x2: x2.toFixed(0), y2: y2.toFixed(0) });
    }
    
    // Calculate projection
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;
    
    console.log('📐 Projection calculation:', {
      lineVector: { dx: dx.toFixed(1), dy: dy.toFixed(1) },
      lineLength: Math.sqrt(lengthSq).toFixed(1),
      lengthSq: lengthSq.toFixed(1)
    });
    
    if (lengthSq === 0) {
      console.log('⚠️ Zero-length line detected, returning first point');
      return { x: x1, y: y1 };
    }
    
    // Calculate the raw t value (can be outside 0-1 range)
    let rawT = ((point.x - x1) * dx + (point.y - y1) * dy) / lengthSq;
    
    // Check if we have anchor constraints - if so, skip line extension
    let skipExtension = false;
    if (anchors && anchors.start && anchors.end) {
      console.log('🔒 Anchor constraints detected from findHostLineAnchors - will skip line extension');
      skipExtension = true;
    }

    // Also check if we have any anchors on the line (for T-pieces and valves)
    // This is critical to prevent line extension when moving components
    if (!skipExtension && this.canvas) {
      const allAnchorsOnLine = this.findAllAnchorsOnLine(this.canvas, line);
      if (allAnchorsOnLine.length > 0) {
        console.log('🔒 Found', allAnchorsOnLine.length, 'anchors on line - blocking line extension');
        skipExtension = true;
      }
    }
    
    // CRITICAL: Extend host line dynamically if T-piece moves beyond bounds (only if no anchor constraints)
    let extendedLine = false;
    if (!skipExtension && rawT > 1.0) {
      // T-piece wants to move beyond line end - extend the line
      console.log('🚀 EXTENDING host line beyond end! rawT =', rawT.toFixed(3));
      const extension = (rawT - 1.0) * Math.sqrt(lengthSq);
      const newX2 = x2 + (extension * dx) / Math.sqrt(lengthSq);
      const newY2 = y2 + (extension * dy) / Math.sqrt(lengthSq);
      
      // Update the actual host line coordinates
      if ((line as any).customType === 'CustomLine') {
        // For CustomLine, we need to update the coordinates properly
        console.log('🚀 Extending CustomLine - updating coordinates directly');
        line.set({
          x2: newX2,
          y2: newY2
        });
        // Force the CustomLine to recalculate its internal coordinates
        line.setCoords();
        (line as any).dirty = true;
        extendedLine = true;
        console.log('🚀 Extended CustomLine from', `(${x1}, ${y1}) → (${x2}, ${y2})`, 
                   'to', `(${x1}, ${y1}) → (${newX2.toFixed(0)}, ${newY2.toFixed(0)})`);
        
        // Update our calculation coordinates
        x2 = newX2;
        y2 = newY2;
      } else {
        // Standard line - update x2, y2
        line.set({
          x2: newX2,
          y2: newY2
        });
        extendedLine = true;
        console.log('🚀 Extended host line from', `(${x1}, ${y1}) → (${x2}, ${y2})`, 
                   'to', `(${x1}, ${y1}) → (${newX2.toFixed(0)}, ${newY2.toFixed(0)})`);
        
        // Update our calculation coordinates
        x2 = newX2;
        y2 = newY2;
        // Recalculate with new line length
        const newDx = x2 - x1;
        const newDy = y2 - y1;
        const newLengthSq = newDx * newDx + newDy * newDy;
        const newRawT = ((point.x - x1) * newDx + (point.y - y1) * newDy) / newLengthSq;
        rawT = newRawT;  // Use the new t value
      }
    } else if (!skipExtension && rawT < 0.0) {
      // T-piece wants to move beyond line start - extend the line backwards  
      console.log('🚀 EXTENDING host line beyond start! rawT =', rawT.toFixed(3));
      const extension = Math.abs(rawT) * Math.sqrt(lengthSq);
      const newX1 = x1 - (extension * dx) / Math.sqrt(lengthSq);
      const newY1 = y1 - (extension * dy) / Math.sqrt(lengthSq);
      
      if ((line as any).customType === 'CustomLine') {
        // Handle CustomLine extension at the start
        console.log('🚀 Extending CustomLine backwards - updating coordinates directly');
        line.set({
          x1: newX1,
          y1: newY1
        });
        // Force the CustomLine to recalculate its internal coordinates
        line.setCoords();
        (line as any).dirty = true;
        extendedLine = true;
        console.log('🚀 Extended CustomLine from', `(${x1}, ${y1}) → (${x2}, ${y2})`, 
                   'to', `(${newX1.toFixed(0)}, ${newY1.toFixed(0)}) → (${x2}, ${y2})`);
        
        // Update our calculation coordinates
        x1 = newX1;
        y1 = newY1;
      } else {
        line.set({
          x1: newX1,
          y1: newY1
        });
        extendedLine = true;
        console.log('🚀 Extended host line from', `(${x1}, ${y1}) → (${x2}, ${y2})`, 
                   'to', `(${newX1.toFixed(0)}, ${newY1.toFixed(0)}) → (${x2}, ${y2})`);
        
        // Update our calculation coordinates
        x1 = newX1;
        y1 = newY1;
        // Recalculate with new line length
        const newDx = x2 - x1;
        const newDy = y2 - y1;
        const newLengthSq = newDx * newDx + newDy * newDy;
        const newRawT = ((point.x - x1) * newDx + (point.y - y1) * newDy) / newLengthSq;
        rawT = newRawT;  // Use the new t value
      }
    }

    // Apply anchor constraints for T-piece movement
    let constrainedT = rawT;
    if (anchors) {
      // Find ALL anchors on the line (not just start and end)
      // For T-pieces, exclude their own anchors from the constraint calculation
      const componentId = this.selectedComponent ?
        ((this.selectedComponent as any).teeId || (this.selectedComponent as any).customId) : undefined;
      const allAnchors = this.canvas ? this.findAllAnchorsOnLine(this.canvas, line, componentId) : [];

      if (allAnchors.length > 0) {
        // Calculate T-values for all anchor positions
        const anchorTValues = allAnchors.map((anchor: { x: number, y: number }) => {
          // Project anchor onto line to get its T value
          const anchorT = ((anchor.x - x1) * dx + (anchor.y - y1) * dy) / lengthSq;
          return anchorT;
        }).sort((a: number, b: number) => a - b); // Sort T values in ascending order

        // Find the nearest anchors before and after the desired position
        let minT = 0.0;
        let maxT = 1.0;

        for (let i = 0; i < anchorTValues.length; i++) {
          const anchorT = anchorTValues[i];
          if (anchorT < rawT && anchorT > minT) {
            minT = anchorT;
          }
          if (anchorT > rawT && anchorT < maxT) {
            maxT = anchorT;
            break; // We found the next anchor, no need to continue
          }
        }

        // Calculate line length first
        const lineLength = Math.sqrt(lengthSq);

        // Calculate T-piece anchor offset if we have a T-piece component
        let componentAnchorOffset = 0;
        if (component && (component as any).customType === 'teeJoint') {
          // T-pieces have anchors at ±20 pixels from center along the line
          const teeAnchorDistance = 20; // Distance from T-piece center to its anchors
          componentAnchorOffset = teeAnchorDistance / lineLength;

          console.log('🔧 T-piece anchor offset calculation:', {
            anchorDistance: teeAnchorDistance,
            lineLength: lineLength.toFixed(1),
            offsetInT: componentAnchorOffset.toFixed(4)
          });
        }

        // Add buffer distance from anchors (in pixels)
        const bufferPixels = 3; // Small buffer to prevent exact overlap
        const bufferT = bufferPixels / lineLength;

        // Apply buffer and T-piece anchor offset to constraints
        // For T-pieces: ensure T-piece's anchors don't go beyond pipeline anchors
        minT = minT + bufferT + componentAnchorOffset;
        maxT = maxT - bufferT - componentAnchorOffset;

        // Ensure min and max don't cross
        if (minT >= maxT) {
          // Not enough space between anchors, use midpoint
          const midT = (minT - bufferT + maxT + bufferT) / 2;
          constrainedT = midT;
        } else {
          // Constrain T-value between anchors with buffer
          constrainedT = Math.max(minT, Math.min(maxT, rawT));
        }

        console.log('🔒 Applied anchor constraints:', {
          originalT: rawT.toFixed(3),
          constrainedT: constrainedT.toFixed(3),
          minT: minT.toFixed(3),
          maxT: maxT.toFixed(3),
          anchorCount: allAnchors.length,
          anchorTValues: anchorTValues.map((t: number) => t.toFixed(3)),
          bufferPixels,
          wasConstrained: Math.abs(constrainedT - rawT) > 0.001
        });
      }
    }

    // Use constrained t value
    const t = extendedLine ? constrainedT : Math.max(-0.05, Math.min(1.05, constrainedT));
    
    console.log('📐 T-value calculation:', {
      rawT: rawT.toFixed(3),
      constrainedT: constrainedT.toFixed(3),
      finalT: t.toFixed(3),
      beyondEnd: rawT > 1.0 ? 'YES - beyond end' : rawT < 0.0 ? 'YES - before start' : 'NO - within line',
      lineExtended: extendedLine
    });
    
    const result = {
      x: x1 + t * dx,
      y: y1 + t * dy
    };
    
    console.log('📐 Projection result:', {
      t: t.toFixed(3),
      projectedPoint: { x: result.x.toFixed(0), y: result.y.toFixed(0) },
      inputVsResult: `(${point.x.toFixed(0)}, ${point.y.toFixed(0)}) → (${result.x.toFixed(0)}, ${result.y.toFixed(0)})`,
      hostLineExtended: extendedLine
    });
    
    // Force canvas re-render if we extended the line
    if (extendedLine && this.canvas) {
      this.canvas.requestRenderAll();
    }
    
    return result;
  }

  private distanceToLine(point: { x: number, y: number }, lineStart: { x: number, y: number }, lineEnd: { x: number, y: number }): number {
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
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }

  private moveComponentParts(canvas: fabric.Canvas, component: any, newPos: { x: number, y: number }): void {
    const oldX = component.left || 0;
    const oldY = component.top || 0;
    const deltaX = newPos.x - oldX;
    const deltaY = newPos.y - oldY;
    
    console.log('🔧 moveComponentParts FINAL FIX:', {
      oldPos: { x: oldX.toFixed(0), y: oldY.toFixed(0) },
      newPos: { x: newPos.x.toFixed(0), y: newPos.y.toFixed(0) },
      delta: { x: deltaX.toFixed(0), y: deltaY.toFixed(0) }
    });
    
    // Move the main component FIRST
    component.set({
      left: newPos.x,
      top: newPos.y
    });
    component.setCoords();
    
    // For T-Joints, move the associated lines
    if ((component as any).teeLines) {
      (component as any).teeLines.forEach((line: any, index: number) => {
        if (line) {
          console.log(`🔧 Moving T-piece line ${index}:`, {
            type: line.type,
            customType: (line as any).customType,
            oldX1: line.x1?.toFixed(0),
            oldY1: line.y1?.toFixed(0),
            oldX2: line.x2?.toFixed(0),
            oldY2: line.y2?.toFixed(0)
          });
          
          // Move endpoints directly - works for both CustomLine and regular Line
          if (line.type === 'line' || (line as any).customType === 'CustomLine') {
            line.set({
              x1: (line.x1 || 0) + deltaX,
              y1: (line.y1 || 0) + deltaY,
              x2: (line.x2 || 0) + deltaX,
              y2: (line.y2 || 0) + deltaY
            });
            line.setCoords();
            
            console.log(`✅ Line ${index} moved to:`, {
              newX1: line.x1?.toFixed(0),
              newY1: line.y1?.toFixed(0),
              newX2: line.x2?.toFixed(0),
              newY2: line.y2?.toFixed(0)
            });
          }
        }
      });
      
      // Update teeData position
      const teeData = (component as any).teeData;
      if (teeData && teeData.position) {
        teeData.position.x = newPos.x;
        teeData.position.y = newPos.y;
        console.log('✅ Updated teeData position:', teeData.position);
      }
    }
    
    // Update connected pipeline segments if they exist (CRITICAL for T-piece movement)
    const connectedLines = (component as any).connectedLines;
    if (connectedLines && Array.isArray(connectedLines) && connectedLines.length >= 2) {
      console.log('🔗 Updating connected pipeline segments:', connectedLines.length);

      const line1 = connectedLines[0];
      const line2 = connectedLines[1];

      if (line1 && line2) {
        // Calculate gap size based on component type (same logic as creation)
        let gapSize = 40; // Default gap for T-pieces
        if ((component as any).customType === 'gateValveS') gapSize = 20;
        if ((component as any).customType === 'gateValveFL') gapSize = 40;

        const halfGap = gapSize / 2;

        // Get the host line direction from the connected lines themselves
        // Use the vector from line1 start to line2 end
        let dirX = 0, dirY = 0;

        // Get line1 start point
        const line1StartX = line1.x1 || 0;
        const line1StartY = line1.y1 || 0;

        // Get line2 end point
        const line2EndX = line2.x2 || 0;
        const line2EndY = line2.y2 || 0;

        // Calculate direction vector
        dirX = line2EndX - line1StartX;
        dirY = line2EndY - line1StartY;
        const length = Math.sqrt(dirX * dirX + dirY * dirY);

        if (length > 0) {
          // Normalize direction vector
          const unitX = dirX / length;
          const unitY = dirY / length;

          // Update line1: from its current start to (newPos - halfGap)
          const line1EndX = newPos.x - (halfGap * unitX);
          const line1EndY = newPos.y - (halfGap * unitY);

          line1.set({
            x2: line1EndX,
            y2: line1EndY
          });
          line1.setCoords();
          (line1 as any).dirty = true;

          // Update line2: from (newPos + halfGap) to its current end
          const line2StartX = newPos.x + (halfGap * unitX);
          const line2StartY = newPos.y + (halfGap * unitY);

          line2.set({
            x1: line2StartX,
            y1: line2StartY
          });
          line2.setCoords();
          (line2 as any).dirty = true;

          console.log('✅ Updated connected lines:', {
            line1: { start: `(${line1StartX.toFixed(1)}, ${line1StartY.toFixed(1)})`, end: `(${line1EndX.toFixed(1)}, ${line1EndY.toFixed(1)})` },
            line2: { start: `(${line2StartX.toFixed(1)}, ${line2StartY.toFixed(1)})`, end: `(${line2EndX.toFixed(1)}, ${line2EndY.toFixed(1)})` },
            gapSize,
            newComponentPos: { x: newPos.x.toFixed(1), y: newPos.y.toFixed(1) },
            direction: { unitX: unitX.toFixed(3), unitY: unitY.toFixed(3) }
          });
        } else {
          console.log('⚠️ Could not calculate direction for connected lines - zero length');
        }
      }
    }
    
    // Move anchors if they exist
    if ((component as any).anchors) {
      (component as any).anchors.forEach((anchor: any, index: number) => {
        if (anchor) {
          const oldAnchorX = anchor.left || 0;
          const oldAnchorY = anchor.top || 0;
          anchor.set({
            left: oldAnchorX + deltaX,
            top: oldAnchorY + deltaY
          });
          anchor.setCoords();
          console.log(`✅ Anchor ${index} moved from (${oldAnchorX.toFixed(0)}, ${oldAnchorY.toFixed(0)}) to (${anchor.left.toFixed(0)}, ${anchor.top.toFixed(0)})`);
        }
      });
    }
    
    // CRITICAL: Update host pipeline after T-piece movement
    if (this.componentHostLine && this.canvas) {
      console.log('🔧 Updating host pipeline coordinates after T-piece movement');
      const hostLine = this.componentHostLine;
      
      // For CustomLine objects, we need to handle the coordinate update differently
      if ((hostLine as any).customType === 'CustomLine') {
        // CustomLine needs to have its internal coordinates recalculated
        console.log('🔧 Host line is CustomLine - triggering coordinate recalculation');
        
        // Force the line to recalculate its path by calling setCoords
        hostLine.setCoords();
        
        // Ensure the line renders correctly
        (hostLine as any).dirty = true;
        hostLine.set({
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: false // CustomLine handles its own borders
        });
      } else {
        // Standard line - update coordinates normally
        hostLine.setCoords();
        hostLine.set({
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true
        });
      }
      
      console.log('✅ Host pipeline updated and selectable again:', {
        x1: hostLine.x1?.toFixed(0),
        y1: hostLine.y1?.toFixed(0), 
        x2: hostLine.x2?.toFixed(0),
        y2: hostLine.y2?.toFixed(0),
        selectable: hostLine.selectable,
        evented: hostLine.evented,
        customType: (hostLine as any).customType || 'standard'
      });
      
      // Force full canvas re-render to ensure everything is properly updated
      this.canvas.requestRenderAll();
    }
    
    console.log('🎉 Component movement complete!');
  }
  
  private resetComponentHighlight(canvas: fabric.Canvas, component: any): void {
    if (!component) return;
    
    const isTeeJoint = (component as any).customType === 'teeJoint';
    const isValve = component.type === 'group';
    
    if (isTeeJoint && (component as any).teeLines) {
      console.log('🔄 RESETTING T-piece highlight:', (component as any).teeLines.length, 'lines');
      (component as any).teeLines.forEach((line: any, index: number) => {
        if (line && (line as any).originalStroke) {
          const currentStroke = line.stroke;
          const originalStroke = (line as any).originalStroke;
          console.log(`  Line ${index}: ${currentStroke} → ${originalStroke}`);
          line.set('stroke', originalStroke);
          delete (line as any).originalStroke;
        }
      });
    } else if (isValve && component.type === 'group') {
      const groupComponent = component as fabric.Group;
      groupComponent.getObjects().forEach((obj: any) => {
        if ((obj.type === 'line' || obj.type === 'path') && (obj as any).originalStroke) {
          obj.set('stroke', (obj as any).originalStroke);
          delete (obj as any).originalStroke;
        }
      });
    }
  }
}