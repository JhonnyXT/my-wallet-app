import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function WalletScreen() {
  return (
    <SafeAreaView className="flex-1 bg-pearl" edges={["top"]}>
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-4xl mb-3">💳</Text>
        <Text className="text-xl font-semibold text-midnight mb-2">
          Billetera
        </Text>
        <Text className="text-silver text-center text-sm">
          Aquí verás un resumen completo de tus finanzas.
        </Text>
      </View>
    </SafeAreaView>
  );
}
