import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { TransactionRow } from "@/src/db/db";
import { EMOJI_TO_CATEGORY_NAME, getCategoryColor } from "@/src/constants/theme";

interface TransactionItemProps {
  transaction: TransactionRow;
  index: number;
  dimmed?: boolean;
  onLongPress?: (id: number) => void;
}

function formatDate(dateStr: string): string {
  const d          = new Date(dateStr);
  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dStart     = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays   = Math.round(
    (todayStart.getTime() - dStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (d.getFullYear() === now.getFullYear())
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(amount: number): string {
  return `$ ${Math.round(Math.abs(amount)).toLocaleString("es-ES")}`;
}

function getCategoryName(emoji: string): string {
  const name = EMOJI_TO_CATEGORY_NAME[emoji];
  if (!name) return "General";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

/** Extrae hashtags del texto (ej: "café #trabajo" → ["#trabajo"]) */
function extractTags(text: string): string[] {
  return (text.match(/#\w+/g) ?? []);
}

/** Devuelve el texto sin los hashtags para mostrarlo limpio como título */
function cleanDescription(text: string): string {
  return text.replace(/#\w+/g, "").trim();
}

export function TransactionItem({
  transaction,
  index,
  dimmed = false,
  onLongPress,
}: TransactionItemProps) {
  const palette      = getCategoryColor(transaction.category_emoji);
  const categoryName = getCategoryName(transaction.category_emoji);
  const dateStr      = formatDate(transaction.date);
  const isExpense    = transaction.amount >= 0;
  const amountColor  = isExpense ? "#000000" : "#059669";
  const amountSign   = isExpense ? "- " : "+ ";

  const rawDesc = transaction.description || categoryName;

  // Prioridad: columna tags (JSON), luego hashtags embebidos en la descripción
  let tags: string[] = [];
  if (transaction.tags && transaction.tags.trim() !== "") {
    try { tags = JSON.parse(transaction.tags); } catch { tags = extractTags(transaction.tags); }
  } else {
    tags = extractTags(rawDesc);
  }

  const title = cleanDescription(rawDesc) || categoryName;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(300)}
      style={dimmed && styles.dimmed}
    >
      <Pressable
        onLongPress={() => onLongPress?.(transaction.id)}
        style={styles.row}
      >
        {/* Icono circular */}
        <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
          <Text style={styles.emoji}>{transaction.category_emoji}</Text>
        </View>

        {/* Bloque de texto */}
        <View style={styles.textBlock}>

          {/* Fila superior: categoría • fecha */}
          <Text style={styles.categoryLine}>
            {categoryName}
            {"  ·  "}
            {dateStr}
          </Text>

          {/* Descripción principal */}
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>

          {/* Tags (si los hay) */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag) => (
                <View key={tag} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Monto */}
        <Text style={[styles.amount, { color: amountColor }]}>
          {amountSign}{formatAmount(transaction.amount)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  dimmed: {
    opacity: 0.4,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    flexShrink: 0,
  },
  emoji: {
    fontSize: 24,
    lineHeight: 32,
  },
  textBlock: {
    flex: 1,
    gap: 3,
    marginRight: 12,
    minWidth: 0, // permite que flex recorte el texto antes de empujar el monto
  },

  // Categoría + fecha — pequeño, gris
  categoryLine: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(0,0,0,0.38)",
    lineHeight: 16,
    letterSpacing: 0.1,
  },

  // Descripción — título principal
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    lineHeight: 21,
    letterSpacing: -0.2,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 16,
  },

  // Monto — ancho mínimo reservado para que nunca lo empuje el texto
  amount: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    flexShrink: 0,
    minWidth: 110,
    textAlign: "right",
  },
});
