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
import { Plus, Search, Mic, MessageCircle } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useUIStore } from "@/src/store/useUIStore";
import { useVoiceExpense } from "@/src/features/voice/useVoiceExpense";
import { DOCK_HEIGHT, DOCK_BOTTOM_OFFSET } from "@/src/constants/layout";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingDock({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const openExpenseInput = useUIStore((s) => s.openExpenseInput);
  const { isListening, startListening, stopListening } = useVoiceExpense();

  const micScale = useSharedValue(1);
  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigateTo("index");
    openExpenseInput();
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
    if (isListening) stopListening();
    else await startListening();
  }

  const currentRoute = state.routes[state.index]?.name;
  const bottomPos = Math.max(insets.bottom, 0) + DOCK_BOTTOM_OFFSET;

  return (
    <View style={[styles.container, { bottom: bottomPos }]}>
      {/* ── White pill: [ + ]  [ 💬 ]  [ 🔍 ] ──────────────────── */}
      <View style={styles.pill}>
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: "transparent" }}
        >
          <Plus size={24} color="#111111" strokeWidth={2.2} />
        </Pressable>

        <Pressable
          onPress={handleChat}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: "transparent" }}
        >
          {/* chat_bubble relleno — idéntico al ícono de Stitch */}
          <MessageCircle
            size={24}
            color={currentRoute === "chat" ? "#1565C0" : "#111111"}
            fill={currentRoute === "chat" ? "#1565C0" : "#111111"}
            strokeWidth={0}
          />
        </Pressable>

        <Pressable
          onPress={handleSearch}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          android_ripple={{ color: "transparent" }}
        >
          <Search
            size={24}
            color={currentRoute === "analytics" ? "#1565C0" : "#111111"}
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

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: "5%",
    right: "5%",
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // ── Pill ──────────────────────────────────────────────────────────
  pill: {
    flex: 1,
    height: DOCK_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 9999,
    // Shadow matching Stitch
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },

  btn: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  btnPressed: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  // ── Mic FAB ───────────────────────────────────────────────────────
  micFab: {
    width: DOCK_HEIGHT,
    height: DOCK_HEIGHT,
    borderRadius: 9999,
    backgroundColor: "#1565C0", // azul sólido original
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1565C0",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  micFabListening: {
    backgroundColor: "#0D47A1", // azul más oscuro al escuchar
  },
});
