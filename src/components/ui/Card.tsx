import { View, type ViewProps } from "react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { ThemedText } from "@/src/components/ui/ThemedText";

export interface CardProps extends ViewProps {
  variant?: "card" | "inset";
  padded?: boolean;
}

/**
 * Contenedor de tarjeta (lista agrupada). `padded={false}` cuando envuelve ListRow.
 * Borde visible (1.5px, `border.default`) — mismo lenguaje que el pill de `FilterChips`
 * y los botones circulares del header del Dashboard, portado a Ajustes.
 */
export function Card({ variant = "card", padded = true, style, ...rest }: CardProps) {
  const tokens = useAppTokens();

  return (
    <View
      style={[
        {
          backgroundColor:
            variant === "card" ? tokens.colors.surface.secondary : tokens.colors.surface.elevated,
          borderRadius: tokens.radius.lg,
          borderWidth: 1.5,
          borderColor: tokens.colors.border.default,
          padding: padded ? tokens.spacing.md : 0,
          overflow: "hidden",
        },
        style,
      ]}
      {...rest}
    />
  );
}

export function SectionHeader({ children }: { children: string }) {
  const tokens = useAppTokens();

  return (
    <ThemedText
      variant="sectionHeader"
      color="secondary"
      style={{
        marginBottom: tokens.spacing.sm,
        marginLeft: tokens.spacing.xs,
        textTransform: "uppercase",
      }}
    >
      {children}
    </ThemedText>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const tokens = useAppTokens();

  return (
    <View style={{ height: 1, backgroundColor: tokens.colors.border.default, marginLeft: inset }} />
  );
}
