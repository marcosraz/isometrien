import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { StateManagementService } from './state-management.service';
import { createGateValveSNew, createGateValveFLNew, createTeeJoint } from './piping-valve-helper';
import { LineDrawingService } from './line-drawing.service';

@Injectable({
  providedIn: 'root',
})
export class PipingService {
  private canvas: fabric.Canvas | null = null;
  private stateManagement: StateManagementService | null = null;
  private lineDrawingService: LineDrawingService | null = null;
  private flowMode: boolean = false;
  private gateValveMode: boolean = false;
  private gateValveSMode: boolean = false;
  private gateValveFLMode: boolean = false;
  private globeValveSMode: boolean = false;
  private globeValveFLMode: boolean = false;
  private ballValveSMode: boolean = false;
  private ballValveFLMode: boolean = false;
  private teeJointMode: boolean = false;
  private previewArrow: fabric.Group | null = null;
  private previewValve: fabric.Group | null = null;
  private previewTee: any = null;
  private previewTeeLines: fabric.Object[] = [];
  private previewTeeAnchors: fabric.Circle[] = [];
  private isShiftPressed: boolean = false;
  private isCtrlPressed: boolean = false;
  private hoveredLine: fabric.Line | fabric.Path | null = null;
  private originalLineStroke: string | null = null;
  private hoveredTee: fabric.Rect | null = null;
  private hoveredTeeLines: fabric.Object[] = [];
  private teeOrientation: number = 0; // 0, 1, 2, 3 for 4 different orientations
  private valveOrientation: number = 0; // 0, 1 for 2 different orientations (normal, mirrored)
  private lastMousePosition: { x: number; y: number } | null = null; // Track last mouse position

  constructor() {
    // Listen for keyboard events
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') {
        this.isShiftPressed = true;
      }
      if (e.key === 'Tab' && this.teeJointMode) {
        e.preventDefault(); // Prevent default tab behavior
        this.teeOrientation = (this.teeOrientation + 1) % 4;
        console.log('T-Stück Orientation changed to:', this.teeOrientation);

        // Immediately update preview if we have a last mouse position
        if (this.lastMousePosition && this.canvas) {
          this.updateTeePreview(this.lastMousePosition);
        }
      }
      if (e.key === 'Tab' && (this.gateValveSMode || this.gateValveFLMode || this.globeValveSMode || this.globeValveFLMode || this.ballValveSMode || this.ballValveFLMode)) {
        e.preventDefault(); // Prevent default tab behavior
        this.valveOrientation = (this.valveOrientation + 1) % 2;
        console.log('Valve Orientation changed to:', this.valveOrientation === 0 ? 'Normal' : 'Mirrored');

        // Immediately update preview if we have a last mouse position
        if (this.lastMousePosition && this.canvas) {
          this.updateValvePreview(this.lastMousePosition);
        }
      }
      if (e.key === 'Escape') {
        if (this.flowMode) {
          this.stopFlowMode();
          // Dispatch custom event to notify DrawingService
          window.dispatchEvent(new CustomEvent('exitFlowMode'));
        } else if (this.gateValveMode) {
          this.stopGateValveMode();
          window.dispatchEvent(new CustomEvent('exitGateValveMode'));
        } else if (this.gateValveSMode) {
          this.stopGateValveSMode();
          window.dispatchEvent(new CustomEvent('exitGateValveSMode'));
        } else if (this.gateValveFLMode) {
          this.stopGateValveFLMode();
          window.dispatchEvent(new CustomEvent('exitGateValveFLMode'));
        } else if (this.globeValveSMode) {
          this.stopGlobeValveSMode();
          window.dispatchEvent(new CustomEvent('exitGlobeValveSMode'));
        } else if (this.globeValveFLMode) {
          this.stopGlobeValveFLMode();
          window.dispatchEvent(new CustomEvent('exitGlobeValveFLMode'));
        } else if (this.ballValveSMode) {
          this.stopBallValveSMode();
          window.dispatchEvent(new CustomEvent('exitBallValveSMode'));
        } else if (this.ballValveFLMode) {
          this.stopBallValveFLMode();
          window.dispatchEvent(new CustomEvent('exitBallValveFLMode'));
        } else if (this.teeJointMode) {
          this.stopTeeJointMode();
          window.dispatchEvent(new CustomEvent('exitTeeJointMode'));
        }
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
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Control') {
        this.isCtrlPressed = true;
      }
    });
  }

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }

  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }

  public startFlowMode(): void {
    this.flowMode = true;
  }

  public stopFlowMode(): void {
    this.flowMode = false;
    this.cleanupPreview();
    this.resetLineHighlight();
    this.resetTeeHighlight();
  }

  public isFlowModeActive(): boolean {
    return this.flowMode;
  }
  
  public setLineDrawingService(lineDrawingService: LineDrawingService): void {
    this.lineDrawingService = lineDrawingService;
  }

  public startGateValveMode(): void {
    this.gateValveMode = true;
  }

  public stopGateValveMode(): void {
    this.gateValveMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isGateValveModeActive(): boolean {
    return this.gateValveMode;
  }

  public startGateValveSMode(): void {
    this.gateValveSMode = true;
  }

  public stopGateValveSMode(): void {
    this.gateValveSMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isGateValveSModeActive(): boolean {
    return this.gateValveSMode;
  }

  public startGateValveFLMode(): void {
    this.gateValveFLMode = true;
  }

  public stopGateValveFLMode(): void {
    this.gateValveFLMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isGateValveFLModeActive(): boolean {
    return this.gateValveFLMode;
  }

  public startGlobeValveSMode(): void {
    this.globeValveSMode = true;
  }

  public stopGlobeValveSMode(): void {
    this.globeValveSMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isGlobeValveSModeActive(): boolean {
    return this.globeValveSMode;
  }

  public startGlobeValveFLMode(): void {
    this.globeValveFLMode = true;
  }

  public stopGlobeValveFLMode(): void {
    this.globeValveFLMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isGlobeValveFLModeActive(): boolean {
    return this.globeValveFLMode;
  }

  public startBallValveSMode(): void {
    this.ballValveSMode = true;
  }

  public stopBallValveSMode(): void {
    this.ballValveSMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isBallValveSModeActive(): boolean {
    return this.ballValveSMode;
  }

  public startBallValveFLMode(): void {
    this.ballValveFLMode = true;
  }

  public stopBallValveFLMode(): void {
    this.ballValveFLMode = false;
    this.cleanupValvePreview();
    this.resetLineHighlight();
  }

  public isBallValveFLModeActive(): boolean {
    return this.ballValveFLMode;
  }

  public isActive(): boolean {
    return this.flowMode || this.gateValveMode || this.gateValveSMode || this.gateValveFLMode || this.globeValveSMode || this.globeValveFLMode || this.ballValveSMode || this.ballValveFLMode || this.teeJointMode;
  }
  
  public startTeeJointMode(): void {
    this.teeJointMode = true;
  }
  
  public stopTeeJointMode(): void {
    this.teeJointMode = false;
    this.cleanupTeePreview();
    this.resetLineHighlight();
    this.resetTeeHighlight();
  }
  
  public isTeeJointModeActive(): boolean {
    return this.teeJointMode;
  }

  private cleanupPreview(): void {
    if (this.previewArrow && this.canvas) {
      this.canvas.remove(this.previewArrow);
      this.previewArrow = null;
    }
  }

  private cleanupValvePreview(): void {
    if (this.previewValve && this.canvas) {
      this.canvas.remove(this.previewValve);
      this.previewValve = null;
    }
  }
  
  private cleanupTeePreview(): void {
    if (this.canvas) {
      // Remove preview lines
      this.previewTeeLines.forEach(line => {
        this.canvas!.remove(line);
      });
      this.previewTeeLines = [];
      
      // Remove preview anchors
      this.previewTeeAnchors.forEach(anchor => {
        this.canvas!.remove(anchor);
      });
      this.previewTeeAnchors = [];
      
      // Remove preview selection rect if exists
      if (this.previewTee) {
        this.canvas.remove(this.previewTee);
        this.previewTee = null;
      }
    }
  }

  private resetLineHighlight(): void {
    if (this.hoveredLine && this.originalLineStroke !== null) {
      this.hoveredLine.set('stroke', this.originalLineStroke);
      this.hoveredLine = null;
      this.originalLineStroke = null;
      this.canvas?.requestRenderAll();
    }
  }

  private handleTeeHover(pointer: { x: number; y: number }): void {
    if (!this.canvas) return;

    // Finde alle T-Stück-Objekte in der Nähe der Maus
    const teeObjects = this.canvas.getObjects().filter(obj => 
      (obj as any).customType === 'teeJoint'
    );

    let hoveredTee = null;
    let minDistance = Infinity;

    // Prüfe jeden T-Stück für Hover
    for (const teeObj of teeObjects) {
      const teeRect = teeObj as fabric.Rect;
      const bounds = teeRect.getBoundingRect();
      
      // Erweitere den Hover-Bereich um das T-Stück
      const expandedBounds = {
        left: bounds.left - 10,
        top: bounds.top - 10,
        width: bounds.width + 20,
        height: bounds.height + 20
      };

      // Prüfe, ob die Maus über dem erweiterten Bereich ist
      if (pointer.x >= expandedBounds.left && 
          pointer.x <= expandedBounds.left + expandedBounds.width &&
          pointer.y >= expandedBounds.top && 
          pointer.y <= expandedBounds.top + expandedBounds.height) {
        
        // Berechne die Distanz zur Mitte des T-Stücks
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;
        const distance = Math.sqrt((pointer.x - centerX) ** 2 + (pointer.y - centerY) ** 2);
        
        if (distance < minDistance) {
          hoveredTee = teeRect;
          minDistance = distance;
        }
      }
    }

    // Reset previous T-Stück highlight
    if (this.hoveredTee && this.hoveredTee !== hoveredTee) {
      this.resetTeeHighlight();
    }

    // Highlight neues T-Stück
    if (hoveredTee && hoveredTee !== this.hoveredTee) {
      this.hoveredTee = hoveredTee;
      this.highlightTee(hoveredTee);
    } else if (!hoveredTee && this.hoveredTee) {
      this.resetTeeHighlight();
    }
  }

  private highlightTee(teeRect: fabric.Rect): void {
    if (!this.canvas || !teeRect) return;

    // Hole die T-Stück Linien
    const teeLines = (teeRect as any).teeLines || [];
    this.hoveredTeeLines = [];

    // Highlight alle T-Stück Linien in grün
    teeLines.forEach((line: any) => {
      if (line && typeof line.set === 'function') {
        // Speichere die originale Farbe falls noch nicht gespeichert
        if (!(line as any).originalStroke) {
          (line as any).originalStroke = line.stroke;
        }
        line.set('stroke', '#4CAF50'); // Grüne Hover-Farbe
        this.hoveredTeeLines.push(line);
      }
    });

    // Mache das Selektions-Rechteck leicht sichtbar
    teeRect.set({
      fill: 'rgba(76, 175, 80, 0.2)', // Leicht grüner Hintergrund
      stroke: '#4CAF50',
      strokeWidth: 2,
      opacity: 0.3
    });

    this.canvas.requestRenderAll();
  }

  private resetTeeHighlight(): void {
    if (!this.canvas || !this.hoveredTee) return;

    // Reset T-Stück Linien zu ihrer ursprünglichen Farbe
    this.hoveredTeeLines.forEach((line: any) => {
      if (line && typeof line.set === 'function' && (line as any).originalStroke) {
        line.set('stroke', (line as any).originalStroke);
      }
    });

    // Reset das Selektions-Rechteck
    this.hoveredTee.set({
      fill: 'transparent',
      stroke: 'transparent',
      strokeWidth: 0,
      opacity: 0.1
    });

    this.hoveredTee = null;
    this.hoveredTeeLines = [];
    this.canvas.requestRenderAll();
  }

  private findNearestLine(point: { x: number; y: number }): { line: fabric.Line | fabric.Path; closestPoint: { x: number; y: number }; distance: number } | null {
    if (!this.canvas) return null;
    
    let closestLine: fabric.Line | fabric.Path | null = null;
    let minDistance = Infinity;
    let closestPoint = { x: 0, y: 0 };
    
    // DEBUGGING: Log all lines found on canvas for analysis
    console.log('🔍 DEBUGGING: findNearestLine called at point:', point);
    console.log('🔍 Total objects on canvas:', this.canvas.getObjects().length);
    
    let lineCount = 0;
    this.canvas.getObjects().forEach(obj => {
      if (obj.type === 'line' || obj.type === 'path') {
        lineCount++;
      }
    });
    console.log('🔍 Total lines/paths found:', lineCount);
    
    // Sammle zuerst alle validen Linien und deren Punkte
    const candidateLines: Array<{
      line: fabric.Line | fabric.Path;
      closestPoint: { x: number; y: number };
      distance: number;
      originalDistance: number;
      isSelectable: boolean;
      isMainPipeLine: boolean;
      hasMouseEvents: boolean;
      debugInfo: any;
    }> = [];
    
    this.canvas.getObjects().forEach(obj => {
      if (obj.type === 'line' || obj.type === 'path') {
        const line = obj as fabric.Line | fabric.Path;
        
        // Skip dimension lines and other non-pipe/line elements
        if ((line as any).isDimensionPart) return;
        
        // REFINED BLACKLIST: Nur spezifische problematische Linien ausschließen
        const stroke = line.stroke as string;
        
        // 1. GRÜNE AUSWAHL-HIGHLIGHTS (nur helle/neon grüne)
        if (stroke && (stroke === '#00ff00' || stroke === '#00FF00' || stroke.toLowerCase() === 'lime')) {
          return; // Skip bright green selection lines
        }
        
        // 2. SEHR TRANSPARENTE PREVIEW LINIEN  
        if (line.opacity !== undefined && line.opacity < 0.3) {
          return; // Skip very transparent temporary lines
        }
        
        // 3. NUR SELECTION-HELPER LINIEN (sehr spezifisch)
        if (line.selectable && line.evented && line.hasControls && 
            (line.strokeWidth && line.strokeWidth > 4)) {
          return; // Skip thick interactive selection helpers only
        }
        
        // Klassifiziere Linien für bessere Auswahl
        const isSelectable = line.selectable === true || line.evented === true;
        
        // Zusätzliche Kriterien für problematische Linien
        const hasMouseEvents = line.hasControls || line.hasBorders;
        const isHighlighted = (line.stroke as string) === '#00ff00' || (line.strokeWidth && line.strokeWidth > 3);
        const isTemporary = line.opacity !== undefined && line.opacity < 1.0;
        
        // Erkenne echte Pipe-Linien vs. Auswahl-/Highlight-Linien
        const isPipeColor = (line.stroke as string) === '#000000' || (line.stroke as string) === 'black' || !line.stroke;
        const isMainPipeLine = isPipeColor && !isHighlighted && !isTemporary && line.strokeWidth <= 2;
        
        let point1, point2;
        
        if (line.type === 'line') {
          const l = line as fabric.Line;
          point1 = { x: l.x1!, y: l.y1! };
          point2 = { x: l.x2!, y: l.y2! };
        } else {
          // For paths, use bounding box corners as approximation
          const bounds = line.getBoundingRect();
          point1 = { x: bounds.left, y: bounds.top };
          point2 = { x: bounds.left + bounds.width, y: bounds.top + bounds.height };
        }
        
        // Calculate closest point on line segment
        const cp = this.getClosestPointOnLineSegment(point, point1, point2);
        const dist = this.getDistance(point, cp);
        
        if (dist < 50) { // 50px threshold for snapping
          // DEBUGGING: Log detailed info about each candidate line
          const stroke = line.stroke as string;
          const debugInfo = {
            type: line.type,
            stroke: stroke,
            strokeWidth: line.strokeWidth,
            opacity: line.opacity,
            selectable: line.selectable,
            evented: line.evented,
            hasControls: line.hasControls,
            hasBorders: line.hasBorders,
            visible: line.visible,
            left: line.left,
            top: line.top,
            width: line.width,
            height: line.height,
            propertyCount: Object.keys(line).length,
            customProperties: Object.keys(line).filter(key => key.startsWith('custom') || key.includes('selection') || key.includes('highlight')),
            allProperties: Object.keys(line),
            distance: dist
          };
          
          console.log(`🔍 Candidate line ${candidateLines.length + 1}:`, debugInfo);
          
          // DRASTISCHE DISTANCE-MANIPULATION: Echte Pipe-Linien bekommen künstlichen Vorteil
          let adjustedDistance = dist;
          
          // Erkenne echte Pipe-Linien noch strikter
          const isRealPipeLine = (
            (stroke === '#000000' || stroke === 'black' || stroke === '#000' || !stroke) &&
            (!line.strokeWidth || line.strokeWidth <= 2) &&
            !line.selectable && !line.evented &&
            !line.hasControls && !line.hasBorders &&
            (!line.opacity || line.opacity === 1.0)
          );
          
          if (isRealPipeLine) {
            // Echte Pipe-Linien bekommen 50% Distanz-Bonus (werden bevorzugt)
            adjustedDistance = dist * 0.5;
          } else if (isSelectable || hasMouseEvents) {
            // Selectable Linien bekommen 200% Distanz-Strafe (werden benachteiligt)  
            adjustedDistance = dist * 2.0;
          } else if (stroke === '#00ff00' || (line.strokeWidth && line.strokeWidth > 3)) {
            // Offensichtliche Highlight-Linien bekommen massive Strafe
            adjustedDistance = dist * 10.0;
          }
          
          candidateLines.push({
            line: line,
            closestPoint: cp,
            distance: adjustedDistance, // Verwende die manipulierte Distanz
            originalDistance: dist,     // Behalte die echte Distanz für den Rückgabewert
            isSelectable: isSelectable,
            isMainPipeLine: isMainPipeLine,
            hasMouseEvents: hasMouseEvents,
            debugInfo: debugInfo
          });
        }
      }
    });
    
    // Wenn wir mehrere Kandidaten haben, wähle die nächste Linie,
    // aber vermeide parallele Linien die durch frühere Ventile/T-Stücke entstanden sind
    if (candidateLines.length > 0) {
      // SPEZIELLER FIX FÜR SCHRÄGE LINIEN
      // Bei schrägen Linien sind Auswahllinien und echte Linien oft sehr nah beieinander
      
      // Schritt 1: ULTRA-STRIKTE Kriterien für echte Pipe-Linien
      // Besonders wichtig bei schrägen Linien wo Auswahllinien sehr nah sind
      const strictMainPipeLines = candidateLines.filter(c => {
        const line = c.line;
        const stroke = line.stroke as string;
        
        // KORRIGIERTE Kriterien für echte Pipe-Linien basierend auf Debug-Daten
        // Echte Pipe-Linien haben oft grüne Farben wie '#4CAF50', nicht schwarz!
        const isPipeStroke = stroke === '#4CAF50' || stroke === 'rgba(102, 153, 255, 0.75)' || 
                           stroke === '#000000' || stroke === 'black' || stroke === '#000' || !stroke || stroke === 'rgba(0,0,0,1)';
        const hasNormalWidth = !line.strokeWidth || line.strokeWidth <= 3; // Erweitert auf 3px
        const notHighlightGreen = stroke !== '#00ff00' && stroke !== 'green' && stroke !== 'rgb(0,255,0)' && stroke !== 'lime';
        
        // KRITISCHE KORREKTUR: Echte Pipe-Linien können selectable sein!
        // Wir unterscheiden zwischen echten Pipes und Auswahllinien anhand der Farbe
        const isRealPipe = (stroke === '#4CAF50' || stroke === 'rgba(102, 153, 255, 0.75)') && line.selectable === true;
        const isNonSelectableValidPipe = !line.selectable && (stroke === '#000000' || stroke === 'black' || stroke === '#000' || !stroke);
        const isValidPipeLine = isRealPipe || isNonSelectableValidPipe;
        
        const isOpaque = !line.opacity || line.opacity >= 0.75; // Erweitert für semi-transparente echte Linien
        const noSpecialProps = !(line as any).isSelectionHelper && !(line as any).isHighlight;
        
        // Ausschließen von reinen Auswahllinien (grün + selectable ohne Pipe-Farbe)
        const notPureSelectionLine = !(stroke === 'green' && line.selectable === true);
        
        console.log(`🔍 Checking REVISED strict criteria for line with stroke: ${stroke}, selectable: ${line.selectable}`, {
          isPipeStroke, hasNormalWidth, notHighlightGreen, isRealPipe, isNonSelectableValidPipe, isValidPipeLine, isOpaque, noSpecialProps, notPureSelectionLine
        });
        
        return isPipeStroke && hasNormalWidth && notHighlightGreen && isValidPipeLine && isOpaque && noSpecialProps && notPureSelectionLine;
      });
      
      // STRIKTE REGEL: Falls wir echte Pipe-Linien haben, akzeptiere NUR diese!
      if (strictMainPipeLines.length > 0) {
        console.log('🔍 STRICT PIPE LINES FOUND:', strictMainPipeLines.length);
        strictMainPipeLines.forEach((line, index) => {
          console.log(`🔍 Strict line ${index + 1}:`, line.debugInfo);
        });
        
        strictMainPipeLines.sort((a, b) => a.distance - b.distance);
        // Verwende AUSSCHLIESSLICH echte Pipe-Linien - ignoriere alle anderen
        const bestStrictLine = strictMainPipeLines[0];
        console.log('🎯 SELECTED STRICT LINE:', bestStrictLine.debugInfo);
        
        return {
          line: bestStrictLine.line,
          closestPoint: bestStrictLine.closestPoint,
          distance: bestStrictLine.originalDistance // Verwende echte Distanz für Rückgabe
        };
      } else {
        console.log('⚠️ NO STRICT PIPE LINES FOUND! Falling back to regular selection.');
        console.log('🔍 All candidate lines:', candidateLines.length);
        candidateLines.forEach((line, index) => {
          console.log(`🔍 Fallback line ${index + 1}:`, line.debugInfo);
        });
      }
      
      // Schritt 2: Standard-Prioritätssystem
      const mainPipeLines = candidateLines.filter(c => c.isMainPipeLine);
      const nonSelectableLines = candidateLines.filter(c => !c.isSelectable && !c.hasMouseEvents);
      
      // Schritt 3: Standard-Fallback falls keine strikten Pipe-Linien gefunden
      // (Dieser Code wird nur erreicht wenn KEINE strikten Pipe-Linien vorhanden sind)
      let workingSet;
      if (mainPipeLines.length > 0) {
        workingSet = mainPipeLines;
        // console.log('Using main pipe lines:', mainPipeLines.length);
      } else if (nonSelectableLines.length > 0) {
        workingSet = nonSelectableLines;
        // console.log('Using non-selectable lines:', nonSelectableLines.length);
      } else {
        workingSet = candidateLines;
        // console.log('Using all candidate lines:', candidateLines.length);
      }
      
      // Sortiere nach Distanz
      workingSet.sort((a, b) => a.distance - b.distance);
      
      // Wähle die nächste Linie aus dem working set
      const best = workingSet[0];
      
      // Wenn es sehr nahe parallele Linien gibt (typisch für geteilte Linien),
      // prüfe ob eine davon die "Original-Linie" ist
      if (workingSet.length > 1) {
        const threshold = 5; // Pixel Toleranz für parallele Linien
        const parallelCandidates = workingSet.filter(c => 
          Math.abs(c.distance - best.distance) < threshold
        );
        
        if (parallelCandidates.length > 1) {
          // Bevorzuge Linien die NICHT als Split-Segment markiert sind
          const nonSplitLine = parallelCandidates.find(c => 
            !(c.line as any).isSplitPipeSegment
          );
          
          if (nonSplitLine) {
            return {
              line: nonSplitLine.line,
              closestPoint: nonSplitLine.closestPoint,
              distance: nonSplitLine.originalDistance || nonSplitLine.distance // Verwende echte Distanz wenn verfügbar
            };
          }
        }
      }
      
      console.log('🎯 FINAL SELECTION (fallback):', best.debugInfo);
      return {
        line: best.line,
        closestPoint: best.closestPoint,
        distance: best.originalDistance || best.distance // Verwende echte Distanz wenn verfügbar
      };
    }
    
    return null;
  }

  private getClosestPointOnLineSegment(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): { x: number; y: number } {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
      return lineStart;
    }
    
    const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lengthSquared));
    
    return {
      x: lineStart.x + t * dx,
      y: lineStart.y + t * dy
    };
  }

  private getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private calculateAngle(line: fabric.Line | fabric.Path): number {
    if (line.type === 'line') {
      const l = line as fabric.Line;
      return Math.atan2(l.y2! - l.y1!, l.x2! - l.x1!) * 180 / Math.PI;
    } else {
      // For paths, use the angle property or default
      return line.angle || 0;
    }
  }

  private createFlowArrow(x: number, y: number, angle: number): fabric.Group {
    // Create filled triangle arrow with tip at origin (0,0)
    const arrow = new fabric.Polygon([
      { x: -20, y: -8 },  // Back left
      { x: 0, y: 0 },     // Tip (at origin)
      { x: -20, y: 8 },   // Back right
      { x: -15, y: 0 }    // Back center
    ], {
      fill: '#2196F3',
      stroke: '#1976D2',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center'
    });
    
    const group = new fabric.Group([arrow], {
      left: x,
      top: y,
      angle: angle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      lockScalingX: true,
      lockScalingY: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'flowArrow';
    
    return group;
  }

  private createGateValveS(x: number, y: number, angle: number, mirrored: boolean = false): fabric.Group {
    // Create gate valve S variant (two triangles meeting at their tips)
    // Normalize the line angle
    const normalizedAngle = ((angle % 360) + 360) % 360;
    
    let triangle1, triangle2;
    let valveAngle = angle;
    
    // Check if this is a vertical line (around 90° or 270°)
    if ((normalizedAngle >= 80 && normalizedAngle <= 100) || 
        (normalizedAngle >= 260 && normalizedAngle <= 280)) {
      // For vertical lines, create triangles pointing at 120° and 240° (isometric diagonal)
      // Like in the reference image where green lines show the valve orientation
      
      if (!mirrored) {
        // Normal orientation - First triangle pointing toward upper-left (120°)
        triangle1 = new fabric.Polygon([
          { x: -12, y: -20 },   // Upper left vertex (größer)
          { x: -12, y: -3 },    // Lower left vertex  
          { x: 0, y: 0 },      // Tip at center
        ], {
          fill: 'white',  // Weiß um die Linie zu verdecken
          stroke: 'black',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center'
        });
        
        // Second triangle pointing toward lower-right (240°)
        triangle2 = new fabric.Polygon([
          { x: 12, y: 20 },     // Lower right vertex (größer)
          { x: 12, y: 3 },      // Upper right vertex
          { x: 0, y: 0 },      // Tip at center
        ], {
          fill: 'white',  // Weiß um die Linie zu verdecken
          stroke: 'black',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center'
        });
        
        valveAngle = 0;  // Adjusted from 45° by -45° total for better visual alignment
      } else {
        // Mirrored orientation (Ctrl pressed) - swap the triangles
        triangle1 = new fabric.Polygon([
          { x: 12, y: -20 },    // Upper right vertex (größer)
          { x: 12, y: -3 },     // Lower right vertex
          { x: 0, y: 0 },      // Tip at center
        ], {
          fill: 'white',  // Weiß um die Linie zu verdecken
          stroke: 'black',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center'
        });
        
        triangle2 = new fabric.Polygon([
          { x: -12, y: 20 },    // Lower left vertex (größer)
          { x: -12, y: 3 },     // Upper left vertex
          { x: 0, y: 0 },      // Tip at center
        ], {
          fill: 'white',  // Weiß um die Linie zu verdecken
          stroke: 'black',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center'
        });
        
        valveAngle = 90;  // Adjusted from 135° by -45° total for better visual alignment (mirrored version)
      }
    } else if ((normalizedAngle >= 20 && normalizedAngle <= 40) || 
               (normalizedAngle >= 200 && normalizedAngle <= 220)) {
      // For 30° and 210° lines (isometric horizontal)
      // Triangles should point at 60° and 240° angles
      
      triangle1 = new fabric.Polygon([
        { x: -12, y: 20 },    // Lower left vertex (größer)
        { x: -12, y: 3 },     // Upper left vertex
        { x: 0, y: 0 },      // Tip at center
      ], {
        fill: 'transparent',  // Transparent statt weiß
        stroke: 'black',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
      
      triangle2 = new fabric.Polygon([
        { x: 12, y: -20 },    // Upper right vertex (größer)
        { x: 12, y: -3 },     // Lower right vertex
        { x: 0, y: 0 },      // Tip at center
      ], {
        fill: 'transparent',  // Transparent statt weiß
        stroke: 'black',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
      
      valveAngle = 0;
    } else if ((normalizedAngle >= 140 && normalizedAngle <= 160) || 
               (normalizedAngle >= 320 && normalizedAngle <= 340)) {
      // For 150° and 330° lines (isometric opposite horizontal)
      // Standard horizontal triangles
      
      triangle1 = new fabric.Polygon([
        { x: -20, y: -12 },  // Left top (größer)
        { x: -20, y: 12 },   // Left bottom
        { x: 0, y: 0 },      // Right point (tip touching center)
      ], {
        fill: 'transparent',  // Transparent statt weiß
        stroke: 'black',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
      
      triangle2 = new fabric.Polygon([
        { x: 20, y: -12 },   // Right top (größer)
        { x: 20, y: 12 },    // Right bottom
        { x: 0, y: 0 },      // Left point (tip touching center)
      ], {
        fill: 'transparent',  // Transparent statt weiß
        stroke: 'black',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
      
      valveAngle = 0;
    } else {
      // For all other angles, use standard configuration aligned with line
      triangle1 = new fabric.Polygon([
        { x: -20, y: -12 },  // Left top (größer)
        { x: -20, y: 12 },   // Left bottom
        { x: 0, y: 0 },      // Right point (tip touching center)
      ], {
        fill: 'transparent',  // Transparent statt weiß
        stroke: 'black',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
      
      triangle2 = new fabric.Polygon([
        { x: 20, y: -12 },   // Right top (größer)
        { x: 20, y: 12 },    // Right bottom
        { x: 0, y: 0 },      // Left point (tip touching center)
      ], {
        fill: 'transparent',  // Transparent statt weiß
        stroke: 'black',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center'
      });
    }
    
    // Create small anchor points at the outer edges where triangles meet the line
    let anchorRadius = 3; // Slightly bigger for better visibility
    let anchorOpacity = 0.5; // More visible
    
    // Calculate anchor positions - where the outer edges of triangles cross the line
    let anchor1X, anchor1Y, anchor2X, anchor2Y;
    
    if ((normalizedAngle >= 80 && normalizedAngle <= 100) || 
        (normalizedAngle >= 260 && normalizedAngle <= 280)) {
      // Vertical lines - anchors where the outer triangle edges cross the vertical line
      // For 45° rotated triangles, the outer edge crosses much closer to center
      const distance = 8; // Distance from center to where triangle outer edge crosses the vertical line
      
      if (!mirrored) {
        // Normal orientation - anchors above and below on the line
        anchor1X = 0;  // On the vertical line
        anchor1Y = -distance;  // Above, where top triangle's outer edge crosses
        anchor2X = 0;  // On the vertical line
        anchor2Y = distance;   // Below, where bottom triangle's outer edge crosses
      } else {
        // Mirrored (135° rotation) - same positions on vertical line
        anchor1X = 0;  // On the vertical line
        anchor1Y = -distance;  // Above
        anchor2X = 0;  // On the vertical line
        anchor2Y = distance;   // Below
      }
    } else if ((normalizedAngle >= 20 && normalizedAngle <= 40) || 
               (normalizedAngle >= 200 && normalizedAngle <= 220)) {
      // 30° and 210° lines - different triangle configuration
      const distance = 14; // Distance for isometric horizontal lines
      // For these angles, the anchors are at different positions
      anchor1X = -distance;  // Left on the line
      anchor1Y = 0;
      anchor2X = distance;   // Right on the line
      anchor2Y = 0;
    } else if ((normalizedAngle >= 140 && normalizedAngle <= 160) || 
               (normalizedAngle >= 320 && normalizedAngle <= 340)) {
      // 150° and 330° lines
      const distance = 20; // For horizontal triangles
      anchor1X = -distance;  // Left on the line
      anchor1Y = 0;
      anchor2X = distance;   // Right on the line
      anchor2Y = 0;
    } else {
      // Other angles - standard horizontal configuration
      const distance = 20; // Distance from center for horizontal triangles
      anchor1X = -distance;  // Left on the line
      anchor1Y = 0;
      anchor2X = distance;   // Right on the line
      anchor2Y = 0;
    }
    
    const anchor1 = new fabric.Circle({
      left: anchor1X,
      top: anchor1Y,
      radius: anchorRadius,
      fill: 'blue',
      stroke: 'darkblue',
      strokeWidth: 1,
      opacity: anchorOpacity,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    } as any);
    (anchor1 as any).customType = 'anchorPoint';
    (anchor1 as any).isAnchor = true;
    
    const anchor2 = new fabric.Circle({
      left: anchor2X,
      top: anchor2Y,
      radius: anchorRadius,
      fill: 'blue',
      stroke: 'darkblue',
      strokeWidth: 1,
      opacity: anchorOpacity,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    } as any);
    (anchor2 as any).customType = 'anchorPoint';
    (anchor2 as any).isAnchor = true;
    
    const group = new fabric.Group([triangle1, triangle2], {
      left: x,
      top: y,
      angle: valveAngle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'gateValveS';
    (group as any).valveData = {
      position: { x, y },
      angle: angle,
      type: 'gateS'
    };
    (group as any).anchors = [anchor1, anchor2];  // Store references to anchors
    
    return group;
  }

  private createGateValveFL(x: number, y: number, angle: number): fabric.Group {
    // Create gate valve FL variant (two triangles with vertical lines on sides)
    // Add white rectangle background to hide the line
    const background = new fabric.Rect({
      width: 40,
      height: 20,
      fill: 'white',
      stroke: null,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle1 = new fabric.Polygon([
      { x: -15, y: -10 },  // Left top
      { x: -15, y: 10 },   // Left bottom
      { x: 0, y: 0 },      // Right point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle2 = new fabric.Polygon([
      { x: 15, y: -10 },   // Right top
      { x: 15, y: 10 },    // Right bottom
      { x: 0, y: 0 },      // Left point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    // Add vertical lines on the sides (flanges)
    const leftLine = new fabric.Line([-20, -10, -20, 10], {
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const rightLine = new fabric.Line([20, -10, 20, 10], {
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const group = new fabric.Group([background, triangle1, triangle2, leftLine, rightLine], {
      left: x,
      top: y,
      angle: angle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'gateValveFL';
    (group as any).valveData = {
      position: { x, y },
      angle: angle,
      type: 'gateFL'
    };
    
    return group;
  }

  private createGlobeValveS(x: number, y: number, angle: number): fabric.Group {
    // Create globe valve S variant (same as gate valve but with black dot in center)
    // Add white rectangle background to hide the line
    const background = new fabric.Rect({
      width: 30,
      height: 20,
      fill: 'white',
      stroke: null,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle1 = new fabric.Polygon([
      { x: -15, y: -10 },  // Left top
      { x: -15, y: 10 },   // Left bottom
      { x: 0, y: 0 },      // Right point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle2 = new fabric.Polygon([
      { x: 15, y: -10 },   // Right top
      { x: 15, y: 10 },    // Right bottom
      { x: 0, y: 0 },      // Left point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    // Add black dot in the center where triangles meet
    const centerDot = new fabric.Circle({
      radius: 3,
      fill: 'black',
      stroke: 'black',
      strokeWidth: 1,
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center'
    });
    
    const group = new fabric.Group([background, triangle1, triangle2, centerDot], {
      left: x,
      top: y,
      angle: angle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'globeValveS';
    (group as any).valveData = {
      position: { x, y },
      angle: angle,
      type: 'globeS'
    };
    
    return group;
  }

  private createGlobeValveFL(x: number, y: number, angle: number): fabric.Group {
    // Create globe valve FL variant (same as gate valve FL but with black dot in center)
    // Add white rectangle background to hide the line
    const background = new fabric.Rect({
      width: 40,
      height: 20,
      fill: 'white',
      stroke: null,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle1 = new fabric.Polygon([
      { x: -15, y: -10 },  // Left top
      { x: -15, y: 10 },   // Left bottom
      { x: 0, y: 0 },      // Right point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle2 = new fabric.Polygon([
      { x: 15, y: -10 },   // Right top
      { x: 15, y: 10 },    // Right bottom
      { x: 0, y: 0 },      // Left point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    // Add black dot in the center where triangles meet
    const centerDot = new fabric.Circle({
      radius: 3,
      fill: 'black',
      stroke: 'black',
      strokeWidth: 1,
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center'
    });
    
    // Add vertical lines on the sides (flanges)
    const leftLine = new fabric.Line([-20, -10, -20, 10], {
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const rightLine = new fabric.Line([20, -10, 20, 10], {
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const group = new fabric.Group([background, triangle1, triangle2, centerDot, leftLine, rightLine], {
      left: x,
      top: y,
      angle: angle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'globeValveFL';
    (group as any).valveData = {
      position: { x, y },
      angle: angle,
      type: 'globeFL'
    };
    
    return group;
  }

  private createBallValveS(x: number, y: number, angle: number): fabric.Group {
    // Create ball valve S variant (same as gate valve but with empty circle in center)
    // Add white rectangle background to hide the line
    const background = new fabric.Rect({
      width: 30,
      height: 20,
      fill: 'white',
      stroke: null,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle1 = new fabric.Polygon([
      { x: -15, y: -10 },  // Left top
      { x: -15, y: 10 },   // Left bottom
      { x: 0, y: 0 },      // Right point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle2 = new fabric.Polygon([
      { x: 15, y: -10 },   // Right top
      { x: 15, y: 10 },    // Right bottom
      { x: 0, y: 0 },      // Left point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    // Add empty circle (only outline) in the center where triangles meet
    const centerCircle = new fabric.Circle({
      radius: 4,
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center'
    });
    
    const group = new fabric.Group([background, triangle1, triangle2, centerCircle], {
      left: x,
      top: y,
      angle: angle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'ballValveS';
    (group as any).valveData = {
      position: { x, y },
      angle: angle,
      type: 'ballS'
    };
    
    return group;
  }

  private createBallValveFL(x: number, y: number, angle: number): fabric.Group {
    // Create ball valve FL variant (same as gate valve FL but with empty circle in center)
    // Add white rectangle background to hide the line
    const background = new fabric.Rect({
      width: 40,
      height: 20,
      fill: 'white',
      stroke: null,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle1 = new fabric.Polygon([
      { x: -15, y: -10 },  // Left top
      { x: -15, y: 10 },   // Left bottom
      { x: 0, y: 0 },      // Right point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const triangle2 = new fabric.Polygon([
      { x: 15, y: -10 },   // Right top
      { x: 15, y: 10 },    // Right bottom
      { x: 0, y: 0 },      // Left point (tip touching center)
    ], {
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    // Add empty circle (only outline) in the center where triangles meet
    const centerCircle = new fabric.Circle({
      radius: 4,
      fill: 'white',
      stroke: 'black',
      strokeWidth: 2,
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center'
    });
    
    // Add vertical lines on the sides (flanges)
    const leftLine = new fabric.Line([-20, -10, -20, 10], {
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const rightLine = new fabric.Line([20, -10, 20, 10], {
      stroke: 'black',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center'
    });
    
    const group = new fabric.Group([background, triangle1, triangle2, centerCircle, leftLine, rightLine], {
      left: x,
      top: y,
      angle: angle,
      selectable: true,
      hasControls: true,
      hasBorders: true,
      originX: 'center',
      originY: 'center'
    });
    
    (group as any).customType = 'ballValveFL';
    (group as any).valveData = {
      position: { x, y },
      angle: angle,
      type: 'ballFL'
    };
    
    return group;
  }

  private updateTeePreview(pointer: { x: number; y: number }): void {
    if (!this.canvas) return;

    const threshold = this.isShiftPressed ? 100 : 50;
    const nearest = this.findNearestLine(pointer);

    if (nearest && nearest.distance < threshold) {
      const angle = this.calculateAngle(nearest.line);

      // Clean up old preview
      this.cleanupTeePreview();

      // Create new preview
      const teeJoint = createTeeJoint(
        nearest.closestPoint.x,
        nearest.closestPoint.y,
        angle,
        this.teeOrientation  // Use current orientation
      );

      if (teeJoint) {
        // Store the selection rect for cleanup
        this.previewTee = teeJoint;

        // Add preview lines with reduced opacity
        const lines = (teeJoint as any).lines;
        if (lines) {
          lines.forEach((line: any) => {
            line.set({
              opacity: 0.5,
              selectable: false,
              evented: false
            });
            this.canvas!.add(line);
            this.previewTeeLines.push(line);
          });
        }

        // Add preview anchors with reduced opacity
        const anchors = (teeJoint as any).anchors;
        if (anchors) {
          anchors.forEach((anchor: fabric.Circle) => {
            anchor.set({
              opacity: 0.5,
              selectable: false,
              evented: false
            });
            this.canvas!.add(anchor);
            this.previewTeeAnchors.push(anchor);
          });
        }
      }

      this.canvas.requestRenderAll();
    }
  }

  private updateValvePreview(pointer: { x: number; y: number }): void {
    if (!this.canvas) return;

    const threshold = this.isShiftPressed ? 100 : 50;
    const nearest = this.findNearestLine(pointer);

    if (nearest && nearest.distance < threshold) {
      const angle = this.calculateAngle(nearest.line);
      const isMirrored = this.valveOrientation === 1;

      // Clean up old preview
      this.cleanupValvePreview();

      // Create new preview based on current valve mode
      if (this.gateValveSMode) {
        this.previewValve = createGateValveSNew(nearest.closestPoint.x, nearest.closestPoint.y, angle, isMirrored);
      } else if (this.gateValveFLMode) {
        this.previewValve = createGateValveFLNew(nearest.closestPoint.x, nearest.closestPoint.y, angle, isMirrored);
      } else if (this.globeValveSMode) {
        this.previewValve = this.createGlobeValveS(nearest.closestPoint.x, nearest.closestPoint.y, angle);
      } else if (this.globeValveFLMode) {
        this.previewValve = this.createGlobeValveFL(nearest.closestPoint.x, nearest.closestPoint.y, angle);
      } else if (this.ballValveSMode) {
        this.previewValve = this.createBallValveS(nearest.closestPoint.x, nearest.closestPoint.y, angle);
      } else if (this.ballValveFLMode) {
        this.previewValve = this.createBallValveFL(nearest.closestPoint.x, nearest.closestPoint.y, angle);
      }

      if (this.previewValve) {
        this.previewValve.set({
          opacity: 0.7,
          selectable: false,
          evented: false
        });
        this.canvas.add(this.previewValve);
      }

      this.canvas.requestRenderAll();
    }
  }

  public handleMouseMove(options: any): void {
    if (!this.canvas || (!this.flowMode && !this.gateValveMode && !this.gateValveSMode && !this.gateValveFLMode && !this.globeValveSMode && !this.globeValveFLMode && !this.ballValveSMode && !this.ballValveFLMode && !this.teeJointMode)) return;

    // Check Ctrl key directly from the mouse event
    if (options.e && options.e.ctrlKey !== undefined) {
      this.isCtrlPressed = options.e.ctrlKey;
    }

    const pointer = this.canvas.getPointer(options.e);

    // Store last mouse position for Tab key updates
    this.lastMousePosition = pointer;

    const threshold = this.isShiftPressed ? 100 : 50; // Larger snap distance with Shift

    // Spezielle Behandlung für T-Stück Hover-Events
    this.handleTeeHover(pointer);
    
    const nearest = this.findNearestLine(pointer);
    
    // Reset previous highlight
    if (this.hoveredLine && this.hoveredLine !== nearest?.line) {
      this.resetLineHighlight();
    }
    
    if (nearest && nearest.distance < threshold) {
      // Highlight the line
      if (nearest.line !== this.hoveredLine) {
        this.hoveredLine = nearest.line;
        this.originalLineStroke = nearest.line.stroke as string;
        nearest.line.set('stroke', '#4CAF50');
      }
      
      let angle = this.calculateAngle(nearest.line);
      
      if (this.flowMode) {
        // Update preview arrow
        this.cleanupPreview();
        
        // Reverse direction with Shift
        if (this.isShiftPressed) {
          angle += 180;
        }
        
        this.previewArrow = this.createFlowArrow(nearest.closestPoint.x, nearest.closestPoint.y, angle);
        this.previewArrow.set({
          opacity: 0.7,
          selectable: false,
          evented: false
        });
        this.canvas.add(this.previewArrow);
      } else if (this.gateValveMode || this.gateValveSMode || this.gateValveFLMode || this.globeValveSMode || this.globeValveFLMode || this.ballValveSMode || this.ballValveFLMode) {
        // Update preview valve using dedicated method
        this.updateValvePreview(pointer);
      } else if (this.teeJointMode) {
        // Update preview T-Stück using dedicated method
        this.updateTeePreview(pointer);
      }
    } else {
      this.cleanupPreview();
      this.cleanupValvePreview();
      this.cleanupTeePreview();
      this.resetLineHighlight();
      this.resetTeeHighlight();
    }
    
    this.canvas.requestRenderAll();
  }

  public handleMouseDown(options: any): void {
    if (!this.canvas || (!this.flowMode && !this.gateValveMode && !this.gateValveSMode && !this.gateValveFLMode && !this.globeValveSMode && !this.globeValveFLMode && !this.ballValveSMode && !this.ballValveFLMode && !this.teeJointMode)) return;
    
    const pointer = this.canvas.getPointer(options.e);
    const threshold = this.isShiftPressed ? 100 : 50;
    const nearest = this.findNearestLine(pointer);
    
    if (nearest && nearest.distance < threshold) {
      let angle = this.calculateAngle(nearest.line);
      
      if (this.flowMode) {
        // Reverse direction with Shift
        if (this.isShiftPressed) {
          angle += 180;
        }
        
        const flowArrow = this.createFlowArrow(nearest.closestPoint.x, nearest.closestPoint.y, angle);
        
        if (this.stateManagement) {
          this.stateManagement.executeOperation('Add Flow Arrow', () => {
            this.canvas!.add(flowArrow);
            this.canvas!.requestRenderAll();
          });
        } else {
          this.canvas.add(flowArrow);
          this.canvas.requestRenderAll();
        }
        
        // Stay in flow mode for adding more arrows
        this.cleanupPreview();
        this.resetLineHighlight();
      } else if (this.gateValveMode || this.gateValveSMode || this.gateValveFLMode) {
        // Add gate valve and split line
        let gateValve: fabric.Group;
        let valveType: string;
        
        if (this.gateValveSMode) {
          gateValve = createGateValveSNew(nearest.closestPoint.x, nearest.closestPoint.y, angle, this.valveOrientation === 1);
          valveType = 'Gate Valve S';
          
          // Füge eine eindeutige ID zum Ventil hinzu
          const componentId = `valve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          (gateValve as any).customId = componentId;
          
          // Calculate anchor positions based on line angle
          const normalizedAngle = ((angle % 360) + 360) % 360;
          const distance = 16; // Distance from valve center - optimal position
          
          let anchor1X, anchor1Y, anchor2X, anchor2Y;
          
          if ((normalizedAngle >= 80 && normalizedAngle <= 100) || 
              (normalizedAngle >= 260 && normalizedAngle <= 280)) {
            // Vertical lines (90° or 270°) - anchors above and below
            anchor1X = nearest.closestPoint.x;
            anchor1Y = nearest.closestPoint.y - distance;
            anchor2X = nearest.closestPoint.x;
            anchor2Y = nearest.closestPoint.y + distance;
          } else if ((normalizedAngle >= 20 && normalizedAngle <= 40) || 
                     (normalizedAngle >= 200 && normalizedAngle <= 220)) {
            // 30° and 210° lines (isometric right diagonal)
            // Anchors along the 30° line direction
            const rad = (30 * Math.PI) / 180;
            anchor1X = nearest.closestPoint.x - distance * Math.cos(rad);
            anchor1Y = nearest.closestPoint.y - distance * Math.sin(rad);
            anchor2X = nearest.closestPoint.x + distance * Math.cos(rad);
            anchor2Y = nearest.closestPoint.y + distance * Math.sin(rad);
          } else if ((normalizedAngle >= 140 && normalizedAngle <= 160) || 
                     (normalizedAngle >= 320 && normalizedAngle <= 340)) {
            // 150° and 330° lines (isometric left diagonal)
            // Anchors along the 150° line direction
            const rad = (150 * Math.PI) / 180;
            anchor1X = nearest.closestPoint.x - distance * Math.cos(rad);
            anchor1Y = nearest.closestPoint.y - distance * Math.sin(rad);
            anchor2X = nearest.closestPoint.x + distance * Math.cos(rad);
            anchor2Y = nearest.closestPoint.y + distance * Math.sin(rad);
          } else if ((normalizedAngle >= -10 && normalizedAngle <= 10) || 
                     (normalizedAngle >= 170 && normalizedAngle <= 190) ||
                     (normalizedAngle >= 350)) {
            // Horizontal lines (0° or 180°) - anchors left and right
            anchor1X = nearest.closestPoint.x - distance;
            anchor1Y = nearest.closestPoint.y;
            anchor2X = nearest.closestPoint.x + distance;
            anchor2Y = nearest.closestPoint.y;
          } else {
            // Any other angle - calculate along the line direction
            const rad = (normalizedAngle * Math.PI) / 180;
            anchor1X = nearest.closestPoint.x - distance * Math.cos(rad);
            anchor1Y = nearest.closestPoint.y - distance * Math.sin(rad);
            anchor2X = nearest.closestPoint.x + distance * Math.cos(rad);
            anchor2Y = nearest.closestPoint.y + distance * Math.sin(rad);
          }
          
          // S variant also splits the line with smaller gap
          if (this.stateManagement) {
            this.stateManagement.executeOperation(`Add ${valveType}`, () => {
              // Split the line for S variant with smaller gap (false = 30px gap)
              this.splitLineAtValve(nearest.line, nearest.closestPoint, gateValve, false);
              this.canvas!.add(gateValve);
              
              // Add anchors as separate objects at the correct positions
              const anchor1 = new fabric.Circle({
                left: anchor1X,
                top: anchor1Y,
                radius: 2,  // Etwas größer für bessere Sichtbarkeit
                fill: 'blue',
                stroke: 'darkblue',
                strokeWidth: 1,
                opacity: 0.7,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
              } as any);
              (anchor1 as any).customType = 'anchorPoint';
              (anchor1 as any).isAnchor = true;
              (anchor1 as any).componentId = componentId;
              
              const anchor2 = new fabric.Circle({
                left: anchor2X,
                top: anchor2Y,
                radius: 2,  // Etwas größer für bessere Sichtbarkeit
                fill: 'blue',
                stroke: 'darkblue',
                strokeWidth: 1,
                opacity: 0.7,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
              } as any);
              (anchor2 as any).customType = 'anchorPoint';
              (anchor2 as any).isAnchor = true;
              (anchor2 as any).componentId = componentId;
              
              // Store anchors in valve for movement
              (gateValve as any).anchors = [anchor1, anchor2];
              
              this.canvas!.add(anchor1);
              this.canvas!.add(anchor2);
              
              this.canvas!.bringObjectToFront(gateValve);
              this.canvas!.bringObjectToFront(anchor1);
              this.canvas!.bringObjectToFront(anchor2);
              this.canvas!.requestRenderAll();
            });
          } else {
            // Split the line for S variant with smaller gap (false = 30px gap)
            this.splitLineAtValve(nearest.line, nearest.closestPoint, gateValve, false);
            this.canvas.add(gateValve);
            
            // Add anchors as separate objects at the correct positions
            const anchor1 = new fabric.Circle({
              left: anchor1X,
              top: anchor1Y,
              radius: 2,
              fill: 'blue',
              stroke: 'darkblue',
              strokeWidth: 1,
              opacity: 0.7,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false
            } as any);
            (anchor1 as any).customType = 'anchorPoint';
            (anchor1 as any).isAnchor = true;
            (anchor1 as any).componentId = componentId;
            
            const anchor2 = new fabric.Circle({
              left: anchor2X,
              top: anchor2Y,
              radius: 2,
              fill: 'blue',
              stroke: 'darkblue',
              strokeWidth: 1,
              opacity: 0.7,
              originX: 'center',
              originY: 'center',
              selectable: false,
              evented: false
            } as any);
            (anchor2 as any).customType = 'anchorPoint';
            (anchor2 as any).isAnchor = true;
            (anchor2 as any).componentId = componentId;
            
            // Store anchors in valve for movement
            (gateValve as any).anchors = [anchor1, anchor2];
            
            this.canvas.add(anchor1);
            this.canvas.add(anchor2);
            
            this.canvas.bringObjectToFront(gateValve);
            this.canvas.bringObjectToFront(anchor1);
            this.canvas.bringObjectToFront(anchor2);
            this.canvas.requestRenderAll();
          }
        } else if (this.gateValveFLMode) {
          gateValve = createGateValveFLNew(nearest.closestPoint.x, nearest.closestPoint.y, angle, this.valveOrientation === 1);
          valveType = 'Gate Valve FL';
          
          // Füge eine eindeutige ID zum Ventil hinzu
          const componentId = `valve_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          (gateValve as any).customId = componentId;
          
          // Calculate anchor positions for FL variant - at flange positions
          const normalizedAngle = ((angle % 360) + 360) % 360;
          const distance = 20; // Distance adjusted - slightly further out for FL variant
          
          let anchor1X, anchor1Y, anchor2X, anchor2Y;
          
          if ((normalizedAngle >= 80 && normalizedAngle <= 100) || 
              (normalizedAngle >= 260 && normalizedAngle <= 280)) {
            // Vertical lines - anchors above and below
            anchor1X = nearest.closestPoint.x;
            anchor1Y = nearest.closestPoint.y - distance;
            anchor2X = nearest.closestPoint.x;
            anchor2Y = nearest.closestPoint.y + distance;
          } else if ((normalizedAngle >= 20 && normalizedAngle <= 40) || 
                     (normalizedAngle >= 200 && normalizedAngle <= 220)) {
            // 30° lines
            const rad = (30 * Math.PI) / 180;
            anchor1X = nearest.closestPoint.x - distance * Math.cos(rad);
            anchor1Y = nearest.closestPoint.y - distance * Math.sin(rad);
            anchor2X = nearest.closestPoint.x + distance * Math.cos(rad);
            anchor2Y = nearest.closestPoint.y + distance * Math.sin(rad);
          } else if ((normalizedAngle >= 140 && normalizedAngle <= 160) || 
                     (normalizedAngle >= 320 && normalizedAngle <= 340)) {
            // 150° lines
            const rad = (150 * Math.PI) / 180;
            anchor1X = nearest.closestPoint.x - distance * Math.cos(rad);
            anchor1Y = nearest.closestPoint.y - distance * Math.sin(rad);
            anchor2X = nearest.closestPoint.x + distance * Math.cos(rad);
            anchor2Y = nearest.closestPoint.y + distance * Math.sin(rad);
          } else if ((normalizedAngle >= -10 && normalizedAngle <= 10) || 
                     (normalizedAngle >= 170 && normalizedAngle <= 190) ||
                     (normalizedAngle >= 350)) {
            // Horizontal lines
            anchor1X = nearest.closestPoint.x - distance;
            anchor1Y = nearest.closestPoint.y;
            anchor2X = nearest.closestPoint.x + distance;
            anchor2Y = nearest.closestPoint.y;
          } else {
            // Any other angle
            const rad = (normalizedAngle * Math.PI) / 180;
            anchor1X = nearest.closestPoint.x - distance * Math.cos(rad);
            anchor1Y = nearest.closestPoint.y - distance * Math.sin(rad);
            anchor2X = nearest.closestPoint.x + distance * Math.cos(rad);
            anchor2Y = nearest.closestPoint.y + distance * Math.sin(rad);
          }
          
          // Create anchor points
          const anchor1 = new fabric.Circle({
            left: anchor1X,
            top: anchor1Y,
            radius: 2,
            fill: 'blue',
            stroke: 'darkblue',
            strokeWidth: 1,
            opacity: 0.7,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          });
          (anchor1 as any).customType = 'anchorPoint';
          (anchor1 as any).isAnchor = true;
          (anchor1 as any).componentId = componentId;
          
          const anchor2 = new fabric.Circle({
            left: anchor2X,
            top: anchor2Y,
            radius: 2,
            fill: 'blue',
            stroke: 'darkblue',
            strokeWidth: 1,
            opacity: 0.7,
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false
          });
          (anchor2 as any).customType = 'anchorPoint';
          (anchor2 as any).isAnchor = true;
          (anchor2 as any).componentId = componentId;
          
          // Store anchors in valve for movement
          (gateValve as any).anchors = [anchor1, anchor2];
          
          // FL variant splits the line
          if (this.stateManagement) {
            this.stateManagement.executeOperation(`Add ${valveType}`, () => {
              this.splitLineAtValve(nearest.line, nearest.closestPoint, gateValve, true);
              this.canvas!.add(gateValve);
              this.canvas!.add(anchor1);
              this.canvas!.add(anchor2);
              this.canvas!.bringObjectToFront(gateValve);
              this.canvas!.bringObjectToFront(anchor1);
              this.canvas!.bringObjectToFront(anchor2);
              this.canvas!.requestRenderAll();
            });
          } else {
            this.splitLineAtValve(nearest.line, nearest.closestPoint, gateValve, true);
            this.canvas.add(gateValve);
            this.canvas.add(anchor1);
            this.canvas.add(anchor2);
            this.canvas.bringObjectToFront(gateValve);
            this.canvas.bringObjectToFront(anchor1);
            this.canvas.bringObjectToFront(anchor2);
            this.canvas.requestRenderAll();
          }
        } else {
          return;
        }
        
        // Stay in valve mode for adding more valves
        this.cleanupValvePreview();
        this.resetLineHighlight();
      } else if (this.globeValveSMode || this.globeValveFLMode) {
        // Add globe valve and split line
        let globeValve: fabric.Group;
        let valveType: string;
        
        if (this.globeValveSMode) {
          globeValve = this.createGlobeValveS(nearest.closestPoint.x, nearest.closestPoint.y, angle);
          valveType = 'Globe Valve S';
          // S variant doesn't split the line, just sits on top
          if (this.stateManagement) {
            this.stateManagement.executeOperation(`Add ${valveType}`, () => {
              this.canvas!.add(globeValve);
              this.canvas!.bringObjectToFront(globeValve);
              this.canvas!.requestRenderAll();
            });
          } else {
            this.canvas.add(globeValve);
            this.canvas.bringObjectToFront(globeValve);
            this.canvas.requestRenderAll();
          }
        } else if (this.globeValveFLMode) {
          globeValve = this.createGlobeValveFL(nearest.closestPoint.x, nearest.closestPoint.y, angle);
          valveType = 'Globe Valve FL';
          // FL variant splits the line
          if (this.stateManagement) {
            this.stateManagement.executeOperation(`Add ${valveType}`, () => {
              this.splitLineAtValve(nearest.line, nearest.closestPoint, globeValve, true);
              this.canvas!.add(globeValve);
              this.canvas!.bringObjectToFront(globeValve);
              this.canvas!.requestRenderAll();
            });
          } else {
            this.splitLineAtValve(nearest.line, nearest.closestPoint, globeValve, true);
            this.canvas.add(globeValve);
            this.canvas.bringObjectToFront(globeValve);
            this.canvas.requestRenderAll();
          }
        } else {
          return;
        }
        
        // Stay in valve mode for adding more valves
        this.cleanupValvePreview();
        this.resetLineHighlight();
      } else if (this.ballValveSMode || this.ballValveFLMode) {
        // Add ball valve and split line
        let ballValve: fabric.Group;
        let valveType: string;
        
        if (this.ballValveSMode) {
          ballValve = this.createBallValveS(nearest.closestPoint.x, nearest.closestPoint.y, angle);
          valveType = 'Ball Valve S';
          // Ball valve always sits on top of the line, never splits it
          if (this.stateManagement) {
            this.stateManagement.executeOperation(`Add ${valveType}`, () => {
              this.canvas!.add(ballValve);
              this.canvas!.bringObjectToFront(ballValve);
              this.canvas!.requestRenderAll();
            });
          } else {
            this.canvas.add(ballValve);
            this.canvas.bringObjectToFront(ballValve);
            this.canvas.requestRenderAll();
          }
        } else if (this.ballValveFLMode) {
          ballValve = this.createBallValveFL(nearest.closestPoint.x, nearest.closestPoint.y, angle);
          valveType = 'Ball Valve FL';
          // Ball valve FL also sits on top, doesn't split the line
          if (this.stateManagement) {
            this.stateManagement.executeOperation(`Add ${valveType}`, () => {
              this.canvas!.add(ballValve);
              this.canvas!.bringObjectToFront(ballValve);
              this.canvas!.requestRenderAll();
            });
          } else {
            this.canvas.add(ballValve);
            this.canvas.bringObjectToFront(ballValve);
            this.canvas.requestRenderAll();
          }
        } else {
          return;
        }
        
        // Stay in valve mode for adding more valves
        this.cleanupValvePreview();
        this.resetLineHighlight();
      } else if (this.teeJointMode) {
        // Add T-Stück
        const teeJoint = createTeeJoint(
          nearest.closestPoint.x,
          nearest.closestPoint.y,
          angle,
          this.teeOrientation  // 0, 1, 2, 3 for 4 different branch orientations
        );
        
        // Füge eine eindeutige ID zum T-Stück hinzu
        const componentId = `tee_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        (teeJoint as any).customId = componentId;
        
        if (this.stateManagement) {
          this.stateManagement.executeOperation('Add T-Stück', () => {
            // Teile die Linie am T-Stück
            this.splitLineAtValve(nearest.line, nearest.closestPoint, teeJoint, true);

            // WICHTIG: Die connectedLines wurden jetzt von splitLineAtValve gesetzt
            console.log('T-Stück connectedLines nach Split:', (teeJoint as any).connectedLines?.length || 0);

            // Füge die T-Stück Linien hinzu
            const lines = (teeJoint as any).lines;
            if (lines) {
              lines.forEach((line: any) => {
                this.canvas!.add(line);
              });
            }

            // Füge die Ankerpunkte hinzu
            const anchors = (teeJoint as any).anchors;
            if (anchors) {
              anchors.forEach((anchor: fabric.Circle) => {
                // Verknüpfe Ankerpunkt mit T-Stück über componentId
                (anchor as any).componentId = componentId;
                this.canvas!.add(anchor);
              });
            }

            // Füge das Selektions-Rechteck hinzu (für Interaktion)
            this.canvas!.add(teeJoint);

            // Stelle sicher, dass das T-Stück im Vordergrund ist
            this.canvas!.bringObjectToFront(teeJoint);
            this.canvas!.requestRenderAll();
          });
        } else {
          this.splitLineAtValve(nearest.line, nearest.closestPoint, teeJoint, true);

          // WICHTIG: Die connectedLines wurden jetzt von splitLineAtValve gesetzt
          console.log('T-Stück connectedLines nach Split:', (teeJoint as any).connectedLines?.length || 0);

          // Füge die T-Stück Linien hinzu
          const lines = (teeJoint as any).lines;
          if (lines) {
            lines.forEach((line: any) => {
              this.canvas!.add(line);
            });
          }

          // Füge die Ankerpunkte hinzu
          const anchors = (teeJoint as any).anchors;
          if (anchors) {
            anchors.forEach((anchor: fabric.Circle) => {
              // Verknüpfe Ankerpunkt mit T-Stück über componentId
              (anchor as any).componentId = componentId;
              this.canvas!.add(anchor);
            });
          }

          // Füge das Selektions-Rechteck hinzu (für Interaktion)
          this.canvas.add(teeJoint);

          // Stelle sicher, dass das T-Stück im Vordergrund ist
          this.canvas.bringObjectToFront(teeJoint);
          this.canvas.requestRenderAll();
        }
        
        // Bleibe im T-Stück Modus
        this.cleanupTeePreview();
        this.resetLineHighlight();
      }
    }
  }

  private splitLineAtValve(line: fabric.Line | fabric.Path, valvePosition: { x: number; y: number }, valve: any, isFLVariant: boolean = false): void {
    if (!this.canvas) return;
    
    if (line.type === 'line') {
      const l = line as fabric.Line;
      // For FL variant, gap includes the vertical lines (40px), for S variant just the triangles (30px)
      const valveSize = isFLVariant ? 40 : 30;
      
      // Calculate direction vector
      const dx = l.x2! - l.x1!;
      const dy = l.y2! - l.y1!;
      const length = Math.sqrt(dx * dx + dy * dy);
      const unitX = dx / length;
      const unitY = dy / length;
      
      // Calculate split points (leave gap for valve)
      const gapHalf = valveSize / 2;
      const leftEndX = valvePosition.x - unitX * gapHalf;
      const leftEndY = valvePosition.y - unitY * gapHalf;
      const rightStartX = valvePosition.x + unitX * gapHalf;
      const rightStartY = valvePosition.y + unitY * gapHalf;
      
      // Create two new lines
      const line1 = new fabric.Line([l.x1!, l.y1!, leftEndX, leftEndY], {
        stroke: l.stroke,
        strokeWidth: l.strokeWidth,
        selectable: l.selectable,
        evented: l.evented
      });
      
      const line2 = new fabric.Line([rightStartX, rightStartY, l.x2!, l.y2!], {
        stroke: l.stroke,
        strokeWidth: l.strokeWidth,
        selectable: l.selectable,
        evented: l.evented
      });
      
      // Copy any custom properties from original line
      if ((line as any).isDimensionPart) {
        (line1 as any).isDimensionPart = true;
        (line2 as any).isDimensionPart = true;
      }
      
      // Wichtig: Markiere die neuen Linien als geteilte Pipe-Segmente
      (line1 as any).isSplitPipeSegment = true;
      (line2 as any).isSplitPipeSegment = true;
      (line1 as any).originalPipeId = (line as any).pipeId || (line as any).originalPipeId;
      (line2 as any).originalPipeId = (line as any).pipeId || (line as any).originalPipeId;
      
      // Speichere die Linien als verbunden mit dem Ventil/T-Stück
      if (!(valve as any).connectedLines) {
        (valve as any).connectedLines = [];
      }
      (valve as any).connectedLines.push(line1, line2);
      
      // Setze die Linien auch auf dem teeData objekt falls es ein T-Stück ist
      if ((valve as any).customType === 'teeJoint' && (valve as any).teeData) {
        (valve as any).teeData.connectedLines = [line1, line2];
      }
      
      // Speichere die Host-Linie und Position für das Ventil/T-Stück
      // Die Komponente liegt genau in der Mitte zwischen den beiden neuen Linien
      (valve as any).hostLine = line1; // Wir verwenden die erste Linie als Referenz
      (valve as any).linePosition = 1.0; // Am Ende der ersten Linie
      
      // Finde die EditablePipe zu dieser Linie und aktualisiere sie
      const pipes = this.lineDrawingService?.getEditablePipes() || [];
      for (const pipe of pipes) {
        if (pipe.segments) {
          const segmentIndex = pipe.segments.indexOf(line);
          if (segmentIndex !== -1) {
            // Ersetze das ursprüngliche Segment mit den zwei neuen
            pipe.segments.splice(segmentIndex, 1, line1, line2);
            
            // Markiere die Pipe-ID auf den neuen Linien
            (line1 as any).pipeId = (pipe as any).id;
            (line2 as any).pipeId = (pipe as any).id;
            break;
          }
        }
      }
      
      // Remove original line and add new ones
      this.canvas.remove(line);
      this.canvas.add(line1);
      this.canvas.add(line2);
      
      // Store references in valve for potential reconnection
      (valve as any).connectedLines = [line1, line2];
      (valve as any).originalLine = line;
      
      // Speichere Referenz zum Ventil auf den Linien
      (line1 as any).connectedValve = valve;
      (line2 as any).connectedValve = valve;
    }
    // For paths, we would need more complex splitting logic
  }
}