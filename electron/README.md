# Isometrien Desktop App

Diese Desktop-Version der Isometrien-App wird mit Electron erstellt.

## Voraussetzungen

- Node.js 18+
- Windows 10 oder höher (für Windows-Build)
- Optional: Visual Studio Build Tools (für native Module)

## Build-Anleitung

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Icon vorbereiten
Bevor du die App bauen kannst, benötigst du ein Icon:

1. Erstelle ein 512x512px PNG-Icon
2. Konvertiere es zu .ico Format
3. Speichere es als `electron/resources/icon.ico`

**Temporäre Lösung ohne Icon:**
Kopiere eine beliebige .ico Datei nach `electron/resources/icon.ico`

### 3. Windows Installer erstellen

```bash
# Erstellt .exe Installer
npm run build:win

# Erstellt portable .exe (ohne Installation)
npm run build:win-portable
```

Die fertigen Installer findest du in `electron/dist/`

## Entwicklung

```bash
# Startet Electron im Entwicklungsmodus
npm run electron:dev
```

## Verfügbare Befehle

- `npm run electron` - Startet Electron mit gebauter App
- `npm run electron:dev` - Entwicklungsmodus
- `npm run build:prod` - Baut Angular App für Produktion
- `npm run build:win` - Erstellt Windows Installer
- `npm run build:win-portable` - Erstellt portable Windows App
- `npm run dist` - Alias für build:win

## Ausgabe-Verzeichnis

Alle gebauten Dateien befinden sich in:
- `electron/dist/` - Installer und portable Apps
- `dist/isometrien/` - Gebaute Angular App

## Troubleshooting

### Fehlende Icons
Wenn der Build wegen fehlender Icons fehlschlägt:
1. Erstelle eine temporäre .ico Datei
2. Oder kommentiere Icon-Referenzen in `electron-builder.json` aus

### Build-Fehler auf Linux/Mac
Für Windows-Builds auf anderen Plattformen:
```bash
npm install --save-dev wine
```