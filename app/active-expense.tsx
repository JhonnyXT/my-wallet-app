import { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Modal, TouchableWithoutFeedback,
  LayoutAnimation, Platform, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, Check, Plus, ChevronDown, Edit3 } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useExpenseStore, DateOption, RecurrenceType, AccountType } from "@/src/store/useExpenseStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { processVoiceInput } from "@/src/utils/voiceParser";

// ─── Colores ──────────────────────────────────────────────────────────────────
const BLUE      = "#135BEC";
const RED       = "#EF4444";
const GREEN     = "#22C55E";
const BG        = "#F8FAFC";
const WHITE     = "#FFFFFF";
const BORDER    = "#E2E8F0";
const SLATE_900 = "#0F172A";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";

// ─── Opciones ─────────────────────────────────────────────────────────────────
const DATE_OPTIONS: { key: DateOption; label: string }[] = [
  { key: "today",              label: "Hoy" },
  { key: "yesterday",          label: "Ayer" },
  { key: "daybeforeyesterday", label: "Anteayer" },
  { key: "custom",             label: "Calendario" },
];
const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string }[] = [
  { key: "once",     label: "Una vez" },
  { key: "weekly",   label: "Semanal" },
  { key: "biweekly", label: "Quincenal" },
  { key: "monthly",  label: "Mensual" },
  { key: "yearly",   label: "Anual" },
];
const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "🍔", label: "Comida" },
  { key: "🚗", label: "Transporte" },
  { key: "🏠", label: "Hogar" },
  { key: "🛍️", label: "Compras" },
  { key: "💊", label: "Salud" },
  { key: "🎮", label: "Entretenimiento" },
  { key: "🎓", label: "Educación" },
  { key: "👤", label: "Personal" },
  { key: "💰", label: "General" },
];
const ACCOUNT_OPTIONS: { key: AccountType; label: string }[] = [
  { key: "cash",    label: "Efectivo" },
  { key: "savings", label: "Ahorros" },
  { key: "credit",  label: "Tarjeta" },
];
const SUGGESTED_TAGS = ["#viaje", "#trabajo", "#comida", "#salud", "#ocio"];

// ─── Bottom-sheet selector ────────────────────────────────────────────────────
function SelectorSheet({
  visible, title, options, selected, accent, onSelect, onClose,
}: {
  visible: boolean; title: string; options: { key: string; label: string }[];
  selected: string; accent: string;
  onSelect: (k: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheet.backdrop} />
      </TouchableWithoutFeedback>
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{title}</Text>
        {options.map((opt, i) => (
          <View key={opt.key}>
            <TouchableOpacity
              activeOpacity={0.6}
              onPress={() => { onSelect(opt.key); onClose(); }}
              style={sheet.option}
            >
              <Text style={[sheet.optionText, opt.key === selected && { color: accent, fontWeight: "700" }]}>
                {opt.label}
              </Text>
              {opt.key === selected && <Check size={16} color={accent} strokeWidth={2.5} />}
            </TouchableOpacity>
            {i < options.length - 1 && <View style={sheet.sep} />}
          </View>
        ))}
      </View>
    </Modal>
  );
}

// ─── Selector pill ────────────────────────────────────────────────────────────
// TouchableOpacity soporta flexDirection row en Android sin bugs
function SelPill({
  label, emoji, onPress,
}: { label: string; emoji?: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={s.selPill}
    >
      {emoji ? <Text style={s.selEmoji}>{emoji}</Text> : null}
      <Text style={s.selLabel} numberOfLines={1}>{label}</Text>
      <ChevronDown size={12} color={SLATE_400} strokeWidth={2.5} />
    </TouchableOpacity>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCOP(n: number) {
  return `$ ${Math.round(n).toLocaleString("es-ES")}`;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function ActiveExpenseScreen() {
  const insets = useSafeAreaInsets();
  const store  = useExpenseStore();
  const addTx  = useFinanceStore((s) => s.addTransaction);

  const [tagInput,    setTagInput]    = useState("");
  const [activeSheet, setActiveSheet] = useState<
    "date" | "recurrence" | "category" | "account" | null
  >(null);
  const noteRef = useRef<TextInput>(null);

  const isExpense  = store.isExpense;
  const accent     = isExpense ? RED   : GREEN;
  const accentBg   = isExpense ? "#FEF2F2" : "#F0FDF4";
  const accentText = isExpense ? "#B91C1C" : "#15803D";
  const title      = isExpense ? "Nuevo Gasto" : "Nuevo Ingreso";

  // ─── Parser reactivo ─────────────────────────────────────────────────────
  useEffect(() => {
    // Texto vacío → resetear monto y volver a "Gasto" por defecto
    if (!store.note || store.note.trim() === "") {
      store.setAmount(0);
      store.setIsExpense(true);
      return;
    }
    if (store.note.length < 3) return;
    const parsed = processVoiceInput(store.note);

    if (parsed.amount && parsed.amount > 0)
      store.setAmount(parsed.amount);
    if (parsed.date)
      store.setDate(parsed.date);
    if (parsed.categoryEmoji && parsed.categoryName)
      store.setCategory(parsed.categoryEmoji, parsed.categoryName);
    if (parsed.isExpense !== undefined)
      store.setIsExpense(parsed.isExpense);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.note]);

  async function handleToggle(toExpense: boolean) {
    if (store.isExpense === toExpense) return;
    store.toggleExpense();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleConfirm() {
    if (store.amount <= 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTx(
      isExpense ? store.amount : -store.amount,
      store.note || store.rawTranscript || (isExpense ? "Gasto" : "Ingreso"),
      store.categoryEmoji,
    );
    store.reset();
    router.dismissAll();
  }

  function handleClose() { store.reset(); router.dismissAll(); }

  function handleAddTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (t) { store.addTag(`#${t}`); setTagInput(""); }
  }

  const dateLabel    = DATE_OPTIONS.find((o) => o.key === store.date)?.label ?? "Hoy";
  const recLabel     = RECURRENCE_OPTIONS.find((o) => o.key === store.recurrence)?.label ?? "Una vez";
  const catLabel     = CATEGORY_OPTIONS.find((o) => o.key === store.categoryEmoji)?.label ?? store.categoryName;
  const accountLabel = ACCOUNT_OPTIONS.find((o) => o.key === store.account)?.label ?? "Efectivo";
  const displayTags  = store.tags.length > 0 ? store.tags : SUGGESTED_TAGS;
  const displayAmt   = store.amount > 0
    ? `${isExpense ? "−" : "+"} ${fmtCOP(store.amount)}`
    : "$ 0";

  return (
    <KeyboardAvoidingView style={s.screen} behavior={Platform.OS === "ios" ? "padding" : "height"}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleClose} hitSlop={12} style={s.headerSideBtn}>
          <X size={20} color={SLATE_500} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={s.headerTitle}>{title}</Text>

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={store.amount <= 0}
          style={[s.confirmBtn, store.amount <= 0 && s.confirmBtnOff]}
        >
          <Check size={18} color={WHITE} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ── CONTENIDO ─────────────────────────────────────────────────────── */}
      <View style={s.content}>

        {/* Monto */}
        <View style={s.amountBlock}>
          <Text style={[s.amountText, { color: accent }]}>{displayAmt}</Text>

          {/* Toggle Gasto / Ingreso */}
          <View style={s.toggleRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggle(true)}
              style={[s.toggleBtn, isExpense
                ? { backgroundColor: RED, borderColor: RED }
                : { backgroundColor: WHITE, borderColor: BORDER }]}
            >
              <Text style={[s.toggleLabel, { color: isExpense ? WHITE : SLATE_500 }]}>
                − Gasto
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleToggle(false)}
              style={[s.toggleBtn, !isExpense
                ? { backgroundColor: GREEN, borderColor: GREEN }
                : { backgroundColor: WHITE, borderColor: BORDER }]}
            >
              <Text style={[s.toggleLabel, { color: !isExpense ? WHITE : SLATE_500 }]}>
                + Ingreso
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selector pills 2×2 */}
        <View style={s.selGrid}>
          <View style={s.selRow}>
            <SelPill label={dateLabel}    onPress={() => setActiveSheet("date")} />
            <SelPill label={recLabel}     onPress={() => setActiveSheet("recurrence")} />
          </View>
          <View style={s.selRow}>
            <SelPill label={catLabel}     onPress={() => setActiveSheet("category")} />
            <SelPill label={accountLabel} onPress={() => setActiveSheet("account")} />
          </View>
        </View>

        {/* Transcripción */}
        <View style={s.transcriptBox}>
          <TextInput
            ref={noteRef}
            value={store.note || store.rawTranscript}
            onChangeText={store.setNote}
            multiline
            style={s.transcriptInput}
            placeholderTextColor={SLATE_400}
            placeholder="Describe tu gasto o ingreso aquí..."
            textAlignVertical="top"
          />
          {/* Lápiz edición — posición absoluta esquina inferior derecha */}
          <TouchableOpacity
            onPress={() => noteRef.current?.focus()}
            style={s.editIcon}
            hitSlop={12}
          >
            <Edit3 size={16} color="#CBD5E1" strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

      </View>

      {/* ── TAGS ──────────────────────────────────────────────────────────── */}
      <View style={[s.tagsBar, { paddingBottom: insets.bottom + 6 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tagsRow}>
          {displayTags.map((tag) => {
            const on = store.tags.includes(tag);
            return (
              <TouchableOpacity
                key={tag}
                activeOpacity={0.7}
                onPress={() => on ? store.removeTag(tag) : store.addTag(tag)}
                style={[s.tagPill,
                  on ? { backgroundColor: accentBg, borderColor: accent }
                     : { backgroundColor: WHITE, borderColor: BORDER }]}
              >
                <Text style={[s.tagText, { color: on ? accentText : SLATE_500 }]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={s.tagInput}>
            <Plus size={11} color={SLATE_400} strokeWidth={2} />
            <TextInput
              value={tagInput} onChangeText={setTagInput}
              onSubmitEditing={handleAddTag}
              placeholder="tag" placeholderTextColor={SLATE_400}
              style={s.tagInputText} returnKeyType="done" autoCapitalize="none"
            />
          </View>
        </ScrollView>
      </View>

      {/* ── BOTTOM SHEETS ─────────────────────────────────────────────────── */}
      <SelectorSheet visible={activeSheet === "date"}       title="Fecha"
        options={DATE_OPTIONS}       selected={store.date}       accent={accent}
        onSelect={(k) => store.setDate(k as DateOption)}
        onClose={() => setActiveSheet(null)} />
      <SelectorSheet visible={activeSheet === "recurrence"} title="Recurrencia"
        options={RECURRENCE_OPTIONS} selected={store.recurrence} accent={accent}
        onSelect={(k) => store.setRecurrence(k as RecurrenceType)}
        onClose={() => setActiveSheet(null)} />
      <SelectorSheet visible={activeSheet === "category"}   title="Categoría"
        options={CATEGORY_OPTIONS}   selected={store.categoryEmoji} accent={accent}
        onSelect={(k) => {
          const c = CATEGORY_OPTIONS.find((x) => x.key === k);
          if (c) store.setCategory(c.key, c.label);
        }}
        onClose={() => setActiveSheet(null)} />
      <SelectorSheet visible={activeSheet === "account"}    title="Cuenta"
        options={ACCOUNT_OPTIONS}    selected={store.account}    accent={accent}
        onSelect={(k) => store.setAccount(k as AccountType)}
        onClose={() => setActiveSheet(null)} />

    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, paddingBottom: 14,
    backgroundColor: WHITE, borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  headerSideBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", color: SLATE_900, letterSpacing: -0.4 },
  confirmBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: BLUE,
    alignItems: "center", justifyContent: "center",
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmBtnOff: { backgroundColor: "#CBD5E1", shadowOpacity: 0, elevation: 0 },

  // Contenido
  content: { flex: 1, paddingHorizontal: 24, backgroundColor: BG },

  // Monto + toggle
  amountBlock: { alignItems: "center", paddingTop: 24, paddingBottom: 24 },
  amountText: { fontSize: 64, fontWeight: "800", letterSpacing: -2, lineHeight: 72, marginBottom: 16 },
  toggleRow: { flexDirection: "row", gap: 10 },
  toggleBtn: {
    paddingVertical: 10, paddingHorizontal: 22,
    borderRadius: 9999, borderWidth: 1.5,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600" },

  // Selector pills — TouchableOpacity acepta flexDirection row en Android
  selGrid: { marginBottom: 20, gap: 10 },
  selRow:  { flexDirection: "row", gap: 10 },
  selPill: {
    flex: 1,
    flexDirection: "row",       // directo en TouchableOpacity, funciona en Android ✓
    alignItems: "center",
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: WHITE,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 6,
    // SIN overflow:hidden — esa propiedad recorta el contenido en Android
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  selEmoji: { fontSize: 15 },
  selLabel: { flex: 1, fontSize: 14, fontWeight: "500", color: "#475569" },

  // Transcripción — flex:1 llena exactamente el espacio restante
  transcriptBox: {
    flex: 1,                 // ocupa todo el espacio entre selectores y tags
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: BORDER,
    backgroundColor: WHITE,
    marginBottom: 4,
    position: "relative",
  },
  transcriptInput: {
    flex: 1,
    padding: 20,
    paddingBottom: 36,       // espacio para el lápiz
    fontSize: 17,
    fontWeight: "400",
    color: SLATE_900,
    lineHeight: 26,
    backgroundColor: "transparent",
    textAlignVertical: "top",
  },
  editIcon: {
    position: "absolute",
    right: 14,
    bottom: 12,
  },

  // Tags
  tagsBar: {
    backgroundColor: "rgba(241,245,249,0.98)",
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER,
    paddingTop: 10,
  },
  tagsRow: { paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8 },
  tagPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: "500" },
  tagInput: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 7, paddingHorizontal: 12,
    backgroundColor: WHITE, borderRadius: 9999, borderWidth: 1,
    borderColor: BORDER, borderStyle: "dashed",
  },
  tagInputText: { fontSize: 12, color: SLATE_900, minWidth: 36, maxWidth: 80, padding: 0 },
});

// ─── Sheet ────────────────────────────────────────────────────────────────────
const sheet = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.4)" },
  container: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 36, paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 24,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0",
    alignSelf: "center", marginBottom: 16,
  },
  title: { fontSize: 16, fontWeight: "700", color: SLATE_900, paddingHorizontal: 20, marginBottom: 4 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 20 },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 15, paddingHorizontal: 20,
  },
  optionText: { fontSize: 15, color: SLATE_900 },
});
