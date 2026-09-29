/**
 * CategoryPickerGrid — grilla de tarjetas para elegir categorías (tocar = marcar; deslizar el
 * ícono = cambiar de variante de emoji). La usan el onboarding (y su modo editar) y la hoja de
 * nueva lista. `useCategoryPicker` guarda la selección y arma las categorías elegidas.
 */
import { useCallback, useMemo, useState } from "react";
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import {
  CATEGORY_EMOJI_VARIANTS,
  EXPENSE_PRESETS,
  INCOME_PRESETS,
  type UserCategory,
} from "@/src/constants/categoryPresets";

const CARD_GAP = 12;

// Presets "principales" de la grilla: el resto de EXPENSE_PRESETS/INCOME_PRESETS sigue
// existiendo (resuelve nombres/colores de categorías ya guardadas y queda disponible vía
// "+ Añadir"), solo se oculta de aquí.
const PRINCIPAL_EXPENSE_IDS = new Set([
  "preset_shopping", // Compras
  "preset_clothing", // Ropa
  "preset_eating_out", // Comer afuera
  "preset_home", // Hogar
  "preset_car", // Vehículo
  "preset_education", // Educación
]);
const PRINCIPAL_INCOME_IDS = new Set([
  "preset_salary",
  "preset_freelance",
  "preset_investments",
  "preset_other_income",
]);

// ─── Estado de la selección ──────────────────────────────────────────────────

export function useCategoryPicker(initial: UserCategory[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initial.map((c) => c.id)),
  );
  const [customCats, setCustomCats] = useState<UserCategory[]>(() =>
    initial.filter((c) => !c.isPreset),
  );
  const [emojiIndices, setEmojiIndices] = useState<Record<string, number>>({});

  // Presets principales + los ya elegidos (aunque no sean principales) + los propios.
  const catalog = useCallback(
    (type: "expense" | "income") => {
      const presets = type === "expense" ? EXPENSE_PRESETS : INCOME_PRESETS;
      const principal = type === "expense" ? PRINCIPAL_EXPENSE_IDS : PRINCIPAL_INCOME_IDS;
      return [
        ...presets.filter((c) => principal.has(c.id) || selectedIds.has(c.id)),
        ...customCats.filter((c) => c.type === type),
      ].sort((a, b) => a.name.localeCompare(b.name, "es"));
    },
    // selectedIds a propósito fuera: un preset no principal no debe desaparecer de la
    // grilla al desmarcarlo (se recalcula al remontar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customCats],
  );
  const expenseCats = useMemo(() => catalog("expense"), [catalog]);
  const incomeCats = useMemo(() => catalog("income"), [catalog]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const addCustom = useCallback((cat: UserCategory) => {
    setCustomCats((prev) => [...prev, cat]);
    setSelectedIds((prev) => new Set(prev).add(cat.id));
  }, []);

  const setEmojiIdx = useCallback(
    (id: string, idx: number) => setEmojiIndices((prev) => ({ ...prev, [id]: idx })),
    [],
  );

  /** Las elegidas, con la variante de emoji que se haya deslizado. */
  const chosen = useCallback((): UserCategory[] => {
    return [...EXPENSE_PRESETS, ...INCOME_PRESETS, ...customCats]
      .filter((c) => selectedIds.has(c.id))
      .map((c) => {
        const variants = CATEGORY_EMOJI_VARIANTS[c.id];
        const idx = emojiIndices[c.id] ?? 0;
        const emoji = variants && variants.length > 1 ? variants[idx] : c.emoji;
        return emoji === c.emoji ? c : { ...c, emoji };
      });
  }, [customCats, selectedIds, emojiIndices]);

  const hasExpense = expenseCats.some((c) => selectedIds.has(c.id));

  return {
    selectedIds,
    emojiIndices,
    expenseCats,
    incomeCats,
    toggle,
    addCustom,
    setEmojiIdx,
    chosen,
    hasExpense,
  };
}

// ─── Grilla ───────────────────────────────────────────────────────────────────

export function CategoryPickerGrid({
  cats,
  type,
  selectedIds,
  emojiIndices,
  onToggle,
  onChangeEmojiIdx,
  onAdd,
  width,
}: {
  cats: UserCategory[];
  type: "expense" | "income";
  selectedIds: ReadonlySet<string>;
  emojiIndices: Record<string, number>;
  onToggle: (id: string) => void;
  onChangeEmojiIdx: (id: string, idx: number) => void;
  /** Sin `onAdd` no se muestra la tarjeta "+ Añadir". */
  onAdd?: (type: "expense" | "income") => void;
  /** Ancho disponible para las 3 columnas. */
  width: number;
}) {
  const theme = useTheme();
  const cardW = (width - CARD_GAP * 2) / 3;
  const st = useMemo(() => buildStyles(theme, cardW), [theme, cardW]);

  const items: (UserCategory | "add")[] = onAdd ? [...cats, "add"] : cats;
  const rows: (UserCategory | "add")[][] = [];
  for (let i = 0; i < items.length; i += 3) rows.push(items.slice(i, i + 3));

  return (
    <>
      {rows.map((row, ri) => (
        <View key={ri} style={st.row}>
          {row.map((item) =>
            item === "add" ? (
              <TouchableOpacity
                key="add"
                activeOpacity={0.7}
                onPress={() => onAdd?.(type)}
                style={[st.iconBox, st.addCard]}
              >
                <Text style={[st.addIcon, { color: theme.textSub }]}>+</Text>
                <Text style={[st.addLabel, { color: theme.textSub }]}>Añadir</Text>
              </TouchableOpacity>
            ) : (
              <CategoryTile
                key={item.id}
                cat={item}
                active={selectedIds.has(item.id)}
                emojiIdx={emojiIndices[item.id] ?? 0}
                onChangeEmojiIdx={(next) => onChangeEmojiIdx(item.id, next)}
                onToggle={() => onToggle(item.id)}
                theme={theme}
                st={st}
              />
            ),
          )}
          {row.length < 3 &&
            Array.from({ length: 3 - row.length }).map((_, i) => (
              <View key={`empty-${i}`} style={{ width: cardW }} />
            ))}
        </View>
      ))}
    </>
  );
}

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

function buildStyles(t: AppTheme, cardW: number) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: CARD_GAP, marginBottom: CARD_GAP },
    // Contenedor externo: solo da el ancho de columna, sin fondo/borde propios —
    // el nombre de la categoría vive acá afuera, debajo de iconBox.
    card: { width: cardW, alignItems: "center" },
    iconBox: {
      width: cardW,
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
  });
}
