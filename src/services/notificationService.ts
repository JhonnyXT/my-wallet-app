/**
 * notificationService — gestiona notificaciones locales del sistema (expo-notifications).
 * Sin servidor, sin push remoto. 100% offline.
 */
import * as Notifications from "expo-notifications";
import { Linking, Platform } from "react-native";
import { useSettingsStore, type Debt, type RecurringExpense } from "@/src/store/useSettingsStore";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { formatCOP } from "@/src/utils/formatMoney";
import { budgetCycle, cycleKey } from "@/src/utils/periodCycles";
import { shortenDescription } from "@/src/utils/notificationParser/descriptionExtractor";
import { REMINDER_DATE_SLOTS, reminderTriggers } from "@/src/utils/recurring";

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
const CHANNEL_RECURRING = "recurring-expenses";

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
  await Notifications.setNotificationChannelAsync(CHANNEL_RECURRING, {
    name: "Gastos e ingresos recurrentes",
    importance: Notifications.AndroidImportance.HIGH,
    sound: null,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Clave del ciclo de presupuesto actual: sigue el día de inicio si la frecuencia es mensual. */
function currentBudgetCycleKey(): string {
  return cycleKey(budgetCycle(useSettingsStore.getState().defaultPeriod, new Date()));
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

/** ¿Puede la app mostrar notificaciones push? (sin Android 13+ el permiso se concede aparte). */
export async function areNotificationsAllowed(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Pide el permiso de notificaciones solo si el sistema todavía muestra el diálogo; nunca abre
 * Ajustes. Sirve para caminos automáticos (ej. volver de la pantalla de acceso a notificaciones),
 * donde abrir Ajustes en cada vuelta a primer plano sería un bucle.
 */
export async function askNotificationPermissionIfPossible(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === "granted") return true;
  if (!canAskAgain) return false;
  return requestNotificationPermissions();
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

  const month = currentBudgetCycleKey();
  const ratio = spent / budget;
  const threshold = store.budgetAlertThreshold / 100;
  const isOver = ratio >= 1.0;

  // Claves compuestas para permitir dos notificaciones por categoría por ciclo de presupuesto:
  // una al cruzar el umbral, otra al superar el 100%. Cada lista tiene sus presupuestos: fuera
  // de Personal la clave lleva la lista, para que el mismo emoji en dos listas no choque
  // (Personal conserva las claves de siempre).
  const list = store.lists.find((l) => l.id === store.activeListId);
  const inOtherList = store.activeListId !== DEFAULT_LIST_ID && !!list;
  const prefix = inOtherList ? `${store.activeListId}|` : "";
  const where = inOtherList ? ` en ${list.emoji} ${list.name}` : "";
  const keyThreshold = `${prefix}${categoryEmoji}:threshold`;
  const keyOverspent = `${prefix}${categoryEmoji}:overspent`;

  if (isOver) {
    // Notificar cuando se supera el 100% del presupuesto (máximo una vez por mes)
    if (store.budgetNotifiedMonth[keyOverspent] === month) return;

    await ensureChannels();
    const over = spent - budget;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Presupuesto superado",
        body: `Superaste el límite de "${categoryName}"${where} por ${formatCOP(over)}.`,
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
        body: `Llevas el ${pct}% de tu presupuesto en "${categoryName}"${where}.`,
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
 * `shortenDescription` (ej. "Compra en RAPPI CO · $45.000" / "Recibiste de
 * Juan Pérez · $80.000" — YA incluye el monto, no se concatena aparte) en vez
 * de la descripción completa — el verbo lo decide `isExpense`, ya clasificado,
 * no la keyword suelta del banco (que varía y puede ser ambigua, ej.
 * "enviaron" es ingreso cuando alguien te manda plata). Esta misma versión
 * corta (no la completa capturada del banco) es también la que queda como
 * nota al editar/guardar el ítem en `notification-review.tsx` (2026-09-23,
 * antes se mostraba el texto casi tal cual lo mandó el banco).
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

    const amtStr = formatCOP(amount);
    const label = isExpense ? "gasto" : "ingreso";
    const title =
      confidence === "high"
        ? `Nuevo ${label} detectado — ${bankName}`
        : `¿Nuevo ${label}? — ${bankName}`;
    // `shortDesc` ya incluye el monto (ej. "Recibiste de Juan Pérez · $80.000") —
    // no se vuelve a concatenar `amtStr` para no duplicarlo.
    const shortDesc = description ? shortenDescription(description, isExpense, amount) : "";
    const body =
      confidence === "high"
        ? shortDesc || `${amtStr} · Toca para revisar`
        : shortDesc
          ? `Posible ${shortDesc.charAt(0).toLowerCase() + shortDesc.slice(1)}`
          : `${amtStr} · No estamos seguros — confirma en la app`;

    await Notifications.scheduleNotificationAsync({
      // Mismo id que el item de la cola: si por una carrera se vuelve a notificar el mismo
      // item, Android reemplaza la push en vez de mostrar dos.
      ...(itemId && { identifier: `bank-tx-${itemId}` }),
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

// ─── Gastos/ingresos recurrentes (Pro) ─────────────────────────────────────────

/**
 * Identificador estable por recurrente y posición del aviso (una cadencia puede programar varios:
 * dos triggers mensuales, o varias fechas). La posición 0 conserva el id sin sufijo, así los
 * recordatorios ya programados antes de las cadencias nuevas se reemplazan en vez de duplicarse.
 */
function recurringReminderId(recurringId: string, slot = 0): string {
  return slot === 0
    ? `recurring-reminder-${recurringId}`
    : `recurring-reminder-${recurringId}-${slot}`;
}

/** Posiciones a cancelar: el máximo de triggers que programa cualquier cadencia. */
const RECURRING_REMINDER_SLOTS = Math.max(REMINDER_DATE_SLOTS, 2);

/**
 * Programa (o reprograma) el recordatorio de un recurrente (9:00, hora local). Los triggers nativos
 * (`WEEKLY`/`MONTHLY`, AlarmManager vía expo-notifications) no dependen de que la app esté
 * corriendo; la cadencia quincenal usa fechas puntuales que se renuevan en cada arranque (ver
 * `reminderTriggers`). `weekday` sigue la convención de la app (0=domingo…6=sábado, igual que
 * `Date.getDay()`); el trigger `WEEKLY` de expo-notifications usa 1=domingo…7=sábado, de ahí el
 * `+ 1`. Al tocar la notificación, el sistema abre la app con `data: { screen: "recurring-review" }`.
 * Llamar tras crear/editar/reanudar un recurrente; `cancelRecurringReminder` tras pausarlo o
 * borrarlo (ver `app/settings.tsx`, que es quien orquesta esto — el slice no llama notificaciones).
 */
export async function scheduleRecurringReminder(recurring: RecurringExpense): Promise<void> {
  if (!useSettingsStore.getState().notificationsEnabled) return;
  try {
    await ensureChannels();
    await cancelRecurringReminder(recurring.id);
    const amtStr = formatCOP(recurring.amount);
    const label = recurring.isExpense ? "por vencer" : "por recibir";
    const triggers = reminderTriggers(recurring.cadence, new Date());
    for (const [slot, t] of triggers.entries()) {
      await Notifications.scheduleNotificationAsync({
        identifier: recurringReminderId(recurring.id, slot),
        content: {
          title: `"${recurring.name}" ${label}`,
          body: `${amtStr} · Toca para confirmar`,
          sound: true,
          data: { screen: "recurring-review", recurringId: recurring.id },
          ...(Platform.OS === "android" && { channelId: CHANNEL_RECURRING }),
        },
        trigger:
          t.kind === "weekly"
            ? {
                type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
                weekday: t.weekday + 1,
                hour: 9,
                minute: 0,
              }
            : t.kind === "monthly"
              ? {
                  type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
                  day: t.day,
                  hour: 9,
                  minute: 0,
                }
              : { type: Notifications.SchedulableTriggerInputTypes.DATE, date: t.date },
      });
    }
  } catch (e) {
    if (__DEV__) console.error("[scheduleRecurringReminder] error:", e);
  }
}

/**
 * Reprograma el recordatorio de todos los recurrentes activos. Android borra las alarmas de una
 * app al forzar su detención (y algunos fabricantes lo hacen al "dormir" apps): sin esto, quien
 * pasó por eso dejaba de recibir avisos hasta editar cada recurrente. Es idempotente
 * (`scheduleRecurringReminder` reemplaza por `identifier`), así que se llama en cada arranque.
 */
export async function syncRecurringReminders(): Promise<void> {
  const { recurringExpenses } = useSettingsStore.getState();
  for (const r of recurringExpenses) {
    if (r.active) await scheduleRecurringReminder(r);
  }
}

export async function cancelRecurringReminder(recurringId: string): Promise<void> {
  for (let slot = 0; slot < RECURRING_REMINDER_SLOTS; slot++) {
    try {
      await Notifications.cancelScheduledNotificationAsync(recurringReminderId(recurringId, slot));
    } catch {
      // No había recordatorio en esta posición — nada que cancelar.
    }
  }
}
