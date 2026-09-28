// ─── Hook: estado del tour de onboarding del dashboard ───────────────────────

import { useMemo } from "react";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { getTourRef, TOUR_KEYS } from "@/src/utils/tourRefs";
import type { TourStep } from "@/src/components/ui/GuidedTour";

export interface UseDashboardTourReturn {
  dashboardTourSteps: TourStep[];
  dashboardTourVisible: boolean;
  dashboardTourIndex: number;
  completeOnboarding: () => void;
}

export function useDashboardTour(): UseDashboardTourReturn {
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const hasSelectedCategories = useSettingsStore((s) => s.hasSelectedCategories);
  const onboardingStep = useSettingsStore((s) => s.onboardingStep);
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);

  const dashboardTourSteps: TourStep[] = useMemo(
    () => [
      {
        targetRef: getTourRef(TOUR_KEYS.PERIOD_BTN),
        title: "¡Bienvenido a MyWallet!",
        message:
          "Este es tu período. Tócalo para ver tus meses y deslizarte entre ellos. Mantenlo presionado para ver un año, un rango de fechas o cambiar cuándo te pagan.",
        buttonLabel: "Siguiente",
        onAction: () => setOnboardingStep(3),
      },
      {
        targetRef: getTourRef(TOUR_KEYS.MIC_FAB),
        title: "Registro por voz",
        message:
          'Registra gastos e ingresos con tu voz. Solo di algo como: "Almuerzo treinta mil".',
        buttonLabel: "Entendido",
        onAction: () => setOnboardingStep(4),
      },
      {
        targetRef: getTourRef(TOUR_KEYS.PLUS_BTN),
        title: "Registro manual",
        message: "También puedes registrar tus movimientos manualmente con este botón.",
        buttonLabel: "¡Empezar!",
        onAction: () => completeOnboarding(),
      },
    ],
    [],
  );

  // Pasos de onboardingStep: 0 calendario → 3 voz → 4 manual → completado. Los valores 1 y
  // 2 eran el antiguo desvío a Ajustes ("Configura tu ingreso", ya no existe: el pago se
  // configura en el onboarding, app/pay-onboarding.tsx); quien quedó a mitad ahí sigue
  // en el paso de voz.
  const dashboardTourVisible =
    hasSelectedCategories && !hasCompletedOnboarding && onboardingStep <= 4;

  const dashboardTourIndex = onboardingStep === 0 ? 0 : onboardingStep <= 3 ? 1 : 2;

  return {
    dashboardTourSteps,
    dashboardTourVisible,
    dashboardTourIndex,
    completeOnboarding,
  };
}
