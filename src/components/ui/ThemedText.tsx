import { Text, type TextProps } from "react-native";
import { useAppTokens, type TypeRole } from "@/src/theme/tokens";

export interface ThemedTextProps extends TextProps {
  variant?: TypeRole;
  color?: "primary" | "secondary" | "accent";
}

/** Texto con tipografía y color de la capa de tokens (src/theme/tokens.ts). */
export function ThemedText({ variant = "body", color = "primary", style, ...rest }: ThemedTextProps) {
  const tokens = useAppTokens();

  return (
    <Text
      style={[tokens.typography[variant], { color: tokens.colors.text[color] }, style]}
      {...rest}
    />
  );
}
