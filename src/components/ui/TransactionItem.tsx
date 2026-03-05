/**
 * TransactionItem — pixel-perfect from Figma "Visual Expense Insights Home"
 *
 * Figma values:
 *   Icon circle:   56×56px, borderRadius 9999
 *   Description:   17px, weight 800, lineHeight 25.5px
 *   Meta label:    11px, weight 700, rgba(0,0,0,0.3), letterSpacing -0.28px
 *   Amount:        18px, weight 800, lineHeight 27px
 *   Row padding:   16px top/bottom
 *   Gap icon→text: 20px
 */
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { TransactionRow } from "@/src/db/db";
import { EMOJI_TO_CATEGORY_NAME, getCategoryColor } from "@/src/constants/theme";

interface TransactionItemProps {
  transaction: TransactionRow;
  index: number;
  /** First item is full opacity; subsequent are slightly dimmed like in Figma */
  dimmed?: boolean;
  onLongPress?: (id: number) => void;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number): string {
  // Pesos colombianos: "$ 95.000" (separador de miles español, sin decimales)
  return `$ ${Math.round(amount).toLocaleString("es-ES")}`;
}

function getCategoryName(emoji: string): string {
  const name = EMOJI_TO_CATEGORY_NAME[emoji];
  if (!name) return "GASTO";
  // Capitalize first letter, rest lowercase like Figma ("Comida • 18:45")
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function TransactionItem({
  transaction,
  index,
  dimmed = false,
  onLongPress,
}: TransactionItemProps) {
  const palette = getCategoryColor(transaction.category_emoji);
  const categoryName = getCategoryName(transaction.category_emoji);
  const timeStr = formatTime(transaction.date);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 40).duration(300)}
      style={dimmed && styles.dimmed}
    >
      <Pressable
        onLongPress={() => onLongPress?.(transaction.id)}
        style={styles.row}
      >
        {/* Icon circle — Figma: 56×56, borderRadius 9999, colored bg */}
        <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
          <Text style={styles.emoji}>{transaction.category_emoji}</Text>
        </View>

        {/* Text block */}
        <View style={styles.textBlock}>
          <Text style={styles.description} numberOfLines={1}>
            {transaction.description}
          </Text>
          {/* Figma: "Comida • 18:45" */}
          <Text style={styles.meta}>
            {categoryName}
            {" • "}
            {timeStr}
          </Text>
        </View>

        {/* Amount — Figma: 18px, weight 800 */}
        <Text style={styles.amount}>{formatAmount(transaction.amount)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,    // Figma: paddingTop 16px
    paddingBottom: 16, // Figma: paddingBottom 16px
  },
  dimmed: {
    opacity: 0.4, // Figma: second item has opacity 0.4
  },
  iconCircle: {
    width: 56,   // Figma: 56px
    height: 56,  // Figma: 56px
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20, // Figma: gap 20px between icon and text
    flexShrink: 0,
  },
  emoji: {
    fontSize: 24, // Figma: 24px
    lineHeight: 32,
  },
  textBlock: {
    flex: 1,
    gap: 1, // Figma: gap 1px
    marginRight: 8,
  },
  description: {
    fontSize: 17,    // Figma: 17px
    fontWeight: "800", // Figma: weight 800
    color: "#000000",
    lineHeight: 25.5,
  },
  meta: {
    fontSize: 11,    // Figma: 11px
    fontWeight: "700", // Figma: weight 700
    color: "rgba(0,0,0,0.3)", // Figma: rgba(0,0,0,0.3)
    lineHeight: 16.5,
    letterSpacing: -0.28, // Figma: letterSpacing -0.28px
  },
  amount: {
    fontSize: 18,    // Figma: 18px
    fontWeight: "800", // Figma: weight 800
    color: "#000000",
    lineHeight: 27,
    flexShrink: 0,
  },
});
