import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawingService } from '../../services/drawing.service';
import { LineDrawingService } from '../../services/line-drawing.service';
import { DimensionService } from '../../services/dimension.service';
import { ObjectManagementService } from '../../services/object-management.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
  constructor(
    public drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService,
    private objectManagementService: ObjectManagementService
  ) {}

  public addLine(): void {
    this.drawingService.setDrawingMode('addLine');
  }

  public addIsometricLine(): void {
    this.drawingService.addIsometricLine();
    this.drawingService.requestRedraw();
  }

  public addArc(): void {
    this.drawingService.addArc();
    this.drawingService.requestRedraw();
  }

  public addValve(): void {
    this.drawingService.addValve();
    this.drawingService.requestRedraw();
  }

  public startPiping(): void {
    this.drawingService.setDrawingMode('addPipe');
    this.drawingService.pipePoints = [];
  }

  public groupSelectedObjects(): void {
    this.drawingService.groupSelectedObjects();
    this.drawingService.requestRedraw();
  }

  public ungroupObjects(): void {
    this.drawingService.ungroupObjects();
    this.drawingService.requestRedraw();
  }

  public addAnchors(): void {
    this.drawingService.requestRedraw();
  }

  public applyDimension(): void {
    this.drawingService.requestRedraw();
  }

  public setDimensionMode(): void {
    this.drawingService.startDimensioning();
  }

  public addText(): void {
    this.drawingService.startTextMode();
  }
}
