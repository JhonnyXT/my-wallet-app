// ─── Hook: totales, presupuesto y estadísticas del dashboard ─────────────────

import { useMemo } from "react";
import type { TransactionRow } from "@/src/db/db";
import {
  useSettingsStore,
  getUserExpenseCategories,
  getUserIncomeCategories,
} from "@/src/store/useSettingsStore";
import type { TypeFilter } from "@/src/hooks/useTransactionFilters";

interface CategoryStat {
  emoji: string;
  total: number;
  count: number;
}

export interface UseDashboardTotalsReturn {
  expenseTotal: number;
  incomeTotal: number;
  netBalance: number;
  allTimeNetBalance: number;
  budgetPct: number;
  overBudgetAmount: number;
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
  isCurrentPeriod: boolean;
}

export function useDashboardTotals({
  transactions,
  filteredTransactions,
  typeFilteredTransactions,
  searchedTransactions,
  isSearching,
  typeFilter,
  isCurrentPeriod,
}: UseDashboardTotalsParams): UseDashboardTotalsReturn {
  const monthlyBudget = useSettingsStore((s) => s.monthlyBudget);
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const userCategories = useSettingsStore((s) => s.userCategories);

  // ── Totales de gastos e ingresos ─────────────────────────────────────────
  const { expenseTotal, incomeTotal } = useMemo(() => {
    const source = isSearching ? searchedTransactions : typeFilteredTransactions;
    const exp = source.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const inc = source.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    return { expenseTotal: exp, incomeTotal: inc };
  }, [isSearching, searchedTransactions, typeFilteredTransactions]);

  const netBalance = incomeTotal - expenseTotal;

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

  // ── Porcentaje de presupuesto mensual consumido ───────────────────────────
  const monthlyExpense = useMemo(() => {
    if (monthlyBudget <= 0 || !isCurrentPeriod) return 0;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter((t) => new Date(t.date) >= start && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, monthlyBudget, isCurrentPeriod]);

  const budgetPct = useMemo(() => {
    if (monthlyBudget <= 0 || !isCurrentPeriod) return 0;
    return Math.min(Math.round((monthlyExpense / monthlyBudget) * 100), 100);
  }, [monthlyExpense, monthlyBudget, isCurrentPeriod]);

  // ── Monto excedido del presupuesto mensual (sin capar a 100%) ────────────
  const overBudgetAmount = useMemo(() => {
    if (monthlyBudget <= 0 || !isCurrentPeriod) return 0;
    return Math.max(monthlyExpense - monthlyBudget, 0);
  }, [monthlyExpense, monthlyBudget, isCurrentPeriod]);

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
    allTimeNetBalance,
    budgetPct,
    overBudgetAmount,
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
