const { withAndroidManifest } = require("@expo/config-plugins");

const RECEIVER = "com.lesimoes.androidnotificationlistener.BootUpReceiver";

/**
 * Quita del manifest final el BootUpReceiver de react-native-android-notification-listener.
 *
 * Ese receiver, al recibir BOOT_COMPLETED, llama a context.startForegroundService() sobre
 * RNAndroidNotificationListener, que nunca llama a startForeground(): Android mata la app con
 * ForegroundServiceDidNotStartInTimeException (~10-30 s después, visto en logcat) o la deja en
 * ANR. En el Samsung de pruebas se dispara también al abrir la app tras reinstalarla o tras un
 * force-stop, no solo al reiniciar el teléfono.
 *
 * El receiver sobra: un NotificationListenerService con el acceso concedido lo vuelve a enlazar
 * el propio sistema (también tras reiniciar); nadie tiene que arrancarlo a mano. Se deja el
 * permiso RECEIVE_BOOT_COMPLETED, que usa expo-notifications para reprogramar recordatorios.
 *
 * Se quita con tools:node="remove" (manifest merger de Gradle), sin parchear node_modules.
 */
function withoutNotificationListenerBootReceiver(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] ?? "http://schemas.android.com/tools";

    const application = manifest.application?.[0];
    if (!application) return config;
    application.receiver = (application.receiver ?? []).filter(
      (r) => r.$["android:name"] !== RECEIVER,
    );
    application.receiver.push({ $: { "android:name": RECEIVER, "tools:node": "remove" } });
    return config;
  });
}

module.exports = withoutNotificationListenerBootReceiver;
