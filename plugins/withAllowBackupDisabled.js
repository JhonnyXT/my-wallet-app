const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Fuerza android:allowBackup="false" en el <application> del manifest.
 *
 * react-native-android-notification-listener declara allowBackup="false" en
 * su propio AndroidManifest.xml (evita que Android incluya el contenido de
 * notificaciones bancarias en el auto-backup a Google Drive). El manifest
 * base generado por el template de Expo/RN trae allowBackup="true" por
 * defecto, lo que rompe el manifest merger de Gradle con:
 *
 *   Attribute application@allowBackup value=(true) ... is also present at
 *   [:react-native-android-notification-listener] AndroidManifest.xml
 *   value=(false).
 *
 * En vez de resolverlo con tools:replace (que preservaría "true"), se fuerza
 * "false" explícitamente: es la opción más segura para una app que procesa
 * texto de notificaciones bancarias, y además es consistente con la Regla
 * inmutable #7 de AGENTS.md (no almacenar datos bancarios sensibles) — no
 * tiene sentido bloquear números de cuenta en la DB y a la vez dejar que el
 * sistema respalde esas mismas notificaciones a la nube.
 */
function withAllowBackupDisabled(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) {
      application.$["android:allowBackup"] = "false";
    }
    return config;
  });
}

module.exports = withAllowBackupDisabled;
