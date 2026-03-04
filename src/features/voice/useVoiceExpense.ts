import { useState, useCallback, useEffect } from "react";
import * as Haptics from "expo-haptics";
import { Alert } from "react-native";
import { useUIStore } from "@/src/store/useUIStore";

/**
 * Guard: load the native module only if it exists.
 * expo-speech-recognition requires a custom dev build — it is NOT available in Expo Go.
 * Wrapping require() in try/catch prevents the crash so the app runs in Expo Go
 * and falls back gracefully (shows an informative alert instead).
 */
let SpeechModule: {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: object) => void;
  stop: () => void;
  addListener: (event: string, cb: (e: any) => void) => { remove: () => void };
} | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  SpeechModule = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  // Native module not available in Expo Go — voice will show a friendly notice
}

export function useVoiceExpense() {
  const [isListening, setIsListening] = useState(false);
  const openExpenseInput = useUIStore((s) => s.openExpenseInput);

  // Use useEffect + addListener instead of useSpeechRecognitionEvent hook,
  // so we don't violate React's Rules of Hooks with a conditional hook call.
  useEffect(() => {
    if (!SpeechModule) return;

    const subs = [
      SpeechModule.addListener("start", () => setIsListening(true)),
      SpeechModule.addListener("end", () => setIsListening(false)),
      SpeechModule.addListener("error", () => setIsListening(false)),
      SpeechModule.addListener("result", (event: any) => {
        const text: string = event.results?.[0]?.transcript ?? "";
        if (event.isFinal && text.trim()) {
          openExpenseInput(text.trim());
        }
      }),
    ];

    return () => {
      subs.forEach((sub) => sub?.remove?.());
    };
  }, [openExpenseInput]);

  const startListening = useCallback(async () => {
    if (!SpeechModule) {
      Alert.alert(
        "Voz no disponible en Expo Go",
        "La entrada por voz requiere un build de desarrollo nativo. Usa el botón + para escribir tu gasto manualmente.",
        [{ text: "Entendido" }]
      );
      return;
    }

    try {
      const perm = await SpeechModule.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permiso requerido",
          "Concede acceso al micrófono en los ajustes del dispositivo."
        );
        return;
      }

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      SpeechModule.start({
        lang: "es-ES",
        interimResults: true,
        maxAlternatives: 1,
        continuous: false,
      });
    } catch (err) {
      console.warn("[Voice] Error al iniciar reconocimiento:", err);
      setIsListening(false);
    }
  }, []);

  const stopListening = useCallback(() => {
    try {
      SpeechModule?.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  return { isListening, startListening, stopListening };
}
