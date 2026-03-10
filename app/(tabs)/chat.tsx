import { useState, useRef, useCallback, useEffect } from "react";
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
  Dimensions,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ChevronLeft,
  Sparkles,
  ArrowUp,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  AlignJustify,
  Trash2,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line as SvgLine,
  Rect,
} from "react-native-svg";
import {
  processQuery,
  type WeeklySummaryCard,
} from "@/src/features/chat/useLocalNLP";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  isLoading?: boolean;
  card?: WeeklySummaryCard;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = SCREEN_W * 0.82;
const CARD_W = SCREEN_W - 56;
const BG = "#F2F2F4";
const WHITE = "#FFFFFF";
const DARK = "#0F172A";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";
const BLUE = "#2D5BFF";

const WELCOME_TEXT = "Hola. ¿En qué puedo ayudarte con tus finanzas hoy?";

const INITIAL_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  text: WELCOME_TEXT,
};

const SUGGESTIONS = [
  "¿Cuánto gasté este mes?",
  "Resumen de esta semana",
  "Últimas 5 transacciones",
  "¿Cuál fue mi mayor gasto?",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTitle(text: string): string {
  const cleaned = text.trim().replace(/[¿?¡!]/g, "").trim();
  return cleaned.length > 34 ? cleaned.slice(0, 34).trimEnd() + "…" : cleaned;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function getGroup(iso: string): "HOY" | "AYER" | "ANTES" {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "HOY";
  if (d.toDateString() === yesterday.toDateString()) return "AYER";
  return "ANTES";
}

// ─── Smooth SVG area chart ───────────────────────────────────────────────────

function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return { line: "", area: "" };
  const n = pts.length;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const p0 = pts[Math.max(0, i - 2)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(n - 1, i + 1)];
    const t = 0.3;
    const cp1x = p1.x + ((p2.x - p0.x) * t) / 2;
    const cp1y = p1.y + ((p2.y - p0.y) * t) / 2;
    const cp2x = p2.x - ((p3.x - p1.x) * t) / 2;
    const cp2y = p2.y - ((p3.y - p1.y) * t) / 2;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const areaD = d + ` L ${pts[n - 1].x.toFixed(1)} 96 L ${pts[0].x.toFixed(1)} 96 Z`;
  return { line: d, area: areaD };
}

// ─── WeeklySummaryCard component ─────────────────────────────────────────────

function WeeklySummaryCard({ card }: { card: WeeklySummaryCard }) {
  const { total, prevTotal, weekData } = card;
  const changePercent =
    prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;
  const isUp = changePercent >= 0;
  const fmt = (n: number) => `$\u00A0${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

  const chartW = CARD_W - 32;
  const chartH = 96;
  const padTop = 8;
  const innerH = chartH - padTop;
  const maxAmt = Math.max(...weekData.map((d) => d.amount), 1);
  const pts = weekData.map((d, i) => ({
    x:
      weekData.length === 1
        ? chartW / 2
        : (i / (weekData.length - 1)) * chartW,
    y: padTop + innerH - (d.amount / maxAmt) * innerH,
  }));
  const { line: linePath, area: areaPath } = smoothPath(pts);
  const todayIdx = weekData.findIndex((d) => d.isToday);

  return (
    <View style={c.card}>
      <View style={c.cardTopRow}>
        <Text style={c.cardLabel}>RESUMEN SEMANAL</Text>
        <View style={[c.badge, isUp ? c.badgeUp : c.badgeDown]}>
          {isUp ? (
            <TrendingUp size={11} color="#E11D48" strokeWidth={2.5} />
          ) : (
            <TrendingDown size={11} color="#059669" strokeWidth={2.5} />
          )}
          <Text style={[c.badgeText, isUp ? c.badgeTextUp : c.badgeTextDown]}>
            {isUp ? "+" : ""}
            {changePercent}%
          </Text>
        </View>
      </View>
      <Text style={c.cardTotal}>{fmt(total)}</Text>
      <View style={{ marginTop: 16 }}>
        <Svg width={chartW} height={chartH}>
          <Defs>
            <SvgLinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={BLUE} stopOpacity="0.15" />
              <Stop offset="1" stopColor={BLUE} stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          {areaPath ? <Path d={areaPath} fill="url(#grad)" /> : null}
          {todayIdx >= 0 && (
            <Rect
              x={(pts[todayIdx]?.x ?? 0) - 12}
              y={0}
              width={24}
              height={chartH}
              fill={BLUE}
              fillOpacity={0.06}
              rx={4}
            />
          )}
          {linePath ? (
            <Path
              d={linePath}
              fill="none"
              stroke={DARK}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {todayIdx >= 0 && pts[todayIdx] && (
            <SvgLine
              x1={pts[todayIdx].x}
              y1={pts[todayIdx].y}
              x2={pts[todayIdx].x}
              y2={chartH}
              stroke={BLUE}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          )}
        </Svg>
        <View style={c.dayRow}>
          {weekData.map((d, i) => (
            <View key={i} style={c.dayCell}>
              {d.isToday && <View style={c.dayDot} />}
              <Text style={[c.dayLabel, d.isToday && c.dayLabelToday]}>
                {d.day}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── BoldText ────────────────────────────────────────────────────────────────

function BoldText({ text, style }: { text: string; style?: object }) {
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);

  // History drawer
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");

  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const dockPad = Math.max(insets.bottom, 0) + 16;

  // Drawer animation
  const drawerX = useSharedValue(DRAWER_W);
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drawerX.value }],
  }));

  // ── Init DB on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    initChatTables().then(() => loadSessions());
  }, []);

  async function loadSessions() {
    const rows = await getChatSessions();
    setSessions(rows);
  }

  // ── Drawer open / close ───────────────────────────────────────────────────
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

  // ── Load existing session ─────────────────────────────────────────────────
  async function loadSession(sessionId: number) {
    const rows = await getChatMessages(sessionId);
    const msgs: Message[] = rows.map((row) => ({
      id: String(row.id),
      role: row.role,
      text: row.text,
      card: row.card_json
        ? (JSON.parse(row.card_json) as WeeklySummaryCard)
        : undefined,
    }));
    setActiveSessionId(sessionId);
    setMessages(msgs.length > 0 ? msgs : [INITIAL_MESSAGE]);
    closeDrawer();
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  // ── New conversation ──────────────────────────────────────────────────────
  function resetChat() {
    setActiveSessionId(null);
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setIsThinking(false);
  }

  // ── Rename session ────────────────────────────────────────────────────────
  async function commitRename() {
    if (renamingId && renameText.trim()) {
      await updateSessionTitle(renamingId, renameText.trim());
      await loadSessions();
    }
    setRenamingId(null);
    setRenameText("");
  }

  // ── Delete session ────────────────────────────────────────────────────────
  async function handleDelete(sessionId: number) {
    await deleteChatSession(sessionId);
    if (activeSessionId === sessionId) resetChat();
    await loadSessions();
  }

  // ── Send message ──────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isThinking) return;

      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInput("");

      // ── Create session on first user message ──────────────────────────────
      let sessionId = activeSessionId;
      if (!sessionId) {
        const title = makeTitle(trimmed);
        const session = await createChatSession(title);
        sessionId = session.id;
        setActiveSessionId(sessionId);
        // persist the welcome message as part of this session
        await addChatMessage(sessionId, "assistant", WELCOME_TEXT);
      }

      // ── Append user message to UI ─────────────────────────────────────────
      const userMsg: Message = {
        id: Date.now().toString(),
        role: "user",
        text: trimmed,
      };
      const loadingMsg: Message = {
        id: `loading-${Date.now()}`,
        role: "assistant",
        text: "",
        isLoading: true,
      };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsThinking(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

      // ── Persist user message ──────────────────────────────────────────────
      await addChatMessage(sessionId, "user", trimmed);

      // ── Query NLP ─────────────────────────────────────────────────────────
      try {
        const result = await processQuery(trimmed);
        const cardJson = result.card
          ? JSON.stringify(result.card)
          : undefined;

        // Persist assistant response
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

        // Touch session so it surfaces to top
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

  // ── Render message ────────────────────────────────────────────────────────
  function renderMessage({ item }: { item: Message }) {
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
            <ActivityIndicator size="small" color={SLATE_400} />
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

  // ── Build grouped session list for drawer ─────────────────────────────────
  type GroupedItem =
    | { type: "header"; label: string }
    | { type: "session"; session: ChatSessionRow };

  const drawerItems: GroupedItem[] = [];
  const seen = new Set<string>();
  for (const session of sessions) {
    const group = getGroup(session.updated_at);
    if (!seen.has(group)) {
      seen.add(group);
      drawerItems.push({ type: "header", label: group });
    }
    drawerItems.push({ type: "session", session });
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.navigate("/")}
          style={({ pressed }) => [s.headerBtn, pressed && { opacity: 0.55 }]}
          hitSlop={12}
        >
          <ChevronLeft size={22} color={DARK} strokeWidth={2.5} />
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
          <AlignJustify size={20} color={DARK} strokeWidth={2} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* ── Messages ─────────────────────────────────────────────── */}
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

        {/* ── Suggestion chips ──────────────────────────────────────── */}
        {messages.length <= 1 && (
          <View style={[s.chips, { marginBottom: 4 }]}>
            {SUGGESTIONS.map((sug) => (
              <Pressable
                key={sug}
                onPress={() => sendMessage(sug)}
                style={({ pressed }) => [
                  chipSt.chip,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={chipSt.chipText}>{sug}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── Input bar ────────────────────────────────────────────── */}
        <View style={[s.inputWrap, { paddingBottom: dockPad }]}>
          <View style={s.inputPill}>
            <Sparkles
              size={16}
              color={BLUE}
              strokeWidth={2}
              style={{ marginLeft: 16 }}
            />
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage(input)}
              placeholder="Pregúntame algo sobre tus gastos..."
              placeholderTextColor={SLATE_400}
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
                <ActivityIndicator size={14} color={WHITE} />
              ) : (
                <ArrowUp size={16} color={WHITE} strokeWidth={2.5} />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── History drawer ───────────────────────────────────────────── */}
      {showHistory && (
        <Modal
          transparent
          animationType="none"
          onRequestClose={closeDrawer}
          statusBarTranslucent
        >
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={d.backdrop} />
          </TouchableWithoutFeedback>

          {/* Panel */}
          <Animated.View
            style={[
              d.panel,
              {
                paddingTop: insets.top + 20,
                paddingBottom: insets.bottom + 16,
              },
              drawerStyle,
            ]}
          >
            {/* Panel header */}
            <View style={d.panelHeader}>
              <Text style={d.panelTitle}>HISTORIAL</Text>
              <TouchableOpacity onPress={closeDrawer} hitSlop={12}>
                <X size={20} color={DARK} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            {/* Session list */}
            {drawerItems.length === 0 ? (
              <View style={d.emptyWrap}>
                <Text style={d.emptyText}>
                  Aún no hay conversaciones guardadas.{"\n"}Empieza una nueva
                  para verla aquí.
                </Text>
              </View>
            ) : (
              <FlatList
                data={drawerItems}
                keyExtractor={(item, idx) =>
                  item.type === "header" ? `hdr-${item.label}` : `s-${item.session.id}-${idx}`
                }
                showsVerticalScrollIndicator={false}
                style={{ flex: 1 }}
                renderItem={({ item }) => {
                  if (item.type === "header") {
                    return <Text style={d.groupLabel}>{item.label}</Text>;
                  }
                  const { session } = item;
                  const isActive = session.id === activeSessionId;
                  const isRenaming = renamingId === session.id;

                  return (
                    <TouchableOpacity
                      onPress={() => loadSession(session.id)}
                      onLongPress={async () => {
                        await Haptics.impactAsync(
                          Haptics.ImpactFeedbackStyle.Medium
                        );
                        setRenamingId(session.id);
                        setRenameText(session.title);
                      }}
                      activeOpacity={0.7}
                      style={[d.sessionRow, isActive && d.sessionRowActive]}
                    >
                      <View style={d.sessionBody}>
                        {isRenaming ? (
                          <TextInput
                            value={renameText}
                            onChangeText={setRenameText}
                            onBlur={commitRename}
                            onSubmitEditing={commitRename}
                            autoFocus
                            returnKeyType="done"
                            style={d.sessionTitleInput}
                          />
                        ) : (
                          <Text
                            style={[
                              d.sessionTitle,
                              isActive && d.sessionTitleActive,
                            ]}
                            numberOfLines={1}
                          >
                            {session.title}
                          </Text>
                        )}
                        <Text style={d.sessionTime}>
                          {formatTime(session.updated_at)}
                        </Text>
                      </View>
                      {/* Delete button */}
                      <TouchableOpacity
                        onPress={() => handleDelete(session.id)}
                        hitSlop={8}
                        style={d.deleteBtn}
                      >
                        <Trash2 size={14} color={SLATE_400} strokeWidth={1.8} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Nueva conversación */}
            <TouchableOpacity
              style={d.newChatBtn}
              onPress={() => {
                resetChat();
                closeDrawer();
              }}
              activeOpacity={0.88}
            >
              <Plus size={16} color={WHITE} strokeWidth={2.5} />
              <Text style={d.newChatText}>Nueva conversación</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── WeeklySummaryCard styles ────────────────────────────────────────────────

const c = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: WHITE,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: SLATE_400,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeUp: { backgroundColor: "#FFF1F2" },
  badgeDown: { backgroundColor: "#ECFDF5" },
  badgeText: { fontSize: 11, fontWeight: "700" },
  badgeTextUp: { color: "#E11D48" },
  badgeTextDown: { color: "#059669" },
  cardTotal: {
    fontSize: 36,
    fontWeight: "800",
    color: DARK,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingHorizontal: 2,
  },
  dayCell: { alignItems: "center", gap: 2, flex: 1 },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BLUE,
    marginBottom: 1,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: SLATE_400,
    textAlign: "center",
  },
  dayLabelToday: { color: BLUE, fontWeight: "800" },
});

// ─── History drawer styles ───────────────────────────────────────────────────

const d = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  panel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_W,
    backgroundColor: WHITE,
    paddingHorizontal: 22,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: DARK,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  groupLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: SLATE_400,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 12,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  sessionRowActive: { backgroundColor: "#F1F5F9" },
  sessionBody: { flex: 1 },
  sessionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 2,
  },
  sessionTitleActive: { color: DARK, fontWeight: "700" },
  sessionTitleInput: {
    fontSize: 14,
    fontWeight: "600",
    color: DARK,
    borderBottomWidth: 1.5,
    borderBottomColor: BLUE,
    paddingVertical: 2,
    marginBottom: 2,
  },
  sessionTime: { fontSize: 11, color: SLATE_400, fontWeight: "500" },
  deleteBtn: {
    padding: 6,
    marginLeft: 8,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  emptyText: {
    fontSize: 13,
    color: SLATE_400,
    textAlign: "center",
    lineHeight: 20,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK,
    borderRadius: 999,
    paddingVertical: 16,
    marginTop: 12,
  },
  newChatText: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
    letterSpacing: 0.2,
  },
});

// ─── Screen styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: BG,
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
    backgroundColor: BLUE,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: DARK,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
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
    backgroundColor: DARK,
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  bubbleAssistant: {
    backgroundColor: WHITE,
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
    color: WHITE,
    fontWeight: "600",
  },
  bubbleTextAssistant: {
    fontSize: 14,
    lineHeight: 21,
    color: "#334155",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  inputWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: BG,
  },
  inputPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: WHITE,
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
    color: DARK,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: DARK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  sendBtnDisabled: { opacity: 0.3 },
});

const chipSt = StyleSheet.create({
  chip: {
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
});
