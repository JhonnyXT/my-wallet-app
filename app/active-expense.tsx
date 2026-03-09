import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, Modal, TouchableWithoutFeedback,
  Platform, KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  X, Check, Plus, Edit3,
  Calendar, UtensilsCrossed, Wallet,
  Car, Home, ShoppingBag, HeartPulse, Gamepad2, GraduationCap, User,
  Banknote, Landmark, CreditCard,
  CalendarCheck, CalendarMinus, CalendarPlus,
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";

import { useExpenseStore, DateOption, AccountType } from "@/src/store/useExpenseStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { processVoiceInput } from "@/src/utils/voiceParser";
import { formatMoneyInput } from "@/src/utils/formatMoney";

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
const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "🍔", label: "Comida" },
  { key: "🚗", label: "Transporte" },
  { key: "🏠", label: "Hogar" },
  { key: "🛍️", label: "Compras" },
  { key: "🏥", label: "Salud" },
  { key: "🎮", label: "Entretenimiento" },
  { key: "🎓", label: "Educación" },
  { key: "👤", label: "Personal" },
];
const ACCOUNT_OPTIONS: { key: AccountType; label: string }[] = [
  { key: "cash",    label: "Efectivo" },
  { key: "savings", label: "Ahorros" },
  { key: "credit",  label: "Tarjeta" },
];
const SUGGESTED_TAGS = ["#viaje", "#trabajo", "#comida", "#salud", "#ocio"];

// ─── Iconos de categoría (lucide) con paleta Stitch ───────────────────────────
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  "🍔": { Icon: UtensilsCrossed, color: "#D2601A", bg: "#FFE8D6" },
  "🚗": { Icon: Car,             color: "#1565C0", bg: "#D6EFFF" },
  "🏠": { Icon: Home,            color: "#D97706", bg: "#FEF3C7" },
  "🛍️": { Icon: ShoppingBag,    color: "#C2185B", bg: "#FEE2E2" },
  "🏥": { Icon: HeartPulse,      color: "#C62828", bg: "#FCE4EC" },
  "🎮": { Icon: Gamepad2,        color: "#6D28D9", bg: "#EDE9FE" },
  "🎓": { Icon: GraduationCap,   color: "#059669", bg: "#D1FAE5" },
  "👤": { Icon: User,            color: "#475569", bg: "#F1F5F9" },
};

// ─── Info extra de cuentas ────────────────────────────────────────────────────
const ACCOUNT_DETAILS: Record<AccountType, { Icon: LucideIcon; desc: string }> = {
  cash:    { Icon: Banknote,    desc: "Dinero disponible" },
  savings: { Icon: Landmark,   desc: "**** 8842" },
  credit:  { Icon: CreditCard, desc: "Visa Platinum" },
};

// ─── Iconos de fecha y recurrencia ────────────────────────────────────────────
const DATE_ICONS: Record<string, LucideIcon> = {
  today:              CalendarCheck,
  yesterday:          Calendar,
  daybeforeyesterday: CalendarMinus,
  custom:             CalendarPlus,
};
// ─── Sheet: lista genérica con icono izquierdo (fecha) ───────────────────────
function ListSheet({
  visible, title, options, selected, accent, iconMap, onSelect, onClose,
}: {
  visible: boolean; title: string;
  options: { key: string; label: string }[];
  selected: string; accent: string;
  iconMap: Record<string, LucideIcon>;
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
        {options.map((opt, i) => {
          const Icon = iconMap[opt.key];
          const isSel = opt.key === selected;
          return (
            <View key={opt.key}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt.key); onClose(); }}
                style={sheet.option}
              >
                <View style={sheet.optionLeft}>
                  <View style={[sheet.optionIconBox, isSel && { backgroundColor: accent + "18" }]}>
                    {Icon && <Icon size={18} color={isSel ? accent : SLATE_500} strokeWidth={1.8} />}
                  </View>
                  <Text style={[sheet.optionText, isSel && { color: accent, fontWeight: "700" }]}>
                    {opt.label}
                  </Text>
                </View>
                {isSel && <Check size={16} color={accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < options.length - 1 && <View style={sheet.sep} />}
            </View>
          );
        })}
      </View>
    </Modal>
  );
}

// ─── Sheet: CATEGORÍA — grid 4×N + botón CONFIRMAR ────────────────────────────
function CategorySheet({
  visible, selected, accent, isExpense, onSelect, onClose,
}: {
  visible: boolean; selected: string; accent: string; isExpense: boolean;
  onSelect: (k: string) => void; onClose: () => void;
}) {
  const [temp, setTemp] = useState(selected);
  useEffect(() => { if (visible) setTemp(selected); }, [visible, selected]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheet.backdrop} />
      </TouchableWithoutFeedback>
      <View style={[sheet.container, catS.container]}>
        <View style={sheet.handle} />
        {/* Header */}
        <View style={catS.header}>
          <View>
            <Text style={catS.title}>CATEGORÍA</Text>
            <Text style={catS.subtitle}>
              {isExpense ? "Elige el tipo de gasto" : "Elige el tipo de ingreso"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={catS.cancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
        {/* Grid 4 columnas */}
        <View style={catS.grid}>
          {CATEGORY_OPTIONS.map((cat) => {
            const info = CATEGORY_ICONS[cat.key];
            const isSel = temp === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={catS.item}
                onPress={() => setTemp(cat.key)}
                activeOpacity={0.7}
              >
                <View style={catS.iconWrap}>
                  <View style={[catS.iconBox, { backgroundColor: info?.bg ?? "#F1F5F9" }]}>
                    {info
                      ? <info.Icon size={24} color={info.color} strokeWidth={1.8} />
                      : <Text style={{ fontSize: 20 }}>{cat.key}</Text>
                    }
                  </View>
                  {isSel && (
                    <View style={catS.checkBadge}>
                      <Check size={10} color={WHITE} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[catS.itemLabel, isSel && catS.itemLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {/* Botón confirmar */}
        <TouchableOpacity
          style={catS.confirmBtn}
          onPress={() => {
            const c = CATEGORY_OPTIONS.find((x) => x.key === temp);
            if (c) onSelect(c.key);
            onClose();
          }}
          activeOpacity={0.85}
        >
          <Text style={catS.confirmText}>CONFIRMAR</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Sheet: CUENTA — lista con icono + descripción + checkmark ────────────────
const PAYMENT_TYPE_ICONS: Record<string, LucideIcon> = {
  cash:    Banknote,
  debit:   CreditCard,
  savings: Landmark,
};

function AccountSheet({
  visible, selected, accent, options, onSelect, onClose,
}: {
  visible: boolean; selected: string; accent: string;
  options: { key: string; label: string; type: string }[];
  onSelect: (k: string) => void; onClose: () => void;
}) {
  const displayOptions = options.length > 0 ? options : ACCOUNT_OPTIONS.map((o) => ({ key: o.key, label: o.label, type: o.key }));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sheet.backdrop} />
      </TouchableWithoutFeedback>
      <View style={sheet.container}>
        <View style={sheet.handle} />
        <Text style={[sheet.title, { marginBottom: 8 }]}>Seleccionar Cuenta</Text>
        {displayOptions.map((opt, i) => {
          const Icon  = PAYMENT_TYPE_ICONS[opt.type] ?? Banknote;
          const isSel = opt.key === selected;
          return (
            <View key={opt.key}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt.key); onClose(); }}
                style={accS.row}
              >
                <View style={[accS.iconBox, isSel && { backgroundColor: accent + "18" }]}>
                  <Icon size={22} color={isSel ? accent : SLATE_500} strokeWidth={1.8} />
                </View>
                <View style={accS.textBlock}>
                  <Text style={[accS.name, isSel && { color: accent, fontWeight: "700" }]}>
                    {opt.label}
                  </Text>
                </View>
                {isSel && <Check size={18} color={accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < displayOptions.length - 1 && <View style={sheet.sep} />}
            </View>
          );
        })}
        {/* Ir a configuración para gestionar métodos */}
        <TouchableOpacity
          style={accS.addRow}
          activeOpacity={0.6}
          onPress={() => { onClose(); router.push("/settings"); }}
        >
          <Plus size={16} color={BLUE} strokeWidth={2} />
          <Text style={accS.addText}>Gestionar métodos de pago</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Selector icon-button: círculo + tipo (gris) + valor (negro bold) ────────
function SelIconBtn({
  icon, fieldName, value, onPress,
}: {
  icon: React.ReactNode;
  fieldName: string;   // p.ej. "FECHA"
  value: string;       // p.ej. "Hoy"
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={s.selIconBtn}>
      <View style={s.selIconCircle}>{icon}</View>
      <Text style={s.selFieldName}>{fieldName}</Text>
      <Text style={s.selValue} numberOfLines={1}>{value}</Text>
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

  // Métodos de pago dinámicos desde settings
  const paymentMethods = useSettingsStore((s) => s.paymentMethods);

  const [tagInput,      setTagInput]      = useState("");
  const [activeSheet,   setActiveSheet]   = useState<
    "date" | "category" | "account" | null
  >(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amountEditing, setAmountEditing] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");
  const amountInputRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const isExpense  = store.isExpense;
  const accent     = isExpense ? RED   : GREEN;
  const accentBg   = isExpense ? "#FEF2F2" : "#F0FDF4";
  const accentText = isExpense ? "#B91C1C" : "#15803D";
  const title      = isExpense ? "Nuevo Gasto" : "Nuevo Ingreso";

  // ─── Parser reactivo: actualiza selectores en tiempo real ───────────────
  useEffect(() => {
    const text = store.note?.trim() ?? "";

    // Texto vacío → solo resetear el monto (NO tocar isExpense ni categoría)
    if (!text) {
      store.setAmount(0);
      return;
    }
    if (text.length < 2) return;

    const parsed = processVoiceInput(text);

    // Monto: actualizar siempre que haya un número detectado
    if (parsed.amount && parsed.amount > 0)
      store.setAmount(parsed.amount);

    // Fecha: solo si se mencionó explícitamente (ayer, hoy, anteayer)
    if (parsed._dateDetected && parsed.date)
      store.setDate(parsed.date);

    // Categoría: solo si se reconoció una categoría estándar
    if (parsed._categoryDetected && parsed.categoryEmoji && parsed.categoryName)
      store.setCategory(parsed.categoryEmoji, parsed.categoryName);

    // Tipo ingreso/gasto: solo si hay palabras clave explícitas
    // (no se cambia si el usuario abrió la pantalla como ingreso)
    if (parsed.isExpense !== undefined)
      store.setIsExpense(parsed.isExpense);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.note]);

  function handleAmountTap() {
    const current = store.amount > 0 ? String(Math.round(store.amount)) : "";
    setAmountDisplay(formatMoneyInput(current));
    setAmountEditing(true);
    setTimeout(() => amountInputRef.current?.focus(), 50);
  }

  function handleAmountChange(text: string) {
    const digits = text.replace(/\D/g, "");
    setAmountDisplay(formatMoneyInput(digits));
  }

  function handleAmountBlur() {
    const digits = amountDisplay.replace(/\D/g, "");
    const parsed = parseFloat(digits) || 0;
    store.setAmount(parsed);
    setAmountEditing(false);
  }

  async function handleConfirm() {
    if (store.amount <= 0) return;
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addTx(
      isExpense ? store.amount : -store.amount,
      store.note || store.rawTranscript || (isExpense ? "Gasto" : "Ingreso"),
      store.categoryEmoji,
      store.tags,
    );
    store.reset();
    router.dismissAll();
  }

  function handleClose() { store.reset(); router.dismissAll(); }

  function handleAddTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (t) { store.addTag(`#${t}`); setTagInput(""); }
  }

  const dateLabel = store.date === "custom" && store.customDate
    ? store.customDate.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
    : DATE_OPTIONS.find((o) => o.key === store.date)?.label ?? "Hoy";
  const catLabel     = CATEGORY_OPTIONS.find((o) => o.key === store.categoryEmoji)?.label ?? store.categoryName;
  const accountLabel = paymentMethods.find((m) => m.id === store.account)?.name
    ?? ACCOUNT_OPTIONS.find((o) => o.key === store.account)?.label
    ?? "Efectivo";
  const displayTags  = store.tags.length > 0 ? store.tags : SUGGESTED_TAGS;
  const displayAmt = store.amount > 0
    ? `${isExpense ? "−" : "+"} ${fmtCOP(store.amount)}`
    : `${isExpense ? "−" : "+"} $ 0`;

  const noteplaceholder = isExpense
    ? "Describe tu gasto aquí... ej: taxi 8500 ayer"
    : "Describe tu ingreso aquí... ej: freelance 200 mil hoy";

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
      <ScrollView
        style={s.content}
        contentContainerStyle={s.contentInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Monto */}
        <View style={s.amountBlock}>
          {amountEditing ? (
            <View style={s.amountEditRow}>
              <Text style={[s.amountSignText, { color: accent }]}>
                {isExpense ? "−" : "+"} $
              </Text>
              <TextInput
                ref={amountInputRef}
                value={amountDisplay}
                onChangeText={handleAmountChange}
                onBlur={handleAmountBlur}
                onSubmitEditing={handleAmountBlur}
                keyboardType="number-pad"
                style={[s.amountInput, { color: accent }]}
                returnKeyType="done"
                placeholder="0"
                placeholderTextColor={accent + "55"}
                selectTextOnFocus
              />
            </View>
          ) : (
            <TouchableOpacity onPress={handleAmountTap} activeOpacity={0.7}>
              <Text style={[s.amountText, { color: accent }]}>{displayAmt}</Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Selectores — fila de 3 iconos */}
        <View style={s.selRow}>
          <SelIconBtn
            icon={<Calendar size={20} color={SLATE_500} strokeWidth={1.8} />}
            fieldName="FECHA"
            value={dateLabel}
            onPress={() => setActiveSheet("date")}
          />
          <SelIconBtn
            icon={<UtensilsCrossed size={20} color={SLATE_500} strokeWidth={1.8} />}
            fieldName="CATEGORÍA"
            value={catLabel}
            onPress={() => setActiveSheet("category")}
          />
          <SelIconBtn
            icon={<Wallet size={20} color={SLATE_500} strokeWidth={1.8} />}
            fieldName="CUENTA"
            value={accountLabel}
            onPress={() => setActiveSheet("account")}
          />
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
            placeholder={noteplaceholder}
            textAlignVertical="top"
            scrollEnabled={false}
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

      </ScrollView>

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
      <ListSheet visible={activeSheet === "date"} title="Fecha"
        options={DATE_OPTIONS} selected={store.date} accent={accent}
        iconMap={DATE_ICONS}
        onSelect={(k) => {
          if (k === "custom") {
            setShowDatePicker(true);
          } else {
            store.setDate(k as DateOption);
          }
        }}
        onClose={() => setActiveSheet(null)} />
      <CategorySheet
        visible={activeSheet === "category"}
        selected={store.categoryEmoji}
        accent={accent}
        isExpense={isExpense}
        onSelect={(k) => {
          const c = CATEGORY_OPTIONS.find((x) => x.key === k);
          if (c) store.setCategory(c.key, c.label);
        }}
        onClose={() => setActiveSheet(null)} />
      <AccountSheet
        visible={activeSheet === "account"}
        selected={store.account}
        accent={accent}
        options={paymentMethods.map((m) => ({ key: m.id, label: m.name, type: m.type }))}
        onSelect={(k) => store.setAccount(k as AccountType)}
        onClose={() => setActiveSheet(null)} />

      {/* ── DATE PICKER NATIVO ──────────────────────────────────────────── */}
      {showDatePicker && (
        <DateTimePicker
          value={store.customDate ?? new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            setShowDatePicker(false);
            if (event.type === "set" && date) {
              store.setCustomDate(date);
            }
          }}
        />
      )}

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
  content: { flex: 1, backgroundColor: BG },
  contentInner: { paddingHorizontal: 24, paddingBottom: 16 },

  // Monto
  amountBlock: { alignItems: "center", paddingTop: 28, paddingBottom: 20 },
  amountText: { fontSize: 64, fontWeight: "800", letterSpacing: -2, lineHeight: 72 },
  amountEditRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 16,
  },
  amountSignText: {
    fontSize: 32,
    fontWeight: "700",
  },
  amountInput: {
    fontSize: 64,
    fontWeight: "800",
    letterSpacing: -2,
    lineHeight: 72,
    minWidth: 80,
    maxWidth: 260,
    padding: 0,
    includeFontPadding: false,
  },
  // Selectores icon-button (fila de 4)
  selRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 4,
  },
  selIconBtn: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  selIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 9999,
    backgroundColor: WHITE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  selFieldName: {
    fontSize: 9,
    fontWeight: "700",
    color: SLATE_400,
    textAlign: "center",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  selValue: {
    fontSize: 12,
    fontWeight: "700",
    color: SLATE_900,
    textAlign: "center",
    letterSpacing: -0.2,
  },

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

// ─── Sheet base ───────────────────────────────────────────────────────────────
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
  title: { fontSize: 17, fontWeight: "700", color: SLATE_900, paddingHorizontal: 20, marginBottom: 4 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginHorizontal: 20 },
  option: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 14, paddingHorizontal: 20,
  },
  optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
  },
  optionText: { fontSize: 15, color: SLATE_900 },
});

// ─── Estilos CategorySheet ────────────────────────────────────────────────────
const catS = StyleSheet.create({
  container: { paddingBottom: 28 },
  header: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 20,
  },
  title: { fontSize: 13, fontWeight: "900", color: SLATE_900, letterSpacing: 1.5 },
  subtitle: { fontSize: 12, color: SLATE_500, marginTop: 2 },
  cancel: { fontSize: 14, fontWeight: "600", color: SLATE_500 },
  grid: {
    flexDirection: "row", flexWrap: "wrap",
    paddingHorizontal: 12, gap: 4,
    marginBottom: 20,
  },
  item: {
    width: "23%",
    alignItems: "center", gap: 8,
    paddingVertical: 12, paddingHorizontal: 4,
  },
  iconWrap: {
    position: "relative",
  },
  iconBox: {
    width: 56, height: 56, borderRadius: 9999,
    alignItems: "center", justifyContent: "center",
  },
  checkBadge: {
    position: "absolute", top: -2, right: -2,
    width: 18, height: 18, borderRadius: 9999,
    backgroundColor: SLATE_900,
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: WHITE,
  },
  itemLabel: {
    fontSize: 11, fontWeight: "600", color: SLATE_500,
    textAlign: "center", letterSpacing: 0.1,
  },
  itemLabelSelected: {
    color: SLATE_900, fontWeight: "700",
  },
  confirmBtn: {
    marginHorizontal: 20, paddingVertical: 16,
    backgroundColor: SLATE_900, borderRadius: 14,
    alignItems: "center",
  },
  confirmText: { fontSize: 14, fontWeight: "800", color: WHITE, letterSpacing: 1.2 },
});

// ─── Estilos AccountSheet ─────────────────────────────────────────────────────
const accS = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 20, gap: 14,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
  },
  textBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: SLATE_900 },
  desc: { fontSize: 12, color: SLATE_500, marginTop: 1 },
  addRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingTop: 12, marginTop: 4,
  },
  addText: { fontSize: 14, fontWeight: "600", color: BLUE },
});
