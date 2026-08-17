/**
 * app/settings.tsx — Modal de Configuración
 * Diseño: lista agrupada (Card + SectionHeader + ListRow + Divider) sobre la capa
 * aditiva de tokens (src/theme/tokens.ts) — puerto del patrón "menú de Ajustes" de
 * Habit Tracker. Header de pantalla apilada (StackedScreenHeader) en vez de header
 * nativo, título grande en el body.
 */
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { Card, SectionHeader, Divider } from "@/src/components/ui/Card";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Enter } from "@/src/components/ui/Enter";
import { GuidedTour, type TourStep } from "@/src/components/ui/GuidedTour";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { ListRow } from "@/src/components/ui/ListRow";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { StackedScreenHeader } from "@/src/components/ui/StackedScreenHeader";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { AUTO_DETECT_ENABLED_KEY, ALLOWED_BANKS_KEY } from "@/src/constants/banks";
import { CURATED_EMOJIS, type UserCategory } from "@/src/constants/categoryPresets";
import { useTheme } from "@/src/context/ThemeContext";
import {
  cancelDebtReminder,
  checkAndNotifyGoalCompleted,
  notifyDebtPaidOff,
  requestNotificationPermissions,
  scheduleDebtReminder,
} from "@/src/services/notificationService";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import {
  useSettingsStore,
  type Debt,
  type PaymentMethod,
  type PaymentMethodType,
  type SavingsGoal,
} from "@/src/store/useSettingsStore";
import type { AppTheme } from "@/src/theme";
import { useAppTokens } from "@/src/theme/tokens";
import { hexToHue, hueToColors } from "@/src/utils/colorUtils";
import { formatMoneyInput } from "@/src/utils/formatMoney";
import { KNOWN_BANKS } from "@/src/utils/notificationParser";
import { getTourRef, TOUR_KEYS } from "@/src/utils/tourRefs";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  BatteryWarning,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  HandCoins,
  Landmark,
  LayoutGrid,
  Moon,
  Pencil,
  PiggyBank,
  Plus,
  Radar,
  Target,
  Trash2,
  Wallet,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RNAndroidNotificationListener from "react-native-android-notification-listener";
import Reanimated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
// ─── Constantes ───────────────────────────────────────────────────────────────
const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0";

const GOAL_EMOJIS = [
  "✈️",
  "🏖️",
  "🏠",
  "🏡",
  "🎁",
  "🚗",
  "🎓",
  "💻",
  "🎮",
  "👟",
  "💍",
  "🏥",
  "🐶",
  "🌍",
  "🎵",
  "🎯",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCOP(value: number): string {
  if (value <= 0) return "Sin configurar";
  return `$ ${Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")} COP`;
}

// ─── Wrapper modal pantalla completa ─────────────────────────────────────────

/** Sección de Alertas de Presupuesto con toggle + slider custom */
function BudgetAlertSection({
  enabled,
  threshold,
  onToggle,
  onThresholdChange,
}: {
  enabled: boolean;
  threshold: number;
  onToggle: (v: boolean) => void;
  onThresholdChange: (v: number) => void;
}) {
  const tokens = useAppTokens();
  const THUMB = 28;
  const pct = Math.min(100, Math.max(0, threshold));

  const trackWRef = useRef(0);
  const [trackWState, setTrackWState] = useState(0);
  const [liveValue, setLiveValue] = useState(pct);
  const offset = useRef(new Animated.Value(pct / 100)).current;
  const trackPageX = useRef(0);

  // Sincronizar cuando threshold cambia desde el store
  useEffect(() => {
    setLiveValue(pct);
    offset.setValue(pct / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pct]);

  const usableW = Math.max(0, trackWState - THUMB);

  /** gs.moveX - trackPageX.current = X relativa al track, siempre fiable */
  const toNorm = (absX: number) =>
    Math.min(
      1,
      Math.max(0, (absX - trackPageX.current - THUMB / 2) / Math.max(1, trackWRef.current - THUMB)),
    );

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      // Solo capturar si el movimiento es más horizontal que vertical (evita bloquear el scroll)
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),
      onMoveShouldSetPanResponderCapture: (_, gs) => Math.abs(gs.dx) > Math.abs(gs.dy),

      onPanResponderGrant: (e) => {
        // Guardar el borde izquierdo del track en coordenadas de pantalla
        trackPageX.current = e.nativeEvent.pageX - e.nativeEvent.locationX;
        const norm = toNorm(e.nativeEvent.pageX);
        offset.setValue(norm);
        setLiveValue(Math.round(norm * 100));
      },
      onPanResponderMove: (_, gs) => {
        // gs.moveX: posición absoluta del dedo en pantalla — no salta entre vistas hijas
        const norm = toNorm(gs.moveX);
        offset.setValue(norm);
        setLiveValue(Math.round(norm * 100));
      },
      onPanResponderRelease: (_, gs) => {
        const norm = toNorm(gs.moveX);
        const finalPct = Math.round(norm * 100);
        offset.setValue(norm);
        setLiveValue(finalPct);
        onThresholdChange(finalPct);
      },
    }),
  ).current;

  const alertColor = tokens.colors.state.danger;

  return (
    <View style={{ marginBottom: tokens.spacing.xs }}>
      <Card padded={false}>
        <ListRow
          label="Alertas de presupuesto"
          icon={<Text style={{ fontSize: 16 }}>🔔</Text>}
          iconBg={alertColor}
          right={
            <Switch
              value={enabled}
              onValueChange={onToggle}
              trackColor={{ false: tokens.colors.border.default, true: alertColor }}
              thumbColor="#FFFFFF"
            />
          }
        />

        {/* ── Slider — solo cuando activo ────────────────────────────── */}
        {enabled && (
          <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Divider />
            <View style={{ padding: tokens.spacing.md, paddingTop: tokens.spacing.sm + 2 }}>
              <View style={bAS.sliderRow}>
                <ThemedText variant="subheadline" color="secondary">
                  Umbral de alerta
                </ThemedText>
                <ThemedText variant="body" style={{ fontWeight: "700" }}>
                  {liveValue}%
                </ThemedText>
              </View>

              <View
                {...pan.panHandlers}
                style={bAS.trackOuter}
                onLayout={(e) => {
                  trackWRef.current = e.nativeEvent.layout.width;
                  setTrackWState(e.nativeEvent.layout.width);
                }}
              >
                <View style={[bAS.trackBg, { backgroundColor: tokens.colors.border.default }]} />

                {trackWState > 0 && (
                  <Animated.View
                    style={[
                      bAS.trackFill,
                      {
                        backgroundColor: alertColor,
                        width: offset.interpolate({
                          inputRange: [0, 1],
                          outputRange: [THUMB / 2, usableW + THUMB / 2],
                          extrapolate: "clamp",
                        }),
                      },
                    ]}
                  />
                )}

                {trackWState > 0 && (
                  <Animated.View
                    style={[
                      bAS.thumb,
                      {
                        width: THUMB,
                        height: THUMB,
                        borderRadius: THUMB / 2,
                        backgroundColor: "#FFFFFF",
                        elevation: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.22,
                        shadowRadius: 3,
                        transform: [
                          {
                            translateX: offset.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, usableW],
                              extrapolate: "clamp",
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                )}
              </View>

              <ThemedText variant="footnote" color="secondary" style={{ marginTop: 2 }}>
                {liveValue > 0
                  ? `Te avisaré cuando alcances el ${liveValue}% del presupuesto de cada categoría.`
                  : "Desliza para elegir el porcentaje de alerta. Se recomienda 80%."}
              </ThemedText>
            </View>
          </Reanimated.View>
        )}
      </Card>
    </View>
  );
}

const bAS = StyleSheet.create({
  sliderRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  trackOuter: { height: 26, justifyContent: "center", marginBottom: 10, position: "relative" },
  trackBg: { height: 4, borderRadius: 2, position: "absolute", left: 0, right: 0 },
  trackFill: { height: 4, borderRadius: 2, position: "absolute", left: 0 },
  thumb: { position: "absolute" },
});

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
  const tokens = useAppTokens();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor: tokens.colors.surface.primary }}
        edges={["top"]}
      >
        <StackedScreenHeader onBack={onClose} backAccessibilityLabel="Cerrar" title={title} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: tokens.spacing.md,
            paddingBottom: insets.bottom + tokens.spacing.xl,
            gap: tokens.spacing.md,
          }}
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
  subtitle,
  placeholder,
  value,
  keyboardType = "default",
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  placeholder: string;
  value: string;
  keyboardType?: "default" | "numeric";
  onConfirm: (val: string) => void;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const isMoney = keyboardType === "numeric";

  const toDisplay = (raw: string) => (isMoney ? formatMoneyInput(raw) : raw);

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
          {!!subtitle && <Text style={s.modalSubtitle}>{subtitle}</Text>}
          {isMoney && <Text style={s.modalMoneyPrefix}>$</Text>}
          <TextInput
            style={[s.modalInput, isMoney && s.modalInputMoney]}
            value={display}
            onChangeText={handleChange}
            placeholder={placeholder}
            placeholderTextColor={theme.textSub}
            keyboardType={isMoney ? "number-pad" : keyboardType}
            autoFocus
          />
          {isMoney && display.length > 0 && <Text style={s.modalMoneySuffix}>COP</Text>}
          <View style={s.modalBtns}>
            <PressableScale
              style={s.modalBtnCancel}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </PressableScale>
            <PressableScale style={s.modalBtnConfirm} onPress={handleConfirm}>
              <Text style={s.modalBtnConfirmText}>Guardar</Text>
            </PressableScale>
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
    <BottomSheet visible={visible} onClose={onClose} style={{ paddingBottom: 40 }}>
      <Text style={s.sheetTitle}>{title}</Text>
      {options.map((opt, i) => (
        <View key={opt.key}>
          <TouchableOpacity
            style={s.sheetOption}
            onPress={() => {
              onSelect(opt.key);
              onClose();
            }}
            activeOpacity={0.65}
          >
            <Text
              style={[
                s.sheetOptionText,
                opt.key === selected && { color: theme.accent, fontWeight: "700" },
              ]}
            >
              {opt.label}
            </Text>
            {opt.key === selected && <Check size={16} color={theme.accent} strokeWidth={2.5} />}
          </TouchableOpacity>
          {i < options.length - 1 && <View style={s.sheetSep} />}
        </View>
      ))}
    </BottomSheet>
  );
}

// ─── Sección: Métodos de pago ─────────────────────────────────────────────────

const PAYMENT_TYPE_OPTIONS: { key: PaymentMethodType; label: string }[] = [
  { key: "cash", label: "💵 Efectivo" },
  { key: "debit", label: "💳 Débito / Tarjeta" },
  { key: "savings", label: "🐷 Ahorros" },
];

export function PaymentMethodsSection() {
  const tokens = useAppTokens();
  const methods = useSettingsStore((s) => s.paymentMethods);
  const addMethod = useSettingsStore((s) => s.addPaymentMethod);
  const updateMethod = useSettingsStore((s) => s.updatePaymentMethod);
  const removeMethod = useSettingsStore((s) => s.removePaymentMethod);

  const [editTarget, setEditTarget] = useState<PaymentMethod | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<PaymentMethodType>("cash");
  const [typeSheet, setTypeSheet] = useState(false);
  const [nameModal, setNameModal] = useState(false);
  const [addMode, setAddMode] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [minMethodAlert, setMinMethodAlert] = useState(false);

  function openEdit(m: PaymentMethod) {
    setEditTarget(m);
    setEditName(m.name);
    setEditType(m.type);
  }

  function openAdd() {
    setEditTarget(null);
    setEditName("");
    setEditType("cash");
    setAddMode(true);
    setNameModal(true);
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
      setMinMethodAlert(true);
      return;
    }
    setDeleteDialog({ id, name });
  }

  const typeLabel = (t: PaymentMethodType) =>
    PAYMENT_TYPE_OPTIONS.find((o) => o.key === t)?.label ?? t;

  return (
    <>
      <Card padded={false}>
        {methods.map((m, i) => (
          <View key={m.id}>
            <ListRow
              label={m.name}
              detail={typeLabel(m.type)}
              icon={
                <Text style={{ fontSize: 15 }}>
                  {m.type === "cash" ? "💵" : m.type === "savings" ? "🐷" : "💳"}
                </Text>
              }
              iconBg={tokens.colors.text.secondary}
              onPress={() => openEdit(m)}
              accessibilityLabelOverride={`${m.name}, ${typeLabel(m.type)}`}
              right={
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}
                >
                  <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
                  <TouchableOpacity
                    onPress={() => confirmDelete(m.id, m.name)}
                    hitSlop={8}
                    style={{ padding: 4 }}
                  >
                    <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              }
            />
            {i < methods.length - 1 && <Divider inset={tokens.spacing.md * 2 + 34} />}
          </View>
        ))}
      </Card>

      {/* Botón agregar */}
      <Card padded={false} style={{ marginTop: tokens.spacing.sm }}>
        <ListRow
          label="Agregar método"
          icon={<Plus size={16} color="#FFFFFF" strokeWidth={2.5} />}
          iconBg={tokens.colors.accent.default}
          labelColor={tokens.colors.accent.default}
          onPress={openAdd}
        />
      </Card>

      {/* Modal de nombre */}
      <InputModal
        visible={nameModal || (!!editTarget && !typeSheet)}
        title={addMode ? "Nuevo método de pago" : `Editar "${editTarget?.name}"`}
        placeholder="Ej: Nequi, Bancolombia…"
        value={editName}
        onConfirm={saveEdit}
        onClose={() => {
          setNameModal(false);
          setEditTarget(null);
          setAddMode(false);
        }}
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

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar método"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) removeMethod(deleteDialog.id);
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />

      <ConfirmDialog
        visible={minMethodAlert}
        variant="info"
        title="No es posible"
        message="Debes tener al menos un método de pago activo."
        confirmLabel="Entendido"
        onConfirm={() => setMinMethodAlert(false)}
        onCancel={() => setMinMethodAlert(false)}
      />
    </>
  );
}

// ─── Popup: Nueva Meta ────────────────────────────────────────────────────────

function NuevaMetaModal({
  visible,
  editTarget,
  onClose,
}: {
  visible: boolean;
  editTarget?: SavingsGoal | null;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const addSavingsGoal = useSettingsStore((st) => st.addSavingsGoal);
  const editSavingsGoal = useSettingsStore((st) => st.editSavingsGoal);
  const isEditing = !!editTarget;

  const [selectedEmoji, setSelectedEmoji] = useState("✈️");
  const [name, setName] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");

  useEffect(() => {
    if (!visible) {
      setSelectedEmoji("✈️");
      setName("");
      setTargetDisplay("");
    } else if (editTarget) {
      setSelectedEmoji(editTarget.emoji);
      setName(editTarget.name);
      setTargetDisplay(formatMoneyInput(String(editTarget.targetAmount)));
    }
  }, [visible, editTarget]);

  const canCreate = name.trim().length > 0 && targetDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const target = parseInt(targetDisplay.replace(/\D/g, ""), 10);
    if (!name.trim() || !target) return;
    if (isEditing && editTarget) {
      editSavingsGoal(editTarget.id, {
        name: name.trim(),
        emoji: selectedEmoji,
        targetAmount: target,
      });
    } else {
      addSavingsGoal({
        name: name.trim(),
        emoji: selectedEmoji,
        targetAmount: target,
        savedAmount: 0,
      });
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior="padding">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.modalCard, { gap: 20 }]}>
          {/* Título */}
          <View style={{ gap: 3 }}>
            <Text style={s.modalTitle}>{isEditing ? "Editar meta" : "Nueva Meta"}</Text>
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
                      width: 46,
                      height: 46,
                      borderRadius: 23,
                      backgroundColor: selectedEmoji === e ? theme.accent + "22" : theme.inputBg,
                      alignItems: "center",
                      justifyContent: "center",
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
                onChangeText={(t) => setTargetDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
                placeholder="0"
                placeholderTextColor={theme.textSub}
                keyboardType="number-pad"
                textAlign="right"
              />
            </View>
          </View>

          {/* Botones */}
          <View style={s.modalBtns}>
            <PressableScale
              style={s.modalBtnCancel}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              style={canCreate ? s.modalBtnConfirm : s.modalBtnConfirmDisabled}
              onPress={handleCreate}
              disabled={!canCreate}
            >
              <Text style={canCreate ? s.modalBtnConfirmText : s.modalBtnConfirmTextOff}>
                {isEditing ? "Guardar" : "Crear"}
              </Text>
            </PressableScale>
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
  const s = useStyles();
  const theme = useTheme();
  const updateSavingsGoal = useSettingsStore((st) => st.updateSavingsGoal);
  const addTransaction = useFinanceStore((st) => st.addTransaction);

  const [abonoDisplay, setAbonoDisplay] = useState("");

  useEffect(() => {
    if (!visible) setAbonoDisplay("");
  }, [visible]);

  if (!goal) return null;

  const abono = parseInt(abonoDisplay.replace(/\D/g, ""), 10) || 0;
  const currentPct =
    goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
  const projectedPct =
    goal.targetAmount > 0
      ? Math.min(100, ((goal.savedAmount + abono) / goal.targetAmount) * 100)
      : 0;
  const deltaPct = Math.round(projectedPct - currentPct);

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const handleAbonar = async () => {
    if (abono <= 0 || !goal) return;
    await addTransaction(abono, `Abono a ${goal.name}`, goal.emoji, ["#ahorro"]);
    const newSaved = goal.savedAmount + abono;
    updateSavingsGoal(goal.id, newSaved);

    if (newSaved >= goal.targetAmount) {
      checkAndNotifyGoalCompleted(goal.id, goal.emoji, goal.name, goal.targetAmount);
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior="padding">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.modalCard, { gap: 16 }]}>
          {/* Título */}
          <View style={{ gap: 3 }}>
            <Text style={s.modalTitle}>Abonar a meta</Text>
            <Text style={s.rowSub}>
              {goal.emoji} {goal.name}
            </Text>
          </View>

          {/* Campo de monto */}
          <View style={[s.goalAmountRow, { paddingVertical: 4 }]}>
            <Text style={[s.goalAmountPrefix, { fontSize: 20, fontWeight: "700" }]}>$</Text>
            <TextInput
              style={[s.goalAmountInput, { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }]}
              value={abonoDisplay}
              onChangeText={(t) => setAbonoDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
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
            <View
              style={{
                height: 8,
                backgroundColor: theme.inputBg,
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
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
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: theme.accent,
                  textAlign: "center",
                }}
              >
                +{deltaPct}% con este abono
              </Text>
            )}
          </View>

          {/* Botones */}
          <View style={s.modalBtns}>
            <PressableScale
              style={s.modalBtnCancel}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              style={abono > 0 ? s.modalBtnConfirm : s.modalBtnConfirmDisabled}
              onPress={handleAbonar}
              disabled={abono <= 0}
            >
              <Text style={abono > 0 ? s.modalBtnConfirmText : s.modalBtnConfirmTextOff}>
                Abonar
              </Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sección: Metas de Ahorro ─────────────────────────────────────────────────

// ─── Item de meta — editar/eliminar explícitos (mismo patrón que Métodos de pago,
// reemplaza el swipe-to-delete anterior) ───────────────────────────────────────

function GoalItem({
  goal,
  onEdit,
  onDelete,
  onAbonar,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onAbonar: () => void;
}) {
  const tokens = useAppTokens();

  const pct =
    goal.targetAmount > 0 ? Math.min(100, (goal.savedAmount / goal.targetAmount) * 100) : 0;
  const done = pct >= 100;

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  return (
    <Card style={{ marginBottom: 8, gap: 10 }}>
      {done ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm + 2 }}>
          <Text style={{ fontSize: 28 }}>{goal.emoji}</Text>
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" style={{ color: tokens.colors.state.success }}>
              ¡Meta alcanzada!
            </ThemedText>
            <ThemedText variant="footnote" color="secondary" style={{ marginTop: 2 }}>
              Ahorro completado con éxito
            </ThemedText>
          </View>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
            <Trash2 size={16} color={tokens.colors.state.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}>
            <Text style={{ fontSize: 24 }}>{goal.emoji}</Text>
            <ThemedText variant="headline" style={{ flex: 1 }} numberOfLines={1}>
              {goal.name}
            </ThemedText>
            <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ padding: 4 }}>
              <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
              <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: tokens.colors.surface.elevated,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: `${pct}%` as `${number}%`,
                backgroundColor: "#135BEC",
                borderRadius: 3,
              }}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <ThemedText variant="footnote" color="secondary">
              {fmt(goal.savedAmount)} / {fmt(goal.targetAmount)} · {Math.round(pct)}%
            </ThemedText>
            <TouchableOpacity
              // Botón primario fijo #135BEC (regla inmutable #7) — no varía con el tema.
              style={{
                backgroundColor: "#135BEC",
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: tokens.radius.full,
              }}
              onPress={onAbonar}
              activeOpacity={0.75}
            >
              <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Abonar
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Card>
  );
}

// ─── Sección: Deudas ───────────────────────────────────────────────────────────

const DEBT_EMOJIS = ["💳", "🏦", "🚗", "🏠", "🎓", "📱", "🛍️", "💰", "🏥", "✈️"];
const DEBT_COLOR = "#9F1239";

// ─── Popup: Nueva Deuda ────────────────────────────────────────────────────────

/** Grilla 1-31 para elegir el día del mes del recordatorio — a diferencia de
 * CalendarSheet, no tiene mes/año ni deshabilita días futuros: la deuda se
 * recuerda ese mismo día TODOS los meses, no es una fecha puntual. */
function DayOfMonthSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: number;
  onSelect: (day: number) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={{ paddingBottom: 36, paddingHorizontal: 20 }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: theme.text,
          textAlign: "center",
          marginBottom: 16,
        }}
      >
        Día de pago
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {days.map((day) => {
          const isSel = day === selected;
          return (
            <TouchableOpacity
              key={day}
              style={{
                width: `${100 / 7}%`,
                aspectRatio: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                onSelect(day);
                onClose();
              }}
              activeOpacity={0.6}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSel ? theme.accent : "transparent",
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isSel ? "700" : "500",
                    color: isSel ? "#FFFFFF" : theme.text,
                  }}
                >
                  {day}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

function NuevaDeudaModal({
  visible,
  editTarget,
  onClose,
}: {
  visible: boolean;
  editTarget?: Debt | null;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const addDebt = useSettingsStore((st) => st.addDebt);
  const editDebt = useSettingsStore((st) => st.editDebt);
  const isEditing = !!editTarget;

  const [selectedEmoji, setSelectedEmoji] = useState(DEBT_EMOJIS[0]);
  const [name, setName] = useState("");
  const [totalDisplay, setTotalDisplay] = useState("");
  const [paymentDisplay, setPaymentDisplay] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      setSelectedEmoji(DEBT_EMOJIS[0]);
      setName("");
      setTotalDisplay("");
      setPaymentDisplay("");
      setDueDay(1);
    } else if (editTarget) {
      setSelectedEmoji(editTarget.emoji);
      setName(editTarget.name);
      setTotalDisplay(formatMoneyInput(String(editTarget.totalAmount)));
      setPaymentDisplay(formatMoneyInput(String(editTarget.monthlyPayment)));
      setDueDay(editTarget.dueDay);
    }
  }, [visible, editTarget]);

  const canCreate = name.trim().length > 0 && totalDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const totalAmount = parseInt(totalDisplay.replace(/\D/g, ""), 10);
    const monthlyPayment = parseInt(paymentDisplay.replace(/\D/g, ""), 10) || 0;
    if (!name.trim() || !totalAmount) return;

    if (isEditing && editTarget) {
      editDebt(editTarget.id, {
        name: name.trim(),
        emoji: selectedEmoji,
        totalAmount,
        monthlyPayment,
        dueDay,
      });
      scheduleDebtReminder({
        ...editTarget,
        name: name.trim(),
        emoji: selectedEmoji,
        monthlyPayment,
        dueDay,
      });
    } else {
      const debt = addDebt({
        name: name.trim(),
        emoji: selectedEmoji,
        totalAmount,
        monthlyPayment,
        dueDay,
      });
      scheduleDebtReminder(debt);
    }
    onClose();
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <KeyboardAvoidingView style={s.modalOverlay} behavior="padding">
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
          <View style={[s.modalCard, { gap: 20 }]}>
            {/* Título */}
            <View style={{ gap: 3 }}>
              <Text style={s.modalTitle}>{isEditing ? "Editar deuda" : "Nueva deuda"}</Text>
              <Text style={s.rowSub}>Registra una deuda para hacerle seguimiento</Text>
            </View>

            {/* Selector de emoji */}
            <View style={{ gap: 8 }}>
              <Text style={s.goalFieldLabel}>Icono de la deuda</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {DEBT_EMOJIS.map((e) => (
                    <TouchableOpacity
                      key={e}
                      onPress={() => setSelectedEmoji(e)}
                      activeOpacity={0.7}
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        backgroundColor: selectedEmoji === e ? theme.accent + "22" : theme.inputBg,
                        alignItems: "center",
                        justifyContent: "center",
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
              <Text style={s.goalFieldLabel}>Nombre de la deuda</Text>
              <TextInput
                style={s.modalInput}
                value={name}
                onChangeText={setName}
                placeholder="Ej. Tarjeta de crédito"
                placeholderTextColor={theme.textSub}
                autoCapitalize="sentences"
              />
            </View>

            {/* Monto total */}
            <View style={{ gap: 8 }}>
              <Text style={s.goalFieldLabel}>Monto total de la deuda</Text>
              <View style={s.goalAmountRow}>
                <Text style={s.goalAmountPrefix}>$ COP</Text>
                <TextInput
                  style={s.goalAmountInput}
                  value={totalDisplay}
                  onChangeText={(t) => setTotalDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
                  placeholder="0"
                  placeholderTextColor={theme.textSub}
                  keyboardType="number-pad"
                  textAlign="right"
                />
              </View>
            </View>

            {/* Cuota mensual + día de pago */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={s.goalFieldLabel}>Cuota mensual</Text>
                <View style={s.goalAmountRow}>
                  <Text style={s.goalAmountPrefix}>$</Text>
                  <TextInput
                    style={s.goalAmountInput}
                    value={paymentDisplay}
                    onChangeText={(t) => setPaymentDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
                    placeholder="0"
                    placeholderTextColor={theme.textSub}
                    keyboardType="number-pad"
                    textAlign="right"
                  />
                </View>
              </View>
              <View style={{ width: 100, gap: 8 }}>
                <Text style={s.goalFieldLabel}>Día de pago</Text>
                <TouchableOpacity
                  style={s.goalAmountRow}
                  onPress={() => setDaySheetOpen(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.goalAmountInput, { textAlign: "right" }]}>{dueDay}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Botones */}
            <View style={s.modalBtns}>
              <PressableScale
                style={s.modalBtnCancel}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
              >
                <Text style={s.modalBtnCancelText}>Cancelar</Text>
              </PressableScale>
              <PressableScale
                style={canCreate ? s.modalBtnConfirm : s.modalBtnConfirmDisabled}
                onPress={handleCreate}
                disabled={!canCreate}
              >
                <Text style={canCreate ? s.modalBtnConfirmText : s.modalBtnConfirmTextOff}>
                  {isEditing ? "Guardar" : "Crear"}
                </Text>
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <DayOfMonthSheet
        visible={daySheetOpen}
        selected={dueDay}
        onSelect={setDueDay}
        onClose={() => setDaySheetOpen(false)}
      />
    </>
  );
}

// ─── Popup: Abonar a Deuda ─────────────────────────────────────────────────────

function AbonarDeudaModal({
  debt,
  visible,
  onClose,
}: {
  debt: Debt | null;
  visible: boolean;
  onClose: () => void;
}) {
  const s = useStyles();
  const theme = useTheme();
  const tokens = useAppTokens();
  const updateDebtBalance = useSettingsStore((st) => st.updateDebtBalance);
  const addTransaction = useFinanceStore((st) => st.addTransaction);

  const [abonoDisplay, setAbonoDisplay] = useState("");

  useEffect(() => {
    if (!visible) setAbonoDisplay("");
  }, [visible]);

  if (!debt) return null;

  const abono = parseInt(abonoDisplay.replace(/\D/g, ""), 10) || 0;
  const projectedRemaining = Math.max(0, debt.remainingAmount - abono);

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const handleAbonar = async () => {
    if (abono <= 0 || !debt) return;
    await addTransaction(abono, `Pago de ${debt.name}`, debt.emoji, ["#deuda"]);
    updateDebtBalance(debt.id, projectedRemaining);

    if (projectedRemaining <= 0) {
      cancelDebtReminder(debt.id);
      notifyDebtPaidOff(debt.name, debt.emoji);
    }

    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.modalOverlay} behavior="padding">
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[s.modalCard, { gap: 16 }]}>
          {/* Título */}
          <View style={{ gap: 3 }}>
            <Text style={s.modalTitle}>Pagar deuda</Text>
            <Text style={s.rowSub}>
              {debt.emoji} {debt.name}
            </Text>
          </View>

          {/* Campo de monto */}
          <View style={[s.goalAmountRow, { paddingVertical: 4 }]}>
            <Text style={[s.goalAmountPrefix, { fontSize: 20, fontWeight: "700" }]}>$</Text>
            <TextInput
              style={[s.goalAmountInput, { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 }]}
              value={abonoDisplay}
              onChangeText={(t) => setAbonoDisplay(formatMoneyInput(t.replace(/\D/g, "")))}
              placeholder="0"
              placeholderTextColor={theme.textSub}
              keyboardType="number-pad"
              autoFocus
              textAlign="right"
            />
            <Text style={[s.goalAmountPrefix, { marginLeft: 6 }]}>COP</Text>
          </View>

          {/* Saldo proyectado */}
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={s.goalFieldLabel}>SALDO RESTANTE</Text>
              <Text style={s.goalFieldLabel}>DEUDA TOTAL</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                {fmt(projectedRemaining)}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                {fmt(debt.totalAmount)}
              </Text>
            </View>
            {projectedRemaining <= 0 && abono > 0 && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: tokens.colors.state.success,
                  textAlign: "center",
                }}
              >
                ¡Con este abono liquidas la deuda!
              </Text>
            )}
          </View>

          {/* Botones */}
          <View style={s.modalBtns}>
            <PressableScale
              style={s.modalBtnCancel}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
            >
              <Text style={s.modalBtnCancelText}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              style={abono > 0 ? s.modalBtnConfirm : s.modalBtnConfirmDisabled}
              onPress={handleAbonar}
              disabled={abono <= 0}
            >
              <Text style={abono > 0 ? s.modalBtnConfirmText : s.modalBtnConfirmTextOff}>
                Pagar
              </Text>
            </PressableScale>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Item de deuda con swipe-to-delete (mismo patrón que SwipeableGoalItem) ────

// ─── Item de deuda — editar/eliminar explícitos (mismo patrón que Métodos de pago) ──

function DebtItem({
  debt,
  onEdit,
  onDelete,
  onAbonar,
}: {
  debt: Debt;
  onEdit: () => void;
  onDelete: () => void;
  onAbonar: () => void;
}) {
  const tokens = useAppTokens();

  const paidAmount = debt.totalAmount - debt.remainingAmount;
  const pct = debt.totalAmount > 0 ? Math.min(100, (paidAmount / debt.totalAmount) * 100) : 0;
  const done = debt.remainingAmount <= 0;

  const fmt = (v: number) =>
    `$${Math.round(v)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  return (
    <Card style={{ marginBottom: 8, gap: 10 }}>
      {done ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm + 2 }}>
          <Text style={{ fontSize: 28 }}>{debt.emoji}</Text>
          <View style={{ flex: 1 }}>
            <ThemedText variant="headline" style={{ color: tokens.colors.state.success }}>
              ¡Deuda liquidada!
            </ThemedText>
            <ThemedText variant="footnote" color="secondary" style={{ marginTop: 2 }}>
              Ya no debes nada por este concepto
            </ThemedText>
          </View>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
            <Trash2 size={16} color={tokens.colors.state.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}>
            <Text style={{ fontSize: 24 }}>{debt.emoji}</Text>
            <ThemedText variant="headline" style={{ flex: 1 }} numberOfLines={1}>
              {debt.name}
            </ThemedText>
            <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ padding: 4 }}>
              <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
              <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View
            style={{
              height: 6,
              backgroundColor: tokens.colors.surface.elevated,
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 6,
                width: `${pct}%` as `${number}%`,
                backgroundColor: DEBT_COLOR,
                borderRadius: 3,
              }}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
          >
            <View style={{ gap: 2 }}>
              <ThemedText variant="footnote" color="secondary">
                Saldo: {fmt(debt.remainingAmount)} / {fmt(debt.totalAmount)}
              </ThemedText>
              <ThemedText variant="footnote" color="secondary">
                Cuota {fmt(debt.monthlyPayment)} · día {debt.dueDay}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: DEBT_COLOR,
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: tokens.radius.full,
              }}
              onPress={onAbonar}
              activeOpacity={0.75}
            >
              <ThemedText variant="footnote" style={{ color: "#FFFFFF", fontWeight: "700" }}>
                Pagar
              </ThemedText>
            </TouchableOpacity>
          </View>
        </>
      )}
    </Card>
  );
}

// ─── Sección principal de deudas ───────────────────────────────────────────────

function DebtsSection() {
  const tokens = useAppTokens();
  const debts = useSettingsStore((st) => st.debts);
  const removeDebt = useSettingsStore((st) => st.removeDebt);

  const [showNuevaDeuda, setShowNuevaDeuda] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [abonarDebt, setAbonarDebt] = useState<Debt | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      {debts.length === 0 ? (
        /* ── Estado vacío ─────────────────────────────────────────────── */
        <Card style={{ alignItems: "center", gap: tokens.spacing.sm + 2 }}>
          <Text style={{ fontSize: 32 }}>💳</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes deudas registradas{"\n"}agrégalas para controlarlas y salir de ellas
          </ThemedText>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}
            onPress={() => setShowNuevaDeuda(true)}
            activeOpacity={0.7}
          >
            <Plus size={15} color={tokens.colors.accent.default} strokeWidth={2.5} />
            <ThemedText
              variant="subheadline"
              style={{ color: tokens.colors.accent.default, fontWeight: "600" }}
            >
              Nueva deuda
            </ThemedText>
          </TouchableOpacity>
        </Card>
      ) : (
        /* ── Lista de deudas ──────────────────────────────────────────── */
        <>
          {debts.map((debt) => (
            <DebtItem
              key={debt.id}
              debt={debt}
              onEdit={() => setEditDebt(debt)}
              onDelete={() => setDeleteDialog({ id: debt.id, name: debt.name })}
              onAbonar={() => setAbonarDebt(debt)}
            />
          ))}

          {/* Botón nueva deuda */}
          <Card padded={false}>
            <ListRow
              label="Nueva deuda"
              icon={<Plus size={16} color="#FFFFFF" strokeWidth={2.5} />}
              iconBg={tokens.colors.accent.default}
              labelColor={tokens.colors.accent.default}
              onPress={() => setShowNuevaDeuda(true)}
            />
          </Card>
        </>
      )}

      <NuevaDeudaModal visible={showNuevaDeuda} onClose={() => setShowNuevaDeuda(false)} />
      <NuevaDeudaModal
        visible={!!editDebt}
        editTarget={editDebt}
        onClose={() => setEditDebt(null)}
      />
      <AbonarDeudaModal
        debt={abonarDebt}
        visible={!!abonarDebt}
        onClose={() => setAbonarDebt(null)}
      />

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar deuda"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) {
            cancelDebtReminder(deleteDialog.id);
            removeDebt(deleteDialog.id);
          }
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />
    </>
  );
}

// ─── Modal para editar categoría ──────────────────────────────────────────────
function EditCategoryModal({
  cat,
  theme,
  onSave,
  onClose,
}: {
  cat: UserCategory;
  theme: import("@/src/theme").AppTheme;
  onSave: (updated: UserCategory) => void;
  onClose: () => void;
}) {
  const [emoji, setEmoji] = useState(cat.emoji);
  const [name, setName] = useState(cat.name);
  const [hue, setHue] = useState(() => hexToHue(cat.colorAccent));

  const handleSave = () => {
    if (!name.trim()) return;
    const { accent, bg } = hueToColors(hue);
    onSave({
      ...cat,
      emoji,
      name: name.trim(),
      colorBg: bg,
      colorAccent: accent,
      keywords: cat.isPreset ? cat.keywords : name.trim().toLowerCase().split(/\s+/),
    });
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: 28,
          }}
          onPress={onClose}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: theme.surface,
              borderRadius: 22,
              padding: 24,
              shadowColor: "#000",
              shadowOpacity: 0.15,
              shadowRadius: 20,
              elevation: 20,
            }}
          >
            <Pressable>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>
                  Editar categoría
                </Text>
                <PressableScale
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 20, color: theme.textSub, padding: 4 }}>✕</Text>
                </PressableScale>
              </View>

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.textSub,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                ÍCONO
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 4 }}
              >
                {CURATED_EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[
                      {
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 8,
                        backgroundColor: theme.inputBg,
                      },
                      e === emoji && {
                        backgroundColor: "#DBEAFE",
                        borderWidth: 2,
                        borderColor: "#135BEC",
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.textSub,
                  letterSpacing: 1,
                  marginBottom: 10,
                  marginTop: 16,
                }}
              >
                COLOR DE TEMA
              </Text>
              <HueColorPicker
                hue={hue}
                onChange={setHue}
                previewEmoji={emoji}
                style={{ marginBottom: 4 }}
              />

              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: theme.textSub,
                  letterSpacing: 1,
                  marginBottom: 10,
                  marginTop: 16,
                }}
              >
                NOMBRE
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Ej. Gimnasio"
                placeholderTextColor={theme.textTertiary}
                style={{
                  backgroundColor: theme.inputBg,
                  borderRadius: 14,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 15,
                  color: theme.text,
                }}
                maxLength={24}
                autoCapitalize="words"
              />

              <View
                style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24 }}
              >
                <PressableScale
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onClose();
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 16 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: theme.textSub }}>
                    Cancelar
                  </Text>
                </PressableScale>
                <PressableScale
                  onPress={handleSave}
                  disabled={!name.trim()}
                  style={[
                    {
                      backgroundColor: "#135BEC",
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 14,
                    },
                    !name.trim() && { opacity: 0.4 },
                  ]}
                >
                  <Text style={{ color: "#FFF", fontSize: 15, fontWeight: "700" }}>Guardar</Text>
                </PressableScale>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Sección principal de metas ───────────────────────────────────────────────
function SavingsGoalsSection() {
  const tokens = useAppTokens();
  const savingsGoals = useSettingsStore((st) => st.savingsGoals);
  const removeSavingsGoal = useSettingsStore((st) => st.removeSavingsGoal);

  const [showNuevaMeta, setShowNuevaMeta] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [abonarGoal, setAbonarGoal] = useState<SavingsGoal | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);

  return (
    <>
      {savingsGoals.length === 0 ? (
        /* ── Estado vacío ─────────────────────────────────────────────── */
        <Card style={{ alignItems: "center", gap: tokens.spacing.sm + 2 }}>
          <Text style={{ fontSize: 32 }}>🎯</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes metas de ahorro{"\n"}define una y empieza hoy
          </ThemedText>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}
            onPress={() => setShowNuevaMeta(true)}
            activeOpacity={0.7}
          >
            <Plus size={15} color={tokens.colors.accent.default} strokeWidth={2.5} />
            <ThemedText
              variant="subheadline"
              style={{ color: tokens.colors.accent.default, fontWeight: "600" }}
            >
              Nueva meta
            </ThemedText>
          </TouchableOpacity>
        </Card>
      ) : (
        /* ── Lista de metas ───────────────────────────────────────────── */
        <>
          {savingsGoals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              onEdit={() => setEditGoal(goal)}
              onDelete={() => setDeleteDialog({ id: goal.id, name: goal.name })}
              onAbonar={() => setAbonarGoal(goal)}
            />
          ))}

          {/* Botón nueva meta */}
          <Card padded={false}>
            <ListRow
              label="Nueva meta"
              icon={<Plus size={16} color="#FFFFFF" strokeWidth={2.5} />}
              iconBg={tokens.colors.accent.default}
              labelColor={tokens.colors.accent.default}
              onPress={() => setShowNuevaMeta(true)}
            />
          </Card>
        </>
      )}

      <NuevaMetaModal visible={showNuevaMeta} onClose={() => setShowNuevaMeta(false)} />
      <NuevaMetaModal
        visible={!!editGoal}
        editTarget={editGoal}
        onClose={() => setEditGoal(null)}
      />
      <AbonarMetaModal
        goal={abonarGoal}
        visible={!!abonarGoal}
        onClose={() => setAbonarGoal(null)}
      />

      <ConfirmDialog
        visible={!!deleteDialog}
        variant="danger"
        title="Eliminar meta"
        message={`¿Seguro que quieres eliminar "${deleteDialog?.name ?? ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteDialog) removeSavingsGoal(deleteDialog.id);
          setDeleteDialog(null);
        }}
        onCancel={() => setDeleteDialog(null)}
      />
    </>
  );
}

// ─── Sección: Detección automática de transacciones ──────────────────────────

const DETECT_COLOR = "#0D9488";
const BANKS_COLOR = "#EA580C";

function AutoDetectSection() {
  const s = useStyles();
  const theme = useTheme();
  const tokens = useAppTokens();
  const ACCENT = "#135BEC";

  const [enabled, setEnabled] = useState(false);
  const [allowedBanks, setAllowedBanks] = useState<string[]>([]);
  const [hasPermission, setHasPermission] = useState(false);
  const [showPermDialog, setShowPermDialog] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

  // Cargar configuración desde AsyncStorage al montar
  useEffect(() => {
    (async () => {
      const savedEnabled = await AsyncStorage.getItem(AUTO_DETECT_ENABLED_KEY);
      const savedBanks = await AsyncStorage.getItem(ALLOWED_BANKS_KEY);
      if (savedEnabled === "true") setEnabled(true);
      if (savedBanks) {
        try {
          const parsed = JSON.parse(savedBanks);
          if (Array.isArray(parsed)) setAllowedBanks(parsed);
        } catch {
          // Datos corruptos: ignorar y usar configuración por defecto
        }
      }
    })();
    checkPermission();
  }, []);

  // Re-verificar permiso cuando el usuario vuelve de ajustes del sistema
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        checkPermissionAndAutoEnable();
      }
    });
    return () => sub.remove();
  }, []);

  const checkPermission = useCallback(async () => {
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      setHasPermission(status === "authorized");
    } catch {
      setHasPermission(false);
    }
  }, []);

  const checkPermissionAndAutoEnable = useCallback(async () => {
    try {
      const status = await RNAndroidNotificationListener.getPermissionStatus();
      const authorized = status === "authorized";
      setHasPermission(authorized);
      if (authorized) {
        setEnabled(true);
        await AsyncStorage.setItem(AUTO_DETECT_ENABLED_KEY, "true");
      }
    } catch {
      setHasPermission(false);
    }
  }, []);

  const handleToggle = useCallback(
    async (value: boolean) => {
      if (value && !hasPermission) {
        setShowPermDialog(true);
        return;
      }
      if (value) {
        // La detección solo lee notificaciones (permiso de listener, ya validado arriba);
        // mostrar la transacción como push requiere además el permiso normal de
        // notificaciones de la app. requestNotificationPermissions() no vuelve a pedirlo
        // si ya fue concedido antes (por esta misma sección o por Alertas de presupuesto).
        await requestNotificationPermissions();
      }
      setEnabled(value);
      await AsyncStorage.setItem(AUTO_DETECT_ENABLED_KEY, value ? "true" : "false");
    },
    [hasPermission],
  );

  const handleOpenPermissionSettings = useCallback(() => {
    setShowPermDialog(false);
    RNAndroidNotificationListener.requestPermission();
  }, []);

  const toggleBank = useCallback(
    async (packageName: string) => {
      const updated = allowedBanks.includes(packageName)
        ? allowedBanks.filter((p) => p !== packageName)
        : [...allowedBanks, packageName];
      setAllowedBanks(updated);
      await AsyncStorage.setItem(ALLOWED_BANKS_KEY, JSON.stringify(updated));
    },
    [allowedBanks],
  );

  const activeCount = allowedBanks.length === 0 ? KNOWN_BANKS.length : allowedBanks.length;

  return (
    <>
      {/* Toggle principal + filas condicionales, todo en una sola tarjeta agrupada
          (antes cada fila era su propia tarjeta con borde — se fusionó a pedido
          del usuario, la tarjeta con borde queda a nivel de sección, no por fila). */}
      <Card padded={false}>
        <ListRow
          label="Detectar transacciones"
          icon={<Radar size={16} color="#FFFFFF" strokeWidth={2} />}
          iconBg={DETECT_COLOR}
          detail={
            !hasPermission
              ? "Requiere permiso de notificaciones"
              : enabled
                ? `Activo · ${activeCount} banco${activeCount !== 1 ? "s" : ""}`
                : "Desactivado"
          }
          right={
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ true: ACCENT, false: tokens.colors.border.default }}
              thumbColor={enabled ? "#fff" : tokens.colors.text.secondary}
            />
          }
        />

        {enabled && (
          <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Bancos activos"
              icon={<Landmark size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={BANKS_COLOR}
              detail={
                allowedBanks.length === 0
                  ? "Todos los bancos compatibles"
                  : `${allowedBanks.length} seleccionado${allowedBanks.length !== 1 ? "s" : ""}`
              }
              showChevron
              onPress={() => setShowBankSelector(true)}
            />
          </Reanimated.View>
        )}

        {/* Acceso directo a ajustes de batería — evita que el sistema mate la detección
            en background (Samsung/Xiaomi/Huawei...). Antes eran dos tarjetas con párrafos
            explicativos; se redujo a una fila de acción para no saturar la pantalla. */}
        {enabled && (
          <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Optimización de batería"
              icon={<BatteryWarning size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.warning}
              detail="Evita interrupciones"
              showChevron
              onPress={() => Linking.openSettings()}
            />
          </Reanimated.View>
        )}
      </Card>

      {/* Diálogo de permiso */}
      <Modal
        visible={showPermDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermDialog(false)}
      >
        <Pressable style={s.modalOverlay} onPress={() => setShowPermDialog(false)}>
          <View style={[s.modalCard, { gap: 16 }]}>
            <Text style={{ fontSize: 24, textAlign: "center" }}>🔔</Text>
            <Text style={[s.modalTitle, { textAlign: "center" }]}>Acceso a notificaciones</Text>
            <Text
              style={{ fontSize: 14, color: theme.textSub, lineHeight: 21, textAlign: "center" }}
            >
              MyWallet leerá notificaciones de tus apps bancarias para detectar transacciones
              automáticamente.{"\n\n"}
              {"· Solo apps bancarias que tú elijas\n"}
              {"· Procesamiento 100% en tu dispositivo\n"}
              {"· Ningún dato sale de tu teléfono\n"}
              {"· No accede a mensajes, fotos ni otras apps\n\n"}
              Se abrirá la configuración del sistema. Busca "MyWallet" y activa el acceso.
            </Text>
            <View style={s.modalBtns}>
              <PressableScale
                style={s.modalBtnCancel}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowPermDialog(false);
                }}
              >
                <Text style={s.modalBtnCancelText}>Cancelar</Text>
              </PressableScale>
              <PressableScale style={s.modalBtnConfirm} onPress={handleOpenPermissionSettings}>
                <Text style={s.modalBtnConfirmText}>Abrir ajustes</Text>
              </PressableScale>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Selector de bancos */}
      <Modal
        visible={showBankSelector}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBankSelector(false)}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => setShowBankSelector(false)} />
        <View style={[s.sheet, { paddingBottom: 40, maxHeight: "75%" }]}>
          <View style={s.sheetHandle} />
          <Text style={[s.sheetTitle, { marginBottom: 8 }]}>Bancos activos</Text>
          <Text
            style={{ fontSize: 13, color: theme.textSub, paddingHorizontal: 20, marginBottom: 12 }}
          >
            Elige de qué apps detectar transacciones. Si no seleccionas ninguno, se usan todos.
          </Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[...KNOWN_BANKS]
              .sort((a, b) => {
                const aSelected = allowedBanks.length === 0 || allowedBanks.includes(a.packageName);
                const bSelected = allowedBanks.length === 0 || allowedBanks.includes(b.packageName);
                if (aSelected === bSelected) return 0;
                return aSelected ? -1 : 1;
              })
              .map((bank) => {
                const isSelected =
                  allowedBanks.length === 0 || allowedBanks.includes(bank.packageName);
                return (
                  <TouchableOpacity
                    key={bank.packageName}
                    style={[autoS.bankRow, { borderBottomColor: tokens.colors.border.default }]}
                    onPress={() => toggleBank(bank.packageName)}
                    activeOpacity={0.65}
                  >
                    <ThemedText variant="body" style={{ flex: 1, fontWeight: "600" }}>
                      {bank.displayName}
                    </ThemedText>
                    <View
                      style={[
                        autoS.bankCheck,
                        {
                          borderColor: isSelected ? ACCENT : tokens.colors.border.default,
                          backgroundColor: isSelected ? ACCENT : "transparent",
                        },
                      ]}
                    >
                      {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
          {allowedBanks.length > 0 && (
            <TouchableOpacity
              style={{ alignItems: "center", paddingVertical: 14 }}
              onPress={async () => {
                setAllowedBanks([]);
                await AsyncStorage.setItem(ALLOWED_BANKS_KEY, "[]");
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, color: ACCENT, fontWeight: "600" }}>
                Seleccionar todos
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}

const autoS = StyleSheet.create({
  bankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bankCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ─── Screen principal ─────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const theme = useTheme();
  const tokens = useAppTokens();
  const insets = useSafeAreaInsets();

  const monthlyBudget = useSettingsStore((s) => s.monthlyBudget);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const userCategories = useSettingsStore((s) => s.userCategories);
  const savingsGoals = useSettingsStore((s) => s.savingsGoals);
  const debts = useSettingsStore((s) => s.debts);

  const setMonthlyBudget = useSettingsStore((s) => s.setMonthlyBudget);
  const setDarkMode = useSettingsStore((s) => s.setDarkMode);
  const setBudgetForCategory = useSettingsStore((s) => s.setBudgetForCategory);
  const removeBudgetForCategory = useSettingsStore((s) => s.removeBudgetForCategory);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const budgetAlertsEnabled = useSettingsStore((s) => s.budgetAlertsEnabled);
  const budgetAlertThreshold = useSettingsStore((s) => s.budgetAlertThreshold);
  const setBudgetAlertsEnabled = useSettingsStore((s) => s.setBudgetAlertsEnabled);
  const setBudgetAlertThreshold = useSettingsStore((s) => s.setBudgetAlertThreshold);

  // Handler: al activar alertas de presupuesto, validar permiso de notificaciones
  const handleBudgetAlertToggle = useCallback(
    async (value: boolean) => {
      if (!value) {
        setBudgetAlertsEnabled(false);
        return;
      }
      // requestNotificationPermissions abre ajustes del sistema si fueron denegados
      const granted = await requestNotificationPermissions();
      if (!granted) return;
      setNotificationsEnabled(true);
      setBudgetAlertsEnabled(true);
    },
    [setBudgetAlertsEnabled, setNotificationsEnabled],
  );

  // Modals state
  const [budgetModal, setBudgetModal] = useState(false);
  const [darkSheet, setDarkSheet] = useState(false);
  const [catBudgetEmoji, setCatBudgetEmoji] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCatBudgetModal, setShowCatBudgetModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showDebtsModal, setShowDebtsModal] = useState(false);
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null);

  const [clearDataDialog, setClearDataDialog] = useState(false);
  const [exportErrorDialog, setExportErrorDialog] = useState(false);
  const [notifPermDialog, setNotifPermDialog] = useState(false);

  // Onboarding tour
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const hasSelectedCategories = useSettingsStore((s) => s.hasSelectedCategories);
  const onboardingStep = useSettingsStore((s) => s.onboardingStep);
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const settingsTourSteps: TourStep[] = useMemo(
    () => [
      {
        targetRef: getTourRef(TOUR_KEYS.INCOME_ROW),
        title: "Configura tu ingreso",
        message: "Aquí puedes definir cuánto ganas al mes para calcular tu presupuesto.",
        buttonLabel: "Configurar",
        onAction: () => {
          setOnboardingStep(2);
          setBudgetModal(true);
        },
      },
      {
        targetRef: getTourRef(TOUR_KEYS.BACK_BTN),
        title: "¡Todo listo!",
        message:
          "Tu ingreso está configurado. Vuelve al inicio para registrar tu primer movimiento.",
        buttonLabel: "Volver al inicio",
        onAction: () => {
          setOnboardingStep(3);
          router.back();
        },
      },
    ],
    [],
  );

  const settingsTourVisible =
    hasSelectedCategories &&
    !hasCompletedOnboarding &&
    (onboardingStep === 1 || (onboardingStep === 2 && !budgetModal && monthlyBudget > 0));
  const settingsTourIndex = onboardingStep === 1 ? 0 : 1;

  const transactions = useFinanceStore((s) => s.transactions);

  // ── Exportar CSV ────────────────────────────────────────────────────────────
  async function handleExport() {
    try {
      const header = "id,fecha,tipo,descripcion,categoria,monto,metodo_pago,tags\n";
      const rows = transactions
        .map((t) =>
          [
            t.id ?? "",
            t.date ?? "",
            (t.amount ?? 0) > 0 ? "Gasto" : "Ingreso",
            `"${(t.description ?? "").replace(/"/g, '""')}"`,
            t.category_emoji ?? "",
            Math.abs(t.amount ?? 0),
            t.payment_method ?? "cash",
            `"${t.tags ?? ""}"`,
          ].join(","),
        )
        .join("\n");

      const csv = header + rows;

      await Share.share(
        { title: "MyWallet — Exportar transacciones", message: csv },
        { dialogTitle: "Exportar transacciones" },
      );
    } catch {
      setExportErrorDialog(true);
    }
  }

  // ── Limpiar datos ────────────────────────────────────────────────────────────
  function handleClearData() {
    setClearDataDialog(true);
  }

  async function executeClearData() {
    setClearDataDialog(false);
    const { clearTransactions } = await import("@/src/db/db");
    await clearTransactions();
    useFinanceStore.getState().loadTransactions();
  }

  const incomeSubtitle = monthlyBudget <= 0 ? "Sin configurar" : formatCOP(monthlyBudget);
  const darkLabel =
    darkMode === "system" ? "Según el sistema" : darkMode === "light" ? "Claro" : "Oscuro";

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.surface.primary }}
      edges={["top"]}
    >
      <StackedScreenHeader
        onBack={() => router.back()}
        backRef={getTourRef(TOUR_KEYS.BACK_BTN)}
        title="Configuración"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: tokens.spacing.md,
          paddingBottom: insets.bottom + tokens.spacing.xl,
          gap: tokens.spacing.lg,
        }}
      >
        {/* ── CONTROL FINANCIERO ───────────────────────────────────────── */}
        <Enter index={0} screenId="settings">
          <SectionHeader>CONTROL FINANCIERO</SectionHeader>
          <Card padded={false}>
            <View ref={getTourRef(TOUR_KEYS.INCOME_ROW)} collapsable={false}>
              <ListRow
                label="Ingreso mensual"
                icon={<Wallet size={16} color="#FFFFFF" strokeWidth={2} />}
                iconBg={tokens.colors.state.success}
                detail={incomeSubtitle}
                showChevron
                onPress={() => setBudgetModal(true)}
              />
            </View>
          </Card>
        </Enter>

        {/* ── GESTIÓN ──────────────────────────────────────────────────── */}
        <Enter index={1} screenId="settings">
          <SectionHeader>GESTIÓN</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Categorías"
              icon={<LayoutGrid size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.success}
              detail={`${userCategories.length} configuradas`}
              showChevron
              onPress={() => setShowCategoriesModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Métodos de pago"
              icon={<CreditCard size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.accent.default}
              detail="Cuentas y formas de pago"
              showChevron
              onPress={() => setShowPaymentModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Presupuesto por categoría"
              icon={<PiggyBank size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#7C3AED"
              detail="Límites de gasto"
              showChevron
              onPress={() => setShowCatBudgetModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Metas de ahorro"
              icon={<Target size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#DB2777"
              detail={
                savingsGoals.length === 0
                  ? "Sin metas"
                  : `${savingsGoals.length} meta${savingsGoals.length !== 1 ? "s" : ""}`
              }
              showChevron
              onPress={() => setShowGoalsModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Deudas"
              icon={<HandCoins size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={DEBT_COLOR}
              detail={
                debts.length === 0
                  ? "Sin deudas"
                  : `${debts.length} deuda${debts.length !== 1 ? "s" : ""}`
              }
              showChevron
              onPress={() => setShowDebtsModal(true)}
            />
          </Card>
        </Enter>

        {/* ── DETECCIÓN AUTOMÁTICA ──────────────────────────────────────── */}
        <Enter index={2} screenId="settings">
          <SectionHeader>DETECCIÓN AUTOMÁTICA</SectionHeader>
          <AutoDetectSection />
        </Enter>

        {/* ── APARIENCIA ───────────────────────────────────────────────── */}
        <Enter index={3} screenId="settings">
          <SectionHeader>APARIENCIA</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Modo oscuro"
              icon={<Moon size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#7C3AED"
              detail={darkLabel}
              showChevron
              onPress={() => setDarkSheet(true)}
            />
          </Card>
        </Enter>

        {/* ── SISTEMA ──────────────────────────────────────────────────── */}
        <Enter index={4} screenId="settings">
          <SectionHeader>SISTEMA</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Exportar datos"
              icon={<Download size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              detail="CSV"
              showChevron
              onPress={handleExport}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Borrar historial de transacciones"
              icon={<Trash2 size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.danger}
              destructive
              onPress={handleClearData}
            />
          </Card>
          <ThemedText
            variant="footnote"
            color="secondary"
            style={{ marginTop: tokens.spacing.sm, marginHorizontal: tokens.spacing.xs }}
          >
            Exportar genera un CSV con tus transacciones. Borrar historial elimina todos los
            registros de ingresos y gastos; tu configuración, categorías y metas se conservan.
          </ThemedText>
        </Enter>

        {/* ── ACERCA DE ────────────────────────────────────────────────── */}
        <Enter index={5} screenId="settings">
          <SectionHeader>ACERCA DE</SectionHeader>
          <Card padded={false}>
            <ListRow label="Versión" detail={`v${APP_VERSION}`} />
          </Card>
        </Enter>
      </ScrollView>

      {/* ── Modales ───────────────────────────────────────────────────── */}

      <InputModal
        visible={budgetModal}
        title="Ingreso mensual"
        placeholder="Ej: 2000000"
        value={monthlyBudget > 0 ? String(monthlyBudget) : ""}
        keyboardType="numeric"
        onConfirm={(v) => setMonthlyBudget(parseFloat(v.replace(/\D/g, "")) || 0)}
        onClose={() => setBudgetModal(false)}
      />

      <SelectorModal
        visible={darkSheet}
        title="Modo de apariencia"
        options={[
          { key: "system", label: "Según el sistema" },
          { key: "light", label: "Claro" },
          { key: "dark", label: "Oscuro" },
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
        <PaymentMethodsSection />
      </FullScreenModal>

      {/* ── Modal pantalla completa: Metas de ahorro ─────────────────── */}
      <FullScreenModal
        visible={showGoalsModal}
        title="Metas de ahorro"
        onClose={() => setShowGoalsModal(false)}
      >
        <SavingsGoalsSection />
      </FullScreenModal>

      {/* ── Modal pantalla completa: Deudas ──────────────────────────── */}
      <FullScreenModal
        visible={showDebtsModal}
        title="Deudas"
        onClose={() => setShowDebtsModal(false)}
      >
        <DebtsSection />
      </FullScreenModal>

      {/* ── Modal pantalla completa: Categorías ─────────────────────── */}
      <FullScreenModal
        visible={showCategoriesModal}
        title="Categorías"
        onClose={() => setShowCategoriesModal(false)}
      >
        {/* Gastos */}
        {userCategories.filter((c) => c.type === "expense").length > 0 && (
          <View>
            <SectionHeader>{`GASTOS (${userCategories.filter((c) => c.type === "expense").length})`}</SectionHeader>
            <Card padded={false}>
              {userCategories
                .filter((c) => c.type === "expense")
                .map((cat, i, arr) => (
                  <View key={cat.id}>
                    <ListRow
                      label={cat.name}
                      icon={<Text style={{ fontSize: 15 }}>{cat.emoji}</Text>}
                      iconBg={cat.colorBg}
                      detail={cat.isPreset ? "Predefinida" : "Personalizada"}
                      right={
                        <Pencil size={14} color={tokens.colors.text.secondary} strokeWidth={2} />
                      }
                      onPress={() => {
                        setShowCategoriesModal(false);
                        setEditingCat(cat);
                      }}
                    />
                    {i < arr.length - 1 && <Divider inset={tokens.spacing.md * 2 + 34} />}
                  </View>
                ))}
            </Card>
          </View>
        )}

        {/* Ingresos */}
        {userCategories.filter((c) => c.type === "income").length > 0 && (
          <View>
            <SectionHeader>{`INGRESOS (${userCategories.filter((c) => c.type === "income").length})`}</SectionHeader>
            <Card padded={false}>
              {userCategories
                .filter((c) => c.type === "income")
                .map((cat, i, arr) => (
                  <View key={cat.id}>
                    <ListRow
                      label={cat.name}
                      icon={<Text style={{ fontSize: 15 }}>{cat.emoji}</Text>}
                      iconBg={cat.colorBg}
                      detail={cat.isPreset ? "Predefinida" : "Personalizada"}
                      right={
                        <Pencil size={14} color={tokens.colors.text.secondary} strokeWidth={2} />
                      }
                      onPress={() => {
                        setShowCategoriesModal(false);
                        setEditingCat(cat);
                      }}
                    />
                    {i < arr.length - 1 && <Divider inset={tokens.spacing.md * 2 + 34} />}
                  </View>
                ))}
            </Card>
          </View>
        )}

        {/* Botón gestionar categorías */}
        <TouchableOpacity
          onPress={() => {
            setShowCategoriesModal(false);
            router.push("/category-onboarding?edit=1");
          }}
          activeOpacity={0.7}
          style={{
            paddingVertical: 14,
            borderRadius: tokens.radius.md,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: tokens.colors.border.default,
            alignItems: "center",
          }}
        >
          <ThemedText
            variant="subheadline"
            style={{ color: tokens.colors.accent.default, fontWeight: "600" }}
          >
            + Gestionar categorías
          </ThemedText>
        </TouchableOpacity>
      </FullScreenModal>

      {/* ── Modal editar categoría ─────────────────────────────────────── */}
      {editingCat && (
        <EditCategoryModal
          cat={editingCat}
          theme={theme}
          onSave={(updated) => {
            useSettingsStore.getState().updateUserCategory(updated.id, updated);
            setEditingCat(null);
            setShowCategoriesModal(true);
          }}
          onClose={() => {
            setEditingCat(null);
            setShowCategoriesModal(true);
          }}
        />
      )}

      {/* ── Modal pantalla completa: Presupuesto por categoría ───────── */}
      <FullScreenModal
        visible={showCatBudgetModal}
        title="Presupuestos"
        onClose={() => setShowCatBudgetModal(false)}
      >
        {/* Sección: Alertas de presupuesto */}
        <BudgetAlertSection
          enabled={budgetAlertsEnabled}
          threshold={budgetAlertThreshold}
          onToggle={handleBudgetAlertToggle}
          onThresholdChange={setBudgetAlertThreshold}
        />
        {userCategories.filter((c) => c.type === "expense").length > 0 ? (
          <Card padded={false}>
            {userCategories
              .filter((c) => c.type === "expense")
              .map((cat, i, arr) => {
                const current = budgetByCategory[cat.emoji];
                return (
                  <View key={cat.id}>
                    <ListRow
                      label={cat.name}
                      icon={<Text style={{ fontSize: 15 }}>{cat.emoji}</Text>}
                      iconBg={cat.colorBg}
                      accessibilityLabelOverride={`${cat.name}, ${current ? `Límite ${formatCOP(current)}` : "Sin límite"}`}
                      onPress={() => setCatBudgetEmoji(cat.emoji)}
                      right={
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: tokens.spacing.xs,
                          }}
                        >
                          {current ? (
                            <ThemedText
                              variant="body"
                              style={{ color: tokens.colors.state.success }}
                            >
                              {formatCOP(current)}
                            </ThemedText>
                          ) : (
                            <ThemedText variant="body" color="secondary">
                              Sin límite
                            </ThemedText>
                          )}
                          {current ? (
                            <TouchableOpacity
                              onPress={() => removeBudgetForCategory(cat.emoji)}
                              hitSlop={14}
                              style={{ padding: 4 }}
                            >
                              <X size={14} color={tokens.colors.state.danger} strokeWidth={2.5} />
                            </TouchableOpacity>
                          ) : null}
                          <ChevronRight
                            size={16}
                            color={tokens.colors.text.secondary}
                            strokeWidth={2}
                          />
                        </View>
                      }
                    />
                    {i < arr.length - 1 && <Divider inset={tokens.spacing.md * 2 + 34} />}
                  </View>
                );
              })}
          </Card>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ThemedText variant="subheadline" color="secondary">
              No tienes categorías de gasto configuradas
            </ThemedText>
          </View>
        )}
      </FullScreenModal>

      {/* Modal presupuesto por categoría (input) */}
      {catBudgetEmoji && (
        <InputModal
          visible
          title={`Límite para ${catBudgetEmoji} ${(() => {
            const cat = userCategories.find((c) => c.emoji === catBudgetEmoji);
            return cat?.name ?? catBudgetEmoji;
          })()}`}
          placeholder="Ej: 500000"
          value={budgetByCategory[catBudgetEmoji] ? String(budgetByCategory[catBudgetEmoji]) : ""}
          keyboardType="numeric"
          onConfirm={(v) => {
            const amount = parseFloat(v.replace(/\D/g, "")) || 0;
            if (amount > 0) {
              setBudgetForCategory(catBudgetEmoji, amount);
              // Si las notificaciones no están habilitadas, sugerir activarlas
              if (!notificationsEnabled) setNotifPermDialog(true);
            } else {
              removeBudgetForCategory(catBudgetEmoji);
            }
          }}
          onClose={() => setCatBudgetEmoji(null)}
        />
      )}

      <ConfirmDialog
        visible={notifPermDialog}
        variant="info"
        title="Alertas de presupuesto"
        message="¿Quieres recibir una notificación cuando superes el límite de una categoría? Puedes desactivarlo después."
        confirmLabel="Activar alertas"
        cancelLabel="Ahora no"
        onConfirm={async () => {
          setNotifPermDialog(false);
          await requestNotificationPermissions();
        }}
        onCancel={() => setNotifPermDialog(false)}
      />

      <ConfirmDialog
        visible={clearDataDialog}
        variant="danger"
        title="Borrar historial"
        message="Se eliminarán todos tus registros de ingresos y gastos. Tu configuración, categorías, presupuestos y metas se conservarán. Esta acción no se puede deshacer."
        confirmLabel="Borrar historial"
        onConfirm={executeClearData}
        onCancel={() => setClearDataDialog(false)}
      />

      <ConfirmDialog
        visible={exportErrorDialog}
        variant="warning"
        title="Error al exportar"
        message="No se pudo generar el archivo CSV. Intenta de nuevo."
        confirmLabel="Entendido"
        onConfirm={() => setExportErrorDialog(false)}
        onCancel={() => setExportErrorDialog(false)}
      />

      {/* Guided Tour — usa Modal interno, siempre encima de todo */}
      <GuidedTour
        steps={settingsTourSteps}
        currentStep={settingsTourIndex}
        globalStep={onboardingStep}
        totalSteps={5}
        visible={settingsTourVisible}
        onSkip={completeOnboarding}
      />
    </SafeAreaView>
  );
}

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },

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
    rowText: { flex: 1 },
    rowLabel: { fontSize: 15, fontWeight: "600", color: t.text, lineHeight: 20 },
    rowSub: { fontSize: 13, color: t.textSub, marginTop: 1 },
    rowSep: { height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginLeft: 64 },

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
    subCardDesc: { fontSize: 13, color: t.textSub, marginTop: 2, lineHeight: 18 },

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
    modalSubtitle: {
      fontSize: 12,
      fontWeight: "400",
      color: t.textSub,
      marginTop: 4,
      textAlign: "center" as const,
    },
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
    modalBtns: { flexDirection: "row", gap: 10 },
    modalBtnCancel: {
      flex: 1,
      padding: 13,
      borderRadius: 12,
      backgroundColor: t.inputBg,
      alignItems: "center",
    },
    modalBtnCancelText: { fontSize: 15, fontWeight: "600", color: t.textSub },
    modalBtnConfirm: {
      flex: 1,
      padding: 13,
      borderRadius: 12,
      backgroundColor: "#135BEC",
      alignItems: "center",
    },
    modalBtnConfirmDisabled: {
      flex: 1,
      padding: 13,
      borderRadius: 12,
      backgroundColor: t.border,
      alignItems: "center",
    },
    modalBtnConfirmText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
    modalBtnConfirmTextOff: { fontSize: 15, fontWeight: "700", color: t.textSub },

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
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: t.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      paddingTop: 12,
      elevation: 24,
    },
    sheetHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: t.border,
      alignSelf: "center",
      marginBottom: 16,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: t.text,
      paddingHorizontal: 20,
      marginBottom: 4,
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
  });
}

function useStyles() {
  const t = useTheme();
  return useMemo(() => buildStyles(t), [t]);
}
