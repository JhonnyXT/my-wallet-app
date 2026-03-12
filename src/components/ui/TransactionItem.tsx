import { useRef, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, Animated,
  PanResponder, TouchableOpacity, Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { Trash2 } from "lucide-react-native";
import type { TransactionRow } from "@/src/db/db";
import { EMOJI_TO_CATEGORY_NAME, getCategoryColor } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import type { AppTheme } from "@/src/theme";

// ─── Constantes del swipe ─────────────────────────────────────────────────────
const DELETE_WIDTH  = 72;   // ancho del botón de eliminar
const SWIPE_THRESH  = 48;   // mínimo para que se abra el botón

interface TransactionItemProps {
  transaction: TransactionRow;
  index: number;
  dimmed?: boolean;
  onLongPress?: (id: number) => void;
  onDetail?: (tx: TransactionRow) => void;
}

const SHORT_MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatAmount(amount: number): string {
  return `$ ${Math.round(Math.abs(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function resolveCategoryName(
  emoji: string,
  userCats: { emoji: string; name: string }[],
  goals: { emoji: string; name: string }[],
): string {
  const userMatch = userCats.find((c) => c.emoji === emoji);
  if (userMatch) return capitalize(userMatch.name);
  const goalMatch = goals.find((g) => g.emoji === emoji);
  if (goalMatch) return capitalize(goalMatch.name);
  const name = EMOJI_TO_CATEGORY_NAME[emoji];
  if (!name) return "General";
  return capitalize(name);
}

function extractTags(text: string): string[] {
  return (text.match(/#\w+/g) ?? []);
}

function cleanDescription(text: string): string {
  return text.replace(/#\w+/g, "").trim();
}

export function TransactionItem({
  transaction,
  index,
  dimmed = false,
  onLongPress,
  onDetail,
}: TransactionItemProps) {
  const theme          = useTheme();
  const styles         = useMemo(() => createStyles(theme), [theme]);
  const userCategories = useSettingsStore((s) => s.userCategories);
  const savingsGoals   = useSettingsStore((s) => s.savingsGoals);
  const palette        = getCategoryColor(transaction.category_emoji);
  const categoryName   = resolveCategoryName(transaction.category_emoji, userCategories, savingsGoals);
  const dateStr        = formatDate(transaction.date);
  const isExpense    = transaction.amount >= 0;
  const amountColor  = isExpense ? theme.text : "#059669";
  const amountSign   = isExpense ? "- " : "+ ";

  const rawDesc = transaction.description || categoryName;

  let tags: string[] = [];
  if (transaction.tags && transaction.tags.trim() !== "") {
    try { tags = JSON.parse(transaction.tags); } catch { tags = extractTags(transaction.tags); }
  } else {
    tags = extractTags(rawDesc);
  }

  const title = cleanDescription(rawDesc) || categoryName;

  // ── Swipe to delete + long-press to detail ─────────────────────────────────
  const translateX  = useRef(new Animated.Value(0)).current;
  const isOpen      = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress   = useRef(false);

  const spring = (toValue: number, cb?: () => void) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start(cb);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderGrant: () => {
        didLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDetail?.(transaction);
        }, 500);
      },
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5) {
          if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        }
        if (Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy)) {
          const base = isOpen.current ? -DELETE_WIDTH : 0;
          const next = Math.min(0, base + g.dx);
          translateX.setValue(next);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
        if (didLongPress.current) return;

        if (isOpen.current) {
          if (g.dx > 20) {
            isOpen.current = false;
            spring(0);
          } else {
            spring(-DELETE_WIDTH);
          }
        } else {
          if (g.dx < -SWIPE_THRESH) {
            isOpen.current = true;
            spring(-DELETE_WIDTH);
          } else {
            spring(0);
          }
        }
      },
      onPanResponderTerminate: () => {
        if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      },
    })
  ).current;

  function handleDelete() {
    // Animación de salida antes de eliminar
    Animated.timing(translateX, {
      toValue: -400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onLongPress?.(transaction.id));
  }

  function handleClose() {
    isOpen.current = false;
    spring(0);
  }

  return (
    <AnimatedRN.View
      entering={FadeInDown.delay(index * 40).duration(300)}
      style={[styles.wrapper, dimmed && styles.dimmed]}
    >
      <View style={styles.container}>
      {/* Botón de eliminar — detrás del row */}
      <View style={styles.deleteContainer}>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDelete}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Row que se desliza */}
      <Animated.View
        style={[styles.row, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Icono circular */}
        <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
          <Text style={styles.emoji}>{transaction.category_emoji}</Text>
        </View>

        {/* Bloque de texto */}
        <View style={styles.textBlock}>
          <View style={styles.categoryRow}>
            <Text style={styles.categoryName}>
              {categoryName}
            </Text>
            <Text style={styles.categorySep}>{"  ·  "}</Text>
            <Text style={styles.categoryDate} numberOfLines={1}>
              {dateStr}
            </Text>
          </View>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
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
      </Animated.View>
      </View>
    </AnimatedRN.View>
  );
}

function createStyles(t: AppTheme) { return StyleSheet.create({
  // Wrapper exterior: maneja el spacing — lo lleva la animación de Reanimated
  wrapper: {
    marginBottom: 8,
  },
  dimmed: {
    opacity: 0.4,
  },
  // Contenedor visual: clip con borderRadius
  container: {
    position: "relative",
    overflow: "hidden",
    backgroundColor: t.isDark ? t.itemBg : "#FFFFFF",
    borderRadius: 16,
    borderWidth: t.isDark ? 1 : 0,
    borderColor: t.isDark ? t.border : "transparent",
    // Sombra sutil en modo claro para dar sensación de tarjeta
    shadowColor: t.isDark ? "transparent" : "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: t.isDark ? 0 : 0.06,
    shadowRadius: 4,
    elevation: t.isDark ? 0 : 2,
  },

  // Botón rojo detrás
  deleteContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 16,
    backgroundColor: t.isDark ? t.itemBg : "#FFFFFF",
    borderRadius: 16,
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
    minWidth: 0,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "500",
    color: t.textSub,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  categorySep: {
    fontSize: 12,
    fontWeight: "500",
    color: t.textSub,
    lineHeight: 16,
  },
  categoryDate: {
    fontSize: 12,
    fontWeight: "500",
    color: t.textSub,
    lineHeight: 16,
    letterSpacing: 0.1,
    flexShrink: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: t.text,
    lineHeight: 21,
    letterSpacing: -0.2,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  tagPill: {
    backgroundColor: t.inputBg,
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: t.textSub,
    lineHeight: 16,
  },
  amount: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
    flexShrink: 0,
    minWidth: 80,
    textAlign: "right",
  },
});}
