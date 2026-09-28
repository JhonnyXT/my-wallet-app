// ─── Hook: período (vista) y tipo para el dashboard ─────────────────────────

import { useCallback, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import type { TransactionRow } from "@/src/db/db";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import {
  cycleCadenceOf,
  cycleLabel,
  defaultView,
  filterByRange,
  isDefaultView,
  listCycles,
  sumByRanges,
  viewLabel,
  viewRange,
  yearRange,
  type CycleCadence,
  type DateRange,
  type PeriodCadence,
  type PeriodView,
} from "@/src/utils/periodCycles";

export type TypeFilter = "expense" | "income" | null;

/** Un elemento de la tira deslizable: un ciclo o un año, con su neto. */
export interface PeriodStripItem {
  key: string;
  label: string;
  net: number;
  view: PeriodView;
}

// Ciclos/años futuros visibles en la tira (vacíos, pero dan contexto de "lo que viene").
const FUTURE_ITEMS = 1;

/**
 * Ítems de la tira para una frecuencia de ciclos, desde `from` (normalmente el primer
 * movimiento) hasta el ciclo actual + `future`. `currentIndex` = índice del ciclo actual.
 */
export function buildCycleItems(
  c: CycleCadence,
  transactions: { date: string; amount: number }[],
  from: Date | null,
  now: Date,
  future: number,
): { items: PeriodStripItem[]; currentIndex: number } {
  const ranges = listCycles(c, from, now, future);
  const currentIndex = ranges.length - 1 - future;
  const sums = sumByRanges(transactions, ranges);
  const items = ranges.map((r, i) => ({
    key: `c-${r.start.getTime()}`,
    label: cycleLabel(c, r, now),
    net: sums[i].income - sums[i].expense,
    view: { kind: "cycle", offset: i - currentIndex } as PeriodView,
  }));
  return { items, currentIndex };
}

export function earliestDate(transactions: { date: string }[]): Date | null {
  let min: number | null = null;
  for (const t of transactions) {
    const time = new Date(t.date).getTime();
    if (min === null || time < min) min = time;
  }
  return min === null ? null : new Date(min);
}

export interface UseTransactionFiltersReturn {
  cadence: PeriodCadence;
  periodView: PeriodView;
  setPeriodView: (v: PeriodView) => void;
  resetPeriod: () => void;
  isDefault: boolean;
  periodRange: DateRange | null;
  periodLabel: string;
  stripItems: PeriodStripItem[];
  stripIndex: number;
  typeFilter: TypeFilter;
  handlePillPress: (type: TypeFilter) => Promise<void>;
  filteredTransactions: TransactionRow[];
  typeFilteredTransactions: TransactionRow[];
  /** La vista incluye hoy (el período "en curso"). */
  isCurrentPeriod: boolean;
}

export function useTransactionFilters(transactions: TransactionRow[]): UseTransactionFiltersReturn {
  const cadence = useSettingsStore((s) => s.defaultPeriod);
  // La vista se guarda junto con la frecuencia en que se eligió. Si la frecuencia cambió,
  // la vista vuelve a su "por defecto" EN EL MISMO render (un offset de ciclo de la
  // frecuencia anterior no significa nada en la nueva). Antes se reseteaba en un efecto,
  // un render después, y ese render intermedio montaba la tira resaltando el ciclo
  // equivocado (visto en dispositivo).
  const [viewState, setViewState] = useState(() => ({ cadence, view: defaultView(cadence) }));
  const periodView = viewState.cadence === cadence ? viewState.view : defaultView(cadence);
  const setPeriodView = useCallback(
    (view: PeriodView) => setViewState({ cadence, view }),
    [cadence],
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(null);

  const resetPeriod = useCallback(
    () => setViewState({ cadence, view: defaultView(cadence) }),
    [cadence],
  );

  // `now` se recalcula con cada cambio de datos/vista: si la app queda abierta al pasar
  // la medianoche, el siguiente movimiento o cambio de vista ya usa el día nuevo.
  const now = useMemo(() => new Date(), [transactions, periodView, cadence]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodRange = useMemo(
    () => viewRange(periodView, cadence, now),
    [periodView, cadence, now],
  );
  const periodLabel = useMemo(
    () => viewLabel(periodView, cadence, now),
    [periodView, cadence, now],
  );
  const isDefault = isDefaultView(periodView, cadence);
  const isCurrentPeriod =
    periodRange === null || (now >= periodRange.start && now <= periodRange.end);

  const earliest = useMemo(() => earliestDate(transactions), [transactions]);

  // La tira muestra ciclos (vista "cycle") o años (vista "year"); en "all"/"range" no aplica.
  const { stripItems, stripIndex } = useMemo(() => {
    if (periodView.kind === "year") {
      const current = now.getFullYear();
      const first = Math.min(earliest ? earliest.getFullYear() : current, periodView.year);
      const ranges: DateRange[] = [];
      for (let y = first; y <= current + FUTURE_ITEMS; y++) ranges.push(yearRange(y));
      const sums = sumByRanges(transactions, ranges);
      const items = ranges.map((r, i) => ({
        key: `y-${r.start.getFullYear()}`,
        label: String(r.start.getFullYear()),
        net: sums[i].income - sums[i].expense,
        view: { kind: "year", year: r.start.getFullYear() } as PeriodView,
      }));
      return { stripItems: items, stripIndex: periodView.year - first };
    }
    if (periodView.kind === "cycle") {
      const c = cycleCadenceOf(cadence);
      const future = Math.max(FUTURE_ITEMS, periodView.offset);
      // Si la vista quedó antes del primer movimiento (ej. se borraron los más viejos),
      // la tira arranca en ese ciclo para que siga siendo seleccionable.
      const viewed = viewRange(periodView, cadence, now);
      const from = viewed && (!earliest || viewed.start < earliest) ? viewed.start : earliest;
      const { items, currentIndex } = buildCycleItems(c, transactions, from, now, future);
      return { stripItems: items, stripIndex: currentIndex + periodView.offset };
    }
    return { stripItems: [], stripIndex: -1 };
  }, [periodView, cadence, transactions, earliest, now]);

  async function handlePillPress(type: TypeFilter) {
    await Haptics.selectionAsync();
    setTypeFilter((prev) => (prev === type ? null : type));
  }

  const filteredTransactions = useMemo(
    () => filterByRange(transactions, periodRange),
    [transactions, periodRange],
  );

  const typeFilteredTransactions = useMemo(() => {
    if (typeFilter === "expense") return filteredTransactions.filter((t) => t.amount > 0);
    if (typeFilter === "income") return filteredTransactions.filter((t) => t.amount < 0);
    return filteredTransactions;
  }, [filteredTransactions, typeFilter]);

  return {
    cadence,
    periodView,
    setPeriodView,
    resetPeriod,
    isDefault,
    periodRange,
    periodLabel,
    stripItems,
    stripIndex,
    typeFilter,
    handlePillPress,
    filteredTransactions,
    typeFilteredTransactions,
    isCurrentPeriod,
  };
}
