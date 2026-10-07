// Planes de MyWallet: precios, duración de la prueba y qué incluye Pro. Fuente única para el
// paywall, la slide del onboarding y Ajustes (los precios reales se configuran en Play Console).

export type PlanTier = "free" | "pro";
export type BillingPeriod = "monthly" | "annual";
/** Funciones que exigen Pro. Se consultan siempre con `canUse()` (src/billing/entitlement.ts). */
export type ProFeature = "cloudBackup" | "sharedSpaces" | "recurringExpenses";

export const TRIAL_DAYS = 14;

/** Precios en COP (Play Console permite precios por país; US$ de referencia: 3.99 / 24.99). */
export const PRICES_COP: Record<BillingPeriod, number> = {
  monthly: 14900,
  annual: 99900,
};

/** Porcentaje que se ahorra pagando el año completo frente a 12 meses mensuales. */
export const ANNUAL_SAVINGS_PCT = Math.round(
  (1 - PRICES_COP.annual / (PRICES_COP.monthly * 12)) * 100,
);

export interface ProPerk {
  emoji: string;
  title: string;
  description: string;
}

export const PRO_PERKS: ProPerk[] = [
  {
    emoji: "☁️",
    title: "Respaldo en la nube",
    description: "Tus movimientos a salvo y al día en todos tus dispositivos.",
  },
  {
    emoji: "👥",
    title: "Espacios compartidos",
    description: "Registra gastos con tu pareja, familia o amigos en la misma lista.",
  },
  {
    emoji: "✨",
    title: "Lo nuevo, primero",
    description: "Las funciones avanzadas que vienen en camino se suman a Pro.",
  },
];

/** Texto corto de por qué se muestra el paywall según la función bloqueada. */
export const FEATURE_PITCH: Record<ProFeature, string> = {
  cloudBackup: "El respaldo en la nube es parte de Pro.",
  sharedSpaces: "Compartir listas con otras personas es parte de Pro.",
  recurringExpenses: "Los gastos e ingresos recurrentes son parte de Pro.",
};
