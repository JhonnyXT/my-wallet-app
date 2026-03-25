/**
 * Punto de entrada principal de la aplicación.
 * Registra el HeadlessJS task para detección de notificaciones bancarias
 * en background, y delega el resto a Expo Router.
 */
import { AppRegistry } from "react-native";
import { RNAndroidNotificationListenerHeadlessJsName } from "react-native-android-notification-listener";
import { notificationHeadlessTask } from "@/src/services/notificationHeadlessTask";

// Registrar el HeadlessJS task con el nombre exacto que usa la librería nativa
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => notificationHeadlessTask
);

// Expo Router como entrypoint normal de la app
import "expo-router/entry";
