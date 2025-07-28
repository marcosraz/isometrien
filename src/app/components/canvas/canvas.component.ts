import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as fabric from 'fabric';
import { Subscription } from 'rxjs';
import { DrawingService } from '../../services/drawing.service';
import { LineDrawingService } from '../../services/line-drawing.service';
import { DimensionService } from '../../services/dimension.service';

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './canvas.component.html',
  styleUrls: ['./canvas.component.scss'],
})
export class CanvasComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('htmlCanvas') htmlCanvas!: ElementRef<HTMLCanvasElement>;
  private canvas!: fabric.Canvas;
  private _keyDownHandler: (event: KeyboardEvent) => void;
  private redrawSubscription!: Subscription;

  constructor(
    private drawingService: DrawingService,
    private lineDrawingService: LineDrawingService,
    private dimensionService: DimensionService
  ) {
    this._keyDownHandler = (event: KeyboardEvent) => {
      const activeObject = this.canvas?.getActiveObject();

      // Check if text is being edited (either directly or within a group)
      let isTextEditing = false;
      if (activeObject) {
        if (activeObject.type === 'i-text' && (activeObject as fabric.IText).isEditing) {
          isTextEditing = true;
        } else if (activeObject.type === 'group') {
          // Check if any text object within the group is being edited
          const group = activeObject as fabric.Group;
          group.forEachObject((obj: fabric.Object) => {
            if (obj.type === 'i-text' && (obj as fabric.IText).isEditing) {
              isTextEditing = true;
            }
          });
        }
      }

      if (isTextEditing) {
        if (event.key === 'Backspace' || event.key === 'Delete') {
          // Prevent the event from bubbling up to the global handler
          event.stopPropagation();
        }
        return;
      }

      if (event.key === 'Escape') {
        this.drawingService.cancelDrawing();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        this.drawingService.deleteSelectedObjects();
      }
    };
  }

  ngOnInit(): void {
    document.addEventListener('keydown', this._keyDownHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this._keyDownHandler);
    this.redrawSubscription?.unsubscribe();
    this.canvas?.dispose(); // Clean up canvas resources
  }

  ngAfterViewInit(): void {
    if (this.htmlCanvas) {
      this.canvas = new fabric.Canvas(this.htmlCanvas.nativeElement, {
        selection: true,
        width: 1200,
        height: 800,
        backgroundColor: '#f3f3f3',
      });
      this.drawingService.setCanvas(this.canvas);
      this.canvas.on('mouse:down', (options) => {
        this.drawingService.handleMouseDown(options);
      });
      this.canvas.on('mouse:move', (options) => {
        this.drawingService.handleMouseMove(options);
      });
      this.canvas.on('mouse:dblclick', (options) => {
        this.drawingService.handleDoubleClick(
          options as fabric.TEvent<MouseEvent>
        );
      });

      this.canvas.on('text:editing:exited', ({ target }) => {
        if (target && target.text?.trim() === '') {
          this.canvas.remove(target);
        }
      });

      this.canvas.on('selection:created', (e) =>
        this.drawingService.handleSelectionCreated(e)
      );
      this.canvas.on('selection:updated', (e) =>
        this.drawingService.handleSelectionCreated(e)
      );
      this.canvas.on('selection:cleared', () =>
        this.drawingService.handleSelectionCleared()
      );

      this.canvas.on('object:moving', (e) => {
        this.drawingService.handleObjectMoving(e);
      });

      this.redrawSubscription = this.drawingService.redraw$.subscribe(() => {
        if (this.canvas) {
          this.canvas.requestRenderAll();
        }
      });
    } else {
      console.error('Canvas element not found!');
    }
  }
}
