import { View, Text, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { COLORS, BUDGET_WARNING_THRESHOLD } from "@/src/constants/theme";

interface BudgetBarProps {
  percentage: number;
}

export function BudgetBar({ percentage }: BudgetBarProps) {
  const isWarning = percentage >= BUDGET_WARNING_THRESHOLD;

  const barStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(percentage, 100)}%` as any, { duration: 600 }),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Presupuesto</Text>
        <Text style={[styles.label, isWarning && styles.labelWarning]}>
          {percentage}%
        </Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            barStyle,
            { backgroundColor: isWarning ? COLORS.coral : COLORS.slate900 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    width: 200,
    alignSelf: "center",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.slate400,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  labelWarning: {
    color: COLORS.coral,
  },
  track: {
    height: 3,
    backgroundColor: COLORS.slate200,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
