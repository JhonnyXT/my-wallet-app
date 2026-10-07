/**
 * useEntitlementStore — qué plan tiene el usuario (Free / Pro) y su prueba de 14 días.
 *
 * HOY es un estado 100% local y SIMULADO: todavía no hay Google Play ni RevenueCat. Cuando
 * exista RevenueCat, la fuente de verdad pasa a ser la suscripción de la tienda (entitlement) y
 * este store solo la cachea para leerla sin red (Regla inmutable #1). Store aparte de
 * `useSettingsStore` a propósito: no se respalda en la nube (un cliente no debe poder escribir
 * su propio plan en `users/{uid}`), y no obliga a subir `SETTINGS_VERSION`.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PlanTier } from "./plans";
import { expiredTrialStart, isTrialActive } from "./trial";

export interface EntitlementState {
  /** "pro" = suscripción pagada (simulada hoy). La prueba se calcula con `trialStartedAt`. */
  plan: PlanTier;
  /** Epoch ms del inicio de la prueba en curso; null si no hay una activa. */
  trialStartedAt: number | null;
  /** La prueba se ofrece una sola vez por instalación. */
  trialUsed: boolean;
  /** Pendiente de mostrar el aviso "tu prueba terminó". */
  trialEndedNotice: boolean;

  startProTrial: () => void;
  /** Si la prueba venció, vuelve a Free y deja el aviso pendiente. */
  expireTrialIfDue: (now?: number) => void;
  /** "Pago" simulado. Con RevenueCat esto lo reemplaza la compra real. */
  subscribePro: () => void;
  /** Vuelve a Free (solo pruebas en dev/test); conserva `trialUsed`. */
  setFree: () => void;
  dismissTrialEndedNotice: () => void;
  /** Solo dev/test: vence la prueba ya (como si pasara al abrir la app) y deja el aviso pendiente. */
  simulateTrialExpired: () => void;
  /** Solo dev/test: borra todo, como una instalación nueva. */
  resetEntitlement: () => void;
}

const INITIAL = {
  plan: "free" as PlanTier,
  trialStartedAt: null as number | null,
  trialUsed: false,
  trialEndedNotice: false,
};

export const useEntitlementStore = create<EntitlementState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      startProTrial: () => {
        const s = get();
        if (s.trialUsed || s.plan === "pro") return;
        set({ trialStartedAt: Date.now(), trialUsed: true, trialEndedNotice: false });
      },

      expireTrialIfDue: (now = Date.now()) => {
        const { trialStartedAt } = get();
        if (trialStartedAt === null || isTrialActive(trialStartedAt, now)) return;
        set({ trialStartedAt: null, trialEndedNotice: true });
      },

      subscribePro: () =>
        set({ plan: "pro", trialStartedAt: null, trialUsed: true, trialEndedNotice: false }),

      setFree: () => set({ plan: "free", trialStartedAt: null, trialEndedNotice: false }),

      dismissTrialEndedNotice: () => set({ trialEndedNotice: false }),

      simulateTrialExpired: () => {
        set({ plan: "free", trialStartedAt: expiredTrialStart(Date.now()), trialUsed: true });
        get().expireTrialIfDue();
      },

      resetEntitlement: () => set({ ...INITIAL }),
    }),
    {
      name: "mywallet-entitlement",
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        plan: s.plan,
        trialStartedAt: s.trialStartedAt,
        trialUsed: s.trialUsed,
        trialEndedNotice: s.trialEndedNotice,
      }),
    },
  ),
);
