import { Injectable } from '@angular/core';
import * as fabric from 'fabric';
import { IsometryService } from './isometry.service';
import { LineDrawingService } from './line-drawing.service';
import { DimensionService } from './dimension.service';
import { ObjectManagementService } from './object-management.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DrawingService {
  private redrawRequest = new BehaviorSubject<void>(undefined);
  redraw$ = this.redrawRequest.asObservable();
  private canvas!: fabric.Canvas;

  constructor(
    private isometryService: IsometryService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService
  ) {}

  public setCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
    this.lineDrawingService.setCanvas(canvas);
  }

  public requestRedraw(): void {
    this.redrawRequest.next();
  }

  public getCanvas(): fabric.Canvas {
    return this.canvas;
  }

  public isEditingText(): boolean {
    return this.objectManagementService.isEditingText(this.canvas);
  }

  public startDimensioning(): void {
    this.lineDrawingService.setDrawingMode('dimension');
    this.dimensionService.startDimensioning();
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();

    // Prepare dimensionable anchors from editable pipes and lines
    const editablePipes = this.lineDrawingService.getEditablePipes();
    const editableLines = this.lineDrawingService.getEditableLines();
    this.dimensionService.prepareDimensionableAnchors(this.canvas, editablePipes, editableLines);
  }

  public startTextMode(): void {
    this.lineDrawingService.setDrawingMode('text');
  }

  public setDrawingMode(
    mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text'
  ): void {
    this.lineDrawingService.setDrawingMode(mode);
  }

  public handleMouseDown(options: any): void {
    const drawingMode = this.lineDrawingService.drawingMode;

    if (drawingMode === 'dimension') {
      const editablePipes = this.lineDrawingService.getEditablePipes();
      const editableLines = this.lineDrawingService.getEditableLines();
      this.dimensionService.handleDimensionMouseDown(this.canvas, options, editablePipes, editableLines);
      return;
    }

    if (drawingMode === 'text') {
      this.objectManagementService.addText(this.canvas, options);
      this.lineDrawingService.setDrawingMode('idle');
      return;
    }

    this.lineDrawingService.handleLineMouseDown(this.canvas, options);
    this.lineDrawingService.handlePipeMouseDown(this.canvas, options);
  }

  public handleMouseMove(options: any): void {
    const drawingMode = this.lineDrawingService.drawingMode;

    if (drawingMode === 'dimension') {
      this.dimensionService.handleDimensionMouseMove(this.canvas, options);
      return;
    }

    this.lineDrawingService.handleLineMouseMove(this.canvas, options);
    this.lineDrawingService.handlePipeMouseMove(this.canvas, options);
    this.canvas.requestRenderAll();
  }

  public handleDoubleClick(options: fabric.TEvent<MouseEvent>): void {
    this.lineDrawingService.handlePipeDoubleClick(this.canvas, options);
    
    // Prüfe, ob ein Bemaßungsobjekt doppelgeklickt wurde
    const target = (options as any).target;
    if (target) {
      // Wenn das Ziel eine Gruppe ist (Bemaßung), aktiviere den Text zum Bearbeiten
      if (target.type === 'group') {
        const group = target as fabric.Group;
        const textObject = group.getObjects().find(
          (obj: fabric.Object) => obj.type === 'i-text'
        ) as fabric.IText;
        
        if (textObject) {
          // Aktiviere den Text zum Bearbeiten
          textObject.enterEditing();
          textObject.selectAll();
        }
      }
    }
  }

  public handleSelectionCreated(e: any): void {
    // Handle selection events if needed
  }

  public handleSelectionCleared(): void {
    // Handle selection cleared events if needed
  }

  public handleObjectMoving(e: any) {
    this.lineDrawingService.handleObjectMoving(this.canvas, e);
  }

  public cancelDrawing(): void {
    this.lineDrawingService.cancelDrawing(this.canvas);
    if (this.dimensionService.getDimensionStep()) {
      this.dimensionService.clearTemporaryDimensionAnchors(this.canvas);
    }
  }

  public groupSelectedObjects(): void {
    this.objectManagementService.groupSelectedObjects(this.canvas);
  }

  public ungroupObjects(): void {
    this.objectManagementService.ungroupObjects(this.canvas);
  }

  public deleteSelectedObjects(): void {
    this.objectManagementService.deleteSelectedObjects(this.canvas);
  }

  public addIsometricLine(): void {
    this.objectManagementService.addIsometricLine(this.canvas);
  }

  public addArc(): void {
    this.objectManagementService.addArc(this.canvas);
  }

  public addValve(): void {
    this.objectManagementService.addValve(this.canvas);
  }

  // Getter for drawing mode to maintain compatibility
  public get drawingMode(): 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text' {
    return this.lineDrawingService.drawingMode;
  }

  public set drawingMode(mode: 'idle' | 'addLine' | 'addPipe' | 'dimension' | 'text') {
    this.lineDrawingService.setDrawingMode(mode);
  }

  // Getters for other properties to maintain compatibility
  public get pipePoints(): { x: number; y: number }[] {
    return this.lineDrawingService['pipePoints'];
  }

  public set pipePoints(points: { x: number; y: number }[]) {
    this.lineDrawingService['pipePoints'] = points;
  }
}
