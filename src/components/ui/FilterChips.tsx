/**
 * FilterChips — chips de filtro en el home.
 *
 * El chip de PERIODO abre un bottom sheet (igual que ListSheet en active-expense).
 * El chip de WALLET mantiene el dropdown minimalista original.
 */
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Pressable,
  Animated,
} from "react-native";
import {
  CalendarCheck,
  Calendar,
  CalendarDays,
  CalendarPlus,
  List,
  Check,
} from "lucide-react-native";

// ─── Opciones ─────────────────────────────────────────────────────────────────

export const PERIODS = ["Hoy", "Ayer", "Esta semana", "Este mes", "Este año", "Todo"];
const WALLETS = ["Personal", "Trabajo", "Ahorros"];

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const PERIOD_ICONS: Record<string, LucideIcon> = {
  "Hoy":          CalendarCheck,
  "Ayer":         Calendar,
  "Esta semana":  CalendarDays,
  "Este mes":     CalendarDays,
  "Este año":     CalendarPlus,
  "Todo":         List,
};

// ─── Colores ──────────────────────────────────────────────────────────────────
const ACCENT   = "#135BEC";
const SLATE_900 = "#0F172A";
const SLATE_500 = "#64748B";
const WHITE     = "#FFFFFF";
const BORDER    = "#E2E8F0";

// ─── PeriodSheet — bottom sheet igual a ListSheet de active-expense ───────────
function PeriodSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={bs.backdrop} />
      </TouchableWithoutFeedback>

      <View style={bs.container}>
        {/* Handle */}
        <View style={bs.handle} />
        {/* Título */}
        <Text style={bs.title}>Periodo</Text>

        {PERIODS.map((opt, i) => {
          const Icon = PERIOD_ICONS[opt];
          const isSel = opt === selected;
          return (
            <View key={opt}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt); onClose(); }}
                style={bs.option}
              >
                <View style={bs.optionLeft}>
                  <View style={[bs.iconBox, isSel && { backgroundColor: ACCENT + "18" }]}>
                    {Icon && (
                      <Icon
                        size={18}
                        color={isSel ? ACCENT : SLATE_500}
                        strokeWidth={1.8}
                      />
                    )}
                  </View>
                  <Text style={[bs.optionText, isSel && bs.optionTextSelected]}>
                    {opt}
                  </Text>
                </View>
                {isSel && <Check size={16} color={ACCENT} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < PERIODS.length - 1 && <View style={bs.sep} />}
            </View>
          );
        })}
      </View>
    </Modal>
  );
}

// ─── Dropdown para wallet (diseño minimalista existente) ──────────────────────

interface DropdownConfig {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  x: number;
  y: number;
  minWidth: number;
}

function DropdownModal({
  config,
  onClose,
}: {
  config: DropdownConfig;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 280,
        friction: 22,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          dd.dropdown,
          {
            top: config.y,
            left: config.x,
            minWidth: config.minWidth,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {config.options.map((opt, i) => {
          const isSelected = config.selected === opt;
          const isLast = i === config.options.length - 1;
          return (
            <View key={opt}>
              <Pressable
                android_ripple={{ color: "#F0F0F0" }}
                style={({ pressed }) => [
                  dd.itemPressable,
                  pressed && dd.itemPressed,
                ]}
                onPress={() => { config.onSelect(opt); onClose(); }}
              >
                <View style={dd.itemRow}>
                  <Text style={[dd.itemText, isSelected && dd.itemTextSelected]}>
                    {opt}
                  </Text>
                  {isSelected ? (
                    <Text style={dd.check}>✓</Text>
                  ) : (
                    <View style={dd.checkPlaceholder} />
                  )}
                </View>
              </Pressable>
              {!isLast && <View style={dd.sep} />}
            </View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View style={ch.chip}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        <View style={ch.chipContent}>
          <Text style={ch.chipText}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Chip con measure (para dropdown posicionado) ─────────────────────────────

function MeasuredChip({
  label,
  onPress,
}: {
  label: string;
  onPress: (pos: { x: number; y: number; width: number }) => void;
}) {
  const ref = useRef<View>(null);

  const handlePress = () => {
    ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
      onPress({ x: pageX, y: pageY + height + 8, width });
    });
  };

  return (
    <View ref={ref} style={ch.chip}>
      <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
        <View style={ch.chipContent}>
          <Text style={ch.chipText}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface FilterChipsProps {
  period: string;
  onPeriodChange: (p: string) => void;
}

export function FilterChips({ period, onPeriodChange }: FilterChipsProps) {
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
  const [walletDropdown, setWalletDropdown] = useState<DropdownConfig | null>(null);

  const openWallet = ({ x, y, width }: { x: number; y: number; width: number }) =>
    setWalletDropdown({
      options: WALLETS,
      selected: wallet,
      onSelect: setWallet,
      x,
      y,
      minWidth: Math.max(width, 148),
    });

  return (
    <>
      <View style={ch.row}>
        {/* Periodo → bottom sheet */}
        <Chip label={period} onPress={() => setPeriodSheetVisible(true)} />
        {/* Wallet → dropdown */}
        <MeasuredChip label={wallet} onPress={openWallet} />
      </View>

      <PeriodSheet
        visible={periodSheetVisible}
        selected={period}
        onSelect={onPeriodChange}
        onClose={() => setPeriodSheetVisible(false)}
      />

      {walletDropdown && (
        <DropdownModal
          config={walletDropdown}
          onClose={() => setWalletDropdown(null)}
        />
      )}
    </>
  );
}

// ─── Estilos: bottom sheet ────────────────────────────────────────────────────

const bs = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: WHITE,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: SLATE_900,
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 15,
    color: SLATE_900,
  },
  optionTextSelected: {
    color: ACCENT,
    fontWeight: "700",
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginHorizontal: 20,
  },
});

// ─── Estilos: dropdown wallet ─────────────────────────────────────────────────

const dd = StyleSheet.create({
  dropdown: {
    position: "absolute",
    backgroundColor: WHITE,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 22,
  },
  itemPressable: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 50,
  },
  itemPressed: { backgroundColor: "#F7F7F7" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#3A3A3A",
    letterSpacing: -0.2,
    flex: 1,
  },
  itemTextSelected: { fontWeight: "700", color: "#000000" },
  check: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    marginLeft: 12,
    lineHeight: 20,
  },
  checkPlaceholder: { width: 27 },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EBEBEB",
  },
});

// ─── Estilos: chip ────────────────────────────────────────────────────────────

const ch = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chip: {
    backgroundColor: WHITE,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#D4D4D4",
    overflow: "hidden",
  },
  chipContent: {
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    lineHeight: 20,
  },
});
