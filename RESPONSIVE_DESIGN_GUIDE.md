# 📱💻 Phone vs Tablet - Responsive Design Guide

Komplette Anleitung für unterschiedliche Layouts auf Phone und Tablet.

---

## 🎯 ÜBERSICHT: 3 Methoden

### **Methode 1: CSS Media Queries** (Einfachste)
- ✅ Unterschiedliche Styles für Phone/Tablet
- ✅ Bereits implementiert für Mobile Bottom Nav
- ✅ Keine Code-Änderungen nötig

### **Methode 2: Angular BreakpointObserver** (Flexibelste)
- ✅ Dynamische UI-Änderungen in TypeScript
- ✅ Unterschiedliche Komponenten je nach Gerät
- ✅ Reaktiv auf Bildschirm-Drehung

### **Methode 3: Capacitor Platform Detection** (Nativste)
- ✅ Erkennt echtes Gerät (Phone/Tablet/Desktop)
- ✅ Für native Features
- ✅ Kombinierbar mit Methode 1 & 2

---

## 📐 STANDARD BREAKPOINTS

### **Empfohlene Größen:**

```scss
// Phone (Portrait)
$phone-portrait: 0 - 599px

// Phone (Landscape)
$phone-landscape: 600px - 767px

// Tablet (Portrait)
$tablet-portrait: 768px - 1023px

// Tablet (Landscape)
$tablet-landscape: 1024px - 1439px

// Desktop
$desktop: 1440px+
```

### **Aktuell implementiert:**
```scss
// Phone & small tablets
@media (max-width: 768px) {
  // Mobile Bottom Navigation sichtbar
}

// Desktop
@media (min-width: 769px) {
  // Desktop UI
}
```

---

## 🎨 METHODE 1: CSS Media Queries (Bereits aktiv!)

### **Wo es bereits verwendet wird:**

**In `toolbar.component.scss`:**

```scss
// Mobile (< 768px)
@media (max-width: 768px) {
  .mobile-bottom-nav {
    display: block; // Sichtbar auf Phone
  }
}

// Very small screens (< 480px)
@media (max-width: 480px) {
  .mobile-bottom-nav {
    padding: 6px 4px; // Kompakter
  }
}
```

---

### **Erweiterte Breakpoints hinzufügen:**

**Erstelle: `src/styles/_breakpoints.scss`**

```scss
// Breakpoint Variables
$breakpoint-phone-portrait: 599px;
$breakpoint-phone-landscape: 767px;
$breakpoint-tablet-portrait: 1023px;
$breakpoint-tablet-landscape: 1439px;

// Mixins für einfache Verwendung
@mixin phone-portrait {
  @media (max-width: #{$breakpoint-phone-portrait}) {
    @content;
  }
}

@mixin phone-landscape {
  @media (min-width: 600px) and (max-width: #{$breakpoint-phone-landscape}) {
    @content;
  }
}

@mixin tablet-portrait {
  @media (min-width: 768px) and (max-width: #{$breakpoint-tablet-portrait}) {
    @content;
  }
}

@mixin tablet-landscape {
  @media (min-width: 1024px) and (max-width: #{$breakpoint-tablet-landscape}) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: 1440px) {
    @content;
  }
}

// Kombinierte Mixins
@mixin phone-only {
  @media (max-width: #{$breakpoint-phone-landscape}) {
    @content;
  }
}

@mixin tablet-only {
  @media (min-width: 768px) and (max-width: #{$breakpoint-tablet-landscape}) {
    @content;
  }
}

@mixin mobile {
  @media (max-width: #{$breakpoint-tablet-portrait}) {
    @content;
  }
}
```

---

### **Verwendung in Komponenten:**

**In `toolbar.component.scss`:**

```scss
@import '../../styles/breakpoints';

.toolbar-button {
  padding: 12px;
  font-size: 16px;

  // Phone Portrait - Extra große Buttons
  @include phone-portrait {
    padding: 16px;
    font-size: 18px;
    min-width: 60px;
    min-height: 60px; // Touch-friendly
  }

  // Tablet - Mittelgroße Buttons
  @include tablet-only {
    padding: 14px;
    font-size: 17px;
    min-width: 55px;
    min-height: 55px;
  }

  // Desktop - Standard
  @include desktop {
    padding: 12px;
    font-size: 16px;
  }
}

// Bottom Navigation nur auf Phone
.mobile-bottom-nav {
  display: none;

  @include phone-only {
    display: block; // Nur auf Phones
  }
}

// Tablet bekommt Side Navigation
.tablet-side-nav {
  display: none;

  @include tablet-only {
    display: block; // Nur auf Tablets
    position: fixed;
    right: 0;
    top: 0;
    width: 80px;
    height: 100vh;
  }
}
```

---

## 🔧 METHODE 2: Angular BreakpointObserver

### **Vorteile:**
- Dynamische UI-Änderungen in TypeScript
- Unterschiedliche Komponenten je nach Bildschirm
- Reagiert auf Rotation

---

### **Schritt 1: Service erstellen**

**Erstelle: `src/app/services/platform-detection.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { BreakpointObserver, Breakpoints, BreakpointState } from '@angular/cdk/layout';
import { Observable, map } from 'rxjs';

export type DeviceType = 'phone' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

@Injectable({
  providedIn: 'root'
})
export class PlatformDetectionService {

  // Observables für Device Type
  public isPhone$: Observable<boolean>;
  public isTablet$: Observable<boolean>;
  public isDesktop$: Observable<boolean>;
  public deviceType$: Observable<DeviceType>;

  // Observables für Orientation
  public isPortrait$: Observable<boolean>;
  public isLandscape$: Observable<boolean>;
  public orientation$: Observable<Orientation>;

  constructor(private breakpointObserver: BreakpointObserver) {
    // Phone Detection
    this.isPhone$ = this.breakpointObserver
      .observe([Breakpoints.HandsetPortrait, Breakpoints.HandsetLandscape])
      .pipe(map(result => result.matches));

    // Tablet Detection
    this.isTablet$ = this.breakpointObserver
      .observe([Breakpoints.TabletPortrait, Breakpoints.TabletLandscape])
      .pipe(map(result => result.matches));

    // Desktop Detection
    this.isDesktop$ = this.breakpointObserver
      .observe([Breakpoints.Web])
      .pipe(map(result => result.matches));

    // Device Type
    this.deviceType$ = this.breakpointObserver
      .observe([
        Breakpoints.HandsetPortrait,
        Breakpoints.HandsetLandscape,
        Breakpoints.TabletPortrait,
        Breakpoints.TabletLandscape,
        Breakpoints.Web
      ])
      .pipe(
        map(result => {
          if (result.breakpoints[Breakpoints.HandsetPortrait] ||
              result.breakpoints[Breakpoints.HandsetLandscape]) {
            return 'phone';
          }
          if (result.breakpoints[Breakpoints.TabletPortrait] ||
              result.breakpoints[Breakpoints.TabletLandscape]) {
            return 'tablet';
          }
          return 'desktop';
        })
      );

    // Orientation Detection
    this.isPortrait$ = this.breakpointObserver
      .observe('(orientation: portrait)')
      .pipe(map(result => result.matches));

    this.isLandscape$ = this.breakpointObserver
      .observe('(orientation: landscape)')
      .pipe(map(result => result.matches));

    this.orientation$ = this.breakpointObserver
      .observe('(orientation: portrait)')
      .pipe(map(result => result.matches ? 'portrait' : 'landscape'));
  }

  // Synchrone Methoden
  public isPhone(): boolean {
    return this.breakpointObserver.isMatched([
      Breakpoints.HandsetPortrait,
      Breakpoints.HandsetLandscape
    ]);
  }

  public isTablet(): boolean {
    return this.breakpointObserver.isMatched([
      Breakpoints.TabletPortrait,
      Breakpoints.TabletLandscape
    ]);
  }

  public isDesktop(): boolean {
    return this.breakpointObserver.isMatched(Breakpoints.Web);
  }

  public getDeviceType(): DeviceType {
    if (this.isPhone()) return 'phone';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  }

  public isPortrait(): boolean {
    return this.breakpointObserver.isMatched('(orientation: portrait)');
  }

  public isLandscape(): boolean {
    return this.breakpointObserver.isMatched('(orientation: landscape)');
  }
}
```

---

### **Schritt 2: In Komponente verwenden**

**In `toolbar.component.ts`:**

```typescript
import { Component, OnInit } from '@angular/core';
import { PlatformDetectionService, DeviceType } from '../../services/platform-detection.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {

  // Reactive Properties
  public deviceType$!: Observable<DeviceType>;
  public isPhone$!: Observable<boolean>;
  public isTablet$!: Observable<boolean>;
  public isPortrait$!: Observable<boolean>;

  // Synchrone Properties
  public deviceType: DeviceType = 'desktop';
  public isPhone: boolean = false;
  public isTablet: boolean = false;

  constructor(
    public platformService: PlatformDetectionService
    // ... andere Services
  ) {}

  ngOnInit(): void {
    // Reactive Subscriptions
    this.deviceType$ = this.platformService.deviceType$;
    this.isPhone$ = this.platformService.isPhone$;
    this.isTablet$ = this.platformService.isTablet$;
    this.isPortrait$ = this.platformService.isPortrait$;

    // Synchrone Werte (für Initialisierung)
    this.deviceType = this.platformService.getDeviceType();
    this.isPhone = this.platformService.isPhone();
    this.isTablet = this.platformService.isTablet();

    // Subscribe to changes
    this.deviceType$.subscribe(type => {
      console.log('Device type changed:', type);
      this.handleDeviceChange(type);
    });
  }

  private handleDeviceChange(deviceType: DeviceType): void {
    switch (deviceType) {
      case 'phone':
        this.configureForPhone();
        break;
      case 'tablet':
        this.configureForTablet();
        break;
      case 'desktop':
        this.configureForDesktop();
        break;
    }
  }

  private configureForPhone(): void {
    // Phone-spezifische Konfiguration
    console.log('Configuring for phone');
    // z.B. Zoom-Level anpassen, Button-Größen ändern
  }

  private configureForTablet(): void {
    // Tablet-spezifische Konfiguration
    console.log('Configuring for tablet');
    // z.B. Sidebar anders positionieren
  }

  private configureForDesktop(): void {
    // Desktop-Konfiguration
    console.log('Configuring for desktop');
  }
}
```

---

### **Schritt 3: Im Template verwenden**

**In `toolbar.component.html`:**

```html
<!-- Conditional Rendering basierend auf Device Type -->

<!-- Phone-Only Navigation -->
<div class="mobile-bottom-nav" *ngIf="isPhone$ | async">
  <!-- Modifier Keys -->
  <div class="mobile-nav-section modifiers">
    <button class="mobile-nav-btn">⇧ Shift</button>
    <button class="mobile-nav-btn">⌃ Strg</button>
  </div>
  <!-- ... -->
</div>

<!-- Tablet-Only Side Navigation -->
<div class="tablet-side-nav" *ngIf="isTablet$ | async">
  <div class="quick-actions-vertical">
    <button class="action-btn">Undo</button>
    <button class="action-btn">Redo</button>
    <button class="action-btn">Delete</button>
  </div>
</div>

<!-- Desktop Toolbar -->
<div class="desktop-toolbar" *ngIf="(deviceType$ | async) === 'desktop'">
  <div class="toolbar-section">
    <!-- Desktop-spezifische Tools -->
  </div>
</div>

<!-- Dynamischer Content basierend auf Device -->
<div [ngSwitch]="deviceType$ | async">
  <div *ngSwitchCase="'phone'">
    <app-phone-ui></app-phone-ui>
  </div>
  <div *ngSwitchCase="'tablet'">
    <app-tablet-ui></app-tablet-ui>
  </div>
  <div *ngSwitchCase="'desktop'">
    <app-desktop-ui></app-desktop-ui>
  </div>
</div>

<!-- Orientation-spezifisch -->
<div class="canvas-container"
     [class.portrait]="isPortrait$ | async"
     [class.landscape]="(isPortrait$ | async) === false">
  <!-- Canvas passt sich an Orientation an -->
</div>
```

---

## 🎮 METHODE 3: Capacitor Platform Detection

### **Für native Features:**

**In `platform-detection.service.ts` erweitern:**

```typescript
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

export class PlatformDetectionService {

  private nativePlatform: string = 'web';
  private deviceInfo: any = null;

  constructor(private breakpointObserver: BreakpointObserver) {
    this.detectNativePlatform();
  }

  private async detectNativePlatform(): Promise<void> {
    // Native Platform
    this.nativePlatform = Capacitor.getPlatform(); // 'ios', 'android', 'web'

    // Device Info
    if (Capacitor.isNativePlatform()) {
      this.deviceInfo = await Device.getInfo();
      console.log('Device Info:', this.deviceInfo);
      // {
      //   model: 'Pixel 6',
      //   platform: 'android',
      //   manufacturer: 'Google',
      //   isVirtual: true, // Emulator
      //   ...
      // }
    }
  }

  public isNativeApp(): boolean {
    return Capacitor.isNativePlatform();
  }

  public isAndroid(): boolean {
    return this.nativePlatform === 'android';
  }

  public isIOS(): boolean {
    return this.nativePlatform === 'ios';
  }

  public isWeb(): boolean {
    return this.nativePlatform === 'web';
  }

  public async isPhysicalDevice(): Promise<boolean> {
    if (!this.deviceInfo) {
      this.deviceInfo = await Device.getInfo();
    }
    return !this.deviceInfo.isVirtual;
  }
}
```

---

## 💡 PRAKTISCHE BEISPIELE

### **Beispiel 1: Unterschiedliche Button-Größen**

**TypeScript:**
```typescript
export class ToolbarComponent {
  public buttonSize: 'small' | 'medium' | 'large' = 'medium';

  ngOnInit(): void {
    this.platformService.deviceType$.subscribe(type => {
      switch (type) {
        case 'phone':
          this.buttonSize = 'large'; // 60x60px
          break;
        case 'tablet':
          this.buttonSize = 'medium'; // 50x50px
          break;
        case 'desktop':
          this.buttonSize = 'small'; // 40x40px
          break;
      }
    });
  }
}
```

**HTML:**
```html
<button [class]="'btn-' + buttonSize">Klick mich</button>
```

**SCSS:**
```scss
.btn-small {
  min-width: 40px;
  min-height: 40px;
  font-size: 14px;
}

.btn-medium {
  min-width: 50px;
  min-height: 50px;
  font-size: 16px;
}

.btn-large {
  min-width: 60px;
  min-height: 60px;
  font-size: 18px;
}
```

---

### **Beispiel 2: Tablet bekommt Split-View**

**HTML:**
```html
<!-- Phone: Stacked Layout -->
<div class="layout-container" *ngIf="isPhone$ | async">
  <div class="canvas-full">
    <app-canvas></app-canvas>
  </div>
  <div class="bom-overlay">
    <app-bom-table></app-bom-table>
  </div>
</div>

<!-- Tablet: Split View -->
<div class="layout-container split" *ngIf="isTablet$ | async">
  <div class="canvas-left">
    <app-canvas></app-canvas>
  </div>
  <div class="bom-right">
    <app-bom-table></app-bom-table>
  </div>
</div>

<!-- Desktop: Full Flexibility -->
<div class="layout-container flexible" *ngIf="(deviceType$ | async) === 'desktop'">
  <app-canvas></app-canvas>
  <app-bom-table [floating]="true"></app-bom-table>
</div>
```

**SCSS:**
```scss
.layout-container {
  &.split {
    display: grid;
    grid-template-columns: 2fr 1fr; // Canvas 66%, BOM 33%
    gap: 10px;
  }
}
```

---

### **Beispiel 3: Orientation-spezifische Canvas-Größe**

**TypeScript:**
```typescript
export class CanvasComponent {
  public canvasWidth: number = 800;
  public canvasHeight: number = 600;

  ngOnInit(): void {
    this.platformService.orientation$.subscribe(orientation => {
      this.adjustCanvasSize(orientation);
    });
  }

  private adjustCanvasSize(orientation: 'portrait' | 'landscape'): void {
    const container = document.querySelector('.canvas-container');
    if (!container) return;

    if (orientation === 'portrait') {
      // Portrait: Höher als breit
      this.canvasWidth = container.clientWidth - 20;
      this.canvasHeight = window.innerHeight - 200; // Platz für Bottom Nav
    } else {
      // Landscape: Breiter als hoch
      this.canvasWidth = container.clientWidth - 20;
      this.canvasHeight = window.innerHeight - 100;
    }

    // Canvas aktualisieren
    this.canvas?.setDimensions({
      width: this.canvasWidth,
      height: this.canvasHeight
    });
  }
}
```

---

## 📦 INSTALLATION @angular/cdk

**Falls BreakpointObserver fehlt:**

```bash
npm install @angular/cdk
```

**In `app.config.ts` oder `app.module.ts`:**
```typescript
import { LayoutModule } from '@angular/cdk/layout';

// In imports:
imports: [
  LayoutModule,
  // ...
]
```

---

## 🎯 BEST PRACTICES

### **1. Mobile First**
```scss
// Base styles für Phone
.toolbar {
  padding: 16px;
  font-size: 18px;
}

// Tablet überschreibt
@media (min-width: 768px) {
  .toolbar {
    padding: 12px;
    font-size: 16px;
  }
}

// Desktop überschreibt
@media (min-width: 1024px) {
  .toolbar {
    padding: 10px;
    font-size: 14px;
  }
}
```

### **2. Touch Targets**
```scss
// Phone: Große Touch-Targets
@include phone-only {
  .clickable {
    min-width: 48px;  // Apple: 44px, Google: 48px
    min-height: 48px;
    padding: 12px;
  }
}
```

### **3. Content Density**
```typescript
// Phone: Weniger Elemente sichtbar
if (this.platformService.isPhone()) {
  this.visibleTools = this.allTools.slice(0, 5); // Nur 5 Tools
} else if (this.platformService.isTablet()) {
  this.visibleTools = this.allTools.slice(0, 10); // 10 Tools
} else {
  this.visibleTools = this.allTools; // Alle Tools
}
```

---

## ✅ ZUSAMMENFASSUNG

### **Wann welche Methode?**

**CSS Media Queries:**
- ✅ Styling-Änderungen
- ✅ Layout-Anpassungen
- ✅ Einfach und performant

**BreakpointObserver:**
- ✅ Dynamische UI-Logik
- ✅ Komponenten laden/entladen
- ✅ Komplexe Anpassungen

**Capacitor Platform:**
- ✅ Native Features (Kamera, GPS, etc.)
- ✅ iOS vs Android Unterschiede
- ✅ Physisches vs virtuelles Gerät

---

## 🚀 NÄCHSTE SCHRITTE

1. **Platform Detection Service erstellen** (siehe oben)
2. **Breakpoints definieren** (`_breakpoints.scss`)
3. **Komponenten anpassen**:
   - Toolbar für Tablet optimieren
   - Canvas-Größe dynamisch
   - Bottom Nav nur auf Phone
4. **Testen**:
   - Phone Emulator
   - Tablet Emulator
   - Browser DevTools

**💡 Tipp:** Kombiniere alle 3 Methoden für optimale Flexibilität!
