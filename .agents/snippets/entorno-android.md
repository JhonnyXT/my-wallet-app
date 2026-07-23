# Snippet: entorno Android (ADB + Gradle)

Fragmento compartido por los workflows `build-apk` y `dev`. No es un comando en sí — se lee desde
ellos para no repetir esta configuración en cada uno.

Requiere que exista la carpeta `android/` (se genera con `npx expo prebuild -p android` si no está)
y el Android SDK instalado. Ubicar `adb` vía `$ANDROID_HOME` / `%ANDROID_HOME%` — **nunca**
hardcodear una ruta de usuario en código nuevo.

## Linux / macOS (bash)

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
ADB="$ANDROID_HOME/platform-tools/adb"
```

> **Sandbox de desarrollo (Linux)**: el SDK ya está en `~/Android/Sdk` (platform-tools,
> build-tools 36.0.0, platform android-36) — no reinstalarlo.
>
> Si `adb devices` o `adb install` falla con
> `protocol fault (couldn't read status): Connection reset by peer`, es que el sandbox mata el
> daemon de `adb` antes de que complete el handshake. Workaround verificado: levantar el servidor
> en primer plano **dentro de la misma invocación de shell** que los comandos cliente, y reutilizar
> esa invocación para todos los `adb` que sigan:
>
> ```bash
> export ANDROID_HOME="$HOME/Android/Sdk"
> ADB="$ANDROID_HOME/platform-tools/adb"
> nohup "$ADB" nodaemon server -a > /tmp/adb-server.log 2>&1 &
> sleep 2
> "$ADB" devices -l
> ```
>
> `ANDROID_HOME` **no persiste entre invocaciones de shell**: hay que exportarlo en cada llamada
> que use Gradle o ADB, o Gradle falla con `SDK location not found`.

## Windows (PowerShell)

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
```

Equivalencias de comandos entre entornos:

| Acción | bash | PowerShell |
|---|---|---|
| Build release | `cd android && ./gradlew assembleRelease` | `cd android; .\gradlew.bat assembleRelease 2>&1` |
| Build debug | `cd android && ./gradlew assembleDebug` | `cd android; .\gradlew.bat assembleDebug 2>&1` |
| Listar APKs | `ls android/app/build/outputs/apk/release/` | `Get-ChildItem android\app\build\outputs\apk\release\ -Filter *.apk` |
| Instalar | `"$ADB" install -r <ruta-apk>` | `& $adb install -r <ruta-apk> 2>&1` |
