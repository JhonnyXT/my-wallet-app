/**
 * notificationService — gestiona notificaciones locales del sistema (expo-notifications).
 * Sin servidor, sin push remoto. 100% offline.
 */
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { useSettingsStore, type Debt } from "@/src/store/useSettingsStore";
import { formatCOP } from "@/src/utils/formatMoney";
import { shortenDescription } from "@/src/utils/notificationParser/descriptionExtractor";

// Configura cómo se muestran las notificaciones cuando la app está en primer plano
// shouldShowAlert: false → no muestra el banner in-app; solo la bandeja del sistema
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: true,
  }),
});

// ─── Canal Android (obligatorio en API 26+) ──────────────────────────────────

const CHANNEL_BUDGET = "budget-alerts";
const CHANNEL_GOALS = "goal-alerts";
const CHANNEL_BANK = "bank-transactions";
const CHANNEL_DEBTS = "debt-reminders";

async function ensureChannels() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_BUDGET, {
    name: "Alertas de presupuesto",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_GOALS, {
    name: "Metas de ahorro",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_BANK, {
    name: "Transacciones detectadas",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
  });
  await Notifications.setNotificationChannelAsync(CHANNEL_DEBTS, {
    name: "Recordatorios de deudas",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
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

  const month = currentMonth();
  const ratio = spent / budget;
  const threshold = store.budgetAlertThreshold / 100;
  const isOver = ratio >= 1.0;

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
        body: `Superaste el límite de "${categoryName}" por ${formatCOP(over)}.`,
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
        body: `Llevas el ${pct}% de tu presupuesto en "${categoryName}".`,
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
      body: `${goalEmoji} Has completado tu meta "${goalName}". ¡Felicidades!`,
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
 *
 * El texto se ajusta según `confidence` (viene de `parseNotification`): con
 * confianza `high` se afirma como un hecho ("detectado"); con `medium`/`low`
 * se redacta como algo a confirmar ("posible") para no sonar más seguro de lo
 * que el parser realmente está. El item queda en la cola de `useNotificationStore`
 * y nunca se guarda en el historial sin que el usuario lo confirme — ya sea en
 * `notification-review.tsx` (varios items pendientes) o directo en
 * `active-expense.tsx` prellenado (2026-09-02, ver `app/_layout.tsx`: si al tocar
 * la notificación este `itemId` sigue siendo el único pendiente, salta la lista y
 * abre el formulario ya cargado con monto/categoría/fecha).
 *
 * El título es una etiqueta corta (tipo + banco), sin el monto. El cuerpo usa
 * el monto + una etiqueta corta de la acción (`shortenDescription`, ej.
 * "Compra en RAPPI CO" / "Recibiste de Juan Pérez") en vez de la descripción
 * completa — el verbo lo decide `isExpense`, ya clasificado, no la keyword
 * suelta del banco (que varía y puede ser ambigua, ej. "enviaron" es ingreso
 * cuando alguien te manda plata). La descripción completa capturada del banco
 * sigue viva en `ParsedTransaction.description` y aparece igual que antes
 * como nota prellenada al editar el ítem en `notification-review.tsx`.
 */
export async function notifyBankTransaction(
  amount: number,
  description: string,
  bankName: string,
  isExpense: boolean,
  confidence: "high" | "medium" | "low" = "high",
  itemId?: string,
): Promise<void> {
  try {
    await ensureChannels();

    const amtStr = `$${Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
    const label = isExpense ? "gasto" : "ingreso";
    const title =
      confidence === "high"
        ? `Nuevo ${label} detectado — ${bankName}`
        : `¿Nuevo ${label}? — ${bankName}`;
    const shortDesc = description ? shortenDescription(description, isExpense) : "";
    const body =
      confidence === "high"
        ? shortDesc
          ? `${amtStr} · ${shortDesc}`
          : `${amtStr} · Toca para revisar`
        : shortDesc
          ? `${amtStr} · Posible ${shortDesc.charAt(0).toLowerCase() + shortDesc.slice(1)}`
          : `${amtStr} · No estamos seguros — confirma en la app`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        // `itemId` permite a app/_layout.tsx ir directo a active-expense prellenado
        // cuando este es el único item pendiente en la cola — ver getPendingItemAfterHydration.
        data: { screen: "notification-review", itemId },
        ...(Platform.OS === "android" && { channelId: CHANNEL_BANK }),
      },
      trigger: null,
    });
  } catch (e) {
    if (__DEV__) console.error("[notifyBankTransaction] error:", e);
  }
}

// ─── Recordatorio de pago de deuda ────────────────────────────────────────────

/** Identificador estable por deuda — permite cancelar/reprogramar sin acumular duplicados. */
function debtReminderId(debtId: string): string {
  return `debt-reminder-${debtId}`;
}

/**
 * Programa (o reprograma) el recordatorio mensual de pago de una deuda usando un
 * trigger `MONTHLY` nativo (AlarmManager vía expo-notifications) — no depende de que
 * la app esté corriendo, a diferencia del listener de notificaciones bancarias.
 * Nota: si `dueDay` no existe en un mes dado (ej. 31 en febrero), ese mes no dispara
 * — limitación del propio trigger MONTHLY del sistema, no un bug de la app.
 * Llamar tras crear/editar una deuda; `cancelDebtReminder` tras liquidarla o borrarla.
 */
export async function scheduleDebtReminder(debt: Debt): Promise<void> {
  if (!useSettingsStore.getState().notificationsEnabled) return;
  try {
    await ensureChannels();
    await cancelDebtReminder(debt.id);
    await Notifications.scheduleNotificationAsync({
      identifier: debtReminderId(debt.id),
      content: {
        title: `Cuota de "${debt.name}" por vencer`,
        body: `Recuerda pagar ${formatCOP(debt.monthlyPayment)} antes del día ${debt.dueDay}.`,
        sound: true,
        ...(Platform.OS === "android" && { channelId: CHANNEL_DEBTS }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: debt.dueDay,
        hour: 9,
        minute: 0,
      },
    });
  } catch (e) {
    if (__DEV__) console.error("[scheduleDebtReminder] error:", e);
  }
}

export async function cancelDebtReminder(debtId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(debtReminderId(debtId));
  } catch {
    // No había recordatorio programado — nada que cancelar.
  }
}

/** Llamar una sola vez, cuando el saldo de una deuda cruza a 0 con un abono. */
export async function notifyDebtPaidOff(debtName: string, debtEmoji: string): Promise<void> {
  if (!useSettingsStore.getState().notificationsEnabled) return;
  try {
    await ensureChannels();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Deuda liquidada!",
        body: `${debtEmoji} Terminaste de pagar "${debtName}". ¡Un paso más hacia tus metas!`,
        sound: true,
        ...(Platform.OS === "android" && { channelId: CHANNEL_DEBTS }),
      },
      trigger: null,
    });
  } catch (e) {
    if (__DEV__) console.error("[notifyDebtPaidOff] error:", e);
  }
}
