import type { StateCreator } from "zustand";

export interface NotificationsSlice {
  notificationsEnabled: boolean;
  /** emoji → "YYYY-MM" (último mes en que se notificó sobre ese presupuesto) */
  budgetNotifiedMonth:  Record<string, string>;
  /** IDs de metas ya notificadas como cumplidas */
  goalNotifiedIds:      string[];

  setNotificationsEnabled:       (enabled: boolean) => void;
  markBudgetNotified:            (emoji: string, month: string) => void;
  markGoalNotified:              (goalId: string) => void;
  clearExpiredBudgetNotifications: () => void;
}

export const createNotificationsSlice: StateCreator<NotificationsSlice, [], [], NotificationsSlice> = (set) => ({
  notificationsEnabled: false,
  budgetNotifiedMonth:  {},
  goalNotifiedIds:      [],

  setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

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
