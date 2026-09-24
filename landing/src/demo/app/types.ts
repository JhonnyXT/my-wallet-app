// Tipos de `src/store/useExpenseStore.ts` que necesita el parser copiado.
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
