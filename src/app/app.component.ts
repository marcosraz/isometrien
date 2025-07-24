import { Component } from '@angular/core';
import { CanvasComponent } from './components/canvas/canvas.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { DrawingService } from './services/drawing.service';
import { IsometryService } from './services/isometry.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CanvasComponent, ToolbarComponent], // Import the standalone CanvasComponent directly
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [DrawingService, IsometryService],
})
export class AppComponent {
  title = 'isometrics-app';
}
