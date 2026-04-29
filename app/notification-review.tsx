/**
 * notification-review.tsx — Pantalla de revisión de transacciones detectadas
 * automáticamente desde notificaciones bancarias.
 *
 * Diseño basado en la pantalla "Review Transactions (Light)" de Stitch.
 */
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Pencil, Check, BellOff, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useNotificationStore, type PendingNotificationItem } from "@/src/store/useNotificationStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useToastStore } from "@/src/store/useToastStore";
import { useTheme } from "@/src/context/ThemeContext";
import { formatMoneyDisplay, formatMoneyInput } from "@/src/utils/formatMoney";
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

// ─── CategorySheet ────────────────────────────────────────────────────────────

type CatOption = { key: string; label: string; colorBg: string; colorAccent: string };

function CategorySheet({
  visible, selected, isExpense, categories, onSelect, onClose,
}: {
  visible: boolean; selected: string; isExpense: boolean;
  categories: CatOption[]; onSelect: (k: string) => void; onClose: () => void;
}) {
  const [temp, setTemp] = useState(selected);
  useEffect(() => { if (visible) setTemp(selected); }, [visible, selected]);
  const theme = useTheme();
  const ACCENT = "#135BEC";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
      </TouchableWithoutFeedback>
      <View style={[catS.container, { backgroundColor: theme.surface }]}>
        <View style={[catS.handle, { backgroundColor: theme.border }]} />
        <View style={catS.header}>
          <View>
            <Text style={[catS.title, { color: theme.textSub }]}>CATEGORIA</Text>
            <Text style={[catS.subtitle, { color: theme.text }]}>
              {isExpense ? "Elige el tipo de gasto" : "Elige el tipo de ingreso"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={{ color: ACCENT, fontWeight: "600", fontSize: 15 }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
          <View style={catS.grid}>
            {categories.map((cat) => {
              const isSel = temp === cat.key;
              return (
                <TouchableOpacity key={cat.key} style={catS.item} onPress={() => setTemp(cat.key)} activeOpacity={0.7}>
                  <View style={catS.iconWrap}>
                    <View style={[catS.iconBox, { backgroundColor: cat.colorBg }]}>
                      <Text style={{ fontSize: 22 }}>{cat.key}</Text>
                    </View>
                    {isSel && (
                      <View style={catS.checkBadge}>
                        <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={[catS.itemLabel, { color: isSel ? ACCENT : theme.text }, isSel && { fontWeight: "700" }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <TouchableOpacity
          style={[catS.confirmBtn, { backgroundColor: ACCENT }]}
          onPress={() => { onSelect(temp); onClose(); }}
          activeOpacity={0.85}
        >
          <Text style={catS.confirmText}>CONFIRMAR</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── EditItemSheet ────────────────────────────────────────────────────────────

function EditItemSheet({
  visible, item, categories, onSave, onClose,
}: {
  visible: boolean;
  item: ReviewItem | null;
  categories: CatOption[];
  onSave: (updated: ReviewItem) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const ACCENT = "#135BEC";

  const [amountStr, setAmountStr]  = useState("");
  const [description, setDesc]     = useState("");
  const [isExpense, setIsExpense]  = useState(true);
  const [catEmoji, setCatEmoji]    = useState("💳");
  const [catName, setCatName]      = useState("Tarjeta");
  const [showCatSheet, setShowCat] = useState(false);

  useEffect(() => {
    if (visible && item) {
      setAmountStr(formatMoneyDisplay(item.amount));
      setDesc(item.description);
      setIsExpense(item.isExpense);
      setCatEmoji(item.categoryEmoji);
      setCatName(item.categoryName);
    }
  }, [visible, item]);

  const handleSave = () => {
    if (!item) return;
    const raw = amountStr.replace(/\./g, "").replace(/,/g, "").replace(/[^0-9]/g, "");
    const parsed = parseInt(raw, 10);
    if (!parsed || parsed <= 0) return;
    onSave({ ...item, amount: parsed, description: description.trim() || item.bankName, isExpense, categoryEmoji: catEmoji, categoryName: catName });
  };

  const selCat = categories.find((c) => c.key === catEmoji);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }} />
        </TouchableWithoutFeedback>
        <View style={[editS.sheet, { backgroundColor: theme.surface }]}>
          <View style={[editS.handle, { backgroundColor: theme.border }]} />
          <Text style={[editS.title, { color: theme.text }]}>Editar registro</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            {/* Toggle gasto / ingreso */}
            <View style={[editS.toggle, { backgroundColor: theme.bgAlt }]}>
              {(["Gasto", "Ingreso"] as const).map((label, idx) => {
                const active = idx === 0 ? isExpense : !isExpense;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[editS.toggleBtn, active && { backgroundColor: ACCENT }]}
                    onPress={() => setIsExpense(idx === 0)}
                    activeOpacity={0.8}
                  >
                    <Text style={[editS.toggleLabel, { color: active ? "#fff" : theme.textSub }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Monto */}
            <Text style={[editS.label, { color: theme.textSub }]}>Monto</Text>
            <View style={[editS.inputWrap, { borderColor: theme.border, backgroundColor: theme.bgAlt }]}>
              <Text style={[editS.currency, { color: theme.textSub }]}>$</Text>
              <TextInput
                style={[editS.input, { color: theme.text }]}
                value={amountStr}
                onChangeText={(t) => setAmountStr(formatMoneyInput(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={theme.textSub}
              />
            </View>

            {/* Descripcion */}
            <Text style={[editS.label, { color: theme.textSub }]}>Descripcion</Text>
            <View style={[editS.inputWrap, { borderColor: theme.border, backgroundColor: theme.bgAlt }]}>
              <TextInput
                style={[editS.input, { color: theme.text }]}
                value={description}
                onChangeText={setDesc}
                placeholder="¿En que?"
                placeholderTextColor={theme.textSub}
                maxLength={60}
              />
            </View>

            {/* Categoria */}
            <Text style={[editS.label, { color: theme.textSub }]}>Categoria</Text>
            <TouchableOpacity
              style={[editS.catRow, { borderColor: theme.border, backgroundColor: theme.bgAlt }]}
              onPress={() => setShowCat(true)}
              activeOpacity={0.75}
            >
              <View style={[editS.catIcon, { backgroundColor: selCat?.colorBg ?? "#EEE" }]}>
                <Text style={{ fontSize: 18 }}>{catEmoji}</Text>
              </View>
              <Text style={[editS.catLabel, { color: theme.text }]}>{catName}</Text>
              <Text style={{ color: theme.textSub, marginLeft: "auto" }}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[editS.saveBtn, { backgroundColor: ACCENT }]} onPress={handleSave} activeOpacity={0.85}>
              <Text style={editS.saveBtnText}>GUARDAR CAMBIOS</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <CategorySheet
        visible={showCatSheet} selected={catEmoji} isExpense={isExpense}
        categories={categories}
        onSelect={(k) => {
          setCatEmoji(k);
          setCatName(categories.find((c) => c.key === k)?.label ?? k);
        }}
        onClose={() => setShowCat(false)}
      />
    </Modal>
  );
}

// ─── ReviewCard — Diseño Stitch ──────────────────────────────────────────────

function ReviewCard({
  item, categories, onEdit,
}: {
  item: ReviewItem;
  categories: CatOption[];
  onEdit: (item: ReviewItem) => void;
}) {
  const theme = useTheme();
  const catOption = categories.find((c) => c.key === item.categoryEmoji);

  return (
    <View style={[cardS.card, { backgroundColor: theme.surface }]}>
      {/* Icono de categoria */}
      <View style={[cardS.catBox, { backgroundColor: catOption?.colorBg ?? "#F3F0E7" }]}>
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

  const { pendingItems, removePendingItem, clearAll } = useNotificationStore();
  const { addTransactionBatch } = useFinanceStore();
  const { userCategories } = useSettingsStore();
  const { addToast } = useToastStore();

  const [items, setItems] = useState<ReviewItem[]>(() => pendingItems.map(pendingToReview));

  useEffect(() => {
    const newIds = new Set(items.map((i) => i.id));
    const newOnes = pendingItems.filter((p) => !newIds.has(p.id)).map(pendingToReview);
    if (newOnes.length > 0) setItems((prev) => [...newOnes, ...prev]);
  }, [pendingItems]);

  const [editTarget, setEditTarget] = useState<ReviewItem | null>(null);

  const categories = useMemo<CatOption[]>(() => {
    const all = userCategories ?? [];
    return all.map((cat) => ({
      key: cat.emoji,
      label: cat.name,
      colorBg: cat.colorBg,
      colorAccent: cat.colorAccent,
    }));
  }, [userCategories]);

  const handleEdit = useCallback((item: ReviewItem) => {
    setEditTarget(item);
  }, []);

  const handleSaveEdit = useCallback((updated: ReviewItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setEditTarget(null);
  }, []);

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
            categories={categories}
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
              onPress={() => router.push("/active-expense?from=notification-review")}
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

      {/* Modal de edicion */}
      <EditItemSheet
        visible={editTarget !== null}
        item={editTarget}
        categories={categories}
        onSave={handleSaveEdit}
        onClose={() => setEditTarget(null)}
      />
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

const editS = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 32,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  toggle: { flexDirection: "row", borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  toggleLabel: { fontSize: 14, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row", alignItems: "center", borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 14,
  },
  currency: { fontSize: 16, fontWeight: "700", marginRight: 6 },
  input: { flex: 1, fontSize: 16, fontWeight: "500" },
  catRow: {
    flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  catIcon: { width: 36, height: 36, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  catLabel: { fontSize: 15, fontWeight: "500" },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
});

const catS = StyleSheet.create({
  container: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16 },
  title: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  subtitle: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  item: { width: "22%", alignItems: "center", marginBottom: 8 },
  iconWrap: { position: "relative" },
  iconBox: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  checkBadge: {
    position: "absolute", bottom: -3, right: -3,
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#135BEC",
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff",
  },
  itemLabel: { fontSize: 11, textAlign: "center", marginTop: 5, fontWeight: "500" },
  confirmBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 12 },
  confirmText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.5 },
});
