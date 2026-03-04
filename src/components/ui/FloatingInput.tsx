import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Sparkles } from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { parseExpenseInput } from "@/src/utils/nlp";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { COLORS } from "@/src/constants/theme";

export function FloatingInput() {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const addTransaction = useFinanceStore((s) => s.addTransaction);

  const parsed = text.trim() ? parseExpenseInput(text) : null;

  async function handleSubmit() {
    if (!parsed) return;

    await addTransaction(parsed.amount, parsed.description, parsed.categoryEmoji);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setText("");
    Keyboard.dismiss();
  }

  return (
    <View className="px-6 pb-2">
      {isFocused && parsed && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          className="flex-row items-center justify-center gap-2 mb-3"
        >
          <View className="bg-[#F2F2F7] px-3 py-1.5 rounded-full flex-row items-center">
            <Text className="text-sm">
              {parsed.categoryEmoji} {parsed.description}
            </Text>
          </View>
          <View className="bg-midnight px-3 py-1.5 rounded-full">
            <Text className="text-sm font-bold text-white">
              € {parsed.amount.toFixed(2)}
            </Text>
          </View>
        </Animated.View>
      )}

      <Pressable
        onPress={() => inputRef.current?.focus()}
        className="flex-row items-center bg-[#F2F2F7] rounded-full px-4 py-3.5"
      >
        <Sparkles size={18} color={COLORS.accent} strokeWidth={2} />
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={handleSubmit}
          placeholder="¿Qué compraste hoy?"
          placeholderTextColor={COLORS.silver}
          returnKeyType="done"
          className="flex-1 ml-2.5 text-[15px] text-midnight"
        />
      </Pressable>
    </View>
  );
}
