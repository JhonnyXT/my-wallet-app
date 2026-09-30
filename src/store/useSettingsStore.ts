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
 *   - listsSlice:          listas de transacciones separadas (Personal, un viaje…) y la activa
 *   - tombstonesSlice:     borrados de listas/métodos/metas/deudas, para la sync
 *
 * La API pública es idéntica a la versión anterior: todos los importadores
 * existentes funcionan sin cambios.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { migrateSettings, SETTINGS_VERSION } from "./settingsMigrations";

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
import {
  createListsSlice,
  type ListsSlice,
  type WalletList,
  type ListMember,
} from "./slices/listsSlice";
import { createTombstonesSlice, type TombstonesSlice } from "./slices/tombstonesSlice";

// ─── Re-exportar tipos públicos (sin cambios para los importadores) ────────────

export { PAYMENT_TYPE_EMOJI, paymentMethodEmoji } from "./slices/paymentsSlice";

export type {
  DarkModeOption,
  PaymentMethodType,
  PaymentMethod,
  SavingsGoal,
  Debt,
  WalletList,
  ListMember,
};

// ─── Tipo combinado del store ─────────────────────────────────────────────────

export type SettingsState = CategoriesSlice &
  BudgetSlice &
  PaymentsSlice &
  GoalsSlice &
  DebtsSlice &
  PrefsSlice &
  NotificationsSlice &
  ListsSlice &
  TombstonesSlice;

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
      ...createListsSlice(...a),
      ...createTombstonesSlice(...a),
    }),
    {
      name: "mywallet-settings",
      storage: createJSONStorage(() => AsyncStorage),
      version: SETTINGS_VERSION,
      migrate: (persisted, version) =>
        migrateSettings(persisted, version, Date.now()) as unknown as SettingsState,
    },
  ),
);

/**
 * Espera a que `persist` rehidrate los ajustes (tope 1.5s). `loadTransactions()` la
 * necesita para leer la lista activa real antes de la primera consulta: sin esto, un
 * cold start con otra lista activa cargaba las transacciones de Personal.
 */
export async function waitForSettingsHydration(): Promise<void> {
  if (useSettingsStore.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
    setTimeout(resolve, 1500);
  });
}
