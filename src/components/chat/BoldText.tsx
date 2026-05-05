import { Text } from "react-native";
import type { TextStyle } from "react-native";

interface Props {
  text: string;
  style?: TextStyle;
}

/**
 * Renderiza texto con soporte para **negrita** en estilo Markdown mínimo.
 * Las porciones envueltas en ** se renderizan con fontWeight 700.
 */
export function BoldText({ text, style }: Props) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={i} style={{ fontWeight: "700" }}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
}
