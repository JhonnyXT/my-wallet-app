/**
 * Ajustes → PLAN: en qué plan estás (Free, prueba de Pro o Pro), con acceso al paywall para
 * probar Pro 14 días o suscribirse. En dev/test suma los controles de simulación (fin de prueba,
 * volver a Free, reiniciar) porque todavía no hay Google Play: el pago es simulado.
 */
import { Crown, RotateCcw, Timer, Undo2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppTokens } from "@/src/theme/tokens";
import { Card, Divider } from "@/src/components/ui/Card";
import { ListRow } from "@/src/components/ui/ListRow";
import { TRIAL_DAYS, openPaywall, useEntitlement, useEntitlementStore } from "@/src/billing";
import { isDev, isTest } from "@/src/constants/appVariant";

const PRO_COLOR = "#7C3AED";

export function PlanSection() {
  const tokens = useAppTokens();
  const { isSubscribed, inTrial, daysLeft, canStartTrial } = useEntitlement();
  const simulateTrialExpired = useEntitlementStore((s) => s.simulateTrialExpired);
  const setFree = useEntitlementStore((s) => s.setFree);
  const resetEntitlement = useEntitlementStore((s) => s.resetEntitlement);

  const label = isSubscribed
    ? "MyWallet Pro"
    : inTrial
      ? "Prueba de Pro"
      : canStartTrial
        ? "Probar Pro gratis"
        : "Mejorar a Pro";
  const detail = isSubscribed
    ? "Activo"
    : inTrial
      ? daysLeft === 1
        ? "1 día"
        : `${daysLeft} días`
      : canStartTrial
        ? `${TRIAL_DAYS} días`
        : "Plan gratuito";

  const inset = tokens.spacing.md * 2 + 34;
  const simulate = isDev || isTest;
  const light = (fn: () => void) => () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fn();
  };

  return (
    <Card padded={false}>
      <ListRow
        label={label}
        detail={detail}
        icon={<Crown size={16} color="#FFFFFF" strokeWidth={2} />}
        iconBg={PRO_COLOR}
        showChevron
        onPress={() => openPaywall(null)}
      />
      {simulate && (
        <>
          <Divider inset={inset} />
          <ListRow
            label="Simular fin de prueba"
            detail="Pruebas"
            icon={<Timer size={16} color="#FFFFFF" strokeWidth={2} />}
            iconBg={tokens.colors.text.secondary}
            onPress={light(simulateTrialExpired)}
          />
          <Divider inset={inset} />
          <ListRow
            label="Volver a Free"
            detail="Pruebas"
            icon={<Undo2 size={16} color="#FFFFFF" strokeWidth={2} />}
            iconBg={tokens.colors.text.secondary}
            onPress={light(setFree)}
          />
          <Divider inset={inset} />
          <ListRow
            label="Reiniciar plan"
            detail="Pruebas"
            icon={<RotateCcw size={16} color="#FFFFFF" strokeWidth={2} />}
            iconBg={tokens.colors.text.secondary}
            onPress={light(resetEntitlement)}
          />
        </>
      )}
    </Card>
  );
}
