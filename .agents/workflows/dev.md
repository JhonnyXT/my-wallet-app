# Workflow: dev — Servidor de desarrollo con hot reload

Fuente única de `/dev`. Inicia el servidor Metro para desarrollo con hot reload instantáneo en el
dispositivo físico. **No** compila release: para eso está el workflow `build-apk`.

Antes de empezar, leer `.agents/snippets/entorno-android.md` (configuración de `ANDROID_HOME`,
equivalencias bash/PowerShell, workaround del daemon de `adb`).

**Requisitos previos (solo la primera vez):**
- Tener el APK **debug** instalado en el dispositivo (ver Paso 0)
- Dispositivo conectado por USB o en la misma red WiFi

## Paso 0 — Primera vez: compilar e instalar APK debug

Solo necesario si el APK debug no está instalado o se agregaron módulos nativos nuevos:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
cd android && ./gradlew assembleDebug
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Paso 1 — Verificar dispositivo conectado

```bash
"$ANDROID_HOME/platform-tools/adb" devices
```

Si el dispositivo no aparece como `device`, pedir al usuario que:
1. Conecte el cable USB
2. Acepte el permiso de depuración USB en el teléfono

## Paso 2 — Iniciar servidor Metro

```bash
npx expo start --clear
```

Cuando aparezca el QR y el menú:
- Presionar **`a`** para abrir en el dispositivo Android conectado por USB
- O escanear el QR con la app si está en WiFi

## Paso 3 — Usar hot reload

Desde este punto, **cada cambio en archivos `.tsx`, `.ts`, `.js`** se refleja en el dispositivo en
1-3 segundos automáticamente.

Para forzar un reload completo: agitar el dispositivo → "Reload".

## Cuándo hay que recompilar el APK debug (volver al Paso 0)

Solo en estos casos:
- Se instaló un paquete nuevo con módulos nativos (`npm install <paquete>`)
- Se modificó `AndroidManifest.xml`
- Se modificaron archivos en `android/app/src/main/java/`
- Cambios en `app.json` que afecten plugins nativos

Para cambios de diseño, lógica, pantallas y componentes → **solo Metro, sin recompilar**.
