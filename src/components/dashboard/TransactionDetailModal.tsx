// ─── Modal de detalle de transacción (long-press) ────────────────────────────

import { useMemo } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import type { TransactionRow } from "@/src/db/db";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import type { SavingsGoal } from "@/src/store/slices/goalsSlice";
import type { PaymentMethod } from "@/src/store/useSettingsStore";
import {
  resolveCategory,
  formatDetailDate,
  formatDetailTime,
  formatDetailAmount,
} from "@/src/utils/transactionFormatters";

interface Props {
  visible:        boolean;
  onClose:        () => void;
  transaction:    TransactionRow | null;
  userCategories: { emoji: string; name: string }[];
  savingsGoals:   SavingsGoal[];
  paymentMethods: PaymentMethod[];
}

export function TransactionDetailModal({
  visible,
  onClose,
  transaction,
  userCategories,
  savingsGoals,
  paymentMethods,
}: Props) {
  const theme  = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          {transaction && (() => {
            const isExp    = transaction.amount >= 0;
            const catName  = resolveCategory(transaction.category_emoji, userCategories, savingsGoals);
            const pmName   =
              paymentMethods.find((m) => m.id === transaction.payment_method)?.name ??
              (transaction.payment_method === "cash"    ? "Efectivo"
               : transaction.payment_method === "savings" ? "Ahorros"
               : transaction.payment_method === "credit"  ? "Tarjeta"
               : "Efectivo");
            const desc = (transaction.description || "").replace(/#\w+/g, "").trim();
            let tags: string[] = [];
            if (transaction.tags && transaction.tags.trim()) {
              try { tags = JSON.parse(transaction.tags); } catch { tags = []; }
            }

            return (
              <>
                <Text style={styles.emoji}>{transaction.category_emoji}</Text>
                <Text style={[styles.amount, { color: isExp ? theme.text : "#059669" }]}>
                  {isExp ? "- " : "+ "}{formatDetailAmount(transaction.amount)}
                </Text>
                <Text style={styles.category}>{catName.toUpperCase()}</Text>

                <View style={styles.divider} />

                <View style={styles.row}>
                  <Text style={styles.label}>Tipo</Text>
                  <Text style={styles.value}>{isExp ? "Gasto" : "Ingreso"}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Cuenta</Text>
                  <Text style={styles.value}>{pmName}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Fecha</Text>
                  <Text style={styles.value}>{formatDetailDate(transaction.date)}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Hora</Text>
                  <Text style={styles.value}>{formatDetailTime(transaction.date)}</Text>
                </View>

                {desc.length > 0 && (
                  <>
                    <View style={styles.divider} />
                    <Text style={styles.desc}>"{desc}"</Text>
                  </>
                )}

                {tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {tags.map((tag) => (
                      <View key={tag} style={styles.tagPill}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            );
          })()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: t.isDark ? t.surface : "#FFFFFF",
      borderRadius: 24,
      paddingVertical: 28,
      paddingHorizontal: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 16,
    },
    emoji: {
      fontSize: 40,
      lineHeight: 48,
      marginBottom: 12,
    },
    amount: {
      fontSize: 32,
      fontWeight: "800",
      letterSpacing: -1,
      marginBottom: 4,
    },
    category: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 2,
      color: t.textSub,
      marginBottom: 4,
    },
    divider: {
      width: "100%",
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.border,
      marginVertical: 16,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      paddingVertical: 6,
    },
    label: {
      fontSize: 14,
      color: t.textSub,
    },
    value: {
      fontSize: 14,
      fontWeight: "700",
      color: t.text,
    },
    desc: {
      fontSize: 14,
      fontStyle: "italic",
      color: t.textSub,
      textAlign: "center",
      lineHeight: 20,
    },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 12,
      justifyContent: "center",
    },
    tagPill: {
      backgroundColor: t.inputBg,
      borderRadius: 9999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    tagText: {
      fontSize: 12,
      fontWeight: "600",
      color: t.textSub,
    },
  });
}
