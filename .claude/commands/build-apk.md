---
description: Compila el APK release de MyWallet y lo instala en el dispositivo vía ADB
---

# /build-apk — Build e Instalación de APK

> **En este entorno de desarrollo específico** ya hay un SDK instalado en `~/Android/Sdk` (platform-tools, build-tools 36.0.0, platform android-36) — solo `export ANDROID_HOME="$HOME/Android/Sdk"`, no reinstalar. Si `adb devices`/`adb install` falla con `protocol fault (couldn't read status): Connection reset by peer`, el sandbox mató el daemon de `adb` antes del handshake. Workaround: levantar el servidor en primer plano dentro de la MISMA invocación de shell que el resto de comandos `adb`:
> ```bash
> export ANDROID_HOME="$HOME/Android/Sdk"
> ADB="$ANDROID_HOME/platform-tools/adb"
> nohup "$ADB" nodaemon server -a > /tmp/adb-server.log 2>&1 &
> sleep 2
> "$ADB" devices -l
> ```

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
