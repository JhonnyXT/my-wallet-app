import { View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { BUDGET_WARNING_THRESHOLD } from "@/src/constants/theme";

interface BudgetBarProps {
  percentage: number;
}

export function BudgetBar({ percentage }: BudgetBarProps) {
  const isWarning = percentage >= BUDGET_WARNING_THRESHOLD;

  const barStyle = useAnimatedStyle(() => ({
    width: withTiming(`${Math.min(percentage, 100)}%`, { duration: 600 }),
  }));

  return (
    <View className="mt-3 px-1">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-[11px] font-semibold tracking-widest text-silver uppercase">
          Presupuesto
        </Text>
        <Text
          className={`text-[11px] font-semibold ${
            isWarning ? "text-coral" : "text-silver"
          }`}
        >
          {percentage}%
        </Text>
      </View>

      <View className="h-[3px] bg-[#F2F2F7] rounded-full overflow-hidden">
        <Animated.View
          style={barStyle}
          className={`h-full rounded-full ${
            isWarning ? "bg-coral" : "bg-midnight"
          }`}
        />
      </View>
    </View>
  );
}
