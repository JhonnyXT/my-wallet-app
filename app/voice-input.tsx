/**
 * Voice Input — Full-screen modal estilo Stitch / MonAI.
 *
 * Layout: fondo oscuro #101622 + BlurView glassmorphism
 * Orb:    LinearGradient animado con pulsos concéntricos (Reanimated)
 * Voz:    expo-speech-recognition → parciales en tiempo real
 * Auto:   2 s de silencio → para y navega al FloatingInputOverlay
 */
import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Mic, X, Sparkles, Pause, Play } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useVoiceStore } from "@/src/store/useVoiceStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { processVoiceInput } from "@/src/utils/voiceParser";

const { width: SW } = Dimensions.get("window");
const ORB_SIZE = 192;

// ─── Guard: expo-speech-recognition solo en native build ─────────────────────
let SpeechModule: {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: object) => void;
  stop: () => void;
  addListener: (event: string, cb: (e: any) => void) => { remove: () => void };
} | null = null;

try {
  SpeechModule = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  // No disponible en Expo Go
}

// ─── Componente orb con gradient ─────────────────────────────────────────────
function VoiceOrb({ isListening }: { isListening: boolean }) {
  // Pulso: escala de 1 → 1.12 → 1 en loop
  const pulse = useSharedValue(1);
  const pulse2 = useSharedValue(1);

  useEffect(() => {
    if (isListening) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
      pulse2.value = withRepeat(
        withSequence(
          withTiming(1.0, { duration: 450 }),
          withTiming(1.22, { duration: 900, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulse.value = withTiming(1, { duration: 300 });
      pulse2.value = withTiming(1, { duration: 300 });
    }
  }, [isListening, pulse, pulse2]);

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: isListening ? 0.35 : 0.15,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: pulse2.value }],
    opacity: isListening ? 0.18 : 0.08,
  }));

  return (
    <View style={styles.orbContainer}>
      {/* Anillo exterior (más difuso) */}
      <Animated.View style={[styles.orbRing2, ring2Style]} />
      {/* Anillo interior */}
      <Animated.View style={[styles.orbRing1, ring1Style]} />
      {/* Orb central con gradient */}
      <Animated.View entering={ZoomIn.duration(400)} style={styles.orbCore}>
        <LinearGradient
          colors={["#3B82F6", "#135BEC", "#1E3A8A"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={styles.orbGradient}
        >
          <Mic size={52} color="#FFFFFF" strokeWidth={1.8} />
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function VoiceInputScreen() {
  const insets = useSafeAreaInsets();
  const { status, transcript, errorMessage, setStatus, setTranscript, setFinalTranscript, setError, reset } =
    useVoiceStore();
  const setFromVoice = useExpenseStore((s) => s.setFromVoice);

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isListening = status === "listening";

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
  }, []);

  const handleDone = useCallback(
    (text: string) => {
      clearSilenceTimer();
      const trimmed = text.trim();
      if (!trimmed) return;

      setFinalTranscript(trimmed);
      setStatus("processing");

      // 2 segundos mostrando el transcript → luego navega al modal de confirmación
      setTimeout(() => {
        const parsed = processVoiceInput(trimmed);
        setFromVoice(parsed);
        reset();
        router.replace("/active-expense");
      }, 2000);
    },
    [clearSilenceTimer, reset, setFinalTranscript, setFromVoice, setStatus]
  );

  // ─── Listeners de voz ────────────────────────────────────────────────────
  useEffect(() => {
    if (!SpeechModule) return;

    const subs = [
      SpeechModule.addListener("start", () => {
        setStatus("listening");
        setTranscript("");
      }),

      SpeechModule.addListener("end", () => {
        if (status !== "processing") setStatus("idle");
      }),

      SpeechModule.addListener("error", (e: any) => {
        const msg = e?.message ?? "No te escuché. ¿Puedes repetirlo?";
        setError(msg);
        clearSilenceTimer();
      }),

      // Resultados parciales → actualización en tiempo real
      SpeechModule.addListener("result", (event: any) => {
        const text: string = event.results?.[0]?.transcript ?? "";
        if (!text) return;

        if (event.isFinal) {
          handleDone(text);
        } else {
          setTranscript(text);
          // Reiniciar timer de silencio en cada palabra nueva
          clearSilenceTimer();
          silenceTimer.current = setTimeout(() => {
            SpeechModule?.stop();
          }, 2000);
        }
      }),
    ];

    return () => {
      clearSilenceTimer();
      subs.forEach((s) => s?.remove?.());
    };
  }, [clearSilenceTimer, handleDone, setError, setStatus, setTranscript, status]);

  // ─── Iniciar al montar la pantalla ────────────────────────────────────────
  useEffect(() => {
    startVoice();
    return () => {
      clearSilenceTimer();
      try { SpeechModule?.stop(); } catch { /* ignore */ }
      reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startVoice() {
    if (!SpeechModule) return;
    try {
      const perm = await SpeechModule.requestPermissionsAsync();
      if (!perm.granted) {
        setError("Concede acceso al micrófono en Ajustes.");
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      SpeechModule.start({
        lang: "es-ES",
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (err) {
      setError("No se pudo iniciar el micrófono.");
    }
  }

  async function handleMicPress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isListening) {
      clearSilenceTimer();
      SpeechModule?.stop();
    } else {
      startVoice();
    }
  }

  function handleClose() {
    clearSilenceTimer();
    try { SpeechModule?.stop(); } catch { /* ignore */ }
    reset();
    router.back();
  }

  // ─── Textos dinámicos ─────────────────────────────────────────────────────
  const displayText =
    status === "processing"
      ? transcript || "Procesando..."
      : transcript || (status === "error" ? "" : "");

  const statusLabel =
    status === "processing"
      ? "Procesando tu gasto..."
      : isListening
      ? "Transcribiendo tu gasto..."
      : status === "error"
      ? errorMessage ?? "No te escuché. ¿Puedes repetirlo?"
      : transcript
      ? "Toca para continuar o terminar"
      : "Toca el micrófono para hablar";

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Fondo glassmorphism */}
      <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />

      {/* ── Header: solo botón cerrar ─────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
          <X size={20} color="rgba(255,255,255,0.7)" strokeWidth={2} />
        </Pressable>
      </View>

      {/* ── Orb + Transcript ─────────────────────────────────────────── */}
      <View style={styles.centerSection}>
        <VoiceOrb isListening={isListening} />

        <View style={styles.transcriptSection}>
          {/* Indicador "Listening" */}
          {isListening && (
            <Animated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(200)} style={styles.listeningBadge}>
              <Sparkles size={12} color="#135BEC" strokeWidth={2} />
              <Text style={styles.listeningText}>Escuchando</Text>
            </Animated.View>
          )}

          {/* Transcript en tiempo real */}
          {displayText ? (
            <Animated.Text
              entering={FadeIn.duration(200)}
              style={styles.transcriptText}
              numberOfLines={4}
            >
              "{displayText}"
            </Animated.Text>
          ) : (
            <Animated.Text entering={FadeIn.duration(300)} style={styles.transcriptPlaceholder}>
              {status === "error" ? "" : "Di algo como:\n\"McDonald's 25 mil ayer\""}
            </Animated.Text>
          )}

          {/* Status label */}
          <Text
            style={[
              styles.statusText,
              status === "error" && styles.statusTextError,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* ── Footer: botón mic + label + hint pill ────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        {/* Botón central: Mic (idle) → Pause (listening) → Play (paused) */}
        <Pressable
          onPress={handleMicPress}
          style={({ pressed }) => [styles.micBtn, pressed && styles.micBtnPressed]}
        >
          {isListening ? (
            <Pause size={30} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          ) : status === "idle" || status === "error" ? (
            <Mic size={30} color="#FFFFFF" strokeWidth={2} />
          ) : (
            <Play size={30} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          )}
        </Pressable>

        {/* Etiqueta dinámica */}
        <Text style={styles.tapLabel}>
          {isListening
            ? "TOCA PARA PAUSAR"
            : status === "processing"
            ? "PROCESANDO..."
            : transcript
            ? "TOCA PARA CONTINUAR"
            : "TOCA PARA INICIAR"}
        </Text>

      </View>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#101622",
  },
  overlay: {
    backgroundColor: "rgba(15,23,42,0.55)",
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Orb ─────────────────────────────────────────────────────────────────────
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  orbContainer: {
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    alignItems: "center",
    justifyContent: "center",
  },
  orbRing2: {
    position: "absolute",
    width: ORB_SIZE + 80,
    height: ORB_SIZE + 80,
    borderRadius: 9999,
    backgroundColor: "rgba(19,91,236,0.1)",
  },
  orbRing1: {
    position: "absolute",
    width: ORB_SIZE + 32,
    height: ORB_SIZE + 32,
    borderRadius: 9999,
    backgroundColor: "rgba(19,91,236,0.2)",
  },
  orbCore: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: 9999,
    overflow: "hidden",
    shadowColor: "#135BEC",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 24,
  },
  orbGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Transcript ───────────────────────────────────────────────────────────────
  transcriptSection: {
    alignItems: "center",
    marginTop: 40,
    gap: 12,
    width: "100%",
  },
  listeningBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listeningText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#135BEC",
    letterSpacing: 1.4,
  },
  transcriptText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  transcriptPlaceholder: {
    fontSize: 18,
    fontWeight: "400",
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
    lineHeight: 28,
  },
  statusText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
  },
  statusTextError: {
    color: "#F87171",
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  micBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#135BEC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#135BEC",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 16,
  },
  micBtnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  tapLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 1.8,
  },

  // ── Hint pill — flujo normal dentro del footer ───────────────────────────────
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: "rgba(30,41,59,0.85)",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginTop: 12,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#CBD5E1",
    lineHeight: 18,
  },
});
