import type { StateCreator } from "zustand";

/**
 * Registro de borrados de los ajustes que se sincronizan (SYNC_ROADMAP.md, T6). Los arreglos
 * (`lists`, `paymentMethods`, `savingsGoals`, `debts`) guardan solo lo vivo, así ningún consumidor
 * tiene que filtrar borrados; la sync lee de aquí qué avisar a los otros teléfonos.
 */
export type TombstoneKind = "lists" | "paymentMethods" | "savingsGoals" | "debts";

/** id → cuándo se borró (epoch ms), por colección. */
export type Tombstones = Record<TombstoneKind, Record<string, number>>;

export const EMPTY_TOMBSTONES: Tombstones = {
  lists: {},
  paymentMethods: {},
  savingsGoals: {},
  debts: {},
};

export function addTombstone(
  tombstones: Tombstones,
  kind: TombstoneKind,
  id: string,
  now: number,
): Tombstones {
  return { ...tombstones, [kind]: { ...tombstones[kind], [id]: now } };
}

export interface TombstonesSlice {
  tombstones: Tombstones;
}

export const createTombstonesSlice: StateCreator<
  TombstonesSlice,
  [],
  [],
  TombstonesSlice
> = () => ({
  tombstones: EMPTY_TOMBSTONES,
});
