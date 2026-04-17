---
description: Instala dependencias y lanza el entorno de desarrollo completo de MyWallet
---

# /arrancar — Setup y Dev Server

## Instrucciones

### Paso 1 — Verificar y instalar dependencias
Comprobar si `node_modules` existe. Si no:
```bash
npm install
```
Si hay errores de peer deps (React 19 incompatible):
```bash
npm install --legacy-peer-deps
```

### Paso 2 — Lanzar Metro bundler
```bash
npx expo start
```
Confirmar que Metro arranca y muestra QR code o URL.

### Paso 3 — Conectar dispositivo/emulador
Si hay dispositivo USB:
```powershell
$adb = "C:\Users\FAMILY\AppData\Local\Android\Sdk\platform-tools\adb.exe"
& $adb devices
```
Si el dispositivo aparece, lanzar en Android:
```bash
npx expo run:android
```

### Paso 4 — Confirmar éxito
- Metro bundler corriendo en el puerto 8081.
- App abierta en el dispositivo mostrando el splash animado.
- Reportar las URLs activas al usuario.
