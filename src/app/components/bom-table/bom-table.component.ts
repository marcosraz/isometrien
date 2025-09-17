import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import * as fabric from 'fabric';
import { BOMService, BOMData, BOMItem } from '../../services/bom.service';

@Component({
  selector: 'app-bom-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bom-table.component.html',
  styleUrls: ['./bom-table.component.scss']
})
export class BomTableComponent implements OnInit, OnDestroy {
  @Input() canvas: fabric.Canvas | null = null;

  public bomData: BOMData | null = null;
  public isVisible: boolean = false;
  public expandedRows: Set<string> = new Set();
  public isLoading: boolean = false;

  // Standard DN values for dropdown
  public standardDNValues = [25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];

  // Editing state
  public editingDN: string | null = null;
  public editingWeight: string | null = null;
  public tempDNValue: number = 50;
  public tempWeightValue: number = 0;

  private destroy$ = new Subject<void>();
  private updateTimer: any = null;

  constructor(private bomService: BOMService) {}

  ngOnInit(): void {
    // Subscribe to BOM data changes
    this.bomService.getBOMData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.bomData = data;
        this.isLoading = false;
      });

    // Set up canvas event listeners
    this.setupCanvasListeners();

    // Auto-refresh when canvas changes (debounced)
    this.scheduleUpdate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }

  public toggleVisibility(): void {
    this.isVisible = !this.isVisible;
    if (this.isVisible) {
      this.refreshBOM();
    }
  }

  public refreshBOM(): void {
    if (!this.canvas) return;

    this.isLoading = true;
    this.bomService.updateFromCanvas(this.canvas);
  }

  private scheduleUpdate(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      if (this.isVisible && this.canvas) {
        this.refreshBOM();
      }
    }, 1000); // Debounce updates by 1 second
  }

  public triggerUpdate(): void {
    this.scheduleUpdate();
  }

  public toggleRowExpansion(itemId: string): void {
    if (this.expandedRows.has(itemId)) {
      this.expandedRows.delete(itemId);
    } else {
      this.expandedRows.add(itemId);
    }
  }

  public isRowExpanded(itemId: string): boolean {
    return this.expandedRows.has(itemId);
  }

  public startEditingDN(item: BOMItem): void {
    this.editingDN = item.id;
    this.tempDNValue = item.dn;
  }

  public startEditingWeight(item: BOMItem): void {
    this.editingWeight = item.id;
    this.tempWeightValue = item.weightPerUnit;
  }

  public saveDNEdit(item: BOMItem): void {
    if (this.tempDNValue !== item.dn) {
      this.bomService.updateItemDN(item.id, this.tempDNValue);
    }
    this.editingDN = null;
  }

  public saveWeightEdit(item: BOMItem): void {
    if (this.tempWeightValue !== item.weightPerUnit) {
      this.bomService.updateItemWeight(item.id, this.tempWeightValue);
    }
    this.editingWeight = null;
  }

  public cancelDNEdit(): void {
    this.editingDN = null;
  }

  public cancelWeightEdit(): void {
    this.editingWeight = null;
  }

  public handleDNKeyPress(event: KeyboardEvent, item: BOMItem): void {
    if (event.key === 'Enter') {
      this.saveDNEdit(item);
    } else if (event.key === 'Escape') {
      this.cancelDNEdit();
    }
  }

  public handleWeightKeyPress(event: KeyboardEvent, item: BOMItem): void {
    if (event.key === 'Enter') {
      this.saveWeightEdit(item);
    } else if (event.key === 'Escape') {
      this.cancelWeightEdit();
    }
  }

  public getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'pipe': '🔧',
      'valve': '🔩',
      'fitting': '⚙️',
      'other': '📦'
    };
    return icons[category] || '📦';
  }

  public getCategoryName(category: string): string {
    const names: Record<string, string> = {
      'pipe': 'Rohre',
      'valve': 'Ventile',
      'fitting': 'Formstücke',
      'other': 'Sonstiges'
    };
    return names[category] || 'Sonstiges';
  }

  public getItemsByCategory(category: string): BOMItem[] {
    if (!this.bomData) return [];
    return this.bomData.items.filter(item => item.category === category);
  }

  public getCategories(): string[] {
    if (!this.bomData) return [];
    const categories = new Set(this.bomData.items.map(item => item.category));
    return Array.from(categories).sort();
  }

  public formatWeight(weight: number): string {
    return weight.toFixed(2);
  }

  public formatLength(length: number): string {
    if (length === 0) return '-';
    return length.toLocaleString('de-DE');
  }

  public downloadCSV(): void {
    try {
      this.bomService.downloadCSV();
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  }

  public downloadJSON(): void {
    try {
      this.bomService.downloadJSON();
    } catch (error) {
      console.error('Error downloading JSON:', error);
    }
  }

  public exportToPDF(): void {
    // Placeholder for future PDF export functionality
    alert('PDF-Export wird in einer zukünftigen Version verfügbar sein.');
  }

  public getLastUpdatedTime(): string {
    if (!this.bomData) return '';
    return this.bomData.lastUpdated.toLocaleString('de-DE');
  }

  public getTotalItemsCount(): number {
    if (!this.bomData) return 0;
    return this.bomData.items.reduce((sum, item) => sum + item.count, 0);
  }

  public getTotalPipeLength(): number {
    if (!this.bomData) return 0;
    return this.bomData.items
      .filter(item => item.category === 'pipe')
      .reduce((sum, item) => sum + item.length, 0);
  }

  private setupCanvasListeners(): void {
    if (!this.canvas) return;

    // Listen for object added/removed/modified events
    this.canvas.on('path:created', () => this.triggerUpdate());
    this.canvas.on('object:added', () => this.triggerUpdate());
    this.canvas.on('object:removed', () => this.triggerUpdate());
    this.canvas.on('object:modified', () => this.triggerUpdate());
    this.canvas.on('object:moving', () => this.triggerUpdate());
    this.canvas.on('object:scaling', () => this.triggerUpdate());
    this.canvas.on('object:rotating', () => this.triggerUpdate());
  }
}