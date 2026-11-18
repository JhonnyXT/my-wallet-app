// Datos de ejemplo de la demo interactiva. Las categorías son las predefinidas
// reales de la app (`app/categoryPresets.ts`, copia generada); aquí solo se
// eligen las del "usuario" de ejemplo y se agregan sus movimientos: septiembre
// completo y el historial de abril a agosto, para que Promedios, Tendencia y el
// selector de mes salgan de los mismos movimientos, como en la app.

import { ALL_PRESETS, type UserCategory } from './app/categoryPresets';
import { fuzzyIncludes } from './app/fuzzyMatch';

/** Listas de la demo (réplica acotada de "Listas y gasto compartido"): el
 * selector del Dashboard cambia entre Personal y una lista de ejemplo. Sin
 * miembros ni "quién pagó" — eso queda fuera de la demo. */
export type ListId = 'personal' | 'viaje';
export const LISTS: { id: ListId; name: string; emoji: string }[] = [
  { id: 'personal', name: 'Personal', emoji: '👤' },
  { id: 'viaje', name: 'Viaje a Cartagena', emoji: '✈️' },
];

/** Movimiento con la convención de la app: `amount > 0` gasto, `< 0` ingreso;
 * la categoría se identifica por su emoji. `date` es hora local ISO. */
export type DemoTx = {
  id: number;
  emoji: string;
  amount: number;
  description: string;
  date: string;
  account: string;
  tags: string[];
  list: ListId;
};

/** "Hoy" de la demo: fijo, para que los datos siempre cuadren. */
export const TODAY = new Date(2026, 8, 24, 10, 30);

const pad = (n: number) => String(n).padStart(2, '0');
/** Igual que `localISOString()` de `src/db/db.ts`. */
export function localISOString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
const at = (month: number, day: number, h: number, m: number) => localISOString(new Date(2026, month - 1, day, h, m));

// Categorías que eligió el usuario de ejemplo en el onboarding.
const PICKED = [
  'preset_food',
  'preset_transport',
  'preset_home',
  'preset_shopping',
  'preset_health',
  'preset_entertainment',
  'preset_coffee',
  'preset_subscriptions',
  'preset_salary',
  'preset_freelance',
  'preset_extra',
  'preset_other_income',
];
export const USER_CATEGORIES: UserCategory[] = PICKED.map((id) => ALL_PRESETS.find((c) => c.id === id)!);

// Categorías propias de "Viaje a Cartagena" (una lista nueva trae las suyas,
// no hereda las de Personal — igual que en la app real).
const TRIP_PICKED = ['preset_travel', 'preset_food', 'preset_transport'];
export const TRIP_CATEGORIES: UserCategory[] = TRIP_PICKED.map((id) => ALL_PRESETS.find((c) => c.id === id)!);

const LOOKUP_CATEGORIES: UserCategory[] = [...USER_CATEGORIES, ...TRIP_CATEGORIES.filter((c) => !USER_CATEGORIES.some((u) => u.emoji === c.emoji))];

export function categoriesForList(list: ListId): UserCategory[] {
  return list === 'viaje' ? TRIP_CATEGORIES : USER_CATEGORIES;
}
export const expenseCategories = (list: ListId = 'personal') => categoriesForList(list).filter((c) => c.type === 'expense');
export const incomeCategories = (list: ListId = 'personal') => categoriesForList(list).filter((c) => c.type === 'income');

export const catByEmoji = (emoji: string) => LOOKUP_CATEGORIES.find((c) => c.emoji === emoji);

/** `resolveCategoryName()` de `TransactionItem.tsx`: sin categoría del usuario, "General". */
export function categoryName(emoji: string): string {
  const name = catByEmoji(emoji)?.name;
  return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : 'General';
}

/** `getCategoryColor()` de `src/constants/theme.ts`. */
export function categoryColor(emoji: string): { bg: string; accent: string } {
  const c = catByEmoji(emoji);
  return c ? { bg: c.colorBg, accent: c.colorAccent } : { bg: '#F1F5F9', accent: '#64748B' };
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** `guessCategoryEmoji(texto, userCategories, isExpense)`: keywords de las
 * categorías del usuario, filtradas por tipo; sin coincidencia, 💸. */
export function guessCategoryEmoji(text: string, isExpense: boolean): string {
  const t = normalize(text);
  for (const c of USER_CATEGORIES) {
    if ((c.type === 'expense') !== isExpense) continue;
    if (c.keywords.some((kw) => fuzzyIncludes(t, normalize(kw)))) return c.emoji;
  }
  return '💸';
}

// ─── Septiembre ────────────────────────────────────────────────────────────────

type Seed = [emoji: string, date: string, description: string, amount: number, account?: string, tags?: string[]];

const SEPTEMBER: Seed[] = [
  ['🍔', at(9, 24, 12, 40), 'Almuerzo', 45000],
  ['🚗', at(9, 24, 7, 55), 'Uber al trabajo', 12000, 'savings', ['#trabajo']],
  ['💼', at(9, 23, 18, 0), 'Quincena', -2400000, 'savings'],
  ['☕', at(9, 23, 9, 10), 'Tinto', 8000],
  ['🏠', at(9, 21, 8, 30), 'Internet', 89900, 'savings'],
  ['🍔', at(9, 20, 17, 20), 'Mercado', 386000, 'credit'],
  ['🎮', at(9, 18, 20, 15), 'Cine', 131000, 'credit', ['#ocio']],
  ['🚗', at(9, 15, 16, 45), 'Gasolina', 226000, 'credit'],
  ['💼', at(9, 15, 9, 0), 'Quincena', -2400000, 'savings'],
  ['🏠', at(9, 12, 11, 5), 'Servicios', 322100, 'savings'],
  ['📱', at(9, 10, 6, 0), 'Netflix', 38900, 'credit'],
  ['🍔', at(9, 8, 13, 30), 'Restaurante', 55000, 'cash', ['#trabajo']],
];

// ─── Historial abril–agosto ────────────────────────────────────────────────────

/** Gasto total de abril a agosto por categoría: con septiembre da los
 * promedios mensuales del resto de la landing (Comida $512.000, Hogar
 * $398.000…). Promedios divide entre los meses con movimientos, como la app. */
const HISTORY_TOTALS: [emoji: string, total: number, descriptions: [string, string]][] = [
  ['🍔', 2_586_000, ['Mercado', 'Restaurante']],
  ['🏠', 1_976_000, ['Arriendo y servicios', 'Internet']],
  ['🚗', 1_088_000, ['Gasolina', 'Uber']],
  ['🎮', 577_000, ['Concierto', 'Cine']],
  ['🛍️', 360_000, ['Ropa', 'Regalo']],
  ['📱', 293_500, ['Netflix', 'Spotify']],
  ['☕', 292_000, ['Café con amigos', 'Tinto']],
];
const MONTH_WEIGHTS = [0.19, 0.21, 0.18, 0.22, 0.2];

function history(): Seed[] {
  const out: Seed[] = [];
  HISTORY_TOTALS.forEach(([emoji, total, [a, b]], ci) => {
    let left = total;
    MONTH_WEIGHTS.forEach((w, mi) => {
      const month = mi + 4;
      const monthTotal = mi === MONTH_WEIGHTS.length - 1 ? left : Math.round((total * w) / 100) * 100;
      left -= monthTotal;
      const first = Math.round((monthTotal * 0.6) / 100) * 100;
      out.push([emoji, at(month, 5 + ci * 3, 12, 10), a, first, 'credit']);
      out.push([emoji, at(month, 6 + ci * 3, 18, 40), b, monthTotal - first, 'cash']);
    });
  });
  for (let month = 4; month <= 8; month++) {
    out.push(['💼', at(month, 15, 9, 0), 'Quincena', -2400000, 'savings']);
    out.push(['💼', at(month, 30, 9, 0), 'Quincena', -2400000, 'savings']);
  }
  out.push(['💻', at(6, 12, 15, 0), 'Diseño de logo', -650000, 'savings']);
  out.push(['💻', at(8, 21, 15, 0), 'Asesoría', -400000, 'savings']);
  return out;
}

const PERSONAL_SEED: DemoTx[] = [...SEPTEMBER, ...history()]
  .sort((x, y) => (x[1] < y[1] ? 1 : -1))
  .map(([emoji, date, description, amount, account = 'cash', tags = []], i) => ({ id: i + 1, emoji, date, description, amount, account, tags, list: 'personal' }));

// ─── Viaje a Cartagena (lista de ejemplo del selector) ─────────────────────────

const TRIP_SEED_RAW: Seed[] = [
  ['✈️', at(9, 2, 10, 0), 'Vuelos y hotel', 1_450_000],
  ['🍔', at(9, 2, 13, 0), 'Almuerzo en el Centro', 85_000],
  ['✈️', at(9, 3, 9, 0), 'Tour Islas del Rosario', 320_000],
  ['🍔', at(9, 3, 19, 30), 'Cena en La Cevichería', 210_000],
  ['🚗', at(9, 4, 6, 0), 'Taxi al aeropuerto', 65_000],
];
const TRIP_SEED: DemoTx[] = TRIP_SEED_RAW.map(([emoji, date, description, amount, account = 'cash', tags = []], i) => ({
  id: PERSONAL_SEED.length + i + 1,
  emoji,
  date,
  description,
  amount,
  account,
  tags,
  list: 'viaje',
}));

export const SEED: DemoTx[] = [...PERSONAL_SEED, ...TRIP_SEED];

/** Saldo con el que el usuario de ejemplo llegó a abril (antes del historial):
 * con los movimientos de ejemplo, el balance neto arranca en $4.812.300, el
 * mismo del resto de la landing. Es solo de Personal: "Viaje a Cartagena" es
 * una lista nueva, sin saldo heredado (arranca en $0, como en la app real). */
export const OPENING_BALANCE = 4_812_300 + PERSONAL_SEED.reduce((s, t) => s + t.amount, 0);

export function openingBalanceFor(list: ListId): number {
  return list === 'viaje' ? 0 : OPENING_BALANCE;
}

/** Presupuesto por categoría (`budgetByCategory`, por emoji) y mensual: solo de
 * Personal — una lista nueva como "Viaje a Cartagena" todavía no tiene
 * presupuestos propios (`budgetsForList`), igual que en la app real. */
export const BUDGETS: Record<string, number> = {
  '🍔': 600_000,
  '🚗': 300_000,
  '🎮': 120_000,
};
export const MONTHLY_BUDGET = 2_000_000;
export function budgetsForList(list: ListId): Record<string, number> {
  return list === 'viaje' ? {} : BUDGETS;
}

/** Métodos de pago por defecto (`DEFAULT_PAYMENT_METHODS`). */
export const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', type: 'cash' },
  { id: 'savings', name: 'Ahorros', type: 'savings' },
  { id: 'credit', name: 'Tarjeta', type: 'debit' },
] as const;

/** Frases sugeridas para dictar (verificadas contra el parser). */
export const SUGGESTED_PHRASES = [
  'gasté 45 mil en almuerzo hoy',
  'recibí el sueldo de 2 millones 400 mil',
  'gasté 12 mil en uber y 8 mil en un tinto',
  'pagué 89.900 de internet',
];
