import { useEffect, useMemo, useRef, useState } from "react";
import { useColorScheme } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { initDatabase } from "@/src/db/db";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import {
  useNotificationStore,
  getPendingItemAfterHydration,
  type PendingNotificationItem,
} from "@/src/store/useNotificationStore";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { AnimatedSplash } from "@/src/components/ui/AnimatedSplash";
import { light, dark } from "@/src/theme";
import { guessCategoryEmoji } from "@/src/constants/theme";
import { resolveCategory } from "@/src/utils/transactionFormatters";

import "../global.css";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "(tabs)",
};

SplashScreen.preventAutoHideAsync();

/** Prellena useExpenseStore con los datos de un item detectado — mismo criterio
 *  que `notification-review.tsx` (`pendingToReview`/`handleEdit`): descripción =
 *  texto del banco o su nombre, categoría adivinada por palabras clave, fecha real
 *  de detección (no "hoy"). */
function prefillExpenseFromPendingItem(item: PendingNotificationItem) {
  const { userCategories, savingsGoals } = useSettingsStore.getState();
  const description = item.description || item.bankName;
  const categoryEmoji = guessCategoryEmoji(description, userCategories);
  const categoryName = resolveCategory(categoryEmoji, userCategories, savingsGoals);
  const expense = useExpenseStore.getState();
  expense.setIsExpense(item.isExpense);
  expense.setAmount(item.amount);
  expense.setNote(description);
  expense.setCategory(categoryEmoji, categoryName);
  expense.setCustomDate(new Date(item.detectedAt));
  // Detectada desde notificación bancaria: nunca es efectivo — "savings" (Ahorros)
  // es el default más cercano a la realidad, a pedido del usuario (2026-09-02).
  expense.setAccount("savings");
}

/**
 * Resuelve a dónde navegar al tocar una notificación de transacción bancaria.
 * Si el `itemId` de la notificación sigue siendo el ÚNICO pendiente en la cola,
 * salta la lista de revisión y va directo al formulario ya prellenado — menos
 * fricción para el caso común (una sola transacción a la vez). Si hay más de un
 * item pendiente (llegaron más notificaciones sin revisar mientras tanto) o el
 * item ya no existe (se guardó/descartó desde otro lado), cae al comportamiento
 * de siempre: la lista de revisión completa — ahí sí hace falta ver todas para
 * saber a cuál corresponde cada una.
 */
async function resolveBankNotificationTarget(
  data: Record<string, unknown> | undefined,
): Promise<`/active-expense?from=notification-detect&notifId=${string}` | "/notification-review"> {
  const itemId = typeof data?.itemId === "string" ? data.itemId : undefined;
  if (itemId) {
    const item = await getPendingItemAfterHydration(itemId);
    const { pendingItems } = useNotificationStore.getState();
    if (item && pendingItems.length === 1) {
      prefillExpenseFromPendingItem(item);
      return `/active-expense?from=notification-detect&notifId=${item.id}`;
    }
  }
  return "/notification-review";
}

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
    Notifications.getLastNotificationResponseAsync().then(async (response) => {
      const data = response?.notification.request.content.data as
        | Record<string, unknown>
        | undefined;
      if (data?.screen === "notification-review") {
        router.push(await resolveBankNotificationTarget(data));
      } else {
        // Arranque en frío normal (ícono del launcher, no deep link): forzar
        // siempre el dashboard como destino, nunca la última pantalla en la que
        // el usuario estaba antes de que Android matara el proceso. Sin esto,
        // en algunos dispositivos (confirmado en Samsung/OneUI) el Stack puede
        // resolver su ruta inicial hacia la última pantalla visitada en vez de
        // "(tabs)". Es invisible para el usuario: ocurre bajo el splash, que no
        // hace fade out hasta que el bootstrap termine.
        router.replace("/(tabs)");
      }
    });

    // Tap en notificación con la app en foreground o background
    notifListenerRef.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        if (data?.screen === "notification-review") {
          router.push(await resolveBankNotificationTarget(data));
        }
      },
    );

    return () => {
      notifListenerRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El splash JS (<AnimatedSplash>) se monta de inmediato al renderizar (ver abajo,
  // no depende de appReady), así que ya cubre el Stack antes de que el splash nativo
  // se oculte — se puede ocultar el nativo apenas React pinta el primer frame, sin
  // esperar a que termine el bootstrap (DB, notificaciones, etc.), que sigue en
  // paralelo. Antes se ocultaba el splash nativo y solo DESPUÉS se montaba el splash
  // JS (mismo efecto), dejando un hueco de uno o más frames donde se veía el Stack.
  useEffect(() => {
    SplashScreen.hideAsync();
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
          name="notification-onboarding"
          options={{
            animation: "fade",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="bank-selection-onboarding"
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
        <Stack.Screen
          name="reports"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>

      {!splashDone && <AnimatedSplash ready={appReady} onFinish={() => setSplashDone(true)} />}
    </ThemeProvider>
  );
}
