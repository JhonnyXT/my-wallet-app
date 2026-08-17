import type { StateCreator } from "zustand";
import { localISOString } from "@/src/db/db";

export interface Debt {
  id: string;
  name: string;
  emoji: string;
  /** Monto original de la deuda al crearla (referencia, no cambia con los abonos). */
  totalAmount: number;
  /** Saldo pendiente — se reduce con cada abono hasta llegar a 0 (deuda liquidada). */
  remainingAmount: number;
  /** Cuota mínima mensual, solo informativa (no se descuenta sola). */
  monthlyPayment: number;
  /** Día del mes (1-31) del recordatorio de pago. */
  dueDay: number;
  createdAt: string;
}

export interface DebtsSlice {
  debts: Debt[];

  addDebt: (
    debt: Omit<Debt, "id" | "createdAt" | "remainingAmount"> & { remainingAmount?: number },
  ) => Debt;
  /** Actualiza el saldo pendiente (flujo "Pagar") — no toca los demás datos. */
  updateDebtBalance: (id: string, remaining: number) => void;
  /** Edita los datos de la deuda (nombre/emoji/monto total/cuota/día de pago) — no toca el saldo pendiente. */
  editDebt: (
    id: string,
    updates: Partial<Pick<Debt, "name" | "emoji" | "totalAmount" | "monthlyPayment" | "dueDay">>,
  ) => void;
  removeDebt: (id: string) => void;
}

export const createDebtsSlice: StateCreator<DebtsSlice, [], [], DebtsSlice> = (set) => ({
  debts: [],

  addDebt: (debt) => {
    const newDebt: Debt = {
      ...debt,
      remainingAmount: debt.remainingAmount ?? debt.totalAmount,
      id: Date.now().toString(),
      createdAt: localISOString(),
    };
    set((s) => ({ debts: [...s.debts, newDebt] }));
    return newDebt;
  },

  updateDebtBalance: (id, remaining) =>
    set((s) => ({
      debts: s.debts.map((d) =>
        d.id === id ? { ...d, remainingAmount: Math.max(0, remaining) } : d,
      ),
    })),

  editDebt: (id, updates) =>
    set((s) => ({ debts: s.debts.map((d) => (d.id === id ? { ...d, ...updates } : d)) })),

  removeDebt: (id) => set((s) => ({ debts: s.debts.filter((d) => d.id !== id) })),
});
