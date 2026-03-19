/**
 * notificationService — gestiona notificaciones locales del sistema (expo-notifications).
 * Sin servidor, sin push remoto. 100% offline.
 */
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useSettingsStore } from "@/src/store/useSettingsStore";

// Configura cómo se muestran las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCOP(amount: number): string {
  return `$ ${Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ─── Permisos ─────────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") {
    useSettingsStore.getState().setNotificationsEnabled(true);
    return true;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  const granted = status === "granted";
  useSettingsStore.getState().setNotificationsEnabled(granted);
  return granted;
}

// ─── Presupuesto excedido ─────────────────────────────────────────────────────

export async function checkAndNotifyBudget(
  categoryEmoji: string,
  categoryName: string,
  spent: number,
  budget: number,
): Promise<void> {
  const store = useSettingsStore.getState();
  if (!store.notificationsEnabled || budget <= 0) return;

  const month = currentMonth();
  const alreadyNotified = store.budgetNotifiedMonth[categoryEmoji] === month;

  const ratio = spent / budget;
  if (ratio < 0.8) return; // Sin alerta si está por debajo del 80%

  const level = ratio >= 1.0 ? "danger" : "warning";

  // Solo enviar notificación de peligro si no fue notificada este mes
  // Para advertencia (80%), notificar siempre que se supere (puede pasar solo una vez cerca)
  if (level === "danger" && alreadyNotified) return;

  const title =
    level === "danger"
      ? "🚨 Presupuesto superado"
      : "⚠️ Límite de presupuesto cercano";

  const pct = Math.round(ratio * 100);
  const over = spent - budget;
  const body =
    level === "danger"
      ? `${categoryEmoji} ${categoryName}: superaste tu límite por ${formatCOP(over)}`
      : `${categoryEmoji} ${categoryName}: ${formatCOP(spent)} de ${formatCOP(budget)} (${pct}%)`;

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: false },
    trigger: null,
  });

  if (level === "danger") {
    store.markBudgetNotified(categoryEmoji, month);
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
      title: "🎉 ¡Meta de ahorro cumplida!",
      body: `${goalEmoji} ${goalName}: alcanzaste ${formatCOP(targetAmount)}`,
      sound: false,
    },
    trigger: null,
  });

  store.markGoalNotified(goalId);
}
