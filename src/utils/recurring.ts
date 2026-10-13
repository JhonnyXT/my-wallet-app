// ─── Gastos/ingresos recurrentes (Pro): cálculo de fechas ────────────────────
//
// Funciones puras, sin Zustand/React — fáciles de testear con un reloj fijo.
// Todo en fechas LOCALES (Regla inmutable #3): nunca toISOString(). La clave de
// ciclo ("cycleKey") es simplemente la fecha de la ocurrencia en "YYYY-MM-DD":
// alcanza para la idempotencia (cada ocurrencia cae en un día distinto) sin
// necesitar un formato de semana aparte.

import type { RecurringCadence, RecurringExpense } from "@/src/store/slices/recurringSlice";
import { WEEKDAY_LONG } from "./periodCycles";

/** Ciclos vencidos sin confirmar que se ofrecen a la vez, como mucho, por recurrente. */
export const RECURRING_QUEUE_CAP = 6;

/** Tope de iteraciones al enumerar ocurrencias — mismo criterio defensivo que `MAX_CYCLES` de periodCycles.ts. */
const SAFETY_LIMIT = 500;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** "YYYY-MM-DD" local — la clave de ciclo de una ocurrencia. */
export function cycleKeyOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseCycleKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Acota el día al último real del mes (ej. 31 en un mes de 30 días) — igual que `monthDate()` de periodCycles.ts. */
function monthDate(year: number, month: number, day: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDay));
}

/** Primera ocurrencia de la cadencia en `from` o después (inclusive), a medianoche local. */
export function nextDueDate(cadence: RecurringCadence, from: Date): Date {
  const start = startOfDay(from);
  if (cadence.type === "weekly") {
    const diff = (cadence.weekday - start.getDay() + 7) % 7;
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + diff);
  }
  if (cadence.type === "biweekly") {
    const anchor = parseCycleKey(cadence.anchor);
    if (start <= anchor) return anchor;
    // Días entre fechas por UTC: el cambio de hora no desfasa el conteo.
    const diff = Math.round(
      (Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()) -
        Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())) /
        86_400_000,
    );
    const steps = Math.ceil(diff / 14);
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + steps * 14);
  }
  if (cadence.type === "semimonthly") {
    for (const monthOffset of [0, 1]) {
      const first = monthDate(start.getFullYear(), start.getMonth() + monthOffset, cadence.days[0]);
      const second = monthDate(start.getFullYear(), start.getMonth() + monthOffset, cadence.days[1]);
      const found = [first, second].filter((c) => c >= start).sort((a, b) => a.getTime() - b.getTime());
      if (found.length > 0) return found[0];
    }
  }
  const day = cadence.type === "monthly" ? cadence.day : 1;
  const candidate = monthDate(start.getFullYear(), start.getMonth(), day);
  if (candidate >= start) return candidate;
  return monthDate(start.getFullYear(), start.getMonth() + 1, day);
}

/** Las próximas `count` ocurrencias desde `from` (inclusive), sin repetir fecha. */
export function upcomingOccurrences(cadence: RecurringCadence, from: Date, count: number): Date[] {
  const out: Date[] = [];
  let cursor = nextDueDate(cadence, from);
  while (out.length < count) {
    out.push(cursor);
    cursor = occurrenceAfter(cadence, cursor);
  }
  return out;
}

/** Cuántos avisos de fecha fija se programan por adelantado (cadencia sin trigger nativo). */
export const REMINDER_DATE_SLOTS = 4;

/** Hora del aviso (local), la misma que usan los recordatorios de deudas. */
const REMINDER_HOUR = 9;

/** Cómo se programa el aviso de una cadencia: trigger nativo repetido o fechas puntuales. */
export type ReminderTrigger =
  | { kind: "weekly"; weekday: number } // 0=domingo … 6=sábado (convención de la app)
  | { kind: "monthly"; day: number }
  | { kind: "date"; date: Date };

/**
 * Triggers de aviso de una cadencia. `weekly`/`monthly` y las dos fechas de `semimonthly` son
 * repetidos y nativos. `biweekly` no tiene trigger nativo (cada 14 días no es semanal ni mensual):
 * se programan las próximas `REMINDER_DATE_SLOTS` ocurrencias futuras a las 9:00, y se renuevan en
 * cada arranque de la app (`syncRecurringReminders`).
 */
export function reminderTriggers(cadence: RecurringCadence, now: Date): ReminderTrigger[] {
  switch (cadence.type) {
    case "weekly":
      return [{ kind: "weekly", weekday: cadence.weekday }];
    case "monthly":
      return [{ kind: "monthly", day: cadence.day }];
    case "semimonthly":
      return [
        { kind: "monthly", day: cadence.days[0] },
        { kind: "monthly", day: cadence.days[1] },
      ];
    case "biweekly": {
      const at9 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), REMINDER_HOUR);
      return upcomingOccurrences(cadence, now, REMINDER_DATE_SLOTS + 1)
        .map(at9)
        .filter((d) => d > now)
        .slice(0, REMINDER_DATE_SLOTS)
        .map((date) => ({ kind: "date" as const, date }));
    }
  }
}

/** Ocurrencias de la cadencia por mes, en promedio (para sumar gastos fijos de distintas cadencias). */
export function occurrencesPerMonth(cadence: RecurringCadence): number {
  switch (cadence.type) {
    case "weekly":
      return 52 / 12;
    case "biweekly":
      return 26 / 12;
    case "semimonthly":
      return 2;
    default:
      return 1;
  }
}

export interface FixedRecurringSummary {
  /** Suma del equivalente mensual de los recurrentes considerados. */
  monthlyTotal: number;
  /** Del más pesado al más liviano, con su equivalente mensual. */
  items: { recurring: RecurringExpense; monthly: number }[];
}

/**
 * Gasto (o ingreso) fijo mensual de los recurrentes ACTIVOS de una lista: cada uno se lleva a
 * "por mes" según su cadencia (semanal ≈ 4,33 veces, cada 2 semanas ≈ 2,17, dos veces al mes = 2).
 * Es un equivalente para comparar, no lo que de verdad caerá un mes puntual (un mes tiene 4 o 5
 * semanas).
 */
export function summarizeFixedRecurring(
  list: RecurringExpense[],
  isExpense: boolean,
  listId: string,
): FixedRecurringSummary {
  const items = list
    .filter((r) => r.active && r.isExpense === isExpense && r.listId === listId)
    .map((recurring) => ({
      recurring,
      monthly: Math.round(recurring.amount * occurrencesPerMonth(recurring.cadence)),
    }))
    .sort((a, b) => b.monthly - a.monthly);
  return { monthlyTotal: items.reduce((s, i) => s + i.monthly, 0), items };
}

/** "Cada mes, día 5", "Cada 2 semanas, viernes"… — texto corto de la cadencia para listas. */
export function describeCadence(cadence: RecurringCadence): string {
  switch (cadence.type) {
    case "monthly":
      return `Cada mes, día ${cadence.day}`;
    case "weekly":
      return `Cada ${WEEKDAY_LONG[cadence.weekday]}`;
    case "biweekly":
      return `Cada 2 semanas, ${WEEKDAY_LONG[parseCycleKey(cadence.anchor).getDay()]}`;
    case "semimonthly":
      return `Días ${cadence.days[0]} y ${cadence.days[1]} de cada mes`;
  }
}

/** Primera ocurrencia estrictamente DESPUÉS de `after`. */
function occurrenceAfter(cadence: RecurringCadence, after: Date): Date {
  const nextDay = new Date(after.getFullYear(), after.getMonth(), after.getDate() + 1);
  return nextDueDate(cadence, nextDay);
}

/** Próxima ocurrencia a mostrar (ej. "Ajustes → Recurrentes"): la siguiente sin manejar, tomando
 *  en cuenta el último ciclo ya confirmado/omitido. Puede caer en el pasado si hay vencidos sin
 *  confirmar — para la fecha futura "limpia" usar junto con `dueRecurring`. */
export function upcomingDueDate(recurring: RecurringExpense, now: Date): Date {
  if (!recurring.lastHandledCycleKey) return nextDueDate(recurring.cadence, now);
  return occurrenceAfter(recurring.cadence, parseCycleKey(recurring.lastHandledCycleKey));
}

/** true si el recurrente tiene al menos una ocurrencia vencida sin confirmar. */
export function isDue(recurring: RecurringExpense, now: Date): boolean {
  if (!recurring.active) return false;
  return upcomingDueDate(recurring, now) <= startOfDay(now);
}

export interface RecurringOccurrence {
  recurring: RecurringExpense;
  dueDate: Date;
  cycleKey: string;
}

export interface DueRecurringResult {
  /** Una fila por ocurrencia vencida sin confirmar, topada en `RECURRING_QUEUE_CAP` por recurrente
   *  (las más recientes; ver `autoSkip`). */
  queue: RecurringOccurrence[];
  /** `recurringId` → cycleKey del ciclo vencido más viejo que el tope — se da por omitido sin
   *  insertar nada; quien llame a `dueRecurring` debe aplicar `markHandled(id, cycleKey)` para
   *  cada entrada antes de mostrar `queue` (ver `useRecurringQueueStore`). */
  autoSkip: Record<string, string>;
}

/** Recurrentes activos vencidos sin confirmar, a partir del estado persistido y la fecha actual.
 *  Pura: no muta nada — quien la llama decide qué hacer con `autoSkip`. */
export function dueRecurring(list: RecurringExpense[], now: Date): DueRecurringResult {
  const today = startOfDay(now);
  const queue: RecurringOccurrence[] = [];
  const autoSkip: Record<string, string> = {};

  for (const recurring of list) {
    if (!recurring.active) continue;

    let cursor = recurring.lastHandledCycleKey
      ? occurrenceAfter(recurring.cadence, parseCycleKey(recurring.lastHandledCycleKey))
      : nextDueDate(recurring.cadence, parseCycleKey(recurring.createdAt.slice(0, 10)));

    const occurrences: Date[] = [];
    let guard = 0;
    while (cursor <= today && guard < SAFETY_LIMIT) {
      occurrences.push(cursor);
      cursor = occurrenceAfter(recurring.cadence, cursor);
      guard++;
    }
    if (occurrences.length === 0) continue;

    if (occurrences.length > RECURRING_QUEUE_CAP) {
      const dropped = occurrences.slice(0, occurrences.length - RECURRING_QUEUE_CAP);
      autoSkip[recurring.id] = cycleKeyOf(dropped[dropped.length - 1]);
    }
    const kept = occurrences.slice(-RECURRING_QUEUE_CAP);
    for (const dueDate of kept) {
      queue.push({ recurring, dueDate, cycleKey: cycleKeyOf(dueDate) });
    }
  }

  return { queue, autoSkip };
}
