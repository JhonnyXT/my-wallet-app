import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  PanResponder,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTheme } from "@/src/context/ThemeContext";
import { useReduceMotion } from "@/src/hooks/useReduceMotion";
import type { AppTheme } from "@/src/theme";

const CLOSE_DISTANCE = 90;
const CLOSE_VELOCITY = 0.8;
const OFFSCREEN = Dimensions.get("window").height;

// ─── Pila de hojas ──────────────────────────────────────────────────────────────
// Solo se ve la hoja de más arriba: al abrir otra encima, la de abajo baja y se oculta
// SIN desmontarse (conserva su estado y los formularios que viven dentro de ella), y
// vuelve a subir cuando la de arriba se cierra. Así ninguna hoja queda apilada a la vista.
let sheetStack: number[] = [];
let nextSheetId = 1;
const stackListeners = new Set<() => void>();

function useIsTopSheet(visible: boolean): boolean {
  const idRef = useRef(0);
  if (idRef.current === 0) idRef.current = nextSheetId++;
  const [isTop, setIsTop] = useState(true);

  useEffect(() => {
    const id = idRef.current;
    const update = () => {
      const idx = sheetStack.indexOf(id);
      setIsTop(idx === -1 || idx === sheetStack.length - 1);
    };
    stackListeners.add(update);
    if (visible) {
      sheetStack = [...sheetStack.filter((x) => x !== id), id];
      stackListeners.forEach((l) => l());
    }
    return () => {
      stackListeners.delete(update);
      if (visible) {
        sheetStack = sheetStack.filter((x) => x !== id);
        stackListeners.forEach((l) => l());
      }
    };
  }, [visible]);

  return isTop;
}

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Sube el contenido sobre el teclado (formularios con TextInput). */
  avoidKeyboard?: boolean;
}

/**
 * Bottom sheet base: tap fuera del contenido y deslizar hacia abajo desde el
 * handle cierran el sheet, sin depender de un botón "X". El gesto de arrastre
 * vive solo en el handle (no en todo el sheet) para no robarle el touch a
 * ScrollViews/listas dentro del contenido.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  style,
  avoidKeyboard = false,
}: BottomSheetProps) {
  const theme = useTheme();
  const s = useMemo(() => buildStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();
  const isTop = useIsTopSheet(visible);
  const hidden = !visible || !isTop;

  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(OFFSCREEN)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const shownRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // El Modal nativo se mantiene montado (animationType="none") mientras
  // corre la animación de salida propia: así evitamos la transición de
  // ventana de Android, que deja ver un flash negro detrás al cerrar.
  useEffect(() => {
    if (visible) setMounted(true);
    if (!hidden) {
      if (!shownRef.current) {
        translateY.setValue(OFFSCREEN);
        backdropOpacity.setValue(0);
      }
      shownRef.current = true;
      if (reduceMotion) {
        translateY.setValue(0);
        backdropOpacity.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
      ]).start();
      return;
    }
    if (!mounted) return;
    const finish = () => {
      if (!visible) {
        shownRef.current = false;
        setMounted(false);
      }
    };
    if (reduceMotion) {
      translateY.setValue(OFFSCREEN);
      backdropOpacity.setValue(0);
      finish();
      return;
    }
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: OFFSCREEN, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => finished && finish());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, visible]);

  // KeyboardAvoidingView no mide bien dentro de un Modal: se aplica la altura real del teclado.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!avoidKeyboard || !mounted) return;
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
      setKeyboardHeight(0);
    };
  }, [avoidKeyboard, mounted]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        const shouldClose = g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY;
        if (shouldClose) {
          onCloseRef.current();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[s.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>
      <Animated.View
        pointerEvents={isTop ? "auto" : "none"}
        style={[
          s.sheet,
          style,
          keyboardHeight > 0 && { bottom: keyboardHeight },
          { transform: [{ translateY }] },
        ]}
      >
        <View {...panResponder.panHandlers} style={s.grabZone}>
          <View style={s.handle} />
        </View>
        {children}
      </Animated.View>
    </Modal>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
    sheet: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: t.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 24,
    },
    grabZone: { paddingTop: 14, paddingBottom: 14, alignItems: "center" },
    handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: t.border },
  });
}
