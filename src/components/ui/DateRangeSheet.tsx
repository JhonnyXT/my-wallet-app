/**
 * DateRangeSheet — calendario interactivo de rango (desde–hasta), dibujado a mano igual que
 * CalendarSheet.tsx (fade entre meses, sin librería externa). A diferencia de CalendarSheet
 * (una sola fecha, selecciona y cierra), acá el usuario toca dos días — el primero fija el
 * inicio, el segundo el fin — y el rango entre ambos se resalta en el grid. Incluye accesos
 * rápidos (3/6/12 meses) que llenan el rango y aplican de inmediato.
 */
import { useEffect, useMemo, useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
  withSpring,
} from "react-native-reanimated";

import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { ThemedText } from "@/src/components/ui/ThemedText";
import { useAppTokens } from "@/src/theme/tokens";

const WEEKDAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isSameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
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

const MONTH_ABBR = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function formatShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

export interface DateRangeSheetProps {
  visible: boolean;
  initialStart: Date | null;
  initialEnd: Date | null;
  onApply: (start: Date, end: Date) => void;
  onClose: () => void;
}

const QUICK_PICKS = [
  { label: "3 meses", months: 3 },
  { label: "6 meses", months: 6 },
  { label: "1 año", months: 12 },
] as const;

export function DateRangeSheet({ visible, initialStart, initialEnd, onApply, onClose }: DateRangeSheetProps) {
  const tokens = useAppTokens();
  const s = useMemo(() => buildStyles(), []);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [viewMonth, setViewMonth] = useState(() => startOfDay(initialEnd ?? new Date()));
  const [rangeStart, setRangeStart] = useState<Date | null>(initialStart);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(initialEnd);

  useEffect(() => {
    if (visible) {
      setViewMonth(startOfDay(initialEnd ?? new Date()));
      setRangeStart(initialStart);
      setRangeEnd(initialEnd);
    }
  }, [visible, initialStart, initialEnd]);

  const reducedMotion = useReducedMotion();
  const monthOpacity = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    monthOpacity.value = 0;
    monthOpacity.value = withTiming(1, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth.getFullYear(), viewMonth.getMonth()]);
  const monthAnimStyle = useAnimatedStyle(() => ({ opacity: monthOpacity.value }));

  // La tarjeta "Tendencia" es una gráfica de barras mensuales — con un solo mes seleccionado
  // se ve una única barra flotando sin nada que comparar, así que exigimos al menos 2 meses.
  const isValidRange = rangeStart && rangeEnd ? !isSameMonth(rangeStart, rangeEnd) : false;

  const applyScale = useSharedValue(1);
  const applyAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: applyScale.value }] }));
  useEffect(() => {
    if (reducedMotion) return;
    applyScale.value = withSpring(isValidRange ? 1 : 0.97, tokens.motion.spring.snappy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValidRange]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = capitalize(viewMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" }));
  const nextMonthDisabled =
    viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() === today.getMonth();

  function goToMonth(offset: number) {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  function tapDay(date: Date) {
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date < rangeStart) {
      setRangeStart(date);
      return;
    }
    setRangeEnd(date);
  }

  function pickQuick(months: number) {
    const end = today;
    const start = new Date(today.getFullYear(), today.getMonth() - months + 1, 1);
    setViewMonth(end);
    onApply(start, end);
  }

  function confirm() {
    if (rangeStart && rangeEnd && isValidRange) onApply(rangeStart, rangeEnd);
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} style={s.container}>
      <ThemedText variant="headline" style={{ fontSize: 17, marginBottom: tokens.spacing.md }}>
        Rango de la tendencia
      </ThemedText>

      {/* Accesos rápidos */}
      <View style={{ flexDirection: "row", gap: tokens.spacing.sm, marginBottom: tokens.spacing.lg }}>
        {QUICK_PICKS.map((q) => (
          <PressableScale
            key={q.label}
            onPress={() => pickQuick(q.months)}
            style={{
              flex: 1,
              paddingVertical: tokens.spacing.sm,
              borderRadius: tokens.radius.full,
              alignItems: "center",
              backgroundColor: tokens.colors.surface.elevated,
            }}
          >
            <ThemedText variant="footnote" style={{ fontWeight: "600" }}>
              {q.label}
            </ThemedText>
          </PressableScale>
        ))}
      </View>

      {/* Resumen del rango elegido a mano */}
      <View
        style={[
          s.summary,
          { backgroundColor: tokens.colors.surface.elevated, borderRadius: tokens.radius.lg },
        ]}
      >
        <View style={{ flex: 1, alignItems: "center" }}>
          <ThemedText variant="footnote" color="secondary">
            Desde
          </ThemedText>
          <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={1}>
            {rangeStart ? formatShort(rangeStart) : "—"}
          </ThemedText>
        </View>
        <View style={{ width: 1, alignSelf: "stretch", backgroundColor: tokens.colors.border.default }} />
        <View style={{ flex: 1, alignItems: "center" }}>
          <ThemedText variant="footnote" color="secondary">
            Hasta
          </ThemedText>
          <ThemedText variant="body" style={{ fontWeight: "700" }} numberOfLines={1}>
            {rangeEnd ? formatShort(rangeEnd) : "—"}
          </ThemedText>
        </View>
      </View>

      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => goToMonth(-1)} hitSlop={10} style={s.navBtn}>
          <ChevronLeft size={20} color={tokens.colors.text.secondary} strokeWidth={2} />
        </TouchableOpacity>
        <ThemedText variant="body" style={{ fontWeight: "700" }}>
          {monthLabel}
        </ThemedText>
        <TouchableOpacity
          onPress={() => !nextMonthDisabled && goToMonth(1)}
          hitSlop={10}
          style={s.navBtn}
          disabled={nextMonthDisabled}
        >
          <ChevronRight
            size={20}
            color={nextMonthDisabled ? tokens.colors.text.secondary : tokens.colors.text.primary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      <View style={s.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <ThemedText key={w} variant="footnote" color="secondary" style={s.weekdayText}>
            {w}
          </ThemedText>
        ))}
      </View>

      <Animated.View style={[s.grid, monthAnimStyle]}>
        {grid.map((date, i) => {
          if (!date) return <View key={`empty-${i}`} style={s.cell} />;
          const isFuture = date > today;
          const isStart = rangeStart ? isSameDay(date, rangeStart) : false;
          const isEnd = rangeEnd ? isSameDay(date, rangeEnd) : false;
          const isEdge = isStart || isEnd;
          const inRangeDay =
            rangeStart && rangeEnd && date >= rangeStart && date <= rangeEnd ? true : false;
          const isToday = isSameDay(date, today);
          const inMonth = isSameMonth(date, viewMonth);
          const col = i % 7;
          // Barra continua: se redondea solo donde el rango realmente empieza/termina (el día
          // de inicio/fin, el borde de la fila al saltar de semana, o cuando la celda vecina
          // está vacía — mes anterior/siguiente fuera de vista, ej. "1 año" con el inicio en
          // otro mes: sin esto el primer/último día visible quedaba con una esquina cuadrada
          // pegada a la nada); el resto de las uniones quedan cuadradas para que se vea como
          // una sola franja, no como celdas sueltas.
          const prevIsBlank = i === 0 || grid[i - 1] === null;
          const nextIsBlank = i === grid.length - 1 || grid[i + 1] === null;
          const roundLeft = isStart || col === 0 || prevIsBlank;
          const roundRight = isEnd || col === 6 || nextIsBlank;

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={s.cell}
              onPress={() => tapDay(date)}
              disabled={isFuture}
              activeOpacity={0.6}
            >
              {inRangeDay && (
                <View
                  style={[
                    s.connector,
                    { backgroundColor: tokens.colors.accent.default },
                    roundLeft && s.connectorRoundLeft,
                    roundRight && s.connectorRoundRight,
                  ]}
                />
              )}
              <View style={s.dayCircle}>
                <ThemedText
                  variant="body"
                  style={[
                    { fontSize: 14, fontWeight: "500" },
                    !inMonth && { color: tokens.colors.text.secondary, opacity: 0.5 },
                    isFuture && { opacity: 0.3 },
                    inRangeDay && { color: "#FFFFFF", fontWeight: "700" },
                    isToday && !inRangeDay && { color: tokens.colors.text.accent, fontWeight: "700" },
                  ]}
                >
                  {date.getDate()}
                </ThemedText>
              </View>
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      <Animated.View style={applyAnimStyle}>
        <PressableScale
          onPress={confirm}
          disabled={!isValidRange}
          style={{
            marginTop: tokens.spacing.lg,
            height: 52,
            borderRadius: tokens.radius.lg,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isValidRange ? tokens.colors.accent.default : tokens.colors.surface.elevated,
          }}
        >
          <ThemedText
            variant="body"
            style={{
              fontWeight: "700",
              color: isValidRange ? "#FFFFFF" : tokens.colors.text.secondary,
            }}
          >
            {rangeStart && rangeEnd && !isValidRange ? "Elige un rango de al menos 2 meses" : "✓ Aplicar"}
          </ThemedText>
        </PressableScale>
      </Animated.View>
    </BottomSheet>
  );
}

function buildStyles() {
  return StyleSheet.create({
    container: { paddingBottom: 36, paddingHorizontal: 20 },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      paddingVertical: 12,
      marginBottom: 16,
      gap: 8,
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    navBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    weekdayRow: { flexDirection: "row", marginTop: 16, marginBottom: 4 },
    weekdayText: { flex: 1, textAlign: "center", fontWeight: "700" },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
    },
    dayCircle: {
      width: "76%",
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    connector: {
      position: "absolute",
      left: 0,
      right: 0,
      top: "12%",
      bottom: "12%",
    },
    connectorRoundLeft: { borderTopLeftRadius: 999, borderBottomLeftRadius: 999 },
    connectorRoundRight: { borderTopRightRadius: 999, borderBottomRightRadius: 999 },
  });
}
