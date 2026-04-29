---
description: Compila e instala el APK release de MyWallet en el dispositivo conectado
---

# /arrancar — Build e Instalación

## Instrucciones

### Paso 1 — Verificar dispositivo conectado
```powershell
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe devices
```
Si no aparece ningún dispositivo (solo "List of devices attached"), informar al usuario:
1. Conectar el teléfono por USB
2. Habilitar USB debugging en el teléfono
3. Aceptar el diálogo de autorización en pantalla

### Paso 2 — Build release
```powershell
cd android
.\gradlew.bat assembleRelease 2>&1
```
Esperar a que termine. Reportar errores de Gradle si los hay.

### Paso 3 — Verificar APK generado
```powershell
dir "c:\Users\FAMILY\Documents\ME\code\my-wallet-app\android\app\build\outputs\apk\release"
```
Confirmar que `app-release.apk` existe.

### Paso 4 — Instalar en el dispositivo
```powershell
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe install -r "c:\Users\FAMILY\Documents\ME\code\my-wallet-app\android\app\build\outputs\apk\release\app-release.apk" 2>&1
```
Si falla con "INSTALL_FAILED_UPDATE_INCOMPATIBLE":
```powershell
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe uninstall com.mywallet.app
C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe install "c:\Users\FAMILY\Documents\ME\code\my-wallet-app\android\app\build\outputs\apk\release\app-release.apk" 2>&1
```

### Paso 5 — Confirmar
Reportar al usuario que la app fue instalada exitosamente.
