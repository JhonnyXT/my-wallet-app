/**
 * Piezas comunes de las hojas (BottomSheet): mismo título, etiquetas y botones en todas,
 * con el estilo de "Tus listas"/"Tus categorías".
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Plus } from "lucide-react-native";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { useAppTokens } from "@/src/theme/tokens";

export const SHEET_PADDING_X = 20;

/** Padding estándar de una hoja con formulario: laterales + respiro sobre la barra de gestos. */
export function useSheetPadding(): ViewStyle {
  const insets = useSafeAreaInsets();
  return { paddingHorizontal: SHEET_PADDING_X, paddingBottom: insets.bottom + 20 };
}

export function SheetHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  const c = useAppTokens().colors;
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: c.text.primary }]}>{title}</Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: c.text.secondary }]}>{subtitle}</Text>
        )}
      </View>
      {right}
    </View>
  );
}

export function SheetLabel({ children, first }: { children: string; first?: boolean }) {
  const c = useAppTokens().colors;
  return (
    <Text style={[styles.label, { color: c.text.secondary }, first && { marginTop: 0 }]}>
      {children}
    </Text>
  );
}

export function SheetActions({
  confirmLabel = "Guardar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  disabled = false,
  confirmColor = "#135BEC",
  style,
}: {
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  confirmColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useAppTokens().colors;
  return (
    <View style={[styles.actions, style]}>
      <PressableScale
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onCancel();
        }}
        style={[styles.btn, { backgroundColor: c.surface.elevated }]}
        accessibilityRole="button"
      >
        <Text style={[styles.cancelText, { color: c.text.secondary }]}>{cancelLabel}</Text>
      </PressableScale>
      <PressableScale
        onPress={onConfirm}
        disabled={disabled}
        style={[styles.btn, { backgroundColor: confirmColor }, disabled && { opacity: 0.4 }]}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
      >
        <Text style={styles.confirmText}>{confirmLabel}</Text>
      </PressableScale>
    </View>
  );
}

/** Botón "+ Nueva…" al pie de una lista dentro de una hoja (mismo que "Nueva lista"). */
export function SheetAddButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useAppTokens().colors;
  return (
    <PressableScale
      onPress={onPress}
      style={[styles.addBtn, { backgroundColor: c.accent.subtle }, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Plus size={18} color={c.accent.default} strokeWidth={2.4} />
      <Text style={[styles.addText, { color: c.accent.default }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 8,
  },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  btn: { flex: 1, height: 50, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontWeight: "600" },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  addBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addText: { fontSize: 15, fontWeight: "700" },
});
