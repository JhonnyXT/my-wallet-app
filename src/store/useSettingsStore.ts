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
  monthlyBudget: number;        // 0 = no configurado (siempre el valor MENSUAL)
  budgetPeriod: BudgetPeriod;   // "monthly" | "biweekly"
  budgetByCategory: Record<string, number>; // emoji → monto límite (mensual)

  // Métodos de pago
  paymentMethods: PaymentMethod[];

  // Metas de ahorro
  savingsGoals: SavingsGoal[];

  // Apariencia
  darkMode: DarkModeOption;

  // Onboarding
  hasCompletedOnboarding: boolean;
  onboardingStep: number;

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
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
}

// ─── Helpers derivados ───────────────────────────────────────────────────────

export function getEffectiveBudget(monthlyBudget: number, budgetPeriod: BudgetPeriod): number {
  return budgetPeriod === "biweekly" ? Math.round(monthlyBudget / 2) : monthlyBudget;
}

export function getEffectiveCategoryBudgets(
  budgetByCategory: Record<string, number>,
  budgetPeriod: BudgetPeriod
): Record<string, number> {
  if (budgetPeriod === "monthly") return budgetByCategory;
  const result: Record<string, number> = {};
  for (const [emoji, amount] of Object.entries(budgetByCategory)) {
    result[emoji] = Math.round(amount / 2);
  }
  return result;
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
      hasCompletedOnboarding: false,
      onboardingStep:         0,

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

      setOnboardingStep: (step) => set({ onboardingStep: step }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true, onboardingStep: 5 }),
    }),
    {
      name:    "mywallet-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
