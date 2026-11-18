/**
 * Gastos/ingresos recurrentes (Pro). Asistente de 3 pasos (Lo básico/Detalles/Frecuencia) para
 * crear o editar un recurrente, más la lista con pausar/editar/eliminar — mismo lenguaje visual
 * que DebtsSection (DebtItem). Autocontenido: el gating de Pro (crear/reanudar) vive acá mismo,
 * no en app/settings.tsx.
 */
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Pause, Pencil, Play, Trash2 } from "lucide-react-native";
import { canUse, openPaywall } from "@/src/billing";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Card } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { EmojiSuggestPicker, useAutoEmoji } from "@/src/components/ui/EmojiSuggestPicker";
import {
  SheetActions,
  SheetAddButton,
  SheetHeader,
  SheetLabel,
  useSheetPadding,
} from "@/src/components/ui/SheetParts";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useTheme } from "@/src/context/ThemeContext";
import {
  cancelRecurringReminder,
  scheduleRecurringReminder,
} from "@/src/services/notificationService";
import {
  paymentMethodEmoji,
  useSettingsStore,
  type RecurringCadence,
  type RecurringExpense,
} from "@/src/store/useSettingsStore";
import { useRecurringQueueStore } from "@/src/store/useRecurringQueueStore";
import { moneyColors, useAppTokens } from "@/src/theme/tokens";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { WEEKDAY_SHORT } from "@/src/utils/periodCycles";
import { cycleKeyOf, describeCadence, nextDueDate, upcomingDueDate } from "@/src/utils/recurring";
import { catSheet } from "./settingsStyles";

export const RECURRING_COLOR = "#0D9488";
const RECURRING_EMOJIS = ["🏠", "📱", "💡", "🚗", "💼", "🎓", "🏋️", "🎬", "🐾", "💳"];

/** Chip de selección (categoría/cuenta/lista): emoji + nombre, tinte del acento al elegir. */
function RecurringChip({
  emoji,
  label,
  selected,
  onPress,
}: {
  emoji: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tokens = useAppTokens();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: tokens.radius.full,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: selected ? tokens.colors.accent.subtle : tokens.colors.surface.elevated,
        borderWidth: 1.5,
        borderColor: selected ? tokens.colors.accent.default : "transparent",
      }}
    >
      <Text style={{ fontSize: 15 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 13,
          fontWeight: selected ? "700" : "500",
          color: selected ? tokens.colors.accent.default : tokens.colors.text.primary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function RecurringChipWrap({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{children}</View>;
}

function WeekdayPicker({
  selected,
  onSelect,
}: {
  selected: number;
  onSelect: (weekday: number) => void;
}) {
  const tokens = useAppTokens();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {WEEKDAY_SHORT.map((label, weekday) => {
        const isSel = weekday === selected;
        return (
          <TouchableOpacity
            key={weekday}
            onPress={() => onSelect(weekday)}
            activeOpacity={0.7}
            style={{
              flex: 1,
              height: 44,
              borderRadius: tokens.radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isSel
                ? tokens.colors.accent.default
                : tokens.colors.surface.elevated,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: isSel ? "700" : "500",
                color: isSel ? "#FFFFFF" : tokens.colors.text.secondary,
              }}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Día del mes (1–31) en una grilla de 7 columnas, sin abrir otra hoja. */
function MonthDayGrid({ selected, onSelect }: { selected: number; onSelect: (d: number) => void }) {
  const tokens = useAppTokens();
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
      {days.map((d) => {
        const isSel = d === selected;
        return (
          <TouchableOpacity
            key={d}
            onPress={() => onSelect(d)}
            activeOpacity={0.6}
            style={{
              width: `${100 / 7}%`,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSel ? tokens.colors.accent.default : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isSel ? "700" : "500",
                  color: isSel ? "#FFFFFF" : tokens.colors.text.primary,
                }}
              >
                {d}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Opción grande seleccionable con radio a la derecha (mismo patrón de las listas de selección). */
function RecurringOption({
  label,
  hint,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  const tokens = useAppTokens();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: tokens.radius.lg,
        backgroundColor: tokens.colors.surface.elevated,
        borderWidth: 1.5,
        borderColor: selected ? tokens.colors.accent.default : "transparent",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: tokens.colors.text.primary }}>
          {label}
        </Text>
        <Text style={{ fontSize: 12, marginTop: 2, color: tokens.colors.text.secondary }}>
          {hint}
        </Text>
      </View>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2,
          borderColor: selected ? tokens.colors.accent.default : tokens.colors.border.default,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {selected && (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: tokens.colors.accent.default,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

const RECURRING_STEP_TITLES = ["Lo básico", "Detalles", "Frecuencia"] as const;

function NuevoRecurrenteModal({
  visible,
  editTarget,
  onClose,
}: {
  visible: boolean;
  editTarget?: RecurringExpense | null;
  onClose: () => void;
}) {
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const tokens = useAppTokens();
  const addRecurring = useSettingsStore((st) => st.addRecurring);
  const editRecurring = useSettingsStore((st) => st.editRecurring);
  const paymentMethods = useSettingsStore((st) => st.paymentMethods);
  const lists = useSettingsStore((st) => st.lists);
  const activeListId = useSettingsStore((st) => st.activeListId);
  const userCategories = useSettingsStore((st) => st.userCategories);
  const isEditing = !!editTarget;

  const icon = useAutoEmoji(RECURRING_EMOJIS[0]);
  const { reset: resetIcon } = icon;
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [isExpense, setIsExpense] = useState(true);
  const [categoryEmoji, setCategoryEmoji] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0]?.id ?? "cash");
  const [listId, setListId] = useState(activeListId);
  const [cadenceType, setCadenceType] = useState<RecurringCadence["type"]>("monthly");
  const [day, setDay] = useState(1);
  const [weekday, setWeekday] = useState(1);
  // Dos veces al mes: los dos días. Cada 2 semanas: cuál de las dos fechas candidatas es la próxima.
  const [dayA, setDayA] = useState(15);
  const [dayB, setDayB] = useState(30);
  const [startWeek, setStartWeek] = useState<0 | 1>(0);
  const [amountVaries, setAmountVaries] = useState(false);

  useEffect(() => {
    if (!visible) {
      resetIcon(RECURRING_EMOJIS[0]);
      setStep(0);
      setName("");
      setAmountDisplay("");
      setIsExpense(true);
      setCategoryEmoji("");
      setPaymentMethod(paymentMethods[0]?.id ?? "cash");
      setListId(activeListId);
      setCadenceType("monthly");
      setDay(1);
      setWeekday(1);
      setDayA(15);
      setDayB(30);
      setStartWeek(0);
      setAmountVaries(false);
    } else if (editTarget) {
      resetIcon(editTarget.emoji, true);
      setName(editTarget.name);
      setAmountDisplay(formatMoneyInput(String(editTarget.amount)));
      setIsExpense(editTarget.isExpense);
      setCategoryEmoji(editTarget.categoryEmoji);
      setPaymentMethod(editTarget.paymentMethod);
      setListId(editTarget.listId);
      const c = editTarget.cadence;
      setCadenceType(c.type);
      setDay(c.type === "monthly" ? c.day : 1);
      setDayA(c.type === "semimonthly" ? c.days[0] : 15);
      setDayB(c.type === "semimonthly" ? c.days[1] : 30);
      if (c.type === "weekly") setWeekday(c.weekday);
      else if (c.type === "biweekly") {
        // Conserva la "fase": la próxima ocurrencia real es la primera o la segunda fecha candidata.
        const now = new Date();
        const next = nextDueDate(c, now);
        setWeekday(next.getDay());
        const firstOfWeekday = nextDueDate({ type: "weekly", weekday: next.getDay() }, now);
        setStartWeek(cycleKeyOf(next) === cycleKeyOf(firstOfWeekday) ? 0 : 1);
      } else setWeekday(1);
      setAmountVaries(editTarget.amountVaries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, editTarget, resetIcon]);

  // La categoría por defecto es la primera disponible de ese tipo — se recalcula si el
  // usuario no eligió ninguna todavía o si cambia gasto/ingreso.
  useEffect(() => {
    if (!visible) return;
    const available = userCategories.filter((c) => c.type === (isExpense ? "expense" : "income"));
    if (!available.some((c) => c.emoji === categoryEmoji)) {
      setCategoryEmoji(available[0]?.emoji ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isExpense, userCategories]);

  // Cada 2 semanas: las dos próximas fechas de ese día de la semana (la fase la elige el usuario).
  const startDates = useMemo(() => {
    const first = nextDueDate({ type: "weekly", weekday }, new Date());
    return [first, new Date(first.getFullYear(), first.getMonth(), first.getDate() + 7)];
  }, [weekday]);

  const cadence: RecurringCadence = useMemo(() => {
    switch (cadenceType) {
      case "weekly":
        return { type: "weekly", weekday };
      case "biweekly":
        return { type: "biweekly", anchor: cycleKeyOf(startDates[startWeek]) };
      case "semimonthly":
        return { type: "semimonthly", days: dayA < dayB ? [dayA, dayB] : [dayB, dayA] };
      default:
        return { type: "monthly", day };
    }
  }, [cadenceType, day, weekday, dayA, dayB, startDates, startWeek]);

  const hasBasics = name.trim().length > 0 && amountDisplay.replace(/\D/g, "").length > 0;
  const sameSemimonthlyDays = cadenceType === "semimonthly" && dayA === dayB;
  const canContinue =
    step === 0 ? hasBasics : step === 1 ? !!categoryEmoji : !sameSemimonthlyDays;
  const isLastStep = step === RECURRING_STEP_TITLES.length - 1;

  const handleCreate = () => {
    const amount = parseInt(amountDisplay.replace(/\D/g, ""), 10);
    if (!name.trim() || !amount || !categoryEmoji) return;

    const base = {
      name: name.trim(),
      emoji: icon.emoji,
      amount,
      isExpense,
      categoryEmoji,
      paymentMethod,
      listId,
      cadence,
      amountVaries,
    };

    if (isEditing && editTarget) {
      editRecurring(editTarget.id, base);
      scheduleRecurringReminder({ ...editTarget, ...base });
    } else {
      const recurring = addRecurring(base);
      scheduleRecurringReminder(recurring);
    }
    useRecurringQueueStore.getState().recompute();
    onClose();
  };

  const money = isExpense ? moneyColors.expense : moneyColors.income;

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SheetHeader
          title={isEditing ? "Editar recurrente" : "Nuevo recurrente"}
          subtitle={`Paso ${step + 1} de ${RECURRING_STEP_TITLES.length} · ${RECURRING_STEP_TITLES[step]}`}
        />

        {/* Progreso: una barra por paso */}
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          {RECURRING_STEP_TITLES.map((t, i) => (
            <View
              key={t}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor:
                  i <= step ? tokens.colors.accent.default : tokens.colors.surface.elevated,
              }}
            />
          ))}
        </View>

        {step === 0 && (
          <View>
            {/* Monto como protagonista: el color dice si es gasto o ingreso */}
            <View style={{ alignItems: "center", marginTop: 20 }}>
              <TextInput
                style={{
                  alignSelf: "stretch",
                  fontSize: amountDisplay.length >= 11 ? 30 : amountDisplay.length >= 9 ? 38 : 46,
                  fontWeight: "800",
                  color: money.text,
                  paddingHorizontal: 4,
                  paddingVertical: 4,
                  textAlign: "center",
                }}
                value={amountDisplay ? `$ ${amountDisplay}` : ""}
                onChangeText={(t) => setAmountDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
                placeholder="$ 0"
                placeholderTextColor={theme.textTertiary}
                keyboardType="number-pad"
              />

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 10,
                  padding: 3,
                  borderRadius: 999,
                  backgroundColor: tokens.colors.surface.elevated,
                }}
              >
                {([true, false] as const).map((val) => {
                  const isSel = isExpense === val;
                  const c = val ? moneyColors.expense : moneyColors.income;
                  return (
                    <TouchableOpacity
                      key={String(val)}
                      onPress={() => setIsExpense(val)}
                      activeOpacity={0.7}
                      style={{
                        paddingHorizontal: 22,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: isSel ? c.bg : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: isSel ? c.text : tokens.colors.text.secondary,
                        }}
                      >
                        {val ? "Gasto" : "Ingreso"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <SheetLabel>Nombre</SheetLabel>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: tokens.colors.surface.elevated,
                }}
              >
                <Text style={{ fontSize: 24 }}>{icon.emoji}</Text>
              </View>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: theme.inputBg,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: theme.text,
                }}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  icon.onNameChange(t);
                }}
                placeholder="Ej. Arriendo"
                placeholderTextColor={theme.textTertiary}
                autoCapitalize="sentences"
                maxLength={30}
              />
            </View>

            {name.trim().length > 0 && (
              <View style={{ marginTop: 10 }}>
                <EmojiSuggestPicker
                  query={name}
                  selected={icon.emoji}
                  onSelect={icon.pick}
                  catalog={RECURRING_EMOJIS}
                />
              </View>
            )}
          </View>
        )}

        {step === 1 && (
          <View>
            <SheetLabel first>Categoría</SheetLabel>
            <RecurringChipWrap>
              {userCategories
                .filter((c) => c.type === (isExpense ? "expense" : "income"))
                .map((cat) => (
                  <RecurringChip
                    key={cat.emoji}
                    emoji={cat.emoji}
                    label={cat.name}
                    selected={cat.emoji === categoryEmoji}
                    onPress={() => setCategoryEmoji(cat.emoji)}
                  />
                ))}
            </RecurringChipWrap>

            {paymentMethods.length > 0 && (
              <>
                <SheetLabel>Cuenta</SheetLabel>
                <RecurringChipWrap>
                  {paymentMethods.map((m) => (
                    <RecurringChip
                      key={m.id}
                      emoji={paymentMethodEmoji(m)}
                      label={m.name}
                      selected={m.id === paymentMethod}
                      onPress={() => setPaymentMethod(m.id)}
                    />
                  ))}
                </RecurringChipWrap>
              </>
            )}

            {lists.length > 1 && (
              <>
                <SheetLabel>Lista</SheetLabel>
                <RecurringChipWrap>
                  {lists.map((l) => (
                    <RecurringChip
                      key={l.id}
                      emoji={l.emoji}
                      label={l.name}
                      selected={l.id === listId}
                      onPress={() => setListId(l.id)}
                    />
                  ))}
                </RecurringChipWrap>
              </>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <SheetLabel first>Se repite</SheetLabel>
            <View style={{ gap: 8 }}>
              <RecurringOption
                label="Cada mes"
                hint="Un día fijo del mes"
                selected={cadenceType === "monthly"}
                onPress={() => setCadenceType("monthly")}
              />
              <RecurringOption
                label="Cada semana"
                hint="Un día fijo de la semana"
                selected={cadenceType === "weekly"}
                onPress={() => setCadenceType("weekly")}
              />
              <RecurringOption
                label="Cada 2 semanas"
                hint="Un día fijo, de 14 en 14 días"
                selected={cadenceType === "biweekly"}
                onPress={() => setCadenceType("biweekly")}
              />
              <RecurringOption
                label="Dos veces al mes"
                hint="Por ejemplo el 15 y el 30"
                selected={cadenceType === "semimonthly"}
                onPress={() => setCadenceType("semimonthly")}
              />
            </View>

            {cadenceType === "monthly" && (
              <>
                <SheetLabel>Día del mes</SheetLabel>
                <MonthDayGrid selected={day} onSelect={setDay} />
              </>
            )}
            {(cadenceType === "weekly" || cadenceType === "biweekly") && (
              <>
                <SheetLabel>Día de la semana</SheetLabel>
                <WeekdayPicker selected={weekday} onSelect={setWeekday} />
              </>
            )}
            {cadenceType === "biweekly" && (
              <>
                <SheetLabel>¿Cuándo es la próxima?</SheetLabel>
                <RecurringChipWrap>
                  {startDates.map((date, i) => (
                    <RecurringChip
                      key={cycleKeyOf(date)}
                      emoji="📅"
                      label={date.toLocaleDateString("es-CO", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                      selected={startWeek === i}
                      onPress={() => setStartWeek(i as 0 | 1)}
                    />
                  ))}
                </RecurringChipWrap>
              </>
            )}
            {cadenceType === "semimonthly" && (
              <>
                <SheetLabel>Primer día del mes</SheetLabel>
                <MonthDayGrid selected={dayA} onSelect={setDayA} />
                <SheetLabel>Segundo día del mes</SheetLabel>
                <MonthDayGrid selected={dayB} onSelect={setDayB} />
                {sameSemimonthlyDays && (
                  <ThemedText variant="footnote" style={{ marginTop: 8, color: moneyColors.expense.text }}>
                    Elige dos días distintos.
                  </ThemedText>
                )}
              </>
            )}

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 20,
              }}
            >
              <ThemedText variant="subheadline" style={{ flex: 1, paddingRight: 12 }}>
                El monto varía cada vez
              </ThemedText>
              <Switch
                value={amountVaries}
                onValueChange={setAmountVaries}
                trackColor={{ true: theme.accent }}
              />
            </View>
          </View>
        )}

        <SheetActions
          confirmLabel={isLastStep ? (isEditing ? "Guardar" : "Crear") : "Siguiente"}
          cancelLabel={step === 0 ? "Cancelar" : "Atrás"}
          onConfirm={isLastStep ? handleCreate : () => setStep(step + 1)}
          onCancel={step === 0 ? onClose : () => setStep(step - 1)}
          disabled={!canContinue}
          style={{ marginTop: 24 }}
        />
      </ScrollView>
    </BottomSheet>
  );
}

function RecurringItem({
  recurring,
  onEdit,
  onDelete,
  onTogglePause,
}: {
  recurring: RecurringExpense;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePause: () => void;
}) {
  const tokens = useAppTokens();
  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
  const cadenceLabel = describeCadence(recurring.cadence);
  const now = new Date();
  const next = upcomingDueDate(recurring, now);
  const nextLabel = !recurring.active
    ? "Pausado — no notifica"
    : next <= now
      ? "Por confirmar"
      : `Próxima: ${next.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`;

  return (
    <Card style={{ marginBottom: 8, gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
        <View
          style={[
            catSheet.emojiCircle,
            {
              backgroundColor: recurring.active
                ? tokens.colors.surface.elevated
                : tokens.colors.surface.secondary,
              opacity: recurring.active ? 1 : 0.6,
            },
          ]}
        >
          <Text style={catSheet.emoji}>{recurring.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[catSheet.name, { color: tokens.colors.text.primary }]} numberOfLines={1}>
            {recurring.name}
          </Text>
          <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
            {recurring.isExpense ? "−" : "+"} {fmt(recurring.amount)}
          </Text>
        </View>
        <TouchableOpacity onPress={onTogglePause} hitSlop={8} style={{ padding: 4 }}>
          {recurring.active ? (
            <Pause size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
          ) : (
            <Play size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ padding: 4 }}>
          <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
          <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <ThemedText variant="footnote" color="secondary">
        {cadenceLabel} · {nextLabel}
      </ThemedText>
    </Card>
  );
}

export function RecurringSection() {
  const tokens = useAppTokens();
  const recurringExpenses = useSettingsStore((st) => st.recurringExpenses);
  const pauseRecurring = useSettingsStore((st) => st.pauseRecurring);
  const resumeRecurring = useSettingsStore((st) => st.resumeRecurring);
  const removeRecurring = useSettingsStore((st) => st.removeRecurring);

  const [showNuevo, setShowNuevo] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringExpense | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  function handleOpenCreate() {
    if (!canUse("recurringExpenses")) {
      openPaywall("recurringExpenses");
      return;
    }
    setShowNuevo(true);
  }

  function handleTogglePause(r: RecurringExpense) {
    if (r.active) {
      pauseRecurring(r.id);
      cancelRecurringReminder(r.id);
    } else {
      if (!canUse("recurringExpenses")) {
        openPaywall("recurringExpenses");
        return;
      }
      resumeRecurring(r.id);
      scheduleRecurringReminder({ ...r, active: true });
    }
    useRecurringQueueStore.getState().recompute();
  }

  return (
    <>
      {recurringExpenses.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            gap: tokens.spacing.sm + 2,
            paddingVertical: tokens.spacing.lg,
          }}
        >
          <Text style={{ fontSize: 32 }}>🔁</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes recurrentes{"\n"}arriendo, salario, suscripciones — te los recordamos
            solos
          </ThemedText>
        </View>
      ) : (
        recurringExpenses.map((r) => (
          <RecurringItem
            key={r.id}
            recurring={r}
            onEdit={() => setEditTarget(r)}
            onDelete={() => setDeleteDialog({ id: r.id, name: r.name })}
            onTogglePause={() => handleTogglePause(r)}
          />
        ))
      )}

      <SheetAddButton
        label="Nuevo recurrente"
        onPress={handleOpenCreate}
        style={{ marginTop: 4 }}
      />

      <NuevoRecurrenteModal visible={showNuevo} onClose={() => setShowNuevo(false)} />
      <NuevoRecurrenteModal
        visible={!!editTarget}
        editTarget={editTarget}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar recurrente"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) {
            cancelRecurringReminder(deleteDialog.id);
            removeRecurring(deleteDialog.id);
            useRecurringQueueStore.getState().recompute();
          }
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />
    </>
  );
}
