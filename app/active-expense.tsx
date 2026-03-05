/**
 * Active Expense Input State — layout fiel al diseño Stitch.
 *
 * Estructura (sin scroll):
 *  ┌─────────────────────────────────────┐  ← insets.top
 *  │         $ 25.000  [− Gasto][+ Ing]  │  ← monto + toggle
 *  │  [📅 Ayer ∨]  [🔄 Una vez ∨]       │  ← selector row 1
 *  │  [🚗 Transp ∨]  [💵 Efectivo ∨]    │  ← selector row 2
 *  │  [🚗 Categoría · Transp] [Monto]    │  ← data pills row 1
 *  │  [Nota · Airport shuttle ...]       │  ← data pill row 2
 *  │  ╔ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╗   │
 *  │  ║  texto transcripción (flex:1)║   │  ← transcripción
 *  │  ╚ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ╝   │
 *  ├─────────────────────────────────────┤
 *  │  [X]      Nuevo Gasto       [✓]    │  ← header-bar (bottom)
 *  │  #travel  #work  #food  [+tag]     │  ← tags
 *  └─────────────────────────────────────┘  ← insets.bottom
 */
import { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, TextInput, ScrollView,
  StyleSheet, Modal, TouchableWithoutFeedback,
  LayoutAnimation, Platform, UIManager, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { X, Check, ChevronDown, Plus, Edit3 } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import {
  useExpenseStore, DateOption, RecurrenceType, AccountType,
} from "@/src/store/useExpenseStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { processVoiceInput } from "@/src/utils/voiceParser";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Paleta ───────────────────────────────────────────────────────────────────
const BG        = "#F8FAFC";
const WHITE     = "#FFFFFF";
const BORDER    = "#F1F5F9";
const BORDER2   = "#E2E8F0";
const BLUE      = "#135BEC";
const RED       = "#EF4444";
const GREEN     = "#22C55E";
const SLATE_900 = "#0F172A";
const SLATE_600 = "#475569";
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
const CATEGORY_OPTIONS: { key: string; label: string; emoji: string }[] = [
  { key: "🍔", label: "Comida",          emoji: "🍔" },
  { key: "🚗", label: "Transporte",      emoji: "🚗" },
  { key: "🏠", label: "Hogar",           emoji: "🏠" },
  { key: "🛍️", label: "Compras",         emoji: "🛍️" },
  { key: "💊", label: "Salud",           emoji: "💊" },
  { key: "🎮", label: "Entretenimiento", emoji: "🎮" },
  { key: "🎓", label: "Educación",       emoji: "🎓" },
  { key: "👤", label: "Personal",        emoji: "👤" },
  { key: "💰", label: "General",         emoji: "💰" },
];
const ACCOUNT_OPTIONS: { key: AccountType; label: string; emoji: string }[] = [
  { key: "cash",    label: "Efectivo",  emoji: "💵" },
  { key: "savings", label: "Ahorros",   emoji: "🏦" },
  { key: "credit",  label: "Tarjeta",   emoji: "💳" },
];
const SUGGESTED_TAGS = ["#viaje", "#trabajo", "#comida", "#salud", "#ocio"];

// ─── Bottom-sheet selector ────────────────────────────────────────────────────
interface SheetOption { key: string; label: string; emoji?: string }
function SelectorSheet({
  visible, title, options, selected, onSelect, onClose,
}: {
  visible: boolean; title: string; options: SheetOption[];
  selected: string; onSelect: (k: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheet.backdrop} />
      </TouchableWithoutFeedback>
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <Text style={sheet.title}>{title}</Text>
        {options.map((opt) => (
          <Pressable
            key={opt.key}
            onPress={() => { onSelect(opt.key); onClose(); }}
            style={({ pressed }) => [sheet.option, pressed && sheet.optionPressed]}
          >
            {opt.emoji ? <Text style={sheet.optionEmoji}>{opt.emoji}</Text> : null}
            <Text style={[sheet.optionText, opt.key === selected && sheet.optionTextActive]}>
              {opt.label}
            </Text>
            {opt.key === selected && <Check size={16} color={BLUE} strokeWidth={2.5} />}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

// ─── Selector pill (estilo Stitch: pequeño, 34px) ─────────────────────────────
function SelectorPill({
  emoji, label, onPress,
}: { emoji: string; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.selPill, pressed && { opacity: 0.7 }]}
    >
      <Text style={styles.selPillEmoji}>{emoji}</Text>
      <Text style={styles.selPillLabel} numberOfLines={1}>{label}</Text>
      <ChevronDown size={10} color={SLATE_400} strokeWidth={2.5} />
    </Pressable>
  );
}

// ─── Data pill ────────────────────────────────────────────────────────────────
function DataPill({
  prefix, label, value, accent, flex,
}: { prefix?: string; label: string; value: string; accent?: boolean; flex?: boolean }) {
  return (
    <View style={[styles.dataPill, flex && { flex: 1 }]}>
      {prefix ? <Text style={styles.dataPillPrefix}>{prefix}</Text> : null}
      <Text style={styles.dataPillLabel}>{label}</Text>
      <Text
        style={[styles.dataPillValue, accent && { color: RED, fontWeight: "700" }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtCOP(n: number) {
  return n > 0 ? `$ ${Math.round(n).toLocaleString("es-ES")}` : "$ 0";
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function ActiveExpenseScreen() {
  const insets = useSafeAreaInsets();
  const store = useExpenseStore();
  const addTransaction = useFinanceStore((s) => s.addTransaction);

  const [tagInput, setTagInput] = useState("");
  const [activeSheet, setActiveSheet] = useState<
    "date" | "recurrence" | "category" | "account" | null
  >(null);
  const noteRef = useRef<TextInput>(null);

  // ─── Parser reactivo ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!store.note || store.note.length < 3) return;
    const parsed = processVoiceInput(store.note);
    LayoutAnimation.configureNext({ duration: 200, update: { type: "easeInEaseOut" } });
    if (parsed.amount && parsed.amount > 0) store.setAmount(parsed.amount);
    if (parsed.date) store.setDate(parsed.date);
    if (parsed.categoryEmoji && parsed.categoryName)
      store.setCategory(parsed.categoryEmoji, parsed.categoryName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.note]);

  // ─── Toggle gasto/ingreso ────────────────────────────────────────────────
  function handleToggle() {
    LayoutAnimation.configureNext({ duration: 220, update: { type: "easeInEaseOut" } });
    store.toggleExpense();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ─── Confirmar ───────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (store.amount <= 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTransaction(
      store.amount,
      store.note || store.rawTranscript || "Gasto",
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

  // ─── Labels ──────────────────────────────────────────────────────────────
  const dateLabel    = DATE_OPTIONS.find((o) => o.key === store.date)?.label ?? "Hoy";
  const recLabel     = RECURRENCE_OPTIONS.find((o) => o.key === store.recurrence)?.label ?? "Una vez";
  const accountLabel = ACCOUNT_OPTIONS.find((o) => o.key === store.account)?.label ?? "Efectivo";
  const accountEmoji = ACCOUNT_OPTIONS.find((o) => o.key === store.account)?.emoji ?? "💵";
  const amountColor  = store.isExpense ? RED : GREEN;
  const displayAmt   = store.amount > 0
    ? `${store.isExpense ? "−" : "+"} ${fmtCOP(store.amount)}`
    : "$ 0";
  const displayTags  = store.tags.length > 0 ? store.tags : SUGGESTED_TAGS;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ════════ HEADER (arriba, como en Stitch) ════════ */}
      <View style={[styles.footerHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleClose} style={styles.footerCloseBtn} hitSlop={8}>
          <X size={18} color={SLATE_600} strokeWidth={2} />
        </Pressable>
        <Text style={styles.footerTitle}>Nuevo Gasto</Text>
        <Pressable
          onPress={handleConfirm}
          style={[styles.confirmBtn, store.amount <= 0 && styles.confirmBtnDisabled]}
          disabled={store.amount <= 0}
        >
          <Check size={18} color={WHITE} strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* ════════ ÁREA DE CONTENIDO (sin scroll) ════════ */}
      <View style={[styles.content, { paddingTop: 8 }]}>

        {/* ── Monto + toggle ─────────────────────────── */}
        <View style={styles.amountSection}>
          <Text style={[styles.amountText, { color: amountColor }]}>{displayAmt}</Text>
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => !store.isExpense && handleToggle()}
              style={[styles.toggleBtn, store.isExpense && styles.toggleActive(RED)]}
            >
              <Text style={[styles.toggleLabel, store.isExpense && styles.toggleLabelActive]}>
                − Gasto
              </Text>
            </Pressable>
            <Pressable
              onPress={() => store.isExpense && handleToggle()}
              style={[styles.toggleBtn, !store.isExpense && styles.toggleActive(GREEN)]}
            >
              <Text style={[styles.toggleLabel, !store.isExpense && styles.toggleLabelActive]}>
                + Ingreso
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ── Selector pills 2x2 ─────────────────────── */}
        <View style={styles.selectorWrapper}>
          <View style={styles.selRow}>
            <SelectorPill emoji="📅"                label={dateLabel}        onPress={() => setActiveSheet("date")} />
            <SelectorPill emoji="🔄"                label={recLabel}         onPress={() => setActiveSheet("recurrence")} />
          </View>
          <View style={styles.selRow}>
            <SelectorPill emoji={store.categoryEmoji} label={store.categoryName} onPress={() => setActiveSheet("category")} />
            <SelectorPill emoji={accountEmoji}       label={accountLabel}     onPress={() => setActiveSheet("account")} />
          </View>
        </View>

        {/* ── Data pills ─────────────────────────────── */}
        <View style={styles.dataPillsWrapper}>
          <View style={styles.dataPillsRow}>
            <DataPill prefix={store.categoryEmoji} label="Categoría" value={store.categoryName} flex />
            <DataPill label="Monto" value={store.amount > 0 ? fmtCOP(store.amount) : "—"} accent />
          </View>
          <DataPill label="Nota" value={store.note || store.rawTranscript || "—"} />
        </View>

        {/* ── Transcripción (flex: 1) ─────────────────── */}
        <View style={styles.transcriptWrapper}>
          {/* Dashed border overlay */}
          <View style={styles.transcriptBorder} pointerEvents="none" />
          <TextInput
            ref={noteRef}
            value={store.note || store.rawTranscript}
            onChangeText={store.setNote}
            multiline
            style={styles.transcriptInput}
            placeholderTextColor={SLATE_400}
            placeholder="Describe tu gasto aquí..."
            textAlignVertical="top"
          />
          <Pressable style={styles.editIcon} onPress={() => noteRef.current?.focus()}>
            <Edit3 size={15} color={SLATE_400} strokeWidth={1.5} />
          </Pressable>
        </View>

      </View>

      {/* ════════ FOOTER (tags en la parte inferior) ════════ */}
      <View style={styles.footer}>

        {/* Tags */}
        <View style={[styles.tagsBar, { paddingBottom: insets.bottom + 6 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContent}
          >
            {displayTags.map((tag) => (
              <Pressable
                key={tag}
                onPress={() =>
                  store.tags.includes(tag) ? store.removeTag(tag) : store.addTag(tag)
                }
                style={[styles.tagPill, store.tags.includes(tag) && styles.tagPillActive]}
              >
                <Text style={[styles.tagText, store.tags.includes(tag) && styles.tagTextActive]}>
                  {tag}
                </Text>
              </Pressable>
            ))}
            <View style={styles.tagInputPill}>
              <Plus size={11} color={SLATE_400} strokeWidth={2} />
              <TextInput
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                placeholder="tag"
                placeholderTextColor={SLATE_400}
                style={styles.tagInputText}
                returnKeyType="done"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </View>

      </View>

      {/* ════════ BOTTOM SHEETS ════════ */}
      <SelectorSheet
        visible={activeSheet === "date"} title="Fecha"
        options={DATE_OPTIONS} selected={store.date}
        onSelect={(k) => store.setDate(k as DateOption)}
        onClose={() => setActiveSheet(null)}
      />
      <SelectorSheet
        visible={activeSheet === "recurrence"} title="Recurrencia"
        options={RECURRENCE_OPTIONS} selected={store.recurrence}
        onSelect={(k) => store.setRecurrence(k as RecurrenceType)}
        onClose={() => setActiveSheet(null)}
      />
      <SelectorSheet
        visible={activeSheet === "category"} title="Categoría"
        options={CATEGORY_OPTIONS} selected={store.categoryEmoji}
        onSelect={(k) => {
          const cat = CATEGORY_OPTIONS.find((c) => c.key === k);
          if (cat) store.setCategory(cat.emoji, cat.label);
        }}
        onClose={() => setActiveSheet(null)}
      />
      <SelectorSheet
        visible={activeSheet === "account"} title="Cuenta"
        options={ACCOUNT_OPTIONS} selected={store.account}
        onSelect={(k) => store.setAccount(k as AccountType)}
        onClose={() => setActiveSheet(null)}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  // Área de contenido (sin scroll)
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Monto
  amountSection: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 20,
  },
  amountText: {
    fontSize: 60,
    fontWeight: "700",
    letterSpacing: -1.5,
    lineHeight: 66,
    textAlign: "center",
    marginBottom: 12,
  },
  toggleRow: { flexDirection: "row", gap: 8 },
  toggleBtn: {
    paddingVertical: 5, paddingHorizontal: 16,
    borderRadius: 9999, borderWidth: 1.5, borderColor: BORDER2,
    backgroundColor: WHITE,
  },
  toggleActive: (color: string) => ({
    backgroundColor: color, borderColor: color,
  }),
  toggleLabel: { fontSize: 12, fontWeight: "600", color: SLATE_600 },
  toggleLabelActive: { color: WHITE },

  // Selectores
  selectorWrapper: { marginBottom: 28 },
  selRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  selPill: {
    flex: 1, height: 34,
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12,
    backgroundColor: WHITE,
    borderRadius: 9999, borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 2,
  },
  selPillEmoji: { fontSize: 13 },
  selPillLabel: {
    flex: 1, fontSize: 12, fontWeight: "600", color: SLATE_900,
  },

  // Data pills
  dataPillsWrapper: { marginBottom: 16 },
  dataPillsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  dataPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: WHITE, borderRadius: 9999,
    borderWidth: 1, borderColor: BORDER,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 20, elevation: 1,
    alignSelf: "flex-start",
  },
  dataPillPrefix: { fontSize: 12 },
  dataPillLabel: {
    fontSize: 12, fontWeight: "600", color: SLATE_600, letterSpacing: -0.3,
  },
  dataPillValue: {
    fontSize: 12, fontWeight: "500", color: SLATE_900,
    flexShrink: 1, maxWidth: 140,
  },

  // Transcripción
  transcriptWrapper: {
    flex: 1,
    marginBottom: 8,
    minHeight: 120,
  },
  transcriptBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: BORDER2,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  transcriptInput: {
    flex: 1,
    padding: 20,
    fontSize: 18,
    fontWeight: "500",
    color: "#1E293B",
    lineHeight: 30,
    textAlignVertical: "top",
    backgroundColor: "transparent",
  },
  editIcon: { position: "absolute", right: 14, bottom: 14 },

  // Footer (abajo)
  footer: {
    backgroundColor: BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(226,232,240,0.5)",
  },
  footerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 14,
    paddingHorizontal: 24,
  },
  footerCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
  },
  footerTitle: {
    fontSize: 18, fontWeight: "700",
    color: SLATE_900, letterSpacing: -0.45,
  },
  confirmBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: BLUE, alignItems: "center", justifyContent: "center",
    shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  confirmBtnDisabled: { backgroundColor: "#CBD5E1", shadowOpacity: 0, elevation: 0 },

  // Tags
  tagsBar: {
    backgroundColor: "rgba(241,245,249,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(226,232,240,0.5)",
    paddingTop: 10,
  },
  tagsContent: {
    paddingLeft: 16, paddingRight: 16, gap: 8,
    flexDirection: "row", alignItems: "center",
  },
  tagPill: {
    paddingVertical: 6, paddingHorizontal: 16,
    backgroundColor: WHITE, borderRadius: 9999,
    borderWidth: 1, borderColor: BORDER2,
  },
  tagPillActive: { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" },
  tagText: { fontSize: 12, fontWeight: "500", color: SLATE_600 },
  tagTextActive: { color: BLUE, fontWeight: "600" },
  tagInputPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: WHITE, borderRadius: 9999,
    borderWidth: 1, borderColor: BORDER2, borderStyle: "dashed",
  },
  tagInputText: {
    fontSize: 12, color: SLATE_900, minWidth: 36, maxWidth: 80, padding: 0,
  },
});

// ─── Bottom-sheet estilos ─────────────────────────────────────────────────────
const sheet = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.35)",
  },
  container: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, paddingTop: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 16,
  },
  title: {
    fontSize: 16, fontWeight: "700", color: SLATE_900,
    paddingHorizontal: 20, marginBottom: 8, letterSpacing: -0.3,
  },
  option: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
  },
  optionPressed: { backgroundColor: "#F8FAFC" },
  optionEmoji: { fontSize: 20, width: 28 },
  optionText: { flex: 1, fontSize: 15, fontWeight: "400", color: SLATE_900 },
  optionTextActive: { fontWeight: "700", color: BLUE },
});
