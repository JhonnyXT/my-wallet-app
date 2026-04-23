---
description: Compila el APK release de MyWallet y lo instala en el dispositivo vía ADB
---

# /build-apk — Build e Instalación de APK

## Instrucciones

### Paso 1 — Build release
```powershell
cd android
.\gradlew.bat assembleRelease 2>&1
```
Esperar a que termine. Reportar errores de Gradle si los hay.

### Paso 2 — Verificar APK generado
```powershell
Get-ChildItem "c:\Users\FAMILY\Documents\ME\code\my-wallet-app\android\app\build\outputs\apk\release\" -Filter "*.apk"
```
Confirmar que `app-release.apk` existe. Si no existe, reportar el error.

### Paso 3 — Verificar dispositivo conectado
```powershell
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
```
Si no aparece ningún dispositivo (solo "List of devices attached"), informar al usuario que debe:
1. Habilitar USB debugging en el teléfono
2. Conectar por USB y aceptar el diálogo de autorización en el teléfono

### Paso 4 — Instalar
```powershell
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r "c:\Users\FAMILY\Documents\ME\code\my-wallet-app\android\app\build\outputs\apk\release\app-release.apk" 2>&1
```
Si falla con "INSTALL_FAILED_UPDATE_INCOMPATIBLE" o "App not installed":
```powershell
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe uninstall com.mywallet.app
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe install "c:\Users\FAMILY\Documents\ME\code\my-wallet-app\android\app\build\outputs\apk\release\app-release.apk" 2>&1
```

### Paso 5 — Confirmar
Reportar al usuario que la app fue instalada exitosamente con el número de versión del `app.json`.
