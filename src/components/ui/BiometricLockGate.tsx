import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, StyleSheet, View, type AppStateStatus } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import { Fingerprint } from "lucide-react-native";
import Reanimated, { FadeOut, useReducedMotion } from "react-native-reanimated";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";

const PRIMARY = "#135BEC";

/**
 * Capa de bloqueo con huella/rostro/PIN del sistema (Ajustes → "Bloqueo con huella").
 * Portado de Mensualy, pero como capa ENCIMA del Stack en vez de envolverlo: el Stack de
 * `_layout.tsx` tiene que seguir montado para que el deep link de una notificación
 * bancaria y el `router.replace("/(tabs)")` del arranque funcionen bajo el bloqueo.
 *
 * Bloquea al abrir la app y cada vez que vuelve de background, como una app bancaria.
 * `ready` (el splash terminó) retrasa el primer prompt para que no aparezca sobre el splash.
 */
export function BiometricLockGate({ ready }: { ready: boolean }) {
  const tokens = useAppTokens();
  const reducedMotion = useReducedMotion();
  const enabled = useSettingsStore((s) => s.biometricLockEnabled);
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());
  const [locked, setLocked] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  // El prompt con PIN abre otra Activity: la app pasa a background y vuelve. Sin este flag
  // ese ir y volver re-bloquearía la app en un ciclo infinito de prompts.
  const authenticatingRef = useRef(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (hydrated) return;
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
    // Si la rehidratación falla, zustand nunca avisa: sin este tope la capa de espera
    // de abajo taparía la app para siempre.
    const timeout = setTimeout(() => setHydrated(true), 1500);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [hydrated]);

  const tryUnlock = useCallback(async () => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setAuthenticating(true);
    try {
      // Si el teléfono ya no tiene huella, rostro ni PIN configurados, no hay contra qué
      // autenticar: bloquear dejaría al usuario afuera de su propia app para siempre.
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (level === LocalAuthentication.SecurityLevel.NONE) {
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquea MyWallet",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (result.success) setLocked(false);
    } finally {
      authenticatingRef.current = false;
      setAuthenticating(false);
    }
  }, []);

  // Activar/desactivar desde Ajustes no debe bloquear en el momento: ya se confirmó ahí.
  const prevEnabled = useRef(enabled);
  useEffect(() => {
    if (!hydrated) return;
    if (prevEnabled.current !== enabled) setLocked(false);
    prevEnabled.current = enabled;
  }, [enabled, hydrated]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "background" && !authenticatingRef.current) setLocked(true);
      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  const showLock = hydrated && enabled && locked;

  useEffect(() => {
    if (showLock && ready && AppState.currentState === "active") tryUnlock();
  }, [showLock, ready, tryUnlock]);

  // Hasta saber si el bloqueo está activo, tapar el contenido (el splash suele cubrirlo ya).
  if (!hydrated) {
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface.primary }]} />;
  }
  if (!showLock) return null;

  return (
    <Reanimated.View
      exiting={reducedMotion ? undefined : FadeOut.duration(200)}
      style={[styles.container, { backgroundColor: tokens.colors.surface.primary }]}
    >
      <Image source={require("@/assets/images/icon.png")} style={styles.icon} />
      <ThemedText variant="headline" style={styles.title}>
        MyWallet está bloqueada
      </ThemedText>
      <ThemedText variant="subheadline" color="secondary" style={styles.subtitle}>
        Usa tu huella, tu rostro o el PIN del teléfono para continuar.
      </ThemedText>
      <PressableScale
        onPress={tryUnlock}
        disabled={authenticating}
        accessibilityRole="button"
        style={[styles.button, { opacity: authenticating ? 0.7 : 1 }]}
      >
        <Fingerprint size={18} color="#FFFFFF" strokeWidth={2} />
        <ThemedText variant="body" style={styles.buttonText}>
          {authenticating ? "Verificando…" : "Desbloquear"}
        </ThemedText>
      </PressableScale>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  icon: { width: 72, height: 72, borderRadius: 18 },
  title: { marginTop: 20, textAlign: "center" },
  subtitle: { marginTop: 6, textAlign: "center" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "600" },
});
