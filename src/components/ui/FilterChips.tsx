/**
 * FilterChips — chips de filtro en el home.
 * Diseño tipo MonAI: pills con icono ↕, separados por "en".
 * Chip 1 → periodo (bottom sheet)
 * Chip 2 → categoría (bottom sheet)
 */
import { useState, useRef, useMemo } from "react";
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
} from "lucide-react-native";
import { ALL_CATEGORY_EMOJIS, EMOJI_TO_CATEGORY_NAME } from "@/src/constants/theme";
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

// Categorías disponibles para filtrar (null = todas)
type CategoryOption = { emoji: string | null; label: string };

const CATEGORY_OPTIONS: CategoryOption[] = [
  { emoji: null, label: "Todas" },
  ...ALL_CATEGORY_EMOJIS.map((e) => ({
    emoji: e,
    label: EMOJI_TO_CATEGORY_NAME[e] ?? e,
  })),
];

// ─── Colores ──────────────────────────────────────────────────────────────────
const ACCENT    = "#135BEC";
const SLATE_900 = "#0F172A";
const SLATE_500 = "#64748B";
const WHITE     = "#FFFFFF";
const BORDER    = "#E2E8F0";

// ─── Bottom Sheet genérico ────────────────────────────────────────────────────

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
                  <Text style={[bs.optionText, isSel && { color: theme.accent, fontWeight: "700" }]}>{opt}</Text>
                </View>
                {isSel && <Check size={16} color={theme.accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < PERIODS.length - 1 && <View style={bs.sep} />}
            </View>
          );
        })}
      </View>
    </Modal>
  );
}

function CategorySheet({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string | null;
  onSelect: (v: string | null) => void;
  onClose: () => void;
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
        <Text style={bs.title}>Categoría</Text>
        {CATEGORY_OPTIONS.map((opt, i) => {
          const isSel = opt.emoji === selected;
          return (
            <View key={opt.label}>
              <TouchableOpacity
                activeOpacity={0.6}
                onPress={() => { onSelect(opt.emoji); onClose(); }}
                style={bs.option}
              >
                <View style={bs.optionLeft}>
                  <View style={[bs.iconBox, isSel && { backgroundColor: theme.accent + "18" }]}>
                    {opt.emoji
                      ? <Text style={bs.emojiIcon}>{opt.emoji}</Text>
                      : <List size={18} color={isSel ? theme.accent : theme.textSub} strokeWidth={1.8} />
                    }
                  </View>
                  <Text style={[bs.optionText, isSel && { color: theme.accent, fontWeight: "700" }]}>
                    {opt.label.charAt(0).toUpperCase() + opt.label.slice(1)}
                  </Text>
                </View>
                {isSel && <Check size={16} color={theme.accent} strokeWidth={2.5} />}
              </TouchableOpacity>
              {i < CATEGORY_OPTIONS.length - 1 && <View style={bs.sep} />}
            </View>
          );
        })}
      </View>
    </Modal>
  );
}

// ─── Pill chip estilo MonAI ───────────────────────────────────────────────────

function PillChip({
  emoji,
  label,
  onPress,
}: {
  emoji?: string | null;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const ch    = useMemo(() => buildCh(theme), [theme]);
  return (
    <TouchableOpacity activeOpacity={0.72} onPress={onPress} style={ch.pill}>
      {emoji ? <Text style={ch.pillEmoji}>{emoji}</Text> : null}
      <Text style={ch.pillText} numberOfLines={1}>{label}</Text>
      <ChevronsUpDown size={13} color={theme.text} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface FilterChipsProps {
  period: string;
  onPeriodChange: (p: string) => void;
  category: string | null;          // null = Todas
  onCategoryChange: (c: string | null) => void;
}

export function FilterChips({
  period,
  onPeriodChange,
  category,
  onCategoryChange,
}: FilterChipsProps) {
  const theme = useTheme();
  const ch    = useMemo(() => buildCh(theme), [theme]);
  const [periodSheetVisible,   setPeriodSheetVisible]   = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);

  const categoryLabel =
    category
      ? (EMOJI_TO_CATEGORY_NAME[category] ?? category)
      : "Todas";

  const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  return (
    <>
      <View style={ch.row}>
        {/* Periodo */}
        <PillChip label={period} onPress={() => setPeriodSheetVisible(true)} />

        {/* Separador */}
        <Text style={ch.separator}>en</Text>

        {/* Categoría */}
        <PillChip
          emoji={category ?? undefined}
          label={capitalizeFirst(categoryLabel)}
          onPress={() => setCategorySheetVisible(true)}
        />
      </View>

      <PeriodSheet
        visible={periodSheetVisible}
        selected={period}
        onSelect={onPeriodChange}
        onClose={() => setPeriodSheetVisible(false)}
      />

      <CategorySheet
        visible={categorySheetVisible}
        selected={category}
        onSelect={onCategoryChange}
        onClose={() => setCategorySheetVisible(false)}
      />
    </>
  );
}

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

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
  emojiIcon: {
    fontSize: 18,
    lineHeight: 24,
  },
  optionText: {
    fontSize: 15,
    color: t.text,
  },
  optionTextSelected: {
    color: t.accent,
    fontWeight: "700",
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
    gap: 6,
  },
  separator: {
    fontSize: 13,
    color: t.textSub,
    fontWeight: "500",
    paddingHorizontal: 2,
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
  pillEmoji: {
    fontSize: 15,
    lineHeight: 20,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "600",
    color: t.text,
    lineHeight: 20,
  },
});}
