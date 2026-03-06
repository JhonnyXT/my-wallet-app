/**
 * FloatingDock — matches Stitch "Visual Expense Insights Home"
 *
 * Figma base values (scaled up for better visibility):
 *   Container:  left/right 5%, bottom = safeArea + 20px
 *   Pill:       white bg, borderRadius 9999, padding 10px
 *               shadow: 0px 15px 30px -5px rgba(0,0,0,0.12)
 *   Pill btns:  64×64px each
 *   Mic FAB:    68×68px, bg #D6EFFF
 *
 * Key: dock total height exported so screens calculate scrollView paddingBottom correctly.
 */
import { View, Pressable, StyleSheet } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Search, Mic, MessageSquare } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";
import { useExpenseStore } from "@/src/store/useExpenseStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const resetExpense = useExpenseStore((s) => s.reset);

  const micScale = useSharedValue(1);
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  // isListening ya no viene de useVoiceExpense — se maneja en el modal
  const isListening = false;

  function navigateTo(name: string) {
    const route = state.routes.find((r) => r.name === name);
    if (!route) return;
    const isFocused = state.routes[state.index]?.name === name;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(name);
  }

  async function handleAdd() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    resetExpense();                       // limpia cualquier dato previo
    router.push("/active-expense");       // abre el mismo modal de confirmación
  }

  async function handleChat() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateTo("chat");
  }

  async function handleSearch() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateTo("analytics");
  }

  async function handleMic() {
    micScale.value = withSequence(
      withSpring(0.88, { damping: 10 }),
      withSpring(1.0, { damping: 14 })
    );
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/voice-input");
  }

  const currentRoute = state.routes[state.index]?.name;
  const bottomPos = Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET;

  // Ocultar el dock cuando el chat está activo (tiene su propio input)
  if (currentRoute === "chat") return null;

  return (
    <View style={[styles.container, { bottom: bottomPos }]}>
      {/* ── White pill: [ + ]  [ 💬 ]  [ 🔍 ] ──────────────────── */}
      <View style={styles.pill}>
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: "transparent" }}
        >
          <Plus size={22} color="#111111" strokeWidth={2.2} />
        </Pressable>

        <Pressable
          onPress={handleChat}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: "transparent" }}
        >
          {/* chat_bubble — outlined, coincide con Stitch "chat_bubble" icon */}
          <MessageSquare
            size={22}
            color={currentRoute === "chat" ? "#2D5BFF" : "#111111"}
            strokeWidth={2}
          />
        </Pressable>

        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: "transparent" }}
        >
          <Search
            size={22}
            color={currentRoute === "analytics" ? "#2D5BFF" : "#111111"}
            strokeWidth={2}
          />
        </Pressable>
      </View>

      {/* ── Mic FAB ────────────────────────────────────────────────── */}
      <AnimatedPressable
        onPress={handleMic}
        style={[
          styles.micFab,
          isListening && styles.micFabListening,
          micStyle,
        ]}
        android_ripple={{ color: "rgba(21,101,192,0.15)", borderless: true }}
      >
        <Mic
          size={26}
          color="#FFFFFF"
          strokeWidth={2}
          fill={isListening ? "#FFFFFF" : "none"}
        />
      </AnimatedPressable>
    </View>
  );
}

// Stitch JSX:
//   Container:  left 6.15%, right 6.15%, bottom 40px, height 64, gap 12, flexRow
//   Pill:       flex 1, paddingV 8, paddingH 12, gap 49, bg #FFF, borderRadius 9999
//               shadow: 0px 12px 40px rgba(0,0,0,0.08)
//   Btn:        48×48
//   Mic FAB:    64×64, bg #2D5BFF, shadow rgba(45,91,255,0.3)
const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: "6.15%",
    right: "6.15%",
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // ── Pill ──────────────────────────────────────────────────────────
  // Stitch JSX: flex 1, paddingV 8, paddingH 12, gap 49, space-between
  // space-evenly distribuye los 3 iconos de forma uniforme sin pegarlos a los bordes
  pill: {
    flex: 1,
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 8,
    paddingHorizontal: 4,
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

  // ── Mic FAB ───────────────────────────────────────────────────────
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
  micFabListening: {
    backgroundColor: "#1A40CC",
  },
});
