/**
 * ListEditorSheet — crear o editar una lista (nombre, emoji y personas; al crear, también sus
 * categorías en un segundo paso). Editando una lista que no es Personal, ofrece eliminarla
 * junto con todas sus transacciones.
 */
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowLeft, Check, LogOut, Plus, Trash2, UserPlus, Users, X } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { CategoryPickerGrid, useCategoryPicker } from "@/src/components/ui/CategoryPickerGrid";
import { PressableScale } from "@/src/components/ui/PressableScale";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { DEFAULT_LIST_ID, LIST_EMOJIS } from "@/src/constants/lists";
import type { ListMember, WalletList } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";
import { newId } from "@/src/utils/ids";

const SHEET_PADDING = 20;

/** Compartir la lista con otras personas (Sync Fase 4). Ausente = no se ofrece. */
export interface ListSharing {
  /** uid de la sesión; null = sin sesión (compartir pide iniciarla). */
  uid: string | null;
  /** Esperando al servidor (crear el espacio o un código). */
  busy: boolean;
  error: string | null;
  /** Convertir en espacio y mostrar el código, o solo un código nuevo si ya lo es. */
  onShare: () => void;
  /** Salir del espacio (no dueño). */
  onLeave: () => void;
  /** Quitar a alguien que se unió (solo el dueño). */
  onRemoveMember: (member: ListMember) => void;
}

type SaveFn = (
  name: string,
  emoji: string,
  members: ListMember[],
  /** Solo al crear: las categorías elegidas. Al editar, []. */
  categories: UserCategory[],
) => void;

export function ListEditorSheet({
  visible,
  list,
  lockedMemberIds,
  onSave,
  onDelete,
  onClose,
  sharing,
}: {
  visible: boolean;
  /** null = crear una lista nueva. */
  list: WalletList | null;
  /** Personas con movimientos en la lista: no se pueden quitar (quedarían huérfanos). */
  lockedMemberIds?: ReadonlySet<string>;
  onSave: SaveFn;
  onDelete: () => void;
  onClose: () => void;
  sharing?: ListSharing;
}) {
  // Cada apertura remonta el cuerpo: parte de la lista editada (o vacía al crear), paso 1.
  const [openCount, setOpenCount] = useState(0);
  useEffect(() => {
    if (visible) setOpenCount((n) => n + 1);
  }, [visible]);

  return (
    <BottomSheet visible={visible} onClose={onClose} style={styles.container}>
      <EditorBody
        key={openCount}
        list={list}
        lockedMemberIds={lockedMemberIds}
        onSave={onSave}
        onDelete={onDelete}
        sharing={sharing}
      />
    </BottomSheet>
  );
}

function EditorBody({
  list,
  lockedMemberIds,
  onSave,
  onDelete,
  sharing,
}: {
  list: WalletList | null;
  lockedMemberIds?: ReadonlySet<string>;
  onSave: SaveFn;
  onDelete: () => void;
  sharing?: ListSharing;
}) {
  const tokens = useAppTokens();
  const c = tokens.colors;
  const [name, setName] = useState(list?.name ?? "");
  const [emoji, setEmoji] = useState(list?.emoji ?? LIST_EMOJIS[1]);
  // Quienes salieron de una lista compartida no se muestran (siguen en la lista para las cuentas).
  const [members, setMembers] = useState<ListMember[]>(
    (list?.members ?? []).filter((m) => m.status !== "left"),
  );
  const [memberName, setMemberName] = useState("");
  const [step, setStep] = useState<"info" | "categories">("info");
  // Lista nueva: arranca sin categorías y se eligen del catálogo en el paso 2.
  const picker = useCategoryPicker([]);

  const addMember = () => {
    const n = memberName.trim();
    if (!n) return;
    setMembers((prev) => [...prev, { id: newId(), name: n }]);
    setMemberName("");
  };

  // Mismo motivo que DefaultPeriodSheet: KeyboardAvoidingView no mide bien dentro del Modal.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const trimmed = name.trim();
  const isNew = !list;
  const space = list?.space;
  const isOwner = !!space && space.ownerUid === sharing?.uid;
  // En una lista compartida solo el dueño la elimina (para todos); los demás salen.
  const canDelete = !!list && list.id !== DEFAULT_LIST_ID && (!space || isOwner);
  const canLeave = !!space && !isOwner && !!sharing;
  const canShare = !!list && list.id !== DEFAULT_LIST_ID && !!sharing;
  // Personal es solo tuyo: no lleva personas.
  const canHaveMembers = !list || list.id !== DEFAULT_LIST_ID;
  const emojis = LIST_EMOJIS.includes(emoji) ? LIST_EMOJIS : [emoji, ...LIST_EMOJIS];

  // Un nombre escrito sin tocar "+" también cuenta.
  const finalMembers = () => {
    const pending = memberName.trim();
    const all = pending ? [...members, { id: newId(), name: pending }] : members;
    return canHaveMembers ? all : [];
  };

  if (step === "categories") {
    const gridWidth = Dimensions.get("window").width - SHEET_PADDING * 2;
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <Pressable
          onPress={() => setStep("info")}
          hitSlop={8}
          style={styles.backRow}
          accessibilityRole="button"
          accessibilityLabel="Atrás"
        >
          <ArrowLeft size={18} color={c.text.secondary} strokeWidth={2} />
          <Text style={[styles.backText, { color: c.text.secondary }]}>
            {emoji} {trimmed}
          </Text>
        </Pressable>
        <Text style={[styles.title, { color: c.text.primary }]}>Categorías</Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
          Elige las de esta lista. Después puedes cambiarlas o crear nuevas en Ajustes → Categorías.
        </Text>

        <Text style={[styles.gridTitle, { color: c.text.primary }]}>Gastos</Text>
        <CategoryPickerGrid
          cats={picker.expenseCats}
          type="expense"
          selectedIds={picker.selectedIds}
          emojiIndices={picker.emojiIndices}
          onToggle={picker.toggle}
          onChangeEmojiIdx={picker.setEmojiIdx}
          width={gridWidth}
        />
        <Text style={[styles.gridTitle, { color: c.text.primary, marginTop: 12 }]}>Ingresos</Text>
        <CategoryPickerGrid
          cats={picker.incomeCats}
          type="income"
          selectedIds={picker.selectedIds}
          emojiIndices={picker.emojiIndices}
          onToggle={picker.toggle}
          onChangeEmojiIdx={picker.setEmojiIdx}
          width={gridWidth}
        />

        <PressableScale
          onPress={() => {
            if (!picker.hasExpense) return;
            onSave(trimmed, emoji, finalMembers(), picker.chosen());
          }}
          disabled={!picker.hasExpense}
          style={[styles.saveBtn, { opacity: picker.hasExpense ? 1 : 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel="Crear lista"
        >
          <Check size={18} color="#FFFFFF" strokeWidth={2.4} />
          <Text style={styles.saveText}>
            {picker.hasExpense
              ? `Crear lista (${picker.selectedIds.size})`
              : "Elige al menos un gasto"}
          </Text>
        </PressableScale>
      </ScrollView>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={{ paddingBottom: keyboardHeight }}>
        <Text style={[styles.title, { color: c.text.primary }]}>
          {list ? "Editar lista" : "Nueva lista"}
        </Text>
        <Text style={[styles.subtitle, { color: c.text.secondary }]}>
          {list
            ? "Cambia el nombre, el ícono o las personas."
            : "Un mundo aparte para tus movimientos: un viaje, el trabajo… Empieza viendo todo el tiempo."}
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej. Vacaciones a Seúl"
          placeholderTextColor={c.text.secondary}
          maxLength={40}
          autoFocus={isNew}
          returnKeyType="done"
          style={[
            styles.input,
            {
              color: c.text.primary,
              backgroundColor: c.surface.elevated,
              borderRadius: tokens.radius.md,
            },
          ]}
          accessibilityLabel="Nombre de la lista"
        />

        <View style={styles.emojiGrid}>
          {emojis.map((e) => {
            const selected = e === emoji;
            return (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[
                  styles.emojiBtn,
                  {
                    backgroundColor: selected ? c.accent.subtle : c.surface.elevated,
                    borderColor: selected ? c.accent.default : "transparent",
                  },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Ícono ${e}`}
              >
                <Text style={styles.emoji}>{e}</Text>
              </Pressable>
            );
          })}
        </View>

        {canHaveMembers && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>Personas</Text>
            <Text style={[styles.sectionHint, { color: c.text.secondary }]}>
              Quienes también gastan en esta lista (tu pareja, un socio…). En cada gasto eliges
              quién pagó.
            </Text>
            <View style={styles.memberChips}>
              <View style={[styles.memberChip, { backgroundColor: c.surface.elevated }]}>
                <Text style={[styles.memberChipText, { color: c.text.primary }]}>Tú</Text>
              </View>
              {members.map((m) => {
                const joined = m.status === "joined";
                // Quien se unió con la app solo lo quita el dueño, en línea; quien tiene
                // movimientos, nadie (quedarían huérfanos).
                const removable = joined ? isOwner : !(lockedMemberIds?.has(m.id) ?? false);
                return (
                  <View
                    key={m.id}
                    style={[styles.memberChip, { backgroundColor: c.surface.elevated }]}
                  >
                    {joined && (
                      <View
                        style={[styles.joinedDot, { backgroundColor: c.state.success }]}
                        accessibilityLabel="Se unió con la app"
                      />
                    )}
                    <Text style={[styles.memberChipText, { color: c.text.primary }]}>{m.name}</Text>
                    {removable && (
                      <Pressable
                        onPress={() =>
                          joined
                            ? sharing?.onRemoveMember(m)
                            : setMembers((prev) => prev.filter((x) => x.id !== m.id))
                        }
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar a ${m.name}`}
                      >
                        <X size={13} color={c.text.secondary} strokeWidth={2.4} />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
            <View style={styles.memberInputRow}>
              <TextInput
                value={memberName}
                onChangeText={setMemberName}
                onSubmitEditing={addMember}
                placeholder="Nombre de otra persona"
                placeholderTextColor={c.text.secondary}
                maxLength={30}
                returnKeyType="done"
                blurOnSubmit={false}
                style={[
                  styles.input,
                  styles.memberInput,
                  {
                    color: c.text.primary,
                    backgroundColor: c.surface.elevated,
                    borderRadius: tokens.radius.md,
                  },
                ]}
                accessibilityLabel="Nombre de otra persona"
              />
              <Pressable
                onPress={addMember}
                disabled={!memberName.trim()}
                style={[
                  styles.memberAddBtn,
                  { backgroundColor: c.accent.subtle, opacity: memberName.trim() ? 1 : 0.5 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Agregar persona"
              >
                <Plus size={20} color={c.accent.default} strokeWidth={2.4} />
              </Pressable>
            </View>
          </>
        )}

        {canShare && sharing && (
          <>
            <Text style={[styles.sectionTitle, { color: c.text.primary }]}>
              {space ? "Lista compartida" : "Compartir"}
            </Text>
            <Text style={[styles.sectionHint, { color: c.text.secondary }]}>
              {space
                ? `${isOwner ? "La creaste tú" : "Te uniste"}. Quienes tienen el punto verde registran desde su teléfono.`
                : "Cada persona registra desde su teléfono, con su cuenta. Se necesita conexión para compartir."}
            </Text>
            <Pressable
              onPress={sharing.onShare}
              disabled={sharing.busy}
              style={[
                styles.shareBtn,
                { backgroundColor: c.accent.subtle, borderRadius: tokens.radius.lg },
              ]}
              accessibilityRole="button"
              accessibilityLabel={space ? "Invitar a alguien" : "Compartir lista"}
              accessibilityState={{ busy: sharing.busy }}
            >
              {sharing.busy ? (
                <ActivityIndicator size="small" color={c.accent.default} />
              ) : space ? (
                <UserPlus size={18} color={c.accent.default} strokeWidth={2.2} />
              ) : (
                <Users size={18} color={c.accent.default} strokeWidth={2.2} />
              )}
              <Text style={[styles.shareText, { color: c.accent.default }]}>
                {sharing.busy ? "Un momento…" : space ? "Invitar a alguien" : "Compartir lista"}
              </Text>
            </Pressable>
            {!!sharing.error && (
              <Text style={[styles.shareError, { color: c.state.danger }]}>{sharing.error}</Text>
            )}
          </>
        )}

        <PressableScale
          onPress={() => {
            if (!trimmed) return;
            Keyboard.dismiss();
            if (isNew) setStep("categories");
            else onSave(trimmed, emoji, finalMembers(), []);
          }}
          disabled={!trimmed}
          style={[styles.saveBtn, { opacity: trimmed ? 1 : 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={isNew ? "Siguiente: elegir categorías" : "Guardar cambios"}
        >
          {!isNew && <Check size={18} color="#FFFFFF" strokeWidth={2.4} />}
          <Text style={styles.saveText}>{isNew ? "Siguiente: categorías →" : "Guardar"}</Text>
        </PressableScale>

        {canLeave && (
          <Pressable
            onPress={sharing?.onLeave}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Salir de la lista compartida"
          >
            <LogOut size={16} color={c.state.danger} strokeWidth={2} />
            <Text style={[styles.deleteText, { color: c.state.danger }]}>Salir de la lista</Text>
          </Pressable>
        )}
        {canDelete && (
          <Pressable
            onPress={onDelete}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Eliminar lista"
          >
            <Trash2 size={16} color={c.state.danger} strokeWidth={2} />
            <Text style={[styles.deleteText, { color: c.state.danger }]}>Eliminar lista</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: SHEET_PADDING, paddingBottom: 36, maxHeight: "92%" },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  backText: { fontSize: 14, fontWeight: "600" },
  gridTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 16, lineHeight: 18 },
  input: { fontSize: 16, paddingHorizontal: 14, paddingVertical: 12 },
  emojiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginTop: 22 },
  sectionHint: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  memberChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9999,
  },
  memberChipText: { fontSize: 14, fontWeight: "600" },
  joinedDot: { width: 7, height: 7, borderRadius: 4 },
  shareBtn: {
    marginTop: 10,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  shareText: { fontSize: 15, fontWeight: "700" },
  shareError: { fontSize: 13, lineHeight: 18, marginTop: 8 },
  memberInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  memberInput: { flex: 1 },
  memberAddBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  emoji: { fontSize: 20 },
  saveBtn: {
    marginTop: 20,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#135BEC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  deleteBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  deleteText: { fontSize: 14, fontWeight: "600" },
});
