import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { initDatabase, countTransactions, clearTransactions, hasLegacyEmojis, seedDemoData } from "@/src/db/db";
import { useFinanceStore } from "@/src/store/useFinanceStore";

import "../global.css";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadTransactions = useFinanceStore((s) => s.loadTransactions);

  useEffect(() => {
    async function bootstrap() {
      await initDatabase();
      // Re-seed si: pocos registros O si hay emojis de categorías antiguas
      const count      = await countTransactions();
      const hasLegacy  = await hasLegacyEmojis();
      if (count <= 10 || hasLegacy) {
        await clearTransactions();
        await seedDemoData();
      }
      await loadTransactions();
      await SplashScreen.hideAsync();
    }
    bootstrap();
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="voice-input"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="active-expense"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="analytics"
          options={{
            presentation: "modal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
