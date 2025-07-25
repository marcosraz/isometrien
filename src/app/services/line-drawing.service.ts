import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';

export interface EditablePipe {
  path: fabric.Path;
  anchors: fabric.Circle[];
}

export interface EditableLine {
  line: fabric.Line;
  anchors: fabric.Circle[];
}

@Injectable({
  providedIn: 'root',
})
export class LineDrawingService {
  public drawingMode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' = 'idle';
  public lineStartPoint: { x: number; y: number } | null = null;
  public pipePoints: { x: number; y: number }[] = [];
  private previewLine: fabric.Line | null = null;
  private previewPipe: fabric.Object | null = null;
  private permanentPipe: fabric.Object | null = null;
  private pipeAnchors: fabric.Circle[] = [];
  private editablePipes: EditablePipe[] = [];
  private editableLines: EditableLine[] = [];
  private currentlyEditing: EditablePipe | null = null;
  private lastPathPosition: { left: number; top: number } | null = null;

  constructor(private isometryService: IsometryService) {}

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

  public handleLineMouseDown(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);

    if (this.drawingMode === 'addLine') {
      if (!this.lineStartPoint) {
        this.lineStartPoint = { x: pointer.x, y: pointer.y };
      } else {
        if (this.previewLine) {
          canvas.remove(this.previewLine);
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

        canvas.add(startCircle, endCircle);

        // Speichere die Linie und ihre Ankerpunkte
        const newEditableLine: EditableLine = {
          line: line,
          anchors: [startCircle, endCircle],
        };
        this.editableLines.push(newEditableLine);

        this.lineStartPoint = null;
        this.drawingMode = 'idle';
      }
    }
  }

  public handlePipeMouseDown(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);

    if (this.drawingMode === 'addPipe') {
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
      canvas.add(anchor);
      this.pipeAnchors.push(anchor);

      if (this.permanentPipe) {
        canvas.remove(this.permanentPipe);
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

        canvas.add(this.permanentPipe);
      }
    }
  }

  public handleLineMouseMove(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    if (this.drawingMode === 'addLine') {
      if (!this.lineStartPoint) return;
      if (this.previewLine) {
        canvas.remove(this.previewLine);
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
      canvas.add(this.previewLine);
    }
  }

  public handlePipeMouseMove(canvas: fabric.Canvas, options: any): void {
    const pointer = canvas.getPointer(options.e);
    if (this.drawingMode === 'addPipe') {
      if (this.pipePoints.length === 0) return;

      if (this.previewPipe) {
        canvas.remove(this.previewPipe);
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
      canvas.add(this.previewPipe);
    }
  }

  public handlePipeDoubleClick(canvas: fabric.Canvas, options: fabric.TEvent<MouseEvent>): void {
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
      canvas.setActiveObject(newEditablePipe.path);
      canvas.renderAll();
    }
  }

  public handleObjectMoving(canvas: fabric.Canvas, e: any) {
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
      this.updatePipePath(canvas, this.currentlyEditing);
      // Important: Update the "last position" of the path after the path has been updated
      this.lastPathPosition = {
        left: this.currentlyEditing.path.left as number,
        top: this.currentlyEditing.path.top as number,
      };
    }
  }

  private updatePipePath(canvas: fabric.Canvas, pipe: EditablePipe): void {
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
    canvas.requestRenderAll();
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
  }

  private resetPipeDrawingState(): void {
    // This function is called on successful pipe completion.
    if (this.previewPipe) {
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

  public cancelDrawing(canvas: fabric.Canvas): void {
    if (this.previewLine) {
      canvas.remove(this.previewLine);
      this.previewLine = null;
    }
    if (this.previewPipe) {
      canvas.remove(this.previewPipe);
      this.previewPipe = null;
    }
    if (this.permanentPipe) {
      canvas.remove(this.permanentPipe);
      this.permanentPipe = null;
    }
    this.pipeAnchors.forEach((anchor) => canvas.remove(anchor));
    this.pipeAnchors = [];
    this.drawingMode = 'idle';
    this.lineStartPoint = null;
    this.pipePoints = [];
  }

  public getEditablePipes(): EditablePipe[] {
    return this.editablePipes;
  }

  public getEditableLines(): EditableLine[] {
    return this.editableLines;
  }

  public setCanvas(canvas: fabric.Canvas): void {
    // This is needed for some methods that need direct canvas access
    this.canvas = canvas;
  }

  private canvas!: fabric.Canvas;
}