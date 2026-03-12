/**
 * AnimatedNumber — interpolación visual entre valores numéricos.
 * Muestra el número con formato de moneda COP (puntos de miles) y anima
 * la transición entre el valor anterior y el nuevo.
 */
import { useEffect, useRef } from "react";
import { Animated, Text, type TextStyle } from "react-native";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  style?: TextStyle | TextStyle[];
  duration?: number;
  formatFn?: (n: number) => string;
}

function defaultFormat(n: number): string {
  return Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function AnimatedNumber({
  value,
  prefix = "$ ",
  style,
  duration = 450,
  formatFn = defaultFormat,
}: AnimatedNumberProps) {
  const animRef = useRef(new Animated.Value(value));
  const displayRef = useRef(value);
  const textRef = useRef<Text>(null);

  useEffect(() => {
    const anim = animRef.current;
    const listener = anim.addListener(({ value: v }) => {
      displayRef.current = v;
      if (textRef.current) {
        (textRef.current as any).setNativeProps({ text: `${prefix}${formatFn(v)}` });
      }
    });

    Animated.timing(anim, {
      toValue: value,
      duration,
      useNativeDriver: false,
    }).start();

    return () => anim.removeListener(listener);
  }, [value, duration, prefix, formatFn]);

  return (
    <Text ref={textRef} style={style}>
      {prefix}{formatFn(value)}
    </Text>
  );
}
