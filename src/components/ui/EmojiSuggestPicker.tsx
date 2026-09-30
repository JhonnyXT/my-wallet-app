/**
 * EmojiSuggestPicker — fila de íconos (categorías, metas, deudas, métodos de pago): solo los
 * que corresponden al nombre escrito (suggestEmojis); sin nombre o sin coincidencias, `catalog`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { CURATED_EMOJIS } from "@/src/constants/categoryPresets";
import { useTheme } from "@/src/context/ThemeContext";
import { ALL_CATEGORY_EMOJIS, suggestEmojis } from "@/src/utils/emojiSearch";

const CATALOG = Array.from(new Set([...ALL_CATEGORY_EMOJIS, ...CURATED_EMOJIS]));

export function useEmojiSuggestions(query: string) {
  return useMemo(() => suggestEmojis(query), [query]);
}

/**
 * Ícono que sigue al nombre: mientras el usuario no toque uno, toma la mejor sugerencia
 * (o `fallback`). `reset(emoji, locked)` al abrir un formulario; `locked` al editar algo
 * existente para no cambiarle el ícono que ya tenía.
 */
export function useAutoEmoji(fallback: string) {
  const [emoji, setEmoji] = useState(fallback);
  const pickedRef = useRef(false);

  const onNameChange = useCallback(
    (name: string, nextFallback = fallback) => {
      if (pickedRef.current) return;
      setEmoji(suggestEmojis(name, 1)[0] ?? nextFallback);
    },
    [fallback],
  );
  const pick = useCallback((e: string) => {
    pickedRef.current = true;
    setEmoji(e);
  }, []);
  const reset = useCallback((e: string, locked = false) => {
    pickedRef.current = locked;
    setEmoji(e);
  }, []);

  return { emoji, onNameChange, pick, reset, isPicked: () => pickedRef.current };
}

export function EmojiSuggestPicker({
  query,
  selected,
  onSelect,
  catalog = CATALOG,
}: {
  query: string;
  selected: string;
  onSelect: (emoji: string) => void;
  /** Lista a mostrar sin nombre o sin coincidencias. */
  catalog?: string[];
}) {
  const theme = useTheme();
  const suggestions = useEmojiSuggestions(query);
  const scrollRef = useRef<ScrollView>(null);

  // Con coincidencias se muestran solo esas; sin ellas, todo el catálogo para elegir a mano.
  const hasMatches = suggestions.length > 0;
  const items = useMemo(() => {
    const list = hasMatches ? [...suggestions] : [...catalog];
    // El ícono elegido siempre visible (ej. al editar una categoría con otro nombre).
    if (!list.includes(selected)) list.unshift(selected);
    return list;
  }, [hasMatches, suggestions, selected, catalog]);

  const itemsKey = items.join("");
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: 0, animated: true });
  }, [itemsKey]);

  const trimmed = query.trim();
  const hint = !trimmed
    ? "Escribe el nombre para ver sugerencias"
    : hasMatches
      ? `Íconos para “${trimmed}”`
      : "Sin coincidencias, elige uno de la lista";

  const renderEmoji = (e: string, suggested: boolean) => {
    const active = e === selected;
    return (
      <TouchableOpacity
        key={e}
        onPress={() => onSelect(e)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={`Ícono ${e}${suggested ? ", sugerido" : ""}`}
        style={[styles.btn, { backgroundColor: theme.inputBg }, active && styles.btnActive]}
      >
        <Text style={styles.emoji}>{e}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View>
      <Text style={[styles.hint, { color: theme.textTertiary }]}>{hint}</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
      >
        {items.map((e) =>
          hasMatches ? (
            <Reanimated.View key={`s-${e}`} entering={FadeIn.duration(160)}>
              {renderEmoji(e, suggestions.includes(e))}
            </Reanimated.View>
          ) : (
            renderEmoji(e, false)
          ),
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, marginBottom: 8 },
  row: { alignItems: "center", paddingBottom: 4 },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  btnActive: { backgroundColor: "#DBEAFE", borderWidth: 2, borderColor: "#135BEC" },
  emoji: { fontSize: 22 },
});
