import type { ReactNode, Ref } from "react";
import { View, type View as RNView } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { PressableScale } from "@/src/components/ui/PressableScale";
import { ThemedText } from "@/src/components/ui/ThemedText";

export interface StackedScreenHeaderAction {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface StackedScreenHeaderProps {
  onBack: () => void;
  backAccessibilityLabel?: string;
  backRef?: Ref<RNView>;
  action?: StackedScreenHeaderAction;
  title: string;
}

/**
 * Barra de app estilo Material: flecha llana + título en la misma fila (sin botón
 * flotante circular ni título grande duplicado en el body — ese patrón era el look
 * "large title" de iOS que se reemplazó por este).
 */
export function StackedScreenHeader({
  onBack,
  backAccessibilityLabel = "Volver",
  backRef,
  action,
  title,
}: StackedScreenHeaderProps) {
  const tokens = useAppTokens();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.sm,
        paddingVertical: tokens.spacing.sm,
      }}
    >
      <PressableScale
        ref={backRef}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel}
        style={{ padding: tokens.spacing.sm, borderRadius: tokens.radius.full }}
      >
        <ArrowLeft size={22} color={tokens.colors.text.primary} strokeWidth={2} />
      </PressableScale>
      <ThemedText variant="headline" style={{ flex: 1, fontSize: 20, lineHeight: 25 }}>
        {title}
      </ThemedText>
      {action ? (
        <PressableScale
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          style={{ padding: tokens.spacing.sm, borderRadius: tokens.radius.full }}
        >
          {action.icon}
        </PressableScale>
      ) : null}
    </View>
  );
}
