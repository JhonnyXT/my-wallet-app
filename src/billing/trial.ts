// Prueba de Pro SIMULADA (todavía no hay Google Play ni RevenueCat). Funciones puras, con tests.
// Cuando exista RevenueCat, la fuente de verdad pasa a ser la suscripción de la tienda y esto
// se reemplaza. `trialStartedAt` es epoch ms (como `updatedAt`: se compara, nunca se muestra).
import { TRIAL_DAYS } from "./plans";

const DAY_MS = 86_400_000;

export function trialEndsAt(startedAt: number): number {
  return startedAt + TRIAL_DAYS * DAY_MS;
}

export function isTrialActive(startedAt: number | null, now: number): boolean {
  return startedAt !== null && now < trialEndsAt(startedAt);
}

/** Días que quedan (redondeo hacia arriba: con 3 horas restantes aún dice "1 día"). */
export function trialDaysLeft(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  return Math.max(0, Math.ceil((trialEndsAt(startedAt) - now) / DAY_MS));
}

/** Inicio de prueba ya vencido, para "Simular fin de la prueba" en dev/test. */
export function expiredTrialStart(now: number): number {
  return now - (TRIAL_DAYS + 1) * DAY_MS;
}
