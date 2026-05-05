// ─── Hook: estado del tour de onboarding del dashboard ───────────────────────

import { useMemo } from "react";
import { router } from "expo-router";
import { useSettingsStore } from "@/src/store/useSettingsStore";
import { getTourRef, TOUR_KEYS } from "@/src/utils/tourRefs";
import type { TourStep } from "@/src/components/ui/GuidedTour";

export interface UseDashboardTourReturn {
  dashboardTourSteps:   TourStep[];
  dashboardTourVisible: boolean;
  dashboardTourIndex:   number;
  onboardingStep:       number;
  completeOnboarding:   () => void;
}

export function useDashboardTour(): UseDashboardTourReturn {
  const hasCompletedOnboarding = useSettingsStore((s) => s.hasCompletedOnboarding);
  const hasSelectedCategories  = useSettingsStore((s) => s.hasSelectedCategories);
  const onboardingStep         = useSettingsStore((s) => s.onboardingStep);
  const setOnboardingStep      = useSettingsStore((s) => s.setOnboardingStep);
  const completeOnboarding     = useSettingsStore((s) => s.completeOnboarding);

  const dashboardTourSteps: TourStep[] = useMemo(() => [
    {
      targetRef:   getTourRef(TOUR_KEYS.SETTINGS_BTN),
      title:       "¡Bienvenido a MyWallet!",
      message:     "Primero, configura tu ingreso mensual para tener control de tus finanzas.",
      buttonLabel: "Ir a Ajustes",
      onAction: () => {
        setOnboardingStep(1);
        router.push("/settings");
      },
    },
    {
      targetRef:   getTourRef(TOUR_KEYS.MIC_FAB),
      title:       "Registro por voz",
      message:     'Registra gastos e ingresos con tu voz. Solo di algo como: "Almuerzo treinta mil".',
      buttonLabel: "Entendido",
      onAction: () => setOnboardingStep(4),
    },
    {
      targetRef:   getTourRef(TOUR_KEYS.PLUS_BTN),
      title:       "Registro manual",
      message:     "También puedes registrar tus movimientos manualmente con este botón.",
      buttonLabel: "¡Empezar!",
      onAction:    () => completeOnboarding(),
    },
  ], []);

  const dashboardTourVisible =
    hasSelectedCategories &&
    !hasCompletedOnboarding &&
    (onboardingStep === 0 || onboardingStep === 3 || onboardingStep === 4);

  const dashboardTourIndex =
    onboardingStep === 0 ? 0 :
    onboardingStep === 3 ? 1 : 2;

  return {
    dashboardTourSteps,
    dashboardTourVisible,
    dashboardTourIndex,
    onboardingStep,
    completeOnboarding,
  };
}
