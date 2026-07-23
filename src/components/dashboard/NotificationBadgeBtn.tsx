// ─── Botón con badge de transacciones bancarias detectadas ───────────────────

import { View, Text, Pressable, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { router } from "expo-router";
import { useNotificationStore } from "@/src/store/useNotificationStore";
import { useTheme } from "@/src/context/ThemeContext";

export function NotificationBadgeBtn() {
  const theme = useTheme();
  const pendingItems = useNotificationStore((s) => s.pendingItems);
  const count = pendingItems.length;

  if (count === 0) return null;

  return (
    <Pressable
      style={[styles.btn, { backgroundColor: theme.surface }]}
      onPress={() => router.push("/notification-review")}
    >
      <Bell size={20} color={theme.text} strokeWidth={1.8} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
});
