import { Component } from "@angular/core";
import { CanvasComponent } from "./components/canvas/canvas.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CanvasComponent], // Import the standalone CanvasComponent directly
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent {
  title = "isometrics-app";
}
