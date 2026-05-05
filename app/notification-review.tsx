/**
 * notification-review.tsx — Pantalla de revisión de transacciones detectadas
 * automáticamente desde notificaciones bancarias.
 *
 * Diseño basado en la pantalla "Review Transactions (Light)" de Stitch.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, Pencil, Check, BellOff, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useNotificationStore, type PendingNotificationItem } from "@/src/store/useNotificationStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useToastStore } from "@/src/store/useToastStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useVoiceStore } from "@/src/store/useVoiceStore";
import { useTheme } from "@/src/context/ThemeContext";
import { formatMoneyDisplay } from "@/src/utils/formatMoney";
import type { AppTheme } from "@/src/theme";

// ─── Tipo local para items editables ─────────────────────────────────────────

type ReviewItem = {
  id: string;
  amount: number;
  description: string;
  categoryEmoji: string;
  categoryName: string;
  isExpense: boolean;
  paymentMethod: string;
  bankName: string;
  confidence: "high" | "medium" | "low";
};

function pendingToReview(item: PendingNotificationItem): ReviewItem {
  return {
    id: item.id,
    amount: item.amount,
    description: item.description || item.bankName,
    categoryEmoji: "💳",
    categoryName: "Tarjeta",
    isExpense: item.isExpense,
    paymentMethod: "debit",
    bankName: item.bankName,
    confidence: item.confidence,
  };
}

// ─── ReviewCard — Diseño Stitch ──────────────────────────────────────────────

function ReviewCard({
  item, onEdit,
}: {
  item: ReviewItem;
  onEdit: (item: ReviewItem) => void;
}) {
  const theme = useTheme();

  return (
    <View style={[cardS.card, { backgroundColor: theme.surface }]}>
      {/* Icono de categoria */}
      <View style={[cardS.catBox, { backgroundColor: "#F3F0E7" }]}>
        <Text style={{ fontSize: 22 }}>{item.categoryEmoji}</Text>
      </View>

      {/* Texto central */}
      <View style={cardS.textCol}>
        <Text style={[cardS.desc, { color: theme.text }]} numberOfLines={1}>
          {item.description}
        </Text>
        <View style={cardS.metaRow}>
          <Text style={[cardS.catName, { color: theme.textSub }]}>{item.categoryName}</Text>
          <View style={[cardS.typeBadge, { backgroundColor: item.isExpense ? "#FEE2E2" : "#D1FAE5" }]}>
            <Text style={[cardS.typeArrow, { color: item.isExpense ? "#DC2626" : "#059669" }]}>
              {item.isExpense ? "↓" : "↑"}
            </Text>
            <Text style={[cardS.typeLabel, { color: item.isExpense ? "#DC2626" : "#059669" }]}>
              {item.isExpense ? "Gasto" : "Ingreso"}
            </Text>
          </View>
        </View>
      </View>

      {/* Monto */}
      <Text style={[cardS.amount, { color: theme.text }]}>
        $ {formatMoneyDisplay(item.amount)}
      </Text>

      {/* Boton editar */}
      <TouchableOpacity
        style={cardS.editBtn}
        onPress={() => onEdit(item)}
        hitSlop={10}
        activeOpacity={0.6}
      >
        <Pencil size={14} color={theme.textSub} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function NotificationReviewScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = "#135BEC";

  const { pendingItems, clearAll } = useNotificationStore();
  const { addTransactionBatch } = useFinanceStore();
  const { addToast } = useToastStore();

  const [items, setItems] = useState<ReviewItem[]>(() => pendingItems.map(pendingToReview));

  useEffect(() => {
    const newIds = new Set(items.map((i) => i.id));
    const newOnes = pendingItems.filter((p) => !newIds.has(p.id)).map(pendingToReview);
    if (newOnes.length > 0) setItems((prev) => [...newOnes, ...prev]);
  }, [pendingItems]);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const expenseStore        = useExpenseStore();
  const pendingManualItem   = useVoiceStore((s) => s.pendingManualItem);
  const clearPendingManual  = useVoiceStore((s) => s.clearPendingManualItem);

  // Cuando active-expense devuelve un item editado/añadido, lo procesamos
  useFocusEffect(
    useCallback(() => {
      if (!pendingManualItem) return;

      if (editingItemId) {
        // Flujo edición: actualizar item existente
        setItems((prev) =>
          prev.map((i) =>
            i.id === editingItemId
              ? {
                  ...i,
                  amount:        pendingManualItem.amount,
                  description:   pendingManualItem.description,
                  isExpense:     pendingManualItem.isExpense,
                  categoryEmoji: pendingManualItem.categoryEmoji,
                  categoryName:  pendingManualItem.categoryName,
                  paymentMethod: pendingManualItem.paymentMethod,
                }
              : i
          )
        );
        setEditingItemId(null);
      } else {
        // Flujo añadir manual: agregar como nuevo item a la cola de revisión
        const newItem: ReviewItem = {
          id: `manual-${Date.now()}`,
          amount:        pendingManualItem.amount,
          description:   pendingManualItem.description,
          isExpense:     pendingManualItem.isExpense,
          categoryEmoji: pendingManualItem.categoryEmoji,
          categoryName:  pendingManualItem.categoryName,
          paymentMethod: pendingManualItem.paymentMethod,
          bankName:      "Manual",
          confidence:    "high",
        };
        setItems((prev) => [newItem, ...prev]);
      }

      clearPendingManual();
    }, [pendingManualItem, editingItemId, clearPendingManual])
  );

  const handleEdit = useCallback((item: ReviewItem) => {
    // Pre-popular useExpenseStore con los datos actuales del item
    expenseStore.setIsExpense(item.isExpense);
    expenseStore.setAmount(item.amount);
    expenseStore.setNote(item.description);
    expenseStore.setCategory(item.categoryEmoji, item.categoryName);
    setEditingItemId(item.id);
    router.push("/active-expense?from=notification-edit");
  }, [expenseStore]);

  const handleSaveAll = useCallback(async () => {
    if (items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const batch = items.map((item) => ({
      amount: item.isExpense ? Math.abs(item.amount) : -Math.abs(item.amount),
      description: item.description,
      categoryEmoji: item.categoryEmoji,
      paymentMethod: item.paymentMethod,
      date: new Date(),
    }));

    try {
      await addTransactionBatch(batch);
      clearAll();

      const expenseCount = items.filter((i) => i.isExpense).length;
      const incomeCount = items.length - expenseCount;

      addToast({
        level: "success",
        icon: "✅",
        title: `${items.length} registro${items.length !== 1 ? "s" : ""} guardado${items.length !== 1 ? "s" : ""}` +
          (incomeCount > 0 ? ` · ${incomeCount} ingreso${incomeCount !== 1 ? "s" : ""}` : ""),
        duration: 8000,
      });

      router.back();
    } catch (e) {
      addToast({ level: "error", icon: "❌", title: "Error al guardar. Intenta de nuevo.", duration: 5000 });
    }
  }, [items, addTransactionBatch, clearAll, addToast]);

  // Total absoluto para el footer
  const grandTotal = useMemo(() =>
    items.reduce((s, i) => s + i.amount, 0),
    [items]
  );

  // ─── Estado vacio ─────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <ChevronLeft size={26} color={ACCENT} />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={[s.headerTitle, { color: theme.text }]}>Revisar registros</Text>
            <Text style={[s.headerSub, { color: theme.textSub }]}>Sin transacciones pendientes</Text>
          </View>
        </View>
        <View style={s.emptyState}>
          <BellOff size={48} color={theme.textSub} />
          <Text style={[s.emptyTitle, { color: theme.text }]}>Sin transacciones pendientes</Text>
          <Text style={[s.emptyDesc, { color: theme.textSub }]}>
            Las transacciones detectadas automaticamente desde tus notificaciones bancarias apareceran aqui.
          </Text>
          <TouchableOpacity style={[s.emptyBtn, { backgroundColor: ACCENT }]} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={s.emptyBtnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Pantalla con registros ───────────────────────────────────────────────
  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Header — estilo Stitch */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <ChevronLeft size={26} color={ACCENT} />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: theme.text }]}>Revisar registros</Text>
          <Text style={[s.headerSub, { color: theme.textSub }]}>
            {items.length} transaccion{items.length !== 1 ? "es" : ""} detectada{items.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Lista de tarjetas */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            onEdit={handleEdit}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 200 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListFooterComponent={
          <View style={s.addSection}>
            <Text style={[s.addQuestion, { color: theme.textSub }]}>¿Falta algo?</Text>
            <TouchableOpacity
              style={s.addManualBtn}
              onPress={() => router.push("/active-expense?from=batch-review")}
              activeOpacity={0.7}
            >
              <Plus size={16} color={ACCENT} />
              <Text style={[s.addManualText, { color: ACCENT }]}>Anadir registro manual</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Footer fijo — estilo Stitch */}
      <View style={[s.footer, { backgroundColor: theme.bg, paddingBottom: insets.bottom + 12 }]}>
        <Text style={[s.footerSummary, { color: theme.textSub }]}>
          {items.length} REGISTRO{items.length !== 1 ? "S" : ""} · TOTAL $ {formatMoneyDisplay(grandTotal)}
        </Text>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: ACCENT }]}
          onPress={handleSaveAll}
          activeOpacity={0.85}
        >
          <Check size={18} color="#fff" strokeWidth={3} />
          <Text style={s.saveBtnText}>Guardar todo</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 13, marginTop: 2 },

  addSection: { alignItems: "center", marginTop: 24 },
  addQuestion: { fontSize: 14, marginBottom: 8 },
  addManualBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  addManualText: { fontSize: 14, fontWeight: "600" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  footerSummary: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 28,
    width: "100%",
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

const cardS = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textCol: { flex: 1 },
  desc: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catName: { fontSize: 12 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  typeArrow: { fontSize: 10, fontWeight: "700" },
  typeLabel: { fontSize: 10, fontWeight: "600" },
  amount: { fontSize: 16, fontWeight: "700", marginRight: 8 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
