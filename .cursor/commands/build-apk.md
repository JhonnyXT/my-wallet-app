---
description: Compila el APK release de MyWallet y lo instala en el dispositivo vía ADB
---

# /build-apk — Build e Instalación de APK

## Instrucciones

### Paso 1 — Build limpio
```powershell
cd android
.\gradlew clean
.\gradlew assembleRelease
```
Esperar a que termine. Reportar errores de Gradle si los hay.

### Paso 2 — Verificar APK generado
```powershell
ls android\app\build\outputs\apk\release\
```
Confirmar que `app-release.apk` existe.

### Paso 3 — Verificar dispositivo conectado
```powershell
$adb = "C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb devices
```
Si no aparece dispositivo, informar al usuario que debe:
1. Habilitar USB debugging en el teléfono
2. Conectar por USB
3. Aceptar el diálogo de autorización

### Paso 4 — Instalar
```powershell
& $adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```
Si falla con "App not installed":
```powershell
& $adb uninstall com.mywallet.app
& $adb install "android\app\build\outputs\apk\release\app-release.apk"
```

### Paso 5 — Confirmar
Reportar al usuario que la app se instaló exitosamente.
