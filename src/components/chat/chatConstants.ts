import { Dimensions } from "react-native";
import type { ChatMessage } from "@/src/types/chat";

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Dimensiones del drawer y tarjeta ────────────────────────────────────────

export const DRAWER_W = SCREEN_W * 0.82;
export const CARD_W = SCREEN_W - 56;

// ─── Color de acento propio del chat (≠ acento global #135BEC) ───────────────
// Usado en la gráfica SVG, badge de hoy y botones del input.

export const BLUE_CHAT = "#2D5BFF";

// ─── Constantes de texto ──────────────────────────────────────────────────────

export const WELCOME_TEXT = "Hola. ¿En qué puedo ayudarte con tus finanzas hoy?";

export const INITIAL_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  text: WELCOME_TEXT,
};

export const SUGGESTIONS: string[] = [
  "¿Cuánto gasté este mes?",
  "Resumen de esta semana",
  "Últimas 5 transacciones",
  "¿Cuál fue mi mayor gasto?",
];
