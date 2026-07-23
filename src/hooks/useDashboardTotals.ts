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
  budgetPct: number;
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

  // ── Porcentaje de presupuesto mensual consumido ───────────────────────────
  const budgetPct = useMemo(() => {
    if (monthlyBudget <= 0 || !isCurrentPeriod) return 0;
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const exp = transactions
      .filter((t) => new Date(t.date) >= start && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
    return Math.min(Math.round((exp / monthlyBudget) * 100), 100);
  }, [transactions, monthlyBudget, isCurrentPeriod]);

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
    budgetPct,
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
