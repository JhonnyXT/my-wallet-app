/**
 * notification-review.tsx — Pantalla de revisión de transacciones detectadas
 * automáticamente desde notificaciones bancarias.
 *
 * El usuario puede editar, descartar o confirmar cada transacción antes de guardarla.
 * Diseño basado en el sistema Stitch / Google Material You.
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
  Animated,
  PanResponder,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft, Pencil, Check, Trash2, Bell, BellOff } from "lucide-react-native";
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
            <Text style={[catS.title, { color: theme.textSub }]}>CATEGORÍA</Text>
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
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
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

            {/* Descripción */}
            <Text style={[editS.label, { color: theme.textSub }]}>Descripción</Text>
            <View style={[editS.inputWrap, { borderColor: theme.border, backgroundColor: theme.bgAlt }]}>
              <TextInput
                style={[editS.input, { color: theme.text }]}
                value={description}
                onChangeText={setDesc}
                placeholder="¿En qué?"
                placeholderTextColor={theme.textSub}
                maxLength={60}
              />
            </View>

            {/* Categoría */}
            <Text style={[editS.label, { color: theme.textSub }]}>Categoría</Text>
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

// ─── ReviewCard con swipe-left para eliminar ─────────────────────────────────

const SWIPE_THRESHOLD = 80;

function ReviewCard({
  item, categories, onEdit, onRemove,
}: {
  item: ReviewItem;
  categories: CatOption[];
  onEdit: (item: ReviewItem) => void;
  onRemove: (id: string) => void;
}) {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const ACCENT = "#135BEC";

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (g.dx < 0) translateX.setValue(Math.max(g.dx, -140));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: -140, duration: 150, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const catOption = categories.find((c) => c.key === item.categoryEmoji);
  const confidenceColor = item.confidence === "high" ? "#059669" : item.confidence === "medium" ? "#D97706" : "#DC2626";
  const confidenceLabel = item.confidence === "high" ? "Alta confianza" : item.confidence === "medium" ? "Revisar" : "Verificar";

  return (
    <View style={cardS.wrapper}>
      {/* Fondo rojo (acción eliminar) */}
      <View style={cardS.deleteBackground}>
        <Trash2 size={22} color="#fff" />
        <Text style={cardS.deleteText}>Eliminar</Text>
      </View>

      <Animated.View style={[cardS.card, { backgroundColor: theme.surface, transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        {/* Indicador de confianza */}
        <View style={[cardS.confidenceDot, { backgroundColor: confidenceColor }]} />

        <View style={cardS.leftCol}>
          {/* Categoría */}
          <View style={[cardS.catBox, { backgroundColor: catOption?.colorBg ?? "#EEE" }]}>
            <Text style={{ fontSize: 20 }}>{item.categoryEmoji}</Text>
          </View>
          <View style={cardS.textCol}>
            <Text style={[cardS.desc, { color: theme.text }]} numberOfLines={1}>{item.description}</Text>
            <Text style={[cardS.meta, { color: theme.textSub }]}>
              {item.bankName} · <Text style={{ color: confidenceColor }}>{confidenceLabel}</Text>
            </Text>
          </View>
        </View>

        <View style={cardS.rightCol}>
          <Text style={[cardS.amount, { color: item.isExpense ? "#DC2626" : "#059669" }]}>
            {item.isExpense ? "-" : "+"}${formatMoneyDisplay(item.amount)}
          </Text>
          <View style={cardS.actions}>
            <TouchableOpacity
              style={[cardS.actionBtn, { backgroundColor: ACCENT + "15" }]}
              onPress={() => onEdit(item)}
              hitSlop={8}
            >
              <Pencil size={14} color={ACCENT} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[cardS.actionBtn, { backgroundColor: "#DC262615" }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onRemove(item.id); }}
              hitSlop={8}
            >
              <Trash2 size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
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

  // Convertir items de la cola a ReviewItems editables
  const [items, setItems] = useState<ReviewItem[]>(() => pendingItems.map(pendingToReview));

  // Sincronizar si entran nuevas notificaciones mientras la pantalla está abierta
  useEffect(() => {
    const newIds = new Set(items.map((i) => i.id));
    const newOnes = pendingItems.filter((p) => !newIds.has(p.id)).map(pendingToReview);
    if (newOnes.length > 0) setItems((prev) => [...newOnes, ...prev]);
  }, [pendingItems]);

  const [editTarget, setEditTarget] = useState<ReviewItem | null>(null);

  // Construir lista de categorías para el selector
  const categories = useMemo<CatOption[]>(() => {
    const all = userCategories ?? [];
    return all.map((cat) => ({
      key: cat.emoji,
      label: cat.name,
      colorBg: cat.colorBg,
      colorAccent: cat.colorAccent,
    }));
  }, [userCategories]);

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    removePendingItem(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, [removePendingItem]);

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
      amount: item.isExpense ? -Math.abs(item.amount) : Math.abs(item.amount),
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

  const handleDiscardAll = useCallback(() => {
    clearAll();
    router.back();
  }, [clearAll]);

  // Totales
  const totalExpenses = useMemo(() =>
    items.filter((i) => i.isExpense).reduce((s, i) => s + i.amount, 0),
    [items]
  );
  const totalIncome = useMemo(() =>
    items.filter((i) => !i.isExpense).reduce((s, i) => s + i.amount, 0),
    [items]
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
        <View style={[s.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
            <ChevronLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: theme.text }]}>Transacciones detectadas</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={s.emptyState}>
          <BellOff size={48} color={theme.textSub} />
          <Text style={[s.emptyTitle, { color: theme.text }]}>Sin transacciones pendientes</Text>
          <Text style={[s.emptyDesc, { color: theme.textSub }]}>
            Las transacciones detectadas automáticamente desde tus notificaciones bancarias aparecerán aquí.
          </Text>
          <TouchableOpacity style={[s.emptyBtn, { backgroundColor: ACCENT }]} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={s.emptyBtnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <ChevronLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={[s.headerTitle, { color: theme.text }]}>Transacciones detectadas</Text>
          <Text style={[s.headerCount, { color: theme.textSub }]}>{items.length} por confirmar</Text>
        </View>
        <TouchableOpacity onPress={handleDiscardAll} style={s.discardBtn} hitSlop={8}>
          <Text style={[s.discardText, { color: "#DC2626" }]}>Descartar</Text>
        </TouchableOpacity>
      </View>

      {/* Banner informativo */}
      <View style={[s.infoBanner, { backgroundColor: ACCENT + "10", borderColor: ACCENT + "30" }]}>
        <Bell size={14} color={ACCENT} />
        <Text style={[s.infoBannerText, { color: ACCENT }]}>
          Detectadas automáticamente · Revisa antes de guardar
        </Text>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ReviewCard
            item={item}
            categories={categories}
            onEdit={handleEdit}
            onRemove={handleRemove}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer fijo con resumen y botón */}
      <View style={[s.footer, { backgroundColor: theme.surface, borderTopColor: theme.border, paddingBottom: insets.bottom + 12 }]}>
        <View style={s.footerSummary}>
          {totalExpenses > 0 && (
            <Text style={[s.footerStat, { color: "#DC2626" }]}>
              Gastos: -${formatMoneyDisplay(totalExpenses)}
            </Text>
          )}
          {totalIncome > 0 && (
            <Text style={[s.footerStat, { color: "#059669" }]}>
              Ingresos: +${formatMoneyDisplay(totalIncome)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: ACCENT }]}
          onPress={handleSaveAll}
          activeOpacity={0.85}
        >
          <Check size={18} color="#fff" />
          <Text style={s.saveBtnText}>GUARDAR TODOS ({items.length})</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de edición */}
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, alignItems: "flex-start" },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  headerCount: { fontSize: 12, marginTop: 1 },
  discardBtn: { width: 80, alignItems: "flex-end" },
  discardText: { fontSize: 14, fontWeight: "600" },
  infoBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginHorizontal: 16, marginTop: 10, marginBottom: 2,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
  },
  infoBannerText: { fontSize: 12, fontWeight: "500", flex: 1 },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingTop: 12, paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12, elevation: 8,
  },
  footerSummary: { flexDirection: "row", justifyContent: "center", gap: 16, marginBottom: 10 },
  footerStat: { fontSize: 13, fontWeight: "600" },
  saveBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.5 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

const cardS = StyleSheet.create({
  wrapper: { marginBottom: 10, borderRadius: 16, overflow: "hidden" },
  deleteBackground: {
    position: "absolute", right: 0, top: 0, bottom: 0, width: 130,
    backgroundColor: "#DC2626", flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6, borderRadius: 16,
  },
  deleteText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16,
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
    position: "relative",
  },
  confidenceDot: {
    position: "absolute", top: 10, right: 10,
    width: 7, height: 7, borderRadius: 3.5,
  },
  leftCol: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  catBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  desc: { fontSize: 15, fontWeight: "600", marginBottom: 3 },
  meta: { fontSize: 12 },
  rightCol: { alignItems: "flex-end", gap: 8 },
  amount: { fontSize: 16, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
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
