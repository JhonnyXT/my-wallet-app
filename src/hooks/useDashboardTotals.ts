// ─── Hook: totales, presupuesto y estadísticas del dashboard ─────────────────

import { useMemo } from "react";
import type { TransactionRow } from "@/src/db/db";
import {
  useSettingsStore,
  getUserExpenseCategories,
  getUserIncomeCategories,
} from "@/src/store/useSettingsStore";
import type { TypeFilter } from "@/src/hooks/useTransactionFilters";
import { expectedPay, type DateRange } from "@/src/utils/periodCycles";

interface CategoryStat {
  emoji: string;
  total: number;
  count: number;
}

export interface UseDashboardTotalsReturn {
  expenseTotal: number;
  incomeTotal: number;
  netBalance: number;
  /** Ingresos − gastos del período visto (sin el filtro de tipo de los pills). */
  periodNet: number;
  allTimeNetBalance: number;
  budgetPct: number;
  overBudgetAmount: number;
  /** Pago esperado del ciclo visto (0 = no configurado o la vista no es un ciclo). */
  expectedPayAmount: number;
  /** Ingresos registrados en el período visto. */
  payReceived: number;
  categoryStats: CategoryStat[];
  incomeStats: CategoryStat[];
  totalExpenses: number;
  totalIncome: number;
  activeStats: CategoryStat[];
  activeTotalForChart: number;
  activeBudget: Record<string, number>;
  allEmojis: string[];
}

interface UseDashboardTotalsParams {
  transactions: TransactionRow[];
  filteredTransactions: TransactionRow[];
  typeFilteredTransactions: TransactionRow[];
  searchedTransactions: TransactionRow[];
  isSearching: boolean;
  typeFilter: TypeFilter;
  /** Rango del ciclo visto si la vista es un ciclo de la frecuencia; null en año/todo/rango. */
  viewedCycle: DateRange | null;
}

export function useDashboardTotals({
  transactions,
  filteredTransactions,
  typeFilteredTransactions,
  searchedTransactions,
  isSearching,
  typeFilter,
  viewedCycle,
}: UseDashboardTotalsParams): UseDashboardTotalsReturn {
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const userCategories = useSettingsStore((s) => s.userCategories);
  const defaultPeriod = useSettingsStore((s) => s.defaultPeriod);

  // ── Totales de gastos e ingresos ─────────────────────────────────────────
  const { expenseTotal, incomeTotal } = useMemo(() => {
    const source = isSearching ? searchedTransactions : typeFilteredTransactions;
    const exp = source.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const inc = source.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { expenseTotal: exp, incomeTotal: inc };
  }, [isSearching, searchedTransactions, typeFilteredTransactions]);

  const netBalance = incomeTotal - expenseTotal;

  const periodNet = useMemo(
    () => filteredTransactions.reduce((s, t) => s - t.amount, 0),
    [filteredTransactions],
  );

  // Balance REAL de la persona — siempre sobre todo el historial, sin importar el
  // período que esté viendo en la gráfica/lista. `netBalance` (arriba) queda acotado
  // al filtro de período (y, durante una búsqueda, al resultado de esa búsqueda —
  // eso sí es intencional, "neto de lo que encontraste"), así que al cambiar de mes
  // — o cuando el mes nuevo todavía no tiene transacciones — se iba a $0 en vez de
  // seguir mostrando cuánta plata tiene la persona en realidad. Pedido explícito del
  // usuario (2026-09-02): el Dashboard usa este valor para "BALANCE NETO"/"Patrimonio
  // neto" en vez de `netBalance` cuando no está buscando.
  const allTimeNetBalance = useMemo(() => {
    const income = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const expense = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    return income - expense;
  }, [transactions]);

  // ── Pago del ciclo: gastado vs pago esperado (y lo recibido de verdad) ────
  // Solo cuando la vista es un ciclo de la frecuencia (mes, quincena, semana…):
  // el pago esperado es por ciclo, no tiene sentido para un año o un rango a mano.
  const expectedPayAmount = viewedCycle ? expectedPay(defaultPeriod, viewedCycle) : 0;
  const { cycleExpense, payReceived } = useMemo(() => {
    let exp = 0;
    let inc = 0;
    for (const t of filteredTransactions) {
      if (t.amount > 0) exp += t.amount;
      else inc += Math.abs(t.amount);
    }
    return { cycleExpense: exp, payReceived: inc };
  }, [filteredTransactions]);

  const budgetPct =
    expectedPayAmount > 0 ? Math.min(Math.round((cycleExpense / expectedPayAmount) * 100), 100) : 0;
  // Monto gastado por encima del pago esperado (sin capar a 100%).
  const overBudgetAmount = expectedPayAmount > 0 ? Math.max(cycleExpense - expectedPayAmount, 0) : 0;

  // ── Estadísticas por categoría para la gráfica ───────────────────────────
  const categoryStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of filteredTransactions.filter((t) => t.amount > 0)) {
      if (!map[tx.category_emoji]) map[tx.category_emoji] = { total: 0, count: 0 };
      map[tx.category_emoji].total += tx.amount;
      map[tx.category_emoji].count += 1;
    }
    return Object.entries(map)
      .map(([emoji, s]) => ({ emoji, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const incomeStats = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    for (const tx of filteredTransactions.filter((t) => t.amount < 0)) {
      if (!map[tx.category_emoji]) map[tx.category_emoji] = { total: 0, count: 0 };
      map[tx.category_emoji].total += Math.abs(tx.amount);
      map[tx.category_emoji].count += 1;
    }
    return Object.entries(map)
      .map(([emoji, s]) => ({ emoji, ...s }))
      .sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const totalExpenses = useMemo(
    () => categoryStats.reduce((s, c) => s + c.total, 0),
    [categoryStats],
  );
  const totalIncome = useMemo(() => incomeStats.reduce((s, c) => s + c.total, 0), [incomeStats]);

  const activeStats = typeFilter === "income" ? incomeStats : categoryStats;
  const activeTotalForChart = typeFilter === "income" ? totalIncome : totalExpenses;
  const activeBudget = typeFilter === "income" ? {} : budgetByCategory;

  const allEmojis = useMemo(() => {
    const cats =
      typeFilter === "income"
        ? getUserIncomeCategories(userCategories)
        : getUserExpenseCategories(userCategories);
    const emojis = cats.map((c) => c.emoji);
    const known = new Set(emojis);
    const extra = [
      ...new Set(
        transactions.map((t) => t.category_emoji).filter((e) => !known.has(e) && e !== "💸"),
      ),
    ];
    return [...emojis, ...extra];
  }, [transactions, typeFilter, userCategories]);

  return {
    expenseTotal,
    incomeTotal,
    netBalance,
    periodNet,
    allTimeNetBalance,
    budgetPct,
    overBudgetAmount,
    expectedPayAmount,
    payReceived,
    categoryStats,
    incomeStats,
    totalExpenses,
    totalIncome,
    activeStats,
    activeTotalForChart,
    activeBudget,
    allEmojis,
  };
}
