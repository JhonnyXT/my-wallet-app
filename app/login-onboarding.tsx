/**
 * login-onboarding.tsx — Paso 0 del onboarding: iniciar sesión con Google (SYNC_ROADMAP.md, T3/T7).
 *
 * Opcional: "Ahora no" es discreto (sin un botón destacado de "continuar sin cuenta") y al saltar
 * se avisa que se puede iniciar sesión luego en Ajustes → Cuenta. Sin internet la app sigue: el
 * login falla con un mensaje y el usuario puede saltarlo. Luego sigue category-onboarding.
 */
import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { CloudUpload, Smartphone, Users } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { authErrorMessage, classifyAuthError, signInWithGoogle, useSession } from "@/src/sync";

const ACCENT = "#135BEC";

const BENEFITS = [
  { Icon: CloudUpload, text: "Respaldo de tus movimientos, listas, metas y deudas" },
  { Icon: Smartphone, text: "Si cambias o pierdes el celular, recuperas todo" },
  { Icon: Users, text: "Comparte listas con otras personas" },
] as const;

export default function LoginOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const st = useMemo(() => buildStyles(theme), [theme]);
  const { user } = useSession();

  const [busy, setBusy] = useState(false);
  const [skipNotice, setSkipNotice] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = useCallback(() => router.push("/category-onboarding"), [router]);

  const handleGoogle = useCallback(async () => {
    // Ya con sesión (volvió atrás desde categorías): solo avanzar.
    if (user) return next();
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle();
      next();
    } catch (e) {
      setError(authErrorMessage(classifyAuthError(e)));
    } finally {
      setBusy(false);
    }
  }, [user, busy, next]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSkipNotice(true);
  }, []);

  return (
    <SafeAreaView style={st.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <View style={st.header}>
        <Image source={require("@/assets/images/icon.png")} style={st.appIcon} />
        <Text style={st.title}>Guarda tu información{"\n"}en tu cuenta</Text>
        <Text style={st.subtitle}>
          MyWallet funciona completa sin internet. Con tu cuenta de Google, además:
        </Text>
      </View>

      <View style={st.benefits}>
        {BENEFITS.map(({ Icon, text }) => (
          <View key={text} style={st.benefitRow}>
            <View style={st.benefitIcon}>
              <Icon size={18} color={ACCENT} strokeWidth={2} />
            </View>
            <Text style={st.benefitText}>{text}</Text>
          </View>
        ))}
      </View>

      <View style={st.footer}>
        <PressableScale
          style={[st.googleBtn, busy && { opacity: 0.7 }]}
          onPress={handleGoogle}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={st.googleText}>
            {user ? "Continuar" : busy ? "Conectando…" : "Continuar con Google"}
          </Text>
        </PressableScale>
        {!user && (
          <PressableScale style={st.skipBtn} onPress={handleSkip} accessibilityRole="button">
            <Text style={st.skipText}>Ahora no</Text>
          </PressableScale>
        )}
      </View>

      <ConfirmDialog
        visible={skipNotice}
        variant="info"
        emoji="☁️"
        title="Puedes hacerlo después"
        message="Cuando quieras, inicia sesión desde Ajustes → Cuenta para respaldar tu información por si cambias o pierdes el celular."
        confirmLabel="Entendido"
        onConfirm={() => {
          setSkipNotice(false);
          next();
        }}
        onCancel={() => setSkipNotice(false)}
      />

      <ConfirmDialog
        visible={error !== null}
        variant="warning"
        title="No se pudo iniciar sesión"
        message={error ?? ""}
        confirmLabel="Entendido"
        onConfirm={() => setError(null)}
        onCancel={() => setError(null)}
      />
    </SafeAreaView>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    header: { paddingHorizontal: 28, paddingTop: 48 },
    appIcon: { width: 64, height: 64, borderRadius: 16, marginBottom: 28 },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: 16,
    },
    subtitle: { fontSize: 14, color: t.textSub, lineHeight: 21 },
    benefits: { flex: 1, paddingHorizontal: 28, paddingTop: 32, gap: 20 },
    benefitRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    benefitIcon: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ACCENT + "1A",
    },
    benefitText: { flex: 1, fontSize: 15, color: t.text, lineHeight: 21 },
    footer: { paddingHorizontal: 24, paddingVertical: 20, gap: 8, alignItems: "stretch" },
    googleBtn: {
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
    googleText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    skipBtn: { paddingVertical: 12, alignItems: "center" },
    skipText: { fontSize: 14, fontWeight: "600", color: t.textSub },
  });
}
