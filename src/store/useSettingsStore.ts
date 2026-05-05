/**
 * useSettingsStore — preferencias de usuario persistidas en AsyncStorage.
 *
 * Organizado en slices por dominio (patrón Zustand):
 *   - categoriesSlice:     categorías del usuario + onboarding
 *   - budgetSlice:         presupuesto mensual y por categoría
 *   - paymentsSlice:       métodos de pago
 *   - goalsSlice:          metas de ahorro
 *   - prefsSlice:          preferencias visuales (tema, nombre)
 *   - notificationsSlice:  configuración de notificaciones del sistema
 *
 * La API pública es idéntica a la versión anterior: todos los importadores
 * existentes funcionan sin cambios.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserCategory } from "@/src/constants/categoryPresets";

import { createCategoriesSlice, type CategoriesSlice } from "./slices/categoriesSlice";
import { createBudgetSlice,     type BudgetSlice     } from "./slices/budgetSlice";
import { createPaymentsSlice,   type PaymentsSlice, type PaymentMethod, type PaymentMethodType } from "./slices/paymentsSlice";
import { createGoalsSlice,      type GoalsSlice,      type SavingsGoal  } from "./slices/goalsSlice";
import { createPrefsSlice,      type PrefsSlice,      type DarkModeOption } from "./slices/prefsSlice";
import { createNotificationsSlice, type NotificationsSlice } from "./slices/notificationsSlice";

// ─── Re-exportar tipos públicos (sin cambios para los importadores) ────────────

export type { DarkModeOption, PaymentMethodType, PaymentMethod, SavingsGoal };

// ─── Tipo combinado del store ─────────────────────────────────────────────────

export type SettingsState =
  CategoriesSlice &
  BudgetSlice     &
  PaymentsSlice   &
  GoalsSlice      &
  PrefsSlice      &
  NotificationsSlice;

// ─── Helpers de categorías (misma API pública) ────────────────────────────────

export function getUserExpenseCategories(cats: UserCategory[]): UserCategory[] {
  return cats.filter((c) => c.type === "expense");
}

export function getUserIncomeCategories(cats: UserCategory[]): UserCategory[] {
  return cats.filter((c) => c.type === "income");
}

export function getCategoryByEmoji(cats: UserCategory[], emoji: string): UserCategory | undefined {
  return cats.find((c) => c.emoji === emoji);
}

// ─── Store combinado ──────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (...a) => ({
      ...createCategoriesSlice(...a),
      ...createBudgetSlice(...a),
      ...createPaymentsSlice(...a),
      ...createGoalsSlice(...a),
      ...createPrefsSlice(...a),
      ...createNotificationsSlice(...a),
    }),
    {
      name:    "mywallet-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
