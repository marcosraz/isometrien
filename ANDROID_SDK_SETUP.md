# 🛠️ Android SDK Setup - Schnellanleitung

Android Studio benötigt das Android SDK. Hier ist die einfachste Lösung!

---

## ✅ LÖSUNG 1: Automatische Installation (Empfohlen)

### Schritt 1: SDK automatisch installieren lassen

**Im Android Studio Dialog:**

1. **Du siehst:** "Please provide Android SDK location"

2. **Klicke auf:** **"Download Android SDK"** oder **"Install SDK"**
   - Oder: **"Next"** / **"OK"** (wenn kein SDK gefunden wurde)

3. **Android Studio SDK Setup Wizard startet:**
   - Klicke **"Next"**
   - **Lizenzvereinbarung:** Klicke **"Accept"** → **"Next"**
   - **SDK wird heruntergeladen** (~2-3 GB, dauert 5-15 Minuten)
   - Warte bis "Finish" erscheint

4. **Fertig!** ✅ SDK ist installiert

---

## 🗂️ LÖSUNG 2: SDK-Pfad manuell angeben

**Falls du Android Studio bereits installiert hast:**

### Standard SDK-Pfade:

**Windows:**
```
C:\Users\<DeinName>\AppData\Local\Android\Sdk
```

**In deinem Fall (marek):**
```
C:\Users\marek\AppData\Local\Android\Sdk
```

### So gibst du den Pfad an:

1. **Im Dialog:** Klicke auf **"..."** (Browse) Button

2. **Navigiere zu:**
   ```
   C:\Users\marek\AppData\Local\Android\Sdk
   ```

3. **Falls der Ordner NICHT existiert:**
   - Wähle den übergeordneten Ordner: `C:\Users\marek\AppData\Local\Android\`
   - Android Studio erstellt `Sdk` Ordner automatisch

4. **Klicke:** "OK" / "Select"

5. **Android Studio prüft den Pfad** und lädt fehlende Komponenten herunter

---

## 🔍 LÖSUNG 3: Prüfen ob SDK bereits installiert ist

**Schritt 1: Pfad prüfen**

Öffne Windows Explorer und gib in die Adresszeile ein:
```
%LOCALAPPDATA%\Android\Sdk
```

**Drücke Enter**

**Was du siehst:**

**✅ FALL A: Ordner existiert mit Unterordnern**
- Ordner enthält: `platform-tools`, `platforms`, `build-tools`, etc.
- **→ SDK ist installiert!**
- **→ Gib diesen Pfad in Android Studio ein** (siehe Lösung 2)

**❌ FALL B: Ordner existiert nicht oder ist leer**
- **→ SDK ist NICHT installiert**
- **→ Verwende Lösung 1** (Automatische Installation)

---

## ⚙️ LÖSUNG 4: SDK über Android Studio Settings installieren

**Falls du den Dialog geschlossen hast:**

### Schritt 1: Settings öffnen

1. **Menü:** File → Settings (oder Strg+Alt+S)

2. **Navigiere zu:**
   ```
   Appearance & Behavior → System Settings → Android SDK
   ```

### Schritt 2: SDK Location einstellen

1. **Oben siehst du:** "Android SDK Location"

2. **FALL A - SDK-Pfad ist leer:**
   - Klicke **"Edit"** (neben dem Pfad)
   - **SDK Setup Wizard startet**
   - Klicke **"Next"** → **"Accept"** → **"Next"**
   - SDK wird heruntergeladen (~2-3 GB)

3. **FALL B - SDK-Pfad ist vorhanden:**
   - Prüfe den Pfad (sollte sein: `C:\Users\marek\AppData\Local\Android\Sdk`)
   - Falls falsch: Klicke **"..."** und wähle korrekten Pfad

### Schritt 3: SDK Komponenten installieren

**Im gleichen Settings-Fenster:**

1. **Tab "SDK Platforms":**
   - ✅ **Android 13.0 (Tiramisu)** - API Level 33
   - ✅ **Android 14.0 (UpsideDownCake)** - API Level 34 (optional)
   - Klicke **"Apply"**

2. **Tab "SDK Tools":**
   - ✅ **Android SDK Build-Tools**
   - ✅ **Android SDK Platform-Tools**
   - ✅ **Android Emulator**
   - ✅ **Intel x86 Emulator Accelerator (HAXM)** (für Intel-CPUs)
   - Klicke **"Apply"**

3. **Download startet:**
   - Warte bis "Install Complete"
   - Klicke **"Finish"**

4. **Klicke:** "OK" (unten im Settings-Fenster)

---

## 🎯 EMPFOHLENE SDK-KOMPONENTEN:

### Minimal (für diese App):
- ✅ **Android SDK Platform 33** (Android 13)
- ✅ **Android SDK Build-Tools 34.0.0**
- ✅ **Android SDK Platform-Tools**
- ✅ **Android Emulator**

### Vollständig (empfohlen):
- ✅ **Android SDK Platform 33** (Android 13)
- ✅ **Android SDK Platform 34** (Android 14)
- ✅ **Android SDK Build-Tools 34.0.0**
- ✅ **Android SDK Platform-Tools**
- ✅ **Android Emulator**
- ✅ **Intel x86 Emulator Accelerator (HAXM)**
- ✅ **Google Play Services**

---

## 📁 WO WIRD DAS SDK INSTALLIERT?

**Standard-Pfad:**
```
C:\Users\marek\AppData\Local\Android\Sdk\
```

**Ordnerstruktur nach Installation:**
```
Sdk/
├── build-tools/
│   └── 34.0.0/
├── emulator/
├── platforms/
│   ├── android-33/  (Android 13)
│   └── android-34/  (Android 14)
├── platform-tools/
│   ├── adb.exe
│   └── fastboot.exe
├── system-images/
└── tools/
```

**Größe:** ~2-5 GB (je nach installierten Komponenten)

---

## 🚀 NACH SDK-INSTALLATION: Projekt neu laden

**Wenn SDK installiert ist:**

1. **Schließe das Settings-Fenster** (OK)

2. **Projekt neu synchronisieren:**
   - **File → Sync Project with Gradle Files**
   - Oder klicke: **🐘 Gradle Sync** Icon (oben rechts)

3. **Gradle Sync läuft:**
   - Warte bis "Gradle sync finished" ✅
   - Dauer: 1-2 Minuten

4. **Jetzt kannst du die App bauen!** 🎉

---

## ⚡ SCHNELLSTART (Empfohlen):

**Die einfachste Lösung:**

1. **Im Dialog "Please provide Android SDK location":**
   - Klicke **"Next"** oder **"Install SDK"**

2. **SDK Setup Wizard:**
   - Klicke **"Next"**
   - **Accept** → **"Next"**
   - Warte (~5-15 Minuten für Download)
   - Klicke **"Finish"**

3. **Android Studio startet neu**

4. **Projekt wird geladen**
   - Gradle Sync läuft automatisch
   - Warte bis "Gradle sync finished"

5. **FERTIG!** ✅
   - Jetzt: Emulator erstellen → App starten

---

## 🛠️ TROUBLESHOOTING

### Problem: "SDK Tools directory is missing"

**Lösung:**
```
Settings → Android SDK → SDK Tools Tab
→ Android SDK Build-Tools installieren
→ Apply
```

### Problem: Download schlägt fehl / langsam

**Lösung 1:** Proxy deaktivieren
```
Settings → Appearance & Behavior → System Settings → HTTP Proxy
→ "No proxy" auswählen
→ OK
```

**Lösung 2:** Manueller Download
1. Gehe zu: https://developer.android.com/studio#command-tools
2. Downloade "Command line tools only"
3. Entpacke nach: `C:\Users\marek\AppData\Local\Android\Sdk\cmdline-tools\`

### Problem: "Unable to access Android SDK add-on list"

**Lösung:**
- Internet-Verbindung prüfen
- Firewall-Einstellungen (Android Studio erlauben)
- VPN deaktivieren (falls vorhanden)

---

## 📋 CHECKLISTE

**Nach SDK-Installation:**

- [ ] SDK-Pfad in Settings korrekt: `C:\Users\marek\AppData\Local\Android\Sdk`
- [ ] SDK Platform 33 (Android 13) installiert
- [ ] SDK Build-Tools installiert
- [ ] Android Emulator installiert
- [ ] Gradle Sync erfolgreich
- [ ] Keine Fehlermeldungen mehr

---

## 🎯 ZUSAMMENFASSUNG

**Was du jetzt machen solltest:**

1. **Im Dialog:**
   - Klicke **"Install SDK"** / **"Next"**

2. **Warte auf Download:**
   - ~2-3 GB (~5-15 Minuten)

3. **Nach Installation:**
   - Gradle Sync abwarten
   - Emulator erstellen (siehe `ANDROID_STUDIO_TESTING.md`)
   - App starten! 🚀

**Bei Problemen:**
- Siehe Troubleshooting-Sektion oben
- Oder verwende Lösung 4 (Settings → Android SDK)

---

**💡 TIPP:** Nutze die automatische Installation (Lösung 1) - am einfachsten!

**🎉 Nach SDK-Installation bist du bereit, die App zu bauen!**
