// Contenido que se muestra "dentro de la app" (teléfono, filas, notificaciones,
// frases de voz). La app solo existe en español y en pesos colombianos, así que
// esto NO se traduce: la versión en inglés del sitio muestra la app tal cual es.
//
// Las frases de voz y sus resultados salen de correr el parser real
// (`src/utils/voiceParser.ts` → `processMultiVoiceInput` con las categorías
// predefinidas). Si el parser cambia, volver a verificarlas.

export type Tx = {
  emoji: string;
  category: string;
  date: string;
  title: string;
  amount: number;
  income?: boolean;
  /** Fondo del círculo del emoji: `colorBg` de la categoría en `categoryPresets.ts`. */
  tint: string;
};

/** Formato COP de la app: separador de miles con punto, sin decimales. */
export function cop(n: number): string {
  return `$ ${Math.round(Math.abs(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export const CATEGORY = {
  food: { emoji: '🍔', name: 'Comida', tint: '#FFE8D6', accent: '#D2601A' },
  transport: { emoji: '🚗', name: 'Transporte', tint: '#D6EFFF', accent: '#1565C0' },
  home: { emoji: '🏠', name: 'Hogar', tint: '#FEF3C7', accent: '#D97706' },
  coffee: { emoji: '☕', name: 'Café', tint: '#FFE8D6', accent: '#92400E' },
  fun: { emoji: '🎮', name: 'Entretenimiento', tint: '#EDE9FE', accent: '#6D28D9' },
  shopping: { emoji: '🛍️', name: 'Compras', tint: '#FEE2E2', accent: '#C2185B' },
  otherIncome: { emoji: '💸', name: 'Ingreso', tint: '#CCFBF1', accent: '#0D9488' },
  salary: { emoji: '💼', name: 'Salario', tint: '#DBEAFE', accent: '#1D4ED8' },
  subs: { emoji: '📱', name: 'Suscripciones', tint: '#E0E7FF', accent: '#4338CA' },
} as const;

const tx = (c: keyof typeof CATEGORY, date: string, title: string, amount: number, income = false): Tx => ({
  emoji: CATEGORY[c].emoji,
  category: CATEGORY[c].name,
  tint: CATEGORY[c].tint,
  date,
  title,
  amount,
  income,
});

/** Lista "RECIENTE" del teléfono de la portada. */
export const RECENT: Tx[] = [
  tx('food', 'Hoy', 'Almuerzo', 45000),
  tx('transport', 'Hoy', 'Uber al trabajo', 12000),
  tx('salary', 'Ayer', 'Quincena', 2400000, true),
  tx('coffee', 'Ayer', 'Tinto', 8000),
  tx('home', '21 sep', 'Internet', 89900),
];

export const PHONE = {
  balance: 4_812_300,
  expense: 1_386_400,
  income: 4_800_000,
  budgetPct: 68,
  budget: 2_000_000,
  netWorth: 2_612_300,
};

/** Columnas de la gráfica de categorías (gasto del mes). */
export const CHART: { key: keyof typeof CATEGORY; amount: number }[] = [
  { key: 'food', amount: 486000 },
  { key: 'home', amount: 412000 },
  { key: 'transport', amount: 238000 },
  { key: 'fun', amount: 131000 },
  { key: 'coffee', amount: 64000 },
  { key: 'subs', amount: 55400 },
];

/** Una fila por forma de registrar (sección "Registro"). */
export const WAY_ROWS = {
  manual: tx('shopping', 'Hoy', 'Tenis para correr', 280000),
  voice: tx('food', 'Hoy', 'Gasté $45.000 en almuerzo hoy', 45000),
  batch: tx('coffee', 'Hoy', 'Y $8.000 en un tinto', 8000),
  quick: tx('transport', 'Hoy', 'Uber 15000', 15000),
  bank: tx('otherIncome', 'Hoy', 'Recibiste de Juan Pérez · $ 80.000', 80000, true),
} satisfies Record<string, Tx>;

export type VoiceResult = { income: boolean; amount: number; category: keyof typeof CATEGORY; today?: boolean };

export const VOICE_EXAMPLES: { quote: string; results: VoiceResult[] }[] = [
  { quote: 'gasté 45 mil en almuerzo hoy', results: [{ income: false, amount: 45000, category: 'food', today: true }] },
  { quote: 'recibí el sueldo de 2 millones 400 mil', results: [{ income: true, amount: 2400000, category: 'salary' }] },
  {
    quote: 'gasté 12 mil en uber y 8 mil en un tinto',
    results: [
      { income: false, amount: 12000, category: 'transport' },
      { income: false, amount: 8000, category: 'coffee' },
    ],
  },
  { quote: 'pagué 89.900 de internet', results: [{ income: false, amount: 89900, category: 'home' }] },
];

/** Notificaciones bancarias de ejemplo (sección "Bancos"): los casos de
 * `src/utils/notificationParser/fixtures.ts`, con lo que devuelve el pipeline
 * real (`parseNotification` → `shortenDescription` → `guessCategoryEmoji`).
 * `detected: null` = el parser la descarta (recordatorio de pago). */
export const BANK_NOTIFS: { bank: string; color: string; time: string; title: string; text: string; detected: Tx | null }[] = [
  {
    bank: 'Nequi',
    color: '#DA0081',
    time: 'ahora',
    title: 'Te enviaron plata',
    text: 'Te enviaron $80.000 de Juan Pérez',
    detected: tx('otherIncome', 'Hoy', 'Recibiste de Juan Pérez · $ 80.000', 80000, true),
  },
  {
    bank: 'Bancolombia',
    color: '#FDDA24',
    time: '9:41',
    title: 'Bancolombia te informa',
    text: 'Bancolombia le informa Compra por $45.000 en RAPPI CO.',
    detected: tx('shopping', 'Hoy', 'Compra en RAPPI CO · $ 45.000', 45000),
  },
  {
    bank: 'Davivienda',
    color: '#ED1C27',
    time: '8:15',
    title: 'Davivienda',
    text: 'Su tarjeta debito realizo una compra Comercio: NETFLIX $38.900',
    detected: tx('shopping', 'Hoy', 'Compra en NETFLIX · $ 38.900', 38900),
  },
  {
    bank: 'Nu',
    color: '#820AD1',
    time: '7:02',
    title: 'Tienes un pago por $43.900,00...',
    text: 'Completa tu pago de forma fácil y segura en tu app Nu.',
    detected: null,
  },
];

/** Apps de `src/constants/banks.ts` (KNOWN_BANKS), en el mismo orden. */
export const BANKS = [
  'Google Wallet',
  'Bancolombia',
  'Nequi',
  'Davivienda',
  'DaviPlata',
  'BBVA',
  'Bco. Occidente',
  'Bco. Popular',
  'AV Villas',
  'Nu',
  'Lulo Bank',
  'Scotiabank Colpatria',
  'Rappi',
  'Tpaga',
  'Bco. Bogotá',
  'Itaú',
];

/** Promedio mensual por categoría (pantalla "Promedios"). */
export const AVERAGES: { key: keyof typeof CATEGORY; avg: number }[] = [
  { key: 'food', avg: 512000 },
  { key: 'home', avg: 398000 },
  { key: 'transport', avg: 221000 },
  { key: 'fun', avg: 118000 },
  { key: 'subs', avg: 55400 },
];

/** Totales mensuales para el gráfico de tendencia (6 meses). */
export const TREND: { month: string; expense: number }[] = [
  { month: 'abr', expense: 1_620_000 },
  { month: 'may', expense: 1_480_000 },
  { month: 'jun', expense: 1_910_000 },
  { month: 'jul', expense: 1_540_000 },
  { month: 'ago', expense: 1_350_000 },
  { month: 'sep', expense: 1_386_400 },
];

export const BUDGETS: { key: keyof typeof CATEGORY; spent: number; limit: number }[] = [
  { key: 'food', spent: 486000, limit: 600000 },
  { key: 'transport', spent: 238000, limit: 300000 },
  { key: 'fun', spent: 131000, limit: 120000 },
];

export const GOAL = { emoji: '✈️', name: 'Viaje a Cartagena', saved: 1_860_000, target: 3_000_000 };
export const DEBT = { emoji: '💳', name: 'Tarjeta de crédito', total: 2_400_000, remaining: 2_200_000, monthly: 200_000, dueDay: 15 };

/** Texto real de la alerta de presupuesto (`checkBudgetAlert` en notificationService.ts). */
export const BUDGET_ALERT = { title: 'Alerta de presupuesto', body: 'Llevas el 81% de tu presupuesto en "Comida".' };
