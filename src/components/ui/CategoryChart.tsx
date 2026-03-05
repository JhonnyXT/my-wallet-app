/**
 * CategoryChart — "Visual Expense Insights Home 1" de Stitch
 *
 * Barras de ancho fijo calculado (no flex:1) para evitar que sean demasiado
 * anchas cuando hay menos de 4 categorías.
 *
 * Stitch key values:
 *   Chart container height: 280px
 *   Bar border-radius: 9999 (píldora perfecta)
 *   Bar padding: 24px top/bottom
 *   Ghost track: borde punteado, límite de presupuesto futuro
 *   % label: 11px, weight 800
 *   Amount label: 10px, weight 700, rgba(0,0,0,0.45)
 */
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useEffect } from "react";
import { getCategoryColor } from "@/src/constants/theme";

export interface CategoryStat {
  emoji: string;
  total: number;
  count: number;
}

interface CategoryChartProps {
  stats: CategoryStat[];
  budgetLimit: number;
}

// ─── Layout constants ─────────────────────────────────────────────────────────
const SCREEN_W   = Dimensions.get("window").width;
const H_PADDING  = 28;    // igual que el padding horizontal de la pantalla
const BAR_GAP    = 16;    // Figma original: gap 16px entre barras
const NUM_BARS   = 4;
const BAR_W      = Math.floor(
  (SCREEN_W - H_PADDING * 2 - BAR_GAP * (NUM_BARS - 1)) / NUM_BARS
);

const CHART_H    = 260;   // altura total del contenedor
const MAX_FILL_H = 224;   // barra más alta (categoría con mayor gasto)
const MIN_FILL_H = 110;   // barra mínima visible

// Ghost = mismo alto que la barra máxima (límite de presupuesto visual)
const GHOST_H    = MAX_FILL_H;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${Math.round(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
}

// ─── Bar individual ───────────────────────────────────────────────────────────
function AnimatedBar({
  stat, fillH, pct, delay,
}: {
  stat: CategoryStat;
  fillH: number;
  pct: number;
  delay: number;
}) {
  const palette    = getCategoryColor(stat.emoji);
  const heightAnim = useSharedValue(0);
  const animStyle  = useAnimatedStyle(() => ({ height: heightAnim.value }));

  useEffect(() => {
    heightAnim.value = withDelay(
      delay,
      withTiming(fillH, { duration: 500, easing: Easing.out(Easing.quad) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillH, delay]);

  return (
    <View style={styles.column}>
      {/* Ghost track — silueta del límite de presupuesto (función futura) */}
      <View style={[styles.ghost, { height: GHOST_H }]} />

      {/* Barra animada con color de categoría */}
      <Animated.View
        style={[styles.bar, animStyle, { backgroundColor: palette.bg }]}
      >
        <Text style={styles.emoji}>{stat.emoji}</Text>
        <View style={styles.labels}>
          <Text style={styles.pctText}>{pct}%</Text>
          <Text style={styles.amtText}>{fmtAmount(stat.total)}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Chart principal ──────────────────────────────────────────────────────────
export function CategoryChart({ stats, budgetLimit }: CategoryChartProps) {
  if (!stats.length) return null;

  const maxTotal = Math.max(...stats.map((s) => s.total));

  const bars = stats.slice(0, NUM_BARS).map((s) => {
    const pct   = budgetLimit > 0 ? Math.round((s.total / budgetLimit) * 100) : 0;
    const ratio = maxTotal > 0 ? s.total / maxTotal : 0;
    const fillH = Math.round(MIN_FILL_H + ratio * (MAX_FILL_H - MIN_FILL_H));
    return { stat: s, fillH, pct };
  });

  return (
    <View style={styles.chartRow}>
      {bars.map(({ stat, fillH, pct }, i) => (
        <AnimatedBar
          key={stat.emoji}
          stat={stat}
          fillH={fillH}
          pct={pct}
          delay={i * 80}
        />
      ))}
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  chartRow: {
    height: CHART_H,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: H_PADDING,
    gap: BAR_GAP,
  },
  column: {
    width: BAR_W,
    height: CHART_H,
    position: "relative",
    justifyContent: "flex-end",
  },
  ghost: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.015)",
  },
  bar: {
    left: 0,
    right: 0,
    borderRadius: 9999,
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 4,
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  emoji: {
    fontSize: 22,
    lineHeight: 30,
  },
  labels: {
    alignItems: "center",
    gap: 2,
  },
  pctText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#000000",
    lineHeight: 16.5,
  },
  amtText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
    lineHeight: 15,
  },
});
