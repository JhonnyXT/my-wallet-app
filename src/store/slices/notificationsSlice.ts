import type { StateCreator } from "zustand";

export interface NotificationsSlice {
  notificationsEnabled: boolean;
  /** Alertas de presupuesto activadas (independiente del permiso global) */
  budgetAlertsEnabled: boolean;
  /** Umbral de alerta de presupuesto en % (0-100). Notifica cuando se supera este valor */
  budgetAlertThreshold: number;
  /** "emoji:threshold"/"emoji:overspent" → clave del ciclo de presupuesto en que se notificó
   * (fecha de inicio "YYYY-MM-DD", ver `budgetCycle()`/`cycleKey()` en periodCycles.ts) */
  budgetNotifiedMonth: Record<string, string>;
  /** IDs de metas ya notificadas como cumplidas */
  goalNotifiedIds: string[];
  /**
   * Última edición (epoch ms) de lo que se respalda de aquí: alertas activadas y umbral (sync
   * Fase 3, documento `meta/settings`). Las marcas de "ya notificado" no se respaldan.
   */
  settingsUpdatedAt: number;

  setNotificationsEnabled: (enabled: boolean) => void;
  setBudgetAlertsEnabled: (enabled: boolean) => void;
  setBudgetAlertThreshold: (threshold: number) => void;
  markBudgetNotified: (emoji: string, month: string) => void;
  markGoalNotified: (goalId: string) => void;
  /** Borra las marcas de ciclos anteriores; `currentKey` = `cycleKey(budgetCycle(...))`. */
  clearExpiredBudgetNotifications: (currentKey: string) => void;
}

export const createNotificationsSlice: StateCreator<
  NotificationsSlice,
  [],
  [],
  NotificationsSlice
> = (set) => ({
  notificationsEnabled: false,
  budgetAlertsEnabled: false,
  budgetAlertThreshold: 80, // recomendado: avisa al 80%; el usuario puede cambiarlo

  budgetNotifiedMonth: {},
  goalNotifiedIds: [],
  settingsUpdatedAt: 0,

  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  setBudgetAlertsEnabled: (enabled) =>
    set((s) => ({
      budgetAlertsEnabled: enabled,
      settingsUpdatedAt: Date.now(),
      // Al activar las alertas, limpiar el historial para que se re-evalúe
      budgetNotifiedMonth: enabled ? {} : s.budgetNotifiedMonth,
    })),
  setBudgetAlertThreshold: (threshold) =>
    set((s) => ({
      budgetAlertThreshold: Math.min(100, Math.max(0, Math.round(threshold))),
      settingsUpdatedAt: Date.now(),
      // Al cambiar el umbral, limpiar las notificaciones del mes para re-evaluar
      budgetNotifiedMonth: {},
    })),

  markBudgetNotified: (emoji, month) =>
    set((s) => ({ budgetNotifiedMonth: { ...s.budgetNotifiedMonth, [emoji]: month } })),

  markGoalNotified: (goalId) => set((s) => ({ goalNotifiedIds: [...s.goalNotifiedIds, goalId] })),

  clearExpiredBudgetNotifications: (currentKey) => {
    set((s) => {
      const cleaned: Record<string, string> = {};
      for (const [emoji, key] of Object.entries(s.budgetNotifiedMonth)) {
        if (key === currentKey) cleaned[emoji] = key;
      }
      return { budgetNotifiedMonth: cleaned };
    });
  },
});
