import { View, Text, Pressable } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import type { TransactionRow } from "@/src/db/db";

interface TransactionItemProps {
  transaction: TransactionRow;
  index: number;
  onLongPress?: (id: number) => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Hoy, ${time}`;
  if (isYesterday) return `Ayer, ${time}`;

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number): string {
  return `- € ${amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function TransactionItem({
  transaction,
  index,
  onLongPress,
}: TransactionItemProps) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <Pressable
        onLongPress={() => onLongPress?.(transaction.id)}
        className="flex-row items-center py-4"
      >
        <View className="w-11 h-11 rounded-full bg-[#F2F2F7] items-center justify-center mr-3">
          <Text className="text-xl">{transaction.category_emoji}</Text>
        </View>

        <View className="flex-1">
          <Text
            className="text-[15px] font-medium text-midnight"
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
          <Text className="text-[12px] text-silver mt-0.5">
            {formatTime(transaction.date)}
          </Text>
        </View>

        <Text className="text-[15px] font-semibold text-midnight">
          {formatAmount(transaction.amount)}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
