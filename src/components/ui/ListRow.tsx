import type { ReactNode } from "react";
import { View, type ViewStyle, type StyleProp } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { ThemedText } from "@/src/components/ui/ThemedText";

export interface ListRowProps {
  label: string;
  /** Glifo ya renderizado (ej. `<Wallet size={16} color="#fff" />`), cuadrado 30×30 con `iconBg`. */
  icon?: ReactNode;
  iconBg?: string;
  detail?: string;
  detailColor?: string;
  /** Sobreescribe el color del label sin marcarlo `destructive` (ej. accent en "Agregar…"). */
  labelColor?: string;
  showChevron?: boolean;
  destructive?: boolean;
  onPress?: () => void;
  /** Reemplaza detail+chevron por un control custom (Switch, botones editar/eliminar…). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabelOverride?: string;
}

/** Fila de lista agrupada: ícono + label + (detail/chevron | right). Toda la fila es el área táctil. */
export function ListRow({
  label,
  icon,
  iconBg,
  detail,
  detailColor,
  labelColor: labelColorOverride,
  showChevron = false,
  destructive = false,
  onPress,
  right,
  style,
  accessibilityLabelOverride,
}: ListRowProps) {
  const tokens = useAppTokens();
  const labelColor = destructive
    ? tokens.colors.state.danger
    : (labelColorOverride ?? tokens.colors.text.primary);

  return (
    <PressableScale
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabelOverride ?? (detail ? `${label}, ${detail}` : label)}
      activeScale={0.98}
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm + 2,
          paddingHorizontal: tokens.spacing.md,
          minHeight: 48,
        },
        style,
      ]}
    >
      {icon ? (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: tokens.radius.full,
            backgroundColor: iconBg ?? tokens.colors.text.secondary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </View>
      ) : null}

      <ThemedText variant="body" numberOfLines={1} style={{ flex: 1, color: labelColor }}>
        {label}
      </ThemedText>

      {right ?? (
        <>
          {detail ? (
            <ThemedText
              variant="body"
              color="secondary"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                { flexShrink: 0, maxWidth: 120, textAlign: "right" },
                detailColor ? { color: detailColor } : undefined,
              ]}
            >
              {detail}
            </ThemedText>
          ) : null}
          {showChevron ? <ChevronRight size={16} color={tokens.colors.text.secondary} /> : null}
        </>
      )}
    </PressableScale>
  );
}
