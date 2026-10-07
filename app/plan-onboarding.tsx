/**
 * Onboarding paso 5 (último): "Elige cómo empezar". MyWallet es gratis para lo esencial; Pro suma
 * respaldo en la nube y espacios compartidos. Se puede probar 14 días sin cobro o seguir gratis, y
 * cambiarlo cuando quieras en Ajustes → Plan. La prueba es simulada hasta que exista Google Play.
 */
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronLeft, Crown } from "lucide-react-native";
import { PRICES_COP, PRO_PERKS, TRIAL_DAYS, useEntitlementStore } from "@/src/billing";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { formatCOP } from "@/src/utils/formatMoney";

const ACCENT = "#135BEC";

export default function PlanOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const st = useMemo(() => buildStyles(theme), [theme]);
  const startProTrial = useEntitlementStore((s) => s.startProTrial);

  // El flujo de onboarding llega aquí con la pila [category-onboarding, pay-onboarding,
  // notification-onboarding, bank-selection-onboarding, plan-onboarding] (cada paso hace `push`,
  // no `replace`, para que "atrás" funcione). Un `replace` simple solo reemplazaría este último
  // escalón, dejando "(tabs)" apilado ENCIMA de los pasos anteriores en vez de como raíz — y el
  // siguiente `router.dismissAll()` (ej. al guardar un gasto) volvería al onboarding.
  // `dismissAll()` colapsa la pila a su base y el `replace` deja "(tabs)" como única pantalla.
  const goToApp = useCallback(() => {
    router.dismissAll();
    router.replace("/(tabs)");
  }, [router]);

  const handleTrial = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    startProTrial();
    goToApp();
  }, [startProTrial, goToApp]);

  return (
    <SafeAreaView style={st.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <Pressable
        style={st.backBtn}
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Volver"
      >
        <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
      </Pressable>

      <ScrollView
        contentContainerStyle={st.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={st.hero}>
          <Crown size={34} color="#FFFFFF" strokeWidth={2} />
        </View>
        <Text style={st.title}>Elige cómo empezar</Text>
        <Text style={st.subtitle}>
          MyWallet es gratis para lo esencial: registrar, presupuestos, metas, deudas y detección
          de movimientos bancarios. Pro suma lo que vive en la nube.
        </Text>

        <View style={st.perksCard}>
          {PRO_PERKS.map((perk, i) => (
            <View key={perk.title}>
              {i > 0 && <View style={st.perkDivider} />}
              <View style={st.perkRow}>
                <View style={st.perkEmoji}>
                  <Text style={{ fontSize: 22 }}>{perk.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.perkTitle}>{perk.title}</Text>
                  <Text style={st.perkDesc}>{perk.description}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        <Text style={st.price}>
          Después de la prueba: {formatCOP(PRICES_COP.monthly)} al mes o{" "}
          {formatCOP(PRICES_COP.annual)} al año (COP)
        </Text>
      </ScrollView>

      <View style={st.footer}>
        <Pressable style={st.primaryBtn} onPress={handleTrial} accessibilityRole="button">
          <Text style={st.primaryText}>Probar Pro {TRIAL_DAYS} días gratis</Text>
        </Pressable>
        <Pressable style={st.skipBtn} onPress={goToApp} accessibilityRole="button">
          <Text style={st.skipText}>Seguir con el plan gratuito</Text>
        </Pressable>
        <Text style={st.fine}>
          Sin cobro por ahora. Puedes cambiar de plan cuando quieras en Ajustes → Plan.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 20,
      marginTop: 14,
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 1 },
      elevation: t.isDark ? 0 : 2,
    },
    // Contenido centrado (horizontal y verticalmente) en el espacio entre "atrás" y los botones.
    scroll: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
      paddingVertical: 16,
    },
    hero: {
      width: 72,
      height: 72,
      borderRadius: 22,
      backgroundColor: ACCENT,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 22,
      shadowColor: ACCENT,
      shadowOpacity: t.isDark ? 0.5 : 0.3,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      textAlign: "center",
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 14,
      color: t.textSub,
      lineHeight: 21,
      textAlign: "center",
      marginBottom: 24,
    },
    perksCard: {
      alignSelf: "stretch",
      backgroundColor: t.isDark ? t.itemBg : t.surface,
      borderRadius: 24,
      paddingVertical: 6,
      paddingHorizontal: 16,
    },
    perkRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14 },
    perkDivider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 62 },
    perkEmoji: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.isDark ? t.bg : t.inputBg,
    },
    perkTitle: { fontSize: 15, fontWeight: "700", color: t.text },
    perkDesc: { fontSize: 13, lineHeight: 18, color: t.textSub, marginTop: 2 },
    price: {
      fontSize: 13,
      lineHeight: 19,
      color: t.textSub,
      textAlign: "center",
      marginTop: 22,
    },
    footer: { paddingHorizontal: 28, paddingBottom: 12, paddingTop: 8, alignItems: "stretch" },
    primaryBtn: {
      backgroundColor: ACCENT,
      borderRadius: 9999,
      paddingVertical: 16,
      alignItems: "center",
      shadowColor: ACCENT,
      shadowOpacity: t.isDark ? 0 : 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: t.isDark ? 0 : 4,
    },
    primaryText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    skipBtn: { paddingVertical: 16, alignItems: "center" },
    skipText: { fontSize: 14, fontWeight: "600", color: t.textSub },
    fine: { fontSize: 12, lineHeight: 17, color: t.textSub, textAlign: "center" },
  });
}
