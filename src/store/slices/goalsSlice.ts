import type { StateCreator } from "zustand";
import { localISOString } from "@/src/db/db";

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  createdAt: string;
}

export interface GoalsSlice {
  savingsGoals: SavingsGoal[];

  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "createdAt">) => void;
  updateSavingsGoal: (id: string, saved: number) => void;
  removeSavingsGoal: (id: string) => void;
}

export const createGoalsSlice: StateCreator<GoalsSlice, [], [], GoalsSlice> = (set) => ({
  savingsGoals: [],

  addSavingsGoal: (goal) =>
    set((s) => ({
      savingsGoals: [
        ...s.savingsGoals,
        { ...goal, id: Date.now().toString(), createdAt: localISOString() },
      ],
    })),

  updateSavingsGoal: (id, saved) =>
    set((s) => ({
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === id ? { ...g, savedAmount: Math.max(0, saved) } : g,
      ),
    })),

  removeSavingsGoal: (id) =>
    set((s) => ({ savingsGoals: s.savingsGoals.filter((g) => g.id !== id) })),
});
