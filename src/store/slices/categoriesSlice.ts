import type { StateCreator } from "zustand";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { touchList, type ListsSlice } from "./listsSlice";
import type { PrefsSlice } from "./prefsSlice";

export interface CategoriesSlice {
  userCategories: UserCategory[];
  hasSelectedCategories: boolean;

  setUserCategories: (cats: UserCategory[]) => void;
  addUserCategory: (cat: UserCategory) => void;
  removeUserCategory: (id: string) => void;
  updateUserCategory: (id: string, partial: Partial<UserCategory>) => void;
  completeCategories: () => void;

  // Onboarding (fuertemente acoplado a categorías)
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
}

// Las categorías vivas son las de la lista activa (patrón de intercambio): editarlas es editarla.
// En un espacio compartido las categorías son de todos (lo compartido, spec Fase 4 D2).
const touchActive = (s: ListsSlice) => ({
  lists: touchList(s.lists, s.activeListId, Date.now(), true),
});

export const createCategoriesSlice: StateCreator<
  CategoriesSlice & ListsSlice & PrefsSlice,
  [],
  [],
  CategoriesSlice
> = (set) => ({
  userCategories: [],
  hasSelectedCategories: false,
  hasCompletedOnboarding: false,
  onboardingStep: 0,

  setUserCategories: (cats) => set((s) => ({ userCategories: cats, ...touchActive(s) })),
  addUserCategory: (cat) =>
    set((s) => ({ userCategories: [...s.userCategories, cat], ...touchActive(s) })),
  removeUserCategory: (id) =>
    set((s) => ({
      userCategories: s.userCategories.filter((c) => c.id !== id),
      ...touchActive(s),
    })),
  updateUserCategory: (id, partial) =>
    set((s) => ({
      userCategories: s.userCategories.map((c) => (c.id === id ? { ...c, ...partial } : c)),
      ...touchActive(s),
    })),
  // El onboarding hecho se respalda (perfil): al restaurar no se repite.
  completeCategories: () => set({ hasSelectedCategories: true, profileUpdatedAt: Date.now() }),

  setOnboardingStep: (step) => set({ onboardingStep: step }),
  completeOnboarding: () =>
    set({ hasCompletedOnboarding: true, onboardingStep: 5, profileUpdatedAt: Date.now() }),
});
