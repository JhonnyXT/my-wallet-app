/**
 * RollingNumber — contador tipo odómetro (cuentakilómetros).
 *
 * Cada dígito tiene su propia columna vertical con los números 0-9 apilados tres
 * veces. En reposo se muestra la copia del medio; cuando el dígito cambia, la
 * columna gira siempre HACIA ADELANTE hasta la tercera copia (efecto ruleta, al
 * menos una vuelta si el dígito baja) y al terminar salta invisible a la copia
 * del medio. Las columnas arrancan escalonadas de izquierda a derecha.
 * Reanimated en el UI thread (60fps, sin bloquear el JS thread).
 *
 * Formato COP: separadores de miles con "." intercalados entre las columnas.
 * Cuando el conteo de dígitos cambia, las nuevas columnas/separadores
 * hacen fade-in y los que desaparecen hacen fade-out.
 */
import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, type TextStyle, type StyleProp } from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  useReducedMotion,
  FadeInDown,
  FadeOut,
} from "react-native-reanimated";

// ─── DigitColumn ──────────────────────────────────────────────────────────────

const DIGIT_ROWS = Array.from({ length: 30 }, (_, i) => i % 10);
// Escalonado entre columnas: la ruleta "corre" de izquierda a derecha.
const COLUMN_STAGGER_MS = 35;
// Columna con los dígitos 0-9 apilados verticalmente. El translateY
// desplaza la pila para mostrar el dígito correcto dentro del clipping.

function DigitColumn({
  digit,
  digitHeight,
  style,
  duration,
  delay,
}: {
  digit: number;
  digitHeight: number;
  style?: TextStyle;
  duration: number;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  // Posición en "filas": 10 + dígito = copia del medio (reposo, sin animación de entrada).
  const row = useSharedValue(10 + digit);
  const prevDigit = useRef(digit);

  useEffect(() => {
    if (prevDigit.current === digit) return;
    prevDigit.current = digit;
    if (reducedMotion) {
      row.value = 10 + digit;
      return;
    }
    // Siempre hacia adelante: de la copia del medio a la tercera (1 a 19 filas).
    row.value = withDelay(
      delay,
      withTiming(20 + digit, { duration, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) row.value = 10 + digit;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digit]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -row.value * digitHeight }],
  }));

  return (
    // overflow:hidden recorta la columna para mostrar solo 1 dígito a la vez
    <View style={{ height: digitHeight, overflow: "hidden" }}>
      <Reanimated.View style={animStyle}>
        {DIGIT_ROWS.map((d, i) => (
          <Text
            key={i}
            style={[
              style,
              {
                height: digitHeight,
                lineHeight: digitHeight,
                includeFontPadding: false,
                textAlignVertical: "center",
              },
            ]}
          >
            {d}
          </Text>
        ))}
      </Reanimated.View>
    </View>
  );
}

// ─── Token parsing ────────────────────────────────────────────────────────────
// Convierte un número en una lista de tokens (dígito | separador) con keys
// estables basadas en la posición desde la derecha.
// Así cuando el conteo de dígitos cambia, los dígitos existentes conservan
// su estado de animación y solo los nuevos se montan/desmontan.

type Token = { type: "digit"; digit: number; key: string } | { type: "sep"; key: string };

function tokenize(n: number): Token[] {
  const raw = Math.round(Math.abs(n)).toString();
  const rawLen = raw.length;
  const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const tokens: Token[] = [];
  let digitIdx = 0;

  for (const char of formatted) {
    if (char === ".") {
      // Key del separador: posición desde la derecha del próximo dígito + 1
      const posFromRight = rawLen - digitIdx;
      tokens.push({ type: "sep", key: `sep-${posFromRight}` });
    } else {
      const posFromRight = rawLen - 1 - digitIdx;
      tokens.push({ type: "digit", digit: parseInt(char, 10), key: `d-${posFromRight}` });
      digitIdx++;
    }
  }

  return tokens;
}

// ─── RollingNumber ────────────────────────────────────────────────────────────

export interface RollingNumberProps {
  value: number;
  /** Prefijo que se muestra antes de los dígitos (ej. "$") */
  prefix?: string;
  /** Estilo aplicado a cada dígito, separador y prefijo */
  style?: StyleProp<TextStyle>;
  /** Duración del giro de cada columna en ms (default 700) */
  duration?: number;
}

export function RollingNumber({ value, prefix = "$ ", style, duration = 700 }: RollingNumberProps) {
  const flat = StyleSheet.flatten(style) as TextStyle | undefined;
  const fontSize = (flat?.fontSize as number) ?? 14;
  // Usa lineHeight del estilo si está definido; si no, estima desde fontSize
  const digitHeight =
    typeof flat?.lineHeight === "number" ? flat.lineHeight : Math.ceil(fontSize * 1.28);

  const tokens = tokenize(value);
  let digitOrder = 0;

  const baseTextStyle: TextStyle = {
    ...flat,
    includeFontPadding: false,
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
      {/* Prefijo ("$") fuera de las columnas animadas */}
      {prefix ? <Text style={baseTextStyle}>{prefix}</Text> : null}

      {tokens.map((token) =>
        token.type === "sep" ? (
          // Separador de miles: fade-in al aparecer, fade-out al desaparecer
          <Reanimated.View
            key={token.key}
            entering={FadeInDown.duration(220)}
            exiting={FadeOut.duration(160)}
          >
            <Text style={[baseTextStyle, { lineHeight: digitHeight }]}>{"."}</Text>
          </Reanimated.View>
        ) : (
          // Columna de dígito: fade-in al aparecer (nuevo dígito), fade-out al desaparecer
          <Reanimated.View
            key={token.key}
            entering={FadeInDown.duration(220)}
            exiting={FadeOut.duration(160)}
          >
            <DigitColumn
              digit={token.digit}
              digitHeight={digitHeight}
              style={flat}
              duration={duration}
              delay={digitOrder++ * COLUMN_STAGGER_MS}
            />
          </Reanimated.View>
        ),
      )}
    </View>
  );
}
