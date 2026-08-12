import { useEffect, useMemo, useRef, type ReactNode } from "react";
import {
  Animated,
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

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Bottom sheet base: tap fuera del contenido y deslizar hacia abajo desde el
 * handle cierran el sheet, sin depender de un botón "X". El gesto de arrastre
 * vive solo en el handle (no en todo el sheet) para no robarle el touch a
 * ScrollViews/listas dentro del contenido.
 */
export function BottomSheet({ visible, onClose, children, style }: BottomSheetProps) {
  const theme = useTheme();
  const s = useMemo(() => buildStyles(theme), [theme]);
  const reduceMotion = useReduceMotion();

  const translateY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

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
          if (reduceMotion) {
            onCloseRef.current();
            return;
          }
          Animated.timing(translateY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => onCloseRef.current());
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.backdrop} />
      </TouchableWithoutFeedback>
      <Animated.View style={[s.sheet, style, { transform: [{ translateY }] }]}>
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
