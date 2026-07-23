# Workflow: build-apk / arrancar — Build e instalación del APK release

Fuente única de `/build-apk` y `/arrancar` (son el mismo procedimiento: compilar el APK release e
instalarlo por ADB en el dispositivo conectado).

Antes de empezar, leer `.agents/snippets/entorno-android.md` para la configuración de `ANDROID_HOME`,
las equivalencias bash/PowerShell y el workaround del daemon de `adb` en el sandbox.

## Paso 1 — Verificar dispositivo conectado

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
"$ANDROID_HOME/platform-tools/adb" devices
```

Se verifica **antes** de compilar para no perder varios minutos de build si no hay dispositivo.
Si falla con `protocol fault` / `connection reset by peer`, aplicar el workaround del snippet.

Si no aparece ningún dispositivo (solo "List of devices attached"), informar al usuario:
1. Conectar el teléfono por USB
2. Habilitar USB debugging en el teléfono
3. Aceptar el diálogo de autorización en pantalla

## Paso 2 — Build release

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
cd android && ./gradlew assembleRelease
```

Esperar a que termine. Reportar errores de Gradle si los hay.

## Paso 3 — Verificar APK generado

```bash
ls android/app/build/outputs/apk/release/
```

Confirmar que `app-release.apk` existe. Si no existe, reportar el error y detenerse.

## Paso 4 — Instalar en el dispositivo

```bash
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/release/app-release.apk
```

Si falla con `INSTALL_FAILED_UPDATE_INCOMPATIBLE` o `App not installed`:

```bash
"$ANDROID_HOME/platform-tools/adb" uninstall com.mywallet.app
"$ANDROID_HOME/platform-tools/adb" install android/app/build/outputs/apk/release/app-release.apk
```

> Instalar con `adb install -r` también evita el bloqueo de Google Play Protect ("App blocked to
> protect your device") que dispara el APK release firmado con la clave de debug — ver la deuda
> técnica "Sin keystore de producción" en `AGENTS.md`.

## Paso 5 — Confirmar

Reportar al usuario que la app fue instalada exitosamente, con el número de versión del `app.json`.
