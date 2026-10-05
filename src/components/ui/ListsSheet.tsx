/**
 * ListsSheet — "Tus listas" desde Ajustes: tocar una lista la activa; la activa se puede
 * editar (lápiz) y abajo se crea una nueva o se une a una compartida con un código.
 * Crear/editar/borrar/unirse lo resuelve useListEditor en el padre (aquí solo se avisa, porque
 * el editor es otra hoja y no se apilan dos Modal).
 */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Check, Pencil, Users } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { SheetAddButton } from "@/src/components/ui/SheetParts";
import type { WalletList } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";

export function ListsSheet({
  visible,
  lists,
  activeListId,
  onSelect,
  onEditActive,
  onNew,
  onJoin,
  onClose,
}: {
  visible: boolean;
  lists: WalletList[];
  activeListId: string;
  onSelect: (id: string) => void;
  onEditActive: () => void;
  onNew: () => void;
  onJoin: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useAppTokens().colors;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={[styles.container, { paddingBottom: insets.bottom + 20 }]}
    >
      <Text style={[styles.title, { color: c.text.primary }]}>Tus listas</Text>
      <Text style={[styles.subtitle, { color: c.text.secondary }]}>
        Toca una para verla. Los ajustes de la lista (categorías, presupuestos…) cambian con ella.
      </Text>

      {lists.map((l) => {
        const active = l.id === activeListId;
        // Quienes salieron de una lista compartida siguen en `members` solo para las cuentas.
        const people = l.members?.filter((m) => m.status !== "left").length ?? 0;
        const who =
          people > 0 ? `Tú y ${people} ${people === 1 ? "persona" : "personas"}` : "Solo tú";
        return (
          <Pressable
            key={l.id}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(l.id);
            }}
            android_ripple={{ color: c.border.default }}
            style={styles.row}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Lista ${l.name}`}
          >
            <View style={[styles.emojiCircle, { backgroundColor: c.surface.elevated }]}>
              <Text style={styles.emoji}>{l.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.name, { color: c.text.primary }, active && styles.nameActive]}
                numberOfLines={1}
              >
                {l.name}
              </Text>
              <View style={styles.metaRow}>
                {l.space && <Users size={12} color={c.accent.default} strokeWidth={2.2} />}
                <Text style={[styles.meta, { color: c.text.secondary }]}>
                  {l.space ? `Compartida · ${who}` : who}
                </Text>
              </View>
            </View>
            {active && (
              <>
                <Check size={18} color={c.accent.default} strokeWidth={2.4} />
                <Pressable
                  onPress={onEditActive}
                  hitSlop={10}
                  style={styles.editBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar ${l.name}`}
                >
                  <Pencil size={16} color={c.text.secondary} strokeWidth={1.8} />
                </Pressable>
              </>
            )}
          </Pressable>
        );
      })}

      <SheetAddButton label="Nueva lista" onPress={onNew} />
      <Pressable
        onPress={onJoin}
        style={styles.joinBtn}
        accessibilityRole="button"
        accessibilityLabel="Unirme con un código"
      >
        <Users size={16} color={c.accent.default} strokeWidth={2.2} />
        <Text style={[styles.joinText, { color: c.accent.default }]}>Unirme con un código</Text>
      </Pressable>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 12, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  name: { fontSize: 16, fontWeight: "600" },
  nameActive: { fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  meta: { fontSize: 12 },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
  },
  joinText: { fontSize: 15, fontWeight: "600" },
  editBtn: { padding: 6, marginLeft: 4 },
});
