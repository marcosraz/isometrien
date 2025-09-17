# 🔧 Isometrische Zeichnungsanwendung - Präsentationshandbuch

## 📋 Übersicht der Anwendung

Diese Angular-basierte Webanwendung ermöglicht die Erstellung professioneller isometrischer technischer Zeichnungen für Rohrleitungssysteme. Die Anwendung wurde speziell für die Anforderungen der industriellen Rohrleitungsplanung entwickelt und bietet eine intuitive Benutzeroberfläche mit umfangreichen Zeichenwerkzeugen.

### Hauptmerkmale:
- **Isometrische Projektion**: Automatische isometrische Darstellung aller Elemente
- **Präzise Zeichenwerkzeuge**: Linien, Rohrleitungen, Ventile und Verbindungsstücke
- **Intelligente Bemaßung**: Automatische und manuelle Bemaßungssysteme
- **Schweißsymbole**: Vollständige Palette industrieller Schweißmarkierungen
- **State Management**: Umfassendes Undo/Redo-System (bis zu 50 Schritte)
- **Export-Funktionen**: PNG, SVG, JSON und Druckausgabe

## 🎯 Funktionsübersicht

### 1. Zeichenwerkzeuge (Drawing Tools)

#### **Freihand-Zeichnen** ✏️
- Freies Zeichnen mit variabler Strichstärke
- **Strg + Mausrad**: Strichstärke anpassen
- **Shift**: Gerade Linien zeichnen
- Farbauswahl über Farbwähler

#### **Linien** 📏
- Isometrische Linien mit Ankerpunkten
- **Shift**: 30° Winkel-Raster
- **Strg**: Orthogonale (90°) Ausrichtung
- Automatische Ankerpunkt-Erstellung

#### **Rohrleitungen** 🔧
- Intelligentes Pipe-Routing mit automatischer Eckenabrundung
- Mehrpunkt-Rohrleitungen mit Bearbeitungsmöglichkeit
- Ankerpunkte können nachträglich verschoben werden
- Radius-Anpassung für Rohrbiegungen

### 2. Bemaßung (Measurement)

#### **Standard-Dimension** 📏
- 3-Schritt-Prozess: Startpunkt → Endpunkt → Label-Position
- Automatische Distanzberechnung
- Editierbarer Text per Doppelklick

#### **ISO-Dimension** 📐
- Isometrische Bemaßung nach DIN/ISO-Standard
- **TAB-Taste**: Wechsel zwischen horizontaler/vertikaler Ausrichtung
- Snap-to-Anchor für präzise Platzierung

### 3. Schweißsymbole (Welding)

#### Verfügbare Symbole:
1. **Schweißstempel** 🔴 - Standardschweißmarkierung
2. **Schweißer-Stempel** 👷 - Mit Schweißer-Nummer
3. **Schweißer leer** ⭕ - Unbearbeitete Schweißstelle
4. **Schweißer AS** 🔵 - AS-Schweißung
5. **Schweißnaht** ✖️ - Schweißnahtmarkierung
6. **Flansch** ⬡ - Flanschverbindung
7. **Spool** 🔄 - Spool-Nummerierung mit Auto-Inkrement

### 4. Rohrleitungen & Ventile (Piping)

#### **T-Stücke**
- Platzierung auf bestehenden Rohrleitungen
- **Strg**: Spiegeln der Ausrichtung
- **Shift**: Seitenwechsel
- Automatische Winkelberechnung

#### **Ventile** (3 Typen × 2 Varianten)
1. **Gate Valve** - Absperrschieber (S/FL)
2. **Globe Valve** - Durchgangsventil (S/FL)
3. **Ball Valve** - Kugelhahn (S/FL)

#### **Fließrichtung** ➡️
- Pfeilmarkierungen für Medienfluss
- Automatische Ausrichtung an Rohrleitungen

### 5. Objektverwaltung (Objects)

- **Gruppieren**: Mehrere Objekte zu einer Einheit
- **Gruppierung aufheben**: Einzelelemente wiederherstellen
- **Text**: Editierbare Textfelder
- **Ankerpunkte**: Manuelle Verbindungspunkte

## ⌨️ Tastaturkürzel

### Zeichenmodus
| Taste | Funktion |
|-------|----------|
| **L** | Linienmodus |
| **P** | Rohrleitungsmodus |
| **D** | Bemaßungsmodus |
| **T** | Textmodus |
| **M** | Verschiebemodus (Rohre) |
| **B** | Verschiebemodus (Komponenten) |
| **K** | T-Stück platzieren |
| **R** | Rohrleitungen-Menü |
| **ESC** | Modus beenden |

### Bearbeitung
| Tastenkombination | Funktion |
|-------------------|----------|
| **Strg + Z** | Rückgängig |
| **Strg + Y** | Wiederholen |
| **Strg + A** | Alles auswählen |
| **Entf/Backspace** | Löschen |

### Ansicht
| Taste | Funktion |
|-------|----------|
| **G** | Grid ein/aus |
| **F** | An Canvas anpassen |
| **Strg + 0** | Zoom zurücksetzen |
| **+/-** | Zoom ein/aus |

### Export
| Tastenkombination | Funktion |
|-------------------|----------|
| **Strg + S** | Als PNG exportieren |
| **Strg + Shift + S** | Als SVG exportieren |
| **Strg + P** | Drucken |

### Farbmodi
| Tastenkombination | Funktion |
|-------------------|----------|
| **Alt + 1** | Zeichenmodus (Farbe) |
| **Alt + 2** | Schwarz-Weiß |
| **Alt + 3** | DIN/ISO Norm |

## 🎮 Bedienungshinweise

### Grid & Snap-Funktionen
- **Grid-System**: Einstellbare Rastergröße (5-100px)
- **Winkel-Snap**: 15°, 30°, 45° Raster
- **Anchor-Snap**: Automatisches Einrasten an Verbindungspunkten
- Grüne Hervorhebung bei Nähe zu Ankerpunkten

### Maus-Interaktionen
- **Linksklick**: Punkte setzen / Objekte auswählen
- **Doppelklick**: Text/Werte bearbeiten
- **Rechtsklick**: Kontextmenü (browserabhängig)
- **Mausrad**: Zoom (mit Strg: Strichstärke bei Freihand)
- **Mittlere Maustaste**: Canvas verschieben (Pan)

### State Management
- Alle Aktionen werden automatisch gespeichert
- Bis zu 50 Undo-Schritte verfügbar
- Komplexe Objektbeziehungen bleiben erhalten
- Service-spezifische Metadaten werden mitgespeichert

## 📊 Präsentations-Workflow

### 1. **Start der Demonstration**
```bash
npm run dev
```
Öffnen Sie Browser auf `http://localhost:4200`

### 2. **Grundlegende Zeichnung erstellen**
1. Mit **P** Rohrleitungsmodus aktivieren
2. Isometrische Rohrleitung zeichnen (3-4 Punkte)
3. **ESC** zum Beenden
4. Ankerpunkte sind automatisch sichtbar

### 3. **Komponenten hinzufügen**
1. **K** für T-Stück-Modus
2. Auf Rohrleitung klicken für Platzierung
3. **1** oder **2** für Ventile
4. Position mit Maus wählen

### 4. **Bemaßung demonstrieren**
1. **D** für ISO-Bemaßung
2. Zwei Ankerpunkte wählen
3. Label-Position festlegen
4. Doppelklick zum Bearbeiten des Texts

### 5. **Schweißmarkierungen**
1. Toolbar → Schweißen-Sektion
2. Schweißstempel auswählen
3. Zwei Klicks für Platzierung
4. Doppelklick für Nummerneingabe

### 6. **Export zeigen**
1. **Strg + S** für PNG-Export
2. Oder Export-Buttons in Toolbar
3. Druckvorschau mit **Strg + P**

## 💡 Tipps für die Präsentation

### Highlights der Anwendung:
1. **Echtzeitbearbeitung**: Alle Änderungen sofort sichtbar
2. **Präzision**: Winkel-Snap und Grid für exakte Zeichnungen
3. **Industriestandard**: DIN/ISO-konforme Symbole
4. **Flexibilität**: Nachträgliche Bearbeitung aller Elemente
5. **Performance**: Optimiert für große Zeichnungen

### Häufige Anwendungsfälle:
- Rohrleitungsplanung für Industrieanlagen
- Dokumentation bestehender Systeme
- Schweißplan-Erstellung
- Montageanleitungen
- Isometrische Übersichtszeichnungen

### Problemlösungen während Demo:
- **Objekt nicht auswählbar**: ESC drücken, dann erneut versuchen
- **Modus funktioniert nicht**: Aktuellen Modus mit ESC beenden
- **Zoom verloren**: F-Taste für Fit-to-Canvas
- **Fehler gemacht**: Strg+Z für Undo

## 🛠️ Technische Details

### Architektur:
- **Frontend**: Angular 20 mit Standalone Components
- **Canvas-Engine**: Fabric.js 6.7.1
- **State Management**: Custom Service mit 50-State-History
- **Rendering**: Optimierte isometrische Projektion

### Service-Struktur:
1. **DrawingService**: Zentrale Orchestrierung
2. **LineDrawingService**: Linien/Rohr-Erstellung
3. **PipingService**: Ventile und T-Stücke
4. **WeldingService**: Schweißsymbole
5. **DimensionService**: Bemaßungssystem
6. **StateManagementService**: Undo/Redo
7. **IsometryService**: Mathematische Berechnungen

### Performance:
- Lazy Loading für große Zeichnungen
- Optimierte Event-Handler
- Effiziente Canvas-Aktualisierung
- Minimaler Memory-Footprint

## 📝 Notizen für Vorführung

- Betonen Sie die **Einfachheit** der Bedienung
- Zeigen Sie **praktische Anwendungsfälle**
- Demonstrieren Sie die **Präzision** mit Grid und Snap
- Heben Sie die **Undo/Redo-Funktionalität** hervor
- Präsentieren Sie verschiedene **Export-Optionen**
- Erwähnen Sie die **Erweiterbarkeit** der Anwendung

---

**Viel Erfolg bei Ihrer Präsentation!** 🎯

Bei Fragen oder Problemen während der Demo können Sie jederzeit ESC drücken, um zum Ausgangszustand zurückzukehren.