/**
 * FilterChips — chip de filtro de período en el Dashboard.
 * Un único chip que agrupa períodos rápidos + "Elegir mes específico".
 */
import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from "react-native";
import {
  CalendarCheck,
  Calendar,
  CalendarDays,
  CalendarPlus,
  List,
  Check,
  ChevronsUpDown,
  ChevronRight,
} from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";

// ─── Opciones ─────────────────────────────────────────────────────────────────

export const PERIODS = ["Hoy", "Ayer", "Esta semana", "Este mes", "Este año", "Todo"];

type LucideIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const PERIOD_ICONS: Record<string, LucideIcon> = {
  "Hoy":          CalendarCheck,
  "Ayer":         Calendar,
  "Esta semana":  CalendarDays,
  "Este mes":     CalendarDays,
  "Este año":     CalendarPlus,
  "Todo":         List,
};

// ─── Bottom Sheet de período ──────────────────────────────────────────────────

function PeriodSheet({
  visible,
  selected,
  onSelect,
  onClose,
  onOpenMonthPicker,
}: {
  visible: boolean;
  selected: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  onOpenMonthPicker?: () => void;
}) {
  const theme = useTheme();
  const bs    = useMemo(() => buildBs(theme), [theme]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={bs.backdrop} />
      </TouchableWithoutFeedback>
      <View style={bs.container}>
        <View style={bs.handle} />
        <Text style={bs.title}>Periodo</Text>

        {PERIODS.map((opt, i) => {
          const Icon  = PERIOD_ICONS[opt];
          const isSel = opt === selected;
          return (
            <View key={opt}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt); onClose(); }}
                style={bs.option}
              >
                <View style={bs.optionLeft}>
                  <View style={[bs.iconBox, isSel && { backgroundColor: theme.accent + "18" }]}>
                    {Icon && <Icon size={18} color={isSel ? theme.accent : theme.textSub} strokeWidth={1.8} />}
                  </View>
                  <Text style={[bs.optionText, isSel && { color: theme.accent, fontWeight: "700" }]}>
                    {opt}
                  </Text>
                </View>
                {isSel && <Check size={16} color={theme.accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < PERIODS.length - 1 && <View style={bs.sep} />}
            </View>
          );
        })}

        {/* Separador + elegir mes específico */}
        <View style={bs.sep} />
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => { onClose(); onOpenMonthPicker?.(); }}
          style={bs.option}
        >
          <View style={bs.optionLeft}>
            <View style={bs.iconBox}>
              <CalendarDays size={18} color={theme.textSub} strokeWidth={1.8} />
            </View>
            <Text style={bs.optionText}>Elegir mes específico...</Text>
          </View>
          <ChevronRight size={16} color={theme.textSub} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Pill chip ────────────────────────────────────────────────────────────────

function PillChip({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  const ch    = useMemo(() => buildCh(theme), [theme]);
  return (
    <TouchableOpacity activeOpacity={0.72} onPress={onPress} style={ch.pill}>
      <Text style={ch.pillText} numberOfLines={1}>{label}</Text>
      <ChevronsUpDown size={13} color={theme.text} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface FilterChipsProps {
  period: string;               // label activo para checkmark en el sheet
  periodLabel?: string;         // label a mostrar en el chip (ej: "Abr 2025")
  onPeriodChange: (p: string) => void;
  onOpenMonthPicker?: () => void;
}

export function FilterChips({
  period,
  periodLabel,
  onPeriodChange,
  onOpenMonthPicker,
}: FilterChipsProps) {
  const theme = useTheme();
  const ch    = useMemo(() => buildCh(theme), [theme]);
  const [sheetVisible, setSheetVisible] = useState(false);

  return (
    <>
      <View style={ch.row}>
        <PillChip
          label={periodLabel ?? period}
          onPress={() => setSheetVisible(true)}
        />
      </View>

      <PeriodSheet
        visible={sheetVisible}
        selected={period}
        onSelect={onPeriodChange}
        onClose={() => setSheetVisible(false)}
        onOpenMonthPicker={onOpenMonthPicker}
      />
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

function buildBs(t: AppTheme) { return StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.4)",
  },
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: t.surface,
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
    backgroundColor: t.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: t.text,
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
    backgroundColor: t.inputBg,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    fontSize: 15,
    color: t.text,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: t.border,
    marginHorizontal: 20,
  },
});}

function buildCh(t: AppTheme) { return StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: t.surface,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: t.border,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: t.text,
    lineHeight: 20,
  },
});}
