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
import type { PeriodFilter } from "@/src/utils/periodFilter";
import { periodFilterLabel } from "@/src/utils/periodFilter";

export interface UseDashboardScrollReturn {
  scrollY: SharedValue<number>;
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  headerParallaxStyle: ReturnType<typeof useAnimatedStyle>;
  pillsParallaxStyle: ReturnType<typeof useAnimatedStyle>;
  chartAnimKey: string;
}

export function useDashboardScroll(
  typeFilter: TypeFilter,
  periodFilter: PeriodFilter,
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

  const pillsParallaxStyle = useAnimatedStyle(() => {
    "worklet";
    return {
      opacity: interpolate(scrollY.value, [0, 80], [1, 0.45], Extrapolation.CLAMP),
    };
  });

  // animationKey para re-animar barras cuando el filtro cambia
  const chartAnimKey = useMemo(
    () => `${typeFilter ?? "all"}-${periodFilterLabel(periodFilter)}`,

    [typeFilter, periodFilter],
  );

  return {
    scrollY,
    scrollHandler,
    headerParallaxStyle,
    pillsParallaxStyle,
    chartAnimKey,
  };
}
