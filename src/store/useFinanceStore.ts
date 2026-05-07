import { create } from "zustand";
import {
  insertTransaction,
  insertTransactionBatch,
  deleteTransaction as dbDeleteTransaction,
  getAllTransactions,
  type TransactionRow,
} from "@/src/db/db";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { checkAndNotifyBudget } from "@/src/services/notificationService";
import { getCategoryName } from "@/src/constants/theme";

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

// Calcula el gasto del mes actual para una categoría y dispara notificación si supera el presupuesto
async function notifyIfBudgetExceeded(
  transactions: TransactionRow[],
  categoryEmoji: string,
): Promise<void> {
  const { budgetByCategory, userCategories } = useSettingsStore.getState();
  const budget = budgetByCategory[categoryEmoji];
  if (!budget || budget <= 0) return;

  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const spent = transactions
    .filter((t) => t.category_emoji === categoryEmoji && t.amount > 0 && new Date(t.date) >= start)
    .reduce((s, t) => s + t.amount, 0);

  const name = getCategoryName(categoryEmoji, userCategories);
  await checkAndNotifyBudget(categoryEmoji, name, spent, budget);
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
    const updated = [newTx, ...get().transactions];
    set({ transactions: updated });
    // Solo verificar presupuesto en gastos (amount > 0)
    if (amount > 0) await notifyIfBudgetExceeded(updated, categoryEmoji);
  },

  addTransactionBatch: async (items) => {
    // Transacción SQLite atómica: si falla cualquier inserción, se hace rollback completo
    const inserted = await insertTransactionBatch(items);
    // Refresh en una sola operación para no disparar múltiples re-renders
    const all = await getAllTransactions();
    set({ transactions: all });
    // Verificar presupuesto para cada categoría de gasto del lote
    const expenseEmojis = [...new Set(items.filter((i) => i.amount > 0).map((i) => i.categoryEmoji))];
    for (const emoji of expenseEmojis) {
      await notifyIfBudgetExceeded(all, emoji);
    }
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
