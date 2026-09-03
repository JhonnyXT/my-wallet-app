import { View, type ViewProps } from "react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { ThemedText } from "@/src/components/ui/ThemedText";

export interface CardProps extends ViewProps {
  variant?: "card" | "inset";
  padded?: boolean;
}

/**
 * Contenedor de tarjeta (lista agrupada). `padded={false}` cuando envuelve ListRow.
 * Sin borde — se distingue del fondo solo por color de relleno (`surface.secondary`
 * vs `surface.primary` de la pantalla) y esquinas redondeadas, como en el diseño de
 * referencia (2026-09-02: se quitó el borde de 1.5px que tenía antes, se veía como
 * un aro blanco/gris alrededor de cada tarjeta en tema oscuro).
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
