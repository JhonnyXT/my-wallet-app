/**
 * PeriodMenu — menú flotante del botón de calendario (toque largo): elegir cómo ver el
 * Dashboard (ciclo, año, todo el tiempo, rango personalizado), restablecer la vista
 * predeterminada y cambiar la frecuencia predeterminada. Se ancla debajo del botón y
 * crece desde su esquina superior derecha.
 */
import { useEffect, useState, type ComponentType } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  ChartPie,
  Check,
  Infinity as InfinityIcon,
  RotateCcw,
} from "lucide-react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useAppTokens } from "@/src/theme/tokens";
import { cycleUnitLabel, type PeriodCadence, type PeriodView } from "@/src/utils/periodCycles";

export type PeriodMenuAction = "cycle" | "year" | "all" | "range" | "reset" | "changeDefault";

export interface MenuAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MENU_WIDTH = 256;

type Icon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export function PeriodMenu({
  visible,
  anchor,
  cadence,
  view,
  isDefault,
  onAction,
  onClose,
}: {
  visible: boolean;
  anchor: MenuAnchor | null;
  cadence: PeriodCadence;
  view: PeriodView;
  isDefault: boolean;
  onAction: (action: PeriodMenuAction) => void;
  onClose: () => void;
}) {
  const tokens = useAppTokens();
  const reducedMotion = useReducedMotion();
  const { width: screenW } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reducedMotion
        ? withTiming(1, { duration: 120 })
        : withSpring(1, { dampingRatio: 0.85, duration: 320 });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  const menuStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value * 1.6, 1),
    transform: reducedMotion ? [] : [{ scale: 0.88 + 0.12 * progress.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted || !anchor) return null;

  // En Android el Modal se dibuja desde el borde superior de la pantalla (edge-to-edge),
  // pero measureInWindow del botón cuenta desde debajo de la barra de estado: sin sumarla,
  // el menú quedaba ~una barra de estado más arriba, tapando el botón (visto en dispositivo).
  const statusBarOffset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const top = anchor.y + anchor.height + 8 + statusBarOffset;
  const right = Math.max(screenW - (anchor.x + anchor.width), 12);

  const choose = (action: PeriodMenuAction) => {
    Haptics.selectionAsync();
    onAction(action);
  };

  const row = (
    label: string,
    IconCmp: Icon,
    action: PeriodMenuAction,
    opts?: { checked?: boolean; danger?: boolean },
  ) => {
    const color = opts?.danger ? tokens.colors.state.danger : tokens.colors.text.primary;
    return (
      <Pressable
        key={action}
        onPress={() => choose(action)}
        accessibilityRole="menuitem"
        accessibilityState={{ selected: !!opts?.checked }}
        // Estilo estático (no función): en este Modal el estilo-función de Pressable se
        // perdía y la fila caía a columna. El feedback de toque es el ripple nativo.
        android_ripple={{ color: tokens.colors.surface.elevated }}
        style={styles.row}
      >
        <View style={styles.checkSlot}>
          {opts?.checked && (
            <Check size={16} color={tokens.colors.text.primary} strokeWidth={2.4} />
          )}
        </View>
        <IconCmp size={18} color={color} strokeWidth={1.8} />
        <ThemedText variant="body" style={[styles.rowLabel, { color }]} numberOfLines={1}>
          {label}
        </ThemedText>
      </Pressable>
    );
  };

  const divider = (key: string) => (
    <View key={key} style={[styles.divider, { backgroundColor: tokens.colors.border.default }]} />
  );

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar menú">
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      </Pressable>
      <Animated.View
        accessibilityRole="menu"
        style={[
          styles.menu,
          {
            top,
            right,
            backgroundColor: tokens.colors.surface.secondary,
            borderColor: tokens.colors.border.default,
            borderRadius: tokens.radius.xl,
          },
          menuStyle,
        ]}
      >
        {row(cycleUnitLabel(cadence), CalendarDays, "cycle", { checked: view.kind === "cycle" })}
        {row("Año", CalendarRange, "year", { checked: view.kind === "year" })}
        {row("Todo el tiempo", InfinityIcon, "all", { checked: view.kind === "all" })}
        {row("Rango personalizado…", CalendarSearch, "range", { checked: view.kind === "range" })}
        {divider("d1")}
        {!isDefault && row("Restablecer predeterminado", RotateCcw, "reset", { danger: true })}
        {!isDefault && divider("d2")}
        {row("Pago y período", ChartPie, "changeDefault")}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.12)" },
  menu: {
    position: "absolute",
    width: MENU_WIDTH,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    transformOrigin: "top right",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingRight: 16,
    gap: 10,
  },
  checkSlot: { width: 30, alignItems: "flex-end" },
  rowLabel: { flex: 1, fontSize: 15 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
});
