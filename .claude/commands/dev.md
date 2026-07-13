---
description: Servidor de desarrollo con hot reload para MyWallet
---

# /dev — Servidor de desarrollo con hot reload

Inicia el servidor Metro para desarrollo con hot reload instantáneo en el dispositivo físico.

**Requisitos previos (solo la primera vez):**
- Tener el APK debug instalado en el dispositivo (ver Paso 0)
- Dispositivo conectado por USB o en la misma red WiFi

> **En este entorno de desarrollo específico** ya hay un SDK instalado en `~/Android/Sdk` (platform-tools, build-tools 36.0.0, platform android-36) — solo `export ANDROID_HOME="$HOME/Android/Sdk"`, no reinstalar. Si `adb devices`/`adb install` falla con `protocol fault (couldn't read status): Connection reset by peer`, el sandbox mató el daemon de `adb` antes del handshake. Workaround: levantar el servidor en primer plano dentro de la MISMA invocación de shell que el resto de comandos `adb`:
> ```bash
> export ANDROID_HOME="$HOME/Android/Sdk"
> ADB="$ANDROID_HOME/platform-tools/adb"
> nohup "$ADB" nodaemon server -a > /tmp/adb-server.log 2>&1 &
> sleep 2
> "$ADB" devices -l
> ```

---

## Paso 0 — Primera vez: compilar e instalar APK debug

Solo necesario si el APK debug no está instalado o se agregaron módulos nativos nuevos:

```bash
cd android && ./gradlew assembleDebug
"$ANDROID_HOME/platform-tools/adb" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Paso 1 — Verificar dispositivo conectado

```bash
"$ANDROID_HOME/platform-tools/adb" devices
```

Si el dispositivo no aparece como `device`, pedir al usuario que:
1. Conecte el cable USB
2. Acepte el permiso de depuración USB en el teléfono

---

## Paso 2 — Iniciar servidor Metro

```bash
npx expo start --clear
```

Cuando aparezca el QR y el menú:
- Presionar **`a`** para abrir en el dispositivo Android conectado por USB
- O escanear el QR con la app si está en WiFi

---

## Paso 3 — Usar hot reload

Desde este punto, **cada cambio en archivos `.tsx`, `.ts`, `.js`** se refleja en el dispositivo en 1-3 segundos automáticamente.

Para forzar un reload completo: agitar el dispositivo → "Reload"

---

## Cuándo necesito recompilar el APK debug (Paso 0)

Solo en estos casos:
- Se instaló un nuevo paquete con módulos nativos (`npm install algopaquete`)
- Se modificó `AndroidManifest.xml`
- Se modificaron archivos en `android/app/src/main/java/`
- Cambios en `app.json` que afecten plugins nativos

Para cambios de diseño, lógica, pantallas y componentes → **solo Metro, sin recompilar**.
