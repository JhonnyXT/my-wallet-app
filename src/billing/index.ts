// API pública de la capa de planes. Pantallas y sync importan de aquí.
export {
  ANNUAL_SAVINGS_PCT,
  FEATURE_PITCH,
  PRICES_COP,
  PRO_PERKS,
  TRIAL_DAYS,
  type BillingPeriod,
  type PlanTier,
  type ProFeature,
  type ProPerk,
} from "./plans";
export { canUse, hasPro, waitForEntitlementHydration } from "./entitlement";
export { isTrialActive, trialDaysLeft } from "./trial";
export { useEntitlement } from "./useEntitlement";
export { useEntitlementStore } from "./useEntitlementStore";
export { openPaywall, usePaywallStore } from "./usePaywallStore";
