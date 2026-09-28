// ─── Períodos del Dashboard: frecuencia predeterminada, ciclos y vistas ──────
//
// "Frecuencia" (cadence) = cómo se corta el tiempo según cuándo cobra la persona:
// semanal, cada 2 semanas, varias veces al mes, mensual con día de inicio, o todo
// el tiempo. "Vista" = lo que está mirando el Dashboard ahora: un ciclo de esa
// frecuencia (offset desde el actual), un año, todo el historial o un rango a mano.
// Todo en fechas LOCALES (Regla inmutable #3): nunca toISOString().

// `pay` = pago esperado (COP) por ciclo; en "varias veces al mes", uno por día de pago
// (claves = día como string, así sobrevive a JSON/AsyncStorage). En "todo el tiempo" es
// mensual (esa frecuencia navega por meses calendario). Sin `pay` = no configurado.
export type PeriodCadence =
  | { type: "weekly"; weekStartsOn: number; pay?: number } // 0 = domingo … 6 = sábado
  | { type: "biweekly"; weekStartsOn: number; anchor: string; pay?: number } // anchor: "YYYY-MM-DD"
  | { type: "semimonthly"; days: number[]; pay?: Record<string, number> } // días 1–28 (ej. [1, 16])
  | { type: "monthly"; startDay: number; pay?: number } // 1–28
  | { type: "all"; pay?: number };

export type CycleCadence = Exclude<PeriodCadence, { type: "all" }>;

export type PeriodView =
  | { kind: "cycle"; offset: number }
  | { kind: "year"; year: number }
  | { kind: "all" }
  | { kind: "range"; start: string; end: string }; // "YYYY-MM-DD", ambos inclusive

/** `end` es el último instante del último día (23:59:59.999), para incluirlo completo. */
export interface DateRange {
  start: Date;
  end: Date;
}

export const DEFAULT_CADENCE: PeriodCadence = { type: "monthly", startDay: 1 };

export const MONTH_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
export const MONTH_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
export const WEEKDAY_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
export const WEEKDAY_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

// Tope de ciclos en la tira: semanal con años de historial daría cientos.
const MAX_CYCLES = 400;

// ─── Fechas ──────────────────────────────────────────────────────────────────

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Días calendario entre dos fechas (vía UTC, para no depender de horarios de verano). */
function daysBetween(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseYMD(s: string): Date {
  const [y, m, day] = s.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function sortedDays(days: number[]): number[] {
  const clean = [...new Set(days.map((x) => Math.min(28, Math.max(1, Math.round(x)))))].sort(
    (a, b) => a - b,
  );
  return clean.length > 0 ? clean : [1];
}

// ─── Ciclos ──────────────────────────────────────────────────────────────────

/** Frecuencia con la que se arman los ciclos: "todo el tiempo" navega por meses calendario. */
export function cycleCadenceOf(c: PeriodCadence): CycleCadence {
  return c.type === "all" ? { type: "monthly", startDay: 1, pay: c.pay } : c;
}

/**
 * Pago esperado para un ciclo de la frecuencia (0 = no configurado). En "varias veces al
 * mes" depende de qué día de pago abre el ciclo.
 */
export function expectedPay(c: PeriodCadence, cycle: DateRange): number {
  if (c.type === "semimonthly") return c.pay?.[String(cycle.start.getDate())] ?? 0;
  return c.pay ?? 0;
}

export function cycleStartContaining(c: CycleCadence, date: Date): Date {
  const day = startOfDay(date);
  switch (c.type) {
    case "weekly":
      return addDays(day, -((day.getDay() - c.weekStartsOn + 7) % 7));
    case "biweekly": {
      const anchor = parseYMD(c.anchor);
      return addDays(anchor, Math.floor(daysBetween(anchor, day) / 14) * 14);
    }
    case "monthly":
      return day.getDate() >= c.startDay
        ? new Date(day.getFullYear(), day.getMonth(), c.startDay)
        : new Date(day.getFullYear(), day.getMonth() - 1, c.startDay);
    case "semimonthly": {
      const days = sortedDays(c.days);
      const reached = days.filter((x) => x <= day.getDate());
      return reached.length > 0
        ? new Date(day.getFullYear(), day.getMonth(), reached[reached.length - 1])
        : new Date(day.getFullYear(), day.getMonth() - 1, days[days.length - 1]);
    }
  }
}

function nextCycleStart(c: CycleCadence, start: Date): Date {
  switch (c.type) {
    case "weekly":
      return addDays(start, 7);
    case "biweekly":
      return addDays(start, 14);
    case "monthly":
      return new Date(start.getFullYear(), start.getMonth() + 1, c.startDay);
    case "semimonthly": {
      const days = sortedDays(c.days);
      const later = days.find((x) => x > start.getDate());
      return later !== undefined
        ? new Date(start.getFullYear(), start.getMonth(), later)
        : new Date(start.getFullYear(), start.getMonth() + 1, days[0]);
    }
  }
}

function prevCycleStart(c: CycleCadence, start: Date): Date {
  switch (c.type) {
    case "weekly":
      return addDays(start, -7);
    case "biweekly":
      return addDays(start, -14);
    case "monthly":
      return new Date(start.getFullYear(), start.getMonth() - 1, c.startDay);
    case "semimonthly": {
      const days = sortedDays(c.days);
      const earlier = days.filter((x) => x < start.getDate());
      return earlier.length > 0
        ? new Date(start.getFullYear(), start.getMonth(), earlier[earlier.length - 1])
        : new Date(start.getFullYear(), start.getMonth() - 1, days[days.length - 1]);
    }
  }
}

function cycleFromStart(c: CycleCadence, start: Date): DateRange {
  return { start, end: endOfDay(addDays(nextCycleStart(c, start), -1)) };
}

/** Ciclo `offset` posiciones desde el que contiene `now` (0 = actual, -1 = anterior…). */
export function cycleAtOffset(c: CycleCadence, offset: number, now: Date): DateRange {
  let start = cycleStartContaining(c, now);
  for (let i = 0; i < Math.abs(offset); i++) {
    start = offset > 0 ? nextCycleStart(c, start) : prevCycleStart(c, start);
  }
  return cycleFromStart(c, start);
}

/**
 * Ciclos en orden ascendente, desde el que contiene el primer movimiento (`earliest`)
 * hasta el actual más `future` ciclos por delante. El último elemento antes de los
 * futuros es siempre el ciclo actual: su índice es `length - 1 - future`.
 */
export function listCycles(
  c: CycleCadence,
  earliest: Date | null,
  now: Date,
  future: number,
): DateRange[] {
  const current = cycleStartContaining(c, now);
  const out: DateRange[] = [];
  let start = current;
  if (earliest && earliest < current) {
    const first = cycleStartContaining(c, earliest);
    const back: Date[] = [];
    while (start > first && back.length < MAX_CYCLES) {
      start = prevCycleStart(c, start);
      back.push(start);
    }
    for (let i = back.length - 1; i >= 0; i--) out.push(cycleFromStart(c, back[i]));
  }
  start = current;
  for (let i = 0; i <= future; i++) {
    out.push(cycleFromStart(c, start));
    start = nextCycleStart(c, start);
  }
  return out;
}

export function yearRange(year: number): DateRange {
  return { start: new Date(year, 0, 1), end: endOfDay(new Date(year, 11, 31)) };
}

/** Ciclo del presupuesto mensual: sigue el día de inicio si la frecuencia es mensual. */
export function budgetCycle(c: PeriodCadence, now: Date): DateRange {
  const startDay = c.type === "monthly" ? c.startDay : 1;
  return cycleAtOffset({ type: "monthly", startDay }, 0, now);
}

/** Identificador estable de un ciclo (su fecha de inicio). */
export function cycleKey(range: DateRange): string {
  return toYMD(range.start);
}

// ─── Etiquetas ───────────────────────────────────────────────────────────────

function dayLabel(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function rangeLabel(start: Date, end: Date): string {
  if (start.getFullYear() !== end.getFullYear()) {
    return `${dayLabel(start)}, ${start.getFullYear()} – ${dayLabel(end)}, ${end.getFullYear()}`;
  }
  if (start.getMonth() === end.getMonth()) {
    return start.getDate() === end.getDate()
      ? dayLabel(start)
      : `${dayLabel(start)} – ${end.getDate()}`;
  }
  return `${dayLabel(start)} – ${dayLabel(end)}`;
}

export function cycleLabel(c: CycleCadence, range: DateRange, now: Date): string {
  if (c.type === "monthly" && c.startDay === 1) {
    const name = MONTH_LONG[range.start.getMonth()];
    return range.start.getFullYear() === now.getFullYear()
      ? name
      : `${name} ${range.start.getFullYear()}`;
  }
  return rangeLabel(range.start, range.end);
}

/** Nombre corto de la unidad de ciclo, para el menú ("Mes", "Semana"…). */
export function cycleUnitLabel(c: PeriodCadence): string {
  switch (c.type) {
    case "weekly":
      return "Semana";
    case "biweekly":
      return "2 semanas";
    case "semimonthly":
      return "Quincena";
    default:
      return "Mes";
  }
}

export function cadenceLabel(c: PeriodCadence): string {
  switch (c.type) {
    case "weekly":
      return "Semanal";
    case "biweekly":
      return "Cada 2 semanas";
    case "semimonthly":
      return "Varias veces al mes";
    case "monthly":
      return "Mensual";
    case "all":
      return "Todo el tiempo";
  }
}

// ─── Vistas ──────────────────────────────────────────────────────────────────

export function defaultView(c: PeriodCadence): PeriodView {
  return c.type === "all" ? { kind: "all" } : { kind: "cycle", offset: 0 };
}

export function isDefaultView(v: PeriodView, c: PeriodCadence): boolean {
  return c.type === "all" ? v.kind === "all" : v.kind === "cycle" && v.offset === 0;
}

/** Rango de fechas de la vista; `null` = sin límite (todo el historial). */
export function viewRange(v: PeriodView, c: PeriodCadence, now: Date): DateRange | null {
  switch (v.kind) {
    case "cycle":
      return cycleAtOffset(cycleCadenceOf(c), v.offset, now);
    case "year":
      return yearRange(v.year);
    case "all":
      return null;
    case "range":
      return { start: parseYMD(v.start), end: endOfDay(parseYMD(v.end)) };
  }
}

export function viewLabel(v: PeriodView, c: PeriodCadence, now: Date): string {
  switch (v.kind) {
    case "cycle":
      return cycleLabel(cycleCadenceOf(c), cycleAtOffset(cycleCadenceOf(c), v.offset, now), now);
    case "year":
      return String(v.year);
    case "all":
      return "Todo el tiempo";
    case "range":
      return rangeLabel(parseYMD(v.start), parseYMD(v.end));
  }
}

// ─── Transacciones ───────────────────────────────────────────────────────────

export function filterByRange<T extends { date: string }>(txs: T[], range: DateRange | null): T[] {
  if (!range) return [...txs];
  const s = range.start.getTime();
  const e = range.end.getTime();
  return txs.filter((t) => {
    const time = new Date(t.date).getTime();
    return time >= s && time <= e;
  });
}

/**
 * Gasto e ingreso por cada rango (ordenados ascendente, sin solaparse), en una sola
 * pasada con búsqueda binaria — la tira semanal puede tener cientos de ciclos.
 * `amount > 0` es gasto, `amount < 0` ingreso (convención de la app).
 */
export function sumByRanges<T extends { date: string; amount: number }>(
  txs: T[],
  ranges: DateRange[],
): { expense: number; income: number }[] {
  const sums = ranges.map(() => ({ expense: 0, income: 0 }));
  const starts = ranges.map((r) => r.start.getTime());
  for (const t of txs) {
    const time = new Date(t.date).getTime();
    let lo = 0;
    let hi = starts.length - 1;
    let idx = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (starts[mid] <= time) {
        idx = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (idx === -1 || time > ranges[idx].end.getTime()) continue;
    if (t.amount > 0) sums[idx].expense += t.amount;
    else sums[idx].income += Math.abs(t.amount);
  }
  return sums;
}
