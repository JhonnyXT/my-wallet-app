/**
 * notificationHeadlessTask.ts
 * Tarea HeadlessJS que procesa notificaciones bancarias en background.
 * Se ejecuta incluso con la app cerrada cuando llega una notificación
 * de alguna app en la whitelist de bancos.
 *
 * IMPORTANTE: Esta función NO puede usar hooks de React ni acceder a
 * componentes. Solo puede usar el store directamente y lógica pura.
 *
 * La librería react-native-android-notification-listener pasa al headless task
 * un objeto { notification: string } donde notification es un JSON serializado.
 * Hay que hacer JSON.parse antes de leer los campos.
 */
import { parseNotification, BANK_PACKAGE_NAMES } from "@/src/utils/notificationParser";
import { useNotificationStore } from "@/src/store/useNotificationStore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTO_DETECT_ENABLED_KEY = "mywallet-auto-detect-enabled";
const ALLOWED_BANKS_KEY       = "mywallet-auto-detect-banks";

interface RawNotification {
  app: string;
  title: string;
  titleBig: string;
  text: string;
  subText: string;
  summaryText: string;
  bigText: string;
  audioContentsURI: string;
  imageBackgroundURI: string;
  extraInfoText: string;
  groupedMessages: Array<{ title: string; text: string }>;
  icon: string;
  image: string;
  time: string;
}

/**
 * Headless task: recibe { notification: string } de la librería nativa.
 * El campo notification es un JSON STRING que hay que parsear.
 */
export async function notificationHeadlessTask(taskData: { notification: string }): Promise<void> {
  try {
    if (!taskData || !taskData.notification) return;

    const notification: RawNotification = JSON.parse(taskData.notification);
    if (!notification || !notification.app) return;

    // Descarte rápido: si no es una app bancaria conocida, no gastar en IO
    if (!BANK_PACKAGE_NAMES.has(notification.app)) return;

    // 1. Verificar que la detección automática está activa
    const enabledRaw = await AsyncStorage.getItem(AUTO_DETECT_ENABLED_KEY);
    if (enabledRaw !== "true") return;

    // 2. Verificar que este banco está en la lista permitida
    const allowedRaw = await AsyncStorage.getItem(ALLOWED_BANKS_KEY);
    if (allowedRaw) {
      const allowedBanks: string[] = JSON.parse(allowedRaw);
      if (allowedBanks.length > 0 && !allowedBanks.includes(notification.app)) return;
    }

    // 3. Usar el texto más completo disponible
    const text = notification.bigText || notification.text || notification.subText || "";
    const title = notification.titleBig || notification.title || "";

    if (!text && !title) return;

    // 4. Parsear la notificación
    const parsed = parseNotification(notification.app, title, text);
    if (!parsed) return;

    // 5. Agregar a la cola de pendientes (acceso directo al store, sin hooks)
    useNotificationStore.getState().addPendingItem(parsed);

  } catch {
    // Silenciar errores en el headless task para no crashear el servicio
  }
}
