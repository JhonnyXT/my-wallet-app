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
  Animated,
  PanResponder,
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
import { useSettingsStore, type PaymentMethod, type PaymentMethodType, type SavingsGoal } from "@/src/store/useSettingsStore";
import { ALL_CATEGORY_EMOJIS, EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

// ─── Constantes ───────────────────────────────────────────────────────────────
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const GOAL_EMOJIS = [
  "✈️", "🏖️", "🏠", "🏡", "🎁", "🚗", "🎓", "💻",
  "🎮", "👟", "💍", "🏥", "🐶", "🌍", "🎵", "🎯",
];

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
      <KeyboardAvoidingView style={s.modalOverlay} behavior="padding">
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

// ─── Popup: Nueva Meta ────────────────────────────────────────────────────────

function NuevaMetaModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const s               = useStyles();
  const theme           = useTheme();
  const addSavingsGoal  = useSettingsStore((st) => st.addSavingsGoal);

  const [selectedEmoji, setSelectedEmoji] = useState("✈️");
  const [name,          setName]          = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");

  useEffect(() => {
    if (!visible) { setSelectedEmoji("✈️"); setName(""); setTargetDisplay(""); }
  }, [visible]);

  const canCreate = name.trim().length > 0 && targetDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const target = parseInt(targetDisplay.replace(/\D/g, ""), 10);
    if (!name.trim() || !target) return;
    addSavingsGoal({ name: name.trim(), emoji: selectedEmoji, targetAmount: target, savedAmount: 0 });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior="padding"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.modalCard, { gap: 20 }]}>
          {/* Título */}
          <View style={{ gap: 3 }}>
            <Text style={s.modalTitle}>Nueva Meta</Text>
            <Text style={s.rowSub}>Define tu próximo objetivo de ahorro</Text>
          </View>

          {/* Selector de emoji */}
          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Icono de la meta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {GOAL_EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setSelectedEmoji(e)}
                    activeOpacity={0.7}
                    style={{
                      width: 46, height: 46, borderRadius: 23,
                      backgroundColor: selectedEmoji === e
                        ? theme.accent + "22"
                        : theme.inputBg,
                      alignItems: "center", justifyContent: "center",
                      borderWidth: selectedEmoji === e ? 2 : 0,
                      borderColor: selectedEmoji === e ? theme.accent : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Nombre */}
          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Nombre de la meta</Text>
            <TextInput
              style={s.modalInput}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Viaje a Japón"
              placeholderTextColor={theme.textSub}
              autoCapitalize="sentences"
            />
          </View>

          {/* Monto objetivo */}
          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Monto objetivo</Text>
            <View style={[s.goalAmountRow]}>
              <Text style={s.goalAmountPrefix}>$ COP</Text>
              <TextInput
                style={s.goalAmountInput}
                value={targetDisplay}
                onChangeText={(t) =>
                  setTargetDisplay(formatMoneyInput(t.replace(/\D/g, "")))
                }
                placeholder="0"
                placeholderTextColor={theme.textSub}
                keyboardType="number-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* Botones */}
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={canCreate ? s.modalBtnConfirm : s.modalBtnConfirmDisabled}
              onPress={handleCreate}
              disabled={!canCreate}
              activeOpacity={0.7}
            >
              <Text style={canCreate ? s.modalBtnConfirmText : s.modalBtnConfirmTextOff}>Crear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Popup: Abonar a Meta ─────────────────────────────────────────────────────

function AbonarMetaModal({
  goal,
  visible,
  onClose,
}: {
  goal: SavingsGoal | null;
  visible: boolean;
  onClose: () => void;
}) {
  const s                 = useStyles();
  const theme             = useTheme();
  const updateSavingsGoal = useSettingsStore((st) => st.updateSavingsGoal);

  const [abonoDisplay, setAbonoDisplay] = useState("");

  useEffect(() => { if (!visible) setAbonoDisplay(""); }, [visible]);

  if (!goal) return null;

  const abono        = parseInt(abonoDisplay.replace(/\D/g, ""), 10) || 0;
  const currentPct   = goal.targetAmount > 0
    ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
  const projectedPct = goal.targetAmount > 0
    ? Math.min(100, ((goal.savedAmount + abono) / goal.targetAmount) * 100) : 0;
  const deltaPct     = Math.round(projectedPct - currentPct);

  const fmt = (v: number) =>
    `$${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const handleAbonar = () => {
    if (abono <= 0) return;
    updateSavingsGoal(goal.id, goal.savedAmount + abono);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalOverlay}
        behavior="padding"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.modalCard, { gap: 16 }]}>
          {/* Título */}
          <View style={{ gap: 3 }}>
            <Text style={s.modalTitle}>Abonar a meta</Text>
            <Text style={s.rowSub}>{goal.emoji} {goal.name}</Text>
          </View>

          {/* Campo de monto */}
          <View style={[s.goalAmountRow, { paddingVertical: 4 }]}>
            <Text style={[s.goalAmountPrefix, { fontSize: 20, fontWeight: "700" }]}>$</Text>
            <TextInput
              style={[s.goalAmountInput, { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }]}
              value={abonoDisplay}
              onChangeText={(t) =>
                setAbonoDisplay(formatMoneyInput(t.replace(/\D/g, "")))
              }
              placeholder="0"
              placeholderTextColor={theme.textSub}
              keyboardType="number-pad"
              autoFocus
              textAlign="right"
            />
            <Text style={[s.goalAmountPrefix, { marginLeft: 6 }]}>COP</Text>
          </View>

          {/* Progreso proyectado */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.goalFieldLabel}>PROGRESO PROYECTADO</Text>
              <Text style={s.goalFieldLabel}>META TOTAL</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                {Math.round(projectedPct)}% ({fmt(goal.savedAmount + abono)})
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                {fmt(goal.targetAmount)}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: theme.inputBg, borderRadius: 4, overflow: "hidden" }}>
              <View
                style={{
                  height: 8,
                  width: `${projectedPct}%`,
                  backgroundColor: theme.accent,
                  borderRadius: 4,
                }}
              />
            </View>
            {abono > 0 && deltaPct > 0 && (
              <Text style={{ fontSize: 12, fontWeight: "600", color: theme.accent, textAlign: "center" }}>
                +{deltaPct}% con este abono
              </Text>
            )}
          </View>

          {/* Botones */}
          <View style={s.modalBtns}>
            <TouchableOpacity style={s.modalBtnCancel} onPress={onClose} activeOpacity={0.7}>
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={abono > 0 ? s.modalBtnConfirm : s.modalBtnConfirmDisabled}
              onPress={handleAbonar}
              disabled={abono <= 0}
              activeOpacity={0.7}
            >
              <Text style={abono > 0 ? s.modalBtnConfirmText : s.modalBtnConfirmTextOff}>Abonar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sección: Metas de Ahorro ─────────────────────────────────────────────────

// ─── Item de meta con swipe-to-delete ────────────────────────────────────────
const DELETE_W = 72;
const SWIPE_THRESH = 48;

function SwipeableGoalItem({
  goal,
  onDelete,
  onAbonar,
}: {
  goal: SavingsGoal;
  onDelete: () => void;
  onAbonar: () => void;
}) {
  const theme = useTheme();
  const s     = useStyles();

  const pct  = goal.targetAmount > 0
    ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
  const done = pct >= 100;

  const fmt = (v: number) =>
    `$${Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen     = useRef(false);

  const spring = (toValue: number) =>
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        const base = isOpen.current ? -DELETE_W : 0;
        translateX.setValue(Math.min(0, base + g.dx));
      },
      onPanResponderRelease: (_, g) => {
        if (isOpen.current) {
          g.dx > 20 ? (isOpen.current = false, spring(0)) : spring(-DELETE_W);
        } else {
          if (g.dx < -SWIPE_THRESH) { isOpen.current = true; spring(-DELETE_W); }
          else spring(0);
        }
      },
    })
  ).current;

  function handleDelete() {
    Animated.timing(translateX, { toValue: -400, duration: 200, useNativeDriver: true })
      .start(() => onDelete());
  }

  return (
    <View style={[swipeGoalSt.wrapper, { backgroundColor: theme.isDark ? theme.itemBg : "#FFFFFF" }]}>
      {/* Botón eliminar — detrás */}
      <View style={swipeGoalSt.deleteArea}>
        <TouchableOpacity style={swipeGoalSt.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
          <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Contenido deslizable */}
      <Animated.View
        style={[
          swipeGoalSt.row,
          { backgroundColor: theme.isDark ? theme.itemBg : "#FFFFFF", transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        {done ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 28 }}>{goal.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#059669" }}>¡Meta alcanzada!</Text>
              <Text style={{ fontSize: 13, color: theme.textSub, marginTop: 2 }}>Ahorro completado con éxito</Text>
            </View>
            <Text style={{ fontSize: 22 }}>🎉</Text>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 24 }}>{goal.emoji}</Text>
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: theme.text }}>
                {goal.name}
              </Text>
              <TouchableOpacity
                style={{ backgroundColor: "#135BEC", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}
                onPress={onAbonar}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#FFFFFF" }}>Abonar</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 6, backgroundColor: theme.inputBg, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ height: 6, width: `${pct}%` as `${number}%`, backgroundColor: "#135BEC", borderRadius: 3 }} />
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 12, color: theme.textSub }}>{fmt(goal.savedAmount)} / {fmt(goal.targetAmount)}</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#135BEC" }}>{Math.round(pct)}%</Text>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const swipeGoalSt = StyleSheet.create({
  wrapper: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteArea: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_W,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    padding: 16,
    gap: 10,
    borderRadius: 16,
  },
});

// ─── Sección principal de metas ───────────────────────────────────────────────
function SavingsGoalsSection() {
  const s                = useStyles();
  const theme            = useTheme();
  const savingsGoals     = useSettingsStore((st) => st.savingsGoals);
  const removeSavingsGoal = useSettingsStore((st) => st.removeSavingsGoal);

  const [showNuevaMeta, setShowNuevaMeta] = useState(false);
  const [abonarGoal,    setAbonarGoal]    = useState<SavingsGoal | null>(null);

  return (
    <>
      {savingsGoals.length === 0 ? (
        /* ── Estado vacío ─────────────────────────────────────────────── */
        <View style={[s.card, { padding: 24, alignItems: "center", gap: 10 }]}>
          <Text style={{ fontSize: 32 }}>🎯</Text>
          <Text style={{ fontSize: 14, color: theme.textSub, textAlign: "center", lineHeight: 20 }}>
            Aún no tienes metas de ahorro{"\n"}define una y empieza hoy
          </Text>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}
            onPress={() => setShowNuevaMeta(true)}
            activeOpacity={0.7}
          >
            <Plus size={15} color={theme.accent} strokeWidth={2.5} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.accent }}>Nueva meta</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Lista de metas ───────────────────────────────────────────── */
        <>
          {savingsGoals.map((goal) => (
            <SwipeableGoalItem
              key={goal.id}
              goal={goal}
              onDelete={() => removeSavingsGoal(goal.id)}
              onAbonar={() => setAbonarGoal(goal)}
            />
          ))}

          {/* Botón nueva meta */}
          <TouchableOpacity
            style={[s.card, { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }]}
            onPress={() => setShowNuevaMeta(true)}
            activeOpacity={0.7}
          >
            <View style={[s.rowIcon]}>
              <Plus size={18} color={theme.accent} strokeWidth={2.5} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.accent }}>Nueva meta</Text>
          </TouchableOpacity>
        </>
      )}

      <NuevaMetaModal visible={showNuevaMeta} onClose={() => setShowNuevaMeta(false)} />
      <AbonarMetaModal
        goal={abonarGoal}
        visible={!!abonarGoal}
        onClose={() => setAbonarGoal(null)}
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

  // ── Indicador quincenal ──────────────────────────────────────────────────────
  const today          = new Date();
  const dayOfMonth     = today.getDate();
  const isFirstHalf    = dayOfMonth <= 15;
  const lastDay        = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const MONTH_NAMES    = ["enero","febrero","marzo","abril","mayo","junio",
                          "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const monthName      = MONTH_NAMES[today.getMonth()];
  const quincenaText   = isFirstHalf
    ? `Quincena actual: 1–15 de ${monthName}`
    : `Quincena actual: 16–${lastDay} de ${monthName}`;

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
          {/* Indicador quincenal — solo visible cuando período es quincenal */}
          {budgetPeriod === "biweekly" && (
            <View style={s.biweeklyIndicator}>
              <View style={s.biweeklySegments}>
                <View style={[s.biweeklySegment, isFirstHalf && s.biweeklySegmentActive]}>
                  <Text style={[s.biweeklySegmentText, isFirstHalf && { color: theme.accent }]}>
                    1 – 15
                  </Text>
                </View>
                <View style={[s.biweeklySegment, !isFirstHalf && s.biweeklySegmentActive]}>
                  <Text style={[s.biweeklySegmentText, !isFirstHalf && { color: theme.accent }]}>
                    16 – {lastDay}
                  </Text>
                </View>
              </View>
              <Text style={s.biweeklyLabel}>{quincenaText}</Text>
            </View>
          )}
        </View>

        {/* ── GESTIÓN ──────────────────────────────────────────────────── */}
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

        {/* ── METAS DE AHORRO ──────────────────────────────────────────── */}
        <SectionHeader title="METAS DE AHORRO" />
        <SavingsGoalsSection />

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
  modalBtns:              { flexDirection: "row", gap: 10 },
  modalBtnCancel:         { flex: 1, padding: 13, borderRadius: 12, backgroundColor: t.inputBg, alignItems: "center" },
  modalBtnCancelText:     { fontSize: 15, fontWeight: "600", color: t.textSub },
  modalBtnConfirm:        { flex: 1, padding: 13, borderRadius: 12, backgroundColor: "#135BEC", alignItems: "center" },
  modalBtnConfirmDisabled:{ flex: 1, padding: 13, borderRadius: 12, backgroundColor: t.border, alignItems: "center" },
  modalBtnConfirmText:    { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  modalBtnConfirmTextOff: { fontSize: 15, fontWeight: "700", color: t.textSub },

  // ── Indicador quincenal ──────────────────────────────────────────────────
  biweeklyIndicator: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  biweeklySegments: {
    flexDirection: "row" as const,
    gap: 6,
  },
  biweeklySegment: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center" as const,
    backgroundColor: t.inputBg,
  },
  biweeklySegmentActive: {
    backgroundColor: t.accent + "18",
    borderWidth: 1,
    borderColor: t.accent + "40",
  },
  biweeklySegmentText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: t.textSub,
  },
  biweeklyLabel: {
    fontSize: 12,
    color: t.textSub,
    textAlign: "center" as const,
  },

  // ── Metas de ahorro — campos de modales ──────────────────────────────────
  goalFieldLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: t.textSub,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  goalAmountRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderWidth: 1.5,
    borderColor: t.border,
    borderRadius: 12,
    backgroundColor: t.bg,
    paddingHorizontal: 14,
  },
  goalAmountPrefix: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: t.textSub,
    marginRight: 8,
  },
  goalAmountInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 18,
    fontWeight: "700" as const,
    color: t.text,
  },

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
