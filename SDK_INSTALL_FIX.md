# ✅ SDK Installation - Fehlerbehebung

Fehler: "The selected directory is not a valid home for Android SDK"

**Ursache:** Das SDK wurde noch nicht heruntergeladen/installiert.

---

## 🎯 LÖSUNG: SDK automatisch installieren lassen

### Variante A: Über den Dialog (Empfohlen)

1. **Im aktuellen Dialog:**
   - Klicke **"Cancel"** oder **"Abbrechen"**

2. **Android Studio startet neu** oder zeigt Fehlermeldung

3. **Warte auf Fehlermeldung:** "Android SDK is not found"

4. **Im neuen Dialog:**
   - Klicke **"Setup SDK"** oder **"Download SDK"**
   - SDK Setup Wizard öffnet sich

5. **Im Wizard:**
   - **SDK Location:** Belasse den Standard-Pfad:
     ```
     C:\Users\marek\AppData\Local\Android\Sdk
     ```
   - Klicke **"Next"**
   - **Lizenz:** "Accept" → "Next"
   - **Download startet** (~2-3 GB)
   - Warte bis "Finish"

---

### Variante B: Über Settings (Wenn Dialog geschlossen)

1. **Android Studio Hauptfenster:**
   - **Falls Projekt geöffnet:** File → Settings
   - **Falls Welcome Screen:** Configure → Settings

2. **Settings-Fenster:**
   - Navigiere zu:
     ```
     Appearance & Behavior
       → System Settings
         → Android SDK
     ```

3. **Android SDK Location:**
   - Du siehst ein leeres Feld oder einen ungültigen Pfad

4. **Klicke auf "Edit"** (Button rechts neben dem Pfad-Feld)

5. **SDK Components Setup Wizard öffnet sich:**
   - **Schritt 1 - Verify Settings:**
     - Android SDK Location:
       ```
       C:\Users\marek\AppData\Local\Android\Sdk
       ```
     - Android SDK: **Noch nicht installiert** (wird heruntergeladen)
     - Klicke **"Next"**

   - **Schritt 2 - License Agreement:**
     - Wähle **"Accept"** für alle Lizenzen
     - Klicke **"Next"**

   - **Schritt 3 - Downloading Components:**
     - SDK wird heruntergeladen (~2-3 GB)
     - **Komponenten die installiert werden:**
       - Android SDK Platform 34
       - Android SDK Platform-Tools
       - Android SDK Build-Tools
       - Android Emulator
       - Sources for Android 34
     - ⏱️ Dauer: **5-15 Minuten** (je nach Internet-Geschwindigkeit)

   - **Schritt 4 - Finish:**
     - "Android SDK is up to date"
     - Klicke **"Finish"**

6. **Zurück in Settings:**
   - SDK Location ist jetzt gefüllt:
     ```
     C:\Users\marek\AppData\Local\Android\Sdk
     ```
   - **Klicke "OK"** (unten)

---

## 📦 WAS WIRD INSTALLIERT:

**Standard-Komponenten (~2-3 GB):**
- ✅ Android SDK Platform 34 (API 34 - Android 14)
- ✅ Android SDK Build-Tools 34.0.0
- ✅ Android SDK Platform-Tools (adb, fastboot)
- ✅ Android Emulator
- ✅ Intel x86 Emulator Accelerator (HAXM) - für bessere Performance

---

## ⏱️ ZEITPLAN:

**Schritt für Schritt:**
1. Settings öffnen: **10 Sekunden**
2. Edit klicken: **5 Sekunden**
3. Wizard durchklicken: **30 Sekunden**
4. **SDK Download: 5-15 Minuten** ⏳
5. Installation: **2-3 Minuten**
6. Gradle Sync: **1-2 Minuten**

**Gesamt: ~10-20 Minuten**

---

## 🚀 NACH DER INSTALLATION:

1. **Settings schließen** (OK klicken)

2. **Projekt neu laden:**
   - File → Sync Project with Gradle Files
   - Oder: Klicke 🐘 Gradle-Symbol oben rechts

3. **Warte auf "Gradle sync finished"** ✅

4. **Jetzt bereit zum Bauen!**
   - Emulator erstellen
   - App starten

---

## 🎬 SCHRITT-FÜR-SCHRITT (Mit Screenshots-Beschreibung):

### SCHRITT 1: Settings öffnen
```
File (oben links) → Settings
```

### SCHRITT 2: Zu Android SDK navigieren
```
Linke Seitenleiste:
  Appearance & Behavior
    ↓
  System Settings
    ↓
  Android SDK ← HIER KLICKEN
```

### SCHRITT 3: SDK Location bearbeiten
```
Rechts siehst du:
┌─────────────────────────────────────────┐
│ Android SDK Location:                   │
│ ┌─────────────────────────────┐ [Edit] │
│ │ (leer oder ungültig)        │        │
│ └─────────────────────────────┘        │
└─────────────────────────────────────────┘

→ Klicke [Edit]
```

### SCHRITT 4: SDK Setup Wizard
```
┌────────────────────────────────────┐
│ SDK Components Setup               │
├────────────────────────────────────┤
│ SDK Location:                      │
│ C:\Users\marek\AppData\Local\     │
│   Android\Sdk                      │
│                                    │
│ Components to Download:            │
│ ☑ Android SDK Platform 34          │
│ ☑ Android SDK Build-Tools          │
│ ☑ Android SDK Platform-Tools       │
│                                    │
│        [Cancel]  [Next >]          │
└────────────────────────────────────┘

→ Klicke [Next >]
```

### SCHRITT 5: Lizenz akzeptieren
```
┌────────────────────────────────────┐
│ License Agreement                  │
├────────────────────────────────────┤
│ ○ Decline                          │
│ ● Accept                           │
│                                    │
│        [< Back]  [Next >]          │
└────────────────────────────────────┘

→ Wähle "Accept"
→ Klicke [Next >]
```

### SCHRITT 6: Download läuft
```
┌────────────────────────────────────┐
│ Downloading Components...          │
├────────────────────────────────────┤
│ Progress:                          │
│ ████████░░░░░░░░░░░░  45%         │
│                                    │
│ Downloading SDK Platform 34...     │
│ 1.2 GB / 2.8 GB                   │
│                                    │
│ ⏱️ Time remaining: ~8 minutes      │
└────────────────────────────────────┘

→ Warte geduldig ☕
```

### SCHRITT 7: Fertig!
```
┌────────────────────────────────────┐
│ Android SDK is up to date          │
├────────────────────────────────────┤
│ ✓ All components installed         │
│                                    │
│               [Finish]             │
└────────────────────────────────────┘

→ Klicke [Finish]
```

---

## 🛠️ TROUBLESHOOTING:

### Problem: "Failed to download SDK components"

**Lösung 1: Proxy-Einstellungen prüfen**
```
Settings → Appearance & Behavior → System Settings → HTTP Proxy
→ Wähle "No proxy"
→ OK
→ Versuche erneut
```

**Lösung 2: Firewall/Antivirus**
- Windows Defender/Firewall: Android Studio erlauben
- Temporär Antivirus deaktivieren während Download

**Lösung 3: Manueller Download**
1. Gehe zu: https://developer.android.com/studio#command-tools
2. Downloade "Command line tools only" (Windows)
3. Entpacke ZIP-Datei
4. Verschiebe nach: `C:\Users\marek\AppData\Local\Android\Sdk\cmdline-tools\`
5. Starte Android Studio neu

---

### Problem: Download sehr langsam

**Tipps:**
- Warte geduldig (2-3 GB brauchen Zeit)
- Schließe andere Programme (Browser, Downloads)
- Prüfe Internet-Geschwindigkeit
- Beste Zeit: Nachts/früh morgens (weniger Netzlast)

---

### Problem: "Not enough disk space"

**Lösung:**
- Benötigt: **~5-10 GB freier Speicherplatz**
- Prüfe Festplatte: `C:\` sollte mind. 10 GB frei haben
- Falls zu wenig: Temporäre Dateien löschen, Programme deinstallieren

---

## ✅ CHECKLISTE NACH INSTALLATION:

Nach erfolgreicher SDK-Installation solltest du sehen:

- [ ] Settings → Android SDK → SDK Location zeigt:
      ```
      C:\Users\marek\AppData\Local\Android\Sdk
      ```

- [ ] SDK Platforms Tab zeigt:
      - ✅ Android 14.0 ("UpsideDownCake") - API Level 34

- [ ] SDK Tools Tab zeigt:
      - ✅ Android SDK Build-Tools 34.0.0
      - ✅ Android SDK Platform-Tools
      - ✅ Android Emulator

- [ ] Ordner `C:\Users\marek\AppData\Local\Android\Sdk\` existiert

- [ ] Gradle Sync läuft ohne Fehler durch

---

## 🎯 KURZVERSION (TL;DR):

1. **File → Settings**
2. **Appearance & Behavior → System Settings → Android SDK**
3. **Klicke "Edit"** (rechts neben SDK Location)
4. **Next → Accept → Next**
5. **Warte ~10 Minuten** (Download)
6. **Finish → OK**
7. **Gradle Sync** abwarten
8. **FERTIG!** ✅

---

## 📞 NÄCHSTER SCHRITT:

**Nach erfolgreicher SDK-Installation:**

→ Siehe: `ANDROID_STUDIO_TESTING.md`
→ Emulator erstellen
→ App starten! 🚀

---

**💡 WICHTIG:** Lass den Download NICHT unterbrechen! Falls doch:
- Android Studio merkt sich Fortschritt
- Beim nächsten Versuch geht es weiter
- Nicht von vorne beginnen

**🎉 Nach Installation bist du ready zum App-Bauen!**
