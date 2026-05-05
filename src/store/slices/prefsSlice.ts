import type { StateCreator } from "zustand";

export type DarkModeOption = "system" | "light" | "dark";

export interface PrefsSlice {
  userName: string;
  darkMode: DarkModeOption;

  setUserName: (name: string) => void;
  setDarkMode: (mode: DarkModeOption) => void;
}

export const createPrefsSlice: StateCreator<PrefsSlice, [], [], PrefsSlice> = (set) => ({
  userName: "",
  darkMode: "system",

  setUserName: (name) => set({ userName: name }),
  setDarkMode: (mode) => set({ darkMode: mode }),
});
