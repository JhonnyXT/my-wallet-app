import { View, Text, Pressable, ScrollView } from "react-native";

const PILLS = [
  { label: "Análisis", id: "analysis" },
  { label: "Suscripciones", id: "subscriptions" },
  { label: "Ahorros", id: "savings" },
] as const;

interface ActionPillsProps {
  onPress?: (id: string) => void;
}

export function ActionPills({ onPress }: ActionPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
      className="mt-5"
    >
      {PILLS.map((pill) => (
        <Pressable
          key={pill.id}
          onPress={() => onPress?.(pill.id)}
          className="bg-[#F2F2F7] px-5 py-2.5 rounded-full active:opacity-70"
        >
          <Text className="text-[13px] font-medium text-midnight">
            {pill.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
