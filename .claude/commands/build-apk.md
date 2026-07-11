---
description: Compila el APK release de MyWallet y lo instala en el dispositivo vía ADB
---

# /build-apk — Build e Instalación de APK

## Instrucciones

### Paso 1 — Build release
```bash
cd android && ./gradlew assembleRelease
```
(en Windows/PowerShell sin bash: `gradlew.bat assembleRelease`)
Esperar a que termine. Reportar errores de Gradle si los hay.

### Paso 2 — Verificar APK generado
```bash
ls android/app/build/outputs/apk/release/*.apk
```
Confirmar que `app-release.apk` existe. Si no existe, reportar el error.

### Paso 3 — Verificar dispositivo conectado
```bash
"$ANDROID_HOME/platform-tools/adb" devices
```
Si no aparece ningún dispositivo (solo "List of devices attached"), informar al usuario que debe:
1. Habilitar USB debugging en el teléfono
2. Conectar por USB y aceptar el diálogo de autorización en el teléfono

### Paso 4 — Instalar
```bash
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/release/app-release.apk
```
Si falla con "INSTALL_FAILED_UPDATE_INCOMPATIBLE" o "App not installed":
```bash
"$ANDROID_HOME/platform-tools/adb" uninstall com.mywallet.app
"$ANDROID_HOME/platform-tools/adb" install android/app/build/outputs/apk/release/app-release.apk
```

### Paso 5 — Confirmar
Reportar al usuario que la app fue instalada exitosamente con el número de versión del `app.json`.
