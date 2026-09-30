/**
 * login-onboarding.tsx — Paso 0 del onboarding: iniciar sesión con Google (SYNC_ROADMAP.md, T3/T7).
 *
 * Diseño tomado de un mockup de Stitch (2026-09-30), con el ícono de la app flotando sobre un
 * resplandor azul difuminado. Opcional: "Ahora no" es discreto (sin un botón destacado de
 * "continuar sin cuenta") y al saltar se avisa que se puede iniciar sesión luego en Ajustes →
 * Cuenta. Sin internet la app sigue: el login falla con un mensaje y el usuario puede saltarlo.
 * Luego sigue category-onboarding.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, StatusBar, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { CloudUpload, Smartphone, Users } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { authErrorMessage, classifyAuthError, signInWithGoogle, useSession } from "@/src/sync";

const ACCENT = "#135BEC";
const ICON_SIZE = 72;
/** Lado del resplandor: bastante más grande que el ícono para que se desvanezca suave. */
const GLOW_SIZE = 230;

const BENEFITS = [
  { Icon: CloudUpload, text: "Respaldo de tus movimientos, listas, metas y deudas" },
  { Icon: Smartphone, text: "Si cambias o pierdes el celular, recuperas todo" },
  { Icon: Users, text: "Comparte listas con otras personas" },
] as const;

// ─── Ícono flotando sobre el resplandor azul ─────────────────────────────────
// RN no tiene `filter: blur()`: el "desenfoque" es un degradado radial del acento que se
// desvanece a transparente. Con "reducir movimiento" el ícono queda quieto.
function FloatingAppIcon() {
  const reducedMotion = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    float.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [float, reducedMotion]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -float.value * 8 }] }));
  // El resplandor respira con el ícono: más intenso cuando sube.
  const glowStyle = useAnimatedStyle(() => ({ opacity: 0.75 + float.value * 0.25 }));

  return (
    <View style={iconSt.stage}>
      <Reanimated.View style={[iconSt.glow, glowStyle]} pointerEvents="none">
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={ACCENT} stopOpacity={0.55} />
              <Stop offset="45%" stopColor={ACCENT} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width={GLOW_SIZE} height={GLOW_SIZE} fill="url(#glow)" />
        </Svg>
      </Reanimated.View>
      <Reanimated.View style={iconStyle}>
        <Image source={require("@/assets/images/icon.png")} style={iconSt.appIcon} />
      </Reanimated.View>
    </View>
  );
}

// "G" de Google monocromática (blanca) para el botón primario, como en el mockup de Stitch.
function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#FFFFFF"
        fillOpacity={0.9}
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FFFFFF"
        fillOpacity={0.9}
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#FFFFFF"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

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

      <View style={st.content}>
        <FloatingAppIcon />
        <Text style={st.title}>Guarda tu información{"\n"}en tu cuenta</Text>
        <Text style={st.subtitle}>
          MyWallet funciona completa sin internet. Con tu cuenta de Google, además:
        </Text>

        <View style={st.benefits}>
          {BENEFITS.map(({ Icon, text }) => (
            <View key={text} style={st.benefitRow}>
              <View style={st.benefitIcon}>
                <Icon size={22} color={ACCENT} strokeWidth={2} />
              </View>
              <Text style={st.benefitText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={st.footer}>
        <PressableScale
          style={[st.googleBtn, busy && { opacity: 0.7 }]}
          onPress={handleGoogle}
          disabled={busy}
          accessibilityRole="button"
        >
          {!user && !busy && <GoogleMark />}
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

const iconSt = StyleSheet.create({
  // El escenario mide lo del ícono (el resplandor lo desborda sin empujar el layout).
  stage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  glow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    left: (ICON_SIZE - GLOW_SIZE) / 2,
    top: (ICON_SIZE - GLOW_SIZE) / 2,
  },
  appIcon: { width: ICON_SIZE, height: ICON_SIZE, borderRadius: 18 },
});

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    // Centrado vertical en el espacio libre: el aire se reparte arriba y abajo, sin un hueco
    // grande antes del botón.
    content: { flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center" },
    title: {
      fontSize: 31,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.9,
      lineHeight: 37,
      marginBottom: 12,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 15,
      color: t.textSub,
      lineHeight: 23,
      marginBottom: 32,
      textAlign: "center",
      maxWidth: 320,
    },
    // Bloque centrado; cada fila (ícono + texto) sigue alineada a la izquierda para leerse bien.
    benefits: { gap: 20, width: "100%", maxWidth: 340 },
    benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
    benefitIcon: {
      width: 44,
      height: 44,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: ACCENT + "1A",
      marginTop: 2,
    },
    benefitText: { flex: 1, fontSize: 16, color: t.text, lineHeight: 23, paddingTop: 10 },
    footer: { paddingHorizontal: 28, paddingTop: 8, paddingBottom: 32, gap: 10 },
    googleBtn: {
      height: 56,
      flexDirection: "row",
      gap: 12,
      backgroundColor: ACCENT,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: ACCENT,
      shadowOpacity: t.isDark ? 0 : 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: t.isDark ? 0 : 4,
    },
    googleText: { fontSize: 15, fontWeight: "700", color: "#fff" },
    skipBtn: { paddingVertical: 10, alignItems: "center" },
    skipText: { fontSize: 15, fontWeight: "500", color: t.textSub },
  });
}
