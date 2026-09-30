/**
 * category-onboarding.tsx — Pantalla de selección de categorías (primera vez).
 * Grid de tarjetas redondeadas + "Añadir categoría" + hoja de creación.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, StatusBar, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { CURATED_EMOJIS, type UserCategory } from "@/src/constants/categoryPresets";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { CategoryPickerGrid, useCategoryPicker } from "@/src/components/ui/CategoryPickerGrid";
import { EmojiSuggestPicker, useAutoEmoji } from "@/src/components/ui/EmojiSuggestPicker";
import {
  SheetActions,
  SheetHeader,
  SheetLabel,
  useSheetPadding,
} from "@/src/components/ui/SheetParts";
import { StackedScreenHeader } from "@/src/components/ui/StackedScreenHeader";
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

      {isEditing && (
        <StackedScreenHeader
          onBack={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          title="Editar categorías"
        />
      )}
      <ScrollView
        contentContainerStyle={[st.scrollContent, isEditing && { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {!isEditing && <Text style={st.title}>Elige tus categorías</Text>}
        <Text style={[st.subtitle, isEditing && { marginTop: 0 }]}>
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
  const icon = useAutoEmoji(CURATED_EMOJIS[0]);
  const { emoji, reset: resetIcon } = icon;
  const [hue, setHue] = useState(210); // Azul por defecto
  const [name, setName] = useState("");
  const sheetPad = useSheetPadding();

  const ms = useMemo(() => modalStyles(theme), [theme]);

  useEffect(() => {
    if (!visible) return;
    resetIcon(CURATED_EMOJIS[0]);
    setHue(210);
    setName("");
  }, [visible, resetIcon]);

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
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader
        title="Nueva categoría"
        subtitle={type === "expense" ? "Para tus gastos" : "Para tus ingresos"}
      />

      {/* El nombre va primero: de él salen las sugerencias de ícono */}
      <SheetLabel first>Nombre de la categoría</SheetLabel>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          icon.onNameChange(t);
        }}
        placeholder="Ej. Gimnasio"
        placeholderTextColor={theme.textTertiary}
        style={ms.nameInput}
        maxLength={24}
        autoCapitalize="words"
      />

      <SheetLabel>Ícono</SheetLabel>
      <EmojiSuggestPicker query={name} selected={emoji} onSelect={icon.pick} />

      <SheetLabel>Color de tema</SheetLabel>
      <HueColorPicker hue={hue} onChange={setHue} previewEmoji={emoji} style={ms.colorPicker} />

      <SheetActions onCancel={onClose} onConfirm={handleSave} disabled={!name.trim()} />
    </BottomSheet>
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
    colorPicker: { marginBottom: 4 },
    nameInput: {
      backgroundColor: t.inputBg,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      color: t.text,
    },
  });
}
