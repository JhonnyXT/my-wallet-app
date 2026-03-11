/**
 * GuidedTour — Overlay de onboarding estilo Stitch.
 *
 * Usa Modal para estar siempre encima de FloatingDock y todo el contenido.
 * En Android, measureInWindow devuelve coordenadas relativas a la ventana de la app
 * (que empieza debajo del status bar), mientras que el Modal con statusBarTranslucent
 * empieza desde el tope absoluto de la pantalla. Se corrige sumando
 * StatusBar.currentHeight, que es diferente en cada dispositivo Android.
 */
import { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
  type LayoutRectangle,
} from "react-native";

export interface TourStep {
  targetRef: React.RefObject<View>;
  title: string;
  message: string;
  buttonLabel: string;
  onAction: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  currentStep: number;
  globalStep: number;
  totalSteps: number;
  visible: boolean;
  onSkip: () => void;
}

const SCREEN_H = Dimensions.get("screen").height;
const SB_H = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

export function GuidedTour({ steps, currentStep, globalStep, totalSteps, visible, onSkip }: GuidedTourProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tooltipScale = useRef(new Animated.Value(0.92)).current;
  const [spotRect, setSpotRect] = useState<LayoutRectangle | null>(null);

  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    if (!step?.targetRef?.current) return;

    step.targetRef.current.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        // measureInWindow da coords relativas a la ventana (debajo del status bar).
        // El Modal statusBarTranslucent empieza desde y=0 (tope de pantalla).
        // Compensamos sumando la altura del status bar.
        setSpotRect({ x, y: y + SB_H, width, height });
      }
    });
  }, [step]);

  useEffect(() => {
    if (visible && step) {
      setSpotRect(null);
      fadeAnim.setValue(0);
      tooltipScale.setValue(0.92);
      const timer = setTimeout(measureTarget, 450);
      return () => clearTimeout(timer);
    } else {
      setSpotRect(null);
    }
  }, [visible, currentStep, measureTarget]);

  useEffect(() => {
    if (visible && spotRect) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.spring(tooltipScale, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, spotRect]);

  if (!visible || !step) return null;

  const ready = !!spotRect;

  const PAD = 14;
  const spotX = ready ? spotRect!.x - PAD : 0;
  const spotY = ready ? spotRect!.y - PAD : 0;
  const spotW = ready ? spotRect!.width + PAD * 2 : 0;
  const spotH = ready ? spotRect!.height + PAD * 2 : 0;
  const spotR = Math.min(spotW, spotH) / 2;

  const tooltipBelow = spotY + spotH + 20 + 200 < SCREEN_H;
  const tooltipTop = tooltipBelow ? spotY + spotH + 20 : spotY - 210;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      {!ready ? (
        <View style={StyleSheet.absoluteFill} />
      ) : (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
          {/* 4 rectángulos overlay alrededor del spotlight */}
          <View style={[s.overlay, { top: 0, left: 0, right: 0, height: Math.max(0, spotY) }]} />
          <View style={[s.overlay, { top: spotY, left: 0, width: Math.max(0, spotX), height: spotH }]} />
          <View style={[s.overlay, { top: spotY, left: spotX + spotW, right: 0, height: spotH }]} />
          <View style={[s.overlay, { top: spotY + spotH, left: 0, right: 0, bottom: 0 }]} />

          {/* Spotlight ring */}
          <View style={[s.spotRing, {
            top: spotY, left: spotX, width: spotW, height: spotH, borderRadius: spotR,
          }]} />

          {/* Tooltip card */}
          <Animated.View style={[
            s.card,
            { top: tooltipTop, transform: [{ scale: tooltipScale }] },
          ]}>
            <Text style={s.title}>{step.title}</Text>
            <Text style={s.desc}>{step.message}</Text>

            <View style={s.btnsRow}>
              <TouchableOpacity onPress={onSkip} activeOpacity={0.6} style={s.skipBtn}>
                <Text style={s.skipText}>Omitir</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={step.onAction} activeOpacity={0.8} style={s.ctaBtn}>
                <Text style={s.ctaText}>{step.buttonLabel}</Text>
              </TouchableOpacity>
            </View>

            <View style={s.dotsRow}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View key={i} style={[s.dot, i === globalStep && s.dotActive]} />
              ))}
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  spotRing: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.55)",
  },
  card: {
    position: "absolute",
    left: 28,
    right: 28,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  desc: {
    fontSize: 14,
    fontWeight: "400",
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 20,
  },
  btnsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#135BEC",
  },
  ctaBtn: {
    backgroundColor: "#135BEC",
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E2E8F0",
  },
  dotActive: {
    width: 20,
    backgroundColor: "#135BEC",
  },
});
