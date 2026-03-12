/**
 * category-onboarding.tsx — Pantalla de selección de categorías (primera vez).
 * Grid de tarjetas redondeadas + "Añadir categoría" + modal de creación.
 */
import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import {
  EXPENSE_PRESETS,
  INCOME_PRESETS,
  CURATED_EMOJIS,
  CATEGORY_COLOR_PALETTE,
  type UserCategory,
} from "@/src/constants/categoryPresets";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 48 - CARD_GAP * 2) / 3;

export default function CategoryOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const st = useMemo(() => buildStyles(theme), [theme]);

  const { setUserCategories, completeCategories, userCategories, hasSelectedCategories } = useSettingsStore();
  const isEditing = hasSelectedCategories;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (userCategories.length > 0) return new Set(userCategories.map(c => c.id));
    return new Set();
  });
  const [customCats, setCustomCats] = useState<UserCategory[]>(() =>
    userCategories.filter(c => !c.isPreset)
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"expense" | "income">("expense");

  const allExpense = useMemo(() => [...EXPENSE_PRESETS, ...customCats.filter(c => c.type === "expense")], [customCats]);
  const allIncome = useMemo(() => [...INCOME_PRESETS, ...customCats.filter(c => c.type === "income")], [customCats]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;

  const handleSave = useCallback(() => {
    const all = [...EXPENSE_PRESETS, ...INCOME_PRESETS, ...customCats];
    const chosen = all.filter(c => selectedIds.has(c.id));
    setUserCategories(chosen);
    completeCategories();
    if (isEditing) {
      router.back();
    } else {
      router.replace("/(tabs)");
    }
  }, [selectedIds, customCats, setUserCategories, completeCategories, router, isEditing]);

  const handleCreateCategory = useCallback((cat: UserCategory) => {
    setCustomCats(prev => [...prev, cat]);
    setSelectedIds(prev => new Set(prev).add(cat.id));
    setModalVisible(false);
  }, []);

  const renderGrid = (cats: UserCategory[], type: "expense" | "income") => {
    const rows: UserCategory[][] = [];
    for (let i = 0; i < cats.length; i += 3) rows.push(cats.slice(i, i + 3));

    return (
      <>
        {rows.map((row, ri) => (
          <View key={ri} style={st.row}>
            {row.map(cat => {
              const active = selectedIds.has(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.7}
                  onPress={() => toggleSelect(cat.id)}
                  style={[
                    st.card,
                    { backgroundColor: active ? cat.colorBg : theme.isDark ? "#1E293B" : "#F8FAFC" },
                    active && { borderColor: cat.colorAccent, borderWidth: 2 },
                  ]}
                >
                  <Text style={st.cardEmoji}>{cat.emoji}</Text>
                  <Text style={[st.cardLabel, { color: active ? cat.colorAccent : theme.textSub }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  {active && <View style={[st.checkBadge, { backgroundColor: cat.colorAccent }]}><Text style={st.checkMark}>✓</Text></View>}
                </TouchableOpacity>
              );
            })}
            {/* Fill empty slots */}
            {row.length < 3 && Array.from({ length: 3 - row.length }).map((_, i) => {
              if (ri === rows.length - 1 && i === 0) {
                return (
                  <TouchableOpacity
                    key="add"
                    activeOpacity={0.7}
                    onPress={() => { setModalType(type); setModalVisible(true); }}
                    style={[st.card, st.addCard]}
                  >
                    <Text style={[st.addIcon, { color: theme.textSub }]}>+</Text>
                    <Text style={[st.addLabel, { color: theme.textSub }]}>Añadir</Text>
                  </TouchableOpacity>
                );
              }
              return <View key={`empty-${i}`} style={[st.card, { backgroundColor: "transparent", borderWidth: 0 }]} />;
            })}
          </View>
        ))}
        {/* Add button if last row is full */}
        {cats.length % 3 === 0 && (
          <View style={st.row}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => { setModalType(type); setModalVisible(true); }}
              style={[st.card, st.addCard]}
            >
              <Text style={[st.addIcon, { color: theme.textSub }]}>+</Text>
              <Text style={[st.addLabel, { color: theme.textSub }]}>Añadir</Text>
            </TouchableOpacity>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={st.screen} edges={["top", "bottom"]}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {isEditing && (
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: "600" }}>← Volver</Text>
          </TouchableOpacity>
        )}
        <Text style={st.title}>{isEditing ? "Editar categorías" : "Elige tus categorías"}</Text>
        <Text style={st.subtitle}>
          Selecciona las categorías que mejor definan tus gastos e ingresos mensuales.
        </Text>

        {/* Gastos */}
        <Text style={st.sectionTitle}>Gastos</Text>
        {renderGrid(allExpense, "expense")}

        {/* Ingresos */}
        <Text style={[st.sectionTitle, { marginTop: 28 }]}>Ingresos</Text>
        {renderGrid(allIncome, "income")}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={st.bottomBar}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={selectedCount === 0}
          style={[st.saveBtn, selectedCount === 0 && { opacity: 0.4 }]}
        >
          <Text style={st.saveBtnText}>
            Guardar{selectedCount > 0 ? ` (${selectedCount})` : ""} →
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal Nueva Categoría */}
      <NewCategoryModal
        visible={modalVisible}
        type={modalType}
        theme={theme}
        onClose={() => setModalVisible(false)}
        onSave={handleCreateCategory}
      />
    </SafeAreaView>
  );
}

// ─── Modal Nueva Categoría ──────────────────────────────────────────────────

interface ModalProps {
  visible: boolean;
  type: "expense" | "income";
  theme: AppTheme;
  onClose: () => void;
  onSave: (cat: UserCategory) => void;
}

function NewCategoryModal({ visible, type, theme, onClose, onSave }: ModalProps) {
  const [emoji, setEmoji] = useState(CURATED_EMOJIS[0]);
  const [colorIdx, setColorIdx] = useState(0);
  const [name, setName] = useState("");
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  const ms = useMemo(() => modalStyles(theme), [theme]);

  const handleOpen = useCallback(() => {
    setEmoji(CURATED_EMOJIS[0]);
    setColorIdx(0);
    setName("");
    scaleAnim.setValue(0.9);
    Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const color = CATEGORY_COLOR_PALETTE[colorIdx];
    const cat: UserCategory = {
      id: `custom_${Date.now()}`,
      emoji,
      name: name.trim(),
      colorBg: color.bg,
      colorAccent: color.accent,
      type,
      keywords: name.trim().toLowerCase().split(/\s+/),
      isPreset: false,
    };
    onSave(cat);
  }, [name, emoji, colorIdx, type, onSave]);

  return (
    <Modal visible={visible} transparent animationType="none" onShow={handleOpen} onRequestClose={onClose}>
      <Pressable style={ms.backdrop} onPress={onClose}>
        <Animated.View style={[ms.card, { transform: [{ scale: scaleAnim }] }]}>
          <Pressable>
            <View style={ms.header}>
              <Text style={ms.headerTitle}>Nueva Categoría</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.6}>
                <Text style={ms.headerX}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Emoji selector */}
            <Text style={ms.label}>ÍCONO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.emojiScroll}>
              {CURATED_EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[ms.emojiBtn, e === emoji && ms.emojiBtnActive]}
                  activeOpacity={0.7}
                >
                  <Text style={ms.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Color selector */}
            <Text style={ms.label}>COLOR DE TEMA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.colorScroll}>
              {CATEGORY_COLOR_PALETTE.map((c, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setColorIdx(i)}
                  style={[
                    ms.colorDot,
                    { backgroundColor: c.accent },
                    i === colorIdx && { borderWidth: 3, borderColor: theme.text },
                  ]}
                  activeOpacity={0.7}
                />
              ))}
            </ScrollView>

            {/* Name input */}
            <Text style={ms.label}>NOMBRE DE LA CATEGORÍA</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej. Gimnasio"
              placeholderTextColor={theme.textTertiary}
              style={ms.nameInput}
              maxLength={24}
              autoCapitalize="words"
            />

            {/* Buttons */}
            <View style={ms.btnRow}>
              <TouchableOpacity onPress={onClose} activeOpacity={0.6} style={ms.cancelBtn}>
                <Text style={[ms.cancelText, { color: theme.textSub }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                activeOpacity={0.85}
                disabled={!name.trim()}
                style={[ms.okBtn, !name.trim() && { opacity: 0.4 }]}
              >
                <Text style={ms.okText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    scrollContent: { paddingHorizontal: 24, paddingTop: 40 },
    title: { fontSize: 28, fontWeight: "800", color: t.text, letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: t.textSub, marginTop: 8, lineHeight: 20, marginBottom: 28 },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: t.text, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },
    row: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },
    card: {
      width: CARD_W,
      aspectRatio: 1,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: t.border,
      position: "relative",
    },
    cardEmoji: { fontSize: 32, marginBottom: 6 },
    cardLabel: { fontSize: 12, fontWeight: "600", textAlign: "center", paddingHorizontal: 4 },
    checkBadge: {
      position: "absolute",
      top: 8,
      right: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    checkMark: { color: "#FFF", fontSize: 11, fontWeight: "800" },
    addCard: {
      borderStyle: "dashed",
      borderWidth: 2,
      borderColor: t.border,
      backgroundColor: "transparent",
    },
    addIcon: { fontSize: 28, fontWeight: "300", marginBottom: 4 },
    addLabel: { fontSize: 11, fontWeight: "600" },
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 24,
      paddingBottom: 34,
      paddingTop: 16,
      backgroundColor: t.bg,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.border,
    },
    saveBtn: {
      backgroundColor: "#135BEC",
      borderRadius: 16,
      paddingVertical: 16,
      alignItems: "center",
    },
    saveBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  });
}

function modalStyles(t: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    card: {
      width: "100%",
      backgroundColor: t.surface,
      borderRadius: 22,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: "700", color: t.text },
    headerX: { fontSize: 20, color: t.textSub, padding: 4 },
    label: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textSub,
      letterSpacing: 1,
      marginBottom: 10,
      marginTop: 16,
    },
    emojiScroll: { marginBottom: 4 },
    emojiBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      backgroundColor: t.inputBg,
    },
    emojiBtnActive: {
      backgroundColor: "#DBEAFE",
      borderWidth: 2,
      borderColor: "#135BEC",
    },
    emojiText: { fontSize: 22 },
    colorScroll: { marginBottom: 4 },
    colorDot: {
      width: 36,
      height: 36,
      borderRadius: 18,
      marginRight: 10,
    },
    nameInput: {
      backgroundColor: t.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: t.text,
      marginTop: 4,
    },
    btnRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 24,
    },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 16 },
    cancelText: { fontSize: 15, fontWeight: "600" },
    okBtn: {
      backgroundColor: "#135BEC",
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 14,
    },
    okText: { color: "#FFF", fontSize: 15, fontWeight: "700" },
  });
}
