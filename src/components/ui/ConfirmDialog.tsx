import { useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import { AlertTriangle, Trash2, Info } from "lucide-react-native";
import { useTheme } from "@/src/context/ThemeContext";
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
}

const VARIANT_CONFIG: Record<DialogVariant, {
  icon: typeof Trash2;
  iconBg: string;
  iconColor: string;
  btnBg: string;
  btnText: string;
}> = {
  danger: {
    icon: Trash2,
    iconBg: "#FEE2E2",
    iconColor: "#DC2626",
    btnBg: "#DC2626",
    btnText: "#FFFFFF",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    btnBg: "#D97706",
    btnText: "#FFFFFF",
  },
  info: {
    icon: Info,
    iconBg: "#DBEAFE",
    iconColor: "#2563EB",
    btnBg: "#135BEC",
    btnText: "#FFFFFF",
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
}: ConfirmDialogProps) {
  const theme = useTheme();
  const st = useMemo(() => buildStyles(theme), [theme]);
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, damping: 18, stiffness: 200, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[st.backdrop, { opacity: opacityAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View style={[st.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>

              <View style={[st.iconCircle, { backgroundColor: cfg.iconBg }]}>
                <Icon size={24} color={cfg.iconColor} strokeWidth={2} />
              </View>

              <Text style={st.title}>{title}</Text>
              <Text style={st.message}>{message}</Text>

              <View style={st.buttons}>
                <TouchableOpacity activeOpacity={0.7} onPress={onCancel} style={st.cancelBtn}>
                  <Text style={st.cancelText}>{cancelLabel}</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={onConfirm} style={[st.confirmBtn, { backgroundColor: cfg.btnBg }]}>
                  <Text style={[st.confirmText, { color: cfg.btnText }]}>{confirmLabel}</Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
    },
    card: {
      width: "100%",
      backgroundColor: t.surface,
      borderRadius: 24,
      paddingTop: 32,
      paddingBottom: 24,
      paddingHorizontal: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
      elevation: 20,
    },
    iconCircle: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: t.text,
      textAlign: "center",
      marginBottom: 8,
      letterSpacing: -0.3,
    },
    message: {
      fontSize: 14,
      fontWeight: "400",
      color: t.textSub,
      textAlign: "center",
      lineHeight: 21,
      marginBottom: 24,
    },
    buttons: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      backgroundColor: t.inputBg,
      alignItems: "center",
    },
    cancelText: {
      fontSize: 14,
      fontWeight: "600",
      color: t.textSub,
    },
    confirmBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    confirmText: {
      fontSize: 14,
      fontWeight: "700",
    },
  });
}
