import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';
import { BehaviorSubject } from 'rxjs';

export interface EditablePipe {
  path: fabric.Path;
  anchors: fabric.Circle[];
}

@Injectable({
  providedIn: 'root',
})
export class DrawingService {
  private redrawRequest = new BehaviorSubject<void>(undefined);
  redraw$ = this.redrawRequest.asObservable();
  private canvas!: fabric.Canvas;
  public drawingMode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' =
    'idle';
  public lineStartPoint: { x: number; y: number } | null = null;
  public pipePoints: { x: number; y: number }[] = [];
  private previewLine: fabric.Line | null = null;
  private previewPipe: fabric.Object | null = null;
  private permanentPipe: fabric.Object | null = null;
  private pipeAnchors: fabric.Circle[] = [];
  private editablePipes: EditablePipe[] = [];
  private currentlyEditing: EditablePipe | null = null;
  private lastPathPosition: { left: number; top: number } | null = null;
  private dimensionStep: 'start' | 'end' | 'position' | null = null;
  private firstAnchorPoint: fabric.Object | null = null;
  private dimensionElements: fabric.Object[] = [];
  private dimensionDragStartPoint: { x: number; y: number } | null = null;
  private initialDimensionPositions: Array<{ left: number; top: number }> = [];
  private tempDimensionableAnchors: fabric.Circle[] = [];

  constructor(private isometryService: IsometryService) {}

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }

  public requestRedraw(): void {
    this.redrawRequest.next();
  }

  public getCanvas(): fabric.Canvas {
    return this.canvas;
  }

  public isEditingText(): boolean {
    const activeObject = this.canvas.getActiveObject();
    return activeObject instanceof fabric.IText && activeObject.isEditing;
  }

  public startDimensioning(): void {
    this.setDrawingMode('dimension');
    this.dimensionStep = 'start';
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();

    this.editablePipes.forEach((pipe) => {
      pipe.anchors.forEach((anchor) => {
        anchor.set({
          selectable: true,
          evented: true,
          customType: 'anchorPoint',
          visible: true,
        });
        this.tempDimensionableAnchors.push(anchor);
      });
    });

    console.log('Bemaßungsmodus gestartet. Bitte ersten Punkt wählen.');
  }

  public startTextMode(): void {
    this.setDrawingMode('text');
  }

  public setDrawingMode(
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text'
  ): void {
    if (this.drawingMode === 'addPipe' && mode !== 'addPipe') {
      // Switching away from addPipe mode, so we cancel the current drawing.
      this.pipeAnchors.forEach((anchor) => this.canvas.remove(anchor));
      this.pipeAnchors = [];

      if (this.permanentPipe) {
        this.canvas.remove(this.permanentPipe);
        this.permanentPipe = null;
      }
      if (this.previewPipe) {
        this.canvas.remove(this.previewPipe);
        this.previewPipe = null;
      }
      this.pipePoints = [];
    }
    this.drawingMode = mode;
  }

  public handleMouseDown(options: any): void {
    const pointer = this.canvas.getPointer(options.e);

    if (this.drawingMode === 'dimension') {
      switch (this.dimensionStep) {
        case 'start':
          if (options.target && options.target.customType === 'anchorPoint') {
            this.firstAnchorPoint = options.target;
            this.dimensionStep = 'end';
            console.log('Erster Punkt ausgewählt. Bitte zweiten Punkt wählen.');
            this.canvas.requestRenderAll();
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
              'Zweiter Punkt ausgewählt. Bemaßung wird erstellt. Positionieren und klicken zum fixieren.'
            );
            this.createDimensionVisuals(
              this.firstAnchorPoint,
              secondAnchorPoint
            );
            this.dimensionStep = 'position';
            const pointer = this.canvas.getPointer(options.e);
            this.dimensionDragStartPoint = { x: pointer.x, y: pointer.y };
            this.initialDimensionPositions = this.dimensionElements.map(
              (el) => ({
                left: el.left as number,
                top: el.top as number,
              })
            );
          }
          break;
        case 'position': {
          const textObject = this.dimensionElements.find(
            (el) => el.type === 'i-text'
          ) as fabric.IText;
          if (textObject) {
            textObject.set({
              selectable: true,
              evented: true,
            });
            this.canvas.setActiveObject(textObject);
            textObject.enterEditing();
          }

          this.clearTemporaryDimensionAnchors();
          this.dimensionStep = null;
          this.firstAnchorPoint = null;
          this.dimensionElements = [];
          this.dimensionDragStartPoint = null;
          this.initialDimensionPositions = [];
          this.setDrawingMode('idle');

          console.log('Bemaßung platziert. Text kann nun bearbeitet werden.');
          break;
        }
      }
      return;
    }

    switch (this.drawingMode) {
      case 'addLine':
        if (!this.lineStartPoint) {
          this.lineStartPoint = { x: pointer.x, y: pointer.y };
        } else {
          if (this.previewLine) {
            this.canvas.remove(this.previewLine);
            this.previewLine = null;
          }
          const endPoint = { x: pointer.x, y: pointer.y };
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
          this.canvas.add(line);

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
          });

          this.canvas.add(startCircle, endCircle);

          this.lineStartPoint = null;
          this.drawingMode = 'idle';
          this.requestRedraw();
        }
        break;
      case 'addPipe':
        this.pipePoints.push({ x: pointer.x, y: pointer.y });

        const anchor = new fabric.Circle({
          radius: 3,
          fill: 'blue',
          left: pointer.x,
          top: pointer.y,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
        });
        this.canvas.add(anchor);
        this.pipeAnchors.push(anchor);

        if (this.permanentPipe) {
          this.canvas.remove(this.permanentPipe);
        }

        if (this.pipePoints.length > 1) {
          const radius = 20; // Increased radius
          let pathString = `M ${this.pipePoints[0].x} ${this.pipePoints[0].y}`;

          for (let i = 1; i < this.pipePoints.length - 1; i++) {
            const p1 = this.pipePoints[i - 1];
            const p2 = this.pipePoints[i];
            const p3 = this.pipePoints[i + 1];

            const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
            const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

            const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
            const u1 = { x: v1.x / len1, y: v1.y / len1 };

            const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
            const u2 = { x: v2.x / len2, y: v2.y / len2 };

            const newRadius = Math.min(radius, len1 / 2, len2 / 2);

            const p1_on_segment = {
              x: p2.x + newRadius * u1.x,
              y: p2.y + newRadius * u1.y,
            };
            const p3_on_segment = {
              x: p2.x + newRadius * u2.x,
              y: p2.y + newRadius * u2.y,
            };

            pathString += ` L ${p1_on_segment.x} ${p1_on_segment.y}`;
            pathString += ` Q ${p2.x} ${p2.y}, ${p3_on_segment.x} ${p3_on_segment.y}`;
          }

          pathString += ` L ${this.pipePoints[this.pipePoints.length - 1].x} ${
            this.pipePoints[this.pipePoints.length - 1].y
          }`;

          this.permanentPipe = new fabric.Path(pathString, {
            fill: '',
            stroke: 'green',
            strokeWidth: 5,
            selectable: false,
            evented: false,
            objectCaching: false,
          });

          this.canvas.add(this.permanentPipe);
          this.requestRedraw();
        }
        break;
      case 'text': {
        const text = new fabric.IText('Your Text Here', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 20,
          fill: 'black',
        });
        this.canvas.add(text);
        this.canvas.setActiveObject(text);
        text.enterEditing();
        this.setDrawingMode('idle');
        break;
      }
    }
  }

  public handleMouseMove(options: any): void {
    const pointer = this.canvas.getPointer(options.e);
    switch (this.drawingMode) {
      case 'dimension':
        if (this.dimensionStep === 'position' && this.dimensionDragStartPoint) {
          const pointer = this.canvas.getPointer(options.e);
          const offsetX = pointer.x - this.dimensionDragStartPoint.x;
          const offsetY = pointer.y - this.dimensionDragStartPoint.y;

          this.dimensionElements.forEach((el, index) => {
            const initialPos = this.initialDimensionPositions[index];
            el.set({
              left: initialPos.left + offsetX,
              top: initialPos.top + offsetY,
            });
            el.setCoords();
          });
        }
        break;
      case 'addLine':
        if (!this.lineStartPoint) return;
        if (this.previewLine) {
          this.canvas.remove(this.previewLine);
        }
        this.previewLine = new fabric.Line(
          [this.lineStartPoint.x, this.lineStartPoint.y, pointer.x, pointer.y],
          {
            stroke: 'rgba(0,0,0,0.3)',
            strokeDashArray: [5, 5],
            strokeWidth: 2,
            selectable: false,
            evented: false,
          }
        );
        this.canvas.add(this.previewLine);
        break;
      case 'addPipe':
        if (this.pipePoints.length === 0) return;

        if (this.previewPipe) {
          this.canvas.remove(this.previewPipe);
        }

        const lastPoint = this.pipePoints[this.pipePoints.length - 1];
        this.previewPipe = new fabric.Line(
          [lastPoint.x, lastPoint.y, pointer.x, pointer.y],
          {
            stroke: 'rgba(0,128,0,0.5)',
            strokeWidth: 5,
            selectable: false,
            evented: false,
          }
        );
        this.canvas.add(this.previewPipe);
        break;
    }
    this.canvas.requestRenderAll();
  }

  public handleDoubleClick(options: fabric.TEvent<MouseEvent>): void {
    if (this.drawingMode === 'addPipe' && this.permanentPipe) {
      const permanentPipe = this.permanentPipe as fabric.Path;

      // Set anchors to be visible but not selectable/evented initially
      this.pipeAnchors.forEach((anchor) => {
        anchor.set({
          visible: false,
          selectable: false,
          evented: false,
        });
      });

      const newEditablePipe: EditablePipe = {
        path: permanentPipe,
        anchors: this.pipeAnchors,
      };
      this.editablePipes.push(newEditablePipe);

      permanentPipe.set({
        selectable: true,
        evented: true,
      });

      this.resetPipeDrawingState();
      this.enterEditMode(newEditablePipe);
      this.canvas.setActiveObject(newEditablePipe.path);
      this.canvas.renderAll();
    }
  }

  public handleSelectionCreated(e: any): void {
    this.exitEditMode(); // Always exit first to ensure a clean state

    if (e.target.type === 'activeSelection') {
      // Do nothing if it's a group selection
      return;
    }

    const selected = e.target;
    if (selected instanceof fabric.Path) {
      const foundPipe = this.editablePipes.find((p) => p.path === selected);
      if (foundPipe) {
        this.enterEditMode(foundPipe);
      }
    }
  }

  public handleSelectionCleared(): void {
    this.exitEditMode();
  }

  public handleObjectMoving(e: any) {
    if (!this.currentlyEditing || !e.target) return;

    const movedObject = e.target;

    // CASE 1: The main line is being moved
    if (movedObject === this.currentlyEditing.path && this.lastPathPosition) {
      const path = this.currentlyEditing.path;
      const deltaX = (path.left as number) - this.lastPathPosition.left;
      const deltaY = (path.top as number) - this.lastPathPosition.top;

      this.currentlyEditing.anchors.forEach((anchor) => {
        anchor.left = (anchor.left as number) + deltaX;
        anchor.top = (anchor.top as number) + deltaY;
        anchor.setCoords();
      });

      this.lastPathPosition = {
        left: path.left as number,
        top: path.top as number,
      };
      return; // Exit after handling path move
    }

    // CASE 2: An anchor point is being moved
    const isAnchor = this.currentlyEditing.anchors.find(
      (a) => a === movedObject
    );
    if (isAnchor) {
      this.updatePipePath(this.currentlyEditing);
      // Important: Update the "last position" of the path after the path has been updated
      this.lastPathPosition = {
        left: this.currentlyEditing.path.left as number,
        top: this.currentlyEditing.path.top as number,
      };
    }
  }

  private updatePipePath(pipe: EditablePipe): void {
    const points = pipe.anchors.map((anchor) => ({
      x: anchor.left as number,
      y: anchor.top as number,
    }));

    if (points.length < 2) return;

    const radius = 20;
    let pathString = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[i + 1];

      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

      const len1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
      const u1 = { x: v1.x / len1, y: v1.y / len1 };

      const len2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
      const u2 = { x: v2.x / len2, y: v2.y / len2 };

      const newRadius = Math.min(radius, len1 / 2, len2 / 2);

      const p1_on_segment = {
        x: p2.x + newRadius * u1.x,
        y: p2.y + newRadius * u1.y,
      };
      const p3_on_segment = {
        x: p2.x + newRadius * u2.x,
        y: p2.y + newRadius * u2.y,
      };

      pathString += ` L ${p1_on_segment.x} ${p1_on_segment.y}`;
      pathString += ` Q ${p2.x} ${p2.y}, ${p3_on_segment.x} ${p3_on_segment.y}`;
    }

    pathString += ` L ${points[points.length - 1].x} ${
      points[points.length - 1].y
    }`;

    const newPathArray = new fabric.Path(pathString).path as any[];
    pipe.path.set({ path: newPathArray });
    pipe.path.setCoords();
    this.canvas.requestRenderAll();
  }

  private enterEditMode(pipe: EditablePipe): void {
    this.currentlyEditing = pipe;
    this.lastPathPosition = {
      left: pipe.path.left as number,
      top: pipe.path.top as number,
    };
    pipe.anchors.forEach((anchor) => {
      anchor.set({
        visible: true,
        selectable: true,
        evented: true,
      });
    });
    this.canvas.renderAll();
  }

  private exitEditMode(): void {
    if (this.currentlyEditing) {
      this.currentlyEditing.anchors.forEach((anchor) => {
        anchor.set({
          visible: false,
          selectable: false,
          evented: false,
        });
      });
      this.currentlyEditing = null;
      this.lastPathPosition = null;
    }
    this.canvas.renderAll();
  }

  private clearTemporaryDimensionAnchors(): void {
    this.tempDimensionableAnchors.forEach((anchor) => {
      anchor.set({
        selectable: false,
        evented: false,
        visible: false,
        customType: undefined,
      });
    });
    this.tempDimensionableAnchors = [];
    this.canvas.requestRenderAll();
  }

  private resetPipeDrawingState(): void {
    // This function is called on successful pipe completion.
    if (this.previewPipe) {
      this.canvas.remove(this.previewPipe);
      this.previewPipe = null;
    }
    this.permanentPipe = null;
    this.pipePoints = [];
    // The crucial change: we DO NOT reset the pipeAnchors array here.
    // The array has been passed to the new EditablePipe by reference. Resetting it
    // here would empty the anchors in the final pipe object.
    this.pipeAnchors = [];
    this.drawingMode = 'idle';
  }

  public cancelDrawing(): void {
    this.clearTemporaryDimensionAnchors();
    if (this.previewLine) {
      this.canvas.remove(this.previewLine);
      this.previewLine = null;
    }
    if (this.previewPipe) {
      this.canvas.remove(this.previewPipe);
      this.previewPipe = null;
    }
    if (this.permanentPipe) {
      this.canvas.remove(this.permanentPipe);
      this.permanentPipe = null;
    }
    this.pipeAnchors.forEach((anchor) => this.canvas.remove(anchor));
    this.pipeAnchors = [];
    this.drawingMode = 'idle';
    this.lineStartPoint = null;
    this.pipePoints = [];
    this.canvas.requestRenderAll();
  }

  public addIsometricLine(): void {
    if (!this.canvas) return;
    const isoLine = new fabric.Line([100, 100, 300, 200], {
      stroke: 'blue',
      strokeWidth: 3,
    });
    this.canvas.add(isoLine);
  }

  public addArc(): void {
    if (!this.canvas) return;
    const arc = new fabric.Path('M 100 100 A 50 50 0 0 1 200 100', {
      left: 150,
      top: 150,
      stroke: 'red',
      strokeWidth: 2,
      fill: '',
    });
    this.canvas.add(arc);
  }

  public addValve(): void {
    if (!this.canvas) return;
    const triangle1 = new fabric.Triangle({
      width: 20,
      height: 30,
      fill: 'black',
      angle: -90,
    });
    const triangle2 = new fabric.Triangle({
      width: 20,
      height: 30,
      fill: 'black',
      angle: 90,
    });

    const width1 = triangle1.get('width') as number;
    triangle1.set('left', -width1);
    triangle2.set('left', 0);

    const valve = new fabric.Group([triangle1, triangle2], {
      left: 250,
      top: 250,
    });

    this.canvas.add(valve);
  }

  public groupSelectedObjects(): void {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== 'activeSelection') return;

    const activeSelection = activeObj as fabric.ActiveSelection;
    const group = new fabric.Group(activeSelection.getObjects());

    this.canvas.discardActiveObject();
    this.canvas.add(group);
    this.canvas.requestRenderAll();
  }

  public ungroupObjects(): void {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== 'group') return;

    const group = activeObj as fabric.Group;
    const items = group.getObjects();
    this.canvas.discardActiveObject();
    items.forEach((item: fabric.Object) => {
      this.canvas.add(item);
    });
    this.canvas.remove(group);
    this.canvas.requestRenderAll();
  }

  public addAnchors(): void {
    console.log('addAnchors function called');
  }

  public applyDimension(): void {
    if (!this.canvas) return;
    const activeObj = this.canvas.getActiveObject();
    if (!activeObj) {
      console.log('Please select an object to dimension.');
      return;
    }
  }

  public deleteSelectedObjects(): void {
    const activeObject = this.canvas.getActiveObject();
    if (activeObject) {
      if (activeObject.type === 'activeSelection') {
        (activeObject as fabric.ActiveSelection).forEachObject((obj) => {
          this.canvas.remove(obj);
        });
      }
      this.canvas.remove(activeObject);
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
    }
  }

  private createDimensionVisuals(
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
      }
    );

    const extensionLine2 = new fabric.Line(
      [endCoords.x, endCoords.y, extLine2_end.x, extLine2_end.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }
    );

    const dimensionLine = new fabric.Line(
      [extLine1_end.x, extLine1_end.y, extLine2_end.x, extLine2_end.y],
      {
        stroke: 'black',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      }
    );

    const text = new fabric.IText(distance, {
      left: (extLine1_end.x + extLine2_end.x) / 2,
      top: (extLine1_end.y + extLine2_end.y) / 2 - 10,
      fontSize: 12,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });

    this.dimensionElements.push(
      extensionLine1,
      extensionLine2,
      dimensionLine,
      text
    );
    this.dimensionElements.forEach((obj) => this.canvas.add(obj));
    this.canvas.requestRenderAll();
  }
}
