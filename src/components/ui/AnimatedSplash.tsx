import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Animated, StyleSheet, Dimensions } from "react-native";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";

const { width } = Dimensions.get("window");

interface AnimatedSplashProps {
  onFinish: () => void;
  /** true cuando el bootstrap (DB, notificaciones, etc.) terminó. Hasta que no sea
   * true, el splash se queda quieto tras la animación de entrada — nunca hace fade
   * out antes de que la app esté realmente lista detrás. */
  ready: boolean;
}

export function AnimatedSplash({ onFinish, ready }: AnimatedSplashProps) {
  const iconScale = useRef(new Animated.Value(0.3)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTransY = useRef(new Animated.Value(18)).current;
  const wholeOpacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  const [entranceDone, setEntranceDone] = useState(false);

  useEffect(() => {
    // Reducir movimiento: mantener los fades (ayudan a entender la transición de
    // arranque), saltar directo el scale del ícono y el slide-up del texto.
    if (reduceMotion) {
      iconScale.setValue(1);
      textTransY.setValue(0);
    }

    // 1) Ícono aparece con scale + fade
    Animated.parallel([
      reduceMotion
        ? Animated.timing(iconScale, { toValue: 1, duration: 1, useNativeDriver: true })
        : Animated.spring(iconScale, {
            toValue: 1,
            damping: 16,
            stiffness: 120,
            useNativeDriver: true,
          }),
      Animated.timing(iconOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2) Nombre aparece debajo con fade + slide up
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(textTransY, {
          toValue: 0,
          duration: reduceMotion ? 1 : 450,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // 3) Entrada terminada — el fade out se dispara en el otro efecto, una vez
        // `ready` también sea true (ver abajo). Así el splash nunca desaparece antes
        // de que la app de atrás esté realmente lista.
        setEntranceDone(true);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!entranceDone || !ready) return;
    // Pausa breve tras la entrada, luego fade out de todo
    const timeout = setTimeout(() => {
      Animated.timing(wholeOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => onFinish());
    }, 900);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entranceDone, ready]);

  return (
    <Animated.View style={[styles.container, { opacity: wholeOpacity }]}>
      {/* Ícono */}
      <Animated.View
        style={{
          opacity: iconOpacity,
          transform: [{ scale: iconScale }],
        }}
      >
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.icon}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Nombre */}
      <Animated.View
        style={{
          opacity: textOpacity,
          transform: [{ translateY: textTransY }],
        }}
      >
        <Text style={styles.appName}>MyWallet</Text>
        <Text style={styles.tagline}>Tu dinero, bajo control</Text>
      </Animated.View>
    </Animated.View>
  );
}

const ICON_SIZE = width * 0.28;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#135BEC",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  icon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE * 0.22,
    marginBottom: 24,
  },
  appName: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  tagline: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.3,
  },
});
