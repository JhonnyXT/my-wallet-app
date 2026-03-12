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
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
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

export const useExpenseStore = create<ExpenseStore>((set) => ({
  ...DEFAULTS,
  setAmount: (amount) => set({ amount }),
  toggleExpense: () => set((s) => ({ isExpense: !s.isExpense })),
  setIsExpense: (isExpense) => set({ isExpense }),
  setCategory: (categoryEmoji, categoryName) => set({ categoryEmoji, categoryName }),
  setDate: (date) => set({ date }),
  setCustomDate: (customDate) => set({ customDate, date: "custom" }),
  setNote: (note) => set({ note }),
  setAccount: (account) => set({ account }),
  addTag: (tag) =>
    set((s) => ({ tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag] })),
  removeTag: (tag) =>
    set((s) => ({ tags: s.tags.filter((t) => t !== tag) })),
  setFromVoice: (data) => set((s) => ({ ...s, ...data })),
  reset: () => set(DEFAULTS),
}));
