/**
 * Popups de CategoryChart: el tooltip que aparece al mantener presionada una columna
 * (CategoryPopup) y la hoja de edición de presupuesto que abre al soltar en "Editar presupuesto"
 * (BudgetEditModal). Separados del chart (gestos + animación de las barras, mucho más acoplado)
 * porque ambos son autocontenidos: reciben todo por props, sin closures sobre CategoryChart.
 */
import { View, Text, StyleSheet, Animated, TextInput, TouchableOpacity } from "react-native";
import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { ArrowUp, ArrowDown } from "lucide-react-native";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useTheme } from "@/src/context/ThemeContext";
import { moneyColors } from "@/src/theme/tokens";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { SheetActions, SheetHeader, useSheetPadding } from "@/src/components/ui/SheetParts";
import {
  fmtCOP,
  getCategoryDisplayName,
  type BudgetEditState,
  type PopupState,
} from "@/src/components/ui/categoryChartShared";

// ─── Hoja de edición del presupuesto de una categoría ────────────────────────
export function BudgetEditModal({
  state,
  onClose,
}: {
  state: BudgetEditState;
  onClose: () => void;
}) {
  const { isDark } = useTheme();
  const sheetPad = useSheetPadding();
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
    <BottomSheet visible onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader title={`${emoji} ${name}`} subtitle="Límite de gasto para esta categoría" />

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
                backgroundColor: overBudget ? "#DC2626" : consumedPct > 80 ? "#F59E0B" : "#135BEC",
              },
            ]}
          />
        </View>
      </View>

      <SheetActions
        confirmLabel="Actualizar"
        onConfirm={handleConfirm}
        onCancel={onClose}
        style={{ marginTop: 8 }}
      />

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
    </BottomSheet>
  );
}

// ─── Popup (tooltip flotante, Stitch design) ─────────────────────────────────
export function CategoryPopup({ popup }: { popup: PopupState }) {
  const { total, budget, selection, isIncomeMode } = popup;
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
  }, [scale, opacity]);

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
            isIncomeMode && { color: moneyColors.income.text },
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
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    marginVertical: 12,
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
    marginBottom: 8,
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
  removeLinkRow: {
    alignItems: "center",
    paddingTop: 16,
  },
  removeLinkText: {
    fontSize: 13,
    color: "#EF4444",
    fontWeight: "500",
  },
});
