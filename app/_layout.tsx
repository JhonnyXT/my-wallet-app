import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { initDatabase } from "@/src/db/db";
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
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
