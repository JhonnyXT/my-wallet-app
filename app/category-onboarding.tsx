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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  PanResponder,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import {
  EXPENSE_PRESETS,
  INCOME_PRESETS,
  CURATED_EMOJIS,
  CATEGORY_EMOJI_VARIANTS,
  type UserCategory,
} from "@/src/constants/categoryPresets";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { hueToColors } from "@/src/utils/colorUtils";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_GAP = 12;
const CARD_W = (SCREEN_W - 48 - CARD_GAP * 2) / 3;

// Presets "principales" mostrados en el onboarding — el resto de EXPENSE_PRESETS/
// INCOME_PRESETS sigue existiendo (resuelve nombres/colores de categorías ya
// guardadas y queda disponible vía "+ Añadir"), solo se oculta de esta grilla.
const PRINCIPAL_EXPENSE_IDS = new Set([
  "preset_shopping", // Compras
  "preset_clothing", // Ropa
  "preset_eating_out", // Comer afuera
  "preset_home", // Hogar (en vez de Lujo)
  "preset_car", // Vehículo
  "preset_education", // Educación (en vez de Mascotas)
]);
const PRINCIPAL_INCOME_IDS = new Set([
  "preset_salary",
  "preset_freelance",
  "preset_investments",
  "preset_other_income",
]);

// ─── Tarjeta de categoría — deslizar el ícono cambia de variante de emoji ─────
function CategoryTile({
  cat,
  active,
  emojiIdx,
  onChangeEmojiIdx,
  onToggle,
  theme,
  st,
}: {
  cat: UserCategory;
  active: boolean;
  emojiIdx: number;
  onChangeEmojiIdx: (next: number) => void;
  onToggle: () => void;
  theme: AppTheme;
  st: ReturnType<typeof buildStyles>;
}) {
  const variants = CATEGORY_EMOJI_VARIANTS[cat.id];
  const hasVariants = !!variants && variants.length > 1;
  const displayEmoji = hasVariants ? variants[emojiIdx] : cat.emoji;
  const [pressed, setPressed] = useState(false);

  // PanResponder reclamando el toque desde onStartShouldSetPanResponder (no en el
  // move): así el tap y el swipe responden igual de rápido que un TouchableOpacity
  // normal, incluso en la primera interacción. onPanResponderTerminationRequest:true
  // deja que el ScrollView padre se quede con el gesto si detecta scroll vertical.
  //
  // IMPORTANTE: se recrea en cada render (sin useRef) — envolverlo en useRef lo crea
  // una sola vez y sus callbacks quedan con `emojiIdx` congelado al valor del primer
  // render, por lo que el swipe siempre calculaba el próximo índice desde 0 en vez
  // del índice actual (bug: se quedaba alternando entre el 1° y 2°/último emoji).
  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => true,
    onPanResponderGrant: () => setPressed(true),
    onPanResponderRelease: (_, g) => {
      setPressed(false);
      const isSwipe = hasVariants && Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.3;
      if (isSwipe) {
        Haptics.selectionAsync();
        if (g.dx < 0) onChangeEmojiIdx((emojiIdx + 1) % variants.length);
        else onChangeEmojiIdx((emojiIdx - 1 + variants.length) % variants.length);
      } else if (Math.abs(g.dx) < 10 && Math.abs(g.dy) < 10) {
        onToggle();
      }
    },
    onPanResponderTerminate: () => setPressed(false),
  });

  return (
    <View style={st.card}>
      <View
        style={[
          st.iconBox,
          {
            backgroundColor: active
              ? theme.isDark
                ? cat.colorAccent + "26"
                : cat.colorBg + "99"
              : theme.isDark
                ? "#1E293B"
                : "#F8FAFC",
          },
          active && { borderColor: cat.colorAccent + "80", borderWidth: 1.5 },
          pressed && { opacity: 0.8 },
        ]}
        {...pan.panHandlers}
      >
        <View style={st.iconZone}>
          <Text style={st.cardEmoji}>{displayEmoji}</Text>
          {hasVariants && (
            <View style={st.dotsRow}>
              {variants.map((_, i) => (
                <View
                  key={i}
                  style={[
                    st.dot,
                    {
                      backgroundColor: theme.isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
                    },
                    i === emojiIdx && {
                      backgroundColor: active ? cat.colorAccent : theme.textSub,
                      width: 6,
                      height: 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
        {active && (
          <View style={[st.checkBadge, { backgroundColor: cat.colorAccent }]}>
            <Text style={st.checkMark}>✓</Text>
          </View>
        )}
      </View>
      <Text
        style={[st.cardLabel, { color: active ? cat.colorAccent : theme.textSub }]}
        numberOfLines={1}
      >
        {cat.name}
      </Text>
    </View>
  );
}

export default function CategoryOnboarding() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ edit?: string }>();
  const st = useMemo(() => buildStyles(theme), [theme]);

  const { setUserCategories, completeCategories, userCategories } = useSettingsStore();
  // "Editar" solo cuando se llega explícitamente desde Settings (?edit=1) — NO se
  // infiere de hasSelectedCategories, porque ese flag ya queda en true apenas se
  // guardan categorías la primera vez, antes de seguir al resto del onboarding
  // (notification-onboarding → bank-selection-onboarding). Si se infiriera de ahí,
  // volver atrás en el onboarding mostraría por error el modo "Editar categorías".
  const isEditing = params.edit === "1";

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (userCategories.length > 0) return new Set(userCategories.map((c) => c.id));
    return new Set();
  });
  const [customCats, setCustomCats] = useState<UserCategory[]>(() =>
    userCategories.filter((c) => !c.isPreset),
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"expense" | "income">("expense");
  const [emojiIndices, setEmojiIndices] = useState<Record<string, number>>({});

  const allExpense = useMemo(
    () =>
      [
        ...EXPENSE_PRESETS.filter((c) => PRINCIPAL_EXPENSE_IDS.has(c.id)),
        ...customCats.filter((c) => c.type === "expense"),
      ].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [customCats],
  );
  const allIncome = useMemo(
    () =>
      [
        ...INCOME_PRESETS.filter((c) => PRINCIPAL_INCOME_IDS.has(c.id)),
        ...customCats.filter((c) => c.type === "income"),
      ].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [customCats],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;

  const handleSave = useCallback(() => {
    const all = [...EXPENSE_PRESETS, ...INCOME_PRESETS, ...customCats];
    const chosen = all
      .filter((c) => selectedIds.has(c.id))
      .map((c) => {
        const variants = CATEGORY_EMOJI_VARIANTS[c.id];
        const idx = emojiIndices[c.id] ?? 0;
        const emoji = variants && variants.length > 1 ? variants[idx] : c.emoji;
        return emoji === c.emoji ? c : { ...c, emoji };
      });
    setUserCategories(chosen);
    completeCategories();
    if (isEditing) {
      router.back();
    } else {
      router.push("/notification-onboarding");
    }
  }, [
    selectedIds,
    customCats,
    emojiIndices,
    setUserCategories,
    completeCategories,
    router,
    isEditing,
  ]);

  const handleCreateCategory = useCallback((cat: UserCategory) => {
    setCustomCats((prev) => [...prev, cat]);
    setSelectedIds((prev) => new Set(prev).add(cat.id));
    setModalVisible(false);
  }, []);

  const renderGrid = (cats: UserCategory[], type: "expense" | "income") => {
    const rows: UserCategory[][] = [];
    for (let i = 0; i < cats.length; i += 3) rows.push(cats.slice(i, i + 3));

    return (
      <>
        {rows.map((row, ri) => (
          <View key={ri} style={st.row}>
            {row.map((cat) => {
              const active = selectedIds.has(cat.id);
              return (
                <CategoryTile
                  key={cat.id}
                  cat={cat}
                  active={active}
                  emojiIdx={emojiIndices[cat.id] ?? 0}
                  onChangeEmojiIdx={(next) =>
                    setEmojiIndices((prev) => ({ ...prev, [cat.id]: next }))
                  }
                  onToggle={() => toggleSelect(cat.id)}
                  theme={theme}
                  st={st}
                />
              );
            })}
            {/* Fill empty slots */}
            {row.length < 3 &&
              Array.from({ length: 3 - row.length }).map((_, i) => {
                if (ri === rows.length - 1 && i === 0) {
                  return (
                    <TouchableOpacity
                      key="add"
                      activeOpacity={0.7}
                      onPress={() => {
                        setModalType(type);
                        setModalVisible(true);
                      }}
                      style={[st.iconBox, st.addCard]}
                    >
                      <Text style={[st.addIcon, { color: theme.textSub }]}>+</Text>
                      <Text style={[st.addLabel, { color: theme.textSub }]}>Añadir</Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <View
                    key={`empty-${i}`}
                    style={[st.iconBox, { backgroundColor: "transparent", borderWidth: 0 }]}
                  />
                );
              })}
          </View>
        ))}
        {/* Add button if last row is full */}
        {cats.length % 3 === 0 && (
          <View style={st.row}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setModalType(type);
                setModalVisible(true);
              }}
              style={[st.iconBox, st.addCard]}
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
          <PressableScale
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={{ marginBottom: 12, flexDirection: "row", alignItems: "center" }}
          >
            <Text style={{ color: theme.accent, fontSize: 15, fontWeight: "600" }}>← Volver</Text>
          </PressableScale>
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
        <PressableScale
          onPress={handleSave}
          disabled={selectedCount === 0}
          style={[st.saveBtn, selectedCount === 0 && { opacity: 0.4 }]}
        >
          <Text style={st.saveBtnText}>
            Guardar{selectedCount > 0 ? ` (${selectedCount})` : ""} →
          </Text>
        </PressableScale>
      </View>

      {/* Modal Nueva Categoría */}
      <NewCategoryModal
        visible={modalVisible}
        type={modalType}
        theme={theme}
        onClose={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setModalVisible(false);
        }}
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

export function NewCategoryModal({ visible, type, theme, onClose, onSave }: ModalProps) {
  const [emoji, setEmoji] = useState(CURATED_EMOJIS[0]);
  const [hue, setHue] = useState(210); // Azul por defecto
  const [name, setName] = useState("");
  const scaleAnim = useState(new Animated.Value(0.9))[0];

  const ms = useMemo(() => modalStyles(theme), [theme]);

  const handleOpen = useCallback(() => {
    setEmoji(CURATED_EMOJIS[0]);
    setHue(210);
    setName("");
    scaleAnim.setValue(0.9);
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 18,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const { accent, bg } = hueToColors(hue);
    const cat: UserCategory = {
      id: `custom_${Date.now()}`,
      emoji,
      name: name.trim(),
      colorBg: bg,
      colorAccent: accent,
      type,
      keywords: name.trim().toLowerCase().split(/\s+/),
      isPreset: false,
    };
    onSave(cat);
  }, [name, emoji, hue, type, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onShow={handleOpen}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <Pressable style={ms.backdrop} onPress={onClose}>
          <Animated.View style={[ms.card, { transform: [{ scale: scaleAnim }] }]}>
            <Pressable>
              <View style={ms.header}>
                <Text style={ms.headerTitle}>Nueva Categoría</Text>
                <PressableScale onPress={onClose}>
                  <Text style={ms.headerX}>✕</Text>
                </PressableScale>
              </View>

              {/* Emoji selector */}
              <Text style={ms.label}>ÍCONO</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.emojiScroll}>
                {CURATED_EMOJIS.map((e) => (
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
              <HueColorPicker
                hue={hue}
                onChange={setHue}
                previewEmoji={emoji}
                style={ms.colorPicker}
              />

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
                <PressableScale onPress={onClose} style={ms.cancelBtn}>
                  <Text style={[ms.cancelText, { color: theme.textSub }]}>Cancelar</Text>
                </PressableScale>
                <PressableScale
                  onPress={handleSave}
                  disabled={!name.trim()}
                  style={[ms.okBtn, !name.trim() && { opacity: 0.4 }]}
                >
                  <Text style={ms.okText}>Guardar</Text>
                </PressableScale>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </KeyboardAvoidingView>
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
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: t.text,
      marginBottom: 14,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    row: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },
    // Contenedor externo: solo da el ancho de columna, sin fondo/borde propios —
    // el nombre de la categoría vive acá afuera, debajo de iconBox.
    card: { width: CARD_W, alignItems: "center" },
    iconBox: {
      width: CARD_W,
      aspectRatio: 0.92,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1.5,
      borderColor: t.border,
      position: "relative",
    },
    iconZone: { alignItems: "center", justifyContent: "center", paddingVertical: 4 },
    cardEmoji: { fontSize: 36, marginBottom: 8 },
    cardLabel: {
      fontSize: 12.5,
      fontWeight: "700",
      textAlign: "center",
      paddingHorizontal: 4,
      marginTop: 8,
    },
    dotsRow: { flexDirection: "row", gap: 3, marginBottom: 6 },
    dot: { width: 4, height: 4, borderRadius: 2 },
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
    colorPicker: { marginBottom: 4 },
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
