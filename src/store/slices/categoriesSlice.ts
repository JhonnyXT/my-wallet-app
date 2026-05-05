import type { StateCreator } from "zustand";
import type { UserCategory } from "@/src/constants/categoryPresets";

export interface CategoriesSlice {
  userCategories: UserCategory[];
  hasSelectedCategories: boolean;

  setUserCategories:   (cats: UserCategory[]) => void;
  addUserCategory:     (cat: UserCategory) => void;
  removeUserCategory:  (id: string) => void;
  updateUserCategory:  (id: string, partial: Partial<UserCategory>) => void;
  completeCategories:  () => void;

  // Onboarding (fuertemente acoplado a categorías)
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  setOnboardingStep:  (step: number) => void;
  completeOnboarding: () => void;
}

export const createCategoriesSlice: StateCreator<CategoriesSlice, [], [], CategoriesSlice> = (set) => ({
  userCategories:         [],
  hasSelectedCategories:  false,
  hasCompletedOnboarding: false,
  onboardingStep:         0,

  setUserCategories: (cats) => set({ userCategories: cats }),
  addUserCategory:   (cat)  => set((s) => ({ userCategories: [...s.userCategories, cat] })),
  removeUserCategory:(id)   => set((s) => ({ userCategories: s.userCategories.filter((c) => c.id !== id) })),
  updateUserCategory:(id, partial) =>
    set((s) => ({
      userCategories: s.userCategories.map((c) => c.id === id ? { ...c, ...partial } : c),
    })),
  completeCategories: () => set({ hasSelectedCategories: true }),

  setOnboardingStep:  (step) => set({ onboardingStep: step }),
  completeOnboarding: ()     => set({ hasCompletedOnboarding: true, onboardingStep: 5 }),
});
