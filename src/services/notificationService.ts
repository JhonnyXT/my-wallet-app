/**
 * notificationService — gestiona notificaciones locales del sistema (expo-notifications).
 * Sin servidor, sin push remoto. 100% offline.
 */
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { formatCOP } from "@/src/utils/formatMoney";

// Configura cómo se muestran las notificaciones cuando la app está en primer plano
// shouldShowAlert: false → no muestra el banner in-app; solo la bandeja del sistema
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  false,
    shouldPlaySound:  false,
    shouldSetBadge:   false,
    shouldShowBanner: false,
    shouldShowList:   true,
  }),
});

// ─── Canal Android (obligatorio en API 26+) ──────────────────────────────────

const CHANNEL_BUDGET = "budget-alerts";
const CHANNEL_GOALS  = "goal-alerts";
const CHANNEL_BANK   = "bank-transactions";

async function ensureChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_BUDGET, {
    name:       "Alertas de presupuesto",
    importance: Notifications.AndroidImportance.HIGH,
    sound:      null,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_GOALS, {
    name:       "Metas de ahorro",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound:      null,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_BANK, {
    name:       "Transacciones detectadas",
    importance: Notifications.AndroidImportance.HIGH,
    sound:      null,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

/**
 * Llamar al arrancar la app: registra canales Android y sincroniza el estado
 * de permisos sin mostrar el diálogo al usuario.
 */
export async function initNotifications(): Promise<void> {
  await ensureChannels();
  // Sincronizar silenciosamente si el permiso ya fue otorgado antes
  if (Platform.OS !== "web") {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") {
      useSettingsStore.getState().setNotificationsEnabled(true);
    }
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing, canAskAgain } = await Notifications.getPermissionsAsync();

  if (existing === "granted") {
    useSettingsStore.getState().setNotificationsEnabled(true);
    await ensureChannels();
    return true;
  }

  // Android: usuario denegó con "No volver a preguntar" → abrir ajustes del sistema
  if (!canAskAgain) {
    await Linking.openSettings();
    return false;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === "granted";
  useSettingsStore.getState().setNotificationsEnabled(granted);
  if (granted) await ensureChannels();
  return granted;
}

// ─── Presupuesto excedido ─────────────────────────────────────────────────────

export async function checkAndNotifyBudget(
  categoryEmoji: string,
  categoryName: string,
  spent: number,
  budget: number,
): Promise<void> {
  // Sincronizar el estado de permisos con el sistema antes de evaluar
  const { status: systemStatus } = await Notifications.getPermissionsAsync();
  if (systemStatus === "granted") {
    useSettingsStore.getState().setNotificationsEnabled(true);
  }

  const store = useSettingsStore.getState();

  if (!store.notificationsEnabled || !store.budgetAlertsEnabled || budget <= 0) return;

  const month     = currentMonth();
  const ratio     = spent / budget;
  const threshold = store.budgetAlertThreshold / 100;
  const isOver    = ratio >= 1.0;

  // Claves compuestas para permitir dos notificaciones por categoría por mes:
  // una al cruzar el umbral, otra al superar el 100%
  const keyThreshold = `${categoryEmoji}:threshold`;
  const keyOverspent = `${categoryEmoji}:overspent`;

  if (isOver) {
    // Notificar cuando se supera el 100% del presupuesto (máximo una vez por mes)
    if (store.budgetNotifiedMonth[keyOverspent] === month) return;

    await ensureChannels();
    const over = spent - budget;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Presupuesto superado",
        body:  `Superaste el límite de "${categoryName}" por ${formatCOP(over)}.`,
        sound: true,
        ...(Platform.OS === "android" && { channelId: CHANNEL_BUDGET }),
      },
      trigger: null,
    });
    store.markBudgetNotified(keyOverspent, month);

  } else {
    // Notificar cuando se cruza el umbral configurado (máximo una vez por mes)
    if (threshold > 0 && ratio < threshold) return;
    if (store.budgetNotifiedMonth[keyThreshold] === month) return;

    await ensureChannels();
    const pct = Math.round(ratio * 100);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Alerta de presupuesto",
        body:  `Llevas el ${pct}% de tu presupuesto en "${categoryName}".`,
        sound: true,
        ...(Platform.OS === "android" && { channelId: CHANNEL_BUDGET }),
      },
      trigger: null,
    });
    store.markBudgetNotified(keyThreshold, month);
  }
}

// ─── Meta de ahorro cumplida ──────────────────────────────────────────────────

export async function checkAndNotifyGoalCompleted(
  goalId: string,
  goalEmoji: string,
  goalName: string,
  targetAmount: number,
): Promise<void> {
  const store = useSettingsStore.getState();
  if (!store.notificationsEnabled) return;
  if (store.goalNotifiedIds.includes(goalId)) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "¡Meta de ahorro cumplida!",
      body:  `${goalEmoji} Has completado tu meta "${goalName}". ¡Felicidades!`,
      sound: false,
      ...(Platform.OS === "android" && { channelId: CHANNEL_GOALS }),
    },
    trigger: null,
  });

  store.markGoalNotified(goalId);
}

// ─── Transacción bancaria detectada ──────────────────────────────────────────

/**
 * Dispara una notificación push cuando el HeadlessTask detecta una transacción.
 * Al tocar la notificación el sistema abre la app con la URL mywalletapp://notification-review.
 * Se puede llamar desde HeadlessJS (sin React) porque solo usa la API nativa.
 */
export async function notifyBankTransaction(
  amount: number,
  description: string,
  bankName: string,
  isExpense: boolean,
): Promise<void> {
  try {
    await ensureChannels();

    const sign   = isExpense ? "-" : "+";
    const amtStr = `$${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    const title  = `${sign}${amtStr} detectado — ${bankName}`;
    const body   = description
      ? `${description} · Toca para revisar`
      : "Toca para revisar la transacción pendiente";

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { screen: "notification-review" },
        ...(Platform.OS === "android" && { channelId: CHANNEL_BANK }),
      },
      trigger: null,
    });
  } catch (e) {
    if (__DEV__) console.error("[notifyBankTransaction] error:", e);
  }
}
