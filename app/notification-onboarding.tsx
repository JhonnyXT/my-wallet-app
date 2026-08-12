/**
 * notification-onboarding.tsx — Paso de onboarding (primera vez) para activar la
 * detección automática de transacciones vía notificaciones bancarias.
 *
 * Diseño tomado 1:1 de un mockup de Stitch (tarjetas de notificación flotantes,
 * sin marco de teléfono). Reutiliza la misma lógica de permisos que
 * `AutoDetectSection` en app/settings.tsx (RNAndroidNotificationListener +
 * AsyncStorage), presentada como paso de onboarding. Saltable con "Omitir".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, StatusBar, AppState, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNAndroidNotificationListener from "react-native-android-notification-listener";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Landmark, ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { AUTO_DETECT_ENABLED_KEY } from "@/src/constants/banks";
import { requestNotificationPermissions } from "@/src/services/notificationService";

const ACCENT = "#135BEC";

// ─── Flotación continua tipo CSS "float" (translateY 0 → -amp → 0, loop) ─────
function useFloat(amplitude: number, durationMs: number) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [v, durationMs]);
  return useAnimatedStyle(() => ({
    transform: [{ translateY: -v.value * amplitude }],
  }));
}

// ─── Mockup: dos tarjetas de notificación flotando (banco → MyWallet) ────────
function NotificationMockup({ theme }: { theme: AppTheme }) {
  const st = useMemo(() => buildMockupStyles(theme), [theme]);
  const floatA = useFloat(10, 6000);
  const floatB = useFloat(8, 4000);

  return (
    <View style={st.stage}>
      <View style={st.glow} />

      {/* Tarjeta A: notificación bancaria — detrás, rotada, semi-transparente */}
      <Reanimated.View style={[st.cardA, floatA]}>
        <View style={[st.iconCircle, { backgroundColor: "#FEF3C7" }]}>
          <Landmark size={20} color="#B45309" strokeWidth={2} />
        </View>
        <View style={st.cardText}>
          <Text style={st.cardTitleA}>Bancolombia</Text>
          <Text style={st.cardBodyA} numberOfLines={1}>
            Pagaste $45.000 en Rappi
          </Text>
        </View>
      </Reanimated.View>

      {/* Tarjeta B: notificación real de MyWallet — mismo título/cuerpo que genera
          notifyBankTransaction() en notificationService.ts. Sin badges ni checks
          decorativos: una notificación de Android solo tiene ícono + título + cuerpo. */}
      <Reanimated.View style={[st.cardB, floatB]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={st.appIcon}
            resizeMode="cover"
          />
          <View style={st.cardText}>
            <Text style={st.cardTitleB} numberOfLines={1}>
              Nuevo gasto detectado — Bancolombia
            </Text>
            <Text style={st.cardBodyB} numberOfLines={1}>
              $45.000 · Pago en Rappi
            </Text>
          </View>
        </View>
      </Reanimated.View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function NotificationOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const st = useMemo(() => buildStyles(theme), [theme]);

  const [requesting, setRequesting] = useState(false);
  const [granted, setGranted] = useState(false);
  const navigatedRef = useRef(false);

  // React Navigation NO remonta esta pantalla al volver atrás con "Volver" — solo
  // la vuelve a mostrar. Al recuperar el foco: siempre se libera navigatedRef (para
  // poder avanzar de nuevo) y se revisa el permiso REAL — si ya estaba concedido de
  // antes (p. ej. el usuario ya lo activó y volvió atrás), se muestra "Continuar" en
  // vez de repetir el flujo de activación desde cero.
  useFocusEffect(
    useCallback(() => {
      navigatedRef.current = false;
      setRequesting(false);
      let cancelled = false;
      (async () => {
        try {
          const status = await RNAndroidNotificationListener.getPermissionStatus();
          if (!cancelled) setGranted(status === "authorized");
        } catch {
          if (!cancelled) setGranted(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const goToApp = useCallback(() => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    router.push("/bank-selection-onboarding");
  }, [router]);

  const finishEnabled = useCallback(async () => {
    await AsyncStorage.setItem(AUTO_DETECT_ENABLED_KEY, "true");
    setGranted(true);
    setTimeout(goToApp, 900);
  }, [goToApp]);

  // Al volver de los ajustes del sistema (tras requestPermission), verificar si se concedió
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (next) => {
      if (next !== "active" || !requesting) return;
      try {
        const status = await RNAndroidNotificationListener.getPermissionStatus();
        if (status === "authorized") {
          await finishEnabled();
        } else {
          setRequesting(false);
        }
      } catch {
        setRequesting(false);
      }
    });
    return () => sub.remove();
  }, [requesting, finishEnabled]);

  const handleActivate = useCallback(async () => {
    await requestNotificationPermissions();
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      if (status === "authorized") {
        await finishEnabled();
        return;
      }
    } catch {
      // continúa al flujo de solicitud
    }
    setRequesting(true);
    RNAndroidNotificationListener.requestPermission();
  }, [finishEnabled]);

  const handlePrimaryPress = useCallback(() => {
    // Ya estaba concedido (detectado al enfocar la pantalla) → avanzar directo,
    // sin repetir el diálogo de permisos.
    if (granted) {
      goToApp();
      return;
    }
    handleActivate();
  }, [granted, goToApp, handleActivate]);

  return (
    <SafeAreaView style={st.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <Pressable style={st.backBtn} onPress={() => router.back()} hitSlop={10}>
        <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
      </Pressable>

      <View style={st.header}>
        <Text style={st.title}>Detecta tus gastos{"\n"}automáticamente</Text>
        <Text style={st.subtitle}>
          Cuando tu banco te avise de un pago, MyWallet lo detecta solo y te lo propone como
          transacción — sin escribir nada.
        </Text>
      </View>

      <View style={st.content}>
        <NotificationMockup theme={theme} />
        <Text style={st.privacy}>
          🔒 Solo se lee el monto y el comercio. Nunca saldos ni datos personales — todo se
          procesa en tu dispositivo.
        </Text>
      </View>

      <View style={st.footer}>
        <Pressable style={st.skipBtn} onPress={goToApp}>
          <Text style={st.skipText}>Omitir</Text>
        </Pressable>
        <Pressable
          style={[st.activateBtn, requesting && { opacity: 0.7 }]}
          onPress={handlePrimaryPress}
          disabled={requesting}
        >
          <Text style={st.activateText}>
            {granted ? "Continuar" : requesting ? "Esperando permiso…" : "Activar detección"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
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
    header: { paddingHorizontal: 28, paddingTop: 20 },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.5,
      lineHeight: 34,
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 14,
      color: t.textSub,
      lineHeight: 21,
    },
    content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
    privacy: {
      fontSize: 12,
      color: t.textSub,
      textAlign: "center",
      lineHeight: 18,
      marginTop: 40,
      maxWidth: 280,
    },
    footer: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 24,
      paddingVertical: 20,
      gap: 20,
    },
    skipBtn: { paddingVertical: 16, paddingHorizontal: 4 },
    skipText: { fontSize: 14, fontWeight: "600", color: t.textSub },
    activateBtn: {
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
    activateText: { fontSize: 15, fontWeight: "700", color: "#fff" },
  });
}

function buildMockupStyles(t: AppTheme) {
  return StyleSheet.create({
    stage: {
      width: 280,
      height: 320,
      alignItems: "center",
      justifyContent: "center",
    },
    glow: {
      position: "absolute",
      width: 192,
      height: 192,
      borderRadius: 9999,
      backgroundColor: ACCENT + "14",
      bottom: -8,
      alignSelf: "center",
    },
    // Tarjeta A — notificación bancaria, detrás
    cardA: {
      position: "absolute",
      top: 60,
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: t.isDark ? t.itemBg : "#E2E8F0",
      borderRadius: 16,
      padding: 16,
      opacity: 0.6,
      transform: [{ rotate: "-3deg" }],
    },
    // Tarjeta B — notificación de MyWallet, al frente
    cardB: {
      position: "absolute",
      top: 128,
      width: "100%",
      backgroundColor: t.isDark ? t.pillNeutral : "#FFFFFF",
      borderRadius: 16,
      padding: 20,
      transform: [{ rotate: "1deg" }],
      shadowColor: "#000",
      shadowOpacity: t.isDark ? 0.3 : 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    appIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      flexShrink: 0,
    },
    cardText: { flex: 1, gap: 2, minWidth: 0 },
    cardTitleA: { fontSize: 12, fontWeight: "700", color: t.text },
    cardBodyA: { fontSize: 13, color: t.textSub },
    cardTitleB: { fontSize: 12, fontWeight: "700", color: t.text },
    cardBodyB: { fontSize: 13, fontWeight: "500", color: t.textSub },
  });
}
