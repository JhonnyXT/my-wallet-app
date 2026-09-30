import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertTriangle, Trash2, Info } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { SheetActions } from "@/src/components/ui/SheetParts";
import type { AppTheme } from "@/src/theme";

type DialogVariant = "danger" | "warning" | "info";

interface ConfirmDialogProps {
  visible: boolean;
  variant?: DialogVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Emoji en el círculo en vez del ícono del variant (avisos de permiso). */
  emoji?: string;
  /** "left" para mensajes con viñetas. */
  align?: "center" | "left";
}

const VARIANT_CONFIG: Record<
  DialogVariant,
  {
    icon: typeof Trash2;
    iconBg: string;
    iconColor: string;
    btnBg: string;
  }
> = {
  danger: {
    icon: Trash2,
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    btnBg: "#DC2626",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    btnBg: "#D97706",
  },
  info: {
    icon: Info,
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    btnBg: "#135BEC",
  },
};

export function ConfirmDialog({
  visible,
  variant = "danger",
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  emoji,
  align = "center",
}: ConfirmDialogProps) {
  const theme = useTheme();
  const st = useMemo(() => buildStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  return (
    <BottomSheet
      visible={visible}
      onClose={onCancel}
      style={[st.sheet, { paddingBottom: insets.bottom + 20 }]}
    >
      <View style={[st.iconCircle, { backgroundColor: cfg.iconBg }]}>
        {emoji ? (
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        ) : (
          <Icon size={24} color={cfg.iconColor} strokeWidth={2} />
        )}
      </View>
      <Text style={st.title}>{title}</Text>
      <Text style={[st.message, { textAlign: align }]}>{message}</Text>
      <SheetActions
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={onConfirm}
        onCancel={onCancel}
        confirmColor={cfg.btnBg}
        style={{ marginTop: 0 }}
      />
    </BottomSheet>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    sheet: { paddingHorizontal: 24, alignItems: "stretch" },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: t.text,
      textAlign: "center",
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    message: {
      fontSize: 14,
      color: t.textSub,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 24,
    },
  });
}
