import type { StateCreator } from "zustand";

export interface NotificationsSlice {
  notificationsEnabled: boolean;
  /** Alertas de presupuesto activadas (independiente del permiso global) */
  budgetAlertsEnabled:  boolean;
  /** Umbral de alerta de presupuesto en % (0-100). Notifica cuando se supera este valor */
  budgetAlertThreshold: number;
  /** emoji → "YYYY-MM" (último mes en que se notificó sobre ese presupuesto) */
  budgetNotifiedMonth:  Record<string, string>;
  /** IDs de metas ya notificadas como cumplidas */
  goalNotifiedIds:      string[];

  setNotificationsEnabled:       (enabled: boolean) => void;
  setBudgetAlertsEnabled:        (enabled: boolean) => void;
  setBudgetAlertThreshold:       (threshold: number) => void;
  markBudgetNotified:            (emoji: string, month: string) => void;
  markGoalNotified:              (goalId: string) => void;
  clearExpiredBudgetNotifications: () => void;
}

export const createNotificationsSlice: StateCreator<NotificationsSlice, [], [], NotificationsSlice> = (set) => ({
  notificationsEnabled: false,
  budgetAlertsEnabled:  false,
  budgetAlertThreshold: 80,   // recomendado: avisa al 80%; el usuario puede cambiarlo

  budgetNotifiedMonth:  {},
  goalNotifiedIds:      [],

  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
  setBudgetAlertsEnabled:  (enabled) => set((s) => ({
    budgetAlertsEnabled: enabled,
    // Al activar las alertas, limpiar el historial para que se re-evalúe
    budgetNotifiedMonth: enabled ? {} : s.budgetNotifiedMonth,
  })),
  setBudgetAlertThreshold: (threshold) =>
    set((s) => ({
      budgetAlertThreshold: Math.min(100, Math.max(0, Math.round(threshold))),
      // Al cambiar el umbral, limpiar las notificaciones del mes para re-evaluar
      budgetNotifiedMonth: {},
    })),

  markBudgetNotified: (emoji, month) =>
    set((s) => ({ budgetNotifiedMonth: { ...s.budgetNotifiedMonth, [emoji]: month } })),

  markGoalNotified: (goalId) =>
    set((s) => ({ goalNotifiedIds: [...s.goalNotifiedIds, goalId] })),

  clearExpiredBudgetNotifications: () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    set((s) => {
      const cleaned: Record<string, string> = {};
      for (const [emoji, month] of Object.entries(s.budgetNotifiedMonth)) {
        if (month === currentMonth) cleaned[emoji] = month;
      }
      return { budgetNotifiedMonth: cleaned };
    });
  },
});
