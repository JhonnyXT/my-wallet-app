import type { StateCreator } from "zustand";
import { touchList, type ListsSlice } from "./listsSlice";

export interface BudgetSlice {
  budgetByCategory: Record<string, number>; // emoji → monto límite mensual

  setBudgetForCategory: (emoji: string, amount: number) => void;
  removeBudgetForCategory: (emoji: string) => void;
}

// Los presupuestos vivos son los de la lista activa (patrón de intercambio).
export const createBudgetSlice: StateCreator<BudgetSlice & ListsSlice, [], [], BudgetSlice> = (
  set,
) => ({
  budgetByCategory: {},

  setBudgetForCategory: (emoji, amount) =>
    set((s) => ({
      budgetByCategory: { ...s.budgetByCategory, [emoji]: Math.max(0, amount) },
      lists: touchList(s.lists, s.activeListId, Date.now()),
    })),
  removeBudgetForCategory: (emoji) =>
    set((s) => {
      const next = { ...s.budgetByCategory };
      delete next[emoji];
      return { budgetByCategory: next, lists: touchList(s.lists, s.activeListId, Date.now()) };
    }),
});
