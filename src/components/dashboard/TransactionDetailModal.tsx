// ─── Detalle de transacción (tap en una fila) ────────────────────────────────
// Hoja desde abajo: descripción como título, categoría, monto en color del tipo, filas de
// cuenta/fecha/lista/quién pagó, etiquetas y acciones de editar/eliminar. Eliminar no abre
// su confirmación aquí: dos Modal apilados en Android se comportan mal, así que lo pide el
// padre después de cerrar la hoja.

import { useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Pencil, Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { useTheme } from "@/src/context/ThemeContext";
import { SELF_PAYER, type TransactionRow } from "@/src/db/db";
import type { AppTheme } from "@/src/theme";
import { moneyColors } from "@/src/theme/tokens";
import type { SavingsGoal } from "@/src/store/slices/goalsSlice";
import type { PaymentMethod, WalletList } from "@/src/store/useSettingsStore";
import {
  resolveCategory,
  formatDetailTime,
  formatDetailAmount,
  dayLabel,
  extractTagsFromTx,
} from "@/src/utils/transactionFormatters";

interface Props {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionRow | null;
  userCategories: { emoji: string; name: string }[];
  savingsGoals: SavingsGoal[];
  paymentMethods: PaymentMethod[];
  lists: WalletList[];
  onEdit: (tx: TransactionRow) => void;
  onDelete: (tx: TransactionRow) => void;
}

const LEGACY_ACCOUNTS: Record<string, string> = {
  cash: "Efectivo",
  savings: "Ahorros",
  credit: "Tarjeta",
};

export function TransactionDetailModal({
  visible,
  onClose,
  transaction,
  userCategories,
  savingsGoals,
  paymentMethods,
  lists,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  // Al cerrar, el padre pasa `transaction` a null enseguida: se conserva el último para que
  // la hoja no baje vacía durante su animación de salida.
  const lastTx = useRef<TransactionRow | null>(null);
  if (transaction) lastTx.current = transaction;
  const tx = transaction ?? lastTx.current;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
    >
      {tx &&
        (() => {
          const isExp = tx.amount > 0;
          const catName = resolveCategory(tx.category_emoji, userCategories, savingsGoals);
          const account =
            paymentMethods.find((m) => m.id === tx.payment_method)?.name ??
            LEGACY_ACCOUNTS[tx.payment_method] ??
            "Efectivo";
          const desc = (tx.description || "").replace(/#\w+/g, "").trim();
          const tags = extractTagsFromTx(tx);
          const list = lists.find((l) => l.id === tx.list_id);
          const payer =
            tx.paid_by === SELF_PAYER
              ? null
              : (list?.members ?? []).find((m) => m.id === tx.paid_by);
          const showPayer = (list?.members?.length ?? 0) > 0;
          const when = `${dayLabel(tx.date.slice(0, 10))} · ${formatDetailTime(tx.date)}`;

          return (
            <>
              <View style={styles.header}>
                <View style={styles.emojiCircle}>
                  <Text style={styles.emoji}>{tx.category_emoji}</Text>
                </View>
                <Text style={styles.title} numberOfLines={3}>
                  {desc || catName}
                </Text>
                <Text style={styles.category}>{catName}</Text>
                <Text style={[styles.amount, { color: isExp ? moneyColors.expense.text : moneyColors.income.text }]}>
                  {isExp ? "- " : "+ "}
                  {formatDetailAmount(tx.amount)}
                </Text>
              </View>

              <View style={styles.rows}>
                <DetailRow styles={styles} label="Cuenta" value={account} />
                <DetailRow styles={styles} label="Fecha" value={when} />
                {list && list.id !== DEFAULT_LIST_ID && (
                  <DetailRow styles={styles} label="Lista" value={`${list.emoji} ${list.name}`} />
                )}
                {showPayer && (
                  <DetailRow styles={styles} label="Pagó" value={payer?.name ?? "Tú"} />
                )}
              </View>

              {tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {tags.map((tag) => (
                    <View key={tag} style={styles.tagPill}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.actions}>
                <PressableScale
                  onPress={() => {
                    Haptics.selectionAsync();
                    onDelete(tx);
                  }}
                  style={[styles.actionBtn, styles.deleteBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Eliminar movimiento"
                >
                  <Trash2 size={18} color="#DC2626" strokeWidth={2} />
                  <Text style={[styles.actionText, { color: "#DC2626" }]}>Eliminar</Text>
                </PressableScale>
                <PressableScale
                  onPress={() => {
                    Haptics.selectionAsync();
                    onEdit(tx);
                  }}
                  style={[styles.actionBtn, styles.editBtn]}
                  accessibilityRole="button"
                  accessibilityLabel="Editar movimiento"
                >
                  <Pencil size={18} color="#FFFFFF" strokeWidth={2} />
                  <Text style={[styles.actionText, { color: "#FFFFFF" }]}>Editar</Text>
                </PressableScale>
              </View>
            </>
          );
        })()}
    </BottomSheet>
  );
}

function DetailRow({
  styles,
  label,
  value,
}: {
  styles: ReturnType<typeof buildStyles>;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    sheet: { paddingHorizontal: 24 },
    header: { alignItems: "center", paddingTop: 4 },
    emojiCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.isDark ? t.itemBg : t.inputBg,
      marginBottom: 12,
    },
    emoji: { fontSize: 30, lineHeight: 38 },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: t.text,
      textAlign: "center",
      letterSpacing: -0.3,
    },
    category: { fontSize: 13, fontWeight: "500", color: t.textSub, marginTop: 4 },
    amount: { fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 10 },
    rows: {
      marginTop: 20,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: t.isDark ? t.itemBg : t.inputBg,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 16,
      paddingVertical: 10,
    },
    label: { fontSize: 14, color: t.textSub },
    value: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: t.text, textAlign: "right" },
    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 14,
      justifyContent: "center",
    },
    tagPill: {
      backgroundColor: t.isDark ? t.itemBg : t.inputBg,
      borderRadius: 9999,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    tagText: { fontSize: 12, fontWeight: "600", color: t.textSub },
    actions: { flexDirection: "row", gap: 12, marginTop: 22 },
    actionBtn: {
      flex: 1,
      height: 50,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    deleteBtn: { backgroundColor: t.isDark ? "rgba(220,38,38,0.16)" : "#FEE2E2" },
    editBtn: { backgroundColor: "#135BEC" },
    actionText: { fontSize: 15, fontWeight: "700" },
  });
}
