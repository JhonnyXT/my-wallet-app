// ─── Gastos/ingresos recurrentes (Pro): cálculo de fechas ────────────────────
//
// Funciones puras, sin Zustand/React — fáciles de testear con un reloj fijo.
// Todo en fechas LOCALES (Regla inmutable #3): nunca toISOString(). La clave de
// ciclo ("cycleKey") es simplemente la fecha de la ocurrencia en "YYYY-MM-DD":
// alcanza para la idempotencia (cada ocurrencia cae en un día distinto) sin
// necesitar un formato de semana aparte.

import type { RecurringCadence, RecurringExpense } from "@/src/store/slices/recurringSlice";

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
  const candidate = monthDate(start.getFullYear(), start.getMonth(), cadence.day);
  if (candidate >= start) return candidate;
  return monthDate(start.getFullYear(), start.getMonth() + 1, cadence.day);
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
