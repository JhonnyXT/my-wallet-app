import { create } from "zustand";
import {
  insertTransaction,
  deleteTransaction as dbDeleteTransaction,
  getAllTransactions,
  type TransactionRow,
} from "@/src/db/db";

const MONTHLY_BUDGET_LIMIT = 3000;

interface FinanceState {
  transactions: TransactionRow[];
  isLoading: boolean;
  budgetLimit: number;

  loadTransactions: () => Promise<void>;
  addTransaction: (
    amount: number,
    description: string,
    categoryEmoji: string,
    tags?: string[]
  ) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;

  getTotalBalance: () => number;
  getBudgetPercentage: () => number;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  transactions: [],
  isLoading: true,
  budgetLimit: MONTHLY_BUDGET_LIMIT,

  loadTransactions: async () => {
    set({ isLoading: true });
    const transactions = await getAllTransactions();
    set({ transactions, isLoading: false });
  },

  addTransaction: async (amount, description, categoryEmoji, tags = []) => {
    const newTx = await insertTransaction(amount, description, categoryEmoji, tags);
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

  getBudgetPercentage: () => {
    const total = get().getTotalBalance();
    const limit = get().budgetLimit;
    if (limit <= 0) return 0;
    return Math.min(Math.round((total / limit) * 100), 100);
  },
}));
