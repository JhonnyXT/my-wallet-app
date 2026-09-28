import type { StateCreator } from "zustand";
import { DEFAULT_CADENCE, type PeriodCadence } from "@/src/utils/periodCycles";

export type DarkModeOption = "system" | "light" | "dark";

export interface PrefsSlice {
  userName: string;
  darkMode: DarkModeOption;
  /** Pide huella/rostro/PIN del sistema al abrir la app y al volver de background. */
  biometricLockEnabled: boolean;
  /** Cómo se corta el tiempo en el Dashboard (y el ciclo del presupuesto si es mensual). */
  defaultPeriod: PeriodCadence;

  setUserName: (name: string) => void;
  setDarkMode: (mode: DarkModeOption) => void;
  setBiometricLockEnabled: (enabled: boolean) => void;
  setDefaultPeriod: (cadence: PeriodCadence) => void;
}

export const createPrefsSlice: StateCreator<PrefsSlice, [], [], PrefsSlice> = (set) => ({
  userName: "",
  darkMode: "system",
  biometricLockEnabled: false,
  defaultPeriod: DEFAULT_CADENCE,

  setUserName: (name) => set({ userName: name }),
  setDarkMode: (mode) => set({ darkMode: mode }),
  setBiometricLockEnabled: (enabled) => set({ biometricLockEnabled: enabled }),
  setDefaultPeriod: (cadence) => set({ defaultPeriod: cadence }),
});
