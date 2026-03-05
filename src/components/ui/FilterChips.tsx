/**
 * FilterChips — chips con dropdown profesional y minimalista.
 *
 * Diseño basado en las guías oficiales de React Native para Modals y Animated API:
 *   - Entrada con spring (scale 0.92→1) + fade (opacity 0→1)
 *   - Items con separador hairline
 *   - Checkmark inline con Text (más fiable que SVG en todas las plataformas)
 *   - Ripple en Android, opacity en iOS
 */
import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Pressable,
  Animated,
} from "react-native";

const PERIODS = ["Este mes", "Esta semana", "Este año", "Todo"];
const WALLETS = ["Personal", "Trabajo", "Ahorros"];

// ─── Chevron CSS ─────────────────────────────────────────────────────────────
function ChevronIcon({ size = 10, color = "#000" }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size / 2, marginTop: 2 }}>
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: size / 2 + 1,
          height: 1.5,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: "35deg" }, { translateY: 2 }],
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          width: size / 2 + 1,
          height: 1.5,
          backgroundColor: color,
          borderRadius: 1,
          transform: [{ rotate: "-35deg" }, { translateY: 2 }],
        }}
      />
    </View>
  );
}

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface DropdownConfig {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  x: number;
  y: number;
  minWidth: number;
}

// ─── Dropdown modal animado ──────────────────────────────────────────────────
function DropdownModal({
  config,
  onClose,
}: {
  config: DropdownConfig;
  onClose: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrada: spring suave + fade rápido
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 280,
        friction: 22,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Área invisible que cierra el dropdown */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={StyleSheet.absoluteFillObject} />
      </TouchableWithoutFeedback>

      {/* Tarjeta animada */}
      <Animated.View
        style={[
          styles.dropdown,
          {
            top: config.y,
            left: config.x,
            minWidth: config.minWidth,
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {config.options.map((opt, i) => {
          const isSelected = config.selected === opt;
          const isLast = i === config.options.length - 1;

          return (
            <View key={opt}>
              <Pressable
                android_ripple={{ color: "#F0F0F0" }}
                style={({ pressed }) => [
                  styles.dropdownItemPressable,
                  pressed && styles.dropdownItemPressed,
                ]}
                onPress={() => {
                  config.onSelect(opt);
                  onClose();
                }}
              >
                {/* View interno obligatorio para flexDirection row en Android */}
                <View style={styles.dropdownItemRow}>
                  <Text
                    style={[
                      styles.dropdownItemText,
                      isSelected && styles.dropdownItemTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                  {isSelected ? (
                    <Text style={styles.dropdownCheck}>✓</Text>
                  ) : (
                    <View style={styles.dropdownCheckPlaceholder} />
                  )}
                </View>
              </Pressable>

              {/* Separador hairline entre items (no después del último) */}
              {!isLast && <View style={styles.separator} />}
            </View>
          );
        })}
      </Animated.View>
    </Modal>
  );
}

// ─── Chip individual ─────────────────────────────────────────────────────────
interface ChipProps {
  label: string;
  onPress: (pos: { x: number; y: number; width: number }) => void;
}

function Chip({ label, onPress }: ChipProps) {
  const ref = useRef<View>(null);

  const handlePress = () => {
    ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
      onPress({ x: pageX, y: pageY + height + 8, width });
    });
  };

  return (
    <View ref={ref} style={styles.chip}>
      <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
        <View style={styles.chipContent}>
          <Text style={styles.chipText}>{label}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export function FilterChips() {
  const [period, setPeriod] = useState(PERIODS[0]);
  const [wallet, setWallet] = useState(WALLETS[0]);
  const [dropdown, setDropdown] = useState<DropdownConfig | null>(null);

  const openPeriod = ({ x, y, width }: { x: number; y: number; width: number }) =>
    setDropdown({ options: PERIODS, selected: period, onSelect: setPeriod, x, y, minWidth: Math.max(width, 168) });

  const openWallet = ({ x, y, width }: { x: number; y: number; width: number }) =>
    setDropdown({ options: WALLETS, selected: wallet, onSelect: setWallet, x, y, minWidth: Math.max(width, 148) });

  return (
    <>
      <View style={styles.row}>
        <Chip label={period} onPress={openPeriod} />
        <Chip label={wallet} onPress={openWallet} />
      </View>

      {dropdown && (
        <DropdownModal config={dropdown} onClose={() => setDropdown(null)} />
      )}
    </>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Fila de chips ─────────────────────────────────────────────────────────────
  // Sin paddingHorizontal: el padre (headerOuter en index.tsx) ya tiene paddingH 28
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Estilo toggle minimalista — mismo patrón que Gasto/Ingreso en active-expense
  // Píldora blanca con borde oscuro sutil, texto negro, chevron pequeño
  // View externo con el borde — garantiza visibilidad en Android
  chip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: "#D4D4D4",
    overflow: "hidden",
  },
  chipContent: {
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
    lineHeight: 20,
  },

  // ── Dropdown ─────────────────────────────────────────────────────────────────
  dropdown: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    overflow: "hidden",
    // Sombra refinada: difusa y profunda (estilo iOS/Figma)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 28,
    elevation: 22,
  },

  // Pressable: solo define el área táctil y fondo al presionar
  dropdownItemPressable: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 50,
  },
  dropdownItemPressed: {
    backgroundColor: "#F7F7F7",
  },

  // View interno: maneja el layout en fila (patrón correcto para Android)
  dropdownItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  dropdownItemText: {
    fontSize: 15,
    fontWeight: "400",
    color: "#3A3A3A",
    letterSpacing: -0.2,
    flex: 1,
  },
  dropdownItemTextSelected: {
    fontWeight: "700",
    color: "#000000",
  },

  dropdownCheck: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
    marginLeft: 12,
    lineHeight: 20,
  },
  dropdownCheckPlaceholder: {
    width: 27, // mismo ancho que el check (15) + marginLeft (12)
  },

  // Separador hairline (1 physical pixel, se ve fino en todas las densidades)
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#EBEBEB",
    marginHorizontal: 0,
  },
});
