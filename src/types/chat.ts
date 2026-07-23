import type { WeeklySummaryCard } from "@/src/features/chat/useLocalNLP";
import type { ChatSessionRow } from "@/src/db/chatDb";

// ─── Mensaje individual del chat ──────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isLoading?: boolean;
  card?: WeeklySummaryCard;
}

// ─── Ítem agrupado para el drawer de historial ────────────────────────────────

export type ChatGroupedItem =
  { type: "header"; label: string } | { type: "session"; session: ChatSessionRow };
