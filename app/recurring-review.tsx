/**
 * recurring-review.tsx — cola de confirmación cuando hay 2+ ocurrencias de recurrentes vencidas
 * sin confirmar (RF-009/RF-014). Mismo patrón visual que `notification-review.tsx`, pero sin
 * "Guardar todo": cada fila se confirma u omite por separado, porque cada una puede pertenecer a
 * un recurrente distinto (lista, categoría, cuenta propias — RF-012) y un recurrente de monto
 * variable exige pasar por el formulario, no un guardado en lote.
 */
import { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { ChevronLeft, Check, Pencil, X, CalendarClock } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useRecurringQueueStore } from "@/src/store/useRecurringQueueStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useTheme } from "@/src/context/ThemeContext";
import { formatMoneyDisplay } from "@/src/utils/formatMoney";
import { PressableScale } from "@/src/components/ui/PressableScale";
import type { RecurringOccurrence } from "@/src/utils/recurring";

const ACCENT = "#135BEC";

function dueLabel(date: Date): string {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function RecurringRow({
  occurrence,
  onConfirm,
  onEditAndConfirm,
  onSkip,
}: {
  occurrence: RecurringOccurrence;
  onConfirm: (o: RecurringOccurrence) => void;
  onEditAndConfirm: (o: RecurringOccurrence) => void;
  onSkip: (o: RecurringOccurrence) => void;
}) {
  const theme = useTheme();
  const { recurring, dueDate } = occurrence;

  return (
    <View style={[cardS.card, { backgroundColor: theme.surface }]}>
      <View style={[cardS.catBox, { backgroundColor: theme.inputBg }]}>
        <Text style={{ fontSize: 22 }}>{recurring.emoji}</Text>
      </View>

      <View style={cardS.textCol}>
        <Text style={[cardS.desc, { color: theme.text }]} numberOfLines={1}>
          {recurring.name}
        </Text>
        <View style={cardS.metaRow}>
          <CalendarClock size={12} color={theme.textSub} />
          <Text style={[cardS.metaText, { color: theme.textSub }]}>
            Venció el {dueLabel(dueDate)}
          </Text>
        </View>
      </View>

      <Text style={[cardS.amount, { color: theme.text }]}>
        {recurring.isExpense ? "−" : "+"} $ {formatMoneyDisplay(recurring.amount)}
      </Text>

      <View style={cardS.actions}>
        {recurring.amountVaries ? (
          <TouchableOpacity
            style={[cardS.actionBtn, { backgroundColor: ACCENT + "1A" }]}
            onPress={() => onEditAndConfirm(occurrence)}
            accessibilityLabel="Editar y confirmar"
            accessibilityRole="button"
          >
            <Pencil size={16} color={ACCENT} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[cardS.actionBtn, { backgroundColor: ACCENT + "1A" }]}
            onPress={() => onConfirm(occurrence)}
            accessibilityLabel="Confirmar"
            accessibilityRole="button"
          >
            <Check size={16} color={ACCENT} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={cardS.actionBtn}
          onPress={() => onSkip(occurrence)}
          accessibilityLabel="Omitir"
          accessibilityRole="button"
        >
          <X size={16} color={theme.textSub} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RecurringReviewScreen() {
  const theme = useTheme();
  const queue = useRecurringQueueStore((s) => s.queue);
  const recompute = useRecurringQueueStore((s) => s.recompute);
  const addTransaction = useFinanceStore((s) => s.addTransaction);
  const markHandled = useSettingsStore((s) => s.markHandled);

  // La cola pudo haberse recalculado mientras la pantalla estaba montada (ej. se creó/pausó un
  // recurrente desde Ajustes en otra pestaña del Stack) — se refresca al volver a foco.
  useFocusEffect(
    useCallback(() => {
      recompute();
    }, [recompute]),
  );

  function handleBack() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }

  const handleConfirm = useCallback(
    async (occurrence: RecurringOccurrence) => {
      const { recurring, dueDate, cycleKey } = occurrence;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addTransaction(
        recurring.isExpense ? recurring.amount : -recurring.amount,
        recurring.name,
        recurring.categoryEmoji,
        [],
        dueDate,
        recurring.paymentMethod,
        recurring.listId,
      );
      markHandled(recurring.id, cycleKey);
      recompute();
    },
    [addTransaction, markHandled, recompute],
  );

  const handleEditAndConfirm = useCallback((occurrence: RecurringOccurrence) => {
    router.push(
      `/active-expense?from=recurring-edit&recId=${occurrence.recurring.id}&cycleKey=${occurrence.cycleKey}`,
    );
  }, []);

  const handleSkip = useCallback(
    (occurrence: RecurringOccurrence) => {
      Haptics.selectionAsync();
      markHandled(occurrence.recurring.id, occurrence.cycleKey);
      recompute();
    },
    [markHandled, recompute],
  );

  const keyFor = (o: RecurringOccurrence) => `${o.recurring.id}:${o.cycleKey}`;

  const headerSub = useMemo(
    () =>
      `${queue.length} ciclo${queue.length !== 1 ? "s" : ""} vencido${queue.length !== 1 ? "s" : ""} sin confirmar`,
    [queue.length],
  );

  if (queue.length === 0) {
    return (
      <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
        <View style={s.header}>
          <PressableScale onPress={handleBack} hitSlop={12}>
            <ChevronLeft size={26} color={ACCENT} />
          </PressableScale>
          <View style={s.headerText}>
            <Text style={[s.headerTitle, { color: theme.text }]}>Recurrentes vencidos</Text>
            <Text style={[s.headerSub, { color: theme.textSub }]}>Todo al día</Text>
          </View>
        </View>
        <View style={s.emptyState}>
          <CalendarClock size={48} color={theme.textSub} />
          <Text style={[s.emptyTitle, { color: theme.text }]}>Sin recurrentes vencidos</Text>
          <Text style={[s.emptyDesc, { color: theme.textSub }]}>
            Cuando un gasto o ingreso recurrente venza, aparece acá para confirmarlo u omitirlo.
          </Text>
          <PressableScale style={[s.emptyBtn, { backgroundColor: ACCENT }]} onPress={handleBack}>
            <Text style={s.emptyBtnText}>Entendido</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]}>
      <View style={s.header}>
        <PressableScale onPress={handleBack} hitSlop={12}>
          <ChevronLeft size={26} color={ACCENT} />
        </PressableScale>
        <View style={s.headerText}>
          <Text style={[s.headerTitle, { color: theme.text }]}>Recurrentes vencidos</Text>
          <Text style={[s.headerSub, { color: theme.textSub }]}>{headerSub}</Text>
        </View>
      </View>

      <FlatList
        data={queue}
        keyExtractor={keyFor}
        renderItem={({ item }) => (
          <RecurringRow
            occurrence={item}
            onConfirm={handleConfirm}
            onEditAndConfirm={handleEditAndConfirm}
            onSkip={handleSkip}
          />
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </SafeAreaView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { fontSize: 13, marginTop: 2 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  emptyDesc: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  emptyBtn: { marginTop: 24, paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

const cardS = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 10,
    gap: 2,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  catBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textCol: { flex: 1 },
  desc: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  amount: { fontSize: 15, fontWeight: "700", marginRight: 8 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
