import { forwardRef } from "react";
import { Pressable, type PressableProps, type View, type ViewStyle, type StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  useReducedMotion,
} from "react-native-reanimated";
import { useAppTokens } from "@/src/theme/tokens";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar. Por defecto tokens.motion.pressScale (0.97); ListRow usa 0.99. */
  activeScale?: number;
}

/**
 * Pressable con feedback de escala al tocar (no al soltar), spring snappy.
 * Forwarding de ref: necesario para GuidedTour (tourRefs.ts → measureInWindow).
 */
export const PressableScale = forwardRef<View, PressableScaleProps>(function PressableScale(
  { style, activeScale, children, onPressIn, onPressOut, ...rest },
  ref,
) {
  const tokens = useAppTokens();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const target = activeScale ?? tokens.motion.pressScale;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      ref={ref}
      onPressIn={(e) => {
        if (!reducedMotion) scale.value = withSpring(target, tokens.motion.spring.snappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reducedMotion) scale.value = withSpring(1, tokens.motion.spring.snappy);
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
});
