import { useEffect, useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { Pencil, Trash2 } from "lucide-react-native";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { SheetActions, SheetAddButton, SheetHeader, useSheetPadding } from "@/src/components/ui/SheetParts";
import { EmojiSuggestPicker, useAutoEmoji } from "@/src/components/ui/EmojiSuggestPicker";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useTheme } from "@/src/context/ThemeContext";
import {
  cancelDebtReminder,
  notifyDebtPaidOff,
  scheduleDebtReminder,
} from "@/src/services/notificationService";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore, type Debt } from "@/src/store/useSettingsStore";
import { useAppTokens } from "@/src/theme/tokens";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { catSheet, useStyles } from "./settingsStyles";

// ─── Sección: Deudas ───────────────────────────────────────────────────────────

const DEBT_EMOJIS = ["💳", "🏦", "🚗", "🏠", "🎓", "📱", "🛍️", "💰", "🏥", "✈️"];
export const DEBT_COLOR = "#9F1239";

// ─── Popup: Nueva Deuda ────────────────────────────────────────────────────────

/** Grilla 1-31 para elegir el día del mes del recordatorio — a diferencia de
 * CalendarSheet, no tiene mes/año ni deshabilita días futuros: la deuda se
 * recuerda ese mismo día TODOS los meses, no es una fecha puntual. */
function DayOfMonthSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: number;
  onSelect: (day: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const sheetPad = useSheetPadding();
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <BottomSheet visible={visible} onClose={onClose} style={sheetPad}>
      <SheetHeader title="Día de pago" subtitle="Se repite cada mes" />
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {days.map((day) => {
          const isSel = day === selected;
          return (
            <TouchableOpacity
              key={day}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                onSelect(day);
                onClose();
              }}
              activeOpacity={0.6}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSel ? theme.accent : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSel ? "700" : "500",
                    color: isSel ? "#FFFFFF" : theme.text,
                  }}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function NuevaDeudaModal({
  visible,
  editTarget,
  onClose,
}: {
  visible: boolean;
  editTarget?: Debt | null;
  onClose: () => void;
}) {
  const s = useStyles();
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const addDebt = useSettingsStore((st) => st.addDebt);
  const editDebt = useSettingsStore((st) => st.editDebt);
  const isEditing = !!editTarget;

  const icon = useAutoEmoji(DEBT_EMOJIS[0]);
  const { reset: resetIcon } = icon;
  const [name, setName] = useState("");
  const [totalDisplay, setTotalDisplay] = useState("");
  const [paymentDisplay, setPaymentDisplay] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      resetIcon(DEBT_EMOJIS[0]);
      setName("");
      setTotalDisplay("");
      setPaymentDisplay("");
      setDueDay(1);
    } else if (editTarget) {
      resetIcon(editTarget.emoji, true);
      setName(editTarget.name);
      setTotalDisplay(formatMoneyInput(String(editTarget.totalAmount)));
      setPaymentDisplay(formatMoneyInput(String(editTarget.monthlyPayment)));
      setDueDay(editTarget.dueDay);
    }
  }, [visible, editTarget, resetIcon]);

  const canCreate = name.trim().length > 0 && totalDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const totalAmount = parseInt(totalDisplay.replace(/\D/g, ""), 10);
    const monthlyPayment = parseInt(paymentDisplay.replace(/\D/g, ""), 10) || 0;
    if (!name.trim() || !totalAmount) return;

    if (isEditing && editTarget) {
      editDebt(editTarget.id, {
        name: name.trim(),
        emoji: icon.emoji,
        totalAmount,
        monthlyPayment,
        dueDay,
      });
      scheduleDebtReminder({
        ...editTarget,
        name: name.trim(),
        emoji: icon.emoji,
        monthlyPayment,
        dueDay,
      });
    } else {
      const debt = addDebt({
        name: name.trim(),
        emoji: icon.emoji,
        totalAmount,
        monthlyPayment,
        dueDay,
      });
      scheduleDebtReminder(debt);
    }
    onClose();
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
        <View style={{ gap: 20 }}>
          <SheetHeader
            title={isEditing ? "Editar deuda" : "Nueva deuda"}
            subtitle={"Registra una deuda para hacerle seguimiento"}
          />

          {/* Nombre */}
          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Nombre de la deuda</Text>
            <TextInput
              style={s.modalInput}
              value={name}
              onChangeText={(t) => {
                setName(t);
                icon.onNameChange(t);
              }}
              placeholder="Ej. Tarjeta de crédito"
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
              catalog={DEBT_EMOJIS}
            />
          </View>

          {/* Monto total */}
          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Monto total de la deuda</Text>
            <View style={s.goalAmountRow}>
              <Text style={s.goalAmountPrefix}>$ COP</Text>
              <TextInput
                style={s.goalAmountInput}
                value={totalDisplay}
                onChangeText={(t) => setTotalDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
                placeholder="0"
                placeholderTextColor={theme.textSub}
                keyboardType="number-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* Cuota mensual + día de pago */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={s.goalFieldLabel}>Cuota mensual</Text>
              <View style={s.goalAmountRow}>
                <Text style={s.goalAmountPrefix}>$</Text>
                <TextInput
                  style={s.goalAmountInput}
                  value={paymentDisplay}
                  onChangeText={(t) => setPaymentDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
                  placeholder="0"
                  placeholderTextColor={theme.textSub}
                  keyboardType="number-pad"
                  textAlign="right"
                />
              </View>
            </View>
            <View style={{ width: 100, gap: 8 }}>
              <Text style={s.goalFieldLabel}>Día de pago</Text>
              <TouchableOpacity
                style={s.goalAmountRow}
                onPress={() => setDaySheetOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={[s.goalAmountInput, { textAlign: "right" }]}>{dueDay}</Text>
              </TouchableOpacity>
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
      <DayOfMonthSheet
        visible={daySheetOpen}
        selected={dueDay}
        onSelect={setDueDay}
        onClose={() => setDaySheetOpen(false)}
      />
    </>
  );
}

// ─── Popup: Abonar a Deuda ─────────────────────────────────────────────────────

function AbonarDeudaModal({
  debt,
  visible,
  onClose,
}: {
  debt: Debt | null;
  visible: boolean;
  onClose: () => void;
}) {
  const s = useStyles();
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const tokens = useAppTokens();
  const updateDebtBalance = useSettingsStore((st) => st.updateDebtBalance);
  const addTransaction = useFinanceStore((st) => st.addTransaction);

  const [abonoDisplay, setAbonoDisplay] = useState("");

  useEffect(() => {
    if (!visible) setAbonoDisplay("");
  }, [visible]);

  if (!debt) return null;

  const abono = parseInt(abonoDisplay.replace(/\D/g, ""), 10) || 0;
  const projectedRemaining = Math.max(0, debt.remainingAmount - abono);

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const handleAbonar = async () => {
    if (abono <= 0 || !debt) return;
    await addTransaction(abono, `Pago de ${debt.name}`, debt.emoji, ["#deuda"]);
    updateDebtBalance(debt.id, projectedRemaining);

    if (projectedRemaining <= 0) {
      cancelDebtReminder(debt.id);
      notifyDebtPaidOff(debt.name, debt.emoji);
    }

    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <View style={{ gap: 16 }}>
        <SheetHeader title={"Pagar deuda"} subtitle={`${debt.emoji} ${debt.name}`} />

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

        {/* Saldo proyectado */}
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={s.goalFieldLabel}>SALDO RESTANTE</Text>
            <Text style={s.goalFieldLabel}>DEUDA TOTAL</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
              {fmt(projectedRemaining)}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
              {fmt(debt.totalAmount)}
            </Text>
          </View>
          {projectedRemaining <= 0 && abono > 0 && (
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: tokens.colors.state.success,
                textAlign: "center",
              }}
            >
              ¡Con este abono liquidas la deuda!
            </Text>
          )}
        </View>

        <SheetActions
          confirmLabel={"Pagar"}
          onConfirm={handleAbonar}
          onCancel={onClose}
          disabled={abono <= 0}
          style={{ marginTop: 4 }}
        />
      </View>
    </BottomSheet>
  );
}

// ─── Item de deuda — editar/eliminar explícitos (mismo patrón que Métodos de pago) ──

function DebtItem({
  debt,
  onEdit,
  onDelete,
  onAbonar,
}: {
  debt: Debt;
  onEdit: () => void;
  onDelete: () => void;
  onAbonar: () => void;
}) {
  const tokens = useAppTokens();

  const paidAmount = debt.totalAmount - debt.remainingAmount;
  const pct = debt.totalAmount > 0 ? Math.min(100, (paidAmount / debt.totalAmount) * 100) : 0;
  const done = debt.remainingAmount <= 0;

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  return (
    <Card style={{ marginBottom: 8, gap: 10 }}>
      {done ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
          <View style={[catSheet.emojiCircle, { backgroundColor: "#FEE2E2" }]}>
            <Text style={catSheet.emoji}>{debt.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[catSheet.name, { color: tokens.colors.state.success }]}>
              ¡Deuda liquidada!
            </Text>
            <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
              Ya no debes nada por este concepto
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
              <Text style={catSheet.emoji}>{debt.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[catSheet.name, { color: tokens.colors.text.primary }]}
                numberOfLines={1}
              >
                {debt.name}
              </Text>
              <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
                Saldo: {fmt(debt.remainingAmount)} / {fmt(debt.totalAmount)}
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
                backgroundColor: DEBT_COLOR,
                borderRadius: 3,
              }}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <ThemedText variant="footnote" color="secondary">
              Cuota {fmt(debt.monthlyPayment)} · día {debt.dueDay}
            </ThemedText>
            <TouchableOpacity
              style={{
                backgroundColor: DEBT_COLOR,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: tokens.radius.full,
              }}
              onPress={onAbonar}
              activeOpacity={0.75}
            >
              <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Pagar
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Card>
  );
}

// ─── Sección principal de deudas ───────────────────────────────────────────────

export function DebtsSection() {
  const tokens = useAppTokens();
  const debts = useSettingsStore((st) => st.debts);
  const removeDebt = useSettingsStore((st) => st.removeDebt);

  const [showNuevaDeuda, setShowNuevaDeuda] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [abonarDebt, setAbonarDebt] = useState<Debt | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      {debts.length === 0 ? (
        /* ── Estado vacío ─────────────────────────────────────────────── */
        <View
          style={{
            alignItems: "center",
            gap: tokens.spacing.sm + 2,
            paddingVertical: tokens.spacing.lg,
          }}
        >
          <Text style={{ fontSize: 32 }}>💳</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes deudas registradas{"\n"}agrégalas para controlarlas y salir de ellas
          </ThemedText>
        </View>
      ) : (
        /* ── Lista de deudas ──────────────────────────────────────────── */
        <>
          {debts.map((debt) => (
            <DebtItem
              key={debt.id}
              debt={debt}
              onEdit={() => setEditDebt(debt)}
              onDelete={() => setDeleteDialog({ id: debt.id, name: debt.name })}
              onAbonar={() => setAbonarDebt(debt)}
            />
          ))}
        </>
      )}

      <SheetAddButton
        label="Nueva deuda"
        onPress={() => setShowNuevaDeuda(true)}
        style={{ marginTop: 4 }}
      />

      <NuevaDeudaModal visible={showNuevaDeuda} onClose={() => setShowNuevaDeuda(false)} />
      <NuevaDeudaModal
        visible={!!editDebt}
        editTarget={editDebt}
        onClose={() => setEditDebt(null)}
      />
      <AbonarDeudaModal
        debt={abonarDebt}
        visible={!!abonarDebt}
        onClose={() => setAbonarDebt(null)}
      />

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar deuda"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) {
            cancelDebtReminder(deleteDialog.id);
            removeDebt(deleteDialog.id);
          }
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />
    </>
  );
}
