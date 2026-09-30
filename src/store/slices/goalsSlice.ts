import type { StateCreator } from "zustand";
import { localISOString } from "@/src/db/db";
import { newId } from "@/src/utils/ids";
import { addTombstone, type TombstonesSlice } from "./tombstonesSlice";

export interface SavingsGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  savedAmount: number;
  createdAt: string;
  /** Última edición, epoch ms (sync). */
  updatedAt: number;
}

export interface GoalsSlice {
  savingsGoals: SavingsGoal[];

  addSavingsGoal: (goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">) => void;
  /** Actualiza el monto ahorrado (flujo "Abonar") — no toca nombre/emoji/meta. */
  updateSavingsGoal: (id: string, saved: number) => void;
  /** Edita los datos de la meta (nombre/emoji/monto objetivo) — no toca el ahorro acumulado. */
  editSavingsGoal: (
    id: string,
    updates: Partial<Pick<SavingsGoal, "name" | "emoji" | "targetAmount">>,
  ) => void;
  removeSavingsGoal: (id: string) => void;
}

export const createGoalsSlice: StateCreator<GoalsSlice & TombstonesSlice, [], [], GoalsSlice> = (
  set,
) => ({
  savingsGoals: [],

  addSavingsGoal: (goal) =>
    set((s) => ({
      savingsGoals: [
        ...s.savingsGoals,
        { ...goal, id: newId(), createdAt: localISOString(), updatedAt: Date.now() },
      ],
    })),

  updateSavingsGoal: (id, saved) =>
    set((s) => ({
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === id ? { ...g, savedAmount: Math.max(0, saved), updatedAt: Date.now() } : g,
      ),
    })),

  editSavingsGoal: (id, updates) =>
    set((s) => ({
      savingsGoals: s.savingsGoals.map((g) =>
        g.id === id ? { ...g, ...updates, updatedAt: Date.now() } : g,
      ),
    })),

  removeSavingsGoal: (id) =>
    set((s) => ({
      savingsGoals: s.savingsGoals.filter((g) => g.id !== id),
      tombstones: addTombstone(s.tombstones, "savingsGoals", id, Date.now()),
    })),
});
