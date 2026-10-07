// Lectura del plan SIN React: la usan el motor de sync y las acciones de espacios. Las pantallas
// usan `useEntitlement()` (./useEntitlement.ts). Una sola función decide qué es Pro: `hasPro`.
import type { ProFeature } from "./plans";
import { isTrialActive } from "./trial";
import { useEntitlementStore, type EntitlementState } from "./useEntitlementStore";

type PlanFields = Pick<EntitlementState, "plan" | "trialStartedAt">;

/** Pro = suscripción activa (simulada) o prueba de 14 días en curso. */
export function hasPro(s: PlanFields, now: number = Date.now()): boolean {
  return s.plan === "pro" || isTrialActive(s.trialStartedAt, now);
}

/** Hoy todas las funciones de Pro se habilitan juntas; el `feature` deja listo gatear por separado. */
export function canUse(_feature: ProFeature, now: number = Date.now()): boolean {
  return hasPro(useEntitlementStore.getState(), now);
}

/**
 * Espera a que `persist` rehidrate el plan desde AsyncStorage. Sin esto, una sincronización que
 * arranca con la app vería "Free" por un instante y se saltaría la subida de un usuario Pro.
 */
export async function waitForEntitlementHydration(): Promise<void> {
  if (useEntitlementStore.persist.hasHydrated()) return;
  await new Promise<void>((resolve) => {
    const unsub = useEntitlementStore.persist.onFinishHydration(() => {
      unsub();
      resolve();
    });
    setTimeout(resolve, 1500);
  });
}
