import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Sparkles, X } from "lucide-react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { parseExpenseInput } from "@/src/utils/nlp";
import { useFinanceStore } from "@/src/store/useFinanceStore";
import { useUIStore } from "@/src/store/useUIStore";
import { COLORS } from "@/src/constants/theme";
import { useState } from "react";

export function FloatingInputOverlay() {
  const insets = useSafeAreaInsets();
  const { isExpenseInputOpen, prefillText, closeExpenseInput } = useUIStore();
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const addTransaction = useFinanceStore((s) => s.addTransaction);

  // Auto-fill voice transcript when opened
  useEffect(() => {
    if (isExpenseInputOpen) {
      setText(prefillText);
      setTimeout(() => inputRef.current?.focus(), 180);
    } else {
      setText("");
      setIsFocused(false);
    }
  }, [isExpenseInputOpen, prefillText]);

  const parsed = text.trim() ? parseExpenseInput(text) : null;

  async function handleSubmit() {
    if (!parsed) return;
    await addTransaction(parsed.amount, parsed.description, parsed.categoryEmoji);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeExpenseInput();
    Keyboard.dismiss();
  }

  function handleClose() {
    Keyboard.dismiss();
    closeExpenseInput();
  }

  if (!isExpenseInputOpen) return null;

  return (
    <Modal
      transparent
      statusBarTranslucent
      visible={isExpenseInputOpen}
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
      >
        {/* Área superior: toca para cerrar */}
        <TouchableWithoutFeedback onPress={handleClose}>
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(180)}
            style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.4)" }}
          />
        </TouchableWithoutFeedback>

        {/* Sheet inferior */}
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          exiting={SlideOutDown.duration(250)}
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        >
        {/* Handle bar */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Nuevo gasto</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <X size={18} color={COLORS.slate600} strokeWidth={2} />
          </Pressable>
        </View>

        {/* NLP Preview badge */}
        {parsed && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            style={styles.badgeRow}
          >
            <View style={styles.badgeLight}>
              <Text style={styles.badgeLightText}>
                {parsed.categoryEmoji} {parsed.description}
              </Text>
            </View>
            <View style={styles.badgeDark}>
              <Text style={styles.badgeDarkText}>
                $ {Math.round(parsed.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Input */}
        <Pressable
          onPress={() => inputRef.current?.focus()}
          style={[styles.inputContainer, isFocused && styles.inputFocused]}
        >
          <View style={styles.iconWrapper}>
            <Sparkles size={20} color={COLORS.primary} strokeWidth={2} />
          </View>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onSubmitEditing={handleSubmit}
            placeholder="Ej: Café 5000 o Uber 15000"
            placeholderTextColor={COLORS.slate400}
            returnKeyType="done"
            style={styles.textInput}
            autoCorrect={false}
          />
        </Pressable>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={!parsed}
          style={({ pressed }) => [
            styles.submitBtn,
            !parsed && styles.submitBtnDisabled,
            pressed && parsed && styles.submitBtnPressed,
          ]}
        >
          <Text style={styles.submitText}>
            {parsed ? `Guardar ${parsed.categoryEmoji}` : "Escribe un gasto"}
          </Text>
        </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.slate200,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.slate900,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.slate100,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  badgeLight: {
    backgroundColor: COLORS.slate100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeLightText: { fontSize: 13, color: COLORS.slate800 },
  badgeDark: {
    backgroundColor: COLORS.slate900,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeDarkText: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.slate100,
    borderRadius: 16,
    height: 56,
    paddingLeft: 50,
    paddingRight: 16,
    borderWidth: 1.5,
    borderColor: "transparent",
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  iconWrapper: {
    position: "absolute",
    left: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.slate800,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: COLORS.slate200,
  },
  submitBtnPressed: {
    opacity: 0.88,
  },
  submitText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
    letterSpacing: -0.2,
  },
});
