import { create } from "zustand";

export type DateOption = "today" | "custom";
export type AccountType = "cash" | "savings" | "credit";

export interface ActiveExpense {
  amount: number;
  isExpense: boolean;
  categoryEmoji: string;
  categoryName: string;
  date: DateOption;
  customDate: Date | null;
  note: string;
  rawTranscript: string;
  account: AccountType;
  /**
   * Tags ya guardados de la transacción que se está editando (sin UI para crearlos/editarlos
   * desde acá — se quitó, ver auditoría de simplicidad 2026-11-18). Solo existen para que
   * editar una transacción vieja con tags no se los borre al guardar; `active-expense.tsx` los
   * prellena en modo edición y los reenvía tal cual a `updateTransaction`.
   */
  tags: string[];
}

interface ExpenseStore extends ActiveExpense {
  setAmount: (v: number) => void;
  toggleExpense: () => void;
  setIsExpense: (v: boolean) => void;
  setCategory: (emoji: string, name: string) => void;
  setDate: (d: DateOption) => void;
  setCustomDate: (d: Date) => void;
  setNote: (n: string) => void;
  setAccount: (a: AccountType) => void;
  setFromVoice: (data: Partial<ActiveExpense>) => void;
  reset: () => void;
}

const DEFAULTS: ActiveExpense = {
  amount: 0,
  isExpense: true,
  categoryEmoji: "🍔",
  categoryName: "Comida",
  date: "today",
  customDate: null,
  note: "",
  rawTranscript: "",
  account: "cash",
  tags: [],
};

function initialState(): ActiveExpense {
  return { ...DEFAULTS };
}

export const useExpenseStore = create<ExpenseStore>((set) => ({
  ...initialState(),
  setAmount: (amount) => set({ amount }),
  toggleExpense: () => set((s) => ({ isExpense: !s.isExpense })),
  setIsExpense: (isExpense) => set({ isExpense }),
  setCategory: (categoryEmoji, categoryName) => set({ categoryEmoji, categoryName }),
  setDate: (date) => set({ date }),
  setCustomDate: (customDate) => set({ customDate, date: "custom" }),
  setNote: (note) => set({ note }),
  setAccount: (account) => set({ account }),
  setFromVoice: (data) => set((s) => ({ ...s, ...data })),
  reset: () => set(initialState()),
}));
