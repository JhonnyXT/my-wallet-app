import { create } from "zustand";
import {
  insertTransaction,
  insertTransactionBatch,
  updateTransaction as dbUpdateTransaction,
  deleteTransaction as dbDeleteTransaction,
  getAllTransactions,
  deleteTransactionsOfList,
  setActiveListId,
  SELF_PAYER,
  type TransactionRow,
} from "@/src/db/db";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { useSettingsStore, waitForSettingsHydration } from "@/src/store/useSettingsStore";
import { checkAndNotifyBudget } from "@/src/services/notificationService";
import { getCategoryName } from "@/src/constants/theme";
import { budgetCycle, filterByRange } from "@/src/utils/periodCycles";

export interface BatchTransactionItem {
  amount: number;
  description: string;
  categoryEmoji: string;
  tags?: string[];
  date?: Date;
  paymentMethod?: string;
  paidBy?: string;
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
    /** Lista destino; por defecto la activa. */
    listId?: string,
    /** Quién pagó: SELF_PAYER ("") = tú; si no, id de un miembro de la lista. */
    paidBy?: string,
  ) => Promise<void>;
  /** Inserta múltiples transacciones en lote y retorna sus IDs para permitir "Deshacer todo" */
  addTransactionBatch: (items: BatchTransactionItem[]) => Promise<number[]>;
  updateTransaction: (
    id: number,
    amount: number,
    description: string,
    categoryEmoji: string,
    tags?: string[],
    date?: Date,
    paymentMethod?: string,
    /** Lista destino (mover el movimiento a otra lista); por defecto la activa. */
    listId?: string,
    paidBy?: string,
  ) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  /** Activa otra lista y recarga sus transacciones. */
  switchList: (id: string) => Promise<void>;
  /** Borra la lista y todas sus transacciones (Personal no se puede borrar). */
  deleteList: (id: string) => Promise<void>;

  getTotalBalance: () => number;
}

// Mismo criterio que LIST_SCOPE_SQL: Personal ve lo suyo y lo que pagaste tú en otras listas;
// otra lista, todo lo suyo.
function isVisibleInActiveList(tx: TransactionRow): boolean {
  const active = useSettingsStore.getState().activeListId;
  if (active === DEFAULT_LIST_ID) return tx.paid_by === SELF_PAYER;
  return tx.list_id === active;
}

// Calcula el gasto del ciclo de presupuesto actual para una categoría y dispara notificación si supera el presupuesto
async function notifyIfBudgetExceeded(
  transactions: TransactionRow[],
  categoryEmoji: string,
  /** Lista donde quedó el movimiento: solo se revisa si es la activa (sus presupuestos). */
  listId: string,
): Promise<void> {
  const { budgetByCategory, userCategories, activeListId, defaultPeriod } =
    useSettingsStore.getState();
  if (listId !== activeListId) return;
  const budget = budgetByCategory[categoryEmoji];
  if (!budget || budget <= 0) return;

  // Cada lista mide su presupuesto con sus propios movimientos (Personal ve también lo que
  // pagaste en otras listas, pero eso no gasta sus presupuestos).
  const spent = filterByRange(transactions, budgetCycle(defaultPeriod, new Date()))
    .filter((t) => t.category_emoji === categoryEmoji && t.amount > 0 && t.list_id === activeListId)
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
      await waitForSettingsHydration();
      setActiveListId(useSettingsStore.getState().activeListId);
      const transactions = await getAllTransactions();
      set({ transactions });
    } catch (e) {
      console.error("[useFinanceStore] Error al cargar transacciones:", e);
    } finally {
      set({ isLoading: false });
    }
  },

  addTransaction: async (
    amount,
    description,
    categoryEmoji,
    tags = [],
    date?,
    paymentMethod = "cash",
    listId?,
    paidBy?,
  ) => {
    const newTx = await insertTransaction(
      amount,
      description,
      categoryEmoji,
      tags,
      date,
      paymentMethod,
      listId,
      paidBy,
    );
    // Guardado en otra lista que no se está viendo: no entra en la lista en memoria.
    const updated = isVisibleInActiveList(newTx)
      ? [newTx, ...get().transactions]
      : get().transactions;
    set({ transactions: updated });
    // Solo verificar presupuesto en gastos (amount > 0)
    if (amount > 0) await notifyIfBudgetExceeded(updated, categoryEmoji, newTx.list_id);
  },

  addTransactionBatch: async (items) => {
    // Transacción SQLite atómica: si falla cualquier inserción, se hace rollback completo
    const inserted = await insertTransactionBatch(items);
    // Refresh en una sola operación para no disparar múltiples re-renders
    const all = await getAllTransactions();
    set({ transactions: all });
    // Verificar presupuesto para cada categoría de gasto del lote
    const expenseEmojis = [
      ...new Set(items.filter((i) => i.amount > 0).map((i) => i.categoryEmoji)),
    ];
    for (const emoji of expenseEmojis) {
      await notifyIfBudgetExceeded(all, emoji, useSettingsStore.getState().activeListId);
    }
    return inserted.map((tx) => tx.id);
  },

  updateTransaction: async (
    id,
    amount,
    description,
    categoryEmoji,
    tags = [],
    date?,
    paymentMethod = "cash",
    listId?,
    paidBy?,
  ) => {
    const updatedTx = await dbUpdateTransaction(
      id,
      amount,
      description,
      categoryEmoji,
      tags,
      date,
      paymentMethod,
      listId,
      paidBy,
    );
    // Refresh completo: si la fecha cambió, el orden (DESC por fecha) también puede cambiar.
    const all = await getAllTransactions();
    set({ transactions: all });
    if (amount > 0) await notifyIfBudgetExceeded(all, categoryEmoji, updatedTx.list_id);
  },

  deleteTransaction: async (id) => {
    await dbDeleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  switchList: async (id) => {
    useSettingsStore.getState().switchList(id);
    await get().loadTransactions();
  },

  deleteList: async (id) => {
    if (id === DEFAULT_LIST_ID) return;
    await deleteTransactionsOfList(id);
    const wasActive = useSettingsStore.getState().activeListId === id;
    useSettingsStore.getState().removeList(id);
    if (wasActive) await get().loadTransactions();
  },

  getTotalBalance: () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return get()
      .transactions.filter((t) => new Date(t.date) >= firstDay)
      .reduce((sum, t) => sum + t.amount, 0);
  },
}));
