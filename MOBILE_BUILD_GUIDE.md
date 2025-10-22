# 📱 Mobile App Build Guide - Isometrics App

Komplette Anleitung zum Erstellen einer Android-App für den Google Play Store.

---

## 📋 Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Debug-APK erstellen (zum Testen)](#debug-apk-erstellen)
3. [Release-APK erstellen (für Play Store)](#release-apk-erstellen)
4. [App Bundle (AAB) für Play Store](#app-bundle-für-play-store)
5. [Play Store Upload](#play-store-upload)
6. [Versionierung](#versionierung)

---

## 🛠️ Voraussetzungen

### Installierte Software:
- ✅ Node.js (bereits installiert)
- ✅ Android Studio (für Emulator/Gerät-Testing)
- ✅ Java JDK 17+ (kommt mit Android Studio)

### Prüfen der Installation:
```bash
# Java Version prüfen
java -version
# Sollte zeigen: openjdk version "17.x.x" oder höher

# Gradle prüfen
cd android
./gradlew --version
```

---

## 🔨 Debug-APK erstellen (zum Testen)

### Schritt 1: App bauen
```bash
# Im Hauptverzeichnis (Isoprog/)
npm run mobile:build
```

### Schritt 2: Debug-APK erstellen
```bash
cd android
./gradlew assembleDebug
```

### Schritt 3: APK finden
Die fertige APK ist hier:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Schritt 4: APK installieren
- **Per USB**: ADB installieren und `adb install app-debug.apk`
- **Per E-Mail/Cloud**: APK an dein Handy senden und öffnen
- **Per Emulator**: Drag & Drop auf den Emulator

**⚠️ Hinweis**: Debug-APKs sind NICHT für den Play Store geeignet!

---

## 🔐 Release-APK erstellen (für Play Store)

### Schritt 1: Keystore erstellen (einmalig)

Der Keystore signiert deine App. **WICHTIG**: Bewahre ihn sicher auf!

```bash
# Im android/app Verzeichnis
cd android/app

# Keystore erstellen
keytool -genkey -v -keystore isometrics-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias isometrics-key
```

**Eingaben:**
- **Passwort**: Wähle ein starkes Passwort (z.B. `IsoMetr1cs!2024`)
- **Alias**: `isometrics-key` (bereits im Befehl)
- **Vorname/Nachname**: Dein Name
- **Organisationseinheit**: z.B. "Zauner Engineering"
- **Organisation**: z.B. "Zauner"
- **Stadt/Land**: Dein Standort

**🔒 WICHTIG**:
- Speichere das Passwort sicher (z.B. in einem Passwort-Manager)
- Sichere die `.jks`-Datei (Backup!)
- Ohne Keystore kannst du die App NICHT mehr updaten!

---

### Schritt 2: Gradle konfigurieren

Erstelle die Datei `android/key.properties`:

```properties
storePassword=DEIN_KEYSTORE_PASSWORT
keyPassword=DEIN_KEY_PASSWORT
keyAlias=isometrics-key
storeFile=isometrics-release-key.jks
```

**⚠️ WICHTIG**: Füge `key.properties` zu `.gitignore` hinzu!

---

### Schritt 3: build.gradle anpassen

Öffne `android/app/build.gradle` und füge NACH `android {` hinzu:

```gradle
// Keystore-Konfiguration laden
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... bestehender Code ...

    // Signing Configuration hinzufügen
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### Schritt 4: Release-APK bauen

```bash
cd android
./gradlew assembleRelease
```

Die signierte APK findest du hier:
```
android/app/build/outputs/apk/release/app-release.apk
```

**Größe**: ca. 15-25 MB (abhängig von Optimierungen)

---

## 📦 App Bundle (AAB) für Play Store

Google Play bevorzugt **App Bundles** statt APKs (kleinere Downloads für Nutzer).

### Bundle erstellen:

```bash
cd android
./gradlew bundleRelease
```

Die fertige AAB-Datei:
```
android/app/build/outputs/bundle/release/app-release.aab
```

**Das ist die Datei, die du zum Play Store hochlädst!**

---

## 🚀 Play Store Upload

### Schritt 1: Google Play Console einrichten

1. Gehe zu: https://play.google.com/console
2. Klicke **"App erstellen"**
3. **App-Details:**
   - Name: `Isometrics App`
   - Standard-Sprache: `Deutsch`
   - App-Typ: `App`
   - Kostenlos/Bezahlt: `Kostenlos` (oder deine Wahl)
4. Akzeptiere die Richtlinien

---

### Schritt 2: App-Inhalte ausfüllen

**Pflichtfelder:**
- **Datenschutzerklärung**: URL zur Datenschutzerklärung
- **Kategorie**: `Produktivität` oder `Tools`
- **Altersfreigabe**: Fragebogen ausfüllen
- **Zielgruppe**: Alle Altersgruppen oder spezifisch

---

### Schritt 3: Store-Eintrag erstellen

**Kurzbeschreibung** (max. 80 Zeichen):
```
Professionelle isometrische Zeichnungen für technische Rohrleitungen
```

**Vollständige Beschreibung** (max. 4000 Zeichen):
```
Isometrics App - Professionelle Isometrie-Zeichenanwendung

Erstellen Sie präzise isometrische technische Zeichnungen direkt auf Ihrem Android-Gerät!

✨ HAUPTFUNKTIONEN:
• Isometrische Rohrleitungen mit 30° Winkeln
• Präzise Bemaßungswerkzeuge (ISO-Norm konform)
• Schweißsymbole und technische Annotationen
• Ventile, T-Stücke und weitere Komponenten
• Automatische Stückliste (BOM)
• Export als PNG, SVG oder JSON

📐 ZEICHENWERKZEUGE:
• Linien und Rohrleitungen mit Snap-Funktion
• Freihand-Zeichnen mit anpassbarer Strichstärke
• Text-Annotationen
• Dimensions-Werkzeuge
• Grid-System mit einstellbarer Größe

⚡ MOBILE OPTIMIERT:
• Touch-optimierte Benutzeroberfläche
• Pinch-to-Zoom und Pan-Gesten
• Modifier-Tasten für präzises Arbeiten
• Undo/Redo-Funktion

🔧 PERFEKT FÜR:
• Technische Zeichner
• Rohrleitungsbauer
• Ingenieure
• Architekten
• Studenten

💾 EXPORT & TEILEN:
• PNG-Export in hoher Auflösung
• Vektorbasierter SVG-Export
• JSON für Projektdateien
• Direktes Teilen über Android

Entwickelt von Zauner Engineering.
```

---

### Schritt 4: Screenshots vorbereiten

**Erforderliche Screenshots:**
- **Smartphone**: Mindestens 2 Screenshots (max. 8)
  - Auflösung: 1080 x 1920 px (oder ähnlich)
  - Format: PNG oder JPG

- **Tablet** (optional, aber empfohlen): 2-8 Screenshots
  - Auflösung: 1920 x 1080 px

**Screenshot-Ideen:**
1. Hauptzeichenfläche mit Toolbar
2. Mobile Bottom Navigation im Einsatz
3. Beispielzeichnung (Rohrleitung)
4. Schweißsymbol-Werkzeuge
5. Export/Teilen-Dialog

---

### Schritt 5: App-Icon & Banner

**App-Icon:**
- Größe: 512 x 512 px
- Format: PNG (32-bit mit Alpha-Kanal)
- Aktuell: `src/favicon.ico` → Als PNG exportieren!

**Feature Graphic** (Banner):
- Größe: 1024 x 500 px
- Format: PNG oder JPG
- Zeigt App-Name + visuelle Darstellung

---

### Schritt 6: Release hochladen

1. **Production → Releases → "Neues Release erstellen"**
2. **App Bundle hochladen**: `app-release.aab` auswählen
3. **Release-Name**: z.B. `1.0.0 - Initial Release`
4. **Release-Notizen** (Deutsch):
   ```
   🎉 Erste Version der Isometrics App!

   • Isometrische Zeichenwerkzeuge
   • Touch-optimierte Bedienung
   • Export als PNG/SVG/JSON
   • Automatische Stückliste
   ```

5. **Überprüfung starten** → Google prüft die App (~1-3 Tage)

---

## 🔢 Versionierung

### Version erhöhen

Bearbeite `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        applicationId "com.isometrics.app"
        minSdk 24
        targetSdk 34
        versionCode 2        // ← Bei jedem Release +1
        versionName "1.0.1"  // ← Semantic Versioning
    }
}
```

**Versionsschema:**
- **versionCode**: Ganzzahl, muss bei jedem Update steigen (1, 2, 3, ...)
- **versionName**: Für Nutzer sichtbar (`1.0.0`, `1.1.0`, `2.0.0`)

Außerdem in `package.json`:
```json
{
  "version": "1.0.1"
}
```

---

## 🧪 Vor dem Release testen

### Checkliste:
- [ ] App auf echtem Gerät testen (nicht nur Emulator)
- [ ] Alle Features auf Touch-Bedienung prüfen
- [ ] Performance-Test bei komplexen Zeichnungen
- [ ] Export-Funktionen testen (PNG/SVG/JSON)
- [ ] Verschiedene Bildschirmgrößen testen
- [ ] Rotation testen (Portrait/Landscape)
- [ ] Offline-Funktionalität prüfen

---

## 🎯 Schnell-Checkliste für Play Store

### Vor dem ersten Upload:
- [ ] Keystore erstellt und gesichert
- [ ] App-Icon 512x512 px vorbereitet
- [ ] Mindestens 2 Screenshots erstellt
- [ ] Datenschutzerklärung online verfügbar
- [ ] App-Beschreibung geschrieben
- [ ] AAB-Datei signiert und gebaut

### Bei jedem Update:
- [ ] `versionCode` erhöht
- [ ] `versionName` aktualisiert
- [ ] Release-Notizen geschrieben
- [ ] Neue Features getestet
- [ ] AAB neu gebaut

---

## 🆘 Troubleshooting

### Problem: "Keystore not found"
**Lösung**: Pfad in `key.properties` prüfen. Muss relativ zu `android/app/` sein.

### Problem: "Signature mismatch"
**Lösung**: Du verwendest einen anderen Keystore als zuvor. Apps können NUR mit dem Original-Keystore aktualisiert werden!

### Problem: Build scheitert mit "Out of memory"
**Lösung**: In `android/gradle.properties` hinzufügen:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxPermSize=1024m
```

### Problem: APK zu groß (>150 MB)
**Lösung**:
- App Bundle (AAB) statt APK verwenden
- Bilder komprimieren
- Unused Assets entfernen

---

## 📞 Support & Ressourcen

- **Play Console**: https://play.google.com/console
- **Android Studio**: https://developer.android.com/studio
- **Capacitor Docs**: https://capacitorjs.com/docs/android

---

## ✅ Fertig!

Nach Upload zum Play Store:
1. Google prüft die App (1-3 Tage)
2. Bei Freigabe: App ist im Store verfügbar!
3. Updates kannst du jederzeit hochladen

**Viel Erfolg! 🚀**
