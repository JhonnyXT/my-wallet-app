import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { FloatingDock } from "@/src/components/ui/FloatingDock";
import { FloatingInputOverlay } from "@/src/components/ui/FloatingInput";

export default function TabLayout() {
  return (
    <View style={styles.root}>
      {/* Tabs sin tab bar nativo — el dock es overlay independiente */}
      <Tabs
        tabBar={() => null}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="wallet" options={{ href: null }} />
      </Tabs>

      {/* Overlays flotantes — encima de todo el contenido de tabs */}
      <FloatingInputOverlay />
      <FloatingDock />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
