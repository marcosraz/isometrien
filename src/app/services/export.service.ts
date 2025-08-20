import { Injectable } from '@angular/core';
import * as fabric from 'fabric';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  private canvas!: fabric.Canvas;

  initializeCanvas(canvas: fabric.Canvas): void {
    this.canvas = canvas;
  }

  exportAsPNG(filename: string = 'isometry-drawing'): void {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    // Get the canvas data URL
    const dataURL = this.canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2, // Higher resolution export
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportAsSVG(filename: string = 'isometry-drawing'): void {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    // Get the SVG string
    const svgString = this.canvas.toSVG();

    // Create a blob from the SVG string
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }

  exportAsJSON(filename: string = 'isometry-drawing'): void {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    // Get the canvas JSON
    const json = JSON.stringify(this.canvas.toJSON());

    // Create a blob from the JSON string
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.download = `${filename}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  }

  importFromJSON(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject('Canvas not initialized');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          this.canvas.loadFromJSON(json, () => {
            this.canvas.requestRenderAll();
            resolve();
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  printCanvas(): void {
    if (!this.canvas) {
      console.error('Canvas not initialized');
      return;
    }

    const dataURL = this.canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Isometry Drawing</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
              @media print {
                body {
                  padding: 0;
                }
                img {
                  max-width: 100%;
                  max-height: 100%;
                }
              }
            </style>
          </head>
          <body>
            <img src="${dataURL}" onload="window.print();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  copyToClipboard(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject('Canvas not initialized');
        return;
      }

      // Convert canvas to blob using toDataURL first
      const dataURL = this.canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      // Convert data URL to blob
      fetch(dataURL)
        .then(res => res.blob())
        .then(blob => {
          const item = new ClipboardItem({ 'image/png': blob });
          return navigator.clipboard.write([item]);
        })
        .then(() => resolve())
        .catch((error) => reject(error));
    });
  }
}