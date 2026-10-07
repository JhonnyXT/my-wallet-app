/**
 * PaywallSheet — hoja de planes de MyWallet Pro (prueba de 14 días, mensual y anual). Una sola,
 * montada en la raíz (BillingHost) y abierta con `openPaywall(feature?)` desde Ajustes o desde
 * cualquier función bloqueada.
 *
 * HOY el cobro es SIMULADO: no hay Google Play ni RevenueCat todavía. En dev/test "Suscribirme"
 * activa Pro sin cobrar (para probar); en prod queda desactivado hasta que exista la tienda.
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Crown } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { useSheetPadding } from "@/src/components/ui/SheetParts";
import {
  ANNUAL_SAVINGS_PCT,
  FEATURE_PITCH,
  PRICES_COP,
  PRO_PERKS,
  TRIAL_DAYS,
  useEntitlement,
  useEntitlementStore,
  usePaywallStore,
  type BillingPeriod,
} from "@/src/billing";
import { isProd } from "@/src/constants/appVariant";
import { useAppTokens } from "@/src/theme/tokens";
import { formatCOP } from "@/src/utils/formatMoney";

const PRIMARY = "#135BEC";

export function PaywallSheet() {
  const tokens = useAppTokens();
  const c = tokens.colors;
  const padding = useSheetPadding();
  const { visible, feature, close } = usePaywallStore();
  const { isSubscribed, inTrial, daysLeft, canStartTrial } = useEntitlement();
  const startProTrial = useEntitlementStore((s) => s.startProTrial);
  const subscribePro = useEntitlementStore((s) => s.subscribePro);
  const [period, setPeriod] = useState<BillingPeriod>("annual");

  useEffect(() => {
    if (visible) setPeriod("annual");
  }, [visible]);

  const price = PRICES_COP[period];
  const perPeriod = period === "monthly" ? "mes" : "año";

  const onStartTrial = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startProTrial();
    close();
  };
  const onSubscribe = () => {
    if (isProd) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    subscribePro();
    close();
  };

  const subtitle = isSubscribed
    ? "Ya tienes Pro. ¡Gracias por apoyar MyWallet!"
    : inTrial
      ? `Estás probando Pro: te ${daysLeft === 1 ? "queda 1 día" : `quedan ${daysLeft} días`}.`
      : feature
        ? FEATURE_PITCH[feature]
        : "Respalda en la nube y comparte listas con quien quieras.";

  const periodCard = (key: BillingPeriod, title: string, badge?: string) => {
    const selected = period === key;
    return (
      <PressableScale
        key={key}
        onPress={() => {
          Haptics.selectionAsync();
          setPeriod(key);
        }}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        style={[
          styles.periodCard,
          {
            backgroundColor: selected ? c.accent.subtle : c.surface.elevated,
            borderColor: selected ? PRIMARY : "transparent",
          },
        ]}
      >
        {badge ? (
          <View style={[styles.badge, { backgroundColor: PRIMARY }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
        <Text style={[styles.periodTitle, { color: c.text.secondary }]}>{title}</Text>
        <Text style={[styles.periodPrice, { color: c.text.primary }]}>
          {formatCOP(PRICES_COP[key])}
        </Text>
        <Text style={[styles.periodUnit, { color: c.text.secondary }]}>
          COP / {key === "monthly" ? "mes" : "año"}
        </Text>
      </PressableScale>
    );
  };

  return (
    <BottomSheet visible={visible} onClose={close} style={padding}>
      <View style={styles.header}>
        <View style={styles.hero}>
          <Crown size={26} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={[styles.title, { color: c.text.primary }]}>MyWallet Pro</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>{subtitle}</Text>
      </View>

      <View style={[styles.perksCard, { backgroundColor: c.surface.secondary }]}>
        {PRO_PERKS.map((perk, i) => (
          <View key={perk.title}>
            {i > 0 && (
              <View style={[styles.perkDivider, { backgroundColor: c.border.default }]} />
            )}
            <View style={styles.perkRow}>
              <View style={[styles.perkEmoji, { backgroundColor: c.surface.elevated }]}>
                <Text style={{ fontSize: 20 }}>{perk.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.perkTitle, { color: c.text.primary }]}>{perk.title}</Text>
                <Text style={[styles.perkDesc, { color: c.text.secondary }]}>
                  {perk.description}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {!isSubscribed && (
        <>
          <View style={styles.periods}>
            {periodCard("monthly", "Mensual")}
            {periodCard("annual", "Anual", `Ahorra ${ANNUAL_SAVINGS_PCT}%`)}
          </View>

          {canStartTrial ? (
            <PressableScale
              onPress={onStartTrial}
              style={[styles.cta, { backgroundColor: PRIMARY }]}
              accessibilityRole="button"
            >
              <Text style={styles.ctaText}>Probar {TRIAL_DAYS} días gratis</Text>
            </PressableScale>
          ) : (
            <PressableScale
              onPress={onSubscribe}
              disabled={isProd}
              style={[styles.cta, { backgroundColor: PRIMARY }, isProd && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityState={{ disabled: isProd }}
            >
              <Text style={styles.ctaText}>
                {isProd ? "Próximamente en Google Play" : "Suscribirme"}
              </Text>
            </PressableScale>
          )}

          <Text style={[styles.fine, { color: c.text.secondary }]}>
            {canStartTrial
              ? `Después, ${formatCOP(price)} COP al ${perPeriod}. Sin cobro por ahora: la suscripción llegará con Google Play.`
              : isProd
                ? "El pago llegará con Google Play. Mientras tanto sigues con el plan gratuito."
                : "Modo de pruebas: no se cobra nada."}
          </Text>
        </>
      )}

      <PressableScale
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          close();
        }}
        style={[styles.secondary, { backgroundColor: c.surface.secondary }]}
        accessibilityRole="button"
      >
        <Text style={[styles.secondaryText, { color: c.text.primary }]}>
          {isSubscribed ? "Cerrar" : "Ahora no"}
        </Text>
      </PressableScale>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", paddingBottom: 18 },
  hero: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: { fontSize: 24, fontWeight: "800", letterSpacing: -0.4, textAlign: "center" },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 12,
  },
  perksCard: { borderRadius: 20, paddingVertical: 4, paddingHorizontal: 14 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  perkDivider: { height: StyleSheet.hairlineWidth, marginLeft: 56 },
  perkEmoji: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  perkTitle: { fontSize: 15, fontWeight: "700" },
  perkDesc: { fontSize: 13, lineHeight: 18, marginTop: 1 },
  periods: { flexDirection: "row", gap: 12, marginTop: 24 },
  periodCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: -10,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  periodTitle: { fontSize: 13, fontWeight: "600" },
  periodPrice: { fontSize: 22, fontWeight: "800", marginTop: 4, letterSpacing: -0.5 },
  periodUnit: { fontSize: 12, marginTop: 2 },
  cta: {
    marginTop: 18,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  fine: { fontSize: 12, lineHeight: 17, textAlign: "center", marginTop: 10 },
  secondary: {
    marginTop: 14,
    height: 50,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { fontSize: 15, fontWeight: "600" },
});
