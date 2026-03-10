/**
 * app/settings.tsx — Modal de Configuración
 * Diseño: Stitch "Professional Settings Interface"
 */
import { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  CalendarDays,
  CreditCard,
  PiggyBank,
  Moon,
  Download,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react-native";
import { router } from "expo-router";
import Constants from "expo-constants";
import { useSettingsStore, type PaymentMethod, type PaymentMethodType } from "@/src/store/useSettingsStore";
import { ALL_CATEGORY_EMOJIS, EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

// ─── Constantes ───────────────────────────────────────────────────────────────
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOP(value: number): string {
  if (value <= 0) return "Sin configurar";
  return `$ ${Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")} COP`;
}


// ─── Componentes de sección ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const s = useStyles();
  return <Text style={s.sectionHeader}>{title}</Text>;
}

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  rightElement,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  danger?: boolean;
}) {
  const s = useStyles();
  return (
    <TouchableOpacity
      style={s.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={s.rowIcon}>{icon}</View>
      <View style={s.rowText}>
        <Text style={[s.rowLabel, danger && { color: "#DC2626" }]}>{label}</Text>
        {subtitle ? <Text style={s.rowSub}>{subtitle}</Text> : null}
      </View>
      {rightElement ?? (onPress ? <ChevronRight size={16} color={s.rowSub.color as string} strokeWidth={2} /> : null)}
    </TouchableOpacity>
  );
}

// ─── Tarjeta de submenu (nombre + descripción → abre modal) ──────────────────

function SubMenuCard({
  icon,
  label,
  description,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onPress: () => void;
}) {
  const s = useStyles();
  return (
    <TouchableOpacity style={s.subCard} onPress={onPress} activeOpacity={0.65}>
      <View style={s.subCardIcon}>{icon}</View>
      <View style={s.subCardText}>
        <Text style={s.subCardLabel}>{label}</Text>
        <Text style={s.subCardDesc}>{description}</Text>
      </View>
      <ChevronRight size={18} color={s.subCardDesc.color as string} strokeWidth={2} />
    </TouchableOpacity>
  );
}

// ─── Wrapper modal pantalla completa ─────────────────────────────────────────

function FullScreenModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[s.safe, { paddingTop: 0 }]} edges={["top"]}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.backBtn} hitSlop={12} activeOpacity={0.65}>
            <ChevronLeft size={24} color={s.headerTitle.color as string} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{title}</Text>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Modal de edición genérico (campo de texto + número) ──────────────────────

function InputModal({
  visible,
  title,
  placeholder,
  value,
  keyboardType = "default",
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  placeholder: string;
  value: string;
  keyboardType?: "default" | "numeric";
  onConfirm: (val: string) => void;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const isMoney = keyboardType === "numeric";

  const toDisplay = (raw: string) =>
    isMoney ? formatMoneyInput(raw) : raw;

  const [display, setDisplay] = useState(() => toDisplay(value));

  // Sincronizar cuando cambia el valor externo o el modal se abre
  useEffect(() => {
    if (visible) setDisplay(toDisplay(value));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, value]);

  const handleChange = (text: string) => {
    if (isMoney) {
      const digits = text.replace(/\D/g, "");
      setDisplay(formatMoneyInput(digits));
    } else {
      setDisplay(text);
    }
  };

  const handleConfirm = () => {
    onConfirm(isMoney ? display.replace(/\D/g, "") : display);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={s.modalCard}>
          <Text style={s.modalTitle}>{title}</Text>
          {isMoney && (
            <Text style={s.modalMoneyPrefix}>$</Text>
          )}
          <TextInput
            style={[s.modalInput, isMoney && s.modalInputMoney]}
            value={display}
            onChangeText={handleChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textSub}
            keyboardType={isMoney ? "number-pad" : keyboardType}
            autoFocus
          />
          {isMoney && display.length > 0 && (
            <Text style={s.modalMoneySuffix}>COP</Text>
          )}
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.modalBtnConfirm}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={s.modalBtnConfirmText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal selector genérico ──────────────────────────────────────────────────

function SelectorModal<T extends string>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetBackdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={s.sheetHandle} />
        <Text style={s.sheetTitle}>{title}</Text>
        {options.map((opt, i) => (
          <View key={opt.key}>
            <TouchableOpacity
              style={s.sheetOption}
              onPress={() => { onSelect(opt.key); onClose(); }}
              activeOpacity={0.65}
            >
              <Text style={[s.sheetOptionText, opt.key === selected && { color: theme.accent, fontWeight: "700" }]}>
                {opt.label}
              </Text>
              {opt.key === selected && <Check size={16} color={theme.accent} strokeWidth={2.5} />}
            </TouchableOpacity>
            {i < options.length - 1 && <View style={s.sheetSep} />}
          </View>
        ))}
      </View>
    </Modal>
  );
}

// ─── Sección: Métodos de pago ─────────────────────────────────────────────────

const PAYMENT_TYPE_OPTIONS: { key: PaymentMethodType; label: string }[] = [
  { key: "cash",    label: "💵 Efectivo" },
  { key: "debit",   label: "💳 Débito / Tarjeta" },
  { key: "savings", label: "🐷 Ahorros" },
];

function PaymentMethodsSection() {
  const s = useStyles();
  const methods           = useSettingsStore((s) => s.paymentMethods);
  const addMethod         = useSettingsStore((s) => s.addPaymentMethod);
  const updateMethod      = useSettingsStore((s) => s.updatePaymentMethod);
  const removeMethod      = useSettingsStore((s) => s.removePaymentMethod);

  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null);
  const [editName,   setEditName]   = useState("");
  const [editType,   setEditType]   = useState<PaymentMethodType>("cash");
  const [typeSheet,  setTypeSheet]  = useState(false);
  const [nameModal,  setNameModal]  = useState(false);
  const [addMode,    setAddMode]    = useState(false);

  function openEdit(m: PaymentMethod) {
    setEditTarget(m); setEditName(m.name); setEditType(m.type);
  }

  function openAdd() {
    setEditTarget(null); setEditName(""); setEditType("cash"); setAddMode(true); setNameModal(true);
  }

  function saveEdit(name: string) {
    if (!name.trim()) return;
    if (addMode) {
      addMethod({ id: Date.now().toString(), name: name.trim(), type: editType });
      setAddMode(false);
    } else if (editTarget) {
      updateMethod(editTarget.id, name.trim(), editType);
      setEditTarget(null);
    }
  }

  function confirmDelete(id: string, name: string) {
    if (methods.length <= 1) {
      Alert.alert("No puedes eliminar", "Debes tener al menos un método de pago.");
      return;
    }
    Alert.alert("Eliminar", `¿Eliminar "${name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: () => removeMethod(id) },
    ]);
  }

  const typeLabel = (t: PaymentMethodType) =>
    PAYMENT_TYPE_OPTIONS.find((o) => o.key === t)?.label ?? t;

  return (
    <>
      {methods.map((m, i) => (
        <View key={m.id}>
          <View style={s.payRow}>
            <View style={s.payRowIcon}>
              <Text style={s.payRowEmoji}>
                {m.type === "cash" ? "💵" : m.type === "savings" ? "🐷" : "💳"}
              </Text>
            </View>
            <View style={s.rowText}>
              <Text style={s.rowLabel}>{m.name}</Text>
              <Text style={s.rowSub}>{typeLabel(m.type)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => openEdit(m)}
              style={s.payAction}
              hitSlop={8}
            >
              <Pencil size={15} color={s.rowSub.color as string} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => confirmDelete(m.id, m.name)}
              style={s.payAction}
              hitSlop={8}
            >
              <Trash2 size={15} color="#DC2626" strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {i < methods.length - 1 && <View style={s.rowSep} />}
        </View>
      ))}

      {/* Botón agregar */}
      <TouchableOpacity style={s.addMethodBtn} onPress={openAdd} activeOpacity={0.7}>
        <Plus size={16} color={s.addMethodText.color as string} strokeWidth={2.5} />
        <Text style={s.addMethodText}>Agregar método</Text>
      </TouchableOpacity>

      {/* Modal de nombre */}
      <InputModal
        visible={nameModal || (!!editTarget && !typeSheet)}
        title={addMode ? "Nuevo método de pago" : `Editar "${editTarget?.name}"`}
        placeholder="Ej: Nequi, Bancolombia…"
        value={editName}
        onConfirm={saveEdit}
        onClose={() => { setNameModal(false); setEditTarget(null); setAddMode(false); }}
      />

      {/* Selector de tipo */}
      <SelectorModal
        visible={typeSheet}
        title="Tipo de cuenta"
        options={PAYMENT_TYPE_OPTIONS}
        selected={editType}
        onSelect={setEditType}
        onClose={() => setTypeSheet(false)}
      />
    </>
  );
}

// ─── Screen principal ─────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const s      = useStyles();
  const theme  = useTheme();
  const insets = useSafeAreaInsets();

  const monthlyBudget       = useSettingsStore((s) => s.monthlyBudget);
  const budgetPeriod        = useSettingsStore((s) => s.budgetPeriod);
  const darkMode            = useSettingsStore((s) => s.darkMode);
  const budgetByCategory    = useSettingsStore((s) => s.budgetByCategory);

  const setMonthlyBudget        = useSettingsStore((s) => s.setMonthlyBudget);
  const setBudgetPeriod         = useSettingsStore((s) => s.setBudgetPeriod);
  const setDarkMode             = useSettingsStore((s) => s.setDarkMode);
  const setBudgetForCategory    = useSettingsStore((s) => s.setBudgetForCategory);
  const removeBudgetForCategory = useSettingsStore((s) => s.removeBudgetForCategory);

  // Modals state
  const [budgetModal,        setBudgetModal]        = useState(false);
  const [periodSheet,        setPeriodSheet]        = useState(false);
  const [darkSheet,          setDarkSheet]          = useState(false);
  const [catBudgetEmoji,     setCatBudgetEmoji]     = useState<string | null>(null);
  const [showPaymentModal,   setShowPaymentModal]   = useState(false);
  const [showCatBudgetModal, setShowCatBudgetModal] = useState(false);

  const transactions = useFinanceStore((s) => s.transactions);

  // ── Exportar CSV ────────────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const { shareAsync } = await import("expo-sharing");
      const { StorageAccessFramework } = await import("expo-file-system");
      const FileSystem = await import("expo-file-system");

      const header = "id,fecha,descripcion,categoria,monto,tags\n";
      const rows = transactions
        .map((t) =>
          [
            t.id,
            t.date,
            `"${t.description.replace(/"/g, '""')}"`,
            t.category_emoji,
            t.amount,
            `"${t.tags ?? ""}"`,
          ].join(",")
        )
        .join("\n");

      const csv = header + rows;
      const uri = FileSystem.documentDirectory + "mywallet_export.csv";
      await FileSystem.default.writeAsStringAsync(uri, csv, { encoding: "utf8" });
      await shareAsync(uri, { mimeType: "text/csv", dialogTitle: "Exportar transacciones" });
    } catch {
      Alert.alert("Error", "No se pudo exportar. Intenta de nuevo.");
    }
  }

  // ── Limpiar datos ────────────────────────────────────────────────────────────
  function handleClearData() {
    Alert.alert(
      "Limpiar todos los datos",
      "Esto eliminará TODAS tus transacciones. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todo",
          style: "destructive",
          onPress: async () => {
            const { clearTransactions } = await import("@/src/db/db");
            await clearTransactions();
            useFinanceStore.getState().loadTransactions();
          },
        },
      ]
    );
  }

  const periodLabel = budgetPeriod === "monthly" ? "Mensual (1–30)" : "Quincenal (1–15 / 16–30)";
  const darkLabel   = darkMode === "system" ? "Según el sistema" : darkMode === "light" ? "Claro" : "Oscuro";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12} activeOpacity={0.65}>
          <ChevronLeft size={24} color={s.headerTitle.color as string} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Configuración</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ── CONTROL FINANCIERO ───────────────────────────────────────── */}
        <SectionHeader title="CONTROL FINANCIERO" />
        <View style={s.card}>
          <SettingRow
            icon={<Wallet size={18} color="#059669" strokeWidth={1.8} />}
            label="Presupuesto mensual"
            subtitle={formatCOP(monthlyBudget)}
            onPress={() => setBudgetModal(true)}
          />
          <View style={s.rowSep} />
          <SettingRow
            icon={<CalendarDays size={18} color="#D97706" strokeWidth={1.8} />}
            label="Período de pago"
            subtitle={periodLabel}
            onPress={() => setPeriodSheet(true)}
          />
        </View>

        {/* ── SUBMENUS ─────────────────────────────────────────────────── */}
        <SectionHeader title="GESTIÓN" />
        <SubMenuCard
          icon={<CreditCard size={18} color={theme.accent} strokeWidth={1.8} />}
          label="Métodos de pago"
          description="Gestiona tus cuentas y formas de pago"
          onPress={() => setShowPaymentModal(true)}
        />
        <View style={{ height: 8 }} />
        <SubMenuCard
          icon={<PiggyBank size={18} color="#7C3AED" strokeWidth={1.8} />}
          label="Presupuesto por categoría"
          description="Configura límites de gasto para cada categoría"
          onPress={() => setShowCatBudgetModal(true)}
        />

        {/* ── APARIENCIA ───────────────────────────────────────────────── */}
        <SectionHeader title="APARIENCIA" />
        <View style={s.card}>
          <SettingRow
            icon={<Moon size={18} color="#7C3AED" strokeWidth={1.8} />}
            label="Modo oscuro"
            subtitle={darkLabel}
            onPress={() => setDarkSheet(true)}
          />
        </View>

        {/* ── SISTEMA ──────────────────────────────────────────────────── */}
        <SectionHeader title="SISTEMA" />
        <View style={s.card}>
          <SettingRow
            icon={<Download size={18} color={theme.textSub} strokeWidth={1.8} />}
            label="Exportar datos"
            subtitle="Descarga tus transacciones en CSV"
            onPress={handleExport}
          />
          <View style={s.rowSep} />
          <SettingRow
            icon={<Trash2 size={18} color="#DC2626" strokeWidth={1.8} />}
            label="Limpiar todos los datos"
            subtitle="Elimina todas las transacciones"
            onPress={handleClearData}
            danger
          />
        </View>

        {/* Versión */}
        <View style={s.versionRow}>
          <Text style={s.versionText}>MYWALLET v{APP_VERSION}</Text>
        </View>

      </ScrollView>

      {/* ── Modales ───────────────────────────────────────────────────── */}

      <InputModal
        visible={budgetModal}
        title="Presupuesto mensual"
        placeholder="Ej: 2000000"
        value={monthlyBudget > 0 ? String(monthlyBudget) : ""}
        keyboardType="numeric"
        onConfirm={(v) => setMonthlyBudget(parseFloat(v.replace(/\D/g, "")) || 0)}
        onClose={() => setBudgetModal(false)}
      />

      <SelectorModal
        visible={periodSheet}
        title="Período de pago"
        options={[
          { key: "monthly",   label: "Mensual (1–30)" },
          { key: "biweekly",  label: "Quincenal (1–15 / 16–30)" },
        ]}
        selected={budgetPeriod}
        onSelect={setBudgetPeriod}
        onClose={() => setPeriodSheet(false)}
      />

      <SelectorModal
        visible={darkSheet}
        title="Modo de apariencia"
        options={[
          { key: "system", label: "Según el sistema" },
          { key: "light",  label: "Claro" },
          { key: "dark",   label: "Oscuro" },
        ]}
        selected={darkMode}
        onSelect={setDarkMode}
        onClose={() => setDarkSheet(false)}
      />

      {/* ── Modal pantalla completa: Métodos de pago ─────────────────── */}
      <FullScreenModal
        visible={showPaymentModal}
        title="Métodos de pago"
        onClose={() => setShowPaymentModal(false)}
      >
        <View style={s.card}>
          <PaymentMethodsSection />
        </View>
      </FullScreenModal>

      {/* ── Modal pantalla completa: Presupuesto por categoría ───────── */}
      <FullScreenModal
        visible={showCatBudgetModal}
        title="Presupuesto por categoría"
        onClose={() => setShowCatBudgetModal(false)}
      >
        <View style={s.card}>
          {ALL_CATEGORY_EMOJIS.map((emoji, i) => {
            const catName = (EMOJI_TO_CATEGORY_NAME[emoji] ?? emoji);
            const label   = catName.charAt(0).toUpperCase() + catName.slice(1).toLowerCase();
            const current = budgetByCategory[emoji];
            return (
              <View key={emoji}>
                <TouchableOpacity
                  style={s.row}
                  onPress={() => setCatBudgetEmoji(emoji)}
                  activeOpacity={0.65}
                >
                  <View style={s.rowIcon}>
                    <Text style={{ fontSize: 18 }}>{emoji}</Text>
                  </View>
                  <View style={s.rowText}>
                    <Text style={s.rowLabel}>{label}</Text>
                    {current ? (
                      <Text style={[s.rowSub, { color: "#059669" }]}>
                        Límite: {formatCOP(current)}
                      </Text>
                    ) : (
                      <Text style={s.rowSub}>Sin límite</Text>
                    )}
                  </View>
                  {current ? (
                    <TouchableOpacity
                      onPress={() => removeBudgetForCategory(emoji)}
                      hitSlop={10}
                      style={{ padding: 4 }}
                    >
                      <X size={14} color="#DC2626" strokeWidth={2.5} />
                    </TouchableOpacity>
                  ) : null}
                  <ChevronRight size={16} color="#64748B" strokeWidth={2} />
                </TouchableOpacity>
                {i < ALL_CATEGORY_EMOJIS.length - 1 && <View style={s.rowSep} />}
              </View>
            );
          })}
        </View>
      </FullScreenModal>

      {/* Modal presupuesto por categoría (input) */}
      {catBudgetEmoji && (
        <InputModal
          visible
          title={`Límite para ${catBudgetEmoji} ${
            (() => {
              const n = EMOJI_TO_CATEGORY_NAME[catBudgetEmoji] ?? "";
              return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
            })()
          }`}
          placeholder="Ej: 500000"
          value={budgetByCategory[catBudgetEmoji] ? String(budgetByCategory[catBudgetEmoji]) : ""}
          keyboardType="numeric"
          onConfirm={(v) => {
            const amount = parseFloat(v.replace(/\D/g, "")) || 0;
            if (amount > 0) setBudgetForCategory(catBudgetEmoji, amount);
            else removeBudgetForCategory(catBudgetEmoji);
          }}
          onClose={() => setCatBudgetEmoji(null)}
        />
      )}

    </SafeAreaView>
  );
}

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) { return StyleSheet.create({
  safe:        { flex: 1, backgroundColor: t.bg },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: t.bg,
  },
  backBtn: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: t.text,
    letterSpacing: -0.5,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: t.textSub,
    letterSpacing: 1.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },

  card: {
    backgroundColor: t.surface,
    borderRadius: 16,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    minHeight: 60,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.inputBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: t.text, lineHeight: 20 },
  rowSub:   { fontSize: 13, color: t.textSub, marginTop: 1 },
  rowSep:   { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 64 },

  payRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  payRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.inputBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  payRowEmoji: { fontSize: 18 },
  payAction: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  addMethodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.border,
  },
  addMethodText: { fontSize: 14, fontWeight: "600", color: t.accent },

  versionRow:  { alignItems: "center", marginTop: 32 },
  versionText: { fontSize: 12, color: t.textSub, letterSpacing: 1.5, fontWeight: "500" },

  subCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: t.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  subCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.inputBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  subCardText: { flex: 1 },
  subCardLabel: { fontSize: 15, fontWeight: "700", color: t.text, lineHeight: 20 },
  subCardDesc:  { fontSize: 13, color: t.textSub, marginTop: 2, lineHeight: 18 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: t.surface,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: t.text },
  modalMoneyPrefix: {
    fontSize: 13,
    fontWeight: "600",
    color: t.textSub,
    marginBottom: -8,
  },
  modalMoneySuffix: {
    fontSize: 12,
    fontWeight: "500",
    color: t.textSub,
    textAlign: "right",
    marginTop: -8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: t.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: t.text,
    backgroundColor: t.bg,
  },
  modalInputMoney: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: t.text,
    textAlign: "right",
  },
  modalBtns:          { flexDirection: "row", gap: 10 },
  modalBtnCancel:     { flex: 1, padding: 13, borderRadius: 12, backgroundColor: t.inputBg, alignItems: "center" },
  modalBtnCancelText: { fontSize: 15, fontWeight: "600", color: t.textSub },
  modalBtnConfirm:    { flex: 1, padding: 13, borderRadius: 12, backgroundColor: t.accent, alignItems: "center" },
  modalBtnConfirmText:{ fontSize: 15, fontWeight: "700", color: "#FFFFFF" },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: t.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 12,
    elevation: 24,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: t.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17, fontWeight: "700", color: t.text,
    paddingHorizontal: 20, marginBottom: 4,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetOptionText: { fontSize: 15, color: t.text },
  sheetSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.border,
    marginHorizontal: 20,
  },
});}

function useStyles() {
  const t = useTheme();
  return useMemo(() => buildStyles(t), [t]);
}
