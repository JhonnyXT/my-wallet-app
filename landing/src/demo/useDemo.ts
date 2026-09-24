'use client';

import { useReducer } from 'react';
import { BANK_NOTIFS } from '@/content/app';
import { processMultiVoiceInput } from './app/voiceParser';
import {
  BUDGETS,
  MONTHLY_BUDGET,
  OPENING_BALANCE,
  SEED,
  TODAY,
  USER_CATEGORIES,
  categoryName,
  guessCategoryEmoji,
  localISOString,
  type DemoTx,
} from './data';

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export type Screen = 'home' | 'form' | 'voice' | 'batch' | 'notifReview' | 'reports';
export type Source = 'manual' | 'voice' | 'bank';

export type PeriodFilter =
  | { type: 'quick'; label: string }
  | { type: 'month'; year: number; month: number }
  | { type: 'year'; year: number }
  | { type: 'all' };

/** `useExpenseStore` + los parámetros de `/active-expense` (`editId`, `from`, `notifId`). */
export type Form = {
  mode: 'new' | 'notif';
  notifId?: string;
  source: Source;
  isExpense: boolean;
  amount: number;
  emoji: string;
  note: string;
  /** null = hoy */
  date: string | null;
  account: string;
  tags: string[];
};

/** Ítem de `voice-batch-review.tsx` / `notification-review.tsx`. */
export type ReviewItem = { id: string; amount: number; description: string; emoji: string; isExpense: boolean; date: string };

export type Overlay = { kind: 'menu' } | { kind: 'confirmDiscard' };

export type Heard = { emoji: string; amount: number; isExpense: boolean; today: boolean };

/** Lo que acaba de pasar: el panel lateral lo narra. */
export type DemoEvent =
  | { kind: 'intro' }
  | { kind: 'filterType'; type: 'expense' | 'income' }
  | { kind: 'filterCategory'; emoji: string }
  | { kind: 'deleted'; tx: DemoTx; from: number; to: number }
  | { kind: 'addOpen'; isExpense: boolean }
  | { kind: 'saved'; source: Source; txs: DemoTx[]; from: number; to: number }
  | { kind: 'voiceOpen' }
  | { kind: 'voiceHeard'; quote: string; heard: Heard[] }
  | { kind: 'voiceEmpty'; quote: string }
  | { kind: 'bank'; index: number }
  | { kind: 'averages' };

export type State = {
  stack: Screen[];
  txs: DemoTx[];
  nextId: number;
  period: PeriodFilter;
  typeFilter: 'expense' | 'income' | null;
  categoryFilter: { emoji: string; name: string } | null;
  budgets: Record<string, number>;
  monthlyBudget: number;
  form: Form;
  batch: ReviewItem[];
  /** Cola de `useNotificationStore` (transacciones detectadas sin confirmar). */
  pending: (ReviewItem & { bankIndex: number })[];
  /** Aviso de MyWallet que se ve encima de la pantalla. */
  banner: { id: string; index: number } | null;
  bankCursor: number;
  overlay: Overlay | null;
  /** Frase que el panel lateral manda a la pantalla de voz para "dictarla". */
  dictation: { text: string; n: number } | null;
  event: DemoEvent;
  lastDeleted: { tx: DemoTx; index: number } | null;
  /** Sube cada vez que se abre un formulario nuevo: remonta la pantalla. */
  formN: number;
};

type Action =
  | { type: 'push'; screen: Screen }
  | { type: 'back' }
  | { type: 'home' }
  | { type: 'overlay'; overlay: Overlay | null }
  | { type: 'toggleType'; filter: 'expense' | 'income' }
  | { type: 'categoryFilter'; emoji: string }
  | { type: 'clearCategoryFilter' }
  | { type: 'delete'; id: number }
  | { type: 'restore' }
  | { type: 'newForm'; isExpense: boolean; emoji?: string }
  | { type: 'form'; patch: Partial<Form> }
  | { type: 'saveForm' }
  | { type: 'openVoice' }
  | { type: 'dictate'; text: string }
  | { type: 'voiceResult'; quote: string }
  | { type: 'removeBatch'; id: string }
  | { type: 'saveBatch' }
  | { type: 'simulateBank' }
  | { type: 'openBanner' }
  | { type: 'dismissBanner' }
  | { type: 'openNotifReview' }
  | { type: 'removePending'; id: string }
  | { type: 'discardPending' }
  | { type: 'savePending' }
  | { type: 'openReports' }
  | { type: 'reset' };

// ─── Selectores (la misma lógica que los hooks del dashboard) ──────────────────

export const top = (s: State) => s.stack[s.stack.length - 1];

export const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** `periodFilterLabel()` de `src/utils/periodFilter.ts`. */
export function periodLabel(f: PeriodFilter): string {
  switch (f.type) {
    case 'quick':
      return f.label;
    case 'month':
      return `${MONTH_ABBR[f.month - 1]} ${f.year}`;
    case 'year':
      return `${f.year}`;
    case 'all':
      return 'Todo';
  }
}

/** `applyPeriodFilter()`, con "hoy" = `TODAY`. */
export function applyPeriod(txs: DemoTx[], f: PeriodFilter): DemoTx[] {
  const now = TODAY;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const inRange = (s: Date, e: Date) => txs.filter((t) => new Date(t.date) >= s && new Date(t.date) <= e);
  switch (f.type) {
    case 'all':
      return txs;
    case 'year':
      return inRange(new Date(f.year, 0, 1), new Date(f.year, 11, 31, 23, 59, 59));
    case 'month':
      return inRange(new Date(f.year, f.month - 1, 1), new Date(f.year, f.month, 0, 23, 59, 59));
    case 'quick':
      switch (f.label) {
        case 'Hoy':
          return txs.filter((t) => new Date(t.date) >= todayStart);
        case 'Esta semana':
          return txs.filter((t) => new Date(t.date) >= weekStart);
        case 'Esta quincena': {
          const y = now.getFullYear();
          const m = now.getMonth();
          return now.getDate() <= 15
            ? inRange(new Date(y, m, 1), new Date(y, m, 15, 23, 59, 59))
            : inRange(new Date(y, m, 16), new Date(y, m + 1, 0, 23, 59, 59));
        }
        case 'Este mes':
          return txs.filter((t) => new Date(t.date) >= monthStart);
        case 'Este año':
          return txs.filter((t) => new Date(t.date) >= yearStart);
        default:
          return txs;
      }
  }
}

export function isCurrentPeriod(f: PeriodFilter): boolean {
  if (f.type === 'quick') return true;
  if (f.type === 'all') return false;
  if (f.type === 'year') return f.year === TODAY.getFullYear();
  return f.year === TODAY.getFullYear() && f.month === TODAY.getMonth() + 1;
}

export const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const allTimeBalance = (txs: DemoTx[]) => OPENING_BALANCE - txs.reduce((s, t) => s + t.amount, 0);

/** Gasto del mes actual por emoji (presupuestos del panel lateral y notificaciones). */
export function monthSpentBy(txs: DemoTx[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of applyPeriod(txs, { type: 'quick', label: 'Este mes' })) if (t.amount > 0) out[t.emoji] = (out[t.emoji] ?? 0) + t.amount;
  return out;
}

export function monthTotals(txs: DemoTx[]) {
  const month = applyPeriod(txs, { type: 'quick', label: 'Este mes' });
  return {
    expense: month.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    income: month.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0),
    count: month.length,
  };
}

/** `queryCategoryMonthlyAverages()`: total por categoría entre los meses con
 * al menos un movimiento de cualquier categoría. */
export function categoryAverages(txs: DemoTx[], type: 'expense' | 'income') {
  const months = Math.max(new Set(txs.map((t) => t.date.slice(0, 7))).size, 1);
  const totals: Record<string, number> = {};
  for (const t of txs) {
    if (type === 'expense' ? t.amount <= 0 : t.amount >= 0) continue;
    totals[t.emoji] = (totals[t.emoji] ?? 0) + Math.abs(t.amount);
  }
  const items = Object.entries(totals)
    .map(([emoji, total]) => ({ emoji, avgMonthly: total / months }))
    .sort((a, b) => b.avgMonthly - a.avgMonthly);
  return { months, items };
}

/** `queryMonthlyTotalsInRange()` para los últimos 6 meses (rango por defecto de Tendencia). */
export function monthlyTotals(txs: DemoTx[], type: 'expense' | 'income') {
  const out: { year: number; month: number; total: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(TODAY.getFullYear(), TODAY.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const total = txs
      .filter((t) => t.date.startsWith(key) && (type === 'expense' ? t.amount > 0 : t.amount < 0))
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1, total });
  }
  return out;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const emptyForm = (isExpense = true): Form => ({
  mode: 'new',
  source: 'manual',
  isExpense,
  amount: 0,
  emoji: '🍔',
  note: '',
  date: null,
  account: 'cash',
  tags: [],
});

const initial = (): State => ({
  stack: ['home'],
  txs: SEED,
  nextId: 1000,
  period: { type: 'quick', label: 'Este mes' },
  typeFilter: null,
  categoryFilter: null,
  budgets: BUDGETS,
  monthlyBudget: MONTHLY_BUDGET,
  form: emptyForm(),
  batch: [],
  pending: [],
  banner: null,
  bankCursor: 0,
  overlay: null,
  dictation: null,
  event: { kind: 'intro' },
  lastDeleted: null,
  formN: 0,
});

const nowISO = () => localISOString(new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), new Date().getHours(), new Date().getMinutes()));

function goHome(state: State, txs: DemoTx[], fresh: DemoTx[], source: Source): State {
  return {
    ...state,
    txs,
    stack: ['home'],
    overlay: null,
    event: fresh.length ? { kind: 'saved', source, txs: fresh, from: allTimeBalance(state.txs), to: allTimeBalance(txs) } : { kind: 'intro' },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'push':
      return { ...state, stack: [...state.stack, action.screen], overlay: null };

    // Botón atrás de Android: cierra primero lo que esté encima.
    case 'back': {
      if (state.overlay) return { ...state, overlay: null };
      const screen = top(state);
      if (screen === 'home') {
        if (state.categoryFilter) return { ...state, categoryFilter: null, event: { kind: 'intro' } };
        return state;
      }
      const stack = state.stack.slice(0, -1);
      return { ...state, stack, batch: screen === 'batch' ? [] : state.batch, event: stack.length === 1 ? { kind: 'intro' } : state.event };
    }
    case 'home':
      return { ...state, stack: ['home'], overlay: null, batch: [] };
    case 'overlay':
      return { ...state, overlay: action.overlay };

    case 'toggleType': {
      const on = state.typeFilter === action.filter;
      return { ...state, typeFilter: on ? null : action.filter, event: on ? { kind: 'intro' } : { kind: 'filterType', type: action.filter } };
    }
    case 'categoryFilter':
      return { ...state, categoryFilter: { emoji: action.emoji, name: categoryName(action.emoji) }, event: { kind: 'filterCategory', emoji: action.emoji } };
    case 'clearCategoryFilter':
      return { ...state, categoryFilter: null, event: { kind: 'intro' } };
    case 'delete': {
      const index = state.txs.findIndex((t) => t.id === action.id);
      if (index < 0) return state;
      const tx = state.txs[index];
      const txs = state.txs.filter((t) => t.id !== action.id);
      return {
        ...state,
        txs,
        overlay: null,
        lastDeleted: { tx, index },
        event: { kind: 'deleted', tx, from: allTimeBalance(state.txs), to: allTimeBalance(txs) },
      };
    }
    case 'restore': {
      if (!state.lastDeleted) return state;
      const { tx, index } = state.lastDeleted;
      return { ...state, txs: [...state.txs.slice(0, index), tx, ...state.txs.slice(index)], lastDeleted: null, event: { kind: 'intro' } };
    }

    case 'newForm':
      return {
        ...state,
        form: { ...emptyForm(action.isExpense), ...(action.emoji ? { emoji: action.emoji } : {}) },
        stack: [...state.stack.filter((s) => s !== 'form'), 'form'],
        overlay: null,
        event: { kind: 'addOpen', isExpense: action.isExpense },
      };
    case 'form':
      return { ...state, form: { ...state.form, ...action.patch } };
    case 'saveForm': {
      const f = state.form;
      if (f.amount <= 0) return state;
      const date = f.date ?? nowISO();
      const signed = f.isExpense ? f.amount : -f.amount;
      const description = f.note.trim() || (f.isExpense ? 'Gasto' : 'Ingreso');
      const tx: DemoTx = { id: state.nextId, emoji: f.emoji, amount: signed, description, date, account: f.account, tags: f.tags };
      const txs = [tx, ...state.txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
      // `notification-detect`: al guardar, el ítem sale de la cola.
      const pending = f.notifId ? state.pending.filter((p) => p.id !== f.notifId) : state.pending;
      return { ...goHome(state, txs, [tx], f.source), nextId: state.nextId + 1, pending };
    }

    case 'openVoice':
      return { ...state, stack: [...state.stack, 'voice'], overlay: null, dictation: null, event: { kind: 'voiceOpen' } };
    case 'dictate':
      return { ...state, dictation: { text: action.text, n: (state.dictation?.n ?? 0) + 1 } };
    case 'voiceResult': {
      const quote = action.quote.trim();
      if (!quote) return state;
      const r = processMultiVoiceInput(quote, USER_CATEGORIES);
      const results = r.multiple ? r.transactions : [r.single];
      const valid = results.filter((x) => (x.amount ?? 0) > 0);
      if (valid.length === 0) {
        // Sin monto la app igual abre el formulario (en $ 0); la demo avisa al lado.
        return {
          ...state,
          form: { ...emptyForm(r.multiple ? true : (r.single.isExpense ?? true)), source: 'voice', note: r.multiple ? quote : (r.single.note ?? '') },
          stack: [...state.stack.slice(0, -1), 'form'],
          dictation: null,
          event: { kind: 'voiceEmpty', quote },
        };
      }
      const heard: Heard[] = valid.map((x) => ({
        emoji: x.categoryEmoji ?? '🍔',
        amount: x.amount ?? 0,
        isExpense: x.isExpense ?? true,
        today: x._dateDetected && x.date === 'today',
      }));
      const event: DemoEvent = { kind: 'voiceHeard', quote, heard };
      if (!r.multiple) {
        // `setFromVoice(result.single)` sobre el estado recién reiniciado → `/active-expense`.
        const s = r.single;
        return {
          ...state,
          form: {
            ...emptyForm(s.isExpense ?? true),
            source: 'voice',
            amount: s.amount ?? 0,
            emoji: s.categoryEmoji ?? '🍔',
            note: s.note ?? '',
            date: s.date === 'custom' && s.customDate ? localISOString(s.customDate) : null,
          },
          stack: [...state.stack.slice(0, -1), 'form'],
          dictation: null,
          event,
        };
      }
      const batch: ReviewItem[] = r.transactions.map((x, i) => ({
        id: `v${state.nextId}-${i}`,
        amount: x.amount ?? 0,
        description: x.note || x.categoryName || 'Sin descripción',
        emoji: x.categoryEmoji ?? '🍔',
        isExpense: x.isExpense ?? true,
        date: nowISO(),
      }));
      return { ...state, batch, nextId: state.nextId + 1, stack: [...state.stack.slice(0, -1), 'batch'], dictation: null, event };
    }
    case 'removeBatch':
      return { ...state, batch: state.batch.filter((b) => b.id !== action.id) };
    case 'saveBatch': {
      if (state.batch.length === 0) return state;
      const fresh = state.batch.map((b, i) => ({
        id: state.nextId + i,
        emoji: b.emoji,
        amount: b.isExpense ? b.amount : -b.amount,
        description: b.description,
        date: b.date,
        account: 'cash',
        tags: [],
      }));
      const txs = [...fresh, ...state.txs];
      return { ...goHome(state, txs, fresh, 'voice'), batch: [], nextId: state.nextId + fresh.length };
    }

    case 'simulateBank': {
      const index = state.bankCursor;
      const n = BANK_NOTIFS[index];
      const base = { ...state, bankCursor: (index + 1) % BANK_NOTIFS.length, event: { kind: 'bank', index } as DemoEvent };
      if (!n.detected) return { ...base, banner: null };
      const id = `n${state.nextId}`;
      const isExpense = !n.detected.income;
      const item = {
        id,
        bankIndex: index,
        amount: n.detected.amount,
        description: n.detected.title,
        emoji: guessCategoryEmoji(n.text, isExpense),
        isExpense,
        date: nowISO(),
      };
      return { ...base, nextId: state.nextId + 1, pending: [...state.pending, item], banner: { id, index } };
    }
    case 'openBanner': {
      if (!state.banner) return state;
      const item = state.pending.find((p) => p.id === state.banner!.id);
      // Con 2+ pendientes (o si ya no existe) abre la revisión; con uno, el formulario lleno.
      if (!item || state.pending.length > 1) return { ...state, banner: null, stack: ['home', 'notifReview'], overlay: null };
      return {
        ...state,
        banner: null,
        overlay: null,
        form: { ...emptyForm(item.isExpense), source: 'bank', notifId: item.id, amount: item.amount, emoji: item.emoji, note: item.description, date: item.date, account: 'savings' },
        stack: ['home', 'form'],
        event: { kind: 'bank', index: item.bankIndex },
      };
    }
    case 'dismissBanner':
      return { ...state, banner: null };
    case 'openNotifReview':
      return { ...state, stack: [...state.stack, 'notifReview'], overlay: null };
    case 'removePending': {
      const pending = state.pending.filter((p) => p.id !== action.id);
      return pending.length === 0 ? { ...state, pending, stack: ['home'] } : { ...state, pending };
    }
    case 'discardPending':
      return { ...state, pending: [], overlay: null, stack: ['home'] };
    case 'savePending': {
      if (state.pending.length === 0) return state;
      const fresh = state.pending.map((p, i) => ({
        id: state.nextId + i,
        emoji: p.emoji,
        amount: p.isExpense ? p.amount : -p.amount,
        description: p.description,
        date: p.date,
        account: 'savings',
        tags: [],
      }));
      const txs = [...fresh, ...state.txs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      return { ...goHome(state, txs, fresh, 'bank'), pending: [], nextId: state.nextId + fresh.length };
    }

    case 'openReports':
      return { ...state, stack: [...state.stack.filter((s) => s !== 'reports'), 'reports'], overlay: null, event: { kind: 'averages' } };
    case 'reset':
      return initial();
  }
}

function withFormKey(state: State, action: Action): State {
  const next = reducer(state, action);
  return next.form !== state.form && action.type !== 'form' ? { ...next, formN: state.formN + 1 } : next;
}

export function useDemo() {
  const [state, dispatch] = useReducer(withFormKey, undefined, initial);
  return { state, dispatch };
}

export type DemoApi = ReturnType<typeof useDemo>;
