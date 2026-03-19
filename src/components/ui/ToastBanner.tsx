/**
 * ToastBanner — banner in-app minimalista descartable.
 * Diseño: Google Stitch / MyWallet
 *   • Icono a la izquierda en su contenedor coloreado
 *   • Fondo neutro para success/info, tintado para warning/danger
 *   • Sin valores monetarios — solo título descriptivo
 *   • Dismiss: botón × | swipe hacia arriba | timer solo si duration definido
 */
import { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
} from "react-native";
import Reanimated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import type { Toast, ToastLevel } from "@/src/store/useToastStore";

const SWIPE_UP_THRESHOLD = -40;

// ─── Tokens por nivel ──────────────────────────────────────────────────────────

type LevelTokens = {
  defaultIcon: string;
  iconBg: string;       // fondo del contenedor del icono
  cardBgLight: string;  // fondo de la tarjeta (light)
  cardBgDark: string;   // fondo de la tarjeta (dark)
  titleLight: string;
  titleDark: string;
};

const LEVEL: Record<ToastLevel, LevelTokens> = {
  success: {
    defaultIcon:  "✅",
    iconBg:       "#DCFCE7",
    cardBgLight:  "#FFFFFF",
    cardBgDark:   "#1C2128",
    titleLight:   "#0F172A",
    titleDark:    "#E6EDF3",
  },
  info: {
    defaultIcon:  "💬",
    iconBg:       "#DBEAFE",
    cardBgLight:  "#FFFFFF",
    cardBgDark:   "#1C2128",
    titleLight:   "#0F172A",
    titleDark:    "#E6EDF3",
  },
  warning: {
    defaultIcon:  "⚠️",
    iconBg:       "#FED7AA",
    cardBgLight:  "#FEF3C7",
    cardBgDark:   "#1C1000",
    titleLight:   "#7C2D12",
    titleDark:    "#FED7AA",
  },
  danger: {
    defaultIcon:  "🚨",
    iconBg:       "#FECACA",
    cardBgLight:  "#FEE2E2",
    cardBgDark:   "#1A0505",
    titleLight:   "#7F1D1D",
    titleDark:    "#FECACA",
  },
};

// ─── Componente ────────────────────────────────────────────────────────────────

interface ToastBannerProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export function ToastBanner({ toast, onDismiss }: ToastBannerProps) {
  const theme  = useTheme();
  const isDark = theme.isDark;
  const tokens = LEVEL[toast.level];

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;

  // Auto-dismiss: usa duration explícito, o 3500 ms por defecto
  const autoDismissMs = toast.duration ?? 3500;
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), autoDismissMs);
    return () => clearTimeout(timer);
  }, [toast.id, autoDismissMs, onDismiss]);

  const animateOut = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss(toast.id));
  }, [translateY, opacity, toast.id, onDismiss]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 6 && g.dy < 0,
      onPanResponderMove: (_, g) => {
        if (g.dy < 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy < SWIPE_UP_THRESHOLD) {
          animateOut();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
          }).start();
        }
      },
    })
  ).current;

  const cardBg      = isDark ? tokens.cardBgDark  : tokens.cardBgLight;
  const titleColor  = isDark ? tokens.titleDark   : tokens.titleLight;
  const dismissColor = isDark ? "#6E7681" : "#9CA3AF";
  const actionColor  = isDark ? "#FFFFFF" : "#135BEC";
  const icon         = toast.icon ?? tokens.defaultIcon;

  return (
    <Animated.View
      style={[styles.swipeWrapper, { transform: [{ translateY }], opacity }]}
      {...panResponder.panHandlers}
    >
      <Reanimated.View
        entering={FadeInDown.springify().damping(18).stiffness(200)}
        exiting={FadeOutUp.duration(200)}
        style={[
          styles.container,
          {
            backgroundColor: cardBg,
            shadowColor: isDark ? "#000" : "#1E293B",
          },
        ]}
      >
        {/* Icono izquierdo */}
        <View style={[styles.iconWrap, { backgroundColor: tokens.iconBg }]}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>

        {/* Título */}
        <Text
          style={[styles.title, { color: titleColor }]}
          numberOfLines={2}
        >
          {toast.title}
        </Text>

        {/* Acciones: "Deshacer" opcional + × */}
        <View style={styles.actions}>
          {toast.actionLabel && toast.onAction ? (
            <TouchableOpacity
              onPress={() => {
                toast.onAction?.();
                onDismiss(toast.id);
              }}
              hitSlop={10}
              activeOpacity={0.7}
            >
              <Text style={[styles.actionText, { color: actionColor }]}>
                {toast.actionLabel}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => onDismiss(toast.id)}
            hitSlop={14}
            activeOpacity={0.6}
          >
            <Text style={[styles.dismiss, { color: dismissColor }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </Reanimated.View>
    </Animated.View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  swipeWrapper: {
    marginBottom: 10,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 12,
    paddingLeft: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    minHeight: 52,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconText: {
    fontSize: 18,
    lineHeight: 22,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 14,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dismiss: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 22,
  },
});
