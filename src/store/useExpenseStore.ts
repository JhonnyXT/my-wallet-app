import { create } from "zustand";

export type DateOption = "today" | "yesterday" | "daybeforeyesterday" | "custom";
export type RecurrenceType = "once" | "weekly" | "biweekly" | "monthly" | "yearly";
export type AccountType = "cash" | "savings" | "credit";

export interface ActiveExpense {
  amount: number;
  categoryEmoji: string;
  categoryName: string;
  date: DateOption;
  customDate: Date | null;
  note: string;
  rawTranscript: string;
  recurrence: RecurrenceType;
  account: AccountType;
  tags: string[];
}

interface ExpenseStore extends ActiveExpense {
  setAmount: (v: number) => void;
  setCategory: (emoji: string, name: string) => void;
  setDate: (d: DateOption) => void;
  setNote: (n: string) => void;
  setRecurrence: (r: RecurrenceType) => void;
  setAccount: (a: AccountType) => void;
  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;
  setFromVoice: (data: Partial<ActiveExpense>) => void;
  reset: () => void;
}

const DEFAULTS: ActiveExpense = {
  amount: 0,
  categoryEmoji: "💰",
  categoryName: "General",
  date: "today",
  customDate: null,
  note: "",
  rawTranscript: "",
  recurrence: "once",
  account: "cash",
  tags: [],
};

export const useExpenseStore = create<ExpenseStore>((set) => ({
  ...DEFAULTS,

  setAmount: (amount) => set({ amount }),
  setCategory: (categoryEmoji, categoryName) => set({ categoryEmoji, categoryName }),
  setDate: (date) => set({ date }),
  setNote: (note) => set({ note }),
  setRecurrence: (recurrence) => set({ recurrence }),
  setAccount: (account) => set({ account }),
  addTag: (tag) =>
    set((s) => ({
      tags: s.tags.includes(tag) ? s.tags : [...s.tags, tag],
    })),
  removeTag: (tag) =>
    set((s) => ({ tags: s.tags.filter((t) => t !== tag) })),
  setFromVoice: (data) => set((s) => ({ ...s, ...data })),
  reset: () => set(DEFAULTS),
}));
