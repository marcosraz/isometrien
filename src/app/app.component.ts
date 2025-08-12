import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from './components/canvas/canvas.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { DrawingService } from './services/drawing.service';
import { IsometryService } from './services/isometry.service';
import { LineDrawingService } from './services/line-drawing.service';
import { DimensionService } from './services/dimension.service';
import { ObjectManagementService } from './services/object-management.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CanvasComponent, ToolbarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [
    DrawingService,
    IsometryService,
    LineDrawingService,
    DimensionService,
    ObjectManagementService
  ],
})
export class AppComponent {
  title = 'isometrics-app';
  @ViewChild(ToolbarComponent) toolbar!: ToolbarComponent;
  
  get sidebarCollapsed(): boolean {
    return this.toolbar?.sidebarCollapsed || false;
  }
}