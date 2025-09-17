import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasComponent } from './components/canvas/canvas.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { BomTableComponent } from './components/bom-table/bom-table.component';
import { DrawingService } from './services/drawing.service';
import { IsometryService } from './services/isometry.service';
import { LineDrawingService } from './services/line-drawing.service';
import { DimensionService } from './services/dimension.service';
import { ObjectManagementService } from './services/object-management.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CanvasComponent, ToolbarComponent, BomTableComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  // REMOVED providers - services are already providedIn: 'root'
  // Having them here creates duplicate instances!
})
export class AppComponent {
  title = 'isometrics-app';
  @ViewChild(ToolbarComponent) toolbar!: ToolbarComponent;
  @ViewChild(BomTableComponent) bomTable!: BomTableComponent;

  constructor(public drawingService: DrawingService) {}

  get sidebarCollapsed(): boolean {
    return this.toolbar?.sidebarCollapsed || false;
  }
}