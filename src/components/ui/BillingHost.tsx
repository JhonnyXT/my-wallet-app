/**
 * BillingHost — monta en la raíz lo global de Pro: la hoja del paywall y el aviso de "tu prueba
 * terminó". Revisa el vencimiento de la prueba al abrir la app y cada vez que vuelve a primer
 * plano (el reloj del teléfono es la única referencia mientras el plan sea simulado).
 */
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { PaywallSheet } from "@/src/components/ui/PaywallSheet";
import { openPaywall, TRIAL_DAYS, useEntitlementStore } from "@/src/billing";

// Dos Modal apilados en Android se comportan mal: el paywall se abre al terminar de cerrar el aviso.
const AFTER_CLOSE_MS = 220;

/** El plan se rehidrata async desde AsyncStorage: no se evalúa el vencimiento con el estado vacío. */
function useEntitlementHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useEntitlementStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = useEntitlementStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useEntitlementStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export function BillingHost({ enabled }: { enabled: boolean }) {
  const hydrated = useEntitlementHydrated();
  const trialEndedNotice = useEntitlementStore((s) => s.trialEndedNotice);
  const expireTrialIfDue = useEntitlementStore((s) => s.expireTrialIfDue);
  const dismissNotice = useEntitlementStore((s) => s.dismissTrialEndedNotice);

  useEffect(() => {
    if (!hydrated) return;
    expireTrialIfDue();
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") expireTrialIfDue();
    });
    return () => sub.remove();
  }, [hydrated, expireTrialIfDue]);

  return (
    <>
      <PaywallSheet />
      <ConfirmDialog
        visible={enabled && trialEndedNotice}
        variant="info"
        emoji="⏰"
        title="Tu prueba de Pro terminó"
        message={`Pasaron los ${TRIAL_DAYS} días. Volviste al plan gratuito: todo lo de tu teléfono sigue igual y tus datos están intactos. El respaldo en la nube y los espacios compartidos quedan en pausa hasta que pases a Pro.`}
        confirmLabel="Ver planes"
        cancelLabel="Seguir gratis"
        onConfirm={() => {
          dismissNotice();
          setTimeout(() => openPaywall(null), AFTER_CLOSE_MS);
        }}
        onCancel={dismissNotice}
      />
    </>
  );
}
