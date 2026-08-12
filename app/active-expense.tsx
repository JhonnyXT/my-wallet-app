import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { useReducedMotion, FadeInDown, FadeOutUp, Easing } from "react-native-reanimated";
import {
  X,
  Check,
  CheckCircle2,
  Plus,
  Calendar,
  FileText,
  UtensilsCrossed,
  Car,
  Home,
  ShoppingBag,
  HeartPulse,
  Gamepad2,
  GraduationCap,
  User,
  Banknote,
  Landmark,
  CreditCard,
  Briefcase,
  Laptop2,
  TrendingUp,
  Gift,
  Building2,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { useExpenseStore, AccountType } from "@/src/store/useExpenseStore";
import { useVoiceStore } from "@/src/store/useVoiceStore";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";

import { checkAndNotifyBudget } from "@/src/services/notificationService";
import { NewCategoryModal } from "@/app/category-onboarding";
import { PaymentMethodsSection } from "@/app/settings";
import type { UserCategory } from "@/src/constants/categoryPresets";
import { processVoiceInput } from "@/src/utils/voiceParser";
import { useTheme } from "@/src/context/ThemeContext";
import { CalendarSheet } from "@/src/components/ui/CalendarSheet";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import type { AppTheme } from "@/src/theme";

// ─── Colores de acción (fijos, no cambian con el tema) ─────────────────────────
const BLUE = "#135BEC";
const RED = "#EF4444";
const GREEN = "#22C55E";

// Botón "Guardar" deshabilitado: en oscuro el gris claro pensado para modo claro
// se ve "lavado" contra el fondo oscuro — override puntual solo para ese estado.
const DARK_DISABLED_BG = "#334155";
const DARK_DISABLED_TEXT = "#64748B";

// ─── Opciones ─────────────────────────────────────────────────────────────────
// Categorías se derivan dinámicamente del store (ya no hardcoded)
const ACCOUNT_OPTIONS: { key: AccountType; label: string }[] = [
  { key: "cash", label: "Efectivo" },
  { key: "savings", label: "Ahorros" },
  { key: "credit", label: "Tarjeta" },
];
const SUGGESTED_TAGS = ["#viaje", "#trabajo", "#comida", "#salud", "#ocio"];

// ─── Iconos de categoría (lucide) con paleta Stitch ───────────────────────────
type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const CATEGORY_ICONS: Record<string, { Icon: LucideIcon; color: string; bg: string }> = {
  // Gastos
  "🍔": { Icon: UtensilsCrossed, color: "#D2601A", bg: "#FFE8D6" },
  "🚗": { Icon: Car, color: "#1565C0", bg: "#D6EFFF" },
  "🏠": { Icon: Home, color: "#D97706", bg: "#FEF3C7" },
  "🛍️": { Icon: ShoppingBag, color: "#C2185B", bg: "#FEE2E2" },
  "🏥": { Icon: HeartPulse, color: "#C62828", bg: "#FCE4EC" },
  "🎮": { Icon: Gamepad2, color: "#6D28D9", bg: "#EDE9FE" },
  "🎓": { Icon: GraduationCap, color: "#059669", bg: "#D1FAE5" },
  "👤": { Icon: User, color: "#475569", bg: "#F1F5F9" },
  // Ingresos
  "💼": { Icon: Briefcase, color: "#1D4ED8", bg: "#DBEAFE" },
  "💻": { Icon: Laptop2, color: "#4338CA", bg: "#E0E7FF" },
  "📈": { Icon: TrendingUp, color: "#059669", bg: "#D1FAE5" },
  "🎁": { Icon: Gift, color: "#B45309", bg: "#FEF3C7" },
  "🏢": { Icon: Building2, color: "#374151", bg: "#F3F4F6" },
};

// ─── Info extra de cuentas ────────────────────────────────────────────────────
const ACCOUNT_DETAILS: Record<AccountType, { Icon: LucideIcon; desc: string }> = {
  cash: { Icon: Banknote, desc: "Dinero disponible" },
  savings: { Icon: Landmark, desc: "Cuenta de ahorros" },
  credit: { Icon: CreditCard, desc: "Tarjeta de crédito" },
};

// ─── Iconos de tipo de cuenta ─────────────────────────────────────────────────
const PAYMENT_TYPE_ICONS: Record<string, LucideIcon> = {
  cash: Banknote,
  debit: CreditCard,
  savings: Landmark,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtCOP(n: number) {
  return `$ ${Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// ─── Pantalla ─────────────────────────────────────────────────────────────────
export default function ActiveExpenseScreen() {
  const insets = useSafeAreaInsets();
  const store = useExpenseStore();
  const addTx = useFinanceStore((s) => s.addTransaction);
  const theme = useTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromBatchReview = from === "batch-review";
  const fromNotificationEdit = from === "notification-edit";
  const setPendingManualItem = useVoiceStore((s) => s.setPendingManualItem);
  // Si venimos de voice-batch-review o notification-edit, solo volvemos atrás al guardar
  const navigateAfterSave = () =>
    fromBatchReview || fromNotificationEdit ? router.back() : router.dismissAll();
  const st = useMemo(() => buildS(theme), [theme]);

  const paymentMethods = useSettingsStore((s) => s.paymentMethods);
  const userCategories = useSettingsStore((s) => s.userCategories);
  const addUserCategory = useSettingsStore((s) => s.addUserCategory);
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const transactions = useFinanceStore((s) => s.transactions);

  const expenseCatOptions = useMemo(
    () =>
      userCategories
        .filter((c) => c.type === "expense")
        .map((c) => ({
          key: c.emoji,
          label: c.name,
          colorBg: c.colorBg,
          colorAccent: c.colorAccent,
        })),
    [userCategories],
  );
  const incomeCatOptions = useMemo(
    () =>
      userCategories
        .filter((c) => c.type === "income")
        .map((c) => ({
          key: c.emoji,
          label: c.name,
          colorBg: c.colorBg,
          colorAccent: c.colorAccent,
        })),
    [userCategories],
  );

  const [tagInput, setTagInput] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [descOpen, setDescOpen] = useState(false);
  const [amountEditing, setAmountEditing] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState("");
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [paymentMethodsOpen, setPaymentMethodsOpen] = useState(false);
  const amountInputRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  function handleNewCategoryCreated(cat: UserCategory) {
    addUserCategory(cat);
    store.setCategory(cat.emoji, cat.name);
    setShowNewCatModal(false);
  }

  // Respeta "reducir movimiento" del sistema: sin duración, aparece/desaparece directo.
  const reducedMotion = useReducedMotion();
  const descEntering = reducedMotion
    ? undefined
    : FadeInDown.duration(220).easing(Easing.out(Easing.cubic));
  const descExiting = reducedMotion ? undefined : FadeOutUp.duration(160);

  function toggleDesc() {
    const opening = !descOpen;
    setDescOpen(opening);
    if (opening) setTimeout(() => noteRef.current?.focus(), 260);
  }

  const isExpense = store.isExpense;
  // GREEN (#22C55E) da solo 2.04:1 de contraste sobre el fondo claro — muy por debajo
  // del mínimo de accesibilidad. En modo claro se usa un verde más oscuro solo para
  // texto/monto; en oscuro el GREEN original ya tiene contraste de sobra (8.31:1).
  const accent = isExpense ? RED : theme.isDark ? GREEN : "#15803D";
  const accentBg = isExpense ? "#FEF2F2" : "#F0FDF4";
  const accentText = isExpense ? "#B91C1C" : "#15803D";
  const title = isExpense ? "Nuevo Gasto" : "Nuevo Ingreso";

  // ─── Parser reactivo: actualiza selectores en tiempo real ───────────────
  useEffect(() => {
    // Edición de un item ya estructurado (notificación bancaria o batch de voz):
    // los campos ya vienen correctos desde notification-review/voice-batch-review,
    // no hay que re-parsear el texto libre y arriesgar sobreescribir el monto real.
    if (fromBatchReview || fromNotificationEdit) return;

    const text = store.note?.trim() ?? "";
    if (text.length < 2) return;

    const parsed = processVoiceInput(text);

    // El monto ya no se sincroniza desde el texto libre: tiene su propio campo
    // editable (tap en el importe de la tarjeta) — sincronizarlo aquí también
    // sobrescribiría en silencio un valor que el usuario ya fijó a mano.

    // Fecha: solo si se mencionó explícitamente (ayer, hoy, anteayer)
    if (parsed._dateDetected && parsed.date) store.setDate(parsed.date);

    // Categoría: solo si se reconoció una categoría estándar
    if (parsed._categoryDetected && parsed.categoryEmoji && parsed.categoryName)
      store.setCategory(parsed.categoryEmoji, parsed.categoryName);

    // Tipo ingreso/gasto: solo si hay palabras clave explícitas
    // (no se cambia si el usuario abrió la pantalla como ingreso)
    if (parsed.isExpense !== undefined) store.setIsExpense(parsed.isExpense);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.note]);

  function handleAmountTap() {
    // Dígitos sin formatear mientras se edita: si insertáramos puntos de miles en
    // cada tecla, el TextInput controlado reformatearía el string completo en cada
    // cambio y el cursor saltaría al final en Android, impidiendo editar un dígito
    // en medio del monto. Los puntos de miles se muestran de nuevo al salir del
    // campo (handleAmountBlur), cuando vuelve a mostrarse como texto estático.
    const current = store.amount > 0 ? String(Math.round(store.amount)) : "";
    setAmountDisplay(current);
    setAmountEditing(true);
    setTimeout(() => amountInputRef.current?.focus(), 50);
  }

  function handleAmountChange(text: string) {
    setAmountDisplay(text.replace(/\D/g, ""));
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

    // ── Modo batch-review / notification-edit: no guardar en DB, devolver a la pantalla de revisión ──
    if (fromBatchReview || fromNotificationEdit) {
      const catName =
        userCategories.find((c) => c.emoji === store.categoryEmoji)?.name ?? store.categoryEmoji;
      setPendingManualItem({
        amount: store.amount,
        description: store.note || store.rawTranscript || (isExpense ? "Gasto" : "Ingreso"),
        categoryEmoji: store.categoryEmoji,
        categoryName: catName,
        isExpense,
        paymentMethod: store.account ?? "cash",
      });
      store.reset();
      router.back();
      return;
    }

    // ── Flujo normal: guardar en la base de datos ─────────────────────────────
    const txDate = store.date === "custom" && store.customDate ? store.customDate : new Date();

    const savedAmount = store.amount;
    const savedEmoji = store.categoryEmoji;
    const savedIsExp = isExpense;

    await addTx(
      isExpense ? store.amount : -store.amount,
      store.note || store.rawTranscript || (isExpense ? "Gasto" : "Ingreso"),
      store.categoryEmoji,
      store.tags,
      txDate,
      store.account,
    );

    if (savedIsExp) {
      const budget = budgetByCategory[savedEmoji];
      if (budget && budget > 0) {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const monthlySpent =
          transactions
            .filter(
              (t) =>
                t.amount > 0 && t.category_emoji === savedEmoji && t.date.startsWith(thisMonth),
            )
            .reduce((acc, t) => acc + t.amount, 0) + savedAmount;

        const catName = userCategories.find((c) => c.emoji === savedEmoji)?.name ?? savedEmoji;
        checkAndNotifyBudget(savedEmoji, catName, monthlySpent, budget);
      }
    }

    store.reset();
    navigateAfterSave();
  }

  function handleClose() {
    store.reset();
    navigateAfterSave();
  }

  function handleAddTag() {
    const t = tagInput.trim().replace(/^#/, "");
    if (t) {
      store.addTag(`#${t}`);
      setTagInput("");
    }
  }

  const effectiveDate = store.date === "custom" && store.customDate ? store.customDate : new Date();
  const dateLabel = effectiveDate.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const accountOptions =
    paymentMethods.length > 0
      ? paymentMethods.map((m) => ({ key: m.id, label: m.name, type: m.type }))
      : ACCOUNT_OPTIONS.map((o) => ({ key: o.key, label: o.label, type: o.key }));
  const displayTags = store.tags.length > 0 ? store.tags : SUGGESTED_TAGS;
  const displayAmt =
    store.amount > 0
      ? `${isExpense ? "−" : "+"} ${fmtCOP(store.amount)}`
      : `${isExpense ? "−" : "+"} $ 0`;

  const noteplaceholder = isExpense ? "Describe tu gasto aquí" : "Describe tu ingreso aquí";

  // Reduce el tamaño de fuente según cuántos dígitos tiene el monto
  const dynamicAmountStyle = (amt: number) => {
    const digits = amt > 0 ? Math.floor(Math.log10(amt)) + 1 : 1;
    if (digits >= 9) return { fontSize: 36, lineHeight: 42, letterSpacing: -1 };
    if (digits >= 7) return { fontSize: 48, lineHeight: 56, letterSpacing: -1.5 };
    if (digits >= 6) return { fontSize: 56, lineHeight: 64, letterSpacing: -2 };
    return {};
  };

  return (
    <KeyboardAvoidingView
      style={st.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* ── HEADER — solo botón atrás, título centrado ──────────────────────── */}
      <View style={[st.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={12}
          style={st.headerSideBtn}
          accessibilityLabel="Cerrar"
          accessibilityRole="button"
        >
          <X size={20} color={theme.textSub} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>{title}</Text>
        <View style={st.headerSideBtn} />
      </View>

      {/* ── CONTENIDO ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={st.content}
        contentContainerStyle={st.contentInner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── TARJETA: importe + descripción + fecha ─────────────────────── */}
        <View style={st.card}>
          <Text style={st.cardLabel}>IMPORTE</Text>
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
              <TouchableOpacity
                onPress={handleAmountTap}
                activeOpacity={0.7}
                style={{ width: "100%" }}
              >
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

          <View style={st.cardDivider} />

          <TouchableOpacity style={st.cardRow} onPress={toggleDesc} activeOpacity={0.6}>
            <FileText size={18} color={theme.textSub} strokeWidth={1.8} />
            <Text
              style={[
                st.cardRowText,
                !(store.note || store.rawTranscript) && { color: theme.textTertiary },
              ]}
              numberOfLines={1}
            >
              {store.note || store.rawTranscript || noteplaceholder}
            </Text>
          </TouchableOpacity>

          <View style={st.cardDivider} />

          <TouchableOpacity
            style={st.cardRow}
            onPress={() => setCalendarOpen(true)}
            activeOpacity={0.6}
          >
            <Calendar size={18} color={theme.textSub} strokeWidth={1.8} />
            <Text style={st.cardRowText}>{dateLabel}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Descripción + tags — solo visible al tocar la fila de arriba ── */}
        {descOpen && (
          <Animated.View entering={descEntering} exiting={descExiting} style={st.descPanel}>
            <TextInput
              ref={noteRef}
              value={store.note || store.rawTranscript}
              onChangeText={store.setNote}
              multiline
              style={st.transcriptInput}
              placeholderTextColor={theme.textTertiary}
              placeholder={noteplaceholder}
              textAlignVertical="top"
              onBlur={() => setDescOpen(false)}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={st.tagsRow}
              keyboardShouldPersistTaps="handled"
            >
              {displayTags.map((tag) => {
                const on = store.tags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    activeOpacity={0.7}
                    onPress={() => (on ? store.removeTag(tag) : store.addTag(tag))}
                    style={[
                      st.tagPill,
                      on
                        ? { backgroundColor: accentBg, borderColor: accentBg }
                        : { backgroundColor: theme.bg, borderColor: theme.border },
                    ]}
                  >
                    <Text style={[st.tagText, { color: on ? accentText : theme.textSub }]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <View style={st.tagInput}>
                <Plus size={11} color={theme.textTertiary} strokeWidth={2} />
                <TextInput
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={handleAddTag}
                  placeholder="tag"
                  placeholderTextColor={theme.textTertiary}
                  style={[st.tagInputText, { color: theme.text }]}
                  returnKeyType="done"
                  autoCapitalize="none"
                />
              </View>
            </ScrollView>
          </Animated.View>
        )}

        {/* ── CATEGORÍA — lista horizontal siempre visible ─────────────────── */}
        <Text style={st.sectionLabel}>CATEGORÍA</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.catRow}
        >
          {(isExpense ? expenseCatOptions : incomeCatOptions).map((cat) => {
            const info = CATEGORY_ICONS[cat.key];
            const isSel = store.categoryEmoji === cat.key;
            // En oscuro no usamos los pasteles de cat.colorBg/colorAccent (pensados para
            // fondo claro, chocan contra el navy) — mismo tratamiento uniforme que Stitch:
            // gris translúcido sin seleccionar, tinte del acento al seleccionar.
            const iconBg = theme.isDark
              ? isSel
                ? accent + "33"
                : "rgba(255,255,255,0.06)"
              : cat.colorBg;
            const iconColor = theme.isDark ? (isSel ? accent : theme.textSub) : cat.colorAccent;
            return (
              <TouchableOpacity
                key={cat.key}
                style={st.catItem}
                onPress={() => store.setCategory(cat.key, cat.label)}
                activeOpacity={0.7}
              >
                <View style={st.catIconWrap}>
                  <View
                    style={[
                      st.catIconBox,
                      { backgroundColor: iconBg },
                      isSel && { borderWidth: 2, borderColor: accent },
                    ]}
                  >
                    {info ? (
                      <info.Icon size={22} color={iconColor} strokeWidth={1.8} />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{cat.key}</Text>
                    )}
                  </View>
                  {isSel && (
                    <View style={[st.catCheckBadge, { backgroundColor: accent }]}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={[st.catItemLabel, isSel && st.catItemLabelSelected]} numberOfLines={1}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={st.catItem}
            onPress={() => setShowNewCatModal(true)}
            activeOpacity={0.7}
          >
            <View
              style={[
                st.catIconBox,
                {
                  backgroundColor: theme.isDark ? "rgba(255,255,255,0.06)" : theme.inputBg,
                  borderWidth: 1.5,
                  borderColor: accent,
                  borderStyle: "dashed",
                },
              ]}
            >
              <Plus size={22} color={accent} strokeWidth={2.5} />
            </View>
            <Text style={[st.catItemLabel, { color: accent, fontWeight: "700" }]}>Nueva</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── CUENTA — lista vertical siempre visible ──────────────────────── */}
        <Text style={st.sectionLabel}>CUENTA</Text>
        <View style={st.accList}>
          {accountOptions.map((opt, i) => {
            const Icon = PAYMENT_TYPE_ICONS[opt.type] ?? Banknote;
            const isSel = opt.key === store.account;
            return (
              <View key={opt.key}>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => store.setAccount(opt.key as AccountType)}
                  style={[st.accRow, isSel && { backgroundColor: accent + "14" }]}
                >
                  <View style={[st.accIconBox, isSel && { backgroundColor: accent + "22" }]}>
                    <Icon size={20} color={isSel ? accent : theme.textSub} strokeWidth={1.8} />
                  </View>
                  <Text style={[st.accName, isSel && { color: accent, fontWeight: "700" }]}>
                    {opt.label}
                  </Text>
                  {isSel && <CheckCircle2 size={18} color={accent} strokeWidth={2} />}
                </TouchableOpacity>
                {i < accountOptions.length - 1 && <View style={st.accSep} />}
              </View>
            );
          })}
        </View>
        <TouchableOpacity
          style={st.accAddRow}
          activeOpacity={0.6}
          onPress={() => setPaymentMethodsOpen(true)}
        >
          <Plus size={16} color={theme.textSub} strokeWidth={2} />
          <Text style={st.accAddText}>Gestionar métodos de pago</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── GUARDAR — fijo abajo, fácil de alcanzar con el pulgar ────────── */}
      <View style={[st.footer, { paddingBottom: insets.bottom + 12 }]}>
        <LinearGradient
          colors={[theme.bg + "00", theme.bg, theme.bg]}
          locations={[0, 0.45, 1]}
          style={st.footerFade}
          pointerEvents="none"
        />
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={store.amount <= 0}
          activeOpacity={0.85}
          style={[st.saveBtn, store.amount <= 0 && st.saveBtnOff]}
          accessibilityLabel="Guardar"
          accessibilityRole="button"
        >
          <Check
            size={18}
            color={store.amount <= 0 && theme.isDark ? DARK_DISABLED_TEXT : "#FFFFFF"}
            strokeWidth={3}
          />
          <Text
            style={[
              st.saveBtnText,
              store.amount <= 0 && theme.isDark && { color: DARK_DISABLED_TEXT },
            ]}
          >
            Guardar
          </Text>
        </TouchableOpacity>
      </View>

      <NewCategoryModal
        visible={showNewCatModal}
        type={isExpense ? "expense" : "income"}
        theme={theme}
        onClose={() => setShowNewCatModal(false)}
        onSave={handleNewCategoryCreated}
      />

      <CalendarSheet
        visible={calendarOpen}
        selectedDate={effectiveDate}
        accent={accent}
        onSelect={(date) => store.setCustomDate(date)}
        onClose={() => setCalendarOpen(false)}
      />

      {/* ── Métodos de pago — sheet inline, sin salir de la pantalla ────────── */}
      <BottomSheet
        visible={paymentMethodsOpen}
        onClose={() => setPaymentMethodsOpen(false)}
        style={{ paddingBottom: insets.bottom + 16, maxHeight: "80%" }}
      >
        <View style={st.pmHeader}>
          <Text style={st.pmTitle}>Métodos de pago</Text>
        </View>
        <ScrollView style={st.pmScroll} showsVerticalScrollIndicator={false}>
          <PaymentMethodsSection />
        </ScrollView>
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

// ─── Estilos dinámicos ────────────────────────────────────────────────────────
function buildS(t: AppTheme) {
  const bg = t.bg;
  const card = t.surface;

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: bg },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingBottom: 14,
      backgroundColor: bg,
    },
    headerSideBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 17, fontWeight: "700", color: t.text, letterSpacing: -0.4 },

    content: { flex: 1, backgroundColor: bg },
    contentInner: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 140 },

    // ── Tarjeta: importe + descripción + fecha ─────────────────────────────
    card: {
      backgroundColor: card,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: t.isDark ? 0 : 0.04,
      shadowRadius: 8,
      elevation: t.isDark ? 0 : 2,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textSub,
      textAlign: "center",
      letterSpacing: 1,
      textTransform: "uppercase",
    },

    amountBlock: {
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 8,
      paddingBottom: 14,
      width: "100%",
    },
    amountText: {
      fontSize: 42,
      fontWeight: "800",
      letterSpacing: -1,
      lineHeight: 48,
      textAlign: "center",
      width: "100%",
    },
    amountEditRow: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      gap: 4,
      width: "100%",
    },
    amountSignText: { fontSize: 22, fontWeight: "700" },
    amountInput: {
      fontSize: 42,
      fontWeight: "800",
      letterSpacing: -1,
      lineHeight: 48,
      minWidth: 60,
      padding: 0,
      includeFontPadding: false,
      textAlign: "center",
    },

    cardDivider: { height: StyleSheet.hairlineWidth, backgroundColor: t.border },
    cardRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      paddingVertical: 14,
    },
    cardRowText: {
      fontSize: 15,
      fontWeight: "500",
      color: t.text,
      textAlign: "center",
      flexShrink: 1,
      maxWidth: "82%",
    },

    // ── Panel colapsable descripción + tags ─────────────────────────────────
    descPanel: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: t.border,
      backgroundColor: card,
      overflow: "hidden",
    },
    transcriptInput: {
      minHeight: 72,
      padding: 16,
      fontSize: 15,
      fontWeight: "400",
      color: t.text,
      lineHeight: 22,
      backgroundColor: "transparent",
      textAlignVertical: "top",
    },
    tagsRow: {
      paddingHorizontal: 16,
      paddingBottom: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    tagPill: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 9999, borderWidth: 1 },
    tagText: { fontSize: 12, fontWeight: "500" },
    tagInput: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingVertical: 7,
      paddingHorizontal: 12,
      backgroundColor: t.bg,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: t.border,
      borderStyle: "dashed",
    },
    tagInputText: { fontSize: 12, minWidth: 36, maxWidth: 80, padding: 0 },

    // ── Secciones categoría / cuenta ─────────────────────────────────────────
    sectionLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: t.textSub,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginTop: 24,
      marginBottom: 12,
    },

    catRow: { flexDirection: "row", alignItems: "flex-start", gap: 16, paddingRight: 8 },
    catItem: { width: 64, alignItems: "center", gap: 6 },
    catIconWrap: { position: "relative" },
    catIconBox: {
      width: 56,
      height: 56,
      borderRadius: 9999,
      alignItems: "center",
      justifyContent: "center",
    },
    catCheckBadge: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9999,
      backgroundColor: t.text,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      // El círculo de categoría vive sobre el fondo de pantalla (no dentro de la
      // tarjeta), así que el borde-recorte del badge debe calzar con `bg`, no `card`.
      borderColor: bg,
    },
    catItemLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: t.textSub,
      textAlign: "center",
      letterSpacing: 0.1,
    },
    catItemLabelSelected: { color: t.text, fontWeight: "700" },

    accList: {
      backgroundColor: card,
      borderRadius: 16,
      borderWidth: t.isDark ? 1 : 0,
      borderColor: t.border,
      overflow: "hidden",
    },
    accRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    accIconBox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: t.inputBg,
      alignItems: "center",
      justifyContent: "center",
    },
    accName: { fontSize: 15, fontWeight: "600", color: t.text, flex: 1 },
    accSep: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 66 },
    accAddRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingTop: 14,
      paddingHorizontal: 4,
    },
    accAddText: { fontSize: 14, fontWeight: "600", color: t.text },

    // ── Footer fijo: botón Guardar ───────────────────────────────────────────
    footer: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      paddingTop: 32,
      paddingHorizontal: 24,
    },
    footerFade: { ...StyleSheet.absoluteFillObject },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 28,
      backgroundColor: BLUE,
      shadowColor: BLUE,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    saveBtnOff: {
      backgroundColor: t.isDark ? DARK_DISABLED_BG : "#CBD5E1",
      shadowOpacity: 0,
      elevation: 0,
    },
    saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

    // ── Sheet: Métodos de pago ──────────────────────────────────────────────
    pmHeader: { paddingHorizontal: 20, paddingBottom: 12 },
    pmTitle: { fontSize: 17, fontWeight: "700", color: t.text },
    pmScroll: { paddingHorizontal: 4 },
  });
}
