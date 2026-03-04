import { create } from "zustand";

interface UIState {
  isExpenseInputOpen: boolean;
  prefillText: string;
  openExpenseInput: (prefill?: string) => void;
  closeExpenseInput: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isExpenseInputOpen: false,
  prefillText: "",
  openExpenseInput: (prefill = "") =>
    set({ isExpenseInputOpen: true, prefillText: prefill }),
  closeExpenseInput: () =>
    set({ isExpenseInputOpen: false, prefillText: "" }),
}));
