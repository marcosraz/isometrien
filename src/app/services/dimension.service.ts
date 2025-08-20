import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { BehaviorSubject } from 'rxjs';
import { StateManagementService } from './state-management.service';

interface DimensionData {
  startAnchor: fabric.Object;
  endAnchor: fabric.Object;
  extensionLine1: fabric.Line;
  extensionLine2: fabric.Line;
  dimensionLine: fabric.Path | fabric.Line;
  arrow1: fabric.Path;
  arrow2: fabric.Path;
  text: fabric.IText;
  offset: number;
}

@Injectable({
  providedIn: 'root',
})
export class DimensionService {
  private dimensionStep: 'start' | 'end' | 'position' | null = null;
  private firstAnchorPoint: fabric.Object | null = null;
  private secondAnchorPoint: fabric.Object | null = null;
  private hoveredAnchor: fabric.Object | null = null;
  private dimensionElements: fabric.Object[] = [];
  private dimensionDragStartPoint: { x: number; y: number } | null = null;
  private initialDimensionPositions: Array<{ left: number; top: number }> = [];
  private tempDimensionableAnchors: fabric.Circle[] = [];
  private dimensions: DimensionData[] = [];
  private stateManagement: StateManagementService | null = null;
  public isoDimensionMode: boolean = false;
  private isoHelpLineOrientation: 'vertical' | '30deg' | '150deg' = 'vertical';
  private previewDimension: fabric.Object[] = [];
  private canvas: fabric.Canvas | null = null;

  constructor() {
    // Lausche auf TAB-Taste für ISO-Bemaßung
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this.isoDimensionMode && this.dimensionStep === 'position') {
        e.preventDefault(); // Verhindere Standard-Tab-Verhalten
        e.stopPropagation(); // Stoppe Event-Weitergabe
        console.log('TAB-Taste erkannt in position mode');
        this.toggleIsoHelpLineOrientation();
        // Aktualisiere die Vorschau
        if (this.canvas) {
          this.updateIsoDimensionPreview(this.canvas);
        }
      }
    });
  }
  
  public setStateManagement(stateManagement: StateManagementService): void {
    this.stateManagement = stateManagement;
  }

  public startDimensioning(): void {
    this.dimensionStep = 'start';
    this.isoDimensionMode = false;
    console.log('Bemaßungsmodus gestartet. Bitte ersten Punkt wählen.');
    
    // Disable canvas selection to prevent selection box
    if (this.canvas) {
      this.canvas.selection = false;
    }
  }
  
  public startIsoDimensioning(): void {
    this.dimensionStep = 'start';
    this.isoDimensionMode = true;
    this.isoHelpLineOrientation = 'vertical';
    console.log('ISO-Bemaßungsmodus gestartet. TAB-Taste für Hilfslinien-Ausrichtung.');
    
    // Disable canvas selection to prevent selection box
    if (this.canvas) {
      this.canvas.selection = false;
    }
  }
  
  public toggleIsoHelpLineOrientation(): void {
    if (!this.isoDimensionMode) return;
    
    console.log('TAB gedrückt - Aktuelle Ausrichtung:', this.isoHelpLineOrientation);
    
    switch (this.isoHelpLineOrientation) {
      case 'vertical':
        this.isoHelpLineOrientation = '30deg';
        console.log('Neue Ausrichtung: 30 Grad');
        break;
      case '30deg':
        this.isoHelpLineOrientation = '150deg';
        console.log('Neue Ausrichtung: 150 Grad');
        break;
      case '150deg':
        this.isoHelpLineOrientation = 'vertical';
        console.log('Neue Ausrichtung: Vertikal');
        break;
    }
  }
  
  public stopDimensioning(): void {
    this.dimensionStep = null;
    this.firstAnchorPoint = null;
    this.dimensionElements = [];
    this.dimensionDragStartPoint = null;
    this.initialDimensionPositions = [];
    console.log('Bemaßungsmodus beendet.');
    
    // Re-enable canvas selection when dimension mode ends
    if (this.canvas) {
      this.canvas.selection = true;
    }
  }
  
  public resetAnchorHighlights(canvas: fabric.Canvas): void {
    // Alle Ankerpunkte zurücksetzen
    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'circle' && (obj as any).customType === 'anchorPoint') {
        const anchor = obj as fabric.Circle;
        if (anchor.fill === 'green' || anchor.fill === 'orange') {
          anchor.set({
            fill: (anchor as any).originalFill || 'red',
            radius: 2,
            strokeWidth: 1,
            stroke: 'black'
          });
        }
      }
    });
    this.hoveredAnchor = null;
    canvas.renderAll();
  }
  
  public getDimensionStep(): 'start' | 'end' | 'position' | null {
    return this.dimensionStep;
  }
  
  // Methode um alle Ankerpunkte in den Vordergrund zu bringen
  private bringAllAnchorsToFront(canvas: fabric.Canvas): void {
    const objects = canvas.getObjects();
    const anchors: fabric.Object[] = [];
    
    // Sammle alle Ankerpunkte
    objects.forEach(obj => {
      if (obj.type === 'circle' && (obj.fill === 'red' || obj.fill === 'blue') && (obj as any).customType === 'anchorPoint') {
        anchors.push(obj);
      }
    });
    
    // Bringe alle Ankerpunkte nach vorne
    // Entferne und füge wieder hinzu um Z-Order zu ändern
    anchors.forEach(anchor => {
      canvas.remove(anchor);
      canvas.add(anchor);
    });
    
    canvas.requestRenderAll();
  }

  // Neue Methode um Ankerpunkte immer sichtbar und wiederverwendbar zu halten
  public ensureAnchorsAlwaysVisible(canvas: fabric.Canvas): void {
    // Alle Ankerpunkte aus Canvas sichtbar und wiederverwendbar machen
    const anchors: fabric.Object[] = [];
    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'circle' && (obj.fill === 'red' || obj.fill === 'blue')) {
        obj.set({
          visible: true,
          selectable: true,
          evented: true,
          customType: 'anchorPoint',
          // Markiere als wiederverwendbar für mehrere Bemaßungen
          reusable: true,
          hasControls: false,
          hasBorders: true,
          borderColor: 'blue',
          borderScaleFactor: 2,
          // Erhöhe Interaktivität
          perPixelTargetFind: true,
          targetFindTolerance: 5
        });
        anchors.push(obj);
      }
    });
    
    // Bringe alle Ankerpunkte in den Vordergrund
    // Entferne und füge wieder hinzu um Z-Order zu ändern
    anchors.forEach(anchor => {
      canvas.remove(anchor);
      canvas.add(anchor);
    });
    
    canvas.requestRenderAll();
  }

  public handleDimensionMouseDown(
    canvas: fabric.Canvas,
    options: any,
    editablePipes: any[],
    editableLines: any[] = []
  ): void {
    console.log('Dimension MouseDown:', options.target, options.target?.customType);
    
    switch (this.dimensionStep) {
      case 'start':
        // Prüfe zuerst ob eine Linie oder ein Pfad (curved pipe) angeklickt wurde
        if (options.target && (options.target.type === 'line' || options.target.type === 'path')) {
          console.log('Linie/Pfad angeklickt für Bemaßung');
          this.createDimensionForLine(canvas, options.target as fabric.Line, editablePipes, editableLines);
          return;
        }
        
        // Ansonsten prüfe auf Ankerpunkte
        if (options.target && (options.target.customType === 'anchorPoint' || 
            options.target.type === 'circle')) {
          this.firstAnchorPoint = options.target;
          this.dimensionStep = 'end';
          console.log('Erster Punkt ausgewählt. Bitte zweiten Punkt wählen.');
          canvas.requestRenderAll();
        }
        break;
      case 'end':
        if (
          this.firstAnchorPoint &&
          options.target &&
          (options.target.customType === 'anchorPoint' || 
           options.target.type === 'circle') &&
          options.target !== this.firstAnchorPoint
        ) {
          const secondAnchorPoint = options.target;
          
          if (this.isoDimensionMode) {
            // Für ISO-Bemaßung: Erstelle Vorschau
            this.secondAnchorPoint = secondAnchorPoint;
            this.canvas = canvas; // Speichere Canvas-Referenz
            this.dimensionStep = 'position';
            console.log('ISO-Bemaßung: Punkte ausgewählt. TAB-Taste für Ausrichtung, Klick zum Platzieren.');
            console.log('Aktueller Step:', this.dimensionStep);
            this.createIsoDimensionPreview(canvas);
            // WICHTIG: Return hier, damit der Rest nicht ausgeführt wird
            return;
          } else {
            // Normale Bemaßung: Direkt erstellen
            console.log('Zweiter Punkt ausgewählt. Bemaßung wird erstellt und fixiert.');
            // Wrap dimension creation in state management
            if (this.stateManagement) {
              this.stateManagement.executeOperation('Add Dimension', () => {
                this.createDimensionVisuals(canvas, this.firstAnchorPoint!, secondAnchorPoint);
              });
            } else {
              this.createDimensionVisuals(canvas, this.firstAnchorPoint, secondAnchorPoint);
            }
            
            // Ankerpunkte bleiben sichtbar und benutzbar
            // this.clearTemporaryDimensionAnchors(canvas); // Auskommentiert
            
            // Reset für nächste Bemaßung aber bleibe im Dimension-Modus
            this.firstAnchorPoint = null;
            this.dimensionElements = [];
            this.dimensionDragStartPoint = null;
            this.initialDimensionPositions = [];
            console.log('Bemaßung platziert. Bereit für nächste Bemaßung.');
            
            // WICHTIG: Deselektiere alle Objekte nach der Bemaßung
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            
            // Ankerpunkte zurücksetzen
            this.resetAnchorHighlights(canvas);
            
            // Sofort zurück zum Start für neue Bemaßung
            this.dimensionStep = 'start';
            
            // Stelle sicher, dass alle Ankerpunkte sichtbar bleiben
            this.ensureAnchorsAlwaysVisible(canvas);
            
            // Wichtig: Bringe alle Ankerpunkte nach vorne, nachdem neue Elemente hinzugefügt wurden
            this.bringAllAnchorsToFront(canvas);
          }
        }
        break;
      case 'position':
        // ISO-Bemaßung: Platziere nach Klick (aber nicht auf Ankerpunkte)
        if (this.isoDimensionMode && this.firstAnchorPoint && this.secondAnchorPoint) {
          // Ignoriere Klicks auf Objekte (nur Canvas-Klicks erlaubt)
          if (options.target) {
            console.log('Klick auf Objekt ignoriert - klicke auf leeren Canvas-Bereich zum Platzieren');
            return;
          }
          
          console.log('ISO-Bemaßung wird platziert mit Ausrichtung:', this.isoHelpLineOrientation);
          
          // Hole die Klickposition
          const pointer = canvas.getPointer(options.e);
          const positionPoint = { x: pointer.x, y: pointer.y };
          
          // Entferne Vorschau
          if (this.previewDimension.length > 0) {
            this.previewDimension.forEach(obj => canvas.remove(obj));
            this.previewDimension = [];
          }
          
          // Erstelle finale Bemaßung mit Positionsangabe
          if (this.stateManagement) {
            this.stateManagement.executeOperation('Add ISO Dimension', () => {
              this.createIsoDimensionVisuals(canvas, this.firstAnchorPoint!, this.secondAnchorPoint!, positionPoint);
            });
          } else {
            this.createIsoDimensionVisuals(canvas, this.firstAnchorPoint, this.secondAnchorPoint, positionPoint);
          }
          
          // Reset für nächste Bemaßung
          this.firstAnchorPoint = null;
          this.secondAnchorPoint = null;
          this.dimensionStep = 'start';
          this.isoHelpLineOrientation = 'vertical'; // Reset Ausrichtung
          
          // Stelle sicher, dass alle Ankerpunkte sichtbar bleiben
          this.ensureAnchorsAlwaysVisible(canvas);
          this.bringAllAnchorsToFront(canvas);
        }
        break;
    }
    
    // Nach jeder Dimension-Aktion sicherstellen, dass Ankerpunkte sichtbar sind
    this.ensureAnchorsAlwaysVisible(canvas);
  }

  public handleDimensionMouseMove(canvas: fabric.Canvas, options: any): void {
    // Update ISO dimension preview position
    if (this.dimensionStep === 'position' && this.isoDimensionMode) {
      const pointer = canvas.getPointer(options.e);
      this.updateIsoDimensionPreviewWithPosition(canvas, pointer);
      return;
    }
    
    // Hover-Effekt für Ankerpunkte
    if (this.dimensionStep === 'start' || this.dimensionStep === 'end') {
      const pointer = canvas.getPointer(options.e);
      let foundAnchor: fabric.Object | null = null;
      
      // Durchsuche alle Ankerpunkte
      canvas.getObjects().forEach((obj) => {
        if (obj.type === 'circle' && (obj as any).customType === 'anchorPoint') {
          const anchor = obj as fabric.Circle;
          const distance = Math.sqrt(
            Math.pow(pointer.x - anchor.left!, 2) + 
            Math.pow(pointer.y - anchor.top!, 2)
          );
          
          // Wenn Maus nahe am Ankerpunkt ist (20 Pixel Toleranz)
          if (distance < 20 && anchor !== this.firstAnchorPoint) {
            foundAnchor = anchor;
          }
        }
      });
      
      // Vorherigen Hover entfernen (außer es ist der erste ausgewählte Punkt)
      if (this.hoveredAnchor && this.hoveredAnchor !== foundAnchor && this.hoveredAnchor !== this.firstAnchorPoint) {
        const prev = this.hoveredAnchor as fabric.Circle;
        prev.set({
          fill: (prev as any).originalFill || 'red',
          radius: 2,
          strokeWidth: 1,
          stroke: 'black'
        });
      }
      
      // Neuen Hover setzen
      if (foundAnchor && foundAnchor !== this.hoveredAnchor) {
        const anchor = foundAnchor as fabric.Circle;
        if (anchor.fill !== 'green' && anchor.fill !== 'orange') {
          (anchor as any).originalFill = anchor.fill;
          anchor.set({
            fill: 'green',
            radius: 3,
            strokeWidth: 3,
            stroke: 'darkgreen'
          });
        }
      }
      
      this.hoveredAnchor = foundAnchor;
      
      // Ersten ausgewählten Punkt orange hervorheben
      if (this.firstAnchorPoint && this.dimensionStep === 'end') {
        const first = this.firstAnchorPoint as fabric.Circle;
        if (first.fill !== 'orange') {
          first.set({
            fill: 'orange',
            radius: 3,
            strokeWidth: 3,
            stroke: 'darkorange'
          });
        }
      }
      
      canvas.renderAll();
    }
  }

  public prepareDimensionableAnchors(canvas: fabric.Canvas, editablePipes: any[], editableLines: any[] = []): void {
    // Behalte existierende Ankerpunkte bei, anstatt das Array zu leeren
    if (!this.tempDimensionableAnchors) {
      this.tempDimensionableAnchors = [];
    }
    
    // Setze customType für alle Ankerpunkte
    canvas.getObjects().forEach((obj) => {
      if (obj.type === 'circle' && (obj.fill === 'red' || obj.fill === 'blue')) {
        obj.set({
          selectable: true,
          evented: true,
          customType: 'anchorPoint',
          visible: true,
          hasControls: false,
          hasBorders: true,
          borderColor: 'blue',
          borderScaleFactor: 2
        });
        if (!this.tempDimensionableAnchors.includes(obj as fabric.Circle)) {
          this.tempDimensionableAnchors.push(obj as fabric.Circle);
        }
        // Stelle sicher, dass Ankerpunkt im Vordergrund ist
        // Später werden alle Ankerpunkte nach vorne gebracht
      }
    });
    
    editablePipes.forEach((pipe) => {
      pipe.anchors.forEach((anchor: fabric.Circle) => {
        anchor.set({
          selectable: true,
          evented: true,
          customType: 'anchorPoint',
          visible: true,
          hasControls: false,
          hasBorders: true,
          borderColor: 'blue',
          borderScaleFactor: 2
        });
        if (!this.tempDimensionableAnchors.includes(anchor)) {
          this.tempDimensionableAnchors.push(anchor);
        }
        // Ankerpunkt wird später nach vorne gebracht
      });
    });
    
    // Füge Ankerpunkte von editierbaren Linien hinzu
    editableLines.forEach((line) => {
      line.anchors.forEach((anchor: fabric.Circle) => {
        anchor.set({
          selectable: true,
          evented: true,
          customType: 'anchorPoint',
          visible: true,
          hasControls: false,
          hasBorders: true,
          borderColor: 'blue',
          borderScaleFactor: 2
        });
        if (!this.tempDimensionableAnchors.includes(anchor)) {
          this.tempDimensionableAnchors.push(anchor);
        }
        // Ankerpunkt wird später nach vorne gebracht
      });
    });
    
    canvas.requestRenderAll();
  }

  public clearTemporaryDimensionAnchors(canvas: fabric.Canvas): void {
    // Ankerpunkte sollen immer sichtbar und interaktiv bleiben für Wiederverwendung
    this.tempDimensionableAnchors.forEach((anchor) => {
      anchor.set({
        selectable: true,
        evented: true,
        visible: true,
        customType: 'anchorPoint',
        // Markiere als wiederverwendbar
        reusable: true,
        hasControls: false,
        hasBorders: true,
        borderColor: 'blue',
        borderScaleFactor: 2
      });
    });
    // Behalte die Referenzen für spätere Verwendung
    // this.tempDimensionableAnchors = []; // Auskommentiert - behalte die Ankerpunkte
    canvas.requestRenderAll();
  }

  private createDimensionVisuals(
    canvas: fabric.Canvas,
    startPoint: fabric.Object,
    endPoint: fabric.Object
  ): void {
    const startCoords = {
      x: startPoint.left as number,
      y: startPoint.top as number,
    };
    const endCoords = { x: endPoint.left as number, y: endPoint.top as number };

    const distance = Math.sqrt(
      Math.pow(endCoords.x - startCoords.x, 2) +
        Math.pow(endCoords.y - startCoords.y, 2)
    ).toFixed(2);

    const offset = 30; // Etwas größerer Offset für bessere Sichtbarkeit
    const angle = Math.atan2(
      endCoords.y - startCoords.y,
      endCoords.x - startCoords.x
    );
    const perpendicularAngle = angle + Math.PI / 2;

    const extLine1_end = {
      x: startCoords.x + offset * Math.cos(perpendicularAngle),
      y: startCoords.y + offset * Math.sin(perpendicularAngle),
    };
    const extLine2_end = {
      x: endCoords.x + offset * Math.cos(perpendicularAngle),
      y: endCoords.y + offset * Math.sin(perpendicularAngle),
    };

    // Erstelle Extension Lines
    const extensionLine1 = new fabric.Line(
      [startCoords.x, startCoords.y, extLine1_end.x, extLine1_end.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
      }
    );

    const extensionLine2 = new fabric.Line(
      [endCoords.x, endCoords.y, extLine2_end.x, extLine2_end.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
      }
    );

    // Erstelle Dimension Line als PATH statt LINE (weniger interaktiv)
    const dimensionLine = new fabric.Path(
      `M ${extLine1_end.x} ${extLine1_end.y} L ${extLine2_end.x} ${extLine2_end.y}`,
      {
        stroke: 'black',
        strokeWidth: 1,
        fill: '',
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        perPixelTargetFind: false, // WICHTIG: Verhindert Pixel-genaue Erkennung
        targetFindTolerance: 0, // WICHTIG: Keine Toleranz
        customType: 'dimensionLine'
      }
    );

    // Erstelle Pfeile an den Enden der Dimensionslinie (nach außen zeigend)
    const arrowSize = 8;
    const arrow1 = this.createArrow(extLine1_end, angle + Math.PI, arrowSize); // Pfeil zeigt nach links
    const arrow2 = this.createArrow(extLine2_end, angle, arrowSize); // Pfeil zeigt nach rechts

    // Erstelle Text (bearbeitbar) - mit fixem Abstand ÜBER der Dimensionslinie und richtigem Winkel
    const textOffset = 10; // Fester Abstand des Texts zur Dimensionslinie (nach oben)
    let textAngle = angle * 180 / Math.PI; // Konvertiere zu Grad für Fabric.js
    
    // Stelle sicher, dass Text immer leserlich ist (nicht kopfüber)
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180; // Drehe um 180 Grad
    }
    
    // Bestimme die richtige Seite für den Text
    const shouldFlip = angle > Math.PI/2 || angle < -Math.PI/2;
    const textPerpAngle = shouldFlip ? perpendicularAngle : perpendicularAngle + Math.PI;
    
    const text = new fabric.IText(distance, {
      left: (extLine1_end.x + extLine2_end.x) / 2 + textOffset * Math.cos(textPerpAngle),
      top: (extLine1_end.y + extLine2_end.y) / 2 + textOffset * Math.sin(textPerpAngle),
      fontSize: 14,
      originX: 'center',
      originY: 'center',
      angle: textAngle, // Text-Winkel parallel zur Dimensionslinie
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: true,
      lockMovementX: true, // Position bleibt gesperrt
      lockMovementY: true, // Position bleibt gesperrt
      customType: 'dimensionText',
      editable: true,
    });

    // Speichere die Dimension-Daten
    const dimensionData: DimensionData = {
      startAnchor: startPoint,
      endAnchor: endPoint,
      extensionLine1,
      extensionLine2,
      dimensionLine,
      arrow1,
      arrow2,
      text,
      offset: offset
    };
    this.dimensions.push(dimensionData);

    // Markiere alle Elemente als Teil einer Dimension und stelle sicher, dass sie gesperrt sind
    const dimensionId = 'dimension_' + Date.now() + '_' + Math.random();
    [extensionLine1, extensionLine2, dimensionLine, arrow1, arrow2].forEach(obj => {
      (obj as any).dimensionId = dimensionId;
      (obj as any).isDimensionPart = true;
      // Zusätzliche Sicherheit: Stelle sicher, dass alle Linien gesperrt sind
      obj.set({
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        hasControls: false,
        hasBorders: false
      });
    });
    
    // Text separat behandeln (selektierbar für Bearbeitung)
    (text as any).dimensionId = dimensionId;
    (text as any).isDimensionPart = true;

    // Füge alle Elemente einzeln zum Canvas hinzu
    canvas.add(extensionLine1, extensionLine2, dimensionLine, arrow1, arrow2);
    
    // Stelle sicher, dass alle Dimensionselemente keine Maus-Events blockieren außer der Hauptlinie
    [extensionLine1, extensionLine2, arrow1, arrow2].forEach(element => {
      element.set({
        selectable: false,
        evented: false,
        perPixelTargetFind: false, // Verhindert pixelgenaue Kollisionserkennung
        targetFindTolerance: 0 // Keine Toleranz für Mausklicks
      });
    });
    
    // Dimensionslinie soll Events empfangen für Hover/Drag
    dimensionLine.set({
      selectable: false,
      evented: true,  // Events aktivieren
      hoverCursor: 'move',
      moveCursor: 'move',
      stroke: '#0066cc', // Blaue Farbe für bessere Sichtbarkeit
      strokeWidth: 2
    });
    
    // WICHTIG: Setze die Z-Order der Dimensionselemente
    // Die Elemente werden in der Reihenfolge gerendert, in der sie hinzugefügt wurden

    // Speichere die Dimension ID
    (dimensionData as any).dimensionId = dimensionId;

    // Direkte Event-Handler für die Dimensionslinie (anstatt Blocker)
    this.setupDimensionLineEvents(canvas, dimensionData, dimensionLine);
    
    // Aktualisiere die Dimension, wenn sich die Ankerpunkte bewegen
    this.setupAnchorListeners(canvas, dimensionData);

    // Stelle sicher, dass die verwendeten Ankerpunkte wiederverwendbar bleiben
    [startPoint, endPoint].forEach(anchor => {
      anchor.set({
        visible: true,
        selectable: true,
        evented: true,
        customType: 'anchorPoint',
        reusable: true,
        hasControls: false,
        hasBorders: true,
        borderColor: 'blue',
        borderScaleFactor: 2
      });
      // Bringe Ankerpunkte in den Vordergrund
      canvas.remove(anchor);
      canvas.add(anchor);
    });
    
    // Stelle sicher, dass Position immer gesperrt bleibt
    text.on('editing:exited', () => {
      text.set({
        lockMovementX: true,
        lockMovementY: true
      });
      canvas.requestRenderAll();
    });

    // Füge Interaktionsfunktionalität hinzu
    this.createDimensionInteractionGroup(canvas, dimensionData);

    canvas.requestRenderAll();
  }

  private createIsoDimensionVisuals(
    canvas: fabric.Canvas,
    startPoint: fabric.Object,
    endPoint: fabric.Object,
    positionPoint?: { x: number; y: number }
  ): void {
    const startCoords = {
      x: startPoint.left as number,
      y: startPoint.top as number,
    };
    const endCoords = { x: endPoint.left as number, y: endPoint.top as number };

    const distance = Math.sqrt(
      Math.pow(endCoords.x - startCoords.x, 2) +
      Math.pow(endCoords.y - startCoords.y, 2)
    ).toFixed(2);

    // Bestimme die Richtung der Hilfslinien basierend auf der Ausrichtung
    // Die Hilfslinien sind IMMER parallel zueinander
    let helpLineAngle: number;
    
    switch (this.isoHelpLineOrientation) {
      case 'vertical':
        helpLineAngle = -Math.PI / 2; // 90 Grad nach oben
        break;
      case '30deg':
        helpLineAngle = -Math.PI / 6; // 30 Grad (isometrisch rechts-oben)
        break;
      case '150deg':
        helpLineAngle = -(5 * Math.PI) / 6; // 150 Grad (isometrisch links-oben)
        break;
      default:
        helpLineAngle = -Math.PI / 2;
    }

    // Berechne den Offset basierend auf der Position des dritten Klicks
    let offset = 40; // Standard-Offset
    if (positionPoint) {
      // Berechne die Distanz vom Positionspunkt zur Verbindungslinie der Ankerpunkte
      // Projektion des Positionspunkts auf die Richtung der Hilfslinien
      const midPoint = {
        x: (startCoords.x + endCoords.x) / 2,
        y: (startCoords.y + endCoords.y) / 2,
      };
      
      // Vektor vom Mittelpunkt zum Positionspunkt
      const dx = positionPoint.x - midPoint.x;
      const dy = positionPoint.y - midPoint.y;
      
      // Projektion auf die Hilfslinieneichtung
      offset = dx * Math.cos(helpLineAngle) + dy * Math.sin(helpLineAngle);
      
      // Mindestabstand
      if (Math.abs(offset) < 20) {
        offset = offset < 0 ? -20 : 20;
      }
    }

    // Berechne die Endpunkte der parallelen Hilfslinien
    // WICHTIG: Beide Hilfslinien haben denselben Winkel für absolute Parallelität
    const helpLine1End = {
      x: startCoords.x + offset * Math.cos(helpLineAngle),
      y: startCoords.y + offset * Math.sin(helpLineAngle),
    };
    const helpLine2End = {
      x: endCoords.x + offset * Math.cos(helpLineAngle), // Exakt gleicher Winkel
      y: endCoords.y + offset * Math.sin(helpLineAngle), // Exakt gleicher Winkel
    };

    // Erstelle parallele Hilfslinien
    const extensionLine1 = new fabric.Line(
      [startCoords.x, startCoords.y, helpLine1End.x, helpLine1End.y],
      {
        stroke: 'black',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        strokeDashArray: [2, 2],
      }
    );

    const extensionLine2 = new fabric.Line(
      [endCoords.x, endCoords.y, helpLine2End.x, helpLine2End.y],
      {
        stroke: 'black',
        strokeWidth: 0.5,
        selectable: false,
        evented: false,
        strokeDashArray: [2, 2],
      }
    );

    // Maßlinie - IMMER gerade zwischen den Endpunkten der Hilfslinien
    const dimensionLine = new fabric.Line(
      [helpLine1End.x, helpLine1End.y, helpLine2End.x, helpLine2End.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }
    );
    
    // Berechne den Winkel der Maßlinie für die Pfeile
    const lineAngle = Math.atan2(
      helpLine2End.y - helpLine1End.y,
      helpLine2End.x - helpLine1End.x
    );

    // Berechne die tatsächlichen Endpunkte der Maßlinie für die Pfeile
    const dimLineStart = { x: dimensionLine.x1!, y: dimensionLine.y1! };
    const dimLineEnd = { x: dimensionLine.x2!, y: dimensionLine.y2! };

    // Pfeile an den Enden der Maßlinie
    const arrow1 = this.createArrow(dimLineStart, lineAngle + Math.PI, 8);
    const arrow2 = this.createArrow(dimLineEnd, lineAngle, 8);

    // Text in der Mitte der Maßlinie
    const textX = (dimLineStart.x + dimLineEnd.x) / 2;
    const textY = (dimLineStart.y + dimLineEnd.y) / 2;

    // Berechne den Textwinkel - Text sollte lesbar sein
    let textAngle = (lineAngle * 180) / Math.PI;
    // Stelle sicher, dass der Text nicht auf dem Kopf steht
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180;
    }

    const text = new fabric.IText(distance, {
      left: textX,
      top: textY,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: 'black',
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      editable: true,
      lockMovementX: true,
      lockMovementY: true,
      hasControls: false,
      hasBorders: false,
      angle: textAngle,
      // backgroundColor: 'white', // Weißer Hintergrund entfernt
      // padding: 2,
    });

    // Speichere Dimensionsdaten mit offset und Orientierung für spätere Updates
    const dimensionData: DimensionData = {
      startAnchor: startPoint,
      endAnchor: endPoint,
      extensionLine1,
      extensionLine2,
      dimensionLine,
      arrow1,
      arrow2,
      text,
      offset,
    };
    // Speichere ISO-spezifische Daten
    (dimensionData as any).isIsoDimension = true;
    (dimensionData as any).isoOrientation = this.isoHelpLineOrientation;
    (dimensionData as any).isoOffset = offset;
    
    this.dimensions.push(dimensionData);

    // Generiere einzigartige Dimension ID
    const dimensionId = `dimension_${Date.now()}_${Math.random()}`;
    
    // Setze gemeinsame Eigenschaften für alle Teile
    [extensionLine1, extensionLine2, dimensionLine, arrow1, arrow2].forEach(element => {
      (element as any).dimensionId = dimensionId;
      (element as any).isDimensionPart = true;
      element.set({
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        hasControls: false,
        hasBorders: false
      });
    });
    
    // Text separat behandeln (selektierbar für Bearbeitung)
    (text as any).dimensionId = dimensionId;
    (text as any).isDimensionPart = true;

    // Füge alle Elemente zum Canvas hinzu
    canvas.add(extensionLine1, extensionLine2, dimensionLine, arrow1, arrow2, text);
    
    // Stelle sicher, dass Position immer gesperrt bleibt
    text.on('editing:exited', () => {
      text.set({
        lockMovementX: true,
        lockMovementY: true
      });
      canvas.requestRenderAll();
    });

    // Berechne die Breite des Texts
    const textBounds = text.getBoundingRect();
    const textWidth = textBounds.width + 10; // Extra Padding

    // Teile die Maßlinie in zwei Segmente mit Lücke für Text
    canvas.remove(dimensionLine);
    
    // Berechne die Punkte für die Linienunterbrechung entlang der Maßlinie
    const textGap = textWidth / 2 + 5; // Extra padding um den Text
    const dx = Math.cos(lineAngle) * textGap;
    const dy = Math.sin(lineAngle) * textGap;
    
    const leftLine = new fabric.Line(
      [dimLineStart.x, dimLineStart.y, textX - dx, textY - dy],
      {
        stroke: '#0066cc',
        strokeWidth: 2,
        selectable: false,
        evented: true,  // Events aktivieren für ISO-Dimension
        hoverCursor: 'move',
        moveCursor: 'move'
      }
    );
    (leftLine as any).dimensionId = dimensionId;
    (leftLine as any).isDimensionPart = true;
    
    const rightLine = new fabric.Line(
      [textX + dx, textY + dy, dimLineEnd.x, dimLineEnd.y],
      {
        stroke: '#0066cc',
        strokeWidth: 2,
        selectable: false,
        evented: true,  // Events aktivieren für ISO-Dimension
        hoverCursor: 'move',
        moveCursor: 'move'
      }
    );
    (rightLine as any).dimensionId = dimensionId;
    (rightLine as any).isDimensionPart = true;
    
    canvas.add(leftLine, rightLine);
    
    // Event-Handler für beide ISO-Dimensions-Linien hinzufügen
    this.setupIsoDimensionLineEvents(canvas, dimensionData, leftLine, rightLine);
    
    // Speichere beide Linien für spätere Verwendung
    dimensionData.dimensionLine = leftLine;
    (dimensionData as any).rightLine = rightLine;
    
    // Füge Interaktionsfunktionalität NACH dem Erstellen der geteilten Linien hinzu
    this.createDimensionInteractionGroup(canvas, dimensionData);

    // Text in den Vordergrund bringen
    canvas.bringObjectToFront(text);

    // Position sperren nach dem Editieren
    text.on('editing:exited', () => {
      text.set({
        lockMovementX: true,
        lockMovementY: true
      });
      
      // Aktualisiere die Linienunterbrechung basierend auf neuer Textbreite
      const newTextBounds = text.getBoundingRect();
      const newTextWidth = newTextBounds.width + 10;
      
      // Entferne alte Linien und erstelle neue mit angepasster Lücke
      // (Implementierung würde hier folgen, aber für Einfachheit belassen wir es so)
      
      canvas.requestRenderAll();
    });

    // Füge Interaktionsfunktionalität für ISO-Bemaßung hinzu
    this.createDimensionInteractionGroup(canvas, dimensionData);

    canvas.requestRenderAll();
  }

  private createIsoDimensionPreview(canvas: fabric.Canvas): void {
    if (!this.firstAnchorPoint || !this.secondAnchorPoint) return;
    
    console.log('Erstelle ISO-Vorschau mit Ausrichtung:', this.isoHelpLineOrientation);
    
    // Entferne alte Vorschau
    if (this.previewDimension.length > 0) {
      this.previewDimension.forEach(obj => canvas.remove(obj));
      this.previewDimension = [];
    }
    
    const startCoords = {
      x: this.firstAnchorPoint.left as number,
      y: this.firstAnchorPoint.top as number,
    };
    const endCoords = {
      x: this.secondAnchorPoint.left as number,
      y: this.secondAnchorPoint.top as number,
    };
    
    const distance = Math.sqrt(
      Math.pow(endCoords.x - startCoords.x, 2) +
      Math.pow(endCoords.y - startCoords.y, 2)
    ).toFixed(2);
    
    const offset = 40;
    let helpLineAngle: number;
    
    switch (this.isoHelpLineOrientation) {
      case 'vertical':
        helpLineAngle = -Math.PI / 2;
        break;
      case '30deg':
        helpLineAngle = -Math.PI / 6;
        break;
      case '150deg':
        helpLineAngle = -(5 * Math.PI) / 6;
        break;
      default:
        helpLineAngle = -Math.PI / 2;
    }
    
    // Erstelle Vorschau-Elemente
    const elements: fabric.Object[] = [];
    
    // Hilfslinien
    const helpLine1End = {
      x: startCoords.x + offset * Math.cos(helpLineAngle),
      y: startCoords.y + offset * Math.sin(helpLineAngle),
    };
    const helpLine2End = {
      x: endCoords.x + offset * Math.cos(helpLineAngle),
      y: endCoords.y + offset * Math.sin(helpLineAngle),
    };
    
    const extensionLine1 = new fabric.Line(
      [startCoords.x, startCoords.y, helpLine1End.x, helpLine1End.y],
      {
        stroke: '#808080',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        opacity: 0.8,
      }
    );
    elements.push(extensionLine1);
    
    const extensionLine2 = new fabric.Line(
      [endCoords.x, endCoords.y, helpLine2End.x, helpLine2End.y],
      {
        stroke: '#808080',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        opacity: 0.8,
      }
    );
    elements.push(extensionLine2);
    
    // Maßlinie
    const dimensionLine = new fabric.Line(
      [helpLine1End.x, helpLine1End.y, helpLine2End.x, helpLine2End.y],
      {
        stroke: '#808080',
        strokeWidth: 2,
        opacity: 0.8,
      }
    );
    elements.push(dimensionLine);
    
    // Text
    const textX = (helpLine1End.x + helpLine2End.x) / 2;
    const textY = (helpLine1End.y + helpLine2End.y) / 2;
    const lineAngle = Math.atan2(helpLine2End.y - helpLine1End.y, helpLine2End.x - helpLine1End.x);
    let textAngle = (lineAngle * 180) / Math.PI;
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180;
    }
    
    const text = new fabric.Text(distance, {
      left: textX,
      top: textY,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#808080',
      originX: 'center',
      originY: 'center',
      angle: textAngle,
      // backgroundColor: 'rgba(255, 255, 255, 0.8)', // Weißer Hintergrund entfernt
      // padding: 2,
    });
    elements.push(text);
    
    // Füge alle Elemente zur Canvas hinzu
    elements.forEach(el => {
      el.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });
      canvas.add(el);
      canvas.bringObjectToFront(el);
    });
    
    // Speichere Referenz zu Vorschau-Elementen
    this.previewDimension = elements;
    
    canvas.requestRenderAll();
  }
  
  private updateIsoDimensionPreview(canvas: fabric.Canvas): void {
    console.log('Update ISO-Vorschau');
    // Einfach neu erstellen
    this.createIsoDimensionPreview(canvas);
  }
  
  private updateIsoDimensionPreviewWithPosition(canvas: fabric.Canvas, positionPoint: { x: number; y: number }): void {
    if (!this.firstAnchorPoint || !this.secondAnchorPoint) return;
    
    // Entferne alte Vorschau
    if (this.previewDimension.length > 0) {
      this.previewDimension.forEach(obj => canvas.remove(obj));
      this.previewDimension = [];
    }
    
    const startCoords = {
      x: this.firstAnchorPoint.left as number,
      y: this.firstAnchorPoint.top as number,
    };
    const endCoords = {
      x: this.secondAnchorPoint.left as number,
      y: this.secondAnchorPoint.top as number,
    };
    
    const distance = Math.sqrt(
      Math.pow(endCoords.x - startCoords.x, 2) +
      Math.pow(endCoords.y - startCoords.y, 2)
    ).toFixed(2);
    
    // Bestimme Hilfslinienewinkel basierend auf Ausrichtung
    let helpLineAngle: number;
    switch (this.isoHelpLineOrientation) {
      case 'vertical':
        helpLineAngle = -Math.PI / 2;
        break;
      case '30deg':
        helpLineAngle = -Math.PI / 6;
        break;
      case '150deg':
        helpLineAngle = -(5 * Math.PI) / 6;
        break;
      default:
        helpLineAngle = -Math.PI / 2;
    }
    
    // Berechne dynamischen Offset basierend auf Mausposition
    const midPoint = {
      x: (startCoords.x + endCoords.x) / 2,
      y: (startCoords.y + endCoords.y) / 2,
    };
    
    const dx = positionPoint.x - midPoint.x;
    const dy = positionPoint.y - midPoint.y;
    
    let offset = dx * Math.cos(helpLineAngle) + dy * Math.sin(helpLineAngle);
    
    // Mindestabstand
    if (Math.abs(offset) < 20) {
      offset = offset < 0 ? -20 : 20;
    }
    
    // Erstelle Vorschau-Elemente
    const elements: fabric.Object[] = [];
    
    // Hilfslinien mit dynamischem Offset
    const helpLine1End = {
      x: startCoords.x + offset * Math.cos(helpLineAngle),
      y: startCoords.y + offset * Math.sin(helpLineAngle),
    };
    const helpLine2End = {
      x: endCoords.x + offset * Math.cos(helpLineAngle),
      y: endCoords.y + offset * Math.sin(helpLineAngle),
    };
    
    const extensionLine1 = new fabric.Line(
      [startCoords.x, startCoords.y, helpLine1End.x, helpLine1End.y],
      {
        stroke: '#808080',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        opacity: 0.8,
      }
    );
    elements.push(extensionLine1);
    
    const extensionLine2 = new fabric.Line(
      [endCoords.x, endCoords.y, helpLine2End.x, helpLine2End.y],
      {
        stroke: '#808080',
        strokeWidth: 1,
        strokeDashArray: [3, 3],
        opacity: 0.8,
      }
    );
    elements.push(extensionLine2);
    
    // Maßlinie
    const dimensionLine = new fabric.Line(
      [helpLine1End.x, helpLine1End.y, helpLine2End.x, helpLine2End.y],
      {
        stroke: '#808080',
        strokeWidth: 2,
        opacity: 0.8,
      }
    );
    elements.push(dimensionLine);
    
    // Text
    const textX = (helpLine1End.x + helpLine2End.x) / 2;
    const textY = (helpLine1End.y + helpLine2End.y) / 2;
    const lineAngle = Math.atan2(helpLine2End.y - helpLine1End.y, helpLine2End.x - helpLine1End.x);
    let textAngle = (lineAngle * 180) / Math.PI;
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180;
    }
    
    const text = new fabric.Text(distance, {
      left: textX,
      top: textY,
      fontSize: 16,
      fontFamily: 'Arial',
      fill: '#808080',
      originX: 'center',
      originY: 'center',
      angle: textAngle,
      // backgroundColor: 'rgba(255, 255, 255, 0.8)', // Weißer Hintergrund entfernt
      // padding: 2,
    });
    elements.push(text);
    
    // Füge alle Elemente zur Canvas hinzu
    elements.forEach(el => {
      el.set({
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      });
      canvas.add(el);
      canvas.bringObjectToFront(el);
    });
    
    // Speichere Referenz zu Vorschau-Elementen
    this.previewDimension = elements;
    
    canvas.requestRenderAll();
  }

  private getArrowPath(point: { x: number; y: number }, angle: number, size: number): any[] {
    const headLength = size;
    const headAngle = Math.PI / 6;
    
    // Berechne Pfeilkopf-Punkte (gleiche Logik wie createArrow)
    const x1 = point.x - headLength * Math.cos(angle - headAngle);
    const y1 = point.y - headLength * Math.sin(angle - headAngle);
    const x2 = point.x - headLength * Math.cos(angle + headAngle);
    const y2 = point.y - headLength * Math.sin(angle + headAngle);
    
    return [
      ['M', x1, y1],
      ['L', point.x, point.y],
      ['L', x2, y2],
    ];
  }

  private createArrow(point: { x: number; y: number }, angle: number, size: number): fabric.Path {
    const headLength = size;
    const headAngle = Math.PI / 6; // 30 Grad

    const x1 = point.x - headLength * Math.cos(angle - headAngle);
    const y1 = point.y - headLength * Math.sin(angle - headAngle);
    const x2 = point.x - headLength * Math.cos(angle + headAngle);
    const y2 = point.y - headLength * Math.sin(angle + headAngle);

    const pathString = `M ${x1} ${y1} L ${point.x} ${point.y} L ${x2} ${y2}`;
    
    const arrow = new fabric.Path(pathString, {
      stroke: 'black',
      strokeWidth: 1.5,
      fill: 'black',
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
      lockMovementX: true,
      lockMovementY: true,
    });
    
    // Markiere explizit als Pfeil für spätere Identifikation
    (arrow as any).isArrow = true;
    
    return arrow;
  }

  private createDimensionInteractionGroup(canvas: fabric.Canvas, dimensionData: DimensionData): void {
    let startOffset = dimensionData.offset;
    let startMousePos: { x: number; y: number } | null = null;
    
    // ABSOLUTER SCHUTZ: Setze preserveObjectStacking
    canvas.preserveObjectStacking = true;

    // Berechne Winkel und Positionen
    const angle = Math.atan2(
      dimensionData.endAnchor.top! - dimensionData.startAnchor.top!,
      dimensionData.endAnchor.left! - dimensionData.startAnchor.left!
    );
    
    // Für ISO-Bemaßungen verwenden wir den festen ISO-Winkel
    let perpendicularAngle: number;
    if ((dimensionData as any).isIsoDimension) {
      const isoOrientation = (dimensionData as any).isoOrientation || 'vertical';
      switch (isoOrientation) {
        case 'vertical':
          perpendicularAngle = -Math.PI / 2;
          break;
        case '30deg':
          perpendicularAngle = -Math.PI / 6;
          break;
        case '150deg':
          perpendicularAngle = -(5 * Math.PI) / 6;
          break;
        default:
          perpendicularAngle = -Math.PI / 2;
      }
    } else {
      perpendicularAngle = angle + Math.PI / 2;
    }

    const extLine1_end = {
      x: dimensionData.startAnchor.left! + dimensionData.offset * Math.cos(perpendicularAngle),
      y: dimensionData.startAnchor.top! + dimensionData.offset * Math.sin(perpendicularAngle),
    };
    const extLine2_end = {
      x: dimensionData.endAnchor.left! + dimensionData.offset * Math.cos(perpendicularAngle),
      y: dimensionData.endAnchor.top! + dimensionData.offset * Math.sin(perpendicularAngle),
    };

    const lineCenterX = (extLine1_end.x + extLine2_end.x) / 2;
    const lineCenterY = (extLine1_end.y + extLine2_end.y) / 2;
    
    // Verschiebe den Button nach rechts vom Text
    const buttonOffset = 60; // Größerer Abstand nach rechts
    const buttonX = lineCenterX + buttonOffset * Math.cos(angle);
    const buttonY = lineCenterY + buttonOffset * Math.sin(angle);

    // Erstelle einen ROTEN Kontroll-Button (initial unsichtbar)
    const controlButton = new fabric.Circle({
      left: buttonX,
      top: buttonY,
      radius: 3,
      originX: 'center',
      originY: 'center',
      fill: '#ff0000',
      stroke: '#8b0000',
      strokeWidth: 2,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      cursor: 'move',
      hoverCursor: 'move',
      customType: 'dimensionControl',
      opacity: 0, // Initial unsichtbar
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 8,
        offsetX: 2,
        offsetY: 2
      })
    });

    // Füge ein Icon in den Button (4 Pfeile)
    const iconSize = 4;
    const arrows = new fabric.Group([
      // Pfeil nach oben
      new fabric.Path(`M 0 ${-iconSize} L ${-iconSize/2} 0 L ${iconSize/2} 0 Z`, {
        fill: 'white',
        originX: 'center',
        originY: 'center'
      }),
      // Pfeil nach unten
      new fabric.Path(`M 0 ${iconSize} L ${-iconSize/2} 0 L ${iconSize/2} 0 Z`, {
        fill: 'white',
        originX: 'center',
        originY: 'center',
        angle: 180
      })
    ], {
      left: buttonX,
      top: buttonY,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      opacity: 0, // Initial unsichtbar
      // customType: 'dimensionControlIcon'
    });

    // Markiere beide mit der Dimension ID
    const dimensionId = (dimensionData as any).dimensionId;
    (controlButton as any).dimensionId = dimensionId;
    (controlButton as any).isDimensionPart = true;
    (arrows as any).dimensionId = dimensionId;
    (arrows as any).isDimensionPart = true;

    // Speichere die Controls
    (dimensionData as any).controlButton = controlButton;
    (dimensionData as any).controlIcon = arrows;
    
    // Erstelle einen transparenten Blocker über der gesamten Dimension
    // Reduzierter Padding-Bereich für bessere Präzision
    const padding = 10; // Vorher 50
    const blocker = new fabric.Rect({
      left: Math.min(dimensionData.startAnchor.left!, dimensionData.endAnchor.left!, extLine1_end.x, extLine2_end.x) - padding,
      top: Math.min(dimensionData.startAnchor.top!, dimensionData.endAnchor.top!, extLine1_end.y, extLine2_end.y) - padding,
      width: Math.abs(Math.max(dimensionData.startAnchor.left!, dimensionData.endAnchor.left!, extLine1_end.x, extLine2_end.x) - 
              Math.min(dimensionData.startAnchor.left!, dimensionData.endAnchor.left!, extLine1_end.x, extLine2_end.x)) + (padding * 2),
      height: Math.abs(Math.max(dimensionData.startAnchor.top!, dimensionData.endAnchor.top!, extLine1_end.y, extLine2_end.y) - 
               Math.min(dimensionData.startAnchor.top!, dimensionData.endAnchor.top!, extLine1_end.y, extLine2_end.y)) + (padding * 2),
      fill: 'transparent',
      stroke: 'transparent',
      selectable: false,
      evented: true,
      hasControls: false,
      hasBorders: false,
      customType: 'dimensionBlocker'
    });
    
    (blocker as any).dimensionId = dimensionId;
    (blocker as any).isDimensionPart = true;
    
    // Blocker ermöglicht Verschieben der Bemaßung über die gesamte Linie
    blocker.on('mousedown', (e) => {
      // Prüfe ob der Klick über dem Text ist
      const pointer = canvas.getPointer(e.e);
      const textBounds = dimensionData.text.getBoundingRect();
      
      if (pointer.x >= textBounds.left && pointer.x <= textBounds.left + textBounds.width &&
          pointer.y >= textBounds.top && pointer.y <= textBounds.top + textBounds.height) {
        // Klick ist über dem Text - lass es durch
        return;
      }
      
      // Prüfe ob die Maus nahe der Bemaßungslinie ist
      const distToLine = this.getDistanceToLine(pointer, extLine1_end, extLine2_end);
      
      // Nur Drag-Handling wenn nahe der Linie (15 Pixel Toleranz)
      if (distToLine < 15) {
        startMousePos = null;
        startOffset = dimensionData.offset;
        
        const mouseMoveHandler = (e: any) => {
          handleDimensionDrag(e);
        };
        
        const mouseUpHandler = () => {
          canvas.off('mouse:move', mouseMoveHandler);
          canvas.off('mouse:up', mouseUpHandler);
          startMousePos = null;
        };
        
        canvas.on('mouse:move', mouseMoveHandler);
        canvas.on('mouse:up', mouseUpHandler);
        
        e.e.preventDefault();
        e.e.stopPropagation();
        return false;
      }
      
      e.e.preventDefault();
      e.e.stopPropagation();
      return false;
    });
    
    // Hover-Effekte für den Blocker (zeigt/versteckt den Button und hebt Linie hervor)
    blocker.on('mouseover', (e) => {
      console.log('🔍 Blocker mouseover triggered');
      // Prüfe ob die Maus nahe der Bemaßungslinie ist
      const pointer = canvas.getPointer(e.e);
      const distToLine = this.getDistanceToLine(pointer, extLine1_end, extLine2_end);
      
      console.log('📏 Distance to line:', distToLine, 'Pointer:', pointer);
      
      // Nur aktivieren wenn nahe der Linie (15 Pixel Toleranz)
      if (distToLine < 15) {
        console.log('✅ Within tolerance - highlighting line RED');
        controlButton.set('opacity', 1);
        arrows.set('opacity', 1);
        
        // Färbe die Bemaßungslinie rot
        dimensionData.dimensionLine.set({
          stroke: '#ff0000',
          strokeWidth: 2
        });
        
        // Wenn es eine rechte Linie gibt, färbe auch diese rot
        if ((dimensionData as any).rightLine) {
          console.log('🔴 Also highlighting right line RED');
          ((dimensionData as any).rightLine as fabric.Line).set({
            stroke: '#ff0000',
            strokeWidth: 2
          });
        }
        
        canvas.renderAll();
      } else {
        console.log('❌ Outside tolerance - no highlight');
      }
    });
    
    blocker.on('mouseout', () => {
      controlButton.set('opacity', 0);
      arrows.set('opacity', 0);
      
      // Setze Bemaßungslinie zurück auf normale Farbe
      dimensionData.dimensionLine.set({
        stroke: 'black',
        strokeWidth: 1
      });
      
      // Wenn es eine rechte Linie gibt, setze auch diese zurück
      if ((dimensionData as any).rightLine) {
        ((dimensionData as any).rightLine as fabric.Line).set({
          stroke: 'black',
          strokeWidth: 1
        });
      }
      
      canvas.renderAll();
    });
    
    // BLOCKER DEAKTIVIERT - Wir verwenden jetzt direkte Events auf der Dimensionslinie
    // canvas.add(blocker);
    canvas.add(dimensionData.text);
    canvas.add(controlButton, arrows);
    
    // Control Button und Arrows sind automatisch oben, da sie zuletzt hinzugefügt wurden

    // Handler für das Verschieben
    const handleDimensionDrag = (e: any) => {
      if (!startMousePos) {
        startMousePos = canvas.getPointer(e.e);
        return;
      }

      const currentMousePos = canvas.getPointer(e.e);
      const midPoint = {
        x: (dimensionData.startAnchor.left! + dimensionData.endAnchor.left!) / 2,
        y: (dimensionData.startAnchor.top! + dimensionData.endAnchor.top!) / 2
      };

      // Berechne die Bewegung entlang der senkrechten Achse
      const dx = currentMousePos.x - startMousePos.x;
      const dy = currentMousePos.y - startMousePos.y;
      const projection = dx * Math.cos(perpendicularAngle) + dy * Math.sin(perpendicularAngle);
      
      dimensionData.offset = startOffset + projection;
      dimensionData.offset = Math.max(15, Math.abs(dimensionData.offset)) * Math.sign(dimensionData.offset || 1);
      
      this.updateDimensionPosition(canvas, dimensionData);
      
      // Update Control Button Position
      const newExtLine1_end = {
        x: dimensionData.startAnchor.left! + dimensionData.offset * Math.cos(perpendicularAngle),
        y: dimensionData.startAnchor.top! + dimensionData.offset * Math.sin(perpendicularAngle),
      };
      const newExtLine2_end = {
        x: dimensionData.endAnchor.left! + dimensionData.offset * Math.cos(perpendicularAngle),
        y: dimensionData.endAnchor.top! + dimensionData.offset * Math.sin(perpendicularAngle),
      };
      
      const newLineCenterX = (newExtLine1_end.x + newExtLine2_end.x) / 2;
      const newLineCenterY = (newExtLine1_end.y + newExtLine2_end.y) / 2;
      
      // Button weiter rechts positionieren
      const newButtonX = newLineCenterX + 60 * Math.cos(angle);
      const newButtonY = newLineCenterY + 60 * Math.sin(angle);
      
      const controlBtn = (dimensionData as any).controlButton;
      const controlIcn = (dimensionData as any).controlIcon;
      
      if (controlBtn) {
        controlBtn.set({
          left: newButtonX,
          top: newButtonY
        });
      }
      
      if (controlIcn) {
        controlIcn.set({
          left: newButtonX,
          top: newButtonY
        });
      }
    };

    // Event Handler für den Control Button
    controlButton.on('mousedown', () => {
      startMousePos = null;
      startOffset = dimensionData.offset;
      
      const mouseMoveHandler = (e: any) => {
        handleDimensionDrag(e);
      };
      
      const mouseUpHandler = () => {
        canvas.off('mouse:move', mouseMoveHandler);
        canvas.off('mouse:up', mouseUpHandler);
        startMousePos = null;
      };
      
      canvas.on('mouse:move', mouseMoveHandler);
      canvas.on('mouse:up', mouseUpHandler);
    });

    // Hover-Effekte für Control Button
    controlButton.on('mouseover', () => {
      controlButton.set({
        fill: '#ff6666',
        strokeWidth: 3,
        radius: 6
      });
      dimensionData.dimensionLine.set({
        stroke: '#ff0000',
        strokeWidth: 2
      });
      // Wenn es eine rechte Linie gibt, färbe auch diese rot
      if ((dimensionData as any).rightLine) {
        ((dimensionData as any).rightLine as fabric.Line).set({
          stroke: '#ff0000',
          strokeWidth: 2
        });
      }
      canvas.renderAll();
    });

    controlButton.on('mouseout', () => {
      controlButton.set({
        fill: '#ff0000',
        strokeWidth: 2,
        radius: 5
      });
      dimensionData.dimensionLine.set({
        stroke: 'black',
        strokeWidth: 1
      });
      // Wenn es eine rechte Linie gibt, setze auch diese zurück
      if ((dimensionData as any).rightLine) {
        ((dimensionData as any).rightLine as fabric.Line).set({
          stroke: 'black',
          strokeWidth: 1
        });
      }
      canvas.renderAll();
    });
  }

  private calculateDimensionBounds(dimensionData: DimensionData): {left: number, top: number, width: number, height: number} {
    const padding = 10;
    const points = [
      { x: dimensionData.startAnchor.left!, y: dimensionData.startAnchor.top! },
      { x: dimensionData.endAnchor.left!, y: dimensionData.endAnchor.top! },
      { x: dimensionData.text.left!, y: dimensionData.text.top! }
    ];

    const minX = Math.min(...points.map(p => p.x)) - padding;
    const maxX = Math.max(...points.map(p => p.x)) + padding;
    const minY = Math.min(...points.map(p => p.y)) - padding;
    const maxY = Math.max(...points.map(p => p.y)) + padding;

    return {
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  public setupIsoDimensionLineEvents(canvas: fabric.Canvas, dimensionData: DimensionData, leftLine: fabric.Line, rightLine: fabric.Line): void {
    // Event-Handler für beide Linien der ISO-Dimension
    [leftLine, rightLine].forEach(line => {
      let startMousePos: { x: number; y: number } | null = null;
      let startOffset = dimensionData.offset;
      
      // Hover-Event für rote Hervorhebung
      line.on('mouseover', () => {
        console.log('🔍 ISO dimension line mouseover triggered');
        
        // Beide Linien rot hervorheben
        leftLine.set({
          stroke: 'red',
          strokeWidth: 3
        });
        rightLine.set({
          stroke: 'red',
          strokeWidth: 3
        });
        canvas.requestRenderAll();
        console.log('✅ ISO lines highlighted RED');
      });
      
      // Mouseout-Event um normale Farbe wiederherzustellen
      line.on('mouseout', () => {
        console.log('👋 ISO dimension line mouseout');
        
        // Beide Linien zurücksetzen
        leftLine.set({
          stroke: '#0066cc',
          strokeWidth: 2
        });
        rightLine.set({
          stroke: '#0066cc',
          strokeWidth: 2
        });
        canvas.requestRenderAll();
      });
      
      // Mousedown für Drag-Funktionalität
      line.on('mousedown', (e) => {
        console.log('🖱️ ISO dimension line mousedown for drag');
        startMousePos = canvas.getPointer(e.e);
        startOffset = dimensionData.offset;
        
        // Deaktiviere Canvas-Selection während des Drags
        const previousSelection = canvas.selection;
        canvas.selection = false;
        
        const mouseMoveHandler = (e: any) => {
          if (!startMousePos) return;
          
          const currentPos = canvas.getPointer(e.e);
          
          // Position der Ankerpunkte
          const startCoords = {
            x: dimensionData.startAnchor.left as number,
            y: dimensionData.startAnchor.top as number,
          };
          const endCoords = {
            x: dimensionData.endAnchor.left as number,
            y: dimensionData.endAnchor.top as number,
          };
          
          // Für ISO-Dimensionen: Berechne basierend auf der gespeicherten Orientierung
          const orientation = (dimensionData as any).isoOrientation || 'vertical';
          const midPoint = {
            x: (startCoords.x + endCoords.x) / 2,
            y: (startCoords.y + endCoords.y) / 2,
          };
          
          let helpLineAngle: number;
          switch (orientation) {
            case 'vertical':
              helpLineAngle = -Math.PI / 2; // 90 Grad nach oben
              break;
            case '30deg':
              helpLineAngle = -Math.PI / 6; // 30 Grad
              break;
            case '150deg':
              helpLineAngle = -(5 * Math.PI) / 6; // 150 Grad
              break;
            default:
              helpLineAngle = -Math.PI / 2;
          }
          
          // Berechne den Offset basierend auf der Orientierung
          const dx = currentPos.x - midPoint.x;
          const dy = currentPos.y - midPoint.y;
          const newOffset = dx * Math.cos(helpLineAngle) + dy * Math.sin(helpLineAngle);
          
          // Mindestabstand beibehalten
          const finalOffset = Math.abs(newOffset) < 20 ? (newOffset < 0 ? -20 : 20) : newOffset;
          
          dimensionData.offset = finalOffset;
          (dimensionData as any).isoOffset = finalOffset;
          this.updateIsoDimensionPosition(canvas, dimensionData);
          
          console.log('📏 Dragging ISO dimension with orientation:', orientation, ', new offset:', finalOffset);
        };
        
        const mouseUpHandler = () => {
          console.log('🔄 ISO dimension drag ended');
          startMousePos = null;
          canvas.off('mouse:move', mouseMoveHandler);
          canvas.off('mouse:up', mouseUpHandler);
          
          // Stelle Canvas-Selection wieder her
          canvas.selection = previousSelection;
        };
        
        canvas.on('mouse:move', mouseMoveHandler);
        canvas.on('mouse:up', mouseUpHandler);
        
        e.e.preventDefault();
        e.e.stopPropagation();
      });
    });
  }

  public setupDimensionLineEvents(canvas: fabric.Canvas, dimensionData: DimensionData, dimensionLine: fabric.Path | fabric.Line): void {
    let startMousePos: { x: number; y: number } | null = null;
    let startOffset = dimensionData.offset;

    // Hover-Event für rote Hervorhebung
    dimensionLine.on('mouseover', () => {
      console.log('🔍 Direct dimension line mouseover triggered');
      
      // Färbe die Dimensionslinie rot
      dimensionLine.set({
        stroke: 'red',
        strokeWidth: 3
      });
      canvas.requestRenderAll();
      console.log('✅ Line highlighted RED directly');
    });

    // Mouseout-Event um normale Farbe wiederherzustellen
    dimensionLine.on('mouseout', () => {
      console.log('👋 Dimension line mouseout');
      
      // Setze Bemaßungslinie zurück auf normale Farbe
      dimensionLine.set({
        stroke: '#0066cc',
        strokeWidth: 2
      });
      canvas.requestRenderAll();
    });

    // Mousedown für Drag-Funktionalität
    dimensionLine.on('mousedown', (e) => {
      console.log('🖱️ Dimension line mousedown for drag');
      startMousePos = canvas.getPointer(e.e);
      startOffset = dimensionData.offset;
      
      // Deaktiviere Canvas-Selection während des Drags
      const previousSelection = canvas.selection;
      canvas.selection = false;
      
      const mouseMoveHandler = (e: any) => {
        if (!startMousePos) return;
        
        const currentPos = canvas.getPointer(e.e);
        
        // Position der Ankerpunkte
        const startCoords = {
          x: dimensionData.startAnchor.left as number,
          y: dimensionData.startAnchor.top as number,
        };
        const endCoords = {
          x: dimensionData.endAnchor.left as number,
          y: dimensionData.endAnchor.top as number,
        };
        
        // Berechne den senkrechten Abstand der Maus zur Basislinie
        // Formel: Abstand = (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)) / sqrt((by - cy)^2 + (cx - bx)^2)
        const dx = endCoords.x - startCoords.x;
        const dy = endCoords.y - startCoords.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        
        if (lineLength === 0) return; // Verhindere Division durch 0
        
        // Berechne den vorzeichenbehafteten Abstand (positiv = rechts/oben, negativ = links/unten)
        const signedDistance = ((currentPos.x - startCoords.x) * dy - (currentPos.y - startCoords.y) * dx) / lineLength;
        
        // Der neue Offset ist einfach der Abstand zur Basislinie
        const newOffset = signedDistance;
        
        // Aktualisiere die Dimension mit dem neuen Offset
        this.updateDimensionWithOffset(canvas, dimensionData, newOffset);
        
        console.log('📏 Dragging dimension, new offset:', newOffset);
      };
      
      const mouseUpHandler = () => {
        console.log('🔄 Dimension drag ended');
        startMousePos = null;
        canvas.off('mouse:move', mouseMoveHandler);
        canvas.off('mouse:up', mouseUpHandler);
        
        // Stelle Canvas-Selection wieder her
        canvas.selection = previousSelection;
      };
      
      canvas.on('mouse:move', mouseMoveHandler);
      canvas.on('mouse:up', mouseUpHandler);
      
      e.e.preventDefault();
      e.e.stopPropagation();
    });
  }

  public updateDimensionWithOffset(canvas: fabric.Canvas, dimensionData: DimensionData, newOffset: number): void {
    // Aktualisiere den Offset und triggere eine Neupositionierung
    dimensionData.offset = newOffset;
    this.updateDimensionPosition(canvas, dimensionData);
  }

  private setupAnchorListeners(canvas: fabric.Canvas, dimensionData: DimensionData): void {
    // Überwache Änderungen an den Ankerpunkten
    const updateDimension = () => {
      this.updateDimensionPosition(canvas, dimensionData);
    };

    // Füge Event-Listener für Bewegungen hinzu
    dimensionData.startAnchor.on('moving', updateDimension);
    dimensionData.endAnchor.on('moving', updateDimension);
  }

  private updateIsoDimensionPosition(canvas: fabric.Canvas, dimensionData: DimensionData): void {
    const startCoords = {
      x: dimensionData.startAnchor.left as number,
      y: dimensionData.startAnchor.top as number,
    };
    const endCoords = {
      x: dimensionData.endAnchor.left as number,
      y: dimensionData.endAnchor.top as number,
    };

    const distance = Math.sqrt(
      Math.pow(endCoords.x - startCoords.x, 2) +
      Math.pow(endCoords.y - startCoords.y, 2)
    ).toFixed(2);

    // Hole die gespeicherte ISO-Orientierung
    const isoOrientation = (dimensionData as any).isoOrientation || 'vertical';
    let helpLineAngle: number;
    
    switch (isoOrientation) {
      case 'vertical':
        helpLineAngle = -Math.PI / 2;
        break;
      case '30deg':
        helpLineAngle = -Math.PI / 6;
        break;
      case '150deg':
        helpLineAngle = -(5 * Math.PI) / 6;
        break;
      default:
        helpLineAngle = -Math.PI / 2;
    }

    // Verwende den gespeicherten Offset oder berechne ihn neu
    const offset = dimensionData.offset || (dimensionData as any).isoOffset || 40;

    const extLine1_end = {
      x: startCoords.x + offset * Math.cos(helpLineAngle),
      y: startCoords.y + offset * Math.sin(helpLineAngle),
    };
    const extLine2_end = {
      x: endCoords.x + offset * Math.cos(helpLineAngle),
      y: endCoords.y + offset * Math.sin(helpLineAngle),
    };

    // Update Extension Lines
    dimensionData.extensionLine1.set({
      x1: startCoords.x,
      y1: startCoords.y,
      x2: extLine1_end.x,
      y2: extLine1_end.y,
    });

    dimensionData.extensionLine2.set({
      x1: endCoords.x,
      y1: endCoords.y,
      x2: extLine2_end.x,
      y2: extLine2_end.y,
    });

    // Update Dimension Line - wenn es aufgeteilt ist, aktualisiere beide Teile
    if ((dimensionData as any).rightLine) {
      // Die Linie ist in zwei Teile geteilt (mit Lücke für Text)
      const textX = (extLine1_end.x + extLine2_end.x) / 2;
      const textY = (extLine1_end.y + extLine2_end.y) / 2;
      const lineAngle = Math.atan2(extLine2_end.y - extLine1_end.y, extLine2_end.x - extLine1_end.x);
      
      // Berechne die Lücke für den Text
      const textWidth = 60; // Geschätzte Textbreite
      const textGap = textWidth / 2 + 5;
      const dx = Math.cos(lineAngle) * textGap;
      const dy = Math.sin(lineAngle) * textGap;
      
      // Update linke Linie
      (dimensionData.dimensionLine as fabric.Line).set({
        x1: extLine1_end.x,
        y1: extLine1_end.y,
        x2: textX - dx,
        y2: textY - dy,
      });
      
      // Update rechte Linie
      ((dimensionData as any).rightLine as fabric.Line).set({
        x1: textX + dx,
        y1: textY + dy,
        x2: extLine2_end.x,
        y2: extLine2_end.y,
      });
    } else {
      // Normale durchgehende Linie
      (dimensionData.dimensionLine as fabric.Line).set({
        x1: extLine1_end.x,
        y1: extLine1_end.y,
        x2: extLine2_end.x,
        y2: extLine2_end.y,
      });
    }

    // Update Arrows - Erstelle Pfeile immer neu für korrekte Positionierung
    const lineAngle = Math.atan2(
      extLine2_end.y - extLine1_end.y,
      extLine2_end.x - extLine1_end.x
    );
    
    const dimensionId = (dimensionData.extensionLine1 as any).dimensionId;
    
    // Entferne alte Pfeile immer
    if (dimensionData.arrow1 && canvas.contains(dimensionData.arrow1)) {
      canvas.remove(dimensionData.arrow1);
    }
    if (dimensionData.arrow2 && canvas.contains(dimensionData.arrow2)) {
      canvas.remove(dimensionData.arrow2);
    }
    
    // Erstelle neue Pfeile
    dimensionData.arrow1 = this.createArrow(extLine1_end, lineAngle + Math.PI, 8);
    dimensionData.arrow2 = this.createArrow(extLine2_end, lineAngle, 8);
    
    // Setze Eigenschaften
    (dimensionData.arrow1 as any).dimensionId = dimensionId;
    (dimensionData.arrow2 as any).dimensionId = dimensionId;
    (dimensionData.arrow1 as any).isDimensionPart = true;
    (dimensionData.arrow2 as any).isDimensionPart = true;
    
    dimensionData.arrow1.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });
    dimensionData.arrow2.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });
    
    canvas.add(dimensionData.arrow1, dimensionData.arrow2);

    // Update Text
    const textX = (extLine1_end.x + extLine2_end.x) / 2;
    const textY = (extLine1_end.y + extLine2_end.y) / 2;
    
    let textAngle = (lineAngle * 180) / Math.PI;
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180;
    }

    dimensionData.text.set({
      left: textX,
      top: textY,
      text: distance,
      angle: textAngle,
    });

    // Event-Handler bleiben erhalten - nicht neu anhängen!
    // Die Event-Handler wurden bereits beim Erstellen der Dimension gesetzt
    // und bleiben während des Drag-Vorgangs aktiv
    
    canvas.requestRenderAll();
  }

  private updateDimensionPosition(canvas: fabric.Canvas, dimensionData: DimensionData): void {
    // Prüfe ob es eine ISO-Bemaßung ist
    if ((dimensionData as any).isIsoDimension) {
      this.updateIsoDimensionPosition(canvas, dimensionData);
      return;
    }
    
    const startCoords = {
      x: dimensionData.startAnchor.left as number,
      y: dimensionData.startAnchor.top as number,
    };
    const endCoords = {
      x: dimensionData.endAnchor.left as number,
      y: dimensionData.endAnchor.top as number,
    };

    const distance = Math.sqrt(
      Math.pow(endCoords.x - startCoords.x, 2) +
        Math.pow(endCoords.y - startCoords.y, 2)
    ).toFixed(2);

    const angle = Math.atan2(
      endCoords.y - startCoords.y,
      endCoords.x - startCoords.x
    );
    const perpendicularAngle = angle + Math.PI / 2;

    const extLine1_end = {
      x: startCoords.x + dimensionData.offset * Math.cos(perpendicularAngle),
      y: startCoords.y + dimensionData.offset * Math.sin(perpendicularAngle),
    };
    const extLine2_end = {
      x: endCoords.x + dimensionData.offset * Math.cos(perpendicularAngle),
      y: endCoords.y + dimensionData.offset * Math.sin(perpendicularAngle),
    };

    // Update Extension Lines
    dimensionData.extensionLine1.set({
      x1: startCoords.x,
      y1: startCoords.y,
      x2: extLine1_end.x,
      y2: extLine1_end.y,
    });

    dimensionData.extensionLine2.set({
      x1: endCoords.x,
      y1: endCoords.y,
      x2: extLine2_end.x,
      y2: extLine2_end.y,
    });

    // Update Dimension Line
    if (dimensionData.dimensionLine instanceof fabric.Path) {
      const newPath = `M ${extLine1_end.x} ${extLine1_end.y} L ${extLine2_end.x} ${extLine2_end.y}`;
      dimensionData.dimensionLine.set({
        path: fabric.util.parsePath(newPath)
      });
    } else {
      // Fallback für Line
      (dimensionData.dimensionLine as fabric.Line).set({
        x1: extLine1_end.x,
        y1: extLine1_end.y,
        x2: extLine2_end.x,
        y2: extLine2_end.y,
      });
    }

    // Update Arrows - Entferne die alten Pfeile explizit
    const dimensionId2 = (dimensionData.extensionLine1 as any).dimensionId || 
                        (dimensionData.extensionLine2 as any).dimensionId || 
                        (dimensionData as any).dimensionId ||
                        `dimension_${Date.now()}_${Math.random()}`;
    
    // Entferne alte Pfeile direkt
    if (dimensionData.arrow1) {
      canvas.remove(dimensionData.arrow1);
    }
    if (dimensionData.arrow2) {
      canvas.remove(dimensionData.arrow2);
    }
    
    // Zusätzlich: Finde und entferne ALLE Path-Objekte mit der gleichen dimensionId
    const objectsToRemove: fabric.Object[] = [];
    canvas.getObjects().forEach(obj => {
      if (obj.type === 'path' && (obj as any).dimensionId === dimensionId2) {
        objectsToRemove.push(obj);
      }
    });
    
    objectsToRemove.forEach(obj => {
      canvas.remove(obj);
    });
    
    // Force render nach dem Entfernen
    canvas.renderAll();
    
    // Setze alte Referenzen auf null
    dimensionData.arrow1 = null as any;
    dimensionData.arrow2 = null as any;
    
    dimensionData.arrow1 = this.createArrow(extLine1_end, angle + Math.PI, 8);
    dimensionData.arrow2 = this.createArrow(extLine2_end, angle, 8);
    
    // dimensionId2 wurde bereits oben deklariert
    (dimensionData.arrow1 as any).dimensionId = dimensionId2;
    (dimensionData.arrow1 as any).isDimensionPart = true;
    (dimensionData.arrow2 as any).dimensionId = dimensionId2;
    (dimensionData.arrow2 as any).isDimensionPart = true;
    
    // Setze Eigenschaften für die neuen Pfeile
    dimensionData.arrow1.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });
    dimensionData.arrow2.set({
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false
    });
    
    canvas.add(dimensionData.arrow1, dimensionData.arrow2);

    // Update Text mit fixem Abstand ÜBER der Dimensionslinie und richtigem Winkel
    const textOffset = 10;
    let textAngle = angle * 180 / Math.PI;
    
    // Stelle sicher, dass Text immer leserlich ist
    if (textAngle > 90 || textAngle < -90) {
      textAngle += 180;
    }
    
    const shouldFlip = angle > Math.PI/2 || angle < -Math.PI/2;
    const textPerpAngle = shouldFlip ? perpendicularAngle : perpendicularAngle + Math.PI;
    // Behalte den benutzerdefinierten Text-Wert, falls vorhanden
    const currentText = dimensionData.text.text;
    const textValue = (currentText && currentText !== distance && !isNaN(parseFloat(currentText))) 
      ? currentText 
      : distance;
    
    dimensionData.text.set({
      left: (extLine1_end.x + extLine2_end.x) / 2 + textOffset * Math.cos(textPerpAngle),
      top: (extLine1_end.y + extLine2_end.y) / 2 + textOffset * Math.sin(textPerpAngle),
      text: textValue,
      angle: textAngle
    });

    // Update Control Button und Icon Position
    const controlButton = (dimensionData as any).controlButton;
    const controlIcon = (dimensionData as any).controlIcon;
    
    if (controlButton && controlIcon) {
      const centerX = (extLine1_end.x + extLine2_end.x) / 2;
      const centerY = (extLine1_end.y + extLine2_end.y) / 2;
      
      // Button weiter rechts positionieren
      const buttonX = centerX + 60 * Math.cos(angle);
      const buttonY = centerY + 60 * Math.sin(angle);
      
      controlButton.set({
        left: buttonX,
        top: buttonY
      });
      
      controlIcon.set({
        left: buttonX,
        top: buttonY
      });
    }

    // WICHTIG: Event-Handler nach Update wieder anhängen
    this.reattachDimensionLineEvents(canvas, dimensionData, dimensionData.dimensionLine);
    
    canvas.requestRenderAll();
  }

  // Methode zum erneuten Anhängen der Event-Handler nach Updates
  private reattachDimensionLineEvents(canvas: fabric.Canvas, dimensionData: DimensionData, dimensionLine: fabric.Path | fabric.Line): void {
    // Entferne alte Event-Handler falls vorhanden
    dimensionLine.off('mouseover');
    dimensionLine.off('mouseout');
    dimensionLine.off('mousedown');
    
    // Stelle sicher, dass die Linie Events empfangen kann
    dimensionLine.set({
      selectable: false,
      evented: true,
      hoverCursor: 'move',
      moveCursor: 'move'
    });
    
    // Füge die Event-Handler wieder hinzu
    let startMousePos: { x: number; y: number } | null = null;
    let startOffset = dimensionData.offset;
    
    dimensionLine.on('mouseover', () => {
      console.log('🔍 Dimension line mouseover (reattached)');
      dimensionLine.set({
        stroke: 'red',
        strokeWidth: 3
      });
      canvas.requestRenderAll();
    });
    
    dimensionLine.on('mouseout', () => {
      console.log('👋 Dimension line mouseout (reattached)');
      dimensionLine.set({
        stroke: '#0066cc',
        strokeWidth: 2
      });
      canvas.requestRenderAll();
    });
    
    dimensionLine.on('mousedown', (e) => {
      console.log('🖱️ Dimension line mousedown for drag (reattached)');
      startMousePos = canvas.getPointer(e.e);
      startOffset = dimensionData.offset;
      
      // Deaktiviere Canvas-Selection während des Drags
      const previousSelection = canvas.selection;
      canvas.selection = false;
      
      const mouseMoveHandler = (e: any) => {
        const currentPos = canvas.getPointer(e.e);
        
        // Position der Ankerpunkte
        const startCoords = {
          x: dimensionData.startAnchor.left as number,
          y: dimensionData.startAnchor.top as number,
        };
        const endCoords = {
          x: dimensionData.endAnchor.left as number,
          y: dimensionData.endAnchor.top as number,
        };
        
        // Berechne den senkrechten Abstand der Maus zur Basislinie
        const dx = endCoords.x - startCoords.x;
        const dy = endCoords.y - startCoords.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);
        
        if (lineLength === 0) return; // Verhindere Division durch 0
        
        // Berechne den vorzeichenbehafteten Abstand
        const signedDistance = ((currentPos.x - startCoords.x) * dy - (currentPos.y - startCoords.y) * dx) / lineLength;
        
        const newOffset = signedDistance;
        
        dimensionData.offset = newOffset;
        this.updateDimensionPosition(canvas, dimensionData);
        
        console.log('📏 Dragging dimension (reattached), new offset:', newOffset);
      };
      
      const mouseUpHandler = () => {
        console.log('🔄 Dimension drag ended');
        startMousePos = null;
        canvas.off('mouse:move', mouseMoveHandler);
        canvas.off('mouse:up', mouseUpHandler);
        
        // Stelle Canvas-Selection wieder her
        canvas.selection = previousSelection;
      };
      
      canvas.on('mouse:move', mouseMoveHandler);
      canvas.on('mouse:up', mouseUpHandler);
      
      e.e.preventDefault();
      e.e.stopPropagation();
    });
  }

  // Methode zum Erstellen einer Offset-Steuerung für die Dimension
  public addOffsetControl(canvas: fabric.Canvas, dimensionData: DimensionData): void {
    // Erstelle einen unsichtbaren Control-Punkt für den Offset
    const midPoint = {
      x: (dimensionData.startAnchor.left! + dimensionData.endAnchor.left!) / 2,
      y: (dimensionData.startAnchor.top! + dimensionData.endAnchor.top!) / 2
    };

    const angle = Math.atan2(
      dimensionData.endAnchor.top! - dimensionData.startAnchor.top!,
      dimensionData.endAnchor.left! - dimensionData.startAnchor.left!
    );
    const perpendicularAngle = angle + Math.PI / 2;

    const offsetControl = new fabric.Circle({
      left: midPoint.x + dimensionData.offset * Math.cos(perpendicularAngle),
      top: midPoint.y + dimensionData.offset * Math.sin(perpendicularAngle),
      radius: 2,
      fill: 'transparent',
      stroke: 'blue',
      strokeWidth: 1,
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
      visible: false, // Zunächst unsichtbar
      customType: 'dimensionOffsetControl'
    });

    canvas.add(offsetControl);

    // Handler für das Ziehen des Offset-Controls
    offsetControl.on('moving', () => {
      const newOffset = Math.sqrt(
        Math.pow(offsetControl.left! - midPoint.x, 2) +
        Math.pow(offsetControl.top! - midPoint.y, 2)
      );
      dimensionData.offset = newOffset;
      this.updateDimensionPosition(canvas, dimensionData);
    });
  }

  // Methode zum Aufräumen von Dimensionen beim Löschen von Ankerpunkten
  public cleanupDimensions(canvas: fabric.Canvas, deletedAnchor: fabric.Object): void {
    const dimensionsToRemove: DimensionData[] = [];
    
    this.dimensions.forEach(dimension => {
      if (dimension.startAnchor === deletedAnchor || dimension.endAnchor === deletedAnchor) {
        // Entferne alle Dimension-Elemente
        canvas.remove(
          dimension.extensionLine1,
          dimension.extensionLine2,
          dimension.dimensionLine,
          dimension.arrow1,
          dimension.arrow2,
          dimension.text
        );
        
        // Entferne Controls
        const controlButton = (dimension as any).controlButton;
        const controlIcon = (dimension as any).controlIcon;
        if (controlButton) canvas.remove(controlButton);
        if (controlIcon) canvas.remove(controlIcon);
        
        // Entferne den Blocker
        const dimensionId = (dimension as any).dimensionId;
        const blocker = canvas.getObjects().find(obj => 
          (obj as any).customType === 'dimensionBlocker' && 
          (obj as any).dimensionId === dimensionId
        );
        if (blocker) canvas.remove(blocker);
        
        dimensionsToRemove.push(dimension);
      }
    });

    // Entferne die Dimensionen aus der Liste
    dimensionsToRemove.forEach(dim => {
      const index = this.dimensions.indexOf(dim);
      if (index > -1) {
        this.dimensions.splice(index, 1);
      }
    });
  }

  // Neue Methode zum Löschen von Dimensionen basierend auf Dimension ID
  public deleteDimensionById(canvas: fabric.Canvas, dimensionId: string): void {
    // Finde alle Objekte mit dieser Dimension ID
    const objectsToRemove = canvas.getObjects().filter(obj => 
      (obj as any).dimensionId === dimensionId
    );
    
    // Entferne alle gefundenen Objekte
    objectsToRemove.forEach(obj => canvas.remove(obj));
    
    // Entferne die Dimension aus der internen Liste
    this.dimensions = this.dimensions.filter(dim => 
      (dim as any).dimensionId !== dimensionId
    );
    
    canvas.requestRenderAll();
  }

  // Getter für alle Dimensionen
  public getDimensions(): DimensionData[] {
    return this.dimensions;
  }
  
  // Hilfsfunktion: Berechne Abstand von Punkt zu Linie
  private getDistanceToLine(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): number {
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
  
  // Neue Methode für Bemaßung durch Klick auf Linie oder Pfad
  private createDimensionForLine(canvas: fabric.Canvas, lineOrPath: fabric.Line | fabric.Path, editablePipes: any[], editableLines: any[]): void {
    // Finde die Ankerpunkte dieser Linie/Pfad
    let startAnchor: fabric.Circle | null = null;
    let endAnchor: fabric.Circle | null = null;
    
    // Suche in allen Ankerpunkten
    const allAnchors = canvas.getObjects().filter(obj => 
      obj.type === 'circle' && (obj as any).customType === 'anchorPoint'
    ) as fabric.Circle[];
    
    // Finde die nächsten Ankerpunkte zu den Linien-/Pfadenden
    const tolerance = 10;
    
    // Bestimme Start- und Endpunkte basierend auf Objekttyp
    let startX: number, startY: number, endX: number, endY: number;
    
    if (lineOrPath.type === 'line') {
      const line = lineOrPath as fabric.Line;
      startX = line.x1!;
      startY = line.y1!;
      endX = line.x2!;
      endY = line.y2!;
    } else if (lineOrPath.type === 'path') {
      // Für Pfade, verwende die Bounding Box oder Path-Daten
      const path = lineOrPath as fabric.Path;
      const bounds = path.getBoundingRect();
      // Verwende die linke obere und rechte untere Ecke als Näherung
      startX = bounds.left;
      startY = bounds.top;
      endX = bounds.left + bounds.width;
      endY = bounds.top + bounds.height;
    } else {
      return;
    }
    
    allAnchors.forEach(anchor => {
      const anchorX = anchor.left!;
      const anchorY = anchor.top!;
      
      // Prüfe Abstand zum Start
      const distToStart = Math.sqrt(
        Math.pow(anchorX - startX, 2) + 
        Math.pow(anchorY - startY, 2)
      );
      
      // Prüfe Abstand zum Ende
      const distToEnd = Math.sqrt(
        Math.pow(anchorX - endX, 2) + 
        Math.pow(anchorY - endY, 2)
      );
      
      if (distToStart < tolerance && !startAnchor) {
        startAnchor = anchor;
      }
      if (distToEnd < tolerance && !endAnchor) {
        endAnchor = anchor;
      }
    });
    
    // Wenn beide Ankerpunkte gefunden wurden, erstelle die Bemaßung
    if (startAnchor && endAnchor) {
      if (this.isoDimensionMode) {
        // ISO-Modus: Setze die Ankerpunkte und gehe zum Positionierungs-Schritt
        console.log('ISO-Bemaßung für Linie: Punkte erkannt. TAB-Taste für Ausrichtung, Klick zum Platzieren.');
        this.firstAnchorPoint = startAnchor as fabric.Object;
        this.secondAnchorPoint = endAnchor as fabric.Object;
        this.canvas = canvas;
        this.dimensionStep = 'position';
        this.createIsoDimensionPreview(canvas);
      } else {
        // Normale Bemaßung
        console.log('Erstelle Bemaßung für Linie zwischen zwei Ankerpunkten');
        // Wrap dimension creation in state management
        if (this.stateManagement) {
          this.stateManagement.executeOperation('Add Dimension', () => {
            this.createDimensionVisuals(canvas, startAnchor as fabric.Object, endAnchor as fabric.Object);
          });
        } else {
          this.createDimensionVisuals(canvas, startAnchor as fabric.Object, endAnchor as fabric.Object);
        }
        // Bleibe im Dimension-Modus für weitere Bemaßungen
        this.dimensionStep = 'start';
        this.firstAnchorPoint = null;
      }
    } else {
      console.log('Keine passenden Ankerpunkte für diese Linie gefunden');
    }
    
    // Stelle sicher, dass alle Ankerpunkte sichtbar bleiben
    this.ensureAnchorsAlwaysVisible(canvas);
  }
}