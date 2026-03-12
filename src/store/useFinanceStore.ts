import { create } from "zustand";
import {
  insertTransaction,
  deleteTransaction as dbDeleteTransaction,
  getAllTransactions,
  type TransactionRow,
} from "@/src/db/db";

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
  deleteTransaction: (id: number) => Promise<void>;

  getTotalBalance: () => number;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  isLoading: true,

  loadTransactions: async () => {
    set({ isLoading: true });
    const transactions = await getAllTransactions();
    set({ transactions, isLoading: false });
  },

  addTransaction: async (amount, description, categoryEmoji, tags = [], date?, paymentMethod = "cash") => {
    const newTx = await insertTransaction(amount, description, categoryEmoji, tags, date, paymentMethod);
    set((state) => ({
      transactions: [newTx, ...state.transactions],
    }));
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
