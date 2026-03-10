import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import {
  queryMonthlyExpensesByYear,
  queryFirstTransactionYear,
} from "@/src/db/queries";

// ─── Constantes ───────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const SCREEN_W  = Dimensions.get("window").width;
const SHEET_PAD = 24;
const CELL_GAP  = 8;
const CELL_W    = (SCREEN_W - SHEET_PAD * 2 - CELL_GAP * 2) / 3;

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface MonthPickerModalProps {
  visible: boolean;
  selectedYear: number | null;
  selectedMonth: number | null;
  onApply: (year: number | null, month: number | null) => void;
  onClose: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function MonthPickerModal({
  visible,
  selectedYear,
  selectedMonth,
  onApply,
  onClose,
}: MonthPickerModalProps) {
  const theme = useTheme();
  const st    = useMemo(() => buildStyles(theme), [theme]);

  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const [draftYear,     setDraftYear]     = useState<number | null>(selectedYear);
  const [draftMonth,    setDraftMonth]    = useState<number | null>(selectedMonth);
  const [monthlyTotals, setMonthlyTotals] = useState<Record<number, number>>({});
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Sincronizar draft cuando se abre — si no hay año previo, mostrar el año actual
  useEffect(() => {
    if (visible) {
      setDraftYear(selectedYear ?? currentYear);
      setDraftMonth(selectedMonth);
    }
  }, [visible]);

  // Cargar años disponibles
  useEffect(() => {
    if (!visible) return;
    queryFirstTransactionYear().then((firstYear) => {
      const years: number[] = [];
      for (let y = currentYear; y >= firstYear; y--) years.push(y);
      setAvailableYears(years);
    });
  }, [visible]);

  // Cargar totales cuando cambia el año
  useEffect(() => {
    if (draftYear === null) { setMonthlyTotals({}); return; }
    queryMonthlyExpensesByYear(draftYear).then(setMonthlyTotals);
  }, [draftYear]);

  function selectYear(year: number | null) {
    setDraftYear(year);
    setDraftMonth(null);
  }

  function selectMonth(month: number) {
    if (isFuture(month)) return;
    setDraftMonth((prev) => (prev === month ? null : month));
  }

  function isFuture(month: number): boolean {
    if (draftYear === null || draftYear < currentYear) return false;
    return month > currentMonth;
  }

  // Renderiza el grid en filas de 3
  const monthRows = [[1,2,3],[4,5,6],[7,8,9],[10,11,12]];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Wrapper flex: overlay arriba, sheet abajo */}
      <View style={st.wrapper}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={st.overlayFlex} />
        </TouchableWithoutFeedback>

        {/* Sheet */}
        <View style={st.sheet}>
        {/* Handle */}
        <View style={st.handle} />

        {/* Header */}
        <View style={st.header}>
          <Text style={st.title}>Seleccionar periodo</Text>
          <TouchableOpacity onPress={onClose} style={st.closeBtn} activeOpacity={0.7}>
            <X size={15} color={theme.textSub} strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Pills de año */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={st.yearScroll}
          contentContainerStyle={st.yearScrollContent}
        >
          <TouchableOpacity
            style={[st.yearPill, draftYear === null && st.yearPillActive]}
            onPress={() => selectYear(null)}
            activeOpacity={0.75}
          >
            <Text style={[st.yearPillText, draftYear === null && st.yearPillActiveText]}>
              Todo el tiempo
            </Text>
          </TouchableOpacity>

          {availableYears.map((y) => (
            <TouchableOpacity
              key={y}
              style={[st.yearPill, draftYear === y && st.yearPillActive]}
              onPress={() => selectYear(y)}
              activeOpacity={0.75}
            >
              <Text style={[st.yearPillText, draftYear === y && st.yearPillActiveText]}>
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Contenido: grid de meses o mensaje "Todo el tiempo" */}
        {draftYear === null ? (
          <View style={st.allTimeMsg}>
            <Text style={st.allTimeMsgText}>Se mostrarán todas las transacciones</Text>
          </View>
        ) : (
          <View style={st.monthGrid}>
            {monthRows.map((row) => (
              <View key={row[0]} style={st.monthRow}>
                {row.map((month) => {
                  const isSel    = draftMonth === month;
                  const isFut    = isFuture(month);
                  const amount   = monthlyTotals[month];

                  return (
                    <TouchableOpacity
                      key={month}
                      style={[
                        st.monthCell,
                        isSel && st.monthCellSelected,
                        isFut && st.monthCellFuture,
                      ]}
                      onPress={() => selectMonth(month)}
                      disabled={isFut}
                      activeOpacity={0.72}
                    >
                      <Text style={[st.monthName, isSel && st.monthNameSelected]}>
                        {MONTH_NAMES[month - 1]}
                      </Text>
                      {amount !== undefined ? (
                        <Text style={[st.monthAmount, isSel && st.monthAmountSelected]}>
                          {formatCompact(amount)}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        )}

        {/* Botón Aplicar */}
        <TouchableOpacity
          style={st.applyBtn}
          onPress={() => onApply(draftYear, draftMonth)}
          activeOpacity={0.85}
        >
          <Text style={st.applyBtnText}>✓  Aplicar</Text>
        </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    overlayFlex: {
      flex: 1,
    },
    sheet: {
      backgroundColor: t.surface,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: SHEET_PAD,
      paddingTop: 12,
      paddingBottom: 36,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 24,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    title: {
      fontSize: 17,
      fontWeight: "700",
      color: t.text,
      letterSpacing: -0.3,
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.inputBg,
      alignItems: "center",
      justifyContent: "center",
    },

    // ── Años
    yearScroll: {
      marginBottom: 20,
    },
    yearScrollContent: {
      flexDirection: "row",
      gap: 8,
      paddingRight: 4,
    },
    yearPill: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: t.pillNeutral,
    },
    yearPillActive: {
      backgroundColor: t.isDark ? t.accent : "#0F172A",
    },
    yearPillText: {
      fontSize: 14,
      fontWeight: "600",
      color: t.textSub,
    },
    yearPillActiveText: {
      color: "#FFFFFF",
    },

    // ── "Todo el tiempo" mensaje
    allTimeMsg: {
      alignItems: "center",
      paddingVertical: 40,
    },
    allTimeMsgText: {
      fontSize: 14,
      color: t.textSub,
    },

    // ── Grid de meses
    monthGrid: {
      marginBottom: 24,
      gap: CELL_GAP,
    },
    monthRow: {
      flexDirection: "row",
      gap: CELL_GAP,
    },
    monthCell: {
      width: CELL_W,
      paddingVertical: 14,
      paddingHorizontal: 6,
      borderRadius: 14,
      alignItems: "center",
      gap: 4,
    },
    monthCellSelected: {
      backgroundColor: "#DBEAFE",
    },
    monthCellFuture: {
      opacity: 0.3,
    },
    monthName: {
      fontSize: 14,
      fontWeight: "600",
      color: t.text,
    },
    monthNameSelected: {
      color: "#1D4ED8",
    },
    monthAmount: {
      fontSize: 11,
      fontWeight: "500",
      color: t.textSub,
    },
    monthAmountSelected: {
      color: "#3B82F6",
    },

    // ── Botón Aplicar
    applyBtn: {
      backgroundColor: "#135BEC",
      borderRadius: 16,
      height: 52,
      alignItems: "center",
      justifyContent: "center",
    },
    applyBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: -0.2,
    },
  });
}
