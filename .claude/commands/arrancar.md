---
description: Compila e instala el APK release de MyWallet en el dispositivo conectado
---

# /arrancar — Build e Instalación

> Requiere que exista la carpeta `android/` (generada con `npx expo prebuild` si no existe todavía) y el Android SDK instalado. Usa `$ANDROID_HOME` para ubicar `adb` — pídele al usuario que lo configure si no está seteado, no hardcodees una ruta de usuario específica.

## Instrucciones

### Paso 1 — Verificar dispositivo conectado
```bash
"$ANDROID_HOME/platform-tools/adb" devices
```
Si no aparece ningún dispositivo (solo "List of devices attached"), informar al usuario:
1. Conectar el teléfono por USB
2. Habilitar USB debugging en el teléfono
3. Aceptar el diálogo de autorización en pantalla

### Paso 2 — Build release
```bash
cd android && ./gradlew assembleRelease
```
(en Windows/PowerShell sin bash: `gradlew.bat assembleRelease`)
Esperar a que termine. Reportar errores de Gradle si los hay.

### Paso 3 — Verificar APK generado
```bash
ls android/app/build/outputs/apk/release/
```
Confirmar que `app-release.apk` existe.

### Paso 4 — Instalar en el dispositivo
```bash
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/release/app-release.apk
```
Si falla con "INSTALL_FAILED_UPDATE_INCOMPATIBLE":
```bash
"$ANDROID_HOME/platform-tools/adb" uninstall com.mywallet.app
"$ANDROID_HOME/platform-tools/adb" install android/app/build/outputs/apk/release/app-release.apk
```

### Paso 5 — Confirmar
Reportar al usuario que la app fue instalada exitosamente.
