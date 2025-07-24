import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DrawingService } from '../../services/drawing.service';
import { IsometryService } from '../../services/isometry.service';

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
    private isometryService: IsometryService
  ) {}

  public addLine(): void {
    this.drawingService.setDrawingMode('addLine');
  }

  public addIsometricLine(): void {
    // this.isometryService.setNextAction('iso-line');
    this.drawingService.requestRedraw();
  }

  public addArc(): void {
    // this.isometryService.setNextAction('arc');
    this.drawingService.requestRedraw();
  }

  public addValve(): void {
    // this.isometryService.setNextAction('valve');
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
    // this.isometryService.setNextAction('anchor');
    this.drawingService.requestRedraw();
  }

  public applyDimension(): void {
    // this.isometryService.setNextAction('dimension');
    this.drawingService.requestRedraw();
  }

  public setDimensionMode(): void {
    this.drawingService.startDimensioning();
  }
  public addText(): void {
    this.drawingService.startTextMode();
  }
}
