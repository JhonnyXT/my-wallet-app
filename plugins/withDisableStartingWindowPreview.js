const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * Fuerza android:windowDisablePreview="true" en <activity android:name=".MainActivity">.
 *
 * MainActivity usa launchMode="singleTask". Cuando Android relanza la app (ícono del
 * launcher o notificación) y el proceso había muerto pero la "task" seguía viva, el
 * sistema muestra una "starting window" basada en el último screenshot capturado de la
 * Activity mientras el proceso frío termina de arrancar — se ve como un flash de la
 * pantalla en la que el usuario estaba antes de cerrar la app, ANTES de que aparezca
 * el splash real. No es un bug de la app: es el comportamiento por defecto de Android
 * para relanzamientos "en caliente" percibidos.
 *
 * windowDisablePreview le dice al sistema que no use ese screenshot cacheado como
 * starting window: en su lugar pinta de inmediato el windowBackground del tema
 * asignado a la activity (Theme.App.SplashScreen → color #135BEC + ícono del splash),
 * eliminando el flash de la pantalla anterior.
 */
function withDisableStartingWindowPreview(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    const activity = application?.activity?.find(
      (a) => a.$["android:name"] === ".MainActivity"
    );
    if (activity) {
      activity.$["android:windowDisablePreview"] = "true";
    }
    return config;
  });
}

module.exports = withDisableStartingWindowPreview;
