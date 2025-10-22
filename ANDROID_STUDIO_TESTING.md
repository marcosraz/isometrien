# 🎮 Android Studio Testing Guide

Android Studio wurde geöffnet! Hier ist die Schritt-für-Schritt-Anleitung zum Testen.

---

## 📱 SCHRITT 1: Android Studio lädt das Projekt

**Was passiert gerade:**
- Android Studio öffnet sich automatisch
- Projekt wird geladen (kann 1-2 Minuten dauern)
- Gradle synchronisiert Dependencies

**Was du siehst:**
- Unten rechts: "Gradle Sync" Fortschrittsbalken
- Warte bis "Gradle Sync finished" erscheint

**⏳ Beim ersten Mal:** Gradle lädt ~500MB Dependencies herunter (einmalig!)

---

## 🎯 SCHRITT 2: Emulator einrichten (falls noch nicht vorhanden)

### Option A: Vorhandenen Emulator verwenden

1. **Oben in der Toolbar:** Klicke auf das **Geräte-Dropdown** (neben dem grünen ▶️ Button)
2. **Wenn ein Gerät aufgelistet ist:** Wähle es aus → **Weiter zu Schritt 3**
3. **Wenn "No devices" steht:** Fahre mit Option B fort

---

### Option B: Neuen Emulator erstellen

1. **Toolbar:** Klicke auf **"Device Manager"** Icon (📱 Handy mit Android-Logo)
   - Oder: **Tools → Device Manager**

2. **Device Manager öffnet sich:**
   - Klicke auf **"+"** (Create Device) oder **"Create Virtual Device"**

3. **Hardware auswählen:**
   - Kategorie: **"Phone"**
   - Wähle: **"Pixel 6"** oder **"Pixel 7"** (empfohlen)
   - Bildschirmgröße: **6.4"** / **1080 x 2400 px**
   - Klicke **"Next"**

4. **System Image auswählen:**
   - Tab: **"Recommended"**
   - Wähle: **"Tiramisu"** (API 33 - Android 13)
     - Oder: **"UpsideDownCake"** (API 34 - Android 14)
   - **Falls nicht heruntergeladen:** Klicke auf **"Download"** (neben dem Namen)
     - Download: ~800 MB, dauert 3-10 Minuten
   - Klicke **"Next"**

5. **AVD (Android Virtual Device) konfigurieren:**
   - **AVD Name:** `Pixel_6_API_33` (oder anderer Name)
   - **Startup Orientation:** Portrait
   - **Advanced Settings** (optional):
     - **RAM:** 2048 MB (Standard)
     - **VM Heap:** 256 MB
     - **Internal Storage:** 2048 MB
   - Klicke **"Finish"**

6. **Emulator ist fertig!** ✅

---

## ▶️ SCHRITT 3: App im Emulator starten

### Methode 1: Direkt starten (empfohlen)

1. **Oben in der Toolbar:**
   - Stelle sicher, dass **"app"** ausgewählt ist (linkes Dropdown)
   - Wähle deinen **Emulator** (mittleres Dropdown)

2. **Klicke auf den grünen ▶️ "Run" Button**
   - Oder drücke **Shift + F10**

3. **Was passiert:**
   - Gradle baut die App (~30-60 Sekunden beim ersten Mal)
   - Emulator startet (dauert ~30 Sekunden)
   - App wird automatisch installiert und gestartet
   - **Fertig!** 🎉

---

### Methode 2: APK manuell bauen (für Download)

1. **Menü:** **Build → Build Bundle(s) / APK(s) → Build APK(s)**

2. **Gradle baut die APK:**
   - Unten rechts: "Build APK(s)" Fortschritt
   - Nach ~1 Minute: **"locate"** Link erscheint

3. **APK finden:**
   - Klicke auf **"locate"**
   - Öffnet: `android/app/build/outputs/apk/debug/`
   - **Datei:** `app-debug.apk`

4. **APK installieren:**
   - **Emulator:** Drag & Drop APK auf Emulator-Fenster
   - **Echtes Gerät:**
     - Per USB verbinden
     - `adb install app-debug.apk`
     - Oder APK per E-Mail/Cloud senden

---

## 🎮 SCHRITT 4: App im Emulator testen

### Emulator-Bedienung:

**Rechte Toolbar im Emulator:**
- **⚪ Power** - Ein/Aus
- **🔊 Volume** - Lauter/Leiser
- **↶ Rotate** - Bildschirm drehen
- **← Back** - Zurück-Button
- **⌂ Home** - Home-Button
- **▭ Recent** - App-Übersicht
- **📷 Screenshot** - Screenshot erstellen

---

### Touch-Simulation:

- **Mausklick** = Single Tap
- **Doppelklick** = Double Tap
- **Strg + Mausklick & ziehen** = Pinch-to-Zoom simulieren
- **Shift + Mausklick & ziehen** = Zwei-Finger-Pan simulieren

---

### App-Features testen:

**✅ Test-Checkliste:**

1. **App startet:**
   - [ ] App öffnet sich automatisch
   - [ ] Canvas ist sichtbar
   - [ ] Sidebar links ist sichtbar
   - [ ] **Mobile Bottom Navigation** am unteren Rand sichtbar

2. **Bottom Navigation:**
   - [ ] **⇧ Shift Button** antippen → leuchtet blau
   - [ ] **⌃ Strg Button** antippen → leuchtet blau
   - [ ] **− Button** (Zoom Out) funktioniert
   - [ ] **+ Button** (Zoom In) funktioniert
   - [ ] **Zoom-Anzeige** ändert sich (z.B. 150%)

3. **Zeichnen:**
   - [ ] Toolbar → **Zeichnen** → **Linie**
   - [ ] Mit Maus auf Canvas klicken (simuliert Touch)
   - [ ] Linie wird gezeichnet

4. **Touch-Gesten:**
   - [ ] **Strg + Scroll** (Zoom simulieren)
   - [ ] **Shift + Klicken & Ziehen** (Pan simulieren)

5. **Undo/Redo:**
   - [ ] **↶ Button** in Bottom Nav → Letzte Aktion rückgängig
   - [ ] **↷ Button** in Bottom Nav → Wiederholen

6. **Rotation:**
   - [ ] Emulator → **↶ Rotate Button**
   - [ ] App dreht sich mit (Landscape-Modus)
   - [ ] Bottom Nav bleibt am unteren Rand

---

## 📸 SCHRITT 5: Screenshots erstellen

### Im Emulator:

1. **Methode A - Emulator-Toolbar:**
   - Klicke auf das **📷 Kamera-Symbol** (rechts im Emulator)
   - Screenshot wird gespeichert
   - Fenster zeigt Speicherort

2. **Methode B - Tastenkombination:**
   - Im Emulator: **Power + Volume Down** gleichzeitig
   - Oder: **Strg + S** (Windows)

3. **Screenshots finden:**
   - Standard-Pfad: `C:\Users\<DeinName>\Pictures\Screenshots\`
   - Oder in Android Studio: **View → Tool Windows → Device File Explorer**
     - Navigiere zu: `/sdcard/Pictures/Screenshots/`

---

## 🚀 SCHRITT 6: APK auf echtem Gerät testen (optional)

### Voraussetzungen:
- Android-Handy mit **USB-Debugging aktiviert**
- USB-Kabel (Daten-Übertragung, nicht nur Laden!)

### Anleitung:

1. **USB-Debugging aktivieren (einmalig):**
   - Handy: **Einstellungen → Über das Telefon**
   - **7x auf "Build-Nummer" tippen**
   - **Einstellungen → Entwickleroptionen**
   - **USB-Debugging** aktivieren

2. **Handy per USB verbinden:**
   - Kabel einstecken
   - Auf Handy: **"USB-Debugging erlauben?"** → **"Erlauben"**

3. **In Android Studio:**
   - Oben im Geräte-Dropdown: Dein Handy sollte erscheinen
   - Wähle es aus
   - Klicke **▶️ Run**

4. **App wird auf Handy installiert!** 🎉

---

## 🔧 TROUBLESHOOTING

### Problem: Gradle Sync schlägt fehl

**Lösung 1:** Gradle Wrapper herunterladen
```
File → Settings → Build, Execution, Deployment → Gradle
→ Use Gradle from: 'gradle-wrapper.properties'
→ OK
```

**Lösung 2:** Cache leeren
```
File → Invalidate Caches → Invalidate and Restart
```

---

### Problem: Emulator startet nicht

**Lösung 1:** Virtualisierung im BIOS aktivieren
- Starte PC neu
- Gehe ins BIOS (meist F2/Del beim Start)
- Suche nach: "Intel VT-x" oder "AMD-V" oder "SVM"
- Aktiviere es
- Speichern & Neustart

**Lösung 2:** Hardware-Beschleunigung prüfen
```
C:\Users\<DeinName>\AppData\Local\Android\Sdk\emulator\emulator-check.exe accel
```

**Lösung 3:** Alternativen Emulator verwenden
- Device Manager → Anderes System Image wählen
- Oder: x86 statt ARM (schneller auf Intel-CPUs)

---

### Problem: App stürzt beim Start ab

**Lösung 1:** Logs prüfen
- Unten in Android Studio: **"Logcat"** Tab
- Suche nach roten Fehlermeldungen
- Filtere nach: `com.isometrics.app`

**Lösung 2:** Clean Build
```
Build → Clean Project
Build → Rebuild Project
```

**Lösung 3:** Dependencies neu laden
```bash
# Im Terminal (unten in Android Studio)
cd ..
npm run mobile:build
npx cap sync
```

---

### Problem: Bottom Navigation nicht sichtbar

**Ursache:** Bildschirm zu breit (> 768px)

**Lösung:**
- Drehe Emulator: **↶ Rotate** (sollte in Portrait sein)
- Oder: Verwende kleineren Emulator (Pixel 5 statt Pixel 6 Pro)

---

### Problem: Touch funktioniert nicht

**Ursache:** Touch-Events werden nicht simuliert

**Lösung:**
- Verwende normale Mausklicks (werden automatisch zu Touch konvertiert)
- Im Emulator sind Mausklicks = Touch-Events

---

## 📊 BUILD-ZEITEN (Erwartungswerte)

**Beim ersten Mal:**
- Gradle Sync: ~2-5 Minuten
- System Image Download: ~5-10 Minuten (800 MB)
- Erster Build: ~2-3 Minuten
- Emulator Start: ~30-60 Sekunden

**Nachfolgende Builds:**
- Gradle Sync: ~5-15 Sekunden
- Build: ~30-60 Sekunden
- Emulator Start: ~10-20 Sekunden

---

## 🎯 QUICK-COMMANDS (Terminal in Android Studio)

### Build-Befehle:
```bash
# Debug-APK bauen
./gradlew assembleDebug

# Release-APK bauen (braucht Keystore)
./gradlew assembleRelease

# App Bundle für Play Store
./gradlew bundleRelease

# Clean Build
./gradlew clean
```

### APK-Dateien finden:
```bash
# Debug-APK
explorer app\build\outputs\apk\debug

# Release-APK
explorer app\build\outputs\apk\release
```

---

## ✅ FERTIG - NÄCHSTE SCHRITTE

**Nach erfolgreichem Test:**

1. **Screenshots erstellen:**
   - Siehe `SCREENSHOT_GUIDE.md`
   - Mindestens 2 Screenshots für Play Store

2. **APK teilen:**
   - `app-debug.apk` per E-Mail/Cloud senden
   - Auf anderen Geräten testen

3. **Play Store vorbereiten:**
   - Siehe `MOBILE_BUILD_GUIDE.md`
   - Keystore erstellen
   - Release-AAB bauen

---

## 🎮 EMULATOR-SHORTCUTS

| Shortcut | Aktion |
|----------|--------|
| **Strg + M** | Menü öffnen |
| **Strg + ←/→** | Bildschirm drehen |
| **Strg + S** | Screenshot |
| **Alt + Enter** | Vollbild |
| **Strg + P** | Power (Ein/Aus) |
| **Strg + K** | Back-Button |
| **Strg + H** | Home-Button |
| **Strg + O** | Recent Apps |

---

## 📞 SUPPORT

- **Android Studio Handbuch**: https://developer.android.com/studio
- **Emulator Docs**: https://developer.android.com/studio/run/emulator
- **Capacitor Android**: https://capacitorjs.com/docs/android

---

**🎉 Viel Erfolg beim Testen!**

**Die App sollte jetzt im Emulator laufen mit:**
- ✅ Mobile Bottom Navigation
- ✅ Touch-Simulation
- ✅ Zoom-Controls
- ✅ Modifier-Key-Buttons

**Wenn du Probleme hast, schau in die Troubleshooting-Sektion oben!** 🛠️
