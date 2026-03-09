/**
 * app/settings.tsx — Modal de Configuración
 * Diseño: Stitch "Professional Settings Interface"
 */
import { useState, useRef, useEffect } from "react";
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
  User,
  Wallet,
  CalendarDays,
  CreditCard,
  PiggyBank,
  Moon,
  Download,
  Info,
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

// ─── Constantes ───────────────────────────────────────────────────────────────
const ACCENT     = "#135BEC";
const SLATE_900  = "#0F172A";
const SLATE_500  = "#64748B";
const SLATE_200  = "#E2E8F0";
const WHITE      = "#FFFFFF";
const BG         = "#F8F9FA";
const CARD_BG    = "#FFFFFF";

const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOP(value: number): string {
  if (value <= 0) return "Sin configurar";
  return `$ ${Math.round(value).toLocaleString("es-ES")} COP`;
}


// ─── Componentes de sección ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
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
      {rightElement ?? (onPress ? <ChevronRight size={16} color={SLATE_500} strokeWidth={2} /> : null)}
    </TouchableOpacity>
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
            placeholderTextColor={SLATE_500}
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
              <Text style={[s.sheetOptionText, opt.key === selected && { color: ACCENT, fontWeight: "700" }]}>
                {opt.label}
              </Text>
              {opt.key === selected && <Check size={16} color={ACCENT} strokeWidth={2.5} />}
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
              <Pencil size={15} color={SLATE_500} strokeWidth={2} />
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
        <Plus size={16} color={ACCENT} strokeWidth={2.5} />
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
  const insets = useSafeAreaInsets();

  const userName            = useSettingsStore((s) => s.userName);
  const monthlyBudget       = useSettingsStore((s) => s.monthlyBudget);
  const budgetPeriod        = useSettingsStore((s) => s.budgetPeriod);
  const darkMode            = useSettingsStore((s) => s.darkMode);
  const budgetByCategory    = useSettingsStore((s) => s.budgetByCategory);

  const setUserName             = useSettingsStore((s) => s.setUserName);
  const setMonthlyBudget        = useSettingsStore((s) => s.setMonthlyBudget);
  const setBudgetPeriod         = useSettingsStore((s) => s.setBudgetPeriod);
  const setDarkMode             = useSettingsStore((s) => s.setDarkMode);
  const setBudgetForCategory    = useSettingsStore((s) => s.setBudgetForCategory);
  const removeBudgetForCategory = useSettingsStore((s) => s.removeBudgetForCategory);

  // Modals state
  const [budgetModal,    setBudgetModal]    = useState(false);
  const [nameModal,      setNameModal]      = useState(false);
  const [periodSheet,    setPeriodSheet]    = useState(false);
  const [darkSheet,      setDarkSheet]      = useState(false);
  const [catBudgetEmoji, setCatBudgetEmoji] = useState<string | null>(null);

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
          <ChevronLeft size={24} color={SLATE_900} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Configuración</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}
      >

        {/* ── PERSONALIZACIÓN ─────────────────────────────────────────── */}
        <SectionHeader title="PERSONALIZACIÓN" />
        <View style={s.card}>
          <SettingRow
            icon={<User size={18} color={ACCENT} strokeWidth={1.8} />}
            label="Tu nombre"
            subtitle={userName || "Sin configurar"}
            onPress={() => setNameModal(true)}
          />
        </View>

        {/* ── PRESUPUESTO ──────────────────────────────────────────────── */}
        <SectionHeader title="PRESUPUESTO" />
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

        {/* ── CUENTAS ──────────────────────────────────────────────────── */}
        <SectionHeader title="MÉTODOS DE PAGO" />
        <View style={s.card}>
          <PaymentMethodsSection />
        </View>

        {/* ── PRESUPUESTO POR CATEGORÍA ────────────────────────────────── */}
        <SectionHeader title="PRESUPUESTO POR CATEGORÍA" />
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
            icon={<Download size={18} color={SLATE_500} strokeWidth={1.8} />}
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
        visible={nameModal}
        title="¿Cómo te llamas?"
        placeholder="Tu nombre…"
        value={userName}
        onConfirm={(v) => setUserName(v.trim())}
        onClose={() => setNameModal(false)}
      />

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

      {/* Modal presupuesto por categoría */}
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

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: BG },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: BG,
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
    color: SLATE_900,
    letterSpacing: -0.5,
  },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  // Sección
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: SLATE_500,
    letterSpacing: 1.8,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Card
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    overflow: "hidden",
  },

  // Row
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
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText:  { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "600", color: SLATE_900, lineHeight: 20 },
  rowSub:   { fontSize: 13, color: SLATE_500, marginTop: 1 },
  rowSep:   { height: StyleSheet.hairlineWidth, backgroundColor: SLATE_200, marginLeft: 64 },

  // Payment methods
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
    backgroundColor: "#F1F5F9",
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
    borderTopColor: SLATE_200,
  },
  addMethodText: { fontSize: 14, fontWeight: "600", color: ACCENT },

  // Versión
  versionRow:  { alignItems: "center", marginTop: 32 },
  versionText: { fontSize: 12, color: SLATE_500, letterSpacing: 1.5, fontWeight: "500" },

  // Input modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: SLATE_900 },
  modalMoneyPrefix: {
    fontSize: 13,
    fontWeight: "600",
    color: SLATE_500,
    marginBottom: -8,
  },
  modalMoneySuffix: {
    fontSize: 12,
    fontWeight: "500",
    color: SLATE_500,
    textAlign: "right",
    marginTop: -8,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: SLATE_200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: SLATE_900,
  },
  modalInputMoney: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: SLATE_900,
    textAlign: "right",
  },
  modalBtns:          { flexDirection: "row", gap: 10 },
  modalBtnCancel:     { flex: 1, padding: 13, borderRadius: 12, backgroundColor: "#F1F5F9", alignItems: "center" },
  modalBtnCancelText: { fontSize: 15, fontWeight: "600", color: SLATE_500 },
  modalBtnConfirm:    { flex: 1, padding: 13, borderRadius: 12, backgroundColor: ACCENT, alignItems: "center" },
  modalBtnConfirmText:{ fontSize: 15, fontWeight: "700", color: WHITE },

  // Sheet bottom
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingTop: 12,
    elevation: 24,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: SLATE_200,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17, fontWeight: "700", color: SLATE_900,
    paddingHorizontal: 20, marginBottom: 4,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetOptionText: { fontSize: 15, color: SLATE_900 },
  sheetSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: SLATE_200,
    marginHorizontal: 20,
  },
});
