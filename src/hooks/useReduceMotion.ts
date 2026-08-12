import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Refleja "Reducir movimiento" del sistema para animaciones hechas con `Animated`
 * de React Native core (Reanimated ya trae su propio `useReducedMotion()`).
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
