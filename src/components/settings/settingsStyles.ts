import { useMemo } from "react";
import { StyleSheet } from "react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

/**
 * Estilos de las filas de tipo "lista estilo Tus listas" (emoji en círculo + nombre + subtítulo),
 * compartidos por CategoriesSheet, PaymentMethodsSection, GoalItem, DebtItem y la lista inline de
 * "Presupuestos" en SettingsScreen. Ver AGENTS.md → "Ajustes" para el patrón visual.
 */
export const catSheet = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 6 },
});

export function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 8,
      backgroundColor: t.bg,
    },
    backBtn: {
      width: 36,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: t.text,
      letterSpacing: -0.5,
    },

    scroll: { paddingHorizontal: 20, paddingTop: 8 },

    sectionHeader: {
      fontSize: 11,
      fontWeight: "800",
      color: t.textSub,
      letterSpacing: 1.8,
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },

    card: {
      backgroundColor: t.surface,
      borderRadius: 16,
      overflow: "hidden",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      minHeight: 60,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.inputBg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    rowText: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: "600", color: t.text, lineHeight: 20 },
    rowSep: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 64 },

    payRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    payRowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: t.inputBg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    payRowEmoji: { fontSize: 18 },
    payAction: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    addMethodBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    addMethodText: { fontSize: 14, fontWeight: "600", color: t.accent },

    subCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 16,
      gap: 12,
    },
    subCardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: t.inputBg,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    subCardText: { flex: 1 },
    subCardLabel: { fontSize: 15, fontWeight: "700", color: t.text, lineHeight: 20 },
    subCardDesc: { fontSize: 13, color: t.textSub, marginTop: 2, lineHeight: 18 },

    modalMoneyPrefix: {
      fontSize: 13,
      fontWeight: "600",
      color: t.textSub,
      marginBottom: -8,
    },
    modalMoneySuffix: {
      fontSize: 12,
      fontWeight: "500",
      color: t.textSub,
      textAlign: "right",
      marginTop: -8,
    },
    modalInput: {
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      color: t.text,
      backgroundColor: t.bg,
    },
    modalInputMoney: {
      fontSize: 22,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: t.text,
      textAlign: "right",
    },

    // ── Metas de ahorro — campos de modales ──────────────────────────────────
    goalFieldLabel: {
      fontSize: 11,
      fontWeight: "700" as const,
      color: t.textSub,
      letterSpacing: 0.8,
      textTransform: "uppercase" as const,
    },
    goalAmountRow: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      borderWidth: 1.5,
      borderColor: t.border,
      borderRadius: 12,
      backgroundColor: t.bg,
      paddingHorizontal: 14,
    },
    goalAmountPrefix: {
      fontSize: 14,
      fontWeight: "600" as const,
      color: t.textSub,
      marginRight: 8,
    },
    goalAmountInput: {
      flex: 1,
      paddingVertical: 13,
      fontSize: 18,
      fontWeight: "700" as const,
      color: t.text,
    },

    sheetTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: t.text,
      paddingHorizontal: 20,
      marginBottom: 4,
    },
    sheetOption: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    sheetOptionText: { fontSize: 15, color: t.text },
    sheetSep: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border,
      marginHorizontal: 20,
    },
  });
}

export function useStyles() {
  const t = useTheme();
  return useMemo(() => buildStyles(t), [t]);
}
