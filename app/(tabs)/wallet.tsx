import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/src/context/ThemeContext";

export default function WalletScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView style={[s.root, { backgroundColor: theme.bg }]} edges={["top"]}>
      <View style={s.center}>
        <Text style={s.icon}>💳</Text>
        <Text style={[s.title, { color: theme.text }]}>Billetera</Text>
        <Text style={[s.subtitle, { color: theme.textSub }]}>
          Aquí verás un resumen completo de tus finanzas.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1 },
  center:   { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  icon:     { fontSize: 36, marginBottom: 12 },
  title:    { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center" },
});
