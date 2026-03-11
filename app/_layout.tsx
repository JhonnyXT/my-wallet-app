import { useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { initDatabase } from "@/src/db/db";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { AnimatedSplash } from "@/src/components/ui/AnimatedSplash";
import { light, dark } from "@/src/theme";

import "../global.css";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const loadTransactions = useFinanceStore((s) => s.loadTransactions);
  const darkMode         = useSettingsStore((s) => s.darkMode);
  const systemScheme     = useColorScheme();

  const theme = useMemo(() => {
    const effective =
      darkMode === "system"
        ? (systemScheme ?? "light")
        : darkMode;
    return effective === "dark" ? dark : light;
  }, [darkMode, systemScheme]);

  const [appReady, setAppReady]       = useState(false);
  const [splashDone, setSplashDone]   = useState(false);

  useEffect(() => {
    async function bootstrap() {
      await initDatabase();
      await loadTransactions();
      await SplashScreen.hideAsync();
      setAppReady(true);
    }
    bootstrap();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
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
          name="settings"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>

      {appReady && !splashDone && (
        <AnimatedSplash onFinish={() => setSplashDone(true)} />
      )}
    </ThemeProvider>
  );
}
