import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <View className="flex-1 items-center justify-center bg-pearl px-6">
        <Text className="text-4xl mb-3">🔍</Text>
        <Text className="text-xl font-semibold text-midnight mb-2">
          Pantalla no encontrada
        </Text>
        <Link href="/">
          <Text className="text-accent text-sm font-medium">
            Volver al inicio
          </Text>
        </Link>
      </View>
    </>
  );
}
