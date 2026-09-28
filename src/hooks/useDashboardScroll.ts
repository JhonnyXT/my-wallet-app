// ─── Hook: animaciones de scroll del dashboard ───────────────────────────────

import { useMemo } from "react";
import {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from "react-native-reanimated";
import type { TypeFilter } from "@/src/hooks/useTransactionFilters";

export interface UseDashboardScrollReturn {
  scrollY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerParallaxStyle: ReturnType<typeof useAnimatedStyle>;
  pillsParallaxStyle: ReturnType<typeof useAnimatedStyle>;
  chartAnimKey: string;
}

export function useDashboardScroll(
  typeFilter: TypeFilter,
  periodKey: string,
): UseDashboardScrollReturn {
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      "worklet";
      scrollY.value = event.contentOffset.y;
    },
  });

  // Micro-parallax: balance y pills se comprimen suavemente al inicio del scroll
  const headerParallaxStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      transform: [
        { scale: interpolate(scrollY.value, [0, 100], [1, 0.94], Extrapolation.CLAMP) },
        { translateY: interpolate(scrollY.value, [0, 100], [0, -5], Extrapolation.CLAMP) },
      ],
    };
  });

  // Los pills de Gasto/Ingreso mantienen su color fijo al hacer scroll (sin fade de opacidad)
  const pillsParallaxStyle = useAnimatedStyle(() => {
    "worklet";
    return {};
  });

  // animationKey para re-animar barras cuando el filtro cambia
  const chartAnimKey = useMemo(
    () => `${typeFilter ?? "all"}-${periodKey}`,
    [typeFilter, periodKey],
  );

  return {
    scrollY,
    scrollHandler,
    headerParallaxStyle,
    pillsParallaxStyle,
    chartAnimKey,
  };
}
