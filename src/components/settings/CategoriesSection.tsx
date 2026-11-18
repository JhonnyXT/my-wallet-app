import { useState } from "react";
import { Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { SheetActions, SheetHeader, SheetLabel, useSheetPadding } from "@/src/components/ui/SheetParts";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { type UserCategory } from "@/src/constants/categoryPresets";
import { EmojiSuggestPicker } from "@/src/components/ui/EmojiSuggestPicker";
import type { AppTheme } from "@/src/theme";
import { useAppTokens } from "@/src/theme/tokens";
import { hexToHue, hueToColors } from "@/src/utils/colorUtils";
import { catSheet } from "./settingsStyles";

/**
 * Alertas de presupuesto: solo on/off. El umbral (`budgetAlertThreshold`, default 80%, ver
 * useSettingsStore) ya no es ajustable desde la UI — el control fino casi nadie lo tocaba y el
 * valor por defecto resuelve el caso general (auditoría de simplicidad, 2026-11-18). El campo
 * del store se conserva para no romper a quien ya tenía un valor propio guardado.
 */
export function BudgetAlertSection({
  enabled,
  threshold,
  onToggle,
}: {
  enabled: boolean;
  threshold: number;
  onToggle: (v: boolean) => void;
}) {
  const tokens = useAppTokens();
  const pct = Math.min(100, Math.max(0, threshold));
  const alertColor = tokens.colors.state.danger;

  return (
    <Pressable
      onPress={() => onToggle(!enabled)}
      android_ripple={{ color: tokens.colors.border.default }}
      style={[catSheet.row, { paddingHorizontal: 0 }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel="Alertas de presupuesto"
    >
      <View style={[catSheet.emojiCircle, { backgroundColor: "#FEE2E2" }]}>
        <Text style={catSheet.emoji}>🔔</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[catSheet.name, { color: tokens.colors.text.primary }]} numberOfLines={1}>
          Alertas de presupuesto
        </Text>
        <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
          {enabled ? `Aviso al ${pct}% del límite` : "Desactivadas"}
        </Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={onToggle}
        trackColor={{ false: tokens.colors.border.default, true: alertColor }}
        thumbColor="#FFFFFF"
      />
    </Pressable>
  );
}

// ─── Hoja de categorías ─────────────────────────────────────────────────────────
// Lista estilo "Tus listas": emoji en círculo, nombre y tipo debajo; "+" arriba para
// agregar/gestionar. Tocar una fila la edita. Estilos estáticos + android_ripple:
// dentro de un Modal, el estilo en función de `pressed` se perdía (ver AGENTS.md).

export function CategoriesSheet({
  visible,
  categories,
  listLabel,
  onClose,
  onEdit,
  onDelete,
  onManage,
}: {
  visible: boolean;
  categories: UserCategory[];
  /** Lista a la que pertenecen (cada lista tiene sus categorías). */
  listLabel: string;
  onClose: () => void;
  onEdit: (cat: UserCategory) => void;
  onDelete: (cat: UserCategory) => void;
  onManage: () => void;
}) {
  const insets = useSafeAreaInsets();
  const tokens = useAppTokens();
  const c = tokens.colors;
  const sections = [
    { title: "Gastos", items: categories.filter((cat) => cat.type === "expense") },
    { title: "Ingresos", items: categories.filter((cat) => cat.type === "income") },
  ].filter((s) => s.items.length > 0);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={{ paddingBottom: insets.bottom + 12, maxHeight: "85%" }}
    >
      <View style={catSheet.header}>
        <View style={{ flex: 1 }}>
          <Text style={[catSheet.title, { color: c.text.primary }]}>Tus categorías</Text>
          <Text style={[catSheet.subtitle, { color: c.text.secondary }]}>
            {listLabel} · Toca una para editarla
          </Text>
        </View>
        <PressableScale
          onPress={onManage}
          style={[catSheet.addBtn, { backgroundColor: c.surface.elevated }]}
          accessibilityRole="button"
          accessibilityLabel="Agregar o gestionar categorías"
        >
          <Plus size={20} color={c.text.primary} strokeWidth={2} />
        </PressableScale>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={catSheet.list}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[catSheet.sectionLabel, { color: c.text.secondary }]}>
              {`${section.title} · ${section.items.length}`}
            </Text>
            {section.items.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => onEdit(cat)}
                android_ripple={{ color: c.border.default }}
                style={catSheet.row}
                accessibilityRole="button"
                accessibilityLabel={`Editar categoría ${cat.name}`}
              >
                <View style={[catSheet.emojiCircle, { backgroundColor: cat.colorBg }]}>
                  <Text style={catSheet.emoji}>{cat.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[catSheet.name, { color: c.text.primary }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={[catSheet.meta, { color: c.text.secondary }]}>
                    {cat.isPreset ? "Predefinida" : "Personalizada"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDelete(cat)}
                  hitSlop={10}
                  style={catSheet.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar categoría ${cat.name}`}
                >
                  <Trash2 size={16} color={c.text.secondary} strokeWidth={1.8} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

// ─── Modal para editar categoría ──────────────────────────────────────────────
export function EditCategoryModal({
  cat,
  theme,
  onSave,
  onClose,
}: {
  cat: UserCategory;
  theme: AppTheme;
  onSave: (updated: UserCategory) => void;
  onClose: () => void;
}) {
  const sheetPad = useSheetPadding();
  const [emoji, setEmoji] = useState(cat.emoji);
  const [name, setName] = useState(cat.name);
  const [hue, setHue] = useState(() => hexToHue(cat.colorAccent));

  const handleSave = () => {
    if (!name.trim()) return;
    const { accent, bg } = hueToColors(hue);
    onSave({
      ...cat,
      emoji,
      name: name.trim(),
      colorBg: bg,
      colorAccent: accent,
      keywords: cat.isPreset ? cat.keywords : name.trim().toLowerCase().split(/\s+/),
    });
  };

  return (
    <BottomSheet visible onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader title="Editar categoría" />
      <SheetLabel first>Nombre</SheetLabel>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej. Gimnasio"
        placeholderTextColor={theme.textTertiary}
        style={{
          backgroundColor: theme.inputBg,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 15,
          color: theme.text,
        }}
        maxLength={24}
        autoCapitalize="words"
      />

      <SheetLabel>Ícono</SheetLabel>
      <EmojiSuggestPicker query={name} selected={emoji} onSelect={setEmoji} />

      <SheetLabel>Color de tema</SheetLabel>
      <HueColorPicker
        hue={hue}
        onChange={setHue}
        previewEmoji={emoji}
        style={{ marginBottom: 4 }}
      />

      <SheetActions onCancel={onClose} onConfirm={handleSave} disabled={!name.trim()} />
    </BottomSheet>
  );
}
