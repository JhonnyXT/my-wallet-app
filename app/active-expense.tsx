import React, { useState, useEffect, useRef, useMemo } from "react";
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
  CalendarCheck, CalendarPlus,
  Briefcase, Laptop2, TrendingUp, Gift, Building2,
} from "lucide-react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";

import { useExpenseStore, DateOption, AccountType } from "@/src/store/useExpenseStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { processVoiceInput } from "@/src/utils/voiceParser";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

// ─── Colores de acción (fijos, no cambian con el tema) ─────────────────────────
const BLUE  = "#135BEC";
const RED   = "#EF4444";
const GREEN = "#22C55E";

// ─── Opciones ─────────────────────────────────────────────────────────────────
const DATE_OPTIONS: { key: DateOption; label: string }[] = [
  { key: "today",  label: "Hoy" },
  { key: "custom", label: "Calendario" },
];
// Categorías se derivan dinámicamente del store (ya no hardcoded)
const ACCOUNT_OPTIONS: { key: AccountType; label: string }[] = [
  { key: "cash",    label: "Efectivo" },
  { key: "savings", label: "Ahorros" },
  { key: "credit",  label: "Tarjeta" },
];
const SUGGESTED_TAGS = ["#viaje", "#trabajo", "#comida", "#salud", "#ocio"];

// ─── Iconos de categoría (lucide) con paleta Stitch ───────────────────────────
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  // Gastos
  "🍔": { Icon: UtensilsCrossed, color: "#D2601A", bg: "#FFE8D6" },
  "🚗": { Icon: Car,             color: "#1565C0", bg: "#D6EFFF" },
  "🏠": { Icon: Home,            color: "#D97706", bg: "#FEF3C7" },
  "🛍️": { Icon: ShoppingBag,    color: "#C2185B", bg: "#FEE2E2" },
  "🏥": { Icon: HeartPulse,      color: "#C62828", bg: "#FCE4EC" },
  "🎮": { Icon: Gamepad2,        color: "#6D28D9", bg: "#EDE9FE" },
  "🎓": { Icon: GraduationCap,   color: "#059669", bg: "#D1FAE5" },
  "👤": { Icon: User,            color: "#475569", bg: "#F1F5F9" },
  // Ingresos
  "💼": { Icon: Briefcase,   color: "#1D4ED8", bg: "#DBEAFE" },
  "💻": { Icon: Laptop2,     color: "#4338CA", bg: "#E0E7FF" },
  "📈": { Icon: TrendingUp,  color: "#059669", bg: "#D1FAE5" },
  "🎁": { Icon: Gift,        color: "#B45309", bg: "#FEF3C7" },
  "🏢": { Icon: Building2,   color: "#374151", bg: "#F3F4F6" },
};

// ─── Info extra de cuentas ────────────────────────────────────────────────────
const ACCOUNT_DETAILS: Record<AccountType, { Icon: LucideIcon; desc: string }> = {
  cash:    { Icon: Banknote,    desc: "Dinero disponible" },
  savings: { Icon: Landmark,   desc: "**** 8842" },
  credit:  { Icon: CreditCard, desc: "Visa Platinum" },
};

// ─── Iconos de fecha y recurrencia ────────────────────────────────────────────
const DATE_ICONS: Record<string, LucideIcon> = {
  today:  CalendarCheck,
  custom: CalendarPlus,
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
  const theme = useTheme();
  const sh = useMemo(() => buildSheet(theme), [theme]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sh.backdrop} />
      </TouchableWithoutFeedback>
      <View style={sh.container}>
        <View style={sh.handle} />
        <Text style={sh.title}>{title}</Text>
        {options.map((opt, i) => {
          const Icon = iconMap[opt.key];
          const isSel = opt.key === selected;
          return (
            <View key={opt.key}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt.key); onClose(); }}
                style={sh.option}
              >
                <View style={sh.optionLeft}>
                  <View style={[sh.optionIconBox, isSel && { backgroundColor: accent + "18" }]}>
                    {Icon && <Icon size={18} color={isSel ? accent : theme.textSub} strokeWidth={1.8} />}
                  </View>
                  <Text style={[sh.optionText, isSel && { color: accent, fontWeight: "700" }]}>
                    {opt.label}
                  </Text>
                </View>
                {isSel && <Check size={16} color={accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < options.length - 1 && <View style={sh.sep} />}
            </View>
          );
        })}
      </View>
    </Modal>
  );
}

// ─── Sheet: CATEGORÍA — grid dinámico + botón CONFIRMAR ──────────────────────
function CategorySheet({
  visible, selected, accent, isExpense, categories, onSelect, onClose,
}: {
  visible: boolean; selected: string; accent: string; isExpense: boolean;
  categories: { key: string; label: string; colorBg: string; colorAccent: string }[];
  onSelect: (k: string) => void; onClose: () => void;
}) {
  const [temp, setTemp] = useState(selected);
  useEffect(() => { if (visible) setTemp(selected); }, [visible, selected]);
  const theme = useTheme();
  const sh = useMemo(() => buildSheet(theme), [theme]);
  const cs = useMemo(() => buildCatS(theme), [theme]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sh.backdrop} />
      </TouchableWithoutFeedback>
      <View style={[sh.container, cs.container]}>
        <View style={sh.handle} />
        <View style={cs.header}>
          <View>
            <Text style={cs.title}>CATEGORÍA</Text>
            <Text style={cs.subtitle}>
              {isExpense ? "Elige el tipo de gasto" : "Elige el tipo de ingreso"}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={cs.cancel}>Cancelar</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
          <View style={[cs.grid, categories.length <= 5 && cs.gridIncome]}>
            {categories.map((cat) => {
              const info = CATEGORY_ICONS[cat.key];
              const isSel = temp === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={cs.item}
                  onPress={() => setTemp(cat.key)}
                  activeOpacity={0.7}
                >
                  <View style={cs.iconWrap}>
                    <View style={[cs.iconBox, { backgroundColor: cat.colorBg }]}>
                      {info
                        ? <info.Icon size={24} color={cat.colorAccent} strokeWidth={1.8} />
                        : <Text style={{ fontSize: 22 }}>{cat.key}</Text>
                      }
                    </View>
                    {isSel && (
                      <View style={cs.checkBadge}>
                        <Check size={10} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={[cs.itemLabel, isSel && cs.itemLabelSelected]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
        <TouchableOpacity
          style={cs.confirmBtn}
          onPress={() => {
            onSelect(temp);
            onClose();
          }}
          activeOpacity={0.85}
        >
          <Text style={cs.confirmText}>CONFIRMAR</Text>
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
  const theme = useTheme();
  const sh = useMemo(() => buildSheet(theme), [theme]);
  const as = useMemo(() => buildAccS(theme), [theme]);
  const displayOptions = options.length > 0 ? options : ACCOUNT_OPTIONS.map((o) => ({ key: o.key, label: o.label, type: o.key }));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sh.backdrop} />
      </TouchableWithoutFeedback>
      <View style={sh.container}>
        <View style={sh.handle} />
        <Text style={[sh.title, { marginBottom: 8 }]}>Seleccionar Cuenta</Text>
        {displayOptions.map((opt, i) => {
          const Icon  = PAYMENT_TYPE_ICONS[opt.type] ?? Banknote;
          const isSel = opt.key === selected;
          return (
            <View key={opt.key}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt.key); onClose(); }}
                style={as.row}
              >
                <View style={[as.iconBox, isSel && { backgroundColor: accent + "18" }]}>
                  <Icon size={22} color={isSel ? accent : theme.textSub} strokeWidth={1.8} />
                </View>
                <View style={as.textBlock}>
                  <Text style={[as.name, isSel && { color: accent, fontWeight: "700" }]}>
                    {opt.label}
                  </Text>
                </View>
                {isSel && <Check size={18} color={accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < displayOptions.length - 1 && <View style={sh.sep} />}
            </View>
          );
        })}
        {/* Ir a configuración para gestionar métodos */}
        <TouchableOpacity
          style={as.addRow}
          activeOpacity={0.6}
          onPress={() => { onClose(); router.push("/settings"); }}
        >
          <Plus size={16} color={BLUE} strokeWidth={2} />
          <Text style={as.addText}>Gestionar métodos de pago</Text>
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
  fieldName: string;
  value: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const st = useMemo(() => buildS(theme), [theme]);
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={st.selIconBtn}>
      <View style={st.selIconCircle}>{icon}</View>
      <Text style={st.selFieldName}>{fieldName}</Text>
      <Text style={st.selValue} numberOfLines={1}>{value}</Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCOP(n: number) {
  return `$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function ActiveExpenseScreen() {
  const insets = useSafeAreaInsets();
  const store  = useExpenseStore();
  const addTx  = useFinanceStore((s) => s.addTransaction);
  const theme  = useTheme();
  const st     = useMemo(() => buildS(theme), [theme]);

  const paymentMethods  = useSettingsStore((s) => s.paymentMethods);
  const userCategories  = useSettingsStore((s) => s.userCategories);

  const expenseCatOptions = useMemo(() =>
    userCategories.filter(c => c.type === "expense").map(c => ({ key: c.emoji, label: c.name, colorBg: c.colorBg, colorAccent: c.colorAccent })),
    [userCategories]
  );
  const incomeCatOptions = useMemo(() =>
    userCategories.filter(c => c.type === "income").map(c => ({ key: c.emoji, label: c.name, colorBg: c.colorBg, colorAccent: c.colorAccent })),
    [userCategories]
  );

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

    const txDate = store.date === "custom" && store.customDate
      ? store.customDate
      : new Date();

    await addTx(
      isExpense ? store.amount : -store.amount,
      store.note || store.rawTranscript || (isExpense ? "Gasto" : "Ingreso"),
      store.categoryEmoji,
      store.tags,
      txDate,
      store.account,
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
  const allCatOptions = [...expenseCatOptions, ...incomeCatOptions];
  const catLabel     = allCatOptions.find((o) => o.key === store.categoryEmoji)?.label ?? store.categoryName;
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

  // Reduce el tamaño de fuente según cuántos dígitos tiene el monto
  const dynamicAmountStyle = (amt: number) => {
    const digits = amt > 0 ? Math.floor(Math.log10(amt)) + 1 : 1;
    if (digits >= 9) return { fontSize: 36, lineHeight: 42, letterSpacing: -1 };
    if (digits >= 7) return { fontSize: 48, lineHeight: 56, letterSpacing: -1.5 };
    if (digits >= 6) return { fontSize: 56, lineHeight: 64, letterSpacing: -2 };
    return {};
  };

  return (
    <KeyboardAvoidingView style={st.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={[st.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={handleClose} hitSlop={12} style={st.headerSideBtn}>
          <X size={20} color={theme.textSub} strokeWidth={2} />
        </TouchableOpacity>

        <Text style={st.headerTitle}>{title}</Text>

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={store.amount <= 0}
          style={[st.confirmBtn, store.amount <= 0 && st.confirmBtnOff]}
        >
          <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* ── CONTENIDO ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={st.content}
        contentContainerStyle={st.contentInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* Monto */}
        <View style={st.amountBlock}>
          {amountEditing ? (
            <View style={st.amountEditRow}>
              <Text style={[st.amountSignText, { color: accent }]}>
                {isExpense ? "−" : "+"} $
              </Text>
              <TextInput
                ref={amountInputRef}
                value={amountDisplay}
                onChangeText={handleAmountChange}
                onBlur={handleAmountBlur}
                onSubmitEditing={handleAmountBlur}
                keyboardType="number-pad"
                style={[st.amountInput, { color: accent }, dynamicAmountStyle(store.amount)]}
                returnKeyType="done"
                placeholder="0"
                placeholderTextColor={accent + "55"}
                selectTextOnFocus
              />
            </View>
          ) : (
            <TouchableOpacity onPress={handleAmountTap} activeOpacity={0.7} style={{ width: "100%" }}>
              <Text
                style={[st.amountText, { color: accent }, dynamicAmountStyle(store.amount)]}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.5}
              >
                {displayAmt}
              </Text>
            </TouchableOpacity>
          )}

        </View>

        {/* Selectores — fila de 3 iconos */}
        <View style={st.selRow}>
          <SelIconBtn
            icon={<Calendar size={20} color={theme.textSub} strokeWidth={1.8} />}
            fieldName="FECHA"
            value={dateLabel}
            onPress={() => setActiveSheet("date")}
          />
          <SelIconBtn
            icon={<UtensilsCrossed size={20} color={theme.textSub} strokeWidth={1.8} />}
            fieldName="CATEGORÍA"
            value={catLabel}
            onPress={() => setActiveSheet("category")}
          />
          <SelIconBtn
            icon={<Wallet size={20} color={theme.textSub} strokeWidth={1.8} />}
            fieldName="CUENTA"
            value={accountLabel}
            onPress={() => setActiveSheet("account")}
          />
        </View>

        {/* Transcripción */}
        <View style={st.transcriptBox}>
          <TextInput
            ref={noteRef}
            value={store.note || store.rawTranscript}
            onChangeText={store.setNote}
            multiline
            style={st.transcriptInput}
            placeholderTextColor={theme.textTertiary}
            placeholder={noteplaceholder}
            textAlignVertical="top"
            scrollEnabled={false}
          />
          {/* Lápiz edición — posición absoluta esquina inferior derecha */}
          <TouchableOpacity
            onPress={() => noteRef.current?.focus()}
            style={st.editIcon}
            hitSlop={12}
          >
            <Edit3 size={16} color={theme.textTertiary} strokeWidth={1.8} />
          </TouchableOpacity>
        </View>

        {/* ── TAGS ────────────────────────────────────────────────────────── */}
        <View style={[st.tagsBar, { marginBottom: insets.bottom + 6 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.tagsRow}>
            {displayTags.map((tag) => {
              const on = store.tags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  activeOpacity={0.7}
                  onPress={() => on ? store.removeTag(tag) : store.addTag(tag)}
                style={[st.tagPill,
                  on ? { backgroundColor: accentBg, borderColor: accentBg }
                     : { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text style={[st.tagText, { color: on ? accentText : theme.textSub }]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
            <View style={st.tagInput}>
              <Plus size={11} color={theme.textTertiary} strokeWidth={2} />
              <TextInput
                value={tagInput} onChangeText={setTagInput}
                onSubmitEditing={handleAddTag}
                placeholder="tag" placeholderTextColor={theme.textTertiary}
                style={[st.tagInputText, { color: theme.text }]} returnKeyType="done" autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </View>

      </ScrollView>

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
        categories={isExpense ? expenseCatOptions : incomeCatOptions}
        onSelect={(k) => {
          const c = allCatOptions.find((x) => x.key === k);
          if (c) store.setCategory(c.key, c.label);
          else store.setCategory(k, k);
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

// ─── Estilos dinámicos ────────────────────────────────────────────────────────
function buildS(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },

    header: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 24, paddingBottom: 14,
      backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border,
    },
    headerSideBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700", color: t.text, letterSpacing: -0.4 },
    confirmBtn: {
      width: 38, height: 38, borderRadius: 19, backgroundColor: BLUE,
      alignItems: "center", justifyContent: "center",
      shadowColor: BLUE, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
    },
    confirmBtnOff: { backgroundColor: "#CBD5E1", shadowOpacity: 0, elevation: 0 },

    content: { flex: 1, backgroundColor: t.bg },
    contentInner: { paddingHorizontal: 24, paddingBottom: 16 },

    amountBlock: { alignItems: "center", justifyContent: "center", paddingTop: 28, paddingBottom: 20, width: "100%" },
    amountText: { fontSize: 64, fontWeight: "800", letterSpacing: -2, lineHeight: 72, textAlign: "center", width: "100%" },
    amountEditRow: { flexDirection: "row", alignItems: "baseline", justifyContent: "center", gap: 4, marginBottom: 16, width: "100%" },
    amountSignText: { fontSize: 32, fontWeight: "700" },
    amountInput: {
      fontSize: 64, fontWeight: "800", letterSpacing: -2, lineHeight: 72,
      minWidth: 80, padding: 0, includeFontPadding: false, textAlign: "center",
    },

    selRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, gap: 4 },
    selIconBtn: { flex: 1, alignItems: "center", gap: 5 },
    selIconCircle: {
      width: 52, height: 52, borderRadius: 9999,
      backgroundColor: t.surface,
      alignItems: "center", justifyContent: "center",
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: t.isDark ? 0 : 0.08, shadowRadius: 6,
      elevation: t.isDark ? 0 : 3,
      borderWidth: t.isDark ? 1 : 0,
      borderColor: t.isDark ? t.border : "transparent",
    },
    selFieldName: {
      fontSize: 9, fontWeight: "700", color: t.textTertiary,
      textAlign: "center", letterSpacing: 0.8, textTransform: "uppercase",
    },
    selValue: { fontSize: 12, fontWeight: "700", color: t.text, textAlign: "center", letterSpacing: -0.2 },

    transcriptBox: {
      flex: 1, borderRadius: 20, borderWidth: 2, borderStyle: "dashed",
      borderColor: t.border, backgroundColor: t.surface, marginBottom: 4, position: "relative",
    },
    transcriptInput: {
      flex: 1, padding: 20, paddingBottom: 36,
      fontSize: 17, fontWeight: "400", color: t.text, lineHeight: 26,
      backgroundColor: "transparent", textAlignVertical: "top",
    },
    editIcon: { position: "absolute", right: 14, bottom: 12 },

    tagsBar: {
      marginTop: 16,
      paddingTop: 6,
      paddingBottom: 6,
    },
    tagsRow: { paddingHorizontal: 24, flexDirection: "row", alignItems: "center", gap: 8 },
    tagPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1 },
    tagText: { fontSize: 12, fontWeight: "500" },
    tagInput: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingVertical: 7, paddingHorizontal: 12,
      backgroundColor: t.surface, borderRadius: 9999, borderWidth: 1,
      borderColor: t.border, borderStyle: "dashed",
    },
    tagInputText: { fontSize: 12, minWidth: 36, maxWidth: 80, padding: 0 },
  });
}

// ─── Sheet base ───────────────────────────────────────────────────────────────
function buildSheet(t: AppTheme) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
    container: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      paddingBottom: 36, paddingTop: 12,
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12, shadowRadius: 20, elevation: 24,
    },
    handle: {
      width: 36, height: 4, borderRadius: 2, backgroundColor: t.border,
      alignSelf: "center", marginBottom: 16,
    },
    title: { fontSize: 17, fontWeight: "700", color: t.text, paddingHorizontal: 20, marginBottom: 4 },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginHorizontal: 20 },
    option: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingVertical: 14, paddingHorizontal: 20,
    },
    optionLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    optionIconBox: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: t.inputBg, alignItems: "center", justifyContent: "center",
    },
    optionText: { fontSize: 15, color: t.text },
  });
}

// ─── Estilos CategorySheet ────────────────────────────────────────────────────
function buildCatS(t: AppTheme) {
  return StyleSheet.create({
    container: { paddingBottom: 28 },
    header: {
      flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
      paddingHorizontal: 20, paddingBottom: 20,
    },
    title: { fontSize: 13, fontWeight: "900", color: t.text, letterSpacing: 1.5 },
    subtitle: { fontSize: 12, color: t.textSub, marginTop: 2 },
    cancel: { fontSize: 14, fontWeight: "600", color: t.textSub },
    grid: {
      flexDirection: "row", flexWrap: "wrap",
      paddingHorizontal: 12, gap: 4,
      marginBottom: 20,
    },
    gridIncome: {
      justifyContent: "center",
    },
    item: { width: "23%", alignItems: "center", gap: 8, paddingVertical: 12, paddingHorizontal: 4 },
    iconWrap: { position: "relative" },
    iconBox: { width: 56, height: 56, borderRadius: 9999, alignItems: "center", justifyContent: "center" },
    checkBadge: {
      position: "absolute", top: -2, right: -2,
      width: 18, height: 18, borderRadius: 9999,
      backgroundColor: t.text,
      alignItems: "center", justifyContent: "center",
      borderWidth: 2, borderColor: t.surface,
    },
    itemLabel: { fontSize: 11, fontWeight: "600", color: t.textSub, textAlign: "center", letterSpacing: 0.1 },
    itemLabelSelected: { color: t.text, fontWeight: "700" },
    confirmBtn: {
      marginHorizontal: 20, paddingVertical: 16,
      backgroundColor: t.text, borderRadius: 14, alignItems: "center",
    },
    confirmText: { fontSize: 14, fontWeight: "800", color: t.surface, letterSpacing: 1.2 },
  });
}

// ─── Estilos AccountSheet ─────────────────────────────────────────────────────
function buildAccS(t: AppTheme) {
  return StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 14, paddingHorizontal: 20, gap: 14,
  },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: t.inputBg, alignItems: "center", justifyContent: "center",
  },
  textBlock: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: t.text },
  desc: { fontSize: 12, color: t.textSub, marginTop: 1 },
  addRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingTop: 12, marginTop: 4,
  },
  addText: { fontSize: 14, fontWeight: "600", color: BLUE },
  });
}
