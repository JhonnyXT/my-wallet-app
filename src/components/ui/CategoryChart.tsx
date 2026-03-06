/**
 * CategoryChart — barra de progreso vertical proporcional
 *
 * Ghost (100%) → emoji fijo arriba
 * Fill         → sube desde abajo, altura = (pct/100) × GHOST_H  (sin mínimo artificial)
 * Labels       → % y monto DEBAJO del ghost, siempre visibles
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
const BAR_W    = 68;
const BAR_GAP  = 14;
const H_PAD    = 28;
const GHOST_H  = 210;     // ghost = 100 %
const CHART_H  = GHOST_H + 8;

// ─── Color semafórico ─────────────────────────────────────────────────────────
function barColor(pct: number, emoji: string): { bg: string; pctColor: string } {
  if (pct > 45) return { bg: "#FEE2E2", pctColor: "#DC2626" };
  if (pct > 25) return { bg: "#FEF3C7", pctColor: "#D97706" };
  return { bg: getCategoryColor(emoji).bg, pctColor: "#1E293B" };
}

function fmtAmount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

// ─── Barra con datos ──────────────────────────────────────────────────────────
function AnimatedBar({
  stat, fillH, pct, bg, pctColor, delay,
}: {
  stat: CategoryStat;
  fillH: number;
  pct: number;
  bg: string;
  pctColor: string;
  delay: number;
}) {
  const heightAnim = useSharedValue(0);
  const animStyle  = useAnimatedStyle(() => ({ height: heightAnim.value }));

  useEffect(() => {
    heightAnim.value = withDelay(
      delay,
      withTiming(fillH, { duration: 560, easing: Easing.out(Easing.cubic) })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillH]);

  return (
    <View style={styles.column}>
      <View style={styles.ghost}>
        {/* Fill: sube desde abajo, detrás de todo */}
        <Animated.View style={[styles.fill, animStyle, { backgroundColor: bg }]} />

        {/* Emoji fijo arriba, sobre el fill */}
        <Text style={styles.emoji}>{stat.emoji}</Text>

        {/* Labels fijos en la parte inferior, sobre el fill */}
        <View style={styles.labelsBottom}>
          <Text style={[styles.pctText, { color: pctColor }]}>{pct}%</Text>
          <Text style={styles.amtText}>{fmtAmount(stat.total)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Barra vacía ─────────────────────────────────────────────────────────────
function GhostBar({ emoji }: { emoji: string }) {
  return (
    <View style={styles.column}>
      <View style={styles.ghost}>
        <Text style={[styles.emoji, { opacity: 0.28 }]}>{emoji}</Text>
        <View style={styles.labelsBottom}>
          <Text style={styles.ghostPct}>0%</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Chart ───────────────────────────────────────────────────────────────────
export function CategoryChart({ stats, allEmojis, totalExpenses }: CategoryChartProps) {
  const withDataSet = new Set(stats.map(s => s.emoji));
  const ordered = [
    ...stats.map(s => s.emoji),
    ...allEmojis.filter(e => !withDataSet.has(e)),
  ];

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
            const pct   = totalExpenses > 0
              ? Math.round((stat.total / totalExpenses) * 100)
              : 0;
            // Altura estrictamente proporcional — sin mínimo artificial
            const fillH = Math.round((pct / 100) * GHOST_H);
            const { bg, pctColor } = barColor(pct, emoji);
            const d = delay;
            delay += 80;
            return (
              <AnimatedBar
                key={emoji}
                stat={stat}
                fillH={fillH}
                pct={pct}
                bg={bg}
                pctColor={pctColor}
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
    paddingHorizontal: H_PAD,
    gap: BAR_GAP,
  },

  column: {
    width: BAR_W,
    height: CHART_H,
    justifyContent: "flex-end",
    alignItems: "center",
  },

  ghost: {
    width: BAR_W,
    height: GHOST_H,
    borderRadius: 9999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.018)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
    paddingBottom: 14,
  },

  emoji: {
    fontSize: 22,
    lineHeight: 28,
    zIndex: 2,
  },

  // Fill: sube desde abajo, detrás del emoji y los labels
  fill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 9999,
    zIndex: 0,
  },

  // Labels fijos en la parte inferior del ghost, encima del fill
  labelsBottom: {
    alignItems: "center",
    gap: 2,
    zIndex: 2,
  },

  pctText: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    includeFontPadding: false,
  },

  amtText: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(0,0,0,0.45)",
    lineHeight: 13,
    includeFontPadding: false,
  },

  ghostPct: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(0,0,0,0.20)",
    lineHeight: 15,
    includeFontPadding: false,
  },
});
