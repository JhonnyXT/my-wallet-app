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
  View, Text, ScrollView, StyleSheet,
  PanResponder, Animated, Modal, TextInput,
  TouchableOpacity, KeyboardAvoidingView, Platform, Pressable,
  StatusBar, Dimensions, LayoutAnimation, UIManager,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { ArrowUp, ArrowDown } from "lucide-react-native";
import { getCategoryColor, getCategoryName } from "@/src/constants/theme";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useTheme } from "@/src/context/ThemeContext";

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
  alertColors?: boolean;
  isIncomeMode?: boolean; // barras verdes proporcionales, sin presupuesto ni editar
}

interface BudgetEditState {
  emoji: string;
  currentBudget: number; // límite ya guardado (0 si no hay)
  spent: number;         // monto gastado este mes en esa categoría
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
const BAR_W    = 68;
const BAR_GAP  = 14;
const H_PAD    = 28;
const GHOST_H  = 280;
const CHART_H  = GHOST_H + 8;
const POPUP_W  = 170;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function barColor(
  emoji: string,
  spent: number,
  budget?: number,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
): { bg: string; pctColor: string } {
  if (budget && budget > 0) {
    const ratio = spent / budget;
    if (ratio >= 0.90) return { bg: "#FEE2E2", pctColor: "#DC2626" };
    if (ratio >= 0.70) return { bg: "#FEF3C7", pctColor: "#D97706" };
  }
  return { bg: getCategoryColor(emoji, userCats).bg, pctColor: "#1E293B" };
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
  return `$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function getCategoryDisplayName(
  emoji: string,
  userCats?: import("@/src/constants/categoryPresets").UserCategory[],
  goals?: { emoji: string; name: string }[],
): string {
  const raw = getCategoryName(emoji, userCats);
  if (raw === emoji && goals) {
    const goalMatch = goals.find((g) => g.emoji === emoji);
    if (goalMatch) return goalMatch.name.charAt(0).toUpperCase() + goalMatch.name.slice(1).toLowerCase();
  }
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// ─── Mini modal inline de edición de presupuesto (diseño Stitch) ─────────────
function BudgetEditModal({
  state,
  onClose,
}: {
  state: BudgetEditState;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  const userCats = useSettingsStore((s) => s.userCategories);
  const goals    = useSettingsStore((s) => s.savingsGoals);
  const { emoji, currentBudget, spent } = state;
  const name         = getCategoryDisplayName(emoji, userCats, goals);
  const setBudget    = useSettingsStore((s) => s.setBudgetForCategory);
  const removeBudget = useSettingsStore((s) => s.removeBudgetForCategory);

  const [display, setDisplay] = useState(
    currentBudget > 0 ? formatMoneyInput(String(Math.round(currentBudget))) : ""
  );

  // El % consumido se actualiza en tiempo real según el nuevo monto
  const parsedBudget = parseFloat(display.replace(/\D/g, "")) || 0;
  const consumedPct  = parsedBudget > 0
    ? Math.min(Math.round((spent / parsedBudget) * 100), 100)
    : 0;
  const overBudget   = parsedBudget > 0 && spent > parsedBudget;

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
      <KeyboardAvoidingView
        style={bm.overlay}
        behavior="padding"
        pointerEvents="box-none"
      >

        <View style={[bm.card, isDark && { backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" }]}>
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
              <Text style={[
                bm.progressLabelRight,
                overBudget && { color: "#DC2626" },
              ]}>
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
                      : consumedPct > 80 ? "#F59E0B"
                      : "#135BEC",
                  },
                ]}
              />
            </View>
          </View>

          {/* ── Botones ── */}
          <View style={bm.actions}>
            <TouchableOpacity style={[bm.btnCancel, isDark && { backgroundColor: "#334155" }]} onPress={onClose} activeOpacity={0.7}>
              <Text style={[bm.btnCancelText, isDark && { color: "#94A3B8" }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={bm.btnConfirm}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={bm.btnConfirmText}>Actualizar</Text>
            </TouchableOpacity>
          </View>

          {/* Quitar límite — solo si ya existe uno */}
          {currentBudget > 0 && (
            <TouchableOpacity
              onPress={() => { removeBudget(emoji); onClose(); }}
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
  const upActive   = selection === "up";
  const downActive = selection === "down";

  // Animación de escala al aparecer
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 200, friction: 15 }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        popupStyles.card,
        { transform: [{ scale }], opacity },
      ]}
    >
      {/* ── Fila superior: ↑ Editar presupuesto — solo en modo gastos ── */}
      {!isIncomeMode && (
        <>
          <View style={[popupStyles.row, upActive && popupStyles.rowActive]}>
            <ArrowUp
              size={13}
              color={upActive ? ACCENT : "#94A3B8"}
              strokeWidth={2.5}
            />
            <Text style={[popupStyles.rowLabel, upActive && popupStyles.rowLabelActive]}>
              {"EDITAR\nPRESUPUESTO"}
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
        <ArrowDown
          size={13}
          color={downActive ? ACCENT : "#94A3B8"}
          strokeWidth={2.5}
        />
        <Text style={[popupStyles.rowLabel, downActive && popupStyles.rowLabelActive]}>
          {"NUEVA\nTRANSACCIÓN"}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── Barra con datos + PanResponder ──────────────────────────────────────────
function AnimatedBar({
  stat, fillH, pct, hasBudget, bg, pctColor, delay, budgetLineH,
  onLongPress, onSelectionChange, onRelease, onTap,
}: {
  stat: CategoryStat;
  fillH: number;
  pct: number;
  hasBudget: boolean;
  bg: string;
  pctColor: string;
  delay: number;
  budgetLineH?: number;
  onLongPress: () => void;
  onSelectionChange: (sel: "up" | "down" | null) => void;
  onRelease: (sel: "up" | "down" | null) => void;
  onTap?: (pageX: number) => void;
}) {
  const { isDark } = useTheme();
  const heightAnim = useSharedValue(0);
  const animStyle  = useAnimatedStyle(() => ({ height: heightAnim.value }));

  useEffect(() => {
    heightAnim.value = withDelay(
      delay,
      withTiming(fillH, { duration: 560, easing: Easing.out(Easing.cubic) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillH]);

  const overBudget = budgetLineH !== undefined && fillH > budgetLineH;
  const nearBudget = budgetLineH !== undefined && !overBudget && fillH > budgetLineH * 0.8;
  const lineColor  = overBudget ? "#DC2626" : nearBudget ? "#F59E0B" : "#135BEC";

  // ── Callbacks en refs para evitar stale closures en PanResponder ──
  const onLongPressRef       = useRef(onLongPress);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onReleaseRef         = useRef(onRelease);
  const onTapRef             = useRef(onTap);
  useEffect(() => { onLongPressRef.current       = onLongPress;       }, [onLongPress]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { onReleaseRef.current         = onRelease;         }, [onRelease]);
  useEffect(() => { onTapRef.current             = onTap;             }, [onTap]);

  const timerRef    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef   = useRef(false);
  const selRef      = useRef<"up" | "down" | null>(null);
  const touchX0Ref  = useRef(0);
  const touchY0Ref  = useRef(0);

  // PanResponder solo actúa DESPUÉS de que el long-press se haya activado.
  // El timer se inicia en onTouchStart del View (sin reclamar el responder),
  // de modo que el ScrollView puede robar libremente deslizamientos horizontales.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,      // No robar el toque inicial
      onMoveShouldSetPanResponder:  () => activeRef.current, // Reclamar solo tras long-press
      onPanResponderTerminationRequest: () => !activeRef.current,

      onPanResponderMove: (_, gs) => {
        if (!activeRef.current) return;
        const newSel: "up" | "down" | null =
          gs.dy < -22 ? "up" : gs.dy > 22 ? "down" : null;
        if (newSel !== selRef.current) {
          selRef.current = newSel;
          if (newSel) Haptics.selectionAsync();
          onSelectionChangeRef.current(newSel);
        }
      },

      onPanResponderRelease: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) {
          onReleaseRef.current(selRef.current);
        }
        activeRef.current = false;
        selRef.current    = null;
      },

      onPanResponderTerminate: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) {
          onReleaseRef.current(null);
        }
        activeRef.current = false;
        selRef.current    = null;
      },
    })
  ).current;

  const ghostTheme = isDark
    ? { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.07)" }
    : { borderColor: "rgba(0,0,0,0.10)",       backgroundColor: "rgba(0,0,0,0.018)" };
  const amtColor = isDark ? "#8B949E" : "#64748B";

  return (
    // El column es puramente visual — el overlay transparente encima captura los gestos
    <View style={styles.column}>
      <View style={[styles.ghost, ghostTheme]}>
        <ReAnimated.View style={[styles.fill, animStyle, { backgroundColor: bg }]} />

        {budgetLineH !== undefined && budgetLineH > 0 && budgetLineH <= GHOST_H && (
          <View
            style={[
              styles.budgetLine,
              { bottom: Math.min(budgetLineH, GHOST_H - 4), borderColor: lineColor },
            ]}
          />
        )}

        <Text style={styles.emoji}>{stat.emoji}</Text>
        <View style={styles.labelsBottom}>
          {hasBudget
            ? <Text style={[styles.pctText, { color: pctColor }]}>{pct}%</Text>
            : null
          }
          <Text style={[styles.amtText, { color: !hasBudget ? pctColor : amtColor }]}>
            {fmtAmount(stat.total)}
          </Text>
        </View>
      </View>
      {/* Overlay transparente: inicia el timer de long-press sin reclamar el responder */}
      <View
        style={styles.gestureOverlay}
        onTouchStart={(e) => {
          touchX0Ref.current = e.nativeEvent.pageX;
          touchY0Ref.current = e.nativeEvent.pageY;
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
          if (dx > 8 && dx > dy) clearTimeout(timerRef.current);
        }}
        onTouchEnd={(e) => {
          clearTimeout(timerRef.current);
          if (activeRef.current) {
            onReleaseRef.current(selRef.current);
          } else {
            // Tap corto: mostrar nombre de categoría
            const dx = Math.abs(e.nativeEvent.pageX - touchX0Ref.current);
            const dy = Math.abs(e.nativeEvent.pageY - touchY0Ref.current);
            if (dx < 10 && dy < 10) onTapRef.current?.(e.nativeEvent.pageX);
          }
          activeRef.current = false;
          selRef.current    = null;
        }}
        onTouchCancel={() => {
          clearTimeout(timerRef.current);
          if (activeRef.current) onReleaseRef.current(null);
          activeRef.current = false;
          selRef.current    = null;
        }}
        {...pan.panHandlers}
        accessible={false}
      />
    </View>
  );
}

// ─── Barra vacía + PanResponder ───────────────────────────────────────────────
function GhostBar({
  emoji, budgetLineH,
  onLongPress, onSelectionChange, onRelease, onTap,
}: {
  emoji: string;
  budgetLineH?: number;
  onLongPress: () => void;
  onSelectionChange: (sel: "up" | "down" | null) => void;
  onRelease: (sel: "up" | "down" | null) => void;
  onTap?: (pageX: number) => void;
}) {
  const { isDark } = useTheme();
  const onLongPressRef       = useRef(onLongPress);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onReleaseRef         = useRef(onRelease);
  const onTapRef             = useRef(onTap);
  useEffect(() => { onLongPressRef.current       = onLongPress;       }, [onLongPress]);
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { onReleaseRef.current         = onRelease;         }, [onRelease]);
  useEffect(() => { onTapRef.current             = onTap;             }, [onTap]);

  const timerRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const activeRef = useRef(false);
  const selRef    = useRef<"up" | "down" | null>(null);
  const touchX0Ref = useRef(0);
  const touchY0Ref = useRef(0);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,      // No robar el toque inicial
      onMoveShouldSetPanResponder:  () => activeRef.current, // Reclamar solo tras long-press
      onPanResponderTerminationRequest: () => !activeRef.current,
      onPanResponderMove: (_, gs) => {
        if (!activeRef.current) return;
        const newSel: "up" | "down" | null =
          gs.dy < -22 ? "up" : gs.dy > 22 ? "down" : null;
        if (newSel !== selRef.current) {
          selRef.current = newSel;
          if (newSel) Haptics.selectionAsync();
          onSelectionChangeRef.current(newSel);
        }
      },
      onPanResponderRelease: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) onReleaseRef.current(selRef.current);
        activeRef.current = false;
        selRef.current    = null;
      },
      onPanResponderTerminate: () => {
        clearTimeout(timerRef.current);
        if (activeRef.current) onReleaseRef.current(null);
        activeRef.current = false;
        selRef.current    = null;
      },
    })
  ).current;

  const ghostTheme = isDark
    ? { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.07)" }
    : { borderColor: "rgba(0,0,0,0.10)",       backgroundColor: "rgba(0,0,0,0.018)" };
  const ghostPctColor = isDark ? "#8B949E" : "#94A3B8";

  return (
    <View style={styles.column}>
      <View style={[styles.ghost, ghostTheme]}>
        {budgetLineH !== undefined && budgetLineH > 0 && budgetLineH <= GHOST_H && (
          <View
            style={[
              styles.budgetLine,
              { bottom: Math.min(budgetLineH, GHOST_H - 4), borderColor: "#135BEC" },
            ]}
          />
        )}
        <Text style={[styles.emoji, { opacity: 0.28 }]}>{emoji}</Text>
        <View style={styles.labelsBottom}>
          <Text style={[styles.ghostPct, { color: ghostPctColor }]}>0%</Text>
        </View>
      </View>
      <View
        style={styles.gestureOverlay}
        onTouchStart={(e) => {
          touchX0Ref.current = e.nativeEvent.pageX;
          touchY0Ref.current = e.nativeEvent.pageY;
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
          if (dx > 8 && dx > dy) clearTimeout(timerRef.current);
        }}
        onTouchEnd={(e) => {
          clearTimeout(timerRef.current);
          if (activeRef.current) {
            onReleaseRef.current(selRef.current);
          } else {
            const dx = Math.abs(e.nativeEvent.pageX - touchX0Ref.current);
            const dy = Math.abs(e.nativeEvent.pageY - touchY0Ref.current);
            if (dx < 10 && dy < 10) onTapRef.current?.(e.nativeEvent.pageX);
          }
          activeRef.current = false;
          selRef.current    = null;
        }}
        onTouchCancel={() => {
          clearTimeout(timerRef.current);
          if (activeRef.current) onReleaseRef.current(null);
          activeRef.current = false;
          selRef.current    = null;
        }}
        {...pan.panHandlers}
        accessible={false}
      />
    </View>
  );
}

// ─── Chart principal ─────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get("window").width;

interface NameBadge {
  emoji: string;
  name: string;
  /** posición x del centro de la columna relativa al ScrollView */
  colX: number;
}

export function CategoryChart({
  stats,
  allEmojis,
  totalExpenses,
  budgetByCategory = {},
  onNewTransaction,
  alertColors = true,
  isIncomeMode = false,
}: CategoryChartProps) {
  const userCategories = useSettingsStore((s) => s.userCategories);
  const savingsGoals   = useSettingsStore((s) => s.savingsGoals);
  const [popup,      setPopup]      = useState<PopupState | null>(null);
  const [budgetEdit, setBudgetEdit] = useState<BudgetEditState | null>(null);
  const [nameBadge,  setNameBadge]  = useState<NameBadge | null>(null);
  const nameBadgeAnim = useRef(new Animated.Value(0)).current;
  const nameBadgeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const prevStatsKey = useRef("");

  useEffect(() => {
    const key = stats.map(s => `${s.emoji}:${s.total}`).join(",");
    if (prevStatsKey.current && prevStatsKey.current !== key) {
      LayoutAnimation.configureNext(LayoutAnimation.create(300, "easeInEaseOut", "opacity"));
    }
    prevStatsKey.current = key;
  }, [stats]);

  function showNameBadge(badge: NameBadge) {
    clearTimeout(nameBadgeTimer.current);
    setNameBadge(badge);
    nameBadgeAnim.setValue(0);
    Animated.timing(nameBadgeAnim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    nameBadgeTimer.current = setTimeout(() => {
      Animated.timing(nameBadgeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(
        () => setNameBadge(null)
      );
    }, 1600);
  }

  // Ref para acceder al popup dentro de los callbacks del PanResponder
  const popupRef = useRef<PopupState | null>(null);
  useEffect(() => { popupRef.current = popup; }, [popup]);

  // Ref al contenedor raíz para medir posición en pantalla
  const containerRef  = useRef<View>(null);
  const [chartOrigin, setChartOrigin] = useState({ x: 0, y: 0 });

  // Máximo ingreso por categoría — base para calcular proporciones en modo ingreso
  const maxIncomeStat = isIncomeMode && stats.length > 0
    ? Math.max(...stats.map(s => s.total))
    : 1;

  const withDataSet = new Set(stats.map(s => s.emoji));
  const ordered = [
    ...stats.map(s => s.emoji),
    ...allEmojis.filter(e => !withDataSet.has(e)),
  ];

  let delay = 0;

  function makeHandlers(emoji: string, colIndex: number) {
    // Posición x aproximada de la columna dentro del chart
    const colX = H_PAD + colIndex * (BAR_W + BAR_GAP);
    // Clampear para que el popup no salga por la derecha
    const xHint = Math.min(colX, 300 - POPUP_W);

    const stat   = stats.find(s => s.emoji === emoji);
    const total  = stat?.total ?? 0;
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
        setPopup(prev => prev ? { ...prev, selection: sel } : prev);
      },
      onRelease: (sel: "up" | "down" | null) => {
        setPopup(null);
        if (sel === "up" && !isIncomeMode) {
          // Editar presupuesto solo en modo gastos
          const currentBudget = budgetByCategory[emoji] ?? 0;
          const spent         = stats.find(s => s.emoji === emoji)?.total ?? 0;
          setBudgetEdit({ emoji, currentBudget, spent });
        } else if (sel === "down") {
          const name = getCategoryDisplayName(emoji, userCategories, savingsGoals);
          onNewTransaction?.(emoji, name);
        }
      },
      onTap: (tapPageX: number) => {
        const name = getCategoryDisplayName(emoji, userCategories, savingsGoals);
        // Medir el origen del contenedor para convertir coordenada absoluta → relativa
        containerRef.current?.measure((_x, _y, _w, _h, pageX) => {
          const localX = tapPageX - pageX;
          showNameBadge({ emoji, name, colX: localX });
        });
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
          const stat = stats.find(s => s.emoji === emoji);
          const budgetAmt   = isIncomeMode ? undefined : budgetByCategory[emoji];
          const budgetLineH = undefined;
          const handlers = makeHandlers(emoji, idx);

          if (stat) {
            let fillH: number;
            let displayPct: number;
            let effectiveBudgetLineH: number | undefined = undefined;

            if (isIncomeMode) {
              // Modo ingresos: barra proporcional al mayor ingreso de categoría
              const ratio = maxIncomeStat > 0 ? stat.total / maxIncomeStat : 0;
              fillH      = Math.round(ratio * GHOST_H);
              displayPct = Math.round(ratio * 100);
            } else if (budgetAmt && budgetAmt > 0) {
              // Con presupuesto: barra = gastado / presupuesto (máx 100%)
              const ratio = Math.min(stat.total / budgetAmt, 1);
              fillH        = Math.round(ratio * GHOST_H);
              displayPct   = Math.round(ratio * 100);
            } else {
              // Sin presupuesto: barra neutra al 50% — indica que hay datos, sin alarmar
              fillH        = Math.round(GHOST_H * 0.5);
              displayPct   = 0;
              effectiveBudgetLineH = budgetLineH;
            }

            let bg: string;
            let pctColor: string;
            if (isIncomeMode) {
              bg       = "#DCFCE7"; // verde claro
              pctColor = "#16A34A"; // verde
            } else if (alertColors) {
              ({ bg, pctColor } = barColor(emoji, stat.total, budgetAmt, userCategories));
            } else {
              bg       = getCategoryColor(emoji, userCategories).bg;
              pctColor = "#1E293B";
            }

            const d = delay;
            delay += 80;
            return (
              <AnimatedBar
                key={emoji}
                stat={stat}
                fillH={fillH}
                pct={displayPct}
                hasBudget={isIncomeMode || !!(budgetAmt && budgetAmt > 0)}
                bg={bg}
                pctColor={pctColor}
                delay={d}
                budgetLineH={effectiveBudgetLineH}
                {...handlers}
              />
            );
          }
          return (
            <GhostBar
              key={emoji}
              emoji={emoji}
              budgetLineH={budgetLineH}
              {...handlers}
            />
          );
        })}
      </ScrollView>

      {/* ── Badge de nombre de categoría — aparece al tocar la columna ── */}
      {nameBadge && (
        <Animated.View
          style={[
            nameBadgeStyle.badge,
            {
              // Centrar el badge sobre el punto tocado; clampear para no salirse del contenedor
              left: Math.max(4, Math.min(nameBadge.colX - 52, SCREEN_W - 136)),
              opacity: nameBadgeAnim,
              transform: [{ translateY: nameBadgeAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={nameBadgeStyle.emoji}>{nameBadge.emoji}</Text>
          <Text style={nameBadgeStyle.label}>{nameBadge.name}</Text>
        </Animated.View>
      )}

      {/* ── Overlay oscuro + popup — se abre como Modal sobre toda la pantalla ── */}
      <Modal
        visible={popup !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPopup(null)}
      >
        {/* Fondo semi-oscuro — toca para cerrar el popup */}
        <Pressable
          style={chartOverlay.backdrop}
          onPress={() => setPopup(null)}
        />

        {/* Card del popup anclado a la posición del chart en pantalla */}
        {popup && (
          <View
            style={[
              chartOverlay.popupAbs,
              {
                top:  chartOrigin.y,
                left: Math.max(8, Math.min(
                  popup.xHint + chartOrigin.x,
                  SCREEN_W - POPUP_W - 8
                )),
              },
            ]}
            pointerEvents="none"
          >
            <CategoryPopup popup={popup} />
          </View>
        )}
      </Modal>

      {/* Mini modal para editar presupuesto (tiene su propio Modal interno) */}
      {budgetEdit && (
        <BudgetEditModal
          state={budgetEdit}
          onClose={() => setBudgetEdit(null)}
        />
      )}
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
    gap: BAR_GAP,
  },
  column: {
    width: BAR_W,
    height: CHART_H,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  ghost: {
    width: BAR_W,
    height: GHOST_H,
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.018)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 14,
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
    zIndex: 2,
  },
  fill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 9999,
    zIndex: 0,
  },
  labelsBottom: {
    alignItems: "center",
    gap: 2,
    zIndex: 2,
  },
  pctText: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    includeFontPadding: false,
  },
  amtText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
    lineHeight: 13,
    includeFontPadding: false,
  },
  ghostPct: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.20)",
    lineHeight: 15,
    includeFontPadding: false,
  },
  budgetLine: {
    position: "absolute",
    left: 6,
    right: 6,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    zIndex: 3,
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

// ─── Estilos del badge de nombre de categoría ────────────────────────────────
const nameBadgeStyle = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.07)",
    zIndex: 20,
  },
  emoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: 0.2,
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
