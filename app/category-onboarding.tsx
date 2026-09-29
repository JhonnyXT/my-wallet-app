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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { CURATED_EMOJIS, type UserCategory } from "@/src/constants/categoryPresets";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { CategoryPickerGrid, useCategoryPicker } from "@/src/components/ui/CategoryPickerGrid";
import { hueToColors } from "@/src/utils/colorUtils";

const { width: SCREEN_W } = Dimensions.get("window");

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

  const picker = useCategoryPicker(userCategories);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<"expense" | "income">("expense");
  const selectedCount = picker.selectedIds.size;

  const handleSave = useCallback(() => {
    setUserCategories(picker.chosen());
    completeCategories();
    if (isEditing) {
      router.back();
    } else {
      router.push("/pay-onboarding");
    }
  }, [picker, setUserCategories, completeCategories, router, isEditing]);

  const handleCreateCategory = useCallback(
    (cat: UserCategory) => {
      picker.addCustom(cat);
      setModalVisible(false);
    },
    [picker],
  );

  const openAdd = (type: "expense" | "income") => {
    setModalType(type);
    setModalVisible(true);
  };

  const renderGrid = (cats: UserCategory[], type: "expense" | "income") => (
    <CategoryPickerGrid
      cats={cats}
      type={type}
      selectedIds={picker.selectedIds}
      emojiIndices={picker.emojiIndices}
      onToggle={picker.toggle}
      onChangeEmojiIdx={picker.setEmojiIdx}
      onAdd={openAdd}
      width={SCREEN_W - 48}
    />
  );

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
        {renderGrid(picker.expenseCats, "expense")}

        {/* Ingresos */}
        <Text style={[st.sectionTitle, { marginTop: 28 }]}>Ingresos</Text>
        {renderGrid(picker.incomeCats, "income")}

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
