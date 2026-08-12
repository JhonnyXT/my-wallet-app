/**
 * voice-batch-review.tsx — Pantalla de revisión de transacciones multi-voz.
 * Se muestra cuando el NLP detecta >= 2 montos en un solo input de voz.
 * El usuario puede editar, eliminar y confirmar cada transacción antes de guardar.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useFocusEffect, router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Animated,
  PanResponder,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Pencil, Check, Trash2, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import {
  useVoiceStore,
  type PendingTransaction,
  type ManualAddItem,
} from "@/src/store/useVoiceStore";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useTheme } from "@/src/context/ThemeContext";
import { getCategoryColor, getCategoryName } from "@/src/constants/theme";
import { formatMoneyDisplay } from "@/src/utils/formatMoney";
import type { AppTheme } from "@/src/theme";

// ─── Tipos locales ────────────────────────────────────────────────────────────

type ReviewItem = {
  id: string;
  amount: number; // siempre positivo; el signo lo da isExpense
  description: string;
  categoryEmoji: string;
  categoryName: string;
  isExpense: boolean;
  paymentMethod: string;
};

function pendingToReviewItem(t: PendingTransaction, idx: number): ReviewItem {
  return {
    id: `${Date.now()}-${idx}`,
    amount: Math.abs(t.amount ?? 0),
    description: t.note ?? t.rawTranscript ?? "Registro por voz",
    categoryEmoji: t.categoryEmoji ?? "💰",
    categoryName: t.categoryName ?? "General",
    isExpense: t.isExpense ?? true,
    paymentMethod: "cash",
  };
}

// ─── CategorySheet (igual al de active-expense, adaptado inline) ──────────────

type CatOption = { key: string; label: string; colorBg: string; colorAccent: string };

function CategorySheet({
  visible,
  selected,
  isExpense,
  categories,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  isExpense: boolean;
  categories: CatOption[];
  onSelect: (k: string) => void;
  onClose: () => void;
}) {
  const [temp, setTemp] = useState(selected);
  useEffect(() => {
    if (visible) setTemp(selected);
  }, [visible, selected]);
  const theme = useTheme();
  const ACCENT = "#135BEC";

  return (
    <BottomSheet visible={visible} onClose={onClose} style={catS.container}>
      <View style={catS.header}>
        <View>
          <Text style={[catS.title, { color: theme.textSub }]}>CATEGORÍA</Text>
          <Text style={[catS.subtitle, { color: theme.text }]}>
            {isExpense ? "Elige el tipo de gasto" : "Elige el tipo de ingreso"}
          </Text>
        </View>
        <PressableScale
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
          hitSlop={12}
        >
          <Text style={{ color: ACCENT, fontWeight: "600", fontSize: 15 }}>Cancelar</Text>
        </PressableScale>
      </View>
      <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
        <View style={catS.grid}>
          {categories.map((cat) => {
            const isSel = temp === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={catS.item}
                onPress={() => setTemp(cat.key)}
                activeOpacity={0.7}
              >
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
                <Text
                  style={[
                    catS.itemLabel,
                    { color: isSel ? ACCENT : theme.text },
                    isSel && { fontWeight: "700" },
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <PressableScale
        style={[catS.confirmBtn, { backgroundColor: ACCENT }]}
        onPress={() => {
          onSelect(temp);
          onClose();
        }}
      >
        <Text style={catS.confirmText}>CONFIRMAR</Text>
      </PressableScale>
    </BottomSheet>
  );
}

// ─── EditItemSheet ────────────────────────────────────────────────────────────

function EditItemSheet({
  visible,
  item,
  categories,
  onSave,
  onClose,
}: {
  visible: boolean;
  item: ReviewItem | null;
  categories: CatOption[];
  onSave: (updated: ReviewItem) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const ACCENT = "#135BEC";

  const [amountStr, setAmountStr] = useState("");
  const [description, setDesc] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [catEmoji, setCatEmoji] = useState("💰");
  const [catName, setCatName] = useState("General");
  const [showCatSheet, setShowCat] = useState(false);

  useEffect(() => {
    if (visible && item) {
      // Dígitos crudos, sin puntos de miles: si reformateáramos en cada tecla
      // (como antes con formatMoneyInput en onChangeText), el TextInput
      // controlado saltaría el cursor al final en Android al insertar/quitar
      // un dígito en medio del monto — mismo bug ya corregido en active-expense.tsx.
      setAmountStr(item.amount > 0 ? String(Math.round(item.amount)) : "");
      setDesc(item.description);
      setIsExpense(item.isExpense);
      setCatEmoji(item.categoryEmoji);
      setCatName(item.categoryName);
    }
  }, [visible, item]);

  const catColor = useMemo(() => {
    const match = categories.find((c) => c.key === catEmoji);
    return match
      ? { bg: match.colorBg, accent: match.colorAccent }
      : { bg: "#E2E8F0", accent: "#64748B" };
  }, [categories, catEmoji]);

  function handleSave() {
    const parsed = parseInt(amountStr.replace(/\./g, ""), 10);
    if (!parsed || parsed <= 0) return;
    onSave({
      ...item!,
      amount: parsed,
      description: description.trim() || item!.description,
      isExpense,
      categoryEmoji: catEmoji,
      categoryName: catName,
    });
    onClose();
  }

  if (!item) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose} style={editS.container}>
      <KeyboardAvoidingView behavior="padding">
        <Text style={[editS.title, { color: theme.text }]}>Editar registro</Text>

        {/* Toggle Gasto / Ingreso */}
        <View style={editS.toggleRow}>
          <TouchableOpacity
            style={[editS.toggleBtn, isExpense && editS.toggleBtnExpenseActive]}
            onPress={() => setIsExpense(true)}
          >
            <Text style={[editS.toggleText, isExpense && editS.toggleTextExpenseActive]}>
              ↓ Gasto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[editS.toggleBtn, !isExpense && editS.toggleBtnIncomeActive]}
            onPress={() => setIsExpense(false)}
          >
            <Text style={[editS.toggleText, !isExpense && editS.toggleTextIncomeActive]}>
              ↑ Ingreso
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monto */}
        <Text style={[editS.label, { color: theme.textSub }]}>MONTO</Text>
        <View
          style={[editS.inputWrap, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
        >
          <Text style={[editS.inputPrefix, { color: theme.textSub }]}>$</Text>
          <TextInput
            style={[editS.input, { color: theme.text }]}
            value={amountStr}
            onChangeText={(v) => setAmountStr(v.replace(/\D/g, ""))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.textSub}
            selectTextOnFocus
          />
        </View>

        {/* Descripción */}
        <Text style={[editS.label, { color: theme.textSub }]}>DESCRIPCIÓN</Text>
        <View
          style={[editS.inputWrap, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
        >
          <TextInput
            style={[editS.input, { color: theme.text }]}
            value={description}
            onChangeText={setDesc}
            placeholder="Describe el registro..."
            placeholderTextColor={theme.textSub}
          />
        </View>

        {/* Categoría */}
        <Text style={[editS.label, { color: theme.textSub }]}>CATEGORÍA</Text>
        <TouchableOpacity
          style={[editS.catRow, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
          onPress={() => setShowCat(true)}
          activeOpacity={0.7}
        >
          <View style={[editS.catEmoji, { backgroundColor: catColor.bg }]}>
            <Text style={{ fontSize: 20 }}>{catEmoji}</Text>
          </View>
          <Text style={[editS.catLabel, { color: theme.text }]}>{catName}</Text>
          <ChevronRight size={18} color={theme.textSub} />
        </TouchableOpacity>

        {/* Guardar */}
        <PressableScale style={[editS.saveBtn, { backgroundColor: ACCENT }]} onPress={handleSave}>
          <Text style={editS.saveBtnText}>Guardar cambios</Text>
        </PressableScale>
      </KeyboardAvoidingView>

      <CategorySheet
        visible={showCatSheet}
        selected={catEmoji}
        isExpense={isExpense}
        categories={categories}
        onSelect={(k) => {
          const found = categories.find((c) => c.key === k);
          setCatEmoji(k);
          setCatName(found?.label ?? k);
        }}
        onClose={() => setShowCat(false)}
      />
    </BottomSheet>
  );
}

// ─── Tarjeta de transacción con swipe-to-delete ───────────────────────────────

function ReviewItemCard({
  item,
  onEdit,
  onDelete,
  theme,
}: {
  item: ReviewItem;
  onEdit: () => void;
  onDelete: () => void;
  theme: AppTheme;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);
  const DELETE_BTN_W = 72;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const val = isOpen.current ? g.dx - DELETE_BTN_W : g.dx;
        translateX.setValue(Math.min(0, Math.max(val, -DELETE_BTN_W)));
      },
      onPanResponderRelease: (_, g) => {
        const threshold = isOpen.current ? -DELETE_BTN_W / 2 : -DELETE_BTN_W / 2;
        const shouldOpen = g.dx < threshold;
        isOpen.current = shouldOpen;
        Animated.spring(translateX, {
          toValue: shouldOpen ? -DELETE_BTN_W : 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      },
    }),
  ).current;

  const catColor = getCategoryColor(item.categoryEmoji);

  return (
    <View style={cardS.wrapper}>
      {/* Botón eliminar (detrás) */}
      <TouchableOpacity
        style={cardS.deleteBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete();
        }}
        activeOpacity={0.8}
      >
        <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
      </TouchableOpacity>

      {/* Tarjeta (encima, deslizable) */}
      <Animated.View
        style={[cardS.card, { backgroundColor: theme.surface, transform: [{ translateX }] }]}
        {...pan.panHandlers}
      >
        {/* Emoji de categoría */}
        <View style={[cardS.emojiContainer, { backgroundColor: catColor.bg }]}>
          <Text style={cardS.emojiText}>{item.categoryEmoji}</Text>
        </View>

        {/* Info central */}
        <View style={cardS.info}>
          <Text style={[cardS.description, { color: theme.text }]} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={cardS.subRow}>
            <Text style={[cardS.categoryLabel, { color: theme.textSub }]}>{item.categoryName}</Text>
            <View
              style={[cardS.typeBadge, item.isExpense ? cardS.badgeExpense : cardS.badgeIncome]}
            >
              <Text
                style={[
                  cardS.badgeText,
                  item.isExpense ? cardS.badgeExpenseText : cardS.badgeIncomeText,
                ]}
              >
                {item.isExpense ? "↓ Gasto" : "↑ Ingreso"}
              </Text>
            </View>
          </View>
        </View>

        {/* Monto + botón editar */}
        <View style={cardS.right}>
          <Text style={[cardS.amount, { color: theme.text }]}>
            $ {formatMoneyDisplay(item.amount)}
          </Text>
          <TouchableOpacity style={cardS.editBtn} onPress={onEdit} hitSlop={8} activeOpacity={0.7}>
            <Pencil size={15} color={theme.textSub} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function VoiceBatchReview() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const ACCENT = "#135BEC";

  const { pendingBatch, clearPendingBatch, pendingManualItem, clearPendingManualItem } =
    useVoiceStore();
  const addTransactionBatch = useFinanceStore((s) => s.addTransactionBatch);
  const userCategories = useSettingsStore((s) => s.userCategories);

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [editItem, setEditItem] = useState<ReviewItem | null>(null);
  const [editVisible, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Inicializar desde pendingBatch al montar
  useEffect(() => {
    const batch = pendingBatch;
    if (!batch || batch.length === 0) {
      router.back();
      return;
    }
    setItems(batch.map(pendingToReviewItem));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recoger registro manual al recuperar el foco (viene de active-expense?from=batch-review)
  useFocusEffect(
    useCallback(() => {
      if (pendingManualItem) {
        setItems((prev) => [
          ...prev,
          {
            id: `manual-${Date.now()}`,
            amount: pendingManualItem.amount,
            description: pendingManualItem.description,
            categoryEmoji: pendingManualItem.categoryEmoji,
            categoryName: pendingManualItem.categoryName,
            isExpense: pendingManualItem.isExpense,
            paymentMethod: pendingManualItem.paymentMethod,
          },
        ]);
        clearPendingManualItem();
      }
    }, [pendingManualItem, clearPendingManualItem]),
  );

  // Opciones de categorías para los sheets
  const catOptions: CatOption[] = useMemo(
    () =>
      userCategories.map((c) => ({
        key: c.emoji,
        label: c.name,
        colorBg: c.colorBg,
        colorAccent: c.colorAccent,
      })),
    [userCategories],
  );

  // Total calculado en tiempo real
  const totalExpense = useMemo(
    () => items.filter((i) => i.isExpense).reduce((acc, i) => acc + i.amount, 0),
    [items],
  );

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleEdit = useCallback((item: ReviewItem) => {
    setEditItem(item);
    setEdit(true);
  }, []);

  const handleSaveEdit = useCallback((updated: ReviewItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  }, []);

  async function handleSaveAll() {
    if (items.length === 0 || saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const batch = items.map((item) => ({
        amount: item.isExpense ? item.amount : -item.amount,
        description: item.description,
        categoryEmoji: item.categoryEmoji,
        tags: [],
        paymentMethod: item.paymentMethod,
      }));

      await addTransactionBatch(batch);
      clearPendingBatch();
      router.dismissAll();
    } catch {
      Alert.alert("Error", "No se pudieron guardar las transacciones. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  const st = useMemo(() => buildStyles(theme), [theme]);

  return (
    <SafeAreaView style={[st.root, { paddingTop: insets.top > 0 ? 0 : 8 }]}>
      {/* Header */}
      <View style={st.header}>
        <PressableScale
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            clearPendingBatch();
            router.back();
          }}
          hitSlop={12}
          style={st.backBtn}
        >
          <ChevronLeft size={26} color={theme.text} strokeWidth={2} />
        </PressableScale>
        <View style={st.headerText}>
          <Text style={[st.title, { color: theme.text }]}>Revisar registros</Text>
          <Text style={[st.subtitle, { color: theme.textSub }]}>
            {items.length}{" "}
            {items.length === 1 ? "transacción detectada" : "transacciones detectadas"}
          </Text>
        </View>
      </View>

      {/* Lista de tarjetas */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={st.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ReviewItemCard
            item={item}
            theme={theme}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={st.addManualBtn}
            onPress={() => router.push("/active-expense?from=batch-review")}
            activeOpacity={0.7}
          >
            <Plus size={15} color={ACCENT} strokeWidth={2.5} />
            <Text style={[st.addManualText, { color: ACCENT }]}>Añadir registro manual</Text>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          <View style={st.emptyState}>
            <Text style={[st.emptyText, { color: theme.textSub }]}>
              Eliminaste todos los registros.{"\n"}Usa "+ Añadir registro manual" o vuelve atrás.
            </Text>
          </View>
        }
      />

      {/* Footer sticky */}
      <View
        style={[
          st.footer,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <Text style={[st.footerSummary, { color: theme.textSub }]}>
          {items.length} {items.length === 1 ? "registro" : "registros"}
          {items.filter((i) => i.isExpense).length > 0
            ? `  ·  Total gastos $ ${formatMoneyDisplay(totalExpense)}`
            : ""}
        </Text>
        <PressableScale
          style={[st.saveBtn, { backgroundColor: items.length === 0 ? theme.border : ACCENT }]}
          onPress={handleSaveAll}
          disabled={items.length === 0 || saving}
        >
          <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={st.saveBtnText}>{saving ? "Guardando..." : "Guardar todo"}</Text>
        </PressableScale>
      </View>

      {/* Sheet de edición */}
      <EditItemSheet
        visible={editVisible}
        item={editItem}
        categories={catOptions}
        onSave={handleSaveEdit}
        onClose={() => setEdit(false)}
      />
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 8,
    },
    backBtn: { padding: 4 },
    headerText: { flex: 1 },
    title: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
    subtitle: { fontSize: 13, fontWeight: "400", marginTop: 2 },
    listContent: { paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
    addManualBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 18,
    },
    addManualText: { fontSize: 14, fontWeight: "600" },
    emptyState: {
      paddingVertical: 32,
      alignItems: "center",
    },
    emptyText: { fontSize: 14, textAlign: "center", lineHeight: 22 },
    footer: {
      borderTopWidth: 1,
      paddingHorizontal: 16,
      paddingTop: 14,
      gap: 12,
    },
    footerSummary: {
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      height: 54,
      borderRadius: 16,
    },
    saveBtnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.3,
    },
  });
}

// ─── Estilos tarjeta ──────────────────────────────────────────────────────────

const cardS = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: "hidden",
  },
  deleteBtn: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 72,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  emojiContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 22 },
  info: { flex: 1, gap: 4 },
  description: { fontSize: 15, fontWeight: "600", letterSpacing: -0.2 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  categoryLabel: { fontSize: 12, fontWeight: "400" },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeExpense: { backgroundColor: "#FEE2E2" },
  badgeIncome: { backgroundColor: "#DCFCE7" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeExpenseText: { color: "#DC2626" },
  badgeIncomeText: { color: "#16A34A" },
  right: { alignItems: "flex-end", gap: 6 },
  amount: { fontSize: 15, fontWeight: "700", letterSpacing: -0.3 },
  editBtn: { padding: 4 },
});

// ─── Estilos EditItemSheet ────────────────────────────────────────────────────

const editS = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 18, letterSpacing: -0.4 },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  toggleBtnExpenseActive: { backgroundColor: "#FEE2E2" },
  toggleBtnIncomeActive: { backgroundColor: "#DCFCE7" },
  toggleText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  toggleTextExpenseActive: { color: "#DC2626" },
  toggleTextIncomeActive: { color: "#16A34A" },
  label: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
  },
  inputPrefix: { fontSize: 15, fontWeight: "600", marginRight: 6 },
  input: { flex: 1, fontSize: 15, fontWeight: "500" },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
    gap: 12,
  },
  catEmoji: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  catLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

// ─── Estilos CategorySheet ────────────────────────────────────────────────────

const catS = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  subtitle: { fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 8,
  },
  item: { width: 72, alignItems: "center", gap: 6 },
  iconWrap: { position: "relative" },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#135BEC",
    alignItems: "center",
    justifyContent: "center",
  },
  itemLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  confirmText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
