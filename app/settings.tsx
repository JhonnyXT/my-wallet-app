/**
 * app/settings.tsx — Modal de Configuración
 * Diseño: lista agrupada (Card + SectionHeader + ListRow + Divider) sobre la capa
 * aditiva de tokens (src/theme/tokens.ts) — puerto del patrón "menú de Ajustes" de
 * Habit Tracker. Header de pantalla apilada (StackedScreenHeader) en vez de header
 * nativo, título grande en el body.
 */
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import {
  SHEET_PADDING_X,
  SheetActions,
  SheetAddButton,
  SheetHeader,
  SheetLabel,
  useSheetPadding,
} from "@/src/components/ui/SheetParts";
import { Card, SectionHeader, Divider } from "@/src/components/ui/Card";
import { DefaultPeriodSheet } from "@/src/components/ui/DefaultPeriodSheet";
import { ConfirmDialog } from "@/src/components/ui/ConfirmDialog";
import { Enter } from "@/src/components/ui/Enter";
import { HueColorPicker } from "@/src/components/ui/HueColorPicker";
import { ListRow } from "@/src/components/ui/ListRow";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { StackedScreenHeader } from "@/src/components/ui/StackedScreenHeader";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { AUTO_DETECT_ENABLED_KEY, ALLOWED_BANKS_KEY } from "@/src/constants/banks";
import { DEFAULT_LIST_ID } from "@/src/constants/lists";
import { type UserCategory } from "@/src/constants/categoryPresets";
import { EmojiSuggestPicker, useAutoEmoji } from "@/src/components/ui/EmojiSuggestPicker";
import { useTheme } from "@/src/context/ThemeContext";
import {
  cancelDebtReminder,
  checkAndNotifyGoalCompleted,
  notifyDebtPaidOff,
  requestNotificationPermissions,
  scheduleDebtReminder,
} from "@/src/services/notificationService";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { ListsSheet } from "@/src/components/ui/ListsSheet";
import { useShareActiveList } from "@/src/hooks/useActiveListShare";
import { useCsvTransfer, type ImportResult } from "@/src/hooks/useCsvTransfer";
import { useListEditor } from "@/src/hooks/useListEditor";
import {
  PAYMENT_TYPE_EMOJI,
  paymentMethodEmoji,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { router } from "expo-router";
import {
  Check,
  CreditCard,
  Download,
  Eye,
  Fingerprint,
  HandCoins,
  Info,
  Landmark,
  Layers,
  LayoutGrid,
  Moon,
  Pencil,
  PiggyBank,
  Plus,
  Radar,
  Share2,
  Target,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  PanResponder,
  Pressable,
  ScrollView,
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

// ─── Hojas de Ajustes ─────────────────────────────────────────────────────────

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
    <View>
      <Pressable
        onPress={() => onToggle(!enabled)}
        android_ripple={{ color: tokens.colors.border.default }}
        style={[catSheet.row, { paddingHorizontal: 0 }]}
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        accessibilityLabel="Alertas de presupuesto"
      >
        <View style={[catSheet.emojiCircle, { backgroundColor: "#FEE2E2" }]}>
          <Text style={catSheet.emoji}>🔔</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[catSheet.name, { color: tokens.colors.text.primary }]} numberOfLines={1}>
            Alertas de presupuesto
          </Text>
          <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
            {enabled ? `Aviso al ${liveValue}% del límite` : "Desactivadas"}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: tokens.colors.border.default, true: alertColor }}
          thumbColor="#FFFFFF"
        />
      </Pressable>

      {/* ── Slider — solo cuando activo ────────────────────────────── */}
      {enabled && (
        <Reanimated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <View style={{ paddingTop: tokens.spacing.sm }}>
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

function SettingsSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const tokens = useAppTokens();
  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={{ paddingBottom: insets.bottom + 12, maxHeight: "85%" }}
    >
      <View style={{ paddingHorizontal: SHEET_PADDING_X }}>
        <SheetHeader title={title} subtitle={subtitle} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SHEET_PADDING_X,
          paddingBottom: insets.bottom + tokens.spacing.xl,
          gap: tokens.spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </BottomSheet>
  );
}

// ─── Hoja de categorías ─────────────────────────────────────────────────────────
// Lista estilo "Tus listas": emoji en círculo, nombre y tipo debajo; "+" arriba para
// agregar/gestionar. Tocar una fila la edita. Estilos estáticos + android_ripple:
// dentro de un Modal, el estilo en función de `pressed` se perdía (ver AGENTS.md).

function CategoriesSheet({
  visible,
  categories,
  listLabel,
  onClose,
  onEdit,
  onDelete,
  onManage,
}: {
  visible: boolean;
  categories: UserCategory[];
  /** Lista a la que pertenecen (cada lista tiene sus categorías). */
  listLabel: string;
  onClose: () => void;
  onEdit: (cat: UserCategory) => void;
  onDelete: (cat: UserCategory) => void;
  onManage: () => void;
}) {
  const insets = useSafeAreaInsets();
  const tokens = useAppTokens();
  const c = tokens.colors;
  const sections = [
    { title: "Gastos", items: categories.filter((cat) => cat.type === "expense") },
    { title: "Ingresos", items: categories.filter((cat) => cat.type === "income") },
  ].filter((s) => s.items.length > 0);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      style={{ paddingBottom: insets.bottom + 12, maxHeight: "85%" }}
    >
      <View style={catSheet.header}>
        <View style={{ flex: 1 }}>
          <Text style={[catSheet.title, { color: c.text.primary }]}>Tus categorías</Text>
          <Text style={[catSheet.subtitle, { color: c.text.secondary }]}>
            {listLabel} · Toca una para editarla
          </Text>
        </View>
        <PressableScale
          onPress={onManage}
          style={[catSheet.addBtn, { backgroundColor: c.surface.elevated }]}
          accessibilityRole="button"
          accessibilityLabel="Agregar o gestionar categorías"
        >
          <Plus size={20} color={c.text.primary} strokeWidth={2} />
        </PressableScale>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={catSheet.list}>
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={[catSheet.sectionLabel, { color: c.text.secondary }]}>
              {`${section.title} · ${section.items.length}`}
            </Text>
            {section.items.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => onEdit(cat)}
                android_ripple={{ color: c.border.default }}
                style={catSheet.row}
                accessibilityRole="button"
                accessibilityLabel={`Editar categoría ${cat.name}`}
              >
                <View style={[catSheet.emojiCircle, { backgroundColor: cat.colorBg }]}>
                  <Text style={catSheet.emoji}>{cat.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[catSheet.name, { color: c.text.primary }]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={[catSheet.meta, { color: c.text.secondary }]}>
                    {cat.isPreset ? "Predefinida" : "Personalizada"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDelete(cat)}
                  hitSlop={10}
                  style={catSheet.deleteBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar categoría ${cat.name}`}
                >
                  <Trash2 size={16} color={c.text.secondary} strokeWidth={1.8} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const catSheet = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2 },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  list: { paddingBottom: 16 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 20 },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 12, marginTop: 2 },
  deleteBtn: { padding: 6 },
});

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
  const sheetPad = useSheetPadding();
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
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader title={title} subtitle={subtitle} />
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
      <SheetActions onCancel={onClose} onConfirm={handleConfirm} />
    </BottomSheet>
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

const PAYMENT_TYPE_PLAIN: Record<PaymentMethodType, string> = {
  cash: "Efectivo",
  debit: "Débito / Tarjeta",
  savings: "Ahorros",
};

const PAYMENT_ICON_CATALOG = [
  "💵",
  "💳",
  "🐷",
  "🏦",
  "📱",
  "💰",
  "🪙",
  "💸",
  "👛",
  "🏧",
  "💼",
  "🌐",
];

function PaymentMethodSheet({
  visible,
  target,
  onClose,
}: {
  visible: boolean;
  target: PaymentMethod | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const tokens = useAppTokens();
  const sheetPad = useSheetPadding();
  const addMethod = useSettingsStore((st) => st.addPaymentMethod);
  const updateMethod = useSettingsStore((st) => st.updatePaymentMethod);

  const [name, setName] = useState("");
  const [type, setType] = useState<PaymentMethodType>("cash");
  const icon = useAutoEmoji(PAYMENT_TYPE_EMOJI.cash);
  const { reset } = icon;

  useEffect(() => {
    if (!visible) return;
    setName(target?.name ?? "");
    setType(target?.type ?? "cash");
    reset(target ? paymentMethodEmoji(target) : PAYMENT_TYPE_EMOJI.cash, !!target);
  }, [visible, target, reset]);

  const handleType = (t: PaymentMethodType) => {
    setType(t);
    icon.onNameChange(name, PAYMENT_TYPE_EMOJI[t]);
  };

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // Si coincide con el del tipo no se guarda: así sigue al tipo si luego cambia.
    const emoji = icon.emoji === PAYMENT_TYPE_EMOJI[type] ? undefined : icon.emoji;
    if (target) updateMethod(target.id, trimmed, type, emoji);
    else addMethod({ name: trimmed, type, emoji });
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader
        title={target ? "Editar método" : "Nuevo método de pago"}
        subtitle="Dónde tienes o con qué mueves tu plata"
      />
      <SheetLabel first>Nombre</SheetLabel>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          icon.onNameChange(t, PAYMENT_TYPE_EMOJI[type]);
        }}
        placeholder="Ej: Nequi, Bancolombia…"
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

      <SheetLabel>Tipo</SheetLabel>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {PAYMENT_TYPE_OPTIONS.map((o) => {
          const active = o.key === type;
          return (
            <Pressable
              key={o.key}
              onPress={() => handleType(o.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                gap: 4,
                backgroundColor: active ? "#DBEAFE" : theme.inputBg,
                borderWidth: 2,
                borderColor: active ? "#135BEC" : "transparent",
              }}
            >
              <Text style={{ fontSize: 20 }}>{PAYMENT_TYPE_EMOJI[o.key]}</Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontWeight: active ? "700" : "500",
                  color: active ? "#135BEC" : tokens.colors.text.secondary,
                }}
              >
                {PAYMENT_TYPE_PLAIN[o.key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SheetLabel>Ícono</SheetLabel>
      <EmojiSuggestPicker
        query={name}
        selected={icon.emoji}
        onSelect={icon.pick}
        catalog={PAYMENT_ICON_CATALOG}
      />

      <SheetActions
        confirmLabel={target ? "Guardar" : "Agregar"}
        onCancel={onClose}
        onConfirm={handleSave}
        disabled={!name.trim()}
      />
    </BottomSheet>
  );
}

export function PaymentMethodsSection() {
  const tokens = useAppTokens();
  const methods = useSettingsStore((s) => s.paymentMethods);
  const removeMethod = useSettingsStore((s) => s.removePaymentMethod);

  const [form, setForm] = useState<{ open: boolean; target: PaymentMethod | null }>({
    open: false,
    target: null,
  });
  const [deleteDialog, setDeleteDialog] = useState<{ id: string; name: string } | null>(null);
  const [minMethodAlert, setMinMethodAlert] = useState(false);

  function confirmDelete(id: string, name: string) {
    if (methods.length <= 1) {
      setMinMethodAlert(true);
      return;
    }
    setDeleteDialog({ id, name });
  }

  return (
    <>
      <View>
        {methods.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => setForm({ open: true, target: m })}
            android_ripple={{ color: tokens.colors.border.default }}
            style={[catSheet.row, { paddingHorizontal: 0 }]}
            accessibilityRole="button"
            accessibilityLabel={`${m.name}, ${PAYMENT_TYPE_PLAIN[m.type]}`}
          >
            <View
              style={[catSheet.emojiCircle, { backgroundColor: tokens.colors.surface.elevated }]}
            >
              <Text style={catSheet.emoji}>{paymentMethodEmoji(m)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[catSheet.name, { color: tokens.colors.text.primary }]}
                numberOfLines={1}
              >
                {m.name}
              </Text>
              <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
                {PAYMENT_TYPE_PLAIN[m.type]}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.sm }}>
              <Pencil size={15} color={tokens.colors.text.secondary} strokeWidth={2} />
              <TouchableOpacity
                onPress={() => confirmDelete(m.id, m.name)}
                hitSlop={8}
                style={{ padding: 4 }}
                accessibilityRole="button"
                accessibilityLabel={`Eliminar ${m.name}`}
              >
                <Trash2 size={15} color={tokens.colors.state.danger} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </Pressable>
        ))}
      </View>

      <SheetAddButton
        label="Agregar método"
        onPress={() => setForm({ open: true, target: null })}
        style={{ marginTop: 4 }}
      />

      <PaymentMethodSheet
        visible={form.open}
        target={form.target}
        onClose={() => setForm((f) => ({ ...f, open: false }))}
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
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const addSavingsGoal = useSettingsStore((st) => st.addSavingsGoal);
  const editSavingsGoal = useSettingsStore((st) => st.editSavingsGoal);
  const isEditing = !!editTarget;

  const icon = useAutoEmoji("✈️");
  const { reset: resetIcon } = icon;
  const [name, setName] = useState("");
  const [targetDisplay, setTargetDisplay] = useState("");

  useEffect(() => {
    if (!visible) {
      resetIcon("✈️");
      setName("");
      setTargetDisplay("");
    } else if (editTarget) {
      resetIcon(editTarget.emoji, true);
      setName(editTarget.name);
      setTargetDisplay(formatMoneyInput(String(editTarget.targetAmount)));
    }
  }, [visible, editTarget, resetIcon]);

  const canCreate = name.trim().length > 0 && targetDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const target = parseInt(targetDisplay.replace(/\D/g, ""), 10);
    if (!name.trim() || !target) return;
    if (isEditing && editTarget) {
      editSavingsGoal(editTarget.id, {
        name: name.trim(),
        emoji: icon.emoji,
        targetAmount: target,
      });
    } else {
      addSavingsGoal({
        name: name.trim(),
        emoji: icon.emoji,
        targetAmount: target,
        savedAmount: 0,
      });
    }
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <View style={{ gap: 20 }}>
        <SheetHeader
          title={isEditing ? "Editar meta" : "Nueva meta"}
          subtitle={"Define tu próximo objetivo de ahorro"}
        />

        {/* Nombre */}
        <View style={{ gap: 8 }}>
          <Text style={s.goalFieldLabel}>Nombre de la meta</Text>
          <TextInput
            style={s.modalInput}
            value={name}
            onChangeText={(t) => {
              setName(t);
              icon.onNameChange(t);
            }}
            placeholder="Ej. Viaje a Japón"
            placeholderTextColor={theme.textSub}
            autoCapitalize="sentences"
          />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={s.goalFieldLabel}>Ícono</Text>
          <EmojiSuggestPicker
            query={name}
            selected={icon.emoji}
            onSelect={icon.pick}
            catalog={GOAL_EMOJIS}
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

        <SheetActions
          confirmLabel={isEditing ? "Guardar" : "Crear"}
          onConfirm={handleCreate}
          onCancel={onClose}
          disabled={!canCreate}
          style={{ marginTop: 4 }}
        />
      </View>
    </BottomSheet>
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
  const sheetPad = useSheetPadding();
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
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <View style={{ gap: 16 }}>
        <SheetHeader title={"Abonar a meta"} subtitle={`${goal.emoji} ${goal.name}`} />

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

        <SheetActions
          confirmLabel={"Abonar"}
          onConfirm={handleAbonar}
          onCancel={onClose}
          disabled={abono <= 0}
          style={{ marginTop: 4 }}
        />
      </View>
    </BottomSheet>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
          <View style={[catSheet.emojiCircle, { backgroundColor: "#FEE2E2" }]}>
            <Text style={catSheet.emoji}>{goal.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[catSheet.name, { color: tokens.colors.state.success }]}>
              ¡Meta alcanzada!
            </Text>
            <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
              Ahorro completado con éxito
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
            <Trash2 size={16} color={tokens.colors.state.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
            <View
              style={[catSheet.emojiCircle, { backgroundColor: tokens.colors.surface.elevated }]}
            >
              <Text style={catSheet.emoji}>{goal.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[catSheet.name, { color: tokens.colors.text.primary }]}
                numberOfLines={1}
              >
                {goal.name}
              </Text>
              <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
                {fmt(goal.savedAmount)} / {fmt(goal.targetAmount)} · {Math.round(pct)}%
              </Text>
            </View>
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
          <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
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
  const sheetPad = useSheetPadding();
  const days = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  return (
    <BottomSheet visible={visible} onClose={onClose} style={sheetPad}>
      <SheetHeader title="Día de pago" subtitle="Se repite cada mes" />
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
  const sheetPad = useSheetPadding();
  const theme = useTheme();
  const addDebt = useSettingsStore((st) => st.addDebt);
  const editDebt = useSettingsStore((st) => st.editDebt);
  const isEditing = !!editTarget;

  const icon = useAutoEmoji(DEBT_EMOJIS[0]);
  const { reset: resetIcon } = icon;
  const [name, setName] = useState("");
  const [totalDisplay, setTotalDisplay] = useState("");
  const [paymentDisplay, setPaymentDisplay] = useState("");
  const [dueDay, setDueDay] = useState(1);
  const [daySheetOpen, setDaySheetOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      resetIcon(DEBT_EMOJIS[0]);
      setName("");
      setTotalDisplay("");
      setPaymentDisplay("");
      setDueDay(1);
    } else if (editTarget) {
      resetIcon(editTarget.emoji, true);
      setName(editTarget.name);
      setTotalDisplay(formatMoneyInput(String(editTarget.totalAmount)));
      setPaymentDisplay(formatMoneyInput(String(editTarget.monthlyPayment)));
      setDueDay(editTarget.dueDay);
    }
  }, [visible, editTarget, resetIcon]);

  const canCreate = name.trim().length > 0 && totalDisplay.replace(/\D/g, "").length > 0;

  const handleCreate = () => {
    const totalAmount = parseInt(totalDisplay.replace(/\D/g, ""), 10);
    const monthlyPayment = parseInt(paymentDisplay.replace(/\D/g, ""), 10) || 0;
    if (!name.trim() || !totalAmount) return;

    if (isEditing && editTarget) {
      editDebt(editTarget.id, {
        name: name.trim(),
        emoji: icon.emoji,
        totalAmount,
        monthlyPayment,
        dueDay,
      });
      scheduleDebtReminder({
        ...editTarget,
        name: name.trim(),
        emoji: icon.emoji,
        monthlyPayment,
        dueDay,
      });
    } else {
      const debt = addDebt({
        name: name.trim(),
        emoji: icon.emoji,
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
      <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
        <View style={{ gap: 20 }}>
          <SheetHeader
            title={isEditing ? "Editar deuda" : "Nueva deuda"}
            subtitle={"Registra una deuda para hacerle seguimiento"}
          />

          {/* Nombre */}
          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Nombre de la deuda</Text>
            <TextInput
              style={s.modalInput}
              value={name}
              onChangeText={(t) => {
                setName(t);
                icon.onNameChange(t);
              }}
              placeholder="Ej. Tarjeta de crédito"
              placeholderTextColor={theme.textSub}
              autoCapitalize="sentences"
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={s.goalFieldLabel}>Ícono</Text>
            <EmojiSuggestPicker
              query={name}
              selected={icon.emoji}
              onSelect={icon.pick}
              catalog={DEBT_EMOJIS}
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

          <SheetActions
            confirmLabel={isEditing ? "Guardar" : "Crear"}
            onConfirm={handleCreate}
            onCancel={onClose}
            disabled={!canCreate}
            style={{ marginTop: 4 }}
          />
        </View>
      </BottomSheet>
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
  const sheetPad = useSheetPadding();
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
    <BottomSheet visible={visible} onClose={onClose} avoidKeyboard style={sheetPad}>
      <View style={{ gap: 16 }}>
        <SheetHeader title={"Pagar deuda"} subtitle={`${debt.emoji} ${debt.name}`} />

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

        <SheetActions
          confirmLabel={"Pagar"}
          onConfirm={handleAbonar}
          onCancel={onClose}
          disabled={abono <= 0}
          style={{ marginTop: 4 }}
        />
      </View>
    </BottomSheet>
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
          <View style={[catSheet.emojiCircle, { backgroundColor: "#FEE2E2" }]}>
            <Text style={catSheet.emoji}>{debt.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[catSheet.name, { color: tokens.colors.state.success }]}>
              ¡Deuda liquidada!
            </Text>
            <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
              Ya no debes nada por este concepto
            </Text>
          </View>
          <Text style={{ fontSize: 22 }}>🎉</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ padding: 4 }}>
            <Trash2 size={16} color={tokens.colors.state.danger} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.spacing.md }}>
            <View
              style={[catSheet.emojiCircle, { backgroundColor: tokens.colors.surface.elevated }]}
            >
              <Text style={catSheet.emoji}>{debt.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[catSheet.name, { color: tokens.colors.text.primary }]}
                numberOfLines={1}
              >
                {debt.name}
              </Text>
              <Text style={[catSheet.meta, { color: tokens.colors.text.secondary }]}>
                Saldo: {fmt(debt.remainingAmount)} / {fmt(debt.totalAmount)}
              </Text>
            </View>
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
            <ThemedText variant="footnote" color="secondary">
              Cuota {fmt(debt.monthlyPayment)} · día {debt.dueDay}
            </ThemedText>
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
        <View
          style={{
            alignItems: "center",
            gap: tokens.spacing.sm + 2,
            paddingVertical: tokens.spacing.lg,
          }}
        >
          <Text style={{ fontSize: 32 }}>💳</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes deudas registradas{"\n"}agrégalas para controlarlas y salir de ellas
          </ThemedText>
        </View>
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
        </>
      )}

      <SheetAddButton
        label="Nueva deuda"
        onPress={() => setShowNuevaDeuda(true)}
        style={{ marginTop: 4 }}
      />

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
  const sheetPad = useSheetPadding();
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
    <BottomSheet visible onClose={onClose} avoidKeyboard style={sheetPad}>
      <SheetHeader title="Editar categoría" />
      <SheetLabel first>Nombre</SheetLabel>
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

      <SheetLabel>Ícono</SheetLabel>
      <EmojiSuggestPicker query={name} selected={emoji} onSelect={setEmoji} />

      <SheetLabel>Color de tema</SheetLabel>
      <HueColorPicker
        hue={hue}
        onChange={setHue}
        previewEmoji={emoji}
        style={{ marginBottom: 4 }}
      />

      <SheetActions onCancel={onClose} onConfirm={handleSave} disabled={!name.trim()} />
    </BottomSheet>
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
        <View
          style={{
            alignItems: "center",
            gap: tokens.spacing.sm + 2,
            paddingVertical: tokens.spacing.lg,
          }}
        >
          <Text style={{ fontSize: 32 }}>🎯</Text>
          <ThemedText variant="subheadline" color="secondary" style={{ textAlign: "center" }}>
            Aún no tienes metas de ahorro{"\n"}define una y empieza hoy
          </ThemedText>
        </View>
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
        </>
      )}

      <SheetAddButton
        label="Nueva meta"
        onPress={() => setShowNuevaMeta(true)}
        style={{ marginTop: 4 }}
      />

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

const BIOMETRIC_COLOR = "#4F46E5";

/**
 * Fila "Bloqueo con huella" (SISTEMA). Activar y desactivar piden autenticarse, para que
 * nadie con el teléfono desbloqueado pueda quitar el bloqueo. La capa que bloquea la app
 * vive en `src/components/ui/BiometricLockGate.tsx`, montada en `app/_layout.tsx`.
 */
function BiometricLockRow() {
  const tokens = useAppTokens();
  const enabled = useSettingsStore((s) => s.biometricLockEnabled);
  const setEnabled = useSettingsStore((s) => s.setBiometricLockEnabled);
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const handleToggle = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const activating = !enabled;
      const level = await LocalAuthentication.getEnrolledLevelAsync();
      if (activating && level === LocalAuthentication.SecurityLevel.NONE) {
        setUnavailable(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: activating
          ? "Confirma tu identidad para activar el bloqueo"
          : "Confirma tu identidad para desactivarlo",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });
      if (result.success) {
        setEnabled(activating);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } finally {
      setBusy(false);
    }
  }, [busy, enabled, setEnabled]);

  return (
    <>
      <ListRow
        label="Bloqueo con huella"
        icon={<Fingerprint size={16} color="#FFFFFF" strokeWidth={2} />}
        iconBg={BIOMETRIC_COLOR}
        onPress={handleToggle}
        right={
          <Switch
            value={enabled}
            disabled={busy}
            onValueChange={handleToggle}
            trackColor={{ true: "#135BEC", false: tokens.colors.border.default }}
            thumbColor={enabled ? "#fff" : tokens.colors.text.secondary}
          />
        }
      />
      <ConfirmDialog
        visible={unavailable}
        variant="info"
        title="No disponible"
        message="Configura una huella, tu rostro o un PIN en los ajustes del teléfono para usar el bloqueo."
        confirmLabel="Entendido"
        onConfirm={() => setUnavailable(false)}
        onCancel={() => setUnavailable(false)}
      />
    </>
  );
}

const DETECT_COLOR = "#0D9488";
const BANKS_COLOR = "#EA580C";

function AutoDetectSection() {
  const tokens = useAppTokens();
  const insets = useSafeAreaInsets();
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
              showChevron
              onPress={() => setShowBankSelector(true)}
            />
          </Reanimated.View>
        )}
      </Card>

      {/* Aviso de permiso */}
      <ConfirmDialog
        visible={showPermDialog}
        variant="info"
        emoji="🔔"
        align="left"
        title="Acceso a notificaciones"
        message={
          "MyWallet leerá notificaciones de tus apps bancarias para detectar transacciones automáticamente.\n\n" +
          "· Solo apps bancarias que tú elijas\n" +
          "· Procesamiento 100% en tu dispositivo\n" +
          "· Ningún dato sale de tu teléfono\n" +
          "· No accede a mensajes, fotos ni otras apps\n\n" +
          'Se abrirá la configuración del sistema. Busca "MyWallet" y activa el acceso.'
        }
        confirmLabel="Abrir ajustes"
        onConfirm={handleOpenPermissionSettings}
        onCancel={() => setShowPermDialog(false)}
      />

      {/* Selector de bancos */}
      <BottomSheet
        visible={showBankSelector}
        onClose={() => setShowBankSelector(false)}
        style={{ paddingBottom: insets.bottom + 12, maxHeight: "80%" }}
      >
        <View style={{ paddingHorizontal: 20 }}>
          <SheetHeader
            title="Bancos activos"
            subtitle="Elige de qué apps detectar transacciones. Si no seleccionas ninguno, se usan todos."
          />
        </View>
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
      </BottomSheet>
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

  const darkMode = useSettingsStore((s) => s.darkMode);
  const budgetByCategory = useSettingsStore((s) => s.budgetByCategory);
  const userCategories = useSettingsStore((s) => s.userCategories);

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
  const [periodSheet, setPeriodSheet] = useState(false);
  const [darkSheet, setDarkSheet] = useState(false);
  const [catBudgetEmoji, setCatBudgetEmoji] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCatBudgetModal, setShowCatBudgetModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showDebtsModal, setShowDebtsModal] = useState(false);
  const [editingCat, setEditingCat] = useState<UserCategory | null>(null);
  const [deleteCatDialog, setDeleteCatDialog] = useState<{ id: string; name: string } | null>(null);
  // Impide dejar un tipo (gasto/ingreso) sin ninguna categoría activa — mismo criterio
  // que "Debes tener al menos un método de pago activo" en Métodos de pago.
  const [minCatAlert, setMinCatAlert] = useState<"expense" | "income" | null>(null);

  function confirmDeleteCategory(cat: UserCategory) {
    const sameTypeCount = userCategories.filter((c) => c.type === cat.type).length;
    if (sameTypeCount <= 1) {
      setMinCatAlert(cat.type);
      return;
    }
    setDeleteCatDialog({ id: cat.id, name: cat.name });
  }

  const [clearDataDialog, setClearDataDialog] = useState(false);
  const [exportErrorDialog, setExportErrorDialog] = useState(false);
  const [notifPermDialog, setNotifPermDialog] = useState(false);

  // ── Lista activa: sus ajustes (categorías, presupuestos, período, ingresos…) ──
  const lists = useSettingsStore((s) => s.lists);
  const activeListId = useSettingsStore((s) => s.activeListId);
  const setShowIncome = useSettingsStore((s) => s.setShowIncome);
  const activeList = lists.find((l) => l.id === activeListId) ?? lists[0];
  // "Borrar historial" actúa sobre la lista activa; fuera de Personal se nombra.
  const activeListName = activeListId === DEFAULT_LIST_ID ? null : activeList.name;
  const showIncome = activeList.showIncome !== false;

  const listEditor = useListEditor();
  const [listsSheetOpen, setListsSheetOpen] = useState(false);
  const afterSheet = (fn: () => void) => {
    setListsSheetOpen(false);
    // Dos Modal apilados en Android se comportan mal: la siguiente hoja al cerrar esta.
    setTimeout(fn, 220);
  };

  const shareActiveList = useShareActiveList();
  const { exportCsv, importCsv } = useCsvTransfer();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importing, setImporting] = useState(false);

  // ── Exportar / importar CSV (de la lista activa) ────────────────────────────
  async function handleExport() {
    if (!(await exportCsv())) setExportErrorDialog(true);
  }

  async function handleImport() {
    if (importing) return;
    setImporting(true);
    try {
      const result = await importCsv();
      if (result) setImportResult(result);
    } catch {
      setImportResult({ recognized: false, imported: 0, duplicates: 0, invalid: 0 });
    } finally {
      setImporting(false);
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

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: tokens.colors.surface.primary }}
      edges={["top"]}
    >
      <StackedScreenHeader onBack={() => router.back()} title="Configuración" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          padding: tokens.spacing.md,
          paddingBottom: insets.bottom + tokens.spacing.xl,
          gap: tokens.spacing.lg,
        }}
      >
        {/* ── LISTAS ───────────────────────────────────────────────────── */}
        <Enter index={0} screenId="settings">
          <SectionHeader>LISTAS</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Tus listas"
              icon={<Layers size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.accent.default}
              detail={String(lists.length)}
              showChevron
              onPress={() => setListsSheetOpen(true)}
            />
          </Card>
        </Enter>

        {/* ── EN TU LISTA ACTUAL: todo lo de aquí cambia con la lista activa ── */}
        <Enter index={1} screenId="settings">
          <SectionHeader>{`EN TU LISTA · ${activeList.emoji} ${activeList.name}`}</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Categorías"
              icon={<LayoutGrid size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.success}
              showChevron
              onPress={() => setShowCategoriesModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Presupuestos"
              icon={<PiggyBank size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#7C3AED"
              showChevron
              onPress={() => setShowCatBudgetModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Pago y período"
              icon={<Wallet size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.success}
              showChevron
              onPress={() => setPeriodSheet(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Mostrar ingresos"
              icon={<Eye size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#16A34A"
              onPress={() => setShowIncome(activeListId, !showIncome)}
              right={
                <Switch
                  value={showIncome}
                  onValueChange={(v) => setShowIncome(activeListId, v)}
                  trackColor={{ true: "#135BEC", false: tokens.colors.border.default }}
                  thumbColor={showIncome ? "#fff" : tokens.colors.text.secondary}
                />
              }
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Compartir lista"
              icon={<Share2 size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#0891B2"
              showChevron
              onPress={() => shareActiveList()}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Exportar CSV"
              icon={<Download size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              showChevron
              onPress={handleExport}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label={importing ? "Importando…" : "Importar CSV"}
              icon={<Upload size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              showChevron
              onPress={handleImport}
            />
          </Card>
        </Enter>

        {/* ── GESTIÓN (de todas las listas) ───────────────────────────── */}
        <Enter index={2} screenId="settings">
          <SectionHeader>GESTIÓN</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Métodos de pago"
              icon={<CreditCard size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.accent.default}
              showChevron
              onPress={() => setShowPaymentModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Metas de ahorro"
              icon={<Target size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#DB2777"
              showChevron
              onPress={() => setShowGoalsModal(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Deudas"
              icon={<HandCoins size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={DEBT_COLOR}
              showChevron
              onPress={() => setShowDebtsModal(true)}
            />
          </Card>
        </Enter>

        {/* ── DETECCIÓN AUTOMÁTICA ──────────────────────────────────────── */}
        <Enter index={3} screenId="settings">
          <SectionHeader>DETECCIÓN AUTOMÁTICA</SectionHeader>
          <AutoDetectSection />
        </Enter>

        {/* ── SISTEMA ──────────────────────────────────────────────────── */}
        {/* Fusiona lo que antes eran 3 secciones separadas (Apariencia, Sistema,
            Acerca de) en una sola, a pedido del usuario (2026-09-02) — Modo oscuro
            y Versión no ameritaban su propia sección con una sola fila cada una. */}
        <Enter index={4} screenId="settings">
          <SectionHeader>SISTEMA</SectionHeader>
          <Card padded={false}>
            <ListRow
              label="Modo oscuro"
              icon={<Moon size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg="#7C3AED"
              showChevron
              onPress={() => setDarkSheet(true)}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <BiometricLockRow />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Borrar historial de transacciones"
              icon={<Trash2 size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.state.danger}
              destructive
              onPress={handleClearData}
            />
            <Divider inset={tokens.spacing.md * 2 + 34} />
            <ListRow
              label="Versión"
              icon={<Info size={16} color="#FFFFFF" strokeWidth={2} />}
              iconBg={tokens.colors.text.secondary}
              detail={`v${APP_VERSION}`}
            />
          </Card>
        </Enter>
      </ScrollView>

      {/* ── Modales ───────────────────────────────────────────────────── */}

      <DefaultPeriodSheet visible={periodSheet} onClose={() => setPeriodSheet(false)} />

      <ListsSheet
        visible={listsSheetOpen}
        lists={lists}
        activeListId={activeListId}
        onSelect={(id) => {
          setListsSheetOpen(false);
          if (id !== activeListId) listEditor.goToList(id);
        }}
        onEditActive={() => afterSheet(() => listEditor.openEdit(activeListId))}
        onNew={() => afterSheet(listEditor.openNew)}
        onClose={() => setListsSheetOpen(false)}
      />
      {listEditor.element}

      <ConfirmDialog
        visible={importResult !== null}
        variant={importResult?.recognized && importResult.imported > 0 ? "info" : "warning"}
        title={importResult?.recognized ? "Importación lista" : "No se pudo importar"}
        message={
          !importResult
            ? ""
            : !importResult.recognized
              ? "El archivo no es un CSV exportado desde MyWallet. Usa Exportar CSV en la app para generarlo."
              : [
                  `Se importaron ${importResult.imported} movimientos en ${activeList.emoji} ${activeList.name}.`,
                  importResult.duplicates > 0
                    ? `${importResult.duplicates} ya estaban y se omitieron.`
                    : "",
                  importResult.invalid > 0
                    ? `${importResult.invalid} filas no se pudieron leer.`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
        }
        confirmLabel="Entendido"
        onConfirm={() => setImportResult(null)}
        onCancel={() => setImportResult(null)}
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

      {/* ── Hoja: Métodos de pago ─────────────────── */}
      <SettingsSheet
        visible={showPaymentModal}
        title="Métodos de pago"
        onClose={() => setShowPaymentModal(false)}
      >
        <PaymentMethodsSection />
      </SettingsSheet>

      {/* ── Hoja: Metas de ahorro ─────────────────── */}
      <SettingsSheet
        visible={showGoalsModal}
        title="Metas de ahorro"
        onClose={() => setShowGoalsModal(false)}
      >
        <SavingsGoalsSection />
      </SettingsSheet>

      {/* ── Hoja: Deudas ──────────────────────────── */}
      <SettingsSheet
        visible={showDebtsModal}
        title="Deudas"
        onClose={() => setShowDebtsModal(false)}
      >
        <DebtsSection />
      </SettingsSheet>

      {/* ── Bottom sheet: Categorías ─────────────────────────────────── */}
      <CategoriesSheet
        visible={showCategoriesModal}
        categories={userCategories}
        listLabel={`${activeList.emoji} ${activeList.name}`}
        onClose={() => setShowCategoriesModal(false)}
        onEdit={(cat) => {
          setShowCategoriesModal(false);
          setEditingCat(cat);
        }}
        onDelete={confirmDeleteCategory}
        onManage={() => {
          setShowCategoriesModal(false);
          router.push("/category-onboarding?edit=1");
        }}
      />

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

      {/* ── Hoja: Presupuesto por categoría ───────── */}
      <SettingsSheet
        visible={showCatBudgetModal}
        title="Presupuestos"
        subtitle={`${activeList.emoji} ${activeList.name} · Toca una para fijar su límite`}
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
          <View>
            {userCategories
              .filter((c) => c.type === "expense")
              .map((cat) => {
                const current = budgetByCategory[cat.emoji];
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setCatBudgetEmoji(cat.emoji)}
                    android_ripple={{ color: tokens.colors.border.default }}
                    style={[catSheet.row, { paddingHorizontal: 0 }]}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.name}, ${current ? `Límite ${formatCOP(current)}` : "Sin límite"}`}
                  >
                    <View style={[catSheet.emojiCircle, { backgroundColor: cat.colorBg }]}>
                      <Text style={catSheet.emoji}>{cat.emoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[catSheet.name, { color: tokens.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      <Text
                        style={[
                          catSheet.meta,
                          {
                            color: current
                              ? tokens.colors.state.success
                              : tokens.colors.text.secondary,
                          },
                        ]}
                      >
                        {current ? formatCOP(current) : "Sin límite"}
                      </Text>
                    </View>
                    {current ? (
                      <Pressable
                        onPress={() => removeBudgetForCategory(cat.emoji)}
                        hitSlop={10}
                        style={catSheet.deleteBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Quitar límite de ${cat.name}`}
                      >
                        <X size={16} color={tokens.colors.text.secondary} strokeWidth={1.8} />
                      </Pressable>
                    ) : null}
                  </Pressable>
                );
              })}
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ThemedText variant="subheadline" color="secondary">
              No tienes categorías de gasto configuradas
            </ThemedText>
          </View>
        )}
      </SettingsSheet>

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
        message={
          activeListName
            ? `Se eliminarán todos los registros de la lista "${activeListName}". Tus otras listas, configuración, categorías, presupuestos y metas se conservarán. Esta acción no se puede deshacer.`
            : "Se eliminarán todos tus registros de ingresos y gastos, de todas tus listas. Tu configuración, categorías, presupuestos y metas se conservarán. Esta acción no se puede deshacer."
        }
        confirmLabel="Borrar historial"
        onConfirm={executeClearData}
        onCancel={() => setClearDataDialog(false)}
      />

      <ConfirmDialog
        visible={exportErrorDialog}
        variant="warning"
        title="Error al exportar"
        message="No se pudo generar o compartir el archivo CSV. Intenta de nuevo."
        confirmLabel="Entendido"
        onConfirm={() => setExportErrorDialog(false)}
        onCancel={() => setExportErrorDialog(false)}
      />

      <ConfirmDialog
        visible={!!deleteCatDialog}
        variant="danger"
        title="Eliminar categoría"
        message={`¿Seguro que quieres eliminar "${deleteCatDialog?.name ?? ""}"? Las transacciones ya registradas con esta categoría no se modifican.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (deleteCatDialog) useSettingsStore.getState().removeUserCategory(deleteCatDialog.id);
          setDeleteCatDialog(null);
        }}
        onCancel={() => setDeleteCatDialog(null)}
      />

      <ConfirmDialog
        visible={!!minCatAlert}
        variant="info"
        title="No es posible"
        message={`Debes tener al menos una categoría de ${minCatAlert === "income" ? "ingreso" : "gasto"} activa.`}
        confirmLabel="Entendido"
        onConfirm={() => setMinCatAlert(null)}
        onCancel={() => setMinCatAlert(null)}
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
