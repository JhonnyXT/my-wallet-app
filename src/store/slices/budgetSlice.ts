import type { StateCreator } from "zustand";

export interface BudgetSlice {
  monthlyBudget: number; // 0 = no configurado
  budgetByCategory: Record<string, number>; // emoji → monto límite mensual

  setMonthlyBudget: (amount: number) => void;
  setBudgetForCategory: (emoji: string, amount: number) => void;
  removeBudgetForCategory: (emoji: string) => void;
}

export const createBudgetSlice: StateCreator<BudgetSlice, [], [], BudgetSlice> = (set) => ({
  monthlyBudget: 0,
  budgetByCategory: {},

  setMonthlyBudget: (amount) => set({ monthlyBudget: Math.max(0, amount) }),
  setBudgetForCategory: (emoji, amount) =>
    set((s) => ({ budgetByCategory: { ...s.budgetByCategory, [emoji]: Math.max(0, amount) } })),
  removeBudgetForCategory: (emoji) =>
    set((s) => {
      const next = { ...s.budgetByCategory };
      delete next[emoji];
      return { budgetByCategory: next };
    }),
});
