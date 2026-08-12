import type { ReactNode, Ref } from "react";
import { View, type View as RNView } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useAppTokens } from "@/src/theme/tokens";
import { PressableScale } from "@/src/components/ui/PressableScale";

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
}

/**
 * Header de pantalla apilada (B.2): dos botones circulares (atrás / acción opcional),
 * sin header nativo. El título grande vive en el body del scroll, no aquí.
 */
export function StackedScreenHeader({
  onBack,
  backAccessibilityLabel = "Volver",
  backRef,
  action,
}: StackedScreenHeaderProps) {
  const tokens = useAppTokens();

  const buttonStyle = {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: tokens.colors.surface.secondary,
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: tokens.spacing.md,
        paddingTop: tokens.spacing.md,
      }}
    >
      <PressableScale
        ref={backRef}
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={backAccessibilityLabel}
        style={buttonStyle}
      >
        <ChevronLeft size={20} color={tokens.colors.accent.default} />
      </PressableScale>

      {action ? (
        <PressableScale
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          style={buttonStyle}
        >
          {action.icon}
        </PressableScale>
      ) : null}
    </View>
  );
}
