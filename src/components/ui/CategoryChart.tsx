/**
 * CategoryChart — scroll horizontal de categorías
 *
 * - Muestra TODAS las categorías del sistema + las que vengan de transacciones
 * - Categorías con datos: barra animada con color, % y monto
 * - Categorías sin datos: solo el ghost track (outline punteado) al 100%
 * - % = (total_categoría / total_gastos_mes) × 100
 */
import { View, Text, ScrollView, StyleSheet } from "react-native";
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
  allEmojis: string[];
  totalExpenses: number;
}

// ─── Layout ───────────────────────────────────────────────────────────────────
const BAR_W      = 68;
const BAR_GAP    = 14;
const H_PADDING  = 28;
const CHART_H    = 260;
const MAX_FILL_H = 218;
const MIN_FILL_H = 88;
const GHOST_H    = MAX_FILL_H;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

// ─── Barra con datos ──────────────────────────────────────────────────────────
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
      withTiming(fillH, { duration: 520, easing: Easing.out(Easing.quad) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillH]);

  return (
    <View style={styles.column}>
      {/* Ghost track detrás — referencia visual del límite */}
      <View style={styles.ghostBehind} />
      {/* Barra real */}
      <Animated.View style={[styles.bar, animStyle, { backgroundColor: palette.bg }]}>
        <Text style={styles.emoji}>{stat.emoji}</Text>
        <View style={styles.labels}>
          <Text style={styles.pctText}>{pct}%</Text>
          <Text style={styles.amtText}>{fmtAmount(stat.total)}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Barra vacía (solo ghost) ─────────────────────────────────────────────────
function GhostBar({ emoji }: { emoji: string }) {
  return (
    <View style={styles.column}>
      <View style={styles.ghostOnly}>
        <Text style={[styles.emoji, { opacity: 0.3 }]}>{emoji}</Text>
        <Text style={styles.ghostPct}>0%</Text>
      </View>
    </View>
  );
}

// ─── Chart principal ──────────────────────────────────────────────────────────
export function CategoryChart({ stats, allEmojis, totalExpenses }: CategoryChartProps) {
  const maxTotal     = stats.length > 0 ? Math.max(...stats.map(s => s.total)) : 1;
  const withDataSet  = new Set(stats.map(s => s.emoji));

  // Primero las categorías con datos (mayor → menor), luego las vacías
  const withData    = stats.map(s => s.emoji);
  const withoutData = allEmojis.filter(e => !withDataSet.has(e));
  const ordered     = [...withData, ...withoutData];

  let delay = 0;

  return (
    <View style={{ height: CHART_H }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
      >
        {ordered.map((emoji) => {
          const stat = stats.find(s => s.emoji === emoji);
          if (stat) {
            const pct   = totalExpenses > 0 ? Math.round((stat.total / totalExpenses) * 100) : 0;
            const ratio = maxTotal > 0 ? stat.total / maxTotal : 0;
            const fillH = Math.round(MIN_FILL_H + ratio * (MAX_FILL_H - MIN_FILL_H));
            const d     = delay;
            delay += 80;
            return (
              <AnimatedBar
                key={emoji}
                stat={stat}
                fillH={fillH}
                pct={pct}
                delay={d}
              />
            );
          }
          return <GhostBar key={emoji} emoji={emoji} />;
        })}
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
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
  ghostBehind: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: GHOST_H,
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.015)",
  },
  bar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 9999,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 4,
    justifyContent: "space-between",
    alignItems: "center",
    overflow: "hidden",
  },
  ghostOnly: {
    width: BAR_W,
    height: GHOST_H,
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.015)",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 20,
    paddingBottom: 20,
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
  ghostPct: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.18)",
    lineHeight: 16.5,
  },
});
