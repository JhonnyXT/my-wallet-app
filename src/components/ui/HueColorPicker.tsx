/**
 * HueColorPicker — Selector de color libre basado en un slider de tono (hue).
 *
 * Muestra una barra de gradiente con todo el espectro de colores.
 * El usuario arrastra el thumb para elegir cualquier tono.
 * Muestra una preview del emoji con los colores derivados en tiempo real.
 *
 * Usa expo-linear-gradient (ya instalado) + PanResponder de RN.
 * No requiere dependencias nuevas.
 */
import { useRef, useCallback } from "react";
import {
  View,
  Text,
  PanResponder,
  Animated,
  type ViewStyle,
  type LayoutChangeEvent,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { hueToColors } from "@/src/utils/colorUtils";

// ─── Constantes visuales ──────────────────────────────────────────────────────

const BAR_HEIGHT = 36;
const THUMB_SIZE = 28;
const PREVIEW_SIZE = 52;

// 13 stops equidistantes del espectro HSL (hue 0-360)
const HUE_GRADIENT_COLORS: string[] = [
  "#FF0000", // 0   Rojo
  "#FF8000", // 30  Naranja
  "#FFFF00", // 60  Amarillo
  "#80FF00", // 90  Lima
  "#00FF00", // 120 Verde
  "#00FF80", // 150 Menta
  "#00FFFF", // 180 Cyan
  "#0080FF", // 210 Celeste
  "#0000FF", // 240 Azul
  "#8000FF", // 270 Violeta
  "#FF00FF", // 300 Magenta
  "#FF0080", // 330 Rosa
  "#FF0000", // 360 Rojo (cierre del círculo)
];

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface HueColorPickerProps {
  hue: number;
  onChange: (hue: number) => void;
  /** Emoji a mostrar en el preview con los colores derivados */
  previewEmoji?: string;
  style?: ViewStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function HueColorPicker({ hue, onChange, previewEmoji = "🎨", style }: HueColorPickerProps) {
  const barWidth = useRef(0);
  const thumbAnim = useRef(new Animated.Value(0)).current;

  // Sincronizar posición del thumb con el hue actual (sin animación)
  const syncThumb = useCallback(
    (w: number, h: number) => {
      const pos = (h / 360) * w - THUMB_SIZE / 2;
      thumbAnim.setValue(Math.max(0, Math.min(pos, w - THUMB_SIZE)));
    },
    [thumbAnim],
  );

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      barWidth.current = e.nativeEvent.layout.width;
      syncThumb(barWidth.current, hue);
    },
    [hue, syncThumb],
  );

  // PanResponder — solo gestiona el drag horizontal sobre la barra
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const x = e.nativeEvent.locationX;
        const w = barWidth.current;
        if (w === 0) return;
        const newHue = Math.round(Math.max(0, Math.min(x / w, 1)) * 360);
        syncThumb(w, newHue);
        onChange(newHue);
      },
      onPanResponderMove: (e) => {
        const x = e.nativeEvent.locationX;
        const w = barWidth.current;
        if (w === 0) return;
        const newHue = Math.round(Math.max(0, Math.min(x / w, 1)) * 360);
        syncThumb(w, newHue);
        onChange(newHue);
      },
      onPanResponderRelease: () => {},
    }),
  ).current;

  const { accent, bg } = hueToColors(hue);

  return (
    <View style={[styles.container, style]}>
      {/* Preview del emoji con los colores derivados */}
      <View style={styles.previewRow}>
        <View style={[styles.previewCircle, { backgroundColor: bg, borderColor: accent }]}>
          <Text style={styles.previewEmoji}>{previewEmoji}</Text>
        </View>
        <View style={styles.previewColors}>
          <View style={[styles.colorChip, { backgroundColor: accent }]} />
          <View
            style={[
              styles.colorChip,
              { backgroundColor: bg, borderWidth: 1.5, borderColor: accent },
            ]}
          />
        </View>
      </View>

      {/* Barra de gradiente + thumb */}
      <View style={styles.barWrapper} onLayout={handleLayout} {...panResponder.panHandlers}>
        <LinearGradient
          colors={HUE_GRADIENT_COLORS as [string, string, ...string[]]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.bar}
        />

        {/* Thumb deslizante */}
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: accent },
            { transform: [{ translateX: thumbAnim }] },
          ]}
          pointerEvents="none"
        />
      </View>

      {/* Etiqueta de tono */}
      <Text style={styles.hueLabel}>Tono {hue}°</Text>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  previewCircle: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
  },
  previewEmoji: {
    fontSize: 26,
  },
  previewColors: {
    flexDirection: "row",
    gap: 8,
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  barWrapper: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    overflow: "visible",
    justifyContent: "center",
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
  },
  thumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    top: (BAR_HEIGHT - THUMB_SIZE) / 2,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6,
  },
  hueLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#8B949E",
    textAlign: "right",
    letterSpacing: 0.3,
  },
});
