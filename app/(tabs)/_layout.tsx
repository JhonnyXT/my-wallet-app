import { Tabs } from "expo-router";
import { FloatingDock } from "@/src/components/ui/FloatingDock";
import { FloatingInputOverlay } from "@/src/components/ui/FloatingInput";

export default function TabLayout() {
  return (
    <>
      <Tabs
        tabBar={(props) => <FloatingDock {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="chat" />
        <Tabs.Screen name="wallet" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
      </Tabs>

      {/* Global expense input overlay — floats above all tabs */}
      <FloatingInputOverlay />
    </>
  );
}
