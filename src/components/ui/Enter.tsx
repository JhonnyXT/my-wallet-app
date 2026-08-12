import { useCallback, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useReducedMotion,
  withDelay,
  withTiming,
  Easing,
} from "react-native-reanimated";

const STAGGER_MS = 45;
const ENTER_MS = 260;
const OFFSET = 12;

// Claves ya animadas en esta sesión de la app (module-level, no por instancia de
// componente) — así la cascada se reproduce una sola vez por pantalla durante
// toda la sesión, no en cada visita (una pantalla a un tap de distancia se abre
// decenas de veces al día; repetir ~575ms de cascada en cada una es demasiado).
const enteredKeys = new Set<string>();

export interface EnterProps {
  /** Orden de aparición en la cascada (0, 1, 2…) — cada índice espera `index * 45ms` más. */
  index?: number;
  /** Identifica la pantalla dueña de esta cascada. Solo hace falta pasarlo si conviven
   * varias pantallas con `Enter` montadas a la vez (ej. tabs) y podrían compartir el
   * mismo `index` — para una pantalla apilada sola, el valor por defecto alcanza. */
  screenId?: string;
  /** `false` para animar solo opacity, sin el translateY de 12px. */
  lift?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/**
 * Revela su contenido con fade + lift (12px) al enfocar la pantalla, escalonado por `index`.
 * Se reproduce una sola vez por pantalla durante la sesión (no en cada visita) y respeta
 * "reducir movimiento" del sistema (salta directo al estado final, sin animar).
 */
export function Enter({ index = 0, screenId = "default", lift = true, style, children }: EnterProps) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const key = `${screenId}:${index}`;

  useFocusEffect(
    useCallback(() => {
      if (reducedMotion || enteredKeys.has(key)) {
        progress.value = 1;
        return;
      }

      enteredKeys.add(key);
      progress.value = 0;
      progress.value = withDelay(
        index * STAGGER_MS,
        withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.quad) }),
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, reducedMotion]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: lift ? [{ translateY: (1 - progress.value) * OFFSET }] : [],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
