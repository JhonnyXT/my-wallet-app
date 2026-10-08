import type { StateCreator } from "zustand";
import { localISOString } from "@/src/db/db";
import { newId } from "@/src/utils/ids";
import { addTombstone, type TombstonesSlice } from "./tombstonesSlice";

/** Cadencias soportadas en esta fase — las que `expo-notifications` dispara nativamente. */
export type RecurringCadence =
  | { type: "weekly"; weekday: number } // 0=domingo … 6=sábado
  | { type: "monthly"; day: number }; // 1–31, acotado al mes real (igual que Debt.dueDay)

export interface RecurringExpense {
  id: string;
  name: string;
  emoji: string;
  /** Siempre positivo — igual convención que `ParsedTransaction`. */
  amount: number;
  isExpense: boolean;
  categoryEmoji: string;
  paymentMethod: string;
  /** Lista donde se registra al confirmar — fija desde la creación, no la lista activa del momento. */
  listId: string;
  cadence: RecurringCadence;
  /** true → confirmar siempre abre el formulario editable, nunca inserta directo con un toque. */
  amountVaries: boolean;
  /** false = pausado: no notifica ni aparece en la cola de vencidos. */
  active: boolean;
  /** Última clave de ciclo confirmada U omitida (idempotencia) — null = nunca se manejó ninguna. */
  lastHandledCycleKey: string | null;
  createdAt: string;
  /** Última edición, epoch ms (versión para la sync). */
  updatedAt: number;
}

export type NewRecurring = Omit<
  RecurringExpense,
  "id" | "createdAt" | "updatedAt" | "active" | "lastHandledCycleKey"
>;

export interface RecurringSlice {
  recurringExpenses: RecurringExpense[];

  addRecurring: (recurring: NewRecurring) => RecurringExpense;
  /** Edita los datos del recurrente — no toca `active` ni `lastHandledCycleKey`. */
  editRecurring: (
    id: string,
    updates: Partial<
      Pick<
        RecurringExpense,
        | "name"
        | "emoji"
        | "amount"
        | "isExpense"
        | "categoryEmoji"
        | "paymentMethod"
        | "listId"
        | "cadence"
        | "amountVaries"
      >
    >,
  ) => void;
  pauseRecurring: (id: string) => void;
  resumeRecurring: (id: string) => void;
  removeRecurring: (id: string) => void;
  /** Marca un ciclo como manejado (confirmado u omitido) — evita que vuelva a aparecer en la cola. */
  markHandled: (id: string, cycleKey: string) => void;
}

export const createRecurringSlice: StateCreator<
  RecurringSlice & TombstonesSlice,
  [],
  [],
  RecurringSlice
> = (set) => ({
  recurringExpenses: [],

  addRecurring: (recurring) => {
    const newRecurring: RecurringExpense = {
      ...recurring,
      id: newId(),
      active: true,
      lastHandledCycleKey: null,
      createdAt: localISOString(),
      updatedAt: Date.now(),
    };
    set((s) => ({ recurringExpenses: [...s.recurringExpenses, newRecurring] }));
    return newRecurring;
  },

  editRecurring: (id, updates) =>
    set((s) => ({
      recurringExpenses: s.recurringExpenses.map((r) =>
        r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r,
      ),
    })),

  pauseRecurring: (id) =>
    set((s) => ({
      recurringExpenses: s.recurringExpenses.map((r) =>
        r.id === id ? { ...r, active: false, updatedAt: Date.now() } : r,
      ),
    })),

  resumeRecurring: (id) =>
    set((s) => ({
      recurringExpenses: s.recurringExpenses.map((r) =>
        r.id === id ? { ...r, active: true, updatedAt: Date.now() } : r,
      ),
    })),

  removeRecurring: (id) =>
    set((s) => ({
      recurringExpenses: s.recurringExpenses.filter((r) => r.id !== id),
      tombstones: addTombstone(s.tombstones, "recurringExpenses", id, Date.now()),
    })),

  markHandled: (id, cycleKey) =>
    set((s) => ({
      recurringExpenses: s.recurringExpenses.map((r) =>
        r.id === id ? { ...r, lastHandledCycleKey: cycleKey, updatedAt: Date.now() } : r,
      ),
    })),
});
