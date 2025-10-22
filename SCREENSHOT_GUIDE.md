# 📸 Screenshot-Anleitung für Mobile UI

So erstellst du professionelle Screenshots der mobilen App für den Play Store.

---

## 🌐 Methode 1: Im Browser (Desktop)

### Schritt 1: Dev-Server starten
```bash
npm run dev
```

### Schritt 2: Browser-DevTools öffnen
1. Öffne Chrome/Edge: `http://localhost:4200`
2. Drücke **F12** (DevTools öffnen)
3. Klicke auf das **Geräte-Symbol** (Toggle Device Toolbar) oder **Strg+Shift+M**

### Schritt 3: Geräte-Emulation einstellen

**Für Smartphone-Screenshots:**
- Gerät: **Pixel 6** oder **Samsung Galaxy S21**
- Auflösung: **1080 x 2400** (automatisch)
- Zoom: **100%**

**Für Tablet-Screenshots:**
- Gerät: **iPad Air** oder **Samsung Galaxy Tab S8**
- Auflösung: **1640 x 2360** oder **2560 x 1600**
- Orientierung: **Landscape** (Querformat)

### Schritt 4: Screenshots machen

**Option A - Browser-Screenshot:**
1. Klicke auf die **⋮** (3 Punkte) in den DevTools
2. Wähle **"Capture screenshot"**
3. Speichert als PNG mit korrekter Geräte-Auflösung

**Option B - Windows Snipping Tool:**
1. Windows-Taste + **Shift + S**
2. Bereich auswählen
3. In Paint einfügen und speichern

---

## 📱 Methode 2: Echter Emulator (Android Studio)

### Schritt 1: Emulator starten
```bash
npm run mobile:build
npm run cap:open:android
```

### Schritt 2: Screenshot im Emulator
1. In Android Studio: Klicke auf das **📷 Kamera-Symbol** (rechts im Emulator)
2. Oder im Emulator: **Leiser-Taste + Power-Taste** gleichzeitig
3. Screenshot wird automatisch gespeichert

### Schritt 3: Screenshot finden
- Windows: `C:\Users\<DeinName>\.android\avd\<EmulatorName>.avd\screenshots\`
- Oder direkt im Emulator: **Galerie-App öffnen**

---

## 📲 Methode 3: Echtes Gerät

### Screenshots auf Android:
1. **Leiser-Taste + Power-Taste** gleichzeitig drücken
2. Oder: Wisch-Geste (3 Finger von oben nach unten)
3. Screenshots übertragen:
   - Per USB: Handy verbinden → `Dieser PC` → `Phone` → `DCIM/Screenshots`
   - Per Cloud: Google Photos, Dropbox, etc.

---

## 🎨 Screenshots für Play Store vorbereiten

### Erforderliche Größen:

**Smartphone (Portrait):**
- Mindestens: **1080 x 1920 px**
- Optimal: **1080 x 2400 px** (modernes Handy-Format)
- Anzahl: **2-8 Screenshots**

**Tablet (Landscape):**
- Mindestens: **1920 x 1080 px**
- Optimal: **2560 x 1600 px**
- Anzahl: **2-8 Screenshots** (optional, aber empfohlen)

### Format:
- **PNG** oder **JPEG**
- **Keine** Alpha-Transparenz bei JPEG
- **Maximale Größe**: 8 MB pro Bild
- **Seitenverhältnis**: 16:9 oder 9:16

---

## 📋 Screenshot-Plan (Empfehlung)

### Screenshot 1: Hauptzeichenfläche
**Was zeigen:**
- Canvas mit einer einfachen isometrischen Zeichnung
- Toolbar auf der linken Seite (aufgeklappt)
- Mobile Bottom Navigation am unteren Rand
- Grid aktiviert

**Wie:**
1. Öffne die App
2. Zeichne eine einfache Rohrleitung (3-4 Segmente)
3. Aktiviere Grid
4. Screenshot machen

---

### Screenshot 2: Mobile Bottom Navigation im Einsatz
**Was zeigen:**
- Zoom-Controls in Aktion
- Modifier-Buttons (Shift aktiviert)
- Aktueller Zoom-Level sichtbar

**Wie:**
1. Aktiviere **Shift-Button** (sollte blau leuchten)
2. Zoom auf **150%** einstellen
3. Screenshot machen

---

### Screenshot 3: Zeichnung mit Bemaßung
**Was zeigen:**
- Komplexere Zeichnung mit mehreren Rohren
- Bemaßungslinien
- Text-Annotationen

**Wie:**
1. Zeichne 2-3 verbundene Rohrleitungen
2. Füge ISO-Bemaßungen hinzu (Toolbar → Bemaßung)
3. Füge Text hinzu ("100mm", "DN 50", etc.)
4. Screenshot machen

---

### Screenshot 4: Schweißsymbole & Komponenten
**Was zeigen:**
- Schweißstempel auf Rohren
- T-Stück oder Ventil
- Flansch-Symbole

**Wie:**
1. Toolbar → Schweißen-Sektion öffnen
2. Platziere 2-3 Schweißstempel
3. Füge ein T-Stück hinzu (Piping → T-Stück)
4. Screenshot machen

---

### Screenshot 5: Export/Teilen
**Was zeigen:**
- Export-Menü
- Datei-Optionen (PNG/SVG/JSON)

**Wie:**
1. Toolbar → Datei-Sektion öffnen
2. Falls möglich: Export-Dialog öffnen
3. Screenshot machen

---

### Screenshot 6: BOM-Liste (Optional)
**Was zeigen:**
- Stückliste mit Komponenten-Übersicht

**Wie:**
1. Erstelle eine Zeichnung mit mehreren Komponenten
2. Klicke "BOM Liste" Button
3. Tabelle sollte angezeigt werden
4. Screenshot machen

---

## 🖼️ Screenshot-Nachbearbeitung

### Mit GIMP/Photoshop/Affinity:

1. **Größe anpassen** (falls nötig):
   - Bild → Skalieren
   - Auf 1080 x 2400 px (oder Play Store Anforderung)

2. **Zuschneiden**:
   - Entferne Browser-Chrome (Adressleiste, etc.)
   - Fokus auf App-Inhalt

3. **Optimieren**:
   - PNG komprimieren (TinyPNG.com)
   - Helligkeit/Kontrast leicht erhöhen für bessere Sichtbarkeit

---

## ✨ Pro-Tipps für attraktive Screenshots

### 1. Zeige realistische Inhalte
❌ Leere Canvas
✅ Beispiel-Zeichnung mit mehreren Elementen

### 2. Verwende verschiedene Features
- Screenshot 1: Zeichnen
- Screenshot 2: Bemaßung
- Screenshot 3: Schweißsymbole
- Screenshot 4: Export

### 3. Aktiviere visuell interessante Elemente
- Grid einschalten
- Mehrere Farben verwenden (falls Farbmodus aktiv)
- Modifier-Buttons aktiviert zeigen

### 4. Konsistente Darstellung
- Immer gleicher Zoom-Level (z.B. 100%)
- Gleiche Orientierung (Portrait)
- Gleiche Theme-Einstellungen

---

## 🎯 Schnell-Checkliste

Vor dem Play Store Upload:

- [ ] Mindestens 2 Smartphone-Screenshots (1080 x 2400 px)
- [ ] Optional: 2 Tablet-Screenshots (2560 x 1600 px)
- [ ] Screenshots zeigen verschiedene Features
- [ ] Keine Browser-UI sichtbar
- [ ] PNG oder JPEG Format
- [ ] Jeder Screenshot < 8 MB
- [ ] Screenshots in Ordner organisiert: `screenshots/phone/` und `screenshots/tablet/`

---

## 📁 Ordnerstruktur (Empfehlung)

```
Isoprog/
├── screenshots/
│   ├── phone/
│   │   ├── 01_main_drawing.png
│   │   ├── 02_mobile_nav.png
│   │   ├── 03_dimensioning.png
│   │   ├── 04_welding.png
│   │   └── 05_export.png
│   └── tablet/
│       ├── 01_landscape_main.png
│       └── 02_landscape_tools.png
└── app-icon/
    └── icon-512x512.png
```

---

## 🚀 Nächste Schritte

1. Screenshots erstellen (verwende eine der oben genannten Methoden)
2. Screenshots in `screenshots/` Ordner speichern
3. Beim Play Store Upload hochladen
4. Fertig! 🎉

**Tipp**: Erstelle Screenshots in verschiedenen Sprachen (Deutsch, Englisch) für internationale Märkte!
