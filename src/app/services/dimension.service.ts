import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DimensionService {
  private dimensionStep: 'start' | 'end' | 'position' | null = null;
  private firstAnchorPoint: fabric.Object | null = null;
  private dimensionElements: fabric.Object[] = [];
  private dimensionDragStartPoint: { x: number; y: number } | null = null;
  private initialDimensionPositions: Array<{ left: number; top: number }> = [];
  private tempDimensionableAnchors: fabric.Circle[] = [];

  constructor() {}

  public startDimensioning(): void {
    this.dimensionStep = 'start';
    console.log('Bemaßungsmodus gestartet. Bitte ersten Punkt wählen.');
  }

  public handleDimensionMouseDown(
    canvas: fabric.Canvas,
    options: any,
    editablePipes: any[],
    editableLines: any[] = []
  ): void {
    switch (this.dimensionStep) {
      case 'start':
        if (options.target && options.target.customType === 'anchorPoint') {
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
          options.target.customType === 'anchorPoint' &&
          options.target !== this.firstAnchorPoint
        ) {
          const secondAnchorPoint = options.target;
          console.log(
            'Zweiter Punkt ausgewählt. Bemaßung wird erstellt und fixiert.'
          );
          this.createDimensionVisuals(canvas, this.firstAnchorPoint, secondAnchorPoint);
          
          // Sofortige Textbearbeitung aktivieren
          const dimensionGroup = this.dimensionElements[0] as fabric.Group;
          if (dimensionGroup && dimensionGroup.type === 'group') {
            // Finde den Text innerhalb der Gruppe
            const textObject = dimensionGroup.getObjects().find(
              (obj: fabric.Object) => obj.type === 'i-text'
            ) as fabric.IText;
            
            if (textObject) {
              // Aktiviere die Gruppe und starte die Textbearbeitung
              canvas.setActiveObject(dimensionGroup);
              // Verzögerung, um sicherzustellen, dass die Gruppe aktiv ist
              setTimeout(() => {
                textObject.enterEditing();
              }, 50);
            }
          }

          this.clearTemporaryDimensionAnchors(canvas);
          this.dimensionStep = null;
          this.firstAnchorPoint = null;
          this.dimensionElements = [];
          this.dimensionDragStartPoint = null;
          this.initialDimensionPositions = [];
          console.log('Bemaßung platziert. Text kann nun bearbeitet werden.');
        }
        break;
    }
  }

  public handleDimensionMouseMove(canvas: fabric.Canvas, options: any): void {
    // Keine spezielle Mausbewegungslogik mehr für die Bemaßung benötigt
  }

  public prepareDimensionableAnchors(canvas: fabric.Canvas, editablePipes: any[], editableLines: any[] = []): void {
    editablePipes.forEach((pipe) => {
      pipe.anchors.forEach((anchor: fabric.Circle) => {
        anchor.set({
          selectable: true,
          evented: true,
          customType: 'anchorPoint',
          visible: true,
        });
        this.tempDimensionableAnchors.push(anchor);
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
        });
        this.tempDimensionableAnchors.push(anchor);
      });
    });
  }

  public clearTemporaryDimensionAnchors(canvas: fabric.Canvas): void {
    this.tempDimensionableAnchors.forEach((anchor) => {
      anchor.set({
        selectable: false,
        evented: false,
        visible: false,
        customType: undefined,
      });
    });
    this.tempDimensionableAnchors = [];
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

    const offset = 20;
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

    const extensionLine1 = new fabric.Line(
      [startCoords.x, startCoords.y, extLine1_end.x, extLine1_end.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
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
      }
    );

    const dimensionLine = new fabric.Line(
      [extLine1_end.x, extLine1_end.y, extLine2_end.x, extLine2_end.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
      }
    );

    const text = new fabric.IText(distance, {
      left: (extLine1_end.x + extLine2_end.x) / 2,
      top: (extLine1_end.y + extLine2_end.y) / 2 - 10,
      fontSize: 12,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
      hasControls: false,
      hasBorders: false,
    });

    // Erstelle eine Gruppe aus allen Bemaßungselementen
    const dimensionGroup = new fabric.Group(
      [extensionLine1, extensionLine2, dimensionLine, text],
      {
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: true,
        subTargetCheck: true, // Erlaubt die Auswahl von Unterelementen
      }
    );

    this.dimensionElements.push(dimensionGroup);
    canvas.add(dimensionGroup);
    canvas.setActiveObject(dimensionGroup);
    
    // Mache die Gruppe interaktiv verschiebbar
    dimensionGroup.set({
      hasControls: true,
      hasBorders: true,
      lockScalingX: true,  // Verhindere Skalierung in X-Richtung
      lockScalingY: true,  // Verhindere Skalierung in Y-Richtung
      lockUniScaling: true // Verhindere gleichmäßige Skalierung
    });
    
    // Füge Steuerungspunkte hinzu (wird später implementiert)
    // this.addControlPointsToDimensionGroup(dimensionGroup, canvas);
    
    canvas.requestRenderAll();
  }

  public getDimensionStep(): 'start' | 'end' | 'position' | null {
    return this.dimensionStep;
  }

  // Methode zum Hinzufügen von benutzerdefinierten Steuerungspunkten zur Bemaßungsgruppe
  private addControlPointsToDimensionGroup(group: fabric.Group, canvas: fabric.Canvas): void {
    // Diese Methode wird später implementiert, um interaktive Anpassung zu ermöglichen
  }
}