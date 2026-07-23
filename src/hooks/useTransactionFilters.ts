// ─── Hook: filtros de período y tipo para el dashboard ───────────────────────

import { useState, useMemo } from "react";
import * as Haptics from "expo-haptics";
import type { TransactionRow } from "@/src/db/db";
import {
  type PeriodFilter,
  getDefaultPeriod,
  periodFilterLabel,
  applyPeriodFilter,
} from "@/src/utils/periodFilter";

export type TypeFilter = "expense" | "income" | null;

export interface UseTransactionFiltersReturn {
  periodFilter: PeriodFilter;
  setPeriodFilter: (f: PeriodFilter) => void;
  typeFilter: TypeFilter;
  handlePillPress: (type: TypeFilter) => Promise<void>;
  monthPickerOpen: boolean;
  setMonthPickerOpen: (open: boolean) => void;
  filteredTransactions: TransactionRow[];
  typeFilteredTransactions: TransactionRow[];
  chipLabel: string;
  quickLabel: string;
  isCurrentPeriod: boolean;
}

export function useTransactionFilters(transactions: TransactionRow[]): UseTransactionFiltersReturn {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>(getDefaultPeriod);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const chipLabel = periodFilterLabel(periodFilter);
  const quickLabel = periodFilter.type === "quick" ? periodFilter.label : "";

  async function handlePillPress(type: TypeFilter) {
    await Haptics.selectionAsync();
    setTypeFilter((prev) => (prev === type ? null : type));
  }

  const filteredTransactions = useMemo(
    () => applyPeriodFilter(transactions, periodFilter),
    [transactions, periodFilter],
  );

  const typeFilteredTransactions = useMemo(() => {
    if (typeFilter === "expense") return filteredTransactions.filter((t) => t.amount > 0);
    if (typeFilter === "income") return filteredTransactions.filter((t) => t.amount < 0);
    return filteredTransactions;
  }, [filteredTransactions, typeFilter]);

  const isCurrentPeriod = useMemo(() => {
    const now = new Date();
    if (periodFilter.type === "quick") return true;
    if (periodFilter.type === "all") return false;
    if (periodFilter.type === "year") return periodFilter.year === now.getFullYear();
    return periodFilter.year === now.getFullYear() && periodFilter.month === now.getMonth() + 1;
  }, [periodFilter]);

  return {
    periodFilter,
    setPeriodFilter,
    typeFilter,
    handlePillPress,
    monthPickerOpen,
    setMonthPickerOpen,
    filteredTransactions,
    typeFilteredTransactions,
    chipLabel,
    quickLabel,
    isCurrentPeriod,
  };
}
