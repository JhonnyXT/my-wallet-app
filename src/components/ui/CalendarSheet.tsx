import { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/src/context/ThemeContext";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import type { AppTheme } from "@/src/theme";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

// Lunes = 0 … Domingo = 6 (getDay() nativo empieza en Domingo = 0)
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

function buildMonthGrid(viewMonth: Date): (Date | null)[] {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = mondayIndex(firstDay);

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export interface CalendarSheetProps {
  visible: boolean;
  selectedDate: Date | null;
  accent: string;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

/** Bottom sheet con calendario mensual minimalista, dibujado a mano (sin librería externa). */
export function CalendarSheet({
  visible,
  selectedDate,
  accent,
  onSelect,
  onClose,
}: CalendarSheetProps) {
  const theme = useTheme();
  const s = useMemo(() => buildStyles(theme), [theme]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [viewMonth, setViewMonth] = useState(() => startOfDay(selectedDate ?? new Date()));

  useEffect(() => {
    if (visible) setViewMonth(startOfDay(selectedDate ?? new Date()));
  }, [visible, selectedDate]);

  const reducedMotion = useReducedMotion();
  const monthOpacity = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    monthOpacity.value = 0;
    monthOpacity.value = withTiming(1, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth.getFullYear(), viewMonth.getMonth()]);
  const monthAnimStyle = useAnimatedStyle(() => ({ opacity: monthOpacity.value }));

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = capitalize(
    viewMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" }),
  );
  const nextMonthDisabled =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  function goToMonth(offset: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function pick(date: Date) {
    onSelect(date);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} style={s.container}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => goToMonth(-1)} hitSlop={10} style={s.navBtn}>
          <ChevronLeft size={20} color={theme.textSub} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={s.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => !nextMonthDisabled && goToMonth(1)}
          hitSlop={10}
          style={s.navBtn}
          disabled={nextMonthDisabled}
        >
          <ChevronRight
            size={20}
            color={nextMonthDisabled ? theme.textTertiary : theme.textSub}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.todayChip, { borderColor: accent }]}
        onPress={() => pick(today)}
        activeOpacity={0.7}
      >
        <Text style={[s.todayChipText, { color: accent }]}>Hoy</Text>
      </TouchableOpacity>

      <View style={s.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={s.weekdayText}>
            {w}
          </Text>
        ))}
      </View>

      <Animated.View style={[s.grid, monthAnimStyle]}>
        {grid.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={s.cell} />;
          const isFuture = date > today;
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const isToday = isSameDay(date, today);
          const inMonth = isSameMonth(date, viewMonth);
          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={s.cell}
              onPress={() => pick(date)}
              disabled={isFuture}
              activeOpacity={0.6}
            >
              <View style={[s.dayCircle, isSelected && { backgroundColor: accent }]}>
                <Text
                  style={[
                    s.dayText,
                    !inMonth && s.dayTextOutMonth,
                    isFuture && s.dayTextDisabled,
                    isSelected && s.dayTextSelected,
                    isToday && !isSelected && { color: accent, fontWeight: "700" },
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </BottomSheet>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    container: { paddingBottom: 36, paddingHorizontal: 20 },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    monthLabel: { fontSize: 16, fontWeight: "700", color: t.text },
    todayChip: {
      alignSelf: "center",
      marginTop: 12,
      marginBottom: 4,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 9999,
      borderWidth: 1.5,
    },
    todayChipText: { fontSize: 13, fontWeight: "700" },
    weekdayRow: { flexDirection: "row", marginTop: 16, marginBottom: 4 },
    weekdayText: {
      flex: 1,
      textAlign: "center",
      fontSize: 12,
      fontWeight: "700",
      color: t.textTertiary,
    },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: { fontSize: 14, fontWeight: "500", color: t.text },
    dayTextOutMonth: { color: t.textTertiary },
    dayTextDisabled: { color: t.textTertiary, opacity: 0.4 },
    dayTextSelected: { color: "#FFFFFF", fontWeight: "700" },
  });
}
