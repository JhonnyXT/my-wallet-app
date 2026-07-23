/**
 * CategoryChart — barras de progreso verticales proporcionales
 *
 * Interacción por columna (Stitch "Popup al dejar presionado en la categoría"):
 *  • Mantener presionado → aparece popup tipo tooltip con 3 filas
 *  • Deslizar ↑ mientras presionas → selecciona "Editar presupuesto"
 *  • Deslizar ↓ mientras presionas → selecciona "Nueva transacción"
 *  • Levantar dedo → ejecuta la opción seleccionada (o cierra si ninguna)
 */
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from "react-native";
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { ArrowUp, ArrowDown } from "lucide-react-native";
import { getCategoryColor, getCategoryName } from "@/src/constants/theme";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useTheme } from "@/src/context/ThemeContext";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface CategoryStat {
  emoji: string;
  total: number;
  count: number;
}

interface CategoryChartProps {
  stats: CategoryStat[];
  allEmojis: string[];
  totalExpenses: number;
  budgetByCategory?: Record<string, number>;
  onNewTransaction?: (emoji: string, categoryName: string) => void;
  /** Tap corto en una categoría — el dashboard activa el filtro por esa categoría */
  onCategoryTap?: (emoji: string, categoryName: string) => void;
  alertColors?: boolean;
  isIncomeMode?: boolean; // barras verdes proporcionales, sin presupuesto ni editar
  animationKey?: string; // cambia para re-disparar entrada escalonada de barras
  scrollY?: SharedValue<number>; // reservado para animación futura — no usado actualmente
}

interface BudgetEditState {
  emoji: string;
  currentBudget: number; // límite ya guardado (0 si no hay)
  spent: number; // monto gastado este mes en esa categoría
}

interface PopupState {
  emoji: string;
  total: number;
  budget?: number;
  /** posición izquierda del popup relativa al chart container */
  xHint: number;
  /** qué opción está resaltada según el deslizamiento */
  selection: "up" | "down" | null;
  isIncomeMode?: boolean;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
const BAR_W = 68; // ligeramente más ancho para mejor layout horizontal
const BAR_GAP = 14;
const H_PAD = 20;
const MAX_BAR_H = 280; // altura máxima de una columna en pantalla
const MIN_GHOST_H = 44; // mínimo para que el ghost siempre sea visible
const RADIUS = 14;
export const CHART_H = MAX_BAR_H + 24; // espacio extra para labels y padding
const MIN_FILL_H = 52; // altura mínima comprimida del fill (cabe layout horizontal)
const PCT_MIN_RATIO = 0.4; // umbral mínimo (40%) para mostrar el % dentro del fill
export const COMPRESS_END = 140; // px de scroll donde los fills quedan totalmente comprimidos
export const CHART_COMPACT_H = MIN_FILL_H + 24; // altura compacta del chart wrapper (76px)
const POPUP_W = 170;

// Borde punteado neutro — siempre gris, nunca colored
const BORDER_LIGHT = "rgba(0,0,0,0.28)";
const BORDER_DARK = "rgba(255,255,255,0.45)";

// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * DISEÑO PROPORCIONAL DE COLUMNAS:
 *
 * ghostH = budget * scale  → altura del contenedor de presupuesto (proporcional)
 * fillH  = spent  * scale  → altura del fill de gasto (puede > ghostH en overspent)
 * scale  = MAX_BAR_H / maxBudget_entre_todas_las_categorias
 *
 * 3 estados:
 *  NORMAL   (ratio < 60%): solo fill, sin borde ghost
 *  WARNING  (60–99%): fill + borde ghost punteado gris (visible ENCIMA del fill)
 *  OVERSPENT(≥100%):  fill rojo que supera al ghost, ghost visible DEBAJO del fill
 *
 * El borde superior del ghost ES la línea de presupuesto — no hay elemento extra.
 */
interface BarVisual {
  fillColor: string;
  hasBorder: boolean; // muestra el borde ghost punteado (Warning + Overspent)
}

function getBarVisual(
  emoji: string,
  ratio: number, // spent / budget
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
): BarVisual {
  const { accent } = getCategoryColor(emoji, userCats);
  // Cuando hay presupuesto, el ghost bar siempre se muestra (incluso al <60%)
  // para que el usuario vea visualmente el límite. Color rojo solo si supera el 100%.
  if (ratio >= 1.0) return { fillColor: "#EF4444", hasBorder: true };
  return { fillColor: accent, hasBorder: true };
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}k`;
  }
  return `${Math.round(n)}`;
}

function fmtCOP(n: number): string {
  return `$ ${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function getCategoryDisplayName(
  emoji: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
  goals?: { emoji: string; name: string }[],
): string {
  const raw = getCategoryName(emoji, userCats);
  if (raw === emoji) {
    // getCategoryName no encontró un nombre → buscar en metas primero
    if (goals) {
      const goalMatch = goals.find((g) => g.emoji === emoji);
      if (goalMatch)
        return goalMatch.name.charAt(0).toUpperCase() + goalMatch.name.slice(1).toLowerCase();
    }
    // Fallback genérico para evitar mostrar el emoji como nombre
    return "General";
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// ─── Mini modal inline de edición de presupuesto (diseño Stitch) ─────────────
function BudgetEditModal({ state, onClose }: { state: BudgetEditState; onClose: () => void }) {
  const { isDark } = useTheme();
  const userCats = useSettingsStore((s) => s.userCategories);
  const goals = useSettingsStore((s) => s.savingsGoals);
  const { emoji, currentBudget, spent } = state;
  const name = getCategoryDisplayName(emoji, userCats, goals);
  const setBudget = useSettingsStore((s) => s.setBudgetForCategory);
  const removeBudget = useSettingsStore((s) => s.removeBudgetForCategory);

  const [display, setDisplay] = useState(
    currentBudget > 0 ? formatMoneyInput(String(Math.round(currentBudget))) : "",
  );

  // El % consumido se actualiza en tiempo real según el nuevo monto
  const parsedBudget = parseFloat(display.replace(/\D/g, "")) || 0;
  const consumedPct =
    parsedBudget > 0 ? Math.min(Math.round((spent / parsedBudget) * 100), 100) : 0;
  const overBudget = parsedBudget > 0 && spent > parsedBudget;

  function handleChange(text: string) {
    const digits = text.replace(/\D/g, "");
    setDisplay(formatMoneyInput(digits));
  }

  function handleConfirm() {
    if (parsedBudget > 0) {
      setBudget(emoji, parsedBudget);
    } else if (currentBudget > 0) {
      removeBudget(emoji);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Fondo semi-oscuro consistente con el resto de popups */}
      <Pressable style={bm.backdrop} onPress={onClose} />
      <KeyboardAvoidingView style={bm.overlay} behavior="padding" pointerEvents="box-none">
        <View
          style={[
            bm.card,
            isDark && { backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
          ]}
        >
          {/* ── Header: emoji + nombre centrado ── */}
          <View style={bm.header}>
            <Text style={bm.headerEmoji}>{emoji}</Text>
            <Text style={[bm.headerName, isDark && { color: "#F1F5F9" }]}>{name}</Text>
          </View>

          {/* ── Input de monto: $ pequeño + número grande ── */}
          <View style={bm.amountRow}>
            <Text style={[bm.currencySymbol, isDark && { color: "#94A3B8" }]}>$</Text>
            <TextInput
              style={[bm.amountInput, isDark && { color: "#F1F5F9" }]}
              value={display}
              onChangeText={handleChange}
              placeholder="0"
              placeholderTextColor={isDark ? "#475569" : "#CBD5E1"}
              keyboardType="number-pad"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
              selectionColor={ACCENT_BLUE}
            />
          </View>

          {/* ── Barra de progreso interactiva ── */}
          <View style={bm.progressSection}>
            <View style={bm.progressLabels}>
              <Text style={bm.progressLabelLeft}>PRESUPUESTO ACTUAL</Text>
              <Text style={[bm.progressLabelRight, overBudget && { color: "#DC2626" }]}>
                {consumedPct}% consumido
              </Text>
            </View>
            <View style={[bm.progressTrack, isDark && { backgroundColor: "#334155" }]}>
              <View
                style={[
                  bm.progressFill,
                  {
                    width: `${consumedPct}%` as `${number}%`,
                    backgroundColor: overBudget
                      ? "#DC2626"
                      : consumedPct > 80
                        ? "#F59E0B"
                        : "#135BEC",
                  },
                ]}
              />
            </View>
          </View>

          {/* ── Botones ── */}
          <View style={bm.actions}>
            <TouchableOpacity
              style={[bm.btnCancel, isDark && { backgroundColor: "#334155" }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[bm.btnCancelText, isDark && { color: "#94A3B8" }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={bm.btnConfirm} onPress={handleConfirm} activeOpacity={0.7}>
              <Text style={bm.btnConfirmText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {/* Quitar límite — solo si ya existe uno */}
          {currentBudget > 0 && (
            <TouchableOpacity
              onPress={() => {
                removeBudget(emoji);
                onClose();
              }}
              activeOpacity={0.7}
              style={bm.removeLinkRow}
            >
              <Text style={bm.removeLinkText}>Quitar límite</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Popup (tooltip flotante, Stitch design) ─────────────────────────────────
function CategoryPopup({ popup }: { popup: PopupState }) {
  const { emoji, total, budget, selection, isIncomeMode } = popup;
  const remaining = budget !== undefined ? budget - total : undefined;
  const overBudget = remaining !== undefined && remaining < 0;

  // Texto central del popup
  let centerText = isIncomeMode ? fmtCOP(total) : "Sin límite";
  if (!isIncomeMode && budget !== undefined && budget > 0) {
    centerText = overBudget
      ? `−${fmtCOP(Math.abs(remaining!))} excedido`
      : `${fmtCOP(remaining!)} restante`;
  }

  const ACCENT = "#135BEC";
  const upActive = selection === "up";
  const downActive = selection === "down";

  // Animación de escala al aparecer
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 15 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[popupStyles.card, { transform: [{ scale }], opacity }]}>
      {/* ── Fila superior: ↑ Editar presupuesto — solo en modo gastos ── */}
      {!isIncomeMode && (
        <>
          <View style={[popupStyles.row, upActive && popupStyles.rowActive]}>
            <ArrowUp size={13} color={upActive ? ACCENT : "#94A3B8"} strokeWidth={2.5} />
            <Text style={[popupStyles.rowLabel, upActive && popupStyles.rowLabelActive]}>
              {budget !== undefined && budget > 0 ? "EDITAR\nPRESUPUESTO" : "AGREGAR\nPRESUPUESTO"}
            </Text>
          </View>
          <View style={popupStyles.divider} />
        </>
      )}

      {/* ── Centro: restante (gastos) o total ingresado (ingresos) ── */}
      <View style={popupStyles.centerRow}>
        <Text
          style={[
            popupStyles.centerText,
            overBudget && { color: "#DC2626" },
            isIncomeMode && { color: "#16A34A" },
          ]}
          numberOfLines={1}
        >
          {centerText}
        </Text>
      </View>
      <View style={popupStyles.divider} />

      {/* ── Fila inferior: ↓ Nueva transacción ──────────────────── */}
      <View style={[popupStyles.row, downActive && popupStyles.rowActive]}>
        <ArrowDown size={13} color={downActive ? ACCENT : "#94A3B8"} strokeWidth={2.5} />
        <Text style={[popupStyles.rowLabel, downActive && popupStyles.rowLabelActive]}>
          {"NUEVA\nTRANSACCIÓN"}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Barra con datos + PanResponder ──────────────────────────────────────────
function AnimatedBar({
  stat,
  fillH,
  ghostH,
  pct,
  hasBudget,
  fillColor,
  fillOpacity,
  hasBorder,
  delay,
  onLongPress,
  onSelectionChange,
  onRelease,
  onTap,
  animationKey,
  scrollY,
}: {
  stat: CategoryStat;
  fillH: number; // altura del fill (puede > ghostH en overspent)
  ghostH: number; // altura del ghost proporcional al presupuesto
  pct: number;
  hasBudget: boolean;
  fillColor: string;
  fillOpacity: number;
  hasBorder: boolean;
  delay: number;
  animationKey?: string;
  scrollY?: SharedValue<number>;
  onLongPress: () => void;
  onSelectionChange: (sel: "up" | "down" | null) => void;
  onRelease: (sel: "up" | "down" | null) => void;
  onTap?: (pageX: number) => void;
}) {
  const { isDark } = useTheme();
  const heightAnim = useSharedValue(0);
  // Fallback si scrollY no se pasa (queda en 0, sin comprimir)
  const localScrollY = useSharedValue(0);
  const sv = scrollY ?? localScrollY;

  // Fill height = animación de entrada ∩ compresión por scroll
  const fillHeightStyle = useAnimatedStyle(() => {
    "worklet";
    const ratio = interpolate(sv.value, [0, COMPRESS_END], [0, 1], Extrapolation.CLAMP);
    const minH = Math.min(fillH, MIN_FILL_H);
    const scrolledH = fillH - (fillH - minH) * ratio; // fillH → minH
    return { height: Math.min(heightAnim.value, scrolledH) };
  });

  // Ghost: permanece visible hasta el 85% del scroll, solo desaparece al final
  const ghostFadeStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(
        sv.value,
        [COMPRESS_END * 0.85, COMPRESS_END],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  // Para barras ya compactas (fillH <= MIN_FILL_H) siempre mostramos horizontal.
  // Para barras altas, el crossfade ocurre en el último 25% del recorrido de scroll,
  // así los labels verticales (emoji+monto+%) quedan visibles durante toda la compresión.
  const isShortBar = fillH <= MIN_FILL_H;

  const verticalOpacityStyle = useAnimatedStyle(() => {
    "worklet";
    if (isShortBar) return { opacity: 0 };
    return {
      // Empieza a desvanecerse en el 75% del scroll y termina al 100%
      opacity: interpolate(
        sv.value,
        [COMPRESS_END * 0.75, COMPRESS_END],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  });

  const horizontalOpacityStyle = useAnimatedStyle(() => {
    "worklet";
    if (isShortBar) return { opacity: 1 };
    return {
      // Aparece en el último 25% del scroll, cuando el pill ya es pequeño
      opacity: interpolate(
        sv.value,
        [COMPRESS_END * 0.75, COMPRESS_END],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  // Animar al cambiar fillH O al cambiar animationKey (re-entrada escalonada)
  useEffect(() => {
    heightAnim.value = 0;
    heightAnim.value = withDelay(
      delay,
      withTiming(fillH, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillH, animationKey]);

  // ── Callbacks en refs para evitar stale closures en PanResponder ──
  const onLongPressRef = useRef(onLongPress);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onReleaseRef = useRef(onRelease);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);
  useEffect(() => {
    onReleaseRef.current = onRelease;
  }, [onRelease]);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef(false);
  const selRef = useRef<"up" | "down" | null>(null);
  const touchX0Ref = useRef(0);
  const touchY0Ref = useRef(0);
  // Flag para evitar que el `onTouchEnd` dispare un tap inmediatamente después
  // de que el long-press haya consumido el gesto (PanResponder ya reseteó activeRef)
  const consumedRef = useRef(false);

  // PanResponder solo actúa DESPUÉS de que el long-press se haya activado.
  // El timer se inicia en onTouchStart del View (sin reclamar el responder),
  // de modo que el ScrollView puede robar libremente deslizamientos horizontales.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // No robar el toque inicial
      onMoveShouldSetPanResponder: () => activeRef.current, // Reclamar solo tras long-press
      onPanResponderTerminationRequest: () => !activeRef.current,

      onPanResponderMove: (_, gs) => {
        if (!activeRef.current) return;
        const newSel: "up" | "down" | null = gs.dy < -22 ? "up" : gs.dy > 22 ? "down" : null;
        if (newSel !== selRef.current) {
          selRef.current = newSel;
          if (newSel) Haptics.selectionAsync();
          onSelectionChangeRef.current(newSel);
        }
      },

      onPanResponderRelease: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) {
          consumedRef.current = true;
          onReleaseRef.current(selRef.current);
        }
        activeRef.current = false;
        selRef.current = null;
      },

      onPanResponderTerminate: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) {
          consumedRef.current = true;
          onReleaseRef.current(null);
        }
        activeRef.current = false;
        selRef.current = null;
      },
    }),
  ).current;

  const labelColor = isDark ? "#F1F5F9" : "#1E293B";
  const borderColor = isDark ? BORDER_DARK : BORDER_LIGHT;

  return (
    <View style={styles.column}>
      {/* 1. Fill: crece desde abajo hasta fillH. fillOpacity 0.68 con color, 1.0 con gris neutro */}
      <ReAnimated.View
        style={[styles.fill, fillHeightStyle, { backgroundColor: fillColor, opacity: fillOpacity }]}
      />

      {/* 2. Ghost border — se desvanece al comprimir (no hay espacio en modo compacto) */}
      {hasBorder && ghostH > 0 && (
        <ReAnimated.View
          style={[styles.ghostBorder, { height: ghostH, borderColor }, ghostFadeStyle]}
        />
      )}

      {/* 3a. Labels verticales (emoji + monto + % dentro del fill) — desaparecen al comprimir */}
      <ReAnimated.View style={[styles.labelsInner, verticalOpacityStyle]}>
        <Text style={styles.emojiText}>{stat.emoji}</Text>
        <Text style={[styles.amtText, { color: labelColor }]}>{fmtAmount(stat.total)}</Text>
        {hasBudget && pct >= PCT_MIN_RATIO * 100 && (
          <Text style={[styles.pctText, { color: labelColor }]}>{pct}%</Text>
        )}
      </ReAnimated.View>

      {/* 3b. Labels horizontales (emoji izq | monto der) — aparecen al comprimir */}
      <ReAnimated.View style={[styles.labelsHorizontal, horizontalOpacityStyle]}>
        <Text style={styles.emojiCompact}>{stat.emoji}</Text>
        <Text style={[styles.amtTextCompact, { color: labelColor }]} numberOfLines={1}>
          {fmtAmount(stat.total)}
        </Text>
      </ReAnimated.View>
      {/* Overlay transparente: inicia el timer de long-press sin reclamar el responder */}
      <View
        style={styles.gestureOverlay}
        onTouchStart={(e) => {
          touchX0Ref.current = e.nativeEvent.pageX;
          touchY0Ref.current = e.nativeEvent.pageY;
          consumedRef.current = false;
          timerRef.current = setTimeout(() => {
            activeRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLongPressRef.current();
          }, 380);
        }}
        onTouchMove={(e) => {
          if (activeRef.current) return;
          const dx = Math.abs(e.nativeEvent.pageX - touchX0Ref.current);
          const dy = Math.abs(e.nativeEvent.pageY - touchY0Ref.current);
          // Cancelar en cualquier movimiento significativo — permite el scroll vertical al FlatList
          if (dx > 8 || dy > 8) clearTimeout(timerRef.current);
        }}
        onTouchEnd={(e) => {
          clearTimeout(timerRef.current);
          if (activeRef.current) {
            // Long-press estaba activo y aún no fue consumido por PanResponder
            consumedRef.current = true;
            onReleaseRef.current(selRef.current);
          } else if (!consumedRef.current) {
            // Tap corto SOLO si el gesto no fue ya consumido por un long-press
            const dx = Math.abs(e.nativeEvent.pageX - touchX0Ref.current);
            const dy = Math.abs(e.nativeEvent.pageY - touchY0Ref.current);
            if (dx < 10 && dy < 10) onTapRef.current?.(e.nativeEvent.pageX);
          }
          activeRef.current = false;
          selRef.current = null;
        }}
        onTouchCancel={() => {
          clearTimeout(timerRef.current);
          if (activeRef.current) {
            consumedRef.current = true;
            onReleaseRef.current(null);
          }
          activeRef.current = false;
          selRef.current = null;
        }}
        {...pan.panHandlers}
        accessible={false}
      />
    </View>
  );
}

// ─── Barra vacía + PanResponder ───────────────────────────────────────────────
function GhostBar({
  emoji,
  onLongPress,
  onSelectionChange,
  onRelease,
  onTap,
}: {
  emoji: string;
  onLongPress: () => void;
  onSelectionChange: (sel: "up" | "down" | null) => void;
  onRelease: (sel: "up" | "down" | null) => void;
  onTap?: (pageX: number) => void;
}) {
  const { isDark } = useTheme();
  const onLongPressRef = useRef(onLongPress);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onReleaseRef = useRef(onRelease);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onLongPressRef.current = onLongPress;
  }, [onLongPress]);
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);
  useEffect(() => {
    onReleaseRef.current = onRelease;
  }, [onRelease]);
  useEffect(() => {
    onTapRef.current = onTap;
  }, [onTap]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef(false);
  const selRef = useRef<"up" | "down" | null>(null);
  const touchX0Ref = useRef(0);
  const touchY0Ref = useRef(0);
  // Flag para evitar que `onTouchEnd` dispare un tap después de que el long-press
  // ya consumió el gesto (PanResponder reseteó activeRef antes de que llegue onTouchEnd)
  const consumedRef = useRef(false);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false, // No robar el toque inicial
      onMoveShouldSetPanResponder: () => activeRef.current, // Reclamar solo tras long-press
      onPanResponderTerminationRequest: () => !activeRef.current,
      onPanResponderMove: (_, gs) => {
        if (!activeRef.current) return;
        const newSel: "up" | "down" | null = gs.dy < -22 ? "up" : gs.dy > 22 ? "down" : null;
        if (newSel !== selRef.current) {
          selRef.current = newSel;
          if (newSel) Haptics.selectionAsync();
          onSelectionChangeRef.current(newSel);
        }
      },
      onPanResponderRelease: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) {
          consumedRef.current = true;
          onReleaseRef.current(selRef.current);
        }
        activeRef.current = false;
        selRef.current = null;
      },
      onPanResponderTerminate: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) {
          consumedRef.current = true;
          onReleaseRef.current(null);
        }
        activeRef.current = false;
        selRef.current = null;
      },
    }),
  ).current;

  const labelColor = isDark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.18)";

  return (
    <View style={styles.column}>
      {/* Sin ghost border — columna vacía es solo el emoji con baja opacidad */}
      <View style={styles.labelsInner}>
        <Text style={[styles.emojiText, { opacity: 0.25 }]}>{emoji}</Text>
        <Text style={[styles.ghostDash, { color: labelColor }]}>—</Text>
      </View>
      <View
        style={styles.gestureOverlay}
        onTouchStart={(e) => {
          touchX0Ref.current = e.nativeEvent.pageX;
          touchY0Ref.current = e.nativeEvent.pageY;
          consumedRef.current = false;
          timerRef.current = setTimeout(() => {
            activeRef.current = true;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onLongPressRef.current();
          }, 380);
        }}
        onTouchMove={(e) => {
          if (activeRef.current) return;
          const dx = Math.abs(e.nativeEvent.pageX - touchX0Ref.current);
          const dy = Math.abs(e.nativeEvent.pageY - touchY0Ref.current);
          // Cancelar en cualquier movimiento significativo — permite el scroll vertical al FlatList
          if (dx > 8 || dy > 8) clearTimeout(timerRef.current);
        }}
        onTouchEnd={(e) => {
          clearTimeout(timerRef.current);
          if (activeRef.current) {
            consumedRef.current = true;
            onReleaseRef.current(selRef.current);
          } else if (!consumedRef.current) {
            const dx = Math.abs(e.nativeEvent.pageX - touchX0Ref.current);
            const dy = Math.abs(e.nativeEvent.pageY - touchY0Ref.current);
            if (dx < 10 && dy < 10) onTapRef.current?.(e.nativeEvent.pageX);
          }
          activeRef.current = false;
          selRef.current = null;
        }}
        onTouchCancel={() => {
          clearTimeout(timerRef.current);
          if (activeRef.current) {
            consumedRef.current = true;
            onReleaseRef.current(null);
          }
          activeRef.current = false;
          selRef.current = null;
        }}
        {...pan.panHandlers}
        accessible={false}
      />
    </View>
  );
}

// ─── Chart principal ─────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;

export function CategoryChart({
  stats,
  allEmojis,
  totalExpenses,
  budgetByCategory = {},
  onNewTransaction,
  onCategoryTap,
  alertColors = true,
  isIncomeMode = false,
  animationKey,
  scrollY,
}: CategoryChartProps) {
  const { isDark } = useTheme();
  const userCategories = useSettingsStore((s) => s.userCategories);
  const savingsGoals = useSettingsStore((s) => s.savingsGoals);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [budgetEdit, setBudgetEdit] = useState<BudgetEditState | null>(null);
  const prevStatsKey = useRef("");

  // Color gris adaptable a tema para barras sin presupuesto
  const NEUTRAL_FILL = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";

  useEffect(() => {
    const key = stats.map((s) => `${s.emoji}:${s.total}`).join(",");
    if (prevStatsKey.current && prevStatsKey.current !== key) {
      LayoutAnimation.configureNext(LayoutAnimation.create(300, "easeInEaseOut", "opacity"));
    }
    prevStatsKey.current = key;
  }, [stats]);

  // Ref para acceder al popup dentro de los callbacks del PanResponder
  const popupRef = useRef<PopupState | null>(null);
  useEffect(() => {
    popupRef.current = popup;
  }, [popup]);

  // Ref al contenedor raíz para medir posición en pantalla
  const containerRef = useRef<View>(null);
  const [chartOrigin, setChartOrigin] = useState({ x: 0, y: 0 });

  // ─── Escala proporcional ──────────────────────────────────────────────────
  // La escala se calcula sobre el mayor valor entre presupuestos y gastos,
  // de modo que las barras grises (sin presupuesto) y las coloreadas (con presupuesto)
  // mantengan una relación visual coherente.
  const maxIncomeStat =
    isIncomeMode && stats.length > 0 ? Math.max(...stats.map((s) => s.total)) : 1;

  const maxSpent = stats.length > 0 ? Math.max(...stats.map((s) => s.total)) : 0;
  const maxBudgetValue = Math.max(...Object.values(budgetByCategory ?? {}).filter((v) => v > 0), 0);

  const maxBudget = isIncomeMode ? maxIncomeStat : Math.max(maxBudgetValue, maxSpent, 1);

  const scale = MAX_BAR_H / maxBudget;

  // ─── Orden: 1) categorías CON presupuesto, 2) con gasto sin presupuesto, 3) vacías ───
  const withDataSet = new Set(stats.map((s) => s.emoji));
  const ordered = isIncomeMode
    ? [...stats.map((s) => s.emoji), ...allEmojis.filter((e) => !withDataSet.has(e))]
    : (() => {
        const withBudget = stats
          .filter((s) => (budgetByCategory[s.emoji] ?? 0) > 0)
          .map((s) => s.emoji);
        const withoutBudget = stats
          .filter((s) => (budgetByCategory[s.emoji] ?? 0) <= 0)
          .map((s) => s.emoji);
        return [...withBudget, ...withoutBudget, ...allEmojis.filter((e) => !withDataSet.has(e))];
      })();

  let delay = 0;

  function makeHandlers(emoji: string, colIndex: number) {
    // Posición x aproximada de la columna dentro del chart
    const colX = H_PAD + colIndex * (BAR_W + BAR_GAP);
    // Clampear para que el popup no salga por la derecha
    const xHint = Math.min(colX, 300 - POPUP_W);

    const stat = stats.find((s) => s.emoji === emoji);
    const total = stat?.total ?? 0;
    const budget = isIncomeMode ? undefined : budgetByCategory[emoji];

    return {
      onLongPress: () => {
        // Medir posición absoluta en pantalla para anclar el popup dentro del Modal
        containerRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
          setChartOrigin({ x: pageX, y: pageY });
          setPopup({ emoji, total, budget, xHint, selection: null, isIncomeMode });
        });
      },
      onSelectionChange: (sel: "up" | "down" | null) => {
        setPopup((prev) => (prev ? { ...prev, selection: sel } : prev));
      },
      onRelease: (sel: "up" | "down" | null) => {
        setPopup(null);
        if (sel === "up" && !isIncomeMode) {
          // Editar presupuesto solo en modo gastos
          const currentBudget = budgetByCategory[emoji] ?? 0;
          const spent = stats.find((s) => s.emoji === emoji)?.total ?? 0;
          setBudgetEdit({ emoji, currentBudget, spent });
        } else if (sel === "down") {
          const name = getCategoryDisplayName(emoji, userCategories, savingsGoals);
          onNewTransaction?.(emoji, name);
        }
      },
      onTap: () => {
        // Tap corto → activar filtro por categoría en el dashboard
        const name = getCategoryDisplayName(emoji, userCategories, savingsGoals);
        onCategoryTap?.(emoji, name);
      },
    };
  }

  return (
    <View ref={containerRef} style={styles.chartContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={popup === null}
      >
        {ordered.map((emoji, idx) => {
          const stat = stats.find((s) => s.emoji === emoji);
          const budgetAmt = isIncomeMode ? undefined : budgetByCategory[emoji];
          const handlers = makeHandlers(emoji, idx);

          if (stat) {
            // ── Alturas proporcionales ───────────────────────────────────────
            let fillH: number;
            let ghostH: number;
            let displayPct: number;
            let ratio = 0;

            if (isIncomeMode) {
              ratio = maxIncomeStat > 0 ? stat.total / maxIncomeStat : 0;
              fillH = Math.round(ratio * MAX_BAR_H);
              ghostH = 0; // sin ghost en ingresos
              displayPct = Math.round(ratio * 100);
            } else if (budgetAmt && budgetAmt > 0) {
              ratio = stat.total / budgetAmt;
              // Mínimo de MIN_FILL_H cuando hay gasto real, para que los labels siempre quepan dentro del fill
              fillH =
                stat.total > 0
                  ? Math.max(Math.min(Math.round(stat.total * scale), MAX_BAR_H), MIN_FILL_H)
                  : Math.min(Math.round(stat.total * scale), MAX_BAR_H);
              // MIN_GHOST_H garantiza que el ghost siempre sea visible aunque el presupuesto sea muy pequeño
              ghostH = Math.max(Math.min(Math.round(budgetAmt * scale), MAX_BAR_H), MIN_GHOST_H);
              // Si no está excedido, el ghost debe ser siempre >= fill para respetar la jerarquía visual
              if (ratio < 1.0) ghostH = Math.max(ghostH, fillH);
              // Si está excedido (ratio >= 1): el ghost muestra el nivel real de presupuesto
              // DENTRO del fill rojo, proporcional al ratio → borde punteado a fillH/ratio
              if (ratio >= 1.0) ghostH = Math.max(Math.round(fillH / ratio), MIN_GHOST_H);
              displayPct = Math.round(ratio * 100);
            } else {
              // Sin presupuesto: barra GRIS proporcional al gasto real
              fillH =
                stat.total > 0
                  ? Math.max(Math.min(Math.round(stat.total * scale), MAX_BAR_H), MIN_FILL_H)
                  : 0;
              ghostH = 0;
              displayPct = 0;
            }

            // ── Visual ──────────────────────────────────────────────────────
            let visual: BarVisual;
            if (isIncomeMode) {
              visual = { fillColor: "#22C55E", hasBorder: false }; // verde para ingresos
            } else if (alertColors && budgetAmt && budgetAmt > 0) {
              visual = getBarVisual(emoji, ratio, userCategories);
            } else {
              // Sin presupuesto: gris adaptable a tema (sin ghost border)
              visual = { fillColor: NEUTRAL_FILL, hasBorder: false };
            }

            const d = delay;
            delay += 80;
            // Opacidad del fill: 1.0 cuando es gris neutro (sin presupuesto), 0.68 con color
            const isNeutral = !isIncomeMode && !(budgetAmt && budgetAmt > 0);
            const fillOpacity = isNeutral ? 1 : 0.68;
            return (
              <AnimatedBar
                key={emoji}
                stat={stat}
                fillH={fillH}
                ghostH={ghostH}
                pct={displayPct}
                hasBudget={isIncomeMode || !!(budgetAmt && budgetAmt > 0)}
                fillColor={visual.fillColor}
                fillOpacity={fillOpacity}
                hasBorder={visual.hasBorder}
                delay={d}
                animationKey={animationKey}
                scrollY={scrollY}
                {...handlers}
              />
            );
          }
          return <GhostBar key={emoji} emoji={emoji} {...handlers} />;
        })}
      </ScrollView>

      {/* ── Overlay oscuro + popup — se abre como Modal sobre toda la pantalla ── */}
      <Modal
        visible={popup !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPopup(null)}
      >
        {/* Fondo semi-oscuro — toca para cerrar el popup */}
        <Pressable style={chartOverlay.backdrop} onPress={() => setPopup(null)} />

        {/* Card del popup anclado a la posición del chart en pantalla */}
        {popup && (
          <View
            style={[
              chartOverlay.popupAbs,
              {
                top: chartOrigin.y,
                left: Math.max(8, Math.min(popup.xHint + chartOrigin.x, SCREEN_W - POPUP_W - 8)),
              },
            ]}
            pointerEvents="none"
          >
            <CategoryPopup popup={popup} />
          </View>
        )}
      </Modal>

      {/* Mini modal para editar presupuesto (tiene su propio Modal interno) */}
      {budgetEdit && <BudgetEditModal state={budgetEdit} onClose={() => setBudgetEdit(null)} />}
    </View>
  );
}

// ─── Estilos de barras ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chartContainer: {
    height: CHART_H,
    position: "relative",
    overflow: "visible",
  },
  scrollContent: {
    height: CHART_H,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
    gap: BAR_GAP,
  },
  column: {
    width: BAR_W,
    height: MAX_BAR_H,
    alignItems: "center",
    // Sin overflow:hidden — fill capped a MAX_BAR_H, no necesita clipping
  },
  // Borde punteado del ghost (transparente + outline dashed)
  ghostBorder: {
    position: "absolute",
    bottom: 0, // anclar al fondo — height se pasa dinámicamente (ghostH)
    left: 0,
    right: 0,
    // NO top: 0 aquí — si se pone top:0 + bottom:0 juntos ignoran el height dinámico
    borderRadius: RADIUS,
    borderWidth: 1.5,
    borderStyle: "dashed",
    backgroundColor: "transparent",
    zIndex: 2, // encima del fill (zIndex 0), debajo de labels (zIndex 5)
  },
  // Barra de relleno — absolutamente posicionada en el fondo del column
  fill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: RADIUS, // redondeado en las 4 esquinas
  },
  // Labels verticales: emoji + monto + % apilados al fondo del fill
  labelsInner: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 8,
    zIndex: 5,
  },
  // Labels horizontales: emoji izq | monto der (layout compacto al comprimir)
  labelsHorizontal: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: MIN_FILL_H,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    zIndex: 5,
  },
  emojiText: {
    fontSize: 18,
    lineHeight: 22,
    includeFontPadding: false,
  },
  emojiCompact: {
    fontSize: 15,
    lineHeight: 18,
    includeFontPadding: false,
  },
  amtText: {
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 13,
    includeFontPadding: false,
  },
  amtTextCompact: {
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
    includeFontPadding: false,
    flexShrink: 1,
    textAlign: "right",
  },
  pctText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
    includeFontPadding: false,
    opacity: 0.75,
  },
  ghostDash: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
    includeFontPadding: false,
  },
  // Overlay transparente que captura gestos sin afectar el renderizado visual del ghost
  gestureOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    zIndex: 10,
  },
});

// ─── Overlay oscuro para el popup de gráfica ─────────────────────────────────
const chartOverlay = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  popupAbs: {
    position: "absolute",
    width: POPUP_W,
    zIndex: 50,
  },
});

// ─── Estilos del popup ────────────────────────────────────────────────────────
const popupStyles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 10,
    // Borde sutil
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rowActive: {
    backgroundColor: "#EEF3FF",
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.4,
    lineHeight: 15,
  },
  rowLabelActive: {
    color: "#135BEC",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginHorizontal: 0,
  },
  centerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  centerEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  centerText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
});

// ─── Estilos del mini modal de presupuesto (Stitch: "Mini Popup para editar presupuesto")
const ACCENT_BLUE = "#135BEC";

const bm = StyleSheet.create({
  // Fondo semi-oscuro consistente con el resto de popups
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  // Contenedor que centra la card
  overlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 16,
  },
  // Emoji + nombre centrado
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  headerEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  // Fila de monto: $ pequeño + número grande
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    marginVertical: -4,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: "800",
    letterSpacing: -2,
    color: "#0F172A",
    minWidth: 60,
    padding: 0,
    includeFontPadding: false,
    textAlign: "center",
  },
  // Sección de progreso
  progressSection: {
    gap: 8,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabelLeft: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.5,
  },
  progressLabelRight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#135BEC",
  },
  progressTrack: {
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 9999,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 9999,
  },
  // Botones
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 9999,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  btnCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748B",
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 9999,
    alignItems: "center",
    backgroundColor: ACCENT_BLUE,
  },
  btnConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Quitar límite — enlace sutil
  removeLinkRow: {
    alignItems: "center",
    marginTop: -8,
  },
  removeLinkText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
});
