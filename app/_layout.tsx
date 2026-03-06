import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { initDatabase, countTransactions, clearTransactions, seedDemoData } from "@/src/db/db";
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
      // Re-seed si hay ≤ 10 registros (seed viejo tenía 5)
      const count = await countTransactions();
      if (count <= 10) {
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
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
