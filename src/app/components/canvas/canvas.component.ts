import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import * as fabric from "fabric";

@Component({
  selector: "app-canvas",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./canvas.component.html",
  styleUrls: ["./canvas.component.scss"],
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild("htmlCanvas") htmlCanvas!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;

  // State for the piping tool
  private isPipingMode = false;
  private pipePoints: fabric.Point[] = [];
  private tempPipePath: fabric.Path | null = null;
  private _keyDownHandler: (event: KeyboardEvent) => void;

  constructor() {
    this._keyDownHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape" && this.isPipingMode) {
        this.finishPiping();
      }
    };
  }

  ngOnInit(): void {
    document.addEventListener("keydown", this._keyDownHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener("keydown", this._keyDownHandler);
    this.canvas?.dispose(); // Clean up canvas resources
  }

  ngAfterViewInit(): void {
    if (this.htmlCanvas) {
      this.canvas = new fabric.Canvas(this.htmlCanvas.nativeElement, {
        selection: true,
        width: 1200,
        height: 800,
        backgroundColor: "#f3f3f3",
      });
      this.canvas.on("mouse:down", this.handleMouseDown);
    } else {
      console.error("Canvas element not found!");
    }
  }

  private handleMouseDown = (options: any): void => {
    if (!this.isPipingMode || !options.e) return;

    const pointer = this.canvas.getPointer(options.e);
    this.pipePoints.push(new fabric.Point(pointer.x, pointer.y));

    if (this.pipePoints.length < 2) return;

    if (this.tempPipePath) {
      this.canvas.remove(this.tempPipePath);
    }

    const pathData = this.generateRoundedPathData(this.pipePoints, 20);
    if (!pathData) return;

    this.tempPipePath = new fabric.Path(pathData, {
      fill: undefined,
      stroke: "green",
      strokeWidth: 3,
      objectCaching: false,
      selectable: false,
      evented: false,
    });

    this.canvas.add(this.tempPipePath);
    this.canvas.requestRenderAll();
  };

  // =================================================================
  // Drawing Functions
  // =================================================================

  public addLine(): void {
    if (!this.canvas) return;
    const line = new fabric.Line([50, 100, 250, 100], {
      stroke: "black",
      strokeWidth: 2,
    });
    this.canvas.add(line);
  }

  public addIsometricLine(): void {
    if (!this.canvas) return;
    const isoLine = new fabric.Line([100, 100, 300, 200], {
      stroke: "blue",
      strokeWidth: 3,
    });
    this.canvas.add(isoLine);
  }

  public addArc(): void {
    if (!this.canvas) return;
    const arc = new fabric.Path("M 100 100 A 50 50 0 0 1 200 100", {
      left: 150,
      top: 150,
      stroke: "red",
      strokeWidth: 2,
      fill: "",
    });
    this.canvas.add(arc);
  }

  public addValve(): void {
    if (!this.canvas) return;
    const triangle1 = new fabric.Triangle({
      width: 20,
      height: 30,
      fill: "black",
      angle: -90,
    });
    const triangle2 = new fabric.Triangle({
      width: 20,
      height: 30,
      fill: "black",
      angle: 90,
    });

    const width1 = triangle1.get("width") as number;
    triangle1.set("left", -width1);
    triangle2.set("left", 0);

    const valve = new fabric.Group([triangle1, triangle2], {
      left: 250,
      top: 250,
    });

    this.canvas.add(valve);
  }

  public startPiping(): void {
    this.isPipingMode = true;
    this.pipePoints = [];
    if (this.tempPipePath) {
      this.canvas.remove(this.tempPipePath);
      this.tempPipePath = null;
    }
    this.canvas.selection = false;
    this.canvas.forEachObject((obj: fabric.Object) =>
      obj.set("evented", false),
    );
    console.log(
      "Piping mode started. Click to add points, press ESC to finish.",
    );
  }

  private finishPiping(): void {
    if (!this.isPipingMode) return;
    this.isPipingMode = false;

    if (this.tempPipePath) {
      const finalPipe = new fabric.Path(this.tempPipePath.path, {
        ...(this.tempPipePath.toObject() as any),
        objectCaching: true,
        selectable: true,
        evented: true,
      });
      this.canvas.remove(this.tempPipePath);
      this.canvas.add(finalPipe);
    }

    this.tempPipePath = null;
    this.pipePoints = [];
    this.canvas.selection = true;
    this.canvas.forEachObject((obj: fabric.Object) => obj.set("evented", true));
    this.canvas.requestRenderAll();
    console.log("Piping mode finished.");
  }

  private generateRoundedPathData(
    points: fabric.Point[],
    cornerRadius: number,
  ): string {
    if (points.length < 2) return "";

    let pathData = `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) {
      pathData += ` L ${points[1].x} ${points[1].y}`;
      return pathData;
    }

    for (let i = 1; i < points.length - 1; i++) {
      const pPrev = points[i - 1];
      const pCurr = points[i];
      const pNext = points[i + 1];

      const v1 = pPrev.subtract(pCurr);
      const v2 = pNext.subtract(pCurr);
      const lenV1 = Math.hypot(v1.x, v1.y);
      const lenV2 = Math.hypot(v2.x, v2.y);

      if (lenV1 === 0 || lenV2 === 0) continue;

      const angle = Math.acos((v1.x * v2.x + v1.y * v2.y) / (lenV1 * lenV2));

      if (isNaN(angle)) continue;

      let tangentDist = cornerRadius / Math.tan(angle / 2);
      tangentDist = Math.min(tangentDist, lenV1 / 2, lenV2 / 2);

      const radius = tangentDist * Math.tan(angle / 2);

      const t1 = pCurr.add(
        new fabric.Point(
          (v1.x * tangentDist) / lenV1,
          (v1.y * tangentDist) / lenV1,
        ),
      );
      const t2 = pCurr.add(
        new fabric.Point(
          (v2.x * tangentDist) / lenV2,
          (v2.y * tangentDist) / lenV2,
        ),
      );

      const sweepFlag = v1.x * v2.y - v1.y * v2.x < 0 ? 1 : 0;

      pathData += ` L ${t1.x} ${t1.y}`;
      pathData += ` A ${radius} ${radius} 0 0 ${sweepFlag} ${t2.x} ${t2.y}`;
    }

    pathData += ` L ${points[points.length - 1].x} ${
      points[points.length - 1].y
    }`;
    return pathData;
  }

  // =================================================================
  // Object Manipulation
  // =================================================================

  public groupSelectedObjects(): void {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== "activeSelection") return;

    const activeSelection = activeObj as fabric.ActiveSelection;
    const group = new fabric.Group(activeSelection.getObjects());

    this.canvas.discardActiveObject();
    this.canvas.add(group);
    this.canvas.requestRenderAll();
  }

  public ungroupObjects(): void {
    const activeObj = this.canvas?.getActiveObject();
    if (!activeObj || activeObj.type !== "group") return;

    const group = activeObj as fabric.Group;
    const items = group.getObjects();
    this.canvas.discardActiveObject();
    items.forEach((item: fabric.Object) => {
      this.canvas.add(item);
    });
    this.canvas.remove(group);
    this.canvas.requestRenderAll();
  }

  // =================================================================
  // Advanced Functionality (Placeholders)
  // =================================================================

  public addAnchors(): void {
    console.log("addAnchors function called");
  }

  public applyDimension(): void {
    if (!this.canvas) return;
    const activeObj = this.canvas.getActiveObject();
    if (!activeObj) {
      console.log("Please select an object to dimension.");
      return;
    }
  }
}
