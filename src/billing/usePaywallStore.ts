// Estado de la hoja del paywall (una sola, montada en la raíz): cualquier pantalla puede pedirla
// con `openPaywall(feature?)` cuando el usuario toca algo que es de Pro.
import { create } from "zustand";
import type { ProFeature } from "./plans";

interface PaywallState {
  visible: boolean;
  /** Función que lo disparó (para explicar por qué se muestra); null = desde Ajustes. */
  feature: ProFeature | null;
  open: (feature?: ProFeature | null) => void;
  close: () => void;
}

export const usePaywallStore = create<PaywallState>((set) => ({
  visible: false,
  feature: null,
  open: (feature = null) => set({ visible: true, feature }),
  close: () => set({ visible: false }),
}));

export const openPaywall = (feature?: ProFeature | null) =>
  usePaywallStore.getState().open(feature ?? null);
