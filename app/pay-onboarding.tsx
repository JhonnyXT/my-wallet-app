/**
 * Onboarding paso 2: "¿Cuándo y cuánto te pagan?". Define la frecuencia del período
 * predeterminado y el pago esperado (misma lógica que la hoja "Pago y período" de
 * Ajustes, vía PayPeriodForm). Se puede omitir: queda mensual, sin pago configurado.
 */
import { useMemo } from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { PayPeriodForm } from "@/src/components/ui/PayPeriodForm";
import { useTheme } from "@/src/context/ThemeContext";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import type { AppTheme } from "@/src/theme";

const ACCENT = "#135BEC";

export default function PayOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const st = useMemo(() => buildStyles(theme), [theme]);
  const saved = useSettingsStore((s) => s.defaultPeriod);
  const setDefaultPeriod = useSettingsStore((s) => s.setDefaultPeriod);

  const next = () => router.push("/notification-onboarding");

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
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={st.title}>¿Cuándo y cuánto{"\n"}te pagan?</Text>
        <Text style={st.subtitle}>
          Así agrupamos tus movimientos por período y comparamos lo que gastas con lo que
          recibes. Puedes cambiarlo cuando quieras en Ajustes → Pago y período.
        </Text>

        <PayPeriodForm
          initial={saved}
          showHeader={false}
          showPreview={false}
          onApply={(cadence) => {
            setDefaultPeriod(cadence);
            next();
          }}
          renderActions={(apply) => (
            <View style={st.footer}>
              <Pressable style={st.skipBtn} onPress={next} accessibilityRole="button">
                <Text style={st.skipText}>Omitir</Text>
              </Pressable>
              <Pressable style={st.primaryBtn} onPress={apply} accessibilityRole="button">
                <Text style={st.primaryText}>Continuar</Text>
              </Pressable>
            </View>
          )}
        />
      </ScrollView>
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
    scroll: { paddingHorizontal: 28, paddingTop: 20, paddingBottom: 24 },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: 16,
    },
    subtitle: { fontSize: 14, color: t.textSub, lineHeight: 21, marginBottom: 8 },
    footer: { flexDirection: "row", alignItems: "center", gap: 20, marginTop: 32 },
    skipBtn: { paddingVertical: 16, paddingHorizontal: 4 },
    skipText: { fontSize: 14, fontWeight: "600", color: t.textSub },
    primaryBtn: {
      flex: 1,
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
  });
}
