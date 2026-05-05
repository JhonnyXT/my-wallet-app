import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, Sparkles, ArrowUp, AlignJustify } from "lucide-react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { processQuery } from "@/src/features/chat/useLocalNLP";
import {
  initChatTables,
  createChatSession,
  updateSessionTitle,
  touchSession,
  getChatSessions,
  getChatMessages,
  deleteChatSession,
  addChatMessage,
  type ChatSessionRow,
} from "@/src/db/chatDb";
import { useTheme } from "@/src/context/ThemeContext";
import type { AppTheme } from "@/src/theme";
import type { ChatMessage } from "@/src/types/chat";
import type { WeeklySummaryCard } from "@/src/features/chat/useLocalNLP";
import { ChatMessageBubble } from "@/src/components/chat/ChatMessageBubble";
import { ChatHistoryDrawer } from "@/src/components/chat/ChatHistoryDrawer";
import {
  DRAWER_W,
  BLUE_CHAT,
  WELCOME_TEXT,
  INITIAL_MESSAGE,
  SUGGESTIONS,
} from "@/src/components/chat/chatConstants";
import { makeTitle } from "@/src/utils/chatHelpers";

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function buildStyles(t: AppTheme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 12,
      backgroundColor: t.bg,
    },
    headerBtn: {
      width: 36,
      height: 36,
      alignItems: "center",
      justifyContent: "center",
    },
    headerCenter: { flex: 1, alignItems: "center", gap: 3 },
    headerDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: BLUE_CHAT,
    },
    headerTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: t.text,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    list: {
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 10,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 4,
      paddingBottom: 8,
    },
    chip: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipText: {
      fontSize: 12,
      color: t.textSub,
      fontWeight: "500",
    },
    inputWrap: {
      paddingHorizontal: 16,
      paddingTop: 8,
      backgroundColor: t.bg,
    },
    inputPill: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: t.surface,
      borderRadius: 999,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
    textInput: {
      flex: 1,
      height: 48,
      paddingHorizontal: 10,
      fontSize: 14,
      color: t.text,
    },
    sendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: t.text,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 6,
    },
    sendBtnDisabled: { opacity: 0.3 },
  });
}

// ─── Pantalla principal ───────────────────────────────────────────────────────

export default function ChatScreen() {
  const theme = useTheme();
  const s = useMemo(() => buildStyles(theme), [theme]);

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // Drawer de historial
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");

  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const dockPad = Math.max(insets.bottom, 0) + 16;

  // Animación del drawer
  const drawerX = useSharedValue(DRAWER_W);
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerX.value }],
  }));

  // ── Init DB al montar ─────────────────────────────────────────────────────
  useEffect(() => {
    initChatTables().then(() => loadSessions());
  }, []);

  async function loadSessions() {
    const rows = await getChatSessions();
    setSessions(rows);
  }

  // ── Drawer ────────────────────────────────────────────────────────────────
  function openDrawer() {
    loadSessions();
    setShowHistory(true);
    drawerX.value = withTiming(0, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
    });
  }

  function closeDrawer() {
    drawerX.value = withTiming(DRAWER_W, {
      duration: 240,
      easing: Easing.in(Easing.cubic),
    });
    setTimeout(() => {
      setShowHistory(false);
      setRenamingId(null);
    }, 250);
  }

  // ── Cargar sesión existente ───────────────────────────────────────────────
  async function loadSession(sessionId: number) {
    const rows = await getChatMessages(sessionId);
    const msgs: ChatMessage[] = rows.map((row) => ({
      id: String(row.id),
      role: row.role,
      text: row.text,
      card: row.card_json
        ? (() => {
            try {
              return JSON.parse(row.card_json) as WeeklySummaryCard;
            } catch {
              return undefined;
            }
          })()
        : undefined,
    }));
    setActiveSessionId(sessionId);
    setMessages(msgs.length > 0 ? msgs : [INITIAL_MESSAGE]);
    closeDrawer();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  // ── Nueva conversación ────────────────────────────────────────────────────
  function resetChat() {
    setActiveSessionId(null);
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setIsThinking(false);
  }

  // ── Renombrar sesión ──────────────────────────────────────────────────────
  async function commitRename() {
    if (renamingId && renameText.trim()) {
      await updateSessionTitle(renamingId, renameText.trim());
      await loadSessions();
    }
    setRenamingId(null);
    setRenameText("");
  }

  // ── Eliminar sesión ───────────────────────────────────────────────────────
  async function handleDelete(sessionId: number) {
    await deleteChatSession(sessionId);
    if (activeSessionId === sessionId) resetChat();
    await loadSessions();
  }

  // ── Enviar mensaje ────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInput("");

      // Crear sesión en el primer mensaje del usuario
      let sessionId = activeSessionId;
      if (!sessionId) {
        const title = makeTitle(trimmed);
        const session = await createChatSession(title);
        sessionId = session.id;
        setActiveSessionId(sessionId);
        await addChatMessage(sessionId, "assistant", WELCOME_TEXT);
      }

      // Agregar mensaje del usuario + placeholder de carga
      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        text: trimmed,
      };
      const loadingMsg: ChatMessage = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        text: "",
        isLoading: true,
      };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsThinking(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

      await addChatMessage(sessionId, "user", trimmed);

      try {
        const result = await processQuery(trimmed);
        const cardJson = result.card ? JSON.stringify(result.card) : undefined;

        const saved = await addChatMessage(
          sessionId,
          "assistant",
          result.text,
          cardJson
        );

        setMessages((prev) => [
          ...prev.filter((m) => !m.isLoading),
          {
            id: String(saved.id),
            role: "assistant",
            text: result.text,
            card: result.card,
          },
        ]);

        await touchSession(sessionId);
        await loadSessions();
      } catch {
        setMessages((prev) => [
          ...prev.filter((m) => !m.isLoading),
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            text: "No pude consultar tus datos. Intenta de nuevo.",
          },
        ]);
      } finally {
        setIsThinking(false);
        setTimeout(
          () => flatListRef.current?.scrollToEnd({ animated: true }),
          100
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isThinking, activeSessionId]
  );

  // ── renderItem de FlatList ────────────────────────────────────────────────
  const renderMessage = useCallback(
    ({ item }: { item: ChatMessage }) => <ChatMessageBubble item={item} />,
    []
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {/* ── Cabecera ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.navigate("/")}
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.55 }]}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={theme.text} strokeWidth={2.5} />
        </Pressable>

        <View style={s.headerCenter}>
          <View style={s.headerDot} />
          <Text style={s.headerTitle}>ASISTENTE LOCAL</Text>
        </View>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openDrawer();
          }}
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.55 }]}
          hitSlop={12}
        >
          <AlignJustify size={20} color={theme.text} strokeWidth={2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ── Mensajes ─────────────────────────────────────────────────── */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={[s.list, { paddingBottom: dockPad }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: false })
          }
        />

        {/* ── Sugerencias rápidas ───────────────────────────────────────── */}
        {messages.length <= 1 && (
          <View style={[s.chips, { marginBottom: 4 }]}>
            {SUGGESTIONS.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => sendMessage(sug)}
                style={({ pressed }) => [
                  s.chip,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={s.chipText}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Barra de input ────────────────────────────────────────────── */}
        <View style={[s.inputWrap, { paddingBottom: dockPad }]}>
          <View style={s.inputPill}>
            <Sparkles
              size={16}
              color={BLUE_CHAT}
              strokeWidth={2}
              style={{ marginLeft: 16 }}
            />
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              placeholder="Pregúntame algo sobre tus gastos..."
              placeholderTextColor={theme.textSub}
              returnKeyType="send"
              style={s.textInput}
              multiline={false}
            />
            <Pressable
              onPress={() => sendMessage(input)}
              disabled={!input.trim() || isThinking}
              style={({ pressed }) => [
                s.sendBtn,
                (!input.trim() || isThinking) && s.sendBtnDisabled,
                pressed && { opacity: 0.7 },
              ]}
            >
              {isThinking ? (
                <ActivityIndicator size={14} color={theme.bg} />
              ) : (
                <ArrowUp size={16} color={theme.bg} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── Drawer de historial ───────────────────────────────────────── */}
      <ChatHistoryDrawer
        visible={showHistory}
        sessions={sessions}
        activeSessionId={activeSessionId}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
        drawerStyle={drawerStyle}
        renamingId={renamingId}
        renameText={renameText}
        onClose={closeDrawer}
        onLoadSession={loadSession}
        onNewChat={() => {
          resetChat();
          closeDrawer();
        }}
        onDelete={handleDelete}
        onStartRename={(id, title) => {
          setRenamingId(id);
          setRenameText(title);
        }}
        onRenameTextChange={setRenameText}
        onCommitRename={commitRename}
      />
    </SafeAreaView>
  );
}
