/**
 * useSettingsStore — preferencias de usuario persistidas en AsyncStorage.
 * Ningún dato financiero sensible (sin números de cuenta/tarjeta).
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BudgetPeriod = "monthly" | "biweekly";
export type DarkModeOption = "system" | "light" | "dark";
export type PaymentMethodType = "cash" | "debit" | "savings";

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
}

export interface SettingsState {
  // Personalización
  userName: string;

  // Presupuesto
  monthlyBudget: number;        // 0 = no configurado
  budgetPeriod: BudgetPeriod;   // "monthly" | "biweekly"
  budgetByCategory: Record<string, number>; // emoji → monto límite

  // Métodos de pago
  paymentMethods: PaymentMethod[];

  // Metas de ahorro
  savingsGoals: SavingsGoal[];

  // Apariencia
  darkMode: DarkModeOption;

  // Acciones
  setUserName: (name: string) => void;
  setMonthlyBudget: (amount: number) => void;
  setBudgetPeriod: (period: BudgetPeriod) => void;
  setBudgetForCategory: (emoji: string, amount: number) => void;
  removeBudgetForCategory: (emoji: string) => void;
  setPaymentMethods: (methods: PaymentMethod[]) => void;
  addPaymentMethod: (method: PaymentMethod) => void;
  updatePaymentMethod: (id: string, name: string, type: PaymentMethodType) => void;
  removePaymentMethod: (id: string) => void;
  setDarkMode: (mode: DarkModeOption) => void;
  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "createdAt">) => void;
  updateSavingsGoal: (id: string, saved: number) => void;
  removeSavingsGoal: (id: string) => void;
}

// ─── Valores por defecto ──────────────────────────────────────────────────────

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  { id: "cash",    name: "Efectivo", type: "cash"    },
  { id: "savings", name: "Ahorros",  type: "savings" },
  { id: "credit",  name: "Tarjeta",  type: "debit"   },
];

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      userName:          "",
      monthlyBudget:     0,
      budgetPeriod:      "monthly",
      budgetByCategory:  {},
      paymentMethods:    DEFAULT_PAYMENT_METHODS,
      savingsGoals:      [],
      darkMode:          "system",

      setUserName:     (name)   => set({ userName: name }),
      setMonthlyBudget:(amount) => set({ monthlyBudget: Math.max(0, amount) }),
      setBudgetPeriod: (period) => set({ budgetPeriod: period }),

      setBudgetForCategory: (emoji, amount) =>
        set((s) => ({
          budgetByCategory: { ...s.budgetByCategory, [emoji]: Math.max(0, amount) },
        })),

      removeBudgetForCategory: (emoji) =>
        set((s) => {
          const next = { ...s.budgetByCategory };
          delete next[emoji];
          return { budgetByCategory: next };
        }),

      setPaymentMethods: (methods) => set({ paymentMethods: methods }),

      addPaymentMethod: (method) =>
        set((s) => ({ paymentMethods: [...s.paymentMethods, method] })),

      updatePaymentMethod: (id, name, type) =>
        set((s) => ({
          paymentMethods: s.paymentMethods.map((m) =>
            m.id === id ? { ...m, name, type } : m
          ),
        })),

      removePaymentMethod: (id) =>
        set((s) => ({
          paymentMethods: s.paymentMethods.filter((m) => m.id !== id),
        })),

      setDarkMode: (mode) => set({ darkMode: mode }),

      addSavingsGoal: (goal) =>
        set((s) => ({
          savingsGoals: [
            ...s.savingsGoals,
            { ...goal, id: Date.now().toString(), createdAt: new Date().toISOString() },
          ],
        })),

      updateSavingsGoal: (id, saved) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.map((g) =>
            g.id === id ? { ...g, savedAmount: Math.max(0, saved) } : g
          ),
        })),

      removeSavingsGoal: (id) =>
        set((s) => ({
          savingsGoals: s.savingsGoals.filter((g) => g.id !== id),
        })),
    }),
    {
      name:    "mywallet-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
