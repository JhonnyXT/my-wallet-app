/**
 * FloatingDock — componente verdaderamente flotante (position absolute)
 * Botones: [+] [🔍] [mic]
 * Al presionar "+": modal semi-transparente con opciones Ingreso / Gasto
 */
import { useState } from "react";
import {
  View, Pressable, StyleSheet, Modal,
  Text, TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Search, Mic, X, ArrowUp, ArrowDown } from "lucide-react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router, usePathname } from "expo-router";
import { DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useExpenseStore } from "@/src/store/useExpenseStore";
import { useUIStore } from "@/src/store/useUIStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingDock() {
  const insets         = useSafeAreaInsets();
  const pathname       = usePathname();
  const resetExpense   = useExpenseStore((s) => s.reset);
  const setIsExpense   = useExpenseStore((s) => s.setIsExpense);
  const searchOpen     = useUIStore((s) => s.searchOpen);
  const setSearchOpen  = useUIStore((s) => s.setSearchOpen);
  const closeSearch    = useUIStore((s) => s.closeSearch);

  const [menuOpen, setMenuOpen] = useState(false);

  const micScale = useSharedValue(1);
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const bottomPos = Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET;

  async function handleAddPress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMenuOpen(true);
  }

  function handleClose() {
    setMenuOpen(false);
  }

  async function handleSelectExpense() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(false);
    resetExpense();
    setIsExpense(true);
    router.push("/active-expense");
  }

  async function handleSelectIncome() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMenuOpen(false);
    resetExpense();
    setIsExpense(false);
    router.push("/active-expense");
  }

  async function handleSearch() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pathname === "/" || pathname === "/index" || pathname.endsWith("/(tabs)")) {
      if (searchOpen) closeSearch();
      else setSearchOpen(true);
    } else {
      router.navigate("/(tabs)");
      setSearchOpen(true);
    }
  }

  async function handleMic() {
    micScale.value = withSequence(
      withSpring(0.88, { damping: 10 }),
      withSpring(1.0,  { damping: 14 })
    );
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/voice-input");
  }

  return (
    <>
      {/* ── Dock normal ──────────────────────────────────────────────── */}
      <View
        style={[styles.container, { bottom: bottomPos }]}
        pointerEvents="box-none"
      >
        <View style={styles.pill}>
          <Pressable
            onPress={menuOpen ? handleClose : handleAddPress}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            android_ripple={{ color: "transparent" }}
          >
            {menuOpen
              ? <X size={22} color="#111111" strokeWidth={2.2} />
              : <Plus size={22} color="#111111" strokeWidth={2.2} />
            }
          </Pressable>

          <Pressable
            onPress={handleSearch}
            style={({ pressed }) => [
              styles.btn,
              pressed && styles.btnPressed,
              searchOpen && styles.btnActive,
            ]}
            android_ripple={{ color: "transparent" }}
          >
            <Search
              size={22}
              color={searchOpen ? "#2D5BFF" : "#111111"}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        <AnimatedPressable
          onPress={handleMic}
          style={[styles.micFab, micStyle]}
          android_ripple={{ color: "rgba(21,101,192,0.15)", borderless: true }}
        >
          <Mic size={26} color="#FFFFFF" strokeWidth={2} />
        </AnimatedPressable>
      </View>

      {/* ── Modal del menú + / Ingreso / Gasto ───────────────────────── */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        {/* Fondo semi-oscuro — toca para cerrar */}
        <Pressable style={styles.overlay} onPress={handleClose} />

        {/* Popup card */}
        <View style={[styles.popup, { bottom: bottomPos + DOCK_HEIGHT + 12 }]}>
          {/* Opción Ingreso */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleSelectIncome}
            activeOpacity={0.7}
          >
            <Text style={styles.optionLabel}>Ingreso</Text>
            <View style={[styles.optionIcon, styles.optionIconIncome]}>
              <ArrowUp size={18} color="#16A34A" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* Opción Gasto */}
          <TouchableOpacity
            style={styles.optionRow}
            onPress={handleSelectExpense}
            activeOpacity={0.7}
          >
            <Text style={styles.optionLabel}>Gasto</Text>
            <View style={[styles.optionIcon, styles.optionIconExpense]}>
              <ArrowDown size={18} color="#DC2626" strokeWidth={2.5} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Replica del dock con X ya activa */}
        <View style={[styles.container, styles.containerModal, { bottom: bottomPos }]}>
          <View style={styles.pill}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            >
              <X size={22} color="#111111" strokeWidth={2.2} />
            </Pressable>

            <Pressable
              onPress={() => { handleClose(); handleSearch(); }}
              style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            >
              <Search size={22} color="#111111" strokeWidth={2} />
            </Pressable>
          </View>

          <AnimatedPressable
            onPress={() => { handleClose(); handleMic(); }}
            style={[styles.micFab, micStyle]}
          >
            <Mic size={26} color="#FFFFFF" strokeWidth={2} />
          </AnimatedPressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 100,
  },
  containerModal: {
    zIndex: 10,
  },

  pill: {
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 40,
    elevation: 10,
  },

  btn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  btnPressed: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  btnActive: {
    backgroundColor: "rgba(45,91,255,0.08)",
  },

  micFab: {
    width: 64,
    height: 64,
    borderRadius: 9999,
    backgroundColor: "#2D5BFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2D5BFF",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 10,
  },

  // ── Modal ──────────────────────────────────────────────────────────
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  popup: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 20,
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    gap: 32,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0A1224",
    letterSpacing: -0.2,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconIncome: {
    backgroundColor: "#DCFCE7",
  },
  optionIconExpense: {
    backgroundColor: "#FFE4E6",
  },
  optionDivider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginHorizontal: -20,
  },
});
