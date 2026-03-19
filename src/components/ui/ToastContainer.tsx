/**
 * ToastContainer — renderiza la cola global de toasts.
 * Se monta UNA sola vez en app/_layout.tsx, position absolute sobre todo.
 */
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { Layout } from "react-native-reanimated";
import { useToastStore } from "@/src/store/useToastStore";
import { ToastBanner } from "@/src/components/ui/ToastBanner";

export function ToastContainer() {
  const toasts     = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const insets     = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.wrapper, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map((toast) => (
        <Reanimated.View key={toast.id} layout={Layout.springify()}>
          <ToastBanner toast={toast} onDismiss={removeToast} />
        </Reanimated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
  },
});
