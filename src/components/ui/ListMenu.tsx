/**
 * ListMenu — menú del selector de listas del Dashboard ("Personal ▾"): elegir la lista
 * activa; compartir o editar la activa; crear una nueva. Se ancla debajo del botón y crece
 * desde su esquina superior izquierda (mismo patrón que PeriodMenu).
 */
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Check, Pencil, Plus, Share2 } from "lucide-react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ThemedText } from "@/src/components/ui/ThemedText";
import type { MenuAnchor } from "@/src/components/ui/PeriodMenu";
import type { WalletList } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";

const MENU_WIDTH = 256;

export function ListMenu({
  visible,
  anchor,
  lists,
  activeListId,
  onSelect,
  onShare,
  onEdit,
  onNew,
  onClose,
}: {
  visible: boolean;
  anchor: MenuAnchor | null;
  lists: WalletList[];
  activeListId: string;
  onSelect: (id: string) => void;
  /** Compartir la lista activa (los 3 botones actúan sobre la activa). */
  onShare: () => void;
  onEdit: () => void;
  onNew: () => void;
  onClose: () => void;
}) {
  const tokens = useAppTokens();
  const c = tokens.colors;
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reducedMotion
        ? withTiming(1, { duration: 120 })
        : withSpring(1, { dampingRatio: 0.85, duration: 320 });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 140, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reducedMotion]);

  const menuStyle = useAnimatedStyle(() => ({
    opacity: Math.min(progress.value * 1.6, 1),
    transform: reducedMotion ? [] : [{ scale: 0.88 + 0.12 * progress.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted || !anchor) return null;

  // Mismo ajuste que PeriodMenu: el Modal de Android es edge-to-edge, measureInWindow no.
  const statusBarOffset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  const top = anchor.y + anchor.height + 8 + statusBarOffset;
  const left = Math.max(anchor.x, 12);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar menú">
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
      </Pressable>
      <Animated.View
        accessibilityRole="menu"
        style={[
          styles.menu,
          {
            top,
            left,
            backgroundColor: c.surface.secondary,
            borderColor: c.border.default,
            borderRadius: tokens.radius.xl,
          },
          menuStyle,
        ]}
      >
        {lists.map((list) => {
          const active = list.id === activeListId;
          return (
            <Pressable
              key={list.id}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(list.id);
              }}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: active }}
              // Estilo estático + ripple: en un Modal el estilo-función de Pressable se perdía.
              android_ripple={{ color: c.surface.elevated }}
              style={styles.row}
            >
              <View style={styles.checkSlot}>
                {active && <Check size={16} color={c.text.primary} strokeWidth={2.4} />}
              </View>
              <Text style={styles.emoji}>{list.emoji}</Text>
              <ThemedText
                variant="body"
                style={[
                  styles.rowLabel,
                  { color: c.text.primary },
                  active && styles.rowLabelActive,
                ]}
                numberOfLines={1}
              >
                {list.name}
              </ThemedText>
            </Pressable>
          );
        })}

        <View style={[styles.divider, { backgroundColor: c.border.default }]} />

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onShare();
            }}
            android_ripple={{ color: c.surface.elevated }}
            style={styles.action}
            accessibilityRole="menuitem"
            accessibilityLabel="Compartir lista actual"
          >
            <Share2 size={18} color={c.text.primary} strokeWidth={1.8} />
            <ThemedText variant="footnote" style={{ color: c.text.primary }}>
              Compartir
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onEdit();
            }}
            android_ripple={{ color: c.surface.elevated }}
            style={styles.action}
            accessibilityRole="menuitem"
            accessibilityLabel="Editar lista actual"
          >
            <Pencil size={18} color={c.text.primary} strokeWidth={1.8} />
            <ThemedText variant="footnote" style={{ color: c.text.primary }}>
              Editar
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              onNew();
            }}
            android_ripple={{ color: c.surface.elevated }}
            style={styles.action}
            accessibilityRole="menuitem"
            accessibilityLabel="Nueva lista"
          >
            <Plus size={18} color={c.text.primary} strokeWidth={1.8} />
            <ThemedText variant="footnote" style={{ color: c.text.primary }}>
              Nueva
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(0,0,0,0.12)" },
  menu: {
    position: "absolute",
    width: MENU_WIDTH,
    paddingTop: 6,
    borderWidth: StyleSheet.hairlineWidth,
    transformOrigin: "top left",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingRight: 16,
    gap: 10,
  },
  checkSlot: { width: 30, alignItems: "flex-end" },
  emoji: { fontSize: 17 },
  rowLabel: { flex: 1, fontSize: 15 },
  rowLabelActive: { fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 6 },
  actions: { flexDirection: "row" },
  action: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 12,
  },
});
