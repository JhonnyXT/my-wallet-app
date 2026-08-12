import { useRef, useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Animated, PanResponder, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import AnimatedRN, { FadeInDown } from "react-native-reanimated";
import { Trash2, Pencil } from "lucide-react-native";
import type { TransactionRow } from "@/src/db/db";
import { EMOJI_TO_CATEGORY_NAME, getCategoryColor } from "@/src/constants/theme";
import { useTheme } from "@/src/context/ThemeContext";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import type { AppTheme } from "@/src/theme";

// ─── Constantes del swipe ─────────────────────────────────────────────────────
const DELETE_WIDTH = 72; // ancho del botón de eliminar (revelado deslizando a la izquierda)
const EDIT_WIDTH = 72; // ancho del botón de editar (revelado deslizando a la derecha)
const SWIPE_THRESH = 48; // mínimo para que se abra un botón
const CLOSE_THRESH = 20; // mínimo para cerrar un botón ya abierto

interface TransactionItemProps {
  transaction: TransactionRow;
  index: number;
  dimmed?: boolean;
  onDelete?: (id: number) => void;
  onEdit?: (tx: TransactionRow) => void;
  onDetail?: (tx: TransactionRow) => void;
}

const SHORT_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function formatAmount(amount: number): string {
  return `$ ${Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
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
  return text.match(/#\w+/g) ?? [];
}

function cleanDescription(text: string): string {
  return text.replace(/#\w+/g, "").trim();
}

export function TransactionItem({
  transaction,
  index,
  dimmed = false,
  onDelete,
  onEdit,
  onDetail,
}: TransactionItemProps) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const userCategories = useSettingsStore((s) => s.userCategories);
  const savingsGoals = useSettingsStore((s) => s.savingsGoals);
  const palette = getCategoryColor(transaction.category_emoji);
  const categoryName = resolveCategoryName(
    transaction.category_emoji,
    userCategories,
    savingsGoals,
  );
  const dateStr = formatDate(transaction.date);
  const isExpense = transaction.amount >= 0;
  const amountColor = isExpense ? theme.text : "#059669";
  const amountSign = isExpense ? "- " : "+ ";

  const rawDesc = transaction.description || categoryName;

  let tags: string[] = [];
  if (transaction.tags && transaction.tags.trim() !== "") {
    try {
      tags = JSON.parse(transaction.tags);
    } catch {
      tags = extractTags(transaction.tags);
    }
  } else {
    tags = extractTags(rawDesc);
  }

  const title = cleanDescription(rawDesc) || categoryName;

  // ── Swipe bidireccional: izquierda revela eliminar, derecha revela editar ──────
  const translateX = useRef(new Animated.Value(0)).current;
  const openSide = useRef<"delete" | "edit" | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const spring = (toValue: number, cb?: () => void) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start(cb);

  // onStartShouldSetPanResponder: false → el FlatList recibe los toques primero.
  // El PanResponder sólo reclama el gesto cuando detecta un swipe horizontal claro.
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        if (Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy)) {
          const base =
            openSide.current === "delete"
              ? -DELETE_WIDTH
              : openSide.current === "edit"
                ? EDIT_WIDTH
                : 0;
          const next = Math.max(-DELETE_WIDTH, Math.min(EDIT_WIDTH, base + g.dx));
          translateX.setValue(next);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (openSide.current) {
          if (
            Math.abs(g.dx) > CLOSE_THRESH &&
            Math.sign(g.dx) !== (openSide.current === "delete" ? -1 : 1)
          ) {
            openSide.current = null;
            spring(0);
          } else {
            spring(openSide.current === "delete" ? -DELETE_WIDTH : EDIT_WIDTH);
          }
        } else if (g.dx < -SWIPE_THRESH) {
          openSide.current = "delete";
          Haptics.selectionAsync();
          spring(-DELETE_WIDTH);
        } else if (g.dx > SWIPE_THRESH) {
          openSide.current = "edit";
          Haptics.selectionAsync();
          spring(EDIT_WIDTH);
        } else {
          spring(0);
        }
      },
      onPanResponderTerminate: () => {
        spring(
          openSide.current === "delete"
            ? -DELETE_WIDTH
            : openSide.current === "edit"
              ? EDIT_WIDTH
              : 0,
        );
      },
    }),
  ).current;

  function handleClose() {
    openSide.current = null;
    spring(0);
  }

  function handleDeletePress() {
    setConfirmVisible(true);
  }

  function handleConfirmDelete() {
    setConfirmVisible(false);
    Animated.timing(translateX, {
      toValue: -400,
      duration: 220,
      useNativeDriver: true,
    }).start(() => onDelete?.(transaction.id));
  }

  function handleCancelDelete() {
    setConfirmVisible(false);
    handleClose();
  }

  function handleEditPress() {
    Haptics.selectionAsync();
    handleClose();
    onEdit?.(transaction);
  }

  return (
    <AnimatedRN.View
      entering={FadeInDown.delay(index * 40).duration(300)}
      style={[styles.wrapper, dimmed && styles.dimmed]}
    >
      <View style={styles.container}>
        {/* Botón de editar — detrás del row, a la izquierda (revelado deslizando a la derecha) */}
        <View style={styles.editContainer}>
          <TouchableOpacity style={styles.editBtn} onPress={handleEditPress} activeOpacity={0.8}>
            <Pencil size={18} color="#FFFFFF" strokeWidth={2.2} />
          </TouchableOpacity>
        </View>

        {/* Botón de eliminar — detrás del row, a la derecha (revelado deslizando a la izquierda) */}
        <View style={styles.deleteContainer}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeletePress}
            activeOpacity={0.8}
          >
            <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Animated.View: maneja el deslizamiento (translateX) + PanResponder para swipe */}
        <Animated.View
          style={[styles.row, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          {/* TouchableOpacity: captura el tap → detail sin interferir con el swipe */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => {
              if (openSide.current) {
                handleClose();
                return;
              }
              Haptics.selectionAsync();
              onDetail?.(transaction);
            }}
            style={styles.rowInner}
          >
            {/* Icono circular */}
            <View style={[styles.iconCircle, { backgroundColor: palette.bg }]}>
              <Text style={styles.emoji}>{transaction.category_emoji}</Text>
            </View>

            {/* Bloque de texto */}
            <View style={styles.textBlock}>
              <View style={styles.categoryRow}>
                <Text style={styles.categoryName}>{categoryName}</Text>
                <Text style={styles.categorySep}>{"  ·  "}</Text>
                <Text style={styles.categoryDate} numberOfLines={1}>
                  {dateStr}
                </Text>
              </View>
              <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
                {title}
              </Text>
              {tags.length > 0 && (
                <Text style={styles.tagsText} numberOfLines={1}>
                  {tags.join("  ")}
                </Text>
              )}
            </View>

            {/* Monto — pill */}
            <View style={styles.amountPill}>
              <Text style={[styles.amount, { color: amountColor }]}>
                {amountSign}
                {formatAmount(transaction.amount)}
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <ConfirmDialog
        visible={confirmVisible}
        variant="danger"
        title="¿Eliminar transacción?"
        message="Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </AnimatedRN.View>
  );
}

function createStyles(t: AppTheme) {
  return StyleSheet.create({
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

    // Botón azul detrás, lado izquierdo
    editContainer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: EDIT_WIDTH,
      alignItems: "center",
      justifyContent: "center",
    },
    editBtn: {
      width: 48,
      height: 48,
      borderRadius: 9999,
      backgroundColor: "#135BEC",
      alignItems: "center",
      justifyContent: "center",
    },

    // Animated.View: solo background + radio para que el translateX deslice correctamente
    row: {
      backgroundColor: t.isDark ? t.itemBg : "#FFFFFF",
      borderRadius: 16,
    },
    // TouchableOpacity interior: contiene todo el layout del item
    rowInner: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingLeft: 16,
      paddingRight: 16,
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
    tagsText: {
      fontSize: 11,
      fontWeight: "500",
      color: t.textSub,
      lineHeight: 16,
      marginTop: 2,
    },
    amountPill: {
      backgroundColor: t.pillNeutral,
      borderRadius: 9999,
      paddingVertical: 7,
      paddingHorizontal: 12,
      flexShrink: 0,
    },
    amount: {
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 17,
    },
  });
}
