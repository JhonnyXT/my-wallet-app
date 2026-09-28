/**
 * useSettingsStore — preferencias de usuario persistidas en AsyncStorage.
 *
 * Organizado en slices por dominio (patrón Zustand):
 *   - categoriesSlice:     categorías del usuario + onboarding
 *   - budgetSlice:         presupuesto mensual y por categoría
 *   - paymentsSlice:       métodos de pago
 *   - goalsSlice:          metas de ahorro
 *   - debtsSlice:          deudas y su saldo pendiente
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
import { DEFAULT_CADENCE, type PeriodCadence } from "@/src/utils/periodCycles";

import { createCategoriesSlice, type CategoriesSlice } from "./slices/categoriesSlice";
import { createBudgetSlice, type BudgetSlice } from "./slices/budgetSlice";
import {
  createPaymentsSlice,
  type PaymentsSlice,
  type PaymentMethod,
  type PaymentMethodType,
} from "./slices/paymentsSlice";
import { createGoalsSlice, type GoalsSlice, type SavingsGoal } from "./slices/goalsSlice";
import { createDebtsSlice, type DebtsSlice, type Debt } from "./slices/debtsSlice";
import { createPrefsSlice, type PrefsSlice, type DarkModeOption } from "./slices/prefsSlice";
import { createNotificationsSlice, type NotificationsSlice } from "./slices/notificationsSlice";

// ─── Re-exportar tipos públicos (sin cambios para los importadores) ────────────

export type { DarkModeOption, PaymentMethodType, PaymentMethod, SavingsGoal, Debt };

// ─── Tipo combinado del store ─────────────────────────────────────────────────

export type SettingsState = CategoriesSlice &
  BudgetSlice &
  PaymentsSlice &
  GoalsSlice &
  DebtsSlice &
  PrefsSlice &
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
      ...createDebtsSlice(...a),
      ...createPrefsSlice(...a),
      ...createNotificationsSlice(...a),
    }),
    {
      name: "mywallet-settings",
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: (persisted, version) => {
        const state = persisted as Record<string, unknown>;
        // v0 → v1: el antiguo "Ingreso mensual" (monthlyBudget) pasa a ser el pago
        // esperado del período predeterminado, que en v0 siempre era mensual.
        if (version < 1) {
          const monthly = typeof state.monthlyBudget === "number" ? state.monthlyBudget : 0;
          const period = (state.defaultPeriod as PeriodCadence | undefined) ?? DEFAULT_CADENCE;
          if (monthly > 0 && period.type !== "semimonthly" && !period.pay) {
            state.defaultPeriod = { ...period, pay: monthly };
          }
          delete state.monthlyBudget;
        }
        return state as unknown as SettingsState;
      },
    },
  ),
);
