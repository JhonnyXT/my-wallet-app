import { View, Text, Pressable } from "react-native";

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
    <View style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      marginBottom: 32,
      paddingHorizontal: 24,
    }}>
      {PILLS.map((pill) => (
        <Pressable
          key={pill.id}
          onPress={() => onPress?.(pill.id)}
          style={{
            backgroundColor: "#FFFFFF",
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#f1f5f9",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 3,
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "500", color: "#0f172a" }}>
            {pill.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
