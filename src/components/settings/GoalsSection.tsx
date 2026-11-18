import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { SheetActions, SheetAddButton, SheetHeader, useSheetPadding } from "@/src/components/ui/SheetParts";
import { EmojiSuggestPicker, useAutoEmoji } from "@/src/components/ui/EmojiSuggestPicker";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useTheme } from "@/src/context/ThemeContext";
import { checkAndNotifyGoalCompleted } from "@/src/services/notificationService";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore, type SavingsGoal } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { catSheet, useStyles } from "./settingsStyles";

const GOAL_EMOJIS = [
  "✈️",
  "🏖️",
  "🏠",
  "🏡",
  "🎁",
  "🚗",
  "🎓",
  "💻",
  "🎮",
  "👟",
  "💍",
  "🏥",
  "🐶",
  "🌍",
  "🎵",
  "🎯",
];

// ─── Popup: Nueva Meta ────────────────────────────────────────────────────────

function NuevaMetaModal({
  visible,
  editTarget,
  onClose,
}: {
  visible: boolean;
  editTarget?: SavingsGoal | null;
  onClose: () => void;
}) {
  const s = useStyles();
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const addSavingsGoal = useSettingsStore((st) => st.addSavingsGoal);
  const editSavingsGoal = useSettingsStore((st) => st.editSavingsGoal);
  const isEditing = !!editTarget;

  const icon = useAutoEmoji("✈️");
  const { reset: resetIcon } = icon;
  const [name, setName] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");

  useEffect(() => {
    if (!visible) {
      resetIcon("✈️");
      setName("");
      setTargetDisplay("");
    } else if (editTarget) {
      resetIcon(editTarget.emoji, true);
      setName(editTarget.name);
      setTargetDisplay(formatMoneyInput(String(editTarget.targetAmount)));
    }
  }, [visible, editTarget, resetIcon]);

  const canCreate = name.trim().length > 0 && targetDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const target = parseInt(targetDisplay.replace(/\D/g, ""), 10);
    if (!name.trim() || !target) return;
    if (isEditing && editTarget) {
      editSavingsGoal(editTarget.id, {
        name: name.trim(),
        emoji: icon.emoji,
        targetAmount: target,
      });
    } else {
      addSavingsGoal({
        name: name.trim(),
        emoji: icon.emoji,
        targetAmount: target,
        savedAmount: 0,
      });
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <View style={{ gap: 20 }}>
        <SheetHeader
          title={isEditing ? "Editar meta" : "Nueva meta"}
          subtitle={"Define tu próximo objetivo de ahorro"}
        />

        {/* Nombre */}
        <View style={{ gap: 8 }}>
          <Text style={s.goalFieldLabel}>Nombre de la meta</Text>
          <TextInput
            style={s.modalInput}
            value={name}
            onChangeText={(t) => {
              setName(t);
              icon.onNameChange(t);
            }}
            placeholder="Ej. Viaje a Japón"
            placeholderTextColor={theme.textSub}
            autoCapitalize="sentences"
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.goalFieldLabel}>Ícono</Text>
          <EmojiSuggestPicker
            query={name}
            selected={icon.emoji}
            onSelect={icon.pick}
            catalog={GOAL_EMOJIS}
          />
        </View>

        {/* Monto objetivo */}
        <View style={{ gap: 8 }}>
          <Text style={s.goalFieldLabel}>Monto objetivo</Text>
          <View style={[s.goalAmountRow]}>
            <Text style={s.goalAmountPrefix}>$ COP</Text>
            <TextInput
              style={s.goalAmountInput}
              value={targetDisplay}
              onChangeText={(t) => setTargetDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
              placeholder="0"
              placeholderTextColor={theme.textSub}
              keyboardType="number-pad"
              textAlign="right"
            />
          </View>
        </View>

        <SheetActions
          confirmLabel={isEditing ? "Guardar" : "Crear"}
          onConfirm={handleCreate}
          onCancel={onClose}
          disabled={!canCreate}
          style={{ marginTop: 4 }}
        />
      </View>
    </BottomSheet>
  );
}

// ─── Popup: Abonar a Meta ─────────────────────────────────────────────────────

function AbonarMetaModal({
  goal,
  visible,
  onClose,
}: {
  goal: SavingsGoal | null;
  visible: boolean;
  onClose: () => void;
}) {
  const s = useStyles();
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const updateSavingsGoal = useSettingsStore((st) => st.updateSavingsGoal);
  const addTransaction = useFinanceStore((st) => st.addTransaction);

  const [abonoDisplay, setAbonoDisplay] = useState("");

  useEffect(() => {
    if (!visible) setAbonoDisplay("");
  }, [visible]);

  if (!goal) return null;

  const abono = parseInt(abonoDisplay.replace(/\D/g, ""), 10) || 0;
  const currentPct =
    goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
  const projectedPct =
    goal.targetAmount > 0
      ? Math.min(100, ((goal.savedAmount + abono) / goal.targetAmount) * 100)
      : 0;
  const deltaPct = Math.round(projectedPct - currentPct);

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const handleAbonar = async () => {
    if (abono <= 0 || !goal) return;
    await addTransaction(abono, `Abono a ${goal.name}`, goal.emoji, ["#ahorro"]);
    const newSaved = goal.savedAmount + abono;
    updateSavingsGoal(goal.id, newSaved);

    if (newSaved >= goal.targetAmount) {
      checkAndNotifyGoalCompleted(goal.id, goal.emoji, goal.name, goal.targetAmount);
    }

    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <View style={{ gap: 16 }}>
        <SheetHeader title={"Abonar a meta"} subtitle={`${goal.emoji} ${goal.name}`} />

        {/* Campo de monto */}
        <View style={[s.goalAmountRow, { paddingVertical: 4 }]}>
          <Text style={[s.goalAmountPrefix, { fontSize: 20, fontWeight: "700" }]}>$</Text>
          <TextInput
            style={[s.goalAmountInput, { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }]}
            value={abonoDisplay}
            onChangeText={(t) => setAbonoDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
            placeholder="0"
            placeholderTextColor={theme.textSub}
            keyboardType="number-pad"
            autoFocus
            textAlign="right"
          />
          <Text style={[s.goalAmountPrefix, { marginLeft: 6 }]}>COP</Text>
        </View>

        {/* Progreso proyectado */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.goalFieldLabel}>PROGRESO PROYECTADO</Text>
            <Text style={s.goalFieldLabel}>META TOTAL</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
              {Math.round(projectedPct)}% ({fmt(goal.savedAmount + abono)})
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
              {fmt(goal.targetAmount)}
            </Text>
          </View>
          <View
            style={{
              height: 8,
              backgroundColor: theme.inputBg,
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${projectedPct}%`,
                backgroundColor: theme.accent,
                borderRadius: 4,
              }}
            />
          </View>
          {abono > 0 && deltaPct > 0 && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: theme.accent,
                textAlign: "center",
              }}
            >
              +{deltaPct}% con este abono
            </Text>
          )}
        </View>

        <SheetActions
          confirmLabel={"Abonar"}
          onConfirm={handleAbonar}
          onCancel={onClose}
          disabled={abono <= 0}
          style={{ marginTop: 4 }}
        />
      </View>
    </BottomSheet>
  );
}

// ─── Sección: Metas de Ahorro ─────────────────────────────────────────────────

// ─── Item de meta — editar/eliminar explícitos (mismo patrón que Métodos de pago,
// reemplaza el swipe-to-delete anterior) ───────────────────────────────────────

function GoalItem({
  goal,
  onEdit,
  onDelete,
  onAbonar,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onAbonar: () => void;
}) {
  const tokens = useAppTokens();

  const pct =
    goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
  const done = pct >= 100;

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  return (
    <Card style={{ marginBottom: 8, gap: 10 }}>
      {done ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
          <View style={[catSheet.emojiCircle, { backgroundColor: "#FEE2E2" }]}>
            <Text style={catSheet.emoji}>{goal.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[catSheet.name, { color: tokens.colors.state.success }]}>
              ¡Meta alcanzada!
            </Text>
            <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
              Ahorro completado con éxito
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
            <Trash2 size={16} color={tokens.colors.state.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
            <View
              style={[catSheet.emojiCircle, { backgroundColor: tokens.colors.surface.elevated }]}
            >
              <Text style={catSheet.emoji}>{goal.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[catSheet.name, { color: tokens.colors.text.primary }]}
                numberOfLines={1}
              >
                {goal.name}
              </Text>
              <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
                {fmt(goal.savedAmount)} / {fmt(goal.targetAmount)} · {Math.round(pct)}%
              </Text>
            </View>
            <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ padding: 4 }}>
              <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
              <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: tokens.colors.surface.elevated,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: `${pct}%` as `${number}%`,
                backgroundColor: "#135BEC",
                borderRadius: 3,
              }}
            />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
            <TouchableOpacity
              // Botón primario fijo #135BEC (regla inmutable #7) — no varía con el tema.
              style={{
                backgroundColor: "#135BEC",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: tokens.radius.full,
              }}
              onPress={onAbonar}
              activeOpacity={0.75}
            >
              <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Abonar
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Card>
  );
}

// ─── Sección principal de metas ───────────────────────────────────────────────
export function SavingsGoalsSection() {
  const tokens = useAppTokens();
  const savingsGoals = useSettingsStore((st) => st.savingsGoals);
  const removeSavingsGoal = useSettingsStore((st) => st.removeSavingsGoal);

  const [showNuevaMeta, setShowNuevaMeta] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [abonarGoal, setAbonarGoal] = useState<SavingsGoal | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      {savingsGoals.length === 0 ? (
        /* ── Estado vacío ─────────────────────────────────────────────── */
        <View
          style={{
            alignItems: "center",
            gap: tokens.spacing.sm + 2,
            paddingVertical: tokens.spacing.lg,
          }}
        >
          <Text style={{ fontSize: 32 }}>🎯</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes metas de ahorro{"\n"}define una y empieza hoy
          </ThemedText>
        </View>
      ) : (
        /* ── Lista de metas ───────────────────────────────────────────── */
        <>
          {savingsGoals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onEdit={() => setEditGoal(goal)}
              onDelete={() => setDeleteDialog({ id: goal.id, name: goal.name })}
              onAbonar={() => setAbonarGoal(goal)}
            />
          ))}
        </>
      )}

      <SheetAddButton
        label="Nueva meta"
        onPress={() => setShowNuevaMeta(true)}
        style={{ marginTop: 4 }}
      />

      <NuevaMetaModal visible={showNuevaMeta} onClose={() => setShowNuevaMeta(false)} />
      <NuevaMetaModal
        visible={!!editGoal}
        editTarget={editGoal}
        onClose={() => setEditGoal(null)}
      />
      <AbonarMetaModal
        goal={abonarGoal}
        visible={!!abonarGoal}
        onClose={() => setAbonarGoal(null)}
      />

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar meta"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) removeSavingsGoal(deleteDialog.id);
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />
    </>
  );
}
