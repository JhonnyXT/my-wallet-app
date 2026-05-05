import { create } from "zustand";
import {
  insertTransaction,
  insertTransactionBatch,
  deleteTransaction as dbDeleteTransaction,
  getAllTransactions,
  type TransactionRow,
} from "@/src/db/db";

export interface BatchTransactionItem {
  amount: number;
  description: string;
  categoryEmoji: string;
  tags?: string[];
  date?: Date;
  paymentMethod?: string;
}

interface FinanceState {
  transactions: TransactionRow[];
  isLoading: boolean;

  loadTransactions: () => Promise<void>;
  addTransaction: (
    amount: number,
    description: string,
    categoryEmoji: string,
    tags?: string[],
    date?: Date,
    paymentMethod?: string,
  ) => Promise<void>;
  /** Inserta múltiples transacciones en lote y retorna sus IDs para permitir "Deshacer todo" */
  addTransactionBatch: (items: BatchTransactionItem[]) => Promise<number[]>;
  deleteTransaction: (id: number) => Promise<void>;

  getTotalBalance: () => number;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  isLoading: true,

  loadTransactions: async () => {
    set({ isLoading: true });
    try {
      const transactions = await getAllTransactions();
      set({ transactions });
    } catch (e) {
      console.error("[useFinanceStore] Error al cargar transacciones:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (amount, description, categoryEmoji, tags = [], date?, paymentMethod = "cash") => {
    const newTx = await insertTransaction(amount, description, categoryEmoji, tags, date, paymentMethod);
    set((state) => ({
      transactions: [newTx, ...state.transactions],
    }));
  },

  addTransactionBatch: async (items) => {
    // Transacción SQLite atómica: si falla cualquier inserción, se hace rollback completo
    const inserted = await insertTransactionBatch(items);
    // Refresh en una sola operación para no disparar múltiples re-renders
    const all = await getAllTransactions();
    set({ transactions: all });
    return inserted.map((tx) => tx.id);
  },

  deleteTransaction: async (id) => {
    await dbDeleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  getTotalBalance: () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return get()
      .transactions.filter((t) => new Date(t.date) >= firstDay)
      .reduce((sum, t) => sum + t.amount, 0);
  },

}));
