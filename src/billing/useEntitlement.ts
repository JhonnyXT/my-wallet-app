// Hook para pantallas: plan actual, si hay prueba en curso y cuántos días quedan.
import { useMemo } from "react";
import { hasPro } from "./entitlement";
import { isTrialActive, trialDaysLeft } from "./trial";
import { useEntitlementStore } from "./useEntitlementStore";

export function useEntitlement() {
  const plan = useEntitlementStore((s) => s.plan);
  const trialStartedAt = useEntitlementStore((s) => s.trialStartedAt);
  const trialUsed = useEntitlementStore((s) => s.trialUsed);

  return useMemo(() => {
    const now = Date.now();
    const inTrial = plan !== "pro" && isTrialActive(trialStartedAt, now);
    return {
      plan,
      isPro: hasPro({ plan, trialStartedAt }, now),
      isSubscribed: plan === "pro",
      inTrial,
      daysLeft: inTrial ? trialDaysLeft(trialStartedAt, now) : 0,
      /** La prueba gratis se ofrece una sola vez. */
      canStartTrial: !trialUsed && plan !== "pro",
    };
  }, [plan, trialStartedAt, trialUsed]);
}
