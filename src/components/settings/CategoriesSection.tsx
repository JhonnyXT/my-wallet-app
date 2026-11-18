import { useEffect, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Plus, Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { SheetActions, SheetHeader, SheetLabel, useSheetPadding } from "@/src/components/ui/SheetParts";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { type UserCategory } from "@/src/constants/categoryPresets";
import { EmojiSuggestPicker } from "@/src/components/ui/EmojiSuggestPicker";
import type { AppTheme } from "@/src/theme";
import { useAppTokens } from "@/src/theme/tokens";
import { hexToHue, hueToColors } from "@/src/utils/colorUtils";
import { catSheet } from "./settingsStyles";

/** Sección de Alertas de Presupuesto con toggle + slider custom */
export function BudgetAlertSection({
  enabled,
  threshold,
  onToggle,
  onThresholdChange,
}: {
  enabled: boolean;
  threshold: number;
  onToggle: (v: boolean) => void;
  onThresholdChange: (v: number) => void;
}) {
  const tokens = useAppTokens();
  const THUMB = 28;
  const pct = Math.min(100, Math.max(0, threshold));

  const trackWRef = useRef(0);
  const [trackWState, setTrackWState] = useState(0);
  const [liveValue, setLiveValue] = useState(pct);
  const offset = useRef(new Animated.Value(pct / 100)).current;
  const trackPageX = useRef(0);

  // Sincronizar cuando threshold cambia desde el store
  useEffect(() => {
    setLiveValue(pct);
    offset.setValue(pct / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const usableW = Math.max(0, trackWState - THUMB);

  /** gs.moveX - trackPageX.current = X relativa al track, siempre fiable */
  const toNorm = (absX: number) =>
    Math.min(
      1,
      Math.max(0, (absX - trackPageX.current - THUMB / 2) / Math.max(1, trackWRef.current - THUMB)),
    );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      // Solo capturar si el movimiento es más horizontal que vertical (evita bloquear el scroll)
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),
      onMoveShouldSetPanResponderCapture: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),

      onPanResponderGrant: (e) => {
        // Guardar el borde izquierdo del track en coordenadas de pantalla
        trackPageX.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        const norm = toNorm(e.nativeEvent.pageX);
        offset.setValue(norm);
        setLiveValue(Math.round(norm * 100));
      },
      onPanResponderMove: (_, gs) => {
        // gs.moveX: posición absoluta del dedo en pantalla — no salta entre vistas hijas
        const norm = toNorm(gs.moveX);
        offset.setValue(norm);
        setLiveValue(Math.round(norm * 100));
      },
      onPanResponderRelease: (_, gs) => {
        const norm = toNorm(gs.moveX);
        const finalPct = Math.round(norm * 100);
        offset.setValue(norm);
        setLiveValue(finalPct);
        onThresholdChange(finalPct);
      },
    }),
  ).current;

  const alertColor = tokens.colors.state.danger;

  return (
    <View>
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
            {enabled ? `Aviso al ${liveValue}% del límite` : "Desactivadas"}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: tokens.colors.border.default, true: alertColor }}
          thumbColor="#FFFFFF"
        />
      </Pressable>

      {/* ── Slider — solo cuando activo ────────────────────────────── */}
      {enabled && (
        <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <View style={{ paddingTop: tokens.spacing.sm }}>
            <View style={bAS.sliderRow}>
              <ThemedText variant="subheadline" color="secondary">
                Umbral de alerta
              </ThemedText>
              <ThemedText variant="body" style={{ fontWeight: "700" }}>
                {liveValue}%
              </ThemedText>
            </View>

            <View
              {...pan.panHandlers}
              style={bAS.trackOuter}
              onLayout={(e) => {
                trackWRef.current = e.nativeEvent.layout.width;
                setTrackWState(e.nativeEvent.layout.width);
              }}
            >
              <View style={[bAS.trackBg, { backgroundColor: tokens.colors.border.default }]} />

              {trackWState > 0 && (
                <Animated.View
                  style={[
                    bAS.trackFill,
                    {
                      backgroundColor: alertColor,
                      width: offset.interpolate({
                        inputRange: [0, 1],
                        outputRange: [THUMB / 2, usableW + THUMB / 2],
                        extrapolate: "clamp",
                      }),
                    },
                  ]}
                />
              )}

              {trackWState > 0 && (
                <Animated.View
                  style={[
                    bAS.thumb,
                    {
                      width: THUMB,
                      height: THUMB,
                      borderRadius: THUMB / 2,
                      backgroundColor: "#FFFFFF",
                      elevation: 4,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.22,
                      shadowRadius: 3,
                      transform: [
                        {
                          translateX: offset.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, usableW],
                            extrapolate: "clamp",
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}
            </View>

            <ThemedText variant="footnote" color="secondary" style={{ marginTop: 2 }}>
              {liveValue > 0
                ? `Te avisaré cuando alcances el ${liveValue}% del presupuesto de cada categoría.`
                : "Desliza para elegir el porcentaje de alerta. Se recomienda 80%."}
            </ThemedText>
          </View>
        </Reanimated.View>
      )}
    </View>
  );
}

const bAS = StyleSheet.create({
  sliderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  trackOuter: { height: 26, justifyContent: "center", marginBottom: 10, position: "relative" },
  trackBg: { height: 4, borderRadius: 2, position: "absolute", left: 0, right: 0 },
  trackFill: { height: 4, borderRadius: 2, position: "absolute", left: 0 },
  thumb: { position: "absolute" },
});

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
