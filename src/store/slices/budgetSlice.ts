import type { StateCreator } from "zustand";

export interface BudgetSlice {
  budgetByCategory: Record<string, number>; // emoji → monto límite mensual

  setBudgetForCategory: (emoji: string, amount: number) => void;
  removeBudgetForCategory: (emoji: string) => void;
}

export const createBudgetSlice: StateCreator<BudgetSlice, [], [], BudgetSlice> = (set) => ({
  budgetByCategory: {},

  setBudgetForCategory: (emoji, amount) =>
    set((s) => ({ budgetByCategory: { ...s.budgetByCategory, [emoji]: Math.max(0, amount) } })),
  removeBudgetForCategory: (emoji) =>
    set((s) => {
      const next = { ...s.budgetByCategory };
      delete next[emoji];
      return { budgetByCategory: next };
    }),
});
