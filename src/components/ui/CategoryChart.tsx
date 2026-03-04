/**
 * CategoryChart — pixel-perfect translation of Figma "Visual Expense Insights Home"
 *
 * Figma key values:
 *   Chart container:  height 300px, flexRow, alignItems flex-end, gap 16px
 *   Bar border-radius: 40px
 *   Bar padding:       24px top/bottom, 4px horizontal
 *   Ghost track:       dashed border, rgba(0,0,0,0.08), same border-radius
 *   % label:           11px, weight 800
 *   Amount label:      10px, weight 700, rgba(0,0,0,0.5)
 */
import { View, Text, StyleSheet, ScrollView } from "react-native";
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

// Figma chart container height
const CHART_H = 300;
// Figma: tallest bar = 264px (🎮 at 118%)
const MAX_FILL_H = 264;
// Min height: even the smallest category shows a visible bar (Figma: shortest = 144px)
const MIN_FILL_H = 130;
// Ghost track height (budget limit indicator)
const GHOST_H = 250;

function fmtAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return `${Math.round(amount)}`;
}

function AnimatedBar({
  stat,
  fillH,
  pct,
  delay,
}: {
  stat: CategoryStat;
  fillH: number;
  pct: number;
  delay: number;
}) {
  const palette = getCategoryColor(stat.emoji);
  const heightAnim = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({ height: heightAnim.value }));

  useEffect(() => {
    heightAnim.value = withDelay(
      delay,
      withTiming(fillH, { duration: 500, easing: Easing.out(Easing.quad) })
    );
  }, [fillH, delay]);

  return (
    // Column: flex 1, full chart height, bottom-aligned
    <View style={styles.column}>
      {/* Ghost track (budget limit indicator) */}
      <View style={[styles.ghost, { height: GHOST_H }]} />

      {/* Animated fill bar */}
      <Animated.View
        style={[
          styles.bar,
          animStyle,
          { backgroundColor: palette.bg },
        ]}
      >
        {/* Emoji — top of bar */}
        <Text style={styles.emoji}>{stat.emoji}</Text>

        {/* Labels — bottom of bar */}
        <View style={styles.labels}>
          <Text style={styles.pctText}>{pct}%</Text>
          <Text style={styles.amtText}>{fmtAmount(stat.total)}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export function CategoryChart({ stats, budgetLimit }: CategoryChartProps) {
  if (!stats.length) return null;

  const maxTotal = Math.max(...stats.map((s) => s.total));

  const bars = stats.slice(0, 5).map((s) => {
    const pct = budgetLimit > 0 ? Math.round((s.total / budgetLimit) * 100) : 0;
    // Compressed scale: MIN_FILL..MAX_FILL so even small categories are visible
    const ratio = maxTotal > 0 ? s.total / maxTotal : 0;
    const fillH = Math.round(MIN_FILL_H + ratio * (MAX_FILL_H - MIN_FILL_H));
    return { stat: s, fillH, pct };
  });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Chart row: bottom-aligned, fixed height */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 28, // matches Figma screen padding
  },
  chartRow: {
    height: CHART_H,
    flexDirection: "row",
    alignItems: "flex-end", // all bars share bottom baseline
    gap: 16, // Figma: gap 16px between bars
  },
  column: {
    width: 72,
    height: CHART_H,
    position: "relative",
    justifyContent: "flex-end", // fill bar at bottom
  },
  ghost: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 40,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.10)",
    backgroundColor: "rgba(0,0,0,0.015)", // subtle fill to make it visible
  },
  bar: {
    // Animated fill — bottom-anchored
    left: 0,
    right: 0,
    borderRadius: 40, // Figma: borderRadius 40px
    paddingTop: 24, // Figma: paddingTop 24px
    paddingBottom: 24, // Figma: paddingBottom 24px
    paddingHorizontal: 4, // Figma: paddingRight/Left 4px
    justifyContent: "space-between", // emoji top, labels bottom
    alignItems: "center",
    overflow: "hidden",
  },
  emoji: {
    fontSize: 24, // Figma: 24px
    lineHeight: 32,
  },
  labels: {
    alignItems: "center",
    gap: 2, // Figma: gap 2px
  },
  pctText: {
    fontSize: 11, // Figma: 11px
    fontWeight: "800", // Figma: weight 800
    color: "#000000",
    lineHeight: 16.5,
  },
  amtText: {
    fontSize: 10, // Figma: 10px
    fontWeight: "700", // Figma: weight 700
    color: "rgba(0,0,0,0.5)", // Figma: rgba(0,0,0,0.5)
    lineHeight: 15,
  },
});
