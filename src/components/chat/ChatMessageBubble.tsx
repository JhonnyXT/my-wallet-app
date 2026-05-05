import { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import type { ChatMessage } from "@/src/types/chat";
import { WeeklySummaryCard } from "@/src/components/chat/WeeklySummaryCard";
import { BoldText } from "@/src/components/chat/BoldText";

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    msgRow: {
      flexDirection: "column",
      alignItems: "flex-start",
      marginBottom: 2,
    },
    msgRowUser: { alignItems: "flex-end" },
    bubble: {
      maxWidth: "80%",
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    bubbleUser: {
      backgroundColor: t.text,
      borderBottomRightRadius: 4,
      alignSelf: "flex-end",
    },
    bubbleAssistant: {
      backgroundColor: t.surface,
      borderBottomLeftRadius: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 2,
    },
    bubbleTextUser: {
      fontSize: 14,
      lineHeight: 20,
      color: t.bg,
      fontWeight: "600",
    },
    bubbleTextAssistant: {
      fontSize: 14,
      lineHeight: 21,
      color: t.text,
    },
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  item: ChatMessage;
}

export function ChatMessageBubble({ item }: Props) {
  const theme = useTheme();
  const s = useMemo(() => buildStyles(theme), [theme]);
  const isUser = item.role === "user";

  return (
    <Animated.View
      entering={FadeInDown.delay(20).duration(280)}
      style={[s.msgRow, isUser && s.msgRowUser]}
    >
      {!isUser && item.card && (
        <View style={{ marginBottom: item.text ? 8 : 0 }}>
          <WeeklySummaryCard card={item.card} />
        </View>
      )}

      {item.isLoading ? (
        <View style={[s.bubble, s.bubbleAssistant]}>
          <ActivityIndicator size="small" color={theme.textSub} />
        </View>
      ) : item.text ? (
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant]}>
          {isUser ? (
            <Text style={s.bubbleTextUser}>{item.text}</Text>
          ) : (
            <BoldText text={item.text} style={s.bubbleTextAssistant} />
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}
