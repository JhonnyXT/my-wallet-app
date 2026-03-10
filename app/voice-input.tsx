/**
 * Voice Input — Full-screen modal estilo Stitch / MonAI.
 *
 * Layout: fondo oscuro #101622 + BlurView glassmorphism
 * Orb:    LinearGradient animado con pulsos concéntricos (Reanimated)
 * Voz:    expo-speech-recognition → parciales en tiempo real
 * Auto:   2 s de silencio → para y navega al formulario de gasto/ingreso
 */
import { useEffect, useRef, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ScrollView,
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
      <Animated.View style={[styles.orbRing2, ring2Style]} />
      <Animated.View style={[styles.orbRing1, ring1Style]} />
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

// ─── Componente de animación palabra por palabra ──────────────────────────────
// Cada nueva palabra aparece con FadeIn; las palabras existentes no se reaniman.
function AnimatedWords({ text }: { text: string }) {
  const words = text ? text.trim().split(/\s+/).filter(Boolean) : [];
  const prevLenRef = useRef(0);
  const prevLen = prevLenRef.current;

  // Actualizar el ref DESPUÉS del render para que el próximo render
  // conozca cuántas palabras ya estaban presentes.
  useLayoutEffect(() => {
    prevLenRef.current = words.length;
  });

  return (
    <View style={styles.wordsContainer}>
      {words.map((word, i) => (
        <Animated.Text
          key={i}
          entering={i >= prevLen ? FadeIn.duration(220) : undefined}
          style={styles.transcriptWord}
        >
          {word}{" "}
        </Animated.Text>
      ))}
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────
export default function VoiceInputScreen() {
  const insets = useSafeAreaInsets();
  const {
    status, transcript, finalTranscript,
    errorMessage, setStatus, setTranscript,
    setFinalTranscript, setError, reset,
  } = useVoiceStore();
  const setFromVoice = useExpenseStore((s) => s.setFromVoice);

  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref que siempre tiene el valor actual de status para los listeners
  // (evita el stale-closure bug en el evento "end")
  const statusRef = useRef(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  const isListening = status === "listening";
  const isProcessing = status === "processing";

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

      // 1 segundo visible mostrando el transcript completo → navega al formulario
      setTimeout(() => {
        const parsed = processVoiceInput(trimmed);
        setFromVoice(parsed);
        reset();
        router.replace("/active-expense");
      }, 1000);
    },
    [clearSilenceTimer, reset, setFinalTranscript, setFromVoice, setStatus]
  );

  // ─── Listeners de voz ────────────────────────────────────────────────────
  // IMPORTANTE: no incluir `status` en las deps para evitar que se limpien
  // los listeners justo cuando status cambia a "processing".
  // Se usa statusRef para leer el valor actual sin stale closure.
  useEffect(() => {
    if (!SpeechModule) return;

    const subs = [
      SpeechModule.addListener("start", () => {
        setStatus("listening");
        setTranscript("");
      }),

      SpeechModule.addListener("end", () => {
        // Usar ref en lugar de closure para leer el status actual
        if (statusRef.current !== "processing") setStatus("idle");
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
          // Reiniciar el timer de silencio con cada nueva palabra
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearSilenceTimer, handleDone, setError, setStatus, setTranscript]);

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
    } catch {
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

  // ─── Texto a mostrar ──────────────────────────────────────────────────────
  // En processing: mostrar el texto final confirmado
  // En listening:  mostrar el transcript parcial en tiempo real
  const displayText = isProcessing
    ? (finalTranscript || transcript)
    : transcript;

  const statusLabel =
    isProcessing
      ? "Listo, abriendo formulario..."
      : isListening
      ? "Transcribiendo..."
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
          {/* Badge "Escuchando" */}
          {isListening && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={styles.listeningBadge}
            >
              <Sparkles size={12} color="#135BEC" strokeWidth={2} />
              <Text style={styles.listeningText}>Escuchando</Text>
            </Animated.View>
          )}

          {/* Badge "Procesando" */}
          {isProcessing && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.processingBadge}
            >
              <Text style={styles.processingText}>✓ Procesado</Text>
            </Animated.View>
          )}

          {/* Transcript: animación palabra por palabra mientras escucha,
              texto completo estático cuando procesa */}
          {displayText ? (
            <ScrollView
              style={styles.transcriptScroll}
              contentContainerStyle={styles.transcriptScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {isProcessing ? (
                // En processing: mostrar texto completo sin re-animar
                <Animated.Text
                  entering={FadeIn.duration(150)}
                  style={styles.transcriptTextFull}
                >
                  "{displayText}"
                </Animated.Text>
              ) : (
                // En listening: animar cada palabra nueva
                <View style={styles.transcriptQuote}>
                  <Text style={styles.quoteChar}>"</Text>
                  <AnimatedWords text={displayText} />
                  <Text style={styles.quoteChar}>"</Text>
                </View>
              )}
            </ScrollView>
          ) : (
            <Animated.Text
              entering={FadeIn.duration(300)}
              style={styles.transcriptPlaceholder}
            >
              {status === "error"
                ? ""
                : "Di algo como:\n\"McDonald's 25 mil ayer\""}
            </Animated.Text>
          )}

          {/* Status label */}
          <Text
            style={[
              styles.statusText,
              status === "error" && styles.statusTextError,
              isProcessing && styles.statusTextProcessing,
            ]}
          >
            {statusLabel}
          </Text>
        </View>
      </View>

      {/* ── Footer: botón mic + label ─────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <Pressable
          onPress={handleMicPress}
          style={({ pressed }) => [styles.micBtn, pressed && styles.micBtnPressed]}
        >
          {isListening ? (
            <Pause size={30} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          ) : isProcessing ? (
            <Play size={30} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
          ) : (
            <Mic size={30} color="#FFFFFF" strokeWidth={2} />
          )}
        </Pressable>

        <Text style={styles.tapLabel}>
          {isListening
            ? "TOCA PARA PAUSAR"
            : isProcessing
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
    marginTop: 36,
    gap: 10,
    width: "100%",
    maxHeight: 200,
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
  processingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  processingText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4ADE80",
    letterSpacing: 0.5,
  },

  // ScrollView contiene el transcript para frases largas
  transcriptScroll: {
    width: "100%",
    maxHeight: 140,
  },
  transcriptScrollContent: {
    alignItems: "center",
    paddingHorizontal: 4,
  },

  // Frase entre comillas con palabras animadas
  transcriptQuote: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  quoteChar: {
    fontSize: 26,
    fontWeight: "800",
    color: "rgba(255,255,255,0.35)",
    lineHeight: 34,
  },

  // Contenedor flex-wrap para las palabras animadas
  wordsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  transcriptWord: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 34,
    letterSpacing: -0.3,
  },

  // Texto completo en estado "processing"
  transcriptTextFull: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
    letterSpacing: -0.3,
  },

  transcriptPlaceholder: {
    fontSize: 18,
    fontWeight: "400",
    color: "rgba(255,255,255,0.25)",
    textAlign: "center",
    lineHeight: 28,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  statusTextError: {
    color: "#F87171",
  },
  statusTextProcessing: {
    color: "#4ADE80",
  },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    alignItems: "center",
    gap: 16,
    paddingTop: 8,
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
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 1.8,
  },
});
