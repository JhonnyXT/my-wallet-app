import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
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
  const darkMode = useSettingsStore((s) => s.darkMode);
  const hasSelectedCategories = useSettingsStore((s) => s.hasSelectedCategories);
  const systemScheme = useColorScheme();
  const router = useRouter();

  const theme = useMemo(() => {
    const effective = darkMode === "system" ? (systemScheme ?? "light") : darkMode;
    return effective === "dark" ? dark : light;
  }, [darkMode, systemScheme]);

  const [appReady, setAppReady] = useState(false);
  const [splashDone, setSplashDone] = useState(false);

  // ─── Deep link desde notificación push ───────────────────────────────────
  // Ref para evitar re-registro en re-renders
  const notifListenerRef = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Tap en notificación mientras la app estaba cerrada/en background
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response?.notification.request.content.data?.screen === "notification-review") {
        router.push("/notification-review");
      }
    });

    // Tap en notificación con la app en foreground o background
    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.notification.request.content.data?.screen === "notification-review") {
        router.push("/notification-review");
      }
    });

    return () => {
      notifListenerRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await loadTransactions();
        // Importación dinámica para evitar dependencia circular con notificationService
        const { initNotifications } = await import("@/src/services/notificationService");
        await initNotifications();
        useSettingsStore.getState().clearExpiredBudgetNotifications();
      } catch (e) {
        console.error("[bootstrap] Error al inicializar la app:", e);
      } finally {
        await SplashScreen.hideAsync();
        setAppReady(true);
      }
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Después del splash, si no ha seleccionado categorías → onboarding
  useEffect(() => {
    if (splashDone && !hasSelectedCategories) {
      router.replace("/category-onboarding");
    }
  }, [splashDone, hasSelectedCategories]);

  return (
    <ThemeProvider value={theme}>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="category-onboarding"
          options={{
            animation: "fade",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="voice-input"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="voice-batch-review"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notification-review"
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

      {appReady && !splashDone && <AnimatedSplash onFinish={() => setSplashDone(true)} />}
    </ThemeProvider>
  );
}
